import { getBoardSpace } from "../game/data/boardSpaces.js";
import { loadGear } from "../game/content/gear.js";
import { loadThreatCards } from "../game/content/threats.js";
import { loadFollowers } from "../game/content/followers.js";
import type { GameState } from "../game/schema/session.schema.js";

export type PhaseOneQaFixture =
  | { kind: "route"; stage: "first" | "duplicate" | "ordered-wrong" | "final" | "completion-ready" }
  | { kind: "shop"; stage: "wrong-shop" | "valid-first" | "valid-final" | "completion-ready" }
  | { kind: "movement-journey"; stage: "ashen-chapel"; withChoirLantern?: boolean }
  | { kind: "relic-trade"; completedContracts: 0 | 1 | 2 | 3 }
  | { kind: "follower"; stage: "acquired" | "used" | "reconnected" }
  | {
      kind: "phone-battle";
      stage: "encounter" | "battle-setup" | "pending-enemy-roll" | "rolled-result" | "success" | "defeat";
    };

const routeContractId = "choir-echo-triangulation";
const orderedRouteContractId = "compact-three-lantern-circuit";
const shopContractId = "dominion-foundry-proof-marks";

function clearResolution(state: GameState): void {
  state.currentEncounter = null;
  state.pendingEnemyRoll = null;
  state.pendingEffect = null;
  state.activeResolution = null;
  state.resolutionSource = null;
  state.lastOutcomeSummary = null;
  state.shopStockReveals = [];
}

function placePlayer(state: GameState, seatId: string, sectorId: string): void {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
  player.sectorId = sectorId;
  player.character.currentSpaceId = sectorId;
  clearSector(state, sectorId);
}

function clearSector(state: GameState, sectorId: string): void {
  const sector = state.sectors.find((entry) => entry.id === sectorId);
  if (!sector) throw new Error(`QA fixture cannot find sector ${sectorId}`);
  sector.threatIcons = [];
  sector.encounterDecks = { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] };
}

function setContract(state: GameState, seatId: string, contractId: string, progress: number, completedTargetIds: string[] = []): void {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
  if (!state.availableContracts.some((entry) => entry.id === contractId)) throw new Error(`QA fixture cannot find contract ${contractId}`);
  player.character.activeContract = { contractId, progress, completedTargetIds };
}

function setPhoneBattleFixture(
  state: GameState,
  seatId: string,
  stage: Extract<PhaseOneQaFixture, { kind: "phone-battle" }>["stage"]
): void {
  const threat = loadThreatCards().get("lantern-ash-ghoul");
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!threat || threat.cardType !== "enemy" || !player) throw new Error("QA fixture cannot create phone battle");

  state.phase = stage === "rolled-result" || stage === "success" || stage === "defeat" ? "resolution" : "action";
  state.currentEncounter = threat;
  state.pendingEnemyRoll = null;
  state.lastOutcomeSummary = null;
  state.activeResolution = null;
  state.resolutionSource = "encounter";
  player.character.wounds = stage === "defeat" ? 1 : 0;

  if (stage === "encounter") {
    return;
  }

  state.activeResolution = {
    id: `qa-phone-battle:${seatId}:lantern-ash-ghoul`,
    playerId: seatId,
    source: "threat",
    stage: stage === "battle-setup" || stage === "pending-enemy-roll" ? "battle_setup" : stage === "rolled-result" ? "roll_result" : "outcome_summary",
    card: {
      id: threat.id,
      title: threat.title,
      type: threat.cardType,
      flavor: threat.flavor,
      artType: "threat"
    },
    battle: {
      enemyName: threat.enemyName ?? threat.title,
      stat: threat.stat,
      difficulty: 12,
      modifiers: [{ label: "Base Grit", value: 5 }]
    },
    ...(stage === "battle-setup" || stage === "pending-enemy-roll"
      ? {}
      : {
          roll: {
            dice: stage === "defeat" ? [1, 1] : [3, 4],
            baseTotal: stage === "defeat" ? 2 : 7,
            modifierTotal: 5,
            finalTotal: stage === "defeat" ? 7 : 12,
            target: 12,
            success: stage !== "defeat"
          }
        }),
    ...(stage === "success"
      ? {
          outcome: {
            title: "Threat defeated",
            text: "You end the ghoul quietly and keep the lamp burning.",
            effects: ["Lantern-Ash Ghoul added to the Trophy Pile.", "The ward gains 1 seal token."]
          }
        }
      : stage === "defeat"
        ? {
            outcome: {
              title: "Operative defeated",
              text: "The ghoul drives you back from the lamp.",
              effects: ["Suffer 1 Wound.", "Lantern-Ash Ghoul remains on this space."]
            }
          }
        : {})
  };

  if (stage === "pending-enemy-roll") {
    state.pendingEnemyRoll = {
      fighterSeatId: seatId,
      assignedRollerSeatId: seatId,
      encounterCardId: threat.id,
      encounterTitle: threat.title,
      stat: threat.stat
    };
    return;
  }

  if (stage === "success" || stage === "defeat") {
    const success = stage === "success";
    state.lastOutcomeSummary = {
      seatId,
      movedToSectorId: player.character.currentSpaceId,
      encounterCardId: threat.id,
      encounterTitle: threat.title,
      encounterCardType: "enemy",
      checkStat: threat.stat,
      die1: success ? 3 : 1,
      die2: success ? 4 : 1,
      statBonus: 5,
      checkTotal: success ? 12 : 7,
      difficulty: threat.difficulty,
      enemyRollerSeatId: null,
      enemyDie1: 6,
      enemyDie2: 6,
      enemyBonus: 0,
      enemyTotal: 12,
      success,
      summary: success
        ? "Lantern-Ash Ghoul defeated. +1 trophy. The ward gains 1 seal token."
        : "Lantern-Ash Ghoul remains. Suffer 1 Wound.",
    };
  }
}

