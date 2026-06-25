import type { EncounterEffect, ThreatCard } from "../schema/card.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import type { GearSlot } from "../schema/gear.schema.js";

export type ThreatEffectTiming =
  | "onReveal"
  | "beforeCombat"
  | "onSuccess"
  | "onFailure"
  | "onDefeat";

export type ThreatEffectResult = {
  effect?: EncounterEffect | null;
  difficultyModifier?: number;
  playerBonusModifier?: number;
  enemyBonusModifier?: number;
  disabledSlots?: GearSlot[];
  summary?: string;
};

export type ThreatEffectContext = {
  state: GameState;
  seatId: string;
  card: ThreatCard;
  player: PlayerState;
  spaceId?: string;
  region?: "outer" | "middle" | "inner" | "center" | "global";
  escalationLevel: number;
};

type ThreatEffectDefinition = {
  timing: ThreatEffectTiming;
  resolve: (ctx: ThreatEffectContext) => ThreatEffectResult;
};

const note = (text: string): EncounterEffect => ({ type: "gain_note", text });
const heat = (amount: number): EncounterEffect => ({ type: "gain_heat", amount });
const heatAll = (amount: number): EncounterEffect => ({ type: "gain_heat_all", amount });
const wound = (amount: number): EncounterEffect => ({ type: "take_wound", amount });
const trophy = (amount: number): EncounterEffect => ({ type: "gain_trophy", amount });
const sequence = (...effects: EncounterEffect[]): EncounterEffect => ({ type: "sequence", effects });

function slotBonus(ctx: ThreatEffectContext, slot: GearSlot): number {
  const gearId = ctx.player.character.equippedGear[slot];
  const item = gearId ? ctx.player.character.heldGear.find((entry) => entry.id === gearId) : null;
  return item?.statBonus.stat === ctx.card.stat ? item.statBonus.amount : 0;
}

function regionIsInner(ctx: ThreatEffectContext): boolean {
  return ctx.region === "inner" || ctx.region === "center";
}

