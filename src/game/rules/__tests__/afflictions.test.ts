import { describe, expect, it } from "vitest";
import { loadAfflictionCards } from "../../content/afflictions.js";
import { reduceGameState } from "../../engine/reducer.js";
import {
  getAfflictionModifierSources,
  getAfflictionRestrictions,
  getAfflictionWoundPrevention,
  resolveAfflictionDraw
} from "../afflictions.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const afflictions = loadAfflictionCards();

function stateWithAffliction(cardId: string) {
  const state = createInitialSessionState("affliction-test", "single-player");
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      faceupAfflictions: [
        {
          instanceId: `${cardId}:test`,
          cardId,
          drawnAt: "2026-07-06T00:00:00.000Z",
          face: "faceup" as const,
          resolved: false
        }
      ],
      facedownAfflictions: [],
      afflictionDrawHistory: [cardId]
    }))
  };
}

describe("Afflictions", () => {
  it("drawing an ongoing Affliction adds it faceup", () => {
    const state = createInitialSessionState("affliction-test", "single-player");
    const card = afflictions.get("brittle-frame")!;
    const result = reduceGameState(state, {
      type: "AFFLICTION_DRAWN",
      seatId: "seat-1",
      afflictionId: card.id,
      affliction: card,
      createdAt: "2026-07-06T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.state.players[0]?.faceupAfflictions?.[0]?.cardId : null).toBe("brittle-frame");
    expect(result.ok ? result.state.players[0]?.facedownAfflictions?.length : null).toBe(0);
  });

  it("drawing an immediate Affliction resolves and flips facedown", () => {
    const state = createInitialSessionState("affliction-test", "single-player");
    const player = state.players[0]!;
    const card = afflictions.get("mind-fog")!;
    const result = resolveAfflictionDraw(player, card, afflictions, {
      createdAt: "2026-07-06T00:00:00.000Z"
    });

    expect(result.player.facedownAfflictions?.[0]?.cardId).toBe("mind-fog");
    expect(result.player.character.stats.guile).toBe(Math.max(1, player.character.stats.guile - 1));
  });

  it("cannot-use restrictions block weapons and armor while allowing cannot evade to override may evade", () => {
    const state = createInitialSessionState("affliction-test", "single-player");
    const player = {
      ...state.players[0]!,
      faceupAfflictions: ["brittle-frame", "severed-grip", "phase-veil", "red-madness"].map((cardId) => ({
        instanceId: `${cardId}:test`,
        cardId,
        drawnAt: "2026-07-06T00:00:00.000Z",
        face: "faceup" as const,
        resolved: false
      }))
    };

    const restrictions = getAfflictionRestrictions(player, afflictions);

    expect(restrictions.cannotUseArmor).toBe(true);
    expect(restrictions.cannotUseArmorSource).toBe("Brittle Frame");
    expect(restrictions.cannotUseWeapons).toBe(true);
    expect(restrictions.cannotUseWeaponsSource).toBe("Severed Grip");
    expect(restrictions.cannotEvadeEnemies).toBe(true);
    expect(restrictions.cannotEvadeEnemiesSource).toBe("Red Madness");
    expect(restrictions.canEvadeEnemies).toBe(false);
  });

  it("test penalties apply with minimum 1 and battle bonus appears as a formula source", () => {
    const state = createInitialSessionState("affliction-test", "single-player");
    const player = {
      ...state.players[0]!,
      character: {
        ...state.players[0]!.character,
        stats: { ...state.players[0]!.character.stats, grit: 1 }
      },
      faceupAfflictions: ["hollow-belly", "bone-blades"].map((cardId) => ({
        instanceId: `${cardId}:test`,
        cardId,
        drawnAt: "2026-07-06T00:00:00.000Z",
        face: "faceup" as const,
        resolved: false
      }))
    };

    expect(getAfflictionModifierSources(player, "grit", "check", afflictions)).toEqual([]);
    expect(getAfflictionModifierSources(player, "grit", "battle", afflictions)).toEqual([
      { label: "Affliction: Bone Blades", value: 2 }
    ]);
  });

  it("draw-Affliction triggers cause stat loss or wounds before the newly drawn card resolves", () => {
    const state = createInitialSessionState("affliction-test", "single-player");
    const player = {
      ...state.players[0]!,
      faceupAfflictions: ["hollow-thoughts", "weeping-cysts"].map((cardId) => ({
        instanceId: `${cardId}:test`,
        cardId,
        drawnAt: "2026-07-06T00:00:00.000Z",
        face: "faceup" as const,
        resolved: false
      }))
    };
    const card = afflictions.get("brittle-frame")!;
    const result = resolveAfflictionDraw(player, card, afflictions, {
      createdAt: "2026-07-06T00:00:00.000Z"
    });

    expect(result.player.character.stats.guile).toBe(Math.max(1, player.character.stats.guile - 1));
    expect(result.player.character.wounds).toBe(player.character.wounds + 1);
  });

  it("battle prevention reactions work on 5-6 for matching battle stats", () => {
    const state = stateWithAffliction("metal-hide");
    const player = state.players[0]!;

    expect(getAfflictionWoundPrevention(player, "grit", 5, afflictions)).toEqual({
      prevented: 1,
      source: "Metal Hide"
    });
    expect(getAfflictionWoundPrevention(player, "command", 5, afflictions)).toEqual({
      prevented: 0,
      source: null
    });
  });
});
