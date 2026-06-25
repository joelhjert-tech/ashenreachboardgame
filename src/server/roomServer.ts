import { WebSocketServer, type WebSocket } from "ws";
import { loadCharacters } from "../game/content/characters.js";
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
import { getScenarioDefinition } from "../game/data/scenarios.js";
import {
  advanceContractObjectiveProgress,
  describeContractObjective,
  formatContractObjectiveStatus,
  formatContractProgress,
  setContractProgressFloor
} from "../game/contracts/objectives.js";
import { getEscalationCollapseLevel, getEscalationModifier } from "../game/engine/escalation.js";
import {
  buildScenarioTelemetry,
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
import { resolveSpaceText } from "../game/rules/tileTextResolver.js";
import type {
  AcceptContractAction,
  CheckRequestedAction,
  CombatRequestedAction,
  CompleteContractAction,
  EscalationAdvancedAction,
  ClientIntent,
  CombatResolvedAction,
  EncounterDrawnAction,
  EnemyRollAssignedAction,
  EnemyRollRequestedAction,
  EquipGearAction,
  GameAction,
  MovementResolvedAction,
  MoveRequestedAction,
  PhaseAdvancedAction,
  RoundCompletedAction,
  SectorCollapsedAction,
  SpaceTextResolvedAction,
  ScenarioConfrontationRequestedAction,
  ScenarioProgressAdvancedAction,
  ScenarioVictoryAchievedAction,
  StabilizeResolvedAction,
  StatRaisedAction,
  TableInteractionAction,
  UnequipGearAction,
  UseFollowerAction,
  UseGearAction
} from "../game/engine/actions.js";
import { getEquippedGearBonus } from "../game/engine/gear.js";
import type { AnomalyCard, ArtifactCard, EncounterEffect, EscalationCard, ScarCard, ThreatCard } from "../game/schema/card.schema.js";
import type { Character } from "../game/schema/character.schema.js";
import type { Stat } from "../game/schema/character.schema.js";
import type { ContractCard } from "../game/schema/contract.schema.js";
import type { Follower } from "../game/schema/follower.schema.js";
import type { GearItem } from "../game/schema/gear.schema.js";
import { rollDice, type RandomSource, defaultRandomSource } from "../game/engine/dice.js";
import { reduceGameState } from "../game/engine/reducer.js";
import type { GameState, PlayerState } from "../game/schema/session.schema.js";
import { validateHostToken, validateJoinToken } from "./auth.js";
import { getBoardSpace } from "../game/data/boardSpaces.js";

export const ESCALATION_FEEDERS = {
  woundTaken: 1,
  trophyDiscarded: 1
} as const;

const TROPHY_COST_PER_RANK = 4;
const MAX_STAT_RANK = 9;
const RAISE_STAT_FEEDS_ESCALATION = true;
const RAISE_STAT_ESCALATION_REASON = "forged in fire";
const ENEMY_ROLL_TIMEOUT_MS = 30_000;

const NEMESIS_OPPOSITION = {
  strength: { attackStat: "grit", label: "Overpower" },
  willpower: { attackStat: "signal", label: "Outlast" },
  cunning: { attackStat: "guile", label: "Outwit" }
} as const;

const CONFRONTATION_BASE_DIFFICULTY = 6;
const SCAR_CARDS = loadScarCards();

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
  "MOVE_REQUESTED",
  "PHASE_ADVANCED",
  "CHECK_REQUESTED",
  "COMBAT_REQUESTED",
  "ENEMY_ROLL_REQUESTED",
  "RECRUIT_REPLACEMENT",
  "EQUIP_GEAR",
  "UNEQUIP_GEAR",
  "USE_GEAR",
  "USE_FOLLOWER",
  "TABLE_INTERACTION",
  "ACCEPT_CONTRACT",
  "COMPLETE_CONTRACT",
  "SCENARIO_CONFRONTATION_REQUESTED",
  "RESOLVE_SPACE_TEXT",
  "STABILIZE_REQUESTED",
  "RAISE_STAT_REQUESTED"
] as const);

const PHASE_VALUES = new Set(["start", "navigation", "sector", "action", "resolution", "broadcast"]);
const STAT_VALUES = new Set(["command", "grit", "signal", "guile", "forge"]);
const GEAR_SLOT_VALUES = new Set(["weapon", "armor", "utility"]);
const TABLE_INTERACTION_VALUES = new Set(["trade", "aid", "duel", "interfere"]);

