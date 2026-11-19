import { describe, expect, it } from "vitest";
import type { ContractCard, GearItem, PhonePatchPayload, PublicMoveDestination } from "../../client/shared/types.js";
import { chooseAiRivalIntent } from "../aiRival.js";
import { createPhoneProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function trainingState() {
  const state = createInitialSessionState("rival-tactics", "single-player");
  state.status = "active";
  state.phase = "broadcast";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.players[0]!.character.stats = { command: 3, grit: 3, signal: 3, guile: 3, forge: 3 };
  state.players[0]!.character.trophies = 4;
  return state;
}

function patch(): PhonePatchPayload {
  return createPhoneProjection(trainingState(), "seat-1") as unknown as PhonePatchPayload;
}

function gear(id: string, slot: GearItem["slot"], amount: number, extra: Partial<GearItem> = {}): GearItem {
  return { id, name: id, slot, statBonus: { stat: "grit", amount }, ...extra };
}

function encounterPatch(items: GearItem[], equipped: Partial<Record<GearItem["slot"], string>> = {}): PhonePatchPayload {
  const result = patch();
  result.phase = "action";
  result.encounter = { id: "test-enemy", title: "Test enemy", cardType: "enemy", flavor: "", difficulty: 8, stat: "grit" };
  result.self!.character.heldGear = items;
  result.self!.character.equippedGear = { weapon: null, armor: null, utility: null, ...equipped };
  result.self!.character.equippedGearInstances = { weapon: null, armor: null, utility: null };
  return result;
}

function destination(sectorId: string, extra: Partial<PublicMoveDestination> = {}): PublicMoveDestination {
  return { sectorId, name: sectorId, ring: "outer", distance: 2, route: [sectorId], routeId: `route:${sectorId}`,
    tags: [], threatIcons: [], ruleText: "", faceUpThreats: [], occupants: [], strategicTags: [], ...extra };
}

function navigationPatch(objective: ContractCard["objective"], destinations: PublicMoveDestination[]): PhonePatchPayload {
  const observation = patch();
  observation.phase = "navigation";
  observation.innerApproach = null;
  observation.movementPlanner = { active: true, movementValue: 2, movementRevision: 7,
    currentSectorId: "origin", currentSectorName: "Origin", destinations };
  observation.self!.character.activeContracts = [{ contractId: "route-contract", progress: 0 }];
  observation.activeContractCards = [{ id: "route-contract", name: "Route Contract", factionGiver: "", text: "", objective }];
  return observation;
}

describe("AI rival contract navigation", () => {
  it("values a public Throne claim sector over a generic middle-ring reward", () => {
    const observation = navigationPatch({ type: "defeatCount", target: 1 }, [
      destination("middle_relic_cache", { ring: "middle", strategicTags: ["reward"] }),
      destination("red-lantern-trenches", { ring: "middle", strategicTags: ["danger"] })
    ]);
    observation.self!.character.activeContracts = [];
    observation.activeScenario = { ...observation.activeScenario!, id: "scenario_throne_of_ash" };
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "red-lantern-trenches" });
  });
  const objective: ContractCard["objective"] = { type: "multiStopRoute", ordered: true, targets: [
    { id: "first", type: "spaceId", value: "first-stop", label: "First" },
    { id: "last", type: "spaceId", value: "last-stop", label: "Last" }
  ] };

  it("seeks a stocked Artifact cache, then routes its carrier to an inward crossing", () => {
    const observation = navigationPatch(objective, [
      destination("middle_relic_cache", { ring: "middle", strategicTags: ["reward"] }),
      destination("middle_guardian_span", { ring: "middle" })
    ]);
    observation.turnOrder = ["seat-2", "seat-1"];
    observation.activeSeatIndex = 1;
    observation.activeContractCards = [];
    observation.self!.character.heldGear = [];
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "middle_relic_cache" });
    observation.self!.character.heldGear.push(gear("test-relic", "utility", 1, { tier: "artifact" }));
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "middle_guardian_span" });
  });

  it("prefers the next ordered contract stop over generic rewards and later stops", () => {
    const observation = navigationPatch(objective, [
      destination("reward", { strategicTags: ["reward"] }),
      destination("last-stop"), destination("first-stop")
    ]);
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({
      type: "MOVE_REQUESTED", toSectorId: "first-stop", movementRevision: 7, routeId: "route:first-stop"
    });
  });

  it("moves on from completed route stops and stops chasing a completed contract", () => {
    const observation = navigationPatch(objective, [destination("first-stop"), destination("last-stop"),
      destination("reward", { strategicTags: ["reward"] })]);
    observation.self!.character.activeContracts![0] = { contractId: "route-contract", progress: 1, completedTargetIds: ["first"] };
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "last-stop" });
    observation.self!.character.activeContracts![0] = { contractId: "route-contract", progress: 2, completedTargetIds: ["first", "last"] };
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "reward" });
  });

  it("cannot choose a blocked contract destination or borrow another operative's contract", () => {
    const observation = navigationPatch(objective, [destination("first-stop", { disabledReason: "Gate closed" }),
      destination("reward", { strategicTags: ["reward"] })]);
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "reward" });
    observation.movementPlanner!.destinations[0]!.disabledReason = undefined;
    observation.self!.character.activeContracts = [];
    observation.self!.character.activeContract = null;
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "reward" });
  });

  it("uses challenge identity as well as the sector when pursuing a challenge contract", () => {
    const observation = navigationPatch({ type: "tileChallengeResolved", target: 1, requireSuccess: true,
      challengeId: "relay-test", label: "Clear the relay" }, [
      destination("reward", { strategicTags: ["reward"], challenges: [{ id: "other-test", challengeType: "hazard", tags: [] }] }),
      destination("relay", { challenges: [{ id: "relay-test", challengeType: "anomaly", tags: [] }] })
    ]);
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "relay" });
  });

  it("preserves Void Key charges when an equally useful free route is available", () => {
    const observation = navigationPatch(objective, [
      destination("a-key", { voidKeyPrompt: { instanceId: "key", currentCharges: 1, maxCharges: 1, chargeCost: 1 } }),
      destination("z-free")
    ]);
    const before = JSON.stringify(observation);
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "z-free" });
    observation.movementPlanner!.destinations.reverse();
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ toSectorId: "z-free" });
    observation.movementPlanner!.destinations.reverse();
    expect(JSON.stringify(observation)).toBe(before);
  });
});

