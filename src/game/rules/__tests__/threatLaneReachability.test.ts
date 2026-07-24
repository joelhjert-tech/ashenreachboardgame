import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";

describe("production threat lane reachability", () => {
  it.each(["red", "blue", "yellow"] as const)(
    "keeps at least one enemy reachable in the %s lane",
    (lane) => {
      const threats = loadThreatCards();
      const reachableThreatIds = new Set(
        createCanonicalSectorGraph().flatMap((sector) => sector.encounterDecks.threat)
      );
      const reachableEnemies = [...threats.values()].filter(
        (card) =>
          card.cardType === "enemy" &&
          card.threatLane === lane &&
          reachableThreatIds.has(card.id)
      );

      expect(reachableEnemies.map((card) => card.id)).not.toHaveLength(0);
    }
  );
});
