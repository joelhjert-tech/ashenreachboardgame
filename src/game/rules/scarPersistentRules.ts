import type { ScarRuleKey } from "../schema/card.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import type { ScarRuleOutcome, ScarUsageEntry } from "../schema/scarChoice.schema.js";
import { getScarCard } from "./scarSystem.js";

export interface ScarRuleContext {
  eventId: string;
  timing: string;
  stat?: "grit" | "guile" | "signal" | "command" | "forge";
  mode?: "battle" | "check" | "movement" | "service" | "assistance" | "event";
  encounterKind?: "enemy" | "hazard" | "anomaly" | "escalation" | "route" | "gate";
  enemyFamily?: string;
  elite?: boolean;
  boss?: boolean;
  naturalRoll?: number;
  success?: boolean;
  margin?: number;
  sectorTags?: string[];
  serviceKind?: "healing" | "repair" | "other";
  helperCount?: number;
  optionCount?: number;
  wounds?: number;
  battleAwardedSalvage?: boolean;
  difficulty?: number;
}

const negative = (summary: string, modifier = -1): ScarRuleOutcome => ({ modifier, summary });
const positive = (summary: string, modifier = 1): ScarRuleOutcome => ({ modifier, summary });

/**
 * Typed Scar rule primitives. This intentionally consumes structured context;
 * authored prose is never interpreted as gameplay authority.
 */
