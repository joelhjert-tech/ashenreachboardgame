import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactElement, type ReactNode, type RefObject } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { describeContractObjective as describeObjective, formatContractProgress } from "../../game/contracts/objectives.js";
import { getEquippedGearItem } from "../../game/engine/gear.js";
import { getCharacterPortraitPath, getObjectiveCategoryIconPath, type ObjectiveCategoryIcon } from "../shared/assetPaths.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import {
  buildCompletedContractPresentations,
  buildOwnerContractPresentation,
  buildPrivateAgendaPresentation,
  buildSharedMissionPresentation,
  describeContractReward as describeObjectiveReward
} from "../shared/objectivePresentation.js";
import { useFocusOnRevision } from "../shared/useFocusOnRevision.js";
import { usePhoneFullscreen } from "../shared/usePhoneFullscreen.js";
import { getMissionTargetClue } from "../shared/missionRelevance.js";
import { formatSeatLabel, gearSlotLabelById, statLabelById, statOrder } from "../shared/statLabels.js";
import type {
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  GearItem,
  GearSlot,
  Stat,
  NemesisChampionSummary,
  PhonePatchPayload,
  PhoneSelfState,
  PrivateRivalryPayload,
  ResultDelta
} from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { PhoneActionPanel, type TurnActionTab } from "./PhoneActionPanel.js";
import { PhoneRequiredActionShell, type RequiredActionStatus } from "./PhoneRequiredActionShell.js";
import type { MovementNavigationTarget } from "./PhoneMovementView.js";
import { isPhoneBattleRelevantToSeat } from "./PhoneBattleView.js";
import { isPhoneChallengeRelevantToSeat } from "./PhoneHazardChallengePrototype.js";
import { usePhoneBackDismissal } from "./useActiveRoomBackGuard.js";
import { getAfflictionEffectChips, getAfflictionStatusLabel } from "./afflictionPresentation.js";
import { formatSignedStatBonus, getPhoneStatBreakdown } from "./statBreakdown.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";
import { SignalPhoneIdentityRail } from "./SignalPhoneIdentityRail.js";
import {
  SignalPhoneMoreHeading,
  SignalPhoneNavigation,
  SignalPhoneTabIcon,
  signalPhoneTabLabels,
  type SignalPhoneCommandTab,
  type SignalPhoneTab
} from "./SignalPhoneNavigation.js";
import "./SignalPhone.css";

interface PortraitControllerViewProps {
  self: PhoneSelfState | null;
  roomCode: string;
  displayName: string;
  connectionStatus: string;
  activeSeatId: string | null;
  activeContractCard: ContractCard | null;
  patch: PhonePatchPayload | null;
  patchSequence?: number;
  serverError?: string | null;
  connectionSynchronized?: boolean;
  characters: CharacterCatalogEntry[];
  onIntent: ((intent: ClientIntent) => boolean | void) | null;
  onRequestResynchronize?: () => void;
  onLeave: () => void;
  onLobbyBack?: () => void;
  onStartSession?: () => void;
  startSubmitting?: boolean;
}

type PortraitTab = SignalPhoneTab;

const turnActionTabs: TurnActionTab[] = ["move", "battle", "shop", "action"];
const gearSlots: GearSlot[] = ["weapon", "armor", "utility"];
const phoneChromeStorageKey = "ashenreach.phoneChromeVisible";

function PhoneScenarioArt({ path, title }: { path?: string | null; title: string }): ReactElement | null {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [path]);
  if (!path || failed) return null;
  return <img className="phone-scenario-summary-art" src={path} alt={`${title} scenario artwork`} onError={() => setFailed(true)} />;
}

function isTurnActionTab(tab: PortraitTab): tab is TurnActionTab {
  return turnActionTabs.includes(tab as TurnActionTab);
}

interface PhoneActionGuidance {
  requiredTab: TurnActionTab | null;
  title: string;
  detail: string;
  canAct: boolean;
}

