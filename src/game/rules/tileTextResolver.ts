import type { EncounterEffect } from "../schema/card.schema.js";
import type { Stat } from "../schema/character.schema.js";
import { resolveBoardTextChoice, resolveBoardTextEffect } from "../data/boardTextEffects.js";

export interface TileTextResolution {
  effectKey: string;
  summary: string;
  effect: EncounterEffect | null;
  check?: {
    stat: Stat;
    difficulty: number;
    failureSummary?: string;
    failureEffect?: EncounterEffect | null;
  } | null;
}

export function resolveSpaceText(effectKey: string, choiceId?: string): TileTextResolution {
  const definition = resolveBoardTextEffect(effectKey);

  if (definition?.choices && definition.choices.length > 0) {
    const choice = choiceId ? resolveBoardTextChoice(effectKey, choiceId) : null;

    return choice
      ? {
          effectKey,
          summary: choice.summary,
          effect: choice.effect,
          check: choice.stat
            ? {
                stat: choice.stat,
                difficulty: choice.difficulty ?? 0,
                failureSummary: choice.failureSummary,
                failureEffect: choice.failureEffect ?? null
              }
            : null
        }
      : {
          effectKey,
          summary: choiceId
            ? `Unknown board-text choice ${choiceId} for ${effectKey}.`
            : `A choice is required before resolving ${effectKey}.`,
          effect: null,
          check: null
        };
  }

  return definition
    ? {
        effectKey: definition.effectKey,
        summary: definition.summary,
        effect: definition.effect,
        check: definition.stat
          ? {
              stat: definition.stat,
              difficulty: definition.difficulty ?? 0,
              failureSummary: definition.failureSummary,
              failureEffect: definition.failureEffect ?? null
            }
          : null
      }
    : {
        effectKey,
        summary: `No resolver is registered yet for ${effectKey}.`,
        effect: null,
        check: null
      };
}
