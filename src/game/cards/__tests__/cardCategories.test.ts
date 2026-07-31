import { describe, expect, it } from "vitest";
import { loadAnomalyCards } from "../../content/anomalies.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { SCENARIOS } from "../../data/scenarios.js";
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

    expect(threats).toHaveLength(204);
    expect(categories).toEqual({ enemy: 150, hazard: 29, event: 8, encounter: 5, asset: 12 });
    const discoveries = threats.filter((card) => getThreatPresentationCategory(card) === "asset");
    expect(discoveries.filter((card) => card.resourceTags?.includes("gear"))).toHaveLength(7);
    expect(discoveries.filter((card) => card.resourceTags?.includes("follower"))).toHaveLength(5);
    expect(threats.filter((card) => getThreatGameplayLifecycle(card) === "battle")).toHaveLength(150);
    expect(threats.filter((card) => getThreatGameplayLifecycle(card) === "test")).toHaveLength(54);
    expect(threats.filter(isTrophyEligibleThreat)).toHaveLength(150);
    expect(threats.flatMap(validateThreatCategoryIdentity)).toEqual([]);
  });

  it("makes every canonical encounter-family card reachable from normal play", () => {
    const sectors = createCanonicalSectorGraph();
    const threatIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.threat));
    const scenarioThreatIds = new Set(
      SCENARIOS.flatMap((scenario) =>
        [
          ...Object.values(scenario.threatLaneAdditions ?? {}).flatMap((cardIds) => cardIds ?? []),
          ...(scenario.randomAssault?.cardIds ?? [])
        ]
      )
    );
    const anomalyIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.anomaly));
    const escalationIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.escalation));
    const tileArtIds = new Set([...loadTileChallenges().values()].map((card) => card.artCardId));

    expect(
      [...loadThreatCards().values()].filter(
        (card) =>
          card.region !== "global" &&
          !threatIds.has(card.id) &&
          !scenarioThreatIds.has(card.id) &&
          !tileArtIds.has(card.id)
      )
    ).toEqual([]);
    expect([...loadAnomalyCards().keys()].filter((id) => !anomalyIds.has(id))).toEqual([]);
    expect([...loadEscalationCards().keys()].filter((id) => !escalationIds.has(id))).toEqual([]);
    expect(anomalyIds.size).toBe(20);
    expect(escalationIds.size).toBe(16);
  });
});
