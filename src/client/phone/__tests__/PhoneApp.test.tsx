// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneApp } from "../PhoneApp.js";
import type { CharacterCatalogEntry } from "../../shared/types.js";

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
  leaveSession: vi.fn()
}));

vi.mock("../../shared/network.js", () => ({
  fetchCharacters: vi.fn(async () => characters),
  getConnectionDiagnostics: vi.fn(() => ({
    pageUrl: "http://192.168.1.40:5173/?room=RT7P4",
    apiOrigin: "http://192.168.1.40:8080",
    webSocketOrigin: "ws://192.168.1.40:8080",
    publicClientOrigin: "http://192.168.1.40:5173",
    isLocalhostPage: false
  })),
  fetchSessionSummary: networkMocks.fetchSessionSummary,
  joinSession: networkMocks.joinSession,
  leaveSession: networkMocks.leaveSession
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

describe("PhoneApp", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
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
    setViewport(390, 844);
  });

  it("starts on a room/name screen without character cards or leave controls", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
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
    expect(screen.getByRole("button", { name: /join \/ continue/i })).toBeInTheDocument();
    expect(screen.getByText(/ashen reach controller/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/tarek voss/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/void marshal/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /leave/i })).not.toBeInTheDocument();
  });

  it("moves from room/name entry to character selection after room validation", async () => {
    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /join \/ continue/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));

    const picker = await screen.findByRole("list", { name: /character/i });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /void marshal|rift cartographer|signal witch|siege medic|oathbroken prince|grave engineer|black ledger agent|cinder monk|salvage warden|fleet elder|deep route delver/i })).toHaveLength(11);
    });

    expect(picker).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /select character/i })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: /choose character/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/step 2/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /recommended/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all operatives/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /advanced/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tarek voss.*void marshal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mira.*cinder monk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /orenna tash.*fleet elder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deepdale.*deep route delver/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/joined room summary/i)).toHaveTextContent(/rt7p4/i);
    expect(screen.getByLabelText(/joined room summary/i)).toHaveTextContent(/joel/i);
    expect(networkMocks.joinSession).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();
    expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("shows character role, complexity, starting gear, and starting contract guidance", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));

    const presentations = await screen.findAllByTestId("phone-character-presentation");
    const firstGamePresentation = presentations.find((presentation) => /first-game pick/i.test(presentation.textContent ?? ""));

    expect(firstGamePresentation).toBeDefined();
    expect(firstGamePresentation!).toHaveTextContent(/commander/i);
    expect(firstGamePresentation!).toHaveTextContent(/beginner/i);
    expect(firstGamePresentation!).toHaveTextContent(/first-game pick/i);
    expect(firstGamePresentation!).toHaveTextContent(/cinder suture kit/i);
    expect(firstGamePresentation!).toHaveTextContent(/warbell recovery/i);
    expect(firstGamePresentation!).toHaveTextContent(/good at/i);
    expect(firstGamePresentation!).toHaveTextContent(/watch out/i);

    const marshalCard = screen.getByRole("button", { name: /tarek voss.*void marshal/i });
    expect(within(marshalCard).getByLabelText(/tarek voss stats/i)).toBeInTheDocument();
    expect(within(marshalCard).getByText(/select character/i)).toBeInTheDocument();
  });

  it("sorts first-game characters before advanced operatives", async () => {
    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));

    const picker = await screen.findByRole("list", { name: /character/i });
    const options = within(picker).getAllByRole("button");
    const firstGameIndex = options.findIndex((option) => /tarek voss/i.test(option.textContent ?? ""));
    const advancedIndex = options.findIndex((option) => /joss var/i.test(option.textContent ?? ""));

    expect(firstGameIndex).toBe(0);
    expect(advancedIndex).toBeGreaterThan(firstGameIndex);
    expect(options[advancedIndex]).toHaveTextContent(/advanced/i);
  });

  it("reserves the chosen Deepdale character when selected", async () => {
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    await waitFor(() => {
      expect(networkMocks.joinSession).toHaveBeenCalledWith({
        roomCode: "RT7P4",
        displayName: "Joel",
        characterId: "char_deepdale"
      });
    });
  });

  it("shows actionable connection guidance when the phone cannot reach the host", async () => {
    networkMocks.joinSession.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    expect(await screen.findByText(/cannot reach host server/i)).toBeInTheDocument();
    expect(screen.getByText(/same wi-fi/i)).toBeInTheDocument();
    expect(screen.getByText(/windows firewall/i)).toBeInTheDocument();
  });

  it("prefills room and requested seat from direct browser join links", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /deepdale.*deep route delver/i }));

    await waitFor(() => {
      expect(networkMocks.joinSession).toHaveBeenCalledWith({
        roomCode: "RT7P4",
        displayName: "Joel",
        characterId: "char_deepdale",
        seatId: "seat-2"
      });
    });
  });

  it("stores controller auth in session storage so separate tabs do not share a seat", async () => {
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /mira.*cinder monk/i }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem("ashen-reach-phone-auth")).toContain("seat-1");
    });
    expect(window.localStorage.getItem("ashen-reach-phone-auth")).toBeNull();
  });

  it("shows the locked character waiting screen immediately after selection", async () => {
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /join \/ continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /join \/ continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /mira.*cinder monk/i }));

    expect(await screen.findByText(/character locked/i)).toBeInTheDocument();
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("Cinder Monk")).toBeInTheDocument();
    expect(screen.getByText("RT7P4")).toBeInTheDocument();
    expect(screen.getByText("Joel")).toBeInTheDocument();
    expect(screen.getAllByText(/choose starting mission/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/waiting for starting mission options from the room/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ready$/i })).toBeDisabled();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
  });

  it("shows only the portrait warning when the phone is landscape", async () => {
    setViewport(844, 390);

    render(<PhoneApp />);

    expect(await screen.findByText(/rotate your phone to portrait mode/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /join \/ continue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();
  });

  it("keeps the controller usable in a desktop landscape browser tab", async () => {
    setViewport(1280, 720);

    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /join \/ continue/i })).toBeInTheDocument();
    expect(screen.queryByText(/rotate your phone to portrait mode/i)).not.toBeInTheDocument();
  });
});