interface JoinSeatResult {
  roomCode: string;
  seatId: string;
  seatToken: string;
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

export class GameRoomServer {
  private readonly clients = new Set<ConnectedClient>();
  private readonly characters: Map<string, Character>;
  private readonly contracts: Map<string, ContractCard>;
  private readonly followers: Map<string, Follower>;
  private readonly gear: Map<string, GearItem>;
  private readonly threats: Map<string, ThreatCard>;
  private readonly anomalies: Map<string, AnomalyCard>;
  private readonly artifacts: Map<string, ArtifactCard>;
  private readonly escalations: Map<string, EscalationCard>;
  private hostToken: string | null = null;
  private enemyRollTimeout: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private state: GameState,
    private readonly events: GameAction[] = [],
    private readonly randomSource: RandomSource = defaultRandomSource,
    threats?: Map<string, ThreatCard>,
    characters?: Map<string, Character>,
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

      if (intent.type === "STABILIZE_REQUESTED") {
        this.resolveStabilizeIntent(intent);
        const shouldCompleteTurn = this.state.status === "active" && this.state.phase === "broadcast";
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      if (intent.type === "RAISE_STAT_REQUESTED") {
        this.resolveRaiseStatIntent(intent);
        const shouldCompleteTurn = this.state.status === "active" && this.state.phase === "broadcast";
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      if (intent.type === "RESOLVE_SPACE_TEXT") {
        this.resolveSpaceTextIntent(intent);
        const shouldCompleteTurn = this.state.status === "active" && this.state.phase === "broadcast";
        const completingSeatId = this.state.turnOrder[this.state.activeSeatIndex] ?? client.seatId;

        this.broadcastPatch();

        if (shouldCompleteTurn && completingSeatId) {
          this.completeBroadcastTurn(completingSeatId);
        }

        return;
      }

      const action = this.intentToAction(intent);
      this.applyAction(action);

      if (intent.type === "CHECK_REQUESTED") {
        this.resolveCheckIntent(intent);
      } else if (intent.type === "COMBAT_REQUESTED") {
        this.resolveCombatIntent(intent);
      } else if (intent.type === "ENEMY_ROLL_REQUESTED") {
        this.resolveEnemyRollIntent(intent);
      } else if (intent.type === "MOVE_REQUESTED") {
        this.resolveMoveIntent(intent);
      } else if (intent.type === "SCENARIO_CONFRONTATION_REQUESTED") {
        this.resolveScenarioConfrontationIntent(intent);
      } else {
        this.runAutomaticPhases(client.seatId);
      }

      if (intent.type === "COMPLETE_CONTRACT") {
        this.applyScenarioOnContractCompleted(client.seatId);
      }

      if (intent.type === "ACCEPT_CONTRACT") {
        this.maybeTriggerAbilityOnContractAccepted(client.seatId);
      }

      if (intent.type === "COMPLETE_CONTRACT") {
        this.maybeTriggerAbilityOnContractCompleted(client.seatId);
      }

      const shouldCompleteTurn = this.state.status === "active" && this.state.phase === "broadcast";
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

  setHostToken(hostToken: string): void {
    this.hostToken = hostToken;
  }

  getCharacterCatalog(): Character[] {
    return [...this.characters.values()].map((character) => ({
      ...character,
      activeContract: character.activeContract ? { ...character.activeContract } : null,
      heldGear: [...character.heldGear],
      equippedGear: { ...character.equippedGear },
      abilities: [...character.abilities],
      scars: [...character.scars]
    }));
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
  }

  joinSeat(displayName: string, characterId: string): JoinSeatResult {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Session already started");
    }

    const seat = this.state.seats.find((entry) => !entry.displayName && !entry.kicked);

    if (!seat) {
      throw new Error("No open seats remain");
    }

    const selectedCharacter = this.characters.get(characterId);

    if (!selectedCharacter) {
      throw new Error(`Unknown character ${characterId}`);
    }

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      seats: this.state.seats.map((entry) =>
        entry.seatId === seat.seatId
          ? {
              ...entry,
              characterId,
              displayName
            }
          : entry
      ),
      players: this.state.players.map((player) =>
        player.seatId === seat.seatId
          ? {
              ...player,
              character: {
                ...selectedCharacter,
                currentSpaceId: player.sectorId,
                heat: 0,
                wounds: 0,
                status: "active",
                activeContract: null,
                heldGear: [...selectedCharacter.heldGear],
                equippedGear: { ...selectedCharacter.equippedGear },
                abilities: [...selectedCharacter.abilities],
                scars: [...selectedCharacter.scars]
              }
            }
          : player
      )
    };
    this.broadcastPatch();

    return {
      roomCode: this.state.sessionId,
      seatId: seat.seatId,
      seatToken: seat.joinToken
    };
  }

