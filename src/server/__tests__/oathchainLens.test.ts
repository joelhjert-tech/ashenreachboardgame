import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import type { ContractCard } from "../../game/schema/contract.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection, deriveOathchainTargets, GameRoomServer, getOathchainContractSignature } from "../roomServer.js";

const reward = { type: "gain_salvage", amount: 1 } as const;

function contract(objective: ContractCard["objective"], id = "lens-contract"): ContractCard {
  return { id, name: "Lens Contract", factionGiver: "Glass Choir", text: "Follow the visible promise.", objective, reward };
}

function stateFor(card: ContractCard): GameState {
  const state = createInitialSessionState("oathchain-test", "single-player");
  const lens = loadGear().get("oathchain-lens")!;
  state.status = "active";
  state.phase = "action";
  state.availableContracts = [card];
  state.players[0] = {
    ...state.players[0]!,
    private: { ...state.players[0]!.private, activeOathchainReveal: null },
    character: {
      ...state.players[0]!.character,
      activeContract: { contractId: card.id, progress: 0 },
      heldGear: [{ ...lens, instanceId: "lens-a", currentCharges: 2 }],
      equippedGear: { ...state.players[0]!.character.equippedGear, utility: lens.id }
    }
  };
  return state;
}

describe("Oathchain Lens — Trace the Promise", () => {
  it("uses exact bounded charged metadata and information-only timing", () => {
    const lens = loadGear().get("oathchain-lens")!;
    expect(lens).toMatchObject({ name: "Oathchain Lens", effectModel: "charged", maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "traceThePromise", activationTiming: ["action"] });
    expect(lens.activeText).toContain("does not reveal hidden cards or agendas");
  });

  it("derives only typed targets supported by each Contract objective", () => {
    const spaceState = stateFor(contract({ type: "spaceTextResolved", effectKey: "outer_saltCrossing", label: "Resolve the engine", target: 1 }));
    expect(deriveOathchainTargets(spaceState, spaceState.players[0]!, spaceState.availableContracts[0]!)).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "sector", sectorId: "votive-engine-room" })]));

    const ordered = contract({ type: "multiStopRoute", ordered: true, targets: [{ id: "first", type: "spaceId", value: "ashwake-crossing", label: "Ashwake" }, { id: "second", type: "spaceId", value: "votive-engine-room", label: "Votive" }] });
    const orderedState = stateFor(ordered);
    expect(deriveOathchainTargets(orderedState, orderedState.players[0]!, ordered)).toEqual([expect.objectContaining({ kind: "routeStop", id: "first" })]);

    const unordered = { ...ordered, objective: { ...ordered.objective, ordered: false } } as ContractCard;
    const unorderedState = stateFor(unordered);
    expect(deriveOathchainTargets(unorderedState, unorderedState.players[0]!, unordered)).toHaveLength(2);

    const shop = contract({ type: "shopTransaction", action: "buyEquipment", requiredSectorId: "outer_waymarket", requiredCount: 1, label: "Buy equipment" });
    const shopState = stateFor(shop);
    expect(deriveOathchainTargets(shopState, shopState.players[0]!, shop)).toEqual([expect.objectContaining({ kind: "shopAction", sectorId: "outer_waymarket" })]);

    const challenge = shopState.sectors.flatMap((sector) => sector.tileChallenges ?? [])[0]!;
    const challengeContract = contract({ type: "tileChallengeResolved", challengeId: challenge.id, sectorId: challenge.sectorId, target: 1, label: "Resolve challenge" });
    const challengeState = stateFor(challengeContract);
    expect(deriveOathchainTargets(challengeState, challengeState.players[0]!, challengeContract)).toEqual([expect.objectContaining({ kind: "tileChallenge", id: challenge.id, sectorId: challenge.sectorId })]);

    const defeat = contract({ type: "defeatCount", target: 1 });
    const defeatState = stateFor(defeat);
    defeatState.currentEncounter = [...loadThreatCards().values()][0]!;
    defeatState.lastOutcomeSummary = { seatId: "seat-1", movedToSectorId: defeatState.players[0]!.sectorId, encounterCardId: null, encounterTitle: null, encounterCardType: null, checkStat: null, die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: null, success: null, replacementCharacterId: null, summary: "Visible threat" };
    expect(deriveOathchainTargets(defeatState, defeatState.players[0]!, defeat)).toEqual([expect.objectContaining({ kind: "threat", sectorId: defeatState.players[0]!.sectorId })]);
  });

  it("spends one exact-instance charge atomically and projects details only to the owner", () => {
    const card = contract({ type: "spaceTextResolved", effectKey: "outer_saltCrossing", label: "Resolve the engine", target: 1 });
    const state = stateFor(card);
    const signature = getOathchainContractSignature(state.players[0]!, card);
    const server = new GameRoomServer(state);
    const action = (server as any).createGearUseAction("seat-1", "oathchain-lens", "now", "lens-a", undefined, undefined, undefined, undefined, undefined, undefined, signature);
    const result = reduceGameState(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
    expect(result.state.players[0]!.character.activeContract).toEqual({ contractId: card.id, progress: 0 });
    expect(result.state.players[0]!.character.completedContracts ?? []).toEqual([]);
    expect(result.state.players[0]!.private.activeOathchainReveal?.revealedTargets[0]?.kind).toBe("sector");
    expect((createPhoneProjection(result.state, "seat-1") as any).activeOathchainReveal.contractName).toBe("Lens Contract");
    expect((createPhoneProjection(result.state, "seat-2") as any).activeOathchainReveal).toBeNull();
    expect(JSON.stringify(createTvProjection(result.state))).not.toContain("activeOathchainReveal");
    expect(JSON.stringify(createTvProjection(result.state))).not.toContain("Private Lens Reading");
    expect(result.state.lastOutcomeSummary?.summary).toBe("Oathchain Lens consulted.");
  });

  it("expires at turn end and canonical Contract completion clears the reveal", () => {
    const card = contract({ type: "spaceTextResolved", effectKey: "outer_saltCrossing", label: "Resolve the engine", target: 1 });
    const state = stateFor(card);
    const signature = getOathchainContractSignature(state.players[0]!, card);
    const server = new GameRoomServer(state);
    const action = (server as any).createGearUseAction("seat-1", "oathchain-lens", "now", "lens-a", undefined, undefined, undefined, undefined, undefined, undefined, signature);
    const used = reduceGameState(state, action);
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    const ended = reduceGameState({ ...used.state, phase: "broadcast" }, { type: "TURN_COMPLETED", seatId: "seat-1", createdAt: "end" });
    expect(ended.ok && ended.state.players[0]!.private.activeOathchainReveal).toBeNull();

    const completable = { ...used.state, players: used.state.players.map((player) => player.seatId === "seat-1" ? { ...player, character: { ...player.character, activeContract: { contractId: card.id, progress: 1 } } } : player) };
    const completed = reduceGameState(completable, { type: "COMPLETE_CONTRACT", seatId: "seat-1", contractId: card.id, contract: card, createdAt: "complete" });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.state.players[0]!.private.activeOathchainReveal).toBeNull();
    expect(completed.state.players[0]!.character.completedContracts).toContain(card.id);
    expect(completed.state.players[0]!.character.activeContract).toBeNull();
  });

  it("rejects stale and duplicate Contract signatures without spending another charge", () => {
    const card = contract({ type: "spaceTextResolved", effectKey: "outer_saltCrossing", label: "Resolve the engine", target: 1 });
    const state = stateFor(card);
    const signature = getOathchainContractSignature(state.players[0]!, card);
    const server = new GameRoomServer(state);
    expect(() => (server as any).createGearUseAction("seat-1", "oathchain-lens", "now", "lens-a", undefined, undefined, undefined, undefined, undefined, undefined, "stale")).toThrow(/Contract changed/);
    const action = (server as any).createGearUseAction("seat-1", "oathchain-lens", "now", "lens-a", undefined, undefined, undefined, undefined, undefined, undefined, signature);
    const used = reduceGameState(state, action);
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    const reconnected = new GameRoomServer(JSON.parse(JSON.stringify(used.state)) as GameState);
    expect(() => (reconnected as any).createGearUseAction("seat-1", "oathchain-lens", "later", "lens-a", undefined, undefined, undefined, undefined, undefined, undefined, signature)).toThrow(/already active/);
    expect(used.state.players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
  });
});
