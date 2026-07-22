import { createCanonicalSectorGraph } from "../../../game/data/canonicalSectorGraph.js";
import type { TileChallenge } from "../../../game/schema/tileChallenge.schema.js";

type AuthoredTileChallenge = TileChallenge;

const tileChallengeModules = import.meta.glob(
  ["../../../../content/tile-challenges/*.json"],
  { eager: true, import: "default" }
) as Record<string, AuthoredTileChallenge>;

const challengeReferences = Object.values(tileChallengeModules);

export const canonicalMapCardReferences = new Map<string, string[]>();

for (const sector of createCanonicalSectorGraph()) {
  for (const cardId of Object.values(sector.encounterDecks).flat()) {
    const references = canonicalMapCardReferences.get(cardId) ?? [];
    if (!references.includes(sector.id)) references.push(sector.id);
    canonicalMapCardReferences.set(cardId, references);
  }
}

for (const challenge of challengeReferences) {
  const references = canonicalMapCardReferences.get(challenge.id) ?? [];
  if (!references.includes(challenge.sectorId)) references.push(challenge.sectorId);
  canonicalMapCardReferences.set(challenge.id, references);
}

export function getMapTileReferencesForCard(cardId: string): string[] {
  return [...(canonicalMapCardReferences.get(cardId) ?? [])];
}

export const canonicalTileChallengeReferences = challengeReferences;
