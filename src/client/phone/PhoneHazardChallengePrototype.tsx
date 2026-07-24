import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { statLabelById } from "../shared/statLabels.js";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../shared/AuthoritativeDicePresentation.js";
import type { ActiveResolution, PhonePatchPayload, ResultDelta, Stat } from "../shared/types.js";
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

export function isHazardChallengePresentation(patch: PhonePatchPayload): boolean {
  const type = patch.activeResolution?.card?.type ?? patch.encounter?.presentationType ?? patch.encounter?.cardType ?? null;
  return Boolean(
    patch.pendingTileChallenge ||
      patch.pendingTileChallengePrivate ||
      ["hazard", "anomaly", "challenge"].includes(type ?? "")
  );
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
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

function encounterKind(patch: PhonePatchPayload, resolution: ActiveResolution | null): "hazard" | "challenge" {
  const type = resolution?.card?.type ?? patch.encounter?.presentationType ?? patch.encounter?.cardType;
  return type === "hazard" && !patch.pendingTileChallenge ? "hazard" : "challenge";
}

function encounterActionLabel(kind: "hazard" | "challenge", action: HazardChallengeAction | null): string {
  if (action) return action.label;
  return kind === "hazard" ? "Face the Hazard" : "Attempt Challenge";
}

function TestCalculation({ stat, value, resolution, difficulty }: {
  stat: Stat;
  value: number;
  resolution: ActiveResolution | null;
  difficulty: number;
}): ReactElement {
  const roll = resolution?.roll;
  const dieTotal = roll ? roll.dice.reduce((sum, die) => sum + die, 0) : null;
  const modifier = roll?.modifierTotal ?? null;
  const modifierOperator = modifier === null || modifier === 0 ? "" : ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`;
  return (
    <section className="phone-test-calculation" aria-label="Test calculation" data-testid={roll ? "phone-roll-result" : undefined}>
      {roll ? (
        <div className="phone-test-calculation__dice sr-only" aria-label={`${statLabelById[stat]} check result`}>
          {roll.dice.map((die, index) => <span key={`${die}-${index}`}>Die{die}</span>)}
          <span>Roll: {roll.dice.join(" + ")}{modifierOperator} = {roll.finalTotal}</span>
          <span>Target: {roll.target}</span>
          <span>{roll.success ? "Success" : "Failure"}</span>
          <span>Total / Target</span><span>{roll.finalTotal} / {roll.target}</span>
        </div>
      ) : null}
      <div><span>{statLabelById[stat]}</span><strong>{value}</strong></div>
      <div><span>Roll</span><strong>{dieTotal ?? "—"}</strong></div>
      <div><span>Modifier</span><strong>{modifier === null ? "—" : signed(modifier)}</strong></div>
      <div><span>Difficulty</span><strong>{difficulty}</strong></div>
      <div className="phone-test-calculation__total">
        <span>Total</span>
        <strong>{roll ? `${roll.finalTotal} : ${roll.target}` : `— : ${difficulty}`}</strong>
      </div>
    </section>
  );
}

function ConsequencePanels({ patch, resolution }: { patch: PhonePatchPayload; resolution: ActiveResolution | null }): ReactElement {
  const result = resolution?.roll ? (resolution.roll.success ? "success" : "failure") : null;
  return (
    <section className="phone-test-consequences" aria-label="Possible consequences">
      <article className={result === "success" ? "is-current" : undefined}>
        <span>Success</span>
        <p>{consequenceCopy(patch, resolution, true)}</p>
      </article>
      <article className={result === "failure" ? "is-current" : undefined}>
        <span>Failure</span>
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const kind = encounterKind(patch, resolution);
  const title = resolution?.card?.title ?? patch.encounter?.title ?? "Unknown encounter";
  const flavor = resolution?.card?.flavor ?? patch.encounter?.flavor ?? "The Reach offers no safe passage.";
  const stat = resolution?.battle?.stat ?? patch.encounter?.stat ?? patch.pendingTileChallenge?.testStat ?? "grit";
  const difficulty = resolution?.battle?.difficulty ?? patch.encounter?.difficulty ?? patch.pendingTileChallenge?.difficulty ?? 0;
  const skillValue = self.character.stats[stat] ?? 0;
  const playerName = patch.seats.find((seat) => seat.seatId === self.seatId)?.displayName ?? self.character.name;
  const promptAction = actions.find((action) => !action.disabled) ?? actions[0] ?? null;
  const primary: HazardChallengeAction | null = promptAction ?? (canContinue
    ? { key: "continue", label: "Continue", disabled: false, onClick: onContinue }
    : null);
  const result = resolution?.roll ? (resolution.roll.success ? "success" : "failure") : null;
  const actionLabel = primary?.label ?? (result === "success" ? "Success" : result === "failure" ? "Failure" : encounterActionLabel(kind, primary));
  const diceModel: AuthoritativeDiceModel = {
    id: resolution?.id ?? `test:${self.seatId}:${title}`,
    revision: patch.battlePresentation?.revision ?? 0,
    stage: submitted && !resolution?.roll ? "submitting" : resolution?.stage === "dice_roll" ? "rolling" : resolution?.roll ? "result" : "ready",
    context: kind === "hazard" ? "event" : "test",
    actorName: playerName,
    purpose: `${title} · ${statLabelById[stat]} test`,
    dice: buildDice(resolution?.roll?.dice ?? [], Array.from({ length: resolution?.roll?.dice.length ?? 1 }, (_, index) => `Test die ${index + 1}`)),
    rawTotal: resolution?.roll?.baseTotal ?? null,
    modifiers: resolution?.battle?.modifiers ?? [],
    finalValue: resolution?.roll?.finalTotal ?? null,
    target: difficulty,
    outcome: result
  };

  useEffect(() => {
    setSubmitted(false);
    setDetailsOpen(false);
  }, [resolution?.id, resolution?.stage, patch.pendingEncounterDecisionPrivate?.decisionId]);

  const visibleDeltas = useMemo(
    () => resultDeltas.filter((delta) => delta.visibility !== "hidden").slice(0, 4),
    [resultDeltas]
  );

  const encounterArt = (
    <div className="phone-encounter-art" data-testid="phone-encounter-art">
      <CardArtImage data-testid="phone-battle-subject-art" cardType={artTypeFor(resolution)} cardId={resolution?.card?.id ?? patch.encounter?.id ?? ""} alt={title} />
      <div className="phone-encounter-art__identity">
        <span>{kind}</span>
        <strong>{title}</strong>
      </div>
    </div>
  );

  return (
    <section
      className={`phone-test-prototype phone-test-prototype--cinematic phone-test-prototype--${kind} phone-battle-panel`}
      data-testid="phone-action-active-panel"
      data-hazard-challenge-layout="cinematic"
      data-test-result={result ? "true" : "false"}
    >
      <div className="phone-test-prototype__scene" aria-hidden="true" />
      <div className="phone-test-prototype__scroll" data-testid="phone-battle-panel">
        <header className="phone-test-player-header">
          <span>{kind}</span>
          <strong data-testid="phone-battle-subject-details">{statLabelById[stat]} test · Target {difficulty}</strong>
        </header>

        <article data-testid="phone-battle-subject-card">
          {encounterArt}
          <p className="phone-test-prototype__lore">{flavor}</p>
        </article>
        <AuthoritativeDicePresentation model={diceModel} compact />
        {!result ? <TestCalculation stat={stat} value={skillValue} resolution={resolution} difficulty={difficulty} /> : null}
        {!result && resolution?.battle?.modifiers.length ? (
          <div className="phone-test-modifiers" aria-label="Applied modifiers">
            {resolution.battle.modifiers.map((entry, index) => (
              <span key={`${entry.label}-${index}`}>{entry.label} {signed(entry.value)}</span>
            ))}
          </div>
        ) : null}
        {patch.pendingTileChallengePrivate ? (
          <p className="phone-test-challenge-progress">
            {patch.pendingTileChallengePrivate.challengeType === "anomaly" ? "Recurring anomaly challenge" : "Tile challenge"} {patch.pendingTileChallengePrivate.authoredOrder + 1} of {patch.pendingTileChallengePrivate.totalChallenges}
          </p>
        ) : null}
        <ConsequencePanels patch={patch} resolution={resolution} />

        {resolution?.outcome ? (
          <section className="phone-test-outcome" data-testid="phone-resolution-card">
            <strong>{resolution.outcome.title}</strong>
            <p>{resolution.outcome.text}</p>
            {resolution.outcome.effects.filter((effect) => effect.trim().toLowerCase() !== resolution.outcome!.text.trim().toLowerCase()).map((effect) => (
              <p key={effect}>{effect}</p>
            ))}
          </section>
        ) : null}

        {visibleDeltas.length > 0 ? (
          <section className="phone-test-result-deltas" aria-label="Applied effects">
            {visibleDeltas.map((delta) => <p key={delta.id}><strong>{delta.label}</strong><span>{delta.privateText ?? delta.publicText}</span></p>)}
          </section>
        ) : null}

        {actions.length > 1 ? (
          <section className="phone-test-prompt-options" aria-label="Encounter choices">
            <span>Required choice</span>
            {actions.slice(1).map((action) => (
              <GameButton key={action.key} tone="secondary" disabled={action.disabled} disabledReason={action.detail} onClick={() => action.onClick()}>
                {action.label}
              </GameButton>
            ))}
          </section>
        ) : null}

        <button className="phone-test-details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
          {detailsOpen ? "Hide details" : "View details"}
        </button>
        <section className="phone-test-details" aria-label="Encounter details" hidden={!detailsOpen}>
            <p>{flavor}</p>
            {result ? <TestCalculation stat={stat} value={skillValue} resolution={resolution} difficulty={difficulty} /> : null}
            <dl>
              <div><dt>Source</dt><dd>{titleCase(resolution?.source ?? "encounter")}</dd></div>
              <div><dt>Test</dt><dd>{statLabelById[stat]} against {difficulty}</dd></div>
              <div><dt>Modifiers</dt><dd>{resolution?.battle?.modifiers.length ? resolution.battle.modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ") : "None projected"}</dd></div>
            </dl>
        </section>
        {supplemental}
      </div>

      <div className="phone-test-prototype__action" data-testid="phone-test-primary-action">
        <GameButton
          data-testid={primary?.key === "continue" || canContinue && !promptAction ? "phone-resolution-continue" : undefined}
          tone={kind === "hazard" ? "primary" : "battle"}
          disabled={!primary || primary.disabled || submitted}
          disabledReason={submitted ? "Waiting for server" : primary?.detail ?? "No action is currently available"}
          onClick={() => {
            if (!primary || primary.disabled || submitted) return;
            setSubmitted(true);
            primary.onClick();
          }}
        >
          {submitted ? "Waiting for server" : actionLabel}
        </GameButton>
      </div>
    </section>
  );
}
