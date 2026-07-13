import { describe, expect, it } from "vitest";
import type { ActiveResolution, PublicPatchPayload, StatePatch } from "../../shared/types.js";
import { getAshenReachAudioCues, getAshenReachMusicState } from "../audioEventSelectors.js";

function makePatch(overrides: Partial<PublicPatchPayload> = {}): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "session-audio-test",
    sequence: 1,
    phase: "resolution",
    payload: {
      status: "active",
      sessionMode: "multiplayer",
      winnerSeatId: null,
      activeScenario: null,
      scenarioTelemetry: [],
      scenarioProgress: {},
      seats: [],
      sectors: [],
      players: [],
      activeSeatIndex: 0,
      turnOrder: [],
      escalationLevel: 0,
      escalationThreshold: 8,
      escalationModifier: 0,
      availableContracts: [],
      encounter: null,
      pendingEnemyRoll: null,
      outcomeSummary: null,
      activeResolution: null,
      shopEncounter: null,
      recentAbilityTriggers: [],
      nemesis: null,
      ...overrides
    }
  };
}

function makeResolution(overrides: Partial<ActiveResolution>): ActiveResolution {
  return {
    id: "resolution-1",
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    ...overrides
  };
}

describe("Ashen Reach audio cue selectors", () => {
  it("plays a card reveal cue when a resolution enters card reveal", () => {
    const next = makePatch({
      activeResolution: makeResolution({
        stage: "card_reveal",
        card: { id: "threat-1", title: "Smoke-Leech Clutch", type: "enemy" }
      })
    });

    expect(getAshenReachAudioCues(null, next)).toContain("card_reveal");
  });

  it("plays battle start when battle setup becomes active", () => {
    const previous = makePatch({ activeResolution: makeResolution({ stage: "card_reveal" }) });
    const next = makePatch({ activeResolution: makeResolution({ stage: "battle_setup" }) });

    expect(getAshenReachAudioCues(previous, next)).toContain("battle_start");
  });

  it("plays dice land and hit for a successful roll result", () => {
    const previous = makePatch({ activeResolution: makeResolution({ stage: "dice_roll" }) });
    const next = makePatch({
      activeResolution: makeResolution({
        stage: "roll_result",
        roll: {
          dice: [5, 4],
          baseTotal: 9,
          modifierTotal: 2,
          finalTotal: 11,
          target: 8,
          success: true
        }
      })
    });

    expect(getAshenReachAudioCues(previous, next)).toEqual(expect.arrayContaining(["dice_land", "hit"]));
  });

  it("plays damage for a failed roll result", () => {
    const previous = makePatch({ activeResolution: makeResolution({ stage: "dice_roll" }) });
    const next = makePatch({
      activeResolution: makeResolution({
        stage: "roll_result",
        roll: {
          dice: [1, 2],
          baseTotal: 3,
          modifierTotal: 1,
          finalTotal: 4,
          target: 8,
          success: false
        }
      })
    });

    expect(getAshenReachAudioCues(previous, next)).toEqual(expect.arrayContaining(["dice_land", "damage"]));
  });

  it("plays shop and loot cues for completed shop transactions", () => {
    const previous = makePatch();
    const next = makePatch({
      shopEncounter: {
        sectorId: "anchor-market",
        sectorName: "Anchor Market",
        shopId: "anchor-market",
        shopName: "Anchor Market",
        status: "open",
        activePlayer: {
          playerId: "seat-1",
          name: "Joel",
          characterName: "Kira Dog",
          salvage: 3,
          wounds: { current: 0, max: 6 }
        },
        blockingThreats: [],
        services: [],
        recentOutcome: {
          operativeName: "Kira Dog",
          shopName: "Anchor Market",
          action: "Buy Gear",
          gained: "Ashlock Carbine",
          remainingSalvage: 3,
          summary: "Kira Dog bought Ashlock Carbine."
        }
      }
    });

    expect(getAshenReachAudioCues(previous, next)).toEqual(expect.arrayContaining(["shop", "loot"]));
  });

  it("sets combat music for active battle resolution and victory music for a won session", () => {
    expect(getAshenReachMusicState(makePatch({ activeResolution: makeResolution({ stage: "battle_setup" }) }))).toBe("combat");
    expect(getAshenReachMusicState(makePatch({ status: "ended", winnerSeatId: "seat-1" }))).toBe("victory");
  });
});
