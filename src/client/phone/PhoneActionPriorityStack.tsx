import { memo, type ReactElement } from "react";
import type { ClientIntent, PhonePatchPayload } from "../shared/types.js";
import { GameButton } from "../shared/GameButton.js";
import { statLabelById } from "../shared/statLabels.js";

export type PriorityActionGroup = "required" | "useful" | "optional" | "passive" | "blocked" | "advance";

export type PhoneActionEntryState =
  | "required"
  | "available"
  | "optional"
  | "passive"
  | "already-applied"
  | "timing-locked"
  | "invalid-target"
  | "insufficient-salvage"
  | "pending"
  | "used"
  | "reconnect-restored";

export interface PhoneActionEntry {
  id: string;
  actionType: string;
  category: "primary" | "sector" | "gear" | "item" | "follower" | "mission" | "table" | "advance" | "other";
  group: PriorityActionGroup;
  label: string;
  summary?: string;
  stat?: keyof typeof statLabelById;
  state: PhoneActionEntryState;
  command?: ClientIntent;
  disabledReason?: string;
  onActivate?: () => void;
}

export interface PhoneActionViewModel {
  phase: string;
  currentContext:
    | "free-action"
    | "tile-encounter-ready"
    | "hazard"
    | "challenge"
    | "event"
    | "battle"
    | "shop"
    | "payment"
    | "scar-choice"
    | "mission-completion"
    | "forced-destination"
    | "other-prompt";
  headline: string;
  summary?: string;
  groups: Record<PriorityActionGroup, PhoneActionEntry[]>;
  canEndTurn: boolean;
  endTurnBlockedReason?: string;
  sessionMode: PhonePatchPayload["sessionMode"];
}

export interface RawPhoneAction {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  disabledReason?: string;
  stat?: keyof typeof statLabelById;
  command?: ClientIntent;
  onClick: () => void;
}

export interface PassivePhoneAction {
  key: string;
  label: string;
  detail?: string;
  state?: "passive" | "already-applied" | "used";
}

export interface PhoneActionViewModelSources {
  resolve: RawPhoneAction[];
  threat: RawPhoneAction[];
  gear: RawPhoneAction[];
  items: RawPhoneAction[];
  followers: RawPhoneAction[];
  contracts: RawPhoneAction[];
  table: RawPhoneAction[];
  advance: RawPhoneAction[];
  passive?: PassivePhoneAction[];
}

const emptyGroups = (): Record<PriorityActionGroup, PhoneActionEntry[]> => ({
  required: [], useful: [], optional: [], passive: [], blocked: [], advance: []
});

function blockedState(action: RawPhoneAction): PhoneActionEntryState {
  const reason = (action.disabledReason ?? action.detail ?? "").toLowerCase();
  if (reason.includes("salvage") || reason.includes("payment")) return "insufficient-salvage";
  if (reason.includes("target")) return "invalid-target";
  if (reason.includes("used") || reason.includes("remaining")) return "used";
  return "timing-locked";
}

function toEntry(
  action: RawPhoneAction,
  category: PhoneActionEntry["category"],
  group: PriorityActionGroup
): PhoneActionEntry {
  const blocked = Boolean(action.disabled || action.disabledReason);
  return {
    id: action.key,
    actionType: action.command?.type ?? action.key,
    category,
    group: blocked ? "blocked" : group,
    label: action.label,
    summary: action.detail,
    stat: action.stat,
    state: blocked ? blockedState(action) : group === "required" ? "required" : group === "optional" ? "optional" : "available",
    command: action.command,
    disabledReason: blocked ? action.disabledReason ?? action.detail ?? "Unavailable in the current timing window." : undefined,
    onActivate: action.onClick
  };
}

function encounterKind(patch: PhonePatchPayload): "challenge" | "event" | "hazard" | "battle" {
  if (patch.pendingTileChallengePrivate || patch.pendingTileChallenge) return "challenge";
  const presentation = patch.encounter?.presentationType;
  if (presentation === "event" || presentation === "encounter" || presentation === "asset") return "event";
  if (patch.encounter?.cardType === "enemy") return "battle";
  return "hazard";
}

