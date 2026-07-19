// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicPatchPayload, PublicPlayer, PublicShopEncounterState, StatePatch } from "../../shared/types.js";
import { HostShopOverlay, buildShopModel } from "../HostShopOverlay.js";

function shopFixture(overrides: Partial<PublicShopEncounterState> = {}): PublicShopEncounterState {
  return {
    sectorId: "outer_waymarket",
    sectorName: "Anchor Market",
    shopId: "outer_waymarket",
    shopName: "The Ashen Counter",
    shopType: "Forge Market",
    status: "open",
    browseSelection: { view: "categories", selectedId: null },
    activePlayer: {
      playerId: "seat-1",
      name: "Joel",
      characterName: "Cinder Wattle",
      salvage: 4,
      wounds: { current: 1, max: 6 },
      trophies: 2,
      completedContracts: 1
    },
    blockingThreats: [],
    services: [
      { id: "buy-gear", label: "Browse Equipment", cost: {}, enabled: true },
      { id: "buy-treatment", label: "Field Surgery", cost: { salvage: 2 }, enabled: true },
      { id: "sell-gear", label: "Sell Gear", cost: {}, enabled: true }
    ],
    sellableCount: 1,
    ...overrides
  };
}

function patchFixture(shop: PublicShopEncounterState): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "shop-test",
    sequence: 12,
    phase: "action",
    payload: { status: "active", shopEncounter: shop } as PublicPatchPayload
  };
}

const activePlayer = { seatId: "seat-1", sectorId: "outer_waymarket" } as unknown as PublicPlayer;

afterEach(() => cleanup());

