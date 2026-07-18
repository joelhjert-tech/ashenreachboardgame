import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { enemyThreatCardSchema, type EncounterEffect } from "../../schema/card.schema.js";
import { sessionSnapshotSchema } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../../../server/roomServer.js";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS } from "../../../../scripts/legacy-heat-validation.js";
import { reduceGameState } from "../reducer.js";

const candidate = loadThreatCards().get("rust-choir-peddlers");
if (!candidate || candidate.cardType !== "enemy") throw new Error("Missing Rust Choir Peddlers enemy");
const peddlers = candidate;
const note = "You kept the peddlers talking long enough to steal the real price list.";

function victoryState(salvage: number, wounds: number) {
  const state = createInitialSessionState(`phase-1u-${salvage}-${wounds}`, "single-player");
  const seatId = state.players[0]!.seatId;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = peddlers;
  state.pendingEffect = peddlers.defeatReward;
  state.players[0]!.character.salvage = salvage;
  state.players[0]!.character.wounds = wounds;
  state.activeResolution = {
    id: `rust-victory-${salvage}-${wounds}`,
    playerId: seatId,
    source: "threat",
    stage: "roll_result",
    roll: { dice: [6, 6], baseTotal: 12, modifierTotal: 0, finalTotal: 12, target: 5, success: true }
  };
  state.lastOutcomeSummary = {
    seatId,
    movedToSectorId: state.players[0]!.sectorId,
    encounterCardId: peddlers.id,
    encounterTitle: peddlers.title,
    encounterCardType: "enemy",
    checkStat: "guile",
    die1: 6,
    die2: 6,
    statBonus: 0,
    checkTotal: 12,
    difficulty: 5,
    success: true,
    summary: "Rust Choir Peddlers were defeated."
  };
  return state;
}

function applyVictory(salvage: number, wounds: number) {
  const state = victoryState(salvage, wounds);
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: state.pendingEffect!,
    sourceCardId: peddlers.id,
    success: true,
    createdAt: "2026-07-13T10:00:00.000Z"
  });
}

function resolve(opened: Extract<ReturnType<typeof applyVictory>, { ok: true }>, optionId: string) {
  const pending = opened.state.pendingEncounterDecision!;
  return reduceGameState(opened.state, {
    type: "ENCOUNTER_DECISION_RESOLVED",
    seatId: pending.seatId,
    decisionId: pending.decisionId,
    decisionVersion: pending.decisionVersion,
    optionId,
    createdAt: "2026-07-13T10:01:00.000Z"
  });
}

