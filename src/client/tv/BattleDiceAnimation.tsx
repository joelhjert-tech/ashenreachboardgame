import type { ReactElement } from "react";
import { DiceRollScene } from "./DiceRollScene.js";
import type { Stat } from "../shared/types.js";

interface BattleDiceAnimationProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue: number | null;
  attackDieFace: number | null;
  defenseDieFace: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
  challengeStat?: Stat;
}

export function BattleDiceAnimation({
  attackValue,
  defenseValue,
  modifierValue,
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false,
  challengeStat = "grit"
}: BattleDiceAnimationProps): ReactElement {
  return (
    <DiceRollScene
      attackValue={attackValue}
      defenseValue={defenseValue}
      modifierValue={modifierValue}
      attackDieFace={attackDieFace}
      defenseDieFace={defenseDieFace}
      modifierDieFace={modifierDieFace}
      attackSuccess={attackSuccess}
      defenseSuccess={defenseSuccess}
      challengeStat={challengeStat}
      compact
      className="battle-dice-animation"
      testId="battle-dice-animation"
    />
  );
}
