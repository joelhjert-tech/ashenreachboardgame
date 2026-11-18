import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../game/content/characters.js";
import { loadContracts } from "../../game/content/contracts.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { loadGear } from "../../game/content/gear.js";
import { EDGE_CARD_BY_ID } from "../../game/data/edgeCards.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import type { ClientIntent, CompleteContractAction } from "../../game/engine/actions.js";
import type { ContractCard } from "../../game/schema/contract.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { advanceContractObjectiveState, getContractObjectiveTarget, isContractObjectiveComplete,
  setContractProgressStateFloor } from "../../game/contracts/objectives.js";
import { getActiveMissions, setActiveMissions } from "../../game/rules/missionLifecycle.js";
import { buildOwnerContractPresentation } from "../../client/shared/objectivePresentation.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const catalog = loadContracts();
const initial = createInitialSessionState("mission-review", "single-player", "scenario_throne_of_ash");

function stateFor(contractId?: string, progress = 0): GameState {
  const state = structuredClone(initial);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.seats[0]!.connected = true;
  state.seats[0]!.displayName = "Reviewer";
  state.seats[0]!.characterSelected = true;
  state.players[0]!.character = setActiveMissions({ ...loadCharacters().get("void-marshal")!,
    heldGear: [], equippedGear: { weapon: null, armor: null, utility: null }, salvage: 5, trophies: 0,
    wounds: 2, scars: [], followers: [], completedContracts: [], completedMissionRecords: [] },
    contractId ? [{ contractId, progress }] : []);
  state.players[0]!.sectorId = state.players[0]!.character.currentSpaceId;
  state.players[0]!.private.hand = [];
  state.edgeDeck = { cycle: 1, remainingCardIds: [...EDGE_CARD_BY_ID.keys()], discardCardIds: [] };
  state.currentEncounter = null;
  state.activeResolution = null;
  state.pendingEffect = null;
  return state;
}

function serverFor(state: GameState) {
  return new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 0, 0]), undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
}

function send(server: GameRoomServer, intent: ClientIntent): unknown[] {
  const rejected: unknown[] = [];
  server.handleIntent({ seatId: "seat-1", view: "phone", socket: {
    send(message: string) { const parsed = JSON.parse(message); if (parsed.type === "INTENT_REJECTED") rejected.push(parsed); },
    close() {}
  } as unknown as ConnectedClient["socket"] }, intent);
  return rejected;
}

function completion(contract: ContractCard): CompleteContractAction {
  return { type: "COMPLETE_CONTRACT", seatId: "seat-1", contractId: contract.id, contract, createdAt: "review" };
}

type MissionServer = {
  resolveContract(contract: ContractCard): ContractCard;
  completeSatisfiedContract(seatId: string): boolean;
  queueMissionReward(reward: { ownerSeatId: string; sourceKind: "battle" | "tile"; sourceId: string; sourceTitle: string }): void;
  runAutomaticPhases(seatId: string): void;
};
const resolver = serverFor(stateFor()) as unknown as MissionServer;

