import type { ThreatCard, ThreatResolutionType } from "../schema/card.schema.js";

export type CanonicalEncounterCategory =
  | "enemy"
  | "hazard"
  | "anomaly"
  | "escalation"
  | "event"
  | "encounter"
  | "asset"
  | "nemesis"
  | "tile-challenge"
  | "scenario";

export type ThreatGameplayLifecycle = "battle" | "test";

/**
 * Presentation identity is independent from the authoritative resolution
 * mechanic. A Threat may be presented as an Event or Asset while still using
 * the tested-hazard lifecycle authored by cardType.
 */
export function getThreatPresentationCategory(card: ThreatCard): ThreatResolutionType | "hazard" {
  return card.resolutionType ?? (card.cardType === "enemy" ? "enemy" : "hazard");
}

export function getThreatGameplayLifecycle(card: ThreatCard): ThreatGameplayLifecycle {
  return card.cardType === "enemy" ? "battle" : "test";
}

export function isTrophyEligibleThreat(card: ThreatCard): boolean {
  return card.cardType === "enemy" && card.trophyValue > 0;
}

export function validateThreatCategoryIdentity(card: ThreatCard): string[] {
  const issues: string[] = [];
  const category = getThreatPresentationCategory(card);

  if (card.cardType === "enemy" && !["enemy", "nemesis"].includes(category)) {
    issues.push(`${card.id} uses enemy battle mechanics but declares ${category} presentation`);
  }

  if (card.cardType === "hazard" && ["enemy", "nemesis"].includes(category)) {
    issues.push(`${card.id} uses hazard test mechanics but declares ${category} presentation`);
  }

  return issues;
}
