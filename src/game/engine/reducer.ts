import type {
  AcceptContractAction,
  CheckRequestedAction,
  CombatRequestedAction,
  CompleteContractAction,
  EscalationAdvancedAction,
  EncounterDrawnAction,
  EnemyRollAssignedAction,
  EquipGearAction,
  EnemyRollRequestedAction,
  GameAction,
  MovementResolvedAction,
  MoveRequestedAction,
  RecruitReplacementAction,
  ResolutionAppliedAction,
  RoundCompletedAction,
  SectorCollapsedAction,
  SpaceTextResolvedAction,
  ScenarioProgressAdvancedAction,
  ScenarioConfrontationRequestedAction,
  ScenarioVictoryAchievedAction,
  StabilizeResolvedAction,
  WoundThresholdReachedAction,
  UnequipGearAction
} from "./actions.js";
import { getHeldGearItem } from "./gear.js";
import { canAdvancePhase, canResolveMovement } from "./phases.js";
import type { EncounterEffect } from "../schema/card.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import type { GearSlot } from "../schema/gear.schema.js";
import { getBoardSpace } from "../data/boardSpaces.js";

export interface ReducerRejection {
  reason: string;
  actionType: GameAction["type"];
}

export interface ReducerSuccess {
  ok: true;
  state: GameState;
  emitted: GameAction[];
}

export interface ReducerFailure {
  ok: false;
  state: GameState;
  rejection: ReducerRejection;
}

export type ReducerResult = ReducerSuccess | ReducerFailure;

function getActiveSeatId(state: GameState): string {
  const activeSeat = state.seats[state.activeSeatIndex];

  if (!activeSeat) {
    throw new Error("Active seat index is out of bounds");
  }

  return activeSeat.seatId;
}

function requirePlayer(state: GameState, seatId: string): PlayerState {
  const player = state.players.find((entry) => entry.seatId === seatId);

  if (!player) {
    throw new Error(`Missing player for seat ${seatId}`);
  }

  return player;
}

function ensureSeatTurn(state: GameState, seatId: string): void {
  if (getActiveSeatId(state) !== seatId) {
    throw new Error(`Seat ${seatId} cannot act outside its turn`);
  }
}

function ensureSeatCanTakeNormalTurnAction(state: GameState, seatId: string): void {
  const player = requirePlayer(state, seatId);

  if (player.character.status === "recalled") {
    throw new Error(`Seat ${seatId} must recruit a replacement before acting`);
  }
}

function getNextActiveSeatIndex(state: GameState): number {
  return (state.activeSeatIndex + 1) % Math.max(state.turnOrder.length, 1);
}

function ensureNeighbor(state: GameState, fromSectorId: string, toSectorId: string): void {
  const sector = state.sectors.find((entry) => entry.id === fromSectorId);

  if (!sector) {
    throw new Error(`Unknown sector ${fromSectorId}`);
  }

  if (!sector.neighbors.includes(toSectorId)) {
    throw new Error(`Sector ${toSectorId} is not reachable from ${fromSectorId}`);
  }
}

function ensureGateProgression(state: GameState, seatId: string, fromSectorId: string, toSectorId: string): void {
  const player = requirePlayer(state, seatId);
  const notes = new Set(player.private.notes);

  if (toSectorId === "inner_veil_rift" && fromSectorId === "middle_guardian_span" && !notes.has("guardian-span-clearance")) {
    throw new Error("Resolve Guardian Span before entering the inner breach");
  }

  if (toSectorId === "center_cinder_gate") {
    if (fromSectorId !== "inner_gate_of_cinders") {
      throw new Error("Only the Gate of Cinders opens the final route into the core chamber");
    }

    if (!notes.has("gate-of-cinders-breached")) {
      throw new Error("Resolve the Gate of Cinders before entering the Cinder Gate");
    }
  }
}

