import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CardsThreeIcon } from "@phosphor-icons/react/dist/csr/CardsThree";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { LockKeyIcon } from "@phosphor-icons/react/dist/csr/LockKey";
import { MapPinLineIcon } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import type {
  ActiveResolution,
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  GearItem,
  OutcomeSummary,
  PhoneObjectUseState,
  PhonePatchPayload,
  PublicHostViewState,
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicMoveStrategicTag,
  PublicSectorExplorationSummary,
  PublicSectorExplorationThreat,
  PublicTileArrivalState,
  PublicShopCost,
  PublicShopEncounterState,
  ResultDelta,
  ScarSummary,
  SectorNode,
  ShopFailureReason,
  Stat,
  ThreatIcon
} from "../shared/types.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { describeContractObjective, formatContractObjectiveStatus, isContractObjectiveComplete } from "../../game/contracts/objectives.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  describeActiveResolutionRoll,
  formatResolutionModifiers,
  resolutionStageLabel
} from "../shared/resolutionPresentation.js";
import {
  buildCurrentPlayerPrompt,
  buildRoutePreviewCopy,
  buildSectorExplorationCopy,
  type CurrentPlayerPrompt
} from "../shared/explainabilityPrompts.js";
import { ChallengeBadge, ThreatIconBadge, getThreatIconStat, isStat } from "../shared/ChallengeBadge.js";
import { CombatDiceAnimation } from "../shared/CombatDiceAnimation.js";
import { useAuthoritativeResultCollapse } from "../shared/useAuthoritativeResultCollapse.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import { usePhoneBackDismissal } from "./useActiveRoomBackGuard.js";
import { GameButton, type GameButtonTone } from "../shared/GameButton.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { PhoneOptimizedImage } from "../shared/PhoneOptimizedImage.js";
import { getGearCardArtId, getGearCardArtType, getShopCategoryIconPath } from "../shared/assetPaths.js";
import { statLabelById } from "../shared/statLabels.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import {
  PhoneBattleView,
  isOpposedPhoneBattleActive,
  type PhoneBattleChoiceAction
} from "./PhoneBattleView.js";
import { PhoneWrappedMediaCard } from "./PhoneWrappedMediaCard.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";
import { getTileAssetPath } from "../tv/tileAssetManifest.js";
import {
  getSignalTheatreEnvironment,
  signalTheatreEnvironments
} from "../tv/signalTheatreEnvironmentManifest.js";
import { formatTimingWindow, getBattleAssistViewModel, statLabelById as inventoryStatLabelById } from "./inventoryPresentation.js";
import { buildUsefulNowViewModel, type UsefulNowViewModel } from "./usefulNowPresentation.js";
import { getMissionRelevanceForSector, type MissionRelevance } from "../shared/missionRelevance.js";
import {
  PhoneMovementView,
  type MovementNavigationTarget
} from "./PhoneMovementView.js";
import { CinderWattleAbilityPanel } from "./CinderWattleAbilityPanel.js";
import { PhoneScarSelector } from "./PhoneScarSelector.js";
import {
  PhoneHazardChallengeView,
  isPhoneChallengeRelevantToSeat
} from "./PhoneHazardChallengePrototype.js";
import { PhoneResultReadyGate } from "./PhoneResultReadyGate.js";
import { PhoneMovementPresentationWait, PhoneTvPresentationWait } from "./PhoneTvPresentationWait.js";
import {
  PhoneActionPriorityStack,
  buildPhoneActionViewModel,
  type PhoneActionViewModelSources
} from "./PhoneActionPriorityStack.js";

interface PhoneActionPanelProps {
  characters: CharacterCatalogEntry[];
  onIntent: (intent: ClientIntent) => void;
  patch: PhonePatchPayload;
  requiredActionSubmissionPending?: boolean;
  selectedTurnTab?: TurnActionTab;
  onSelectedTurnTab?: (tab: TurnActionTab) => void;
  hideTurnTabs?: boolean;
  onMovementNavigation?: (target: MovementNavigationTarget) => void;
  showMovementContextNavigation?: boolean;
  onLeaveRoom?: () => void;
  suppressTvPresentationWait?: boolean;
}

export type PhoneArrivalPresentation = "cinematic" | "overlay";

export const DEFAULT_PHONE_ARRIVAL_PRESENTATION: PhoneArrivalPresentation = "cinematic";

export function resolvePhoneArrivalPresentation(
  search: string,
  developmentMode: boolean
): PhoneArrivalPresentation {
  if (!developmentMode) return DEFAULT_PHONE_ARRIVAL_PRESENTATION;
  return new URLSearchParams(search).get("arrivalUi") === "overlay"
    ? "overlay"
    : DEFAULT_PHONE_ARRIVAL_PRESENTATION;
}

