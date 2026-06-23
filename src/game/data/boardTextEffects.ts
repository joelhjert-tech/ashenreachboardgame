import type { Stat } from "../schema/character.schema.js";
import type { EncounterEffect } from "../schema/card.schema.js";
import { BOARD_SPACES } from "./boardSpaces.js";

export type BoardTextDeckKind = "anomaly" | "artifact" | "contract" | "escalation";

export interface BoardTextEffectDefinition {
  effectKey: string;
  summary: string;
  effect: EncounterEffect | null;
  stat?: Stat;
  difficulty?: number;
  failureSummary?: string;
  failureEffect?: EncounterEffect | null;
  choices?: Array<{
    id: string;
    stat?: Stat;
    difficulty?: number;
    summary: string;
    effect: EncounterEffect | null;
    failureSummary?: string;
    failureEffect?: EncounterEffect | null;
  }>;
  sectorDeck?: {
    kind: BoardTextDeckKind;
  };
}

export interface BoardTextValidationResult {
  missingEffectKeys: string[];
  unusedEffectKeys: string[];
  mismatchedChoiceKeys: string[];
  invalidCheckKeys: string[];
  legacyBoardTestKeys: string[];
}

export const BOARD_TEXT_EFFECTS: Record<string, BoardTextEffectDefinition> = {
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
    stat: "guile",
    difficulty: 6,
    effect: {
      type: "gain_note",
      text: "Ashwake crossing cleared. The convoy lane is charted."
    },
    failureSummary: "The Ashwake lane looked clear until the crossing ghosts forced you back under pressure.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    }
  },
  outer_glassmereChorus: {
    effectKey: "outer_glassmereChorus",
    summary: "Tuned the Glassmere spindle and secured a stable relay note.",
    stat: "signal",
    difficulty: 7,
    effect: {
      type: "sequence",
      effects: [
        { type: "lose_heat", amount: 1 },
        { type: "gain_note", text: "Glassmere spindle tuned. Relay chorus remains stable." }
      ]
    },
    failureSummary: "The Glassmere chorus slipped sharp and left the relay line humming too hot to trust.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "anomaly"
    }
  },
  outer_mirecoilTraffic: {
    effectKey: "outer_mirecoilTraffic",
    summary: "Pulled a fresh contract lead from Mirecoil Beacon traffic.",
    stat: "signal",
    difficulty: 8,
    effect: {
      type: "gain_note",
      text: "Mirecoil contract lead secured from mast traffic."
    },
    failureSummary: "The Mirecoil traffic lanes broke into static and the contract lead dissolved into noise.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  outer_hollowVeilSweep: {
    effectKey: "outer_hollowVeilSweep",
    summary: "Recovered one salvage-grade gear cache from Hollow Veil Yard.",
    stat: "forge",
    difficulty: 7,
    effect: {
      type: "gain_gear",
      gearId: "coffin-rig"
    },
    failureSummary: "The Hollow Veil stacks shifted mid-sweep and forced you to abandon the cleaner salvage pass.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "artifact"
    }
  },
  outer_emberwatchBrace: {
    effectKey: "outer_emberwatchBrace",
    summary: "Braced the Emberwatch ridge and logged the route.",
    stat: "grit",
    difficulty: 8,
    effect: {
      type: "gain_note",
      text: "Emberwatch ridge braced. Safe route marker set."
    },
    failureSummary: "The Emberwatch ridge kicked back hard and the line only held long enough to scorch your position.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "escalation"
    }
  },
  outer_waymarketExchange: {
    effectKey: "outer_waymarketExchange",
    summary: "Worked the Waymarket exchange and secured a practical table favor.",
    stat: "guile",
    difficulty: 6,
    effect: {
      type: "sequence",
      effects: [
        { type: "lose_heat", amount: 1 },
        { type: "gain_note", text: "Waymarket favor banked for trade, aid, or a safer route." }
      ]
    },
    failureSummary: "The Waymarket deal soured and every stall seemed to know your Heat tally.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  outer_relayCrew: {
    effectKey: "outer_relayCrew",
    summary: "Recruited a relay-camp contact and recorded the route crew.",
    stat: "command",
    difficulty: 6,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "grave-scribe" },
        { type: "gain_note", text: "Relay camp contact: a route crew owes you one clean signal." }
      ]
    },
    failureSummary: "The relay camp would not commit a crew while your line looked this unstable.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  outer_saltCrossing: {
    effectKey: "outer_saltCrossing",
    summary: "Harvested void-salt and bottled it as a bargaining chip.",
    stat: "forge",
    difficulty: 7,
    effect: {
      type: "sequence",
      effects: [
        { type: "lose_heat", amount: 1 },
        { type: "gain_note", text: "Void-salt vial: useful for heat treatment or gate bargaining." }
      ]
    },
    failureSummary: "The salt bloom bit through the gloves and left the crossing colder than it looked.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "anomaly"
    }
  },
  outer_surgeryTreatment: {
    effectKey: "outer_surgeryTreatment",
    summary: "Accepted rough cinder surgery and walked away patched but warmer.",
    stat: "forge",
    difficulty: 7,
    effect: {
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "gain_heat", amount: 1 },
        { type: "gain_follower", followerId: "cinder-surgeon" },
        { type: "gain_note", text: "Cinder surgery receipt: scar treatment logged." }
      ]
    },
    failureSummary: "The surgery tent ran out of anesthetic and the patch job became a liability.",
    failureEffect: {
      type: "take_wound",
      amount: 1
    },
    sectorDeck: {
      kind: "artifact"
    }
  },
  outer_oathpostWrit: {
    effectKey: "outer_oathpostWrit",
    summary: "Claimed a faction writ from the Oathpost.",
    stat: "command",
    difficulty: 7,
    effect: {
      type: "gain_note",
      text: "Faction writ: can be cashed for bounded rivalry, aid, or a contract lead."
    },
    failureSummary: "The Oathpost refused your claim and marked the attempt as unpaid Heat.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  outer_brokenCausewayShortcut: {
    effectKey: "outer_brokenCausewayShortcut",
    summary: "Marked the Broken Causeway shortcut toward Guardian Span.",
    stat: "grit",
    difficulty: 8,
    effect: {
      type: "gain_note",
      text: "Broken Causeway shortcut marked. The fast route is dangerous but real."
    },
    failureSummary: "The causeway cracked under the attempt and threw cinder pressure through the line.",
    failureEffect: {
      type: "sequence",
      effects: [
        { type: "gain_heat", amount: 1 },
        { type: "take_wound", amount: 1 }
      ]
    },
    sectorDeck: {
      kind: "escalation"
    }
  },
  middle_relicCache: {
    effectKey: "middle_relicCache",
    summary: "Cracked the Red March relic cache.",
    stat: "guile",
    difficulty: 8,
    effect: {
      type: "gain_note",
      text: "Relic cache cracked. One artifact has a claim tag in your name."
    },
    failureSummary: "The cache lock punished the wrong pressure point and woke its reliquary alarms.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "artifact"
    }
  },
  middle_scarSurgery: {
    effectKey: "middle_scarSurgery",
    summary: "Survived field surgery in the Red March.",
    stat: "forge",
    difficulty: 9,
    effect: {
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "gain_heat", amount: 1 },
        { type: "gain_note", text: "Field surgery completed. The scar holds for now." }
      ]
    },
    failureSummary: "The surgery pit made the wound quieter, not safer.",
    failureEffect: {
      type: "gain_scar",
      scarId: "scar-wound-1"
    },
    sectorDeck: {
      kind: "escalation"
    }
  },
  middle_rivalryClaim: {
    effectKey: "middle_rivalryClaim",
    summary: "Marked a bounded rivalry claim in the pit.",
    stat: "command",
    difficulty: 8,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "pale-cartel-fixer" },
        { type: "gain_note", text: "Rivalry claim: trade, aid, duel, or steal one exposed object if the table permits rivalry." }
      ]
    },
    failureSummary: "The pit crowd rejected your claim and sold the story to your rivals.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  middle_redMarchBargain: {
    effectKey: "middle_redMarchBargain",
    summary: "Secured a Red March outpost bargain.",
    stat: "command",
    difficulty: 9,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "votive-gunner" },
        { type: "gain_note", text: "Red March outpost favor: gunner, guide, or hard military passage promised." }
      ]
    },
    failureSummary: "The outpost commander liked your nerve but not your credentials.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "contract"
    }
  },
  middle_anomalyWell: {
    effectKey: "middle_anomalyWell",
    summary: "Read the Anomaly Well and bottled a breach clue.",
    stat: "signal",
    difficulty: 9,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "choir-defector" },
        { type: "gain_note", text: "Anomaly well reading: one breach clue hums in a sealed vial." }
      ]
    },
    failureSummary: "The well answered too loudly and left the route ringing.",
    failureEffect: {
      type: "gain_heat",
      amount: 1
    },
    sectorDeck: {
      kind: "anomaly"
    }
  },
  inner_tombGateTrial: {
    effectKey: "inner_tombGateTrial",
    summary: "Passed the Tomb Gate trial and earned a grave-route answer.",
    stat: "command",
    difficulty: 10,
    effect: {
      type: "gain_note",
      text: "Tomb Gate answer recorded for the final approach."
    },
    failureSummary: "The Tomb Gate kept the answer and collected pain instead.",
    failureEffect: {
      type: "take_wound",
      amount: 1
    }
  },
  inner_blackstarShortcut: {
    effectKey: "inner_blackstarShortcut",
    summary: "Crossed the Blackstar shortcut and kept your nerve.",
    stat: "guile",
    difficulty: 11,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_note", text: "Blackstar shortcut survived. The route is ugly but fast." },
        { type: "gain_heat", amount: 1 }
      ]
    },
    failureSummary: "The Blackstar cut folded wrong and made the shortcut cost blood.",
    failureEffect: {
      type: "take_wound",
      amount: 1
    },
    sectorDeck: {
      kind: "artifact"
    }
  },
  inner_choirShrine: {
    effectKey: "inner_choirShrine",
    summary: "Petitioned the corrupted Choir shrine and carried away a dangerous blessing.",
    stat: "signal",
    difficulty: 11,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "choir-defector" },
        { type: "gain_note", text: "Choir shrine omen: a gate relic may answer, but the blessing is not clean." }
      ]
    },
    failureSummary: "The shrine blessed the wrong part of you.",
    failureEffect: {
      type: "gain_scar",
      scarId: "scar-wound-2"
    },
    sectorDeck: {
      kind: "artifact"
    }
  },
  middle_shardSprawlBargain: {
    effectKey: "middle_shardSprawlBargain",
    summary: "Cut a hard bargain in the Shard Sprawl.",
    effect: null,
    choices: [
      {
        id: "stock",
        stat: "command",
        difficulty: 8,
        summary: "Pressed the Shard Sprawl for passage stock and secured a calmer route cache.",
        effect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Shard Sprawl passage stock secured for the next route push." }
          ]
        },
        failureSummary: "The Shard Sprawl stock deal turned sour and the route crew pushed back.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "gossip",
        stat: "guile",
        difficulty: 8,
        summary: "Cut a quieter bargain in the Shard Sprawl and took field gossip instead of supply stock.",
        effect: {
          type: "gain_note",
          text: "Shard Sprawl gossip mapped a safer approach through the middle lanes."
        },
        failureSummary: "The Shard Sprawl gossip line collapsed into rumor and cost you breathing room.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  middle_guardianSpanThreshold: {
    effectKey: "middle_guardianSpanThreshold",
    summary: "Aligned the Guardian Span threshold and opened the way into the inner breach.",
    effect: null,
    choices: [
      {
        id: "seal-alignment",
        stat: "command",
        difficulty: 9,
        summary: "Aligned the threshold seals and fixed a legal route into the inner breach.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "guardian-span-clearance" },
            { type: "gain_note", text: "Guardian Span threshold aligned for breach entry." }
          ]
        },
        failureSummary: "The threshold seals resisted alignment and the span lashed back with pressure.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "ghost-marker",
        stat: "signal",
        difficulty: 9,
        summary: "Ghosted a route marker through Guardian Span and opened a quieter breach entry.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "guardian-span-clearance" },
            { type: "gain_note", text: "Guardian Span route marker held long enough to chart the breach." }
          ]
        },
        failureSummary: "The ghost marker bled out across the span and left you exposed to the threshold wash.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  middle_webglassFracture: {
    effectKey: "middle_webglassFracture",
    summary: "Threaded the Webglass fracture path and logged a breach route.",
    effect: null,
    choices: [
      {
        id: "hidden-lane",
        stat: "guile",
        difficulty: 9,
        summary: "Slipped through the hidden Webglass lane and logged a safer breach route.",
        effect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Webglass hidden lane mapped through shifting lanes." }
          ]
        },
        failureSummary: "The hidden Webglass lane buckled and dumped you back into the live fracture.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "relay-splice",
        stat: "signal",
        difficulty: 9,
        summary: "Spliced the relay seam into a stable Webglass route before the breach could shift.",
        effect: {
          type: "gain_note",
          text: "Webglass relay splice stabilized a mapped breach route."
        },
        failureSummary: "The relay splice flared too hot and the Webglass seam answered with static.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  inner_veilRiftEntry: {
    effectKey: "inner_veilRiftEntry",
    summary: "Stabilized the Veil Rift entry long enough to chart the deeper breach.",
    effect: null,
    choices: [
      {
        id: "anchor-surge",
        stat: "signal",
        difficulty: 10,
        summary: "Anchored the Veil Rift surge and fixed a stable breach rhythm for the deeper push.",
        effect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Veil Rift surge anchored for deeper breach timing." }
          ]
        },
        failureSummary: "The Veil Rift surge broke loose and left the approach running dangerously hot.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "slip-fold",
        stat: "guile",
        difficulty: 10,
        summary: "Slipped the fold at the Veil Rift and mapped a quieter breach line into the core lanes.",
        effect: {
          type: "gain_note",
          text: "Veil Rift fold slipped cleanly for a quieter inner-breach route."
        },
        failureSummary: "The fold snapped shut at the wrong moment and threw you back into the breach wash.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  inner_cinderLatticeTrial: {
    effectKey: "inner_cinderLatticeTrial",
    summary: "Decoded the Cinder Lattice and marked a viable core approach.",
    effect: null,
    choices: [
      {
        id: "trace-embers",
        stat: "signal",
        difficulty: 10,
        summary: "Traced the ember lattice pulses and locked a clean timing route toward the core.",
        effect: {
          type: "gain_note",
          text: "Cinder lattice ember pulse traced into a stable core approach."
        },
        failureSummary: "The ember trace slipped its rhythm and the lattice answered with rising heat.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "ghost-angles",
        stat: "guile",
        difficulty: 10,
        summary: "Read the ghost angles in the lattice and cut a covert line toward the final gate.",
        effect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Cinder lattice ghost angles mapped a covert final-gate route." }
          ]
        },
        failureSummary: "The ghost angles misaligned and the lattice fed your position back into the fireline.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  inner_gateOfCindersTrial: {
    effectKey: "inner_gateOfCindersTrial",
    summary: "Forced the Gate of Cinders and prepared the final breach into the core chamber.",
    effect: null,
    choices: [
      {
        id: "brace-locks",
        stat: "grit",
        difficulty: 12,
        summary: "Braced the cinder locks apart and forced a direct breach into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders forced open under brute brace pressure." }
          ]
        },
        failureSummary: "The cinder locks held under the strain and burned the operative back.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "time-relays",
        stat: "signal",
        difficulty: 12,
        summary: "Timed the relay pulse perfectly and cut a clean breach into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders relay pulse timed cleanly for the core breach." }
          ]
        },
        failureSummary: "The relay timing slipped and the gate answered with a surge of static heat.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      },
      {
        id: "ghost-path",
        stat: "guile",
        difficulty: 12,
        summary: "Ghosted the last breach path and slipped a viable route into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders ghost-path fixed long enough to reach the core." }
          ]
        },
        failureSummary: "The ghost-path collapsed underfoot and left the approach running hot.",
        failureEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  },
  center_resolveScenarioConfrontation: {
    effectKey: "center_resolveScenarioConfrontation",
    summary: "Resolved the active Cinder Gate confrontation.",
    effect: null
  }
};

