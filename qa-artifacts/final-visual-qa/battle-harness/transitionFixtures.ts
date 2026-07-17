import type { PublicPatchPayload, StatePatch } from "/src/client/shared/types.ts";

export type TransitionState = "board-before" | "battle-active" | "battle-resolved" | "board-restored";

// Canonical public fixture values are extracted from TvApp.test.tsx's createPatch
// and its Cinder-Veil Stalker battle cases. This module is QA-only.
export function createTransitionPatch(state: TransitionState): StatePatch<PublicPatchPayload> {
  const battle = state === "battle-active" || state === "battle-resolved";
  const resolved = state === "battle-resolved";
  return {
    type: "STATE_PATCH",
    sessionId: "RT7P4",
    sequence: state === "board-before" ? 1 : state === "battle-active" ? 2 : state === "battle-resolved" ? 3 : 4,
    phase: battle ? "resolution" : "action",
    payload: {
      status: "active",
      sessionMode: "multiplayer",
      gameMode: "standard",
      interactionMode: "rivalry",
      setupHostSeatId: "seat-1",
      lobbyConfigured: true,
      hostPhoneConnected: true,
      winnerSeatId: null,
      activeScenario: {
        id: "scenario_broken_seal",
        name: "The Broken Seal",
        theme: "An ancient prison has cracked open.",
        sheetArtPath: "/assets/scenarios/broken-seal.png",
        difficulty: "easy-medium",
        publicDisplay: { modeLabel: "Solo / Co-op", objective: "Stabilize the Broken Seal before the breach collapses the ward.", privacy: "Public scenario pressure only." },
        pressureSummary: "Keep the seals intact.",
        confrontationTitle: "Reseal the Prison",
        progressLabel: "Seals",
        progress: 2,
        threshold: 6,
        setup: ["Place 6 Seal tokens on this scenario sheet."],
        specialRules: ["At the start of each player's turn, roll 1 die."],
        confrontationSteps: ["Test Strength 10."],
        victoryText: "Pass at least two tests to win."
      },
      scenarioTelemetry: [],
      scenarioPressure: {
        scenarioId: "scenario_broken_seal", scenarioName: "The Broken Seal", mode: "rivalry", scenarioStatus: "active",
        pressureTrack: { name: "Seal Integrity", current: 4, max: 6, modifier: 0, difficultyBonus: 0, failureAtMax: false, tickTiming: "Round end", collapseRule: "Seal collapses when integrity hits 0." },
        collapseTrack: { name: "Escalation", current: 1, max: 6, modifier: 0, difficultyBonus: 0, failureAtMax: true, tickTiming: "Round end", collapseRule: "The run fails at maximum escalation." },
        objectiveProgress: { label: "Seal Restoration Marks", current: 2, required: 6, completed: false },
        publicSummary: "Restore seals while the escalation clock climbs.",
        modeSpecific: { kind: "rivalry", label: "Rivalry", summary: "Public scenario pressure with phone-only private agendas.", privateAgenda: "phone-only" }
      },
      scenarioProgress: { seals: 2 },
      seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Joel", connected: true, ready: true, startingMissionSelected: true, startingMissionTitle: "Crossing Thread", kicked: false }],
      sectors: [{ id: "ashwake-crossing", name: "Ashwake Crossing", regionTier: "borderlight", neighbors: [], danger: 2, encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] } }],
      players: [{ seatId: "seat-1", sectorId: "ashwake-crossing", character: { id: "void-marshal", name: "Tarek Voss", archetype: "Void Marshal", status: "active", activeContract: { contractId: "cartel-crossing-thread", progress: 1 }, stats: { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 }, trophies: 0, heat: 0, wounds: 0, scars: [], heldGearCount: 0, equippedGear: { weapon: null, armor: null, utility: null } } }],
      activeSeatIndex: 0,
      turnOrder: ["seat-1"],
      escalationLevel: 0,
      escalationThreshold: 6,
      escalationModifier: 0,
      availableContracts: [{ id: "cartel-crossing-thread", name: "Crossing Thread", factionGiver: "Pale Cartels", text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.", objective: { type: "spaceTextResolved", effectKey: "outer_ashwakeClearLane", label: "Clear the Ashwake convoy lane", target: 1 } }],
      encounter: battle ? { id: "cinder-veil-stalker", title: "Cinder-Veil Stalker", cardType: "enemy", enemyName: "Cinder-Veil Stalker", flavor: "The ash around it begins to boil.", stat: "grit", difficulty: 8 } : null,
      pendingEnemyRoll: null,
      outcomeSummary: resolved ? { seatId: "seat-1", movedToSectorId: "ashwake-crossing", encounterCardId: "cinder-veil-stalker", encounterTitle: "Cinder-Veil Stalker", encounterCardType: "enemy", checkStat: "grit", die1: 4, die2: 1, statBonus: 6, checkTotal: 11, difficulty: 5, enemyRollerSeatId: "seat-1", enemyDie1: 3, enemyDie2: null, enemyBonus: 5, enemyTotal: 8, success: true, summary: "Tarek Voss wins the battle. Cinder-Veil Stalker added to Trophy Pile." } : null,
      publicResultDeltas: [],
      activeResolution: battle ? {
        id: "seat-1:threat:cinder-veil-stalker:test", playerId: "seat-1", source: "threat", stage: resolved ? "roll_result" : "battle_setup",
        card: { id: "cinder-veil-stalker", title: "Cinder-Veil Stalker", type: "enemy", flavor: "The ash around it begins to boil.", artType: "threat" },
        battle: { enemyName: "Cinder-Veil Stalker", stat: "grit", difficulty: 8, modifiers: [{ label: "Base Grit", value: 2 }, { label: "Black Route Fuse", value: 3 }, { label: "Fandiablos", value: 1 }, { label: "Enemy", value: 5 }] },
        roll: resolved ? { dice: [4, 1], baseTotal: 5, modifierTotal: 6, finalTotal: 11, target: 8, success: true } : undefined,
        outcome: resolved ? { title: "Combat victory", text: "Success: the stalker breaks. Cinder-Veil Stalker added to Trophy Pile.", effects: ["Gain 1 trophy.", "Cinder-Veil Stalker added to Trophy Pile."] } : undefined
      } : null,
      shopEncounter: null,
      recentAbilityTriggers: [],
      nemesis: null
    }
  } as StatePatch<PublicPatchPayload>;
}