describe("contract and mission review", () => {
  it.each([...catalog.values()])("completes and archives $id exactly once with its authored reward", (card) => {
    const state = stateFor(card.id, getContractObjectiveTarget(card));
    const mission = getActiveMissions(state.players[0]!.character)[0]!;
    if (card.objective.type === "shopTransaction") mission.salvageSpent = card.objective.minimumSalvageSpent ?? 0;
    const resolved = resolver.resolveContract(card);
    const result = reduceGameState(state, completion(resolved));
    expect(result.ok).toBe(true);
    const player = result.state.players[0]!;
    expect(getActiveMissions(player.character)).toEqual([]);
    expect(player.character.completedContracts).toEqual([card.id]);
    expect(player.character.completedMissionRecords).toEqual([expect.objectContaining({ missionId: card.id, rewardGranted: true, spent: false })]);
    for (const effect of resolved.reward.effects) {
      if (effect.type === "gain_gear") expect(player.character.heldGear.some((item) => item.id === effect.gearId)).toBe(true);
      if (effect.type === "gain_follower") expect(player.character.followers?.some((item) => item.id === effect.followerId)).toBe(true);
      if (effect.type === "gain_salvage") expect(player.character.salvage).toBe(5 + effect.amount);
      if (effect.type === "gain_trophy") expect(player.character.trophies).toBe(effect.amount);
      if (effect.type === "heal_wound") expect(player.character.wounds).toBe(Math.max(0, 2 - effect.amount));
    }
    const retry = reduceGameState({ ...result.state, phase: "action", activeResolution: null }, completion(resolved));
    expect(retry.ok).toBe(false);
    expect(retry.state.players[0]!.character.completedMissionRecords).toHaveLength(1);
  });

  it.each(["manual", "automatic"] as const)("%s completion grants one Edge card and one replacement offer", (mode) => {
    const server = serverFor(stateFor("contract-beacon", 1));
    if (mode === "manual") expect(send(server, { type: "COMPLETE_CONTRACT", seatId: "seat-1", contractId: "contract-beacon" })).toEqual([]);
    else expect((server as unknown as MissionServer).completeSatisfiedContract("seat-1")).toBe(true);
    const events = server.getState().eventLog as Array<{ type?: string; source?: string }>;
    expect(events.filter((event) => event.type === "EDGE_CARD_AWARDED" && event.source === "contract")).toHaveLength(1);
    expect(events.filter((event) => event.type === "REPLACEMENT_MISSION_OFFERED")).toHaveLength(1);
    expect(events.filter((event) => event.type === "COMPLETE_CONTRACT")).toHaveLength(1);
  });

  it("cannot complete a Contract over an unresolved enemy", () => {
    const state = stateFor("contract-beacon", 1);
    state.currentEncounter = loadThreatCards().get("ash-rat-skitter")!;
    const card = catalog.get("contract-beacon")!;
    const result = reduceGameState(state, completion(card));
    expect(result.ok).toBe(false);
    expect(result.state.currentEncounter?.id).toBe("ash-rat-skitter");
    expect(result.state.players[0]!.character.completedContracts).toEqual([]);
  });

  it.each(["card_reveal", "battle_setup"] as const)("can accept a Contract during %s without bypassing the enemy", (stage) => {
    const state = stateFor();
    state.currentEncounter = loadThreatCards().get("ash-rat-skitter")!;
    state.activeResolution = { id: "enemy", playerId: "seat-1", source: "threat", stage };
    const card = catalog.get("contract-beacon")!;
    const result = reduceGameState(state, { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: card.id, contract: card, createdAt: "review" });
    expect(result.ok).toBe(true);
    expect(result.state.currentEncounter?.id).toBe("ash-rat-skitter");
    expect(result.state.activeResolution).toEqual(state.activeResolution);
    expect(result.state.phase).toBe("action");
  });

  it("cannot accept a Contract after the battle roll has started", () => {
    const state = stateFor();
    state.currentEncounter = loadThreatCards().get("ash-rat-skitter")!;
    state.activeResolution = { id: "enemy", playerId: "seat-1", source: "threat", stage: "dice_roll" };
    const card = catalog.get("contract-beacon")!;
    const result = reduceGameState(state, { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: card.id, contract: card, createdAt: "review" });
    expect(result.ok).toBe(false);
    expect(getActiveMissions(result.state.players[0]!.character)).toEqual([]);
  });

  it("rejects repeated acceptance without consuming an ability or changing the active mission", () => {
    const state = stateFor("contract-beacon", 0);
    const card = catalog.get("contract-beacon")!;
    const result = reduceGameState(state, { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: card.id, contract: card, createdAt: "again" });
    expect(result.ok).toBe(false);
    expect(getActiveMissions(result.state.players[0]!.character)).toEqual([{ contractId: card.id, progress: 0 }]);
  });

  it("rejects a legacy completed ID even if a stale active copy remains", () => {
    const state = stateFor("contract-beacon", 1);
    state.players[0]!.character.completedContracts = ["contract-beacon"];
    const result = reduceGameState(state, completion(catalog.get("contract-beacon")!));
    expect(result.ok).toBe(false);
    expect(result.state.players[0]!.character.salvage).toBe(5);
  });

  it.each(["black-ledger-agent", "rift-cartographer"])("%s preserves credited route stops through later visits", (characterId) => {
    const state = stateFor();
    state.players[0]!.character = setActiveMissions({ ...loadCharacters().get(characterId)!, scars: [] }, []);
    const server = serverFor(state);
    const card = catalog.get("compact-three-lantern-circuit")!;
    expect(send(server, { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: card.id })).toEqual([]);
    const mission = getActiveMissions(server.getState().players[0]!.character)[0]!;
    expect(mission).toMatchObject({ progress: 1, completedTargetIds: ["crossing"] });
    const next = advanceContractObjectiveState(card, mission, { type: "sector-visited", sectorId: "outer_waymarket", sectorTags: ["shop"] });
    expect(next).toMatchObject({ progress: 2, completedTargetIds: ["crossing", "waymarket"] });
  });

  it("preserves route credit from older saves that only recorded a numeric progress value", () => {
    const card = catalog.get("compact-three-lantern-circuit")!;
    const next = advanceContractObjectiveState(card, { progress: 1 }, { type: "sector-visited", sectorId: "outer_waymarket", sectorTags: ["shop"] });
    expect(next).toMatchObject({ progress: 2, completedTargetIds: ["crossing", "waymarket"] });
    expect(setContractProgressStateFloor(card, next, 1)).toEqual(next);
  });

  it("counts every qualifying purchase while checking the full cumulative Salvage requirement", () => {
    const card = { ...catalog.get("compact-equipment-requisition")!,
      objective: { type: "shopTransaction", action: "buyEquipment", requiredCount: 2, minimumSalvageSpent: 3, label: "Buy twice, spending three Salvage" } } satisfies ContractCard;
    const purchase = { type: "shop-transaction" as const, action: "buyEquipment" as const, sectorId: "outer_waymarket", shopTypes: ["shop"], salvageSpent: 1 };
    const first = advanceContractObjectiveState(card, { progress: 0 }, purchase);
    const second = advanceContractObjectiveState(card, first, purchase);
    expect(first).toMatchObject({ progress: 1, salvageSpent: 1 });
    expect(second).toMatchObject({ progress: 2, salvageSpent: 2 });
    expect(isContractObjectiveComplete(card, second)).toBe(false);
    const presentation = buildOwnerContractPresentation(card, { contractId: card.id, ...second });
    expect(presentation.progress.complete).toBe(false);
    expect(presentation.progressText).toContain("2/3 Salvage spent");
    const third = advanceContractObjectiveState(card, second, purchase);
    expect(isContractObjectiveComplete(card, third)).toBe(true);
    const state = stateFor(card.id, 2);
    state.players[0]!.character = setActiveMissions(state.players[0]!.character, [{ contractId: card.id, ...second }]);
    expect(reduceGameState(state, completion(card)).ok).toBe(false);
  });

  it("resumes the remaining arrival threats after choosing an enemy's bonus Mission", () => {
    const state = stateFor();
    state.phase = "sector";
    const sectorId = state.players[0]!.sectorId;
    state.sectors = state.sectors.map((sector) => ({ ...sector, tileChallenges: [] }));
    state.threatDrawBags = { red: { cycle: 1, remainingCardIds: ["ash-rat-skitter"] } };
    state.tileArrivalThreatProgress = { arrivalId: "mission-arrival", seatId: "seat-1", sectorId,
      threatLanes: ["red"], threatRuleIds: ["threat:0:red"], nextThreatIconIndex: 0 };
    const server = serverFor(state);
    const internals = server as unknown as MissionServer;
    internals.queueMissionReward({ ownerSeatId: "seat-1", sourceKind: "battle", sourceId: "red-maw-raiders", sourceTitle: "Raiders" });
    internals.runAutomaticPhases("seat-1");
    const offer = server.getState().pendingMissionSelection!;
    expect(offer.continuationPhase).toBe("sector");
    expect(send(server, { type: "SELECT_REPLACEMENT_CONTRACT", seatId: "seat-1", selectionId: offer.id, contractId: offer.optionIds[0]! })).toEqual([]);
    expect(server.getState().currentEncounter?.id).toBe("ash-rat-skitter");
    expect(server.getState().eventLog.some((event) => (event as { type?: string }).type === "TURN_COMPLETED")).toBe(false);
  });

  it("rejects a replacement offer if that Mission has since been completed", () => {
    const server = serverFor(stateFor());
    const internals = server as unknown as MissionServer;
    internals.queueMissionReward({ ownerSeatId: "seat-1", sourceKind: "tile", sourceId: "transit-gate", sourceTitle: "Gate" });
    internals.runAutomaticPhases("seat-1");
    const offer = server.getState().pendingMissionSelection!;
    server.getState().players[0]!.character.completedContracts = [offer.optionIds[0]!];
    expect(send(server, { type: "SELECT_REPLACEMENT_CONTRACT", seatId: "seat-1", selectionId: offer.id, contractId: offer.optionIds[0]! })).toHaveLength(1);
    expect(getActiveMissions(server.getState().players[0]!.character)).toEqual([]);
  });

  it.each(["buy-gear", "buy-supplies"])("Equipment Requisition recognizes the correct shop purchase: %s", (serviceId) => {
    const state = stateFor("compact-equipment-requisition");
    state.players[0]!.sectorId = "kettleward-foundry";
    state.players[0]!.character.currentSpaceId = "kettleward-foundry";
    state.players[0]!.character.salvage = 30;
    const server = serverFor(state);
    expect(send(server, { type: "SHOP_SERVICE_REQUESTED", seatId: "seat-1", serviceId })).toEqual([]);
    const stock = server.getState().shopStockReveals.find((entry) => entry.serviceId === serviceId)!;
    expect(stock?.stockIds.length).toBeGreaterThan(0);
    expect(send(server, { type: "SHOP_PURCHASE_REQUESTED", seatId: "seat-1", cardId: stock.stockIds[0]! })).toEqual([]);
    const player = server.getState().players[0]!;
    expect(player.character.completedContracts?.includes("compact-equipment-requisition")).toBe(serviceId === "buy-gear");
    if (serviceId === "buy-supplies") expect(getActiveMissions(player.character)[0]!.progress).toBe(0);
  });

  it("Foundry Proof Marks requires two actual repairs and cannot farm a ready item's repair action", () => {
    const state = stateFor("dominion-foundry-proof-marks");
    const player = state.players[0]!;
    player.sectorId = "kettleward-foundry";
    player.character.currentSpaceId = "kettleward-foundry";
    player.character.salvage = 20;
    player.character.heldGear = ["mirror-reroll-token", "red-march-warbell"].map((id) => ({ ...loadGear().get(id)!, instanceId: id, exhausted: true }));
    const server = serverFor(state);
    const repair = (itemInstanceId: string) => send(server, { type: "SHOP_SERVICE_REQUESTED", seatId: "seat-1", serviceId: "repair-gear", itemInstanceId });
    expect(repair("mirror-reroll-token")).toEqual([]);
    expect(getActiveMissions(server.getState().players[0]!.character)[0]?.progress).toBe(1);
    expect(repair("mirror-reroll-token")).toHaveLength(1);
    expect(getActiveMissions(server.getState().players[0]!.character)[0]?.progress).toBe(1);
    expect(repair("red-march-warbell")).toEqual([]);
    expect(server.getState().players[0]!.character.completedContracts).toContain("dominion-foundry-proof-marks");
  });
});
