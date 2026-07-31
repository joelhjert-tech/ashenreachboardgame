import { describe, expect, it } from "vitest";
import type { PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";
import { EDGE_CARD_BY_ID, EDGE_CARD_DECK } from "../../game/data/edgeCards.js";
import { loadGear } from "../../game/content/gear.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { GameAction } from "../../game/engine/actions.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import {
  parseAndMigrateSessionSnapshot,
  serializeSessionSnapshotV2
} from "../../game/persistence/sessionSnapshot.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { hasPersistentHazard } from "../../game/rules/persistentHazards.js";
import { getOwnedScarAdaptationControls } from "../../game/rules/scarAdaptationControls.js";
import { getShopGearCost } from "../../game/rules/shopAvailability.js";
import type { EncounterEffect, ThreatCard } from "../../game/schema/card.schema.js";
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

function forceOnlyEdgeCard(server: GameRoomServer, seatId: string, cardId: string): void {
  const state = server.getState();
  if (!state.edgeDeck) throw new Error("Edge deck is not initialized");
  for (const player of state.players) {
    player.private.hand = player.private.hand.filter((ownedId) => !EDGE_CARD_BY_ID.has(ownedId));
  }
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) throw new Error(`Missing player ${seatId}`);
  player.private.hand.push(cardId);
  state.edgeDeck.remainingCardIds = state.edgeDeck.remainingCardIds.filter((id) => id !== cardId);
  state.edgeDeck.discardCardIds = state.edgeDeck.discardCardIds.filter((id) => id !== cardId);
  state.pendingEdgeCommit = null;
  state.pendingEdgeAbility = null;
  state.pendingEdgeReaction = null;
  state.resolvedEdgeReactionIds = [];
  state.edgeHazardSuppressions = [];
  state.lastEdgeCardPlay = null;
}

function stageEncounter(
  server: GameRoomServer,
  seatId: string,
  encounter: ThreatCard,
  resolutionId = `edge-test:${encounter.id}`
): void {
  const state = server.getState();
  state.phase = "action";
  state.currentEncounter = encounter;
  state.pendingEffect = null;
  state.pendingEnemyRoll = null;
  state.cooperativeAssistance = null;
  state.activeResolution = {
    id: resolutionId,
    playerId: seatId,
    source: "threat",
    stage: "battle_setup",
    card: {
      id: encounter.id,
      title: encounter.title,
      type: encounter.cardType
    },
    battle: {
      ...(encounter.cardType === "enemy" ? { enemyName: encounter.enemyName } : {}),
      stat: encounter.stat,
      difficulty: encounter.difficulty,
      modifiers: []
    }
  };
}

function withFreshRandom(server: GameRoomServer, sequence: number[]): GameRoomServer {
  return new GameRoomServer(
    structuredClone(server.getState()),
    [],
    createSequenceRandomSource(sequence)
  );
}

function findEvent<T extends GameAction["type"]>(
  server: GameRoomServer,
  type: T
): Extract<GameAction, { type: T }> {
  const event = [...server.getState().eventLog].reverse().find(
    (entry) => (entry as { type?: string }).type === type
  );
  if (!event) throw new Error(`Missing ${type} event`);
  return event as Extract<GameAction, { type: T }>;
}

function effectContains(
  effect: EncounterEffect | null | undefined,
  type: EncounterEffect["type"]
): boolean {
  if (!effect) return false;
  if (effect.type === type) return true;
  return effect.type === "sequence"
    ? effect.effects.some((entry) => effectContains(entry, type))
    : false;
}

function playAbility(
  server: GameRoomServer,
  seatId: string,
  cardId: string,
  resolutionId: string,
  targetId?: string
): Array<Record<string, unknown>> {
  const sent: Array<Record<string, unknown>> = [];
  server.handleIntent(phoneClient(seatId, sent), {
    type: "PLAY_EDGE_CARD",
    seatId,
    cardId,
    resolutionId,
    mode: "ability",
    targetId
  });
  return sent;
}

