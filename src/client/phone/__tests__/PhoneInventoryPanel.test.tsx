// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import { PhoneInventoryPanel } from "../PhoneInventoryPanel.js";
import { PortraitControllerView } from "../PortraitControllerView.js";
import type { CharacterCatalogEntry, PhonePatchPayload } from "../../shared/types.js";

const combatWeapon = {
  id: "black-route-fuse",
  name: "Black Route Fuse",
  slot: "weapon" as const,
  category: "dangerous" as const,
  statBonus: { stat: "grit" as const, amount: 1 },
  activeText: "Break for +3 combat pressure, then advance escalation by 1.",
  useLimit: "discard" as const,
  heatCost: 1
};

const passiveArmor = {
  id: "coffin-rig",
  name: "Coffin Rig",
  slot: "armor" as const,
  category: "passive" as const,
  statBonus: { stat: "forge" as const, amount: 1 }
};

const relic = {
  id: "choir-static-censer",
  name: "Choir Static Censer",
  slot: "utility" as const,
  category: "chargedRelic" as const,
  statBonus: { stat: "signal" as const, amount: 1 },
  activeText: "Spend 1 charge to reduce anomaly instability by 1 or lose 1 heat after a signal check.",
  useLimit: "charge" as const,
  charges: 2
};

const consumable = {
  id: "cinder-suture-kit",
  name: "Cinder Suture Kit",
  slot: "utility" as const,
  category: "consumable" as const,
  statBonus: { stat: "forge" as const, amount: 1 },
  activeText: "Discard to heal 1 wound, then gain 1 heat.",
  useLimit: "discard" as const
};

const questItem = {
  id: "oath-chain-ledger",
  name: "Oath-Chain Ledger",
  slot: "utility" as const,
  category: "contractObject" as const,
  statBonus: { stat: "command" as const, amount: 1 },
  activeText: "Mark a contract bargain and bank one safer completion route.",
  useLimit: "oncePerRound" as const
};

function createPatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: null,
    scenarioTelemetry: [],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false }],
    turnOrder: ["seat-1"],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: [],
        danger: 2,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "ashwake-crossing",
        character: {
          id: "void-marshal",
          name: "Sable Vey",
          archetype: "Void Marshal",
          status: "active",
          activeContract: null,
          stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
          trophies: 0,
          heat: 1,
          wounds: 0,
          scars: [],
          heldGearCount: 5,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    recentAbilityTriggers: [],
    encounter: {
      id: "cinder-veil-stalker",
      title: "Cinder-Veil Stalker",
      cardType: "enemy",
      enemyName: "Cinder-Veil Stalker",
      flavor: "The ash around it boils before the strike.",
      difficulty: 6,
      stat: "grit"
    },
    pendingEnemyRoll: null,
    outcomeSummary: null,
    self: {
      seatId: "seat-1",
      sectorId: "ashwake-crossing",
      hand: [],
      notes: [],
      character: {
        id: "void-marshal",
        name: "Sable Vey",
        archetype: "Void Marshal",
        currentSpaceId: "ashwake-crossing",
        status: "active",
        stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
        trophies: 0,
        heat: 1,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [combatWeapon, passiveArmor, relic, consumable, questItem],
        equippedGear: { weapon: null, armor: "coffin-rig", utility: null },
        followers: [
          {
            id: "choir-defector",
            name: "Choir Defector",
            role: "ritualist",
            text: "Once per round, reduce an anomaly instability or signal difficulty by 1 before rolling.",
            useLimit: "oncePerRound"
          }
        ],
        abilities: []
      }
    },
    nemesis: null
  };

  return {
    ...patch,
    ...overrides
  };
}

