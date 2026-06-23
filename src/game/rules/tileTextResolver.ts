import type { EncounterEffect } from "../schema/card.schema.js";
import { resolveBoardTextChoice, resolveBoardTextEffect } from "../data/boardTextEffects.js";

export interface TileTextResolution {
  effectKey: string;
  summary: string;
  effect: EncounterEffect | null;
}

export function resolveSpaceText(effectKey: string, choiceId?: string): TileTextResolution {
  const definition = resolveBoardTextEffect(effectKey);

  if (definition?.choices && definition.choices.length > 0) {
    const choice = choiceId ? resolveBoardTextChoice(effectKey, choiceId) : null;

    return choice
      ? {
          effectKey,
          summary: choice.summary,
          effect: choice.effect
        }
      : {
          effectKey,
          summary: choiceId
            ? `Unknown board-text choice ${choiceId} for ${effectKey}.`
            : `A choice is required before resolving ${effectKey}.`,
          effect: null
        };
  }

  return definition
    ? {
        effectKey: definition.effectKey,
        summary: definition.summary,
        effect: definition.effect
      }
    : {
        effectKey,
        summary: `No resolver is registered yet for ${effectKey}.`,
        effect: null
      };
}