function requireThreat(id: string): ThreatCard {
  const card = loadThreatCards().get(id);
  if (!card) throw new Error(`Missing threat ${id}`);
  return card;
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

describe("server-authoritative Edge ability timing", () => {
  it("applies Black Relay, Ashglass, Isolated Channel, and Known Scar Pattern only before their matching roll", () => {
    const enemy = requireThreat("ash-choir-crusader");
    if (enemy.cardType !== "enemy") throw new Error("Expected enemy fixture");
    const hazardSource = requireThreat("deadwire-repeater");
    if (hazardSource.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    const hazard = { ...hazardSource, difficulty: 12 };

    let server = startGame(1);
    let seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-black-relay-decoy");
    stageEncounter(server, seatId, enemy, "black-relay");
    server = withFreshRandom(server, [5, 5, 0, 0]);
    expect(playAbility(server, seatId, "edge-black-relay-decoy", "black-relay")).toEqual([]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(findEvent(server, "COMBAT_RESOLVED")).toMatchObject({
      edgeForfeitTrophy: true,
      oppositionModifierSources: expect.arrayContaining([
        { label: "Black Relay Decoy", value: -3 }
      ])
    });
    expect(server.getState().players[0]!.character.trophyPile ?? []).toHaveLength(0);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-ashglass-overclock");
    stageEncounter(server, seatId, hazard, "ashglass");
    server = withFreshRandom(server, [0, 0]);
    expect(playAbility(server, seatId, "edge-ashglass-overclock", "ashglass")).toEqual([]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    const ashglass = findEvent(server, "CHECK_ROLLED");
    expect(ashglass.success).toBe(false);
    expect(ashglass.modifierSources).toContainEqual({ label: "Ashglass Overclock", value: 3 });
    expect(effectContains(ashglass.effect, "take_wound")).toBe(true);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-isolated-channel");
    stageEncounter(server, seatId, hazardSource, "isolated");
    server = withFreshRandom(server, [5, 5]);
    expect(playAbility(server, seatId, "edge-isolated-channel", "isolated")).toEqual([]);
    const assistanceMessages: Array<Record<string, unknown>> = [];
    server.handleIntent(phoneClient(seatId, assistanceMessages), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId,
      sourceId: hazardSource.id,
      stat: hazardSource.stat,
      helperSeatIds: ["seat-does-not-exist"]
    });
    expect(assistanceMessages).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "COOPERATIVE_ASSISTANCE_REQUESTED"
    }));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazardSource.stat });
    expect(findEvent(server, "CHECK_ROLLED").modifierSources).toContainEqual({
      label: "Isolated Channel",
      value: 2
    });

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    server.getState().players[0]!.character.trophyPile = [{
      cardId: enemy.id,
      name: enemy.enemyName,
      trophyValue: enemy.trophyValue,
      spentValue: 0,
      stat: enemy.stat,
      cardType: enemy.cardType
    }];
    forceOnlyEdgeCard(server, seatId, "edge-known-scar-pattern");
    stageEncounter(server, seatId, enemy, "known-family");
    server = withFreshRandom(server, [5, 5, 0, 0]);
    expect(playAbility(server, seatId, "edge-known-scar-pattern", "known-family")).toEqual([]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(findEvent(server, "COMBAT_RESOLVED").modifierSources).toContainEqual({
      label: "Known Scar Pattern",
      value: 1
    });
  });

  it("boosts only an accepted, locked helper and applies that contribution once", () => {
    const source = requireThreat("deadwire-repeater");
    if (source.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    let server = startGame(2);
    const [seatId, helperSeatId] = server.getState().turnOrder as [string, string];
    forceOnlyEdgeCard(server, seatId, "edge-closed-circuit-aid");
    stageEncounter(server, seatId, source, "closed-aid");
    server = withFreshRandom(server, [0, 0]);

    server.handleIntent(phoneClient(seatId), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId,
      sourceId: source.id,
      stat: source.stat,
      helperSeatIds: [helperSeatId]
    });
    const requestId = server.getState().cooperativeAssistance!.id;
    server.handleIntent(phoneClient(helperSeatId), {
      type: "COOPERATIVE_ASSISTANCE_RESPONDED",
      seatId: helperSeatId,
      requestId,
      accept: true
    });
    server.handleIntent(phoneClient(seatId), {
      type: "COOPERATIVE_ASSISTANCE_LOCKED",
      seatId,
      requestId
    });
    const baseContribution =
      server.getState().cooperativeAssistance!.lockedContributions[0]!.value;
    expect(playAbility(
      server,
      seatId,
      "edge-closed-circuit-aid",
      "closed-aid",
      helperSeatId
    )).toEqual([]);
    expect(server.getState().cooperativeAssistance!.lockedContributions).toEqual([
      { seatId: helperSeatId, value: baseContribution + 2 }
    ]);
    server.getState().players.find((entry) => entry.seatId === seatId)!.private.hand.push(
      "edge-echo-recast"
    );
    server.getState().edgeDeck!.remainingCardIds =
      server.getState().edgeDeck!.remainingCardIds.filter((id) => id !== "edge-echo-recast");

    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: source.stat });
    expect(server.getState().pendingEdgeReaction).toBeNull();
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-echo-recast"]);
    expect(server.getState().activeResolution?.assistance?.contributions).toEqual([
      { seatId: helperSeatId, value: baseContribution + 2 }
    ]);
    expect(
      findEvent(server, "CHECK_ROLLED").modifierSources?.filter(
        (entry) => entry.label.includes("assisted")
      )
    ).toHaveLength(1);
  });

  it("holds Quiet Ledger until the next eligible paid shop action, then discounts exactly one Salvage", () => {
    const gear = loadGear().get("ashlock-cleaver");
    if (!gear) throw new Error("Missing shop Gear fixture");
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    const player = server.getState().players[0]!;
    player.sectorId = "outer_waymarket";
    player.character.currentSpaceId = "outer_waymarket";
    player.character.salvage = 6;
    server.getState().phase = "action";
    server.getState().currentEncounter = null;
    server.getState().activeResolution = null;
    server.getState().pendingEffect = null;
    forceOnlyEdgeCard(server, seatId, "edge-quiet-ledger");

    const projection = createPhoneProjection(
      server.getState(),
      seatId
    ) as unknown as PhonePatchPayload;
    const resolutionId = projection.edgeHand!.cards[0]!.ability.resolutionId!;
    expect(playAbility(server, seatId, "edge-quiet-ledger", resolutionId)).toEqual([]);
    expect(server.getState().pendingEdgeAbility?.abilityKey).toBe("shop-discount");

    server.getState().shopStockReveals = [{
      seatId,
      sectorId: "outer_waymarket",
      serviceId: "buy-gear",
      shopName: "Anchor Market",
      stockIds: [gear.id],
      createdAt: new Date().toISOString()
    }];
    server.handleIntent(phoneClient(seatId), {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId,
      cardId: gear.id
    });

    const purchase = findEvent(server, "SHOP_PURCHASE_RESOLVED");
    expect(purchase.edgeDiscount).toBe(1);
    expect(purchase.cost.salvage).toBe(Math.max(1, getShopGearCost(gear) - 1));
    expect(server.getState().players[0]!.character.salvage).toBe(
      6 - Math.max(1, getShopGearCost(gear) - 1)
    );
    expect(server.getState().pendingEdgeAbility).toBeNull();
  });

  it("expires an unused Quiet Ledger commitment when the shop turn ends", () => {
    const server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    const player = server.getState().players[0]!;
    player.sectorId = "outer_waymarket";
    player.character.currentSpaceId = "outer_waymarket";
    server.getState().phase = "action";
    server.getState().currentEncounter = null;
    server.getState().activeResolution = null;
    server.getState().pendingEffect = null;
    forceOnlyEdgeCard(server, seatId, "edge-quiet-ledger");
    const projection = createPhoneProjection(
      server.getState(),
      seatId
    ) as unknown as PhonePatchPayload;
    const resolutionId = projection.edgeHand!.cards[0]!.ability.resolutionId!;
    expect(playAbility(server, seatId, "edge-quiet-ledger", resolutionId)).toEqual([]);

    server.handleIntent(phoneClient(seatId), {
      type: "SHOP_SKIP_REQUESTED",
      seatId
    });

    expect(server.getState().pendingEdgeAbility).toBeNull();
    expect(server.getState().lastEdgeCardPlay).toBeNull();
  });

  it("opens Cinderline and Cinder Requisition only after the authoritative battle roll", () => {
    const enemy = requireThreat("ash-choir-crusader");
    if (enemy.cardType !== "enemy") throw new Error("Expected enemy fixture");

    let server = startGame(1);
    let seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-cinderline-break");
    stageEncounter(server, seatId, enemy, "cinderline");
    server = withFreshRandom(server, [0, 0, 5, 5]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(server.getState().pendingEdgeReaction).toMatchObject({
      resolutionId: "cinderline",
      legalCardIds: ["edge-cinderline-break"]
    });
    expect(findEvent(server, "EDGE_CARD_REACTION_OPENED").pendingResult.type).toBe(
      "COMBAT_RESOLVED"
    );
    expect(playAbility(
      server,
      seatId,
      "edge-cinderline-break",
      "cinderline"
    )).toEqual([]);
    const cinderline = findEvent(server, "COMBAT_RESOLVED");
    expect(cinderline.edgeForfeitRewards).toBe(true);
    expect(effectContains(cinderline.effect, "take_wound")).toBe(false);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    const salvageBefore = server.getState().players[0]!.character.salvage ?? 0;
    const trophiesBefore = server.getState().players[0]!.character.trophies;
    forceOnlyEdgeCard(server, seatId, "edge-cinder-requisition");
    stageEncounter(server, seatId, enemy, "requisition");
    server = withFreshRandom(server, [5, 5, 0, 0]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(server.getState().pendingEdgeReaction?.legalCardIds).toEqual([
      "edge-cinder-requisition"
    ]);
    expect(playAbility(
      server,
      seatId,
      "edge-cinder-requisition",
      "requisition",
      "2"
    )).toEqual([]);
    const requisition = findEvent(server, "COMBAT_RESOLVED");
    expect(requisition.edgeTrophyConversion).toBe(2);
    expect(server.getState().players[0]!.character.salvage).toBe(salvageBefore + 2);
    expect(server.getState().players[0]!.character.trophies).toBe(
      trophiesBefore + enemy.trophyValue - 2
    );
    expect(server.getState().players[0]!.character.trophyPile).toContainEqual(
      expect.objectContaining({
        cardId: enemy.id,
        trophyValue: enemy.trophyValue,
        spentValue: 2
      })
    );
  });

  it("converts or forfeits explicit gain-Trophy rewards without applying them later", () => {
    const enemy = requireThreat("ash-court-duelist");
    if (enemy.cardType !== "enemy") throw new Error("Expected explicit Trophy enemy");

    let server = startGame(1);
    let seatId = server.getState().turnOrder[0]!;
    let player = server.getState().players[0]!;
    const salvageBefore = player.character.salvage ?? 0;
    const trophiesBefore = player.character.trophies;
    forceOnlyEdgeCard(server, seatId, "edge-cinder-requisition");
    stageEncounter(server, seatId, enemy, "explicit-conversion");
    server = withFreshRandom(server, [5, 5, 0, 0]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(playAbility(
      server,
      seatId,
      "edge-cinder-requisition",
      "explicit-conversion",
      "1"
    )).toEqual([]);
    player = server.getState().players[0]!;
    expect(player.character.salvage).toBe(salvageBefore + 1);
    expect(player.character.trophies).toBe(trophiesBefore);
    expect(effectContains(server.getState().pendingEffect, "gain_trophy")).toBe(false);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-black-relay-decoy");
    stageEncounter(server, seatId, enemy, "explicit-forfeit");
    server = withFreshRandom(server, [5, 5, 0, 0]);
    expect(playAbility(
      server,
      seatId,
      "edge-black-relay-decoy",
      "explicit-forfeit"
    )).toEqual([]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId, stat: enemy.stat });
    expect(findEvent(server, "COMBAT_RESOLVED").edgeForfeitTrophy).toBe(true);
    expect(effectContains(server.getState().pendingEffect, "gain_trophy")).toBe(false);
    expect(server.getState().players[0]!.character.trophies).toBe(0);
  });

  it("resolves Static Shunt, Echo Recast, and Low-Signal Discipline before finalizing a Challenge", () => {
    const source = requireThreat("deadwire-repeater");
    if (source.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    const hazard = { ...source, difficulty: 12 };

    let server = startGame(1);
    let seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-static-shunt");
    stageEncounter(server, seatId, hazard, "static-shunt");
    server = withFreshRandom(server, [0, 0]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(server.getState().pendingEdgeReaction?.legalCardIds).toEqual([
      "edge-static-shunt"
    ]);
    expect(playAbility(
      server,
      seatId,
      "edge-static-shunt",
      "static-shunt",
      "root"
    )).toEqual([]);
    const shunted = findEvent(server, "CHECK_ROLLED");
    expect(shunted.success).toBe(false);
    expect(effectContains(shunted.effect, "return_threat_to_space")).toBe(false);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-echo-recast");
    stageEncounter(server, seatId, hazard, "echo-recast");
    server = withFreshRandom(server, [0, 0, 5]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(server.getState().pendingEdgeReaction?.originalRoll).toEqual([1, 1]);
    expect(playAbility(server, seatId, "edge-echo-recast", "echo-recast", "0")).toEqual([]);
    expect(findEvent(server, "CHECK_ROLLED").roll.faces).toEqual([6, 1]);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-low-signal-discipline");
    stageEncounter(server, seatId, hazard, "low-signal");
    server = withFreshRandom(server, [0, 3]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(playAbility(
      server,
      seatId,
      "edge-low-signal-discipline",
      "low-signal",
      "0"
    )).toEqual([]);
    expect(findEvent(server, "CHECK_ROLLED").roll.faces).toEqual([2, 4]);
  });

  it("suppresses a failed persistent Hazard rule until ROUND_COMPLETED without removing the Hazard", () => {
    const source = requireThreat("deadwire-repeater");
    if (source.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    const hazard = { ...source, difficulty: 12 };
    let server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-hazard-wake");
    stageEncounter(server, seatId, hazard, "hazard-wake");
    server = withFreshRandom(server, [0, 0]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(server.getState().pendingEdgeReaction?.legalCardIds).toEqual([
      "edge-hazard-wake"
    ]);
    expect(playAbility(server, seatId, "edge-hazard-wake", "hazard-wake")).toEqual([]);

    const sectorId = server.getState().players[0]!.character.currentSpaceId;
    const sector = server.getState().sectors.find((entry) => entry.id === sectorId)!;
    sector.persistentThreatIds = [...new Set([...(sector.persistentThreatIds ?? []), hazard.id])];
    expect(sector.persistentThreatIds).toContain(hazard.id);
    expect(hasPersistentHazard(server.getState(), sectorId, hazard.id)).toBe(false);

    const roundResult = reduceGameState(server.getState(), {
      type: "ROUND_COMPLETED",
      seatId,
      createdAt: new Date().toISOString()
    });
    expect(roundResult.ok).toBe(true);
    if (!roundResult.ok) throw new Error(roundResult.rejection.reason);
    expect(roundResult.state.edgeHazardSuppressions).toEqual([]);
    expect(hasPersistentHazard(roundResult.state, sectorId, hazard.id)).toBe(true);
  });

  it("lets the owner decline a post-roll reaction and finalizes the unchanged result", () => {
    const source = requireThreat("deadwire-repeater");
    if (source.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    const hazard = { ...source, difficulty: 12 };
    let server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-echo-recast");
    stageEncounter(server, seatId, hazard, "decline-edge");
    server = withFreshRandom(server, [1, 2]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    const reaction = server.getState().pendingEdgeReaction!;
    server.handleIntent(phoneClient(seatId), {
      type: "DECLINE_EDGE_CARD_REACTION",
      seatId,
      reactionId: reaction.id
    });

    expect(server.getState().pendingEdgeReaction).toBeNull();
    expect(findEvent(server, "CHECK_ROLLED").roll.faces).toEqual([2, 3]);
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-echo-recast"]);
  });

  it("restores a pending private Edge reaction across reconnect and resolves it once", () => {
    const source = requireThreat("deadwire-repeater");
    if (source.cardType !== "hazard") throw new Error("Expected Hazard fixture");
    const hazard = { ...source, difficulty: 12 };
    let server = startGame(1);
    const seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-echo-recast");
    stageEncounter(server, seatId, hazard, "reconnect-reaction");
    server = withFreshRandom(server, [0, 0]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    expect(server.getState().pendingEdgeReaction).not.toBeNull();

    const restoredState = parseAndMigrateSessionSnapshot(
      serializeSessionSnapshotV2(server.getState())
    ).state;
    const restored = new GameRoomServer(
      restoredState,
      [],
      createSequenceRandomSource([5])
    );
    const projection = createPhoneProjection(
      restored.getState(),
      seatId
    ) as unknown as PhonePatchPayload;
    expect(projection.edgeHand?.reaction).toMatchObject({
      id: "edge-reaction:reconnect-reaction"
    });
    expect(projection.edgeHand?.cards[0]?.ability.targets).toEqual([
      { id: "0", label: "Reroll die 1 (1)" },
      { id: "1", label: "Reroll die 2 (1)" }
    ]);

    expect(playAbility(
      restored,
      seatId,
      "edge-echo-recast",
      "reconnect-reaction",
      "0"
    )).toEqual([]);
    expect(findEvent(restored, "CHECK_ROLLED").roll.faces).toEqual([6, 1]);
    expect(restored.getState().pendingEdgeReaction).toBeNull();
    expect(
      (restored.getState().resolvedEdgeReactionIds ?? []).filter(
        (id) => id === "edge-reaction:reconnect-reaction"
      )
    ).toHaveLength(1);
  });

  it("rejects abilities outside their printed window and preserves the private card", () => {
    const enemy = requireThreat("ash-choir-crusader");
    const hazard = requireThreat("deadwire-repeater");
    if (enemy.cardType !== "enemy" || hazard.cardType !== "hazard") {
      throw new Error("Missing Edge timing fixtures");
    }

    let server = startGame(1);
    let seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-black-relay-decoy");
    stageEncounter(server, seatId, hazard, "wrong-encounter");
    let sent = playAbility(server, seatId, "edge-black-relay-decoy", "wrong-encounter");
    expect(sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "PLAY_EDGE_CARD"
    }));
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-black-relay-decoy"]);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-echo-recast");
    stageEncounter(server, seatId, enemy, "too-early");
    sent = playAbility(server, seatId, "edge-echo-recast", "too-early", "0");
    expect(sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "PLAY_EDGE_CARD"
    }));
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-echo-recast"]);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-quiet-ledger");
    stageEncounter(server, seatId, enemy, "not-a-shop");
    sent = playAbility(server, seatId, "edge-quiet-ledger", "not-a-shop");
    expect(sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "PLAY_EDGE_CARD"
    }));
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-quiet-ledger"]);

    server = startGame(1);
    seatId = server.getState().turnOrder[0]!;
    forceOnlyEdgeCard(server, seatId, "edge-echo-recast");
    stageEncounter(server, seatId, { ...hazard, difficulty: 12 }, "bad-target");
    server = withFreshRandom(server, [0, 0]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });
    sent = playAbility(server, seatId, "edge-echo-recast", "bad-target", "7");
    expect(sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "PLAY_EDGE_CARD"
    }));
    expect(server.getState().pendingEdgeReaction).not.toBeNull();
    expect(edgeCardsInHand(server, seatId)).toEqual(["edge-echo-recast"]);
  });
});
