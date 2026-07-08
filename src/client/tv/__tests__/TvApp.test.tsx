// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
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
  JoinQrCard: (props: { roomCode: string; showJoinDetails?: boolean }) => (
    <div data-testid="mock-join-qr" data-show-join-details={String(props.showJoinDetails)}>
      Join QR {props.roomCode}
    </div>
  )
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
    sheetArtPath: "/assets/scenarios/broken-seal.png",
    difficulty: "easy-medium",
    publicDisplay: {
      modeLabel: "Solo / Co-op",
      objective: "Stabilize the Broken Seal before the breach collapses the ward.",
      privacy: "Public scenario pressure only."
    },
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
    sheetArtPath: "/assets/scenarios/relic-core-awakens.png",
    difficulty: "hard",
    publicDisplay: {
      modeLabel: "Ruthless",
      objective: "Ignite the star core before collapse reaches the table.",
      privacy: "Public pressure; private agendas stay on phones."
    },
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
        sheetArtPath: "/assets/scenarios/broken-seal.png",
        difficulty: "easy-medium",
        publicDisplay: {
          modeLabel: "Solo / Co-op",
          objective: "Stabilize the Broken Seal before the breach collapses the ward.",
          privacy: "Public scenario pressure only."
        },
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
      scenarioPressure: {
        scenarioId: "scenario_broken_seal",
        scenarioName: "The Broken Seal",
        mode: "rivalry",
        scenarioStatus: "active",
        pressureTrack: {
          name: "Seal Integrity",
          current: 4,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: false,
          tickTiming: "Round end",
          collapseRule: "Seal collapses when integrity hits 0."
        },
        collapseTrack: {
          name: "Escalation",
          current: 1,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: true,
          tickTiming: "Round end",
          collapseRule: "The run fails at maximum escalation."
        },
        objectiveProgress: {
          label: "Seal Restoration Marks",
          current: 2,
          required: 6,
          completed: false
        },
        publicSummary: "Restore seals while the escalation clock climbs.",
        modeSpecific: {
          kind: "rivalry",
          label: "Rivalry",
          summary: "Public scenario pressure with phone-only private agendas.",
          privateAgenda: "phone-only"
        }
      },
      scenarioProgress: { seals: 2 },
      seats: [
        {
          seatId: "seat-1",
          characterId: "void-marshal",
          displayName: "Joel",
          connected: true,
          ready: true,
          startingMissionSelected: true,
          startingMissionTitle: "Crossing Thread",
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
        },
        {
          id: "cartel-exposed-object",
          name: "Exposed Object",
          factionGiver: "Pale Cartels",
          text: "A public contract pool option that has not been assigned to a player.",
          objective: {
            type: "defeatCount",
            target: 2
          },
          reward: {
            type: "gain_gear",
            gearId: "veil-hook"
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
    expect(screen.getByTestId("mock-join-qr")).toHaveAttribute("data-show-join-details", "true");
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

  it("switches compact QR join details off during active play", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "navigation";
    patch.payload.status = "active";
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    await screen.findByText("Join QR RT7P4");
    expect(screen.getByTestId("mock-join-qr")).toHaveAttribute("data-show-join-details", "false");
  });

  it("shows selected starting mission in setup rows without treating the contract pool as active missions", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.status = "lobby";
    patch.phase = "start";
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const operatives = await screen.findByRole("complementary", { name: /operatives/i });
    expect(operatives).toHaveTextContent(/mission: crossing thread/i);
    const setupMissions = screen.getByRole("region", { name: /setup missions/i });
    expect(setupMissions).toHaveTextContent(/joel/i);
    expect(setupMissions).toHaveTextContent(/crossing thread/i);
    expect(setupMissions).not.toHaveTextContent(/exposed object/i);
  });

  it("renders active player missions from character.activeContract instead of public availableContracts", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "navigation";
    patch.payload.status = "active";
    patch.payload.players[0] = {
      ...patch.payload.players[0],
      character: {
        ...patch.payload.players[0].character,
        activeContract: {
          contractId: "cartel-crossing-thread",
          progress: 1
        }
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

    const activeMissions = await screen.findByRole("region", { name: /active missions/i });
    expect(activeMissions).toHaveTextContent(/joel/i);
    expect(activeMissions).toHaveTextContent(/crossing thread/i);
    expect(activeMissions).toHaveTextContent(/1\/1 clears/i);
    expect(activeMissions).toHaveTextContent(/complete/i);
    expect(activeMissions).not.toHaveTextContent(/exposed object/i);
    expect(activeMissions).not.toHaveTextContent(/0\/2 defeats/i);
    expect(screen.queryByRole("region", { name: /^contracts$/i })).not.toBeInTheDocument();
  });

  it("keeps active host status in one banner without the old bottom strip", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "navigation";
    patch.payload.status = "active";
    patch.payload.sessionMode = "single-player";
    patch.payload.interactionMode = "co-op";
    patch.payload.seats = [
      {
        seatId: "seat-1",
        characterId: "void-marshal",
        displayName: "Joel",
        connected: true,
        ready: true,
        startingMissionSelected: true,
        kicked: false
      }
    ];
    patch.payload.turnOrder = ["seat-1"];
    patch.payload.activeSeatIndex = 0;
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const banner = await screen.findByTestId("host-state-banner");
    expect(banner).toHaveTextContent(/waiting on .*roll movement/i);
    expect(screen.queryByTestId("host-bottom-status-strip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();

    const topBar = screen.getByLabelText(/host status bar/i);
    expect(topBar).toHaveTextContent(/room code/i);
    expect(topBar).toHaveTextContent(/mode/i);
    expect(topBar).toHaveTextContent(/win progress/i);
    expect(topBar).toHaveTextContent(/loss pressure/i);
    expect(within(topBar).getByRole("region", { name: /win progress/i })).toHaveClass("host-progress-relic--win");
    expect(within(topBar).getByRole("region", { name: /loss pressure/i })).toHaveClass("host-progress-relic--loss");
    expect(topBar).not.toHaveTextContent(/round/i);
    expect(topBar).not.toHaveTextContent(/phase/i);
    expect(topBar).not.toHaveTextContent(/global/i);
    expect(screen.queryByText(/global escalation/i)).not.toBeInTheDocument();
  });

  it("places the host state banner as a larger top-right overlay", () => {
    const styles = readFileSync("src/client/styles.css", "utf8");
    const bannerRule = styles.match(/\.host-state-banner\s*\{([^}]*)\}/)?.[1] ?? "";
    const detailRule = styles.match(/\.host-state-banner strong\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(bannerRule).toMatch(/position:\s*absolute/);
    expect(bannerRule).toMatch(/top:\s*clamp/);
    expect(bannerRule).toMatch(/right:\s*clamp/);
    expect(bannerRule).toMatch(/width:\s*min\(42rem,\s*42vw\)/);
    expect(detailRule).toMatch(/font-size:\s*clamp\(1\.09rem,\s*1\.2vw,\s*1\.41rem\)/);
    expect(bannerRule).not.toMatch(/transform:\s*translateX/);
  });

  it("shows scenario sheet art while win progress and loss pressure live in the top bar", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.publicResultDeltas = [
      {
        id: "scenario-progress",
        type: "scenarioProgress",
        label: "Scenario +1",
        value: 1,
        sign: "gain",
        targetScope: "scenario",
        visibility: "public",
        reason: "Contract completed: +1 objective progress.",
        source: "scenario:objective",
        publicText: "Contract completed: +1 objective progress.",
        severity: "scenario"
      }
    ];
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const scenarioCard = await screen.findByRole("region", { name: /^scenario$/i });
    expect(within(scenarioCard).getByTestId("scenario-sheet-art").querySelector("img")).toHaveAttribute(
      "src",
      "/assets/scenarios/broken-seal.png"
    );
    expect(scenarioCard).toHaveTextContent(/stabilize the broken seal/i);
    expect(scenarioCard).not.toHaveTextContent(/win progress/i);
    expect(scenarioCard).not.toHaveTextContent(/loss pressure/i);
    expect(scenarioCard).not.toHaveTextContent(/if this reaches the limit, the scenario fails/i);
    expect(scenarioCard).not.toHaveTextContent(/global escalation/i);
    expect(scenarioCard).toHaveTextContent(/last trigger: contract completed/i);
    const topBar = screen.getByLabelText(/host status bar/i);
    expect(topBar).toHaveTextContent(/win progress/i);
    expect(topBar).toHaveTextContent(/2\/6/i);
    expect(topBar).toHaveTextContent(/loss pressure/i);
    expect(topBar).toHaveTextContent(/1\/6/i);
    expect(within(topBar).getByRole("region", { name: /win progress 2\/6/i })).toHaveClass("host-progress-relic--win");
    expect(within(topBar).getByRole("region", { name: /loss pressure 1\/6/i })).toHaveClass("host-progress-relic--loss");
    expect(screen.queryByRole("region", { name: /global escalation/i })).not.toBeInTheDocument();
    expect(JSON.stringify(patch.payload)).not.toContain("private trigger");
  });

  it("uses a scenario sheet fallback when no canonical art is available", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.activeScenario = {
      ...patch.payload.activeScenario!,
      id: "scenario_mirror_of_false_heroes",
      name: "Mirror of False Heroes",
      sheetArtPath: null,
      publicDisplay: {
        modeLabel: "Rivalry",
        objective: "Break mirror claims before the table turns on itself.",
        privacy: "Private agendas stay on phones."
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

    const scenarioCard = await screen.findByRole("region", { name: /^scenario$/i });
    expect(within(scenarioCard).getByRole("img", { name: /mirror of false heroes scenario sheet art pending/i })).toBeInTheDocument();
    expect(scenarioCard).toHaveTextContent(/break mirror claims/i);
  });

  it("shows only the public rivalry agenda reveal summary on TV", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.rivalryAgendaReveal = {
      seatId: "seat-1",
      playerName: "Tarek Voss",
      title: "Rivalry Agenda",
      summary: "Tarek Voss revealed a Rivalry Agenda.",
      revealedAtRound: 1,
      createdAt: "2026-07-02T12:00:00.000Z"
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

    expect(await screen.findAllByText("Tarek Voss revealed a Rivalry Agenda.")).not.toHaveLength(0);
    expect(screen.queryByText(/claim the black ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/end the run with the table believing/i)).not.toBeInTheDocument();
  });

  it("shows only the public rivalry agenda completion summary on TV", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.rivalryAgendaCompletion = {
      seatId: "seat-1",
      playerName: "Tarek Voss",
      title: "Rivalry Agenda",
      summary: "Tarek Voss completed a Rivalry Agenda.",
      pointsAwarded: 1,
      createdAt: "2026-07-02T12:10:00.000Z"
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

    expect(await screen.findAllByText("Tarek Voss completed a Rivalry Agenda.")).not.toHaveLength(0);
    expect(screen.queryByText(/own the contract record/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/close contracts while everyone else argues/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rivalry point/i)).not.toBeInTheDocument();
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
      startingMissionSelected: true,
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
    expect(screen.getByText(/waiting for Joel to press ready/i)).toBeInTheDocument();
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

  it("uses the live patch room code for host start when restored local room state is stale", async () => {
    const patch = createPatch();
    patch.payload.seats.push({
      seatId: "seat-2",
      characterId: "signal-witch",
      displayName: "Mira",
      connected: true,
      ready: true,
      startingMissionSelected: true,
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

    const startButton = await screen.findByRole("button", { name: /start session/i });
    expect(startButton).toBeEnabled();

    fireEvent.click(startButton);

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
    expect(screen.getByText(/waiting for joel to choose a character/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /nemesis/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_dying_star", "rivalry", "standard", 6);
    });
  });

  it("labels the competitive setup protocol as Nemesis while preserving the rivalry interaction mode", async () => {
    render(<TvApp />);

    fireEvent.click(await screen.findByRole("button", { name: /nemesis/i }));
    expect(screen.getByText(/nemesis protocol selected/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /create multiplayer/i })[0]!);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("multiplayer", "scenario_broken_seal", "rivalry", "standard", 6);
    });
  });

  it("shows a disconnected ready player without clearing setup state", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.payload.seats[0] = {
      ...patch.payload.seats[0]!,
      connected: false,
      ready: true,
      startingMissionSelected: true,
      startingMissionTitle: "Crossing Thread"
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

    const operatives = await screen.findByRole("complementary", { name: /operatives/i });
    expect(operatives).toHaveTextContent(/disconnected/i);
    expect(operatives).toHaveTextContent(/mission: crossing thread/i);
    expect(operatives).toHaveTextContent(/ready/i);
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
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/you rolled 4/i);
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/exactly 4 steps away/i);
    expect(screen.getByTestId("movement-dice-animation")).toHaveTextContent(/4/);
    expect(screen.queryByText(/movement scan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/movement value/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exact legal routes are highlighted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trade if the sector is clear/i)).not.toBeInTheDocument();
  });

  it("shows sector exploration math in the sector brief without duplicating private data", async () => {
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    const patch = createPatch();
    patch.phase = "action";
    patch.payload.status = "active";
    patch.payload.sectorExplorationSummary = {
      sectorId: "ashwake-crossing",
      sectorName: "Ashwake Crossing",
      printedThreatIcons: ["red", "yellow"],
      unresolvedThreats: [
        {
          instanceId: "ashwake-crossing:chain-maul-salvager",
          cardId: "chain-maul-salvager",
          name: "Chain-Maul Salvager",
          type: "enemy",
          lane: "red",
          blocksShop: true,
          blocksSectorText: true
        }
      ],
      drawCountsDue: { red: 0, blue: 0, yellow: 1 },
      sectorTextLocked: true,
      shopLocked: false,
      lockedReason: "Resolve Chain-Maul Salvager first.",
      sectorTextTitle: "Hold the Bridge",
      shopName: null,
      explanationLines: [
        "Printed icons: 1 red, 1 yellow.",
        "Unresolved blockers: Chain-Maul Salvager.",
        "No draw: red lane already has an unresolved card.",
        "Draw due: 1 yellow threat.",
        "Sector text locked: Resolve Chain-Maul Salvager first."
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

    const exploration = await screen.findByTestId("tv-sector-exploration");
    expect(exploration).toHaveTextContent(/printed/i);
    expect(exploration).toHaveTextContent(/1 red, 1 yellow/i);
    expect(exploration).toHaveTextContent(/blockers/i);
    expect(exploration).toHaveTextContent(/chain-maul salvager/i);
    expect(exploration).toHaveTextContent(/draw/i);
    expect(exploration).toHaveTextContent(/draw 1 yellow/i);
    expect(exploration).toHaveTextContent(/red lane already has an unresolved card/i);
    expect(exploration).toHaveTextContent(/resolve chain-maul salvager first/i);
    expect(JSON.stringify(patch.payload)).not.toContain("Private agenda");
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
        modifiers: [
          { label: "Base Grit", value: 2 },
          { label: "Black Route Fuse", value: 3 }
        ]
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
    expect(within(overlay).getByTestId("host-battle-vs-block")).toHaveTextContent(/vs/i);
    expect(within(overlay).getByTestId("host-battle-result-banner")).toHaveTextContent(/resolving/i);
    expect(overlay).toHaveTextContent(/base grit\s*\+2/i);
    expect(overlay).toHaveTextContent(/black route fuse\s*\+3/i);
    expect(overlay).toHaveTextContent(/difficulty\s*8/i);
    expect(overlay).not.toHaveTextContent(/wounds/i);
    expect(overlay).not.toHaveTextContent(/salvage/i);
    expect(overlay).not.toHaveTextContent(/heat/i);
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
    patch.payload.publicResultDeltas = [
      {
        id: "battle-trophy",
        type: "trophy",
        label: "Trophy",
        value: 1,
        sign: "gain",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "combat",
        publicText: "Tarek Voss gained 1 Trophy.",
        severity: "reward"
      },
      {
        id: "battle-threat",
        type: "threatDefeated",
        label: "Threat defeated",
        sign: "gain",
        targetScope: "sector",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "combat",
        publicText: "Signal Static defeated.",
        severity: "reward"
      },
      {
        id: "private-rivalry-battle-note",
        type: "modifierApplied",
        label: "Secret rivalry edge",
        value: 1,
        sign: "gain",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "ownerPrivate",
        source: "combat",
        publicText: "Private rivalry agenda scored.",
        severity: "neutral"
      }
    ];
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
    expect(overlay).toHaveTextContent(/signal static/i);
    expect(overlay).toHaveTextContent(/success: the signal holds/i);
    expect(screen.getByTestId("host-battle-vs-block")).toHaveTextContent(/test/i);
    expect(screen.getByTestId("battle-dice-animation")).toHaveTextContent("A 8 / D 7 / +1");
    expect(screen.getByTestId("host-battle-result-banner")).toHaveTextContent(/success/i);
    expect(screen.getByTestId("host-battle-result-banner")).toHaveTextContent(/wins by 1/i);
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/Tarek Voss\s*8\s*>\s*7\s*Difficulty/i);
    expect(screen.getByTestId("host-battle-player-math")).toHaveTextContent(/Signal 1 \+ Roll 7 = Total 8/i);
    expect(screen.getByTestId("host-battle-enemy-math")).toHaveTextContent(/Difficulty 7 = Total 7/i);
    expect(within(screen.getByTestId("host-battle-vs-block")).getByTestId("result-delta-row")).toHaveTextContent(/\+1 Trophy/i);
    expect(within(screen.getByTestId("host-battle-vs-block")).getByTestId("result-delta-row")).toHaveTextContent(/Threat defeated/i);
    expect(overlay).not.toHaveTextContent(/private rivalry agenda/i);
    expect(overlay).not.toHaveTextContent(/secret rivalry edge/i);
    expect(screen.queryByTestId("roll-outcome-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
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
      shopType: "Forge Market",
      stockCategory: "forge-armoury",
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
      sellInventory: [
        {
          gearId: "veil-hook",
          name: "Veil Hook",
          type: "gear",
          sellValue: 1,
          summary: "Trade carried gear for salvage.",
          sellable: true
        }
      ],
      services: [
        {
          id: "buy-gear",
          label: "Buy Gear",
          shopCategory: "forge-armoury",
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
    patch.payload.publicResultDeltas = [
      {
        id: "shop-item",
        type: "itemBought",
        label: "Item bought",
        value: "Ashlock Carbine",
        sign: "gain",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "shop:purchase",
        publicText: "Tarek Voss bought Ashlock Carbine.",
        severity: "reward"
      },
      {
        id: "shop-salvage",
        type: "salvage",
        label: "Salvage",
        value: 3,
        sign: "loss",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "shop:purchase",
        publicText: "Tarek Voss spent 3 Salvage.",
        severity: "loss"
      }
    ];
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
    expect(overlay).toHaveTextContent(/shop open/i);
    expect(overlay).toHaveTextContent(/tarek voss/i);
    expect(overlay).toHaveTextContent(/anchor market/i);
    expect(overlay).toHaveTextContent(/forge market/i);
    expect(overlay).toHaveTextContent(/armoury/i);
    expect(within(screen.getByTestId("host-shop-status-panel")).getByText(/salvage/i)).toBeInTheDocument();
    expect(screen.getByTestId("host-shop-status-panel")).toHaveTextContent("6");
    expect(screen.getByTestId("host-shop-status-panel")).toHaveTextContent(/sellable/i);
    expect(screen.getByTestId("host-shop-status-panel")).toHaveTextContent("1");
    expect(overlay).toHaveTextContent(/buy gear/i);
    expect(within(overlay).getByTestId("result-delta-row")).toHaveTextContent(/Item bought: Ashlock Carbine/i);
    expect(within(overlay).getByTestId("result-delta-row")).toHaveTextContent(/-3 Salvage/i);
    expect(overlay).toHaveTextContent(/choose on player phone/i);
    expect(overlay).not.toHaveTextContent(/^vs$/i);
    expect(overlay).not.toHaveTextContent(/active operative/i);
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
      blocked: true,
      blockedReasonText: "Shop blocked by threat.",
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
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/shop blocked/i);
    expect(screen.getByTestId("host-state-banner")).toHaveTextContent(/clear gate-tax collectors/i);
    expect(overlay).toHaveTextContent(/shop blocked/i);
    expect(overlay).toHaveTextContent(/gate-tax collectors command 5/i);
    expect(overlay).toHaveTextContent(/shop blocked by threat/i);
    expect(within(screen.getByLabelText("Shop services")).queryByText(/buy gear/i)).not.toBeInTheDocument();
  });

  it("shows public shop purchase and sale outcomes without battle content", async () => {
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
        salvage: 4
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
        salvage: 4,
        heat: 0,
        wounds: { current: 1, max: 6 }
      },
      blockingThreats: [],
      services: [
        {
          id: "buy-gear",
          label: "Buy Gear",
          cost: { salvage: 3 },
          enabled: true
        }
      ],
      revealedStock: [
        {
          cardId: "ashlock-carbine",
          name: "Ashlock Carbine",
          type: "gear",
          cost: { salvage: 3 },
          summary: "A public weapon offer.",
          affordable: true
        }
      ],
      recentOutcome: {
        operativeName: "Tarek Voss",
        shopName: "Anchor Market",
        action: "buy",
        gained: "Ashlock Carbine",
        costPaid: { salvage: 3 },
        remainingSalvage: 4,
        summary: "Tarek Voss bought Ashlock Carbine for 3 Salvage."
      }
    };
    patch.payload.publicResultDeltas = [
      {
        id: "shop-purchase-item",
        type: "itemBought",
        label: "Item bought",
        value: "Ashlock Carbine",
        sign: "gain",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "shop:buy",
        publicText: "Tarek Voss bought Ashlock Carbine.",
        severity: "reward"
      },
      {
        id: "shop-purchase-salvage",
        type: "salvage",
        label: "Salvage",
        value: 3,
        sign: "loss",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "public",
        source: "shop:buy",
        publicText: "Tarek Voss spent 3 Salvage.",
        severity: "loss"
      }
    ];
    mockUseRoomSubscription.mockReturnValue({
      patch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<TvApp />);

    const purchaseOverlay = await screen.findByTestId("host-shop-overlay");
    expect(screen.getByTestId("host-shop-outcome")).toHaveTextContent(/bought ashlock carbine for 3 salvage/i);
    expect(purchaseOverlay).toHaveTextContent(/ashlock carbine/i);
    expect(purchaseOverlay).not.toHaveTextContent(/battle resolving/i);
    expect(screen.queryByTestId("host-battle-overlay")).not.toBeInTheDocument();

    cleanup();
    vi.clearAllMocks();
    window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
    window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
    patch.payload.shopEncounter = {
      ...patch.payload.shopEncounter,
      recentOutcome: {
        operativeName: "Tarek Voss",
        shopName: "Anchor Market",
        action: "sell",
        sold: "Veil Hook",
        salvageDelta: 1,
        remainingSalvage: 5,
        summary: "Tarek Voss sold Veil Hook for 1 Salvage."
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

    expect(await screen.findByTestId("host-shop-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("host-shop-outcome")).toHaveTextContent(/sold veil hook for 1 salvage/i);
    expect(JSON.stringify(patch.payload.shopEncounter)).not.toContain("Private agenda");
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
      startingMissionSelected: true,
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
          { label: "Base Grit", value: 2 },
          { label: "Black Route Fuse", value: 3 },
          { label: "Fandiablos", value: 1 },
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
    expect(overlay.querySelector("[data-testid='combat-dice-animation']")).not.toHaveClass("combat-dice-animation-compact");
    expect(screen.getByTestId("battle-dice-animation")).toHaveClass("dice-roll-scene-dom");
    expect(screen.getByTestId("host-battle-vs-block")).toHaveTextContent(/vs/i);
    expect(within(screen.getByTestId("host-battle-vs-block")).getByTestId("host-battle-dice-band")).toContainElement(
      screen.getByTestId("battle-dice-animation")
    );
    expect(screen.getByTestId("host-battle-result-banner").compareDocumentPosition(screen.getByTestId("host-battle-dice-band"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByTestId("host-battle-dice-band").compareDocumentPosition(screen.getByTestId("host-battle-test-label"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByTestId("host-battle-result-banner")).toHaveTextContent(/success/i);
    expect(screen.getByTestId("host-battle-result-banner")).toHaveTextContent(/wins by 3/i);
    expect(screen.getByTestId("host-battle-test-label")).toHaveTextContent(/grit test/i);
    expect(overlay).toHaveTextContent(/base grit\s*\+2/i);
    expect(overlay).toHaveTextContent(/black route fuse\s*\+3/i);
    expect(overlay).toHaveTextContent(/fandiablos\s*\+1/i);
    expect(overlay.querySelector("[data-testid='combat-die-attack']")).toHaveTextContent("4");
    expect(overlay.querySelector("[data-testid='combat-die-defense']")).toHaveTextContent("3");
    expect(overlay.querySelector("[data-testid='combat-die-modifier']")).not.toBeInTheDocument();
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/Tarek Voss\s*11\s*>\s*8\s*Enemy/i);
    expect(screen.getByTestId("host-battle-rolls")).not.toHaveTextContent(/player total/i);
    expect(screen.getByTestId("host-battle-player-math")).toHaveTextContent(/Grit 6 \+ Roll 5 = Total 11/i);
    expect(screen.getByTestId("host-battle-rolls")).not.toHaveTextContent(/opposition total/i);
    expect(overlay).toHaveTextContent(/cinder-veil stalker added to trophy pile/i);
    expect(screen.getByTestId("host-battle-enemy-math")).toHaveTextContent(/Battle 5 \+ Roll 3 = Total 8/i);
    expect(screen.queryByTestId("host-battle-log")).not.toBeInTheDocument();
    expect(screen.queryByText(/battle overlay layout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/display rules/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("roll-outcome-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-card-reveal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
    expect(screen.queryByText(/battle display active/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: /operatives/i })).queryByText(/pax/i)).not.toBeInTheDocument();
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
      startingMissionSelected: true,
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
    expect(screen.getByTestId("host-battle-rolls")).toHaveTextContent(/Tarek Voss\s*11\s*>\s*8\s*Enemy/i);
    expect(screen.getByTestId("host-battle-player-math")).toHaveTextContent(/Grit 6 \+ Roll 5 = Total 11/i);
    expect(screen.getByTestId("host-battle-enemy-math")).toHaveTextContent(/Battle 0 \+ Roll 8 = Total 8/i);
    expect(screen.queryByTestId("tv-card-reveal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("roll-outcome-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-resolution-footer")).not.toBeInTheDocument();
    expect(screen.queryByText(/battle display active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/host card lane/i)).not.toBeInTheDocument();
  });
});
