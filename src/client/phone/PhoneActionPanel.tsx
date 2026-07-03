import { useEffect, useState, type ReactElement } from "react";
import type {
  ActiveResolution,
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  GearItem,
  OutcomeSummary,
  PhonePatchPayload,
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicMoveStrategicTag,
  PublicShopCost,
  PublicShopEncounterState,
  ResultDelta,
  SectorNode,
  ShopFailureReason,
  Stat,
  TrophyPileEntry
} from "../shared/types.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { describeContractObjective, formatContractObjectiveStatus } from "../../game/contracts/objectives.js";
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
import { statLabelById } from "../shared/statLabels.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { formatTimingWindow, getBattleAssistViewModel, statLabelById as inventoryStatLabelById } from "./inventoryPresentation.js";
import { buildUsefulNowViewModel, type UsefulNowViewModel } from "./usefulNowPresentation.js";

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

const TROPHY_COST_PER_RANK = 4;
const MAX_STAT_RANK = 9;

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
  const contractId = patch.self?.character.activeContract?.contractId;
  return contractId ? patch.availableContracts.find((contract) => contract.id === contractId) ?? null : null;
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

function getGearActionDetail(item: GearItem): string {
  const baseDetail = item.activeText ?? toTitleCase(item.category ?? "active");

  if (item.useLimit !== "charge") {
    return baseDetail;
  }

  return `${baseDetail} | ${item.charges ?? 0} charge${item.charges === 1 ? "" : "s"} left`;
}

