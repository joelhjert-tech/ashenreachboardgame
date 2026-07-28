import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { getSessionStartReadiness } from "../../game/rules/sessionStart.js";
import { getChallengeTheme, getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { claimPrePlayerHost, createSession, fetchCharacters, fetchScenarios, fetchSessionSummary, startSession } from "../shared/network.js";
import { getSeatAbilityTelemetry } from "../shared/abilityTelemetry.js";
import { ChallengeBadge, ThreatIconBadge } from "../shared/ChallengeBadge.js";
import { DebugPanel } from "../shared/DebugPanel.js";
import { RollOutcomePanel } from "../shared/RollOutcomePanel.js";
import {
  activeResolutionToOutcomeSummary,
  formatResolutionModifiers,
  resolutionStageLabel
} from "../shared/resolutionPresentation.js";
import { buildScenarioRuleDigest, type ScenarioOutcomeSummary } from "../shared/scenarioPresentation.js";
import {
  buildCurrentTablePrompt,
  buildSectorExplorationCopy,
  type ExplainabilityTone
} from "../shared/explainabilityPrompts.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { formatSeatLabel, statOrder, statShortLabelById } from "../shared/statLabels.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import { getCardArtPath, getCharacterPortraitPath, getLobbyStagePath, getNemesisPortraitPath } from "../shared/assetPaths.js";
import type {
  ActiveNemesisSummary,
  CharacterCatalogEntry,
  DebugEvent,
  GameMode,
  InteractionMode,
  MatchThresholdWarning,
  NemesisChampionSummary,
  PublicPatchPayload,
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicPlayer,
  PublicShopEncounterState,
  PublicSeat,
  ScenarioCatalogEntry,
  SessionMode,
  ScenarioTelemetryItem,
  StatePatch,
  Stat
} from "../shared/types.js";
import { HostPlayerCard } from "./HostPlayerCard.js";
import { HostBattleChamber } from "./HostBattleChamber.js";
import { isHostBattleActive } from "./hostBattleState.js";
import { hostPresentationTimings } from "../shared/motionTokens.js";
import { HostShopOverlay } from "./HostShopOverlay.js";
import { HostYouTubePlayer } from "./HostYouTubePlayer.js";
import { isHostShopActive } from "./hostShopState.js";
import { HostMovementJourney } from "./HostMovementJourney.js";
import { HostMotionCue } from "./HostMotionCue.js";
import { SignalTheatreHost } from "./SignalTheatreHost.js";
import {
  SignalCartographyPrototype,
  type SignalCartographyFixture
} from "./SignalCartographyPrototype.js";
import {
  TvScenarioBriefing,
  TvLobbyQrPrototype,
  TvShopApprovalPrototype
} from "./TvApprovalPrototypes.js";
import { TvBattleRevealPrototype, type TvBattleRevealStage } from "./TvBattleRevealPrototype.js";
import {
  getMovementArrivalModel,
  type MovementArrivalModel
} from "./hostMovementPresentation.js";
import { DiceRollScene } from "./DiceRollScene.js";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../shared/AuthoritativeDicePresentation.js";
import { JoinQrCard } from "./JoinQrCard.js";
import { TacticalMapBoard } from "./TacticalMapBoard.js";
import { getExpectedTileAssetPath, getTileAssetPath } from "./tileAssetManifest.js";
import { HostImage } from "./HostImage.js";

const hostTokenStorageKey = "ashen-reach-tv-host-token";
const roomCodeStorageKey = "ashen-reach-tv-room-code";

function getInitialTvRoomCode(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("room") ?? window.localStorage.getItem(roomCodeStorageKey);
}
const previousSessionEndedNotice = "Previous session ended. Create a new room to continue.";
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.js"));
type TvAdminSurface = "dashboard" | null;
type TvAdminTab = "overview" | "library" | "map" | "test" | "reports";

const statLabelById = statShortLabelById;
type TvResolutionDisplayMode = "idle" | "cardReveal" | "battle" | "outcome";
type HostLobbyPath = "solo" | "multiplayer" | null;

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSessionModeLabel(sessionMode: SessionMode): string {
  return sessionMode === "single-player" ? "Solo Run" : "Multiplayer";
}

function getInteractionModeLabel(interactionMode: InteractionMode): string {
  if (interactionMode === "co-op") {
    return "Co-op";
  }

  return "Rivalry";
}

function getGameModeLabel(gameMode: GameMode | undefined): string {
  return gameMode === "nemesis_relay" ? "Relay Trial" : "Scenario Race";
}

function getSeatNumber(seatId: string): string {
  return formatSeatLabel(seatId).replace(/^Seat\s+/i, "");
}

function getProgressPercent(current: number, total: number): number {
  return Math.min(100, Math.max(0, (current / Math.max(total, 1)) * 100));
}

function getResolutionPlayerId(patch: StatePatch<PublicPatchPayload> | null): string | null {
  return patch?.payload.activeResolution?.playerId ?? patch?.payload.pendingEnemyRoll?.fighterSeatId ?? null;
}

function getTvResolutionDisplayMode(
  patch: StatePatch<PublicPatchPayload> | null,
  battlePlayer: PublicPlayer | null
): TvResolutionDisplayMode {
  if (!patch) {
    return "idle";
  }

  if (isHostBattleActive(patch, battlePlayer)) {
    return "battle";
  }

  const activeResolution = patch.payload.activeResolution ?? null;

  if (activeResolution) {
    if (activeResolution.stage === "card_reveal" || activeResolution.stage === "battle_setup") {
      return "cardReveal";
    }

    return "outcome";
  }

  if (patch.payload.encounter || patch.payload.pendingEnemyRoll) {
    return "cardReveal";
  }

  if (patch.payload.outcomeSummary) {
    return "outcome";
  }

  return "idle";
}

function getScenarioNemesisLabel(scenario: ScenarioCatalogEntry | null): string {
  if (!scenario?.nemesis) {
    return "No linked nemesis";
  }

  return `${scenario.nemesis.name} | ${scenario.nemesis.title}`;
}

function ScenarioSheetArtFrame({
  path,
  title,
  compact = false
}: {
  path?: string | null;
  title: string;
  compact?: boolean;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(path) && !failed;

  return (
    <div className={`tv-scenario-sheet-art${compact ? " tv-scenario-sheet-art-compact" : ""}`} data-testid="scenario-sheet-art">
      {showImage ? (
        <HostImage src={path} alt={`${title} scenario sheet art`} fit="contain" aspectRatio="natural" fallback="card" onError={() => setFailed(true)} />
      ) : (
        <div className="tv-scenario-sheet-art-fallback" role="img" aria-label={`${title} scenario sheet art pending`}>
          <span>Scenario Sheet</span>
          <strong>{title}</strong>
        </div>
      )}
    </div>
  );
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

  return seat.ready ? "Ready" : "Not Ready";
}

function getCurrentStepCopy(
  publicPatch: StatePatch<PublicPatchPayload> | null,
  activePlayer: PublicPlayer | null
): string {
  if (!publicPatch) {
    return "Create a room to bring the command dashboard online.";
  }

  const boardSpace = activePlayer ? getBoardSpace(activePlayer.sectorId) : null;

  if (publicPatch.payload.requiredAction) {
    return publicPatch.payload.requiredAction.detail;
  }

  if (publicPatch.payload.encounter) {
    return `${publicPatch.payload.encounter.title} is in play for ${activePlayer?.character.name ?? "the active operative"} using ${toTitleCase(
      publicPatch.payload.encounter.stat
    )}.`;
  }

  if (publicPatch.payload.pendingEnemyRoll) {
    return "Enemy roll assigned. Awaiting combat response.";
  }

  if (publicPatch.payload.status === "ended") {
    return "The campaign has ended. Review the winner and restart when ready.";
  }

  if (publicPatch.phase === "action" && activePlayer && boardSpace?.textBox.intent === "scenario-confrontation") {
    return `${boardSpace.name} is the active confrontation chamber for ${activePlayer.character.name}. Resolve ${publicPatch.payload.activeScenario?.confrontationTitle ?? "the active scenario confrontation"}.`;
  }

  if (publicPatch.phase === "navigation") {
    if (publicPatch.payload.movementPlanner?.active) {
      const planner = publicPatch.payload.movementPlanner;
      const spindle = planner.modifierSources?.find((source) => source.label === "Spindle Static Squall");
      return spindle && planner.rolledValue !== undefined
        ? `${activePlayer?.character.name ?? "The active operative"} rolled ${planner.rolledValue}; Spindle Static Squall ${spindle.value}; final movement allowance ${planner.movementValue}. Choose a legal destination.`
        : `${activePlayer?.character.name ?? "The active operative"} rolled ${planner.movementValue} and is choosing a legal destination.`;
    }

    return `Waiting on ${activePlayer?.character.name ?? "the active operative"} to roll movement.`;
  }

  if (publicPatch.phase === "action") {
    return `${activePlayer?.character.name ?? "The active operative"} is resolving the current sector.`;
  }

  if (publicPatch.phase === "broadcast") {
    return "Review the public result, then advance the table when the active player is ready.";
  }

  return "The table is preparing the next command step.";
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

function getContractSummary(player: PublicPlayer | null): string {
  const status = player?.character.privateObjectiveStatus;
  if (!status?.hasActiveContract) return "No active private Contract";
  return status.completedContracts > 0
    ? `Private Contract active | ${status.completedContracts} completed`
    : "Private Contract active";
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
      sheetArtPath: null,
      difficulty: "medium" as const,
      modeLabel: "Awaiting mode",
      publicObjective: "Create a room to load the active scenario.",
      privacy: "No private agenda data is available.",
      pressureSummary: "Create a room to load scenario pressure.",
      confrontationTitle: "Awaiting directive",
      progress: "0/0",
      progressValue: 0,
      progressThreshold: 0,
      progressLabel: "Progress",
      objectiveProgress: null,
      pressureState: null,
      collapseState: null,
      status: "lobby",
      lastTrigger: null,
      pressureTrack: null,
      finalGateRequirement: null,
      scenarioRewards: [],
      setup: [] as string[],
      specialRules: [] as string[],
      confrontationSteps: [] as string[],
      victoryText: "Create a room to load the active scenario.",
      telemetry: [] as ScenarioTelemetryItem[],
      nemesis: null as ActiveNemesisSummary | null,
      ownership: null
    };
  }

  return {
    name: scenario.name,
    theme: scenario.theme,
    sheetArtPath: scenario.sheetArtPath ?? null,
    difficulty: scenario.difficulty,
    modeLabel: patch?.payload.scenarioPressure?.modeSpecific.label ?? scenario.publicDisplay?.modeLabel ?? toTitleCase(scenario.mode ?? "coop"),
    publicObjective: scenario.publicDisplay?.objective ?? scenario.victoryText,
    privacy: scenario.publicDisplay?.privacy ?? patch?.payload.scenarioPressure?.modeSpecific.summary ?? "Public scenario pressure only.",
    pressureSummary: scenario.pressureSummary,
    confrontationTitle: scenario.confrontationTitle,
    progress: `${scenario.progress}/${scenario.threshold}`,
    progressValue: scenario.progress,
    progressThreshold: scenario.threshold,
    progressLabel: scenario.progressLabel,
    objectiveProgress: patch?.payload.scenarioPressure?.objectiveProgress ?? null,
    pressureState: patch?.payload.scenarioPressure?.pressureTrack ?? null,
    collapseState: patch?.payload.scenarioPressure?.collapseTrack ?? null,
    status: patch?.payload.scenarioPressure?.scenarioStatus ?? patch?.payload.status ?? "active",
    lastTrigger:
      patch?.payload.publicResultDeltas
        ?.filter((delta) => delta.type === "scenarioProgress" || delta.type === "scenarioPressure")
        .slice(-1)[0] ?? null,
    pressureTrack: scenario.pressureTrack ?? null,
    finalGateRequirement: scenario.finalGateRequirement ?? null,
    scenarioRewards: scenario.scenarioRewards ?? [],
    setup: scenario.setup,
    specialRules: scenario.specialRules,
    confrontationSteps: scenario.confrontationSteps,
    victoryText: scenario.victoryText,
    telemetry: patch?.payload.scenarioTelemetry ?? [],
    nemesis,
    ownership: patch?.payload.scenarioState ?? null
  };
}

interface TopHeaderProps {
  roomCode: string | null;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode | null;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  joinedCount: number;
  readyCount: number;
  seatCapacity: number;
  liveStatus: HostStateBannerModel;
  matchProgress: PublicPatchPayload["matchProgress"];
  onReturnToLobby?: () => void;
}

function ScenarioProgressRelicPanel({
  variant,
  label,
  title,
  current,
  max
}: {
  variant: "win" | "loss";
  label: string;
  title: string;
  current: number;
  max: number;
}): ReactElement {
  const safeMax = Math.max(max, 0);
  const stepCount = safeMax > 0 ? Math.min(Math.max(safeMax, 3), 8) : 3;
  const progressPercent = safeMax > 0 ? getProgressPercent(current, safeMax) : 0;
  const filledSteps = Math.ceil((progressPercent / 100) * stepCount);
  const icon = variant === "win" ? "✦" : "☠";

  return (
    <section className={`host-progress-relic host-progress-relic--${variant}`} aria-label={`${label} ${current}/${safeMax}`}>
      <div className="host-progress-relic__icon" aria-hidden="true">
        <span>{icon}</span>
      </div>
      <div className="host-progress-relic__body">
        <span className="host-progress-relic__label">{label}</span>
        <strong className="host-progress-relic__title">{title}</strong>
        <div className="host-progress-relic__meter">
          <em className="host-progress-relic__value">{current}/{safeMax}</em>
          <div className="host-progress-relic__bar" aria-hidden="true">
            {Array.from({ length: stepCount }, (_, index) => (
              <i key={index} className={`host-progress-relic__pip${index < filledSteps ? " host-progress-relic__pip--filled" : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HostTopScenarioProgress({
  win,
  loss,
  warning
}: {
  win: { label: string; title: string; current: number; max: number };
  loss: { label: string; title: string; current: number; max: number };
  warning?: MatchThresholdWarning;
}): ReactElement {
  return (
    <div className={`host-scenario-progress${warning ? ` host-scenario-progress--${warning.level}` : ""}`} aria-label="Scenario progress">
      <ScenarioProgressRelicPanel variant="win" {...win} />
      <ScenarioProgressRelicPanel variant="loss" {...loss} />
      {warning ? (
        <div className="host-scenario-progress__warning" role="status" aria-live="polite">
          <strong>{warning.label}</strong>
          <span>{warning.detail}</span>
        </div>
      ) : null}
    </div>
  );
}

function TopHeader({
  roomCode,
  sessionMode,
  gameMode,
  interactionMode,
  scenarioStatus,
  joinedCount,
  readyCount,
  seatCapacity,
  liveStatus,
  matchProgress,
  onReturnToLobby
}: TopHeaderProps): ReactElement {
  const objective = scenarioStatus.objectiveProgress;
  const pressure = scenarioStatus.pressureState;
  const collapse = scenarioStatus.collapseState;
  const winCurrent = matchProgress?.winProgress?.current ?? objective?.current ?? scenarioStatus.progressValue;
  const winMax = matchProgress?.winProgress?.required ?? objective?.required ?? scenarioStatus.progressThreshold;
  const lossCurrent = matchProgress?.lossPressure?.current ?? collapse?.current ?? pressure?.current ?? 0;
  const lossMax = matchProgress?.lossPressure?.required ?? collapse?.max ?? pressure?.max ?? scenarioStatus.progressThreshold;
  const lossTitle = collapse ? "Collapse" : pressure?.name ?? "Scenario Pressure";

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
            {gameMode === "nemesis_relay"
              ? "Relay"
              : sessionMode === "single-player"
                ? "Solo"
                : interactionMode
                  ? getInteractionModeLabel(interactionMode)
                  : "Protocol Required"}
          </strong>
        </div>
      </div>

      <HostTopScenarioProgress
        win={{
          label: "Win Progress",
          title: scenarioStatus.name === "No active scenario"
            ? objective?.label ?? scenarioStatus.progressLabel
            : `${scenarioStatus.name} - ${objective?.label ?? scenarioStatus.progressLabel}`,
          current: winCurrent,
          max: winMax
        }}
        loss={{
          label: "Loss Pressure",
          title: lossTitle,
          current: lossCurrent,
          max: lossMax
        }}
        warning={matchProgress?.thresholdWarning ?? undefined}
      />

      <section
        className={`tv-command-live-status tv-command-live-status--${liveStatus.tone}`}
        aria-label="Live status"
        data-testid="host-live-status"
        role="status"
      >
        <span>Live Status</span>
        <strong>{liveStatus.label}</strong>
        <p>
          {liveStatus.detail}
          {matchProgress?.thresholdWarning ? (
            <em> — {matchProgress.thresholdWarning.label}: {matchProgress.thresholdWarning.detail}</em>
          ) : null}
          {liveStatus.meta ? <em> — {liveStatus.meta}</em> : null}
        </p>
      </section>

      <div className="tv-command-join-module">
        {roomCode ? (
          <JoinQrCard roomCode={roomCode} variant="compact" />
        ) : (
          <div className="join-qr-card join-qr-card-compact join-qr-card-empty">
            <div>
              <h2>Create Room</h2>
              <p>Players {joinedCount}/{seatCapacity} | Ready {readyCount}/{Math.max(joinedCount, 1)}</p>
            </div>
            <div className="join-qr-frame" aria-label="QR code placeholder">
              <p>Create</p>
            </div>
          </div>
        )}
        {onReturnToLobby ? (
          <button type="button" className="tv-return-lobby-button" onClick={onReturnToLobby}>Return to Lobby</button>
        ) : null}
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

interface HostStateBannerProps {
  patch: StatePatch<PublicPatchPayload> | null;
  roomCode: string | null;
  activePlayer: PublicPlayer | null;
  joinedCount: number;
  readyCount: number;
  battleMode: boolean;
  shopMode: boolean;
  connectionStatus: "idle" | "connecting" | "open" | "closed";
  synchronized: boolean;
}

interface HostStateBannerModel {
  label: string;
  detail: string;
  meta: string;
  tone: "idle" | "ready" | "active" | "battle" | "shop" | "danger" | "ended";
}

function promptToneToHostTone(tone: ExplainabilityTone): HostStateBannerModel["tone"] {
  if (tone === "waiting") {
    return "idle";
  }

  if (tone === "move" || tone === "action") {
    return "active";
  }

  if (tone === "result") {
    return "active";
  }

  return tone;
}

function getHostStateBannerModel({ patch, roomCode, activePlayer, connectionStatus, synchronized }: HostStateBannerProps): HostStateBannerModel {
  if (patch && (connectionStatus === "closed" || connectionStatus === "connecting" || !synchronized)) {
    return {
      label: connectionStatus === "closed" ? "Host connection lost" : "Reconnecting to game server",
      detail: "The last safe board position is preserved while authoritative state is restored.",
      meta: "Player actions are not shown until synchronization completes",
      tone: "danger"
    };
  }

  if (!roomCode || !patch) {
    return {
      label: "Host setup",
      detail: "Select a scenario, mode, and player count to create the room.",
      meta: "Host selecting Co-op or Rivalry",
      tone: "idle"
    };
  }

  const activeSeatId = patch.payload.turnOrder[patch.payload.activeSeatIndex] ?? null;
  const activeSeat = patch.payload.seats.find((seat) => seat.seatId === activeSeatId) ?? null;
  if (patch.payload.status === "active" && activeSeat?.displayName && activeSeat.connected === false) {
    return {
      label: "Operative disconnected",
      detail: `Reconnecting ${activeSeat.displayName}. The board remains paused at the authoritative state.`,
      meta: "Waiting for player phone to reconnect",
      tone: "danger"
    };
  }

  const publicResult = patch.payload.matchProgress?.publicResult ?? null;
  if (publicResult) {
    return {
      label: publicResult.title,
      detail: publicResult.reason,
      meta: `${publicResult.missionName} · ${publicResult.modeLabel}`,
      tone: "ended"
    };
  }

  if (patch.payload.requiredAction) {
    const requiredAction = patch.payload.requiredAction;
    const dangerKinds = new Set(["battle", "test", "scar", "consequence"]);
    return {
      label: requiredAction.label,
      detail: requiredAction.detail,
      meta: "",
      tone: requiredAction.kind === "result"
        ? "ended"
        : dangerKinds.has(requiredAction.kind)
          ? "danger"
          : requiredAction.kind === "lobby"
            ? "idle"
            : "active"
    };
  }

  if (patch.payload.pendingMissionSelectionStatus?.status === "awaitingSelection") {
    const owner = patch.payload.seats.find((seat) => seat.seatId === patch.payload.pendingMissionSelectionStatus?.ownerSeatId);
    return {
      label: "Mission complete",
      detail: `Waiting for ${owner?.displayName ?? "the operative"} to choose a new private Contract.`,
      meta: "Private options are on the owner phone",
      tone: "active"
    };
  }

  if (patch.payload.pendingEncounterDecision) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.pendingEncounterDecision.seatId] ?? "Active operative";
    return {
      label: "Encounter payment",
      detail: `Waiting for ${ownerLabel} to resolve ${patch.payload.pendingEncounterDecision.sourceTitle}.`,
      meta: "Owner phone must answer",
      tone: "active"
    };
  }

  if (patch.payload.pendingForcedDestinationChoice) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.pendingForcedDestinationChoice.ownerSeatId] ?? "Active operative";
    return {
      label: "Choose the false route",
      detail: `Waiting for ${ownerLabel} to choose a route for ${patch.payload.pendingForcedDestinationChoice.sourceTitle}.`,
      meta: "Owner phone must answer",
      tone: "active"
    };
  }

  if (patch.payload.pendingDisplacement) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.pendingDisplacement.seatId] ?? "Active operative";
    return {
      label: "Displacement pending",
      detail: patch.payload.pendingDisplacement.direction && patch.payload.pendingDisplacement.destinationSectorName
        ? `Waiting for ${ownerLabel} to resolve ${patch.payload.pendingDisplacement.sourceTitle}: ${patch.payload.pendingDisplacement.direction} to ${patch.payload.pendingDisplacement.destinationSectorName}.`
        : `Waiting for ${ownerLabel} to resolve ${patch.payload.pendingDisplacement.sourceTitle}.`,
      meta: "Selected route locked",
      tone: "active"
    };
  }

  if (patch.payload.pendingOrderedConsequence) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.pendingOrderedConsequence.seatId] ?? "Active operative";
    const consequence = patch.payload.pendingOrderedConsequence;
    return {
      label: "Reaction pending",
      detail: `Waiting for ${ownerLabel} to resolve ${consequence.sourceId.replaceAll("-", " ")}.`,
      meta: `${consequence.actualWounds} Wound${consequence.actualWounds === 1 ? "" : "s"} applied${consequence.preventedWounds > 0 ? ` · ${consequence.preventedWounds} prevented` : ""}`,
      tone: "danger"
    };
  }

  if (patch.payload.pendingScarChoiceStatus) {
    const seatLabels = getSeatLabelMap(patch);
    const choice = patch.payload.pendingScarChoiceStatus;
    const ownerLabel = seatLabels[choice.ownerSeatId] ?? "Active operative";
    return {
      label: "The Wound Did Not Close",
      detail: `${ownerLabel} must choose: ${choice.cards.map((card) => card.title).join(" or ")}.`,
      meta: `${choice.source.toUpperCase()} SCAR · Owner phone must confirm`,
      tone: "danger"
    };
  }

  if (patch.payload.scarTriggerStatus) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.scarTriggerStatus.seatId] ?? "Active operative";
    return {
      label: "Scar consequence pending",
      detail: `Waiting for ${ownerLabel} to resolve ${patch.payload.scarTriggerStatus.scarTitle}.`,
      meta: "Owner phone must continue · Scar already acquired",
      tone: "danger"
    };
  }

  if (patch.payload.scarResolutionStatus) {
    const seatLabels = getSeatLabelMap(patch);
    const ownerLabel = seatLabels[patch.payload.scarResolutionStatus.seatId] ?? "Active operative";
    return {
      label: "Scar consequence resolved",
      detail: `${ownerLabel} resolved ${patch.payload.scarResolutionStatus.scarTitle}.`,
      meta: "Authoritative consequence complete",
      tone: "active"
    };
  }

  if (activePlayer?.character.status === "recalled") {
    return {
      label: "Operative recalled",
      detail: patch.payload.outcomeSummary?.summary ?? `${activePlayer.character.name} reached the Wound threshold and left the field.`,
      meta: "Recall is not defeat · replacement continues on player phone",
      tone: "danger"
    };
  }

  if (patch.payload.outcomeSummary?.encounterCardId === "suture-storm") {
    return {
      label: "Reaction sequence complete",
      detail: patch.payload.outcomeSummary.summary,
      meta: "Authoritative consequence resolved once",
      tone: patch.payload.outcomeSummary.success ? "active" : "danger"
    };
  }

  const prompt = buildCurrentTablePrompt(patch);
  if (patch.payload.activeResolution?.source === "movement") {
    const destinationName = patch.payload.activeResolution.card?.title ?? "the destination";
    return {
      label: "Destination challenge",
      detail: `Waiting on ${activeSeat?.displayName ?? activePlayer?.character.name ?? "the active operative"} to resolve ${destinationName}.`,
      meta: prompt.availableActionSummary ?? "Resolve on the active phone",
      tone: "active"
    };
  }

  if (patch.payload.pendingTileChallenge && patch.payload.activeResolution) {
    const challengeName = patch.payload.activeResolution.card?.title ?? "the destination challenge";
    return {
      label: "Tile challenge",
      detail: `Waiting on ${activeSeat?.displayName ?? activePlayer?.character.name ?? "the active operative"} to resolve ${challengeName}.`,
      meta: prompt.availableActionSummary ?? "Resolve on the active phone",
      tone: "active"
    };
  }

  return {
    label: prompt.phaseLabel,
    detail: prompt.publicText,
    meta: prompt.lockedReason ?? prompt.availableActionSummary ?? prompt.phaseReason,
    tone: patch.payload.status === "ended" ? "ended" : promptToneToHostTone(prompt.tone)
  };
}

function HostNetworkOverlay({ status, synchronized }: { status: "idle" | "connecting" | "open" | "closed"; synchronized: boolean }): ReactElement | null {
  if (status === "open" && synchronized) {
    return null;
  }

  const lost = status === "closed";
  return (
    <section className="tv-network-overlay" role="status" aria-live="polite" data-testid="tv-network-overlay">
      <span>{lost ? "Connection interrupted" : "Restoring command link"}</span>
      <strong>{lost ? "Host connection lost" : "Reconnecting to game server"}</strong>
      <p>The last safe board position remains visible. Current actions resume only after authoritative state returns.</p>
    </section>
  );
}

function ActiveOperativeOverlay({
  patch,
  previousPatch,
  activeSeat,
  activePlayer,
  characterCatalog
}: ActiveOperativeOverlayProps): ReactElement {
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
        playerName={activeSeat.displayName}
        characterName={activePlayer?.character.name ?? activeSeat.displayName}
        characterTitle={activePlayer?.character.archetype ?? null}
        portraitUrl={
          activePlayer && activeSeat.displayName && !activeSeat.kicked
            ? getCharacterPortraitPath(activePlayer.character.id)
            : null
        }
        locationName={getActiveSectorLabel(patch, activePlayer)}
        fieldStatus={activePlayer?.character.status === "recalled" ? "Field status recalled" : "Field status stable"}
        wounds={activePlayer?.character.wounds ?? null}
        scars={activePlayer?.character.scars.length ?? null}
        attributes={{
          cmd: activePlayer?.character.effectiveStats?.command ?? activePlayer?.character.stats.command ?? null,
          grit: activePlayer?.character.effectiveStats?.grit ?? activePlayer?.character.stats.grit ?? null,
          signal: activePlayer?.character.effectiveStats?.signal ?? activePlayer?.character.stats.signal ?? null,
          guile: activePlayer?.character.effectiveStats?.guile ?? activePlayer?.character.stats.guile ?? null,
          forge: activePlayer?.character.effectiveStats?.forge ?? activePlayer?.character.stats.forge ?? null
        }}
        gearSummary={getGearSummary(activePlayer)}
        equippedGearDetails={activePlayer?.character.equippedGearDetails ?? []}
        contractSummary={getContractSummary(activePlayer)}
        specialAbilitySummary={getSpecialAbilitySummary(activePlayer, characterCatalog)}
        companionBadges={activePlayer?.character.companionBadges ?? []}
        latestAbilityTriggerSummary={abilityTelemetry.latestTrigger?.summary ?? null}
        latestAbilityTriggerId={abilityTelemetry.latestTrigger?.abilityId ?? null}
        abilityChangeItems={abilityTelemetry.changes}
        isActiveTurn
      />
    </section>
  );
}

interface OperativesRailProps {
  patch: StatePatch<PublicPatchPayload> | null;
  characterCatalog: CharacterCatalogEntry[];
  activeSeatId: string | null;
  sessionMode: SessionMode;
  battleMode?: boolean;
}

function RosterStatCircle({ stat, value }: { stat: Stat; value: number }): ReactElement {
  const theme = getChallengeTheme(stat);

  return (
    <span
      className={`tv-operative-stat-circle tv-operative-stat-circle-${stat}`}
      style={getChallengeThemeStyle(stat) as CSSProperties}
      title={`${theme.label}: ${value}`}
      aria-label={`${theme.label} ${value}`}
    >
      <strong>{value}</strong>
    </span>
  );
}

function OperativesRail({ patch, characterCatalog, activeSeatId, sessionMode, battleMode = false }: OperativesRailProps): ReactElement {
  const fallbackSeatCount = sessionMode === "single-player" ? 1 : 4;
  const allSeats =
    patch?.payload.seats ??
    Array.from({ length: fallbackSeatCount }, (_, index) => ({
      seatId: `seat-${index + 1}`,
      characterId: characterCatalog[index]?.id ?? "void-marshal",
      displayName: null,
      connected: false,
      ready: false,
      startingMissionSelected: false,
      kicked: false
    }));
  const seats = battleMode && activeSeatId ? allSeats.filter((seat) => seat.seatId === activeSeatId) : allSeats;
  const densityClass = seats.length >= 6 ? "tv-operatives-list-dense" : seats.length >= 5 ? "tv-operatives-list-compact" : "";

  return (
    <aside className={`tv-operatives-rail tv-ornate-panel${battleMode ? " tv-operatives-rail-battle" : ""}`} aria-label="Operatives">
      <div className="tv-panel-title">
        <span />
        <h2>{battleMode ? "Active Combatant" : "Operatives"}</h2>
        <span />
      </div>
      <div className={`tv-operatives-list ${densityClass}`}>
        {seats.map((seat) => {
          const player = patch?.payload.players.find((entry) => entry.seatId === seat.seatId) ?? null;
          const catalogCharacter = characterCatalog.find((entry) => entry.id === seat.characterId) ?? null;
          const isOccupied = Boolean(player || seat.displayName);
          const isOpen = !isOccupied || seat.kicked;
          const playerName = isOpen ? "Open Seat" : seat.displayName ?? player?.character.name ?? "Open Seat";
          const characterName = isOpen ? "" : player?.character.name ?? catalogCharacter?.name ?? "Awaiting operative";
          const isActive = seat.seatId === activeSeatId;
          const statusLabel = (() => {
            if (seat.kicked || player?.character.status === "recalled") {
              return "Down";
            }

            if (isOpen) {
              return "Open";
            }

            if (!seat.connected) {
              return "Disconnected";
            }

            if (isActive) {
              return "Active";
            }

            return "Online";
          })();
          const portraitUrl = !isOpen ? getCharacterPortraitPath(player?.character.id ?? seat.characterId) : null;
          const seatNumber = getSeatNumber(seat.seatId);

          return (
            <article
              key={seat.seatId}
              className={`tv-operative-card${isActive ? " tv-operative-card-active" : " tv-operative-card-inactive"}${isOpen ? " tv-operative-card-open" : ""}`}
            >
              <div className="tv-operative-seat" aria-label={`Seat ${seatNumber}`}>{seatNumber}</div>
              <div className="tv-operative-portrait">
                {portraitUrl ? <HostImage src={portraitUrl} alt={characterName || playerName} fit="cover" aspectRatio="portrait" focalPoint="50% 14%" fallback="portrait" /> : <span aria-hidden="true">+</span>}
              </div>
              <div className="tv-operative-copy">
                <div className="tv-operative-name-row">
                  <h3>{playerName}</h3>
                  <span className={`tv-operative-link tv-operative-link-${seat.connected && !isOpen ? "online" : "offline"}`}>
                    {statusLabel.toUpperCase()}
                  </span>
                </div>
                {player && (
                  <>
                    {(player.character.companionBadges ?? []).length > 0 && (
                      <div className="tv-operative-followers" aria-label={`${characterName} followers`}>
                        <span>Follower</span>
                        <strong>{(player.character.companionBadges ?? []).map((follower) => follower.name).join(", ")}</strong>
                      </div>
                    )}
                    <div className="tv-operative-stats" aria-label={`${characterName} vitals`}>
                      <span>W {player.character.wounds ?? 0}</span>
                      <span>S {player.character.scars.length ?? 0}</span>
                      <span>T {player.character.trophies ?? 0}</span>
                    </div>
                    <div className="tv-operative-challenge-stats" aria-label={`${characterName} challenge stats`}>
                      {statOrder.map((stat) => (
                        <RosterStatCircle key={stat} stat={stat} value={player.character.stats[stat]} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="tv-operatives-legend" aria-label="Operative stat legend">
        <span>Wounds</span>
        <span>Scars</span>
        <span>Trophies</span>
      </div>
    </aside>
  );
}

interface SessionReadoutProps {
  publicPatch: StatePatch<PublicPatchPayload> | null;
  lobbyPath: HostLobbyPath;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode | null;
  playerCount: number;
  joinedCount: number;
  readyCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  roomCode: string | null;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  onLobbyPathSelected: (path: Exclude<HostLobbyPath, null>) => void;
  onLobbyBack: () => void;
  onScenarioSelected: (scenarioId: string) => void;
  onInteractionModeSelected: (interactionMode: InteractionMode) => void;
  onPlayerCountSelected: (playerCount: number) => void;
  onCreateSession: (sessionMode?: SessionMode) => Promise<void>;
  onRestartSession: () => void;
  onStartSession: () => Promise<void>;
  canStartSession: boolean;
  startSessionReason: string;
  showCreate: boolean;
  showRestart: boolean;
  showStart: boolean;
  debugOpen: boolean;
  onToggleDebug: () => void;
}

function HostGameSelection({
  onSelect
}: {
  onSelect: (path: Exclude<HostLobbyPath, null>) => void;
}): ReactElement {
  return (
    <section className="tv-game-selection" aria-label="Game selection">
      <button
        type="button"
        className="tv-game-selection-card tv-game-selection-card--solo"
        onClick={() => onSelect("solo")}
      >
        <span>Solo Run</span>
        <strong>One operative against the Reach.</strong>
        <p>Fast setup. No open seats, no table waiting, no hidden agenda furniture.</p>
        <em>1 player</em>
      </button>
      <button
        type="button"
        className="tv-game-selection-card tv-game-selection-card--multiplayer"
        onClick={() => onSelect("multiplayer")}
      >
        <span>Multiplayer</span>
        <strong>Phones join the command board.</strong>
        <p>Choose Co-op or Rivalry, then each player locks character, mission, and ready.</p>
        <em>2-6 players</em>
      </button>
    </section>
  );
}

function TvScenarioSelectionCarousel({
  scenarios,
  initialScenarioId
}: {
  scenarios: ScenarioCatalogEntry[];
  initialScenarioId?: string | null;
}): ReactElement | null {
  const initialIndex = Math.max(0, scenarios.findIndex((scenario) => scenario.id === initialScenarioId));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setActiveIndex(Math.max(0, scenarios.findIndex((scenario) => scenario.id === initialScenarioId)));
  }, [initialScenarioId, scenarios]);

  useEffect(() => {
    if (scenarios.length < 2 || reducedMotion) {
      return;
    }

    const interval = window.setInterval(
      () => setActiveIndex((current) => (current + 1) % scenarios.length),
      6500
    );
    return () => window.clearInterval(interval);
  }, [reducedMotion, scenarios.length]);

  const scenario = scenarios[activeIndex] ?? scenarios[0];
  if (!scenario) return null;

  return (
    <section className="tv-scenario-selection-window" aria-label="Scenario selection in progress">
      <header>
        <div>
          <span>Host Phone</span>
          <h2>Choosing the expedition scenario</h2>
        </div>
        <strong>{activeIndex + 1} / {scenarios.length}</strong>
      </header>
      <div className="tv-scenario-selection-feature">
        <ScenarioSheetArtFrame path={scenario.sheetArtPath ?? null} title={scenario.name} compact />
        <div className="tv-scenario-selection-copy">
          <div className="tv-scenario-selection-tags">
            <span>{toTitleCase(scenario.difficulty)}</span>
            <span>{scenario.expectedDuration}</span>
          </div>
          <h3>{scenario.name}</h3>
          <p>{scenario.theme}</p>
          <dl>
            <div><dt>Objective</dt><dd>{scenario.publicDisplay?.objective ?? scenario.victoryText}</dd></div>
            <div><dt>Changes play</dt><dd>{scenario.pressureRule}</dd></div>
            <div><dt>Final approach</dt><dd>{scenario.finalGateRequirement ?? scenario.confrontationTitle}</dd></div>
          </dl>
        </div>
      </div>
      <div className="tv-scenario-selection-track" aria-label="Available scenarios">
        {scenarios.map((entry, index) => (
          <div key={entry.id} className={index === activeIndex ? "is-active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{entry.name}</strong>
          </div>
        ))}
      </div>
      <p className="tv-scenario-selection-wait">Selection and confirmation happen privately on the Host Phone.</p>
    </section>
  );
}

function TvStartupScreen({
  roomCode,
  patch,
  status,
  error,
  scenarioCatalog,
  adminDashboardAvailable,
  onOpenAdminDashboard
}: {
  roomCode: string | null;
  patch: StatePatch<PublicPatchPayload> | null;
  status: string;
  error: string | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  adminDashboardAvailable: boolean;
  onOpenAdminDashboard: () => void;
}): ReactElement {
  const seats = patch?.payload.seats ?? [];
  const joinedSeats = seats.filter((seat) => seat.displayName && !seat.kicked);
  const hostSeat = seats.find((seat) => seat.seatId === patch?.payload.setupHostSeatId) ?? null;
  const hostConnected = Boolean(patch?.payload.hostPhoneConnected);
  const lobbyConfigured = patch?.payload.lobbyConfigured === true;
  const setup = patch?.payload.setup ?? null;
  const playerBySeat = new Map((patch?.payload.players ?? []).map((player) => [player.seatId, player]));
  const waitingCopy = !roomCode
    ? "Creating room..."
    : status === "closed"
      ? "Game server unavailable"
      : status === "connecting" && !patch
        ? "Reconnecting to game server"
    : !patch
      ? "Connecting to room..."
      : setup?.title ?? (!hostConnected
        ? "Waiting for Host Phone"
        : !lobbyConfigured
          ? "Host Phone connected. Waiting for game type."
          : patch.payload.sessionMode === "single-player"
            ? "Single Player setup in progress."
            : "Multiplayer setup in progress.");
  const legacyReadiness = patch ? getSessionStartReadiness({
    sessionMode: patch.payload.sessionMode,
    gameMode: patch.payload.gameMode,
    seats: patch.payload.seats
  }) : null;
  const startReason = setup?.publicInstruction ?? legacyReadiness?.reason ?? "Scan to control setup";

  return (
    <main
      className="tv-startup-screen"
      aria-label="Ashen Reach startup"
      style={{ "--tv-lobby-stage-image": `url("${getLobbyStagePath()}")` } as CSSProperties}
    >
      {adminDashboardAvailable ? <div className="tv-admin-tools tv-admin-tools--startup" aria-label="Host administration">
        <button type="button" className="tv-admin-library-tab" onClick={onOpenAdminDashboard} aria-label="Open Admin Dashboard"><span aria-hidden="true">⌘</span>Admin Dashboard</button>
      </div> : null}
      <section className={`tv-startup-card${joinedSeats.length >= 5 ? " tv-startup-card--crowded" : ""}`}>
        <div className="tv-startup-brand">
          <span>ASHEN REACH</span>
          <h1>{waitingCopy}</h1>
          <p>{startReason}</p>
        </div>
        <div className="tv-startup-room">
          {roomCode ? <JoinQrCard roomCode={roomCode} variant="full" /> : null}
        </div>
        {patch && (
          <div className="tv-startup-lobby">
            <div className="tv-startup-lobby-header">
              <span>{hostConnected ? `Host Phone · ${hostSeat?.displayName ?? "Connected"}` : "Host Phone not connected"}</span>
              <strong>{setup ? `${setup.connectedCount}/${setup.seatCapacity} connected` : "Waiting"}</strong>
            </div>
            {lobbyConfigured ? (
              <div className="tv-startup-selection-summary" aria-label="Selected game setup">
                <span><small>Mode</small><strong>{patch.payload.sessionMode === "single-player" ? "Solo Run" : getInteractionModeLabel(patch.payload.interactionMode ?? "co-op")}</strong></span>
                <span><small>Scenario</small><strong>{patch.payload.activeScenario?.name ?? "Awaiting selection"}</strong></span>
                <span><small>Ready</small><strong>{setup?.readyCount ?? 0}/{joinedSeats.length}</strong></span>
              </div>
            ) : null}
            <div className="tv-startup-player-list" aria-label="Players joined and open slots">
              {patch.payload.seats.map((seat, index) => {
                const player = playerBySeat.get(seat.seatId);
                const occupied = Boolean(seat.displayName) && !seat.kicked;
                return (
                  <div key={seat.seatId} className={`tv-startup-player-row${occupied ? "" : " is-empty"}${seat.ready ? " is-ready" : ""}`}>
                    <span className="tv-startup-seat-number">{index + 1}</span>
                    <div><strong>{occupied ? seat.displayName : "Open seat"}</strong><small>{occupied ? (seat.connected ? "Connected" : "Reconnecting") : "Scan to join"}</small></div>
                    <span>{occupied && seat.seatId === patch.payload.setupHostSeatId ? "HOST" : ""}</span>
                    <span>{player?.character.name ?? (occupied ? "Choosing operative" : "—")}</span>
                    <b>
                      {seat.ready ? "READY" : occupied ? "SETTING UP" : "OPEN"}
                      {occupied ? <span className="tv-screen-reader-only"> · Mission {seat.startingMissionSelected ? "yes" : "not selected"}</span> : null}
                    </b>
                  </div>
                );
              })}
            </div>
            <section className={`tv-startup-requirements${setup?.canStart ? " is-ready" : ""}`} aria-live="polite">
              <span>{setup?.canStart ? "Ready to begin" : "Start requirements"}</span>
              {setup?.canStart ? <strong>{setup.publicInstruction}</strong> : setup?.startBlockers?.length ? (
                <ul>{setup.startBlockers.slice(0, 4).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              ) : <strong>{startReason}</strong>}
            </section>
          </div>
        )}
        {(error || status === "closed") && <p className="tv-startup-error">{error ?? "The host cannot reach the game server. Retrying automatically."}</p>}
      </section>
      {patch && hostConnected && !lobbyConfigured ? (
        <TvScenarioSelectionCarousel
          scenarios={scenarioCatalog}
          initialScenarioId={patch.payload.activeScenario?.id}
        />
      ) : null}
    </main>
  );
}

function ScenarioSelectionPreview({ scenario }: { scenario: ScenarioCatalogEntry | null }): ReactElement | null {
  if (!scenario) {
    return null;
  }

  return (
    <section className="tv-session-scenario-preview" aria-label="Scenario preview">
      <ScenarioSheetArtFrame path={scenario.sheetArtPath ?? null} title={scenario.name} compact />
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
      <p className="tv-session-scenario-preview-theme">{scenario.publicDisplay?.objective ?? scenario.victoryText}</p>
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
          <span>Final Gate</span>
          <strong>{scenario.finalGateRequirement ?? "Reach the core chamber and follow scenario rules."}</strong>
        </div>
        <div>
          <span>Victory</span>
          <strong>{scenario.victoryText}</strong>
        </div>
      </div>
    </section>
  );
}

function FirstGamePanel({ interactionMode }: { interactionMode: InteractionMode | null }): ReactElement {
  const interactionCopy =
    interactionMode === "co-op"
      ? "Share pressure, assist checks, and push the scenario objective together."
      : interactionMode === "ruthless" || interactionMode === "rivalry"
        ? "Race for personal glory with owner-only rivalry agendas, public-safe reveals, trades, aid, duels, and exposed-object steals."
        : "Choose Co-op or Rivalry before authorizing the multiplayer room.";

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

function MissionProtocolSelector({
  selectedMode,
  onSelect
}: {
  selectedMode: InteractionMode | null;
  onSelect: (interactionMode: InteractionMode) => void;
}): ReactElement {
  return (
    <section className="tv-mission-protocol" aria-label="Mission protocol">
      <div className="tv-mission-protocol-header">
        <span>Table Mode</span>
        <strong>{selectedMode ? getInteractionModeLabel(selectedMode) : "Select authorization"}</strong>
      </div>
      <div className="tv-mission-protocol-options">
        <button
          type="button"
          className="tv-mission-protocol-card"
          data-selected={selectedMode === "co-op"}
          aria-pressed={selectedMode === "co-op"}
          onClick={() => onSelect("co-op")}
        >
          <strong>Co-op</strong>
          <span>Players work together against the Ashenreach. Shared survival, shared victory conditions, and group-focused scenario pressure.</span>
        </button>
        <button
          type="button"
          className="tv-mission-protocol-card"
          data-selected={selectedMode === "rivalry"}
          aria-pressed={selectedMode === "rivalry"}
          onClick={() => onSelect("rivalry")}
        >
          <strong>Rivalry</strong>
          <span>Players compete through owner-only agendas. Operatives may race, block, outscore, or outlast each other depending on the scenario.</span>
        </button>
        <button
          type="button"
          className="tv-mission-protocol-card tv-mission-protocol-card--disabled"
          disabled
          aria-disabled="true"
        >
          <strong>Nemesis</strong>
          <span>Coming later. Current relay rules are co-op champion pressure, not the hidden-agenda mode.</span>
        </button>
      </div>
      <p className="tv-mission-protocol-note">
        {selectedMode ? `${getInteractionModeLabel(selectedMode)} selected.` : "Create Multiplayer locked until Co-op or Rivalry is selected."}
      </p>
    </section>
  );
}

function SessionReadout({
  publicPatch,
  lobbyPath,
  sessionMode,
  gameMode,
  interactionMode,
  playerCount,
  joinedCount,
  readyCount,
  seatCapacity,
  activeSeatId,
  status,
  roomCode,
  selectedScenario,
  scenarioCatalog,
  onLobbyPathSelected,
  onLobbyBack,
  onScenarioSelected,
  onInteractionModeSelected,
  onPlayerCountSelected,
  onCreateSession,
  onRestartSession,
  onStartSession,
  canStartSession,
  startSessionReason,
  showCreate,
  showRestart,
  showStart,
  debugOpen,
  onToggleDebug
}: SessionReadoutProps): ReactElement {
  const missionSelectedCount =
    publicPatch?.payload.seats.filter((seat) => Boolean(seat.displayName) && !seat.kicked && seat.startingMissionSelected).length ?? 0;
  const activeSeatLabel = activeSeatId
    ? publicPatch?.payload.seats.find((seat) => seat.seatId === activeSeatId)?.displayName ?? formatSeatLabel(activeSeatId)
    : "Standby";

  if (showCreate && !roomCode && !lobbyPath) {
    return (
      <section className="tv-card tv-panel-card tv-session-panel tv-session-panel--game-selection">
        <div className="tv-card-header">
          <div>
            <h2>Choose Game Type</h2>
            <p>Pick the table shape before players enter setup.</p>
          </div>
        </div>
        <HostGameSelection onSelect={onLobbyPathSelected} />
        {debugOpen && (
          <div className="tv-session-command-bar">
            <button type="button" className="tv-button tv-button-quiet" onClick={onToggleDebug}>
              Hide debug
            </button>
          </div>
        )}
      </section>
    );
  }

  if (showCreate && !roomCode && lobbyPath) {
    const isSoloSetup = lobbyPath === "solo";
    return (
      <section className="tv-card tv-panel-card tv-session-panel tv-session-panel--setup-path">
        <div className="tv-card-header">
          <div>
            <h2>{isSoloSetup ? "Solo Run Setup" : "Multiplayer Setup"}</h2>
            <p>{isSoloSetup ? "One operative, no open seats, server-authored setup." : "Choose table mode, create the room, then players join by phone."}</p>
          </div>
        </div>

        <div className="tv-session-actions">
          <div className="tv-session-setup-scroll">
            {scenarioCatalog.length > 0 && (
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
              </>
            )}

            {isSoloSetup ? (
              <section className="tv-lobby-setup-note" aria-label="Solo setup requirements">
                <span>Solo Run</span>
                <strong>Character and starting mission happen through the normal setup path.</strong>
                <p>Create the solo room, join or use the controller flow, choose an operative, choose a starting mission, then start when ready.</p>
              </section>
            ) : (
              <>
                <label className="tv-session-scenario-picker">
                  <span>Players</span>
                  <select
                    value={playerCount}
                    onChange={(event) => onPlayerCountSelected(Number(event.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, index) => index + 2).map((count) => (
                      <option key={count} value={count}>
                        {count} players
                      </option>
                    ))}
                  </select>
                </label>
                <MissionProtocolSelector
                  selectedMode={interactionMode}
                  onSelect={onInteractionModeSelected}
                />
                <FirstGamePanel interactionMode={interactionMode} />
                <section className="tv-lobby-setup-note" aria-label="Multiplayer join note">
                  <span>Room Join</span>
                  <strong>Room code and QR appear after the host creates the multiplayer room.</strong>
                  <p>Each joined phone then follows Character, Starting Mission, Ready.</p>
                </section>
              </>
            )}
          </div>
          <div className="tv-session-command-bar">
            {debugOpen && (
              <button type="button" className="tv-button tv-button-quiet" onClick={onToggleDebug}>
                Hide debug
              </button>
            )}
            <button type="button" className="tv-button tv-button-quiet" onClick={onLobbyBack}>
              Back
            </button>
            <button
              type="button"
              disabled={!isSoloSetup && !interactionMode}
              onClick={() => void onCreateSession(isSoloSetup ? "single-player" : "multiplayer")}
            >
              {isSoloSetup ? "Create Solo Run" : "Create Multiplayer"}
            </button>
            {!isSoloSetup && !interactionMode && <p className="tv-session-ready-note">Choose Co-op or Rivalry before creating a multiplayer room.</p>}
          </div>
        </div>
      </section>
    );
  }

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
          <strong>{joinedCount}/{seatCapacity}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Ready</span>
          <strong>{readyCount}/{Math.max(joinedCount, 1)}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Missions</span>
          <strong>{missionSelectedCount}/{Math.max(joinedCount, 1)}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Mode</span>
          <strong>{getSessionModeLabel(sessionMode)}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Game</span>
          <strong>{getGameModeLabel(publicPatch?.payload.gameMode ?? gameMode)}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Table Feel</span>
          <strong>
            {publicPatch?.payload.interactionMode
              ? getInteractionModeLabel(publicPatch.payload.interactionMode)
              : interactionMode
                ? getInteractionModeLabel(interactionMode)
                : "Protocol Required"}
          </strong>
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
          <strong>{activeSeatLabel}</strong>
        </div>
        <div className="tv-session-stat">
          <span>Socket</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="tv-session-actions">
        <div className="tv-session-setup-scroll">
          {!roomCode && <p className="tv-session-ready-note">Choose Solo Run or Multiplayer to create a room.</p>}
        </div>
        <div className="tv-session-command-bar">
          {debugOpen && (
            <button type="button" className="tv-button tv-button-quiet" onClick={onToggleDebug}>
              Hide debug
            </button>
          )}
          {showCreate && (
            <>
              <button
                type="button"
                disabled={!interactionMode}
                onClick={() => void onCreateSession()}
              >
                Create multiplayer
              </button>
              <button type="button" className="tv-button tv-button-quiet" onClick={() => void onCreateSession("single-player")}>
                Create Solo Run
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
        {showStart && (
          <p className="tv-session-ready-note">{startSessionReason}</p>
        )}
      </div>
    </section>
  );
}

interface RightSidebarProps {
  roomCode: string | null;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  publicPatch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
  currentStepCopy: string;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode | null;
  playerCount: number;
  joinedCount: number;
  readyCount: number;
  seatCapacity: number;
  activeSeatId: string | null;
  status: string;
  debugOpen: boolean;
  onToggleDebug: () => void;
  selectedScenario: ScenarioCatalogEntry | null;
  scenarioCatalog: ScenarioCatalogEntry[];
  lobbyPath: HostLobbyPath;
  onLobbyPathSelected: (path: Exclude<HostLobbyPath, null>) => void;
  onLobbyBack: () => void;
  onScenarioSelected: (scenarioId: string) => void;
  onInteractionModeSelected: (interactionMode: InteractionMode) => void;
  onPlayerCountSelected: (playerCount: number) => void;
  onCreateSession: (sessionMode?: SessionMode) => Promise<void>;
  onRestartSession: () => void;
  onStartSession: () => Promise<void>;
  canStartSession: boolean;
  startSessionReason: string;
}

function HostContextPanel({
  patch,
  activePlayer,
  scenarioStatus,
  currentStepCopy
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  currentStepCopy: string;
}): ReactElement {
  const activeResolution = patch?.payload.activeResolution ?? null;
  const encounter = patch?.payload.encounter ?? null;
  const pendingEnemyRoll = patch?.payload.pendingEnemyRoll ?? null;
  const shopEncounter = patch?.payload.shopEncounter ?? null;
  const activeSpace = activePlayer ? getBoardSpace(activePlayer.sectorId) : null;
  const activeSector = activePlayer ? patch?.payload.sectors.find((sector) => sector.id === activePlayer.sectorId) ?? null : null;
  const activeSectorName = activeSpace?.name ?? activeSector?.name ?? "Awaiting deployment";
  const activeTileAssetPath = activePlayer ? getTileAssetPath(activePlayer.sectorId) : null;
  const activeTileExpectedPath = activePlayer ? getExpectedTileAssetPath(activePlayer.sectorId) : "";
  const sectorExplorationCopy = buildSectorExplorationCopy(patch?.payload.sectorExplorationSummary);
  const occupants =
    activePlayer && patch
      ? patch.payload.players.filter((player) => player.sectorId === activePlayer.sectorId)
      : [];

  if (shopEncounter) {
    return (
      <section className="tv-card tv-sidebar-card tv-host-context tv-host-context-shop" aria-label="Host context">
        <div className="tv-host-context-kicker">Shop encounter</div>
        <h2>{shopEncounter.shopName}</h2>
        <p>{shopEncounter.status === "locked" ? "Trade lane blocked. Clear threats before services come online." : "Choose service on player phone."}</p>
        <div className="tv-host-context-grid">
          <span>Sector <strong>{shopEncounter.sectorName}</strong></span>
          <span>Status <strong>{toTitleCase(shopEncounter.status)}</strong></span>
          <span>Stage <strong>{toTitleCase(shopEncounter.presentation?.stage ?? "browsing")}</strong></span>
        </div>
        {shopEncounter.blockingThreats.length > 0 && (
          <div className="tv-host-context-list">
            {shopEncounter.blockingThreats.slice(0, 3).map((threat) => (
              <span key={threat.cardId}>
                {threat.name}
                {threat.challenge ? <ChallengeBadge stat={threat.challenge.stat} value={threat.challenge.value} size="compact" /> : null}
              </span>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (activeResolution?.battle || encounter || pendingEnemyRoll) {
    const stat = activeResolution?.battle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? "grit";
    const title =
      activeResolution?.battle?.enemyName ??
      activeResolution?.card?.title ??
      encounter?.enemyName ??
      encounter?.title ??
      pendingEnemyRoll?.encounterTitle ??
      "Encounter";
    const difficulty = activeResolution?.battle?.difficulty ?? encounter?.difficulty ?? activeResolution?.roll?.target ?? 0;

    return (
      <section className="tv-card tv-sidebar-card tv-host-context tv-host-context-battle" aria-label="Host context">
        <div className="tv-host-context-kicker">{activeResolution ? resolutionStageLabel[activeResolution.stage] : "Encounter preview"}</div>
        <h2>{title}</h2>
        <p>{activeResolution?.card?.flavor ?? encounter?.flavor ?? "Resolve the active threat before the table advances."}</p>
        <div className="tv-host-context-grid">
          <span>Challenge <ChallengeBadge stat={stat} value={difficulty || "-"} size="compact" /></span>
          <span>Operative <strong>{activePlayer?.character.name ?? pendingEnemyRoll?.fighterSeatId ?? "Standby"}</strong></span>
          <span>Roll <strong>{activeResolution?.roll ? `${activeResolution.roll.finalTotal}/${activeResolution.roll.target}` : "Pending"}</strong></span>
          <span>Result <strong>{activeResolution?.roll ? (activeResolution.roll.success ? "Success" : "Failure") : "Hidden"}</strong></span>
        </div>
      </section>
    );
  }

  return (
    <section className="tv-card tv-sidebar-card tv-host-context tv-host-context-sector" aria-label="Host context">
      <div className="tv-host-context-kicker">Sector brief</div>
      <div className="tv-host-sector-preview">
        {activeTileAssetPath ? (
          <HostImage src={activeTileAssetPath} alt="" fit="cover" aspectRatio="natural" fallback="map" aria-hidden="true" />
        ) : (
          <div className="tv-host-sector-missing-art">
            <strong>Missing tile art</strong>
            <span>{activeTileExpectedPath || "No active sector"}</span>
          </div>
        )}
        <div>
          <h2>{activeSectorName}</h2>
          <p>{activeSpace?.loreText ?? currentStepCopy}</p>
        </div>
      </div>
      {activeSpace?.tags && activeSpace.tags.length > 0 && (
        <div className="tv-host-context-tags" aria-label="Sector tags">
          {activeSpace.tags.slice(0, 5).map((tag) => (
            <span key={tag}>{tag.replace("-", " ")}</span>
          ))}
        </div>
      )}
      {activeSpace?.threatIcons && activeSpace.threatIcons.length > 0 && (
        <div className="tv-host-sector-icons" aria-label="Printed challenge icons">
          {activeSpace.threatIcons.map((icon, index) => (
            <ThreatIconBadge key={`${icon}-${index}`} icon={icon} />
          ))}
        </div>
      )}
      {sectorExplorationCopy && (
        <div className="tv-sector-exploration" aria-label="Sector exploration math" data-testid="tv-sector-exploration">
          <div className="tv-host-context-grid">
            <span>Printed <strong>{sectorExplorationCopy.printedIconsText.replace(/^Printed icons: /, "")}</strong></span>
            <span>Blockers <strong>{sectorExplorationCopy.unresolvedText.replace(/^Unresolved blockers: /, "")}</strong></span>
            <span>Draw <strong>{sectorExplorationCopy.drawDueText.replace(/^Draw due: /, "")}</strong></span>
            <span>Status <strong>{sectorExplorationCopy.lockText}</strong></span>
          </div>
          <div className="tv-sector-exploration-lines">
            {sectorExplorationCopy.lines.slice(0, 4).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      )}
      {patch?.payload.tileArrival ? (
        <section className="tv-tile-arrival-stack" aria-label="Tile resolution stack" data-testid="tv-tile-arrival-stack">
          <div className="tv-host-context-kicker">Arrival sequence</div>
          {patch.payload.tileArrival.rules.map((rule, index) => (
            <article key={rule.id} className={`is-${rule.status}`}>
              <span>{index + 1}</span>
              <div><strong>{rule.label}</strong><small>{rule.marker} · {rule.mandatory ? "Mandatory" : "Optional"}</small></div>
              <b>{rule.status === "current" ? "CURRENT" : rule.status.toUpperCase()}</b>
            </article>
          ))}
          {!patch.payload.tileArrival.canEndTurn && patch.payload.tileArrival.blockedReason ? (
            <p>Awaiting operative decision · {patch.payload.tileArrival.blockedReason}</p>
          ) : null}
        </section>
      ) : null}
      {(activeSector?.tileChallenges?.length ?? 0) > 0 && (
        <section className="tv-tile-challenges" aria-label="Recurring tile challenges">
          <div className="tv-host-context-kicker">Challenges</div>
          {activeSector!.tileChallenges!.map((challenge) => (
            <article key={challenge.id}>
              <strong>{challenge.name}</strong>
              <span>{toTitleCase(challenge.challengeType)} · {toTitleCase(challenge.testStat)} {challenge.difficulty} · Recurring</span>
              <small>{challenge.failureSummary}</small>
            </article>
          ))}
        </section>
      )}
      <p>{activeSpace?.ruleText ?? "Select or activate a sector to bring its command brief online."}</p>
      <div className="tv-host-context-grid">
        <span>Reach <strong>{toTitleCase(activeSpace?.tier ?? activeSector?.regionTier ?? "Unknown")}</strong></span>
        <span>Occupants <strong>{occupants.length}</strong></span>
        <span>Scenario <strong>{scenarioStatus.name}</strong></span>
      </div>
    </section>
  );
}

function ScenarioStatusCard({
  scenarioStatus,
  scenarioOutcome,
  scenarioRuleDigest
}: {
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  scenarioOutcome: ScenarioOutcomeSummary | null;
  scenarioRuleDigest: ReturnType<typeof buildScenarioRuleDigest>;
}): ReactElement {
  const lastTriggerCopy = scenarioStatus.lastTrigger?.reason ?? scenarioStatus.lastTrigger?.publicText ?? null;

  return (
    <section className="tv-card tv-sidebar-card tv-scenario-card" aria-label="Scenario">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Scenario</h2>
        <span />
      </div>
      <ScenarioSheetArtFrame path={scenarioStatus.sheetArtPath} title={scenarioStatus.name} compact />
      <div className="tv-scenario-parchment tv-scenario-parchment-compact">
        <h3>{scenarioStatus.name}</h3>
        <p>{scenarioStatus.modeLabel}</p>
      </div>
      <div className="tv-scenario-presentation" aria-label="Scenario sheet summary">
        <p>{scenarioStatus.publicObjective}</p>
        {lastTriggerCopy ? <p className="tv-scenario-last-trigger">Last trigger: {lastTriggerCopy}</p> : null}
      </div>
      {scenarioOutcome && (
        <div className={`tv-scenario-outcome tv-scenario-outcome-${scenarioOutcome.tone}`}>
          <strong>{scenarioOutcome.title}</strong>
          <p>{scenarioOutcome.detail}</p>
        </div>
      )}
      <p className="tv-empty-copy">{scenarioRuleDigest?.pressureSummary ?? scenarioStatus.pressureSummary}</p>
      {scenarioStatus.finalGateRequirement && <p className="tv-empty-copy">Final gate: {scenarioStatus.finalGateRequirement}</p>}
      {scenarioStatus.ownership ? (
        <div className="board-sidebar-meta" aria-label="Scenario preparation, confrontation, and result">
          <span>Preparation {Object.values(scenarioStatus.ownership.preparation.resources).reduce((sum, value) => sum + value, 0)}</span>
          <span>Final {scenarioStatus.ownership.confrontation.locked === true ? "Locked" : scenarioStatus.ownership.confrontation.active ? "Active" : "Unlocked"}</span>
          <span>Result {scenarioStatus.ownership.result.status}</span>
        </div>
      ) : null}
      {scenarioStatus.scenarioRewards.length > 0 && (
        <div className="board-sidebar-meta">
          {scenarioStatus.scenarioRewards.slice(0, 3).map((reward) => (
            <span key={reward.id}>{reward.name}</span>
          ))}
        </div>
      )}
      <div className="board-sidebar-meta">
        <span>{toTitleCase(scenarioStatus.difficulty)}</span>
        <span>{scenarioStatus.confrontationTitle}</span>
        <span>{scenarioStatus.status}</span>
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
        {nemesis ? <HostImage src={getNemesisPortraitPath(nemesis.id)} alt={displayName} fit="cover" aspectRatio="portrait" focalPoint="50% 14%" fallback="portrait" /> : <div>{displayTitle}</div>}
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

function NemesisRelayTrack({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement | null {
  const champions = patch?.payload.nemesisChampions ?? [];

  if ((patch?.payload.gameMode ?? "standard") !== "nemesis_relay") {
    return null;
  }

  const seatLabels = getSeatLabelMap(patch);
  const countdowns = new Map((patch?.payload.nemesisNexusCountdowns ?? []).map((entry) => [entry.nemesisId, entry.remainingTurns]));

  return (
    <section className="tv-card tv-sidebar-card tv-relay-card" aria-label="Nemesis Relay">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Nemesis Relay</h2>
        <span />
      </div>
      <div className="tv-relay-list">
        {champions.length > 0 ? (
          champions.map((champion: NemesisChampionSummary) => {
            const healthPercent = getProgressPercent(champion.health, champion.maxHealth);
            const countdown = countdowns.get(champion.id);

            return (
              <article
                key={champion.id}
                className={`tv-relay-champion${champion.warning ? " tv-relay-champion-warning" : ""}${champion.defeated ? " tv-relay-champion-defeated" : ""}`}
              >
                <div className="tv-relay-champion-top">
                  <strong>{champion.name}</strong>
                  <span>{champion.defeated ? "Defeated" : countdown ? `${countdown} turns` : `${champion.distanceToNexus} to Nexus`}</span>
                </div>
                <p>{champion.type} bound to {seatLabels[champion.boundPlayerId] ?? champion.boundPlayerId}</p>
                <div className="tv-relay-health" aria-label={`${champion.name} health ${champion.health}/${champion.maxHealth}`}>
                  <span style={{ width: `${healthPercent}%` }} />
                </div>
                <div className="tv-relay-meta">
                  <span>{champion.sectorName}</span>
                  <span>Str {champion.strength}</span>
                  <span>{toTitleCase(champion.combatProfile)}</span>
                </div>
              </article>
            );
          })
        ) : (
          <p className="tv-empty-copy">Nemesis Champions spawn when the host starts the room.</p>
        )}
      </div>
    </section>
  );
}

function PublicRivalrySummaryCard({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement | null {
  const summary = patch?.payload.rivalryAgendaCompletion?.summary ?? patch?.payload.rivalryAgendaReveal?.summary ?? null;

  if (!summary) {
    return null;
  }

  return (
    <section className="tv-card tv-sidebar-card tv-rivalry-public-card" aria-label="Rivalry public update">
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>Rivalry</h2>
        <span />
      </div>
      <p>{summary}</p>
    </section>
  );
}

function ActiveMissionsPanel({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement {
  const occupiedSeats = (patch?.payload.seats ?? []).filter((seat) => Boolean(seat.displayName) && !seat.kicked);
  const isSetup = !patch || patch.payload.status === "lobby";
  const playersBySeatId = new Map((patch?.payload.players ?? []).map((player) => [player.seatId, player]));
  const scenario = patch?.payload.activeScenario ?? null;
  const objectiveProgress = patch?.payload.scenarioPressure?.objectiveProgress;
  const currentProgress = objectiveProgress?.current ?? scenario?.progress ?? 0;
  const requiredProgress = objectiveProgress?.required ?? scenario?.threshold ?? 0;

  return (
    <section className="tv-card tv-sidebar-card tv-contracts-card" aria-label={isSetup ? "Setup Missions" : "Public Objectives"}>
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>{isSetup ? "Setup Missions" : "Public Objectives"}</h2>
        <span />
      </div>
      {!isSetup ? (
        <article className="tv-active-mission-row tv-shared-mission-row" data-testid="tv-shared-mission-summary">
          <div className="tv-active-mission-copy">
            <span>Shared Mission</span>
            <h3>{scenario?.name ?? "Awaiting mission"}</h3>
            <p>{scenario?.publicDisplay?.objective ?? scenario?.victoryText ?? "The shared objective is synchronizing."}</p>
            {requiredProgress > 0 ? (
              <>
                <div className="tv-active-mission-progress" aria-label={`Shared mission progress ${currentProgress}/${requiredProgress}`}>
                  <span style={{ width: `${getProgressPercent(currentProgress, requiredProgress)}%` }} />
                </div>
                <div className="tv-active-mission-meta">
                  <span>{objectiveProgress?.label ?? scenario?.progressLabel ?? "Progress"}</span>
                  <span>{currentProgress}/{requiredProgress}</span>
                </div>
              </>
            ) : null}
          </div>
        </article>
      ) : null}
      <div className="tv-active-missions-list">
        {occupiedSeats.length > 0 ? (
          occupiedSeats.map((seat) => {
            const player = playersBySeatId.get(seat.seatId) ?? null;
            const privateStatus = player?.character.privateObjectiveStatus;

            return (
              <article
                key={seat.seatId}
                className="tv-active-mission-row tv-active-mission-row-compact"
              >
                <div className="tv-active-mission-owner">
                  <strong>{seat.displayName}</strong>
                  <span>{seat.connected ? "connected" : "disconnected"}</span>
                </div>
                {isSetup ? (
                  <div className="tv-active-mission-copy">
                    <h3>{seat.startingMissionSelected ? seat.startingMissionTitle ?? "Mission selected" : "Choose mission"}</h3>
                    <p>{seat.startingMissionSelected ? "Starting mission selected." : "Waiting for phone selection."}</p>
                  </div>
                ) : privateStatus?.hasActiveContract ? (
                  <div className="tv-active-mission-copy">
                    <h3>Private Contract active</h3>
                    <p>Objective details remain on {seat.displayName}&apos;s phone.</p>
                    {privateStatus.completedContracts > 0 ? <span>{privateStatus.completedContracts} completed</span> : null}
                  </div>
                ) : (
                  <div className="tv-active-mission-copy">
                    <h3>No active private Contract</h3>
                    <p>{seat.displayName} has no current personal objective.</p>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <p className="tv-empty-copy">{isSetup ? "Players choose starting missions on their phones." : "No active missions assigned."}</p>
        )}
      </div>
    </section>
  );
}

function RightSidebar({
  roomCode,
  scenarioStatus,
  publicPatch,
  activePlayer,
  currentStepCopy,
  sessionMode,
  gameMode,
  interactionMode,
  playerCount,
  joinedCount,
  readyCount,
  seatCapacity,
  activeSeatId,
  status,
  debugOpen,
  onToggleDebug,
  selectedScenario,
  scenarioCatalog,
  lobbyPath,
  onLobbyPathSelected,
  onLobbyBack,
  onScenarioSelected,
  onInteractionModeSelected,
  onPlayerCountSelected,
  onCreateSession,
  onRestartSession,
  onStartSession,
  canStartSession,
  startSessionReason
}: RightSidebarProps): ReactElement {
  const scenarioRuleDigest = buildScenarioRuleDigest(
    publicPatch?.payload.activeScenario ?? null,
    publicPatch?.payload.scenarioTelemetry ?? [],
    { telemetry: 4, specialRules: 2, confrontationSteps: 2 }
  );
  const publicResult = publicPatch?.payload.matchProgress?.publicResult ?? null;
  const scenarioOutcome: ScenarioOutcomeSummary | null = publicResult
    ? {
        title: publicResult.title,
        detail: publicResult.reason,
        tone: publicResult.outcome === "victory" ? "victory" : "defeat"
      }
    : null;

  return (
    <aside className="tv-command-sidebar">
      <HostContextPanel
        patch={publicPatch}
        activePlayer={activePlayer}
        scenarioStatus={scenarioStatus}
        currentStepCopy={currentStepCopy}
      />
      <ScenarioStatusCard
        scenarioStatus={scenarioStatus}
        scenarioOutcome={scenarioOutcome}
        scenarioRuleDigest={scenarioRuleDigest}
      />
      <PublicRivalrySummaryCard patch={publicPatch} />
      <NemesisStatusCard nemesis={publicPatch?.payload.nemesis ?? null} selectedScenario={selectedScenario} />
      <NemesisRelayTrack patch={publicPatch} />
      <ActiveMissionsPanel patch={publicPatch} />

      <SessionReadout
        publicPatch={publicPatch}
        lobbyPath={lobbyPath}
        sessionMode={sessionMode}
        gameMode={gameMode}
        interactionMode={interactionMode}
        playerCount={playerCount}
        joinedCount={joinedCount}
        readyCount={readyCount}
        seatCapacity={seatCapacity}
        activeSeatId={activeSeatId}
        status={status}
        roomCode={roomCode}
        selectedScenario={selectedScenario}
        scenarioCatalog={scenarioCatalog}
        onLobbyPathSelected={onLobbyPathSelected}
        onLobbyBack={onLobbyBack}
        onScenarioSelected={onScenarioSelected}
        onInteractionModeSelected={onInteractionModeSelected}
        onPlayerCountSelected={onPlayerCountSelected}
        onCreateSession={onCreateSession}
        onRestartSession={onRestartSession}
        onStartSession={onStartSession}
        canStartSession={canStartSession}
        startSessionReason={startSessionReason}
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
  battlePlayer: PublicPlayer | null;
  characterCatalog: CharacterCatalogEntry[];
  focusEnabled: boolean;
  rareStateModel: HostStateBannerModel | null;
  onMovementPresentationChange?: (model: MovementArrivalModel | null) => void;
}

function MovementFocusHud({
  planner,
  selectedDestination,
  arrival,
  travelStep,
  activePlayerName,
  rollReady = false
}: {
  planner: PublicMovementPlannerState | null;
  selectedDestination: PublicMoveDestination | null;
  arrival: MovementArrivalModel | null;
  travelStep?: number;
  activePlayerName: string;
  rollReady?: boolean;
}): ReactElement | null {
  if (!planner && !arrival && !rollReady) {
    return null;
  }

  const destination = arrival?.destination ?? selectedDestination;
  const route = destination?.route ?? [];
  const routeNames = route.map((_, index) => destination?.routeNames?.[index]
    ?? (index === 0
      ? planner?.currentSectorName ?? arrival?.originName ?? "Origin"
      : index === route.length - 1
        ? destination?.name ?? "Destination"
        : `Route step ${index}`));
  const stepTotal = Math.max(0, route.length - 1);
  const legalDestinationCount = planner?.destinations.filter((entry) => !entry.disabledReason || entry.voidKeyPrompt).length ?? 0;
  const beat = arrival ? "moving" : selectedDestination ? "destination" : "roll";
  const playerName = arrival?.playerName ?? activePlayerName;
  const movementDiceModel: AuthoritativeDiceModel = {
    id: `movement:${activePlayerName}`,
    revision: planner?.movementRevision ?? 0,
    stage: planner?.active ? "result" : "ready",
    context: "movement",
    actorName: playerName,
    purpose: "Movement roll",
    dice: buildDice(planner?.rollFaces ?? (planner?.rolledValue !== undefined ? [planner.rolledValue] : planner?.active ? [planner.originalMovementValue ?? planner.movementValue] : []), ["Movement die"]),
    rawTotal: planner?.rolledValue ?? planner?.originalMovementValue ?? planner?.movementValue ?? null,
    modifiers: planner?.modifierSources ?? [],
    finalValue: planner?.movementValue ?? null,
    outcome: planner?.active ? `Move ${planner.movementValue} · Legal ${legalDestinationCount}` : null
  };
  const visibleStep = arrival ? Math.min(Math.max(travelStep ?? 1, 1), Math.max(stepTotal, 1)) : 0;
  const currentName = arrival
    ? routeNames[Math.max(0, visibleStep - 1)] ?? planner?.currentSectorName ?? "Previous tile"
    : planner?.currentSectorName ?? "Current tile";
  const nextName = arrival
    ? routeNames[Math.min(visibleStep, routeNames.length - 1)] ?? destination?.name ?? "Arrival tile"
    : routeNames[1] ?? destination?.name ?? "Choose on phone";

  if (arrival && destination) {
    const threats = destination.faceUpThreats ?? [];

    return (
      <section className="tv-arrival-summary" aria-label="Movement arrival" data-testid="tv-arrival-focus">
        <header className="tv-arrival-summary__identity">
          <span>Movement complete</span>
          <strong>Arrived at {destination.name}</strong>
          <p>{playerName} · {toTitleCase(destination.ring)} Reach</p>
        </header>
        <div className="tv-arrival-summary__next">
          <span>Next</span>
          <strong>{threats.length > 0 ? `Resolve ${threats[0]!.name}` : destination.threatIcons.length > 0 ? "Resolve the arrival challenge" : destination.ruleText || "Continue the turn"}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className={`tv-movement-focus tv-movement-focus-${beat}`} aria-label="Movement focus" data-testid="tv-movement-focus">
      <header className="tv-movement-focus-heading">
        <span>{destination ? "Route selected" : "Movement command"}</span>
        <strong>{playerName} — move {planner?.movementValue ?? destination?.distance ?? stepTotal}</strong>
        <p>{destination ? `Following the confirmed route to ${destination.name}.` : "Legal destinations are marked on the board. Choose on the active phone."}</p>
      </header>

      <aside className="tv-movement-focus-roll" data-testid="movement-roll-hud">
        <AuthoritativeDicePresentation model={movementDiceModel} size="host" compact />
      </aside>

      <aside className="tv-movement-focus-destination" data-testid="movement-destination-hud">
        <span>{destination ? "Destination selected" : "Awaiting destination"}</span>
        <strong>{destination?.name ?? "Choose on phone"}</strong>
        {destination ? (
          <>
            <p>{toTitleCase(destination.ring)} reach · {stepTotal} steps</p>
            <div className="tv-movement-focus-tags">
              {destination.threatIcons.map((icon) => <i key={icon}>{toTitleCase(icon)}</i>)}
              <i>Threats {destination.faceUpThreats.length}</i>
              <i>Occupants {destination.occupants.length}</i>
              {(destination.scenarioMarkers ?? []).map((marker) => <i key={marker}>{marker}</i>)}
            </div>
            <small>{destination.ruleText || destination.loreText || "No additional tile rule."}</small>
          </>
        ) : <p>{legalDestinationCount} legal tiles glow on the board.</p>}
      </aside>

      {destination && (
        <div className="tv-movement-focus-travel" data-testid="movement-travel-hud">
          <span>{arrival ? "Moving to destination" : "Route preview"}</span>
          <strong data-testid="movement-route-step">Step {visibleStep} / {stepTotal}</strong>
          <p>Current: {currentName} · Next: {nextName} · Destination: {destination.name}</p>
        </div>
      )}

      <ol className="tv-movement-focus-timeline" aria-label="Movement progress">
        {(["roll", "destination", "moving", "arrival", "encounter"] as const).map((entry) => (
          <li key={entry} className={entry === beat ? "is-active" : ""}>{toTitleCase(entry)}</li>
        ))}
      </ol>
    </section>
  );
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
    { label: "Red Grit", stat: "grit" as const },
    { label: "Blue Signal", stat: "signal" as const },
    { label: "Green Guile", stat: "guile" as const },
    { label: "Orange Forge", stat: "forge" as const },
    { label: "Purple Command", stat: "command" as const }
  ];

  return (
    <div className="tv-board-legend" aria-label="Board legend">
      {items.map((item) => (
        <span key={item.label} className={`tv-board-legend-item tv-board-legend-${item.stat}`}>
          <ChallengeBadge stat={item.stat} label={item.label} size="compact" />
        </span>
      ))}
      <span className="tv-board-legend-item tv-board-legend-crossroads">
        <span className="tv-board-legend-crossroads-icon" aria-hidden="true">+</span>
        White Crossroads
      </span>
    </div>
  );
}

function TacticalMapPanel({
  patch,
  previousPatch,
  activeSeat,
  activePlayer,
  battlePlayer,
  characterCatalog,
  focusEnabled,
  rareStateModel,
  onMovementPresentationChange
}: TacticalMapPanelProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const qaArrivalHold = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qaArrivalHold") === "1";
  const qaMovementHold = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qaMovementHold") === "1";
  const battleMode = focusEnabled && !rareStateModel && isHostBattleActive(patch, battlePlayer);
  const shopMode = focusEnabled && !rareStateModel && activePlayer?.character.status !== "recalled" && activeSeat?.connected !== false && isHostShopActive(patch, activePlayer);
  const planner = focusEnabled && !rareStateModel && patch?.payload.movementPlanner?.active ? patch.payload.movementPlanner : null;
  const arrival = focusEnabled && !rareStateModel ? getMovementArrivalModel(patch?.payload, previousPatch?.payload, patch?.sequence) : null;
  const arrivalKey = arrival?.eventId ?? null;
  const [visualTravel, setVisualTravel] = useState<{
    key: string;
    arrival: MovementArrivalModel;
    previousPatch: PublicPatchPayload;
    step: number;
    arrived: boolean;
  } | null>(null);
  const completedTravelKeyRef = useRef<string | null>(null);
  const arrivalPending = Boolean(arrival && arrivalKey && completedTravelKeyRef.current !== arrivalKey);
  useEffect(() => {
    onMovementPresentationChange?.(visualTravel?.arrival ?? null);
    return () => onMovementPresentationChange?.(null);
  }, [onMovementPresentationChange, visualTravel?.arrival, visualTravel?.key]);
  useEffect(() => {
    if (!focusEnabled) {
      setVisualTravel(null);
      return;
    }
    if (arrival && arrivalKey && previousPatch?.payload && completedTravelKeyRef.current !== arrivalKey) {
      setVisualTravel((current) => current?.key === arrivalKey ? current : {
        key: arrivalKey,
        arrival,
        previousPatch: previousPatch.payload,
        step: 0,
        arrived: false
      });
    }
  }, [arrival, arrivalKey, focusEnabled, previousPatch]);
  useEffect(() => {
    if (!visualTravel) return;
    const finalStep = Math.max(visualTravel.arrival.destination.route.length - 1, 1);
    const route = visualTravel.arrival.destination.route;
    const currentRing = getBoardSpace(route[Math.min(visualTravel.step, route.length - 1)] ?? "")?.tier ?? null;
    const nextRing = getBoardSpace(route[Math.min(visualTravel.step + 1, route.length - 1)] ?? "")?.tier ?? null;
    const crossingRings = Boolean(currentRing && nextRing && currentRing !== nextRing);
    const timeout = window.setTimeout(() => {
      setVisualTravel((current) => {
        if (!current || current.key !== visualTravel.key) return current;
        if (reducedMotion && current.step < finalStep) return { ...current, step: finalStep };
        if (current.step < finalStep) return { ...current, step: current.step + 1 };
        if (!current.arrived) return { ...current, arrived: true };
        completedTravelKeyRef.current = current.key;
        return null;
      });
    }, reducedMotion
      ? visualTravel.arrived ? 160 : 90
        : visualTravel.arrived
        ? qaArrivalHold ? 10_000 : hostPresentationTimings.movementArrivalMs
        : qaMovementHold
          ? 4_500
        : visualTravel.step === 0
          ? hostPresentationTimings.movementStartMs
          : crossingRings
            ? hostPresentationTimings.movementCrossRingMs
            : hostPresentationTimings.movementSegmentMs);
    return () => window.clearTimeout(timeout);
  }, [qaArrivalHold, qaMovementHold, reducedMotion, visualTravel]);
  // A newly arrived authoritative patch may already contain the encounter that
  // follows movement. Preserve the movement presentation first; the battle
  // chamber opens only after the local, non-authoritative journey has settled.
  const focusBattleMode = battleMode && !arrivalPending && !visualTravel;
  const focusShopMode = !focusBattleMode && shopMode;
  const movementFocusMode = !focusBattleMode && !focusShopMode && Boolean(planner || arrivalPending || visualTravel);
  const discoveryMode = Boolean(
    focusEnabled &&
      !rareStateModel &&
      !focusBattleMode &&
      !focusShopMode &&
      !movementFocusMode &&
      patch?.payload.activeResolution?.card?.type === "asset"
  );
  const projectedDestination = planner?.selectedDestinationId
    ? planner.destinations.find((destination) => destination.sectorId === planner.selectedDestinationId) ?? null
    : null;
  const journeyChallenges = visualTravel
    ? patch?.payload.sectors.find((sector) => sector.id === visualTravel.arrival.destination.sectorId)?.tileChallenges ?? []
    : [];

  const battleChamber = focusBattleMode && !arrivalPending && !visualTravel && patch && battlePlayer
    ? <HostBattleChamber patch={patch} activePlayer={battlePlayer} />
    : null;
  const presentBattleChamber = Boolean(battleChamber);

  return (
    <section className={`tv-command-stage${presentBattleChamber ? " tv-command-stage-battle-mode" : ""}${focusShopMode ? " tv-command-stage-shop-mode" : ""}${movementFocusMode ? " tv-command-stage-movement-focus" : ""}`}>
      <div className="tv-command-map-shell" aria-hidden={(presentBattleChamber || focusShopMode) || undefined} inert={(presentBattleChamber || focusShopMode) || undefined}>
          <TacticalMapBoard
            patch={patch?.payload ?? null}
            previousPatch={visualTravel?.previousPatch ?? previousPatch?.payload ?? null}
            phase={patch?.phase ?? "start"}
            showContextBrief={!presentBattleChamber && !focusShopMode && !discoveryMode && !visualTravel}
          />
          {!movementFocusMode && <BoardLegend />}
      </div>
      {!presentBattleChamber && <NemesisBanner nemesis={patch?.payload.nemesis ?? null} />}
      {rareStateModel && (
        <section className={`tv-rare-state-panel tv-rare-state-panel--${rareStateModel.tone}`} role="status" aria-live="polite" data-testid="tv-rare-state-panel">
          <span>Current table state</span>
          <strong>{rareStateModel.label}</strong>
          <p>{rareStateModel.detail}</p>
          <em>{rareStateModel.meta}</em>
        </section>
      )}
      {!focusBattleMode && !focusShopMode && !movementFocusMode && (
        <ActiveOperativeOverlay
          patch={patch}
          previousPatch={previousPatch}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          characterCatalog={characterCatalog}
        />
      )}
      {!focusBattleMode && !focusShopMode && !movementFocusMode && patch?.payload.tileArrival ? (
        <section className="tv-board-arrival-stack" aria-label="Tile resolution stack" data-testid="tv-board-arrival-stack">
          <header>
            <span>Arrival sequence</span>
            <strong>{patch.payload.tileArrival.tileName}</strong>
          </header>
          {patch.payload.tileArrival.rules.map((rule, index) => (
            <article key={rule.id} className={`is-${rule.status}`}>
              <span>{index + 1}</span>
              <div><strong>{rule.label}</strong><small>{rule.marker} · {rule.mandatory ? "Mandatory" : "Optional"}</small></div>
              <b>{rule.status === "current" ? "CURRENT" : rule.status.toUpperCase()}</b>
            </article>
          ))}
          {!patch.payload.tileArrival.canEndTurn && patch.payload.tileArrival.blockedReason ? <p>{patch.payload.tileArrival.blockedReason}</p> : null}
        </section>
      ) : null}
      {battleChamber}
      {focusShopMode && !visualTravel && <HostShopOverlay patch={patch} activePlayer={activePlayer} />}
      {discoveryMode && patch && <HostDiscoveryOverlay patch={patch} activePlayer={activePlayer} />}
      {movementFocusMode && (
        visualTravel ? (
          <HostMovementJourney
            model={{
              eventId: visualTravel.key,
              operativeName: visualTravel.arrival.playerName,
              originName: visualTravel.arrival.originName,
              destination: visualTravel.arrival.destination
            }}
            step={visualTravel.step}
            arrived={visualTravel.arrived}
            challenges={journeyChallenges}
          />
        ) : (
          <MovementFocusHud
            planner={planner}
            selectedDestination={projectedDestination}
            arrival={null}
            activePlayerName={activeSeat?.displayName ?? activePlayer?.character.name ?? "Active operative"}
            rollReady={patch?.phase === "navigation"}
          />
        )
      )}
    </section>
  );
}

function HostBottomStatusStrip({
  patch,
  currentStepCopy
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  currentStepCopy: string;
}): ReactElement {
  const turnSeats = patch?.payload.turnOrder ?? [];
  const seatLabels = getSeatLabelMap(patch);
  const activeSeatId = patch?.payload.turnOrder[patch.payload.activeSeatIndex] ?? null;
  const activeLabel = activeSeatId ? seatLabels[activeSeatId] ?? "Active operative" : "Awaiting active operative";
  const scenarioLabel = patch?.payload.activeScenario?.name ?? "Scenario pending";
  const latestLog = [
    patch?.payload.pendingEncounterDecision
      ? `Waiting for ${activeLabel} to resolve ${patch.payload.pendingEncounterDecision.sourceTitle}.`
      : null,
    patch?.payload.rivalryAgendaCompletion?.summary,
    patch?.payload.rivalryAgendaReveal?.summary,
    patch?.payload.activeResolution?.outcome?.text,
    patch?.payload.outcomeSummary?.summary,
    patch?.payload.encounter ? `${patch.payload.encounter.title} revealed.` : null,
    ...(patch?.payload.recentAbilityTriggers.slice(-1).map((trigger) => trigger.summary) ?? [])
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <section className="tv-host-bottom-strip" aria-label="Host command status" data-testid="host-bottom-status-strip">
      <div className="tv-host-turn-order" aria-label="Turn order">
        {turnSeats.length > 0 ? (
          turnSeats.map((seatId) => (
            <span key={seatId} className={seatId === activeSeatId ? "tv-host-turn-active" : ""}>
              {seatLabels[seatId] ?? seatId}
            </span>
          ))
        ) : (
          <span>Awaiting operatives</span>
        )}
      </div>
      <div className="tv-host-table-context">
        <span>{patch ? `Active: ${activeLabel}` : "Table standby"}</span>
        <span>{scenarioLabel}</span>
      </div>
      <div className="tv-host-strip-log">
        <strong>{latestLog[0] ?? currentStepCopy}</strong>
      </div>
    </section>
  );
}

function CardRevealPanel({ patch }: { patch: StatePatch<PublicPatchPayload> | null }): ReactElement {
  const activeResolution = patch?.payload.activeResolution ?? null;
  const encounter = patch?.payload.encounter ?? null;
  const pendingEnemyRoll = patch?.payload.pendingEnemyRoll ?? null;
  const resolutionCard = activeResolution?.card ?? null;
  const resolutionBattle = activeResolution?.battle ?? null;
  const cardTitle = resolutionCard?.title ?? encounter?.title ?? pendingEnemyRoll?.encounterTitle ?? "Awaiting reveal";
  const cardType = resolutionCard?.type ?? encounter?.presentationType ?? encounter?.cardType ?? (pendingEnemyRoll ? "enemy tactic" : "Deck standing by");
  const difficulty = resolutionBattle?.difficulty ?? encounter?.difficulty ?? 0;
  const challengeStat = resolutionBattle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? null;
  const flavorText =
    resolutionCard?.flavor ?? encounter?.flavor ?? "The deck is quiet. The next draw will take the room's attention.";
  const ruleLabel = resolutionBattle ? "Battle" : encounter ? "Check" : pendingEnemyRoll ? "Enemy roller" : "Status";
  const ruleText = resolutionBattle
      ? `${statLabelById[resolutionBattle.stat]} ${resolutionBattle.difficulty}`
    : encounter
      ? `${statLabelById[encounter.stat]} ${encounter.difficulty}`
    : pendingEnemyRoll
      ? pendingEnemyRoll.assignedRollerSeatId
      : "No active card";
  const activeStage = activeResolution ? resolutionStageLabel[activeResolution.stage] : "Standby";
  const cardId = resolutionCard?.artType === "threat" ? resolutionCard.id : encounter?.id;
  const revealSummary = `${cardTitle}. ${toTitleCase(cardType)}. ${flavorText} ${ruleLabel}: ${ruleText}.`;

  return (
    <section
      key={activeResolution?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterTitle ?? "idle"}
      className={`tv-card tv-bottom-card tv-reveal-card tv-reveal-card-${encounter?.cardType ?? resolutionCard?.type ?? "idle"} ${
        activeResolution || encounter || pendingEnemyRoll ? "tv-reveal-card-live" : ""
      }`}
      aria-label="Card reveal"
      data-testid="tv-card-reveal"
    >
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>{activeStage}</h2>
        <span />
      </div>
      <div className="tv-reveal-card-layout">
        <div className="tv-reveal-art">
          <HostImage src={cardId ? getCardArtPath("threat", cardId) : null} alt="" fit="contain" aspectRatio="card" fallback="card" aria-hidden="true" />
        </div>
        <div className="tv-reveal-parchment" aria-label={revealSummary}>
          <span className="tv-card-reveal-type">{toTitleCase(cardType)}</span>
          <h3 className="tv-card-reveal-title" title={cardTitle}>
            {cardTitle}
          </h3>
          <p className="tv-card-reveal-flavor" title={flavorText}>
            {flavorText}
          </p>
          <div
            className={`tv-reveal-rule tv-card-reveal-rules${challengeStat ? ` tv-reveal-rule-${challengeStat}` : ""}`}
            tabIndex={0}
            aria-label={`${ruleLabel}: ${ruleText}`}
          >
            <strong>{ruleLabel}</strong>
            <span>
              {challengeStat ? <ChallengeBadge stat={challengeStat} value={difficulty || undefined} size="compact" /> : ruleText}
            </span>
          </div>
          {resolutionBattle && (
            <div className="tv-reveal-rule tv-card-reveal-rules" data-testid="tv-battle-panel">
              <strong>{resolutionBattle.enemyName ?? "Difficulty"}</strong>
              <span>{formatResolutionModifiers(resolutionBattle.modifiers)}</span>
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

function HostDiscoveryOverlay({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload>;
  activePlayer: PublicPlayer | null;
}): ReactElement {
  const resolution = patch.payload.activeResolution;
  const card = resolution?.card;
  const battle = resolution?.battle;
  const roll = resolution?.roll;
  const outcome = resolution?.outcome;
  const operativeName = activePlayer?.character.name ?? "Active operative";
  const resultLabel = roll ? (roll.success ? "Discovery secured" : "Discovery lost") : "Discovery test";

  return (
    <section className="tv-discovery-overlay" aria-label="Discovery encounter" data-testid="tv-discovery-overlay">
      <div className="tv-discovery-overlay__art">
        <HostImage src={card?.id ? getCardArtPath("threat", card.id) : null} alt="" fit="contain" aspectRatio="card" fallback="card" aria-hidden="true" />
      </div>
      <div className="tv-discovery-overlay__body">
        <span>Discovery encounter</span>
        <h2>{card?.title ?? "Unidentified cache"}</h2>
        <p>{card?.flavor}</p>
        {battle ? (
          <div className="tv-discovery-overlay__test">
            <ChallengeBadge stat={battle.stat} value={battle.difficulty} size="compact" />
            <strong>{operativeName}</strong>
            {roll ? <em>{roll.finalTotal} / {roll.target}</em> : <em>Awaiting roll</em>}
          </div>
        ) : null}
        <div className={`tv-discovery-overlay__result${roll?.success ? " tv-discovery-overlay__result--success" : ""}`}>
          <strong>{resultLabel}</strong>
          {outcome?.text ? <p>{outcome.text}</p> : null}
          {outcome?.effects?.map((effect) => <span key={effect}>{effect}</span>)}
        </div>
      </div>
    </section>
  );
}

function RecentOutcomePanel({
  patch,
  currentStepCopy,
  debugEvents,
  suppressRollPanel = false
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  currentStepCopy: string;
  debugEvents: DebugEvent[];
  suppressRollPanel?: boolean;
}): ReactElement {
  const activeResolution = patch?.payload.activeResolution ?? null;
  const resolutionOutcome = activeResolution ? activeResolutionToOutcomeSummary(activeResolution) : null;
  const activeOutcome = resolutionOutcome
    ? {
        ...resolutionOutcome,
        enemyRollerSeatId: patch?.payload.outcomeSummary?.enemyRollerSeatId ?? null,
        enemyDie1: patch?.payload.outcomeSummary?.enemyDie1 ?? null,
        enemyDie2: patch?.payload.outcomeSummary?.enemyDie2 ?? null,
        enemyBonus: patch?.payload.outcomeSummary?.enemyBonus ?? null,
        enemyTotal: patch?.payload.outcomeSummary?.enemyTotal ?? null
      }
    : null;
  const latestOutcome = activeOutcome ?? patch?.payload.outcomeSummary ?? null;
  const recentTriggers = patch?.payload.recentAbilityTriggers.slice(-2) ?? [];
  const logEntries = [
    patch?.payload.rivalryAgendaCompletion?.summary,
    patch?.payload.rivalryAgendaReveal?.summary,
    activeResolution?.outcome?.text,
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
          {!suppressRollPanel && latestOutcome && latestOutcome.die1 !== null && latestOutcome.die2 !== null ? (
            <div className="tv-recent-roll-with-scene">
              <DiceRollScene
                attackValue={latestOutcome.checkTotal}
                defenseValue={latestOutcome.enemyTotal ?? latestOutcome.difficulty}
                modifierValue={latestOutcome.statBonus}
                attackDieFace={latestOutcome.die1}
                defenseDieFace={latestOutcome.enemyDie1 ?? latestOutcome.die2}
                attackSuccess={latestOutcome.success === true}
                defenseSuccess={latestOutcome.success === false}
                challengeStat={latestOutcome.checkStat && latestOutcome.checkStat in statLabelById ? latestOutcome.checkStat as Stat : "grit"}
                compact
                className="tv-recent-dice-scene"
              />
              <RollOutcomePanel summary={latestOutcome} animate title="Live roll" />
            </div>
          ) : (
            <div className="tv-recent-roll-placeholder">
              <strong>{suppressRollPanel ? "Battle display active" : "No roll yet"}</strong>
              <span>{suppressRollPanel ? "Roll details are shown in the battle overlay." : "Dice results appear here after checks."}</span>
            </div>
          )}
        </div>
        <div className="tv-recent-log">
          <p>{currentStepCopy}</p>
          <ResultDeltaRow deltas={patch?.payload.publicResultDeltas} publicOnly className="tv-recent-deltas" />
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

function useTransientPresentation(id: string | null, durationMs: number): boolean {
  const [visibleId, setVisibleId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof window === "undefined") {
      setVisibleId(null);
      return;
    }
    const key = `ashenreach:presentation:${id}`;
    if (window.sessionStorage.getItem(key) === "acknowledged") {
      setVisibleId(null);
      return;
    }
    window.sessionStorage.setItem(key, "acknowledged");
    setVisibleId(id);
    const timeout = window.setTimeout(() => setVisibleId((current) => current === id ? null : current), durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, id]);

  return visibleId === id;
}

function MatchProgressFeedback({ progress }: { progress: PublicPatchPayload["matchProgress"] }): ReactElement | null {
  const concluded = Boolean(progress?.publicResult);
  const winId = concluded ? null : progress?.winProgress?.changeId ?? null;
  const lossId = concluded ? null : progress?.lossPressure?.changeId ?? null;
  const changeId = lossId ?? winId;
  const visible = useTransientPresentation(changeId, 4200);
  if (!progress || !changeId || !visible) return null;

  const change = lossId
    ? { label: "Loss Pressure", value: progress.lossPressure?.change, reason: progress.lossPressure?.changeReason, total: progress.lossPressure }
    : { label: "Victory Progress", value: progress.winProgress?.change, reason: progress.winProgress?.changeReason, total: progress.winProgress };

  return (
    <section className={`tv-match-change tv-match-change--${lossId ? "loss" : "win"}`} role="status" aria-live="polite">
      <span>{change.label} {typeof change.value === "number" ? `${change.value >= 0 ? "+" : ""}${change.value}` : "updated"}</span>
      <strong>{change.reason ?? "The shared Mission state changed."}</strong>
      {change.total ? <b>{change.total.current} / {change.total.required}</b> : null}
    </section>
  );
}

function FinalStageOverlay({ progress }: { progress: PublicPatchPayload["matchProgress"] }): ReactElement | null {
  const finalStage = progress?.finalStage ?? null;
  const announcing = useTransientPresentation(finalStage?.id ?? null, 3600);
  if (!finalStage) return null;

  return (
    <section className={`tv-final-stage${announcing ? " tv-final-stage--announcing" : ""}`} role={announcing ? "status" : "region"} aria-live={announcing ? "polite" : "off"} aria-label="Final stage">
      <span>Final Stage</span>
      <h2>{finalStage.title}</h2>
      <p>{finalStage.publicInstruction}</p>
      <div>
        <strong>{finalStage.locationName}</strong>
        {finalStage.stageLabel ? <em>{finalStage.stageLabel}</em> : null}
        {finalStage.progressLabel ? <b>{finalStage.progressLabel}</b> : null}
      </div>
    </section>
  );
}

function EndgameOverlay({
  patch,
  onReturnToLobby
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  onReturnToLobby?: () => void;
}): ReactElement | null {
  const result = patch?.payload.matchProgress?.publicResult ?? null;
  const firstReveal = useTransientPresentation(result?.id ?? null, 1800);
  if (patch?.payload.status !== "ended" || !result) {
    return null;
  }
  const winnerCopy = result.winningDisplayNames.length > 0 ? result.winningDisplayNames.join(", ") : "Shared Mission";

  return (
    <section
      className={`tv-endgame-overlay tv-endgame-overlay-${result.outcome}${firstReveal ? " tv-endgame-overlay--revealing" : " tv-endgame-overlay--restored"}`}
      aria-label="Session end state"
      role={firstReveal ? "alert" : "region"}
      aria-live={firstReveal ? "assertive" : "off"}
    >
      <div className="tv-endgame-copy">
        <span>{result.outcome}</span>
        <h2>{result.title}</h2>
        <p>{result.reason}</p>
      </div>
      <div className="tv-endgame-grid">
        <article>
          <span>Shared Mission</span>
          <strong>{result.missionName}</strong>
        </article>
        <article>
          <span>{result.outcome === "victory" ? "Victory secured by" : "Outcome"}</span>
          <strong>{result.outcome === "victory" ? winnerCopy : result.modeLabel}</strong>
        </article>
        <article>
          <span>Victory Progress</span>
          <strong>{result.finalWinProgress ? `${result.finalWinProgress.current} / ${result.finalWinProgress.required}` : "Not tracked"}</strong>
        </article>
        <article>
          <span>Loss Pressure</span>
          <strong>{result.finalLossPressure ? `${result.finalLossPressure.current} / ${result.finalLossPressure.required}` : "Disabled"}</strong>
        </article>
        <article>
          <span>Operatives</span>
          <strong>{result.operativeDisplayNames.join(", ") || "No active operatives"}</strong>
        </article>
        <article>
          <span>Final stage</span>
          <strong>{result.finalStageReached ? "Reached" : "Not reached"}</strong>
        </article>
      </div>
      {onReturnToLobby && patch.payload.matchProgress?.allowedCommands.includes("return_to_lobby") ? (
        <button type="button" className="tv-endgame-primary" onClick={onReturnToLobby}>
          {result.outcome === "defeat" ? "Start New Game" : "Return to Lobby"}
        </button>
      ) : null}
    </section>
  );
}

export function TvApp(): ReactElement {
  const [characterCatalog, setCharacterCatalog] = useState<CharacterCatalogEntry[]>([]);
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(() => getInitialTvRoomCode());
  const [sessionMode, setSessionMode] = useState<SessionMode>("multiplayer");
  const [gameMode, setGameMode] = useState<GameMode>("standard");
  const [interactionMode, setInteractionMode] = useState<InteractionMode | null>(null);
  const [lobbyPath, setLobbyPath] = useState<HostLobbyPath>(null);
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(hostTokenStorageKey)
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [adminSurface, setAdminSurface] = useState<TvAdminSurface>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<TvAdminTab>("overview");
  const [adminLibraryCardId, setAdminLibraryCardId] = useState<string | null>(null);
  const [adminMapTileId, setAdminMapTileId] = useState<string | null>(null);
  const adminQueryHandledRef = useRef(false);
  const [returnLobbyConfirmOpen, setReturnLobbyConfirmOpen] = useState(false);
  const [movementPresentation, setMovementPresentation] = useState<MovementArrivalModel | null>(null);
  const restoreValidatedRef = useRef(false);
  const { patch, error, status, synchronized: subscriptionSynchronized, debugEvents, clearDebugEvents, sendIntent } = useRoomSubscription({
    view: "tv",
    enabled: Boolean(roomCode),
    hostToken
  });
  const previousPatchRef = useRef<StatePatch<PublicPatchPayload> | null>(null);
  const previousMovementPresentationRef = useRef<MovementArrivalModel | null>(null);
  const commandMainRef = useRef<HTMLElement | null>(null);
  const previousBattleModeRef = useRef(false);

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
  const synchronized = subscriptionSynchronized ?? status === "open";
  const authoritativePresentationReady = status === "open" && synchronized;

  useEffect(() => {
    const previous = previousMovementPresentationRef.current;
    const gate = publicPatch?.payload.movementPresentationGate;
    if (previous && !movementPresentation && gate) {
      sendIntent({ type: "MOVEMENT_PRESENTATION_COMPLETED", eventId: gate.eventId });
    }
    previousMovementPresentationRef.current = movementPresentation;
  }, [movementPresentation, publicPatch?.payload.movementPresentationGate, sendIntent]);
  const effectiveRoomCode = roomCode ?? publicPatch?.sessionId ?? null;
  const firstPlayerHasJoined = Boolean(
    publicPatch?.payload.setupHostSeatId ||
    publicPatch?.payload.seats.some((seat) => Boolean(seat.displayName))
  );
  const adminAccessAllowed = Boolean(
    effectiveRoomCode &&
    hostToken &&
    authoritativePresentationReady &&
    publicPatch?.payload.status === "lobby" &&
    !firstPlayerHasJoined
  );
  useEffect(() => {
    if (adminSurface && !adminAccessAllowed) {
      setAdminSurface(null);
    }
  }, [adminAccessAllowed, adminSurface]);
  useEffect(() => {
    if (adminQueryHandledRef.current || !authoritativePresentationReady || !publicPatch) return;
    const requested = new URLSearchParams(window.location.search).get("admin");
    if (requested) {
      adminQueryHandledRef.current = true;
      if (adminAccessAllowed && ["dashboard", "overview", "library", "map", "test", "reports"].includes(requested)) {
        setAdminInitialTab(requested === "dashboard" ? "overview" : requested as TvAdminTab);
        setAdminSurface("dashboard");
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("admin");
        window.history.replaceState(null, "", url);
      }
    }
  }, [adminAccessAllowed, authoritativePresentationReady, publicPatch]);
  const joinedSeats = publicPatch?.payload.seats.filter((seat) => seat.displayName && !seat.kicked) ?? [];
  const readySeats = joinedSeats.filter((seat) => seat.ready);
  const legacyStartReadiness = getSessionStartReadiness({
    sessionMode: publicPatch?.payload.sessionMode ?? sessionMode,
    gameMode: publicPatch?.payload.gameMode ?? gameMode,
    seats: publicPatch?.payload.seats ?? []
  });
  const startReadiness = publicPatch?.payload.setup ?? {
    canStart: legacyStartReadiness.canStart,
    startReason: legacyStartReadiness.reason
  };
  const activeSeatId = publicPatch?.payload.turnOrder[publicPatch.payload.activeSeatIndex] ?? null;
  const resolutionPlayerId = getResolutionPlayerId(publicPatch);
  const combatSeatId = resolutionPlayerId ?? activeSeatId;
  const activeSeat = publicPatch?.payload.seats.find((seat) => seat.seatId === activeSeatId) ?? null;
  const activePlayer = publicPatch?.payload.players.find((entry) => entry.seatId === activeSeatId) ?? null;
  const battlePlayer = publicPatch?.payload.players.find((entry) => entry.seatId === combatSeatId) ?? activePlayer;
  const liveSessionMode = publicPatch?.payload.sessionMode ?? sessionMode;
  const liveGameMode = publicPatch?.payload.gameMode ?? gameMode;
  const liveInteractionMode = publicPatch?.payload.interactionMode ?? interactionMode;
  const selectedScenario =
    (publicPatch?.payload.activeScenario
      ? scenarioCatalog.find((scenario) => scenario.id === publicPatch.payload.activeScenario?.id) ?? null
      : scenarioCatalog.find((scenario) => scenario.id === selectedScenarioId) ?? null) ?? null;
  const setupScenarioPreview = publicPatch?.payload.setupScenarioPreview ?? null;
  const previewScenario = setupScenarioPreview
    ? scenarioCatalog.find((scenario) => scenario.id === setupScenarioPreview.scenarioId) ?? null
    : null;
  const scenarioStatus = useMemo(() => getScenarioStatus(publicPatch), [publicPatch]);
  const rareStateActive = Boolean(
    publicPatch?.payload.pendingOrderedConsequence ||
    publicPatch?.payload.pendingScarChoiceStatus ||
    publicPatch?.payload.scarTriggerStatus ||
    publicPatch?.payload.scarResolutionStatus ||
    activePlayer?.character.status === "recalled" ||
    publicPatch?.payload.outcomeSummary?.encounterCardId === "suture-storm"
  );
  const movementArrival = authoritativePresentationReady ? getMovementArrivalModel(publicPatch?.payload, previousPatchRef.current?.payload) : null;
  const battleMode = authoritativePresentationReady && !rareStateActive && !movementArrival && !movementPresentation && isHostBattleActive(publicPatch, battlePlayer);
  const shopMode = authoritativePresentationReady && !rareStateActive && !movementArrival && !movementPresentation && activePlayer?.character.status !== "recalled" && activeSeat?.connected !== false && isHostShopActive(publicPatch, activePlayer);
  const movementFocusMode = !battleMode && !shopMode && Boolean(publicPatch?.payload.movementPlanner?.active || movementArrival || movementPresentation);

  useEffect(() => {
    if (publicPatch) {
      previousPatchRef.current = publicPatch;
    }
  }, [publicPatch]);

  useEffect(() => {
    const wasInBattle = previousBattleModeRef.current;
    previousBattleModeRef.current = battleMode;

    if (wasInBattle && !battleMode) {
      window.requestAnimationFrame(() => commandMainRef.current?.focus({ preventScroll: true }));
    }
  }, [battleMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (roomCode) {
      window.localStorage.setItem(roomCodeStorageKey, roomCode);
      if (hostToken) {
        window.localStorage.setItem(hostTokenStorageKey, hostToken);
      } else {
        window.localStorage.removeItem(hostTokenStorageKey);
      }
      return;
    }

    window.localStorage.removeItem(roomCodeStorageKey);
    window.localStorage.removeItem(hostTokenStorageKey);
  }, [hostToken, roomCode]);

  useEffect(() => {
    if (restoreValidatedRef.current) {
      return;
    }

    if (!roomCode) {
      let cancelled = false;

      void fetchSessionSummary()
        .then(async (summary) => {
          if (cancelled) {
            return;
          }

          const claimedHost = summary.status === "lobby" && !summary.setupHostSeatId
            ? await claimPrePlayerHost(summary.roomCode).catch(() => null)
            : null;
          if (cancelled) {
            return;
          }
          setRoomCode(summary.roomCode);
          setHostToken(claimedHost?.hostToken ?? null);
          setSessionMode(summary.sessionMode);
          setGameMode(summary.gameMode ?? "standard");
          setInteractionMode(summary.interactionMode);
          setPlayerCount(summary.playerCount ?? summary.seats?.length ?? 6);
          setSelectedScenarioId(summary.scenarioId);
        })
        .catch(() => {
          if (!cancelled) {
            setRoomCode(null);
            setHostToken(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            restoreValidatedRef.current = true;
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (!roomCode) {
      return;
    }

    let cancelled = false;

    void fetchSessionSummary()
      .then(async (summary) => {
        if (cancelled) {
          return;
        }

        if (summary.roomCode !== roomCode || !hostToken) {
          const claimedHost = summary.status === "lobby" && !summary.setupHostSeatId
            ? await claimPrePlayerHost(summary.roomCode).catch(() => null)
            : null;
          if (cancelled) {
            return;
          }
          setRoomCode(summary.roomCode);
          setHostToken(claimedHost?.hostToken ?? null);
          setSessionMode(summary.sessionMode);
          setGameMode(summary.gameMode ?? "standard");
          setInteractionMode(summary.interactionMode);
          setPlayerCount(summary.playerCount ?? summary.seats?.length ?? 6);
          if (summary.roomCode !== roomCode) {
            setSessionNotice(null);
          }
          return;
        }

        setSessionMode(summary.sessionMode);
        setGameMode(summary.gameMode ?? "standard");
        setInteractionMode(summary.interactionMode);
        setPlayerCount(summary.playerCount ?? summary.seats?.length ?? 6);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setRoomCode(null);
        setHostToken(null);
        if (roomCode && hostToken) {
          setSessionNotice(previousSessionEndedNotice);
        }
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
      const selectedInteractionMode: InteractionMode | undefined =
        nextSessionMode === "single-player"
          ? "co-op"
          : interactionMode ?? undefined;
      if (nextSessionMode !== "single-player" && !selectedInteractionMode) {
        setRequestError("Choose Co-op or Rivalry before creating a multiplayer room.");
        return;
      }
      const selectedGameMode: GameMode = "standard";
      const selectedPlayerCount = nextSessionMode === "single-player" ? 1 : Math.min(Math.max(playerCount, 2), 6);
      const session = await createSession(nextSessionMode, scenarioId, selectedInteractionMode, selectedGameMode, selectedPlayerCount);
      setRoomCode(session.roomCode);
      setSessionMode(session.sessionMode);
      setGameMode(session.gameMode ?? "standard");
      setInteractionMode(session.interactionMode);
      setLobbyPath(null);
      setPlayerCount(session.playerCount);
      setSelectedScenarioId(session.scenarioId);
      setHostToken(session.hostToken);
      restoreValidatedRef.current = true;
    } catch (createFailure) {
      setRequestError(createFailure instanceof Error ? createFailure.message : "Could not create a room");
    }
  };

  const selectLobbyPath = (nextLobbyPath: Exclude<HostLobbyPath, null>) => {
    setRequestError(null);
    setSessionNotice(null);
    setLobbyPath(nextLobbyPath);
    setGameMode("standard");

    if (nextLobbyPath === "solo") {
      setSessionMode("single-player");
      setInteractionMode("co-op");
      setPlayerCount(1);
      return;
    }

    setSessionMode("multiplayer");
    setInteractionMode(null);
    setPlayerCount((current) => Math.min(Math.max(current, 2), 6));
  };

  const startHostSession = async () => {
    const targetRoomCode = roomCode ?? publicPatch?.sessionId ?? null;

    if (!targetRoomCode || startSubmitting) {
      return;
    }

    setRequestError(null);
    setStartSubmitting(true);

    try {
      await startSession(targetRoomCode);
    } catch (startFailure) {
      setRequestError(startFailure instanceof Error ? startFailure.message : "Could not start");
    } finally {
      setStartSubmitting(false);
    }
  };

  const currentStepCopy = getCurrentStepCopy(publicPatch, activePlayer);
  const liveStatus = getHostStateBannerModel({
    patch: publicPatch,
    roomCode: effectiveRoomCode,
    activePlayer,
    joinedCount: joinedSeats.length,
    readyCount: readySeats.length,
    battleMode,
    shopMode,
    connectionStatus: status,
    synchronized
  });
  const displayedLiveStatus: HostStateBannerModel = movementPresentation
    ? {
        label: `${movementPresentation.playerName} is moving`,
        detail: `Destination: ${movementPresentation.destination.name}.`,
        meta: "Movement journey",
        tone: "active"
      }
    : liveStatus;
  const rareStateModel = authoritativePresentationReady && rareStateActive ? displayedLiveStatus : null;
  const isPreRoomLobby = !effectiveRoomCode && !publicPatch;

  const gameUiReady =
    publicPatch &&
    (publicPatch.payload.status === "active" || publicPatch.payload.status === "ended") &&
    publicPatch.payload.lobbyConfigured !== false;

  const cartographyFixture = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("cartographyFixture")
    : null;
  const approvalPrototype = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("tvPrototype")
    : null;
  const requestedShopCategory = new URLSearchParams(window.location.search).get("shopCategory");
  const requestedShopView = new URLSearchParams(window.location.search).get("shopView");
  const signalTheatreMode = new URLSearchParams(window.location.search).get("hostDesign") !== "legacy";
  if (approvalPrototype === "shop") {
    return (
      <TvShopApprovalPrototype
        category={["forge-armoury", "market", "medicae-shrine", "relic-dealer", "contract-broker"].includes(requestedShopCategory ?? "")
          ? requestedShopCategory as NonNullable<PublicShopEncounterState["shopCategory"]>
          : "market"}
        view={["categories", "route-aids", "services"].includes(requestedShopView ?? "")
          ? requestedShopView as "categories" | "route-aids" | "services"
          : "route-aids"}
      />
    );
  }
  if (approvalPrototype === "lobby-qr") {
    return <TvLobbyQrPrototype roomCode="ASHEN" />;
  }
  if (approvalPrototype === "scenario") {
    return (
      <TvScenarioBriefing
        scenario={selectedScenario}
        playerCount={playerCount}
        hostName={activeSeat?.displayName ?? "Expedition Host"}
      />
    );
  }
  if (approvalPrototype === "battle-reveal") {
    const requestedStage = new URLSearchParams(window.location.search).get("battleRevealStage");
    return (
      <TvBattleRevealPrototype
        forcedStage={["card", "identity", "ready"].includes(requestedStage ?? "")
          ? requestedStage as TvBattleRevealStage
          : null}
      />
    );
  }
  if (adminSurface === "dashboard" && adminAccessAllowed && effectiveRoomCode && hostToken) {
    return (
      <Suspense fallback={<div className="admin-library-loading">Opening host administration…</div>}>
        <AdminDashboard
          roomCode={effectiveRoomCode}
          hostToken={hostToken}
          initialTab={adminInitialTab}
          initialCardId={adminLibraryCardId}
          initialTileId={adminMapTileId}
          onClose={() => setAdminSurface(null)}
        />
      </Suspense>
    );
  }
  if (setupScenarioPreview && publicPatch?.payload.status === "lobby") {
    return (
      <TvScenarioBriefing
        key={setupScenarioPreview.revision}
        scenario={previewScenario}
        mode={setupScenarioPreview.mode}
        playerCount={setupScenarioPreview.playerCount}
        hostName={setupScenarioPreview.requester.displayName}
        roomCode={effectiveRoomCode}
        joinedCount={joinedSeats.length}
        readyCount={readySeats.length}
        approvalFixture={false}
      />
    );
  }
  if (cartographyFixture && ["route", "challenge", "dense", "inner"].includes(cartographyFixture)) {
    return (
      <SignalCartographyPrototype
        patch={publicPatch}
        fixture={cartographyFixture as SignalCartographyFixture}
      />
    );
  }
  if (publicPatch?.payload.hostView?.mode === "map") {
    return (
      <SignalCartographyPrototype
        patch={publicPatch}
        fixture="live"
      />
    );
  }
  if (signalTheatreMode) {
    return (
      <>
        <SignalTheatreHost
          patch={publicPatch}
          previousPatch={previousPatchRef.current}
          roomCode={effectiveRoomCode}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          currentStepCopy={currentStepCopy}
          synchronized={authoritativePresentationReady}
          connectionStatus={status}
          adminDashboardAvailable={adminAccessAllowed}
          onOpenAdminDashboard={() => { setAdminInitialTab("overview"); setAdminSurface("dashboard"); }}
          onMovementPresentationCompleted={(eventId) => {
            const gate = publicPatch?.payload.movementPresentationGate;
            if (gate?.eventId) {
              sendIntent({ type: "MOVEMENT_PRESENTATION_COMPLETED", eventId: gate.eventId });
            }
          }}
        />
        <EndgameOverlay
          patch={publicPatch}
          onReturnToLobby={hostToken
            ? () => {
                if (publicPatch?.payload.matchProgress?.publicResult?.outcome === "defeat") {
                  sendIntent({ type: "RETURN_TO_LOBBY" });
                  return;
                }
                setReturnLobbyConfirmOpen(true);
              }
            : undefined}
        />
      </>
    );
  }

  if (!gameUiReady) {
    return (
      <>
        <TvStartupScreen roomCode={effectiveRoomCode} patch={publicPatch} status={status} error={requestError ?? error} scenarioCatalog={scenarioCatalog} adminDashboardAvailable={adminAccessAllowed} onOpenAdminDashboard={() => { setAdminInitialTab("overview"); setAdminSurface("dashboard"); }} />
      </>
    );
  }

  return (
    <main className={`tv-dashboard tv-command-dashboard${battleMode ? " tv-command-dashboard--battle-focus" : ""}${shopMode ? " tv-command-dashboard--shop-focus" : ""}${movementFocusMode ? " tv-command-dashboard--movement-focus" : ""}`}>
      <div className="tv-title-safe">
        <TopHeader
          roomCode={effectiveRoomCode}
          sessionMode={liveSessionMode}
          gameMode={liveGameMode}
          interactionMode={liveInteractionMode}
          scenarioStatus={scenarioStatus}
          joinedCount={joinedSeats.length}
          readyCount={readySeats.length}
          seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 6)}
          liveStatus={displayedLiveStatus}
          matchProgress={publicPatch?.payload.matchProgress}
          onReturnToLobby={hostToken && publicPatch?.payload.status !== "ended" ? () => setReturnLobbyConfirmOpen(true) : undefined}
        />

        {(requestError || error) && <div className="tv-banner tv-banner-error">{requestError ?? error}</div>}
        {sessionNotice && <div className="tv-banner">{sessionNotice}</div>}
        <HostYouTubePlayer />
        <EndgameOverlay
          patch={publicPatch}
          onReturnToLobby={hostToken
            ? () => {
                if (publicPatch?.payload.matchProgress?.publicResult?.outcome === "defeat") {
                  sendIntent({ type: "RETURN_TO_LOBBY" });
                  return;
                }
                setReturnLobbyConfirmOpen(true);
              }
            : undefined}
        />
        <MatchProgressFeedback progress={publicPatch?.payload.matchProgress} />
        <FinalStageOverlay progress={publicPatch?.payload.matchProgress} />
        {!authoritativePresentationReady && <HostNetworkOverlay status={status} synchronized={synchronized} />}
        <HostMotionCue
          patch={publicPatch}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          currentStepCopy={currentStepCopy}
          movementPresenting={movementFocusMode}
          synchronized={authoritativePresentationReady}
        />

        <section
          ref={commandMainRef}
          className={`tv-command-main${isPreRoomLobby ? " tv-command-main--pre-room" : ""}${battleMode ? " tv-command-main--battle-focus" : ""}${shopMode ? " tv-command-main--shop-focus" : ""}${movementFocusMode ? " tv-command-main--movement-focus" : ""}`}
          data-testid="tv-command-main"
          aria-label="Host command board"
          aria-hidden={publicPatch?.payload.status === "ended" || undefined}
          inert={publicPatch?.payload.status === "ended" || undefined}
          tabIndex={-1}
        >
          {isPreRoomLobby ? (
            <section className="tv-pre-room-lobby-stage" aria-label="Host lobby setup">
              <SessionReadout
                publicPatch={publicPatch}
                lobbyPath={lobbyPath}
                sessionMode={liveSessionMode}
                gameMode={liveGameMode}
                interactionMode={liveInteractionMode}
                playerCount={playerCount}
                joinedCount={joinedSeats.length}
                readyCount={readySeats.length}
                seatCapacity={liveSessionMode === "single-player" ? 1 : 6}
                activeSeatId={activeSeatId}
                status={status}
                roomCode={effectiveRoomCode}
                selectedScenario={selectedScenario}
                scenarioCatalog={scenarioCatalog}
                onLobbyPathSelected={selectLobbyPath}
                onLobbyBack={() => {
                  setRequestError(null);
                  setLobbyPath(null);
                }}
                onScenarioSelected={setSelectedScenarioId}
                onInteractionModeSelected={setInteractionMode}
                onPlayerCountSelected={setPlayerCount}
                onCreateSession={createHostSession}
                onRestartSession={() => {
                  setRequestError(null);
                  sendIntent({ type: "RESTART_SESSION" });
                }}
                onStartSession={startHostSession}
                canStartSession={startReadiness.canStart && !startSubmitting}
                startSessionReason={startSubmitting ? "Starting game…" : startReadiness.startReason}
                showCreate
                showRestart={false}
                showStart={false}
                debugOpen={debugOpen}
                onToggleDebug={() => setDebugOpen((current) => !current)}
              />
            </section>
          ) : (
            <>
              {!battleMode && !movementFocusMode && (publicPatch || effectiveRoomCode) && (
            <OperativesRail
              patch={publicPatch}
              characterCatalog={characterCatalog}
              activeSeatId={battleMode ? combatSeatId : activeSeatId}
              sessionMode={liveSessionMode}
              battleMode={battleMode}
            />
              )}

              <TacticalMapPanel
                patch={publicPatch}
                previousPatch={previousPatchRef.current}
                activeSeat={activeSeat}
                activePlayer={activePlayer}
                battlePlayer={battlePlayer}
                characterCatalog={characterCatalog}
                focusEnabled={authoritativePresentationReady}
                rareStateModel={rareStateModel}
                onMovementPresentationChange={setMovementPresentation}
              />

              {authoritativePresentationReady && !battleMode && !shopMode && !movementFocusMode && !rareStateActive && <RightSidebar
                roomCode={effectiveRoomCode}
                scenarioStatus={scenarioStatus}
                publicPatch={publicPatch}
                activePlayer={activePlayer}
                currentStepCopy={currentStepCopy}
                sessionMode={liveSessionMode}
                gameMode={liveGameMode}
                interactionMode={liveInteractionMode}
                playerCount={playerCount}
                joinedCount={joinedSeats.length}
                readyCount={readySeats.length}
                seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 6)}
                activeSeatId={activeSeatId}
                status={status}
                debugOpen={debugOpen}
                onToggleDebug={() => setDebugOpen((current) => !current)}
                selectedScenario={selectedScenario}
                scenarioCatalog={scenarioCatalog}
                lobbyPath={lobbyPath}
                onLobbyPathSelected={selectLobbyPath}
                onLobbyBack={() => { setRequestError(null); setLobbyPath(null); }}
                onScenarioSelected={setSelectedScenarioId}
                onInteractionModeSelected={setInteractionMode}
                onPlayerCountSelected={setPlayerCount}
                onCreateSession={createHostSession}
                onRestartSession={() => { setRequestError(null); sendIntent({ type: "RESTART_SESSION" }); }}
                onStartSession={startHostSession}
                canStartSession={startReadiness.canStart && !startSubmitting}
                startSessionReason={startSubmitting ? "Starting game…" : startReadiness.startReason}
              />}

            </>
          )}
        </section>

        {debugOpen && (
          <section className="tv-debug-drawer">
            <DebugPanel events={debugEvents} onClear={clearDebugEvents} title="TV debug" />
          </section>
        )}
      </div>
      {returnLobbyConfirmOpen ? (
        <div className="tv-return-lobby-confirm" role="dialog" aria-modal="true" aria-labelledby="tv-return-lobby-title">
          <section>
            <span>Host Session Control</span>
            <h2 id="tv-return-lobby-title">Return everyone to the lobby?</h2>
            <p>Current game progress will end. Connected players keep compatible room seats and can choose a new mode, operative, and mission.</p>
            <div>
              <button type="button" onClick={() => setReturnLobbyConfirmOpen(false)}>Cancel</button>
              <button
                type="button"
                className="tv-return-lobby-confirm__accept"
                onClick={() => {
                  setReturnLobbyConfirmOpen(false);
                  setRequestError(null);
                  sendIntent({ type: "RETURN_TO_LOBBY" });
                }}
              >
                Return to Lobby
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
