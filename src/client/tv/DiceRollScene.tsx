import type { ReactElement } from "react";
import { CombatDiceAnimation } from "../shared/CombatDiceAnimation.js";
import type { Stat } from "../shared/types.js";

export interface DiceRollSceneProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue?: number | null;
  attackDieFace?: number | null;
  defenseDieFace?: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
  showModifierDie?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
  challengeStat?: Stat;
}

export function DiceRollScene({
  attackValue,
  defenseValue,
  modifierValue = null,
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false,
  showModifierDie = true,
  compact = false,
  className = "",
  testId = "host-dice-roll-scene",
  challengeStat = "grit"
}: DiceRollSceneProps): ReactElement {
  const rootClass = [
    "dice-roll-scene",
    `dice-roll-scene-${challengeStat}`,
    compact ? "dice-roll-scene-compact" : "",
    "dice-roll-scene-dom",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} data-testid={testId} data-fallback="dom-animation">
      <CombatDiceAnimation
        attackValue={attackValue}
        defenseValue={defenseValue}
        modifierValue={modifierValue}
        attackDieFace={attackDieFace}
        defenseDieFace={defenseDieFace}
        modifierDieFace={modifierDieFace}
        attackSuccess={attackSuccess}
        defenseSuccess={defenseSuccess}
        hasModifier={Boolean(modifierValue)}
        showModifierDie={showModifierDie}
        compact={compact}
        challengeStat={challengeStat}
      />
    </div>
  );
}
