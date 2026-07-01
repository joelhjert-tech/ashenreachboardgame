import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import {
  getAvailableShopStockForCategory,
  getGearShopCategoryIds,
  getShopGearCost,
  SHOP_FAILURE_REASONS
} from "../../game/rules/shopAvailability.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function createClient(seatId: string, sent: Array<Record<string, unknown>>): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        sent.push(JSON.parse(payload) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function createShopState(options: {
  sectorId?: string;
  salvage?: number;
  currentEncounterId?: string;
  interactionMode?: "co-op" | "rivalry" | "ruthless";
} = {}): GameState {
  const state = createInitialSessionState(
    "phase-two-shop",
    "multiplayer",
    undefined,
    options.interactionMode ?? "rivalry",
    "standard",
    2
  );
  const sectorId = options.sectorId ?? "outer_waymarket";
  const threat = options.currentEncounterId ? loadThreatCards().get(options.currentEncounterId) ?? null : null;

  state.status = "active";
  state.phase = "action";
  state.activeSeatIndex = 0;
  state.turnOrder = ["seat-1", "seat-2"];
  state.currentEncounter = threat;
  state.pendingEnemyRoll = null;
  state.pendingEffect = null;
  state.activeResolution = null;
  state.seats = state.seats.map((seat, index) => ({
    ...seat,
    displayName: index === 0 ? "Lane" : "Kallista",
    connected: true,
    ready: true
  }));
  state.players = state.players.map((player) =>
    player.seatId === "seat-1"
      ? {
          ...player,
          sectorId,
          private: {
            ...player.private,
            notes: ["Private agenda: buy quietly"]
          },
          character: {
            ...player.character,
            currentSpaceId: sectorId,
            salvage: options.salvage ?? 6,
            heldGear: [],
            equippedGear: { weapon: null, armor: null, utility: null }
          }
        }
      : player
  );

  return state;
}

function createShopServer(options: Parameters<typeof createShopState>[0] = {}): {
  server: GameRoomServer;
  client: ConnectedClient;
  sent: Array<Record<string, unknown>>;
} {
  const sent: Array<Record<string, unknown>> = [];
  const server = new GameRoomServer(createShopState(options));

  return {
    server,
    client: createClient("seat-1", sent),
    sent
  };
}

function getRejectedReason(sent: Array<Record<string, unknown>>): unknown {
  return sent.find((message) => message.type === "INTENT_REJECTED")?.reason;
}

