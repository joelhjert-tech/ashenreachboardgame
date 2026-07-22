import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const hazard = {
  id: "action-layout-start-hazard",
  type: "threat",
  cardType: "hazard",
  title: "Glass-Chime Swarm",
  text: "Test Signal before the swarm closes.",
  flavor: "Every shard remembers a different alarm.",
  severity: 1,
  stat: "signal",
  difficulty: 6,
  successEffect: { type: "legacy_compatibility_noop" },
  failEffect: { type: "take_wound", amount: 1 }
} satisfies ThreatCard;

function client(seatId = "seat-1"): ConnectedClient {
  return {
    view: "phone",
    seatId,
    socket: { send: vi.fn(), readyState: WebSocket.OPEN } as unknown as WebSocket
  };
}

function serverAtReveal(): GameRoomServer {
  const state = createInitialSessionState("tile-encounter-start", "single-player");
  state.status = "active";
  state.phase = "action";
  state.currentEncounter = hazard;
  state.activeResolution = {
    id: "resolution:glass-chime",
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: hazard.id, title: hazard.title, type: "hazard" }
  };
  return new GameRoomServer(state);
}

describe("authoritative tile encounter start", () => {
  it("moves a displayed Hazard into the canonical battle setup without rolling", () => {
    const server = serverAtReveal();

    server.handleIntent(client(), {
      type: "START_TILE_ENCOUNTER",
      seatId: "seat-1",
      encounterId: hazard.id,
      resolutionId: "resolution:glass-chime"
    });

    expect(server.getState().activeResolution).toMatchObject({
      id: "resolution:glass-chime",
      playerId: "seat-1",
      stage: "battle_setup",
      battle: { stat: "signal", difficulty: 6, modifiers: [] }
    });
    expect(server.getState().activeResolution?.roll).toBeUndefined();
  });

  it("starts a recurring Challenge whose presentation art has a different stable ID", () => {
    const server = serverAtReveal();
    server.getState().resolutionSource = "tileChallenge";
    server.getState().pendingTileChallenge = {
      id: "pending:signal-chorus",
      challengeId: hazard.id,
      sectorId: "ashwake-crossing",
      seatId: "seat-1",
      challengeType: "hazard",
      testStat: "signal",
      difficulty: 6,
      sourceTags: ["relay"],
      successEffect: hazard.successEffect,
      failureEffect: hazard.failEffect,
      authoredOrder: 0,
      totalChallenges: 1,
      rolled: false,
      modifierSources: [],
      createdAt: "qa"
    };
    server.getState().activeResolution!.card!.id = "challenge-art:glass-chime";

    server.handleIntent(client(), {
      type: "START_TILE_ENCOUNTER",
      seatId: "seat-1",
      encounterId: hazard.id,
      resolutionId: "resolution:glass-chime"
    });

    expect(server.getState().activeResolution?.stage).toBe("battle_setup");
  });

  it("rejects wrong owners, stale encounter identity, and replay after start", () => {
    const wrongOwner = serverAtReveal();
    const wrongOwnerClient = client("seat-2");
    wrongOwner.handleIntent(wrongOwnerClient, {
      type: "START_TILE_ENCOUNTER",
      seatId: "seat-2",
      encounterId: hazard.id,
      resolutionId: "resolution:glass-chime"
    });
    expect(wrongOwnerClient.socket.send).toHaveBeenCalledWith(expect.stringMatching(/active operative/i));

    const stale = serverAtReveal();
    const staleClient = client();
    stale.handleIntent(staleClient, {
      type: "START_TILE_ENCOUNTER",
      seatId: "seat-1",
      encounterId: "stale-card",
      resolutionId: "resolution:glass-chime"
    });
    expect(staleClient.socket.send).toHaveBeenCalledWith(expect.stringMatching(/stale/i));

    const replay = serverAtReveal();
    const intent = {
      type: "START_TILE_ENCOUNTER" as const,
      seatId: "seat-1",
      encounterId: hazard.id,
      resolutionId: "resolution:glass-chime"
    };
    replay.handleIntent(client(), intent);
    const replayClient = client();
    replay.handleIntent(replayClient, intent);
    expect(replayClient.socket.send).toHaveBeenCalledWith(expect.stringMatching(/already started/i));
  });
});
