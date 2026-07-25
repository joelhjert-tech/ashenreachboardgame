import { useEffect, useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../shared/AuthoritativeDicePresentation.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { OperativePortraitImage } from "../shared/OperativePortraitImage.js";
import { getSignalTheatreResultCrestPath, getSignalTheatreStatSealPath } from "../shared/assetPaths.js";
import { statLabelById } from "../shared/statLabels.js";
import type { ActiveResolution, PhonePatchPayload, ResultDelta, Stat } from "../shared/types.js";
import { useAuthoritativeResultCollapse } from "../shared/useAuthoritativeResultCollapse.js";
import { PhoneResultReadyGate } from "./PhoneResultReadyGate.js";
import "./PhoneHazardChallengePrototype.css";

export interface HazardChallengeAction {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface PhoneHazardChallengePrototypeProps {
  patch: PhonePatchPayload;
  resolution: ActiveResolution | null;
  actions: HazardChallengeAction[];
  canContinue: boolean;
  onContinue: () => void;
  resultDeltas: ResultDelta[];
  supplemental?: ReactNode;
}

type TrialKind = "hazard" | "anomaly" | "challenge";

export function isHazardChallengePresentation(patch: PhonePatchPayload): boolean {
  if (patch.battlePresentation?.test.opposed) return false;
  const type =
    patch.battlePresentation?.encounter.category.toLowerCase()
    ?? patch.activeResolution?.card?.type
    ?? patch.encounter?.presentationType
    ?? patch.encounter?.cardType
    ?? null;
  return Boolean(
    patch.pendingTileChallenge
      || patch.pendingTileChallengePrivate
      || ["hazard", "anomaly", "challenge"].includes(type ?? "")
  );
}

export function isPhoneChallengeRelevantToSeat(
  patch: PhonePatchPayload | null | undefined,
  seatId: string
): boolean {
  if (!patch || !isHazardChallengePresentation(patch)) return false;
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  return (
    patch.activeResolution?.playerId === seatId
    || patch.battlePresentation?.actorSeatId === seatId
    || patch.pendingTileChallengePrivate?.seatId === seatId
    || patch.pendingTileChallenge?.seatId === seatId
    || activeSeatId === seatId
  );
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

function normalizeCopy(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
}

function artTypeFor(resolution: ActiveResolution | null): CardImageType {
  const artType = resolution?.card?.artType;
  if (artType === "anomaly" || artType === "artifact" || artType === "contract" || artType === "escalation" || artType === "threat") {
    return artType;
  }
  return "threat";
}

function effectSummary(effects: string[]): string {
  return effects.filter(Boolean).join(" ");
}

function trialKind(patch: PhonePatchPayload, resolution: ActiveResolution | null): TrialKind {
  const category = patch.battlePresentation?.encounter.category.toLowerCase();
  const pendingType = patch.pendingTileChallengePrivate?.challengeType ?? patch.pendingTileChallenge?.challengeType;
  const type = category ?? pendingType ?? resolution?.card?.type ?? patch.encounter?.presentationType ?? patch.encounter?.cardType;
  if (type === "hazard") return "hazard";
  if (type === "anomaly") return "anomaly";
  return "challenge";
}

function trialIdentity(patch: PhonePatchPayload, resolution: ActiveResolution | null, title: string): string {
  const pending = patch.pendingTileChallengePrivate ?? patch.pendingTileChallenge;
  return patch.battlePresentation?.id
    ?? resolution?.id
    ?? `trial:${pending?.challengeId ?? patch.encounter?.id ?? title}:${patch.self?.seatId ?? "seat"}`;
}

function wasPhoneTrialSeen(id: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(`ashenreach:phone-trial-seen:${id}`) === "1";
}

function consequenceCopy(
  patch: PhonePatchPayload,
  resolution: ActiveResolution | null,
  success: boolean
): string {
  const pending = patch.pendingTileChallengePrivate ?? patch.pendingTileChallenge ?? null;
  const challenge = pending
    ? patch.sectors.flatMap((sector) => sector.tileChallenges ?? []).find((entry) => entry.id === pending.challengeId)
    : null;
  const currentResultMatches = resolution?.roll?.success === success;

  if (currentResultMatches) {
    const structured = effectSummary(resolution?.outcome?.effects ?? []);
    if (structured) return structured;
    if (resolution?.outcome?.text) return resolution.outcome.text;
  }

  if (challenge) return success ? challenge.successSummary : challenge.failureSummary;
  return success
    ? "The server reveals and applies the authored success effect after the test."
    : "The server reveals and applies the authored failure effect after the test.";
}

function defaultActionLabel(kind: TrialKind): string {
  if (kind === "hazard") return "Face the Hazard";
  if (kind === "anomaly") return "Attempt Anomaly";
  return "Attempt Challenge";
}

function TrialStakes({
  patch,
  resolution
}: {
  patch: PhonePatchPayload;
  resolution: ActiveResolution | null;
}): ReactElement {
  return (
    <section className="phone-trial-stakes" aria-label="Possible outcomes">
      <article>
        <span>On success</span>
        <p>{consequenceCopy(patch, resolution, true)}</p>
      </article>
      <article>
        <span>On failure</span>
        <p>{consequenceCopy(patch, resolution, false)}</p>
      </article>
    </section>
  );
}

export function PhoneHazardChallengeView({
  patch,
  resolution,
  actions,
  canContinue,
  onContinue,
  resultDeltas,
  supplemental
}: PhoneHazardChallengePrototypeProps): ReactElement {
  const self = patch.self!;
  const presentation = patch.battlePresentation ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const kind = trialKind(patch, resolution);
  const categoryLabel = titleCase(kind);
  const title = presentation?.encounter.name ?? resolution?.card?.title ?? patch.encounter?.title ?? "Unknown encounter";
  const flavor = presentation?.encounter.publicSummary ?? resolution?.card?.flavor ?? patch.encounter?.flavor ?? "The Reach offers no safe passage.";
  const stat = presentation?.test.stat ?? resolution?.battle?.stat ?? patch.encounter?.stat ?? patch.pendingTileChallenge?.testStat ?? "grit";
  const statLabel = statLabelById[stat];
  const difficulty =
    presentation?.opponent.finalTotal
    ?? presentation?.opponent.baseValue
    ?? resolution?.roll?.target
    ?? resolution?.battle?.difficulty
    ?? patch.encounter?.difficulty
    ?? patch.pendingTileChallenge?.difficulty
    ?? 0;
  const playerName =
    presentation?.operative.name
    ?? patch.seats.find((seat) => seat.seatId === self.seatId)?.displayName
    ?? self.character.name;
  const operativeBase = presentation?.operative.baseValue ?? self.character.stats[stat] ?? 0;
  const roll = resolution?.roll ?? null;
  const rollDice = presentation?.operative.rawDice ?? roll?.dice ?? [];
  const rollTotal = presentation?.operative.diceTotal ?? (roll ? roll.dice.reduce((sum, die) => sum + die, 0) : null);
  const modifiers = presentation?.operative.modifiers ?? resolution?.battle?.modifiers ?? [];
  const modifierTotal = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  const finalTotal = presentation?.operative.finalTotal ?? roll?.finalTotal ?? null;
  const result =
    presentation?.outcome === "success"
      ? "success"
      : presentation?.outcome === "failure"
        ? "failure"
        : roll
          ? roll.success ? "success" : "failure"
          : null;
  const outcome = resolution?.outcome ?? null;
  const resultLabel =
    result === "success"
      ? "Success"
      : result === "failure"
        ? "Failure"
        : outcome?.title ?? "Awaiting test";
  const visibleOutcomeEffects = (outcome?.effects ?? []).filter(
    (effect) => normalizeCopy(effect) !== normalizeCopy(outcome?.text ?? "")
  );
  const identity = trialIdentity(patch, resolution, title);
  const [restored, setRestored] = useState(() => wasPhoneTrialSeen(identity));
  const promptAction = actions.find((action) => !action.disabled) ?? actions[0] ?? null;
  const primary: HazardChallengeAction | null = promptAction ?? (canContinue
    ? { key: "continue", label: "Continue", disabled: false, onClick: onContinue }
    : null);
  const secondaryActions = actions.filter((action) => action.key !== primary?.key);
  const actionLabel = primary?.label ?? (result ? resultLabel : defaultActionLabel(kind));
  const resultCrest = result ? getSignalTheatreResultCrestPath(result === "success" ? "success" : "defeat") : null;
  const diceModel: AuthoritativeDiceModel = {
    id: identity,
    revision: presentation?.revision ?? 0,
    stage: submitted && finalTotal === null
      ? "submitting"
      : resolution?.stage === "dice_roll"
        ? "rolling"
        : finalTotal !== null
          ? "result"
          : "ready",
    context: "test",
    actorName: playerName,
    purpose: `${title} · ${statLabel} test`,
    dice: buildDice(
      rollDice,
      Array.from({ length: presentation?.operative.diceCount ?? (rollDice.length || 1) }, (_, index) => `Test die ${index + 1}`),
      presentation?.operative.previousRawDice
    ),
    rawTotal: rollTotal,
    modifiers,
    finalValue: finalTotal,
    target: difficulty,
    outcome: result
  };
  const diceResultKey = finalTotal !== null
    ? `${identity}:${presentation?.revision ?? 0}:${rollDice.join(",")}:${finalTotal}`
    : null;
  const diceDisclosure = useAuthoritativeResultCollapse(
    diceResultKey,
    100,
    `trial:${self.seatId}:${identity}`
  );

  useEffect(() => {
    setSubmitted(false);
    setDetailsOpen(false);
    const alreadySeen = wasPhoneTrialSeen(identity);
    setRestored(alreadySeen);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`ashenreach:phone-trial-seen:${identity}`, "1");
    }
  }, [identity]);

  useEffect(() => {
    if (finalTotal !== null || resolution?.stage === "dice_roll") setSubmitted(false);
  }, [finalTotal, resolution?.stage]);

  const visibleDeltas = useMemo(
    () => resultDeltas.filter((delta) => delta.visibility !== "hidden").slice(0, 4),
    [resultDeltas]
  );
  const resultReady =
    Boolean(outcome)
    && canContinue
    && (resolution?.stage === "outcome_summary" || resolution?.stage === "awaiting_continue");
  const fullFormula = finalTotal === null
    ? "Test not yet rolled"
    : `${operativeBase} + ${rollTotal ?? 0} ${modifierTotal >= 0 ? "+" : "−"} ${Math.abs(modifierTotal)} = ${finalTotal}`;

  if (resultReady) {
    return (
      <section
        className={`phone-trial-shell phone-trial-shell--${kind} phone-trial-shell--result-gate`}
        style={getChallengeThemeStyle(stat) as CSSProperties}
        aria-label={`${categoryLabel} result: ${title}`}
        data-testid="phone-action-active-panel"
        data-hazard-challenge-layout="result-gate"
        data-trial-result="true"
        data-test-result="true"
        data-trial-restored={restored ? "true" : "false"}
      >
        <div className="phone-trial-shell__scroll">
          <PhoneResultReadyGate
            actorName={patch.seats.find((seat) => seat.seatId === self.seatId)?.displayName ?? playerName}
            operativeName={self.character.name}
            operativeId={self.character.id}
            sourceLabel={categoryLabel}
            challengeTitle={title}
            challengeArtType={artTypeFor(resolution)}
            challengeArtId={resolution?.card?.id ?? patch.encounter?.id ?? ""}
            challengeFlavor={flavor}
            success={result === "success" ? true : result === "failure" ? false : null}
            playerTotal={finalTotal}
            targetTotal={difficulty}
            outcomeTitle={outcome?.title ?? resultLabel}
            outcomeText={outcome?.text ?? consequenceCopy(patch, resolution, result === "success")}
            outcomeEffects={visibleOutcomeEffects}
            canContinue={canContinue}
            onContinue={onContinue}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`phone-trial-shell phone-trial-shell--${kind} phone-trial-shell--${result ?? "active"}`}
      style={getChallengeThemeStyle(stat) as CSSProperties}
      aria-label={`${categoryLabel} trial: ${title}`}
      data-testid="phone-action-active-panel"
      data-hazard-challenge-layout="trial-theatre"
      data-trial-result={result ? "true" : "false"}
      data-test-result={result || outcome ? "true" : "false"}
      data-trial-restored={restored ? "true" : "false"}
    >
      <div className="phone-trial-shell__backdrop" aria-hidden="true" />
      <div className="phone-trial-shell__scroll" data-testid="phone-battle-panel">
        <header className="phone-trial-state" aria-live="polite">
          <span>{categoryLabel} trial</span>
          <strong>{resultLabel}</strong>
          <small className="sr-only" data-testid="phone-battle-subject-details">{statLabel} test · Target {difficulty}</small>
        </header>

        <section
          className="phone-trial-arena"
          aria-label={`${self.character.name} faces ${categoryLabel} ${title}`}
          data-testid="phone-trial-cinematic-stage"
        >
          <article className="phone-trial-combatant phone-trial-combatant--operative">
            <div className="phone-trial-combatant__art">
              <OperativePortraitImage characterId={self.character.id} alt={self.character.name} priority />
            </div>
            <div className="phone-trial-combatant__identity">
              <span>Operative</span>
              <strong>{self.character.name}</strong>
              <small>{playerName}</small>
            </div>
          </article>

          <div className="phone-trial-rift" aria-hidden="true">
            <img src={getSignalTheatreStatSealPath(stat)} width={512} height={512} alt="" />
            <span>{statLabel}</span>
          </div>

          <article className="phone-trial-combatant phone-trial-combatant--challenge" data-testid="phone-battle-subject-card">
            <div className="phone-trial-combatant__art phone-encounter-art" data-testid="phone-encounter-art">
              <CardArtImage
                data-testid="phone-battle-subject-art"
                cardType={artTypeFor(resolution)}
                cardId={resolution?.card?.id ?? patch.encounter?.id ?? ""}
                alt={`${title} ${kind} artwork`}
              />
            </div>
            <div className="phone-trial-combatant__identity">
              <span>{categoryLabel}</span>
              <strong>{title}</strong>
            </div>
            <p className="sr-only">{flavor}</p>
          </article>
        </section>

        <section className="phone-trial-totals" aria-label="Challenge totals" data-testid="phone-trial-total-comparison">
          <div>
            <span>Your total</span>
            <strong>{finalTotal ?? "—"}</strong>
          </div>
          <i aria-hidden="true">Against</i>
          <div>
            <span>{categoryLabel} total</span>
            <strong>{difficulty}</strong>
          </div>
        </section>
        {roll ? (
          <section className="sr-only" data-testid="phone-roll-result">
            <div aria-label={`${statLabel} check result`}>
              {roll.dice.map((die, index) => <span key={`${die}-${index}`}>Die{die}</span>)}
            </div>
            <span>Roll: {roll.dice.join(" + ")} {roll.modifierTotal >= 0 ? "+" : "-"} {Math.abs(roll.modifierTotal)} = {roll.finalTotal}</span>
            <span>Target: {roll.target}</span>
            <span>{roll.success ? "Success" : "Failure"}</span>
            <span>Total / Target{roll.finalTotal} / {roll.target}</span>
          </section>
        ) : null}

        <div className={`phone-auto-collapse-dice${diceDisclosure.collapsed ? " is-collapsed" : ""}`} data-testid="phone-trial-dice-disclosure">
          <button
            type="button"
            className="phone-auto-collapse-dice__summary"
            aria-expanded={!diceDisclosure.collapsed}
            onClick={diceDisclosure.collapsed ? diceDisclosure.expand : diceDisclosure.collapse}
          >
            <span>{diceDisclosure.collapsed ? "Dice result" : "Dice details"}</span>
            <strong>{finalTotal === null ? "Pending" : `${finalTotal} vs ${difficulty}`}</strong>
          </button>
          <AuthoritativeDicePresentation model={diceModel} compact />
        </div>

        {!result ? <TrialStakes patch={patch} resolution={resolution} /> : null}

        {result || outcome ? (
          <section className={`phone-trial-outcome phone-trial-outcome--${result ?? "neutral"}`} data-testid="phone-resolution-card">
            {resultCrest ? <img src={resultCrest} width={640} height={640} alt="" /> : null}
            <div>
              <span>Authoritative result</span>
              <strong>{outcome?.title ?? resultLabel}</strong>
              <p>{outcome?.text ?? consequenceCopy(patch, resolution, result === "success")}</p>
              {visibleOutcomeEffects.map((effect) => <p key={effect}>{effect}</p>)}
            </div>
          </section>
        ) : null}

        {visibleDeltas.length > 0 ? (
          <section className="phone-trial-deltas" aria-label="Applied effects">
            {visibleDeltas.map((delta) => (
              <p key={delta.id}>
                <strong>{delta.label}</strong>
                <span>{delta.privateText ?? delta.publicText}</span>
              </p>
            ))}
          </section>
        ) : null}

        {secondaryActions.length > 0 ? (
          <section className="phone-trial-choices" aria-label="Encounter choices">
            <span>Resolve before continuing</span>
            {secondaryActions.map((action) => (
              <GameButton
                key={action.key}
                tone="secondary"
                disabled={action.disabled}
                disabledReason={action.detail}
                onClick={action.onClick}
                sublabel={action.detail}
              >
                {action.label}
              </GameButton>
            ))}
          </section>
        ) : null}

        {patch.pendingTileChallengePrivate ? (
          <p className="phone-trial-progress">
            {categoryLabel} {patch.pendingTileChallengePrivate.authoredOrder + 1} of {patch.pendingTileChallengePrivate.totalChallenges}
            {" · "}Recurring sector challenge
          </p>
        ) : null}

        {supplemental}

        <button
          className="phone-trial-details-toggle"
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "View details"}
        </button>
        {detailsOpen ? (
          <section className="phone-trial-details" aria-label="Encounter details">
            <p>{flavor}</p>
            <dl>
              <div><dt>Source</dt><dd>{titleCase(resolution?.source ?? "encounter")}</dd></div>
              <div><dt>Test</dt><dd>{statLabel} against {difficulty}</dd></div>
              <div><dt>Full roll</dt><dd>{fullFormula}</dd></div>
              <div>
                <dt>Modifiers</dt>
                <dd>{modifiers.length ? modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ") : "None projected"}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>

      <div className="phone-trial-shell__action" data-testid="phone-test-primary-action">
        <GameButton
          data-testid={primary?.key === "continue" || canContinue && !promptAction ? "phone-resolution-continue" : undefined}
          tone={result === "failure" ? "primary" : "battle"}
          disabled={!primary || primary.disabled || submitted}
          disabledReason={submitted ? "Waiting for server" : primary?.detail ?? "No action is currently available"}
          onClick={() => {
            if (!primary || primary.disabled || submitted) return;
            setSubmitted(true);
            primary.onClick();
          }}
          sublabel={primary?.detail}
        >
          {submitted ? "Waiting for server…" : actionLabel}
        </GameButton>
      </div>
    </section>
  );
}
