import { BOARD_TEXT_EFFECTS, validateBoardTextEffectCoverage } from "../src/game/data/boardTextEffects.js";
import { BOARD_SPACES } from "../src/game/data/boardSpaces.js";
import { loadTileChallenges } from "../src/game/content/tileChallenges.js";
import { buildTileFunctionDefinition } from "../src/game/rules/tileFunctions.js";

const challenges = [...loadTileChallenges().values()];

const spaces = BOARD_SPACES
  .slice()
  .sort((left, right) => {
    const tierOrder = { outer: 0, middle: 1, inner: 2, center: 3 } as const;
    return tierOrder[left.tier] - tierOrder[right.tier] || left.index - right.index;
  })
  .map((space) => {
    const effect = BOARD_TEXT_EFFECTS[space.textBox.effectKey] ?? null;
    const functions = buildTileFunctionDefinition(space, challenges);
    return {
      ...space,
      effect: effect
        ? {
            summary: effect.summary,
            stat: effect.stat ?? null,
            difficulty: effect.difficulty ?? null,
            failureSummary: effect.failureSummary ?? null,
            choices: (effect.choices ?? []).map((choice) => ({
              id: choice.id,
              stat: choice.stat ?? null,
              difficulty: choice.difficulty ?? null,
              summary: choice.summary,
              failureSummary: choice.failureSummary ?? null
            })),
            sectorDeck: effect.sectorDeck?.kind ?? null
          }
        : null,
      functions
    };
  });

const allRules = spaces.flatMap((space) => [
  ...space.functions.arrival,
  ...space.functions.optionalActions,
  ...space.functions.persistentRules,
  ...space.functions.departure
]);
const effectCoverage = validateBoardTextEffectCoverage();

const payload = {
  generatedFrom: [
    "src/game/data/boardSpaces.ts",
    "src/game/data/boardTextEffects.ts",
    "src/game/rules/tileFunctions.ts",
    "content/tile-challenges"
  ],
  spaces,
  audit: {
    totalSpaces: spaces.length,
    tierCounts: {
      outer: spaces.filter((space) => space.tier === "outer").length,
      middle: spaces.filter((space) => space.tier === "middle").length,
      inner: spaces.filter((space) => space.tier === "inner").length,
      center: spaces.filter((space) => space.tier === "center").length
    },
    spacesWithThreats: spaces.filter((space) => space.threatIcons.length > 0).length,
    spacesWithoutThreats: spaces
      .filter((space) => space.threatIcons.length === 0)
      .map((space) => space.name),
    recurringChallenges: challenges.map((challenge) => ({
      id: challenge.id,
      name: challenge.name,
      sectorId: challenge.sectorId,
      trigger: challenge.trigger,
      testStat: challenge.testStat,
      difficulty: challenge.difficulty
    })),
    unsupportedRules: allRules
      .filter((rule) => !rule.supported)
      .map((rule) => `${rule.id}: ${rule.label}`),
    effectCoverage
  }
};

process.stdout.write(JSON.stringify(payload));
