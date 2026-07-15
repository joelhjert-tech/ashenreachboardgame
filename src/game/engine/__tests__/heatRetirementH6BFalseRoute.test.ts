import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { reduceGameState } from "../reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { effectSchema } from "../../schema/card.schema.js";
import { sessionSnapshotSchema } from "../../schema/session.schema.js";
import { getOwnerSelectedForcedDisplacementCandidates, getRingTrackNeighbor } from "../../rules/movementPlanner.js";
import { canRiftAnchorSpikeSuppress } from "../../rules/forcedDisplacement.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import { loadGear } from "../../content/gear.js";

const candidate = loadThreatCards().get("false-route-procession");
if (!candidate || candidate.cardType !== "hazard") throw new Error("Missing False-Route Procession");
const card = candidate;

function failureState(origin = "middle_red_march_outpost") {
  const state = createInitialSessionState("h6b-false-route", "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  state.activeResolution = {
    id: "false-route-procession-failure",
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: origin,
    encounterCardId: card.id,
    encounterTitle: card.title,
    encounterCardType: "hazard",
    checkStat: card.stat,
    die1: 1,
    die2: 1,
    statBonus: 0,
    checkTotal: 2,
    difficulty: card.difficulty,
    success: false,
    summary: "False-Route Procession check failed."
  };
  player.sectorId = origin;
  player.character.currentSpaceId = origin;
  return state;
}

function openChoice(state = failureState()) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: state.pendingEffect!,
    sourceCardId: card.id,
    success: false,
    createdAt: "open"
  });
}

function selectFirst(state = failureState()) {
  const opened = openChoice(state);
  if (!opened.ok) throw new Error(opened.rejection.reason);
  const choice = opened.state.pendingForcedDestinationChoice!;
  const selected = reduceGameState(opened.state, {
    type: "FORCED_DESTINATION_SELECTED",
    seatId: choice.ownerSeatId,
    choiceId: choice.choiceId,
    destinationSectorId: choice.candidates[0]!.sectorId,
    createdAt: "select"
  });
  return { opened, selected, choice };
}

