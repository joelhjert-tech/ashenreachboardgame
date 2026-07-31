import type { AuthoredCharacter, Stat } from "../schema/character.schema.js";
import type { ThreatCard, EncounterEffect } from "../schema/card.schema.js";
import type { LegacyCompatibleEncounterEffect } from "../schema/card.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { AfflictionCard } from "../schema/affliction.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";
import type { Follower } from "../schema/follower.schema.js";
import type { ActiveOathchainReveal, NemesisChampion, Phase } from "../schema/session.schema.js";
import type { DiceRollResult } from "./dice.js";
import type { ScarSourceEvent } from "../schema/scarTrigger.schema.js";
import type { MemoryTaxOptionId } from "../schema/memoryTax.schema.js";

export type CheckStat = Stat;

export interface RollModifierSource {
  label: string;
  value: number;
}

export interface BaseAction {
  type: string;
  seatId: string;
  createdAt: string;
}

export interface SessionStartedAction extends BaseAction {
  type: "SESSION_STARTED";
}

export interface EdgeDeckInitializedAction extends BaseAction {
  type: "EDGE_DECK_INITIALIZED";
  orderedCardIds: string[];
}

export interface EdgeDeckShuffledAction extends BaseAction {
  type: "EDGE_DECK_SHUFFLED";
  cycle: number;
  orderedCardIds: string[];
}

export interface EdgeCardAwardedAction extends BaseAction {
  type: "EDGE_CARD_AWARDED";
  cardId: string;
  source: "setup" | "contract";
  sourceId?: string;
}

export interface EdgeCardPlayedAction extends BaseAction {
  type: "EDGE_CARD_PLAYED";
  cardId: string;
  cardName: string;
  edgeValue: 1 | 2 | 3 | 4 | 5 | 6;
  mode: "commit-value";
  resolutionId: string;
  publicSummary: string;
}

export interface NamedPlayerRulesReconciledAction extends BaseAction {
  type: "NAMED_PLAYER_RULES_RECONCILED";
  changes: string[];
}

export interface MoveRequestedAction extends BaseAction {
  type: "MOVE_REQUESTED";
  toSectorId: string;
  voidKeyInstanceId?: string;
  routeId?: string;
  movementRevision?: number;
}

export interface TransitionRouteAidUsedAction extends BaseAction {
  type: "TRANSITION_ROUTE_AID_USED";
  sourceKind: "gear" | "follower";
  instanceId: string;
  fromSectorId: string;
  toSectorId: string;
  route: string[];
  movementRevision: number;
}

export interface TierTransitionCompletedAction extends BaseAction {
  type: "TIER_TRANSITION_COMPLETED";
  fromSectorId: string;
  toSectorId: string;
  direction: "inward" | "outward";
  movementRevision: number;
  voidKeyInstanceId?: string;
}

export interface InnerApproachMovedAction extends BaseAction {
  type: "INNER_APPROACH_MOVED";
  fromSectorId: string;
  toSectorId: string;
  direction: "advance" | "retreat";
  pathId: "breach-road" | "choir-road";
  movementRevision: number;
}

export interface MovementRollRequestedAction extends BaseAction {
  type: "MOVEMENT_ROLL_REQUESTED";
}
export interface AdjustMovementRequestedAction extends BaseAction { type: "ADJUST_MOVEMENT_REQUESTED"; instanceId: string; adjustment: -1 | 1 }
export interface SelectRouteStarVariantAction extends BaseAction { type: "SELECT_ROUTE_STAR_VARIANT"; instanceId: string; destinationId: string; routeId: string; movementRevision: number }
export interface ClearRouteStarChoiceAction extends BaseAction { type: "CLEAR_ROUTE_STAR_CHOICE" }
export interface ActivateGateSaintAction extends BaseAction { type: "ACTIVATE_GATE_SAINT"; instanceId: string }
export interface UseMarrowDetourAction extends BaseAction { type: "USE_MARROW_DETOUR"; instanceId: string; reactionId: string; toSectorId: string }

export interface MovementRolledAction extends BaseAction {
  type: "MOVEMENT_ROLLED";
  movementValue: number;
  roll: DiceRollResult;
  resolutionId?: string;
  modifierSources?: RollModifierSource[];
}