export function applyPhaseOneQaFixture(state: GameState, seatId: string, fixture: PhaseOneQaFixture): void {
  if (state.status !== "active") throw new Error("QA fixture requires an active session");
  clearResolution(state);
  state.sequence += 1;
  state.activeSeatIndex = Math.max(0, state.turnOrder.indexOf(seatId));

  if (fixture.kind === "phone-battle") {
    setPhoneBattleFixture(state, seatId, fixture.stage);
    return;
  }

  if (fixture.kind === "follower") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    const follower = loadFollowers().get("lucy-hell-puppy");
    if (!player || !follower) throw new Error("QA fixture cannot attach Lucy");
    state.phase = "action";
    player.character.followers = [{
      ...follower,
      instanceId: "qa-follower:lucy-hell-puppy",
      exhausted: fixture.stage === "used"
    }];
    state.lastOutcomeSummary = fixture.stage === "acquired" ? {
      seatId,
      movedToSectorId: player.character.currentSpaceId,
      encounterCardId: "artifact-lucy-hell-puppy",
      encounterTitle: "Lucy, Hell Puppy",
      encounterCardType: null,
      checkStat: null,
      die1: null,
      die2: null,
      statBonus: null,
      checkTotal: null,
      difficulty: null,
      enemyRollerSeatId: null,
      enemyDie1: null,
      enemyDie2: null,
      enemyBonus: null,
      enemyTotal: null,
      success: true,
      summary: "Lucy, Hell Puppy joined the active operative as a legendary follower."
    } : null;
    return;
  }

  if (fixture.kind === "relic-trade") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.movementRolls = undefined;
    player.character.completedContracts = Array.from(
      { length: fixture.completedContracts },
      (_, index) => `qa-completed-contract-${index + 1}`
    );
    placePlayer(state, seatId, "outer_surgery_tent");
    return;
  }

  if (fixture.kind === "movement-journey") {
    state.phase = "navigation";
    state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 2 };
    state.pendingTileChallenge = null;
    placePlayer(state, seatId, "scorched-road");
    if (fixture.withChoirLantern) {
      const player = state.players.find((entry) => entry.seatId === seatId);
      const lantern = loadGear().get("choir-lantern");
      if (!player || !lantern) throw new Error("QA fixture cannot equip Choir Lantern");
      player.character.heldGear = [
        ...player.character.heldGear.filter((item) => item.id !== lantern.id),
        { ...lantern, instanceId: "qa-choir-lantern", currentCharges: 2, maxCharges: 2 }
      ];
      player.character.equippedGear.utility = lantern.id;
    }
    return;
  }

  // Preserve legitimately earned progress while browser QA exits a movement
  // or shop prompt to exercise the normal mission-completion action.
  if (fixture.stage === "completion-ready") {
    state.phase = "action";
    state.movementRolls = undefined;
    return;
  }

  if (fixture.kind === "route") {
    state.phase = "navigation";
    state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 1 };
    if (fixture.stage === "ordered-wrong") {
      setContract(state, seatId, orderedRouteContractId, 0);
      placePlayer(state, seatId, "north-dock-bastion");
      clearSector(state, "outer_waymarket");
      return;
    }
    if (fixture.stage === "first") {
      setContract(state, seatId, routeContractId, 0);
      placePlayer(state, seatId, "ashwake-crossing");
      clearSector(state, "glassmere-spindle");
      return;
    }
    if (fixture.stage === "duplicate") {
      setContract(state, seatId, routeContractId, 1, ["echo-a"]);
      placePlayer(state, seatId, "ashwake-crossing");
      clearSector(state, "glassmere-spindle");
      return;
    }
    setContract(state, seatId, routeContractId, 2, ["echo-a", "echo-b"]);
    const sunken = state.sectors.find((entry) => entry.id === "sunken-pier");
    const neighbor = sunken?.neighbors[0];
    if (!neighbor || !getBoardSpace(neighbor)) throw new Error("QA fixture cannot find a neighbor for Sunken Pier");
    placePlayer(state, seatId, neighbor);
    clearSector(state, "sunken-pier");
    return;
  }

  state.phase = "action";
  state.movementRolls = undefined;
  const progress = fixture.stage === "valid-final" ? 1 : 0;
  setContract(state, seatId, shopContractId, progress);
  const player = state.players.find((entry) => entry.seatId === seatId)!;
  player.character.salvage = Math.max(player.character.salvage ?? 0, 20);
  placePlayer(state, seatId, fixture.stage === "wrong-shop" ? "outer_surgery_tent" : "kettleward-foundry");
}
