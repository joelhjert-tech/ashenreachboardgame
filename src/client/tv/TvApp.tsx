import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { RIFTFALL_BOARD_NODE_INDEX } from "../../data/riftfallBoardNodes.js";
import { createSession, fetchCharacters, fetchScenarios, fetchSessionSummary, startSession } from "../shared/network.js";
import { getSeatAbilityTelemetry } from "../shared/abilityTelemetry.js";
import { DebugPanel } from "../shared/DebugPanel.js";
import { RollOutcomePanel } from "../shared/RollOutcomePanel.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import type {
  ActiveNemesisSummary,
  CharacterCatalogEntry,
  PublicPatchPayload,
  PublicPlayer,
  PublicSeat,
  ScenarioCatalogEntry,
  SessionMode,
  ScenarioTelemetryItem,
  StatePatch,
  Stat
} from "../shared/types.js";
import { HostPlayerCard } from "./HostPlayerCard.js";
import { JoinQrCard } from "./JoinQrCard.js";
import { TacticalMapBoard } from "./TacticalMapBoard.js";

const hostTokenStorageKey = "ashen-reach-tv-host-token";
const roomCodeStorageKey = "ashen-reach-tv-room-code";
const previousSessionEndedNotice = "Previous session ended. Create a new room to continue.";

