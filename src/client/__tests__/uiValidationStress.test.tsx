// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCharacters } from "../../game/content/characters.js";
import { loadContracts } from "../../game/content/contracts.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadGear } from "../../game/content/gear.js";
import { applyStartingLoadout } from "../../game/rules/startingLoadout.js";
import { PhoneActionPanel } from "../phone/PhoneActionPanel.js";
import { PhoneInventoryPanel } from "../phone/PhoneInventoryPanel.js";
import { PortraitControllerView } from "../phone/PortraitControllerView.js";
import type { CharacterCatalogEntry, PhonePatchPayload, PrivateCharacter, PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";
import { HostBattleOverlay } from "../tv/HostBattleOverlay.js";
import { HostShopOverlay } from "../tv/HostShopOverlay.js";

const longEnemyName = "Fandiablos, The Armored Chihuahua Swarm of Doom and Broken Command Protocols";
const longGearName = "Ashen Pattern Plasma Rifle of the Last Signal and Unreasonable Range";
const longFollowerName = "Fandiablos, The Armored Chihuahua Swarm of Doom";

afterEach(() => {
  cleanup();
});

function loadMasterAlpha(): PrivateCharacter {
  const character = loadCharacters().get("char_master_alpha");

  if (!character) {
    throw new Error("Missing MASTER ALPHA test character");
  }

  const loaded = applyStartingLoadout(character, {
    sessionMode: "single-player",
    seatIndex: 0,
    catalogs: {
      contracts: [...loadContracts().values()],
      gear: loadGear(),
      followers: loadFollowers()
    }
  });

  const heldGear = loaded.heldGear.map((item) =>
    item.id === "qa_alpha_weapon_02"
      ? {
          ...item,
          name: longGearName
        }
      : item
  ) as PrivateCharacter["heldGear"];

  const followers = (loaded.followers ?? []).map((follower) =>
    follower.id === "qa_alpha_follower_01"
      ? {
          ...follower,
          name: longFollowerName
        }
      : follower
  ) as PrivateCharacter["followers"];

  return {
    ...loaded,
    heldGear,
    followers
  };
}

function createMasterAlphaPhonePatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const masterAlpha = loadMasterAlpha();
  const publicPlayer: PublicPlayer = {
    seatId: "seat-1",
    sectorId: "anchor-market",
    character: {
      id: masterAlpha.id,
      name: masterAlpha.name,
      archetype: masterAlpha.archetype,
      qaOnly: masterAlpha.qaOnly,
      status: masterAlpha.status,
      activeContract: masterAlpha.activeContract,
      stats: masterAlpha.stats,
      trophies: masterAlpha.trophies,
      trophyPile: masterAlpha.trophyPile,
      salvage: masterAlpha.salvage,
      heat: masterAlpha.heat,
      wounds: masterAlpha.wounds,
      scars: masterAlpha.scars,
      heldGearCount: masterAlpha.heldGear.length,
      followerCount: masterAlpha.followers?.length ?? 0,
      companionBadges: (masterAlpha.followers ?? []).map((follower) => ({
        id: follower.id,
        name: follower.name,
        tier: follower.tier,
        ultimateCompanion: follower.ultimateCompanion,
        exhausted: follower.exhausted
      })),
      equippedGear: masterAlpha.equippedGear
    }
  };

  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "single-player",
    gameMode: "standard",
    interactionMode: "co-op",
    winnerSeatId: null,
    activeScenario: null,
    scenarioTelemetry: [],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [{ seatId: "seat-1", characterId: masterAlpha.id, displayName: "QA", connected: true, ready: true, kicked: false }],
    turnOrder: ["seat-1"],
    sectors: [
      {
        id: "anchor-market",
        name: "Anchor Market",
        regionTier: "outer",
        neighbors: ["ashwake-crossing"],
        danger: 2,
        threatIcons: ["yellow"],
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "outer",
        neighbors: ["anchor-market"],
        danger: 1,
        threatIcons: ["red"],
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    players: [publicPlayer],
    escalationLevel: 0,
    escalationThreshold: 8,
    escalationModifier: 0,
    availableContracts: [],
    encounter: {
      id: "smoke-leech-clutch",
      title: longEnemyName,
      cardType: "enemy",
      enemyName: longEnemyName,
      flavor: "A long-name hostile used to validate wrapping, truncation, and card art protection.",
      difficulty: 10,
      stat: "grit"
    },
    pendingEnemyRoll: null,
    outcomeSummary: null,
    activeResolution: {
      id: "qa-resolution",
      playerId: "seat-1",
      source: "threat",
      stage: "roll_result",
      card: {
        id: "smoke-leech-clutch",
        title: longEnemyName,
        type: "enemy",
        flavor: "A long-name hostile used to validate wrapping, truncation, and card art protection."
      },
      battle: {
        enemyName: longEnemyName,
        stat: "grit",
        difficulty: 10,
        modifiers: [{ label: "Enemy", value: 10 }]
      },
      roll: {
        dice: [6, 5],
        baseTotal: 11,
        modifierTotal: 20,
        finalTotal: 31,
        target: 18,
        success: true
      },
      outcome: {
        title: "Victory",
        text: `${longEnemyName} added to Trophy Pile. MASTER ALPHA stress result with gear, follower, and modifier overflow.`,
        effects: ["Gain trophies", "Show overflow text"]
      }
    },
    self: {
      seatId: "seat-1",
      sectorId: "anchor-market",
      hand: [],
      notes: ["Long state note for UI validation"],
      character: masterAlpha
    },
    movementPlanner: {
      active: true,
      movementValue: 4,
      currentSectorId: "anchor-market",
      currentSectorName: "Anchor Market",
      destinations: [
        {
          sectorId: "ashwake-crossing",
          name: "Ashwake Crossing",
          ring: "outer",
          distance: 1,
          route: ["anchor-market", "ashwake-crossing"],
          routeNames: ["Anchor Market", "Ashwake Crossing"],
          tags: ["shop", "crossroads"],
          threatIcons: ["red", "yellow"],
          ruleText: "Read the public sector text and choose whether to risk the route.",
          loreText: "A public route used for movement-planner validation.",
          faceUpThreats: [
            {
              instanceId: "threat-1",
              cardId: "smoke-leech-clutch",
              name: longEnemyName,
              type: "enemy",
              deck: "red",
              challenge: { stat: "grit", value: 10 },
              blocksShop: true,
              blocksSectorText: true
            }
          ],
          occupants: [{ playerId: "seat-1", name: "QA", characterName: "MASTER ALPHA" }],
          strategicTags: ["locked", "danger", "shop"]
        }
      ]
    },
    shopEncounter: {
      sectorId: "anchor-market",
      sectorName: "Anchor Market",
      shopId: "anchor-market",
      shopName: "Anchor Market",
      status: "locked",
      activePlayer: {
        playerId: "seat-1",
        name: "QA",
        characterName: "MASTER ALPHA",
        salvage: 99,
        heat: 0,
        wounds: { current: 0, max: 12 },
        trophies: 99,
        completedContracts: 0
      },
      blockingThreats: [
        {
          cardId: "smoke-leech-clutch",
          name: longEnemyName,
          type: "enemy",
          deck: "red",
          challenge: { stat: "grit", value: 10 }
        }
      ],
      services: [
        {
          id: "buy-gear",
          label: "Buy Gear",
          cost: { salvage: 3 },
          enabled: false,
          disabledReason: "Clear local threat first"
        }
      ],
      revealedStock: [
        {
          cardId: "qa_alpha_weapon_02",
          name: longGearName,
          type: "gear",
          cost: { salvage: 4 },
          summary: "Long stock entry validates wrapping, badges, and affordability state.",
          affordable: true
        }
      ],
      recentOutcome: null
    },
    recentAbilityTriggers: [],
    nemesis: null,
    soloReroll: { available: true, charges: 1 }
  };

  return {
    ...patch,
    ...overrides
  };
}

function createHostPatch(phonePatch = createMasterAlphaPhonePatch()): StatePatch<PublicPatchPayload> {
  const { phase: _phase, self: _self, movementPlanner: _movementPlanner, soloReroll: _soloReroll, boundNemesis: _boundNemesis, crownKeyFragments: _crownKeyFragments, eligibleNemesisAssistSeatIds: _assist, ...payload } = phonePatch;

  return {
    type: "STATE_PATCH",
    sessionId: "QA01",
    sequence: 1,
    phase: phonePatch.phase,
    payload
  };
}

function catalogFromMasterAlpha(): CharacterCatalogEntry[] {
  const masterAlpha = loadMasterAlpha();

  return [
    {
      ...masterAlpha,
      qaOnly: true
    }
  ];
}

describe("Ashen Reach UI validation stress states", () => {
  it("renders MASTER ALPHA full inventory without dropping long gear or follower names", () => {
    render(<PhoneInventoryPanel patch={createMasterAlphaPhonePatch()} onIntent={vi.fn()} />);

    const inventory = screen.getByLabelText("Inventory");

    expect(within(inventory).getByText(longGearName)).toBeInTheDocument();
    expect(within(inventory).getByText(longFollowerName)).toBeInTheDocument();
    expect(within(inventory).getByText("Emergency Med-Stim x5")).toBeInTheDocument();
    expect(within(inventory).getByText("Void Charge x5")).toBeInTheDocument();
    expect(inventory.querySelectorAll(".phone-inventory-card")).toHaveLength(11);
    expect(inventory).toHaveClass("phone-inventory-panel-overflow");
    expect(inventory).toHaveAttribute("data-item-count", "11");
    expect(inventory.querySelector(".phone-inventory-card-list")).toBeInTheDocument();
  });

  it("keeps phone turn actions split into Move, Battle, Shop, and Action tabs under a mixed stress state", () => {
    render(<PhoneActionPanel characters={catalogFromMasterAlpha()} patch={createMasterAlphaPhonePatch()} onIntent={vi.fn()} />);

    const tabs = screen.getByRole("tablist", { name: /turn actions/i });
    const turnTabs = within(tabs).getAllByRole("tab");
    const getTabByLabel = (label: string) => turnTabs.find((tab) => within(tab).queryByText(label))!;
    const moveTab = getTabByLabel("Move");
    const battleTab = getTabByLabel("Battle");
    const shopTab = getTabByLabel("Shop");
    const actionTab = getTabByLabel("Action");

    expect(moveTab).toBeInTheDocument();
    expect(battleTab).toBeInTheDocument();
    expect(shopTab).toBeInTheDocument();
    expect(actionTab).toBeInTheDocument();
    expect(moveTab).toHaveClass("game-button");
    expect(battleTab).toHaveClass("game-button-battle");
    expect(shopTab).toHaveClass("game-button-shop");
    expect(actionTab).toHaveClass("game-button-action");
    expect(screen.getByTestId("movement-planner")).toHaveTextContent("Move 4");

    fireEvent.click(shopTab);

    const shopPanel = screen.getByRole("tabpanel", { name: /shop actions/i });

    expect(shopPanel).toHaveTextContent("Shop locked");
    expect(shopPanel).toHaveTextContent(longEnemyName);

    fireEvent.click(battleTab);

    expect(screen.getByRole("tabpanel", { name: /battle actions/i })).toHaveTextContent(longEnemyName);
    expect(screen.getByText(/roll result/i)).toBeInTheDocument();
  });

  it("keeps the pre-game locked character screen readable for MASTER ALPHA and hides bottom nav", () => {
    const patch = createMasterAlphaPhonePatch({
      phase: "start",
      status: "lobby",
      activeResolution: null,
      encounter: null,
      movementPlanner: null,
      shopEncounter: null,
      seats: [{ seatId: "seat-1", characterId: "char_master_alpha", displayName: "QA", connected: true, ready: false, kicked: false }]
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="QA01"
        displayName="QA"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={patch}
        characters={catalogFromMasterAlpha()}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
        onLobbyBack={vi.fn()}
      />
    );

    expect(screen.getByText(/character locked/i)).toBeInTheDocument();
    expect(screen.getByText("MASTER ALPHA")).toBeInTheDocument();
    expect(screen.getByText(/QA ONLY - The Broken Commander/i)).toBeInTheDocument();
    expect(screen.getByText(longGearName)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /inventory/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ready$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
  });

  it("renders persistent phone navigation and turn actions through the shared GameButton primitive after game start", () => {
    const patch = createMasterAlphaPhonePatch();

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="QA01"
        displayName="QA"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={catalogFromMasterAlpha()}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
        onLobbyBack={vi.fn()}
      />
    );

    const navigation = screen.getByRole("tablist", { name: /phone navigation/i });
    const inventoryTab = within(navigation).getByRole("tab", { name: /inventory/i });

    expect(inventoryTab).toHaveClass("game-button", "game-button-action");
    expect(within(navigation).getByRole("tab", { name: /player card/i })).toHaveClass("game-button");
    expect(within(navigation).getByRole("tab", { name: /^quest$/i })).toHaveClass("game-button-shop");
    expect(within(navigation).getByRole("tab", { name: /^move$/i })).toHaveClass("game-button-move");
    expect(within(navigation).getByRole("tab", { name: /^battle$/i })).toHaveClass("game-button-battle");
    expect(within(navigation).getByRole("tab", { name: /^shop$/i })).toHaveClass("game-button-shop");
    expect(within(navigation).getByRole("tab", { name: /^action$/i })).toHaveClass("game-button-action");
    expect(within(navigation).queryByRole("tab", { name: /log/i })).not.toBeInTheDocument();
  });

  it("shows compact blocked reasons on disabled phone action tabs", () => {
    const patch = createMasterAlphaPhonePatch({
      phase: "action",
      encounter: null,
      activeResolution: null,
      pendingEnemyRoll: null,
      shopEncounter: null,
      movementPlanner: {
        active: true,
        movementValue: 4,
        currentSectorId: "anchor-market",
        currentSectorName: "Anchor Market",
        destinations: []
      }
    });

    render(<PhoneActionPanel characters={catalogFromMasterAlpha()} patch={patch} onIntent={vi.fn()} />);

    const tabs = screen.getByRole("tablist", { name: /turn actions/i });
    const turnTabs = within(tabs).getAllByRole("tab");
    const getTabByLabel = (label: string) => turnTabs.find((tab) => within(tab).queryByText(label))!;
    const moveTab = getTabByLabel("Move");
    const battleTab = getTabByLabel("Battle");
    const shopTab = getTabByLabel("Shop");

    expect(moveTab).toHaveAttribute("aria-disabled", "true");
    expect(moveTab).toHaveTextContent("Move locked: no legal destination.");
    expect(moveTab).toHaveAttribute("title", "Move locked: no legal destination.");
    expect(battleTab).toHaveAttribute("aria-disabled", "true");
    expect(battleTab).toHaveTextContent("Battle locked: no enemy here.");
    expect(shopTab).toHaveAttribute("aria-disabled", "true");
    expect(shopTab).toHaveTextContent("Shop locked: no shop here.");
  });

  it("keeps host battle identity headers outside portrait art and uses a three-panel result core", () => {
    const patch = createHostPatch();
    const activePlayer = patch.payload.players[0]!;

    render(<HostBattleOverlay patch={patch} activePlayer={activePlayer} />);

    const playerPanel = screen.getByTestId("host-battle-player");
    const enemyPanel = screen.getByTestId("host-battle-enemy");
    const playerHeader = playerPanel.querySelector(".host-battle-copy");
    const playerPortrait = playerPanel.querySelector(".host-battle-portrait");
    const enemyHeader = enemyPanel.querySelector(".host-battle-copy");
    const enemyPortrait = enemyPanel.querySelector(".host-battle-portrait");

    expect(playerHeader).toHaveTextContent("MASTER ALPHA");
    expect(enemyHeader).toHaveTextContent(longEnemyName);
    expect(playerPortrait).not.toContainElement(playerHeader as HTMLElement);
    expect(enemyPortrait).not.toContainElement(enemyHeader as HTMLElement);
    const battleRolls = screen.getByTestId("host-battle-rolls");
    expect(battleRolls).toHaveTextContent("31");
    expect(screen.getByTestId("host-battle-player-math")).toHaveTextContent(/Grit 20 \+ Roll 11 = Total 31/i);
    expect(screen.getByTestId("host-battle-enemy-math")).toHaveTextContent(/Difficulty 10 = Total 18/i);
    expect(screen.getByTestId("battle-dice-animation")).toBeInTheDocument();
    expect(screen.getByTestId("battle-dice-animation")).toHaveClass("dice-roll-scene-dom");
    expect(screen.getByTestId("host-battle-result-banner")).toHaveTextContent(/success/i);
    expect(screen.getAllByTestId("combat-dice-animation")).toHaveLength(1);
    expect(screen.queryByTestId("host-battle-log")).not.toBeInTheDocument();
    expect(screen.queryByText(/player total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/opposition total/i)).not.toBeInTheDocument();
  });

  it("shows a host shop encounter as a public service stage without exposing private inventory names", () => {
    const phonePatch = createMasterAlphaPhonePatch({
      phase: "action",
      activeResolution: null,
      encounter: null,
      pendingEnemyRoll: null
    });
    const patch = createHostPatch(phonePatch);
    const activePlayer = patch.payload.players[0]!;

    render(<HostShopOverlay patch={patch} activePlayer={activePlayer} />);

    expect(screen.getByTestId("host-shop-overlay")).toHaveTextContent("Shop Blocked");
    expect(screen.getByTestId("host-shop-status-panel")).toHaveTextContent("Anchor Market");
    expect(screen.getByTestId("host-shop-overlay")).toHaveTextContent(/shop blocked by threat/i);
    expect(screen.getByTestId("host-shop-overlay")).not.toHaveTextContent(/^vs$/i);
    expect(screen.queryByText("Void-Cleaver Command Blade")).not.toBeInTheDocument();
  });
});
