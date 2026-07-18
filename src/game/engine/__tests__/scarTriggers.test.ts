import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { loadScarCards } from "../../content/scars.js";
import { loadGear } from "../../content/gear.js";
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

  it("Scar-Sink Prayer suppresses one typed effect, spends one exact-instance charge, and advances the queue", () => {
    const state = stateWithScars(["scar-wound-2", "scar-wound-4"]);
    const seatId = state.players[0]!.seatId;
    const definition = loadGear().get("heat-sink-prayer")!;
    state.players[0]!.character.heldGear.push({ ...definition, instanceId: "prayer-a", currentCharges: 2 });
    state.players[0]!.character.heldGear.push({ ...definition, instanceId: "prayer-copy", currentCharges: 2 });
    state.players[0]!.character.equippedGear.utility = "heat-sink-prayer";
    const triggered = reduceGameState(state, { type: "SCAR_TRIGGER_EVENT", seatId, createdAt: "now", sourceEvent: { id: "prayer-source", type: "beforeTest", seatId, stat: "signal" } });
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const pending = triggered.state.pendingScarConsequence!;
    const nextReactionId = triggered.state.pendingScarConsequenceQueue![0]!.reactionId;
    const effectId = pending.pendingEffects[0]!.effectId;
    const used = reduceGameState(triggered.state, {
      type: "USE_GEAR", seatId, gearId: "heat-sink-prayer", effect: null,
      summary: "Scar-Sink Prayer — One Scar consequence suppressed.", chargeInstanceId: "prayer-a",
      scarConsequenceReactionId: pending.reactionId, scarInstanceId: pending.scarInstanceId,
      pendingScarEffectId: effectId, createdAt: "later"
    });
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    expect(used.state.players[0]!.character.heldGear.find((item) => item.instanceId === "prayer-a")?.currentCharges).toBe(1);
    expect(used.state.players[0]!.character.heldGear.find((item) => item.instanceId === "prayer-copy")?.currentCharges).toBe(2);
    expect(used.state.pendingScarConsequence?.reactionId).toBe(nextReactionId);
    expect(used.state.players[0]!.character.scars).toEqual(["scar-wound-2", "scar-wound-4"]);
    const tv = createTvProjection(used.state);
    expect(JSON.stringify(tv)).toContain("One Scar consequence suppressed");
    expect(JSON.stringify(tv)).not.toContain("pendingScarEffectId");
    expect(reduceGameState(used.state, {
      type: "USE_GEAR", seatId, gearId: "heat-sink-prayer", effect: null, summary: "duplicate",
      chargeInstanceId: "prayer-a", scarConsequenceReactionId: pending.reactionId,
      scarInstanceId: pending.scarInstanceId, pendingScarEffectId: effectId, createdAt: "again"
    }).ok).toBe(false);
  });

  it("rejects wrong-seat, wrong-Scar, and depleted Prayer requests without spending", () => {
    const state = stateWithScars(["scar-wound-2"]);
    const seatId = state.players[0]!.seatId;
    const definition = loadGear().get("heat-sink-prayer")!;
    state.players[0]!.character.heldGear.push({ ...definition, instanceId: "prayer-empty", currentCharges: 0, charges: 0 });
    state.players[0]!.character.equippedGear.utility = "heat-sink-prayer";
    const triggered = reduceGameState(state, { type: "SCAR_TRIGGER_EVENT", seatId, createdAt: "now", sourceEvent: { id: "reject-source", type: "beforeTest", seatId, stat: "signal" } });
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const pending = triggered.state.pendingScarConsequence!;
    const base = { type: "USE_GEAR" as const, gearId: "heat-sink-prayer", effect: null, summary: "used", chargeInstanceId: "prayer-empty",
      scarConsequenceReactionId: pending.reactionId, scarInstanceId: pending.scarInstanceId, pendingScarEffectId: pending.pendingEffects[0]!.effectId, createdAt: "later" };
    expect(reduceGameState(triggered.state, { ...base, seatId: "seat-2" }).ok).toBe(false);
    expect(reduceGameState(triggered.state, { ...base, seatId, scarInstanceId: "wrong-scar" }).ok).toBe(false);
    expect(reduceGameState(triggered.state, { ...base, seatId }).ok).toBe(false);
    expect(triggered.state.players[0]!.character.heldGear.find((item) => item.instanceId === "prayer-empty")?.currentCharges).toBe(0);
  });

  it("Scar-Sink Prayer suppresses only the selected effect from a composite pending queue", () => {
    const state = stateWithScars(["scar-wound-2"]);
    const seatId = state.players[0]!.seatId;
    const definition = loadGear().get("heat-sink-prayer")!;
    state.players[0]!.character.heldGear.push({ ...definition, instanceId: "prayer-b", currentCharges: 1 });
    state.players[0]!.character.equippedGear.utility = "heat-sink-prayer";
    state.pendingScarConsequence = {
      reactionId: "scar-reaction", seatId, scarInstanceId: `${seatId}:scar-wound-2:0`, scarCardId: "scar-wound-2",
      scarTitle: "Static Burn", triggerType: "beforeTest", sourceEventId: "source", createdAt: "now", status: "pending",
      pendingEffects: [
        { effectId: "ignore-me", effect: { type: "gain_note", text: "ignored" } },
        { effectId: "keep-me", effect: { type: "gain_note", text: "kept" } }
      ]
    };
    const used = reduceGameState(state, {
      type: "USE_GEAR", seatId, gearId: "heat-sink-prayer", effect: null, summary: "used",
      chargeInstanceId: "prayer-b", scarConsequenceReactionId: "scar-reaction",
      scarInstanceId: `${seatId}:scar-wound-2:0`, pendingScarEffectId: "ignore-me", createdAt: "later"
    });
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    expect(used.state.players[0]!.private.notes).toContain("kept");
    expect(used.state.players[0]!.private.notes).not.toContain("ignored");
    expect(used.state.pendingScarConsequence).toBeNull();
  });
});
