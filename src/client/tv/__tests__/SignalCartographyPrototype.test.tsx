// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BOARD_SPACES } from "../../../game/data/boardSpaces.js";
import type { PublicPatchPayload, StatePatch } from "../../shared/types.js";
import {
  buildSignalCartographyBoardLayout,
  SignalCartographyPrototype
} from "../SignalCartographyPrototype.js";

afterEach(cleanup);

describe("SignalCartographyPrototype", () => {
  it("renders all 49 canonical sectors and the public route language", () => {
    const view = render(<SignalCartographyPrototype patch={null} fixture="route" />);

    expect(screen.getByTestId("signal-cartography-prototype")).toHaveAttribute("data-fixture", "route");
    expect(screen.getByTestId("signal-cartography-prototype")).toHaveAttribute("data-design", "schematic");
    expect(view.container.querySelectorAll(".signal-cartography__nodes > g")).toHaveLength(BOARD_SPACES.length);
    expect(view.container.querySelectorAll(".signal-cartography__node-art")).toHaveLength(BOARD_SPACES.length);
    expect(view.container.querySelector('image[href="/assets/riftfall/ui/signal-cartography/sectors/outer_waymarket.png"]')).toBeInTheDocument();
    expect(view.container.querySelectorAll(".signal-cartography__connections line.is-route")).toHaveLength(2);
    expect(screen.getByText("Public information only")).toBeVisible();
    expect(screen.getByText(/Encounter detected/i)).toBeVisible();
    expect(view.container.querySelector("canvas")).not.toBeInTheDocument();
  });

  it("builds the canonical 24/16/8/1 nested board without duplicate cells", () => {
    const layout = buildSignalCartographyBoardLayout();
    const cellKeys = new Set(layout.map((entry) => `${entry.row}:${entry.column}`));

    expect(layout).toHaveLength(49);
    expect(cellKeys.size).toBe(49);
    expect(layout.filter((entry) => entry.tier === "outer")).toHaveLength(24);
    expect(layout.filter((entry) => entry.tier === "middle")).toHaveLength(16);
    expect(layout.filter((entry) => entry.tier === "inner")).toHaveLength(8);
    expect(layout.filter((entry) => entry.tier === "center")).toEqual([
      expect.objectContaining({ sectorId: "center_cinder_gate", row: 3, column: 3 })
    ]);
  });

  it("renders the approval board with designed tiles, route links, hazards, challenges, and a focus panel", () => {
    const view = render(
      <SignalCartographyPrototype patch={null} fixture="challenge" design="board-tiles" />
    );

    expect(screen.getByTestId("signal-cartography-prototype")).toHaveAttribute("data-design", "board-tiles");
    expect(view.container.querySelector(".signal-cartography__board-svg")).toHaveAttribute("viewBox", "0 0 910 700");
    expect(view.container.querySelectorAll(".signal-cartography__board-tile")).toHaveLength(49);
    expect(view.container.querySelectorAll(".signal-cartography__board-tile-art")).toHaveLength(49);
    expect(view.container.querySelector(".signal-cartography__board-tile-art")).toHaveAttribute("width", "126");
    expect(view.container.querySelectorAll('.signal-cartography__board-tile-base[data-surface="neutral"]')).toHaveLength(49);
    expect(view.container.querySelectorAll(".signal-cartography__board-tile-base.is-lane-red")).toHaveLength(0);
    expect(view.container.querySelectorAll(".signal-cartography__board-tier-marker")).toHaveLength(4);
    expect(view.container.querySelectorAll('.signal-cartography__board-tier-frames rect[data-tier]')).toHaveLength(4);
    expect(view.container.querySelectorAll("[data-threat-lane]").length).toBeGreaterThan(0);
    expect(view.container.querySelector('.signal-cartography__board-player-coin[data-player-coin="beacon"]'))
      .toHaveAttribute("href", "/assets/riftfall/ui/signal-cartography/markers/players/beacon.png");
    expect(view.container.querySelector('.signal-cartography__board-mission-coin[data-objective-coin="challenge"]'))
      .toHaveAttribute("href", "/assets/riftfall/ui/signal-cartography/markers/objectives/challenge.png");
    expect(screen.getByLabelText("OUTER REACH, 24 tiles")).toBeInTheDocument();
    expect(screen.getByLabelText("MIDDLE REACH, 16 tiles")).toBeInTheDocument();
    expect(screen.getByLabelText("INNER REACH, 8 tiles")).toBeInTheDocument();
    expect(screen.getByLabelText("CORE, 1 tile")).toBeInTheDocument();
    expect(view.container.querySelectorAll(".signal-cartography__board-hazard").length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll(".signal-cartography__board-challenge").length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll(".signal-cartography__board-gate-frame").length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll(".signal-cartography__board-special-links path").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Focused sector: Ashen Chapel")).toHaveTextContent(/Rift Whispers/i);
    expect(screen.getByText("Public information only")).toBeVisible();
    expect(view.container.querySelector("canvas")).not.toBeInTheDocument();
  });

  it("highlights only the active operative's current public mission destination", () => {
    const patch = {
      type: "STATE_PATCH",
      sessionId: "MISSION-MAP",
      sequence: 21,
      phase: "navigation",
      payload: {
        players: [
          {
            seatId: "seat-1",
            sectorId: "north-dock-bastion",
            character: {
              name: "Sable Vey",
              activeContract: { contractId: "signal-pilgrimage", progress: 0, completedTargetIds: [] }
            }
          },
          {
            seatId: "seat-2",
            sectorId: "outer_waymarket",
            character: {
              name: "Mara Voss",
              activeContract: { contractId: "bridge-oath", progress: 0, completedTargetIds: [] }
            }
          }
        ],
        seats: [
          { seatId: "seat-1", displayName: "Joel" },
          { seatId: "seat-2", displayName: "Mara" }
        ],
        turnOrder: ["seat-1", "seat-2"],
        activeSeatIndex: 0,
        sectors: [],
        availableContracts: [
          {
            id: "signal-pilgrimage",
            name: "Signal Pilgrimage",
            factionGiver: "Lantern Compact",
            text: "Tune the public route.",
            objective: {
              type: "multiStopRoute",
              ordered: true,
              targets: [
                { id: "signal-pier", type: "spaceId", value: "glassmere-spindle", label: "Glass Signal Pier" },
                { id: "anchor-market", type: "spaceId", value: "outer_waymarket", label: "Anchor Market" }
              ]
            }
          },
          {
            id: "bridge-oath",
            name: "Bridge Oath",
            factionGiver: "Ash Wardens",
            text: "Hold the bridge.",
            objective: {
              type: "multiStopRoute",
              ordered: true,
              targets: [
                { id: "ashwalk", type: "spaceId", value: "ashwake-crossing", label: "Ashwalk Bridge" }
              ]
            }
          }
        ],
        movementPlanner: null
      }
    } as unknown as StatePatch<PublicPatchPayload>;
    const view = render(
      <SignalCartographyPrototype patch={patch} fixture="live" design="board-tiles" />
    );

    expect(
      view.container.querySelector('.signal-cartography__board-tile[data-sector-id="glassmere-spindle"]')
    ).toHaveAttribute("data-mission-target", "true");
    expect(
      view.container.querySelector('.signal-cartography__board-tile[data-sector-id="ashwake-crossing"]')
    ).toHaveAttribute("data-mission-target", "false");
    expect(view.container.querySelectorAll('.signal-cartography__board-tile[data-mission-target="true"]')).toHaveLength(1);
    expect(screen.getByText("Signal Pilgrimage")).toBeVisible();
    expect(screen.getByText(/Joel · public mission beacon/i)).toBeVisible();
    expect(screen.getByText(/1 valid mission destination marked/i)).toBeVisible();
  });

  it("keeps six public coin identities distinct in the dense-sector fixture", () => {
    const view = render(
      <SignalCartographyPrototype patch={null} fixture="dense" design="board-tiles" />
    );
    const playerCoins = Array.from(
      view.container.querySelectorAll<SVGImageElement>(".signal-cartography__board-player-coin")
    );

    expect(playerCoins).toHaveLength(6);
    expect(new Set(playerCoins.map((coin) => coin.getAttribute("data-player-coin"))).size).toBe(6);
    expect(view.container.querySelector('.signal-cartography__board-mission-coin[data-objective-coin="service"]'))
      .toHaveAttribute("href", "/assets/riftfall/ui/signal-cartography/markers/objectives/service.png");
    expect(view.container.querySelector(".signal-cartography__board-tile.is-active")).toBeInTheDocument();
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