export function PhoneTileArrivalSummary({ arrival, compact = false }: { arrival: PublicTileArrivalState | null | undefined; compact?: boolean }): ReactElement | null {
  const reducedMotion = useReducedMotion();
  const [showArrivalNotice, setShowArrivalNotice] = useState(false);
  const arrivalId = arrival?.arrivalId ?? null;

  useEffect(() => {
    if (!arrivalId || typeof window === "undefined") {
      setShowArrivalNotice(false);
      return;
    }
    const storageKey = `ashenreach:arrival-presented:${arrivalId}`;
    if (window.sessionStorage.getItem(storageKey) === "1") {
      setShowArrivalNotice(false);
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
    if (reducedMotion) {
      setShowArrivalNotice(false);
      return;
    }
    setShowArrivalNotice(true);
    const timer = window.setTimeout(() => setShowArrivalNotice(false), 150);
    return () => window.clearTimeout(timer);
  }, [arrivalId, reducedMotion]);

  if (!arrival) return null;
  const arrivalOption = resolvePhoneArrivalPresentation(
    typeof window !== "undefined" ? window.location.search : "",
    import.meta.env.DEV
  );
  const currentRule = arrival.rules.find((rule) => rule.status === "current") ?? null;
  const remainingRules = arrival.rules.filter((rule) => rule.id !== currentRule?.id && rule.status !== "completed");
  const remainingMandatory = remainingRules.filter((rule) => rule.mandatory).length;
  const remainingOptional = remainingRules.filter((rule) => !rule.mandatory).length;
  const renderRule = (rule: PublicTileArrivalState["rules"][number]) => {
    const RuleIcon =
      rule.kind === "tile-challenge" ? ArrowClockwiseIcon
        : rule.kind === "threat-draw" ? CardsThreeIcon
          : rule.kind === "scenario" ? FlagIcon
            : rule.kind === "service" ? StorefrontIcon
              : rule.kind === "gate" ? LockKeyIcon
                : MapPinLineIcon;
    const StatusIcon = rule.status === "completed" ? CheckCircleIcon : rule.status === "locked" ? LockKeyIcon : CircleIcon;
    const recurs = rule.repeatPolicy === "EVERY_ARRIVAL" && rule.kind === "tile-challenge";
    const statusLabel =
      rule.status === "current" ? "NEXT"
        : rule.status === "completed" ? recurs ? "DONE · RECURS" : "DONE"
          : rule.status === "optional" ? "OPTIONAL"
            : rule.status.toUpperCase();
    return (
      <li key={rule.id} className={`is-${rule.status}`} data-rule-kind={rule.kind} data-repeat-policy={rule.repeatPolicy}>
        <span className="phone-tile-arrival__rule-icon" aria-hidden="true"><RuleIcon weight="duotone" /></span>
      <div><strong>{rule.label}</strong><small>{rule.detail}</small></div>
        <b><StatusIcon weight="fill" aria-hidden="true" />{statusLabel}</b>
      </li>
    );
  };
  if (compact) {
    return (
      <section className="phone-tile-arrival phone-tile-arrival--compact" aria-label={`${arrival.tileName} arrival resolution`}>
        <header>
          <div><span>Tile arrival</span><h2>{arrival.tileName}</h2></div>
          <strong>{arrival.mandatoryRemaining > 0 ? `${arrival.mandatoryRemaining} mandatory` : "Optional actions"}</strong>
        </header>
        <ol className="phone-tile-arrival__queue" aria-label="Arrival queue">
          {arrival.rules.map(renderRule)}
        </ol>
        <details className="phone-tile-arrival__context-details">
          <summary>Sector context</summary>
          <p>{arrival.lore}</p>
          {!arrival.canEndTurn && arrival.blockedReason ? <div className="phone-tile-arrival__blocked">MANDATORY · {arrival.blockedReason}</div> : null}
        </details>
      </section>
    );
  }
  return (
    <section
      className={`phone-tile-arrival phone-tile-arrival--${arrivalOption}${showArrivalNotice ? " is-arriving" : ""}`}
      aria-label={`${arrival.tileName} arrival resolution`}
      data-arrival-ui={arrivalOption}
      data-arrival-option={arrivalOption === DEFAULT_PHONE_ARRIVAL_PRESENTATION ? "a" : "b"}
      data-testid="phone-tile-arrival-presentation"
    >
      {showArrivalNotice ? <div className="phone-tile-arrival__notice" role="status">Arrived</div> : null}
      <header>
        <div><span>Tile arrival</span><h2>{arrival.tileName}</h2></div>
        <strong>{arrival.mandatoryRemaining > 0 ? `${arrival.mandatoryRemaining} mandatory` : "Optional actions"}</strong>
      </header>
      <ol className="phone-tile-arrival__queue" aria-label="Arrival queue">
        {arrival.rules.map(renderRule)}
      </ol>
      {!arrival.canEndTurn && arrival.blockedReason ? <div className="phone-tile-arrival__blocked">MANDATORY · {arrival.blockedReason}</div> : null}
      {getTileAssetPath(arrival.tileId) ? (
        <div className="phone-tile-arrival__art" aria-hidden="true">
          <PhoneOptimizedImage src={getTileAssetPath(arrival.tileId)!} alt="" />
        </div>
      ) : null}
      <details className="phone-tile-arrival__lore">
        <summary>Tile lore and public details</summary>
        <p>{arrival.lore}</p>
      </details>
      {remainingRules.length > 0 ? (
        <p className="phone-tile-arrival__remaining-count">
          {remainingMandatory} mandatory · {remainingOptional} optional remain
        </p>
      ) : null}
    </section>
  );
}

function ScarDecisionPanel({
  mode,
  cards,
  source,
  currentCount,
  warning,
  salvageCost,
  canPay = true,
  onChoose
}: {
  mode: "choose" | "remove";
  cards: ScarSummary[];
  source?: ScarSummary["source"];
  currentCount: number;
  warning: boolean;
  salvageCost?: 4;
  canPay?: boolean;
  onChoose: (scarId: string) => void;
}): ReactElement {
  return (
    <section className={`phone-scar-decision phone-scar-decision--${mode}`} aria-label={mode === "choose" ? "Choose Your Scar" : "Purge a Scar"}>
      <header className="phone-scar-decision__header">
        <span>{mode === "choose" ? "The Wound Did Not Close" : "Sable Machine Choir"}</span>
        <h2>{mode === "choose" ? "Choose Your Scar" : "Purge a Scar"}</h2>
        <p>{mode === "choose"
          ? `Choose one permanent cursed adaptation. ${source ? `${source.toUpperCase()} source.` : ""} Current Scars: ${currentCount}.`
          : `Pay exactly ${salvageCost ?? 4} Salvage to remove one owned Scar. This service is once per arrival.`}</p>
        {warning ? <strong className="phone-scar-decision__warning">THIRD SCAR — choosing either card retires this operative after the current resolution finishes.</strong> : null}
      </header>
      <div className="phone-scar-decision__cards">
        {cards.map((scar) => (
          <article className="phone-scar-choice-card" key={scar.id}>
            <PhoneInspectableCardArt
              cardType="scar"
              cardId={scar.id}
              title={scar.title}
              lore={scar.origin ?? scar.text}
              rules={`Burden: ${scar.burdenText ?? scar.penalty} Adaptation: ${scar.adaptationText ?? scar.upside ?? "None"}`}
              className="phone-scar-choice-card__art"
              testId={`phone-scar-art-${scar.id}`}
            />
            <div className="phone-scar-choice-card__copy">
              <span>{(scar.source ?? source ?? "unbound").toUpperCase()} SCAR</span>
              <h3>{scar.title}</h3>
              <p><b>Burden</b>{scar.burdenText ?? scar.penalty}</p>
              <p><b>Adaptation</b>{scar.adaptationText ?? scar.upside ?? "No adaptation authored."}</p>
              <GameButton aria-label={mode === "choose" ? `Choose ${scar.title}` : `Purge ${scar.title} for ${salvageCost ?? 4} Salvage`} tone={mode === "choose" ? "danger" : "primary"} disabled={!canPay} disabledReason={!canPay ? `Requires ${salvageCost ?? 4} Salvage` : undefined} onClick={() => onChoose(scar.id)}>
                {mode === "choose" ? "Choose" : `Purge · ${salvageCost ?? 4}`}
              </GameButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CooperativeAssistancePanel({
  patch,
  seatId,
  onIntent
}: {
  patch: PhonePatchPayload;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement {
  const [selectedHelpers, setSelectedHelpers] = useState<string[]>([]);
  const [choosingHelpers, setChoosingHelpers] = useState(false);
  const request = patch.cooperativeAssistance ?? null;
  const eligibility = patch.cooperativeAssistanceEligibility ?? null;
  const pendingTest = patch.pendingCooperativeTest ?? null;
  const resolvedAssistance = patch.activeResolution?.assistance?.activeSeatId === seatId
    ? patch.activeResolution.assistance
    : null;
  const stat = request?.testedStat ?? eligibility?.testedStat ?? pendingTest?.stat ?? resolvedAssistance?.testedStat ?? "command";
  const sourceTitle = request?.sourceTitle ?? eligibility?.sourceTitle ?? pendingTest?.sourceTitle ?? patch.activeResolution?.card?.title ?? "Skill test";
  const testedStat = statLabelById[stat];
  const requestedSelf = request?.viewerRole === "requested";
  const activeSelf = request?.viewerRole === "active" || (!request && Boolean(eligibility || pendingTest || resolvedAssistance));
  const ownResponse = request?.requestedHelpers.find((helper) => helper.seatId === seatId)?.response;
  const acceptedCount = request?.requestedHelpers.filter((helper) => helper.response === "accepted").length ?? 0;
  const pendingCount = request?.requestedHelpers.filter((helper) => helper.response === "pending").length ?? 0;
  const allResponded = Boolean(request) && pendingCount === 0;
  const roll = () => {
    if (pendingTest) {
      onIntent({ type: "COOPERATIVE_TEST_ROLL_REQUESTED", seatId, testId: pendingTest.id });
      return;
    }
    if (!patch.encounter) return;
    onIntent({
      type: patch.encounter.cardType === "enemy" ? "COMBAT_REQUESTED" : "CHECK_REQUESTED",
      seatId,
      stat: patch.encounter.stat
    });
  };

  return (
    <section className="phone-assistance-shell" aria-label="Cooperative assistance" data-testid="cooperative-assistance-panel">
      <header className="phone-assistance-header">
        <p className="phone-panel-kicker">Ask for help</p>
        <h2>{sourceTitle}</h2>
        <p>{testedStat} test · helpers add base skill only · no helper dice</p>
        {activeSelf ? <CinderWattleAbilityPanel patch={patch} seatId={seatId} onIntent={onIntent} /> : null}
      </header>

      {!request && eligibility && !choosingHelpers ? (
        <div className="phone-assistance-actions">
          {!pendingTest?.requiresHelper ? <GameButton type="button" tone="secondary" onClick={roll}>Continue without help</GameButton> : null}
          <GameButton type="button" tone="action" onClick={() => setChoosingHelpers(true)}>Ask for Help</GameButton>
        </div>
      ) : null}

      {!request && eligibility && choosingHelpers ? (
        <>
          <div className="phone-assistance-helper-list" aria-label="Eligible helpers">
            {eligibility.helpers.map((helper) => {
              const selected = selectedHelpers.includes(helper.seatId);
              return (
                <button
                  type="button"
                  key={helper.seatId}
                  className={`phone-assistance-helper${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedHelpers((current) =>
                    selected
                      ? current.filter((id) => id !== helper.seatId)
                      : current.length < 2
                        ? [...current, helper.seatId]
                        : current
                  )}
                >
                  <span>{helper.playerName}</span>
                  <small>{helper.characterName}</small>
                  <strong>+{helper.contribution} {testedStat}</strong>
                </button>
              );
            })}
          </div>
          <div className="phone-assistance-actions">
            <GameButton type="button" tone="secondary" onClick={() => { setSelectedHelpers([]); setChoosingHelpers(false); }}>Cancel</GameButton>
            <GameButton
              type="button"
              tone="action"
              disabled={selectedHelpers.length === 0}
              onClick={() => onIntent({
                type: "COOPERATIVE_ASSISTANCE_REQUESTED",
                seatId,
                sourceId: eligibility.sourceId,
                stat: eligibility.testedStat,
                helperSeatIds: selectedHelpers
              })}
            >
              Ask {selectedHelpers.length || "for"} help{selectedHelpers.length === 1 ? "er" : "ers"}
            </GameButton>
          </div>
        </>
      ) : null}

      {request ? (
        <div className="phone-assistance-status-list">
          {request.requestedHelpers.map((helper) => (
            <div key={helper.seatId} className={`phone-assistance-status is-${helper.response}`}>
              <span>{helper.playerName}</span>
              <strong>{helper.response === "accepted" ? `Accepted +${helper.contribution ?? 0}` : helper.response}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {requestedSelf && ownResponse === "pending" ? (
        <div className="phone-assistance-request">
          <p><strong>{request!.activePlayerName}</strong> asks for your {testedStat} {request!.viewerContribution ?? 0}.</p>
          <div className="phone-assistance-actions">
            <GameButton type="button" tone="secondary" onClick={() => onIntent({ type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId, requestId: request!.id, accept: false })}>Decline</GameButton>
            <GameButton type="button" tone="action" onClick={() => onIntent({ type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId, requestId: request!.id, accept: true })}>Accept +{request!.viewerContribution ?? 0}</GameButton>
          </div>
        </div>
      ) : requestedSelf ? (
        <p className="phone-assistance-waiting">Response recorded: {ownResponse}. Waiting for {request!.activePlayerName}.</p>
      ) : null}

      {activeSelf && request?.status === "requested" ? (
        <div className="phone-assistance-actions">
          <GameButton type="button" tone="secondary" onClick={() => onIntent({ type: "COOPERATIVE_ASSISTANCE_CANCELLED", seatId, requestId: request.id })}>Change helpers</GameButton>
          <GameButton
            type="button"
            tone="action"
            disabled={Boolean(pendingTest?.requiresHelper && acceptedCount === 0) || (!allResponded && acceptedCount === 0)}
            onClick={() => onIntent({ type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId, requestId: request.id })}
          >
            {acceptedCount === 0 ? "Proceed without help" : `Proceed with ${acceptedCount} helper${acceptedCount === 1 ? "" : "s"}`}
          </GameButton>
        </div>
      ) : null}

      {activeSelf && request?.status === "locked" ? (
        <div className="phone-assistance-actions is-primary-only">
          <GameButton type="button" tone="action" onClick={roll}>Roll {testedStat} · +{request.acceptedTotal} help</GameButton>
        </div>
      ) : null}

      {resolvedAssistance && patch.activeResolution?.roll ? (
        <div className="phone-assistance-result" aria-label="Assisted roll result">
          <p className="phone-panel-kicker">Assisted result</p>
          <div className="phone-assistance-result__rows">
            <span>Active effective stat <strong>{patch.activeResolution.roll.modifierTotal - resolvedAssistance.total}</strong></span>
            <span>Active die <strong>+{patch.activeResolution.roll.baseTotal}</strong></span>
            {resolvedAssistance.contributions.map((contribution) => {
              const helper = patch.seats.find((seat) => seat.seatId === contribution.seatId);
              return <span key={contribution.seatId}>{helper?.displayName ?? contribution.seatId} assisted <strong>+{contribution.value}</strong></span>;
            })}
            <span className="is-final">Final total <strong>{patch.activeResolution.roll.finalTotal}</strong></span>
          </div>
          <p className="phone-assistance-result__outcome">{patch.activeResolution.outcome?.title ?? (patch.activeResolution.roll.success ? "Success" : "Failure")}</p>
        </div>
      ) : null}

      {!activeSelf && !requestedSelf ? (
        <p className="phone-assistance-waiting">Waiting for {request?.activePlayerName ?? "the active operative"} to resolve assistance.</p>
      ) : null}
    </section>
  );
}

interface ActionButtonDefinition {
  key: string;
  label: string;
  detail?: string;
  tone: "primary" | "secondary";
  stat?: Stat;
  disabled?: boolean;
  disabledReason?: string;
  command?: ClientIntent;
  onClick: () => void;
}

interface ActionSectionDefinition {
  key: string;
  title: string;
  detail?: string;
  actions: ActionButtonDefinition[];
  defaultOpen?: boolean;
}

export type TurnActionTab = "move" | "battle" | "shop" | "action";

interface CurrentPromptViewModel {
  label: string;
  title: string;
  detail: string;
  meta?: string;
  tone: "waiting" | "move" | "battle" | "shop" | "action" | "result";
  targetTab?: TurnActionTab;
  actionLabel?: string;
}

function mapPromptTone(tone: CurrentPlayerPrompt["tone"]): CurrentPromptViewModel["tone"] {
  if (tone === "waiting") {
    return "waiting";
  }

  return tone;
}

function currentPromptFromSharedPrompt(
  prompt: CurrentPlayerPrompt,
  activeTurnTab?: TurnActionTab
): CurrentPromptViewModel {
  const targetTab = prompt.targetTab;
  const detail = prompt.lastOutcomeSummary
    ? `${prompt.privateText} Last change: ${prompt.lastOutcomeSummary}`
    : prompt.privateText;
  const meta = [prompt.actionSummary, prompt.disabledReasons.length > 0 ? prompt.disabledReasons.join(", ") : null]
    .filter(Boolean)
    .join(" | ");

  return {
    label: prompt.phaseLabel,
    title: prompt.requiredAction,
    detail,
    meta,
    tone: mapPromptTone(prompt.tone),
    targetTab,
    actionLabel: targetTab && activeTurnTab !== targetTab ? `Open ${targetTab === "move" ? "Move" : targetTab === "battle" ? "Battle" : targetTab === "shop" ? "Shop" : "Action"}` : undefined
  };
}

interface TurnActionTabDefinition {
  id: TurnActionTab;
  label: string;
  detail: string;
  tone: "move" | "battle" | "shop" | "action";
  enabled: boolean;
  locked?: boolean;
  blockedReason?: string;
}

interface SectorOpportunityItem {
  key: string;
  label: string;
  value: number;
}

interface PhoneMovementTravelState {
  key: string;
  fromSectorName: string;
  toSectorName: string;
  durationMs: number;
  reducedMotion: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

interface CurrentTileViewModel {
  sectorId: string;
  name: string;
  regionLabel: string;
  tags: string[];
  note: string;
  artPath: string | null;
  printedThreatIcons: ThreatIcon[];
  unresolvedThreats: PublicSectorExplorationThreat[];
  drawDueText: string;
  shopText: string;
  actionText: string;
  missionRelevance: MissionRelevance | null;
  occupants: Array<{
    playerId: string;
    name: string;
    characterName: string;
  }>;
}

function actionToneToGameButtonTone(tone: ActionButtonDefinition["tone"]): GameButtonTone {
  return tone === "primary" ? "primary" : "secondary";
}

function getSector(sectors: SectorNode[], sectorId: string): SectorNode | null {
  return sectors.find((sector) => sector.id === sectorId) ?? null;
}

function getActiveSeatId(patch: PhonePatchPayload): string | null {
  return patch.turnOrder[patch.activeSeatIndex] ?? null;
}

function getActiveContractCard(patch: PhonePatchPayload): ContractCard | null {
  return patch.activeContractCard ?? null;
}

function getSectorOpportunityItems(sector: SectorNode | null): SectorOpportunityItem[] {
  if (!sector) {
    return [];
  }

  return [
    { key: "anomaly", label: "Anomaly", value: sector.encounterDecks.anomaly.length },
    { key: "artifact", label: "Salvage", value: sector.encounterDecks.artifact.length },
    { key: "contract", label: "Leads", value: sector.encounterDecks.contract.length },
    { key: "escalation", label: "Stabilize", value: sector.encounterDecks.escalation.length }
  ].filter((entry) => entry.value > 0);
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getObjectUseState(
  patch: PhonePatchPayload,
  source: PhoneObjectUseState["source"],
  id: string
): PhoneObjectUseState | null {
  return patch.objectUseStates?.find((state) => state.source === source && state.id === id) ?? null;
}

function getGearActionDetail(item: GearItem, useState?: PhoneObjectUseState | null): string {
  const baseDetail = item.activeText ?? toTitleCase(item.category ?? "active");

  if (item.useLimit !== "charge") {
    return baseDetail;
  }

  const remaining = useState?.remainingUses ?? item.charges ?? 0;
  const maxUses = useState?.maxUses ?? item.maxUses ?? item.charges ?? null;
  const useCopy = maxUses !== null ? `${remaining}/${maxUses}` : `${remaining}`;
  return `${baseDetail} | ${useCopy} charge${remaining === 1 ? "" : "s"} left`;
}

function formatShopCost(cost: PublicShopCost): string {
  const parts = [
    cost.salvage ? `${cost.salvage} Salvage` : null,
    cost.wounds ? `${cost.wounds} Wound${cost.wounds === 1 ? "" : "s"}` : null,
    cost.trophies ? `${cost.trophies} Trophies` : null,
    cost.completedContracts ? `${cost.completedContracts} Contract${cost.completedContracts === 1 ? "" : "s"}` : null,
    cost.scars ? `${cost.scars} Scar${cost.scars === 1 ? "" : "s"}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "No cost";
}

function ShopItemMedia({ cardId, label, itemType, rules }: { cardId: string; label: string; itemType?: string; rules?: string | null }): ReactElement {
  const cardType = itemType === "artifact" ? getGearCardArtType(cardId, "artifact") : getGearCardArtType(cardId);

  return (
    <PhoneInspectableCardArt
      cardType={cardType}
      cardId={getGearCardArtId(cardId, itemType === "artifact" ? "artifact" : undefined)}
      title={label}
      rules={rules}
      className="phone-wrap-card__image phone-shop-stock-card-art"
    />
  );
}

function ShopCategoryIcon({
  category,
  label,
  className = ""
}: {
  category: string | null | undefined;
  label: string;
  className?: string;
}): ReactElement {
  return (
    <img
      src={getShopCategoryIconPath(category)}
      alt=""
      aria-hidden="true"
      className={`phone-shop-category-icon ${className}`.trim()}
      data-testid="phone-shop-category-icon"
      data-category={category ?? "market"}
      data-fallback-label={label}
    />
  );
}

function MovementTileMedia({ destination }: { destination: PublicMoveDestination }): ReactElement {
  const primaryTag = getPrimaryMovementTag(destination);
  const tileAssetPath = getTileAssetPath(destination.sectorId);

  if (tileAssetPath) {
    return (
      <PhoneOptimizedImage
        src={tileAssetPath}
        alt=""
        className="phone-wrap-card__image phone-movement-tile-image"
        aria-hidden="true"
        data-testid="movement-tile-image"
      />
    );
  }

  return (
    <div
      className={`phone-wrap-card__fallback phone-movement-tile-fallback phone-movement-tile-fallback-${primaryTag}`}
      aria-hidden="true"
      data-testid="movement-tile-fallback"
    >
      <span>{destination.ring.slice(0, 1).toUpperCase()}</span>
      <strong>{destination.distance}</strong>
    </div>
  );
}

const cardImageTypes = new Set<CardImageType>(["threat", "contract", "anomaly", "artifact", "equipment", "follower", "scar", "escalation"]);

function isCardImageType(value: string | null | undefined): value is CardImageType {
  return Boolean(value && cardImageTypes.has(value as CardImageType));
}

function getResolutionCardImageType(
  resolution: ActiveResolution | null | undefined,
  encounter: PhonePatchPayload["encounter"]
): CardImageType | null {
  if (isCardImageType(resolution?.card?.artType)) {
    return resolution.card.artType;
  }

  if (encounter) {
    return "threat";
  }

  if (resolution?.source === "threat" || resolution?.source === "contract" || resolution?.source === "anomaly" || resolution?.source === "artifact") {
    return resolution.source;
  }

  return null;
}

function formatEncounterSourceLabel(source: ActiveResolution["source"] | undefined, cardType: string | null | undefined): string {
  if (cardType) {
    return toTitleCase(cardType);
  }

  switch (source) {
    case "threat":
      return "Threat";
    case "anomaly":
      return "Anomaly";
    case "artifact":
      return "Artifact";
    case "escalation":
      return "Escalation";
    case "contract":
      return "Mission";
    case "scenario":
      return "Scenario";
    case "movement":
      return "Encounter";
    default:
      return "Encounter";
  }
}

function formatEncounterIntentLabel(cardType: string | null | undefined, stat: Stat | null): string {
  if (cardType === "enemy") {
    return "Battle";
  }

  if (["hazard", "event", "encounter", "asset", "anomaly", "escalation"].includes(cardType ?? "")) {
    return stat ? `${statLabelById[stat]} test` : "Test";
  }

  return stat ? `${statLabelById[stat]} resolution` : "Resolution";
}

function formatEncounterSummary(
  resolution: ActiveResolution | null | undefined,
  encounter: PhonePatchPayload["encounter"],
  typeLabel: string
): ReactNode {
  const summary = resolution?.card?.flavor ?? encounter?.flavor ?? null;

  if (summary) {
    return <p className="phone-battle-subject-summary">{summary}</p>;
  }

  return <p className="phone-battle-subject-summary">Resolve this {typeLabel.toLowerCase()} before the table advances.</p>;
}

function BattleSubjectCard({
  resolution,
  encounter
}: {
  resolution: ActiveResolution | null | undefined;
  encounter: PhonePatchPayload["encounter"];
}): ReactElement | null {
  const title = resolution?.card?.title ?? encounter?.enemyName ?? encounter?.title ?? null;

  if (!title) {
    return null;
  }

  const imageType = getResolutionCardImageType(resolution, encounter);
  const imageId = resolution?.card?.id ?? encounter?.id ?? null;
  const battle = resolution?.battle;
  const stat = battle?.stat ?? encounter?.stat ?? null;
  const difficulty = battle?.difficulty ?? encounter?.difficulty ?? null;
  const cardType = resolution?.card?.type ?? encounter?.presentationType ?? encounter?.cardType ?? null;
  const typeLabel = formatEncounterSourceLabel(resolution?.source, cardType);
  const intentLabel = formatEncounterIntentLabel(cardType, stat);
  const opponentLabel = typeof difficulty === "number" ? (cardType === "enemy" ? `Opponent ${difficulty}` : `Target ${difficulty}`) : null;
  const sourceLabel = resolution?.source ? formatEncounterSourceLabel(resolution.source, null) : "Threat";
  const media = imageType ? (
    <PhoneInspectableCardArt
      cardType={imageType}
      cardId={imageId}
      title={title}
      lore={resolution?.card?.flavor ?? encounter?.flavor ?? null}
      rules={[intentLabel, opponentLabel].filter(Boolean).join(" · ")}
      className="phone-wrap-card__image"
      testId="phone-battle-subject-art"
    />
  ) : (
    <span className="phone-wrap-card__fallback" aria-hidden="true">
      {typeLabel.slice(0, 3)}
    </span>
  );

  return (
    <PhoneWrappedMediaCard
      variant="action"
      className="phone-battle-subject-card"
      media={media}
      ariaLabel={`${title} ${typeLabel} card`}
      title={title}
      eyebrow={typeLabel}
      status={
        <div className="phone-battle-subject-status" data-testid="phone-battle-subject-details">
          {stat && typeof difficulty === "number" ? <ChallengeBadge stat={stat} value={difficulty} size="compact" /> : null}
          {opponentLabel ? <span className="phone-battle-subject-chip">{opponentLabel}</span> : null}
        </div>
      }
      description={formatEncounterSummary(resolution, encounter, typeLabel)}
      tags={
        <>
          <span>{intentLabel}</span>
          <span>{sourceLabel}</span>
          {stat ? <span>{statLabelById[stat]}</span> : null}
        </>
      }
      testId="phone-battle-subject-card"
    />
  );
}

const shopFailureLabels: Record<ShopFailureReason, string> = {
  notAtShop: "No shop here",
  shopBlockedByThreat: "Service locked — clear every Threat successfully during this arrival.",
  insufficientSalvage: "Not enough Salvage",
  itemUnavailable: "Item unavailable",
  inventoryFull: "Inventory full",
  itemNotHeld: "Item not held",
  itemNotSellable: "Cannot sell this item",
  invalidItem: "Invalid item"
};

function formatShopDisabledReason(reason: string | undefined): string | undefined {
  return reason && reason in shopFailureLabels ? shopFailureLabels[reason as ShopFailureReason] : reason;
}

function normalizeOutcomeCopy(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.。]+$/g, "")
    .trim();
}

function dedupeOutcomeEffects(text: string, effects: string[]): string[] {
  const seen = new Set<string>([normalizeOutcomeCopy(text)]);

  return effects.filter((effect) => {
    const normalized = normalizeOutcomeCopy(effect);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function formatShopCategory(value: string | undefined): string {
  return value ? toTitleCase(value) : "General Stock";
}

function ActiveResolutionCard({
  resolution,
  encounter,
  actorName,
  operativeName,
  operativeId,
  challengeImagePath,
  resultDeltas,
  canContinue,
  onContinue
}: {
  resolution: ActiveResolution | null | undefined;
  encounter: PhonePatchPayload["encounter"];
  actorName: string;
  operativeName: string;
  operativeId: string;
  challengeImagePath?: string;
  resultDeltas: ResultDelta[];
  canContinue: boolean;
  onContinue: () => void;
}): ReactElement | null {
  if (!resolution) {
    return null;
  }

  const rollText = describeActiveResolutionRoll(resolution);
  const battle = resolution.battle;
  const outcome = resolution.outcome;
  const challengeStat = battle?.stat ?? "grit";
  const isOpposedBattle = resolution.card?.type === "enemy";
  const visibleOutcomeEffects = outcome ? dedupeOutcomeEffects(outcome.text, outcome.effects) : [];
  const resultVisible =
    Boolean(resolution.roll || outcome)
    && ["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage);

  if (resultVisible && outcome && /no threat drawn/i.test(outcome.title)) {
    return (
      <section className="phone-resolution-inline-status" data-testid="phone-resolution-card" aria-label="Threat draw complete">
        <CheckCircleIcon weight="fill" aria-hidden="true" />
        <div><span>Threat queue</span><strong>{outcome.title}</strong><p>{outcome.text}</p></div>
        <GameButton
          tone="primary"
          className="phone-button phone-button-primary phone-resolution-continue"
          data-testid="phone-resolution-continue"
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
        >
          {canContinue ? "Continue" : "Applying consequence…"}
        </GameButton>
      </section>
    );
  }

  if (resultVisible) {
    const cardType = resolution.card?.type ?? encounter?.presentationType ?? encounter?.cardType ?? null;
    return (
      <PhoneResultReadyGate
        actorName={actorName}
        operativeName={operativeName}
        operativeId={operativeId}
        sourceLabel={resolution.source === "movement" ? "Approach Result" : formatEncounterSourceLabel(resolution.source, cardType)}
        challengeTitle={resolution.card?.title ?? encounter?.enemyName ?? encounter?.title ?? outcome?.title ?? "Resolution"}
        challengeArtType={getResolutionCardImageType(resolution, encounter)}
        challengeArtId={resolution.card?.id ?? encounter?.id ?? null}
        challengeImagePath={challengeImagePath}
        challengeFlavor={resolution.card?.flavor ?? encounter?.flavor ?? null}
        success={resolution.roll?.success ?? null}
        playerTotal={resolution.roll?.finalTotal ?? null}
        targetTotal={resolution.roll?.target ?? resolution.battle?.difficulty ?? null}
        resolutionId={resolution.id}
        dice={resolution.roll?.dice ?? []}
        modifierTotal={resolution.roll?.modifierTotal ?? 0}
        playerTotalLabel={resolution.source === "movement" ? "Player total" : undefined}
        targetTotalLabel={resolution.source === "movement" ? "Difficulty total" : undefined}
        outcomeTitle={outcome?.title ?? "Applying consequence"}
        outcomeText={outcome?.text ?? "The server is applying the authoritative result."}
        outcomeEffects={visibleOutcomeEffects}
        resultDeltas={resultDeltas}
        canContinue={canContinue}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className="phone-resolution-card" data-testid="phone-resolution-card">
      <div className="phone-resolution-heading">
        <span>{resolutionStageLabel[resolution.stage]}</span>
        <strong>{resolution.card?.title ?? outcome?.title ?? "Resolution"}</strong>
      </div>
      {canContinue && (
        <GameButton
          tone="primary"
          className="phone-button phone-button-primary phone-resolution-continue phone-resolution-continue-priority"
          data-testid="phone-resolution-continue"
          type="button"
          onClick={onContinue}
        >
          Continue
        </GameButton>
      )}
      {battle && (
        <div className="phone-resolution-grid" data-testid="phone-battle-panel">
          <span>{battle.enemyName ?? "Check"}</span>
          <span>
            <ChallengeBadge stat={battle.stat} value={battle.difficulty} size="compact" />
            <span className="sr-only">{statLabelById[battle.stat]} vs {battle.difficulty}</span>
          </span>
          <span>Modifiers</span>
          <span>{formatResolutionModifiers(battle.modifiers)}</span>
        </div>
      )}
      {rollText && resolution.roll && (
        <div className="phone-resolution-roll" data-testid="phone-roll-result">
          {isOpposedBattle ? (
            <CombatDiceAnimation
              attackValue={resolution.roll.finalTotal}
              defenseValue={resolution.roll.target}
              modifierValue={resolution.roll.modifierTotal}
              attackDieFace={resolution.roll.dice[0] ?? null}
              defenseDieFace={resolution.roll.dice[1] ?? null}
              attackSuccess={resolution.roll.success}
              defenseSuccess={!resolution.roll.success}
              hasModifier={resolution.roll.modifierTotal !== 0}
              challengeStat={challengeStat}
              compact
            />
          ) : (
            <div className="phone-check-dice" aria-label={`${statLabelById[challengeStat]} check result`}>
              <span><small>Die</small><strong>{resolution.roll.dice[0] ?? "–"}</strong></span>
              {resolution.roll.dice[1] !== undefined ? <span><small>Die</small><strong>{resolution.roll.dice[1]}</strong></span> : null}
              <span><small>Modifier</small><strong>{resolution.roll.modifierTotal >= 0 ? "+" : ""}{resolution.roll.modifierTotal}</strong></span>
              <span><small>Total / Target</small><strong>{resolution.roll.finalTotal} / {resolution.roll.target}</strong></span>
            </div>
          )}
          <p>{rollText}</p>
          <p>Target: {resolution.roll.target}</p>
          <strong>{resolution.roll.success ? "Success" : "Failure"}</strong>
        </div>
      )}
      {outcome && (
        <div className="phone-resolution-outcome">
          <p>{outcome.text}</p>
          {visibleOutcomeEffects.length > 0 && (
            <ul>
              {visibleOutcomeEffects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OrphanResolutionRecoveryCard({
  outcome,
  canContinue = true,
  onContinue
}: {
  outcome: OutcomeSummary;
  canContinue?: boolean;
  onContinue: () => void;
}): ReactElement {
  const dice = [outcome.die1, outcome.die2].filter((face): face is number => typeof face === "number");
  const modifier = outcome.statBonus ?? 0;
  const total = outcome.checkTotal ?? (dice.length > 0 ? dice.reduce((sum, face) => sum + face, modifier) : null);
  const target = outcome.enemyTotal ?? outcome.difficulty ?? null;
  const statLabel =
    outcome.checkStat && outcome.checkStat in statLabelById ? statLabelById[outcome.checkStat as Stat] : "Check";
  const challengeStat = isStat(outcome.checkStat) ? outcome.checkStat : "grit";

  return (
    <div className="phone-resolution-card phone-resolution-card-recovery" data-testid="phone-resolution-card">
      <div className="phone-resolution-heading">
        <span>Resolution</span>
        <strong>{outcome.encounterTitle ?? "Roll result"}</strong>
      </div>
      {canContinue ? (
        <GameButton
          tone="primary"
          className="phone-button phone-button-primary phone-resolution-continue phone-resolution-continue-priority"
          data-testid="phone-resolution-continue"
          type="button"
          onClick={onContinue}
        >
          Continue
        </GameButton>
      ) : null}
      <div className="phone-resolution-roll" data-testid="phone-roll-result">
        {dice.length > 0 && total !== null && target !== null && (
          <CombatDiceAnimation
            attackValue={total}
            defenseValue={target}
            modifierValue={modifier}
            attackDieFace={dice[0] ?? null}
            defenseDieFace={dice[1] ?? null}
            attackSuccess={outcome.success === true}
            defenseSuccess={outcome.success === false}
            hasModifier={modifier !== 0}
            challengeStat={challengeStat}
            compact
          />
        )}
        {dice.length > 0 && total !== null ? (
          <p>
            Roll: {dice.join(" + ")}
            {modifier !== 0 ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""} = {total}
          </p>
        ) : (
          <p>{outcome.summary}</p>
        )}
        {target !== null && (
          <p>
            Target: <ChallengeBadge stat={challengeStat} value={target} size="compact" />
            <span className="sr-only">Target: {target}</span>
          </p>
        )}
        <strong>{outcome.success === null ? statLabel : outcome.success ? "Success" : "Failure"}</strong>
      </div>
      <div className="phone-resolution-outcome">
        <p>{outcome.summary}</p>
      </div>
    </div>
  );
}

function BattleAssistCard({
  patch,
  onIntent
}: {
  patch: PhonePatchPayload;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const battleAssist = getBattleAssistViewModel(patch);

  if (!battleAssist) {
    return null;
  }

  const usableCount = battleAssist.usableCards.length;
  const battleStat = battleAssist.playerBattleStat;

  return (
    <div className="phone-battle-assist" data-testid="phone-battle-assist">
      <div className="phone-battle-assist-header">
        <div>
          <span>Battle Assist</span>
          <strong>{battleAssist.enemyName}</strong>
        </div>
        <em>{battleAssist.phaseLabel}</em>
      </div>
      <div className="phone-battle-assist-grid">
        <span>Enemy</span>
        <strong>
          {battleAssist.enemyType} {battleAssist.enemyBattleValue}
        </strong>
        <span>Player</span>
        <strong>
          <ChallengeBadge stat={battleStat} value={battleAssist.playerBattleValue} label={inventoryStatLabelById[battleStat]} size="compact" />
        </strong>
        <span>Health</span>
        <strong>{patch.self?.character.wounds ?? 0} wounds</strong>
        <span>Timing</span>
        <strong>{formatTimingWindow(battleAssist.currentTimingWindow)}</strong>
      </div>
      {usableCount > 0 ? (
        <div className="phone-battle-assist-alert">
          <p>You have {usableCount} card{usableCount === 1 ? "" : "s"} that can help.</p>
          <GameButton
            type="button"
            tone="battle"
            className="phone-button phone-button-primary"
            onClick={() => setDrawerOpen((current) => !current)}
          >
            Open Combat Cards
          </GameButton>
        </div>
      ) : (
        <p className="phone-battle-assist-muted">No combat cards are usable in this timing window.</p>
      )}
      {drawerOpen && (
        <div className="phone-combat-card-drawer" data-testid="phone-combat-card-drawer">
          <PhoneInventoryPanel patch={patch} onIntent={onIntent} compact onlyUsable onUse={() => setDrawerOpen(false)} />
          <GameButton
            type="button"
            tone="secondary"
            className="phone-button phone-button-secondary phone-combat-card-skip"
            onClick={() => setDrawerOpen(false)}
          >
            Skip
          </GameButton>
        </div>
      )}
    </div>
  );
}

function ActionButtons({ actions }: { actions: ActionButtonDefinition[] }): ReactElement {
  if (actions.length === 0) {
    return <p className="phone-sheet-action-empty">No actions in this section.</p>;
  }

  return (
    <div className="phone-sheet-action-grid">
      {actions.map((action) => (
        <GameButton
          key={action.key}
          tone={actionToneToGameButtonTone(action.tone)}
          className={`phone-button phone-sheet-action-button phone-button-${action.tone}${
            action.stat ? " phone-sheet-action-button-stat" : ""
          }`}
          style={action.stat ? (getChallengeThemeStyle(action.stat) as CSSProperties) : undefined}
          type="button"
          disabled={action.disabled}
          disabledReason={action.disabled ? action.detail ?? "Unavailable" : undefined}
          onClick={action.onClick}
          sublabel={action.detail}
        >
          {action.label}
        </GameButton>
      ))}
    </div>
  );
}

function ActionSections({
  sections,
  sectionClassName
}: {
  sections: ActionSectionDefinition[];
  sectionClassName?: string;
}): ReactElement {
  const visibleSections = sections.filter((section) => section.actions.length > 0);

  if (visibleSections.length === 0) {
    return <p className="phone-sheet-action-empty">No quick actions available in this step.</p>;
  }

  return (
    <div className="phone-sheet-action-sections">
      {visibleSections.map((section) => (
        <details key={section.key} className={`phone-sheet-action-section${sectionClassName ? ` ${sectionClassName}` : ""}`} open={section.defaultOpen}>
          <summary>
            <span>{section.title}</span>
            {section.detail && <small>{section.detail}</small>}
          </summary>
          <ActionButtons actions={section.actions} />
        </details>
      ))}
    </div>
  );
}

function SectorOpportunityChips({ items }: { items: SectorOpportunityItem[] }): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="phone-sheet-action-chips" aria-label="Local opportunities">
      {items.map((item) => (
        <span key={item.key}>
          <strong>{item.value}</strong>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function SectorExplorationPanel({
  summary
}: {
  summary: ReturnType<typeof buildSectorExplorationCopy>;
}): ReactElement | null {
  if (!summary) {
    return null;
  }

  return (
    <section className="phone-sector-exploration" aria-label="Sector exploration math" data-testid="phone-sector-exploration">
      <div className="phone-sector-exploration-header">
        <span>Sector Math</span>
        <strong>{summary.lockText}</strong>
      </div>
      <div className="phone-sector-exploration-grid">
        <span>{summary.printedIconsText}</span>
        <span>{summary.unresolvedText}</span>
        <span>{summary.drawDueText}</span>
      </div>
      <ul>
        {summary.lines.slice(0, 5).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function EmptyTurnTab({ title, text }: { title: string; text: string }): ReactElement {
  return (
    <div className="phone-turn-tab-empty" role="status">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function stripTabReasonPrefix(tab: TurnActionTabDefinition, reason: string): string {
  const prefix = `${tab.label} locked:`;
  const trimmedReason = reason.trim();

  if (trimmedReason.toLowerCase().startsWith(prefix.toLowerCase())) {
    const withoutPrefix = trimmedReason.slice(prefix.length).trim();
    return withoutPrefix.length > 0 ? `${withoutPrefix.slice(0, 1).toUpperCase()}${withoutPrefix.slice(1)}` : trimmedReason;
  }

  return trimmedReason;
}

function getTabCompactSublabel(tab: TurnActionTabDefinition, activeTab: TurnActionTab): string {
  const unavailable = !tab.enabled || tab.locked;

  if (unavailable) {
    return "Locked";
  }

  if (activeTab === tab.id) {
    return "Active";
  }

  if (tab.id === "move") {
    return tab.detail;
  }

  if (tab.id === "shop") {
    return "Open";
  }

  return "Ready";
}

function portraitActionStatusLabel(tab: TurnActionTab): string {
  switch (tab) {
    case "move":
      return "Move";
    case "battle":
      return "Battle";
    case "shop":
      return "Shop";
    case "action":
      return "Action";
  }
}

function usefulNowForTurnTab(model: UsefulNowViewModel | null, tab: TurnActionTab): UsefulNowViewModel | null {
  if (!model) {
    return null;
  }

  const phaseLabel = model.phaseLabel.toLowerCase();

  switch (tab) {
    case "move":
      return phaseLabel.includes("movement") ? model : null;
    case "battle":
      return phaseLabel.includes("battle") || phaseLabel.includes("challenge") ? model : null;
    case "shop":
      return phaseLabel.includes("shop") ? model : null;
    case "action":
      return phaseLabel.includes("movement") || phaseLabel.includes("battle") || phaseLabel.includes("shop") ? null : model;
  }
}

function TurnActionReasonStrip({ tab }: { tab: TurnActionTabDefinition | undefined }): ReactElement | null {
  if (!tab?.blockedReason) {
    return null;
  }

  return (
    <aside className={`phone-turn-tab-reason phone-turn-tab-reason-${tab.tone}`} data-testid="phone-turn-tab-reason" role="status">
      <strong>{tab.label} locked</strong>
      <span>{stripTabReasonPrefix(tab, tab.blockedReason)}</span>
      <small>Ignore for now</small>
    </aside>
  );
}

function LockedCommandPanel({
  tab,
  title,
  text
}: {
  tab: TurnActionTab;
  title: string;
  text: string;
}): ReactElement {
  const panelClass =
    tab === "action"
      ? "phone-sector-action-panel"
      : tab === "shop"
        ? "phone-shop-command-panel phone-shop-panel"
        : `phone-${tab}-panel`;

  return (
    <section
      className={`phone-action-active-panel ${panelClass} phone-${tab}-panel-locked`}
      data-testid="phone-action-active-panel"
      aria-label={`${tab} command screen locked`}
    >
      <EmptyTurnTab title={title} text={text} />
    </section>
  );
}

function TurnActionTabs({
  tabs,
  activeTab,
  onSelected
}: {
  tabs: TurnActionTabDefinition[];
  activeTab: TurnActionTab;
  onSelected: (tab: TurnActionTab) => void;
}): ReactElement {
  return (
    <div className="phone-turn-tabs" role="tablist" aria-label="Turn actions">
      {tabs.map((tab) => {
        const unavailable = !tab.enabled || tab.locked;
        const compactSublabel = getTabCompactSublabel(tab, activeTab);
        const accessibleState = unavailable ? tab.blockedReason ?? `${tab.label} locked.` : `${tab.label}: ${tab.detail}.`;

        return (
          <GameButton
            key={tab.id}
            type="button"
            tone={tab.tone}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={unavailable || undefined}
            aria-controls={`phone-turn-panel-${tab.id}`}
            selected={activeTab === tab.id}
            className={`phone-turn-tab phone-turn-tab-${tab.tone}${activeTab === tab.id ? " phone-turn-tab-active" : ""}${
              unavailable ? " phone-turn-tab-locked" : ""
            }`}
            title={unavailable ? tab.blockedReason : tab.detail}
            aria-label={`${tab.label}. ${accessibleState}`}
            onClick={() => onSelected(tab.id)}
            sublabel={compactSublabel}
          >
            {tab.label}
          </GameButton>
        );
      })}
    </div>
  );
}

function CurrentPromptCard({
  prompt,
  onSelectedTab
}: {
  prompt: CurrentPromptViewModel;
  onSelectedTab?: (tab: TurnActionTab) => void;
}): ReactElement {
  return (
    <section className={`phone-current-prompt phone-current-prompt-${prompt.tone}`} data-testid="phone-current-prompt" aria-label="Current prompt">
      <div>
        <span>{prompt.label}</span>
        <strong>{prompt.title}</strong>
        <p>{prompt.detail}</p>
        {prompt.meta ? <small>{prompt.meta}</small> : null}
      </div>
      {prompt.targetTab && prompt.actionLabel && onSelectedTab ? (
        <GameButton
          type="button"
          tone={prompt.targetTab}
          className="phone-button phone-current-prompt-button"
          onClick={() => onSelectedTab(prompt.targetTab!)}
        >
          {prompt.actionLabel}
        </GameButton>
      ) : null}
    </section>
  );
}

const movementTagLabel: Record<PublicMoveStrategicTag, string> = {
  safe: "SAFE",
  shop: "SHOP",
  locked: "LOCKED",
  danger: "DANGER",
  reward: "REWARD",
  nemesis: "NEMESIS",
  gate: "GATE"
};

function getPrimaryMovementTag(destination: PublicMoveDestination): PublicMoveStrategicTag {
  return (
    destination.strategicTags.find((tag) => ["locked", "nemesis", "gate", "shop", "reward", "danger", "safe"].includes(tag)) ??
    "safe"
  );
}

function formatThreatIcon(icon: string): string {
  return icon.charAt(0).toUpperCase() + icon.slice(1);
}

function formatThreatIconWithStat(icon: PublicMoveDestination["threatIcons"][number]): string {
  return `${formatThreatIcon(icon)} ${statLabelById[getThreatIconStat(icon)]}`;
}

function formatThreatIconCounts(icons: ThreatIcon[]): string {
  if (icons.length === 0) {
    return "none";
  }

  const counts = icons.reduce<Record<ThreatIcon, number>>(
    (accumulator, icon) => {
      accumulator[icon] += 1;
      return accumulator;
    },
    { red: 0, blue: 0, yellow: 0 }
  );

  return (["red", "blue", "yellow"] as const)
    .filter((icon) => counts[icon] > 0)
    .map((icon) => `${counts[icon]} ${icon}`)
    .join(", ");
}

function formatDrawDueText(summary: PublicSectorExplorationSummary | null | undefined): string {
  if (!summary) {
    return "Draw due: unknown until sector scan.";
  }

  if (summary.unresolvedThreats.length > 0) {
    return "No new draw: printed lane occupied; clear blockers first.";
  }

  const drawEntries = (["red", "blue", "yellow"] as const)
    .filter((icon) => summary.drawCountsDue[icon] > 0)
    .map((icon) => `${summary.drawCountsDue[icon]} ${icon}`);

  return drawEntries.length > 0 ? `Draw due: ${drawEntries.join(", ")}.` : "Draw due: none.";
}

function formatCurrentTileShopText(summary: PublicSectorExplorationSummary | null | undefined, tags: string[]): string {
  if (summary?.shopName) {
    const lockedReason = summary.lockedReason?.replace(/[.]+$/g, "") ?? "clear unresolved blockers first";
    return summary.shopLocked
      ? `Shop locked: ${lockedReason}.`
      : `Shop: ${summary.shopName}.`;
  }

  return tags.includes("shop") ? "Shop: possible if the sector is clear." : "Shop: none.";
}

function formatCurrentTileActionText(
  summary: PublicSectorExplorationSummary | null | undefined,
  boardSpace: ReturnType<typeof getBoardSpace>
): string {
  const title = summary?.sectorTextTitle ?? boardSpace?.textBox.title ?? null;

  if (!title) {
    return "Action: none.";
  }

  if (summary?.sectorTextLocked) {
    const lockedReason = summary.lockedReason?.replace(/[.]+$/g, "") ?? "clear unresolved blockers first";
    return `Action locked: ${lockedReason}.`;
  }

  return `Action: ${title}.`;
}

function buildCurrentTileViewModel(
  patch: PhonePatchPayload,
  self: NonNullable<PhonePatchPayload["self"]>,
  sector: SectorNode | null,
  boardSpace: ReturnType<typeof getBoardSpace>,
  activeContract: ContractCard | null
): CurrentTileViewModel {
  const summary = patch.sectorExplorationSummary;
  const sectorId = summary?.sectorId ?? patch.movementPlanner?.currentSectorId ?? self.sectorId;
  const currentSector = sector?.id === sectorId ? sector : getSector(patch.sectors, sectorId);
  const currentBoardSpace = boardSpace?.id === sectorId ? boardSpace : getBoardSpace(sectorId);
  const name = summary?.sectorName ?? currentSector?.name ?? currentBoardSpace?.name ?? sectorId;
  const tags = currentBoardSpace?.tags ?? [];
  const sameSectorOccupants = patch.players
    .filter((player) => player.sectorId === sectorId && player.seatId !== self.seatId)
    .map((player) => ({
      playerId: player.seatId,
      name: patch.seats.find((seat) => seat.seatId === player.seatId)?.displayName ?? player.character.name,
      characterName: player.character.name
    }));

  return {
    sectorId,
    name,
    regionLabel: currentBoardSpace ? `${toTitleCase(currentBoardSpace.tier)} Reach` : toTitleCase(currentSector?.regionTier ?? "unknown reach"),
    tags,
    note: currentBoardSpace?.loreText?.trim() || currentBoardSpace?.ruleText?.trim() || "No stable sector note is available yet.",
    artPath: getTileAssetPath(sectorId),
    printedThreatIcons: summary?.printedThreatIcons ?? currentBoardSpace?.threatIcons ?? [],
    unresolvedThreats: summary?.unresolvedThreats ?? [],
    drawDueText: formatDrawDueText(summary),
    shopText: formatCurrentTileShopText(summary, tags),
    actionText: formatCurrentTileActionText(summary, currentBoardSpace),
    missionRelevance: getMissionRelevanceForSector(activeContract, sectorId, {
      threatIcons: summary?.printedThreatIcons ?? currentBoardSpace?.threatIcons ?? [],
      faceUpThreatCount: summary?.unresolvedThreats.length ?? 0
    }),
    occupants: sameSectorOccupants
  };
}

function buildDestinationSummary(destination: PublicMoveDestination): string {
  if (destination.disabledReason) {
    return destination.disabledReason;
  }

  if (destination.faceUpThreats.length > 0) {
    return `${destination.faceUpThreats.length} face-up blocker${destination.faceUpThreats.length === 1 ? "" : "s"} must be cleared.`;
  }

  if (destination.shop) {
    return destination.shop.status === "dangerous" ? "Dangerous shop. Services may add Scars or Wounds." : "Shop services available if the sector stays clear.";
  }

  if (destination.threatIcons.length > 0) {
    return `${destination.threatIcons.map(formatThreatIconWithStat).join(", ")} threat icon${destination.threatIcons.length === 1 ? "" : "s"} printed here.`;
  }

  return "No public blockers are visible.";
}

function buildDestinationIdentityLine(destination: PublicMoveDestination): string {
  return destination.loreText?.trim() || buildDestinationSummary(destination);
}

function getMovementTagLabels(destination: PublicMoveDestination, routePreviewTagLabels: string[]): string[] {
  const strategicLabels = destination.strategicTags.map((tag) => movementTagLabel[tag]);

  return [...new Set([...strategicLabels, ...routePreviewTagLabels.map((tag) => tag.toUpperCase())])].slice(0, 4);
}

function getRouteNames(destination: PublicMoveDestination): string[] {
  return destination.routeNames ?? destination.route;
}

function getRoutePreviewLine(destination: PublicMoveDestination): string {
  return getRouteNames(destination).join(" -> ");
}

function getMovementRouteConfidenceItems(
  destination: PublicMoveDestination,
  routePreview: ReturnType<typeof buildRoutePreviewCopy>
): string[] {
  const blockers = destination.faceUpThreats.length;
  const primaryReward =
    destination.shop
      ? `${destination.shop.status === "locked" ? "locked " : ""}shop reward`
      : destination.scenarioMarkers?.length
        ? "objective reward"
        : destination.strategicTags.includes("reward")
          ? "reward"
          : null;
  const riskTag =
    destination.disabledReason
      ? "blocked"
      : destination.nemesisPresent
        ? "nemesis risk"
        : destination.threatIcons.length > 0
          ? "threat risk"
          : destination.strategicTags.includes("safe")
            ? "low risk"
            : null;

  return [
    `${destination.distance} step${destination.distance === 1 ? "" : "s"}`,
    `${blockers} blocker${blockers === 1 ? "" : "s"}`,
    riskTag,
    primaryReward,
    routePreview.exactText.startsWith("Legal") ? null : "route mismatch"
  ].filter((item): item is string => Boolean(item));
}

function MovementRouteConfidence({
  items,
  testId
}: {
  items: string[];
  testId?: string;
}): ReactElement {
  return (
    <div className="phone-movement-route-confidence" data-testid={testId} aria-label="Route confidence">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function CurrentTileMedia({ tile }: { tile: CurrentTileViewModel }): ReactElement {
  if (tile.artPath) {
    return (
      <PhoneOptimizedImage
        src={tile.artPath}
        alt=""
        className="phone-wrap-card__image phone-current-tile-image"
        aria-hidden="true"
        data-testid="movement-current-tile-image"
      />
    );
  }

  return (
    <div className="phone-wrap-card__fallback phone-current-tile-fallback" aria-hidden="true" data-testid="movement-current-tile-fallback">
      <span>{tile.regionLabel.slice(0, 1).toUpperCase()}</span>
      <strong>{tile.name.slice(0, 1).toUpperCase()}</strong>
    </div>
  );
}

function CurrentTileCard({ tile }: { tile: CurrentTileViewModel }): ReactElement {
  const tagLabels = tile.tags.slice(0, 4).map(toTitleCase);
  const unresolvedText =
    tile.unresolvedThreats.length > 0
      ? `Blocked: ${tile.unresolvedThreats.map((threat) => threat.name).join(", ")}.`
      : "Unresolved blockers: none.";
  const occupantText =
    tile.occupants.length > 0
      ? `Occupants: ${tile.occupants.map((occupant) => `${occupant.name} (${occupant.characterName})`).join(", ")}.`
      : "Occupants: none.";

  return (
    <PhoneWrappedMediaCard
      variant="movement"
      className="phone-current-tile-card phone-move-panel__current-tile"
      media={<CurrentTileMedia tile={tile} />}
      title={<span data-testid="movement-current-tile-name">{tile.name}</span>}
      eyebrow="Current Tile"
      status={
        <div className="phone-current-tile-status" data-testid="movement-current-tile-region">
          <span>{tile.regionLabel}</span>
          {tagLabels.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      }
      description={<p data-testid="movement-current-tile-note">{tile.note}</p>}
      meta={
        <div className="phone-current-tile-facts" data-testid="movement-current-tile-facts">
          <span data-testid="movement-current-tile-icons">Printed icons: {formatThreatIconCounts(tile.printedThreatIcons)}.</span>
          <span data-testid="movement-current-tile-blockers">{unresolvedText}</span>
          <span data-testid="movement-current-tile-shop">{tile.shopText}</span>
          <span data-testid="movement-current-tile-action">{tile.actionText}</span>
          {tile.missionRelevance ? (
            <span className="phone-current-tile-mission" data-testid="movement-current-tile-mission">
              Mission: {tile.missionRelevance.reason}
            </span>
          ) : null}
          <span>{tile.drawDueText}</span>
          <span data-testid="movement-current-tile-occupants">{occupantText}</span>
        </div>
      }
      testId="movement-current-tile-card"
    />
  );
}

function TurnActionDock({
  tabs,
  activeTab,
  onSelected
}: {
  tabs: TurnActionTabDefinition[];
  activeTab: TurnActionTab;
  onSelected: (tab: TurnActionTab) => void;
}): ReactElement {
  const activeDefinition = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="phone-turn-dock" aria-label="Turn action dock">
      <TurnActionReasonStrip tab={activeDefinition} />
      <TurnActionTabs tabs={tabs} activeTab={activeTab} onSelected={onSelected} />
    </div>
  );
}

function shopResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const shopTypes = new Set<ResultDelta["type"]>(["itemBought", "itemSold", "salvage", "wound", "scarGained", "shopUnlocked"]);

  return (deltas ?? []).filter((delta) => delta.source?.startsWith("shop:") || shopTypes.has(delta.type));
}

function battleResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const battleTypes = new Set<ResultDelta["type"]>([
    "wound",
    "salvage",
    "scarGained",
    "trophy",
    "threatDefeated",
    "threatRemains",
    "scarGained",
    "modifierApplied"
  ]);

  return (deltas ?? []).filter((delta) =>
    delta.source === "combat" ||
    delta.source === "resolution-effect" ||
    battleTypes.has(delta.type)
  );
}

function UsefulNowPanel({
  model,
  variant = "standard"
}: {
  model: UsefulNowViewModel | null;
  variant?: "standard" | "secondary";
}): ReactElement | null {
  if (!model) {
    return null;
  }

  const isSecondary = variant === "secondary";

  return (
    <details
      className={`phone-useful-now${isSecondary ? " phone-useful-now-secondary" : ""}`}
      data-testid="phone-useful-now"
      aria-label="Useful now"
      open={!isSecondary}
    >
      <summary className="phone-useful-now-header">
        <span>{model.phaseLabel}</span>
        <strong>{model.headline}</strong>
        {model.relevantStat && <em>{statLabelById[model.relevantStat]}</em>}
      </summary>
      <div className="phone-useful-now-body">
        <p>{model.detail}</p>
        {model.items.length > 0 && (
          <div className="phone-useful-now-items">
            {model.items.map((item) => (
              <span key={`${item.label}-${item.detail}`} className={`phone-useful-now-chip phone-useful-now-chip-${item.tone}`}>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function actionResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const actionTypes = new Set<ResultDelta["type"]>([
    "scenarioProgress",
    "scenarioPressure",
    "contractProgress",
    "contractCompleted",
    "agendaProgress",
    "agendaCompleted",
    "sectorUnlocked",
    "shopUnlocked",
    "trophy",
    "statUpgrade"
  ]);

  return (deltas ?? []).filter((delta) => actionTypes.has(delta.type));
}

function PhoneShopPanel({
  shopEncounter,
  resultDeltas,
  scarCount,
  seatId,
  onIntent
}: {
  shopEncounter: PublicShopEncounterState | null | undefined;
  resultDeltas?: ResultDelta[] | null;
  scarCount: number;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [focusedOfferId, setFocusedOfferId] = useState<string | null>(null);
  const revealedStock = shopEncounter?.revealedStock ?? [];
  const sellInventory = shopEncounter?.sellInventory ?? [];
  const repairTargets = shopEncounter?.repairTargets ?? [];
  const sellItemKey = (item: (typeof sellInventory)[number]) => item.instanceId ?? item.gearId;

  useEffect(() => {
    setPendingActionId(null);
    setFocusedOfferId(shopEncounter?.browseSelection?.selectedId ?? null);
  }, [shopEncounter?.presentation?.revision, shopEncounter?.browseSelection?.selectedId, shopEncounter?.browseSelection?.view, shopEncounter?.recentOutcome]);

  if (!shopEncounter) {
    return null;
  }

  const isLocked = shopEncounter.status === "locked" || shopEncounter.blockingThreats.length > 0;
  const blockedReasonText = shopEncounter.blockedReasonText ?? formatShopDisabledReason(shopEncounter.blockedReason);
  const categoryLabel = formatShopCategory(shopEncounter.stockCategory ?? shopEncounter.shopCategory);
  const shopTypeLabel = shopEncounter.shopType ? toTitleCase(shopEncounter.shopType) : "Shop Encounter";
  const recentOutcome = shopEncounter.recentOutcome ?? null;
  const purchasedItemName = recentOutcome?.gained;
  const soldItemName = recentOutcome?.sold;
  const serviceActions = shopEncounter.services
    .filter((service) => service.id !== "sell-gear")
    .sort((left, right) => Number(right.cost.completedContracts !== undefined) - Number(left.cost.completedContracts !== undefined));
  const artifactChoiceActive = revealedStock.some((item) => item.cost.completedContracts !== undefined);
  const visibleShopDeltas = shopResultDeltas(resultDeltas);
  const showRecentOutcome = Boolean(recentOutcome && (purchasedItemName || soldItemName || visibleShopDeltas.length > 0));
  const shopView = artifactChoiceActive
    ? "artifacts"
    : shopEncounter.browseSelection?.view ?? (revealedStock.length > 0 ? "equipment" : "categories");
  const stockViews = new Set(["equipment", "supplies", "artifacts", "route-aids"]);
  const categories = shopEncounter.presentation?.categories ?? [
    shopEncounter.services.find((service) => service.id === "buy-supplies") ? { id: "items" as const, view: "supplies" as const, label: "Items", description: "Field supplies", available: true, offerCount: null, unavailableReason: undefined } : null,
    shopEncounter.services.find((service) => service.id === "buy-gear") ? { id: "equipment" as const, view: "equipment" as const, label: "Equipment", description: "Tools and armour", available: true, offerCount: revealedStock.length || null, unavailableReason: undefined } : null,
    shopEncounter.services.find((service) => service.id === "trade-missions-for-artifact") ? { id: "artifacts" as const, view: "artifacts" as const, label: "Artifacts", description: "Contract exchange", available: true, offerCount: null, unavailableReason: undefined } : null,
    shopEncounter.services.find((service) => service.id === "buy-route-aids") ? { id: "route-aids" as const, view: "route-aids" as const, label: "Route Aids", description: "Charged route guides", available: true, offerCount: shopView === "route-aids" ? revealedStock.length : null, unavailableReason: undefined } : null,
    serviceActions.some((service) => !["buy-gear", "buy-supplies", "buy-route-aids", "trade-missions-for-artifact"].includes(service.id)) ? { id: "services" as const, view: "services" as const, label: "Services", description: "Local services", available: true, offerCount: serviceActions.length, unavailableReason: undefined } : null,
    (shopEncounter.sellableCount ?? sellInventory.filter((item) => item.sellable).length) > 0 ? { id: "sell" as const, view: "sell" as const, label: "Sell", description: "Trade held Equipment", available: true, offerCount: shopEncounter.sellableCount ?? sellInventory.filter((item) => item.sellable).length, unavailableReason: undefined } : null
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const selectedStock = revealedStock.find((item) => item.cardId === focusedOfferId)
    ?? revealedStock.find((item) => item.cardId === shopEncounter.browseSelection?.selectedId)
    ?? revealedStock[0]
    ?? null;
  const selectedStockIndex = selectedStock ? revealedStock.findIndex((item) => item.cardId === selectedStock.cardId) : -1;
  const selectedSale = sellInventory.find((item) => sellItemKey(item) === focusedOfferId)
    ?? sellInventory.find((item) => sellItemKey(item) === shopEncounter.browseSelection?.selectedId)
    ?? sellInventory[0]
    ?? null;
  const selectedSaleIndex = selectedSale ? sellInventory.findIndex((item) => sellItemKey(item) === sellItemKey(selectedSale)) : -1;
  const ownerSalvage = shopEncounter.activePlayer.salvage;

  function selectShopView(
    view: "categories" | "equipment" | "supplies" | "artifacts" | "route-aids" | "services" | "sell",
    serviceId?: string
  ): void {
    setFocusedOfferId(null);
    if (serviceId && shopEncounter?.browseSelection?.view !== view) {
      onIntent({ type: "SHOP_SERVICE_REQUESTED", seatId, serviceId });
      return;
    }
    onIntent({ type: "SHOP_BROWSE_SELECTED", seatId, view, selectedId: null });
  }

  function confirmPurchase(cardId: string): void {
    setPendingActionId(`buy:${cardId}`);
    onIntent({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId,
      cardId
    });
  }

  function confirmSale(gearId: string, instanceId?: string): void {
    setPendingActionId(`sell:${instanceId ?? gearId}`);
    onIntent({
      type: "SHOP_SELL_REQUESTED",
      seatId,
      gearId,
      instanceId
    });
  }

  function skipShop(): void {
    setPendingActionId("leave");
    onIntent({
      type: "SHOP_SKIP_REQUESTED",
      seatId
    });
  }

  return (
    <section className={`phone-shop-panel phone-shop-panel-${shopEncounter.status}`} aria-label="Shop encounter" data-testid="phone-shop-panel">
      {artifactChoiceActive ? (
        <div className="phone-shop-artifact-exchange-header" role="status">
          <span>Artifact Exchange</span>
          <strong>Choose one of {revealedStock.length}</strong>
          <small>Three completed Contracts remain yours until confirmation.</small>
        </div>
      ) : <><div className="phone-shop-header">
        <ShopCategoryIcon category={shopEncounter.stockCategory ?? shopEncounter.shopCategory} label={categoryLabel} className="phone-shop-header-icon" />
        <div>
          <span>{shopTypeLabel}</span>
          <strong>{shopEncounter.shopName}</strong>
          <small>
            {categoryLabel} · {shopEncounter.sectorName}
          </small>
        </div>
        <span className={`phone-shop-status phone-shop-status-${shopEncounter.status}`}>{shopEncounter.status.toUpperCase()}</span>
      </div>

      {shopView === "categories" ? <div className="phone-shop-state-copy" role="status">
        {isLocked
          ? blockedReasonText ?? "Shop blocked by threat."
            : shopEncounter.available === false
              ? "No shop available here."
              : "Choose a market service, then review stock or sell gear."}
      </div> : null}

      <div className="phone-shop-wallet" aria-label="Operative resources">
        <span>Salvage: {ownerSalvage ?? "Private"}</span>
      </div>
      </>}

      {showRecentOutcome ? (
        <div className="phone-shop-outcome" role="status" aria-live="polite">
          <span>{recentOutcome?.gained ? "Purchase Complete" : recentOutcome?.sold ? "Sale Complete" : "Market Result"}</span>
          <p>
            {recentOutcome?.gained
              ? `Purchased: ${recentOutcome.gained}`
              : recentOutcome?.sold
                ? `Sold: ${recentOutcome.sold}`
              : recentOutcome?.summary}
          </p>
          {recentOutcome?.remainingSalvage !== undefined ? <strong className="phone-shop-balance-result">
            Salvage: {recentOutcome.costPaid?.salvage !== undefined
              ? `${recentOutcome.remainingSalvage + recentOutcome.costPaid.salvage} → ${recentOutcome.remainingSalvage}`
              : recentOutcome.salvageDelta !== undefined
                ? `${recentOutcome.remainingSalvage - recentOutcome.salvageDelta} → ${recentOutcome.remainingSalvage}`
                : recentOutcome.remainingSalvage}
          </strong> : null}
          <ResultDeltaRow deltas={visibleShopDeltas} className="phone-shop-deltas" />
        </div>
      ) : null}

      {isLocked ? (
        <div className="phone-shop-locked" role="status">
          <strong>Shop locked</strong>
          <p>{blockedReasonText ?? "Clear local blockers before trading here."}</p>
          {shopEncounter.blockingThreats.map((threat) => (
            <div key={threat.cardId} className="phone-shop-blocker">
              <span>{threat.name}</span>
              {threat.challenge ? <ChallengeBadge stat={threat.challenge.stat} value={threat.challenge.value} size="compact" /> : null}
            </div>
          ))}
        </div>
      ) : (
        <>
          <nav className="phone-shop-category-rail phone-shop-category-grid" aria-label="Shop categories">
            {shopView !== "categories" ? (
              <GameButton type="button" tone="secondary" onClick={() => selectShopView("categories")}>All categories</GameButton>
            ) : null}
            {shopView === "categories" ? categories.map((category) => {
              const serviceId = category.view === "equipment" ? "buy-gear"
                : category.view === "supplies" ? "buy-supplies"
                  : category.view === "artifacts" ? "trade-missions-for-artifact"
                    : category.view === "route-aids" ? "buy-route-aids"
                    : undefined;
              return (
                <GameButton
                  key={category.id}
                  type="button"
                  tone="shop"
                  contentMode="custom"
                  disabled={!category.available}
                  disabledReason={category.unavailableReason}
                  onClick={() => selectShopView(category.view, serviceId)}
                >
                  <ShopCategoryIcon category={category.id === "items" ? "market" : category.id === "equipment" ? "forge-armoury" : category.id === "artifacts" ? "relic-dealer" : undefined} label={category.label} />
                  <span><strong>{category.label}</strong><small>{category.offerCount === null ? category.description : `${category.offerCount} available`}</small></span>
                </GameButton>
              );
            }) : null}
          </nav>
          {shopView === "categories" && shopEncounter.services.length === 0 && (shopEncounter.sellableCount ?? sellInventory.filter((item) => item.sellable).length) === 0 ? (
            <p className="phone-shop-empty-stock">No stock or service categories are currently operating.</p>
          ) : null}

          {(shopView === "categories" || shopView === "services") && serviceActions.length > 0 && revealedStock.length === 0 ? (
            <div className="phone-shop-services" aria-label="Shop services">
              <div className="phone-shop-section-heading">
                <span>Services</span>
                <small>Reveal stock or use local services.</small>
              </div>
              {serviceActions.map((service) => {
                const disabledReason = formatShopDisabledReason(service.disabledReason);
                const completedMissionProgress = service.cost.completedContracts !== undefined
                  ? `${shopEncounter.activePlayer.completedContracts ?? 0}/${service.cost.completedContracts} completed Contracts`
                  : null;
                if (service.id === "repair-gear" && repairTargets.length > 0) {
                  return (
                    <section key={service.id} className="phone-shop-repair-targets" aria-label="Repair Gear">
                      <div className="phone-shop-section-heading">
                        <span>Repair Gear</span>
                        <small>{formatShopCost(service.cost)} · restores the selected item's uses</small>
                      </div>
                      {repairTargets.map((target) => (
                        <GameButton
                          key={target.instanceId}
                          type="button"
                          tone="shop"
                          size="large"
                          className="phone-shop-service-card"
                          disabled={!service.enabled}
                          disabledReason={disabledReason}
                          onClick={() => onIntent({
                            type: "SHOP_SERVICE_REQUESTED",
                            seatId,
                            serviceId: service.id,
                            itemInstanceId: target.instanceId
                          })}
                          sublabel={target.kind === "charges"
                            ? `${target.currentCharges ?? 0}/${target.maxCharges ?? 0} charges · restore to full`
                            : "Exhausted · restore to Ready"}
                        >
                          Repair {target.name}
                        </GameButton>
                      ))}
                    </section>
                  );
                }
                return (
                  <GameButton
                    key={service.id}
                    type="button"
                    tone="shop"
                    size="large"
                    contentMode="custom"
                    className="phone-shop-service-card"
                    disabled={!service.enabled}
                    disabledReason={completedMissionProgress ?? disabledReason}
                    onClick={() =>
                      onIntent({
                        type: "SHOP_SERVICE_REQUESTED",
                        seatId,
                        serviceId: service.id
                      })
                    }
                    sublabel={completedMissionProgress ?? disabledReason ?? formatShopCost(service.cost)}
                  >
                    <ShopCategoryIcon category={service.shopCategory ?? shopEncounter.stockCategory ?? shopEncounter.shopCategory} label={service.label} />
                    <span className="phone-shop-service-card-copy">
                      <strong>{service.label}</strong>
                      {service.shopCategory ? <span>{formatShopCategory(service.shopCategory)}</span> : <span>{categoryLabel}</span>}
                      {completedMissionProgress ? <small>{completedMissionProgress}</small> : null}
                      {service.risk ? <small>{service.risk}</small> : null}
                    </span>
                  </GameButton>
                );
              })}
            </div>
          ) : null}

          {stockViews.has(shopView) ? <div className="phone-shop-stock phone-shop-focused-browser" aria-label="Revealed shop stock">
            <div className="phone-shop-section-heading">
              <span>Stock</span>
              <small>{revealedStock.length > 0
                ? revealedStock.some((item) => item.cost.completedContracts !== undefined)
                  ? "Choose one Artifact. Three completed Contracts are spent only after confirmation."
                  : "Review one offer. The server confirms price and availability."
                : "Choose Browse Equipment above to reveal this shop's stock."}</small>
            </div>
            {revealedStock.length > 0 ? (
              <div className="phone-shop-focused-offer">
                {[selectedStock].map((item) => {
                  if (!item) return null;
                  const isArtifactChoice = item.cost.completedContracts !== undefined;
                  const itemCategory = item.shopCategories?.map(formatShopCategory).join(" / ") ?? toTitleCase(item.type);
                  const disabledReason = formatShopDisabledReason(item.disabledReason) ?? (!item.affordable
                    ? isArtifactChoice ? "Need three completed Contracts" : "Not enough Salvage"
                    : undefined);
                  const isPending = pendingActionId === `buy:${item.cardId}`;
                  const isPurchased = purchasedItemName === item.name;
                  return (
                    <PhoneWrappedMediaCard
                      key={item.cardId}
                      variant="shop"
                      className={`phone-shop-stock-card phone-shop-panel__stock-card${item.affordable ? "" : " phone-shop-stock-card-disabled"}`}
                      media={<ShopItemMedia cardId={item.cardId} label={item.name} itemType={item.type} rules={item.summary} />}
                      title={item.name}
                      eyebrow={itemCategory}
                      status={<span className="phone-shop-card-status">{itemCategory}</span>}
                      description={<><p className="phone-wrap-card__consequence">{item.summary}</p>{item.lore ? <details className="phone-shop-lore"><summary>View lore</summary><p>{item.lore}</p></details> : null}</>}
                      disabledReason={disabledReason ? <small>{disabledReason}. Ignore until you can pay or free the slot.</small> : null}
                      meta={<span>Cost: {formatShopCost(item.cost)}</span>}
                      actions={
                        <GameButton
                          type="button"
                          tone="shop"
                          className="phone-button phone-button-primary"
                          disabled={!item.affordable || isPending || isPurchased}
                          disabledReason={disabledReason ?? (isPending ? (isArtifactChoice ? "Choosing..." : "Buying...") : isPurchased ? "Acquired" : undefined)}
                          onClick={() => confirmPurchase(item.cardId)}
                        >
                          {isPending ? (isArtifactChoice ? "Confirming..." : "Purchasing...") : isPurchased ? "Acquired" : isArtifactChoice ? `Confirm ${item.name}` : `Buy ${item.name}`}
                        </GameButton>
                      }
                    />
                  );
                })}
                {revealedStock.length > 1 ? <div className="phone-shop-offer-navigation" aria-label="Offer navigation">
                  <GameButton type="button" tone="secondary" aria-label="Previous offer" onClick={() => {
                    const item = revealedStock[(selectedStockIndex - 1 + revealedStock.length) % revealedStock.length]!;
                    setFocusedOfferId(item.cardId);
                    onIntent({ type: "SHOP_BROWSE_SELECTED", seatId, view: shopView as "equipment" | "supplies" | "artifacts", selectedId: item.cardId });
                  }}>Previous</GameButton>
                  <span>{selectedStockIndex + 1} / {revealedStock.length}</span>
                  <GameButton type="button" tone="secondary" aria-label="Next offer" onClick={() => {
                    const item = revealedStock[(selectedStockIndex + 1) % revealedStock.length]!;
                    setFocusedOfferId(item.cardId);
                    onIntent({ type: "SHOP_BROWSE_SELECTED", seatId, view: shopView as "equipment" | "supplies" | "artifacts", selectedId: item.cardId });
                  }}>Next</GameButton>
                </div> : null}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">Stock has not been revealed. Choose Browse Equipment above.</p>
            )}
          </div> : null}

          {shopView === "sell" ? <div className="phone-shop-sell" aria-label="Sell held items">
            <div className="phone-shop-section-heading">
              <span>Sell</span>
              <small>{sellInventory.length > 0 ? "Trade held gear for Salvage." : "Only sellable carried gear appears here."}</small>
            </div>
            {sellInventory.length > 0 ? (
              <div className="phone-shop-focused-offer">
                {[selectedSale].map((item) => {
                  if (!item) return null;
                  const disabledReason = formatShopDisabledReason(item.disabledReason);
                  const itemKey = sellItemKey(item);
                  const isPending = pendingActionId === `sell:${itemKey}`;
                  const isSold = soldItemName === item.name;
                  return (
                    <PhoneWrappedMediaCard
                      key={itemKey}
                      variant="shop"
                      className={`phone-shop-stock-card phone-shop-panel__stock-card phone-shop-sell-card${
                        item.sellable ? "" : " phone-shop-stock-card-disabled"
                      }`}
                      media={<ShopItemMedia cardId={item.gearId} label={item.name} itemType={item.type} rules={item.summary} />}
                      title={item.name}
                      eyebrow={item.category ? toTitleCase(item.category) : toTitleCase(item.type)}
                      status={<span className="phone-shop-card-status">{item.sellable ? "Sell value" : "Cannot sell"}</span>}
                      description={<p className="phone-wrap-card__consequence">{item.summary}</p>}
                      disabledReason={disabledReason ? <small>{disabledReason}. Ignore this item for selling.</small> : null}
                      meta={<span>{item.sellable ? `Sell value: ${item.sellValue} Salvage` : "Cannot sell this item"}</span>}
                      actions={
                        <GameButton
                          type="button"
                          tone="shop"
                          className="phone-button phone-button-primary"
                          disabled={!item.sellable || isPending || isSold}
                          disabledReason={disabledReason ?? (isPending ? "Selling..." : isSold ? "Sold" : undefined)}
                          onClick={() => confirmSale(item.gearId, item.instanceId)}
                        >
                          {isPending ? "Selling..." : isSold ? "Sold" : `Sell ${item.name}`}
                        </GameButton>
                      }
                    />
                  );
                })}
                {sellInventory.length > 1 ? <div className="phone-shop-offer-navigation" aria-label="Sale navigation">
                  <GameButton type="button" tone="secondary" onClick={() => {
                    const item = sellInventory[(selectedSaleIndex - 1 + sellInventory.length) % sellInventory.length]!;
                    setFocusedOfferId(sellItemKey(item));
                    onIntent({ type: "SHOP_BROWSE_SELECTED", seatId, view: "sell", selectedId: sellItemKey(item) });
                  }}>Previous</GameButton>
                  <span>{selectedSaleIndex + 1} / {sellInventory.length}</span>
                  <GameButton type="button" tone="secondary" onClick={() => {
                    const item = sellInventory[(selectedSaleIndex + 1) % sellInventory.length]!;
                    setFocusedOfferId(sellItemKey(item));
                    onIntent({ type: "SHOP_BROWSE_SELECTED", seatId, view: "sell", selectedId: sellItemKey(item) });
                  }}>Next</GameButton>
                </div> : null}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">No sellable items.</p>
            )}
          </div> : null}

        </>
      )}

      <div className="phone-shop-skip">
        <GameButton
          type="button"
          tone="secondary"
          className="phone-shop-skip-button"
          disabled={isLocked || pendingActionId === "leave"}
          disabledReason={isLocked ? blockedReasonText : undefined}
          onClick={skipShop}
        >
          {pendingActionId === "leave" ? "Leaving..." : "Leave Shop"}
        </GameButton>
      </div>

    </section>
  );
}

function MovementPlanner({
  planner,
  seatId,
  activeContract,
  canRoll,
  selectedSectorId,
  onSelectedSectorId,
  onIntent
}: {
  planner: PublicMovementPlannerState | null | undefined;
  seatId: string;
  activeContract: ContractCard | null;
  canRoll: boolean;
  selectedSectorId: string | null;
  onSelectedSectorId: (sectorId: string | null) => void;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const [pendingCompassAdjustment, setPendingCompassAdjustment] = useState<-1 | 1 | null>(null);
  if (!planner?.active) {
    if (!canRoll) return null;
    return (
      <section className="phone-movement-planner" aria-label="Movement planner" data-testid="movement-planner">
        <MovementEmptyState
          title="Roll movement"
          text="Roll movement to reveal your legal destinations."
          detail="Legal destinations appear after the server records your movement roll."
        />
        <div className="phone-movement-roll-actions">
          <button
            type="button"
            className="phone-action-button phone-action-button-primary"
            onClick={() =>
              onIntent({
                type: "MOVEMENT_ROLL_REQUESTED",
                seatId
              })
            }
          >
            Roll Movement
          </button>
        </div>
      </section>
    );
  }

  const selected = selectedSectorId
    ? planner.destinations.find((destination) => destination.sectorId === selectedSectorId) ?? null
    : null;

  return (
    <section className="phone-movement-planner" aria-label="Movement planner" data-testid="movement-planner">
      {planner.compassPrompt ? (
        <div className="phone-movement-route-section" aria-label="Ashen Route Compass prompt">
          <strong>Use Ashen Route Compass?</strong>
          <p>Spend 1 charge to adjust movement by −1 or +1.</p>
          {pendingCompassAdjustment ? (
            <>
              <p>Roll {planner.originalMovementValue} | Compass {pendingCompassAdjustment > 0 ? "+1" : "−1"} | Move {(planner.originalMovementValue ?? planner.movementValue) + pendingCompassAdjustment}</p>
              <GameButton type="button" tone="move" onClick={() => { onIntent({ type: "ADJUST_MOVEMENT_REQUESTED", seatId, instanceId: planner.compassPrompt!.instanceId, adjustment: pendingCompassAdjustment }); setPendingCompassAdjustment(null); }}>Confirm — spend 1 charge</GameButton>
              <GameButton type="button" tone="secondary" onClick={() => setPendingCompassAdjustment(null)}>Cancel</GameButton>
            </>
          ) : (
            <>
              <GameButton type="button" tone="secondary" disabled={!planner.compassPrompt.canDecrease} onClick={() => setPendingCompassAdjustment(-1)}>Move −1</GameButton>
              <GameButton type="button" tone="secondary" disabled={!planner.compassPrompt.canIncrease} onClick={() => setPendingCompassAdjustment(1)}>Move +1</GameButton>
              <GameButton type="button" tone="secondary">Keep original roll</GameButton>
            </>
          )}
        </div>
      ) : planner.movementAdjustment ? <p>Roll {planner.originalMovementValue} | Compass {planner.movementAdjustment > 0 ? "+1" : "−1"} | Move {planner.movementValue}</p> : null}
      <MovementDestinationList
        planner={planner}
        activeContract={activeContract}
        selectedSectorId={selected?.sectorId ?? null}
        seatId={seatId}
        onSelected={onSelectedSectorId}
        onIntent={onIntent}
      />
    </section>
  );
}

function MovementSummaryHeader({ planner }: { planner: PublicMovementPlannerState }): ReactElement {
  const movementModifiers = planner.modifierSources ?? [];
  const movementModifierTotal = movementModifiers.reduce((total, source) => total + source.value, 0);
  const diceResultKey = planner.rolledValue === undefined
    ? null
    : `${planner.movementRevision ?? "movement"}:${planner.rolledValue}:${planner.movementValue}`;
  const diceDisclosure = useAuthoritativeResultCollapse(diceResultKey, 100);
  return (
    <div className="phone-movement-summary" aria-label="Movement summary" data-testid="movement-summary">
      <span className="sr-only">Move {planner.movementValue}</span>
      <div
        className={`phone-movement-dice phone-auto-collapse-dice${diceDisclosure.collapsed ? " is-collapsed" : ""}`}
        data-testid="movement-dice-animation"
        aria-label={`Movement die result ${planner.movementValue}`}
      >
        <button type="button" className="phone-auto-collapse-dice__summary" aria-expanded={!diceDisclosure.collapsed} onClick={diceDisclosure.collapsed ? diceDisclosure.expand : diceDisclosure.collapse}>
          <span>Movement roll</span>
          <strong>{planner.movementValue}</strong>
        </button>
        <CombatDiceAnimation
          attackValue={planner.rolledValue ?? planner.movementValue}
          defenseValue={null}
          modifierValue={movementModifierTotal}
          attackDieFace={planner.rolledValue ?? planner.movementValue}
          defenseDieFace={null}
          showModifierDie={movementModifiers.length > 0}
          compact
          challengeStat="signal"
        />
      </div>
      <div className="phone-movement-summary-chips">
        {planner.rolledValue !== undefined ? <span>Rolled {planner.rolledValue}</span> : null}
        {movementModifiers.map((source) => <span key={`${source.label}:${source.value}`}>{source.label} {source.value > 0 ? `+${source.value}` : source.value}</span>)}
        {movementModifiers.length > 0 ? <span>Final allowance {planner.movementValue}</span> : null}
        <div className="phone-movement-summary-chip">
          <span>Move Value</span>
          <strong>{planner.movementValue}</strong>
        </div>
        <div className="phone-movement-summary-chip">
          <span>Legal Destinations</span>
          <strong>{planner.destinations.length}</strong>
        </div>
      </div>
      <div className="phone-movement-summary-current" data-testid="movement-current-sector">
        <span>Current Sector</span>
        <strong>{planner.currentSectorName}</strong>
      </div>
    </div>
  );
}

function MovementEmptyState({
  title,
  text,
  detail
}: {
  title: string;
  text: string;
  detail?: string;
}): ReactElement {
  return (
    <div className="phone-movement-empty" role="status">
      <strong>{title}</strong>
      <p>{text}</p>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function PhoneMovementAnimation({ travel }: { travel: PhoneMovementTravelState | null }): ReactElement | null {
  if (!travel) {
    return null;
  }

  return (
    <div
      className={`phone-movement-animation${travel.reducedMotion ? " phone-movement-animation--reduced" : ""}`}
      data-testid="phone-movement-animation"
      data-reduced-motion={travel.reducedMotion ? "true" : "false"}
      role="status"
      style={{ ["--phone-movement-duration" as string]: `${travel.durationMs}ms` }}
    >
      <span className="phone-movement-animation-track" aria-hidden="true">
        <span className="phone-movement-animation-node phone-movement-animation-node-start" />
        <span className="phone-movement-animation-token" />
        <span className="phone-movement-animation-node phone-movement-animation-node-end" />
      </span>
      <div>
        <span>{travel.reducedMotion ? "Moved" : "Moving"}</span>
        <strong>
          {travel.fromSectorName} to {travel.toSectorName}
        </strong>
      </div>
    </div>
  );
}

function MovementDestinationList({
  planner,
  activeContract,
  selectedSectorId,
  seatId,
  onSelected,
  onIntent
}: {
  planner: PublicMovementPlannerState;
  activeContract: ContractCard | null;
  selectedSectorId: string | null;
  seatId: string;
  onSelected: (sectorId: string | null) => void;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement {
  return (
    <div className="phone-movement-list-view" data-testid="movement-list-view">
      <MovementSummaryHeader planner={planner} />
      <div className="phone-movement-list-heading">
        <span>Legal destinations</span>
        <small>{planner.destinations.length} route{planner.destinations.length === 1 ? "" : "s"}</small>
      </div>
      {planner.destinations.length === 0 ? (
        <MovementEmptyState
          title="No legal destinations"
          text="There are no legal destinations from your current sector."
          detail="This can happen when no exact route matches the movement roll or a scenario effect seals the route."
        />
      ) : (
        <div className="phone-movement-destination-list" role="list" aria-label="Legal destinations">
          {planner.destinations.map((destination, index) => (
            <MovementDestinationRow
              key={destination.sectorId}
              destination={destination}
              planner={planner}
              activeContract={activeContract}
              selected={destination.sectorId === selectedSectorId}
              marker={String.fromCharCode(65 + index)}
              seatId={seatId}
              onSelected={onSelected}
              onIntent={onIntent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MovementDestinationRow({
  destination,
  planner,
  activeContract,
  selected,
  marker,
  seatId,
  onSelected,
  onIntent
}: {
  destination: PublicMoveDestination;
  planner: PublicMovementPlannerState;
  activeContract: ContractCard | null;
  selected: boolean;
  marker: string;
  seatId: string;
  onSelected: (sectorId: string | null) => void;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement {
  const primaryTag = getPrimaryMovementTag(destination);
  const isLocked = Boolean(destination.disabledReason);
  const routePreview = buildRoutePreviewCopy(destination, planner.movementValue, planner.currentSectorName);
  const confidenceItems = getMovementRouteConfidenceItems(destination, routePreview);
  const identityLine = buildDestinationIdentityLine(destination);
  const missionRelevance = getMissionRelevanceForSector(activeContract, destination.sectorId, {
    threatIcons: destination.threatIcons,
    faceUpThreatCount: destination.faceUpThreats.length
  });

  return (
    <article
      className={`phone-movement-row phone-move-panel__destination-row${selected ? " is-selected" : ""}${isLocked ? " phone-movement-row-disabled" : ""}${missionRelevance ? " phone-movement-row-mission" : ""}`}
      role="listitem"
      data-testid="movement-destination-row"
      data-mission-target={missionRelevance ? "true" : "false"}
    >
      <span className="phone-movement-row-marker" aria-hidden="true">{marker}</span>
      <PhoneWrappedMediaCard
        variant="movement"
        className="phone-movement-row-button"
        media={<MovementTileMedia destination={destination} />}
        title={destination.name}
        eyebrow={destination.ringTransition?.label ?? movementTagLabel[primaryTag]}
        status={
          <>
            <MovementRouteConfidence items={confidenceItems} testId="movement-route-confidence" />
            {missionRelevance ? (
              <span className="phone-mission-marker" data-testid="movement-destination-mission-marker">
                Mission
              </span>
            ) : null}
          </>
        }
        description={<p className="phone-movement-row-lore" data-testid="movement-destination-lore">{identityLine}</p>}
        meta={
          <details className="phone-movement-route-details">
            <summary>Route details</summary>
            <span className="phone-movement-row-route phone-move-panel__route-preview" data-testid="movement-route-preview">
              Route: {getRoutePreviewLine(destination)}
            </span>
          </details>
        }
        disabledReason={destination.disabledReason ? <span className="phone-movement-disabled-reason">{destination.disabledReason}.</span> : null}
        actions={
          <GameButton
            type="button"
            tone={primaryTag === "danger" || primaryTag === "locked" ? "battle" : primaryTag === "shop" ? "shop" : "move"}
            className="phone-button phone-button-primary phone-movement-select-button"
            aria-label={`${primaryTag === "locked" ? "Locked " : "Select "}${destination.name}`}
            disabled={isLocked}
            disabledReason={destination.disabledReason}
            onClick={() => onSelected(destination.sectorId)}
          >
            {selected ? "Selected" : "Select"}
          </GameButton>
        }
      />
      {selected ? (
        <MovementDestinationDetail
          planner={planner}
          selected={destination}
          seatId={seatId}
          activeContract={activeContract}
          onBack={() => onSelected(null)}
          onIntent={onIntent}
        />
      ) : null}
    </article>
  );
}

function MovementRouteSteps({
  destination,
  currentSectorId
}: {
  destination: PublicMoveDestination;
  currentSectorId: string;
}): ReactElement {
  const routeNames = getRouteNames(destination);

  return (
    <ol className="phone-movement-route-steps" aria-label="Route steps" data-testid="movement-route-steps">
      {routeNames.map((routeName, index) => {
        const sectorId = destination.route[index];
        const isCurrent = sectorId === currentSectorId || index === 0;
        const isDestination = index === routeNames.length - 1;

        return (
          <li key={`${sectorId ?? routeName}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{routeName}</strong>
              {isCurrent ? <small>Current Sector</small> : null}
              {isDestination ? <small>Destination</small> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MovementDestinationDetail({
  planner,
  selected,
  seatId,
  activeContract,
  onBack,
  onIntent
}: {
  planner: PublicMovementPlannerState;
  selected: PublicMoveDestination;
  seatId: string;
  activeContract: ContractCard | null;
  onBack: () => void;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement {
  const routePreview = buildRoutePreviewCopy(selected, planner.movementValue, planner.currentSectorName, true);
  const tagLabels = getMovementTagLabels(selected, routePreview.tagLabels);
  const routeUnavailable = Boolean(selected.disabledReason);
  const voidKeyPrompt = selected.voidKeyPrompt;
  const canUseVoidKey = routeUnavailable && Boolean(voidKeyPrompt);
  const confidenceItems = getMovementRouteConfidenceItems(selected, routePreview);
  const identityLine = buildDestinationIdentityLine(selected);
  const missionRelevance = getMissionRelevanceForSector(activeContract, selected.sectorId, {
    threatIcons: selected.threatIcons,
    faceUpThreatCount: selected.faceUpThreats.length
  });
  const detailRef = useRef<HTMLElement | null>(null);
  const [moveSubmitted, setMoveSubmitted] = useState(false);
  const [previewRouteId, setPreviewRouteId] = useState<string | null>(null);
  const routeVariants = selected.routeVariants ?? [];
  const routeStarPrompt = selected.routeStarPrompt;

  useLayoutEffect(() => {
    detailRef.current?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    setPreviewRouteId(null);
  }, [selected.sectorId]);

  useEffect(() => {
    setMoveSubmitted(false);
  }, [selected.sectorId]);

  return (
    <article
      ref={detailRef}
      className="phone-movement-detail phone-move-panel__detail"
      aria-label={`${selected.name} movement detail`}
      data-testid="movement-detail-view"
    >
      <div className="phone-movement-detail-body">
        <PhoneWrappedMediaCard
          variant="movement"
          className="phone-movement-detail-hero"
          media={<MovementTileMedia destination={selected} />}
          title={selected.name}
          eyebrow={selected.ringTransition?.label ?? "Destination"}
          status={<MovementRouteConfidence items={confidenceItems} testId="movement-detail-route-confidence" />}
          description={
            <>
              <p className="phone-movement-row-lore" data-testid="movement-detail-lore">{identityLine}</p>
              {selected.ringTransition ? (
                <p className="phone-movement-transition-note" data-testid="movement-transition-note">
                  Exact movement 1 · movement ends after crossing
                </p>
              ) : null}
              <p>{routeUnavailable ? (canUseVoidKey ? "Route requires Void Key." : "Route unavailable.") : `${routePreview.statusLabel}: ${routePreview.statusReason}`}</p>
              {missionRelevance ? (
                <p className="phone-mission-callout" data-testid="movement-detail-mission">
                  This destination can progress your mission.
                </p>
              ) : null}
            </>
          }
          meta={
            <>
              <div className="phone-movement-row-tags">
                {tagLabels.map((tag) => (
                  <em key={tag}>{tag}</em>
                ))}
              </div>
              <details className="phone-movement-route-details">
                <summary>Exact route</summary>
                <span className="phone-movement-route-summary" data-testid="movement-detail-route-summary">
                  Route: {getRoutePreviewLine(selected)}
                </span>
              </details>
            </>
          }
          disabledReason={routeUnavailable && !canUseVoidKey ? <span className="phone-movement-disabled-reason">{selected.disabledReason}.</span> : null}
          actions={
            <>
              <GameButton type="button" tone="secondary" className="phone-button phone-button-secondary phone-movement-back" onClick={onBack}>
                Back
              </GameButton>
              <GameButton
                type="button"
                tone="move"
                className="phone-button phone-button-primary phone-movement-confirm"
                disabled={(routeUnavailable && !canUseVoidKey) || moveSubmitted}
                disabledReason={selected.disabledReason ?? (moveSubmitted ? "Movement is already being confirmed." : undefined)}
                onClick={() => {
                  if ((routeUnavailable && !canUseVoidKey) || moveSubmitted) {
                    return;
                  }

                  setMoveSubmitted(true);
                  onIntent({
                    type: "MOVE_REQUESTED",
                    seatId,
                    toSectorId: selected.sectorId
                    ,voidKeyInstanceId: voidKeyPrompt?.instanceId,
                    routeId: planner.routeStarCommitted ? selected.routeId : undefined,
                    movementRevision: planner.routeStarCommitted ? planner.movementRevision : undefined
                  });
                }}
              >
                {moveSubmitted ? "Moving..." : canUseVoidKey ? "Use Void Key — 1 charge" : "Confirm Move"}
              </GameButton>
            </>
          }
        />

        <section className="phone-movement-route-section" aria-label="Route review">
          <span>Route</span>
          <MovementRouteSteps destination={selected} currentSectorId={planner.currentSectorId} />
        </section>

        {routeStarPrompt && routeVariants.length > 1 ? (
          <section className="phone-movement-detail-section" aria-label="Route Star choices" data-testid="route-star-prompt">
            <span>Use Route Star?</span>
            <p>Spend 1 charge to choose an alternate legal route.</p>
            {routeVariants.map((variant) => {
              const isDefault = variant.routeId === selected.defaultRouteId;
              const names = variant.sectorNames ?? variant.sectorIds;
              return (
                <div key={variant.routeId} className="phone-movement-route-summary">
                  <strong>{names.join(" → ")}</strong>
                  <small>{variant.distance} sectors{isDefault ? " · Default" : ""}</small>
                  {!isDefault ? <GameButton type="button" tone="secondary" onClick={() => setPreviewRouteId(variant.routeId)}>Preview route</GameButton> : null}
                  {!isDefault && previewRouteId === variant.routeId ? (
                    <GameButton type="button" tone="move" onClick={() => onIntent({ type: "SELECT_ROUTE_STAR_VARIANT", seatId, instanceId: routeStarPrompt.instanceId, destinationId: selected.sectorId, routeId: variant.routeId, movementRevision: planner.movementRevision! })}>
                      Choose this route — 1 charge
                    </GameButton>
                  ) : null}
                </div>
              );
            })}
            <GameButton type="button" tone="secondary" onClick={() => setPreviewRouteId(null)}>Keep default route</GameButton>
          </section>
        ) : null}

        {planner.routeStarCommitted && planner.selectedRouteId === selected.routeId ? <p data-testid="route-star-confirmation">Route Star: alternate route selected</p> : null}

        <footer className="phone-movement-confirm-footer" data-testid="movement-confirm-footer">
          <p>{canUseVoidKey ? `Use Void Key? Spend 1 charge to ignore this gate for this movement. ${voidKeyPrompt!.currentCharges - 1}/${voidKeyPrompt!.maxCharges} charges will remain.` : routeUnavailable ? "This route is blocked by a scenario effect or sealed sector." : "This will end your movement."}</p>
        </footer>

        <section className="phone-movement-detail-section">
          <span>Sector effects</span>
          <p>{selected.ruleText || "None detected."}</p>
        </section>

        <section className="phone-movement-detail-section" aria-label="Movement intel">
          <span>Intel</span>
          <div className="phone-movement-intel-grid">
            <span>Why legal</span>
            <strong>{routePreview.exactText}</strong>
            <span>Icons</span>
            <strong className="phone-movement-inline-icons">
              {selected.threatIcons.length > 0
                ? selected.threatIcons.map((icon, index) => (
                    <span key={`${icon}-${index}`} className="phone-movement-inline-icon-wrap">
                      <span className="sr-only">{formatThreatIcon(icon)}</span>
                      <ThreatIconBadge icon={icon} />
                    </span>
                  ))
                : "None"}
            </strong>
            <span>Status</span>
            <strong>{routeUnavailable ? "Route unavailable" : `${routePreview.statusLabel}: ${routePreview.statusReason}`}</strong>
          </div>
        </section>

        {routePreview.riskText || routePreview.rewardText || selected.shop ? (
          <section className="phone-movement-detail-section">
            <span>Notes</span>
            {routePreview.riskText ? <p>{routePreview.riskText}</p> : null}
            {routePreview.rewardText ? <p>{routePreview.rewardText}</p> : null}
            {selected.shop ? <p>{selected.shop.servicesPreview.join(" / ")}</p> : null}
          </section>
        ) : null}

        <section className="phone-movement-threats">
          <span>Current blockers</span>
          {selected.faceUpThreats.length > 0 ? (
            selected.faceUpThreats.map((threat) => (
              <div key={threat.instanceId} className="phone-movement-threat-row">
                <strong>{threat.name}</strong>
                <small>
                  {threat.deck ? `${formatThreatIcon(threat.deck)} ` : ""}
                  {threat.type}
                  {threat.challenge ? (
                    <>
                      {" | "}
                      <ChallengeBadge stat={threat.challenge.stat} value={threat.challenge.value} size="compact" />
                    </>
                  ) : ""}
                </small>
              </div>
            ))
          ) : (
            <p>No face-up blockers. Hidden deck cards remain unknown.</p>
          )}
        </section>

        {selected.occupants.length > 0 ? (
          <section className="phone-movement-occupants">
            <span>Occupants</span>
            {selected.occupants.map((occupant) => (
              <p key={occupant.playerId}>
                {occupant.name}: {occupant.characterName}
              </p>
            ))}
          </section>
        ) : null}

        {selected.scenarioMarkers && selected.scenarioMarkers.length > 0 ? (
          <section className="phone-movement-markers">
            <span>Scenario markers</span>
            <p>{selected.scenarioMarkers.join(", ")}</p>
          </section>
        ) : null}

      </div>
    </article>
  );
}

function PhoneMovePanel({
  movementPlanner,
  currentTile,
  movementTravel,
  approachResolution,
  approachOutcome,
  canContinueApproach,
  onContinueApproach,
  seatId,
  activeContract,
  onIntent,
  canRollMovement,
  movementResolving,
  showContextNavigation,
  onContextNavigation,
  actorName,
  operativeName,
  operativeId,
  resultDeltas,
  diceCount,
  hostView,
  tierTransitions,
  innerApproach,
  transitionRouteAid
}: {
  movementPlanner: PublicMovementPlannerState | null | undefined;
  currentTile: CurrentTileViewModel;
  movementTravel: PhoneMovementTravelState | null;
  approachResolution: ActiveResolution | null;
  approachOutcome: OutcomeSummary | null;
  canContinueApproach: boolean;
  onContinueApproach: () => void;
  seatId: string;
  activeContract: ContractCard | null;
  onIntent: (intent: ClientIntent) => void;
  canRollMovement: boolean;
  movementResolving: boolean;
  showContextNavigation: boolean;
  onContextNavigation?: (target: MovementNavigationTarget) => void;
  actorName?: string;
  operativeName: string;
  operativeId: string;
  resultDeltas: ResultDelta[];
  diceCount?: number;
  hostView?: PublicHostViewState;
  tierTransitions?: PhonePatchPayload["tierTransitions"];
  innerApproach?: PhonePatchPayload["innerApproach"];
  transitionRouteAid?: PhonePatchPayload["transitionRouteAid"];
}): ReactElement {
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(() => movementPlanner?.selectedDestinationId ?? null);
  const [routeAidSourceId, setRouteAidSourceId] = useState<string | null>(null);
  const [routeAidDestinationId, setRouteAidDestinationId] = useState<string | null>(null);

  usePhoneBackDismissal(selectedSectorId !== null, () => {
    setSelectedSectorId(null);
    return true;
  });

  useEffect(() => {
    const authoritativeSelection = movementPlanner?.selectedDestinationId ?? null;
    setSelectedSectorId(
      authoritativeSelection && movementPlanner?.destinations.some((destination) => destination.sectorId === authoritativeSelection)
        ? authoritativeSelection
        : null
    );
  }, [movementPlanner?.currentSectorId, movementPlanner?.movementValue, movementPlanner?.selectedDestinationId]);

  const approachTotal = approachResolution?.roll?.finalTotal ?? approachOutcome?.checkTotal ?? null;
  const approachTarget = approachResolution?.roll?.target ?? approachOutcome?.difficulty ?? null;
  const approachSuccess = approachResolution?.roll?.success ?? approachOutcome?.success ?? null;
  if ((approachResolution?.roll || approachOutcome) && approachTotal !== null && approachTarget !== null) {
    const destination = approachResolution?.card?.title ?? approachOutcome?.encounterTitle ?? currentTile.name;
    const destinationSectorId =
      approachOutcome?.movedToSectorId
      ?? (approachResolution?.card?.id && getSignalTheatreEnvironment(approachResolution.card.id)
        ? approachResolution.card.id
        : currentTile.sectorId);
    const destinationArtPath =
      getSignalTheatreEnvironment(destinationSectorId)?.path
      ?? signalTheatreEnvironments.find((environment) => environment.sectorName === destination)?.path
      ?? currentTile.artPath
      ?? getTileAssetPath(destinationSectorId);
    const outcomeText = approachResolution?.outcome?.text ?? approachOutcome?.summary;
    return (
      <div className="phone-approach-result" data-testid="phone-approach-result">
        <PhoneResultReadyGate
          actorName={actorName ?? operativeName}
          operativeName={operativeName}
          operativeId={operativeId}
          sourceLabel="Approach Result"
          challengeTitle={destination}
          challengeArtType={null}
          challengeArtId={null}
          challengeImagePath={destinationArtPath}
          success={approachSuccess}
          playerTotal={approachTotal}
          targetTotal={approachTarget}
          resolutionId={
            approachResolution?.id
            ?? (approachOutcome ? `approach:${seatId}:${approachOutcome.movedToSectorId ?? currentTile.sectorId}:${approachOutcome.checkTotal ?? "-"}` : undefined)
          }
          dice={
            approachResolution?.roll?.dice
            ?? [approachOutcome?.die1, approachOutcome?.die2].filter((die): die is number => typeof die === "number")
          }
          modifierTotal={approachResolution?.roll?.modifierTotal ?? 0}
          playerTotalLabel="Player total"
          targetTotalLabel="Difficulty total"
          outcomeTitle={approachSuccess ? "Approach held" : "Approach setback"}
          outcomeText={outcomeText ?? (approachSuccess ? `Moved into ${destination}.` : `Failed to enter ${destination}.`)}
          outcomeEffects={[]}
          resultDeltas={resultDeltas}
          canContinue={canContinueApproach}
          onContinue={onContinueApproach}
        />
      </div>
    );
  }

  return (
    <>
      {canRollMovement && transitionRouteAid && transitionRouteAid.destinations.length > 0 ? (
        <details className="phone-route-aid" data-testid="transition-route-aid">
          <summary>
            <span>Route aid</span>
            <strong>Move to a transition sector</strong>
          </summary>
          <p>Spend one of two charges before rolling. The route stays within this reach and stops at the transition sector.</p>
          <label>
            Choose aid
            <select value={routeAidSourceId ?? ""} onChange={(event) => setRouteAidSourceId(event.target.value || null)}>
              <option value="">Select an item or follower</option>
              {transitionRouteAid.sources.map((source) => (
                <option key={`${source.sourceKind}:${source.instanceId}`} value={`${source.sourceKind}:${source.instanceId}`}>
                  {source.name} · {source.currentCharges}/{source.maxCharges}
                </option>
              ))}
            </select>
          </label>
          <label>
            Transition sector
            <select value={routeAidDestinationId ?? ""} onChange={(event) => setRouteAidDestinationId(event.target.value || null)}>
              <option value="">Choose a sector</option>
              {transitionRouteAid.destinations.map((destination) => (
                <option key={destination.sectorId} value={destination.sectorId}>
                  {destination.name} · {destination.distance} stops
                </option>
              ))}
            </select>
          </label>
          {routeAidDestinationId ? (
            <p className="phone-route-aid__route">
              {transitionRouteAid.destinations.find((destination) => destination.sectorId === routeAidDestinationId)?.routeNames.join(" → ")}
            </p>
          ) : null}
          <GameButton
            type="button"
            tone="move"
            disabled={!routeAidSourceId || !routeAidDestinationId}
            disabledReason={!routeAidSourceId ? "Choose a route aid." : !routeAidDestinationId ? "Choose a transition sector." : undefined}
            onClick={() => {
              const [sourceKind, instanceId] = (routeAidSourceId ?? "").split(":");
              if (!instanceId || !routeAidDestinationId || (sourceKind !== "gear" && sourceKind !== "follower")) return;
              onIntent({
                type: "USE_TRANSITION_ROUTE_AID",
                seatId,
                sourceKind,
                instanceId,
                destinationSectorId: routeAidDestinationId,
                movementRevision: transitionRouteAid.revision
              });
            }}
          >
            Spend 1 charge and travel
          </GameButton>
        </details>
      ) : null}
      <PhoneMovementView
        planner={movementPlanner}
        seatId={seatId}
        activeContract={activeContract}
        currentSectorId={currentTile.sectorId}
        currentSectorName={currentTile.name}
        canRoll={canRollMovement}
        movementResolving={movementResolving}
        travel={movementTravel ? { fromSectorName: movementTravel.fromSectorName, toSectorName: movementTravel.toSectorName } : null}
        selectedSectorId={selectedSectorId}
        onSelectedSectorId={setSelectedSectorId}
        onIntent={onIntent}
        showContextNavigation={showContextNavigation}
        onContextNavigation={onContextNavigation}
        actorName={actorName}
        diceCount={diceCount}
        hostView={hostView}
        tierTransitions={tierTransitions}
        innerApproach={innerApproach}
      />
    </>
  );
}

function PhoneBattlePanel({
  title,
  activeResolution,
  encounter,
  resolutionPanel,
  battleAssistPanel,
  threatActions,
  resolveActions,
  hasBattleContent,
  visibleBattleDeltas,
  usefulNow
}: {
  title: string;
  activeResolution: ActiveResolution | null;
  encounter: PhonePatchPayload["encounter"];
  resolutionPanel: ReactElement | null;
  battleAssistPanel: ReactElement | null;
  threatActions: ActionButtonDefinition[];
  resolveActions: ActionButtonDefinition[];
  hasBattleContent: boolean;
  visibleBattleDeltas: ResultDelta[];
  usefulNow: UsefulNowViewModel | null;
}): ReactElement {
  const categoryLabel = formatEncounterSourceLabel(activeResolution?.source, activeResolution?.card?.type ?? encounter?.cardType);
  const resolvedResult = Boolean(activeResolution?.roll && activeResolution?.outcome);
  return (
    <section className={`phone-action-active-panel phone-battle-panel${resolvedResult ? " phone-battle-panel--result" : ""}`} data-testid="phone-action-active-panel" aria-label={`${categoryLabel} command screen`}>
      <header className="phone-battle-panel__header">
        <span>{categoryLabel}</span>
        <strong>{title}</strong>
      </header>
      {resolutionPanel ? <div className="phone-battle-panel__roll-card">{resolutionPanel}</div> : null}
      {resolvedResult ? (
        <details className="phone-battle-panel__encounter-details">
          <summary>Encounter details and lore</summary>
          <BattleSubjectCard resolution={activeResolution} encounter={encounter} />
        </details>
      ) : <BattleSubjectCard resolution={activeResolution} encounter={encounter} />}
      <ActionSections sections={[
        { key: "choice", title: "Required choice", detail: "Resolve before continuing", actions: resolveActions, defaultOpen: true },
        { key: "threat", title: "Threat", detail: title, actions: threatActions, defaultOpen: true }
      ]} />
      {battleAssistPanel}
      <UsefulNowPanel model={usefulNow} variant="secondary" />
      <ResultDeltaRow deltas={visibleBattleDeltas} className="phone-battle-deltas phone-battle-panel__result" />
      {!hasBattleContent && (
        <EmptyTurnTab title="No battle active." text="Battle cards will appear here when you engage an enemy or event." />
      )}
    </section>
  );
}

function PhoneShopCommandPanel({
  shopEncounter,
  resultDeltas,
  scarCount,
  seatId,
  onIntent,
  usefulNow,
  emptyTitle = "No shop here",
  emptyText = "Shop services appear when your operative is on a clear market, shrine, foundry, or service sector."
}: {
  shopEncounter: PublicShopEncounterState | null | undefined;
  resultDeltas: ResultDelta[];
  scarCount: number;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
  usefulNow: UsefulNowViewModel | null;
  emptyTitle?: string;
  emptyText?: string;
}): ReactElement {
  return (
    <section className="phone-action-active-panel phone-shop-command-panel phone-shop-panel" data-testid="phone-action-active-panel" aria-label="Shop command screen">
      <PhoneShopPanel shopEncounter={shopEncounter} resultDeltas={resultDeltas} scarCount={scarCount} seatId={seatId} onIntent={onIntent} />
      {!shopEncounter && (
        <EmptyTurnTab title={emptyTitle} text={emptyText} />
      )}
      <UsefulNowPanel model={usefulNow} variant="secondary" />
    </section>
  );
}

function PhoneSectorActionPanel({
  title,
  sectorOpportunityItems,
  sectorExplorationCopy,
  visibleActionDeltas,
  resolveActions,
  gearActions,
  objectActions,
  eligibleTestItemCount,
  followerActions,
  tableActions,
  contractActions,
  advanceActions,
  interactionMode,
  usefulNow
}: {
  title: string;
  sectorOpportunityItems: SectorOpportunityItem[];
  sectorExplorationCopy: ReturnType<typeof buildSectorExplorationCopy>;
  visibleActionDeltas: ResultDelta[];
  resolveActions: ActionButtonDefinition[];
  gearActions: ActionButtonDefinition[];
  objectActions: ActionButtonDefinition[];
  eligibleTestItemCount: number;
  followerActions: ActionButtonDefinition[];
  tableActions: ActionButtonDefinition[];
  contractActions: ActionButtonDefinition[];
  advanceActions: ActionButtonDefinition[];
  interactionMode: PhonePatchPayload["interactionMode"];
  usefulNow: UsefulNowViewModel | null;
}): ReactElement {
  return (
    <section className="phone-action-active-panel phone-sector-action-panel" data-testid="phone-action-active-panel" aria-label="Sector action command screen">
      <header className="phone-sector-action-panel__header">
        <span>Sector action</span>
        <strong>{title}</strong>
      </header>
      <SectorOpportunityChips items={sectorOpportunityItems} />
      {eligibleTestItemCount > 0 ? (
        <p className="phone-equipment-available" role="status">
          <strong>Equipment available</strong>
          {eligibleTestItemCount} item{eligibleTestItemCount === 1 ? "" : "s"} matches the current tested skill and timing.
        </p>
      ) : null}
      <ActionSections
        sectionClassName="phone-sector-action-panel__action-card"
        sections={[
          { key: "resolve", title: "Tile Action", detail: title, actions: resolveActions, defaultOpen: true },
          { key: "gear", title: "Gear", detail: `${gearActions.length} available`, actions: gearActions },
          { key: "objects", title: "Items", detail: `${eligibleTestItemCount} usable now`, actions: objectActions, defaultOpen: eligibleTestItemCount > 0 },
          { key: "followers", title: "Followers", detail: `${followerActions.length} ready`, actions: followerActions },
          { key: "table", title: "Table", detail: interactionMode ?? "rivalry", actions: tableActions },
          { key: "contracts", title: "Contracts", detail: `${contractActions.length} available`, actions: contractActions },
          { key: "advance", title: "Advance", detail: "Finish or confront", actions: advanceActions, defaultOpen: true }
        ]}
      />
      <SectorExplorationPanel summary={sectorExplorationCopy} />
      <ResultDeltaRow deltas={visibleActionDeltas} className="phone-action-deltas phone-sector-action-panel__result" />
      <UsefulNowPanel model={usefulNow} variant="secondary" />
    </section>
  );
}

export function PhoneActionPanel({
  characters,
  onIntent,
  patch,
  requiredActionSubmissionPending = false,
  selectedTurnTab: controlledSelectedTurnTab,
  onSelectedTurnTab,
  hideTurnTabs = false,
  onMovementNavigation,
  showMovementContextNavigation = true,
  onLeaveRoom,
  suppressTvPresentationWait = false
}: PhoneActionPanelProps): ReactElement {
  const [localSelectedTurnTab, setLocalSelectedTurnTab] = useState<TurnActionTab | null>(null);
  const selectedTurnTab = controlledSelectedTurnTab ?? localSelectedTurnTab;
  const setSelectedTurnTab = (tab: TurnActionTab) => {
    if (onSelectedTurnTab) {
      onSelectedTurnTab(tab);
      return;
    }

    setLocalSelectedTurnTab(tab);
  };
  const self = patch.self;
  const previousSectorRef = useRef<{ sectorId: string; sectorName: string } | null>(null);
  const [movementTravel, setMovementTravel] = useState<PhoneMovementTravelState | null>(null);
  const [memoryTaxSelection, setMemoryTaxSelection] = useState<{
    choiceId: string;
    optionId: "lose-salvage-1" | "next-non-battle-test-minus-1";
  } | null>(null);

  if (!self) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: 0</p>
        <p className="phone-sheet-action-copy">No seat is attached.</p>
      </section>
    );
  }

  const sharedPrompt = buildCurrentPlayerPrompt(patch);
  const usefulNow = buildUsefulNowViewModel(patch);
  const isActiveSeat = getActiveSeatId(patch) === self.seatId;
  const activeResolution = patch.activeResolution ?? null;
  const pendingOwnerResolutionChoice = Boolean(
    patch.pendingEquipmentSuppressionChoice ||
    patch.pendingGearEquipChoice ||
    patch.pendingEncounterDecisionPrivate ||
    patch.pendingMemoryTaxChoicePrivate ||
    patch.pendingAfflictionChoicePrivate ||
    patch.pendingAfflictionReactionPrivate ||
    patch.pendingForcedDestinationChoicePrivate ||
    patch.pendingDisplacementPrivate ||
    patch.edgeHand?.reaction ||
    patch.pendingScarChoice ||
    patch.pendingScarRemovalChoice ||
    patch.pendingScarConsequence ||
    patch.pendingTileChallengePrivate?.pendingFailureEffects?.length
  );
  const orphanResolutionOutcome =
    isActiveSeat &&
    !activeResolution &&
    !pendingOwnerResolutionChoice &&
    patch.phase === "resolution" &&
    patch.outcomeSummary?.seatId === self.seatId
      ? patch.outcomeSummary
      : null;
  const canContinueResolution =
    isActiveSeat &&
    !!activeResolution &&
    self.character.status !== "recalled" &&
    !patch.pendingEncounterDecisionPrivate &&
    !patch.pendingMemoryTaxChoicePrivate &&
    !patch.pendingAfflictionChoicePrivate &&
    !patch.pendingAfflictionReactionPrivate &&
    !patch.pendingForcedDestinationChoicePrivate &&
    !patch.pendingDisplacementPrivate &&
    !patch.edgeHand?.reaction &&
    (
      ["outcome_summary", "awaiting_continue"].includes(activeResolution.stage) ||
      (
        activeResolution.stage === "roll_result" &&
        patch.requiredAction?.allowedCommand === "continue"
      )
    );
  const continueResolution = () =>
    onIntent({
      type: "CONTINUE_RESOLUTION",
      seatId: self.seatId
    });
  const resolutionActorName =
    patch.seats.find((seat) => seat.seatId === self.seatId)?.displayName ??
    self.character.name;
  const currentDeltas = patch.playerResultDeltas ?? patch.publicResultDeltas ?? [];
  const resolutionPanel = orphanResolutionOutcome ? (
    <OrphanResolutionRecoveryCard
      outcome={orphanResolutionOutcome}
      canContinue={self.character.status !== "recalled"}
      onContinue={continueResolution}
    />
  ) : (
    <ActiveResolutionCard
      resolution={activeResolution}
      encounter={patch.encounter}
      actorName={resolutionActorName}
      operativeName={self.character.name}
      operativeId={self.character.id}
      challengeImagePath={
        activeResolution?.source === "movement"
          ? signalTheatreEnvironments.find((environment) => environment.sectorName === activeResolution.card?.title)?.path
            ?? getSignalTheatreEnvironment(self.sectorId)?.path
            ?? getTileAssetPath(self.sectorId)
            ?? undefined
          : undefined
      }
      resultDeltas={currentDeltas}
      canContinue={canContinueResolution}
      onContinue={continueResolution}
    />
  );
  const battleAssist = getBattleAssistViewModel(patch);
  const battleAssistPanel = <BattleAssistCard patch={patch} onIntent={onIntent} />;
  const sector = getSector(patch.sectors, self.sectorId);
  const boardSpace = getBoardSpace(self.sectorId);
  const sectorExplorationCopy = buildSectorExplorationCopy(patch.sectorExplorationSummary);
  const activeContract = getActiveContractCard(patch);
  const currentTile = buildCurrentTileViewModel(patch, self, sector, boardSpace, activeContract);
  const equippedIds = new Set(Object.values(self.character.equippedGear).filter((value): value is string => Boolean(value)));
  const pendingEnemyRoll = patch.pendingEnemyRoll;
  const isAssignedEnemyRoller = pendingEnemyRoll?.assignedRollerSeatId === self.seatId;
  const pendingRollerName =
    patch.seats.find((seat) => seat.seatId === pendingEnemyRoll?.assignedRollerSeatId)?.displayName ??
    pendingEnemyRoll?.assignedRollerSeatId ??
    "another seat";
  const pendingFighterName =
    patch.seats.find((seat) => seat.seatId === pendingEnemyRoll?.fighterSeatId)?.displayName ??
    pendingEnemyRoll?.fighterSeatId ??
    "the active seat";
  const opposedBattleActive = isOpposedPhoneBattleActive(patch);
  const sectorOpportunityItems = getSectorOpportunityItems(sector);
  const isScenarioConfrontation = isScenarioConfrontationSpace(self.sectorId);
  const movementPlanner = patch.movementPlanner ?? null;
  const movementOutcome =
    patch.phase !== "navigation" &&
    patch.outcomeSummary?.seatId === self.seatId &&
    patch.outcomeSummary.movedToSectorId
      ? patch.outcomeSummary
      : null;
  const compactResolutionResult = Boolean(
    orphanResolutionOutcome
    || activeResolution && ["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage)
  );

  useEffect(() => {
    if (patch.phase === "navigation") {
      setMovementTravel(null);
    }
  }, [patch.phase, self.seatId]);

  useEffect(() => {
    const currentSectorName = getBoardSpace(self.sectorId)?.name ?? sector?.name ?? self.sectorId;
    const previousSector = previousSectorRef.current;

    if (movementOutcome?.movedToSectorId === self.sectorId) {
      const fromSectorName =
        previousSector && previousSector.sectorId !== self.sectorId
          ? previousSector.sectorName
          : "Previous sector";

      setMovementTravel({
        key: `${self.seatId}:${fromSectorName}:${self.sectorId}:${movementOutcome.summary}`,
        fromSectorName,
        toSectorName: currentSectorName,
        durationMs: prefersReducedMotion() ? 0 : 760,
        reducedMotion: prefersReducedMotion()
      });
    }

    previousSectorRef.current = {
      sectorId: self.sectorId,
      sectorName: currentSectorName
    };
  }, [movementOutcome?.movedToSectorId, movementOutcome?.summary, sector?.name, self.seatId, self.sectorId]);

  useEffect(() => {
    if (!movementTravel) {
      return;
    }

    const timeout = window.setTimeout(
      () => setMovementTravel((current) => (current?.key === movementTravel.key ? null : current)),
      movementTravel.reducedMotion ? 1200 : Math.max(980, movementTravel.durationMs + 260)
    );

    return () => window.clearTimeout(timeout);
  }, [movementTravel]);
  const shopEncounter =
    patch.phase === "action" && patch.shopEncounter?.activePlayer.playerId === self.seatId ? patch.shopEncounter : null;
  const scarDecisionContent = patch.pendingScarChoice ? (
    <PhoneScarSelector
      cards={patch.pendingScarChoice.cards}
      source={patch.pendingScarChoice.source}
      currentCount={patch.pendingScarChoice.currentCount}
      thresholdWarning={patch.pendingScarChoice.thirdScarWarning}
      onChoose={(scarId) => onIntent({ type: "CHOOSE_SCAR", seatId: self.seatId, selectionId: patch.pendingScarChoice!.selectionId, scarId })}
    />
  ) : patch.pendingScarRemovalChoice ? (
    <ScarDecisionPanel
      mode="remove"
      cards={patch.pendingScarRemovalChoice.cards}
      currentCount={self.character.scars.length}
      warning={false}
      salvageCost={patch.pendingScarRemovalChoice.salvageCost}
      canPay={(self.character.salvage ?? 0) >= patch.pendingScarRemovalChoice.salvageCost}
      onChoose={(scarId) => onIntent({ type: "PURGE_SCAR_REQUESTED", seatId: self.seatId, choiceId: patch.pendingScarRemovalChoice!.choiceId, scarId })}
    />
  ) : null;

  if (patch.status === "ended") {
    const result = patch.matchProgress?.publicResult ?? null;
    const privateResult = patch.ownerPrivateResult ?? null;
    const outcomeLabel = result?.outcome === "victory" ? "Victory" : result?.outcome === "draw" ? "Draw" : "Defeat";
    return (
      <section className={`phone-match-result phone-match-result--${result?.outcome ?? "defeat"}`} aria-label="Match result" role="region">
        <div className="phone-match-result__hero" aria-live="polite">
          <span>{outcomeLabel}</span>
          <h2>{result?.title ?? "Session Complete"}</h2>
          <strong>{result?.missionName ?? patch.activeScenario?.name ?? "Shared Mission"}</strong>
          <p>{result?.reason ?? patch.outcomeSummary?.summary ?? "The authoritative match result is complete."}</p>
        </div>
        <div className="phone-match-result__summary" aria-label="Final match summary">
          <article><span>Victory Progress</span><strong>{result?.finalWinProgress ? `${result.finalWinProgress.current} / ${result.finalWinProgress.required}` : "Not tracked"}</strong></article>
          <article><span>Loss Pressure</span><strong>{result?.finalLossPressure ? `${result.finalLossPressure.current} / ${result.finalLossPressure.required}` : "Disabled"}</strong></article>
          <article><span>Mode</span><strong>{result?.modeLabel ?? "Session"}</strong></article>
          <article><span>Final Stage</span><strong>{result?.finalStageReached ? "Reached" : "Not reached"}</strong></article>
        </div>
        {result?.outcome === "victory" && result.winningDisplayNames.length > 0 ? (
          <p className="phone-match-result__winner">Secured by {result.winningDisplayNames.join(", ")}.</p>
        ) : null}
        {privateResult ? (
          <article className="phone-match-result__private" data-testid="phone-private-match-result">
            <span>{privateResult.label} Â· Owner only</span>
            <strong>{privateResult.agendaState.replace(/([A-Z])/g, " $1")}</strong>
            <p>{privateResult.summary}</p>
            {privateResult.pointsAwarded !== null ? <small>Private points: {privateResult.pointsAwarded}</small> : null}
          </article>
        ) : null}
        <div className="phone-match-result__actions">
          {result?.outcome === "defeat" && patch.selfIsSetupHost ? (
            <GameButton
              type="button"
              tone="primary"
              onClick={() => onIntent({ type: "RETURN_TO_LOBBY_REQUESTED", seatId: self.seatId })}
            >
              Start New Game
            </GameButton>
          ) : null}
          {onLeaveRoom && patch.matchProgress?.allowedCommands.includes("leave_room") ? (
            <GameButton type="button" tone="primary" onClick={onLeaveRoom}>Leave Room</GameButton>
          ) : null}
          {!patch.selfIsSetupHost ? <p>The host is preparing the next game.</p> : null}
        </div>
      </section>
    );
  }

  if (patch.tvPresentationGate && !suppressTvPresentationWait) {
    return <PhoneTvPresentationWait gate={patch.tvPresentationGate} seatId={self.seatId} />;
  }

  if (patch.pendingScarChoice) {
    return (
      <section className="phone-sheet-actions" aria-label="Required Scar choice">
        {scarDecisionContent}
      </section>
    );
  }

  if (patch.movementPresentationGate && !suppressTvPresentationWait) {
    return <PhoneMovementPresentationWait gate={patch.movementPresentationGate} seatId={self.seatId} />;
  }

  if (
    !canContinueResolution &&
    (
      patch.cooperativeAssistance ||
      patch.cooperativeAssistanceEligibility ||
      patch.pendingCooperativeTest ||
      patch.activeResolution?.assistance?.activeSeatId === self.seatId
    )
  ) {
    return <CooperativeAssistancePanel patch={patch} seatId={self.seatId} onIntent={onIntent} />;
  }

  if (opposedBattleActive && pendingEnemyRoll) {
    return (
      <PhoneBattleView
        patch={patch}
        self={self}
        onIntent={onIntent}
        submissionPending={requiredActionSubmissionPending}
      />
    );
  }

  if (patch.phase === "action" && pendingEnemyRoll) {
    if (isAssignedEnemyRoller) {
      return (
        <section className="phone-sheet-actions" aria-label="Quick actions">
          <div className="phone-sheet-section-heading">Quick Actions</div>
          <CurrentPromptCard
            prompt={currentPromptFromSharedPrompt(sharedPrompt, "battle")}
          />
          {resolutionPanel}
          {battleAssistPanel}
          <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
          <p className="phone-sheet-action-copy">{pendingFighterName} is engaged. Trigger the enemy roll when the table is ready.</p>
          <ActionSections
            sections={[
              {
                key: "combat",
                title: "Combat",
                defaultOpen: true,
                actions: [
                  {
                    key: "enemy-roll",
                    label: "Roll for the enemy",
                    detail: pendingEnemyRoll.encounterTitle,
                    tone: "primary",
                    onClick: () =>
                      onIntent({
                        type: "ENEMY_ROLL_REQUESTED",
                        seatId: self.seatId
                      })
                  }
                ]
              }
            ]}
          />
        </section>
      );
    }

    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <CurrentPromptCard
          prompt={currentPromptFromSharedPrompt(sharedPrompt)}
        />
        <UsefulNowPanel model={usefulNow} />
        {resolutionPanel}
        {battleAssistPanel}
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Waiting on {pendingRollerName} to roll for the enemy.</p>
      </section>
    );
  }

  if (opposedBattleActive && !isActiveSeat) {
    return (
      <PhoneBattleView
        patch={patch}
        self={self}
        onIntent={onIntent}
        submissionPending={requiredActionSubmissionPending}
      />
    );
  }

  if (!isActiveSeat) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <CurrentPromptCard
          prompt={currentPromptFromSharedPrompt(sharedPrompt)}
        />
        <UsefulNowPanel model={usefulNow} />
        {resolutionPanel}
        {battleAssistPanel}
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Waiting for another seat. You will be able to move when it's your turn.</p>
      </section>
    );
  }

  if (self.character.status === "recalled") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <CurrentPromptCard
          prompt={{
            label: "Replacement",
            title: "Recruit operative",
            detail: "Your operative has been recalled. Choose a replacement before your command channel can continue.",
            tone: "action"
          }}
        />
        {resolutionPanel}
        {battleAssistPanel}
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Your operative has been recalled. Recruit a replacement to continue.</p>
        <ActionSections
          sections={[
            {
              key: "recruit",
              title: "Recruit",
              defaultOpen: true,
              actions: characters.map((character) => ({
                key: character.id,
                label: `Recruit ${character.name}`,
                detail: character.archetype,
                tone: "primary" as const,
                onClick: () =>
                  onIntent({
                    type: "RECRUIT_REPLACEMENT",
                    seatId: self.seatId,
                    replacementCharacterId: character.id
                  })
              }))
            }
          ]}
        />
      </section>
    );
  }

  if (patch.brokenConcordanceNode && !patch.brokenConcordanceNode.stabilized && patch.phase === "action") {
    const node = patch.brokenConcordanceNode;
    return (
      <section className="phone-assistance-shell" aria-label="Concordance node">
        <header className="phone-assistance-header">
          <p className="phone-panel-kicker">The Broken Concordance</p>
          <h2>{node.name}</h2>
          <p>{statLabelById[node.stat]} {node.difficulty} · at least one helper required</p>
        </header>
        <p className="phone-sheet-action-copy">
          {node.stabilized
            ? "This severed voice is stable. Its preparation progress is recorded."
            : "Join your signal with another operative to restore this relay node."}
        </p>
        {!node.stabilized ? (
          <div className="phone-assistance-actions is-primary-only">
            <GameButton
              type="button"
              tone="action"
              disabled={!node.available}
              onClick={() => onIntent({ type: "BROKEN_CONCORDANCE_NODE_REQUESTED", seatId: self.seatId, nodeId: node.id })}
            >
              Prepare {node.name}
            </GameButton>
          </div>
        ) : null}
      </section>
    );
  }

  const moveActions: ActionButtonDefinition[] = [];
  const threatActions: ActionButtonDefinition[] = [];
  const resolveActions: ActionButtonDefinition[] = [];
  const gearActions: ActionButtonDefinition[] = [];
  const objectActions: ActionButtonDefinition[] = [];
  const eligibleTestItemCount = patch.objectUseStates?.filter((state) => state.source === "gear" && state.usableForCurrentTest === true).length ?? 0;
  const followerActions: ActionButtonDefinition[] = [];
  const tableActions: ActionButtonDefinition[] = [];
  const contractActions: ActionButtonDefinition[] = [];
  const advanceActions: ActionButtonDefinition[] = [];

  if (patch.pendingGearEquipChoice) {
    const choice = patch.pendingGearEquipChoice;
    resolveActions.push(
      {
        key: `equip-discovered-${choice.choiceId}`,
        label: `Equip ${choice.itemName}`,
        detail: `Replace ${choice.currentItemName} in the ${toTitleCase(choice.slot)} slot. The current item stays carried.`,
        tone: "primary",
        onClick: () => onIntent({
          type: "RESOLVE_GEAR_EQUIP_CHOICE",
          seatId: self.seatId,
          choiceId: choice.choiceId,
          itemInstanceId: choice.itemInstanceId,
          decision: "equip"
        })
      },
      {
        key: `carry-discovered-${choice.choiceId}`,
        label: "Keep carried",
        detail: `${choice.itemName} remains in Inventory. ${choice.currentItemName} stays equipped.`,
        tone: "secondary",
        onClick: () => onIntent({
          type: "RESOLVE_GEAR_EQUIP_CHOICE",
          seatId: self.seatId,
          choiceId: choice.choiceId,
          itemInstanceId: choice.itemInstanceId,
          decision: "keepCarried"
        })
      }
    );
  }

  if (patch.pendingEquipmentSuppressionChoice) {
    const choice = patch.pendingEquipmentSuppressionChoice;
    for (const option of choice.options) {
      resolveActions.push({
        key: `equipment-suppression-${choice.choiceId}-${option.instanceId}`,
        label: option.name,
        detail: `${choice.sourceTitle}: suppress this equipped ${toTitleCase(option.slot)}.`,
        tone: "primary",
        onClick: () => onIntent({
          type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET",
          seatId: self.seatId,
          choiceId: choice.choiceId,
          itemInstanceId: option.instanceId
        })
      });
    }
  }

  if (patch.pendingEncounterDecisionPrivate) {
    const decision = patch.pendingEncounterDecisionPrivate;
    for (const option of decision.options) {
      resolveActions.push({
        key: `encounter-payment-${decision.decisionId}-${option.optionId}`,
        label: option.label,
        detail: option.disabledReason ?? `${decision.prompt} Current Salvage: ${decision.currentSalvage}.`,
        tone: "primary",
        disabled: !option.enabled,
        onClick: () => onIntent({
          type: "ENCOUNTER_DECISION_REQUESTED",
          seatId: self.seatId,
          decisionId: decision.decisionId,
          decisionVersion: decision.decisionVersion,
          optionId: option.optionId
        })
      });
    }
  }

  if (patch.pendingMemoryTaxChoicePrivate) {
    const choice = patch.pendingMemoryTaxChoicePrivate;
    const selectedOptionId = memoryTaxSelection?.choiceId === choice.choiceId
      ? memoryTaxSelection.optionId
      : null;
    for (const option of choice.options) {
      const selected = selectedOptionId === option.optionId;
      resolveActions.push({
        key: `memory-tax-${choice.choiceId}-${option.optionId}`,
        label: `${selected ? "Selected: " : ""}${option.label}`,
        detail: option.detail,
        tone: selected ? "primary" : "secondary",
        onClick: () => setMemoryTaxSelection({ choiceId: choice.choiceId, optionId: option.optionId })
      });
    }
    resolveActions.push({
      key: `memory-tax-confirm-${choice.choiceId}`,
      label: "Confirm memory tax",
      detail: selectedOptionId ? "Confirm the selected consequence." : "Choose one consequence first.",
      tone: "primary",
      disabled: selectedOptionId === null,
      onClick: () => {
        if (!selectedOptionId) return;
        onIntent({
          type: "MEMORY_TAX_CHOICE_REQUESTED",
          seatId: self.seatId,
          choiceId: choice.choiceId,
          choiceVersion: choice.choiceVersion,
          optionId: selectedOptionId
        });
        setMemoryTaxSelection(null);
      }
    });
  }

  if (patch.pendingForcedDestinationChoicePrivate) {
    const choice = patch.pendingForcedDestinationChoicePrivate;
    for (const candidate of choice.candidates) {
      const directionLabel = candidate.direction === "clockwise" ? "Clockwise" : "Counterclockwise";
      resolveActions.push({
        key: `false-route-${choice.choiceId}-${candidate.sectorId}`,
        label: `${directionLabel}: ${candidate.sectorName}`,
        detail: `Choose the false route. Confirm forced displacement 1 sector ${candidate.direction} on the ${candidate.ring} ring.`,
        tone: "primary",
        onClick: () => onIntent({
          type: "FORCED_DESTINATION_SELECTED",
          seatId: self.seatId,
          choiceId: choice.choiceId,
          destinationSectorId: candidate.sectorId
        })
      });
    }
  }

  if (patch.pendingDisplacementPrivate) {
    const displacement = patch.pendingDisplacementPrivate;
    const spike = displacement.riftAnchorSpike;
    if (spike) {
      resolveActions.push({
        key: `rift-anchor-spike-${displacement.reactionId}-${spike.instanceId}`,
        label: "Refuse displacement — 1 charge",
        detail: spike.disabledReason ?? `Spend 1 charge to remain in ${displacement.originSectorName}. ${displacement.sourceTitle} would move you to ${displacement.destinationSectorName}.`,
        tone: "secondary",
        disabled: !spike.enabled,
        onClick: () => onIntent({
          type: "USE_GEAR",
          seatId: self.seatId,
          gearId: "rift-anchor-spike",
          instanceId: spike.instanceId,
          forcedDisplacementReactionId: displacement.reactionId,
          forcedDisplacementSourceEventId: displacement.sourceEventId
        })
      });
    }
    resolveActions.push({
      key: `forced-displacement-${displacement.reactionId}`,
      label: "Accept displacement",
      detail: `${displacement.sourceTitle}: ${displacement.originSectorName} → ${displacement.destinationSectorName}. The failed test still counts.`,
      tone: "primary",
      onClick: () => onIntent({
        type: "FORCED_DISPLACEMENT_ACCEPTED",
        seatId: self.seatId,
        reactionId: displacement.reactionId
      })
    });
  }

  if (patch.pendingAfflictionChoicePrivate) {
    const choice = patch.pendingAfflictionChoicePrivate;
    for (const stat of choice.options) {
      resolveActions.push({
        key: `affliction-stat-${choice.resolutionId}-${stat}`,
        label: `Gain +1 ${toTitleCase(stat)}`,
        detail: choice.prompt,
        tone: "primary",
        onClick: () => onIntent({
          type: "AFFLICTION_STAT_CHOSEN",
          seatId: self.seatId,
          resolutionId: choice.resolutionId,
          stat
        })
      });
    }
  }

  if (patch.pendingAfflictionReactionPrivate) {
    const reaction = patch.pendingAfflictionReactionPrivate;
    if (reaction.kind === "arrivalWound") {
      resolveActions.push({
        key: `affliction-reaction-use-${reaction.reactionId}`,
        label: "Use Bile Spit",
        detail: `${reaction.targetName ?? "The arriving operative"} suffers 1 wound.`,
        tone: "primary",
        onClick: () => onIntent({
          type: "AFFLICTION_REACTION_RESOLVED",
          seatId: self.seatId,
          reactionId: reaction.reactionId,
          use: true
        })
      });
    } else {
      reaction.originalRoll.forEach((face, dieIndex) => {
        if ((reaction.lockedDieIndices ?? []).includes(dieIndex)) return;
        resolveActions.push({
          key: `affliction-reroll-${reaction.reactionId}-${dieIndex}`,
          label: `Reroll die ${dieIndex + 1} (${face})`,
          detail: reaction.afflictionId === "blood-fury"
            ? "A matching result causes 1 wound."
            : "A matching result draws 1 Affliction.",
          tone: "primary",
          onClick: () => onIntent({
            type: "AFFLICTION_REACTION_RESOLVED",
            seatId: self.seatId,
            reactionId: reaction.reactionId,
            use: true,
            dieIndex
          })
        });
      });
    }
    resolveActions.push({
      key: `affliction-reaction-decline-${reaction.reactionId}`,
      label: reaction.kind === "arrivalWound" ? "Do not spit" : "Keep current result",
      detail: "Decline this reaction and continue with the authoritative result.",
      tone: "secondary",
      onClick: () => onIntent({
        type: "AFFLICTION_REACTION_RESOLVED",
        seatId: self.seatId,
        reactionId: reaction.reactionId,
        use: false
      })
    });
  }

  if (patch.pendingScarRemovalChoice) {
    const choice = patch.pendingScarRemovalChoice;
    for (const scar of choice.cards) {
      resolveActions.push({
        key: `purge-scar-${choice.choiceId}-${scar.id}`,
        label: `Purge ${scar.title} — 4 Salvage`,
        detail: `Remove this Scar permanently for the current operative. ${scar.burdenText ?? scar.penalty}`,
        tone: "primary",
        disabled: (self.character.salvage ?? 0) < choice.salvageCost,
        onClick: () => onIntent({ type: "PURGE_SCAR_REQUESTED", seatId: self.seatId, choiceId: choice.choiceId, scarId: scar.id })
      });
    }
  }

  for (const control of patch.scarAdaptationControls ?? []) {
    const targets = control.targets.length > 0 ? control.targets : [{ id: "", label: "Activate" }];
    for (const target of targets) {
      const isDie = target.id !== "" && /^\d+$/.test(target.id) && control.ruleKey.includes("reroll");
      resolveActions.push({
        key: `scar-adaptation-${control.activationId}-${target.id || "activate"}`,
        label: target.id ? `${control.scarName} — ${target.label}` : `Use ${control.scarName}`,
        detail: control.disabledReason ?? `${control.effectText} ${control.remainingUses} use remaining.`,
        tone: "secondary",
        disabled: !control.enabled,
        onClick: () => onIntent({
          type: "USE_SCAR_ADAPTATION",
          seatId: self.seatId,
          activationId: control.activationId,
          scarId: control.scarId,
          ruleKey: control.ruleKey,
          ...(target.id && !isDie ? { targetId: target.id } : {}),
          ...(isDie ? { rollIndex: Number(target.id) } : {})
        })
      });
    }
  }

  if (patch.pendingScarConsequence) {
    const prayer = self.character.heldGear.find((item) => item.id === "heat-sink-prayer");
    const prayerEquipped = prayer ? Object.values(self.character.equippedGear).includes(prayer.id) : false;
    const prayerCharges = prayer?.currentCharges ?? prayer?.charges ?? 0;
    const prayerDisabledReason = !prayer
      ? "Scar-Sink Prayer is not owned."
      : !prayerEquipped
        ? "Scar-Sink Prayer must be equipped."
        : prayerCharges < 1
          ? "Scar-Sink Prayer is Depleted."
          : undefined;
    for (const effect of patch.pendingScarConsequence.pendingEffects) {
      resolveActions.push({
        key: `scar-sink-prayer-${patch.pendingScarConsequence.reactionId}-${effect.effectId}`,
        label: "Ignore this effect — 1 charge",
        detail: prayerDisabledReason ?? `${effect.summary} Spend 1 charge to ignore one pending Scar effect.`,
        tone: "secondary",
        disabled: Boolean(prayerDisabledReason),
        onClick: () => onIntent({
          type: "USE_GEAR",
          seatId: self.seatId,
          gearId: "heat-sink-prayer",
          instanceId: prayer?.instanceId,
          scarConsequenceReactionId: patch.pendingScarConsequence!.reactionId,
          scarInstanceId: patch.pendingScarConsequence!.scarInstanceId,
          pendingScarEffectId: effect.effectId
        })
      });
    }
    resolveActions.push({
      key: `scar-consequence-${patch.pendingScarConsequence.reactionId}`,
      label: "Accept consequence",
      detail: patch.pendingScarConsequence.pendingEffects.map((entry) => entry.summary).join(" "),
      tone: "primary",
      onClick: () => onIntent({
        type: "CONTINUE_SCAR_CONSEQUENCE",
        seatId: self.seatId,
        reactionId: patch.pendingScarConsequence!.reactionId
      })
    });
  }

  if (patch.soloReroll?.available) {
    resolveActions.push({
      key: "solo-emergency-reroll",
      label: "Reroll — spend 1 charge",
      detail: `Optional. Replaces the current roll. ${patch.soloReroll.charges} charge${patch.soloReroll.charges === 1 ? "" : "s"} remaining this round.`,
      tone: "primary",
      onClick: () =>
        onIntent({
          type: "SOLO_REROLL_REQUESTED",
          seatId: self.seatId
        })
    });
  }

  if (patch.phase === "navigation" && !movementPlanner?.active) {
    moveActions.push({
      key: "movement-roll",
      label: "Roll Movement",
      detail: "Reveal legal destinations",
      tone: "primary",
      onClick: () =>
        onIntent({
          type: "MOVEMENT_ROLL_REQUESTED",
          seatId: self.seatId
        })
    });
  }

  const pendingCenserChallenge = patch.pendingTileChallengePrivate;
  if (patch.phase === "resolution" && pendingCenserChallenge?.challengeType === "anomaly" && pendingCenserChallenge.rolled && pendingCenserChallenge.pendingFailureEffects?.length) {
    const censer = self.character.heldGear.find((item) => item.id === "choir-static-censer");
    const equipped = censer ? Object.values(self.character.equippedGear).includes(censer.id) : false;
    const charges = censer?.currentCharges ?? censer?.charges ?? 0;
    const disabledReason = !censer
      ? "Choir Static Censer is not owned."
      : !equipped
        ? "Choir Static Censer must be equipped."
        : charges < 1
          ? "Choir Static Censer is Depleted."
          : undefined;
    for (const choice of pendingCenserChallenge.pendingFailureEffects) {
      threatActions.push({
        key: `static-intercession-${choice.effectId}`,
        label: "Ignore this effect — 1 charge",
        detail: disabledReason ?? `${choice.summary} Static Intercession leaves the test failed. ${charges}/${censer?.maxCharges ?? 2} charges.`,
        tone: "secondary",
        disabled: Boolean(disabledReason),
        onClick: () => onIntent({
          type: "USE_GEAR",
          seatId: self.seatId,
          gearId: "choir-static-censer",
          instanceId: censer?.instanceId,
          pendingTileChallengeId: pendingCenserChallenge.id,
          staticIntercessionReactionId: pendingCenserChallenge.staticIntercessionReactionId,
          pendingTileChallengeEffectId: choice.effectId
        })
      });
    }
    threatActions.push({
      key: "static-intercession-decline",
      label: "Accept all failure effects",
      detail: "Continue without spending a charge.",
      tone: "secondary",
      onClick: () => onIntent({ type: "CONTINUE_RESOLUTION", seatId: self.seatId })
    });
  }

  const encounterResolutionCanAdvance =
    !activeResolution ||
    activeResolution.stage === "card_reveal" ||
    activeResolution.stage === "battle_setup";

  if (patch.phase === "action" && patch.encounter?.cardType === "hazard" && encounterResolutionCanAdvance) {
    const pendingTileChallenge = patch.pendingTileChallengePrivate;
    const choirLantern = self.character.heldGear.find((item) => item.id === "choir-lantern");
    if (pendingTileChallenge?.challengeType === "anomaly" && pendingTileChallenge.testStat === "signal" && !pendingTileChallenge.rolled) {
      const equipped = choirLantern ? Object.values(self.character.equippedGear).includes(choirLantern.id) : false;
      const charges = choirLantern?.currentCharges ?? choirLantern?.charges ?? 0;
      const disabledReason = !choirLantern
        ? "Choir Lantern is not owned."
        : !equipped
          ? "Choir Lantern must be equipped."
          : charges < 1
            ? "Choir Lantern is Depleted."
            : undefined;
      threatActions.push({
        key: "choir-light",
        label: "Use Choir Lantern",
        detail: disabledReason ?? `Spend 1 charge for +2 Signal on this anomaly test. ${charges}/${choirLantern?.maxCharges ?? 2} charges.`,
        tone: "secondary",
        stat: "signal",
        disabled: Boolean(disabledReason),
        onClick: () => onIntent({
          type: "USE_GEAR",
          seatId: self.seatId,
          gearId: "choir-lantern",
          instanceId: choirLantern?.instanceId,
          pendingTileChallengeId: pendingTileChallenge.id
        })
      });
    }
    const checkIsStaged =
      activeResolution?.stage === "battle_setup" &&
      activeResolution.playerId === self.seatId;

    if (checkIsStaged && patch.edgeHand) {
      for (const card of patch.edgeHand.cards) {
        const disabled = !patch.edgeHand.canCommit || !patch.edgeHand.resolutionId;
        threatActions.push({
          key: `edge-card-${card.id}`,
          label: `Commit ${card.name} — lock ${card.edgeValue}`,
          detail: disabled
            ? patch.edgeHand.disabledReason ?? "Edge Card unavailable."
            : `${card.commitText} The card burns and reveals on the TV.`,
          tone: "secondary",
          disabled,
          disabledReason: disabled ? patch.edgeHand.disabledReason ?? undefined : undefined,
          onClick: () => {
            if (!patch.edgeHand?.resolutionId) return;
            onIntent({
              type: "PLAY_EDGE_CARD",
              seatId: self.seatId,
              cardId: card.id,
              resolutionId: patch.edgeHand.resolutionId,
              mode: "commit-value"
            });
          }
        });
        if (card.ability.enabled && card.ability.resolutionId) {
          const targets = card.ability.targets.length > 0
            ? card.ability.targets
            : [{ id: "", label: card.ability.label }];
          for (const target of targets) {
            threatActions.push({
              key: `edge-ability-${card.id}-${target.id || "activate"}`,
              label: `${card.name} — ${target.label}`,
              detail: `${card.abilityText}${card.tradeoffText ? ` ${card.tradeoffText}` : ""}`,
              tone: "secondary",
              onClick: () => onIntent({
                type: "PLAY_EDGE_CARD",
                seatId: self.seatId,
                cardId: card.id,
                resolutionId: card.ability.resolutionId!,
                mode: "ability",
                ...(target.id ? { targetId: target.id } : {})
              })
            });
          }
        }
      }
    }

    const encounterCommand: ClientIntent = !checkIsStaged && activeResolution?.stage === "card_reveal"
      ? { type: "START_TILE_ENCOUNTER", seatId: self.seatId, encounterId: patch.encounter.id, resolutionId: activeResolution.id }
      : { type: "CHECK_REQUESTED", seatId: self.seatId, stat: patch.encounter.stat };
    const startBlockedReason = encounterCommand.type === "START_TILE_ENCOUNTER" && activeResolution?.playerId !== self.seatId
      ? "This encounter belongs to another operative."
      : undefined;
    threatActions.push({
      key: encounterCommand.type === "START_TILE_ENCOUNTER" ? "start-tile-encounter" : "hazard-check",
      label: encounterCommand.type === "START_TILE_ENCOUNTER"
        ? pendingTileChallenge ? "Attempt Challenge" : patch.encounter.presentationType === "event" ? "Reveal Event" : "Face the Hazard"
        : checkIsStaged ? "Roll check dice" : `Attempt ${statLabelById[patch.encounter.stat]} check`,
      detail: pendingTileChallenge
        ? `Recurring ${pendingTileChallenge.challengeType} challenge ${pendingTileChallenge.authoredOrder + 1} of ${pendingTileChallenge.totalChallenges}. Remains on this sector.`
        : patch.encounter.title,
      tone: "primary",
      stat: patch.encounter.stat,
      disabled: Boolean(startBlockedReason),
      disabledReason: startBlockedReason,
      command: encounterCommand,
      onClick: () => onIntent(encounterCommand)
    });
  }

  if (patch.edgeHand?.reaction) {
    for (const card of patch.edgeHand.cards) {
      if (!card.ability.enabled || !card.ability.resolutionId) continue;
      const targets = card.ability.targets.length > 0
        ? card.ability.targets
        : [{ id: "", label: card.ability.label }];
      for (const target of targets) {
        resolveActions.push({
          key: `edge-ability-${card.id}-${target.id || "activate"}`,
          label: `${card.name} — ${target.label}`,
          detail: `${card.abilityText}${card.tradeoffText ? ` ${card.tradeoffText}` : ""}`,
          tone: "secondary",
          onClick: () => onIntent({
            type: "PLAY_EDGE_CARD",
            seatId: self.seatId,
            cardId: card.id,
            resolutionId: card.ability.resolutionId!,
            mode: "ability",
            ...(target.id ? { targetId: target.id } : {})
          })
        });
      }
    }
    resolveActions.push({
      key: "edge-reaction-decline",
      label: "Continue without Edge",
      detail: patch.edgeHand.reaction.prompt,
      tone: "secondary",
      onClick: () => onIntent({
        type: "DECLINE_EDGE_CARD_REACTION",
        seatId: self.seatId,
        reactionId: patch.edgeHand!.reaction!.id
      })
    });
  }

  if (
    activeResolution?.stage === "roll_result" &&
    activeResolution.roll?.success === false &&
    patch.requiredAction?.kind === "consequence" &&
    !pendingOwnerResolutionChoice
  ) {
    resolveActions.push({
      key: "accept-failed-result",
      label: "Accept consequence",
      detail: "Apply the authoritative failure effect, then review the final result.",
      tone: "secondary",
      onClick: continueResolution
    });
  }

  if (patch.phase === "action" && patch.encounter?.cardType === "enemy" && encounterResolutionCanAdvance) {
    const combatIsStaged =
      activeResolution?.stage === "battle_setup" &&
      activeResolution.playerId === self.seatId;

    const encounterCommand: ClientIntent = !combatIsStaged && activeResolution?.stage === "card_reveal"
      ? { type: "START_TILE_ENCOUNTER", seatId: self.seatId, encounterId: patch.encounter.id, resolutionId: activeResolution.id }
      : { type: "COMBAT_REQUESTED", seatId: self.seatId, stat: patch.encounter.stat };
    const startBlockedReason = encounterCommand.type === "START_TILE_ENCOUNTER" && activeResolution?.playerId !== self.seatId
      ? "This encounter belongs to another operative."
      : undefined;
    threatActions.push({
      key: encounterCommand.type === "START_TILE_ENCOUNTER" ? "start-tile-encounter" : "enemy-combat",
      label: encounterCommand.type === "START_TILE_ENCOUNTER" ? "Begin Encounter" : combatIsStaged ? "Roll combat dice" : "Enter combat",
      detail: patch.encounter.enemyName ?? patch.encounter.title,
      tone: "primary",
      stat: patch.encounter.stat,
      disabled: Boolean(startBlockedReason),
      disabledReason: startBlockedReason,
      command: encounterCommand,
      onClick: () => onIntent(encounterCommand)
    });
  }

  if (
    patch.phase === "navigation" &&
    patch.innerApproach &&
    !patch.innerApproach.challengeCleared &&
    boardSpace?.tier === "inner"
  ) {
    if (boardSpace.textBox.choices && boardSpace.textBox.choices.length > 0) {
      boardSpace.textBox.choices.forEach((choice) => {
        resolveActions.push({
          key: `resolve-inner-approach-${choice.id}`,
          label: choice.label,
          detail: `${boardSpace.textBox.title}: advancement remains locked until success`,
          tone: "primary",
          onClick: () =>
            onIntent({
              type: "RESOLVE_SPACE_TEXT",
              seatId: self.seatId,
              choiceId: choice.id
            })
        });
      });
    } else {
      resolveActions.push({
        key: "resolve-inner-approach",
        label: `Attempt ${boardSpace.textBox.title}`,
        detail: "Success clears this approach step permanently for your operative.",
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "RESOLVE_SPACE_TEXT",
            seatId: self.seatId
          })
      });
    }
  }

  if (patch.phase === "action") {
    const canResolveSpaceText =
      !patch.encounter &&
      !!boardSpace &&
      (boardSpace.tier === "inner"
        ? !patch.innerApproach?.challengeCleared
        : boardSpace.tier === "center" || (sector?.encounterDecks.threat.length ?? 0) === 0);

    if (canResolveSpaceText && !isScenarioConfrontation) {
      if (boardSpace?.textBox.choices && boardSpace.textBox.choices.length > 0) {
        boardSpace.textBox.choices.forEach((choice) => {
          resolveActions.push({
            key: `resolve-space-text-${choice.id}`,
            label: choice.label,
            detail: boardSpace.textBox.title,
            tone: "secondary",
            onClick: () =>
              onIntent({
                type: "RESOLVE_SPACE_TEXT",
                seatId: self.seatId,
                choiceId: choice.id
              })
          });
        });
      } else {
        resolveActions.push({
          key: "resolve-space-text",
          label: boardSpace?.textBox.title ? `Resolve ${boardSpace.textBox.title}` : "Resolve sector text",
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "RESOLVE_SPACE_TEXT",
              seatId: self.seatId
            })
        });
      }
    }

    if (!patch.encounter && patch.escalationLevel > 0) {
      resolveActions.push({
        key: "stabilize",
        label: "Stabilize breach",
        detail: `Global Escalation ${patch.escalationLevel}/${patch.escalationThreshold}`,
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "STABILIZE_REQUESTED",
            seatId: self.seatId
          })
      });
    }

    self.character.heldGear.forEach((item) => {
      const useState = patch.objectUseStates?.find((state) => state.source === "gear" && state.id === item.id && (!item.instanceId || state.instanceId === item.instanceId)) ?? null;
      const useDisabledReason =
        useState?.disabledReason ?? (item.useLimit === "charge" && (item.charges ?? 0) <= 0 ? `${item.name} has no charges remaining.` : null);
      const canUseNow = useState?.relevanceKind === "usable" && !useDisabledReason;
      const equippedInstanceIds = new Set(Object.values(self.character.equippedGearInstances ?? {}).filter((value): value is string => Boolean(value)));
      const isEquipped = item.instanceId ? equippedInstanceIds.has(item.instanceId) : equippedIds.has(item.id);
      if (isEquipped) {
        if (canUseNow) {
          objectActions.push({
            key: `use-${item.instanceId ?? item.id}`,
            label: `Use ${item.name}`,
            detail: useDisabledReason ?? getGearActionDetail(item, useState),
            tone: item.useLimit === "discard" ? "primary" : "secondary",
            stat: item.statBonus.stat,
            disabled: Boolean(useDisabledReason),
            onClick: () =>
              onIntent({
                type: "USE_GEAR",
                seatId: self.seatId,
                gearId: item.id,
                instanceId: item.instanceId
              })
          });
        }

        return;
      }

      gearActions.push({
        key: `equip-${item.instanceId ?? item.id}`,
        label: `Equip ${item.name}`,
        detail: `${toTitleCase(item.slot)}: +${item.statBonus.amount} ${statLabelById[item.statBonus.stat]}`,
        tone: "secondary",
        stat: item.statBonus.stat,
        onClick: () =>
          onIntent({
            type: "EQUIP_GEAR",
            seatId: self.seatId,
            gearId: item.id,
            instanceId: item.instanceId,
            slot: item.slot
          })
      });

      if (canUseNow) {
        objectActions.push({
          key: `use-${item.instanceId ?? item.id}`,
          label: `Use ${item.name}`,
          detail: useDisabledReason ?? getGearActionDetail(item, useState),
          tone: item.useLimit === "discard" ? "primary" : "secondary",
          stat: item.statBonus.stat,
          disabled: Boolean(useDisabledReason),
          onClick: () =>
            onIntent({
              type: "USE_GEAR",
              seatId: self.seatId,
              gearId: item.id,
              instanceId: item.instanceId
            })
        });
      }
    });

    (Object.entries(self.character.equippedGear) as Array<[keyof typeof self.character.equippedGear, string | null]>).forEach(
      ([slot, gearId]) => {
        if (!gearId) {
          return;
        }

        gearActions.push({
          key: `unequip-${slot}`,
          label: `Unequip ${toTitleCase(slot)}`,
          detail: gearId,
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "UNEQUIP_GEAR",
              seatId: self.seatId,
              slot
            })
        });
      }
    );

    (self.character.followers ?? []).forEach((follower) => {
      if (!follower.useLimit) {
        return;
      }

      const useState = getObjectUseState(patch, "follower", follower.id);
      const useDisabledReason = useState?.disabledReason ?? null;
      followerActions.push({
        key: `use-follower-${follower.id}`,
        label: `Use ${follower.name}`,
        detail: useDisabledReason ?? `${toTitleCase(follower.role)}${follower.useLimit ? ` | ${toTitleCase(follower.useLimit)}` : ""}`,
        tone: follower.useLimit === "discard" ? "primary" : "secondary",
        disabled: Boolean(useDisabledReason),
        onClick: () =>
          onIntent({
            type: "USE_FOLLOWER",
            seatId: self.seatId,
            followerId: follower.id
          })
      });
    });

    if (patch.sessionMode !== "single-player") {
      const tableTargets = patch.seats.filter((seat) => seat.seatId !== self.seatId && seat.displayName && !seat.kicked);
      const baseInteractions = patch.interactionMode === "co-op" ? ["trade", "aid"] : ["trade", "aid", "duel", "interfere"];

      tableTargets.forEach((seat) => {
        baseInteractions.forEach((interactionKind) => {
          tableActions.push({
            key: `${interactionKind}-${seat.seatId}`,
            label: `${toTitleCase(interactionKind)} ${seat.displayName}`,
            detail:
              interactionKind === "interfere" && patch.interactionMode !== "ruthless"
                ? "Bounded rivalry"
                : toTitleCase(patch.interactionMode ?? "rivalry"),
            tone: interactionKind === "aid" || interactionKind === "trade" ? "secondary" : "primary",
            onClick: () =>
              onIntent({
                type: "TABLE_INTERACTION",
                seatId: self.seatId,
                targetSeatId: seat.seatId,
                interactionKind: interactionKind as "trade" | "aid" | "duel" | "interfere"
              })
          });
        });
      });
    }

    if (!self.character.activeContract) {
      patch.availableContracts.forEach((contract) => {
        contractActions.push({
          key: `contract-${contract.id}`,
          label: `Accept ${contract.name}`,
          detail: describeContractObjective(contract),
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "ACCEPT_CONTRACT",
              seatId: self.seatId,
              contractId: contract.id
            })
        });
      });
    }

    if (self.character.activeContract && activeContract && isContractObjectiveComplete(activeContract, self.character.activeContract.progress)) {
      contractActions.push({
        key: `complete-${activeContract.id}`,
        label: `Complete ${activeContract.name}`,
        detail: formatContractObjectiveStatus(activeContract, self.character.activeContract.progress),
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "COMPLETE_CONTRACT",
            seatId: self.seatId,
            contractId: activeContract.id
          })
      });
    }

    if (isScenarioConfrontation && patch.activeScenario && !patch.encounter) {
      if (self.character.id === "cinder-monk") {
        const vowNotes = self.noteResources?.vow ?? 0;
        const cinderOathDisabledReason = vowNotes < 1 ? `Requires 1 Vow Note (${vowNotes} available).` : null;

        advanceActions.push({
          key: "cinder-oath",
          label: "Prepare Cinder Oath",
          detail: cinderOathDisabledReason ?? `Spend 1 Vow Note (${vowNotes} available) for +2 to each confrontation test`,
          tone: "secondary",
          disabled: Boolean(cinderOathDisabledReason),
          onClick: () =>
            onIntent({
              type: "USE_CHARACTER_ABILITY",
              seatId: self.seatId,
              abilityId: "cinder-oath"
            })
        });
      }

      advanceActions.push({
        key: "resolve-scenario",
        label: `Resolve ${patch.activeScenario.confrontationTitle}`,
        detail: patch.nemesis?.name,
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "SCENARIO_CONFRONTATION_REQUESTED",
            seatId: self.seatId
          })
      });
    } else if (!patch.encounter) {
      advanceActions.push({
        key: "end-turn",
        label: "End turn",
        detail: "Pass control to the table",
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "PHASE_ADVANCED",
            seatId: self.seatId,
            toPhase: "resolution"
          })
      });
    }
  }

  if (patch.phase === "broadcast") {
    advanceActions.push({
      key: "end-turn",
      label: "End turn",
      detail: "Pass to the next operative",
      tone: "primary",
      onClick: () =>
        onIntent({
          type: "PHASE_ADVANCED",
          seatId: self.seatId,
          toPhase: "start"
        })
    });
  }

  if (opposedBattleActive) {
    const requiredChoiceActions: PhoneBattleChoiceAction[] = pendingOwnerResolutionChoice ? resolveActions : [];
    const optionalBattleActions: PhoneBattleChoiceAction[] = pendingOwnerResolutionChoice
      ? []
      : resolveActions.filter((action) => action.key === "solo-emergency-reroll" || action.key.startsWith("scar-adaptation-"));

    return (
      <PhoneBattleView
        patch={patch}
        self={self}
        onIntent={onIntent}
        choiceActions={requiredChoiceActions}
        optionalActions={optionalBattleActions}
        submissionPending={requiredActionSubmissionPending}
      />
    );
  }

  const copy =
    patch.phase === "navigation"
      ? movementPlanner?.active
        ? "Inspect public route intel before confirming movement."
        : "Roll movement to reveal your legal destinations."
      : patch.phase === "action" && isScenarioConfrontation
        ? "The Cinder Gate is open. Resolve the active scenario confrontation."
      : patch.phase === "action" && boardSpace
        ? `Resolve ${boardSpace.textBox.title}, then handle gear, contracts, or advancement.`
      : patch.phase === "action"
        ? "Resolve your current action, gear, or contract."
      : patch.phase === "broadcast"
        ? "Review the result, upgrade with trophies, or end your turn."
        : "Waiting for the server to resolve the current step.";
  const movementApproachResolution = activeResolution?.source === "movement" ? activeResolution : null;
  const movementApproachOutcome = orphanResolutionOutcome?.movedToSectorId ? orphanResolutionOutcome : null;
  const hasMoveContent =
    Boolean(movementPlanner?.active && movementPlanner.destinations.length > 0)
    || Boolean(movementApproachResolution)
    || Boolean(movementApproachOutcome)
    || moveActions.length > 0;
  const hasEncounterContent =
    Boolean(activeResolution && activeResolution.source !== "movement")
    || Boolean(orphanResolutionOutcome && !orphanResolutionOutcome.movedToSectorId)
    || Boolean(battleAssist)
    || threatActions.length > 0;
  const hasBattleContent = false;
  const hasShopContent = Boolean(shopEncounter);
  const shopLocked = Boolean(shopEncounter && (shopEncounter.status === "locked" || shopEncounter.blockingThreats.length > 0));
  const shopLockReasonText = shopEncounter?.blockedReasonText ?? formatShopDisabledReason(shopEncounter?.blockedReason);
  const hasActionContent =
    hasEncounterContent ||
    resolveActions.length +
      gearActions.length +
      objectActions.length +
      followerActions.length +
      tableActions.length +
      contractActions.length +
      advanceActions.length >
    0;
  const battleRequiresResolution = Boolean(
    patch.encounter
    || (activeResolution && activeResolution.source !== "movement")
    || (orphanResolutionOutcome && !orphanResolutionOutcome.movedToSectorId)
    || battleAssist
  );
  const battleBlocksNonBattleTabs = battleRequiresResolution;
  const moveBlockedReason = hasMoveContent
    ? undefined
    : movementPlanner?.active && movementPlanner.destinations.length === 0
      ? "Move locked: no legal destination."
      : patch.phase === "navigation"
        ? "Move locked: no legal destination."
        : "Move locked: resolve the current step first.";
  const battleBlockedReason = hasBattleContent
    ? undefined
    : patch.phase === "action"
      ? "Battle locked: no enemy here."
      : "Battle locked: resolve the current step first.";
  const shopBlockedReason = shopLocked
    ? `Shop locked: ${shopLockReasonText ?? "clear local blockers first."}`
    : hasShopContent
      ? undefined
      : battleBlocksNonBattleTabs
        ? "Shop locked: resolve the current encounter first."
        : "Shop locked: no shop here.";
  const actionBlockedReason = hasActionContent || !hasMoveContent
      ? undefined
      : "Action locked: no sector action here.";
  const tabDefinitions: TurnActionTabDefinition[] = [
    {
      id: "move",
      label: "Move",
      detail: movementPlanner?.active
        ? `${movementPlanner.destinations.length} route${movementPlanner.destinations.length === 1 ? "" : "s"}`
        : patch.phase === "navigation"
          ? "Roll"
          : "Standby",
      tone: "move",
      enabled: hasMoveContent,
      blockedReason: moveBlockedReason
    },
    {
      id: "battle",
      label: "Battle",
      detail: "No opposed enemy",
      tone: "battle",
      enabled: hasBattleContent,
      blockedReason: battleBlockedReason
    },
    {
      id: "shop",
      label: "Shop",
      detail: shopEncounter?.shopName ?? "No market",
      tone: "shop",
      enabled: hasShopContent,
      locked: shopLocked,
      blockedReason: shopBlockedReason
    },
    {
      id: "action",
      label: "Action",
      detail: activeResolution?.card?.title ?? boardSpace?.textBox.title ?? "Gear / quest",
      tone: "action",
      enabled: hasActionContent || hasBattleContent || !hasMoveContent,
      blockedReason: actionBlockedReason
    }
  ];
  const canShowSelectedTab = (tab: TurnActionTabDefinition) => {
    if (tab.id === "shop" && shopLocked && hasActionContent) return false;
    return !hasEncounterContent || tab.id === "action" || tab.enabled || tab.locked === true;
  };
  const fallbackTab = movementPlanner?.active || movementApproachResolution || movementApproachOutcome
    ? "move"
    : hasEncounterContent
      ? "action"
      : hasShopContent && !shopLocked
        ? "shop"
        : tabDefinitions.find((tab) => tab.id === "action" && (tab.enabled || tab.locked))?.id ??
          tabDefinitions.find((tab) => tab.enabled || tab.locked)?.id ??
          "action";
  const selectedTabDefinition = tabDefinitions.find((tab) => tab.id === selectedTurnTab && canShowSelectedTab(tab));
  const activeTurnTab: TurnActionTab = selectedTabDefinition?.id ?? fallbackTab;
  const ownerChoiceOverridesChallenge = Boolean(
    patch.pendingEncounterDecisionPrivate ||
    patch.pendingMemoryTaxChoicePrivate ||
    patch.pendingAfflictionChoicePrivate ||
    patch.pendingAfflictionReactionPrivate ||
    patch.pendingForcedDestinationChoicePrivate ||
    patch.pendingDisplacementPrivate ||
    patch.pendingScarChoice ||
    patch.pendingScarConsequence ||
    patch.pendingTileChallengePrivate?.pendingFailureEffects?.length
  );
  const trialPresentationActive =
    activeTurnTab === "action"
    && activeResolution?.source !== "movement"
    && !orphanResolutionOutcome
    && !ownerChoiceOverridesChallenge
    && !/no threat drawn/i.test(activeResolution?.outcome?.title ?? "")
    && isPhoneChallengeRelevantToSeat(patch, self.seatId);
  const currentPrompt: CurrentPromptViewModel = currentPromptFromSharedPrompt(sharedPrompt, activeTurnTab);
  const showCurrentPrompt = !activeResolution && (!currentPrompt.targetTab || currentPrompt.targetTab === activeTurnTab);
  const activeUsefulNow = usefulNowForTurnTab(usefulNow, activeTurnTab);
  const activeStatusCopy =
    activeTurnTab === "move"
      ? copy
      : activeTurnTab === "battle"
        ? hasBattleContent
          ? "Resolve the active enemy, event, or roll."
          : "No enemy or event is ready to resolve."
        : activeTurnTab === "shop"
          ? (shopBlockedReason ?? "Buy and sell only when a shop is available here.")
          : (actionBlockedReason ?? "Resolve this sector action only.");
  const visibleBattleDeltas = battleResultDeltas(currentDeltas);
  const visibleActionDeltas = actionResultDeltas(currentDeltas);
  const movementTravelPresentation = movementTravel ?? (
    movementOutcome
      ? {
          key: `${self.seatId}:movement:${movementOutcome.movedToSectorId}:${movementOutcome.summary}`,
          fromSectorName: previousSectorRef.current?.sectorName ?? "Previous sector",
          toSectorName: currentTile.name,
          durationMs: 0,
          reducedMotion: true
        }
      : null
  );
  const movementFlowActive = Boolean(
    activeTurnTab === "move" &&
    (patch.phase === "navigation" || movementPlanner?.active || movementTravelPresentation || movementOutcome)
  );
  const battleTitle = patch.encounter?.title ?? activeResolution?.card?.title ?? battleAssist?.enemyName ?? "No threat";
  const actionTitle = boardSpace?.textBox.title ?? "Operative options";
  const actionViewModelSources: PhoneActionViewModelSources = {
    resolve: [
      ...resolveActions,
      ...(patch.characterAbilityAction && !patch.characterAbilityAction.prepared ? [{
        key: `character-ability-${patch.characterAbilityAction.abilityId}`,
        label: patch.characterAbilityAction.name,
        detail: patch.characterAbilityAction.disabledReason ?? (patch.characterAbilityAction.stat
          ? `Add +1 ${statLabelById[patch.characterAbilityAction.stat]} before rolling ${patch.characterAbilityAction.sourceTitle ?? "this test"}.`
          : "Once-per-round operative ability."),
        tone: "secondary" as const,
        stat: patch.characterAbilityAction.stat ?? undefined,
        disabled: !patch.characterAbilityAction.available,
        disabledReason: patch.characterAbilityAction.disabledReason ?? undefined,
        onClick: () => onIntent({ type: "USE_CHARACTER_ABILITY", seatId: self.seatId, abilityId: patch.characterAbilityAction!.abilityId })
      }] : [])
    ],
    threat: threatActions,
    gear: gearActions,
    items: objectActions,
    followers: followerActions,
    contracts: contractActions,
    table: tableActions,
    advance: advanceActions,
    passive: [
      ...self.character.heldGear
        .filter((item) => equippedIds.has(item.id) && item.statBonus.amount !== 0)
        .map((item) => ({
          key: `passive-gear-${item.instanceId ?? item.id}`,
          label: item.name,
          detail: `Equipped · ${item.statBonus.amount > 0 ? "+" : ""}${item.statBonus.amount} ${statLabelById[item.statBonus.stat]}`,
          state: "already-applied" as const
        })),
      ...(patch.characterAbilityAction?.prepared ? [{
        key: `passive-character-ability-${patch.characterAbilityAction.abilityId}`,
        label: patch.characterAbilityAction.name,
        detail: `+1 ${patch.characterAbilityAction.stat ? statLabelById[patch.characterAbilityAction.stat] : "skill"} prepared for ${patch.characterAbilityAction.sourceTitle ?? "this test"}.`,
        state: "already-applied" as const
      }] : []),
      ...(patch.privateRivalry ? [{
        key: `private-rivalry-${patch.privateRivalry.objective?.id ?? patch.privateRivalry.revealState}`,
        label: "Private agenda",
        detail: patch.privateRivalry.objective
          ? `${patch.privateRivalry.objective.progress}/${patch.privateRivalry.objective.target} ${patch.privateRivalry.objective.progressLabel}. ${patch.privateRivalry.reveal.hint ?? patch.privateRivalry.reveal.lockedReason ?? "Owner-private objective."}`
          : patch.privateRivalry.reveal.hint ?? patch.privateRivalry.reveal.lockedReason ?? "Objective details remain sealed.",
        state: "passive" as const
      }] : [])
    ]
  };
  const actionViewModel = buildPhoneActionViewModel(patch, actionViewModelSources);
  const compactRequiredDecision = compactResolutionResult && actionViewModel.groups.required.length > 0;
  const activeTabContent =
    trialPresentationActive ? (
      <PhoneHazardChallengeView
        patch={patch}
        resolution={activeResolution}
        actions={[...resolveActions, ...threatActions]}
        onIntent={onIntent}
        canContinue={canContinueResolution}
        onContinue={continueResolution}
        resultDeltas={visibleActionDeltas}
        supplemental={(
          <>
            <CinderWattleAbilityPanel patch={patch} seatId={self.seatId} onIntent={onIntent} />
            <UsefulNowPanel model={activeUsefulNow} variant="secondary" />
          </>
        )}
      />
    ) : activeTurnTab === "move" ? (
      <PhoneMovePanel
        movementPlanner={movementPlanner}
        currentTile={currentTile}
        movementTravel={movementTravelPresentation}
        approachResolution={movementApproachResolution}
        approachOutcome={movementApproachOutcome}
        canContinueApproach={canContinueResolution || Boolean(movementApproachOutcome)}
        onContinueApproach={continueResolution}
        seatId={self.seatId}
        activeContract={activeContract}
        onIntent={onIntent}
        canRollMovement={patch.phase === "navigation" && !movementPlanner?.active && !patch.innerApproach}
        movementResolving={Boolean(!movementPlanner?.active && (movementTravelPresentation || (patch.phase !== "navigation" && (activeResolution || movementOutcome))))}
        showContextNavigation={movementFlowActive && showMovementContextNavigation}
        onContextNavigation={onMovementNavigation}
        actorName={patch.seats.find((seat) => seat.seatId === self.seatId)?.displayName ?? self.character.name}
        operativeName={self.character.name}
        operativeId={self.character.id}
        resultDeltas={currentDeltas}
        diceCount={self.character.id === "char_ker_von_ker" ? 2 : 1}
        hostView={patch.hostView}
        tierTransitions={patch.tierTransitions}
        innerApproach={patch.innerApproach}
        transitionRouteAid={patch.transitionRouteAid}
      />
    ) : activeTurnTab === "battle" ? (
      <PhoneBattlePanel
        title={battleTitle}
        activeResolution={activeResolution}
        encounter={patch.encounter}
        resolutionPanel={resolutionPanel}
        battleAssistPanel={battleAssistPanel}
        threatActions={threatActions}
        resolveActions={resolveActions}
        hasBattleContent={hasBattleContent}
        visibleBattleDeltas={visibleBattleDeltas}
        usefulNow={activeUsefulNow}
      />
    ) : activeTurnTab === "shop" ? (
      <PhoneShopCommandPanel
        shopEncounter={shopEncounter}
        resultDeltas={currentDeltas}
        scarCount={self.character.scars.length}
        seatId={self.seatId}
        onIntent={onIntent}
        usefulNow={activeUsefulNow}
        emptyTitle={battleBlocksNonBattleTabs ? "Shop locked" : "No shop here"}
        emptyText={
          battleBlocksNonBattleTabs
            ? "Shop locked: resolve the current encounter first. Ignore shop until it is cleared."
            : "Shop services appear when your operative is on a clear market, shrine, foundry, or service sector."
        }
      />
    ) : activeTurnTab === "action" ? (
      <>
        {activeResolution || orphanResolutionOutcome ? resolutionPanel : null}
        {compactRequiredDecision ? (
          <PhoneActionPriorityStack model={actionViewModel} onIntent={onIntent} requiredOnly />
        ) : !compactResolutionResult ? (
          <PhoneActionPriorityStack model={actionViewModel} onIntent={onIntent} />
        ) : null}
        {!compactResolutionResult ? <ResultDeltaRow deltas={visibleActionDeltas} className="phone-action-deltas phone-priority-stack__results" /> : null}
      </>
    ) : (
      <>
        <PhoneSectorActionPanel
          title={actionTitle}
          sectorOpportunityItems={sectorOpportunityItems}
          sectorExplorationCopy={sectorExplorationCopy}
          visibleActionDeltas={visibleActionDeltas}
          resolveActions={resolveActions}
          gearActions={gearActions}
          objectActions={objectActions}
          eligibleTestItemCount={eligibleTestItemCount}
          followerActions={followerActions}
          tableActions={tableActions}
          contractActions={contractActions}
          advanceActions={advanceActions}
          interactionMode={patch.interactionMode}
          usefulNow={activeUsefulNow}
        />
      </>
    );

  return (
    <section
      className={`phone-sheet-actions phone-action-panel phone-action-panel--${activeTurnTab}${trialPresentationActive ? " phone-action-panel--trial-active" : ""}`}
      aria-label={`${activeTurnTab} command screen`}
      data-testid="phone-action-panel-root"
    >
      {!patch.requiredAction && !scarDecisionContent && showCurrentPrompt && activeTurnTab !== "move" && activeTurnTab !== "action" ? <CurrentPromptCard prompt={currentPrompt} onSelectedTab={setSelectedTurnTab} /> : null}
      {!scarDecisionContent && !trialPresentationActive && activeTurnTab !== "move" && activeTurnTab !== "shop" && activeTurnTab !== "action" && isActiveSeat ? (
        <PhoneTileArrivalSummary arrival={patch.tileArrival} compact={activeTurnTab === "battle" && Boolean(patch.activeResolution)} />
      ) : null}
      <div
        className="phone-action-content-root"
        id={`phone-turn-panel-${activeTurnTab}`}
        role="tabpanel"
        aria-label={`${activeTurnTab} actions`}
        data-testid="phone-action-content-root"
      >
        {scarDecisionContent ?? <>{activeTurnTab === "action" || trialPresentationActive ? null : <CinderWattleAbilityPanel patch={patch} seatId={self.seatId} onIntent={onIntent} />}{activeTabContent}</>}
        {scarDecisionContent || activeTurnTab === "move" || activeTurnTab === "action" || trialPresentationActive ? null : (
          <div className="phone-sheet-action-status phone-action-secondary-status" data-testid="phone-action-secondary-status">
            <span>{tabDefinitions.find((tab) => tab.id === activeTurnTab)?.label ?? portraitActionStatusLabel(activeTurnTab)}</span>
            <span>{activeStatusCopy}</span>
          </div>
        )}
      </div>
      {!hideTurnTabs && !patch.pendingScarChoice && <TurnActionDock tabs={tabDefinitions} activeTab={activeTurnTab} onSelected={setSelectedTurnTab} />}
    </section>
  );
}
