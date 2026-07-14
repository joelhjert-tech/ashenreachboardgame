import { WebSocketServer, type WebSocket } from "ws";
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
  type ThreatEffectResult,
  type ThreatEffectTiming
} from "../game/cards/threatEffects.js";
import { resolveBoardTextChoice, resolveBoardTextEffect, type BoardTextDeckKind } from "../game/data/boardTextEffects.js";
import { nemeses, type NemesisDefinition } from "../game/data/nemeses.js";
import { getScenarioDefinition, type ScenarioDefinition } from "../game/data/scenarios.js";
import { getScenarioSheetArtPath } from "../game/data/scenarioSheetArt.js";
import { getCharacterPresentation, type CharacterPresentation } from "../game/data/characterPresentation.js";
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
import { getSessionStartReadiness } from "../game/rules/sessionStart.js";
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
  getGlobalHeatLevel,
  getNemesisCombatStat,
  getNemesisCombatValue,
  getNemesisMovementStepCount,
  hasCrownKeyFragment
} from "../game/rules/nemesisRelay.js";
import {
  buildMovementRoutePlan,
  getForcedDisplacementDestination,
  getLegalMovementRoute,
  getLegalMovementRouteVariant,
  getMovementBlockReason,
  getVoidKeyMovementRoute
} from "../game/rules/movementPlanner.js";
import { canRiftAnchorSpikeSuppress } from "../game/rules/forcedDisplacement.js";
import { getNextNonBattleTestModifierSource } from "../game/rules/nextNonBattleTestModifier.js";
import {
  getNextNormalMovementRollModifierSource,
  resolveNormalMovementAllowance
} from "../game/rules/nextNormalMovementRollModifier.js";
import { createInitialSessionState } from "./sessionState.js";
import { resolveBoardSpaceEvent } from "../game/tileResolver.js";
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
import { resolveSpaceText } from "../game/rules/tileTextResolver.js";
import { applyStartingLoadout } from "../game/rules/startingLoadout.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  isUpgradeableStat,
  NORMAL_STAT_UPGRADE_CAP
} from "../game/rules/statUpgrades.js";
import type {
  AcceptContractAction,
  CheckRequestedAction,
  CombatRequestedAction,
  CompleteContractAction,
  DiceRollStartedAction,
  EscalationAdvancedAction,
  ClientIntent,
  CombatResolvedAction,
  EncounterDrawnAction,
  EnemyRollAssignedAction,
  EnemyRollRequestedAction,
  EquipGearAction,
  GameAction,
  MovementResolvedAction,
  MovementRolledAction,
  MoveRequestedAction,
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
  ShopSellResolvedAction,
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
  RollModifierSource
} from "../game/engine/actions.js";
import { getEquippedGearModifierSources } from "../game/engine/gear.js";
import { getMovementProfile } from "../game/rules/movementPhase.js";
import type { AnomalyCard, ArtifactCard, EncounterEffect, EscalationCard, ScarCard, ThreatCard } from "../game/schema/card.schema.js";
import type { AuthoredCharacter, Character } from "../game/schema/character.schema.js";
import type { Stat } from "../game/schema/character.schema.js";
import type { ContractCard } from "../game/schema/contract.schema.js";
import type { Follower } from "../game/schema/follower.schema.js";
import type { GearItem, ShopCategory } from "../game/schema/gear.schema.js";
import type { AfflictionCard } from "../game/schema/affliction.schema.js";
import { rollDice, type RandomSource, defaultRandomSource } from "../game/engine/dice.js";
import { reduceGameState } from "../game/engine/reducer.js";
import { CHALLENGE_LABELS } from "../game/ui/challengeTheme.js";
import {
  createEmptyScenarioConfrontationState,
  createEmptyScenarioResultState,
  type ActiveResolution,
  type GameMode,
  type GameState,
  type InteractionMode,
  type NemesisChampion,
  type PlayerState,
  type SessionMode
} from "../game/schema/session.schema.js";
import { validateHostToken, validateJoinToken } from "./auth.js";
import { BOARD_SPACES, getBoardSpace, isScenarioConfrontationSpace, type BoardTier, type ThreatIcon } from "../game/data/boardSpaces.js";

export const ESCALATION_FEEDERS = {
  woundTaken: 1,
  trophyDiscarded: 1
} as const;

const RAISE_STAT_FEEDS_ESCALATION = false;
const RAISE_STAT_ESCALATION_REASON = "forged in fire";
const ENEMY_ROLL_TIMEOUT_MS = 30_000;
const RESOLUTION_AUTO_CONTINUE_MS = process.env.VITEST ? 1 : 10000;
const VISIBLE_DICE_ROLL_MS = process.env.VITEST ? 0 : 650;
const FANDIABLOS_ID = "fandiablos";
const MASTER_ALPHA_ID = "char_master_alpha";
// Save compatibility only: the user-facing relic has long been Scar-Sink Prayer.
const LEGACY_SCAR_SINK_PRAYER_ID = "heat-sink-prayer";
const RECENT_ENCOUNTER_LIMIT = 12;
const STARTING_CONTRACT_OPTION_COUNT = 3;

const NEMESIS_OPPOSITION = {
  strength: { attackStat: "grit", label: "Overpower" },
  willpower: { attackStat: "signal", label: "Outlast" },
  cunning: { attackStat: "guile", label: "Outwit" }
} as const;

const CONFRONTATION_BASE_DIFFICULTY = 6;
const SCAR_CARDS = loadScarCards();
const AFFLICTION_CARDS = loadAfflictionCards();
const PROJECTION_GEAR_CATALOG = loadGear();

const nemesisByScenarioId = new Map<string, NemesisDefinition>(
  nemeses.filter((nemesis) => nemesis.scenarioId).map((nemesis) => [nemesis.scenarioId!, nemesis])
);

function getLinkedNemesis(scenarioId: string | null | undefined): NemesisDefinition | null {
  return scenarioId ? nemesisByScenarioId.get(scenarioId) ?? null : null;
}

