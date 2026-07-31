import { describe, expect, it } from "vitest";
import { getThreatPresentationCategory } from "../../cards/cardCategories.js";
import { loadThreatCards } from "../../content/threats.js";

const EXPECTED_TROPHY_VALUES = {
  "glass-mire-stalker": 5,
  "bone-rivet-brute": 5,
  "ashen-doppelganger": 7,
  "cinder-veil-stalker": 3,
  "latchspire-raider": 4,
  "pale-cartel-shakedown": 3,
  "yard-ghoul-welders": 3,
  "relay-pilgrim-riot": 4
} as const;

describe("Threat reward balance", () => {
  it("keeps Hazard clear rewards scoped and tiered by difficulty", () => {
    const testedCards = [...loadThreatCards().values()].filter((card) => card.cardType === "hazard");
    const hazards = testedCards.filter((card) => getThreatPresentationCategory(card) === "hazard");
    const laneCounts = hazards.reduce<Record<string, number>>((counts, card) => {
      const lane = card.threatLane ?? "none";
      counts[lane] = (counts[lane] ?? 0) + 1;
      return counts;
    }, {});

    expect(laneCounts).toEqual({ red: 9, blue: 14, yellow: 6 });
    for (const card of hazards) {
      const expectedAmount = card.difficulty <= 6 ? 1 : card.difficulty <= 8 ? 2 : 3;
      expect(card.clearReward, card.id).toEqual({ type: "gain_salvage", amount: expectedAmount });
    }
    for (const card of testedCards.filter((card) => getThreatPresentationCategory(card) !== "hazard")) {
      expect(card.clearReward, card.id).toBeUndefined();
    }
  });

  it("normalizes Enemy trophy outliers while preserving explicit Trophy parity", () => {
    const threats = loadThreatCards();
    for (const [id, trophyValue] of Object.entries(EXPECTED_TROPHY_VALUES)) {
      const card = threats.get(id);
      expect(card?.cardType, id).toBe("enemy");
      if (!card || card.cardType !== "enemy") continue;
      expect(card.trophyValue, id).toBe(trophyValue);
      if (card.defeatReward.type === "gain_trophy") {
        expect(card.defeatReward.amount, id).toBe(trophyValue);
      }
    }
  });
});
