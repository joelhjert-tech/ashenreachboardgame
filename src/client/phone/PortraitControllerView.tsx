import { useEffect, useRef, useState, type ReactElement, type TouchEvent } from "react";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { GameButton } from "../shared/GameButton.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { formatSeatLabel, statLabelById, statOrder } from "../shared/statLabels.js";
import type {
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  NemesisChampionSummary,
  PhonePatchPayload,
  PhoneSelfState,
  PrivateRivalryPayload,
  ResultDelta
} from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { PhoneActionPanel, type TurnActionTab } from "./PhoneActionPanel.js";

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
}

type PortraitTab = "player" | "inventory" | "quests" | TurnActionTab;

const turnActionTabs: TurnActionTab[] = ["move", "battle", "shop", "action"];
const immersiveControllerStorageKey = "ashen-reach-immersive-controller-mode";
const immersiveAutoHideDelayMs = 3600;

function isTurnActionTab(tab: PortraitTab): tab is TurnActionTab {
  return turnActionTabs.includes(tab as TurnActionTab);
}

function readStoredImmersiveControllerMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(immersiveControllerStorageKey) === "1";
  } catch {
    return false;
  }
}

function writeStoredImmersiveControllerMode(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(immersiveControllerStorageKey, enabled ? "1" : "0");
  } catch {
    // Local storage can be unavailable in private browser contexts.
  }
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
        disabled: !(
          (patch.movementPlanner?.active && patch.movementPlanner.destinations.length > 0) ||
          (isActiveSeat && patch.phase === "navigation")
        )
      };
    case "battle":
      return {
        disabled: !(patch.activeResolution || patch.pendingEnemyRoll || patch.encounter)
      };
    case "shop":
      return {
        disabled: !patch.shopEncounter,
        locked: shopLocked
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

  return contract.objective.label;
}

