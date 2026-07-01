// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CharacterCatalogEntry,
  PublicPatchPayload,
  ScenarioCatalogEntry,
  StatePatch
} from "../../shared/types.js";
import { TvApp } from "../TvApp.js";

const mockUseRoomSubscription = vi.fn();
const mockCreateSession = vi.fn();
const mockFetchCharacters = vi.fn();
const mockFetchScenarios = vi.fn();
const mockFetchSessionSummary = vi.fn();
const mockStartSession = vi.fn();

vi.mock("../../shared/useRoomSubscription.js", () => ({
  useRoomSubscription: (config: unknown) => mockUseRoomSubscription(config)
}));

vi.mock("../../shared/network.js", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  fetchCharacters: (...args: unknown[]) => mockFetchCharacters(...args),
  fetchScenarios: (...args: unknown[]) => mockFetchScenarios(...args),
  fetchSessionSummary: (...args: unknown[]) => mockFetchSessionSummary(...args),
  startSession: (...args: unknown[]) => mockStartSession(...args)
}));

vi.mock("../TacticalMapBoard.js", () => ({
  TacticalMapBoard: () => <div>Tactical map</div>
}));

vi.mock("../HostPlayerCard.js", () => ({
  HostPlayerCard: (props: { characterName?: string | null; contractSummary?: string | null }) => (
    <div>
      Host card {props.characterName ?? "empty"} {props.contractSummary ?? ""}
    </div>
  )
}));

vi.mock("../JoinQrCard.js", () => ({
  JoinQrCard: (props: { roomCode: string }) => <div>Join QR {props.roomCode}</div>
}));

const characters: CharacterCatalogEntry[] = [
  {
    id: "void-marshal",
    name: "Tarek Voss",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 },
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

const scenarios: ScenarioCatalogEntry[] = [
  {
    id: "scenario_broken_seal",
    name: "The Broken Seal",
    theme: "An ancient prison has cracked open.",
    difficulty: "easy-medium",
    pressureRule: "Seal pressure degrades at the start of each turn.",
    expectedDuration: "45-60 min",
    nemesis: null,
    setup: ["Place 6 Seal tokens on this scenario sheet."],
    specialRules: ["At the start of each player's turn, roll 1 die."],
    confrontationTitle: "Reseal the Prison",
    confrontationSteps: ["Test Strength 10."],
    victoryText: "Pass at least two tests to win."
  },
  {
    id: "scenario_dying_star",
    name: "The Dying Star",
    theme: "The system's sun is collapsing.",
    difficulty: "hard",
    pressureRule: "Star tokens burn down at the end of each turn.",
    expectedDuration: "50-70 min",
    nemesis: {
      name: "Kharvox",
      title: "The Red Maw",
      faction: "Red Maw Raiders"
    },
    setup: ["Place 10 Star tokens on this scenario sheet."],
    specialRules: ["At the end of each player's turn, remove 1 Star token."],
    confrontationTitle: "Ignite the Core",
    confrontationSteps: ["Test Cunning 12."],
    victoryText: "Pass all ignition steps to win."
  }
];

function createPatch(roomCode = "RT7P4"): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: roomCode,
    sequence: 1,
    phase: "start",
    payload: {
      status: "lobby",
      sessionMode: "multiplayer",
      winnerSeatId: null,
      activeScenario: {
        id: "scenario_broken_seal",
        name: "The Broken Seal",
        theme: "An ancient prison has cracked open.",
        difficulty: "easy-medium",
        pressureSummary: "Keep the seals intact.",
        confrontationTitle: "Reseal the Prison",
        progressLabel: "Seals",
        progress: 2,
        threshold: 6,
        setup: ["Place 6 Seal tokens on this scenario sheet."],
        specialRules: ["At the start of each player's turn, roll 1 die."],
        confrontationSteps: ["Test Strength 10."],
        victoryText: "Pass at least two tests to win."
      },
      scenarioTelemetry: [],
      scenarioProgress: { seals: 2 },
      seats: [
        {
          seatId: "seat-1",
          characterId: "void-marshal",
          displayName: "Joel",
          connected: true,
          ready: true,
          kicked: false
        }
      ],
      sectors: [
        {
          id: "ashwake-crossing",
          name: "Ashwake Crossing",
          regionTier: "borderlight",
          neighbors: [],
          danger: 2,
          encounterDecks: {
            threat: [],
            anomaly: [],
            contract: [],
            artifact: [],
            escalation: []
          }
        }
      ],
      players: [
        {
          seatId: "seat-1",
          sectorId: "ashwake-crossing",
          character: {
            id: "void-marshal",
            name: "Tarek Voss",
            archetype: "Void Marshal",
            status: "active",
            activeContract: {
              contractId: "cartel-crossing-thread",
              progress: 1
            },
            stats: { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 },
            trophies: 0,
            heat: 0,
            wounds: 0,
            scars: [],
            heldGearCount: 0,
            equippedGear: { weapon: null, armor: null, utility: null }
          }
        }
      ],
      activeSeatIndex: 0,
      turnOrder: ["seat-1"],
      escalationLevel: 0,
      escalationThreshold: 6,
      escalationModifier: 0,
      availableContracts: [
        {
          id: "cartel-crossing-thread",
          name: "Crossing Thread",
          factionGiver: "Pale Cartels",
          text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.",
          objective: {
            type: "spaceTextResolved",
            effectKey: "outer_ashwakeClearLane",
            label: "Clear the Ashwake convoy lane",
            target: 1
          }
        }
      ],
      encounter: null,
      pendingEnemyRoll: null,
      outcomeSummary: null,
      shopEncounter: null,
      recentAbilityTriggers: [],
      nemesis: null
    }
  };
}

