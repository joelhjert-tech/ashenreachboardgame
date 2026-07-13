import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { effectSchema, type EncounterEffect } from "../../schema/card.schema.js";
import { sessionSnapshotSchema } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";
import { reduceGameState } from "../reducer.js";

const threats = loadThreatCards();
const gateCandidate = threats.get("gate-tax-collectors");
const peddlersCandidate = threats.get("rust-choir-peddlers");
if (!gateCandidate || gateCandidate.cardType !== "enemy") throw new Error("Missing Gate Tax Collectors enemy");
if (!peddlersCandidate || peddlersCandidate.cardType !== "enemy") throw new Error("Missing Rust Choir Peddlers enemy");
const gate = gateCandidate;
const peddlers = peddlersCandidate;

function paymentState(salvage: number, effect: EncounterEffect = gate.woundOnLoss) {
  const state = createInitialSessionState(`phase-1i-${salvage}`, "single-player");
  const seatId = state.players[0]!.seatId;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = gate;
  state.pendingEffect = effect;
  state.players[0]!.character.salvage = salvage;
  state.activeResolution = { id: `gate-loss-${salvage}`, playerId: seatId, source: "threat", stage: "roll_result", roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: 5, success: false } };
  state.lastOutcomeSummary = { seatId, movedToSectorId: state.players[0]!.sectorId, encounterCardId: gate.id, encounterTitle: gate.title, encounterCardType: "enemy", checkStat: "command", die1: 1, die2: 1, statBonus: 0, checkTotal: 2, difficulty: 5, success: false, summary: "Gate-Tax Collectors defeated the operative." };
  return state;
}

function openPayment(salvage: number, effect?: EncounterEffect) {
  const state = paymentState(salvage, effect);
  return reduceGameState(state, { type: "RESOLUTION_APPLIED", seatId: state.players[0]!.seatId, effect: state.pendingEffect!, sourceCardId: gate.id, success: false, createdAt: "now" });
}

