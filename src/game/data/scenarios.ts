import type { EncounterEffect } from "../schema/card.schema.js";

export type ScenarioConfrontationStat = "command" | "grit" | "signal" | "guile" | "forge";

export interface ScenarioConfrontationCheck {
  stat: ScenarioConfrontationStat;
  difficulty: number;
  label: string;
}

export interface ScenarioConfrontationPlan {
  checks: ScenarioConfrontationCheck[];
  markLabel: string;
  effect: EncounterEffect | null;
  victorySummary: string;
}

export interface ScenarioConfrontationContext {
  playerName: string;
  crownClaims: number;
  mirrorPressure: number;
  salvageLeverage: number;
  engineModeIndex: number;
  heldGearCount: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  theme: string;
  setup: string[];
  specialRules: string[];
  confrontationTitle: string;
  confrontationSteps: string[];
  victoryText: string;
  designFeel: string;
  difficulty: "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";
  recommendedRolloutOrder: number;
  confrontationText: string;
  winConditionKey: string;
  victoryThreshold: number;
  failureEffectKey?: string;
  buildConfrontationPlan: (context: ScenarioConfrontationContext) => ScenarioConfrontationPlan;
  sheetArtAssetId: string;
  sheetArtPrompt: string;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "scenario_broken_seal",
    name: "The Broken Seal",
    theme: "The last ward around the Cinder Gate is splitting and something below it is waking.",
    setup: [
      "Place 6 Seal tokens on the scenario sheet.",
      "Use mission progress tokens, coins, or spare counters as Seal tokens."
    ],
    specialRules: [
      "At the start of each operative turn, roll 1 die. On 1-2 remove 1 Seal token, on 3-4 draw 1 Threat card in your sector, on 5-6 nothing happens.",
      "Whenever a player defeats an enemy, they may return 1 Seal token to the sheet instead of claiming that enemy as a trophy.",
      "If there are ever 0 Seal tokens on the sheet, every player immediately gains 1 Corruption card."
    ],
    confrontationTitle: "Reseal the Prison",
    confrontationSteps: [
      "Test Grit 10 to hold the breached ward shut.",
      "Test Signal 10 to realign the split sigils.",
      "Test Guile 12 to resist the mind behind the breach.",
      "For each failed test, lose 1 Life."
    ],
    victoryText: "If you pass at least 2 of the 3 confrontation tests during a single engagement, you win the game.",
    designFeel: "Balanced default scenario with one shared track, clear pressure, and a clean final test chain.",
    difficulty: "easy-medium",
    recommendedRolloutOrder: 1,
    confrontationText:
      "At the start of engagement in the core chamber, test grit 10, signal 10, and guile 12 in order. Each passed test records one restoration mark. At two restoration marks in one confrontation, you win.",
    winConditionKey: "sealRestorationMarks",
    victoryThreshold: 2,
    failureEffectKey: "scenario_gainCorruption",
    buildConfrontationPlan: (context) => ({
      checks: [
        { stat: "grit", difficulty: 10, label: "Hold the breached ward shut" },
        { stat: "signal", difficulty: 10, label: "Realign the split sigils" },
        { stat: "guile", difficulty: 12, label: "Resist the mind behind the breach" }
      ],
      markLabel: "restoration mark",
      effect: null,
      victorySummary: `${context.playerName} sealed the Cinder Gate and won the campaign.`
    }),
    sheetArtAssetId: "scenario_sheet_broken_seal",
    sheetArtPrompt:
      "Cracked black-stone prison seal around the Cinder Gate, blue-white ward light leaking through bronze runes, operatives bracing against a rising breach, top-down printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_throne_of_ash",
    name: "The Throne of Ash",
    theme: "An empty command throne promises dominion, but every crown claimed changes the final trial.",
    setup: [
      "Place 3 Crown tokens on the scenario sheet.",
      "Any player who defeats an enemy or completes a Mission may claim 1 available Crown token."
    ],
    specialRules: [
      "A player with at least 1 Crown token gains +1 to battles.",
      "A player with at least 1 Crown token suffers -1 to all skill tests.",
      "Whenever a crowned player loses 1 Life, they must return 1 Crown token to the sheet if able.",
      "If all 3 Crowns are claimed, each uncrowned player gains 1 Influence at the start of their turn."
    ],
    confrontationTitle: "Claim the Throne",
    confrontationSteps: [
      "If you have 0 Crowns, test Command 14, Grit 14, and Guile 14.",
      "If you have 1 Crown, test Command 12, Grit 12, and Guile 12.",
      "If you have 2 Crowns, test any two of those attributes at 12.",
      "If you have 3 Crowns, test any one of those attributes at 12.",
      "For each failed test, lose 1 Life and discard 1 Power card or 1 Influence."
    ],
    victoryText: "If you pass all required confrontation tests, you win the game.",
    designFeel: "Political rivalry scenario that rewards bold tempo and changes the final gate based on table control.",
    difficulty: "medium",
    recommendedRolloutOrder: 2,
    confrontationText:
      "At the throne, the number of Crowns you hold sets how many command, grit, and guile tests you must clear. Survive the required sequence once to win.",
    winConditionKey: "throneClaims",
    victoryThreshold: 1,
    buildConfrontationPlan: (context) => ({
      checks:
        context.crownClaims >= 3
          ? [{ stat: "command", difficulty: 12, label: "Speak the throne's final command" }]
          : context.crownClaims === 2
            ? [
                { stat: "command", difficulty: 12, label: "Command the ash-crowns" },
                { stat: "guile", difficulty: 12, label: "Outlast the throne's claimant-shade" }
              ]
            : context.crownClaims === 1
              ? [
                  { stat: "command", difficulty: 12, label: "Command the throne's fireline" },
                  { stat: "grit", difficulty: 12, label: "Endure the ash pressure" },
                  { stat: "guile", difficulty: 12, label: "Outmaneuver the relic judges" }
                ]
              : [
                  { stat: "command", difficulty: 14, label: "Command the empty throne" },
                  { stat: "grit", difficulty: 14, label: "Endure the ash pressure" },
                  { stat: "guile", difficulty: 14, label: "Outmaneuver the relic judges" }
                ],
      markLabel: "throne claim",
      effect: null,
      victorySummary: `${context.playerName} claimed the Throne of Ash with ${context.crownClaims} crown claim${context.crownClaims === 1 ? "" : "s"}.`
    }),
    sheetArtAssetId: "scenario_sheet_throne_of_ash",
    sheetArtPrompt:
      "Empty relic throne in a soot-choked core chamber, bronze crowns suspended above ash drifts, blue breach glow cutting through black lacquer metal, printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_mirror_of_false_heroes",
    name: "The Mirror of False Heroes",
    theme: "The breach answers ambition with a reflection that grows stronger with every stain you carry.",
    setup: ["No extra setup is required."],
    specialRules: [
      "Whenever a player completes a Mission, choose one: accept the praise to gain 1 Influence and 1 Corruption card, or reject the praise to lose 1 Influence and draw 1 Power card.",
      "Whenever a player gains a relic, they must test Signal 10. On a failure, they gain 1 Corruption card."
    ],
    confrontationTitle: "Face Yourself",
    confrontationSteps: [
      "Your mirrored self uses your printed strengths, amplified by your Corruption total.",
      "Fight the mirror in three confrontations, in this order: Guile, Signal, then Grit.",
      "You do not lose Life for losing these mirror confrontations. Instead, gain 1 Corruption card for each confrontation you lose.",
      "If you ever hold 6 or more Corruption cards during this confrontation, your turn ends immediately and you may try again next turn."
    ],
    victoryText: "If you win at least 2 of the 3 mirror confrontations, you win the game.",
    designFeel: "Temptation scenario that punishes corruption-heavy lines while still rewarding efficient builds.",
    difficulty: "medium",
    recommendedRolloutOrder: 3,
    confrontationText:
      "At the breach mirror, resolve guile, signal, and grit confrontations in order. Each win records one mirror break. At two mirror breaks, you win.",
    winConditionKey: "mirrorBreaks",
    victoryThreshold: 2,
    failureEffectKey: "scenario_gainCorruption",
    buildConfrontationPlan: (context) => ({
      checks: [
        { stat: "guile", difficulty: 10 + context.mirrorPressure, label: "Outwit your mirrored self" },
        { stat: "signal", difficulty: 10 + context.mirrorPressure, label: "Steady your fractured signal" },
        { stat: "grit", difficulty: 10 + context.mirrorPressure, label: "Break the final reflection" }
      ],
      markLabel: "mirror break",
      effect: context.mirrorPressure >= 6 ? { type: "gain_heat", amount: 1 } : null,
      victorySummary: `${context.playerName} shattered the false hero and walked free of the mirror.`
    }),
    sheetArtAssetId: "scenario_sheet_mirror_of_false_heroes",
    sheetArtPrompt:
      "Shattered obsidian mirror reflecting a distorted operative with blue rift scars and ceremonial gold filigree, dark chamber floor, printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_devourer_beneath",
    name: "The Devourer Beneath",
    theme: "A world-burrowing maw moves clockwise through the outer ring, consuming threats and building doom.",
    setup: [
      "Place 1 Devourer token on the outer tier.",
      "Place 0 Doom tokens on the scenario sheet."
    ],
    specialRules: [
      "At the end of each player turn, move the Devourer token 1 outer space clockwise.",
      "When the Devourer enters a space with any Threat cards, discard those Threat cards and place 1 Doom token on the sheet.",
      "Whenever a player lands on the Devourer's space, they must immediately fight it in a Strength battle 8.",
      "If the player loses, they lose 1 Life and place 1 Doom token on the sheet. If they win, remove 1 Doom token from the sheet, if any.",
      "If the sheet ever reaches 8 Doom tokens, every player immediately loses 1 Life, then discard 4 Doom tokens."
    ],
    confrontationTitle: "Enter the Maw",
    confrontationSteps: [
      "Fight the Final Devourer in a Strength battle 14.",
      "Before the battle, you may discard trophies to reduce its Strength by 1 for every 3 trophy points discarded."
    ],
    victoryText: "If you defeat the Final Devourer, you win the game.",
    designFeel: "Combat-first scenario for tables that want roaming pressure and a trophy-fueled final boss race.",
    difficulty: "medium-hard",
    recommendedRolloutOrder: 4,
    confrontationText:
      "At the maw, fight the Devourer's true form at strength 14. One completed maw strike wins the scenario, and trophies can reduce the target value before the fight.",
    winConditionKey: "mawStrikes",
    victoryThreshold: 1,
    failureEffectKey: "scenario_coreWound",
    buildConfrontationPlan: (context) => ({
      checks: [
        {
          stat: "grit",
          difficulty: Math.max(8, 14 - context.salvageLeverage),
          label: "Drive into the Devourer's true maw"
        }
      ],
      markLabel: "maw strike",
      effect: null,
      victorySummary: `${context.playerName} pierced the Devourer Beneath and silenced the maw.`
    }),
    sheetArtAssetId: "scenario_sheet_devourer_beneath",
    sheetArtPrompt:
      "Colossal underground maw splitting ring-metal and shrine stone from below, outer tier lanes collapsing into a red-black abyss with cold blue sparks, printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_labyrinth_engine",
    name: "The Labyrinth Engine",
    theme: "A reality-writing engine rotates through modes, changing how every turn feels until someone stops it.",
    setup: [
      "Place 1 Engine token on the scenario sheet and set it to Command mode.",
      "The Engine cycles through Command, Signal, and Guile modes."
    ],
    specialRules: [
      "At the start of each player turn, rotate the Engine token to the next mode.",
      "Command mode: all enemies gain +1 battle score.",
      "Signal mode: whenever a player draws a Power card, they must either keep it and lose 1 Influence, or discard it.",
      "Guile mode: whenever a player draws Threat cards, draw 1 additional Threat card, then discard 1 Threat card of your choice.",
      "Whenever a player passes a skill test matching the Engine's current mode, they gain 1 Influence.",
      "Whenever a player fails a skill test matching the Engine's current mode, they lose 1 Influence or 1 Life."
    ],
    confrontationTitle: "Stop the Engine",
    confrontationSteps: [
      "Your first confrontation test must match the Engine's current mode.",
      "Then rotate the Engine after each test and resolve the next required attribute.",
      "Use the sequence Command, Signal, and Guile as the engine turns.",
      "For each failed test, draw 1 Threat card and resolve it immediately. Any enemy drawn this way must be fought."
    ],
    victoryText: "If you pass at least 2 of the 3 Engine tests and no enemies remain in your space afterward, you win the game.",
    designFeel: "Most tactical scenario. Timing your final approach matters as much as raw power.",
    difficulty: "hard",
    recommendedRolloutOrder: 5,
    confrontationText:
      "At the core engine, resolve three rotating tests beginning with the engine's active mode. Each passed test records one shutdown mark. At two shutdown marks, you win if your space is clear.",
    winConditionKey: "shutdownMarks",
    victoryThreshold: 2,
    buildConfrontationPlan: (context) => {
      const engineRotation: ScenarioConfrontationCheck[] = [
        { stat: "command", difficulty: 12, label: "Stabilize the command lattice" },
        { stat: "signal", difficulty: 12, label: "Anchor the starfire relays" },
        { stat: "guile", difficulty: 12, label: "Walk the shifting engine path" }
      ];
      return {
        checks: [
          engineRotation[context.engineModeIndex % engineRotation.length]!,
          engineRotation[(context.engineModeIndex + 1) % engineRotation.length]!,
          engineRotation[(context.engineModeIndex + 2) % engineRotation.length]!
        ],
        markLabel: "shutdown mark",
        effect: null,
        victorySummary: `${context.playerName} shut down the Labyrinth Engine before reality folded again.`
      };
    },
    sheetArtAssetId: "scenario_sheet_labyrinth_engine",
    sheetArtPrompt:
      "Ancient rotating command engine made of black iron, bronze rings, and blue-white starfire, shifting corridors and impossible geometry around it, printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_dying_star",
    name: "The Dying Star",
    theme: "The system sun is collapsing and every turn burns away the time left to repair it.",
    setup: [
      "Place 10 Star tokens on the scenario sheet.",
      "Use Influence coins, relic counters, or any spare markers as Star tokens."
    ],
    specialRules: [
      "At the end of each player turn, remove 1 Star token from the sheet.",
      "Whenever a player gains a relic, place 2 Star tokens back on the sheet.",
      "Whenever a player loses 1 Life, remove 1 additional Star token.",
      "If the sheet ever reaches 0 Star tokens, the Dying Star erupts: each player tests Signal 12. On a success lose 1 Life. On a failure lose 2 Life and gain 1 Corruption card. Then place 5 Star tokens back on the sheet."
    ],
    confrontationTitle: "Ignite the Core",
    confrontationSteps: [
      "Discard 1 relic or lose 2 Life.",
      "Test Guile 12 to repair the ignition geometry.",
      "Test Grit 12 to brace the unstable reactor.",
      "Test Signal 12 to survive the restart pulse.",
      "If you fail any confrontation test, your turn ends and you may try again next turn."
    ],
    victoryText: "If you pass all 3 confrontation tests after paying the opening cost, you win the game.",
    designFeel: "Harsh race-against-time scenario with global table pressure and very little dead air.",
    difficulty: "hard",
    recommendedRolloutOrder: 6,
    confrontationText:
      "At the star core, pay the opening cost and then clear guile 12, grit 12, and signal 12. Each passed test records one ignition mark. At three ignition marks, you win.",
    winConditionKey: "ignitionMarks",
    victoryThreshold: 3,
    failureEffectKey: "scenario_coreWound",
    buildConfrontationPlan: (context) => ({
      checks: [
        { stat: "guile", difficulty: 12, label: "Repair the ignition geometry" },
        { stat: "grit", difficulty: 12, label: "Brace the unstable reactor" },
        { stat: "signal", difficulty: 12, label: "Survive the restart pulse" }
      ],
      markLabel: "ignition mark",
      effect: context.heldGearCount === 0 ? { type: "take_wound", amount: 2 } : null,
      victorySummary: `${context.playerName} reignited the dying star and restored the sector light.`
    }),
    sheetArtAssetId: "scenario_sheet_dying_star",
    sheetArtPrompt:
      "Collapsing blue-white star trapped in a black shrine reactor, bronze vanes cracking under heat bloom and ash, operatives racing across a command platform, printable scenario sheet illustration, no text."
  }
];

export const SCENARIO_INDEX = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario] as const));

export function getScenarioDefinition(scenarioId: string): ScenarioDefinition | null {
  return SCENARIO_INDEX.get(scenarioId) ?? null;
}
