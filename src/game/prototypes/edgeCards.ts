/**
 * Historical executable design mirror.
 *
 * Both Edge play modes are now wired into production through
 * `src/game/data/edgeCards.ts` and the server-authoritative room lifecycle.
 * This module remains as design-math coverage for the original proposal.
 */

export const EDGE_VALUES = [1, 2, 3, 4, 5, 6] as const;

export type EdgeValue = (typeof EDGE_VALUES)[number];
export type EdgeAbilityBand = "major" | "standard" | "narrow";
export type EdgePlayMode = "commit-value" | "ability";
export type EdgeTiming =
  | "action"
  | "before-own-roll"
  | "after-own-roll"
  | "cooperative-assistance"
  | "pending-consequence"
  | "after-threat-clear"
  | "after-hazard-clear";
export type EdgeResolutionKind =
  | "battle"
  | "challenge"
  | "shop"
  | "cooperative"
  | "threat-clear"
  | "hazard-clear";

export type EdgeAbilityEffect =
  | { type: "prevent_wound_forfeit_reward"; amount: 1 }
  | { type: "reduce_enemy_difficulty_forfeit_trophy"; amount: 3 }
  | { type: "add_check_bonus_with_failure_wound"; amount: 3 }
  | { type: "boost_accepted_helper"; amount: 2 }
  | { type: "convert_trophy_to_salvage"; maximum: 2 }
  | { type: "ignore_non_wound_failure_effect"; amount: 1 }
  | { type: "reroll_and_accept"; dice: 1 }
  | { type: "add_total_without_assistance"; amount: 2 }
  | { type: "discount_shop_cost"; amount: 1; minimumCost: 1 }
  | { type: "known_enemy_family_bonus"; amount: 1 }
  | { type: "raise_low_roll"; from: 1; to: 2 }
  | { type: "suppress_hazard_sector_modifier"; duration: "round" };

export interface EdgeCardDefinition {
  id: string;
  name: string;
  edgeValue: EdgeValue;
  abilityBand: EdgeAbilityBand;
  timing: EdgeTiming;
  eligibleKinds: EdgeResolutionKind[];
  abilityText: string;
  tradeoffText: string | null;
  effect: EdgeAbilityEffect;
}

export interface EdgePlayRequest {
  mode: EdgePlayMode;
  timing: EdgeTiming;
  resolutionKind: EdgeResolutionKind;
  edgeAlreadyUsed: boolean;
}

export interface EdgeProgression {
  completedContracts: number;
  ownedArtifacts: number;
}

export interface EdgeDrawPlan {
  nextHand: string[];
  awarded: boolean;
}

export interface EdgeSpendResult {
  nextHand: string[];
  nextDiscard: string[];
}

const card = (definition: EdgeCardDefinition): EdgeCardDefinition => definition;