const characters: CharacterCatalogEntry[] = [
  {
    id: "void-marshal",
    name: "Sable Vey",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
];

afterEach(() => {
  cleanup();
  window.localStorage.removeItem("ashenreach.phoneChromeVisible");
  vi.useRealTimers();
});

function openPhoneTabs(): void {
  const showTabsButton = screen.queryByRole("button", { name: /show tabs/i });

  if (showTabsButton) {
    fireEvent.click(showTabsButton);
  }
}

describe("PhoneInventoryPanel", () => {
  it("groups private inventory cards by type and shows usability status", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    expect(screen.getAllByText("Weapons").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Armor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Relics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Consumables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Followers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quest Items").length).toBeGreaterThan(0);
    expect(screen.getByTestId("phone-inventory-progression")).toHaveTextContent(/progression/i);
    expect(screen.getByTestId("phone-inventory-progression")).toHaveTextContent(/trophies: 0/i);
    expect(screen.getByRole("button", { name: /command 3 -> 4\s*need 4 more trophies/i })).toBeDisabled();
    expect(screen.getAllByText("Black Route Fuse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coffin Rig").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Passive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usable now").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: /inventory timing groups/i })).toHaveTextContent(/useful now/i);
    expect(screen.getByRole("region", { name: /inventory timing groups/i })).toHaveTextContent(/passive \/ already applied/i);
    expect(screen.getByRole("region", { name: /inventory timing groups/i })).toHaveTextContent(/not usable now/i);
    expect(screen.getByRole("region", { name: /inventory timing groups/i })).toHaveTextContent(/black route fuse/i);
    expect(screen.getByRole("region", { name: /inventory timing groups/i })).toHaveTextContent(/coffin rig/i);
    expect(screen.getByText(/no wounds to heal/i)).toBeInTheDocument();
  });

  it("shows trophies and stat upgrades in Inventory progression", () => {
    const onIntent = vi.fn();
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              trophies: 6,
              trophyPile: [
                {
                  cardId: "cinder-veil-stalker",
                  name: "Cinder-Veil Stalker",
                  trophyValue: 6,
                  spentValue: 0,
                  stat: "grit" as const,
                  cardType: "enemy" as const
                }
              ]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    const progression = screen.getByTestId("phone-inventory-progression");
    expect(progression).toHaveTextContent(/trophies: 6/i);
    expect(progression).toHaveTextContent(/cinder-veil stalker/i);
    expect(progression).toHaveTextContent(/6\/6/i);

    const gritUpgrade = within(progression).getByRole("button", { name: /grit 2 -> 3\s*cost 3 trophies/i });
    expect(gritUpgrade).toBeEnabled();
    expect(gritUpgrade.style.getPropertyValue("--challenge-color")).toBe(getChallengeThemeStyle("grit")["--challenge-color"]);

    fireEvent.click(gritUpgrade);

    expect(onIntent).toHaveBeenCalledWith({
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });
  });

  it("renders inventory and follower cards with wrapped media and cleared actions", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const itemCard = screen.getByLabelText(/black route fuse: usable now/i);
    expect(itemCard).toHaveClass("phone-wrap-card", "phone-wrap-card--inventory");
    expect(itemCard.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(itemCard.querySelector(".phone-wrap-card__body")).toHaveTextContent(/black route fuse/i);
    expect(itemCard.querySelector(".phone-wrap-card__description")).toHaveClass("phone-wrap-card__description");
    expect(itemCard.querySelector(".phone-wrap-card__description")).toHaveTextContent(/adds \+1 grit/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).toHaveTextContent(/before battle roll/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).toHaveTextContent(/\+1 grit/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).not.toHaveTextContent(/combat pressure/i);
    expect((itemCard.querySelector(".phone-inventory-stat-bonus") as HTMLElement).style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("grit")["--challenge-color"]
    );
    expect(itemCard.querySelector(".phone-wrap-card__actions")).toContainElement(screen.getByRole("button", { name: /use black route fuse/i }));
    expect(itemCard.querySelector(".phone-wrap-card__actions")?.compareDocumentPosition(itemCard.querySelector(".phone-wrap-card__description") as Node)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );

    const followerCard = screen.getByLabelText(/^choir defector:/i);
    expect(followerCard).toHaveClass("phone-wrap-card", "phone-wrap-card--inventory");
    expect(followerCard.querySelector(".phone-wrap-card__fallback")).toHaveTextContent("CD");
    expect(followerCard.querySelector(".phone-wrap-card__actions")).toContainElement(screen.getByRole("button", { name: /use choir defector/i }));
  });

  it("marks oversized inventories without creating nested category scrollers", () => {
    const manyWeapons = Array.from({ length: 7 }, (_, index) => ({
      ...combatWeapon,
      id: `black-route-fuse-${index}`,
      name: `Black Route Fuse ${index + 1}`
    }));
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              heldGear: [...manyWeapons, passiveArmor, relic, consumable, questItem]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    const inventory = screen.getByLabelText("Inventory");
    const weaponsCount = screen.getByLabelText("7 Weapons cards");
    const weaponsGroup = weaponsCount.closest(".phone-inventory-group");

    expect(inventory).toHaveClass("phone-inventory-panel-overflow");
    expect(inventory).toHaveAttribute("data-item-count", "12");
    expect(weaponsGroup?.querySelector(".phone-inventory-card-list")).not.toHaveClass("phone-inventory-card-list-scroll");
    expect(weaponsCount).toBeInTheDocument();
  });

  it("makes usable, passive, and inactive item state explicit", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    expect(screen.getByLabelText(/black route fuse: usable now/i)).toHaveAttribute("data-inventory-state", "active");
    expect(screen.getByLabelText(/black route fuse: usable now/i)).toHaveTextContent(/active in this timing window/i);
    expect(screen.getByRole("button", { name: /use black route fuse/i })).toHaveTextContent(/use now/i);
    expect(screen.getByLabelText(/coffin rig: passive/i)).toHaveAttribute("data-inventory-state", "applied");
    expect(screen.queryByRole("button", { name: /use coffin rig/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/cinder suture kit: locked/i)).toHaveAttribute("data-inventory-state", "inactive");

    cleanup();
    render(<PhoneInventoryPanel patch={createPatch({ phase: "navigation", encounter: null })} onIntent={vi.fn()} />);
    expect(screen.getByLabelText(/black route fuse: ready but not usable now/i)).toHaveTextContent(/timing locked/i);
    expect(screen.getByLabelText(/black route fuse: ready but not usable now/i)).not.toHaveTextContent(/\bready\b/i);
  });

  it("locks stat-specific battle items when the encounter uses another stat", () => {
    render(
      <PhoneInventoryPanel
        patch={createPatch({
          encounter: {
            id: "gate-tax-collectors",
            title: "Gate-Tax Collectors",
            cardType: "enemy",
            enemyName: "Gate-Tax Collectors",
            flavor: "The toll stamp is already wet.",
            difficulty: 6,
            stat: "command"
          }
        })}
        onIntent={vi.fn()}
      />
    );

    const itemCard = screen.getByLabelText(/black route fuse: locked/i);
    expect(itemCard).toHaveTextContent(/usable only in grit battles/i);
    expect(itemCard).toHaveTextContent(/this encounter uses command/i);
    expect(screen.queryByRole("button", { name: /use black route fuse/i })).not.toBeInTheDocument();
  });

  it("does not present unequipped passive gear as an applied server modifier", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              equippedGear: { weapon: null, armor: null, utility: null }
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    const armorCard = screen.getByLabelText(/coffin rig: ready but not usable now/i);
    expect(armorCard).toHaveAttribute("data-inventory-state", "inactive");
    expect(armorCard).toHaveTextContent(/equip to apply this passive modifier/i);
    expect(screen.queryByRole("button", { name: /use coffin rig/i })).not.toBeInTheDocument();
  });

  it("uses server-confirmed use state for charges and once-per-round locks", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      objectUseStates: [
        {
          source: "gear" as const,
          id: "choir-static-censer",
          usedThisTurn: true,
          usedThisRound: true,
          remainingUses: 1,
          maxUses: 2,
          disabledReason: null
        },
        {
          source: "follower" as const,
          id: "choir-defector",
          usedThisTurn: true,
          usedThisRound: true,
          remainingUses: 0,
          maxUses: 1,
          disabledReason: "Choir Defector has already been used this round."
        }
      ]
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    const relicCard = screen.getByLabelText(/choir static censer: usable now/i);
    expect(relicCard).toHaveTextContent(/1\/2 uses/i);
    const followerCard = screen.getByLabelText(/choir defector: locked/i);
    expect(followerCard).toHaveAttribute("data-inventory-state", "inactive");
    expect(followerCard).toHaveTextContent(/already been used this round/i);
    expect(screen.queryByRole("button", { name: /use choir defector/i })).not.toBeInTheDocument();
  });

  it("sends a gear-use intent from a usable combat card", () => {
    const onIntent = vi.fn();

    render(<PhoneInventoryPanel patch={createPatch()} onIntent={onIntent} onlyUsable />);

    fireEvent.click(screen.getByRole("button", { name: /use black route fuse/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });
  });

  it("shows Fandiablos as an ultimate companion with art and before-threat timing", () => {
    const onIntent = vi.fn();
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      phase: "sector" as const,
      encounter: null,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              followers: [
                ...(basePatch.self.character.followers ?? []),
                {
                  id: "fandiablos",
                  name: "Fandiablos",
                  role: "companion" as const,
                  text: "Warning Barks before drawing threats. Swarm of Tiny Teeth. Cable Biters. Too Many Dogs.",
                  tier: "ultimate" as const,
                  unique: true,
                  ultimateCompanion: true,
                  artCardId: "artifact-fandiablos",
                  timingWindows: ["beforeThreatDraw", "beforeBattleRoll", "beforeTakingDamage", "anyTime"] as const,
                  useLimit: "oncePerTurn" as const
                }
              ]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    expect(screen.getByText("Fandiablos")).toBeInTheDocument();
    expect(screen.getByText(/before threat draw/i)).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/cards/artifacts/artifact-fandiablos.png"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use fandiablos/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos"
    });
  });

  it("moves turn actions into the portrait bottom navigation", async () => {
    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch()}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/compact phone navigation/i)).toHaveTextContent(/player card/i);
    openPhoneTabs();

    expect(screen.getByRole("tab", { name: /player card/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /move/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /battle/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /action/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /player card/i })).toHaveClass("phone-portrait-tab-player");
    expect(screen.getByRole("tab", { name: /inventory/i })).toHaveClass("phone-portrait-tab-inventory");
    expect(screen.getByRole("tab", { name: /quest/i })).toHaveClass("phone-portrait-tab-quests");
    expect(screen.getByRole("tab", { name: /move/i })).toHaveClass("phone-portrait-tab-move");
    expect(screen.getByRole("tab", { name: /battle/i })).toHaveClass("phone-portrait-tab-battle");
    expect(screen.getByRole("tab", { name: /shop/i })).toHaveClass("phone-portrait-tab-shop");
    expect(screen.getByRole("tab", { name: /action/i })).toHaveClass("phone-portrait-tab-action");
    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toHaveClass("phone-portrait-bottom-nav");
    expect(screen.queryByRole("tab", { name: /log/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /battle/i }));
    await waitFor(() => expect(screen.getByTestId("phone-action-screen")).toHaveClass("phone-portrait-screen-command"));
    expect(screen.getByTestId("phone-battle-assist")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));

    expect(screen.getByLabelText("Inventory")).toHaveTextContent(/black route fuse/i);

    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    await waitFor(() => expect(screen.getByLabelText(/character stats/i)).toBeInTheDocument());
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByText(/turn console/i)).not.toBeInTheDocument();
  });

  it("keeps top chrome and bottom tab dock visibility independent", async () => {
    const onIntent = vi.fn();

    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch({ encounter: null, phase: "broadcast" })}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    const shell = document.querySelector(".phone-portrait-controller");
    const tablist = screen.getByRole("tablist", { name: /phone navigation/i });

    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(shell).toHaveClass("phone-shell--bottomdock-compact");
    expect(within(screen.getByRole("banner")).getByRole("heading", { name: /sable vey/i })).toBeInTheDocument();
    expect(tablist).toHaveClass("phone-portrait-bottom-nav");
    expect(tablist).toHaveClass("phone-bottomdock--compact");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "false");
    expect(screen.getByLabelText(/compact phone navigation/i)).toHaveTextContent(/player card/i);
    expect(screen.getByRole("button", { name: /hide ui/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show tabs/i }));

    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(shell).toHaveClass("phone-shell--bottomdock-expanded");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "true");
    expect(screen.getByRole("button", { name: /hide ui/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));
    await waitFor(() => expect(screen.getByLabelText("Inventory")).toHaveTextContent(/black route fuse/i));
    fireEvent.click(screen.getByRole("button", { name: /hide ui/i }));

    expect(shell).toHaveClass("phone-shell--immersive");
    expect(shell).toHaveClass("phone-shell--bottomdock-expanded");
    expect(shell).toHaveAttribute("data-phone-chrome-visible", "false");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "true");
    expect(window.localStorage.getItem("ashenreach.phoneChromeVisible")).toBe("false");
    const compactStatus = screen.getByLabelText(/compact player status/i);
    expect(compactStatus).toHaveTextContent(/sable vey/i);
    expect(compactStatus).toHaveTextContent(/0 wounds \| 1 heat/i);
    expect(compactStatus.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("phone-topbar--compact");
    expect(screen.getByRole("tab", { name: /player card/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /inventory/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: /leave/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Inventory")).toHaveTextContent(/black route fuse/i);
    expect(screen.getByLabelText(/phone content/i)).toHaveClass("phone-content--expanded");
    expect(document.querySelectorAll(".phone-portrait-scroll")).toHaveLength(1);
    expect(onIntent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /hide tabs/i }));

    expect(shell).toHaveClass("phone-shell--immersive");
    expect(shell).toHaveClass("phone-shell--bottomdock-compact");
    expect(shell).toHaveAttribute("data-phone-chrome-visible", "false");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "false");
    expect(screen.getByLabelText(/compact phone navigation/i)).toHaveTextContent(/inventory/i);
    expect(screen.getByRole("button", { name: /show tabs/i })).toHaveClass("phone-chrome-restore");

    fireEvent.click(screen.getByRole("button", { name: /show tabs/i }));

    expect(shell).toHaveClass("phone-shell--immersive");
    expect(shell).toHaveClass("phone-shell--bottomdock-expanded");
    expect(window.localStorage.getItem("ashenreach.phoneChromeVisible")).toBe("false");
    expect(screen.getByRole("tab", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /inventory/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: /hide ui/i })).not.toBeInTheDocument();
  });

  it("renders compact expandable player card stats without label value collision", () => {
    const patch = createPatch({ encounter: null, phase: "broadcast" });
    const self = {
      ...patch.self!,
      character: {
        ...patch.self!.character,
        stats: { ...patch.self!.character.stats, command: 4 },
        statUpgrades: { command: 1 },
        equippedGear: { weapon: null, armor: "coffin-rig", utility: "oath-chain-ledger" }
      }
    };

    render(
      <PortraitControllerView
        self={self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={{ ...patch, self }}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const statsRegion = screen.getByLabelText(/character stats/i);
    const commandStat = within(statsRegion).getByRole("button", { name: /command stat 4/i });
    const commandHeading = commandStat.querySelector(".phone-stat-card-heading");

    expect(commandStat.querySelector(".phone-stat-card-label")).toHaveTextContent(/^COMMAND$/);
    expect(commandStat.querySelector(".phone-stat-card-value")).toHaveTextContent(/^4$/);
    expect(commandStat.querySelector(".phone-stat-card-modifier")).toHaveTextContent(/^\+2$/);
    expect(commandStat).toHaveAttribute("data-stat", "command");
    expect(commandStat).toHaveClass("phone-stat-card-command");
    expect(commandHeading).toHaveTextContent(/COMMAND\s+4/);
    expect(commandHeading).not.toHaveTextContent(/COMMAND4/);
    expect(commandStat).toHaveTextContent(/base 3/i);
    expect(commandStat).toHaveTextContent(/bonus \+2/i);
    expect(commandStat).not.toHaveTextContent(/permanent \+1/i);
    expect(commandStat).not.toHaveTextContent(/gear\/follower \+1/i);
    expect(screen.queryByText(/base 3 \| permanent \+1 \| gear\/follower \+1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Temporary$/)).not.toBeInTheDocument();

    fireEvent.click(commandStat);

    expect(commandStat).toHaveAttribute("aria-expanded", "true");
    expect(within(commandStat).getByText("Base")).toBeInTheDocument();
    expect(within(commandStat).getByText("Permanent")).toBeInTheDocument();
    expect(within(commandStat).getByText("Gear/Follower")).toBeInTheDocument();
    expect(within(commandStat).getByText("Temporary")).toBeInTheDocument();
    expect(within(commandStat).getByText("Final")).toBeInTheDocument();
    expect(within(commandStat).getByText("+0")).toBeInTheDocument();
    expect(within(commandStat).getAllByText("4").length).toBeGreaterThan(0);

    fireEvent.click(within(statsRegion).getByRole("button", { name: /grit stat 2/i }));

    expect(commandStat).toHaveAttribute("aria-expanded", "false");
    expect(within(statsRegion).getByRole("button", { name: /grit stat 2, details expanded/i })).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector(".phone-portrait-vitals")).toHaveTextContent(/heat 1/i);
    expect(document.querySelector(".phone-portrait-vitals")).not.toHaveTextContent(/trophies/i);
    expect(screen.getByLabelText(/compact phone navigation/i)).toHaveTextContent(/player card/i);
  });

  it("restores hidden phone chrome with Escape", () => {
    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch({ encounter: null, phase: "broadcast" })}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const shell = document.querySelector(".phone-portrait-controller");

    fireEvent.click(screen.getByRole("button", { name: /hide ui/i }));
    expect(shell).toHaveClass("phone-shell--immersive");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeInTheDocument();
  });

  it("keeps battle actions usable when phone chrome is hidden", async () => {
    const onIntent = vi.fn();

    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch()}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /battle/i }));
    await waitFor(() => expect(screen.getByTestId("phone-action-screen")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /hide ui/i }));

    expect(document.querySelector(".phone-portrait-controller")).toHaveClass("phone-shell--immersive");
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/roll battle/i);
    fireEvent.click(screen.getByRole("button", { name: /enter combat.*cinder-veil stalker/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });
  });

  it("keeps movement detail and Confirm Move usable when phone chrome is hidden", async () => {
    const onIntent = vi.fn();
    const movementPatch = createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "outer_ember_sanctum",
        currentSectorName: "Pilgrim Lock",
        destinations: [
          {
            sectorId: "ashwake-crossing",
            name: "Ashwalk Bridge",
            ring: "outer",
            distance: 1,
            route: ["outer_ember_sanctum", "ashwake-crossing"],
            routeNames: ["Pilgrim Lock", "Ashwalk Bridge"],
            tags: ["hazard", "crossroads"],
            threatIcons: ["yellow"],
            ruleText: "If clear, mark your route and gain a scouting note.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["safe"]
          }
        ]
      }
    });

    render(
      <PortraitControllerView
        self={movementPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={movementPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /move/i }));
    fireEvent.click(screen.getByRole("button", { name: /hide ui/i }));
    expect(screen.getByTestId("movement-planner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ashwalk bridge/i }));
    await waitFor(() => expect(screen.getByTestId("movement-confirm-footer")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /confirm move/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
  });

  it("keeps shop Skip usable when phone chrome is hidden", () => {
    const onIntent = vi.fn();
    const shopPatch = createPatch({
      encounter: null,
      shopEncounter: {
        sectorId: "outer_waymarket",
        sectorName: "Anchor Market",
        shopId: "outer_waymarket",
        shopName: "Anchor Market",
        available: true,
        blocked: false,
        shopType: "market",
        shopCategory: "market",
        stockCategory: "market",
        status: "open",
        activePlayer: {
          playerId: "seat-1",
          name: "Sable Vey",
          characterName: "Sable Vey",
          salvage: 3,
          heat: 1,
          wounds: { current: 0, max: 6 },
          trophies: 0,
          completedContracts: 0
        },
        blockingThreats: [],
        services: [],
        revealedStock: [],
        sellInventory: []
      }
    });

    render(
      <PortraitControllerView
        self={shopPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={shopPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /shop/i }));
    fireEvent.click(screen.getByRole("button", { name: /hide ui/i }));
    expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /skip \/ continue/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SKIP_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("shows private rivalry agenda details on the Quest tab", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealLocked",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: ["Keep it quiet"],
        reveal: {
          state: "revealLocked",
          available: false,
          label: "Reveal locked",
          hint: "Reveal is locked until this agenda's table moment becomes available.",
          lockedReason: "Reveal window has not opened."
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Claim the Black Ledger")).toBeInTheDocument();
    expect(within(agenda).getByText("1/3")).toBeInTheDocument();
    expect(within(agenda).getByText("Reveal is locked until this agenda's table moment becomes available.")).toBeInTheDocument();
    expect(within(agenda).getByText("Reveal window has not opened.")).toBeInTheDocument();
    expect(within(agenda).getByText("Keep it quiet")).toBeInTheDocument();
  });

  it("confirms and sends a rivalry agenda reveal intent when available", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealAvailable",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "revealAvailable",
          available: true,
          label: "Reveal Agenda",
          hint: "Ready to reveal a public agenda moment.",
          lockedReason: null
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal agenda/i }));

    expect(screen.getByRole("region", { name: /reveal agenda confirmation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm reveal/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("shows revealed rivalry agenda state without exposing new controls", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealed",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "revealed",
          available: false,
          label: "Revealed",
          hint: "Lane revealed a Rivalry Agenda.",
          publicTitle: "Rivalry Agenda",
          publicSummary: "Lane revealed a Rivalry Agenda.",
          revealedAtRound: 1
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Revealed")).toBeInTheDocument();
    expect(within(agenda).getByText("Lane revealed a Rivalry Agenda.")).toBeInTheDocument();
    expect(within(agenda).queryByRole("button", { name: /reveal agenda/i })).not.toBeInTheDocument();
  });

  it("shows completed rivalry agenda progress and private scoring to the owner", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "completed",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "finish-contracts",
          title: "Own the Contract Record",
          summary: "Close contracts while everyone else argues over priorities.",
          progressLabel: "Contracts completed",
          progress: 3,
          target: 3,
          stakes: "Reveal once your ledger is hard to dispute."
        },
        scoring: {
          pointsAwarded: 1,
          completedAtRound: 2,
          completedBySeatId: "seat-1",
          completionSummary: "You completed Own the Contract Record."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "completed",
          available: false,
          label: "Completed",
          hint: "You completed Own the Contract Record.",
          publicTitle: "Rivalry Agenda",
          publicSummary: "Lane completed a Rivalry Agenda."
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Own the Contract Record")).toBeInTheDocument();
    expect(within(agenda).getByText("3/3")).toBeInTheDocument();
    expect(within(agenda).getAllByText("Completed")).toHaveLength(2);
    expect(within(agenda).getByText("1 rivalry point")).toBeInTheDocument();
    expect(within(agenda).getAllByText("You completed Own the Contract Record.")).toHaveLength(2);
    expect(within(agenda).queryByRole("button", { name: /reveal agenda/i })).not.toBeInTheDocument();
  });

  it("hides the rivalry agenda on the Quest tab when no private payload is supplied", () => {
    const patch = createPatch({
      interactionMode: "co-op",
      encounter: null,
      privateRivalry: null
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    expect(screen.queryByRole("region", { name: /private rivalry agenda/i })).not.toBeInTheDocument();
    expect(screen.getByText("No active mission")).toBeInTheDocument();
  });

  it("shows the active mission with objective and progress on the Quest tab", () => {
    const basePatch = createPatch();
    const baseSelf = basePatch.self;
    if (!baseSelf) {
      throw new Error("Expected phone self fixture.");
    }

    const patch = createPatch({
      encounter: null,
      privateRivalry: null,
      self: {
        ...baseSelf,
        character: {
          ...baseSelf.character,
          activeContract: { contractId: "choir-hush-census", progress: 1 }
        }
      }
    });
    const activeContractCard = {
      id: "choir-hush-census",
      name: "Choir Hush Census",
      factionGiver: "Glass Choir",
      text: "Record the quiet names before the hall notices.",
      objective: { type: "defeatCount" as const, target: 2 },
      reward: { type: "lose_heat" as const, amount: 1 }
    };

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={activeContractCard}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    const mission = screen.getByTestId("phone-active-mission-card");
    expect(within(mission).getByText("Choir Hush Census")).toBeInTheDocument();
    expect(within(mission).getByText("Defeat 2 threats.")).toBeInTheDocument();
    expect(within(mission).getByText("Progress 1/2 defeated")).toBeInTheDocument();
    expect(within(mission).getByText("Lose Heat")).toBeInTheDocument();
  });

  it("shows public scenario sheet progress and pressure on the Quest tab without private agenda data", () => {
    const patch = createPatch({
      encounter: null,
      activeScenario: {
        id: "scenario_broken_seal",
        name: "The Broken Seal",
        theme: "The last ward is splitting.",
        sheetArtPath: "/assets/scenarios/broken-seal.png",
        difficulty: "easy-medium",
        mode: "coop",
        publicDisplay: {
          modeLabel: "Solo / Co-op",
          objective: "Stabilize the Broken Seal before the breach collapses the ward.",
          privacy: "Public scenario pressure only."
        },
        pressureSummary: "Keep the seals intact.",
        confrontationTitle: "Reseal the Prison",
        progressLabel: "Seal Restoration Marks",
        progress: 1,
        threshold: 2,
        finalGateRequirement: "Close 2 Riftgates before pressure reaches 6.",
        setup: [],
        specialRules: [],
        confrontationSteps: [],
        victoryText: "Complete the seal work to win."
      },
      scenarioPressure: {
        scenarioId: "scenario_broken_seal",
        scenarioName: "The Broken Seal",
        mode: "co-op",
        scenarioStatus: "active",
        pressureTrack: {
          name: "Seal Integrity",
          current: 5,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: false,
          tickTiming: "Round end",
          collapseRule: "Seal integrity reaches zero."
        },
        collapseTrack: {
          name: "Escalation",
          current: 2,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: true,
          tickTiming: "Round end",
          collapseRule: "The run fails at maximum escalation."
        },
        objectiveProgress: {
          label: "Seal Restoration Marks",
          current: 1,
          required: 2,
          completed: false
        },
        publicSummary: "Restore seals before the table collapses.",
        modeSpecific: {
          kind: "co-op",
          label: "Co-op",
          summary: "Shared objective and shared pressure.",
          privateAgenda: "none"
        }
      },
      publicResultDeltas: [
        {
          id: "scenario-progress",
          type: "scenarioProgress",
          label: "Scenario",
          value: 1,
          sign: "gain",
          targetScope: "scenario",
          visibility: "public",
          reason: "Contract completed: +1 objective progress.",
          source: "scenario:objective",
          publicText: "Contract completed: +1 objective progress.",
          severity: "scenario"
        }
      ],
      privateRivalry: null
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^quest$/i }));

    const scenario = screen.getByTestId("phone-scenario-sheet-summary");
    expect(scenario).toHaveTextContent(/the broken seal/i);
    expect(scenario).toHaveTextContent(/stabilize the broken seal/i);
    expect(scenario).toHaveTextContent(/win progress/i);
    expect(scenario).toHaveTextContent(/1\/2/i);
    expect(scenario).toHaveTextContent(/loss pressure/i);
    expect(scenario).toHaveTextContent(/2\/6/i);
    expect(scenario).toHaveTextContent(/if this reaches the limit, the scenario fails/i);
    expect(scenario).not.toHaveTextContent(/global escalation/i);
    expect(scenario).toHaveTextContent(/close 2 riftgates/i);
    expect(within(scenario).getByTestId("result-delta-row")).toHaveTextContent(/\+1 Scenario/i);
    expect(screen.queryByRole("region", { name: /private rivalry agenda/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/private trigger/i)).not.toBeInTheDocument();
  });

  it("shows a locked pre-game character screen with Back instead of bottom navigation", () => {
    const onLobbyBack = vi.fn();
    const onIntent = vi.fn();
    const lobbyPatch = createPatch({
      phase: "start",
      status: "lobby",
      seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: false, kicked: false }],
      startingContractOptions: [
        {
          id: "choir-quietus",
          name: "Quietus Ledger",
          factionGiver: "Glass Choir",
          text: "Silence one hunter on the listening road.",
          objective: { type: "defeatCount", target: 1 },
          reward: { type: "lose_heat", amount: 1 }
        }
      ],
      canReady: false,
      readyDisabledReason: "Choose a starting mission before Ready"
    });

    render(
      <PortraitControllerView
        self={lobbyPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={lobbyPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
        onLobbyBack={onLobbyBack}
      />
    );

    expect(screen.getByText(/character locked/i)).toBeInTheDocument();
    expect(screen.getAllByText(/choose starting mission/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/quietus ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/silence one hunter/i)).toBeInTheDocument();
    expect(screen.getByText("Lane")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /inventory/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select mission/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "SELECT_STARTING_CONTRACT", seatId: "seat-1", contractId: "choir-quietus" });

    fireEvent.click(screen.getByRole("button", { name: /^ready$/i }));

    expect(onIntent).not.toHaveBeenCalledWith({ type: "SET_READY", seatId: "seat-1", ready: true });

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    expect(onLobbyBack).toHaveBeenCalledOnce();
  });

  it("keeps the combat-card drawer filtered to usable timing-window cards", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} onlyUsable />);

    const inventory = screen.getByLabelText(/inventory/i);

    expect(within(inventory).getByText("Black Route Fuse")).toBeInTheDocument();
    expect(within(inventory).queryByText("Coffin Rig")).not.toBeInTheDocument();
  });
});
