// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhoneTileArrivalSummary } from "../PhoneActionPanel.js";
import type { PublicTileArrivalState } from "../../shared/types.js";

const arrival: PublicTileArrivalState = {
  arrivalId: "arrival:seat-1:ashen-chapel:4",
  seatId: "seat-1",
  tileId: "ashen-chapel",
  tileName: "Ashen Chapel",
  lore: "Static candles burn behind the relay glass.",
  currentRuleId: "challenge:rift-whispers-ashen-chapel",
  mandatoryRemaining: 2,
  canEndTurn: false,
  blockedReason: "Resolve the mandatory tile challenge.",
  rules: [
    {
      id: "challenge:rift-whispers-ashen-chapel",
      order: 10,
      kind: "tile-challenge",
      label: "Rift Whispers",
      detail: "Anomaly · Signal 8",
      mandatory: true,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: "ANOMALY",
      supported: true,
      sourceId: "rift-whispers-ashen-chapel",
      status: "current"
    },
    {
      id: "action:middle_anomalyWell",
      order: 200,
      kind: "board-action",
      label: "Read the Chapel",
      detail: "Read the anomaly and bottle a breach clue.",
      mandatory: false,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: "SIGNAL 9",
      supported: true,
      status: "optional"
    }
  ]
};

describe("PhoneTileArrivalSummary", () => {
  it("shows current, mandatory, optional, and end-turn guidance without raw IDs", () => {
    render(<PhoneTileArrivalSummary arrival={arrival} />);
    expect(screen.getByRole("region", { name: /Ashen Chapel arrival resolution/i })).toBeTruthy();
    expect(screen.getByText("Rift Whispers")).toBeTruthy();
    expect(screen.getByText("NEXT")).toBeTruthy();
    expect(screen.getByText("OPTIONAL")).toBeTruthy();
    expect(screen.getByText(/MANDATORY · Resolve the mandatory tile challenge/i)).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SUMMARY" && element.textContent?.includes("View 1 remaining effect") === true)).toBeTruthy();
    expect(screen.getByText("Read the Chapel").closest("details")?.hasAttribute("open")).toBe(false);
    expect(screen.queryByText(/middle_anomalyWell/)).toBeNull();
  });
});