export function createMovementPatch(kind: "board" | "planner" | "moved" | "battle", sequence: number): StatePatch<PublicPatchPayload> {
  const patch = createTransitionPatch(kind === "battle" ? "battle-active" : "board-before");
  patch.sequence = sequence;
  patch.phase = kind === "planner" ? "navigation" : kind === "battle" ? "resolution" : "action";
  const route = ["ashwake-crossing", "outer_ember_sanctum", "middle_red_march_outpost", "reavers-den", "ashen-chapel"];
  const destination = { sectorId: "ashen-chapel", name: "Ashen Chapel", ring: "middle" as const, distance: 4, route, routeNames: ["Ashwalk Bridge", "Pilgrim Lock Gate", "Choir Bastion", "Reaver's Den", "Ashen Chapel"], tags: ["anomaly"], threatIcons: ["blue" as const], ruleText: "Read the chapel text when the sector is clear.", loreText: "Old prayers repeat beneath the ash.", faceUpThreats: [], occupants: [], strategicTags: ["danger" as const] };
  patch.payload.sectors.push({ id: "ashen-chapel", name: "Ashen Chapel", regionTier: "red_march", neighbors: ["reavers-den"], danger: 2, tileChallenges: [{ id: "rift-whispers-ashen-chapel", name: "Rift Whispers", challengeType: "anomaly", sectorId: "ashen-chapel", testStat: "signal", difficulty: 8, trigger: "onArrival", authoredOrder: 0, recurring: true, tags: ["anomaly"], lore: "A voice repeats from the broken choir.", artCardId: "rift-whispers", successSummary: "The signal steadies.", failureSummary: "Gain the authored Scar." }], encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] } });
  if (kind === "planner") patch.payload.movementPlanner = { active: true, movementValue: 4, currentSectorId: "ashwake-crossing", currentSectorName: "Ashwalk Bridge", selectedDestinationId: "ashen-chapel", destinations: [destination] };
  if (kind === "moved" || kind === "battle") { patch.payload.players[0]!.sectorId = "ashen-chapel"; patch.payload.movementPlanner = null; }
  if (kind !== "battle") { patch.payload.activeResolution = null; patch.payload.encounter = null; patch.payload.outcomeSummary = null; }
  return patch;
}
