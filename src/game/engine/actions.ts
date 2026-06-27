import type { Character, Stat } from "../schema/character.schema.js";
import type { ThreatCard, EncounterEffect } from "../schema/card.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { GearSlot } from "../schema/gear.schema.js";
import type { Phase } from "../schema/session.schema.js";
import type { DiceRollResult } from "./dice.js";

export type CheckStat = Stat;

export interface BaseAction {
  type: string;
  seatId: string;
  createdAt: string;
}

export interface SessionStartedAction extends BaseAction {
  type: "SESSION_STARTED";
}

export interface MoveRequestedAction extends BaseAction {
  type: "MOVE_REQUESTED";
  toSectorId: string;
}

export interface MovedAction extends BaseAction {
  type: "MOVED";
  fromSectorId: string;
  toSectorId: string;
}

export interface MovementResolvedAction extends BaseAction {
  type: "MOVEMENT_RESOLVED";
  fromSectorId: string;
  toSectorId: string;
  stat: "guile";
  difficulty: number;
  roll: DiceRollResult;
  statBonus: number;
  total: number;
  success: boolean;
  effect: EncounterEffect | null;
}

export interface EncounterDrawnAction extends BaseAction {
  type: "ENCOUNTER_DRAWN";
  sectorId: string;
  card: ThreatCard | null;
  revealEffect?: EncounterEffect | null;
}

export interface CheckRequestedAction extends BaseAction {
  type: "CHECK_REQUESTED";
  stat: CheckStat;
}

export interface CombatRequestedAction extends BaseAction {
  type: "COMBAT_REQUESTED";
  stat: CheckStat;
}

export interface EnemyRollAssignedAction extends BaseAction {
  type: "ENEMY_ROLL_ASSIGNED";
  fighterSeatId: string;
  assignedRollerSeatId: string;
  stat: CheckStat;
  cardId: string;
  encounterTitle: string;
}

export interface EnemyRollRequestedAction extends BaseAction {
  type: "ENEMY_ROLL_REQUESTED";
}

export interface CheckRolledAction extends BaseAction {
  type: "CHECK_ROLLED";
  stat: CheckStat;
  difficulty: number;
  roll: DiceRollResult;
  statBonus: number;
  total: number;
  success: boolean;
  effect: EncounterEffect;
  cardId: string;
}

export interface CombatResolvedAction extends BaseAction {
  type: "COMBAT_RESOLVED";
  stat: CheckStat;
  difficulty: number;
  roll: DiceRollResult;
  enemyRoll: DiceRollResult;
  statBonus: number;
  enemyBonus: number;
  total: number;
  enemyTotal: number;
  success: boolean;
  effect: EncounterEffect;
  cardId: string;
  enemyRollerSeatId: string | null;
}

export interface ResolutionAppliedAction extends BaseAction {
  type: "RESOLUTION_APPLIED";
  effect: EncounterEffect;
  sourceCardId: string | null;
  success: boolean | null;
}

export interface ResolutionContinuedAction extends BaseAction {
  type: "CONTINUE_RESOLUTION";
}

export interface HeatThresholdReachedAction extends BaseAction {
  type: "HEAT_THRESHOLD_REACHED";
  threshold: number;
  newHeatTotal: number;
}

export interface WoundThresholdReachedAction extends BaseAction {
  type: "WOUND_THRESHOLD_REACHED";
  threshold: number;
  newWoundTotal: number;
  scar: string;
}

export interface RecruitReplacementAction extends BaseAction {
  type: "RECRUIT_REPLACEMENT";
  replacementCharacterId: string;
  replacementCharacter?: Character;
}

export interface EquipGearAction extends BaseAction {
  type: "EQUIP_GEAR";
  gearId: string;
  slot: GearSlot;
}

export interface UnequipGearAction extends BaseAction {
  type: "UNEQUIP_GEAR";
  slot: GearSlot;
}

export interface UseGearAction extends BaseAction {
  type: "USE_GEAR";
  gearId: string;
  effect: EncounterEffect | null;
  summary: string;
  discard?: boolean;
}

export interface UseFollowerAction extends BaseAction {
  type: "USE_FOLLOWER";
  followerId: string;
  effect: EncounterEffect | null;
  summary: string;
  discard?: boolean;
}

export interface TableInteractionAction extends BaseAction {
  type: "TABLE_INTERACTION";
  interactionKind: "trade" | "aid" | "duel" | "interfere";
  targetSeatId: string;
  effect: EncounterEffect | null;
  targetEffect?: EncounterEffect | null;
  summary: string;
}

export interface AcceptContractAction extends BaseAction {
  type: "ACCEPT_CONTRACT";
  contractId: string;
  contract?: ContractCard;
}

export interface CompleteContractAction extends BaseAction {
  type: "COMPLETE_CONTRACT";
  contractId: string;
  contract?: ContractCard;
}

export interface ScenarioConfrontationRequestedAction extends BaseAction {
  type: "SCENARIO_CONFRONTATION_REQUESTED";
}

