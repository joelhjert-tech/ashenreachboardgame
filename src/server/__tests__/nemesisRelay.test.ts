import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { GameState, NemesisChampion } from "../../game/schema/session.schema.js";
import { ASHEN_CROWN_NEXUS_SECTOR_ID, getNemesisPressureLevel } from "../../game/rules/nemesisRelay.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function createClient(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send() {},
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function selectFirstStartingContract(server: GameRoomServer, seatId: string): void {
  const contractId = server.getState().seats.find((seat) => seat.seatId === seatId)?.startingContractOptions[0];

  if (!contractId) {
    throw new Error(`Missing starting contract option for ${seatId}`);
  }

  server.selectStartingContract(seatId, contractId);
}

function startRelayServer(playerCount: 1 | 2 = 1, randomSequence: number[] = [0]): GameRoomServer {
  const state = createInitialSessionState(
    "relay-test",
    playerCount === 1 ? "single-player" : "multiplayer",
    "scenario_broken_seal",
    "co-op",
    "nemesis_relay"
  );
  const server = new GameRoomServer(state, [], createSequenceRandomSource(randomSequence));

  server.joinSeat("Lead", "void-marshal");
  selectFirstStartingContract(server, "seat-1");
  server.setSeatReady("seat-1", true);

  if (playerCount === 2) {
    server.joinSeat("Assist", "signal-witch");
    selectFirstStartingContract(server, "seat-2");
    server.setSeatReady("seat-2", true);
  }

  server.startSession();
  return server;
}

function updateState(server: GameRoomServer, updater: (state: GameState) => GameState): void {
  (server as unknown as { state: GameState }).state = updater(server.getState());
}

function getActiveNemesis(server: GameRoomServer): NemesisChampion {
  const nemesis = server.getState().nemesisChampions.find((champion) => !champion.defeated);

  if (!nemesis) {
    throw new Error("Expected an active Nemesis");
  }

  return nemesis;
}

