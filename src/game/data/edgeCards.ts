export const EDGE_VALUES = [1, 2, 3, 4, 5, 6] as const;

export type EdgeValue = (typeof EDGE_VALUES)[number];
export type EdgePlayMode = "commit-value";

export interface EdgeCardDefinition {
  id: string;
  name: string;
  edgeValue: EdgeValue;
  abilityText: string;
  tradeoffText: string | null;
}

const defineEdgeCard = (definition: EdgeCardDefinition): EdgeCardDefinition => definition;

/**
 * Edge Cards are an original Ashen Reach deck.
 *
 * Phase one exposes only the server-authoritative commit-value mode. Authored
 * ability copy remains design inventory for later timing-specific modes and
 * has no runtime effect or client projection yet.
 */
export const EDGE_CARD_DECK: readonly EdgeCardDefinition[] = [
  defineEdgeCard({
    id: "edge-cinderline-break",
    name: "Cinderline Break",
    edgeValue: 1,
    abilityText: "Prevent 1 pending Wound from your enemy battle.",
    tradeoffText: "Forfeit every reward from that battle."
  }),
  defineEdgeCard({
    id: "edge-black-relay-decoy",
    name: "Black Relay Decoy",
    edgeValue: 1,
    abilityText: "Reduce this enemy's difficulty by 3 for your battle.",
    tradeoffText: "A victory awards no Trophy."
  }),
  defineEdgeCard({
    id: "edge-ashglass-overclock",
    name: "Ashglass Overclock",
    edgeValue: 2,
    abilityText: "Add +3 to one Hazard, Anomaly, or sector Challenge total.",
    tradeoffText: "If the Challenge still fails, suffer 1 additional Wound."
  }),
  defineEdgeCard({
    id: "edge-closed-circuit-aid",
    name: "Closed-Circuit Aid",
    edgeValue: 2,
    abilityText: "One accepted helper contributes +2 additional assistance.",
    tradeoffText: "Play before the server rolls any dice."
  }),
  defineEdgeCard({
    id: "edge-cinder-requisition",
    name: "Cinder Requisition",
    edgeValue: 3,
    abilityText: "Convert up to 2 Trophy value from this victory into equal Salvage.",
    tradeoffText: "Converted Trophy value is not added to your Trophy pile."
  }),
  defineEdgeCard({
    id: "edge-static-shunt",
    name: "Static Shunt",
    edgeValue: 3,
    abilityText: "Ignore one pending non-Wound failure effect from your Challenge.",
    tradeoffText: "The Challenge still counts as failed."
  }),
  defineEdgeCard({
    id: "edge-echo-recast",
    name: "Echo Recast",
    edgeValue: 4,
    abilityText: "Reroll one die from your battle or Challenge.",
    tradeoffText: "Accept the second result."
  }),
  defineEdgeCard({
    id: "edge-isolated-channel",
    name: "Isolated Channel",
    edgeValue: 4,
    abilityText: "Add +2 to your total for this resolution.",
    tradeoffText: "You cannot request or receive assistance."
  }),
  defineEdgeCard({
    id: "edge-quiet-ledger",
    name: "Quiet Ledger",
    edgeValue: 5,
    abilityText: "Reduce one Gear purchase or service by 1 Salvage.",
    tradeoffText: "The final cost cannot be lower than 1 Salvage."
  }),
  defineEdgeCard({
    id: "edge-known-scar-pattern",
    name: "Known Scar Pattern",
    edgeValue: 5,
    abilityText: "Add +1 against an enemy family already recorded in your Trophy pile.",
    tradeoffText: null
  }),
  defineEdgeCard({
    id: "edge-low-signal-discipline",
    name: "Low-Signal Discipline",
    edgeValue: 6,
    abilityText: "Change one natural result of 1 to a 2.",
    tradeoffText: "This is not a reroll and cannot trigger roll-based bonuses."
  }),
  defineEdgeCard({
    id: "edge-hazard-wake",
    name: "Hazard Wake",
    edgeValue: 6,
    abilityText: "Suppress one sector modifier created by that Hazard until round end.",
    tradeoffText: "The Hazard remains attached to its sector."
  })
] as const;

export const EDGE_CARD_BY_ID = new Map(
  EDGE_CARD_DECK.map((definition) => [definition.id, definition] as const)
);

export const EDGE_RULES = {
  startingHand: 1,
  baseHandLimit: 2,
  maximumHandLimit: 4,
  completedContractsForExtraSlot: 2,
  cardsPerResolution: 1,
  awardRule: "Random at setup and after completing a Contract. Cards are never chosen.",
  liveMode: "commit-value" as const
} as const;

export interface EdgeProgression {
  completedContracts: number;
  ownedArtifacts: number;
}

export function getEdgeHandLimit(progression: EdgeProgression): number {
  const contractIncrease =
    progression.completedContracts >= EDGE_RULES.completedContractsForExtraSlot ? 1 : 0;
  const artifactIncrease = progression.ownedArtifacts >= 1 ? 1 : 0;
  return Math.min(
    EDGE_RULES.maximumHandLimit,
    EDGE_RULES.baseHandLimit + contractIncrease + artifactIncrease
  );
}

export function validateEdgeDeck(cardIds: readonly string[]): string[] {
  const errors: string[] = [];
  const expectedIds = new Set(EDGE_CARD_DECK.map((definition) => definition.id));
  const seenIds = new Set<string>();

  for (const cardId of cardIds) {
    if (!expectedIds.has(cardId)) errors.push(`Unknown Edge card id: ${cardId}`);
    if (seenIds.has(cardId)) errors.push(`Duplicate Edge card id: ${cardId}`);
    seenIds.add(cardId);
  }

  if (cardIds.length !== EDGE_CARD_DECK.length) {
    errors.push(`Edge deck has ${cardIds.length} cards; expected ${EDGE_CARD_DECK.length}`);
  }

  for (const expectedId of expectedIds) {
    if (!seenIds.has(expectedId)) errors.push(`Missing Edge card id: ${expectedId}`);
  }

  return errors;
}