function isBlockingPrompt(patch: PhonePatchPayload): boolean {
  return Boolean(
    patch.pendingEncounterDecisionPrivate ||
    patch.pendingMemoryTaxChoicePrivate ||
    patch.pendingAfflictionChoicePrivate ||
    patch.pendingAfflictionReactionPrivate ||
    patch.pendingForcedDestinationChoicePrivate ||
    patch.pendingDisplacementPrivate ||
    patch.pendingGearEquipChoice ||
    patch.pendingEquipmentSuppressionChoice ||
    patch.pendingScarChoice ||
    patch.pendingScarRemovalChoice ||
    patch.pendingScarConsequence ||
    patch.pendingMissionSelection
  );
}

function actionDirectlySupportsTest(action: RawPhoneAction, testedStat: keyof typeof statLabelById | undefined): boolean {
  if (action.disabled || action.disabledReason) return false;
  return !action.stat || action.stat === testedStat;
}

function isEncounterSupportKey(key: string): boolean {
  return key.startsWith("use-") || key.startsWith("use-follower-") || key.startsWith("scar-adaptation-") || key.startsWith("character-ability-") || key.includes("reroll") || key.includes("prevent") || key.includes("intercession") || key === "choir-light";
}

function pushUnique(
  groups: Record<PriorityActionGroup, PhoneActionEntry[]>,
  seen: Set<string>,
  entry: PhoneActionEntry
): void {
  if (seen.has(entry.id)) return;
  seen.add(entry.id);
  groups[entry.group].push(entry);
}

