import { describe, expect, it } from "vitest";
import { runAiRivalGame } from "../run-ai-rival-campaign.js";

describe("complete AI rival campaigns", () => {
  it.each([
    ["scenario_throne_of_ash", 2, 1],
    ["scenario_throne_of_ash", 6, 2],
    ["scenario_mirror_of_false_heroes", 2, 3],
    ["scenario_mirror_of_false_heroes", 3, 1],
    ["scenario_mirror_of_false_heroes", 3, 5],
    ["scenario_mirror_of_false_heroes", 6, 1],
    ["scenario_devourer_beneath", 2, 1],
    ["scenario_devourer_beneath", 6, 2]
  ] as const)("finishes %s with %i seats, seed %i, without rejected or stalled decisions", (scenario, count, seed) => {
    const result = runAiRivalGame(scenario, count, seed, 1500);
    expect(result.rejections).toEqual([]);
    expect(result.missedWinningContracts).toEqual([]);
    expect(result.failure).toBeNull();
    expect(result.status).toBe("ended");
    expect(result.turns).toBeGreaterThan(0);
  }, 30000);

  it("replays setup and game decisions from a seed", () => {
    const first = runAiRivalGame("scenario_devourer_beneath", 2, 9);
    const second = runAiRivalGame("scenario_devourer_beneath", 2, 9);
    const signature = (game: typeof first) => ({ status: game.status, failure: game.failure,
      winner: game.winnerSeatId, players: game.players, turns: game.turns,
      choices: game.trace.map(({ phase, actor, reason, sector, escalation }) => ({ phase, actor, reason, sector, escalation })) });
    expect(signature(first)).toEqual(signature(second));
  }, 30000);
});
