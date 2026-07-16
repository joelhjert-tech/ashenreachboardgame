import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { describeContractObjective as describeObjective, formatContractProgress } from "../../game/contracts/objectives.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { getMissionTargetClue } from "../shared/missionRelevance.js";
import { formatSeatLabel, statLabelById, statOrder } from "../shared/statLabels.js";
import type {
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  Stat,
  NemesisChampionSummary,
  PhonePatchPayload,
  PhoneSelfState,
  PrivateRivalryPayload,
  ResultDelta
} from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { PhoneActionPanel, type TurnActionTab } from "./PhoneActionPanel.js";
import { getAfflictionEffectChips, getAfflictionStatusLabel } from "./afflictionPresentation.js";
import { formatSignedStatBonus, getPhoneStatBreakdown } from "./statBreakdown.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";

interface PortraitControllerViewProps {
  self: PhoneSelfState | null;
  roomCode: string;
  displayName: string;
  connectionStatus: string;
  activeSeatId: string | null;
  activeContractCard: ContractCard | null;
  patch: PhonePatchPayload | null;
  characters: CharacterCatalogEntry[];
  onIntent: ((intent: ClientIntent) => void) | null;
  onLeave: () => void;
  onLobbyBack?: () => void;
  onStartSession?: () => void;
}

type PortraitTab = "player" | "inventory" | "quests" | TurnActionTab;

const turnActionTabs: TurnActionTab[] = ["move", "battle", "shop", "action"];
const phoneChromeStorageKey = "ashenreach.phoneChromeVisible";

function PhoneScenarioArt({ path, title }: { path?: string | null; title: string }): ReactElement | null {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [path]);
  if (!path || failed) return null;
  return <img className="phone-scenario-summary-art" src={path} alt={`${title} scenario artwork`} onError={() => setFailed(true)} />;
}

const portraitTabLabels: Record<PortraitTab, string> = {
  player: "Player Card",
  inventory: "Inventory",
  quests: "Quest",
  move: "Move",
  battle: "Battle",
  shop: "Shop",
  action: "Action"
};

function isTurnActionTab(tab: PortraitTab): tab is TurnActionTab {
  return turnActionTabs.includes(tab as TurnActionTab);
}

function readStoredPhoneChromeVisible(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const stored = window.localStorage.getItem(phoneChromeStorageKey);
    return stored === null ? true : stored !== "false" && stored !== "0";
  } catch {
    return true;
  }
}

function writeStoredPhoneChromeVisible(visible: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(phoneChromeStorageKey, visible ? "true" : "false");
  } catch {
    // Local storage can be unavailable in private browser contexts.
  }
}

function getCompactStatSummary(self: PhoneSelfState, stat: Stat): string {
  const breakdown = getPhoneStatBreakdown(self, stat);
  const modifierTotal = breakdown.permanent + breakdown.gearFollower;
  const statusTotal = breakdown.scarAfflictionSources
    .filter((source) => source.scope === "test")
    .reduce((sum, source) => sum + source.value, 0);
  const additions = modifierTotal !== 0
    ? [`Bonus ${formatSignedStatBonus(modifierTotal)}`]
    : [];
  const status = statusTotal !== 0 ? [`Status ${formatSignedStatBonus(statusTotal)}`] : [];

  return [`Base ${breakdown.base}`, ...additions, ...status].join(" ");
}

