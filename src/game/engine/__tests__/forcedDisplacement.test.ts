import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { loadArtifactCards } from "../../content/artifacts.js";
import { reduceGameState } from "../reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { effectSchema } from "../../schema/card.schema.js";
import { sessionSnapshotSchema } from "../../schema/session.schema.js";
import { getForcedDisplacementDestination, getRingTrackNeighbor } from "../../rules/movementPlanner.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import { APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS, validateForcedDisplacementContentRecord } from "../../../../scripts/forced-displacement-validation.js";

const routeSpliceCandidate = loadThreatCards().get("route-splice");
if (!routeSpliceCandidate || routeSpliceCandidate.cardType !== "hazard") throw new Error("Missing Route Splice");
const routeSplice = routeSpliceCandidate;

function displacementState(options: { blockClockwise?: boolean } = {}) {
  const state = createInitialSessionState("forced-displacement-foundation", "single-player");
  const player = state.players[0]!;
  const origin = "middle_red_march_outpost";
  const destination = getRingTrackNeighbor(origin, 1);
  if (!destination) throw new Error("Missing clockwise middle-ring neighbor");
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = routeSplice;
  state.pendingEffect = routeSplice.failEffect;
  state.activeResolution = {
    id: "route-splice-failure",
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: 8, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: origin,
    encounterCardId: routeSplice.id,
    encounterTitle: routeSplice.title,
    encounterCardType: "hazard",
    checkStat: "guile",
    die1: 1,
    die2: 1,
    statBonus: 0,
    checkTotal: 2,
    difficulty: 8,
    success: false,
    summary: "Route Splice check failed."
  };
  player.sectorId = origin;
  player.character.currentSpaceId = origin;
  player.character.wounds = 0;
  if (options.blockClockwise) {
    state.sectors = state.sectors.map((sector) =>
      sector.id === origin ? { ...sector, neighbors: sector.neighbors.filter((id) => id !== destination) } : sector
    );
  }
  return { state, origin, destination, seatId: player.seatId };
}

function openDisplacement(options: { blockClockwise?: boolean } = {}) {
  const setup = displacementState(options);
  const result = reduceGameState(setup.state, {
    type: "RESOLUTION_APPLIED",
    seatId: setup.seatId,
    effect: setup.state.pendingEffect!,
    sourceCardId: routeSplice.id,
    success: false,
    createdAt: "now"
  });
  return { ...setup, result };
}