export interface SpaceTextResolvedAction extends BaseAction {
  type: "SPACE_TEXT_RESOLVED";
  effectKey: string;
  summary: string;
  effect?: EncounterEffect | null;
  checkStat?: CheckStat | null;
  difficulty?: number | null;
  roll?: DiceRollResult | null;
  statBonus?: number | null;
  total?: number | null;
  success?: boolean | null;
  sectorId?: string;
  discoveredContracts?: ContractCard[];
  consumedDeckCards?: {
    anomaly?: string[];
    artifact?: string[];
    contract?: string[];
    escalation?: string[];
  };
}

export interface ScenarioProgressAdvancedAction extends BaseAction {
  type: "SCENARIO_PROGRESS_ADVANCED";
  scenarioId: string;
  progressKey: string;
  amount: number;
  summary: string;
  effect?: EncounterEffect | null;
}

export interface ScenarioVictoryAchievedAction extends BaseAction {
  type: "SCENARIO_VICTORY_ACHIEVED";
  scenarioId: string;
  summary: string;
}

export interface StabilizeResolvedAction extends BaseAction {
  type: "STABILIZE_RESOLVED";
  cost: { kind: "heat" | "trophy" | "action"; amount: number };
}

export interface StatRaisedAction extends BaseAction {
  type: "STAT_RAISED";
  stat: Stat;
  cost: number;
}

export interface RoundCompletedAction extends BaseAction {
  type: "ROUND_COMPLETED";
}

export interface EscalationAdvancedAction extends BaseAction {
  type: "ESCALATION_ADVANCED";
  amount: number;
  newLevel: number;
  modifier: number;
  reason?: string;
}

export interface SectorCollapsedAction extends BaseAction {
  type: "SECTOR_COLLAPSED";
  threshold: number;
  modifier: number;
  summary: string;
}

export interface TurnCompletedAction extends BaseAction {
  type: "TURN_COMPLETED";
}

export interface PhaseAdvancedAction extends BaseAction {
  type: "PHASE_ADVANCED";
  toPhase: Phase;
}

export type GameAction =
  | SessionStartedAction
  | MoveRequestedAction
  | MovedAction
  | MovementResolvedAction
  | EncounterDrawnAction
  | CheckRequestedAction
  | CombatRequestedAction
  | EnemyRollAssignedAction
  | EnemyRollRequestedAction
  | CheckRolledAction
  | CombatResolvedAction
  | ResolutionAppliedAction
  | ResolutionContinuedAction
  | HeatThresholdReachedAction
  | WoundThresholdReachedAction
  | RecruitReplacementAction
  | EquipGearAction
  | UnequipGearAction
  | UseGearAction
  | UseFollowerAction
  | TableInteractionAction
  | AcceptContractAction
  | CompleteContractAction
  | ScenarioConfrontationRequestedAction
  | SpaceTextResolvedAction
  | ScenarioProgressAdvancedAction
  | ScenarioVictoryAchievedAction
  | StabilizeResolvedAction
  | StatRaisedAction
  | RoundCompletedAction
  | EscalationAdvancedAction
  | SectorCollapsedAction
  | TurnCompletedAction
  | PhaseAdvancedAction;

export type ClientIntent =
  | {
      type: "MOVE_REQUESTED";
      seatId: string;
      toSectorId: string;
    }
  | {
      type: "PHASE_ADVANCED";
      seatId: string;
      toPhase: Phase;
    }
  | {
      type: "CHECK_REQUESTED";
      seatId: string;
      stat: CheckStat;
    }
  | {
      type: "COMBAT_REQUESTED";
      seatId: string;
      stat: CheckStat;
    }
  | {
      type: "ENEMY_ROLL_REQUESTED";
      seatId: string;
    }
  | {
      type: "CONTINUE_RESOLUTION";
      seatId: string;
    }
  | {
      type: "RECRUIT_REPLACEMENT";
      seatId: string;
      replacementCharacterId: string;
    }
  | {
      type: "EQUIP_GEAR";
      seatId: string;
      gearId: string;
      slot: GearSlot;
    }
  | {
      type: "UNEQUIP_GEAR";
      seatId: string;
      slot: GearSlot;
    }
  | {
      type: "USE_GEAR";
      seatId: string;
      gearId: string;
    }
  | {
      type: "USE_FOLLOWER";
      seatId: string;
      followerId: string;
    }
  | {
      type: "TABLE_INTERACTION";
      seatId: string;
      targetSeatId: string;
      interactionKind: "trade" | "aid" | "duel" | "interfere";
    }
  | {
      type: "ACCEPT_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "COMPLETE_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "SCENARIO_CONFRONTATION_REQUESTED";
      seatId: string;
    }
  | {
      type: "RESOLVE_SPACE_TEXT";
      seatId: string;
      choiceId?: string;
    }
  | {
      type: "STABILIZE_REQUESTED";
      seatId: string;
    }
  | {
      type: "RAISE_STAT_REQUESTED";
      seatId: string;
      stat: Stat;
    };