describe("AI rival tactical progression", () => {
  it("does not replace a fair die with a low Edge value", () => {
    const observation = encounterPatch([]);
    observation.activeResolution = { id: "edge-setup", playerId: "seat-1", source: "threat", stage: "battle_setup" };
    observation.edgeHand = { canCommit: true, resolutionId: "edge-setup", cards: [
      { id: "one", edgeValue: 1 }, { id: "three", edgeValue: 3 }
    ] } as PhonePatchPayload["edgeHand"];
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
    observation.edgeHand!.cards[1]!.edgeValue = 4;
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "PLAY_EDGE_CARD", cardId: "three", mode: "commit-value" });
  });

  it("waits for animated dice and another controller's opposing roll", () => {
    const observation = encounterPatch([]);
    observation.activeResolution = { id: "rolling", playerId: "seat-1", source: "threat", stage: "dice_roll" };
    expect(chooseAiRivalIntent(observation, "seat-1")).toBeNull();
    observation.activeResolution = null;
    observation.pendingEnemyRoll = { encounterCardId: "test-enemy", encounterTitle: "Test enemy",
      fighterSeatId: "seat-1", assignedRollerSeatId: "seat-2", stat: "grit" } as PhonePatchPayload["pendingEnemyRoll"];
    expect(chooseAiRivalIntent(observation, "seat-1")).toBeNull();
  });

  it("trains in Setup before an otherwise empty action is handed off", () => {
    const state = trainingState();
    state.phase = "action";
    const observation = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    observation.shopEncounter = null;
    observation.privateRivalry = null;
    observation.requiredAction = { ...observation.requiredAction!, allowedCommand: "finish-actions", canAct: true };
    expect(chooseAiRivalIntent(observation, "seat-1")?.reasonCode).toBe("setup-training");
  });

  it("advances to a viable Mirror finale and retreats when Reflection pressure would repel it", () => {
    const state = trainingState();
    state.phase = "navigation";
    state.activeScenarioId = "scenario_mirror_of_false_heroes";
    state.reflectionPressureThreshold = 4;
    const player = state.players[0]!;
    player.sectorId = player.character.currentSpaceId = "inner_gate_of_cinders";
    player.innerApproachProgress = { pathId: "breach-road", clearedSectorIds: ["inner_gate_of_cinders"] };
    function nextDestination(pressure: number) {
      state.scenarioProgress.mirrorPressure = pressure;
      const observation = createPhoneProjection(state, player.seatId) as unknown as PhonePatchPayload;
      return chooseAiRivalIntent(observation, player.seatId)?.intent;
    }
    expect(nextDestination(3)).toMatchObject({ type: "INNER_APPROACH_MOVE_REQUESTED", destinationSectorId: "center_cinder_gate" });
    expect(nextDestination(4)).toMatchObject({ type: "INNER_APPROACH_MOVE_REQUESTED", destinationSectorId: "the-bone-meridian" });
  });

  it("explores its current tier instead of bouncing back through an outward gate", () => {
    const state = trainingState();
    state.phase = "navigation";
    const observation = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    observation.movementPlanner = null;
    observation.innerApproach = null;
    observation.tierTransitions = { revision: 1, options: [{ sectorId: "outer-gate", direction: "outward" }] } as PhonePatchPayload["tierTransitions"];
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("MOVEMENT_ROLL_REQUESTED");
    // The Core has no normal movement roll: its return gate is the legal exit.
    observation.self!.sectorId = "center_cinder_gate";
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("TIER_TRANSITION_REQUESTED");
  });

  it.each([{ index: 0, level: 4 }, { index: 1, level: 3 }])("leaves pressure headroom before the next loss or round tick: %j", ({ index, level }) => {
    const observation = patch();
    observation.phase = "action";
    observation.turnOrder = index === 0 ? ["seat-1", "seat-2"] : ["seat-2", "seat-1"];
    observation.activeSeatIndex = index;
    observation.escalationLevel = level;
    observation.escalationThreshold = 6;
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("STABILIZE_REQUESTED");
  });

  it("trains at Experience using a server-accepted trophy transaction", () => {
    const state = trainingState();
    const observation = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    const choice = chooseAiRivalIntent(observation, "seat-1");
    expect(choice?.reasonCode).toBe("experience-training");
    if (choice?.intent.type !== "RAISE_STAT_REQUESTED") throw new Error("Expected training");
    const server = new GameRoomServer(state);
    server.resolveRaiseStatIntent(choice.intent);
    expect(server.getState().players[0]!.character.stats[choice.intent.stat]).toBe(4);
    expect(server.getState().players[0]!.character.trophies).toBe(0);
    expect(server.getState().phase).toBe("broadcast");
    expect(server.getState().eventLog).toContainEqual(expect.objectContaining({ type: "STAT_RAISED" }));
  });

  it("passes once trophies cannot fund an upgrade", () => {
    const observation = patch();
    observation.self!.character.trophies = 0;
    expect(chooseAiRivalIntent(observation, "seat-1")?.reasonCode).toBe("end-turn");
  });

  it("repairs weak skills before specializing and respects the skill cap", () => {
    const observation = patch();
    observation.self!.character.stats.signal = 1;
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "RAISE_STAT_REQUESTED", stat: "signal" });
    observation.self!.character.stats = { command: 10, grit: 10, signal: 10, guile: 10, forge: 10 };
    observation.self!.character.trophies = 100;
    expect(chooseAiRivalIntent(observation, "seat-1")?.reasonCode).toBe("end-turn");
  });

  it("preserves the trophy agenda's target balance", () => {
    const observation = patch();
    observation.privateRivalry = {
      active: true, mode: "rivalry", secrecy: "private", revealState: "hidden", tableWarning: "", recentPrivateNotes: [],
      reveal: { state: "hidden", available: false, label: "", hint: "" },
      objective: { id: "claim-trophies", title: "Ledger", summary: "", progressLabel: "Trophies", progress: 4, target: 3, stakes: "" }
    };
    expect(chooseAiRivalIntent(observation, "seat-1")?.reasonCode).toBe("end-turn");
    observation.self!.character.trophies = 7;
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "RAISE_STAT_REQUESTED", stat: "grit" });
  });

  it("equips useful armor even when the strongest weapon is already equipped", () => {
    const observation = encounterPatch([gear("weapon", "weapon", 4), gear("armor", "armor", 2)], { weapon: "weapon" });
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "EQUIP_GEAR", gearId: "armor" });
    observation.self!.character.equippedGear.armor = "armor";
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
  });

  it("compares actual equipped instances when duplicate gear has different bonuses", () => {
    const observation = encounterPatch([
      gear("blade", "weapon", 1, { instanceId: "weak" }),
      gear("blade", "weapon", 4, { instanceId: "strong" }),
      gear("alternative", "weapon", 2, { instanceId: "alternative" })
    ], { weapon: "blade" });
    observation.self!.character.equippedGearInstances!.weapon = "strong";
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
  });

  it("does not equip battle-only bonuses for hazards or consumables as passive gear", () => {
    const observation = encounterPatch([
      gear("battle-armor", "armor", 4, { effectModel: "conditional", conditionType: "battle" }),
      gear("supply", "utility", 5, { effectModel: "consumable" }),
      gear("tool", "utility", 1)
    ]);
    observation.encounter!.cardType = "hazard";
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "EQUIP_GEAR", gearId: "tool" });
  });

  it("replaces suppressed equipment instead of relying on its printed bonus", () => {
    const observation = encounterPatch([
      gear("blocked", "weapon", 4, { instanceId: "blocked" }),
      gear("backup", "weapon", 1, { instanceId: "backup" })
    ], { weapon: "blocked" });
    observation.self!.character.equippedGearInstances!.weapon = "blocked";
    observation.equipmentSuppressions = [{ sourceThreatId: "relay-husk", itemInstanceId: "blocked", itemCatalogId: "blocked", mode: "duringNextBattle", active: true }];
    expect(chooseAiRivalIntent(observation, "seat-1")?.intent).toMatchObject({ type: "EQUIP_GEAR", instanceId: "backup" });
  });
});
