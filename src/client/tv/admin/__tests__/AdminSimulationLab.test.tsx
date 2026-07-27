// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSimulationLab from "../AdminSimulationLab.js";
import type { AdminLibraryCard } from "../adminLibraryRegistry.js";

const { run, descriptor, close, batchStart, batchStatus, batchCancel } = vi.hoisted(() => ({ run: vi.fn(), descriptor: vi.fn(), close: vi.fn(), batchStart: vi.fn(), batchStatus: vi.fn(), batchCancel: vi.fn() }));
vi.mock("../adminContentApi.js", () => ({
  runAdminSimulation: run,
  fetchAdminSimulationCard: descriptor,
  closeAdminSimulation: close,
  startAdminSimulationBatch: batchStart,
  fetchAdminSimulationBatch: batchStatus,
  cancelAdminSimulationBatch: batchCancel
}));

const card = {
  id: "ash-choir-crusader", name: "Ash Choir Crusader", cardType: "threat", status: "active", difficulty: 8,
  skills: [{ name: "signal", level: 8 }], lore: "Each bell note lands before the blow.", rulesText: "Fight the bell shield.", encounterType: "enemy",
  effects: [{ label: "Defeat reward", value: "Gain note" }], artworkUrl: "/test.png", dataSourcePath: "content/cards/threats/ash-choir-crusader.json",
  dataSourceFolder: "content/cards/threats/", metadataWarnings: [], mapTileIds: [], testFiles: [], relatedIds: [], editable: true
} as AdminLibraryCard;

const result = {
  simulationId: "sim-1", sourceMode: "saved", sourceLabel: "SAVED CARD", cardRevision: "revision-1", cardId: card.id, cardName: card.name, cardType: "enemy", deterministicResultHash: "deterministic", seed: "fixed-win",
  outcome: "SUCCESS", forcedOutcomePreview: false, dice: { operative: [6, 6], enemy: [1, 1], operativeTotal: 15, enemyTotal: 10, difficulty: 8, modifiers: [{ label: "Signal", value: 3 }] },
  randomness: { mode: "fixed", requested: [6, 6, 6, 6], consumed: [6, 6, 1, 1], unused: [], unexpectedRequests: 0, rerolled: [], seed: "fixed-win" },
  before: { characterId: "test", characterName: "Test", position: "ashwake-crossing", stats: {}, wounds: 0, scars: [], salvage: 3, trophies: 0, gear: [], followers: [], notes: [], escalation: 0, scenarioProgress: {}, phase: "sector" },
  after: { characterId: "test", characterName: "Test", position: "ashwake-crossing", stats: {}, wounds: 0, scars: [], salvage: 5, trophies: 0, gear: [], followers: [], notes: [], escalation: 0, scenarioProgress: {}, phase: "action" },
  diff: [{ field: "salvage", before: 3, after: 5, change: "+2" }], effects: [{ order: 1, type: "gain_salvage", input: { type: "gain_salvage", amount: 2 }, status: "success", summary: "Applied by the canonical reducer.", changedFields: ["salvage"] }], rejectedEffects: [], prompts: [], eventLog: [{ type: "COMBAT_RESOLVED" }], warnings: [], authoredText: "Gain 2 Salvage.", effectTextStatus: "TEXT AND EFFECTS APPEAR CONSISTENT", isolation: { simulationId: "sim-1", initialHash: "a", liveStateHashBefore: "b", liveStateHashAfter: "b", registryHashBefore: "c", registryHashAfter: "c", gameplayLogLengthBefore: 0, gameplayLogLengthAfter: 0, broadcastAttempts: 0, escapedBroadcasts: 0, persistenceAttempts: 0, escapedPersistenceWrites: 0, timerAttempts: 0, detachedEventCount: 3, expiresAt: "2030-01-01T00:00:00.000Z" }, isolated: true
  } as const;

describe("AdminSimulationLab", () => {
  afterEach(() => { cleanup(); run.mockReset(); descriptor.mockReset(); close.mockReset(); batchStart.mockReset(); batchStatus.mockReset(); batchCancel.mockReset(); });

  it("runs the selected card and presents dice, state diff, and ordered effects", async () => {
    run.mockResolvedValue(result);
    descriptor.mockResolvedValue({ cardId: card.id, cardFamily: "threat", revision: "revision-1", record: {}, simulatable: true });
    render(<AdminSimulationLab card={card} auth={{ roomCode: "ROOM", hostToken: "HOST" }} onClose={vi.fn()} />);
    expect(screen.getByText(/live game state will not be modified/i)).toBeInTheDocument();
    const resolve = screen.getByRole("button", { name: /resolve simulation/i });
    await waitFor(() => expect(resolve).toBeEnabled());
    fireEvent.click(resolve);
    await waitFor(() => expect(screen.getAllByText("SUCCESS").length).toBeGreaterThan(0));
    expect(screen.getByText("gain_salvage")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ mode: "start", cardId: card.id, cardFamily: "threat", expectedRevision: "revision-1", outcomeMode: "calculated" }));
  });

  it("labels forced previews and exposes draft simulation without saving", async () => {
    descriptor.mockResolvedValue({ cardId: card.id, cardFamily: "threat", revision: "revision-1", record: {}, simulatable: true });
    render(<AdminSimulationLab card={card} auth={{ roomCode: "ROOM", hostToken: "HOST" }} draft={{ id: card.id }} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue(/unsaved editor draft/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/resolution mode/i), { target: { value: "failure" } });
    expect(screen.getByText(/forced outcome preview/i)).toBeInTheDocument();
  });
});
