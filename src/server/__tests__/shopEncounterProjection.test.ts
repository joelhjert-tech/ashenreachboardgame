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
      cost: {},
      shopCategory: "market"
    });
    expect(tvProjection.shopEncounter?.services.find((service) => service.id === "sell-gear")).toMatchObject({
      enabled: false,
      disabledReason: "No sellable items"
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

  it("publishes clear shrine and recovery service sectors through the shop encounter model", () => {
    const state = createInitialSessionState("session-service-sector");
    state.status = "active";
    state.phase = "action";
    state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum",
        salvage: 4
      }
    };

    const tvProjection = createTvProjection(state) as {
      shopEncounter: {
        shopName: string;
        status: string;
        services: Array<{ id: string; enabled: boolean }>;
      } | null;
    };

    expect(tvProjection.shopEncounter).toMatchObject({
      shopName: "Pilgrim Lock Gate",
      status: "open"
    });
    expect(tvProjection.shopEncounter?.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "buy-treatment", enabled: true })
      ])
    );
    expect(tvProjection.shopEncounter?.services).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "buy-boon" })]));
  });

  it("projects Deep Relic Search with an authoritative one-Salvage cost", () => {
    const state = createInitialSessionState("session-deep-relic-search");
    state.status = "active";
    state.phase = "action";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.activeResolution = null;
    state.pendingEnemyRoll = null;
    state.pendingEffect = null;
    state.currentEncounter = null;
    state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "votive-engine-room",
      character: { ...state.players[0]!.character, currentSpaceId: "votive-engine-room", salvage: 1 }
    };
    const projection = createTvProjection(state) as { shopEncounter: { services: Array<{ id: string; label: string; cost: unknown; enabled: boolean }> } | null };
    expect(projection.shopEncounter?.services).toContainEqual(expect.objectContaining({
      id: "risk-action",
      label: "Deep Relic Search",
      cost: { salvage: 1 },
      enabled: true
    }));
    expect(JSON.stringify(projection.shopEncounter)).not.toMatch(/\b(?:Heat|Risk)\b/);
  });
});