function canResolveSpaceText(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot resolve space text during phase ${state.phase}`);
  }

  if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
    throw new Error("Resolve the current threat before using the sector text");
  }

  const player = requirePlayer(state, seatId);
  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (!boardSpace) {
    throw new Error(`No board text is registered for ${player.character.currentSpaceId}`);
  }

  const sector = state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

  if (!sector) {
    throw new Error(`Unknown sector ${player.character.currentSpaceId}`);
  }

  if ((boardSpace.tier === "outer" || boardSpace.tier === "middle") && sector.encounterDecks.threat.length > 0) {
    throw new Error("Clear the local threat deck before resolving this sector text");
  }
}

function reject(state: GameState, action: GameAction, reason: string): ReducerFailure {
  return {
    ok: false,
    state,
    rejection: {
      reason,
      actionType: action.type
    }
  };
}

function succeed(state: GameState, emitted: GameAction[] = []): ReducerSuccess {
  return {
    ok: true,
    state,
    emitted
  };
}

function summarizeEffect(effect: EncounterEffect, success: boolean | null): string {
  const prefix = success === null ? "Resolution:" : success ? "Success:" : "Failure:";

  switch (effect.type) {
    case "gain_heat":
      return `${prefix} gain ${effect.amount} Heat.`;
    case "lose_heat":
      return `${prefix} lose ${effect.amount} Heat.`;
    case "take_wound":
      return `${prefix} take ${effect.amount} wound${effect.amount === 1 ? "" : "s"}.`;
    case "heal_wound":
      return `${prefix} heal ${effect.amount} wound${effect.amount === 1 ? "" : "s"}.`;
    case "gain_scar":
      return `${prefix} gain scar ${effect.scarId}.`;
    case "gain_gear":
      return `${prefix} gain gear ${effect.gearId}.`;
    case "gain_note":
      return `${prefix} note added: ${effect.text}`;
    case "advance_scenario":
      return `${prefix} advance scenario progress ${effect.progressKey} by ${effect.amount}.`;
    case "sequence":
      return effect.effects.map((entry: EncounterEffect) => summarizeEffect(entry, success)).join(" ");
    default: {
      const exhaustiveCheck: never = effect;
      return exhaustiveCheck;
    }
  }
}

function applyEffectToPlayer(player: PlayerState, effect: EncounterEffect): PlayerState {
  switch (effect.type) {
    case "gain_heat":
      return {
        ...player,
        character: {
          ...player.character,
          heat: player.character.heat + effect.amount
        }
      };
    case "lose_heat":
      return {
        ...player,
        character: {
          ...player.character,
          heat: Math.max(0, player.character.heat - effect.amount)
        }
      };
    case "take_wound":
      return {
        ...player,
        character: {
          ...player.character,
          wounds: player.character.wounds + effect.amount
        }
      };
    case "heal_wound":
      return {
        ...player,
        character: {
          ...player.character,
          wounds: Math.max(0, player.character.wounds - effect.amount)
        }
      };
    case "gain_scar":
      return {
        ...player,
        character: {
          ...player.character,
          scars: [...player.character.scars, effect.scarId]
        }
      };
    case "gain_gear":
      return addHeldGearToPlayer(player, effect);
    case "gain_note":
      return {
        ...player,
        private: {
          ...player.private,
          notes: [...player.private.notes, effect.text]
        }
      };
    case "advance_scenario":
      return player;
    case "sequence":
      return effect.effects.reduce(
        (nextPlayer: PlayerState, entry: EncounterEffect) => applyEffectToPlayer(nextPlayer, entry),
        player
      );
    default: {
      const exhaustiveCheck: never = effect;
      return exhaustiveCheck;
    }
  }
}

function updateActivePlayer(
  state: GameState,
  seatId: string,
  updater: (player: PlayerState) => PlayerState
): PlayerState[] {
  return state.players.map((entry) => (entry.seatId === seatId ? updater(entry) : entry));
}

function addHeldGearToPlayer(
  player: PlayerState,
  effect: Extract<EncounterEffect, { type: "gain_gear" }>
): PlayerState {
  if (!effect.gear) {
    return player;
  }

  const alreadyHeld = player.character.heldGear.some((item) => item.id === effect.gear?.id);

  if (alreadyHeld) {
    return player;
  }

  return {
    ...player,
    character: {
      ...player.character,
      heldGear: [...player.character.heldGear, effect.gear]
    }
  };
}

function applyEffectToState(state: GameState, seatId: string, effect: EncounterEffect): GameState {
  if (effect.type === "sequence") {
    return effect.effects.reduce(
      (nextState: GameState, entry: EncounterEffect) => applyEffectToState(nextState, seatId, entry),
      state
    );
  }

  if (effect.type === "advance_scenario") {
    return {
      ...state,
      scenarioProgress: {
        ...state.scenarioProgress,
        [effect.progressKey]: (state.scenarioProgress[effect.progressKey] ?? 0) + effect.amount
      },
      lastOutcomeSummary: state.lastOutcomeSummary
        ? {
            ...state.lastOutcomeSummary,
            summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(effect, null)}`
          }
        : state.lastOutcomeSummary
    };
  }

  if (effect.type === "gain_gear" && state.activeScenarioId === "scenario_dying_star") {
    return {
      ...state,
      players: updateActivePlayer(state, seatId, (player) => applyEffectToPlayer(player, effect)),
      scenarioProgress: {
        ...state.scenarioProgress,
        starTokens: (state.scenarioProgress.starTokens ?? 10) + 2
      }
    };
  }

  if (effect.type === "gain_gear" && state.activeScenarioId === "scenario_mirror_of_false_heroes") {
    const gainedGearState = {
      ...state,
      players: updateActivePlayer(state, seatId, (player) => applyEffectToPlayer(player, effect))
    };

    return {
      ...gainedGearState,
      players: updateActivePlayer(gainedGearState, seatId, (player) => ({
        ...player,
        character: {
          ...player.character,
          heat: player.character.heat + 1
        }
      }))
    };
  }

  return {
    ...state,
    players: updateActivePlayer(state, seatId, (player) => applyEffectToPlayer(player, effect))
  };
}

