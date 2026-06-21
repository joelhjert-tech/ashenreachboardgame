import type { RandomSource } from "../engine/dice.js";
import { defaultRandomSource } from "../engine/dice.js";

export interface SkillTestResult {
  die: number;
  total: number;
  success: boolean;
  autoFail: boolean;
}

export function resolveSkillTest(
  statValue: number,
  difficulty: number,
  randomSource: RandomSource = defaultRandomSource
): SkillTestResult {
  const die = randomSource.nextInt(6) + 1;
  const autoFail = die === 1;
  const total = statValue + die;

  return {
    die,
    total,
    success: !autoFail && total >= difficulty,
    autoFail
  };
}
