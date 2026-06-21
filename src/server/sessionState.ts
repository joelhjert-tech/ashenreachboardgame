import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCharacters } from "../game/content/characters.js";
import { loadContracts } from "../game/content/contracts.js";
import { sectorGraphSchema } from "../game/schema/sector.schema.js";
import type { Character } from "../game/schema/character.schema.js";
import type { GameState, PlayerState } from "../game/schema/session.schema.js";
import { createJoinToken } from "./auth.js";

const seatIds = ["seat-1", "seat-2", "seat-3"] as const;
const defaultCharacterIds = ["void-marshal", "signal-witch", "grave-engineer"] as const;

function cloneCharacter(character: Character, currentSpaceId: string): Character {
  return {
    ...character,
    currentSpaceId,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function loadBorderlightSectors() {
  const parsed = JSON.parse(
    readFileSync(join(process.cwd(), "content", "sectors", "borderlight.json"), "utf8")
  );

  return sectorGraphSchema.parse(parsed).nodes;
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

export function createInitialSessionState(sessionId: string): GameState {
  const characters = loadCharacters();
  const sectors = loadBorderlightSectors();
  const availableContracts = [...loadContracts().values()];
  const startingSectors = sectors.slice(0, seatIds.length).map((sector) => sector.id);
  const selectedCharacters = defaultCharacterIds.map((characterId) => {
    const character = characters.get(characterId);

    if (!character) {
      throw new Error(`Missing default character ${characterId}`);
    }

    return character;
  });

  return {
    sessionId,
    status: "lobby",
    winnerSeatId: null,
    phase: "start",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: [...seatIds],
    heatThreshold: 6,
    sequence: 0,
    escalationLevel: 0,
    sectors,
    seats: seatIds.map((seatId, index) => ({
      seatId,
      characterId: defaultCharacterIds[index],
      displayName: null,
      connected: false,
      kicked: false,
      joinToken: createJoinToken({ sessionId, seatId })
    })),
    players: seatIds.map((seatId, index) =>
      createPlayerState(
        seatId,
        selectedCharacters[index]!,
        startingSectors[index] ?? sectors[0]?.id ?? "ashwake-crossing"
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
