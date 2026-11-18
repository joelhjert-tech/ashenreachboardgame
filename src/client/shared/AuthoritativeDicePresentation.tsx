import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { useReducedMotion } from "./useReducedMotion.js";

export type DicePresentationStage = "ready" | "submitting" | "rolling" | "result" | "reaction" | "complete";

export interface PresentedDie {
  index: number;
  sides: number;
  value: number | null;
  role: string;
  previousValue?: number | null;
  wasRerolled?: boolean;
}

export interface AuthoritativeDiceModel {
  id: string;
  revision: number;
  stage: DicePresentationStage;
  context: "movement" | "battle" | "event" | "test" | "ability";
  actorName: string;
  purpose: string;
  dice: PresentedDie[];
  rawTotal: number | null;
  modifiers: Array<{ label: string; value: number }>;
  finalValue: number | null;
  target?: number | null;
  outcome?: string | null;
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;
}

function resultSignature(model: AuthoritativeDiceModel): string | null {
  if (!model.dice.some((die) => die.value !== null)) return null;
  // Presentation follows the dice receipt, not unrelated server revisions or
  // modifier updates. Those must not extend an in-flight animation.
  return `${model.id}:${model.dice.map((die) => die.value ?? "-").join(",")}`;
}

export function AuthoritativeDicePresentation({
  model,
  size = "phone",
  compact = false,
  diceOnly = false,
  animateOnMount = false,
  className = ""
}: {
  model: AuthoritativeDiceModel;
  size?: "phone" | "host";
  compact?: boolean;
  /** Omits headings and calculation details for the compact phone roll surface. */
  diceOnly?: boolean;
  /** Use only for a newly received authoritative result; restored results must leave this false. */
  animateOnMount?: boolean;
  className?: string;
}): ReactElement {
  const reducedMotion = useReducedMotion();
  const signature = resultSignature(model);
  const prior = useRef<{ id: string; signature: string | null }>({ id: model.id, signature });
  const [animating, setAnimating] = useState(Boolean(animateOnMount && signature));

  useEffect(() => {
    const previous = prior.current;
    const isLiveReceipt = previous.id === model.id && previous.signature === null && signature !== null;
    prior.current = { id: model.id, signature };
    if (reducedMotion) {
      setAnimating(false);
      return;
    }
    if (!isLiveReceipt && !animating) return;
    setAnimating(true);
    const timer = window.setTimeout(() => setAnimating(false), 980);
    return () => window.clearTimeout(timer);
  }, [animating, model.id, reducedMotion, signature]);

  const resultText = signature
    ? `${model.purpose}. ${model.dice.map((die) => `${die.role} ${die.value}`).join(", ")}. ${model.rawTotal !== null ? `Raw total ${model.rawTotal}. ` : ""}${model.finalValue !== null ? `Final value ${model.finalValue}.` : ""}`
    : "";

  return (
    <section
      className={`authoritative-dice authoritative-dice--${size}${compact ? " authoritative-dice--compact" : ""}${diceOnly ? " authoritative-dice--dice-only" : ""}${animating ? " is-animating" : " is-settled"}${reducedMotion ? " is-reduced-motion" : ""} ${className}`.trim()}
      data-testid="authoritative-dice-presentation"
      data-context={model.context}
      data-stage={model.stage}
      data-result-revision={model.revision}
      data-restored={signature && !animating ? "true" : "false"}
      aria-label={`${model.purpose} dice`}
    >
      {!diceOnly ? (
        <header className="authoritative-dice__header">
          <span>{model.stage === "ready" ? "Roll ready" : model.stage === "submitting" || model.stage === "rolling" ? "Rolling" : size === "host" && compact ? "Result" : "Authoritative result"}</span>
          <strong>{model.purpose}</strong>
          <small>{model.actorName} · {model.dice.length}d{model.dice[0]?.sides ?? 6}</small>
        </header>
      ) : null}
      <div className="authoritative-dice__tray" aria-label={`${model.dice.length} dice`}>
        {model.dice.map((die) => (
          <div
            key={`${die.index}:${die.role}`}
            className={`authoritative-die${die.wasRerolled ? " was-rerolled" : ""}`}
            style={{ "--die-index": die.index } as CSSProperties}
            data-die-value={die.value ?? "pending"}
            aria-label={`${die.role}: ${die.value === null ? "pending" : die.value}${die.wasRerolled && die.previousValue ? `, rerolled from ${die.previousValue}` : ""}`}
          >
            <span className="authoritative-die__face" aria-hidden="true">{die.value ?? "·"}</span>
            <small>{die.role}</small>
            {die.wasRerolled && die.previousValue !== null && die.previousValue !== undefined ? (
              <em>{die.previousValue} → {die.value} · Rerolled</em>
            ) : null}
          </div>
        ))}
      </div>
      {!diceOnly && signature ? (
        <div className="authoritative-dice__math" aria-label="Dice calculation">
          {model.rawTotal !== null ? <span>Raw roll <strong>{model.rawTotal}</strong></span> : null}
          {model.modifiers.map((modifier, index) => (
            <span key={`${modifier.label}:${modifier.value}:${index}`}>{modifier.label} <strong>{signed(modifier.value)}</strong></span>
          ))}
          {model.finalValue !== null ? <span className="is-final">Final <strong>{model.finalValue}</strong></span> : null}
          {model.target !== null && model.target !== undefined ? <span>Target <strong>{model.target}</strong></span> : null}
          {model.outcome ? <span className="is-outcome">{model.outcome}</span> : null}
        </div>
      ) : !diceOnly ? (
        <p className="authoritative-dice__pending">Roll - · {model.stage === "ready" ? "Result appears after the server accepts the roll." : "Awaiting the authoritative result…"}</p>
      ) : null}
      {!diceOnly && resultText ? <p className="sr-only" role="status" aria-live="polite">{resultText}</p> : null}
    </section>
  );
}

export function buildDice(
  values: number[],
  roles?: string[],
  previousValues?: number[]
): PresentedDie[] {
  const count = Math.max(values.length, roles?.length ?? 0, 1);
  return Array.from({ length: count }, (_, index) => ({
    index,
    sides: 6,
    value: values[index] ?? null,
    role: roles?.[index] ?? `Die ${index + 1}`,
    previousValue: previousValues?.[index] ?? null,
    wasRerolled: previousValues ? previousValues[index] !== values[index] : false
  }));
}