function PortraitStatCard({
  self,
  stat,
  expanded,
  onToggle
}: {
  self: PhoneSelfState;
  stat: Stat;
  expanded: boolean;
  onToggle: () => void;
}): ReactElement {
  const breakdown = getPhoneStatBreakdown(self, stat);
  const label = statLabelById[stat];
  const displayLabel = label.toUpperCase();
  const modifierTotal = breakdown.permanent + breakdown.gearFollower;

  return (
    <button
      type="button"
      className={`phone-stat-card phone-stat-card-${stat}${expanded ? " phone-stat-card-expanded" : ""}`}
      style={getChallengeThemeStyle(stat) as CSSProperties}
      data-stat={stat}
      aria-expanded={expanded}
      aria-label={`${label} stat ${breakdown.final}${expanded ? ", details expanded" : ""}`}
      onClick={onToggle}
    >
      <span className="phone-stat-card-heading">
        <span className="phone-stat-card-label">{displayLabel}</span>
        {" "}
        <span className="phone-stat-card-numbers">
          <strong className="phone-stat-card-value">{breakdown.final}</strong>
          {modifierTotal !== 0 ? (
            <>
              {" "}
              <em className="phone-stat-card-modifier">{formatSignedStatBonus(modifierTotal)}</em>
            </>
          ) : null}
        </span>
      </span>
      {" "}
      <span className="phone-stat-card-summary">{getCompactStatSummary(self, stat)}</span>
      {expanded && (
        <dl className="phone-stat-card-details" aria-label={`${label} stat details`}>
          <div>
            <dt>Base</dt>
            <dd>{breakdown.base}</dd>
          </div>
          <div>
            <dt>Permanent</dt>
            <dd>{formatSignedStatBonus(breakdown.permanent)}</dd>
          </div>
          <div>
            <dt>Gear/Follower</dt>
            <dd>
              {formatSignedStatBonus(breakdown.gearFollower)}
              {breakdown.gearFollowerSources.length > 0 ? (
                <small className="phone-stat-card-source-list">
                  {breakdown.gearFollowerSources.map((source) => (
                    <span key={`${source.sourceType}-${source.label}`}>
                      {source.label} {formatSignedStatBonus(source.value)}
                    </span>
                  ))}
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Temporary</dt>
            <dd>+0</dd>
          </div>
          {breakdown.scarAfflictionSources.length > 0 && (
            <div>
              <dt>Scars/Afflictions</dt>
              <dd>
                <small className="phone-stat-card-source-list">
                  {breakdown.scarAfflictionSources.map((source) => (
                    <span key={`${source.scope}-${source.label}`}>
                      {source.label} {source.scope} {formatSignedStatBonus(source.value)}
                    </span>
                  ))}
                </small>
              </dd>
            </div>
          )}
          <div>
            <dt>Final</dt>
            <dd>{breakdown.final}</dd>
          </div>
        </dl>
      )}
    </button>
  );
}

function getActionTabState(
  tab: TurnActionTab,
  patch: PhonePatchPayload | null
): { disabled: boolean; locked?: boolean } {
  if (!patch?.self) {
    return { disabled: true };
  }

  const isActiveSeat = patch.turnOrder[patch.activeSeatIndex] === patch.self.seatId;
  const shopLocked = Boolean(
    patch.shopEncounter &&
      (patch.shopEncounter.status === "locked" || patch.shopEncounter.blockingThreats.length > 0)
  );

  switch (tab) {
    case "move":
      return {
        disabled: false,
        locked: !(
          (patch.movementPlanner?.active && patch.movementPlanner.destinations.length > 0) ||
          (isActiveSeat && patch.phase === "navigation")
        )
      };
    case "battle":
      return {
        disabled: false,
        locked: !(patch.activeResolution || patch.pendingEnemyRoll || patch.encounter)
      };
    case "shop":
      return {
        disabled: false,
        locked: !patch.shopEncounter || shopLocked
      };
    case "action":
      return {
        disabled: false
      };
  }
}

function scenarioQuestDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const scenarioTypes = new Set<ResultDelta["type"]>([
    "scenarioProgress",
    "scenarioPressure",
    "contractProgress",
    "contractCompleted"
  ]);

  return (deltas ?? []).filter((delta) => scenarioTypes.has(delta.type));
}

function describeContractObjective(contract: ContractCard): string {
  if (contract.objective.type === "defeatCount") {
    return `Defeat ${contract.objective.target} threat${contract.objective.target === 1 ? "" : "s"}.`;
  }
  if (contract.objective.type === "spaceTextResolved") return contract.objective.label;
  return describeObjective(contract);
}

function describeContractProgress(contract: ContractCard): string {
  if (contract.objective.type === "defeatCount") {
    return `Progress 0/${contract.objective.target} defeated`;
  }
  if (contract.objective.type === "spaceTextResolved") return `Progress 0/${contract.objective.target} resolved`;
  return `Progress ${formatContractProgress(contract, 0)}`;
}

function describeActiveContractProgress(contract: ContractCard, progress: number): string {
  if (contract.objective.type === "defeatCount") {
    return `Progress ${progress}/${contract.objective.target} defeated`;
  }
  if (contract.objective.type === "spaceTextResolved") return `Progress ${progress}/${contract.objective.target} resolved`;
  return `Progress ${formatContractProgress(contract, progress)}`;
}

function describeContractReward(contract: ContractCard): string {
  const reward = contract.reward;

  if (!reward || typeof reward !== "object") {
    return "Reward listed on contract.";
  }

  if ("type" in reward && typeof reward.type === "string") {
    return reward.type
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "Contract reward.";
}

function ContractMissionCard({
  contract,
  recommended,
  selected,
  disabled,
  onSelect
}: {
  contract: ContractCard;
  recommended?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}): ReactElement {
  return (
    <article className="phone-starting-mission-card" data-selected={selected ? "true" : "false"}>
      <PhoneInspectableCardArt
        cardType="contract"
        cardId={contract.id}
        title={contract.name}
        lore={contract.text}
        rules={`${describeContractObjective(contract)} ${describeContractProgress(contract)}`}
        className="phone-starting-mission-art"
        testId="phone-starting-mission-art"
      />
      <div className="phone-starting-mission-card-top">
        <span>{recommended ? "Recommended Mission" : contract.factionGiver}</span>
        <strong>{contract.name}</strong>
      </div>
      <p>{contract.text}</p>
      <dl className="phone-starting-mission-details">
        <div>
          <dt>Objective</dt>
          <dd>{describeContractObjective(contract)}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{describeContractProgress(contract)}</dd>
        </div>
        <div>
          <dt>Reward</dt>
          <dd>{describeContractReward(contract)}</dd>
        </div>
      </dl>
      <div className="phone-starting-mission-footer">
        <span>{contract.objective.type === "defeatCount" ? "Threat lane" : "Sector action"}</span>
        {onSelect ? (
          <button type="button" className="phone-button phone-button-primary" disabled={disabled} onClick={onSelect}>
            {selected ? "Selected" : "Select Mission"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ActiveMissionQuestCard({
  activeContract,
  contract
}: {
  activeContract: PhoneSelfState["character"]["activeContract"];
  contract: ContractCard | null;
}): ReactElement {
  if (!activeContract) {
    return (
      <article className="phone-portrait-info-card phone-active-mission-card" data-testid="phone-active-mission-card">
        <span>Active Mission</span>
        <strong>No active mission</strong>
        <p>Choose or accept a mission to track your personal objective here.</p>
      </article>
    );
  }

  if (!contract) {
    return (
      <article className="phone-portrait-info-card phone-active-mission-card" data-testid="phone-active-mission-card">
        <span>Active Mission</span>
        <strong>Mission syncing</strong>
        <p>Mission {activeContract.contractId} is active. Progress {activeContract.progress}.</p>
      </article>
    );
  }

  const targetClue = getMissionTargetClue(contract);

  return (
    <article className="phone-portrait-info-card phone-active-mission-card" data-testid="phone-active-mission-card">
      <PhoneInspectableCardArt
        cardType="contract"
        cardId={contract.id}
        title={contract.name}
        lore={contract.text}
        rules={describeContractObjective(contract)}
        className="phone-active-mission-art"
        testId="phone-active-mission-art"
      />
      <div className="phone-active-mission-topline">
        <span>Active Mission</span>
        <span>{contract.factionGiver}</span>
      </div>
      <strong>{contract.name}</strong>
      <p>{contract.text}</p>
      {targetClue ? (
        <p className="phone-active-mission-target" data-testid="phone-active-mission-target">
          {targetClue}
        </p>
      ) : null}
      <dl className="phone-active-mission-details">
        <div>
          <dt>Objective</dt>
          <dd>{describeContractObjective(contract)}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{describeActiveContractProgress(contract, activeContract.progress)}</dd>
        </div>
        <div>
          <dt>Reward</dt>
          <dd>{describeContractReward(contract)}</dd>
        </div>
      </dl>
      <div className="phone-portrait-chip-row phone-active-mission-chip-row">
        <span>{contract.objective.type === "defeatCount" ? "Threat lane" : "Sector action"}</span>
        <span>Personal</span>
      </div>
    </article>
  );
}

function BoundNemesisPanel({
  heading = "Bound Nemesis",
  nemesis,
  self,
  crownKeyFragments,
  assistSeatIds,
  onIntent
}: {
  heading?: string;
  nemesis: NemesisChampionSummary | null | undefined;
  self: PhoneSelfState;
  crownKeyFragments: number;
  assistSeatIds: string[];
  onIntent: ((intent: ClientIntent) => void) | null;
}): ReactElement | null {
  if (!nemesis) {
    return null;
  }

  const sameSpace = self.character.currentSpaceId === nemesis.sectorId;
  const healthLabel = nemesis.defeated ? "Defeated" : `${nemesis.health}/${nemesis.maxHealth} health`;
  const keyLabel =
    nemesis.boundPlayerId === self.seatId && crownKeyFragments > 0 ? "Crown-Key held" : `${nemesis.distanceToNexus} to Nexus`;

  return (
    <section className="phone-portrait-section phone-bound-nemesis-panel" aria-label="Bound Nemesis">
      <div className="phone-sheet-section-heading">{heading}</div>
      <article className={`phone-portrait-info-card phone-bound-nemesis-card${nemesis.warning ? " phone-bound-nemesis-warning" : ""}`}>
        <div className="phone-bound-nemesis-top">
          <div>
            <strong>{nemesis.name}</strong>
            <span>{nemesis.type} | {healthLabel}</span>
          </div>
          <span>{keyLabel}</span>
        </div>
        <p>{nemesis.sectorName}</p>
        <div className="phone-portrait-chip-row">
          <span>Str {nemesis.strength}</span>
          {nemesis.tech ? <span>Tech {nemesis.tech}</span> : null}
          {nemesis.will ? <span>Will {nemesis.will}</span> : null}
          {nemesis.boundPlayerId !== self.seatId ? <span>Bound to {formatSeatLabel(nemesis.boundPlayerId)}</span> : null}
          <span>{nemesis.defeated ? "Key claimed" : sameSpace ? "Engage now" : "Pursue"}</span>
        </div>
        {sameSpace && !nemesis.defeated && onIntent ? (
          <button
            type="button"
            className="phone-button phone-button-primary"
            onClick={() =>
              onIntent({
                type: "NEMESIS_COMBAT_REQUESTED",
                seatId: self.seatId,
                nemesisId: nemesis.id,
                stat: nemesis.combatProfile === "tech" ? "forge" : nemesis.combatProfile === "will" ? "signal" : "grit",
                assistSeatIds
              })
            }
          >
            Fight Nemesis
          </button>
        ) : null}
      </article>
    </section>
  );
}

function RivalryQuestPanel({
  rivalry,
  seatId,
  onIntent
}: {
  rivalry: PrivateRivalryPayload;
  seatId: string;
  onIntent: ((intent: ClientIntent) => void) | null;
}): ReactElement {
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const modeLabel = rivalry.mode === "ruthless" ? "Ruthless" : "Rivalry";
  const progressLabel = `${rivalry.objective.progress}/${rivalry.objective.target}`;
  const canReveal = rivalry.reveal.available && rivalry.reveal.state === "revealAvailable" && Boolean(onIntent);

  return (
    <section className="phone-portrait-section phone-rivalry-quest-panel" aria-label="Private rivalry agenda">
      <div className="phone-sheet-section-heading">Rivalry Agenda</div>
      <article className="phone-portrait-info-card phone-rivalry-quest-card">
        <div className="phone-rivalry-quest-topline">
          <span>{modeLabel}</span>
          <span>{rivalry.secrecy}</span>
        </div>
        <strong>{rivalry.objective.title}</strong>
        <p>{rivalry.objective.summary}</p>
        <div className="phone-rivalry-progress" aria-label={`${rivalry.objective.progressLabel} ${progressLabel}`}>
          <span>{rivalry.objective.progressLabel}</span>
          <strong>{progressLabel}</strong>
        </div>
        {rivalry.scoring?.completionSummary ? (
          <div className="phone-rivalry-completion" aria-label="Rivalry agenda completion">
            <span>{rivalry.revealState === "failed" ? "Failed" : "Completed"}</span>
            <strong>{rivalry.scoring.pointsAwarded > 0 ? `${rivalry.scoring.pointsAwarded} rivalry point` : "No points awarded"}</strong>
            <p>{rivalry.scoring.completionSummary}</p>
          </div>
        ) : null}
        <p className="phone-rivalry-stakes">{rivalry.objective.stakes}</p>
        <div className="phone-portrait-chip-row phone-rivalry-chip-row">
          <span>{rivalry.reveal.label}</span>
          <span>{rivalry.reveal.hint}</span>
        </div>
        {canReveal ? (
          confirmingReveal ? (
            <div className="phone-rivalry-reveal-confirm" role="region" aria-label="Reveal agenda confirmation">
              <p>Reveal this agenda? This may become visible to the table.</p>
              <div className="phone-rivalry-reveal-actions">
                <button type="button" className="phone-button phone-button-secondary" onClick={() => setConfirmingReveal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="phone-button phone-button-primary"
                  onClick={() => {
                    setConfirmingReveal(false);
                    onIntent?.({ type: "RIVALRY_AGENDA_REVEAL_REQUESTED", seatId });
                  }}
                >
                  Confirm Reveal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="phone-button phone-button-primary phone-rivalry-reveal-button"
              onClick={() => setConfirmingReveal(true)}
            >
              Reveal Agenda
            </button>
          )
        ) : rivalry.reveal.lockedReason && rivalry.reveal.state !== "revealed" ? (
          <p className="phone-rivalry-locked-reason">{rivalry.reveal.lockedReason}</p>
        ) : null}
        {rivalry.recentPrivateNotes.length > 0 ? (
          <div className="phone-rivalry-notes">
            <span>Private notes</span>
            {rivalry.recentPrivateNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
        <small>{rivalry.tableWarning}</small>
      </article>
    </section>
  );
}

export function PortraitControllerView({
  self,
  roomCode,
  displayName,
  connectionStatus,
  activeSeatId,
  activeContractCard,
  patch,
  characters,
  onIntent,
  onLeave,
  onLobbyBack,
  onStartSession
}: PortraitControllerViewProps): ReactElement {
  const [activeTab, setActiveTab] = useState<PortraitTab>("player");
  const [phoneChromeVisible, setPhoneChromeVisible] = useState(readStoredPhoneChromeVisible);
  const [bottomDockExpanded, setBottomDockExpanded] = useState(false);
  const [expandedStat, setExpandedStat] = useState<Stat | null>(null);
  const phoneChromeHidden = !phoneChromeVisible;

  useEffect(() => {
    writeStoredPhoneChromeVisible(phoneChromeVisible);
  }, [phoneChromeVisible]);

  useEffect(() => {
    if (phoneChromeVisible || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhoneChromeVisible(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phoneChromeVisible]);

  const hidePhoneChrome = () => {
    setPhoneChromeVisible(false);
  };

  const showPhoneChrome = () => {
    setPhoneChromeVisible(true);
  };

  const showBottomDock = () => {
    setBottomDockExpanded(true);
  };

  const hideBottomDock = () => {
    setBottomDockExpanded(false);
  };

  const handleLeave = () => {
    writeStoredPhoneChromeVisible(true);
    setPhoneChromeVisible(true);
    onLeave();
  };

  if (!self) {
    return (
      <section className="phone-portrait-controller phone-portrait-controller-empty">
        <div className="phone-portrait-panel">
          <p className="phone-panel-kicker">Ashen Reach Controller</p>
          <h1>Connecting...</h1>
          <p className="phone-muted-copy">Syncing the latest character state for your seat.</p>
        </div>
      </section>
    );
  }

  const activeScenario = patch?.activeScenario ?? null;
  const scenarioPressure = patch?.scenarioPressure ?? null;
  const scenarioDeltas = scenarioQuestDeltas(patch?.playerResultDeltas ?? patch?.publicResultDeltas);
  const ownSeat = patch?.seats.find((seat) => seat.seatId === self.seatId) ?? null;
  const isLobbyWaiting = patch?.status === "lobby" || (!patch && Boolean(onLobbyBack));
  const localUnboundNemeses = (patch?.nemesisChampions ?? []).filter(
    (nemesis) => nemesis.boundPlayerId !== self.seatId && nemesis.sectorId === self.character.currentSpaceId && !nemesis.defeated
  );

  if (isLobbyWaiting) {
    const isReady = ownSeat?.ready ?? false;
    const abilityText = self.character.abilities.map((ability) => `${ability.name}: ${ability.text}`);
    const startingGear = self.character.heldGear;
    const startingContractOptions = patch?.startingContractOptions ?? [];
    const selectedStartingContract = patch?.selectedStartingContract ?? null;
    const canReady = Boolean(patch?.canReady && selectedStartingContract && onIntent && !isReady);
    const joinedSeats = patch?.seats.filter((seat) => seat.displayName && !seat.kicked) ?? [];
    const canHostStart = Boolean(
      onStartSession &&
        patch?.selfIsSetupHost &&
        patch.lobbyConfigured &&
        joinedSeats.length > 0 &&
        joinedSeats.every((seat) => seat.characterSelected !== false && seat.startingMissionSelected && seat.ready)
    );
    const readyDisabledReason =
      patch?.readyDisabledReason ??
      (selectedStartingContract ? "Waiting for room sync" : "Choose a starting mission before Ready");

    return (
      <section className="phone-portrait-controller">
        <div className="phone-portrait-panel phone-portrait-lobby-panel">
          <main className="phone-portrait-scroll phone-lobby-waiting-scroll" aria-label="Character waiting">
            <section className="phone-lobby-ready-panel phone-character-waiting-panel">
              <div className="phone-character-waiting-topline">
                <span>{roomCode}</span>
                <span>{displayName}</span>
                <span>{connectionStatus}</span>
              </div>

              <div className="phone-character-waiting-hero">
                <img src={getCharacterPortraitPath(self.character.id)} alt="" />
                <div>
                  <p className="phone-panel-kicker">Character locked</p>
                  <strong>{self.character.name}</strong>
                  <span>{self.character.archetype}</span>
                  <small>{isReady ? "You are ready. Watch the TV." : selectedStartingContract ? "Mission selected" : "Choose starting mission"}</small>
                </div>
              </div>

              <div className="phone-portrait-attributes" aria-label="Character stats">
                {statOrder.map((stat) => (
                  <PortraitStatCard
                    key={stat}
                    self={self}
                    stat={stat}
                    expanded={expandedStat === stat}
                    onToggle={() => setExpandedStat((current) => (current === stat ? null : stat))}
                  />
                ))}
              </div>

              <section className="phone-character-waiting-section phone-starting-mission-section" aria-label="Starting Mission">
                <h3>{selectedStartingContract ? "Selected Starting Mission" : "Choose Starting Mission"}</h3>
                {selectedStartingContract ? (
                  <ContractMissionCard contract={selectedStartingContract} selected />
                ) : startingContractOptions.length > 0 ? (
                  <div className="phone-starting-mission-list">
                    {startingContractOptions.map((contract, index) => (
                      <ContractMissionCard
                        key={contract.id}
                        contract={contract}
                        recommended={index === 0}
                        disabled={!onIntent}
                        onSelect={() =>
                          onIntent?.({
                            type: "SELECT_STARTING_CONTRACT",
                            seatId: self.seatId,
                            contractId: contract.id
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="phone-muted-copy">Waiting for starting mission options from the room.</p>
                )}
              </section>

              <p className="phone-lobby-ready-state">
                {isReady
                  ? "You are ready. Watch the TV."
                  : selectedStartingContract
                    ? "Mission locked. Press Ready when set."
                    : readyDisabledReason}
              </p>

              <div className="phone-character-waiting-actions">
                <button
                  type="button"
                  className="phone-button phone-button-primary phone-lobby-ready-button"
                  disabled={!canReady}
                  onClick={() => onIntent?.({ type: "SET_READY", seatId: self.seatId, ready: true })}
                >
                  Ready
                </button>
                {onLobbyBack ? (
                  <button type="button" className="phone-button phone-button-secondary phone-lobby-ready-button" onClick={onLobbyBack}>
                    Back
                  </button>
                ) : null}
                {patch?.selfIsSetupHost ? (
                  <button
                    type="button"
                    className="phone-button phone-button-primary phone-lobby-ready-button"
                    disabled={!canHostStart}
                    onClick={onStartSession}
                  >
                    Start Game
                  </button>
                ) : null}
              </div>
              {patch?.selfIsSetupHost ? (
                <p className="phone-lobby-ready-state">
                  {canHostStart ? "All joined players are ready. Start from this Host Phone." : "Host start unlocks when joined players have character, mission, and Ready."}
                </p>
              ) : null}
              {onIntent ? (
                <span className="phone-character-waiting-status">
                  {isReady
                    ? "Ready for host"
                    : selectedStartingContract
                      ? "Character and mission reserved."
                      : "Character reserved. Choose a starting mission."}
                </span>
              ) : (
                <span className="phone-character-waiting-status">Waiting for room sync</span>
              )}

              <section className="phone-character-waiting-section">
                <h3>Special Abilities</h3>
                {abilityText.length > 0 ? (
                  abilityText.map((ability) => <p key={ability}>{ability}</p>)
                ) : (
                  <p>No special ability text is recorded for this character.</p>
                )}
              </section>

              <section className="phone-character-waiting-section">
                <h3>Starting Equipment</h3>
                {startingGear.length > 0 ? (
                  <div className="phone-character-waiting-gear">
                    {startingGear.map((item) => (
                      <span key={item.id}>{item.name}</span>
                    ))}
                  </div>
                ) : (
                  <p>No starting equipment.</p>
                )}
              </section>
            </section>
          </main>
        </div>
      </section>
    );
  }

  const rootClassName = [
    "phone-portrait-controller",
    phoneChromeVisible ? "phone-shell--chrome-visible" : "phone-shell--immersive",
    bottomDockExpanded ? "phone-shell--bottomdock-expanded" : "phone-shell--bottomdock-compact"
  ]
    .filter(Boolean)
    .join(" ");
  const topbarClassName = ["phone-portrait-header", "phone-topbar", phoneChromeHidden ? "phone-topbar--compact" : ""]
    .filter(Boolean)
    .join(" ");
  const bottomNavClassName = [
    "phone-portrait-bottom-nav",
    "phone-bottomnav",
    bottomDockExpanded ? "phone-bottomdock--expanded" : "phone-bottomdock--compact"
  ]
    .filter(Boolean)
    .join(" ");
  const contentClassName = [
    "phone-portrait-scroll",
    phoneChromeHidden ? "phone-content--expanded" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const scarCount = self.character.scars.length;
  const compactStatusDetail = `${scarCount} scar${scarCount === 1 ? "" : "s"}`;
  const scarCards = self.character.scarCards ?? [];
  const afflictions = self.character.afflictions ?? { faceup: [], facedownCount: 0 };
  const pendingTestModifiers = patch?.pendingTestModifiers ?? [];

  return (
    <section
      className={rootClassName}
      data-phone-chrome-visible={phoneChromeVisible ? "true" : "false"}
      data-phone-bottom-dock-expanded={bottomDockExpanded ? "true" : "false"}
    >
      <div className="phone-portrait-panel">
        <header className={topbarClassName}>
          {phoneChromeVisible ? (
            <>
              <div className="phone-portrait-header-art">
                <img src={getCharacterPortraitPath(self.character.id)} alt="" />
              </div>
              <div className="phone-portrait-header-copy">
                <span>{formatSeatLabel(self.seatId)}</span>
                <h1>{self.character.name}</h1>
                <p>{self.character.archetype}</p>
              </div>
              <div className="phone-portrait-header-vitals" aria-label="Character vitals">
                <span>Health</span>
                <strong>{self.character.wounds} wounds</strong>
                <small>{self.character.salvage ?? 0} Salvage · {scarCount} scar{scarCount === 1 ? "" : "s"}</small>
              </div>
              <div className="phone-portrait-header-actions">
                <button
                  type="button"
                  className="phone-button phone-button-secondary phone-chrome-toggle"
                  onClick={hidePhoneChrome}
                >
                  Hide UI
                </button>
                <button type="button" className="phone-button phone-button-secondary phone-portrait-leave-button" onClick={handleLeave}>
                  Leave
                </button>
              </div>
            </>
          ) : (
            <div className="phone-compact-status-strip" aria-label="Compact player status">
              <strong>{self.character.name}</strong>
              <span>
                {self.character.wounds} wounds | {self.character.salvage ?? 0} Salvage | {compactStatusDetail}
              </span>
            </div>
          )}
        </header>

        <main className={contentClassName} aria-label="Phone content">
          {activeTab === "player" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-hero-card">
                <div className="phone-portrait-art">
                  <img src={getCharacterPortraitPath(self.character.id)} alt={self.character.name} />
                </div>
                <div className="phone-portrait-hero-copy">
                  <p className="phone-panel-kicker">{activeSeatId === self.seatId ? "Active turn" : "Standby"}</p>
                  <h2>{self.character.name}</h2>
                  <p>{self.character.archetype}</p>
                  <div className="phone-portrait-chip-row">
                    <span>{roomCode}</span>
                    <span>{displayName}</span>
                    <span>{connectionStatus}</span>
                    <span>{self.character.status}</span>
                  </div>
                </div>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Stats</div>
                <div className="phone-portrait-attributes" aria-label="Character stats">
                  {statOrder.map((stat) => (
                    <PortraitStatCard
                      key={stat}
                      self={self}
                      stat={stat}
                      expanded={expandedStat === stat}
                      onToggle={() => setExpandedStat((current) => (current === stat ? null : stat))}
                    />
                  ))}
                </div>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Vitals</div>
                <div className="phone-portrait-vitals" aria-label="Character vitals">
                  <span>Wounds {self.character.wounds}</span>
                  <span>Salvage {self.character.salvage ?? 0}</span>
                  <span>Scars {scarCount}</span>
                  <span>Gear {self.character.heldGear.length}</span>
                  <span>Status {self.character.status}</span>
                </div>
              </section>

              {(pendingTestModifiers.length > 0 || scarCards.length > 0 || afflictions.faceup.length > 0 || afflictions.facedownCount > 0) && (
                <section className="phone-portrait-section" data-testid="phone-portrait-status-effects">
                  <div className="phone-sheet-section-heading">Status effects</div>
                  <div className="phone-status-effect-list">
                    {pendingTestModifiers.map((modifier) => (
                      <article key={modifier.sourceCardId} className="phone-portrait-info-card phone-status-effect-card">
                        <div className="phone-status-effect-severity">-1</div>
                        <div className="phone-status-effect-copy">
                          <span>{modifier.type === "nextNormalMovementRoll" ? "Temporary | Until next normal movement roll" : "Temporary | Until next eligible test"}</span>
                          <strong>{modifier.label}</strong>
                          <p>{modifier.summary}</p>
                          <small>{modifier.detail ?? "No battle or movement effect"}</small>
                        </div>
                      </article>
                    ))}
                    {scarCards.map((scar) => (
                      <article key={scar.id} className="phone-portrait-info-card phone-status-effect-card phone-status-effect-card-scar">
                        <CardArtImage
                          cardType="scar"
                          cardId={scar.id}
                          alt=""
                          aria-hidden="true"
                          className="phone-status-effect-art"
                        />
                        <div className="phone-status-effect-copy">
                          <span>Scar | Persistent</span>
                          <strong>{scar.title}</strong>
                          <p>{scar.text}</p>
                          <small>{scar.trigger}: {scar.penalty}</small>
                        </div>
                      </article>
                    ))}
                    {afflictions.faceup.map((affliction) => {
                      const effectChips = getAfflictionEffectChips(affliction);

                      return (
                        <article key={affliction.id} className="phone-portrait-info-card phone-status-effect-card phone-status-effect-card-affliction">
                          <div className="phone-status-effect-severity">S{affliction.severity}</div>
                          <div className="phone-status-effect-copy">
                            <span>Affliction | {getAfflictionStatusLabel(affliction)}</span>
                            <strong>{affliction.name}</strong>
                            <p>{affliction.rulesText}</p>
                            <small>{affliction.trigger}</small>
                            {effectChips.length > 0 && (
                              <div className="phone-portrait-chip-row phone-status-effect-chip-row">
                                {effectChips.map((chip) => (
                                  <span key={chip}>{chip}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {afflictions.facedownCount > 0 && (
                      <article className="phone-portrait-info-card phone-status-effect-card phone-status-effect-card-facedown">
                        <div className="phone-status-effect-severity">{afflictions.facedownCount}</div>
                        <div className="phone-status-effect-copy">
                          <span>Affliction | Facedown</span>
                          <strong>Resolved Afflictions</strong>
                          <p>Resolved corruption remains in your Affliction area.</p>
                        </div>
                      </article>
                    )}
                  </div>
                </section>
              )}

              {patch?.gameMode === "nemesis_relay" && (
                <>
                  <BoundNemesisPanel
                    nemesis={patch.boundNemesis}
                    self={self}
                    crownKeyFragments={patch.crownKeyFragments ?? 0}
                    assistSeatIds={patch.eligibleNemesisAssistSeatIds ?? []}
                    onIntent={onIntent}
                  />
                  {localUnboundNemeses.map((nemesis) => (
                    <BoundNemesisPanel
                      key={nemesis.id}
                      heading="Nemesis on your space"
                      nemesis={nemesis}
                      self={self}
                      crownKeyFragments={patch.crownKeyFragments ?? 0}
                      assistSeatIds={patch.eligibleNemesisAssistSeatIds ?? []}
                      onIntent={onIntent}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Inventory</div>
                {patch && onIntent ? (
                  <PhoneInventoryPanel patch={patch} onIntent={onIntent} />
                ) : (
                  <p className="phone-muted-copy">Inventory appears when the room syncs.</p>
                )}
              </section>
            </div>
          )}

          {activeTab === "quests" && (
            <div className="phone-portrait-screen">
              {patch?.privateRivalry ? <RivalryQuestPanel rivalry={patch.privateRivalry} seatId={self.seatId} onIntent={onIntent} /> : null}
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Active Mission</div>
                <ActiveMissionQuestCard activeContract={self.character.activeContract} contract={activeContractCard} />
              </section>
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Scenario</div>
                <article className="phone-portrait-info-card phone-scenario-quest-card" data-testid="phone-scenario-sheet-summary">
                  <PhoneScenarioArt path={activeScenario?.sheetArtPath} title={activeScenario?.name ?? "Selected scenario"} />
                  <strong>{activeScenario?.name ?? "No active scenario"}</strong>
                  <span>{scenarioPressure?.modeSpecific.label ?? activeScenario?.publicDisplay?.modeLabel ?? "Awaiting scenario"}</span>
                  <p>{activeScenario?.publicDisplay?.objective ?? activeScenario?.victoryText ?? "Scenario pressure appears here once the host starts the room."}</p>
                  {patch?.scenarioState ? (
                    <div className="phone-scenario-progress-grid" aria-label="Scenario preparation, final confrontation, and result">
                      <div>
                        <span>Preparation</span>
                        <strong>{Object.values(patch.scenarioState.preparation.resources).reduce((sum, value) => sum + value, 0)}</strong>
                        <small>{activeScenario?.id === "scenario_broken_seal" ? "Seal Integrity" : "Scenario resources"}</small>
                      </div>
                      <div>
                        <span>Final Confrontation</span>
                        <strong>{patch.scenarioState.confrontation.locked === true ? "Locked" : patch.scenarioState.confrontation.active ? "Active" : "Unlocked"}</strong>
                        <small>The Cinder Gate</small>
                      </div>
                      <div>
                        <span>Scenario Result</span>
                        <strong>{patch.scenarioState.result.status}</strong>
                        <small>Server authoritative</small>
                      </div>
                    </div>
                  ) : null}
                  <div className="phone-scenario-progress-grid" aria-label="Scenario progress and pressure">
                    <div>
                      <span>Win Progress</span>
                      <strong>
                        {scenarioPressure
                          ? `${scenarioPressure.objectiveProgress.current}/${scenarioPressure.objectiveProgress.required}`
                          : activeScenario
                            ? `${activeScenario.progress}/${activeScenario.threshold}`
                            : "0/0"}
                      </strong>
                      <small>{scenarioPressure?.objectiveProgress.label ?? activeScenario?.progressLabel ?? "Progress"}</small>
                    </div>
                    <div>
                      <span>Loss Pressure</span>
                      <strong>
                        {scenarioPressure
                          ? `${scenarioPressure.collapseTrack.current}/${scenarioPressure.collapseTrack.max}`
                          : patch
                            ? `${patch.escalationLevel}/${patch.escalationThreshold}`
                            : "0/0"}
                      </strong>
                      <small>If this reaches the limit, the scenario fails.</small>
                    </div>
                  </div>
                  <p className="phone-scenario-next-action">
                    Next: {activeScenario?.finalGateRequirement ?? scenarioPressure?.publicSummary ?? "Watch for scenario prompts after threats, contracts, and sector actions."}
                  </p>
                  <ResultDeltaRow deltas={scenarioDeltas} className="phone-scenario-deltas" />
                </article>
              </section>
            </div>
          )}

          {isTurnActionTab(activeTab) && (
            <div className="phone-portrait-screen phone-portrait-screen-command" data-testid="phone-action-screen">
              {patch && onIntent ? (
                <PhoneActionPanel
                  characters={characters}
                  onIntent={onIntent}
                  patch={patch}
                  selectedTurnTab={activeTab}
                  onSelectedTurnTab={setActiveTab}
                  hideTurnTabs
                />
              ) : (
                <section className="phone-portrait-section">
                  <div className="phone-sheet-section-heading">Command Sync</div>
                  <p className="phone-muted-copy">Actions appear when the room syncs.</p>
                </section>
              )}
            </div>
          )}
        </main>

        <nav className={bottomNavClassName} role="tablist" aria-label="Phone navigation">
          {bottomDockExpanded ? (
            <>
              {[
                ["player", "Player Card"],
                ["inventory", "Inventory"],
                ["quests", "Quest"],
                ["move", "Move"],
                ["battle", "Battle"],
                ["shop", "Shop"],
                ["action", "Action"]
              ].map(([key, label]) => (
                (() => {
                  const typedKey = key as PortraitTab;
                  const actionState = isTurnActionTab(typedKey) ? getActionTabState(typedKey, patch) : { disabled: false };
                  const tone = isTurnActionTab(typedKey)
                    ? typedKey === "move"
                      ? "move"
                      : typedKey === "battle"
                        ? "battle"
                        : typedKey === "shop"
                          ? "shop"
                          : "action"
                    : typedKey === "inventory"
                      ? "action"
                      : typedKey === "quests"
                        ? "shop"
                        : "neutral";

                  return (
                    <GameButton
                      key={key}
                      type="button"
                      tone={tone}
                      role="tab"
                      aria-selected={activeTab === typedKey}
                      selected={activeTab === typedKey}
                      className={`${activeTab === typedKey ? "phone-portrait-tab phone-portrait-tab-active" : "phone-portrait-tab"} phone-portrait-tab-${typedKey}${
                        actionState.locked ? " phone-portrait-tab-locked" : ""
                      }`}
                      data-tab={typedKey}
                      disabled={actionState.disabled}
                      disabledReason={actionState.disabled ? "Unavailable" : actionState.locked ? "Blocked" : undefined}
                      onClick={() => setActiveTab(typedKey)}
                    >
                      {label}
                    </GameButton>
                  );
                })()
              ))}
              <button
                type="button"
                className="phone-portrait-tab phone-portrait-tab-utility phone-tabs-collapse"
                onClick={hideBottomDock}
              >
                Hide Tabs
              </button>
            </>
          ) : (
            <div className="phone-compact-tab-dock" aria-label="Compact phone navigation">
              <button
                type="button"
                className="phone-compact-active-tab"
                role="tab"
                aria-selected="true"
                aria-current="page"
                onClick={showBottomDock}
              >
                {portraitTabLabels[activeTab]}
              </button>
              <button
                type="button"
                className="phone-button phone-button-secondary phone-chrome-restore"
                onClick={showBottomDock}
              >
                Show Tabs
              </button>
            </div>
          )}
        </nav>
      </div>
    </section>
  );
}
