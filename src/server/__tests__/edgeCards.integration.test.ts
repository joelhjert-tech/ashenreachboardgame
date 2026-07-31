import { describe, expect, it } from "vitest";
import type { PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";
import { EDGE_CARD_BY_ID, EDGE_CARD_DECK } from "../../game/data/edgeCards.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import {
  parseAndMigrateSessionSnapshot,
  serializeSessionSnapshotV2
} from "../../game/persistence/sessionSnapshot.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { getOwnedScarAdaptationControls } from "../../game/rules/scarAdaptationControls.js";
import {
  createPhoneProjection,
  createTvProjection,
  GameRoomServer,
  type ConnectedClient
} from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function phoneClient(seatId: string, sent: Array<Record<string, unknown>> = []): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        sent.push(JSON.parse(payload) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function selectMissionProvisionsAndReady(server: GameRoomServer, seatId: string): void {
  const contractId = server.getState().seats.find((seat) => seat.seatId === seatId)
    ?.startingContractOptions[0];
  if (!contractId) throw new Error(`Missing starting Contract for ${seatId}`);
  server.selectStartingContract(seatId, contractId);

  for (let pick = 0; pick < 2; pick += 1) {
    const seat = server.getState().seats.find((entry) => entry.seatId === seatId);
    const option = seat?.startingBonusOfferOptions?.[0];
    if (!seat?.startingBonusOfferId || !option) {
      throw new Error(`Missing starting provision for ${seatId}`);
    }
    server.selectStartingBonus(seatId, seat.startingBonusOfferId, option.kind, option.id);
  }
  server.setSeatReady(seatId, true);
}

function startGame(
  playerCount: 1 | 2,
  scenarioId = "scenario_broken_seal"
): GameRoomServer {
  const state = createInitialSessionState(
    `edge-cards-${playerCount}`,
    playerCount === 1 ? "single-player" : "multiplayer",
    scenarioId,
    "co-op",
    "standard",
    playerCount
  );
  const server = new GameRoomServer(
    state,
    [],
    createSequenceRandomSource(Array.from({ length: 80 }, () => 0))
  );
  const first = server.joinSeat("First", "void-marshal");
  selectMissionProvisionsAndReady(server, first.seatId);
  if (playerCount === 2) {
    const second = server.joinSeat("Second", "signal-witch");
    selectMissionProvisionsAndReady(server, second.seatId);
  }
  server.startSession();
  return server;
}

function edgeCardsInHand(server: GameRoomServer, seatId: string): string[] {
  return server.getState().players
    .find((player) => player.seatId === seatId)!
    .private.hand.filter((cardId) => EDGE_CARD_BY_ID.has(cardId));
}

describe("server-authoritative Edge Cards", () => {
  it("deals exactly one random private card per player and preserves it across reconnect snapshots", () => {
    const server = startGame(2);
    const [seatOne, seatTwo] = server.getState().turnOrder;
    const firstHand = edgeCardsInHand(server, seatOne!);
    const secondHand = edgeCardsInHand(server, seatTwo!);

    expect(firstHand).toHaveLength(1);
    expect(secondHand).toHaveLength(1);
    expect(firstHand[0]).not.toBe(secondHand[0]);
    expect(server.getState().edgeDeck?.remainingCardIds).toHaveLength(
      EDGE_CARD_DECK.length - 2
    );

    const tv = createTvProjection(server.getState()) as unknown as PublicPatchPayload;
    const firstPhone = createPhoneProjection(server.getState(), seatOne!) as unknown as PhonePatchPayload;
    const secondPhone = createPhoneProjection(server.getState(), seatTwo!) as unknown as PhonePatchPayload;
    expect(firstPhone.edgeHand?.cards.map((card) => card.id)).toEqual(firstHand);
    expect(secondPhone.edgeHand?.cards.map((card) => card.id)).toEqual(secondHand);
    expect(JSON.stringify(tv)).not.toContain(firstHand[0]);
    expect(JSON.stringify(tv)).not.toContain(secondHand[0]);
    expect(JSON.stringify(firstPhone)).not.toContain(secondHand[0]);
    expect(JSON.stringify(tv)).not.toContain("edgeDeck");
    expect(JSON.stringify(firstPhone)).not.toContain("remainingCardIds");

    const restoredState = parseAndMigrateSessionSnapshot(
      serializeSessionSnapshotV2(server.getState())
    ).state;
    const restored = new GameRoomServer(restoredState);
    expect(edgeCardsInHand(restored, seatOne!)).toEqual(firstHand);
    expect(
      (createPhoneProjection(restored.getState(), seatOne!) as unknown as PhonePatchPayload)
        .edgeHand?.cards.map((card) => card.id)
    ).toEqual(firstHand);
  });

  it("burns one owned card into a public reveal and commits its value as exactly one die", () => {
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    const hazard = [...loadThreatCards().values()].find((card) => card.cardType === "hazard")!;
    server.getState().phase = "action";
    server.getState().currentEncounter = hazard;

    server.handleIntent(phoneClient(seatId), {
      type: "CHECK_REQUESTED",
      seatId,
      stat: hazard.stat
    });
    const resolutionId = server.getState().activeResolution?.id;
    const cardId = edgeCardsInHand(server, seatId)[0]!;
    const definition = EDGE_CARD_BY_ID.get(cardId)!;
    expect(resolutionId).toBeTruthy();

    server.handleIntent(phoneClient(seatId), {
      type: "PLAY_EDGE_CARD",
      seatId,
      cardId,
      resolutionId: resolutionId!,
      mode: "commit-value"
    });

    expect(edgeCardsInHand(server, seatId)).toEqual([]);
    expect(server.getState().edgeDeck?.discardCardIds).toContain(cardId);
    expect(server.getState().pendingEdgeCommit).toMatchObject({
      seatId,
      cardId,
      edgeValue: definition.edgeValue,
      resolutionId
    });
    const tv = createTvProjection(server.getState()) as unknown as PublicPatchPayload;
    expect(tv.edgeCardPlay).toMatchObject({
      actorSeatId: seatId,
      cardId,
      cardName: definition.name,
      edgeValue: definition.edgeValue
    });
    expect(JSON.stringify(tv)).not.toContain("abilityText");

    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(server.getState().pendingEdgeCommit).toBeNull();
    expect(server.getState().activeResolution?.roll?.dice[0]).toBe(definition.edgeValue);
    expect(server.getState().activeResolution?.roll?.dice[1]).toBeGreaterThanOrEqual(1);
    expect(server.getState().activeResolution?.roll?.dice[1]).toBeLessThanOrEqual(6);
  });

  it("rejects unowned or duplicate commits and awards the next random card after a Contract", () => {
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    const player = server.getState().players[0]!;
    const activeMission = player.character.activeContracts?.[0] ?? player.character.activeContract;
    expect(activeMission).toBeTruthy();

    if (player.character.activeContract) player.character.activeContract.progress = 999;
    if (player.character.activeContracts?.[0]) player.character.activeContracts[0].progress = 999;
    server.getState().phase = "action";
    const beforeHand = edgeCardsInHand(server, seatId);
    server.handleIntent(phoneClient(seatId), {
      type: "COMPLETE_CONTRACT",
      seatId,
      contractId: activeMission!.contractId
    });

    const afterHand = edgeCardsInHand(server, seatId);
    expect(beforeHand).toHaveLength(1);
    expect(afterHand).toHaveLength(2);
    expect(
      server.getState().eventLog.some((event) => {
        const candidate = event as { type?: string; source?: string };
        return candidate.type === "EDGE_CARD_AWARDED" && candidate.source === "contract";
      })
    ).toBe(true);

    const hazard = [...loadThreatCards().values()].find((card) => card.cardType === "hazard")!;
    server.getState().phase = "action";
    server.getState().currentEncounter = hazard;
    server.getState().activeResolution = null;
    server.handleIntent(phoneClient(seatId), {
      type: "CHECK_REQUESTED",
      seatId,
      stat: hazard.stat
    });
    const resolutionId = server.getState().activeResolution!.id;
    const sent: Array<Record<string, unknown>> = [];
    server.handleIntent(phoneClient(seatId, sent), {
      type: "PLAY_EDGE_CARD",
      seatId,
      cardId: "edge-not-owned",
      resolutionId,
      mode: "commit-value"
    });
    expect(sent).toEqual([
      expect.objectContaining({
        type: "INTENT_REJECTED",
        actionType: "PLAY_EDGE_CARD"
      })
    ]);
  });

  it("preserves the private deck and hand when a round-end scenario assault begins", () => {
    const server = startGame(1, "scenario_grinning_tithe");
    const seatId = server.getState().turnOrder[0]!;
    const handBefore = edgeCardsInHand(server, seatId);
    const deckBefore = structuredClone(server.getState().edgeDeck);
    server.getState().phase = "broadcast";
    server.getState().currentEncounter = null;
    server.getState().activeResolution = null;

    (
      server as unknown as {
        completeBroadcastTurn(seatId: string): void;
      }
    ).completeBroadcastTurn(seatId);

    expect(server.getState().pendingScenarioAssault).not.toBeNull();
    expect(server.getState().edgeDeck).toEqual(deckBefore);
    expect(edgeCardsInHand(server, seatId)).toEqual(handBefore);
  });

  it("keeps the committed die locked while allowing a legal reroll of the server die", () => {
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    const player = server.getState().players[0]!;
    const hazard = [...loadThreatCards().values()].find(
      (card) => card.cardType === "hazard" && card.stat === "grit"
    )!;
    player.character.scars.push("scar-wound-11");
    server.getState().phase = "action";
    server.getState().currentEncounter = hazard;

    server.handleIntent(phoneClient(seatId), {
      type: "CHECK_REQUESTED",
      seatId,
      stat: hazard.stat
    });
    const resolutionId = server.getState().activeResolution!.id;
    server.handleIntent(phoneClient(seatId), {
      type: "PLAY_EDGE_CARD",
      seatId,
      cardId: edgeCardsInHand(server, seatId)[0]!,
      resolutionId,
      mode: "commit-value"
    });
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });

    const reroll = getOwnedScarAdaptationControls(server.getState(), seatId).find(
      (control) => control.ruleKey === "grit-hazard-reroll"
    );
    expect(reroll?.targets).toEqual([
      expect.objectContaining({ id: "1" })
    ]);
  });

  it("clears the deck and private hands when an active session returns to setup", () => {
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    expect(server.getState().edgeDeck).not.toBeNull();
    expect(edgeCardsInHand(server, seatId)).toHaveLength(1);

    (
      server as unknown as {
        restartActiveSession(reconfigureLobby?: boolean): void;
      }
    ).restartActiveSession();

    expect(server.getState().edgeDeck).toBeNull();
    expect(server.getState().pendingEdgeCommit).toBeNull();
    expect(server.getState().lastEdgeCardPlay).toBeNull();
    expect(edgeCardsInHand(server, seatId)).toEqual([]);
  });
});
