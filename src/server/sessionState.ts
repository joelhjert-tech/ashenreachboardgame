import { randomUUID } from "node:crypto";
import { loadCharacters } from "../game/content/characters.js";
import { loadAfflictionCards } from "../game/content/afflictions.js";
import { loadContracts } from "../game/content/contracts.js";
import { loadFollowers } from "../game/content/followers.js";
import { loadGear } from "../game/content/gear.js";
import { loadTileChallenges } from "../game/content/tileChallenges.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../game/data/canonicalSectorGraph.js";
import { getScenarioDefinition, SCENARIOS } from "../game/data/scenarios.js";
import { createInitialScenarioProgress } from "../game/rules/scenarioAmbient.js";
import { applyStartingLoadout, createInitialSoloRerollCharges, type StartingLoadoutCatalogs } from "../game/rules/startingLoadout.js";
import { getHeatThresholdForMode, getWoundThresholdForMode } from "../game/rules/soloTuning.js";
import { createInitialAfflictionUsageState } from "../game/rules/afflictions.js";
import { attachTileChallengesToSectors } from "../game/rules/tileChallenges.js";
import type { Character } from "../game/schema/character.schema.js";
import type { GameMode, GameState, InteractionMode, PlayerState, SessionMode } from "../game/schema/session.schema.js";
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

export function getSeatCountForSession(
  sessionMode: SessionMode,
  playerCount?: number
): number {
  if (sessionMode === "single-player") {
    return 1;
  }

  if (playerCount === undefined) {
    return sessionSeatLayouts.multiplayer.length;
  }

  return Math.max(2, Math.min(sessionSeatLayouts.multiplayer.length, playerCount));
}

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
    statUpgrades: character.statUpgrades ? { ...character.statUpgrades } : undefined,
    trophies: character.trophies,
    trophyPile: [...(character.trophyPile ?? [])]
  };
}

function createPlayerState(
  seatId: string,
  character: Character,
  currentSpaceId: string,
  seatIndex: number,
  sessionMode: SessionMode,
  loadoutCatalogs: StartingLoadoutCatalogs
): PlayerState {
  const loadedCharacter = applyStartingLoadout(character, {
    sessionMode,
    seatIndex,
    catalogs: loadoutCatalogs,
    assignStartingContract: false
  });

  return {
    seatId,
    sectorId: currentSpaceId,
    private: {
      hand: [],
      notes: []
    },
    faceupAfflictions: [],
    facedownAfflictions: [],
    afflictionUsageState: createInitialAfflictionUsageState(),
    afflictionDrawHistory: [],
    character: cloneCharacter(loadedCharacter, currentSpaceId)
  };
}

export function createInitialSessionState(
  sessionId: string,
  sessionMode: SessionMode = "multiplayer",
  scenarioId?: string,
  interactionMode?: InteractionMode,
  gameMode: GameMode = "standard",
  playerCount?: number,
  options: { lobbyConfigured?: boolean; setupHostSeatId?: string | null } = {}
): GameState {
  const characters = loadCharacters();
  const sectors = createCanonicalSectorGraph();
  const tileChallenges = [...loadTileChallenges().values()];
  const sectorsWithChallenges = attachTileChallengesToSectors(sectors, tileChallenges);
  const gear = loadGear();
  const followers = loadFollowers();
  const availableContracts = [...loadContracts().values()];
  const availableAfflictions = [...loadAfflictionCards().values()];
  const loadoutCatalogs = { contracts: availableContracts, gear, followers };
  const defaultScenario = scenarioId ? getScenarioDefinition(scenarioId) ?? SCENARIOS[0] : SCENARIOS[0];
  const configuredSeats = sessionSeatLayouts[sessionMode].slice(0, getSeatCountForSession(sessionMode, playerCount));
  const selectedCharacters = configuredSeats.map(({ characterId }) => {
    const character = characters.get(characterId);

    if (!character) {
      throw new Error(`Missing default character ${characterId}`);
    }

    return character;
  });

  validateCanonicalSectorGraph(sectorsWithChallenges);

  return {
    sessionId,
    status: "lobby",
    sessionMode,
    gameMode,
    interactionMode: interactionMode ?? (sessionMode === "single-player" ? "co-op" : "rivalry"),
    setupHostSeatId: options.setupHostSeatId ?? null,
    lobbyConfigured: options.lobbyConfigured ?? true,
    winnerSeatId: null,
    activeScenarioId: defaultScenario?.id ?? "scenario_broken_seal",
    scenarioProgress: createInitialScenarioProgress(defaultScenario?.id ?? "scenario_broken_seal", sessionMode),
    phase: "start",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: configuredSeats.map(({ seatId }) => seatId),
    heatThreshold: getHeatThresholdForMode(sessionMode),
    woundThreshold: getWoundThresholdForMode(sessionMode),
    sequence: 0,
    escalationLevel: 0,
    sectors: sectorsWithChallenges,
    seats: configuredSeats.map(({ seatId, characterId }) => ({
      seatId,
      characterId,
      characterSelected: false,
      displayName: null,
      startingContractOptions: [],
      selectedStartingContractId: null,
      missionSelectedAt: null,
      connected: false,
      ready: false,
      kicked: false,
      joinToken: createJoinToken({ sessionId, seatId, secret: randomUUID() })
    })),
    players: configuredSeats.map(({ seatId }, index) =>
      createPlayerState(
        seatId,
        selectedCharacters[index]!,
        selectedCharacters[index]?.currentSpaceId ?? sectorsWithChallenges[0]?.id ?? "ashwake-crossing",
        index,
        sessionMode,
        loadoutCatalogs
      )
    ),
    availableContracts,
    availableAfflictions,
    nemesisChampions: [],
    nemesisNexusCountdowns: [],
    shopStockReveals: [],
    movementRolls: undefined,
    movementAdjustments: undefined,
    gateSaintSafeConduct: null,
    soloRerollCharges: createInitialSoloRerollCharges(sessionMode, configuredSeats.map(({ seatId }) => seatId)),
    eventLog: [],
    recentEncounterCardIds: [],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    pendingFailureReaction: null,
    pendingStaticIntercessionReaction: null,
    pendingScarConsequence: null,
    pendingScarConsequenceQueue: [],
    resolvedScarSourceEventIds: [],
    pendingTileChallenge: null,
    tileChallengeProgress: null,
    activeResolution: null,
    lastOutcomeSummary: null
  };
}
