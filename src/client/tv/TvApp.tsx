import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import {
  describeContractObjective,
  formatContractObjectiveStatus,
  formatContractProgress,
  getContractObjectiveTarget,
  isContractObjectiveComplete
} from "../../game/contracts/objectives.js";
import { getSessionStartReadiness } from "../../game/rules/sessionStart.js";
import { getChallengeTheme, getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { HostAudioControls } from "../audio/HostAudioControls.js";
import { useAshenReachAudio } from "../audio/useAshenReachAudio.js";
import { createSession, fetchCharacters, fetchScenarios, fetchSessionSummary, startSession } from "../shared/network.js";
import { getSeatAbilityTelemetry } from "../shared/abilityTelemetry.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { ChallengeBadge, ThreatIconBadge } from "../shared/ChallengeBadge.js";
import { DebugPanel } from "../shared/DebugPanel.js";
import { RollOutcomePanel } from "../shared/RollOutcomePanel.js";
import {
  activeResolutionToOutcomeSummary,
  formatResolutionModifiers,
  resolutionStageLabel
} from "../shared/resolutionPresentation.js";
import { buildScenarioOutcomeSummary, buildScenarioRuleDigest } from "../shared/scenarioPresentation.js";
import {
  buildCurrentTablePrompt,
  buildSectorExplorationCopy,
  type ExplainabilityTone
} from "../shared/explainabilityPrompts.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { formatSeatLabel, statOrder, statShortLabelById } from "../shared/statLabels.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import { getCharacterPortraitPath, getNemesisPortraitPath } from "../shared/assetPaths.js";
import type {
  ActiveNemesisSummary,
  CharacterCatalogEntry,
  DebugEvent,
  GameMode,
  InteractionMode,
  NemesisChampionSummary,
  PublicPatchPayload,
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicPlayer,
  PublicSeat,
  ScenarioCatalogEntry,
  SessionMode,
  ScenarioTelemetryItem,
  StatePatch,
  Stat,
  ContractCard
} from "../shared/types.js";
import { HostPlayerCard } from "./HostPlayerCard.js";
import { HostBattleOverlay } from "./HostBattleOverlay.js";
import { isHostBattleActive } from "./hostBattleState.js";
import { HostShopOverlay } from "./HostShopOverlay.js";
import { isHostShopActive } from "./hostShopState.js";
import { DiceRollScene } from "./DiceRollScene.js";
import { JoinQrCard } from "./JoinQrCard.js";
import { TacticalMapBoard } from "./TacticalMapBoard.js";
import { getExpectedTileAssetPath, getTileAssetPath } from "./tileAssetManifest.js";

const hostTokenStorageKey = "ashen-reach-tv-host-token";
const roomCodeStorageKey = "ashen-reach-tv-room-code";

function getInitialTvRoomCode(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("room") ?? window.localStorage.getItem(roomCodeStorageKey);
}
const previousSessionEndedNotice = "Previous session ended. Create a new room to continue.";

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

function formatContractRewardSummary(contract: ContractCard): string {
  const reward = contract.reward;

  if (!reward || typeof reward !== "object" || !("type" in reward)) {
    return "Reward on completion";
  }

  const rewardType = String((reward as { type?: unknown }).type ?? "");

  switch (rewardType) {
    case "gain_gear":
      return "Reward: gear";
    case "gain_follower":
      return "Reward: follower";
    case "gain_trophy":
      return `Reward: ${(reward as { amount?: number }).amount ?? 1} trophy`;
    case "lose_heat":
      return "Reward: scar relief";
    case "heal_wound":
      return `Reward: heal ${(reward as { amount?: number }).amount ?? 1} wound`;
    case "gain_note":
      return "Reward: field note";
    case "sequence":
      return "Reward: bundled payout";
    default:
      return `Reward: ${toTitleCase(rewardType || "completion")}`;
  }
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
        <img src={path ?? ""} alt={`${title} scenario sheet art`} onError={() => setFailed(true)} />
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
      return `${activePlayer?.character.name ?? "The active operative"} rolled ${publicPatch.payload.movementPlanner.movementValue} and is choosing a legal destination.`;
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

function getContractLookup(patch: StatePatch<PublicPatchPayload> | null): Map<string, ContractCard> {
  return new Map((patch?.payload.availableContracts ?? []).map((contract) => [contract.id, contract]));
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
      nemesis: null as ActiveNemesisSummary | null
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
    nemesis
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
  loss
}: {
  win: { label: string; title: string; current: number; max: number };
  loss: { label: string; title: string; current: number; max: number };
}): ReactElement {
  return (
    <div className="host-scenario-progress" aria-label="Scenario progress">
      <ScenarioProgressRelicPanel variant="win" {...win} />
      <ScenarioProgressRelicPanel variant="loss" {...loss} />
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
  liveStatus
}: TopHeaderProps): ReactElement {
  const objective = scenarioStatus.objectiveProgress;
  const pressure = scenarioStatus.pressureState;
  const collapse = scenarioStatus.collapseState;
  const winCurrent = objective?.current ?? scenarioStatus.progressValue;
  const winMax = objective?.required ?? scenarioStatus.progressThreshold;
  const lossCurrent = collapse?.current ?? pressure?.current ?? 0;
  const lossMax = collapse?.max ?? pressure?.max ?? scenarioStatus.progressThreshold;
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
          title: objective?.label ?? scenarioStatus.progressLabel,
          current: winCurrent,
          max: winMax
        }}
        loss={{
          label: "Loss Pressure",
          title: lossTitle,
          current: lossCurrent,
          max: lossMax
        }}
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

