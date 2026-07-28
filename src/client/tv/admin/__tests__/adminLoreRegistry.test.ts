import { describe, expect, it } from "vitest";
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

  it("links every faction to one nemesis and an even six-enemy, four-hazard roster", () => {
    for (const faction of adminLoreFactionEntries) {
      expect(faction.nemesisKey).toMatch(/^nemesis:/);
      expect(faction.threats.filter((threat) => threat.cardType === "enemy")).toHaveLength(6);
      expect(faction.threats.filter((threat) => threat.cardType === "hazard")).toHaveLength(4);
      expect(new Set(faction.threats.map((threat) => threat.id)).size).toBe(10);
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
