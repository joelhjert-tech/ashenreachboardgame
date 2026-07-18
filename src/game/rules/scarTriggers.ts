import type { EncounterEffect } from "../schema/card.schema.js";
import type { GameState } from "../schema/session.schema.js";
import type { PendingScarConsequence, ScarSourceEvent, ScarTriggerType } from "../schema/scarTrigger.schema.js";

export interface ScarTriggerDefinition {
  scarCardId: string;
  title: string;
  triggerType: ScarTriggerType;
  effect: EncounterEffect;
  reactionRequired: boolean;
  engineSupport: "supported" | "blocked";
  blockedReason?: string;
  priority?: number;
}

const note = (text: string): EncounterEffect => ({ type: "gain_note", text });

export const SCAR_TRIGGER_DEFINITIONS: readonly ScarTriggerDefinition[] = [
  { scarCardId: "scar-wound-1", title: "Ash-Lanced", triggerType: "afterTest", effect: note("Ash-Lanced scar recorded the source of the failed grit test."), reactionRequired: false, engineSupport: "supported" },
  { scarCardId: "scar-wound-2", title: "Static Burn", triggerType: "beforeTest", effect: note("Static Burn broadcast a warning through the operative."), reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-3", title: "Broken Harness", triggerType: "onWoundTaken", effect: note("Broken Harness recorded a strain warning."), reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-4", title: "Bell-Deafened", triggerType: "beforeTest", effect: note("Bell-Deafened scar recorded a warbell warning."), reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-5", title: "Glasslung", triggerType: "onMovementResolved", effect: note("Glasslung marked the bad air for later treatment."), reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-6", title: "Oath-Chain Drag", triggerType: "onContractResolved", effect: { type: "advance_escalation", amount: 1 }, reactionRequired: false, engineSupport: "blocked", blockedReason: "Current contract events do not distinguish abandoned or failed objectives." },
  { scarCardId: "scar-wound-7", title: "Void-Salt Craving", triggerType: "onMovementResolved", effect: { type: "take_wound", amount: 1 }, reactionRequired: true, engineSupport: "blocked", blockedReason: "The authored timing is before a reroll or adjustment, not after movement resolution." },
  { scarCardId: "scar-wound-8", title: "Webglass Afterimage", triggerType: "beforeTest", effect: note("Webglass Afterimage marked a false reflection."), reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-9", title: "Red March Tremor", triggerType: "beforeTest", effect: { type: "take_wound", amount: 1 }, reactionRequired: true, engineSupport: "supported" },
  { scarCardId: "scar-wound-10", title: "Marrow Debt", triggerType: "onTrophyGained", effect: note("Marrow Debt collected: reduce the next trophy gain by 1."), reactionRequired: false, engineSupport: "blocked", blockedReason: "The typed effect records a note but does not authoritatively reduce the trophy transaction." },
  { scarCardId: "scar-wound-11", title: "Cinder Nerve", triggerType: "onWoundTaken", effect: note("Cinder Nerve warned early."), reactionRequired: true, engineSupport: "blocked", blockedReason: "The trigger requires a pre-consequence hazard window not represented by onWoundTaken." },
  { scarCardId: "scar-wound-12", title: "Relay Ghost", triggerType: "onTurnStarted", effect: note("Relay Ghost calling: answer a route signal this round or advance escalation by 1."), reactionRequired: false, engineSupport: "blocked", blockedReason: "The delayed end-of-round escalation choice has no typed follow-up state." },
  { scarCardId: "scar-wound-13", title: "Blackstar Shadow", triggerType: "onScarSuppressed", effect: note("Blackstar Shadow fed: reduce this relief by 1."), reactionRequired: false, engineSupport: "blocked", blockedReason: "Scar suppression and relief strength are not authoritative engine concepts." },
  { scarCardId: "scar-wound-14", title: "Gate Mark", triggerType: "onMovementResolved", effect: { type: "take_wound", amount: 1 }, reactionRequired: true, engineSupport: "blocked", blockedReason: "The pay-trophy-or-wound choice is not represented by the single typed effect." },
  { scarCardId: "scar-wound-15", title: "Choir Static", triggerType: "onEscalationAdvanced", effect: note("Choir Static warned the whole table."), reactionRequired: true, engineSupport: "blocked", blockedReason: "The owner choice and all-player note consequence require a typed multi-target choice." }
] as const;

export function getScarTriggerDefinition(scarCardId: string): ScarTriggerDefinition | undefined {
  return SCAR_TRIGGER_DEFINITIONS.find((entry) => entry.scarCardId === scarCardId);
}

export function getMatchingScarTriggers(state: GameState, event: ScarSourceEvent): Array<ScarTriggerDefinition & { scarInstanceId: string }> {
  const player = state.players.find((entry) => entry.seatId === event.seatId);
  if (!player) return [];
  return player.character.scars
    .map((scarCardId, index) => {
      const definition = getScarTriggerDefinition(scarCardId);
      return definition ? { ...definition, scarInstanceId: `${event.seatId}:${scarCardId}:${index}` } : null;
    })
    .filter((entry): entry is ScarTriggerDefinition & { scarInstanceId: string } => Boolean(entry && entry.engineSupport === "supported" && entry.triggerType === event.type))
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0) || left.scarInstanceId.localeCompare(right.scarInstanceId));
}

export function buildPendingScarConsequences(state: GameState, event: ScarSourceEvent, createdAt: string): PendingScarConsequence[] {
  return getMatchingScarTriggers(state, event)
    .filter((entry) => entry.reactionRequired)
    .map((entry) => ({
      reactionId: `${event.id}:${entry.scarInstanceId}`,
      seatId: event.seatId,
      scarInstanceId: entry.scarInstanceId,
      scarCardId: entry.scarCardId,
      scarTitle: entry.title,
      triggerType: entry.triggerType,
      sourceEventId: event.id,
      pendingEffects: [{ effectId: `${event.id}:${entry.scarInstanceId}:0`, effect: entry.effect }],
      createdAt,
      status: "pending"
    }));
}

export function validateScarTriggerCatalog(cards: ReadonlyMap<string, { id: string; effect: EncounterEffect }>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const definition of SCAR_TRIGGER_DEFINITIONS) {
    if (seen.has(definition.scarCardId)) errors.push(`Scar ${definition.scarCardId} has duplicate typed trigger definitions.`);
    seen.add(definition.scarCardId);
    const card = cards.get(definition.scarCardId);
    if (!card) {
      errors.push(`Typed Scar trigger references missing card ${definition.scarCardId}.`);
      continue;
    }
    if (JSON.stringify(card.effect) !== JSON.stringify(definition.effect)) errors.push(`Scar ${definition.scarCardId} typed effect does not match its authored effect.`);
    if (definition.triggerType === "passive" && definition.reactionRequired) errors.push(`Passive Scar ${definition.scarCardId} cannot open a reaction window.`);
    if (definition.engineSupport === "blocked" && !definition.blockedReason) errors.push(`Blocked Scar ${definition.scarCardId} requires a migration reason.`);
    if (definition.effect.type === "gain_scar" && definition.effect.scarId === definition.scarCardId) errors.push(`Scar ${definition.scarCardId} recursively grants itself.`);
  }
  for (const card of cards.values()) if (!seen.has(card.id)) errors.push(`Scar ${card.id} has authored trigger text but no typed trigger definition.`);
  return errors;
}
