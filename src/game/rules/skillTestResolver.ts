import type { RandomSource } from "../engine/dice.js";
import { defaultRandomSource } from "../engine/dice.js";

export interface SkillTestResult {
  die: number;
  stat: string;
  base: number;
  gearModifier: number;
  temporaryModifier: number;
  roll: number;
  total: number;
  success: boolean;
  autoFail: boolean;
}

export interface SkillTestBreakdownInput {
  stat: string;
  base: number;
  gearModifier?: number;
  temporaryModifier?: number;
  roll: number;
}

export function calculateSkillTestBreakdown(input: SkillTestBreakdownInput): Omit<SkillTestResult, "success" | "autoFail" | "die"> & {
  die: number;
} {
  const gearModifier = input.gearModifier ?? 0;
  const temporaryModifier = input.temporaryModifier ?? 0;

  return {
    stat: input.stat,
    base: input.base,
    gearModifier,
    temporaryModifier,
    die: input.roll,
    roll: input.roll,
    total: input.base + gearModifier + temporaryModifier + input.roll
  };
}

export function resolveSkillTest(
  statValue: number,
  difficulty: number,
  randomSource: RandomSource = defaultRandomSource,
  options: {
    stat?: string;
    gearModifier?: number;
    temporaryModifier?: number;
  } = {}
): SkillTestResult {
  const die = randomSource.nextInt(6) + 1;
  const autoFail = die === 1;
  const breakdown = calculateSkillTestBreakdown({
    stat: options.stat ?? "unknown",
    base: statValue,
    gearModifier: options.gearModifier,
    temporaryModifier: options.temporaryModifier,
    roll: die
  });

  return {
    ...breakdown,
    die,
    success: !autoFail && breakdown.total >= difficulty,
    autoFail
  };
}
