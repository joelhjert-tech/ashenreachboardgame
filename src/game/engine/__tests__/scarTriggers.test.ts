import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { loadScarCards } from "../../content/scars.js";
import { gameStateSchema } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";
import { SCAR_TRIGGER_DEFINITIONS, validateScarTriggerCatalog } from "../../rules/scarTriggers.js";

function stateWithScars(scars: string[]) {
  const state = createInitialSessionState("scar-trigger-test", "single-player");
  state.status = "active";
  state.players[0]!.character.scars = scars;
  return state;
}

describe("authoritative Scar trigger lifecycle", () => {
  it("classifies every authored Scar and records blocked cards explicitly", () => {
    const cards = loadScarCards();
    expect(validateScarTriggerCatalog(cards)).toEqual([]);
    expect(SCAR_TRIGGER_DEFINITIONS).toHaveLength(cards.size);
    expect(SCAR_TRIGGER_DEFINITIONS.filter((entry) => entry.engineSupport === "blocked").every((entry) => Boolean(entry.blockedReason))).toBe(true);
  });

  it("resolves an immediate trigger exactly once", () => {
    const state = stateWithScars(["scar-wound-1"]);
    const action = { type: "SCAR_TRIGGER_EVENT" as const, seatId: state.players[0]!.seatId, createdAt: "2026-07-12T00:00:00.000Z", sourceEvent: { id: "test-1", type: "afterTest" as const, seatId: state.players[0]!.seatId, stat: "grit" as const, success: false } };
    const result = reduceGameState(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.private.notes).toContain("Ash-Lanced scar recorded the source of the failed grit test.");
    expect(result.state.pendingScarConsequence).toBeNull();
    expect(reduceGameState(result.state, action).ok).toBe(false);
  });

  it("opens a reconnectable pending consequence and Continue resolves it once", () => {
    const state = stateWithScars(["scar-wound-2"]);
    const seatId = state.players[0]!.seatId;
    const triggered = reduceGameState(state, { type: "SCAR_TRIGGER_EVENT", seatId, createdAt: "2026-07-12T00:00:00.000Z", sourceEvent: { id: "test-2", type: "beforeTest", seatId, stat: "signal" } });
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const parsed = gameStateSchema.parse(JSON.parse(JSON.stringify(triggered.state)));
    expect(parsed.pendingScarConsequence?.sourceEventId).toBe("test-2");
    const reactionId = parsed.pendingScarConsequence!.reactionId;
    expect(reduceGameState(parsed, { type: "CONTINUE_SCAR_CONSEQUENCE", seatId: "seat-2", reactionId, createdAt: "later" }).ok).toBe(false);
    expect(reduceGameState(parsed, { type: "CONTINUE_SCAR_CONSEQUENCE", seatId, reactionId: "stale", createdAt: "later" }).ok).toBe(false);
    const continued = reduceGameState(parsed, { type: "CONTINUE_SCAR_CONSEQUENCE", seatId, reactionId, createdAt: "later" });
    expect(continued.ok).toBe(true);
    if (!continued.ok) return;
    expect(continued.state.pendingScarConsequence).toBeNull();
    expect(continued.state.players[0]!.private.notes).toContain("Static Burn broadcast a warning through the operative.");
    expect(reduceGameState(continued.state, { type: "CONTINUE_SCAR_CONSEQUENCE", seatId, reactionId, createdAt: "again" }).ok).toBe(false);
  });

  it("queues multiple Scars in stable instance order without overwriting", () => {
    const state = stateWithScars(["scar-wound-8", "scar-wound-4", "scar-wound-2"]);
    const seatId = state.players[0]!.seatId;
    const result = reduceGameState(state, { type: "SCAR_TRIGGER_EVENT", seatId, createdAt: "now", sourceEvent: { id: "test-3", type: "beforeTest", seatId, stat: "guile" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ordered = [result.state.pendingScarConsequence, ...(result.state.pendingScarConsequenceQueue ?? [])].map((entry) => entry?.scarInstanceId);
    expect(ordered).toEqual([...ordered].sort());
    expect(new Set(ordered).size).toBe(3);
  });

  it("keeps private consequence choices off TV while exposing them to the owner phone", () => {
    const state = stateWithScars(["scar-wound-2"]);
    const seatId = state.players[0]!.seatId;
    const result = reduceGameState(state, { type: "SCAR_TRIGGER_EVENT", seatId, createdAt: "now", sourceEvent: { id: "test-4", type: "beforeTest", seatId, stat: "signal" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const phone = createPhoneProjection(result.state, seatId);
    const tv = createTvProjection(result.state);
    expect(phone.pendingScarConsequence).toMatchObject({ scarTitle: "Static Burn", sourceEventId: "test-4" });
    expect(tv.scarTriggerStatus).toEqual({ seatId, scarTitle: "Static Burn", status: "waiting" });
    expect(JSON.stringify(tv)).not.toContain("pendingEffects");
  });

  it("loads legacy state without pending Scar fields and preserves wound-threshold acquisition", () => {
    const state = stateWithScars([]);
    delete state.pendingScarConsequence;
    delete state.pendingScarConsequenceQueue;
    delete state.resolvedScarSourceEventIds;
    expect(gameStateSchema.parse(state)).toBeTruthy();
    const seatId = state.players[0]!.seatId;
    const recalled = reduceGameState(state, { type: "WOUND_THRESHOLD_REACHED", seatId, threshold: state.woundThreshold, newWoundTotal: state.woundThreshold, scar: "scar-wound-1", createdAt: "now" });
    expect(recalled.ok).toBe(true);
    if (recalled.ok) expect(recalled.state.players[0]!.character.scars).toEqual(["scar-wound-1"]);
  });
});
