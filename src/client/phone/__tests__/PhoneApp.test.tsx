// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneApp } from "../PhoneApp.js";
import { useRoomSubscription } from "../../shared/useRoomSubscription.js";
import type { CharacterCatalogEntry, PhonePatchPayload, StatePatch } from "../../shared/types.js";

const characters: CharacterCatalogEntry[] = [
  ["void-marshal", "Tarek Voss", "Void Marshal", { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 }],
  ["rift-cartographer", "Senna Pell", "Rift Cartographer", { command: 1, grit: 1, signal: 2, guile: 3, forge: 2 }],
  ["signal-witch", "Lane", "Signal Witch", { command: 1, grit: 1, signal: 4, guile: 2, forge: 1 }],
  ["siege-medic", "Dr. Yuna Castell", "Siege Medic", { command: 2, grit: 3, signal: 1, guile: 1, forge: 2 }],
  ["oathbroken-prince", "Reskin Hale", "Oathbroken Prince", { command: 2, grit: 1, signal: 1, guile: 3, forge: 2 }],
  ["grave-engineer", "Dessa Korr", "Grave Engineer", { command: 1, grit: 2, signal: 1, guile: 2, forge: 3 }],
  ["black-ledger-agent", "Joss Var", "Black Ledger Agent", { command: 1, grit: 1, signal: 2, guile: 3, forge: 2 }],
  ["cinder-monk", "Mira", "Cinder Monk", { command: 1, grit: 3, signal: 2, guile: 1, forge: 2 }],
  ["salvage-warden", "Brask Ode", "Salvage Warden", { command: 1, grit: 2, signal: 1, guile: 2, forge: 3 }],
  ["fleet-elder", "Orenna Tash", "Fleet Elder", { command: 3, grit: 1, signal: 2, guile: 1, forge: 2 }],
  ["char_deepdale", "Deepdale", "Deep Route Delver", { command: 1, grit: 2, signal: 2, guile: 1, forge: 3 }]
].map(([id, name, archetype, stats]) => ({
  id,
  name,
  archetype,
  currentSpaceId: "ashwake-crossing",
  status: "active",
  stats,
  trophies: 0,
  heat: 0,
  wounds: 0,
  scars: [],
  activeContract: null,
  heldGear: [],
  equippedGear: { weapon: null, armor: null, utility: null },
  abilities: [],
  presentation:
    id === "void-marshal"
      ? {
          role: "Commander",
          complexity: "beginner",
          playstyleSummary: "A clear first-game leader with Command pressure and safe recovery tools.",
          recommendedForFirstGame: true,
          strengths: ["Command", "Team direction"],
          weaknesses: ["Low Signal"],
          usefulStats: ["command", "grit"],
          signatureItemSummary: "Cinder Suture Kit: emergency recovery for rough turns.",
          startingContractSummary: "Warbell recovery: rewards direct table leadership."
        }
      : id === "black-ledger-agent"
        ? {
            role: "Intrigue",
            complexity: "advanced",
            playstyleSummary: "A hidden-economy operative for players who already understand the table.",
            recommendedForFirstGame: false,
            strengths: ["Guile", "Private scoring"],
            weaknesses: ["Direct fights"],
            usefulStats: ["guile", "signal"],
            signatureItemSummary: "Black Ledger: converts risky deals into leverage.",
            startingContractSummary: "Ledger claim: rewards advanced timing."
          }
      : undefined
})) as CharacterCatalogEntry[];

const networkMocks = vi.hoisted(() => ({
  fetchSessionSummary: vi.fn(async () => ({
    roomCode: "RT7P4",
    sessionMode: "single-player",
    gameMode: "standard",
    interactionMode: "co-op",
    scenarioId: "scenario_broken_seal",
    playerCount: 1,
    seats: [],
    status: "lobby",
    phase: "setup"
  })),
  joinSession: vi.fn(),
  leaveSession: vi.fn(),
  configureSessionFromPhone: vi.fn(),
  startSession: vi.fn()
}));

