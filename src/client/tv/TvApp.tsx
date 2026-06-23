import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { formatContractObjectiveStatus } from "../../game/contracts/objectives.js";
import { createSession, fetchCharacters, fetchScenarios, fetchSessionSummary, startSession } from "../shared/network.js";
import { getSeatAbilityTelemetry } from "../shared/abilityTelemetry.js";
import { DebugPanel } from "../shared/DebugPanel.js";
import { RollOutcomePanel } from "../shared/RollOutcomePanel.js";
import { buildScenarioOutcomeSummary, buildScenarioRuleDigest } from "../shared/scenarioPresentation.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import { getCharacterPortraitPath, getContractArtPath, getEncounterArtPath, getNemesisPortraitPath } from "../shared/assetPaths.js";
import type {
  ActiveNemesisSummary,
  CharacterCatalogEntry,
  DebugEvent,
  InteractionMode,
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

function getInteractionModeLabel(interactionMode: InteractionMode): string {
  if (interactionMode === "co-op") {
    return "Co-op";
  }

  if (interactionMode === "ruthless") {
    return "Ruthless";
  }

  return "Rivalry";
}

function getSeatNumber(seatId: string): string {
  const numeric = seatId.match(/\d+/)?.[0];
  return numeric ?? seatId.replace(/^seat-/i, "").toUpperCase();
}

function getProgressPercent(current: number, total: number): number {
  return Math.min(100, Math.max(0, (current / Math.max(total, 1)) * 100));
}

function getRoundLabel(patch: StatePatch<PublicPatchPayload> | null): string {
  if (!patch) {
    return "0 / 0";
  }

  const activeIndex = patch.payload.activeSeatIndex + 1;
  const turnCount = Math.max(patch.payload.turnOrder.length, patch.payload.seats.filter((seat) => seat.displayName).length, 1);
  return `${activeIndex} / ${turnCount}`;
}

function getScenarioNemesisLabel(scenario: ScenarioCatalogEntry | null): string {
  if (!scenario?.nemesis) {
    return "No linked nemesis";
  }

  return `${scenario.nemesis.name} | ${scenario.nemesis.title}`;
}

function getGearSummary(player: PublicPlayer | null): string {
  const gear = Object.values(player?.character.equippedGear ?? {}).filter(Boolean);
  const followerCopy = player?.character.followerCount ? `${player.character.followerCount} follower` : null;
  const gearCopy = gear.length > 0 ? gear.join(", ") : "No gear equipped";
  return followerCopy ? `${gearCopy} | ${followerCopy}` : gearCopy;
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

function getCurrentStepCopy(
  publicPatch: StatePatch<PublicPatchPayload> | null,
  activeSeatId: string | null,
  activePlayer: PublicPlayer | null
): string {
  if (!publicPatch) {
    return "Create a room to bring the command dashboard online.";
  }

  const boardSpace = activePlayer ? getBoardSpace(activePlayer.sectorId) : null;

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

  if (publicPatch.phase === "action" && activePlayer && boardSpace?.textBox.intent === "scenario-confrontation") {
    return `${boardSpace.name} is the active confrontation chamber for ${activeSeatId ?? "the active seat"}. Resolve ${publicPatch.payload.activeScenario?.confrontationTitle ?? "the active scenario confrontation"}.`;
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

  return `${contract.name} | ${formatContractObjectiveStatus(contract, player.character.activeContract.progress)}`;
}

function getSeatLabelMap(patch: StatePatch<PublicPatchPayload> | null): Record<string, string> {
  return Object.fromEntries((patch?.payload.seats ?? []).map((seat) => [seat.seatId, seat.displayName ?? seat.seatId]));
}

function getActiveSectorLabel(patch: StatePatch<PublicPatchPayload> | null, activePlayer: PublicPlayer | null): string {
  if (!patch || !activePlayer) {
    return "Awaiting deployment";
  }

  return patch.payload.sectors.find((sector) => sector.id === activePlayer.sectorId)?.name ?? "Awaiting deployment";
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
      progressValue: 0,
      progressThreshold: 0,
      progressLabel: "Progress",
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
    progressValue: scenario.progress,
    progressThreshold: scenario.threshold,
    progressLabel: scenario.progressLabel,
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
  phase: string;
  sessionMode: SessionMode;
  interactionMode: InteractionMode;
  roundLabel: string;
  joinedCount: number;
  seatCapacity: number;
}

function TopHeader({
  roomCode,
  phase,
  sessionMode,
  interactionMode,
  roundLabel,
  joinedCount,
  seatCapacity
}: TopHeaderProps): ReactElement {
  return (
    <header className="tv-command-header tv-card" aria-label="Host status bar">
      <div className="tv-command-brand">
        <div>
          <h1>Ashen Reach</h1>
          <p>
            Host command board
            <span className="tv-screen-reader-only">Ashen Reach TV</span>
          </p>
        </div>
      </div>

      <div className="tv-command-header-grid">
        <div className="tv-command-header-chip">
          <span>Room Code</span>
          <strong>{roomCode ?? "Awaiting room"}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Mode</span>
          <strong>
            {sessionMode === "single-player" ? "Solo" : getInteractionModeLabel(interactionMode)}
          </strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Round</span>
          <strong>{roundLabel}</strong>
        </div>
        <div className="tv-command-header-chip">
          <span>Phase</span>
          <strong>{toTitleCase(phase)}</strong>
        </div>
      </div>

      <div className="tv-command-join-module">
        {roomCode ? (
          <JoinQrCard roomCode={roomCode} variant="compact" />
        ) : (
          <div className="join-qr-card join-qr-card-compact join-qr-card-empty">
            <div>
              <h2>Scan to Join</h2>
              <p>Players {joinedCount}/{seatCapacity}</p>
            </div>
            <div className="join-qr-frame" aria-label="QR code placeholder">
              <p>Create</p>
            </div>
          </div>
        )}
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

interface OperativesRailProps {
  patch: StatePatch<PublicPatchPayload> | null;
  characterCatalog: CharacterCatalogEntry[];
  activeSeatId: string | null;
  sessionMode: SessionMode;
}

function OperativesRail({ patch, characterCatalog, activeSeatId, sessionMode }: OperativesRailProps): ReactElement {
  const fallbackSeatCount = sessionMode === "single-player" ? 1 : 4;
  const seats =
    patch?.payload.seats ??
    Array.from({ length: fallbackSeatCount }, (_, index) => ({
      seatId: `seat-${index + 1}`,
      characterId: characterCatalog[index]?.id ?? "void-marshal",
      displayName: null,
      connected: false,
      kicked: false
    }));
  const densityClass = seats.length >= 6 ? "tv-operatives-list-dense" : seats.length >= 5 ? "tv-operatives-list-compact" : "";

  return (
    <aside className="tv-operatives-rail tv-ornate-panel" aria-label="Operatives">
      <div className="tv-panel-title">
        <span />
        <h2>Operatives</h2>
        <span />
      </div>
      <div className={`tv-operatives-list ${densityClass}`}>
        {seats.map((seat) => {
          const player = patch?.payload.players.find((entry) => entry.seatId === seat.seatId) ?? null;
          const catalogCharacter = characterCatalog.find((entry) => entry.id === seat.characterId) ?? null;
          const characterName = player?.character.name ?? seat.displayName ?? catalogCharacter?.name ?? "Open Seat";
          const characterTitle = player?.character.archetype ?? catalogCharacter?.archetype ?? "Awaiting operative";
          const isOpen = !seat.displayName || seat.kicked;
          const isActive = seat.seatId === activeSeatId;
          const statusLabel = seat.kicked ? "Removed" : !seat.displayName ? "Open" : seat.connected ? "Linked" : "Offline";
          const portraitUrl = !isOpen ? getCharacterPortraitPath(player?.character.id ?? seat.characterId) : null;

          return (
            <article
              key={seat.seatId}
              className={`tv-operative-card${isActive ? " tv-operative-card-active" : ""}${isOpen ? " tv-operative-card-open" : ""}`}
            >
              <div className="tv-operative-seat">{getSeatNumber(seat.seatId)}</div>
              <div className="tv-operative-portrait">
                {portraitUrl ? <img src={portraitUrl} alt={characterName} /> : <span>Open</span>}
              </div>
              <div className="tv-operative-copy">
                <div className="tv-operative-name-row">
                  <h3>{characterName}</h3>
                  <span className={`tv-operative-link tv-operative-link-${seat.connected && !isOpen ? "online" : "offline"}`}>
                    {statusLabel}
                  </span>
                </div>
                <p>{characterTitle}</p>
                <div className="tv-operative-stats" aria-label={`${characterName} vitals`}>
                  <span>Wounds {player?.character.wounds ?? 0}</span>
                  <span>Heat {player?.character.heat ?? 0}</span>
                  <span>Trophies {player?.character.trophies ?? 0}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="tv-operatives-legend" aria-label="Operative stat legend">
        <span>Wounds</span>
        <span>Heat</span>
        <span>Trophies</span>
      </div>
    </aside>
  );
}

interface SessionReadoutProps {
  publicPatch: StatePatch<PublicPatchPayload> | null;
  sessionMode: SessionMode;
  interactionMode: InteractionMode;
  joinedCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  roomCode: string | null;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioSelected: (scenarioId: string) => void;
  onInteractionModeSelected: (interactionMode: InteractionMode) => void;
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

function ScenarioSelectionPreview({ scenario }: { scenario: ScenarioCatalogEntry | null }): ReactElement | null {
  if (!scenario) {
    return null;
  }

  return (
    <section className="tv-session-scenario-preview" aria-label="Scenario preview">
      <div className="tv-session-scenario-preview-header">
        <div>
          <span>Scenario Briefing</span>
          <strong>{scenario.name}</strong>
        </div>
        <div className="tv-session-scenario-preview-tags">
          <span>{toTitleCase(scenario.difficulty)}</span>
          <span>{scenario.expectedDuration}</span>
        </div>
      </div>
      <p className="tv-session-scenario-preview-theme">{scenario.theme}</p>
      <div className="tv-session-scenario-preview-grid">
        <div>
          <span>Pressure Rule</span>
          <strong>{scenario.pressureRule}</strong>
        </div>
        <div>
          <span>Nemesis</span>
          <strong>{getScenarioNemesisLabel(scenario)}</strong>
        </div>
        <div>
          <span>Confrontation</span>
          <strong>{scenario.confrontationTitle}</strong>
        </div>
        <div>
          <span>Victory</span>
          <strong>{scenario.victoryText}</strong>
        </div>
      </div>
    </section>
  );
}

function FirstGamePanel({ interactionMode }: { interactionMode: InteractionMode }): ReactElement {
  const interactionCopy =
    interactionMode === "co-op"
      ? "Share pressure, assist checks, and push the scenario objective together."
      : interactionMode === "ruthless"
        ? "Direct interference is live: duels, theft, and betrayal contracts are table legal."
        : "Race for personal glory with bounded rivalry, trades, aid, duels, and exposed-object steals.";

  return (
    <section className="tv-first-game-panel" aria-label="First game guide">
      <div>
        <span>First Game</span>
        <strong>Reach the Cinder Gate before collapse.</strong>
      </div>
      <p>{interactionCopy}</p>
      <div className="tv-first-game-steps">
        <span>Move</span>
        <span>Draw</span>
        <span>Roll</span>
        <span>Resolve</span>
      </div>
    </section>
  );
}

function SessionReadout({
  publicPatch,
  sessionMode,
  interactionMode,
  joinedCount,
  seatCapacity,
  activeSeatId,
  status,
  roomCode,
  selectedScenario,
  scenarioCatalog,
  onScenarioSelected,
  onInteractionModeSelected,
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
          <span>Table Feel</span>
          <strong>{getInteractionModeLabel(publicPatch?.payload.interactionMode ?? interactionMode)}</strong>
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
        <div className="tv-session-setup-scroll">
          {!roomCode && scenarioCatalog.length > 0 && (
            <>
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
              <ScenarioSelectionPreview scenario={selectedScenario} />
              <label className="tv-session-scenario-picker">
                <span>Table Feel</span>
                <select
                  value={interactionMode}
                  onChange={(event) => onInteractionModeSelected(event.target.value as InteractionMode)}
                >
                  <option value="co-op">Co-op | shared objectives and assists</option>
                  <option value="rivalry">Rivalry | race without hard griefing</option>
                  <option value="ruthless">Ruthless | duels, theft, betrayal contracts</option>
                </select>
              </label>
              <FirstGamePanel interactionMode={interactionMode} />
            </>
          )}
        </div>
        <div className="tv-session-command-bar">
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
      </div>
    </section>
  );
}

interface RightSidebarProps {
  roomCode: string | null;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  publicPatch: StatePatch<PublicPatchPayload> | null;
  sessionMode: SessionMode;
  interactionMode: InteractionMode;
  joinedCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  debugOpen: boolean;
  onToggleDebug: () => void;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioSelected: (scenarioId: string) => void;
  onInteractionModeSelected: (interactionMode: InteractionMode) => void;
  onCreateSession: (sessionMode?: SessionMode) => Promise<void>;
  onRestartSession: () => void;
  onStartSession: () => Promise<void>;
  canStartSession: boolean;
}

function ScenarioStatusCard({
  scenarioStatus,
  scenarioOutcome,
  scenarioRuleDigest
}: {
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  scenarioOutcome: ReturnType<typeof buildScenarioOutcomeSummary>;
  scenarioRuleDigest: ReturnType<typeof buildScenarioRuleDigest>;
}): ReactElement {
  const stepCount = Math.min(Math.max(scenarioStatus.progressThreshold, 3), 8);
  const progressPercent = getProgressPercent(scenarioStatus.progressValue, scenarioStatus.progressThreshold);

  return (
    <section className="tv-card tv-sidebar-card tv-scenario-card" aria-label="Scenario">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Scenario</h2>
        <span />
      </div>
      <div className="tv-scenario-parchment">
        <h3>{scenarioStatus.name}</h3>
        <div className="tv-scenario-track" aria-label={`${scenarioStatus.progressLabel} ${scenarioStatus.progress}`}>
          {Array.from({ length: stepCount }, (_, index) => (
            <span
              key={index}
              className={index < Math.ceil((progressPercent / 100) * stepCount) ? "tv-scenario-track-filled" : ""}
            />
          ))}
          <strong>{scenarioStatus.progress}</strong>
        </div>
        <p>{scenarioStatus.progressLabel}</p>
      </div>
      {scenarioOutcome && (
        <div className={`tv-scenario-outcome tv-scenario-outcome-${scenarioOutcome.tone}`}>
          <strong>{scenarioOutcome.title}</strong>
          <p>{scenarioOutcome.detail}</p>
        </div>
      )}
      <p className="tv-empty-copy">{scenarioRuleDigest?.pressureSummary ?? scenarioStatus.pressureSummary}</p>
      <div className="board-sidebar-meta">
        <span>{toTitleCase(scenarioStatus.difficulty)}</span>
        <span>{scenarioStatus.confrontationTitle}</span>
      </div>
    </section>
  );
}

function NemesisStatusCard({
  nemesis,
  selectedScenario
}: {
  nemesis: ActiveNemesisSummary | null;
  selectedScenario: ScenarioCatalogEntry | null;
}): ReactElement {
  const scenarioNemesis = selectedScenario?.nemesis ?? null;
  const displayName = nemesis?.name ?? scenarioNemesis?.name ?? "Nemesis dormant";
  const displayTitle = nemesis?.title ?? scenarioNemesis?.title ?? "Awaiting confrontation";
  const faction = nemesis?.faction ?? scenarioNemesis?.faction ?? "Scenario pressure";
  const remainingLife = nemesis ? Math.max(0, nemesis.life - nemesis.damageDealt) : 0;
  const progressPercent = nemesis ? getProgressPercent(remainingLife, nemesis.life) : 0;

  return (
    <section className="tv-card tv-sidebar-card tv-nemesis-card" aria-label="Nemesis">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Nemesis</h2>
        <span />
      </div>
      <div className="tv-nemesis-portrait">
        {nemesis ? <img src={getNemesisPortraitPath(nemesis.id)} alt={displayName} /> : <div>{displayTitle}</div>}
      </div>
      <h3>{displayName}</h3>
      <p>{displayTitle} | {faction}</p>
      <div className="tv-nemesis-life-row">
        <span>{nemesis ? `${remainingLife}/${nemesis.life} life` : "Dormant"}</span>
        <div className="tv-nemesis-life-bar" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="tv-nemesis-tags">
        {(nemesis?.abilities ?? []).slice(0, 2).map((ability) => (
          <span key={`${ability.timing}-${ability.text}`}>{toTitleCase(ability.timing)}</span>
        ))}
        {!nemesis && <span>{scenarioNemesis ? "Preview" : "None"}</span>}
      </div>
    </section>
  );
}

function EscalationMeter({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement {
  const level = patch?.payload.escalationLevel ?? 0;
  const threshold = patch?.payload.escalationThreshold ?? 6;
  const modifier = patch?.payload.escalationModifier ?? 0;
  const highlightedStep = Math.ceil(getProgressPercent(level, threshold) / 20);

  return (
    <section className="tv-card tv-sidebar-card tv-escalation-card" aria-label="Escalation">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Escalation</h2>
        <span />
      </div>
      <div className="tv-escalation-meter">
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className={step <= highlightedStep ? "tv-escalation-step-active" : ""}>
            {step}
          </span>
        ))}
      </div>
      <p>
        Collapse risk {level}/{threshold} | modifier +{modifier}
      </p>
    </section>
  );
}

function ContractsPanel({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement {
  const contracts = patch?.payload.availableContracts.slice(0, 2) ?? [];

  return (
    <section className="tv-card tv-sidebar-card tv-contracts-card" aria-label="Contracts">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Contracts</h2>
        <span />
      </div>
      <div className="tv-contracts-grid">
        {contracts.length > 0 ? (
          contracts.map((contract) => {
            const activeProgress =
              patch?.payload.players.find((player) => player.character.activeContract?.contractId === contract.id)?.character.activeContract
                ?.progress ?? 0;
            return (
              <article key={contract.id} className="tv-contract-card-mini">
                <img src={getContractArtPath(contract.id)} alt="" aria-hidden="true" />
                <div>
                  <h3>{contract.name}</h3>
                  <p>{contract.objective.type === "defeatCount" ? contract.text : contract.objective.label}</p>
                  <strong>{formatContractObjectiveStatus(contract, activeProgress)}</strong>
                </div>
              </article>
            );
          })
        ) : (
          <p className="tv-empty-copy">No contracts discovered yet.</p>
        )}
      </div>
    </section>
  );
}

function RightSidebar({
  roomCode,
  scenarioStatus,
  publicPatch,
  sessionMode,
  interactionMode,
  joinedCount,
  seatCapacity,
  activeSeatId,
  status,
  debugOpen,
  onToggleDebug,
  selectedScenario,
  scenarioCatalog,
  onScenarioSelected,
  onInteractionModeSelected,
  onCreateSession,
  onRestartSession,
  onStartSession,
  canStartSession
}: RightSidebarProps): ReactElement {
  const scenarioRuleDigest = buildScenarioRuleDigest(
    publicPatch?.payload.activeScenario ?? null,
    publicPatch?.payload.scenarioTelemetry ?? [],
    { telemetry: 4, specialRules: 2, confrontationSteps: 2 }
  );
  const scenarioOutcome = buildScenarioOutcomeSummary({
    status: publicPatch?.payload.status ?? null,
    winnerSeatId: publicPatch?.payload.winnerSeatId ?? null,
    activeSeatId,
    activeScenario: publicPatch?.payload.activeScenario ?? null,
    seatLabelById: Object.fromEntries((publicPatch?.payload.seats ?? []).map((seat) => [seat.seatId, seat.displayName ?? seat.seatId]))
  });

  return (
    <aside className="tv-command-sidebar">
      <ScenarioStatusCard
        scenarioStatus={scenarioStatus}
        scenarioOutcome={scenarioOutcome}
        scenarioRuleDigest={scenarioRuleDigest}
      />
      <NemesisStatusCard nemesis={publicPatch?.payload.nemesis ?? null} selectedScenario={selectedScenario} />
      <EscalationMeter patch={publicPatch} />
      <ContractsPanel patch={publicPatch} />

      <SessionReadout
        publicPatch={publicPatch}
        sessionMode={sessionMode}
        interactionMode={interactionMode}
        joinedCount={joinedCount}
        seatCapacity={seatCapacity}
        activeSeatId={activeSeatId}
        status={status}
        roomCode={roomCode}
        selectedScenario={selectedScenario}
        scenarioCatalog={scenarioCatalog}
        onScenarioSelected={onScenarioSelected}
        onInteractionModeSelected={onInteractionModeSelected}
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

function BoardLegend(): ReactElement {
  const items = [
    { label: "Salvage Cache", tone: "salvage" },
    { label: "Anomaly Signal", tone: "anomaly" },
    { label: "Shrine", tone: "shrine" },
    { label: "Hazard", tone: "hazard" },
    { label: "Crossroads", tone: "crossroads" }
  ];

  return (
    <div className="tv-board-legend" aria-label="Board legend">
      {items.map((item) => (
        <span key={item.label} className={`tv-board-legend-item tv-board-legend-${item.tone}`}>
          <i aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TacticalMapPanel({ patch, previousPatch, activeSeat, activePlayer, characterCatalog }: TacticalMapPanelProps): ReactElement {
  return (
    <section className="tv-command-stage">
      <div className="tv-command-map-shell">
        <TacticalMapBoard patch={patch?.payload ?? null} phase={patch?.phase ?? "start"} />
        <BoardLegend />
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

function CardRevealPanel({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement {
  const encounter = patch?.payload.encounter ?? null;
  const pendingEnemyRoll = patch?.payload.pendingEnemyRoll ?? null;
  const cardTitle = encounter?.title ?? pendingEnemyRoll?.encounterTitle ?? "Awaiting reveal";
  const cardType = encounter?.cardType ?? (pendingEnemyRoll ? "enemy tactic" : "Deck standing by");
  const artPath = encounter ? getEncounterArtPath(encounter.id) : "/assets/riftfall/cards/threat-red/card_back_threat_red.png";
  const difficulty = encounter?.difficulty ?? 0;

  return (
    <section className={`tv-card tv-bottom-card tv-reveal-card tv-reveal-card-${encounter?.cardType ?? "idle"}`} aria-label="Card reveal">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Card Reveal</h2>
        <span />
      </div>
      <div className="tv-reveal-card-layout">
        <div className="tv-reveal-art">
          <img src={artPath} alt="" aria-hidden="true" />
        </div>
        <div className="tv-reveal-parchment">
          <span>{toTitleCase(cardType)}</span>
          <h3>{cardTitle}</h3>
          <p>{encounter?.flavor ?? "The deck is quiet. The next draw will take the room's attention."}</p>
          {encounter ? (
            <div className="tv-reveal-rule">
              <strong>Check</strong>
              <span>
                {statLabelById[encounter.stat]} {encounter.difficulty}
              </span>
            </div>
          ) : pendingEnemyRoll ? (
            <div className="tv-reveal-rule">
              <strong>Enemy roller</strong>
              <span>{pendingEnemyRoll.assignedRollerSeatId}</span>
            </div>
          ) : (
            <div className="tv-reveal-rule">
              <strong>Status</strong>
              <span>No active card</span>
            </div>
          )}
          <div className="tv-reveal-difficulty" aria-label={`Difficulty ${difficulty}`}>
            {Array.from({ length: Math.max(1, Math.min(5, difficulty || 1)) }, (_, index) => (
              <span key={index} className={index < difficulty ? "tv-reveal-pip-active" : ""} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentOutcomePanel({
  patch,
  currentStepCopy,
  debugEvents
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  currentStepCopy: string;
  debugEvents: DebugEvent[];
}): ReactElement {
  const latestOutcome = patch?.payload.outcomeSummary ?? null;
  const recentTriggers = patch?.payload.recentAbilityTriggers.slice(-2) ?? [];
  const logEntries = [
    latestOutcome?.summary,
    patch?.payload.encounter ? `${patch.payload.encounter.title} revealed.` : null,
    ...recentTriggers.map((trigger) => trigger.summary),
    ...debugEvents.slice(-2).map((event) => event.detail ?? event.label)
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <section className="tv-card tv-bottom-card tv-recent-card" aria-label="Recent outcome">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Recent Outcome</h2>
        <span />
      </div>
      <div className="tv-recent-layout">
        <div className="tv-recent-roll">
          {latestOutcome && latestOutcome.die1 !== null && latestOutcome.die2 !== null ? (
            <RollOutcomePanel summary={latestOutcome} animate title="Live roll" />
          ) : (
            <div className="tv-recent-roll-placeholder">
              <strong>No roll yet</strong>
              <span>Dice results appear here after checks.</span>
            </div>
          )}
        </div>
        <div className="tv-recent-log">
          <p>{currentStepCopy}</p>
          <ul>
            {logEntries.length > 0 ? (
              logEntries.slice(0, 4).map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)
            ) : (
              <li>Waiting for the first move, reveal, or roll.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function EndgameOverlay({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement | null {
  if (patch?.payload.status !== "ended") {
    return null;
  }

  const seatLabelById = getSeatLabelMap(patch);
  const outcome = buildScenarioOutcomeSummary({
    status: patch.payload.status,
    winnerSeatId: patch.payload.winnerSeatId,
    activeSeatId: patch.payload.turnOrder[patch.payload.activeSeatIndex] ?? null,
    activeScenario: patch.payload.activeScenario,
    seatLabelById
  });
  const topTrophies = [...patch.payload.players].sort((left, right) => right.character.trophies - left.character.trophies)[0] ?? null;
  const topWounds = [...patch.payload.players].sort((left, right) => right.character.wounds - left.character.wounds)[0] ?? null;
  const topHeat = [...patch.payload.players].sort((left, right) => right.character.heat - left.character.heat)[0] ?? null;
  const finalOutcome = patch.payload.outcomeSummary?.summary ?? "No final roll was recorded.";
  const escalationCopy = `${patch.payload.escalationLevel}/${patch.payload.escalationThreshold}`;

  return (
    <section className={`tv-endgame-overlay tv-endgame-overlay-${outcome?.tone ?? "collapse"}`} aria-label="Session end state">
      <div className="tv-endgame-copy">
        <span>{outcome?.tone === "victory" ? "Victory" : "Collapse"}</span>
        <h2>{outcome?.title ?? "The run has ended"}</h2>
        <p>{outcome?.detail ?? "Review the final board state and start a new room when ready."}</p>
      </div>
      <div className="tv-endgame-grid">
        <article>
          <span>Winning operative</span>
          <strong>{patch.payload.winnerSeatId ? seatLabelById[patch.payload.winnerSeatId] : "None"}</strong>
        </article>
        <article>
          <span>Most threats defeated</span>
          <strong>{topTrophies ? `${seatLabelById[topTrophies.seatId]} | ${topTrophies.character.trophies}` : "None"}</strong>
        </article>
        <article>
          <span>Most wounds survived</span>
          <strong>{topWounds ? `${seatLabelById[topWounds.seatId]} | ${topWounds.character.wounds}` : "None"}</strong>
        </article>
        <article>
          <span>Most heat carried</span>
          <strong>{topHeat ? `${seatLabelById[topHeat.seatId]} | ${topHeat.character.heat}` : "None"}</strong>
        </article>
        <article>
          <span>Closest collapse</span>
          <strong>{escalationCopy}</strong>
        </article>
        <article>
          <span>Final blow</span>
          <strong>{finalOutcome}</strong>
        </article>
      </div>
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
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("rivalry");
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
  const liveInteractionMode = publicPatch?.payload.interactionMode ?? interactionMode;
  const selectedScenario =
    (publicPatch?.payload.activeScenario
      ? scenarioCatalog.find((scenario) => scenario.id === publicPatch.payload.activeScenario?.id) ?? null
      : scenarioCatalog.find((scenario) => scenario.id === selectedScenarioId) ?? null) ?? null;
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
        setInteractionMode(summary.interactionMode);
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
      const selectedInteractionMode = nextSessionMode === "single-player" ? "co-op" : interactionMode;
      const session = await createSession(nextSessionMode, scenarioId, selectedInteractionMode);
      setRoomCode(session.roomCode);
      setSessionMode(session.sessionMode);
      setInteractionMode(session.interactionMode);
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

  const currentStepCopy = getCurrentStepCopy(publicPatch, activeSeatId, activePlayer);

  return (
    <main className="tv-dashboard tv-command-dashboard">
      <div className="tv-title-safe">
        <TopHeader
          roomCode={roomCode}
          phase={publicPatch?.phase ?? "start"}
          sessionMode={liveSessionMode}
          interactionMode={liveInteractionMode}
          roundLabel={getRoundLabel(publicPatch)}
          joinedCount={joinedSeats.length}
          seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 6)}
        />

        {(requestError || error) && <div className="tv-banner tv-banner-error">{requestError ?? error}</div>}
        {sessionNotice && <div className="tv-banner">{sessionNotice}</div>}
        <EndgameOverlay patch={publicPatch} />

        <section className="tv-command-main">
          <OperativesRail
            patch={publicPatch}
            characterCatalog={characterCatalog}
            activeSeatId={activeSeatId}
            sessionMode={liveSessionMode}
          />

          <TacticalMapPanel
            patch={publicPatch}
            previousPatch={previousPatchRef.current}
            activeSeat={activeSeat}
            activePlayer={activePlayer}
            characterCatalog={characterCatalog}
          />

          <RightSidebar
            roomCode={roomCode}
            scenarioStatus={scenarioStatus}
            publicPatch={publicPatch}
            sessionMode={liveSessionMode}
            interactionMode={liveInteractionMode}
            joinedCount={joinedSeats.length}
            seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 3)}
            activeSeatId={activeSeatId}
            status={status}
            debugOpen={debugOpen}
            onToggleDebug={() => setDebugOpen((current) => !current)}
            selectedScenario={selectedScenario}
            scenarioCatalog={scenarioCatalog}
            onScenarioSelected={setSelectedScenarioId}
            onInteractionModeSelected={setInteractionMode}
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
          <CardRevealPanel patch={publicPatch} />
          <RecentOutcomePanel patch={publicPatch} currentStepCopy={currentStepCopy} debugEvents={debugEvents} />
        </section>

        {debugOpen && (
          <section className="tv-debug-drawer">
            <DebugPanel events={debugEvents} onClear={clearDebugEvents} title="TV debug" />
          </section>
        )}
      </div>
    </main>
  );
}
