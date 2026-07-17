import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";
import { reduceGameState } from "../reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

describe("MASTER ALPHA QA hooks", () => {
  it("uses Deathless Protocol once instead of recalling at the wound threshold", () => {
    const masterAlpha = loadCharacters().get("char_master_alpha");
    const state = createInitialSessionState("QA01", "single-player");

    expect(masterAlpha).toBeDefined();

    const withMasterAlpha = {
      ...state,
      status: "active" as const,
      phase: "resolution" as const,
      players: state.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...masterAlpha!,
                currentSpaceId: player.character.currentSpaceId,
                wounds: state.woundThreshold
              }
            }
          : player
      )
    };

    const result = reduceGameState(withMasterAlpha, {
      type: "WOUND_THRESHOLD_REACHED",
      seatId: "seat-1",
      threshold: state.woundThreshold,
      newWoundTotal: state.woundThreshold,
      scar: "scar-test",
      createdAt: "2026-06-29T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const player = result.state.players.find((entry) => entry.seatId === "seat-1");

    expect(player?.character.status).toBe("active");
    expect(player?.character.wounds).toBe(1);
    expect(player?.character.scars).not.toContain("scar-test");
    expect(result.state.eventLog).toContainEqual(
      expect.objectContaining({
        type: "ABILITY_TRIGGERED",
        seatId: "seat-1",
        abilityId: "qa_deathless_protocol"
      })
    );
  });
});