vi.mock("../../shared/network.js", () => ({
  fetchCharacters: vi.fn(async () => characters),
  fetchScenarios: vi.fn(async () => [
    { id: "scenario_broken_seal", name: "The Broken Seal", difficulty: "standard" },
    { id: "scenario_ashen_crown", name: "The Ashen Crown", difficulty: "hard" }
  ]),
  getConnectionDiagnostics: vi.fn(() => ({
    pageUrl: "http://192.168.1.40:5173/?room=RT7P4",
    apiOrigin: "http://192.168.1.40:8080",
    webSocketOrigin: "ws://192.168.1.40:8080",
    publicClientOrigin: "http://192.168.1.40:5173",
    isLocalhostPage: false
  })),
  fetchSessionSummary: networkMocks.fetchSessionSummary,
  joinSession: networkMocks.joinSession,
  leaveSession: networkMocks.leaveSession,
  configureSessionFromPhone: networkMocks.configureSessionFromPhone,
  startSession: networkMocks.startSession
}));

vi.mock("../../shared/useRoomSubscription.js", () => ({
  useRoomSubscription: vi.fn(() => ({
    patch: null,
    error: null,
    sendIntent: vi.fn(),
    status: "idle",
    debugEvents: [],
    clearDebugEvents: vi.fn()
  }))
}));

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes("orientation: landscape") ? width > height : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

function createLobbyPhonePatch(overrides: Partial<PhonePatchPayload> = {}): StatePatch<PhonePatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "RT7P4",
    sequence: 1,
    phase: "start",
    payload: {
      status: "lobby",
      sessionMode: "single-player",
      gameMode: "standard",
      interactionMode: "co-op",
      setupHostSeatId: "seat-1",
      lobbyConfigured: true,
      hostPhoneConnected: true,
      selfIsSetupHost: true,
      winnerSeatId: null,
      activeScenario: null,
      scenarioTelemetry: [],
      scenarioPressure: null,
      scenarioProgress: {},
      seats: [
        {
          seatId: "seat-1",
          characterId: "void-marshal",
          characterSelected: false,
          displayName: "Joel",
          connected: true,
          ready: false,
          kicked: false,
          startingMissionSelected: false,
          startingMissionTitle: null
        }
      ],
      sectors: [],
      players: [],
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
      nemesis: null,
      self: null,
      ...overrides
    } as PhonePatchPayload
  };
}

function storeControllerAuth(): void {
  window.localStorage.setItem(
    "ashenreach.controllerSession",
    JSON.stringify({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    })
  );
}

function createConfirmedCharacterPatch(characterId: string): StatePatch<PhonePatchPayload> {
  const character = characters.find((entry) => entry.id === characterId);

  if (!character) {
    throw new Error(`Missing character ${characterId}`);
  }

  return createLobbyPhonePatch({
    seats: [
      {
        seatId: "seat-1",
        characterId,
        characterSelected: true,
        displayName: "Joel",
        connected: true,
        ready: false,
        kicked: false,
        startingMissionSelected: false,
        startingMissionTitle: null
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: character.currentSpaceId,
        character: {
          id: character.id,
          name: character.name,
          archetype: character.archetype,
          status: character.status,
          activeContract: null,
          stats: character.stats,
          statUpgrades: {},
          trophies: 0,
          trophyPile: [],
          salvage: 0,
          wounds: 0,
          scars: [],
          afflictions: { faceup: [], facedownCount: 0 },
          heldGearCount: 0,
          followerCount: 0,
          companionBadges: [],
          equippedGear: character.equippedGear
        }
      }
    ],
    startingContractOptions: [
      {
        id: "choir-quietus",
        name: "Quietus Ledger",
        factionGiver: "Glass Choir",
        text: "Silence one hunter on the listening road.",
        objective: { type: "defeatCount", target: 1 },
        reward: { type: "gain_note", text: "The Choir owes you a clean favor." }
      }
    ],
    selectedStartingContract: null,
    canReady: false,
    readyDisabledReason: "Choose a starting mission before Ready",
    self: {
      seatId: "seat-1",
      sectorId: character.currentSpaceId,
      hand: [],
      notes: [],
      character
    }
  });
}

function createLateJoinPatch(characterId?: string): StatePatch<PhonePatchPayload> {
  const base = characterId ? createConfirmedCharacterPatch(characterId) : createLobbyPhonePatch();
  return {
    ...base,
    phase: "action",
    payload: {
      ...base.payload,
      status: "active",
      sessionMode: "multiplayer",
      interactionMode: "co-op",
      setupHostSeatId: "seat-2",
      selfIsSetupHost: false,
      lateJoinPending: true,
      activeSeatIndex: 0,
      turnOrder: ["seat-2", "seat-3"]
    }
  };
}

