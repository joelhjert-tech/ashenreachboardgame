import { describe, expect, it } from "vitest";
import { buildEngagementQueue } from "../engagementPhase.js";
import type { BoardThreatCard } from "../explorationPhase.js";

function card(id: string, category: BoardThreatCard["category"]): BoardThreatCard {
  return { id, category } as BoardThreatCard;
}

describe("engagement category order", () => {
  it("resolves event, enemy, nemesis, encounter, then asset", () => {
    const queue = buildEngagementQueue([
      card("asset", "asset"),
      card("encounter", "encounter"),
      card("nemesis", "nemesis"),
      card("enemy", "enemy"),
      card("event", "event")
    ]);

    expect(queue.map((entry) => entry.id)).toEqual(["event", "enemy", "nemesis", "encounter", "asset"]);
  });

  it("rejects unsupported categories instead of silently reordering them", () => {
    expect(() => buildEngagementQueue([card("unknown", "hazard" as BoardThreatCard["category"])]))
      .toThrow("Unsupported engagement category hazard on unknown");
  });
});
