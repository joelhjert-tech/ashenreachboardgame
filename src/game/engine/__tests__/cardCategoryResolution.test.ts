import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

function actionableState(): GameState {
  const state = createInitialSessionState("card-category-resolution", "multiplayer", undefined, undefined, "standard", 2);
  state.status = "active";
  state.phase = "action";
  const sectorId = state.players[0]!.sectorId;
  state.players[0]!.character.currentSpaceId = sectorId;
  state.sectors = state.sectors.map((sector) =>
    sector.id === sectorId ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } } : sector
  );
  return state;
}

describe("card category resolution identity", () => {
  it.each([
    ["anomaly", "Anomaly resolved"],
    ["escalation", "Escalation resolved"],
    ["artifact", "Asset recovered"]
  ] as const)("retains %s identity, origin, and source through resolution", (category, title) => {
    const state = actionableState();
    const sectorId = state.players[0]!.sectorId;
    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: `${category}-draw-1`,
      summary: `${category} resolved once.`,
      effect: null,
      sectorId,
      revealedCard: {
        id: `${category}-card-1`,
        title: `${category} card`,
        type: category,
        flavor: "The Reach answers with a distinct omen.",
        artType: category,
        sourceDeck: category,
        sourceSectorId: sectorId,
        privacy: "public"
      },
      consumedDeckCards: { [category]: [`${category}-card-1`] },
      createdAt: `2026-07-18T12:00:0${category.length}.000Z`
    });

    expect(result.ok).toBe(true);
    expect(result.state.activeResolution).toMatchObject({
      source: category,
      card: { id: `${category}-card-1`, title: `${category} card`, type: category },
      outcome: { title },
      origin: {
        sourceDeck: category,
        sourceSectorId: sectorId,
        queuePosition: 0,
        privacy: "public"
      }
    });
    expect(JSON.stringify(result.state.activeResolution)).not.toMatch(/\bHeat\b|gain_heat|lose_heat/i);
  });

  it("keeps an owner-private contract lead marked private", () => {
    const state = actionableState();
    const sectorId = state.players[0]!.sectorId;
    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: "contract-draw-1",
      summary: "A private lead is offered.",
      effect: null,
      sectorId,
      revealedCard: {
        id: "contract-secret-1",
        title: "Private Route Writ",
        type: "contract",
        flavor: "Only the owner reads the route.",
        artType: "contract",
        sourceDeck: "contract",
        sourceSectorId: sectorId,
        privacy: "owner"
      },
      createdAt: "2026-07-18T12:01:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(result.state.activeResolution?.origin?.privacy).toBe("owner");
    const owner = createPhoneProjection(result.state, "seat-1", true) as { activeResolution?: { card?: { title?: string } } };
    const other = createPhoneProjection(result.state, "seat-2", true) as { activeResolution?: { card?: { title?: string } } };
    const tv = createTvProjection(result.state) as { activeResolution?: { card?: { title?: string } } };

    expect(owner.activeResolution?.card?.title).toBe("Private Route Writ");
    expect(other.activeResolution?.card?.title).toBe("Private Contract Lead");
    expect(tv.activeResolution?.card?.title).toBe("Private Contract Lead");
    expect(JSON.stringify({ other, tv })).not.toContain("Only the owner reads the route.");
  });
});
