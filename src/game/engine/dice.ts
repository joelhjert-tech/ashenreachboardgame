import { randomInt } from "node:crypto";

export interface DiceRollResult {
  total: number;
  faces: number[];
}

export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const defaultRandomSource: RandomSource = {
  nextInt(maxExclusive) {
    return randomInt(maxExclusive);
  }
};

export function createSeededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % maxExclusive;
    }
  };
}

export function createSequenceRandomSource(sequence: number[]): RandomSource {
  let index = 0;

  return {
    nextInt(maxExclusive) {
      const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0;
      index += 1;
      return ((value % maxExclusive) + maxExclusive) % maxExclusive;
    }
  };
}

export function rollDice(
  count: number,
  sides = 6,
  randomSource: RandomSource = defaultRandomSource
): DiceRollResult {
  const faces = Array.from({ length: count }, () => randomSource.nextInt(sides) + 1);
  const total = faces.reduce((sum, value) => sum + value, 0);

  return { total, faces };
}