const statLabelById: Record<Stat, string> = {
  command: "Cmd",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSessionModeLabel(sessionMode: SessionMode): string {
  return sessionMode === "single-player" ? "Single Player" : "Multiplayer";
}

function getGearSummary(player: PublicPlayer | null): string {
  const gear = Object.values(player?.character.equippedGear ?? {}).filter(Boolean);
  return gear.length > 0 ? gear.join(", ") : "No gear equipped";
}

function getSeatStatus(seat: PublicSeat | null, player: PublicPlayer | null, isActive: boolean): string {
  if (seat?.kicked) {
    return "Removed";
  }

  if (!seat?.displayName) {
    return "Open Seat";
  }

  if (!seat.connected) {
    return "Offline";
  }

  if (player?.character.status === "recalled") {
    return "Recalled";
  }

  if (isActive) {
    return "Active Turn";
  }

  return "Ready";
}

function getCurrentStepCopy(publicPatch: StatePatch<PublicPatchPayload> | null, activeSeatId: string | null): string {
  if (!publicPatch) {
    return "Create a room to bring the command dashboard online.";
  }

  if (publicPatch.payload.encounter) {
    return `${publicPatch.payload.encounter.title} is in play for ${activeSeatId ?? "the active seat"} using ${toTitleCase(
      publicPatch.payload.encounter.stat
    )}.`;
  }

  if (publicPatch.payload.pendingEnemyRoll) {
    return `Enemy roll assigned to ${publicPatch.payload.pendingEnemyRoll.assignedRollerSeatId}. Awaiting combat response.`;
  }

  if (publicPatch.payload.status === "ended") {
    return "The campaign has ended. Review the winner and restart when ready.";
  }

  return `Phase ${toTitleCase(publicPatch.phase)} is live${activeSeatId ? ` for ${activeSeatId}` : ""}. Escalation ${publicPatch.payload.escalationLevel}/${publicPatch.payload.escalationThreshold} with modifier +${publicPatch.payload.escalationModifier}.`;
}

function getSpecialAbilitySummary(player: PublicPlayer | null, characterCatalog: CharacterCatalogEntry[]): string {
  if (!player) {
    return "No ability active";
  }

  const character = characterCatalog.find((entry) => entry.id === player.character.id);
  const firstAbility = character?.abilities[0];

  if (!firstAbility) {
    return "No ability active";
  }

  return `${firstAbility.name}: ${firstAbility.text}`;
}

function getContractSummary(player: PublicPlayer | null, patch: StatePatch<PublicPatchPayload> | null): string {
  if (!player?.character.activeContract || !patch) {
    return "No active contract";
  }

  const contract = patch.payload.availableContracts.find((entry) => entry.id === player.character.activeContract?.contractId);

  if (!contract) {
    return "No active contract";
  }

  return `${contract.name} (${player.character.activeContract.progress}/${contract.objective.target})`;
}

function getActiveSectorLabel(patch: StatePatch<PublicPatchPayload> | null, activePlayer: PublicPlayer | null): string {
  if (!patch || !activePlayer) {
    return "Awaiting deployment";
  }

  return patch.payload.sectors.find((sector) => sector.id === activePlayer.sectorId)?.name ?? "Awaiting deployment";
}

function getActiveRoomName(patch: StatePatch<PublicPatchPayload> | null, activePlayer: PublicPlayer | null): string {
  if (!patch || !activePlayer) {
    return "No active room";
  }

  return RIFTFALL_BOARD_NODE_INDEX.get(activePlayer.sectorId)?.label ?? getActiveSectorLabel(patch, activePlayer);
}

function getSectorBrief(patch: StatePatch<PublicPatchPayload> | null, activePlayer: PublicPlayer | null) {
  if (!patch || !activePlayer) {
    return {
      title: "Awaiting deployment",
      ring: "outer",
      text: "Create a session to load the tactical board and live sector telemetry.",
      threat: 0,
      occupants: 0,
      opportunities: [] as string[]
    };
  }

  const boardNode = RIFTFALL_BOARD_NODE_INDEX.get(activePlayer.sectorId);
  const boardSpace = getBoardSpace(activePlayer.sectorId);
  const sector = patch.payload.sectors.find((entry) => entry.id === activePlayer.sectorId) ?? null;
  const occupants = patch.payload.players.filter((entry) => entry.sectorId === activePlayer.sectorId).length;

  return {
    title: boardNode?.label ?? sector?.name ?? "Unknown sector",
    ring: boardNode?.ring ?? sector?.regionTier ?? "outer",
    text: boardSpace?.textBox.text ?? "Sector telemetry is awaiting a richer command note.",
    threat: boardSpace?.threatIcons.length ?? sector?.danger ?? 0,
    occupants,
    opportunities: [
      sector?.encounterDecks.anomaly.length ? `${sector.encounterDecks.anomaly.length} anomaly` : null,
      sector?.encounterDecks.artifact.length ? `${sector.encounterDecks.artifact.length} artifact` : null,
      sector?.encounterDecks.contract.length ? `${sector.encounterDecks.contract.length} contract lead` : null,
      sector?.encounterDecks.escalation.length ? `${sector.encounterDecks.escalation.length} stabilization window` : null
    ].filter((entry): entry is string => Boolean(entry))
  };
}

function getScenarioStatus(patch: StatePatch<PublicPatchPayload> | null) {
  const scenario = patch?.payload.activeScenario;
  const nemesis = patch?.payload.nemesis ?? null;

  if (!scenario) {
    return {
      name: "No active scenario",
      theme: "Awaiting directive",
      difficulty: "medium" as const,
      pressureSummary: "Create a room to load scenario pressure.",
      confrontationTitle: "Awaiting directive",
      progress: "0/0",
      setup: [] as string[],
      specialRules: [] as string[],
      confrontationSteps: [] as string[],
      victoryText: "Create a room to load the active scenario.",
      telemetry: [] as ScenarioTelemetryItem[],
      nemesis: null as ActiveNemesisSummary | null
    };
  }

  return {
    name: scenario.name,
    theme: scenario.theme,
    difficulty: scenario.difficulty,
    pressureSummary: scenario.pressureSummary,
    confrontationTitle: scenario.confrontationTitle,
    progress: `${scenario.progress}/${scenario.threshold}`,
    setup: scenario.setup,
    specialRules: scenario.specialRules,
    confrontationSteps: scenario.confrontationSteps,
    victoryText: scenario.victoryText,
    telemetry: patch?.payload.scenarioTelemetry ?? [],
    nemesis
  };
}

interface TopHeaderProps {
  roomCode: string | null;
  roomName: string;
  phase: string;
  activeSeatId: string | null;
  sessionMode: SessionMode;
}

function TopHeader({ roomCode, roomName, phase, activeSeatId, sessionMode }: TopHeaderProps): ReactElement {
  return (
    <header className="tv-command-header tv-card">
      <div className="tv-command-brand">
        <div className="tv-command-brand-mark" aria-hidden="true">
          ARC
        </div>
        <div>
          <h1>Ashen Reach TV</h1>
          <p>Host dashboard</p>
        </div>
      </div>

      <div className="tv-command-header-grid">
        <div className="tv-command-header-chip">
          <span>Room Code</span>
          <strong>{roomCode ?? "Awaiting room"}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Room Name</span>
          <strong>{roomName}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Phase</span>
          <strong>{toTitleCase(phase)}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Active Seat</span>
          <strong>{activeSeatId ?? "Standby"}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Mode</span>
          <strong>{getSessionModeLabel(sessionMode)}</strong>
        </div>
      </div>
    </header>
  );
}

interface ActiveOperativeOverlayProps {
  patch: StatePatch<PublicPatchPayload> | null;
  previousPatch: StatePatch<PublicPatchPayload> | null;
  activeSeat: PublicSeat | null;
  activePlayer: PublicPlayer | null;
  characterCatalog: CharacterCatalogEntry[];
}

function ActiveOperativeOverlay({
  patch,
  previousPatch,
  activeSeat,
  activePlayer,
  characterCatalog
}: ActiveOperativeOverlayProps): ReactElement {
  const seatStatus = getSeatStatus(activeSeat, activePlayer, true);
  const abilityTelemetry = getSeatAbilityTelemetry(patch?.payload ?? null, previousPatch?.payload ?? null, activeSeat?.seatId ?? null);

  if (!activeSeat) {
    return (
      <section className="tv-active-operative-overlay tv-active-operative-empty tv-card">
        <h2>Active operative</h2>
        <p>No active seat yet. Create a room and start the session to bring the command board online.</p>
      </section>
    );
  }

  return (
    <section className="tv-active-operative-overlay">
      <HostPlayerCard
        className="host-player-card-overlay"
        seatId={activeSeat.seatId}
        isOpen={!activeSeat.displayName || activeSeat.kicked}
        isConnected={activeSeat.connected}
        characterName={activePlayer?.character.name ?? activeSeat.displayName}
        characterTitle={activePlayer?.character.archetype ?? null}
        portraitUrl={
          activePlayer && activeSeat.displayName && !activeSeat.kicked
            ? getCharacterPortraitPath(activePlayer.character.id)
            : null
        }
        locationName={getActiveSectorLabel(patch, activePlayer)}
        fieldStatus={activePlayer?.character.status === "recalled" ? "Field status recalled" : "Field status stable"}
        heat={activePlayer?.character.heat ?? null}
        wounds={activePlayer?.character.wounds ?? null}
        scars={activePlayer?.character.scars.length ?? null}
        attributes={{
          cmd: activePlayer?.character.stats.command ?? null,
          grit: activePlayer?.character.stats.grit ?? null,
          signal: activePlayer?.character.stats.signal ?? null,
          guile: activePlayer?.character.stats.guile ?? null,
          forge: activePlayer?.character.stats.forge ?? null
        }}
        gearSummary={getGearSummary(activePlayer)}
        contractSummary={getContractSummary(activePlayer, patch)}
        specialAbilitySummary={getSpecialAbilitySummary(activePlayer, characterCatalog)}
        latestAbilityTriggerSummary={abilityTelemetry.latestTrigger?.summary ?? null}
        abilityChangeItems={abilityTelemetry.changes}
        isActiveTurn
        isReady={seatStatus === "Ready"}
      />
    </section>
  );
}

interface SessionReadoutProps {
  publicPatch: StatePatch<PublicPatchPayload> | null;
  sessionMode: SessionMode;
  joinedCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  roomCode: string | null;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioSelected: (scenarioId: string) => void;
  onCreateSession: (sessionMode?: SessionMode) => Promise<void>;
  onRestartSession: () => void;
  onStartSession: () => Promise<void>;
  canStartSession: boolean;
  showCreate: boolean;
  showRestart: boolean;
  showStart: boolean;
  debugOpen: boolean;
  onToggleDebug: () => void;
}

function SessionReadout({
  publicPatch,
  sessionMode,
  joinedCount,
  seatCapacity,
  activeSeatId,
  status,
  roomCode,
  selectedScenario,
  scenarioCatalog,
  onScenarioSelected,
  onCreateSession,
  onRestartSession,
  onStartSession,
  canStartSession,
  showCreate,
  showRestart,
  showStart,
  debugOpen,
  onToggleDebug
}: SessionReadoutProps): ReactElement {
  return (
    <section className="tv-card tv-panel-card tv-session-panel">
      <div className="tv-card-header">
        <div>
          <h2>Session Readout</h2>
          <p>Room telemetry</p>
        </div>
      </div>

      <div className="tv-session-grid">
        <div className="tv-session-stat">
          <span>Players</span>
          <strong>
            {joinedCount}/{seatCapacity}
          </strong>
        </div>
        <div className="tv-session-stat">
          <span>Mode</span>
          <strong>{getSessionModeLabel(sessionMode)}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Status</span>
          <strong>{toTitleCase(publicPatch?.payload.status ?? "lobby")}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Phase</span>
          <strong>{toTitleCase(publicPatch?.phase ?? "start")}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Active Seat</span>
          <strong>{activeSeatId ?? "Standby"}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Escalation</span>
          <strong>
            {(publicPatch?.payload.escalationLevel ?? 0)}/{publicPatch?.payload.escalationThreshold ?? 6} | +{publicPatch?.payload.escalationModifier ?? 0}
          </strong>
        </div>
        <div className="tv-session-stat">
          <span>Socket</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="tv-session-actions">
        {!roomCode && scenarioCatalog.length > 0 && (
          <label className="tv-session-scenario-picker">
            <span>Scenario</span>
            <select
              value={selectedScenario?.id ?? scenarioCatalog[0]?.id ?? ""}
              onChange={(event) => onScenarioSelected(event.target.value)}
            >
              {scenarioCatalog.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name} | {toTitleCase(scenario.difficulty)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="tv-button tv-button-quiet" onClick={onToggleDebug}>
          {debugOpen ? "Hide debug" : "Show debug"}
        </button>
        {showCreate && (
          <>
            <button type="button" onClick={() => void onCreateSession()}>
              Create multiplayer
            </button>
            <button type="button" className="tv-button tv-button-quiet" onClick={() => void onCreateSession("single-player")}>
              Create single-player
            </button>
          </>
        )}
        {showRestart && (
          <button type="button" onClick={onRestartSession}>
            Restart
          </button>
        )}
        {showStart && (
          <button type="button" disabled={!canStartSession || !roomCode} onClick={() => void onStartSession()}>
            Start session
          </button>
        )}
      </div>
    </section>
  );
}

interface RightSidebarProps {
  roomCode: string | null;
  sectorBrief: ReturnType<typeof getSectorBrief>;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  publicPatch: StatePatch<PublicPatchPayload> | null;
  sessionMode: SessionMode;
  joinedCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  debugOpen: boolean;
  onToggleDebug: () => void;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioSelected: (scenarioId: string) => void;
  onCreateSession: (sessionMode?: SessionMode) => Promise<void>;
  onRestartSession: () => void;
  onStartSession: () => Promise<void>;
  canStartSession: boolean;
}

function RightSidebar({
  roomCode,
  sectorBrief,
  scenarioStatus,
  publicPatch,
  sessionMode,
  joinedCount,
  seatCapacity,
  activeSeatId,
  status,
  debugOpen,
  onToggleDebug,
  selectedScenario,
  scenarioCatalog,
  onScenarioSelected,
  onCreateSession,
  onRestartSession,
  onStartSession,
  canStartSession
}: RightSidebarProps): ReactElement {
  return (
    <aside className="tv-command-sidebar">
      {roomCode && (
        <section className="tv-card tv-panel-card tv-join-panel tv-sidebar-card">
          <JoinQrCard roomCode={roomCode} />
        </section>
      )}

      <section className="tv-card tv-panel-card tv-sidebar-card">
        <div className="tv-card-header">
          <div>
            <h2>Sector Brief</h2>
          </div>
          <span className="board-sidebar-ring">{sectorBrief.ring}</span>
        </div>
        <p className="board-sidebar-title">{sectorBrief.title}</p>
        <p className="tv-empty-copy">{sectorBrief.text}</p>
        <div className="board-sidebar-meta">
          <span>Threat {sectorBrief.threat}</span>
          <span>Occupants {sectorBrief.occupants}</span>
        </div>
        {sectorBrief.opportunities.length > 0 && (
          <div className="board-sidebar-meta">
            {sectorBrief.opportunities.map((entry) => (
              <span key={entry}>{entry}</span>
            ))}
          </div>
        )}
      </section>

      <section className="tv-card tv-panel-card tv-sidebar-card">
        <div className="tv-card-header">
          <div>
            <h2>Scenario</h2>
          </div>
        </div>
        <p className="board-sidebar-title">{scenarioStatus.name}</p>
        <p className="tv-empty-copy">{scenarioStatus.theme}</p>
        <p className="tv-empty-copy">{scenarioStatus.pressureSummary}</p>
        <div className="board-sidebar-meta">
          <span>{toTitleCase(scenarioStatus.difficulty)}</span>
          <span>{scenarioStatus.confrontationTitle}</span>
          <span>Progress {scenarioStatus.progress}</span>
        </div>
        {scenarioStatus.setup.length > 0 && (
          <div className="tv-scenario-rules-block">
            <strong>Setup</strong>
            {scenarioStatus.setup.slice(0, 2).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}
        {scenarioStatus.specialRules.length > 0 && (
          <div className="tv-scenario-rules-block">
            <strong>Pressure Rules</strong>
            {scenarioStatus.specialRules.slice(0, 2).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}
        {scenarioStatus.confrontationSteps.length > 0 && (
          <div className="tv-scenario-rules-block">
            <strong>Confrontation</strong>
            {scenarioStatus.confrontationSteps.slice(0, 2).map((item) => (
              <p key={item}>{item}</p>
            ))}
            <p>{scenarioStatus.victoryText}</p>
          </div>
        )}
        {scenarioStatus.nemesis && (
          <div className="tv-scenario-nemesis">
            <div className="tv-scenario-nemesis-header">
              <span>Nemesis</span>
              <strong>{scenarioStatus.nemesis.faction}</strong>
            </div>
            <p className="board-sidebar-title">
              {scenarioStatus.nemesis.name} | {scenarioStatus.nemesis.title}
            </p>
            <div className="board-sidebar-meta">
              <span>
                Damage {scenarioStatus.nemesis.damageDealt}/{scenarioStatus.nemesis.life}
              </span>
            </div>
            <div className="tv-scenario-nemesis-abilities">
              {scenarioStatus.nemesis.abilities.map((ability) => (
                <p key={`${ability.timing}-${ability.text}`}>
                  <strong>{toTitleCase(ability.timing)}</strong> {ability.text}
                </p>
              ))}
            </div>
          </div>
        )}
        {scenarioStatus.telemetry.length > 0 && (
          <div className="tv-scenario-telemetry">
            {scenarioStatus.telemetry.map((entry) => (
              <div key={entry.label} className="tv-scenario-telemetry-row">
                <span>{entry.label}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

        <SessionReadout
          publicPatch={publicPatch}
          sessionMode={sessionMode}
          joinedCount={joinedCount}
          seatCapacity={seatCapacity}
          activeSeatId={activeSeatId}
          status={status}
          roomCode={roomCode}
          selectedScenario={selectedScenario}
          scenarioCatalog={scenarioCatalog}
          onScenarioSelected={onScenarioSelected}
          onCreateSession={onCreateSession}
          onRestartSession={onRestartSession}
          onStartSession={onStartSession}
        canStartSession={canStartSession}
        showCreate={!roomCode}
        showRestart={Boolean(publicPatch)}
        showStart={publicPatch?.phase === "start"}
        debugOpen={debugOpen}
        onToggleDebug={onToggleDebug}
      />
    </aside>
  );
}

interface TacticalMapPanelProps {
  patch: StatePatch<PublicPatchPayload> | null;
  previousPatch: StatePatch<PublicPatchPayload> | null;
  activeSeat: PublicSeat | null;
  activePlayer: PublicPlayer | null;
  characterCatalog: CharacterCatalogEntry[];
}

function NemesisBanner({ nemesis }: { nemesis: ActiveNemesisSummary | null }): ReactElement | null {
  if (!nemesis) {
    return null;
  }

  const remainingLife = Math.max(0, nemesis.life - nemesis.damageDealt);
  const progressPercent = Math.min(100, (nemesis.damageDealt / Math.max(nemesis.life, 1)) * 100);

  return (
    <section className="tv-nemesis-banner tv-card" aria-label="Active nemesis">
      <div className="tv-nemesis-banner-header">
        <div>
          <span>Nemesis at the Cinder Gate</span>
          <strong>
            {nemesis.name} | {nemesis.title}
          </strong>
          <p>{nemesis.faction}</p>
        </div>
        <div className="tv-nemesis-banner-life">
          <span>
            Damage {nemesis.damageDealt}/{nemesis.life}
          </span>
          <strong>{remainingLife} life left</strong>
        </div>
      </div>
      <div className="tv-nemesis-banner-bar" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
    </section>
  );
}

function TacticalMapPanel({ patch, previousPatch, activeSeat, activePlayer, characterCatalog }: TacticalMapPanelProps): ReactElement {
  return (
    <section className="tv-command-stage">
      <div className="tv-command-map-shell">
        <TacticalMapBoard patch={patch?.payload ?? null} phase={patch?.phase ?? "start"} />
      </div>
      <NemesisBanner nemesis={patch?.payload.nemesis ?? null} />
      <ActiveOperativeOverlay
        patch={patch}
        previousPatch={previousPatch}
        activeSeat={activeSeat}
        activePlayer={activePlayer}
        characterCatalog={characterCatalog}
      />
    </section>
  );
}

export function TvApp(): ReactElement {
  const [characterCatalog, setCharacterCatalog] = useState<CharacterCatalogEntry[]>([]);
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(roomCodeStorageKey)
  );
  const [sessionMode, setSessionMode] = useState<SessionMode>("multiplayer");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(hostTokenStorageKey)
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const restoreValidatedRef = useRef(false);
  const { patch, error, status, debugEvents, clearDebugEvents, sendIntent } = useRoomSubscription({
    view: "tv",
    enabled: Boolean(roomCode),
    hostToken
  });
  const previousPatchRef = useRef<StatePatch<PublicPatchPayload> | null>(null);

  useEffect(() => {
    fetchCharacters()
      .then((characters) => setCharacterCatalog(characters))
      .catch(() => setCharacterCatalog([]));

    fetchScenarios()
      .then((scenarios) => {
        setScenarioCatalog(scenarios);
        setSelectedScenarioId((current) => current ?? scenarios[0]?.id ?? null);
      })
      .catch(() => setScenarioCatalog([]));
  }, []);

  const publicPatch = patch as StatePatch<PublicPatchPayload> | null;
  const joinedSeats = publicPatch?.payload.seats.filter((seat) => seat.displayName && !seat.kicked) ?? [];
  const activeSeatId = publicPatch?.payload.turnOrder[publicPatch.payload.activeSeatIndex] ?? null;
  const activeSeat = publicPatch?.payload.seats.find((seat) => seat.seatId === activeSeatId) ?? null;
  const activePlayer = publicPatch?.payload.players.find((entry) => entry.seatId === activeSeatId) ?? null;
  const liveSessionMode = publicPatch?.payload.sessionMode ?? sessionMode;
  const selectedScenario =
    (publicPatch?.payload.activeScenario
      ? scenarioCatalog.find((scenario) => scenario.id === publicPatch.payload.activeScenario?.id) ?? null
      : scenarioCatalog.find((scenario) => scenario.id === selectedScenarioId) ?? null) ?? null;
  const roomName = getActiveRoomName(publicPatch, activePlayer);
  const sectorBrief = useMemo(() => getSectorBrief(publicPatch, activePlayer), [publicPatch, activePlayer]);
  const scenarioStatus = useMemo(() => getScenarioStatus(publicPatch), [publicPatch]);

  useEffect(() => {
    if (publicPatch) {
      previousPatchRef.current = publicPatch;
    }
  }, [publicPatch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (roomCode && hostToken) {
      window.localStorage.setItem(roomCodeStorageKey, roomCode);
      window.localStorage.setItem(hostTokenStorageKey, hostToken);
      return;
    }

    window.localStorage.removeItem(roomCodeStorageKey);
    window.localStorage.removeItem(hostTokenStorageKey);
  }, [hostToken, roomCode]);

  useEffect(() => {
    if (!roomCode || !hostToken) {
      restoreValidatedRef.current = true;
      return;
    }

    if (restoreValidatedRef.current) {
      return;
    }

    let cancelled = false;

    void fetchSessionSummary()
      .then((summary) => {
        if (cancelled) {
          return;
        }

        if (summary.roomCode !== roomCode) {
          setRoomCode(null);
          setHostToken(null);
          setSessionNotice(previousSessionEndedNotice);
          return;
        }

        setSessionMode(summary.sessionMode);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setRoomCode(null);
        setHostToken(null);
        setSessionNotice(previousSessionEndedNotice);
      })
      .finally(() => {
        if (!cancelled) {
          restoreValidatedRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hostToken, roomCode]);

  const createHostSession = async (nextSessionMode: SessionMode = "multiplayer") => {
    setRequestError(null);
    setSessionNotice(null);

    try {
      const scenarioId = selectedScenarioId ?? scenarioCatalog[0]?.id;
      const session = await createSession(nextSessionMode, scenarioId);
      setRoomCode(session.roomCode);
      setSessionMode(session.sessionMode);
      setSelectedScenarioId(session.scenarioId);
      setHostToken(session.hostToken);
      restoreValidatedRef.current = true;
    } catch (createFailure) {
      setRequestError(createFailure instanceof Error ? createFailure.message : "Could not create a room");
    }
  };

  const startHostSession = async () => {
    if (!roomCode) {
      return;
    }

    setRequestError(null);

    try {
      await startSession(roomCode);
    } catch (startFailure) {
      setRequestError(startFailure instanceof Error ? startFailure.message : "Could not start");
    }
  };

  const latestOutcome = publicPatch?.payload.outcomeSummary ?? null;
  const currentStepCopy = getCurrentStepCopy(publicPatch, activeSeatId);

  return (
      <main className="tv-dashboard tv-command-dashboard">
      <TopHeader
        roomCode={roomCode}
        roomName={roomName}
        phase={publicPatch?.phase ?? "start"}
        activeSeatId={activeSeatId}
        sessionMode={liveSessionMode}
      />

      {(requestError || error) && <div className="tv-banner tv-banner-error">{requestError ?? error}</div>}
      {sessionNotice && <div className="tv-banner">{sessionNotice}</div>}

      <section className="tv-command-main">
        <TacticalMapPanel
          patch={publicPatch}
          previousPatch={previousPatchRef.current}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          characterCatalog={characterCatalog}
        />

        <RightSidebar
          roomCode={roomCode}
          sectorBrief={sectorBrief}
          scenarioStatus={scenarioStatus}
          publicPatch={publicPatch}
          sessionMode={liveSessionMode}
        joinedCount={joinedSeats.length}
        seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 3)}
        activeSeatId={activeSeatId}
        status={status}
        debugOpen={debugOpen}
        onToggleDebug={() => setDebugOpen((current) => !current)}
        selectedScenario={selectedScenario}
        scenarioCatalog={scenarioCatalog}
        onScenarioSelected={setSelectedScenarioId}
        onCreateSession={createHostSession}
        onRestartSession={() => {
          setRequestError(null);
            sendIntent({ type: "RESTART_SESSION" });
          }}
          onStartSession={startHostSession}
          canStartSession={joinedSeats.length >= 1}
        />
      </section>

      <section className="tv-command-footer">
        <section className="tv-card tv-bottom-card">
          <div className="tv-card-header">
            <div>
              <h2>Current Step</h2>
              <p>Live command update</p>
            </div>
          </div>
          <p className="tv-bottom-copy">{currentStepCopy}</p>
          {publicPatch?.payload.encounter && (
            <div className="tv-inline-summary">
              <span className="tv-inline-summary-label">{publicPatch.payload.encounter.cardType}</span>
              <strong>
                {publicPatch.payload.encounter.title} | {statLabelById[publicPatch.payload.encounter.stat]} {publicPatch.payload.encounter.difficulty}
              </strong>
            </div>
          )}
        </section>

        <section className="tv-card tv-bottom-card">
          <div className="tv-card-header">
            <div>
              <h2>Latest Outcome</h2>
              <p>Last resolved result</p>
            </div>
          </div>
          {latestOutcome ? (
            latestOutcome.die1 !== null && latestOutcome.die2 !== null ? (
              <RollOutcomePanel summary={latestOutcome} animate title="Live roll" />
            ) : (
              <p className="tv-bottom-copy">{latestOutcome.summary}</p>
            )
          ) : (
            <p className="tv-empty-copy">No outcomes resolved yet.</p>
          )}
        </section>
      </section>

      {debugOpen && (
        <section className="tv-debug-drawer">
          <DebugPanel events={debugEvents} onClear={clearDebugEvents} title="TV debug" />
        </section>
      )}
    </main>
  );
}