export const EDGE_CARD_PROTOTYPE: readonly EdgeCardDefinition[] = [
  card({
    id: "edge-cinderline-break",
    name: "Cinderline Break",
    edgeValue: 1,
    abilityBand: "major",
    timing: "pending-consequence",
    eligibleKinds: ["battle"],
    abilityText: "Prevent 1 pending Wound from your enemy battle.",
    tradeoffText: "Forfeit every reward from that battle.",
    effect: { type: "prevent_wound_forfeit_reward", amount: 1 }
  }),
  card({
    id: "edge-black-relay-decoy",
    name: "Black Relay Decoy",
    edgeValue: 1,
    abilityBand: "major",
    timing: "before-own-roll",
    eligibleKinds: ["battle"],
    abilityText: "Reduce this enemy's difficulty by 3 for your battle.",
    tradeoffText: "A victory awards no Trophy.",
    effect: { type: "reduce_enemy_difficulty_forfeit_trophy", amount: 3 }
  }),
  card({
    id: "edge-ashglass-overclock",
    name: "Ashglass Overclock",
    edgeValue: 2,
    abilityBand: "major",
    timing: "before-own-roll",
    eligibleKinds: ["challenge"],
    abilityText: "Add +3 to one Hazard, Anomaly, or sector Challenge total.",
    tradeoffText: "If the Challenge still fails, suffer 1 additional Wound.",
    effect: { type: "add_check_bonus_with_failure_wound", amount: 3 }
  }),
  card({
    id: "edge-closed-circuit-aid",
    name: "Closed-Circuit Aid",
    edgeValue: 2,
    abilityBand: "major",
    timing: "cooperative-assistance",
    eligibleKinds: ["cooperative"],
    abilityText: "One accepted helper contributes +2 additional assistance.",
    tradeoffText: "Play before the server rolls any dice.",
    effect: { type: "boost_accepted_helper", amount: 2 }
  }),
  card({
    id: "edge-cinder-requisition",
    name: "Cinder Requisition",
    edgeValue: 3,
    abilityBand: "standard",
    timing: "after-threat-clear",
    eligibleKinds: ["threat-clear"],
    abilityText: "Convert up to 2 Trophy value from this victory into equal Salvage.",
    tradeoffText: "Converted Trophy value is not added to your Trophy pile.",
    effect: { type: "convert_trophy_to_salvage", maximum: 2 }
  }),
  card({
    id: "edge-static-shunt",
    name: "Static Shunt",
    edgeValue: 3,
    abilityBand: "standard",
    timing: "pending-consequence",
    eligibleKinds: ["challenge"],
    abilityText: "Ignore one pending non-Wound failure effect from your Challenge.",
    tradeoffText: "The Challenge still counts as failed.",
    effect: { type: "ignore_non_wound_failure_effect", amount: 1 }
  }),
  card({
    id: "edge-echo-recast",
    name: "Echo Recast",
    edgeValue: 4,
    abilityBand: "standard",
    timing: "after-own-roll",
    eligibleKinds: ["battle", "challenge"],
    abilityText: "Reroll one die from your battle or Challenge.",
    tradeoffText: "Accept the second result.",
    effect: { type: "reroll_and_accept", dice: 1 }
  }),
  card({
    id: "edge-isolated-channel",
    name: "Isolated Channel",
    edgeValue: 4,
    abilityBand: "standard",
    timing: "before-own-roll",
    eligibleKinds: ["battle", "challenge"],
    abilityText: "Add +2 to your total for this resolution.",
    tradeoffText: "You cannot request or receive assistance.",
    effect: { type: "add_total_without_assistance", amount: 2 }
  }),
  card({
    id: "edge-quiet-ledger",
    name: "Quiet Ledger",
    edgeValue: 5,
    abilityBand: "narrow",
    timing: "action",
    eligibleKinds: ["shop"],
    abilityText: "Reduce one Gear purchase or service by 1 Salvage.",
    tradeoffText: "The final cost cannot be lower than 1 Salvage.",
    effect: { type: "discount_shop_cost", amount: 1, minimumCost: 1 }
  }),
  card({
    id: "edge-known-scar-pattern",
    name: "Known Scar Pattern",
    edgeValue: 5,
    abilityBand: "narrow",
    timing: "before-own-roll",
    eligibleKinds: ["battle"],
    abilityText: "Add +1 against an enemy family already recorded in your Trophy pile.",
    tradeoffText: null,
    effect: { type: "known_enemy_family_bonus", amount: 1 }
  }),
  card({
    id: "edge-low-signal-discipline",
    name: "Low-Signal Discipline",
    edgeValue: 6,
    abilityBand: "narrow",
    timing: "after-own-roll",
    eligibleKinds: ["battle", "challenge"],
    abilityText: "Change one natural result of 1 to a 2.",
    tradeoffText: "This is not a reroll and cannot trigger roll-based bonuses.",
    effect: { type: "raise_low_roll", from: 1, to: 2 }
  }),
  card({
    id: "edge-hazard-wake",
    name: "Hazard Wake",
    edgeValue: 6,
    abilityBand: "narrow",
    timing: "after-hazard-clear",
    eligibleKinds: ["hazard-clear"],
    abilityText: "Suppress one sector modifier created by that Hazard until round end.",
    tradeoffText: "The Hazard remains attached to its sector.",
    effect: { type: "suppress_hazard_sector_modifier", duration: "round" }
  })
] as const;

