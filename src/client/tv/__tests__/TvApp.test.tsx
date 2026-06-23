// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  HostPlayerCard: (props: { characterName?: string | null }) => <div>Host card {props.characterName ?? "empty"}</div>
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
            activeContract: null,
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
      availableContracts: [],
      encounter: null,
      pendingEnemyRoll: null,
      outcomeSummary: null,
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
      status: "lobby",
      phase: "start"
    });
    mockCreateSession.mockResolvedValue({
      roomCode: "RT7P4",
      hostToken: "host:RT7P4:secret",
      sessionMode: "multiplayer",
      scenarioId: "scenario_broken_seal"
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
    expect(screen.getByText("Ashen Reach TV")).toBeInTheDocument();
    expect(mockUseRoomSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "tv",
        enabled: true,
        hostToken: "host:RT7P4:secret"
      })
    );
  });

  it("renders the create flow when nothing is stored", async () => {
    render(<TvApp />);

    expect(await screen.findByRole("button", { name: /create multiplayer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create single-player/i })).toBeInTheDocument();
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
      scenarioId: "scenario_dying_star"
    });

    render(<TvApp />);

    const scenarioSelect = await screen.findByRole("combobox");
    fireEvent.change(scenarioSelect, { target: { value: "scenario_dying_star" } });
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_dying_star");
    });
  });

  it("uses the selected scenario for single-player creation too", async () => {
    mockCreateSession.mockResolvedValue({
      roomCode: "STAR2",
      hostToken: "host:STAR2:secret",
      sessionMode: "single-player",
      scenarioId: "scenario_dying_star"
    });

    render(<TvApp />);

    const scenarioSelect = await screen.findByRole("combobox");
    fireEvent.change(scenarioSelect, { target: { value: "scenario_dying_star" } });
    fireEvent.click(screen.getByRole("button", { name: /create single-player/i }));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("single-player", "scenario_dying_star");
    });
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

    expect(await screen.findByText(/the broken seal secured/i)).toBeInTheDocument();
    expect(screen.getByText(/joel won the confrontation and secured the broken seal/i)).toBeInTheDocument();
  });
});