function getHostStateBannerModel({ patch, roomCode }: HostStateBannerProps): HostStateBannerModel {
  if (!roomCode || !patch) {
    return {
      label: "Host setup",
      detail: "Select a scenario, mode, and player count to create the room.",
      meta: "Host selecting Co-op or Rivalry",
      tone: "idle"
    };
  }

  const prompt = buildCurrentTablePrompt(patch);
  return {
    label: prompt.phaseLabel,
    detail: prompt.publicText,
    meta: prompt.lockedReason ?? prompt.availableActionSummary ?? prompt.phaseReason,
    tone: patch.payload.status === "ended" ? "ended" : promptToneToHostTone(prompt.tone)
  };
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
  const activeCatalogCharacter = characterCatalog.find((entry) => entry.id === activePlayer?.character.id);
  const activePresentation = activePlayer?.character.presentation ?? activeCatalogCharacter?.presentation;

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
        characterRole={activePresentation?.role ?? null}
        characterComplexity={activePresentation?.complexity ? toTitleCase(activePresentation.complexity) : null}
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
          cmd: activePlayer?.character.stats.command ?? null,
          grit: activePlayer?.character.stats.grit ?? null,
          signal: activePlayer?.character.stats.signal ?? null,
          guile: activePlayer?.character.stats.guile ?? null,
          forge: activePlayer?.character.stats.forge ?? null
        }}
        gearSummary={getGearSummary(activePlayer)}
        contractSummary={getContractSummary(activePlayer, patch)}
        specialAbilitySummary={getSpecialAbilitySummary(activePlayer, characterCatalog)}
        companionBadges={activePlayer?.character.companionBadges ?? []}
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
          const characterName = isOpen ? "Open Seat" : player?.character.name ?? seat.displayName ?? catalogCharacter?.name ?? "Open Seat";
          const characterTitle = isOpen ? "-" : player?.character.archetype ?? catalogCharacter?.archetype ?? "Awaiting operative";
          const characterPresentation = player?.character.presentation ?? catalogCharacter?.presentation;
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

            if (seat.ready) {
              return "Ready";
            }

            return seat.startingMissionSelected ? "Mission" : "Joined";
          })();
          const portraitUrl = !isOpen ? getCharacterPortraitPath(player?.character.id ?? seat.characterId) : null;
          const seatNumber = getSeatNumber(seat.seatId);

          return (
            <article
              key={seat.seatId}
              className={`tv-operative-card${isActive ? " tv-operative-card-active" : ""}${isOpen ? " tv-operative-card-open" : ""}`}
            >
              <div className="tv-operative-seat" aria-label={`Seat ${seatNumber}`}>{seatNumber}</div>
              <div className="tv-operative-portrait">
                {portraitUrl ? <img src={portraitUrl} alt={characterName} /> : <span aria-hidden="true">+</span>}
              </div>
              <div className="tv-operative-copy">
                <div className="tv-operative-name-row">
                  <h3>{characterName}</h3>
                  <span className={`tv-operative-link tv-operative-link-${seat.connected && !isOpen ? "online" : "offline"}`}>
                    {statusLabel.toUpperCase()}
                  </span>
                </div>
                <p>{characterTitle}</p>
                {characterPresentation && (
                  <p className="tv-operative-role-row">
                    {characterPresentation.role} | {toTitleCase(characterPresentation.complexity)}
                  </p>
                )}
                {isOccupied && !isOpen ? (
                  <div className="tv-operative-setup-row" aria-label={`${characterName} setup state`}>
                    <span>Character ✓</span>
                    <span>{seat.startingMissionSelected ? `Mission: ${seat.startingMissionTitle ?? "Selected"}` : "Mission: Choose mission"}</span>
                    <span>Ready {seat.ready ? "✓" : seat.startingMissionSelected ? "..." : "locked"}</span>
                  </div>
                ) : null}
                {player && (
                  <>
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

function TvStartupScreen({
  roomCode,
  patch,
  status,
  error
}: {
  roomCode: string | null;
  patch: StatePatch<PublicPatchPayload> | null;
  status: string;
  error: string | null;
}): ReactElement {
  const seats = patch?.payload.seats ?? [];
  const joinedSeats = seats.filter((seat) => seat.displayName && !seat.kicked);
  const hostSeat = seats.find((seat) => seat.seatId === patch?.payload.setupHostSeatId) ?? null;
  const hostConnected = Boolean(patch?.payload.hostPhoneConnected);
  const lobbyConfigured = patch?.payload.lobbyConfigured === true;
  const waitingCopy = !roomCode
    ? "Creating room..."
    : !patch
      ? "Connecting to room..."
      : !hostConnected
        ? "Waiting for Host Phone"
        : !lobbyConfigured
          ? "Host Phone connected. Waiting for game type."
          : patch.payload.sessionMode === "single-player"
            ? "Single Player setup in progress."
            : "Multiplayer setup in progress.";
  const startReason = patch
    ? getSessionStartReadiness({
        sessionMode: patch.payload.sessionMode,
        gameMode: patch.payload.gameMode,
        seats: patch.payload.seats
      }).reason
    : "Scan to control setup";

  return (
    <main className="tv-startup-screen" aria-label="Ashen Reach startup">
      <section className="tv-startup-card">
        <div className="tv-startup-brand">
          <span>ASHEN REACH</span>
          <h1>{waitingCopy}</h1>
          <p>{lobbyConfigured ? startReason : "Scan to control setup"}</p>
        </div>
        <div className="tv-startup-room">
          <span>Room Code</span>
          <strong>{roomCode ?? "..."}</strong>
          {roomCode ? <JoinQrCard roomCode={roomCode} variant="full" /> : null}
        </div>
        {patch && (
          <div className="tv-startup-lobby">
            <div className="tv-startup-lobby-header">
              <span>{hostConnected ? `Host Phone: ${hostSeat?.displayName ?? hostSeat?.seatId ?? "Connected"}` : "No Host Phone yet"}</span>
              <strong>{patch.payload.lobbyConfigured ? getSessionModeLabel(patch.payload.sessionMode) : "Game type pending"}</strong>
            </div>
            {joinedSeats.length > 0 ? (
              <div className="tv-startup-player-list" aria-label="Players joined">
                {joinedSeats.map((seat) => (
                  <div key={seat.seatId} className="tv-startup-player-row">
                    <strong>{seat.displayName}</strong>
                    <span>{seat.seatId === patch.payload.setupHostSeatId ? "Host Phone" : "Player"}</span>
                    <span>Character {seat.characterSelected === false ? "..." : "yes"}</span>
                    <span>Mission {seat.startingMissionSelected ? "yes" : "-"}</span>
                    <span>Ready {seat.ready ? "yes" : "-"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tv-startup-empty">No phones joined yet.</p>
            )}
          </div>
        )}
        {(error || status === "closed") && <p className="tv-startup-error">{error ?? "Connection closed"}</p>}
      </section>
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
          <strong>{activeSeatId ?? "Standby"}</strong>
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
          <span>Salvage <strong>{shopEncounter.activePlayer.salvage}</strong></span>
          <span>Status <strong>{toTitleCase(shopEncounter.status)}</strong></span>
          <span>Stock <strong>{shopEncounter.revealedStock?.length ?? 0}</strong></span>
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
          <img src={activeTileAssetPath} alt="" aria-hidden="true" />
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
  scenarioOutcome: ReturnType<typeof buildScenarioOutcomeSummary>;
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
  const contractLookup = getContractLookup(patch);
  const occupiedSeats = (patch?.payload.seats ?? []).filter((seat) => Boolean(seat.displayName) && !seat.kicked);
  const isSetup = !patch || patch.payload.status === "lobby";
  const playersBySeatId = new Map((patch?.payload.players ?? []).map((player) => [player.seatId, player]));

  return (
    <section className="tv-card tv-sidebar-card tv-contracts-card" aria-label={isSetup ? "Setup Missions" : "Active Missions"}>
      <div className="tv-panel-title tv-panel-title-small">
        <span />
        <h2>{isSetup ? "Setup Missions" : "Active Missions"}</h2>
        <span />
      </div>
      <div className="tv-active-missions-list">
        {occupiedSeats.length > 0 ? (
          occupiedSeats.map((seat) => {
            const player = playersBySeatId.get(seat.seatId) ?? null;
            const activeContract = player?.character.activeContract ?? null;
            const contract = activeContract ? contractLookup.get(activeContract.contractId) ?? null : null;
            const progress = activeContract?.progress ?? 0;
            const target = contract ? getContractObjectiveTarget(contract) : 0;
            const isComplete = contract ? isContractObjectiveComplete(contract, progress) : false;

            return (
              <article
                key={seat.seatId}
                className={`tv-active-mission-row${isSetup || !contract ? " tv-active-mission-row-compact" : ""}${isComplete ? " tv-active-mission-row-complete" : ""}`}
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
                ) : contract && activeContract ? (
                  <>
                    <CardArtImage cardType="contract" cardId={contract.id} alt="" aria-hidden="true" />
                    <div className="tv-active-mission-copy">
                      <h3>{contract.name}</h3>
                      <p>{describeContractObjective(contract)}</p>
                      <div className="tv-active-mission-progress" aria-label={`${contract.name} progress ${progress}/${target}`}>
                        <span style={{ width: `${getProgressPercent(progress, target)}%` }} />
                      </div>
                      <div className="tv-active-mission-meta">
                        <span>{formatContractProgress(contract, progress)}</span>
                        <span>{isComplete ? "Complete" : "Active"}</span>
                        <span>{formatContractRewardSummary(contract)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="tv-active-mission-copy">
                    <h3>No active mission</h3>
                    <p>This operative has no selected active contract.</p>
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
  const scenarioOutcome = buildScenarioOutcomeSummary({
    status: publicPatch?.payload.status ?? null,
    winnerSeatId: publicPatch?.payload.winnerSeatId ?? null,
    activeSeatId,
    activeScenario: publicPatch?.payload.activeScenario ?? null,
    seatLabelById: Object.fromEntries((publicPatch?.payload.seats ?? []).map((seat) => [seat.seatId, seat.displayName ?? seat.seatId]))
  });

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
}

interface MovementArrivalModel {
  destination: PublicMoveDestination;
  playerName: string;
}

function getMovementArrivalModel(
  patch: PublicPatchPayload | null | undefined,
  previousPatch: PublicPatchPayload | null | undefined
): MovementArrivalModel | null {
  const planner = previousPatch?.movementPlanner?.active ? previousPatch.movementPlanner : null;

  if (!patch || !planner) {
    return null;
  }

  const previousSectorBySeat = new Map((previousPatch?.players ?? []).map((player) => [player.seatId, player.sectorId] as const));
  const movedPlayer = patch.players.find((player) => previousSectorBySeat.get(player.seatId) !== player.sectorId);
  const destination = movedPlayer ? planner.destinations.find((entry) => entry.sectorId === movedPlayer.sectorId) ?? null : null;

  return movedPlayer && destination ? { destination, playerName: movedPlayer.character.name } : null;
}

function MovementFocusHud({
  planner,
  selectedDestination,
  arrival,
  travelStep,
  activePlayerName
}: {
  planner: PublicMovementPlannerState | null;
  selectedDestination: PublicMoveDestination | null;
  arrival: MovementArrivalModel | null;
  travelStep?: number;
  activePlayerName: string;
}): ReactElement | null {
  if (!planner && !arrival) {
    return null;
  }

  const destination = arrival?.destination ?? selectedDestination;
  const route = destination?.route ?? [];
  const routeNames = destination?.routeNames ?? route;
  const stepTotal = Math.max(0, route.length - 1);
  const legalDestinationCount = planner?.destinations.filter((entry) => !entry.disabledReason).length ?? 0;
  const beat = arrival ? "moving" : selectedDestination ? "destination" : "roll";
  const playerName = arrival?.playerName ?? activePlayerName;
  const visibleStep = arrival ? Math.min(Math.max(travelStep ?? 1, 1), Math.max(stepTotal, 1)) : 0;
  const currentName = arrival
    ? routeNames[Math.max(0, visibleStep - 1)] ?? planner?.currentSectorName ?? "Previous tile"
    : planner?.currentSectorName ?? "Current tile";
  const nextName = arrival
    ? routeNames[Math.min(visibleStep, routeNames.length - 1)] ?? destination?.name ?? "Arrival tile"
    : routeNames[1] ?? destination?.name ?? "Choose on phone";

  if (arrival && destination) {
    const threats = destination.faceUpThreats ?? [];
    const occupants = destination.occupants ?? [];

    return (
      <section className="tv-arrival-focus" aria-label="Arrival sector brief" data-testid="tv-arrival-focus">
        <header>
          <span>Movement complete</span>
          <strong>Arrived at {destination.name}</strong>
          <p>{threats.length > 0 ? "Threat present" : destination.threatIcons.length > 0 ? "Challenge detected" : "Sector reached"}</p>
        </header>
        <div className="tv-arrival-focus-meta">
          <span>{toTitleCase(destination.ring)} Reach</span>
          {destination.tags.map((tag) => <span key={tag}>{toTitleCase(tag)}</span>)}
          {destination.threatIcons.map((icon, index) => <span key={`${icon}-${index}`}>{toTitleCase(icon)} challenge</span>)}
        </div>
        <div className="tv-arrival-focus-grid">
          <article>
            <span>Sector rule</span>
            <strong>{destination.ruleText || "No special sector rule."}</strong>
            {destination.loreText ? <p>{destination.loreText}</p> : null}
          </article>
          <article>
            <span>Challenges and threats</span>
            {threats.length > 0 ? (
              <ul>
                {threats.map((threat) => (
                  <li key={threat.instanceId}>
                    <strong>{threat.name}</strong>
                    <small>{threat.challenge ? `${toTitleCase(threat.challenge.stat)} ${threat.challenge.value}` : toTitleCase(threat.type)}</small>
                  </li>
                ))}
              </ul>
            ) : <strong>{destination.threatIcons.length > 0 ? "Printed challenge icons will resolve on arrival." : "No visible threat."}</strong>}
          </article>
          <article>
            <span>Occupants</span>
            <strong>{occupants.length > 0 ? occupants.map((occupant) => occupant.characterName).join(", ") : "No other operatives"}</strong>
            <p>{destination.strategicTags.length > 0 ? destination.strategicTags.map(toTitleCase).join(" ? ") : "Awaiting sector resolution"}</p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className={`tv-movement-focus tv-movement-focus-${beat}`} aria-label="Movement focus" data-testid="tv-movement-focus">
      <header className="tv-movement-focus-heading">
        <span>Movement resolving</span>
        <strong>{playerName}&apos;s command</strong>
        <p>{arrival ? `Travelling to ${destination?.name}.` : "Resolve the move on the active phone."}</p>
      </header>

      <aside className="tv-movement-focus-roll" data-testid="movement-roll-hud">
        <span>Roll result</span>
        <strong>Move {planner?.movementValue ?? destination?.distance ?? stepTotal}</strong>
        <dl>
          <div><dt>Roll total</dt><dd>{planner?.movementValue ?? destination?.distance ?? stepTotal}</dd></div>
          <div><dt>Modifier</dt><dd>—</dd></div>
          <div><dt>Legal</dt><dd>{legalDestinationCount}</dd></div>
        </dl>
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
  characterCatalog
}: TacticalMapPanelProps): ReactElement {
  const battleMode = isHostBattleActive(patch, battlePlayer);
  const shopMode = isHostShopActive(patch, activePlayer);
  const planner = patch?.payload.movementPlanner?.active ? patch.payload.movementPlanner : null;
  const arrival = getMovementArrivalModel(patch?.payload, previousPatch?.payload);
  const arrivalKey = arrival ? `${arrival.playerName}:${arrival.destination.sectorId}:${arrival.destination.route.join(">")}` : null;
  const [visualTravel, setVisualTravel] = useState<{ key: string; arrival: MovementArrivalModel; step: number } | null>(null);
  const completedTravelKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (arrival && arrivalKey && completedTravelKeyRef.current !== arrivalKey && !battleMode && !shopMode) {
      setVisualTravel((current) => current?.key === arrivalKey ? current : { key: arrivalKey, arrival, step: 1 });
    }
  }, [arrival, arrivalKey, battleMode, shopMode]);
  useEffect(() => {
    if (battleMode || shopMode) {
      setVisualTravel(null);
    }
  }, [battleMode, shopMode]);
  useEffect(() => {
    if (!visualTravel) return;
    const stepTotal = Math.max(1, visualTravel.arrival.destination.route.length - 1);
    const timeout = window.setTimeout(() => {
      setVisualTravel((current) => {
        if (!current || current.key !== visualTravel.key) return current;
        if (current.step < stepTotal) return { ...current, step: current.step + 1 };
        completedTravelKeyRef.current = current.key;
        return null;
      });
    }, 720);
    return () => window.clearTimeout(timeout);
  }, [visualTravel]);
  const focusBattleMode = battleMode;
  const focusShopMode = !focusBattleMode && shopMode;
  const movementFocusMode = !focusBattleMode && !focusShopMode && Boolean(planner || visualTravel);
  const projectedDestination = planner?.selectedDestinationId
    ? planner.destinations.find((destination) => destination.sectorId === planner.selectedDestinationId) ?? null
    : null;

  return (
    <section className={`tv-command-stage${focusBattleMode ? " tv-command-stage-battle-mode" : ""}${focusShopMode ? " tv-command-stage-shop-mode" : ""}${movementFocusMode ? " tv-command-stage-movement-focus" : ""}`}>
      {!focusBattleMode && (
        <div className="tv-command-map-shell">
          <TacticalMapBoard
            patch={patch?.payload ?? null}
            previousPatch={previousPatch?.payload ?? null}
            phase={patch?.phase ?? "start"}
          />
          {!movementFocusMode && <BoardLegend />}
        </div>
      )}
      {!focusBattleMode && <NemesisBanner nemesis={patch?.payload.nemesis ?? null} />}
      {!focusBattleMode && !focusShopMode && !movementFocusMode && (
        <ActiveOperativeOverlay
          patch={patch}
          previousPatch={previousPatch}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          characterCatalog={characterCatalog}
        />
      )}
      {focusBattleMode && <HostBattleOverlay patch={patch} activePlayer={battlePlayer} />}
      {focusShopMode && <HostShopOverlay patch={patch} activePlayer={activePlayer} />}
      {movementFocusMode && (
        <MovementFocusHud
          planner={planner}
          selectedDestination={projectedDestination}
          arrival={visualTravel?.arrival ?? null}
          travelStep={visualTravel?.step}
          activePlayerName={activePlayer?.character.name ?? "Active operative"}
        />
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
  const cardType = resolutionCard?.type ?? encounter?.cardType ?? (pendingEnemyRoll ? "enemy tactic" : "Deck standing by");
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
          <CardArtImage cardType="threat" cardId={cardId} alt="" aria-hidden="true" />
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
  const topScars = [...patch.payload.players].sort((left, right) => right.character.scars.length - left.character.scars.length)[0] ?? null;
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
          <span>Most scars carried</span>
          <strong>{topScars ? `${seatLabelById[topScars.seatId]} | ${topScars.character.scars.length}` : "None"}</strong>
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
  const audio = useAshenReachAudio(publicPatch);
  const effectiveRoomCode = roomCode ?? publicPatch?.sessionId ?? null;
  const joinedSeats = publicPatch?.payload.seats.filter((seat) => seat.displayName && !seat.kicked) ?? [];
  const readySeats = joinedSeats.filter((seat) => seat.ready);
  const startReadiness = getSessionStartReadiness({
    sessionMode: publicPatch?.payload.sessionMode ?? sessionMode,
    gameMode: publicPatch?.payload.gameMode ?? gameMode,
    seats: publicPatch?.payload.seats ?? []
  });
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
  const scenarioStatus = useMemo(() => getScenarioStatus(publicPatch), [publicPatch]);
  const battleMode = isHostBattleActive(publicPatch, battlePlayer);
  const shopMode = isHostShopActive(publicPatch, activePlayer);
  const movementArrival = getMovementArrivalModel(publicPatch?.payload, previousPatchRef.current?.payload);
  const movementFocusMode = !battleMode && !shopMode && Boolean(publicPatch?.payload.movementPlanner?.active || movementArrival);

  useEffect(() => {
    if (publicPatch) {
      previousPatchRef.current = publicPatch;
    }
  }, [publicPatch]);

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
        .then((summary) => {
          if (cancelled) {
            return;
          }

          setRoomCode(summary.roomCode);
          setHostToken(null);
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
      .then((summary) => {
        if (cancelled) {
          return;
        }

        if (!roomCode || !hostToken) {
          setRoomCode(summary.roomCode);
          setHostToken(null);
          setSessionMode(summary.sessionMode);
          setGameMode(summary.gameMode ?? "standard");
          setInteractionMode(summary.interactionMode);
          setPlayerCount(summary.playerCount ?? summary.seats?.length ?? 6);
          return;
        }

        if (summary.roomCode !== roomCode) {
          setRoomCode(summary.roomCode);
          setHostToken(null);
          setSessionNotice(null);
          setSessionMode(summary.sessionMode);
          setGameMode(summary.gameMode ?? "standard");
          setInteractionMode(summary.interactionMode);
          setPlayerCount(summary.playerCount ?? summary.seats?.length ?? 6);
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

    if (!targetRoomCode) {
      return;
    }

    setRequestError(null);

    try {
      await startSession(targetRoomCode);
    } catch (startFailure) {
      setRequestError(startFailure instanceof Error ? startFailure.message : "Could not start");
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
    shopMode
  });
  const isPreRoomLobby = !effectiveRoomCode && !publicPatch;

  const gameUiReady =
    publicPatch &&
    (publicPatch.payload.status === "active" || publicPatch.payload.status === "ended") &&
    publicPatch.payload.lobbyConfigured !== false;

  if (!gameUiReady) {
    return <TvStartupScreen roomCode={effectiveRoomCode} patch={publicPatch} status={status} error={requestError ?? error} />;
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
          liveStatus={liveStatus}
        />

        {(requestError || error) && <div className="tv-banner tv-banner-error">{requestError ?? error}</div>}
        {sessionNotice && <div className="tv-banner">{sessionNotice}</div>}
        <HostAudioControls audio={audio} />
        <EndgameOverlay patch={publicPatch} />

        <section
          className={`tv-command-main${isPreRoomLobby ? " tv-command-main--pre-room" : ""}${battleMode ? " tv-command-main--battle-focus" : ""}${shopMode ? " tv-command-main--shop-focus" : ""}${movementFocusMode ? " tv-command-main--movement-focus" : ""}`}
          data-testid="tv-command-main"
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
                canStartSession={startReadiness.canStart}
                startSessionReason={startReadiness.reason}
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
              />

              {!battleMode && !shopMode && !movementFocusMode && <RightSidebar
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
                seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 3)}
                activeSeatId={activeSeatId}
                status={status}
                debugOpen={debugOpen}
                onToggleDebug={() => setDebugOpen((current) => !current)}
                selectedScenario={selectedScenario}
                scenarioCatalog={scenarioCatalog}
                lobbyPath={lobbyPath}
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
                canStartSession={startReadiness.canStart}
                startSessionReason={startReadiness.reason}
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
    </main>
  );
}