  startSession(): void {
    if (this.state.status !== "lobby" || this.state.phase !== "start") {
      throw new Error("Session already started");
    }

    const joinedSeatIds = this.state.seats.filter((seat) => seat.displayName && !seat.kicked).map((seat) => seat.seatId);
    const joinedSeatCount = joinedSeatIds.length;

    if (joinedSeatCount < 1) {
      throw new Error("At least one seat must join before starting");
    }

    this.state = {
      ...this.state,
      status: "active",
      winnerSeatId: null,
      activeSeatIndex: 0,
      turnOrder: joinedSeatIds
    };

    const activeSeatId = this.state.seats[0]?.seatId ?? this.state.turnOrder[0];

    this.applyAction({
      type: "SESSION_STARTED",
      seatId: activeSeatId,
      createdAt: new Date().toISOString()
    });
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
      case "MOVE_REQUESTED":
        requireStringField(message, "toSectorId", type);
        break;
      case "PHASE_ADVANCED":
        requireEnumField(message, "toPhase", PHASE_VALUES, type);
        break;
      case "CHECK_REQUESTED":
      case "COMBAT_REQUESTED":
      case "RAISE_STAT_REQUESTED":
        requireEnumField(message, "stat", STAT_VALUES, type);
        break;
      case "RECRUIT_REPLACEMENT":
        requireStringField(message, "replacementCharacterId", type);
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
        break;
      case "USE_FOLLOWER":
        requireStringField(message, "followerId", type);
        break;
      case "TABLE_INTERACTION":
        requireStringField(message, "targetSeatId", type);
        requireEnumField(message, "interactionKind", TABLE_INTERACTION_VALUES, type);
        break;
      case "ACCEPT_CONTRACT":
      case "COMPLETE_CONTRACT":
        requireStringField(message, "contractId", type);
        break;
      case "RESOLVE_SPACE_TEXT":
        if (message.choiceId !== undefined && typeof message.choiceId !== "string") {
          throw new IntentRejectedError(type, "Malformed intent: choiceId must be a string");
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

  private createGearUseAction(
    seatId: string,
    gearId: string,
    createdAt: string
  ): UseGearAction {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const item = player?.character.heldGear.find((entry) => entry.id === gearId) ?? this.gear.get(gearId);
    const itemName = item?.name ?? gearId;
    const discard = item?.useLimit === "discard";
    const effect = this.resolveEffect(this.getGearUseEffect(gearId));

    return {
      type: "USE_GEAR",
      seatId,
      gearId,
      effect,
      discard,
      summary: `${itemName} used. ${item?.activeText ?? "Its effect was recorded for the table."}`,
      createdAt
    } satisfies UseGearAction;
  }

  private getGearUseEffect(gearId: string): EncounterEffect {
    switch (gearId) {
      case "blackstar-ampoule":
        return { type: "gain_note", text: "Blackstar Ampoule spent: one failed movement or hazard penalty may be ignored." };
      case "choir-static-censer":
        return { type: "lose_heat", amount: 1 };
      case "heat-sink-prayer":
        return { type: "lose_heat", amount: 2 };
      case "cinder-suture-kit":
        return {
          type: "sequence",
          effects: [
            { type: "heal_wound", amount: 1 },
            { type: "gain_heat", amount: 1 }
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
            { type: "lose_heat", amount: 1 }
          ]
        };
      case "mirror-reroll-token":
        return {
          type: "sequence",
          effects: [
            { type: "gain_heat", amount: 1 },
            { type: "gain_note", text: "Mirror Reroll Token spent: reroll a failed guile or signal check and keep the new fate." }
          ]
        };
      case "black-route-fuse":
        return {
          type: "sequence",
          effects: [
            { type: "advance_escalation", amount: 1 },
            { type: "gain_note", text: "Black Route Fuse broken: +3 combat pressure is banked for this fight." }
          ]
        };
      case "grave-lens":
        return { type: "gain_note", text: "Grave Lens reading: a follower-linked route note was recorded." };
      case "red-march-warbell":
        return {
          type: "sequence",
          effects: [
            { type: "gain_heat", amount: 1 },
            { type: "gain_note", text: "Red March Warbell sounded: +2 combat pressure is banked for this fight." }
          ]
        };
      case "ashen-route-compass":
        return { type: "gain_note", text: "Ashen Route Compass fixed a reroll route for a failed movement or anomaly check." };
      default:
        return { type: "gain_note", text: `${gearId} was used and its table effect was recorded.` };
    }
  }

  private createFollowerUseAction(
    seatId: string,
    followerId: string,
    createdAt: string
  ): UseFollowerAction {
    const player = this.state.players.find((entry) => entry.seatId === seatId);
    const follower = (player?.character.followers ?? []).find((entry) => entry.id === followerId) ?? this.followers.get(followerId);
    const effect = this.resolveEffect((follower?.activeEffect as EncounterEffect | undefined) ?? this.getFollowerRoleEffect(follower));

    return {
      type: "USE_FOLLOWER",
      seatId,
      followerId,
      effect,
      discard: follower?.useLimit === "discard",
      summary: `${follower?.name ?? followerId} used. ${follower?.text ?? "Their table effect was recorded."}`,
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
            { type: "gain_heat", amount: 1 }
          ]
        };
      case "ritualist":
      case "informant":
        return { type: "lose_heat", amount: 1 };
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
          targetEffect: { type: "lose_heat", amount: 1 },
          summary: `${actorName} aided ${targetName}; the target loses 1 Heat.`,
          createdAt
        } satisfies TableInteractionAction;
      case "duel":
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_note", text: `${actorName} challenged ${targetName} to a bounded duel.` },
          targetEffect: { type: "gain_heat", amount: 1 },
          summary: `${actorName} challenged ${targetName}; bounded rivalry marks the target with 1 Heat.`,
          createdAt
        } satisfies TableInteractionAction;
      case "interfere":
        return {
          type: "TABLE_INTERACTION",
          seatId: intent.seatId,
          targetSeatId: intent.targetSeatId,
          interactionKind: intent.interactionKind,
          effect: { type: "gain_heat", amount: 1 },
          targetEffect: { type: "gain_heat", amount: 1 },
          summary: `${actorName} interfered with ${targetName}; both operatives gain 1 Heat.`,
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
          createdAt
        } satisfies MoveRequestedAction;
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
        return this.createGearUseAction(intent.seatId, intent.gearId, createdAt);
      case "USE_FOLLOWER":
        return this.createFollowerUseAction(intent.seatId, intent.followerId, createdAt);
      case "TABLE_INTERACTION":
        return this.createTableInteractionAction(intent, createdAt);
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