describe("Phase 1I encounter payments", () => {
  it("validates bounded required and optional payments", () => {
    expect(effectSchema.safeParse(gate.woundOnLoss).success).toBe(true);
    const optional = { type: "encounter_payment", decisionKey: "offer", mode: "optional", prompt: "Pay?", salvageCost: 1, paidOptionId: "pay", paidLabel: "Pay 1 Salvage", paidEffect: { type: "heal_wound", amount: 1 }, declineOptionId: "decline", declineLabel: "Decline", declineEffect: { type: "none" }, unavailableEffect: { type: "none" } };
    expect(effectSchema.safeParse(optional).success).toBe(true);
    for (const salvageCost of [undefined, 0, -1, 1.5]) expect(effectSchema.safeParse({ ...optional, salvageCost }).success).toBe(false);
    expect(effectSchema.safeParse({ ...optional, declineOptionId: undefined, declineLabel: undefined, declineEffect: undefined }).success).toBe(false);
    expect(effectSchema.safeParse({ ...optional, declineOptionId: "pay" }).success).toBe(false);
    expect(effectSchema.safeParse({ ...optional, paidEffect: { type: "sequence", effects: [] } }).success).toBe(false);
    expect(effectSchema.safeParse({ type: "lose_salvage", amount: 1 }).success).toBe(true);
  });

  it("opens a stable owner-scoped required decision without deducting", () => {
    const opened = openPayment(2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.state.players[0]!.character.salvage).toBe(2);
    expect(opened.state.pendingEncounterDecision).toMatchObject({ seatId: "seat-1", sourceCardId: gate.id, mode: "required", salvageCost: 1, legalOptionIds: ["pay-levy"] });
    expect(opened.state.pendingEffect).toBeNull();
    expect(opened.state.pendingEncounterDecision?.decisionId).toBe("gate-loss-2:collectors-levy");
  });

  it.each([1, 3])("deducts exactly one from %i and resolves once", (startingSalvage) => {
    const opened = openPayment(startingSalvage);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingEncounterDecision!;
    const paid = reduceGameState(opened.state, { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "later" });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.state.players[0]!.character.salvage).toBe(startingSalvage - 1);
    expect(paid.state.pendingEncounterDecision).toBeNull();
    expect(paid.state.resolvedEncounterDecisionIds).toContain(pending.decisionId);
    expect(paid.state.currentEncounter?.id).toBe(gate.id);
    const duplicate = reduceGameState(paid.state, { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "again" });
    expect(duplicate.ok).toBe(false);
  });

  it("resolves the unaffordable required outcome without debt or a prompt", () => {
    const result = openPayment(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.salvage).toBe(0);
    expect(result.state.pendingEncounterDecision).toBeNull();
    expect(result.state.currentEncounter?.id).toBe(gate.id);
    expect(result.state.activeResolution?.outcome?.text).toMatch(/No debt was created/);
  });

  it("rejects wrong seat, stale version, invalid option, and continuation bypass", () => {
    const opened = openPayment(2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingEncounterDecision!;
    for (const action of [
      { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-2", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId, createdAt: "x" },
      { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion + 1, optionId: pending.paidOptionId, createdAt: "x" },
      { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: "forged", createdAt: "x" },
      { type: "CONTINUE_RESOLUTION", seatId: "seat-1", createdAt: "x" }
    ] as const) expect(reduceGameState(opened.state, action).ok).toBe(false);
    expect(opened.state.players[0]!.character.salvage).toBe(2);
  });

  it("supports a free optional decline without production content", () => {
    const optional: EncounterEffect = { type: "encounter_payment", decisionKey: "synthetic-offer", mode: "optional", prompt: "Synthetic offer", salvageCost: 1, paidOptionId: "pay", paidLabel: "Pay", paidEffect: { type: "heal_wound", amount: 1 }, declineOptionId: "decline", declineLabel: "Decline", declineEffect: { type: "none", summary: "Declined." }, unavailableEffect: { type: "none", summary: "Unavailable." } };
    const opened = openPayment(2, optional);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingEncounterDecision!;
    const declined = reduceGameState(opened.state, { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: "decline", createdAt: "later" });
    expect(declined.ok).toBe(true);
    if (declined.ok) expect(declined.state.players[0]!.character.salvage).toBe(2);
  });

  it("projects actions only to the owner and a non-actionable TV wait", () => {
    const opened = openPayment(2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const owner = createPhoneProjection(opened.state, "seat-1") as unknown as PhonePatchPayload;
    const other = createPhoneProjection(opened.state, "seat-2") as unknown as PhonePatchPayload;
    const tv = createTvProjection(opened.state) as unknown as PublicPatchPayload;
    expect(owner.pendingEncounterDecisionPrivate).toMatchObject({ salvageCost: 1, currentSalvage: 2, options: [{ optionId: "pay-levy", enabled: true }] });
    expect(other.pendingEncounterDecisionPrivate).toBeNull();
    expect(tv.pendingEncounterDecision).toMatchObject({ sourceCardId: gate.id, status: "waiting" });
    expect(JSON.stringify(tv)).not.toContain(opened.state.pendingEncounterDecision?.decisionId);
  });

  it("round-trips pending state and resolves through the authenticated server intent once", () => {
    const opened = openPayment(2);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 1, sessionId: opened.state.sessionId, sequence: opened.state.sequence, state: opened.state }).success).toBe(true);
    const server = new GameRoomServer(opened.state);
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"] };
    const pending = server.getState().pendingEncounterDecision!;
    server.handleIntent(client, { type: "ENCOUNTER_DECISION_REQUESTED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId });
    expect(server.getState().players[0]!.character.salvage).toBe(1);
    server.handleIntent(client, { type: "ENCOUNTER_DECISION_REQUESTED", seatId: "seat-1", decisionId: pending.decisionId, decisionVersion: pending.decisionVersion, optionId: pending.paidOptionId });
    expect(server.getState().players[0]!.character.salvage).toBe(1);
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);
  });

  it("migrates only Gate Tax and keeps Rust Choir Peddlers blocked", () => {
    expect(JSON.stringify(gate.woundOnLoss)).toContain("encounter_payment");
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(gate.id)).toBe(false);
    expect(JSON.stringify(peddlers)).toContain("gain_heat");
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(peddlers.id)).toBe(true);
    expect(validateLegacyHeatContentRecord("gate.json", gate)).toEqual([]);
  });
});
