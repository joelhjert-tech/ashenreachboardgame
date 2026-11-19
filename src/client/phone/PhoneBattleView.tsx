import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { GameButton } from "../shared/GameButton.js";
import { formatResultDelta } from "../shared/resultDeltas.js";
import { statLabelById } from "../shared/statLabels.js";
import type {
  ClientIntent,
  PhonePatchPayload,
  PhoneSelfState,
  ResultDelta,
  ResultDeltaType,
  Stat
} from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { CinderWattleAbilityPanel } from "./CinderWattleAbilityPanel.js";
import { getBattleAssistViewModel } from "./inventoryPresentation.js";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../shared/AuthoritativeDicePresentation.js";
import { usePhoneBackDismissal } from "./useActiveRoomBackGuard.js";
import { PhoneBattleDuelStage } from "./PhoneBattleDuelStage.js";
import { PhoneRollBreakdown } from "./PhoneRollBreakdown.js";
import { PhoneEdgeCardHand } from "./PhoneEdgeCardHand.js";
import { getPhoneLoadoutWindow } from "./loadoutWindow.js";

export interface PhoneBattleChoiceAction {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface PhoneBattleViewProps {
  patch: PhonePatchPayload;
  self: PhoneSelfState;
  onIntent: (intent: ClientIntent) => void;
  choiceActions?: PhoneBattleChoiceAction[];
  optionalActions?: PhoneBattleChoiceAction[];
  submissionPending?: boolean;
}

type BattleContext = "battle" | "loadout";

const consequenceGlyphByType: Record<ResultDeltaType, string> = {
  wound: "✚",
  salvage: "S",
  trophy: "T",
  gearGained: "+",
  gearLost: "−",
  itemBought: "+",
  itemSold: "S",
  contractProgress: "C",
  contractCompleted: "C",
  scenarioProgress: "◇",
  scenarioPressure: "!",
  agendaProgress: "A",
  agendaCompleted: "A",
  threatDefeated: "†",
  threatRemains: "!",
  sectorUnlocked: "↗",
  shopUnlocked: "S",
  afflictionDrawn: "!",
  afflictionFlipped: "◇",
  scarGained: "✚",
  recallTriggered: "↩",
  fateSpent: "F",
  statUpgrade: "↑",
  modifierApplied: "±"
};

function normalizeCopy(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;
}

function wasPhoneBattleSeen(id: string | null): boolean {
  if (!id || typeof window === "undefined") return false;
  return window.sessionStorage.getItem(`ashenreach:phone-battle-seen:${id}`) === "1";
}

function enemyArtType(patch: PhonePatchPayload): CardImageType {
  const artType = patch.activeResolution?.card?.artType;
  if (artType === "anomaly" || artType === "artifact" || artType === "contract" || artType === "escalation" || artType === "threat") {
    return artType;
  }
  return "threat";
}

export function isOpposedPhoneBattleActive(patch: PhonePatchPayload | null | undefined): boolean {
  return Boolean(
    patch?.pendingEnemyRoll ||
      (patch?.activeResolution?.battle && ["threat", "enemy"].includes(patch.activeResolution.card?.type ?? "")) ||
      patch?.encounter?.cardType === "enemy" ||
      patch?.activeResolution?.card?.type === "enemy"
  );
}

export function isPhoneBattleRelevantToSeat(
  patch: PhonePatchPayload | null | undefined,
  seatId: string
): boolean {
  if (!patch || !isOpposedPhoneBattleActive(patch)) return false;

  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  return (
    patch.activeResolution?.playerId === seatId ||
    patch.pendingEnemyRoll?.fighterSeatId === seatId ||
    patch.pendingEnemyRoll?.assignedRollerSeatId === seatId ||
    activeSeatId === seatId
  );
}

export function getPhoneBattleIdentity(patch: PhonePatchPayload): string | null {
  if (!isOpposedPhoneBattleActive(patch)) return null;
  return (
    patch.battlePresentation?.id ??
    patch.activeResolution?.id ??
    (patch.pendingEnemyRoll
      ? `${patch.pendingEnemyRoll.fighterSeatId}:${patch.pendingEnemyRoll.encounterCardId}`
      : patch.encounter?.id ?? null)
  );
}

function visibleBattleDeltas(patch: PhonePatchPayload): ResultDelta[] {
  const deltas = patch.playerResultDeltas ?? patch.publicResultDeltas ?? [];
  const battleTypes = new Set<ResultDeltaType>([
    "wound",
    "scarGained",
    "salvage",
    "trophy",
    "gearGained",
    "gearLost",
    "threatDefeated",
    "threatRemains",
    "scenarioProgress",
    "scenarioPressure",
    "recallTriggered",
    "modifierApplied",
    "afflictionDrawn",
    "afflictionFlipped"
  ]);
  const seen = new Set<string>();

  return deltas.filter((delta) => {
    if (delta.visibility === "hidden") return false;
    if (delta.source !== "combat" && delta.source !== "resolution-effect" && !battleTypes.has(delta.type)) return false;
    const key =
      delta.type === "threatDefeated" || delta.type === "threatRemains"
        ? `${delta.type}:${delta.targetSeatId ?? ""}`
        : `${delta.type}:${delta.source ?? ""}:${delta.targetSeatId ?? ""}:${delta.value ?? ""}:${normalizeCopy(delta.publicText)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackEffects(patch: PhonePatchPayload, deltas: ResultDelta[]): string[] {
  const structured = new Set(
    deltas.flatMap((delta) => [
      normalizeCopy(delta.publicText),
      normalizeCopy(delta.privateText ?? ""),
      normalizeCopy(delta.label)
    ])
  );
  const seen = new Set<string>();

  return (patch.activeResolution?.outcome?.effects ?? []).filter((effect) => {
    const normalized = normalizeCopy(effect);
    if (
      deltas.some((delta) => delta.type === "threatRemains") &&
      (normalized.includes("remains") || normalized.includes("unresolved"))
    ) {
      return false;
    }
    if (!normalized || structured.has(normalized) || [...structured].some((entry) => entry && (normalized.includes(entry) || entry.includes(normalized))) || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function BattleConsequences({ patch }: { patch: PhonePatchPayload }): ReactElement | null {
  const structuredDeltas = visibleBattleDeltas(patch);
  const hasTrophyDelta = structuredDeltas.some((delta) => delta.type === "trophy");
  const hasAuthoredTrophyEffect = (patch.activeResolution?.outcome?.effects ?? []).some((effect) =>
    normalizeCopy(effect).includes("trophy")
  );
  const deltas = structuredDeltas.filter(
    (delta) => delta.type !== "threatDefeated" || (!hasTrophyDelta && !hasAuthoredTrophyEffect)
  );
  const effects = fallbackEffects(patch, structuredDeltas);
  if (deltas.length === 0 && effects.length === 0) return null;

  return (
    <div className="phone-battle-shell__consequences" aria-label="Battle consequences">
      {deltas.map((delta) => {
        const presentation = formatResultDelta(delta);
        return (
          <div
            key={delta.id}
            className={`phone-battle-consequence phone-battle-consequence--${presentation.tone}`}
            data-testid={`phone-battle-consequence-${delta.type}`}
          >
            <span aria-hidden="true">{consequenceGlyphByType[delta.type]}</span>
            <div>
              <strong>{delta.type === "threatDefeated" ? "Trophy pile" : presentation.label}</strong>
              <small>{presentation.detail}</small>
            </div>
          </div>
        );
      })}
      {effects.map((effect) => (
        <div key={effect} className="phone-battle-consequence phone-battle-consequence--neutral">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>{effect}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function BattleChoiceList({ actions }: { actions: PhoneBattleChoiceAction[] }): ReactElement | null {
  if (actions.length === 0) return null;

  return (
    <section className="phone-battle-shell__choices" aria-label="Required battle choice">
      <span>Resolve before continuing</span>
      {actions.map((action) => (
        <GameButton
          key={action.key}
          type="button"
          tone="battle"
          disabled={action.disabled}
          disabledReason={action.disabled ? action.detail ?? "Unavailable" : undefined}
          onClick={action.onClick}
          sublabel={action.detail}
        >
          {action.label}
        </GameButton>
      ))}
    </section>
  );
}

export function PhoneBattleView({
  patch,
  self,
  onIntent,
  choiceActions = [],
  optionalActions = [],
  submissionPending = false
}: PhoneBattleViewProps): ReactElement {
  const identity = getPhoneBattleIdentity(patch);
  const [context, setContext] = useState<BattleContext>("battle");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [restored, setRestored] = useState(() => wasPhoneBattleSeen(identity));
  const [rollSubmitting, setRollSubmitting] = useState(false);
  const resolution = patch.activeResolution ?? null;
  const projectedPresentation = patch.battlePresentation ?? null;
  const presentation =
    !resolution || projectedPresentation?.id === resolution.id
      ? projectedPresentation
      : null;
  const encounter = patch.encounter;
  const pendingRoll = patch.pendingEnemyRoll;
  const battle = resolution?.battle;
  const resultStage = Boolean(
    resolution &&
    ["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)
  );
  const roll = resultStage ? resolution?.roll : undefined;
  const outcome = resultStage ? resolution?.outcome : undefined;
  const assist = getBattleAssistViewModel(patch);
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const isActiveSeat = activeSeatId === self.seatId;
  const fighterSeatId = presentation?.actorSeatId ?? pendingRoll?.fighterSeatId ?? resolution?.playerId ?? self.seatId;
  const fighter = patch.players.find((player) => player.seatId === fighterSeatId)?.character ?? self.character;
  const playerName = presentation?.operative.name ?? patch.seats.find((seat) => seat.seatId === fighterSeatId)?.displayName ?? fighter.name;
  const isAssignedEnemyRoller = pendingRoll?.assignedRollerSeatId === self.seatId;
  const assignedRollerName =
    patch.seats.find((seat) => seat.seatId === pendingRoll?.assignedRollerSeatId)?.displayName ??
    "another operative";
  const stat: Stat = presentation?.test.stat ?? battle?.stat ?? encounter?.stat ?? pendingRoll?.stat ?? "grit";
  const challengeThemeStyle = getChallengeThemeStyle(stat) as CSSProperties;
  const statLabel = statLabelById[stat].toUpperCase();
  const enemyName =
    presentation?.encounter.name ??
    battle?.enemyName ??
    resolution?.card?.title ??
    pendingRoll?.encounterTitle ??
    encounter?.enemyName ??
    encounter?.title ??
    "Unknown threat";
  const enemyId = resolution?.card?.id ?? pendingRoll?.encounterCardId ?? encounter?.id ?? "";
  const opponentTotal = presentation?.opponent.finalTotal ?? roll?.target ?? battle?.difficulty ?? encounter?.difficulty ?? assist?.enemyBattleValue ?? 0;
  const operativeValue = presentation?.operative.baseValue ?? assist?.playerBattleValue ?? fighter.stats[stat] ?? 0;
  const rollValue = resultStage
    ? presentation?.operative.diceTotal ?? roll?.baseTotal ?? null
    : null;
  const rollFixedValue = roll?.modifierTotal ?? presentation?.test.fixedValue ?? null;
  const finalTotal = resultStage ? presentation?.operative.finalTotal ?? roll?.finalTotal ?? null : null;
  const result = !resultStage
    ? null
    : presentation?.outcome === "success"
      ? "success"
      : presentation?.outcome === "failure"
        ? "defeat"
        : presentation?.outcome === "draw"
          ? "draw"
          : roll
            ? (roll.success ? "success" : "defeat")
            : null;
  const resultLabel = result === "success" ? "Success" : result === "defeat" ? "Failure" : result === "draw" ? "Draw" : pendingRoll ? "Enemy roll" : resolution?.stage === "battle_setup" ? "Roll required" : "Battle";
  const detailsFormula = finalTotal !== null && rollValue !== null && rollFixedValue !== null
    ? `${rollValue} ${rollFixedValue < 0 ? "−" : "+"} ${Math.abs(rollFixedValue)} = ${finalTotal}`
    : null;
  const outcomeFlavor = resultStage ? presentation?.publicConsequence ?? outcome?.text ?? null : null;
  const loadoutWindow = getPhoneLoadoutWindow(patch, self.seatId);
  const loadoutCardCount = self.character.heldGear.length + (self.character.followers?.length ?? 0);
  const relevantItemCount = patch.objectUseStates?.filter((state) => state.usableForCurrentTest === true).length ?? 0;
  const edgeCardCount = patch.edgeHand?.cards.length ?? 0;
  const helperCount = resolution?.assistance?.contributions.length
    ?? patch.cooperativeAssistanceEligibility?.helpers.length
    ?? patch.cooperativeAssistance?.eligibleHelperSeatIds?.length
    ?? patch.eligibleNemesisAssistSeatIds?.length
    ?? 0;
  const conditionCount = presentation?.operative.modifiers.filter((modifier) => modifier.kind === "status" || modifier.kind === "scenario").length
    ?? patch.pendingTestModifiers?.length
    ?? 0;
  const fixedValue = presentation?.test.fixedValue;
  const requiredDiceTotal = presentation?.test.requiredDiceTotal;
  const victoryReward = !roll ? presentation?.encounter.victoryReward ?? null : null;
  const failureStakes = !roll ? presentation?.encounter.failureStakes ?? null : null;

  useEffect(() => {
    setContext("battle");
    setDetailsOpen(false);
    setSupportOpen(false);
    const alreadySeen = wasPhoneBattleSeen(identity);
    setRestored(alreadySeen);
    setRollSubmitting(false);
    if (identity && typeof window !== "undefined") {
      window.sessionStorage.setItem(`ashenreach:phone-battle-seen:${identity}`, "1");
    }
  }, [identity]);

  useEffect(() => {
    if (roll || pendingRoll || resolution?.stage === "dice_roll") setRollSubmitting(false);
  }, [pendingRoll, resolution?.stage, roll]);

  useEffect(() => {
    if (!submissionPending) setRollSubmitting(false);
  }, [submissionPending]);

  useEffect(() => {
    if (!loadoutWindow && context === "loadout") setContext("battle");
  }, [context, loadoutWindow]);

  usePhoneBackDismissal(context !== "battle" || detailsOpen || supportOpen, () => {
    if (context !== "battle") {
      setContext("battle");
      return true;
    }
    if (detailsOpen) {
      setDetailsOpen(false);
      return true;
    }
    if (supportOpen) {
      setSupportOpen(false);
      return true;
    }
    return false;
  });

  const operativeDiceModel: AuthoritativeDiceModel = {
    id: presentation?.id ?? resolution?.id ?? `battle:${self.seatId}:${enemyName}`,
    revision: presentation?.revision ?? 0,
    stage: rollSubmitting ? "submitting" : resolution?.stage === "dice_roll" || pendingRoll ? "rolling" : roll ? optionalActions.some((action) => /reroll/i.test(action.label)) ? "reaction" : "result" : "ready",
    context: presentation?.encounter.category === "Battle" ? "battle" : "test",
    actorName: playerName,
    purpose: `${presentation?.encounter.category ?? "Battle"} · ${statLabel}`,
    dice: buildDice(
      presentation?.operative.rawDice ?? roll?.dice ?? [],
      Array.from({ length: presentation?.operative.diceCount ?? roll?.dice.length ?? 2 }, (_, index) => `Operative die ${index + 1}`),
      presentation?.operative.previousRawDice
    ),
    rawTotal: rollValue,
    modifiers: presentation?.operative.modifiers ?? (battle?.modifiers ?? []),
    finalValue: finalTotal,
    target: opponentTotal,
    outcome: result ? resultLabel : null
  };
  const primaryAction = useMemo(() => {
    if (choiceActions.length > 0) {
      return { label: "Complete choice above", disabled: true, action: null as (() => void) | null };
    }
    if (pendingRoll) {
      return isAssignedEnemyRoller
        ? {
            label: "Roll for enemy",
            disabled: false,
            action: () => onIntent({ type: "ENEMY_ROLL_REQUESTED", seatId: self.seatId })
          }
        : { label: `Waiting on ${assignedRollerName}`, disabled: true, action: null };
    }
    if (roll && resolution?.stage === "roll_result") {
      const canKeepCurrentResult = optionalActions.some((action) => !action.disabled)
        && patch.requiredAction?.allowedCommand === "continue";
      return canKeepCurrentResult
        ? {
            label: "Keep current result",
            disabled: false,
            action: () => onIntent({ type: "CONTINUE_RESOLUTION", seatId: self.seatId })
          }
        : {
            label: "Applying consequence…",
            disabled: true,
            action: null
          };
    }
    if (roll && resolution && ["outcome_summary", "awaiting_continue"].includes(resolution.stage)) {
      return isActiveSeat
        ? {
            label: "Continue",
            disabled: false,
            action: () => onIntent({ type: "CONTINUE_RESOLUTION", seatId: self.seatId })
          }
        : { label: "Waiting for active operative", disabled: true, action: null };
    }
    if (resolution?.stage === "dice_roll") {
      return {
        label: "Dice rolling…",
        disabled: true,
        action: null
      };
    }
    if (!isActiveSeat) {
      return { label: "Waiting for active operative", disabled: true, action: null };
    }
    if (resolution?.stage === "battle_setup") {
      return {
        label: `Roll ${statLabel}`,
        disabled: false,
        action: () => onIntent({ type: "COMBAT_REQUESTED", seatId: self.seatId, stat })
      };
    }
    return {
      label: "Enter combat",
      disabled: false,
      action: () => onIntent({ type: "COMBAT_REQUESTED", seatId: self.seatId, stat })
    };
  }, [
    assignedRollerName,
    choiceActions.length,
    isActiveSeat,
    isAssignedEnemyRoller,
    onIntent,
    optionalActions,
    pendingRoll,
    patch.requiredAction?.allowedCommand,
    resolution,
    roll,
    self.seatId,
    stat,
    statLabel
  ]);

  const rollUnderReview = resolution?.stage === "roll_result";
  const transientRollResult =
    rollUnderReview
    && choiceActions.length === 0
    && optionalActions.length === 0;

  if (transientRollResult) {
    return (
      <section
        className="phone-battle-shell phone-battle-shell--cinematic phone-battle-shell--resolving"
        data-testid="phone-battle-shell"
        data-battle-identity={identity ?? undefined}
        data-battle-ui="resolution-wait"
        data-battle-stage="roll_result"
        data-battle-restored={restored ? "true" : "false"}
        data-challenge-stat={stat}
        style={challengeThemeStyle}
      >
        <div className="phone-battle-shell__backdrop" aria-hidden="true" />
        <div className="phone-battle-shell__scroll" data-testid="phone-battle-scroll-region">
          <section
            className="phone-battle-resolution-wait"
            data-testid="phone-battle-resolution-wait"
            role="status"
            aria-live="polite"
          >
            <span>Battle · {statLabel}</span>
            <strong>Applying battle consequence</strong>
            <p>The authoritative roll is complete. The final verdict appears after every effect is settled.</p>
            <div className="phone-battle-resolution-wait__signal" aria-hidden="true"><i /><i /><i /></div>
          </section>
        </div>
      </section>
    );
  }

  const preparingRoll = !result && !pendingRoll && !patch.edgeHand?.reaction && resolution?.stage === "battle_setup";
  const loadoutAction = loadoutWindow && loadoutCardCount > 0 ? (
    <button type="button" className="phone-battle-equipment-alert" onClick={() => setContext("loadout")}>
      <span>Adjust loadout</span>
      <strong>{loadoutCardCount} Gear or follower card{loadoutCardCount === 1 ? "" : "s"} available before this {statLabel} roll</strong>
    </button>
  ) : null;
  const edgeReactionInChoices = choiceActions.some((action) => action.key === "edge-reaction-decline");
  const edgeHand = !edgeReactionInChoices && (resolution?.stage === "battle_setup" || patch.edgeHand?.reaction) && patch.edgeHand
    ? <PhoneEdgeCardHand hand={patch.edgeHand} seatId={self.seatId} onIntent={onIntent} />
    : null;

  return (
    <section
      className={`phone-battle-shell phone-battle-shell--cinematic phone-battle-shell--${result ?? "active"}`}
      data-testid="phone-battle-shell"
      data-battle-identity={identity ?? undefined}
      data-battle-ui="duel-aperture"
      data-battle-stage={resolution?.stage ?? "encounter"}
      data-battle-restored={restored ? "true" : "false"}
      data-battle-result={result ? "true" : "false"}
      data-challenge-stat={stat}
      style={challengeThemeStyle}
    >
      <div className="phone-battle-shell__backdrop" aria-hidden="true" />
      <div className="phone-battle-shell__scroll" data-testid="phone-battle-scroll-region">
        {context === "battle" ? (
          <>
            {result && finalTotal !== null ? (
              <section className="phone-battle-result-summary" aria-label="Battle result">
                <h2>{enemyName}</h2>
                <PhoneRollBreakdown
                  label="Operative roll"
                  dice={presentation?.operative.rawDice ?? roll?.dice ?? []}
                  diceTotal={rollValue}
                  fixedValue={rollFixedValue}
                  total={finalTotal}
                  target={opponentTotal}
                  targetLabel={presentation?.test.opposed ? "Enemy total" : "Target"}
                />
                {presentation && presentation.opponent.rawDice.length > 0 && presentation.opponent.finalTotal !== null ? (
                  <PhoneRollBreakdown
                    label="Enemy roll"
                    dice={presentation.opponent.rawDice}
                    diceTotal={presentation.opponent.diceTotal}
                    total={presentation.opponent.finalTotal}
                  />
                ) : null}
              </section>
            ) : null}
            {result ? (
              <section className={`phone-battle-outcome phone-battle-outcome--${result}`} data-testid="phone-battle-outcome">
                <span>{rollUnderReview ? "Roll under review" : result === "success" ? "Threat defeated" : result === "draw" ? "Totals tied" : "Test failed"}</span>
                {rollUnderReview ? null : <BattleConsequences patch={patch} />}
                {outcomeFlavor ? <blockquote>“{outcomeFlavor}”</blockquote> : null}
              </section>
            ) : null}
            <BattleChoiceList actions={choiceActions} />
            {optionalActions.length > 0 ? (
              <section className="phone-battle-shell__choices phone-battle-shell__choices--optional" aria-label="Battle options">
                <span>Battle option</span>
                {optionalActions.map((action) => (
                  <GameButton
                    key={action.key}
                    type="button"
                    tone="secondary"
                    disabled={action.disabled}
                    disabledReason={action.disabled ? action.detail ?? "Unavailable" : undefined}
                    onClick={action.onClick}
                    sublabel={action.detail}
                  >
                    {action.label}
                  </GameButton>
                ))}
              </section>
            ) : null}
            {pendingRoll ? (
              <p className="phone-battle-role">{isAssignedEnemyRoller
                ? `You roll for ${enemyName}.`
                : `${assignedRollerName} rolls for ${enemyName}.`}</p>
            ) : null}
            {preparingRoll ? (
              <section className="phone-battle-prep-summary" aria-label="Battle preparation" data-testid="phone-battle-prep-summary">
                <header>
                  <div>
                    <h2>{enemyName}</h2>
                    <strong>
                      {statLabel} {fixedValue ?? operativeValue}
                      {requiredDiceTotal != null ? ` · Need ${requiredDiceTotal}+ on dice` : " · Opposed roll"}
                    </strong>
                  </div>
                  <button type="button" aria-expanded={supportOpen} onClick={() => setSupportOpen((open) => !open)}>
                    Roll support
                  </button>
                </header>
                {supportOpen ? (
                  <>
                    <div>
                      <span><strong>{relevantItemCount}</strong> usable item{relevantItemCount === 1 ? "" : "s"}</span>
                      <span><strong>{edgeCardCount}</strong> Edge</span>
                      <span><strong>{helperCount}</strong> helper{helperCount === 1 ? "" : "s"}</span>
                      <span><strong>{conditionCount}</strong> condition{conditionCount === 1 ? "" : "s"}</span>
                    </div>
                    {loadoutAction}
                    <CinderWattleAbilityPanel patch={patch} seatId={self.seatId} onIntent={onIntent} />
                    {edgeHand}
                  </>
                ) : null}
              </section>
            ) : null}
            {patch.edgeHand?.reaction ? edgeHand : null}
            <PhoneBattleDuelStage
              operativeId={fighter.id}
              operativeName={fighter.name}
              playerName={playerName}
              enemyArtType={enemyArtType(patch)}
              enemyId={enemyId}
              enemyName={enemyName}
              statLabel={statLabel}
              operativeValue={operativeValue}
              opponentTotal={opponentTotal}
              finalTotal={finalTotal}
              victoryReward={victoryReward}
              failureStakes={failureStakes}
            />
            {!preparingRoll ? (
              <>
                {loadoutAction}
                <CinderWattleAbilityPanel patch={patch} seatId={self.seatId} onIntent={onIntent} />
                {!patch.edgeHand?.reaction ? edgeHand : null}
              </>
            ) : null}
            <button
              type="button"
              className="phone-battle-details-toggle"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? "Hide details" : "View details"}
            </button>
            {detailsOpen ? (
              <section className="phone-battle-details" aria-label="Battle details">
                {roll ? (
                  <AuthoritativeDicePresentation model={operativeDiceModel} compact />
                ) : null}
                <div>
                  <span>Full roll</span>
                  <strong>{detailsFormula ?? "Roll not yet made"}</strong>
                </div>
                <div>
                  <span>Modifier sources</span>
                  <strong>
                    {presentation?.operative.modifiers.length
                      ? presentation.operative.modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ")
                      : battle?.modifiers.length
                        ? battle.modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ")
                        : "No projected modifiers"}
                  </strong>
                </div>
                {resolution?.card?.flavor ?? encounter?.flavor ? (
                  <p>{resolution?.card?.flavor ?? encounter?.flavor}</p>
                ) : null}
                {patch.outcomeSummary?.summary ? <p>{patch.outcomeSummary.summary}</p> : null}
              </section>
            ) : null}
            <div className="phone-battle-shell__action" data-testid="phone-battle-action-dock">
              <GameButton
                type="button"
                tone={result === "defeat" ? "primary" : "battle"}
                disabled={primaryAction.disabled || rollSubmitting}
                disabledReason={primaryAction.disabled ? primaryAction.label : undefined}
                onClick={() => {
                  if (rollSubmitting || !primaryAction.action) return;
                  if (/^Roll\b|^Enter combat\b|^Roll for enemy\b/i.test(primaryAction.label)) setRollSubmitting(true);
                  primaryAction.action();
                }}
              >
                {rollSubmitting ? "Submitting roll…" : primaryAction.label}
              </GameButton>
            </div>
          </>
        ) : (
          <section className="phone-battle-context" aria-label={`${titleCase(context)} battle context`}>
            <button type="button" className="phone-battle-context__back" onClick={() => setContext("battle")}>
              Back to battle
            </button>
            <span>Battle loadout</span>
            <PhoneInventoryPanel patch={patch} onIntent={onIntent} compact loadoutOnly />
          </section>
        )}
      </div>
    </section>
  );
}