function getPhoneActionGuidance(patch: PhonePatchPayload | null, self: PhoneSelfState): PhoneActionGuidance | null {
  if (!patch || patch.status !== "active") return null;
  if (patch.requiredAction) {
    return {
      requiredTab: patch.requiredAction.requiredTab,
      title: patch.requiredAction.label,
      detail: patch.requiredAction.detail,
      canAct: patch.requiredAction.canAct
    };
  }
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const isActiveSeat = activeSeatId === self.seatId;
  const activeName = patch.seats.find((seat) => seat.seatId === activeSeatId)?.displayName ?? "the active player";
  const ownsBattle = isPhoneBattleRelevantToSeat(patch, self.seatId);

  if (ownsBattle) {
    const stage = patch.activeResolution?.stage;
    const detail = patch.pendingEnemyRoll
      ? "Enemy dice resolve automatically. Follow the totals here."
      : stage === "card_reveal" || stage === "battle_setup"
        ? "Roll your die when the battle control becomes available."
        : "Review the result and continue the resolution.";
    return { requiredTab: "battle", title: "Battle", detail, canAct: true };
  }

  if (patch.activeResolution?.playerId === self.seatId && patch.activeResolution.source === "movement") {
    return {
      requiredTab: "move",
      title: "Approach Result",
      detail: "Review the authoritative movement total and continue.",
      canAct: true
    };
  }

  if (patch.activeResolution?.playerId === self.seatId && patch.activeResolution.card) {
    const category = patch.activeResolution.card.type;
    const title = category === "anomaly"
      ? "Anomaly"
      : category === "escalation"
        ? "Escalation"
        : category === "event"
          ? "Event"
          : category === "asset"
            ? "Asset find"
            : category === "hazard"
              ? "Hazard"
              : "Encounter";
    return { requiredTab: "action", title, detail: "Review the test, result, and authored consequence.", canAct: true };
  }

  if (!isActiveSeat) {
    return {
      requiredTab: null,
      title: `Waiting for ${activeName}`,
      detail: patch.encounter ? "The current encounter belongs to another operative." : "Your controls unlock when your authoritative turn begins.",
      canAct: false
    };
  }

  if (patch.movementPlanner?.active || patch.phase === "navigation") {
    return {
      requiredTab: "move",
      title: "Move",
      detail: patch.movementPlanner?.selectedDestinationId
        ? "Confirm the selected destination."
        : patch.movementPlanner?.destinations.length
          ? "Choose a destination."
          : "Roll movement.",
      canAct: true
    };
  }

  if (patch.shopEncounter) {
    return { requiredTab: "shop", title: "Shop", detail: "Browse Equipment or choose a service.", canAct: true };
  }

  if (patch.phase === "resolution" || patch.phase === "sector" || patch.phase === "broadcast") {
    return { requiredTab: "action", title: "Action", detail: "Resolve the current choice or continue.", canAct: true };
  }

  if (patch.phase === "action") {
    return { requiredTab: "action", title: "Action", detail: "Choose your sector action.", canAct: true };
  }

  return { requiredTab: null, title: "Turn in progress", detail: "Follow the current table state.", canAct: false };
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

function getCompactStatSummary(self: PhoneSelfState, stat: Stat, suppressedInstanceIds: ReadonlySet<string>): string {
  const breakdown = getPhoneStatBreakdown(self, stat, { suppressedInstanceIds });
  const modifierTotal = breakdown.upgrades + breakdown.equipped + breakdown.companion;
  const statusTotal = breakdown.temporaryStatus;
  const additions = modifierTotal !== 0
    ? [`Bonus ${formatSignedStatBonus(modifierTotal)}`]
    : [];
  const status = statusTotal !== 0 ? [`Status ${formatSignedStatBonus(statusTotal)}`] : [];

  return [`Base ${breakdown.base}`, ...additions, ...status].join(" ");
}

function formatEquippedPassiveBonus(item: GearItem): string {
  const amount = formatSignedStatBonus(item.statBonus.amount);
  const stat = statLabelById[item.statBonus.stat].toUpperCase();
  return item.effectModel === "conditional" && item.conditionType === "battle"
    ? `${amount} ${stat} IN BATTLES`
    : `${amount} ${stat} · ALWAYS ACTIVE`;
}

function getEquipmentAbilityState(item: GearItem): string | null {
  if (item.useLimit === "charge" || item.effectModel === "charged") {
    const current = item.currentCharges ?? item.charges ?? item.startingCharges ?? 0;
    const maximum = item.maxCharges ?? item.charges ?? item.startingCharges ?? current;
    return `${current} / ${maximum} CHARGES${current <= 0 ? " · DEPLETED" : ""}`;
  }
  if (item.effectModel === "exhaust") {
    return `${item.exhausted ? "EXHAUSTED" : "READY"} · REFRESHES NEXT ROUND`;
  }
  return null;
}

function PortraitStatCard({
  self,
  stat,
  suppressedInstanceIds,
  expanded,
  onToggle,
  relevant = false
}: {
  self: PhoneSelfState;
  stat: Stat;
  suppressedInstanceIds: ReadonlySet<string>;
  expanded: boolean;
  onToggle: () => void;
  relevant?: boolean;
}): ReactElement {
  const breakdown = getPhoneStatBreakdown(self, stat, { suppressedInstanceIds });
  const label = statLabelById[stat];
  const displayLabel = label.toUpperCase();
  const modifierTotal = breakdown.upgrades + breakdown.equipped + breakdown.companion;

  return (
    <button
      type="button"
      className={`phone-stat-card phone-stat-card-${stat}${expanded ? " phone-stat-card-expanded" : ""}${relevant ? " phone-stat-card-relevant" : ""}`}
      style={getChallengeThemeStyle(stat) as CSSProperties}
      data-stat={stat}
      aria-expanded={expanded}
      aria-label={`${label} stat ${breakdown.final}${relevant ? ", relevant now" : ""}${expanded ? ", details expanded" : ""}`}
      onClick={onToggle}
    >
      <span className="phone-stat-card-heading">
        <span className="phone-stat-card-label">{displayLabel}</span>
        {relevant ? <span className="phone-stat-card-now">Relevant now</span> : null}
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
      <span className="phone-stat-card-summary">{getCompactStatSummary(self, stat, suppressedInstanceIds)}</span>
      {expanded && (
        <dl className="phone-stat-card-details" aria-label={`${label} stat details`}>
          <div>
            <dt>Base</dt>
            <dd>{breakdown.base}</dd>
          </div>
          <div>
            <dt>Upgrades</dt>
            <dd>{formatSignedStatBonus(breakdown.upgrades)}</dd>
          </div>
          <div>
            <dt>Equipped</dt>
            <dd>
              {formatSignedStatBonus(breakdown.equipped)}
              {breakdown.equippedSources.length > 0 ? (
                <small className="phone-stat-card-source-list">
                  {breakdown.equippedSources.map((source) => (
                    <span key={`${source.catalogId}-${source.instanceId ?? source.label}`}>
                      {source.label} {formatSignedStatBonus(source.value)}
                    </span>
                  ))}
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Companion</dt>
            <dd>
              {formatSignedStatBonus(breakdown.companion)}
              {breakdown.companionSources.length > 0 ? (
                <small className="phone-stat-card-source-list">
                  {breakdown.companionSources.map((source) => (
                    <span key={`${source.sourceType}-${source.label}`}>
                      {source.label} {formatSignedStatBonus(source.value)}
                    </span>
                  ))}
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Temporary / Status</dt>
            <dd>
              {formatSignedStatBonus(breakdown.temporaryStatus)}
              {breakdown.contextualSources.length > 0 ? (
                <small className="phone-stat-card-source-list">
                  {breakdown.contextualSources.map((source) => (
                    <span key={`${source.sourceType}-${source.scope}-${source.label}`}>
                      {source.label} {source.scope === "battle/check" ? "battle/check" : source.scope} {formatSignedStatBonus(source.value)}
                    </span>
                  ))}
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Final</dt>
            <dd>{breakdown.final}</dd>
          </div>
        </dl>
      )}
    </button>
  );
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

function describeContractReward(contract: ContractCard): string {
  return describeObjectiveReward(contract);
}

function ObjectiveDisclosure({
  label,
  summary,
  icon,
  count,
  initiallyOpen,
  children
}: {
  label: string;
  summary: string;
  icon: ObjectiveCategoryIcon;
  count?: number;
  initiallyOpen: boolean;
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(initiallyOpen);
  const reactId = useId();
  const contentId = `phone-objective-group-${reactId.replace(/:/g, "")}`;

  return (
    <section className={`phone-objective-group${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="phone-objective-group-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <img
          className="phone-objective-group-icon"
          src={getObjectiveCategoryIconPath(icon)}
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          decoding="async"
        />
        <span className="phone-objective-group-copy">
          <strong>{label}</strong>
          <small>{summary}</small>
        </span>
        {count !== undefined ? <span className="phone-objective-group-count" aria-label={`${count} ${label}`}>{count}</span> : null}
        <span className="phone-objective-group-indicator" aria-hidden="true" />
      </button>
      {open ? <div id={contentId} className="phone-objective-group-content">{children}</div> : null}
    </section>
  );
}

function submittingLabel(intent: ClientIntent): string {
  switch (intent.type) {
    case "MOVEMENT_ROLL_REQUESTED":
      return "ROLLING";
    case "MOVE_REQUESTED":
      return "MOVING";
    case "SHOP_PURCHASE_REQUESTED":
    case "SHOP_SERVICE_REQUESTED":
      return "PURCHASING";
    case "CONTINUE_RESOLUTION":
      return "CONTINUING";
    case "PHASE_ADVANCED":
      return intent.toPhase === "start" ? "ENDING TURN" : "FINISHING ACTIONS";
    default:
      return "SUBMITTING";
  }
}

function isCommittingRequiredActionIntent(intent: ClientIntent): boolean {
  return intent.type !== "MOVEMENT_DESTINATION_PREVIEWED";
}

function ContractMissionCard({
  contract,
  terminology = "mission",
  recommended,
  selected,
  pending,
  disabled,
  onSelect
}: {
  contract: ContractCard;
  terminology?: "mission" | "contract";
  recommended?: boolean;
  selected?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}): ReactElement {
  return (
    <article
      className="phone-starting-mission-card"
      data-selected={selected ? "true" : "false"}
      data-compact={!onSelect ? "true" : "false"}
    >
      <div className="phone-starting-mission-art-frame">
        <PhoneInspectableCardArt
          cardType="contract"
          cardId={contract.id}
          title={contract.name}
          lore={contract.text}
          rules={`${describeContractObjective(contract)} ${describeContractProgress(contract)}`}
          className="phone-starting-mission-art"
          testId="phone-starting-mission-art"
        />
      </div>
      <div className="phone-starting-mission-card-top">
        <span>{recommended ? "Recommended Mission" : contract.factionGiver}</span>
        <strong>{contract.name}</strong>
      </div>
      <div className="phone-starting-mission-footer">
        <span>{contract.objective.type === "defeatCount" ? "Threat lane" : "Sector action"}</span>
        {onSelect ? (
          <button
            type="button"
            className="phone-button phone-button-primary phone-starting-mission-select"
            disabled={disabled}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {pending ? "Selecting..." : selected ? "Selected" : `Select ${terminology === "contract" ? "Contract" : "Mission"}`}
          </button>
        ) : null}
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
    </article>
  );
}

function PhoneMissionReplacementView({
  displayName,
  operativeName,
  options,
  pendingContractId,
  recoveryMessage,
  stageRef,
  onSelect
}: {
  displayName: string;
  operativeName: string;
  options: ContractCard[];
  pendingContractId: string | null;
  recoveryMessage?: string | null;
  stageRef: RefObject<HTMLElement | null>;
  onSelect: (contractId: string) => void;
}): ReactElement {
  const visibleOptions = options.slice(0, 3);

  return (
    <section
      className="phone-portrait-controller phone-ui-streamlined signal-phone-shell phone-mission-replacement-shell"
      data-testid="phone-mission-replacement"
    >
      <main
        ref={stageRef}
        className="phone-mission-replacement"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-mission-replacement-title"
        aria-describedby="phone-mission-replacement-detail"
      >
        <header className="phone-mission-replacement__header">
          <div>
            <span>{displayName}</span>
            <strong>{operativeName}</strong>
          </div>
          <small>Private mission relay</small>
        </header>

        <section className="phone-mission-replacement__completion">
          <div className="phone-mission-replacement__seal" aria-hidden="true">
            <svg viewBox="0 0 100 100" focusable="false">
              <path d="m50 7 11 8 14-1 4 13 12 7-5 13 5 13-12 7-4 13-14-1-11 8-11-8-14 1-4-13-12-7 5-13-5-13 12-7 4-13 14 1z" />
              <path d="m29 52 13 13 30-34" />
            </svg>
          </div>
          <div>
            <span>Reward resolved · Contract archived</span>
            <h1 id="phone-mission-replacement-title">Mission complete</h1>
            <p id="phone-mission-replacement-detail">
              Choose one new private mission. Only these sealed offers and your selection appear on this phone.
            </p>
          </div>
        </section>

        <div className="phone-mission-replacement__count" aria-label={`${visibleOptions.length} mission offers available`}>
          <span>Choose next mission</span>
          <strong>{visibleOptions.length} sealed offer{visibleOptions.length === 1 ? "" : "s"}</strong>
        </div>

        <section className="phone-mission-offers" aria-label="Choose new mission">
          {visibleOptions.map((contract, index) => (
            <article
              key={contract.id}
              className="phone-mission-offer"
              style={{ "--mission-offer-index": index } as CSSProperties}
            >
              <div className="phone-mission-offer__art">
                <PhoneInspectableCardArt
                  cardType="contract"
                  cardId={contract.id}
                  title={contract.name}
                  lore={contract.text}
                  rules={`${describeContractObjective(contract)} ${describeContractProgress(contract)}`}
                  testId="phone-replacement-mission-art"
                />
                <span aria-hidden="true">0{index + 1}</span>
              </div>
              <div className="phone-mission-offer__copy">
                <span>{contract.factionGiver}</span>
                <h2>{contract.name}</h2>
                <p>{contract.text}</p>
                <dl>
                  <div>
                    <dt>Objective</dt>
                    <dd>{describeContractObjective(contract)}</dd>
                  </div>
                  <div>
                    <dt>Reward</dt>
                    <dd>{describeContractReward(contract)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="phone-button phone-button-primary phone-mission-offer__select"
                  disabled={pendingContractId !== null}
                  onClick={() => onSelect(contract.id)}
                >
                  {pendingContractId === contract.id ? "Accepting mission..." : `Choose ${contract.name}`}
                </button>
              </div>
            </article>
          ))}
        </section>

        {recoveryMessage ? <p className="phone-submission-recovery" role="status">{recoveryMessage}</p> : null}
        <p className="phone-mission-replacement__privacy">
          Mission details remain private until the rules reveal a public result.
        </p>
      </main>
    </section>
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
        <span>My Contract</span>
        <strong>No active Contract</strong>
        <p>Choose a Contract to track your private objective here.</p>
      </article>
    );
  }

  if (!contract) {
    return (
      <article className="phone-portrait-info-card phone-active-mission-card" data-testid="phone-active-mission-card">
        <span>My Contract</span>
        <strong>Contract syncing</strong>
        <p>Your private Contract is restoring. Progress {activeContract.progress}.</p>
      </article>
    );
  }

  const targetClue = getMissionTargetClue(contract);
  const presentation = buildOwnerContractPresentation(contract, activeContract);

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
        <span>My Contract</span>
        <span>{contract.factionGiver}</span>
      </div>
      <strong>{presentation.title}</strong>
      {targetClue ? (
        <p className="phone-active-mission-target" data-testid="phone-active-mission-target">
          {targetClue}
        </p>
      ) : null}
      <dl className="phone-active-mission-details">
        <div>
          <dt>Objective</dt>
          <dd>{presentation.instruction}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{presentation.progressText}</dd>
        </div>
        <div>
          <dt>Reward</dt>
          <dd>{presentation.reward}</dd>
        </div>
      </dl>
      {presentation.conditions.length > 1 ? (
        <ol className="phone-objective-condition-list" aria-label="Contract conditions">
          {presentation.conditions.map((condition) => (
            <li key={condition.label} data-state={condition.state}>
              <span>{condition.state === "completed" ? "Complete" : condition.state === "current" ? "Current" : "Remaining"}</span>
              <strong>{condition.label}</strong>
            </li>
          ))}
        </ol>
      ) : null}
      <details className="phone-objective-lore">
        <summary>View Contract lore</summary>
        <p>{presentation.lore}</p>
      </details>
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
  const presentation = buildPrivateAgendaPresentation(rivalry);
  const objective = presentation.objective;
  const progressLabel = objective ? `${objective.progress}/${objective.target}` : null;
  const canReveal = rivalry.reveal.available && rivalry.reveal.state === "revealAvailable" && Boolean(onIntent);

  return (
    <section className="phone-portrait-section phone-rivalry-quest-panel" aria-label="Private rivalry agenda">
      <div className="phone-sheet-section-heading">Private Agenda</div>
      <article className="phone-portrait-info-card phone-rivalry-quest-card">
        <div className="phone-rivalry-quest-topline">
          <span>{modeLabel}</span>
          <span>{rivalry.secrecy}</span>
        </div>
        <strong>{objective?.title ?? "Objective sealed"}</strong>
        <p>{objective?.summary ?? presentation.instruction}</p>
        {objective && progressLabel ? (
          <div className="phone-rivalry-progress" aria-label={`${objective.progressLabel} ${progressLabel}`}>
            <span>{objective.progressLabel}</span>
            <strong>{progressLabel}</strong>
          </div>
        ) : null}
        {rivalry.scoring?.completionSummary ? (
          <div className="phone-rivalry-completion" aria-label="Rivalry agenda completion">
            <span>{rivalry.revealState === "failed" ? "Failed" : "Completed"}</span>
            <strong>{rivalry.scoring.pointsAwarded > 0 ? `${rivalry.scoring.pointsAwarded} rivalry point` : "No points awarded"}</strong>
            <p>{rivalry.scoring.completionSummary}</p>
          </div>
        ) : null}
        {objective ? <p className="phone-rivalry-stakes">{objective.stakes}</p> : null}
        <div className="phone-portrait-chip-row phone-rivalry-chip-row">
          <span>{rivalry.reveal.label}</span>
          {objective ? <span>{rivalry.reveal.hint}</span> : null}
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
  patchSequence,
  serverError = null,
  connectionSynchronized = true,
  characters,
  onIntent,
  onRequestResynchronize,
  onLeave,
  onLobbyBack,
  onStartSession,
  startSubmitting = false
}: PortraitControllerViewProps): ReactElement {
  const [activeTab, setActiveTab] = useState<PortraitTab>("player");
  const [phoneChromeVisible, setPhoneChromeVisible] = useState(readStoredPhoneChromeVisible);
  const [bottomDockExpanded, setBottomDockExpanded] = useState(false);
  const bottomDockCollapseTimerRef = useRef<number | null>(null);
  const bottomDockRef = useRef<HTMLElement | null>(null);
  const bottomDockMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const bottomDockCollapsePendingRef = useRef(false);
  const fullscreen = usePhoneFullscreen();
  const [expandedStat, setExpandedStat] = useState<Stat | null>(null);
  const [choosingStartingMission, setChoosingStartingMission] = useState(false);
  const [pendingStartingContract, setPendingStartingContract] = useState<{ id: string; sequence: number } | null>(null);
  const [pendingActiveContract, setPendingActiveContract] = useState<{ id: string; sequence: number } | null>(null);
  const [pendingSetupSubmission, setPendingSetupSubmission] = useState<{
    kind: "starting-contract" | "replacement-contract" | "ready";
    sequence: number;
  } | null>(null);
  const [setupSubmissionRecovery, setSetupSubmissionRecovery] = useState<string | null>(null);
  const [awaitingSetupResynchronization, setAwaitingSetupResynchronization] = useState(false);
  const [setupDisconnectObserved, setSetupDisconnectObserved] = useState(false);
  const [pendingRequiredIntent, setPendingRequiredIntent] = useState<{
    projectionId: string;
    sequence: number;
    label: string;
  } | null>(null);
  const [actionRecovery, setActionRecovery] = useState<{ message: string; sequence: number } | null>(null);
  const [awaitingRequiredActionResynchronization, setAwaitingRequiredActionResynchronization] = useState(false);
  const [requiredActionDisconnectObserved, setRequiredActionDisconnectObserved] = useState(false);
  const [qaRequiredActionState, setQaRequiredActionState] = useState<{ status: RequiredActionStatus; label: string } | null>(null);
  const startingMissionSectionRef = useRef<HTMLElement | null>(null);
  const replacementMissionStageRef = useRef<HTMLElement | null>(null);
  const setupStageRef = useRef<HTMLElement | null>(null);
  const lobbyScrollRef = useRef<HTMLElement | null>(null);
  const phoneScrollRef = useRef<HTMLElement | null>(null);
  const pendingTabScrollRef = useRef<"top" | "required" | null>(null);
  const lastAutoRoutedActionRef = useRef<string | null>(null);
  const phoneChromeHidden = !phoneChromeVisible;
  const actionGuidance = self ? getPhoneActionGuidance(patch, self) : null;

  const scrollPhoneContent = (target: "top" | "required"): void => {
    const scrollRoot = phoneScrollRef.current;
    if (!scrollRoot) return;
    if (target === "required") {
      const required = scrollRoot.querySelector<HTMLElement>("[data-testid='phone-required-action-shell']");
      if (required) {
        if (typeof required.scrollIntoView === "function") {
          required.scrollIntoView({ block: "start", behavior: "auto" });
        } else {
          scrollRoot.scrollTop = required.offsetTop;
        }
        return;
      }
    }
    if (typeof scrollRoot.scrollTo === "function") {
      scrollRoot.scrollTo({ top: 0, behavior: "auto" });
    } else {
      scrollRoot.scrollTop = 0;
    }
  };

  const navigateToTab = (tab: PortraitTab, target: "top" | "required" = "top"): void => {
    if (tab === activeTab) {
      scrollPhoneContent(target);
      return;
    }
    pendingTabScrollRef.current = target;
    setActiveTab(tab);
  };

  useLayoutEffect(() => {
    const pending = pendingTabScrollRef.current;
    if (!pending) return;
    pendingTabScrollRef.current = null;
    scrollPhoneContent(pending);
  }, [activeTab]);

  usePhoneBackDismissal(true, () => {
    if (bottomDockExpanded) {
      setBottomDockExpanded(false);
      window.setTimeout(() => bottomDockMoreButtonRef.current?.focus(), 0);
      return true;
    }
    if (expandedStat) {
      setExpandedStat(null);
      return true;
    }
    const openDetail = phoneScrollRef.current?.querySelector<HTMLDetailsElement>("details[open]");
    if (openDetail) {
      openDetail.open = false;
      openDetail.querySelector<HTMLElement>("summary")?.focus();
      return true;
    }
    return false;
  });

  useEffect(() => {
    writeStoredPhoneChromeVisible(phoneChromeVisible);
  }, [phoneChromeVisible]);

  useEffect(() => {
    if (!patch?.setup?.stage) return;
    lobbyScrollRef.current?.scrollTo?.({ top: 0, behavior: "auto" });
  }, [patch?.setup?.stage]);

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
    if (bottomDockCollapseTimerRef.current !== null) window.clearTimeout(bottomDockCollapseTimerRef.current);
    bottomDockCollapsePendingRef.current = false;
    setBottomDockExpanded(true);
  };

  const hideBottomDock = () => {
    if (bottomDockCollapseTimerRef.current !== null) window.clearTimeout(bottomDockCollapseTimerRef.current);
    bottomDockCollapseTimerRef.current = null;
    bottomDockCollapsePendingRef.current = false;
    setBottomDockExpanded(false);
  };

  const chooseBottomDockTab = (tab: PortraitTab): void => {
    navigateToTab(tab, patch?.requiredAction?.requiredTab === tab ? "required" : "top");
    hideBottomDock();
    window.setTimeout(() => {
      const persistentTab = bottomDockRef.current
        ?.querySelector<HTMLButtonElement>(`.signal-phone-nav__primary [data-signal-phone-tab="${tab}"]`);
      (persistentTab ?? bottomDockMoreButtonRef.current)?.focus();
    }, 0);
  };

  const handleBottomDockBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!bottomDockCollapsePendingRef.current || event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    bottomDockCollapsePendingRef.current = false;
    setBottomDockExpanded(false);
  };

  useEffect(() => {
    if (!bottomDockExpanded) return;
    const focusFrame = window.requestAnimationFrame(() => {
      bottomDockRef.current?.querySelector<HTMLElement>(".phone-more-menu button:not([disabled])")?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setBottomDockExpanded(false);
      window.setTimeout(() => bottomDockMoreButtonRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bottomDockExpanded]);

  useEffect(() => () => {
    if (bottomDockCollapseTimerRef.current !== null) window.clearTimeout(bottomDockCollapseTimerRef.current);
  }, []);

  useEffect(() => {
    if (!patch || !self || patch.status !== "active") {
      return;
    }

    if (patch.requiredAction) {
      const routeKey = `${patch.requiredAction.id}:${patch.requiredAction.requiredTab ?? "none"}`;
      if (lastAutoRoutedActionRef.current === routeKey) {
        return;
      }
      lastAutoRoutedActionRef.current = routeKey;
      if (patch.requiredAction.requiredTab) {
        navigateToTab(patch.requiredAction.requiredTab, "required");
      }
      return;
    }

    lastAutoRoutedActionRef.current = null;

    const nextTab: PortraitTab | null = getPhoneActionGuidance(patch, self)?.requiredTab ?? null;

    if (nextTab && nextTab !== activeTab) {
      navigateToTab(nextTab);
    }
  }, [
    patch?.activeResolution?.id,
    patch?.activeResolution?.stage,
    patch?.activeSeatIndex,
    patch?.encounter?.id,
    patch?.movementPlanner?.active,
    patch?.pendingEnemyRoll?.encounterCardId,
    patch?.phase,
    patch?.requiredAction?.id,
    patch?.requiredAction?.requiredTab,
    patch?.shopEncounter?.shopId,
    patch?.status,
    patchSequence,
    self?.seatId
  ]);

  useEffect(() => {
    if (!pendingRequiredIntent) return;
    const projectionChanged = patch?.requiredAction?.id !== pendingRequiredIntent.projectionId;
    if (projectionChanged) {
      setPendingRequiredIntent(null);
      setAwaitingRequiredActionResynchronization(false);
      setRequiredActionDisconnectObserved(false);
    }
  }, [patch?.requiredAction?.id, pendingRequiredIntent]);

  useEffect(() => {
    if (!serverError || !patch?.requiredAction) return;
    const stale = /stale|changed|mismatch|no longer|already resolved|unavailable/i.test(serverError);
    const transportFailure = /not sent|connection|socket|restoring/i.test(serverError);
    if (pendingRequiredIntent && !transportFailure) setPendingRequiredIntent(null);
    if (transportFailure) {
      setAwaitingRequiredActionResynchronization(true);
      if (!connectionSynchronized) setRequiredActionDisconnectObserved(true);
    }
    setActionRecovery({
      message: transportFailure
        ? "Restoring latest state. The action will not be sent again automatically."
        : stale
        ? "The turn has advanced. The current required action has been restored."
        : "The action was not accepted. Restoring the current action.",
      sequence: patchSequence ?? 0
    });
  }, [connectionSynchronized, patch?.requiredAction, patchSequence, pendingRequiredIntent, serverError]);

  useEffect(() => {
    if (
      awaitingRequiredActionResynchronization ||
      !actionRecovery ||
      typeof patchSequence !== "number" ||
      patchSequence <= actionRecovery.sequence
    ) return;
    setActionRecovery(null);
  }, [actionRecovery, awaitingRequiredActionResynchronization, patchSequence]);

  useEffect(() => {
    if (!pendingRequiredIntent || awaitingRequiredActionResynchronization) return;
    const timer = window.setTimeout(() => {
      setActionRecovery({
        message: "Restoring latest state. The action will not be sent again automatically.",
        sequence: patchSequence ?? pendingRequiredIntent.sequence
      });
      setAwaitingRequiredActionResynchronization(true);
      if (!connectionSynchronized) setRequiredActionDisconnectObserved(true);
      onRequestResynchronize?.();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [
    awaitingRequiredActionResynchronization,
    connectionSynchronized,
    onRequestResynchronize,
    patchSequence,
    pendingRequiredIntent
  ]);

  useEffect(() => {
    if (!awaitingRequiredActionResynchronization) return;
    if (!connectionSynchronized) {
      setRequiredActionDisconnectObserved(true);
      return;
    }
    if (!requiredActionDisconnectObserved) return;
    setPendingRequiredIntent(null);
    setAwaitingRequiredActionResynchronization(false);
    setRequiredActionDisconnectObserved(false);
    setActionRecovery({
      message: "Latest authoritative action restored.",
      sequence: patchSequence ?? 0
    });
  }, [
    awaitingRequiredActionResynchronization,
    connectionSynchronized,
    patchSequence,
    requiredActionDisconnectObserved
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined" || !new URLSearchParams(window.location.search).has("qaNetworkControls")) return;
    const handleQaState = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const status = event.detail?.status;
      if (status !== "available" && status !== "submitting" && status !== "resolving" && status !== "blocked") return;
      setQaRequiredActionState({ status, label: typeof event.detail?.label === "string" ? event.detail.label : status.toUpperCase() });
    };
    window.addEventListener("ashenreach:qa-required-action-state", handleQaState);
    return () => window.removeEventListener("ashenreach:qa-required-action-state", handleQaState);
  }, []);

  useEffect(() => setQaRequiredActionState(null), [patch?.requiredAction?.id]);

  useEffect(() => {
    if (!pendingStartingContract) {
      return;
    }

    if (patch?.selectedStartingContract?.id === pendingStartingContract.id) {
      setPendingStartingContract(null);
      setPendingSetupSubmission(null);
      setSetupSubmissionRecovery(null);
      setChoosingStartingMission(false);
      return;
    }

    if (typeof patchSequence === "number" && patchSequence > pendingStartingContract.sequence) {
      setPendingStartingContract(null);
      setPendingSetupSubmission(null);
    }
  }, [patch?.selectedStartingContract?.id, patchSequence, pendingStartingContract]);

  useEffect(() => {
    if (!pendingSetupSubmission || awaitingSetupResynchronization) return;
    const timeout = window.setTimeout(() => {
      setSetupSubmissionRecovery("Restoring latest state. The selection will not be sent again automatically.");
      setAwaitingSetupResynchronization(true);
      if (!connectionSynchronized) setSetupDisconnectObserved(true);
      onRequestResynchronize?.();
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [
    awaitingSetupResynchronization,
    connectionSynchronized,
    onRequestResynchronize,
    pendingSetupSubmission
  ]);

  useEffect(() => {
    if (!awaitingSetupResynchronization) return;
    if (!connectionSynchronized) {
      setSetupDisconnectObserved(true);
      return;
    }
    if (!setupDisconnectObserved) return;
    setPendingStartingContract(null);
    setPendingActiveContract(null);
    setPendingSetupSubmission(null);
    setAwaitingSetupResynchronization(false);
    setSetupDisconnectObserved(false);
    setSetupSubmissionRecovery("Latest authoritative setup state restored.");
  }, [awaitingSetupResynchronization, connectionSynchronized, setupDisconnectObserved]);

  useEffect(() => {
    if (!pendingActiveContract) return;
    if (self?.character.activeContract?.contractId === pendingActiveContract.id) {
      setPendingActiveContract(null);
      setPendingSetupSubmission(null);
      setSetupSubmissionRecovery(null);
      return;
    }
    if (typeof patchSequence === "number" && patchSequence > pendingActiveContract.sequence) {
      setPendingActiveContract(null);
      setPendingSetupSubmission(null);
    }
  }, [patchSequence, pendingActiveContract, self?.character.activeContract?.contractId]);

  useEffect(() => {
    if (!pendingSetupSubmission || pendingSetupSubmission.kind !== "ready") return;
    const setupSeatReady = patch?.seats.find((seat) => seat.seatId === self?.seatId)?.ready;
    if (setupSeatReady || (typeof patchSequence === "number" && patchSequence > pendingSetupSubmission.sequence)) {
      setPendingSetupSubmission(null);
      setSetupSubmissionRecovery(null);
    }
  }, [patch?.seats, patchSequence, pendingSetupSubmission, self?.seatId]);

  const setupFocusSelector = patch?.setup?.stage === "mission-selection"
    ? ".phone-starting-mission-select:not([disabled])"
    : patch?.setup?.stage === "ready-check"
      ? '[data-testid="phone-setup-ready-action"]:not([disabled])'
      : patch?.setup?.stage === "start-available"
        ? '[data-testid="phone-setup-start-action"]:not([disabled])'
        : null;
  useFocusOnRevision(
    setupStageRef,
    patch?.setup?.id,
    Boolean(self && patch?.setup?.actorSeatId === self.seatId && setupFocusSelector),
    setupFocusSelector
  );
  useFocusOnRevision(
    replacementMissionStageRef,
    patch?.pendingMissionSelection?.id,
    Boolean(
      self &&
      patch?.pendingMissionSelection?.status === "awaitingSelection" &&
      (self.character.activeContracts?.length ?? (self.character.activeContract ? 1 : 0)) < 3
    ),
    ".phone-mission-offer__select:not([disabled])"
  );

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

  const scenarioDeltas = scenarioQuestDeltas(patch?.playerResultDeltas ?? patch?.publicResultDeltas);
  const sharedMission = buildSharedMissionPresentation(patch);
  const completedContracts = buildCompletedContractPresentations(self, patch?.availableContracts ?? []);
  const activeMissionStates =
    self.character.activeContracts?.length
      ? self.character.activeContracts
      : self.character.activeContract
        ? [self.character.activeContract]
        : [];
  const activeMissionCards =
    patch?.activeContractCards?.length
      ? patch.activeContractCards
      : activeContractCard
        ? [activeContractCard]
        : [];
  const ownSeat = patch?.seats.find((seat) => seat.seatId === self.seatId) ?? null;
  const isLateJoinPending = patch?.lateJoinPending === true;
  const isLobbyWaiting = patch?.status === "lobby" || isLateJoinPending || (!patch && Boolean(onLobbyBack));
  const replacementMissionActive = Boolean(
    patch?.pendingMissionSelection?.status === "awaitingSelection" &&
    activeMissionStates.length < 3
  );
  const localUnboundNemeses = (patch?.nemesisChampions ?? []).filter(
    (nemesis) => nemesis.boundPlayerId !== self.seatId && nemesis.sectorId === self.character.currentSpaceId && !nemesis.defeated
  );
  const opposedBattleActive = isPhoneBattleRelevantToSeat(patch, self.seatId);
  const challengeTrialActive = isPhoneChallengeRelevantToSeat(patch, self.seatId);
  const cooperativeAssistanceActive = Boolean(
    patch?.cooperativeAssistance ||
      patch?.pendingCooperativeTest ||
      patch?.cooperativeAssistanceEligibility ||
      (patch?.activeResolution?.assistance && patch.activeResolution.assistance.activeSeatId === self.seatId)
  );
  const focusedResolutionTab: TurnActionTab = opposedBattleActive ? "battle" : "action";
  const matchEnded = patch?.status === "ended";
  const focusedResolutionActive = matchEnded || opposedBattleActive || challengeTrialActive || cooperativeAssistanceActive;
  const suppressedEquipmentInstanceIds = new Set(
    (patch?.equipmentSuppressions ?? [])
      .filter((suppression) => suppression.active)
      .map((suppression) => suppression.itemInstanceId)
  );
  const sendControllerIntent = (intent: ClientIntent): boolean => {
    if (!onIntent) return false;
    const result = onIntent(intent);
    if (result === false) onRequestResynchronize?.();
    return result !== false;
  };

  if (isLobbyWaiting) {
    const isReady = ownSeat?.ready ?? false;
    const startingContractOptions = patch?.startingContractOptions ?? [];
    const selectedStartingContract = patch?.selectedStartingContract ?? null;
    const canReady = Boolean(
      patch?.canReady
      && selectedStartingContract
      && onIntent
      && !isReady
      && !choosingStartingMission
      && !pendingStartingContract
      && pendingSetupSubmission?.kind !== "ready"
    );
    const setup = patch?.setup ?? null;
    const canHostStart = Boolean(
      !isLateJoinPending &&
      onStartSession &&
      patch?.selfIsSetupHost &&
      setup?.canStart &&
      setup.actorSeatId === self.seatId &&
      setup.allowedCommand === "start" &&
      !startSubmitting
    );
    const readyDisabledReason =
      patch?.readyDisabledReason ??
      (selectedStartingContract ? "Waiting for room sync" : "Choose a starting mission before Ready");

    return (
      <section className="phone-portrait-controller">
        <div className="phone-portrait-panel phone-portrait-lobby-panel">
          <main ref={lobbyScrollRef} className="phone-portrait-scroll phone-lobby-waiting-scroll phone-mission-setup-scroll" aria-label="Choose mission">
              <section ref={setupStageRef} className="phone-lobby-ready-panel phone-character-waiting-panel phone-mission-setup-surface">
              <header className="phone-mission-setup-header">
                <div>
                  <span>{displayName}</span>
                  <strong>{self.character.name}</strong>
                </div>
                <small>Mission · Step 3 of 3</small>
              </header>

              <section
                ref={startingMissionSectionRef}
                className="phone-character-waiting-section phone-starting-mission-section"
                aria-label="Starting Mission"
              >
                <h1 className="phone-mission-setup-title">
                  {selectedStartingContract && !choosingStartingMission ? "Selected Starting Mission" : "Choose Starting Mission"}
                </h1>
                {selectedStartingContract && !choosingStartingMission ? (
                  <ContractMissionCard contract={selectedStartingContract} selected />
                ) : startingContractOptions.length > 0 ? (
                  <div className="phone-starting-mission-list">
                    {startingContractOptions.map((contract, index) => (
                      <ContractMissionCard
                        key={contract.id}
                        contract={contract}
                        recommended={index === 0}
                        disabled={!onIntent || Boolean(pendingStartingContract) || contract.id === selectedStartingContract?.id}
                        selected={contract.id === (pendingStartingContract?.id ?? selectedStartingContract?.id)}
                        pending={contract.id === pendingStartingContract?.id}
                        onSelect={() => {
                          setPendingStartingContract({ id: contract.id, sequence: patchSequence ?? 0 });
                          setPendingSetupSubmission({ kind: "starting-contract", sequence: patchSequence ?? 0 });
                          setSetupSubmissionRecovery(null);
                          const sent = sendControllerIntent({
                            type: "SELECT_STARTING_CONTRACT",
                            seatId: self.seatId,
                            contractId: contract.id
                          });
                          if (sent === false) {
                            setPendingStartingContract(null);
                            setPendingSetupSubmission(null);
                            setSetupSubmissionRecovery("Restoring latest state. Review the mission before trying again.");
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="phone-muted-copy">Waiting for starting mission options from the room.</p>
                )}
              </section>

              <p className="phone-lobby-ready-state">
                {isReady
                  ? isLateJoinPending ? "You have joined the turn order." : setup?.waitingInstruction ?? "You are ready. Watch the TV."
                  : selectedStartingContract
                    ? "Mission locked. Press Ready when set."
                    : setup?.actorSeatId === self.seatId ? setup.activeInstruction : readyDisabledReason}
              </p>

              <div className={`phone-character-waiting-actions${selectedStartingContract ? "" : " is-mission-unselected"}`}>
                <button
                  type="button"
                  className="phone-button phone-button-primary phone-lobby-ready-button"
                  data-testid="phone-setup-ready-action"
                  disabled={!canReady}
                  onClick={() => {
                    setPendingSetupSubmission({ kind: "ready", sequence: patchSequence ?? 0 });
                    setSetupSubmissionRecovery(null);
                    const sent = sendControllerIntent({ type: "SET_READY", seatId: self.seatId, ready: true });
                    if (!sent) {
                      setPendingSetupSubmission(null);
                      setSetupSubmissionRecovery("Restoring latest state. Review Ready before trying again.");
                    }
                  }}
                >
                  {isLateJoinPending ? "Join Game" : "Ready"}
                </button>
                {selectedStartingContract && !isReady ? (
                  <button
                    type="button"
                    className="phone-button phone-button-secondary phone-lobby-ready-button"
                    onClick={() => {
                      const next = !choosingStartingMission;
                      setChoosingStartingMission(next);
                      if (next) {
                        window.setTimeout(() => startingMissionSectionRef.current?.scrollIntoView?.({ block: "start" }), 0);
                      }
                    }}
                  >
                    {choosingStartingMission ? "Keep Current Mission" : "Change Mission"}
                  </button>
                ) : onLobbyBack ? (
                  <button type="button" className="phone-button phone-button-secondary phone-lobby-ready-button" onClick={onLobbyBack}>
                    Leave Room
                  </button>
                ) : null}
                {patch?.selfIsSetupHost ? (
                  <button
                    type="button"
                    className="phone-button phone-button-primary phone-lobby-ready-button"
                    data-testid="phone-setup-start-action"
                    disabled={!canHostStart}
                    onClick={onStartSession}
                  >
                    {startSubmitting ? "Starting..." : "Start Game"}
                  </button>
                ) : null}
              </div>
              {setupSubmissionRecovery ? <p className="phone-submission-recovery" role="status">{setupSubmissionRecovery}</p> : null}
              {patch?.selfIsSetupHost ? (
                <section className="phone-setup-blockers" aria-live="polite">
                  <strong>{setup?.canStart ? "Ready to begin" : "Start requirements"}</strong>
                  {setup?.canStart ? (
                    <span>{setup.publicInstruction}</span>
                  ) : setup?.startBlockers?.length ? (
                    <ul>{setup.startBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                  ) : (
                    <span>{setup?.startReason ?? "Waiting for room setup."}</span>
                  )}
                </section>
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

            </section>
          </main>
        </div>
      </section>
    );
  }

  if (replacementMissionActive && patch?.pendingMissionSelection) {
    return (
      <PhoneMissionReplacementView
        displayName={displayName}
        operativeName={self.character.name}
        options={patch.pendingMissionSelection.options}
        pendingContractId={pendingActiveContract?.id ?? null}
        recoveryMessage={setupSubmissionRecovery}
        stageRef={replacementMissionStageRef}
        onSelect={(contractId) => {
          setPendingActiveContract({ id: contractId, sequence: patchSequence ?? 0 });
          setPendingSetupSubmission({ kind: "replacement-contract", sequence: patchSequence ?? 0 });
          setSetupSubmissionRecovery(null);
          const sent = sendControllerIntent({
            type: "SELECT_REPLACEMENT_CONTRACT",
            seatId: self.seatId,
            selectionId: patch.pendingMissionSelection!.id,
            contractId
          });
          if (sent === false) {
            setPendingActiveContract(null);
            setPendingSetupSubmission(null);
            setSetupSubmissionRecovery("Restoring latest state. Review the mission before trying again.");
          }
        }}
      />
    );
  }

  const movementFlowActive = Boolean(
    activeTab === "move" &&
    (patch?.phase === "navigation" || patch?.movementPlanner?.active || patch?.outcomeSummary?.movedToSectorId)
  );
  const scarSelectorActive = Boolean(patch?.pendingScarChoice);
  const rootClassName = [
    "phone-portrait-controller",
    "phone-ui-streamlined",
    "signal-phone-shell",
    phoneChromeVisible ? "phone-shell--chrome-visible" : "phone-shell--immersive",
    bottomDockExpanded ? "phone-shell--bottomdock-expanded" : "phone-shell--bottomdock-compact",
    focusedResolutionActive ? "phone-shell--battle-active" : "",
    challengeTrialActive ? "phone-shell--trial-active" : "",
    movementFlowActive ? "phone-shell--movement-active" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const bottomNavClassName = [
    "phone-portrait-bottom-nav",
    "phone-bottomnav",
    "signal-phone-nav",
    bottomDockExpanded ? "phone-bottomdock--expanded" : "phone-bottomdock--compact"
  ]
    .filter(Boolean)
    .join(" ");
  const contentClassName = [
    "phone-portrait-scroll",
    "signal-phone-shell__content",
    phoneChromeHidden ? "phone-content--expanded" : "",
    focusedResolutionActive ? "phone-battle-content" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const scarCount = self.character.scars.length;
  const scarCards = self.character.scarCards ?? [];
  const afflictions = self.character.afflictions ?? { faceup: [], facedownCount: 0 };
  const pendingTestModifiers = patch?.pendingTestModifiers ?? [];
  const relevantStat = patch?.activeResolution?.battle?.stat
    ?? patch?.pendingCooperativeTest?.stat
    ?? patch?.encounter?.stat
    ?? null;
  const orderedStats = relevantStat
    ? [relevantStat, ...statOrder.filter((stat) => stat !== relevantStat)]
    : statOrder;
  const handleMovementNavigation = (target: MovementNavigationTarget): void => {
    if (target === "player") {
      navigateToTab("player");
      return;
    }
    if (target === "inventory") {
      navigateToTab("inventory");
      return;
    }
    showBottomDock();
  };
  const requiredAction = patch?.requiredAction ?? null;
  const commandTab: SignalPhoneCommandTab = isTurnActionTab(activeTab)
    ? activeTab
    : actionGuidance?.requiredTab ?? "move";
  const requiredActionStatus: RequiredActionStatus = qaRequiredActionState?.status ?? (pendingRequiredIntent
    ? "submitting"
    : requiredAction?.canAct
      ? "available"
      : requiredAction?.kind === "battle" || requiredAction?.kind === "test" || requiredAction?.kind === "consequence" || requiredAction?.kind === "result"
        ? "resolving"
        : "blocked");
  const sendRequiredIntent = (intent: ClientIntent): void => {
    if (!onIntent || pendingRequiredIntent) return;
    const commitsRequiredAction = Boolean(requiredAction?.canAct && isCommittingRequiredActionIntent(intent));
    if (commitsRequiredAction) {
      setPendingRequiredIntent({
        projectionId: requiredAction!.id,
        sequence: patchSequence ?? 0,
        label: submittingLabel(intent)
      });
    }
    const sent = sendControllerIntent(intent);
    if (sent === false && commitsRequiredAction) {
      setActionRecovery({
        message: "Restoring latest state. The action will not be sent again automatically.",
        sequence: patchSequence ?? 0
      });
      setAwaitingRequiredActionResynchronization(true);
      if (!connectionSynchronized) setRequiredActionDisconnectObserved(true);
    }
  };
  const renderRequiredAction = (content?: ReactElement, compact = false): ReactElement | null => {
    if (!requiredAction) return content ?? null;
    return (
      <PhoneRequiredActionShell
        projection={requiredAction}
        status={requiredActionStatus}
        statusLabel={qaRequiredActionState?.label ?? pendingRequiredIntent?.label}
        atRequiredTab={requiredAction.requiredTab === activeTab}
        compact={compact}
        recoveryMessage={actionRecovery?.message}
        onReturnToAction={requiredAction.requiredTab ? () => navigateToTab(requiredAction.requiredTab!, "required") : undefined}
      >
        {content}
      </PhoneRequiredActionShell>
    );
  };

  return (
    <section
      className={rootClassName}
      data-phone-chrome-visible={phoneChromeVisible ? "true" : "false"}
      data-phone-bottom-dock-expanded={bottomDockExpanded ? "true" : "false"}
    >
      <div className="phone-portrait-panel">
        {phoneChromeVisible ? (
          <SignalPhoneIdentityRail
            characterId={self.character.id}
            characterName={self.character.name}
            displayName={displayName}
            wounds={self.character.wounds}
            salvage={self.character.salvage ?? 0}
            sectorId={self.sectorId}
          />
        ) : (
          <header className="signal-phone-compact-status phone-topbar--compact" aria-label="Compact player status">
            <strong>{self.character.name}</strong>
            <span>
              {self.character.wounds} wounds | {self.character.salvage ?? 0} Salvage | {scarCount} scars
            </span>
          </header>
        )}

        <main
          ref={phoneScrollRef}
          className={contentClassName}
          aria-label="Phone content"
          aria-hidden={bottomDockExpanded ? "true" : undefined}
          inert={bottomDockExpanded ? true : undefined}
        >
          {focusedResolutionActive && patch && onIntent ? (
            <div className="phone-portrait-screen phone-portrait-screen-command phone-portrait-screen-battle" data-testid="phone-action-screen">
              {matchEnded ? (
                <PhoneActionPanel
                  key={`focused-action:${patch.requiredAction?.id ?? "none"}:${actionRecovery?.sequence ?? "stable"}`}
                  characters={characters}
                  onIntent={sendRequiredIntent}
                  patch={patch}
                  requiredActionSubmissionPending={Boolean(pendingRequiredIntent)}
                  selectedTurnTab={focusedResolutionTab}
                  hideTurnTabs
                  onLeaveRoom={handleLeave}
                />
              ) : renderRequiredAction(
                <PhoneActionPanel
                  key={`focused-action:${patch.requiredAction?.id ?? "none"}:${actionRecovery?.sequence ?? "stable"}`}
                  characters={characters}
                  onIntent={sendRequiredIntent}
                  patch={patch}
                  requiredActionSubmissionPending={Boolean(pendingRequiredIntent)}
                  selectedTurnTab={focusedResolutionTab}
                  hideTurnTabs
                  onLeaveRoom={handleLeave}
                />
              )}
            </div>
          ) : null}

          {!focusedResolutionActive && activeTab === "player" && (
            <div className="phone-portrait-screen">
              {renderRequiredAction(undefined, true)}
              <section className="phone-portrait-hero-card">
                <div className="phone-portrait-art">
                  <img src={getCharacterPortraitPath(self.character.id)} alt={self.character.name} />
                </div>
                <div className="phone-portrait-hero-copy">
                  <p className="phone-panel-kicker">{activeSeatId === self.seatId ? "Active turn" : "Standby"}</p>
                  <h2>{displayName}</h2>
                  <p>{self.character.name} · {self.character.archetype}</p>
                  <div className="phone-portrait-chip-row">
                    <span>{roomCode}</span>
                    <span>{displayName}</span>
                    <span>{connectionStatus}</span>
                    <span>{self.character.status}</span>
                  </div>
                </div>
              </section>

              <section className={`phone-player-essential-state${requiredAction && (!requiredAction.canAct || requiredAction.waiting) ? " is-waiting-summary" : ""}`} aria-label="Essential operative state">
                {requiredAction && (!requiredAction.canAct || requiredAction.waiting) ? null : (
                  <div>
                    <span>Current context</span>
                    <strong>{actionGuidance?.title ?? "Operative ready"}</strong>
                    <small>{actionGuidance?.detail ?? `Holding at ${self.sectorId}`}</small>
                  </div>
                )}
                <dl className="phone-portrait-vitals">
                  <span className="visually-hidden">Wounds {self.character.wounds} · Scars {scarCount} · Salvage {self.character.salvage ?? 0} · Status {self.character.status}</span>
                  <div><dt>Wounds</dt><dd>{self.character.wounds}</dd></div>
                  <div><dt>Scars</dt><dd>{scarCount}</dd></div>
                  <div><dt>Salvage</dt><dd>{self.character.salvage ?? 0}</dd></div>
                  <div><dt>Status</dt><dd>{self.character.status}</dd></div>
                </dl>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">{relevantStat ? `${statLabelById[relevantStat]} test` : "Stats"}</div>
                <div className="phone-portrait-attributes" aria-label="Character stats">
                  {orderedStats.map((stat) => (
                    <PortraitStatCard
                      key={stat}
                      self={self}
                      stat={stat}
                      suppressedInstanceIds={suppressedEquipmentInstanceIds}
                      expanded={expandedStat === stat}
                      onToggle={() => setExpandedStat((current) => (current === stat ? null : stat))}
                      relevant={stat === relevantStat}
                    />
                  ))}
                </div>
              </section>

              <section className="phone-portrait-section" aria-label="Equipped gear bonuses">
                <div className="phone-sheet-section-heading">Equipped Gear</div>
                <div className="phone-player-equipped-grid">
                  {gearSlots.map((slot) => {
                    const item = getEquippedGearItem(self.character, slot);
                    const suppressed = Boolean(item?.instanceId && suppressedEquipmentInstanceIds.has(item.instanceId));
                    const abilityState = item ? getEquipmentAbilityState(item) : null;
                    return (
                      <article key={slot} className={`phone-player-equipped-card${suppressed ? " is-suppressed" : ""}`}>
                        <span>{gearSlotLabelById[slot]}</span>
                        <strong>{item?.name ?? "Empty"}</strong>
                        {item ? (
                          <small>{suppressed ? `${formatEquippedPassiveBonus(item)} · SUPPRESSED` : formatEquippedPassiveBonus(item)}</small>
                        ) : null}
                        {abilityState ? <em aria-label={abilityState.toLowerCase()}>{abilityState}</em> : null}
                      </article>
                    );
                  })}
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
                    onIntent={sendControllerIntent}
                  />
                  {localUnboundNemeses.map((nemesis) => (
                    <BoundNemesisPanel
                      key={nemesis.id}
                      heading="Nemesis on your space"
                      nemesis={nemesis}
                      self={self}
                      crownKeyFragments={patch.crownKeyFragments ?? 0}
                      assistSeatIds={patch.eligibleNemesisAssistSeatIds ?? []}
                      onIntent={sendControllerIntent}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {!focusedResolutionActive && activeTab === "inventory" && (
            <div className="phone-portrait-screen">
              {renderRequiredAction(undefined, true)}
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Inventory</div>
                {patch && onIntent ? (
                  <PhoneInventoryPanel
                    patch={patch}
                    onIntent={sendControllerIntent}
                  />
                ) : (
                  <p className="phone-muted-copy">Inventory appears when the room syncs.</p>
                )}
              </section>
            </div>
          )}

          {!focusedResolutionActive && activeTab === "quests" && (
            <div className="phone-portrait-screen phone-objectives-screen">
              {renderRequiredAction(undefined, true)}
              <div className="phone-objective-groups" aria-label="Objective categories">
                <ObjectiveDisclosure
                  label="Shared Mission"
                  summary={sharedMission?.stageLabel ?? "Room objective"}
                  icon="shared-mission"
                  initiallyOpen
                >
                <article className="phone-portrait-info-card phone-scenario-quest-card" data-testid="phone-shared-mission-summary">
                  <PhoneScenarioArt path={sharedMission?.artPath} title={sharedMission?.title ?? "Selected scenario"} />
                  <div className="phone-objective-status-line">
                    <span>{sharedMission?.stageLabel ?? "Awaiting Mission"}</span>
                    <strong>{sharedMission?.state ?? "inactive"}</strong>
                  </div>
                  <strong>{sharedMission?.title ?? "No active scenario"}</strong>
                  <p>{sharedMission?.instruction ?? "The shared objective appears when the host starts the room."}</p>
                  {sharedMission?.progress ? (
                    <div className="phone-shared-mission-progress" aria-label={`${sharedMission.progress.label} ${sharedMission.progress.current}/${sharedMission.progress.required}`}>
                      <span>Win Progress · {sharedMission.progress.label}</span>
                      <strong>{sharedMission.progress.current}/{sharedMission.progress.required}</strong>
                    </div>
                  ) : null}
                  {sharedMission?.lossPressure ? (
                    <div className="phone-shared-mission-progress phone-shared-mission-pressure" aria-label={`Loss Pressure ${sharedMission.lossPressure.current}/${sharedMission.lossPressure.required}`}>
                      <span>Loss Pressure</span>
                      <strong>{sharedMission.lossPressure.current}/{sharedMission.lossPressure.required}</strong>
                      <small>If this reaches the limit, the scenario fails.</small>
                    </div>
                  ) : null}
                  {sharedMission?.thresholdWarning ? (
                    <div className={`phone-shared-mission-warning is-${sharedMission.thresholdWarning.level}`} role="status">
                      <strong>{sharedMission.thresholdWarning.label}</strong>
                      <span>{sharedMission.thresholdWarning.detail}</span>
                    </div>
                  ) : null}
                  {sharedMission?.finalStage ? (
                    <div className="phone-shared-mission-final" aria-label="Final stage">
                      <span>Final Stage Â· {sharedMission.finalStage.locationName}</span>
                      <strong>{sharedMission.finalStage.title}</strong>
                      <p>{sharedMission.finalStage.publicInstruction}</p>
                      {sharedMission.finalStage.progressLabel ? <small>{sharedMission.finalStage.progressLabel}</small> : null}
                    </div>
                  ) : null}
                  {sharedMission?.progressChange ? (
                    <p className="phone-shared-mission-change is-win">Victory Progress {sharedMission.progressChange.value !== null ? `${sharedMission.progressChange.value >= 0 ? "+" : ""}${sharedMission.progressChange.value}` : "updated"}: {sharedMission.progressChange.reason}</p>
                  ) : null}
                  {sharedMission?.pressureChange ? (
                    <p className="phone-shared-mission-change is-loss">Loss Pressure {sharedMission.pressureChange.value !== null ? `${sharedMission.pressureChange.value >= 0 ? "+" : ""}${sharedMission.pressureChange.value}` : "updated"}: {sharedMission.pressureChange.reason}</p>
                  ) : null}
                  {sharedMission?.nextInstruction ? <p className="phone-scenario-next-action">Next: {sharedMission.nextInstruction}</p> : null}
                  <details className="phone-objective-lore">
                    <summary>View Mission briefing</summary>
                    <p>{sharedMission?.premise ?? "Awaiting scenario briefing."}</p>
                    {sharedMission?.conditions.length ? (
                      <ul>{sharedMission.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
                    ) : null}
                  </details>
                  <ResultDeltaRow deltas={scenarioDeltas} className="phone-scenario-deltas" />
                </article>
                </ObjectiveDisclosure>
                <ObjectiveDisclosure
                  label="My Contracts"
                  summary={
                    activeMissionCards.length > 0
                      ? `${activeMissionCards.length}/3 active`
                      : "Private objectives"
                  }
                  icon="contract"
                  initiallyOpen
                >
                  {activeMissionStates.length > 0 ? (
                    activeMissionStates.map((activeMission) => (
                      <ActiveMissionQuestCard
                        key={activeMission.contractId}
                        activeContract={activeMission}
                        contract={
                          activeMissionCards.find((contract) => contract.id === activeMission.contractId) ?? null
                        }
                      />
                    ))
                  ) : (
                    <ActiveMissionQuestCard activeContract={null} contract={null} />
                  )}
                </ObjectiveDisclosure>
              {patch?.privateRivalry ? (
                  <ObjectiveDisclosure
                    label="Rivalry"
                    summary="Private contest"
                    icon="rivalry"
                    initiallyOpen
                >
                  <RivalryQuestPanel rivalry={patch.privateRivalry} seatId={self.seatId} onIntent={sendControllerIntent} />
                </ObjectiveDisclosure>
              ) : null}
              <ObjectiveDisclosure
                label="Completed"
                summary={completedContracts.length > 0 ? "Archived contracts" : "No archived contracts"}
                icon="completed"
                count={completedContracts.length}
                initiallyOpen={completedContracts.length > 0}
              >
              {completedContracts.length > 0 ? (
                  <div className="phone-portrait-info-card phone-completed-contracts">
                    <div className="phone-completed-contract-list">
                      {completedContracts.map((contract) => (
                        <article key={`${contract.title}-${contract.completedAtSequence}`}>
                          <strong>{contract.title}</strong>
                          <span>{contract.spent ? "Spent for requisition" : contract.rewardGranted ? "Reward granted" : "Archived"}</span>
                        </article>
                      ))}
                    </div>
                  </div>
              ) : <p className="phone-muted-copy">Completed Contracts are archived here without crowding active objectives.</p>}
              </ObjectiveDisclosure>
              </div>
            </div>
          )}

          {!focusedResolutionActive && isTurnActionTab(activeTab) && (
            <div className="phone-portrait-screen phone-portrait-screen-command" data-testid="phone-action-screen">
              {patch && onIntent ? (
                renderRequiredAction(
                  <PhoneActionPanel
                    key={`turn-action:${patch.requiredAction?.id ?? "none"}:${actionRecovery?.sequence ?? "stable"}`}
                    characters={characters}
                    onIntent={sendRequiredIntent}
                    patch={patch}
                    requiredActionSubmissionPending={Boolean(pendingRequiredIntent)}
                    selectedTurnTab={activeTab}
                    onSelectedTurnTab={setActiveTab}
                    hideTurnTabs
                    onMovementNavigation={handleMovementNavigation}
                    showMovementContextNavigation={false}
                  />
                )
              ) : (
                <section className="phone-portrait-section">
                  <div className="phone-sheet-section-heading">Command Sync</div>
                  <p className="phone-muted-copy">Actions appear when the room syncs.</p>
                </section>
              )}
            </div>
          )}
        </main>

        {!focusedResolutionActive && !scarSelectorActive ? <nav
          ref={bottomDockRef}
          className={bottomNavClassName}
          aria-label="More phone controls"
          onBlur={handleBottomDockBlur}
        >
          {bottomDockExpanded ? (
            <div className="phone-more-menu" role="region" aria-label="All phone controls">
              <SignalPhoneMoreHeading />
              <div className="phone-expanded-tab-grid" role="tablist" aria-label="All phone sections">
                {(Object.keys(signalPhoneTabLabels) as PortraitTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`phone-portrait-tab phone-expanded-tab${activeTab === tab ? " is-active" : ""}`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-label={tab === "player" ? "Operative — Player Card" : signalPhoneTabLabels[tab]}
                    onClick={() => chooseBottomDockTab(tab)}
                  >
                    <span className="phone-tab-icon" aria-hidden="true"><SignalPhoneTabIcon tab={tab} size={20} /></span>
                    <span>{tab === "player" ? "Operative" : signalPhoneTabLabels[tab]}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="phone-portrait-tab phone-portrait-tab-utility phone-tabs-collapse"
                onClick={() => {
                  hideBottomDock();
                  window.setTimeout(() => bottomDockMoreButtonRef.current?.focus(), 0);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="phone-portrait-tab phone-portrait-tab-utility phone-room-menu-action"
                onClick={onLeave}
              >
                Leave Room
              </button>
              <button
                type="button"
                className="phone-portrait-tab phone-portrait-tab-utility phone-display-menu-action"
                onClick={() => {
                  hideBottomDock();
                  if (phoneChromeVisible) hidePhoneChrome();
                  else showPhoneChrome();
                }}
              >
                {phoneChromeVisible ? "Hide UI" : "Show UI"}
              </button>
              {fullscreen.supported ? <button
                type="button"
                className="phone-portrait-tab phone-portrait-tab-utility phone-display-menu-action"
                onClick={() => void fullscreen.toggle()}
              >
                {fullscreen.active ? "Exit Full Screen" : "Full Screen"}
              </button> : null}
              {fullscreen.errorMessage ? <span className="phone-fullscreen-error" role="status">{fullscreen.errorMessage}</span> : null}
            </div>
          ) : null}
          <SignalPhoneNavigation
            activeTab={activeTab}
            commandTab={commandTab}
            expanded={bottomDockExpanded}
            onTab={(tab) => chooseBottomDockTab(tab)}
            onMore={() => {
              if (bottomDockExpanded) {
                hideBottomDock();
                window.setTimeout(() => bottomDockMoreButtonRef.current?.focus(), 0);
              } else {
                showBottomDock();
              }
            }}
            moreButtonRef={bottomDockMoreButtonRef}
          />
        </nav> : null}
      </div>
    </section>
  );
}
