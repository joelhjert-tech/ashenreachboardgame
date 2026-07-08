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
const previousSessionEndedNotice = "Previous session ended. Create a new room to continue.";

const statLabelById = statShortLabelById;
type TvResolutionDisplayMode = "idle" | "cardReveal" | "battle" | "outcome";

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSessionModeLabel(sessionMode: SessionMode): string {
  return sessionMode === "single-player" ? "Single Player" : "Multiplayer";
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
      return `Reward: clear ${(reward as { amount?: number }).amount ?? 1} Heat`;
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

  if (interactionMode === "ruthless") {
    return "Ruthless";
  }

  return "Rivalry";
}

function getGameModeLabel(gameMode: GameMode | undefined): string {
  return gameMode === "nemesis_relay" ? "Nemesis Relay" : "Standard";
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
  phase: string;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode | null;
  scenarioStatus: ReturnType<typeof getScenarioStatus>;
  joinedCount: number;
  readyCount: number;
  seatCapacity: number;
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
  phase,
  sessionMode,
  gameMode,
  interactionMode,
  scenarioStatus,
  joinedCount,
  readyCount,
  seatCapacity
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

      <div className="tv-command-join-module">
        {roomCode ? (
          <JoinQrCard roomCode={roomCode} variant="compact" showJoinDetails={phase === "start"} />
        ) : (
          <div className="join-qr-card join-qr-card-compact join-qr-card-empty">
            <div>
              <h2>Scan to Join</h2>
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

function HostStateBanner(props: HostStateBannerProps): ReactElement {
  const model = getHostStateBannerModel(props);
  const movementPlanner = props.patch?.payload.movementPlanner?.active ? props.patch.payload.movementPlanner : null;

  return (
    <aside
      className={`host-state-banner host-state-banner-${model.tone}`}
      aria-label="Host game state"
      data-testid="host-state-banner"
      role="status"
    >
      <span className="host-state-banner-pulse" aria-hidden="true" />
      <div>
        <span>{model.label}</span>
        <strong>{model.detail}</strong>
      </div>
      {movementPlanner ? (
        <div className="host-state-banner-movement-dice">
          <DiceRollScene
            attackValue={movementPlanner.movementValue}
            defenseValue={null}
            modifierValue={0}
            attackDieFace={movementPlanner.movementValue}
            defenseDieFace={null}
            showModifierDie={false}
            compact
            challengeStat="signal"
            testId="movement-dice-animation"
            className="movement-dice-animation"
          />
        </div>
      ) : null}
      <em>{model.meta}</em>
    </aside>
  );
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
          const statusLabel = seat.kicked
            ? "Down"
            : isActive
              ? "Active"
              : isOpen
                ? "Open"
                : player?.character.status === "recalled"
                  ? "Down"
                  : seat.ready
                    ? "Ready"
                    : seat.startingMissionSelected
                      ? "Mission"
                    : seat.connected
                      ? "Joined"
                      : "Offline";
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
                      <span>H {player.character.heat ?? 0}</span>
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
        <span>Heat</span>
        <span>Trophies</span>
      </div>
    </aside>
  );
}

interface SessionReadoutProps {
  publicPatch: StatePatch<PublicPatchPayload> | null;
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
  onScenarioSelected: (scenarioId: string) => void;
  onGameModeSelected: (gameMode: GameMode) => void;
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
      : interactionMode === "ruthless"
        ? "Direct interference is live: duels, theft, and betrayal contracts are table legal."
        : interactionMode === "rivalry"
          ? "Race for personal glory with bounded rivalry, trades, aid, duels, and exposed-object steals."
          : "Choose a mission protocol before authorizing the multiplayer room.";

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
  gameMode,
  onSelect
}: {
  selectedMode: InteractionMode | null;
  gameMode: GameMode;
  onSelect: (interactionMode: InteractionMode) => void;
}): ReactElement {
  const relayLocked = gameMode === "nemesis_relay";
  const effectiveSelectedMode = relayLocked ? "co-op" : selectedMode;

  return (
    <section className="tv-mission-protocol" aria-label="Mission protocol">
      <div className="tv-mission-protocol-header">
        <span>Mission Protocol</span>
        <strong>{effectiveSelectedMode ? getInteractionModeLabel(effectiveSelectedMode) : "Select authorization"}</strong>
      </div>
      <div className="tv-mission-protocol-options">
        <button
          type="button"
          className="tv-mission-protocol-card"
          data-selected={effectiveSelectedMode === "co-op"}
          aria-pressed={effectiveSelectedMode === "co-op"}
          onClick={() => onSelect("co-op")}
        >
          <strong>Co-op</strong>
          <span>Players work together against the Ashenreach. Shared survival, shared victory conditions, and group-focused scenario pressure.</span>
        </button>
        <button
          type="button"
          className="tv-mission-protocol-card"
          data-selected={effectiveSelectedMode === "rivalry"}
          aria-pressed={effectiveSelectedMode === "rivalry"}
          disabled={relayLocked}
          onClick={() => onSelect("rivalry")}
        >
          <strong>Rivalry</strong>
          <span>Players compete for dominance. Operatives may race, block, outscore, or outlast each other depending on the scenario.</span>
        </button>
      </div>
      <p className="tv-mission-protocol-note">
        {relayLocked
          ? "Nemesis Relay is a co-op protocol and cannot launch as rivalry."
          : effectiveSelectedMode
            ? `${getInteractionModeLabel(effectiveSelectedMode)} protocol selected.`
            : "Start Game locked until one protocol is selected."}
      </p>
    </section>
  );
}

function SessionReadout({
  publicPatch,
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
  onScenarioSelected,
  onGameModeSelected,
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
                <span>Game Mode</span>
                <select
                  value={gameMode}
                  onChange={(event) => onGameModeSelected(event.target.value as GameMode)}
                >
                  <option value="standard">Standard | scenario race</option>
                  <option value="nemesis_relay">Nemesis Relay | co-op champion pressure</option>
                </select>
              </label>
              <label className="tv-session-scenario-picker">
                <span>Players</span>
                <select
                  value={playerCount}
                  onChange={(event) => onPlayerCountSelected(Number(event.target.value))}
                >
                  {Array.from({ length: gameMode === "nemesis_relay" ? 3 : 5 }, (_, index) => index + 2).map((count) => (
                    <option key={count} value={count}>
                      {count} players
                    </option>
                  ))}
                </select>
              </label>
              <MissionProtocolSelector
                selectedMode={interactionMode}
                gameMode={gameMode}
                onSelect={onInteractionModeSelected}
              />
              <FirstGamePanel interactionMode={interactionMode} />
            </>
          )}
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
                disabled={gameMode !== "nemesis_relay" && !interactionMode}
                onClick={() => void onCreateSession()}
              >
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
  onScenarioSelected: (scenarioId: string) => void;
  onGameModeSelected: (gameMode: GameMode) => void;
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
  onScenarioSelected,
  onGameModeSelected,
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
        onScenarioSelected={onScenarioSelected}
        onGameModeSelected={onGameModeSelected}
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

  return (
    <section className={`tv-command-stage${battleMode ? " tv-command-stage-battle-mode" : ""}${shopMode ? " tv-command-stage-shop-mode" : ""}`}>
      <div className="tv-command-map-shell">
        <TacticalMapBoard patch={patch?.payload ?? null} previousPatch={previousPatch?.payload ?? null} phase={patch?.phase ?? "start"} />
        <BoardLegend />
      </div>
      <NemesisBanner nemesis={patch?.payload.nemesis ?? null} />
      {!battleMode && !shopMode && (
        <ActiveOperativeOverlay
          patch={patch}
          previousPatch={previousPatch}
          activeSeat={activeSeat}
          activePlayer={activePlayer}
          characterCatalog={characterCatalog}
        />
      )}
      <HostBattleOverlay patch={patch} activePlayer={battlePlayer} />
      <HostShopOverlay patch={patch} activePlayer={activePlayer} />
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
  const [gameMode, setGameMode] = useState<GameMode>("standard");
  const [interactionMode, setInteractionMode] = useState<InteractionMode | null>(null);
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
      const selectedInteractionMode: InteractionMode | undefined =
        nextSessionMode === "single-player" || gameMode === "nemesis_relay"
          ? "co-op"
          : interactionMode ?? undefined;
      if (nextSessionMode !== "single-player" && !selectedInteractionMode) {
        setRequestError("Choose Co-op or Rivalry before creating a multiplayer room.");
        return;
      }
      const selectedPlayerCount = nextSessionMode === "single-player" ? 1 : Math.min(playerCount, gameMode === "nemesis_relay" ? 4 : 6);
      const session = await createSession(nextSessionMode, scenarioId, selectedInteractionMode, gameMode, selectedPlayerCount);
      setRoomCode(session.roomCode);
      setSessionMode(session.sessionMode);
      setGameMode(session.gameMode ?? "standard");
      setInteractionMode(session.interactionMode);
      setPlayerCount(session.playerCount);
      setSelectedScenarioId(session.scenarioId);
      setHostToken(session.hostToken);
      restoreValidatedRef.current = true;
    } catch (createFailure) {
      setRequestError(createFailure instanceof Error ? createFailure.message : "Could not create a room");
    }
  };

  const selectGameMode = (nextGameMode: GameMode) => {
    setGameMode(nextGameMode);

    if (nextGameMode === "nemesis_relay") {
      setPlayerCount((current) => Math.min(current, 4));
      setInteractionMode("co-op");
    }
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

  return (
    <main className="tv-dashboard tv-command-dashboard">
      <div className="tv-title-safe">
        <TopHeader
          roomCode={effectiveRoomCode}
          phase={publicPatch?.phase ?? "start"}
          sessionMode={liveSessionMode}
          gameMode={liveGameMode}
          interactionMode={liveInteractionMode}
          scenarioStatus={scenarioStatus}
          joinedCount={joinedSeats.length}
          readyCount={readySeats.length}
          seatCapacity={publicPatch?.payload.seats.length ?? (liveSessionMode === "single-player" ? 1 : 6)}
        />

        {(requestError || error) && <div className="tv-banner tv-banner-error">{requestError ?? error}</div>}
        {sessionNotice && <div className="tv-banner">{sessionNotice}</div>}
        <HostStateBanner
          patch={publicPatch}
          roomCode={roomCode}
          activePlayer={activePlayer}
          joinedCount={joinedSeats.length}
          readyCount={readySeats.length}
          battleMode={battleMode}
          shopMode={shopMode}
        />
        <HostAudioControls audio={audio} />
        <EndgameOverlay patch={publicPatch} />

        <section className="tv-command-main">
          <OperativesRail
            patch={publicPatch}
            characterCatalog={characterCatalog}
            activeSeatId={battleMode ? combatSeatId : activeSeatId}
            sessionMode={liveSessionMode}
            battleMode={battleMode}
          />

          <TacticalMapPanel
            patch={publicPatch}
            previousPatch={previousPatchRef.current}
            activeSeat={activeSeat}
            activePlayer={activePlayer}
            battlePlayer={battlePlayer}
            characterCatalog={characterCatalog}
          />

          <RightSidebar
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
            onScenarioSelected={setSelectedScenarioId}
            onGameModeSelected={selectGameMode}
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
          />
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
