import type { Character, Stat } from "../schema/character.schema.js";
import type { ThreatCard, EncounterEffect } from "../schema/card.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";
import type { NemesisChampion, Phase } from "../schema/session.schema.js";
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

export interface MovementRolledAction extends BaseAction {
  type: "MOVEMENT_ROLLED";
  movementValue: number;
  roll: DiceRollResult;
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

export interface DiceRollStartedAction extends BaseAction {
  type: "DICE_ROLL_STARTED";
  stat: CheckStat;
  cardId: string;
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

export interface SoloRerollResolvedAction extends BaseAction {
  type: "SOLO_REROLL_RESOLVED";
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

export type ShopServiceCost = {
  salvage?: number;
  heat?: number;
  wounds?: number;
  trophies?: number;
};

export type ShopServiceResult = {
  salvageDelta?: number;
  heatDelta?: number;
  woundDelta?: number;
  trophyDelta?: number;
  gainGear?: GearItem;
  discardGearId?: string;
  note?: string;
};

export interface ShopServiceResolvedAction extends BaseAction {
  type: "SHOP_SERVICE_RESOLVED";
  serviceId: string;
  serviceLabel: string;
  shopName: string;
  sectorId: string;
  cost: ShopServiceCost;
  result: ShopServiceResult;
  summary: string;
}

export interface ShopStockRevealedAction extends BaseAction {
  type: "SHOP_STOCK_REVEALED";
  serviceId: string;
  serviceLabel: string;
  shopName: string;
  sectorId: string;
  cost: ShopServiceCost;
  stock: GearItem[];
  summary: string;
}

export interface ShopPurchaseResolvedAction extends BaseAction {
  type: "SHOP_PURCHASE_RESOLVED";
  serviceId: string;
  shopName: string;
  sectorId: string;
  cardId: string;
  cost: ShopServiceCost;
  gainedGear: GearItem;
  discardedStockIds: string[];
  summary: string;
}

export interface ShopSellResolvedAction extends BaseAction {
  type: "SHOP_SELL_RESOLVED";
  shopName: string;
  sectorId: string;
  gearId: string;
  soldGear: GearItem;
  salvageDelta: number;
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

export interface ScenarioObjectiveProgressTriggeredAction extends BaseAction {
  type: "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED";
  scenarioId: string;
  progressKey: string;
  amount: number;
  required: number;
  triggerType: "contractCompleted" | "threatDefeated" | "sectorActionCompleted";
  summary: string;
}

export interface ScenarioVictoryAchievedAction extends BaseAction {
  type: "SCENARIO_VICTORY_ACHIEVED";
  scenarioId: string;
  summary: string;
}

export interface ScenarioObjectiveCompletedAction extends BaseAction {
  type: "SCENARIO_OBJECTIVE_COMPLETED";
  scenarioId: string;
  summary: string;
}

export interface RivalryAgendaRevealedAction extends BaseAction {
  type: "RIVALRY_AGENDA_REVEALED";
  publicRevealTitle: string;
  publicRevealSummary: string;
  revealedAtRound: number;
}

export interface RivalryAgendaProgressTriggeredAction extends BaseAction {
  type: "RIVALRY_AGENDA_PROGRESS_TRIGGERED";
  agendaId: string;
  triggerType:
    | "contractCompleted"
    | "threatDefeated"
    | "sectorActionCompleted"
    | "shopPurchaseCompleted"
    | "shopSaleCompleted"
    | "itemAcquired"
    | "scenarioObjectiveProgressed";
  progressLabel: string;
  amount: number;
  required: number;
  completed: boolean;
  pointsAwarded: number;
  publicCompletionTitle: string;
  publicCompletionSummary: string;
  privateCompletionSummary: string;
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

export interface NemesisSpawnedAction extends BaseAction {
  type: "NEMESIS_SPAWNED";
  champions: NemesisChampion[];
}

export interface NemesisMovedAction extends BaseAction {
  type: "NEMESIS_MOVED";
  nemesisId: string;
  fromSectorId: string;
  toSectorId: string;
  path: string[];
  distanceToNexus: number;
}

export interface NemesisEncounterResolvedAction extends BaseAction {
  type: "NEMESIS_ENCOUNTER_RESOLVED";
  nemesisId: string;
  summary: string;
}

export interface NemesisCombatStartedAction extends BaseAction {
  type: "NEMESIS_COMBAT_STARTED";
  nemesisId: string;
}

export interface NemesisCombatResolvedAction extends BaseAction {
  type: "NEMESIS_COMBAT_RESOLVED";
  nemesisId: string;
  attackerSeatId: string;
  assistSeatIds: string[];
  stat: CheckStat;
  roll: DiceRollResult;
  nemesisRoll: DiceRollResult;
  attackerTotal: number;
  nemesisTotal: number;
  success: boolean;
  damage: number;
  summary: string;
}

export interface NemesisDefeatedAction extends BaseAction {
  type: "NEMESIS_DEFEATED";
  nemesisId: string;
  attackerSeatId: string;
  boundSeatId: string;
  summary: string;
}

export interface CrownKeyFragmentGainedAction extends BaseAction {
  type: "CROWN_KEY_FRAGMENT_GAINED";
  targetSeatId: string;
  sourceNemesisId: string;
}

export interface NexusTestStartedAction extends BaseAction {
  type: "NEXUS_TEST_STARTED";
}

export interface NexusTestResolvedAction extends BaseAction {
  type: "NEXUS_TEST_RESOLVED";
  stat: CheckStat;
  difficulty: number;
  roll: DiceRollResult;
  total: number;
  success: boolean;
}

export interface NemesisNexusCountdownStartedAction extends BaseAction {
  type: "NEMESIS_NEXUS_COUNTDOWN_STARTED";
  nemesisId: string;
  remainingTurns: number;
}

export interface CoopVictoryTriggeredAction extends BaseAction {
  type: "COOP_VICTORY_TRIGGERED";
  summary: string;
}

export interface CoopDefeatTriggeredAction extends BaseAction {
  type: "COOP_DEFEAT_TRIGGERED";
  summary: string;
}

export type GameAction =
  | SessionStartedAction
  | MoveRequestedAction
  | MovementRolledAction
  | MovedAction
  | MovementResolvedAction
  | EncounterDrawnAction
  | CheckRequestedAction
  | CombatRequestedAction
  | EnemyRollAssignedAction
  | EnemyRollRequestedAction
  | DiceRollStartedAction
  | CheckRolledAction
  | SoloRerollResolvedAction
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
  | ShopServiceResolvedAction
  | ShopStockRevealedAction
  | ShopPurchaseResolvedAction
  | ShopSellResolvedAction
  | AcceptContractAction
  | CompleteContractAction
  | ScenarioConfrontationRequestedAction
  | SpaceTextResolvedAction
  | ScenarioProgressAdvancedAction
  | ScenarioObjectiveProgressTriggeredAction
  | ScenarioVictoryAchievedAction
  | ScenarioObjectiveCompletedAction
  | RivalryAgendaRevealedAction
  | RivalryAgendaProgressTriggeredAction
  | StabilizeResolvedAction
  | StatRaisedAction
  | RoundCompletedAction
  | EscalationAdvancedAction
  | SectorCollapsedAction
  | TurnCompletedAction
  | PhaseAdvancedAction
  | NemesisSpawnedAction
  | NemesisMovedAction
  | NemesisEncounterResolvedAction
  | NemesisCombatStartedAction
  | NemesisCombatResolvedAction
  | NemesisDefeatedAction
  | CrownKeyFragmentGainedAction
  | NexusTestStartedAction
  | NexusTestResolvedAction
  | NemesisNexusCountdownStartedAction
  | CoopVictoryTriggeredAction
  | CoopDefeatTriggeredAction;

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
      type: "SOLO_REROLL_REQUESTED";
      seatId: string;
    }
  | {
      type: "CONTINUE_RESOLUTION";
      seatId: string;
    }
  | {
      type: "SET_READY";
      seatId: string;
      ready: boolean;
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
      type: "SHOP_SERVICE_REQUESTED";
      seatId: string;
      serviceId: string;
    }
  | {
      type: "SHOP_PURCHASE_REQUESTED";
      seatId: string;
      cardId: string;
    }
  | {
      type: "SHOP_SELL_REQUESTED";
      seatId: string;
      gearId: string;
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
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED";
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
    }
  | {
      type: "NEMESIS_COMBAT_REQUESTED";
      seatId: string;
      nemesisId: string;
      stat?: CheckStat;
      assistSeatIds?: string[];
    };
