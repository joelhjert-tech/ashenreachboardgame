import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { getShopGearSellValue, SHOP_FAILURE_REASONS } from "../../game/rules/shopAvailability.js";
import type { GearItem } from "../../game/schema/gear.schema.js";
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
  heldGear?: GearItem[];
  equippedGearId?: string;
  currentEncounterId?: string;
  interactionMode?: "co-op" | "rivalry" | "ruthless";
} = {}): GameState {
  const state = createInitialSessionState("phase-two-shop-sell", "multiplayer", undefined, options.interactionMode ?? "rivalry", "standard", 2);
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
            notes: ["Private agenda: sell quietly"]
          },
          character: {
            ...player.character,
            currentSpaceId: sectorId,
            salvage: options.salvage ?? 1,
            heldGear: options.heldGear ?? [],
            equippedGear: {
              weapon: options.heldGear?.find((item) => item.id === options.equippedGearId && item.slot === "weapon")?.id ?? null,
              armor: options.heldGear?.find((item) => item.id === options.equippedGearId && item.slot === "armor")?.id ?? null,
              utility: options.heldGear?.find((item) => item.id === options.equippedGearId && item.slot === "utility")?.id ?? null
            }
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

function requireGear(id: string): GearItem {
  const item = loadGear().get(id);

  if (!item) {
    throw new Error(`Missing gear fixture ${id}`);
  }

  return item;
}

describe("Phase 2B shop sell flow", () => {
  it("removes an equipped permanent passive and its modifier when sold", () => {
    const vest = requireGear("rivetplate-vest");
    const { server, client } = createShopServer({ heldGear: [vest], equippedGearId: vest.id, salvage: 1 });

    server.handleIntent(client, { type: "SHOP_SELL_REQUESTED", seatId: "seat-1", gearId: vest.id });

    const character = server.getState().players[0]!.character;
    expect(character.heldGear).toEqual([]);
    expect(character.equippedGear.armor).toBeNull();
  });

  it("sells a held item at a shop, removes it from inventory, and adds salvage by tier fallback", () => {
    const veilHook = requireGear("veil-hook");
    const { server, client, sent } = createShopServer({ heldGear: [veilHook], salvage: 1 });

    server.handleIntent(client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: veilHook.id
    });

    const player = server.getState().players[0];

    expect(getRejectedReason(sent)).toBeUndefined();
    expect(getShopGearSellValue(veilHook)).toBe(1);
    expect(player?.character.salvage).toBe(2);
    expect(player?.character.heldGear).toEqual([]);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Sold Veil Hook for 1 Salvage");
    expect(server.getState().eventLog.at(-1)).toMatchObject({
      type: "SHOP_SELL_RESOLVED",
      gearId: veilHook.id,
      salvageDelta: 1
    });
  });

  it("uses explicit sellValue before cost fallback and projects public sale results without private rivalry data", () => {
    const base = requireGear("black-route-fuse");
    const explicitValueGear: GearItem = { ...base, id: "test-sell-explicit", name: "Test Explicit Fuse", cost: 6, sellValue: 4 };
    const { server, client, sent } = createShopServer({ heldGear: [explicitValueGear], salvage: 2, interactionMode: "rivalry" });

    server.handleIntent(client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: explicitValueGear.id
    });

    const tvProjection = createTvProjection(server.getState()) as {
      privateRivalry?: unknown;
      shopEncounter: { recentOutcome?: { sold?: string; salvageDelta?: number; summary: string } | null } | null;
    };

    expect(getRejectedReason(sent)).toBeUndefined();
    expect(server.getState().players[0]?.character.salvage).toBe(6);
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvProjection.shopEncounter?.recentOutcome).toMatchObject({
      sold: "Test Explicit Fuse",
      salvageDelta: 4
    });
    expect(JSON.stringify(tvProjection.shopEncounter)).not.toContain("Private agenda");
  });

  it("falls back to floor(cost / 2), minimum 1 salvage", () => {
    const base = requireGear("black-route-fuse");
    const costedGear: GearItem = { ...base, id: "test-costed-fuse", name: "Test Costed Fuse", cost: 5 };
    const cheapGear: GearItem = { ...base, id: "test-cheap-fuse", name: "Test Cheap Fuse", cost: 1 };

    expect(getShopGearSellValue(costedGear)).toBe(2);
    expect(getShopGearSellValue(cheapGear)).toBe(1);
  });

  it("rejects selling away from shops, blocked shops, unheld gear, non-sellable objects, and QA gear for normal operatives", () => {
    const veilHook = requireGear("veil-hook");
    const oathChainLedger = requireGear("oath-chain-ledger");
    const qaGear = requireGear("qa_alpha_consumable_01");

    const notAtShop = createShopServer({ sectorId: "ashwake-crossing", heldGear: [veilHook] });
    notAtShop.server.handleIntent(notAtShop.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: veilHook.id
    });
    expect(getRejectedReason(notAtShop.sent)).toBe(SHOP_FAILURE_REASONS.notAtShop);

    const blocked = createShopServer({ heldGear: [veilHook], currentEncounterId: "gate-tax-collectors" });
    blocked.server.handleIntent(blocked.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: veilHook.id
    });
    expect(getRejectedReason(blocked.sent)).toBe(SHOP_FAILURE_REASONS.shopBlockedByThreat);

    const unheld = createShopServer({ heldGear: [veilHook] });
    unheld.server.handleIntent(unheld.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: "coffin-rig"
    });
    expect(getRejectedReason(unheld.sent)).toBe(SHOP_FAILURE_REASONS.itemNotHeld);

    const contractObject = createShopServer({ heldGear: [oathChainLedger] });
    contractObject.server.handleIntent(contractObject.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: oathChainLedger.id
    });
    expect(getRejectedReason(contractObject.sent)).toBe(SHOP_FAILURE_REASONS.itemNotSellable);

    const qa = createShopServer({ heldGear: [qaGear] });
    qa.server.handleIntent(qa.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: qaGear.id
    });
    expect(getRejectedReason(qa.sent)).toBe(SHOP_FAILURE_REASONS.itemNotSellable);
  }, 10_000);

  it("projects sellable inventory and disabled sell reasons for the owning phone", () => {
    const veilHook = requireGear("veil-hook");
    const oathChainLedger = requireGear("oath-chain-ledger");
    const state = createShopState({ heldGear: [veilHook, oathChainLedger] });
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      privateRivalry?: unknown;
      shopEncounter: {
        sellInventory: Array<{ gearId: string; sellValue: number; sellable: boolean; disabledReason?: string }>;
      } | null;
    };

    expect(phoneProjection.privateRivalry).toBeTruthy();
    expect(phoneProjection.shopEncounter?.sellInventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gearId: "veil-hook", sellValue: 1, sellable: true }),
        expect.objectContaining({ gearId: "oath-chain-ledger", sellable: false, disabledReason: SHOP_FAILURE_REASONS.itemNotSellable })
      ])
    );
  });
});
