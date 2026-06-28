import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../game/content/threats.js";
import { createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("shop encounter public projection", () => {
  it("publishes an authoritative open shop encounter without leaking hidden stock", () => {
    const state = createInitialSessionState("session-shop");
    state.status = "active";
    state.phase = "action";
    state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_waymarket",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_waymarket",
        salvage: 6,
        heldGear: []
      }
    };

    const tvProjection = createTvProjection(state) as {
      shopEncounter: {
        shopName: string;
        status: string;
        activePlayer: { salvage: number; heat: number; wounds: { current: number; max: number } };
        blockingThreats: unknown[];
        services: Array<{ id: string; enabled: boolean; disabledReason?: string; cost: { salvage?: number; heat?: number } }>;
        revealedStock?: unknown[];
      } | null;
      players: Array<{ character: { heldGear?: unknown[]; salvage?: number } }>;
    };

    expect(tvProjection.shopEncounter).toMatchObject({
      shopName: "Anchor Market",
      status: "open",
      activePlayer: {
        salvage: 6,
        heat: 0,
        wounds: { current: 0, max: state.woundThreshold }
      },
      blockingThreats: []
    });
    expect(tvProjection.shopEncounter?.services.find((service) => service.id === "buy-gear")).toMatchObject({
      enabled: true,
      cost: { salvage: 3 }
    });
    expect(tvProjection.shopEncounter?.services.find((service) => service.id === "sell-gear")).toMatchObject({
      enabled: false,
      disabledReason: "No Gear to sell"
    });
    expect(tvProjection.shopEncounter?.revealedStock).toBeUndefined();
    expect(tvProjection.players[0]?.character.salvage).toBe(6);
    expect(tvProjection.players[0]?.character).not.toHaveProperty("heldGear");
  });

  it("publishes named blocking threats when a shop sector is locked", () => {
    const threats = loadThreatCards();
    const blocker = threats.get("gate-tax-collectors");
    const state = createInitialSessionState("session-shop-lock");

    if (!blocker) {
      throw new Error("Missing gate-tax-collectors fixture");
    }

    state.status = "active";
    state.phase = "action";
    state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
    state.currentEncounter = blocker;
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_waymarket",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_waymarket",
        salvage: 1
      }
    };

    const tvProjection = createTvProjection(state) as {
      shopEncounter: {
        status: string;
        blockingThreats: Array<{
          cardId: string;
          name: string;
          type: string;
          deck?: string;
          challenge?: { stat: string; value: number };
        }>;
        services: unknown[];
      } | null;
    };

    expect(tvProjection.shopEncounter?.status).toBe("locked");
    expect(tvProjection.shopEncounter?.blockingThreats).toEqual([
      {
        cardId: "gate-tax-collectors",
        name: "Gate-Tax Collectors",
        type: "enemy",
        deck: "yellow",
        challenge: {
          stat: "command",
          value: 5
        }
      }
    ]);
    expect(tvProjection.shopEncounter?.services).toEqual([]);
  });
});
