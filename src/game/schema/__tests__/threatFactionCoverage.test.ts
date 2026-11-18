import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { nemeses } from "../../data/nemeses.js";
import { GRINNING_TITHE_HAZARD_ID } from "../../data/scenarios.js";
import {
  ENEMY_LANE_PRIMARY_STATS,
  ENEMY_LANE_TARGETS,
  PERSISTENT_HAZARD_EXPANSION_IDS,
  THREAT_FACTION_CARD_QUOTA,
  THREAT_FACTION_NAMES,
  threatFactionByName,
  threatFactionDefinitions
} from "../../data/threatFactions.js";

describe("Threat faction coverage", () => {
  it("keeps every faction represented and registers the persistent-hazard expansion", () => {
    const threats = [...loadThreatCards().values()];
    const enemies = threats.filter((card) => card.cardType === "enemy");
    const additionalHazards = new Set<string>([...PERSISTENT_HAZARD_EXPANSION_IDS, GRINNING_TITHE_HAZARD_ID]);

    expect(threats).toHaveLength(
      Object.values(ENEMY_LANE_TARGETS).reduce((sum, lane) => sum + lane.total, 0) +
        THREAT_FACTION_NAMES.length * THREAT_FACTION_CARD_QUOTA.hazard +
        additionalHazards.size
    );

    for (const faction of THREAT_FACTION_NAMES) {
      const factionCards = threats.filter((card) => card.faction === faction);
      const factionEnemies = factionCards.filter((card) => card.cardType === "enemy");
      expect(factionEnemies.length, `${faction} enemy coverage`).toBeGreaterThanOrEqual(12);
      expect(factionEnemies.length, `${faction} enemy coverage`).toBeLessThanOrEqual(13);
      expect(
        factionCards.filter((card) => card.cardType === "hazard"),
        `${faction} hazard quota`
      ).toHaveLength(
        THREAT_FACTION_CARD_QUOTA.hazard +
          factionCards.filter((card) => card.cardType === "hazard" && additionalHazards.has(card.id)).length
      );
    }
    expect(
      threats
        .filter((card) =>
          PERSISTENT_HAZARD_EXPANSION_IDS.includes(
            card.id as (typeof PERSISTENT_HAZARD_EXPANSION_IDS)[number]
          )
        )
        .every((card) => card.cardType === "hazard" && Boolean(card.persistentRule))
    ).toBe(true);

    for (const lane of ["red", "blue", "yellow"] as const) {
      const laneEnemies = enemies.filter((card) => card.threatLane === lane);
      const target = ENEMY_LANE_TARGETS[lane];
      const primaryStats = ENEMY_LANE_PRIMARY_STATS[lane] as readonly string[];
      expect(laneEnemies, `${lane} enemy lane`).toHaveLength(target.total);
      expect(
        laneEnemies.filter((card) => card.difficulty <= 3),
        `${lane} Entry enemies`
      ).toHaveLength(target.entry);
      expect(
        laneEnemies.filter((card) => card.difficulty >= 4 && card.difficulty <= 6),
        `${lane} Standard enemies`
      ).toHaveLength(target.standard);
      expect(
        laneEnemies.filter((card) => card.difficulty >= 7 && card.difficulty <= 9),
        `${lane} Severe enemies`
      ).toHaveLength(target.severe);
      expect(
        laneEnemies.filter((card) => card.difficulty >= 10),
        `${lane} Extreme enemies`
      ).toHaveLength(target.extreme);
      expect(
        laneEnemies.filter((card) => primaryStats.includes(card.stat)),
        `${lane} primary-stat concentration`
      ).toHaveLength(target.primary);
      expect(
        laneEnemies.filter((card) => !primaryStats.includes(card.stat)),
        `${lane} cross-lane tests`
      ).toHaveLength(target.total - target.primary);
    }
  });

  it("provides a purpose and encounter doctrine for every Nemesis faction", () => {
    expect(threatFactionDefinitions).toHaveLength(THREAT_FACTION_NAMES.length);
    expect(new Set(threatFactionDefinitions.map((faction) => faction.name))).toEqual(
      new Set(THREAT_FACTION_NAMES)
    );
    expect(new Set(nemeses.map((nemesis) => nemesis.faction))).toEqual(
      new Set(THREAT_FACTION_NAMES)
    );

    for (const faction of THREAT_FACTION_NAMES) {
      const definition = threatFactionByName.get(faction);
      const nemesis = nemeses.find((entry) => entry.faction === faction);

      expect(definition?.nemesisId).toBe(nemesis?.id);
      expect(definition?.background.length).toBeGreaterThan(80);
      expect(definition?.purpose.length).toBeGreaterThan(60);
      expect(definition?.enemyDoctrine.length).toBeGreaterThan(60);
      expect(definition?.hazardDoctrine.length).toBeGreaterThan(60);
    }
  });
});