export const EDGE_PROTOTYPE_RULES = {
  status: "full-runtime-wired",
  startingHand: 1,
  baseHandLimit: 2,
  maximumHandLimit: 4,
  cardsPerValue: 2,
  cardsPerResolution: 1,
  valueModeKinds: ["battle", "challenge"] as const,
  valueModeTiming: "before-own-roll" as const,
  committedValueExplodes: false,
  committedValueCanBeRerolled: false,
  drawSources: [
    "Draw 1 during setup.",
    "Draw 1 after completing a Contract.",
    "A future authored clear-sector service may sell 1 draw for 2 Salvage once per turn."
  ]
} as const;

export function getEdgeHandLimit(progression: EdgeProgression): number {
  const contractIncrease = progression.completedContracts >= 2 ? 1 : 0;
  const artifactIncrease = progression.ownedArtifacts >= 1 ? 1 : 0;
  return Math.min(
    EDGE_PROTOTYPE_RULES.maximumHandLimit,
    EDGE_PROTOTYPE_RULES.baseHandLimit + contractIncrease + artifactIncrease
  );
}

export function isEdgePlayLegal(card: EdgeCardDefinition, request: EdgePlayRequest): boolean {
  if (request.edgeAlreadyUsed) return false;

  if (request.mode === "commit-value") {
    return (
      request.timing === EDGE_PROTOTYPE_RULES.valueModeTiming &&
      EDGE_PROTOTYPE_RULES.valueModeKinds.includes(
        request.resolutionKind as (typeof EDGE_PROTOTYPE_RULES.valueModeKinds)[number]
      )
    );
  }

  return card.timing === request.timing && card.eligibleKinds.includes(request.resolutionKind);
}

export function planEdgeDraw(
  hand: readonly string[],
  drawnCardId: string,
  handLimit: number
): EdgeDrawPlan {
  if (hand.length >= handLimit) {
    return {
      nextHand: [...hand],
      awarded: false
    };
  }
  return {
    nextHand: [...hand, drawnCardId],
    awarded: true
  };
}

export function spendEdgeCard(
  hand: readonly string[],
  discard: readonly string[],
  cardId: string
): EdgeSpendResult | null {
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex < 0) return null;

  return {
    nextHand: hand.filter((_, index) => index !== cardIndex),
    nextDiscard: [...discard, cardId]
  };
}

export function validateEdgePrototypeDeck(
  deck: readonly EdgeCardDefinition[] = EDGE_CARD_PROTOTYPE
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const definition of deck) {
    if (ids.has(definition.id)) errors.push(`Duplicate Edge card id: ${definition.id}`);
    ids.add(definition.id);

    const expectedBand: EdgeAbilityBand =
      definition.edgeValue <= 2 ? "major" : definition.edgeValue <= 4 ? "standard" : "narrow";
    if (definition.abilityBand !== expectedBand) {
      errors.push(
        `${definition.id} has ${definition.abilityBand} ability band; value ${definition.edgeValue} requires ${expectedBand}`
      );
    }
  }

  for (const value of EDGE_VALUES) {
    const count = deck.filter((definition) => definition.edgeValue === value).length;
    if (count !== EDGE_PROTOTYPE_RULES.cardsPerValue) {
      errors.push(
        `Edge value ${value} has ${count} cards; expected ${EDGE_PROTOTYPE_RULES.cardsPerValue}`
      );
    }
  }

  return errors;
}
