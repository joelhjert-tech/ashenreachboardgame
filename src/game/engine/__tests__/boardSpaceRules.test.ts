import { describe, expect, it } from "vitest";
import { BOARD_SPACES, getBoardSpace } from "../../data/boardSpaces.js";
import { MOVEMENT_BOXES } from "../../data/movementBoxes.js";
import { SCENARIOS } from "../../data/scenarios.js";
import { resolveBoardSpaceEvent } from "../../tileResolver.js";
import { buildEngagementQueue, shouldResolveSpaceText } from "../../rules/engagementPhase.js";
import { calculateExplorationDraws, type BoardThreatCard } from "../../rules/explorationPhase.js";
import { getMovementProfile } from "../../rules/movementPhase.js";
import { advanceScenarioProgress, hasScenarioVictory } from "../../rules/scenarioResolver.js";

const samplePlayer = {
  seatId: "seat-1",
  sectorId: "ashwake-crossing",
  private: {
    hand: [],
    notes: []
  },
  character: {
    id: "void-marshal",
    name: "Sable Vey",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active" as const,
    stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
};

describe("board space data", () => {
  it("includes the engine-critical original Ashen Reach anchor spaces", () => {
    const spaceIds = new Set(BOARD_SPACES.map((space) => space.id));

    expect(spaceIds.has("outer_ember_sanctum")).toBe(true);
    expect(spaceIds.has("middle_guardian_span")).toBe(true);
    expect(spaceIds.has("inner_veil_rift")).toBe(true);
    expect(spaceIds.has("center_cinder_gate")).toBe(true);
  });

  it("surfaces movement boxes through the dedicated data file", () => {
    expect(MOVEMENT_BOXES.map((entry) => entry.spaceId).sort()).toEqual(
      ["mirecoil-beacon", "middle_guardian_span"].sort()
    );
  });

  it("keeps core scenarios as data, not hardcoded UI text", () => {
    expect(SCENARIOS).toHaveLength(6);
    expect(SCENARIOS.map((entry) => entry.id)).toContain("scenario_broken_seal");
    expect(SCENARIOS.every((entry) => entry.setup.length > 0)).toBe(true);
    expect(SCENARIOS.every((entry) => entry.specialRules.length > 0)).toBe(true);
  });
});

describe("exploration and engagement rules", () => {
  it("calculates draw counts from printed icons, card icons, and existing cards", () => {
    const space = getBoardSpace("ashwake-crossing");

    if (!space) {
      throw new Error("Missing board space fixture");
    }

    const cards: BoardThreatCard[] = [
      {
        id: "smoke-leech-clutch",
        category: "enemy",
        icons: ["yellow"]
      },
      {
        id: "relay-husk",
        category: "encounter",
        icons: ["blue", "yellow"]
      }
    ];

    expect(calculateExplorationDraws(space, cards)).toEqual({
      red: 0,
      blue: 0,
      yellow: 2
    });
  });

  it("orders engagement resolution event, enemy, encounter, asset", () => {
    const queue = buildEngagementQueue([
      { id: "asset-a", category: "asset", icons: [] },
      { id: "enemy-a", category: "enemy", icons: ["red"] },
      { id: "event-a", category: "event", icons: ["blue"] },
      { id: "encounter-a", category: "encounter", icons: ["yellow"] }
    ]);

    expect(queue.map((entry) => entry.category)).toEqual(["event", "enemy", "encounter", "asset"]);
  });

  it("only resolves space text in outer and middle tiers when no threat cards remain", () => {
    const outer = getBoardSpace("hollow-veil-yard");
    const inner = getBoardSpace("inner_cinder_lattice");

    if (!outer || !inner) {
      throw new Error("Missing board space fixture");
    }

    expect(shouldResolveSpaceText(outer, [])).toBe(true);
    expect(shouldResolveSpaceText(outer, [{ id: "enemy-a", category: "enemy", icons: ["red"] }])).toBe(false);
    expect(shouldResolveSpaceText(inner, [{ id: "enemy-a", category: "enemy", icons: ["red"] }])).toBe(true);
  });
});

describe("board space resolver", () => {
  it("builds a phase-aware board space event instead of auto-triggering a landing challenge", () => {
    const space = getBoardSpace("mirecoil-beacon");

    if (!space) {
      throw new Error("Missing board space fixture");
    }

    const event = resolveBoardSpaceEvent(samplePlayer, space, []);

    expect(event.spaceId).toBe("mirecoil-beacon");
    expect(event.exploration.skipped).toBe(false);
    expect(event.engagement.shouldResolveTextBox).toBe(true);
    expect(event.textBox.effectKey).toBe("outer_mirecoilTraffic");
    expect(event.movementBox?.effectKey).toBe("movement_beaconRoute");
  });
});

describe("movement and scenario helpers", () => {
  it("forces inner-tier movement to exactly one step with exploration skipped", () => {
    expect(getMovementProfile("inner")).toEqual({
      tier: "inner",
      movementRollAllowed: false,
      movementAmount: 1,
      movementModifiersAllowed: false,
      skipsExploration: true,
      resolveTextBoxAlways: true
    });
  });

  it("tracks scenario progress through keyed state", () => {
    const scenario = SCENARIOS[0];
    const progress = advanceScenarioProgress({}, scenario);
    let advanced = progress;

    for (let index = 1; index < scenario.victoryThreshold; index += 1) {
      advanced = advanceScenarioProgress(advanced, scenario);
    }

    expect(hasScenarioVictory(progress, scenario)).toBe(false);
    expect(hasScenarioVictory(advanced, scenario)).toBe(true);
  });
});
