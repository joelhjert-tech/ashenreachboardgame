import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES } from "../../../data/riftfallBoardNodes.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { BOARD_RING_TRANSITIONS, getUndirectedBoardRingTransitions } from "../../data/boardTransitions.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { buildMovementRoutePlan, buildTierTransitionOptions } from "../movementPlanner.js";
import { INNER_APPROACH_PATHS, buildInnerApproachMoveOptions } from "../innerApproach.js";

const expectedPairs = [
  "black-relay-spire|glassmere-spindle",
  "kettleward-foundry|middle_shard_sprawl",
  "middle_guardian_span|transit-gate",
  "middle_red_march_outpost|outer_ember_sanctum",
  "middle_webglass_breach|mirecoil-beacon",
  "outer_oathpost|the-salt-archive",
  "votive-engine-room|weeping-ammunition-shrine",
  "choir-execution-court|middle_red_march_outpost",
  "choir-execution-court|middle_rivalry_pit",
  "choir-execution-court|middle_anomaly_well",
  "inner_veil_rift|middle_guardian_span",
  "center_cinder_gate|inner_gate_of_cinders"
].sort();

function pair(a: string, b: string): string {
  return [a, b].sort().join("|");
}

describe("canonical board topology progression", () => {
  it("keeps every ring continuous and every edge reciprocal", () => {
    expect(RIFTFALL_BOARD_NODES.filter((node) => node.ring === "outer")).toHaveLength(24);
    expect(RIFTFALL_BOARD_NODES.filter((node) => node.ring === "middle")).toHaveLength(16);
    expect(RIFTFALL_BOARD_NODES.filter((node) => node.ring === "inner")).toHaveLength(8);
    expect(RIFTFALL_BOARD_NODES.filter((node) => node.ring === "center")).toHaveLength(1);

    for (const node of RIFTFALL_BOARD_NODES) {
      expect(new Set(node.connections).size, node.id).toBe(node.connections.length);
      for (const neighborId of node.connections) {
        expect(RIFTFALL_BOARD_NODE_INDEX.get(neighborId)?.connections, `${node.id} -> ${neighborId}`).toContain(node.id);
      }
    }
  });

  it("derives exactly the approved cross-ring edges from the graph", () => {
    expect(getUndirectedBoardRingTransitions().map((edge) => pair(edge.sourceSectorId, edge.destinationSectorId)).sort()).toEqual(expectedPairs);
    expect(BOARD_RING_TRANSITIONS).toHaveLength(24);
    expect(BOARD_RING_TRANSITIONS.every((transition) =>
      transition.edgeCost === 1
      && transition.endsMovement
      && transition.activationTiming === "beforeRoll"
    )).toBe(true);
  });

  it("offers every canonical transition as a pre-roll tier option", () => {
    const state = createInitialSessionState("topology-transition-test");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Route Tester", characterId: "void-marshal" };
    state.players[0]!.private.notes = ["gate-of-cinders-breached"];
    state.players[0]!.character.heldGear.push({
      id: "artifact-topology-test",
      name: "Topology Test Artifact",
      slot: "utility",
      statBonus: { stat: "signal", amount: 1 },
      tier: "artifact"
    });

    for (const transition of BOARD_RING_TRANSITIONS.filter((entry) =>
      entry.sourceRing === "outer" || entry.sourceRing === "middle"
    )) {
      state.players[0]!.sectorId = transition.sourceSectorId;
      state.players[0]!.character.currentSpaceId = transition.sourceSectorId;
      state.movementRolls = {};
      const option = buildTierTransitionOptions(state, "seat-1")
        .find((entry) => entry.sectorId === transition.destinationSectorId);
      expect(option, transition.edgeId).toMatchObject({
        sectorId: transition.destinationSectorId,
        route: [transition.sourceSectorId, transition.destinationSectorId],
        direction: transition.direction,
        fromRing: transition.sourceRing,
        toRing: transition.destinationRing,
        label: transition.uiLabel,
        disabledReason: null
      });
    }
  });

  it("uses two original converging inner roads instead of a circular dice track", () => {
    expect(INNER_APPROACH_PATHS).toEqual({
      "breach-road": [
        "inner_veil_rift",
        "inner_tomb_gate",
        "inner_blackstar_shortcut",
        "the-bone-meridian",
        "inner_gate_of_cinders"
      ],
      "choir-road": [
        "choir-execution-court",
        "inner_cinder_lattice",
        "inner_choir_shrine",
        "the-bone-meridian",
        "inner_gate_of_cinders"
      ]
    });
    expect(RIFTFALL_BOARD_NODE_INDEX.get("inner_blackstar_shortcut")?.connections).not.toContain("center_cinder_gate");
    expect(RIFTFALL_BOARD_NODE_INDEX.get("inner_gate_of_cinders")?.connections).toContain("center_cinder_gate");
  });

  it("keeps ordinary exact-distance movement within the current tier for values one through six", () => {
    const state = createInitialSessionState("topology-normal-movement-test");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Route Tester", characterId: "void-marshal" };
    state.players[0]!.sectorId = "outer_ember_sanctum";
    state.players[0]!.character.currentSpaceId = "outer_ember_sanctum";

    for (let movement = 1; movement <= 6; movement += 1) {
      state.movementRolls = { "seat-1": movement };
      const plan = buildMovementRoutePlan(state, "seat-1");
      expect(plan?.movementValue).toBe(movement);
      expect(plan?.routes.length).toBeGreaterThan(0);
      expect(plan?.routes.some((route) => route.sectorId === "middle_red_march_outpost")).toBe(false);
      expect(plan?.routes.every((route) => BOARD_SPACES.find((space) => space.id === route.sectorId)?.tier === "outer")).toBe(true);
    }
  });

  it("keeps the final approach exact with an Artifact gate and obtainable center clearance", () => {
    const innerBreach = BOARD_RING_TRANSITIONS.find(
      (transition) => transition.sourceSectorId === "middle_guardian_span" && transition.destinationSectorId === "inner_veil_rift"
    );
    const innerEntries = BOARD_RING_TRANSITIONS.filter((transition) =>
      transition.sourceRing === "middle" && transition.destinationRing === "inner"
    );
    const centerEntries = BOARD_RING_TRANSITIONS.filter((transition) => transition.destinationSectorId === "center_cinder_gate");
    const effectText = JSON.stringify(BOARD_TEXT_EFFECTS);

    expect(innerBreach).toMatchObject({
      minimumArtifacts: 1,
      requiredNotes: [],
      lockedReason: "Requires at least 1 Artifact"
    });
    expect(innerEntries).toHaveLength(4);
    expect(innerEntries.every((entry) => entry.minimumArtifacts === 1)).toBe(true);
    expect(centerEntries.map((entry) => entry.sourceSectorId)).toEqual(["inner_gate_of_cinders"]);
    expect(centerEntries.every((entry) => entry.requiredNotes.length === 0)).toBe(true);
    expect(effectText).not.toContain("guardian-span-clearance");
    expect(effectText).not.toContain("gate-of-cinders-breached");

    const state = createInitialSessionState("typed-gate-clearance");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.players[0]!.sectorId = "inner_gate_of_cinders";
    state.players[0]!.character.currentSpaceId = "inner_gate_of_cinders";
    state.players[0]!.innerApproachProgress = {
      pathId: "breach-road",
      clearedSectorIds: []
    };
    expect(buildInnerApproachMoveOptions(state, "seat-1")[0]?.disabledReason).toContain("Clear Gate of Cinders");
    state.players[0]!.innerApproachProgress.clearedSectorIds.push("inner_gate_of_cinders");
    expect(buildInnerApproachMoveOptions(state, "seat-1")[0]).toMatchObject({
      sectorId: "center_cinder_gate",
      direction: "advance",
      disabledReason: null
    });
  });

  it("keeps current board authoring free of retired Heat mechanics", () => {
    expect(JSON.stringify(BOARD_SPACES)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|heatThreshold|HEAT_THRESHOLD_REACHED/);
  });
});