describe("Heat retirement H6B: false-route-procession", () => {
  it("preserves card identity and installs only the approved typed rule", () => {
    expect(card).toMatchObject({
      id: "false-route-procession",
      title: "False-Route Procession",
      cardType: "hazard",
      threatLane: "yellow",
      stat: "command",
      difficulty: 7,
      severity: 2,
      region: "outer",
      rarity: "common"
    });
    expect(card.text).toBe("If you lose, move 1 sector clockwise or counterclockwise on your current ring. Choose from the legal destinations. If only one is legal, move there. If neither is legal, remain in place.");
    expect(card.failEffect).toEqual({
      type: "ownerSelectedForcedDisplacement",
      sourceCardId: "false-route-procession",
      distance: 1,
      ringPolicy: "sameRing",
      destinationOwner: "affectedSeat",
      noDestinationFallback: "remainInPlace",
      failureStillCounts: true
    });
    expect(effectSchema.safeParse(card.failEffect).success).toBe(true);
    expect(JSON.stringify(card)).not.toMatch(/heat|take_wound|gain_scar/i);
    expect(canRiftAnchorSpikeSuppress("threat", card.id)).toBe(true);
  });

  it.each([
    ["outer", "north-dock-bastion"],
    ["middle", "middle_red_march_outpost"],
    ["inner", "inner_cinder_lattice"]
  ])("generates deterministic clockwise then counterclockwise %s-ring candidates only", (_ring, origin) => {
    const state = failureState(origin);
    const candidates = getOwnerSelectedForcedDisplacementCandidates(state, "seat-1", origin);
    expect(candidates).toEqual([
      { sectorId: getRingTrackNeighbor(origin, 1), direction: "clockwise" },
      { sectorId: getRingTrackNeighbor(origin, -1), direction: "counterclockwise" }
    ]);
    expect(new Set(candidates.map((entry) => entry.sectorId)).size).toBe(candidates.length);
    expect(candidates).not.toContainEqual(expect.objectContaining({ sectorId: origin }));
    expect(candidates.map((entry) => entry.sectorId)).not.toContain("ashen-crown-nexus");
  });

  it("creates one persisted owner choice without moving or opening Rift Anchor early", () => {
    const opened = openChoice();
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.state.pendingForcedDestinationChoice).toMatchObject({
      ownerSeatId: "seat-1",
      sourceId: "false-route-procession",
      sourceSectorId: "middle_red_march_outpost",
      ring: "middle",
      distance: 1,
      ringPolicy: "sameRing",
      destinationOwner: "affectedSeat",
      status: "awaitingChoice"
    });
    expect(opened.state.pendingForcedDestinationChoice?.candidates).toHaveLength(2);
    expect(opened.state.pendingDisplacement).toBeNull();
    expect(opened.state.players[0]!.sectorId).toBe("middle_red_march_outpost");
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: opened.state.sessionId, sequence: opened.state.sequence, state: opened.state }).success).toBe(true);
    expect(reduceGameState(opened.state, { type: "CONTINUE_RESOLUTION", seatId: "seat-1", createdAt: "bypass" }).ok).toBe(false);
  });

  it("keeps the candidate list owner-private while TV reports only the wait", () => {
    const opened = openChoice();
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const owner = createPhoneProjection(opened.state, "seat-1") as unknown as PhonePatchPayload;
    const other = createPhoneProjection(opened.state, "seat-2") as unknown as PhonePatchPayload;
    const tv = createTvProjection(opened.state) as unknown as PublicPatchPayload;
    expect(owner.pendingForcedDestinationChoicePrivate?.candidates).toHaveLength(2);
    expect(other.pendingForcedDestinationChoicePrivate).toBeNull();
    expect(tv.pendingForcedDestinationChoice).toMatchObject({ ownerSeatId: "seat-1", sourceId: "false-route-procession", status: "waiting" });
    expect(JSON.stringify(tv)).not.toContain(opened.state.pendingForcedDestinationChoice?.choiceId);
    for (const destination of opened.state.pendingForcedDestinationChoice!.candidates) {
      expect(JSON.stringify(tv.pendingForcedDestinationChoice)).not.toContain(destination.sectorId);
    }
  });

  it("locks one offered destination and only then opens the existing reaction lifecycle", () => {
    const { selected, choice } = selectFirst();
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.state.pendingForcedDestinationChoice).toBeNull();
    expect(selected.state.pendingDisplacement).toMatchObject({
      sourceId: "false-route-procession",
      sourceEventId: choice.sourceEventId,
      sourceChoiceId: choice.choiceId,
      originSectorId: choice.sourceSectorId,
      destinationSectorId: choice.candidates[0]!.sectorId,
      direction: choice.candidates[0]!.direction,
      distance: 1,
      sameRing: true,
      fallbackEffect: null,
      status: "pending"
    });
    expect(selected.state.players[0]!.sectorId).toBe(choice.sourceSectorId);
    const owner = createPhoneProjection(selected.state, "seat-1") as unknown as PhonePatchPayload;
    expect(owner.pendingForcedDestinationChoicePrivate).toBeNull();
    expect(owner.pendingDisplacementPrivate).toMatchObject({ destinationSectorId: choice.candidates[0]!.sectorId });
  });

  it("rejects wrong-seat, forged, stale, and duplicate choices without mutation", () => {
    const opened = openChoice();
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const choice = opened.state.pendingForcedDestinationChoice!;
    expect(reduceGameState(opened.state, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-2", choiceId: choice.choiceId, destinationSectorId: choice.candidates[0]!.sectorId, createdAt: "wrong" }).ok).toBe(false);
    expect(reduceGameState(opened.state, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: choice.choiceId, destinationSectorId: "ashen-crown-nexus", createdAt: "forged" }).ok).toBe(false);
    expect(reduceGameState(opened.state, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: "stale", destinationSectorId: choice.candidates[0]!.sectorId, createdAt: "stale" }).ok).toBe(false);
    const selected = reduceGameState(opened.state, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: choice.choiceId, destinationSectorId: choice.candidates[0]!.sectorId, createdAt: "once" });
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(reduceGameState(selected.state, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: choice.choiceId, destinationSectorId: choice.candidates[1]!.sectorId, createdAt: "twice" }).ok).toBe(false);
  });

  it("accepts only the authenticated owner's issued destination and rejects socket replay", () => {
    const opened = openChoice();
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const server = new GameRoomServer(opened.state);
    const choice = server.getState().pendingForcedDestinationChoice!;
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = {
      seatId: "seat-1",
      view: "phone",
      socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"]
    };
    const intent = { type: "FORCED_DESTINATION_SELECTED" as const, seatId: "seat-1", choiceId: choice.choiceId, destinationSectorId: choice.candidates[0]!.sectorId };
    server.handleIntent(client, intent);
    expect(server.getState().pendingForcedDestinationChoice).toBeNull();
    expect(server.getState().pendingDisplacement).toMatchObject({ destinationSectorId: choice.candidates[0]!.sectorId });
    server.handleIntent(client, intent);
    expect(server.getState().pendingDisplacement).toMatchObject({ destinationSectorId: choice.candidates[0]!.sectorId });
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);
  });

  it("cancels an altered-source choice with no substitute penalty", () => {
    const opened = openChoice();
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const choice = opened.state.pendingForcedDestinationChoice!;
    const movedState = {
      ...opened.state,
      players: opened.state.players.map((player) => player.seatId === "seat-1" ? {
        ...player,
        sectorId: choice.candidates[0]!.sectorId,
        character: { ...player.character, currentSpaceId: choice.candidates[0]!.sectorId }
      } : player)
    };
    const cancelled = reduceGameState(movedState, { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: choice.choiceId, destinationSectorId: choice.candidates[0]!.sectorId, createdAt: "cancel" });
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.state.pendingForcedDestinationChoice).toBeNull();
    expect(cancelled.state.pendingDisplacement).toBeNull();
    expect(cancelled.state.players[0]!.character.wounds).toBe(0);
    expect(cancelled.state.resolvedDisplacementSourceEventIds).toContain(choice.sourceEventId);
  });

  it("remains in place without a choice, reaction, or fallback when neither direction is legal", () => {
    const state = failureState();
    const origin = state.players[0]!.sectorId;
    state.sectors = state.sectors.map((sector) => sector.id === origin ? { ...sector, neighbors: [] } : sector);
    const opened = openChoice(state);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.state.pendingForcedDestinationChoice).toBeNull();
    expect(opened.state.pendingDisplacement).toBeNull();
    expect(opened.state.players[0]!.sectorId).toBe(origin);
    expect(opened.state.players[0]!.character.wounds).toBe(0);
    expect(opened.state.activeResolution?.outcome?.text).toBe("No false route was available.");
  });

  it("supports one mandatory candidate when only one same-ring direction is legal", () => {
    const state = failureState();
    const origin = state.players[0]!.sectorId;
    const counterclockwise = getRingTrackNeighbor(origin, -1)!;
    state.sectors = state.sectors.map((sector) => sector.id === origin ? { ...sector, neighbors: sector.neighbors.filter((id) => id !== counterclockwise) } : sector);
    const opened = openChoice(state);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.state.pendingForcedDestinationChoice?.candidates).toEqual([{ sectorId: getRingTrackNeighbor(origin, 1), direction: "clockwise" }]);
  });

  it("moves once, schedules one normal forced-arrival pipeline, and preserves voluntary progress state", () => {
    const { selected, choice } = selectFirst();
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    const pending = selected.state.pendingDisplacement!;
    const contractsBefore = structuredClone(selected.state.players[0]!.character.completedContracts);
    const movementBefore = selected.state.movementRolls?.["seat-1"];
    const resolved = reduceGameState(selected.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "resolve" });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.players[0]!.sectorId).toBe(choice.candidates[0]!.sectorId);
    expect(resolved.state.pendingDisplacementArrival).toEqual({ seatId: "seat-1", sectorId: choice.candidates[0]!.sectorId, sourceEventId: choice.sourceEventId });
    expect(resolved.state.players[0]!.character.completedContracts).toEqual(contractsBefore);
    expect(resolved.state.movementRolls?.["seat-1"]).toBe(movementBefore);
    expect((resolved.state.resolvedDisplacementSourceEventIds ?? []).filter((id) => id === choice.sourceEventId)).toHaveLength(1);
    expect(reduceGameState(resolved.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "replay" }).ok).toBe(false);
  });

  it("lets Rift Anchor Spike prevent the selected displacement exactly once with no fallback", () => {
    const { selected, choice } = selectFirst();
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    const pending = selected.state.pendingDisplacement!;
    const definition = loadGear().get("rift-anchor-spike")!;
    const equipped = {
      ...selected.state,
      players: selected.state.players.map((player) => player.seatId === "seat-1" ? {
        ...player,
        character: {
          ...player.character,
          heldGear: [...player.character.heldGear, { ...definition, instanceId: "false-route-spike", currentCharges: 1 }],
          equippedGear: { ...player.character.equippedGear, utility: "rift-anchor-spike" }
        }
      } : player)
    };
    const prevented = reduceGameState(equipped, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "rift-anchor-spike",
      chargeInstanceId: "false-route-spike",
      forcedDisplacementReactionId: pending.reactionId,
      forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null,
      discard: false,
      summary: "Rift Anchor Spike deployed.",
      createdAt: "prevent"
    });
    expect(prevented.ok).toBe(true);
    if (!prevented.ok) return;
    expect(prevented.state.players[0]!.sectorId).toBe(choice.sourceSectorId);
    expect(prevented.state.players[0]!.character.wounds).toBe(0);
    expect(prevented.state.pendingDisplacement).toBeNull();
    expect(prevented.state.pendingDisplacementArrival).toBeNull();
    expect(prevented.state.players[0]!.character.heldGear.find((item) => item.instanceId === "false-route-spike")?.currentCharges).toBe(0);
    expect(reduceGameState(prevented.state, {
      type: "USE_GEAR", seatId: "seat-1", gearId: "rift-anchor-spike", chargeInstanceId: "false-route-spike",
      forcedDisplacementReactionId: pending.reactionId, forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null, discard: false, summary: "replay", createdAt: "replay"
    }).ok).toBe(false);
  });
});