export interface MovementUnavailableResolvedAction extends BaseAction {
  type: "MOVEMENT_UNAVAILABLE_RESOLVED";
  sourceSectorId: string;
  movementValue: number;
  reason: string;
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
  continuationPhase?: "sector" | "action";
  tileArrivalThreatProgress?: {
    arrivalId: string;
    seatId: string;
    sectorId: string;
    threatLanes: Array<"red" | "blue" | "yellow">;
    threatRuleIds: string[];
    nextThreatIconIndex: number;
    resolvedThreatOutcomes?: Array<{
      ruleId: string;
      lane: "red" | "blue" | "yellow";
      cardId: string;
      success: boolean;
    }>;
    allThreatsSuccessful?: boolean | null;
  };
  drawSource?: "global-bag" | "persistent" | "legacy-local";
}

export interface ThreatBagShuffledAction extends BaseAction {
  type: "THREAT_BAG_SHUFFLED";
  lane: "red" | "blue" | "yellow";
  cycle: number;
  orderedCardIds: string[];
}

export interface ThreatArrivalOutcomeRecordedAction extends BaseAction {
  type: "THREAT_ARRIVAL_OUTCOME_RECORDED";
  arrivalId: string;
  ruleId: string;
  lane: "red" | "blue" | "yellow";
  cardId: string;
  success: boolean;
  queueComplete: boolean;
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
  modifierSources?: RollModifierSource[];
  oppositionModifierSources?: RollModifierSource[];
  total: number;
  success: boolean;
  effect: EncounterEffect | null;
  cardId: string;
}

export interface SoloRerollResolvedAction extends BaseAction {
  type: "SOLO_REROLL_RESOLVED";
  stat: CheckStat;
  difficulty: number;
  roll: DiceRollResult;
  statBonus: number;
  modifierSources?: RollModifierSource[];
  total: number;
  success: boolean;
  effect: EncounterEffect | null;
  cardId: string;
  artifactReroll?: boolean;
}

