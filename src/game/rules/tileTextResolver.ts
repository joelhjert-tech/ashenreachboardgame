import type { EncounterEffect } from "../schema/card.schema.js";

export interface TileTextResolution {
  effectKey: string;
  summary: string;
  effect: EncounterEffect | null;
}

const tileTextEffectMap: Record<string, TileTextResolution> = {
  outer_emberSanctumRest: {
    effectKey: "outer_emberSanctumRest",
    summary: "Recovered 1 wound at Ember Sanctum.",
    effect: {
      type: "take_wound",
      amount: 0
    }
  },
  outer_hollowVeilSweep: {
    effectKey: "outer_hollowVeilSweep",
    summary: "Recovered one salvage-grade gear cache from Hollow Veil Yard.",
    effect: {
      type: "gainGear",
      gearId: "coffin-rig"
    }
  },
  center_resolveScenarioConfrontation: {
    effectKey: "center_resolveScenarioConfrontation",
    summary: "Resolved the active Cinder Gate confrontation.",
    effect: null
  }
};

export function resolveSpaceText(effectKey: string): TileTextResolution {
  return (
    tileTextEffectMap[effectKey] ?? {
      effectKey,
      summary: `No resolver is registered yet for ${effectKey}.`,
      effect: null
    }
  );
}