export const THREAT_CARD_EFFECTS = {
  threat_heat_on_reveal: {
    timing: "onReveal",
    resolve: () => ({ effect: heat(1), summary: "Reveal: active operative gains 1 Heat." })
  },
  threat_all_heat_on_reveal: {
    timing: "onReveal",
    resolve: () => ({ effect: heatAll(1), summary: "Reveal: all operatives gain 1 Heat." })
  },
  threat_escalate_on_reveal: {
    timing: "onReveal",
    resolve: () => ({ effect: { type: "advance_escalation", amount: 1 }, summary: "Reveal: escalation pressure rises." })
  },
  threat_force_immediate_check: {
    timing: "onReveal",
    resolve: (ctx) => ({ effect: note(`${ctx.card.title} forces its check before any other action.`) })
  },
  threat_force_immediate_combat: {
    timing: "onReveal",
    resolve: (ctx) => ({ effect: note(`${ctx.card.title} forces immediate combat.`) })
  },
  threat_force_choose_heat_or_wound: {
    timing: "onReveal",
    resolve: () => ({ effect: heat(1), summary: "Reveal choice defaults to Heat when no private choice is supplied." })
  },
  threat_force_discard_gear_or_gain_heat: {
    timing: "onReveal",
    resolve: () => ({ effect: heat(1), summary: "Reveal choice defaults to Heat instead of object loss." })
  },
  threat_attach_to_space: {
    timing: "onReveal",
    resolve: (ctx) => ({ effect: note(`${ctx.card.title} attaches pressure to ${ctx.spaceId ?? "this space"}.`) })
  },
  threat_attach_to_player: {
    timing: "onReveal",
    resolve: (ctx) => ({ effect: note(`${ctx.card.title} attaches to ${ctx.player.character.name}.`) })
  },
  threat_lock_space_until_defeated: {
    timing: "onReveal",
    resolve: (ctx) => ({ effect: note(`${ctx.spaceId ?? "This space"} is locked until ${ctx.card.title} is cleared.`) })
  },

  threat_combat_plus_one_if_player_has_heat: {
    timing: "beforeCombat",
    resolve: (ctx) => ({ enemyBonusModifier: ctx.player.character.heat > 0 ? 1 : 0 })
  },
  threat_combat_plus_two_if_inner_region: {
    timing: "beforeCombat",
    resolve: (ctx) => ({ enemyBonusModifier: regionIsInner(ctx) ? 2 : 0 })
  },
  threat_disable_weapon_bonus: {
    timing: "beforeCombat",
    resolve: (ctx) => ({ playerBonusModifier: -slotBonus(ctx, "weapon"), disabledSlots: ["weapon"] })
  },
  threat_disable_armor_bonus: {
    timing: "beforeCombat",
    resolve: (ctx) => ({ playerBonusModifier: -slotBonus(ctx, "armor"), disabledSlots: ["armor"] })
  },
  threat_force_enemy_roll_advantage: {
    timing: "beforeCombat",
    resolve: () => ({ enemyBonusModifier: 1, summary: "Enemy roll advantage represented as +1 enemy bonus." })
  },
  threat_player_roll_disadvantage: {
    timing: "beforeCombat",
    resolve: () => ({ playerBonusModifier: -1, summary: "Player disadvantage represented as -1 player bonus." })
  },
  threat_block_rerolls: {
    timing: "beforeCombat",
    resolve: () => ({ effect: note("Rerolls are blocked while this threat is active.") })
  },
  threat_ignore_first_success: {
    timing: "beforeCombat",
    resolve: () => ({ difficultyModifier: 2, summary: "First-success resistance represented as +2 difficulty." })
  },

  threat_fail_take_wound: {
    timing: "onFailure",
    resolve: () => ({ effect: wound(1) })
  },
  threat_fail_take_two_wounds: {
    timing: "onFailure",
    resolve: () => ({ effect: wound(2) })
  },
  threat_fail_gain_heat: {
    timing: "onFailure",
    resolve: () => ({ effect: heat(1) })
  },
  threat_fail_gain_two_heat: {
    timing: "onFailure",
    resolve: () => ({ effect: heat(2) })
  },
  threat_fail_wound_and_heat: {
    timing: "onFailure",
    resolve: () => ({ effect: sequence(wound(1), heat(1)) })
  },
  threat_fail_gain_scar: {
    timing: "onFailure",
    resolve: () => ({ effect: { type: "gain_scar", scarId: "scar-wound-1" } })
  },
  threat_fail_drop_gear: {
    timing: "onFailure",
    resolve: () => ({ effect: note("A held object is exposed for loss or recovery.") })
  },
  threat_fail_drop_artifact: {
    timing: "onFailure",
    resolve: () => ({ effect: note("An artifact is dropped or marked as exposed.") })
  },
  threat_fail_retreat_one_space: {
    timing: "onFailure",
    resolve: () => ({ effect: note("Retreat one connected space after resolving this threat.") })
  },
  threat_fail_escalate: {
    timing: "onFailure",
    resolve: () => ({ effect: note("Threat failure escalates table pressure by 1.") })
  },

  threat_defeat_gain_trophy: {
    timing: "onDefeat",
    resolve: () => ({ effect: trophy(1) })
  },
  threat_defeat_gain_two_trophies: {
    timing: "onDefeat",
    resolve: () => ({ effect: trophy(2) })
  },
  threat_defeat_gain_salvage: {
    timing: "onDefeat",
    resolve: () => ({ effect: note("Salvage claim recorded from a defeated threat.") })
  },
  threat_defeat_gain_gear: {
    timing: "onDefeat",
    resolve: () => ({ effect: { type: "gain_gear", gearId: "veil-hook" } })
  },
  threat_defeat_gain_artifact: {
    timing: "onDefeat",
    resolve: () => ({ effect: note("Draw or claim one local artifact after defeating this threat.") })
  },
  threat_defeat_reduce_heat: {
    timing: "onDefeat",
    resolve: () => ({ effect: { type: "lose_heat", amount: 1 } })
  },
  threat_defeat_heal_wound: {
    timing: "onDefeat",
    resolve: () => ({ effect: { type: "heal_wound", amount: 1 } })
  },
  threat_defeat_advance_contract: {
    timing: "onDefeat",
    resolve: () => ({ effect: note("Active contract progress is advanced by the threat defeat.") })
  },
  threat_defeat_advance_scenario: {
    timing: "onDefeat",
    resolve: () => ({ effect: { type: "advance_scenario", progressKey: "threatDefeats", amount: 1 } })
  },
  threat_defeat_remove_space_lock: {
    timing: "onDefeat",
    resolve: (ctx) => ({ effect: note(`${ctx.spaceId ?? "This space"} is no longer locked by the defeated threat.`) })
  },

  threat_scale_damage_by_escalation: {
    timing: "onFailure",
    resolve: (ctx) => ({ effect: wound(ctx.escalationLevel >= 4 ? 2 : 1) })
  },
  threat_scale_difficulty_by_escalation: {
    timing: "beforeCombat",
    resolve: (ctx) => ({ difficultyModifier: ctx.escalationLevel >= 4 ? 2 : ctx.escalationLevel >= 2 ? 1 : 0 })
  }
} satisfies Record<string, ThreatEffectDefinition>;

export type ThreatEffectKey = keyof typeof THREAT_CARD_EFFECTS;

export function isThreatEffectKey(value: string): value is ThreatEffectKey {
  return Object.hasOwn(THREAT_CARD_EFFECTS, value);
}

export function getThreatEffectTiming(value: ThreatEffectKey): ThreatEffectTiming {
  return THREAT_CARD_EFFECTS[value].timing;
}

export function resolveThreatEffect(value: ThreatEffectKey, context: ThreatEffectContext): ThreatEffectResult {
  return THREAT_CARD_EFFECTS[value].resolve(context);
}