describe("HostShopOverlay rebuild", () => {
  it("opens as a full-screen category chamber with only authoritative categories", () => {
    render(<HostShopOverlay patch={patchFixture(shopFixture())} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-overlay")).toHaveClass("host-shop-rebuild");
    expect(screen.getByTestId("host-shop-category-equipment")).toBeInTheDocument();
    expect(screen.getByTestId("host-shop-category-services")).toBeInTheDocument();
    expect(screen.getByTestId("host-shop-category-sell")).toBeInTheDocument();
    expect(screen.queryByTestId("host-shop-category-items")).not.toBeInTheDocument();
    expect(screen.queryByTestId("host-shop-category-artifacts")).not.toBeInTheDocument();
  });

  it("uses the synchronized selected stock ID for the carousel focus", () => {
    const shop = shopFixture({
      browseSelection: { view: "equipment", selectedId: "route-star" },
      revealedStock: [
        { cardId: "ashlock-cleaver", name: "Ashlock Cleaver", type: "gear", cost: { salvage: 2 }, summary: "Grit +1.", stock: 1, affordable: true },
        { cardId: "route-star", name: "Route Star", type: "gear", cost: { salvage: 4 }, summary: "Choose an authoritative route.", lore: "Its needle remembers roads erased from the Reach.", rarity: "advanced", stock: 1, affordable: true }
      ]
    });
    render(<HostShopOverlay patch={patchFixture(shop)} activePlayer={activePlayer} />);
    const selected = screen.getByTestId("host-shop-selected-card");
    expect(selected).toHaveTextContent("Route Star");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("Choose an authoritative route");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("needle remembers roads");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("4 Salvage");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("1 in stock");
  });

  it("renders adjacent stock as context without competing with the selected card", () => {
    const shop = shopFixture({
      browseSelection: { view: "equipment", selectedId: "route-star" },
      revealedStock: [
        { cardId: "ashlock-cleaver", name: "Ashlock Cleaver", type: "gear", cost: { salvage: 2 }, summary: "Grit +1.", affordable: true },
        { cardId: "route-star", name: "Route Star", type: "gear", cost: { salvage: 4 }, summary: "Route choice.", affordable: true },
        { cardId: "signal-pike", name: "Signal Pike", type: "gear", cost: { salvage: 3 }, summary: "Signal +1.", affordable: true }
      ]
    });
    render(<HostShopOverlay patch={patchFixture(shop)} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-carousel").querySelector(".host-shop-rack-card-previous")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("host-shop-carousel").querySelector(".host-shop-rack-card-next")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses authoritative affordability and rejection copy", () => {
    const shop = shopFixture({
      browseSelection: { view: "equipment", selectedId: "void-plate" },
      revealedStock: [{ cardId: "void-plate", name: "Void Plate", type: "gear", cost: { salvage: 4 }, summary: "Grit +1.", stock: 1, affordable: false, disabledReason: "Inventory capacity reached" }]
    });
    render(<HostShopOverlay patch={patchFixture(shop)} activePlayer={activePlayer} />);
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("Unavailable");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("Inventory capacity reached");
  });

  it("renders existing services in the shared rack without inventing cards", () => {
    render(<HostShopOverlay patch={patchFixture(shopFixture({ browseSelection: { view: "services", selectedId: "buy-treatment" } }))} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-selected-card")).toHaveTextContent("Field Surgery");
    expect(screen.getByLabelText("Selected offer details")).toHaveTextContent("2 Salvage");
  });

  it("keeps Artifact options owner-private on TV", () => {
    const shop = shopFixture({
      browseSelection: { view: "artifacts", selectedId: null },
      services: [{ id: "trade-missions-for-artifact", label: "Artifact Exchange", cost: { completedContracts: 3 }, enabled: true }],
      revealedStock: undefined,
      sellableCount: 0
    });
    render(<HostShopOverlay patch={patchFixture(shop)} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-private-vault")).toHaveTextContent(/artifact choices remain on the active player/i);
    expect(screen.queryByTestId("host-shop-selected-card")).not.toBeInTheDocument();
  });

  it("keeps sale inventory owner-private on TV", () => {
    render(<HostShopOverlay patch={patchFixture(shopFixture({ browseSelection: { view: "sell", selectedId: null } }))} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-private-vault")).toHaveTextContent(/sale inventory remain on the active player/i);
  });

  it("shows a canonical threat lock reason", () => {
    const shop = shopFixture({
      status: "locked",
      blocked: true,
      blockedReasonText: "Shop blocked by threat.",
      blockingThreats: [{ cardId: "taxer", name: "Ash Tithe Collector", type: "enemy", challenge: { stat: "command", value: 5 } }]
    });
    render(<HostShopOverlay patch={patchFixture(shop)} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-lockdown")).toHaveTextContent("Shop blocked by threat");
    expect(screen.getByTestId("host-shop-lockdown")).toHaveTextContent("Ash Tithe Collector Command 5");
  });

  it("shows an honest empty-shop state without a selectable category", () => {
    render(<HostShopOverlay patch={patchFixture(shopFixture({ services: [], sellableCount: 0 }))} activePlayer={activePlayer} />);
    expect(screen.getByTestId("host-shop-empty-shop")).toHaveTextContent(/stalls are empty/i);
  });

  it("shows successful public transactions exactly once", () => {
    const shop = shopFixture({
      recentOutcome: { operativeName: "Joel", shopName: "The Ashen Counter", action: "buy", gained: "Route Star", costPaid: { salvage: 4 }, remainingSalvage: 0, summary: "Joel bought Route Star for 4 Salvage." }
    });
    const patch = patchFixture(shop);
    patch.payload.publicResultDeltas = [{ id: "bought", type: "itemBought", label: "Item bought", value: "Route Star", sign: "gain", targetScope: "personal", targetSeatId: "seat-1", visibility: "public", source: "shop:buy", publicText: "Joel bought Route Star.", severity: "reward" }];
    render(<HostShopOverlay patch={patch} activePlayer={activePlayer} />);
    expect(screen.getAllByTestId("host-shop-transaction-focus")).toHaveLength(1);
    expect(screen.getByTestId("host-shop-transaction-focus")).toHaveTextContent("Route Star acquired");
  });

  it("builds a presentation model without mutating its patch", () => {
    const patch = patchFixture(shopFixture());
    const before = JSON.stringify(patch);
    expect(buildShopModel(patch, activePlayer)?.categories).toHaveLength(3);
    expect(JSON.stringify(patch)).toBe(before);
  });
});