export function resolveBoardTextEffect(effectKey: string): BoardTextEffectDefinition | null {
  return BOARD_TEXT_EFFECTS[effectKey] ?? null;
}

export function resolveBoardTextChoice(effectKey: string, choiceId: string) {
  return BOARD_TEXT_EFFECTS[effectKey]?.choices?.find((choice) => choice.id === choiceId) ?? null;
}

export function validateBoardTextEffectCoverage(): BoardTextValidationResult {
  const definedKeys = new Set(Object.keys(BOARD_TEXT_EFFECTS));
  const boardKeys = new Set(BOARD_SPACES.map((space) => space.textBox.effectKey));
  const missingEffectKeys = [...boardKeys].filter((key) => !definedKeys.has(key)).sort();
  const unusedEffectKeys = [...definedKeys].filter((key) => !boardKeys.has(key)).sort();
  const mismatchedChoiceKeys = BOARD_SPACES.flatMap((space) => {
    const boardChoiceIds = (space.textBox.choices ?? []).map((choice) => choice.id).sort();
    const effectChoiceIds = (BOARD_TEXT_EFFECTS[space.textBox.effectKey]?.choices ?? []).map((choice) => choice.id).sort();
    const matches =
      boardChoiceIds.length === effectChoiceIds.length &&
      boardChoiceIds.every((choiceId, index) => choiceId === effectChoiceIds[index]);

    return matches ? [] : [space.textBox.effectKey];
  }).sort();
  const invalidCheckKeys = Object.values(BOARD_TEXT_EFFECTS)
    .flatMap((definition) => {
      const issues: string[] = [];

      if (definition.stat && typeof definition.difficulty !== "number") {
        issues.push(definition.effectKey);
      }

      const invalidChoice = definition.choices?.some((choice) => choice.stat && typeof choice.difficulty !== "number") ?? false;

      if (invalidChoice) {
        issues.push(`${definition.effectKey}:choices`);
      }

      return issues;
    })
    .sort();
  const legacyBoardTestKeys = BOARD_SPACES.filter((space) => space.textBox.test).map((space) => space.textBox.effectKey).sort();

  return {
    missingEffectKeys,
    unusedEffectKeys,
    mismatchedChoiceKeys,
    invalidCheckKeys,
    legacyBoardTestKeys
  };
}
