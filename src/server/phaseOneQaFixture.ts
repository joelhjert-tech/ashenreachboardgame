import { getBoardSpace } from "../game/data/boardSpaces.js";
import type { GameState } from "../game/schema/session.schema.js";

export type PhaseOneQaFixture =
  | { kind: "route"; stage: "first" | "duplicate" | "ordered-wrong" | "final" | "completion-ready" }
  | { kind: "shop"; stage: "wrong-shop" | "valid-first" | "valid-final" | "completion-ready" }
  | { kind: "relic-trade"; completedContracts: 0 | 1 | 2 | 3 };

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

export function applyPhaseOneQaFixture(state: GameState, seatId: string, fixture: PhaseOneQaFixture): void {
  if (state.status !== "active") throw new Error("QA fixture requires an active session");
  clearResolution(state);
  state.sequence += 1;
  state.activeSeatIndex = Math.max(0, state.turnOrder.indexOf(seatId));

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