function canManageGear(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot manage gear during phase ${state.phase}`);
  }
}

function requireActiveContractCard(state: GameState, seatId: string): ContractCard | null {
  const player = requirePlayer(state, seatId);
  const contractId = player.character.activeContract?.contractId;

  return contractId ? state.availableContracts.find((entry) => entry.id === contractId) ?? null : null;
}

function canResolveScenarioConfrontation(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot resolve a scenario confrontation during phase ${state.phase}`);
  }

  if (state.currentEncounter) {
    throw new Error("Cannot resolve a scenario confrontation while an encounter is active");
  }

  if (state.pendingEnemyRoll) {
    throw new Error("Cannot resolve a scenario confrontation while an enemy roll is pending");
  }

  const player = requirePlayer(state, seatId);

  if (player.character.currentSpaceId !== "center_cinder_gate") {
    throw new Error("Scenario confrontations may only be resolved at the Cinder Gate");
  }
}

export function reduceGameState(state: GameState, action: GameAction): ReducerResult {
  switch (action.type) {
    case "SESSION_STARTED":
      return succeed({
        ...state,
        status: "active",
        winnerSeatId: null,
        phase: requirePlayer(state, getActiveSeatId(state)).character.status === "recalled" ? "action" : "navigation",
        resolutionSource: null,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    case "MOVE_REQUESTED": {
      const moveAction = action as MoveRequestedAction;

      try {
        ensureSeatTurn(state, moveAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, moveAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!canResolveMovement(state.phase)) {
        return reject(state, action, `Cannot move during phase ${state.phase}`);
      }

      const player = requirePlayer(state, moveAction.seatId);

      try {
        ensureNeighbor(state, player.character.currentSpaceId, moveAction.toSectorId);
        ensureGateProgression(state, moveAction.seatId, player.character.currentSpaceId, moveAction.toSectorId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Sector is not reachable");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "MOVEMENT_RESOLVED": {
      const movementAction = action as MovementResolvedAction;

      try {
        ensureSeatTurn(state, movementAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, movementAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "navigation") {
        return reject(state, action, `Cannot resolve movement during phase ${state.phase}`);
      }

      const targetSector = state.sectors.find((entry) => entry.id === movementAction.toSectorId);
      const movedEvent: GameAction = {
        type: "MOVED",
        seatId: movementAction.seatId,
        fromSectorId: movementAction.fromSectorId,
        toSectorId: movementAction.toSectorId,
        createdAt: movementAction.createdAt
      };

      return succeed(
        {
          ...state,
          sequence: state.sequence + 1,
          phase: movementAction.effect ? "resolution" : "sector",
          resolutionSource: movementAction.effect ? "movement" : null,
          pendingEffect: movementAction.effect,
          players: updateActivePlayer(state, movementAction.seatId, (entry) => ({
            ...entry,
            sectorId: movementAction.toSectorId,
            character: {
              ...entry.character,
              currentSpaceId: movementAction.toSectorId
            }
          })),
          lastOutcomeSummary: {
            seatId: movementAction.seatId,
            movedToSectorId: movementAction.toSectorId,
            encounterCardId: null,
            encounterTitle: targetSector?.name ?? movementAction.toSectorId,
            encounterCardType: null,
            checkStat: movementAction.stat,
            die1: movementAction.roll.faces[0] ?? null,
            die2: movementAction.roll.faces[1] ?? null,
            statBonus: movementAction.statBonus,
            checkTotal: movementAction.total,
            difficulty: movementAction.difficulty,
            enemyRollerSeatId: null,
            enemyDie1: null,
            enemyDie2: null,
            enemyBonus: null,
            enemyTotal: null,
            success: movementAction.success,
            summary: movementAction.success
              ? `Moved into ${targetSector?.name ?? movementAction.toSectorId}. Success: the approach held.`
              : `Moved into ${targetSector?.name ?? movementAction.toSectorId}. ${summarizeEffect(
                  movementAction.effect!,
                  false
                )}`
          },
          eventLog: [...state.eventLog, action, movedEvent]
        },
        [movedEvent]
      );
    }
    case "ENCOUNTER_DRAWN": {
      const drawnAction = action as EncounterDrawnAction;

      try {
        ensureSeatTurn(state, drawnAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, drawnAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "sector") {
        return reject(state, action, `Cannot draw encounter during phase ${state.phase}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "action",
        resolutionSource: null,
        currentEncounter: drawnAction.card,
        sectors: state.sectors.map((sector) =>
          sector.id === drawnAction.sectorId && drawnAction.card
            ? {
                ...sector,
                encounterDecks: {
                  ...sector.encounterDecks,
                  threat: sector.encounterDecks.threat.filter((cardId) => cardId !== drawnAction.card?.id)
                }
              }
            : sector
        ),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              encounterCardId: drawnAction.card?.id ?? null,
              encounterTitle: drawnAction.card?.title ?? null,
              encounterCardType: drawnAction.card?.cardType ?? null,
              summary: drawnAction.card
                ? `Moved into ${drawnAction.sectorId} and revealed ${drawnAction.card.title}.`
                : `Moved into ${drawnAction.sectorId}, but the local threat deck was empty.`
            }
          : state.lastOutcomeSummary,
        eventLog: [...state.eventLog, action]
      });
    }
    case "CHECK_REQUESTED": {
      const checkRequest = action as CheckRequestedAction;

      try {
        ensureSeatTurn(state, checkRequest.seatId);
        ensureSeatCanTakeNormalTurnAction(state, checkRequest.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot request a check during phase ${state.phase}`);
      }

      if (!state.currentEncounter) {
        return reject(state, action, "No encounter is waiting for a check");
      }

      if (state.currentEncounter.cardType !== "hazard") {
        return reject(state, action, "Enemy encounters require COMBAT_REQUESTED");
      }

      if (checkRequest.stat !== state.currentEncounter.stat) {
        return reject(
          state,
          action,
          `Encounter requires ${state.currentEncounter.stat}, not ${checkRequest.stat}`
        );
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        eventLog: [...state.eventLog, action]
      });
    }
    case "COMBAT_REQUESTED": {
      const combatRequest = action as CombatRequestedAction;

      try {
        ensureSeatTurn(state, combatRequest.seatId);
        ensureSeatCanTakeNormalTurnAction(state, combatRequest.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot request combat during phase ${state.phase}`);
      }

      if (!state.currentEncounter) {
        return reject(state, action, "No encounter is waiting for combat");
      }

      if (state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "Hazard encounters require CHECK_REQUESTED");
      }

      if (combatRequest.stat !== state.currentEncounter.stat) {
        return reject(
          state,
          action,
          `Encounter requires ${state.currentEncounter.stat}, not ${combatRequest.stat}`
        );
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ENEMY_ROLL_ASSIGNED": {
      const enemyRollAssignment = action as EnemyRollAssignedAction;

      try {
        ensureSeatTurn(state, enemyRollAssignment.fighterSeatId);
        ensureSeatCanTakeNormalTurnAction(state, enemyRollAssignment.fighterSeatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot assign enemy roll during phase ${state.phase}`);
      }

      if (!state.currentEncounter || state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "No enemy encounter is waiting for combat");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        pendingEnemyRoll: {
          fighterSeatId: enemyRollAssignment.fighterSeatId,
          assignedRollerSeatId: enemyRollAssignment.assignedRollerSeatId,
          encounterCardId: enemyRollAssignment.cardId,
          encounterTitle: enemyRollAssignment.encounterTitle,
          stat: enemyRollAssignment.stat
        },
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              encounterCardId: enemyRollAssignment.cardId,
              encounterTitle: enemyRollAssignment.encounterTitle,
              encounterCardType: "enemy",
              checkStat: enemyRollAssignment.stat,
              enemyRollerSeatId: enemyRollAssignment.assignedRollerSeatId,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              summary: `${state.lastOutcomeSummary.summary} ${enemyRollAssignment.encounterTitle} is resisting. Awaiting the assigned enemy roller.`
            }
          : state.lastOutcomeSummary,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ENEMY_ROLL_REQUESTED": {
      const enemyRollRequest = action as EnemyRollRequestedAction;

      if (state.phase !== "action") {
        return reject(state, action, `Cannot trigger enemy roll during phase ${state.phase}`);
      }

      if (!state.pendingEnemyRoll) {
        return reject(state, action, "No enemy roll is waiting to be triggered");
      }

      if (state.pendingEnemyRoll.assignedRollerSeatId !== enemyRollRequest.seatId) {
        return reject(state, action, "Only the assigned enemy roller can trigger this roll");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "CHECK_ROLLED":
      try {
        ensureSeatTurn(state, action.seatId);
        ensureSeatCanTakeNormalTurnAction(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot resolve a check during phase ${state.phase}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: "encounter",
        pendingEnemyRoll: null,
        pendingEffect: action.effect,
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              checkStat: action.stat,
              die1: action.roll.faces[0] ?? null,
              die2: action.roll.faces[1] ?? null,
              statBonus: action.statBonus,
              checkTotal: action.total,
              difficulty: action.difficulty,
              success: action.success,
              summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(action.effect, action.success)}`
            }
          : null,
        eventLog: [...state.eventLog, action]
      });
    case "COMBAT_RESOLVED":
      try {
        ensureSeatTurn(state, action.seatId);
        ensureSeatCanTakeNormalTurnAction(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot resolve combat during phase ${state.phase}`);
      }

      if (!state.currentEncounter || state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "No enemy encounter is waiting for combat");
      }

      if (
        state.pendingEnemyRoll &&
        (state.pendingEnemyRoll.fighterSeatId !== action.seatId ||
          state.pendingEnemyRoll.encounterCardId !== action.cardId)
      ) {
        return reject(state, action, "Pending enemy roll does not match this combat");
      }

      {
        const player = requirePlayer(state, action.seatId);
        const activeContract = player.character.activeContract;
        const contract = activeContract
          ? state.availableContracts.find((entry) => entry.id === activeContract.contractId) ?? null
          : null;
        const nextProgress =
          action.success && contract?.objective.type === "defeatCount" && activeContract
            ? Math.min(activeContract.progress + 1, contract.objective.target)
            : activeContract?.progress ?? null;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: "encounter",
        pendingEnemyRoll: null,
        pendingEffect: action.effect,
        players: updateActivePlayer(state, action.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            activeContract:
              entry.character.activeContract && nextProgress !== null
                ? {
                    ...entry.character.activeContract,
                    progress: nextProgress
                  }
                : entry.character.activeContract
          }
        })),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              checkStat: action.stat,
              die1: action.roll.faces[0] ?? null,
              die2: action.roll.faces[1] ?? null,
              statBonus: action.statBonus,
              checkTotal: action.total,
              difficulty: action.difficulty,
              enemyRollerSeatId: action.enemyRollerSeatId,
              enemyDie1: action.enemyRoll.faces[0] ?? null,
              enemyDie2: action.enemyRoll.faces[1] ?? null,
              enemyBonus: action.enemyBonus,
              enemyTotal: action.enemyTotal,
              success: action.success,
              summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(action.effect, action.success)}`
            }
          : null,
        eventLog: [...state.eventLog, action]
      });
      }
    case "RESOLUTION_APPLIED": {
      const resolutionAction = action as ResolutionAppliedAction;

      try {
        ensureSeatTurn(state, resolutionAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "resolution") {
        return reject(state, action, `Cannot apply resolution during phase ${state.phase}`);
      }

      if (!state.pendingEffect) {
        return reject(state, action, "No pending effect is available to apply");
      }

      return succeed({
        ...applyEffectToState(state, resolutionAction.seatId, state.pendingEffect as EncounterEffect),
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: state.resolutionSource,
        pendingEffect: null,
        eventLog: [...state.eventLog, action]
      });
    }
    case "HEAT_THRESHOLD_REACHED": {
      try {
        ensureSeatTurn(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        players: updateActivePlayer(state, action.seatId, (player) => ({
          ...player,
          character: {
            ...player.character,
            status: "recalled"
          }
        })),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              summary: `${state.lastOutcomeSummary.summary} Heat threshold reached. Operative recalled.`
            }
          : null,
        eventLog: [...state.eventLog, action]
      });
    }
    case "WOUND_THRESHOLD_REACHED": {
      const woundAction = action as WoundThresholdReachedAction;

      try {
        ensureSeatTurn(state, woundAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        players: updateActivePlayer(state, action.seatId, (player) => ({
          ...player,
          character: {
            ...player.character,
            status: "recalled",
            scars: [...player.character.scars, woundAction.scar]
          }
        })),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              summary: `${state.lastOutcomeSummary.summary} Wound threshold reached. Operative recalled and scarred.`
            }
          : null,
        eventLog: [...state.eventLog, action]
      });
    }
    case "RECRUIT_REPLACEMENT": {
      const recruitAction = action as RecruitReplacementAction;

      try {
        ensureSeatTurn(state, recruitAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      const player = requirePlayer(state, recruitAction.seatId);

      if (player.character.status !== "recalled") {
        return reject(state, action, "Only recalled seats can recruit a replacement");
      }

      if (!recruitAction.replacementCharacter) {
        return reject(state, action, `Unknown replacement character ${recruitAction.replacementCharacterId}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        pendingEnemyRoll: null,
        seats: state.seats.map((entry) =>
          entry.seatId === recruitAction.seatId
            ? {
                ...entry,
                characterId: recruitAction.replacementCharacterId
              }
            : entry
        ),
        players: updateActivePlayer(state, recruitAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...recruitAction.replacementCharacter!,
            currentSpaceId: entry.sectorId,
            heat: 0,
            wounds: 0,
            status: "active",
            heldGear: [...recruitAction.replacementCharacter!.heldGear],
            equippedGear: { ...recruitAction.replacementCharacter!.equippedGear }
            ,
            scars: [...entry.character.scars, ...recruitAction.replacementCharacter!.scars]
          }
        })),
        lastOutcomeSummary: {
          seatId: recruitAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: null,
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
          success: null,
          replacementCharacterId: recruitAction.replacementCharacterId,
          summary: `${recruitAction.replacementCharacter.name} enters the field as a fresh replacement.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "EQUIP_GEAR": {
      const equipAction = action as EquipGearAction;

      try {
        canManageGear(state, equipAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot manage gear");
      }

      const player = requirePlayer(state, equipAction.seatId);
      const item = getHeldGearItem(player.character, equipAction.gearId);

      if (!item) {
        return reject(state, action, `Gear ${equipAction.gearId} is not held by this character`);
      }

      if (item.slot !== equipAction.slot) {
        return reject(state, action, `Gear ${equipAction.gearId} cannot be equipped to ${equipAction.slot}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, equipAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            equippedGear: {
              ...entry.character.equippedGear,
              [equipAction.slot]: equipAction.gearId
            }
          }
        })),
        eventLog: [...state.eventLog, action]
      });
    }
    case "UNEQUIP_GEAR": {
      const unequipAction = action as UnequipGearAction;

      try {
        canManageGear(state, unequipAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot manage gear");
      }

      const player = requirePlayer(state, unequipAction.seatId);

      if (!player.character.equippedGear[unequipAction.slot as GearSlot]) {
        return reject(state, action, `No gear is equipped in ${unequipAction.slot}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, unequipAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            equippedGear: {
              ...entry.character.equippedGear,
              [unequipAction.slot]: null
            }
          }
        })),
        eventLog: [...state.eventLog, action]
      });
    }
    case "ACCEPT_CONTRACT": {
      const acceptAction = action as AcceptContractAction;

      try {
        canManageGear(state, acceptAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot accept a contract");
      }

      const player = requirePlayer(state, acceptAction.seatId);

      if (player.character.activeContract) {
        return reject(state, action, "This seat already has an active contract");
      }

      if (!acceptAction.contract) {
        return reject(state, action, `Unknown contract ${acceptAction.contractId}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, acceptAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            activeContract: {
              contractId: acceptAction.contractId,
              progress: 0
            }
          }
        })),
        eventLog: [...state.eventLog, action]
      });
    }
    case "COMPLETE_CONTRACT": {
      const completeAction = action as CompleteContractAction;

      try {
        canManageGear(state, completeAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot complete a contract");
      }

      const player = requirePlayer(state, completeAction.seatId);
      const activeContract = player.character.activeContract;

      if (!activeContract || activeContract.contractId !== completeAction.contractId) {
        return reject(state, action, "This seat does not have that contract active");
      }

      const contract = completeAction.contract ?? requireActiveContractCard(state, completeAction.seatId);

      if (!contract) {
        return reject(state, action, `Unknown contract ${completeAction.contractId}`);
      }

      if (activeContract.progress < contract.objective.target) {
        return reject(state, action, "Contract objective is not complete yet");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: "contract",
        pendingEnemyRoll: null,
        pendingEffect: contract.reward,
        players: updateActivePlayer(state, completeAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            activeContract: null
          }
        })),
        lastOutcomeSummary: {
          seatId: completeAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: contract.name,
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
          summary: `Completed contract ${contract.name}. ${summarizeEffect(contract.reward, true)}`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_CONFRONTATION_REQUESTED": {
      const scenarioAction = action as ScenarioConfrontationRequestedAction;

      try {
        canResolveScenarioConfrontation(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Scenario confrontation is not available");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "SPACE_TEXT_RESOLVED": {
      const spaceTextAction = action as SpaceTextResolvedAction;

      try {
        canResolveSpaceText(state, spaceTextAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Space text is not available");
      }

      const nextState = spaceTextAction.effect
        ? applyEffectToState(state, spaceTextAction.seatId, spaceTextAction.effect)
        : state;
      const sectorAdjustedState =
        spaceTextAction.sectorId && spaceTextAction.consumedDeckCards
          ? {
              ...nextState,
              sectors: nextState.sectors.map((sector) =>
                sector.id !== spaceTextAction.sectorId
                  ? sector
                  : {
                      ...sector,
                      encounterDecks: {
                        ...sector.encounterDecks,
                        anomaly: sector.encounterDecks.anomaly.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.anomaly?.includes(cardId)
                        ),
                        artifact: sector.encounterDecks.artifact.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.artifact?.includes(cardId)
                        ),
                        contract: sector.encounterDecks.contract.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.contract?.includes(cardId)
                        ),
                        escalation: sector.encounterDecks.escalation.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.escalation?.includes(cardId)
                        )
                      }
                    }
              )
            }
          : nextState;
      const withDiscoveredContracts =
        spaceTextAction.discoveredContracts && spaceTextAction.discoveredContracts.length > 0
          ? {
              ...sectorAdjustedState,
              availableContracts: [
                ...sectorAdjustedState.availableContracts,
                ...spaceTextAction.discoveredContracts.filter(
                  (contract) => !sectorAdjustedState.availableContracts.some((entry) => entry.id === contract.id)
                )
              ]
            }
          : sectorAdjustedState;
      const player = requirePlayer(withDiscoveredContracts, spaceTextAction.seatId);

      return succeed({
        ...withDiscoveredContracts,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: spaceTextAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: getBoardSpace(player.character.currentSpaceId)?.name ?? player.character.currentSpaceId,
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
          summary: spaceTextAction.summary
        },
        eventLog: [...withDiscoveredContracts.eventLog, action]
      });
    }
    case "SCENARIO_PROGRESS_ADVANCED": {
      const scenarioAction = action as ScenarioProgressAdvancedAction;

      try {
        canResolveScenarioConfrontation(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Scenario progress cannot advance");
      }

      const nextState = scenarioAction.effect
        ? applyEffectToState(state, scenarioAction.seatId, scenarioAction.effect)
        : state;

      return succeed({
        ...nextState,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        scenarioProgress: {
          ...nextState.scenarioProgress,
          [scenarioAction.progressKey]:
            Math.max(0, nextState.scenarioProgress[scenarioAction.progressKey] ?? 0) + Math.max(0, scenarioAction.amount)
        },
        lastOutcomeSummary: {
          seatId: scenarioAction.seatId,
          movedToSectorId: "center_cinder_gate",
          encounterCardId: null,
          encounterTitle: "The Cinder Gate",
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
          success: scenarioAction.amount > 0,
          summary: scenarioAction.summary
        },
        eventLog: [...nextState.eventLog, action]
      });
    }
    case "SCENARIO_VICTORY_ACHIEVED": {
      const scenarioAction = action as ScenarioVictoryAchievedAction;

      try {
        ensureSeatTurn(state, scenarioAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot claim scenario victory");
      }

      if (state.status !== "active") {
        return reject(state, action, "Scenario victory can only be claimed during an active session");
      }

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: scenarioAction.seatId,
        phase: "broadcast",
        sequence: state.sequence + 1,
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              seatId: scenarioAction.seatId,
              movedToSectorId: "center_cinder_gate",
              success: true,
              summary: scenarioAction.summary
            }
          : {
              seatId: scenarioAction.seatId,
              movedToSectorId: "center_cinder_gate",
              encounterCardId: null,
              encounterTitle: "The Cinder Gate",
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
              summary: scenarioAction.summary
            },
        eventLog: [...state.eventLog, action]
      });
    }
    case "STABILIZE_RESOLVED": {
      const stabilizeAction = action as StabilizeResolvedAction;

      try {
        ensureSeatTurn(state, stabilizeAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot stabilize");
      }

      if (state.status !== "active" || state.phase !== "action") {
        return reject(state, action, "Stabilize is only available during an active action phase");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: stabilizeAction.seatId,
          movedToSectorId: requirePlayer(state, stabilizeAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Stabilize",
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
          summary: `Stabilized the breach using ${stabilizeAction.cost.kind}.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "ROUND_COMPLETED": {
      const roundAction = action as RoundCompletedAction;

      if (state.status !== "active") {
        return reject(state, action, "Only active sessions can complete a round");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ESCALATION_ADVANCED": {
      const escalationAction = action as EscalationAdvancedAction;

      if (state.status !== "active") {
        return reject(state, action, "Escalation can only advance during an active session");
      }

      return succeed({
        ...state,
        escalationLevel: escalationAction.newLevel,
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: escalationAction.seatId,
          movedToSectorId: requirePlayer(state, escalationAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Escalation",
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
          success: null,
          summary: `Escalation ${escalationAction.amount >= 0 ? "+" : ""}${escalationAction.amount} (${escalationAction.reason ?? "pressure"}). Now ${escalationAction.newLevel}. Difficulty modifier +${escalationAction.modifier}.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SECTOR_COLLAPSED": {
      const collapseAction = action as SectorCollapsedAction;

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: null,
        phase: "broadcast",
        sequence: state.sequence + 1,
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: collapseAction.seatId,
          movedToSectorId: requirePlayer(state, collapseAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Sector Collapse",
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
          success: false,
          summary: collapseAction.summary
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "TURN_COMPLETED":
      try {
        ensureSeatTurn(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "broadcast") {
        return reject(state, action, `Cannot complete turn during phase ${state.phase}`);
      }

      const nextActiveSeatIndex = getNextActiveSeatIndex(state);
      const nextSeatId = state.turnOrder[nextActiveSeatIndex];
      const nextPlayer = state.players.find((entry) => entry.seatId === nextSeatId);

      return succeed({
        ...state,
        phase: nextPlayer?.character.status === "recalled" ? "action" : "navigation",
        activeSeatIndex: nextActiveSeatIndex,
        sequence: state.sequence + 1,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        resolutionSource: null,
        lastOutcomeSummary: null,
        eventLog: [...state.eventLog, action]
      });
    case "PHASE_ADVANCED":
      try {
        ensureSeatTurn(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!canAdvancePhase(state.phase, action.toPhase)) {
        return reject(state, action, `Illegal phase transition ${state.phase} -> ${action.toPhase}`);
      }

      return succeed({
        ...state,
        phase: action.toPhase,
        sequence: state.sequence + 1,
        resolutionSource: action.toPhase === "resolution" ? state.resolutionSource : null,
        activeSeatIndex:
          action.toPhase === "start"
            ? (state.activeSeatIndex + 1) % Math.max(state.seats.length, 1)
            : state.activeSeatIndex,
        eventLog: [...state.eventLog, action]
      });
    default: {
      throw new Error(`Unhandled action ${action.type}`);
    }
  }
}
