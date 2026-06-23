import { loadCharacters } from "../game/content/characters.js";
import { loadContracts } from "../game/content/contracts.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../game/data/canonicalSectorGraph.js";
import { getScenarioDefinition, SCENARIOS } from "../game/data/scenarios.js";
import { createInitialScenarioProgress } from "../game/rules/scenarioAmbient.js";
import type { Character } from "../game/schema/character.schema.js";
import type { GameState, InteractionMode, PlayerState, SessionMode } from "../game/schema/session.schema.js";
import { createJoinToken } from "./auth.js";

const sessionSeatLayouts = {
  "single-player": [
    { seatId: "seat-1", characterId: "void-marshal" }
  ],
  multiplayer: [
    { seatId: "seat-1", characterId: "void-marshal" },
    { seatId: "seat-2", characterId: "signal-witch" },
    { seatId: "seat-3", characterId: "grave-engineer" },
    { seatId: "seat-4", characterId: "black-ledger-agent" },
    { seatId: "seat-5", characterId: "cinder-monk" },
    { seatId: "seat-6", characterId: "salvage-warden" }
  ]
} as const;

function cloneCharacter(character: Character, currentSpaceId: string): Character {
  return {
    ...character,
    currentSpaceId,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    followers: [...(character.followers ?? [])],
    abilities: [...character.abilities],
    scars: [...character.scars],
    trophies: character.trophies
  };
}

function createPlayerState(
  seatId: string,
  character: Character,
  currentSpaceId: string
): PlayerState {
  return {
    seatId,
    sectorId: currentSpaceId,
    private: {
      hand: [],
      notes: []
    },
    character: cloneCharacter(character, currentSpaceId)
  };
}

export function createInitialSessionState(
  sessionId: string,
  sessionMode: SessionMode = "multiplayer",
  scenarioId?: string,
  interactionMode?: InteractionMode
): GameState {
  const characters = loadCharacters();
  const sectors = createCanonicalSectorGraph();
  const availableContracts = [...loadContracts().values()];
  const defaultScenario = scenarioId ? getScenarioDefinition(scenarioId) ?? SCENARIOS[0] : SCENARIOS[0];
  const configuredSeats = sessionSeatLayouts[sessionMode];
  const selectedCharacters = configuredSeats.map(({ characterId }) => {
    const character = characters.get(characterId);

    if (!character) {
      throw new Error(`Missing default character ${characterId}`);
    }

    return character;
  });

  validateCanonicalSectorGraph(sectors);

  return {
    sessionId,
    status: "lobby",
    sessionMode,
    interactionMode: interactionMode ?? (sessionMode === "single-player" ? "co-op" : "rivalry"),
    winnerSeatId: null,
    activeScenarioId: defaultScenario?.id ?? "scenario_broken_seal",
    scenarioProgress: createInitialScenarioProgress(defaultScenario?.id ?? "scenario_broken_seal"),
    phase: "start",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: configuredSeats.map(({ seatId }) => seatId),
    heatThreshold: 6,
    woundThreshold: 3,
    sequence: 0,
    escalationLevel: 0,
    sectors,
    seats: configuredSeats.map(({ seatId, characterId }) => ({
      seatId,
      characterId,
      displayName: null,
      connected: false,
      kicked: false,
      joinToken: createJoinToken({ sessionId, seatId })
    })),
    players: configuredSeats.map(({ seatId }, index) =>
      createPlayerState(
        seatId,
        selectedCharacters[index]!,
        selectedCharacters[index]?.currentSpaceId ?? sectors[0]?.id ?? "ashwake-crossing"
      )
    ),
    availableContracts,
    eventLog: [],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    lastOutcomeSummary: null
  };
}
