import { WebSocketServer, type WebSocket } from "ws";
import {
  SIGNAL_PIECE_IDS,
  getSignalPieceIdForSeat,
  isSignalPieceId,
  type SignalPieceId
} from "../shared/signalPieceCatalog.js";
import { loadCharacters } from "../game/content/characters.js";
import { loadAfflictionCards } from "../game/content/afflictions.js";
import { loadContracts } from "../game/content/contracts.js";
import { loadAnomalyCards } from "../game/content/anomalies.js";
import { loadArtifactCards } from "../game/content/artifacts.js";
import { loadEscalationCards } from "../game/content/escalations.js";
import { loadFollowers } from "../game/content/followers.js";
import { loadGear } from "../game/content/gear.js";
import { loadScarCards } from "../game/content/scars.js";
import { loadThreatCards } from "../game/content/threats.js";
import {
  getThreatEffectTiming,
  isThreatEffectKey,
  resolveThreatEffect,
  threatBlocksRerolls,
  type ThreatEffectResult,
  type ThreatEffectTiming
} from "../game/cards/threatEffects.js";
import { getThreatPresentationCategory } from "../game/cards/cardCategories.js";
import { resolveBoardTextChoice, resolveBoardTextEffect, type BoardTextDeckKind } from "../game/data/boardTextEffects.js";
import { nemeses, type NemesisDefinition } from "../game/data/nemeses.js";
import {
  SCENARIOS,
  getScenarioDefinition,
  isScenarioEligibleForSession,
  type ScenarioDefinition
} from "../game/data/scenarios.js";
import { getScenarioSheetArtPath } from "../game/data/scenarioSheetArt.js";
import { getCharacterPresentation, type CharacterPresentation } from "../game/data/characterPresentation.js";
import {
  EDGE_CARD_BY_ID,
  EDGE_CARD_DECK,
  EDGE_RULES,
  getEdgeHandLimit,
  type EdgeAbilityKey,
  type EdgeCardDefinition
} from "../game/data/edgeCards.js";
import {
  advanceContractObjectiveProgress,
  advanceContractObjectiveState,
  describeContractObjective,
  formatContractObjectiveStatus,
  formatContractProgress,
  isContractObjectiveComplete,
  setContractProgressFloor
} from "../game/contracts/objectives.js";
import { getEscalationCollapseLevel, getEscalationModifier } from "../game/engine/escalation.js";
import {
  buildScenarioTelemetry,
  createInitialScenarioPreparation,
  createInitialScenarioProgress,
  describeScenarioPressure,
  resolveScenarioContractCompleted,
  resolveScenarioEnemyDefeat,
  resolveScenarioGearGained,
  resolveScenarioSectorEntered,
  resolveScenarioSkillResolved,
  resolveScenarioTurnEnd,
  resolveScenarioTurnStart,
  resolveScenarioWoundsTaken,
  type ScenarioAmbientResolution
} from "../game/rules/scenarioAmbient.js";
import { buildScenarioPressureState } from "../game/rules/scenarioPressure.js";
import { getReflectionPressureThreshold } from "../game/rules/reflectionPressure.js";
import {
  getAfflictionWoundPrevention,
  getAfflictionModifierSources,
  getAfflictionRestrictions,
  preventWoundInEffect,
  summarizeAfflictions
} from "../game/rules/afflictions.js";
import { getSessionStartReadiness, hasCompletedStartingBonusSelection } from "../game/rules/sessionStart.js";
import {
  getBrokenSealTokenLimit,
  getDevourerTrophyGate,
  getDyingStarContractGate,
  getDyingStarTokenGate,
  getLabyrinthEngineKeyGate,
  getSoloCombatDifficultyEase,
  getSoloMovementDifficultyEase
} from "../game/rules/soloTuning.js";
import {
  ASHEN_CROWN_NEXUS_SECTOR_ID,
  buildNemesisMovementPath,
  createNemesisChampionsForSeats,
  getAssistBonus,
  getCrownKeyFragmentCount,
  getDistanceToNexus,
  getEligibleAssistSeatIds,
  getNemesisCombatStat,
  getNemesisCombatValue,
  getNemesisMovementStepCount,
  hasCrownKeyFragment
} from "../game/rules/nemesisRelay.js";
import {
  buildMovementRoutePlan,
  buildTierTransitionOptions,
  buildTransitionRouteAidDestinations,
  canVoidKeyOverrideTierTransition,
  getForcedDisplacementDestination,
  getMovementStepBlockReason,
  getRingTrackNeighbor,
  getLegalMovementRoute,
  getLegalMovementRouteVariant,
  getMovementBlockReason,
  getVoidKeyMovementRoute
} from "../game/rules/movementPlanner.js";
import {
  buildInnerApproachMoveOptions,
  getInnerApproachProgress,
  getInnerApproachRouteProgress,
  getInnerApproachPathForEntry,
  isInnerApproachChallengeCleared,
  isInnerApproachSector
} from "../game/rules/innerApproach.js";
import { canRiftAnchorSpikeSuppress } from "../game/rules/forcedDisplacement.js";
import { getNextNonBattleTestModifierSource } from "../game/rules/nextNonBattleTestModifier.js";
import {
  getEligibleCooperativeHelperSeatIds,
  getIntrinsicBaseStat,
  isCooperativeAssistanceMode,
  lockCooperativeContributions,
  MAX_COOPERATIVE_HELPERS,
  sumCooperativeContributions
} from "../game/rules/cooperativeAssistance.js";
import { evaluateOwnedScarRules } from "../game/rules/scarPersistentRules.js";
import { getScarCard } from "../game/rules/scarSystem.js";
import { getOwnedScarAdaptationControls } from "../game/rules/scarAdaptationControls.js";
import {
  BROKEN_CONCORDANCE_CENTER_SECTOR_ID,
  BROKEN_CONCORDANCE_NODES,
  BROKEN_CONCORDANCE_SCENARIO_ID,
  BROKEN_CONCORDANCE_STAGES,
  getBrokenConcordanceNode,
  getBrokenConcordanceStage
} from "../game/rules/brokenConcordance.js";
import {
  getNextNormalMovementRollModifierSource,
  resolveNormalMovementAllowance
} from "../game/rules/nextNormalMovementRollModifier.js";
import { createInitialSessionState } from "./sessionState.js";
import { stripLegacyHeatProjection } from "./legacyHeatProjection.js";
import { resolveBoardSpaceEvent } from "../game/tileResolver.js";
import { buildTileArrivalProjection, canEndTurn, getServiceThreatGate } from "../game/rules/tileFunctions.js";
import {
  calculateExplorationDraws,
  type BoardThreatCard,
  type ExplorationDrawCounts
} from "../game/rules/explorationPhase.js";
import {
  buildContractCompletedObjectiveEvent,
  resolveScenarioObjectiveTrigger,
  type ScenarioObjectiveTriggerEvent
} from "../game/rules/scenarioObjectiveTriggers.js";
import {
  getEffectiveRivalryMode,
  getRivalryAgendaDefinition,
  getRivalryAgendaProgressSnapshot,
  resolveRivalryAgendaTrigger,
  type RivalryAgendaTriggerEvent
} from "../game/rules/rivalryAgendaTriggers.js";
import {
  canUseQaShopGear,
  getAvailableShopStockForCategory,
  getBoardSpaceShopCategory,
  getBoardSpaceShopTypeLabel,
  getGearSellRestriction,
  getGearShopCategoryIds,
  getShopGearSellValue,
  getShopGearCost,
  getShopStockCategoryForService,
  isBoardSpaceShopCapable,
  isGearAvailableFromShopCategory,
  SHOP_FAILURE_LABELS,
  SHOP_FAILURE_REASONS,
  type ShopFailureReason
} from "../game/rules/shopAvailability.js";
import {
  CW_ENEMY_MODIFIER_LABEL,
  NAMED_PLAYER_FANDIABLOS_ID,
  NAMED_PLAYER_POPELORD_ID,
  NAMED_PLAYER_QA_CHARACTER_ID,
  canNamedPlayerSelectCharacter,
  getNamedPlayerEnemyModifier,
  getNamedPlayerFollowerInstanceId,
  requiresBoundFandiablos,
  resolveNamedPlayerRules
} from "../game/rules/namedPlayerRules.js";
import { getChallengeItemEligibility } from "../game/rules/challengeItemEligibility.js";
import {
  getPersistentEnemyDifficultyModifier,
  getPersistentHazardExtraThreatLane,
  isFirstThreatGearSuppressed
} from "../game/rules/persistentHazards.js";
import { resolveSpaceText } from "../game/rules/tileTextResolver.js";
import { applyStartingLoadout, ARTIFACT_EXCHANGE_CONTRACT_COST } from "../game/rules/startingLoadout.js";
import {
  addActiveMission,
  getActiveMission,
  getActiveMissions,
  MAX_ACTIVE_MISSIONS,
  MISSION_RELIC_EXCHANGE_COST,
  MISSION_RELIC_OPTION_COUNT,
  setActiveMissions
} from "../game/rules/missionLifecycle.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  getStatUpgradeWindow,
  isUpgradeableStat,
  NORMAL_STAT_UPGRADE_CAP
} from "../game/rules/statUpgrades.js";
import type {
  AcceptContractAction,
  CheckRolledAction,
  CheckRequestedAction,
  CombatRequestedAction,
  CompleteContractAction,
  DiceRollStartedAction,
  EdgeCardAwardedAction,
  EdgeCardPlayedAction,
  EdgeCardReactionOpenedAction,
  EdgeCardReactionResolvedAction,
  EdgeCardReactionDeclinedAction,
  EdgeDeckInitializedAction,
  EdgeDeckShuffledAction,
  EscalationAdvancedAction,
  ClientIntent,
  CombatResolvedAction,
  EncounterDrawnAction,
  EnemyRollRequestedAction,
  EquipGearAction,
  GameAction,
  MovementResolvedAction,
  MovementRolledAction,
  MissionRelicClaimedAction,
  MissionRelicExchangeOpenedAction,
  MoveRequestedAction,
  TierTransitionCompletedAction,
  InnerApproachMovedAction,
  NemesisCombatResolvedAction,
  NemesisDefeatedAction,
  NemesisMovedAction,
  NemesisNexusCountdownStartedAction,
  NemesisSpawnedAction,
  PhaseAdvancedAction,
  ResolutionContinuedAction,
  RivalryAgendaRevealedAction,
  RivalryAgendaProgressTriggeredAction,
  RoundCompletedAction,
  SectorCollapsedAction,
  SpaceTextResolvedAction,
  ShopPurchaseResolvedAction,
  ShopBrowseSelectedAction,
  ShopSellResolvedAction,
  ShopServiceCost,
  ShopServiceResolvedAction,
  ShopSkippedAction,
  ShopStockRevealedAction,
  ScenarioConfrontationRequestedAction,
  ScenarioPreparationGainedAction,
  ScenarioConfrontationStartedAction,
  ScenarioConfrontationProgressGainedAction,
  ScenarioObjectiveCompletedAction,
  ScenarioObjectiveProgressTriggeredAction,
  ScenarioProgressAdvancedAction,
  ScenarioVictoryAchievedAction,
  SoloRerollResolvedAction,
  StabilizeResolvedAction,
  StatRaisedAction,
  TableInteractionAction,
  UnequipGearAction,
  UseFollowerAction,
  UseGearAction,
  AfflictionDrawPreparedAction,
  AfflictionDrawnAction,
  AfflictionStatChosenAction,
  AfflictionReactionOpenedAction,
  AfflictionReactionResolvedAction,
  RollModifierSource
} from "../game/engine/actions.js";
import {
  getCharacterStatBreakdown,
  getCompanionStatModifierSources,
  getEquippedGearItem,
  getEquippedGearModifierSources
} from "../game/engine/gear.js";
import { getMovementProfile } from "../game/rules/movementPhase.js";
import type {
  AnomalyCard,
  ArtifactCard,
  AuthoredEncounterEffect,
  EncounterEffect,
  EscalationCard,
  ScarCard,
  ThreatCard
} from "../game/schema/card.schema.js";
import type { AuthoredCharacter, Character } from "../game/schema/character.schema.js";
import type { Stat } from "../game/schema/character.schema.js";
import type { ContractCard } from "../game/schema/contract.schema.js";
import type { Follower } from "../game/schema/follower.schema.js";
import type { GearItem, ShopCategory } from "../game/schema/gear.schema.js";
import type { AfflictionCard } from "../game/schema/affliction.schema.js";
import { createSeededRandomSource, rollDice, type RandomSource, defaultRandomSource } from "../game/engine/dice.js";
import { applyEffectToState, reduceGameState } from "../game/engine/reducer.js";
import { CHALLENGE_LABELS } from "../game/ui/challengeTheme.js";
import {
  completeEquipmentSuppressionLifecycle,
  getEligibleEquipmentSuppressionTargets,
  getSuppressedEquipmentInstanceIds,
  isOwnedItemEffectActive,
  reserveEquipmentSuppressions
} from "../game/rules/equipmentSuppression.js";
import {
  createEmptyScenarioConfrontationState,
  createEmptyScenarioResultState,
  type ActiveResolution,
  type CooperativeAssistanceState,
  type GameMode,
  type GameState,
  type InteractionMode,
  type NemesisChampion,
  type PlayerState,
  type PendingCooperativeTest,
  type StartingBonusOptionRef,
  type SessionMode
} from "../game/schema/session.schema.js";
import { validateHostToken, validateJoinToken } from "./auth.js";
import { BOARD_SPACES, getBoardSpace, isScenarioConfrontationSpace, type BoardTier, type ThreatIcon } from "../game/data/boardSpaces.js";
import { getBoardRingTransition } from "../game/data/boardTransitions.js";

export const ESCALATION_FEEDERS = {
  woundTaken: 1,
  trophyDiscarded: 1
} as const;

const RAISE_STAT_FEEDS_ESCALATION = false;
const RAISE_STAT_ESCALATION_REASON = "forged in fire";
const ENEMY_ROLL_TIMEOUT_MS = 30_000;
const EDGE_THREAT_CATALOG = loadThreatCards();

interface EdgeAbilityAvailability {
  enabled: boolean;
  resolutionId: string | null;
  disabledReason: string | null;
  targets: Array<{ id: string; label: string }>;
}

function encounterEffectContains(
  effect: EncounterEffect | null | undefined,
  predicate: (candidate: EncounterEffect) => boolean
): boolean {
  if (!effect) return false;
  if (predicate(effect)) return true;
  return effect.type === "sequence"
    ? effect.effects.some((candidate) => encounterEffectContains(candidate, predicate))
    : false;
}

function collectNonWoundFailureEffectTargets(
  effect: EncounterEffect,
  path = "root"
): Array<{ id: string; label: string }> {
  if (effect.type === "sequence") {
    return effect.effects.flatMap((entry, index) =>
      collectNonWoundFailureEffectTargets(entry, path === "root" ? String(index) : `${path}.${index}`)
    );
  }
  if (effect.type === "take_wound" || effect.type === "gain_note") return [];
  const effectName = effect.type
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
  return [{ id: path, label: `Ignore ${effectName}` }];
}

function getOpenedEdgeReaction(
  state: GameState,
  reactionId: string
): EdgeCardReactionOpenedAction | undefined {
  return [...state.eventLog].reverse().find((entry) => {
    const candidate = entry as Partial<EdgeCardReactionOpenedAction>;
    return candidate.type === "EDGE_CARD_REACTION_OPENED" && candidate.reactionId === reactionId;
  }) as EdgeCardReactionOpenedAction | undefined;
}

function hasKnownEnemyFamilyTrophy(
  state: GameState,
  player: PlayerState,
  enemyFamily: string | undefined
): boolean {
  if (!enemyFamily) return false;
  return (player.character.trophyPile ?? []).some((entry) =>
    EDGE_THREAT_CATALOG.get(entry.cardId)?.enemyFamily === enemyFamily &&
    Math.max(0, entry.trophyValue - (entry.spentValue ?? 0)) > 0
  );
}

function getEdgeAbilityAvailability(
  state: GameState,
  seatId: string,
  definition: EdgeCardDefinition
): EdgeAbilityAvailability {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const activeSeatId = state.turnOrder[state.activeSeatIndex];
  const encounter = state.currentEncounter;
  const resolution = state.activeResolution;
  const unavailable = (disabledReason: string): EdgeAbilityAvailability => ({
    enabled: false,
    resolutionId: null,
    disabledReason,
    targets: []
  });

  if (!player || activeSeatId !== seatId || player.character.status !== "active") {
    return unavailable("Only the active operative can use this Edge ability.");
  }
  if (state.pendingEdgeCommit || state.pendingEdgeAbility) {
    return unavailable("Another Edge Card is already committed.");
  }

  const reaction = state.pendingEdgeReaction;
  if (reaction) {
    if (
      reaction.ownerSeatId !== seatId ||
      !reaction.legalCardIds.includes(definition.id)
    ) {
      return unavailable("This ability does not match the pending result.");
    }
    const opened = getOpenedEdgeReaction(state, reaction.id);
    const targets =
      definition.abilityKey === "reroll-die"
        ? reaction.originalRoll.map((face, index) => ({
            id: String(index),
            label: `Reroll die ${index + 1} (${face})`
          }))
        : definition.abilityKey === "raise-natural-one"
          ? reaction.originalRoll.flatMap((face, index) =>
              face === 1 ? [{ id: String(index), label: `Raise die ${index + 1} from 1 to 2` }] : []
            )
          : definition.abilityKey === "convert-trophy"
            ? Array.from(
                {
                  length: Math.min(
                    2,
                    state.currentEncounter?.cardType === "enemy"
                      ? state.currentEncounter.trophyValue
                      : 0
                  )
                },
                (_, index) => ({
                  id: String(index + 1),
                  label: `Convert ${index + 1} Trophy to ${index + 1} Salvage`
                })
              )
            : definition.abilityKey === "shunt-failure-effect" &&
                opened?.pendingResult.type === "CHECK_ROLLED" &&
                opened.pendingResult.effect
              ? collectNonWoundFailureEffectTargets(opened.pendingResult.effect)
              : [];
    const requiresTarget = [
      "reroll-die",
      "raise-natural-one",
      "convert-trophy",
      "shunt-failure-effect"
    ].includes(definition.abilityKey);
    return {
      enabled: targets.length > 0 || !requiresTarget,
      resolutionId: reaction.resolutionId,
      disabledReason: targets.length === 0 && requiresTarget
        ? "No legal target is available."
        : null,
      targets
    };
  }

  if (definition.abilityKey === "boost-helper") {
    const assistance = state.cooperativeAssistance;
    if (
      assistance?.activeSeatId !== seatId ||
      assistance.status !== "locked" ||
      assistance.lockedContributions.length === 0 ||
      resolution?.playerId !== seatId ||
      resolution.stage !== "battle_setup" ||
      !encounter ||
      assistance.sourceId !== encounter.id
    ) {
      return unavailable("Available after accepted assistance is locked and before the roll.");
    }
    return {
      enabled: true,
      resolutionId: resolution.id,
      disabledReason: null,
      targets: assistance.lockedContributions.map((entry) => ({
        id: entry.seatId,
        label: `Boost ${state.seats.find((seat) => seat.seatId === entry.seatId)?.displayName ?? entry.seatId} by +2`
      }))
    };
  }

  if (definition.abilityKey === "shop-discount") {
    const boardSpace = getBoardSpace(player.character.currentSpaceId);
    const shopReady =
      state.phase === "action" &&
      !encounter &&
      !state.pendingEffect &&
      Boolean(boardSpace && isBoardSpaceShopCapable(boardSpace)) &&
      getServiceThreatGate(state, seatId, player.character.currentSpaceId).allowed;
    if (!shopReady) {
      return unavailable("Available at an open shop before a purchase or paid service.");
    }
    return {
      enabled: true,
      resolutionId: `edge-shop:${seatId}:${player.character.currentSpaceId}:${state.sequence + 1}`,
      disabledReason: null,
      targets: []
    };
  }

  const isSetup =
    state.phase === "action" &&
    resolution?.playerId === seatId &&
    resolution.stage === "battle_setup" &&
    Boolean(encounter) &&
    resolution.id.length > 0;
  if (!isSetup || !encounter || !resolution) {
    return unavailable(
      definition.abilityTimings.includes("after-battle-roll") ||
      definition.abilityTimings.includes("after-challenge-roll")
        ? "Available after the matching roll, before its result is finalized."
        : "Available during the matching pre-roll setup."
    );
  }

  if (definition.abilityKey === "reduce-enemy-difficulty") {
    return encounter.cardType === "enemy"
      ? { enabled: true, resolutionId: resolution.id, disabledReason: null, targets: [] }
      : unavailable("Requires an enemy battle.");
  }
  if (definition.abilityKey === "boost-challenge") {
    return encounter.cardType === "hazard"
      ? { enabled: true, resolutionId: resolution.id, disabledReason: null, targets: [] }
      : unavailable("Requires a Hazard, Anomaly, or sector Challenge.");
  }
  if (definition.abilityKey === "isolated-total") {
    if (state.cooperativeAssistance) {
      return unavailable("Cancel or finish the current assistance request first.");
    }
    return ["enemy", "hazard"].includes(encounter.cardType)
      ? { enabled: true, resolutionId: resolution.id, disabledReason: null, targets: [] }
      : unavailable("Requires a battle or Challenge setup.");
  }
  if (definition.abilityKey === "known-family") {
    if (encounter.cardType !== "enemy") return unavailable("Requires an enemy battle.");
    return hasKnownEnemyFamilyTrophy(state, player, encounter.enemyFamily)
      ? { enabled: true, resolutionId: resolution.id, disabledReason: null, targets: [] }
      : unavailable("No unspent Trophy from this enemy family is recorded.");
  }

  return unavailable("This ability is outside its printed timing window.");
}
const RESOLUTION_AUTO_CONTINUE_MS = process.env.VITEST ? 1 : 10000;
const VISIBLE_DICE_ROLL_MS = process.env.VITEST ? 0 : 650;
const FANDIABLOS_ID = "fandiablos";
const MASTER_ALPHA_ID = "char_master_alpha";
// Save compatibility only: the user-facing relic has long been Scar-Sink Prayer.
const LEGACY_SCAR_SINK_PRAYER_ID = "heat-sink-prayer";
const RECENT_ENCOUNTER_LIMIT = 12;
const STARTING_CONTRACT_OPTION_COUNT = 3;
const STARTING_BONUS_PICK_COUNT = 2;
const STARTING_BONUS_OPTION_COUNT = 2;

function createPrivateSetupSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
const SCENARIO_OWNED_THREAT_IDS = new Set(
  SCENARIOS.flatMap((scenario) =>
    [
      ...Object.values(scenario.threatLaneAdditions ?? {}).flatMap((cardIds) => cardIds ?? []),
      ...(scenario.randomAssault?.cardIds ?? [])
    ]
  )
);

const NEMESIS_OPPOSITION = {
  strength: { attackStat: "grit", label: "Overpower" },
  willpower: { attackStat: "signal", label: "Outlast" },
  cunning: { attackStat: "guile", label: "Outwit" }
} as const;

const CONFRONTATION_BASE_DIFFICULTY = 6;
const SCAR_CARDS = loadScarCards();
const AFFLICTION_CARDS = loadAfflictionCards();
const PROJECTION_GEAR_CATALOG = loadGear();
const PROJECTION_FOLLOWER_CATALOG = loadFollowers();
const PROJECTION_THREAT_CATALOG = loadThreatCards();

const nemesisByScenarioId = new Map<string, NemesisDefinition>(
  nemeses.filter((nemesis) => nemesis.scenarioId).map((nemesis) => [nemesis.scenarioId!, nemesis])
);

function getLinkedNemesis(scenarioId: string | null | undefined): NemesisDefinition | null {
  return scenarioId ? nemesisByScenarioId.get(scenarioId) ?? null : null;
}

function getScenarioProgressThreshold(scenarioId: string | null | undefined, defaultThreshold: number): number {
  const nemesis = getLinkedNemesis(scenarioId);
  return nemesis?.scenarioProgressLife ?? nemesis?.stats.life ?? defaultThreshold;
}

function collectArtifactGearLinks(effect: AuthoredEncounterEffect): Array<{ gearId: string; artifactCardId: string }> {
  if (effect.type === "gain_gear" && effect.sourceArtifactCardId) {
    return [{ gearId: effect.gearId, artifactCardId: effect.sourceArtifactCardId }];
  }
  if (effect.type === "sequence") {
    return effect.effects.flatMap(collectArtifactGearLinks);
  }
  return [];
}

function getScenarioSeatCounterKey(prefix: string, seatId: string): string {
  return `${prefix}:${seatId}`;
}

function getMasterAlphaBattleBonus(player: PlayerState): number {
  return player.character.id === MASTER_ALPHA_ID ? 3 : 0;
}

export interface ConnectedClient {
  socket: WebSocket;
  seatId?: string;
  view: "tv" | "phone";
  isHost?: boolean;
  superseded?: boolean;
}

interface StatePatchEnvelope {
  type: "STATE_PATCH";
  sessionId: string;
  sequence: number;
  phase: GameState["phase"];
  payload: Record<string, unknown>;
}

interface IntentRejectedEnvelope {
  type: "INTENT_REJECTED";
  sessionId: string;
  sequence: number;
  actionType: string;
  reason: string;
}

interface RejoinAcceptedEnvelope {
  type: "REJOIN_ACCEPTED";
  sessionId: string;
  seatId: string;
}

interface RejoinRejectedEnvelope {
  type: "REJOIN_REJECTED";
  sessionId: string;
  reason: string;
}

interface RejoinMessage {
  type: "REJOIN";
  sessionId: string;
  seatToken: string;
}

interface KickSeatMessage {
  type: "KICK_SEAT";
  targetSeatId: string;
}

interface RestartSessionMessage {
  type: "RESTART_SESSION";
}

interface ReturnToLobbyMessage {
  type: "RETURN_TO_LOBBY";
}

interface MovementPresentationCompletedMessage {
  type: "MOVEMENT_PRESENTATION_COMPLETED";
  eventId: string;
}

type HostCommandMessage = KickSeatMessage | RestartSessionMessage | ReturnToLobbyMessage | MovementPresentationCompletedMessage;
type ClientMessage = ClientIntent | RejoinMessage | HostCommandMessage;

const CLIENT_INTENT_TYPES = new Set<string>([
  "HOST_VIEW_REQUESTED",
  "HOST_SETUP_PREVIEW_REQUESTED",
  "RETURN_TO_LOBBY_REQUESTED",
  "MOVEMENT_DESTINATION_PREVIEWED",
  "MOVE_REQUESTED",
  "TIER_TRANSITION_REQUESTED",
  "INNER_APPROACH_MOVE_REQUESTED",
  "USE_TRANSITION_ROUTE_AID",
  "ADJUST_MOVEMENT_REQUESTED",
  "SELECT_ROUTE_STAR_VARIANT",
  "ACTIVATE_GATE_SAINT",
  "USE_MARROW_DETOUR",
  "MOVEMENT_ROLL_REQUESTED",
  "PHASE_ADVANCED",
  "START_TILE_ENCOUNTER",
  "CHECK_REQUESTED",
  "COMBAT_REQUESTED",
  "PLAY_EDGE_CARD",
  "DECLINE_EDGE_CARD_REACTION",
  "ENEMY_ROLL_REQUESTED",
  "SOLO_REROLL_REQUESTED",
  "AFFLICTION_STAT_CHOSEN",
  "AFFLICTION_REACTION_RESOLVED",
  "CONTINUE_RESOLUTION",
  "SELECT_EQUIPMENT_SUPPRESSION_TARGET",
  "ENCOUNTER_DECISION_REQUESTED",
  "MEMORY_TAX_CHOICE_REQUESTED",
  "FORCED_DESTINATION_SELECTED",
  "FORCED_DISPLACEMENT_ACCEPTED",
  "CONTINUE_SCAR_CONSEQUENCE",
  "CHOOSE_SCAR",
  "PURGE_SCAR_REQUESTED",
  "USE_SCAR_ADAPTATION",
  "SET_READY",
  "SELECT_CHARACTER",
  "SELECT_STARTING_CONTRACT",
  "SELECT_STARTING_BONUS",
  "RECRUIT_REPLACEMENT",
  "EQUIP_GEAR",
  "RESOLVE_GEAR_EQUIP_CHOICE",
  "UNEQUIP_GEAR",
  "USE_GEAR",
  "USE_FOLLOWER",
  "USE_CHARACTER_ABILITY",
  "TABLE_INTERACTION",
  "SHOP_SERVICE_REQUESTED",
  "SHOP_BROWSE_SELECTED",
  "SHOP_PURCHASE_REQUESTED",
  "SHOP_SELL_REQUESTED",
  "SHOP_SKIP_REQUESTED",
  "ACCEPT_CONTRACT",
  "COMPLETE_CONTRACT",
  "SELECT_REPLACEMENT_CONTRACT",
  "OPEN_MISSION_RELIC_EXCHANGE",
  "CLAIM_MISSION_RELIC",
  "SCENARIO_CONFRONTATION_REQUESTED",
  "COOPERATIVE_ASSISTANCE_REQUESTED",
  "COOPERATIVE_ASSISTANCE_RESPONDED",
  "COOPERATIVE_ASSISTANCE_LOCKED",
  "COOPERATIVE_ASSISTANCE_CANCELLED",
  "COOPERATIVE_TEST_ROLL_REQUESTED",
  "BROKEN_CONCORDANCE_NODE_REQUESTED",
  "RIVALRY_AGENDA_REVEAL_REQUESTED",
  "RESOLVE_SPACE_TEXT",
  "STABILIZE_REQUESTED",
  "RAISE_STAT_REQUESTED",
  "NEMESIS_COMBAT_REQUESTED"
] as const);

const PHASE_VALUES = new Set(["start", "navigation", "sector", "action", "resolution", "broadcast"]);
const STAT_VALUES = new Set(["command", "grit", "signal", "guile", "forge"]);
const GEAR_SLOT_VALUES = new Set(["weapon", "armor", "utility"]);
const TABLE_INTERACTION_VALUES = new Set(["trade", "aid", "duel", "interfere"]);

interface JoinSeatResult {
  roomCode: string;
  seatId: string;
  seatToken: string;
  isHostPhone: boolean;
}

type ScenarioCheck = {
  stat: "command" | "grit" | "signal" | "guile" | "forge";
  difficulty: number;
  label: string;
};

type ScenarioPlan = {
  checks: ScenarioCheck[];
  markLabel: string;
  effect: EncounterEffect | null;
  victorySummary: string;
};

type SectorCardResolution = {
  summary: string;
  effect: EncounterEffect | null;
  revealedCard?: SpaceTextResolvedAction["revealedCard"];
  discoveredContracts?: ContractCard[];
  escalationDelta?: number;
  consumedDeckCards?: {
    anomaly?: string[];
    artifact?: string[];
    contract?: string[];
    escalation?: string[];
  };
};

type PendingRollModifier = RollModifierSource & {
  stat: Stat;
  mode: "battle" | "check";
};

class IntentRejectedError extends Error {
  public constructor(
    public readonly actionType: string,
    reason: string
  ) {
    super(reason);
    this.name = "IntentRejectedError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getMessageType(message: unknown): string {
  if (!isRecord(message) || typeof message.type !== "string") {
    throw new IntentRejectedError("UNKNOWN", "Malformed intent");
  }

  return message.type;
}

function requireStringField(message: Record<string, unknown>, field: string, actionType: string): string {
  const value = message[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new IntentRejectedError(actionType, `Malformed intent: ${field} must be a non-empty string`);
  }

  return value;
}

function requireEnumField(
  message: Record<string, unknown>,
  field: string,
  allowed: Set<string>,
  actionType: string
): string {
  const value = requireStringField(message, field, actionType);

  if (!allowed.has(value)) {
    throw new IntentRejectedError(actionType, `Malformed intent: ${field} is not allowed`);
  }

  return value;
}

function stableSetupHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export interface RoomExecutionServices {
  mode: "live" | "simulation";
  onBroadcastAttempt?: () => void;
  onTimerAttempt?: (timer: "enemy-roll" | "resolution-auto-continue") => void;
  onActionAttempt?: (action: GameAction, state: GameState) => void;
  onMovementDiagnostic?: (diagnostic: MovementTransitionDiagnostic) => void;
}

export interface MovementTransitionDiagnostic {
  event: "session-started" | "movement-rolled" | "movement-unavailable" | "movement-selected" | "movement-committed" | "tier-transition-committed" | "inner-approach-committed" | "turn-completed";
  sessionId: string;
  sequence: number;
  mode: SessionMode;
  phase: GameState["phase"];
  activeSeatId: string | null;
  turnOrder: string[];
  seatId: string;
  sourceSectorId: string | null;
  movementValue: number | null;
  legalDestinationIds: string[];
  selectedDestinationId: string | null;
  route: string[];
  pendingOwnerSeatIds: string[];
}

export class GameRoomServer {
  private readonly clients = new Set<ConnectedClient>();
  private readonly characters: Map<string, AuthoredCharacter>;
  private readonly usesCanonicalCharacterCatalog: boolean;
  private readonly contracts: Map<string, ContractCard>;
  private readonly followers: Map<string, Follower>;
  private readonly usesCanonicalFollowerCatalog: boolean;
  private readonly gear: Map<string, GearItem>;
  private readonly threats: Map<string, ThreatCard>;
  private readonly anomalies: Map<string, AnomalyCard>;
  private readonly artifacts: Map<string, ArtifactCard>;
  private readonly escalations: Map<string, EscalationCard>;
  private hostToken: string | null = null;
  private enemyRollTimeout: ReturnType<typeof setTimeout> | null = null;
  private resolutionAutoContinueTimeout: ReturnType<typeof setTimeout> | null = null;
  private movementPresentationTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly movementPreviewBySeatId = new Map<string, { destinationId: string; routeId: string }>();
  private hostView: {
    mode: "signal" | "map";
    revision: number;
    requesterSeatId: string | null;
    automaticReturnReason: "encounter" | "resolution" | "service" | "handoff" | "endgame" | "action-critical" | null;
  } = {
    mode: "signal",
    revision: 0,
    requesterSeatId: null,
    automaticReturnReason: null
  };
  private setupScenarioPreview: {
    scenarioId: string;
    mode: "single-player" | "co-op" | "rivalry" | "nemesis";
    playerCount: number;
    revision: number;
    requesterSeatId: string;
  } | null = null;

  public constructor(
    private state: GameState,
    private readonly events: GameAction[] = [],
    private readonly randomSource: RandomSource = defaultRandomSource,
    threats?: Map<string, ThreatCard>,
    characters?: Map<string, AuthoredCharacter>,
    gear?: Map<string, GearItem>,
    contracts?: Map<string, ContractCard>,
    anomalies?: Map<string, AnomalyCard>,
    artifacts?: Map<string, ArtifactCard>,
    escalations?: Map<string, EscalationCard>,
    followers?: Map<string, Follower>,
    private readonly executionServices: RoomExecutionServices = { mode: "live" }
  ) {
    this.usesCanonicalCharacterCatalog = characters === undefined;
    this.usesCanonicalFollowerCatalog = followers === undefined;
    this.threats = threats ?? loadThreatCards();
    this.characters = characters ?? loadCharacters();
    this.gear = gear ?? loadGear();
    this.contracts = contracts ?? loadContracts();
    this.followers = followers ?? loadFollowers();
    this.anomalies = anomalies ?? loadAnomalyCards();
    this.artifacts = artifacts ?? loadArtifactCards();
    this.escalations = escalations ?? loadEscalationCards();
    for (const artifact of this.artifacts.values()) {
      for (const link of collectArtifactGearLinks(artifact.resolveEffect)) {
        const definition = this.gear.get(link.gearId);
        if (definition?.tier === "artifact") {
          this.gear.set(link.gearId, {
            ...definition,
            sourceArtifactCardId: link.artifactCardId
          });
        }
      }
    }
    this.reconcileNamedPlayerRules({ autoSelectPopelord: true });
  }

  private getNamedPlayerIdentity(seatId: string): { displayName: string | null } {
    return { displayName: this.state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? null };
  }

  private getPopelordReservationSeatId(): string | null {
    return this.state.seats.find((seat) =>
      Boolean(seat.displayName) && !seat.kicked && resolveNamedPlayerRules({ displayName: seat.displayName }).forcedCharacterId === NAMED_PLAYER_POPELORD_ID
    )?.seatId ?? null;
  }

  private getCharacterEligibility(seatId: string, character: AuthoredCharacter): { allowed: boolean; reason: string | null } {
    const reservationSeatId = this.getPopelordReservationSeatId();
    return canNamedPlayerSelectCharacter(this.getNamedPlayerIdentity(seatId), character, {
      popelordReservedForOther: character.id === NAMED_PLAYER_POPELORD_ID && Boolean(reservationSeatId && reservationSeatId !== seatId)
    });
  }

  private assertNamedPlayerCatalogs(): void {
    const profiles = this.state.seats.filter((seat) => seat.displayName && !seat.kicked).map((seat) => resolveNamedPlayerRules({ displayName: seat.displayName }));
    if ((this.usesCanonicalCharacterCatalog || profiles.some((profile) => profile.forcedCharacterId)) && !this.characters.has(NAMED_PLAYER_POPELORD_ID)) {
      throw new Error(`Named-player rule requires missing canonical character ${NAMED_PLAYER_POPELORD_ID}`);
    }
    if ((this.usesCanonicalCharacterCatalog || profiles.some((profile) => profile.allowedRestrictedCharacterIds.includes(NAMED_PLAYER_QA_CHARACTER_ID))) && !this.characters.has(NAMED_PLAYER_QA_CHARACTER_ID)) {
      throw new Error(`Named-player rule requires missing canonical character ${NAMED_PLAYER_QA_CHARACTER_ID}`);
    }
    if ((this.usesCanonicalFollowerCatalog || profiles.some((profile) => profile.requiredFollowerIds.includes(NAMED_PLAYER_FANDIABLOS_ID))) && !this.followers.has(NAMED_PLAYER_FANDIABLOS_ID)) {
      throw new Error(`Named-player rule requires missing canonical follower ${NAMED_PLAYER_FANDIABLOS_ID}`);
    }
  }

  private reconcileNamedPlayerRules(options: { autoSelectPopelord?: boolean } = {}): void {
    this.assertNamedPlayerCatalogs();
    const reservationSeatId = this.getPopelordReservationSeatId();
    const changes: string[] = [];
    let seats = this.state.seats;
    let players = this.state.players;

    seats = seats.map((seat) => {
      if (!seat.displayName || seat.kicked) return seat;
      const profile = resolveNamedPlayerRules({ displayName: seat.displayName });
      const selected = seat.characterId ? this.characters.get(seat.characterId) : undefined;
      const conflictsWithReservation = seat.characterId === NAMED_PLAYER_POPELORD_ID && reservationSeatId !== seat.seatId;
      const restrictedQa = selected?.qaOnly && !profile.allowedRestrictedCharacterIds.includes(selected.id);
      const incompatibleForcedCharacter = Boolean(profile.forcedCharacterId && seat.characterSelected !== false && seat.characterId !== profile.forcedCharacterId);
      if (!conflictsWithReservation && !restrictedQa && !incompatibleForcedCharacter) return seat;
      changes.push(`cleared-character:${seat.seatId}`);
      return { ...seat, characterSelected: false, ready: false };
    });

    const fandiablos = this.followers.get(NAMED_PLAYER_FANDIABLOS_ID);
    if (fandiablos) {
      players = players.map((player) => {
        if (!requiresBoundFandiablos(this.getNamedPlayerIdentity(player.seatId))) return player;
        const followers = player.character.followers ?? [];
        const existing = followers.find((follower) => follower.id === NAMED_PLAYER_FANDIABLOS_ID);
        const canonical = existing ?? {
          ...fandiablos,
          instanceId: getNamedPlayerFollowerInstanceId(player.seatId, NAMED_PLAYER_FANDIABLOS_ID),
          exhausted: false
        };
        const normalized = [...followers.filter((follower) => follower.id !== NAMED_PLAYER_FANDIABLOS_ID), canonical];
        if (existing && normalized.length === followers.length) return player;
        changes.push(`${existing ? "deduped" : "granted"}-fandiablos:${player.seatId}`);
        return { ...player, character: { ...player.character, followers: normalized } };
      });
    }

    if (changes.length > 0) {
      const action: GameAction = {
        type: "NAMED_PLAYER_RULES_RECONCILED",
        seatId: reservationSeatId ?? this.state.seats.find((seat) => seat.displayName)?.seatId ?? "system",
        changes,
        createdAt: new Date().toISOString()
      };
      this.state = { ...this.state, seats, players, sequence: this.state.sequence + 1, eventLog: [...this.state.eventLog, action] };
      this.events.push(action);
    } else if (seats !== this.state.seats || players !== this.state.players) {
      this.state = { ...this.state, seats, players };
    }

    if (options.autoSelectPopelord && reservationSeatId) {
      const reservedSeat = this.state.seats.find((seat) => seat.seatId === reservationSeatId);
      const selectionAllowed = (this.state.status === "lobby" && this.state.phase === "start") ||
        (this.state.status === "active" && this.state.sessionMode === "multiplayer" && !this.state.turnOrder.includes(reservationSeatId));
      if (selectionAllowed && reservedSeat?.characterSelected === false) {
        this.selectSeatCharacter(reservationSeatId, NAMED_PLAYER_POPELORD_ID, { suppressBroadcast: true });
      }
    }
  }

  private emitMovementDiagnostic(
    event: MovementTransitionDiagnostic["event"],
    seatId: string,
    detail: { selectedDestinationId?: string | null; route?: string[] } = {}
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId) ?? null;
    const plan = buildMovementRoutePlan(this.state, seatId);
    const diagnostic: MovementTransitionDiagnostic = {
      event,
      sessionId: this.state.sessionId,
      sequence: this.state.sequence,
      mode: this.state.sessionMode,
      phase: this.state.phase,
      activeSeatId: this.state.turnOrder[this.state.activeSeatIndex] ?? null,
      turnOrder: [...this.state.turnOrder],
      seatId,
      sourceSectorId: player?.character.currentSpaceId ?? null,
      movementValue: this.state.movementRolls?.[seatId] ?? null,
      legalDestinationIds: plan?.routes.map((route) => route.sectorId) ?? [],
      selectedDestinationId: detail.selectedDestinationId ?? null,
      route: [...(detail.route ?? [])],
      pendingOwnerSeatIds: [
        this.state.activeResolution?.playerId,
        this.state.pendingFailureReaction?.seatId,
        this.state.pendingTileChallenge?.seatId,
        this.state.pendingCooperativeTest?.activeSeatId,
        this.state.pendingMissionSelection?.ownerSeatId
      ].filter((candidate): candidate is string => Boolean(candidate))
    };

    this.executionServices.onMovementDiagnostic?.(diagnostic);
    if (
      this.executionServices.mode === "live" &&
      process.env.NODE_ENV !== "production" &&
      process.env.ASHEN_REACH_MOVEMENT_DEBUG === "1"
    ) {
      console.debug("movement-transition", diagnostic);
    }
  }

  attach(server: WebSocketServer): void {
    server.on("connection", (socket, request) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      const view = url.searchParams.get("view") === "phone" ? "phone" : "tv";
      const token = url.searchParams.get("token");
      const joinMode = url.searchParams.get("joinMode");
      const hostToken = url.searchParams.get("hostToken");
      const client: ConnectedClient = { socket, view };

      if (view === "phone" && joinMode !== "rejoin") {
        if (!token) {
          socket.close(4001, "Missing join token");
          return;
        }

        const seat = this.resolveSeatFromToken(token);

        if (!seat) {
          socket.close(4002, "Invalid join token");
          return;
        }

        client.seatId = seat.seatId;
        this.adoptPhoneClient(client);
      }

      if (view === "tv") {
        client.isHost = this.hostToken ? this.isValidHostToken(hostToken ?? "") : false;
        this.clients.add(client);
        this.broadcastSnapshotToClient(client);
      }

      socket.on("message", (raw) => {
        try {
          const message = JSON.parse(String(raw)) as unknown;

          if (this.isRejoinMessage(message)) {
            this.handleRejoin(client, message);
            return;
          }

          this.handleIntent(client, this.parseClientMessage(message));
        } catch (error) {
          this.sendIntentRejected(
            client,
            error instanceof IntentRejectedError ? error.actionType : "UNKNOWN",
            error instanceof Error ? error.message : "Malformed intent"
          );
        }
      });

      socket.on("close", () => {
        this.clients.delete(client);

        if (client.view === "phone" && client.seatId && !client.superseded) {
          this.handleSeatDisconnect(client.seatId);
        }
      });
    });
  }

  handleIntent(client: ConnectedClient, intent: ClientIntent | HostCommandMessage): void {
    try {
      if (this.isHostCommand(intent)) {
        this.handleHostCommand(client, intent);
        this.broadcastPatch();
        return;
      }

      if (client.view !== "phone" || !client.seatId) {
        throw new IntentRejectedError(intent.type, "Only phone clients with seats can submit intents");
      }

      if (intent.seatId !== client.seatId) {
        throw new IntentRejectedError(intent.type, "Seat mismatch between token and submitted intent");
      }

      if (intent.type === "RETURN_TO_LOBBY_REQUESTED") {
        if (this.state.status !== "ended") {
          throw new IntentRejectedError(intent.type, "A new game can only begin after the current result is complete");
        }
        if (this.state.setupHostSeatId !== intent.seatId) {
          throw new IntentRejectedError(intent.type, "Only the setup host can start the next game");
        }
        this.restartActiveSession(true);
        this.broadcastPatch();
        return;
      }

      if (this.state.status === "ended") {
        throw new IntentRejectedError(intent.type, "Session has ended. Only the host can restart it.");
      }

      if (intent.type === "HOST_SETUP_PREVIEW_REQUESTED") {
        if (this.state.status !== "lobby" || this.state.phase !== "start") {
          throw new IntentRejectedError(intent.type, "Scenario preview is available only during lobby setup");
        }
        if (this.state.setupHostSeatId !== intent.seatId) {
          throw new IntentRejectedError(intent.type, "Only the Host Phone can preview a scenario");
        }
        const scenario = getScenarioDefinition(intent.scenarioId);
        const mapped = intent.mode === "single-player"
          ? { sessionMode: "single-player" as const, interactionMode: "co-op" as const, gameMode: "standard" as const, playerCount: 1 }
          : intent.mode === "co-op"
            ? { sessionMode: "multiplayer" as const, interactionMode: "co-op" as const, gameMode: "standard" as const, playerCount: intent.playerCount }
            : intent.mode === "rivalry"
              ? { sessionMode: "multiplayer" as const, interactionMode: "rivalry" as const, gameMode: "standard" as const, playerCount: intent.playerCount }
              : { sessionMode: "multiplayer" as const, interactionMode: "co-op" as const, gameMode: "nemesis_relay" as const, playerCount: intent.playerCount };
        if (
          !scenario ||
          !Number.isInteger(mapped.playerCount) ||
          mapped.playerCount < 1 ||
          mapped.playerCount > (intent.mode === "nemesis" ? 4 : 6) ||
          !isScenarioEligibleForSession(
            scenario,
            mapped.sessionMode,
            mapped.interactionMode,
            mapped.gameMode,
            mapped.playerCount
          )
        ) {
          throw new IntentRejectedError(intent.type, "That scenario is not available for the selected game type or player count");
        }
        this.setupScenarioPreview = {
          scenarioId: scenario.id,
          mode: intent.mode,
          playerCount: mapped.playerCount,
          revision: (this.setupScenarioPreview?.revision ?? 0) + 1,
          requesterSeatId: intent.seatId
        };
        this.broadcastPatch();
        return;
      }

      if (this.state.movementPresentationGate) {
        throw new IntentRejectedError(
          intent.type,
          "Movement is still playing on the host display"
        );
      }

      if (intent.type === "HOST_VIEW_REQUESTED") {
        const availability = this.getHostMapAvailability();
        if (intent.mode === "map" && !availability.allowed) {
          throw new IntentRejectedError(intent.type, availability.reason ?? "The map is unavailable during this presentation");
        }
        this.hostView = {
          mode: intent.mode,
          revision: this.hostView.revision + 1,
          requesterSeatId: intent.seatId,
          automaticReturnReason: null
        };
        this.broadcastPatch();
        return;
      }

      if (intent.type === "MOVEMENT_DESTINATION_PREVIEWED") {
        const planner = buildPublicMovementPlanner(this.state, intent.seatId);
        if (!planner?.active) {
          throw new Error("Movement preview is unavailable outside destination selection");
        }
        if (intent.toSectorId === null) {
          if (this.state.routeStarChoices?.[intent.seatId]) this.applyAction({ type: "CLEAR_ROUTE_STAR_CHOICE", seatId: intent.seatId, createdAt: new Date().toISOString() });
          this.movementPreviewBySeatId.delete(intent.seatId);
        } else {
          const destination = planner.destinations.find(
            (entry) => entry.sectorId === intent.toSectorId && (!entry.disabledReason || entry.voidKeyPrompt)
          );
          if (!destination) {
            throw new Error("Movement preview must use a legal destination");
          }
          const committed = this.state.routeStarChoices?.[intent.seatId];
          if (committed && committed.destinationId !== intent.toSectorId) this.applyAction({ type: "CLEAR_ROUTE_STAR_CHOICE", seatId: intent.seatId, createdAt: new Date().toISOString() });
          if (intent.routeId !== undefined || intent.movementRevision !== undefined) {
            if (!intent.routeId || intent.movementRevision === undefined || intent.movementRevision !== planner.movementRevision || !destination.routeVariants.some((variant) => variant.routeId === intent.routeId)) {
              throw new Error("Movement preview route is stale or does not belong to this destination");
            }
          }
          this.movementPreviewBySeatId.set(intent.seatId, {
            destinationId: destination.sectorId,
            routeId: intent.routeId ?? destination.defaultRouteId
          });
        }
        this.broadcastPatch();
        return;
      }

      if (intent.type === "SELECT_ROUTE_STAR_VARIANT") {
        const planner = buildPhoneMovementPlanner(this.state, intent.seatId);
        const destination = planner?.destinations.find((entry) => entry.sectorId === intent.destinationId && !entry.disabledReason);
        const variant = destination?.routeVariants.find((entry) => entry.routeId === intent.routeId);
        if (!planner?.active || !destination?.routeStarPrompt || !variant || intent.movementRevision !== planner.movementRevision) throw new IntentRejectedError(intent.type, "Route Star route is stale or unavailable");
        this.applyAction({ ...intent, createdAt: new Date().toISOString() });
        const choice = this.state.routeStarChoices?.[intent.seatId];
        if (!choice || choice.routeId !== intent.routeId) throw new IntentRejectedError(intent.type, "Route Star selection was rejected");
        this.movementPreviewBySeatId.set(intent.seatId, { destinationId: intent.destinationId, routeId: intent.routeId });
        this.broadcastPatch();
        return;
      }

      if (intent.type === "TIER_TRANSITION_REQUESTED") {
        this.resolveTierTransitionIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "INNER_APPROACH_MOVE_REQUESTED") {
        this.resolveInnerApproachMoveIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "CONTINUE_RESOLUTION") {
        this.resolveContinueResolutionIntent(intent);
        return;
      }

      if (intent.type === "AFFLICTION_STAT_CHOSEN") {
        this.applyAction({
          ...intent,
          createdAt: new Date().toISOString()
        } satisfies AfflictionStatChosenAction);
        this.runAutomaticPhases(intent.seatId);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "AFFLICTION_REACTION_RESOLVED") {
        this.resolveAfflictionReactionIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "START_TILE_ENCOUNTER") {
        this.resolveStartTileEncounterIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (
        intent.type === "PHASE_ADVANCED" &&
        intent.toPhase === "start" &&
        this.state.status === "active" &&
        this.state.phase === "broadcast" &&
        !this.state.activeResolution
      ) {
        if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
          throw new Error("Only the active seat can end the broadcast step");
        }

        this.completeBroadcastTurn(intent.seatId);
        return;
      }

      if (intent.type === "SET_READY") {
        this.setSeatReady(intent.seatId, intent.ready);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "SELECT_CHARACTER") {
        this.selectSeatCharacter(intent.seatId, intent.characterId, {
          signalPieceId: intent.signalPieceId
        });
        return;
      }

      if (intent.type === "SELECT_STARTING_CONTRACT") {
        this.selectStartingContract(intent.seatId, intent.contractId);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "SELECT_STARTING_BONUS") {
        this.selectStartingBonus(
          intent.seatId,
          intent.offerId,
          intent.optionKind,
          intent.optionId
        );
        this.broadcastPatch();
        return;
      }

      if (intent.type === "ACCEPT_CONTRACT" && this.state.pendingMissionSelection?.ownerSeatId === intent.seatId) {
        throw new IntentRejectedError(intent.type, "Use the authoritative replacement Contract offer");
      }

      if (intent.type === "SELECT_REPLACEMENT_CONTRACT") {
        this.selectReplacementContract(intent);
        this.broadcastPatch();
        if (
          this.state.phase === "broadcast" &&
          !this.state.activeResolution &&
          !this.state.pendingMissionSelection
        ) {
          this.completeBroadcastTurn(intent.seatId);
        }
        return;
      }

      if (intent.type === "OPEN_MISSION_RELIC_EXCHANGE") {
        this.openMissionRelicExchange(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "CLAIM_MISSION_RELIC") {
        this.claimMissionRelic(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "COOPERATIVE_ASSISTANCE_REQUESTED") {
        this.resolveCooperativeAssistanceRequest(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "SHOP_BROWSE_SELECTED") {
        this.resolveShopBrowseSelection(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "COOPERATIVE_ASSISTANCE_RESPONDED") {
        this.resolveCooperativeAssistanceResponse(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "COOPERATIVE_ASSISTANCE_LOCKED") {
        this.resolveCooperativeAssistanceLock(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "COOPERATIVE_ASSISTANCE_CANCELLED") {
        this.resolveCooperativeAssistanceCancel(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "COOPERATIVE_TEST_ROLL_REQUESTED") {
        this.resolvePendingCooperativeTestRoll(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "BROKEN_CONCORDANCE_NODE_REQUESTED") {
        this.resolveBrokenConcordanceNodeRequest(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "STABILIZE_REQUESTED") {
        this.resolveStabilizeIntent(intent);
        const shouldCompleteTurn =
          this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution;
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      if (intent.type === "RAISE_STAT_REQUESTED") {
        this.resolveRaiseStatIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "USE_CHARACTER_ABILITY") {
        this.resolveCharacterAbilityIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "USE_SCAR_ADAPTATION") {
        this.resolveScarAdaptationIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "PLAY_EDGE_CARD") {
        this.resolveEdgeCardIntent(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "DECLINE_EDGE_CARD_REACTION") {
        this.resolveEdgeCardReactionDecline(intent);
        this.broadcastPatch();
        return;
      }

      if (intent.type === "RESOLVE_SPACE_TEXT") {
        this.resolveSpaceTextIntent(intent);
        const shouldCompleteTurn =
          this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution;
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      if (intent.type === "NEMESIS_COMBAT_REQUESTED") {
        this.resolveNemesisCombatIntent(intent);
        const shouldCompleteTurn =
          this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution;
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      const shouldResolveVisibleCheckOrCombat =
        (intent.type === "CHECK_REQUESTED" || intent.type === "COMBAT_REQUESTED") &&
        this.state.activeResolution?.stage === "battle_setup" &&
        this.state.activeResolution.playerId === intent.seatId;
      if ((intent.type === "CHECK_REQUESTED" || intent.type === "COMBAT_REQUESTED") && shouldResolveVisibleCheckOrCombat) {
        this.assertAssistanceReadyForRoll(intent.seatId, this.state.currentEncounter?.id ?? "", intent.stat, false);
      }
      if (intent.type === "ADJUST_MOVEMENT_REQUESTED") {
        this.movementPreviewBySeatId.delete(intent.seatId);
      }
      if (intent.type === "USE_TRANSITION_ROUTE_AID") {
        this.resolveTransitionRouteAidIntent(intent);
        this.broadcastPatch();
        return;
      }
      const action = this.intentToAction(intent);
      this.applyAction(action);
      if (action.type === "COMPLETE_CONTRACT") {
        this.awardRandomEdgeCard(action.seatId, "contract", action.contractId);
        this.queueReplacementMissionSelection(action.seatId, action.contractId);
      }

      if (action.type === "SHOP_PURCHASE_RESOLVED" && action.serviceId === "buy-gear") {
        this.replenishShopEquipmentStock(action.seatId, action.sectorId, action.createdAt);
      }

      if (action.type === "SHOP_PURCHASE_RESOLVED") {
        const space = getBoardSpace(action.sectorId);
        this.maybeAdvanceContractObjective(intent.seatId, {
          type: "shop-transaction", action: "buyEquipment", sectorId: action.sectorId,
          shopTypes: space?.tags ?? [], salvageSpent: action.cost.salvage ?? 0
        }, `Bought equipment at ${action.shopName}.`);
      } else if (action.type === "SHOP_SELL_RESOLVED") {
        const space = getBoardSpace(action.sectorId);
        this.maybeAdvanceContractObjective(intent.seatId, {
          type: "shop-transaction", action: "sellGear", sectorId: action.sectorId, shopTypes: space?.tags ?? []
        }, `Sold gear at ${action.shopName}.`);
      } else if (action.type === "SHOP_SERVICE_RESOLVED") {
        const space = getBoardSpace(action.sectorId);
        const missionAction = action.serviceId === "repair-gear" ? "repairGear"
          : action.serviceId === "trade-missions-for-artifact" ? "trade"
          : action.serviceId.includes("upgrade") ? "upgradeGear"
          : action.serviceId === "buy-supplies" ? "buyEquipment" : null;
        if (missionAction) this.maybeAdvanceContractObjective(intent.seatId, {
          type: "shop-transaction", action: missionAction, sectorId: action.sectorId,
          shopTypes: space?.tags ?? [], salvageSpent: action.cost.salvage ?? 0
        }, `Completed ${action.serviceLabel} at ${action.shopName}.`);
      }

      if (intent.type === "CHECK_REQUESTED") {
        if (shouldResolveVisibleCheckOrCombat) {
          this.startVisibleDiceRollIntent(client, intent, () => this.resolveCheckIntent(intent));
          return;
        }
      } else if (intent.type === "COMBAT_REQUESTED") {
        if (shouldResolveVisibleCheckOrCombat) {
          this.startVisibleDiceRollIntent(client, intent, () => this.resolveCombatIntent(intent));
          return;
        }
      } else if (intent.type === "ENEMY_ROLL_REQUESTED") {
        this.resolveEnemyRollIntent(intent);
      } else if (intent.type === "SOLO_REROLL_REQUESTED") {
        // Keep the rerolled result visible until the player continues.
      } else if (intent.type === "MOVEMENT_ROLL_REQUESTED") {
        this.movementPreviewBySeatId.delete(intent.seatId);
        this.resolveMovementRollIntent(intent);
      } else if (intent.type === "MOVE_REQUESTED") {
        this.movementPreviewBySeatId.delete(intent.seatId);
        this.resolveMoveIntent(intent);
      } else if (intent.type === "SCENARIO_CONFRONTATION_REQUESTED") {
        this.resolveScenarioConfrontationIntent(intent);
      } else if (
        intent.type === "USE_FOLLOWER" &&
        intent.followerId === FANDIABLOS_ID &&
        this.state.phase === "action" &&
        Boolean(this.state.currentEncounter)
      ) {
        // Fandiablos battle/check support is a committed modifier for the next roll, not the end of the action window.
      } else if (intent.type === "SHOP_SERVICE_REQUESTED" || intent.type === "SHOP_PURCHASE_REQUESTED" || intent.type === "SHOP_SELL_REQUESTED") {
        // Shop interactions keep the action window open so the player can reveal, compare, buy, or end the turn intentionally.
      } else if (intent.type === "SHOP_SKIP_REQUESTED") {
        // Skipping the shop is the intentional end of this action window.
      } else if (intent.type === "RIVALRY_AGENDA_REVEAL_REQUESTED") {
        // Reveal is a public table moment, not an automatic turn advance.
      } else {
        this.runAutomaticPhases(client.seatId);
      }

      if (intent.type === "COMPLETE_CONTRACT") {
        this.applyScenarioOnContractCompleted(client.seatId);
        this.applyScenarioObjectiveOnContractCompleted(client.seatId, intent.contractId);
        this.applyRivalryAgendaProgressTrigger(client.seatId, {
          type: "contractCompleted",
          seatId: client.seatId,
          contractId: intent.contractId,
          sectorId: this.state.players.find((entry) => entry.seatId === client.seatId)?.sectorId
        });
      }

      if (intent.type === "ACCEPT_CONTRACT") {
        this.maybeTriggerAbilityOnContractAccepted(client.seatId, intent.contractId);
      }

      if (intent.type === "SHOP_PURCHASE_REQUESTED") {
        this.applyRivalryAgendaProgressTrigger(client.seatId, {
          type: "shopPurchaseCompleted",
          seatId: client.seatId,
          itemId: intent.cardId,
          sectorId: this.state.players.find((entry) => entry.seatId === client.seatId)?.sectorId
        });
      }

      if (intent.type === "SHOP_SELL_REQUESTED") {
        this.applyRivalryAgendaProgressTrigger(client.seatId, {
          type: "shopSaleCompleted",
          seatId: client.seatId,
          itemId: intent.gearId,
          sectorId: this.state.players.find((entry) => entry.seatId === client.seatId)?.sectorId
        });
      }

      if (intent.type === "COMPLETE_CONTRACT") {
        this.maybeTriggerAbilityOnContractCompleted(client.seatId);
      }

      const shouldCompleteTurn =
        this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution;
      const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

      this.broadcastPatch();

      if (shouldCompleteTurn && completingSeatId) {
        this.completeBroadcastTurn(completingSeatId);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Intent rejected";
      this.sendIntentRejected(client, intent.type, reason);
    }
  }

  getState(): GameState {
    return this.state;
  }

  broadcastQaFixtureState(): void {
    this.broadcastPatch();
  }

  setHostToken(hostToken: string): void {
    this.hostToken = hostToken;
  }

  getCharacterCatalog(options: { includeQa?: boolean } = {}): Array<AuthoredCharacter & { presentation?: CharacterPresentation }> {
    return [...this.characters.values()].filter((character) => options.includeQa || !character.qaOnly).map((character) => {
      const presentation = getCharacterPresentation(character.id);

      return {
        ...character,
        ...(presentation ? { presentation } : {}),
        activeContract: character.activeContract ? { ...character.activeContract } : null,
        activeContracts: character.activeContracts?.map((contract) => ({ ...contract })),
        heldGear: [...character.heldGear],
        equippedGear: { ...character.equippedGear },
        followers: [...(character.followers ?? [])],
        abilities: [...character.abilities],
        scars: [...character.scars],
        trophyPile: [...(character.trophyPile ?? [])]
      };
    });
  }

  resetSession(state: GameState): void {
    this.clearEnemyRollTimeout();

    for (const client of [...this.clients]) {
      client.superseded = true;
      client.socket.close(4004, "Session reset");
      this.clients.delete(client);
    }

    this.state = state;
    this.events.length = 0;
    this.movementPreviewBySeatId.clear();
    this.setupScenarioPreview = null;
  }

  joinSeat(displayName: string, characterId?: string): JoinSeatResult {
    const lobbyJoin = this.state.status === "lobby" && this.state.phase === "start";
    const activeLateJoin = this.state.status === "active" && this.state.sessionMode === "multiplayer";

    if (!lobbyJoin && !activeLateJoin) {
      throw new Error(this.state.status === "ended" ? "Session has ended" : "This session is not accepting new players");
    }

    if (activeLateJoin && this.state.gameMode === "nemesis_relay") {
      throw new Error("Nemesis Relay does not support joining after the game starts");
    }

    const seat = this.state.seats.find((entry) => !entry.displayName && !entry.kicked);

    if (!seat) {
      throw new Error("No open seats remain");
    }

    if (seat.displayName) {
      throw new Error(`Requested seat ${seat.seatId} is already occupied`);
    }

    const isFirstHostPhone = lobbyJoin && !this.state.setupHostSeatId;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      setupHostSeatId: lobbyJoin ? (this.state.setupHostSeatId ?? seat.seatId) : this.state.setupHostSeatId,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seat.seatId
          ? {
              ...entry,
              ...(characterId ? { characterId } : {}),
              characterSelected: false,
              displayName,
              startingContractOptions: [],
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              connected: true,
              ready: false
            }
          : entry
      )
    };
    this.reconcileNamedPlayerRules({ autoSelectPopelord: true });
    if (characterId) {
      this.selectSeatCharacter(seat.seatId, characterId, { suppressBroadcast: true });
    }
    this.broadcastPatch();

    return {
      roomCode: this.state.sessionId,
      seatId: seat.seatId,
      seatToken: seat.joinToken,
      isHostPhone: isFirstHostPhone
    };
  }

  selectSeatCharacter(
    seatId: string,
    characterId: string,
    options: { suppressBroadcast?: boolean; signalPieceId?: SignalPieceId } = {}
  ): void {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    const lobbySelection = this.state.status === "lobby" && this.state.phase === "start";
    const lateJoinSelection =
      this.state.status === "active" &&
      this.state.sessionMode === "multiplayer" &&
      this.state.gameMode !== "nemesis_relay" &&
      Boolean(seat?.displayName) &&
      !this.state.turnOrder.includes(seatId);

    if (!lobbySelection && !lateJoinSelection) {
      throw new Error("Character can only be selected before the session starts");
    }

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName) {
      throw new Error("Join the room before choosing a character");
    }

    const selectedCharacter = this.characters.get(characterId);

    if (!selectedCharacter) {
      throw new Error(`Unknown character ${characterId}`);
    }

    const namedEligibility = this.getCharacterEligibility(seatId, selectedCharacter);
    if (!namedEligibility.allowed) {
      throw new Error(namedEligibility.reason ?? "This operative is not available");
    }

    const characterTaken = this.state.seats.some(
      (entry) => entry.seatId !== seatId && entry.displayName && !entry.kicked && entry.characterSelected !== false && entry.characterId === characterId
    );

    if (characterTaken) {
      throw new Error("Character already taken");
    }

    const seatIndex = Math.max(0, this.state.seats.findIndex((entry) => entry.seatId === seatId));
    const signalPieceId = options.signalPieceId
      ?? seat.signalPieceId
      ?? getSignalPieceIdForSeat(seatIndex);
    const signalPieceTaken = this.state.seats.some(
      (entry) =>
        entry.seatId !== seatId
        && Boolean(entry.displayName)
        && !entry.kicked
        && entry.characterSelected !== false
        && entry.signalPieceId === signalPieceId
    );
    if (signalPieceTaken) {
      throw new Error("Signal piece already taken");
    }
    const loadedCharacter = applyStartingLoadout(selectedCharacter, {
      sessionMode: this.state.sessionMode,
      seatIndex,
      catalogs: {
        contracts: this.state.availableContracts,
        gear: this.gear,
        followers: this.followers
      },
      assignStartingContract: false
    });
    const startingContractOptions = this.resolveStartingContractOptions(selectedCharacter, seatIndex);

    const startingSectorId = lateJoinSelection
      ? selectedCharacter.currentSpaceId
      : this.state.players.find((player) => player.seatId === seatId)?.sectorId ?? selectedCharacter.currentSpaceId;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              characterId,
              characterSelected: true,
              signalPieceId,
              startingContractOptions,
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              ready: false
            }
          : entry
      ),
      players: this.state.players.map((player) =>
        player.seatId === seatId
          ? {
              ...player,
              sectorId: startingSectorId,
              character: {
                ...loadedCharacter,
                currentSpaceId: startingSectorId,
                wounds: 0,
                status: "active",
                trophyPile: [],
                activeContract: null,
                activeContracts: [],
                heldGear: [...loadedCharacter.heldGear],
                followers: [...(loadedCharacter.followers ?? [])],
                equippedGear: { ...loadedCharacter.equippedGear },
                abilities: [...loadedCharacter.abilities],
                scars: [...loadedCharacter.scars]
              }
            }
          : player
      )
    };
    this.reconcileNamedPlayerRules();

    if (!options.suppressBroadcast) {
      this.broadcastPatch();
    }
  }

  configureLobbyFromHostPhone(seatId: string, input: { sessionMode: SessionMode; interactionMode: InteractionMode; gameMode?: GameMode; playerCount?: number; scenarioId?: string }): void {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Lobby can only be configured before the session starts");
    }

    if (this.state.setupHostSeatId !== seatId) {
      throw new Error("Only the Host Phone can configure the lobby");
    }

    const hostSeat = this.state.seats.find((entry) => entry.seatId === seatId);

    if (!hostSeat?.displayName) {
      throw new Error("Host Phone must join before configuring the lobby");
    }

    const scenario = getScenarioDefinition(input.scenarioId ?? this.state.activeScenarioId);
    const configuredPlayerCount = input.sessionMode === "single-player" ? 1 : input.playerCount ?? this.state.seats.length;
    if (!scenario || !isScenarioEligibleForSession(scenario, input.sessionMode, input.interactionMode, input.gameMode ?? "standard", configuredPlayerCount)) {
      throw new Error("The selected scenario is not available for this game mode or player count");
    }

    const nextState = createInitialSessionState(
      this.state.sessionId,
      input.sessionMode,
      input.scenarioId ?? this.state.activeScenarioId,
      input.interactionMode,
      input.gameMode ?? "standard",
      configuredPlayerCount,
      { lobbyConfigured: true, setupHostSeatId: seatId }
    );
    const nextHostSeat = nextState.seats.find((entry) => entry.seatId === seatId);

    if (!nextHostSeat) {
      throw new Error("Host Phone seat is not available in the selected game type");
    }

    this.state = {
      ...nextState,
      sequence: this.state.sequence + 1,
      seats: nextState.seats.map((entry) => {
        const previousSeat = this.state.seats.find(
          (candidate) => candidate.seatId === entry.seatId && !candidate.kicked && Boolean(candidate.displayName)
        );

        return previousSeat
          ? {
              ...entry,
              displayName: previousSeat.displayName,
              connected: previousSeat.connected,
              joinToken: previousSeat.joinToken,
              characterSelected: false,
              startingContractOptions: [],
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              ready: false
            }
          : entry;
      })
    };
    this.setupScenarioPreview = {
      scenarioId: scenario.id,
      mode: input.gameMode === "nemesis_relay"
        ? "nemesis"
        : input.sessionMode === "single-player"
          ? "single-player"
          : input.interactionMode === "rivalry"
            ? "rivalry"
            : "co-op",
      playerCount: configuredPlayerCount,
      revision: (this.setupScenarioPreview?.revision ?? 0) + 1,
      requesterSeatId: seatId
    };
    const retainedSeatIds = new Set(this.state.seats.map((entry) => entry.seatId));
    for (const client of [...this.clients]) {
      if (client.view !== "phone" || !client.seatId || retainedSeatIds.has(client.seatId)) continue;
      client.superseded = true;
      this.clients.delete(client);
      client.socket.close(4004, "Seat is not available in the reconfigured lobby");
    }
    this.broadcastPatch();
  }

  private getStartingBonusCandidates(
    player: PlayerState,
    excluded: readonly StartingBonusOptionRef[] = []
  ): StartingBonusOptionRef[] {
    const excludedKeys = new Set(excluded.map((option) => `${option.kind}:${option.id}`));
    const ownedGearIds = new Set(player.character.heldGear.map((item) => item.id));
    const ownedFollowerIds = new Set((player.character.followers ?? []).map((follower) => follower.id));
    const globallyOwnedUniqueFollowerIds = new Set(
      this.state.players.flatMap((entry) =>
        (entry.character.followers ?? [])
          .filter((follower) => follower.unique)
          .map((follower) => follower.id)
      )
    );

    return [
      ...[...this.gear.values()]
        .filter((item) =>
          item.startingEligible === true &&
          !item.qaOnly &&
          item.tier !== "artifact" &&
          !ownedGearIds.has(item.id) &&
          !excludedKeys.has(`gear:${item.id}`)
        )
        .map((item) => ({ kind: "gear" as const, id: item.id })),
      ...[...this.followers.values()]
        .filter((follower) =>
          !follower.qaOnly &&
          !follower.artifactTier &&
          !follower.ultimateCompanion &&
          (follower.tier ?? "standard") === "standard" &&
          !ownedFollowerIds.has(follower.id) &&
          !(follower.unique && globallyOwnedUniqueFollowerIds.has(follower.id)) &&
          !excludedKeys.has(`follower:${follower.id}`)
        )
        .map((follower) => ({ kind: "follower" as const, id: follower.id }))
    ];
  }

  private drawStartingBonusOptions(
    player: PlayerState,
    privateOfferKey: string,
    excluded: readonly StartingBonusOptionRef[] = []
  ): StartingBonusOptionRef[] {
    const candidates = this.getStartingBonusCandidates(player, excluded);
    const offerRandom = createSeededRandomSource(createPrivateSetupSeed(privateOfferKey));

    if (candidates.length < STARTING_BONUS_OPTION_COUNT) {
      throw new Error("Not enough eligible starting bonuses are available");
    }

    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = offerRandom.nextInt(index + 1);
      [candidates[index], candidates[swapIndex]] = [candidates[swapIndex]!, candidates[index]!];
    }

    return candidates.slice(0, STARTING_BONUS_OPTION_COUNT);
  }

  private grantStartingBonus(
    player: PlayerState,
    option: StartingBonusOptionRef,
    pickNumber: number
  ): PlayerState {
    if (option.kind === "follower") {
      const follower = this.followers.get(option.id);
      if (!follower) throw new Error("Starting follower is no longer available");
      if ((player.character.followers ?? []).some((owned) => owned.id === follower.id)) {
        throw new Error("Starting follower is already owned");
      }
      if (
        follower.unique &&
        this.state.players.some((entry) =>
          entry.seatId !== player.seatId &&
          (entry.character.followers ?? []).some((owned) => owned.id === follower.id)
        )
      ) {
        throw new Error("Starting follower is already committed to another operative");
      }

      return {
        ...player,
        character: {
          ...player.character,
          followers: [
            ...(player.character.followers ?? []),
            {
              ...follower,
              instanceId: `${follower.id}:${player.seatId}:starting-bonus:${pickNumber}`,
              ...(follower.startingCharges !== undefined
                ? { currentCharges: follower.startingCharges }
                : {})
            }
          ]
        }
      };
    }

    const item = this.gear.get(option.id);
    if (!item) throw new Error("Starting Equipment is no longer available");
    if (player.character.heldGear.some((owned) => owned.id === item.id)) {
      throw new Error("Starting Equipment is already owned");
    }

    const instanceId = `${item.id}:${player.seatId}:starting-bonus:${pickNumber}`;
    const gainedItem = {
      ...item,
      instanceId,
      ...(item.startingCharges !== undefined ? { currentCharges: item.startingCharges } : {})
    };
    const mayAutoEquip =
      gainedItem.effectModel === "permanent" ||
      (gainedItem.effectModel == null && gainedItem.tier !== "artifact");
    const slotIsEmpty = !player.character.equippedGear[gainedItem.slot];

    return {
      ...player,
      character: {
        ...player.character,
        heldGear: [...player.character.heldGear, gainedItem],
        equippedGear: mayAutoEquip && slotIsEmpty
          ? { ...player.character.equippedGear, [gainedItem.slot]: gainedItem.id }
          : player.character.equippedGear,
        equippedGearInstances: mayAutoEquip && slotIsEmpty
          ? {
              ...(player.character.equippedGearInstances ?? {
                weapon: null,
                armor: null,
                utility: null
              }),
              [gainedItem.slot]: instanceId
            }
          : player.character.equippedGearInstances
      }
    };
  }

  selectStartingContract(seatId: string, contractId: string): void {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    const lobbySelection = this.state.status === "lobby" && this.state.phase === "start";
    const lateJoinSelection =
      this.state.status === "active" &&
      this.state.sessionMode === "multiplayer" &&
      this.state.gameMode !== "nemesis_relay" &&
      Boolean(seat?.displayName) &&
      !this.state.turnOrder.includes(seatId);

    if (!lobbySelection && !lateJoinSelection) {
      throw new Error("Starting Contract can only be selected before the session starts");
    }

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName) {
      throw new Error("Seat must be joined before choosing a starting Contract");
    }

    if (!seat.characterId || seat.characterSelected === false) {
      throw new Error("Choose an operative before choosing a starting Contract");
    }

    if (seat.selectedStartingContractId) {
      throw new Error("Starting Contract already selected");
    }

    if (!this.contracts.has(contractId) || !this.state.availableContracts.some((contract) => contract.id === contractId)) {
      throw new Error("Unknown starting Contract");
    }

    if (!seat.startingContractOptions.includes(contractId)) {
      throw new Error("Starting Contract was not offered to this player");
    }

    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`Missing player for seat ${seatId}`);
    const nextSequence = this.state.sequence + 1;
    const startingBonusOfferOptions = this.drawStartingBonusOptions(
      player,
      `${seat.joinToken}:starting-bonus:1:${nextSequence}`
    );

    this.state = {
      ...this.state,
      sequence: nextSequence,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              selectedStartingContractId: contractId,
              missionSelectedAt: new Date().toISOString(),
              startingBonusOfferId: `starting-bonus:${seatId}:1:${nextSequence}`,
              startingBonusOfferOptions,
              startingBonusSelections: [],
              ready: false
            }
          : entry
      )
    };
  }

  selectStartingBonus(
    seatId: string,
    offerId: string,
    optionKind: StartingBonusOptionRef["kind"],
    optionId: string
  ): void {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const lobbySelection = this.state.status === "lobby" && this.state.phase === "start";
    const lateJoinSelection =
      this.state.status === "active" &&
      this.state.sessionMode === "multiplayer" &&
      this.state.gameMode !== "nemesis_relay" &&
      Boolean(seat?.displayName) &&
      !this.state.turnOrder.includes(seatId);

    if (!lobbySelection && !lateJoinSelection) {
      throw new Error("Starting bonuses can only be selected before joining the turn order");
    }
    if (!seat || seat.kicked || !player) throw new Error(`Unknown seat ${seatId}`);
    if (!seat.selectedStartingContractId) throw new Error("Choose a starting Contract before choosing bonuses");
    if (!seat.startingBonusOfferId || seat.startingBonusOfferId !== offerId) {
      throw new Error("Starting bonus offer is stale");
    }

    const offered = (seat.startingBonusOfferOptions ?? []).find(
      (option) => option.kind === optionKind && option.id === optionId
    );
    if (!offered) throw new Error("Starting bonus was not offered to this player");

    const selections = seat.startingBonusSelections ?? [];
    if (selections.length >= STARTING_BONUS_PICK_COUNT) {
      throw new Error("Both starting bonuses are already selected");
    }

    const pickNumber = selections.length + 1;
    const updatedPlayer = this.grantStartingBonus(player, offered, pickNumber);
    const nextSelections = [...selections, offered];
    const nextSequence = this.state.sequence + 1;
    const nextOptions = nextSelections.length < STARTING_BONUS_PICK_COUNT
      ? this.drawStartingBonusOptions(
          updatedPlayer,
          `${seat.joinToken}:starting-bonus:${pickNumber + 1}:${nextSequence}`,
          seat.startingBonusOfferOptions ?? []
        )
      : [];

    this.state = {
      ...this.state,
      sequence: nextSequence,
      players: this.state.players.map((entry) =>
        entry.seatId === seatId ? updatedPlayer : entry
      ),
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              startingBonusOfferId: nextOptions.length > 0
                ? `starting-bonus:${seatId}:${pickNumber + 1}:${nextSequence}`
                : null,
              startingBonusOfferOptions: nextOptions,
              startingBonusSelections: nextSelections,
              ready: false
            }
          : entry
      )
    };
  }

  setSeatReady(seatId: string, ready: boolean): void {
    this.reconcileNamedPlayerRules({ autoSelectPopelord: true });
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    const lobbyReady = this.state.status === "lobby" && this.state.phase === "start";
    const lateJoinReady =
      this.state.status === "active" &&
      this.state.sessionMode === "multiplayer" &&
      this.state.gameMode !== "nemesis_relay" &&
      Boolean(seat?.displayName) &&
      !this.state.turnOrder.includes(seatId);

    if (!lobbyReady && !lateJoinReady) {
      throw new Error("Ready state can only be changed before the session starts");
    }

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName) {
      throw new Error("Seat must be joined before it can be readied");
    }

    if (ready && (!seat.characterId || seat.characterSelected === false)) {
      throw new Error("Choose a character before Ready");
    }

    if (ready && seat.characterId) {
      const selected = this.characters.get(seat.characterId);
      const eligibility = selected ? this.getCharacterEligibility(seatId, selected) : { allowed: false, reason: "Unknown operative" };
      if (!eligibility.allowed) throw new Error(eligibility.reason ?? "This operative is not available");
    }

    if (ready && !seat.selectedStartingContractId) {
      throw new Error("Choose a starting Contract before Ready");
    }

    if (ready && !hasCompletedStartingBonusSelection(seat)) {
      throw new Error("Choose two starting bonuses before Ready");
    }

    if (seat.ready === ready && !lateJoinReady) {
      return;
    }

    if (lateJoinReady && !ready) {
      return;
    }

    if (lateJoinReady) {
      this.state = {
        ...this.state,
        sequence: this.state.sequence + 1,
        turnOrder: [...this.state.turnOrder, seatId],
        seats: this.state.seats.map((entry) =>
          entry.seatId === seatId ? { ...entry, ready: true } : entry
        ),
        players: this.state.players.map((player) =>
          player.seatId === seatId
            ? {
                ...player,
                character: {
                  ...player.character,
                  activeContract: {
                    contractId: seat.selectedStartingContractId!,
                    progress: 0
                  },
                  activeContracts: [{
                    contractId: seat.selectedStartingContractId!,
                    progress: 0
                  }]
                }
              }
            : player
        )
      };
      this.awardRandomEdgeCard(seatId, "setup", "late-join-setup");
      return;
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              ready
            }
          : entry
      )
    };
  }

  releaseSeat(seatId: string): void {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    const lobbyRelease = this.state.status === "lobby" && this.state.phase === "start";
    const pendingLateJoinRelease =
      this.state.status === "active" &&
      Boolean(seat?.displayName) &&
      !this.state.turnOrder.includes(seatId);

    if (!lobbyRelease && !pendingLateJoinRelease) {
      throw new Error("Only lobby seats or unfinished late joins can be released");
    }

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName && !seat.ready && !seat.connected) {
      return;
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              displayName: null,
              startingContractOptions: [],
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              characterSelected: false,
              connected: false,
              ready: false
            }
          : entry
      )
    };
  }

  releaseSeatByToken(seatToken: string): void {
    const seat = this.resolveSeatFromToken(seatToken);

    if (!seat) {
      throw new Error("Invalid seat token");
    }

    this.releaseSeat(seat.seatId);
    this.broadcastPatch();
  }

  leaveSeatByToken(seatToken: string): void {
    const seat = this.resolveSeatFromToken(seatToken);

    if (!seat) {
      throw new Error("Invalid seat token");
    }

    const activeOperative =
      this.state.status === "active" && this.state.turnOrder.includes(seat.seatId);

    if (!activeOperative) {
      this.releaseSeat(seat.seatId);
      this.broadcastPatch();
      return;
    }

    for (const client of [...this.clients]) {
      if (client.view !== "phone" || client.seatId !== seat.seatId) continue;
      client.superseded = true;
      this.clients.delete(client);
      client.socket.close(4005, "Player left the room");
    }

    this.setSeatConnected(seat.seatId, false);
    this.recoverPendingEnemyRollForLeavingSeat(seat.seatId);
    this.broadcastPatch();
  }

  startSession(): void {
    this.reconcileNamedPlayerRules({ autoSelectPopelord: true });
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Session already started");
    }

    if (this.state.lobbyConfigured === false) {
      throw new Error("Choose Single Player or Multiplayer before starting");
    }

    const startReadiness = getSessionStartReadiness({
      sessionMode: this.state.sessionMode,
      gameMode: this.state.gameMode,
      seats: this.state.seats
    });

    if (!startReadiness.canStart) {
      throw new Error(startReadiness.reason);
    }

    this.state = {
      ...this.state,
      status: "active",
      winnerSeatId: null,
      activeSeatIndex: 0,
      turnOrder: startReadiness.occupiedSeatIds,
      players: this.applySelectedStartingContracts()
    };
    this.setupScenarioPreview = null;

    const activeSeatId = this.state.turnOrder[0] ?? this.state.seats[0]?.seatId;

    this.applyAction({
      type: "SESSION_STARTED",
      seatId: activeSeatId,
      createdAt: new Date().toISOString()
    });
    this.initializeEdgeDeck(activeSeatId);

    if (this.state.gameMode === "nemesis_relay") {
      this.applyAction({
        type: "NEMESIS_SPAWNED",
        seatId: activeSeatId,
        champions: createNemesisChampionsForSeats(this.state, this.state.turnOrder),
        createdAt: new Date().toISOString()
      } satisfies NemesisSpawnedAction);
    }

    if (this.state.status === "active") {
      // SESSION_STARTED already opens the first operative's navigation window. Scenario
      // turn-start pressure begins with the next authoritative turn; resolving it here
      // could reveal a Threat before the opening movement and leave the session owning
      // both an opening encounter and a movement step.
      this.maybeTriggerAbilityOnTurnStarted(this.state.turnOrder[this.state.activeSeatIndex] ?? activeSeatId);
      this.emitMovementDiagnostic("session-started", this.state.turnOrder[this.state.activeSeatIndex] ?? activeSeatId);
    }
    this.broadcastPatch();
  }

  private isRejoinMessage(message: unknown): message is RejoinMessage {
    if (!isRecord(message) || message.type !== "REJOIN") {
      return false;
    }

    requireStringField(message, "sessionId", "REJOIN");
    requireStringField(message, "seatToken", "REJOIN");
    return true;
  }

  private isHostCommand(message: unknown): message is HostCommandMessage {
    return isRecord(message) && (
      message.type === "KICK_SEAT" ||
      message.type === "RESTART_SESSION" ||
      message.type === "RETURN_TO_LOBBY" ||
      message.type === "MOVEMENT_PRESENTATION_COMPLETED"
    );
  }

  private parseClientMessage(message: unknown): ClientIntent | HostCommandMessage {
    if (!isRecord(message)) {
      throw new IntentRejectedError("UNKNOWN", "Malformed intent");
    }

    const type = getMessageType(message);

    if (type === "KICK_SEAT") {
      requireStringField(message, "targetSeatId", type);
      return message as unknown as KickSeatMessage;
    }

    if (type === "RESTART_SESSION") {
      return message as unknown as RestartSessionMessage;
    }

    if (type === "RETURN_TO_LOBBY") {
      return message as unknown as ReturnToLobbyMessage;
    }

    if (type === "MOVEMENT_PRESENTATION_COMPLETED") {
      requireStringField(message, "eventId", type);
      return message as unknown as MovementPresentationCompletedMessage;
    }

    if (!CLIENT_INTENT_TYPES.has(type)) {
      throw new IntentRejectedError(type, `Client cannot submit server action ${type}`);
    }

    requireStringField(message, "seatId", type);

    switch (type) {
      case "HOST_VIEW_REQUESTED":
        requireEnumField(message, "mode", new Set(["signal", "map"]), type);
        break;
      case "HOST_SETUP_PREVIEW_REQUESTED":
        requireStringField(message, "scenarioId", type);
        requireEnumField(message, "mode", new Set(["single-player", "co-op", "rivalry", "nemesis"]), type);
        if (!Number.isInteger(message.playerCount)) {
          throw new IntentRejectedError(type, "Scenario preview player count must be an integer");
        }
        break;
      case "MOVEMENT_DESTINATION_PREVIEWED":
        if (message.toSectorId !== null) {
          requireStringField(message, "toSectorId", type);
        }
        if (message.routeId !== undefined) requireStringField(message, "routeId", type);
        if (message.movementRevision !== undefined && (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 1)) throw new IntentRejectedError(type, "Movement revision must be a positive integer");
        break;
      case "MOVE_REQUESTED":
        requireStringField(message, "toSectorId", type);
        if (message.routeId !== undefined) requireStringField(message, "routeId", type);
        if (message.movementRevision !== undefined && (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 1)) throw new IntentRejectedError(type, "Movement revision must be a positive integer");
        break;
      case "TIER_TRANSITION_REQUESTED":
        requireStringField(message, "destinationSectorId", type);
        if (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 0) {
          throw new IntentRejectedError(type, "Movement revision must be a non-negative integer");
        }
        if (message.voidKeyInstanceId !== undefined) requireStringField(message, "voidKeyInstanceId", type);
        break;
      case "INNER_APPROACH_MOVE_REQUESTED":
        requireStringField(message, "destinationSectorId", type);
        if (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 0) {
          throw new IntentRejectedError(type, "Movement revision must be a non-negative integer");
        }
        break;
      case "USE_TRANSITION_ROUTE_AID":
        requireEnumField(message, "sourceKind", new Set(["gear", "follower"]), type);
        requireStringField(message, "instanceId", type);
        requireStringField(message, "destinationSectorId", type);
        if (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 0) {
          throw new IntentRejectedError(type, "Movement revision must be a non-negative integer");
        }
        break;
      case "MOVEMENT_ROLL_REQUESTED":
        break;
      case "ADJUST_MOVEMENT_REQUESTED":
        requireStringField(message, "instanceId", type);
        if (message.adjustment !== -1 && message.adjustment !== 1) throw new IntentRejectedError(type, "Movement adjustment must be -1 or +1");
        break;
      case "SELECT_ROUTE_STAR_VARIANT":
        requireStringField(message, "instanceId", type); requireStringField(message, "destinationId", type); requireStringField(message, "routeId", type);
        if (!Number.isInteger(message.movementRevision) || Number(message.movementRevision) < 1) throw new IntentRejectedError(type, "Movement revision must be a positive integer");
        break;
      case "ACTIVATE_GATE_SAINT":
        requireStringField(message, "instanceId", type); break;
      case "USE_MARROW_DETOUR":
        requireStringField(message, "instanceId", type); requireStringField(message, "reactionId", type); requireStringField(message, "toSectorId", type); break;
      case "CONTINUE_SCAR_CONSEQUENCE":
        requireStringField(message, "reactionId", type); break;
      case "CHOOSE_SCAR":
        requireStringField(message, "selectionId", type);
        requireStringField(message, "scarId", type);
        break;
      case "PURGE_SCAR_REQUESTED":
        requireStringField(message, "choiceId", type);
        requireStringField(message, "scarId", type);
        break;
      case "USE_SCAR_ADAPTATION":
        requireStringField(message, "activationId", type); requireStringField(message, "scarId", type); requireStringField(message, "ruleKey", type);
        if (message.targetId !== undefined) requireStringField(message, "targetId", type);
        if (message.rollIndex !== undefined && (!Number.isInteger(message.rollIndex) || Number(message.rollIndex) < 0)) throw new IntentRejectedError(type, "Roll index must be a non-negative integer");
        break;
      case "SELECT_EQUIPMENT_SUPPRESSION_TARGET":
        requireStringField(message, "choiceId", type); requireStringField(message, "itemInstanceId", type); break;
      case "ENCOUNTER_DECISION_REQUESTED":
        requireStringField(message, "decisionId", type); requireStringField(message, "optionId", type);
        if (!Number.isInteger(message.decisionVersion) || Number(message.decisionVersion) < 1) throw new IntentRejectedError(type, "Encounter decision version must be a positive integer");
        break;
      case "MEMORY_TAX_CHOICE_REQUESTED":
        requireStringField(message, "choiceId", type);
        requireStringField(message, "optionId", type);
        if (!Number.isInteger(message.choiceVersion) || Number(message.choiceVersion) < 1) throw new IntentRejectedError(type, "Memory Tax choice version must be a positive integer");
        if (message.optionId !== "lose-salvage-1" && message.optionId !== "next-non-battle-test-minus-1") throw new IntentRejectedError(type, "Unknown Memory Tax option");
        break;
      case "FORCED_DISPLACEMENT_ACCEPTED":
        requireStringField(message, "reactionId", type);
        break;
      case "FORCED_DESTINATION_SELECTED":
        requireStringField(message, "choiceId", type);
        requireStringField(message, "destinationSectorId", type);
        break;
      case "PHASE_ADVANCED":
        requireEnumField(message, "toPhase", PHASE_VALUES, type);
        break;
      case "START_TILE_ENCOUNTER":
        requireStringField(message, "encounterId", type);
        requireStringField(message, "resolutionId", type);
        break;
      case "CHECK_REQUESTED":
      case "COMBAT_REQUESTED":
      case "RAISE_STAT_REQUESTED":
        requireEnumField(message, "stat", STAT_VALUES, type);
        break;
      case "AFFLICTION_STAT_CHOSEN":
        requireStringField(message, "resolutionId", type);
        requireEnumField(message, "stat", STAT_VALUES, type);
        break;
      case "AFFLICTION_REACTION_RESOLVED":
        requireStringField(message, "reactionId", type);
        if (typeof message.use !== "boolean") throw new IntentRejectedError(type, "Affliction reaction must be accepted or declined");
        if (message.dieIndex !== undefined && message.dieIndex !== 0 && message.dieIndex !== 1) {
          throw new IntentRejectedError(type, "Affliction reroll die must be 0 or 1");
        }
        break;
      case "COOPERATIVE_ASSISTANCE_REQUESTED":
        requireStringField(message, "sourceId", type);
        requireEnumField(message, "stat", STAT_VALUES, type);
        if (!Array.isArray(message.helperSeatIds) || message.helperSeatIds.length < 1 || message.helperSeatIds.length > 2 || message.helperSeatIds.some((seatId) => typeof seatId !== "string" || seatId.length === 0)) {
          throw new IntentRejectedError(type, "Choose one or two valid helpers");
        }
        break;
      case "COOPERATIVE_ASSISTANCE_RESPONDED":
        requireStringField(message, "requestId", type);
        if (typeof message.accept !== "boolean") throw new IntentRejectedError(type, "Assistance response must accept or decline");
        break;
      case "COOPERATIVE_ASSISTANCE_LOCKED":
      case "COOPERATIVE_ASSISTANCE_CANCELLED":
        requireStringField(message, "requestId", type);
        break;
      case "COOPERATIVE_TEST_ROLL_REQUESTED":
        requireStringField(message, "testId", type);
        break;
      case "PLAY_EDGE_CARD":
        requireStringField(message, "cardId", type);
        requireStringField(message, "resolutionId", type);
        requireEnumField(message, "mode", new Set(["commit-value", "ability"]), type);
        if (message.targetId !== undefined) requireStringField(message, "targetId", type);
        break;
      case "DECLINE_EDGE_CARD_REACTION":
        requireStringField(message, "reactionId", type);
        break;
      case "BROKEN_CONCORDANCE_NODE_REQUESTED":
        requireStringField(message, "nodeId", type);
        break;
      case "NEMESIS_COMBAT_REQUESTED":
        requireStringField(message, "nemesisId", type);
        if ("stat" in message) {
          requireEnumField(message, "stat", STAT_VALUES, type);
        }
        break;
      case "RECRUIT_REPLACEMENT":
        requireStringField(message, "replacementCharacterId", type);
        break;
      case "SELECT_CHARACTER":
        requireStringField(message, "characterId", type);
        if (message.signalPieceId !== undefined) {
          requireEnumField(message, "signalPieceId", new Set(SIGNAL_PIECE_IDS), type);
        }
        break;
      case "EQUIP_GEAR":
        requireStringField(message, "gearId", type);
        if (message.instanceId !== undefined) requireStringField(message, "instanceId", type);
        requireEnumField(message, "slot", GEAR_SLOT_VALUES, type);
        break;
      case "RESOLVE_GEAR_EQUIP_CHOICE":
        requireStringField(message, "choiceId", type);
        requireStringField(message, "itemInstanceId", type);
        requireEnumField(message, "decision", new Set(["equip", "keepCarried"]), type);
        break;
      case "UNEQUIP_GEAR":
        requireEnumField(message, "slot", GEAR_SLOT_VALUES, type);
        break;
      case "USE_GEAR":
        requireStringField(message, "gearId", type);
        if (message.gearId === "rift-anchor-spike") {
          requireStringField(message, "instanceId", type);
          requireStringField(message, "forcedDisplacementReactionId", type);
          requireStringField(message, "forcedDisplacementSourceEventId", type);
        }
        break;
      case "USE_FOLLOWER":
        requireStringField(message, "followerId", type);
        break;
      case "USE_CHARACTER_ABILITY":
        requireStringField(message, "abilityId", type);
        break;
      case "TABLE_INTERACTION":
        requireStringField(message, "targetSeatId", type);
        requireEnumField(message, "interactionKind", TABLE_INTERACTION_VALUES, type);
        break;
      case "SHOP_SERVICE_REQUESTED":
        requireStringField(message, "serviceId", type);
        if (message.itemInstanceId !== undefined && typeof message.itemInstanceId !== "string") {
          throw new IntentRejectedError(type, "Malformed intent: itemInstanceId must be a string");
        }
        break;
      case "SHOP_BROWSE_SELECTED":
        requireEnumField(message, "view", new Set(["categories", "equipment", "supplies", "artifacts", "route-aids", "services", "sell"]), type);
        if (message.selectedId !== undefined && message.selectedId !== null && typeof message.selectedId !== "string") {
          throw new IntentRejectedError(type, "Malformed intent: selectedId must be a stable string ID");
        }
        break;
      case "SHOP_PURCHASE_REQUESTED":
        requireStringField(message, "cardId", type);
        break;
      case "SHOP_SELL_REQUESTED":
        requireStringField(message, "gearId", type);
        if (message.instanceId !== undefined && typeof message.instanceId !== "string") throw new IntentRejectedError(type, "Malformed intent: instanceId must be a string");
        break;
      case "ACCEPT_CONTRACT":
      case "SELECT_STARTING_CONTRACT":
      case "COMPLETE_CONTRACT":
        requireStringField(message, "contractId", type);
        break;
      case "SELECT_STARTING_BONUS":
        requireStringField(message, "offerId", type);
        requireStringField(message, "optionId", type);
        requireEnumField(message, "optionKind", new Set(["gear", "follower"]), type);
        break;
      case "SELECT_REPLACEMENT_CONTRACT":
        requireStringField(message, "selectionId", type);
        requireStringField(message, "contractId", type);
        break;
      case "OPEN_MISSION_RELIC_EXCHANGE":
        if (
          !Array.isArray(message.missionIds) ||
          message.missionIds.length !== MISSION_RELIC_EXCHANGE_COST ||
          message.missionIds.some((missionId) => typeof missionId !== "string" || missionId.length === 0)
        ) {
          throw new IntentRejectedError(type, "Choose exactly three completed Contract IDs");
        }
        break;
      case "CLAIM_MISSION_RELIC":
        requireStringField(message, "exchangeId", type);
        requireStringField(message, "artifactId", type);
        break;
      case "RESOLVE_SPACE_TEXT":
        if (message.choiceId !== undefined && typeof message.choiceId !== "string") {
          throw new IntentRejectedError(type, "Malformed intent: choiceId must be a string");
        }
        break;
      case "SET_READY":
        if (typeof message.ready !== "boolean") {
          throw new IntentRejectedError(type, "Malformed intent: ready must be a boolean");
        }
        break;
      default:
        break;
    }

    return message as unknown as ClientIntent;
  }

  private isValidHostToken(token: string): boolean {
    return Boolean(this.hostToken && token === this.hostToken && validateHostToken(token, this.state.sessionId));
  }

  private handleRejoin(client: ConnectedClient, message: RejoinMessage): void {
    if (client.view !== "phone") {
      this.sendRejoinRejected(client, "Only phone clients can rejoin a seat");
      return;
    }

    if (message.sessionId !== this.state.sessionId) {
      this.sendRejoinRejected(client, "Session mismatch");
      return;
    }

    const seat = this.resolveSeatFromToken(message.seatToken);

    if (!seat) {
      this.sendRejoinRejected(client, "Invalid seat token");
      client.socket.close(4002, "Invalid rejoin token");
      return;
    }

    client.seatId = seat.seatId;
    this.adoptPhoneClient(client);

    const accepted: RejoinAcceptedEnvelope = {
      type: "REJOIN_ACCEPTED",
      sessionId: this.state.sessionId,
      seatId: seat.seatId
    };

    client.socket.send(JSON.stringify(accepted));
  }

  private handleHostCommand(client: ConnectedClient, command: HostCommandMessage): void {
    if (client.view !== "tv" || !client.isHost) {
      throw new IntentRejectedError(command.type, "Only the host TV can issue that command");
    }

    if (command.type === "KICK_SEAT") {
      this.kickSeat(command.targetSeatId);
      return;
    }

    if (command.type === "MOVEMENT_PRESENTATION_COMPLETED") {
      this.completeMovementPresentation(command.eventId);
      return;
    }

    this.restartActiveSession(command.type === "RETURN_TO_LOBBY");
  }

  private hasFollower(player: PlayerState | undefined, followerId: string): boolean {
    return Boolean(player?.character.followers?.some((follower) => follower.id === followerId));
  }

  private makeEffectSequence(effects: EncounterEffect[]): EncounterEffect {
    const compact = effects.filter((effect): effect is EncounterEffect => Boolean(effect));
    return compact.length === 1 ? compact[0]! : { type: "sequence", effects: compact };
  }

  private effectContainsNote(effect: EncounterEffect | null | undefined, needle: string): boolean {
    if (!effect) {
      return false;
    }

    if (effect.type === "gain_note") {
      return effect.text.includes(needle);
    }

    if (effect.type === "sequence") {
      return effect.effects.some((entry) => this.effectContainsNote(entry, needle));
    }

    return false;
  }

  private effectContainsWound(effect: EncounterEffect): boolean {
    if (effect.type === "take_wound") {
      return effect.amount > 0;
    }

    if (effect.type === "sequence") {
      return effect.effects.some((entry) => this.effectContainsWound(entry));
    }

    return false;
  }

  private effectContainsType(effect: EncounterEffect, type: EncounterEffect["type"]): boolean {
    if (effect.type === type) return true;
    return effect.type === "sequence" && effect.effects.some((entry) => this.effectContainsType(entry, type));
  }

  private reduceFirstWound(effect: EncounterEffect): EncounterEffect | null {
    if (effect.type === "take_wound") {
      const nextAmount = effect.amount - 1;
      return nextAmount > 0 ? { ...effect, amount: nextAmount } : null;
    }

    if (effect.type !== "sequence") {
      return effect;
    }

    let prevented = false;
    const nextEffects = effect.effects
      .map((entry) => {
        if (prevented || !this.effectContainsWound(entry)) {
          return entry;
        }

        prevented = true;
        return this.reduceFirstWound(entry);
      })
      .filter((entry): entry is EncounterEffect => Boolean(entry));

    return nextEffects.length > 0 ? { ...effect, effects: nextEffects } : null;
  }

  private hasFandiablosPreventedWoundThisRound(seatId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const entry = this.state.eventLog[index] as { type?: string; seatId?: string; effect?: EncounterEffect } | undefined;

      if (entry?.type === "ROUND_COMPLETED") {
        return false;
      }

      if (entry?.seatId === seatId && this.effectContainsNote(entry.effect, "Fandiablos Unreasonable Courage")) {
        return true;
      }
    }

    return false;
  }

  private maybeApplyFandiablosWoundPrevention(seatId: string, effect: EncounterEffect): EncounterEffect;
  private maybeApplyFandiablosWoundPrevention(seatId: string, effect: null): null;
  private maybeApplyFandiablosWoundPrevention(seatId: string, effect: EncounterEffect | null): EncounterEffect | null;
  private maybeApplyFandiablosWoundPrevention(seatId: string, effect: EncounterEffect | null): EncounterEffect | null {
    if (!effect) return null;
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!this.hasFollower(player, FANDIABLOS_ID) || !this.effectContainsWound(effect) || this.hasFandiablosPreventedWoundThisRound(seatId)) {
      return effect;
    }

    const courageRoll = this.randomSource.nextInt(6) + 1;

    if (courageRoll < 4) {
      return this.makeEffectSequence([
        effect,
        { type: "gain_note", text: `Fandiablos Unreasonable Courage rolled ${courageRoll}; the wound lands.` }
      ]);
    }

    return this.makeEffectSequence([
      this.reduceFirstWound(effect) ?? { type: "gain_note", text: "Fandiablos absorbed the whole wound event." },
      { type: "gain_note", text: `Fandiablos Unreasonable Courage rolled ${courageRoll}; one wound was prevented.` }
    ]);
  }

  private hasKerPreventedWoundThisRound(seatId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const entry = this.state.eventLog[index] as { type?: string; seatId?: string; effect?: EncounterEffect } | undefined;

      if (entry?.type === "ROUND_COMPLETED") {
        return false;
      }

      if (entry?.seatId === seatId && this.effectContainsNote(entry.effect, "Hold the Line prevented")) {
        return true;
      }
    }

    return false;
  }

  private maybeApplyKerWoundPrevention(seatId: string, effect: EncounterEffect): EncounterEffect;
  private maybeApplyKerWoundPrevention(seatId: string, effect: null): null;
  private maybeApplyKerWoundPrevention(seatId: string, effect: EncounterEffect | null): EncounterEffect | null;
  private maybeApplyKerWoundPrevention(seatId: string, effect: EncounterEffect | null): EncounterEffect | null {
    if (!effect) return null;
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (player?.character.id !== "char_ker_von_ker" || !this.effectContainsWound(effect) || this.hasKerPreventedWoundThisRound(seatId)) {
      return effect;
    }

    return this.makeEffectSequence([
      this.reduceFirstWound(effect) ?? { type: "gain_note", text: "Hold the Line absorbed the full wound event." },
      { type: "gain_note", text: "Hold the Line prevented 1 Wound." }
    ]);
  }

  private getPendingRollModifierSources(seatId: string, stat: Stat, mode: "battle" | "check"): RollModifierSource[] {
    const sources: RollModifierSource[] = [];

    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const entry = this.state.eventLog[index] as
        | { type?: string; seatId?: string; rollModifier?: PendingRollModifier }
        | undefined;

      if (entry?.type === "TURN_COMPLETED") {
        break;
      }

      if (
        entry?.seatId === seatId &&
        (entry.type === "COMBAT_RESOLVED" ||
          entry.type === "CHECK_ROLLED" ||
          entry.type === "COOPERATIVE_ASSISTED_ROLL_RESOLVED")
      ) {
        break;
      }

      if (
        entry?.seatId === seatId &&
        (entry.type === "USE_GEAR" || entry.type === "USE_FOLLOWER" || entry.type === "ABILITY_TRIGGERED" || entry.type === "SCAR_ADAPTATION_ACTIVATED") &&
        entry.rollModifier?.stat === stat &&
        entry.rollModifier.mode === mode
      ) {
        sources.push({
          label: entry.rollModifier.label,
          value: entry.rollModifier.value
        });
      }
    }

    return sources.reverse();
  }

  private hasAbilityTriggeredThisTurn(seatId: string, abilityId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const entry = this.state.eventLog[index] as { type?: string; seatId?: string; abilityId?: string } | undefined;

      if (entry?.type === "TURN_COMPLETED") {
        return false;
      }

      if (entry?.type === "ABILITY_TRIGGERED" && entry.seatId === seatId && entry.abilityId === abilityId) {
        return true;
      }
    }

    return false;
  }

  private consumeScarRollModifierSources(player: PlayerState, stat: Stat, mode: "battle" | "check"): RollModifierSource[] {
    const encounter = this.state.currentEncounter;
    const sector = getBoardSpace(player.sectorId);
    const eventId = this.state.activeResolution?.id ?? `scar-roll:${player.seatId}:${this.state.sequence + 1}`;
    const encounterKind = encounter?.cardType === "enemy"
      ? "enemy"
      : encounter?.cardType === "hazard" ? "hazard" : undefined;
    const context = {
      eventId,
      timing: "beforeRoll",
      stat,
      mode,
      encounterKind,
      enemyFamily: encounter?.enemyFamily,
      elite: encounter?.severity === 5,
      boss: false,
      sectorTags: sector?.tags ?? []
    } as const;
    const burdens = evaluateOwnedScarRules(this.state, player, "burden", context);
    const passiveAdaptations = evaluateOwnedScarRules(this.state, player, "adaptation", context)
      .filter((entry) => getScarCard(entry.scarId)?.adaptation.optional === false);
    const applied = [...burdens, ...passiveAdaptations].filter((entry) => entry.outcome.modifier !== undefined);
    const usage = applied.flatMap((entry) => entry.usage ? [entry.usage] : []);
    if (usage.length > 0) this.state = { ...this.state, scarUsage: [...(this.state.scarUsage ?? []), ...usage] };
    return applied.map((entry) => ({
      label: `${getScarCard(entry.scarId)?.title ?? entry.scarId} (Scar)`,
      value: entry.outcome.modifier ?? 0
    }));
  }

  private getCharacterModifierSources(player: PlayerState, stat: Stat, mode: "battle" | "check"): RollModifierSource[] {
    const encounter = this.state.currentEncounter;
    const sector = getBoardSpace(player.sectorId);
    const tags = new Set(sector?.tags ?? []);
    const sources: RollModifierSource[] = [];

    if (player.character.id === "char_bjornis" && mode === "battle" && stat === "grit" && (encounter?.threatLane === "red" || player.sectorId === "cinder-fields")) {
      sources.push({ label: "Firebreak Vow", value: 1 });
    }

    if (player.character.id === "char_bjornis" && mode === "check" && stat === "signal" && encounter?.threatLane === "blue") {
      sources.push({ label: "Blue Anomaly weakness", value: -1 });
    }

    if (player.character.id === "char_ker_von_ker" && mode === "battle" && stat === "grit" && encounter?.cardType === "enemy" && encounter.difficulty >= 8) {
      sources.push({ label: "Shield Breaker", value: 1 });
    }

    if (player.character.id === "char_kira_dog" && mode === "battle" && stat === "grit" && !this.hasAbilityTriggeredThisTurn(player.seatId, "houndblade-charge")) {
      sources.push({ label: "Houndblade Charge", value: 1 });
    }

    if (player.character.id === "char_popelord" && mode === "battle" && stat === "grit" && (tags.has("salvage") || tags.has("hazard"))) {
      sources.push({ label: "Mire Pitchfork", value: 1 });
    }

    if (player.character.id === "char_rumi" && !this.hasAbilityTriggeredThisRound(player.seatId, "violet-edge") && (stat === "signal" || stat === "guile")) {
      sources.push({ label: "Violet Edge", value: 1 });
    }

    if (
      player.character.id === "char_deepdale" &&
      mode === "check" &&
      stat === "forge" &&
      encounter?.cardType === "hazard" &&
      encounter.threatLane === "yellow"
    ) {
      sources.push({ label: "Black Dust Craft", value: 1 });
    }

    if (
      player.character.id === "char_deepdale" &&
      mode === "check" &&
      stat === "signal" &&
      encounter?.cardType === "hazard" &&
      encounter.threatLane === "blue"
    ) {
      sources.push({ label: "Lantern Delver", value: 1 });
    }

    if (
      player.character.id === "char_kira_dog" &&
      mode === "check" &&
      stat === "guile" &&
      encounter?.cardType === "hazard" &&
      encounter.threatLane !== "blue"
    ) {
      sources.push({ label: "Ash-Scent Tracker", value: 1 });
    }

    if (
      player.character.id === "grave-engineer" &&
      mode === "check" &&
      stat === "forge" &&
      (tags.has("salvage") || tags.has("shop"))
    ) {
      sources.push({ label: "Grave Spark", value: 1 });
    }

    if (
      player.character.id === "salvage-warden" &&
      mode === "check" &&
      stat === "forge" &&
      (tags.has("salvage") || (encounter?.cardType === "hazard" && encounter.threatLane === "yellow"))
    ) {
      sources.push({ label: "Scrap Bastion", value: 1 });
    }

    if (
      player.character.id === "rift-cartographer" &&
      mode === "check" &&
      (stat === "signal" || stat === "guile") &&
      (tags.has("movement") || tags.has("anomaly"))
    ) {
      sources.push({ label: "Breach Atlas", value: 1 });
    }

    return sources;
  }

  private getCharacterDifficultyModifier(player: PlayerState, encounter: ThreatCard): number {
    if (encounter.cardType !== "hazard") {
      return 0;
    }

    if (player.character.id === "signal-witch" && encounter.threatLane === "blue" && !this.hasAbilityTriggeredThisRound(player.seatId, "hush-static")) {
      return -1;
    }

    if (player.character.id === "char_popelord" && encounter.threatLane === "yellow" && !this.hasAbilityTriggeredThisRound(player.seatId, "compost-cape")) {
      return -1;
    }

    return 0;
  }

  private buildStatModifierSources(
    player: PlayerState,
    stat: Stat,
    mode: "battle" | "check",
    options: {
      scenarioModifier?: number;
      keyedPlayerModifier?: number;
      masterAlphaModifier?: number;
      extraSources?: RollModifierSource[];
    } = {}
  ): RollModifierSource[] {
    const permanent = player.character.statUpgrades?.[stat] ?? 0;
    const base = Math.max(0, player.character.stats[stat] - permanent);
    const sources: RollModifierSource[] = [
      { label: `Base ${CHALLENGE_LABELS[stat]}`, value: base }
    ];

    if (permanent !== 0) {
      sources.push({ label: `Permanent ${CHALLENGE_LABELS[stat]}`, value: permanent });
    }

    if (isFirstThreatGearSuppressed(this.state.tileArrivalThreatProgress)) {
      sources.push(...getCompanionStatModifierSources(player.character, stat));
    } else {
      sources.push(...getEquippedGearModifierSources(player.character, stat, {
        mode,
        suppressedInstanceIds: getSuppressedEquipmentInstanceIds(this.state, player.seatId, this.state.activeResolution?.id)
      }));
    }
    sources.push(...getAfflictionModifierSources(player, stat, mode, getAfflictionCatalog(this.state)));
    sources.push(...this.getCharacterModifierSources(player, stat, mode));
    sources.push(...this.consumeScarRollModifierSources(player, stat, mode));
    if ((player.character.temporaryAllStatBoost?.remainingEligibleResolutions ?? 0) > 0) sources.push({ label: "Too Many Dogs", value: player.character.temporaryAllStatBoost!.value });

    if (options.scenarioModifier) {
      sources.push({ label: "Scenario", value: options.scenarioModifier });
    }

    if (options.keyedPlayerModifier) {
      sources.push({ label: "Threat effect", value: options.keyedPlayerModifier });
    }

    sources.push(...this.getPendingRollModifierSources(player.seatId, stat, mode));

    if (options.masterAlphaModifier) {
      sources.push({ label: "MASTER ALPHA", value: options.masterAlphaModifier });
    }

    if (options.extraSources?.length) {
      sources.push(...options.extraSources);
    }

    return sources.filter((source) => source.value !== 0);
  }

  private markFirstEligibleCharacterAbility(
    seatId: string,
    stat: Stat,
    mode: "battle" | "check",
    encounter: ThreatCard
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    const ability =
      player.character.id === "char_kira_dog" && mode === "battle" && stat === "grit" && !this.hasAbilityTriggeredThisTurn(seatId, "houndblade-charge")
        ? { id: "houndblade-charge", summary: "Houndblade Charge drove the first battle Kira started this turn.", note: "Houndblade Charge was spent on Kira's first battle this turn." }
        : player.character.id === "char_rumi" && (stat === "signal" || stat === "guile") && !this.hasAbilityTriggeredThisRound(seatId, "violet-edge")
          ? { id: "violet-edge", summary: "Violet Edge cut into Rumi's first eligible test this round.", note: "Violet Edge was spent on this Signal or Guile test." }
          : player.character.id === "signal-witch" && mode === "check" && encounter.cardType === "hazard" && encounter.threatLane === "blue" && !this.hasAbilityTriggeredThisRound(seatId, "hush-static")
            ? { id: "hush-static", summary: "Hush Static softened Lane's first Blue Anomaly this round.", note: "Hush Static reduced this Blue Anomaly's difficulty." }
            : player.character.id === "char_popelord" && mode === "check" && encounter.cardType === "hazard" && encounter.threatLane === "yellow" && !this.hasAbilityTriggeredThisRound(seatId, "compost-cape")
              ? { id: "compost-cape", summary: "Compost Cape softened Popelord's first yellow hazard this round.", note: "Compost Cape reduced this yellow hazard's difficulty." }
              : null;

    if (!ability) {
      return;
    }

    this.applyAbilityMutation(seatId, ability.id, ability.summary, (entry) => ({
      ...entry,
      private: {
        ...entry.private,
        notes: [...entry.private.notes, ability.note]
      }
    }));
  }

  private sumModifierSources(sources: RollModifierSource[]): number {
    return sources.reduce((sum, source) => sum + source.value, 0);
  }

  private hasPendingRoll(seatId: string): boolean {
    const resolution = this.state.activeResolution;

    return Boolean(
      this.state.pendingEnemyRoll ||
        (resolution &&
          resolution.playerId === seatId &&
          (resolution.roll || resolution.stage === "dice_roll" || resolution.stage === "roll_result"))
    );
  }

  private createGearRollModifier(seatId: string, item: GearItem): PendingRollModifier | undefined {
    const encounter = this.state.currentEncounter;

    if (item.id === "black-route-fuse") {
      if (this.state.phase !== "action" || !encounter || encounter.cardType !== "enemy" || this.hasPendingRoll(seatId)) {
        throw new IntentRejectedError("USE_GEAR", "Black Route Fuse can only be used before a battle roll.");
      }

      if (item.statBonus.stat !== encounter.stat) {
        throw new IntentRejectedError("USE_GEAR", `Black Route Fuse is usable only in ${CHALLENGE_LABELS[item.statBonus.stat]} battles. This encounter uses ${CHALLENGE_LABELS[encounter.stat]}.`);
      }

      return {
        label: item.name,
        value: 3,
        stat: item.statBonus.stat,
        mode: "battle"
      };
    }

    if (
      item.id === "red-march-warbell"
    ) {
      if (this.state.phase !== "action" || !encounter || encounter.cardType !== "enemy" || this.hasPendingRoll(seatId)) {
        throw new IntentRejectedError("USE_GEAR", "Red March Warbell can only be used before a battle roll.");
      }

      if (item.statBonus.stat !== encounter.stat) {
        throw new IntentRejectedError("USE_GEAR", `Red March Warbell is usable only in ${CHALLENGE_LABELS[item.statBonus.stat]} battles. This encounter uses ${CHALLENGE_LABELS[encounter.stat]}.`);
      }

      return {
        label: item.name,
        value: 2,
        stat: item.statBonus.stat,
        mode: "battle"
      };
    }

    return undefined;
  }

  private createFollowerRollModifier(seatId: string, follower: Follower): PendingRollModifier | undefined {
    if (this.hasPendingRoll(seatId)) {
      return undefined;
    }

    const encounter = this.state.currentEncounter;

    if (this.state.phase !== "action" || !encounter) {
      return undefined;
    }

    if (follower.id === FANDIABLOS_ID && encounter.cardType === "enemy" && encounter.stat === "grit") {
      return {
        label: "Fandiablos",
        value: 3,
        stat: "grit",
        mode: "battle"
      };
    }

    if (follower.id === FANDIABLOS_ID && encounter.cardType === "hazard" && (encounter.stat === "forge" || encounter.stat === "guile")) {
      return {
        label: "Fandiablos",
        value: 2,
        stat: encounter.stat,
        mode: "check"
      };
    }

    if (follower.abilityId === "signal_anomaly_support" && encounter.cardType === "hazard" && (encounter.stat === "signal" || encounter.threatLane === "blue")) {
      return { label: follower.name, value: 1, stat: encounter.stat, mode: "check" };
    }

    return undefined;
  }

  private assertGearUseAllowed(seatId: string, item: GearItem): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || !player.character.heldGear.some((heldItem) => heldItem.id === item.id)) {
      throw new IntentRejectedError("USE_GEAR", `Gear ${item.id} is not held by this character`);
    }

    if (!item.activeText && !item.useLimit) {
      throw new IntentRejectedError("USE_GEAR", `${item.name} is passive and applies automatically.`);
    }

    const challengeEligibility = getChallengeItemEligibility(this.state, seatId, item);
    if (challengeEligibility.challengeLinked && !challengeEligibility.eligible) {
      throw new IntentRejectedError("USE_GEAR", challengeEligibility.disabledReason ?? `${item.name} is not eligible for this test.`);
    }

    if (item.effectModel === "consumable") {
      if (item.consumableEffect === "ignoreFailedMovementOrHazard") {
        const reaction = this.state.resolutionSource !== "tileChallenge" && this.state.phase === "resolution" && this.state.pendingEffect && this.state.activeResolution?.roll?.success === false &&
          this.state.pendingFailureReaction?.seatId === seatId &&
          (this.state.pendingFailureReaction.testType === "movement" || this.state.pendingFailureReaction.testType === "hazard");
        if (!reaction) throw new IntentRejectedError("USE_GEAR", `${item.name} can only be used after a failed movement or hazard test, before its effects resolve.`);
      } else if (this.state.phase !== "action") {
        throw new IntentRejectedError("USE_GEAR", `${item.name} can only be used during an action window.`);
      }
      if (item.consumableEffect === "healWound" && (player.character.wounds ?? 0) <= 0) {
        throw new IntentRejectedError("USE_GEAR", `${item.name} cannot resolve because this character has no wounds.`);
      }
      const grantedGearId = item.consumableEffect === "grantVeilHook" ? "veil-hook" : item.consumableEffect === "grantMarshalSeal" ? "marshal-seal" : null;
      if (grantedGearId && player.character.heldGear.some((heldItem) => heldItem.id === grantedGearId)) {
        throw new IntentRejectedError("USE_GEAR", `${item.name} cannot resolve because this character already owns ${this.gear.get(grantedGearId)?.name ?? grantedGearId}.`);
      }
      if (item.consumableEffect === "grantPaleCartelFixer" && (player.character.followers ?? []).some((follower) => follower.id === "pale-cartel-fixer")) {
        throw new IntentRejectedError("USE_GEAR", `${item.name} cannot resolve because this character already has the Pale Cartel Fixer.`);
      }
    }

    const restrictions = getAfflictionRestrictions(player, getAfflictionCatalog(this.state));

    if (item.slot === "weapon" && restrictions.cannotUseWeapons) {
      const source = restrictions.cannotUseWeaponsSource ?? "an Affliction";
      throw new IntentRejectedError("USE_GEAR", `Weapon disabled: blocked by ${source}. ${item.name} cannot help now.`);
    }

    if (item.slot === "armor" && restrictions.cannotUseArmor) {
      const source = restrictions.cannotUseArmorSource ?? "an Affliction";
      throw new IntentRejectedError("USE_GEAR", `Armor disabled: blocked by ${source}. ${item.name} cannot help now.`);
    }

    if (item.linkedFollowerRole && !(player.character.followers ?? []).some((follower) => follower.role === item.linkedFollowerRole)) {
      throw new IntentRejectedError("USE_GEAR", `${item.name} needs a ${item.linkedFollowerRole} follower.`);
    }
  }

  private createFandiablosWarningEffect(seatId: string): EncounterEffect {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const sector = player ? this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId) : null;
    const lane = this.getNextCurrentSectorThreatLane(seatId);
    const persistentThreatId = lane
      ? (sector?.persistentThreatIds ?? []).find((cardId) => this.threats.get(cardId)?.threatLane === lane) ?? null
      : null;
    const topThreatId = persistentThreatId
      ?? (lane ? this.peekGlobalThreatId(lane, seatId) : sector?.encounterDecks.threat[0] ?? null);
    const topThreat = topThreatId ? this.threats.get(topThreatId) : null;

    if (!topThreatId) {
      return { type: "gain_note", text: "Fandiablos Warning Barks found no upcoming Threat to sniff out." };
    }

    return {
      type: "gain_note",
      text: `Fandiablos Warning Barks revealed the upcoming ${lane ?? "legacy"} Threat: ${topThreat?.title ?? topThreatId}. ${
        persistentThreatId ? "It is fixed on this sector." : lane ? "The remaining bag order stays hidden." : "The remaining legacy test deck stays hidden."
      }`
    };
  }

  private createFandiablosUseEffect(seatId: string): { effect: EncounterEffect; summary: string } {
    const effects: EncounterEffect[] = [];
    const encounter = this.state.currentEncounter;
    let summary = "Fandiablos used.";

    if (this.state.phase === "sector") {
      effects.push(this.createFandiablosWarningEffect(seatId));
      summary = "Fandiablos Warning Barks scouted one local threat before the draw.";
    } else if (encounter?.cardType === "enemy") {
      effects.push({ type: "gain_note", text: "Fandiablos Swarm of Tiny Teeth is committed: +3 Grit for this battle." });
      summary = "Fandiablos Swarm of Tiny Teeth is ready: +3 Grit for this battle.";
    } else if (encounter?.cardType === "hazard" && (encounter.stat === "forge" || encounter.stat === "guile")) {
      effects.push({ type: "gain_note", text: "Fandiablos Cable Biters are committed: +2 to this Forge or Guile machine/trap/salvage test." });
      summary = "Fandiablos Cable Biters are ready: +2 to this Forge or Guile test.";
    } else {
      effects.push({ type: "gain_note", text: "Fandiablos is circling the operative and barking at everything that looks expensive." });
      summary = "Fandiablos is on alert for the current action window.";
    }

    const chaosRoll = this.randomSource.nextInt(6) + 1;

    if (chaosRoll === 1) {
      effects.push({ type: "gain_note", text: "Too Many Dogs: chaos roll 1. The flock barked the route into a scar-safe warning instead of a softlock." });
      summary = `${summary} Too Many Dogs triggered: the flock raised a warning without adding persistent harm.`;
    } else {
      effects.push({ type: "gain_note", text: `Too Many Dogs: chaos roll ${chaosRoll}. The flock behaved, mostly.` });
    }

    return {
      effect: this.makeEffectSequence(effects),
      summary
    };
  }

  private createGearUseAction(
    seatId: string,
    gearId: string,
    createdAt: string,
    instanceId?: string,
    pendingTileChallengeId?: string,
    staticIntercessionReactionId?: string,
    pendingTileChallengeEffectId?: string,
    scarConsequenceReactionId?: string,
    scarInstanceId?: string,
    pendingScarEffectId?: string,
    contractSignature?: string,
    forcedDisplacementReactionId?: string,
    forcedDisplacementSourceEventId?: string
  ): UseGearAction {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const item = player?.character.heldGear.find((entry) => entry.id === gearId && (!instanceId || entry.instanceId === instanceId));

    if (!item) {
      throw new IntentRejectedError("USE_GEAR", `Gear ${gearId} is not held by this character`);
    }

    if (!isOwnedItemEffectActive(this.state, seatId, item.instanceId, this.state.activeResolution?.id)) {
      throw new IntentRejectedError("USE_GEAR", `${item.name} is Suppressed for this ${this.state.currentEncounter?.cardType === "enemy" ? "battle" : "Threat"}.`);
    }

    this.assertGearUseAllowed(seatId, item);

    if (item.effectModel === "exhaust") {
      if (item.exhausted) throw new IntentRejectedError("USE_GEAR", `${item.name} is Exhausted. Refreshes next round.`);
      if (item.requiresEquipped && !Object.values(player!.character.equippedGear).includes(item.id)) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
      if ((player!.character.salvage ?? 0) < (item.activationCost?.amount ?? 0)) throw new IntentRejectedError("USE_GEAR", `${item.name} requires 1 Salvage.`);
      if (item.exhaustEffect === "mirrorReroll") {
        const stat = this.state.lastOutcomeSummary?.checkStat;
        if (!this.state.pendingFailureReaction || !["guile", "signal"].includes(stat ?? "") || this.state.activeResolution?.roll?.success !== false) throw new IntentRejectedError("USE_GEAR", `${item.name} requires a pending failed Guile or Signal test.`);
      }
    }

    if (item.chargedEffect === "choirLightSignalBonus") {
      const pending = this.state.pendingTileChallenge;
      if (!pending || pending.id !== pendingTileChallengeId || pending.seatId !== seatId || pending.challengeType !== "anomaly" || pending.testStat !== "signal" || pending.rolled) {
        throw new IntentRejectedError("USE_GEAR", `${item.name} requires an unrolled anomaly Signal tile challenge.`);
      }
      if (!item.instanceId || item.instanceId !== instanceId) throw new IntentRejectedError("USE_GEAR", `${item.name} instance is stale.`);
      if ((item.currentCharges ?? item.charges ?? 0) < (item.chargeCost ?? 1)) throw new IntentRejectedError("USE_GEAR", `${item.name} has no charges remaining.`);
      if (player!.character.equippedGear.utility !== item.id) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
      if (pending.modifierSources.some((source) => source.label === "Choir Lantern")) throw new IntentRejectedError("USE_GEAR", "Choir Light is already committed to this test.");
    }

    if (item.chargedEffect === "staticIntercession") {
      const pending = this.state.pendingTileChallenge;
      const reaction = this.state.pendingStaticIntercessionReaction;
      const finalFailure = this.state.activeResolution?.roll?.success === false;
      if (!pending || pending.id !== pendingTileChallengeId || pending.seatId !== seatId || pending.challengeType !== "anomaly" || !pending.rolled || !finalFailure || this.state.phase !== "resolution") {
        throw new IntentRejectedError("USE_GEAR", `${item.name} requires your failed recurring Anomaly Challenge before failure effects resolve.`);
      }
      if (!item.instanceId || item.instanceId !== instanceId) throw new IntentRejectedError("USE_GEAR", `${item.name} instance is stale.`);
      if ((item.currentCharges ?? item.charges ?? 0) < (item.chargeCost ?? 1)) throw new IntentRejectedError("USE_GEAR", `${item.name} has no charges remaining.`);
      if (player!.character.equippedGear.utility !== item.id) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
      if (!reaction || reaction.id !== staticIntercessionReactionId || reaction.pendingTileChallengeId !== pending.id || reaction.seatId !== seatId || reaction.selectedEffectId !== null) {
        throw new IntentRejectedError("USE_GEAR", "The Static Intercession reaction is stale or unavailable.");
      }
      if (!pendingTileChallengeEffectId || !reaction.suppressibleEffects.some((choice) => choice.effectId === pendingTileChallengeEffectId)) {
        throw new IntentRejectedError("USE_GEAR", "The selected anomaly failure effect is stale or unavailable.");
      }
      if (this.state.eventLog.some((event) => {
        const action = event as Partial<UseGearAction>;
        return action.type === "USE_GEAR" && action.gearId === item.id && action.pendingTileChallengeId === pending.id;
      })) {
        throw new IntentRejectedError("USE_GEAR", "Static Intercession has already affected this challenge resolution.");
      }
    }

    if (item.chargedEffect === "scarSinkPrayer") {
      const pending = this.state.pendingScarConsequence;
      if (!pending || pending.seatId !== seatId || pending.status !== "pending" || pending.reactionId !== scarConsequenceReactionId || pending.scarInstanceId !== scarInstanceId) {
        throw new IntentRejectedError("USE_GEAR", "The Scar-Sink Prayer reaction is stale or unavailable.");
      }
      if (!player!.character.scars.includes(pending.scarCardId)) {
        throw new IntentRejectedError("USE_GEAR", "The Scar that created this consequence is no longer owned.");
      }
      if (!pendingScarEffectId || !pending.pendingEffects.some((choice) => choice.effectId === pendingScarEffectId)) {
        throw new IntentRejectedError("USE_GEAR", "The selected Scar effect is stale or unavailable.");
      }
      if (!item.instanceId || item.instanceId !== instanceId) throw new IntentRejectedError("USE_GEAR", `${item.name} instance is stale.`);
      if ((item.currentCharges ?? item.charges ?? 0) < (item.chargeCost ?? 1)) throw new IntentRejectedError("USE_GEAR", `${item.name} has no charges remaining.`);
      if (player!.character.equippedGear.utility !== item.id) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
    }

    let oathchainReveal: UseGearAction["oathchainReveal"];
    if (item.chargedEffect === "traceThePromise") {
      const contractId = player!.character.activeContract?.contractId;
      const contract = contractId ? this.state.availableContracts.find((entry) => entry.id === contractId) : null;
      if (this.state.phase !== "action" || this.state.turnOrder[this.state.activeSeatIndex] !== seatId || !contract) throw new IntentRejectedError("USE_GEAR", "Trace the Promise requires your action phase and an active Contract.");
      if (!item.instanceId || item.instanceId !== instanceId) throw new IntentRejectedError("USE_GEAR", `${item.name} instance is stale.`);
      if ((item.currentCharges ?? item.charges ?? 0) < 1) throw new IntentRejectedError("USE_GEAR", `${item.name} has no charges remaining.`);
      if (player!.character.equippedGear.utility !== item.id) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
      const currentSignature = getOathchainContractSignature(player!, contract);
      if (!contractSignature || contractSignature !== currentSignature) throw new IntentRejectedError("USE_GEAR", "The active Contract changed before the Lens was confirmed.");
      if (player!.private.activeOathchainReveal?.contractSignature === currentSignature) throw new IntentRejectedError("USE_GEAR", "Trace the Promise is already active for this Contract and turn.");
      const targets = deriveOathchainTargets(this.state, player!, contract);
      if (targets.length === 0) throw new IntentRejectedError("USE_GEAR", "No currently visible target can advance this Contract.");
      oathchainReveal = { revealId: `oathchain:${seatId}:${this.state.sequence + 1}`, ownerSeat: seatId, itemInstanceId: item.instanceId, contractId: contract.id, contractSignature: currentSignature, contractName: contract.name, objectiveProgress: formatContractObjectiveStatus(contract, player!.character.activeContract!.progress), revealedTargets: targets, createdTurn: this.state.sequence, expiresAtTurnEnd: true };
    }

    if (item.chargedEffect === "suppressForcedDisplacement") {
      const pending = this.state.pendingDisplacement;
      if (this.state.phase !== "resolution" || !pending || pending.status !== "pending" || pending.seatId !== seatId || pending.reactionId !== forcedDisplacementReactionId || pending.sourceEventId !== forcedDisplacementSourceEventId) {
        throw new IntentRejectedError("USE_GEAR", "The Rift Anchor Spike displacement reaction is stale or unavailable.");
      }
      if (!canRiftAnchorSpikeSuppress(pending.sourceType, pending.sourceId)) throw new IntentRejectedError("USE_GEAR", "This displacement source cannot be suppressed by Rift Anchor Spike.");
      if (!item.instanceId || item.instanceId !== instanceId) throw new IntentRejectedError("USE_GEAR", `${item.name} instance is stale.`);
      if ((item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) < (item.chargeCost ?? 1)) throw new IntentRejectedError("USE_GEAR", `${item.name} has no charges remaining.`);
      if (player!.character.equippedGear.utility !== item.id) throw new IntentRejectedError("USE_GEAR", `${item.name} must be equipped.`);
      if (player!.character.currentSpaceId !== pending.originSectorId || player!.sectorId !== pending.originSectorId) throw new IntentRejectedError("USE_GEAR", "The forced-displacement origin is stale.");
      if ((this.state.resolvedDisplacementSourceEventIds ?? []).includes(pending.sourceEventId)) throw new IntentRejectedError("USE_GEAR", "This forced displacement was already resolved.");
      if (getForcedDisplacementDestination(this.state, seatId, pending.direction) !== pending.destinationSectorId) throw new IntentRejectedError("USE_GEAR", "The forced-displacement destination is no longer legal.");
    }

    const itemName = item?.name ?? gearId;
    const discard = item?.consumeOnUse === true || item?.useLimit === "discard";
    const rollModifier = item.chargedEffect === "choirLightSignalBonus"
      ? { label: "Choir Lantern", value: 2, stat: "signal" as const, mode: "check" as const }
      : this.createGearRollModifier(seatId, item);
    const effect = item.chargedEffect === "staticIntercession" || item.chargedEffect === "scarSinkPrayer" || item.chargedEffect === "traceThePromise" || item.chargedEffect === "suppressForcedDisplacement" ? null : this.resolveEffect(this.getGearUseEffect(gearId), seatId);

    return {
      type: "USE_GEAR",
      seatId,
      gearId,
      instanceId: item.instanceId,
      effect,
      discard,
      suppressPendingFailure: item.consumableEffect === "ignoreFailedMovementOrHazard",
      pendingFailureReactionId: item.consumableEffect === "ignoreFailedMovementOrHazard" ? this.state.pendingFailureReaction?.id : undefined,
      salvageCost: item.effectModel === "exhaust" ? item.activationCost?.amount : undefined,
      exhaustInstanceId: item.effectModel === "exhaust" ? item.instanceId : undefined,
      mirrorReroll: item.exhaustEffect === "mirrorReroll" ? { ...this.createSoloRerollAction({ type: "SOLO_REROLL_REQUESTED", seatId }, createdAt, true), artifactReroll: true } : undefined,
      rollModifier,
      chargeInstanceId: item.effectModel === "charged" ? item.instanceId : undefined,
      pendingTileChallengeId: item.chargedEffect === "choirLightSignalBonus" || item.chargedEffect === "staticIntercession" ? pendingTileChallengeId : undefined,
      staticIntercessionReactionId: item.chargedEffect === "staticIntercession" ? staticIntercessionReactionId : undefined,
      pendingTileChallengeEffectId: item.chargedEffect === "staticIntercession" ? pendingTileChallengeEffectId : undefined,
      scarConsequenceReactionId: item.chargedEffect === "scarSinkPrayer" ? scarConsequenceReactionId : undefined,
      scarInstanceId: item.chargedEffect === "scarSinkPrayer" ? scarInstanceId : undefined,
      pendingScarEffectId: item.chargedEffect === "scarSinkPrayer" ? pendingScarEffectId : undefined,
      forcedDisplacementReactionId: item.chargedEffect === "suppressForcedDisplacement" ? forcedDisplacementReactionId : undefined,
      forcedDisplacementSourceEventId: item.chargedEffect === "suppressForcedDisplacement" ? forcedDisplacementSourceEventId : undefined,
      oathchainReveal,
      summary: item.chargedEffect === "staticIntercession" ? "Static Intercession — One anomaly consequence suppressed."
        : item.chargedEffect === "scarSinkPrayer" ? "Scar-Sink Prayer — One Scar consequence suppressed."
        : item.chargedEffect === "traceThePromise" ? "Oathchain Lens consulted."
        : item.chargedEffect === "suppressForcedDisplacement" ? "Rift Anchor Spike deployed — Forced displacement prevented."
        : `${itemName} used. ${item?.activeText ?? "Its effect was recorded for the table."}`,
      createdAt
    } satisfies UseGearAction;
  }

  private getGearUseEffect(gearId: string): EncounterEffect {
    switch (gearId) {
      case "blackstar-ampoule":
      case "artifact-blackstar-ampoule":
        return { type: "gain_note", text: "Blackstar Ampoule discarded: failure effects ignored; the test remains failed." };
      case "artifact-bell-votive":
        return { type: "sequence", effects: [{ type: "gain_gear", gearId: "veil-hook" }, { type: "gain_note", text: "Bell votive cache opened. The yard watch left breach paths in the lining." }] };
      case "artifact-pale-ledger-token":
        return { type: "sequence", effects: [{ type: "gain_follower", followerId: "pale-cartel-fixer" }, { type: "gain_note", text: "Pale Ledger Token cashed for a fixer and a contract whisper." }] };
      case "artifact-void-salt-poultice":
        return { type: "sequence", effects: [{ type: "heal_wound", amount: 1 }, { type: "gain_note", text: "Void-Salt Poultice closed one wound." }] };
      case "artifact-yard":
        return { type: "sequence", effects: [{ type: "gain_gear", gearId: "marshal-seal" }, { type: "gain_note", text: "The Yard Bellframe Core released its Marshal Seal." }] };
      case "choir-static-censer":
        return { type: "gain_note", text: "Choir Static Censer spent. No additional status change." };
      case LEGACY_SCAR_SINK_PRAYER_ID:
        return { type: "gain_note", text: "Scar-Sink Prayer steadied the operative. No additional status change." };
      case "cinder-suture-kit":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: "Cinder Suture Kit sealed the wound without creating a second persistent harm track." }
          ]
        };
      case "cinder-stim-ampoule":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: "Cinder-Stim Ampoule burned one wound clean enough to keep moving." }
          ]
        };
      case "voidsalt-poultice":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: "Voidsalt Poultice packed the wound in cold salt and black herbs." }
          ]
        };
      case "last-breath-rivet":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: "Last-Breath Rivet broke clean: the next wound was braced and the armor is gone." }
          ]
        };
      case "saintwire-splint":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: "Saintwire Splint steadied the body. No additional status change." }
          ]
        };
      case "mirror-reroll-token":
        return {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "Mirror Reroll Token risk recorded without adding persistent harm." },
            { type: "gain_note", text: "Mirror Reroll Token spent: reroll a failed guile or signal check and keep the new fate." }
          ]
        };
      case "black-route-fuse":
        return {
          type: "sequence",
          effects: [
            { type: "advance_escalation", amount: 1 },
            { type: "gain_note", text: "Black Route Fuse broken: +3 Grit before the battle roll is banked for this fight." }
          ]
        };
      case "grave-lens":
        return { type: "gain_note", text: "Grave Lens reading: a follower-linked route note was recorded." };
      case "red-march-warbell":
        return {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "Red March Warbell risk recorded without adding persistent harm." },
            { type: "gain_note", text: "Red March Warbell sounded: +2 Grit before the battle roll is banked for this fight." }
          ]
        };
      case "ashen-route-compass":
        return { type: "gain_note", text: "Ashen Route Compass adjusted the exact required movement distance." };
      case "choir-lantern":
        return { type: "gain_note", text: "Choir Lantern spent: a warded route note was recorded from the cold choir flame." };
      case "route-star":
        return { type: "gain_note", text: "Route Star spent: a safer breach-marked path was recorded for the table." };
      case "void-key":
        return { type: "gain_note", text: "Void Key spent: a gate or final-approach route claim was recorded." };
      default:
        return { type: "gain_note", text: `${gearId} was used and its table effect was recorded.` };
    }
  }

  private createFollowerUseAction(
    seatId: string,
    followerId: string,
    createdAt: string,
    escalate = false
  ): UseFollowerAction {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const follower = (player?.character.followers ?? []).find((entry) => entry.id === followerId);

    if (!follower) {
      throw new IntentRejectedError("USE_FOLLOWER", `Follower ${followerId} is not attached to this character`);
    }

    if (!follower.activeEffect && !follower.useLimit) {
      throw new IntentRejectedError("USE_FOLLOWER", `${follower.name} is passive and applies automatically.`);
    }

    if (follower.effectModel === "exhaust") {
      if (follower.exhausted) throw new IntentRejectedError("USE_FOLLOWER", `${follower.name} is Exhausted. Refreshes next round.`);
      const timings = follower.activationTiming ?? [];
      const beforeBattle = this.state.phase === "action" && this.state.currentEncounter?.cardType === "enemy" && !this.state.activeResolution?.roll;
      const beforeHazard = this.state.phase === "action" && this.state.currentEncounter?.cardType === "hazard" && !this.state.activeResolution?.roll;
      const beforeThreat = this.state.phase === "sector";
      const movement = this.state.phase === "navigation";
      const beforeDamage = this.state.phase === "resolution" && Boolean(this.state.pendingEffect && this.effectContainsWound(this.state.pendingEffect));
      const eligible = (timings.includes("beforeBattleRoll") && beforeBattle) || (timings.includes("beforeThreatDraw") && beforeThreat) ||
        (timings.includes("movement") && movement) || (timings.includes("beforeTakingDamage") && beforeDamage) || (follower.id === FANDIABLOS_ID && beforeHazard);
      if (!eligible) throw new IntentRejectedError("USE_FOLLOWER", `${follower.name} is not usable in this timing window.`);
      if (follower.id === FANDIABLOS_ID) {
        const cost = escalate ? 2 : 1;
        if (player!.character.wounds + cost >= this.state.woundThreshold) throw new IntentRejectedError("USE_FOLLOWER", `Fandiablos requires capacity to suffer ${cost} Wound${cost === 1 ? "" : "s"}.`);
      }
    }

    const pendingFailure = this.state.pendingFailureReaction;
    const pendingEffect = this.state.pendingEffect;
    const isFailedReaction = this.state.phase === "resolution" && Boolean(
      pendingFailure && pendingFailure.seatId === seatId && pendingEffect && this.state.activeResolution?.roll?.success === false
    );
    const middleRoute = getBoardSpace(player!.character.currentSpaceId)?.tier === "middle";
    const suppressPendingFailure =
      (follower.abilityId === "ignore_route_failure" && isFailedReaction && pendingFailure?.testType === "movement") ||
      (follower.abilityId === "ignore_middle_route_failure" && isFailedReaction && pendingFailure?.testType === "movement" && middleRoute) ||
      (follower.abilityId === "prevent_equipment_loss" && isFailedReaction && this.effectContainsType(pendingEffect!, "equipment_suppression")) ||
      (follower.abilityId === "prevent_salvage_loss" && isFailedReaction && this.effectContainsType(pendingEffect!, "lose_salvage")) ||
      (follower.abilityId === "battle_support" && isFailedReaction && this.effectContainsWound(pendingEffect!));

    if (["ignore_route_failure", "ignore_middle_route_failure", "prevent_equipment_loss", "prevent_salvage_loss", "battle_support"].includes(follower.abilityId ?? "") && !suppressPendingFailure) {
      throw new IntentRejectedError("USE_FOLLOWER", `${follower.name} requires its matching pending failure consequence.`);
    }

    const fandiablosUse = follower?.id === FANDIABLOS_ID ? this.createFandiablosUseEffect(seatId) : null;
    const effect = follower.activeEffect ? this.resolveEffect(follower.activeEffect as EncounterEffect, seatId) : null;
    const rollModifier = this.createFollowerRollModifier(seatId, follower);

    return {
      type: "USE_FOLLOWER",
      seatId,
      followerId,
      followerInstanceId: follower.instanceId,
      woundCost: follower.id === FANDIABLOS_ID ? (escalate ? 2 : 1) : undefined,
      grantAllStatBoost: follower.id === FANDIABLOS_ID && escalate,
      effect: fandiablosUse ? this.resolveEffect(fandiablosUse.effect, seatId) : effect,
      discard: follower?.useLimit === "discard" || follower?.abilityId === "battle_support",
      suppressPendingFailure,
      pendingFailureReactionId: suppressPendingFailure ? pendingFailure?.id : undefined,
      rollModifier,
      summary: (fandiablosUse ?? follower)
        ? `${follower?.name ?? followerId} used. ${fandiablosUse?.summary ?? follower?.text ?? "Their table effect was recorded."}`
        : `${followerId} used. Their table effect was recorded.`,
      createdAt
    } satisfies UseFollowerAction;
  }

  private createTableInteractionAction(
    intent: Extract<ClientIntent, { type: "TABLE_INTERACTION" }>,
    createdAt: string
  ): TableInteractionAction {
    const actorName = this.getSeatDisplayName(intent.seatId);
    const targetName = this.getSeatDisplayName(intent.targetSeatId);

    switch (intent.interactionKind) {
      case "aid":
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_note", text: `${actorName} aided ${targetName}.` },
          targetEffect: { type: "gain_note", text: `${targetName} was steadied by table aid.` },
          summary: `${actorName} aided ${targetName}; the target records a steadier position.`,
          createdAt
        } satisfies TableInteractionAction;
      case "duel":
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_note", text: `${actorName} challenged ${targetName} to a bounded duel.` },
          targetEffect: { type: "gain_note", text: `${targetName} was marked by bounded rivalry pressure.` },
          summary: `${actorName} challenged ${targetName}; bounded rivalry pressure was recorded.`,
          createdAt
        } satisfies TableInteractionAction;
      case "interfere":
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_note", text: `${actorName} interfered and drew public attention.` },
          targetEffect: { type: "gain_note", text: `${targetName} was caught in the interference.` },
          summary: `${actorName} interfered with ${targetName}; both operatives record public pressure.`,
          createdAt
        } satisfies TableInteractionAction;
      case "trade":
      default:
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_note", text: `${actorName} traded with ${targetName}.` },
          targetEffect: { type: "gain_note", text: `${targetName} traded with ${actorName}.` },
          summary: `${actorName} traded with ${targetName}; both operatives record the exchange.`,
          createdAt
        } satisfies TableInteractionAction;
    }
  }

  private resolveShopBrowseSelection(
    intent: Extract<ClientIntent, { type: "SHOP_BROWSE_SELECTED" }>
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player || this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId || this.state.phase !== "action") {
      throw new IntentRejectedError(intent.type, "Only the active operative may browse this shop");
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);
    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new IntentRejectedError(intent.type, SHOP_FAILURE_REASONS.notAtShop);
    }
    if (
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingEffect ||
      buildPublicBlockingThreats(this.state).length > 0 ||
      !getServiceThreatGate(this.state, intent.seatId, player.character.currentSpaceId).allowed
    ) {
      throw new IntentRejectedError(intent.type, SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const services = buildPublicShopServices(this.state, player);
    const reveal = this.state.shopStockReveals.find(
      (entry) => entry.seatId === intent.seatId && entry.sectorId === player.character.currentSpaceId
    );
    const expectedService = intent.view === "equipment"
      ? "buy-gear"
      : intent.view === "supplies"
        ? "buy-supplies"
        : intent.view === "artifacts"
          ? "trade-missions-for-artifact"
          : intent.view === "route-aids"
            ? "buy-route-aids"
          : null;

    if (expectedService && (!reveal || reveal.serviceId !== expectedService)) {
      throw new IntentRejectedError(intent.type, "Reveal this category before selecting its stock");
    }
    if (expectedService && intent.selectedId && !reveal?.stockIds.includes(intent.selectedId)) {
      throw new IntentRejectedError(intent.type, "That stock selection is stale or unavailable");
    }
    if (intent.view === "services" && intent.selectedId && !services.some((service) => service.id === intent.selectedId)) {
      throw new IntentRejectedError(intent.type, "That service is not available here");
    }
    if (intent.view === "sell" && intent.selectedId && !player.character.heldGear.some(
      (item) => (item.instanceId ?? item.id) === intent.selectedId && item.tier !== "artifact"
    )) {
      throw new IntentRejectedError(intent.type, "That sale selection is stale or private");
    }
    if (intent.view === "categories" && intent.selectedId) {
      throw new IntentRejectedError(intent.type, "The category chamber does not select stock");
    }

    this.applyAction({
      type: "SHOP_BROWSE_SELECTED",
      seatId: intent.seatId,
      sectorId: player.character.currentSpaceId,
      view: intent.view,
      selectedId: intent.selectedId ?? null,
      createdAt: new Date().toISOString()
    } satisfies ShopBrowseSelectedAction);
  }

  private createShopServiceAction(
    intent: Extract<ClientIntent, { type: "SHOP_SERVICE_REQUESTED" }>,
    createdAt: string
  ): GameAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const blockingThreats = buildPublicBlockingThreats(this.state);

    if (
      blockingThreats.length > 0 ||
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingEffect ||
      !getServiceThreatGate(this.state, intent.seatId, player.character.currentSpaceId).allowed
    ) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const service = buildPublicShopServices(this.state, player).find((entry) => entry.id === intent.serviceId);

    if (!service) {
      throw new Error(`Unknown shop service ${intent.serviceId}`);
    }

    const discountedService = this.applyQuietLedgerDiscount(
      intent.seatId,
      player.character.currentSpaceId,
      service.cost
    );
    const discountMakesAffordable =
      service.disabledReason === SHOP_FAILURE_REASONS.insufficientSalvage &&
      discountedService.edgeDiscount === 1 &&
      (player.character.salvage ?? 0) >= (discountedService.cost.salvage ?? 0);
    if (!service.enabled && !discountMakesAffordable) {
      throw new Error(service.disabledReason ?? `${service.label} is not available`);
    }

    const shopName = boardSpace.name;
    const actorName = player.character.name;
    const base = {
      type: "SHOP_SERVICE_RESOLVED" as const,
      seatId: intent.seatId,
      serviceId: service.id,
      serviceLabel: service.label,
      shopName,
      sectorId: player.character.currentSpaceId,
      cost: discountedService.cost,
      edgeDiscount: discountedService.edgeDiscount,
      createdAt
    };

    switch (service.id) {
      case "purge-scar": {
        const lastArrival = [...this.state.eventLog].reverse().find((entry) => {
          const event = entry as { type?: string; seatId?: string; toSectorId?: string };
          return event.type === "MOVED" && event.seatId === intent.seatId && event.toSectorId === "middle_scar_surgery";
        }) as { createdAt?: string } | undefined;
        const visitId = `scar-surgery:${intent.seatId}:${lastArrival?.createdAt ?? "initial"}`;
        return {
          type: "SCAR_REMOVAL_OFFERED",
          seatId: intent.seatId,
          choiceId: `${visitId}:choice`,
          visitId,
          scarIds: [...player.character.scars],
          createdAt
        };
      }
      case "buy-gear": {
        const stockCategory = getShopStockCategoryForService(boardSpace, service.id);

        if (!stockCategory) {
          throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        }

        const stock = this.pickShopGearStock(player, 3, "standard", stockCategory);

        if (stock.length === 0) {
          throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        }

        return {
          type: "SHOP_STOCK_REVEALED",
          seatId: intent.seatId,
          serviceId: service.id,
          serviceLabel: service.label,
          shopName,
          sectorId: player.character.currentSpaceId,
          cost: {},
          stock,
          summary: `${actorName} used ${shopName}. Revealed ${stock.length} Gear options.`,
          createdAt
        } satisfies ShopStockRevealedAction;
      }
      case "sell-gear": {
        throw new Error(SHOP_FAILURE_REASONS.invalidItem);
      }
      case "repair-gear":
        if (!intent.itemInstanceId) {
          throw new Error("Choose the exact Gear instance to repair");
        }
        {
          const repairTarget = player.character.heldGear.find((item) => item.instanceId === intent.itemInstanceId);
          const maximum = repairTarget?.maxCharges ?? repairTarget?.maxUses ?? repairTarget?.startingCharges ?? repairTarget?.charges ?? 0;
          const repairable = Boolean(
            repairTarget &&
            ((repairTarget.effectModel === "exhaust" && repairTarget.exhausted) ||
              (repairTarget.useLimit === "charge" && (repairTarget.currentCharges ?? repairTarget.charges ?? 0) < maximum))
          );
          if (!repairTarget || !repairable) {
            throw new Error("That Gear instance does not need repair");
          }
        return {
          ...base,
          result: {
            repairGearInstanceId: repairTarget.instanceId,
            note: `${shopName}: ${repairTarget.name} restored to full use.`
          },
          summary: `${actorName} used ${shopName}. Paid ${discountedService.cost.salvage ?? 0} Salvage to restore ${repairTarget.name}.`
        };
        }
      case "buy-supplies":
        {
          const stock = getAvailableShopStockForCategory(this.gear.values(), "market", {
            ownedGearIds: new Set(player.character.heldGear.map((item) => item.id)),
            includeArtifacts: false,
            includeQaGear: canUseQaShopGear(player.character)
          }).filter((item) => item.subtype === "supply").slice(0, 2);
          if (stock.length === 0) throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
          return {
            type: "SHOP_STOCK_REVEALED",
            seatId: intent.seatId,
            serviceId: service.id,
            serviceLabel: service.label,
            shopName,
            sectorId: player.character.currentSpaceId,
            cost: {},
            stock,
            summary: `${actorName} used ${shopName}. Revealed ${stock.length} Supply options.`,
            createdAt
          } satisfies ShopStockRevealedAction;
        }
      case "buy-route-aids": {
        const ownedIds = new Set([
          ...player.character.heldGear.map((item) => item.id),
          ...(player.character.followers ?? []).map((follower) => follower.id)
        ]);
        const stock = [
          this.gear.get("breachline-sextant"),
          this.gear.get("gateward-spindle"),
          this.followers.get("mara-vell-cinder-cartographer"),
          this.followers.get("knuckle-rail-scent-hound")
        ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry && !ownedIds.has(entry.id)));
        if (stock.length === 0) throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        return {
          type: "SHOP_STOCK_REVEALED",
          seatId: intent.seatId,
          serviceId: "buy-route-aids",
          serviceLabel: "Browse Route Aids",
          shopName,
          sectorId: player.character.currentSpaceId,
          cost: {},
          stock,
          summary: `${actorName} opened the route-aid cabinet. ${stock.length} public offers are available.`,
          createdAt
        } satisfies ShopStockRevealedAction;
      }
      case "buy-treatment":
        return {
          ...base,
          result: {
            woundDelta: -1,
            note: `${shopName}: treatment receipt filed.`
          },
          summary: `${actorName} used ${shopName}. Bought treatment and healed 1 Wound.`
        };
      case "trade-missions-for-artifact": {
        const existingRequisition = (this.state.shopStockReveals ?? []).find((entry) =>
          entry.seatId === intent.seatId &&
          entry.sectorId === player.character.currentSpaceId &&
          entry.serviceId === "trade-missions-for-artifact"
        );
        if (existingRequisition) {
          throw new Error("Artifact requisition already pending");
        }
        const stock = this.pickRelicDealerArtifactOptions(player);

        if (stock.length === 0) {
          throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        }
        const reservedCompletedMissionIds = (player.character.completedContracts ?? [])
          .slice(0, ARTIFACT_EXCHANGE_CONTRACT_COST);
        if (reservedCompletedMissionIds.length !== ARTIFACT_EXCHANGE_CONTRACT_COST) {
          throw new Error("Need three completed Missions");
        }
        const artifactRequisitionId = `artifact-requisition:${intent.seatId}:${this.state.sequence + 1}`;

        return {
          type: "SHOP_STOCK_REVEALED",
          seatId: intent.seatId,
          serviceId: service.id,
          serviceLabel: service.label,
          shopName,
          sectorId: player.character.currentSpaceId,
          cost: {},
          stock,
          artifactRequisitionId,
          reservedCompletedMissionIds,
          summary: `${actorName} consulted ${shopName}. Artifact choices are held privately until one is selected.`,
          createdAt
        } satisfies ShopStockRevealedAction;
      }
      default:
        throw new Error(`Unsupported shop service ${service.id}`);
    }
  }

  private applyQuietLedgerDiscount(
    seatId: string,
    sectorId: string,
    cost: ShopServiceCost
  ): { cost: ShopServiceCost; edgeDiscount?: 1 } {
    const pending = this.state.pendingEdgeAbility;
    const salvageCost = cost.salvage ?? 0;
    if (
      !pending ||
      pending.seatId !== seatId ||
      pending.abilityKey !== "shop-discount" ||
      !pending.resolutionId.startsWith(`edge-shop:${seatId}:${sectorId}:`) ||
      salvageCost <= 1
    ) {
      return { cost };
    }
    return {
      cost: { ...cost, salvage: Math.max(1, salvageCost - 1) },
      edgeDiscount: 1
    };
  }

  private pickShopGearStock(player: PlayerState, count: number, mode: "standard" | "risk", category: ShopCategory): GearItem[] {
    const ownedGearIds = new Set([
      ...player.character.heldGear.map((item) => item.id),
      ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
    ]);

    const options = {
      ownedGearIds,
      includeArtifacts: mode === "risk",
      includeQaGear: canUseQaShopGear(player.character),
      expensiveFirst: mode === "risk"
    };
    const primaryStock = getAvailableShopStockForCategory(this.gear.values(), category, options);

    if (mode !== "standard" || primaryStock.length >= count || category === "market") {
      return primaryStock.slice(0, count);
    }

    const primaryIds = new Set(primaryStock.map((item) => item.id));
    const marketFallback = getAvailableShopStockForCategory(this.gear.values(), "market", options)
      .filter((item) => !primaryIds.has(item.id));

    return [...primaryStock, ...marketFallback].slice(0, count);
  }

  private replenishShopEquipmentStock(seatId: string, sectorId: string, createdAt: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const boardSpace = getBoardSpace(sectorId);
    if (!player || !boardSpace || player.character.currentSpaceId !== sectorId) return;

    const category = getShopStockCategoryForService(boardSpace, "buy-gear");
    if (!category) return;

    const stock = this.pickShopGearStock(player, 3, "standard", category);
    if (stock.length === 0) return;

    this.state = {
      ...this.state,
      shopStockReveals: [
        ...(this.state.shopStockReveals ?? []).filter(
          (reveal) => !(reveal.seatId === seatId && reveal.sectorId === sectorId)
        ),
        {
          seatId,
          sectorId,
          serviceId: "buy-gear",
          shopName: boardSpace.name,
          stockIds: stock.map((item) => item.id),
          revealCost: {},
          createdAt
        }
      ],
      shopBrowseSelection: {
        seatId,
        sectorId,
        view: "equipment",
        selectedId: stock[0]?.id ?? null,
        updatedAt: createdAt
      }
    };
  }

  private pickRelicDealerArtifactOptions(player: PlayerState): GearItem[] {
    const ownedArtifactIds = new Set(
      this.state.players.flatMap((entry) => [
        ...entry.character.heldGear,
        ...Object.values(entry.character.equippedGear)
          .filter((id): id is string => Boolean(id))
          .map((id) => this.gear.get(id))
          .filter((item): item is GearItem => Boolean(item))
      ]).filter((item) => item.tier === "artifact").map((item) => item.id)
    );

    return getAvailableShopStockForCategory(this.gear.values(), "relic-dealer", {
      count: 2,
      ownedGearIds: ownedArtifactIds,
      includeArtifacts: true,
      includeQaGear: canUseQaShopGear(player.character),
      expensiveFirst: false
    }).filter((item) => item.tier === "artifact");
  }

  private createShopPurchaseAction(
    intent: Extract<ClientIntent, { type: "SHOP_PURCHASE_REQUESTED" }>,
    createdAt: string
  ): GameAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const blockingThreats = buildPublicBlockingThreats(this.state);

    if (
      blockingThreats.length > 0 ||
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingEffect ||
      !getServiceThreatGate(this.state, intent.seatId, player.character.currentSpaceId).allowed
    ) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const reveal = this.state.shopStockReveals.find(
      (entry) => entry.seatId === intent.seatId && entry.sectorId === player.character.currentSpaceId && entry.stockIds.includes(intent.cardId)
    );

    if (!reveal) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const follower = reveal.serviceId === "buy-route-aids" ? this.followers.get(intent.cardId) : undefined;
    const gear = this.gear.get(intent.cardId);

    if (!gear && !follower) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    if (follower) {
      if (!["mara-vell-cinder-cartographer", "knuckle-rail-scent-hound"].includes(follower.id)) {
        throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
      }
      if ((player.character.followers ?? []).some((owned) => owned.id === follower.id)) {
        throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
      }
      const discounted = this.applyQuietLedgerDiscount(
        intent.seatId,
        player.character.currentSpaceId,
        { salvage: 4 }
      );
      const cost = discounted.cost;
      if ((player.character.salvage ?? 0) < (cost.salvage ?? 0)) {
        throw new Error(SHOP_FAILURE_REASONS.insufficientSalvage);
      }
      return {
        type: "SHOP_FOLLOWER_PURCHASE_RESOLVED",
        seatId: intent.seatId,
        serviceId: "buy-route-aids",
        shopName: boardSpace.name,
        sectorId: player.character.currentSpaceId,
        cardId: follower.id,
        cost,
        edgeDiscount: discounted.edgeDiscount,
        gainedFollower: {
          ...follower,
          instanceId: `${follower.id}:${intent.seatId}:${this.state.sequence + 1}`,
          currentCharges: follower.startingCharges ?? 2
        },
        discardedStockIds: reveal.stockIds.filter((cardId) => cardId !== follower.id),
        summary: `${player.character.name} recruited ${follower.name} for ${cost.salvage ?? 0} Salvage.`,
        createdAt
      };
    }

    if (!gear) throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);

    const stockCategory = getShopStockCategoryForService(boardSpace, reveal.serviceId);

    const isRouteAid = reveal.serviceId === "buy-route-aids" && gear.chargedEffect === "selectTransitionSector";
    const isMarketFallback = reveal.serviceId === "buy-gear" && isGearAvailableFromShopCategory(gear, "market");
    if ((!stockCategory && !isRouteAid) || (!isRouteAid && !isGearAvailableFromShopCategory(gear, stockCategory!) && !isMarketFallback) ||
      (reveal.serviceId === "buy-supplies" && gear.subtype !== "supply")) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const ownedGearIds = new Set([
      ...player.character.heldGear.map((item) => item.id),
      ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
    ]);

    if (ownedGearIds.has(gear.id)) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const isArtifactExchange = reveal.serviceId === "trade-missions-for-artifact";
    const baseCost = isRouteAid
      ? { salvage: 5 }
      : isArtifactExchange
      ? { completedContracts: ARTIFACT_EXCHANGE_CONTRACT_COST }
      : { salvage: getShopGearCost(gear) };
    const discounted = this.applyQuietLedgerDiscount(
      intent.seatId,
      player.character.currentSpaceId,
      baseCost
    );
    const cost = discounted.cost;

    if (isArtifactExchange && gear.tier !== "artifact") {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }
    if (!isArtifactExchange && (player.character.salvage ?? 0) < (cost.salvage ?? 0)) {
      throw new Error(SHOP_FAILURE_REASONS.insufficientSalvage);
    }
    const spentCompletedContractIds = isArtifactExchange
      ? reveal.reservedCompletedMissionIds
      : undefined;
    if (isArtifactExchange && (spentCompletedContractIds?.length ?? 0) !== ARTIFACT_EXCHANGE_CONTRACT_COST) {
      throw new Error("Need three completed Contracts");
    }

    const discardedStockIds = reveal.stockIds.filter((cardId) => cardId !== gear.id);

    return {
      type: "SHOP_PURCHASE_RESOLVED",
      seatId: intent.seatId,
      serviceId: reveal.serviceId,
      shopName: reveal.shopName,
      sectorId: player.character.currentSpaceId,
      cardId: gear.id,
      cost,
      edgeDiscount: discounted.edgeDiscount,
      gainedGear: gear,
      discardedStockIds,
      spentCompletedContractIds,
      artifactRequisitionId: isArtifactExchange ? reveal.artifactRequisitionId : undefined,
      summary: isArtifactExchange
        ? `${player.character.name} exchanged three completed Contracts for the Artifact ${gear.name}.`
        : `${player.character.name} used ${reveal.shopName}. Bought ${gear.name} for ${cost.salvage} Salvage.`,
      createdAt
    } satisfies ShopPurchaseResolvedAction;
  }

  private createShopSellAction(
    intent: Extract<ClientIntent, { type: "SHOP_SELL_REQUESTED" }>,
    createdAt: string
  ): ShopSellResolvedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const blockingThreats = buildPublicBlockingThreats(this.state);

    if (
      blockingThreats.length > 0 ||
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingEffect ||
      !getServiceThreatGate(this.state, intent.seatId, player.character.currentSpaceId).allowed
    ) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const gear = player.character.heldGear.find((item) => item.id === intent.gearId && (!intent.instanceId || item.instanceId === intent.instanceId));

    if (!gear) {
      throw new Error(SHOP_FAILURE_REASONS.itemNotHeld);
    }

    const restriction = getGearSellRestriction(gear, player.character);

    if (restriction) {
      throw new Error(restriction);
    }

    const sellValue = getShopGearSellValue(gear);

    if (sellValue === null || sellValue < 1) {
      throw new Error(SHOP_FAILURE_REASONS.itemNotSellable);
    }

    return {
      type: "SHOP_SELL_RESOLVED",
      seatId: intent.seatId,
      shopName: boardSpace.name,
      sectorId: player.character.currentSpaceId,
      gearId: gear.id,
      instanceId: gear.instanceId,
      soldGear: gear,
      salvageDelta: sellValue,
      summary: `${player.character.name} used ${boardSpace.name}. Sold ${gear.name} for ${sellValue} Salvage.`,
      createdAt
    } satisfies ShopSellResolvedAction;
  }

  private createShopSkipAction(
    intent: Extract<ClientIntent, { type: "SHOP_SKIP_REQUESTED" }>,
    createdAt: string
  ): ShopSkippedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const hasVisibleBlocker = Boolean(
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingEffect
    );
    if (
      !hasVisibleBlocker &&
      !getServiceThreatGate(this.state, intent.seatId, player.character.currentSpaceId).allowed
    ) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    return {
      type: "SHOP_SKIPPED",
      seatId: intent.seatId,
      shopName: boardSpace.name,
      sectorId: player.character.currentSpaceId,
      summary: `${player.character.name} used ${boardSpace.name}. Continued without trading.`,
      createdAt
    } satisfies ShopSkippedAction;
  }

  private createRivalryAgendaRevealAction(
    intent: Extract<ClientIntent, { type: "RIVALRY_AGENDA_REVEAL_REQUESTED" }>,
    createdAt: string
  ): RivalryAgendaRevealedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const interactionMode = getEffectiveRivalryMode(this.state);

    if (this.state.sessionMode === "single-player" || interactionMode === "co-op") {
      throw new Error("Rivalry agendas can only be revealed in rivalry or ruthless mode");
    }

    const revealState = getPrivateRivalryRevealState(player);

    if (revealState !== "revealAvailable") {
      throw new Error(revealState === "revealed" ? "Rivalry agenda is already revealed" : "Rivalry agenda reveal is locked");
    }

    const revealedAtRound = getCurrentRoundNumber(this.state);
    const actorName = player.character.name || this.getSeatDisplayName(intent.seatId);

    return {
      type: "RIVALRY_AGENDA_REVEALED",
      seatId: intent.seatId,
      publicRevealTitle: "Rivalry Agenda",
      publicRevealSummary: `${actorName} revealed a Rivalry Agenda.`,
      revealedAtRound,
      createdAt
    } satisfies RivalryAgendaRevealedAction;
  }

  private createSoloRerollAction(
    intent: Extract<ClientIntent, { type: "SOLO_REROLL_REQUESTED" }>,
    createdAt: string,
    artifactReroll = false
  ): SoloRerollResolvedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (!artifactReroll && this.state.sessionMode !== "single-player") {
      throw new Error("Solo emergency rerolls are only available in single-player");
    }

    const activeResolution = this.state.activeResolution;
    const encounter = this.state.currentEncounter;

    if (
      !activeResolution ||
      activeResolution.playerId !== intent.seatId ||
      activeResolution.roll?.success !== false ||
      !["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage)
    ) {
      throw new Error("Solo emergency reroll requires a visible failed check");
    }

    if (!encounter || encounter.cardType !== "hazard") {
      throw new Error("Solo emergency reroll requires a failed hazard check");
    }
    if (
      this.state.lastEdgeCardPlay?.seatId === intent.seatId &&
      this.state.lastEdgeCardPlay.mode === "commit-value"
    ) {
      throw new Error("A roll containing a committed Edge value cannot be rerolled");
    }

    if (activeResolution.card?.id && activeResolution.card.id !== encounter.id) {
      throw new Error("Solo emergency reroll no longer matches the active encounter");
    }

    const remainingCharge = this.state.soloRerollCharges?.[intent.seatId] ?? 1;

    if (!artifactReroll && remainingCharge <= 0) {
      throw new Error("Solo emergency reroll has already been used this round");
    }

    const outcomeStat = this.state.lastOutcomeSummary?.seatId === intent.seatId ? this.state.lastOutcomeSummary.checkStat : null;
    const stat = typeof outcomeStat === "string" && STAT_VALUES.has(outcomeStat) ? (outcomeStat as Stat) : encounter.stat;
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus = activeResolution.roll.modifierTotal;
    const difficulty =
      this.state.lastOutcomeSummary?.seatId === intent.seatId && typeof this.state.lastOutcomeSummary.difficulty === "number"
        ? this.state.lastOutcomeSummary.difficulty
        : activeResolution.roll.target;
    const total = roll.total + statBonus;
    const success = total >= difficulty;
    const baseOutcomeEffect = this.getHazardOutcomeEffect(encounter, success);
    const resolvedOutcomeEffect = this.resolveThreatOutcomeEffect(
      intent.seatId,
      encounter,
      baseOutcomeEffect,
      success ? encounter.successEffectKey : encounter.failEffectKey,
      success ? "onSuccess" : "onFailure"
    );
    const outcomeEffect = this.maybeApplyKerWoundPrevention(
      intent.seatId,
      this.maybeApplyFandiablosWoundPrevention(intent.seatId, resolvedOutcomeEffect)
    );

    return {
      type: "SOLO_REROLL_RESOLVED",
      seatId: intent.seatId,
      stat,
      difficulty,
      roll,
      statBonus,
      modifierSources: activeResolution.battle?.modifiers,
      total,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      createdAt
    } satisfies SoloRerollResolvedAction;
  }

  private getSeatDisplayName(seatId: string): string {
    return this.state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId;
  }

  public resolveScarAdaptationIntent(intent: Extract<ClientIntent, { type: "USE_SCAR_ADAPTATION" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player) throw new IntentRejectedError(intent.type, "The operative is unavailable");
    const control = getOwnedScarAdaptationControls(this.state, intent.seatId).find((entry) =>
      entry.activationId === intent.activationId && entry.scarId === intent.scarId && entry.ruleKey === intent.ruleKey
    );
    if (!control) throw new IntentRejectedError(intent.type, "This Scar activation is stale or outside its timing window");
    if (!control.enabled) throw new IntentRejectedError(intent.type, control.disabledReason ?? "This Scar adaptation is unavailable");
    if ((this.state.scarUsage ?? []).some((entry) => entry.usageId === control.usage.usageId)) {
      throw new IntentRejectedError(intent.type, `${control.scarName} has already been used`);
    }
    const requestedTargetId = control.ruleKey.includes("reroll") && intent.rollIndex !== undefined ? String(intent.rollIndex) : intent.targetId;
    if (control.targets.length > 0 && (!requestedTargetId || !control.targets.some((entry) => entry.id === requestedTargetId))) {
      throw new IntentRejectedError(intent.type, "Choose one of the current legal Scar targets");
    }

    const createdAt = new Date().toISOString();
    let summary = getScarCard(control.scarId)?.adaptationText ?? `${control.scarName} activated.`;
    const modifierKeys = new Set(["elite-grit-bonus", "escalation-signal-bonus", "repair-forge-bonus", "declined-help-command-bonus", "anomaly-difficulty-reduction"]);
    const activationEvent: Record<string, unknown> = {
      type: "SCAR_ADAPTATION_ACTIVATED",
      seatId: intent.seatId,
      activationId: control.activationId,
      scarId: control.scarId,
      scarName: control.scarName,
      ruleKey: control.ruleKey,
      targetId: intent.targetId,
      summary,
      createdAt
    };

    if (modifierKeys.has(control.ruleKey)) {
      const stat = control.context.stat;
      if (!stat) throw new IntentRejectedError(intent.type, "The tested skill is no longer available");
      activationEvent.rollModifier = {
        stat,
        mode: control.context.mode === "battle" ? "battle" : "check",
        label: `${control.scarName} (Scar)`,
        value: 1
      };
    }

    if (["guile-reroll", "grit-hazard-reroll", "rift-signal-reroll", "guile-anomaly-reroll"].includes(control.ruleKey)) {
      const resolution = this.state.activeResolution;
      const encounter = this.state.currentEncounter;
      if (!resolution?.roll || !encounter) throw new IntentRejectedError(intent.type, "The roll is no longer available");
      const index = intent.rollIndex ?? 0;
      if (index >= resolution.roll.dice.length) throw new IntentRejectedError(intent.type, "The selected die is unavailable");
      if (
        this.state.lastEdgeCardPlay?.seatId === intent.seatId &&
        this.state.lastEdgeCardPlay.mode === "commit-value" &&
        index === 0
      ) {
        throw new IntentRejectedError(intent.type, "The committed Edge die is locked and cannot be rerolled");
      }
      const faces = [...resolution.roll.dice];
      const previousFace = faces[index]!;
      const nextFace = this.randomSource.nextInt(6) + 1;
      faces[index] = nextFace;
      const baseTotal = resolution.roll.baseTotal - previousFace + nextFace;
      const finalTotal = baseTotal + resolution.roll.modifierTotal;
      const success = finalTotal >= resolution.roll.target;
      const sourceEffect = encounter.cardType === "enemy"
        ? (success ? encounter.defeatReward : encounter.woundOnLoss ?? { type: "take_wound", amount: 1 })
        : this.getHazardOutcomeEffect(encounter, success);
      const effect = this.resolveThreatOutcomeEffect(intent.seatId, encounter, sourceEffect, success ? encounter.successEffectKey : encounter.failEffectKey, success ? "onSuccess" : "onFailure");
      this.state = {
        ...this.state,
        pendingEffect: effect,
        activeResolution: {
          ...resolution,
          stage: "roll_result",
          roll: { ...resolution.roll, dice: faces, baseTotal, finalTotal, success },
          outcome: {
            title: success ? "Scar reroll passed" : "Scar reroll failed",
            text: `${control.scarName} rerolled one die: ${previousFace} to ${nextFace}.`,
            effects: [summary]
          }
        },
        lastOutcomeSummary: this.state.lastOutcomeSummary ? {
          ...this.state.lastOutcomeSummary,
          die1: faces[0] ?? null,
          die2: faces[1] ?? null,
          checkTotal: finalTotal,
          success,
          summary: `${control.scarName} rerolled one die. ${finalTotal}/${resolution.roll.target}.`
        } : null
      };
      summary = `${control.scarName} rerolled one die from ${previousFace} to ${nextFace}.`;
      activationEvent.summary = summary;
      activationEvent.reroll = { index, previousFace, nextFace };
    } else if (control.ruleKey === "one-below-battle-bonus") {
      const resolution = this.state.activeResolution;
      const encounter = this.state.currentEncounter;
      if (!resolution?.roll || !encounter || resolution.roll.finalTotal !== resolution.roll.target - 1) throw new IntentRejectedError(intent.type, "The battle is no longer exactly one point short");
      const finalTotal = resolution.roll.finalTotal + 1;
      const successEffect = encounter.cardType === "enemy"
        ? encounter.defeatReward
        : this.getHazardOutcomeEffect(encounter, true);
      const effect = this.resolveThreatOutcomeEffect(intent.seatId, encounter, successEffect, encounter.successEffectKey, "onSuccess");
      this.state = { ...this.state, pendingEffect: effect, activeResolution: { ...resolution, roll: { ...resolution.roll, modifierTotal: resolution.roll.modifierTotal + 1, finalTotal, success: true }, outcome: { title: "Scar turned the battle", text: `${control.scarName} added +1.`, effects: [control.effectText] } } };
    } else if (control.ruleKey === "prevent-equipment-suppression") {
      const pending = this.state.pendingEquipmentSuppressionChoice;
      if (!pending) throw new IntentRejectedError(intent.type, "No Equipment suppression is pending");
      this.state = { ...this.state, pendingEquipmentSuppressionChoice: null, resolvedEquipmentSuppressionSourceEventIds: [...(this.state.resolvedEquipmentSuppressionSourceEventIds ?? []), pending.sourceEventId] };
    } else if (control.ruleKey === "ignore-blue-event") {
      this.state = { ...this.state, pendingEffect: null };
    } else if (control.ruleKey === "toxic-wound-immunity") {
      if (!this.state.pendingEffect) throw new IntentRejectedError(intent.type, "No toxic Wound is pending");
      this.state = { ...this.state, pendingEffect: this.reduceFirstWound(this.state.pendingEffect) };
    } else if (control.ruleKey === "prevent-grit-displacement") {
      const pending = this.state.pendingDisplacement;
      if (!pending) throw new IntentRejectedError(intent.type, "No displacement is pending");
      this.state = pending.distance <= 1
        ? { ...this.state, pendingDisplacement: null, resolvedDisplacementSourceEventIds: [...(this.state.resolvedDisplacementSourceEventIds ?? []), pending.sourceEventId] }
        : { ...this.state, pendingDisplacement: { ...pending, distance: 1 } };
    } else if (control.ruleKey === "forge-charge-restore") {
      this.state = { ...this.state, players: this.state.players.map((entry) => entry.seatId !== intent.seatId ? entry : ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((item) => {
        if (item.instanceId !== intent.targetId) return item;
        const maximum = item.maxCharges ?? item.charges ?? item.startingCharges ?? 0;
        const current = item.currentCharges ?? item.charges ?? item.startingCharges ?? 0;
        return { ...item, currentCharges: Math.min(maximum, current + 1), charges: Math.min(maximum, current + 1) };
      }) } })) };
    } else if (control.ruleKey === "choose-displacement-direction") {
      const choice = this.state.pendingForcedDestinationChoice;
      if (!choice || !intent.targetId) throw new IntentRejectedError(intent.type, "No displacement choice is pending");
      this.applyAction({ type: "FORCED_DESTINATION_SELECTED", seatId: intent.seatId, choiceId: choice.choiceId, destinationSectorId: intent.targetId, createdAt });
    } else if (control.ruleKey === "relay-blue-peek") {
      const nextId = this.peekGlobalThreatId("blue", intent.seatId);
      const card = nextId ? this.threats.get(nextId) : null;
      summary = card ? `Next Blue Threat: ${card.title}. The bag order was not changed.` : "The Blue Threat bag is empty.";
      activationEvent.summary = summary;
    } else if (control.ruleKey === "inspect-hidden-consequence") {
      const decision = this.state.pendingEncounterDecision;
      summary = decision ? `${decision.prompt} Available paths: ${decision.legalOptionIds.length}.` : "No hidden consequence is available.";
      activationEvent.summary = summary;
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      scarUsage: [...(this.state.scarUsage ?? []), { ...control.usage, sourceEventId: control.context.eventId, createdAt }],
      eventLog: [...this.state.eventLog, activationEvent]
    };
  }

  private intentToAction(intent: ClientIntent): GameAction {
    const createdAt = new Date().toISOString();

    switch (intent.type) {
      case "MOVE_REQUESTED":
        return {
          type: "MOVE_REQUESTED",
          seatId: intent.seatId,
          toSectorId: intent.toSectorId,
          voidKeyInstanceId: intent.voidKeyInstanceId,
          routeId: intent.routeId,
          movementRevision: intent.movementRevision,
          createdAt
        } satisfies MoveRequestedAction;
      case "TIER_TRANSITION_REQUESTED":
        throw new IntentRejectedError(
          intent.type,
          "Tier transitions must be resolved by the authoritative transition handler"
        );
      case "INNER_APPROACH_MOVE_REQUESTED":
        throw new IntentRejectedError(
          intent.type,
          "Inner approach movement must be resolved by the authoritative approach handler"
        );
      case "MOVEMENT_ROLL_REQUESTED":
        return {
          type: "MOVEMENT_ROLL_REQUESTED",
          seatId: intent.seatId,
          createdAt
        };
      case "ADJUST_MOVEMENT_REQUESTED":
        return { type: "ADJUST_MOVEMENT_REQUESTED", seatId: intent.seatId, instanceId: intent.instanceId, adjustment: intent.adjustment, createdAt };
      case "SELECT_ROUTE_STAR_VARIANT":
        return { type: "SELECT_ROUTE_STAR_VARIANT", seatId: intent.seatId, instanceId: intent.instanceId, destinationId: intent.destinationId, routeId: intent.routeId, movementRevision: intent.movementRevision, createdAt };
      case "ACTIVATE_GATE_SAINT": return { type: "ACTIVATE_GATE_SAINT", seatId: intent.seatId, instanceId: intent.instanceId, createdAt };
      case "USE_MARROW_DETOUR": return { type: "USE_MARROW_DETOUR", seatId: intent.seatId, instanceId: intent.instanceId, reactionId: intent.reactionId, toSectorId: intent.toSectorId, createdAt };
      case "PHASE_ADVANCED":
        return {
          type: "PHASE_ADVANCED",
          seatId: intent.seatId,
          toPhase: intent.toPhase,
          transitionCause: "end-turn",
          createdAt
        } satisfies PhaseAdvancedAction;
      case "CHECK_REQUESTED":
        return {
          type: "CHECK_REQUESTED",
          seatId: intent.seatId,
          stat: intent.stat,
          createdAt
        } satisfies CheckRequestedAction;
      case "PLAY_EDGE_CARD": {
        const definition = EDGE_CARD_BY_ID.get(intent.cardId);
        if (!definition) {
          throw new IntentRejectedError(intent.type, "Unknown Edge Card");
        }
        const displayName =
          this.state.seats.find((seat) => seat.seatId === intent.seatId)?.displayName ??
          this.state.players.find((player) => player.seatId === intent.seatId)?.character.name ??
          "An operative";
        return {
          type: "EDGE_CARD_PLAYED",
          seatId: intent.seatId,
          cardId: definition.id,
          cardName: definition.name,
          edgeValue: definition.edgeValue,
          mode: intent.mode,
          abilityKey: intent.mode === "ability" ? definition.abilityKey : undefined,
          targetId: intent.targetId,
          resolutionId: intent.resolutionId,
          publicSummary: intent.mode === "commit-value"
            ? `${displayName} burned ${definition.name}. ${definition.edgeValue} is locked as one die.`
            : `${displayName} activated ${definition.name}. ${definition.abilityText}${
                definition.tradeoffText ? ` ${definition.tradeoffText}` : ""
              }`,
          createdAt
        } satisfies EdgeCardPlayedAction;
      }
      case "DECLINE_EDGE_CARD_REACTION":
        throw new Error("Edge Card reactions are resolved directly");
      case "COMBAT_REQUESTED":
        return {
          type: "COMBAT_REQUESTED",
          seatId: intent.seatId,
          stat: intent.stat,
          createdAt
        } satisfies CombatRequestedAction;
      case "ENEMY_ROLL_REQUESTED":
        return {
          type: "ENEMY_ROLL_REQUESTED",
          seatId: intent.seatId,
          createdAt
        } satisfies EnemyRollRequestedAction;
      case "SOLO_REROLL_REQUESTED":
        return this.createSoloRerollAction(intent, createdAt);
      case "CONTINUE_RESOLUTION":
        return {
          type: "CONTINUE_RESOLUTION",
          seatId: intent.seatId,
          createdAt
        } satisfies ResolutionContinuedAction;
      case "CONTINUE_SCAR_CONSEQUENCE":
        return {
          type: "CONTINUE_SCAR_CONSEQUENCE",
          seatId: intent.seatId,
          reactionId: intent.reactionId,
          createdAt
        };
      case "ENCOUNTER_DECISION_REQUESTED":
        return { type: "ENCOUNTER_DECISION_RESOLVED", seatId: intent.seatId, decisionId: intent.decisionId, decisionVersion: intent.decisionVersion, optionId: intent.optionId, createdAt };
      case "MEMORY_TAX_CHOICE_REQUESTED":
        return { type: "MEMORY_TAX_CHOICE_RESOLVED", seatId: intent.seatId, choiceId: intent.choiceId, choiceVersion: intent.choiceVersion, optionId: intent.optionId, createdAt };
      case "FORCED_DESTINATION_SELECTED":
        return { type: "FORCED_DESTINATION_SELECTED", seatId: intent.seatId, choiceId: intent.choiceId, destinationSectorId: intent.destinationSectorId, createdAt };
      case "FORCED_DISPLACEMENT_ACCEPTED":
        return { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: intent.seatId, reactionId: intent.reactionId, createdAt };
      case "CHOOSE_SCAR":
        return { type: "CHOOSE_SCAR", seatId: intent.seatId, selectionId: intent.selectionId, scarId: intent.scarId, createdAt };
      case "PURGE_SCAR_REQUESTED": {
        const pending = this.state.pendingScarRemovalChoice;
        if (!pending || pending.ownerSeatId !== intent.seatId || pending.choiceId !== intent.choiceId) throw new Error("Scar purification choice is stale");
        return { type: "SCAR_REMOVED", seatId: intent.seatId, choiceId: intent.choiceId, visitId: pending.visitId, scarId: intent.scarId, salvageCost: 4, createdAt };
      }
      case "SET_READY":
        throw new Error("Ready state is handled directly");
      case "SELECT_STARTING_CONTRACT":
        throw new Error("Starting Contract selection is handled directly");
      case "SELECT_STARTING_BONUS":
        throw new Error("Starting bonus selection is handled directly");
      case "RECRUIT_REPLACEMENT":
        {
          const replacement = this.characters.get(intent.replacementCharacterId);
          if (!replacement) throw new Error("Unknown replacement operative");
          const eligibility = this.getCharacterEligibility(intent.seatId, replacement);
          if (!eligibility.allowed) throw new Error(eligibility.reason ?? "This operative is not available");
        return {
          type: "RECRUIT_REPLACEMENT",
          seatId: intent.seatId,
          replacementCharacterId: intent.replacementCharacterId,
          replacementCharacter: replacement,
          createdAt
        };
        }
      case "EQUIP_GEAR":
        return {
          type: "EQUIP_GEAR",
          seatId: intent.seatId,
          gearId: intent.gearId,
          instanceId: intent.instanceId,
          slot: intent.slot,
          createdAt
        } satisfies EquipGearAction;
      case "RESOLVE_GEAR_EQUIP_CHOICE":
        return {
          type: "RESOLVE_GEAR_EQUIP_CHOICE",
          seatId: intent.seatId,
          choiceId: intent.choiceId,
          itemInstanceId: intent.itemInstanceId,
          decision: intent.decision,
          createdAt
        };
      case "SELECT_EQUIPMENT_SUPPRESSION_TARGET":
        return { type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET", seatId: intent.seatId, choiceId: intent.choiceId, itemInstanceId: intent.itemInstanceId, createdAt };
      case "UNEQUIP_GEAR":
        return {
          type: "UNEQUIP_GEAR",
          seatId: intent.seatId,
          slot: intent.slot,
          createdAt
        } satisfies UnequipGearAction;
      case "USE_GEAR":
        return this.createGearUseAction(intent.seatId, intent.gearId, createdAt, intent.instanceId, intent.pendingTileChallengeId, intent.staticIntercessionReactionId, intent.pendingTileChallengeEffectId, intent.scarConsequenceReactionId, intent.scarInstanceId, intent.pendingScarEffectId, intent.contractSignature, intent.forcedDisplacementReactionId, intent.forcedDisplacementSourceEventId);
      case "USE_FOLLOWER":
        return this.createFollowerUseAction(intent.seatId, intent.followerId, createdAt, intent.escalate === true);
      case "TABLE_INTERACTION":
        return this.createTableInteractionAction(intent, createdAt);
      case "SHOP_SERVICE_REQUESTED":
        return this.createShopServiceAction(intent, createdAt);
      case "SHOP_BROWSE_SELECTED":
        throw new Error("Shop browse selection is handled directly");
      case "SHOP_PURCHASE_REQUESTED":
        return this.createShopPurchaseAction(intent, createdAt);
      case "SHOP_SELL_REQUESTED":
        return this.createShopSellAction(intent, createdAt);
      case "SHOP_SKIP_REQUESTED":
        return this.createShopSkipAction(intent, createdAt);
      case "ACCEPT_CONTRACT":
        return {
          type: "ACCEPT_CONTRACT",
          seatId: intent.seatId,
          contractId: intent.contractId,
          contract: this.resolveContract(this.contracts.get(intent.contractId)),
          createdAt
        } satisfies AcceptContractAction;
      case "COMPLETE_CONTRACT":
        return {
          type: "COMPLETE_CONTRACT",
          seatId: intent.seatId,
          contractId: intent.contractId,
          contract: this.resolveContract(this.contracts.get(intent.contractId)),
          createdAt
        } satisfies CompleteContractAction;
      case "SCENARIO_CONFRONTATION_REQUESTED":
        return {
          type: "SCENARIO_CONFRONTATION_REQUESTED",
          seatId: intent.seatId,
          createdAt
        } satisfies ScenarioConfrontationRequestedAction;
      case "RIVALRY_AGENDA_REVEAL_REQUESTED":
        return this.createRivalryAgendaRevealAction(intent, createdAt);
      case "RESOLVE_SPACE_TEXT":
        throw new Error("Space text resolution is handled directly");
      case "STABILIZE_REQUESTED":
        throw new Error("Stabilize requests are resolved directly");
      case "RAISE_STAT_REQUESTED":
        throw new Error("Stat raise requests are resolved directly");
      default: {
        const runtimeIntent = intent as { type?: unknown };
        const actionType = typeof runtimeIntent.type === "string" ? runtimeIntent.type : "UNKNOWN";
        throw new IntentRejectedError(actionType, "Unknown client intent");
      }
    }
  }

  private applyAction(action: GameAction): void {
    this.executionServices.onActionAttempt?.(action, this.state);
    const previousState = this.state;
    const previousWoundsBySeat = new Map(
      previousState.players.map((player) => [player.seatId, player.character.wounds])
    );
    const previousHeldGearCount = this.getHeldGearCount(action.seatId, previousState);
    const result = reduceGameState(this.state, action);

    if (!result.ok) {
      throw new IntentRejectedError(result.rejection.actionType, result.rejection.reason);
    }

    this.state = result.state;
    this.events.push(action, ...result.emitted);
    this.applyAutomaticScarRules(action, previousState);

    const gainedGearCount = this.getHeldGearCount(action.seatId, this.state) - previousHeldGearCount;

    if (previousState.status === "active") {
      for (const player of this.state.players) {
        const woundDelta = player.character.wounds - (previousWoundsBySeat.get(player.seatId) ?? player.character.wounds);
        if (woundDelta <= 0) continue;
        this.feedEscalation(
          player.seatId,
          woundDelta * ESCALATION_FEEDERS.woundTaken,
          "wounds taken"
        );
        this.applyScenarioOnWoundsTaken(player.seatId, woundDelta);
      }
    }

    if (previousState.status === "active" && gainedGearCount > 0) {
      this.applyScenarioOnGearGained(action.seatId, gainedGearCount);
    }
    this.reconcileNamedPlayerRules();
  }

  private applyAutomaticScarRules(action: GameAction, previousState: GameState): void {
    const player = this.state.players.find((entry) => entry.seatId === action.seatId);
    if (!player || player.character.scars.length === 0) return;
    const encounter = previousState.currentEncounter ?? this.state.currentEncounter;
    const sector = getBoardSpace(player.character.currentSpaceId);
    const eventId = `${action.type}:${action.seatId}:${action.createdAt}`;
    const apply = (context: Parameters<typeof evaluateOwnedScarRules>[3], includeAdaptations = true): void => {
      const burdens = evaluateOwnedScarRules(this.state, player, "burden", context);
      const adaptations = includeAdaptations
        ? evaluateOwnedScarRules(this.state, player, "adaptation", context).filter((entry) => getScarCard(entry.scarId)?.adaptation.optional === false)
        : [];
      const matches = [...burdens, ...adaptations];
      const usage = matches.flatMap((entry) => entry.usage ? [entry.usage] : []);
      let nextState = usage.length > 0 ? { ...this.state, scarUsage: [...(this.state.scarUsage ?? []), ...usage] } : this.state;
      for (const match of matches) {
        if (match.outcome.effect) nextState = applyEffectToState(nextState, action.seatId, match.outcome.effect);
      }
      if (matches.length > 0) {
        nextState = {
          ...nextState,
          eventLog: [...nextState.eventLog, ...matches.map((match) => ({
            type: "SCAR_RULE_APPLIED",
            seatId: action.seatId,
            scarId: match.scarId,
            sourceEventId: eventId,
            summary: match.outcome.summary,
            createdAt: action.createdAt
          }))]
        };
      }
      this.state = nextState;
    };

    if (action.type === "CHECK_ROLLED" || action.type === "SOLO_REROLL_RESOLVED") {
      const challengeKind = previousState.pendingTileChallenge?.challengeType;
      apply({
        eventId,
        timing: "afterTest",
        stat: action.stat,
        mode: "check",
        encounterKind: challengeKind === "anomaly" ? "anomaly" : "hazard",
        naturalRoll: action.roll.faces.includes(1) ? 1 : undefined,
        success: action.success,
        sectorTags: sector?.tags ?? []
      });
      return;
    }

    if (action.type === "COMBAT_RESOLVED") {
      apply({
        eventId,
        timing: "onBattleResolved",
        stat: action.stat,
        mode: "battle",
        encounterKind: "enemy",
        enemyFamily: encounter?.enemyFamily,
        elite: encounter?.severity === 5,
        boss: false,
        success: action.success,
        margin: action.total - action.enemyTotal,
        wounds: player.character.wounds,
        battleAwardedSalvage: JSON.stringify(action.effect).includes("gain_salvage")
      });
      const trophyRules = action.success
        ? evaluateOwnedScarRules(this.state, player, "burden", { eventId: `${eventId}:trophy`, timing: "onTrophyGained", mode: "battle", encounterKind: "enemy", success: true })
          .filter((entry) => entry.outcome.modifier === -1)
        : [];
      if (trophyRules.length > 0) {
        const latestIndex = (player.character.trophyPile ?? []).length - 1;
        this.state = {
          ...this.state,
          scarUsage: [...(this.state.scarUsage ?? []), ...trophyRules.flatMap((entry) => entry.usage ? [entry.usage] : [])],
          players: this.state.players.map((entry) => entry.seatId !== action.seatId ? entry : {
            ...entry,
            character: {
              ...entry.character,
              trophies: Math.max(0, entry.character.trophies - 1),
              trophyPile: (entry.character.trophyPile ?? []).map((trophy, index) => index === latestIndex
                ? { ...trophy, spentValue: Math.min(trophy.trophyValue, (trophy.spentValue ?? 0) + 1) }
                : trophy)
            }
          })
        };
      }
      return;
    }

    if (action.type === "MOVED") {
      const from = getBoardSpace(action.fromSectorId);
      const to = getBoardSpace(action.toSectorId);
      apply({ eventId, timing: "afterArrival", mode: "movement", sectorTags: [to?.tier ?? "", ...(to?.tags ?? [])] });
      if (from && to && from.tier !== to.tier) {
        const gateRules = evaluateOwnedScarRules(this.state, player, "burden", { eventId: `${eventId}:gate`, timing: "beforeTransition", mode: "movement", encounterKind: "gate" });
        if (gateRules.length > 0) {
          const costEffect = (player.character.salvage ?? 0) > 0 ? { type: "lose_salvage" as const, amount: 1 } : { type: "take_wound" as const, amount: 1 };
          this.state = applyEffectToState({ ...this.state, scarUsage: [...(this.state.scarUsage ?? []), ...gateRules.flatMap((entry) => entry.usage ? [entry.usage] : [])] }, action.seatId, costEffect);
        }
      }
      return;
    }

    if (action.type === "ESCALATION_ADVANCED") {
      apply({ eventId, timing: "onEscalationAdvanced", mode: "event", encounterKind: "escalation" }, false);
      return;
    }

    if (action.type === "COMPLETE_CONTRACT") {
      apply({ eventId, timing: "onContractResolved", mode: "event", success: true });
      return;
    }

    if (action.type === "SHOP_SERVICE_RESOLVED" && (action.cost.salvage ?? 0) > 0 && action.serviceId !== "purge-scar") {
      const serviceRules = evaluateOwnedScarRules(this.state, player, "burden", scarServiceContext(this.state, player, action.serviceId))
        .filter((entry) => (entry.outcome.serviceSurcharge ?? 0) > 0);
      if (serviceRules.length > 0) {
        this.state = {
          ...this.state,
          scarUsage: [...(this.state.scarUsage ?? []), ...serviceRules.flatMap((entry) => entry.usage ? [entry.usage] : [])],
          eventLog: [...this.state.eventLog, ...serviceRules.map((entry) => ({
            type: "SCAR_RULE_APPLIED",
            seatId: action.seatId,
            scarId: entry.scarId,
            sourceEventId: scarServiceContext(this.state, player, action.serviceId).eventId,
            summary: entry.outcome.summary,
            createdAt: action.createdAt
          }))]
        };
      }
      return;
    }

    if (action.type === "ADJUST_MOVEMENT_REQUESTED") {
      apply({ eventId, timing: "beforeMovementReroll", mode: "movement" }, false);
      return;
    }

    if (action.type === "USE_GEAR" && previousState.currentEncounter?.cardType === "enemy") {
      const exhaustRules = evaluateOwnedScarRules(this.state, player, "burden", { eventId, timing: "onEquipmentUsed", mode: "battle", encounterKind: "enemy" });
      if (exhaustRules.length > 0) {
        this.state = {
          ...this.state,
          scarUsage: [...(this.state.scarUsage ?? []), ...exhaustRules.flatMap((entry) => entry.usage ? [entry.usage] : [])],
          players: this.state.players.map((entry) => entry.seatId !== action.seatId ? entry : {
            ...entry,
            character: { ...entry.character, heldGear: entry.character.heldGear.map((gear) => gear.instanceId === action.instanceId || gear.id === action.gearId ? { ...gear, exhausted: true } : gear) }
          })
        };
      }
      return;
    }

    if (action.type === "RESOLUTION_APPLIED" && this.state.pendingDisplacement && !previousState.pendingDisplacement) {
      const displacementRules = evaluateOwnedScarRules(this.state, player, "burden", { eventId, timing: "beforeDisplacement", mode: "movement" });
      const extra = displacementRules.reduce((sum, entry) => sum + (entry.outcome.displacementDistanceModifier ?? 0), 0);
      const displacement = this.state.pendingDisplacement;
      const secondDestination = displacement && extra > 0
        ? getRingTrackNeighbor(displacement.destinationSectorId, displacement.direction === "clockwise" ? 1 : -1)
        : null;
      const secondStepBlocked = displacement && secondDestination
        ? getMovementStepBlockReason(this.state, player, displacement.destinationSectorId, secondDestination)
        : "No legal second displacement step";
      if (extra > 0 && displacement && secondDestination && !secondStepBlocked) {
        this.state = {
          ...this.state,
          scarUsage: [...(this.state.scarUsage ?? []), ...displacementRules.flatMap((entry) => entry.usage ? [entry.usage] : [])],
          pendingDisplacement: { ...displacement, destinationSectorId: secondDestination, distance: 2 }
        };
      }
    }
  }

  private getRemainingSeatIds(): string[] {
    return this.state.seats.filter((seat) => !seat.kicked && seat.displayName).map((seat) => seat.seatId);
  }

  private getConnectedRestartSeatIds(): string[] {
    return this.state.seats.filter((seat) => !seat.kicked && seat.connected && seat.displayName).map((seat) => seat.seatId);
  }

  private getStartingSectorId(seatId: string): string {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);
    const characterId = seat?.characterId;
    const character = characterId ? this.characters.get(characterId) : null;

    if (character && this.state.sectors.some((sector) => sector.id === character.currentSpaceId)) {
      return character.currentSpaceId;
    }

    return this.state.sectors[0]?.id ?? "ashwake-crossing";
  }

  private resolveStartingContractOptions(character: AuthoredCharacter, seatIndex: number): string[] {
    const availableIds = this.state.availableContracts
      .map((contract) => contract.id)
      .filter((contractId) => this.contracts.has(contractId));
    const options: string[] = [];
    const preferredContractId = character.activeContract?.contractId ?? character.startingContract ?? null;

    if (preferredContractId && availableIds.includes(preferredContractId)) {
      options.push(preferredContractId);
    }

    const rankedIds = availableIds
      .filter((contractId) => !options.includes(contractId))
      .sort(
        (left, right) =>
          stableSetupHash(`${this.state.sessionId}:${character.id}:${seatIndex}:${left}`) -
          stableSetupHash(`${this.state.sessionId}:${character.id}:${seatIndex}:${right}`)
      );

    for (const contractId of rankedIds) {
      if (options.length >= STARTING_CONTRACT_OPTION_COUNT) {
        break;
      }

      options.push(contractId);
    }

    return options;
  }

  private queueReplacementMissionSelection(seatId: string, completedContractId: string): void {
    const contract = this.state.availableContracts.find((entry) => entry.id === completedContractId);
    this.queueMissionReward({
      ownerSeatId: seatId,
      sourceKind: "completion",
      sourceId: completedContractId,
      sourceTitle: contract?.name ?? "Completed Contract",
      completedContractId
    });
  }

  private queueMissionReward({
    ownerSeatId,
    sourceKind,
    sourceId,
    sourceTitle,
    completedContractId
  }: {
    ownerSeatId: string;
    sourceKind: "completion" | "tile" | "battle";
    sourceId: string;
    sourceTitle: string;
    completedContractId?: string;
  }): void {
    const rewardId = `mission-reward:${sourceKind}:${ownerSeatId}:${sourceId}:${this.state.sequence + 1}`;
    const createdAt = new Date().toISOString();
    const duplicate = (this.state.pendingMissionRewards ?? []).some((reward) =>
      reward.ownerSeatId === ownerSeatId &&
      reward.sourceKind === sourceKind &&
      reward.sourceId === sourceId
    );
    const selectionDuplicate =
      this.state.pendingMissionSelection?.ownerSeatId === ownerSeatId &&
      this.state.pendingMissionSelection.sourceKind === sourceKind &&
      this.state.pendingMissionSelection.sourceId === sourceId;
    if (duplicate || selectionDuplicate) return;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      pendingMissionRewards: [
        ...(this.state.pendingMissionRewards ?? []),
        {
          id: rewardId,
          ownerSeatId,
          sourceKind,
          sourceId,
          sourceTitle,
          createdAt
        }
      ],
      eventLog: [
        ...this.state.eventLog,
        {
          type: "MISSION_REWARD_QUEUED",
          seatId: ownerSeatId,
          rewardId,
          sourceKind,
          sourceId,
          sourceTitle,
          completedContractId,
          createdAt
        }
      ]
    };
    if (
      sourceKind === "completion" ||
      (
        !this.state.pendingEffect &&
        !this.state.currentEncounter &&
        !this.state.activeResolution &&
        !this.state.pendingEnemyRoll &&
        this.state.phase !== "resolution"
      )
    ) {
      this.prepareNextMissionSelection(ownerSeatId, completedContractId);
    }
  }

  private prepareNextMissionSelection(preferredSeatId?: string, completedContractId?: string): void {
    if (this.state.pendingMissionSelection) return;
    const pendingRewards = this.state.pendingMissionRewards ?? [];
    const reward = [
      ...pendingRewards.filter((entry) => entry.ownerSeatId === preferredSeatId),
      ...pendingRewards.filter((entry) => entry.ownerSeatId !== preferredSeatId)
    ].find((entry) => {
      const player = this.state.players.find((playerEntry) => playerEntry.seatId === entry.ownerSeatId);
      return player && getActiveMissions(player.character).length < MAX_ACTIVE_MISSIONS;
    });
    if (!reward) return;

    const unavailable = new Set(this.state.players.flatMap((entry) => [
      ...(entry.character.completedContracts ?? []),
      ...(entry.character.completedMissionRecords ?? []).map((record) => record.missionId),
      ...getActiveMissions(entry.character).map((mission) => mission.contractId)
    ]));
    const optionIds = this.state.availableContracts
      .map((contract) => contract.id)
      .filter((contractId) => !unavailable.has(contractId))
      .sort((left, right) =>
        stableSetupHash(`${this.state.sessionId}:${reward.ownerSeatId}:${reward.id}:${left}`) -
        stableSetupHash(`${this.state.sessionId}:${reward.ownerSeatId}:${reward.id}:${right}`)
      )
      .slice(0, 3);
    const createdAt = new Date().toISOString();
    const selectionId = `mission:${reward.ownerSeatId}:${reward.sourceId}:${this.state.sequence + 1}`;
    const remainingRewards = pendingRewards.filter((entry) => entry.id !== reward.id);
    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      pendingMissionRewards: optionIds.length > 0 ? remainingRewards : pendingRewards.filter((entry) => entry.id !== reward.id),
      pendingMissionSelection: optionIds.length > 0 ? {
        id: selectionId,
        ownerSeatId: reward.ownerSeatId,
        ...(completedContractId || reward.sourceKind === "completion"
          ? { completedContractId: completedContractId ?? reward.sourceId }
          : {}),
        sourceKind: reward.sourceKind,
        sourceId: reward.sourceId,
        sourceTitle: reward.sourceTitle,
        optionIds,
        status: "queued",
        continuationPhase: "broadcast",
        createdAt
      } : null,
      eventLog: [...this.state.eventLog, {
        type: optionIds.length > 0 ? "REPLACEMENT_MISSION_OFFERED" : "REPLACEMENT_MISSION_UNAVAILABLE",
        seatId: reward.ownerSeatId,
        selectionId,
        completedContractId: completedContractId ?? (reward.sourceKind === "completion" ? reward.sourceId : undefined),
        sourceKind: reward.sourceKind,
        sourceId: reward.sourceId,
        sourceTitle: reward.sourceTitle,
        optionIds,
        createdAt
      }]
    };
  }

  private activateQueuedReplacementMissionSelection(seatId: string): void {
    const pending = this.state.pendingMissionSelection;
    if (!pending || pending.ownerSeatId !== seatId || pending.status !== "queued") return;
    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      pendingMissionSelection: { ...pending, status: "awaitingSelection" }
    };
  }

  private selectReplacementContract(intent: Extract<ClientIntent, { type: "SELECT_REPLACEMENT_CONTRACT" }>): void {
    const pending = this.state.pendingMissionSelection;
    if (!pending || pending.id !== intent.selectionId || pending.status !== "awaitingSelection") {
      throw new IntentRejectedError(intent.type, "Replacement mission selection is stale");
    }
    if (pending.ownerSeatId !== intent.seatId) throw new IntentRejectedError(intent.type, "Only the Contract owner may select a replacement");
    if (!pending.optionIds.includes(intent.contractId)) throw new IntentRejectedError(intent.type, "Contract was not offered");
    const contract = this.state.availableContracts.find((entry) => entry.id === intent.contractId);
    if (!contract) throw new IntentRejectedError(intent.type, "Contract is unavailable");
    const owner = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!owner || getActiveMissions(owner.character).length >= MAX_ACTIVE_MISSIONS) {
      throw new IntentRejectedError(intent.type, `The ${MAX_ACTIVE_MISSIONS}-Contract limit is already full`);
    }
    const claimed = this.state.players.some((entry) =>
      getActiveMissions(entry.character).some((mission) => mission.contractId === intent.contractId)
    );
    if (claimed) throw new IntentRejectedError(intent.type, "Mission is already active");
    const createdAt = new Date().toISOString();
    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: pending.continuationPhase,
      pendingMissionSelection: null,
      players: this.state.players.map((entry) => entry.seatId === intent.seatId ? {
        ...entry,
        character: addActiveMission(entry.character, { contractId: contract.id, progress: 0 })
      } : entry),
      eventLog: [...this.state.eventLog, {
        type: "REPLACEMENT_MISSION_SELECTED",
        seatId: intent.seatId,
        selectionId: pending.id,
        contractId: contract.id,
        createdAt
      }]
    };
    this.maybeTriggerAbilityOnContractAccepted(intent.seatId, contract.id);
    this.prepareNextMissionSelection(intent.seatId);
  }

  private openMissionRelicExchange(
    intent: Extract<ClientIntent, { type: "OPEN_MISSION_RELIC_EXCHANGE" }>
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player) throw new IntentRejectedError(intent.type, "Contract owner is unavailable");
    const options = this.pickRelicDealerArtifactOptions(player).slice(0, MISSION_RELIC_OPTION_COUNT);
    if (options.length !== MISSION_RELIC_OPTION_COUNT) {
      throw new IntentRejectedError(intent.type, "Two distinct Relics are not currently available");
    }

    this.applyAction({
      type: "MISSION_RELIC_EXCHANGE_OPENED",
      seatId: intent.seatId,
      exchangeId: `mission-relic:${intent.seatId}:${this.state.sequence + 1}`,
      selectedMissionIds: [...intent.missionIds],
      options,
      createdAt: new Date().toISOString()
    } satisfies MissionRelicExchangeOpenedAction);
  }

  private claimMissionRelic(
    intent: Extract<ClientIntent, { type: "CLAIM_MISSION_RELIC" }>
  ): void {
    const exchange = this.state.pendingMissionRelicExchange;
    if (
      !exchange ||
      exchange.id !== intent.exchangeId ||
      exchange.ownerSeatId !== intent.seatId ||
      !exchange.optionIds.includes(intent.artifactId)
    ) {
      throw new IntentRejectedError(intent.type, "Relic exchange offer is stale");
    }
    const artifact = this.gear.get(intent.artifactId);
    if (!artifact || artifact.tier !== "artifact") {
      throw new IntentRejectedError(intent.type, "Selected Relic is unavailable");
    }

    this.applyAction({
      type: "MISSION_RELIC_CLAIMED",
      seatId: intent.seatId,
      exchangeId: exchange.id,
      artifactId: artifact.id,
      artifact,
      createdAt: new Date().toISOString()
    } satisfies MissionRelicClaimedAction);
  }

  private applySelectedStartingContracts(): PlayerState[] {
    return this.state.players.map((player) => {
      const seat = this.state.seats.find((entry) => entry.seatId === player.seatId);

      if (!seat?.displayName || seat.kicked || !seat.selectedStartingContractId) {
        return player;
      }

      return {
        ...player,
        character: {
          ...player.character,
          activeContract: {
            contractId: seat.selectedStartingContractId,
            progress: 0
          },
          activeContracts: [{
            contractId: seat.selectedStartingContractId,
            progress: 0
          }]
        }
      };
    });
  }

  private createFreshCharacter(characterId: string, currentSpaceId: string): Character {
    const template = this.characters.get(characterId);

    if (!template) {
      throw new Error(`Unknown character ${characterId}`);
    }
    const loadedCharacter = applyStartingLoadout(template, {
      sessionMode: this.state.sessionMode,
      seatIndex: Math.max(0, this.state.seats.findIndex((seat) => seat.characterId === characterId)),
      catalogs: {
        contracts: this.state.availableContracts,
        gear: this.gear,
        followers: this.followers
      },
      assignStartingContract: false
    });

    return {
      ...loadedCharacter,
      currentSpaceId,
      trophies: 0,
      trophyPile: [],
      wounds: 0,
      status: "active",
      activeContract: null,
      activeContracts: [],
      heldGear: [...loadedCharacter.heldGear],
      equippedGear: { ...loadedCharacter.equippedGear },
      followers: [...(loadedCharacter.followers ?? [])],
      abilities: [...loadedCharacter.abilities],
      scars: [...loadedCharacter.scars]
    };
  }

  private getScenarioCounter(key: string, fallback = 0): number {
    return this.state.scenarioProgress[key] ?? fallback;
  }

  private drawThreatIdWithSoftExile(deck: string[]): string | null {
    if (deck.length === 0) {
      return null;
    }

    const recentIds = new Set(this.state.recentEncounterCardIds ?? []);
    const cooledPool = deck.filter((cardId) => !recentIds.has(cardId));
    const pool = cooledPool.length > 0 ? cooledPool : deck;

    return pool[this.randomSource.nextInt(pool.length)] ?? null;
  }

  private drawThreatIdWithSoftExileForLane(deck: string[], lane: ThreatIcon): string | null {
    return this.drawThreatIdWithSoftExile(
      deck.filter((cardId) => this.threats.get(cardId)?.threatLane === lane)
    );
  }

  private shuffleThreatIds(cardIds: string[]): string[] {
    const shuffled = [...cardIds];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.randomSource.nextInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    }
    return shuffled;
  }

  private initializeEdgeDeck(authorSeatId: string): void {
    const orderedCardIds = this.shuffleThreatIds(EDGE_CARD_DECK.map((card) => card.id));
    this.applyAction({
      type: "EDGE_DECK_INITIALIZED",
      seatId: authorSeatId,
      orderedCardIds,
      createdAt: new Date().toISOString()
    } satisfies EdgeDeckInitializedAction);
  }

  private reshuffleEdgeDiscard(authorSeatId: string): void {
    const edgeDeck = this.state.edgeDeck;
    if (!edgeDeck || edgeDeck.remainingCardIds.length > 0 || edgeDeck.discardCardIds.length === 0) {
      return;
    }
    this.applyAction({
      type: "EDGE_DECK_SHUFFLED",
      seatId: authorSeatId,
      cycle: edgeDeck.cycle + 1,
      orderedCardIds: this.shuffleThreatIds(edgeDeck.discardCardIds),
      createdAt: new Date().toISOString()
    } satisfies EdgeDeckShuffledAction);
  }

  private awardRandomEdgeCard(
    seatId: string,
    source: EdgeCardAwardedAction["source"],
    sourceId?: string
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player || !this.state.edgeDeck) return;

    const handCount = player.private.hand.filter((cardId) => EDGE_CARD_BY_ID.has(cardId)).length;
    const handLimit = getEdgeHandLimit({
      completedContracts: player.character.completedContracts?.length ?? 0,
      ownedArtifacts: player.character.heldGear.filter((item) => item.tier === "artifact").length
    });
    if (handCount >= handLimit) return;

    this.reshuffleEdgeDiscard(seatId);
    const cardId = this.state.edgeDeck?.remainingCardIds[0];
    if (!cardId) return;

    this.applyAction({
      type: "EDGE_CARD_AWARDED",
      seatId,
      cardId,
      source,
      sourceId,
      createdAt: new Date().toISOString()
    } satisfies EdgeCardAwardedAction);
  }

  private getPendingEdgeReactionResult(
    reactionId: string
  ): CheckRolledAction | CombatResolvedAction {
    const opened = [...this.state.eventLog].reverse().find((entry) => {
      const candidate = entry as Partial<EdgeCardReactionOpenedAction>;
      return candidate.type === "EDGE_CARD_REACTION_OPENED" && candidate.reactionId === reactionId;
    }) as EdgeCardReactionOpenedAction | undefined;
    if (!opened?.pendingResult) {
      throw new Error("The authoritative Edge reaction result is unavailable");
    }
    return opened.pendingResult;
  }

  private removeSelectedNonWoundFailureEffect(
    effect: EncounterEffect,
    targetPath: string,
    path = "root"
  ): EncounterEffect | null {
    if (path === targetPath) {
      return ["take_wound", "gain_note", "sequence"].includes(effect.type) ? effect : null;
    }
    if (effect.type !== "sequence") return effect;
    const effects = effect.effects.flatMap((entry, index) => {
      const childPath = path === "root" ? String(index) : `${path}.${index}`;
      const next = this.removeSelectedNonWoundFailureEffect(entry, targetPath, childPath);
      return next ? [next] : [];
    });
    return effects.length > 0 ? { ...effect, effects } : null;
  }

  private stripBattleRewardsForCinderline(effect: EncounterEffect): EncounterEffect {
    const rewardTypes = new Set([
      "gain_trophy",
      "gain_salvage",
      "gain_gear",
      "draw_artifact",
      "gain_follower",
      "heal_wound"
    ]);
    if (effect.type !== "sequence") {
      return rewardTypes.has(effect.type)
        ? { type: "gain_note", text: "Cinderline Break forfeited the battle reward." }
        : effect;
    }
    return {
      ...effect,
      effects: [
        ...effect.effects.filter((entry) => !rewardTypes.has(entry.type)),
        { type: "gain_note", text: "Cinderline Break forfeited every battle reward." }
      ]
    };
  }

  private applyAfflictionCombatWoundPrevention(
    seatId: string,
    stat: CombatResolvedAction["stat"],
    success: boolean,
    effect: EncounterEffect
  ): EncounterEffect {
    if (success) return effect;
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player) return effect;
    const faceupAfflictionIds = new Set(
      (player.faceupAfflictions ?? []).map((affliction) => affliction.cardId)
    );
    const hasMatchingPreventionAffliction =
      (stat === "command" && faceupAfflictionIds.has("iron-nerve")) ||
      (stat === "grit" && faceupAfflictionIds.has("metal-hide"));
    if (!hasMatchingPreventionAffliction) return effect;
    const roll = this.randomSource.nextInt(6) + 1;
    const prevention = getAfflictionWoundPrevention(
      player,
      stat,
      roll,
      getAfflictionCatalog(this.state)
    );
    return prevention.prevented > 0
      ? this.makeEffectSequence([
          preventWoundInEffect(effect, prevention.prevented),
          {
            type: "gain_note",
            text: `${prevention.source} reaction rolled ${roll}: prevented ${prevention.prevented} wound.`
          }
        ])
      : effect;
  }

  private rebuildThreatResultWithFaces(
    pendingResult: CheckRolledAction | CombatResolvedAction,
    faces: [number, number]
  ): CheckRolledAction | CombatResolvedAction {
    const encounter = this.state.currentEncounter;
    if (!encounter || encounter.id !== pendingResult.cardId) {
      throw new Error("The encounter changed before the Edge ability resolved");
    }
    const roll = { faces, total: faces[0] + faces[1] };
    const total = roll.total + pendingResult.statBonus;
    const target = pendingResult.type === "COMBAT_RESOLVED"
      ? pendingResult.enemyTotal
      : pendingResult.difficulty;
    const success = total >= target;
    if (success === pendingResult.success) {
      return {
        ...pendingResult,
        roll,
        total,
        createdAt: new Date().toISOString()
      };
    }
    const keyedModifiers = this.resolveThreatEffectKeys(
      pendingResult.seatId,
      encounter,
      encounter.combatEffectKeys,
      "beforeCombat"
    );
    const authoredEffect =
      encounter.cardType === "enemy"
        ? success
          ? encounter.defeatReward
          : encounter.woundOnLoss
        : this.getHazardOutcomeEffect(encounter, success);
    const baseEffect = this.combineEffects(
      [keyedModifiers.effect, authoredEffect].filter(
        (entry): entry is EncounterEffect => Boolean(entry)
      )
    ) ?? authoredEffect ?? { type: "sequence", effects: [] };
    const resolvedEffect = this.resolveThreatOutcomeEffect(
      pendingResult.seatId,
      encounter,
      baseEffect,
      success
        ? encounter.cardType === "enemy"
          ? encounter.defeatEffectKey
          : encounter.successEffectKey
        : encounter.failEffectKey,
      success ? (encounter.cardType === "enemy" ? "onDefeat" : "onSuccess") : "onFailure"
    );
    const afflictionProtectedEffect =
      pendingResult.type === "COMBAT_RESOLVED"
        ? this.applyAfflictionCombatWoundPrevention(
            pendingResult.seatId,
            pendingResult.stat,
            success,
            resolvedEffect
          )
        : resolvedEffect;
    const effect = this.maybeApplyKerWoundPrevention(
      pendingResult.seatId,
      this.maybeApplyFandiablosWoundPrevention(
        pendingResult.seatId,
        afflictionProtectedEffect
      )
    );
    return {
      ...pendingResult,
      roll,
      total,
      success,
      effect: effect ?? (pendingResult.type === "COMBAT_RESOLVED"
        ? { type: "sequence", effects: [] }
        : null),
      createdAt: new Date().toISOString()
    } as CheckRolledAction | CombatResolvedAction;
  }

  private finishPendingEdgeResult(
    result: CheckRolledAction | CombatResolvedAction
  ): void {
    if (this.maybeOpenAfflictionRollReaction(result.seatId, result)) return;
    if (result.type === "COMBAT_RESOLVED") {
      this.finishResolvedCombat(result);
    } else {
      this.finishResolvedCheck(result);
    }
  }

  private getPostRollEdgeCardIds(
    seatId: string,
    result: CheckRolledAction | CombatResolvedAction
  ): string[] {
    const encounter = this.state.currentEncounter;
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const resolutionId = this.state.activeResolution?.id;
    if (
      !encounter ||
      !player ||
      !resolutionId ||
      this.state.lastEdgeCardPlay?.resolutionId === resolutionId ||
      (this.state.resolvedEdgeReactionIds ?? []).includes(`edge-reaction:${resolutionId}`)
    ) {
      return [];
    }
    const cards = player.private.hand
      .map((cardId) => EDGE_CARD_BY_ID.get(cardId))
      .filter((card): card is EdgeCardDefinition => Boolean(card));
    return cards.flatMap((card) => {
      if (
        card.abilityKey === "prevent-battle-wound" &&
        result.type === "COMBAT_RESOLVED" &&
        encounterEffectContains(result.effect, (effect) => effect.type === "take_wound" && effect.amount > 0)
      ) return [card.id];
      if (
        card.abilityKey === "convert-trophy" &&
        result.type === "COMBAT_RESOLVED" &&
        result.success &&
        encounter.cardType === "enemy" &&
        encounter.trophyValue > 0
      ) return [card.id];
      if (
        card.abilityKey === "shunt-failure-effect" &&
        result.type === "CHECK_ROLLED" &&
        !result.success &&
        encounterEffectContains(
          result.effect,
          (effect) => !["sequence", "take_wound", "gain_note"].includes(effect.type)
        )
      ) return [card.id];
      if (
        card.abilityKey === "reroll-die" &&
        !threatBlocksRerolls(encounter)
      ) return [card.id];
      if (
        card.abilityKey === "raise-natural-one" &&
        result.roll.faces.includes(1)
      ) return [card.id];
      if (
        card.abilityKey === "suppress-persistent-hazard" &&
        result.type === "CHECK_ROLLED" &&
        !result.success &&
        encounter.cardType === "hazard" &&
        Boolean(encounter.persistentRule) &&
        encounterEffectContains(result.effect, (effect) => effect.type === "return_threat_to_space")
      ) return [card.id];
      return [];
    });
  }

  private maybeOpenEdgeReaction(
    seatId: string,
    result: CheckRolledAction | CombatResolvedAction
  ): boolean {
    const resolution = this.state.activeResolution;
    if (!resolution || resolution.playerId !== seatId || this.state.pendingEdgeReaction) {
      return false;
    }
    const reactionId = `edge-reaction:${resolution.id}`;
    if ((this.state.resolvedEdgeReactionIds ?? []).includes(reactionId)) {
      return false;
    }
    const legalCardIds = this.getPostRollEdgeCardIds(seatId, result);
    if (legalCardIds.length === 0 || result.roll.faces.length < 2) {
      return false;
    }
    this.applyAction({
      type: "EDGE_CARD_REACTION_OPENED",
      seatId,
      reactionId,
      resolutionId: resolution.id,
      sourceKind: result.type === "COMBAT_RESOLVED" ? "battle" : "challenge",
      legalCardIds,
      originalRoll: [result.roll.faces[0]!, result.roll.faces[1]!],
      target: result.type === "COMBAT_RESOLVED" ? result.enemyTotal : result.difficulty,
      pendingResult: result,
      createdAt: new Date().toISOString()
    } satisfies EdgeCardReactionOpenedAction);
    return true;
  }

  private resolveEdgeCardReactionDecline(
    intent: Extract<ClientIntent, { type: "DECLINE_EDGE_CARD_REACTION" }>
  ): void {
    const pending = this.state.pendingEdgeReaction;
    if (!pending || pending.id !== intent.reactionId || pending.ownerSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "This Edge reaction is stale or belongs to another operative");
    }
    const result = this.getPendingEdgeReactionResult(pending.id);
    this.applyAction({
      type: "EDGE_CARD_REACTION_DECLINED",
      seatId: intent.seatId,
      reactionId: pending.id,
      resolutionId: pending.resolutionId,
      createdAt: new Date().toISOString()
    } satisfies EdgeCardReactionDeclinedAction);
    this.finishPendingEdgeResult(result);
  }

  private resolveEdgeCardIntent(
    intent: Extract<ClientIntent, { type: "PLAY_EDGE_CARD" }>
  ): void {
    const definition = EDGE_CARD_BY_ID.get(intent.cardId);
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!definition || !player?.private.hand.includes(intent.cardId)) {
      throw new IntentRejectedError(intent.type, "The operative does not own that Edge Card");
    }

    if (intent.mode === "ability") {
      const availability = getEdgeAbilityAvailability(this.state, intent.seatId, definition);
      if (!availability.enabled || availability.resolutionId !== intent.resolutionId) {
        throw new IntentRejectedError(
          intent.type,
          availability.disabledReason ?? "This Edge ability is outside its timing window"
        );
      }
      if (
        availability.targets.length > 0 &&
        (!intent.targetId || !availability.targets.some((target) => target.id === intent.targetId))
      ) {
        throw new IntentRejectedError(intent.type, "Choose one of the current legal Edge targets");
      }
    }

    const pendingReaction = this.state.pendingEdgeReaction;
    const action = this.intentToAction(intent);
    if (action.type !== "EDGE_CARD_PLAYED") {
      throw new IntentRejectedError(intent.type, "Edge Card play could not be prepared");
    }
    this.applyAction(action);

    if (intent.mode !== "ability" || !pendingReaction) return;

    let result = this.getPendingEdgeReactionResult(pendingReaction.id);
    let hazardSuppression: EdgeCardReactionResolvedAction["hazardSuppression"];
    switch (definition.abilityKey) {
      case "prevent-battle-wound":
        if (result.type !== "COMBAT_RESOLVED") {
          throw new IntentRejectedError(intent.type, "Cinderline Break requires an enemy battle result");
        }
        result = {
          ...result,
          effect: this.stripBattleRewardsForCinderline(
            preventWoundInEffect(result.effect, 1)
          ),
          edgeForfeitRewards: true
        };
        break;
      case "convert-trophy":
        if (result.type !== "COMBAT_RESOLVED" || !result.success) {
          throw new IntentRejectedError(intent.type, "Cinder Requisition requires a victorious enemy battle");
        }
        {
          const conversion = Number(intent.targetId);
          const maximum = Math.min(
            2,
            this.state.currentEncounter?.cardType === "enemy"
              ? this.state.currentEncounter.trophyValue
              : 0
          );
          if (!Number.isInteger(conversion) || conversion < 1 || conversion > maximum) {
            throw new IntentRejectedError(intent.type, "Choose how much Trophy value to convert");
          }
        result = {
          ...result,
            edgeTrophyConversion: conversion
        };
        }
        break;
      case "shunt-failure-effect":
        if (result.type !== "CHECK_ROLLED" || result.success || !result.effect) {
          throw new IntentRejectedError(intent.type, "Static Shunt requires a failed Challenge consequence");
        }
        {
          const legalTarget = collectNonWoundFailureEffectTargets(result.effect).some(
            (target) => target.id === intent.targetId
          );
          if (!intent.targetId || !legalTarget) {
            throw new IntentRejectedError(intent.type, "Choose one pending non-Wound effect");
          }
          const selected = this.removeSelectedNonWoundFailureEffect(
            result.effect,
            intent.targetId
          );
          result = {
            ...result,
            effect: this.makeEffectSequence([
              ...(selected ? [selected] : []),
              {
                type: "gain_note",
                text: "Static Shunt suppressed one selected non-Wound failure effect."
              }
            ])
          };
        }
        break;
      case "reroll-die": {
        const index = Number(intent.targetId);
        if (index !== 0 && index !== 1) {
          throw new IntentRejectedError(intent.type, "Choose one die to reroll");
        }
        const faces = [...result.roll.faces] as [number, number];
        faces[index] = this.randomSource.nextInt(6) + 1;
        result = this.rebuildThreatResultWithFaces(result, faces);
        break;
      }
      case "raise-natural-one": {
        const index = Number(intent.targetId);
        if ((index !== 0 && index !== 1) || result.roll.faces[index] !== 1) {
          throw new IntentRejectedError(intent.type, "Low-Signal Discipline requires a natural 1");
        }
        const faces = [...result.roll.faces] as [number, number];
        faces[index] = 2;
        result = this.rebuildThreatResultWithFaces(result, faces);
        break;
      }
      case "suppress-persistent-hazard": {
        const encounter = this.state.currentEncounter;
        const playerState = this.state.players.find((entry) => entry.seatId === intent.seatId);
        if (!encounter || encounter.cardType !== "hazard" || !playerState) {
          throw new IntentRejectedError(intent.type, "Hazard Wake requires a persistent Hazard result");
        }
        hazardSuppression = {
          hazardId: encounter.id,
          sectorId: playerState.character.currentSpaceId
        };
        break;
      }
      default:
        throw new IntentRejectedError(intent.type, "This Edge ability is not a post-roll reaction");
    }

    this.applyAction({
      type: "EDGE_CARD_REACTION_RESOLVED",
      seatId: intent.seatId,
      reactionId: pendingReaction.id,
      resolutionId: pendingReaction.resolutionId,
      hazardSuppression,
      createdAt: new Date().toISOString()
    } satisfies EdgeCardReactionResolvedAction);
    this.finishPendingEdgeResult(result);
  }

  private rollPlayerDiceWithEdgeCommit(seatId: string): ReturnType<typeof rollDice> {
    const pending = this.state.pendingEdgeCommit;
    if (
      !pending ||
      pending.seatId !== seatId ||
      pending.resolutionId !== this.state.activeResolution?.id
    ) {
      return rollDice(2, 6, this.randomSource);
    }

    const randomDie = rollDice(1, 6, this.randomSource);
    return {
      faces: [pending.edgeValue, randomDie.faces[0]!],
      total: pending.edgeValue + randomDie.total
    };
  }

  private maybeStartRandomScenarioAssault(): boolean {
    const scenario = getScenarioDefinition(this.state.activeScenarioId);
    const assault = scenario?.randomAssault;

    if (
      !scenario ||
      !assault ||
      assault.trigger !== "round-end" ||
      this.state.status !== "active" ||
      this.state.currentEncounter ||
      this.state.activeResolution ||
      this.state.pendingScenarioAssault
    ) {
      return false;
    }

    const resumeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
    const resumePhase = this.state.phase === "action" ? "action" : "navigation";
    if (!resumeSeatId) {
      return false;
    }

    const activePlayers = new Set(
      this.state.players
        .filter((player) => player.character.status === "active")
        .map((player) => player.seatId)
    );
    const eligibleSeats = this.state.seats.filter(
      (seat) => seat.connected && !seat.kicked && activePlayers.has(seat.seatId)
    );
    if (eligibleSeats.length === 0) {
      return false;
    }

    const existingBag = this.state.scenarioAssaultBag?.scenarioId === scenario.id
      ? this.state.scenarioAssaultBag
      : null;
    const needsShuffle = !existingBag || existingBag.remainingCardIds.length === 0;
    const cycle = needsShuffle ? (existingBag?.cycle ?? 0) + 1 : existingBag.cycle;
    const orderedCardIds = needsShuffle
      ? this.shuffleThreatIds(assault.cardIds)
      : existingBag.remainingCardIds;
    const cardId = orderedCardIds[0] ?? null;
    const encounter = cardId ? this.threats.get(cardId) ?? null : null;
    if (!cardId || !encounter) {
      throw new Error(`Scenario assault ${scenario.id} references an unavailable Threat card`);
    }

    const targetSeat = eligibleSeats[this.randomSource.nextInt(eligibleSeats.length)]!;
    const targetSeatIndex = this.state.turnOrder.indexOf(targetSeat.seatId);
    const targetPlayer = this.state.players.find((player) => player.seatId === targetSeat.seatId);
    const targetSector = targetPlayer
      ? this.state.sectors.find((sector) => sector.id === targetPlayer.character.currentSpaceId)
      : null;
    if (targetSeatIndex < 0 || !targetPlayer || !targetSector) {
      return false;
    }

    const createdAt = new Date().toISOString();
    const roundNumber = getCurrentRoundNumber(this.state);
    const summary = `${scenario.nemesis ?? scenario.name} sends ${encounter.title} against ${this.getSeatLabel(targetSeat.seatId)}.`;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: "action",
      resolutionSource: null,
      activeSeatIndex: targetSeatIndex,
      scenarioAssaultBag: {
        scenarioId: scenario.id,
        cycle,
        remainingCardIds: orderedCardIds.slice(1)
      },
      pendingScenarioAssault: {
        scenarioId: scenario.id,
        cardId,
        targetSeatId: targetSeat.seatId,
        resumeSeatId,
        resumePhase,
        roundNumber
      },
      currentEncounter: encounter,
      recentEncounterCardIds: this.getRecentEncounterCardIdsAfterDraw(encounter.id),
      pendingEnemyRoll: null,
      pendingEdgeCommit: null,
      pendingEdgeAbility: null,
      pendingEdgeReaction: null,
      lastEdgeCardPlay: null,
      pendingEffect: null,
      activeResolution: {
        id: `${targetSeat.seatId}:scenario-assault:${cardId}:${createdAt}`,
        playerId: targetSeat.seatId,
        source: "scenario",
        stage: "card_reveal",
        card: {
          id: encounter.id,
          title: encounter.title,
          type: getThreatPresentationCategory(encounter),
          flavor: encounter.flavor,
          artType: "threat"
        },
        origin: {
          sourceDeck: "scenario-assault",
          sourceSectorId: targetSector.id,
          sourceEventId: `${scenario.id}:round:${roundNumber}:assault`,
          queuePosition: 0,
          privacy: "public"
        },
        battle: {
          enemyName: encounter.cardType === "enemy" ? encounter.enemyName : encounter.title,
          stat: encounter.stat,
          difficulty: encounter.difficulty,
          modifiers: []
        },
        outcome: {
          title: "Retinue assault",
          text: summary,
          effects: []
        }
      },
      lastOutcomeSummary: {
        seatId: targetSeat.seatId,
        movedToSectorId: targetSector.id,
        encounterCardId: encounter.id,
        encounterTitle: encounter.title,
        encounterCardType: encounter.cardType,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: encounter.difficulty,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: null,
        summary
      },
      eventLog: [
        ...this.state.eventLog,
        {
          type: "SCENARIO_ASSAULT_STARTED",
          scenarioId: scenario.id,
          seatId: targetSeat.seatId,
          cardId,
          cycle,
          roundNumber,
          createdAt
        }
      ]
    };

    return true;
  }

  private finishRandomScenarioAssault(targetSeatId: string): void {
    const pending = this.state.pendingScenarioAssault;
    if (
      !pending ||
      pending.targetSeatId !== targetSeatId ||
      this.state.currentEncounter ||
      this.state.activeResolution ||
      this.state.pendingEffect
    ) {
      return;
    }

    const resumeSeatIndex = this.state.turnOrder.indexOf(pending.resumeSeatId);
    if (resumeSeatIndex < 0) {
      this.state = {
        ...this.state,
        pendingScenarioAssault: null,
        sequence: this.state.sequence + 1
      };
      return;
    }

    const resumePlayer = this.state.players.find((player) => player.seatId === pending.resumeSeatId);
    const resumePhase = resumePlayer?.character.status === "active" ? pending.resumePhase : "action";
    const createdAt = new Date().toISOString();
    this.state = {
      ...this.state,
      activeSeatIndex: resumeSeatIndex,
      phase: resumePhase,
      pendingScenarioAssault: null,
      sequence: this.state.sequence + 1,
      eventLog: [
        ...this.state.eventLog,
        {
          type: "SCENARIO_ASSAULT_COMPLETED",
          scenarioId: pending.scenarioId,
          seatId: targetSeatId,
          cardId: pending.cardId,
          roundNumber: pending.roundNumber,
          resumedSeatId: pending.resumeSeatId,
          createdAt
        }
      ]
    };

    this.applyStartOfTurnScenarioEffects(pending.resumeSeatId);
    this.maybeTriggerAbilityOnTurnStarted(pending.resumeSeatId);
    this.emitMovementDiagnostic("turn-completed", pending.resumeSeatId);
  }

  private prepareThreatBag(lane: ThreatIcon, seatId: string): void {
    const existing = this.state.threatDrawBags?.[lane];
    if (existing && existing.remainingCardIds.length > 0) return;

    const normalLaneCardIds = [...this.threats.values()]
      .filter((card) => card.threatLane === lane && !SCENARIO_OWNED_THREAT_IDS.has(card.id))
      .map((card) => card.id);
    const scenarioLaneAdditions =
      getScenarioDefinition(this.state.activeScenarioId)?.threatLaneAdditions?.[lane] ?? [];
    const laneCardIds = [...new Set([...normalLaneCardIds, ...scenarioLaneAdditions])];
    const shuffled = this.shuffleThreatIds(laneCardIds);
    const recent = new Set(this.state.recentEncounterCardIds ?? []);
    const orderedCardIds = existing
      ? shuffled
      : [
          ...shuffled.filter((cardId) => !recent.has(cardId)),
          ...shuffled.filter((cardId) => recent.has(cardId))
        ];

    this.applyAction({
      type: "THREAT_BAG_SHUFFLED",
      seatId,
      lane,
      cycle: (existing?.cycle ?? 0) + 1,
      orderedCardIds,
      createdAt: new Date().toISOString()
    });
  }

  private peekGlobalThreatId(lane: ThreatIcon, seatId: string): string | null {
    this.prepareThreatBag(lane, seatId);
    return this.state.threatDrawBags?.[lane]?.remainingCardIds[0] ?? null;
  }

  private getRecentEncounterCardIdsAfterDraw(cardId: string | null | undefined): string[] | undefined {
    if (!cardId) {
      return this.state.recentEncounterCardIds;
    }

    const existing = this.state.recentEncounterCardIds ?? [];
    return [...existing.filter((entry) => entry !== cardId), cardId].slice(-RECENT_ENCOUNTER_LIMIT);
  }

  private getOuterRingSectorIds(): string[] {
    return this.state.sectors.filter((sector) => sector.regionTier === "borderlight").map((sector) => sector.id);
  }

  private getTotalWounds(state: GameState): number {
    return state.players.reduce((total, player) => total + player.character.wounds, 0);
  }

  private getHeldGearCount(seatId: string, state: GameState = this.state): number {
    return state.players.find((player) => player.seatId === seatId)?.character.heldGear.length ?? 0;
  }

  private getThroneCrownCount(seatId: string, state: GameState = this.state): number {
    return state.scenarioProgress[getScenarioSeatCounterKey("crownClaim", seatId)] ?? 0;
  }

  private getTotalThroneCrownClaims(state: GameState = this.state): number {
    return state.scenarioProgress.crownClaims ?? 0;
  }

  private getScenarioSkillModifier(seatId: string, state: GameState = this.state): number {
    if (state.activeScenarioId === "scenario_throne_of_ash" && this.getThroneCrownCount(seatId, state) > 0) {
      return -1;
    }

    return 0;
  }

  private getScenarioBattleModifier(seatId: string, state: GameState = this.state): number {
    if (state.activeScenarioId === "scenario_throne_of_ash" && this.getThroneCrownCount(seatId, state) > 0) {
      return 1;
    }

    return 0;
  }

  private getScenarioEnemyBattleModifier(state: GameState = this.state): number {
    if (state.activeScenarioId !== "scenario_labyrinth_engine") {
      return 0;
    }

    return (state.scenarioProgress.engineModeIndex ?? 0) % 5 === 1 ? 1 : 0;
  }

  private getCompletedContractCount(seatId: string, state: GameState = this.state): number {
    return getCompletedContractCountForProjection(state, seatId);
  }

  private hasScenarioArtifact(player: PlayerState): boolean {
    return player.character.heldGear.some(
      (item) => item.tier === "artifact" || item.category === "chargedRelic" || item.id.startsWith("artifact-")
    );
  }

  private hasScenarioGear(player: PlayerState, needle: string): boolean {
    const normalizedNeedle = needle.toLowerCase();
    return player.character.heldGear.some(
      (item) => item.id.toLowerCase().includes(normalizedNeedle) || item.name.toLowerCase().includes(normalizedNeedle)
    );
  }

  private getScenarioGateBlockReason(player: PlayerState, scenario: ScenarioDefinition): string | null {
    const completedContracts = this.getCompletedContractCount(player.seatId);
    const hasArtifact = this.hasScenarioArtifact(player);
    const progress = this.state.scenarioProgress;
    const devourerTrophyGate = getDevourerTrophyGate(this.state.sessionMode);
    const engineKeyGate = getLabyrinthEngineKeyGate(this.state.sessionMode);
    const starTokenGate = getDyingStarTokenGate(this.state.sessionMode);
    const starContractGate = getDyingStarContractGate(this.state.sessionMode);

    if (scenario.id !== "scenario_broken_seal" && (progress[scenario.winConditionKey] ?? 0) > 0) {
      return null;
    }

    switch (scenario.id) {
      case "scenario_broken_seal":
        return (this.state.scenarioPreparation.resources.sealIntegrity ?? 0) >= 4 || hasArtifact || completedContracts >= 3
          ? null
          : "Final gate locked: restore 4+ Seal Integrity, hold an Artifact, or complete 3 Contracts.";
      case "scenario_throne_of_ash":
        return this.getThroneCrownCount(player.seatId) >= 1 || completedContracts >= 2
          ? null
          : "Final gate locked: hold 1 Crown or complete 2 Contracts.";
      case "scenario_mirror_of_false_heroes":
        return hasArtifact || completedContracts >= 2 || player.character.scars.length === 0
          ? null
          : "Final gate locked: hold an Artifact, complete 2 Contracts, or carry no Scars.";
      case "scenario_devourer_beneath":
        return player.character.trophies >= devourerTrophyGate || hasArtifact || this.hasScenarioGear(player, "maw-spike")
          ? null
          : `Final gate locked: spend ${devourerTrophyGate} Trophy value, hold an Artifact charge, or carry a Maw Spike.`;
      case "scenario_labyrinth_engine":
        return (progress.engineKeys ?? 0) >= engineKeyGate || (progress.shutdownMarks ?? 0) >= engineKeyGate || hasArtifact
          ? null
          : `Final gate locked: assemble ${engineKeyGate} Engine Keys or hold an Artifact.`;
      case "scenario_dying_star":
        return (progress.starTokens ?? 0) >= starTokenGate && (hasArtifact || completedContracts >= starContractGate)
          ? null
          : `Final gate locked: keep ${starTokenGate}+ Starfire and hold an Artifact or complete ${starContractGate} Contracts.`;
      case BROKEN_CONCORDANCE_SCENARIO_ID: {
        const completedNodes = new Set(this.state.scenarioPreparation.completedObjectiveIds);
        const missingNode = BROKEN_CONCORDANCE_NODES.find((node) => !completedNodes.has(node.id));
        if (missingNode) return `Final gate locked: stabilize ${missingNode.name}.`;
        if (!isInnerApproachChallengeCleared(this.state, player, "inner_gate_of_cinders")) {
          return "Final gate locked: breach the Gate of Cinders first.";
        }
        return null;
      }
      default:
        return null;
    }
  }

  private hasAbilityTriggeredThisRound(seatId: string, abilityId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const event = this.state.eventLog[index] as
        | { type?: string; seatId?: string; abilityId?: string }
        | undefined;

      if (event?.type === "ROUND_COMPLETED") {
        break;
      }

      if (event?.type === "ABILITY_TRIGGERED" && event.seatId === seatId && event.abilityId === abilityId) {
        return true;
      }
    }

    return false;
  }

  private getScrapCrownedInstinctContext(seatId: string): {
    stat: Stat;
    mode: "battle" | "check";
    sourceId: string;
    sourceTitle: string;
  } | null {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (
      !player ||
      player.character.id !== "cinder-wattle" ||
      player.character.status !== "active" ||
      this.state.status !== "active" ||
      this.state.turnOrder[this.state.activeSeatIndex] !== seatId ||
      this.hasPendingRoll(seatId)
    ) return null;

    const pending = this.state.pendingCooperativeTest;
    if (pending?.activeSeatId === seatId) {
      return {
        stat: pending.stat,
        mode: "check",
        sourceId: pending.sourceId,
        sourceTitle: pending.sourceTitle
      };
    }

    const resolution = this.state.activeResolution;
    if (resolution?.playerId === seatId && resolution.stage === "battle_setup" && resolution.battle) {
      const encounter = this.state.currentEncounter;
      return {
        stat: resolution.battle.stat,
        mode: encounter?.cardType === "enemy" ? "battle" : "check",
        sourceId: encounter?.id ?? resolution.card?.id ?? resolution.id,
        sourceTitle: encounter?.title ?? resolution.card?.title ?? "Skill test"
      };
    }

    if (this.state.phase === "action" && !this.state.currentEncounter && isScenarioConfrontationSpace(player.character.currentSpaceId)) {
      const firstCheck = this.buildScenarioPlan(player).checks[0];
      const scenario = getScenarioDefinition(this.state.activeScenarioId);
      if (firstCheck && scenario) {
        return {
          stat: firstCheck.stat,
          mode: "check",
          sourceId: scenario.id,
          sourceTitle: scenario.confrontationTitle
        };
      }
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);
    if (this.state.phase === "action" && !this.state.currentEncounter && boardSpace && !boardSpace.textBox.choices?.length) {
      const check = resolveSpaceText(boardSpace.textBox.effectKey).check;
      if (check?.stat) {
        return {
          stat: check.stat,
          mode: "check",
          sourceId: boardSpace.textBox.effectKey,
          sourceTitle: boardSpace.textBox.title
        };
      }
    }

    return null;
  }

  private hasAbilityTriggeredThisSession(seatId: string, abilityId: string): boolean {
    return this.state.eventLog.some((entry) => {
      const event = entry as { type?: string; seatId?: string; abilityId?: string } | undefined;
      return event?.type === "ABILITY_TRIGGERED" && event.seatId === seatId && event.abilityId === abilityId;
    });
  }

  private applyAbilityMutation(
    seatId: string,
    abilityId: string,
    summary: string,
    updater: (player: PlayerState) => PlayerState,
    eventDetails: Record<string, unknown> = {}
  ): void {
    let changed = false;

    const players = this.state.players.map((player) => {
      if (player.seatId !== seatId) {
        return player;
      }

      const updated = updater(player);
      changed = changed || updated !== player;
      return updated;
    });

    if (!changed) {
      return;
    }

    const currentSectorId = this.state.players.find((player) => player.seatId === seatId)?.sectorId ?? "unknown";

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      players,
      lastOutcomeSummary: this.state.lastOutcomeSummary
        ? {
            ...this.state.lastOutcomeSummary,
            seatId,
            movedToSectorId: currentSectorId,
            summary: `${this.state.lastOutcomeSummary.summary} ${summary}`
          }
        : {
            seatId,
            movedToSectorId: currentSectorId,
            encounterCardId: null,
            encounterTitle: "Ability Triggered",
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
            summary
          },
      eventLog: [
        ...this.state.eventLog,
        {
          type: "ABILITY_TRIGGERED",
          seatId,
          abilityId,
          summary,
          ...eventDetails,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  private maybeAdvanceContractObjective(seatId: string, trigger: Parameters<typeof advanceContractObjectiveProgress>[2], summary: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player) return;
    const activeMissions = getActiveMissions(player.character);
    const updates = activeMissions.flatMap((activeMission) => {
      const contract = this.state.availableContracts.find((entry) => entry.id === activeMission.contractId) ?? null;
      if (!contract) return [];
      const nextState = advanceContractObjectiveState(contract, activeMission, trigger);
      const changed =
        nextState.progress !== activeMission.progress ||
        JSON.stringify(nextState.completedTargetIds ?? []) !== JSON.stringify(activeMission.completedTargetIds ?? []) ||
        nextState.salvageSpent !== activeMission.salvageSpent;
      return changed ? [{ activeMission, contract, nextState }] : [];
    });
    if (updates.length === 0) return;
    const updatesById = new Map(updates.map((entry) => [entry.activeMission.contractId, entry]));
    const nextMissions = activeMissions.map((activeMission) => {
      const update = updatesById.get(activeMission.contractId);
      return update
        ? { ...activeMission, ...update.nextState, progress: update.nextState.progress }
        : activeMission;
    });
    const progressSummary = updates
      .map(({ contract, nextState }) =>
        `${contract.name} is now ${formatContractObjectiveStatus(contract, nextState.progress)}.`
      )
      .join(" ");
    const createdAt = new Date().toISOString();

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      players: this.state.players.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              character: setActiveMissions(entry.character, nextMissions)
            }
          : entry
      ),
      lastOutcomeSummary: this.state.lastOutcomeSummary
            ? {
                ...this.state.lastOutcomeSummary,
                seatId,
                movedToSectorId: player.sectorId,
                summary: `${this.state.lastOutcomeSummary.summary} ${summary} ${progressSummary}`
              }
        : this.state.lastOutcomeSummary,
      eventLog: [
        ...this.state.eventLog,
        ...updates.map(({ contract, nextState }) => ({
          type: "CONTRACT_PROGRESS_UPDATED",
          seatId,
          contractId: contract.id,
          progress: nextState.progress,
          summary,
          createdAt
        }))
      ]
    };

    this.completeSatisfiedContract(seatId);
  }

  private completeSatisfiedContract(seatId: string): boolean {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const activeContract = player
      ? getActiveMissions(player.character).find((mission) => {
          const contract = this.state.availableContracts.find((entry) => entry.id === mission.contractId);
          return Boolean(contract && isContractObjectiveComplete(contract, mission));
        }) ?? null
      : null;
    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
    if (
      !activeContract ||
      this.state.status !== "active" ||
      this.state.phase !== "action" ||
      activeSeatId !== seatId ||
      this.state.activeResolution ||
      this.state.pendingEffect ||
      this.state.pendingMissionSelection
    ) return false;
    const contract = this.state.availableContracts.find((entry) => entry.id === activeContract.contractId);
    if (!contract) return false;
    this.applyAction({
      type: "COMPLETE_CONTRACT",
      seatId,
      contractId: contract.id,
      contract: this.resolveContract(contract),
      createdAt: new Date().toISOString()
    } satisfies CompleteContractAction);
    this.queueReplacementMissionSelection(seatId, contract.id);
    this.applyScenarioOnContractCompleted(seatId);
    this.applyScenarioObjectiveOnContractCompleted(seatId, contract.id);
    this.applyRivalryAgendaProgressTrigger(seatId, {
      type: "contractCompleted",
      seatId,
      contractId: contract.id,
      sectorId: this.state.players.find((entry) => entry.seatId === seatId)?.sectorId
    });
    this.maybeTriggerAbilityOnContractCompleted(seatId);
    this.activateQueuedReplacementMissionSelection(seatId);
    return true;
  }

  private maybeTriggerAbilityOnContractAccepted(seatId: string, acceptedContractId?: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (player.character.id === "black-ledger-agent") {
      if (this.hasAbilityTriggeredThisSession(seatId, "ledger-broker")) {
        return;
      }

      const activeMission = acceptedContractId
        ? getActiveMission(player.character, acceptedContractId)
        : getActiveMissions(player.character)[0] ?? null;
      const contract = activeMission
        ? this.state.availableContracts.find((entry) => entry.id === activeMission.contractId) ?? null
        : null;

      this.applyAbilityMutation(
        seatId,
        "ledger-broker",
        "Ledger Broker banked hidden leverage into the newly accepted contract.",
        (entry) =>
          activeMission && contract
            ? {
                ...entry,
                character: setActiveMissions(
                  entry.character,
                  getActiveMissions(entry.character).map((mission) =>
                    mission.contractId === activeMission.contractId
                      ? {
                          ...mission,
                          progress: setContractProgressFloor(contract, mission.progress, 1)
                        }
                      : mission
                  )
                )
              }
            : entry
      );
    }

    if (player.character.id === "fleet-elder") {
      if (!this.hasAbilityTriggeredThisRound(seatId, "convoy-law")) {
        this.applyAbilityMutation(
          seatId,
          "convoy-law",
          "Convoy Law steadied the expedition as the Contract entered the ledger.",
          (entry) => ({
            ...entry,
            private: {
              ...entry.private,
              notes: [...entry.private.notes, "Convoy Law secured the new obligation without exposing its private terms."]
            }
          })
        );

        if (this.state.escalationLevel > 0) {
          this.feedEscalation(seatId, -1, "Convoy Law");
        }
      }

      if (!this.hasAbilityTriggeredThisRound(seatId, "old-oaths")) {
        this.applyAbilityMutation(
          seatId,
          "old-oaths",
          "Old Oaths prepared the Fleet Elder's next Command check.",
          (entry) => ({
            ...entry,
            private: {
              ...entry.private,
              notes: [...entry.private.notes, "Old Oaths grants +1 on the next Command check this turn."]
            }
          }),
          {
            rollModifier: { stat: "command", mode: "check", label: "Old Oaths", value: 1 }
          }
        );
      }
    }

    if (player.character.id === "rift-cartographer" && !this.hasAbilityTriggeredThisRound(seatId, "surveyor-cut")) {
      const activeMission = acceptedContractId
        ? getActiveMission(player.character, acceptedContractId)
        : getActiveMissions(player.character)[0] ?? null;
      const contract = activeMission
        ? this.state.availableContracts.find((entry) => entry.id === activeMission.contractId) ?? null
        : null;

      if (contract?.objective.type === "multiStopRoute") {
        this.applyAbilityMutation(
          seatId,
          "surveyor-cut",
          "Surveyor's Cut banked the fresh route lead as future leverage.",
          (entry) =>
            activeMission
            ? {
                ...entry,
                private: {
                  ...entry.private,
                  notes: [...entry.private.notes, "Surveyor's Cut stored the mapped lead before the breach could distort it."]
                },
                character: setActiveMissions(
                  entry.character,
                  getActiveMissions(entry.character).map((mission) =>
                    mission.contractId === activeMission.contractId
                      ? {
                          ...mission,
                          progress: setContractProgressFloor(contract, mission.progress, 1)
                        }
                      : mission
                  )
                )
              }
              : entry
        );
      }
    }
  }

  private maybeTriggerAbilityOnContractCompleted(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (player.character.id === "void-marshal" && !this.hasAbilityTriggeredThisRound(seatId, "marshal-presence")) {
      this.applyAbilityMutation(
        seatId,
        "marshal-presence",
        "Marshal's Presence steadied the line and reduced public pressure.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Void Marshal command presence stabilized the objective push."]
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Marshal's Presence");
      }
    }

    if (player.character.id === "black-ledger-agent" && !this.hasAbilityTriggeredThisRound(seatId, "black-file")) {
      this.applyAbilityMutation(
        seatId,
        "black-file",
        "Black File converted the completed job into leverage.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Black file leverage extracted from the finished contract."]
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Black File");
      }
    }

    if (player.character.id === "oathbroken-prince" && !this.hasAbilityTriggeredThisRound(seatId, "ash-tithe")) {
      this.applyAbilityMutation(
        seatId,
        "ash-tithe",
        "Ash Tithe collected a little of the world's debt back into the Prince's hands.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Ash Tithe skimmed tribute off the quiet victory before the route closed."]
          },
          character: {
            ...entry.character,
            salvage: (entry.character.salvage ?? 0) + 1
          }
        })
      );
    }

    if (player.character.id === "siege-medic" && !this.hasAbilityTriggeredThisRound(seatId, "scar-ledger")) {
      this.applyAbilityMutation(
        seatId,
        "scar-ledger",
        "Scar Ledger turned the completed job into a cleaner recovery ledger.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Scar Ledger filed the surviving harm into something the crew could carry."]
          },
          character: {
            ...entry.character,
            wounds: Math.max(0, entry.character.wounds - 1)
          }
        })
      );
    }
  }

  private maybeTriggerAbilityOnTurnStarted(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const sector = player ? this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId) ?? null : null;

    if (!player || !sector) {
      return;
    }

    if (
      player.character.id === "void-marshal" &&
      sector.encounterDecks.threat.length === 0 &&
      !this.hasAbilityTriggeredThisRound(seatId, "ashwake-step")
    ) {
      this.applyAbilityMutation(
        seatId,
        "ashwake-step",
        "Ashwake Step let the Marshal treat the lane as already scouted.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Ashwake Step grants +1 on the next Command check this turn."]
          }
        }),
        {
          rollModifier: { stat: "command", mode: "check", label: "Ashwake Step", value: 1 }
        }
      );
    }

    if (
      player.character.id === "fleet-elder" &&
      this.state.escalationLevel > 0 &&
      !this.hasAbilityTriggeredThisRound(seatId, "fleet-memory")
    ) {
      this.applyAbilityMutation(
        seatId,
        "fleet-memory",
        "Fleet Memory read the convoy pressure early and calmed the operative.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Fleet Memory read the pressure pattern before the convoy line could panic."]
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Fleet Memory");
      }
    }

    if (
      player.character.id === "cinder-monk" &&
      (sector.danger >= 3 || this.state.escalationLevel > 0) &&
      !this.hasAbilityTriggeredThisRound(seatId, "ember-vigil")
    ) {
      this.applyAbilityMutation(
        seatId,
        "ember-vigil",
        "Ember Vigil steadied the Monk before the dangerous lane could set the pace.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Ember Vigil kept the dangerous sector from dictating the tempo."]
          },
          character: {
            ...entry.character,
            wounds: entry.character.wounds + 1
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Ember Vigil");
      }
    }

    if (
      player.character.id === "siege-medic" &&
      player.character.wounds > 0 &&
      !this.hasAbilityTriggeredThisRound(seatId, "siege-discipline")
    ) {
      this.applyAbilityMutation(
        seatId,
        "siege-discipline",
        "Siege Discipline flattened the pressure curve before the turn even opened.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Siege Discipline turned long pressure into a steady working rhythm."]
          },
          character: {
            ...entry.character,
            wounds: Math.max(0, entry.character.wounds - 1)
          }
        })
      );
    }
  }

  private maybeTriggerAbilityOnMovementResolved(_seatId: string, _toSectorId: string, _success: boolean): void {}

  private maybeTriggerAbilityOnCheckResolved(seatId: string, stat: string, success: boolean): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || !success) {
      return;
    }

    if (player.character.id === "signal-witch" && stat === "signal") {
      if (this.hasAbilityTriggeredThisRound(seatId, "witchglass-choir")) {
        return;
      }

      this.applyAbilityMutation(
        seatId,
        "witchglass-choir",
        "Witchglass Choir turned the signal surge into a calmer route reading.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Witchglass Choir grants +1 on the next Guile check this turn."]
          }
        }),
        {
          rollModifier: { stat: "guile", mode: "check", label: "Witchglass Choir", value: 1 }
        }
      );
    }

    if (
      player.character.id === "siege-medic" &&
      stat === "grit" &&
      !this.hasAbilityTriggeredThisRound(seatId, "amber-draught")
    ) {
      this.applyAbilityMutation(
        seatId,
        "amber-draught",
        "Amber Draught turned the clean push into measured field relief.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Amber Draught steadied the body before the next hit could land."]
          },
          character: {
            ...entry.character,
            wounds: Math.max(0, entry.character.wounds - 1)
          }
        })
      );
    }

  }

  private maybeTriggerAbilityOnSpaceTextResolved(seatId: string, effectKey: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (
      player.character.id === "signal-witch" &&
      effectKey === "outer_glassmereChorus" &&
      !this.hasAbilityTriggeredThisRound(seatId, "hush-static")
    ) {
      this.applyAbilityMutation(
        seatId,
        "hush-static",
        "Hush Static smothered the anomaly's edge and cooled the relay line.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Hush Static drowned the local anomaly in controlled noise."]
          }
        })
      );
    }

    if (
      player.character.id === "fleet-elder" &&
      effectKey === "outer_mirecoilTraffic" &&
      !this.hasAbilityTriggeredThisRound(seatId, "convoy-law")
    ) {
      this.applyAbilityMutation(
        seatId,
        "convoy-law",
        "Convoy Law steadied the wider route network around the fresh contract lead.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Convoy Law secured the lead and calmed the convoy spine."]
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Convoy Law");
      }
    }

    if (
      player.character.id === "oathbroken-prince" &&
      getActiveMissions(player.character).length > 0 &&
      (effectKey === "outer_mirecoilTraffic" ||
        effectKey === "outer_hollowVeilSweep" ||
        effectKey === "outer_glassmereChorus") &&
      !this.hasAbilityTriggeredThisRound(seatId, "broken-claim")
    ) {
      const activeMission = getActiveMissions(player.character)[0] ?? null;
      const contract = activeMission
        ? this.state.availableContracts.find((entry) => entry.id === activeMission.contractId) ?? null
        : null;

      if (contract?.objective.type === "defeatCount") {
        this.applyAbilityMutation(
          seatId,
          "broken-claim",
          "Broken Claim turned the cleared lane into progress on the Prince's defeat Contract.",
          (entry) =>
            activeMission
              ? {
                  ...entry,
                  private: {
                    ...entry.private,
                    notes: [...entry.private.notes, "Broken Claim converted local leverage into defeat-contract progress."]
                  },
                  character: setActiveMissions(
                    entry.character,
                    getActiveMissions(entry.character).map((mission, index) =>
                      index === 0
                        ? {
                            ...mission,
                            progress: advanceContractObjectiveProgress(contract, mission.progress, {
                              type: "enemy-defeated"
                            })
                          }
                        : mission
                    )
                  )
                }
              : entry
        );
      }
    }

    if (
      player.character.id === "black-ledger-agent" &&
      (effectKey === "outer_ashwakeClearLane" ||
        effectKey === "outer_glassmereChorus" ||
        effectKey === "outer_mirecoilTraffic" ||
        effectKey === "middle_shardSprawlBargain") &&
      !this.hasAbilityTriggeredThisRound(seatId, "silent-audit")
    ) {
      this.applyAbilityMutation(
        seatId,
        "silent-audit",
        "Silent Audit pulled cleaner intelligence out of the cleared sector.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Silent Audit grants +1 on the next Guile check this turn."]
          }
        }),
        {
          rollModifier: { stat: "guile", mode: "check", label: "Silent Audit", value: 1 }
        }
      );
    }

    if (
      player.character.id === "cinder-monk" &&
      (effectKey === "outer_emberwatchBrace" || effectKey === "outer_emberSanctumRest") &&
      !this.hasAbilityTriggeredThisRound(seatId, "ash-psalm")
    ) {
      this.applyAbilityMutation(
        seatId,
        "ash-psalm",
        "Ash Psalm turned the clear moment into discipline instead of drift.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            noteResources: {
              ...(entry.private.noteResources ?? {}),
              vow: (entry.private.noteResources?.vow ?? 0) + 1
            },
            notes: [...entry.private.notes, "Ash Psalm hardened the cleared line into a disciplined hold."]
          }
        })
      );
    }

    if (
      effectKey === "outer_hollowVeilSweep" &&
      player.character.id === "grave-engineer" &&
      !this.hasAbilityTriggeredThisRound(seatId, "coffin-rigging")
    ) {
      this.applyAbilityMutation(
        seatId,
        "coffin-rigging",
        "Coffin Rigging locked the salvage reward straight into field-ready armor.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Coffin Rigging converted Hollow Veil salvage into ready armor."]
          },
          character: {
            ...entry.character,
            equippedGear: {
              ...entry.character.equippedGear,
              armor: entry.character.heldGear.some((item) => item.id === "coffin-rig")
                ? entry.character.equippedGear.armor ?? "coffin-rig"
                : entry.character.equippedGear.armor
            }
          }
        })
      );
    }

    if (
      effectKey === "outer_hollowVeilSweep" &&
      player.character.id === "salvage-warden" &&
      !this.hasAbilityTriggeredThisRound(seatId, "salvage-right")
    ) {
      this.applyAbilityMutation(
        seatId,
        "salvage-right",
        "Salvage Right squeezed extra field value out of the recovered gear.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Salvage Right extracted a stronger haul from Hollow Veil."]
          },
          character: {
            ...entry.character,
            salvage: (entry.character.salvage ?? 0) + 1,
            equippedGear: {
              ...entry.character.equippedGear,
              armor: entry.character.heldGear.some((item) => item.id === "coffin-rig")
                ? entry.character.equippedGear.armor ?? "coffin-rig"
                : entry.character.equippedGear.armor
            }
          }
        })
      );
    }

    if (
      effectKey === "outer_emberSanctumRest" &&
      player.character.id === "siege-medic" &&
      !this.hasAbilityTriggeredThisRound(seatId, "field-triage")
    ) {
      this.applyAbilityMutation(
        seatId,
        "field-triage",
        "Field Triage cleared a wound while the sanctuary still held.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Field Triage converted the sanctuary pause into hard recovery."]
          },
          character: {
            ...entry.character,
            wounds: Math.max(0, entry.character.wounds - 1)
          }
        })
      );
    }
  }

  private maybeTriggerAbilityOnStabilizeResolved(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (player.character.id === "siege-medic" && !this.hasAbilityTriggeredThisRound(seatId, "field-triage")) {
      this.applyAbilityMutation(
        seatId,
        "field-triage",
        "Field Triage used the stabilization window to clear 1 wound.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Field Triage turned the breach hold into practical recovery."]
          },
          character: {
            ...entry.character,
            wounds: Math.max(0, entry.character.wounds - 1)
          }
        })
      );
    }

    if (
      player.character.id === "salvage-warden" &&
      !this.hasAbilityTriggeredThisRound(seatId, "last-haul")
    ) {
      const exhaustedGear = player.character.heldGear.find((item) => item.exhausted);

      if (exhaustedGear) {
        this.applyAbilityMutation(
          seatId,
          "last-haul",
          `Last Haul readied ${exhaustedGear.name}.`,
          (entry) => ({
            ...entry,
            private: {
              ...entry.private,
              notes: [...entry.private.notes, `Last Haul readied ${exhaustedGear.name}.`]
            },
            character: {
              ...entry.character,
              heldGear: entry.character.heldGear.map((item) =>
                (exhaustedGear.instanceId && item.instanceId === exhaustedGear.instanceId) ||
                (!exhaustedGear.instanceId && item.id === exhaustedGear.id)
                  ? { ...item, exhausted: false }
                  : item
              )
            }
          })
        );
      }
    }

    if (player.character.id === "grave-engineer" && !this.hasAbilityTriggeredThisRound(seatId, "mortuary-triage")) {
      const exhaustedGear = player.character.heldGear.find((item) => item.exhausted);

      if (exhaustedGear) {
        this.applyAbilityMutation(
          seatId,
          "mortuary-triage",
          `Mortuary Triage readied ${exhaustedGear.name}.`,
          (entry) => ({
            ...entry,
            private: {
              ...entry.private,
              notes: [...entry.private.notes, `Mortuary Triage readied ${exhaustedGear.name}.`]
            },
            character: {
              ...entry.character,
              heldGear: entry.character.heldGear.map((item) =>
                (exhaustedGear.instanceId && item.instanceId === exhaustedGear.instanceId) ||
                (!exhaustedGear.instanceId && item.id === exhaustedGear.id)
                  ? { ...item, exhausted: false }
                  : item
              )
            }
          })
        );
      }
    }
  }

  private maybeTriggerAbilityOnCombatVictory(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (
      player.character.id === "char_bjornis" &&
      this.state.currentEncounter?.threatLane === "red" &&
      !this.hasAbilityTriggeredThisRound(seatId, "foam-and-fury") &&
      this.state.escalationLevel > 0
    ) {
      this.applyAbilityMutation(
        seatId,
        "foam-and-fury",
        "Foam and Fury turned the red-threat victory into 1 less scenario pressure.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Foam and Fury reduced scenario pressure after the red-threat victory."]
          }
        })
      );
      this.feedEscalation(seatId, -1, "Foam and Fury");
    }

    if (
      player.character.id === "black-ledger-agent" &&
      getActiveMissions(player.character).length > 0 &&
      !this.hasAbilityTriggeredThisRound(seatId, "debt-knife")
    ) {
      const activeMission = getActiveMissions(player.character)[0] ?? null;
      const contract = activeMission
        ? this.state.availableContracts.find((entry) => entry.id === activeMission.contractId) ?? null
        : null;

      this.applyAbilityMutation(
        seatId,
        "debt-knife",
        "Debt Knife pushed the marked target into sharper contract progress.",
        (entry) =>
          activeMission && contract
            ? {
                ...entry,
                private: {
                  ...entry.private,
                  notes: [...entry.private.notes, "Debt Knife carved extra leverage out of the marked kill."]
                },
                character: setActiveMissions(
                  entry.character,
                  getActiveMissions(entry.character).map((mission, index) =>
                    index === 0
                      ? {
                          ...mission,
                          progress: advanceContractObjectiveProgress(contract, mission.progress, {
                            type: "enemy-defeated"
                          })
                        }
                      : mission
                  )
                )
              }
            : entry
      );
    }

    if (
      player.character.id === "oathbroken-prince" &&
      player.character.activeContract &&
      !this.hasAbilityTriggeredThisRound(seatId, "crown-debt")
    ) {
      this.applyAbilityMutation(
        seatId,
        "crown-debt",
        "Crown Debt made the marked kill feel like repayment instead of luck.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Crown Debt pressed the kill into service as collected obligation."]
          },
          character: {
            ...entry.character,
            salvage: (entry.character.salvage ?? 0) + 1
          }
        })
      );
    }
  }

  private maybeTriggerEscalationAbility(seatId: string, delta: number, reason: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (
      delta > 0 &&
      player?.character.id === "signal-witch" &&
      this.state.turnOrder[this.state.activeSeatIndex] === seatId &&
      !this.hasAbilityTriggeredThisRound(seatId, "choir-lash")
    ) {
      this.applyAbilityMutation(
        seatId,
        "choir-lash",
        "Choir Lash answered the breach surge with a cooling signal spike.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Choir Lash grants +1 on the next Signal check this turn."]
          }
        }),
        {
          rollModifier: { stat: "signal", mode: "check", label: "Choir Lash", value: 1 }
        }
      );
    }

    if (
      delta > 0 &&
      player?.character.id === "grave-engineer" &&
      /wound/i.test(reason) &&
      !this.hasAbilityTriggeredThisRound(seatId, "cold-brace")
    ) {
      this.state = {
        ...this.state,
        sequence: this.state.sequence + 1,
        eventLog: [
          ...this.state.eventLog,
          {
            type: "ABILITY_TRIGGERED",
            seatId,
            abilityId: "cold-brace",
            summary: "Cold Brace absorbed part of the wound-driven escalation spike.",
            createdAt: new Date().toISOString()
          }
        ],
        lastOutcomeSummary: this.state.lastOutcomeSummary
          ? {
              ...this.state.lastOutcomeSummary,
              summary: `${this.state.lastOutcomeSummary.summary} Cold Brace absorbed part of the spike.`
            }
          : this.state.lastOutcomeSummary
      };

      this.feedEscalation(seatId, -1, "Cold Brace");
      return;
    }

    if (delta <= 0 || this.state.turnOrder[this.state.activeSeatIndex] !== seatId) {
      return;
    }

    if (!player || player.character.id !== "cinder-monk") {
      return;
    }

    if (this.hasAbilityTriggeredThisRound(seatId, "bone-bell")) {
      return;
    }

    this.applyAbilityMutation(
      seatId,
      "bone-bell",
      "Bone Bell gained 1 Vow Note from the first escalation spike this round.",
      (entry) => ({
        ...entry,
        private: {
          ...entry.private,
          noteResources: {
            ...(entry.private.noteResources ?? {}),
            vow: (entry.private.noteResources?.vow ?? 0) + 1
          },
          notes: [...entry.private.notes, "Bone Bell recorded 1 Vow Note."]
        }
      })
    );

    this.feedEscalation(seatId, -1, "Bone Bell");
  }

  private feedEscalation(
    seatId: string,
    delta: number,
    reason: string,
    source?: { cardId: string; eventId: string; guard?: "oneBeforeCollapse" }
  ): void {
    if (this.state.status !== "active" || (delta === 0 && source?.guard !== "oneBeforeCollapse")) {
      return;
    }

    if (delta > 0 && getScenarioDefinition(this.state.activeScenarioId)?.lossPressureEnabled === false) {
      return;
    }

    if (source && (this.state.resolvedEscalationSourceEventIds ?? []).includes(source.eventId)) {
      return;
    }

    const collapseLevel = getEscalationCollapseLevel(this.state.sessionMode);
    const previousLevel = this.state.escalationLevel;
    const requestedDelta = source?.guard === "oneBeforeCollapse"
      ? previousLevel < collapseLevel - 1 ? delta : 0
      : delta;
    const nextLevel = Math.max(0, Math.min(collapseLevel, previousLevel + requestedDelta));
    const actualDelta = nextLevel - previousLevel;
    const modifier = getEscalationModifier(nextLevel);
    const guardedReason = source?.guard === "oneBeforeCollapse" && requestedDelta === 0
      ? "oneBeforeCollapseGuard" as const
      : undefined;

    this.applyAction({
      type: "ESCALATION_ADVANCED",
      seatId,
      amount: actualDelta,
      newLevel: nextLevel,
      modifier,
      ...(source?.guard === "oneBeforeCollapse" ? { previousLevel, requestedAmount: requestedDelta, guardedReason } : {}),
      reason,
      ...(source ? { sourceCardId: source.cardId, sourceEventId: source.eventId } : {}),
      createdAt: new Date().toISOString()
    } satisfies EscalationAdvancedAction);

    this.maybeTriggerEscalationAbility(seatId, actualDelta, reason);

    if (source?.guard === "oneBeforeCollapse") {
      return;
    }

    const currentLevel = this.state.escalationLevel;
    const currentModifier = getEscalationModifier(currentLevel);

    if (currentLevel >= collapseLevel) {
      this.applyAction({
        type: "SECTOR_COLLAPSED",
        seatId,
        threshold: collapseLevel,
        modifier: currentModifier,
        summary: `Escalation reached ${currentLevel}/${collapseLevel}. The breach overtook the operatives (${reason}).`,
        createdAt: new Date().toISOString()
      } satisfies SectorCollapsedAction);
    }
  }

  private applyAmbientScenarioMutation(
    seatId: string,
    updater: (state: GameState) => GameState,
    summary: string
  ): void {
    const createdAt = new Date().toISOString();
    const updatedState = updater(this.state);
    const player = updatedState.players.find((entry) => entry.seatId === seatId);
    const existingResolution = updatedState.activeResolution ?? this.state.activeResolution ?? null;
    const activeResolution: ActiveResolution = existingResolution
      ? {
          ...existingResolution,
          outcome: {
            title: existingResolution.outcome?.title ?? "Scenario pressure",
            text: [existingResolution.outcome?.text, summary].filter(Boolean).join(" "),
            effects: [...(existingResolution.outcome?.effects ?? []), summary]
          }
        }
      : {
          id: `${seatId}:scenario:ambient:${createdAt}`,
          playerId: seatId,
          source: "scenario",
          stage: "outcome_summary",
          card: {
            id: this.state.activeScenarioId,
            title: "Scenario Pressure",
            type: "scenario",
            flavor: summary
          },
          outcome: {
            title: "Scenario pressure",
            text: summary,
            effects: [summary]
          }
        };

    this.state = {
      ...updatedState,
      sequence: updatedState.sequence + 1,
      activeResolution,
      lastOutcomeSummary: {
        seatId,
        movedToSectorId: player?.sectorId ?? "unknown",
        encounterCardId: null,
        encounterTitle: "Scenario Pressure",
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
        summary
      },
      eventLog: [...updatedState.eventLog, { type: "SCENARIO_AMBIENT_APPLIED", seatId, summary, createdAt }]
    };
  }

  private applyScenarioAmbientResolution(seatId: string, resolution: ScenarioAmbientResolution | null): void {
    if (!resolution) {
      return;
    }

    this.applyAmbientScenarioMutation(seatId, resolution.updater, resolution.summary);

    if (resolution.escalationDelta) {
      this.feedEscalation(seatId, resolution.escalationDelta, resolution.escalationReason ?? "scenario pressure");
    }

    if (resolution.followUp?.type === "draw_sector_threat") {
      this.applyAmbientSectorThreatDraw(seatId, resolution.summary);
    }
  }

  private applyAmbientSectorThreatDraw(seatId: string, reasonSummary: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || this.state.status !== "active") {
      return;
    }

    const sector = this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

    if (!sector) {
      return;
    }

    const lane = getBoardSpace(sector.id)?.threatIcons[0] ?? null;
    const drawnThreatId = lane ? this.peekGlobalThreatId(lane, seatId) : null;
    const drawnThreat = drawnThreatId ? this.threats.get(drawnThreatId) ?? null : null;
    const threatDrawBags = lane && drawnThreat
      ? {
          ...(this.state.threatDrawBags ?? {}),
          [lane]: {
            ...(this.state.threatDrawBags?.[lane] ?? { cycle: 1, remainingCardIds: [] }),
            remainingCardIds: (this.state.threatDrawBags?.[lane]?.remainingCardIds ?? []).slice(1)
          }
        }
      : this.state.threatDrawBags;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: "action",
      resolutionSource: null,
      currentEncounter: drawnThreat,
      threatDrawBags,
      recentEncounterCardIds: this.getRecentEncounterCardIdsAfterDraw(drawnThreat?.id),
      pendingEnemyRoll: null,
      pendingEffect: null,
      activeResolution: drawnThreat
        ? {
            id: `${seatId}:threat:${drawnThreat.id}:${Date.now()}`,
            playerId: seatId,
            source: "threat",
            stage: "card_reveal",
            card: {
              id: drawnThreat.id,
              title: drawnThreat.title,
              type: getThreatPresentationCategory(drawnThreat),
              flavor: drawnThreat.flavor,
              artType: "threat"
            },
            origin: {
              sourceDeck: drawnThreat.threatLane ?? "threat",
              sourceSectorId: sector.id,
              sourceEventId: `${seatId}:ambient-threat:${drawnThreat.id}:${this.state.sequence + 1}`,
              queuePosition: 0,
              privacy: "public"
            },
            battle: {
              enemyName: drawnThreat.cardType === "enemy" ? drawnThreat.enemyName : drawnThreat.title,
              stat: drawnThreat.stat,
              difficulty: drawnThreat.difficulty,
              modifiers: []
            },
            outcome: {
              title: "Card revealed",
              text: `${reasonSummary} ${drawnThreat.title} stirs in ${sector.name}.`,
              effects: []
            }
          }
        : this.state.activeResolution ?? null,
      sectors: this.state.sectors,
      lastOutcomeSummary: {
        seatId,
        movedToSectorId: sector.id,
        encounterCardId: drawnThreat?.id ?? null,
        encounterTitle: drawnThreat?.title ?? sector.name,
        encounterCardType: drawnThreat?.cardType ?? null,
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
        success: drawnThreat ? false : null,
        summary: drawnThreat
          ? `${reasonSummary} ${drawnThreat.title} stirs in ${sector.name}.`
          : `${reasonSummary} ${sector.name} holds, but no threat answers the surge.`
      },
      eventLog: [
        ...this.state.eventLog,
        {
          type: "SCENARIO_AMBIENT_APPLIED",
          seatId,
          summary: drawnThreat
            ? `Ambient threat draw: ${drawnThreat.title} rises in ${sector.name}.`
            : `Ambient threat draw: ${sector.name} had no printed Threat lane to reveal.`,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  private applyStartOfTurnScenarioEffects(seatId: string): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioTurnStart({
        state: this.state,
        seatId,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyEndOfTurnScenarioEffects(seatId: string): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioTurnEnd({
        state: this.state,
        seatId,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioOnEnemyDefeat(seatId: string): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioEnemyDefeat({
        state: this.state,
        seatId,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioOnContractCompleted(seatId: string): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioContractCompleted({
        state: this.state,
        seatId,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioObjectiveTrigger(seatId: string, event: ScenarioObjectiveTriggerEvent): void {
    const result = resolveScenarioObjectiveTrigger(this.state, event);

    if (!result) {
      return;
    }

    if (result.scenarioId === "scenario_broken_seal") {
      const sourceIdentity = event.type === "contractCompleted"
        ? event.contractId
        : event.type === "threatDefeated"
          ? event.threatId
          : event.effectKey;
      this.applyAction({
        type: "SCENARIO_PREPARATION_GAINED",
        seatId,
        scenarioId: result.scenarioId,
        resourceKey: "sealIntegrity",
        amount: result.amount,
        maximum: getBrokenSealTokenLimit(this.state.sessionMode),
        sourceEventId: `${result.scenarioId}:${event.type}:${sourceIdentity}:${this.state.sequence}`,
        objectiveId: `${event.type}:${sourceIdentity}`,
        summary: `The Broken Seal preparation advanced. Seal Integrity restored by ${result.amount}.`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioPreparationGainedAction);
      return;
    }

    this.applyAction({
      type: "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED",
      seatId,
      scenarioId: result.scenarioId,
      progressKey: result.progressKey,
      amount: result.amount,
      required: result.required,
      triggerType: result.triggerType,
      summary: result.summary,
      createdAt: new Date().toISOString()
    } satisfies ScenarioObjectiveProgressTriggeredAction);

    if (result.completed && this.state.status === "active") {
      this.applyAction({
        type: "SCENARIO_OBJECTIVE_COMPLETED",
        seatId,
        scenarioId: result.scenarioId,
        summary: `${getScenarioDefinition(result.scenarioId)?.name ?? "Scenario"} completed. Public objective reached ${result.next}/${result.required}.`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioObjectiveCompletedAction);
    }
  }

  private applyRivalryAgendaProgressTrigger(seatId: string, event: RivalryAgendaTriggerEvent): void {
    const result = resolveRivalryAgendaTrigger(this.state, event);

    if (!result) {
      return;
    }

    this.applyAction({
      type: "RIVALRY_AGENDA_PROGRESS_TRIGGERED",
      seatId,
      agendaId: result.agendaId,
      triggerType: result.triggerType,
      progressLabel: result.progressLabel,
      amount: result.amount,
      required: result.required,
      completed: result.completed,
      pointsAwarded: result.pointsAwarded,
      publicCompletionTitle: result.publicCompletionTitle,
      publicCompletionSummary: result.publicCompletionSummary,
      privateCompletionSummary: result.privateCompletionSummary,
      summary: result.summary,
      createdAt: new Date().toISOString()
    } satisfies RivalryAgendaProgressTriggeredAction);
  }

  private applyScenarioObjectiveOnContractCompleted(seatId: string, contractId: string): void {
    const contract = this.resolveContract(this.contracts.get(contractId));
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!contract) {
      return;
    }

    this.applyScenarioObjectiveTrigger(seatId, buildContractCompletedObjectiveEvent(contract, player?.sectorId));
  }

  private applyScenarioOnWoundsTaken(seatId: string, woundDelta: number): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioWoundsTaken({
        state: this.state,
        seatId,
        woundDelta,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioOnGearGained(seatId: string, gainedGearCount: number): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioGearGained({
        state: this.state,
        seatId,
        gainedGearCount,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioOnSkillResolved(seatId: string, stat: Stat, success: boolean): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioSkillResolved({
        state: this.state,
        seatId,
        stat,
        success,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private applyScenarioOnSectorEntered(seatId: string, sectorId: string): void {
    this.applyScenarioAmbientResolution(
      seatId,
      resolveScenarioSectorEntered({
        state: this.state,
        seatId,
        sectorId,
        rollDie: () => this.randomSource.nextInt(6) + 1,
        getCounter: (key, fallback = 0) => this.getScenarioCounter(key, fallback),
        getOuterRingSectorIds: () => this.getOuterRingSectorIds()
      })
    );
  }

  private kickSeat(targetSeatId: string): void {
    const seat = this.state.seats.find((entry) => entry.seatId === targetSeatId);

    if (!seat) {
      throw new IntentRejectedError("KICK_SEAT", `Unknown seat ${targetSeatId}`);
    }

    if (seat.kicked) {
      throw new IntentRejectedError("KICK_SEAT", `Seat ${targetSeatId} has already been kicked`);
    }

    if (this.state.status === "active" && seat.displayName && !this.state.turnOrder.includes(targetSeatId)) {
      const pendingClient = [...this.clients].find((client) => client.view === "phone" && client.seatId === targetSeatId);
      if (pendingClient) {
        pendingClient.superseded = true;
        this.clients.delete(pendingClient);
        pendingClient.socket.close(4005, "Pending join cancelled by host");
      }
      this.releaseSeat(targetSeatId);
      return;
    }

    const remainingBeforeKick = this.getRemainingSeatIds();

    if (remainingBeforeKick.length <= 1) {
      throw new IntentRejectedError("KICK_SEAT", "Cannot kick the last remaining seat");
    }

    const nextTurnOrder = this.state.turnOrder.filter((seatId) => seatId !== targetSeatId);
    const remainingAfterKick = remainingBeforeKick.filter((seatId) => seatId !== targetSeatId);
    const kickedClient = [...this.clients].find((client) => client.view === "phone" && client.seatId === targetSeatId);

    if (kickedClient) {
      kickedClient.superseded = true;
      this.clients.delete(kickedClient);
      kickedClient.socket.close(4005, "Removed by host");
    }

    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
    const targetWasActive = activeSeatId === targetSeatId;
    const activeSeatStillPresent = activeSeatId ? nextTurnOrder.includes(activeSeatId) : false;
    const activeSeatIndex = targetWasActive
      ? 0
      : activeSeatStillPresent
        ? Math.max(nextTurnOrder.indexOf(activeSeatId ?? ""), 0)
        : 0;
    const nextActiveSeatId = nextTurnOrder[activeSeatIndex] ?? null;
    const nextActivePlayer = nextActiveSeatId
      ? this.state.players.find((player) => player.seatId === nextActiveSeatId)
      : null;
    const kickedEdgeCardIds = this.state.players
      .find((player) => player.seatId === targetSeatId)
      ?.private.hand.filter((cardId) => EDGE_CARD_BY_ID.has(cardId)) ?? [];

    this.state = {
      ...this.state,
      status: remainingAfterKick.length === 1 ? "ended" : this.state.status,
      winnerSeatId: remainingAfterKick.length === 1 ? remainingAfterKick[0] ?? null : null,
      phase:
        remainingAfterKick.length === 1
          ? "broadcast"
          : targetWasActive
            ? nextActivePlayer?.character.status === "recalled"
              ? "action"
              : "navigation"
            : this.state.phase,
      activeSeatIndex,
      turnOrder: nextTurnOrder,
      sequence: this.state.sequence + 1,
      currentEncounter: targetWasActive || remainingAfterKick.length === 1 ? null : this.state.currentEncounter,
      pendingEnemyRoll: targetWasActive || remainingAfterKick.length === 1 ? null : this.state.pendingEnemyRoll,
      pendingEffect: targetWasActive || remainingAfterKick.length === 1 ? null : this.state.pendingEffect,
      pendingEdgeCommit:
        this.state.pendingEdgeCommit?.seatId === targetSeatId
          ? null
          : this.state.pendingEdgeCommit,
      pendingEdgeAbility:
        this.state.pendingEdgeAbility?.seatId === targetSeatId
          ? null
          : this.state.pendingEdgeAbility,
      pendingEdgeReaction:
        this.state.pendingEdgeReaction?.ownerSeatId === targetSeatId
          ? null
          : this.state.pendingEdgeReaction,
      lastEdgeCardPlay:
        this.state.lastEdgeCardPlay?.seatId === targetSeatId
          ? null
          : this.state.lastEdgeCardPlay,
      edgeHazardSuppressions: (this.state.edgeHazardSuppressions ?? []).filter(
        (entry) => entry.seatId !== targetSeatId
      ),
      edgeDeck:
        this.state.edgeDeck && kickedEdgeCardIds.length > 0
          ? {
              ...this.state.edgeDeck,
              discardCardIds: [...this.state.edgeDeck.discardCardIds, ...kickedEdgeCardIds]
            }
          : this.state.edgeDeck,
      resolutionSource: targetWasActive || remainingAfterKick.length === 1 ? null : this.state.resolutionSource,
      lastOutcomeSummary:
        remainingAfterKick.length === 1
          ? {
              seatId: remainingAfterKick[0] ?? targetSeatId,
              movedToSectorId: nextActivePlayer?.sectorId ?? this.state.players[0]?.sectorId ?? "unknown",
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
              success: true,
              summary: `${this.getSeatLabel(remainingAfterKick[0] ?? "")} is the last seat standing.`
            }
          : targetWasActive
            ? {
                seatId: targetSeatId,
                movedToSectorId: nextActivePlayer?.sectorId ?? this.state.players[0]?.sectorId ?? "unknown",
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
                summary: `${this.getSeatLabel(targetSeatId)} was removed by the host.`
              }
            : this.state.lastOutcomeSummary,
      seats: this.state.seats.map((entry) =>
        entry.seatId === targetSeatId
          ? {
              ...entry,
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              connected: false,
              ready: false,
              kicked: true
            }
          : entry
      ),
      players: this.state.players.map((player) =>
        player.seatId === targetSeatId && kickedEdgeCardIds.length > 0
          ? {
              ...player,
              private: {
                ...player.private,
                hand: player.private.hand.filter((cardId) => !EDGE_CARD_BY_ID.has(cardId))
              }
            }
          : player
      ),
      eventLog: [...this.state.eventLog, { type: "KICK_SEAT", targetSeatId, createdAt: new Date().toISOString() }]
    };

    if (!targetWasActive && remainingAfterKick.length > 1) {
      this.recoverPendingEnemyRollForLeavingSeat(targetSeatId);
    }
  }

  private restartActiveSession(reconfigureLobby = false): void {
    const connectedTurnOrder = this.getConnectedRestartSeatIds();
    if (this.movementPresentationTimeout) {
      clearTimeout(this.movementPresentationTimeout);
      this.movementPresentationTimeout = null;
    }

    this.state = {
      ...this.state,
      status: "lobby",
      lobbyConfigured: reconfigureLobby ? false : this.state.lobbyConfigured,
      winnerSeatId: null,
      phase: "start",
      resolutionSource: null,
      activeSeatIndex: 0,
      turnOrder: connectedTurnOrder,
      scenarioProgress: createInitialScenarioProgress(this.state.activeScenarioId, this.state.sessionMode),
      scenarioPreparation: createInitialScenarioPreparation(this.state.activeScenarioId, this.state.sessionMode),
      scenarioConfrontation: createEmptyScenarioConfrontationState(),
      scenarioResult: createEmptyScenarioResultState(),
      nemesisChampions: [],
      nemesisNexusCountdowns: [],
      sequence: this.state.sequence + 1,
      escalationLevel: 0,
      currentEncounter: null,
      recentEncounterCardIds: [],
      threatDrawBags: {},
      scenarioAssaultBag: null,
      pendingScenarioAssault: null,
      movementPresentationGate: null,
      devouredThreatSectorIds: [],
      sectors: this.state.sectors.map((sector) => ({ ...sector, persistentThreatIds: [] })),
      tileArrivalThreatProgress: null,
      tileChallengeProgress: null,
      pendingEnemyRoll: null,
      edgeDeck: null,
      pendingEdgeCommit: null,
      pendingEdgeAbility: null,
      pendingEdgeReaction: null,
      resolvedEdgeReactionIds: [],
      edgeHazardSuppressions: [],
      lastEdgeCardPlay: null,
      pendingEffect: null,
      lastOutcomeSummary: null,
      seats: this.state.seats.map((seat) =>
        seat.kicked
          ? seat
          : {
              ...seat,
              characterSelected: false,
              startingContractOptions: [],
              selectedStartingContractId: null,
              missionSelectedAt: null,
              startingBonusOfferId: null,
              startingBonusOfferOptions: [],
              startingBonusSelections: [],
              ready: false
            }
      ),
      players: this.state.players.map((player) => {
        const seat = this.state.seats.find((entry) => entry.seatId === player.seatId);

        if (!seat || seat.kicked) {
          return player;
        }

        const startSectorId = this.getStartingSectorId(player.seatId);

        return {
          ...player,
          sectorId: startSectorId,
          private: {
            hand: [],
            notes: []
          },
          character: this.createFreshCharacter(seat.characterId, startSectorId)
        };
      }),
      eventLog: [
        ...this.state.eventLog,
        { type: reconfigureLobby ? "RETURN_TO_LOBBY" : "RESTART_SESSION", createdAt: new Date().toISOString() }
      ]
    };
    this.setupScenarioPreview = null;
  }

  private getSeatLabel(seatId: string): string {
    const seat = this.state.seats.find((entry) => entry.seatId === seatId);
    return seat?.displayName ?? seatId;
  }

  private getThreatEffectContext(seatId: string, card: ThreatCard) {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${seatId}`);
    }

    const sector = this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

    return {
      state: this.state,
      seatId,
      card,
      player,
      spaceId: player.character.currentSpaceId,
      region: this.getThreatRegionFromSector(sector?.regionTier) ?? card.region,
      escalationLevel: this.state.escalationLevel
    };
  }

  private getThreatRegionFromSector(regionTier: string | undefined): "outer" | "middle" | "inner" | "center" | undefined {
    if (regionTier === "borderlight") {
      return "outer";
    }

    if (regionTier === "red_march") {
      return "middle";
    }

    if (regionTier === "crownfall") {
      return "inner";
    }

    if (regionTier === "cinder_gate") {
      return "center";
    }

    return undefined;
  }

  private resolveThreatEffectKey(
    seatId: string,
    card: ThreatCard,
    key: string | undefined,
    timing: ThreatEffectTiming
  ): ThreatEffectResult | null {
    if (!key) {
      return null;
    }

    if (!isThreatEffectKey(key)) {
      throw new Error(`Unknown threat effect key ${key}`);
    }

    if (getThreatEffectTiming(key) !== timing) {
      throw new Error(`Threat effect key ${key} cannot run during ${timing}`);
    }

    const result = resolveThreatEffect(key, this.getThreatEffectContext(seatId, card));
    return result;
  }

  private resolveThreatEffectKeys(
    seatId: string,
    card: ThreatCard,
    keys: string[] | undefined,
    timing: ThreatEffectTiming
  ): ThreatEffectResult {
    const initial: ThreatEffectResult = {
      effect: null,
      difficultyModifier: 0,
      playerBonusModifier: 0,
      enemyBonusModifier: 0
    };

    return (keys ?? []).reduce<ThreatEffectResult>(
      (combined, key) => {
        const result = this.resolveThreatEffectKey(seatId, card, key, timing);

        if (!result) {
          return combined;
        }

        return {
          effect: this.combineEffects([combined.effect, result.effect].filter((effect): effect is EncounterEffect => Boolean(effect))),
          difficultyModifier: (combined.difficultyModifier ?? 0) + (result.difficultyModifier ?? 0),
          playerBonusModifier: (combined.playerBonusModifier ?? 0) + (result.playerBonusModifier ?? 0),
          enemyBonusModifier: (combined.enemyBonusModifier ?? 0) + (result.enemyBonusModifier ?? 0),
          summary: [combined.summary, result.summary].filter(Boolean).join(" ")
        } satisfies ThreatEffectResult;
      },
      initial
    );
  }

  private resolveThreatOutcomeEffect(
    seatId: string,
    card: ThreatCard,
    baseEffect: EncounterEffect,
    effectKey: string | undefined,
    timing: "onSuccess" | "onFailure" | "onDefeat"
  ): EncounterEffect;
  private resolveThreatOutcomeEffect(
    seatId: string,
    card: ThreatCard,
    baseEffect: EncounterEffect | undefined,
    effectKey: string | undefined,
    timing: "onSuccess" | "onFailure" | "onDefeat"
  ): EncounterEffect | null;
  private resolveThreatOutcomeEffect(
    seatId: string,
    card: ThreatCard,
    baseEffect: EncounterEffect | undefined,
    effectKey: string | undefined,
    timing: "onSuccess" | "onFailure" | "onDefeat"
  ): EncounterEffect | null {
    const keyedEffect = this.resolveThreatEffectKey(seatId, card, effectKey, timing)?.effect ?? null;
    const combinedEffect = this.combineEffects(
      [baseEffect, keyedEffect].filter((effect): effect is EncounterEffect => Boolean(effect))
    );
    return combinedEffect ? this.resolveEffect(combinedEffect, seatId, card.id) : null;
  }

  private resolveNextAfflictionDraw(): void {
    const pending = this.state.pendingAfflictionResolution;
    if (!pending || pending.status !== "queued") return;

    const player = this.state.players.find((entry) => entry.seatId === pending.ownerSeatId);
    if (!player) {
      throw new Error(`Missing Affliction owner ${pending.ownerSeatId}`);
    }

    const cards = [...getAfflictionCatalog(this.state).values()].sort((left, right) => left.id.localeCompare(right.id));
    if (cards.length === 0) {
      throw new Error("Affliction deck is unavailable");
    }

    let affliction = pending.nextAfflictionId
      ? cards.find((entry) => entry.id === pending.nextAfflictionId) ?? null
      : null;
    let die = pending.nextDie ?? null;

    if (!affliction) {
      const usedInCycle = new Set<string>();
      for (const cardId of player.afflictionDrawHistory ?? []) {
        if (usedInCycle.has(cardId)) usedInCycle.clear();
        usedInCycle.add(cardId);
        if (usedInCycle.size >= cards.length) usedInCycle.clear();
      }
      const excluded = new Set(pending.excludedCardIds);
      let eligible = cards.filter((entry) => !usedInCycle.has(entry.id) && !excluded.has(entry.id));
      if (eligible.length === 0) {
        eligible = cards.filter((entry) => !excluded.has(entry.id));
      }
      if (eligible.length === 0) {
        eligible = cards;
      }
      affliction = eligible[this.randomSource.nextInt(eligible.length)] ?? null;
      die = this.randomSource.nextInt(6) + 1;
    }

    if (!affliction || die === null) {
      throw new Error("Affliction draw could not be prepared");
    }

    const hasRunawayGrowth = (player.faceupAfflictions ?? []).some((entry) => entry.cardId === "runaway-growth");
    if (hasRunawayGrowth && pending.chosenStat === null) {
      this.applyAction({
        type: "AFFLICTION_DRAW_PREPARED",
        seatId: pending.ownerSeatId,
        resolutionId: pending.id,
        afflictionId: affliction.id,
        die,
        createdAt: new Date().toISOString()
      } satisfies AfflictionDrawPreparedAction);
      return;
    }

    this.applyAction({
      type: "AFFLICTION_DRAWN",
      seatId: pending.ownerSeatId,
      afflictionId: affliction.id,
      affliction,
      die,
      chosenStat: pending.chosenStat ?? undefined,
      createdAt: new Date().toISOString()
    } satisfies AfflictionDrawnAction);
  }

  private hasPendingResolutionDecision(): boolean {
    return Boolean(
      this.state.pendingEncounterDecision ||
      this.state.pendingGearEquipChoice ||
      this.state.pendingScarChoice ||
      this.state.pendingScarRemovalChoice ||
      this.state.pendingScarConsequence ||
      this.state.pendingMemoryTaxChoice ||
      this.state.pendingEquipmentSuppressionChoice ||
      this.state.pendingForcedDestinationChoice ||
      this.state.pendingDisplacement ||
      this.state.pendingAfflictionReaction ||
      this.state.pendingEdgeReaction ||
      this.state.pendingFailureReaction ||
      this.state.pendingStaticIntercessionReaction ||
      this.state.cooperativeAssistance
    );
  }

  private hasAutomaticResolutionWork(seatId: string): boolean {
    return Boolean(
      this.state.pendingEffect ||
      this.state.pendingAfflictionResolution ||
      this.state.pendingSutureStormConsequence ||
      this.shouldTriggerWoundThreshold(seatId)
    );
  }

  private runAutomaticPhases(
    seatId: string,
    _options: { applyVisibleOutcomeEffect?: boolean } = {}
  ): void {
    let progressMade = true;

    while (progressMade) {
      progressMade = false;

      if (this.state.pendingAfflictionReaction) {
        return;
      }

      if (this.state.pendingAfflictionResolution) {
        if (this.state.pendingAfflictionResolution.status === "awaitingStatChoice") {
          return;
        }
        this.resolveNextAfflictionDraw();
        progressMade = true;
        continue;
      }

      if (this.state.activeResolution) {
        const stage = this.state.activeResolution.stage;

        if (stage === "roll_result") {
          if (this.hasPendingResolutionDecision()) return;
          this.applyAction({
            type: "CONTINUE_RESOLUTION",
            seatId,
            createdAt: new Date().toISOString()
          });
          progressMade = true;
          continue;
        }

        if (stage === "outcome_summary") {
          if (this.hasPendingResolutionDecision()) return;
          if (!this.hasAutomaticResolutionWork(seatId)) {
            this.applyAction({
              type: "CONTINUE_RESOLUTION",
              seatId,
              createdAt: new Date().toISOString()
            });
            return;
          }
        } else if (["card_reveal", "battle_setup", "dice_roll", "awaiting_continue"].includes(stage)) {
          return;
        }
      }

      if (this.state.pendingEncounterDecision) {
        return;
      }

      if (this.state.pendingScarChoice) {
        return;
      }

      if (
        this.state.pendingScarThreshold &&
        !this.state.pendingEffect &&
        !this.state.pendingScarConsequence &&
        !this.state.pendingFailureReaction &&
        !this.state.pendingTileChallenge &&
        !this.state.activeResolution
      ) {
        this.applyAction({
          type: "SCAR_THRESHOLD_RESOLVED",
          seatId: this.state.pendingScarThreshold.seatId,
          policy: this.state.pendingScarThreshold.policy,
          createdAt: new Date().toISOString()
        });
        progressMade = true;
        continue;
      }

      if (this.state.pendingMemoryTaxChoice) {
        return;
      }

      if (this.state.pendingForcedDestinationChoice) {
        return;
      }

      if (this.state.pendingDisplacement) {
        return;
      }

      if (this.state.pendingSutureStormConsequence?.stage === "afterInitialWound") {
        if (this.shouldTriggerWoundThreshold(seatId)) {
          const player = this.state.players.find((entry) => entry.seatId === seatId);
          this.applyAction({
            type: "WOUND_THRESHOLD_REACHED",
            seatId,
            threshold: this.state.woundThreshold,
            newWoundTotal: player?.character.wounds ?? 0,
            createdAt: new Date().toISOString()
          });
          progressMade = true;
          continue;
        }
        this.applyAction({ type: "SUTURE_STORM_CONTINUED", seatId, createdAt: new Date().toISOString() });
        progressMade = true;
        continue;
      }

      if (this.state.pendingSutureStormConsequence?.stage === "fallbackWound" && this.state.pendingEffect) {
        const protectedFallback = this.maybeApplyKerWoundPrevention(
          seatId,
          this.maybeApplyFandiablosWoundPrevention(seatId, this.state.pendingEffect)
        );
        this.state = { ...this.state, pendingEffect: protectedFallback };
        this.applyAction({
          type: "RESOLUTION_APPLIED",
          seatId,
          effect: protectedFallback,
          sourceCardId: "suture-storm",
          success: false,
          createdAt: new Date().toISOString()
        });
        progressMade = true;
        continue;
      }

      if (
        !this.state.pendingMissionSelection &&
        (this.state.pendingMissionRewards?.length ?? 0) > 0 &&
        !this.state.pendingEffect &&
        !this.state.currentEncounter &&
        !this.state.activeResolution &&
        !this.state.pendingEnemyRoll &&
        this.state.phase !== "resolution"
      ) {
        this.prepareNextMissionSelection(seatId);
        progressMade = Boolean(this.state.pendingMissionSelection);
      }

      if (this.state.pendingMissionSelection) {
        this.activateQueuedReplacementMissionSelection(this.state.pendingMissionSelection.ownerSeatId);
        return;
      }

      if (this.completeSatisfiedContract(seatId)) {
        progressMade = true;
        continue;
      }

      if (this.state.phase === "sector") {
        if (this.startNextTileChallenge(seatId)) {
          return;
        }
        if (this.shouldDrawEncounterForCurrentSector(seatId)) {
          const encounterAction = this.createEncounterDrawnAction(seatId);
          this.applyAction(encounterAction);
        } else {
          this.applyAction({
            type: "PHASE_ADVANCED",
            seatId,
            toPhase: "action",
            createdAt: new Date().toISOString()
          });
        }
        progressMade = true;
        continue;
      }

      if (this.state.phase === "resolution" && this.state.pendingEffect) {
        const pendingEffect = this.state.pendingEffect;
        const pendingEncounter = this.state.currentEncounter;
        const pendingResolution = this.state.activeResolution;
        const failedCheckSource = [...this.state.eventLog].reverse().find((entry) => {
          const candidate = entry as { type?: string; seatId?: string; cardId?: string; success?: boolean };
          return candidate.type === "CHECK_ROLLED" && candidate.seatId === seatId && candidate.cardId === pendingEncounter?.id && candidate.success === false;
        }) as { createdAt?: unknown } | undefined;
        const sourceResolutionId =
          typeof failedCheckSource?.createdAt === "string"
            ? `${seatId}:threat:${pendingEncounter?.id}:${failedCheckSource.createdAt}`
            : pendingResolution?.id ?? null;
        const shatteredBarricadeEscalation =
          pendingEncounter?.id === "shattered-barricade" &&
          pendingEffect.type === "advance_escalation" &&
          pendingEffect.amount === 1 &&
          this.state.lastOutcomeSummary?.success === false &&
          Boolean(sourceResolutionId)
            ? {
                cardId: pendingEncounter.id,
                eventId: `${sourceResolutionId}:global-escalation`,
                amount: pendingEffect.amount
              }
            : null;
        const gateblindPulseEscalation =
          pendingEncounter?.id === "gateblind-pulse" &&
          pendingEffect.type === "gain_global_escalation_guarded" &&
          pendingEffect.sourceCardId === "gateblind-pulse" &&
          pendingEffect.amount === 1 &&
          pendingEffect.guard === "oneBeforeCollapse" &&
          this.state.lastOutcomeSummary?.success === false &&
          Boolean(sourceResolutionId)
            ? {
                cardId: pendingEncounter.id,
                eventId: `${sourceResolutionId}:global-escalation`,
                amount: pendingEffect.amount,
                guard: pendingEffect.guard
              }
            : null;
        this.applyAction({
          type: "RESOLUTION_APPLIED",
          seatId,
          effect: pendingEffect,
          sourceCardId: pendingEncounter?.id ?? null,
          success: this.state.lastOutcomeSummary?.success ?? null,
          createdAt: new Date().toISOString()
        });
        if (shatteredBarricadeEscalation) {
          this.feedEscalation(seatId, shatteredBarricadeEscalation.amount, "Shattered Barricade", {
            cardId: shatteredBarricadeEscalation.cardId,
            eventId: shatteredBarricadeEscalation.eventId
          });
        }
        if (gateblindPulseEscalation) {
          this.feedEscalation(seatId, gateblindPulseEscalation.amount, "Gateblind Pulse", {
            cardId: gateblindPulseEscalation.cardId,
            eventId: gateblindPulseEscalation.eventId,
            guard: gateblindPulseEscalation.guard
          });
        }
        progressMade = true;
        continue;
      }

      if (this.state.phase === "resolution" && this.shouldTriggerWoundThreshold(seatId)) {
        const player = this.state.players.find((entry) => entry.seatId === seatId);

        this.applyAction({
          type: "WOUND_THRESHOLD_REACHED",
          seatId,
          threshold: this.state.woundThreshold,
          newWoundTotal: player?.character.wounds ?? 0,
          createdAt: new Date().toISOString()
        });
        progressMade = true;
        continue;
      }

      if (this.state.phase === "resolution" && !this.state.pendingEffect) {
        if (this.state.resolutionSource === "tileChallenge" && this.state.pendingTileChallenge) {
          const pending = this.state.pendingTileChallenge;
          const progress = this.state.tileChallengeProgress;
          const success = this.state.lastOutcomeSummary?.success === true;
          this.state = {
            ...this.state,
            pendingTileChallenge: null,
            pendingStaticIntercessionReaction: null,
            tileChallengeProgress: {
              seatId: pending.seatId,
              sectorId: pending.sectorId,
              resolvedChallengeIds: [...new Set([...(progress?.resolvedChallengeIds ?? []), pending.challengeId])]
            }
          };
          this.maybeAdvanceContractObjective(pending.seatId, {
            type: "tile-challenge-resolved",
            challengeId: pending.challengeId,
            sectorId: pending.sectorId,
            challengeType: pending.challengeType,
            challengeTags: pending.sourceTags,
            testStat: pending.testStat,
            success
          }, `Resolved ${pending.challengeId} at ${pending.sectorId} (${pending.challengeType}, ${pending.testStat}, ${success ? "success" : "failure"}).`);
        }
        this.recordCurrentThreatArrivalOutcome(seatId);
        const nextPhase = this.getPhaseAfterResolution(seatId);

        this.applyAction({
          type: "PHASE_ADVANCED",
          seatId,
          toPhase: nextPhase,
          createdAt: new Date().toISOString()
        });
        this.finishRandomScenarioAssault(seatId);
        progressMade = true;
      }
    }
  }

  private recordCurrentThreatArrivalOutcome(seatId: string): void {
    if (this.state.resolutionSource !== "encounter" || !this.state.currentEncounter) return;
    const progress = this.getTileArrivalThreatProgress(seatId);
    if (!progress || progress.nextThreatIconIndex <= 0) return;
    const resolvedIndex = progress.nextThreatIconIndex - 1;
    const ruleId = progress.threatRuleIds[resolvedIndex];
    const lane = progress.threatLanes[resolvedIndex];
    if (!ruleId || !lane) return;
    if ((progress.resolvedThreatOutcomes ?? []).some((entry) => entry.ruleId === ruleId)) return;

    this.applyAction({
      type: "THREAT_ARRIVAL_OUTCOME_RECORDED",
      seatId,
      arrivalId: progress.arrivalId,
      ruleId,
      lane,
      cardId: this.state.currentEncounter.id,
      success: this.state.activeResolution?.roll?.success ?? this.state.lastOutcomeSummary?.success === true,
      queueComplete: progress.nextThreatIconIndex >= progress.threatLanes.length,
      createdAt: new Date().toISOString()
    });
  }

  private getPhaseAfterResolution(seatId: string): GameState["phase"] {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const boardSpace = player ? getBoardSpace(player.character.currentSpaceId) : null;

    if (this.state.pendingDisplacementArrival?.seatId === seatId) {
      return "sector";
    }

    if (this.state.resolutionSource === "tileChallenge") {
      return "sector";
    }

    if (this.state.resolutionSource === "encounter" && player && boardSpace && this.state.tileArrivalThreatProgress) {
      const progress = this.getTileArrivalThreatProgress(seatId);
      if (progress && progress.nextThreatIconIndex < progress.threatLanes.length) return "sector";
    }

    if (
      this.state.resolutionSource === "movement" &&
      player?.character.status === "active" &&
      this.state.lastOutcomeSummary?.success !== false
    ) {
      return "sector";
    }

    if (
      this.state.resolutionSource === "encounter" &&
      player?.character.status === "active" &&
      boardSpace !== null &&
      boardSpace.textBox.intent !== "scenario-confrontation"
    ) {
      // A cleared arrival encounter opens the destination's normal action
      // window. It must not re-enter `sector`, which would draw another card
      // merely because the printed lane deck still contains cards.
      return "action";
    }

    return "broadcast";
  }

  private startNextTileChallenge(seatId: string): boolean {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const sector = player ? this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId) : null;

    if (!player || !sector || player.character.status !== "active") return false;

    const existingProgress = this.state.tileChallengeProgress;
    const progress = existingProgress?.seatId === seatId && existingProgress.sectorId === sector.id
      ? existingProgress
      : { seatId, sectorId: sector.id, resolvedChallengeIds: [] };
    const ordered = [...(sector.tileChallenges ?? [])]
      .filter((challenge) => challenge.trigger === "onArrival")
      .sort((a, b) => a.authoredOrder - b.authoredOrder);
    const challenge = ordered.find((entry) => !progress.resolvedChallengeIds.includes(entry.id));

    if (!challenge) {
      if (this.state.tileChallengeProgress !== progress) this.state = { ...this.state, tileChallengeProgress: progress };
      return false;
    }

    const createdAt = new Date().toISOString();
    const encounter = {
      id: challenge.id,
      type: "threat" as const,
      cardType: "hazard" as const,
      title: challenge.name,
      text: `Recurring ${challenge.challengeType} challenge at ${sector.name}.`,
      flavor: challenge.lore,
      severity: Math.max(1, Math.min(5, Math.ceil(challenge.difficulty / 3))),
      stat: challenge.testStat,
      difficulty: challenge.difficulty,
      successEffect: challenge.successEffect,
      failEffect: challenge.failureEffect,
      enemyFamily: "hazard" as const,
      threatLane: "blue" as const,
      rarity: "common" as const,
      tempo: "stall" as const
    };

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: "action",
      resolutionSource: "tileChallenge",
      tileChallengeProgress: progress,
      pendingTileChallenge: {
        id: `tile-challenge:${sector.id}:${challenge.id}:${seatId}:${createdAt}`,
        challengeId: challenge.id,
        sectorId: sector.id,
        seatId,
        challengeType: challenge.challengeType,
        testStat: challenge.testStat,
        difficulty: challenge.difficulty,
        sourceTags: challenge.tags,
        successEffect: challenge.successEffect,
        failureEffect: challenge.failureEffect,
        authoredOrder: challenge.authoredOrder,
        totalChallenges: ordered.length,
        rolled: false,
        modifierSources: [],
        createdAt
      },
      currentEncounter: encounter,
      activeResolution: {
        id: `tile-challenge:${seatId}:${challenge.id}:${createdAt}`,
        playerId: seatId,
        source: challenge.challengeType === "anomaly" ? "anomaly" : "threat",
        stage: "card_reveal",
        card: { id: challenge.artCardId, title: challenge.name, type: challenge.challengeType, flavor: challenge.lore, artType: "threat" },
        battle: { enemyName: challenge.name, stat: challenge.testStat, difficulty: challenge.difficulty, modifiers: [] },
        outcome: { title: "Recurring tile challenge", text: `${challenge.name} remains on ${sector.name} after resolution.`, effects: [] }
      },
      eventLog: [...this.state.eventLog, { type: "TILE_CHALLENGE_STARTED", seatId, challengeId: challenge.id, sectorId: sector.id, createdAt }]
    };
    return true;
  }

  private completeBroadcastTurn(seatId: string): void {
    this.applyEndOfTurnScenarioEffects(seatId);

    if (this.state.status !== "active") {
      this.broadcastPatch();
      return;
    }

    this.advanceNemesisNexusCountdowns(seatId);

    if (this.state.status !== "active") {
      this.broadcastPatch();
      return;
    }

    this.activateBoundNemesis(seatId);

    if (this.state.status !== "active") {
      this.broadcastPatch();
      return;
    }

    this.checkCoopOperativeDefeat(seatId);

    if (this.state.status !== "active") {
      this.broadcastPatch();
      return;
    }

    const previousActiveSeatIndex = this.state.activeSeatIndex;
    const suppressRoundEscalation = this.shouldSuppressRoundEscalationAfterStabilization(seatId);

    this.applyAction({
      type: "TURN_COMPLETED",
      seatId,
      createdAt: new Date().toISOString()
    });

    const roundWrapped =
      this.state.status === "active" &&
      this.didRoundWrap(previousActiveSeatIndex, this.state.activeSeatIndex);
    if (roundWrapped) {
      if (!suppressRoundEscalation) {
        this.applyRoundEscalation(seatId);
      }
    }

    const scenarioAssaultStarted =
      this.state.status === "active" &&
      roundWrapped &&
      this.maybeStartRandomScenarioAssault();

    if (this.state.status === "active") {
      const nextSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
      if (nextSeatId && !scenarioAssaultStarted) {
        this.applyStartOfTurnScenarioEffects(nextSeatId);
        this.maybeTriggerAbilityOnTurnStarted(nextSeatId);
        this.emitMovementDiagnostic("turn-completed", nextSeatId);
      }
    }

    this.broadcastPatch();
  }

  private shouldSuppressRoundEscalationAfterStabilization(seatId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const entry = this.state.eventLog[index] as Record<string, unknown> | undefined;

      if (!entry) {
        continue;
      }

      if (entry.type === "TURN_COMPLETED" || entry.type === "ROUND_COMPLETED") {
        return false;
      }

      if (
        entry.type === "ESCALATION_ADVANCED" &&
        entry.seatId === seatId &&
        typeof entry.amount === "number" &&
        entry.amount < 0 &&
        (entry.reason === "sector stabilization" || entry.reason === "stabilized")
      ) {
        return true;
      }
    }

    return false;
  }

  private resolveMovementRollIntent(intent: Extract<ClientIntent, { type: "MOVEMENT_ROLL_REQUESTED" }>): void {
    if (this.state.status !== "active" || this.state.phase !== "navigation") {
      throw new IntentRejectedError("MOVEMENT_ROLL_REQUESTED", `Cannot roll movement during phase ${this.state.phase}`);
    }

    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;

    if (!activeSeatId || activeSeatId !== intent.seatId) {
      throw new IntentRejectedError("MOVEMENT_ROLL_REQUESTED", `Seat ${intent.seatId} cannot act outside its turn`);
    }

    if (this.state.movementRolls?.[activeSeatId]) {
      throw new IntentRejectedError("MOVEMENT_ROLL_REQUESTED", "Movement has already been rolled this turn");
    }

    const activePlayer = this.state.players.find((entry) => entry.seatId === activeSeatId);

    if (!activePlayer || activePlayer.character.status !== "active") {
      throw new IntentRejectedError("MOVEMENT_ROLL_REQUESTED", `Seat ${intent.seatId} must recruit a replacement before acting`);
    }

    const boardSpace = getBoardSpace(activePlayer.character.currentSpaceId);
    if (boardSpace?.tier === "inner") {
      throw new IntentRejectedError(
        "MOVEMENT_ROLL_REQUESTED",
        isInnerApproachChallengeCleared(this.state, activePlayer)
          ? "Choose one connected inner approach step instead of rolling movement"
          : `Clear ${boardSpace.name} before advancing`
      );
    }
    const movementProfile = boardSpace ? getMovementProfile(boardSpace.tier) : null;
    const roll =
      movementProfile && !movementProfile.movementRollAllowed
        ? { faces: movementProfile.movementAmount ? [movementProfile.movementAmount] : [], total: movementProfile.movementAmount ?? 0 }
        : activePlayer.character.id === "char_ker_von_ker"
          ? (() => {
              const dice = rollDice(2, 6, this.randomSource);
              return { faces: dice.faces, total: Math.min(...dice.faces) };
            })()
          : rollDice(1, 6, this.randomSource);

    if (roll.total < 1) {
      throw new IntentRejectedError("MOVEMENT_ROLL_REQUESTED", "Movement is not available from this sector");
    }

    const createdAt = new Date().toISOString();
    const spindleModifier = getNextNormalMovementRollModifierSource(this.state, activeSeatId);
    const modifierSources = spindleModifier ? [spindleModifier] : [];
    const movementValue = resolveNormalMovementAllowance(roll.total, modifierSources);
    this.applyAction({
      type: "MOVEMENT_ROLLED",
      seatId: activeSeatId,
      movementValue,
      roll,
      resolutionId: `movement-roll:${activeSeatId}:${this.state.sequence + 1}:${createdAt}`,
      modifierSources,
      createdAt
    } satisfies MovementRolledAction);

    const plan = buildMovementRoutePlan(this.state, activeSeatId);
    this.emitMovementDiagnostic("movement-rolled", activeSeatId);
    if (plan && plan.routes.length === 0) {
      this.applyAction({
        type: "MOVEMENT_UNAVAILABLE_RESOLVED",
        seatId: activeSeatId,
        sourceSectorId: activePlayer.character.currentSpaceId,
        movementValue,
        reason: `No legal destination is available exactly ${movementValue} ${movementValue === 1 ? "step" : "steps"} away. Movement ends without changing sector.`,
        createdAt: new Date().toISOString()
      });
      this.emitMovementDiagnostic("movement-unavailable", activeSeatId);
    }
  }

  private didRoundWrap(previousActiveSeatIndex: number, nextActiveSeatIndex: number): boolean {
    return nextActiveSeatIndex <= previousActiveSeatIndex;
  }

  private applyRoundEscalation(seatId: string): void {
    this.applyAction({
      type: "ROUND_COMPLETED",
      seatId,
      createdAt: new Date().toISOString()
    } satisfies RoundCompletedAction);
    this.feedEscalation(seatId, 1, "round pressure");
  }

  private checkCoopOperativeDefeat(seatId: string): void {
    if (this.state.gameMode !== "nemesis_relay" || this.state.status !== "active") {
      return;
    }

    if (this.state.players.length > 0 && this.state.players.every((player) => player.character.status === "recalled")) {
      this.applyAction({
        type: "COOP_DEFEAT_TRIGGERED",
        seatId,
        summary: "All operatives were recalled before the Nemesis Relay was stopped.",
        createdAt: new Date().toISOString()
      });
    }
  }

  private createEncounterDrawnAction(seatId: string): EncounterDrawnAction {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${seatId}`);
    }

    const sector = this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

    if (!sector) {
      throw new Error(`Unknown sector ${player.character.currentSpaceId}`);
    }

    const lane = this.getNextCurrentSectorThreatLane(seatId);
    const persistentThreatId = lane
      ? (sector.persistentThreatIds ?? []).find((cardId) => this.threats.get(cardId)?.threatLane === lane) ?? null
      : null;
    const drawnThreatId = persistentThreatId
      ?? (lane
        ? this.peekGlobalThreatId(lane, seatId)
        : this.drawThreatIdWithSoftExile(sector.encounterDecks.threat));
    const drawSource: EncounterDrawnAction["drawSource"] = persistentThreatId
      ? "persistent"
      : lane
        ? "global-bag"
        : "legacy-local";
    const card = drawnThreatId ? this.threats.get(drawnThreatId) ?? null : null;
    const revealEffectKey = card?.revealEffectKey ?? card?.effectKey;
    const revealEffect = card ? this.resolveThreatEffectKey(seatId, card, revealEffectKey, "onReveal")?.effect ?? null : null;
    const progress = this.getTileArrivalThreatProgress(seatId);
    const nextProgress = progress
      ? { ...progress, nextThreatIconIndex: progress.nextThreatIconIndex + 1 }
      : undefined;

    return {
      type: "ENCOUNTER_DRAWN",
      seatId,
      sectorId: sector.id,
      card,
      revealEffect: revealEffect ? this.resolveEffect(revealEffect, seatId, card?.id) : null,
      continuationPhase: !card && nextProgress && nextProgress.nextThreatIconIndex < nextProgress.threatLanes.length
        ? "sector"
        : "action",
      tileArrivalThreatProgress: nextProgress,
      drawSource,
      createdAt: new Date().toISOString()
    };
  }

  private getTileArrivalThreatProgress(seatId: string): {
    arrivalId: string;
    seatId: string;
    sectorId: string;
    threatLanes: ThreatIcon[];
    threatRuleIds: string[];
    nextThreatIconIndex: number;
    resolvedThreatOutcomes?: Array<{
      ruleId: string;
      lane: ThreatIcon;
      cardId: string;
      success: boolean;
    }>;
    allThreatsSuccessful?: boolean | null;
  } | null {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player) return null;
    const existing = this.state.tileArrivalThreatProgress;
    const boardSpace = getBoardSpace(player.character.currentSpaceId);
    if (!boardSpace) return null;
    if (
      existing?.seatId === seatId &&
      existing.sectorId === player.character.currentSpaceId &&
      existing.threatLanes &&
      existing.threatRuleIds
    ) {
      return { ...existing, threatLanes: existing.threatLanes, threatRuleIds: existing.threatRuleIds };
    }
    const threatLanes: ThreatIcon[] = [];
    const threatRuleIds: string[] = [];
    const threatAccessConsumed =
      this.state.activeScenarioId === "scenario_devourer_beneath" &&
      (this.state.devouredThreatSectorIds ?? []).includes(boardSpace.id);
    if (!threatAccessConsumed) {
      const sector = this.state.sectors.find((entry) => entry.id === boardSpace.id);
      for (const persistentId of sector?.persistentThreatIds ?? []) {
        const persistentLane = this.threats.get(persistentId)?.threatLane;
        if (!persistentLane) continue;
        threatLanes.push(persistentLane);
        threatRuleIds.push(`persistent:${persistentId}:${persistentLane}`);
      }
      const extraThreatLane = getPersistentHazardExtraThreatLane(
        this.state,
        boardSpace.id,
        boardSpace.threatIcons[0]
      );
      const remaining = calculateExplorationDraws(boardSpace, this.getCurrentSectorThreatCards(player));
      boardSpace.threatIcons.forEach((lane, index) => {
        if (remaining[lane] > 0) {
          remaining[lane] -= 1;
          threatLanes.push(lane);
          threatRuleIds.push(`threat:${index}:${lane}`);
        }
        if (index === 0 && extraThreatLane === lane) {
          threatLanes.push(lane);
          threatRuleIds.push(`persistent-rule:deadwire-repeater:${lane}`);
        }
      });
    }
    return {
      arrivalId: existing?.arrivalId ?? `arrival:${seatId}:${player.character.currentSpaceId}:${this.state.sequence}`,
      seatId,
      sectorId: player.character.currentSpaceId,
      threatLanes,
      threatRuleIds,
      nextThreatIconIndex: existing?.nextThreatIconIndex ?? 0,
      resolvedThreatOutcomes: existing?.resolvedThreatOutcomes ?? [],
      allThreatsSuccessful: threatLanes.length === 0 ? true : existing?.allThreatsSuccessful ?? null
    };
  }

  private shouldDrawEncounterForCurrentSector(seatId: string): boolean {
    const counts = this.getCurrentSectorExplorationDrawCounts(seatId);

    if (!counts) {
      return this.getCurrentSectorThreatDeck(seatId).length > 0;
    }

    return counts.red > 0 || counts.blue > 0 || counts.yellow > 0;
  }

  private getNextCurrentSectorThreatLane(seatId: string): ThreatIcon | null {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const boardSpace = player ? getBoardSpace(player.character.currentSpaceId) : null;
    const progress = this.getTileArrivalThreatProgress(seatId);

    if (!boardSpace || !progress) {
      return null;
    }

    return progress.threatLanes[progress.nextThreatIconIndex] ?? null;
  }

  private getCurrentSectorExplorationDrawCounts(seatId: string): ExplorationDrawCounts | null {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || player.character.status !== "active") {
      return null;
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace) {
      return null;
    }

    const progress = this.getTileArrivalThreatProgress(seatId);
    const remaining = (progress?.threatLanes ?? []).slice(progress?.nextThreatIconIndex ?? 0);
    return remaining.reduce<ExplorationDrawCounts>((counts, lane) => {
      counts[lane] += 1;
      return counts;
    }, { red: 0, blue: 0, yellow: 0 });
  }

  private getCurrentSectorThreatCards(player: PlayerState): BoardThreatCard[] {
    const encounter = this.state.currentEncounter;

    if (!encounter || !this.isCurrentEncounterBlockingPlayerSector(player)) {
      return [];
    }

    const presentationCategory = getThreatPresentationCategory(encounter);
    const category: BoardThreatCard["category"] = presentationCategory === "hazard" ? "event" : presentationCategory;
    const icons = encounter.threatLane ? [encounter.threatLane] : [];

    return [{ id: encounter.id, category, icons }];
  }

  private getCurrentSectorThreatDeck(seatId: string): string[] {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const sector = player ? this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId) : null;

    return sector?.encounterDecks.threat ?? [];
  }

  private isCurrentEncounterBlockingPlayerSector(player: PlayerState): boolean {
    if (!this.state.currentEncounter) {
      return false;
    }

    if (this.state.lastOutcomeSummary?.movedToSectorId) {
      return this.state.lastOutcomeSummary.movedToSectorId === player.character.currentSpaceId;
    }

    return this.state.phase !== "broadcast";
  }

  private shouldTriggerWoundThreshold(seatId: string): boolean {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    return (
      this.state.phase === "resolution" &&
      this.state.status === "active" &&
      !this.state.pendingEffect &&
      player?.character.status === "active" &&
      player.character.wounds >= this.state.woundThreshold
    );
  }

  private createWoundScar(seatId: string): string {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const scarCount = (player?.character.scars.length ?? 0) + 1;
    const scarIndex = Math.min(scarCount, SCAR_CARDS.size);

    return `scar-wound-${scarIndex}`;
  }

  private countEquippedGear(player: PlayerState): number {
    return Object.values(player.character.equippedGear).filter(Boolean).length;
  }

  private getActiveNemesis(): NemesisDefinition | null {
    return getLinkedNemesis(this.state.activeScenarioId);
  }

  private maybeApplyScenarioThresholds(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || this.state.status !== "active") {
      return;
    }

    const refreshedPlayer = this.state.players.find((entry) => entry.seatId === seatId);

    if (
      refreshedPlayer &&
      refreshedPlayer.character.status === "active" &&
      refreshedPlayer.character.wounds >= this.state.woundThreshold
    ) {
      this.applyAction({
        type: "WOUND_THRESHOLD_REACHED",
        seatId,
        threshold: this.state.woundThreshold,
        newWoundTotal: refreshedPlayer.character.wounds,
        createdAt: new Date().toISOString()
      });
    }
  }

  private buildScenarioPlan(player: PlayerState): ScenarioPlan {
    const heldGearCount = player.character.heldGear.length;
    const equippedGearCount = this.countEquippedGear(player);
    const salvageLeverage = Math.min(3, heldGearCount + equippedGearCount);
    const crownProxy = Math.min(3, this.getThroneCrownCount(player.seatId));
    const mirrorPressure = player.character.scars.length;
    const engineModeIndex = this.getScenarioCounter("engineModeIndex", 0) % 3;
    const scenario = getScenarioDefinition(this.state.activeScenarioId);
    const nemesis = this.getActiveNemesis();

    if (nemesis && nemesis.scenarioConfrontationMode !== "authored-plan") {
      const checks: ScenarioCheck[] = (["strength", "willpower", "cunning"] as const)
        .filter((statKey) => nemesis.stats[statKey] != null)
        .map((statKey) => {
          const opposition = NEMESIS_OPPOSITION[statKey];

          return {
            stat: opposition.attackStat,
            difficulty: CONFRONTATION_BASE_DIFFICULTY + (nemesis.stats[statKey] ?? 0),
            label: `${opposition.label} ${nemesis.name}`
          };
        });

      return {
        checks,
        markLabel: "wound on the nemesis",
        effect: null,
        victorySummary: `${nemesis.name}, ${nemesis.title}, was brought down at the Cinder Gate.`
      };
    }

    if (!scenario) {
      throw new Error(`Scenario confrontation rules are not implemented for ${this.state.activeScenarioId}`);
    }

    return scenario.buildConfrontationPlan({
      playerName: player.character.name,
      sessionMode: this.state.sessionMode,
      crownClaims: crownProxy,
      mirrorPressure,
      salvageLeverage,
      engineModeIndex,
      heldGearCount
    });
  }

  private appendCooperativeEvent(event: Record<string, unknown>): void {
    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      eventLog: [...this.state.eventLog, event]
    };
  }

  private getCurrentCooperativeTestSource(seatId: string, stat: Stat): {
    sourceKind: CooperativeAssistanceState["sourceKind"];
    sourceId: string;
    sourceTitle: string;
  } {
    const pending = this.state.pendingCooperativeTest;
    if (pending) {
      if (pending.activeSeatId !== seatId || pending.stat !== stat) {
        throw new Error("The pending cooperative test does not match this operative or skill");
      }
      return { sourceKind: pending.sourceKind, sourceId: pending.sourceId, sourceTitle: pending.sourceTitle };
    }

    const encounter = this.state.currentEncounter;
    if (!encounter || encounter.stat !== stat) throw new Error("No matching skill test is waiting for assistance");
    return {
      sourceKind: this.state.pendingTileChallenge ? "tileChallenge" : "encounter",
      sourceId: encounter.id,
      sourceTitle: encounter.title
    };
  }

  private resolveCooperativeAssistanceRequest(
    intent: Extract<ClientIntent, { type: "COOPERATIVE_ASSISTANCE_REQUESTED" }>
  ): void {
    if (!isCooperativeAssistanceMode(this.state)) {
      throw new IntentRejectedError(intent.type, "Assistance is available only in active standard cooperative multiplayer games");
    }
    if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may request assistance");
    }
    if (this.state.activeResolution?.stage !== "battle_setup" || this.state.activeResolution.playerId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Assistance must be requested after the test is known and before dice are rolled");
    }
    if (this.state.cooperativeAssistance) {
      throw new IntentRejectedError(intent.type, "An assistance request is already active");
    }
    if (
      this.state.pendingEdgeAbility?.seatId === intent.seatId &&
      this.state.pendingEdgeAbility.abilityKey === "isolated-total" &&
      this.state.pendingEdgeAbility.resolutionId === this.state.activeResolution.id
    ) {
      throw new IntentRejectedError(intent.type, "Isolated Channel disables assistance for this resolution");
    }

    const helperSeatIds = Array.from(new Set(intent.helperSeatIds));
    if (helperSeatIds.length < 1 || helperSeatIds.length > MAX_COOPERATIVE_HELPERS) {
      throw new IntentRejectedError(intent.type, "Choose one or two helpers");
    }
    const source = this.getCurrentCooperativeTestSource(intent.seatId, intent.stat);
    if (source.sourceId !== intent.sourceId) {
      throw new IntentRejectedError(intent.type, "The assistance source is stale");
    }
    const eligible = new Set(getEligibleCooperativeHelperSeatIds(this.state, intent.seatId, intent.stat));
    const invalid = helperSeatIds.find((seatId) => !eligible.has(seatId));
    if (invalid) throw new IntentRejectedError(intent.type, `${invalid} is not eligible to assist this roll`);

    const createdAt = new Date().toISOString();
    const request: CooperativeAssistanceState = {
      id: `assist:${intent.seatId}:${source.sourceId}:${this.state.sequence + 1}`,
      ...source,
      testedStat: intent.stat,
      activeSeatId: intent.seatId,
      requestedSeatIds: helperSeatIds,
      acceptedSeatIds: [],
      declinedSeatIds: [],
      lockedContributions: [],
      status: "requested",
      createdAt
    };
    this.state = { ...this.state, cooperativeAssistance: request };
    this.appendCooperativeEvent({
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: intent.seatId,
      requestId: request.id,
      sourceKind: request.sourceKind,
      sourceId: request.sourceId,
      testedStat: request.testedStat,
      requestedSeatIds: request.requestedSeatIds,
      createdAt
    });
  }

  private resolveCooperativeAssistanceResponse(
    intent: Extract<ClientIntent, { type: "COOPERATIVE_ASSISTANCE_RESPONDED" }>
  ): void {
    const request = this.state.cooperativeAssistance;
    if (!request || request.id !== intent.requestId || request.status !== "requested") {
      throw new IntentRejectedError(intent.type, "The assistance request is stale or already locked");
    }
    if (!request.requestedSeatIds.includes(intent.seatId)) {
      throw new IntentRejectedError(intent.type, "This operative was not requested as a helper");
    }
    if (request.acceptedSeatIds.includes(intent.seatId) || request.declinedSeatIds.includes(intent.seatId)) {
      throw new IntentRejectedError(intent.type, "This helper has already responded");
    }
    if (!getEligibleCooperativeHelperSeatIds(this.state, request.activeSeatId, request.testedStat).includes(intent.seatId)) {
      throw new IntentRejectedError(intent.type, "This helper is no longer available to respond");
    }

    const acceptedSeatIds = intent.accept ? [...request.acceptedSeatIds, intent.seatId] : request.acceptedSeatIds;
    if (acceptedSeatIds.length > MAX_COOPERATIVE_HELPERS) {
      throw new IntentRejectedError(intent.type, "A roll cannot have more than two helpers");
    }
    const declinedSeatIds = intent.accept ? request.declinedSeatIds : [...request.declinedSeatIds, intent.seatId];
    this.state = {
      ...this.state,
      cooperativeAssistance: { ...request, acceptedSeatIds, declinedSeatIds }
    };
    this.appendCooperativeEvent({
      type: intent.accept ? "COOPERATIVE_HELPER_ACCEPTED" : "COOPERATIVE_HELPER_DECLINED",
      seatId: intent.seatId,
      requestId: request.id,
      sourceId: request.sourceId,
      testedStat: request.testedStat,
      createdAt: new Date().toISOString()
    });
  }

  private resolveCooperativeAssistanceLock(
    intent: Extract<ClientIntent, { type: "COOPERATIVE_ASSISTANCE_LOCKED" }>
  ): void {
    const request = this.state.cooperativeAssistance;
    if (!request || request.id !== intent.requestId || request.status !== "requested") {
      throw new IntentRejectedError(intent.type, "The assistance request is stale or already locked");
    }
    if (request.activeSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may lock assistance");
    }
    const lockedContributions = lockCooperativeContributions(this.state, request.acceptedSeatIds, request.testedStat);
    const pending = this.state.pendingCooperativeTest;
    if (pending?.requiresHelper && lockedContributions.length < 1) {
      throw new IntentRejectedError(intent.type, "This scenario test requires at least one accepted helper");
    }
    const borrowedNameUsage = request.acceptedSeatIds.flatMap((seatId) => {
      const helper = this.state.players.find((entry) => entry.seatId === seatId);
      if (!helper?.character.scars.includes("scar-borrowed-name")) return [];
      if ((this.state.scarUsage ?? []).some((entry) => entry.seatId === seatId && entry.scarId === "scar-borrowed-name" && entry.ruleKey === "first-assistance-reduction" && entry.scope === "round")) return [];
      const scopeId = `round:${getCurrentRoundNumber(this.state)}`;
      return [{
        usageId: `${seatId}:scar-borrowed-name:first-assistance-reduction:${scopeId}`,
        seatId,
        scarId: "scar-borrowed-name",
        ruleKey: "first-assistance-reduction" as const,
        scope: "round" as const,
        scopeId,
        sourceEventId: request.id,
        createdAt: new Date().toISOString()
      }];
    });
    this.state = {
      ...this.state,
      scarUsage: [...(this.state.scarUsage ?? []), ...borrowedNameUsage],
      cooperativeAssistance: { ...request, status: "locked", lockedContributions }
    };
    this.appendCooperativeEvent({
      type: "COOPERATIVE_ASSISTANCE_LOCKED",
      seatId: intent.seatId,
      requestId: request.id,
      sourceId: request.sourceId,
      testedStat: request.testedStat,
      contributions: lockedContributions,
      createdAt: new Date().toISOString()
    });
  }

  private resolveCooperativeAssistanceCancel(
    intent: Extract<ClientIntent, { type: "COOPERATIVE_ASSISTANCE_CANCELLED" }>
  ): void {
    const request = this.state.cooperativeAssistance;
    if (!request || request.id !== intent.requestId || request.status !== "requested") {
      throw new IntentRejectedError(intent.type, "The assistance request is stale or already locked");
    }
    if (request.activeSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may cancel assistance");
    }
    this.state = { ...this.state, cooperativeAssistance: null };
    this.appendCooperativeEvent({
      type: "COOPERATIVE_ASSISTANCE_CANCELLED",
      seatId: intent.seatId,
      requestId: request.id,
      sourceId: request.sourceId,
      testedStat: request.testedStat,
      createdAt: new Date().toISOString()
    });
  }

  private assertAssistanceReadyForRoll(seatId: string, sourceId: string, stat: Stat, requiresHelper: boolean) {
    const request = this.state.cooperativeAssistance;
    if (!request) {
      if (requiresHelper) throw new Error("This scenario test requires at least one accepted helper");
      return [];
    }
    if (request.activeSeatId !== seatId || request.sourceId !== sourceId || request.testedStat !== stat) {
      throw new Error("The locked assistance no longer matches this roll");
    }
    if (request.status !== "locked") throw new Error("Lock or cancel the assistance request before rolling");
    if (requiresHelper && request.lockedContributions.length < 1) {
      throw new Error("This scenario test requires at least one accepted helper");
    }
    return request.lockedContributions;
  }

  private finishAssistedRoll(seatId: string, sourceId: string, success: boolean): void {
    const request = this.state.cooperativeAssistance;
    if (!request || request.activeSeatId !== seatId || request.sourceId !== sourceId || request.status !== "locked") return;
    const total = sumCooperativeContributions(request.lockedContributions);
    this.state = {
      ...this.state,
      cooperativeAssistance: null,
      activeResolution: this.state.activeResolution
        ? {
            ...this.state.activeResolution,
            assistance: {
              testedStat: request.testedStat,
              activeSeatId: request.activeSeatId,
              contributions: request.lockedContributions,
              total
            }
          }
        : this.state.activeResolution
    };
    this.appendCooperativeEvent({
      type: "COOPERATIVE_ASSISTED_ROLL_RESOLVED",
      seatId,
      requestId: request.id,
      sourceId,
      testedStat: request.testedStat,
      contributions: request.lockedContributions,
      success,
      createdAt: new Date().toISOString()
    });
  }

  private stagePendingCooperativeTest(test: PendingCooperativeTest): void {
    if (!isCooperativeAssistanceMode(this.state)) throw new Error("Cooperative test staging requires standard co-op multiplayer");
    if (this.state.pendingCooperativeTest || this.state.cooperativeAssistance) throw new Error("Another cooperative test is already pending");
    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      pendingCooperativeTest: test,
      activeResolution: {
        id: test.id,
        playerId: test.activeSeatId,
        source: test.sourceKind === "boardSpace" ? "threat" : "scenario",
        stage: "battle_setup",
        card: {
          id: test.sourceId,
          title: test.sourceTitle,
          type: test.sourceKind === "scenarioNode" ? "scenario-node" : test.sourceKind === "scenarioConfrontation" ? "scenario-confrontation" : "board-test",
          flavor: test.requiresHelper ? "At least one operative must answer the call." : "Assistance may be requested before the roll."
        },
        battle: { stat: test.stat, difficulty: test.difficulty, modifiers: [] },
        outcome: { title: "Assistance window", text: `Prepare the ${CHALLENGE_LABELS[test.stat]} test before rolling.`, effects: [] }
      },
      eventLog: [...this.state.eventLog, {
        type: "COOPERATIVE_TEST_STAGED",
        seatId: test.activeSeatId,
        testId: test.id,
        sourceKind: test.sourceKind,
        sourceId: test.sourceId,
        testedStat: test.stat,
        difficulty: test.difficulty,
        createdAt: test.createdAt
      }]
    };
  }

  private buildCooperativeTestRoll(
    test: PendingCooperativeTest,
    player: PlayerState
  ): {
    roll: ReturnType<typeof rollDice>;
    modifierSources: RollModifierSource[];
    statBonus: number;
    difficulty: number;
    total: number;
    success: boolean;
  } {
    const contributions = this.assertAssistanceReadyForRoll(
      test.activeSeatId,
      test.sourceId,
      test.stat,
      test.requiresHelper
    );
    const activeSources: RollModifierSource[] = [
      { label: "Active operative", value: player.character.stats[test.stat] },
      ...getEquippedGearModifierSources(player.character, test.stat),
      ...(this.getScenarioSkillModifier(test.activeSeatId)
        ? [{ label: "Scenario", value: this.getScenarioSkillModifier(test.activeSeatId) }]
        : []),
      ...this.getPendingRollModifierSources(test.activeSeatId, test.stat, "check")
    ];
    const helperSources: RollModifierSource[] = contributions.map((entry) => {
      const helper = this.state.players.find((candidate) => candidate.seatId === entry.seatId);
      const helperName = this.state.seats.find((candidate) => candidate.seatId === entry.seatId)?.displayName;
      return { label: `${helperName ?? helper?.character.name ?? entry.seatId} assisted`, value: entry.value };
    });
    const modifierSources = [...activeSources, ...helperSources];
    const statBonus = modifierSources.reduce((sum, source) => sum + source.value, 0);
    const roll = rollDice(2, 6, this.randomSource);
    const total = roll.total + statBonus;
    return { roll, modifierSources, statBonus, difficulty: test.difficulty, total, success: total >= test.difficulty };
  }

  private resolvePendingCooperativeTestRoll(
    intent: Extract<ClientIntent, { type: "COOPERATIVE_TEST_ROLL_REQUESTED" }>
  ): void {
    const test = this.state.pendingCooperativeTest;
    if (!test || test.id !== intent.testId) throw new IntentRejectedError(intent.type, "The cooperative test is stale");
    if (test.activeSeatId !== intent.seatId) throw new IntentRejectedError(intent.type, "Only the active operative may roll");
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player) throw new IntentRejectedError(intent.type, "The active operative is unavailable");
    const resolved = this.buildCooperativeTestRoll(test, player);

    if (test.sourceKind === "boardSpace") {
      this.resolveSpaceTextIntent(
        { type: "RESOLVE_SPACE_TEXT", seatId: intent.seatId, ...(test.choiceId ? { choiceId: test.choiceId } : {}) },
        resolved
      );
      return;
    }

    const assistance = this.state.cooperativeAssistance;
    const sourceEventId = `${test.id}:resolved`;
    if (test.sourceKind === "scenarioNode") {
      if (resolved.success) {
        this.applyAction({
          type: "SCENARIO_PREPARATION_GAINED",
          seatId: intent.seatId,
          scenarioId: BROKEN_CONCORDANCE_SCENARIO_ID,
          resourceKey: "concordanceNodes",
          amount: 1,
          maximum: BROKEN_CONCORDANCE_NODES.length,
          sourceEventId,
          objectiveId: test.sourceId,
          summary: `${test.sourceTitle} stabilized through cooperative ${test.stat}.`,
          createdAt: new Date().toISOString()
        } satisfies ScenarioPreparationGainedAction);
      } else {
        this.feedEscalation(intent.seatId, 1, `${test.sourceTitle} discord`);
      }
    } else {
      const confrontationId = this.state.scenarioConfrontation.confrontationId;
      if (!confrontationId) throw new IntentRejectedError(intent.type, "The Concordance confrontation is no longer active");
      const currentProgress = this.state.scenarioConfrontation.progress.concordanceStages ?? 0;
      const nextProgress = currentProgress + (resolved.success ? 1 : 0);
      this.applyAction({
        type: "SCENARIO_CONFRONTATION_PROGRESS_GAINED",
        seatId: intent.seatId,
        scenarioId: BROKEN_CONCORDANCE_SCENARIO_ID,
        confrontationId,
        progressKey: "concordanceStages",
        amount: resolved.success ? 1 : 0,
        sourceEventId,
        stage: resolved.success ? `stage-${nextProgress}-resolved` : `stage-${currentProgress + 1}-failed`,
        summary: `${test.sourceTitle}: ${resolved.total}/${resolved.difficulty} ${resolved.success ? "passed" : "failed"}.`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioConfrontationProgressGainedAction);
      if (!resolved.success && this.state.status === "active") this.feedEscalation(intent.seatId, 1, `${test.sourceTitle} discord`);
      if (resolved.success && nextProgress >= BROKEN_CONCORDANCE_STAGES.length && this.state.status === "active") {
        this.applyAction({
          type: "SCENARIO_VICTORY_ACHIEVED",
          seatId: intent.seatId,
          scenarioId: BROKEN_CONCORDANCE_SCENARIO_ID,
          victoryConditionId: "broken-concordance:hollow-regent-silenced",
          sourceType: "confrontation",
          sourceId: sourceEventId,
          shared: true,
          summary: "The Hollow Regent fell silent and the Reach kept its separate voices.",
          createdAt: new Date().toISOString()
        } satisfies ScenarioVictoryAchievedAction);
      }
    }

    this.state = {
      ...this.state,
      phase: "resolution",
      resolutionSource: null,
      pendingCooperativeTest: null,
      activeResolution: {
        id: test.id,
        playerId: test.activeSeatId,
        source: "scenario",
        stage: "outcome_summary",
        card: { id: test.sourceId, title: test.sourceTitle, type: test.sourceKind, flavor: "The joined signal settles." },
        battle: { stat: test.stat, difficulty: resolved.difficulty, modifiers: resolved.modifierSources },
        roll: {
          dice: resolved.roll.faces,
          baseTotal: resolved.roll.total,
          modifierTotal: resolved.statBonus,
          finalTotal: resolved.total,
          target: resolved.difficulty,
          success: resolved.success
        },
        outcome: {
          title: resolved.success ? "Concordance restored" : "Discord holds",
          text: `${test.stat} ${resolved.total}/${resolved.difficulty}.`,
          effects: []
        },
        ...(assistance
          ? {
              assistance: {
                testedStat: assistance.testedStat,
                activeSeatId: assistance.activeSeatId,
                contributions: assistance.lockedContributions,
                total: sumCooperativeContributions(assistance.lockedContributions)
              }
            }
          : {})
      }
    };
    this.finishAssistedRoll(intent.seatId, test.sourceId, resolved.success);
  }

  private resolveBrokenConcordanceNodeRequest(
    intent: Extract<ClientIntent, { type: "BROKEN_CONCORDANCE_NODE_REQUESTED" }>
  ): void {
    if (this.state.activeScenarioId !== BROKEN_CONCORDANCE_SCENARIO_ID) {
      throw new IntentRejectedError(intent.type, "The Broken Concordance is not active");
    }
    if (!isCooperativeAssistanceMode(this.state)) throw new IntentRejectedError(intent.type, "This objective requires cooperative play");
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    const node = getBrokenConcordanceNode(intent.nodeId);
    if (!player || this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may stabilize a node");
    }
    if (!node || player.character.currentSpaceId !== node.sectorId) {
      throw new IntentRejectedError(intent.type, "The operative is not at this Concordance node");
    }
    if (this.state.scenarioPreparation.completedObjectiveIds.includes(node.id)) {
      throw new IntentRejectedError(intent.type, "This Concordance node is already stabilized");
    }
    if (this.state.phase !== "action" || this.state.currentEncounter || this.state.activeResolution) {
      throw new IntentRejectedError(intent.type, "Resolve the current event before stabilizing the node");
    }
    this.stagePendingCooperativeTest({
      id: `coop-test:node:${node.id}:${this.state.sequence + 1}`,
      activeSeatId: intent.seatId,
      sourceKind: "scenarioNode",
      sourceId: node.id,
      sourceTitle: node.name,
      stat: node.stat,
      difficulty: node.difficulty + getEscalationModifier(this.state.escalationLevel),
      requiresHelper: true,
      createdAt: new Date().toISOString()
    });
  }

  private maybeOpenAfflictionRollReaction(
    seatId: string,
    pendingResult: CheckRolledAction | CombatResolvedAction
  ): boolean {
    if (
      pendingResult.success
      || this.state.pendingAfflictionReaction
      || (pendingResult.type === "COMBAT_RESOLVED" && threatBlocksRerolls(this.state.currentEncounter))
    ) return false;
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    if (!player) return false;
    const faceup = new Set((player.faceupAfflictions ?? []).map((entry) => entry.cardId));
    const usage = player.afflictionUsageState ?? {
      oncePerTurnUsed: {},
      oncePerBattleUsed: {},
      reactionUsed: {}
    };
    const isBattle = pendingResult.type === "COMBAT_RESOLVED";
    const afflictionId =
      isBattle && faceup.has("blood-fury") && usage.oncePerBattleUsed["blood-fury"] !== true
        ? "blood-fury"
        : faceup.has("future-sickness") && usage.oncePerTurnUsed["future-sickness"] !== true
          ? "future-sickness"
          : null;
    if (!afflictionId) return false;

    const createdAt = new Date().toISOString();
    this.applyAction({
      type: "AFFLICTION_REACTION_OPENED",
      seatId,
      reactionId: `${seatId}:${pendingResult.cardId}:${afflictionId}:${createdAt}`,
      afflictionId,
      kind: afflictionId === "blood-fury" ? "battleReroll" : "turnReroll",
      originalRoll: [...pendingResult.roll.faces],
      pendingResult,
      createdAt
    } satisfies AfflictionReactionOpenedAction);
    return true;
  }

  private maybeOpenBileSpitReaction(targetSeatId: string, sectorId: string, sourceEventId: string): boolean {
    if (this.state.pendingAfflictionReaction) return true;
    if (["inner", "center"].includes(getBoardSpace(sectorId)?.tier ?? "")) return false;
    const owner = this.state.turnOrder
      .map((seatId) => this.state.players.find((entry) => entry.seatId === seatId))
      .find((entry) => {
        if (!entry || entry.seatId === targetSeatId || entry.sectorId !== sectorId) return false;
        if (!(entry.faceupAfflictions ?? []).some((affliction) => affliction.cardId === "bile-spit")) return false;
        return entry.afflictionUsageState?.reactionUsed?.[sourceEventId] !== true;
      });
    if (!owner) return false;
    const createdAt = new Date().toISOString();
    this.applyAction({
      type: "AFFLICTION_REACTION_OPENED",
      seatId: owner.seatId,
      reactionId: `${sourceEventId}:bile-spit:${owner.seatId}`,
      afflictionId: "bile-spit",
      kind: "arrivalWound",
      targetSeatId,
      originalRoll: [1],
      sourceEventId,
      createdAt
    } satisfies AfflictionReactionOpenedAction);
    return true;
  }

  private finishResolvedCheck(action: CheckRolledAction): void {
    const encounter = this.state.currentEncounter;
    if (!encounter || encounter.cardType !== "hazard" || encounter.id !== action.cardId) {
      throw new Error("Affliction reroll no longer matches the authoritative check");
    }
    this.applyAction(action);
    this.finishAssistedRoll(action.seatId, encounter.id, action.success);
    this.markFirstEligibleCharacterAbility(action.seatId, action.stat, "check", encounter);
    this.applyScenarioOnSkillResolved(action.seatId, action.stat, action.success);
    this.maybeTriggerAbilityOnCheckResolved(action.seatId, action.stat, action.success);
    this.runAutomaticPhases(action.seatId);
  }

  private finishResolvedCombat(action: CombatResolvedAction): void {
    const encounter = this.state.currentEncounter;
    const player = this.state.players.find((entry) => entry.seatId === action.seatId);
    if (!encounter || encounter.cardType !== "enemy" || encounter.id !== action.cardId || !player) {
      throw new Error("Affliction reroll no longer matches the authoritative battle");
    }
    this.applyAction(action);
    this.finishAssistedRoll(action.seatId, encounter.id, action.success);
    this.markFirstEligibleCharacterAbility(action.seatId, action.stat, "battle", encounter);
    if (action.success) {
      if (encounter.missionReward && !action.edgeForfeitRewards) {
        this.queueMissionReward({
          ownerSeatId: action.seatId,
          sourceKind: "battle",
          sourceId: encounter.id,
          sourceTitle: encounter.title
        });
      }
      if (!action.edgeForfeitRewards) {
        this.maybeTriggerAbilityOnCombatVictory(action.seatId);
      }
      this.applyScenarioOnEnemyDefeat(action.seatId);
      this.applyScenarioObjectiveTrigger(action.seatId, {
        type: "threatDefeated",
        threatId: encounter.id,
        threatLane: encounter.threatLane,
        enemyFamily: encounter.enemyFamily,
        sectorId: player.sectorId
      });
      this.applyRivalryAgendaProgressTrigger(action.seatId, {
        type: "threatDefeated",
        seatId: action.seatId,
        threatId: encounter.id,
        threatLane: encounter.threatLane,
        enemyFamily: encounter.enemyFamily,
        sectorId: player.sectorId
      });
    }
    this.runAutomaticPhases(action.seatId);
  }

  private resolveAfflictionReactionIntent(
    intent: Extract<ClientIntent, { type: "AFFLICTION_REACTION_RESOLVED" }>
  ): void {
    const pending = this.state.pendingAfflictionReaction;
    if (!pending || pending.id !== intent.reactionId || pending.ownerSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "This Affliction reaction is stale or belongs to another operative");
    }
    const opened = [...this.state.eventLog].reverse().find((entry) => {
      const candidate = entry as Partial<AfflictionReactionOpenedAction>;
      return candidate.type === "AFFLICTION_REACTION_OPENED" && candidate.reactionId === pending.id;
    }) as AfflictionReactionOpenedAction | undefined;
    if (!opened) throw new IntentRejectedError(intent.type, "The authoritative Affliction reaction source is unavailable");

    if (pending.kind === "arrivalWound") {
      this.applyAction({
        type: "AFFLICTION_REACTION_RESOLVED",
        seatId: intent.seatId,
        reactionId: intent.reactionId,
        use: intent.use,
        createdAt: new Date().toISOString()
      } satisfies AfflictionReactionResolvedAction);
      const targetSeatId = pending.targetSeatId;
      const target = targetSeatId ? this.state.players.find((entry) => entry.seatId === targetSeatId) : null;
      if (
        targetSeatId &&
        target &&
        this.maybeOpenBileSpitReaction(targetSeatId, target.sectorId, pending.sourceEventId)
      ) {
        return;
      }
      this.runAutomaticPhases(targetSeatId ?? intent.seatId);
      return;
    }

    const pendingResult = opened.pendingResult;
    if (!pendingResult) throw new IntentRejectedError(intent.type, "The authoritative reroll result is unavailable");
    const dieIndex = intent.dieIndex ?? (pending.originalRoll[0] <= (pending.originalRoll[1] ?? 7) ? 0 : 1);
    if (
      intent.use &&
      this.state.lastEdgeCardPlay?.seatId === intent.seatId &&
      this.state.lastEdgeCardPlay.mode === "commit-value" &&
      dieIndex === 0
    ) {
      throw new IntentRejectedError(intent.type, "The committed Edge die is locked and cannot be rerolled");
    }
    const reroll = intent.use ? this.randomSource.nextInt(6) + 1 : undefined;
    this.applyAction({
      type: "AFFLICTION_REACTION_RESOLVED",
      seatId: intent.seatId,
      reactionId: intent.reactionId,
      use: intent.use,
      dieIndex: intent.use ? dieIndex : undefined,
      reroll,
      createdAt: new Date().toISOString()
    } satisfies AfflictionReactionResolvedAction);

    let finalResult: CheckRolledAction | CombatResolvedAction = pendingResult;
    if (intent.use && reroll !== undefined) {
      const faces = [...pendingResult.roll.faces];
      const originalFace = faces[dieIndex] ?? faces[0] ?? 1;
      faces[dieIndex] = reroll;
      const roll = { faces, total: faces.reduce((sum, face) => sum + face, 0) };
      const total = roll.total + pendingResult.statBonus;
      const target = pendingResult.type === "COMBAT_RESOLVED" ? pendingResult.enemyTotal : pendingResult.difficulty;
      const success = total >= target;
      const encounter = this.state.currentEncounter;
      if (!encounter || encounter.id !== pendingResult.cardId) {
        throw new IntentRejectedError(intent.type, "The encounter changed before the Affliction reroll resolved");
      }
      const keyedModifiers = this.resolveThreatEffectKeys(
        intent.seatId,
        encounter,
        encounter.combatEffectKeys,
        "beforeCombat"
      );
      const authoredEffect =
        encounter.cardType === "enemy"
          ? success
            ? encounter.defeatReward
            : encounter.woundOnLoss
          : this.getHazardOutcomeEffect(encounter, success);
      const baseEffect = this.combineEffects(
        [keyedModifiers.effect, authoredEffect].filter((entry): entry is EncounterEffect => Boolean(entry))
      ) ?? authoredEffect;
      const outcomeEffect =
        success === pendingResult.success
          ? pendingResult.effect
          : this.maybeApplyKerWoundPrevention(
              intent.seatId,
              this.maybeApplyFandiablosWoundPrevention(
                intent.seatId,
                this.resolveThreatOutcomeEffect(
                  intent.seatId,
                  encounter,
                  baseEffect,
                  success
                    ? encounter.cardType === "enemy"
                      ? encounter.defeatEffectKey
                      : encounter.successEffectKey
                    : encounter.failEffectKey,
                  success ? (encounter.cardType === "enemy" ? "onDefeat" : "onSuccess") : "onFailure"
                )
              )
            );
      const matchedOriginal = reroll === originalFace;
      const reactionEffect: EncounterEffect | null =
        matchedOriginal && pending.afflictionId === "blood-fury"
          ? { type: "take_wound", amount: 1 }
          : matchedOriginal && pending.afflictionId === "future-sickness"
            ? { type: "draw_affliction", amount: 1 }
            : null;
      const effect = this.combineEffects(
        [outcomeEffect, reactionEffect].filter((entry): entry is EncounterEffect => Boolean(entry))
      );
      finalResult = {
        ...pendingResult,
        roll,
        total,
        success,
        effect: effect ?? (pendingResult.type === "COMBAT_RESOLVED" ? { type: "sequence", effects: [] } : null),
        createdAt: new Date().toISOString()
      } as CheckRolledAction | CombatResolvedAction;
    }

    if (this.maybeOpenEdgeReaction(intent.seatId, finalResult)) {
      return;
    }
    if (this.maybeOpenAfflictionRollReaction(intent.seatId, finalResult)) {
      return;
    }
    if (finalResult.type === "COMBAT_RESOLVED") {
      this.finishResolvedCombat(finalResult);
    } else {
      this.finishResolvedCheck(finalResult);
    }
  }

  resolveCheckIntent(intent: Extract<ClientIntent, { type: "CHECK_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const encounter = this.state.currentEncounter;

    if (!encounter) {
      throw new Error("No encounter is available to resolve");
    }

    if (encounter.cardType !== "hazard") {
      throw new Error("Enemy encounters do not use check resolution");
    }

    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const keyedModifiers = this.resolveThreatEffectKeys(intent.seatId, encounter, encounter.combatEffectKeys, "beforeCombat");
    const nextNonBattleTestModifiers = getNextNonBattleTestModifierSource(this.state, intent.seatId, intent.stat);
    const assistance = this.assertAssistanceReadyForRoll(intent.seatId, encounter.id, intent.stat, false);
    const edgeAbility =
      this.state.pendingEdgeAbility?.seatId === intent.seatId &&
      this.state.pendingEdgeAbility.resolutionId === this.state.activeResolution?.id
        ? this.state.pendingEdgeAbility
        : null;
    const modifierSources = [
      ...this.buildStatModifierSources(player, intent.stat, "check", {
      scenarioModifier: this.getScenarioSkillModifier(intent.seatId),
      keyedPlayerModifier: keyedModifiers.playerBonusModifier ?? 0
      }),
      ...(this.state.pendingTileChallenge?.modifierSources ?? []).map(({ label, value }) => ({ label, value })),
      ...nextNonBattleTestModifiers,
      ...assistance.map(({ seatId, value }) => ({
        label: `${this.state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId} assisted`,
        value
      })),
      ...(edgeAbility?.abilityKey === "boost-challenge"
        ? [{ label: "Ashglass Overclock", value: 3 }]
        : edgeAbility?.abilityKey === "isolated-total"
          ? [{ label: "Isolated Channel", value: 2 }]
          : [])
    ];
    const roll = this.rollPlayerDiceWithEdgeCommit(intent.seatId);
    const statBonus = this.sumModifierSources(modifierSources);
    const characterDifficultyModifier = this.getCharacterDifficultyModifier(player, encounter);
    const namedEnemyModifier = this.state.pendingTileChallenge?.sourceTags.includes("enemy")
      ? getNamedPlayerEnemyModifier(this.getNamedPlayerIdentity(intent.seatId))
      : 0;
    const oppositionModifierSources = namedEnemyModifier > 0
      ? [{ label: CW_ENEMY_MODIFIER_LABEL, value: namedEnemyModifier }]
      : [];
    const difficulty = encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0) + characterDifficultyModifier + namedEnemyModifier;
    const total = roll.total + statBonus;
    const success = total >= difficulty;
    const baseOutcomeEffect = this.combineEffects(
      [
        keyedModifiers.effect,
        this.getHazardOutcomeEffect(encounter, success)
      ].filter(
        (effect): effect is EncounterEffect => Boolean(effect)
      )
    ) ?? this.getHazardOutcomeEffect(encounter, success);
    const resolvedOutcomeEffect = this.resolveThreatOutcomeEffect(
      intent.seatId,
      encounter,
      baseOutcomeEffect,
      success ? encounter.successEffectKey : encounter.failEffectKey,
      success ? "onSuccess" : "onFailure"
    );
    const protectedOutcomeEffect = this.maybeApplyKerWoundPrevention(
      intent.seatId,
      this.maybeApplyFandiablosWoundPrevention(intent.seatId, resolvedOutcomeEffect)
    );
    const outcomeEffect =
      edgeAbility?.abilityKey === "boost-challenge" && !success
        ? this.combineEffects(
            [protectedOutcomeEffect, { type: "take_wound", amount: 1 }].filter(
              (effect): effect is EncounterEffect => Boolean(effect)
            )
          )
        : protectedOutcomeEffect;

    const action = {
      type: "CHECK_ROLLED",
      seatId: intent.seatId,
      stat: intent.stat,
      difficulty,
      roll,
      statBonus,
      modifierSources,
      oppositionModifierSources,
      total,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      createdAt: new Date().toISOString()
    } satisfies CheckRolledAction;
    if (this.maybeOpenEdgeReaction(intent.seatId, action)) return;
    if (this.maybeOpenAfflictionRollReaction(intent.seatId, action)) return;
    this.finishResolvedCheck(action);
  }

  private resolveStartTileEncounterIntent(intent: Extract<ClientIntent, { type: "START_TILE_ENCOUNTER" }>): void {
    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex];
    const encounter = this.state.currentEncounter;
    const resolution = this.state.activeResolution;
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player || activeSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may start this encounter");
    }
    if (this.state.phase !== "action") {
      throw new IntentRejectedError(intent.type, `The encounter cannot start during ${this.state.phase}`);
    }
    if (!encounter || encounter.id !== intent.encounterId) {
      throw new IntentRejectedError(intent.type, "The displayed encounter is stale");
    }
    // Tile Challenges may use a dedicated art-card ID while the executable
    // encounter keeps the stable Challenge ID. The authoritative resolution
    // revision, owner, and current encounter identity are the replay guards.
    if (!resolution || resolution.id !== intent.resolutionId) {
      throw new IntentRejectedError(intent.type, "The encounter revision is stale");
    }
    if (resolution.playerId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "This encounter belongs to another operative");
    }
    if (resolution.stage !== "card_reveal") {
      throw new IntentRejectedError(intent.type, "This encounter has already started");
    }

    this.applyAction({
      type: encounter.cardType === "enemy" ? "COMBAT_REQUESTED" : "CHECK_REQUESTED",
      seatId: intent.seatId,
      stat: encounter.stat,
      createdAt: new Date().toISOString()
    });
  }

  resolveContinueResolutionIntent(intent: Extract<ClientIntent, { type: "CONTINUE_RESOLUTION" }>): void {
    if (this.state.pendingGearEquipChoice) {
      throw new IntentRejectedError(intent.type, "Resolve the discovered Equipment choice before continuing.");
    }
    this.clearResolutionAutoContinueTimeout();
    const previousStage = this.state.activeResolution?.stage ?? null;
    const acceptingFailure =
      previousStage === "roll_result" &&
      (
        this.state.pendingFailureReaction?.seatId === intent.seatId ||
        this.state.pendingStaticIntercessionReaction?.seatId === intent.seatId
      );
    const acceptingReviewedReroll =
      previousStage === "roll_result" &&
      isSoloRerollResolution(this.state.activeResolution);

    if (
      this.state.activeResolution &&
      !acceptingFailure &&
      !acceptingReviewedReroll &&
      previousStage !== "outcome_summary" &&
      previousStage !== "awaiting_continue"
    ) {
      throw new IntentRejectedError(intent.type, "The result is not ready to continue");
    }

    if (!this.state.activeResolution && this.state.status === "active" && this.state.phase === "resolution") {
      this.runAutomaticPhases(intent.seatId);
      const phaseAfterRecovery = this.state.phase as GameState["phase"];

      if (this.state.status === "active" && phaseAfterRecovery === "broadcast" && !this.state.activeResolution) {
        this.broadcastPatch();
        return;
      }

      this.broadcastPatch();
      return;
    }

    this.applyAction(this.intentToAction(intent));

    if (previousStage === "outcome_summary" && this.state.activeResolution?.stage === "awaiting_continue") {
      this.applyAction(this.intentToAction(intent));
    }
    this.runAutomaticPhases(intent.seatId);

    if (this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution) {
      this.broadcastPatch();
      return;
    }

    this.broadcastPatch();
  }

  private advanceNemesisNexusCountdowns(seatId: string): void {
    if (this.state.gameMode !== "nemesis_relay" || this.state.nemesisNexusCountdowns.length === 0) {
      return;
    }

    const nextCountdowns = this.state.nemesisNexusCountdowns.map((entry) => ({
      ...entry,
      remainingTurns: Math.max(0, entry.remainingTurns - 1)
    }));
    const expired = nextCountdowns.find((entry) => {
      const nemesis = this.state.nemesisChampions.find((champion) => champion.id === entry.nemesisId);
      return entry.remainingTurns <= 0 && nemesis && !nemesis.defeated && nemesis.sectorId === ASHEN_CROWN_NEXUS_SECTOR_ID;
    });

    this.state = {
      ...this.state,
      nemesisNexusCountdowns: nextCountdowns,
      sequence: this.state.sequence + 1
    };

    if (expired) {
      const nemesis = this.state.nemesisChampions.find((champion) => champion.id === expired.nemesisId);
      this.applyAction({
        type: "COOP_DEFEAT_TRIGGERED",
        seatId,
        summary: `${nemesis?.name ?? "A Nemesis Champion"} activated the Ashen Crown Nexus.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  private activateBoundNemesis(seatId: string): void {
    if (this.state.gameMode !== "nemesis_relay" || this.state.status !== "active") {
      return;
    }

    const nemesis = this.state.nemesisChampions.find((champion) => champion.boundPlayerId === seatId && !champion.defeated);

    if (!nemesis || nemesis.sectorId === ASHEN_CROWN_NEXUS_SECTOR_ID) {
      return;
    }

    const stepCount = getNemesisMovementStepCount(this.state, this.randomSource);
    const movement = buildNemesisMovementPath(this.state, nemesis, stepCount);

    if (movement.toSectorId === movement.fromSectorId) {
      return;
    }

    this.applyAction({
      type: "NEMESIS_MOVED",
      seatId,
      nemesisId: nemesis.id,
      fromSectorId: movement.fromSectorId,
      toSectorId: movement.toSectorId,
      path: movement.path,
      distanceToNexus: movement.distanceToNexus,
      createdAt: new Date().toISOString()
    } satisfies NemesisMovedAction);

    const movedNemesis = this.state.nemesisChampions.find((champion) => champion.id === nemesis.id);

    if (movedNemesis?.sectorId === ASHEN_CROWN_NEXUS_SECTOR_ID) {
      this.startNemesisNexusCountdown(seatId, movedNemesis);
    }
  }

  private startNemesisNexusCountdown(seatId: string, nemesis: NemesisChampion): void {
    if (this.state.nemesisNexusCountdowns.some((entry) => entry.nemesisId === nemesis.id)) {
      return;
    }

    this.applyAction({
      type: "NEMESIS_NEXUS_COUNTDOWN_STARTED",
      seatId,
      nemesisId: nemesis.id,
      remainingTurns: Math.max(1, this.state.turnOrder.length),
      createdAt: new Date().toISOString()
    } satisfies NemesisNexusCountdownStartedAction);
  }

  private startVisibleDiceRollIntent(
    client: ConnectedClient,
    intent: Extract<ClientIntent, { type: "CHECK_REQUESTED" | "COMBAT_REQUESTED" }>,
    resolveRoll: () => void
  ): void {
    const encounter = this.state.currentEncounter;

    if (!encounter) {
      throw new IntentRejectedError(intent.type, "No encounter is available to roll");
    }

    this.applyAction({
      type: "DICE_ROLL_STARTED",
      seatId: intent.seatId,
      stat: intent.stat,
      cardId: encounter.id,
      createdAt: new Date().toISOString()
    } satisfies DiceRollStartedAction);
    if (this.state.pendingTileChallenge?.id && this.state.pendingTileChallenge.seatId === intent.seatId) {
      this.state = {
        ...this.state,
        pendingTileChallenge: { ...this.state.pendingTileChallenge, rolled: true }
      };
    }
    this.broadcastPatch();

    const completeRoll = () => {
      try {
        resolveRoll();

        const shouldCompleteTurn =
          this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution;

        this.broadcastPatch();

        if (shouldCompleteTurn) {
          return;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Intent rejected";
        this.sendIntentRejected(client, intent.type, reason);
      }
    };

    if (VISIBLE_DICE_ROLL_MS <= 0) {
      completeRoll();
      return;
    }

    setTimeout(completeRoll, VISIBLE_DICE_ROLL_MS).unref?.();
  }

  resolveMoveIntent(intent: Extract<ClientIntent, { type: "MOVE_REQUESTED" }>): void {
    const routeStarChoice = this.state.routeStarChoices?.[intent.seatId];
    const routeId = routeStarChoice?.destinationId === intent.toSectorId ? routeStarChoice.routeId : intent.routeId;
    const movementRevision = routeStarChoice?.destinationId === intent.toSectorId ? routeStarChoice.movementRevision : intent.movementRevision;
    const { player, fromSectorId, targetSector } = this.assertLegalMove(intent.seatId, intent.toSectorId, intent.voidKeyInstanceId, true, routeId, movementRevision);
    const selectedRoute = routeId && movementRevision !== undefined
      ? getLegalMovementRouteVariant(this.state, intent.seatId, intent.toSectorId, routeId, movementRevision)
      : getLegalMovementRoute(this.state, intent.seatId, intent.toSectorId);
    this.emitMovementDiagnostic("movement-selected", intent.seatId, {
      selectedDestinationId: intent.toSectorId,
      route: selectedRoute?.route ?? [fromSectorId, intent.toSectorId]
    });

    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus =
      player.character.stats.guile +
      getEquippedGearModifierSources(player.character, "guile").reduce((sum, source) => sum + source.value, 0) +
      this.getScenarioSkillModifier(intent.seatId);
    const total = roll.total + statBonus;
    const routeDifficulty = Math.max(
      0,
      targetSector.danger + escalationModifier - getSoloMovementDifficultyEase(this.state.sessionMode)
    );
    const difficulty = this.shouldPreventMovementFailure() ? Math.min(routeDifficulty, total) : routeDifficulty;
    const success = total >= difficulty;
    const movementCreatedAt = new Date().toISOString();

    this.applyAction({
      type: "MOVEMENT_RESOLVED",
      seatId: intent.seatId,
      fromSectorId,
      toSectorId: intent.toSectorId,
      stat: "guile",
      difficulty,
      roll,
      statBonus,
      total,
      success,
      effect: success ? null : this.resolveEffect({ type: "gain_note", text: "Failed route entry: lasting harm is handled by Scars." }, intent.seatId),
      createdAt: movementCreatedAt
    } satisfies MovementResolvedAction);
    if (success) {
      this.beginMovementPresentationGate(
        intent.seatId,
        fromSectorId,
        intent.toSectorId,
        selectedRoute?.route ?? [fromSectorId, intent.toSectorId],
        movementCreatedAt
      );
      const destination = getBoardSpace(intent.toSectorId);
      this.maybeAdvanceContractObjective(intent.seatId, {
        type: "sector-visited", sectorId: intent.toSectorId, sectorTags: destination?.tags ?? []
      }, `Visited ${destination?.name ?? intent.toSectorId}.`);
    }
    this.applyScenarioOnSkillResolved(intent.seatId, "guile", success);
    this.maybeTriggerAbilityOnMovementResolved(intent.seatId, intent.toSectorId, success);
    if (success) {
      this.applyScenarioOnSectorEntered(intent.seatId, intent.toSectorId);
    }
    if (success && this.maybeOpenBileSpitReaction(
      intent.seatId,
      intent.toSectorId,
      `movement-arrival:${intent.seatId}:${movementCreatedAt}`
    )) {
      return;
    }
    this.runAutomaticPhases(intent.seatId);
    this.emitMovementDiagnostic("movement-committed", intent.seatId, {
      selectedDestinationId: success ? intent.toSectorId : fromSectorId,
      route: selectedRoute?.route ?? [fromSectorId, intent.toSectorId]
    });
  }

  private resolveTransitionRouteAidIntent(
    intent: Extract<ClientIntent, { type: "USE_TRANSITION_ROUTE_AID" }>
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player) throw new IntentRejectedError(intent.type, "Unknown route-aid owner");
    if (this.state.phase !== "navigation" || this.state.movementRolls?.[intent.seatId]) {
      throw new IntentRejectedError(intent.type, "Route aids may only be used before rolling movement");
    }
    const revision = this.state.movementRouteRevisions?.[intent.seatId] ?? 0;
    if (intent.movementRevision !== revision) {
      throw new IntentRejectedError(intent.type, "Route-aid movement revision is stale");
    }
    const destination = buildTransitionRouteAidDestinations(this.state, intent.seatId)
      .find((entry) => entry.sectorId === intent.destinationSectorId);
    if (!destination) {
      throw new IntentRejectedError(intent.type, "Choose a legal transition sector in the current reach");
    }
    const fromSectorId = player.character.currentSpaceId;
    const createdAt = new Date().toISOString();
    this.applyAction({
      type: "TRANSITION_ROUTE_AID_USED",
      seatId: intent.seatId,
      sourceKind: intent.sourceKind,
      instanceId: intent.instanceId,
      fromSectorId,
      toSectorId: destination.sectorId,
      route: destination.route,
      movementRevision: revision,
      createdAt
    });
    this.beginMovementPresentationGate(
      intent.seatId,
      fromSectorId,
      destination.sectorId,
      destination.route,
      createdAt
    );
    this.maybeAdvanceContractObjective(intent.seatId, {
      type: "sector-visited",
      sectorId: destination.sectorId,
      sectorTags: getBoardSpace(destination.sectorId)?.tags ?? []
    }, `Visited ${getBoardSpace(destination.sectorId)?.name ?? destination.sectorId}.`);
    this.applyScenarioOnSectorEntered(intent.seatId, destination.sectorId);
    this.runAutomaticPhases(intent.seatId);
  }

  private resolveTierTransitionIntent(
    intent: Extract<ClientIntent, { type: "TIER_TRANSITION_REQUESTED" }>
  ): void {
    if (this.state.status !== "active" || this.state.phase !== "navigation") {
      throw new IntentRejectedError(intent.type, `Cannot cross tiers during phase ${this.state.phase}`);
    }
    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
    if (activeSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may cross tiers");
    }
    if (this.state.movementRolls?.[intent.seatId]) {
      throw new IntentRejectedError(intent.type, "Tier crossing must be chosen before rolling movement");
    }

    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player || player.character.status !== "active") {
      throw new IntentRejectedError(intent.type, "This operative cannot cross tiers");
    }
    const revision = this.state.movementRouteRevisions?.[intent.seatId] ?? 0;
    if (intent.movementRevision !== revision) {
      throw new IntentRejectedError(intent.type, "Tier-transition movement revision is stale");
    }
    const transition = buildTierTransitionOptions(this.state, intent.seatId)
      .find((entry) => entry.sectorId === intent.destinationSectorId);
    if (!transition) {
      throw new IntentRejectedError(intent.type, "Choose a canonical tier transition from the current sector");
    }
    if (transition.disabledReason) {
      const key = intent.voidKeyInstanceId
        ? player.character.heldGear.find((item) =>
            item.id === "void-key" && item.instanceId === intent.voidKeyInstanceId
          )
        : null;
      const charges = key?.currentCharges ?? key?.charges ?? 0;
      if (
        !key ||
        charges < 1 ||
        player.character.equippedGear.utility !== key.id ||
        !canVoidKeyOverrideTierTransition(this.state, intent.seatId, intent.destinationSectorId)
      ) {
        throw new IntentRejectedError(intent.type, transition.disabledReason);
      }
    } else if (intent.voidKeyInstanceId) {
      throw new IntentRejectedError(intent.type, "Void Key is not required for this transition");
    }

    const fromSectorId = player.character.currentSpaceId;
    const createdAt = new Date().toISOString();
    this.movementPreviewBySeatId.delete(intent.seatId);
    this.applyAction({
      type: "TIER_TRANSITION_COMPLETED",
      seatId: intent.seatId,
      fromSectorId,
      toSectorId: intent.destinationSectorId,
      direction: transition.direction,
      movementRevision: revision,
      voidKeyInstanceId: intent.voidKeyInstanceId,
      createdAt
    } satisfies TierTransitionCompletedAction);
    this.beginMovementPresentationGate(
      intent.seatId,
      fromSectorId,
      intent.destinationSectorId,
      transition.route,
      createdAt
    );
    const destination = getBoardSpace(intent.destinationSectorId);
    this.maybeAdvanceContractObjective(intent.seatId, {
      type: "sector-visited",
      sectorId: intent.destinationSectorId,
      sectorTags: destination?.tags ?? []
    }, `Visited ${destination?.name ?? intent.destinationSectorId}.`);
    this.maybeTriggerAbilityOnMovementResolved(intent.seatId, intent.destinationSectorId, true);
    this.applyScenarioOnSectorEntered(intent.seatId, intent.destinationSectorId);
    if (this.maybeOpenBileSpitReaction(
      intent.seatId,
      intent.destinationSectorId,
      `tier-transition-arrival:${intent.seatId}:${createdAt}`
    )) {
      return;
    }
    this.runAutomaticPhases(intent.seatId);
    this.emitMovementDiagnostic("tier-transition-committed", intent.seatId, {
      selectedDestinationId: intent.destinationSectorId,
      route: transition.route
    });
  }

  private resolveInnerApproachMoveIntent(
    intent: Extract<ClientIntent, { type: "INNER_APPROACH_MOVE_REQUESTED" }>
  ): void {
    if (this.state.status !== "active" || this.state.phase !== "navigation") {
      throw new IntentRejectedError(intent.type, `Cannot traverse the inner approach during phase ${this.state.phase}`);
    }
    const activeSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
    if (activeSeatId !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative may traverse the inner approach");
    }
    if (this.state.movementRolls?.[intent.seatId]) {
      throw new IntentRejectedError(intent.type, "Inner approach movement replaces the movement roll");
    }
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    if (!player || player.character.status !== "active" || !isInnerApproachSector(player.character.currentSpaceId)) {
      throw new IntentRejectedError(intent.type, "The operative is not on the inner approach");
    }
    const revision = this.state.movementRouteRevisions?.[intent.seatId] ?? 0;
    if (intent.movementRevision !== revision) {
      throw new IntentRejectedError(intent.type, "Inner approach movement revision is stale");
    }
    const option = buildInnerApproachMoveOptions(this.state, intent.seatId)
      .find((entry) => entry.sectorId === intent.destinationSectorId);
    if (!option) {
      throw new IntentRejectedError(intent.type, "Choose a connected inner approach step");
    }
    if (option.disabledReason) {
      throw new IntentRejectedError(intent.type, option.disabledReason);
    }
    const routeProgress = getInnerApproachRouteProgress(this.state, intent.seatId);
    if (!routeProgress) {
      throw new IntentRejectedError(intent.type, "Inner approach path is unavailable");
    }

    const fromSectorId = player.character.currentSpaceId;
    const createdAt = new Date().toISOString();
    this.movementPreviewBySeatId.delete(intent.seatId);
    this.applyAction({
      type: "INNER_APPROACH_MOVED",
      seatId: intent.seatId,
      fromSectorId,
      toSectorId: intent.destinationSectorId,
      direction: option.direction,
      pathId: routeProgress.pathId,
      movementRevision: revision,
      createdAt
    } satisfies InnerApproachMovedAction);
    this.beginMovementPresentationGate(
      intent.seatId,
      fromSectorId,
      intent.destinationSectorId,
      option.route,
      createdAt
    );
    const destination = getBoardSpace(intent.destinationSectorId);
    this.maybeAdvanceContractObjective(intent.seatId, {
      type: "sector-visited",
      sectorId: intent.destinationSectorId,
      sectorTags: destination?.tags ?? []
    }, `Visited ${destination?.name ?? intent.destinationSectorId}.`);
    this.maybeTriggerAbilityOnMovementResolved(intent.seatId, intent.destinationSectorId, true);
    this.applyScenarioOnSectorEntered(intent.seatId, intent.destinationSectorId);
    if (this.maybeOpenBileSpitReaction(
      intent.seatId,
      intent.destinationSectorId,
      `inner-approach-arrival:${intent.seatId}:${createdAt}`
    )) {
      return;
    }
    this.runAutomaticPhases(intent.seatId);
    this.emitMovementDiagnostic("inner-approach-committed", intent.seatId, {
      selectedDestinationId: intent.destinationSectorId,
      route: option.route
    });
  }

  private beginMovementPresentationGate(
    seatId: string,
    fromSectorId: string,
    toSectorId: string,
    route: string[],
    createdAt: string
  ): void {
    const hostTvConnected = [...this.clients].some(
      (client) => client.view === "tv" && client.isHost && client.socket.readyState === 1
    );
    // Headless rules simulations and rooms without a host display must not
    // wait on an acknowledgement that no TV can send.
    if (!hostTvConnected) {
      this.state = { ...this.state, movementPresentationGate: null };
      return;
    }

    if (this.movementPresentationTimeout) {
      clearTimeout(this.movementPresentationTimeout);
      this.movementPresentationTimeout = null;
    }

    const normalizedRoute = route.length > 0 ? route : [fromSectorId, toSectorId];
    let durationMs = 380 + 720;
    for (let index = 0; index < normalizedRoute.length - 1; index += 1) {
      const from = getBoardSpace(normalizedRoute[index] ?? "");
      const to = getBoardSpace(normalizedRoute[index + 1] ?? "");
      durationMs += from?.tier && to?.tier && from.tier !== to.tier ? 840 : 640;
    }
    const fallbackMs = Math.min(12_000, Math.max(1_800, durationMs + 1_200));
    const eventId = `movement-presentation:${seatId}:${this.state.sequence}:${toSectorId}`;
    const deadlineAt = new Date(Date.now() + fallbackMs).toISOString();

    this.state = {
      ...this.state,
      movementPresentationGate: {
        eventId,
        seatId,
        fromSectorId,
        toSectorId,
        route: normalizedRoute,
        createdAt,
        deadlineAt
      }
    };

    this.movementPresentationTimeout = setTimeout(() => {
      this.completeMovementPresentation(eventId);
      this.broadcastPatch();
    }, fallbackMs);
    this.movementPresentationTimeout.unref?.();
  }

  private completeMovementPresentation(eventId: string): void {
    if (this.state.movementPresentationGate?.eventId !== eventId) return;
    if (this.movementPresentationTimeout) {
      clearTimeout(this.movementPresentationTimeout);
      this.movementPresentationTimeout = null;
    }
    this.state = {
      ...this.state,
      movementPresentationGate: null
    };
  }

  private shouldPreventMovementFailure(): boolean {
    if (this.state.sessionMode === "single-player") {
      return true;
    }

    const occupiedSeatIds = new Set(
      this.state.seats.filter((seat) => seat.characterId && !seat.kicked).map((seat) => seat.seatId)
    );
    const occupiedPlayerCount = this.state.players.filter((player) => occupiedSeatIds.has(player.seatId)).length;

    return occupiedPlayerCount <= 1;
  }

  private assertLegalMove(
    seatId: string,
    toSectorId: string,
    voidKeyInstanceId?: string,
    chargeAlreadySpent = false,
    routeId?: string,
    movementRevision?: number
  ): { player: PlayerState; fromSectorId: string; targetSector: GameState["sectors"][number] } {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${seatId}`);
    }

    const fromSectorId = player.character.currentSpaceId;
    const targetSector = this.state.sectors.find((entry) => entry.id === toSectorId);

    if (!this.state.sectors.some((entry) => entry.id === fromSectorId)) {
      throw new Error(`Unknown current sector ${fromSectorId}`);
    }

    if (!targetSector) {
      throw new Error(`Unknown sector ${toSectorId}`);
    }

    if (voidKeyInstanceId) {
      const key = player.character.heldGear.find((item) => item.id === "void-key" && item.instanceId === voidKeyInstanceId);
      const charges = key?.currentCharges ?? key?.charges ?? 0;
      if (!key || (!chargeAlreadySpent && charges < 1) || player.character.equippedGear.utility !== key.id || !getVoidKeyMovementRoute(this.state, seatId, toSectorId)) throw new Error("Void Key cannot authorize this route");
    } else if (routeId !== undefined || movementRevision !== undefined) {
      if (!routeId || movementRevision === undefined || !getLegalMovementRouteVariant(this.state, seatId, toSectorId, routeId, movementRevision)) {
        throw new Error("Movement route is stale, unknown, or belongs to another destination");
      }
    } else if (!getLegalMovementRoute(this.state, seatId, toSectorId)) {
      throw new Error(getMovementBlockReason(this.state, seatId, toSectorId) ?? `${targetSector.name} is not reachable by the current movement value`);
    }

    return { player, fromSectorId, targetSector };
  }

  resolveSpaceTextIntent(
    intent: Extract<ClientIntent, { type: "RESOLVE_SPACE_TEXT" }>,
    cooperativeRoll?: {
      roll: ReturnType<typeof rollDice>;
      modifierSources: RollModifierSource[];
      statBonus: number;
      difficulty: number;
      total: number;
      success: boolean;
    }
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace) {
      throw new Error(`No board text is registered for ${player.character.currentSpaceId}`);
    }
    if (boardSpace.tier === "inner" && isInnerApproachChallengeCleared(this.state, player)) {
      throw new IntentRejectedError(intent.type, `${boardSpace.name} has already been cleared by this operative`);
    }
    if (
      this.state.phase !== "action" &&
      !(this.state.phase === "navigation" && boardSpace.tier === "inner")
    ) {
      throw new IntentRejectedError(intent.type, `Cannot resolve ${boardSpace.name} during phase ${this.state.phase}`);
    }

    const boardTextEffect = resolveBoardTextEffect(boardSpace.textBox.effectKey);
    if (boardTextEffect?.choices?.length) {
      if (!intent.choiceId) {
        throw new Error(`Choose how to resolve ${boardSpace.textBox.title} before continuing`);
      }

      if (!resolveBoardTextChoice(boardSpace.textBox.effectKey, intent.choiceId)) {
        throw new Error(`Unknown board-text choice ${intent.choiceId} for ${boardSpace.textBox.title}`);
      }
    }

    const resolution = resolveSpaceText(boardSpace.textBox.effectKey, intent.choiceId);
    if (resolution.check?.stat && isCooperativeAssistanceMode(this.state) && !cooperativeRoll) {
      const createdAt = new Date().toISOString();
      this.stagePendingCooperativeTest({
        id: `coop-test:board:${intent.seatId}:${boardSpace.textBox.effectKey}:${this.state.sequence + 1}`,
        activeSeatId: intent.seatId,
        sourceKind: "boardSpace",
        sourceId: boardSpace.textBox.effectKey,
        sourceTitle: boardSpace.textBox.title,
        stat: resolution.check.stat,
        difficulty: resolution.check.difficulty + getEscalationModifier(this.state.escalationLevel),
        requiresHelper: false,
        ...(intent.choiceId ? { choiceId: intent.choiceId } : {}),
        createdAt
      });
      return;
    }
    const sectorCardResolution = this.resolveSectorCardResolution(intent.seatId, boardTextEffect?.sectorDeck?.kind ?? null);
    let checkPayload:
      | {
          checkStat: Stat;
          difficulty: number;
          roll: ReturnType<typeof rollDice>;
          statBonus: number;
          total: number;
          success: boolean;
        }
      | null = null;
    let baseSummary = resolution.summary;
    let baseEffect = resolution.effect;

    if (resolution.check?.stat) {
      const roll = cooperativeRoll?.roll ?? rollDice(2, 6, this.randomSource);
      const escalationModifier = getEscalationModifier(this.state.escalationLevel);
      const statBonus = cooperativeRoll?.statBonus ?? (
        player.character.stats[resolution.check.stat] +
        getEquippedGearModifierSources(player.character, resolution.check.stat).reduce((sum, source) => sum + source.value, 0) +
        this.getScenarioSkillModifier(intent.seatId) +
        this.sumModifierSources(this.getPendingRollModifierSources(intent.seatId, resolution.check.stat, "check"))
      );
      const difficulty = cooperativeRoll?.difficulty ?? (resolution.check.difficulty + escalationModifier);
      const total = cooperativeRoll?.total ?? (roll.total + statBonus);
      const success = cooperativeRoll?.success ?? (total >= difficulty);

      checkPayload = {
        checkStat: resolution.check.stat,
        difficulty,
        roll,
        statBonus,
        total,
        success
      };
      baseSummary = `${success ? resolution.summary : resolution.check.failureSummary ?? resolution.summary} ${resolution.check.stat} ${total}/${difficulty}.`;
      baseEffect = success
        ? resolution.effect
        : resolution.check.failureEffect ?? null;
    }

    const combinedSummary = [baseSummary, sectorCardResolution?.summary].filter(Boolean).join(" ");
    const combinedEffect = this.combineEffects(
      [baseEffect, sectorCardResolution?.effect].filter((effect): effect is EncounterEffect => Boolean(effect)).map((effect) =>
        this.resolveEffect(effect, intent.seatId)
      )
    );

    if (sectorCardResolution?.escalationDelta) {
      this.feedEscalation(intent.seatId, sectorCardResolution.escalationDelta, "sector stabilization");

      if (this.state.status !== "active") {
        return;
      }
    }

    this.applyAction({
      type: "SPACE_TEXT_RESOLVED",
      seatId: intent.seatId,
      effectKey: resolution.effectKey,
      summary: combinedSummary,
      effect: combinedEffect,
      checkStat: checkPayload?.checkStat ?? null,
      difficulty: checkPayload?.difficulty ?? null,
      roll: checkPayload?.roll ?? null,
      statBonus: checkPayload?.statBonus ?? null,
      total: checkPayload?.total ?? null,
      success: checkPayload?.success ?? null,
      sectorId: player.sectorId,
      discoveredContracts: sectorCardResolution?.discoveredContracts,
      revealedCard: sectorCardResolution?.revealedCard,
      consumedDeckCards: sectorCardResolution?.consumedDeckCards,
      createdAt: new Date().toISOString()
    } satisfies SpaceTextResolvedAction);
    if (cooperativeRoll) {
      this.finishAssistedRoll(intent.seatId, boardSpace.textBox.effectKey, cooperativeRoll.success);
      this.state = {
        ...this.state,
        pendingCooperativeTest: null,
        activeResolution: this.state.activeResolution
          ? {
              ...this.state.activeResolution,
              battle: {
                ...(this.state.activeResolution.battle ?? {
                  stat: resolution.check!.stat,
                  difficulty: cooperativeRoll.difficulty,
                  modifiers: []
                }),
                modifiers: cooperativeRoll.modifierSources
              }
            }
          : this.state.activeResolution
      };
    }
    if (checkPayload) {
      this.applyScenarioOnSkillResolved(intent.seatId, checkPayload.checkStat, checkPayload.success);
      this.maybeTriggerAbilityOnCheckResolved(intent.seatId, checkPayload.checkStat, checkPayload.success);
    }
    if (!checkPayload || checkPayload.success) {
      if (player.sectorId === "mirecoil-beacon" || player.sectorId === "transit-gate") {
        this.queueMissionReward({
          ownerSeatId: intent.seatId,
          sourceKind: "tile",
          sourceId: player.sectorId,
          sourceTitle: boardSpace.name
        });
      }
      this.maybeAdvanceContractObjective(
        intent.seatId,
        {
          type: "space-text-resolved",
          effectKey: resolution.effectKey
        },
        "The local board-text objective advanced."
      );
      this.applyScenarioObjectiveTrigger(intent.seatId, {
        type: "sectorActionCompleted",
        effectKey: resolution.effectKey,
        sectorId: player.sectorId
      });
      this.applyRivalryAgendaProgressTrigger(intent.seatId, {
        type: "sectorActionCompleted",
        seatId: intent.seatId,
        sectorId: player.sectorId
      });
    }
    this.maybeTriggerAbilityOnSpaceTextResolved(intent.seatId, resolution.effectKey);
    this.runAutomaticPhases(intent.seatId);
  }

  private resolveCharacterAbilityIntent(intent: Extract<ClientIntent, { type: "USE_CHARACTER_ABILITY" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (player?.character.id === "cinder-wattle" && intent.abilityId === "scrap-crowned-instinct") {
      const context = this.getScrapCrownedInstinctContext(intent.seatId);
      if (!context) {
        throw new IntentRejectedError(intent.type, "Scrap-Crowned Instinct requires a known eligible test before dice are revealed.");
      }
      if (this.hasAbilityTriggeredThisRound(intent.seatId, intent.abilityId)) {
        throw new IntentRejectedError(intent.type, "Scrap-Crowned Instinct has already been used this round.");
      }
      const label = "Scrap-Crowned Instinct";
      this.applyAbilityMutation(
        intent.seatId,
        intent.abilityId,
        `${label} prepared +1 ${CHALLENGE_LABELS[context.stat]} for ${context.sourceTitle}.`,
        (entry) => ({ ...entry }),
        {
          sourceId: context.sourceId,
          testedStat: context.stat,
          rollModifier: { label, value: 1, stat: context.stat, mode: context.mode }
        }
      );
      return;
    }

    if (!player || player.character.id !== "cinder-monk" || intent.abilityId !== "cinder-oath") {
      throw new IntentRejectedError(intent.type, "That character ability is not available to this operative.");
    }

    if (this.state.status !== "active" || this.state.phase !== "action") {
      throw new IntentRejectedError(intent.type, "Cinder Oath can only be prepared during your action phase before the confrontation.");
    }

    if (!isScenarioConfrontationSpace(player.character.currentSpaceId)) {
      throw new IntentRejectedError(intent.type, "Cinder Oath can only be prepared at the Cinder Gate before a scenario confrontation.");
    }

    if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new IntentRejectedError(intent.type, "Only the active operative can prepare Cinder Oath.");
    }

    if (this.hasAbilityTriggeredThisRound(intent.seatId, "cinder-oath")) {
      throw new IntentRejectedError(intent.type, "Cinder Oath has already been prepared this round.");
    }

    const vowNotes = player.private.noteResources?.vow ?? 0;
    if (vowNotes < 1) {
      throw new IntentRejectedError(intent.type, "Cinder Oath requires 1 Vow Note.");
    }

    this.applyAbilityMutation(
      intent.seatId,
      "cinder-oath",
      "Cinder Oath spent 1 Vow Note; the next scenario confrontation gains +2 to each test.",
      (entry) => ({
        ...entry,
        private: {
          ...entry.private,
          noteResources: {
            ...(entry.private.noteResources ?? {}),
            vow: Math.max(0, (entry.private.noteResources?.vow ?? 0) - 1)
          },
          notes: [...entry.private.notes, "Cinder Oath is prepared: +2 to the next scenario confrontation test."]
        }
      })
    );
  }

  resolveScenarioConfrontationIntent(intent: Extract<ClientIntent, { type: "SCENARIO_CONFRONTATION_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    const scenario = getScenarioDefinition(this.state.activeScenarioId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (!scenario) {
      throw new Error(`Unknown active scenario ${this.state.activeScenarioId}`);
    }

    const mirrorPressure = this.state.scenarioProgress.mirrorPressure ?? player.character.scars.length;

    const reflectionPressureThreshold = getReflectionPressureThreshold(this.state);
    if (scenario.id === "scenario_mirror_of_false_heroes" && mirrorPressure >= reflectionPressureThreshold) {
      this.applyAmbientScenarioMutation(
        intent.seatId,
        (state) => state,
        `${player.character.name} cannot face the mirror while reflection pressure sits at ${mirrorPressure}/${reflectionPressureThreshold}. The confrontation ends immediately.`
      );
      this.applyAction({
        type: "PHASE_ADVANCED",
        seatId: intent.seatId,
        toPhase: "resolution",
        transitionCause: "automatic",
        createdAt: new Date().toISOString()
      });
      this.runAutomaticPhases(intent.seatId);
      return;
    }

    const gateBlockReason = this.getScenarioGateBlockReason(player, scenario);
    if (gateBlockReason) {
      throw new IntentRejectedError(intent.type, gateBlockReason);
    }

    if (scenario.id === BROKEN_CONCORDANCE_SCENARIO_ID) {
      if (player.character.currentSpaceId !== BROKEN_CONCORDANCE_CENTER_SECTOR_ID) {
        throw new IntentRejectedError(intent.type, "The Hollow Regent can only be confronted at the Cinder Gate");
      }
      const stageIndex = this.state.scenarioConfrontation.progress.concordanceStages ?? 0;
      const stage = getBrokenConcordanceStage(stageIndex);
      if (!stage) throw new IntentRejectedError(intent.type, "The Hollow Regent confrontation is already complete");
      const confrontationId = `${scenario.id}:confrontation:${stage.id}:${this.state.sequence + 1}`;
      this.applyAction({
        type: "SCENARIO_CONFRONTATION_STARTED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        confrontationId,
        sourceEventId: `${confrontationId}:started`,
        stage: stage.id,
        summary: `${stage.label} began beneath the Cinder Gate.`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioConfrontationStartedAction);
      this.stagePendingCooperativeTest({
        id: `coop-test:confrontation:${stage.id}:${this.state.sequence + 1}`,
        activeSeatId: intent.seatId,
        sourceKind: "scenarioConfrontation",
        sourceId: stage.id,
        sourceTitle: stage.label,
        stat: stage.stat,
        difficulty: stage.difficulty + getEscalationModifier(this.state.escalationLevel),
        requiresHelper: true,
        createdAt: new Date().toISOString()
      });
      return;
    }

    const confrontationId = `${scenario.id}:confrontation:${this.state.sequence + 1}`;
    if (scenario.id === "scenario_broken_seal") {
      this.applyAction({
        type: "SCENARIO_CONFRONTATION_STARTED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        confrontationId,
        sourceEventId: `${confrontationId}:started`,
        stage: "resolving",
        summary: `${scenario.confrontationTitle} began at the Cinder Gate.`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioConfrontationStartedAction);
    }

    const plan = this.buildScenarioPlan(player);
    const nemesis = this.getActiveNemesis();
    const usesNemesisStats = Boolean(nemesis && nemesis.scenarioConfrontationMode !== "authored-plan");
    const confrontationModifier = getEscalationModifier(this.state.escalationLevel);

    const cinderOathBonus = player.character.id === "cinder-monk" && this.hasAbilityTriggeredThisRound(intent.seatId, "cinder-oath") ? 2 : 0;
    const results = plan.checks.map((check, index) => {
      const roll = rollDice(2, 6, this.randomSource);
      const scrapCrownedBonus = index === 0
        ? this.sumModifierSources(this.getPendingRollModifierSources(intent.seatId, check.stat, "check"))
        : 0;
      const statBonus =
        player.character.stats[check.stat] +
        getEquippedGearModifierSources(player.character, check.stat).reduce((sum, source) => sum + source.value, 0) +
        this.getScenarioSkillModifier(intent.seatId) + cinderOathBonus + scrapCrownedBonus;
      const difficulty = check.difficulty + confrontationModifier;
      const total = roll.total + statBonus;

      return {
        ...check,
        difficulty,
        roll,
        statBonus,
        total,
        success: total >= difficulty
      };
    });
    const marksEarned = results.filter((result) => result.success).length;
    const failedChecks = results.length - marksEarned;
    const progressKey = scenario.winConditionKey;
    const currentProgress = scenario.id === "scenario_broken_seal"
      ? 0
      : this.state.scenarioProgress[progressKey] ?? 0;
    const nextProgress = currentProgress + marksEarned;
    const effectiveThreshold = getScenarioProgressThreshold(scenario.id, scenario.victoryThreshold);
    const willWin = nextProgress >= effectiveThreshold;
    const effectParts: EncounterEffect[] = [];

    if (plan.effect) {
      effectParts.push(plan.effect);
    }

    if (usesNemesisStats && failedChecks > 0) {
      effectParts.push({ type: "take_wound", amount: failedChecks });
    }

    switch (usesNemesisStats ? null : scenario.id) {
      case "scenario_broken_seal":
        if (failedChecks > 0) {
          effectParts.push({ type: "take_wound", amount: failedChecks });
        }
        break;
      case "scenario_mirror_of_false_heroes":
        if (failedChecks > 0) {
          effectParts.push({ type: "gain_note", text: `Mirror backlash raised reflection pressure by ${failedChecks}.` });
        }
        break;
      case "scenario_devourer_beneath":
        if (failedChecks > 0) {
          effectParts.push({ type: "take_wound", amount: 1 });
          effectParts.push({ type: "gain_note", text: "Devourer backlash left a scar-safe corruption note instead of deprecated pressure." });
        }
        break;
      case "scenario_labyrinth_engine":
        if (failedChecks > 0) {
          effectParts.push({ type: "gain_note", text: `Engine backlash raised instability by ${failedChecks}.` });
        }
        break;
      case "scenario_dying_star":
        if (failedChecks > 0) {
          effectParts.push({ type: "take_wound", amount: failedChecks });
        }
        break;
      default:
        break;
    }

    const combinedEffect =
      effectParts.length === 0
        ? null
        : effectParts.length === 1
          ? effectParts[0]!
          : ({ type: "sequence", effects: effectParts } satisfies EncounterEffect);
    const rawAppliedEffect = usesNemesisStats && willWin ? plan.effect : combinedEffect;
    const appliedEffect = scenario.id === "scenario_broken_seal" && rawAppliedEffect
      ? this.maybeApplyKerWoundPrevention(
          intent.seatId,
          this.maybeApplyFandiablosWoundPrevention(intent.seatId, rawAppliedEffect)
        )
      : rawAppliedEffect;
    const backlashSummary =
      usesNemesisStats && willWin && failedChecks > 0
        ? `Backlash ${failedChecks} denied by the killing blow.`
        : failedChecks > 0
          ? `Backlash ${failedChecks}.`
          : "No backlash.";

    const summary = [
      `${scenario.confrontationTitle}: ${marksEarned} ${plan.markLabel}${marksEarned === 1 ? "" : "s"} earned.${cinderOathBonus ? " Cinder Oath +2 applied to each test." : player.character.id === "cinder-monk" ? " Cinder Oath unavailable: no prepared Vow Note." : ""}`,
      ...results.map((result) =>
        `${result.label} via ${result.stat} ${result.total}/${result.difficulty} ${result.success ? "passed" : "failed"}`
      ),
      backlashSummary,
      `Progress ${nextProgress}/${effectiveThreshold}.`
    ].join(" ");

    const confrontationResolutionSourceId = `${confrontationId}:resolved`;
    if (scenario.id === "scenario_broken_seal") {
      this.applyAction({
        type: "SCENARIO_CONFRONTATION_PROGRESS_GAINED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        confrontationId,
        progressKey: "restorationMarks",
        amount: marksEarned,
        progressMode: "replace",
        sourceEventId: confrontationResolutionSourceId,
        stage: willWin ? "completed" : "attempt-resolved",
        effect: appliedEffect,
        summary,
        createdAt: new Date().toISOString()
      } satisfies ScenarioConfrontationProgressGainedAction);
    } else {
      this.applyAction({
        type: "SCENARIO_PROGRESS_ADVANCED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        progressKey,
        amount: marksEarned,
        effect: appliedEffect,
        summary,
        createdAt: new Date().toISOString()
      } satisfies ScenarioProgressAdvancedAction);
    }

    if (willWin && this.state.status === "active") {
      this.applyAction({
        type: "SCENARIO_VICTORY_ACHIEVED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        ...(scenario.id === "scenario_broken_seal"
          ? {
              victoryConditionId: "broken-seal:resealed",
              sourceType: "confrontation" as const,
              sourceId: confrontationResolutionSourceId,
              shared: true
            }
          : {}),
        summary: `${scenario.name} completed. ${plan.victorySummary}`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioVictoryAchievedAction);
      return;
    }

    if (this.state.status !== "active") {
      return;
    }

    this.maybeApplyScenarioThresholds(intent.seatId);

    if (this.state.status !== "active") {
      return;
    }

    if (nextProgress >= effectiveThreshold) {
      this.applyAction({
        type: "SCENARIO_VICTORY_ACHIEVED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
        ...(scenario.id === "scenario_broken_seal"
          ? {
              victoryConditionId: "broken-seal:resealed",
              sourceType: "confrontation" as const,
              sourceId: confrontationResolutionSourceId,
              shared: true
            }
          : {}),
        summary: `${scenario.name} completed. ${plan.victorySummary}`,
        createdAt: new Date().toISOString()
      } satisfies ScenarioVictoryAchievedAction);
      return;
    }
  }

  resolveStabilizeIntent(intent: Extract<ClientIntent, { type: "STABILIZE_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (this.state.status !== "active" || this.state.phase !== "action") {
      throw new Error("Stabilize is only available during an active action phase");
    }

    if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new Error("Only the active seat can stabilize the breach");
    }

    if (player.character.status !== "active") {
      throw new Error("Recalled operatives cannot stabilize the breach");
    }

    if (this.state.pendingEnemyRoll || this.state.currentEncounter || this.state.pendingEffect) {
      throw new Error("Resolve the current threat before stabilizing the breach");
    }

    if (this.state.escalationLevel <= 0) {
      throw new Error("Escalation is already stable");
    }

    this.applyAction({
      type: "STABILIZE_RESOLVED",
      seatId: intent.seatId,
      cost: { kind: "action", amount: 1 },
      createdAt: new Date().toISOString()
    } satisfies StabilizeResolvedAction);
    this.maybeTriggerAbilityOnStabilizeResolved(intent.seatId);

    this.feedEscalation(intent.seatId, -1, "stabilized");

    if (this.state.status !== "active") {
      return;
    }

    if (this.state.phase === "action") {
      this.applyAction({
        type: "PHASE_ADVANCED",
        seatId: intent.seatId,
        toPhase: "resolution",
        transitionCause: "automatic",
        createdAt: new Date().toISOString()
      });

      this.runAutomaticPhases(intent.seatId);
    }
  }

  private getRaiseStatCost(currentValue: number): number {
    return getStatUpgradeCost(currentValue);
  }

  private hasActiveScarAdvancementDiscount(seatId: string): boolean {
    for (let index = this.state.eventLog.length - 1; index >= 0; index -= 1) {
      const event = this.state.eventLog[index] as { type?: string; seatId?: string; ruleKey?: string };
      if (event.seatId !== seatId) continue;
      if (event.type === "STAT_RAISED") return false;
      if (event.type === "SCAR_ADAPTATION_ACTIVATED" && event.ruleKey === "trophy-advancement-discount") return true;
    }
    return false;
  }

  resolveRaiseStatIntent(intent: Extract<ClientIntent, { type: "RAISE_STAT_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (this.state.status !== "active" || !getStatUpgradeWindow(this.state.phase)) {
      throw new Error("Stat upgrades are only available during Setup or Experience");
    }

    if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new Error("Only the active seat can raise a stat");
    }

    if (player.character.status !== "active") {
      throw new Error("Recalled operatives cannot raise stats");
    }

    if (this.state.pendingEnemyRoll || this.state.currentEncounter || this.state.pendingEffect || this.state.activeResolution) {
      throw new Error("Resolve the current threat before raising a stat");
    }

    if (!isUpgradeableStat(intent.stat)) {
      throw new Error("Invalid stat: stat is not allowed for upgrades");
    }

    const currentValue = player.character.stats[intent.stat];
    const baseCost = this.getRaiseStatCost(currentValue);
    const cost = Math.max(0, baseCost - (this.hasActiveScarAdvancementDiscount(intent.seatId) ? 1 : 0));
    const disabledReason = getStatUpgradeDisabledReason({
      stat: intent.stat,
      currentValue,
      trophies: player.character.trophies,
      qaOnly: player.character.qaOnly === true || player.character.id === MASTER_ALPHA_ID,
      cap: NORMAL_STAT_UPGRADE_CAP
    });

    if (disabledReason) {
      throw new Error(disabledReason);
    }

    this.applyAction({
      type: "STAT_RAISED",
      seatId: intent.seatId,
      stat: intent.stat,
      cost,
      previousValue: currentValue,
      nextValue: currentValue + 1,
      createdAt: new Date().toISOString()
    } satisfies StatRaisedAction);

    if (RAISE_STAT_FEEDS_ESCALATION) {
      this.feedEscalation(intent.seatId, ESCALATION_FEEDERS.trophyDiscarded, RAISE_STAT_ESCALATION_REASON);

      if (this.state.status !== "active") {
        return;
      }
    }

    this.applyAction({
      type: "PHASE_ADVANCED",
      seatId: intent.seatId,
      toPhase: "resolution",
      transitionCause: "automatic",
      createdAt: new Date().toISOString()
    });

    this.runAutomaticPhases(intent.seatId);
  }

  resolveCombatIntent(intent: Extract<ClientIntent, { type: "COMBAT_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const encounter = this.state.currentEncounter;

    if (!encounter) {
      throw new Error("No encounter is available to resolve");
    }

    if (encounter.cardType !== "enemy") {
      throw new Error("Hazard encounters do not use combat resolution");
    }

    if (this.state.pendingEnemyRoll) {
      throw new Error("Combat is already waiting on an assigned enemy roller");
    }

    // Enemy dice are authoritative and automatic. Historical pending enemy-roll
    // records remain supported for v0-v2 reconnect/import, but current combat no
    // longer asks another phone to trigger the enemy roll.
    this.resolveOpposedCombat(intent.seatId, intent.stat, encounter, null);
  }

  resolveNemesisCombatIntent(intent: Extract<ClientIntent, { type: "NEMESIS_COMBAT_REQUESTED" }>): void {
    if (this.state.gameMode !== "nemesis_relay") {
      throw new Error("Nemesis combat is only available in Nemesis Relay mode");
    }

    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);
    const nemesis = this.state.nemesisChampions.find((champion) => champion.id === intent.nemesisId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (!nemesis || nemesis.defeated) {
      throw new Error("Nemesis is not active");
    }

    if (player.character.status !== "active") {
      throw new Error("Recalled operatives cannot fight a Nemesis");
    }

    if (player.character.currentSpaceId !== nemesis.sectorId) {
      throw new Error(`${player.character.name} must be on ${nemesis.name}'s space to fight it`);
    }

    const requestedAssistSeatIds = Array.from(new Set(intent.assistSeatIds ?? []));
    const eligibleAssistSeatIds = new Set(getEligibleAssistSeatIds(this.state, intent.seatId, nemesis));
    const invalidAssist = requestedAssistSeatIds.find((seatId) => !eligibleAssistSeatIds.has(seatId));

    if (invalidAssist) {
      throw new Error(`${invalidAssist} cannot assist this Nemesis combat`);
    }

    const createdAt = new Date().toISOString();
    const battleLifecycleId = `${intent.seatId}:threat:${nemesis.id}:${createdAt}`;
    this.state = reserveEquipmentSuppressions(this.state, intent.seatId, battleLifecycleId, "battle");
    const battlePlayer = this.state.players.find((entry) => entry.seatId === intent.seatId)!;
    const stat = getNemesisCombatStat(nemesis, intent.stat);
    const roll = rollDice(2, 6, this.randomSource);
    const nemesisRoll = rollDice(2, 6, this.randomSource);
    const assistBonus = getAssistBonus(this.state, intent.seatId, nemesis, requestedAssistSeatIds);
    const statBonus =
      battlePlayer.character.stats[stat] +
      getEquippedGearModifierSources(battlePlayer.character, stat, { mode: "battle", suppressedInstanceIds: getSuppressedEquipmentInstanceIds(this.state, intent.seatId, battleLifecycleId) }).reduce((sum, source) => sum + source.value, 0) +
      this.getScenarioBattleModifier(intent.seatId) +
      assistBonus +
      getMasterAlphaBattleBonus(battlePlayer);
    const nemesisBonus = getNemesisCombatValue(nemesis, stat);
    const attackerTotal = roll.total + statBonus;
    const nemesisTotal = nemesisRoll.total + nemesisBonus;
    const success = attackerTotal >= nemesisTotal;
    const damage = success ? 1 : 0;
    const summary = success
      ? `${battlePlayer.character.name} struck ${nemesis.name} for ${damage} damage.`
      : `${nemesis.name} beat ${battlePlayer.character.name}; the lead operative suffers 1 wound.`;

    this.applyAction({
      type: "NEMESIS_COMBAT_RESOLVED",
      seatId: intent.seatId,
      nemesisId: nemesis.id,
      attackerSeatId: intent.seatId,
      assistSeatIds: requestedAssistSeatIds,
      stat,
      roll,
      nemesisRoll,
      attackerTotal,
      nemesisTotal,
      success,
      damage,
      summary,
      createdAt
    } satisfies NemesisCombatResolvedAction);

    if (!success) {
      this.applyNemesisCombatFailure(intent.seatId, nemesis, requestedAssistSeatIds);
    }

    const updatedNemesis = this.state.nemesisChampions.find((champion) => champion.id === nemesis.id);

    if (updatedNemesis && !updatedNemesis.defeated && updatedNemesis.health <= 0) {
      this.defeatNemesis(intent.seatId, updatedNemesis);
    }

    if (this.state.status === "active" && this.state.nemesisChampions.length > 0 && this.state.nemesisChampions.every((champion) => champion.defeated)) {
      this.applyAction({
        type: "COOP_VICTORY_TRIGGERED",
        seatId: intent.seatId,
        summary: "All Nemesis Champions were destroyed before the Ashen Crown Nexus fell.",
        createdAt: new Date().toISOString()
      });
    }
    this.state = completeEquipmentSuppressionLifecycle(this.state, battleLifecycleId);
  }

  private applyNemesisCombatFailure(leadSeatId: string, nemesis: NemesisChampion, assistSeatIds: string[]): void {
    const woundedSeatIds = nemesis.specialRuleId === "cleave" ? [leadSeatId, ...assistSeatIds] : [leadSeatId];
    const previousTotalWounds = this.getTotalWounds(this.state);

    this.state = {
      ...this.state,
      players: this.state.players.map((player) =>
        woundedSeatIds.includes(player.seatId)
          ? {
              ...player,
              character: {
                ...player.character,
                wounds: player.character.wounds + 1
              }
            }
          : player
      ),
      sequence: this.state.sequence + 1,
      eventLog: [
        ...this.state.eventLog,
        {
          type: "NEMESIS_DAMAGE_APPLIED",
          seatId: leadSeatId,
          nemesisId: nemesis.id,
          woundedSeatIds,
          createdAt: new Date().toISOString()
        }
      ]
    };

    const woundDelta = this.getTotalWounds(this.state) - previousTotalWounds;

    if (woundDelta > 0) {
      this.feedEscalation(leadSeatId, woundDelta * ESCALATION_FEEDERS.woundTaken, "nemesis wounds");
      this.applyScenarioOnWoundsTaken(leadSeatId, woundDelta);
    }
  }

  private defeatNemesis(attackerSeatId: string, nemesis: NemesisChampion): void {
    const boundSeatId = nemesis.boundPlayerId;

    this.applyAction({
      type: "NEMESIS_DEFEATED",
      seatId: attackerSeatId,
      nemesisId: nemesis.id,
      attackerSeatId,
      boundSeatId,
      summary: `${nemesis.name} was destroyed. ${boundSeatId} gains a Crown-Key Fragment.`,
      createdAt: new Date().toISOString()
    } satisfies NemesisDefeatedAction);

    this.applyAction({
      type: "CROWN_KEY_FRAGMENT_GAINED",
      seatId: attackerSeatId,
      targetSeatId: boundSeatId,
      sourceNemesisId: nemesis.id,
      createdAt: new Date().toISOString()
    });

    if (attackerSeatId !== boundSeatId) {
      this.state = {
        ...this.state,
        players: this.state.players.map((player) =>
          player.seatId === attackerSeatId
            ? {
                ...player,
                character: {
                  ...player.character,
                  trophies: player.character.trophies + 2
                }
              }
            : player
        ),
        sequence: this.state.sequence + 1
      };
    }
  }

  resolveEnemyRollIntent(intent: Extract<ClientIntent, { type: "ENEMY_ROLL_REQUESTED" }>): void {
    const pendingEnemyRoll = this.state.pendingEnemyRoll;

    if (!pendingEnemyRoll) {
      throw new Error("No enemy roll is waiting to be triggered");
    }

    if (pendingEnemyRoll.assignedRollerSeatId !== intent.seatId) {
      throw new Error("Only the assigned enemy roller can trigger this roll");
    }

    const encounter = this.state.currentEncounter;

    if (!encounter || encounter.cardType !== "enemy" || encounter.id !== pendingEnemyRoll.encounterCardId) {
      throw new Error("No enemy encounter is available to resolve");
    }

    this.resolveOpposedCombat(
      pendingEnemyRoll.fighterSeatId,
      pendingEnemyRoll.stat,
      encounter,
      pendingEnemyRoll.assignedRollerSeatId
    );
  }

  private chooseEnemyRollerSeatId(activeSeatId: string): string | null {
    const eligibleSeats = this.state.seats.filter(
      (seat) => seat.connected && !seat.kicked && seat.seatId !== activeSeatId
    );

    if (eligibleSeats.length === 0) {
      return null;
    }

    return eligibleSeats[this.randomSource.nextInt(eligibleSeats.length)]?.seatId ?? null;
  }

  private recoverPendingEnemyRollForLeavingSeat(leavingSeatId: string): void {
    const pending = this.state.pendingEnemyRoll;

    if (!pending || pending.assignedRollerSeatId !== leavingSeatId || this.state.status !== "active") {
      return;
    }

    const replacementSeatId = this.chooseEnemyRollerSeatId(pending.fighterSeatId);

    if (replacementSeatId) {
      this.state = {
        ...this.state,
        sequence: this.state.sequence + 1,
        pendingEnemyRoll: {
          ...pending,
          assignedRollerSeatId: replacementSeatId
        },
        lastOutcomeSummary: this.state.lastOutcomeSummary
          ? {
              ...this.state.lastOutcomeSummary,
              enemyRollerSeatId: replacementSeatId,
              summary: `${this.state.lastOutcomeSummary.summary} Enemy roll reassigned from ${this.getSeatLabel(
                leavingSeatId
              )} to ${this.getSeatLabel(replacementSeatId)}.`
            }
          : this.state.lastOutcomeSummary,
        eventLog: [
          ...this.state.eventLog,
          {
            type: "ENEMY_ROLL_REASSIGNED",
            fromSeatId: leavingSeatId,
            toSeatId: replacementSeatId,
            createdAt: new Date().toISOString()
          }
        ]
      };
      this.scheduleEnemyRollTimeout();
      return;
    }

    const encounter = this.state.currentEncounter;

    if (!encounter || encounter.cardType !== "enemy" || encounter.id !== pending.encounterCardId) {
      this.state = {
        ...this.state,
        sequence: this.state.sequence + 1,
        pendingEnemyRoll: null,
        lastOutcomeSummary: this.state.lastOutcomeSummary
          ? {
              ...this.state.lastOutcomeSummary,
              summary: `${this.state.lastOutcomeSummary.summary} Enemy roll cleared after ${this.getSeatLabel(
                leavingSeatId
              )} left.`
            }
          : this.state.lastOutcomeSummary
      };
      return;
    }

    this.resolveOpposedCombat(pending.fighterSeatId, pending.stat, encounter, null);
  }

  private clearEnemyRollTimeout(): void {
    if (!this.enemyRollTimeout) {
      return;
    }

    clearTimeout(this.enemyRollTimeout);
    this.enemyRollTimeout = null;
  }

  private clearResolutionAutoContinueTimeout(): void {
    if (!this.resolutionAutoContinueTimeout) {
      return;
    }

    clearTimeout(this.resolutionAutoContinueTimeout);
    this.resolutionAutoContinueTimeout = null;
  }

  private shouldAutoContinueResolution(): boolean {
    const resolutionOwner = this.state.activeResolution
      ? this.state.seats.find((seat) => seat.seatId === this.state.activeResolution?.playerId)
      : null;

    return Boolean(
      this.state.activeResolution &&
        resolutionOwner?.connected === false &&
        !this.state.pendingEncounterDecision &&
        !this.state.pendingGearEquipChoice &&
        !this.state.pendingScarChoice &&
        !this.state.pendingScarRemovalChoice &&
        !this.state.pendingMemoryTaxChoice &&
        !this.state.pendingEquipmentSuppressionChoice &&
        !this.state.pendingForcedDestinationChoice &&
        !this.state.pendingDisplacement &&
        this.state.activeResolution.stage === "roll_result"
    );
  }

  private scheduleResolutionAutoContinue(): void {
    if (this.resolutionAutoContinueTimeout || !this.shouldAutoContinueResolution()) {
      return;
    }

    if (this.executionServices.mode === "simulation") {
      this.executionServices.onTimerAttempt?.("resolution-auto-continue");
      return;
    }

    this.resolutionAutoContinueTimeout = setTimeout(() => {
      this.resolutionAutoContinueTimeout = null;

      const activeResolution = this.state.activeResolution;

      if (!activeResolution || !this.shouldAutoContinueResolution()) {
        return;
      }

      const previousStage = activeResolution.stage;
      const continuingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? activeResolution.playerId;

      if (this.state.pendingEdgeReaction?.ownerSeatId === activeResolution.playerId) {
        this.resolveEdgeCardReactionDecline({
          type: "DECLINE_EDGE_CARD_REACTION",
          seatId: activeResolution.playerId,
          reactionId: this.state.pendingEdgeReaction.id
        });
        this.broadcastPatch();
        return;
      }

      this.applyAction({
        type: "CONTINUE_RESOLUTION",
        seatId: continuingSeatId,
        createdAt: new Date().toISOString()
      });

      if (
        previousStage === "roll_result" ||
        previousStage === "outcome_summary" ||
        (previousStage === "awaiting_continue" && this.state.phase === "resolution" && !this.state.activeResolution)
      ) {
        this.runAutomaticPhases(continuingSeatId, {
          applyVisibleOutcomeEffect: previousStage === "roll_result"
        });
      }

      if (this.state.status === "active" && this.state.phase === "broadcast" && !this.state.activeResolution) {
        this.broadcastPatch();
        return;
      }

      this.broadcastPatch();
    }, RESOLUTION_AUTO_CONTINUE_MS);
    this.resolutionAutoContinueTimeout.unref?.();
  }

  private scheduleEnemyRollTimeout(): void {
    this.clearEnemyRollTimeout();

    const pending = this.state.pendingEnemyRoll;

    if (!pending) {
      return;
    }

    if (this.executionServices.mode === "simulation") {
      this.executionServices.onTimerAttempt?.("enemy-roll");
      return;
    }

    const expectedEncounterId = pending.encounterCardId;
    const expectedAssignedRollerSeatId = pending.assignedRollerSeatId;

    this.enemyRollTimeout = setTimeout(() => {
      const current = this.state.pendingEnemyRoll;

      if (
        !current ||
        current.encounterCardId !== expectedEncounterId ||
        current.assignedRollerSeatId !== expectedAssignedRollerSeatId
      ) {
        return;
      }

      const encounter = this.state.currentEncounter;

      if (!encounter || encounter.cardType !== "enemy" || encounter.id !== current.encounterCardId) {
        this.state = {
          ...this.state,
          sequence: this.state.sequence + 1,
          pendingEnemyRoll: null
        };
        this.broadcastPatch();
        return;
      }

      this.resolveOpposedCombat(current.fighterSeatId, current.stat, encounter, null);
      this.broadcastPatch();
    }, ENEMY_ROLL_TIMEOUT_MS);
    this.enemyRollTimeout.unref?.();
  }

  private resolveOpposedCombat(
    fighterSeatId: string,
    stat: CombatRequestedAction["stat"],
    encounter: Extract<ThreatCard, { cardType: "enemy" }>,
    enemyRollerSeatId: string | null
  ): void {
    this.clearEnemyRollTimeout();

    const player = this.state.players.find((entry) => entry.seatId === fighterSeatId);

    if (!player) {
      throw new Error(`Missing player for seat ${fighterSeatId}`);
    }

    const playerRoll = this.rollPlayerDiceWithEdgeCommit(fighterSeatId);
    const enemyRoll = rollDice(2, 6, this.randomSource);
    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const keyedModifiers = this.resolveThreatEffectKeys(fighterSeatId, encounter, encounter.combatEffectKeys, "beforeCombat");
    const boardTier = getBoardSpace(player.character.currentSpaceId)?.tier ?? "unknown";
    const soloCombatEase = getSoloCombatDifficultyEase(this.state.sessionMode, boardTier);
    const persistentHazardEnemyModifier = getPersistentEnemyDifficultyModifier(
      this.state,
      player.character.currentSpaceId
    );
    const edgeAbility =
      this.state.pendingEdgeAbility?.seatId === fighterSeatId &&
      this.state.pendingEdgeAbility.resolutionId === this.state.activeResolution?.id
        ? this.state.pendingEdgeAbility
        : null;
    const modifierSources = this.buildStatModifierSources(player, stat, "battle", {
      scenarioModifier: this.getScenarioBattleModifier(fighterSeatId),
      keyedPlayerModifier: keyedModifiers.playerBonusModifier ?? 0,
      masterAlphaModifier: getMasterAlphaBattleBonus(player)
    });
    if (player.character.followers?.some((follower) => follower.abilityId === "battle_support")) {
      modifierSources.push({ label: "Votive Gunner", value: 1 });
    }
    if (edgeAbility?.abilityKey === "isolated-total") {
      modifierSources.push({ label: "Isolated Channel", value: 2 });
    }
    if (edgeAbility?.abilityKey === "known-family") {
      modifierSources.push({ label: "Known Scar Pattern", value: 1 });
    }
    const assistance = this.assertAssistanceReadyForRoll(fighterSeatId, encounter.id, stat, false);
    modifierSources.push(...assistance.map(({ seatId, value }) => ({
      label: `${this.state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId} assisted`,
      value
    })));
    const statBonus = this.sumModifierSources(modifierSources);
    const easedEncounterDifficulty = Math.max(
      0,
      encounter.difficulty +
        escalationModifier +
        (keyedModifiers.difficultyModifier ?? 0) +
        persistentHazardEnemyModifier -
        soloCombatEase -
        (edgeAbility?.abilityKey === "reduce-enemy-difficulty" ? 3 : 0)
    );
    const enemyBonus = easedEncounterDifficulty;
    const scenarioEnemyBonus = this.getScenarioEnemyBattleModifier();
    const keyedEnemyBonus = keyedModifiers.enemyBonusModifier ?? 0;
    const namedEnemyModifier = getNamedPlayerEnemyModifier(this.getNamedPlayerIdentity(fighterSeatId));
    const oppositionModifierSources = namedEnemyModifier > 0
      ? [{ label: CW_ENEMY_MODIFIER_LABEL, value: namedEnemyModifier }]
      : [];
    if (persistentHazardEnemyModifier > 0) {
      oppositionModifierSources.push({ label: "Emberlung Vent", value: persistentHazardEnemyModifier });
    }
    if (edgeAbility?.abilityKey === "reduce-enemy-difficulty") {
      oppositionModifierSources.push({ label: "Black Relay Decoy", value: -3 });
    }
    const total = playerRoll.total + statBonus;
    const enemyTotal = enemyRoll.total + enemyBonus + scenarioEnemyBonus + keyedEnemyBonus + namedEnemyModifier;
    const success = total >= enemyTotal;
    const authoredOutcomeEffect = success ? encounter.defeatReward : encounter.woundOnLoss;
    const baseOutcomeEffect = this.combineEffects(
      [keyedModifiers.effect, success ? encounter.defeatReward : encounter.woundOnLoss].filter(
        (effect): effect is EncounterEffect => Boolean(effect)
      )
    ) ?? authoredOutcomeEffect ?? { type: "sequence", effects: [] };
    const resolvedOutcomeEffect = this.resolveThreatOutcomeEffect(
      fighterSeatId,
      encounter,
      baseOutcomeEffect,
      success ? encounter.defeatEffectKey : encounter.failEffectKey,
      success ? "onDefeat" : "onFailure"
    );
    const afflictionOutcomeEffect = this.applyAfflictionCombatWoundPrevention(
      fighterSeatId,
      stat,
      success,
      resolvedOutcomeEffect
    );
    const outcomeEffect = this.maybeApplyKerWoundPrevention(
      fighterSeatId,
      this.maybeApplyFandiablosWoundPrevention(fighterSeatId, afflictionOutcomeEffect)
    );

    const action = {
      type: "COMBAT_RESOLVED",
      seatId: fighterSeatId,
      stat,
      difficulty: easedEncounterDifficulty,
      roll: playerRoll,
      enemyRoll,
      statBonus,
      modifierSources,
      oppositionModifierSources,
      enemyBonus: enemyBonus + scenarioEnemyBonus + keyedEnemyBonus + namedEnemyModifier,
      total,
      enemyTotal,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      enemyRollerSeatId,
      edgeForfeitTrophy: edgeAbility?.abilityKey === "reduce-enemy-difficulty",
      createdAt: new Date().toISOString()
    } satisfies CombatResolvedAction;
    if (this.maybeOpenEdgeReaction(fighterSeatId, action)) return;
    if (this.maybeOpenAfflictionRollReaction(fighterSeatId, action)) return;
    this.finishResolvedCombat(action);
  }

  private resolveEffect(effect: AuthoredEncounterEffect, seatId?: string, sourceCardId?: string): AuthoredEncounterEffect;
  private resolveEffect(effect: EncounterEffect, seatId?: string, sourceCardId?: string): EncounterEffect;
  private resolveEffect(effect: EncounterEffect, seatId?: string, sourceCardId?: string): EncounterEffect {
    if (effect.type === "gain_gear") {
      return {
        ...effect,
        gear: this.gear.get(effect.gearId) ? (() => {
          const definition = this.gear.get(effect.gearId)!;
          return {
            ...definition,
            sourceArtifactCardId: effect.sourceArtifactCardId ?? definition.sourceArtifactCardId,
            instanceId: `${effect.gearId}:${seatId ?? "table"}:${this.state.sequence}`,
            exhausted: false,
            currentCharges: definition.startingCharges ?? definition.charges,
            maxCharges: definition.maxCharges ?? definition.charges
          };
        })() : undefined
      };
    }

    if (effect.type === "draw_artifact") {
      const player = seatId ? this.state.players.find((entry) => entry.seatId === seatId) : null;
      const sourceSectorId = player?.sectorId;
      const sector = sourceSectorId ? this.state.sectors.find((entry) => entry.id === sourceSectorId) : null;
      const eligibleArtifactIds = (sector?.encounterDecks.artifact ?? []).filter((candidateId) => {
        const candidate = this.artifacts.get(candidateId);
        if (!candidate) return false;
        const followerIds = this.collectFollowerIds(candidate.resolveEffect);
        return followerIds.every((followerId) => this.isFollowerAvailableForSeat(followerId, seatId));
      });
      const artifactId = eligibleArtifactIds.length > 0
        ? eligibleArtifactIds[this.randomSource.nextInt(eligibleArtifactIds.length)]
        : undefined;
      const artifact = artifactId ? this.artifacts.get(artifactId) : null;

      if (!sourceSectorId || !artifactId || !artifact) {
        return { type: "gain_note", text: "No local artifact was available to reclaim." };
      }

      return this.resolveEffect(
        this.combineEffects([
          artifact.resolveEffect,
          { type: "consume_artifact", artifactId, sourceSectorId }
        ]) ?? { type: "consume_artifact", artifactId, sourceSectorId },
        seatId,
        sourceCardId
      );
    }

    if (effect.type === "return_threat_to_space") {
      const player = seatId ? this.state.players.find((entry) => entry.seatId === seatId) : null;

      return {
        ...effect,
        threatId: effect.threatId ?? sourceCardId,
        sourceSectorId: effect.sourceSectorId ?? player?.sectorId
      };
    }

    if (effect.type === "gain_follower") {
      const definition = this.followers.get(effect.followerId);

      if (!definition) {
        return { type: "gain_note", text: "No eligible follower was available." };
      }

      if (!this.isFollowerAvailableForSeat(effect.followerId, seatId)) {
        return { type: "gain_note", text: `${definition.name} is already committed and no additional follower is gained.` };
      }

      return {
        ...effect,
        follower: { ...definition, instanceId: `${effect.followerId}:${seatId ?? "table"}:${this.state.sequence}`, exhausted: false }
      };
    }

    if (effect.type === "sequence") {
      return {
        ...effect,
        effects: effect.effects.map((entry: EncounterEffect) => this.resolveEffect(entry, seatId, sourceCardId)) as typeof effect.effects
      };
    }

    return effect;
  }

  private collectFollowerIds(effect: AuthoredEncounterEffect): string[] {
    if (effect.type === "gain_follower") return [effect.followerId];
    if (effect.type === "sequence") return effect.effects.flatMap((entry) => this.collectFollowerIds(entry));
    return [];
  }

  private isFollowerAvailableForSeat(followerId: string, seatId?: string): boolean {
    const definition = this.followers.get(followerId);
    if (!definition || !seatId) return Boolean(definition);
    const owner = this.state.players.find((entry) => entry.seatId === seatId);
    if (owner?.character.followers?.some((follower) => follower.id === followerId)) return false;
    if (!definition.unique) return true;
    return !this.state.players.some((player) => player.character.followers?.some((follower) => follower.id === followerId));
  }

  private combineEffects(effects: EncounterEffect[]): EncounterEffect | null {
    if (effects.length === 0) {
      return null;
    }

    if (effects.length === 1) {
      return effects[0] ?? null;
    }

    return {
      type: "sequence",
      effects
    };
  }

  private getHazardOutcomeEffect(
    encounter: Extract<ThreatCard, { cardType: "hazard" }>,
    success: boolean
  ): EncounterEffect | undefined {
    if (!success) {
      return encounter.failEffect;
    }

    return this.combineEffects(
      [encounter.clearReward, encounter.successEffect].filter(
        (effect): effect is EncounterEffect => Boolean(effect)
      )
    ) ?? undefined;
  }

  private resolveSectorCardResolution(seatId: string, deckKind: BoardTextDeckKind | null): SectorCardResolution | null {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return null;
    }

    const sector = this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

    if (!sector) {
      return null;
    }

    switch (deckKind) {
      case "anomaly": {
        const anomalyId = this.drawSectorCardId(sector.encounterDecks.anomaly);
        const anomaly = anomalyId ? this.anomalies.get(anomalyId) : null;

        return anomaly
          ? {
              summary: anomaly.resolutionSummary,
              effect: anomaly.resolveEffect,
              revealedCard: {
                id: anomaly.id,
                title: anomaly.title,
                type: "anomaly",
                flavor: anomaly.flavor,
                artType: "anomaly",
                sourceDeck: "anomaly",
                sourceSectorId: sector.id,
                privacy: "public"
              },
              consumedDeckCards: { anomaly: [anomaly.id] }
            }
          : null;
      }
      case "artifact": {
        const artifactId = this.drawSectorCardId(sector.encounterDecks.artifact);
        const artifact = artifactId ? this.artifacts.get(artifactId) : null;

        return artifact
          ? {
              summary: artifact.resolutionSummary,
              effect: artifact.resolveEffect,
              revealedCard: {
                id: artifact.id,
                title: artifact.title,
                type: "artifact",
                flavor: artifact.flavor,
                artType: "artifact",
                sourceDeck: "artifact",
                sourceSectorId: sector.id,
                privacy: "public"
              },
              consumedDeckCards: { artifact: [artifact.id] }
            }
          : null;
      }
      case "contract": {
        const contractId = this.drawSectorCardId(sector.encounterDecks.contract);
        const contract = contractId ? this.resolveContract(this.contracts.get(contractId)) ?? null : null;

        return contract
          ? {
              summary: `Intercepted ${contract.name} from Mirecoil Beacon traffic. ${describeContractObjective(contract)}.`,
              effect: {
                type: "gain_note",
                text: `Mirecoil traffic exposed contract ${contract.name}.`
              },
              revealedCard: {
                id: contract.id,
                title: contract.name,
                type: "contract",
                flavor: contract.text,
                artType: "contract",
                sourceDeck: "contract",
                sourceSectorId: sector.id,
                privacy: "owner"
              },
              discoveredContracts: [contract],
              consumedDeckCards: { contract: [contract.id] }
            }
          : null;
      }
      case "escalation": {
        const escalationId = this.drawSectorCardId(sector.encounterDecks.escalation);
        const escalation = escalationId ? this.escalations.get(escalationId) : null;

        return escalation
          ? {
              summary: escalation.resolutionSummary,
              effect: escalation.resolveEffect ?? null,
              revealedCard: {
                id: escalation.id,
                title: escalation.title,
                type: "escalation",
                flavor: escalation.flavor,
                artType: "escalation",
                sourceDeck: "escalation",
                sourceSectorId: sector.id,
                privacy: "public"
              },
              escalationDelta: escalation.escalationDelta,
              consumedDeckCards: { escalation: [escalation.id] }
            }
          : null;
      }
      default:
        return null;
    }
  }

  private drawSectorCardId(deck: string[]): string | null {
    if (deck.length === 0) {
      return null;
    }

    return deck[this.randomSource.nextInt(deck.length)] ?? null;
  }

  private resolveContract(contract: ContractCard | undefined): ContractCard | undefined {
    return contract
      ? {
          ...contract,
          reward: {
            ...contract.reward,
            effects: contract.reward.effects.map((effect) => this.resolveEffect(effect))
          }
        }
      : undefined;
  }

  private broadcastPatch(): void {
    if (this.executionServices.mode === "simulation") {
      this.executionServices.onBroadcastAttempt?.();
      return;
    }
    this.reconcileHostView();
    for (const client of this.clients) {
      const envelope = this.createPatchEnvelope(client);
      client.socket.send(JSON.stringify(envelope));
    }

    this.scheduleResolutionAutoContinue();
  }

  private adoptPhoneClient(client: ConnectedClient): void {
    if (!client.seatId) {
      throw new Error("Phone client cannot be adopted without a seat");
    }

    const staleClient = [...this.clients].find(
      (entry) => entry.view === "phone" && entry.seatId === client.seatId && entry.socket !== client.socket
    );

    if (staleClient) {
      staleClient.superseded = true;
      this.clients.delete(staleClient);
      staleClient.socket.close(4003, "Replaced by newer connection");
    }

    this.clients.add(client);
    this.completeSatisfiedContract(client.seatId);
    this.setSeatConnected(client.seatId, true);
    // The broadcast is the authoritative bootstrap for the adopted phone and
    // the connectivity update for every other client. Sending a direct
    // snapshot first produced two equivalent STATE_PATCH envelopes at the same
    // revision, which made reconnect observation order scheduling-sensitive.
    this.broadcastPatch();
  }

  private broadcastSnapshotToClient(client: ConnectedClient, forcePrivate = false): void {
    client.socket.send(JSON.stringify(this.createPatchEnvelope(client, forcePrivate)));
  }

  private handleSeatDisconnect(seatId: string): void {
    if (this.hasLivePhoneClient(seatId)) {
      return;
    }

    this.setSeatConnected(seatId, false);
    this.recoverPendingEnemyRollForLeavingSeat(seatId);
    this.broadcastPatch();
  }

  private hasLivePhoneClient(seatId: string): boolean {
    return [...this.clients].some((entry) => entry.view === "phone" && entry.seatId === seatId);
  }

  private resolveSeatFromToken(token: string) {
    const payload = validateJoinToken(token, this.state.sessionId);

    if (!payload) {
      return null;
    }

    return this.state.seats.find((seat) => seat.seatId === payload.seatId && seat.joinToken === token && !seat.kicked) ?? null;
  }

  private setSeatConnected(seatId: string, connected: boolean): void {
    const nextSeats = this.state.seats.map((seat) =>
      seat.seatId === seatId
        ? {
            ...seat,
            connected
          }
        : seat
    );

    const changed = nextSeats.some((seat, index) => {
      const previous = this.state.seats[index];
      return seat.connected !== previous?.connected;
    });

    if (!changed) {
      return;
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: nextSeats
    };
  }

  private sendIntentRejected(client: ConnectedClient, actionType: string, reason: string): void {
    const envelope: IntentRejectedEnvelope = {
      type: "INTENT_REJECTED",
      sessionId: this.state.sessionId,
      sequence: this.state.sequence,
      actionType,
      reason
    };

    client.socket.send(JSON.stringify(envelope));
  }

  private sendRejoinRejected(client: ConnectedClient, reason: string): void {
    const envelope: RejoinRejectedEnvelope = {
      type: "REJOIN_REJECTED",
      sessionId: this.state.sessionId,
      reason
    };

    client.socket.send(JSON.stringify(envelope));
  }

  private createPatchEnvelope(client: ConnectedClient, forcePrivate = false): StatePatchEnvelope {
    const payload =
      client.view === "tv"
        ? createTvProjection(this.state, this.movementPreviewBySeatId)
        : createPhoneProjection(this.state, client.seatId ?? "", forcePrivate, this.characters);
    return {
      type: "STATE_PATCH",
      sessionId: this.state.sessionId,
      sequence: this.state.sequence,
      phase: this.state.phase,
      payload: {
        ...payload,
        hostView: this.createHostViewProjection(),
        ...(client.view === "tv"
          ? { setupScenarioPreview: this.createSetupScenarioPreviewProjection() }
          : {})
      }
    };
  }

  private createSetupScenarioPreviewProjection(): {
    scenarioId: string;
    mode: "single-player" | "co-op" | "rivalry" | "nemesis";
    playerCount: number;
    revision: number;
    requester: { seatId: string; displayName: string };
  } | null {
    if (this.state.status !== "lobby" || !this.setupScenarioPreview) return null;
    const requester = this.state.seats.find(
      (seat) => seat.seatId === this.setupScenarioPreview?.requesterSeatId
    );
    if (!requester?.displayName || requester.kicked) return null;
    return {
      scenarioId: this.setupScenarioPreview.scenarioId,
      mode: this.setupScenarioPreview.mode,
      playerCount: this.setupScenarioPreview.playerCount,
      revision: this.setupScenarioPreview.revision,
      requester: {
        seatId: requester.seatId,
        displayName: requester.displayName
      }
    };
  }

  private getHostMapAvailability(): { allowed: boolean; reason: string | null; automaticReturnReason: "encounter" | "resolution" | "service" | "handoff" | "endgame" | "action-critical" | null } {
    if (this.state.status !== "active") {
      return {
        allowed: false,
        reason: this.state.status === "ended"
          ? "The result presentation controls the shared display."
          : "The map becomes available after the game starts.",
        automaticReturnReason: this.state.status === "ended" ? "endgame" : "action-critical"
      };
    }
    if (this.state.phase === "broadcast") {
      return {
        allowed: false,
        reason: "Turn handoff controls the shared display.",
        automaticReturnReason: "handoff"
      };
    }
    if (this.state.activeResolution) {
      return {
        allowed: false,
        reason: "The current result controls the shared display.",
        automaticReturnReason: "resolution"
      };
    }
    if (
      this.state.currentEncounter ||
      this.state.pendingEnemyRoll ||
      this.state.pendingTileChallenge ||
      this.state.pendingEncounterDecision ||
      this.state.cooperativeAssistance ||
      this.state.pendingCooperativeTest
    ) {
      return {
        allowed: false,
        reason: "The current encounter controls the shared display.",
        automaticReturnReason: "encounter"
      };
    }
    if (this.state.phase === "action") {
      return {
        allowed: false,
        reason: "The current sector action controls the shared display.",
        automaticReturnReason: "service"
      };
    }
    if (this.state.phase !== "navigation") {
      return {
        allowed: false,
        reason: "The map is available during movement and route planning.",
        automaticReturnReason: "action-critical"
      };
    }
    return { allowed: true, reason: null, automaticReturnReason: null };
  }

  private reconcileHostView(): void {
    if (this.hostView.mode !== "map") return;
    const availability = this.getHostMapAvailability();
    if (availability.allowed) return;
    this.hostView = {
      mode: "signal",
      revision: this.hostView.revision + 1,
      requesterSeatId: this.hostView.requesterSeatId,
      automaticReturnReason: availability.automaticReturnReason
    };
  }

  private createHostViewProjection(): {
    mode: "signal" | "map";
    revision: number;
    requester: { seatId: string; displayName: string } | null;
    automaticReturnReason: "encounter" | "resolution" | "service" | "handoff" | "endgame" | "action-critical" | null;
    canRequestMap: boolean;
    unavailableReason: string | null;
  } {
    const availability = this.getHostMapAvailability();
    const requester = this.hostView.requesterSeatId
      ? this.state.seats.find((seat) => seat.seatId === this.hostView.requesterSeatId) ?? null
      : null;
    return {
      mode: this.hostView.mode,
      revision: this.hostView.revision,
      requester: requester
        ? {
            seatId: requester.seatId,
            displayName: requester.displayName ?? "Player"
          }
        : null,
      automaticReturnReason: this.hostView.automaticReturnReason,
      canRequestMap: availability.allowed,
      unavailableReason: availability.reason
    };
  }
}

type PublicShopService = {
  id: string;
  label: string;
  shopCategory?: ShopCategory;
  cost: {
    salvage?: number;
    wounds?: number;
    trophies?: number;
    completedContracts?: number;
    scars?: number;
  };
  risk?: string;
  enabled: boolean;
  disabledReason?: string;
};

type PublicShopStockItem = {
  cardId: string;
  name: string;
  type: "gear" | "artifact" | "follower";
  artCardId?: string;
  shopCategories?: ShopCategory[];
  cost: {
    salvage?: number;
    wounds?: number;
    trophies?: number;
  };
  summary: string;
  lore?: string;
  rarity?: string;
  stock: number;
  affordable: boolean;
  disabledReason?: string;
};

type PublicShopSellItem = {
  gearId: string;
  instanceId?: string;
  name: string;
  type: "gear" | "artifact";
  category?: GearItem["category"];
  sellValue: number;
  summary: string;
  sellable: boolean;
  disabledReason?: ShopFailureReason | string;
};

type PublicMoveDestination = {
  markerLabel?: string;
  routeId: string;
  defaultRouteId: string;
  routeVariants: Array<{ routeId: string; destinationId: string; sectorIds: string[]; sectorNames: string[]; distance: number }>;
  sectorId: string;
  name: string;
  ring: "outer" | "middle" | "inner" | "core";
  distance: number;
  route: string[];
  routeNames: string[];
  tags: string[];
  threatIcons: Array<"red" | "blue" | "yellow" | "green" | "gold" | "white">;
  ruleText: string;
  loreText?: string;
  shop?: {
    shopId: string;
    shopName: string;
    status: "open" | "locked" | "exhausted" | "dangerous";
    servicesPreview: string[];
  };
  faceUpThreats: Array<{
    instanceId: string;
    cardId: string;
    name: string;
    type: string;
    deck?: "red" | "blue" | "yellow" | "scenario";
    challenge?: {
      stat: Stat;
      value: number;
    };
    blocksShop: boolean;
    blocksSectorText: boolean;
  }>;
  occupants: Array<{
    playerId: string;
    name: string;
    characterName: string;
  }>;
  nemesisPresent?: boolean;
  scenarioMarkers?: string[];
  strategicTags: Array<"safe" | "shop" | "locked" | "danger" | "reward" | "nemesis" | "gate">;
  ringTransition?: {
    direction: "inward" | "outward";
    fromRing: "outer" | "middle" | "inner" | "core";
    toRing: "outer" | "middle" | "inner" | "core";
    label: string;
    activationTiming: "beforeRoll";
    endsMovement: true;
  };
  disabledReason?: string;
  voidKeyPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
  routeStarPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
};

type PublicMovementPlannerState = {
  active: boolean;
  movementValue: number;
  rolledValue?: number;
  rollFaces?: number[];
  rollResolutionId?: string;
  modifierSources?: Array<{ label: string; value: number }>;
  originalMovementValue?: number;
  movementAdjustment?: -1 | 1 | null;
  compassPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; canDecrease: boolean; canIncrease: boolean } | null;
  currentSectorId: string;
  currentSectorName: string;
  movementRevision: number;
  destinations: PublicMoveDestination[];
  selectedDestinationId?: string | null;
  selectedRouteId?: string | null;
  routeStarCommitted?: boolean;
};

type PublicSectorExplorationSummary = {
  sectorId: string;
  sectorName: string;
  printedThreatIcons: Array<"red" | "blue" | "yellow">;
  unresolvedThreats: Array<{
    instanceId: string;
    cardId: string;
    name: string;
    type: string;
    lane?: "red" | "blue" | "yellow" | "scenario";
    blocksShop: boolean;
    blocksSectorText: boolean;
  }>;
  drawCountsDue: Record<"red" | "blue" | "yellow", number>;
  sectorTextLocked: boolean;
  shopLocked: boolean;
  lockedReason: string | null;
  sectorTextTitle: string | null;
  shopName: string | null;
  explanationLines: string[];
};

type ResultDelta = {
  id: string;
  type:
    | "wound"
    | "salvage"
    | "trophy"
    | "gearGained"
    | "gearLost"
    | "itemBought"
    | "itemSold"
    | "contractProgress"
    | "contractCompleted"
    | "scenarioProgress"
    | "scenarioPressure"
    | "agendaProgress"
    | "agendaCompleted"
    | "threatDefeated"
    | "threatRemains"
    | "sectorUnlocked"
    | "shopUnlocked"
    | "afflictionDrawn"
    | "afflictionFlipped"
    | "scarGained"
    | "recallTriggered"
    | "fateSpent"
    | "statUpgrade"
    | "modifierApplied";
  label: string;
  value?: number | string;
  sign: "gain" | "loss" | "neutral";
  targetScope: "personal" | "table" | "sector" | "scenario" | "privateAgenda";
  targetSeatId?: string | null;
  visibility: "public" | "ownerPrivate" | "hidden";
  reason?: string;
  source?: string;
  publicText: string;
  privateText?: string;
  severity: "reward" | "loss" | "danger" | "scenario" | "private" | "neutral";
};

type PhoneObjectUseState = {
  source: "gear" | "follower";
  id: string;
  instanceId?: string;
  usedThisTurn: boolean;
  usedThisRound: boolean;
  remainingUses?: number | null;
  maxUses?: number | null;
  disabledReason?: string | null;
  testedSkill?: Stat | null;
  timingWindow?: string | null;
  usableForCurrentTest?: boolean | null;
  activeModifier?: (RollModifierSource & { stat: Stat; mode: "battle" | "check" }) | null;
};

function getPublicSalvage(player: PlayerState): number {
  return Math.max(0, player.character.salvage ?? 0);
}

function hasUsedObjectSinceLogBoundary(
  state: GameState,
  seatId: string,
  objectId: string,
  idField: "gearId" | "followerId",
  boundaryType: "TURN_COMPLETED" | "ROUND_COMPLETED"
): boolean {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index] as Record<string, unknown> | undefined;

    if (entry?.type === boundaryType) {
      return false;
    }

    if (entry?.seatId === seatId && entry[idField] === objectId && (entry.type === "USE_GEAR" || entry.type === "USE_FOLLOWER")) {
      return true;
    }
  }

  return false;
}

function getPendingObjectRollModifier(
  state: GameState,
  seatId: string,
  source: "gear" | "follower",
  objectId: string
): PhoneObjectUseState["activeModifier"] {
  const idField = source === "gear" ? "gearId" : "followerId";
  const actionType = source === "gear" ? "USE_GEAR" : "USE_FOLLOWER";

  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index] as
      | {
          type?: string;
          seatId?: string;
          gearId?: string;
          followerId?: string;
          rollModifier?: RollModifierSource & { stat: Stat; mode: "battle" | "check" };
        }
      | undefined;

    if (entry?.type === "TURN_COMPLETED") {
      break;
    }

    if (entry?.seatId === seatId && (entry.type === "COMBAT_RESOLVED" || entry.type === "CHECK_ROLLED")) {
      break;
    }

    if (entry?.type === actionType && entry.seatId === seatId && entry[idField] === objectId && entry.rollModifier) {
      return entry.rollModifier;
    }
  }

  return null;
}

function getUseLimitProjection(args: {
  useLimit?: "oncePerTurn" | "oncePerRound" | "discard" | "charge";
  usedThisTurn: boolean;
  usedThisRound: boolean;
  charges?: number | null;
  maxUses?: number | null;
  objectName: string;
}): Pick<PhoneObjectUseState, "remainingUses" | "maxUses" | "disabledReason"> {
  if (args.useLimit === "charge") {
    const remainingUses = Math.max(0, args.charges ?? 0);
    return {
      remainingUses,
      maxUses: args.maxUses ?? args.charges ?? null,
      disabledReason: remainingUses <= 0 ? `${args.objectName} has no charges remaining.` : null
    };
  }

  if (args.useLimit === "oncePerTurn") {
    return {
      remainingUses: args.usedThisTurn ? 0 : 1,
      maxUses: 1,
      disabledReason: args.usedThisTurn ? `${args.objectName} has already been used this turn.` : null
    };
  }

  if (args.useLimit === "oncePerRound") {
    return {
      remainingUses: args.usedThisRound ? 0 : 1,
      maxUses: 1,
      disabledReason: args.usedThisRound ? `${args.objectName} has already been used this round.` : null
    };
  }

  if (args.useLimit === "discard") {
    return {
      remainingUses: 1,
      maxUses: 1,
      disabledReason: null
    };
  }

  return {
    remainingUses: null,
    maxUses: null,
    disabledReason: null
  };
}

function projectedEffectContainsWound(effect: EncounterEffect | null | undefined): boolean {
  return Boolean(effect && (effect.type === "take_wound" ? effect.amount > 0 : effect.type === "sequence" && effect.effects.some(projectedEffectContainsWound)));
}

function projectedEffectContainsType(effect: EncounterEffect | null | undefined, type: EncounterEffect["type"]): boolean {
  return Boolean(effect && (effect.type === type || (effect.type === "sequence" && effect.effects.some((entry) => projectedEffectContainsType(entry, type)))));
}

function getInventoryPresentationContext(state: GameState, seatId: string, movementRouteSelected = false): {
  timing: NonNullable<GearItem["activationTiming"]>[number] | null;
  testedSkill: Stat | null;
  label: string;
} {
  const activeResolution = state.activeResolution?.playerId === seatId ? state.activeResolution : null;
  const testedSkill = activeResolution?.battle?.stat
    ?? state.pendingTileChallenge?.testStat
    ?? state.currentEncounter?.stat
    ?? state.pendingCooperativeTest?.stat
    ?? null;

  if (state.pendingDisplacement?.seatId === seatId && state.pendingDisplacement.status === "pending") {
    return { timing: "pendingForcedDisplacement", testedSkill, label: "Forced displacement" };
  }
  if (state.pendingScarConsequence?.seatId === seatId && state.pendingScarConsequence.status === "pending") {
    return { timing: "pendingScarConsequence", testedSkill, label: "Scar consequence" };
  }
  if (state.pendingFailureReaction?.seatId === seatId && activeResolution?.roll?.success === false) {
    return { timing: "afterFailedTest", testedSkill, label: "Failed test reaction" };
  }
  if (state.phase === "resolution" && state.pendingEffect && projectedEffectContainsWound(state.pendingEffect)) {
    return { timing: "beforeTakingDamage", testedSkill, label: "Incoming Wound" };
  }
  if (state.pendingTileChallenge?.seatId === seatId && state.pendingTileChallenge.challengeType === "anomaly" && !state.pendingTileChallenge.rolled) {
    return { timing: "beforeAnomalySignalTest", testedSkill: state.pendingTileChallenge.testStat, label: "Anomaly test" };
  }
  if (state.phase === "action" && state.currentEncounter?.cardType === "enemy" && !activeResolution?.roll && !state.pendingEnemyRoll) {
    return { timing: "beforeBattleRoll", testedSkill: state.currentEncounter.stat, label: "Battle roll" };
  }
  if (state.phase === "navigation") {
    return {
      timing: movementRouteSelected ? "movementRouteConfirmation" : "movement",
      testedSkill,
      label: movementRouteSelected ? "Route confirmation" : "Movement"
    };
  }
  if (state.phase === "sector") return { timing: "beforeThreatDraw", testedSkill, label: "Sector arrival" };
  if (state.phase === "start") return { timing: "startOfTurn", testedSkill, label: "Turn start" };
  if (state.phase === "action") return { timing: "action", testedSkill, label: "Action phase" };
  return { timing: null, testedSkill, label: "No immediate inventory action" };
}

function buildPhoneObjectUseStates(state: GameState, player: PlayerState | undefined, movementRouteSelected = false): PhoneObjectUseState[] {
  if (!player) {
    return [];
  }

  const presentationContext = getInventoryPresentationContext(state, player.seatId, movementRouteSelected);
  const equippedInstanceIds = new Set(Object.values(player.character.equippedGearInstances ?? {}).filter((id): id is string => Boolean(id)));
  const equippedCatalogIds = new Set(Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id)));
  const gearStates = player.character.heldGear.map((item) => {
    const usedThisTurn = hasUsedObjectSinceLogBoundary(state, player.seatId, item.id, "gearId", "TURN_COMPLETED");
    const usedThisRound = hasUsedObjectSinceLogBoundary(state, player.seatId, item.id, "gearId", "ROUND_COMPLETED");
    const projectedLimit = getUseLimitProjection({
      useLimit: item.useLimit,
      usedThisTurn,
      usedThisRound,
      charges: item.currentCharges ?? item.charges ?? null,
      maxUses: item.maxCharges ?? item.maxUses ?? item.charges ?? null,
      objectName: item.name
    });
    const consumableDisabledReason = item.effectModel === "consumable"
      ? item.consumableEffect === "ignoreFailedMovementOrHazard"
        ? state.phase === "resolution" && state.pendingEffect && state.pendingFailureReaction?.seatId === player.seatId
          ? null
          : "Use only after your failed movement or hazard test, before its effects resolve."
        : state.phase !== "action"
          ? "Wait for an action window."
          : item.consumableEffect === "healWound" && player.character.wounds <= 0
            ? "No wounds to heal."
            : item.consumableEffect === "grantVeilHook" && player.character.heldGear.some((held) => held.id === "veil-hook")
              ? "Veil Hook is already owned."
              : item.consumableEffect === "grantMarshalSeal" && player.character.heldGear.some((held) => held.id === "marshal-seal")
                ? "Marshal Seal is already owned."
                : item.consumableEffect === "grantPaleCartelFixer" && (player.character.followers ?? []).some((follower) => follower.id === "pale-cartel-fixer")
                  ? "Pale Cartel Fixer is already attached."
                  : null
      : null;
    const lifecycleId = state.activeResolution?.id ?? null;
    const suppression = item.instanceId
      ? (state.equipmentSuppressions ?? []).find((entry) =>
          entry.ownerSeatId === player.seatId &&
          entry.itemInstanceId === item.instanceId &&
          entry.qualifyingLifecycleId === lifecycleId
        )
      : null;
    const suppressionDisabledReason = suppression
      ? suppression.mode === "throughNextThreat"
        ? `${item.name} is suppressed through this Threat.`
        : `${item.name} is suppressed during this battle.`
      : null;
    const challengeEligibility = getChallengeItemEligibility(state, player.seatId, item);
    const declaredTimings = [...new Set([...(item.activationTiming ?? []), ...(item.timingWindows ?? [])])];
    const matchesTiming = Boolean(presentationContext.timing && (declaredTimings.includes(presentationContext.timing) || declaredTimings.includes("anyTime")));
    const exactEquipped = item.instanceId ? equippedInstanceIds.has(item.instanceId) : equippedCatalogIds.has(item.id);
    const passiveRelevant = Boolean(
      exactEquipped &&
      item.effectModel !== "consumable" &&
      presentationContext.testedSkill &&
      item.statBonus.stat === presentationContext.testedSkill
    );
    const relevanceReason = suppressionDisabledReason
      ?? (challengeEligibility.challengeLinked ? challengeEligibility.disabledReason : null)
      ?? consumableDisabledReason
      ?? projectedLimit.disabledReason;
    const relevantNow = Boolean(challengeEligibility.eligible || matchesTiming || passiveRelevant || getPendingObjectRollModifier(state, player.seatId, "gear", item.id));
    return {
      source: "gear" as const,
      id: item.id,
      instanceId: item.instanceId,
      usedThisTurn,
      usedThisRound,
      ...projectedLimit,
      disabledReason: relevanceReason,
      testedSkill: challengeEligibility.testedSkill,
      timingWindow: challengeEligibility.timingWindow,
      usableForCurrentTest: challengeEligibility.challengeLinked ? challengeEligibility.eligible : null,
      relevantNow,
      relevanceKind: relevantNow ? (relevanceReason ? "blocked" : passiveRelevant && !matchesTiming ? "passive" : "usable") : "inactive",
      relevanceReason: relevanceReason ?? (passiveRelevant ? `Applied to the current ${CHALLENGE_LABELS[presentationContext.testedSkill!]} test.` : null),
      currentContext: presentationContext.label,
      activeModifier: getPendingObjectRollModifier(state, player.seatId, "gear", item.id)
    };
  });

  const followerStates = (player.character.followers ?? []).map((follower) => {
    const usedThisTurn = hasUsedObjectSinceLogBoundary(state, player.seatId, follower.id, "followerId", "TURN_COMPLETED");
    const usedThisRound = hasUsedObjectSinceLogBoundary(state, player.seatId, follower.id, "followerId", "ROUND_COMPLETED");
    const projectedLimit = getUseLimitProjection({ useLimit: follower.useLimit, usedThisTurn, usedThisRound, objectName: follower.name });
    const timings = follower.activationTiming ?? follower.timingWindows ?? [];
    const timingEligible = (timings.includes("beforeBattleRoll") && state.phase === "action" && state.currentEncounter?.cardType === "enemy" && !state.activeResolution?.roll) ||
      (timings.includes("beforeThreatDraw") && state.phase === "sector") || (timings.includes("movement") && state.phase === "navigation") ||
      (timings.includes("beforeTakingDamage") && state.phase === "resolution" && projectedEffectContainsWound(state.pendingEffect));
    const exhaustDisabledReason = follower.effectModel === "exhaust"
      ? follower.exhausted ? `${follower.name} is Exhausted. Refreshes next round.` : timingEligible ? null : `${follower.name} is Ready, but not usable in this timing window.`
      : null;
    const pending = state.pendingFailureReaction?.seatId === player.seatId && state.phase === "resolution" && state.activeResolution?.roll?.success === false;
    const abilityDisabledReason = follower.abilityId === "ignore_route_failure"
      ? pending && state.pendingFailureReaction?.testType === "movement" ? null : "Use after a failed route check."
      : follower.abilityId === "ignore_middle_route_failure"
        ? pending && state.pendingFailureReaction?.testType === "movement" && getBoardSpace(player.character.currentSpaceId)?.tier === "middle" ? null : "Use after a failed movement check in the middle ring."
        : follower.abilityId === "prevent_equipment_loss"
          ? pending && projectedEffectContainsType(state.pendingEffect, "equipment_suppression") ? null : "Use when an Equipment loss or suppression is pending."
          : follower.abilityId === "prevent_salvage_loss"
            ? pending && projectedEffectContainsType(state.pendingEffect, "lose_salvage") ? null : "Use when a failed route or Contract would lose Salvage."
            : follower.abilityId === "battle_support"
              ? pending && projectedEffectContainsWound(state.pendingEffect) ? null : "The +1 battle bonus is always active. Discard only when a failed battle would add a Wound."
              : null;
    const declaredTimings = follower.activationTiming ?? follower.timingWindows ?? [];
    const matchesPresentationTiming = Boolean(
      presentationContext.timing &&
      ((declaredTimings as readonly string[]).includes(presentationContext.timing) || declaredTimings.includes("anyTime"))
    );
    const relevanceReason = exhaustDisabledReason ?? abilityDisabledReason ?? projectedLimit.disabledReason;
    return {
      source: "follower" as const,
      id: follower.id,
      instanceId: follower.instanceId,
      usedThisTurn,
      usedThisRound,
      ...projectedLimit,
      disabledReason: relevanceReason,
      boundReason: follower.id === NAMED_PLAYER_FANDIABLOS_ID && requiresBoundFandiablos({ displayName: state.seats.find((seat) => seat.seatId === player.seatId)?.displayName })
        ? "BOUND — Granted by player identity"
        : null,
      relevantNow: matchesPresentationTiming || Boolean(getPendingObjectRollModifier(state, player.seatId, "follower", follower.id)),
      relevanceKind: matchesPresentationTiming ? (relevanceReason ? "blocked" : "usable") : "inactive",
      relevanceReason,
      currentContext: presentationContext.label,
      activeModifier: getPendingObjectRollModifier(state, player.seatId, "follower", follower.id)
    };
  });

  return [...gearStates, ...followerStates];
}

function getCompletedContractCountForProjection(state: GameState, seatId: string): number {
  const character = state.players.find((entry) => entry.seatId === seatId)?.character;
  if (character?.completedContracts !== undefined) return character.completedContracts.length;
  return state.eventLog.filter((entry) => {
    if (typeof entry !== "object" || entry === null || !("type" in entry) || !("seatId" in entry)) {
      return false;
    }

    return (entry as { type?: string; seatId?: string }).type === "COMPLETE_CONTRACT" && (entry as { seatId?: string }).seatId === seatId;
  }).length;
}

function getPublicShopStatus(state: GameState, player: PlayerState): "open" | "locked" | "exhausted" | "dangerous" {
  if (
    state.currentEncounter ||
    !getServiceThreatGate(state, player.seatId, player.character.currentSpaceId).allowed
  ) {
    return "locked";
  }

  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (boardSpace?.tags.includes("risk-shop")) {
    return "dangerous";
  }

  return "open";
}

function getPublicShopBlockedReason(
  state: GameState,
  blockingThreatCount: number,
  player: PlayerState
): ShopFailureReason | undefined {
  return blockingThreatCount > 0 ||
    state.currentEncounter ||
    state.pendingEnemyRoll ||
    state.pendingEffect ||
    !getServiceThreatGate(state, player.seatId, player.character.currentSpaceId).allowed
    ? SHOP_FAILURE_REASONS.shopBlockedByThreat
    : undefined;
}

function getPublicRing(tier: BoardTier): "outer" | "middle" | "inner" | "core" {
  return tier === "center" ? "core" : tier === "inner" ? "inner" : tier === "middle" ? "middle" : "outer";
}

function buildPublicInnerApproach(state: GameState, seatId: string) {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const route = getInnerApproachRouteProgress(state, seatId);
  if (!player || !route) return null;
  const currentSpace = getBoardSpace(player.character.currentSpaceId);
  if (!currentSpace) return null;
  const cleared = new Set(route.clearedSectorIds);
  return {
    pathId: route.pathId,
    pathLabel: route.pathId === "breach-road" ? "Breach Road" : "Choir Road",
    currentSectorId: currentSpace.id,
    currentSectorName: currentSpace.name,
    currentIndex: route.currentIndex,
    challengeCleared: cleared.has(currentSpace.id),
    challengeTitle: currentSpace.textBox.title,
    challengeDetail: currentSpace.textBox.text,
    revision: state.movementRouteRevisions?.[seatId] ?? 0,
    steps: route.sectorIds.map((sectorId, index) => ({
      sectorId,
      name: state.sectors.find((sector) => sector.id === sectorId)?.name ?? getBoardSpace(sectorId)?.name ?? sectorId,
      status: sectorId === "center_cinder_gate"
        ? "boss" as const
        : cleared.has(sectorId)
          ? "cleared" as const
          : index === route.currentIndex
            ? "current" as const
            : "ahead" as const
    })),
    options: buildInnerApproachMoveOptions(state, seatId).map((option) => ({
      sectorId: option.sectorId,
      name: state.sectors.find((sector) => sector.id === option.sectorId)?.name ?? getBoardSpace(option.sectorId)?.name ?? option.sectorId,
      direction: option.direction,
      label: option.label,
      disabledReason: option.disabledReason
    }))
  };
}

function getMovementDestinationMarkerLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function getFaceUpThreatsForSector(state: GameState, sectorId: string): PublicMoveDestination["faceUpThreats"] {
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const activePlayer = activeSeatId ? state.players.find((player) => player.seatId === activeSeatId) : null;
  const encounter = state.currentEncounter;
  const encounterSectorId = state.lastOutcomeSummary?.movedToSectorId ?? activePlayer?.character.currentSpaceId;

  const persistent = (state.sectors.find((sector) => sector.id === sectorId)?.persistentThreatIds ?? [])
    .map((cardId) => PROJECTION_THREAT_CATALOG.get(cardId))
    .filter((card): card is ThreatCard => Boolean(card))
    .map((card) => ({
      instanceId: `${sectorId}:persistent:${card.id}`,
      cardId: card.id,
      name: card.cardType === "enemy" ? card.enemyName : card.title,
      type: getThreatPresentationCategory(card),
      deck: card.threatLane,
      challenge: {
        stat: card.stat,
        value: card.difficulty
      },
      blocksShop: true,
      blocksSectorText: true
    }));
  if (!encounter || encounterSectorId !== sectorId) {
    return persistent;
  }

  return [
    ...persistent.filter((entry) => entry.cardId !== encounter.id),
    {
      instanceId: `${sectorId}:${encounter.id}`,
      cardId: encounter.id,
      name: encounter.cardType === "enemy" ? encounter.enemyName : encounter.title,
      type: getThreatPresentationCategory(encounter),
      deck: encounter.threatLane,
      challenge: {
        stat: encounter.stat,
        value: encounter.difficulty
      },
      blocksShop: true,
      blocksSectorText: true
    }
  ];
}

function getShopServicesPreview(boardTags: string[]): string[] {
  const services = ["Browse Equipment", "Sell Gear", "Browse Supplies"];

  if (boardTags.includes("salvage")) {
    services.push("Repair Gear");
  }

  if (boardTags.includes("risk-shop")) {
    services.push("Black Market Refresh");
  }

  return services;
}

function getScenarioMarkersForSector(state: GameState, sectorId: string): string[] {
  const markers: string[] = [];

  if (state.nemesisChampions.some((champion) => !champion.defeated && champion.sectorId === sectorId)) {
    markers.push("Nemesis");
  }

  if (
    state.nemesisNexusCountdowns.some((countdown) => {
      const nemesis = state.nemesisChampions.find((champion) => champion.id === countdown.nemesisId);
      return nemesis && !nemesis.defeated && nemesis.sectorId === sectorId;
    })
  ) {
    markers.push("Nexus countdown");
  }

  return markers;
}

function buildStrategicTags(args: {
  boardTags: string[];
  threatIcons: string[];
  faceUpThreatCount: number;
  disabledReason?: string;
  nemesisPresent: boolean;
}): PublicMoveDestination["strategicTags"] {
  const tags = new Set<PublicMoveDestination["strategicTags"][number]>();
  const hasShop = args.boardTags.includes("shop") || args.boardTags.includes("risk-shop");
  const hasReward = args.boardTags.some((tag) => ["salvage", "artifact", "contract", "shrine", "recovery", "shop", "risk-shop"].includes(tag));
  const hasDanger =
    args.faceUpThreatCount > 0 ||
    args.threatIcons.some((icon) => icon === "red" || icon === "blue" || icon === "yellow") ||
    args.boardTags.some((tag) => ["hazard", "enemy", "anomaly"].includes(tag));

  if (hasShop) {
    tags.add("shop");
  }

  if (args.faceUpThreatCount > 0) {
    tags.add("locked");
  }

  if (hasDanger) {
    tags.add("danger");
  }

  if (hasReward) {
    tags.add("reward");
  }

  if (args.nemesisPresent) {
    tags.add("nemesis");
  }

  if (args.disabledReason) {
    tags.add("gate");
  }

  if (tags.size === 0) {
    tags.add("safe");
  }

  return [...tags];
}

function buildPublicMovementPlanner(state: GameState, seatId: string): PublicMovementPlannerState | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;

  if (!player || state.status !== "active" || state.phase !== "navigation" || activeSeatId !== seatId) {
    return null;
  }

  const currentSector = state.sectors.find((sector) => sector.id === player.character.currentSpaceId);

  if (!currentSector) {
    return null;
  }

  const plan = buildMovementRoutePlan(state, seatId);

  if (!plan) {
    return null;
  }
  const compass = player.character.heldGear.find((item) => item.id === "ashen-route-compass" && player.character.equippedGear.utility === item.id && (item.currentCharges ?? item.charges ?? 0) > 0);
  const adjustment = state.movementAdjustments?.[seatId]?.adjustment ?? null;
  const originalMovementValue = state.movementRolls?.[seatId] ?? plan.movementValue;
  const rollDetail = state.normalMovementRollDetails?.[seatId];
  const movementRollEvent = [...state.eventLog].reverse().find((entry) => {
    const candidate = entry as { type?: string; seatId?: string; resolutionId?: string; roll?: { faces?: number[] } };
    return candidate.type === "MOVEMENT_ROLLED" &&
      candidate.seatId === seatId &&
      (!rollDetail?.resolutionId || candidate.resolutionId === rollDetail.resolutionId);
  }) as { roll?: { faces?: number[] } } | undefined;

  const routeEntries = [
    ...plan.routes.map((route) => ({ ...route, disabledReason: undefined })),
    ...plan.blockedRoutes
  ];

  const destinationEntries = routeEntries.flatMap<PublicMoveDestination>((routeEntry) => {
    const sector = state.sectors.find((entry) => entry.id === routeEntry.sectorId);
    const boardSpace = getBoardSpace(routeEntry.sectorId);

    if (!sector || !boardSpace) {
      return [];
    }

    const faceUpThreats = getFaceUpThreatsForSector(state, routeEntry.sectorId);
    const disabledReason = routeEntry.disabledReason;
    const voidKey = player.character.heldGear.find((item) => item.id === "void-key" && player.character.equippedGear.utility === item.id && (item.currentCharges ?? item.charges ?? 0) > 0);
    const voidKeyEligible = Boolean(disabledReason && voidKey && getVoidKeyMovementRoute(state, seatId, routeEntry.sectorId));
    const occupants = state.players
      .filter((entry) => entry.character.currentSpaceId === routeEntry.sectorId)
      .map((entry) => {
        const seat = state.seats.find((candidate) => candidate.seatId === entry.seatId);
        return {
          playerId: entry.seatId,
          name: seat?.displayName ?? entry.seatId,
          characterName: entry.character.name
        };
      });
    const nemesisPresent = state.nemesisChampions.some((champion) => !champion.defeated && champion.sectorId === routeEntry.sectorId);
    const shopStatus =
      faceUpThreats.length > 0 ? "locked" : boardSpace.tags.includes("risk-shop") ? "dangerous" : "open";
    const routeNames = routeEntry.route.map((sectorId) => state.sectors.find((entry) => entry.id === sectorId)?.name ?? sectorId);
    const ringTransition = getBoardRingTransition(routeEntry.route[0] ?? currentSector.id, routeEntry.sectorId);

    return [
      {
        routeId: routeEntry.routeId,
        defaultRouteId: routeEntry.routeId,
        routeVariants: [{ routeId: routeEntry.routeId, destinationId: routeEntry.sectorId, sectorIds: routeEntry.route, sectorNames: routeNames, distance: routeEntry.distance }],
        sectorId: sector.id,
        name: sector.name,
        ring: getPublicRing(boardSpace.tier),
        distance: routeEntry.distance,
        route: routeEntry.route,
        routeNames,
        tags: [...boardSpace.tags],
        threatIcons: [...(boardSpace.threatIcons ?? sector.threatIcons ?? [])],
        ruleText: boardSpace.textBox.text || boardSpace.ruleText,
        loreText: boardSpace.loreText,
        shop:
          boardSpace.tags.includes("shop") || boardSpace.tags.includes("risk-shop")
            ? {
                shopId: boardSpace.textBox.effectKey,
                shopName: boardSpace.name,
                status: shopStatus,
                servicesPreview: getShopServicesPreview(boardSpace.tags)
              }
            : undefined,
        faceUpThreats,
        occupants,
        nemesisPresent,
        scenarioMarkers: getScenarioMarkersForSector(state, routeEntry.sectorId),
        strategicTags: buildStrategicTags({
          boardTags: boardSpace.tags,
          threatIcons: boardSpace.threatIcons,
          faceUpThreatCount: faceUpThreats.length,
          disabledReason,
          nemesisPresent
        }),
        ringTransition: ringTransition
          ? {
              direction: ringTransition.direction,
              fromRing: getPublicRing(ringTransition.sourceRing),
              toRing: getPublicRing(ringTransition.destinationRing),
              label: ringTransition.uiLabel,
              activationTiming: "beforeRoll",
              endsMovement: true
            }
          : undefined,
        disabledReason,
        voidKeyPrompt: voidKeyEligible && voidKey ? { instanceId: voidKey.instanceId!, currentCharges: voidKey.currentCharges ?? voidKey.charges ?? 0, maxCharges: voidKey.maxCharges ?? 2, chargeCost: 1 as const } : undefined
      }
    ];
  });

  const destinations = [...destinationEntries.reduce((byDestination, destination) => {
    const existing = byDestination.get(destination.sectorId);
    if (!existing || destination.disabledReason || existing.disabledReason) {
      if (!existing) byDestination.set(destination.sectorId, destination);
      return byDestination;
    }
    existing.routeVariants.push(...destination.routeVariants.filter((variant) => !existing.routeVariants.some((current) => current.routeId === variant.routeId)));
    return byDestination;
  }, new Map<string, PublicMoveDestination>()).values()]
    .sort((left, right) => left.name.localeCompare(right.name) || left.sectorId.localeCompare(right.sectorId));

  let markerIndex = 0;
  for (const destination of destinations) {
    if (!destination.disabledReason || destination.voidKeyPrompt) {
      destination.markerLabel = getMovementDestinationMarkerLabel(markerIndex);
      markerIndex += 1;
    }
  }

  return {
    active: true,
    movementValue: plan.movementValue,
    rolledValue: rollDetail?.rolledValue,
    rollFaces: movementRollEvent?.roll?.faces ? [...movementRollEvent.roll.faces] : rollDetail ? [rollDetail.rolledValue] : undefined,
    rollResolutionId: rollDetail?.resolutionId,
    modifierSources: rollDetail?.modifierSources,
    originalMovementValue,
    movementAdjustment: adjustment,
    compassPrompt: !adjustment && compass ? { instanceId: compass.instanceId!, currentCharges: compass.currentCharges ?? compass.charges ?? 0, maxCharges: compass.maxCharges ?? 2, canDecrease: originalMovementValue > 1, canIncrease: true } : null,
    currentSectorId: currentSector.id,
    currentSectorName: currentSector.name,
    movementRevision: plan.revision,
    destinations
  };
}

function buildPhoneMovementPlanner(state: GameState, seatId: string): PublicMovementPlannerState | null {
  const planner = buildPublicMovementPlanner(state, seatId);
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!planner || !player) return planner;
  const choice = state.routeStarChoices?.[seatId];
  const star = player.character.heldGear.find((item) => item.id === "route-star" && player.character.equippedGear.utility === item.id);
  const charges = star?.currentCharges ?? star?.charges ?? 0;
  return {
    ...planner,
    selectedDestinationId: choice?.destinationId ?? planner.selectedDestinationId,
    selectedRouteId: choice?.routeId ?? null,
    routeStarCommitted: Boolean(choice),
    destinations: planner.destinations.map((destination) => {
      const chosenVariant = choice?.destinationId === destination.sectorId ? destination.routeVariants.find((variant) => variant.routeId === choice.routeId) : null;
      return {
        ...destination,
        routeId: chosenVariant?.routeId ?? destination.routeId,
        route: chosenVariant ? [...chosenVariant.sectorIds] : destination.route,
        routeNames: chosenVariant ? [...chosenVariant.sectorNames] : destination.routeNames,
        routeStarPrompt: !choice && star && charges > 0 && !destination.disabledReason && destination.routeVariants.length > 1
          ? { instanceId: star.instanceId!, currentCharges: charges, maxCharges: star.maxCharges ?? 2, chargeCost: 1 as const }
          : undefined
      };
    })
  };
}

function formatIconCount(count: number, icon: "red" | "blue" | "yellow"): string {
  return `${count} ${icon}`;
}

function formatThreatIconCounts(icons: Array<"red" | "blue" | "yellow">): string {
  const counts = icons.reduce<Record<"red" | "blue" | "yellow", number>>(
    (accumulator, icon) => {
      accumulator[icon] += 1;
      return accumulator;
    },
    { red: 0, blue: 0, yellow: 0 }
  );

  return (["red", "blue", "yellow"] as const)
    .flatMap((icon) => (counts[icon] > 0 ? [formatIconCount(counts[icon], icon)] : []))
    .join(", ");
}

function buildSectorThreatCardsFromPublicThreats(threats: PublicMoveDestination["faceUpThreats"]): BoardThreatCard[] {
  return threats.map((threat) => ({
    id: threat.cardId,
    category: threat.type === "enemy" ? "enemy" : threat.type === "nemesis" ? "nemesis" : "event",
    icons: threat.deck === "red" || threat.deck === "blue" || threat.deck === "yellow" ? [threat.deck] : []
  }));
}

function buildPublicSectorExplorationSummary(state: GameState, seatId: string | null | undefined): PublicSectorExplorationSummary | null {
  if (!seatId || state.status !== "active") {
    return null;
  }

  const player = state.players.find((entry) => entry.seatId === seatId);

  if (!player) {
    return null;
  }

  const sectorId = player.character.currentSpaceId;
  const sector = state.sectors.find((entry) => entry.id === sectorId);
  const boardSpace = getBoardSpace(sectorId);

  if (!sector || !boardSpace) {
    return null;
  }

  const unresolvedThreats = getFaceUpThreatsForSector(state, sectorId);
  const event = resolveBoardSpaceEvent(player, boardSpace, buildSectorThreatCardsFromPublicThreats(unresolvedThreats));
  const isShopCapable = isBoardSpaceShopCapable(boardSpace);
  const serviceGate = getServiceThreatGate(state, seatId, sectorId);
  const shopLocked = isShopCapable && !serviceGate.allowed;
  const sectorTextLocked = !event.engagement.shouldResolveTextBox;
  const blocker = unresolvedThreats[0] ?? null;
  const lockedReason = serviceGate.reason && shopLocked
    ? serviceGate.reason
    : blocker
    ? `Clear ${blocker.name} before ${shopLocked ? "shopping or using sector text" : "using sector text"}.`
    : null;
  const lanesWithBlockers = new Set(unresolvedThreats.flatMap((threat) => (
    threat.deck === "red" || threat.deck === "blue" || threat.deck === "yellow" ? [threat.deck] : []
  )));
  const explanationLines: string[] = [];
  const printedIconText = formatThreatIconCounts(event.printedThreatIcons);

  explanationLines.push(printedIconText ? `Printed icons: ${printedIconText}.` : "Printed icons: none.");

  if (unresolvedThreats.length > 0) {
    explanationLines.push(
      `Unresolved blockers: ${unresolvedThreats.map((threat) => threat.name).join(", ")}.`
    );
  } else {
    explanationLines.push("No unresolved threats on this sector.");
  }

  (["red", "blue", "yellow"] as const).forEach((icon) => {
    const due = event.exploration.drawCounts[icon];

    if (due > 0) {
      explanationLines.push(`Draw due: ${formatIconCount(due, icon)} threat${due === 1 ? "" : "s"}.`);
      return;
    }

    if (event.printedThreatIcons.includes(icon) && lanesWithBlockers.has(icon)) {
      explanationLines.push(`No draw: ${icon} lane already has an unresolved card.`);
    }
  });

  if (
    unresolvedThreats.length > 0 &&
    event.exploration.drawCounts.red === 0 &&
    event.exploration.drawCounts.blue === 0 &&
    event.exploration.drawCounts.yellow === 0
  ) {
    explanationLines.push("Printed lane occupied: no new draw.");
  }

  explanationLines.push(
    sectorTextLocked
      ? `Sector text locked: ${blocker ? `clear ${blocker.name} first` : "clear unresolved threats first"}.`
      : "Sector text unlocked: no unresolved blocker remains."
  );

  if (isShopCapable) {
    explanationLines.push(
      shopLocked
        ? `Shop locked: ${blocker ? `clear ${blocker.name} first` : "unresolved threat remains"}.`
        : "Shop unlocked: services are available if no new threat appears."
    );
  }

  return {
    sectorId,
    sectorName: boardSpace.name ?? sector.name,
    printedThreatIcons: [...event.printedThreatIcons],
    unresolvedThreats: unresolvedThreats.map((threat) => ({
      instanceId: threat.instanceId,
      cardId: threat.cardId,
      name: threat.name,
      type: threat.type,
      lane: threat.deck,
      blocksShop: threat.blocksShop,
      blocksSectorText: threat.blocksSectorText
    })),
    drawCountsDue: event.exploration.drawCounts,
    sectorTextLocked,
    shopLocked,
    lockedReason,
    sectorTextTitle: boardSpace.textBox.title ?? null,
    shopName: isShopCapable ? boardSpace.name : null,
    explanationLines
  };
}

function buildPublicBlockingThreats(state: GameState): Array<{
  cardId: string;
  name: string;
    type: "enemy" | "nemesis" | "event" | "encounter" | "asset" | "anomaly" | "hazard";
  deck?: "red" | "blue" | "yellow";
  challenge?: {
    stat: Stat;
    value: number;
  };
}> {
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const activePlayer = activeSeatId ? state.players.find((player) => player.seatId === activeSeatId) : null;
  const sectorId = activePlayer?.character.currentSpaceId;
  const persistent: Array<{
    cardId: string;
    name: string;
    type: "enemy" | "nemesis" | "event" | "encounter" | "asset" | "anomaly" | "hazard";
    deck?: "red" | "blue" | "yellow";
    challenge?: { stat: Stat; value: number };
  }> = sectorId ? getFaceUpThreatsForSector(state, sectorId)
    .filter((entry) => entry.instanceId.includes(":persistent:"))
    .map((entry) => ({
      cardId: entry.cardId,
      name: entry.name,
      type: (
        ["enemy", "nemesis", "event", "encounter", "asset", "anomaly", "hazard"] as const
      ).find((type) => type === entry.type) ?? "encounter",
      deck: entry.deck === "red" || entry.deck === "blue" || entry.deck === "yellow" ? entry.deck : undefined,
      challenge: entry.challenge
    })) : [];
  const encounter = state.currentEncounter;
  const current: typeof persistent = encounter ? [{
      cardId: encounter.id,
      name: encounter.cardType === "enemy" ? encounter.enemyName : encounter.title,
      type: getThreatPresentationCategory(encounter),
      deck: encounter.threatLane,
      challenge: {
        stat: encounter.stat,
        value: encounter.difficulty
      }
    }] : [];
  return [...persistent, ...current].filter((entry, index, entries) =>
    entries.findIndex((candidate) => candidate.cardId === entry.cardId) === index
  );
}

function canPayShopCost(
  player: PlayerState,
  state: GameState,
  cost: PublicShopService["cost"]
): { enabled: boolean; disabledReason?: string } {
  const salvage = getPublicSalvage(player);
  const completedContracts = getCompletedContractCountForProjection(state, player.seatId);

  if (cost.salvage !== undefined && salvage < cost.salvage) {
    return { enabled: false, disabledReason: SHOP_FAILURE_REASONS.insufficientSalvage };
  }

  if (cost.trophies !== undefined && player.character.trophies < cost.trophies) {
    return { enabled: false, disabledReason: "Not enough Trophies" };
  }

  if (cost.completedContracts !== undefined && completedContracts < cost.completedContracts) {
    return { enabled: false, disabledReason: "Need completed Contracts" };
  }

  if (cost.scars !== undefined && player.character.scars.length < cost.scars) {
    return { enabled: false, disabledReason: "Condition not met" };
  }

  return { enabled: true };
}

function getPublicGearShopCost(item: GearItem): number {
  return getShopGearCost(item);
}

function getGearSummary(item: GearItem): string {
  if (item.activeText) {
    return item.activeText;
  }

  return `${CHALLENGE_LABELS[item.statBonus.stat]} +${item.statBonus.amount}.`;
}

function buildPublicShopStock(
  state: GameState,
  player: PlayerState,
  privateArtifactSeatId?: string
): PublicShopStockItem[] | undefined {
  const reveal = (state.shopStockReveals ?? []).find(
    (entry) => entry.seatId === player.seatId && entry.sectorId === player.character.currentSpaceId
  );

  if (!reveal) {
    return undefined;
  }

  const artifactExchange = reveal.serviceId === "trade-missions-for-artifact";
  if (artifactExchange && privateArtifactSeatId !== player.seatId) {
    return undefined;
  }

  const ownedGearIds = new Set([
    ...player.character.heldGear.map((item) => item.id),
    ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
  ]);
  const ownedFollowerIds = new Set((player.character.followers ?? []).map((follower) => follower.id));

  return reveal.stockIds.flatMap((cardId): PublicShopStockItem[] => {
    const follower = PROJECTION_FOLLOWER_CATALOG.get(cardId);
    if (follower) {
      const cost = { salvage: follower.cost ?? 4 };
      const payment = canPayShopCost(player, state, cost);
      const alreadyOwned = ownedFollowerIds.has(follower.id);
      return [{
        cardId: follower.id,
        name: follower.name,
        type: "follower" as const,
        artCardId: follower.artCardId,
        cost,
        summary: follower.text,
        lore: follower.flavor,
        rarity: follower.tier ?? "standard",
        stock: 1,
        affordable: payment.enabled && !alreadyOwned,
        disabledReason: alreadyOwned ? "Already following" : payment.disabledReason
      } satisfies PublicShopStockItem];
    }
    const item = PROJECTION_GEAR_CATALOG.get(cardId);
    if (!item) return [];
      const cost = artifactExchange
        ? { completedContracts: ARTIFACT_EXCHANGE_CONTRACT_COST }
        : reveal.serviceId === "buy-route-aids"
          ? { salvage: 5 }
          : { salvage: getPublicGearShopCost(item) };
      const payment = canPayShopCost(player, state, cost);
      const alreadyOwned = ownedGearIds.has(item.id);

      return [{
        cardId: item.id,
        name: item.name,
        type: item.tier === "artifact" ? "artifact" : "gear",
        shopCategories: getGearShopCategoryIds(item),
        cost,
        summary: getGearSummary(item),
        lore: item.flavor,
        rarity: item.tier ?? "standard",
        stock: 1,
        affordable: payment.enabled && !alreadyOwned,
        disabledReason: alreadyOwned ? "Already held" : payment.disabledReason
      } satisfies PublicShopStockItem];
    });
}

function buildPublicShopSellInventory(player: PlayerState): PublicShopSellItem[] {
  return player.character.heldGear.map((item) => {
    const restriction = getGearSellRestriction(item, player.character);
    const sellValue = getShopGearSellValue(item) ?? 0;

    return {
      gearId: item.id,
      instanceId: item.instanceId,
      name: item.name,
      type: item.tier === "artifact" ? "artifact" : "gear",
      category: item.category,
      sellValue,
      summary: getGearSummary(item),
      sellable: !restriction,
      disabledReason: restriction
    } satisfies PublicShopSellItem;
  });
}

function createShopService(
  player: PlayerState,
  state: GameState,
  service: Omit<PublicShopService, "enabled" | "disabledReason"> & { enabled?: boolean; disabledReason?: string }
): PublicShopService {
  if (service.enabled === false) {
    return {
      ...service,
      enabled: false,
      disabledReason: service.disabledReason
    };
  }

  const payment = canPayShopCost(player, state, service.cost);

  return {
    ...service,
    ...payment
  };
}

function scarServiceContext(state: GameState, player: PlayerState, serviceId: string): Parameters<typeof evaluateOwnedScarRules>[3] {
  const lastArrival = [...state.eventLog].reverse().find((entry) => {
    const event = entry as { type?: string; seatId?: string; toSectorId?: string; createdAt?: string };
    return event.type === "MOVED" && event.seatId === player.seatId && event.toSectorId === player.character.currentSpaceId;
  }) as { createdAt?: string } | undefined;
  return {
    eventId: `service:${player.seatId}:${player.character.currentSpaceId}:${lastArrival?.createdAt ?? "initial"}`,
    timing: "beforeService",
    mode: "service",
    serviceKind: serviceId === "repair-gear" ? "repair" : serviceId === "buy-treatment" ? "healing" : "other"
  };
}

function applyScarServiceSurcharge(state: GameState, player: PlayerState, serviceId: string, cost: ShopServiceCost): ShopServiceCost {
  if (!cost.salvage || serviceId === "purge-scar") return cost;
  const surcharge = evaluateOwnedScarRules(state, player, "burden", scarServiceContext(state, player, serviceId))
    .reduce((sum, entry) => sum + (entry.outcome.serviceSurcharge ?? 0), 0);
  return surcharge > 0 ? { ...cost, salvage: cost.salvage + surcharge } : cost;
}

function buildPublicShopServices(state: GameState, player: PlayerState): PublicShopService[] {
  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (!boardSpace || !isBoardSpaceShopCapable(boardSpace) || state.currentEncounter) {
    return [];
  }

  const services: PublicShopService[] = [];
  const sellInventory = buildPublicShopSellInventory(player);
  const hasSellableGear = sellInventory.some((item) => item.sellable);
  const hasRepairableGear = player.character.heldGear.some((item) => {
    const maximum = item.maxCharges ?? item.maxUses ?? item.startingCharges ?? item.charges ?? 0;
    return (item.effectModel === "exhaust" && item.exhausted) ||
      (item.useLimit === "charge" && (item.currentCharges ?? item.charges ?? 0) < maximum);
  });

  if (boardSpace.tags.includes("shop")) {
    services.push(
      createShopService(player, state, {
        id: "buy-gear",
        label: "Browse Equipment",
        shopCategory: getShopStockCategoryForService(boardSpace, "buy-gear") ?? undefined,
        cost: {}
      }),
      createShopService(player, state, {
        id: "buy-route-aids",
        label: "Browse Route Aids",
        shopCategory: "relic-dealer",
        cost: {}
      }),
      createShopService(player, state, {
        id: "sell-gear",
        label: "Sell Gear",
        cost: {},
        risk: hasSellableGear ? "Choose one held item below" : undefined,
        enabled: hasSellableGear,
        disabledReason: hasSellableGear ? undefined : "No sellable items"
      })
    );
  }

  if (boardSpace.tags.includes("salvage") || boardSpace.id.includes("foundry")) {
    services.push(
      createShopService(player, state, {
        id: "repair-gear",
        label: "Repair Gear",
        shopCategory: "forge-armoury",
        cost: applyScarServiceSurcharge(state, player, "repair-gear", { salvage: 2 }),
        enabled: hasRepairableGear,
        disabledReason: hasRepairableGear ? undefined : "No depleted or exhausted Gear"
      }),
      createShopService(player, state, {
        id: "buy-supplies",
        label: "Browse Supplies",
        shopCategory: "market",
        cost: {}
      })
    );
  }

  if (boardSpace.tags.includes("recovery")) {
    services.push(
      createShopService(player, state, {
        id: "buy-treatment",
        label: "Buy Treatment",
        shopCategory: "medicae-shrine",
        cost: applyScarServiceSurcharge(state, player, "buy-treatment", { salvage: 2 })
      })
    );
  }

  if (boardSpace.tags.includes("risk-shop")) {
    services.push(
      createShopService(player, state, {
        id: "trade-missions-for-artifact",
        label: "Exchange Contracts for Artifact",
        shopCategory: "relic-dealer",
        cost: { completedContracts: ARTIFACT_EXCHANGE_CONTRACT_COST }
      })
    );
  }

  if (boardSpace.id === "middle_scar_surgery") {
    const lastArrival = [...state.eventLog].reverse().find((entry) => {
      const event = entry as { type?: string; seatId?: string; toSectorId?: string; createdAt?: string };
      return event.type === "MOVED" && event.seatId === player.seatId && event.toSectorId === "middle_scar_surgery";
    }) as { createdAt?: string } | undefined;
    const visitId = `scar-surgery:${player.seatId}:${lastArrival?.createdAt ?? "initial"}`;
    services.push(createShopService(player, state, {
      id: "purge-scar",
      label: "Purge a Scar",
      cost: { salvage: 4 },
      enabled: player.character.scars.length > 0 && !(state.resolvedScarRemovalVisitIds ?? []).includes(visitId),
      disabledReason: player.character.scars.length === 0 ? "No Scars to purge" : "Already used this arrival"
    }));
  }

  return services.slice(0, 6);
}

function buildPublicShopEncounter(
  state: GameState,
  visiblePlayers: PlayerState[],
  privateArtifactSeatId?: string
): Record<string, unknown> | null {
  if (state.status !== "active" || state.phase !== "action" || state.activeResolution || state.pendingEnemyRoll) {
    return null;
  }

  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const activePlayer = activeSeatId ? visiblePlayers.find((player) => player.seatId === activeSeatId) ?? null : null;
  const boardSpace = activePlayer ? getBoardSpace(activePlayer.character.currentSpaceId) : null;
  const sector = state.sectors.find((entry) => entry.id === activePlayer?.character.currentSpaceId) ?? null;

  if (!activePlayer || !boardSpace || !sector) {
    return null;
  }

  const salvage = getPublicSalvage(activePlayer);
  const playerDisplayName = state.seats.find((seat) => seat.seatId === activePlayer.seatId)?.displayName ?? activePlayer.character.name;
  const completedContracts = getCompletedContractCountForProjection(state, activePlayer.seatId);
  const blockingThreats = buildPublicBlockingThreats(state);
  const services = buildPublicShopServices(state, activePlayer);
  const revealedStock = buildPublicShopStock(state, activePlayer, privateArtifactSeatId);
  const fullSellInventory = buildPublicShopSellInventory(activePlayer);
  const sellInventory = privateArtifactSeatId === activePlayer.seatId ? fullSellInventory : undefined;
  const sellableCount = privateArtifactSeatId === activePlayer.seatId
    ? fullSellInventory.filter((item) => item.sellable).length
    : undefined;
  const repairTargets: Array<{
    gearId: string;
    instanceId: string;
    name: string;
    kind: "charges" | "exhaust";
    currentCharges?: number;
    maxCharges?: number;
  }> | undefined = privateArtifactSeatId === activePlayer.seatId
    ? activePlayer.character.heldGear.flatMap((item): Array<{
        gearId: string;
        instanceId: string;
        name: string;
        kind: "charges" | "exhaust";
        currentCharges?: number;
        maxCharges?: number;
      }> => {
        if (!item.instanceId) return [];
        const maximum = item.maxCharges ?? item.maxUses ?? item.startingCharges ?? item.charges ?? 0;
        if (item.effectModel === "exhaust" && item.exhausted) {
          return [{ gearId: item.id, instanceId: item.instanceId, name: item.name, kind: "exhaust" as const }];
        }
        const current = item.currentCharges ?? item.charges ?? 0;
        return item.useLimit === "charge" && current < maximum
          ? [{ gearId: item.id, instanceId: item.instanceId, name: item.name, kind: "charges" as const, currentCharges: current, maxCharges: maximum }]
          : [];
      })
    : undefined;
  const latest = state.lastOutcomeSummary?.seatId === activePlayer.seatId ? state.lastOutcomeSummary : null;
  const latestAction = state.eventLog.at(-1) as GameAction | undefined;
  const latestPurchase =
    latestAction?.type === "SHOP_PURCHASE_RESOLVED" && latestAction.seatId === activePlayer.seatId
      ? (latestAction as ShopPurchaseResolvedAction)
      : null;
  const latestFollowerPurchase =
    latestAction?.type === "SHOP_FOLLOWER_PURCHASE_RESOLVED" && latestAction.seatId === activePlayer.seatId
      ? latestAction
      : null;
  const latestSale =
    latestAction?.type === "SHOP_SELL_RESOLVED" && latestAction.seatId === activePlayer.seatId
      ? (latestAction as ShopSellResolvedAction)
      : null;
  const blockedReason = getPublicShopBlockedReason(state, blockingThreats.length, activePlayer);
  const shopCategory = getBoardSpaceShopCategory(boardSpace);
  const stockCategory =
    services.find((service) => service.id === "buy-gear")?.shopCategory ??
    services.find((service) => service.id === "trade-missions-for-artifact")?.shopCategory ??
    shopCategory;
  const storedBrowseSelection = state.shopBrowseSelection?.seatId === activePlayer.seatId &&
    state.shopBrowseSelection.sectorId === activePlayer.character.currentSpaceId
      ? state.shopBrowseSelection
      : null;
  const browseSelection = storedBrowseSelection
    ? {
        view: storedBrowseSelection.view,
        selectedId:
          (storedBrowseSelection.view === "artifacts" || storedBrowseSelection.view === "sell") && privateArtifactSeatId !== activePlayer.seatId
            ? null
            : storedBrowseSelection.selectedId
      }
    : { view: "categories" as const, selectedId: null };

  const ownerProjection = privateArtifactSeatId === activePlayer.seatId;
  const serviceById = (id: string) => services.find((service) => service.id === id);
  const localServices = services.filter((service) => ![
    "buy-gear",
    "buy-supplies",
    "buy-route-aids",
    "trade-missions-for-artifact",
    "sell-gear"
  ].includes(service.id));
  const categoryCandidates = [
    serviceById("buy-supplies") ? {
      id: "items" as const,
      view: "supplies" as const,
      label: "Items",
      description: "Field supplies and expendable necessities",
      service: serviceById("buy-supplies")!
    } : null,
    serviceById("buy-gear") ? {
      id: "equipment" as const,
      view: "equipment" as const,
      label: "Equipment",
      description: "Tools, armour and battle hardware",
      service: serviceById("buy-gear")!
    } : null,
    serviceById("trade-missions-for-artifact") ? {
      id: "artifacts" as const,
      view: "artifacts" as const,
      label: "Artifacts",
      description: "Sealed relics exchanged for completed Contracts",
      service: serviceById("trade-missions-for-artifact")!
    } : null,
    serviceById("buy-route-aids") ? {
      id: "route-aids" as const,
      view: "route-aids" as const,
      label: "Route Aids",
      description: "Charged guides and instruments for reaching transition sectors",
      service: serviceById("buy-route-aids")!
    } : null,
    localServices.length > 0 ? {
      id: "services" as const,
      view: "services" as const,
      label: "Services",
      description: "Repair, treatment and local work",
      service: {
        enabled: localServices.some((service) => service.enabled),
        disabledReason: localServices.find((service) => !service.enabled)?.disabledReason
      }
    } : null,
    ownerProjection && (sellableCount ?? 0) > 0 ? {
      id: "sell" as const,
      view: "sell" as const,
      label: "Sell",
      description: "Offer carried Equipment for Salvage",
      service: { enabled: true, disabledReason: undefined }
    } : null
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const categories = categoryCandidates.map((entry) => ({
    id: entry.id,
    view: entry.view,
    label: entry.label,
    description: entry.description,
    available: entry.service.enabled,
    offerCount: browseSelection.view === entry.view
      ? entry.view === "sell"
        ? sellableCount ?? null
        : entry.view === "services"
          ? localServices.length
          : revealedStock?.length ?? null
      : null,
    unavailableReason: entry.service.disabledReason
  }));
  const selectedCategoryId = categories.find((entry) => entry.view === browseSelection.view)?.id ?? null;
  const privateResolution = !ownerProjection && (browseSelection.view === "artifacts" || browseSelection.view === "sell");
  const presentation = {
    id: `shop:${activePlayer.seatId}:${boardSpace.id}`,
    revision: state.sequence,
    stage: blockedReason
      ? "locked" as const
      : latest
        ? "transaction_result" as const
        : privateResolution
          ? "private_resolution" as const
          : browseSelection.view === "categories"
            ? "category_selection" as const
            : "item_selection" as const,
    publicStatus: blockedReason
      ? SHOP_FAILURE_LABELS[blockedReason]
      : latest
        ? `${playerDisplayName}'s transaction is complete.`
        : privateResolution
          ? `${playerDisplayName} is making a private shop choice.`
          : browseSelection.view === "categories"
            ? `${playerDisplayName} is choosing a shop category.`
            : `${playerDisplayName} is browsing ${browseSelection.view}.`,
    allowedCommand: ownerProjection
      ? browseSelection.view === "categories"
        ? "browse" as const
        : browseSelection.view === "sell"
          ? "sell" as const
          : browseSelection.view === "services"
            ? "use_service" as const
            : "buy" as const
      : null,
    privacy: privateResolution ? "actor_private" as const : "public" as const,
    categories,
    selectedCategoryId,
    selectedOfferId: browseSelection.selectedId
  };

  if (services.length === 0 && blockingThreats.length === 0) {
    return null;
  }

  return {
    sectorId: sector.id,
    sectorName: sector.name,
    shopId: boardSpace.id,
    shopName: boardSpace.name,
    available: services.length > 0 && !blockedReason,
    blocked: Boolean(blockedReason),
    blockedReason,
    blockedReasonText: blockedReason ? SHOP_FAILURE_LABELS[blockedReason] : undefined,
    shopType: getBoardSpaceShopTypeLabel(boardSpace),
    shopCategory,
    stockCategory,
    status: blockedReason ? "locked" : getPublicShopStatus(state, activePlayer),
    browseSelection,
    presentation,
    activePlayer: {
      playerId: activePlayer.seatId,
      name: playerDisplayName,
      characterName: activePlayer.character.name,
      ...(ownerProjection ? { salvage } : {}),
      wounds: {
        current: activePlayer.character.wounds,
        max: state.woundThreshold
      },
      trophies: activePlayer.character.trophies,
      completedContracts
    },
    blockingThreats,
    services,
    revealedStock,
    sellInventory,
    sellableCount,
    repairTargets,
    recentOutcome: latest
      ? {
          operativeName: playerDisplayName,
          shopName: boardSpace.name,
          action: latestSale
            ? "sell"
            : latestFollowerPurchase
              ? "buy"
            : latestPurchase?.serviceId === "trade-missions-for-artifact"
              ? "artifactExchange"
              : latestPurchase ? "buy" : "Recent outcome",
          gained: latestPurchase?.gainedGear.name ?? latestFollowerPurchase?.gainedFollower.name,
          sold: latestSale?.soldGear.name,
          salvageDelta: latestSale?.salvageDelta,
          costPaid: latestPurchase?.cost ?? latestFollowerPurchase?.cost,
          remainingSalvage: salvage,
          summary: latest.summary
        }
      : null
  };
}

function createResultDelta(args: Omit<ResultDelta, "id"> & { id?: string }): ResultDelta {
  return {
    ...args,
    id: args.id ?? `${args.type}:${args.targetSeatId ?? args.targetScope}:${args.source ?? args.publicText}`
  };
}

function getShopResultDeltas(shopEncounter: Record<string, unknown> | null): ResultDelta[] {
  const recentOutcome = shopEncounter?.recentOutcome as {
    operativeName?: string;
    shopName?: string;
    action?: string;
    gained?: string;
    sold?: string;
    costPaid?: { salvage?: number; wounds?: number; trophies?: number; completedContracts?: number };
    salvageDelta?: number;
    woundDelta?: number;
    scarDelta?: number;
    summary?: string;
  } | null | undefined;
  const activePlayer = shopEncounter?.activePlayer as { playerId?: string } | undefined;

  if (!recentOutcome) {
    return [];
  }

  const seatId = activePlayer?.playerId ?? null;
  const source = `shop:${recentOutcome.action ?? "outcome"}`;
  const deltas: ResultDelta[] = [];

  if (recentOutcome.gained) {
    const artifactExchange = recentOutcome.costPaid?.completedContracts !== undefined;
    deltas.push(createResultDelta({
      type: artifactExchange ? "gearGained" : "itemBought",
      label: artifactExchange ? "Artifact gained" : "Item bought",
      value: recentOutcome.gained,
      sign: "gain",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: recentOutcome.shopName,
      publicText: artifactExchange
        ? `${recentOutcome.operativeName ?? "Operative"} completed an Artifact exchange and gained ${recentOutcome.gained}.`
        : `${recentOutcome.operativeName ?? "Operative"} bought ${recentOutcome.gained}.`,
      severity: "reward"
    }));
  }

  if (recentOutcome.costPaid?.salvage) {
    deltas.push(createResultDelta({
      type: "salvage",
      label: "Salvage",
      value: recentOutcome.costPaid.salvage,
      sign: "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: "Shop purchase",
      publicText: `${recentOutcome.operativeName ?? "Operative"} spent ${recentOutcome.costPaid.salvage} Salvage.`,
      severity: "loss"
    }));
  }

  if (recentOutcome.sold) {
    deltas.push(createResultDelta({
      type: "itemSold",
      label: "Item sold",
      value: recentOutcome.sold,
      sign: "neutral",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: recentOutcome.shopName,
      publicText: `${recentOutcome.operativeName ?? "Operative"} sold ${recentOutcome.sold}.`,
      severity: "neutral"
    }));
  }

  if (recentOutcome.salvageDelta) {
    deltas.push(createResultDelta({
      type: "salvage",
      label: "Salvage",
      value: Math.abs(recentOutcome.salvageDelta),
      sign: recentOutcome.salvageDelta >= 0 ? "gain" : "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: "Shop sale",
      publicText: `${recentOutcome.operativeName ?? "Operative"} ${recentOutcome.salvageDelta >= 0 ? "gained" : "spent"} ${Math.abs(recentOutcome.salvageDelta)} Salvage.`,
      severity: recentOutcome.salvageDelta >= 0 ? "reward" : "loss"
    }));
  }

  if (recentOutcome.woundDelta) {
    deltas.push(createResultDelta({
      type: "wound",
      label: "Wound",
      value: Math.abs(recentOutcome.woundDelta),
      sign: recentOutcome.woundDelta >= 0 ? "gain" : "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: "Shop service",
      publicText: `${recentOutcome.operativeName ?? "Operative"} ${recentOutcome.woundDelta >= 0 ? "took" : "healed"} ${Math.abs(recentOutcome.woundDelta)} Wound.`,
      severity: recentOutcome.woundDelta >= 0 ? "danger" : "reward"
    }));
  }

  return deltas;
}

function parseResolutionEffectDelta(effect: string, seatId: string | null): ResultDelta | null {
  const lower = effect.toLowerCase();
  if (lower.includes("?")) return null;
  const salvageGain = lower.match(/(?:gain|gained) (\d+) salvage/);
  const salvageLoss = lower.match(/lost (\d+) salvage/);
  const salvagePaid = lower.match(/paid (\d+) salvage/);
  const wound = lower.match(/take (\d+) wound/);
  const heal = lower.match(/heal(?:ed)? (\d+) wound/);
  const trophy = lower.match(/\+(\d+) trophies?|gain (\d+) trophies?/);
  const scar = lower.match(/gain scar ([\w-]+)/);

  if (salvageGain) {
    const amount = Number(salvageGain[1]);
    return createResultDelta({
      type: "salvage",
      label: "Salvage",
      value: amount,
      sign: "gain",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "reward"
    });
  }

  if (salvageLoss || salvagePaid) {
    const amount = Number((salvageLoss ?? salvagePaid)![1]);
    return createResultDelta({
      type: "salvage",
      label: "Salvage",
      value: amount,
      sign: "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "loss"
    });
  }

  if (wound) {
    const amount = Number(wound[1]);
    return createResultDelta({
      type: "wound",
      label: "Wound",
      value: amount,
      sign: "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "danger"
    });
  }

  if (heal) {
    const amount = Number(heal[1]);
    return createResultDelta({
      type: "wound",
      label: "Wound",
      value: amount,
      sign: "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "reward"
    });
  }

  if (trophy) {
    const amount = Number(trophy[1] ?? trophy[2]);
    return createResultDelta({
      type: "trophy",
      label: "Trophy",
      value: amount,
      sign: "gain",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "reward"
    });
  }

  if (scar) {
    return createResultDelta({
      type: "scarGained",
      label: "Scar gained",
      value: scar[1],
      sign: "loss",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "danger"
    });
  }

  if (/trophy pile|defeat|defeated/i.test(effect)) {
    return createResultDelta({
      type: "threatDefeated",
      label: "Threat defeated",
      sign: "gain",
      targetScope: "sector",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "reward"
    });
  }

  if (/remains|return.+space|place this enemy/i.test(effect)) {
    return createResultDelta({
      type: "threatRemains",
      label: "Blocker remains",
      sign: "neutral",
      targetScope: "sector",
      targetSeatId: seatId,
      visibility: "public",
      source: "resolution-effect",
      reason: effect,
      publicText: effect,
      severity: "danger"
    });
  }

  return null;
}

function getResolutionResultDeltas(state: GameState): ResultDelta[] {
  const outcome = state.lastOutcomeSummary;
  const resolution = state.activeResolution;
  const seatId = resolution?.playerId ?? outcome?.seatId ?? null;
  const deltas: ResultDelta[] = [];

  if (outcome?.encounterCardType === "enemy" && outcome.success === true) {
    deltas.push(createResultDelta({
      type: "threatDefeated",
      label: "Threat defeated",
      value: outcome.encounterTitle ?? "Enemy",
      sign: "gain",
      targetScope: "sector",
      targetSeatId: seatId,
      visibility: "public",
      source: "combat",
      reason: outcome.summary,
      publicText: `${outcome.encounterTitle ?? "Threat"} defeated.`,
      severity: "reward"
    }));
  }

  if (outcome?.encounterCardType === "enemy" && outcome.success === false) {
    deltas.push(createResultDelta({
      type: "threatRemains",
      label: "Blocker remains",
      value: outcome.encounterTitle ?? "Enemy",
      sign: "neutral",
      targetScope: "sector",
      targetSeatId: seatId,
      visibility: "public",
      source: "combat",
      reason: outcome.summary,
      publicText: `${outcome.encounterTitle ?? "Threat"} remains unresolved.`,
      severity: "danger"
    }));
  }

  for (const effect of resolution?.outcome?.effects ?? []) {
    const delta = parseResolutionEffectDelta(effect, seatId);

    if (delta) {
      deltas.push(delta);
    }
  }

  const outcomeSummary = outcome?.summary ?? null;
  const trophyMatch = outcomeSummary?.match(/\+(\d+) trophies?/i);
  if (trophyMatch && !deltas.some((delta) => delta.type === "trophy")) {
    const amount = Number(trophyMatch[1]);
    deltas.push(createResultDelta({
      type: "trophy",
      label: "Trophy",
      value: amount,
      sign: "gain",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source: "combat",
      reason: outcomeSummary ?? undefined,
      publicText: `Gained ${amount} Trophy${amount === 1 ? "" : "ies"}.`,
      severity: "reward"
    }));
  }

  return deltas;
}

function getEventLogResultDeltas(state: GameState, ownerSeatId?: string | null): ResultDelta[] {
  const deltas: ResultDelta[] = [];
  const recentEvents = state.eventLog.slice(-8);

  recentEvents.forEach((event, index) => {
    const entry = event as Record<string, unknown>;
    const type = entry.type;
    const seatId = typeof entry.seatId === "string" ? entry.seatId : null;
    const stableEventIdentity = typeof entry.createdAt === "string" && entry.createdAt.length > 0
      ? entry.createdAt
      : `legacy-${index}`;
    const source = `${type ?? "event"}:${seatId ?? "table"}:${stableEventIdentity}`;

    if (type === "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED") {
      const amount = typeof entry.amount === "number" ? entry.amount : 1;
      deltas.push(createResultDelta({
        id: `scenario-progress:${source}`,
        type: "scenarioProgress",
        label: "Scenario",
        value: amount,
        sign: "gain",
        targetScope: "scenario",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: typeof entry.triggerType === "string" ? entry.triggerType : "objective trigger",
        publicText: typeof entry.summary === "string" ? entry.summary : `Scenario objective advanced by ${amount}.`,
        severity: "scenario"
      }));
    }

    if (type === "ENCOUNTER_DECISION_RESOLVED" && entry.paid === true && typeof entry.salvageCost === "number") {
      const currentResolutionId = state.activeResolution?.id ?? null;
      const currentCardId = state.activeResolution?.card?.id ?? state.lastOutcomeSummary?.encounterCardId ?? null;
      const sourceResolutionId = typeof entry.sourceResolutionId === "string" ? entry.sourceResolutionId : null;
      const sourceCardId = typeof entry.sourceCardId === "string" ? entry.sourceCardId : null;
      if (
        (currentResolutionId && sourceResolutionId === currentResolutionId) ||
        (sourceCardId && currentCardId && sourceCardId !== currentCardId)
      ) {
        return;
      }
      const amount = entry.salvageCost;
      const playerName = seatId ? state.players.find((player) => player.seatId === seatId)?.character.name ?? "An operative" : "An operative";
      deltas.push(createResultDelta({
        id: `encounter-payment:${source}`,
        type: "salvage",
        label: "Salvage payment",
        value: amount,
        sign: "loss",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: "Encounter payment",
        publicText: `${playerName} paid ${amount} Salvage.`,
        severity: "loss"
      }));
    }

    if (type === "AFFLICTION_DRAWN") {
      const affliction = entry.affliction as { name?: unknown; flipFacedownAfterResolve?: unknown } | undefined;
      const afflictionName =
        typeof affliction?.name === "string"
          ? affliction.name
          : typeof entry.afflictionId === "string"
            ? entry.afflictionId
            : "Affliction";

      deltas.push(createResultDelta({
        id: `affliction-drawn:${source}`,
        type: "afflictionDrawn",
        label: "Affliction drawn",
        value: afflictionName,
        sign: "neutral",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "ownerPrivate",
        source,
        reason: "Affliction reveal",
        publicText: "An operative received a private Affliction.",
        privateText: typeof entry.privateSummary === "string" ? entry.privateSummary : `Affliction drawn: ${afflictionName}.`,
        severity: "danger"
      }));

      if (affliction?.flipFacedownAfterResolve === true) {
        deltas.push(createResultDelta({
          id: `affliction-flipped:${source}`,
          type: "afflictionFlipped",
          label: "Affliction facedown",
          value: afflictionName,
          sign: "neutral",
          targetScope: "personal",
          targetSeatId: seatId,
          visibility: "ownerPrivate",
          source,
          reason: "Immediate Affliction resolved",
          publicText: "A private Affliction resolved and flipped facedown.",
          privateText: `${afflictionName} resolved and flipped facedown.`,
          severity: "neutral"
        }));
      }
    }

    if ((type === "USE_GEAR" || type === "USE_FOLLOWER") && ownerSeatId && seatId === ownerSeatId) {
      const rollModifier = entry.rollModifier as { label?: unknown; value?: unknown; stat?: unknown; mode?: unknown } | undefined;
      const label = typeof rollModifier?.label === "string"
        ? rollModifier.label
        : typeof entry.summary === "string"
          ? entry.summary.split(".")[0] ?? "Item used"
          : type === "USE_GEAR"
            ? "Item used"
            : "Follower used";
      const modifierValue = typeof rollModifier?.value === "number" ? rollModifier.value : undefined;
      const sourceLabel = type === "USE_GEAR" ? "Item used" : "Follower used";

      deltas.push(createResultDelta({
        id: `object-used:${source}`,
        type: "modifierApplied",
        label: sourceLabel,
        value: modifierValue ?? label,
        sign: modifierValue && modifierValue !== 0 ? "gain" : "neutral",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "ownerPrivate",
        source,
        reason: typeof entry.summary === "string" ? entry.summary : label,
        publicText: `${sourceLabel}.`,
        privateText: modifierValue
          ? `${label} accepted by server: ${modifierValue > 0 ? "+" : ""}${modifierValue}.`
          : `${label} accepted by server.`,
        severity: modifierValue && modifierValue > 0 ? "reward" : "neutral"
      }));
    }

    if (type === "SCENARIO_OBJECTIVE_COMPLETED" || type === "SCENARIO_VICTORY_ACHIEVED") {
      deltas.push(createResultDelta({
        id: `scenario-complete:${source}`,
        type: "scenarioProgress",
        label: type === "SCENARIO_VICTORY_ACHIEVED" ? "Scenario victory" : "Scenario complete",
        sign: "gain",
        targetScope: "scenario",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: "Objective threshold reached",
        publicText: typeof entry.summary === "string" ? entry.summary : "Scenario objective completed.",
        severity: "scenario"
      }));
    }

    if (type === "CONTRACT_PROGRESS_UPDATED") {
      deltas.push(createResultDelta({
        id: `contract-progress:${source}`,
        type: "contractProgress",
        label: "Contract",
        value: 1,
        sign: "gain",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "ownerPrivate",
        source,
        reason: "Private Contract progress advanced",
        publicText: "Private objective progress advanced.",
        privateText: typeof entry.summary === "string" ? entry.summary : "Contract progress advanced.",
        severity: "reward"
      }));
    }

    if (type === "COMPLETE_CONTRACT") {
      const playerName = state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? "An operative";
      deltas.push(createResultDelta({
        id: `contract-complete:${source}`,
        type: "contractCompleted",
        label: "Contract complete",
        sign: "gain",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: "Private Contract completed",
        publicText: `${playerName} completed a private Contract.`,
        privateText: typeof entry.summary === "string" ? entry.summary : "Contract completed.",
        severity: "reward"
      }));
    }

    if (type === "STAT_RAISED") {
      const stat = typeof entry.stat === "string" && entry.stat in CHALLENGE_LABELS ? entry.stat as Stat : null;
      const cost = typeof entry.cost === "number" ? entry.cost : 0;
      const nextValue = typeof entry.nextValue === "number" ? entry.nextValue : null;
      const statLabel = stat ? CHALLENGE_LABELS[stat] : "Stat";
      const playerName = seatId
        ? state.players.find((player) => player.seatId === seatId)?.character.name ?? "An operative"
        : "An operative";

      if (cost > 0) {
        deltas.push(createResultDelta({
          id: `stat-upgrade-trophy-cost:${source}`,
          type: "trophy",
          label: "Trophy",
          value: cost,
          sign: "loss",
          targetScope: "personal",
          targetSeatId: seatId,
          visibility: "public",
          source,
          reason: "Stat upgrade cost",
          publicText: `${playerName} spent ${cost} Troph${cost === 1 ? "y" : "ies"} on training.`,
          severity: "loss"
        }));
      }

      if (stat) {
        deltas.push(createResultDelta({
          id: `stat-upgrade-gain:${source}`,
          type: "statUpgrade",
          label: statLabel,
          value: 1,
          sign: "gain",
          targetScope: "personal",
          targetSeatId: seatId,
          visibility: "public",
          source,
          reason: "Permanent base stat upgrade",
          publicText: `${playerName} upgraded ${statLabel}${nextValue ? ` to ${nextValue}` : ""}.`,
          severity: "reward"
        }));
      }
    }

    if (type === "ESCALATION_ADVANCED") {
      const amount = typeof entry.amount === "number" ? entry.amount : 0;
      const guarded = entry.guardedReason === "oneBeforeCollapseGuard";
      deltas.push(createResultDelta({
        id: `escalation:${source}`,
        type: "scenarioPressure",
        label: "Global Escalation",
        value: Math.abs(amount),
        sign: amount >= 0 ? "gain" : "loss",
        targetScope: "scenario",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: typeof entry.reason === "string" ? entry.reason : "pressure",
        publicText: guarded
          ? "Gateblind Pulse cannot advance Global Escalation closer to collapse."
          : `Global Escalation ${amount >= 0 ? "+" : ""}${amount}: ${typeof entry.reason === "string" ? entry.reason : "pressure"}.`,
        severity: "scenario"
      }));
    }

    if (type === "RIVALRY_AGENDA_PROGRESS_TRIGGERED") {
      const amount = typeof entry.amount === "number" ? entry.amount : 1;
      const completed = entry.completed === true;

      if (completed) {
        deltas.push(createResultDelta({
          id: `agenda-complete-public:${source}`,
          type: "agendaCompleted",
          label: "Rivalry agenda",
          sign: "gain",
          targetScope: "privateAgenda",
          targetSeatId: seatId,
          visibility: "public",
          source,
          reason: "Rivalry completion",
          publicText: typeof entry.publicCompletionSummary === "string" ? entry.publicCompletionSummary : "A Rivalry Agenda was completed.",
          severity: "private"
        }));
      }

      if (ownerSeatId && seatId === ownerSeatId) {
        deltas.push(createResultDelta({
          id: `agenda-progress-private:${source}`,
          type: completed ? "agendaCompleted" : "agendaProgress",
          label: completed ? "Agenda complete" : "Agenda",
          value: completed ? undefined : amount,
          sign: "gain",
          targetScope: "privateAgenda",
          targetSeatId: seatId,
          visibility: "ownerPrivate",
          source,
          reason: typeof entry.triggerType === "string" ? entry.triggerType : "agenda trigger",
          publicText: completed ? "A Rivalry Agenda was completed." : "A Rivalry Agenda advanced.",
          privateText: typeof entry.summary === "string" ? entry.summary : completed ? "Your Rivalry Agenda completed." : `Your Rivalry Agenda advanced by ${amount}.`,
          severity: "private"
        }));
      }
    }
  });

  return deltas;
}

function dedupeResultDeltas(deltas: ResultDelta[]): ResultDelta[] {
  const seen = new Set<string>();
  const unique: ResultDelta[] = [];

  for (const delta of deltas) {
    const key = `${delta.type}:${delta.label}:${delta.value ?? ""}:${delta.targetSeatId ?? ""}:${delta.visibility}:${delta.publicText}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(delta);
  }

  return unique.slice(-10);
}

function buildPublicResultDeltas(state: GameState, shopEncounter: Record<string, unknown> | null): ResultDelta[] {
  return dedupeResultDeltas([
    ...getResolutionResultDeltas(state),
    ...getShopResultDeltas(shopEncounter),
    ...getEventLogResultDeltas(state).filter((delta) => delta.visibility === "public")
  ]);
}

function buildMatchProgressPresentation(
  state: GameState,
  publicDeltas: ResultDelta[]
): import("../client/shared/types.js").MatchProgressPresentation | null {
  const scenario = getScenarioDefinition(state.activeScenarioId);
  if (!scenario) return null;

  const pressure = buildScenarioPressureState(state, describeScenarioPressure(state) ?? "Scenario pressure is active.");
  if (!pressure) return null;

  const latestMatchDelta = [...publicDeltas].reverse().find(
    (delta) => delta.type === "scenarioProgress" || delta.type === "scenarioPressure"
  ) ?? null;
  const latestWinDelta = latestMatchDelta?.type === "scenarioProgress" ? latestMatchDelta : null;
  const latestLossDelta = latestMatchDelta?.type === "scenarioPressure" ? latestMatchDelta : null;
  const objectiveCurrent = scenario.id === BROKEN_CONCORDANCE_SCENARIO_ID
    ? state.scenarioConfrontation.progress.concordanceStages ?? 0
    : pressure.objectiveProgress.current;
  const objectiveRequired = getScenarioProgressThreshold(state.activeScenarioId, pressure.objectiveProgress.required);
  const signedChange = (delta: ResultDelta | null): number | null => {
    if (!delta || typeof delta.value !== "number") return delta ? 1 : null;
    return delta.sign === "loss" ? -Math.abs(delta.value) : Math.abs(delta.value);
  };
  const winRemaining = Math.max(0, objectiveRequired - objectiveCurrent);
  const lossRemaining = pressure.collapseTrack.failureAtMax
    ? Math.max(0, pressure.collapseTrack.max - pressure.collapseTrack.current)
    : null;
  const resultStatus = state.scenarioResult.status !== "unresolved"
    ? state.scenarioResult.status
    : state.status === "ended"
      ? state.winnerSeatId ? "victory" : "loss"
      : "unresolved";
  const finalStageActive = state.scenarioConfrontation.active && resultStatus === "unresolved";
  const thresholdWarning: import("../client/shared/types.js").MatchThresholdWarning | null = resultStatus !== "unresolved" || finalStageActive
    ? null
    : lossRemaining === 1
      ? {
          id: `loss-critical:${pressure.collapseTrack.current}:${pressure.collapseTrack.max}`,
          level: "critical",
          label: "Critical",
          detail: "Next Loss Pressure gain causes defeat.",
          remaining: 1,
          target: "loss"
        }
      : lossRemaining === 2
        ? {
            id: `loss-danger:${pressure.collapseTrack.current}:${pressure.collapseTrack.max}`,
            level: "danger",
            label: "Danger",
            detail: "2 pressure steps remain before defeat.",
            remaining: 2,
            target: "loss"
          }
        : winRemaining === 1
          ? {
              id: `win-near:${pressure.objectiveProgress.current}:${pressure.objectiveProgress.required}`,
              level: "near_victory",
              label: "Final Step",
              detail: "1 objective step remains before the final requirement is met.",
              remaining: 1,
              target: "win"
            }
          : null;

  const stageIndexMatch = state.scenarioConfrontation.stage?.match(/(?:stage-)?(\d+)/i);
  const stageIndex = stageIndexMatch ? Math.max(0, Number(stageIndexMatch[1]) - 1) : 0;
  const finalInstruction = scenario.confrontationSteps[stageIndex]
    ?? scenario.confrontationSteps[0]
    ?? scenario.finalGateRequirement;
  const finalStage = finalStageActive ? {
    id: `final-stage:${state.sequence}`,
    title: scenario.confrontationTitle,
    publicInstruction: finalInstruction,
    locationName: "Cinder Gate",
    stageLabel: state.scenarioConfrontation.stage
      ? state.scenarioConfrontation.stage.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : null,
    progressLabel: objectiveRequired > 0
      ? `${objectiveCurrent} / ${objectiveRequired}`
      : null
  } : null;

  const seatName = (seatId: string | null): string | null =>
    seatId ? state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? null : null;
  const resultId = `match-result:${state.scenarioResult.achievedAtSequence ?? state.sequence}`;
  const winnerName = seatName(state.scenarioResult.winningSeatId ?? state.winnerSeatId);
  const publicResult: import("../client/shared/types.js").PublicMatchResult | null = resultStatus === "unresolved" ? null : {
    id: resultId,
    outcome: resultStatus === "victory" ? "victory" : "defeat",
    title: resultStatus === "victory" ? "Mission Accomplished" : "Mission Failed",
    reason: state.lastOutcomeSummary?.summary
      ?? (resultStatus === "victory"
        ? `${scenario.name} reached its canonical victory condition.`
        : `${pressure.collapseTrack.name} reached ${pressure.collapseTrack.current} / ${pressure.collapseTrack.max}.`),
    missionName: scenario.name,
    modeLabel: state.gameMode === "nemesis_relay"
      ? "Nemesis Relay"
      : pressure.modeSpecific.label,
    winningDisplayNames: winnerName ? [winnerName] : [],
    operativeDisplayNames: state.turnOrder.flatMap((seatId) => {
      const name = seatName(seatId);
      return name ? [name] : [];
    }),
    finalWinProgress: {
      current: objectiveCurrent,
      required: objectiveRequired
    },
    finalLossPressure: pressure.collapseTrack.failureAtMax
      ? {
          current: pressure.collapseTrack.current,
          required: pressure.collapseTrack.max
        }
      : null,
    finalStageReached: state.scenarioConfrontation.active || state.scenarioResult.sourceType === "confrontation"
  };

  const stage: import("../client/shared/types.js").MatchProgressStage = publicResult
    ? publicResult.outcome
    : finalStageActive
      ? "final_stage"
      : thresholdWarning
        ? "threshold_warning"
        : "active";

  return {
    revision: state.sequence,
    mode: state.gameMode === "nemesis_relay"
      ? "nemesis_relay"
      : state.sessionMode === "single-player"
        ? "solo"
        : getEffectiveRivalryMode(state) === "co-op"
          ? "coop"
          : "rivalry",
    stage,
    winProgress: {
      current: objectiveCurrent,
      required: objectiveRequired,
      label: pressure.objectiveProgress.label,
      changeId: latestWinDelta?.id ?? null,
      change: signedChange(latestWinDelta),
      changeReason: latestWinDelta?.publicText ?? null
    },
    lossPressure: pressure.collapseTrack.failureAtMax
      ? {
          current: pressure.collapseTrack.current,
          required: pressure.collapseTrack.max,
          label: "Loss Pressure",
          changeId: latestLossDelta?.id ?? null,
          change: signedChange(latestLossDelta),
          changeReason: latestLossDelta?.publicText ?? null
        }
      : null,
    thresholdWarning,
    finalStage,
    publicResult,
    allowedCommands: state.status === "ended" ? ["return_to_lobby", "leave_room"] : []
  };
}

function buildPlayerResultDeltas(
  state: GameState,
  seatId: string,
  publicDeltas: ResultDelta[],
  shopEncounter: Record<string, unknown> | null
): ResultDelta[] {
  return dedupeResultDeltas([
    ...publicDeltas,
    ...getShopResultDeltas(shopEncounter).filter((delta) => delta.targetSeatId === seatId),
    ...getEventLogResultDeltas(state, seatId).filter((delta) => delta.visibility === "ownerPrivate" && delta.targetSeatId === seatId)
  ]).filter((delta) => delta.visibility === "public" || delta.targetSeatId === seatId);
}

function buildSoloRerollProjection(state: GameState, seatId: string): { available: boolean; charges: number } {
  const charges = state.sessionMode === "single-player" ? (state.soloRerollCharges?.[seatId] ?? 1) : 0;
  const activeResolution = state.activeResolution;
  const available =
    state.sessionMode === "single-player" &&
    charges > 0 &&
    state.phase === "resolution" &&
    state.currentEncounter?.cardType === "hazard" &&
    activeResolution?.playerId === seatId &&
    activeResolution.roll?.success === false &&
    (
      state.lastEdgeCardPlay?.seatId !== seatId ||
      state.lastEdgeCardPlay.mode !== "commit-value"
    ) &&
    ["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage);

  return {
    available,
    charges
  };
}

function isSoloRerollResolution(resolution: ActiveResolution | null | undefined): boolean {
  return Boolean(
    resolution?.stage === "roll_result"
    && resolution.card?.id
    && resolution.id.includes(`:${resolution.card.id}-solo-reroll:`)
  );
}

type CardRevealProjection = import("../client/shared/types.js").CardRevealPresentation;

function revealActorName(state: GameState, seatId: string | null): string {
  if (!seatId) return "The expedition";
  return state.seats.find((seat) => seat.seatId === seatId)?.displayName
    ?? state.players.find((player) => player.seatId === seatId)?.character.name
    ?? "An operative";
}

function revealEventId(entry: Record<string, unknown>, fallback: string): string {
  return typeof entry.createdAt === "string" && entry.createdAt.length > 0
    ? entry.createdAt
    : fallback;
}

function rewardGearReveal(
  state: GameState,
  seatId: string | null,
  gear: Partial<GearItem> & { id: string; name: string },
  eventId: string,
  sourceLabel: string,
  visibility: "public" | "owner"
): CardRevealProjection {
  const artifact = gear.tier === "artifact" || gear.id.startsWith("artifact-");
  const artCardId = artifact && !gear.id.startsWith("artifact-") ? `artifact-${gear.id}` : gear.id;
  const bonus = gear.statBonus
    ? `+${gear.statBonus.amount} ${CHALLENGE_LABELS[gear.statBonus.stat]}`
    : gear.activeText ?? gear.flavor ?? "Added to the operative inventory.";
  return {
    id: `card-reveal:gear:${eventId}:${gear.id}`,
    revision: state.sequence,
    kind: "reward",
    category: "equipment",
    title: gear.name,
    summary: bonus,
    sourceLabel,
    actorSeatId: seatId,
    actorDisplayName: revealActorName(state, seatId),
    visibility,
    artType: artifact ? "artifact" : "equipment",
    artCardId
  };
}

function rewardFollowerReveal(
  state: GameState,
  seatId: string | null,
  follower: Partial<Follower> & { id: string; name: string },
  eventId: string,
  sourceLabel: string,
  visibility: "public" | "owner"
): CardRevealProjection {
  const artCardId = follower.artCardId ?? follower.id;
  return {
    id: `card-reveal:follower:${eventId}:${follower.id}`,
    revision: state.sequence,
    kind: "reward",
    category: "follower",
    title: follower.name,
    summary: follower.text ?? follower.flavor ?? "Joined the operative's route.",
    sourceLabel,
    actorSeatId: seatId,
    actorDisplayName: revealActorName(state, seatId),
    visibility,
    artType: artCardId.startsWith("artifact-") ? "artifact" : "follower",
    artCardId
  };
}

function rewardRevealFromEffect(
  state: GameState,
  seatId: string | null,
  effect: unknown,
  eventId: string,
  sourceLabel: string,
  visibility: "public" | "owner"
): CardRevealProjection | null {
  if (!effect || typeof effect !== "object") return null;
  const entry = effect as Record<string, unknown>;
  if (entry.type === "sequence" && Array.isArray(entry.effects)) {
    for (let index = entry.effects.length - 1; index >= 0; index -= 1) {
      const reveal = rewardRevealFromEffect(state, seatId, entry.effects[index], `${eventId}:${index}`, sourceLabel, visibility);
      if (reveal) return reveal;
    }
  }
  if (entry.type === "gain_gear" && typeof entry.gearId === "string") {
    const authored = entry.gear && typeof entry.gear === "object"
      ? entry.gear as GearItem
      : PROJECTION_GEAR_CATALOG.get(entry.gearId);
    if (authored) return rewardGearReveal(state, seatId, authored, eventId, sourceLabel, visibility);
  }
  if (entry.type === "gain_follower" && typeof entry.followerId === "string") {
    const authored = entry.follower && typeof entry.follower === "object"
      ? entry.follower as Follower
      : PROJECTION_FOLLOWER_CATALOG.get(entry.followerId);
    if (authored) return rewardFollowerReveal(state, seatId, authored, eventId, sourceLabel, visibility);
  }
  return null;
}

function recentRewardReveal(
  state: GameState,
  ownerSeatId: string | null,
  visibility: "public" | "owner"
): CardRevealProjection | null {
  const recent = state.eventLog.slice(-12);
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const entry = recent[index] as Record<string, unknown>;
    const seatId = typeof entry.seatId === "string" ? entry.seatId : null;
    if (ownerSeatId && seatId !== ownerSeatId) continue;
    const eventId = revealEventId(entry, `${state.sequence}:${index}`);
    if (entry.type === "SHOP_PURCHASE_RESOLVED" && entry.gainedGear && typeof entry.gainedGear === "object") {
      return rewardGearReveal(state, seatId, entry.gainedGear as GearItem, eventId, "Equipment acquired", visibility);
    }
    if (entry.type === "SHOP_FOLLOWER_PURCHASE_RESOLVED" && entry.gainedFollower && typeof entry.gainedFollower === "object") {
      return rewardFollowerReveal(state, seatId, entry.gainedFollower as Follower, eventId, "Follower recruited", visibility);
    }
    if (entry.type === "MISSION_RELIC_CLAIMED" && entry.artifact && typeof entry.artifact === "object") {
      return rewardGearReveal(state, seatId, entry.artifact as GearItem, eventId, "Mission reward claimed", visibility);
    }
    if (entry.type === "COMPLETE_CONTRACT" && entry.contract && typeof entry.contract === "object") {
      const reward = (entry.contract as ContractCard).reward;
      for (let rewardIndex = reward.effects.length - 1; rewardIndex >= 0; rewardIndex -= 1) {
        const reveal = rewardRevealFromEffect(
          state,
          seatId,
          reward.effects[rewardIndex],
          `${eventId}:contract:${rewardIndex}`,
          "Contract reward",
          visibility
        );
        if (reveal) return reveal;
      }
    }
    if (entry.type === "SHOP_SERVICE_RESOLVED" && entry.result && typeof entry.result === "object") {
      const gainedGear = (entry.result as Record<string, unknown>).gainGear;
      if (gainedGear && typeof gainedGear === "object") {
        return rewardGearReveal(state, seatId, gainedGear as GearItem, eventId, "Service reward", visibility);
      }
    }
    const reveal = rewardRevealFromEffect(state, seatId, entry.effect, eventId, "Encounter reward", visibility);
    if (reveal) return reveal;
  }
  return null;
}

function buildPublicCardReveal(state: GameState): CardRevealProjection | null {
  const resolution = state.activeResolution;
  const category = resolution?.card?.type;
  if (
    resolution?.card
    && resolution.origin?.privacy !== "owner"
    && (category === "anomaly" || category === "artifact" || category === "escalation")
  ) {
    return {
      id: `card-reveal:public:${resolution.id}`,
      revision: state.sequence,
      kind: "draw",
      category,
      title: resolution.card.title,
      summary: resolution.outcome?.text ?? resolution.card.flavor ?? "The revealed card resolves immediately.",
      sourceLabel: `${category[0]!.toUpperCase()}${category.slice(1)} deck`,
      actorSeatId: resolution.playerId,
      actorDisplayName: revealActorName(state, resolution.playerId),
      visibility: "public",
      artType: category,
      artCardId: resolution.card.id,
      detail: resolution.outcome?.effects.join(" ") ?? null
    };
  }
  if (resolution || state.currentEncounter || state.pendingTileChallenge) return null;
  return recentRewardReveal(state, null, "public");
}

function buildPrivateCardReveal(state: GameState, seatId: string): CardRevealProjection | null {
  const resolution = state.activeResolution;
  if (
    resolution?.playerId === seatId
    && resolution.card?.type === "contract"
    && resolution.origin?.privacy === "owner"
  ) {
    return {
      id: `card-reveal:private:${resolution.id}`,
      revision: state.sequence,
      kind: "draw",
      category: "contract",
      title: resolution.card.title,
      summary: resolution.outcome?.text ?? resolution.card.flavor ?? "A private mission lead has been received.",
      sourceLabel: "Private Contract draw",
      actorSeatId: seatId,
      actorDisplayName: revealActorName(state, seatId),
      visibility: "owner",
      artType: "contract",
      artCardId: resolution.card.id,
      detail: resolution.outcome?.effects.join(" ") ?? null
    };
  }

  const recent = state.eventLog.slice(-12);
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const entry = recent[index] as Record<string, unknown>;
    if (entry.seatId !== seatId) continue;
    const eventId = revealEventId(entry, `${state.sequence}:${index}`);
    if (entry.type === "AFFLICTION_DRAWN") {
      const affliction = entry.affliction as AfflictionCard | undefined;
      if (!affliction) continue;
      return {
        id: `card-reveal:affliction:${eventId}:${affliction.id}`,
        revision: state.sequence,
        kind: "draw",
        category: "affliction",
        title: affliction.name,
        summary: affliction.rulesText,
        sourceLabel: "Affliction drawn",
        actorSeatId: seatId,
        actorDisplayName: revealActorName(state, seatId),
        visibility: "owner",
        artType: null,
        artCardId: null,
        detail: `${affliction.trigger} · Severity ${affliction.severity}`,
        die: typeof entry.die === "number" ? entry.die : null
      };
    }
    if (entry.type === "SCAR_SELECTED" && typeof entry.scarId === "string") {
      const scar = getScarCard(entry.scarId);
      if (!scar) continue;
      return {
        id: `card-reveal:scar:${eventId}:${scar.id}`,
        revision: state.sequence,
        kind: "draw",
        category: "scar",
        title: scar.title,
        summary: scar.burdenText,
        sourceLabel: "Scar gained",
        actorSeatId: seatId,
        actorDisplayName: revealActorName(state, seatId),
        visibility: "owner",
        artType: "scar",
        artCardId: scar.id,
        detail: `Adaptation: ${scar.adaptationText}`
      };
    }
    if (entry.type === "ACCEPT_CONTRACT") {
      const contract = entry.contract as ContractCard | undefined;
      if (!contract) continue;
      return {
        id: `card-reveal:contract:${eventId}:${contract.id}`,
        revision: state.sequence,
        kind: "draw",
        category: "contract",
        title: contract.name,
        summary: contract.text,
        sourceLabel: `${contract.factionGiver} Contract`,
        actorSeatId: seatId,
        actorDisplayName: revealActorName(state, seatId),
        visibility: "owner",
        artType: "contract",
        artCardId: contract.id,
        detail: contract.reward.displayText ?? contract.reward.completionText ?? null
      };
    }
  }
  if (resolution || state.currentEncounter || state.pendingTileChallenge) return null;
  return recentRewardReveal(state, seatId, "owner");
}

type RivalryProjectionMode = Extract<InteractionMode, "rivalry" | "ruthless">;

type RivalryAgendaRevealState = NonNullable<PlayerState["private"]["rivalryAgenda"]>["revealState"];

function getCurrentRoundNumber(state: GameState): number {
  return (
    state.eventLog.filter((entry) => {
      const event = entry as { type?: string } | undefined;
      return event?.type === "ROUND_COMPLETED";
    }).length + 1
  );
}

function getPrivateRivalryRevealState(player: PlayerState): RivalryAgendaRevealState {
  return player.private.rivalryAgenda?.revealState ?? "revealLocked";
}

function buildPrivateRivalryRevealProjection(player: PlayerState): Record<string, unknown> {
  const agendaState = player.private.rivalryAgenda;
  const revealState = getPrivateRivalryRevealState(player);

  switch (revealState) {
    case "revealAvailable":
      return {
        state: revealState,
        available: true,
        label: "Reveal Agenda",
        hint: "Ready to reveal a public agenda moment.",
        lockedReason: null
      };
    case "revealed":
      return {
        state: revealState,
        available: false,
        label: "Revealed",
        hint: agendaState?.publicRevealSummary ?? "This agenda has been revealed to the table.",
        publicTitle: agendaState?.publicRevealTitle ?? "Rivalry Agenda",
        publicSummary: agendaState?.publicRevealSummary ?? null,
        revealedAtRound: agendaState?.revealedAtRound ?? null
      };
    case "completed":
      return {
        state: revealState,
        available: false,
        label: "Completed",
        hint: agendaState?.privateCompletionSummary ?? "This agenda is complete.",
        publicTitle: agendaState?.publicRevealTitle ?? "Rivalry Agenda",
        publicSummary: agendaState?.publicCompletionSummary ?? agendaState?.publicRevealSummary ?? null,
        revealedAtRound: agendaState?.revealedAtRound ?? null
      };
    case "failed":
      return {
        state: revealState,
        available: false,
        label: "Failed",
        hint: "This agenda can no longer be completed.",
        publicTitle: agendaState?.publicRevealTitle ?? "Rivalry Agenda",
        publicSummary: agendaState?.publicRevealSummary ?? null,
        revealedAtRound: agendaState?.revealedAtRound ?? null
      };
    case "hidden":
      return {
        state: revealState,
        available: false,
        label: "Hidden",
        hint: "Keep this agenda private until a reveal window opens.",
        lockedReason: "Reveal window has not opened."
      };
    case "revealLocked":
    default:
      return {
        state: "revealLocked",
        available: false,
        label: "Reveal locked",
        hint: "Reveal is locked until this agenda's table moment becomes available.",
        lockedReason: "Reveal window has not opened."
      };
  }
}

function buildPublicRivalryAgendaReveal(state: GameState): Record<string, unknown> | null {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index] as Partial<RivalryAgendaRevealedAction> | undefined;

    if (event?.type !== "RIVALRY_AGENDA_REVEALED" || !event.seatId || !event.publicRevealSummary) {
      continue;
    }

    const player = state.players.find((entry) => entry.seatId === event.seatId);
    const displayName = state.seats.find((entry) => entry.seatId === event.seatId)?.displayName;

    return {
      seatId: event.seatId,
      playerName: displayName ?? player?.character.name ?? "An operative",
      title: event.publicRevealTitle ?? "Rivalry Agenda",
      summary: event.publicRevealSummary,
      revealedAtRound: event.revealedAtRound ?? null,
      createdAt: event.createdAt ?? null
    };
  }

  return null;
}

function buildPublicRivalryAgendaCompletion(state: GameState): Record<string, unknown> | null {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index] as Partial<RivalryAgendaProgressTriggeredAction> | undefined;

    if (event?.type !== "RIVALRY_AGENDA_PROGRESS_TRIGGERED" || !event.completed || !event.seatId || !event.publicCompletionSummary) {
      continue;
    }

    const player = state.players.find((entry) => entry.seatId === event.seatId);
    const displayName = state.seats.find((entry) => entry.seatId === event.seatId)?.displayName;

    return {
      seatId: event.seatId,
      playerName: displayName ?? player?.character.name ?? "An operative",
      title: event.publicCompletionTitle ?? "Rivalry Agenda",
      summary: event.publicCompletionSummary,
      pointsAwarded: event.pointsAwarded ?? 0,
      createdAt: event.createdAt ?? null
    };
  }

  return null;
}

function buildPrivateRivalryProjection(state: GameState, player: PlayerState | undefined): Record<string, unknown> | null {
  if (!player || state.sessionMode === "single-player") {
    return null;
  }

  const interactionMode = getEffectiveRivalryMode(state);

  if (interactionMode === "co-op") {
    return null;
  }

  const directive = getRivalryAgendaDefinition(state, player.seatId);

  if (!directive) {
    return null;
  }

  const progress = getRivalryAgendaProgressSnapshot(player, directive);
  const revealState = getPrivateRivalryRevealState(player);
  const objectiveVisible = revealState === "revealed" || revealState === "completed" || revealState === "failed";

  return {
    active: true,
    mode: interactionMode as RivalryProjectionMode,
    secrecy: "private",
    revealState,
    tableWarning: "Shown only on this phone. Keep it off the TV table.",
    ...(objectiveVisible ? {
      objective: {
        id: directive.id,
        title: directive.title,
        summary: directive.summary,
        progressLabel: progress.label,
        progress: progress.current,
        target: progress.required,
        stakes: directive.stakes
      },
      scoring: {
        pointsAwarded: progress.pointsAwarded,
        completedAtRound: progress.completedAtRound,
        completedBySeatId: progress.completedBySeatId,
        completionSummary: progress.completionSummary
      }
    } : {}),
    recentPrivateNotes: player.private.notes.slice(-3).reverse(),
    reveal: buildPrivateRivalryRevealProjection(player)
  };
}

function isSeatCharacterSelectedForProjection(state: GameState, seat: GameState["seats"][number], playerSeatIds: Set<string>): boolean {
  if (state.status !== "lobby") {
    return playerSeatIds.has(seat.seatId) && state.turnOrder.includes(seat.seatId);
  }

  if (typeof seat.characterSelected === "boolean") {
    return seat.characterSelected;
  }

  return Boolean(seat.characterId) || playerSeatIds.has(seat.seatId);
}

function summarizeTileChallengeEffect(effect: EncounterEffect): string {
  switch (effect.type) {
    case "gain_note": return effect.text;
    case "gain_scar": return "Gain the authored Scar.";
    case "take_wound": return `Suffer ${effect.amount} Wound${effect.amount === 1 ? "" : "s"}.`;
    case "heal_wound": return `Heal ${effect.amount} Wound${effect.amount === 1 ? "" : "s"}.`;
    case "gain_salvage": return `Gain ${effect.amount} Salvage.`;
    case "lose_salvage": return `Lose up to ${effect.amount} Salvage (minimum 0).`;
    case "sequence": return effect.effects.map(summarizeTileChallengeEffect).join(" ");
    default: return "Resolve the authored challenge effect.";
  }
}

function projectActiveResolutionForViewer(state: GameState, viewerSeatId: string | null): ActiveResolution | null {
  const resolution = state.activeResolution ?? null;

  if (!resolution || resolution.origin?.privacy !== "owner" || resolution.playerId === viewerSeatId) {
    return resolution;
  }

  return {
    ...resolution,
    card: resolution.card
      ? {
          id: "private-card",
          title: "Private Contract Lead",
          type: "contract",
          flavor: "The operative is reviewing a private Contract lead.",
          artType: "contract"
        }
      : undefined,
    outcome: resolution.outcome
      ? {
          ...resolution.outcome,
          title: "Private choice pending",
          text: "The operative is resolving a private Contract lead.",
          effects: []
        }
      : undefined
  };
}

function getPendingFailureEffectChoices(state: GameState): Array<{ effectId: string; summary: string }> {
  const reaction = state.pendingStaticIntercessionReaction;
  if (!reaction || reaction.selectedEffectId !== null) return [];
  return reaction.suppressibleEffects.map(({ effectId, effect }) => ({ effectId, summary: summarizeTileChallengeEffect(effect) }));
}

function getProjectedPlayerName(state: GameState, seatId: string): string {
  return state.seats.find((seat) => seat.seatId === seatId)?.displayName ??
    state.players.find((player) => player.seatId === seatId)?.character.name ??
    seatId;
}

function classifyBattleModifier(label: string): "permanent" | "equipment" | "status" | "ability" | "assistance" | "scenario" | "other" {
  const normalized = label.toLowerCase();
  if (normalized.includes("assisted")) return "assistance";
  if (normalized.includes("equipment") || normalized.includes("weapon") || normalized.includes("armor") || normalized.includes("utility")) return "equipment";
  if (normalized.includes("permanent")) return "permanent";
  if (normalized.includes("scenario")) return "scenario";
  if (normalized.includes("affliction") || normalized.includes("scar") || normalized.includes("temporary")) return "status";
  if (normalized.includes("vow") || normalized.includes("charge") || normalized.includes("edge") || normalized.includes("breaker") || normalized.includes("instinct")) return "ability";
  return "other";
}

function summarizeEnemyBonusRewards(effect: unknown): string[] {
  if (!effect || typeof effect !== "object") return [];
  const candidate = effect as { type?: string; effects?: unknown[] };
  if (candidate.type === "sequence") {
    return (candidate.effects ?? []).flatMap((entry) => summarizeEnemyBonusRewards(entry));
  }
  if (candidate.type === "gain_note" || candidate.type === "gain_trophy") return [];
  const summary = summarizePublicHandoffEffect(effect);
  return summary ? [summary] : [];
}

function summarizeEnemyVictoryReward(encounter: ThreatCard | null | undefined): string | null {
  if (!encounter || encounter.cardType !== "enemy") return null;
  const rewards = encounter.trophyValue > 0
    ? [`${encounter.trophyValue} ${encounter.trophyValue === 1 ? "Trophy" : "Trophies"}`]
    : [];
  rewards.push(...summarizeEnemyBonusRewards(encounter.defeatReward));
  if (encounter.defeatEffectKey === "threat_defeat_gain_salvage") {
    rewards.push("1 Salvage gained");
  }
  return [...new Set(rewards)].join(" / ") || null;
}

function buildBattlePresentation(state: GameState, viewerSeatId: string | null): Record<string, unknown> | null {
  const resolution = state.activeResolution;
  const encounter = state.currentEncounter;
  const pendingEnemyRoll = state.pendingEnemyRoll;
  const actorSeatId = resolution?.playerId ?? pendingEnemyRoll?.fighterSeatId ?? state.pendingTileChallenge?.seatId ?? state.turnOrder[state.activeSeatIndex] ?? null;
  const actor = actorSeatId ? state.players.find((player) => player.seatId === actorSeatId) ?? null : null;
  const battle = resolution?.battle;
  const isBattle = encounter?.cardType === "enemy" || resolution?.card?.type === "enemy" || Boolean(pendingEnemyRoll);
  const enemyEncounter = encounter?.cardType === "enemy"
    ? encounter
    : resolution?.card?.type === "enemy"
      ? PROJECTION_THREAT_CATALOG.get(resolution.card.id) ?? null
      : null;

  if (!actorSeatId || !actor || (!battle && !encounter && !pendingEnemyRoll)) return null;

  const stat = battle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? "grit";
  const allSources = battle?.modifiers ?? [];
  const baseSource = allSources.find((source) => source.label.toLowerCase().startsWith("base ")) ?? null;
  const enemyBaseSource = allSources.find((source) => source.label.toLowerCase() === "enemy") ?? null;
  const authoredOppositionSources = allSources.filter((source) => source.label === CW_ENEMY_MODIFIER_LABEL);
  const pendingNamedEnemyModifier = isBattle && !authoredOppositionSources.length
    ? getNamedPlayerEnemyModifier({ displayName: state.seats.find((seat) => seat.seatId === actorSeatId)?.displayName })
    : 0;
  const oppositionSources = [
    ...authoredOppositionSources,
    ...(pendingNamedEnemyModifier > 0 ? [{ label: CW_ENEMY_MODIFIER_LABEL, value: pendingNamedEnemyModifier }] : [])
  ];
  const permanentUpgrade = actor.character.statUpgrades?.[stat] ?? 0;
  const baseValue = baseSource?.value ?? Math.max(0, actor.character.stats[stat] - permanentUpgrade);
  const publicSources = allSources.filter((source) => source !== baseSource && source !== enemyBaseSource && source.label !== CW_ENEMY_MODIFIER_LABEL);
  const expectedModifierTotal = resolution?.roll?.modifierTotal ?? null;
  const representedModifierTotal = baseValue + publicSources.reduce((sum, source) => sum + source.value, 0);
  const reconciliation = expectedModifierTotal === null ? 0 : expectedModifierTotal - representedModifierTotal;
  const operativeModifiers = [
    ...publicSources.map((source) => ({ label: source.label, value: source.value, kind: classifyBattleModifier(source.label) })),
    ...(reconciliation !== 0 ? [{ label: "Other authoritative modifiers", value: reconciliation, kind: "other" as const }] : [])
  ];
  const resultStage = Boolean(
    resolution &&
    ["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)
  );
  const latestSummary = state.lastOutcomeSummary?.seatId === actorSeatId ? state.lastOutcomeSummary : null;
  const summaryMatchesResolution = Boolean(
    latestSummary &&
    resolution?.card &&
    (
      latestSummary.encounterCardId === resolution.card.id ||
      (resolution.source === "movement" && latestSummary.movedToSectorId === resolution.card.id)
    )
  );
  const outcomeSummary = resultStage && summaryMatchesResolution ? latestSummary : null;
  const operativeDice = resultStage
    ? resolution?.roll?.dice ?? [outcomeSummary?.die1, outcomeSummary?.die2].filter((die): die is number => typeof die === "number")
    : [];
  let previousOperativeDice: number[] | undefined;
  if (resultStage && resolution?.card?.id && resolution?.playerId) {
    let rerollIndex = -1;
    for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
      const event = state.eventLog[index] as { type?: string; seatId?: string; cardId?: string; roll?: { faces?: number[] } };
      if (event.type === "SOLO_REROLL_RESOLVED" && event.seatId === resolution.playerId && event.cardId === resolution.card.id) {
        rerollIndex = index;
        break;
      }
    }
    if (rerollIndex >= 0) {
      for (let index = rerollIndex - 1; index >= 0; index -= 1) {
        const event = state.eventLog[index] as { type?: string; seatId?: string; cardId?: string; roll?: { faces?: number[] } };
        if (["CHECK_ROLLED", "SOLO_REROLL_RESOLVED"].includes(event.type ?? "") && event.seatId === resolution.playerId && event.cardId === resolution.card.id) {
          previousOperativeDice = event.roll?.faces ? [...event.roll.faces] : undefined;
          break;
        }
      }
    }
  }
  const opponentDice = resultStage
    ? [outcomeSummary?.enemyDie1, outcomeSummary?.enemyDie2].filter((die): die is number => typeof die === "number")
    : [];
  const operativeDiceTotal = operativeDice.length ? operativeDice.reduce((sum, die) => sum + die, 0) : null;
  const opponentDiceTotal = opponentDice.length ? opponentDice.reduce((sum, die) => sum + die, 0) : null;
  const operativeTotal = resultStage ? resolution?.roll?.finalTotal ?? outcomeSummary?.checkTotal ?? null : null;
  const authoredOpponentValue = battle?.difficulty ?? encounter?.difficulty ?? null;
  const opponentTotal = resultStage
    ? outcomeSummary?.enemyTotal ?? resolution?.roll?.target ?? authoredOpponentValue
    : null;
  const oppositionModifierTotal = oppositionSources.reduce((sum, source) => sum + source.value, 0);
  const opponentBaseValue = enemyBaseSource?.value
    ?? (isBattle
      ? (outcomeSummary?.enemyBonus ?? battle?.difficulty ?? encounter?.difficulty ?? null) !== null
        ? (outcomeSummary?.enemyBonus ?? battle?.difficulty ?? encounter?.difficulty ?? 0) - oppositionModifierTotal
        : null
      : authoredOpponentValue !== null ? authoredOpponentValue - oppositionModifierTotal : null);
  const success = resultStage ? resolution?.roll?.success ?? outcomeSummary?.success ?? null : null;
  const outcome = success === null
    ? operativeTotal !== null && opponentTotal !== null && operativeTotal === opponentTotal ? "draw" : null
    : success ? "success" : "failure";
  const privateDecisionOwner = state.pendingEncounterDecision?.seatId
    ?? state.pendingAfflictionResolution?.ownerSeatId
    ?? state.pendingAfflictionReaction?.ownerSeatId
    ?? state.pendingMemoryTaxChoice?.ownerSeatId
    ?? state.pendingEquipmentSuppressionChoice?.ownerSeatId
    ?? state.pendingGearEquipChoice?.ownerSeatId
    ?? state.pendingForcedDestinationChoice?.ownerSeatId
    ?? state.pendingScarChoice?.ownerSeatId
    ?? state.pendingScarConsequence?.seatId
    ?? null;
  const reactionOwner = state.pendingFailureReaction?.seatId ?? state.pendingStaticIntercessionReaction?.seatId ?? null;
  const privateDecision = privateDecisionOwner === actorSeatId || reactionOwner === actorSeatId;
  const isOwner = viewerSeatId === actorSeatId;
  const stage = privateDecisionOwner === actorSeatId
    ? "consequence_required"
    : reactionOwner === actorSeatId
      ? isOwner ? "reaction_available" : "choice_required"
      : pendingEnemyRoll
        ? "rolling"
        : resolution?.stage === "card_reveal"
          ? "encounter_intro"
          : resolution?.stage === "battle_setup"
            ? "battle_ready"
            : resolution?.stage === "dice_roll"
              ? "rolling"
              : resolution?.roll
                ? "result"
                : "resolving";
  const encounterName = battle?.enemyName ?? resolution?.card?.title ?? (encounter?.cardType === "enemy" ? encounter.enemyName : encounter?.title) ?? pendingEnemyRoll?.encounterTitle ?? "Encounter";
  const publicAction = privateDecision
    ? reactionOwner === actorSeatId ? "consider a battle effect" : "resolve a private consequence"
    : stage === "battle_ready" ? `roll ${CHALLENGE_LABELS[stat]}`
      : stage === "rolling" || stage === "resolving" ? "resolve the current roll"
        : "review the result and continue";
  const effects = resultStage ? resolution?.outcome?.effects ?? [] : [];
  const victoryReward = summarizeEnemyVictoryReward(enemyEncounter);
  const rewardSummary = success === true && victoryReward
    ? victoryReward
    : effects.find((effect) => /\bgain\b|\btroph|\breward|\bsalvage|\bequipment|\bfollower/i.test(effect)) ?? null;
  const failureStakes = isBattle && enemyEncounter?.cardType === "enemy"
    ? [
        summarizePublicHandoffEffect(enemyEncounter.woundOnLoss),
        threatBlocksRerolls(enemyEncounter) ? "Rerolls blocked" : null
      ].filter((entry): entry is string => Boolean(entry)).join(" / ") || null
    : null;

  return {
    id: resolution?.id ?? `encounter:${actorSeatId}:${encounterName}`,
    revision: state.sequence,
    stage,
    actorSeatId,
    actorDisplayName: getProjectedPlayerName(state, actorSeatId),
    encounter: {
      name: encounterName,
      category: isBattle ? "Battle" : state.pendingTileChallenge?.challengeType === "anomaly" ? "Anomaly" : encounter?.cardType === "hazard" ? "Hazard" : "Challenge",
      imageKey: resolution?.card?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterCardId ?? null,
      publicSummary: resolution?.card?.flavor ?? encounter?.flavor ?? null,
      victoryReward,
      failureStakes
    },
    test: { stat, label: CHALLENGE_LABELS[stat], opposed: isBattle },
    operative: {
      name: getProjectedPlayerName(state, actorSeatId),
      secondaryName: actor.character.name,
      imageKey: actor.character.id,
      baseValue,
      modifiers: operativeModifiers,
      rawDice: operativeDice,
      diceCount: operativeDice.length || 2,
      previousRawDice: previousOperativeDice,
      rerolledDiceIndices: previousOperativeDice
        ? operativeDice.flatMap((value, index) => previousOperativeDice?.[index] !== value ? [index] : [])
        : undefined,
      diceTotal: operativeDiceTotal,
      finalTotal: operativeTotal
    },
    opponent: {
      name: encounterName,
      secondaryName: isBattle ? "Opposition" : "Difficulty",
      imageKey: resolution?.card?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterCardId ?? null,
      baseValue: opponentBaseValue,
      modifiers: oppositionSources.map((source) => ({ label: source.label, value: source.value, kind: "named-rule" })),
      rawDice: opponentDice,
      diceCount: opponentDice.length,
      diceTotal: opponentDiceTotal,
      finalTotal: opponentTotal
    },
    outcome,
    publicConsequence: resultStage ? resolution?.outcome?.text ?? outcomeSummary?.summary ?? null : null,
    publicRewardSummary: rewardSummary,
    waiting: {
      actorDisplayName: getProjectedPlayerName(state, actorSeatId),
      publicAction,
      privateDecision
    },
    restored: false
  };
}

function buildCooperativeAssistanceProjection(state: GameState, viewerSeatId?: string): Record<string, unknown> | null {
  const request = state.cooperativeAssistance;
  if (!request) return null;
  const requestedHelpers = request.requestedSeatIds.map((seatId) => {
    const helper = state.players.find((player) => player.seatId === seatId);
    const accepted = request.acceptedSeatIds.includes(seatId);
    const declined = request.declinedSeatIds.includes(seatId);
    const locked = request.lockedContributions.find((entry) => entry.seatId === seatId);
    return {
      seatId,
      playerName: getProjectedPlayerName(state, seatId),
      characterName: helper?.character.name ?? "Operative",
      response: accepted ? "accepted" : declined ? "declined" : "pending",
      ...((accepted || locked) && helper ? { contribution: locked?.value ?? getIntrinsicBaseStat(helper, request.testedStat) } : {})
    };
  });
  const viewerRole = viewerSeatId
    ? request.activeSeatId === viewerSeatId
      ? "active"
      : request.requestedSeatIds.includes(viewerSeatId)
        ? "requested"
        : "observer"
    : undefined;
  const viewerHelper = viewerSeatId ? state.players.find((player) => player.seatId === viewerSeatId) : null;
  return {
    id: request.id,
    sourceKind: request.sourceKind,
    sourceId: request.sourceId,
    sourceTitle: request.sourceTitle,
    testedStat: request.testedStat,
    activeSeatId: request.activeSeatId,
    activePlayerName: getProjectedPlayerName(state, request.activeSeatId),
    status: request.status,
    requestedHelpers,
    acceptedTotal: request.lockedContributions.length
      ? sumCooperativeContributions(request.lockedContributions)
      : requestedHelpers.reduce((sum, helper) => sum + (helper.response === "accepted" ? helper.contribution ?? 0 : 0), 0),
    ...(viewerRole ? { viewerRole } : {}),
    ...(viewerRole === "active" ? { eligibleHelperSeatIds: getEligibleCooperativeHelperSeatIds(state, request.activeSeatId, request.testedStat) } : {}),
    ...(viewerRole === "requested" && viewerHelper ? { viewerContribution: getIntrinsicBaseStat(viewerHelper, request.testedStat) } : {})
  };
}

function buildCooperativeAssistanceEligibility(state: GameState, seatId: string): Record<string, unknown> | null {
  if (!isCooperativeAssistanceMode(state) || state.cooperativeAssistance || state.turnOrder[state.activeSeatIndex] !== seatId) return null;
  const resolution = state.activeResolution;
  if (!resolution || resolution.stage !== "battle_setup" || !resolution.battle) return null;
  const sourceId = state.pendingCooperativeTest?.sourceId ?? state.currentEncounter?.id ?? resolution.card?.id;
  if (!sourceId) return null;
  return {
    sourceId,
    sourceTitle: state.pendingCooperativeTest?.sourceTitle ?? state.currentEncounter?.title ?? resolution.card?.title ?? "Skill test",
    testedStat: resolution.battle.stat,
    helpers: getEligibleCooperativeHelperSeatIds(state, seatId, resolution.battle.stat).map((helperSeatId) => {
      const helper = state.players.find((player) => player.seatId === helperSeatId)!;
      return {
        seatId: helperSeatId,
        playerName: getProjectedPlayerName(state, helperSeatId),
        characterName: helper.character.name,
        contribution: getIntrinsicBaseStat(helper, resolution.battle!.stat)
      };
    })
  };
}

function buildCinderWattleAbilityProjection(state: GameState, seatId: string): Record<string, unknown> | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (player?.character.id !== "cinder-wattle") return null;

  let usedThisRound = false;
  let prepared = false;
  let rollResolvedSinceAbility = false;
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index] as { type?: string; seatId?: string; abilityId?: string } | undefined;
    if (event?.type === "ROUND_COMPLETED") break;
    if (
      event?.seatId === seatId &&
      [
        "COMBAT_RESOLVED",
        "CHECK_ROLLED",
        "COOPERATIVE_ASSISTED_ROLL_RESOLVED",
        "SPACE_TEXT_RESOLVED",
        "SCENARIO_CONFRONTATION_RESOLVED"
      ].includes(event.type ?? "")
    ) {
      rollResolvedSinceAbility = true;
    }
    if (event?.type === "ABILITY_TRIGGERED" && event.seatId === seatId && event.abilityId === "scrap-crowned-instinct") {
      usedThisRound = true;
      prepared = !rollResolvedSinceAbility;
      break;
    }
  }

  const pending = state.pendingCooperativeTest?.activeSeatId === seatId ? state.pendingCooperativeTest : null;
  const resolution = state.activeResolution?.playerId === seatId && state.activeResolution.stage === "battle_setup"
    ? state.activeResolution
    : null;
  const stat = pending?.stat ?? resolution?.battle?.stat ?? null;
  const sourceTitle = pending?.sourceTitle ?? state.currentEncounter?.title ?? resolution?.card?.title ?? null;
  const active = state.status === "active" && state.turnOrder[state.activeSeatIndex] === seatId;
  const available = active && Boolean(stat) && !usedThisRound && !state.pendingEnemyRoll;
  const disabledReason = prepared
    ? `Prepared: +1 ${stat ? CHALLENGE_LABELS[stat] : "skill"} applies to this roll.`
    : usedThisRound
      ? "Used this round. Resets after the round ends."
      : !active
        ? "Available on CW's active turn."
        : !stat
          ? "Available after an eligible test is known and before dice are revealed."
          : null;

  return {
    abilityId: "scrap-crowned-instinct",
    name: "Scrap-Crowned Instinct",
    stat,
    sourceTitle,
    value: 1,
    available,
    usedThisRound,
    prepared,
    disabledReason
  };
}

interface RequiredActionProjectionContext {
  movementActive: boolean;
  movementSelected: boolean;
  tierTransitionAvailable: boolean;
  shopActive: boolean;
}

interface RequiredActionDescriptor {
  id: string;
  kind: "lobby" | "movement" | "battle" | "test" | "shop" | "assistance" | "mission" | "scar" | "payment" | "equipment" | "forced-destination" | "consequence" | "action" | "result";
  actorSeatId: string | null;
  requiredTab: "move" | "battle" | "shop" | "action" | null;
  label: string;
  ownerDetail: string;
  publicAction: string;
  transitionStage?: import("../client/shared/types.js").RequiredActionTransitionStage;
  allowedCommand?: import("../client/shared/types.js").RequiredActionCommand;
  sourceId?: string;
  canAct?: boolean;
}

function summarizePublicHandoffEffect(effect: unknown): string | null {
  if (!effect || typeof effect !== "object") return null;
  const candidate = effect as { type?: string; amount?: number; effects?: unknown[] };
  if (candidate.type === "sequence") {
    const summaries = (candidate.effects ?? [])
      .map((entry) => summarizePublicHandoffEffect(entry))
      .filter((entry): entry is string => Boolean(entry));
    return summaries.slice(0, 2).join(" · ") || null;
  }
  const amount = typeof candidate.amount === "number" ? Math.abs(candidate.amount) : null;
  switch (candidate.type) {
    case "take_wound": return `${amount ?? 1} Wound suffered`;
    case "heal_wound": return `${amount ?? 1} Wound healed`;
    case "gain_salvage": return `${amount ?? 1} Salvage gained`;
    case "lose_salvage": return `${amount ?? 1} Salvage lost`;
    case "gain_trophy": return `${amount ?? 1} Trophy gained`;
    case "gain_scar":
    case "gain_scar_choice": return "Scar gained";
    case "gain_gear": return "Gear acquired";
    case "gain_follower": return "Follower joined";
    case "draw_artifact": return "Artifact recovered";
    case "draw_affliction": return "Affliction drawn";
    case "advance_scenario": return "Mission progress advanced";
    case "advance_escalation": return `${amount ?? 1} Global Escalation added`;
    case "return_threat_to_space": return "Threat remains on this space";
    case "equipment_suppression": return "One equipped item is suppressed for the next battle";
    case "forcedDisplacement":
    case "ownerSelectedForcedDisplacement": return "Forced displacement follows";
    default: return null;
  }
}

function buildPublicTurnHandoffSummary(
  state: GameState,
  latestTurnCompleted: { seatId?: string } | undefined
): string[] {
  if (!latestTurnCompleted?.seatId) return [];
  const latestIndex = state.eventLog.lastIndexOf(latestTurnCompleted as never);
  if (latestIndex < 0) return [];
  let previousBoundary = -1;
  for (let index = latestIndex - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index] as { type?: string } | undefined;
    if (entry?.type === "TURN_COMPLETED") {
      previousBoundary = index;
      break;
    }
  }

  const turnEvents = state.eventLog
    .slice(previousBoundary + 1, latestIndex)
    .map((entry) => entry as Record<string, unknown>);
  const ownEvents = turnEvents.filter((entry) => entry.seatId === latestTurnCompleted.seatId);
  const movement = [...ownEvents].reverse().find((entry) =>
    entry.type === "MOVEMENT_RESOLVED" || entry.type === "MOVED"
  );
  const result = [...ownEvents].reverse().find((entry) =>
    entry.type === "COMBAT_RESOLVED" ||
    entry.type === "CHECK_ROLLED" ||
    entry.type === "NEMESIS_COMBAT_RESOLVED" ||
    (entry.type === "SPACE_TEXT_RESOLVED" && typeof entry.success === "boolean") ||
    entry.type === "MOVEMENT_RESOLVED"
  );
  const applied = [...ownEvents].reverse().find((entry) => entry.type === "RESOLUTION_APPLIED");
  const pressure = [...turnEvents].reverse().find((entry) => entry.type === "ESCALATION_ADVANCED");
  const entries: string[] = [];

  if (movement && typeof movement.toSectorId === "string") {
    entries.push(`Moved to ${getBoardSpace(movement.toSectorId)?.name ?? "the selected sector"}`);
  }

  if (result) {
    const success = result.success === true;
    const total = typeof result.total === "number"
      ? result.total
      : typeof result.attackerTotal === "number"
        ? result.attackerTotal
        : null;
    const opposition = typeof result.enemyTotal === "number"
      ? result.enemyTotal
      : typeof result.nemesisTotal === "number"
        ? result.nemesisTotal
        : typeof result.difficulty === "number"
          ? result.difficulty
          : null;
    const resultKind = result.type === "COMBAT_RESOLVED" || result.type === "NEMESIS_COMBAT_RESOLVED"
      ? "Battle"
      : result.type === "MOVEMENT_RESOLVED"
        ? "Approach"
        : "Challenge";
    entries.push(`${resultKind} ${success ? "cleared" : "failed"}${total !== null && opposition !== null ? ` · ${total}/${opposition}` : ""}`);
  }

  const consequence = summarizePublicHandoffEffect(applied?.effect);
  if (consequence) entries.push(consequence);

  if (pressure && typeof pressure.amount === "number" && pressure.amount !== 0) {
    entries.push(`Global Escalation ${pressure.amount > 0 ? "+" : ""}${pressure.amount}`);
  }

  return entries.slice(0, 4);
}

/**
 * Builds the single server-owned answer to "who acts, what must they do, and where?".
 * Private clients receive owner wording only when they own the action. Everyone else,
 * including the TV, receives the same public-safe waiting description.
 */
export function buildRequiredActionProjection(
  state: GameState,
  viewerSeatId: string | null,
  context: RequiredActionProjectionContext
) {
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const opposedResolutionActive =
    state.activeResolution?.card?.type === "enemy"
    || state.currentEncounter?.cardType === "enemy"
    || Boolean(state.pendingEnemyRoll);
  const seatName = (seatId: string | null): string | null =>
    seatId ? state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? "Operative" : null;

  const latestTurnCompleted = [...state.eventLog].reverse().find((entry) =>
    typeof entry === "object" && entry !== null && "type" in entry && (entry as { type?: string }).type === "TURN_COMPLETED"
  ) as { seatId?: string; createdAt?: string } | undefined;
  const currentActiveSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const completedSeatIndex = latestTurnCompleted?.seatId ? state.turnOrder.indexOf(latestTurnCompleted.seatId) : -1;
  const currentSeatIndex = currentActiveSeatId ? state.turnOrder.indexOf(currentActiveSeatId) : -1;
  const handoffEligible = state.phase === "navigation"
    && Boolean(currentActiveSeatId)
    && state.movementRolls?.[currentActiveSeatId ?? ""] === undefined
    && state.eventLog.slice(-8).some((entry) => entry === latestTurnCompleted);
  const handoffSummaryEntries = buildPublicTurnHandoffSummary(state, latestTurnCompleted);
  const handoff = handoffEligible && latestTurnCompleted?.seatId && latestTurnCompleted.createdAt
    ? {
        id: `turn-handoff:${latestTurnCompleted.createdAt}:${latestTurnCompleted.seatId}:${currentActiveSeatId ?? "none"}`,
        fromSeatId: latestTurnCompleted.seatId,
        fromDisplayName: seatName(latestTurnCompleted.seatId) ?? "Operative",
        toSeatId: currentActiveSeatId,
        toDisplayName: seatName(currentActiveSeatId),
        roundWrapped: completedSeatIndex >= 0 && currentSeatIndex >= 0 && currentSeatIndex <= completedSeatIndex,
        ...(handoffSummaryEntries.length > 0 ? { summaryEntries: handoffSummaryEntries } : {})
      }
    : undefined;

  const present = (descriptor: RequiredActionDescriptor) => {
    const actorDisplayName = seatName(descriptor.actorSeatId);
    const ownsAction = Boolean(viewerSeatId && descriptor.actorSeatId === viewerSeatId);
    const publicDetail = descriptor.actorSeatId
      ? `Waiting for ${actorDisplayName ?? "the operative"} to ${descriptor.publicAction}.`
      : descriptor.publicAction;

    const transitionStage = descriptor.transitionStage ?? (descriptor.actorSeatId && !ownsAction ? "required-action" : "turn-actions");
    const activeInstruction = ownsAction ? descriptor.ownerDetail : publicDetail;
    const waitingInstruction = publicDetail;
    return {
      id: descriptor.id,
      kind: descriptor.kind,
      actorSeatId: descriptor.actorSeatId,
      actorDisplayName,
      requiredTab: ownsAction ? descriptor.requiredTab : null,
      label: ownsAction ? descriptor.label : descriptor.actorSeatId ? `Waiting for ${actorDisplayName ?? "operative"}` : descriptor.label,
      detail: ownsAction ? descriptor.ownerDetail : publicDetail,
      canAct: ownsAction && descriptor.canAct !== false,
      waiting: Boolean(descriptor.actorSeatId && !ownsAction),
      privacy: ownsAction ? "owner" as const : "public" as const,
      transitionStage,
      allowedCommand: descriptor.allowedCommand ?? null,
      inputEnabled: ownsAction && descriptor.canAct !== false,
      activeInstruction,
      waitingInstruction,
      hostInstruction: publicDetail,
      revision: state.sequence,
      ...(handoff ? { handoff } : {}),
      ...(descriptor.sourceId ? { sourceId: descriptor.sourceId } : {})
    };
  };

  if (state.status === "ended") {
    return present({
      id: `result:${state.scenarioResult.achievedAtSequence ?? state.sequence}`,
      kind: "result",
      actorSeatId: null,
      requiredTab: null,
      label: state.scenarioResult.status === "victory" ? "Victory" : "Session complete",
      ownerDetail: "Review the final result.",
      publicAction: "Review the final result.",
      transitionStage: "game-over"
    });
  }

  if (state.status !== "active") {
    const setup = buildSetupProjection(state);
    return present({
      id: setup.id,
      kind: "lobby",
      actorSeatId: setup.actorSeatId,
      requiredTab: null,
      label: setup.title,
      ownerDetail: setup.activeInstruction,
      publicAction: setup.publicInstruction.replace(/\.$/, "").toLowerCase(),
      transitionStage: "setup"
    });
  }

  if (state.pendingAfflictionResolution?.status === "awaitingStatChoice") {
    return present({
      id: `affliction-stat:${state.pendingAfflictionResolution.id}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingAfflictionResolution.ownerSeatId,
      requiredTab: "action",
      label: "Choose Runaway Growth stat",
      ownerDetail: "Choose the stat that gains +1 before the Affliction draw resolves.",
      publicAction: "resolve a private Affliction choice",
      sourceId: "runaway-growth",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingAfflictionReaction) {
    return present({
      id: `affliction-reaction:${state.pendingAfflictionReaction.id}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingAfflictionReaction.ownerSeatId,
      requiredTab: state.pendingAfflictionReaction.kind === "arrivalWound" || !opposedResolutionActive ? "action" : "battle",
      label: state.pendingAfflictionReaction.kind === "arrivalWound" ? "Bile Spit reaction" : "Affliction reroll",
      ownerDetail: state.pendingAfflictionReaction.kind === "arrivalWound"
        ? "Choose whether to make the arriving operative suffer 1 wound."
        : "Reroll one die or keep the current failed result.",
      publicAction: "resolve an Affliction reaction",
      sourceId: state.pendingAfflictionReaction.afflictionId,
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingScarChoice) {
    return present({
      id: `scar-choice:${state.pendingScarChoice.ownerSeatId}:${state.sequence}`,
      kind: "scar",
      actorSeatId: state.pendingScarChoice.ownerSeatId,
      requiredTab: "action",
      label: "Choose a Scar",
      ownerDetail: "Select and confirm one Scar to continue.",
      publicAction: "resolve a private Scar choice",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingScarRemovalChoice) {
    return present({
      id: `scar-removal:${state.pendingScarRemovalChoice.ownerSeatId}:${state.sequence}`,
      kind: "scar",
      actorSeatId: state.pendingScarRemovalChoice.ownerSeatId,
      requiredTab: "action",
      label: "Choose a Scar",
      ownerDetail: "Choose the Scar to remove or leave the service.",
      publicAction: "resolve a private Scar service choice",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingScarConsequence) {
    return present({
      id: `scar-consequence:${state.pendingScarConsequence.seatId}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingScarConsequence.seatId,
      requiredTab: "action",
      label: "Resolve Scar consequence",
      ownerDetail: "Review the consequence and continue.",
      publicAction: "resolve a Scar consequence",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingGearEquipChoice) {
    return present({
      id: `equip:${state.pendingGearEquipChoice.ownerSeatId}:${state.sequence}`,
      kind: "equipment",
      actorSeatId: state.pendingGearEquipChoice.ownerSeatId,
      requiredTab: "action",
      label: "Choose Equipment placement",
      ownerDetail: "Equip the new item or keep it carried.",
      publicAction: "resolve a private Equipment choice",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingEquipmentSuppressionChoice) {
    return present({
      id: `equipment-suppression:${state.pendingEquipmentSuppressionChoice.ownerSeatId}:${state.sequence}`,
      kind: "equipment",
      actorSeatId: state.pendingEquipmentSuppressionChoice.ownerSeatId,
      requiredTab: opposedResolutionActive ? "battle" : "action",
      label: "Choose affected Equipment",
      ownerDetail: "Select an eligible equipped item to continue.",
      publicAction: "resolve a private Equipment effect",
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingEncounterDecision) {
    return present({
      id: `payment:${state.pendingEncounterDecision.seatId}:${state.sequence}`,
      kind: "payment",
      actorSeatId: state.pendingEncounterDecision.seatId,
      requiredTab: "action",
      label: "Payment required",
      ownerDetail: state.pendingEncounterDecision.prompt,
      publicAction: "resolve an encounter payment",
      sourceId: state.pendingEncounterDecision.sourceCardId,
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingMemoryTaxChoice) {
    return present({
      id: `memory-tax:${state.pendingMemoryTaxChoice.ownerSeatId}:${state.sequence}`,
      kind: "payment",
      actorSeatId: state.pendingMemoryTaxChoice.ownerSeatId,
      requiredTab: "action",
      label: "Choose what to surrender",
      ownerDetail: "Resolve the Memory Tax choice to continue.",
      publicAction: "resolve a private encounter choice",
      sourceId: state.pendingMemoryTaxChoice.sourceCardId,
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingForcedDestinationChoice) {
    return present({
      id: `forced-destination:${state.pendingForcedDestinationChoice.ownerSeatId}:${state.sequence}`,
      kind: "forced-destination",
      actorSeatId: state.pendingForcedDestinationChoice.ownerSeatId,
      requiredTab: "action",
      label: "Choose a forced destination",
      ownerDetail: "Choose one legal destination to continue.",
      publicAction: "choose a forced destination",
      sourceId: state.pendingForcedDestinationChoice.sourceId,
      transitionStage: "private-resolution"
    });
  }

  if (state.pendingDisplacement) {
    return present({
      id: `displacement:${state.pendingDisplacement.seatId}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingDisplacement.seatId,
      requiredTab: "action",
      label: "Resolve displacement",
      ownerDetail: "Accept the displacement or use an eligible reaction.",
      publicAction: "resolve forced displacement",
      sourceId: state.pendingDisplacement.sourceId
    });
  }

  if (state.pendingSutureStormConsequence) {
    return present({
      id: `ordered-consequence:${state.pendingSutureStormConsequence.seatId}:${state.pendingSutureStormConsequence.stage}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingSutureStormConsequence.seatId,
      requiredTab: "action",
      label: "Resolve consequence",
      ownerDetail: "Continue the ordered consequence.",
      publicAction: "resolve the current consequence",
      sourceId: state.pendingSutureStormConsequence.sourceCardId
    });
  }

  if (state.pendingMissionSelection?.status === "awaitingSelection") {
    return present({
      id: `mission:${state.pendingMissionSelection.ownerSeatId}:${state.sequence}`,
      kind: "mission",
      actorSeatId: state.pendingMissionSelection.ownerSeatId,
      requiredTab: "action",
      label: "Choose your next mission",
      ownerDetail: "Select and confirm one private Contract.",
      publicAction: "choose a new private Contract",
      transitionStage: "private-resolution"
    });
  }

  if (state.cooperativeAssistance) {
    const responded = new Set([
      ...state.cooperativeAssistance.acceptedSeatIds,
      ...state.cooperativeAssistance.declinedSeatIds
    ]);
    const outstandingSeatId = state.cooperativeAssistance.requestedSeatIds.find((seatId) => !responded.has(seatId)) ?? null;
    const actorSeatId = outstandingSeatId ?? state.cooperativeAssistance.activeSeatId;
    const helperOwnsResponse = outstandingSeatId === viewerSeatId;
    return present({
      id: `assistance:${state.cooperativeAssistance.activeSeatId}:${outstandingSeatId ?? "ready"}:${state.sequence}`,
      kind: "assistance",
      actorSeatId,
      requiredTab: opposedResolutionActive ? "battle" : "action",
      label: helperOwnsResponse ? "Answer help request" : "Resolve assistance",
      ownerDetail: helperOwnsResponse
        ? `Accept or decline the ${state.cooperativeAssistance.testedStat} assistance request.`
        : "Lock accepted helpers or continue without further help.",
      publicAction: outstandingSeatId ? "answer a cooperative help request" : "continue the assisted test",
      sourceId: state.cooperativeAssistance.sourceId
    });
  }

  if (state.pendingCooperativeTest) {
    return present({
      id: `cooperative-test:${state.pendingCooperativeTest.activeSeatId}:${state.sequence}`,
      kind: "assistance",
      actorSeatId: state.pendingCooperativeTest.activeSeatId,
      requiredTab: opposedResolutionActive ? "battle" : "action",
      label: "Choose whether to ask for help",
      ownerDetail: `Ask up to two operatives for ${state.pendingCooperativeTest.stat}, or continue alone.`,
      publicAction: "choose helpers or continue the test",
      sourceId: state.pendingCooperativeTest.sourceId
    });
  }

  if (state.pendingFailureReaction) {
    return present({
      id: `failure-reaction:${state.pendingFailureReaction.seatId}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingFailureReaction.seatId,
      requiredTab: opposedResolutionActive ? "battle" : "action",
      label: "Resolve reaction",
      ownerDetail: "Use an eligible reaction or accept the result.",
      publicAction: "resolve a reaction",
      sourceId: state.pendingFailureReaction.sourceId
    });
  }

  if (state.pendingStaticIntercessionReaction) {
    return present({
      id: `intercession:${state.pendingStaticIntercessionReaction.seatId}:${state.sequence}`,
      kind: "consequence",
      actorSeatId: state.pendingStaticIntercessionReaction.seatId,
      requiredTab: "action",
      label: "Resolve reaction",
      ownerDetail: "Choose an eligible effect to suppress or continue.",
      publicAction: "resolve a reaction"
    });
  }

  if (state.activeResolution || state.pendingTileChallenge || state.currentEncounter || state.pendingEnemyRoll) {
    const actorSeatId = state.activeResolution?.playerId
      ?? state.pendingTileChallenge?.seatId
      ?? state.pendingEnemyRoll?.fighterSeatId
      ?? activeSeatId;
    const sourceId = state.activeResolution?.id ?? state.pendingTileChallenge?.id ?? state.currentEncounter?.id ?? "encounter";
    const isMovementResolution =
      state.activeResolution?.source === "movement"
      || state.activeResolution?.card?.type === "movement";
    const isBattle =
      state.activeResolution?.card?.type === "enemy"
      || state.currentEncounter?.cardType === "enemy"
      || Boolean(state.pendingEnemyRoll);
    const title = state.activeResolution?.card?.title ?? state.currentEncounter?.title ?? "current test";
    const rollResultPending = state.activeResolution?.stage === "roll_result";
    const settledResultVisible = state.activeResolution?.stage === "outcome_summary" || state.activeResolution?.stage === "awaiting_continue";
    const scarRerollAvailable = Boolean(
      rollResultPending
      && actorSeatId
      && getOwnedScarAdaptationControls(state, actorSeatId).some((control) => control.enabled && control.ruleKey.includes("reroll"))
    );
    const soloRerollAvailable = Boolean(
      rollResultPending
      && actorSeatId
      && buildSoloRerollProjection(state, actorSeatId).available
    );
    const edgeReactionAvailable = Boolean(
      rollResultPending
      && actorSeatId
      && state.pendingEdgeReaction?.ownerSeatId === actorSeatId
    );
    const rollReactionAvailable = scarRerollAvailable || soloRerollAvailable || edgeReactionAvailable;
    const rerolledResultVisible = rollResultPending && isSoloRerollResolution(state.activeResolution);
    const rollReviewAvailable = rollReactionAvailable || rerolledResultVisible;
    const resultVisible = rollResultPending || settledResultVisible;
    const outcomeTitle = state.activeResolution?.outcome?.title ?? (state.lastOutcomeSummary?.success === false ? "Test failed" : "Test resolved");
    const outcomeDetail = state.activeResolution?.outcome?.text ?? state.lastOutcomeSummary?.summary ?? `Review the ${title} result.`;
    const ownerPrivateResolution = state.activeResolution?.origin?.privacy === "owner";
    return present({
      id: `${isBattle ? "battle" : "test"}:${sourceId}:${state.activeResolution?.stage ?? "pending"}`,
      kind: isBattle ? "battle" : "test",
      actorSeatId,
      requiredTab: isMovementResolution ? "move" : isBattle ? "battle" : "action",
      label: isMovementResolution
        ? resultVisible ? outcomeTitle : "Resolve approach"
        : rollReviewAvailable
          ? edgeReactionAvailable
            ? "Use Edge or keep the result"
            : rerolledResultVisible
              ? outcomeTitle
              : "Choose a reroll or keep the result"
          : rollResultPending
            ? isBattle ? "Applying battle consequence" : "Applying challenge consequence"
            : resultVisible ? outcomeTitle : isBattle ? "Resolve battle" : "Resolve test",
      ownerDetail: isMovementResolution
        ? resultVisible ? outcomeDetail : `Resolve the approach to ${title}.`
        : rollReviewAvailable
          ? edgeReactionAvailable
            ? "Use one eligible Edge ability or continue without Edge."
            : rerolledResultVisible
              ? outcomeDetail
              : "Use an available reroll or keep the authoritative result."
          : rollResultPending
            ? "The server is applying the authoritative consequence."
            : resultVisible ? outcomeDetail : `Resolve ${title}.`,
      publicAction: ownerPrivateResolution
        ? resultVisible ? "review a private objective result" : "resolve a private objective"
        : rollReviewAvailable
          ? rerolledResultVisible
            ? `review the rerolled ${title} result`
            : `choose a reroll or keep the ${title} result`
          : rollResultPending
            ? `wait while the ${title} consequence is applied`
            : resultVisible ? `review the ${title} result` : `resolve ${title}`,
      transitionStage: settledResultVisible ? "continue-available" : rollResultPending ? "result-visible" : "required-action",
      allowedCommand: settledResultVisible || rerolledResultVisible || (rollReactionAvailable && !edgeReactionAvailable) ? "continue" : null,
      canAct: !rollResultPending || rollReviewAvailable,
      sourceId: ownerPrivateResolution ? undefined : sourceId
    });
  }

  const innerApproach = activeSeatId ? buildPublicInnerApproach(state, activeSeatId) : null;
  if (state.phase === "navigation" && innerApproach) {
    return present({
      id: `inner-approach:${activeSeatId}:${innerApproach.revision}:${innerApproach.currentSectorId}`,
      kind: innerApproach.challengeCleared ? "movement" : "test",
      actorSeatId: activeSeatId,
      requiredTab: innerApproach.challengeCleared ? "move" : "action",
      label: innerApproach.challengeCleared ? "Advance one inner step" : `Clear ${innerApproach.currentSectorName}`,
      ownerDetail: innerApproach.challengeCleared
        ? "Choose the next connected approach step or retreat. Movement ends after one step."
        : `Resolve ${innerApproach.challengeTitle}. Success permanently clears this step for your operative.`,
      publicAction: innerApproach.challengeCleared
        ? "choose one inner approach step"
        : `resolve the challenge at ${innerApproach.currentSectorName}`,
      sourceId: innerApproach.currentSectorId,
      transitionStage: "required-action"
    });
  }

  if (context.movementActive || state.phase === "navigation") {
    const choosingPreRollTransition = context.tierTransitionAvailable && !context.movementActive;
    return present({
      id: `movement:${activeSeatId ?? "none"}:${state.movementRouteRevisions?.[activeSeatId ?? ""] ?? 0}`,
      kind: "movement",
      actorSeatId: activeSeatId,
      requiredTab: "move",
      label: context.movementSelected
        ? "Confirm destination"
        : context.movementActive
          ? "Choose a destination"
          : choosingPreRollTransition
            ? "Cross tier or roll movement"
            : "Roll movement",
      ownerDetail: context.movementSelected
        ? "Confirm the selected route."
        : context.movementActive
          ? "Choose one legal destination."
          : choosingPreRollTransition
            ? "Cross through the connected tier gate or roll for same-tier movement."
            : "Roll movement to reveal legal destinations.",
      publicAction: context.movementSelected
        ? "confirm the selected route"
        : context.movementActive
          ? "choose a legal destination"
          : choosingPreRollTransition
            ? "choose whether to cross tiers or roll movement"
            : "roll movement",
      transitionStage: latestTurnCompleted ? "next-turn-ready" : "required-action"
    });
  }

  if (context.shopActive) {
    const shopView = state.shopBrowseSelection?.seatId === activeSeatId
      ? state.shopBrowseSelection.view
      : "categories";
    const privateView = shopView === "artifacts" || shopView === "sell";
    const shopLabel = shopView === "categories"
      ? "Choose a shop category"
      : privateView
        ? "Resolve private shop choice"
        : `Browse ${shopView}`;
    return present({
      id: `shop:${activeSeatId ?? "none"}:${state.sequence}:${shopView}`,
      kind: "shop",
      actorSeatId: activeSeatId,
      requiredTab: "shop",
      label: shopLabel,
      ownerDetail: shopView === "categories"
        ? "Choose a category or leave the shop."
        : "Review the focused offer, complete one action, or leave the shop.",
      publicAction: privateView ? "finish a private shop choice" : shopView === "categories" ? "choose a shop category" : `browse ${shopView}`,
      transitionStage: "turn-actions"
    });
  }

  const endTurn = activeSeatId ? canEndTurn(state, activeSeatId) : { allowed: false, reason: "No active operative." };
  const endTurnAvailable = endTurn.allowed && (state.phase === "action" || state.phase === "broadcast");
  const endTurnCommand = state.phase === "broadcast" ? "end-turn" as const : endTurnAvailable ? "finish-actions" as const : null;

  return present({
    id: `action:${activeSeatId ?? "none"}:${state.phase}:${endTurnAvailable ? "ready" : "active"}`,
    kind: "action",
    actorSeatId: activeSeatId,
    requiredTab: "action",
    label: endTurnAvailable ? "End turn when ready" : "Choose an action",
    ownerDetail: endTurnAvailable
      ? (state.sessionMode === "single-player" ? "End the turn to begin the next round." : "End the turn to pass control to the next operative.")
      : endTurn.reason ?? "Choose a legal sector action.",
    publicAction: endTurnAvailable ? "end the turn when ready" : "choose an action",
    transitionStage: endTurnAvailable ? "end-turn-available" : "turn-actions",
    allowedCommand: endTurnCommand
  });
}

export function buildSetupProjection(state: GameState): import("../client/shared/types.js").SetupProjection {
  const occupiedSeats = state.seats.filter((seat) => Boolean(seat.displayName) && !seat.kicked);
  const readiness = getSessionStartReadiness({
    sessionMode: state.sessionMode,
    gameMode: state.gameMode,
    seats: state.seats
  });
  const seatName = (seatId: string | null): string | null =>
    seatId ? state.seats.find((seat) => seat.seatId === seatId)?.displayName ?? "Player" : null;
  const hostSeat = state.setupHostSeatId
    ? state.seats.find((seat) => seat.seatId === state.setupHostSeatId) ?? null
    : null;
  const missingOperative = occupiedSeats.find((seat) => !seat.characterId || seat.characterSelected === false) ?? null;
  const missingMission = occupiedSeats.find(
    (seat) => Boolean(seat.characterId) && seat.characterSelected !== false && !seat.selectedStartingContractId
  ) ?? null;
  const missingStartingBonus = occupiedSeats.find(
    (seat) =>
      Boolean(seat.characterId) &&
      seat.characterSelected !== false &&
      Boolean(seat.selectedStartingContractId) &&
      !hasCompletedStartingBonusSelection(seat)
  ) ?? null;
  const missingReady = occupiedSeats.find(
    (seat) =>
      Boolean(seat.characterId) &&
      seat.characterSelected !== false &&
      Boolean(seat.selectedStartingContractId) &&
      hasCompletedStartingBonusSelection(seat) &&
      !seat.ready
  ) ?? null;

  let stage: import("../client/shared/types.js").SetupStage = "waiting-for-host";
  let actorSeatId: string | null = state.setupHostSeatId ?? null;
  let title = "Waiting for Host Phone";
  let publicInstruction = "Scan the room code to establish the Host Phone.";
  let activeInstruction = "Join this room to configure the expedition.";
  let waitingInstruction = "The Host Phone must join before setup can continue.";
  let allowedCommand: import("../client/shared/types.js").SetupProjection["allowedCommand"] = null;

  if (state.lobbyConfigured === false && hostSeat?.displayName) {
    stage = "mode-selection";
    title = "Choose Game Setup";
    publicInstruction = `${hostSeat.displayName} is choosing the mode and scenario.`;
    activeInstruction = "Choose a mode, scenario, and player count, then confirm setup.";
    waitingInstruction = `Waiting for ${hostSeat.displayName} to confirm the game setup.`;
    allowedCommand = "configure-lobby";
  } else if (missingOperative) {
    stage = "operative-selection";
    actorSeatId = missingOperative.seatId;
    title = "Choose an Operative";
    publicInstruction = `${missingOperative.displayName ?? "A player"} must choose an operative.`;
    activeInstruction = "Choose and confirm one available operative.";
    waitingInstruction = `Waiting for ${missingOperative.displayName ?? "a player"} to choose an operative.`;
    allowedCommand = "select-operative";
  } else if (missingMission) {
    stage = "mission-selection";
    actorSeatId = missingMission.seatId;
    title = "Choose a Starting Contract";
    publicInstruction = `${missingMission.displayName ?? "A player"} must choose a starting Contract.`;
    activeInstruction = "Choose and confirm your starting Contract.";
    waitingInstruction = `Waiting for ${missingMission.displayName ?? "a player"} to choose a starting Contract.`;
    allowedCommand = "select-mission";
  } else if (missingStartingBonus) {
    stage = "provision-selection";
    actorSeatId = missingStartingBonus.seatId;
    title = "Choose Starting Provisions";
    publicInstruction = `${missingStartingBonus.displayName ?? "A player"} is choosing starting provisions.`;
    activeInstruction = `Choose bonus ${(missingStartingBonus.startingBonusSelections?.length ?? 0) + 1} of ${STARTING_BONUS_PICK_COUNT}.`;
    waitingInstruction = `Waiting for ${missingStartingBonus.displayName ?? "a player"} to choose starting provisions.`;
    allowedCommand = "select-provision";
  } else if (missingReady) {
    stage = "ready-check";
    actorSeatId = missingReady.seatId;
    title = "Ready Check";
    publicInstruction = `${missingReady.displayName ?? "A player"} must press Ready.`;
    activeInstruction = "Review your operative and mission, then press Ready.";
    waitingInstruction = `Waiting for ${missingReady.displayName ?? "a player"} to press Ready.`;
    allowedCommand = "ready";
  } else if (!readiness.canStart) {
    stage = "waiting-for-players";
    actorSeatId = null;
    title = "Waiting for Players";
    publicInstruction = readiness.reason.endsWith(".") ? readiness.reason : `${readiness.reason}.`;
    activeInstruction = "Keep this controller ready while another player joins.";
    waitingInstruction = publicInstruction;
  } else {
    stage = "start-available";
    actorSeatId = state.setupHostSeatId ?? null;
    title = "Ready to Begin";
    publicInstruction = `${readiness.occupiedCount} operative${readiness.occupiedCount === 1 ? " is" : "s are"} prepared.`;
    activeInstruction = "Start the game when the table is ready.";
    waitingInstruction = `Waiting for ${seatName(actorSeatId) ?? "the Host Phone"} to start the game.`;
    allowedCommand = "start";
  }

  const actor = actorSeatId ? state.seats.find((seat) => seat.seatId === actorSeatId) ?? null : null;
  const startBlockers = state.lobbyConfigured === false
    ? ["Host Phone must select a mode and scenario"]
    : readiness.blockers;

  return {
    id: `setup:${stage}:${actorSeatId ?? "table"}:${state.sequence}`,
    stage,
    actorSeatId,
    actorDisplayName: seatName(actorSeatId),
    title,
    publicInstruction,
    activeInstruction,
    waitingInstruction,
    allowedCommand,
    inputEnabled: Boolean(actor?.connected),
    canStart: state.lobbyConfigured !== false && readiness.canStart,
    startReason: state.lobbyConfigured === false ? "Choose mode and scenario before starting" : readiness.reason,
    startBlockers,
    connectedCount: occupiedSeats.filter((seat) => seat.connected).length,
    readyCount: readiness.readyCount,
    seatCapacity: state.seats.length,
    revision: state.sequence
  };
}

export function createTvProjection(
  state: GameState,
  movementPreviewBySeatId: ReadonlyMap<string, { destinationId: string; routeId: string }> = new Map()
): Record<string, unknown> {
  const escalationThreshold = getEscalationCollapseLevel(state.sessionMode);
  const activeScenario = getScenarioDefinition(state.activeScenarioId);
  const activeScenarioProgress = activeScenario
    ? activeScenario.id === "scenario_broken_seal"
      ? state.scenarioConfrontation.progress.restorationMarks ?? 0
      : activeScenario.id === BROKEN_CONCORDANCE_SCENARIO_ID
        ? state.scenarioConfrontation.progress.concordanceStages ?? 0
      : state.scenarioProgress[activeScenario.winConditionKey] ?? 0
    : 0;
  const activeNemesis = getLinkedNemesis(state.activeScenarioId);
  const activeScenarioThreshold = getScenarioProgressThreshold(state.activeScenarioId, activeScenario?.victoryThreshold ?? 0);
  const escalationModifier = getEscalationModifier(state.escalationLevel);
  const scenarioPressureSummary = describeScenarioPressure(state) ?? "Scenario pressure will appear once the room is active.";
  const scenarioTelemetry = buildScenarioTelemetry(state);
  const scenarioPressure = buildScenarioPressureState(state, scenarioPressureSummary);
  const activePlayer = state.players.find((player) => player.seatId === state.turnOrder[state.activeSeatIndex]) ?? null;
  const brokenSealUnlocked = activePlayer && state.activeScenarioId === "scenario_broken_seal"
    ? (state.scenarioPreparation.resources.sealIntegrity ?? 0) >= 4 ||
      activePlayer.character.heldGear.some((item) => item.tier === "artifact" || item.id.startsWith("artifact-")) ||
      getCompletedContractCountForProjection(state, activePlayer.seatId) >= 3
    : null;
  const scenarioState = {
    scenarioId: state.activeScenarioId,
    preparation: {
      resources: state.scenarioPreparation.resources,
      completedObjectiveIds: state.scenarioPreparation.completedObjectiveIds
    },
    confrontation: {
      active: state.scenarioConfrontation.active,
      confrontationId: state.scenarioConfrontation.confrontationId,
      progress: state.scenarioConfrontation.progress,
      stage: state.scenarioConfrontation.stage,
      locationSectorId: "center_cinder_gate",
      locked: brokenSealUnlocked === null ? null : !brokenSealUnlocked
    },
    result: {
      status: state.scenarioResult.status,
      victoryConditionId: state.scenarioResult.victoryConditionId,
      sourceType: state.scenarioResult.sourceType,
      winningSeatId: state.scenarioResult.winningSeatId,
      shared: state.scenarioResult.shared
    }
  };

  const playerSeatIds = new Set(state.players.map((player) => player.seatId));
  const visibleSeatIds = new Set(
    state.seats
      .filter((seat) => !seat.kicked && seat.displayName && isSeatCharacterSelectedForProjection(state, seat, playerSeatIds))
      .map((seat) => seat.seatId)
  );
  const visiblePlayers = state.players.filter((player) => visibleSeatIds.has(player.seatId));
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const shopEncounter = buildPublicShopEncounter(state, visiblePlayers);
  const publicResultDeltas = buildPublicResultDeltas(state, shopEncounter as Record<string, unknown> | null);
  const publicCardReveal = buildPublicCardReveal(state);
  const matchProgress = buildMatchProgressPresentation(state, publicResultDeltas);
  const recentAbilityTriggers = state.eventLog
    .filter(
      (
        entry
      ): entry is {
        type: "ABILITY_TRIGGERED";
        seatId: string;
        abilityId: string;
        summary: string;
        createdAt: string;
      } =>
        typeof entry === "object" &&
        entry !== null &&
        "type" in entry &&
        (entry as { type?: string }).type === "ABILITY_TRIGGERED" &&
        "seatId" in entry &&
        "abilityId" in entry &&
        "summary" in entry &&
        "createdAt" in entry
    )
    .slice(-8)
    .reverse();
  const latestEvent = state.eventLog.at(-1) as { type?: string; seatId?: string; scarTitle?: string } | undefined;
  const scarResolutionStatus = latestEvent?.type === "CONTINUE_SCAR_CONSEQUENCE" && latestEvent.seatId && latestEvent.scarTitle
    ? { seatId: latestEvent.seatId, scarTitle: latestEvent.scarTitle, status: "resolved" as const }
    : null;
  const nemesisSummary = activeNemesis
    ? {
        id: activeNemesis.id,
        name: activeNemesis.name,
        title: activeNemesis.title,
        faction: activeNemesis.faction,
        life: activeScenarioThreshold,
        damageDealt: activeScenarioProgress,
        abilities: activeNemesis.abilities.map((ability) => ({
          timing: ability.timing,
          text: ability.text
        }))
      }
    : null;

  return stripLegacyHeatProjection({
    status: state.status,
    setup: state.status === "lobby" ? buildSetupProjection(state) : null,
    requiredAction: buildRequiredActionProjection(state, null, {
      movementActive: Boolean(activeSeatId && buildPublicMovementPlanner(state, activeSeatId)?.active),
      movementSelected: Boolean(activeSeatId && state.routeStarChoices?.[activeSeatId]),
      tierTransitionAvailable: Boolean(
        activeSeatId &&
        state.status === "active" &&
        state.phase === "navigation" &&
        !state.movementRolls?.[activeSeatId] &&
        buildTierTransitionOptions(state, activeSeatId).some((transition) => !transition.disabledReason)
      ),
      shopActive: Boolean(
        shopEncounter &&
        shopEncounter.status !== "locked" &&
        shopEncounter.blocked !== true
      )
    }),
    cooperativeAssistance: buildCooperativeAssistanceProjection(state),
    pendingCooperativeTest: state.pendingCooperativeTest ? {
      id: state.pendingCooperativeTest.id,
      sourceKind: state.pendingCooperativeTest.sourceKind,
      sourceId: state.pendingCooperativeTest.sourceId,
      sourceTitle: state.pendingCooperativeTest.sourceTitle,
      activeSeatId: state.pendingCooperativeTest.activeSeatId,
      stat: state.pendingCooperativeTest.stat,
      difficulty: state.pendingCooperativeTest.difficulty,
      requiresHelper: state.pendingCooperativeTest.requiresHelper
    } : null,
    pendingMissionSelectionStatus: state.pendingMissionSelection ? {
      ownerSeatId: state.pendingMissionSelection.ownerSeatId,
      status: state.pendingMissionSelection.status
    } : null,
    pendingEncounterDecision: state.pendingEncounterDecision ? {
      seatId: state.pendingEncounterDecision.seatId,
      sourceCardId: state.pendingEncounterDecision.sourceCardId,
      sourceTitle: state.currentEncounter?.title ?? "Encounter payment",
      status: "waiting"
    } : null,
    pendingMemoryTaxChoice: state.pendingMemoryTaxChoice ? {
      ownerSeatId: state.pendingMemoryTaxChoice.ownerSeatId,
      sourceId: state.pendingMemoryTaxChoice.sourceCardId,
      sourceTitle: state.currentEncounter?.title ?? "Memory Tax Gate",
      status: "waiting"
    } : null,
    pendingAfflictionStatus: state.pendingAfflictionReaction
      ? {
          ownerSeatId: state.pendingAfflictionReaction.ownerSeatId,
          kind: state.pendingAfflictionReaction.kind,
          status: "waiting" as const
        }
      : state.pendingAfflictionResolution
        ? {
            ownerSeatId: state.pendingAfflictionResolution.ownerSeatId,
            kind: "draw" as const,
            status: state.pendingAfflictionResolution.status === "awaitingStatChoice" ? "choice" as const : "resolving" as const
          }
        : null,
    pendingForcedDestinationChoice: state.pendingForcedDestinationChoice ? {
      ownerSeatId: state.pendingForcedDestinationChoice.ownerSeatId,
      sourceId: state.pendingForcedDestinationChoice.sourceId,
      sourceTitle: state.currentEncounter?.title ?? "False-Route Procession",
      status: "waiting"
    } : null,
    pendingDisplacement: state.pendingDisplacement ? {
      seatId: state.pendingDisplacement.seatId,
      sourceId: state.pendingDisplacement.sourceId,
      sourceTitle: state.currentEncounter?.title ?? "Forced displacement",
      originSectorId: state.pendingDisplacement.originSectorId,
      destinationSectorId: state.pendingDisplacement.destinationSectorId,
      destinationSectorName: state.sectors.find((sector) => sector.id === state.pendingDisplacement!.destinationSectorId)?.name ?? state.pendingDisplacement.destinationSectorId,
      direction: state.pendingDisplacement.direction,
      status: "waiting"
    } : null,
    pendingOrderedConsequence: state.pendingSutureStormConsequence ? {
      seatId: state.pendingSutureStormConsequence.seatId,
      sourceId: state.pendingSutureStormConsequence.sourceCardId,
      requestedWounds: state.pendingSutureStormConsequence.requestedWounds,
      preventedWounds: state.pendingSutureStormConsequence.preventedWounds,
      actualWounds: state.pendingSutureStormConsequence.actualWounds,
      resultingWounds: state.pendingSutureStormConsequence.resultingWounds,
      resultingStatus: state.pendingSutureStormConsequence.resultingStatus,
      status: "waiting"
    } : null,
    scarTriggerStatus: state.pendingScarConsequence ? {
      seatId: state.pendingScarConsequence.seatId,
      scarTitle: state.pendingScarConsequence.scarTitle,
      status: "waiting"
    } : null,
    scarResolutionStatus,
    pendingScarChoiceStatus: state.pendingScarChoice ? {
      ownerSeatId: state.pendingScarChoice.ownerSeatId,
      source: state.pendingScarChoice.source,
      sourceCardId: state.pendingScarChoice.sourceCardId,
      cards: summarizeScars(state.pendingScarChoice.candidateIds),
      status: "waiting" as const
    } : null,
    sessionMode: state.sessionMode,
    gameMode: state.gameMode,
    interactionMode: state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry"),
    setupHostSeatId: state.setupHostSeatId ?? null,
    lobbyConfigured: state.lobbyConfigured !== false,
    hostPhoneConnected: Boolean(state.setupHostSeatId && state.seats.find((seat) => seat.seatId === state.setupHostSeatId)?.connected),
    winnerSeatId: state.winnerSeatId,
    activeScenario: activeScenario
      ? {
          id: activeScenario.id,
          name: activeScenario.name,
          theme: activeScenario.theme,
          sheetArtPath: getScenarioSheetArtPath(activeScenario),
          difficulty: activeScenario.difficulty,
          mode: activeScenario.mode,
          pressureSummary: scenarioPressureSummary,
          pressureTrack: activeScenario.pressureTrack,
          boardHooks: activeScenario.boardHooks,
          progressSources: activeScenario.progressSources,
          finalGateRequirement: activeScenario.finalGateRequirement,
          scenarioRewards: activeScenario.scenarioRewards,
          nemesisName: activeScenario.nemesis,
          shopInteractions: activeScenario.shopInteractions,
          tileEventHooks: activeScenario.tileEventHooks,
          modeScaling: activeScenario.modeScaling,
          publicDisplay: activeScenario.publicDisplay,
          confrontationTitle: activeScenario.confrontationTitle,
          progressLabel: activeScenario.winConditionKey,
          progress: activeScenarioProgress,
          threshold: activeScenarioThreshold,
          setup: activeScenario.setup,
          specialRules: activeScenario.specialRules,
          confrontationSteps: activeScenario.confrontationSteps,
          victoryText: activeScenario.victoryText
        }
      : null,
    scenarioTelemetry,
    scenarioPressure,
    scenarioState,
    matchProgress,
    scenarioProgress: state.scenarioProgress,
    nemesisChampions: state.nemesisChampions.map((champion) => {
      const sector = state.sectors.find((entry) => entry.id === champion.sectorId);
      const distanceToNexus = getDistanceToNexus(state, champion.sectorId);

      return {
        id: champion.id,
        name: champion.name,
        type: champion.type,
        boundPlayerId: champion.boundPlayerId,
        sectorId: champion.sectorId,
        sectorName: sector?.name ?? champion.sectorId,
        strength: champion.strength,
        craft: champion.craft,
        tech: champion.tech,
        will: champion.will,
        health: champion.health,
        maxHealth: champion.maxHealth,
        trophies: champion.trophies,
        movementProfile: champion.movementProfile,
        combatProfile: champion.combatProfile,
        specialRuleId: champion.specialRuleId,
        defeated: champion.defeated,
        distanceToNexus,
        warning: !champion.defeated && distanceToNexus <= 3
      };
    }),
    nemesisNexusCountdowns: state.nemesisNexusCountdowns,
    seats: state.seats.map((seat) => {
      return {
        seatId: seat.seatId,
        characterId: seat.characterId,
        characterSelected: isSeatCharacterSelectedForProjection(state, seat, playerSeatIds),
        signalPieceId: isSignalPieceId(seat.signalPieceId)
          ? seat.signalPieceId
          : getSignalPieceIdForSeat(state.seats.findIndex((entry) => entry.seatId === seat.seatId)),
        displayName: seat.displayName ?? null,
        startingMissionSelected: Boolean(seat.selectedStartingContractId),
        startingMissionTitle: null,
        startingBonusPickCount: seat.startingBonusSelections?.length ?? 0,
        startingBonusComplete: hasCompletedStartingBonusSelection(seat),
        connected: seat.connected,
        ready: seat.ready,
        kicked: seat.kicked
      };
    }),
    sectors: state.sectors.map((sector) => ({
      ...sector,
      tileChallenges: (sector.tileChallenges ?? []).map((challenge) => ({
        id: challenge.id, name: challenge.name, challengeType: challenge.challengeType, sectorId: challenge.sectorId,
        testStat: challenge.testStat, difficulty: challenge.difficulty, trigger: challenge.trigger,
        authoredOrder: challenge.authoredOrder, recurring: true as const, tags: challenge.tags, lore: challenge.lore,
        artCardId: challenge.artCardId, successSummary: summarizeTileChallengeEffect(challenge.successEffect),
        failureSummary: summarizeTileChallengeEffect(challenge.failureEffect)
      }))
    })),
    players: visiblePlayers.map((player) => {
      const suppressedInstanceIds = new Set(
        (state.equipmentSuppressions ?? [])
          .filter((entry) => entry.ownerSeatId === player.seatId && entry.status === "active")
          .map((entry) => entry.itemInstanceId)
      );
      const effectiveStats = Object.fromEntries(
        (["command", "grit", "signal", "guile", "forge"] as const).map((stat) => [
          stat,
          getCharacterStatBreakdown(player.character, stat, { mode: "resting", suppressedInstanceIds }).final
        ])
      );

      return {
        seatId: player.seatId,
        character: {
        id: player.character.id,
        name: player.character.name,
        archetype: player.character.archetype,
        ...(getCharacterPresentation(player.character.id) ? { presentation: getCharacterPresentation(player.character.id) } : {}),
        status: player.character.status,
        activeContract: null,
        privateObjectiveStatus: {
          hasActiveContract: getActiveMissions(player.character).length > 0,
          completedContracts: getCompletedContractCountForProjection(state, player.seatId)
        },
        stats: player.character.stats,
        effectiveStats,
        statUpgrades: player.character.statUpgrades ?? {},
        trophies: player.character.trophies,
        trophyPile: player.character.trophyPile ?? [],
        salvage: player.character.salvage ?? 0,
        completedContracts: getCompletedContractCountForProjection(state, player.seatId),
        wounds: player.character.wounds,
        scars: player.character.scars,
        afflictions: summarizeAfflictions(player, getAfflictionCatalog(state)),
        heldGearCount: player.character.heldGear.length,
        followerCount: player.character.followers?.length ?? 0,
        companionBadges: (player.character.followers ?? [])
          .map((follower) => ({
            id: follower.id,
            name: follower.name,
            tier: follower.tier,
            ultimateCompanion: follower.ultimateCompanion,
            exhausted: follower.exhausted
          })),
        equippedGear: player.character.equippedGear,
        equippedGearDetails: (["weapon", "armor", "utility"] as const).flatMap((slot) => {
          const item = getEquippedGearItem(player.character, slot);
          if (!item) return [];
          return [{
            slot,
            id: item.id,
            ...(item.instanceId ? { instanceId: item.instanceId } : {}),
            name: item.name,
            statBonus: item.statBonus,
            ...(item.effectModel ? { effectModel: item.effectModel } : {}),
            ...(item.conditionType ? { conditionType: item.conditionType } : {}),
            ...(item.useLimit === "charge" || item.effectModel === "charged"
              ? {
                  currentCharges: item.currentCharges ?? item.charges ?? item.startingCharges ?? 0,
                  maxCharges: item.maxCharges ?? item.charges ?? item.startingCharges ?? 0
                }
              : {}),
            ...(item.effectModel === "exhaust" ? { exhausted: item.exhausted ?? false } : {})
          }];
        })
        },
        sectorId: player.character.currentSpaceId
      };
    }),
    activeSeatIndex: state.activeSeatIndex,
    turnOrder: state.turnOrder,
    escalationLevel: state.escalationLevel,
    escalationThreshold,
    escalationModifier,
    availableContracts: state.availableContracts,
    encounter: state.currentEncounter
      ? {
          id: state.currentEncounter.id,
          title: state.currentEncounter.title,
          cardType: state.currentEncounter.cardType,
          presentationType: getThreatPresentationCategory(state.currentEncounter),
          enemyName: state.currentEncounter.cardType === "enemy" ? state.currentEncounter.enemyName : null,
          flavor: state.currentEncounter.flavor,
          difficulty: state.currentEncounter.difficulty,
          stat: state.currentEncounter.stat
        }
      : null,
    pendingEnemyRoll: state.pendingEnemyRoll,
    pendingTileChallenge: state.pendingTileChallenge ? {
      challengeId: state.pendingTileChallenge.challengeId,
      sectorId: state.pendingTileChallenge.sectorId,
      seatId: state.pendingTileChallenge.seatId,
      challengeType: state.pendingTileChallenge.challengeType,
      testStat: state.pendingTileChallenge.testStat,
      difficulty: state.pendingTileChallenge.difficulty,
      authoredOrder: state.pendingTileChallenge.authoredOrder,
      totalChallenges: state.pendingTileChallenge.totalChallenges,
      rolled: state.pendingTileChallenge.rolled
    } : null,
    outcomeSummary: state.lastOutcomeSummary,
    rivalryAgendaCompletion: buildPublicRivalryAgendaCompletion(state),
    rivalryAgendaReveal: buildPublicRivalryAgendaReveal(state),
    publicResultDeltas,
    publicCardReveal,
    activeResolution: projectActiveResolutionForViewer(state, null),
    battlePresentation: buildBattlePresentation(state, null),
    edgeCardPlay:
      state.lastEdgeCardPlay
        ? {
            id: state.lastEdgeCardPlay.id,
            actorSeatId: state.lastEdgeCardPlay.seatId,
            actorDisplayName:
              state.seats.find((seat) => seat.seatId === state.lastEdgeCardPlay?.seatId)?.displayName ??
              state.players.find((player) => player.seatId === state.lastEdgeCardPlay?.seatId)?.character.name ??
              "An operative",
            cardId: state.lastEdgeCardPlay.cardId,
            cardName: state.lastEdgeCardPlay.cardName,
            edgeValue: state.lastEdgeCardPlay.edgeValue,
            mode: state.lastEdgeCardPlay.mode,
            abilityKey: state.lastEdgeCardPlay.abilityKey ?? null,
            resolutionId: state.lastEdgeCardPlay.resolutionId,
            publicSummary: state.lastEdgeCardPlay.publicSummary,
            createdAt: state.lastEdgeCardPlay.createdAt
          }
        : null,
    shopEncounter,
    movementPresentationGate: state.movementPresentationGate
      ? {
          eventId: state.movementPresentationGate.eventId,
          ownerSeatId: state.movementPresentationGate.seatId,
          ownerDisplayName: state.seats.find((seat) => seat.seatId === state.movementPresentationGate?.seatId)?.displayName
            ?? state.movementPresentationGate.seatId,
          destinationSectorId: state.movementPresentationGate.toSectorId,
          destinationSectorName: state.sectors.find((sector) => sector.id === state.movementPresentationGate?.toSectorId)?.name
            ?? state.movementPresentationGate.toSectorId,
          deadlineAt: state.movementPresentationGate.deadlineAt
        }
      : null,
    movementPlanner: activeSeatId
      ? (() => {
          const planner = buildPublicMovementPlanner(state, activeSeatId);
          const committedChoice = state.routeStarChoices?.[activeSeatId];
          const selectedPreview = committedChoice ? { destinationId: committedChoice.destinationId, routeId: committedChoice.routeId } : movementPreviewBySeatId.get(activeSeatId) ?? null;
          const selectedDestinationId = selectedPreview?.destinationId ?? null;
          if (planner && selectedPreview) {
            const destination = planner.destinations.find(
              (entry) => entry.sectorId === selectedPreview.destinationId && (!entry.disabledReason || entry.voidKeyPrompt)
            );
            const variant = destination?.routeVariants.find((entry) => entry.routeId === selectedPreview.routeId);
            if (destination && variant) {
              destination.routeId = variant.routeId;
              destination.route = [...variant.sectorIds];
              destination.routeNames = variant.sectorIds.map((sectorId) => state.sectors.find((entry) => entry.id === sectorId)?.name ?? sectorId);
            }
          }
          return planner
            ? {
                ...planner,
                selectedDestinationId: planner.destinations.some(
                  (destination) => destination.sectorId === selectedDestinationId && !destination.disabledReason
                )
                  ? selectedDestinationId
                  : null
              }
            : null;
        })()
      : null,
    innerApproach: activeSeatId ? buildPublicInnerApproach(state, activeSeatId) : null,
    sectorExplorationSummary: buildPublicSectorExplorationSummary(state, activeSeatId),
    tileArrival: activeSeatId ? buildTileArrivalProjection(state, activeSeatId) : null,
    recentAbilityTriggers,
    nemesis: nemesisSummary
  });
}

export function getOathchainContractSignature(player: PlayerState, contract: ContractCard): string {
  const active = player.character.activeContract!;
  return JSON.stringify({ contractId: contract.id, objective: contract.objective, progress: active.progress, completedTargetIds: active.completedTargetIds ?? [], salvageSpent: active.salvageSpent ?? 0 });
}

export function deriveOathchainTargets(state: GameState, player: PlayerState, contract: ContractCard) {
  const objective = contract.objective;
  const completed = new Set(player.character.activeContract?.completedTargetIds ?? []);
  if (objective.type === "defeatCount") {
    return state.sectors.flatMap((sector) => getFaceUpThreatsForSector(state, sector.id).map((threat) => ({ kind: "threat" as const, id: threat.instanceId, label: threat.name, sectorId: sector.id, detail: `Visible Threat at ${sector.name}; ${player.character.activeContract?.progress ?? 0}/${objective.target} defeated.` })));
  }
  if (objective.type === "spaceTextResolved") {
    return BOARD_SPACES.filter((space) => space.textBox.effectKey === objective.effectKey).map((space) => ({ kind: "sector" as const, id: space.id, label: space.name, sectorId: space.id, detail: `${objective.label}; ${player.character.activeContract?.progress ?? 0}/${objective.target} resolved.` }));
  }
  if (objective.type === "multiStopRoute") {
    const remaining = objective.targets.filter((target) => !completed.has(target.id));
    const visible = objective.ordered ? remaining.slice(0, 1) : remaining;
    return visible.flatMap((target) => {
      const spaces = target.type === "spaceId" ? BOARD_SPACES.filter((space) => space.id === target.value) : BOARD_SPACES.filter((space) => space.tags.includes(target.value as never));
      return spaces.map((space) => ({ kind: "routeStop" as const, id: target.id, label: target.label, sectorId: space.id, detail: objective.ordered ? "Next required Contract stop." : "Remaining valid Contract stop." }));
    });
  }
  if (objective.type === "shopTransaction") {
    return BOARD_SPACES.filter((space) => (!objective.requiredSectorId || space.id === objective.requiredSectorId) && (!objective.requiredShopType || getBoardSpaceShopCategory(space) === objective.requiredShopType) && isBoardSpaceShopCapable(space)).map((space) => ({ kind: "shopAction" as const, id: `${objective.action}:${space.id}`, label: objective.label, sectorId: space.id, detail: `${objective.action} at ${getBoardSpaceShopTypeLabel(space)}; ${player.character.activeContract?.progress ?? 0}/${objective.requiredCount}, ${player.character.activeContract?.salvageSpent ?? 0} Salvage spent.` }));
  }
  return state.sectors.flatMap((sector) => (sector.tileChallenges ?? []).filter((challenge) => (!objective.challengeId || challenge.id === objective.challengeId) && (!objective.sectorId || sector.id === objective.sectorId) && (!objective.challengeType || challenge.challengeType === objective.challengeType) && (!objective.challengeTag || challenge.tags.includes(objective.challengeTag))).map((challenge) => ({ kind: "tileChallenge" as const, id: challenge.id, label: challenge.name, sectorId: sector.id, detail: `${objective.requireSuccess ? "Success required" : "Resolution required"}; ${player.character.activeContract?.progress ?? 0}/${objective.target}.` })));
}

export function createPhoneProjection(
  state: GameState,
  seatId: string,
  forcePrivate = false,
  characterCatalog: Map<string, AuthoredCharacter> = loadCharacters()
): Record<string, unknown> {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const seat = state.seats.find((entry) => entry.seatId === seatId) ?? null;
  const publicProjection = createTvProjection(state);
  const startingContractOptions =
    seat?.startingContractOptions
      .map((contractId) => state.availableContracts.find((contract) => contract.id === contractId))
      .filter((contract): contract is ContractCard => Boolean(contract)) ?? [];
  const selectedStartingContract =
    seat?.selectedStartingContractId
      ? state.availableContracts.find((contract) => contract.id === seat.selectedStartingContractId) ?? null
      : null;
  const startingBonusOptions: import("../client/shared/types.js").StartingBonusOption[] = [];
  for (const option of seat?.startingBonusOfferOptions ?? []) {
    if (option.kind === "gear") {
      const item = PROJECTION_GEAR_CATALOG.get(option.id);
      if (item) startingBonusOptions.push({ kind: "gear", item });
      continue;
    }
    const follower = PROJECTION_FOLLOWER_CATALOG.get(option.id);
    if (follower) startingBonusOptions.push({ kind: "follower", follower });
  }
  const startingBonusSelection =
    seat?.startingBonusOfferId && (seat.startingBonusOfferOptions?.length ?? 0) > 0
      ? {
          offerId: seat.startingBonusOfferId,
          pickNumber: Math.min(2, (seat.startingBonusSelections?.length ?? 0) + 1) as 1 | 2,
          totalPicks: 2 as const,
          options: startingBonusOptions
        }
      : null;
  const activeMissionStates = player ? getActiveMissions(player.character) : [];
  const activeContractCards = activeMissionStates
    .map((activeMission) =>
      state.availableContracts.find((contract) => contract.id === activeMission.contractId)
    )
    .filter((contract): contract is ContractCard => Boolean(contract));
  const activeContractCard = activeContractCards[0] ?? null;
  const pendingMissionSelection = state.pendingMissionSelection?.ownerSeatId === seatId ? {
    id: state.pendingMissionSelection.id,
    completedContractId: state.pendingMissionSelection.completedContractId,
    sourceKind: state.pendingMissionSelection.sourceKind,
    sourceId: state.pendingMissionSelection.sourceId,
    sourceTitle: state.pendingMissionSelection.sourceTitle,
    status: state.pendingMissionSelection.status,
    options: state.pendingMissionSelection.optionIds
      .map((contractId) => state.availableContracts.find((contract) => contract.id === contractId))
      .filter((contract): contract is ContractCard => Boolean(contract))
  } : null;
  const pendingMissionRelicExchange =
    state.pendingMissionRelicExchange?.ownerSeatId === seatId
      ? {
          id: state.pendingMissionRelicExchange.id,
          status: state.pendingMissionRelicExchange.status,
          selectedMissionIds: state.pendingMissionRelicExchange.selectedMissionIds,
          options: state.pendingMissionRelicExchange.optionIds
            .map((artifactId) => PROJECTION_GEAR_CATALOG.get(artifactId))
            .filter((artifact): artifact is GearItem => Boolean(artifact))
        }
      : null;
  const reservationSeatId = state.seats.find((candidate) =>
    Boolean(candidate.displayName) && !candidate.kicked && resolveNamedPlayerRules({ displayName: candidate.displayName }).forcedCharacterId === NAMED_PLAYER_POPELORD_ID
  )?.seatId ?? null;
  const characterOptions = [...characterCatalog.values()].flatMap((character) => {
    const eligibility = canNamedPlayerSelectCharacter({ displayName: seat?.displayName }, character, {
      popelordReservedForOther: character.id === NAMED_PLAYER_POPELORD_ID && Boolean(reservationSeatId && reservationSeatId !== seatId)
    });
    if (character.qaOnly && !eligibility.allowed) return [];
    const presentation = getCharacterPresentation(character.id);
    return [{
      character: {
        ...character,
        ...(presentation ? { presentation } : {}),
        activeContract: character.activeContract ? { ...character.activeContract } : null,
        heldGear: [...character.heldGear],
        equippedGear: { ...character.equippedGear },
        followers: [...(character.followers ?? [])],
        abilities: [...character.abilities],
        scars: [...character.scars],
        trophyPile: [...(character.trophyPile ?? [])]
      },
      eligible: eligibility.allowed,
      disabledReason: eligibility.reason,
      ...(character.qaOnly ? { developerQa: true } : {})
    }];
  });
  const readyDisabledReason = getReadyDisabledReasonForSeat(state, seat, characterCatalog);
  const lateJoinPending = Boolean(
    state.status === "active" &&
    seat?.displayName &&
    !seat.kicked &&
    !state.turnOrder.includes(seatId)
  );
  const oathchain = player?.character.heldGear.find((item) => item.id === "oathchain-lens" && item.chargedEffect === "traceThePromise" && item.instanceId && (item.currentCharges ?? item.charges ?? 0) > 0 && player.character.equippedGear.utility === item.id);
  const oathchainSignature = player && activeContractCard && player.character.activeContract ? getOathchainContractSignature(player, activeContractCard) : null;
  const oathchainTargets = player && activeContractCard ? deriveOathchainTargets(state, player, activeContractCard) : [];
  const oathchainEligible = Boolean(oathchain && activeContractCard && oathchainSignature && state.phase === "action" && state.turnOrder[state.activeSeatIndex] === seatId && oathchainTargets.length > 0 && player?.private.activeOathchainReveal?.contractSignature !== oathchainSignature);
  const pendingSuppression = state.pendingEquipmentSuppressionChoice?.ownerSeatId === seatId
    ? state.pendingEquipmentSuppressionChoice
    : null;
  const eligibleSuppressionTargets = pendingSuppression
    ? getEligibleEquipmentSuppressionTargets(state, seatId).filter((item) => pendingSuppression.eligibleInstanceIds.includes(item.instanceId!))
    : [];
  const pendingMemoryTaxChoice = state.pendingMemoryTaxChoice?.ownerSeatId === seatId
    ? state.pendingMemoryTaxChoice
    : null;
  const pendingAfflictionResolution = state.pendingAfflictionResolution?.ownerSeatId === seatId
    ? state.pendingAfflictionResolution
    : null;
  const pendingAfflictionReaction = state.pendingAfflictionReaction?.ownerSeatId === seatId
    ? state.pendingAfflictionReaction
    : null;
  const pendingGearEquipChoice = state.pendingGearEquipChoice?.ownerSeatId === seatId
    ? state.pendingGearEquipChoice
    : null;
  const phoneMovementPlanner = buildPhoneMovementPlanner(state, seatId);
  const tierTransitions = (() => {
    if (
      !player ||
      player.character.status !== "active" ||
      state.status !== "active" ||
      state.phase !== "navigation" ||
      state.turnOrder[state.activeSeatIndex] !== seatId ||
      state.movementRolls?.[seatId]
    ) return null;

    const voidKey = player.character.heldGear.find((item) =>
      item.id === "void-key" &&
      player.character.equippedGear.utility === item.id &&
      (item.currentCharges ?? item.charges ?? 0) > 0
    );
    const options = buildTierTransitionOptions(state, seatId).map((transition) => ({
      sectorId: transition.sectorId,
      name: state.sectors.find((sector) => sector.id === transition.sectorId)?.name ?? transition.sectorId,
      direction: transition.direction,
      fromRing: getPublicRing(transition.fromRing),
      toRing: getPublicRing(transition.toRing),
      label: transition.label,
      disabledReason: transition.disabledReason,
      voidKeyPrompt:
        transition.disabledReason &&
        voidKey &&
        canVoidKeyOverrideTierTransition(state, seatId, transition.sectorId)
          ? {
              instanceId: voidKey.instanceId!,
              currentCharges: voidKey.currentCharges ?? voidKey.charges ?? 0,
              maxCharges: voidKey.maxCharges ?? 2,
              chargeCost: 1 as const
            }
          : undefined
    }));
    return options.length > 0
      ? { revision: state.movementRouteRevisions?.[seatId] ?? 0, options }
      : null;
  })();
  const transitionRouteAid = (() => {
    if (
      !player ||
      state.status !== "active" ||
      state.phase !== "navigation" ||
      state.turnOrder[state.activeSeatIndex] !== seatId ||
      state.movementRolls?.[seatId]
    ) return null;
    const sources = [
      ...player.character.heldGear.flatMap((item) => {
        const charges = item.currentCharges ?? item.charges ?? 0;
        return item.chargedEffect === "selectTransitionSector" &&
          item.instanceId &&
          player.character.equippedGear.utility === item.id &&
          charges > 0
          ? [{
              sourceKind: "gear" as const,
              instanceId: item.instanceId,
              name: item.name,
              currentCharges: charges,
              maxCharges: item.maxCharges ?? 2
            }]
          : [];
      }),
      ...(player.character.followers ?? []).flatMap((follower) => {
        const charges = follower.currentCharges ?? follower.startingCharges ?? 0;
        return follower.chargedEffect === "selectTransitionSector" &&
          follower.instanceId &&
          charges > 0
          ? [{
              sourceKind: "follower" as const,
              instanceId: follower.instanceId,
              name: follower.name,
              currentCharges: charges,
              maxCharges: follower.maxCharges ?? 2
            }]
          : [];
      })
    ];
    if (sources.length === 0) return null;
    return {
      revision: state.movementRouteRevisions?.[seatId] ?? 0,
      sources,
      destinations: buildTransitionRouteAidDestinations(state, seatId).map((destination) => ({
        ...destination,
        name: state.sectors.find((sector) => sector.id === destination.sectorId)?.name ?? destination.sectorId,
        routeNames: destination.route.map((sectorId) =>
          state.sectors.find((sector) => sector.id === sectorId)?.name ?? sectorId
        )
      }))
    };
  })();
  const phoneShopEncounter = buildPublicShopEncounter(state, state.players, seatId);
  const privateCardReveal = buildPrivateCardReveal(state, seatId);
  const privateRivalry = buildPrivateRivalryProjection(state, player) as import("../client/shared/types.js").PrivateRivalryPayload | null;
  const ownerPrivateResult: import("../client/shared/types.js").OwnerPrivateMatchResult | null =
    state.status === "ended" && privateRivalry
      ? {
          id: `private-result:${state.scenarioResult.achievedAtSequence ?? state.sequence}`,
          label: "Private Agenda",
          summary: privateRivalry.scoring?.completionSummary
            ?? (privateRivalry.revealState === "completed"
              ? "Your private Agenda was completed."
              : privateRivalry.revealState === "failed"
                ? "Your private Agenda was not completed."
                : "Your private Agenda remains protected."),
          agendaState: privateRivalry.revealState,
          pointsAwarded: privateRivalry.scoring?.pointsAwarded ?? null
        }
      : null;
  const edgeCards = (player?.private.hand ?? [])
    .map((cardId) => EDGE_CARD_BY_ID.get(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const edgeHandLimit = player
    ? getEdgeHandLimit({
        completedContracts: player.character.completedContracts?.length ?? 0,
        ownedArtifacts: player.character.heldGear.filter((item) => item.tier === "artifact").length
      })
    : EDGE_RULES.baseHandLimit;
  const edgeResolutionId =
    state.phase === "action" &&
    state.turnOrder[state.activeSeatIndex] === seatId &&
    state.activeResolution?.playerId === seatId &&
    state.activeResolution.stage === "battle_setup" &&
    (state.currentEncounter?.cardType === "enemy" ||
      state.currentEncounter?.cardType === "hazard")
      ? state.activeResolution.id
      : null;
  const edgeCommitDisabledReason = !edgeResolutionId
    ? "Available during your battle or hazard setup."
    : state.pendingEdgeCommit ||
        state.pendingEdgeAbility ||
        state.lastEdgeCardPlay?.resolutionId === edgeResolutionId
      ? "One Edge Card is already committed to this roll."
      : edgeCards.length === 0
        ? "No Edge Cards in hand."
        : null;

  return stripLegacyHeatProjection({
    phase: state.phase,
    status: state.status,
    requiredAction: buildRequiredActionProjection(state, seatId, {
      movementActive: Boolean(phoneMovementPlanner?.active),
      movementSelected: Boolean(phoneMovementPlanner?.selectedDestinationId),
      tierTransitionAvailable: Boolean(
        tierTransitions?.options.some((transition) => !transition.disabledReason || transition.voidKeyPrompt)
      ),
      shopActive: Boolean(
        phoneShopEncounter &&
        phoneShopEncounter.status !== "locked" &&
        phoneShopEncounter.blocked !== true
      )
    }),
    sessionMode: state.sessionMode,
    gameMode: state.gameMode,
    interactionMode: state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry"),
    setupHostSeatId: publicProjection.setupHostSeatId,
    lobbyConfigured: publicProjection.lobbyConfigured,
    hostPhoneConnected: publicProjection.hostPhoneConnected,
    setup: publicProjection.setup,
    selfIsSetupHost: state.setupHostSeatId === seatId,
    characterOptions,
    cooperativeAssistance: buildCooperativeAssistanceProjection(state, seatId),
    cooperativeAssistanceEligibility: buildCooperativeAssistanceEligibility(state, seatId),
    characterAbilityAction: buildCinderWattleAbilityProjection(state, seatId),
    pendingCooperativeTest: publicProjection.pendingCooperativeTest,
    brokenConcordanceNode: state.activeScenarioId === BROKEN_CONCORDANCE_SCENARIO_ID && player
      ? (() => {
          const node = BROKEN_CONCORDANCE_NODES.find((entry) => entry.sectorId === player.character.currentSpaceId);
          return node
            ? {
                ...node,
                stabilized: state.scenarioPreparation.completedObjectiveIds.includes(node.id),
                available:
                  state.turnOrder[state.activeSeatIndex] === seatId &&
                  state.phase === "action" &&
                  !state.currentEncounter &&
                  !state.activeResolution &&
                  !state.scenarioPreparation.completedObjectiveIds.includes(node.id)
              }
            : null;
        })()
      : null,
    winnerSeatId: state.winnerSeatId,
    activeScenario: publicProjection.activeScenario,
    scenarioTelemetry: publicProjection.scenarioTelemetry,
    scenarioPressure: publicProjection.scenarioPressure,
    scenarioState: publicProjection.scenarioState,
    matchProgress: publicProjection.matchProgress,
    ownerPrivateResult,
    scenarioProgress: publicProjection.scenarioProgress,
    pendingScarChoiceStatus: publicProjection.pendingScarChoiceStatus,
    nemesisChampions: publicProjection.nemesisChampions,
    nemesisNexusCountdowns: publicProjection.nemesisNexusCountdowns,
    activeSeatIndex: state.activeSeatIndex,
    seats: (publicProjection.seats as Array<Record<string, unknown>>).map((projectedSeat) =>
      projectedSeat.seatId === seatId && seat
        ? { ...projectedSeat, characterSelected: seat.characterSelected ?? Boolean(seat.characterId) }
        : projectedSeat
    ),
    turnOrder: publicProjection.turnOrder,
    sectors: publicProjection.sectors,
    players: publicProjection.players,
    objectUseStates: buildPhoneObjectUseStates(state, player, Boolean(phoneMovementPlanner?.selectedDestinationId)),
    pendingEquipmentSuppressionChoice: pendingSuppression ? {
      choiceId: pendingSuppression.choiceId,
      sourceTitle: pendingSuppression.sourceThreatId === "relay-husk" ? "Relay Husk" : "Signal-Rotted Engineer",
      prompt: "Choose Equipment to suppress" as const,
      mode: pendingSuppression.mode,
      options: eligibleSuppressionTargets.map((item) => ({
        instanceId: item.instanceId!,
        catalogId: item.id,
        name: item.name,
        slot: item.slot,
        equipped: true as const
      }))
    } : null,
    pendingGearEquipChoice: pendingGearEquipChoice && player ? {
      choiceId: pendingGearEquipChoice.choiceId,
      itemCatalogId: pendingGearEquipChoice.itemCatalogId,
      itemInstanceId: pendingGearEquipChoice.itemInstanceId,
      itemName: player.character.heldGear.find((item) => item.instanceId === pendingGearEquipChoice.itemInstanceId)?.name ?? pendingGearEquipChoice.itemCatalogId,
      slot: pendingGearEquipChoice.slot,
      currentItemCatalogId: pendingGearEquipChoice.currentItemCatalogId,
      currentItemInstanceId: pendingGearEquipChoice.currentItemInstanceId,
      currentItemName: player.character.heldGear.find((item) => item.instanceId === pendingGearEquipChoice.currentItemInstanceId)?.name ?? pendingGearEquipChoice.currentItemCatalogId
    } : null,
    pendingMemoryTaxChoice: publicProjection.pendingMemoryTaxChoice,
    pendingAfflictionStatus: publicProjection.pendingAfflictionStatus,
    pendingAfflictionChoicePrivate:
      pendingAfflictionResolution?.status === "awaitingStatChoice"
        ? {
            resolutionId: pendingAfflictionResolution.id,
            sourceTitle: "Runaway Growth",
            prompt: "Choose one stat to gain +1 before the draw resolves.",
            options: [...STAT_VALUES]
          }
        : null,
    pendingAfflictionReactionPrivate: pendingAfflictionReaction
      ? {
          reactionId: pendingAfflictionReaction.id,
          afflictionId: pendingAfflictionReaction.afflictionId,
          kind: pendingAfflictionReaction.kind,
          originalRoll: pendingAfflictionReaction.originalRoll,
          lockedDieIndices:
            pendingAfflictionReaction.kind !== "arrivalWound" &&
            state.lastEdgeCardPlay?.seatId === seatId &&
            state.lastEdgeCardPlay.mode === "commit-value"
              ? [0]
              : [],
          targetSeatId: pendingAfflictionReaction.targetSeatId,
          targetName: pendingAfflictionReaction.targetSeatId
            ? getProjectedPlayerName(state, pendingAfflictionReaction.targetSeatId)
            : null
        }
      : null,
    pendingMemoryTaxChoicePrivate: pendingMemoryTaxChoice ? {
      choiceId: pendingMemoryTaxChoice.choiceId,
      choiceVersion: pendingMemoryTaxChoice.choiceVersion,
      sourceTitle: "Memory Tax Gate",
      prompt: "Choose what the gate takes",
      options: pendingMemoryTaxChoice.legalOptionIds.map((optionId) => ({
        optionId,
        label: optionId === "lose-salvage-1" ? "Lose 1 Salvage" : "Next non-battle test: -1",
        detail: optionId === "lose-salvage-1"
          ? "Lose exactly 1 Salvage now."
          : "Suffer -1 on your next non-battle test."
      }))
    } : null,
    equipmentSuppressions: (state.equipmentSuppressions ?? [])
      .filter((entry) => entry.ownerSeatId === seatId)
      .map((entry) => ({
        sourceThreatId: entry.sourceThreatId,
        itemInstanceId: entry.itemInstanceId,
        itemCatalogId: entry.itemCatalogId,
        mode: entry.mode,
        active: true as const
      })),
    escalationLevel: publicProjection.escalationLevel,
    escalationThreshold: publicProjection.escalationThreshold,
    escalationModifier: publicProjection.escalationModifier,
    availableContracts: state.availableContracts,
    encounter: state.currentEncounter ? {
      ...state.currentEncounter,
      presentationType: getThreatPresentationCategory(state.currentEncounter)
    } : null,
    pendingEnemyRoll: state.pendingEnemyRoll,
    pendingTileChallenge: publicProjection.pendingTileChallenge,
    tileArrival: publicProjection.tileArrival,
    pendingTestModifiers: [
      ...(state.pendingNextNonBattleTestModifiers ?? [])
        .filter((entry) => entry.ownerSeatId === seatId)
        .map((entry) => ({
        type: entry.type,
        sourceCardId: entry.sourceCardId,
        label: entry.sourceCardId === "glass-chime-swarm"
          ? "Glass-Chime Swarm"
          : entry.sourceCardId === "memory-tax-gate"
            ? "Memory Tax Gate"
            : "Siren Relay Echo",
        summary: entry.sourceCardId === "glass-chime-swarm"
          ? "Next non-battle test: -1"
          : entry.sourceCardId === "memory-tax-gate"
            ? "Next non-battle test: -1"
          : `Next non-battle Command test: ${entry.amount > 0 ? "+" : ""}${entry.amount}`,
        detail: entry.sourceCardId !== "glass-chime-swarm" && entry.boundTestResolutionId ? "In resolution" : undefined,
        amount: entry.amount
        })),
      ...(state.pendingNextNormalMovementRollModifiers ?? [])
        .filter((entry) => entry.ownerSeatId === seatId)
        .map((entry) => ({
          type: entry.type,
          sourceCardId: entry.sourceCardId,
          label: "Spindle Static Squall",
          summary: "Next normal movement roll: -1",
          detail: "Minimum result: 1",
          amount: entry.amount
        }))
    ],
    pendingTileChallengePrivate: state.pendingTileChallenge?.seatId === seatId ? {
      id: state.pendingTileChallenge.id,
      challengeId: state.pendingTileChallenge.challengeId,
      sectorId: state.pendingTileChallenge.sectorId,
      seatId: state.pendingTileChallenge.seatId,
      challengeType: state.pendingTileChallenge.challengeType,
      testStat: state.pendingTileChallenge.testStat,
      difficulty: state.pendingTileChallenge.difficulty,
      authoredOrder: state.pendingTileChallenge.authoredOrder,
      totalChallenges: state.pendingTileChallenge.totalChallenges,
      rolled: state.pendingTileChallenge.rolled,
      staticIntercessionReactionId: state.pendingStaticIntercessionReaction?.pendingTileChallengeId === state.pendingTileChallenge.id
        ? state.pendingStaticIntercessionReaction.id
        : undefined,
      pendingFailureEffects: state.pendingTileChallenge.challengeType === "anomaly" && state.pendingTileChallenge.rolled && state.activeResolution?.roll?.success === false
        ? getPendingFailureEffectChoices(state)
        : undefined
    } : null,
    pendingScarConsequence: state.pendingScarConsequence?.seatId === seatId ? {
      reactionId: state.pendingScarConsequence.reactionId,
      scarInstanceId: state.pendingScarConsequence.scarInstanceId,
      scarCardId: state.pendingScarConsequence.scarCardId,
      scarTitle: state.pendingScarConsequence.scarTitle,
      triggerType: state.pendingScarConsequence.triggerType,
      sourceEventId: state.pendingScarConsequence.sourceEventId,
      pendingEffects: state.pendingScarConsequence.pendingEffects.map((entry) => ({
        effectId: entry.effectId,
        summary: summarizeTileChallengeEffect(entry.effect)
      })),
      rulesText: "Continue to resolve this Scar consequence."
    } : null,
    pendingScarChoice: state.pendingScarChoice?.ownerSeatId === seatId ? {
      selectionId: state.pendingScarChoice.selectionId,
      source: state.pendingScarChoice.source,
      sourceCardId: state.pendingScarChoice.sourceCardId,
      cards: summarizeScars(state.pendingScarChoice.candidateIds),
      currentCount: player?.character.scars.length ?? 0,
      thirdScarWarning: (player?.character.scars.length ?? 0) >= 2
    } : null,
    pendingScarRemovalChoice: state.pendingScarRemovalChoice?.ownerSeatId === seatId ? {
      choiceId: state.pendingScarRemovalChoice.choiceId,
      salvageCost: 4 as const,
      cards: summarizeScars(state.pendingScarRemovalChoice.scarIds)
    } : null,
    scarAdaptationControls: getOwnedScarAdaptationControls(state, seatId).map((control) => ({
      activationId: control.activationId,
      scarId: control.scarId,
      scarName: control.scarName,
      ruleKey: control.ruleKey,
      timing: control.timing,
      effectText: control.effectText,
      limit: control.limit,
      remainingUses: control.remainingUses,
      enabled: control.enabled,
      disabledReason: control.disabledReason,
      targets: control.targets
    })),
    scarAdaptationResult: (() => {
      const event = [...state.eventLog].reverse().find((entry) => {
        const candidate = entry as { type?: string; seatId?: string };
        return candidate.type === "SCAR_ADAPTATION_ACTIVATED" && candidate.seatId === seatId;
      }) as { scarName?: string; summary?: string } | undefined;
      return event?.scarName && event.summary ? { scarName: event.scarName, summary: event.summary } : null;
    })(),
    pendingEncounterDecision: publicProjection.pendingEncounterDecision,
    pendingEncounterDecisionPrivate: state.pendingEncounterDecision?.seatId === seatId ? {
      decisionId: state.pendingEncounterDecision.decisionId,
      decisionVersion: state.pendingEncounterDecision.decisionVersion,
      sourceTitle: state.currentEncounter?.title ?? "Encounter payment",
      prompt: state.pendingEncounterDecision.prompt,
      mode: state.pendingEncounterDecision.mode,
      salvageCost: state.pendingEncounterDecision.salvageCost,
      currentSalvage: player?.character.salvage ?? 0,
      options: state.pendingEncounterDecision.legalOptionIds.map((optionId) => {
        const isPaid = optionId === state.pendingEncounterDecision!.paidOptionId;
        const enabled = !isPaid || (player?.character.salvage ?? 0) >= state.pendingEncounterDecision!.salvageCost;
        return {
          optionId,
          label: isPaid ? state.pendingEncounterDecision!.paidLabel : state.pendingEncounterDecision!.declineLabel ?? "Continue",
          enabled,
          disabledReason: enabled ? undefined : `Requires ${state.pendingEncounterDecision!.salvageCost} Salvage`
        };
      })
    } : null,
    pendingDisplacement: publicProjection.pendingDisplacement,
    pendingForcedDestinationChoice: publicProjection.pendingForcedDestinationChoice,
    pendingForcedDestinationChoicePrivate: state.pendingForcedDestinationChoice?.ownerSeatId === seatId ? {
      choiceId: state.pendingForcedDestinationChoice.choiceId,
      sourceTitle: state.currentEncounter?.title ?? "False-Route Procession",
      sourceSectorId: state.pendingForcedDestinationChoice.sourceSectorId,
      candidates: state.pendingForcedDestinationChoice.candidates.map((candidate) => ({
        sectorId: candidate.sectorId,
        sectorName: state.sectors.find((sector) => sector.id === candidate.sectorId)?.name ?? candidate.sectorId,
        direction: candidate.direction,
        ring: state.pendingForcedDestinationChoice!.ring
      }))
    } : null,
    pendingDisplacementPrivate: state.pendingDisplacement?.seatId === seatId ? {
      reactionId: state.pendingDisplacement.reactionId,
      sourceEventId: state.pendingDisplacement.sourceEventId,
      sourceTitle: state.currentEncounter?.title ?? "Forced displacement",
      originSectorId: state.pendingDisplacement.originSectorId,
      originSectorName: state.sectors.find((sector) => sector.id === state.pendingDisplacement!.originSectorId)?.name ?? state.pendingDisplacement.originSectorId,
      destinationSectorId: state.pendingDisplacement.destinationSectorId,
      destinationSectorName: state.sectors.find((sector) => sector.id === state.pendingDisplacement!.destinationSectorId)?.name ?? state.pendingDisplacement.destinationSectorId,
      prompt: "Accept the authoritative forced displacement or use an eligible reaction.",
      riftAnchorSpike: (() => {
        const spikes = (player?.character.heldGear ?? []).filter((item) => item.id === "rift-anchor-spike" && item.chargedEffect === "suppressForcedDisplacement" && item.instanceId);
        const spike = spikes.find((item) => (item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) > 0) ?? spikes[0];
        if (!spike?.instanceId) return null;
        const charges = spike.currentCharges ?? spike.charges ?? spike.startingCharges ?? 0;
        const equipped = player?.character.equippedGear.utility === spike.id;
        return {
          instanceId: spike.instanceId,
          currentCharges: charges,
          maxCharges: spike.maxCharges ?? 2,
          chargeCost: 1 as const,
          enabled: charges > 0 && equipped,
          disabledReason: charges <= 0 ? "Rift Anchor Spike is Depleted." : !equipped ? "Rift Anchor Spike must be equipped." : undefined
        };
      })()
    } : null,
    outcomeSummary: state.lastOutcomeSummary,
    rivalryAgendaCompletion: publicProjection.rivalryAgendaCompletion,
    rivalryAgendaReveal: publicProjection.rivalryAgendaReveal,
    publicResultDeltas: publicProjection.publicResultDeltas,
    publicCardReveal: publicProjection.publicCardReveal,
    playerResultDeltas: buildPlayerResultDeltas(
      state,
      seatId,
      (publicProjection.publicResultDeltas as ResultDelta[] | undefined) ?? [],
      publicProjection.shopEncounter as Record<string, unknown> | null
    ),
    privateCardReveal,
    activeResolution: projectActiveResolutionForViewer(state, seatId),
    battlePresentation: buildBattlePresentation(state, seatId),
    shopEncounter: phoneShopEncounter,
    recentAbilityTriggers: publicProjection.recentAbilityTriggers,
    nemesis: publicProjection.nemesis,
    movementPlanner: phoneMovementPlanner,
    innerApproach: buildPublicInnerApproach(state, seatId),
    tierTransitions,
    transitionRouteAid,
    sectorExplorationSummary: buildPublicSectorExplorationSummary(state, seatId),
    privateRivalry,
    soloReroll: buildSoloRerollProjection(state, seatId),
    edgeHand: {
      cards: edgeCards.map((card) => {
        const ability = getEdgeAbilityAvailability(state, seatId, card);
        return {
          id: card.id,
          name: card.name,
          edgeValue: card.edgeValue,
          commitText: `Lock ${card.edgeValue} as one die; the server rolls the other die.`,
          abilityText: card.abilityText,
          tradeoffText: card.tradeoffText,
          ability: {
            label: card.abilityLabel,
            enabled: ability.enabled,
            disabledReason: ability.disabledReason,
            resolutionId: ability.resolutionId,
            targets: ability.targets
          }
        };
      }),
      limit: edgeHandLimit,
      awardRule: EDGE_RULES.awardRule,
      canCommit: edgeCommitDisabledReason === null,
      disabledReason: edgeCommitDisabledReason,
      resolutionId: edgeResolutionId,
      reaction:
        state.pendingEdgeReaction?.ownerSeatId === seatId
          ? {
              id: state.pendingEdgeReaction.id,
              prompt: "Use one eligible Edge ability or continue with the rolled result."
            }
          : null
    },
    boundNemesis: (publicProjection.nemesisChampions as Array<{ boundPlayerId: string }>).find(
      (champion) => champion.boundPlayerId === seatId
    ) ?? null,
    crownKeyFragments: getCrownKeyFragmentCount(state, seatId),
    eligibleNemesisAssistSeatIds: state.nemesisChampions.flatMap((champion) =>
      champion.defeated ? [] : getEligibleAssistSeatIds(state, seatId, champion)
    ),
    startingContractOptions,
    selectedStartingContract,
    startingBonusSelection,
    startingBonusPickCount: seat?.startingBonusSelections?.length ?? 0,
    activeContractCard,
    activeContractCards,
    pendingMissionSelection,
    pendingMissionRelicExchange,
    heldMissionRewardCount: (state.pendingMissionRewards ?? []).filter(
      (reward) => reward.ownerSeatId === seatId
    ).length,
    oathchainPrompt: oathchainEligible && oathchain && oathchainSignature ? { instanceId: oathchain.instanceId, contractId: activeContractCard!.id, contractSignature: oathchainSignature, currentCharges: oathchain.currentCharges ?? oathchain.charges ?? 0, maxCharges: oathchain.maxCharges ?? 2, chargeCost: 1, preview: "Spend 1 charge to reveal current valid Contract targets." } : null,
    activeOathchainReveal: player?.private.activeOathchainReveal?.contractSignature === oathchainSignature && state.phase === "action" && state.turnOrder[state.activeSeatIndex] === seatId ? player.private.activeOathchainReveal : null,
    lateJoinPending,
    canReady: readyDisabledReason === null,
    readyDisabledReason,
    self:
      player &&
      seat &&
      (seat.characterSelected !== false || (state.status === "active" && state.turnOrder.includes(seatId)))
        ? sanitizePlayerForPhone(player)
        : null
  });
}

function getReadyDisabledReasonForSeat(
  state: GameState,
  seat: GameState["seats"][number] | null,
  characterCatalog: Map<string, AuthoredCharacter>
): string | null {
  if (!seat || seat.kicked) {
    return "Join a seat before Ready";
  }

  if (!seat.displayName) {
    return "Join the room before Ready";
  }

  if (!seat.characterId || seat.characterSelected === false) {
    return "Choose a character before Ready";
  }

  const selected = characterCatalog.get(seat.characterId);
  if (!selected) return "Choose a valid operative before Ready";
  const reservationSeatId = state.seats.find((candidate) =>
    Boolean(candidate.displayName) && !candidate.kicked && resolveNamedPlayerRules({ displayName: candidate.displayName }).forcedCharacterId === NAMED_PLAYER_POPELORD_ID
  )?.seatId ?? null;
  const eligibility = canNamedPlayerSelectCharacter({ displayName: seat.displayName }, selected, {
    popelordReservedForOther: selected.id === NAMED_PLAYER_POPELORD_ID && Boolean(reservationSeatId && reservationSeatId !== seat.seatId)
  });
  if (!eligibility.allowed) return eligibility.reason;

  if (!seat.selectedStartingContractId) {
    return "Choose a starting Contract before Ready";
  }

  if (!hasCompletedStartingBonusSelection(seat)) {
    return "Choose two starting bonuses before Ready";
  }

  return null;
}

function sanitizePlayerForPhone(player: PlayerState): Record<string, unknown> {
  return {
    seatId: player.seatId,
    character: {
      ...player.character,
      ...(getCharacterPresentation(player.character.id) ? { presentation: getCharacterPresentation(player.character.id) } : {}),
      scarCards: summarizeScars(player.character.scars),
      afflictions: summarizeAfflictions(player, getAfflictionCatalogForPlayer())
    },
    sectorId: player.character.currentSpaceId,
    hand: player.private.hand,
    notes: player.private.notes,
    noteResources: player.private.noteResources
  };
}

function getAfflictionCatalog(state: Pick<GameState, "availableAfflictions">): Map<string, AfflictionCard> {
  const catalog = new Map(AFFLICTION_CARDS);

  for (const card of state.availableAfflictions ?? []) {
    catalog.set(card.id, card);
  }

  return catalog;
}

function getAfflictionCatalogForPlayer(): Map<string, AfflictionCard> {
  return new Map(AFFLICTION_CARDS);
}

function summarizeScars(scarIds: string[]): Array<Pick<ScarCard, "id" | "title" | "text" | "trigger" | "penalty" | "relief" | "upside" | "source" | "origin" | "burdenText" | "adaptationText" | "artwork">> {
  return scarIds.map((scarId) => {
    const scar = SCAR_CARDS.get(scarId);

    return scar
      ? {
          id: scar.id,
          title: scar.title,
          text: scar.text,
          trigger: scar.trigger,
          penalty: scar.penalty,
          relief: scar.relief,
          upside: scar.upside,
          source: scar.source,
          origin: scar.origin,
          burdenText: scar.burdenText,
          adaptationText: scar.adaptationText,
          artwork: scar.artwork
        }
      : {
          id: scarId,
          title: scarId,
          text: "Unknown scar record.",
          trigger: "When this scar is referenced.",
          penalty: "Ask the table to resolve the recorded scar effect.",
          relief: "Confirm the scar catalog contains this id.",
          source: "unbound" as const,
          origin: "Unknown legacy source.",
          burdenText: "No executable Burden is available.",
          adaptationText: "No executable Adaptation is available.",
          artwork: "/assets/placeholders/missing-card.png"
        };
  });
}
