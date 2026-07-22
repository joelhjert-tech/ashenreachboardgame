import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { applyPhaseOneQaFixture } from "../phaseOneQaFixture.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import type { MatchProgressPresentation, PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";

function createState(mode: "co-op" | "rivalry" = "co-op") {
  const state = createInitialSessionState("P14-QA", "multiplayer", "scenario_broken_seal", mode, "standard", 2);
  state.status = "active";
  state.seats[0]!.displayName = "Joel";
  state.seats[1]!.displayName = "Mira";
  state.seats.forEach((seat) => { seat.connected = true; });
  return state;
}

function tvProgress(state: ReturnType<typeof createState>): MatchProgressPresentation {
  return (createTvProjection(state) as unknown as PublicPatchPayload).matchProgress!;
}

describe("P14 progression and endgame projection", () => {
  it("projects canonical progress, pressure, and threshold warnings", () => {
    const state = createState();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "critical" });

    const projection = tvProgress(state);
    expect(projection.winProgress).toMatchObject({ current: 1, required: 2 });
    expect(projection.lossPressure).toMatchObject({ current: 5, required: 6 });
    expect(projection.thresholdWarning).toMatchObject({
      level: "critical",
      target: "loss",
      remaining: 1
    });
    expect(projection.stage).toBe("threshold_warning");
  });

  it("projects public-safe progress and pressure causes once by stable identity", () => {
    const progressState = createState();
    applyPhaseOneQaFixture(progressState, "seat-1", { kind: "progression-endgame", stage: "progress-gain" });
    expect(tvProgress(progressState).winProgress).toMatchObject({
      change: 1,
      changeReason: "A severed relay node was restored. Victory Progress advanced by 1."
    });
    expect(tvProgress(progressState).winProgress?.changeId).toMatch(/^scenario-progress:/);

    const pressureState = createState();
    applyPhaseOneQaFixture(pressureState, "seat-1", { kind: "progression-endgame", stage: "pressure-gain" });
    expect(tvProgress(pressureState).lossPressure).toMatchObject({
      change: 1,
      changeReason: "Global Escalation +1: The Ash Tide advanced."
    });
    expect(tvProgress(pressureState).lossPressure?.changeId).toMatch(/^escalation:/);
  });

  it("uses confrontation state as the sole final-stage trigger", () => {
    const state = createState();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "final-stage" });

    const projection = tvProgress(state);
    expect(projection.stage).toBe("final_stage");
    expect(projection.finalStage).toMatchObject({
      title: "Reseal the Prison",
      locationName: "Cinder Gate"
    });
    expect(projection.publicResult).toBeNull();
  });

  it("does not carry a prior fixture scenario or change announcement into later stable states", () => {
    const state = createState();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "long-mission" });
    expect(state.activeScenarioId).toBe("scenario_broken_concordance");
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "progress-gain" });
    expect(tvProgress(state).winProgress?.changeId).toMatch(/^scenario-progress:/);
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "critical" });
    expect(state.activeScenarioId).toBe("scenario_broken_seal");
    expect(tvProgress(state).winProgress?.changeId).toBeNull();
    expect(tvProgress(state).lossPressure?.changeId).toBeNull();
  });

  it.each([
    ["coop-victory", "victory", "Joel"],
    ["coop-defeat", "defeat", null]
  ] as const)("projects the authoritative %s result without client winner inference", (stage, outcome, winner) => {
    const state = createState();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage });

    const projection = tvProgress(state);
    expect(projection.stage).toBe(outcome);
    expect(projection.publicResult?.outcome).toBe(outcome);
    expect(projection.publicResult?.winningDisplayNames).toEqual(winner ? [winner] : []);
    expect(projection.publicResult?.reason).toBe(state.lastOutcomeSummary?.summary);
    expect(projection.allowedCommands).toEqual(["return_to_lobby", "leave_room"]);
    expect(JSON.stringify(projection)).not.toMatch(/seat-[0-9]|victoryConditionId|sourceId/);
  });

  it("restores an identical concluded result on reconnect without recalculation", () => {
    const state = createState();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "reconnect-victory" });

    const firstTv = tvProgress(state);
    const restoredTv = tvProgress(state);
    const phone = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;

    expect(restoredTv).toEqual(firstTv);
    expect(phone.matchProgress).toEqual(firstTv);
    expect(phone.requiredAction).toMatchObject({ kind: "result", transitionStage: "game-over" });
  });

  it("does not place owner-private Agenda conclusions in the public projection", () => {
    const state = createState("rivalry");
    applyPhaseOneQaFixture(state, "seat-1", { kind: "progression-endgame", stage: "rivalry-result" });

    const tv = createTvProjection(state) as PublicPatchPayload & Record<string, unknown>;
    const phone = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;

    expect("ownerPrivateResult" in tv).toBe(false);
    expect(JSON.stringify(tv.matchProgress)).not.toMatch(/agenda|target|pointsAwarded/i);
    if (phone.ownerPrivateResult) {
      expect(phone.ownerPrivateResult.id).toMatch(/^private-result:/);
      expect(phone.ownerPrivateResult.id).not.toContain("seat-1");
    }
  });
});
