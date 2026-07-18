import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES } from "../../../data/riftfallBoardNodes.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { BOARD_RING_TRANSITIONS, getUndirectedBoardRingTransitions } from "../../data/boardTransitions.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { buildMovementRoutePlan } from "../movementPlanner.js";

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
  "inner_cinder_lattice|middle_anomaly_well",
  "inner_veil_rift|middle_guardian_span",
  "center_cinder_gate|inner_blackstar_shortcut",
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
    expect(BOARD_RING_TRANSITIONS).toHaveLength(26);
    expect(BOARD_RING_TRANSITIONS.every((transition) => transition.edgeCost === 1 && transition.endsMovement)).toBe(true);
  });

  it("offers every canonical transition through the authoritative planner at exact movement one", () => {
    const state = createInitialSessionState("topology-transition-test");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Route Tester", characterId: "void-marshal" };
    state.players[0]!.private.notes = ["guardian-span-clearance", "gate-of-cinders-breached"];

    for (const transition of BOARD_RING_TRANSITIONS) {
      state.players[0]!.sectorId = transition.sourceSectorId;
      state.players[0]!.character.currentSpaceId = transition.sourceSectorId;
      state.movementRolls = { "seat-1": 1 };
      const plan = buildMovementRoutePlan(state, "seat-1");
      expect(plan?.routes.some((route) => route.sectorId === transition.destinationSectorId), transition.edgeId).toBe(true);
    }
  });

  it("keeps the final approach exact and its clearances obtainable", () => {
    const innerBreach = BOARD_RING_TRANSITIONS.find(
      (transition) => transition.sourceSectorId === "middle_guardian_span" && transition.destinationSectorId === "inner_veil_rift"
    );
    const centerEntries = BOARD_RING_TRANSITIONS.filter((transition) => transition.destinationSectorId === "center_cinder_gate");
    const effectText = JSON.stringify(BOARD_TEXT_EFFECTS);

    expect(innerBreach).toMatchObject({
      requiredNotes: ["guardian-span-clearance"],
      lockedReason: "Requires Guardian Span Clearance"
    });
    expect(centerEntries.map((entry) => entry.sourceSectorId).sort()).toEqual(["inner_blackstar_shortcut", "inner_gate_of_cinders"]);
    expect(centerEntries.every((entry) => entry.requiredNotes.includes("gate-of-cinders-breached"))).toBe(true);
    expect(effectText).toContain("guardian-span-clearance");
    expect(effectText).toContain("gate-of-cinders-breached");
  });

  it("keeps current board authoring free of retired Heat mechanics", () => {
    expect(JSON.stringify(BOARD_SPACES)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|heatThreshold|HEAT_THRESHOLD_REACHED/);
  });
});
