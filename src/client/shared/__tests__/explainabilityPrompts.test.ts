import { describe, expect, it } from "vitest";
import { buildCurrentPlayerPrompt } from "../explainabilityPrompts.js";
import type { EncounterCard, PhonePatchPayload } from "../types.js";

function phonePatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  return {
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    players: [],
    seats: [],
    self: { seatId: "seat-1" },
    pendingEnemyRoll: null,
    encounter: null,
    outcomeSummary: null,
    ...overrides
  } as PhonePatchPayload;
}

function encounter(cardType: EncounterCard["cardType"], presentationType: EncounterCard["presentationType"]): EncounterCard {
  return {
    id: `${cardType}-1`,
    title: cardType === "enemy" ? "Ash Hound" : "Cinder Vent",
    cardType,
    presentationType,
    flavor: "Original Ashen Reach test fixture.",
    difficulty: 3,
    stat: "grit"
  };
}

describe("buildCurrentPlayerPrompt turn flow", () => {
  it("routes enemy arrivals to the Arrival battle control", () => {
    const prompt = buildCurrentPlayerPrompt(phonePatch({
      phase: "resolution",
      encounter: encounter("enemy", "enemy")
    }));

    expect(prompt.phaseLabel).toBe("Arrival · Battle");
    expect(prompt.targetTab).toBe("battle");
    expect(prompt.usefulNow).toContain("Use Arrival");
  });

  it("routes hazard arrivals to Action instead of the opposed-battle control", () => {
    const prompt = buildCurrentPlayerPrompt(phonePatch({
      phase: "resolution",
      encounter: encounter("hazard", "hazard")
    }));

    expect(prompt.phaseLabel).toBe("Arrival · Challenge");
    expect(prompt.targetTab).toBe("action");
    expect(prompt.tone).toBe("action");
  });

  it("labels broadcast as the End Turn experience window", () => {
    const prompt = buildCurrentPlayerPrompt(phonePatch({ phase: "broadcast" }));

    expect(prompt.phaseLabel).toBe("End Turn · Experience");
    expect(prompt.targetTab).toBe("action");
  });
});
