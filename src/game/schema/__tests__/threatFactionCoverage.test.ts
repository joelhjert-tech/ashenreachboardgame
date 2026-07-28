import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { nemeses } from "../../data/nemeses.js";
import {
  THREAT_FACTION_CARD_QUOTA,
  THREAT_FACTION_NAMES,
  threatFactionByName,
  threatFactionDefinitions
} from "../../data/threatFactions.js";

describe("Threat faction coverage", () => {
  it("keeps every faction at six enemies and four hazards", () => {
    const threats = [...loadThreatCards().values()];

    expect(threats).toHaveLength(
      THREAT_FACTION_NAMES.length *
        (THREAT_FACTION_CARD_QUOTA.enemy + THREAT_FACTION_CARD_QUOTA.hazard)
    );

    for (const faction of THREAT_FACTION_NAMES) {
      const factionCards = threats.filter((card) => card.faction === faction);
      expect(
        factionCards.filter((card) => card.cardType === "enemy"),
        `${faction} enemy quota`
      ).toHaveLength(THREAT_FACTION_CARD_QUOTA.enemy);
      expect(
        factionCards.filter((card) => card.cardType === "hazard"),
        `${faction} hazard quota`
      ).toHaveLength(THREAT_FACTION_CARD_QUOTA.hazard);
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
