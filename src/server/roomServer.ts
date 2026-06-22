import { WebSocketServer, type WebSocket } from "ws";
import { loadCharacters } from "../game/content/characters.js";
import { loadContracts } from "../game/content/contracts.js";
import { loadGear } from "../game/content/gear.js";
import { loadThreatCards } from "../game/content/threats.js";
import { getScenarioDefinition } from "../game/data/scenarios.js";
import { ESCALATION_COLLAPSE_LEVEL, getEscalationModifier } from "../game/engine/escalation.js";
import { createInitialScenarioProgress } from "../game/rules/scenarioAmbient.js";
import { hasScenarioVictory } from "../game/rules/scenarioResolver.js";
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
  ScenarioConfrontationRequestedAction,
  ScenarioProgressAdvancedAction,
  ScenarioVictoryAchievedAction,
  StabilizeResolvedAction,
  UnequipGearAction
} from "../game/engine/actions.js";
import { getEquippedGearBonus } from "../game/engine/gear.js";
import type { EncounterEffect, ThreatCard } from "../game/schema/card.schema.js";
import type { Character } from "../game/schema/character.schema.js";
import type { ContractCard } from "../game/schema/contract.schema.js";
import type { GearItem } from "../game/schema/gear.schema.js";
import { rollDice, type RandomSource, defaultRandomSource } from "../game/engine/dice.js";
import { reduceGameState } from "../game/engine/reducer.js";
import type { GameState, PlayerState } from "../game/schema/session.schema.js";
import { validateHostToken, validateJoinToken } from "./auth.js";

export const ESCALATION_FEEDERS = {
  woundTaken: 1,
  trophyDiscarded: 1
} as const;

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

class IntentRejectedError extends Error {
  public constructor(
    public readonly actionType: string,
    reason: string
  ) {
    super(reason);
    this.name = "IntentRejectedError";
  }
}

export class GameRoomServer {
  private readonly clients = new Set<ConnectedClient>();
  private readonly characters: Map<string, Character>;
  private readonly contracts: Map<string, ContractCard>;
  private readonly gear: Map<string, GearItem>;
  private readonly threats: Map<string, ThreatCard>;
  private hostToken: string | null = null;

