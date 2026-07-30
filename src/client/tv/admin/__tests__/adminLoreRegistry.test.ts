import { describe, expect, it } from "vitest";
import { PERSISTENT_HAZARD_EXPANSION_IDS } from "../../../../game/data/threatFactions.js";
import { GRINNING_TITHE_HAZARD_ID } from "../../../../game/data/scenarios.js";
import {
  adminLoreCounts,
  adminLoreEntries,
  adminLoreEventEntries,
  adminLoreFactionEntries,
  adminLoreOperativeEntries,
  adminLoreSectorEntries
} from "../adminLoreRegistry.js";

describe("admin lore registry", () => {
  it("builds a complete canon index from authored public lore", () => {
    expect(adminLoreCounts).toEqual({
      factions: 12,
      nemeses: 12,
      operatives: 17,
      sectors: 49,
      scenarios: 8,
      events: 16
    });
    expect(adminLoreEntries).toHaveLength(114);
    expect(adminLoreOperativeEntries.some((entry) => entry.id === "char_master_alpha")).toBe(false);
    expect(adminLoreSectorEntries.filter((entry) => entry.tier === "center")).toHaveLength(1);
    expect(adminLoreEventEntries).toHaveLength(16);
    expect(adminLoreEventEntries.every((entry) => entry.imageUrl?.startsWith("/assets/cards/escalations/"))).toBe(true);
  });

  it("links every faction to one nemesis, its expanded roster, and registered Hazard expansions", () => {
    for (const faction of adminLoreFactionEntries) {
      const expansionCount = faction.threats.filter((threat) =>
        PERSISTENT_HAZARD_EXPANSION_IDS.includes(
          threat.id as (typeof PERSISTENT_HAZARD_EXPANSION_IDS)[number]
        )
      ).length;
      const scenarioHazardCount = faction.threats.some((threat) => threat.id === GRINNING_TITHE_HAZARD_ID)
        ? 1
        : 0;
      expect(faction.nemesisKey).toMatch(/^nemesis:/);
      const enemyCount = faction.threats.filter((threat) => threat.cardType === "enemy").length;
      expect(enemyCount).toBeGreaterThanOrEqual(12);
      expect(enemyCount).toBeLessThanOrEqual(13);
      expect(faction.threats.filter((threat) => threat.cardType === "hazard")).toHaveLength(
        4 + expansionCount + scenarioHazardCount
      );
      expect(new Set(faction.threats.map((threat) => threat.id)).size).toBe(
        enemyCount + 4 + expansionCount + scenarioHazardCount
      );
    }
  });

  it("does not copy private scenario or live-session payloads into the bible", () => {
    const serialized = JSON.stringify(adminLoreEntries);
    expect(serialized).not.toContain('"privateMetadata"');
    expect(serialized).not.toContain('"hiddenAgendaReveal"');
    expect(serialized).not.toContain('"roomCode"');
    expect(serialized).not.toContain('"hostToken"');
    expect(serialized).not.toContain('"playerName"');
    expect(serialized).not.toContain('"message"');
  });
});
