import { join } from "node:path";
import {
  artifactCardSchema,
  type ArtifactCard,
  type AuthoredEncounterEffect
} from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

function linkOwnedArtifactGear(
  effect: AuthoredEncounterEffect,
  artifactCardId: string
): AuthoredEncounterEffect {
  if (effect.type === "gain_gear") {
    return {
      ...effect,
      sourceArtifactCardId: artifactCardId
    };
  }
  if (effect.type === "sequence") {
    return {
      ...effect,
      effects: effect.effects.map((entry) => linkOwnedArtifactGear(entry, artifactCardId))
    };
  }
  return effect;
}

export function loadArtifactCards(
  contentRoot = join(process.cwd(), "content", "cards", "artifacts")
): Map<string, ArtifactCard> {
  const cards = loadContentMap(contentRoot, artifactCardSchema);
  return new Map(
    [...cards].map(([id, card]) => [
      id,
      {
        ...card,
        resolveEffect: linkOwnedArtifactGear(card.resolveEffect, card.id)
      }
    ])
  );
}