export function buildPhoneActionViewModel(
  patch: PhonePatchPayload,
  sources: PhoneActionViewModelSources
): PhoneActionViewModel {
  const groups = emptyGroups();
  const seen = new Set<string>();
  const encounter = patch.encounter;
  const ready = Boolean(encounter && patch.activeResolution?.stage === "card_reveal");
  const kind = encounter ? encounterKind(patch) : null;
  const blocking = isBlockingPrompt(patch);
  const testedStat = encounter?.stat;
  const startAction = sources.threat.find((action) => action.command?.type === "START_TILE_ENCOUNTER");

  const context: PhoneActionViewModel["currentContext"] = patch.pendingScarChoice || patch.pendingScarRemovalChoice
    ? "scar-choice"
    : patch.pendingMissionSelection
      ? "mission-completion"
      : patch.pendingEncounterDecisionPrivate || patch.pendingMemoryTaxChoicePrivate
        ? "payment"
        : patch.pendingAfflictionChoicePrivate || patch.pendingAfflictionReactionPrivate
          ? "other-prompt"
        : patch.pendingForcedDestinationChoicePrivate || patch.pendingDisplacementPrivate
          ? "forced-destination"
          : ready
            ? "tile-encounter-ready"
            : kind ?? "free-action";

  const headline = context === "scar-choice" ? "Scar choice required"
    : context === "mission-completion" ? "Choose your next Contract"
    : context === "payment" ? "Payment required"
    : context === "other-prompt" ? "Affliction choice required"
    : context === "forced-destination" ? "Destination required"
    : encounter ? `${kind === "battle" ? "Battle" : kind === "challenge" ? "Challenge" : kind === "event" ? "Event" : "Hazard"} · ${encounter.title}`
    : "Action phase";
  const summary = context === "scar-choice"
    ? "Resolve the pending Scar choice to continue."
    : encounter
      ? `${statLabelById[encounter.stat]} test · Difficulty ${encounter.difficulty}`
      : "Choose one legal action or end the turn.";

  const add = (action: RawPhoneAction, category: PhoneActionEntry["category"], group: PriorityActionGroup) => {
    pushUnique(groups, seen, toEntry(action, category, group));
  };

  if (blocking) {
    for (const action of sources.resolve) add(action, "primary", "required");
    for (const action of sources.threat) add(action, "primary", "required");
  } else if (ready && startAction) {
    add(startAction, "primary", "required");
    for (const action of [...sources.resolve, ...sources.threat].filter((candidate) => candidate.key !== startAction.key)) {
      if (isEncounterSupportKey(action.key) && actionDirectlySupportsTest(action, testedStat)) {
        add(action, "primary", "useful");
      } else {
        add({ ...action, disabled: true, disabledReason: action.disabledReason ?? "Available after this encounter begins." }, "primary", "blocked");
      }
    }
  } else if (encounter) {
    for (const action of sources.resolve) {
      add(action, "primary", isEncounterSupportKey(action.key) ? "useful" : "required");
    }
    for (const action of sources.threat) {
      add(action, "primary", isEncounterSupportKey(action.key) ? "useful" : "required");
    }
  } else {
    for (const action of sources.resolve) add(action, "sector", "optional");
  }

  const encounterSupport = Boolean(encounter);
  const addSupport = (action: RawPhoneAction, category: PhoneActionEntry["category"]) => {
    if (blocking) {
      add({ ...action, disabled: true, disabledReason: action.disabledReason ?? "Resolve the required prompt first." }, category, "blocked");
      return;
    }
    if (encounterSupport && (!actionDirectlySupportsTest(action, testedStat) || (!isEncounterSupportKey(action.key) && category === "gear"))) {
      add({ ...action, disabled: true, disabledReason: action.disabledReason ?? `Unavailable during this ${kind ?? "encounter"}.` }, category, "blocked");
      return;
    }
    add(action, category, "useful");
  };

  for (const action of sources.gear) addSupport(action, "gear");
  for (const action of sources.items) addSupport(action, "item");
  for (const action of sources.followers) addSupport(action, "follower");

  for (const action of sources.contracts) {
    add(blocking || encounterSupport ? { ...action, disabled: true, disabledReason: action.disabledReason ?? "Resolve the current encounter first." } : action, "mission", "optional");
  }
  for (const action of sources.table) {
    add(blocking || encounterSupport ? { ...action, disabled: true, disabledReason: action.disabledReason ?? "Resolve the current encounter first." } : action, "table", "optional");
  }

  for (const item of sources.passive ?? []) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    groups.passive.push({
      id: item.key,
      actionType: "PASSIVE",
      category: "other",
      group: "passive",
      label: item.label,
      summary: item.detail,
      state: item.state ?? "passive"
    });
  }

  const endTurn = sources.advance.find((action) => action.key === "end-turn");
  for (const action of sources.advance.filter((candidate) => candidate.key !== "end-turn")) {
    add(action, "advance", encounterSupport || blocking ? "required" : "optional");
  }

  const projectedEndTurnReady = patch.requiredAction?.transitionStage === "end-turn-available"
    && (patch.requiredAction.allowedCommand === "finish-actions" || patch.requiredAction.allowedCommand === "end-turn");
  const endTurnBlockedReason = patch.requiredAction && !projectedEndTurnReady
    ? patch.requiredAction.activeInstruction ?? patch.requiredAction.detail
    : patch.tileArrival?.blockedReason ?? (encounter
    ? `Resolve ${encounter.title} before ending the turn.`
    : blocking ? "Resolve the current required prompt before ending the turn." : undefined);
  const canEndTurn = Boolean(
    endTurn
    && !endTurn.disabled
    && !endTurn.disabledReason
    && (patch.requiredAction ? projectedEndTurnReady : !endTurnBlockedReason)
    && !encounterSupport
    && !blocking
  );
  if (endTurn && canEndTurn) {
    add({
      ...endTurn,
      detail: patch.sessionMode === "single-player" ? "Begin next round" : "Pass control to next operative"
    }, "advance", "advance");
  } else if (endTurn || endTurnBlockedReason) {
    add({
      ...(endTurn ?? { key: "end-turn", label: "End Turn", onClick: () => undefined }),
      disabled: true,
      disabledReason: endTurn?.disabledReason ?? endTurnBlockedReason ?? "End Turn is not legal yet.",
      detail: endTurn?.disabledReason ?? endTurnBlockedReason ?? "End Turn is not legal yet."
    }, "advance", "blocked");
  }

  return { phase: patch.phase, currentContext: context, headline, summary, groups, canEndTurn, endTurnBlockedReason, sessionMode: patch.sessionMode };
}

