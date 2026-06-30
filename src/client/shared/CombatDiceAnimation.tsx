import type { ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import type { Stat } from "./types.js";

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
  challengeStat?: Stat;
}

function resolveDieFace(explicitFace: number | null | undefined): number | null {
  return typeof explicitFace === "number" && Number.isInteger(explicitFace) && explicitFace >= 1 && explicitFace <= 6
    ? explicitFace
    : null;
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
  value: number | null;
  success: boolean;
}): ReactElement {
  return (
    <div className={`combat-die-layer combat-die-${layer}${success ? " combat-die-success" : ""}`} data-testid={`combat-die-${layer}`}>
      <span className="combat-die-label">{layer}</span>
      <strong>{value ?? "-"}</strong>
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
  compact = false,
  challengeStat = "grit"
}: CombatDiceAnimationProps): ReactElement {
  const attackDie = resolveDieFace(attackDieFace);
  const defenseDie = resolveDieFace(defenseDieFace);
  const modifierActive = hasModifier ?? Boolean(modifierValue);
  const modifierDie = resolveDieFace(modifierDieFace);
  const tokenClass = attackSuccess ? "combat-result-token-attack" : defenseSuccess ? "combat-result-token-defense" : "combat-result-token-mod";

  return (
    <div
      className={`combat-dice-animation combat-dice-animation-${challengeStat}${compact ? " combat-dice-animation-compact" : ""}`}
      style={getChallengeThemeStyle(challengeStat)}
      data-testid="combat-dice-animation"
      aria-label={`${challengeStat} dice animation`}
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