  private createFreshCharacter(characterId: string, currentSpaceId: string): Character {
    const template = this.characters.get(characterId);

    if (!template) {
      throw new Error(`Unknown character ${characterId}`);
    }

    return {
      ...template,
      currentSpaceId,
      trophies: 0,
      heat: 0,
      wounds: 0,
      status: "active",
      activeContract: null,
      heldGear: [...template.heldGear],
      equippedGear: { ...template.equippedGear },
      abilities: [...template.abilities],
      scars: [...template.scars]
    };
  }

  private getScenarioCounter(key: string, fallback = 0): number {
    return this.state.scenarioProgress[key] ?? fallback;
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

    return (state.scenarioProgress.engineModeIndex ?? 0) % 3 === 0 ? 1 : 0;
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

    const nextProgress = advanceContractObjectiveProgress(contract, player.character.activeContract.progress, trigger);

    if (nextProgress === player.character.activeContract.progress) {
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
        "Marshal's Presence steadied the line and bled off 1 Heat.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Void Marshal command presence stabilized the objective push."]
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
          }
        })
      );
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
            notes: [...entry.private.notes, "Ash Tithe skimmed tribute off the quiet victory before the lane could cool."]
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
          }
        })
      );
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
            heat: Math.max(0, entry.character.heat - 1)
          }
        })
      );
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
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
            notes: [...entry.private.notes, "Ash Psalm hardened the cleared line into a disciplined hold."]
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
            heat: Math.max(0, entry.character.heat - 1),
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
            heat: Math.max(0, entry.character.heat - 1)
          }
        })
      );
    }
  }

  private maybeTriggerAbilityOnScenarioConfrontationRequested(seatId: string): void {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      return;
    }

    if (player.character.id === "cinder-monk" && !this.hasAbilityTriggeredThisRound(seatId, "cinder-oath")) {
      this.applyAbilityMutation(
        seatId,
        "cinder-oath",
        "Cinder Oath hardened the Monk before the core-ward trial broke open.",
        (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            notes: [...entry.private.notes, "Cinder Oath made the confrontation feel survivable before the first test landed."]
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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
          },
          character: {
            ...entry.character,
            heat: Math.max(0, entry.character.heat - 1)
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

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      eventLog: [
        ...this.state.eventLog,
        {
          type: "ABILITY_TRIGGERED",
          seatId,
          abilityId: "bone-bell",
          summary: "Bone Bell answered the first escalation spike this round.",
          createdAt: new Date().toISOString()
        }
      ],
      lastOutcomeSummary: this.state.lastOutcomeSummary
        ? {
            ...this.state.lastOutcomeSummary,
            summary: `${this.state.lastOutcomeSummary.summary} Bone Bell answered the spike.`
          }
        : this.state.lastOutcomeSummary
    };

    this.feedEscalation(seatId, -1, "Bone Bell");
  }

  private feedEscalation(seatId: string, delta: number, reason: string): void {
    if (this.state.status !== "active" || delta === 0) {
      return;
    }

    const collapseLevel = getEscalationCollapseLevel(this.state.sessionMode);
    const nextLevel = Math.max(0, this.state.escalationLevel + delta);
    const modifier = getEscalationModifier(nextLevel);

    this.applyAction({
      type: "ESCALATION_ADVANCED",
      seatId,
      amount: delta,
      newLevel: nextLevel,
      modifier,
      reason,
      createdAt: new Date().toISOString()
    } satisfies EscalationAdvancedAction);

    this.maybeTriggerEscalationAbility(seatId, delta, reason);

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
    this.state = {
      ...updater(this.state),
      sequence: this.state.sequence + 1,
      lastOutcomeSummary: {
        seatId,
        movedToSectorId: this.state.players.find((player) => player.seatId === seatId)?.sectorId ?? "unknown",
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
      eventLog: [...this.state.eventLog, { type: "SCENARIO_AMBIENT_APPLIED", seatId, summary, createdAt: new Date().toISOString() }]
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
    const drawnThreatId = threatDeck.length > 0 ? threatDeck[this.randomSource.nextInt(threatDeck.length)] ?? null : null;
    const drawnThreat = drawnThreatId ? this.threats.get(drawnThreatId) ?? null : null;

    this.state = {
      ...this.state,
      sequence: this.state.sequence + 1,
      phase: "action",
      resolutionSource: null,
      currentEncounter: drawnThreat,
      pendingEnemyRoll: null,
      pendingEffect: null,
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
              connected: false,
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
      scenarioProgress: createInitialScenarioProgress(this.state.activeScenarioId),
      sequence: this.state.sequence + 1,
      escalationLevel: 0,
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      lastOutcomeSummary: null,
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
  ): EncounterEffect {
    const keyedEffect = this.resolveThreatEffectKey(seatId, card, effectKey, timing)?.effect ?? null;
    return this.resolveEffect(this.combineEffects([baseEffect, keyedEffect].filter((effect): effect is EncounterEffect => Boolean(effect))) ?? baseEffect);
  }

  private runAutomaticPhases(seatId: string): void {
    let progressMade = true;

    while (progressMade) {
      progressMade = false;

      if (this.state.phase === "sector") {
        this.applyAction(this.createEncounterDrawnAction(seatId));
        progressMade = true;
        continue;
      }

      if (this.state.phase === "resolution" && this.state.pendingEffect) {
        this.applyAction({
          type: "RESOLUTION_APPLIED",
          seatId,
          effect: this.state.pendingEffect,
          sourceCardId: this.state.currentEncounter?.id ?? null,
          success: this.state.lastOutcomeSummary?.success ?? null,
          createdAt: new Date().toISOString()
        });
        progressMade = true;
        continue;
      }

      if (this.state.phase === "resolution" && this.shouldTriggerHeatThreshold(seatId)) {
        const player = this.state.players.find((entry) => entry.seatId === seatId);

        this.applyAction({
          type: "HEAT_THRESHOLD_REACHED",
          seatId,
          threshold: this.state.heatThreshold,
          newHeatTotal: player?.character.heat ?? 0,
          createdAt: new Date().toISOString()
        });
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
        const player = this.state.players.find((entry) => entry.seatId === seatId);
        const nextPhase =
          this.state.resolutionSource === "movement" && player?.character.status === "active"
            ? "sector"
            : "broadcast";

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

  private completeBroadcastTurn(seatId: string): void {
    this.applyEndOfTurnScenarioEffects(seatId);

    if (this.state.status !== "active") {
      this.broadcastPatch();
      return;
    }

    const previousActiveSeatIndex = this.state.activeSeatIndex;

    this.applyAction({
      type: "TURN_COMPLETED",
      seatId,
      createdAt: new Date().toISOString()
    });

    if (this.state.status === "active" && this.didRoundWrap(previousActiveSeatIndex, this.state.activeSeatIndex)) {
      this.applyRoundEscalation(seatId);
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
    const card = deck.length > 0 ? this.threats.get(deck[this.randomSource.nextInt(deck.length)] ?? "") ?? null : null;
    const revealEffectKey = card?.revealEffectKey ?? card?.effectKey;
    const revealEffect = card ? this.resolveThreatEffectKey(seatId, card, revealEffectKey, "onReveal")?.effect ?? null : null;

    return {
      type: "ENCOUNTER_DRAWN",
      seatId,
      sectorId: sector.id,
      card,
      revealEffect: revealEffect ? this.resolveEffect(revealEffect) : null,
      createdAt: new Date().toISOString()
    };
  }

  private shouldTriggerHeatThreshold(seatId: string): boolean {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    return (
      this.state.phase === "resolution" &&
      this.state.status === "active" &&
      !this.state.pendingEffect &&
      player?.character.status === "active" &&
      player.character.heat >= this.state.heatThreshold
    );
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

    if (player.character.status === "active" && player.character.heat >= this.state.heatThreshold) {
      this.applyAction({
        type: "HEAT_THRESHOLD_REACHED",
        seatId,
        threshold: this.state.heatThreshold,
        newHeatTotal: player.character.heat,
        createdAt: new Date().toISOString()
      });
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
    const mirrorPressure = player.character.heat;
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
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus =
      player.character.stats[intent.stat] +
      getEquippedGearBonus(player.character, intent.stat) +
      this.getScenarioSkillModifier(intent.seatId) +
      (keyedModifiers.playerBonusModifier ?? 0);
    const difficulty = encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0);
    const total = roll.total + statBonus;
    const success = total >= difficulty;
    const outcomeEffect = this.resolveThreatOutcomeEffect(
      intent.seatId,
      encounter,
      success ? encounter.successEffect : encounter.failEffect,
      success ? encounter.successEffectKey : encounter.failEffectKey,
      success ? "onSuccess" : "onFailure"
    );

    this.applyAction({
      type: "CHECK_ROLLED",
      seatId: intent.seatId,
      stat: intent.stat,
      difficulty,
      roll,
      statBonus,
      total,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      createdAt: new Date().toISOString()
    });
    this.applyScenarioOnSkillResolved(intent.seatId, intent.stat, success);
    this.maybeTriggerAbilityOnCheckResolved(intent.seatId, intent.stat, success);
    this.runAutomaticPhases(intent.seatId);
  }

  resolveMoveIntent(intent: Extract<ClientIntent, { type: "MOVE_REQUESTED" }>): void {
    const { player, fromSectorId, targetSector } = this.assertLegalMove(intent.seatId, intent.toSectorId);

    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus =
      player.character.stats.guile +
      getEquippedGearBonus(player.character, "guile") +
      this.getScenarioSkillModifier(intent.seatId);
    const total = roll.total + statBonus;
    const difficulty = targetSector.danger + escalationModifier;
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
      effect: success ? null : this.resolveEffect({ type: "gain_heat", amount: 1 }),
      createdAt: new Date().toISOString()
    } satisfies MovementResolvedAction);
    this.applyScenarioOnSkillResolved(intent.seatId, "guile", success);
    this.maybeTriggerAbilityOnMovementResolved(intent.seatId, intent.toSectorId, success);
    if (success) {
      this.applyScenarioOnSectorEntered(intent.seatId, intent.toSectorId);
    }
    this.runAutomaticPhases(intent.seatId);
  }

  private assertLegalMove(
    seatId: string,
    toSectorId: string
  ): { player: PlayerState; fromSectorId: string; targetSector: GameState["sectors"][number] } {
    const player = this.state.players.find((entry) => entry.seatId === seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${seatId}`);
    }

    const fromSectorId = player.character.currentSpaceId;
    const currentSector = this.state.sectors.find((entry) => entry.id === fromSectorId);
    const targetSector = this.state.sectors.find((entry) => entry.id === toSectorId);

    if (!currentSector) {
      throw new Error(`Unknown current sector ${fromSectorId}`);
    }

    if (!targetSector) {
      throw new Error(`Unknown sector ${toSectorId}`);
    }

    if (!currentSector.neighbors.includes(toSectorId)) {
      throw new Error(`${targetSector.name} is not adjacent to ${currentSector.name}`);
    }

    const targetSpace = getBoardSpace(toSectorId);
    const notes = new Set(player.private.notes);

    for (const requirement of targetSpace?.movementRequirements ?? []) {
      if (requirement.allowedFrom && !requirement.allowedFrom.includes(fromSectorId)) {
        throw new Error(requirement.errorMessage);
      }

      if (requirement.requiredNotes && !requirement.requiredNotes.every((note) => notes.has(note))) {
        throw new Error(requirement.errorMessage);
      }
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
        getEquippedGearBonus(player.character, resolution.check.stat) +
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
        this.resolveEffect(effect)
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
    }
    this.maybeTriggerAbilityOnSpaceTextResolved(intent.seatId, resolution.effectKey);
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

    if (scenario.id === "scenario_mirror_of_false_heroes" && player.character.heat >= this.state.heatThreshold) {
      this.applyAmbientScenarioMutation(
        intent.seatId,
        (state) => state,
        `${player.character.name} cannot face the mirror while reflection pressure sits at ${player.character.heat}/${this.state.heatThreshold}. The confrontation ends immediately.`
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

    this.maybeTriggerAbilityOnScenarioConfrontationRequested(intent.seatId);

    const plan = this.buildScenarioPlan(player);
    const nemesis = this.getActiveNemesis();
    const confrontationModifier = getEscalationModifier(this.state.escalationLevel);

    const results = plan.checks.map((check) => {
      const roll = rollDice(2, 6, this.randomSource);
      const statBonus =
        player.character.stats[check.stat] +
        getEquippedGearBonus(player.character, check.stat) +
        this.getScenarioSkillModifier(intent.seatId);
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
    const currentProgress = this.state.scenarioProgress[progressKey] ?? 0;
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
          effectParts.push({ type: "gain_heat", amount: failedChecks });
        }
        break;
      case "scenario_devourer_beneath":
        if (failedChecks > 0) {
          effectParts.push({ type: "take_wound", amount: 1 });
          effectParts.push({ type: "gain_heat", amount: 1 });
        }
        break;
      case "scenario_labyrinth_engine":
        if (failedChecks > 0) {
          effectParts.push({ type: "gain_heat", amount: failedChecks });
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
    const appliedEffect = nemesis && willWin ? plan.effect : combinedEffect;
    const backlashSummary =
      nemesis && willWin && failedChecks > 0
        ? `Backlash ${failedChecks} denied by the killing blow.`
        : failedChecks > 0
          ? `Backlash ${failedChecks}.`
          : "No backlash.";

    const summary = [
      `${scenario.confrontationTitle}: ${marksEarned} ${plan.markLabel}${marksEarned === 1 ? "" : "s"} earned.`,
      ...results.map((result) =>
        `${result.label} via ${result.stat} ${result.total}/${result.difficulty} ${result.success ? "passed" : "failed"}`
      ),
      backlashSummary,
      `Progress ${nextProgress}/${effectiveThreshold}.`
    ].join(" ");

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

    if (willWin && this.state.status === "active") {
      this.applyAction({
        type: "SCENARIO_VICTORY_ACHIEVED",
        seatId: intent.seatId,
        scenarioId: scenario.id,
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

    this.applyAction({
      type: "PHASE_ADVANCED",
      seatId: intent.seatId,
      toPhase: "resolution",
      createdAt: new Date().toISOString()
    });

    this.runAutomaticPhases(intent.seatId);
  }

  private getRaiseStatCost(): number {
    return TROPHY_COST_PER_RANK;
  }

  resolveRaiseStatIntent(intent: Extract<ClientIntent, { type: "RAISE_STAT_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    if (this.state.status !== "active" || this.state.phase !== "action") {
      throw new Error("Stat raises are only available during an active action phase");
    }

    if (this.state.turnOrder[this.state.activeSeatIndex] !== intent.seatId) {
      throw new Error("Only the active seat can raise a stat");
    }

    if (player.character.status !== "active") {
      throw new Error("Recalled operatives cannot raise stats");
    }

    if (this.state.pendingEnemyRoll || this.state.currentEncounter || this.state.pendingEffect) {
      throw new Error("Resolve the current threat before raising a stat");
    }

    if (player.character.stats[intent.stat] >= MAX_STAT_RANK) {
      throw new Error(`${intent.stat} is already at the maximum rank`);
    }

    const cost = this.getRaiseStatCost();

    if (player.character.trophies < cost) {
      throw new Error(`Not enough trophies to raise ${intent.stat}`);
    }

    this.applyAction({
      type: "STAT_RAISED",
      seatId: intent.seatId,
      stat: intent.stat,
      cost,
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
    const statBonus =
      player.character.stats[stat] +
      getEquippedGearBonus(player.character, stat) +
      this.getScenarioBattleModifier(fighterSeatId) +
      (keyedModifiers.playerBonusModifier ?? 0);
    const enemyBonus = encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0);
    const scenarioEnemyBonus = this.getScenarioEnemyBattleModifier();
    const keyedEnemyBonus = keyedModifiers.enemyBonusModifier ?? 0;
    const total = playerRoll.total + statBonus;
    const enemyTotal = enemyRoll.total + enemyBonus + scenarioEnemyBonus + keyedEnemyBonus;
    const success = total >= enemyTotal;
    const outcomeEffect = this.resolveThreatOutcomeEffect(
      fighterSeatId,
      encounter,
      success ? encounter.defeatReward : encounter.woundOnLoss,
      success ? encounter.defeatEffectKey : encounter.failEffectKey,
      success ? "onDefeat" : "onFailure"
    );

    this.applyAction({
      type: "COMBAT_RESOLVED",
      seatId: fighterSeatId,
      stat,
      difficulty: encounter.difficulty + escalationModifier + (keyedModifiers.difficultyModifier ?? 0),
      roll: playerRoll,
      enemyRoll,
      statBonus,
      enemyBonus: enemyBonus + scenarioEnemyBonus + keyedEnemyBonus,
      total,
      enemyTotal,
      success,
      effect: outcomeEffect,
      cardId: encounter.id,
      enemyRollerSeatId,
      createdAt: new Date().toISOString()
    } satisfies CombatResolvedAction);
    if (success) {
      this.maybeTriggerAbilityOnCombatVictory(fighterSeatId);
      this.applyScenarioOnEnemyDefeat(fighterSeatId);
    }
    this.runAutomaticPhases(fighterSeatId);
  }

  private resolveEffect(effect: EncounterEffect): EncounterEffect {
    if (effect.type === "gain_gear") {
      return {
        ...effect,
        gear: this.gear.get(effect.gearId)
      };
    }

    if (effect.type === "gain_follower") {
      return {
        ...effect,
        follower: this.followers.get(effect.followerId)
      };
    }

    if (effect.type === "sequence") {
      return {
        ...effect,
        effects: effect.effects.map((entry: EncounterEffect) => this.resolveEffect(entry)) as typeof effect.effects
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

    const changed = nextSeats.some((seat, index) => seat.connected !== this.state.seats[index]?.connected);

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
          ? createTvProjection(this.state)
          : createPhoneProjection(this.state, client.seatId ?? "", forcePrivate)
    };
  }
}

export function createTvProjection(state: GameState): Record<string, unknown> {
  const escalationThreshold = getEscalationCollapseLevel(state.sessionMode);
  const activeScenario = getScenarioDefinition(state.activeScenarioId);
  const activeScenarioProgress = activeScenario ? (state.scenarioProgress[activeScenario.winConditionKey] ?? 0) : 0;
  const activeNemesis = getLinkedNemesis(state.activeScenarioId);
  const activeScenarioThreshold = getScenarioProgressThreshold(state.activeScenarioId, activeScenario?.victoryThreshold ?? 0);
  const escalationModifier = getEscalationModifier(state.escalationLevel);
  const scenarioPressureSummary = describeScenarioPressure(state) ?? "Scenario pressure will appear once the room is active.";
  const scenarioTelemetry = buildScenarioTelemetry(state);

  const visibleSeatIds = new Set(
    state.seats.filter((seat) => !seat.kicked && seat.displayName).map((seat) => seat.seatId)
  );
  const visiblePlayers = state.players.filter((player) => visibleSeatIds.has(player.seatId));
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
    sessionMode: state.sessionMode,
    interactionMode: state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry"),
    winnerSeatId: state.winnerSeatId,
    activeScenario: activeScenario
      ? {
          id: activeScenario.id,
          name: activeScenario.name,
          theme: activeScenario.theme,
          difficulty: activeScenario.difficulty,
          pressureSummary: scenarioPressureSummary,
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
    scenarioProgress: state.scenarioProgress,
    seats: state.seats.map((seat) => ({
      seatId: seat.seatId,
      characterId: seat.characterId,
      displayName: seat.displayName ?? null,
      connected: seat.connected,
      kicked: seat.kicked
    })),
    sectors: state.sectors,
    players: visiblePlayers.map((player) => ({
      seatId: player.seatId,
      character: {
        id: player.character.id,
        name: player.character.name,
        archetype: player.character.archetype,
        status: player.character.status,
        activeContract: player.character.activeContract,
        stats: player.character.stats,
        trophies: player.character.trophies,
        heat: player.character.heat,
        wounds: player.character.wounds,
        scars: player.character.scars,
        heldGearCount: player.character.heldGear.length,
        followerCount: player.character.followers?.length ?? 0,
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
    outcomeSummary: state.lastOutcomeSummary,
    recentAbilityTriggers,
    nemesis: nemesisSummary
  };
}

export function createPhoneProjection(state: GameState, seatId: string, forcePrivate = false): Record<string, unknown> {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const publicProjection = createTvProjection(state);

  return {
    phase: state.phase,
    status: state.status,
    sessionMode: state.sessionMode,
    interactionMode: state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry"),
    winnerSeatId: state.winnerSeatId,
    activeScenario: publicProjection.activeScenario,
    scenarioTelemetry: publicProjection.scenarioTelemetry,
    scenarioProgress: publicProjection.scenarioProgress,
    activeSeatIndex: state.activeSeatIndex,
    seats: publicProjection.seats,
    turnOrder: publicProjection.turnOrder,
    sectors: state.sectors,
    players: publicProjection.players,
    escalationLevel: publicProjection.escalationLevel,
    escalationThreshold: publicProjection.escalationThreshold,
    escalationModifier: publicProjection.escalationModifier,
    availableContracts: state.availableContracts,
    encounter: state.currentEncounter,
    pendingEnemyRoll: state.pendingEnemyRoll,
    outcomeSummary: state.lastOutcomeSummary,
    recentAbilityTriggers: publicProjection.recentAbilityTriggers,
    nemesis: publicProjection.nemesis,
    self: player ? sanitizePlayerForPhone(player) : null
  };
}

function sanitizePlayerForPhone(player: PlayerState): Record<string, unknown> {
  return {
    seatId: player.seatId,
    character: {
      ...player.character,
      scarCards: summarizeScars(player.character.scars)
    },
    sectorId: player.character.currentSpaceId,
    hand: player.private.hand,
    notes: player.private.notes
  };
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