describe("TvApp", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockFetchCharacters.mockResolvedValue(characters);
    mockFetchScenarios.mockResolvedValue(scenarios);
    mockFetchSessionSummary.mockResolvedValue({
      roomCode: "RT7P4",
      sessionMode: "multiplayer",
      gameMode: "standard",
      interactionMode: "rivalry",
      playerCount: 6,
      seats: [],
      status: "lobby",
      phase: "start"
    });
    mockCreateSession.mockResolvedValue({
      roomCode: "RT7P4",
      hostToken: "host:RT7P4:secret",
      sessionMode: "multiplayer",
      gameMode: "standard",
      interactionMode: "rivalry",
      scenarioId: "scenario_broken_seal",
      playerCount: 6
    });
    mockStartSession.mockResolvedValue(undefined);
    mockUseRoomSubscription.mockReturnValue({
      patch: null,
      error: null,
      sendIntent: vi.fn(),
      status: "idle",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
  });

  it("enables the restored dashboard when host token and room code are stored", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    mockUseRoomSubscription.mockReturnValue({
      patch: createPatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    await screen.findByText("Join QR RT7P4");
    const banner = await screen.findByTestId("host-state-banner");
    expect(banner).toHaveTextContent(/ready check/i);
    expect(banner).toHaveTextContent(/all joined operatives are ready/i);
    expect(screen.queryByRole("button", { name: /show debug/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/tv debug/i)).not.toBeInTheDocument();
    expect(screen.getByText("Ashen Reach TV")).toBeInTheDocument();
    expect(mockUseRoomSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "tv",
        enabled: true,
        hostToken: "host:RT7P4:secret"
      })
    );
  });

  it("blocks host start until joined players are ready", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.seats[0] = { ...patch.payload.seats[0]!, ready: false };
    patch.payload.seats.push({
      seatId: "seat-2",
      characterId: "signal-witch",
      displayName: "Mira",
      connected: true,
      ready: true,
      kicked: false
    });
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByRole("button", { name: /start session/i })).toBeDisabled();
    expect(screen.getByText(/waiting for player to press ready/i)).toBeInTheDocument();
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/waiting for all players to ready/i);

    fireEvent.click(screen.getByRole("button", { name: /start session/i }));

    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it("enables single-player start with one occupied ready character", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.sessionMode = "single-player";
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByText(/single-player ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start session/i }));

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith("RT7P4");
    });
  });

  it("keeps multiplayer start blocked below the minimum occupied player count", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    mockUseRoomSubscription.mockReturnValue({
      patch: createPatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByRole("button", { name: /start session/i })).toBeDisabled();
    expect(screen.getByText(/need at least 2 players/i)).toBeInTheDocument();
  });

  it("tells the host when an occupied seat still needs a character", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.sessionMode = "single-player";
    patch.payload.seats[0] = { ...patch.payload.seats[0]!, characterId: "", ready: true };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByRole("button", { name: /start session/i })).toBeDisabled();
    expect(screen.getByText(/waiting for player to choose character/i)).toBeInTheDocument();
  });

  it("renders the create flow when nothing is stored", async () => {
    render(<TvApp />);

    const createMultiplayer = await screen.findByRole("button", { name: /create multiplayer/i });
    expect(createMultiplayer).toBeDisabled();
    expect(screen.getByRole("button", { name: /create single-player/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /mission protocol/i })).toHaveTextContent(/start game locked/i);
    expect(mockUseRoomSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false
      })
    );
  });

  it("clears stale restored storage and falls back to the create flow", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "OLD99");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:OLD99:secret");
    mockFetchSessionSummary.mockRejectedValue(new Error("Unknown room code"));

    render(<TvApp />);

    await screen.findByText(/previous session ended/i);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /create multiplayer/i }).length).toBeGreaterThan(0);
    });
    expect(window.localStorage.getItem("ashen-reach-tv-room-code")).toBeNull();
    expect(window.localStorage.getItem("ashen-reach-tv-host-token")).toBeNull();
    expect(mockUseRoomSubscription).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
        hostToken: null
      })
    );
  });

  it("stores room code after creating a session", async () => {
    render(<TvApp />);

    fireEvent.click(await screen.findByRole("button", { name: /co-op/i }));
    fireEvent.click((await screen.findAllByRole("button", { name: /create multiplayer/i }))[0]!);

    await waitFor(() => {
      expect(window.localStorage.getItem("ashen-reach-tv-room-code")).toBe("RT7P4");
    });
    expect(window.localStorage.getItem("ashen-reach-tv-host-token")).toBe("host:RT7P4:secret");
  });

  it("sends the selected scenario id when the host creates a room", async () => {
    mockCreateSession.mockResolvedValue({
      roomCode: "STAR1",
      hostToken: "host:STAR1:secret",
      sessionMode: "multiplayer",
      gameMode: "standard",
      interactionMode: "rivalry",
      scenarioId: "scenario_dying_star",
      playerCount: 6
    });

    render(<TvApp />);

    const scenarioSelect = (await screen.findAllByRole("combobox"))[0]!;
    fireEvent.change(scenarioSelect, { target: { value: "scenario_dying_star" } });
    fireEvent.click(screen.getByRole("button", { name: /rivalry/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_dying_star", "rivalry", "standard", 6);
    });
  });

  it("uses the selected scenario for single-player creation too", async () => {
    mockCreateSession.mockResolvedValue({
      roomCode: "STAR2",
      hostToken: "host:STAR2:secret",
      sessionMode: "single-player",
      gameMode: "standard",
      interactionMode: "co-op",
      scenarioId: "scenario_dying_star",
      playerCount: 1
    });

    render(<TvApp />);

    const scenarioSelect = (await screen.findAllByRole("combobox"))[0]!;
    fireEvent.change(scenarioSelect, { target: { value: "scenario_dying_star" } });
    fireEvent.click(screen.getByRole("button", { name: /create single-player/i }));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("single-player", "scenario_dying_star", "co-op", "standard", 1);
    });
  });

  it("sends Nemesis Relay as the selected game mode when creating a room", async () => {
    mockCreateSession.mockResolvedValue({
      roomCode: "RELAY",
      hostToken: "host:RELAY:secret",
      sessionMode: "multiplayer",
      gameMode: "nemesis_relay",
      interactionMode: "co-op",
      scenarioId: "scenario_broken_seal",
      playerCount: 4
    });

    render(<TvApp />);

    const gameModeSelect = (await screen.findAllByRole("combobox"))[1]!;
    fireEvent.change(gameModeSelect, { target: { value: "nemesis_relay" } });
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_broken_seal", "co-op", "nemesis_relay", 4);
    });
  });

  it("sends the selected multiplayer player count when creating a room", async () => {
    mockCreateSession.mockResolvedValue({
      roomCode: "DUO22",
      hostToken: "host:DUO22:secret",
      sessionMode: "multiplayer",
      gameMode: "standard",
      interactionMode: "co-op",
      scenarioId: "scenario_broken_seal",
      playerCount: 2
    });

    render(<TvApp />);

    const playerCountSelect = (await screen.findAllByRole("combobox"))[2]!;
    fireEvent.change(playerCountSelect, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /co-op/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_broken_seal", "co-op", "standard", 2);
    });
  });

  it("shows a scenario briefing preview and updates it when the host changes the picker", async () => {
    render(<TvApp />);

    expect(await screen.findByText(/scenario briefing/i)).toBeInTheDocument();
    expect(screen.getByText(/seal pressure degrades at the start of each turn/i)).toBeInTheDocument();
    expect(screen.getByText(/no linked nemesis/i)).toBeInTheDocument();

    const scenarioSelect = screen.getAllByRole("combobox")[0]!;
    fireEvent.change(scenarioSelect, { target: { value: "scenario_dying_star" } });

    expect(screen.getByText(/the system's sun is collapsing/i)).toBeInTheDocument();
    expect(screen.getByText(/star tokens burn down at the end of each turn/i)).toBeInTheDocument();
    expect(screen.getByText(/kharvox \| the red maw/i)).toBeInTheDocument();
    expect(screen.getByText(/50-70 min/i)).toBeInTheDocument();
  });

  it("surfaces scenario victory copy when the session has ended with a winner", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const endedPatch = createPatch();
    endedPatch.payload.status = "ended";
    endedPatch.payload.winnerSeatId = "seat-1";
    mockUseRoomSubscription.mockReturnValue({
      patch: endedPatch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect((await screen.findAllByText(/the broken seal secured/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/joel won the confrontation and secured the broken seal/i).length).toBeGreaterThan(0);
    const banner = screen.getByTestId("host-state-banner");
    expect(banner).toHaveTextContent(/game over/i);
    expect(banner).toHaveTextContent(/joel secured the final outcome/i);
  });

  it("shows authored contract objective labels on the host operative card", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    mockUseRoomSubscription.mockReturnValue({
      patch: createPatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByText(/host card tarek voss crossing thread \| clear the ashwake convoy lane \(1\/1 clears\)/i)).toBeInTheDocument();
  });

  it("keeps movement planner details on the board instead of duplicating Movement Scan in the right rail", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "navigation";
    patch.payload.status = "active";
    patch.payload.movementPlanner = {
      active: true,
      movementValue: 4,
      currentSectorId: "ashwake-crossing",
      currentSectorName: "Ashwake Crossing",
      destinations: [
        {
          sectorId: "outer_anchor_market",
          name: "Anchor Market",
          ring: "outer",
          distance: 4,
          route: ["ashwake-crossing", "glassmere-spindle", "hollow-veil-yard", "outer_waymarket", "outer_anchor_market"],
          routeNames: ["Ashwake Crossing", "Glassmere Spindle", "Hollow Veil Yard", "Anchor Market", "Anchor Market"],
          tags: ["shop"],
          threatIcons: ["yellow"],
          ruleText: "Trade if the sector is clear.",
          faceUpThreats: [],
          occupants: [],
          strategicTags: ["shop"]
        }
      ]
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByText(/sector brief/i)).toBeInTheDocument();
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/waiting on tarek voss to choose a legal destination/i);
    expect(screen.queryByText(/movement scan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/movement value/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exact legal routes are highlighted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trade if the sector is clear/i)).not.toBeInTheDocument();
  });

  it("renders battle setup through the host battle overlay without a duplicate card tray", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.activeResolution = {
      id: "seat-1:threat:cinder-veil-stalker:test",
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        type: "enemy",
        flavor: "The ash around it begins to boil.",
        artType: "threat"
      },
      battle: {
        enemyName: "Cinder-Veil Stalker",
        stat: "grit",
        difficulty: 8,
        modifiers: [{ label: "Grit", value: 2 }]
      }
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const overlay = await screen.findByTestId("host-battle-overlay");
    const banner = screen.getByTestId("host-state-banner");
    expect(banner).toHaveTextContent(/battle resolving/i);
    expect(banner).toHaveTextContent(/cinder-veil stalker/i);
    expect(overlay).toHaveTextContent(/tarek voss/i);
    expect(overlay).toHaveTextContent(/cinder-veil stalker/i);
    expect(overlay).toHaveTextContent(/grit\s*2/i);
    expect(overlay).toHaveTextContent(/battle\s*8/i);
    expect(within(overlay).getByTestId("host-battle-fx-layer")).toBeInTheDocument();
    expect(screen.queryByTestId("tv-card-reveal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
  });

  it("renders active dice faces and roll totals from activeResolution", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "resolution";
    patch.payload.status = "active";
    patch.payload.activeResolution = {
      id: "seat-1:threat:signal-static:test",
      playerId: "seat-1",
      source: "threat",
      stage: "roll_result",
      card: {
        id: "signal-static",
        title: "Signal Static",
        type: "hazard",
        artType: "threat"
      },
      battle: {
        stat: "signal",
        difficulty: 7,
        modifiers: [{ label: "Signal", value: 1 }]
      },
      roll: {
        dice: [2, 5],
        baseTotal: 7,
        modifierTotal: 1,
        finalTotal: 8,
        target: 7,
        success: true
      },
      outcome: {
        title: "Check passed",
        text: "Success: the signal holds.",
        effects: ["Success: the signal holds."]
      }
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByTestId("roll-outcome-panel")).toHaveTextContent(/success: the signal holds/i);
    expect(screen.getByTestId("host-dice-roll-scene")).toHaveTextContent("A 8 / D 7 / +1");
    expect(screen.getByTestId("roll-state")).toHaveTextContent(/success/i);
    expect(screen.getAllByTestId("roll-die")).toHaveLength(2);
    expect(screen.getByTestId("roll-total")).toHaveTextContent("8");
    expect(screen.getByTestId("roll-difficulty")).toHaveTextContent("7");
  });

  it("renders a shop encounter overlay when the active operative reaches a shop sector", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.sectors = [
      {
        id: "outer_waymarket",
        name: "Anchor Market",
        regionTier: "outer",
        neighbors: [],
        danger: 1,
        threatIcons: ["yellow"],
        encounterDecks: {
          threat: [],
          anomaly: [],
          contract: [],
          artifact: [],
          escalation: []
        }
      }
    ];
    patch.payload.players[0] = {
      ...patch.payload.players[0],
      sectorId: "outer_waymarket",
      character: {
        ...patch.payload.players[0].character,
        salvage: 6,
        trophies: 3,
        heat: 1,
        wounds: 2,
        heldGearCount: 1
      }
    };
    patch.payload.shopEncounter = {
      sectorId: "outer_waymarket",
      sectorName: "Anchor Market",
      shopId: "outer_waymarket",
      shopName: "Anchor Market",
      status: "open",
      activePlayer: {
        playerId: "seat-1",
        name: "Tarek Voss",
        characterName: "Tarek Voss",
        salvage: 6,
        heat: 1,
        wounds: { current: 2, max: 6 },
        trophies: 3,
        completedContracts: 1
      },
      blockingThreats: [],
      services: [
        {
          id: "buy-gear",
          label: "Buy Gear",
          cost: { salvage: 3 },
          enabled: true
        },
        {
          id: "risk-action",
          label: "Risk Action",
          cost: { heat: 1 },
          risk: "+1 Heat",
          enabled: true
        }
      ]
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const overlay = await screen.findByTestId("host-shop-overlay");
    const banner = screen.getByTestId("host-state-banner");
    expect(banner).toHaveTextContent(/shop open/i);
    expect(banner).toHaveTextContent(/waiting on tarek voss/i);
    expect(banner).toHaveTextContent(/anchor market/i);
    expect(overlay).toHaveTextContent(/shop encounter/i);
    expect(overlay).toHaveTextContent(/tarek voss/i);
    expect(overlay).toHaveTextContent(/anchor market/i);
    expect(overlay).toHaveTextContent(/salvage/i);
    expect(overlay).toHaveTextContent("6");
    expect(overlay).toHaveTextContent(/buy gear/i);
    expect(overlay).toHaveTextContent(/shop stock - anchor market/i);
    expect(overlay).toHaveTextContent(/no stock revealed/i);
    expect(overlay).toHaveTextContent(/choose service on phone/i);
    expect(within(overlay).getByTestId("host-shop-fx-layer")).toBeInTheDocument();
    expect(screen.queryByTestId("host-battle-overlay")).not.toBeInTheDocument();
  });

  it("renders named blocking threats from authoritative shop payload", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.players[0] = {
      ...patch.payload.players[0],
      sectorId: "outer_waymarket",
      character: {
        ...patch.payload.players[0].character,
        salvage: 6
      }
    };
    patch.payload.shopEncounter = {
      sectorId: "outer_waymarket",
      sectorName: "Anchor Market",
      shopId: "outer_waymarket",
      shopName: "Anchor Market",
      status: "locked",
      activePlayer: {
        playerId: "seat-1",
        name: "Tarek Voss",
        characterName: "Tarek Voss",
        salvage: 6,
        heat: 0,
        wounds: { current: 0, max: 6 }
      },
      blockingThreats: [
        {
          cardId: "gate-tax-collectors",
          name: "Gate-Tax Collectors",
          type: "enemy",
          deck: "yellow",
          challenge: { stat: "command", value: 5 }
        }
      ],
      services: []
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const overlay = await screen.findByTestId("host-shop-overlay");
    expect(overlay).toHaveTextContent(/shop locked/i);
    expect(overlay).toHaveTextContent(/gate-tax collectors command 5/i);
    expect(overlay).toHaveTextContent(/clear threats before trade/i);
    expect(within(screen.getByLabelText("Shop services")).queryByText(/buy gear/i)).not.toBeInTheDocument();
  });

  it("keeps the shop encounter hidden while battle resolution is active on a shop sector", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "resolution";
    patch.payload.status = "active";
    patch.payload.players[0] = {
      ...patch.payload.players[0],
      sectorId: "outer_waymarket"
    };
    patch.payload.activeResolution = {
      id: "seat-1:threat:cinder-veil-stalker:test",
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        type: "enemy",
        flavor: "The ash around it begins to boil.",
        artType: "threat"
      },
      battle: {
        enemyName: "Cinder-Veil Stalker",
        stat: "grit",
        difficulty: 8,
        modifiers: [{ label: "Grit", value: 2 }]
      }
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByTestId("host-battle-overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("host-shop-overlay")).not.toBeInTheDocument();
  });

  it("renders the cinematic host battle overlay and hides inactive operative cards", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "resolution";
    patch.payload.status = "active";
    patch.payload.seats.push({
      seatId: "seat-2",
      characterId: "signal-witch",
      displayName: "Pax",
      connected: true,
      ready: true,
      kicked: false
    });
    patch.payload.players.push({
      seatId: "seat-2",
      sectorId: "ashwake-crossing",
      character: {
        id: "signal-witch",
        name: "Lane",
        archetype: "Signal Witch",
        status: "active",
        activeContract: null,
        stats: { command: 1, grit: 1, signal: 4, guile: 2, forge: 1 },
        trophies: 0,
        heat: 0,
        wounds: 0,
        scars: [],
        heldGearCount: 0,
        equippedGear: { weapon: null, armor: null, utility: null }
      }
    });
    patch.payload.activeResolution = {
      id: "seat-1:threat:cinder-veil-stalker:test",
      playerId: "seat-1",
      source: "threat",
      stage: "roll_result",
      card: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        type: "enemy",
        flavor: "The ash around it begins to boil.",
        artType: "threat"
      },
      battle: {
        enemyName: "Cinder-Veil Stalker",
        stat: "grit",
        difficulty: 5,
        modifiers: [
          { label: "grit", value: 6 },
          { label: "Enemy", value: 5 }
        ]
      },
      roll: {
        dice: [4, 1],
        baseTotal: 5,
        modifierTotal: 6,
        finalTotal: 11,
        target: 8,
        success: true
      },
      outcome: {
        title: "Combat victory",
        text: "Success: the stalker breaks. Cinder-Veil Stalker added to Trophy Pile.",
        effects: ["Gain 1 trophy.", "Cinder-Veil Stalker added to Trophy Pile."]
      }
    };
    patch.payload.outcomeSummary = {
      seatId: "seat-1",
      movedToSectorId: "ashwake-crossing",
      encounterCardId: "cinder-veil-stalker",
      encounterTitle: "Cinder-Veil Stalker",
      encounterCardType: "enemy",
      checkStat: "grit",
      die1: 4,
      die2: 1,
      statBonus: 6,
      checkTotal: 11,
      difficulty: 5,
      enemyRollerSeatId: "seat-2",
      enemyDie1: 3,
      enemyDie2: null,
      enemyBonus: 5,
      enemyTotal: 8,
      success: true,
      summary: "Tarek Voss wins the battle. Cinder-Veil Stalker added to Trophy Pile."
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    expect(await screen.findByText("Tactical map")).toBeInTheDocument();
    const overlay = screen.getByTestId("host-battle-overlay");

    expect(overlay).toHaveTextContent(/tarek voss/i);
    expect(overlay).toHaveTextContent(/cinder-veil stalker/i);
    expect(overlay.querySelector("[data-testid='combat-dice-animation']")).toHaveClass("combat-dice-animation-compact");
    expect(overlay.querySelector("[data-testid='combat-die-attack']")).toHaveTextContent("4");
    expect(overlay.querySelector("[data-testid='combat-die-defense']")).toHaveTextContent("3");
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/player total/i);
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent("11");
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/4 \+ 1 \+ grit 6 = 11/i);
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/enemy total/i);
    expect(overlay).toHaveTextContent(/cinder-veil stalker added to trophy pile/i);
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent("8");
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/3 \+ battle 5 = 8/i);
    expect(screen.getByTestId("host-battle-log")).toHaveTextContent(/tarek voss engages cinder-veil stalker/i);
    expect(screen.queryByTestId("roll-outcome-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-card-reveal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
    expect(screen.queryByText(/battle display active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pax/i)).not.toBeInTheDocument();
  });

  it("keeps the visible battle bound to activeResolution.playerId when turn order has advanced", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "resolution";
    patch.payload.status = "active";
    patch.payload.activeSeatIndex = 1;
    patch.payload.turnOrder = ["seat-1", "seat-2"];
    patch.payload.seats.push({
      seatId: "seat-2",
      characterId: "signal-witch",
      displayName: "Pax",
      connected: true,
      ready: true,
      kicked: false
    });
    patch.payload.players.push({
      seatId: "seat-2",
      sectorId: "ashwake-crossing",
      character: {
        id: "signal-witch",
        name: "Lane",
        archetype: "Signal Witch",
        status: "active",
        activeContract: null,
        stats: { command: 1, grit: 1, signal: 4, guile: 2, forge: 1 },
        trophies: 0,
        heat: 0,
        wounds: 0,
        scars: [],
        heldGearCount: 0,
        equippedGear: { weapon: null, armor: null, utility: null }
      }
    });
    patch.payload.activeResolution = {
      id: "seat-1:threat:cinder-veil-stalker:advanced-turn",
      playerId: "seat-1",
      source: "threat",
      stage: "roll_result",
      card: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        type: "enemy",
        flavor: "The ash around it begins to boil.",
        artType: "threat"
      },
      battle: {
        enemyName: "Cinder-Veil Stalker",
        stat: "grit",
        difficulty: 5,
        modifiers: [
          { label: "Grit", value: 6 },
          { label: "Enemy", value: 5 }
        ]
      },
      roll: {
        dice: [4, 1],
        baseTotal: 5,
        modifierTotal: 6,
        finalTotal: 11,
        target: 8,
        success: true
      },
      outcome: {
        title: "Combat victory",
        text: "Success: the stalker breaks.",
        effects: ["Gain 1 trophy."]
      }
    };
    patch.payload.outcomeSummary = {
      seatId: "seat-1",
      movedToSectorId: "ashwake-crossing",
      encounterCardId: "cinder-veil-stalker",
      encounterTitle: "Cinder-Veil Stalker",
      encounterCardType: "enemy",
      checkStat: "grit",
      die1: 4,
      die2: 1,
      statBonus: 6,
      checkTotal: 11,
      difficulty: 5,
      enemyRollerSeatId: "seat-2",
      enemyDie1: 3,
      enemyDie2: 5,
      enemyBonus: 0,
      enemyTotal: 8,
      success: true,
      summary: "Tarek Voss wins the battle."
    };
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const overlay = await screen.findByTestId("host-battle-overlay");

    expect(overlay).toHaveTextContent(/tarek voss/i);
    expect(overlay).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent("11");
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent("8");
    expect(screen.queryByTestId("tv-card-reveal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("roll-outcome-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
    expect(screen.queryByText(/battle display active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/host card lane/i)).not.toBeInTheDocument();
  });
});