export interface CombatResolvedAction extends BaseAction {
  type: "COMBAT_RESOLVED";
  stat: CheckStat;
  difficulty: number;
  roll: DiceRollResult;
  enemyRoll: DiceRollResult;
  statBonus: number;
  modifierSources?: RollModifierSource[];
  oppositionModifierSources?: RollModifierSource[];
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

export interface EncounterDecisionResolvedAction extends BaseAction {
  type: "ENCOUNTER_DECISION_RESOLVED";
  decisionId: string;
  decisionVersion: number;
  optionId: string;
}

export interface MemoryTaxChoiceResolvedAction extends BaseAction {
  type: "MEMORY_TAX_CHOICE_RESOLVED";
  choiceId: string;
  choiceVersion: number;
  optionId: MemoryTaxOptionId;
}

export interface ForcedDisplacementResolvedAction extends BaseAction {
  type: "FORCED_DISPLACEMENT_RESOLVED";
  reactionId: string;
}

export interface ForcedDestinationSelectedAction extends BaseAction {
  type: "FORCED_DESTINATION_SELECTED";
  choiceId: string;
  destinationSectorId: string;
}

export interface SutureStormContinuedAction extends BaseAction {
  type: "SUTURE_STORM_CONTINUED";
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
  /** Legacy v0-v2 exact Scar id. New runtime actions use an Unbound choice. */
  scar?: string;
}

export interface ChooseScarAction extends BaseAction {
  type: "CHOOSE_SCAR";
  selectionId: string;
  scarId: string;
}

export interface ScarThresholdResolvedAction extends BaseAction {
  type: "SCAR_THRESHOLD_RESOLVED";
  policy: "retire" | "transform" | "custom";
}

export interface ScarRemovalOfferedAction extends BaseAction {
  type: "SCAR_REMOVAL_OFFERED";
  choiceId: string;
  visitId: string;
  scarIds: string[];
}

export interface ScarRemovedAction extends BaseAction {
  type: "SCAR_REMOVED";
  choiceId: string;
  visitId: string;
  scarId: string;
  salvageCost: 4;
}

export interface RecruitReplacementAction extends BaseAction {
  type: "RECRUIT_REPLACEMENT";
  replacementCharacterId: string;
  replacementCharacter?: AuthoredCharacter;
}

export interface EquipGearAction extends BaseAction {
  type: "EQUIP_GEAR";
  gearId: string;
  instanceId?: string;
  slot: GearSlot;
}

export interface ResolveGearEquipChoiceAction extends BaseAction {
  type: "RESOLVE_GEAR_EQUIP_CHOICE";
  choiceId: string;
  itemInstanceId: string;
  decision: "equip" | "keepCarried";
}

export interface SelectEquipmentSuppressionTargetAction extends BaseAction {
  type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET";
  choiceId: string;
  itemInstanceId: string;
}

export interface UnequipGearAction extends BaseAction {
  type: "UNEQUIP_GEAR";
  slot: GearSlot;
}

export interface UseGearAction extends BaseAction {
  type: "USE_GEAR";
  gearId: string;
  instanceId?: string;
  effect: EncounterEffect | null;
  summary: string;
  discard?: boolean;
  suppressPendingFailure?: boolean;
  pendingFailureReactionId?: string;
  salvageCost?: number;
  exhaustInstanceId?: string;
  mirrorReroll?: SoloRerollResolvedAction;
  rollModifier?: RollModifierSource & {
    stat: CheckStat;
    mode: "battle" | "check";
  };
  chargeInstanceId?: string;
  pendingTileChallengeId?: string;
  staticIntercessionReactionId?: string;
  pendingTileChallengeEffectId?: string;
  scarConsequenceReactionId?: string;
  scarInstanceId?: string;
  pendingScarEffectId?: string;
  forcedDisplacementReactionId?: string;
  forcedDisplacementSourceEventId?: string;
  oathchainReveal?: ActiveOathchainReveal;
}

export interface UseFollowerAction extends BaseAction {
  type: "USE_FOLLOWER";
  followerId: string;
  followerInstanceId?: string;
  woundCost?: number;
  grantAllStatBoost?: boolean;
  effect: EncounterEffect | null;
  summary: string;
  discard?: boolean;
  suppressPendingFailure?: boolean;
  pendingFailureReactionId?: string;
  rollModifier?: RollModifierSource & {
    stat: CheckStat;
    mode: "battle" | "check";
  };
}

export interface AfflictionDrawnAction extends BaseAction {
  type: "AFFLICTION_DRAWN";
  afflictionId: string;
  affliction?: AfflictionCard;
  die?: number;
  chosenStat?: Stat;
  publicSummary?: string;
  privateSummary?: string;
  deltas?: string[];
}

export interface AfflictionDrawPreparedAction extends BaseAction {
  type: "AFFLICTION_DRAW_PREPARED";
  resolutionId: string;
  afflictionId: string;
  die: number;
}

export interface AfflictionStatChosenAction extends BaseAction {
  type: "AFFLICTION_STAT_CHOSEN";
  resolutionId: string;
  stat: Stat;
}

export interface AfflictionReactionOpenedAction extends BaseAction {
  type: "AFFLICTION_REACTION_OPENED";
  reactionId: string;
  afflictionId: "blood-fury" | "future-sickness" | "bile-spit";
  kind: "battleReroll" | "turnReroll" | "arrivalWound";
  targetSeatId?: string;
  originalRoll: number[];
  sourceEventId?: string;
  pendingResult?: CheckRolledAction | CombatResolvedAction;
}

export interface AfflictionReactionResolvedAction extends BaseAction {
  type: "AFFLICTION_REACTION_RESOLVED";
  reactionId: string;
  use: boolean;
  dieIndex?: number;
  reroll?: number;
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
  wounds?: number;
  trophies?: number;
  completedContracts?: number;
};

export type ShopServiceResult = {
  salvageDelta?: number;
  woundDelta?: number;
  trophyDelta?: number;
  gainGear?: GearItem;
  discardGearId?: string;
  note?: string;
  repairGearInstanceId?: string;
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
  stock: Array<GearItem | Follower>;
  artifactRequisitionId?: string;
  reservedCompletedMissionIds?: string[];
  summary: string;
}

export interface ShopBrowseSelectedAction extends BaseAction {
  type: "SHOP_BROWSE_SELECTED";
  sectorId: string;
  view: "categories" | "equipment" | "supplies" | "artifacts" | "route-aids" | "services" | "sell";
  selectedId: string | null;
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
  spentCompletedContractIds?: string[];
  artifactRequisitionId?: string;
  summary: string;
}

export interface ShopFollowerPurchaseResolvedAction extends BaseAction {
  type: "SHOP_FOLLOWER_PURCHASE_RESOLVED";
  serviceId: "buy-route-aids";
  shopName: string;
  sectorId: string;
  cardId: string;
  cost: ShopServiceCost;
  gainedFollower: Follower;
  discardedStockIds: string[];
  summary: string;
}

export interface ShopSellResolvedAction extends BaseAction {
  type: "SHOP_SELL_RESOLVED";
  shopName: string;
  sectorId: string;
  gearId: string;
  instanceId?: string;
  soldGear: GearItem;
  salvageDelta: number;
  summary: string;
}

export interface ShopSkippedAction extends BaseAction {
  type: "SHOP_SKIPPED";
  shopName: string;
  sectorId: string;
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

export interface MissionRelicExchangeOpenedAction extends BaseAction {
  type: "MISSION_RELIC_EXCHANGE_OPENED";
  exchangeId: string;
  selectedMissionIds: string[];
  options: GearItem[];
}

export interface MissionRelicClaimedAction extends BaseAction {
  type: "MISSION_RELIC_CLAIMED";
  exchangeId: string;
  artifactId: string;
  artifact: GearItem;
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
  revealedCard?: {
    id: string;
    title: string;
    type: "anomaly" | "artifact" | "contract" | "escalation";
    flavor: string;
    artType: "anomaly" | "artifact" | "contract" | "escalation";
    sourceDeck: "anomaly" | "artifact" | "contract" | "escalation";
    sourceSectorId: string;
    privacy: "public" | "owner";
  };
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

export interface ScenarioPreparationGainedAction extends BaseAction {
  type: "SCENARIO_PREPARATION_GAINED";
  scenarioId: string;
  resourceKey: string;
  amount: number;
  maximum?: number;
  sourceEventId: string;
  objectiveId?: string;
  summary: string;
}

export interface ScenarioPreparationSpentAction extends BaseAction {
  type: "SCENARIO_PREPARATION_SPENT";
  scenarioId: string;
  resourceKey: string;
  amount: number;
  sourceEventId: string;
  summary: string;
}

export interface ScenarioConfrontationStartedAction extends BaseAction {
  type: "SCENARIO_CONFRONTATION_STARTED";
  scenarioId: string;
  confrontationId: string;
  sourceEventId: string;
  stage: string;
  summary: string;
}

export interface ScenarioConfrontationProgressGainedAction extends BaseAction {
  type: "SCENARIO_CONFRONTATION_PROGRESS_GAINED";
  scenarioId: string;
  confrontationId: string;
  progressKey: string;
  amount: number;
  progressMode?: "accumulate" | "replace";
  sourceEventId: string;
  stage: string;
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
  victoryConditionId?: string;
  sourceType?: "confrontation" | "scenarioAction";
  sourceId?: string;
  shared?: boolean;
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
  cost: { kind: "trophy" | "action"; amount: number };
}

export interface StatRaisedAction extends BaseAction {
  type: "STAT_RAISED";
  stat: Stat;
  cost: number;
  previousValue: number;
  nextValue: number;
}

export interface RoundCompletedAction extends BaseAction {
  type: "ROUND_COMPLETED";
}

export interface EscalationAdvancedAction extends BaseAction {
  type: "ESCALATION_ADVANCED";
  amount: number;
  newLevel: number;
  modifier: number;
  previousLevel?: number;
  requestedAmount?: number;
  guardedReason?: "oneBeforeCollapseGuard";
  reason?: string;
  sourceCardId?: string;
  sourceEventId?: string;
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
  transitionCause?: "end-turn" | "automatic";
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

export interface ScarTriggerEventAction extends BaseAction {
  type: "SCAR_TRIGGER_EVENT";
  sourceEvent: ScarSourceEvent;
}

export interface ContinueScarConsequenceAction extends BaseAction {
  type: "CONTINUE_SCAR_CONSEQUENCE";
  reactionId: string;
}

export type GameAction =
  | SessionStartedAction
  | EdgeDeckInitializedAction
  | EdgeDeckShuffledAction
  | EdgeCardAwardedAction
  | EdgeCardPlayedAction
  | NamedPlayerRulesReconciledAction
  | MoveRequestedAction
  | TransitionRouteAidUsedAction
  | TierTransitionCompletedAction
  | InnerApproachMovedAction
  | MovementRollRequestedAction
  | AdjustMovementRequestedAction
  | SelectRouteStarVariantAction
  | ClearRouteStarChoiceAction
  | ActivateGateSaintAction
  | UseMarrowDetourAction
  | MovementRolledAction
  | MovementUnavailableResolvedAction
  | MovedAction
  | MovementResolvedAction
  | EncounterDrawnAction
  | ThreatBagShuffledAction
  | ThreatArrivalOutcomeRecordedAction
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
  | EncounterDecisionResolvedAction
  | MemoryTaxChoiceResolvedAction
  | ForcedDestinationSelectedAction
  | ForcedDisplacementResolvedAction
  | SutureStormContinuedAction
  | WoundThresholdReachedAction
  | ChooseScarAction
  | ScarThresholdResolvedAction
  | ScarRemovalOfferedAction
  | ScarRemovedAction
  | RecruitReplacementAction
  | EquipGearAction
  | ResolveGearEquipChoiceAction
  | SelectEquipmentSuppressionTargetAction
  | UnequipGearAction
  | UseGearAction
  | UseFollowerAction
  | AfflictionDrawnAction
  | AfflictionDrawPreparedAction
  | AfflictionStatChosenAction
  | AfflictionReactionOpenedAction
  | AfflictionReactionResolvedAction
  | TableInteractionAction
  | ShopServiceResolvedAction
  | ShopStockRevealedAction
  | ShopBrowseSelectedAction
  | ShopPurchaseResolvedAction
  | ShopFollowerPurchaseResolvedAction
  | ShopSellResolvedAction
  | ShopSkippedAction
  | AcceptContractAction
  | CompleteContractAction
  | MissionRelicExchangeOpenedAction
  | MissionRelicClaimedAction
  | ScenarioConfrontationRequestedAction
  | SpaceTextResolvedAction
  | ScenarioProgressAdvancedAction
  | ScenarioPreparationGainedAction
  | ScenarioPreparationSpentAction
  | ScenarioConfrontationStartedAction
  | ScenarioConfrontationProgressGainedAction
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
  | CoopDefeatTriggeredAction
  | ScarTriggerEventAction
  | ContinueScarConsequenceAction;

export type LegacyCompatibleShopServiceCost = ShopServiceCost & {
  heat?: number;
};

export type LegacyCompatibleShopServiceResult = ShopServiceResult & {
  heatDelta?: number;
};

type LegacyEffectAction =
  | (Omit<MovementResolvedAction, "effect"> & { effect: LegacyCompatibleEncounterEffect | null })
  | (Omit<EncounterDrawnAction, "revealEffect"> & { revealEffect?: LegacyCompatibleEncounterEffect | null })
  | (Omit<CheckRolledAction, "effect"> & { effect: LegacyCompatibleEncounterEffect | null })
  | (Omit<SoloRerollResolvedAction, "effect"> & { effect: LegacyCompatibleEncounterEffect | null })
  | (Omit<CombatResolvedAction, "effect"> & { effect: LegacyCompatibleEncounterEffect })
  | (Omit<ResolutionAppliedAction, "effect"> & { effect: LegacyCompatibleEncounterEffect })
  | (Omit<UseGearAction, "effect"> & { effect: LegacyCompatibleEncounterEffect | null })
  | (Omit<UseFollowerAction, "effect"> & { effect: LegacyCompatibleEncounterEffect | null })
  | (Omit<TableInteractionAction, "effect" | "targetEffect"> & {
      effect: LegacyCompatibleEncounterEffect | null;
      targetEffect?: LegacyCompatibleEncounterEffect | null;
    })
  | (Omit<SpaceTextResolvedAction, "effect"> & { effect?: LegacyCompatibleEncounterEffect | null })
  | (Omit<ScenarioProgressAdvancedAction, "effect"> & { effect?: LegacyCompatibleEncounterEffect | null })
  | (Omit<ScenarioConfrontationProgressGainedAction, "effect"> & { effect?: LegacyCompatibleEncounterEffect | null });

type LegacyShopAction =
  | (Omit<ShopServiceResolvedAction, "cost" | "result"> & {
      cost: LegacyCompatibleShopServiceCost;
      result: LegacyCompatibleShopServiceResult;
    })
  | (Omit<ShopStockRevealedAction, "cost"> & { cost: LegacyCompatibleShopServiceCost })
  | (Omit<ShopPurchaseResolvedAction, "cost"> & { cost: LegacyCompatibleShopServiceCost });

export type LegacyCompatibleGameAction =
  | GameAction
  | HeatThresholdReachedAction
  | LegacyEffectAction
  | LegacyShopAction
  | (Omit<StabilizeResolvedAction, "cost"> & {
      cost: { kind: "heat" | "trophy" | "action"; amount: number };
    });

export type ClientIntent =
  | {
      type: "HOST_SETUP_PREVIEW_REQUESTED";
      seatId: string;
      scenarioId: string;
      mode: "single-player" | "co-op" | "rivalry" | "nemesis";
      playerCount: number;
    }
  | {
      type: "HOST_VIEW_REQUESTED";
      seatId: string;
      mode: "signal" | "map";
    }
  | {
      type: "RETURN_TO_LOBBY_REQUESTED";
      seatId: string;
    }
  | {
      type: "MOVEMENT_DESTINATION_PREVIEWED";
      seatId: string;
      toSectorId: string | null;
      routeId?: string;
      movementRevision?: number;
    }
  | {
      type: "MOVE_REQUESTED";
      seatId: string;
      toSectorId: string;
      voidKeyInstanceId?: string;
      routeId?: string;
      movementRevision?: number;
    }
  | {
      type: "TIER_TRANSITION_REQUESTED";
      seatId: string;
      destinationSectorId: string;
      movementRevision: number;
      voidKeyInstanceId?: string;
    }
  | {
      type: "INNER_APPROACH_MOVE_REQUESTED";
      seatId: string;
      destinationSectorId: string;
      movementRevision: number;
    }
  | {
      type: "USE_TRANSITION_ROUTE_AID";
      seatId: string;
      sourceKind: "gear" | "follower";
      instanceId: string;
      destinationSectorId: string;
      movementRevision: number;
    }
  | {
      type: "MOVEMENT_ROLL_REQUESTED";
      seatId: string;
    }
  | { type: "ADJUST_MOVEMENT_REQUESTED"; seatId: string; instanceId: string; adjustment: -1 | 1 }
  | { type: "SELECT_ROUTE_STAR_VARIANT"; seatId: string; instanceId: string; destinationId: string; routeId: string; movementRevision: number }
  | { type: "ACTIVATE_GATE_SAINT"; seatId: string; instanceId: string }
  | { type: "USE_MARROW_DETOUR"; seatId: string; instanceId: string; reactionId: string; toSectorId: string }
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
      type: "PLAY_EDGE_CARD";
      seatId: string;
      cardId: string;
      resolutionId: string;
      mode: "commit-value";
    }
  | {
      type: "START_TILE_ENCOUNTER";
      seatId: string;
      encounterId: string;
      resolutionId: string;
    }
  | {
      type: "COMBAT_REQUESTED";
      seatId: string;
      stat: CheckStat;
    }
  | {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED";
      seatId: string;
      sourceId: string;
      stat: CheckStat;
      helperSeatIds: string[];
    }
  | {
      type: "COOPERATIVE_ASSISTANCE_RESPONDED";
      seatId: string;
      requestId: string;
      accept: boolean;
    }
  | {
      type: "COOPERATIVE_ASSISTANCE_LOCKED";
      seatId: string;
      requestId: string;
    }
  | {
      type: "COOPERATIVE_ASSISTANCE_CANCELLED";
      seatId: string;
      requestId: string;
    }
  | {
      type: "COOPERATIVE_TEST_ROLL_REQUESTED";
      seatId: string;
      testId: string;
    }
  | {
      type: "BROKEN_CONCORDANCE_NODE_REQUESTED";
      seatId: string;
      nodeId: string;
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
      type: "AFFLICTION_STAT_CHOSEN";
      seatId: string;
      resolutionId: string;
      stat: Stat;
    }
  | {
      type: "AFFLICTION_REACTION_RESOLVED";
      seatId: string;
      reactionId: string;
      use: boolean;
      dieIndex?: number;
    }
  | {
      type: "CONTINUE_RESOLUTION";
      seatId: string;
    }
  | { type: "ENCOUNTER_DECISION_REQUESTED"; seatId: string; decisionId: string; decisionVersion: number; optionId: string }
  | { type: "MEMORY_TAX_CHOICE_REQUESTED"; seatId: string; choiceId: string; choiceVersion: number; optionId: MemoryTaxOptionId }
  | { type: "FORCED_DESTINATION_SELECTED"; seatId: string; choiceId: string; destinationSectorId: string }
  | { type: "FORCED_DISPLACEMENT_ACCEPTED"; seatId: string; reactionId: string }
  | {
      type: "CONTINUE_SCAR_CONSEQUENCE";
      seatId: string;
      reactionId: string;
    }
  | { type: "CHOOSE_SCAR"; seatId: string; selectionId: string; scarId: string }
  | { type: "PURGE_SCAR_REQUESTED"; seatId: string; choiceId: string; scarId: string }
  | { type: "USE_SCAR_ADAPTATION"; seatId: string; activationId: string; scarId: string; ruleKey: string; targetId?: string; rollIndex?: number }
  | {
      type: "SET_READY";
      seatId: string;
      ready: boolean;
    }
  | {
      type: "SELECT_CHARACTER";
      seatId: string;
      characterId: string;
      signalPieceId?: import("../../shared/signalPieceCatalog.js").SignalPieceId;
    }
  | {
      type: "SELECT_STARTING_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "SELECT_STARTING_BONUS";
      seatId: string;
      offerId: string;
      optionKind: "gear" | "follower";
      optionId: string;
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
      instanceId?: string;
      slot: GearSlot;
    }
  | {
      type: "RESOLVE_GEAR_EQUIP_CHOICE";
      seatId: string;
      choiceId: string;
      itemInstanceId: string;
      decision: "equip" | "keepCarried";
    }
  | {
      type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET";
      seatId: string;
      choiceId: string;
      itemInstanceId: string;
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
      instanceId?: string;
      pendingTileChallengeId?: string;
      staticIntercessionReactionId?: string;
      pendingTileChallengeEffectId?: string;
      scarConsequenceReactionId?: string;
      scarInstanceId?: string;
      pendingScarEffectId?: string;
      contractSignature?: string;
      forcedDisplacementReactionId?: string;
      forcedDisplacementSourceEventId?: string;
    }
  | {
      type: "USE_FOLLOWER";
      seatId: string;
      followerId: string;
      escalate?: boolean;
    }
  | { type: "AFFLICTION_STAT_CHOSEN"; seatId: string; resolutionId: string; stat: Stat }
  | { type: "AFFLICTION_REACTION_RESOLVED"; seatId: string; reactionId: string; use: boolean; dieIndex?: number }
  | {
      type: "USE_CHARACTER_ABILITY";
      seatId: string;
      abilityId: string;
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
      itemInstanceId?: string;
    }
  | {
      type: "SHOP_BROWSE_SELECTED";
      seatId: string;
      view: "categories" | "equipment" | "supplies" | "artifacts" | "route-aids" | "services" | "sell";
      selectedId?: string | null;
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
      instanceId?: string;
    }
  | {
      type: "SHOP_SKIP_REQUESTED";
      seatId: string;
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
  | { type: "SELECT_REPLACEMENT_CONTRACT"; seatId: string; selectionId: string; contractId: string }
  | { type: "OPEN_MISSION_RELIC_EXCHANGE"; seatId: string; missionIds: string[] }
  | { type: "CLAIM_MISSION_RELIC"; seatId: string; exchangeId: string; artifactId: string }
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
