import type { EncounterEffect } from "../schema/card.schema.js";

export interface TileTextResolution {
  effectKey: string;
  summary: string;
  effect: EncounterEffect | null;
}

const tileTextEffectMap: Record<string, TileTextResolution> = {
  outer_emberSanctumRest: {
    effectKey: "outer_emberSanctumRest",
    summary: "Recovered 1 wound and cooled 1 Heat at Ember Sanctum.",
    effect: {
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "lose_heat", amount: 1 }
      ]
    }
  },
  outer_ashwakeClearLane: {
    effectKey: "outer_ashwakeClearLane",
    summary: "Marked a clean lane through Ashwake Crossing.",
    effect: {
      type: "gain_note",
      text: "Ashwake crossing cleared. The convoy lane is charted."
    }
  },
  outer_glassmereChorus: {
    effectKey: "outer_glassmereChorus",
    summary: "Tuned the Glassmere spindle and secured a stable relay note.",
    effect: {
      type: "sequence",
      effects: [
        { type: "lose_heat", amount: 1 },
        { type: "gain_note", text: "Glassmere spindle tuned. Relay chorus remains stable." }
      ]
    }
  },
  outer_mirecoilTraffic: {
    effectKey: "outer_mirecoilTraffic",
    summary: "Pulled a fresh contract lead from Mirecoil Beacon traffic.",
    effect: {
      type: "gain_note",
      text: "Mirecoil contract lead secured from mast traffic."
    }
  },
  outer_hollowVeilSweep: {
    effectKey: "outer_hollowVeilSweep",
    summary: "Recovered one salvage-grade gear cache from Hollow Veil Yard.",
    effect: {
      type: "gain_gear",
      gearId: "coffin-rig"
    }
  },
  outer_emberwatchBrace: {
    effectKey: "outer_emberwatchBrace",
    summary: "Braced the Emberwatch ridge and logged the route.",
    effect: {
      type: "gain_note",
      text: "Emberwatch ridge braced. Safe route marker set."
    }
  },
  middle_shardSprawlBargain: {
    effectKey: "middle_shardSprawlBargain",
    summary: "Cut a hard bargain in the Shard Sprawl.",
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_note", text: "Shard Sprawl gossip traded for passage stock." },
        { type: "lose_heat", amount: 1 }
      ]
    }
  },
  middle_guardianSpanThreshold: {
    effectKey: "middle_guardianSpanThreshold",
    summary: "Aligned the Guardian Span threshold and opened the way into the inner breach.",
    effect: {
      type: "gain_note",
      text: "guardian-span-clearance"
    }
  },
  middle_webglassFracture: {
    effectKey: "middle_webglassFracture",
    summary: "Threaded the Webglass fracture path and logged a breach route.",
    effect: {
      type: "gain_note",
      text: "Webglass fracture path mapped through shifting lanes."
    }
  },
  inner_veilRiftEntry: {
    effectKey: "inner_veilRiftEntry",
    summary: "Stabilized the Veil Rift entry long enough to push deeper.",
    effect: {
      type: "gain_note",
      text: "Inner breach entry stabilized at the Veil Rift."
    }
  },
  inner_cinderLatticeTrial: {
    effectKey: "inner_cinderLatticeTrial",
    summary: "Decoded the Cinder Lattice and marked a core approach.",
    effect: {
      type: "gain_note",
      text: "Cinder lattice route resolved toward the core."
    }
  },
  inner_gateOfCindersTrial: {
    effectKey: "inner_gateOfCindersTrial",
    summary: "Forced the Gate of Cinders and prepared the final breach into the core chamber.",
    effect: {
      type: "gain_note",
      text: "gate-of-cinders-breached"
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