function getScenarioProgressThreshold(scenarioId: string | null | undefined, defaultThreshold: number): number {
  return getLinkedNemesis(scenarioId)?.stats.life ?? defaultThreshold;
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

type HostCommandMessage = KickSeatMessage | RestartSessionMessage;
type ClientMessage = ClientIntent | RejoinMessage | HostCommandMessage;

const CLIENT_INTENT_TYPES = new Set<string>([
  "MOVEMENT_DESTINATION_PREVIEWED",
  "MOVE_REQUESTED",
  "ADJUST_MOVEMENT_REQUESTED",
  "SELECT_ROUTE_STAR_VARIANT",
  "ACTIVATE_GATE_SAINT",
  "USE_MARROW_DETOUR",
  "MOVEMENT_ROLL_REQUESTED",
  "PHASE_ADVANCED",
  "CHECK_REQUESTED",
  "COMBAT_REQUESTED",
  "ENEMY_ROLL_REQUESTED",
  "SOLO_REROLL_REQUESTED",
  "CONTINUE_RESOLUTION",
  "ENCOUNTER_DECISION_REQUESTED",
  "FORCED_DISPLACEMENT_ACCEPTED",
  "CONTINUE_SCAR_CONSEQUENCE",
  "SET_READY",
  "SELECT_CHARACTER",
  "SELECT_STARTING_CONTRACT",
  "RECRUIT_REPLACEMENT",
  "EQUIP_GEAR",
  "UNEQUIP_GEAR",
  "USE_GEAR",
  "USE_FOLLOWER",
  "USE_CHARACTER_ABILITY",
  "TABLE_INTERACTION",
  "SHOP_SERVICE_REQUESTED",
  "SHOP_PURCHASE_REQUESTED",
  "SHOP_SELL_REQUESTED",
  "SHOP_SKIP_REQUESTED",
  "ACCEPT_CONTRACT",
  "COMPLETE_CONTRACT",
  "SCENARIO_CONFRONTATION_REQUESTED",
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

export class GameRoomServer {
  private readonly clients = new Set<ConnectedClient>();
  private readonly characters: Map<string, AuthoredCharacter>;
  private readonly contracts: Map<string, ContractCard>;
  private readonly followers: Map<string, Follower>;
  private readonly gear: Map<string, GearItem>;
  private readonly threats: Map<string, ThreatCard>;
  private readonly anomalies: Map<string, AnomalyCard>;
  private readonly artifacts: Map<string, ArtifactCard>;
  private readonly escalations: Map<string, EscalationCard>;
  private hostToken: string | null = null;
  private enemyRollTimeout: ReturnType<typeof setTimeout> | null = null;
  private resolutionAutoContinueTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly movementPreviewBySeatId = new Map<string, { destinationId: string; routeId: string }>();

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
    followers?: Map<string, Follower>
  ) {
    this.threats = threats ?? loadThreatCards();
    this.characters = characters ?? loadCharacters();
    this.gear = gear ?? loadGear();
    this.contracts = contracts ?? loadContracts();
    this.followers = followers ?? loadFollowers();
    this.anomalies = anomalies ?? loadAnomalyCards();
    this.artifacts = artifacts ?? loadArtifactCards();
    this.escalations = escalations ?? loadEscalationCards();
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
        this.adoptPhoneClient(client, false);
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

      if (this.state.status === "ended") {
        throw new IntentRejectedError(intent.type, "Session has ended. Only the host can restart it.");
      }

      if (intent.seatId !== client.seatId) {
        throw new IntentRejectedError(intent.type, "Seat mismatch between token and submitted intent");
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
            (entry) => entry.sectorId === intent.toSectorId && !entry.disabledReason
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

      if (intent.type === "CONTINUE_RESOLUTION") {
        this.resolveContinueResolutionIntent(intent);
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
        this.selectSeatCharacter(intent.seatId, intent.characterId);
        return;
      }

      if (intent.type === "SELECT_STARTING_CONTRACT") {
        this.selectStartingContract(intent.seatId, intent.contractId);
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
      if (intent.type === "ADJUST_MOVEMENT_REQUESTED") {
        this.movementPreviewBySeatId.delete(intent.seatId);
      }
      const action = this.intentToAction(intent);
      this.applyAction(action);

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
        this.maybeTriggerAbilityOnContractAccepted(client.seatId);
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
  }

  joinSeat(displayName: string, characterId?: string, requestedSeatId?: string): JoinSeatResult {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Session already started");
    }

    const seat = requestedSeatId
      ? this.state.seats.find((entry) => entry.seatId === requestedSeatId && !entry.kicked)
      : this.state.seats.find((entry) => !entry.displayName && !entry.kicked);

    if (!seat) {
      throw new Error(requestedSeatId ? `Requested seat ${requestedSeatId} is not available` : "No open seats remain");
    }

    if (seat.displayName) {
      throw new Error(`Requested seat ${seat.seatId} is already occupied`);
    }

    const isFirstHostPhone = !this.state.setupHostSeatId;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      setupHostSeatId: this.state.setupHostSeatId ?? seat.seatId,
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
              connected: true,
              ready: false
            }
          : entry
      )
    };
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

  selectSeatCharacter(seatId: string, characterId: string, options: { suppressBroadcast?: boolean } = {}): void {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Character can only be selected before the session starts");
    }

    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

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

    const characterTaken = this.state.seats.some(
      (entry) => entry.seatId !== seatId && entry.displayName && !entry.kicked && entry.characterSelected !== false && entry.characterId === characterId
    );

    if (characterTaken) {
      throw new Error("Character already taken");
    }

    const seatIndex = Math.max(0, this.state.seats.findIndex((entry) => entry.seatId === seatId));
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

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              characterId,
              characterSelected: true,
              startingContractOptions,
              selectedStartingContractId: null,
              missionSelectedAt: null,
              ready: false
            }
          : entry
      ),
      players: this.state.players.map((player) =>
        player.seatId === seatId
          ? {
              ...player,
              character: {
                ...loadedCharacter,
                currentSpaceId: player.sectorId,
                wounds: 0,
                status: "active",
                trophyPile: [],
                activeContract: null,
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

    const nextState = createInitialSessionState(
      this.state.sessionId,
      input.sessionMode,
      input.scenarioId ?? this.state.activeScenarioId,
      input.interactionMode,
      input.gameMode ?? "standard",
      input.sessionMode === "single-player" ? 1 : input.playerCount,
      { lobbyConfigured: true, setupHostSeatId: seatId }
    );
    const nextHostSeat = nextState.seats.find((entry) => entry.seatId === seatId);

    if (!nextHostSeat) {
      throw new Error("Host Phone seat is not available in the selected game type");
    }

    this.state = {
      ...nextState,
      sequence: this.state.sequence + 1,
      seats: nextState.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              displayName: hostSeat.displayName,
              connected: true,
              joinToken: hostSeat.joinToken,
              characterSelected: false
            }
          : entry
      )
    };
    this.broadcastPatch();
  }

  selectStartingContract(seatId: string, contractId: string): void {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Starting mission can only be selected before the session starts");
    }

    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName) {
      throw new Error("Seat must be joined before choosing a starting mission");
    }

    if (!seat.characterId || seat.characterSelected === false) {
      throw new Error("Choose a character before choosing a starting mission");
    }

    if (seat.selectedStartingContractId) {
      throw new Error("Starting mission already selected");
    }

    if (!this.contracts.has(contractId) || !this.state.availableContracts.some((contract) => contract.id === contractId)) {
      throw new Error("Unknown starting mission");
    }

    if (!seat.startingContractOptions.includes(contractId)) {
      throw new Error("Starting mission was not offered to this player");
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seatId
          ? {
              ...entry,
              selectedStartingContractId: contractId,
              missionSelectedAt: new Date().toISOString(),
              ready: false
            }
          : entry
      )
    };
  }

  setSeatReady(seatId: string, ready: boolean): void {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Ready state can only be changed before the session starts");
    }

    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

    if (!seat || seat.kicked) {
      throw new Error(`Unknown seat ${seatId}`);
    }

    if (!seat.displayName) {
      throw new Error("Seat must be joined before it can be readied");
    }

    if (ready && (!seat.characterId || seat.characterSelected === false)) {
      throw new Error("Choose a character before Ready");
    }

    if (ready && !seat.selectedStartingContractId) {
      throw new Error("Choose a starting mission before Ready");
    }

    if (seat.ready === ready) {
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
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Seats can only be released before the session starts");
    }

    const seat = this.state.seats.find((entry) => entry.seatId === seatId);

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

  startSession(): void {
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

    const activeSeatId = this.state.turnOrder[0] ?? this.state.seats[0]?.seatId;

    this.applyAction({
      type: "SESSION_STARTED",
      seatId: activeSeatId,
      createdAt: new Date().toISOString()
    });

    if (this.state.gameMode === "nemesis_relay") {
      this.applyAction({
        type: "NEMESIS_SPAWNED",
        seatId: activeSeatId,
        champions: createNemesisChampionsForSeats(this.state, this.state.turnOrder),
        createdAt: new Date().toISOString()
      } satisfies NemesisSpawnedAction);
    }

    if (this.state.status === "active") {
      this.applyStartOfTurnScenarioEffects(this.state.turnOrder[this.state.activeSeatIndex] ?? activeSeatId);
      this.maybeTriggerAbilityOnTurnStarted(this.state.turnOrder[this.state.activeSeatIndex] ?? activeSeatId);
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
    return isRecord(message) && (message.type === "KICK_SEAT" || message.type === "RESTART_SESSION");
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

    if (!CLIENT_INTENT_TYPES.has(type)) {
      throw new IntentRejectedError(type, `Client cannot submit server action ${type}`);
    }

    requireStringField(message, "seatId", type);

    switch (type) {
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
      case "ENCOUNTER_DECISION_REQUESTED":
        requireStringField(message, "decisionId", type); requireStringField(message, "optionId", type);
        if (!Number.isInteger(message.decisionVersion) || Number(message.decisionVersion) < 1) throw new IntentRejectedError(type, "Encounter decision version must be a positive integer");
        break;
      case "FORCED_DISPLACEMENT_ACCEPTED":
        requireStringField(message, "reactionId", type);
        break;
      case "PHASE_ADVANCED":
        requireEnumField(message, "toPhase", PHASE_VALUES, type);
        break;
      case "CHECK_REQUESTED":
      case "COMBAT_REQUESTED":
      case "RAISE_STAT_REQUESTED":
        requireEnumField(message, "stat", STAT_VALUES, type);
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
        break;
      case "EQUIP_GEAR":
        requireStringField(message, "gearId", type);
        requireEnumField(message, "slot", GEAR_SLOT_VALUES, type);
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
        break;
      case "SHOP_PURCHASE_REQUESTED":
        requireStringField(message, "cardId", type);
        break;
      case "SHOP_SELL_REQUESTED":
        requireStringField(message, "gearId", type);
        break;
      case "ACCEPT_CONTRACT":
      case "SELECT_STARTING_CONTRACT":
      case "COMPLETE_CONTRACT":
        requireStringField(message, "contractId", type);
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
    this.adoptPhoneClient(client, true);

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

    this.restartActiveSession();
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

      if (entry?.seatId === seatId && (entry.type === "COMBAT_RESOLVED" || entry.type === "CHECK_ROLLED")) {
        break;
      }

      if (
        entry?.seatId === seatId &&
        (entry.type === "USE_GEAR" || entry.type === "USE_FOLLOWER") &&
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

  private getCharacterModifierSources(player: PlayerState, stat: Stat, mode: "battle" | "check"): RollModifierSource[] {
    const encounter = this.state.currentEncounter;
    const sector = getBoardSpace(player.sectorId);
    const tags = new Set(sector?.tags ?? []);

    if (player.character.id === "char_bjornis" && mode === "battle" && stat === "grit" && (encounter?.threatLane === "red" || player.sectorId === "cinder-fields")) {
      return [{ label: "Firebreak Vow", value: 1 }];
    }

    if (player.character.id === "char_bjornis" && mode === "check" && stat === "signal" && encounter?.threatLane === "blue") {
      return [{ label: "Blue Anomaly weakness", value: -1 }];
    }

    if (player.character.id === "char_ker_von_ker" && mode === "battle" && stat === "grit" && encounter?.cardType === "enemy" && encounter.difficulty >= 8) {
      return [{ label: "Shield Breaker", value: 1 }];
    }

    if (player.character.id === "char_kira_dog" && mode === "battle" && stat === "grit" && !this.hasAbilityTriggeredThisTurn(player.seatId, "houndblade-charge")) {
      return [{ label: "Houndblade Charge", value: 1 }];
    }

    if (player.character.id === "char_popelord" && mode === "battle" && stat === "grit" && (tags.has("salvage") || tags.has("hazard"))) {
      return [{ label: "Mire Pitchfork", value: 1 }];
    }

    if (player.character.id === "char_rumi" && !this.hasAbilityTriggeredThisRound(player.seatId, "violet-edge") && (stat === "signal" || stat === "guile")) {
      return [{ label: "Violet Edge", value: 1 }];
    }

    return [];
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

    sources.push(...getEquippedGearModifierSources(player.character, stat, { mode }));
    sources.push(...getAfflictionModifierSources(player, stat, mode, getAfflictionCatalog(this.state)));
    sources.push(...this.getCharacterModifierSources(player, stat, mode));
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
    if (follower.id !== FANDIABLOS_ID || this.hasPendingRoll(seatId)) {
      return undefined;
    }

    const encounter = this.state.currentEncounter;

    if (this.state.phase !== "action" || !encounter) {
      return undefined;
    }

    if (encounter.cardType === "enemy" && encounter.stat === "grit") {
      return {
        label: "Fandiablos",
        value: 3,
        stat: "grit",
        mode: "battle"
      };
    }

    if (encounter.cardType === "hazard" && (encounter.stat === "forge" || encounter.stat === "guile")) {
      return {
        label: "Fandiablos",
        value: 2,
        stat: encounter.stat,
        mode: "check"
      };
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
    const topThreatId = sector?.encounterDecks.threat[0] ?? null;
    const topThreat = topThreatId ? this.threats.get(topThreatId) : null;

    if (!topThreatId) {
      return { type: "gain_note", text: "Fandiablos Warning Barks found no local threat to sniff out." };
    }

    return {
      type: "gain_note",
      text: `Fandiablos Warning Barks revealed one local threat: ${topThreat?.title ?? topThreatId}. The rest of the deck order remains hidden.`
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

    const fandiablosUse = follower?.id === FANDIABLOS_ID ? this.createFandiablosUseEffect(seatId) : null;
    const effect = this.resolveEffect((follower?.activeEffect as EncounterEffect | undefined) ?? this.getFollowerRoleEffect(follower), seatId);
    const rollModifier = this.createFollowerRollModifier(seatId, follower);

    return {
      type: "USE_FOLLOWER",
      seatId,
      followerId,
      followerInstanceId: follower.instanceId,
      woundCost: follower.id === FANDIABLOS_ID ? (escalate ? 2 : 1) : undefined,
      grantAllStatBoost: follower.id === FANDIABLOS_ID && escalate,
      effect: fandiablosUse ? this.resolveEffect(fandiablosUse.effect, seatId) : effect,
      discard: follower?.useLimit === "discard",
      rollModifier,
      summary: (fandiablosUse ?? follower)
        ? `${follower?.name ?? followerId} used. ${fandiablosUse?.summary ?? follower?.text ?? "Their table effect was recorded."}`
        : `${followerId} used. Their table effect was recorded.`,
      createdAt
    } satisfies UseFollowerAction;
  }

  private getFollowerRoleEffect(follower: Follower | undefined): EncounterEffect {
    switch (follower?.role) {
      case "medic":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_note", text: `${follower.name} treated the wound without adding persistent harm.` }
          ]
        };
      case "ritualist":
      case "informant":
        return { type: "gain_note", text: `${follower.name} steadied the operative. No additional status change.` };
      case "gunner":
        return { type: "gain_note", text: `${follower.name} is covering the next combat exchange.` };
      case "guide":
      case "scout":
      case "porter":
      default:
        return { type: "gain_note", text: `${follower?.name ?? "Follower"} support recorded for this route.` };
    }
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

  private createShopServiceAction(
    intent: Extract<ClientIntent, { type: "SHOP_SERVICE_REQUESTED" }>,
    createdAt: string
  ): ShopServiceResolvedAction | ShopStockRevealedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const blockingThreats = buildPublicBlockingThreats(this.state);

    if (blockingThreats.length > 0 || this.state.currentEncounter || this.state.pendingEnemyRoll || this.state.pendingEffect) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const service = buildPublicShopServices(this.state, player).find((entry) => entry.id === intent.serviceId);

    if (!service) {
      throw new Error(`Unknown shop service ${intent.serviceId}`);
    }

    if (!service.enabled) {
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
      cost: service.cost,
      createdAt
    };

    switch (service.id) {
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
        return {
          ...base,
          result: {
            note: `${shopName}: gear repair logged. The next damaged or exhausted item can be restored here.`
          },
          summary: `${actorName} used ${shopName}. Paid ${service.cost.salvage ?? 0} Salvage for gear repair support.`
        };
      case "buy-supplies":
        return {
          ...base,
          result: {
            note: `${shopName}: supply crate reserved for the next route problem.`
          },
          summary: `${actorName} used ${shopName}. Bought supplies for ${service.cost.salvage ?? 0} Salvage.`
        };
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
        const artifact = this.pickRelicDealerArtifact(player);

        if (!artifact) {
          throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        }

        return {
          ...base,
          result: {
            gainGear: artifact,
            note: `${shopName}: exchanged three completed Missions for ${artifact.name}.`
          },
          summary: `${actorName} used ${shopName}. Exchanged three completed Missions for the Artifact ${artifact.name}.`
        };
      }
      case "risk-action": {
        const stockCategory = getShopStockCategoryForService(boardSpace, service.id);

        if (!stockCategory) {
          throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
        }

        const stock = this.pickShopGearStock(player, 4, "risk", stockCategory);

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
          cost: service.cost,
          stock,
          summary: `${actorName} used ${shopName}. Paid 1 Salvage and revealed ${stock.length} Relic Dealer options.`,
          createdAt
        } satisfies ShopStockRevealedAction;
      }
      default:
        throw new Error(`Unsupported shop service ${service.id}`);
    }
  }

  private pickShopGearStock(player: PlayerState, count: number, mode: "standard" | "risk", category: ShopCategory): GearItem[] {
    const ownedGearIds = new Set([
      ...player.character.heldGear.map((item) => item.id),
      ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
    ]);

    return getAvailableShopStockForCategory(this.gear.values(), category, {
      count,
      ownedGearIds,
      includeArtifacts: mode === "risk",
      includeQaGear: canUseQaShopGear(player.character),
      expensiveFirst: mode === "risk"
    });
  }

  private pickRelicDealerArtifact(player: PlayerState): GearItem | null {
    return this.pickShopGearStock(player, 1, "risk", "relic-dealer")
      .find((item) => item.tier === "artifact") ?? null;
  }

  private createShopPurchaseAction(
    intent: Extract<ClientIntent, { type: "SHOP_PURCHASE_REQUESTED" }>,
    createdAt: string
  ): ShopPurchaseResolvedAction {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
      throw new Error(SHOP_FAILURE_REASONS.notAtShop);
    }

    const blockingThreats = buildPublicBlockingThreats(this.state);

    if (blockingThreats.length > 0 || this.state.currentEncounter || this.state.pendingEnemyRoll || this.state.pendingEffect) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const reveal = this.state.shopStockReveals.find(
      (entry) => entry.seatId === intent.seatId && entry.sectorId === player.character.currentSpaceId && entry.stockIds.includes(intent.cardId)
    );

    if (!reveal) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const gear = this.gear.get(intent.cardId);

    if (!gear) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const stockCategory = getShopStockCategoryForService(boardSpace, reveal.serviceId);

    if (!stockCategory || !isGearAvailableFromShopCategory(gear, stockCategory)) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const ownedGearIds = new Set([
      ...player.character.heldGear.map((item) => item.id),
      ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
    ]);

    if (ownedGearIds.has(gear.id)) {
      throw new Error(SHOP_FAILURE_REASONS.itemUnavailable);
    }

    const cost = { salvage: getShopGearCost(gear) };

    if ((player.character.salvage ?? 0) < cost.salvage) {
      throw new Error(SHOP_FAILURE_REASONS.insufficientSalvage);
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
      gainedGear: gear,
      discardedStockIds,
      summary: `${player.character.name} used ${reveal.shopName}. Bought ${gear.name} for ${cost.salvage} Salvage.`,
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

    if (blockingThreats.length > 0 || this.state.currentEncounter || this.state.pendingEnemyRoll || this.state.pendingEffect) {
      throw new Error(SHOP_FAILURE_REASONS.shopBlockedByThreat);
    }

    const gear = player.character.heldGear.find((item) => item.id === intent.gearId);

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
    const baseOutcomeEffect = success ? encounter.successEffect : encounter.failEffect;
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
          createdAt
        } satisfies PhaseAdvancedAction;
      case "CHECK_REQUESTED":
        return {
          type: "CHECK_REQUESTED",
          seatId: intent.seatId,
          stat: intent.stat,
          createdAt
        } satisfies CheckRequestedAction;
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
      case "FORCED_DISPLACEMENT_ACCEPTED":
        return { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: intent.seatId, reactionId: intent.reactionId, createdAt };
      case "SET_READY":
        throw new Error("Ready state is handled directly");
      case "SELECT_STARTING_CONTRACT":
        throw new Error("Starting mission selection is handled directly");
      case "RECRUIT_REPLACEMENT":
        return {
          type: "RECRUIT_REPLACEMENT",
          seatId: intent.seatId,
          replacementCharacterId: intent.replacementCharacterId,
          replacementCharacter: this.characters.get(intent.replacementCharacterId),
          createdAt
        };
      case "EQUIP_GEAR":
        return {
          type: "EQUIP_GEAR",
          seatId: intent.seatId,
          gearId: intent.gearId,
          slot: intent.slot,
          createdAt
        } satisfies EquipGearAction;
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
    const previousState = this.state;
    const previousTotalWounds = this.getTotalWounds(previousState);
    const previousHeldGearCount = this.getHeldGearCount(action.seatId, previousState);
    const result = reduceGameState(this.state, action);

    if (!result.ok) {
      throw new IntentRejectedError(result.rejection.actionType, result.rejection.reason);
    }

    this.state = result.state;
    this.events.push(action, ...result.emitted);

    const woundDelta = this.getTotalWounds(this.state) - previousTotalWounds;
    const gainedGearCount = this.getHeldGearCount(action.seatId, this.state) - previousHeldGearCount;

    if (previousState.status === "active" && woundDelta > 0) {
      this.feedEscalation(
        action.seatId,
        woundDelta * ESCALATION_FEEDERS.woundTaken,
        "wounds taken"
      );
      this.applyScenarioOnWoundsTaken(action.seatId, woundDelta);
    }

    if (previousState.status === "active" && gainedGearCount > 0) {
      this.applyScenarioOnGearGained(action.seatId, gainedGearCount);
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
          }
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
    updater: (player: PlayerState) => PlayerState
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
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  private maybeAdvanceContractObjective(seatId: string, trigger: Parameters<typeof advanceContractObjectiveProgress>[2], summary: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player?.character.activeContract) {
      return;
    }

    const contract = this.state.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId) ?? null;

    if (!contract) {
      return;
    }

    const nextState = advanceContractObjectiveState(contract, player.character.activeContract, trigger);
    const nextProgress = nextState.progress;

    if (nextProgress === player.character.activeContract.progress &&
        JSON.stringify(nextState.completedTargetIds ?? []) === JSON.stringify(player.character.activeContract.completedTargetIds ?? []) &&
        nextState.salvageSpent === player.character.activeContract.salvageSpent) {
      return;
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      players: this.state.players.map((entry) =>
        entry.seatId === seatId && entry.character.activeContract
          ? {
              ...entry,
              character: {
                ...entry.character,
                activeContract: {
                  ...entry.character.activeContract,
                  ...nextState,
                  progress: nextProgress
                }
              }
            }
          : entry
      ),
      lastOutcomeSummary: this.state.lastOutcomeSummary
            ? {
                ...this.state.lastOutcomeSummary,
                seatId,
                movedToSectorId: player.sectorId,
                summary: `${this.state.lastOutcomeSummary.summary} ${summary} ${contract.name} is now ${formatContractObjectiveStatus(contract, nextProgress)}.`
              }
        : this.state.lastOutcomeSummary,
      eventLog: [
        ...this.state.eventLog,
        {
          type: "CONTRACT_PROGRESS_UPDATED",
          seatId,
          contractId: contract.id,
          progress: nextProgress,
          summary,
          createdAt: new Date().toISOString()
        }
      ]
    };

  }

  private completeSatisfiedContract(seatId: string): boolean {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const activeContract = player?.character.activeContract;
    if (!activeContract || this.state.phase !== "action") return false;
    const contract = this.state.availableContracts.find((entry) => entry.id === activeContract.contractId);
    if (!contract || contract.objective.type !== "tileChallengeResolved" || !isContractObjectiveComplete(contract, activeContract)) return false;
    this.applyAction({
      type: "COMPLETE_CONTRACT",
      seatId,
      contractId: contract.id,
      contract: this.resolveContract(contract),
      createdAt: new Date().toISOString()
    } satisfies CompleteContractAction);
    return true;
  }

  private maybeTriggerAbilityOnContractAccepted(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (player.character.id === "black-ledger-agent") {
      if (this.hasAbilityTriggeredThisSession(seatId, "ledger-broker")) {
        return;
      }

      const contract = this.state.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId) ?? null;

      this.applyAbilityMutation(
        seatId,
        "ledger-broker",
        "Ledger Broker banked hidden leverage into the newly accepted contract.",
        (entry) =>
          entry.character.activeContract && contract
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: {
                    ...entry.character.activeContract,
                    progress: setContractProgressFloor(contract, entry.character.activeContract.progress, 1)
                  }
                }
              }
            : entry
      );
    }

    if (player.character.id === "fleet-elder" && !this.hasAbilityTriggeredThisRound(seatId, "old-oaths")) {
      this.applyAbilityMutation(
        seatId,
        "old-oaths",
        "Old Oaths turned the fresh job into immediate convoy discipline.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Old Oaths made the frightened route crews fall into line at once."]
          }
        })
      );
    }

    if (player.character.id === "rift-cartographer" && !this.hasAbilityTriggeredThisRound(seatId, "surveyor-cut")) {
      const contract = this.state.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId) ?? null;

      this.applyAbilityMutation(
        seatId,
        "surveyor-cut",
        "Surveyor's Cut banked the fresh route lead as future leverage.",
        (entry) =>
          entry.character.activeContract && contract
            ? {
                ...entry,
                private: {
                  ...entry.private,
                  notes: [...entry.private.notes, "Surveyor's Cut stored the mapped lead before the breach could distort it."]
                },
                character: {
                  ...entry.character,
                  activeContract: {
                    ...entry.character.activeContract,
                    progress: setContractProgressFloor(contract, entry.character.activeContract.progress, 1)
                  }
                }
              }
            : entry
      );
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
            notes: [...entry.private.notes, "Ashwake Step marked the opening lane before anyone else had to test it."]
          }
        })
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
      (this.state.escalationLevel > 0 || player.character.wounds > 0) &&
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

  private maybeTriggerAbilityOnMovementResolved(seatId: string, toSectorId: string, success: boolean): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const sector = this.state.sectors.find((entry) => entry.id === toSectorId) ?? null;

    if (!player || !sector || !success) {
      return;
    }

    if (
      player.character.id === "oathbroken-prince" &&
      sector.danger >= 2 &&
      !this.hasAbilityTriggeredThisRound(seatId, "ruin-courtesy")
    ) {
      this.applyAbilityMutation(
        seatId,
        "ruin-courtesy",
        "Ruin Courtesy turned the broken ground into something like inherited territory.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Ruin Courtesy made the shattered approach feel like a hall already claimed."]
          }
        })
      );
    }

    if (
      player.character.id === "rift-cartographer" &&
      sector.danger >= 2 &&
      !this.hasAbilityTriggeredThisRound(seatId, "ghost-mile")
    ) {
      this.applyAbilityMutation(
        seatId,
        "ghost-mile",
        "Ghost Mile let the Cartographer dismiss the false route before it bit down.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Ghost Mile stripped the false path out of the approach before it could set in."]
          }
        })
      );
    }
  }

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
            notes: [...entry.private.notes, "Witchglass choir mapped the live signal into a stable route note."]
          }
        })
      );
    }

    if (player.character.id === "grave-engineer" && stat === "forge" && !this.hasAbilityTriggeredThisRound(seatId, "grave-spark")) {
      this.applyAbilityMutation(
        seatId,
        "grave-spark",
        "Grave Spark treated the dead infrastructure like familiar craftwork.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Grave Spark turned the dead system into one more workable machine."]
          }
        })
      );
    }

    if (
      player.character.id === "rift-cartographer" &&
      (stat === "signal" || stat === "guile") &&
      !this.hasAbilityTriggeredThisRound(seatId, "rift-script")
    ) {
      this.applyAbilityMutation(
        seatId,
        "rift-script",
        "Rift Script translated the clean read into notes fast enough for the team to reuse.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Rift Script annotated the hostile ground before the path could blur again."]
          }
        })
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

    if (player.character.id === "salvage-warden" && stat === "forge" && !this.hasAbilityTriggeredThisRound(seatId, "scrap-bastion")) {
      this.applyAbilityMutation(
        seatId,
        "scrap-bastion",
        "Scrap Bastion turned the rough forge work into a controlled field hold.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Scrap Bastion converted damaged cover into a workable defensive shell."]
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

    if (player.character.id === "void-marshal" && !this.hasAbilityTriggeredThisRound(seatId, "void-command")) {
      this.applyAbilityMutation(
        seatId,
        "void-command",
        "Void Command marked the sector and steadied the route.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Void Command marked the cleared lane for allied movement."]
          }
        })
      );
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
      player.character.id === "signal-witch" &&
      (effectKey === "outer_ashwakeClearLane" || effectKey === "middle_webglassFracture") &&
      !this.hasAbilityTriggeredThisRound(seatId, "route-burn")
    ) {
      this.applyAbilityMutation(
        seatId,
        "route-burn",
        "Route Burn left a safer signal trace in the lane behind you.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Route Burn marked a safer allied approach through the live lane."]
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
      player.character.id === "fleet-elder" &&
      (effectKey === "outer_ashwakeClearLane" ||
        effectKey === "outer_mirecoilTraffic" ||
        effectKey === "outer_emberwatchBrace") &&
      !this.hasAbilityTriggeredThisRound(seatId, "chain-signal")
    ) {
      this.applyAbilityMutation(
        seatId,
        "chain-signal",
        "Chain Signal locked the cleared transport lane into a live convoy sequence.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Chain Signal fixed the route into a convoy-safe sequence for the next push."]
          }
        })
      );
    }

    if (
      player.character.id === "rift-cartographer" &&
      (effectKey === "outer_ashwakeClearLane" ||
        effectKey === "middle_webglassFracture" ||
        effectKey === "middle_guardianSpanThreshold") &&
      !this.hasAbilityTriggeredThisRound(seatId, "breach-atlas")
    ) {
      this.applyAbilityMutation(
        seatId,
        "breach-atlas",
        "Breach Atlas locked the route into a safer working map.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Breach Atlas logged a safer approach through the mapped lane."]
          }
        })
      );
    }

    if (
      player.character.id === "oathbroken-prince" &&
      player.character.activeContract &&
      (effectKey === "outer_mirecoilTraffic" ||
        effectKey === "outer_hollowVeilSweep" ||
        effectKey === "outer_glassmereChorus") &&
      !this.hasAbilityTriggeredThisRound(seatId, "broken-claim")
    ) {
      const contract = this.state.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId) ?? null;

      this.applyAbilityMutation(
        seatId,
        "broken-claim",
        "Broken Claim turned the cleared lane into progress on the Prince's active objective.",
        (entry) =>
          entry.character.activeContract && contract
            ? {
                ...entry,
                private: {
                  ...entry.private,
                  notes: [...entry.private.notes, "Broken Claim converted local leverage into objective progress."]
                },
                character: {
                  ...entry.character,
                  activeContract: {
                    ...entry.character.activeContract,
                    progress: advanceContractObjectiveProgress(contract, entry.character.activeContract.progress, {
                      type: "enemy-defeated"
                    })
                  }
                }
              }
            : entry
      );
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
            notes: [...entry.private.notes, "Silent Audit extracted sharper route intelligence from the cleared sector."]
          }
        })
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

    if (effectKey === "outer_hollowVeilSweep" && player.character.id === "grave-engineer") {
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

    if (effectKey === "outer_hollowVeilSweep" && player.character.id === "salvage-warden") {
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
      effectKey === "outer_hollowVeilSweep" &&
      player.character.id === "salvage-warden" &&
      !this.hasAbilityTriggeredThisRound(seatId, "yard-warden")
    ) {
      this.applyAbilityMutation(
        seatId,
        "yard-warden",
        "Yard Warden locked the salvage site down for a cleaner haul.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Yard Warden secured the salvage site for a second pass and cleaner extraction."]
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
      const veilHook = this.gear.get("veil-hook");

      this.applyAbilityMutation(
        seatId,
        "last-haul",
        "Last Haul turned the failing line into one more useful recovery.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Last Haul pried one more useful recovery out of the breaking route."]
          },
          character: {
            ...entry.character,
            heldGear:
              veilHook && !entry.character.heldGear.some((item) => item.id === veilHook.id)
                ? [...entry.character.heldGear, veilHook]
                : entry.character.heldGear
          }
        })
      );
    }

    if (player.character.id === "grave-engineer" && !this.hasAbilityTriggeredThisRound(seatId, "mortuary-triage")) {
      this.applyAbilityMutation(
        seatId,
        "mortuary-triage",
        "Mortuary Triage converted the stabilization window into procedural calm.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Mortuary Triage turned panic into a field procedure the line could trust."]
          }
        })
      );

      if (this.state.escalationLevel > 0) {
        this.feedEscalation(seatId, -1, "Mortuary Triage");
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
      player.character.activeContract &&
      !this.hasAbilityTriggeredThisRound(seatId, "debt-knife")
    ) {
      const contract = this.state.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId) ?? null;

      this.applyAbilityMutation(
        seatId,
        "debt-knife",
        "Debt Knife pushed the marked target into sharper contract progress.",
        (entry) =>
          entry.character.activeContract && contract
            ? {
                ...entry,
                private: {
                  ...entry.private,
                  notes: [...entry.private.notes, "Debt Knife carved extra leverage out of the marked kill."]
                },
                character: {
                  ...entry.character,
                  activeContract: {
                    ...entry.character.activeContract,
                    progress: advanceContractObjectiveProgress(contract, entry.character.activeContract.progress, {
                      type: "enemy-defeated"
                    })
                  }
                }
              }
            : entry
      );
    }

    if (
      player.character.id === "void-marshal" &&
      this.state.players.filter((entry) => entry.seatId !== seatId && entry.sectorId === player.sectorId).length > 0 &&
      !this.hasAbilityTriggeredThisRound(seatId, "signal-relay")
    ) {
      this.applyAbilityMutation(
        seatId,
        "signal-relay",
        "Signal Relay turned nearby allied pressure into a steadier field presence.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Signal Relay amplified allied pressure in the Marshal's sector."]
          }
        })
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
            notes: [...entry.private.notes, "Choir Lash bled the breach spike into a controlled pulse."]
          }
        })
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
    source?: { cardId: string; eventId: string }
  ): void {
    if (this.state.status !== "active" || delta === 0) {
      return;
    }

    if (source && (this.state.resolvedEscalationSourceEventIds ?? []).includes(source.eventId)) {
      return;
    }

    const collapseLevel = getEscalationCollapseLevel(this.state.sessionMode);
    const nextLevel = Math.max(0, Math.min(collapseLevel, this.state.escalationLevel + delta));
    const actualDelta = nextLevel - this.state.escalationLevel;
    const modifier = getEscalationModifier(nextLevel);

    this.applyAction({
      type: "ESCALATION_ADVANCED",
      seatId,
      amount: actualDelta,
      newLevel: nextLevel,
      modifier,
      reason,
      ...(source ? { sourceCardId: source.cardId, sourceEventId: source.eventId } : {}),
      createdAt: new Date().toISOString()
    } satisfies EscalationAdvancedAction);

    this.maybeTriggerEscalationAbility(seatId, actualDelta, reason);

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

    const threatDeck = sector.encounterDecks.threat;
    const drawnThreatId = this.drawThreatIdWithSoftExile(threatDeck);
    const drawnThreat = drawnThreatId ? this.threats.get(drawnThreatId) ?? null : null;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: "action",
      resolutionSource: null,
      currentEncounter: drawnThreat,
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
              type: drawnThreat.cardType,
              flavor: drawnThreat.flavor,
              artType: "threat"
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
      sectors: this.state.sectors.map((entry) =>
        entry.id === sector.id && drawnThreat
          ? {
              ...entry,
              encounterDecks: {
                ...entry.encounterDecks,
                threat: entry.encounterDecks.threat.filter((cardId) => cardId !== drawnThreat.id)
              }
            }
          : entry
      ),
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
            : `Ambient threat draw: ${sector.name} had no local threat to reveal.`,
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
              connected: false,
              ready: false,
              kicked: true
            }
          : entry
      ),
      eventLog: [...this.state.eventLog, { type: "KICK_SEAT", targetSeatId, createdAt: new Date().toISOString() }]
    };

    if (!targetWasActive && remainingAfterKick.length > 1) {
      this.recoverPendingEnemyRollForLeavingSeat(targetSeatId);
    }
  }

  private restartActiveSession(): void {
    const connectedTurnOrder = this.getConnectedRestartSeatIds();

    this.state = {
      ...this.state,
      status: "lobby",
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
      pendingEnemyRoll: null,
      pendingEffect: null,
      lastOutcomeSummary: null,
      seats: this.state.seats.map((seat) =>
        seat.kicked
          ? seat
          : {
              ...seat,
              startingContractOptions:
                seat.displayName && seat.characterSelected !== false && this.characters.has(seat.characterId)
                  ? this.resolveStartingContractOptions(
                      this.characters.get(seat.characterId)!,
                      Math.max(0, this.state.seats.findIndex((entry) => entry.seatId === seat.seatId))
                    )
                  : [],
              selectedStartingContractId: null,
              missionSelectedAt: null,
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
      eventLog: [...this.state.eventLog, { type: "RESTART_SESSION", createdAt: new Date().toISOString() }]
    };
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
      region: card.region ?? this.getThreatRegionFromSector(sector?.regionTier),
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

  private runAutomaticPhases(seatId: string): void {
    let progressMade = true;

    while (progressMade) {
      progressMade = false;

      if (
        this.state.activeResolution &&
        ["card_reveal", "battle_setup", "dice_roll", "roll_result", "outcome_summary", "awaiting_continue"].includes(
          this.state.activeResolution.stage
        )
      ) {
        return;
      }

      if (this.state.pendingEncounterDecision) {
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
            scar: this.createWoundScar(seatId),
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

      if (this.completeSatisfiedContract(seatId)) {
        progressMade = true;
        continue;
      }

      if (this.state.phase === "sector") {
        if (this.startNextTileChallenge(seatId)) {
          return;
        }
        if (this.shouldDrawEncounterForCurrentSector(seatId)) {
          this.applyAction(this.createEncounterDrawnAction(seatId));
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
          scar: this.createWoundScar(seatId),
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
        const nextPhase = this.getPhaseAfterResolution(seatId);

        this.applyAction({
          type: "PHASE_ADVANCED",
          seatId,
          toPhase: nextPhase,
          createdAt: new Date().toISOString()
        });
        progressMade = true;
      }
    }
  }

  private getPhaseAfterResolution(seatId: string): GameState["phase"] {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (this.state.pendingDisplacementArrival?.seatId === seatId) {
      return "sector";
    }

    if (this.state.resolutionSource === "tileChallenge") {
      return "sector";
    }

    if (
      this.state.resolutionSource === "movement" &&
      player?.character.status === "active" &&
      this.state.lastOutcomeSummary?.success !== false
    ) {
      return "sector";
    }

    if (this.shouldContinueClearedEncounterSector(seatId)) {
      const sector = player ? this.state.sectors.find((entry) => entry.id === player.character.currentSpaceId) : null;

      return sector && sector.encounterDecks.threat.length > 0 ? "sector" : "action";
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

  private shouldContinueClearedEncounterSector(seatId: string): boolean {
    if (this.state.resolutionSource !== "encounter" || this.state.lastOutcomeSummary?.success !== true) {
      return false;
    }

    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player || player.character.status !== "active") {
      return false;
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace || boardSpace.textBox.intent === "scenario-confrontation") {
      return false;
    }

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

    if (this.state.status === "active" && this.didRoundWrap(previousActiveSeatIndex, this.state.activeSeatIndex)) {
      if (!suppressRoundEscalation) {
        this.applyRoundEscalation(seatId);
      }
    }

    if (this.state.status === "active") {
      const nextSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? null;
      if (nextSeatId) {
        this.applyStartOfTurnScenarioEffects(nextSeatId);
        this.maybeTriggerAbilityOnTurnStarted(nextSeatId);
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

    const deck = sector.encounterDecks.threat;
    const lane = this.getNextCurrentSectorThreatLane(seatId);
    const drawnThreatId = lane
      ? this.drawThreatIdWithSoftExileForLane(deck, lane)
      : this.drawThreatIdWithSoftExile(deck);
    const card = drawnThreatId ? this.threats.get(drawnThreatId) ?? null : null;
    const revealEffectKey = card?.revealEffectKey ?? card?.effectKey;
    const revealEffect = card ? this.resolveThreatEffectKey(seatId, card, revealEffectKey, "onReveal")?.effect ?? null : null;

    return {
      type: "ENCOUNTER_DRAWN",
      seatId,
      sectorId: sector.id,
      card,
      revealEffect: revealEffect ? this.resolveEffect(revealEffect, seatId, card?.id) : null,
      createdAt: new Date().toISOString()
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
    const counts = this.getCurrentSectorExplorationDrawCounts(seatId);

    if (!boardSpace || !counts) {
      return null;
    }

    for (const lane of boardSpace.threatIcons) {
      if (counts[lane] > 0) {
        return lane;
      }
    }

    return (["red", "blue", "yellow"] as const).find((lane) => counts[lane] > 0) ?? null;
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

    return calculateExplorationDraws(boardSpace, this.getCurrentSectorThreatCards(player));
  }

  private getCurrentSectorThreatCards(player: PlayerState): BoardThreatCard[] {
    const encounter = this.state.currentEncounter;

    if (!encounter || !this.isCurrentEncounterBlockingPlayerSector(player)) {
      return [];
    }

    const category: BoardThreatCard["category"] = encounter.cardType === "enemy" ? "enemy" : "event";
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

  private shouldTriggerHeatThreshold(seatId: string): boolean {
    void seatId;
    return false;
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
        scar: this.createWoundScar(seatId),
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

    if (nemesis) {
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
    const nextNonBattleTestModifier = getNextNonBattleTestModifierSource(this.state, intent.seatId);
    const modifierSources = [
      ...this.buildStatModifierSources(player, intent.stat, "check", {
      scenarioModifier: this.getScenarioSkillModifier(intent.seatId),
      keyedPlayerModifier: keyedModifiers.playerBonusModifier ?? 0
      }),
      ...(this.state.pendingTileChallenge?.modifierSources ?? []).map(({ label, value }) => ({ label, value })),
      ...(nextNonBattleTestModifier ? [nextNonBattleTestModifier] : [])
    ];
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus = this.sumModifierSources(modifierSources);
    const characterDifficultyModifier = this.getCharacterDifficultyModifier(player, encounter);
    const difficulty = encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0) + characterDifficultyModifier;
    const total = roll.total + statBonus;
    const success = total >= difficulty;
    const baseOutcomeEffect = this.combineEffects(
      [keyedModifiers.effect, success ? encounter.successEffect : encounter.failEffect].filter(
        (effect): effect is EncounterEffect => Boolean(effect)
      )
    ) ?? (success ? encounter.successEffect : encounter.failEffect);
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

    this.applyAction({
      type: "CHECK_ROLLED",
      seatId: intent.seatId,
      stat: intent.stat,
      difficulty,
      roll,
      statBonus,
      modifierSources,
      total,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      createdAt: new Date().toISOString()
    });
    this.markFirstEligibleCharacterAbility(intent.seatId, intent.stat, "check", encounter);
    this.applyScenarioOnSkillResolved(intent.seatId, intent.stat, success);
    this.maybeTriggerAbilityOnCheckResolved(intent.seatId, intent.stat, success);
    this.runAutomaticPhases(intent.seatId);
  }

  resolveContinueResolutionIntent(intent: Extract<ClientIntent, { type: "CONTINUE_RESOLUTION" }>): void {
    this.clearResolutionAutoContinueTimeout();
    const previousStage = this.state.activeResolution?.stage ?? null;

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

    if (
      previousStage === "roll_result" ||
      previousStage === "outcome_summary" ||
      (previousStage === "awaiting_continue" && this.state.phase === "resolution" && !this.state.activeResolution)
    ) {
      this.runAutomaticPhases(intent.seatId);
    }

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
      createdAt: new Date().toISOString()
    } satisfies MovementResolvedAction);
    if (success) {
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
    this.runAutomaticPhases(intent.seatId);
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

  resolveSpaceTextIntent(intent: Extract<ClientIntent, { type: "RESOLVE_SPACE_TEXT" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const boardSpace = getBoardSpace(player.character.currentSpaceId);

    if (!boardSpace) {
      throw new Error(`No board text is registered for ${player.character.currentSpaceId}`);
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
      const roll = rollDice(2, 6, this.randomSource);
      const escalationModifier = getEscalationModifier(this.state.escalationLevel);
      const statBonus =
        player.character.stats[resolution.check.stat] +
        getEquippedGearModifierSources(player.character, resolution.check.stat).reduce((sum, source) => sum + source.value, 0) +
        this.getScenarioSkillModifier(intent.seatId);
      const difficulty = resolution.check.difficulty + escalationModifier;
      const total = roll.total + statBonus;
      const success = total >= difficulty;

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
      consumedDeckCards: sectorCardResolution?.consumedDeckCards,
      createdAt: new Date().toISOString()
    } satisfies SpaceTextResolvedAction);
    if (checkPayload) {
      this.applyScenarioOnSkillResolved(intent.seatId, checkPayload.checkStat, checkPayload.success);
      this.maybeTriggerAbilityOnCheckResolved(intent.seatId, checkPayload.checkStat, checkPayload.success);
    }
    if (!checkPayload || checkPayload.success) {
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
  }

  private resolveCharacterAbilityIntent(intent: Extract<ClientIntent, { type: "USE_CHARACTER_ABILITY" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

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
        createdAt: new Date().toISOString()
      });
      this.runAutomaticPhases(intent.seatId);
      return;
    }

    const gateBlockReason = this.getScenarioGateBlockReason(player, scenario);
    if (gateBlockReason) {
      throw new IntentRejectedError(intent.type, gateBlockReason);
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
    const confrontationModifier = getEscalationModifier(this.state.escalationLevel);

    const cinderOathBonus = player.character.id === "cinder-monk" && this.hasAbilityTriggeredThisRound(intent.seatId, "cinder-oath") ? 2 : 0;
    const results = plan.checks.map((check) => {
      const roll = rollDice(2, 6, this.randomSource);
      const statBonus =
        player.character.stats[check.stat] +
        getEquippedGearModifierSources(player.character, check.stat).reduce((sum, source) => sum + source.value, 0) +
        this.getScenarioSkillModifier(intent.seatId) + cinderOathBonus;
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
    const effectiveThreshold = nemesis?.stats.life ?? scenario.victoryThreshold;
    const willWin = nextProgress >= effectiveThreshold;
    const effectParts: EncounterEffect[] = [];

    if (plan.effect) {
      effectParts.push(plan.effect);
    }

    if (nemesis && failedChecks > 0) {
      effectParts.push({ type: "take_wound", amount: failedChecks });
    }

    switch (nemesis ? null : scenario.id) {
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
    const rawAppliedEffect = nemesis && willWin ? plan.effect : combinedEffect;
    const appliedEffect = scenario.id === "scenario_broken_seal" && rawAppliedEffect
      ? this.maybeApplyKerWoundPrevention(
          intent.seatId,
          this.maybeApplyFandiablosWoundPrevention(intent.seatId, rawAppliedEffect)
        )
      : rawAppliedEffect;
    const backlashSummary =
      nemesis && willWin && failedChecks > 0
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
        createdAt: new Date().toISOString()
      });

      this.runAutomaticPhases(intent.seatId);
    }
  }

  private getRaiseStatCost(currentValue: number): number {
    return getStatUpgradeCost(currentValue);
  }

  resolveRaiseStatIntent(intent: Extract<ClientIntent, { type: "RAISE_STAT_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (this.state.status !== "active" || (this.state.phase !== "action" && this.state.phase !== "broadcast")) {
      throw new Error("Stat upgrades are only available during a safe action or broadcast window");
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
    const cost = this.getRaiseStatCost(currentValue);
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

    const assignedRollerSeatId = this.chooseEnemyRollerSeatId(intent.seatId);

    if (!assignedRollerSeatId) {
      this.resolveOpposedCombat(intent.seatId, intent.stat, encounter, null);
      return;
    }

    this.applyAction({
      type: "ENEMY_ROLL_ASSIGNED",
      seatId: intent.seatId,
      fighterSeatId: intent.seatId,
      assignedRollerSeatId,
      stat: intent.stat,
      cardId: encounter.id,
      encounterTitle: encounter.title,
      createdAt: new Date().toISOString()
    } satisfies EnemyRollAssignedAction);
    this.scheduleEnemyRollTimeout();
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

    const stat = getNemesisCombatStat(nemesis, intent.stat);
    const roll = rollDice(2, 6, this.randomSource);
    const nemesisRoll = rollDice(2, 6, this.randomSource);
    const assistBonus = getAssistBonus(this.state, intent.seatId, nemesis, requestedAssistSeatIds);
    const statBonus =
      player.character.stats[stat] +
      getEquippedGearModifierSources(player.character, stat, { mode: "battle" }).reduce((sum, source) => sum + source.value, 0) +
      this.getScenarioBattleModifier(intent.seatId) +
      assistBonus +
      getMasterAlphaBattleBonus(player);
    const nemesisBonus = getNemesisCombatValue(nemesis, stat);
    const attackerTotal = roll.total + statBonus;
    const nemesisTotal = nemesisRoll.total + nemesisBonus;
    const success = attackerTotal >= nemesisTotal;
    const damage = success ? 1 : 0;
    const summary = success
      ? `${player.character.name} struck ${nemesis.name} for ${damage} damage.`
      : `${nemesis.name} beat ${player.character.name}; the lead operative suffers 1 wound.`;

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
      createdAt: new Date().toISOString()
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
    return Boolean(
      this.state.activeResolution &&
        ["roll_result", "outcome_summary", "awaiting_continue"].includes(this.state.activeResolution.stage)
    );
  }

  private scheduleResolutionAutoContinue(): void {
    if (this.resolutionAutoContinueTimeout || !this.shouldAutoContinueResolution()) {
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
        this.runAutomaticPhases(continuingSeatId);
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

    const playerRoll = rollDice(2, 6, this.randomSource);
    const enemyRoll = rollDice(2, 6, this.randomSource);
    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const keyedModifiers = this.resolveThreatEffectKeys(fighterSeatId, encounter, encounter.combatEffectKeys, "beforeCombat");
    const boardTier = getBoardSpace(player.character.currentSpaceId)?.tier ?? "unknown";
    const soloCombatEase = getSoloCombatDifficultyEase(this.state.sessionMode, boardTier);
    const modifierSources = this.buildStatModifierSources(player, stat, "battle", {
      scenarioModifier: this.getScenarioBattleModifier(fighterSeatId),
      keyedPlayerModifier: keyedModifiers.playerBonusModifier ?? 0,
      masterAlphaModifier: getMasterAlphaBattleBonus(player)
    });
    const statBonus = this.sumModifierSources(modifierSources);
    const easedEncounterDifficulty = Math.max(
      0,
      encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0) - soloCombatEase
    );
    const enemyBonus = easedEncounterDifficulty;
    const scenarioEnemyBonus = this.getScenarioEnemyBattleModifier();
    const keyedEnemyBonus = keyedModifiers.enemyBonusModifier ?? 0;
    const total = playerRoll.total + statBonus;
    const enemyTotal = enemyRoll.total + enemyBonus + scenarioEnemyBonus + keyedEnemyBonus;
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
    const faceupAfflictionIds = new Set((player.faceupAfflictions ?? []).map((affliction) => affliction.cardId));
    const hasMatchingPreventionAffliction =
      !success &&
      ((stat === "command" && faceupAfflictionIds.has("iron-nerve")) ||
        (stat === "grit" && faceupAfflictionIds.has("metal-hide")));
    const afflictionPreventionRoll = hasMatchingPreventionAffliction ? this.randomSource.nextInt(6) + 1 : 0;
    const afflictionPrevention = !hasMatchingPreventionAffliction
      ? { prevented: 0, source: null }
      : getAfflictionWoundPrevention(player, stat, afflictionPreventionRoll, getAfflictionCatalog(this.state));
    const afflictionOutcomeEffect =
      afflictionPrevention.prevented > 0
        ? this.makeEffectSequence([
            preventWoundInEffect(resolvedOutcomeEffect, afflictionPrevention.prevented),
            {
              type: "gain_note",
              text: `${afflictionPrevention.source} reaction rolled ${afflictionPreventionRoll}: prevented ${afflictionPrevention.prevented} wound.`
            }
          ])
        : resolvedOutcomeEffect;
    const outcomeEffect = this.maybeApplyKerWoundPrevention(
      fighterSeatId,
      this.maybeApplyFandiablosWoundPrevention(fighterSeatId, afflictionOutcomeEffect)
    );

    this.applyAction({
      type: "COMBAT_RESOLVED",
      seatId: fighterSeatId,
      stat,
      difficulty: easedEncounterDifficulty,
      roll: playerRoll,
      enemyRoll,
      statBonus,
      modifierSources,
      enemyBonus: enemyBonus + scenarioEnemyBonus + keyedEnemyBonus,
      total,
      enemyTotal,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      enemyRollerSeatId,
      createdAt: new Date().toISOString()
    } satisfies CombatResolvedAction);
    this.markFirstEligibleCharacterAbility(fighterSeatId, stat, "battle", encounter);
    if (success) {
      this.maybeTriggerAbilityOnCombatVictory(fighterSeatId);
      this.applyScenarioOnEnemyDefeat(fighterSeatId);
      this.applyScenarioObjectiveTrigger(fighterSeatId, {
        type: "threatDefeated",
        threatId: encounter.id,
        threatLane: encounter.threatLane,
        enemyFamily: encounter.enemyFamily,
        sectorId: player.sectorId
      });
      this.applyRivalryAgendaProgressTrigger(fighterSeatId, {
        type: "threatDefeated",
        seatId: fighterSeatId,
        threatId: encounter.id,
        threatLane: encounter.threatLane,
        enemyFamily: encounter.enemyFamily,
        sectorId: player.sectorId
      });
    }
    this.runAutomaticPhases(fighterSeatId);
  }

  private resolveEffect(effect: EncounterEffect, seatId?: string, sourceCardId?: string): EncounterEffect {
    if (effect.type === "gain_gear") {
      return {
        ...effect,
        gear: this.gear.get(effect.gearId) ? (() => { const definition = this.gear.get(effect.gearId)!; return { ...definition, instanceId: `${effect.gearId}:${seatId ?? "table"}:${this.state.sequence}`, exhausted: false, currentCharges: definition.startingCharges ?? definition.charges, maxCharges: definition.maxCharges ?? definition.charges }; })() : undefined
      };
    }

    if (effect.type === "draw_artifact") {
      const player = seatId ? this.state.players.find((entry) => entry.seatId === seatId) : null;
      const sourceSectorId = player?.sectorId;
      const sector = sourceSectorId ? this.state.sectors.find((entry) => entry.id === sourceSectorId) : null;
      const artifactId = sector?.encounterDecks.artifact[0] ?? undefined;
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
      return {
        ...effect,
        follower: this.followers.get(effect.followerId)
          ? { ...this.followers.get(effect.followerId)!, instanceId: `${effect.followerId}:${seatId ?? "table"}:${this.state.sequence}`, exhausted: false }
          : undefined
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
          reward: this.resolveEffect(contract.reward)
        }
      : undefined;
  }

  private broadcastPatch(): void {
    for (const client of this.clients) {
      const envelope = this.createPatchEnvelope(client);
      client.socket.send(JSON.stringify(envelope));
    }

    this.scheduleResolutionAutoContinue();
  }

  private adoptPhoneClient(client: ConnectedClient, sendPrivateSnapshot: boolean): void {
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
    this.setSeatConnected(client.seatId, true);
    this.broadcastSnapshotToClient(client, sendPrivateSnapshot);
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
    return {
      type: "STATE_PATCH",
      sessionId: this.state.sessionId,
      sequence: this.state.sequence,
      phase: this.state.phase,
      payload:
        client.view === "tv"
          ? createTvProjection(this.state, this.movementPreviewBySeatId)
          : createPhoneProjection(this.state, client.seatId ?? "", forcePrivate)
    };
  }
}

type PublicShopService = {
  id: string;
  label: string;
  shopCategory?: ShopCategory;
  cost: {
    salvage?: number;
    heat?: number;
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
  type: "gear" | "artifact";
  shopCategories: ShopCategory[];
  cost: {
    salvage?: number;
    heat?: number;
    wounds?: number;
    trophies?: number;
  };
  summary: string;
  affordable: boolean;
  disabledReason?: string;
};

type PublicShopSellItem = {
  gearId: string;
  name: string;
  type: "gear" | "artifact";
  category?: GearItem["category"];
  sellValue: number;
  summary: string;
  sellable: boolean;
  disabledReason?: ShopFailureReason | string;
};

type PublicMoveDestination = {
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
  disabledReason?: string;
  voidKeyPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
  routeStarPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
};

type PublicMovementPlannerState = {
  active: boolean;
  movementValue: number;
  rolledValue?: number;
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
    | "heat"
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
  usedThisTurn: boolean;
  usedThisRound: boolean;
  remainingUses?: number | null;
  maxUses?: number | null;
  disabledReason?: string | null;
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

function buildPhoneObjectUseStates(state: GameState, player: PlayerState | undefined): PhoneObjectUseState[] {
  if (!player) {
    return [];
  }

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
    return {
      source: "gear" as const,
      id: item.id,
      usedThisTurn,
      usedThisRound,
      ...projectedLimit,
      disabledReason: consumableDisabledReason ?? projectedLimit.disabledReason,
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
    return {
      source: "follower" as const,
      id: follower.id,
      usedThisTurn,
      usedThisRound,
      ...projectedLimit,
      disabledReason: exhaustDisabledReason ?? projectedLimit.disabledReason,
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
  if (state.currentEncounter) {
    return "locked";
  }

  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (boardSpace?.tags.includes("risk-shop")) {
    return "dangerous";
  }

  return "open";
}

function getPublicShopBlockedReason(state: GameState, blockingThreatCount: number): ShopFailureReason | undefined {
  return blockingThreatCount > 0 || state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect
    ? SHOP_FAILURE_REASONS.shopBlockedByThreat
    : undefined;
}

function getPublicRing(tier: BoardTier): "outer" | "middle" | "inner" | "core" {
  return tier === "center" ? "core" : tier === "inner" ? "inner" : tier === "middle" ? "middle" : "outer";
}

function getFaceUpThreatsForSector(state: GameState, sectorId: string): PublicMoveDestination["faceUpThreats"] {
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  const activePlayer = activeSeatId ? state.players.find((player) => player.seatId === activeSeatId) : null;
  const encounter = state.currentEncounter;
  const encounterSectorId = state.lastOutcomeSummary?.movedToSectorId ?? activePlayer?.character.currentSpaceId;

  if (!encounter || encounterSectorId !== sectorId) {
    return [];
  }

  return [
    {
      instanceId: `${sectorId}:${encounter.id}`,
      cardId: encounter.id,
      name: encounter.cardType === "enemy" ? encounter.enemyName : encounter.title,
      type: encounter.cardType,
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
  const services = ["Buy Gear", "Sell Gear", "Buy Supplies"];

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
  }, new Map<string, PublicMoveDestination>()).values()];

  return {
    active: true,
    movementValue: plan.movementValue,
    rolledValue: rollDetail?.rolledValue,
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
  const shopLocked = isShopCapable && unresolvedThreats.some((threat) => threat.blocksShop);
  const sectorTextLocked = !event.engagement.shouldResolveTextBox;
  const blocker = unresolvedThreats[0] ?? null;
  const lockedReason = blocker
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
  type: "enemy" | "event" | "encounter" | "anomaly" | "hazard";
  deck?: "red" | "blue" | "yellow";
  challenge?: {
    stat: Stat;
    value: number;
  };
}> {
  const encounter = state.currentEncounter;

  if (!encounter) {
    return [];
  }

  return [
    {
      cardId: encounter.id,
      name: encounter.cardType === "enemy" ? encounter.enemyName : encounter.title,
      type: encounter.cardType === "enemy" ? "enemy" : "hazard",
      deck: encounter.threatLane,
      challenge: {
        stat: encounter.stat,
        value: encounter.difficulty
      }
    }
  ];
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

function buildPublicShopStock(state: GameState, player: PlayerState): PublicShopStockItem[] | undefined {
  const reveal = (state.shopStockReveals ?? []).find(
    (entry) => entry.seatId === player.seatId && entry.sectorId === player.character.currentSpaceId
  );

  if (!reveal) {
    return undefined;
  }

  const ownedGearIds = new Set([
    ...player.character.heldGear.map((item) => item.id),
    ...Object.values(player.character.equippedGear).filter((id): id is string => Boolean(id))
  ]);

  return reveal.stockIds
    .map((cardId) => PROJECTION_GEAR_CATALOG.get(cardId))
    .filter((item): item is GearItem => Boolean(item))
    .map((item) => {
      const cost = { salvage: getPublicGearShopCost(item) };
      const payment = canPayShopCost(player, state, cost);
      const alreadyOwned = ownedGearIds.has(item.id);

      return {
        cardId: item.id,
        name: item.name,
        type: item.tier === "artifact" ? "artifact" : "gear",
        shopCategories: getGearShopCategoryIds(item),
        cost,
        summary: getGearSummary(item),
        affordable: payment.enabled && !alreadyOwned,
        disabledReason: alreadyOwned ? "Already held" : payment.disabledReason
      } satisfies PublicShopStockItem;
    });
}

function buildPublicShopSellInventory(player: PlayerState): PublicShopSellItem[] {
  return player.character.heldGear.map((item) => {
    const restriction = getGearSellRestriction(item, player.character);
    const sellValue = getShopGearSellValue(item) ?? 0;

    return {
      gearId: item.id,
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

function buildPublicShopServices(state: GameState, player: PlayerState): PublicShopService[] {
  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (!boardSpace || !isBoardSpaceShopCapable(boardSpace) || state.currentEncounter) {
    return [];
  }

  const services: PublicShopService[] = [];
  const sellInventory = buildPublicShopSellInventory(player);
  const hasSellableGear = sellInventory.some((item) => item.sellable);

  if (boardSpace.tags.includes("shop")) {
    services.push(
      createShopService(player, state, {
        id: "buy-gear",
        label: "Buy Gear",
        shopCategory: getShopStockCategoryForService(boardSpace, "buy-gear") ?? undefined,
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
        cost: { salvage: 2 }
      }),
      createShopService(player, state, {
        id: "buy-supplies",
        label: "Buy Supplies",
        shopCategory: "market",
        cost: { salvage: 1 }
      })
    );
  }

  if (boardSpace.tags.includes("recovery")) {
    services.push(
      createShopService(player, state, {
        id: "buy-treatment",
        label: "Buy Treatment",
        shopCategory: "medicae-shrine",
        cost: { salvage: 2 }
      })
    );
  }

  if (boardSpace.tags.includes("risk-shop")) {
    services.push(
      createShopService(player, state, {
        id: "trade-missions-for-artifact",
        label: "Trade Missions for Artifact",
        shopCategory: "relic-dealer",
        cost: { completedContracts: 3 }
      }),
      createShopService(player, state, {
        id: "risk-action",
        label: "Deep Relic Search",
        shopCategory: getShopStockCategoryForService(boardSpace, "risk-action") ?? undefined,
        cost: { salvage: 1 }
      })
    );
  }

  return services.slice(0, 6);
}

function buildPublicShopEncounter(state: GameState, visiblePlayers: PlayerState[]): Record<string, unknown> | null {
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
  const completedContracts = getCompletedContractCountForProjection(state, activePlayer.seatId);
  const blockingThreats = buildPublicBlockingThreats(state);
  const services = buildPublicShopServices(state, activePlayer);
  const revealedStock = buildPublicShopStock(state, activePlayer);
  const sellInventory = buildPublicShopSellInventory(activePlayer);
  const latest = state.lastOutcomeSummary?.seatId === activePlayer.seatId ? state.lastOutcomeSummary : null;
  const latestAction = state.eventLog.at(-1) as GameAction | undefined;
  const latestPurchase =
    latestAction?.type === "SHOP_PURCHASE_RESOLVED" && latestAction.seatId === activePlayer.seatId
      ? (latestAction as ShopPurchaseResolvedAction)
      : null;
  const latestSale =
    latestAction?.type === "SHOP_SELL_RESOLVED" && latestAction.seatId === activePlayer.seatId
      ? (latestAction as ShopSellResolvedAction)
      : null;
  const blockedReason = getPublicShopBlockedReason(state, blockingThreats.length);
  const shopCategory = getBoardSpaceShopCategory(boardSpace);
  const stockCategory =
    services.find((service) => service.id === "buy-gear")?.shopCategory ??
    services.find((service) => service.id === "risk-action")?.shopCategory ??
    shopCategory;

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
    activePlayer: {
      playerId: activePlayer.seatId,
      name: activePlayer.character.name,
      characterName: activePlayer.character.name,
      salvage,
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
    recentOutcome: latest
      ? {
          operativeName: activePlayer.character.name,
          shopName: boardSpace.name,
          action: latestSale ? "sell" : latestPurchase ? "buy" : "Recent outcome",
          gained: latestPurchase?.gainedGear.name,
          sold: latestSale?.soldGear.name,
          salvageDelta: latestSale?.salvageDelta,
          costPaid: latestPurchase?.cost,
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
    costPaid?: { salvage?: number; heat?: number; wounds?: number; trophies?: number };
    salvageDelta?: number;
    heatDelta?: number;
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
    deltas.push(createResultDelta({
      type: "itemBought",
      label: "Item bought",
      value: recentOutcome.gained,
      sign: "gain",
      targetScope: "personal",
      targetSeatId: seatId,
      visibility: "public",
      source,
      reason: recentOutcome.shopName,
      publicText: `${recentOutcome.operativeName ?? "Operative"} bought ${recentOutcome.gained}.`,
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
  const salvageLoss = lower.match(/lost (\d+) salvage/);
  const salvagePaid = lower.match(/paid (\d+) salvage/);
  const wound = lower.match(/take (\d+) wound/);
  const heal = lower.match(/heal(?:ed)? (\d+) wound/);
  const trophy = lower.match(/\+(\d+) trophies?|gain (\d+) trophies?/);
  const scar = lower.match(/gain scar ([\w-]+)/);

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
    const source = `${type ?? "event"}:${index}`;

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
        visibility: "public",
        source,
        reason: "Affliction reveal",
        publicText: typeof entry.publicSummary === "string" ? entry.publicSummary : `Affliction drawn: ${afflictionName}.`,
        privateText: typeof entry.privateSummary === "string" ? entry.privateSummary : undefined,
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
          visibility: "public",
          source,
          reason: "Immediate Affliction resolved",
          publicText: `${afflictionName} resolved and flipped facedown.`,
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
        visibility: "public",
        source,
        reason: typeof entry.contractId === "string" ? entry.contractId : "contract progress",
        publicText: typeof entry.summary === "string" ? entry.summary : "Contract progress advanced.",
        severity: "reward"
      }));
    }

    if (type === "COMPLETE_CONTRACT") {
      deltas.push(createResultDelta({
        id: `contract-complete:${source}`,
        type: "contractCompleted",
        label: "Contract complete",
        sign: "gain",
        targetScope: "personal",
        targetSeatId: seatId,
        visibility: "public",
        source,
        reason: typeof entry.contractId === "string" ? entry.contractId : "contract completion",
        publicText: typeof entry.summary === "string" ? entry.summary : "Contract completed.",
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
        publicText: `Global Escalation ${amount >= 0 ? "+" : ""}${amount}: ${typeof entry.reason === "string" ? entry.reason : "pressure"}.`,
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
    ["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage);

  return {
    available,
    charges
  };
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

    return {
      seatId: event.seatId,
      playerName: player?.character.name ?? event.seatId,
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

    return {
      seatId: event.seatId,
      playerName: player?.character.name ?? event.seatId,
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

  return {
    active: true,
    mode: interactionMode as RivalryProjectionMode,
    secrecy: "private",
    revealState: getPrivateRivalryRevealState(player),
    tableWarning: "Shown only on this phone. Keep it off the TV table.",
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
    },
    recentPrivateNotes: player.private.notes.slice(-3).reverse(),
    reveal: buildPrivateRivalryRevealProjection(player)
  };
}

function isSeatCharacterSelectedForProjection(state: GameState, seat: GameState["seats"][number], playerSeatIds: Set<string>): boolean {
  if (state.status !== "lobby" && playerSeatIds.has(seat.seatId)) {
    return true;
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

function getPendingFailureEffectChoices(state: GameState): Array<{ effectId: string; summary: string }> {
  const reaction = state.pendingStaticIntercessionReaction;
  if (!reaction || reaction.selectedEffectId !== null) return [];
  return reaction.suppressibleEffects.map(({ effectId, effect }) => ({ effectId, summary: summarizeTileChallengeEffect(effect) }));
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
  const nemesisSummary = activeNemesis
    ? {
        id: activeNemesis.id,
        name: activeNemesis.name,
        title: activeNemesis.title,
        faction: activeNemesis.faction,
        life: activeNemesis.stats.life,
        damageDealt: activeScenarioProgress,
        abilities: activeNemesis.abilities.map((ability) => ({
          timing: ability.timing,
          text: ability.text
        }))
      }
    : null;

  return {
    status: state.status,
    pendingEncounterDecision: state.pendingEncounterDecision ? {
      seatId: state.pendingEncounterDecision.seatId,
      sourceCardId: state.pendingEncounterDecision.sourceCardId,
      sourceTitle: state.currentEncounter?.title ?? "Encounter payment",
      status: "waiting"
    } : null,
    pendingDisplacement: state.pendingDisplacement ? {
      seatId: state.pendingDisplacement.seatId,
      sourceId: state.pendingDisplacement.sourceId,
      sourceTitle: state.currentEncounter?.title ?? "Forced displacement",
      originSectorId: state.pendingDisplacement.originSectorId,
      destinationSectorId: state.pendingDisplacement.destinationSectorId,
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
      const selectedStartingContract = seat.selectedStartingContractId
        ? state.availableContracts.find((contract) => contract.id === seat.selectedStartingContractId) ?? null
        : null;

      return {
        seatId: seat.seatId,
        characterId: seat.characterId,
        characterSelected: isSeatCharacterSelectedForProjection(state, seat, playerSeatIds),
        displayName: seat.displayName ?? null,
        startingMissionSelected: Boolean(seat.selectedStartingContractId),
        startingMissionTitle: selectedStartingContract?.name ?? null,
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
    players: visiblePlayers.map((player) => ({
      seatId: player.seatId,
      character: {
        id: player.character.id,
        name: player.character.name,
        archetype: player.character.archetype,
        ...(getCharacterPresentation(player.character.id) ? { presentation: getCharacterPresentation(player.character.id) } : {}),
        status: player.character.status,
        activeContract: player.character.activeContract,
        stats: player.character.stats,
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
          .filter((follower) => follower.ultimateCompanion || follower.role === "companion")
          .map((follower) => ({
            id: follower.id,
            name: follower.name,
            tier: follower.tier,
            ultimateCompanion: follower.ultimateCompanion,
            exhausted: follower.exhausted
          })),
        equippedGear: player.character.equippedGear
      },
      sectorId: player.character.currentSpaceId
    })),
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
    activeResolution: state.activeResolution ?? null,
    shopEncounter,
    movementPlanner: activeSeatId
      ? (() => {
          const planner = buildPublicMovementPlanner(state, activeSeatId);
          const committedChoice = state.routeStarChoices?.[activeSeatId];
          const selectedPreview = committedChoice ? { destinationId: committedChoice.destinationId, routeId: committedChoice.routeId } : movementPreviewBySeatId.get(activeSeatId) ?? null;
          const selectedDestinationId = selectedPreview?.destinationId ?? null;
          if (planner && selectedPreview) {
            const destination = planner.destinations.find((entry) => entry.sectorId === selectedPreview.destinationId && !entry.disabledReason);
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
    sectorExplorationSummary: buildPublicSectorExplorationSummary(state, activeSeatId),
    recentAbilityTriggers,
    nemesis: nemesisSummary
  };
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

export function createPhoneProjection(state: GameState, seatId: string, forcePrivate = false): Record<string, unknown> {
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
  const activeContractCard =
    player?.character.activeContract?.contractId
      ? state.availableContracts.find((contract) => contract.id === player.character.activeContract?.contractId) ?? null
      : null;
  const readyDisabledReason = getReadyDisabledReasonForSeat(seat);
  const oathchain = player?.character.heldGear.find((item) => item.id === "oathchain-lens" && item.chargedEffect === "traceThePromise" && item.instanceId && (item.currentCharges ?? item.charges ?? 0) > 0 && player.character.equippedGear.utility === item.id);
  const oathchainSignature = player && activeContractCard && player.character.activeContract ? getOathchainContractSignature(player, activeContractCard) : null;
  const oathchainTargets = player && activeContractCard ? deriveOathchainTargets(state, player, activeContractCard) : [];
  const oathchainEligible = Boolean(oathchain && activeContractCard && oathchainSignature && state.phase === "action" && state.turnOrder[state.activeSeatIndex] === seatId && oathchainTargets.length > 0 && player?.private.activeOathchainReveal?.contractSignature !== oathchainSignature);

  return {
    phase: state.phase,
    status: state.status,
    sessionMode: state.sessionMode,
    gameMode: state.gameMode,
    interactionMode: state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry"),
    setupHostSeatId: publicProjection.setupHostSeatId,
    lobbyConfigured: publicProjection.lobbyConfigured,
    hostPhoneConnected: publicProjection.hostPhoneConnected,
    selfIsSetupHost: state.setupHostSeatId === seatId,
    winnerSeatId: state.winnerSeatId,
    activeScenario: publicProjection.activeScenario,
    scenarioTelemetry: publicProjection.scenarioTelemetry,
    scenarioPressure: publicProjection.scenarioPressure,
    scenarioState: publicProjection.scenarioState,
    scenarioProgress: publicProjection.scenarioProgress,
    nemesisChampions: publicProjection.nemesisChampions,
    nemesisNexusCountdowns: publicProjection.nemesisNexusCountdowns,
    activeSeatIndex: state.activeSeatIndex,
    seats: publicProjection.seats,
    turnOrder: publicProjection.turnOrder,
    sectors: publicProjection.sectors,
    players: publicProjection.players,
    objectUseStates: buildPhoneObjectUseStates(state, player),
    escalationLevel: publicProjection.escalationLevel,
    escalationThreshold: publicProjection.escalationThreshold,
    escalationModifier: publicProjection.escalationModifier,
    availableContracts: state.availableContracts,
    encounter: state.currentEncounter,
    pendingEnemyRoll: state.pendingEnemyRoll,
    pendingTileChallenge: publicProjection.pendingTileChallenge,
    pendingTestModifiers: [
      ...(state.pendingNextNonBattleTestModifiers ?? [])
        .filter((entry) => entry.ownerSeatId === seatId)
        .map((entry) => ({
        type: entry.type,
        sourceCardId: entry.sourceCardId,
        label: "Glass-Chime Swarm",
        summary: "Next non-battle test: -1",
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
    playerResultDeltas: buildPlayerResultDeltas(
      state,
      seatId,
      (publicProjection.publicResultDeltas as ResultDelta[] | undefined) ?? [],
      publicProjection.shopEncounter as Record<string, unknown> | null
    ),
    activeResolution: state.activeResolution ?? null,
    shopEncounter: publicProjection.shopEncounter,
    recentAbilityTriggers: publicProjection.recentAbilityTriggers,
    nemesis: publicProjection.nemesis,
    movementPlanner: buildPhoneMovementPlanner(state, seatId),
    sectorExplorationSummary: buildPublicSectorExplorationSummary(state, seatId),
    privateRivalry: buildPrivateRivalryProjection(state, player),
    soloReroll: buildSoloRerollProjection(state, seatId),
    boundNemesis: (publicProjection.nemesisChampions as Array<{ boundPlayerId: string }>).find(
      (champion) => champion.boundPlayerId === seatId
    ) ?? null,
    crownKeyFragments: getCrownKeyFragmentCount(state, seatId),
    eligibleNemesisAssistSeatIds: state.nemesisChampions.flatMap((champion) =>
      champion.defeated ? [] : getEligibleAssistSeatIds(state, seatId, champion)
    ),
    startingContractOptions,
    selectedStartingContract,
    activeContractCard,
    oathchainPrompt: oathchainEligible && oathchain && oathchainSignature ? { instanceId: oathchain.instanceId, contractId: activeContractCard!.id, contractSignature: oathchainSignature, currentCharges: oathchain.currentCharges ?? oathchain.charges ?? 0, maxCharges: oathchain.maxCharges ?? 2, chargeCost: 1, preview: "Spend 1 charge to reveal current valid Contract targets." } : null,
    activeOathchainReveal: player?.private.activeOathchainReveal?.contractSignature === oathchainSignature && state.phase === "action" && state.turnOrder[state.activeSeatIndex] === seatId ? player.private.activeOathchainReveal : null,
    canReady: readyDisabledReason === null,
    readyDisabledReason,
    self: player && seat && isSeatCharacterSelectedForProjection(state, seat, new Set(state.players.map((entry) => entry.seatId))) ? sanitizePlayerForPhone(player) : null
  };
}

function getReadyDisabledReasonForSeat(seat: GameState["seats"][number] | null): string | null {
  if (!seat || seat.kicked) {
    return "Join a seat before Ready";
  }

  if (!seat.displayName) {
    return "Join the room before Ready";
  }

  if (!seat.characterId || seat.characterSelected === false) {
    return "Choose a character before Ready";
  }

  if (!seat.selectedStartingContractId) {
    return "Choose a starting mission before Ready";
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

function summarizeScars(scarIds: string[]): Array<Pick<ScarCard, "id" | "title" | "text" | "trigger" | "penalty" | "relief" | "upside">> {
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
          upside: scar.upside
        }
      : {
          id: scarId,
          title: scarId,
          text: "Unknown scar record.",
          trigger: "When this scar is referenced.",
          penalty: "Ask the table to resolve the recorded scar effect.",
          relief: "Confirm the scar catalog contains this id."
        };
  });
}
