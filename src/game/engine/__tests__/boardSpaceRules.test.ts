import { describe, expect, it } from "vitest";
import { BOARD_SPACES, getBoardSpace, isScenarioConfrontationSpace } from "../../data/boardSpaces.js";
import { resolveBoardTextEffect, validateBoardTextEffectCoverage } from "../../data/boardTextEffects.js";
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
    trophies: 0,
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

    expect(BOARD_SPACES).toHaveLength(49);
    expect(spaceIds.has("outer_ember_sanctum")).toBe(true);
    expect(spaceIds.has("middle_guardian_span")).toBe(true);
    expect(spaceIds.has("inner_veil_rift")).toBe(true);
    expect(spaceIds.has("center_cinder_gate")).toBe(true);
    expect(spaceIds.has("north-dock-bastion")).toBe(true);
    expect(spaceIds.has("votive-engine-room")).toBe(true);
    expect(spaceIds.has("kettleward-foundry")).toBe(true);
    expect(BOARD_SPACES.filter((space) => space.tier === "outer")).toHaveLength(24);
    expect(BOARD_SPACES.filter((space) => space.tier === "middle")).toHaveLength(16);
    expect(BOARD_SPACES.filter((space) => space.tier === "inner")).toHaveLength(8);
    expect(BOARD_SPACES.filter((space) => space.tier === "center")).toHaveLength(1);
  });

  it("gives every sector board-game presentation metadata", () => {
    expect(
      BOARD_SPACES.every(
        (space) => space.tags.length > 0 && space.ruleText.trim().length > 0 && space.loreText.trim().length > 0
      )
    ).toBe(true);
    expect(getBoardSpace("outer_waymarket")?.tags).toEqual(expect.arrayContaining(["shop", "crossroads"]));
    expect(getBoardSpace("center_cinder_gate")?.ruleText).toMatch(/scenario directive/i);
  });

  it("surfaces movement boxes through the dedicated data file", () => {
    expect(MOVEMENT_BOXES.map((entry) => entry.spaceId).sort()).toEqual(
      ["mirecoil-beacon", "middle_guardian_span", "outer_broken_causeway", "shattered-causeway", "transit-gate"].sort()
    );
  });

  it("keeps core scenarios as data, not hardcoded UI text", () => {
    expect(SCENARIOS).toHaveLength(6);
    expect(SCENARIOS.map((entry) => entry.id)).toContain("scenario_broken_seal");
    expect(SCENARIOS.every((entry) => entry.setup.length > 0)).toBe(true);
    expect(SCENARIOS.every((entry) => entry.specialRules.length > 0)).toBe(true);
  });

  it("keeps every board-space text effect mapped through data definitions", () => {
    expect(validateBoardTextEffectCoverage()).toEqual({
      missingEffectKeys: [],
      unusedEffectKeys: [],
      mismatchedChoiceKeys: [],
      invalidCheckKeys: [],
      legacyBoardTestKeys: []
    });
  });

  it("marks deck-linked board text through data instead of effect-key switches", () => {
    expect(resolveBoardTextEffect("outer_glassmereChorus")?.sectorDeck?.kind).toBe("anomaly");
    expect(resolveBoardTextEffect("outer_hollowVeilSweep")?.sectorDeck?.kind).toBe("artifact");
    expect(resolveBoardTextEffect("outer_mirecoilTraffic")?.sectorDeck?.kind).toBe("contract");
    expect(resolveBoardTextEffect("outer_emberwatchBrace")?.sectorDeck?.kind).toBe("escalation");
    expect(resolveBoardTextEffect("middle_guardianSpanThreshold")?.sectorDeck).toBeUndefined();
  });

  it("keeps inner-tier entry gates declared in board-space data", () => {
    const veilRift = getBoardSpace("inner_veil_rift");
    const cinderGate = getBoardSpace("center_cinder_gate");

    expect(veilRift?.movementRequirements).toEqual([
      {
        allowedFrom: ["middle_guardian_span"],
        requiredNotes: ["guardian-span-clearance"],
        errorMessage: "Resolve Guardian Span before entering the inner breach"
      }
    ]);
    expect(cinderGate?.movementRequirements).toEqual([
      {
        allowedFrom: ["inner_gate_of_cinders", "inner_blackstar_shortcut"],
        errorMessage: "Only the Last Signal Well or Dead Star Reliquary opens the final route into the core chamber"
      },
      {
        requiredNotes: ["gate-of-cinders-breached"],
        errorMessage: "Resolve the Last Signal Well before entering the Ashen Reach Core"
      }
    ]);
  });

  it("marks the core chamber as a scenario-confrontation space in board data", () => {
    expect(isScenarioConfrontationSpace("center_cinder_gate")).toBe(true);
    expect(isScenarioConfrontationSpace("ashwake-crossing")).toBe(false);
    expect(getBoardSpace("center_cinder_gate")?.textBox.intent).toBe("scenario-confrontation");
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

  it("orders engagement resolution event, enemy, nemesis, encounter, asset", () => {
    const queue = buildEngagementQueue([
      { id: "asset-a", category: "asset", icons: [] },
      { id: "enemy-a", category: "enemy", icons: ["red"] },
      { id: "nemesis-a", category: "nemesis", icons: ["red", "blue"] },
      { id: "event-a", category: "event", icons: ["blue"] },
      { id: "encounter-a", category: "encounter", icons: ["yellow"] }
    ]);

    expect(queue.map((entry) => entry.category)).toEqual(["event", "enemy", "nemesis", "encounter", "asset"]);
  });

  it("only resolves space text in outer and middle tiers when no threat cards remain", () => {
    const outer = getBoardSpace("hollow-veil-yard");
    const inner = getBoardSpace("inner_cinder_lattice");

    if (!outer || !inner) {
      throw new Error("Missing board space fixture");
    }

    expect(shouldResolveSpaceText(outer, [])).toBe(true);
    expect(shouldResolveSpaceText(outer, [{ id: "enemy-a", category: "enemy", icons: ["red"] }])).toBe(false);
    expect(shouldResolveSpaceText(inner, [{ id: "enemy-a", category: "enemy", icons: ["red"] }])).toBe(false);
  });

  it("calculates inner-ring printed threat draws instead of skipping exploration", () => {
    const space = getBoardSpace("the-bone-meridian");

    if (!space) {
      throw new Error("Missing inner board space fixture");
    }

    expect(calculateExplorationDraws(space, [])).toEqual({
      red: 1,
      blue: 0,
      yellow: 1
    });
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
    expect(event.printedThreatIcons).toEqual(["yellow", "blue"]);
    expect(event.exploration.skipped).toBe(false);
    expect(event.engagement.shouldResolveTextBox).toBe(true);
    expect(event.textBox.effectKey).toBe("outer_mirecoilTraffic");
    expect(event.movementBox?.effectKey).toBe("movement_beaconRoute");
  });
});

describe("movement and scenario helpers", () => {
  it("forces inner-tier movement to exactly one step while preserving exploration", () => {
    expect(getMovementProfile("inner")).toEqual({
      tier: "inner",
      movementRollAllowed: false,
      movementAmount: 1,
      movementModifiersAllowed: false,
      skipsExploration: false,
      resolveTextBoxAlways: false
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