describe("authoritative forced displacement foundation", () => {
  it("validates the bounded effect and approves only Route Splice", () => {
    expect(effectSchema.safeParse(routeSplice.failEffect).success).toBe(true);
    expect(effectSchema.safeParse({ ...routeSplice.failEffect, distance: 2 }).success).toBe(false);
    expect(effectSchema.safeParse({ ...routeSplice.failEffect, sameRing: false }).success).toBe(false);
    expect(effectSchema.safeParse({ ...routeSplice.failEffect, failureStillCounts: false }).success).toBe(false);
    expect(effectSchema.safeParse({ ...routeSplice.failEffect, fallbackEffect: { type: "gain_salvage", amount: 1 } }).success).toBe(false);
    expect(APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS).toEqual(new Set(["route-splice"]));
    expect(validateForcedDisplacementContentRecord("route-splice.json", routeSplice)).toEqual([]);
    expect(validateForcedDisplacementContentRecord("new.json", { id: "new-source", failEffect: routeSplice.failEffect })[0]).toMatch(/unapproved forced-displacement source/);
  });

  it("preserves Route Splice identity, test, success, and authored failure shape", () => {
    expect(routeSplice).toMatchObject({ id: "route-splice", stat: "guile", difficulty: 8, threatLane: "yellow", region: "middle", rarity: "uncommon" });
    expect(routeSplice.successEffect).toEqual({ type: "gain_note", text: "You mapped the splice before it could close behind you." });
    expect(routeSplice.failEffect).toEqual({
      type: "forcedDisplacement",
      direction: "clockwise",
      distance: 1,
      sameRing: true,
      fallbackEffect: { type: "take_wound", amount: 1 },
      failureStillCounts: true
    });
  });

  it("derives the clockwise same-ring legal destination deterministically", () => {
    const { state, origin, destination, seatId } = displacementState();
    expect(getRingTrackNeighbor(origin, 1)).toBe(destination);
    expect(getForcedDisplacementDestination(state, seatId, "clockwise")).toBe(destination);
    expect(state.sectors.find((sector) => sector.id === origin)?.neighbors).toContain(destination);
    expect(state.sectors.find((sector) => sector.id === destination)?.regionTier).toBe(state.sectors.find((sector) => sector.id === origin)?.regionTier);
  });

  it("opens persisted pending state before movement or fallback mutation", () => {
    const { result, origin, destination } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.state.players[0]!;
    expect(player.sectorId).toBe(origin);
    expect(player.character.currentSpaceId).toBe(origin);
    expect(player.character.wounds).toBe(0);
    expect(result.state.pendingDisplacement).toMatchObject({
      seatId: "seat-1",
      sourceId: "route-splice",
      originSectorId: origin,
      destinationSectorId: destination,
      direction: "clockwise",
      status: "pending",
      failureStillCounts: true
    });
    expect(result.state.lastOutcomeSummary?.success).toBe(false);
    expect(sessionSnapshotSchema.safeParse({ sessionId: result.state.sessionId, sequence: result.state.sequence, state: result.state }).success).toBe(true);
  });

  it("accepts the authoritative displacement once and schedules one arrival pipeline", () => {
    const { result, destination } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pending = result.state.pendingDisplacement!;
    const accepted = reduceGameState(result.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "later" });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.state.players[0]!.sectorId).toBe(destination);
    expect(accepted.state.players[0]!.character.currentSpaceId).toBe(destination);
    expect(accepted.state.players[0]!.character.wounds).toBe(0);
    expect(accepted.state.pendingDisplacement).toBeNull();
    expect(accepted.state.pendingDisplacementArrival).toMatchObject({ seatId: "seat-1", sectorId: destination });
    expect(accepted.state.resolvedDisplacementSourceEventIds).toContain(pending.sourceEventId);
    expect(accepted.state.lastOutcomeSummary?.success).toBe(false);
    expect(reduceGameState(accepted.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "again" }).ok).toBe(false);
  });

  it("uses the Wound fallback immediately when no legal clockwise destination exists", () => {
    const { result, origin } = openDisplacement({ blockClockwise: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pendingDisplacement).toBeNull();
    expect(result.state.players[0]!.sectorId).toBe(origin);
    expect(result.state.players[0]!.character.wounds).toBe(1);
    expect(result.state.activeResolution?.outcome?.text).toMatch(/Suffered 1 Wound/);
    expect(result.state.lastOutcomeSummary?.success).toBe(false);
  });

  it("revalidates legality and falls back if the route becomes blocked before acceptance", () => {
    const { result, origin, destination } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pending = result.state.pendingDisplacement!;
    const changed = {
      ...result.state,
      sectors: result.state.sectors.map((sector) =>
        sector.id === origin ? { ...sector, neighbors: sector.neighbors.filter((id) => id !== destination) } : sector
      )
    };
    const accepted = reduceGameState(changed, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "later" });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.state.players[0]!.sectorId).toBe(origin);
    expect(accepted.state.players[0]!.character.wounds).toBe(1);
    expect(accepted.state.pendingDisplacementArrival).toBeNull();
  });

  it("rejects wrong-seat, stale-reaction, stale-origin, and continue bypass without mutation", () => {
    const { result } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pending = result.state.pendingDisplacement!;
    expect(reduceGameState(result.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-2", reactionId: pending.reactionId, createdAt: "x" }).ok).toBe(false);
    expect(reduceGameState(result.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: "stale", createdAt: "x" }).ok).toBe(false);
    expect(reduceGameState(result.state, { type: "CONTINUE_RESOLUTION", seatId: "seat-1", createdAt: "x" }).ok).toBe(false);
    const moved = { ...result.state, players: result.state.players.map((player) => ({ ...player, sectorId: pending.destinationSectorId, character: { ...player.character, currentSpaceId: pending.destinationSectorId } })) };
    expect(reduceGameState(moved, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "x" }).ok).toBe(false);
    expect(result.state.players[0]!.character.wounds).toBe(0);
  });

  it("projects one owner action and a public-safe TV wait without hidden content", () => {
    const { result } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const owner = createPhoneProjection(result.state, "seat-1") as unknown as PhonePatchPayload;
    const other = createPhoneProjection(result.state, "seat-2") as unknown as PhonePatchPayload;
    const tv = createTvProjection(result.state) as unknown as PublicPatchPayload;
    expect(owner.pendingDisplacementPrivate).toMatchObject({ reactionId: result.state.pendingDisplacement?.reactionId, sourceTitle: "Route Splice" });
    expect(other.pendingDisplacementPrivate).toBeNull();
    expect(tv.pendingDisplacement).toMatchObject({ sourceId: "route-splice", status: "waiting" });
    expect(JSON.stringify(tv)).not.toContain(result.state.pendingDisplacement?.reactionId);
    expect(JSON.stringify(tv.pendingDisplacement)).not.toMatch(/agenda|shop stock|encounterDecks/i);
  });

  it("resolves through the authenticated server intent and rejects replay after reconnect", () => {
    const { result, destination } = openDisplacement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const server = new GameRoomServer(result.state);
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"] };
    const reactionId = server.getState().pendingDisplacement!.reactionId;
    server.handleIntent(client, { type: "FORCED_DISPLACEMENT_ACCEPTED", seatId: "seat-1", reactionId });
    expect(server.getState().players[0]!.sectorId).toBe(destination);
    server.handleIntent(client, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    expect(server.getState().pendingDisplacementArrival).toBeNull();
    expect(server.getState().phase).not.toBe("broadcast");
    server.handleIntent(client, { type: "FORCED_DISPLACEMENT_ACCEPTED", seatId: "seat-1", reactionId });
    expect(server.getState().players[0]!.sectorId).toBe(destination);
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);
  });

  it("keeps Rift Anchor Spike and Veil Hook mechanics outside the foundation", () => {
    const spike = JSON.stringify(loadArtifactCards().get("artifact-rift-anchor-spike"));
    expect(spike).toContain("veil-hook");
    expect(spike).not.toContain("forcedDisplacement");
    expect(JSON.stringify(routeSplice)).not.toMatch(/rift-anchor-spike|veil-hook/i);
  });
});
