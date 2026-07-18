import { loadCharacters } from "../src/game/content/characters.js";
import type { Stat } from "../src/game/schema/character.schema.js";

const stats: Stat[] = ["command", "grit", "signal", "guile", "forge"];
const difficulties = [8, 10, 12, 14, 15, 16, 17, 18, 20];

function probabilityAtLeast(requiredDiceTotal: number): number {
  let successes = 0;
  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      if (first + second >= requiredDiceTotal) successes += 1;
    }
  }
  return Math.round((successes / 36) * 1000) / 10;
}

const characters = [...loadCharacters().values()].filter((character) => !character.id.startsWith("qa-"));
const analysis = stats.map((stat) => {
  const values = characters.map((character) => character.stats[stat]).sort((a, b) => a - b);
  const min = values[0] ?? 0;
  const median = values[Math.floor(values.length / 2)] ?? 0;
  const max = values.at(-1) ?? 0;
  return {
    stat,
    characterCount: values.length,
    baseRange: { min, median, max },
    profiles: difficulties.map((difficulty) => ({
      difficulty,
      weakActiveNoHelp: probabilityAtLeast(difficulty - min),
      weakActiveOneMedianHelper: probabilityAtLeast(difficulty - min - median),
      weakActiveTwoMedianHelpers: probabilityAtLeast(difficulty - min - median * 2),
      medianActiveOneMedianHelper: probabilityAtLeast(difficulty - median * 2),
      strongActiveTwoStrongHelpers: probabilityAtLeast(difficulty - max * 3)
    }))
  };
});

process.stdout.write(`${JSON.stringify({ formula: "active total + 2d6 + helper base values", analysis }, null, 2)}\n`);