export function evaluateScarRule(key: ScarRuleKey, context: ScarRuleContext): ScarRuleOutcome | null {
  switch (key) {
    case "first-grit-penalty": return context.stat === "grit" && context.mode !== "movement" ? negative("Ash-Lanced: first Grit test −1") : null;
    case "first-signal-penalty": return context.stat === "signal" ? negative("Static Burn: first Signal test −1") : null;
    case "first-guile-penalty": return context.stat === "guile" ? negative("Webglass Afterimage: first Guile test −1") : null;
    case "remote-signal-penalty": return context.stat === "signal" && !(context.sectorTags ?? []).some((tag) => tag === "relay" || tag === "shrine") ? negative("Relay Ghost: remote Signal test −1") : null;
    case "first-enemy-battle-penalty": return context.mode === "battle" && context.encounterKind === "enemy" ? negative("Red March Tremor: first enemy battle −1") : null;
    case "first-route-test-penalty": return context.encounterKind === "route" ? negative("Shrapnel Memory: first route test −1") : null;
    case "elite-grit-bonus": return context.stat === "grit" && (context.elite || context.boss) ? positive("Red March Tremor: elite Grit +1") : null;
    case "machine-enemy-grit-bonus": return context.stat === "grit" && context.enemyFamily === "machine" ? positive("Shrapnel Memory: machine enemy Grit +1") : null;
    case "gate-test-bonus": return context.encounterKind === "gate" && (context.stat === "command" || context.stat === "signal") ? positive("Gate Mark: transition test +1") : null;
    case "escalation-signal-bonus": return context.encounterKind === "escalation" && context.stat === "signal" ? positive("Choir Static: escalation Signal +1") : null;
    case "one-below-battle-bonus": return context.mode === "battle" && context.margin === -1 ? positive("Parasite Crown bridged the one-point deficit") : null;
    case "anomaly-difficulty-reduction": return context.encounterKind === "anomaly" && (context.stat === "signal" || context.stat === "guile") ? { difficultyModifier: -1, summary: "Rift-Eye reduced Anomaly difficulty by 1" } : null;
    case "command-assistance-blocked": return context.stat === "command" && context.mode === "assistance" ? { blocksAssistance: true, summary: "Bell-Deafened blocks Command assistance" } : null;
    case "assistance-blocked": return context.mode === "assistance" ? { blocksAssistance: true, summary: "Hollow Reflection blocks assistance" } : null;
    case "first-assistance-reduction": return context.mode === "assistance" ? { contributionModifier: -1, summary: "Borrowed Name reduces the first contribution by 1" } : null;
    case "paid-service-surcharge": return context.mode === "service" ? { serviceSurcharge: 1, summary: "Blackstar Shadow service surcharge +1" } : null;
    case "repair-service-surcharge": return context.serviceKind === "repair" ? { serviceSurcharge: 1, summary: "Iron Gospel repair surcharge +1" } : null;
    case "healing-service-surcharge": return context.serviceKind === "healing" ? { serviceSurcharge: 1, summary: "Ash Hunger healing surcharge +1" } : null;
    case "forced-displacement-extra-step": return { displacementDistanceModifier: 1, summary: "Split Horizon adds one legal displacement step" };
    case "seal-event-option": return (context.optionCount ?? 0) >= 3 ? { sealedOptionIndex: 0, summary: "The Voice Below sealed one deterministic option" } : null;
    case "anomaly-natural-one-wound": return context.encounterKind === "anomaly" && context.naturalRoll === 1 ? { effect: { type: "take_wound", amount: 1 }, summary: "Rift-Eye inflicted 1 Wound" } : null;
    case "first-failed-hazard-wound": return context.encounterKind === "hazard" && context.success === false ? { effect: { type: "take_wound", amount: 1 }, summary: "Cinder Nerve inflicted 1 Wound" } : null;
    case "inner-anomaly-arrival-wound": return (context.sectorTags ?? []).some((tag) => tag === "inner" || tag === "anomaly") ? { effect: { type: "take_wound", amount: 1 }, summary: "Glasslung inflicted 1 Wound after arrival" } : null;
    case "owner-turn-escalation-wound": return context.encounterKind === "escalation" ? { effect: { type: "take_wound", amount: 1 }, summary: "Choir Static inflicted 1 Wound" } : null;
    case "contract-failure-escalation": return context.success === false ? { effect: { type: "advance_escalation", amount: 1 }, summary: "Oath-Chain Drag advanced escalation" } : null;
    case "contract-complete-heal": return context.success === true ? { effect: { type: "heal_wound", amount: 1 }, summary: "Oath-Chain Drag healed 1 Wound" } : null;
    case "elite-wounded-salvage": return context.mode === "battle" && context.success === true && context.elite && (context.wounds ?? 0) >= 2 && !context.battleAwardedSalvage ? { effect: { type: "gain_salvage", amount: 1 }, summary: "Ash Hunger gained 1 Salvage" } : null;
    case "toxic-wound-immunity": return (context.sectorTags ?? []).some((tag) => tag === "smoke" || tag === "spore" || tag === "toxic") ? { blocksEffect: true, summary: "Glasslung ignored the first toxic Wound" } : null;
    case "prevent-equipment-suppression": return { blocksEffect: true, summary: "Blackstar Shadow prevented Equipment suppression" };
    case "prevent-grit-displacement": return context.stat === "grit" && context.success === false ? { blocksEffect: true, summary: "Ash-Lanced prevented one displacement step" } : null;
    case "movement-alteration-wound-cost": return context.mode === "movement" ? { effect: { type: "take_wound", amount: 1 }, summary: "Void-Salt Craving paid 1 Wound" } : null;
    case "cross-ring-toll": return context.encounterKind === "gate" ? { effect: { type: "lose_salvage", amount: 1 }, summary: "Gate Mark demanded 1 Salvage or a Wound" } : null;
    case "first-trophy-reduction": return { modifier: -1, summary: "Marrow Debt reduced Trophy gain by 1, floor zero" };
    case "trophy-advancement-discount": return { modifier: -1, summary: "Marrow Debt reduced advancement cost by 1" };
    case "first-equipment-battle-exhaust":
    case "first-battle-equipment-exhaust": return context.mode === "battle" ? { summary: "Scar marked the first battle Equipment to exhaust" } : null;
    case "repair-forge-bonus": return context.stat === "forge" && context.serviceKind === "repair" ? positive("Broken Harness repair Forge +1") : null;
    case "forge-charge-restore": return context.stat === "forge" && context.success === true && (context.difficulty ?? 0) >= 10 ? { summary: "Iron Gospel may restore one Equipment charge" } : null;
    case "rift-signal-reroll": return context.stat === "signal" && (context.sectorTags ?? []).some((tag) => tag === "void" || tag === "rift") ? { summary: "Void-Salt Craving permits one Signal reroll" } : null;
    case "grit-hazard-reroll": return context.stat === "grit" && context.encounterKind === "hazard" ? { summary: "Cinder Nerve permits one Grit reroll" } : null;
    case "guile-anomaly-reroll": return context.stat === "guile" && context.encounterKind === "anomaly" ? { summary: "Webglass Afterimage permits one Guile reroll" } : null;
    case "guile-reroll": return context.stat === "guile" ? { summary: "Hollow Reflection permits one Guile reroll" } : null;
    case "ignore-blue-event": return (context.sectorTags ?? []).includes("blue") ? { blocksEffect: true, summary: "Static Burn ignored one owner-only Blue Event" } : null;
    case "declined-help-command-bonus": return context.stat === "command" && context.helperCount === 0 ? positive("Bell-Deafened declined-help Command +1") : null;
    case "relay-blue-peek": return (context.sectorTags ?? []).some((tag) => tag === "relay" || tag === "shrine") ? { summary: "Relay Ghost may inspect the next Blue Threat" } : null;
    case "choose-displacement-direction": return { summary: "Split Horizon permits a legal displacement direction choice" };
    case "inspect-hidden-consequence": return { summary: "The Voice Below permits one hidden consequence inspection" };
    case "next-unassisted-bonus": return context.mode !== "assistance" ? positive("Borrowed Name next unassisted test +1") : null;
  }
  return null;
}

