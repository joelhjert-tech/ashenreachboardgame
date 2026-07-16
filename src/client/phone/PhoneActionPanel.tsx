import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
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
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicMoveStrategicTag,
  PublicSectorExplorationSummary,
  PublicSectorExplorationThreat,
  PublicShopCost,
  PublicShopEncounterState,
  ResultDelta,
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
import { GameButton, type GameButtonTone } from "../shared/GameButton.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { getGearCardArtId, getGearCardArtType, getShopCategoryIconPath } from "../shared/assetPaths.js";
import { statLabelById } from "../shared/statLabels.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { PhoneWrappedMediaCard } from "./PhoneWrappedMediaCard.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";
import { getTileAssetPath } from "../tv/tileAssetManifest.js";
import { formatTimingWindow, getBattleAssistViewModel, statLabelById as inventoryStatLabelById } from "./inventoryPresentation.js";
import { buildUsefulNowViewModel, type UsefulNowViewModel } from "./usefulNowPresentation.js";
import { getMissionRelevanceForSector, type MissionRelevance } from "../shared/missionRelevance.js";

interface PhoneActionPanelProps {
  characters: CharacterCatalogEntry[];
  onIntent: (intent: ClientIntent) => void;
  patch: PhonePatchPayload;
  selectedTurnTab?: TurnActionTab;
  onSelectedTurnTab?: (tab: TurnActionTab) => void;
  hideTurnTabs?: boolean;
}

interface ActionButtonDefinition {
  key: string;
  label: string;
  detail?: string;
  tone: "primary" | "secondary";
  stat?: Stat;
  disabled?: boolean;
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
      <img
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

const cardImageTypes = new Set<CardImageType>(["threat", "contract", "anomaly", "artifact", "equipment", "scar", "escalation"]);

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

