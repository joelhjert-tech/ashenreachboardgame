import type { ReactElement } from "react";
import { DiceRollScene } from "./DiceRollScene.js";

interface ThreeBattleDiceAnimationProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue: number | null;
  attackDieFace: number | null;
  defenseDieFace: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
}

export function ThreeBattleDiceAnimation({
  attackValue,
  defenseValue,
  modifierValue,
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false
}: ThreeBattleDiceAnimationProps): ReactElement {
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
      compact
      className="three-battle-dice"
      testId="three-battle-dice"
    />
  );
}
