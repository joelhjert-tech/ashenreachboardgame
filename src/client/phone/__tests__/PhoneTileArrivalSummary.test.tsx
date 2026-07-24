// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTileArrivalState } from "../../shared/types.js";
import {
  DEFAULT_PHONE_ARRIVAL_PRESENTATION,
  PhoneTileArrivalSummary,
  resolvePhoneArrivalPresentation
} from "../PhoneActionPanel.js";

const arrival: PublicTileArrivalState = {
  arrivalId: "arrival:seat-1:ashwake-crossing:7",
  seatId: "seat-1",
  tileId: "ashwake-crossing",
  tileName: "Ashwake Crossing",
  lore: "Ash moves like black water beneath the old bridge.",
  currentRuleId: "hazard",
  mandatoryRemaining: 1,
  canEndTurn: false,
  blockedReason: "Resolve Ashfall Hazard.",
  rules: [{
    id: "hazard",
    order: 1,
    kind: "tile-challenge",
    label: "Ashfall Hazard",
    detail: "Resolve the Hazard before continuing.",
    mandatory: true,
    repeatPolicy: "EVERY_ARRIVAL",
    marker: "HAZARD",
    supported: true,
    status: "current"
  }]
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("PhoneTileArrivalSummary", () => {
  it("removes the transient Arrived notice after exactly 150 ms", () => {
    vi.useFakeTimers();
    render(<PhoneTileArrivalSummary arrival={arrival} />);
    expect(screen.getByText("Arrived")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(149));
    expect(screen.getByText("Arrived")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Arrived")).not.toBeInTheDocument();
  });

  it("does not replay the arrival notice after a reconnect-style remount", () => {
    const first = render(<PhoneTileArrivalSummary arrival={arrival} />);
    first.unmount();
    render(<PhoneTileArrivalSummary arrival={arrival} />);
    expect(screen.queryByText("Arrived")).not.toBeInTheDocument();
  });

  it("keeps the immersive option development-selectable while cinematic remains default", () => {
    const defaultView = render(<PhoneTileArrivalSummary arrival={arrival} />);
    expect(DEFAULT_PHONE_ARRIVAL_PRESENTATION).toBe("cinematic");
    expect(screen.getByTestId("phone-tile-arrival-presentation"))
      .toHaveAttribute("data-arrival-ui", "cinematic");
    expect(screen.getByTestId("phone-tile-arrival-presentation"))
      .toHaveAttribute("data-arrival-option", "a");
    defaultView.unmount();
    window.history.replaceState({}, "", "/?arrivalUi=overlay");
    render(<PhoneTileArrivalSummary arrival={{ ...arrival, arrivalId: `${arrival.arrivalId}:overlay` }} />);
    expect(screen.getByTestId("phone-tile-arrival-presentation"))
      .toHaveAttribute("data-arrival-ui", "overlay");
    expect(screen.getByTestId("phone-tile-arrival-presentation"))
      .toHaveAttribute("data-arrival-option", "b");
  });

  it("cannot enable the development-only overlay in production mode", () => {
    expect(resolvePhoneArrivalPresentation("?arrivalUi=overlay", false))
      .toBe(DEFAULT_PHONE_ARRIVAL_PRESENTATION);
    expect(resolvePhoneArrivalPresentation("?arrivalUi=overlay", true)).toBe("overlay");
    expect(resolvePhoneArrivalPresentation("?arrivalUi=unknown", true))
      .toBe(DEFAULT_PHONE_ARRIVAL_PRESENTATION);
  });

  it("places the mandatory rule before secondary lore details", () => {
    render(<PhoneTileArrivalSummary arrival={arrival} />);
    const presentation = screen.getByTestId("phone-tile-arrival-presentation");
    const rule = screen.getByText("Ashfall Hazard");
    const lore = screen.getByText("Tile lore and public details");
    expect(rule.compareDocumentPosition(lore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(presentation).toHaveTextContent(/mandatory.*resolve ashfall hazard/i);
  });
});
