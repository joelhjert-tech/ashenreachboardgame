import { describe, expect, it } from "vitest";
import { reduceGameState } from "../../game/engine/reducer.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

function resolveLoss(startingSalvage: number) {
  const state = createInitialSessionState(`phase-1g-projection-${startingSalvage}`, "single-player");
  const seatId = state.players[0]!.seatId;
  state.status = "active";
  state.phase = "resolution";
  state.players[0]!.character.salvage = startingSalvage;
  state.pendingEffect = { type: "lose_salvage", amount: 1 };
  state.activeResolution = {
    id: `phase-1g-resolution-${startingSalvage}`,
    playerId: seatId,
    source: "threat",
    stage: "roll_result",
    outcome: { title: "Failure", text: "Pending", effects: ["Pending"] }
  };
  const result = reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId,
    effect: state.pendingEffect,
    sourceCardId: "ash-rat-skitter",
    success: false,
    createdAt: "now"
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.rejection.reason);
  return { state: result.state, seatId };
}

describe("Phase 1G Salvage result projection", () => {
  it("projects the same actual public loss to phone and TV", () => {
    const resolved = resolveLoss(1);
    const tv = createTvProjection(resolved.state) as { publicResultDeltas: Array<Record<string, unknown>> };
    const phone = createPhoneProjection(resolved.state, resolved.seatId) as { publicResultDeltas: Array<Record<string, unknown>> };
    expect(tv.publicResultDeltas).toContainEqual(expect.objectContaining({ type: "salvage", value: 1, sign: "loss", publicText: "Lost 1 Salvage." }));
    expect(phone.publicResultDeltas).toEqual(tv.publicResultDeltas);
    expect(JSON.stringify(tv)).not.toMatch(/\bHeat\b|\bRisk\b|lose_salvage/);
  });

  it("does not fabricate a negative delta when floor-zero loss removes nothing", () => {
    const resolved = resolveLoss(0);
    const tv = createTvProjection(resolved.state) as { publicResultDeltas: Array<Record<string, unknown>> };
    expect(tv.publicResultDeltas.some((delta) => delta.type === "salvage" && delta.sign === "loss")).toBe(false);
    expect(resolved.state.activeResolution?.outcome?.effects).toEqual(["No Salvage was lost."]);
    expect(JSON.stringify(tv)).not.toContain("Lost 1 Salvage");
  });

  it("preserves resolved loss through schema-backed reconnect state without replay", () => {
    const resolved = resolveLoss(2);
    const serialized = JSON.parse(JSON.stringify(resolved.state));
    expect(serialized.players[0].character.salvage).toBe(1);
    expect(serialized.pendingEffect).toBeNull();
    const replay = reduceGameState(serialized, {
      type: "RESOLUTION_APPLIED",
      seatId: resolved.seatId,
      effect: { type: "lose_salvage", amount: 1 },
      sourceCardId: "ash-rat-skitter",
      success: false,
      createdAt: "later"
    });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.salvage).toBe(1);
  });
});