const PriorityActionCard = memo(function PriorityActionCard({ action, onIntent }: { action: PhoneActionEntry; onIntent: (intent: ClientIntent) => void }): ReactElement {
  const disabled = action.group === "blocked" || action.group === "passive" || action.state === "used" || Boolean(action.disabledReason);
  const actionLabel = action.label;
  return (
    <article className={`phone-priority-action is-${action.group} is-${action.state}`} data-action-id={action.id} data-priority-group={action.group}>
      <div>
        <span>{action.category}</span>
        {action.group === "passive" ? <strong>{action.label}</strong> : null}
        {action.summary && action.summary !== action.disabledReason ? <p>{action.summary}</p> : null}
        {action.disabledReason ? <span className="phone-priority-action__reason" role="status">{action.disabledReason}</span> : null}
      </div>
      {action.group === "passive" ? <b aria-label={`${action.label} already applied`}>Applied</b> : (
        <GameButton
          tone={action.group === "required" || action.group === "advance" ? "action" : "secondary"}
          disabled={disabled}
          disabledReason={action.disabledReason}
          aria-label={`${actionLabel}. ${action.summary ?? action.disabledReason ?? "Available now"}`}
          onClick={() => action.command ? onIntent(action.command) : action.onActivate?.()}
        >
          {actionLabel}
        </GameButton>
      )}
    </article>
  );
});

function ActionSection({
  title,
  actions,
  onIntent,
  collapsed = false,
  testId
}: {
  title: string;
  actions: PhoneActionEntry[];
  onIntent: (intent: ClientIntent) => void;
  collapsed?: boolean;
  testId: string;
}): ReactElement | null {
  if (actions.length === 0) return null;
  const body = actions.map((action) => <PriorityActionCard key={action.id} action={action} onIntent={onIntent} />);
  if (collapsed) {
    return <details className="phone-priority-stack__section" data-testid={testId}><summary>{title} · {actions.length}</summary>{body}</details>;
  }
  return <section className="phone-priority-stack__section" data-testid={testId}><h3>{title}{actions.length > 1 ? ` · ${actions.length}` : ""}</h3>{body}</section>;
}

export function PhoneActionPriorityStack({ model, onIntent }: { model: PhoneActionViewModel; onIntent: (intent: ClientIntent) => void }): ReactElement {
  const optionalCollapsed = model.groups.optional.length > 3;
  return (
    <div className="phone-priority-stack" data-testid="phone-action-priority-stack">
      <header className="phone-priority-stack__header">
        <span>Current context</span>
        <h2>{model.headline}</h2>
        {model.summary ? <p>{model.summary}</p> : null}
      </header>
      <ActionSection title="Required now" actions={model.groups.required} onIntent={onIntent} testId="priority-required" />
      {model.canEndTurn ? <ActionSection title="End turn" actions={model.groups.advance} onIntent={onIntent} testId="priority-advance" /> : null}
      <ActionSection title="Useful now" actions={model.groups.useful} onIntent={onIntent} testId="priority-useful" />
      <ActionSection title="Optional" actions={model.groups.optional} onIntent={onIntent} collapsed={optionalCollapsed} testId="priority-optional" />
      <ActionSection title="Passive / already applied" actions={model.groups.passive} onIntent={onIntent} collapsed testId="priority-passive" />
      <ActionSection title="Blocked" actions={model.groups.blocked} onIntent={onIntent} collapsed testId="priority-blocked" />
    </div>
  );
}
