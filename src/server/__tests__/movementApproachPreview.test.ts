import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { GameAction } from "../../game/engine/actions.js";
import type { PublicMovementPlannerState } from "../../client/shared/types.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, GameRoomServer } from "../roomServer.js";

describe("movement approach preview", () => {
  it.each(["single-player", "multiplayer"] as const)("matches the resolved approach in %s", (mode) => {
    const state = createInitialSessionState("route-preview", mode);
    const seatId = state.players[0]!.seatId;
    state.status = "active";
    state.phase = "navigation";
    state.activeSeatIndex = 0;
    state.turnOrder = state.players.map((player) => player.seatId);
    state.seats = state.seats.map((seat) => ({ ...seat, characterId: state.players.find((player) => player.seatId === seat.seatId)?.character.id ?? seat.characterId }));
    state.movementRolls = { [seatId]: 1 };
    const planner = createPhoneProjection(state, seatId).movementPlanner as PublicMovementPlannerState;
    const destination = planner.destinations.find((entry) => !entry.disabledReason)!;
    expect(destination).toBeDefined();
    expect(destination.opportunityLabel).toBeTruthy();
    expect(destination.approach?.failurePrevented).toBe(mode === "single-player");
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0]));
    server.resolveMoveIntent({ type: "MOVE_REQUESTED", seatId, toSectorId: destination.sectorId });
    const result = [...server.getState().eventLog as GameAction[]].reverse().find((event) => event.type === "MOVEMENT_RESOLVED");
    expect(result).toMatchObject({ stat: "guile", difficulty: mode === "single-player" ? expect.any(Number) : destination.approach!.difficulty });
    if (mode === "single-player") expect(result).toMatchObject({ success: true });
  });
});
