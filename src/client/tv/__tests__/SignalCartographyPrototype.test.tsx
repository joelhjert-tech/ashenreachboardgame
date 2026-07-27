// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BOARD_SPACES } from "../../../game/data/boardSpaces.js";
import type { PublicPatchPayload, StatePatch } from "../../shared/types.js";
import { SignalCartographyPrototype } from "../SignalCartographyPrototype.js";

afterEach(cleanup);

describe("SignalCartographyPrototype", () => {
  it("renders all 49 canonical sectors and the public route language", () => {
    const view = render(<SignalCartographyPrototype patch={null} fixture="route" />);

    expect(screen.getByTestId("signal-cartography-prototype")).toHaveAttribute("data-fixture", "route");
    expect(view.container.querySelectorAll(".signal-cartography__nodes > g")).toHaveLength(BOARD_SPACES.length);
    expect(view.container.querySelectorAll(".signal-cartography__node-art")).toHaveLength(BOARD_SPACES.length);
    expect(view.container.querySelector('image[href="/assets/riftfall/ui/signal-cartography/sectors/outer_waymarket.png"]')).toBeInTheDocument();
    expect(view.container.querySelectorAll(".signal-cartography__connections line.is-route")).toHaveLength(2);
    expect(screen.getByText("Public information only")).toBeVisible();
    expect(screen.getByText(/Encounter detected/i)).toBeVisible();
    expect(view.container.querySelector("canvas")).not.toBeInTheDocument();
  });

  it("keeps six public identities distinct in the dense-sector fixture", () => {
    const view = render(<SignalCartographyPrototype patch={null} fixture="dense" />);

    expect(view.container.querySelectorAll(".signal-cartography__pieces > g")).toHaveLength(6);
    expect(view.container.querySelector(".signal-cartography__nodes > g.is-active")).toBeInTheDocument();
  });

  it("distinguishes a revealed persistent encounter from printed Threats", () => {
    const view = render(<SignalCartographyPrototype patch={null} fixture="challenge" />);

    expect(view.container.querySelector(".signal-cartography__persistent")).toBeInTheDocument();
    expect(view.container.querySelectorAll(".signal-cartography__threats path").length).toBeGreaterThan(0);
  });

  it("renders the converging Inner Reach path without the retired center shortcut", () => {
    const view = render(<SignalCartographyPrototype patch={null} fixture="inner" />);

    expect(view.container.querySelector(".signal-cartography__nodes > g.is-inner-current"))
      .toHaveAttribute("data-sector-id", "inner_gate_of_cinders");
    expect(view.container.querySelectorAll(".signal-cartography__nodes > g.is-inner-cleared"))
      .toHaveLength(4);
    expect(view.container.querySelector(".signal-cartography__nodes > g.is-inner-boss"))
      .toHaveAttribute("data-sector-id", "center_cinder_gate");
    expect(
      view.container.querySelector(
        '.signal-cartography__connections line[data-from-sector-id="inner_blackstar_shortcut"][data-to-sector-id="center_cinder_gate"]'
      )
    ).not.toBeInTheDocument();
  });

  it("renders the authoritative live route, requester, and revealed public encounter", () => {
    const patch = {
      type: "STATE_PATCH",
      sessionId: "LIVE-MAP",
      sequence: 12,
      phase: "navigation",
      payload: {
        players: [{
          seatId: "seat-1",
          sectorId: "north-dock-bastion",
          character: { name: "Sable Vey" }
        }],
        seats: [{ seatId: "seat-1", displayName: "Joel" }],
        turnOrder: ["seat-1"],
        activeSeatIndex: 0,
        sectors: [],
        movementPlanner: {
          selectedDestinationId: "coldwind-wharf",
          destinations: [{
            sectorId: "coldwind-wharf",
            name: "Coldwind Wharf",
            route: fixtureRouteForLiveTest,
            disabledReason: undefined,
            faceUpThreats: [{ instanceId: "threat-1" }]
          }]
        },
        hostView: {
          mode: "map",
          revision: 2,
          requester: { seatId: "seat-1", displayName: "Joel" },
          automaticReturnReason: null,
          canRequestMap: true,
          unavailableReason: null
        }
      }
    } as unknown as StatePatch<PublicPatchPayload>;
    const view = render(<SignalCartographyPrototype patch={patch} fixture="live" />);

    expect(screen.getByLabelText("Signal Cartography public map")).toBeVisible();
    expect(screen.getByText("Requested by Joel")).toBeVisible();
    expect(screen.getByText("Route to Coldwind Wharf")).toBeVisible();
    expect(view.container.querySelectorAll(".signal-cartography__connections line.is-route")).toHaveLength(2);
    expect(view.container.querySelector(".signal-cartography__persistent")).toBeInTheDocument();
  });
});

const fixtureRouteForLiveTest = [
  "north-dock-bastion",
  "outer_waymarket",
  "coldwind-wharf"
];