  if (cardType === "hazard" || cardType === "event" || cardType === "anomaly") {
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
  const cardType = encounter?.cardType ?? resolution?.card?.type ?? null;
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
  shopBlockedByThreat: "Shop blocked by threat",
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
  canContinue,
  onContinue
}: {
  resolution: ActiveResolution | null | undefined;
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
  const visibleOutcomeEffects = outcome ? dedupeOutcomeEffects(outcome.text, outcome.effects) : [];

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
  onContinue
}: {
  outcome: OutcomeSummary;
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
      <GameButton
        tone="primary"
        className="phone-button phone-button-primary phone-resolution-continue phone-resolution-continue-priority"
        data-testid="phone-resolution-continue"
        type="button"
        onClick={onContinue}
      >
        Continue
      </GameButton>
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
      return phaseLabel.includes("battle") ? model : null;
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
      <img
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
  const [confirmingCardId, setConfirmingCardId] = useState<string | null>(null);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [confirmingSellGearId, setConfirmingSellGearId] = useState<string | null>(null);
  const [pendingSellGearId, setPendingSellGearId] = useState<string | null>(null);
  const revealedStock = shopEncounter?.revealedStock ?? [];
  const sellInventory = shopEncounter?.sellInventory ?? [];
  const confirmingItem = revealedStock.find((item) => item.cardId === confirmingCardId) ?? null;
  const sellItemKey = (item: (typeof sellInventory)[number]) => item.instanceId ?? item.gearId;
  const confirmingSellItem = sellInventory.find((item) => sellItemKey(item) === confirmingSellGearId) ?? null;

  useEffect(() => {
    if (!confirmingCardId || revealedStock.some((item) => item.cardId === confirmingCardId)) {
      return;
    }
    setConfirmingCardId(null);
  }, [confirmingCardId, revealedStock]);

  useEffect(() => {
    if (!pendingCardId) {
      return;
    }
    if (shopEncounter?.recentOutcome || !revealedStock.some((item) => item.cardId === pendingCardId)) {
      setPendingCardId(null);
    }
  }, [pendingCardId, revealedStock, shopEncounter?.recentOutcome]);

  useEffect(() => {
    if (!confirmingSellGearId || sellInventory.some((item) => sellItemKey(item) === confirmingSellGearId)) {
      return;
    }
    setConfirmingSellGearId(null);
  }, [confirmingSellGearId, sellInventory]);

  useEffect(() => {
    if (!pendingSellGearId) {
      return;
    }
    if (shopEncounter?.recentOutcome || !sellInventory.some((item) => sellItemKey(item) === pendingSellGearId)) {
      setPendingSellGearId(null);
    }
  }, [pendingSellGearId, sellInventory, shopEncounter?.recentOutcome]);

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
  const serviceActions = shopEncounter.services.filter((service) => service.id !== "sell-gear");
  const visibleShopDeltas = shopResultDeltas(resultDeltas);
  const showRecentOutcome = Boolean(recentOutcome && (purchasedItemName || soldItemName || visibleShopDeltas.length > 0));

  function confirmPurchase(cardId: string): void {
    setPendingCardId(cardId);
    setConfirmingCardId(null);
    onIntent({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId,
      cardId
    });
  }

  function confirmSale(gearId: string, instanceId?: string): void {
    setPendingSellGearId(instanceId ?? gearId);
    setConfirmingSellGearId(null);
    onIntent({
      type: "SHOP_SELL_REQUESTED",
      seatId,
      gearId,
      instanceId
    });
  }

  function skipShop(): void {
    setConfirmingCardId(null);
    setConfirmingSellGearId(null);
    setPendingCardId(null);
    setPendingSellGearId(null);
    onIntent({
      type: "SHOP_SKIP_REQUESTED",
      seatId
    });
  }

  return (
    <section className={`phone-shop-panel phone-shop-panel-${shopEncounter.status}`} aria-label="Shop encounter" data-testid="phone-shop-panel">
      <div className="phone-shop-header">
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

      <div className="phone-shop-state-copy" role="status">
        {isLocked
          ? blockedReasonText ?? "Shop blocked by threat."
            : shopEncounter.available === false
              ? "No shop available here."
              : "Choose a market service, then review stock or sell gear."}
      </div>

      <div className="phone-shop-wallet" aria-label="Operative resources">
        <span>Salvage: {shopEncounter.activePlayer.salvage}</span>
        <span>Scars {scarCount}</span>
        <span>
          Wounds {shopEncounter.activePlayer.wounds.current}/{shopEncounter.activePlayer.wounds.max}
        </span>
        <span>Trophies {shopEncounter.activePlayer.trophies ?? 0}</span>
      </div>

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
          {serviceActions.length > 0 ? (
            <div className="phone-shop-services" aria-label="Shop services">
              <div className="phone-shop-section-heading">
                <span>Services</span>
                <small>Reveal stock or use local services.</small>
              </div>
              {serviceActions.map((service) => {
                const disabledReason = formatShopDisabledReason(service.disabledReason);
                const completedMissionProgress = service.cost.completedContracts !== undefined
                  ? `${shopEncounter.activePlayer.completedContracts ?? 0}/${service.cost.completedContracts} completed Missions`
                  : null;
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

          <div className="phone-shop-stock" aria-label="Revealed shop stock">
            <div className="phone-shop-section-heading">
              <span>Stock</span>
              <small>{revealedStock.length > 0 ? "Tap Buy to review the purchase before spending Salvage." : "Use a buy service to reveal market stock."}</small>
            </div>
            {revealedStock.length > 0 ? (
              <div className="phone-shop-stock-list">
                {revealedStock.map((item) => {
                  const itemCategory = item.shopCategories?.map(formatShopCategory).join(" / ") ?? toTitleCase(item.type);
                  const disabledReason = formatShopDisabledReason(item.disabledReason) ?? (!item.affordable ? "Not enough Salvage" : undefined);
                  const isPending = pendingCardId === item.cardId;
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
                      description={<p className="phone-wrap-card__consequence">{item.summary}</p>}
                      disabledReason={disabledReason ? <small>{disabledReason}. Ignore until you can pay or free the slot.</small> : null}
                      meta={<span>Cost: {formatShopCost(item.cost)}</span>}
                      actions={
                        <GameButton
                          type="button"
                          tone="shop"
                          className="phone-button phone-button-primary"
                          disabled={!item.affordable || isPending || isPurchased}
                          disabledReason={disabledReason ?? (isPending ? "Buying..." : isPurchased ? "Purchased" : undefined)}
                          onClick={() => setConfirmingCardId(item.cardId)}
                        >
                          {isPending ? "Buying..." : isPurchased ? "Purchased" : "Buy"}
                        </GameButton>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">No equipment available.</p>
            )}
          </div>

          <div className="phone-shop-sell" aria-label="Sell held items">
            <div className="phone-shop-section-heading">
              <span>Sell</span>
              <small>{sellInventory.length > 0 ? "Trade held gear for Salvage." : "Only sellable carried gear appears here."}</small>
            </div>
            {sellInventory.length > 0 ? (
              <div className="phone-shop-stock-list">
                {sellInventory.map((item) => {
                  const disabledReason = formatShopDisabledReason(item.disabledReason);
                  const itemKey = sellItemKey(item);
                  const isPending = pendingSellGearId === itemKey;
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
                          onClick={() => setConfirmingSellGearId(itemKey)}
                        >
                          {isPending ? "Selling..." : isSold ? "Sold" : "Sell"}
                        </GameButton>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">No sellable items.</p>
            )}
          </div>

          {confirmingItem ? (
            <div className="phone-shop-confirm phone-shop-panel__confirm" role="dialog" aria-label="Confirm purchase">
              <span>Confirm Purchase</span>
              <strong>
                Buy {confirmingItem.name} for {formatShopCost(confirmingItem.cost)}?
              </strong>
              <p>{confirmingItem.summary}</p>
              <div className="phone-shop-confirm-actions">
                <GameButton type="button" tone="secondary" onClick={() => setConfirmingCardId(null)}>
                  Cancel
                </GameButton>
                <GameButton type="button" tone="shop" onClick={() => confirmPurchase(confirmingItem.cardId)}>
                  Confirm Purchase
                </GameButton>
              </div>
            </div>
          ) : null}

          {confirmingSellItem ? (
            <div className="phone-shop-confirm phone-shop-panel__confirm phone-shop-confirm-sale" role="dialog" aria-label="Confirm sale">
              <span>Confirm Sale</span>
              <strong>
                Sell {confirmingSellItem.name} for {confirmingSellItem.sellValue} Salvage?
              </strong>
              <p>{confirmingSellItem.summary}</p>
              <div className="phone-shop-confirm-actions">
                <GameButton type="button" tone="secondary" onClick={() => setConfirmingSellGearId(null)}>
                  Cancel
                </GameButton>
                <GameButton type="button" tone="shop" onClick={() => confirmSale(confirmingSellItem.gearId, confirmingSellItem.instanceId)}>
                  Confirm Sale
                </GameButton>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="phone-shop-skip">
        <GameButton type="button" tone="secondary" className="phone-shop-skip-button" onClick={skipShop}>
          Skip / Continue
        </GameButton>
        <small>{isLocked ? "Continue without trading and resolve the blocker." : "Leave the market without buying or selling."}</small>
      </div>

      {showRecentOutcome ? (
        <div className="phone-shop-outcome" role="status">
          <span>{recentOutcome?.gained ? "Purchase Complete" : recentOutcome?.sold ? "Sale Complete" : "Market Result"}</span>
          <p>
            {recentOutcome?.gained
              ? `Purchased: ${recentOutcome.gained}`
              : recentOutcome?.sold
                ? `Sold: ${recentOutcome.sold}`
              : recentOutcome?.summary}
          </p>
          <ResultDeltaRow deltas={visibleShopDeltas} className="phone-shop-deltas" />
        </div>
      ) : null}
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
      {selected ? (
        <MovementDestinationDetail
          planner={planner}
          selected={selected}
          seatId={seatId}
          activeContract={activeContract}
          onBack={() => onSelectedSectorId(null)}
          onIntent={onIntent}
        />
      ) : (
        <MovementDestinationList planner={planner} activeContract={activeContract} onSelected={onSelectedSectorId} />
      )}
    </section>
  );
}

function MovementSummaryHeader({ planner }: { planner: PublicMovementPlannerState }): ReactElement {
  const movementModifiers = planner.modifierSources ?? [];
  const movementModifierTotal = movementModifiers.reduce((total, source) => total + source.value, 0);
  return (
    <div className="phone-movement-summary" aria-label="Movement summary" data-testid="movement-summary">
      <span className="sr-only">Move {planner.movementValue}</span>
      <div
        className="phone-movement-dice"
        data-testid="movement-dice-animation"
        aria-label={`Movement die result ${planner.movementValue}`}
      >
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
  onSelected
}: {
  planner: PublicMovementPlannerState;
  activeContract: ContractCard | null;
  onSelected: (sectorId: string) => void;
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
          {planner.destinations.map((destination) => (
            <MovementDestinationRow
              key={destination.sectorId}
              destination={destination}
              planner={planner}
              activeContract={activeContract}
              onSelected={onSelected}
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
  onSelected
}: {
  destination: PublicMoveDestination;
  planner: PublicMovementPlannerState;
  activeContract: ContractCard | null;
  onSelected: (sectorId: string) => void;
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
      className={`phone-movement-row phone-move-panel__destination-row${isLocked ? " phone-movement-row-disabled" : ""}${missionRelevance ? " phone-movement-row-mission" : ""}`}
      role="listitem"
      data-testid="movement-destination-row"
      data-mission-target={missionRelevance ? "true" : "false"}
    >
      <PhoneWrappedMediaCard
        variant="movement"
        className="phone-movement-row-button"
        media={<MovementTileMedia destination={destination} />}
        title={destination.name}
        eyebrow={movementTagLabel[primaryTag]}
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
        disabledReason={destination.disabledReason ? <span className="phone-movement-disabled-reason">{destination.disabledReason}. Ignore this route for now.</span> : null}
        actions={
          <GameButton
            type="button"
            tone={primaryTag === "danger" || primaryTag === "locked" ? "battle" : primaryTag === "shop" ? "shop" : "move"}
            className="phone-button phone-button-primary phone-movement-select-button"
            aria-label={`${primaryTag === "locked" ? "Locked " : "Select "}${destination.name}`}
            onClick={() => onSelected(destination.sectorId)}
          >
            Select
          </GameButton>
        }
      />
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
    const scrollContainer = detailRef.current?.closest<HTMLElement>(".phone-action-content-root");

    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
      return;
    }

    const phoneScrollContainer = detailRef.current?.closest<HTMLElement>(".phone-portrait-scroll");

    if (phoneScrollContainer) {
      phoneScrollContainer.scrollTop = 0;
      phoneScrollContainer.scrollLeft = 0;
    }
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
          eyebrow="Destination"
          status={<MovementRouteConfidence items={confidenceItems} testId="movement-detail-route-confidence" />}
          description={
            <>
              <p className="phone-movement-row-lore" data-testid="movement-detail-lore">{identityLine}</p>
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
          disabledReason={routeUnavailable && !canUseVoidKey ? <span className="phone-movement-disabled-reason">{selected.disabledReason}. Ignore this route for now.</span> : null}
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
  hasMoveContent,
  seatId,
  activeContract,
  onIntent,
  usefulNow,
  canRollMovement,
  movementResolving
}: {
  movementPlanner: PublicMovementPlannerState | null | undefined;
  currentTile: CurrentTileViewModel;
  movementTravel: PhoneMovementTravelState | null;
  hasMoveContent: boolean;
  seatId: string;
  activeContract: ContractCard | null;
  onIntent: (intent: ClientIntent) => void;
  usefulNow: UsefulNowViewModel | null;
  canRollMovement: boolean;
  movementResolving: boolean;
}): ReactElement {
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const movementState = movementResolving
    ? "resolving"
    : movementPlanner?.active
      ? selectedSectorId ? "needs-confirm" : "needs-destination"
      : canRollMovement ? "needs-roll" : "complete";

  useEffect(() => {
    setSelectedSectorId(null);
  }, [movementPlanner?.currentSectorId, movementPlanner?.movementValue]);

  useLayoutEffect(() => {
    const scrollContainer = panelRef.current?.closest<HTMLElement>(".phone-portrait-scroll");
    if (!scrollContainer) return;
    if (typeof scrollContainer.scrollTo === "function") {
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } else {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    }
  }, [movementState, movementTravel?.key]);

  const selectDestination = (sectorId: string | null): void => {
    setSelectedSectorId(sectorId);
    const destination = sectorId ? movementPlanner?.destinations.find((entry) => entry.sectorId === sectorId) ?? null : null;
    if (destination?.disabledReason) return;
    onIntent({ type: "MOVEMENT_DESTINATION_PREVIEWED", seatId, toSectorId: sectorId });
  };

  return (
    <section ref={panelRef} className={`phone-action-active-panel phone-move-panel phone-move-panel--${movementState}`} data-testid="phone-action-active-panel" data-movement-state={movementState} aria-label="Move command screen">
      <CurrentTileCard tile={currentTile} />
      <PhoneMovementAnimation travel={movementTravel} />
      {!movementResolving ? (
        <MovementPlanner planner={movementPlanner} seatId={seatId} activeContract={activeContract} canRoll={canRollMovement} selectedSectorId={selectedSectorId} onSelectedSectorId={selectDestination} onIntent={onIntent} />
      ) : (
        <MovementEmptyState title={movementTravel ? "Route confirmed" : "Arrival resolving"} text={movementTravel ? `Travelling to ${movementTravel.toSectorName}.` : "Movement is complete. Resolve the arrival test or event."} detail="Movement controls will return on the next navigation step." />
      )}
      {!hasMoveContent && !movementPlanner?.active && !movementResolving && !canRollMovement && (
        <EmptyTurnTab title="No movement choice" text="Movement is not available in this step. Resolve the current action or wait for the table." />
      )}
      <UsefulNowPanel model={usefulNow} variant="secondary" />
    </section>
  );
}

function PhoneBattlePanel({
  title,
  activeResolution,
  encounter,
  resolutionPanel,
  battleAssistPanel,
  threatActions,
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
  hasBattleContent: boolean;
  visibleBattleDeltas: ResultDelta[];
  usefulNow: UsefulNowViewModel | null;
}): ReactElement {
  return (
    <section className="phone-action-active-panel phone-battle-panel" data-testid="phone-action-active-panel" aria-label="Battle command screen">
      <header className="phone-battle-panel__header">
        <span>Battle</span>
        <strong>{title}</strong>
      </header>
      <BattleSubjectCard resolution={activeResolution} encounter={encounter} />
      {resolutionPanel ? <div className="phone-battle-panel__roll-card">{resolutionPanel}</div> : null}
      <ActionSections sections={[{ key: "threat", title: "Threat", detail: title, actions: threatActions, defaultOpen: true }]} />
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
      <ActionSections
        sectionClassName="phone-sector-action-panel__action-card"
        sections={[
          { key: "resolve", title: "Tile Action", detail: title, actions: resolveActions, defaultOpen: true },
          { key: "gear", title: "Gear", detail: `${gearActions.length} available`, actions: gearActions },
          { key: "objects", title: "Items", detail: `${objectActions.length} usable`, actions: objectActions },
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
  selectedTurnTab: controlledSelectedTurnTab,
  onSelectedTurnTab,
  hideTurnTabs = false
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
  const orphanResolutionOutcome =
    isActiveSeat &&
    !activeResolution &&
    patch.phase === "resolution" &&
    patch.outcomeSummary?.seatId === self.seatId
      ? patch.outcomeSummary
      : null;
  const canContinueResolution =
    isActiveSeat &&
    !!activeResolution &&
    !patch.pendingEncounterDecisionPrivate &&
    !patch.pendingMemoryTaxChoicePrivate &&
    !patch.pendingForcedDestinationChoicePrivate &&
    !patch.pendingDisplacementPrivate &&
    ["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage);
  const continueResolution = () =>
    onIntent({
      type: "CONTINUE_RESOLUTION",
      seatId: self.seatId
    });
  const resolutionPanel = orphanResolutionOutcome ? (
    <OrphanResolutionRecoveryCard outcome={orphanResolutionOutcome} onContinue={continueResolution} />
  ) : (
    <ActiveResolutionCard
      resolution={activeResolution}
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
  const winnerName = patch.seats.find((seat) => seat.seatId === patch.winnerSeatId)?.displayName ?? patch.winnerSeatId ?? "unknown";
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
  const sectorOpportunityItems = getSectorOpportunityItems(sector);
  const isScenarioConfrontation = isScenarioConfrontationSpace(self.sectorId);
  const movementPlanner = patch.movementPlanner ?? null;
  const movementOutcome =
    patch.outcomeSummary?.seatId === self.seatId && patch.outcomeSummary.movedToSectorId
      ? patch.outcomeSummary
      : null;
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

  if (patch.status === "ended") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <CurrentPromptCard prompt={currentPromptFromSharedPrompt(sharedPrompt)} />
        {resolutionPanel}
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Game over: {winnerName} wins.</p>
      </section>
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

  const moveActions: ActionButtonDefinition[] = [];
  const threatActions: ActionButtonDefinition[] = [];
  const resolveActions: ActionButtonDefinition[] = [];
  const gearActions: ActionButtonDefinition[] = [];
  const objectActions: ActionButtonDefinition[] = [];
  const followerActions: ActionButtonDefinition[] = [];
  const tableActions: ActionButtonDefinition[] = [];
  const contractActions: ActionButtonDefinition[] = [];
  const advanceActions: ActionButtonDefinition[] = [];

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
      label: "Use solo reroll",
      detail: `${patch.soloReroll.charges} emergency reroll${patch.soloReroll.charges === 1 ? "" : "s"} this round`,
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

  if (patch.phase === "action" && patch.encounter?.cardType === "hazard") {
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
      activeResolution.playerId === self.seatId &&
      activeResolution.card?.id === patch.encounter.id;

    threatActions.push({
      key: "hazard-check",
      label: checkIsStaged ? "Roll check dice" : `Attempt ${statLabelById[patch.encounter.stat]} check`,
      detail: pendingTileChallenge
        ? `Recurring ${pendingTileChallenge.challengeType} challenge ${pendingTileChallenge.authoredOrder + 1} of ${pendingTileChallenge.totalChallenges}. Remains on this sector.`
        : patch.encounter.title,
      tone: "primary",
      stat: patch.encounter.stat,
      onClick: () =>
        onIntent({
          type: "CHECK_REQUESTED",
          seatId: self.seatId,
          stat: patch.encounter?.stat ?? "grit"
        })
    });
  }

  if (patch.phase === "action" && patch.encounter?.cardType === "enemy") {
    const combatIsStaged =
      activeResolution?.stage === "battle_setup" &&
      activeResolution.playerId === self.seatId &&
      activeResolution.card?.id === patch.encounter.id;

    threatActions.push({
      key: "enemy-combat",
      label: combatIsStaged ? "Roll combat dice" : "Enter combat",
      detail: patch.encounter.enemyName ?? patch.encounter.title,
      tone: "primary",
      stat: patch.encounter.stat,
      onClick: () =>
        onIntent({
          type: "COMBAT_REQUESTED",
          seatId: self.seatId,
          stat: patch.encounter?.stat ?? "grit"
        })
    });
  }

  if (patch.phase === "action") {
    const canResolveSpaceText =
      !patch.encounter &&
      !!boardSpace &&
      (boardSpace.tier === "inner" || boardSpace.tier === "center" || (sector?.encounterDecks.threat.length ?? 0) === 0);

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
      const equippedInstanceIds = new Set(Object.values(self.character.equippedGearInstances ?? {}).filter((value): value is string => Boolean(value)));
      const isEquipped = item.instanceId ? equippedInstanceIds.has(item.instanceId) : equippedIds.has(item.id);
      if (isEquipped) {
        if (item.activeText || item.useLimit) {
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

      if (item.activeText || item.useLimit) {
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
  const hasMoveContent = Boolean(movementPlanner?.active && movementPlanner.destinations.length > 0) || moveActions.length > 0;
  const hasBattleContent = Boolean(activeResolution || orphanResolutionOutcome || battleAssist) || threatActions.length > 0;
  const hasShopContent = Boolean(shopEncounter);
  const shopLocked = Boolean(shopEncounter && (shopEncounter.status === "locked" || shopEncounter.blockingThreats.length > 0));
  const shopLockReasonText = shopEncounter?.blockedReasonText ?? formatShopDisabledReason(shopEncounter?.blockedReason);
  const hasActionContent =
    resolveActions.length +
      gearActions.length +
      objectActions.length +
      followerActions.length +
      tableActions.length +
      contractActions.length +
      advanceActions.length >
    0;
  const battleRequiresResolution = Boolean(patch.encounter || activeResolution || orphanResolutionOutcome || battleAssist);
  const battleBlocksNonBattleTabs = battleRequiresResolution && hasBattleContent;
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
        ? "Shop locked: resolve battle first."
        : "Shop locked: no shop here.";
  const actionBlockedReason = battleBlocksNonBattleTabs
    ? "Action locked: resolve battle first."
    : hasActionContent || !hasMoveContent
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
      detail: patch.encounter?.title ?? activeResolution?.card?.title ?? battleAssist?.enemyName ?? "No threat",
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
      detail: boardSpace?.textBox.title ?? "Gear / quest",
      tone: "action",
      enabled: !battleBlocksNonBattleTabs && (hasActionContent || !hasMoveContent),
      blockedReason: actionBlockedReason
    }
  ];
  const canShowSelectedTab = (tab: TurnActionTabDefinition) => Boolean(tab);
  const fallbackTab = movementPlanner?.active
    ? "move"
    : hasBattleContent
      ? "battle"
      : hasShopContent
        ? "shop"
        : tabDefinitions.find((tab) => tab.id === "action" && (tab.enabled || tab.locked))?.id ??
          tabDefinitions.find((tab) => tab.enabled || tab.locked)?.id ??
          "action";
  const selectedTabDefinition = tabDefinitions.find((tab) => tab.id === selectedTurnTab && canShowSelectedTab(tab));
  const activeTurnTab: TurnActionTab = selectedTabDefinition?.id ?? fallbackTab;
  const currentPrompt: CurrentPromptViewModel = currentPromptFromSharedPrompt(sharedPrompt, activeTurnTab);
  const showCurrentPrompt = !currentPrompt.targetTab || currentPrompt.targetTab === activeTurnTab;
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
  const currentDeltas = patch.playerResultDeltas ?? patch.publicResultDeltas ?? [];
  const visibleBattleDeltas = battleResultDeltas(currentDeltas);
  const visibleActionDeltas = actionResultDeltas(currentDeltas);
  const battleTitle = patch.encounter?.title ?? activeResolution?.card?.title ?? battleAssist?.enemyName ?? "No threat";
  const actionTitle = boardSpace?.textBox.title ?? "Operative options";
  const activeTabContent =
    activeTurnTab === "move" ? (
      <PhoneMovePanel
        movementPlanner={movementPlanner}
        currentTile={currentTile}
        movementTravel={movementTravel}
        hasMoveContent={hasMoveContent}
        seatId={self.seatId}
        activeContract={activeContract}
        onIntent={onIntent}
        usefulNow={activeUsefulNow}
        canRollMovement={patch.phase === "navigation" && !movementPlanner?.active}
        movementResolving={Boolean(!movementPlanner?.active && (movementTravel || (patch.phase !== "navigation" && (activeResolution || movementOutcome))))}
      />
    ) : activeTurnTab === "battle" ? (
      <PhoneBattlePanel
        title={battleTitle}
        activeResolution={activeResolution}
        encounter={patch.encounter}
        resolutionPanel={resolutionPanel}
        battleAssistPanel={battleAssistPanel}
        threatActions={threatActions}
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
            ? "Shop locked: resolve battle first. Ignore shop until the encounter is cleared."
            : "Shop services appear when your operative is on a clear market, shrine, foundry, or service sector."
        }
      />
    ) : battleBlocksNonBattleTabs ? (
      <LockedCommandPanel
        tab="action"
        title="Resolve battle first"
        text="Action locked: resolve battle first. Ignore sector actions until the Battle tab is cleared."
      />
    ) : (
      <PhoneSectorActionPanel
        title={actionTitle}
        sectorOpportunityItems={sectorOpportunityItems}
        sectorExplorationCopy={sectorExplorationCopy}
        visibleActionDeltas={visibleActionDeltas}
        resolveActions={resolveActions}
        gearActions={gearActions}
        objectActions={objectActions}
        followerActions={followerActions}
        tableActions={tableActions}
        contractActions={contractActions}
        advanceActions={advanceActions}
        interactionMode={patch.interactionMode}
        usefulNow={activeUsefulNow}
      />
    );

  return (
    <section
      className={`phone-sheet-actions phone-action-panel phone-action-panel--${activeTurnTab}`}
      aria-label={`${activeTurnTab} command screen`}
      data-testid="phone-action-panel-root"
    >
      {showCurrentPrompt ? <CurrentPromptCard prompt={currentPrompt} onSelectedTab={setSelectedTurnTab} /> : null}
      <div
        className="phone-action-content-root"
        id={`phone-turn-panel-${activeTurnTab}`}
        role="tabpanel"
        aria-label={`${activeTurnTab} actions`}
        data-testid="phone-action-content-root"
      >
        {activeTabContent}
        <div className="phone-sheet-action-status phone-action-secondary-status" data-testid="phone-action-secondary-status">
          <span>{portraitActionStatusLabel(activeTurnTab)}</span>
          <span>{activeStatusCopy}</span>
        </div>
      </div>
      {!hideTurnTabs && <TurnActionDock tabs={tabDefinitions} activeTab={activeTurnTab} onSelected={setSelectedTurnTab} />}
    </section>
  );
}
