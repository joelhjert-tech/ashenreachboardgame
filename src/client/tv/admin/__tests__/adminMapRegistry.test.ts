import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODES, type BoardNode } from "../../../../data/riftfallBoardNodes.js";
import { BOARD_TILE_LAYOUT } from "../../boardTileLayout.js";
import { buildAdminMapRegistry, buildAdminMovementSimulation, checkAdminReachability } from "../adminMapRegistry.js";

describe("admin map registry", () => {
  it("normalizes the complete canonical board and its authored references", () => {
    const { tiles, audit } = buildAdminMapRegistry();

    expect(tiles).toHaveLength(49);
    expect(audit.tileCount).toBe(49);
    expect(audit.invalidConnectionCount).toBe(0);
    expect(audit.oneWayConnectionCount).toBe(0);
    expect(audit.structurallyUnreachableTileIds).toEqual([]);
    expect(tiles.every((tile) => tile.position && tile.artworkUrl)).toBe(true);
    expect(tiles.find((tile) => tile.id === "ashen-chapel")?.position).toEqual(BOARD_TILE_LAYOUT["ashen-chapel"]);
    expect(tiles.find((tile) => tile.id === "ashen-chapel")?.challenges.map((entry) => entry.id)).toContain("rift-whispers-ashen-chapel");
  });

  it("reports invalid, one-way, duplicate-position, and missing-art topology fixtures", () => {
    const first = RIFTFALL_BOARD_NODES[0]!;
    const second = RIFTFALL_BOARD_NODES[1]!;
    const fixture: BoardNode[] = [
      { ...first, connections: [second.id, "missing-sector"] },
      { ...second, connections: [] }
    ];
    const sharedPosition = { x: 0.1, y: 0.1, width: 0.1, height: 0.1, zIndex: 1, routeAnchor: { x: 0.15, y: 0.15 } };
    const { tiles, audit } = buildAdminMapRegistry(
      fixture,
      [],
      { [first.id]: sharedPosition, [second.id]: sharedPosition },
      { [first.id]: "/assets/map/tiles/shared.png" }
    );

    expect(audit.invalidConnectionCount).toBe(1);
    expect(audit.oneWayConnectionCount).toBe(2);
    expect(audit.missingArtworkCount).toBe(1);
    expect(audit.duplicatePositionTileCount).toBe(2);
    expect(tiles[0]?.connections).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetTileId: second.id, isBidirectional: false }),
      expect.objectContaining({ targetTileId: "missing-sector", connectionType: "invalid" })
    ]));
  });

  it("uses the authoritative exact-distance planner without mutating game state", () => {
    const simulation = buildAdminMovementSimulation("ashwake-crossing", 2);

    expect(simulation.plan).not.toBeNull();
    expect(simulation.plan?.routes.length).toBeGreaterThan(0);
    expect(simulation.plan?.routes.every((route) => route.route.length === 3)).toBe(true);
    expect(simulation.stateFingerprintAfter).toBe(simulation.stateFingerprintBefore);
  });

  it("evaluates permission profiles through the production movement gate checks", () => {
    const withoutNotes = checkAdminReachability("ashwake-crossing");
    const withKnownClearances = checkAdminReachability("ashwake-crossing", [
      "guardian-span-clearance",
      "gate-of-cinders-breached"
    ]);

    expect(withKnownClearances.length).toBeLessThanOrEqual(withoutNotes.length);
    expect(withKnownClearances).not.toContain("ashwake-crossing");
  });

  it("surfaces canonical blocked reasons for closed movement gates", () => {
    const simulation = buildAdminMovementSimulation("middle_guardian_span", 1);
    expect(simulation.plan?.blockedRoutes.some((route) => /guardian span clearance|clearance/i.test(route.disabledReason ?? ""))).toBe(true);
  });
});
