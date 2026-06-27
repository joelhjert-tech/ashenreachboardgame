import type { ReactElement } from "react";

interface CombatDiceAnimationProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue: number | null;
  attackDieFace?: number | null;
  defenseDieFace?: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
  hasModifier?: boolean;
  compact?: boolean;
}

function normalizeDieValue(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 1;
  }

  return Math.min(6, Math.max(1, Math.abs(value) % 6 || 6));
}

function resolveDieFace(explicitFace: number | null | undefined, fallbackValue: number | null): number {
  return normalizeDieValue(explicitFace ?? fallbackValue);
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
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false,
  hasModifier,
  compact = false
}: CombatDiceAnimationProps): ReactElement {
  const attackDie = resolveDieFace(attackDieFace, attackValue);
  const defenseDie = resolveDieFace(defenseDieFace, defenseValue);
  const modifierActive = hasModifier ?? Boolean(modifierValue);
  const modifierDie = resolveDieFace(modifierDieFace, modifierValue);
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