  public constructor(
    private state: GameState,
    private readonly events: GameAction[] = [],
    private readonly randomSource: RandomSource = defaultRandomSource,
    threats?: Map<string, ThreatCard>,
    characters?: Map<string, Character>,
    gear?: Map<string, GearItem>,
    contracts?: Map<string, ContractCard>
  ) {
    this.threats = threats ?? loadThreatCards();
    this.characters = characters ?? loadCharacters();
    this.gear = gear ?? loadGear();
    this.contracts = contracts ?? loadContracts();
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
          const message = JSON.parse(String(raw)) as ClientMessage;

          if (this.isRejoinMessage(message)) {
            this.handleRejoin(client, message);
            return;
          }

          this.handleIntent(client, message);
        } catch (error) {
          this.sendIntentRejected(client, "UNKNOWN", error instanceof Error ? error.message : "Malformed intent");
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
    }
    this.broadcastPatch();
  }

  private isRejoinMessage(message: ClientMessage): message is RejoinMessage {
    return message.type === "REJOIN";
  }

  private isHostCommand(message: ClientMessage): message is HostCommandMessage {
    return message.type === "KICK_SEAT" || message.type === "RESTART_SESSION";
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
      case "STABILIZE_REQUESTED":
        throw new Error("Stabilize requests are resolved directly");
      default: {
        const exhaustiveCheck: never = intent;
        return exhaustiveCheck;
      }
    }
  }

  private applyAction(action: GameAction): void {
    const previousState = this.state;
    const previousTotalWounds = this.getTotalWounds(previousState);
    const result = reduceGameState(this.state, action);

    if (!result.ok) {
      throw new IntentRejectedError(result.rejection.actionType, result.rejection.reason);
    }

    this.state = result.state;
    this.events.push(action, ...result.emitted);

    const woundDelta = this.getTotalWounds(this.state) - previousTotalWounds;

    if (previousState.status === "active" && woundDelta > 0) {
      this.feedEscalation(
        action.seatId,
        woundDelta * ESCALATION_FEEDERS.woundTaken,
        "wounds taken"
      );
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

  private feedEscalation(seatId: string, delta: number, reason: string): void {
    if (this.state.status !== "active" || delta === 0) {
      return;
    }

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

    if (nextLevel >= ESCALATION_COLLAPSE_LEVEL) {
      this.applyAction({
        type: "SECTOR_COLLAPSED",
        seatId,
        threshold: ESCALATION_COLLAPSE_LEVEL,
        modifier,
        summary: `Escalation reached ${nextLevel}/${ESCALATION_COLLAPSE_LEVEL}. The breach overtook the operatives (${reason}).`,
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

  private applyStartOfTurnScenarioEffects(seatId: string): void {
    if (this.state.status !== "active") {
      return;
    }

    switch (this.state.activeScenarioId) {
      case "scenario_broken_seal": {
        if (!Object.hasOwn(this.state.scenarioProgress, "sealTokens")) {
          return;
        }
        const roll = this.randomSource.nextInt(6) + 1;
        if (roll <= 2) {
          const nextSealTokens = Math.max(0, this.getScenarioCounter("sealTokens", 6) - 1);
          this.applyAmbientScenarioMutation(
            seatId,
            (state) => ({
              ...state,
              scenarioProgress: {
                ...state.scenarioProgress,
                sealTokens: nextSealTokens
              },
              players:
                nextSealTokens === 0
                  ? state.players.map((player) => ({
                      ...player,
                      character: {
                        ...player.character,
                        heat: player.character.heat + 1
                      }
                    }))
                  : state.players
            }),
            nextSealTokens === 0
              ? "The last seal broke. Every operative gained 1 Heat."
              : `The Broken Seal weakens. ${nextSealTokens} seal tokens remain.`
          );
        } else if (roll <= 4) {
          this.applyAmbientScenarioMutation(
            seatId,
            (state) => ({
              ...state,
              players: state.players.map((player) =>
                player.seatId === seatId
                  ? {
                      ...player,
                      character: {
                        ...player.character,
                        heat: player.character.heat + 1
                      }
                    }
                  : player
              )
            }),
            "Breach static surges across the turn start. The active operative gains 1 Heat."
          );
        }
        break;
      }
      case "scenario_labyrinth_engine": {
        if (!Object.hasOwn(this.state.scenarioProgress, "engineModeIndex")) {
          return;
        }
        const nextMode = (this.getScenarioCounter("engineModeIndex", 0) + 1) % 3;
        this.applyAmbientScenarioMutation(
          seatId,
          (state) => ({
            ...state,
            scenarioProgress: {
              ...state.scenarioProgress,
              engineModeIndex: nextMode
            }
          }),
          `The Labyrinth Engine shifts to mode ${nextMode}.`
        );
        break;
      }
      default:
        break;
    }
  }

  private applyEndOfTurnScenarioEffects(seatId: string): void {
    if (this.state.status !== "active") {
      return;
    }

    switch (this.state.activeScenarioId) {
      case "scenario_devourer_beneath": {
        if (!Object.hasOwn(this.state.scenarioProgress, "devourerIndex")) {
          return;
        }
        const outerRing = this.getOuterRingSectorIds();
        if (outerRing.length === 0) {
          return;
        }

        const nextIndex = (this.getScenarioCounter("devourerIndex", 0) + 1) % outerRing.length;
        const nextSectorId = outerRing[nextIndex]!;
        const sector = this.state.sectors.find((entry) => entry.id === nextSectorId);
        const consumedThreats = sector?.encounterDecks.threat.length ?? 0;
        const nextDoom = this.getScenarioCounter("doomTokens", 0) + (consumedThreats > 0 ? 1 : 0);
        const erupted = nextDoom >= 8;

        this.applyAmbientScenarioMutation(
          seatId,
          (state) => ({
            ...state,
            scenarioProgress: {
              ...state.scenarioProgress,
              devourerIndex: nextIndex,
              doomTokens: erupted ? Math.max(0, nextDoom - 4) : nextDoom
            },
            sectors: state.sectors.map((entry) =>
              entry.id === nextSectorId
                ? {
                    ...entry,
                    encounterDecks: {
                      ...entry.encounterDecks,
                      threat: []
                    }
                  }
                : entry
            ),
            players: erupted
              ? state.players.map((player) => ({
                  ...player,
                  character: {
                    ...player.character,
                    heat: player.character.heat + 1
                  }
                }))
              : state.players
          }),
          erupted
            ? `The Devourer reached ${nextDoom} doom. The table suffers 1 Heat each and doom falls back to ${Math.max(0, nextDoom - 4)}.`
            : `The Devourer moves to ${nextSectorId}${consumedThreats > 0 ? " and consumes local threats, raising doom." : "."}`
        );
        break;
      }
      case "scenario_dying_star": {
        if (!Object.hasOwn(this.state.scenarioProgress, "starTokens")) {
          return;
        }
        const nextStars = Math.max(0, this.getScenarioCounter("starTokens", 10) - 1);
        const erupted = nextStars === 0;
        this.applyAmbientScenarioMutation(
          seatId,
          (state) => ({
            ...state,
            scenarioProgress: {
              ...state.scenarioProgress,
              starTokens: erupted ? 5 : nextStars
            },
            players: erupted
              ? state.players.map((player) => ({
                  ...player,
                  character: {
                    ...player.character,
                    wounds: player.character.wounds + 1
                  }
                }))
              : state.players
          }),
          erupted
            ? "The Dying Star erupts. Every operative takes 1 wound and the star track resets to 5."
            : `The Dying Star dims to ${nextStars} remaining star tokens.`
        );
        break;
      }
      default:
        break;
    }
  }

  private applyScenarioOnEnemyDefeat(seatId: string): void {
    if (this.state.status !== "active") {
      return;
    }

    if (this.state.activeScenarioId === "scenario_broken_seal") {
      if (!Object.hasOwn(this.state.scenarioProgress, "sealTokens")) {
        return;
      }
      const nextSealTokens = Math.min(6, this.getScenarioCounter("sealTokens", 6) + 1);
      this.applyAmbientScenarioMutation(
        seatId,
        (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            sealTokens: nextSealTokens
          }
        }),
        `The enemy defeat strengthens the ward. ${nextSealTokens} seal tokens now stand.`
      );
    }

    if (this.state.activeScenarioId === "scenario_throne_of_ash") {
      if (!Object.hasOwn(this.state.scenarioProgress, "crownClaims")) {
        return;
      }
      const nextClaims = Math.min(3, this.getScenarioCounter("crownClaims", 0) + 1);
      this.applyAmbientScenarioMutation(
        seatId,
        (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            crownClaims: nextClaims
          }
        }),
        `A Crown claim is secured. ${nextClaims}/3 claims are now held.`
      );
    }
  }

  private applyScenarioOnContractCompleted(seatId: string): void {
    if (this.state.status !== "active") {
      return;
    }

    if (this.state.activeScenarioId === "scenario_throne_of_ash") {
      if (!Object.hasOwn(this.state.scenarioProgress, "crownClaims")) {
        return;
      }
      const nextClaims = Math.min(3, this.getScenarioCounter("crownClaims", 0) + 1);
      this.applyAmbientScenarioMutation(
        seatId,
        (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            crownClaims: nextClaims
          }
        }),
        `A Crown claim is secured through a completed contract. ${nextClaims}/3 claims are now held.`
      );
    }

    if (this.state.activeScenarioId === "scenario_mirror_of_false_heroes") {
      this.applyAmbientScenarioMutation(
        seatId,
        (state) => ({
          ...state,
          players: state.players.map((player) =>
            player.seatId === seatId
              ? {
                  ...player,
                  character: {
                    ...player.character,
                    heat: player.character.heat + 1
                  }
                }
              : player
          )
        }),
        "The mirror feeds on praise. The active operative gains 1 Heat."
      );
    }
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

    return {
      type: "ENCOUNTER_DRAWN",
      seatId,
      sectorId: sector.id,
      card,
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

    return `scar-wound-${scarCount}`;
  }

  private countEquippedGear(player: PlayerState): number {
    return Object.values(player.character.equippedGear).filter(Boolean).length;
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
    const crownProxy = Math.min(3, this.getScenarioCounter("crownClaims", 0));
    const mirrorPressure = player.character.heat;
    const engineModeIndex = this.getScenarioCounter("engineModeIndex", 0) % 3;
    const engineRotation: ScenarioCheck[] = [
      { stat: "command", difficulty: 12, label: "Stabilize the command lattice" },
      { stat: "signal", difficulty: 12, label: "Anchor the starfire relays" },
      { stat: "guile", difficulty: 12, label: "Walk the shifting engine path" }
    ];

    switch (this.state.activeScenarioId) {
      case "scenario_broken_seal":
        return {
          checks: [
            { stat: "grit", difficulty: 10, label: "Hold the breached ward shut" },
            { stat: "signal", difficulty: 10, label: "Realign the split sigils" },
            { stat: "guile", difficulty: 12, label: "Resist the mind behind the breach" }
          ],
          markLabel: "restoration mark",
          effect: null,
          victorySummary: `${player.character.name} sealed the Cinder Gate and won the campaign.`
        };
      case "scenario_throne_of_ash": {
        const checks: ScenarioCheck[] =
          crownProxy >= 3
            ? [{ stat: "command", difficulty: 12, label: "Speak the throne's final command" }]
            : crownProxy === 2
              ? [
                  { stat: "command", difficulty: 12, label: "Command the ash-crowns" },
                  { stat: "guile", difficulty: 12, label: "Outlast the throne's claimant-shade" }
                ]
              : crownProxy === 1
                ? [
                    { stat: "command", difficulty: 12, label: "Command the throne's fireline" },
                    { stat: "grit", difficulty: 12, label: "Endure the ash pressure" },
                    { stat: "guile", difficulty: 12, label: "Outmaneuver the relic judges" }
                  ]
                : [
                    { stat: "command", difficulty: 14, label: "Command the empty throne" },
                    { stat: "grit", difficulty: 14, label: "Endure the ash pressure" },
                    { stat: "guile", difficulty: 14, label: "Outmaneuver the relic judges" }
              ];

        return {
          checks,
          markLabel: "throne claim",
          effect: null,
          victorySummary: `${player.character.name} claimed the Throne of Ash with ${crownProxy} crown claim${crownProxy === 1 ? "" : "s"}.`
        };
      }
      case "scenario_mirror_of_false_heroes":
        return {
          checks: [
            { stat: "guile", difficulty: 10 + mirrorPressure, label: "Outwit your mirrored self" },
            { stat: "signal", difficulty: 10 + mirrorPressure, label: "Steady your fractured signal" },
            { stat: "grit", difficulty: 10 + mirrorPressure, label: "Break the final reflection" }
          ],
          markLabel: "mirror break",
          effect:
            mirrorPressure >= 6
              ? { type: "gain_heat", amount: 1 }
              : null,
          victorySummary: `${player.character.name} shattered the false hero and walked free of the mirror.`
        };
      case "scenario_devourer_beneath":
        return {
          checks: [
            {
              stat: "grit",
              difficulty: Math.max(8, 14 - salvageLeverage),
              label: "Drive into the Devourer's true maw"
            }
          ],
          markLabel: "maw strike",
          effect: null,
          victorySummary: `${player.character.name} pierced the Devourer Beneath and silenced the maw.`
        };
      case "scenario_labyrinth_engine": {
        const checks = [
          engineRotation[engineModeIndex]!,
          engineRotation[(engineModeIndex + 1) % engineRotation.length]!,
          engineRotation[(engineModeIndex + 2) % engineRotation.length]!
        ];

        return {
          checks,
          markLabel: "shutdown mark",
          effect: null,
          victorySummary: `${player.character.name} shut down the Labyrinth Engine before reality folded again.`
        };
      }
      case "scenario_dying_star":
        return {
          checks: [
            { stat: "guile", difficulty: 12, label: "Repair the ignition geometry" },
            { stat: "grit", difficulty: 12, label: "Brace the unstable reactor" },
            { stat: "signal", difficulty: 12, label: "Survive the restart pulse" }
          ],
          markLabel: "ignition mark",
          effect: heldGearCount === 0 ? { type: "take_wound", amount: 2 } : null,
          victorySummary: `${player.character.name} reignited the dying star and restored the sector light.`
        };
      default:
        throw new Error(`Scenario confrontation rules are not implemented for ${this.state.activeScenarioId}`);
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
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus = player.character.stats[intent.stat] + getEquippedGearBonus(player.character, intent.stat);
    const difficulty = encounter.difficulty + escalationModifier;
    const total = roll.total + statBonus;
    const success = total >= difficulty;

    this.applyAction({
      type: "CHECK_ROLLED",
      seatId: intent.seatId,
      stat: intent.stat,
      difficulty,
      roll,
      statBonus,
      total,
      success,
      effect: this.resolveEffect(success ? encounter.successEffect : encounter.failEffect),
      cardId: encounter.id,
      createdAt: new Date().toISOString()
    });
    this.runAutomaticPhases(intent.seatId);
  }

  resolveMoveIntent(intent: Extract<ClientIntent, { type: "MOVE_REQUESTED" }>): void {
    const player = this.state.players.find((entry) => entry.seatId === intent.seatId);

    if (!player) {
      throw new Error(`Missing player for seat ${intent.seatId}`);
    }

    const targetSector = this.state.sectors.find((entry) => entry.id === intent.toSectorId);

    if (!targetSector) {
      throw new Error(`Unknown sector ${intent.toSectorId}`);
    }

    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const roll = rollDice(2, 6, this.randomSource);
    const statBonus = player.character.stats.guile + getEquippedGearBonus(player.character, "guile");
    const total = roll.total + statBonus;
    const difficulty = targetSector.danger + escalationModifier;
    const success = total >= difficulty;

    this.applyAction({
      type: "MOVEMENT_RESOLVED",
      seatId: intent.seatId,
      fromSectorId: player.character.currentSpaceId,
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
    this.runAutomaticPhases(intent.seatId);
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

    const plan = this.buildScenarioPlan(player);
    const confrontationModifier = getEscalationModifier(this.state.escalationLevel);

    const results = plan.checks.map((check) => {
      const roll = rollDice(2, 6, this.randomSource);
      const statBonus = player.character.stats[check.stat] + getEquippedGearBonus(player.character, check.stat);
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
    const effectParts: EncounterEffect[] = [];

    if (plan.effect) {
      effectParts.push(plan.effect);
    }

    switch (scenario.id) {
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

    const summary = [
      `${scenario.confrontationTitle}: ${marksEarned} ${plan.markLabel}${marksEarned === 1 ? "" : "s"} earned.`,
      ...results.map((result) =>
        `${result.label} via ${result.stat} ${result.total}/${result.difficulty} ${result.success ? "passed" : "failed"}`
      ),
      failedChecks > 0 ? `Backlash ${failedChecks}.` : "No backlash.",
      `Progress ${nextProgress}/${scenario.victoryThreshold}.`
    ].join(" ");

    this.applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: intent.seatId,
      scenarioId: scenario.id,
      progressKey,
      amount: marksEarned,
      effect: combinedEffect,
      summary,
      createdAt: new Date().toISOString()
    } satisfies ScenarioProgressAdvancedAction);

    if (this.state.status !== "active") {
      return;
    }

    this.maybeApplyScenarioThresholds(intent.seatId);

    if (this.state.status !== "active") {
      return;
    }

    if (hasScenarioVictory(this.state.scenarioProgress, scenario)) {
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

  private resolveOpposedCombat(
    fighterSeatId: string,
    stat: CombatRequestedAction["stat"],
    encounter: Extract<ThreatCard, { cardType: "enemy" }>,
    enemyRollerSeatId: string | null
  ): void {
    const player = this.state.players.find((entry) => entry.seatId === fighterSeatId);

    if (!player) {
      throw new Error(`Missing player for seat ${fighterSeatId}`);
    }

    const playerRoll = rollDice(2, 6, this.randomSource);
    const enemyRoll = rollDice(2, 6, this.randomSource);
    const escalationModifier = getEscalationModifier(this.state.escalationLevel);
    const statBonus = player.character.stats[stat] + getEquippedGearBonus(player.character, stat);
    const enemyBonus = encounter.difficulty + escalationModifier;
    const total = playerRoll.total + statBonus;
    const enemyTotal = enemyRoll.total + enemyBonus;
    const success = total >= enemyTotal;

    this.applyAction({
      type: "COMBAT_RESOLVED",
      seatId: fighterSeatId,
      stat,
      difficulty: encounter.difficulty + escalationModifier,
      roll: playerRoll,
      enemyRoll,
      statBonus,
      enemyBonus,
      total,
      enemyTotal,
      success,
      effect: this.resolveEffect(success ? encounter.defeatReward : encounter.woundOnLoss),
      cardId: encounter.id,
      enemyRollerSeatId,
      createdAt: new Date().toISOString()
    } satisfies CombatResolvedAction);
    if (success) {
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

    if (effect.type === "sequence") {
      return {
        ...effect,
        effects: effect.effects.map((entry: EncounterEffect) => this.resolveEffect(entry)) as typeof effect.effects
      };
    }

    return effect;
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
  const activeScenario = getScenarioDefinition(state.activeScenarioId);
  const activeScenarioProgress = activeScenario ? (state.scenarioProgress[activeScenario.winConditionKey] ?? 0) : 0;
  const escalationModifier = getEscalationModifier(state.escalationLevel);
  const outerRing = state.sectors.filter((sector) => sector.regionTier === "borderlight");
  const devourerIndex = state.scenarioProgress.devourerIndex ?? 0;
  const devourerSector = outerRing.length > 0 ? outerRing[devourerIndex % outerRing.length] ?? null : null;
  const engineModeIndex = state.scenarioProgress.engineModeIndex ?? 0;
  const engineModes = ["Command", "Signal", "Guile"];
  const scenarioTelemetry =
    activeScenario?.id === "scenario_broken_seal"
      ? [
          { label: "Seal Tokens", value: String(state.scenarioProgress.sealTokens ?? 0) },
          { label: "Pressure Roll", value: "1-2 weaken | 3-4 heat surge" }
        ]
      : activeScenario?.id === "scenario_throne_of_ash"
        ? [
            { label: "Crown Claims", value: String(state.scenarioProgress.crownClaims ?? 0) },
            { label: "Throne Gate", value: `${activeScenarioProgress}/${activeScenario.victoryThreshold}` }
          ]
        : activeScenario?.id === "scenario_mirror_of_false_heroes"
          ? [
              { label: "Mirror Breaks", value: `${activeScenarioProgress}/${activeScenario.victoryThreshold}` },
              { label: "Corruption Proxy", value: "Heat-driven backlash" }
            ]
          : activeScenario?.id === "scenario_devourer_beneath"
            ? [
                { label: "Doom Tokens", value: String(state.scenarioProgress.doomTokens ?? 0) },
                { label: "Devourer", value: devourerSector?.name ?? "Outer ring" }
              ]
            : activeScenario?.id === "scenario_labyrinth_engine"
              ? [
                  { label: "Engine Mode", value: engineModes[engineModeIndex % engineModes.length] ?? "Command" },
                  { label: "Shutdown", value: `${activeScenarioProgress}/${activeScenario.victoryThreshold}` }
                ]
              : activeScenario?.id === "scenario_dying_star"
                ? [
                    { label: "Star Tokens", value: String(state.scenarioProgress.starTokens ?? 0) },
                    { label: "Ignition", value: `${activeScenarioProgress}/${activeScenario.victoryThreshold}` }
                  ]
                : [];

  const visibleSeatIds = new Set(
    state.seats.filter((seat) => !seat.kicked && seat.displayName).map((seat) => seat.seatId)
  );
  const visiblePlayers = state.players.filter((player) => visibleSeatIds.has(player.seatId));

  return {
    status: state.status,
    sessionMode: state.sessionMode,
    winnerSeatId: state.winnerSeatId,
    activeScenario: activeScenario
      ? {
          id: activeScenario.id,
          name: activeScenario.name,
          confrontationTitle: activeScenario.confrontationTitle,
          progressLabel: activeScenario.winConditionKey,
          progress: activeScenarioProgress,
          threshold: activeScenario.victoryThreshold
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
        heat: player.character.heat,
        wounds: player.character.wounds,
        scars: player.character.scars,
        heldGearCount: player.character.heldGear.length,
        equippedGear: player.character.equippedGear
      },
      sectorId: player.character.currentSpaceId
    })),
    activeSeatIndex: state.activeSeatIndex,
    turnOrder: state.turnOrder,
    escalationLevel: state.escalationLevel,
    escalationThreshold: ESCALATION_COLLAPSE_LEVEL,
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
    outcomeSummary: state.lastOutcomeSummary
  };
}

export function createPhoneProjection(state: GameState, seatId: string, forcePrivate = false): Record<string, unknown> {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const publicProjection = createTvProjection(state);

  return {
    phase: state.phase,
    status: state.status,
    sessionMode: state.sessionMode,
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
    self: player ? sanitizePlayerForPhone(player) : null
  };
}

function sanitizePlayerForPhone(player: PlayerState): Record<string, unknown> {
  return {
    seatId: player.seatId,
    character: player.character,
    sectorId: player.character.currentSpaceId,
    hand: player.private.hand,
    notes: player.private.notes
  };
}
