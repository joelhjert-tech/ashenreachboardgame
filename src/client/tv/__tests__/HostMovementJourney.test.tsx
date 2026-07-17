// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicMoveDestination, PublicTileChallenge } from "../../shared/types.js";
import { HostMovementJourney, type HostMovementJourneyModel } from "../HostMovementJourney.js";

const destination: PublicMoveDestination = {
  sectorId: "hollow-veil-yard",
  name: "Hollow Veil Yard",
  ring: "outer",
  distance: 2,
  route: ["ashwake-crossing", "glassmere-spindle", "hollow-veil-yard"],
  routeNames: ["Ashwake Crossing", "Glassmere Spindle", "Hollow Veil Yard"],
  tags: ["hazard"],
  threatIcons: ["blue"],
  ruleText: "Resolve the printed sector rule.",
  faceUpThreats: [{ instanceId: "threat-1", cardId: "signal-static", name: "Signal Static", type: "hazard", challenge: { stat: "signal", value: 7 }, blocksShop: false, blocksSectorText: true }],
  occupants: [],
  strategicTags: ["danger"]
};

const model: HostMovementJourneyModel = {
  eventId: "movement-7",
  operativeName: "Tarek Voss",
  originName: "Ashwake Crossing",
  destination
};

const challenges: PublicTileChallenge[] = [{
  id: "rift-whispers-ashen-chapel",
  name: "Rift Whispers",
  challengeType: "anomaly",
  sectorId: "hollow-veil-yard",
  testStat: "signal",
  difficulty: 8,
  trigger: "onArrival",
  authoredOrder: 0,
  recurring: true,
  tags: ["anomaly"],
  lore: "The signal repeats.",
  artCardId: "rift-whispers",
  successSummary: "The whisper recedes.",
  failureSummary: "The authored consequence resolves."
}];

afterEach(cleanup);

describe("HostMovementJourney", () => {
  it("renders canonical art for origin, current route step, and destination", () => {
    render(<HostMovementJourney model={model} step={1} arrived={false} challenges={challenges} />);
    const journey = screen.getByTestId("tv-movement-journey");
    expect(within(journey).getByTestId("tile-art-ashwake-crossing")).toHaveAttribute("src", "/assets/map/tiles/map_tile_hollow_gate.png");
    expect(within(journey).getByTestId("tile-art-glassmere-spindle")).toHaveAttribute("src", "/assets/map/tiles/map_tile_ironbridge_span.png");
    expect(within(journey).getAllByTestId("tile-art-hollow-veil-yard")).toHaveLength(2);
    expect(journey.querySelector('[data-route-step="0"]')).toHaveClass("is-complete");
    expect(journey.querySelector('[data-route-step="1"]')).toHaveClass("is-current");
    expect(journey.querySelector('[data-route-step="2"]')).toHaveClass("is-destination");
    expect(journey).toHaveTextContent("Step 2 / 3");
    expect(journey).toHaveTextContent("Sealed until arrival");
    expect(journey).not.toHaveTextContent("Rift Whispers");
  });

  it("keeps destination art and separates recurring challenges from visible threats on arrival", () => {
    render(<HostMovementJourney model={model} step={2} arrived challenges={challenges} />);
    expect(screen.getByText("Arrived at Hollow Veil Yard")).toBeInTheDocument();
    const journey = screen.getByTestId("tv-movement-journey");
    expect(within(journey).getAllByTestId("tile-art-hollow-veil-yard")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Recurring challenges" })).toHaveTextContent("Rift Whispers");
    expect(screen.getByRole("region", { name: "Visible threats" })).toHaveTextContent("Signal Static");
  });

  it("renders a direct route without inventing an intermediate tile", () => {
    const direct = { ...model, destination: { ...destination, distance: 1, route: ["ashwake-crossing", "hollow-veil-yard"], routeNames: ["Ashwake Crossing", "Hollow Veil Yard"] } };
    render(<HostMovementJourney model={direct} step={1} arrived={false} challenges={[]} />);
    expect(within(screen.getByRole("list", { name: "Authoritative movement route" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Step 2 / 2")).toBeInTheDocument();
  });

  it("uses the canonical board fallback when tile artwork fails", () => {
    render(<HostMovementJourney model={model} step={0} arrived={false} challenges={[]} />);
    fireEvent.error(screen.getByTestId("tile-art-ashwake-crossing"));
    expect(screen.getByTestId("missing-tile-art-ashwake-crossing")).toHaveTextContent("Missing tile art");
  });
});
