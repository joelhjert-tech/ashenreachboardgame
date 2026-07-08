import type { EncounterEffect } from "../schema/card.schema.js";
import type { Character, Stat } from "../schema/character.schema.js";
import type { PlayerState } from "../schema/session.schema.js";
import type { AfflictionCard, AfflictionInstance } from "../schema/affliction.schema.js";

export type AfflictionCatalog = Map<string, AfflictionCard>;

export type AfflictionModifierMode = "battle" | "check";

export interface AfflictionModifierSource {
  label: string;
  value: number;
}

export interface AfflictionRestrictions {
  cannotUseArmor: boolean;
  cannotUseWeapons: boolean;
  canEvadeEnemies: boolean;
  cannotEvadeEnemies: boolean;
  battleWeaponSlotModifier: number;
  powerLimitModifier: number;
  assetLimitModifier: number;
}

export interface AfflictionDrawOptions {
  instanceId?: string;
  createdAt: string;
  die?: number;
  chosenStat?: Stat;
}

export interface AfflictionDrawResult {
  player: PlayerState;
  publicSummary: string;
  privateSummary: string;
  deltas: string[];
}

const statLabels: Record<Stat, string> = {
  command: "Command",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

export function createInitialAfflictionUsageState() {
  return {
    oncePerTurnUsed: {},
    oncePerBattleUsed: {},
    reactionUsed: {}
  };
}

export function getFaceupAfflictionInstances(player: PlayerState): AfflictionInstance[] {
  return player.faceupAfflictions ?? [];
}

export function getFacedownAfflictionInstances(player: PlayerState): AfflictionInstance[] {
  return player.facedownAfflictions ?? [];
}

export function getFaceupAfflictionCards(player: PlayerState, catalog: AfflictionCatalog): AfflictionCard[] {
  return getFaceupAfflictionInstances(player)
    .map((instance) => catalog.get(instance.cardId))
    .filter((card): card is AfflictionCard => Boolean(card));
}

export function summarizeAfflictionCard(card: AfflictionCard) {
  return {
    id: card.id,
    name: card.name,
    severity: card.severity,
    category: card.category,
    duration: card.duration,
    trigger: card.trigger,
    rulesText: card.rulesText,
    effectKind: card.effectKind,
    effectPayload: card.effectPayload,
    isFaceupOngoing: card.isFaceupOngoing
  };
}

export function summarizeAfflictions(player: PlayerState, catalog: AfflictionCatalog) {
  return {
    faceup: getFaceupAfflictionCards(player, catalog).map(summarizeAfflictionCard),
    facedownCount: getFacedownAfflictionInstances(player).length
  };
}

export function getAfflictionRestrictions(player: PlayerState, catalog: AfflictionCatalog): AfflictionRestrictions {
  const restrictions: AfflictionRestrictions = {
    cannotUseArmor: false,
    cannotUseWeapons: false,
    canEvadeEnemies: false,
    cannotEvadeEnemies: false,
    battleWeaponSlotModifier: 0,
    powerLimitModifier: 0,
    assetLimitModifier: 0
  };

  for (const card of getFaceupAfflictionCards(player, catalog)) {
    const payload = card.effectPayload;
    restrictions.cannotUseArmor ||= payload.cannotUseArmor === true;
    restrictions.cannotUseWeapons ||= payload.cannotUseWeapons === true;
    restrictions.canEvadeEnemies ||= payload.canEvadeEnemies === true;
    restrictions.cannotEvadeEnemies ||= payload.cannotEvadeEnemies === true;
    restrictions.battleWeaponSlotModifier += payload.battleWeaponSlotModifier ?? 0;
    restrictions.powerLimitModifier += payload.powerLimitModifier ?? 0;
    restrictions.assetLimitModifier += payload.assetLimitModifier ?? 0;
  }

  if (restrictions.cannotEvadeEnemies) {
    restrictions.canEvadeEnemies = false;
  }

  return restrictions;
}

export function getAfflictionModifierSources(
  player: PlayerState,
  stat: Stat,
  mode: AfflictionModifierMode,
  catalog: AfflictionCatalog
): AfflictionModifierSource[] {
  const sources: AfflictionModifierSource[] = [];

  for (const card of getFaceupAfflictionCards(player, catalog)) {
    if (card.effectKind === "testModifier" && card.effectPayload.stat === stat) {
      const amount = card.effectPayload.amount ?? 0;
      const floor = card.effectPayload.floor ?? Number.NEGATIVE_INFINITY;
      const currentStat = player.character.stats[stat] ?? 0;
      const flooredAmount = Math.max(amount, floor - currentStat);
      sources.push({ label: `Affliction: ${card.name}`, value: flooredAmount });
    }

    if (mode === "battle" && card.effectKind === "battleBonus" && typeof card.effectPayload.innateBattleBonus === "number") {
      sources.push({ label: `Affliction: ${card.name}`, value: card.effectPayload.innateBattleBonus });
    }
  }

  return sources.filter((source) => source.value !== 0);
}

export function resolveAfflictionDraw(
  player: PlayerState,
  card: AfflictionCard,
  catalog: AfflictionCatalog,
  options: AfflictionDrawOptions
): AfflictionDrawResult {
  let nextPlayer = clonePlayer(player);
  const deltas: string[] = [];

  nextPlayer = applyDrawTriggersFromKnownCards(nextPlayer, catalog, deltas, options.chosenStat);

  const instance: AfflictionInstance = {
    instanceId: options.instanceId ?? `${card.id}:${options.createdAt}`,
    cardId: card.id,
    drawnAt: options.createdAt,
    face: card.isFaceupOngoing ? "faceup" : "facedown",
    resolved: !card.isFaceupOngoing
  };

  if (card.isFaceupOngoing) {
    nextPlayer.faceupAfflictions = [...(nextPlayer.faceupAfflictions ?? []), instance];
    deltas.push(`${card.name} stays faceup.`);
  } else {
    nextPlayer = applyImmediateAffliction(nextPlayer, card, options.die ?? 1, deltas);
    nextPlayer.facedownAfflictions = [...(nextPlayer.facedownAfflictions ?? []), instance];
    deltas.push(`${card.name} flipped facedown.`);
  }

  nextPlayer.afflictionDrawHistory = [...(nextPlayer.afflictionDrawHistory ?? []), card.id];

  return {
    player: nextPlayer,
    publicSummary: `${nextPlayer.character.name} drew Affliction: ${card.name}.`,
    privateSummary: `${card.name}: ${card.rulesText}`,
    deltas
  };
}

export function applyImmediateAffliction(
  player: PlayerState,
  card: AfflictionCard,
  die: number,
  deltas: string[] = []
): PlayerState {
  let nextPlayer = clonePlayer(player);
  const payload = card.effectPayload;

  if (card.effectKind === "immediateStatLoss" && payload.stat && typeof payload.amount === "number") {
    nextPlayer = adjustCharacterStat(nextPlayer, payload.stat, payload.amount, deltas, card.name);
  }

  if (card.effectKind === "immediateHeal") {
    nextPlayer = {
      ...nextPlayer,
      character: {
        ...nextPlayer.character,
        wounds: Math.max(0, nextPlayer.character.wounds - (payload.heal ?? 0))
      }
    };
    deltas.push(`${card.name}: healed ${payload.heal ?? 0} wounds.`);
  }

  if (card.effectKind === "immediateRollTable") {
    const result = payload.rollTable?.find((entry) => die >= entry.min && die <= entry.max);
    if (result) {
      nextPlayer = adjustCharacterStat(nextPlayer, result.stat, result.amount, deltas, card.name);
    }
  }

  if (card.effectKind === "replacementEffect") {
    const replacedCount = (nextPlayer.facedownAfflictions ?? []).length;
    nextPlayer = {
      ...nextPlayer,
      facedownAfflictions: []
    };
    deltas.push(`${card.name}: replaced ${replacedCount} facedown Afflictions.`);
  }

  return nextPlayer;
}

export function applyMovementDieAfflictions(
  player: PlayerState,
  die: number,
  catalog: AfflictionCatalog
): PlayerState {
  let nextPlayer = clonePlayer(player);

  if (die !== 6) {
    return nextPlayer;
  }

  const hasCinderRegeneration = getFaceupAfflictionCards(player, catalog).some((card) => card.id === "cinder-regeneration");

  if (hasCinderRegeneration) {
    nextPlayer = {
      ...nextPlayer,
      character: {
        ...nextPlayer.character,
        wounds: Math.max(0, nextPlayer.character.wounds - 1)
      }
    };
  }

  return nextPlayer;
}

export function getAfflictionWoundPrevention(
  player: PlayerState,
  stat: Stat,
  roll: number,
  catalog: AfflictionCatalog
): { prevented: number; source: string | null } {
  const faceup = getFaceupAfflictionCards(player, catalog);
  const match = faceup.find((card) => {
    if (card.id === "iron-nerve") {
      return stat === "command";
    }

    if (card.id === "metal-hide") {
      return stat === "grit";
    }

    return false;
  });

  if (!match || !(match.effectPayload.preventWoundOn ?? []).includes(roll)) {
    return { prevented: 0, source: null };
  }

  return { prevented: 1, source: match.name };
}

export function preventWoundInEffect(effect: EncounterEffect, amount: number): EncounterEffect {
  if (amount <= 0) {
    return effect;
  }

  if (effect.type === "take_wound") {
    return { ...effect, amount: Math.max(0, effect.amount - amount) };
  }

  if (effect.type === "sequence") {
    let remaining = amount;
    const effects = effect.effects.map((entry) => {
      if (remaining <= 0 || entry.type !== "take_wound") {
        return entry;
      }

      const prevented = Math.min(remaining, entry.amount);
      remaining -= prevented;
      return { ...entry, amount: Math.max(0, entry.amount - prevented) };
    }).filter((entry) => entry.type !== "take_wound" || entry.amount > 0);

    return { ...effect, effects };
  }

  return effect;
}

function adjustCharacterStat(
  player: PlayerState,
  stat: Stat,
  amount: number,
  deltas: string[],
  source: string
): PlayerState {
  const current = player.character.stats[stat] ?? 1;
  const nextValue = Math.max(1, current + amount);
  deltas.push(`${source}: ${statLabels[stat]} ${amount > 0 ? "+" : ""}${amount}.`);

  return {
    ...player,
    character: {
      ...player.character,
      stats: {
        ...player.character.stats,
        [stat]: nextValue
      }
    }
  };
}

function applyDrawTriggersFromKnownCards(
  player: PlayerState,
  catalog: AfflictionCatalog,
  deltas: string[],
  chosenStat: Stat = "grit"
): PlayerState {
  let nextPlayer = clonePlayer(player);

  for (const card of getFaceupAfflictionCards(player, catalog)) {
    if (card.id === "hollow-thoughts") {
      nextPlayer = adjustCharacterStat(nextPlayer, "guile", -1, deltas, card.name);
    } else if (card.id === "runaway-growth") {
      nextPlayer = adjustCharacterStat(nextPlayer, chosenStat, 1, deltas, card.name);
    } else if (card.id === "fading-strength") {
      nextPlayer = adjustCharacterStat(nextPlayer, "grit", -1, deltas, card.name);
    } else if (card.id === "soul-rot") {
      nextPlayer = adjustCharacterStat(nextPlayer, "command", -1, deltas, card.name);
    } else if (card.id === "weeping-cysts") {
      nextPlayer = {
        ...nextPlayer,
        character: {
          ...nextPlayer.character,
          wounds: nextPlayer.character.wounds + 1
        }
      };
      deltas.push(`${card.name}: suffered 1 wound.`);
    }
  }

  return nextPlayer;
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    character: {
      ...player.character,
      stats: { ...player.character.stats },
      statUpgrades: player.character.statUpgrades ? { ...player.character.statUpgrades } : undefined,
      heldGear: [...player.character.heldGear],
      followers: [...(player.character.followers ?? [])],
      scars: [...player.character.scars],
      abilities: [...player.character.abilities],
      trophyPile: [...(player.character.trophyPile ?? [])],
      equippedGear: { ...player.character.equippedGear }
    },
    private: {
      ...player.private,
      hand: [...player.private.hand],
      notes: [...(player.private.notes ?? [])]
    },
    faceupAfflictions: [...(player.faceupAfflictions ?? [])],
    facedownAfflictions: [...(player.facedownAfflictions ?? [])],
    afflictionUsageState: player.afflictionUsageState
      ? {
          oncePerTurnUsed: { ...player.afflictionUsageState.oncePerTurnUsed },
          oncePerBattleUsed: { ...player.afflictionUsageState.oncePerBattleUsed },
          reactionUsed: { ...player.afflictionUsageState.reactionUsed }
        }
      : createInitialAfflictionUsageState(),
    afflictionDrawHistory: [...(player.afflictionDrawHistory ?? [])]
  };
}