function describeContractProgress(contract: ContractCard): string {
  if (contract.objective.type === "defeatCount") {
    return `Progress 0/${contract.objective.target} defeated`;
  }

  return `Progress 0/${contract.objective.target} resolved`;
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
  onLobbyBack
}: PortraitControllerViewProps): ReactElement {
  const [activeTab, setActiveTab] = useState<PortraitTab>("player");
  const [immersiveControllerMode, setImmersiveControllerMode] = useState(readStoredImmersiveControllerMode);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [lastInteractionAt, setLastInteractionAt] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const requiresBattleFocus = Boolean(
    self &&
      patch?.status === "active" &&
      (patch.activeResolution ||
        patch.pendingEnemyRoll ||
        patch.encounter ||
        (patch.phase === "resolution" &&
          patch.outcomeSummary?.seatId === self.seatId &&
          Boolean(patch.outcomeSummary.encounterCardId)))
  );
  const movementRequiresControls = Boolean(
    activeTab === "move" &&
      self &&
      patch?.status === "active" &&
      patch.movementPlanner?.active &&
      patch.movementPlanner.destinations.length > 0
  );
  const shopRequiresControls = Boolean(
    activeTab === "shop" &&
      self &&
      patch?.status === "active" &&
      patch.phase === "action" &&
      patch.shopEncounter?.activePlayer.playerId === self.seatId &&
      patch.shopEncounter.status !== "locked"
  );
  const sectorActionRequiresControls = Boolean(
    activeTab === "action" &&
      self &&
      patch?.status === "active" &&
      patch.phase === "action" &&
      !patch.activeResolution &&
      !patch.pendingEnemyRoll &&
      !patch.encounter
  );
  const forceExpandedControls = Boolean(
    requiresBattleFocus ||
      movementRequiresControls ||
      shopRequiresControls ||
      sectorActionRequiresControls ||
      patch?.status === "lobby"
  );
  const controlsCollapsed = immersiveControllerMode && !controlsExpanded && !forceExpandedControls;

  useEffect(() => {
    if (requiresBattleFocus && activeTab !== "battle" && activeTab !== "inventory") {
      setActiveTab("battle");
    }
  }, [activeTab, requiresBattleFocus]);

  useEffect(() => {
    writeStoredImmersiveControllerMode(immersiveControllerMode);
    setControlsExpanded(true);
  }, [immersiveControllerMode]);

  useEffect(() => {
    if (!immersiveControllerMode || forceExpandedControls) {
      setControlsExpanded(true);
      return;
    }

    const hideTimer = window.setTimeout(() => setControlsExpanded(false), immersiveAutoHideDelayMs);

    return () => window.clearTimeout(hideTimer);
  }, [activeTab, forceExpandedControls, immersiveControllerMode, lastInteractionAt, patch?.phase, patch?.status]);

  const expandImmersiveControls = () => {
    if (immersiveControllerMode) {
      setControlsExpanded(true);
      setLastInteractionAt((current) => current + 1);
    }
  };

  const toggleImmersiveControllerMode = () => {
    setImmersiveControllerMode((current) => !current);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startY = touchStartY.current;
    touchStartY.current = null;

    if (startY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? startY;
    const movedUp = startY - endY > 36;
    const startedNearBottom = typeof window !== "undefined" ? startY > window.innerHeight - 130 : false;

    if (immersiveControllerMode && controlsCollapsed && movedUp && startedNearBottom) {
      setControlsExpanded(true);
    }
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
  const activeContractProgress = activeContractCard && self.character.activeContract
    ? `${self.character.activeContract.progress}`
    : null;
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
                  <div key={stat}>
                    <span>{statLabelById[stat]}</span>
                    <strong>{self.character.stats[stat]}</strong>
                  </div>
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
              </div>
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
    immersiveControllerMode ? "phone-shell--immersive" : "",
    controlsCollapsed ? "phone-shell--controls-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const topbarClassName = ["phone-portrait-header", "phone-topbar", controlsCollapsed ? "phone-topbar--collapsed" : ""]
    .filter(Boolean)
    .join(" ");
  const bottomNavClassName = [
    "phone-portrait-bottom-nav",
    "phone-bottomnav",
    controlsCollapsed ? "phone-bottomnav--collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={rootClassName}
      data-immersive-controller-mode={immersiveControllerMode ? "true" : "false"}
      onPointerDown={expandImmersiveControls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="phone-portrait-panel">
        <header className={topbarClassName}>
          {controlsCollapsed ? (
            <button
              type="button"
              className="phone-command-handle phone-command-handle-top"
              onClick={() => setControlsExpanded(true)}
              aria-label="Show player summary"
            >
              <span>{self.character.name}</span>
              <small>{self.character.wounds} wounds | {self.character.heat} heat</small>
            </button>
          ) : (
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
                <small>{self.character.heat} heat</small>
              </div>
              <div className="phone-portrait-header-actions">
                <button
                  type="button"
                  className="phone-button phone-button-secondary phone-immersive-toggle"
                  onClick={toggleImmersiveControllerMode}
                  aria-pressed={immersiveControllerMode}
                >
                  {immersiveControllerMode ? "Exit immersive" : "Immersive"}
                </button>
                <button type="button" className="phone-button phone-button-secondary phone-portrait-leave-button" onClick={onLeave}>
                  Leave
                </button>
              </div>
            </>
          )}
        </header>

        <main className="phone-portrait-scroll" aria-label="Phone content">
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
                    <div key={stat}>
                      <span>{statLabelById[stat]}</span>
                      <strong>{self.character.stats[stat]}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Vitals</div>
                <div className="phone-portrait-vitals" aria-label="Character vitals">
                  <span>Heat {self.character.heat}</span>
                  <span>Wounds {self.character.wounds}</span>
                  <span>Trophies {self.character.trophies}</span>
                  <span>Gear {self.character.heldGear.length}</span>
                </div>
              </section>

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
                <div className="phone-sheet-section-heading">Active Quest</div>
                <article className="phone-portrait-info-card">
                  <strong>{activeContractCard?.name ?? "No active contract"}</strong>
                  <span>{activeContractProgress ? `Progress ${activeContractProgress}` : "No contract progress yet."}</span>
                  <p>{activeContractCard?.text ?? "Accept a contract from the board to track private objectives here."}</p>
                </article>
              </section>
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Scenario</div>
                <article className="phone-portrait-info-card phone-scenario-quest-card" data-testid="phone-scenario-sheet-summary">
                  <strong>{activeScenario?.name ?? "No active scenario"}</strong>
                  <span>{scenarioPressure?.modeSpecific.label ?? activeScenario?.publicDisplay?.modeLabel ?? "Awaiting scenario"}</span>
                  <p>{activeScenario?.publicDisplay?.objective ?? activeScenario?.victoryText ?? "Scenario pressure appears here once the host starts the room."}</p>
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
          {controlsCollapsed ? (
            <button
              type="button"
              className="phone-command-handle phone-command-handle-bottom"
              onClick={() => setControlsExpanded(true)}
              aria-label="Show command navigation"
            >
              <span>Command</span>
              <small>{activeTab === "quests" ? "Quest" : activeTab === "player" ? "Player" : activeTab}</small>
            </button>
          ) : (
            [
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
                    className={`${activeTab === typedKey ? "phone-portrait-tab phone-portrait-tab-active" : "phone-portrait-tab"}${
                      actionState.locked ? " phone-portrait-tab-locked" : ""
                    }`}
                    disabled={actionState.disabled}
                    disabledReason={actionState.disabled ? "Unavailable" : actionState.locked ? "Blocked" : undefined}
                    onClick={() => setActiveTab(typedKey)}
                  >
                    {label}
                  </GameButton>
                );
              })()
            ))
          )}
        </nav>
      </div>
    </section>
  );
}