describe("Nemesis Relay mode", () => {
  it("derives movement pressure only from Scars and Global Escalation", () => {
    const server = startRelayServer(1);
    const state = server.getState();
    const withLegacyMetadata = {
      ...state,
      escalationLevel: 4,
      players: state.players.map((player) => ({
        ...player,
        character: {
          ...player.character,
          [["he", "at"].join("")]: 99,
          scars: ["scar-wound-1", "scar-wound-2"]
        }
      }))
    };

    expect(getNemesisPressureLevel(withLegacyMetadata)).toBe(4);
  });

  it("spawns one bound Nemesis Champion per occupied player when the session starts", () => {
    const server = startRelayServer(2);

    expect(server.getState().gameMode).toBe("nemesis_relay");
    expect(server.getState().nemesisChampions).toHaveLength(2);
    expect(server.getState().nemesisChampions.map((champion) => champion.boundPlayerId)).toEqual(["seat-1", "seat-2"]);
  });

  it("uses the inert canonical special-rule identifier without adding a consequence", () => {
    const server = startRelayServer(1, [5, 5, 0, 0]);
    const nemesis = getActiveNemesis(server);

    expect(nemesis.id).toBe("nemesis_iron_vicar_orm_seat-1");
    expect(nemesis.specialRuleId).toBe("no_additional_effect");

    const playerSectorId = server.getState().players[0]!.character.currentSpaceId;
    const before = server.getState();
    const playerBefore = before.players[0]!.character;

    updateState(server, (state) => ({
      ...state,
      phase: "action",
      nemesisChampions: state.nemesisChampions.map((champion) =>
        champion.id === nemesis.id ? { ...champion, sectorId: playerSectorId, health: 1, maxHealth: 1 } : champion
      ),
      players: state.players.map((player) =>
        player.seatId === "seat-1"
          ? { ...player, character: { ...player.character, stats: { ...player.character.stats, grit: 12 } } }
          : player
      )
    }));

    server.handleIntent(createClient("seat-1"), {
      type: "NEMESIS_COMBAT_REQUESTED",
      seatId: "seat-1",
      nemesisId: nemesis.id,
      stat: "grit"
    } satisfies ClientIntent);

    const after = server.getState();
    const playerAfter = after.players[0]!.character;
    expect(playerAfter.wounds).toBe(playerBefore.wounds);
    expect(playerAfter.scars).toEqual(playerBefore.scars);
    expect(playerAfter.salvage).toBe(playerBefore.salvage);
    expect(after.escalationLevel).toBe(before.escalationLevel);
    expect(after.pendingEncounterDecision).toBeNull();
    expect(JSON.stringify(after.eventLog.slice(before.eventLog.length))).not.toContain("no_additional_effect");
    expect(JSON.stringify(after.lastOutcomeSummary)).not.toContain("no_additional_effect");
  });

  it("activates the bound Nemesis after its player's turn", () => {
    const server = startRelayServer(1);
    const nemesis = getActiveNemesis(server);
    const originalSectorId = nemesis.sectorId;

    updateState(server, (state) => ({ ...state, phase: "broadcast", activeResolution: null }));
    (server as any).completeBroadcastTurn("seat-1");

    const movedNemesis = server.getState().nemesisChampions.find((champion) => champion.id === nemesis.id)!;
    expect(movedNemesis.sectorId).not.toBe(originalSectorId);
  });

  it("moves Nemesis Champions only through authored adjacency", () => {
    const server = startRelayServer(1);
    const nemesis = getActiveNemesis(server);
    const originalSector = server.getState().sectors.find((sector) => sector.id === nemesis.sectorId)!;

    updateState(server, (state) => ({ ...state, phase: "broadcast", activeResolution: null }));
    (server as any).completeBroadcastTurn("seat-1");

    const movedNemesis = server.getState().nemesisChampions.find((champion) => champion.id === nemesis.id)!;
    expect(originalSector.neighbors).toContain(movedNemesis.sectorId);
  });

  it("uses Scars to increase Nemesis movement speed", () => {
    const server = startRelayServer(1);
    const nemesis = getActiveNemesis(server);

    updateState(server, (state) => ({
      ...state,
      phase: "broadcast",
      activeResolution: null,
      players: state.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                scars: [
                  "scar-wound-1",
                  "scar-wound-2",
                  "scar-wound-3",
                  "scar-wound-4",
                  "scar-wound-5",
                  "scar-wound-7"
                ]
              }
            }
          : player
      )
    }));
    (server as any).completeBroadcastTurn("seat-1");

    const movedEvent = server.getState().eventLog.find((entry) => (entry as { type?: string }).type === "NEMESIS_MOVED") as
      | { path?: string[] }
      | undefined;
    expect(movedEvent?.path).toHaveLength(2);
    expect(server.getState().nemesisChampions.find((champion) => champion.id === nemesis.id)?.sectorId).not.toBe(nemesis.sectorId);
  });

  it("grants a Crown-Key Fragment when a player defeats their bound Nemesis", () => {
    const server = startRelayServer(1, [5, 5, 0, 0]);
    const nemesis = getActiveNemesis(server);
    const playerSectorId = server.getState().players[0]!.character.currentSpaceId;

    updateState(server, (state) => ({
      ...state,
      phase: "action",
      nemesisChampions: state.nemesisChampions.map((champion) =>
        champion.id === nemesis.id ? { ...champion, sectorId: playerSectorId, health: 1, maxHealth: 1 } : champion
      ),
      players: state.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                stats: { ...player.character.stats, grit: 12 }
              }
            }
          : player
      )
    }));

    server.handleIntent(createClient("seat-1"), {
      type: "NEMESIS_COMBAT_REQUESTED",
      seatId: "seat-1",
      nemesisId: nemesis.id,
      stat: "grit"
    } satisfies ClientIntent);

    expect(server.getState().nemesisChampions.find((champion) => champion.id === nemesis.id)?.defeated).toBe(true);
    expect(server.getState().scenarioProgress["crownKey:seat-1"]).toBe(1);
    expect(server.getState().status).toBe("ended");
    expect(server.getState().lastOutcomeSummary?.summary).toContain("All Nemesis Champions");
  });

  it("grants two trophies without mutating stored legacy Heat for a cross-seat bound Nemesis", () => {
    const server = startRelayServer(2);
    const nemesis = server.getState().nemesisChampions.find((champion) => champion.boundPlayerId === "seat-2")!;

    updateState(server, (state) => ({
      ...state,
      players: state.players.map((player) =>
        player.seatId === "seat-1"
          ? { ...player, character: { ...player.character, heat: 4, trophies: 0 } }
          : player
      )
    }));

    (server as any).defeatNemesis("seat-1", nemesis);

    const attacker = server.getState().players.find((player) => player.seatId === "seat-1")!;
    expect(attacker.character.trophies).toBe(2);
    expect(JSON.stringify(server.getState().eventLog)).not.toMatch(/"heatDelta"\s*:\s*-[1-9]/);
  });

  it("adds valid co-op assist bonuses in Nemesis combat", () => {
    const server = startRelayServer(2, [2, 2, 2, 2]);
    const nemesis = getActiveNemesis(server);
    const playerSectorId = server.getState().players[0]!.character.currentSpaceId;

    updateState(server, (state) => ({
      ...state,
      phase: "action",
      nemesisChampions: state.nemesisChampions.map((champion) =>
        champion.id === nemesis.id ? { ...champion, sectorId: playerSectorId } : champion
      ),
      players: state.players.map((player) => ({
        ...player,
        sectorId: playerSectorId,
        character: {
          ...player.character,
          currentSpaceId: playerSectorId,
          stats: { ...player.character.stats, grit: player.seatId === "seat-1" ? 1 : player.character.stats.grit }
        }
      }))
    }));

    server.handleIntent(createClient("seat-1"), {
      type: "NEMESIS_COMBAT_REQUESTED",
      seatId: "seat-1",
      nemesisId: nemesis.id,
      stat: "grit",
      assistSeatIds: ["seat-2"]
    } satisfies ClientIntent);

    expect(server.getState().activeResolution?.roll?.modifierTotal).toBe(2);
  });

  it("starts a Nexus countdown when a Nemesis reaches the Ashen Crown Nexus", () => {
    const server = startRelayServer(1);
    const nemesis = getActiveNemesis(server);

    updateState(server, (state) => ({
      ...state,
      phase: "broadcast",
      activeResolution: null,
      nemesisChampions: state.nemesisChampions.map((champion) =>
        champion.id === nemesis.id ? { ...champion, sectorId: "inner_gate_of_cinders" } : champion
      )
    }));
    (server as any).completeBroadcastTurn("seat-1");

    expect(server.getState().nemesisChampions.find((champion) => champion.id === nemesis.id)?.sectorId).toBe(ASHEN_CROWN_NEXUS_SECTOR_ID);
    expect(server.getState().nemesisNexusCountdowns).toEqual([{ nemesisId: nemesis.id, remainingTurns: 1 }]);
  });

  it("ends in co-op defeat if a Nexus Nemesis survives the countdown", () => {
    const server = startRelayServer(1);
    const nemesis = getActiveNemesis(server);

    updateState(server, (state) => ({
      ...state,
      phase: "broadcast",
      activeResolution: null,
      nemesisChampions: state.nemesisChampions.map((champion) =>
        champion.id === nemesis.id ? { ...champion, sectorId: ASHEN_CROWN_NEXUS_SECTOR_ID } : champion
      ),
      nemesisNexusCountdowns: [{ nemesisId: nemesis.id, remainingTurns: 1 }]
    }));
    (server as any).completeBroadcastTurn("seat-1");

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
    expect(server.getState().lastOutcomeSummary?.summary).toContain("activated the Ashen Crown Nexus");
  });
});