describe("PhoneApp", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    networkMocks.fetchSessionSummary.mockReset();
    networkMocks.joinSession.mockReset();
    networkMocks.leaveSession.mockReset();
    networkMocks.configureSessionFromPhone.mockReset();
    networkMocks.startSession.mockReset();
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel",
      isHostPhone: true
    });
    networkMocks.fetchSessionSummary.mockResolvedValue({
      roomCode: "RT7P4",
      sessionMode: "single-player",
      gameMode: "standard",
      interactionMode: "co-op",
      scenarioId: "scenario_broken_seal",
      playerCount: 1,
      seats: [],
      status: "lobby",
      phase: "setup"
    });
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    setViewport(390, 844);
  });

  it("starts on a room/name screen without character cards or leave controls", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    const roomCodeInput = screen.getAllByLabelText(/room code/i)[0]!;
    const playerNameInput = screen.getAllByLabelText(/player name/i)[0]!;
    expect(roomCodeInput).toBeInTheDocument();
    expect(roomCodeInput).toHaveAttribute("name", "roomCode");
    expect(roomCodeInput).toHaveAttribute("autocomplete", "off");
    expect(roomCodeInput).toHaveAttribute("inputmode", "text");
    expect(roomCodeInput).toHaveAttribute("spellcheck", "false");
    expect(playerNameInput).toBeInTheDocument();
    expect(playerNameInput).toHaveAttribute("name", "playerName");
    expect(playerNameInput).toHaveAttribute("autocomplete", "nickname");
    expect(playerNameInput).toHaveAttribute("spellcheck", "false");
    expect(screen.getByRole("button", { name: /join game/i })).toBeInTheDocument();
    expect(screen.getByText(/ashen reach controller/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/assigns host phone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tarek voss/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/void marshal/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /leave/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide ui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show tabs/i })).not.toBeInTheDocument();
  });

  it("disables repeated join attempts after the server reports a full room", async () => {
    networkMocks.joinSession.mockRejectedValue(new Error("No open seats remain"));
    render(<PhoneApp />);

    fireEvent.change((await screen.findAllByLabelText(/room code/i))[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Late Player" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    expect(await screen.findByText("No open seats remain")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room Full" })).toBeDisabled();

    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Another Player" } });
    expect(screen.getByRole("button", { name: /join game/i })).toBeEnabled();
  });

  it("claims a room seat before showing character selection", async () => {
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /join game/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    const picker = await screen.findByRole("list", { name: /character/i });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /void marshal|rift cartographer|signal witch|siege medic|oathbroken prince|grave engineer|black ledger agent|cinder monk|salvage warden|fleet elder|deep route delver/i })).toHaveLength(11);
    });

    expect(picker).toBeInTheDocument();
    expect(picker).toHaveClass("phone-character-snap-list");
    expect(picker.parentElement?.parentElement).toHaveClass("phone-character-select-scroll");
    for (const option of within(picker).getAllByRole("button")) {
      expect(option).toHaveClass("phone-character-option");
    }
    expect(screen.getAllByRole("heading", { name: /select operative/i })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: /choose character/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/step 2/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /recommended/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all operatives/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /advanced/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tarek voss.*void marshal/i })).toBeInTheDocument();
    const tarekCard = screen.getByRole("button", { name: /tarek voss.*void marshal/i });
    expect(within(tarekCard).queryByLabelText(/tarek voss stats/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mira.*cinder monk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /orenna tash.*fleet elder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deepdale.*deep route delver/i })).toBeInTheDocument();
    expect(networkMocks.joinSession).toHaveBeenCalledWith({
      roomCode: "RT7P4",
      displayName: "Joel"
    });
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();
    expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("shows character role, complexity, starting gear, and starting contract guidance", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    const presentations = await screen.findAllByTestId("phone-character-presentation");
    const firstGamePresentation = presentations.find((presentation) => /first-game pick/i.test(presentation.textContent ?? ""));

    expect(firstGamePresentation).toBeDefined();
    expect(firstGamePresentation!).toHaveTextContent(/commander/i);
    expect(firstGamePresentation!).toHaveTextContent(/beginner/i);
    expect(firstGamePresentation!).toHaveTextContent(/first-game pick/i);

    const marshalCard = screen.getByRole("button", { name: /tarek voss.*void marshal/i });
    expect(within(marshalCard).queryByLabelText(/tarek voss stats/i)).not.toBeInTheDocument();
    expect(within(marshalCard).getByText(/select character/i)).toBeInTheDocument();
  });

  it("sorts first-game characters before advanced operatives", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    const picker = await screen.findByRole("list", { name: /character/i });
    const options = within(picker).getAllByRole("button");
    const firstGameIndex = options.findIndex((option) => /tarek voss/i.test(option.textContent ?? ""));
    const advancedIndex = options.findIndex((option) => /joss var/i.test(option.textContent ?? ""));

    expect(firstGameIndex).toBe(0);
    expect(advancedIndex).toBeGreaterThan(firstGameIndex);
    expect(options[advancedIndex]).toHaveTextContent(/advanced/i);
  });

  it("reserves the chosen Deepdale character when selected", async () => {
    const sendIntent = vi.fn();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    await waitFor(() => {
      expect(sendIntent).toHaveBeenCalledWith({
        type: "SELECT_CHARACTER",
        seatId: "seat-1",
        characterId: "char_deepdale"
      });
    });
  });

  it("vibrates once when authoritative turn ownership changes to this phone", async () => {
    storeControllerAuth();
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    const waitingPatch = createConfirmedCharacterPatch("char_deepdale");
    waitingPatch.payload.status = "active";
    waitingPatch.phase = "action";
    waitingPatch.payload.turnOrder = ["seat-2", "seat-1"];
    waitingPatch.payload.activeSeatIndex = 0;
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: waitingPatch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);
    expect(vibrate).not.toHaveBeenCalled();

    const activePatch = structuredClone(waitingPatch);
    activePatch.sequence += 1;
    activePatch.payload.activeSeatIndex = 1;
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: activePatch,
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    await waitFor(() => expect(vibrate).toHaveBeenCalledWith([160, 70, 160]));
    view.rerender(<PhoneApp />);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("opens private operative selection for a player joining an active game", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLateJoinPatch(),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<PhoneApp />);

    expect(await screen.findByText(/join game in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/end of the current turn order/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /deepdale.*deep route delver/i }));
    expect(sendIntent).toHaveBeenCalledWith({
      type: "SELECT_CHARACTER",
      seatId: "seat-1",
      characterId: "char_deepdale"
    });
  });

  it("keeps a confirmed late join in setup until its starting mission is confirmed", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    const unselected = createLateJoinPatch("char_deepdale");
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: unselected,
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);

    expect(await screen.findByText(/^joining game$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join game/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /select mission/i }));
    expect(sendIntent).toHaveBeenCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-quietus"
    });

    const selectedContract = unselected.payload.startingContractOptions?.[0] ?? null;
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: {
        ...unselected,
        sequence: unselected.sequence + 1,
        payload: {
          ...unselected.payload,
          selectedStartingContract: selectedContract,
          canReady: true,
          readyDisabledReason: null
        }
      },
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    fireEvent.click(await screen.findByRole("button", { name: /^join game$/i }));
    expect(sendIntent).toHaveBeenLastCalledWith({ type: "SET_READY", seatId: "seat-1", ready: true });
  });

  it("keeps mission inspection separate from selecting either starting mission", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    const patch = createLateJoinPatch("char_deepdale");
    patch.payload.startingContractOptions = [
      ...(patch.payload.startingContractOptions ?? []),
      {
        id: "ember-courier",
        name: "Ember Courier",
        factionGiver: "Cinder Ward",
        text: "Carry the sealed route spark through the ash lanes.",
        objective: { type: "shopTransaction", action: "buyEquipment", requiredCount: 1, label: "Buy equipment at a shop" },
        reward: { type: "gain_salvage", amount: 1 }
      }
    ];
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch,
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<PhoneApp />);

    const selectButtons = await screen.findAllByRole("button", { name: /select mission/i });
    fireEvent.click(selectButtons[0]!);
    expect(sendIntent).toHaveBeenLastCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-quietus"
    });
    fireEvent.click(selectButtons[1]!);
    expect(sendIntent).toHaveBeenLastCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: "ember-courier"
    });
    expect(sendIntent).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: /inspect quietus ledger/i }));
    expect(await screen.findByRole("dialog", { name: /quietus ledger/i })).toBeInTheDocument();
    expect(sendIntent).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /close quietus ledger inspection/i }));
    expect(screen.queryByRole("dialog", { name: /quietus ledger/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /select mission/i })).toHaveLength(2);
  });

  it("changes a confirmed starting mission without leaving the joined room", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    const patch = createLateJoinPatch("char_deepdale");
    patch.payload.startingContractOptions = [
      ...(patch.payload.startingContractOptions ?? []),
      {
        id: "ember-courier",
        name: "Ember Courier",
        factionGiver: "Cinder Ward",
        text: "Carry the sealed route spark through the ash lanes.",
        objective: { type: "shopTransaction", action: "buyEquipment", requiredCount: 1, label: "Buy equipment at a shop" },
        reward: { type: "gain_salvage", amount: 1 }
      }
    ];
    patch.payload.selectedStartingContract = patch.payload.startingContractOptions[0] ?? null;
    patch.payload.canReady = true;
    patch.payload.readyDisabledReason = null;
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch,
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    render(<PhoneApp />);

    fireEvent.click(await screen.findByRole("button", { name: /change mission/i }));
    expect(screen.getAllByRole("button", { name: /select mission|selected/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /leave room/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select mission/i }));
    expect(sendIntent).toHaveBeenCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: "ember-courier"
    });
    expect(networkMocks.leaveSession).not.toHaveBeenCalled();
  });

  it("reopens authoritative character selection after a New Game restart patch", async () => {
    storeControllerAuth();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createConfirmedCharacterPatch("void-marshal"),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);
    expect(await screen.findByText(/tarek voss/i)).toBeInTheDocument();

    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    const picker = await screen.findByRole("list", { name: /character/i });
    expect(screen.getByRole("heading", { name: /select operative/i })).toBeInTheDocument();
    expect(picker.querySelector(".phone-character-option-selected")).toBeNull();
    expect(screen.queryByText(/selected starting mission/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();
  });

  it("waits for a matching server confirmation before leaving character selection", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);
    const deepdale = await screen.findByRole("button", { name: /deepdale.*deep route delver/i });
    fireEvent.click(deepdale);

    expect(sendIntent).toHaveBeenCalledTimes(1);
    expect(sendIntent).toHaveBeenCalledWith({
      type: "SELECT_CHARACTER",
      seatId: "seat-1",
      characterId: "char_deepdale"
    });
    expect(screen.getByRole("list", { name: /character/i })).toBeInTheDocument();
    expect(deepdale).toBeDisabled();
    expect(deepdale).toHaveTextContent(/selecting/i);
    for (const option of within(screen.getByRole("list", { name: /character/i })).getAllByRole("button")) {
      expect(option).toBeDisabled();
    }

    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createConfirmedCharacterPatch("char_deepdale"),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    expect(await screen.findByRole("heading", { name: /choose starting mission/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/deepdale/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/quietus ledger/i)).toBeInTheDocument();
  });

  it("restores the picker with a useful error when character selection is rejected", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: "Character already taken",
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    expect(await screen.findByText(/character already taken/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /deepdale.*deep route delver/i })).toBeEnabled();
    });
    expect(screen.getByRole("list", { name: /character/i }).querySelector(".phone-character-option-selected")).toBeNull();
  });

  it("does not leave the picker when the room confirms a different character", async () => {
    storeControllerAuth();
    const sendIntent = vi.fn();
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch(),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });

    const view = render(<PhoneApp />);
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createConfirmedCharacterPatch("void-marshal"),
      error: null,
      sendIntent,
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    view.rerender(<PhoneApp />);

    expect(await screen.findByText(/room confirmed a different operative/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /character/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deepdale.*deep route delver/i })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: /choose starting mission/i })).not.toBeInTheDocument();
  });

  it("shows actionable connection guidance when the phone cannot reach the host", async () => {
    networkMocks.joinSession.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    expect(await screen.findByText(/cannot reach host server/i)).toBeInTheDocument();
    expect(screen.getByText(/same wi-fi/i)).toBeInTheDocument();
    expect(screen.getByText(/windows firewall/i)).toBeInTheDocument();
  });

  it("prefills the room but leaves seat assignment authoritative for direct browser links", async () => {
    window.history.replaceState(null, "", "/?room=RT7P4&seat=2");
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-2",
      seatToken: "seat:RT7P4:seat-2",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    expect(await screen.findByDisplayValue("RT7P4")).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));
    await waitFor(() => {
      expect(networkMocks.joinSession).toHaveBeenCalledWith({
        roomCode: "RT7P4",
        displayName: "Joel"
      });
    });
  });

  it("stores controller auth durably so a closed phone browser can reclaim its seat", async () => {
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem("ashenreach.controllerSession")).toContain("seat-1");
      expect(window.localStorage.getItem("ashenreach.controllerSession")).toContain("seat-1");
    });
  });

  it("reconnects from stored controller auth after browser close instead of returning to Join Room", async () => {
    window.localStorage.setItem(
      "ashenreach.controllerSession",
      JSON.stringify({
        roomCode: "RT7P4",
        seatId: "seat-1",
        seatToken: "seat:RT7P4:seat-1",
        displayName: "Joel",
        lastConnectedAt: "2026-07-07T00:00:00.000Z"
      })
    );

    render(<PhoneApp />);

    await waitFor(() => {
      expect(vi.mocked(useRoomSubscription)).toHaveBeenCalledWith(
        expect.objectContaining({
          view: "phone",
          auth: expect.objectContaining({
            roomCode: "RT7P4",
            seatId: "seat-1",
            seatToken: "seat:RT7P4:seat-1",
            displayName: "Joel"
          })
        })
      );
    });
    expect(screen.queryByRole("button", { name: /join game/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /select operative/i })).toBeInTheDocument();
  });

  it("does not reuse a stored seat when a direct link asks for a different seat", async () => {
    window.history.replaceState(null, "", "/?room=RT7P4&seat=2");
    window.localStorage.setItem(
      "ashenreach.controllerSession",
      JSON.stringify({
        roomCode: "RT7P4",
        seatId: "seat-1",
        seatToken: "seat:RT7P4:seat-1",
        displayName: "Joel"
      })
    );

    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /join game/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("RT7P4")).toBeInTheDocument();
  });

  it("clears stale stored auth when the server rejects seat rejoin", async () => {
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: null,
      error: "Invalid seat token",
      sendIntent: vi.fn(),
      status: "closed",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    window.localStorage.setItem(
      "ashenreach.controllerSession",
      JSON.stringify({
        roomCode: "RT7P4",
        seatId: "seat-1",
        seatToken: "seat:RT7P4:seat-1",
        displayName: "Joel"
      })
    );

    render(<PhoneApp />);

    expect(await screen.findByText(/could not reclaim your seat/i)).toBeInTheDocument();
    expect(window.localStorage.getItem("ashenreach.controllerSession")).toBeNull();
    expect(screen.getByRole("button", { name: /join game/i })).toBeInTheDocument();
  });

  it("shows Host Phone game type controls before the lobby is configured", async () => {
    vi.mocked(useRoomSubscription).mockReturnValue({
      patch: createLobbyPhonePatch({ lobbyConfigured: false, selfIsSetupHost: true }),
      error: null,
      sendIntent: vi.fn(),
      status: "open",
      debugEvents: [],
      clearDebugEvents: vi.fn()
    });
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join game/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    expect(await screen.findByRole("heading", { name: /host phone/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /single player/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /multiplayer co-op/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /single player/i }));
    await waitFor(() => {
      expect(networkMocks.configureSessionFromPhone).toHaveBeenCalledWith(
        expect.objectContaining({ roomCode: "RT7P4", seatId: "seat-1" }),
        { mode: "single-player", playerCount: 1, scenarioId: "scenario_broken_seal" }
      );
    });
    networkMocks.configureSessionFromPhone.mockClear();
    fireEvent.change(screen.getByRole("combobox", { name: /scenario/i }), { target: { value: "scenario_ashen_crown" } });
    fireEvent.click(screen.getByRole("button", { name: /multiplayer co-op/i }));
    await waitFor(() => {
      expect(networkMocks.configureSessionFromPhone).toHaveBeenCalledWith(
        expect.objectContaining({ roomCode: "RT7P4", seatId: "seat-1" }),
        { mode: "co-op", playerCount: 4, scenarioId: "scenario_ashen_crown" }
      );
    });
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
  });

  it("shows only the portrait warning when the phone is landscape", async () => {
    setViewport(844, 390);

    render(<PhoneApp />);

    expect(await screen.findByText(/rotate your phone to portrait mode/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /join game/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
  });

  it("keeps the controller usable in a desktop landscape browser tab", async () => {
    setViewport(1280, 720);

    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /join game/i })).toBeInTheDocument();
    expect(screen.queryByText(/rotate your phone to portrait mode/i)).not.toBeInTheDocument();
  });
});
