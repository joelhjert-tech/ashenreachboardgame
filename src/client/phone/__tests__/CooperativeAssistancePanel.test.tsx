// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientIntent, PhonePatchPayload } from "../../shared/types.js";
import { CooperativeAssistancePanel } from "../PhoneActionPanel.js";

afterEach(cleanup);

const basePatch = {
  encounter: {
    id: "relay-hazard",
    title: "Relay Hazard",
    cardType: "hazard",
    flavor: "A severed signal calls.",
    difficulty: 12,
    stat: "signal"
  },
  cooperativeAssistanceEligibility: {
    sourceId: "relay-hazard",
    sourceTitle: "Relay Hazard",
    testedStat: "signal",
    helpers: [
      { seatId: "seat-2", playerName: "Jonas", characterName: "Signal Witch", contribution: 3 },
      { seatId: "seat-3", playerName: "Liv", characterName: "Grave Engineer", contribution: 2 }
    ]
  }
} as unknown as PhonePatchPayload;

describe("CooperativeAssistancePanel", () => {
  it("selects at most two helpers and submits stable seat IDs without helper totals", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(<CooperativeAssistancePanel patch={basePatch} seatId="seat-1" onIntent={onIntent} />);

    expect(screen.getByText(/base skill only/i)).toBeInTheDocument();
    expect(screen.queryByText(/attack|defense/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ask for Help/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jonas/i }));
    fireEvent.click(screen.getByRole("button", { name: /Liv/i }));
    fireEvent.click(screen.getByRole("button", { name: /Ask 2 helpers/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: "relay-hazard",
      stat: "signal",
      helperSeatIds: ["seat-2", "seat-3"]
    });
  });

  it("shows Accept and Decline only to the requested helper", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const patch = {
      cooperativeAssistance: {
        id: "assist-1",
        sourceKind: "encounter",
        sourceId: "relay-hazard",
        sourceTitle: "Relay Hazard",
        testedStat: "signal",
        activeSeatId: "seat-1",
        activePlayerName: "Joel",
        status: "requested",
        requestedHelpers: [{ seatId: "seat-2", playerName: "Jonas", characterName: "Signal Witch", response: "pending" }],
        acceptedTotal: 0,
        viewerRole: "requested",
        viewerContribution: 3
      }
    } as unknown as PhonePatchPayload;
    render(<CooperativeAssistancePanel patch={patch} seatId="seat-2" onIntent={onIntent} />);

    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Joel asks for your Signal 3.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Accept \+3/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: "assist-1", accept: true });
  });

  it("rolls a staged test once after assistance is locked", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const patch = {
      pendingCooperativeTest: { id: "test-1", sourceKind: "scenarioNode", sourceId: "node-1", sourceTitle: "Relay Node", activeSeatId: "seat-1", stat: "signal", difficulty: 14, requiresHelper: true },
      cooperativeAssistance: {
        id: "assist-1",
        sourceKind: "scenarioNode",
        sourceId: "node-1",
        sourceTitle: "Relay Node",
        testedStat: "signal",
        activeSeatId: "seat-1",
        activePlayerName: "Joel",
        status: "locked",
        requestedHelpers: [{ seatId: "seat-2", playerName: "Jonas", characterName: "Signal Witch", response: "accepted", contribution: 3 }],
        acceptedTotal: 3,
        viewerRole: "active"
      }
    } as unknown as PhonePatchPayload;
    render(<CooperativeAssistancePanel patch={patch} seatId="seat-1" onIntent={onIntent} />);

    fireEvent.click(screen.getByRole("button", { name: /Roll Signal/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "COOPERATIVE_TEST_ROLL_REQUESTED", seatId: "seat-1", testId: "test-1" });
  });
});
