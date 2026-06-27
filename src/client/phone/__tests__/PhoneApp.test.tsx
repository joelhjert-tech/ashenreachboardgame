// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  ["fleet-elder", "Orenna Tash", "Fleet Elder", { command: 3, grit: 1, signal: 2, guile: 1, forge: 2 }]
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
  abilities: []
})) as CharacterCatalogEntry[];

const networkMocks = vi.hoisted(() => ({
  joinSession: vi.fn(),
  leaveSession: vi.fn()
}));

vi.mock("../../shared/network.js", () => ({
  fetchCharacters: vi.fn(async () => characters),
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

describe("PhoneApp", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("moves from room/name entry to character selection before joining", async () => {
    render(<PhoneApp />);

    expect(await screen.findByRole("button", { name: /continue/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /character/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const picker = await screen.findByRole("list", { name: /character/i });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /void marshal|rift cartographer|signal witch|siege medic|oathbroken prince|grave engineer|black ledger agent|cinder monk|salvage warden|fleet elder/i })).toHaveLength(10);
    });

    expect(picker).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tarek voss.*void marshal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mira.*cinder monk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /orenna tash.*fleet elder/i })).toBeInTheDocument();
  });

  it("reserves the chosen character when selected", async () => {
    networkMocks.joinSession.mockResolvedValue({
      roomCode: "RT7P4",
      seatId: "seat-1",
      seatToken: "seat:RT7P4:seat-1",
      displayName: "Joel"
    });

    render(<PhoneApp />);

    await screen.findByRole("button", { name: /continue/i });
    fireEvent.change(screen.getAllByLabelText(/room code/i)[0]!, { target: { value: "RT7P4" } });
    fireEvent.change(screen.getAllByLabelText(/player name/i)[0]!, { target: { value: "Joel" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /mira.*cinder monk/i }));

    await waitFor(() => {
      expect(networkMocks.joinSession).toHaveBeenCalledWith({
        roomCode: "RT7P4",
        displayName: "Joel",
        characterId: "cinder-monk"
      });
    });
  });
});
