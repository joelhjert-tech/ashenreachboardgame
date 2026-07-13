import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { gameStateSchema } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";
import { getMirrorReflectionPressureThreshold, WITHDRAWN_LEGACY_HEAT_SERVICE_IDS } from "../../rules/legacyHeatCompatibility.js";
import type { EncounterEffect } from "../../schema/card.schema.js";

function resolve(effect: EncounterEffect) {
  const state = createInitialSessionState("legacy-heat-containment", "single-player");
  state.status = "active";
  state.phase = "resolution";
  state.pendingEffect = effect;
  state.players[0]!.character.wounds = 1;
  state.players[0]!.character.scars = ["scar-wound-1"];
  state.escalationLevel = 2;
  state.scenarioProgress = { lossPressure: 4 };
  return reduceGameState(state, { type: "RESOLUTION_APPLIED", seatId: state.players[0]!.seatId, effect, sourceCardId: "legacy-test", success: false, createdAt: "now" });
}

describe("Phase 1A legacy Heat compatibility", () => {
  it.each<EncounterEffect>([
    { type: "gain_heat", amount: 1 },
    { type: "gain_heat_all", amount: 1 },
    { type: "lose_heat", amount: 1 }
  ])("keeps $type a contained no-op without mutating current systems", (effect) => {
    const result = resolve(effect);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.state.players[0]!;
    expect(player.character.wounds).toBe(1);
    expect(player.character.scars).toEqual(["scar-wound-1"]);
    expect(result.state.escalationLevel).toBe(2);
    expect(result.state.scenarioProgress).toEqual({ lossPressure: 4 });
    expect(result.state.lastOutcomeSummary?.summary ?? "").not.toMatch(/Heat|Risk|Scar|Wound/i);
  });

  it("preserves the unrelated Mirror threshold through serialization", () => {
    const state = createInitialSessionState("legacy-save", "single-player");
    state.heatThreshold = 7;
    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(restored.heatThreshold).toBe(7);
    expect(getMirrorReflectionPressureThreshold(restored)).toBe(7);
  });

  it("keeps stable identifiers without active Heat costs", () => {
    const gear = loadGear();
    expect(gear.get("black-route-fuse")?.heatCost).toBeUndefined();
    expect(WITHDRAWN_LEGACY_HEAT_SERVICE_IDS.has("buy-boon")).toBe(true);
    expect(gear.has("heat-sink-prayer")).toBe(true);
  });
});