function formatShopCost(cost: PublicShopCost): string {
  const parts = [
    cost.salvage ? `${cost.salvage} Salvage` : null,
    cost.heat ? `${cost.heat} Heat` : null,
    cost.wounds ? `${cost.wounds} Wound${cost.wounds === 1 ? "" : "s"}` : null,
    cost.trophies ? `${cost.trophies} Trophies` : null,
    cost.completedContracts ? `${cost.completedContracts} Contract${cost.completedContracts === 1 ? "" : "s"}` : null,
    cost.scars ? `${cost.scars} Scar${cost.scars === 1 ? "" : "s"}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "No cost";
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

  return (
    <div className="phone-resolution-card" data-testid="phone-resolution-card">
      <div className="phone-resolution-heading">
        <span>{resolutionStageLabel[resolution.stage]}</span>
        <strong>{resolution.card?.title ?? outcome?.title ?? "Resolution"}</strong>
      </div>
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
          {outcome.effects.length > 0 && (
            <ul>
              {outcome.effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {canContinue && (
        <GameButton
          tone="primary"
          className="phone-button phone-button-primary phone-resolution-continue"
          data-testid="phone-resolution-continue"
          type="button"
          onClick={onContinue}
        >
          Continue
        </GameButton>
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
      <GameButton
        tone="primary"
        className="phone-button phone-button-primary phone-resolution-continue"
        data-testid="phone-resolution-continue"
        type="button"
        onClick={onContinue}
      >
        Continue
      </GameButton>
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
          className={`phone-button phone-sheet-action-button phone-button-${action.tone}`}
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

function ActionSections({ sections }: { sections: ActionSectionDefinition[] }): ReactElement {
  const visibleSections = sections.filter((section) => section.actions.length > 0);

  if (visibleSections.length === 0) {
    return <p className="phone-sheet-action-empty">No quick actions available in this step.</p>;
  }

  return (
    <div className="phone-sheet-action-sections">
      {visibleSections.map((section) => (
        <details key={section.key} className="phone-sheet-action-section" open={section.defaultOpen}>
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
      {tabs.map((tab) => (
        <GameButton
          key={tab.id}
          type="button"
          tone={tab.tone}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`phone-turn-panel-${tab.id}`}
          selected={activeTab === tab.id}
          className={`phone-turn-tab phone-turn-tab-${tab.tone}${activeTab === tab.id ? " phone-turn-tab-active" : ""}${
            tab.locked ? " phone-turn-tab-locked" : ""
          }`}
          disabled={!tab.enabled && !tab.locked}
          disabledReason={tab.blockedReason}
          onClick={() => onSelected(tab.id)}
          sublabel={tab.locked ? tab.blockedReason ?? "Shop blocked" : tab.blockedReason ?? tab.detail}
        >
          {tab.label}
        </GameButton>
      ))}
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

function buildDestinationSummary(destination: PublicMoveDestination): string {
  if (destination.disabledReason) {
    return destination.disabledReason;
  }

  if (destination.faceUpThreats.length > 0) {
    return `${destination.faceUpThreats.length} face-up blocker${destination.faceUpThreats.length === 1 ? "" : "s"} must be cleared.`;
  }

  if (destination.shop) {
    return destination.shop.status === "dangerous" ? "Risk shop. Services may add Heat." : "Shop services available if the sector stays clear.";
  }

  if (destination.threatIcons.length > 0) {
    return `${destination.threatIcons.map(formatThreatIconWithStat).join(", ")} threat icon${destination.threatIcons.length === 1 ? "" : "s"} printed here.`;
  }

  return "No public blockers are visible.";
}

function buildStrategicWarning(destination: PublicMoveDestination): string {
  if (destination.disabledReason) {
    return destination.disabledReason;
  }

  if (destination.nemesisPresent) {
    return "Nemesis present. Enter only if you are ready for pressure.";
  }

  if (destination.faceUpThreats.length > 0) {
    return destination.shop
      ? "Shop unavailable until blockers are cleared."
      : "Known blockers remain on this sector.";
  }

  if (destination.strategicTags.includes("shop")) {
    return destination.shop?.status === "dangerous"
      ? "Useful services, but risky actions can raise Heat."
      : "Good service tile if you need gear, repairs, or supplies.";
  }

  if (destination.strategicTags.includes("danger")) {
    return "Printed threat icons suggest danger, but the exact draw is hidden.";
  }

  if (destination.strategicTags.includes("reward")) {
    return "Reward-oriented tile with public upside if you can keep it clear.";
  }

  return "Low public pressure from visible board information.";
}

function shopResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const shopTypes = new Set<ResultDelta["type"]>(["itemBought", "itemSold", "salvage", "heat", "wound", "shopUnlocked"]);

  return (deltas ?? []).filter((delta) => delta.source?.startsWith("shop:") || shopTypes.has(delta.type));
}

function battleResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const battleTypes = new Set<ResultDelta["type"]>([
    "wound",
    "heat",
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

function UsefulNowPanel({ model }: { model: UsefulNowViewModel | null }): ReactElement | null {
  if (!model) {
    return null;
  }

  return (
    <aside className="phone-useful-now" data-testid="phone-useful-now" aria-label="Useful now">
      <div className="phone-useful-now-header">
        <span>{model.phaseLabel}</span>
        <strong>{model.headline}</strong>
        {model.relevantStat && <em>{statLabelById[model.relevantStat]}</em>}
      </div>
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
    </aside>
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
    "shopUnlocked"
  ]);

  return (deltas ?? []).filter((delta) => actionTypes.has(delta.type));
}

function PhoneShopPanel({
  shopEncounter,
  resultDeltas,
  seatId,
  onIntent
}: {
  shopEncounter: PublicShopEncounterState | null | undefined;
  resultDeltas?: ResultDelta[] | null;
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
  const confirmingSellItem = sellInventory.find((item) => item.gearId === confirmingSellGearId) ?? null;

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
    if (!confirmingSellGearId || sellInventory.some((item) => item.gearId === confirmingSellGearId)) {
      return;
    }
    setConfirmingSellGearId(null);
  }, [confirmingSellGearId, sellInventory]);

  useEffect(() => {
    if (!pendingSellGearId) {
      return;
    }
    if (shopEncounter?.recentOutcome || !sellInventory.some((item) => item.gearId === pendingSellGearId)) {
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
  const purchasedItemName = shopEncounter.recentOutcome?.gained;
  const soldItemName = shopEncounter.recentOutcome?.sold;
  const serviceActions = shopEncounter.services.filter((service) => service.id !== "sell-gear");
  const visibleShopDeltas = shopResultDeltas(resultDeltas);

  function confirmPurchase(cardId: string): void {
    setPendingCardId(cardId);
    setConfirmingCardId(null);
    onIntent({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId,
      cardId
    });
  }

  function confirmSale(gearId: string): void {
    setPendingSellGearId(gearId);
    setConfirmingSellGearId(null);
    onIntent({
      type: "SHOP_SELL_REQUESTED",
      seatId,
      gearId
    });
  }

  return (
    <section className={`phone-shop-panel phone-shop-panel-${shopEncounter.status}`} aria-label="Shop encounter">
      <div className="phone-shop-header">
        <div>
          <span>{shopTypeLabel}</span>
          <strong>{shopEncounter.shopName}</strong>
          <small>
            {categoryLabel} | {shopEncounter.sectorName}
          </small>
        </div>
        <span className={`phone-shop-status phone-shop-status-${shopEncounter.status}`}>{shopEncounter.status.toUpperCase()}</span>
      </div>

      <div className="phone-shop-state-copy" role="status">
        {isLocked
          ? blockedReasonText ?? "Shop blocked by threat."
            : shopEncounter.available === false
              ? "No shop available here."
              : "Choose gear to buy or sell."}
      </div>

      <div className="phone-shop-wallet" aria-label="Operative resources">
        <span>Salvage: {shopEncounter.activePlayer.salvage}</span>
        <span>Heat {shopEncounter.activePlayer.heat}</span>
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
                return (
                  <GameButton
                    key={service.id}
                    type="button"
                    tone="shop"
                    size="large"
                    contentMode="custom"
                    className="phone-shop-service-card"
                    disabled={!service.enabled}
                    disabledReason={disabledReason}
                    onClick={() =>
                      onIntent({
                        type: "SHOP_SERVICE_REQUESTED",
                        seatId,
                        serviceId: service.id
                      })
                    }
                    sublabel={disabledReason ?? formatShopCost(service.cost)}
                  >
                    <strong>{service.label}</strong>
                    {service.shopCategory ? <span>{formatShopCategory(service.shopCategory)}</span> : null}
                    {service.risk ? <small>{service.risk}</small> : null}
                  </GameButton>
                );
              })}
            </div>
          ) : null}

          <div className="phone-shop-stock" aria-label="Revealed shop stock">
            <div className="phone-shop-section-heading">
              <span>Stock</span>
              <small>{revealedStock.length > 0 ? "Tap Buy to review the purchase before spending Salvage." : "No stock available."}</small>
            </div>
            {revealedStock.length > 0 ? (
              <div className="phone-shop-stock-list">
                {revealedStock.map((item) => {
                  const itemCategory = item.shopCategories?.map(formatShopCategory).join(" / ") ?? toTitleCase(item.type);
                  const disabledReason = formatShopDisabledReason(item.disabledReason) ?? (!item.affordable ? "Not enough Salvage" : undefined);
                  const isPending = pendingCardId === item.cardId;
                  const isPurchased = purchasedItemName === item.name;
                  return (
                    <article key={item.cardId} className={`phone-shop-stock-card${item.affordable ? "" : " phone-shop-stock-card-disabled"}`}>
                      <div>
                        <span>{itemCategory}</span>
                        <strong>{item.name}</strong>
                        <p>{item.summary}</p>
                        <small>{disabledReason ?? formatShopCost(item.cost)}</small>
                      </div>
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
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">No stock available.</p>
            )}
          </div>

          <div className="phone-shop-sell" aria-label="Sell held items">
            <div className="phone-shop-section-heading">
              <span>Sell</span>
              <small>{sellInventory.length > 0 ? "Trade held gear for Salvage." : "No sellable items."}</small>
            </div>
            {sellInventory.length > 0 ? (
              <div className="phone-shop-stock-list">
                {sellInventory.map((item) => {
                  const disabledReason = formatShopDisabledReason(item.disabledReason);
                  const isPending = pendingSellGearId === item.gearId;
                  const isSold = soldItemName === item.name;
                  return (
                    <article key={item.gearId} className={`phone-shop-stock-card phone-shop-sell-card${item.sellable ? "" : " phone-shop-stock-card-disabled"}`}>
                      <div>
                        <span>{item.category ? toTitleCase(item.category) : toTitleCase(item.type)}</span>
                        <strong>{item.name}</strong>
                        <p>{item.summary}</p>
                        <small>{item.sellable ? `${item.sellValue} Salvage` : disabledReason ?? "Cannot sell this item"}</small>
                      </div>
                      <GameButton
                        type="button"
                        tone="shop"
                        className="phone-button phone-button-primary"
                        disabled={!item.sellable || isPending || isSold}
                        disabledReason={disabledReason ?? (isPending ? "Selling..." : isSold ? "Sold" : undefined)}
                        onClick={() => setConfirmingSellGearId(item.gearId)}
                      >
                        {isPending ? "Selling..." : isSold ? "Sold" : "Sell"}
                      </GameButton>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="phone-shop-empty-stock">No sellable items.</p>
            )}
          </div>

          {confirmingItem ? (
            <div className="phone-shop-confirm" role="dialog" aria-label="Confirm purchase">
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
            <div className="phone-shop-confirm phone-shop-confirm-sale" role="dialog" aria-label="Confirm sale">
              <span>Confirm Sale</span>
              <strong>
                Sell {confirmingSellItem.name} for {confirmingSellItem.sellValue} Salvage?
              </strong>
              <p>{confirmingSellItem.summary}</p>
              <div className="phone-shop-confirm-actions">
                <GameButton type="button" tone="secondary" onClick={() => setConfirmingSellGearId(null)}>
                  Cancel
                </GameButton>
                <GameButton type="button" tone="shop" onClick={() => confirmSale(confirmingSellItem.gearId)}>
                  Confirm Sale
                </GameButton>
              </div>
            </div>
          ) : null}
        </>
      )}

      {shopEncounter.recentOutcome ? (
        <div className="phone-shop-outcome" role="status">
          <span>{shopEncounter.recentOutcome.gained ? "Purchase Complete" : shopEncounter.recentOutcome.sold ? "Sale Complete" : "Market Result"}</span>
          <p>
            {shopEncounter.recentOutcome.gained
              ? `Purchased: ${shopEncounter.recentOutcome.gained}`
              : shopEncounter.recentOutcome.sold
                ? `Sold: ${shopEncounter.recentOutcome.sold}`
              : shopEncounter.recentOutcome.summary}
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
  onIntent
}: {
  planner: PublicMovementPlannerState | null | undefined;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSectorId(null);
  }, [planner?.currentSectorId, planner?.movementValue]);

  if (!planner?.active) {
    return null;
  }

  const selected = selectedSectorId
    ? planner.destinations.find((destination) => destination.sectorId === selectedSectorId) ?? null
    : null;

  return (
    <section className="phone-movement-planner" aria-label="Movement planner" data-testid="movement-planner">
      <div className="phone-movement-planner-header">
        <div>
          <span>Movement Planner</span>
          <strong>Move {planner.movementValue}</strong>
        </div>
        <p>
          Current: {planner.currentSectorName}. Legal destinations: {planner.destinations.length}.
        </p>
      </div>

      <div className="phone-movement-destination-list" role="list" aria-label="Legal destinations">
        {planner.destinations.length === 0 ? (
          <div className="phone-movement-empty" role="status">
            <strong>No legal destinations</strong>
            <p>No public route is currently available from this sector. Continue or resolve the current board effect.</p>
          </div>
        ) : (
          planner.destinations.map((destination) => {
          const primaryTag = getPrimaryMovementTag(destination);
          const selected = selectedSectorId === destination.sectorId;
          const isLocked = Boolean(destination.disabledReason);
          const routePreview = buildRoutePreviewCopy(destination, planner.movementValue, planner.currentSectorName, selected);

          return (
            <article
              key={destination.sectorId}
              className={`phone-movement-card${selected ? " phone-movement-card-selected" : ""}${
                isLocked ? " phone-movement-card-disabled" : ""
              }`}
              role="listitem"
            >
              <GameButton
                type="button"
                tone={primaryTag === "danger" || primaryTag === "locked" ? "battle" : primaryTag === "shop" ? "shop" : "move"}
                contentMode="custom"
                className="phone-movement-card-button"
                aria-pressed={selected}
                selected={selected}
                onClick={() => setSelectedSectorId(destination.sectorId)}
              >
                <span className={`phone-movement-badge phone-movement-badge-${primaryTag}`}>{movementTagLabel[primaryTag]}</span>
                <strong>{destination.name}</strong>
                <small>
                  {destination.distance} steps | exact route
                </small>
                <span className={`phone-movement-route-state phone-movement-route-state-${routePreview.statusLabel.toLowerCase()}`}>
                  {routePreview.statusLabel}
                </span>
                <span className="phone-movement-route-exact">{routePreview.exactText}</span>
                {routePreview.tagLabels.length > 0 && (
                  <span className="phone-movement-route-tags" aria-label={`${destination.name} route tags`}>
                    {routePreview.tagLabels.map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                  </span>
                )}
                {destination.threatIcons.length > 0 && (
                  <span className="phone-movement-card-icons">
                    {destination.threatIcons.map((icon, index) => (
                      <ThreatIconBadge key={`${icon}-${index}`} icon={icon} />
                    ))}
                  </span>
                )}
                <span>{routePreview.riskText ?? buildDestinationSummary(destination)}</span>
                {routePreview.rewardText ? <span>{routePreview.rewardText}</span> : null}
                {destination.disabledReason ? (
                  <span className="phone-movement-disabled-reason">{destination.disabledReason}</span>
                ) : null}
              </GameButton>
            </article>
          );
          })
        )}
      </div>

      {selected ? (
        <article className="phone-movement-intel" aria-label={`${selected.name} full intel`}>
          {(() => {
            const routePreview = buildRoutePreviewCopy(selected, planner.movementValue, planner.currentSectorName, true);

            return (
              <>
          <div className="phone-movement-intel-heading">
            <div>
              <span>Full Intel</span>
              <strong>{selected.name}</strong>
            </div>
            <GameButton type="button" tone="secondary" className="phone-button phone-button-secondary" onClick={() => setSelectedSectorId(null)}>
              Back
            </GameButton>
          </div>

          <div className="phone-movement-intel-grid">
            <span>Route</span>
            <strong>{(selected.routeNames ?? selected.route).join(" -> ")}</strong>
            <span>Why legal</span>
            <strong>{routePreview.exactText}</strong>
            <span>Steps</span>
            <strong>{selected.distance} / {planner.movementValue}</strong>
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
            <strong>{routePreview.statusLabel}: {routePreview.statusReason}</strong>
          </div>

          <div className="phone-movement-route-explain" aria-label="Route explanation">
            <p>{routePreview.pathText}</p>
            {routePreview.riskText ? <p>{routePreview.riskText}</p> : null}
            {routePreview.rewardText ? <p>{routePreview.rewardText}</p> : null}
          </div>

          {selected.loreText ? <p className="phone-movement-lore">{selected.loreText}</p> : null}
          <div className="phone-movement-rule">
            <span>Printed effect</span>
            <p>{selected.ruleText}</p>
          </div>

          <div className="phone-movement-threats">
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
          </div>

          {selected.shop ? (
            <div className="phone-movement-shop">
              <span>{selected.shop.shopName}</span>
              <strong>{selected.shop.status.toUpperCase()}</strong>
              <p>{selected.shop.servicesPreview.join(" / ")}</p>
            </div>
          ) : null}

          {selected.occupants.length > 0 ? (
            <div className="phone-movement-occupants">
              <span>Occupants</span>
              {selected.occupants.map((occupant) => (
                <p key={occupant.playerId}>
                  {occupant.name}: {occupant.characterName}
                </p>
              ))}
            </div>
          ) : null}

          {selected.scenarioMarkers && selected.scenarioMarkers.length > 0 ? (
            <div className="phone-movement-markers">
              <span>Scenario markers</span>
              <p>{selected.scenarioMarkers.join(", ")}</p>
            </div>
          ) : null}

          <div className="phone-movement-warning">
            <span>{movementTagLabel[getPrimaryMovementTag(selected)]}</span>
            {selected.threatIcons[0] && <ThreatIconBadge icon={selected.threatIcons[0]} />}
            <p>{buildStrategicWarning(selected)}</p>
          </div>

          <GameButton
            type="button"
            tone="move"
            className="phone-button phone-button-primary phone-movement-confirm"
            disabled={Boolean(selected.disabledReason)}
            disabledReason={selected.disabledReason}
            onClick={() =>
              onIntent({
                type: "MOVE_REQUESTED",
                seatId,
                toSectorId: selected.sectorId
              })
            }
          >
            Confirm Move
          </GameButton>
              </>
            );
          })()}
        </article>
      ) : (
        <p className="phone-sheet-action-copy">Tap a tile to inspect. Confirm destination when ready.</p>
      )}
    </section>
  );
}

function TrophyAdvanceDisclosure({
  actions,
  trophies
}: {
  actions: ActionButtonDefinition[];
  trophies: number;
}): ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  if (actions.length === 0) {
    return null;
  }

  return (
    <details
      className="phone-sheet-action-section phone-sheet-action-section-advance"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Spend trophies</span>
        <small>
          {trophies} held, {TROPHY_COST_PER_RANK} per rank
        </small>
      </summary>
      <ActionButtons actions={actions} />
    </details>
  );
}

function getTrophyPileEntryAvailableValue(entry: TrophyPileEntry): number {
  return Math.max(0, entry.trophyValue - (entry.spentValue ?? 0));
}

function TrophyPileSection({
  actions,
  trophies,
  trophyPile
}: {
  actions: ActionButtonDefinition[];
  trophies: number;
  trophyPile: TrophyPileEntry[] | undefined;
}): ReactElement {
  const availableStats = actions.filter((action) => !action.disabled).map((action) => action.label);
  const pile = trophyPile ?? [];
  const pileAvailableValue = pile.reduce((total, entry) => total + getTrophyPileEntryAvailableValue(entry), 0);

  return (
    <section className="phone-trophy-pile" aria-label="Trophy pile" data-testid="phone-trophy-pile">
      <div className="phone-trophy-pile-header">
        <div>
          <span>Trophy Pile</span>
          <strong>{trophies} available</strong>
        </div>
        <small>{pileAvailableValue} from defeated enemies</small>
      </div>
      <div className="phone-trophy-pile-list">
        {pile.length > 0 ? (
          pile.slice(0, 4).map((entry) => {
            const availableValue = getTrophyPileEntryAvailableValue(entry);

            return (
              <article key={`${entry.cardId}-${entry.spentValue ?? 0}`} className="phone-trophy-pile-card">
                <div>
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.stat ? `${statLabelById[entry.stat]} | ` : ""}
                    Trophy {availableValue}/{entry.trophyValue}
                  </span>
                </div>
                <em>{availableValue}</em>
              </article>
            );
          })
        ) : (
          <p>No defeated enemies saved yet.</p>
        )}
      </div>
      <p className="phone-trophy-pile-raise">
        {availableStats.length > 0
          ? `Can raise: ${availableStats.join(", ")}`
          : trophies >= TROPHY_COST_PER_RANK
            ? "No eligible stat raise right now."
            : `Need ${TROPHY_COST_PER_RANK - trophies} more trophy value to raise a stat.`}
      </p>
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
  const [localSelectedTurnTab, setLocalSelectedTurnTab] = useState<TurnActionTab>("move");
  const selectedTurnTab = controlledSelectedTurnTab ?? localSelectedTurnTab;
  const setSelectedTurnTab = onSelectedTurnTab ?? setLocalSelectedTurnTab;
  const self = patch.self;

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
  const shopEncounter =
    patch.phase === "action" && patch.shopEncounter?.activePlayer.playerId === self.seatId ? patch.shopEncounter : null;
  const canRaiseStat =
    patch.phase === "action" &&
    !patch.encounter &&
    !patch.pendingEnemyRoll &&
    self.character.status === "active";

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
        <p className="phone-sheet-action-copy">Waiting for another seat to finish its turn.</p>
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
  const statRaiseActions: ActionButtonDefinition[] = [];

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
    (sector?.neighbors ?? []).forEach((neighborId) => {
      const neighbor = getSector(patch.sectors, neighborId);

      moveActions.push({
        key: `move-${neighborId}`,
        label: neighbor?.name ?? neighborId,
        detail: "Move",
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "MOVE_REQUESTED",
            seatId: self.seatId,
            toSectorId: neighborId
          })
      });
    });
  }

  if (patch.phase === "action" && patch.encounter?.cardType === "hazard") {
    const checkIsStaged =
      activeResolution?.stage === "battle_setup" &&
      activeResolution.playerId === self.seatId &&
      activeResolution.card?.id === patch.encounter.id;

    threatActions.push({
      key: "hazard-check",
      label: checkIsStaged ? "Roll check dice" : `Attempt ${statLabelById[patch.encounter.stat]} check`,
      detail: patch.encounter.title,
      tone: "primary",
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
        detail: `Escalation ${patch.escalationLevel}/${patch.escalationThreshold}`,
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "STABILIZE_REQUESTED",
            seatId: self.seatId
          })
      });
    }

    self.character.heldGear.forEach((item) => {
      if (equippedIds.has(item.id)) {
        if (item.activeText || item.useLimit) {
          objectActions.push({
            key: `use-${item.id}`,
            label: `Use ${item.name}`,
            detail: getGearActionDetail(item),
            tone: item.useLimit === "discard" ? "primary" : "secondary",
            disabled: item.useLimit === "charge" && (item.charges ?? 0) <= 0,
            onClick: () =>
              onIntent({
                type: "USE_GEAR",
                seatId: self.seatId,
                gearId: item.id
              })
          });
        }

        return;
      }

      gearActions.push({
        key: `equip-${item.id}`,
        label: `Equip ${item.name}`,
        detail: `${toTitleCase(item.slot)}: +${item.statBonus.amount} ${statLabelById[item.statBonus.stat]}`,
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "EQUIP_GEAR",
            seatId: self.seatId,
            gearId: item.id,
            slot: item.slot
          })
      });

      if (item.activeText || item.useLimit) {
        objectActions.push({
          key: `use-${item.id}`,
          label: `Use ${item.name}`,
          detail: getGearActionDetail(item),
          tone: item.useLimit === "discard" ? "primary" : "secondary",
          disabled: item.useLimit === "charge" && (item.charges ?? 0) <= 0,
          onClick: () =>
            onIntent({
              type: "USE_GEAR",
              seatId: self.seatId,
              gearId: item.id
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
      followerActions.push({
        key: `use-follower-${follower.id}`,
        label: `Use ${follower.name}`,
        detail: `${toTitleCase(follower.role)}${follower.useLimit ? ` | ${toTitleCase(follower.useLimit)}` : ""}`,
        tone: follower.useLimit === "discard" ? "primary" : "secondary",
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

    if (self.character.activeContract && activeContract && self.character.activeContract.progress >= activeContract.objective.target) {
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

    if (canRaiseStat) {
      (Object.entries(self.character.stats) as Array<[Stat, number]>).forEach(([stat, value]) => {
        const atCap = value >= MAX_STAT_RANK;
        const canAfford = self.character.trophies >= TROPHY_COST_PER_RANK;
        const nextValue = Math.min(value + 1, MAX_STAT_RANK);

        statRaiseActions.push({
          key: `raise-${stat}`,
          label: statLabelById[stat],
          detail: atCap ? "At rank cap" : `${value} to ${nextValue}, cost ${TROPHY_COST_PER_RANK}`,
          tone: "secondary",
          disabled: atCap || !canAfford,
          onClick: () =>
            onIntent({
              type: "RAISE_STAT_REQUESTED",
              seatId: self.seatId,
              stat
            })
        });
      });
    }

    if (isScenarioConfrontation && patch.activeScenario && !patch.encounter) {
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

  const copy =
    patch.phase === "navigation"
      ? "Inspect public route intel before confirming movement."
      : patch.phase === "action" && isScenarioConfrontation
        ? "The Cinder Gate is open. Resolve the active scenario confrontation."
      : patch.phase === "action" && boardSpace
        ? `Resolve ${boardSpace.textBox.title}, then handle gear, contracts, or advancement.`
      : patch.phase === "action"
        ? "Resolve your current action, gear, or contract."
        : "Waiting for the server to resolve the current step.";
  const hasMoveContent = Boolean(movementPlanner?.active && movementPlanner.destinations.length > 0) || moveActions.length > 0;
  const hasBattleContent = Boolean(activeResolution || orphanResolutionOutcome || battleAssist) || threatActions.length > 0;
  const hasShopContent = Boolean(shopEncounter);
  const shopLocked = Boolean(shopEncounter && (shopEncounter.status === "locked" || shopEncounter.blockingThreats.length > 0));
  const hasActionContent =
    resolveActions.length +
      gearActions.length +
      objectActions.length +
      followerActions.length +
      tableActions.length +
      contractActions.length +
      advanceActions.length +
      statRaiseActions.length >
    0;
  const moveBlockedReason = hasMoveContent
    ? undefined
    : movementPlanner?.active && movementPlanner.destinations.length === 0
      ? "No legal move"
      : patch.phase === "navigation"
        ? "No legal move"
        : "Resolve first";
  const battleBlockedReason = hasBattleContent ? undefined : patch.phase === "action" ? "No enemy" : "Resolve first";
  const shopBlockedReason = shopLocked ? "Shop blocked" : hasShopContent ? undefined : "No shop";
  const actionBlockedReason = hasActionContent || !hasMoveContent ? undefined : "No action";
  const tabDefinitions: TurnActionTabDefinition[] = [
    {
      id: "move",
      label: "Move",
      detail: movementPlanner?.active ? `${movementPlanner.destinations.length} routes` : patch.phase === "navigation" ? "Ready" : "Standby",
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
      enabled: hasActionContent || !hasMoveContent,
      blockedReason: actionBlockedReason
    }
  ];
  const canShowSelectedTab = (tab: TurnActionTabDefinition) =>
    tab.enabled || tab.locked || tab.id === "shop" || (tab.id === "move" && Boolean(movementPlanner?.active));
  const fallbackTab = movementPlanner?.active ? "move" : tabDefinitions.find((tab) => tab.enabled || tab.locked)?.id ?? "action";
  const activeTurnTab = tabDefinitions.find((tab) => tab.id === selectedTurnTab && canShowSelectedTab(tab))
    ? selectedTurnTab
    : fallbackTab;
  const currentPrompt: CurrentPromptViewModel = currentPromptFromSharedPrompt(sharedPrompt, activeTurnTab);
  const currentDeltas = patch.playerResultDeltas ?? patch.publicResultDeltas ?? [];
  const visibleBattleDeltas = battleResultDeltas(currentDeltas);
  const visibleActionDeltas = actionResultDeltas(currentDeltas);

  return (
    <section className="phone-sheet-actions" aria-label="Quick actions">
      <div className="phone-sheet-section-heading">Turn Console</div>
      <CurrentPromptCard prompt={currentPrompt} onSelectedTab={setSelectedTurnTab} />
      <UsefulNowPanel model={usefulNow} />
      <ResultDeltaRow deltas={currentDeltas} className="phone-current-deltas" />
      <div className="phone-sheet-action-status">
        <span>Trophies: {self.character.trophies}</span>
        <span>{copy}</span>
      </div>
      {!hideTurnTabs && <TurnActionTabs tabs={tabDefinitions} activeTab={activeTurnTab} onSelected={setSelectedTurnTab} />}

      <div className="phone-turn-panel" id={`phone-turn-panel-${activeTurnTab}`} role="tabpanel" aria-label={`${activeTurnTab} actions`}>
        {activeTurnTab === "move" && (
          <>
            <div className="phone-turn-panel-heading">
              <span>Move</span>
              <strong>{sector?.name ?? self.sectorId}</strong>
            </div>
            <MovementPlanner planner={movementPlanner} seatId={self.seatId} onIntent={onIntent} />
            {!movementPlanner?.active && (
              <ActionSections sections={[{ key: "move", title: "Move", detail: sector?.name, actions: moveActions, defaultOpen: true }]} />
            )}
            {!hasMoveContent && (
              <EmptyTurnTab title="No movement choice" text="Movement is not available in this step. Resolve the current action or wait for the table." />
            )}
          </>
        )}

        {activeTurnTab === "battle" && (
          <>
            <div className="phone-turn-panel-heading">
              <span>Battle</span>
              <strong>{patch.encounter?.title ?? activeResolution?.card?.title ?? battleAssist?.enemyName ?? "No threat"}</strong>
            </div>
            {resolutionPanel}
            <ResultDeltaRow deltas={visibleBattleDeltas} className="phone-battle-deltas" />
            {battleAssistPanel}
            <ActionSections sections={[{ key: "threat", title: "Threat", detail: patch.encounter?.title, actions: threatActions, defaultOpen: true }]} />
            {!hasBattleContent && (
              <EmptyTurnTab title="No battle" text="There is no visible combat, check, or enemy roll waiting for this operative." />
            )}
          </>
        )}

        {activeTurnTab === "shop" && (
          <>
            <div className="phone-turn-panel-heading">
              <span>Shop</span>
              <strong>{shopEncounter?.shopName ?? "No market contact"}</strong>
            </div>
            <PhoneShopPanel shopEncounter={shopEncounter} resultDeltas={currentDeltas} seatId={self.seatId} onIntent={onIntent} />
            {!shopEncounter && (
              <EmptyTurnTab title="No shop here" text="Shop services appear when your operative is on a clear market, shrine, foundry, or service sector." />
            )}
          </>
        )}

        {activeTurnTab === "action" && (
          <>
            <div className="phone-turn-panel-heading">
              <span>Action</span>
              <strong>{boardSpace?.textBox.title ?? "Operative options"}</strong>
            </div>
            <SectorOpportunityChips items={sectorOpportunityItems} />
            <SectorExplorationPanel summary={sectorExplorationCopy} />
            <ResultDeltaRow deltas={visibleActionDeltas} className="phone-action-deltas" />
            <ActionSections
              sections={[
                { key: "resolve", title: "Tile Action", detail: boardSpace?.textBox.title, actions: resolveActions, defaultOpen: true },
                { key: "gear", title: "Gear", detail: `${gearActions.length} available`, actions: gearActions },
                { key: "objects", title: "Items", detail: `${objectActions.length} usable`, actions: objectActions },
                { key: "followers", title: "Followers", detail: `${followerActions.length} ready`, actions: followerActions },
                { key: "table", title: "Table", detail: patch.interactionMode ?? "rivalry", actions: tableActions },
                { key: "contracts", title: "Contracts", detail: `${contractActions.length} available`, actions: contractActions },
                { key: "advance", title: "Advance", detail: "Finish or confront", actions: advanceActions, defaultOpen: true }
              ]}
            />
            <TrophyPileSection actions={statRaiseActions} trophies={self.character.trophies} trophyPile={self.character.trophyPile} />
            <TrophyAdvanceDisclosure actions={statRaiseActions} trophies={self.character.trophies} />
          </>
        )}
      </div>
    </section>
  );
}
