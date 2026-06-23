// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("../../shared/network.js", () => ({
  fetchCharacters: vi.fn(async () => characters),
  joinSession: vi.fn()
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders ten selectable character options in the join flow", async () => {
    render(<PhoneApp />);

    const picker = await screen.findByRole("radiogroup", { name: /character/i });

    await waitFor(() => {
      expect(screen.getAllByRole("radio")).toHaveLength(10);
    });

    expect(picker).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /tarek voss.*void marshal/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /mira.*cinder monk/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /orenna tash.*fleet elder/i })).toBeInTheDocument();
  });
});
