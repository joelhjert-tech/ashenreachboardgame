// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "../AdminDashboard.js";
import { adminLibraryCards } from "../adminLibraryRegistry.js";

const { fetchStatus, fetchReports } = vi.hoisted(() => ({
  fetchStatus: vi.fn(),
  fetchReports: vi.fn()
}));

vi.mock("../adminContentApi.js", () => ({
  fetchAdminContentStatus: fetchStatus,
  fetchAdminReports: fetchReports
}));

describe("Host Admin Dashboard", () => {
  beforeEach(() => {
    fetchStatus.mockResolvedValue({
      enabled: false,
      dashboardAllowed: true,
      simulationAllowed: true,
      qaFixturesAllowed: false,
      editingAllowed: false,
      roomStatus: "lobby",
      mode: "lobby-view",
      reason: "Repository editing is disabled."
    });
    fetchReports.mockResolvedValue({
      reports: [{
        id: "card-lifecycle",
        title: "Card Category Lifecycle",
        path: "docs/research/P23_CARD_CATEGORY_LIFECYCLE_MATRIX.json",
        modifiedAt: "2026-07-27T10:00:00.000Z",
        sizeBytes: 4096,
        summary: "398 classified records",
        recordCount: 398,
        available: true
      }]
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows the unified pre-player lobby command console and current canonical union", async () => {
    const close = vi.fn();
    render(<AdminDashboard roomCode="ROOM9" hostToken="host:ROOM9:secret" onClose={close} />);

    expect(screen.getByRole("main", { name: /host admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/authoring spoilers visible/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: new RegExp(`${adminLibraryCards.length} records under inspection`, "i") })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/lifecycle report is stale/i)).toBeInTheDocument());
    expect(screen.queryByText("ROOM9")).not.toBeInTheDocument();
    expect(screen.queryByText("host:ROOM9:secret")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lore bible/i }));
    expect(await screen.findByRole("heading", { name: /ashen reach lore bible/i })).toBeInTheDocument();
    expect(screen.getByText(/authored canon only/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reports & codex/i }));
    expect(screen.getByRole("heading", { name: /reports & codex/i })).toBeInTheDocument();
    expect(screen.getByText(/stable IDs, repository-relative paths/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export markdown/i })).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
  });

  it("closes immediately when server authorization no longer confirms a lobby", async () => {
    fetchStatus.mockResolvedValue({
      enabled: false,
      dashboardAllowed: false,
      simulationAllowed: false,
      qaFixturesAllowed: false,
      editingAllowed: false,
      roomStatus: "active",
      mode: "active-session-locked",
      reason: "Host administration is available only while the room is in the lobby."
    });
    const close = vi.fn();
    render(<AdminDashboard roomCode="ROOM9" hostToken="host:ROOM9:secret" onClose={close} />);
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it("closes immediately after the first player connects", async () => {
    fetchStatus.mockResolvedValue({
      enabled: false,
      dashboardAllowed: false,
      simulationAllowed: false,
      qaFixturesAllowed: false,
      editingAllowed: false,
      roomStatus: "lobby",
      mode: "player-connected-locked",
      reason: "Host administration closes after the first player connects."
    });
    const close = vi.fn();
    render(<AdminDashboard roomCode="ROOM9" hostToken="host:ROOM9:secret" onClose={close} />);
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
});