describe("Phase 2A shop mechanics foundation", () => {
  it("filters shop stock by shop category metadata and excludes QA stock for normal operatives", () => {
    const gear = loadGear();
    const marketStock = getAvailableShopStockForCategory(gear.values(), "market", {
      count: 12,
      includeArtifacts: false,
      includeQaGear: false
    });
    const forgeStock = getAvailableShopStockForCategory(gear.values(), "forge-armoury", {
      count: 12,
      includeArtifacts: false,
      includeQaGear: false
    });

    expect(marketStock.map((item) => item.id)).toContain("ashen-route-compass");
    expect(marketStock.every((item) => getGearShopCategoryIds(item).includes("market"))).toBe(true);
    expect(marketStock.some((item) => item.id.startsWith("qa_"))).toBe(false);
    expect(forgeStock.map((item) => item.id)).toContain("coffin-rig");
    expect(forgeStock.every((item) => getGearShopCategoryIds(item).includes("forge-armoury"))).toBe(true);
  });

  it("lets a player buy available category stock and deducts salvage", () => {
    const { server, client, sent } = createShopServer({ sectorId: "outer_waymarket", salvage: 6 });

    server.handleIntent(client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });

    const reveal = server.getState().shopStockReveals.find((entry) => entry.seatId === "seat-1");
    const selectedCardId = reveal?.stockIds[0];

    if (!selectedCardId) {
      throw new Error("Expected market stock to be revealed");
    }

    const selectedGear = loadGear().get(selectedCardId);

    if (!selectedGear) {
      throw new Error(`Missing selected gear ${selectedCardId}`);
    }

    expect(getGearShopCategoryIds(selectedGear)).toContain("market");

    server.handleIntent(client, {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: selectedCardId
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");

    expect(getRejectedReason(sent)).toBeUndefined();
    expect(player?.character.heldGear.map((item) => item.id)).toContain(selectedCardId);
    expect(player?.character.salvage).toBe(6 - getShopGearCost(selectedGear));
    expect(server.getState().lastOutcomeSummary?.summary).toContain(`Bought ${selectedGear.name}`);
  });

  it("rejects insufficient salvage, non-shop sectors, unavailable items, and blocked shops", () => {
    const insufficient = createShopServer({ sectorId: "outer_waymarket", salvage: 0 });
    insufficient.server.handleIntent(insufficient.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });
    const reveal = insufficient.server.getState().shopStockReveals.find((entry) => entry.seatId === "seat-1");
    const selectedCardId = reveal?.stockIds[0];

    if (!selectedCardId) {
      throw new Error("Expected stock reveal before affordability rejection");
    }

    insufficient.server.handleIntent(insufficient.client, {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: selectedCardId
    });

    expect(getRejectedReason(insufficient.sent)).toBe(SHOP_FAILURE_REASONS.insufficientSalvage);
    expect(insufficient.server.getState().players[0]?.character.heldGear).toEqual([]);

    const notAtShop = createShopServer({ sectorId: "ashwake-crossing", salvage: 6 });
    notAtShop.server.handleIntent(notAtShop.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });
    expect(getRejectedReason(notAtShop.sent)).toBe(SHOP_FAILURE_REASONS.notAtShop);

    const unavailable = createShopServer({ sectorId: "outer_waymarket", salvage: 6 });
    unavailable.server.handleIntent(unavailable.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });
    unavailable.server.handleIntent(unavailable.client, {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "coffin-rig"
    });
    expect(getRejectedReason(unavailable.sent)).toBe(SHOP_FAILURE_REASONS.itemUnavailable);

    const blocked = createShopServer({
      sectorId: "outer_waymarket",
      salvage: 6,
      currentEncounterId: "gate-tax-collectors"
    });
    blocked.server.handleIntent(blocked.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });
    expect(getRejectedReason(blocked.sent)).toBe(SHOP_FAILURE_REASONS.shopBlockedByThreat);
  });

  it("projects public TV shop state and actionable owner phone shop state without rivalry private data leakage", () => {
    const state = createShopState({
      sectorId: "outer_waymarket",
      salvage: 6,
      currentEncounterId: "gate-tax-collectors",
      interactionMode: "rivalry"
    });
    const tvProjection = createTvProjection(state) as {
      privateRivalry?: unknown;
      shopEncounter: {
        available: boolean;
        blocked: boolean;
        blockedReason: string;
        blockedReasonText: string;
        shopType: string;
        shopCategory: string;
        activePlayer: { salvage: number };
        services: unknown[];
      } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      privateRivalry?: unknown;
      shopEncounter: {
        available: boolean;
        blocked: boolean;
        blockedReason: string;
        activePlayer: { playerId: string; salvage: number };
      } | null;
    };

    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvProjection.shopEncounter).toMatchObject({
      available: false,
      blocked: true,
      blockedReason: SHOP_FAILURE_REASONS.shopBlockedByThreat,
      shopType: "Market",
      shopCategory: "market",
      activePlayer: { salvage: 6 },
      services: []
    });
    expect(JSON.stringify(tvProjection.shopEncounter)).not.toContain("Private agenda");
    expect(phoneProjection.privateRivalry).toBeTruthy();
    expect(phoneProjection.shopEncounter).toMatchObject({
      available: false,
      blocked: true,
      blockedReason: SHOP_FAILURE_REASONS.shopBlockedByThreat,
      activePlayer: { playerId: "seat-1", salvage: 6 }
    });
  });
});
