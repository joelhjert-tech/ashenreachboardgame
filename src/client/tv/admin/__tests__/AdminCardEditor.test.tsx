// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminCardEditor from "../AdminCardEditor.js";
import type { AdminLibraryCard } from "../adminLibraryRegistry.js";

const card = {
  id: "crownless-advocate",
  name: "Crownless Advocate",
  cardType: "follower",
  status: "active",
  dataSourcePath: "content/followers/crownless-advocate.json",
  dataSourceFolder: "content/followers/",
  artworkPath: null,
  artworkFolder: null,
  artworkUrl: null,
  difficulty: undefined,
  skills: [],
  effects: [],
  mapTileIds: [],
  metadataWarnings: []
} as unknown as AdminLibraryCard;

const source = {
  sourcePath: card.dataSourcePath,
  record: {
    id: card.id,
    name: card.name,
    role: "informant",
    text: "Once per round, record that a faction demand was softened.",
    activeEffect: { type: "gain_note", text: "A faction demand was softened." },
    useLimit: "oncePerRound",
    loyalty: 3
  },
  revision: "a".repeat(64),
  artwork: { path: null, dimensions: null, sharedCount: 1 },
  revisions: []
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("AdminCardEditor", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads canonical source, keeps ID read-only, previews, and confirms one save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      const url = String(request);
      if (url.endsWith("/card")) return response(source);
      if (url.endsWith("/save")) {
        const body = JSON.parse(String(init?.body)) as { record: Record<string, unknown> };
        return response({ ...source, record: body.record, revision: "b".repeat(64), reloadRequired: true });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const onDirtyChange = vi.fn();
    const onSaved = vi.fn();
    render(<AdminCardEditor card={card} auth={{ roomCode: "ASH123", hostToken: "host" }} onCancel={vi.fn()} onDirtyChange={onDirtyChange} onSaved={onSaved} />);

    const name = await screen.findByLabelText(/display name/i);
    expect(screen.getByLabelText(/stable card id/i)).toHaveAttribute("readonly");
    expect(screen.getByRole("option", { name: /gain note/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^heat$/i })).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: "Crownless Advocate Revised" } });
    expect(await screen.findByText(/unsaved changes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    expect(screen.getByRole("heading", { name: /pending changes/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm save/i }));

    await screen.findByText(/card saved/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledOnce();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it("protects unsaved edits when closing and permits explicit discard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(source));
    const onCancel = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminCardEditor card={card} auth={{ roomCode: "ASH123", hostToken: "host" }} onCancel={onCancel} onDirtyChange={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/display name/i), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("UNSAVED CARD CHANGES"));
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows field-level server validation without reporting a save", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request) => {
      if (String(request).endsWith("/card")) return response(source);
      return response({ error: "Card validation failed", fieldErrors: { loyalty: "Must be at least 0" } }, 422);
    });
    render(<AdminCardEditor card={card} auth={{ roomCode: "ASH123", hostToken: "host" }} onCancel={vi.fn()} onDirtyChange={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/display name/i), { target: { value: "Invalid Draft" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm save/i }));
    expect(await screen.findByText(/card validation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/must be at least 0/i)).toBeInTheDocument();
  });
});
