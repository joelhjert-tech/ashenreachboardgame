import type { ReactElement } from "react";

interface CombatDiceAnimationProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
  hasModifier?: boolean;
  compact?: boolean;
}

function normalizeDieValue(value: number | null): number {
  if (value === null || Number.isNaN(value)) {
    return 1;
  }

  return Math.min(6, Math.max(1, Math.abs(value) % 6 || 6));
}

function formatModifier(value: number | null): string {
  if (!value) {
    return "+0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function AnimatedDie({
  layer,
  value,
  success
}: {
  layer: "attack" | "defense" | "modifier";
  value: number;
  success: boolean;
}): ReactElement {
  return (
    <div className={`combat-die-layer combat-die-${layer}${success ? " combat-die-success" : ""}`} data-testid={`combat-die-${layer}`}>
      <span className="combat-die-label">{layer}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CombatDiceAnimation({
  attackValue,
  defenseValue,
  modifierValue,
  attackSuccess = false,
  defenseSuccess = false,
  hasModifier,
  compact = false
}: CombatDiceAnimationProps): ReactElement {
  const attackDie = normalizeDieValue(attackValue);
  const defenseDie = normalizeDieValue(defenseValue);
  const modifierActive = hasModifier ?? Boolean(modifierValue);
  const modifierDie = normalizeDieValue(modifierValue);
  const tokenClass = attackSuccess ? "combat-result-token-attack" : defenseSuccess ? "combat-result-token-defense" : "combat-result-token-mod";

  return (
    <div
      className={`combat-dice-animation${compact ? " combat-dice-animation-compact" : ""}`}
      data-testid="combat-dice-animation"
      aria-label="Combat dice animation"
    >
      <div className="combat-dice-stage">
        <AnimatedDie layer="attack" value={attackDie} success={attackSuccess} />
        <AnimatedDie layer="defense" value={defenseDie} success={defenseSuccess} />
        <AnimatedDie layer="modifier" value={modifierDie} success={modifierActive} />
      </div>
      <div className={`combat-result-token ${tokenClass}`} data-testid="combat-result-token">
        <span aria-hidden="true">{attackSuccess ? "A" : defenseSuccess ? "D" : "*"}</span>
        <strong>
          A {attackValue ?? "-"} / D {defenseValue ?? "-"} / {formatModifier(modifierValue)}
        </strong>
      </div>
    </div>
  );
}
