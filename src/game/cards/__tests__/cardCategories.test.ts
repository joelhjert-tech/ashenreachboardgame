import { describe, expect, it } from "vitest";
import { loadAnomalyCards } from "../../content/anomalies.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { loadTileChallenges } from "../../content/tileChallenges.js";
import {
  getThreatGameplayLifecycle,
  getThreatPresentationCategory,
  isTrophyEligibleThreat,
  validateThreatCategoryIdentity
} from "../cardCategories.js";

describe("canonical card category boundary", () => {
  it("keeps presentation identity separate from battle and test mechanics", () => {
    const threats = [...loadThreatCards().values()];
    const categories = threats.reduce<Record<string, number>>((counts, card) => {
      const category = getThreatPresentationCategory(card);
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});

    expect(threats).toHaveLength(109);
    expect(categories).toEqual({ enemy: 67, hazard: 20, event: 6, encounter: 6, asset: 10 });
    const discoveries = threats.filter((card) => getThreatPresentationCategory(card) === "asset");
    expect(discoveries.filter((card) => card.resourceTags?.includes("gear"))).toHaveLength(6);
    expect(discoveries.filter((card) => card.resourceTags?.includes("follower"))).toHaveLength(4);
    expect(threats.filter((card) => getThreatGameplayLifecycle(card) === "battle")).toHaveLength(67);
    expect(threats.filter((card) => getThreatGameplayLifecycle(card) === "test")).toHaveLength(42);
    expect(threats.filter(isTrophyEligibleThreat)).toHaveLength(67);
    expect(threats.flatMap(validateThreatCategoryIdentity)).toEqual([]);
  });

  it("makes every canonical encounter-family card reachable from normal play", () => {
    const sectors = createCanonicalSectorGraph();
    const threatIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.threat));
    const anomalyIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.anomaly));
    const escalationIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.escalation));
    const tileArtIds = new Set([...loadTileChallenges().values()].map((card) => card.artCardId));

    expect([...loadThreatCards().keys()].filter((id) => !threatIds.has(id) && !tileArtIds.has(id))).toEqual([]);
    expect([...loadAnomalyCards().keys()].filter((id) => !anomalyIds.has(id))).toEqual([]);
    expect([...loadEscalationCards().keys()].filter((id) => !escalationIds.has(id))).toEqual([]);
    expect(anomalyIds.size).toBe(20);
    expect(escalationIds.size).toBe(16);
  });
});