describe("Phase 1U Rust Choir Peddlers recovery", () => {
  it("preserves severity 2, removes the loss Heat clause, and authors note then optional recovery", () => {
    expect(peddlers.severity).toBe(2);
    expect(peddlers.woundOnLoss).toBeUndefined();
    expect(peddlers.defeatReward).toEqual({
      type: "sequence",
      effects: [
        { type: "gain_note", text: note },
        expect.objectContaining({
          type: "encounter_payment",
          mode: "optional",
          salvageCost: 1,
          paidLabel: "Pay 1 Salvage to heal 1 Wound",
          paidEffect: { type: "heal_wound", amount: 1 },
          declineLabel: "Decline",
          declineEffect: expect.objectContaining({ type: "none" })
        })
      ]
    });
    expect(JSON.stringify(peddlers)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(peddlers.id)).toBe(false);
  });

  it("permits only Rust Choir to omit an authored enemy loss effect", () => {
    expect(enemyThreatCardSchema.safeParse(peddlers).success).toBe(true);
    expect(enemyThreatCardSchema.safeParse({ ...peddlers, id: "unapproved-empty-loss" }).success).toBe(false);
  });

  it("leaves combat-loss resources unchanged and opens no recovery decision", () => {
    const state = victoryState(3, 2);
    state.pendingEffect = { type: "sequence", effects: [] };
    state.activeResolution = { ...state.activeResolution!, id: "rust-loss", roll: { ...state.activeResolution!.roll!, success: false } };
    const result = reduceGameState(state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: state.pendingEffect,
      sourceCardId: peddlers.id,
      success: false,
      createdAt: "now"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character).toMatchObject({ salvage: 3, wounds: 2 });
    expect(result.state.pendingEncounterDecision).toBeNull();
    expect(result.state.players[0]!.private.notes).toEqual([]);
  });

  it.each([[1, 1], [4, 3]] as const)("grants the note before opening recovery at %i Salvage and %i Wounds", (salvage, wounds) => {
    const opened = applyVictory(salvage, wounds);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.state.players[0]!.private.notes).toEqual([note]);
    expect(opened.state.players[0]!.character).toMatchObject({ salvage, wounds });
    expect(opened.state.pendingEffect).toBeNull();
    expect(opened.state.pendingEncounterDecision).toMatchObject({
      sourceCardId: peddlers.id,
      sourceBranch: "defeatReward",
      mode: "optional",
      salvageCost: 1,
      legalOptionIds: ["pay-to-heal", "decline"]
    });
    expect(opened.state.activeResolution?.outcome?.effects[0]).toContain("note added");
    expect(opened.state.activeResolution?.outcome?.effects[1]).toBe("Pay 1 Salvage to heal 1 Wound?");
  });

  it.each([[1, 1, 0, 0], [4, 3, 3, 2]] as const)("pays and heals atomically from %i Salvage and %i Wounds", (salvage, wounds, expectedSalvage, expectedWounds) => {
    const opened = applyVictory(salvage, wounds);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const paid = resolve(opened, "pay-to-heal");
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.state.players[0]!.character).toMatchObject({ salvage: expectedSalvage, wounds: expectedWounds });
    expect(paid.state.players[0]!.private.notes).toEqual([note]);
    expect(paid.state.pendingEncounterDecision).toBeNull();
    expect(paid.state.activeResolution?.outcome?.text).toBe("Paid 1 Salvage. Healed 1 Wound.");
    expect(paid.state.activeResolution?.outcome?.effects).toEqual(["Paid 1 Salvage.", "Healed 1 Wound."]);
    expect(createTvProjection(paid.state).publicResultDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "salvage", value: 1, sign: "loss" }),
      expect.objectContaining({ type: "wound", value: 1, sign: "loss" })
    ]));
    const pending = opened.state.pendingEncounterDecision!;
    expect(reduceGameState(paid.state, { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "again" }).ok).toBe(false);
  });

  it("declines for free while retaining the previously granted note", () => {
    const opened = applyVictory(2, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const declined = resolve(opened, "decline");
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.state.players[0]!.character).toMatchObject({ salvage: 2, wounds: 2 });
    expect(declined.state.players[0]!.private.notes).toEqual([note]);
    expect(declined.state.activeResolution?.outcome?.text).toBe("Declined the recovery offer.");
  });

  it.each([[0, 2], [2, 0], [0, 0]] as const)("skips a meaningless offer at %i Salvage and %i Wounds", (salvage, wounds) => {
    const result = applyVictory(salvage, wounds);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.private.notes).toEqual([note]);
    expect(result.state.players[0]!.character).toMatchObject({ salvage, wounds });
    expect(result.state.pendingEncounterDecision).toBeNull();
    expect(result.state.resolvedEncounterDecisionIds).toContain(`rust-victory-${salvage}-${wounds}:rust-choir-recovery`);
  });

  it("round-trips and reprojects the pending owner decision without replaying the note", () => {
    const opened = applyVictory(2, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const snapshot = { saveVersion: 2, sessionId: opened.state.sessionId, sequence: opened.state.sequence, state: opened.state };
    expect(sessionSnapshotSchema.safeParse(snapshot).success).toBe(true);
    const restored = structuredClone(opened.state);
    const server = new GameRoomServer(restored);
    expect(server.getState().players[0]!.private.notes).toEqual([note]);
    expect(server.getState().pendingEncounterDecision).toEqual(opened.state.pendingEncounterDecision);
    expect(createPhoneProjection(server.getState(), "seat-1").pendingEncounterDecisionPrivate).toMatchObject({ currentSalvage: 2, options: expect.arrayContaining([expect.objectContaining({ label: "Pay 1 Salvage to heal 1 Wound" }), expect.objectContaining({ label: "Decline" })]) });
    expect(createPhoneProjection(server.getState(), "seat-2").pendingEncounterDecisionPrivate).toBeNull();
    expect(createTvProjection(server.getState()).pendingEncounterDecision).toMatchObject({ sourceCardId: peddlers.id, status: "waiting" });
    expect(createTvProjection(server.getState()).publicResultDeltas).not.toContainEqual(expect.objectContaining({ type: "wound" }));
    expect(JSON.stringify(createTvProjection(server.getState()).pendingEncounterDecision)).not.toMatch(/\bHeat\b|\bRisk\b/i);
  });

  it("resumes authenticated victory cleanup exactly once after payment", () => {
    const opened = applyVictory(2, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const server = new GameRoomServer(structuredClone(opened.state));
    const pending = server.getState().pendingEncounterDecision!;
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = {
      seatId: "seat-1",
      view: "phone",
      socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"]
    };
    server.handleIntent(client, { type: "ENCOUNTER_DECISION_REQUESTED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId });
    expect(server.getState().players[0]!.private.notes).toEqual([note]);
    expect(server.getState().players[0]!.character).toMatchObject({ salvage: 1, wounds: 1 });
    expect(server.getState().currentEncounter?.id).toBe(peddlers.id);
    server.handleIntent(client, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    expect(server.getState().currentEncounter).toBeNull();
    expect(server.getState().resolvedEncounterDecisionIds).toEqual([pending.decisionId]);
    server.handleIntent(client, { type: "ENCOUNTER_DECISION_REQUESTED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId });
    expect(server.getState().players[0]!.private.notes).toEqual([note]);
    expect(server.getState().players[0]!.character).toMatchObject({ salvage: 1, wounds: 1 });
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);
  });

  it("rejects stale, wrong-seat, and replayed decisions without changing resources", () => {
    const opened = applyVictory(2, 2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingEncounterDecision!;
    for (const action of [
      { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-2", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "x" },
      { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion + 1, optionId: pending.paidOptionId, createdAt: "x" }
    ] as const) expect(reduceGameState(opened.state, action).ok).toBe(false);
    const paid = resolve(opened, pending.paidOptionId);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(reduceGameState(paid.state, { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "again" }).ok).toBe(false);
    expect(paid.state.players[0]!.character).toMatchObject({ salvage: 1, wounds: 1 });
    expect(paid.state.players[0]!.private.notes).toEqual([note]);
  });
});