function scopeId(state: GameState, limit: string, context: ScarRuleContext): string {
  if (limit === "oncePerBattle") return context.eventId;
  if (limit === "oncePerTurn") return `turn:${state.eventLog.filter((entry) => (entry as { type?: string }).type === "TURN_COMPLETED").length}`;
  if (limit === "oncePerVisit") return `visit:${context.eventId}`;
  if (limit === "oncePerGame") return `game:${state.sessionId}`;
  return `round:${state.eventLog.filter((entry) => (entry as { type?: string }).type === "ROUND_COMPLETED").length}`;
}

export function evaluateOwnedScarRules(
  state: GameState,
  player: PlayerState,
  kind: "burden" | "adaptation",
  context: ScarRuleContext
): Array<{ scarId: string; outcome: ScarRuleOutcome; usage?: ScarUsageEntry }> {
  const results: Array<{ scarId: string; outcome: ScarRuleOutcome; usage?: ScarUsageEntry }> = [];
  for (const scarId of player.character.scars) {
    const scar = getScarCard(scarId);
    if (!scar) continue;
    const rule = scar[kind];
    const outcome = evaluateScarRule(rule.key, context);
    if (!outcome) continue;
    const id = scopeId(state, rule.limit, context);
    if (rule.limit !== "passive" && (state.scarUsage ?? []).some((entry) => entry.seatId === player.seatId && entry.scarId === scarId && entry.ruleKey === rule.key && entry.scopeId === id)) continue;
    results.push({
      scarId,
      outcome,
      usage: rule.limit === "passive" ? undefined : {
        usageId: `${player.seatId}:${scarId}:${rule.key}:${id}`,
        seatId: player.seatId,
        scarId,
        ruleKey: rule.key,
        scope: rule.limit === "oncePerTurn" ? "turn" : rule.limit === "oncePerBattle" ? "battle" : rule.limit === "oncePerVisit" ? "visit" : rule.limit === "oncePerGame" ? "game" : "round",
        scopeId: id,
        sourceEventId: context.eventId,
        createdAt: context.eventId
      }
    });
  }
  return results;
}
