import type { EncounterEffect } from "../schema/card.schema.js";
import { easeBrokenSealConfrontationDifficulty } from "../rules/soloTuning.js";

export type ScenarioConfrontationStat = "command" | "grit" | "signal" | "guile" | "forge";
export type ScenarioDifficulty = "easy" | "easy-medium" | "medium" | "medium-hard" | "hard" | "brutal";
export type ScenarioMode = "coop" | "rivalry" | "hybrid";
export type ScenarioSupportedMode = "solo" | "co-op" | "competitive" | "rivalry" | "hidden-agenda";
export type ScenarioRewardType = "boon" | "gear" | "ability" | "tile-event" | "tactic" | "artifact";

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
  sessionMode: "multiplayer" | "single-player";
  crownClaims: number;
  mirrorPressure: number;
  salvageLeverage: number;
  engineModeIndex: number;
  heldGearCount: number;
}

export interface ScenarioPressureTrack {
  name: string;
  start: number;
  max: number;
  tickTiming: string;
  collapseRule: string;
}

export interface ScenarioBoardHooks {
  redThreat?: string;
  blueThreat?: string;
  yellowThreat?: string;
  shop?: string;
  shrine?: string;
  salvage?: string;
  anomaly?: string;
}

export interface ScenarioPlayerCountSupport {
  min: number;
  max: number;
}

export interface ScenarioPublicDisplayMetadata {
  modeLabel: string;
  objective: string;
  privacy: string;
}

export interface ScenarioPrivateMetadata {
  reservedForPhonePayloads: boolean;
  hiddenAgendaReveal: "not-implemented" | "future";
  notes: string;
}

export interface ScenarioRewardDefinition {
  id: string;
  name: string;
  type: ScenarioRewardType;
  text: string;
  timing?: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  theme: string;
  pressureRule: string;
  expectedDuration: string;
  mode: ScenarioMode;
  supportedPlayerCounts: ScenarioPlayerCountSupport;
  supportedModes: ScenarioSupportedMode[];
  publicDisplay: ScenarioPublicDisplayMetadata;
  privateMetadata: ScenarioPrivateMetadata;
  victoryCondition: string;
  lossCondition: string;
  pressureTrack: ScenarioPressureTrack;
  boardHooks: ScenarioBoardHooks;
  progressSources: string[];
  finalGateRequirement: string;
  scenarioRewards: ScenarioRewardDefinition[];
  nemesis?: string;
  shopInteractions: string[];
  tileEventHooks: string[];
  modeScaling?: {
    singlePlayer?: string;
    multiplayer?: string;
  };
  setup: string[];
  specialRules: string[];
  confrontationTitle: string;
  confrontationSteps: string[];
  victoryText: string;
  designFeel: string;
  difficulty: ScenarioDifficulty;
  recommendedRolloutOrder: number;
  confrontationText: string;
  winConditionKey: string;
  victoryThreshold: number;
  failureEffectKey?: string;
  buildConfrontationPlan: (context: ScenarioConfrontationContext) => ScenarioConfrontationPlan;
  sheetArtAssetId: string;
  sheetArtPrompt: string;
}

export const ENGINE_MODE_ROTATION = ["command", "grit", "signal", "guile", "forge"] as const satisfies readonly ScenarioConfrontationStat[];

export function getEngineModeName(modeIndex: number): string {
  const mode = ENGINE_MODE_ROTATION[modeIndex % ENGINE_MODE_ROTATION.length] ?? "command";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "scenario_broken_seal",
    name: "The Broken Seal",
    theme: "The last ward around the Ashen Reach Core is splitting, and the table must stabilize it before the breach learns their names.",
    pressureRule:
      "Seal Integrity ticks at round pressure and through breach surges. Blue threats, shrines, contracts, and artifact charges can restore the ward.",
    expectedDuration: "45-60 min",
    mode: "coop",
    supportedPlayerCounts: { min: 1, max: 6 },
    supportedModes: ["solo", "co-op"],
    publicDisplay: {
      modeLabel: "Solo / Co-op",
      objective: "Stabilize the Broken Seal before the breach collapses the ward.",
      privacy: "Public scenario pressure only; no private rivalry agenda."
    },
    privateMetadata: {
      reservedForPhonePayloads: false,
      hiddenAgendaReveal: "not-implemented",
      notes: "Tutorial scenario keeps all objective progress public."
    },
    victoryCondition: "Earn 2 restoration marks during one Ashen Reach Core confrontation.",
    lossCondition: "Escalation loss or repeated Seal Integrity collapse overwhelms the operatives.",
    pressureTrack: {
      name: "Seal Integrity",
      start: 6,
      max: 8,
      tickTiming: "End of each round, with solo pressure slowed by mode tuning.",
      collapseRule: "At 0 Seal Integrity, all operatives gain 1 Heat. On the second collapse, each operative also gains 1 Scar."
    },
    boardHooks: {
      blueThreat: "Blue threats represent breach leaks. Clearing one restores 1 Seal Integrity.",
      shrine: "Pilgrim Lock and shrine spaces can restore the ward for Salvage or a clean shrine action.",
      shop: "Chapel-style shops can convert Salvage into Seal Integrity.",
      anomaly: "Anomaly sectors draw fresh breach pressure when the ward surges."
    },
    progressSources: [
      "Clear a Blue threat to restore 1 Seal Integrity.",
      "Complete a Contract to restore 1 Seal Integrity.",
      "Use Pilgrim Lock or a shrine boon to restore 1 Seal Integrity.",
      "Spend an Artifact charge to restore 2 Seal Integrity."
    ],
    finalGateRequirement: "Attempt the Core only with 4+ Seal Integrity, 1 Artifact, or 3 completed Contracts.",
    scenarioRewards: [
      {
        id: "sealwrights-mark",
        name: "Sealwright's Mark",
        type: "boon",
        text: "Once per game, after clearing a Blue threat, restore 1 Seal Integrity."
      },
      {
        id: "ward-bound-instinct",
        name: "Ward-Bound Instinct",
        type: "ability",
        timing: "scenario confrontation",
        text: "Exhaust to gain +2 Signal during a scenario confrontation."
      },
      {
        id: "cinder-gate-key",
        name: "Cinder Gate Key",
        type: "artifact",
        text: "Spend 1 charge to cancel 1 Heat gained from scenario pressure."
      },
      {
        id: "seal-crack-surge",
        name: "Seal Crack Surge",
        type: "tile-event",
        text: "When the ward drops to 2 or less, place a Blue threat on the nearest anomaly sector."
      }
    ],
    shopInteractions: [
      "Pilgrim Lock may heal 1 wound or restore 1 Seal Integrity if the sector is clear.",
      "A shop can convert 2 Salvage into 1 Seal Integrity once per round.",
      "Artifact recharge spaces may spend a Gear charge to restore 2 Seal Integrity."
    ],
    tileEventHooks: [
      "The Last Signal Well begins with a Blue threat marker.",
      "Pilgrim Lock or Static Chapel may hold the first shrine boon token.",
      "Anomaly sectors receive new Blue pressure when the Seal track rolls 3-4."
    ],
    modeScaling: {
      singlePlayer: "Solo starts with the tuned Seal limit and softer turn-start pressure.",
      multiplayer: "Only occupied operatives pressure the Seal clock; empty seats do not tick it."
    },
    setup: [
      "Place 6 Seal tokens on the scenario sheet.",
      "Place 1 Blue threat icon on The Last Signal Well.",
      "Place 1 shrine boon token on Pilgrim Lock or Static Chapel."
    ],
    specialRules: [
      "At the end of each round, roll 1 die. On 1-2 remove 1 Seal token, on 3-4 place 1 Blue threat on the nearest anomaly sector, on 5-6 the ward holds.",
      "Whenever a player clears a Blue threat or completes a Contract, restore 1 Seal token.",
      "A player may pay 2 Salvage at a clear shrine to restore 1 Seal token.",
      "A player may spend an Artifact charge to restore 2 Seal tokens.",
      "At 0 Seal tokens, every player gains 1 Heat and the track resets to 3. The second collapse also gives each player 1 Scar."
    ],
    confrontationTitle: "Reseal the Prison",
    confrontationSteps: [
      "Final gate: 4+ Seal tokens, 1 Artifact, or 3 completed Contracts.",
      "Test Grit 10 to hold the breached ward shut.",
      "Test Signal 10 to realign the broken sigils.",
      "Test Guile 12 to resist the mind behind the breach.",
      "For each failed test, take 1 wound. If you failed by 3 or more, gain 1 Scar."
    ],
    victoryText: "If you pass at least 2 of the 3 confrontation stat checks during one engagement, you win the game.",
    designFeel: "Default tutorial scenario: shared pressure, clear board hooks, and a final gate that teaches contracts, artifacts, and shrine choices.",
    difficulty: "easy-medium",
    recommendedRolloutOrder: 1,
    confrontationText:
      "At the Ashen Reach Core, test grit 10, signal 10, and guile 12 in order. Each passed test records one restoration mark. At two restoration marks in one confrontation, you win.",
    winConditionKey: "sealRestorationMarks",
    victoryThreshold: 2,
    failureEffectKey: "scenario_gainCorruption",
    buildConfrontationPlan: (context) => ({
      checks: [
        {
          stat: "grit",
          difficulty: easeBrokenSealConfrontationDifficulty(context.sessionMode, 10),
          label: "Hold the breached ward shut"
        },
        {
          stat: "signal",
          difficulty: easeBrokenSealConfrontationDifficulty(context.sessionMode, 10),
          label: "Realign the broken sigils"
        },
        {
          stat: "guile",
          difficulty: easeBrokenSealConfrontationDifficulty(context.sessionMode, 12),
          label: "Resist the mind behind the breach"
        }
      ],
      markLabel: "restoration mark",
      effect: null,
      victorySummary: `${context.playerName} sealed the Ashen Reach Core and won the campaign.`
    }),
    sheetArtAssetId: "scenario_sheet_broken_seal",
    sheetArtPrompt:
      "Cracked black-stone prison seal around the Ashen Reach Core, blue-white ward light leaking through bronze runes, operatives bracing against a rising breach, top-down printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_throne_of_ash",
    name: "The Throne of Ash",
    theme: "An empty command throne promises dominion, but every Crown claimed makes the claimant louder, stronger, and easier for the board to find.",
    pressureRule:
      "Crowns are earned through elite victories, contracts, Crown sectors, and risky shops. If all Crowns are held, Crown Hunger wakes the Ash Regent.",
    expectedDuration: "60-75 min",
    mode: "hybrid",
    supportedPlayerCounts: { min: 2, max: 6 },
    supportedModes: ["co-op", "competitive", "rivalry", "hidden-agenda"],
    publicDisplay: {
      modeLabel: "Hybrid Rivalry",
      objective: "Claim Crowns and survive the Ash Regent's hunger.",
      privacy: "Public Crown pressure with private rivalry hooks reserved for phones."
    },
    privateMetadata: {
      reservedForPhonePayloads: true,
      hiddenAgendaReveal: "future",
      notes: "Supports private Crown leverage later; reveal/scoring remains unwired."
    },
    victoryCondition: "Earn 6 throne claims before Crown Hunger turns the table against the claimants.",
    lossCondition: "Escalation loss or Crown Hunger collapse summons an unrecoverable Regent state.",
    pressureTrack: {
      name: "Crown Hunger",
      start: 0,
      max: 6,
      tickTiming: "End of each round while all Crowns are held.",
      collapseRule: "At Crown Hunger 6, spawn the Ash Regent nemesis and make Crowned victories generate Heat."
    },
    boardHooks: {
      redThreat: "Elite Red enemies can award Crown tokens.",
      yellowThreat: "Yellow political traps can make Crowned players drop tokens.",
      shop: "Contract Spire and Black Vault style shops can sell Crown claims for Salvage plus Heat.",
      salvage: "Salvage can buy authority, but every shortcut stains the claimant."
    },
    progressSources: [
      "Defeat an Elite enemy.",
      "Complete a Contract.",
      "Clear Choir Bastion, The Hollow Customs Gate, or Choir Execution Court.",
      "Pay 4 Salvage at a Crown shop and gain 1 Heat."
    ],
    finalGateRequirement: "Attempt the Throne only while holding 1+ Crown or by spending 2 completed Contracts.",
    scenarioRewards: [
      {
        id: "ash-crowned-authority",
        name: "Ash-Crowned Authority",
        type: "ability",
        text: "While you hold a Crown, shop actions cost 1 less Salvage."
      },
      {
        id: "regents-challenge",
        name: "Regent's Challenge",
        type: "tactic",
        timing: "after a Crowned combat roll",
        text: "Force a Crowned rival or Crown nemesis to reroll one die."
      },
      {
        id: "black-throne-oath",
        name: "Black Throne Oath",
        type: "boon",
        text: "Gain +2 Command in confrontations. Whenever you fail, gain 1 Heat."
      },
      {
        id: "crown-sector-toll",
        name: "Crown Sector Toll",
        type: "tile-event",
        text: "When a Crowned player enters a Crown sector, they must clear the local threat or drop 1 Crown."
      }
    ],
    nemesis: "Ash Regent",
    shopInteractions: [
      "Contract Spire may sell 1 Crown for 4 Salvage and 1 Heat if a Crown remains unclaimed.",
      "Black Vault may sell Crown abilities only to Crowned players.",
      "A Crowned player may discount one shop action by 1 Salvage through Ash-Crowned Authority."
    ],
    tileEventHooks: [
      "Choir Bastion, The Hollow Customs Gate, and Choir Execution Court are Crown sectors.",
      "A Crowned player who takes wounds from an Elite enemy or nemesis drops 1 Crown on that sector.",
      "At Crown Hunger 6, the Ash Regent becomes active pressure."
    ],
    modeScaling: {
      singlePlayer: "Solo may secure Crowns from Contracts and Crown sectors without needing player rivalry.",
      multiplayer: "Rivalry pressure is active, but the final objective remains scenario driven."
    },
    setup: [
      "Place 3 Crown tokens on the scenario sheet.",
      "Mark Choir Bastion, The Hollow Customs Gate, and Choir Execution Court as Crown sectors."
    ],
    specialRules: [
      "A player may claim 1 Crown after defeating an Elite enemy, completing a Contract, clearing a Crown sector, or paying 4 Salvage plus 1 Heat at Contract Spire.",
      "Each Crown gives +1 Grit during battles.",
      "Each Crown gives -1 Guile and -1 Signal during stat checks.",
      "At the end of each round, if all Crowns are held, increase Crown Hunger by 1.",
      "At Crown Hunger 3+, Crowned players gain 1 Heat when they defeat enemies. At Crown Hunger 6, spawn the Ash Regent nemesis.",
      "If a Crowned player is wounded by a player, nemesis, or Elite enemy, they drop 1 Crown on their sector."
    ],
    confrontationTitle: "Claim the Throne",
    confrontationSteps: [
      "Final gate: hold at least 1 Crown or spend 2 completed Contracts.",
      "0 Crowns: test Command 14, Grit 14, and Guile 14.",
      "1 Crown: test Command 12, Grit 12, and Guile 12.",
      "2 Crowns: choose 2 of those checks at difficulty 12.",
      "3 Crowns: choose 1 of those checks at difficulty 12.",
      "For each failed check, take 1 wound and drop 1 Crown if able."
    ],
    victoryText: "If you pass all required confrontation stat checks, you win the game.",
    designFeel: "Rivalry/hybrid scenario where table politics, Crown sectors, and shop bargains shape the final gate.",
    difficulty: "medium",
    recommendedRolloutOrder: 4,
    confrontationText:
      "At the throne, the number of Crowns you hold sets how many command, grit, and guile checks you must clear. Survive the required sequence once to win.",
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
                  { stat: "guile", difficulty: 12, label: "Outmaneuver the artifact judges" }
                ]
              : [
                  { stat: "command", difficulty: 14, label: "Command the empty throne" },
                  { stat: "grit", difficulty: 14, label: "Endure the ash pressure" },
                  { stat: "guile", difficulty: 14, label: "Outmaneuver the artifact judges" }
                ],
      markLabel: "throne claim",
      effect: null,
      victorySummary: `${context.playerName} claimed the Throne of Ash with ${context.crownClaims} crown claim${context.crownClaims === 1 ? "" : "s"}.`
    }),
    sheetArtAssetId: "scenario_sheet_throne_of_ash",
    sheetArtPrompt:
      "Empty command throne in a soot-choked core chamber, bronze crowns suspended above ash drifts, blue breach glow cutting through black lacquer metal, printable scenario sheet illustration, no text."
  },
  {
    id: "scenario_mirror_of_false_heroes",
    name: "The Mirror of False Heroes",
    theme: "The breach answers ambition with a reflection that grows stronger every time an operative chooses speed, glory, or forbidden leverage.",
    pressureRule:
      "Reflection rises from voluntary Heat, forbidden abilities, Artifact charges, selfish Contract rewards, and Scars. High pressure wakes the False Hero.",
    expectedDuration: "60-75 min",
    mode: "coop",
    supportedPlayerCounts: { min: 1, max: 6 },
    supportedModes: ["solo", "co-op", "rivalry", "hidden-agenda"],
    publicDisplay: {
      modeLabel: "Co-op / Rivalry-ready",
      objective: "Break the false mirror before Reflection pressure rewrites the run.",
      privacy: "Public mirror pressure; private reflection hooks reserved for phones."
    },
    privateMetadata: {
      reservedForPhonePayloads: true,
      hiddenAgendaReveal: "future",
      notes: "Private temptation and reflection scoring can attach later without changing public win logic."
    },
    victoryCondition: "Earn 4 mirror breaks through confrontation progress.",
    lossCondition: "Escalation loss or Reflection pressure reaching its collapse state defeats the table.",
    pressureTrack: {
      name: "Mirror Pressure",
      start: 0,
      max: 8,
      tickTiming: "End of each round if any player has 3+ Reflection.",
      collapseRule: "At Mirror Pressure 8, spawn the False Hero nemesis and make Blue threats harder."
    },
    boardHooks: {
      blueThreat: "Blue threats gain difficulty at high Mirror Pressure.",
      yellowThreat: "Yellow traps tempt selfish rewards.",
      anomaly: "Mirror sectors convert Heat and Scars into confrontation difficulty.",
      shop: "Forbidden upgrades are stronger but feed Reflection."
    },
    progressSources: [
      "Refuse a selfish Contract reward to lower Heat pressure.",
      "Complete 2 Contracts to qualify for the final gate.",
      "Carry 1 Artifact or keep Heat at 0 to face the Mirror early.",
      "Clear Mirror Barracks or Static Chapel to remove 1 Reflection."
    ],
    finalGateRequirement: "Face the Mirror with 1 Artifact, 2 completed Contracts, or 0 Heat.",
    scenarioRewards: [
      {
        id: "shattered-reflection",
        name: "Shattered Reflection",
        type: "boon",
        timing: "after failing a Guile check",
        text: "Discard to treat the failure as a success, then gain 1 Heat."
      },
      {
        id: "honest-wound",
        name: "Honest Wound",
        type: "ability",
        text: "Once per round, when you refuse a selfish reward, remove 1 Heat."
      },
      {
        id: "mirror-knife-technique",
        name: "Mirror-Knife Technique",
        type: "ability",
        timing: "once per round in battle",
        text: "Use Guile instead of Grit for one battle."
      },
      {
        id: "reflection-bargain",
        name: "Reflection Bargain",
        type: "tile-event",
        text: "At Mirror Barracks, choose humble reward or gain 2 Salvage and 1 Reflection."
      }
    ],
    nemesis: "False Hero",
    shopInteractions: [
      "Forbidden abilities cost 1 less Salvage while Mirror Pressure is 4+, then add 1 Reflection.",
      "Black Vault may sell a Mirror-Knife technique once per player.",
      "A selfish Contract payout grants +2 Salvage or 1 Tactic, then adds 1 Reflection."
    ],
    tileEventHooks: [
      "Mirror Barracks offers humble or selfish Contract rewards.",
      "Static Chapel can bottle a reflection clue if no Blue threat remains.",
      "At Mirror Pressure 5+, all Blue threats gain +1 difficulty."
    ],
    modeScaling: {
      singlePlayer: "Solo treats Heat as the main Reflection proxy until per-player Reflection is surfaced.",
      multiplayer: "Each operative tracks Reflection separately; the highest Reflection drives pressure."
    },
    setup: ["Each player begins with 0 Reflection."],
    specialRules: [
      "Gain 1 Reflection when you voluntarily gain Heat, buy a forbidden ability, use an Artifact charge, take a selfish Contract reward, or gain a Scar.",
      "When completing a Contract, choose humble reward for the normal payout or mirror reward for +2 Salvage or 1 Tactic and 1 Reflection.",
      "At the end of each round, if any player has 3+ Reflection, increase Mirror Pressure by 1.",
      "At Mirror Pressure 5+, all Blue threats gain +1 difficulty.",
      "At Mirror Pressure 8, spawn the False Hero nemesis."
    ],
    confrontationTitle: "Face Yourself",
    confrontationSteps: [
      "Final gate: 1 Artifact, 2 completed Contracts, or 0 Heat.",
      "Test Guile 10 plus your Reflection.",
      "Test Signal 10 plus your Heat.",
      "Test Grit 10 plus your Scars.",
      "If your Reflection is 4+ when you fail, gain 1 Scar instead of Heat."
    ],
    victoryText: "If you pass at least 2 of the 3 mirror stat checks, you win the game.",
    designFeel: "Temptation scenario that lets players move fast, but makes every shortcut visible on the final mirror.",
    difficulty: "medium",
    recommendedRolloutOrder: 5,
    confrontationText:
      "At the breach mirror, resolve guile, signal, and grit checks in order. Each win records one mirror break. At two mirror breaks, you win.",
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
    theme: "A world-burrowing maw circles the ring, eating unresolved threats, locking shops, and turning delay into Doom.",
    pressureRule:
      "The Devourer moves at end of turn, consumes unresolved threats for Doom, and becomes faster as the track rises.",
    expectedDuration: "60-80 min",
    mode: "coop",
    supportedPlayerCounts: { min: 1, max: 6 },
    supportedModes: ["solo", "co-op", "rivalry"],
    publicDisplay: {
      modeLabel: "Boss Co-op",
      objective: "Hunt and strike the Devourer before Doom consumes the routes.",
      privacy: "Roaming boss state is public; private rivalry hooks are optional future overlays."
    },
    privateMetadata: {
      reservedForPhonePayloads: true,
      hiddenAgendaReveal: "future",
      notes: "Rivalry can later score risky boss positioning privately, but no reveal mechanic is active."
    },
    victoryCondition: "Earn 5 maw strikes against the Devourer.",
    lossCondition: "Escalation loss or Doom collapse overwhelms the board.",
    pressureTrack: {
      name: "Doom",
      start: 0,
      max: 8,
      tickTiming: "End of each player turn, after the operative resolves their sector.",
      collapseRule: "At Doom 8, every player takes 1 wound, Doom falls to 4, and Red threats lock shop sectors."
    },
    boardHooks: {
      redThreat: "Red threats are food for the Devourer and lock shop sectors after collapse.",
      shop: "A shop the Devourer passes through is locked until players clear a Red threat there.",
      salvage: "Kettleward Foundry can craft a Maw Spike from Salvage.",
      yellowThreat: "Route complications can drag players toward the Devourer's lane."
    },
    progressSources: [
      "Fight the Devourer on its sector to remove 1 Doom.",
      "Spend 8 Trophy value to weaken the final maw.",
      "Craft a Maw Spike at Kettleward Foundry.",
      "Clear Red threats from locked shops."
    ],
    finalGateRequirement: "Enter the Maw by spending 8 Trophy value, 1 Artifact charge, or 3 Salvage at Kettleward Foundry to craft a Maw Spike.",
    scenarioRewards: [
      {
        id: "maw-spike",
        name: "Maw Spike",
        type: "gear",
        timing: "final confrontation",
        text: "Reduce Devourer difficulty by 2 during Enter the Maw."
      },
      {
        id: "breach-harpoon",
        name: "Breach Harpoon",
        type: "gear",
        text: "+2 Grit against Nemesis enemies."
      },
      {
        id: "grave-rail-lure",
        name: "Grave-Rail Lure",
        type: "boon",
        text: "Once per game, move the Devourer 1 sector away from a shop."
      },
      {
        id: "shop-lock-collapse",
        name: "Shop Lock Collapse",
        type: "tile-event",
        text: "When Doom erupts, place a Red threat marker on each shop sector."
      }
    ],
    nemesis: "The Devourer token",
    shopInteractions: [
      "Kettleward Foundry can craft Maw Spike for 3 Salvage.",
      "Locked shops cannot sell Gear until the local Red threat is cleared.",
      "Anchor Market may sell Grave-Rail Lure after Doom reaches 4."
    ],
    tileEventHooks: [
      "The Devourer token starts on an Outer Ring sector.",
      "At Doom 4+, the Devourer moves 2 sectors.",
      "At Doom 6+, the Devourer may enter Middle Ring sectors through gates."
    ],
    modeScaling: {
      singlePlayer: "Solo may cancel one Devourer move once per game.",
      multiplayer: "The Devourer moves after each player turn and therefore pressures larger tables faster."
    },
    setup: [
      "Place 1 Devourer token on an Outer Ring sector.",
      "Place 0 Doom tokens on the scenario sheet."
    ],
    specialRules: [
      "At the end of each player turn, move the Devourer 1 sector clockwise on its current ring.",
      "At Doom 4+, the Devourer moves 2 sectors. At Doom 6+, it may enter Middle Ring sectors through gates.",
      "When the Devourer enters a sector, discard unresolved threats there and add 1 Doom if any were discarded.",
      "If the Devourer enters a shop, that shop is locked until a player clears a Red threat there.",
      "If a player lands on the Devourer, fight Grit 8 plus the Doom modifier. Win to remove 1 Doom and gain 1 Trophy. Lose to take 1 wound and add 1 Doom.",
      "At 8 Doom, every player takes 1 wound. Then reduce Doom to 4 and place a Red threat on each shop sector."
    ],
    confrontationTitle: "Enter the Maw",
    confrontationSteps: [
      "Final gate: spend 8 Trophy value, 1 Artifact charge, or craft Maw Spike at Kettleward Foundry.",
      "Face the Final Devourer with a Grit 14 confrontation.",
      "Reduce difficulty by 1 for every 3 Trophy value spent.",
      "Reduce difficulty by 2 if carrying Maw Spike.",
      "On failure, take 2 wounds or gain 1 Scar."
    ],
    victoryText: "If you defeat the Final Devourer, you win the game.",
    designFeel: "Roaming predator scenario where unresolved board clutter becomes the enemy clock.",
    difficulty: "medium-hard",
    recommendedRolloutOrder: 2,
    confrontationText:
      "At the maw, fight the Devourer's true form at Grit 14. One completed maw strike wins the scenario, and trophy value or Maw Spike can reduce the target value before the fight.",
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
    theme: "A reality-writing engine rotates through command, grit, signal, guile, and forge modes until the table turns its rules against it.",
    pressureRule:
      "The Engine rotates every turn. Each mode changes threats, shops, Gear, rewards, and the final confrontation sequence.",
    expectedDuration: "70-90 min",
    mode: "coop",
    supportedPlayerCounts: { min: 1, max: 6 },
    supportedModes: ["solo", "co-op"],
    publicDisplay: {
      modeLabel: "Rotating Co-op",
      objective: "Shutdown the Labyrinth Engine while its active mode keeps changing.",
      privacy: "Engine mode and progress are public; no private rivalry agenda."
    },
    privateMetadata: {
      reservedForPhonePayloads: false,
      hiddenAgendaReveal: "not-implemented",
      notes: "No hidden agenda metadata is needed until an engine rivalry variant exists."
    },
    victoryCondition: "Earn 5 shutdown marks through engine-mode confrontation checks.",
    lossCondition: "Escalation loss or Engine Instability collapse locks the engine open.",
    pressureTrack: {
      name: "Engine Instability",
      start: 0,
      max: 6,
      tickTiming: "At the start of each player turn, rotate the Engine to the next mode.",
      collapseRule: "At high instability, failed matching checks exhaust Gear or add Heat."
    },
    boardHooks: {
      redThreat: "Grit mode makes Red enemies harder.",
      blueThreat: "Signal mode makes Blue threats harder and risky Tactic draws noisier.",
      yellowThreat: "Guile mode changes Yellow draws into draw-extra, keep-one decisions.",
      shop: "Command mode taxes shops unless the player has a Contract.",
      salvage: "Forge mode discounts repairs while punishing failed Forge tests."
    },
    progressSources: [
      "Pass a stat check matching the active Engine mode.",
      "Buy an Engine Key at Black Vault for 4 Salvage and 1 Heat.",
      "Complete a Contract in a sector matching the active mode.",
      "Use a Modebreaker Implant to count your stat as matching the Engine."
    ],
    finalGateRequirement: "Stop the Engine with 3 Engine Keys or 1 Artifact.",
    scenarioRewards: [
      {
        id: "engine-key",
        name: "Engine Key",
        type: "boon",
        timing: "before a confrontation check",
        text: "Spend to reduce one Engine confrontation check by 2."
      },
      {
        id: "modebreaker-implant",
        name: "Modebreaker Implant",
        type: "gear",
        text: "Exhaust to treat your stat as matching the active Engine mode."
      },
      {
        id: "rotating-map",
        name: "Rotating Map",
        type: "boon",
        text: "When the Engine rotates, you may move 1 sector if your current sector is clear."
      },
      {
        id: "mode-shear",
        name: "Mode Shear",
        type: "tile-event",
        text: "When a matching-mode check fails, draw 1 threat matching the failed mode."
      }
    ],
    nemesis: "Iron Saint",
    shopInteractions: [
      "Command mode makes shop actions cost +1 Salvage unless the player has a Contract.",
      "Forge mode makes Gear repairs and upgrades cost 1 less Salvage.",
      "Black Vault can sell Engine Keys for 4 Salvage and 1 Heat."
    ],
    tileEventHooks: [
      "Engine modes rotate command to grit to signal to guile to forge.",
      "Matching-mode checks can grant Salvage or Tactics.",
      "Failed matching-mode checks add Heat or exhaust Gear."
    ],
    modeScaling: {
      singlePlayer: "Solo Engine Keys may be earned through any matching-mode check once per round.",
      multiplayer: "The table can divide sectors by active mode to prepare the final sequence."
    },
    setup: [
      "Place 1 Engine token on the scenario sheet and set it to Command mode.",
      "The Engine cycles through Command, Grit, Signal, Guile, and Forge modes."
    ],
    specialRules: [
      "At the start of each player turn, rotate the Engine to the next mode: Command, Grit, Signal, Guile, then Forge.",
      "Command mode: shop actions cost +1 Salvage unless you have a Contract.",
      "Grit mode: all Red enemies gain +1.",
      "Signal mode: all Blue threats gain +1 and drawing Tactics may add Heat.",
      "Guile mode: when drawing Yellow threats, draw +1, then discard one.",
      "Forge mode: Gear repairs and upgrades cost -1 Salvage, but failed Forge checks exhaust one Gear.",
      "When you pass a stat check matching the Engine mode, gain 1 Salvage or 1 Tactic. When you fail one, gain 1 Heat or exhaust Gear."
    ],
    confrontationTitle: "Stop the Engine",
    confrontationSteps: [
      "Final gate: 3 Engine Keys or 1 Artifact.",
      "Your first confrontation check matches the Engine's current mode.",
      "Then rotate the Engine after each check and resolve the next required stat.",
      "Resolve 3 checks at difficulty 12.",
      "For each failed check, draw 1 threat matching the failed mode."
    ],
    victoryText: "If you pass at least 2 of the 3 Engine checks and no enemies remain in your space afterward, you win the game.",
    designFeel: "Most tactical scenario: the board is a rotating rule machine, and timing the final approach matters as much as raw stats.",
    difficulty: "hard",
    recommendedRolloutOrder: 6,
    confrontationText:
      "At the core engine, resolve three rotating checks beginning with the engine's active mode. Each passed check records one shutdown mark. At two shutdown marks, you win if your space is clear.",
    winConditionKey: "shutdownMarks",
    victoryThreshold: 2,
    buildConfrontationPlan: (context) => {
      const labels: Record<ScenarioConfrontationStat, string> = {
        command: "Stabilize the command lattice",
        grit: "Hold the iron rotation",
        signal: "Anchor the starfire relays",
        guile: "Walk the shifting engine path",
        forge: "Rebuild the ignition cage"
      };
      const checks = [0, 1, 2].map((offset) => {
        const stat = ENGINE_MODE_ROTATION[(context.engineModeIndex + offset) % ENGINE_MODE_ROTATION.length] ?? "command";
        return {
          stat,
          difficulty: 12,
          label: labels[stat]
        };
      });

      return {
        checks,
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
    theme: "The system sun is collapsing, and every wound, greedy Heat choice, and delayed repair burns away the light left to restart it.",
    pressureRule:
      "Starfire burns down at end of turn, from wounds, and from voluntary Heat. Artifacts, Forge work, Star sectors, and contracts can restore it.",
    expectedDuration: "50-70 min",
    mode: "coop",
    supportedPlayerCounts: { min: 1, max: 6 },
    supportedModes: ["solo", "co-op"],
    publicDisplay: {
      modeLabel: "Hard Timer Co-op",
      objective: "Ignite the Dying Star before Starfire burns out.",
      privacy: "Starfire pressure and ignition progress are public; no private rivalry agenda."
    },
    privateMetadata: {
      reservedForPhonePayloads: false,
      hiddenAgendaReveal: "not-implemented",
      notes: "Private rivalry data is intentionally unused for this public timer scenario."
    },
    victoryCondition: "Earn 4 ignition marks before the Starfire track collapses.",
    lossCondition: "Escalation loss or Starfire collapse ends the run.",
    pressureTrack: {
      name: "Starfire",
      start: 10,
      max: 12,
      tickTiming: "End of each player turn, plus wound and voluntary Heat triggers.",
      collapseRule: "At 0 Starfire, all players test Signal 12, suffer wounds and possible Heat, then Starfire resets to 5."
    },
    boardHooks: {
      blueThreat: "Blue threats interfere with restart pulses.",
      shop: "Kettleward Foundry and Votive Engine Room become repair anchors.",
      salvage: "Forge spaces convert Salvage and stat checks into Starfire.",
      anomaly: "Dead Star Reliquary and Saint Engine Crypt restore Starfire through risky artifact work."
    },
    progressSources: [
      "Gain an Artifact to restore 2 Starfire.",
      "Spend an Artifact charge to restore 2 Starfire.",
      "Pass Forge 8 at Kettleward Foundry to restore 1 Starfire.",
      "Clear a Star sector to restore 1 Starfire.",
      "Complete a Contract to restore 1 Starfire."
    ],
    finalGateRequirement: "Attempt the Star Core with 5+ Starfire and either 1 Artifact or 3 completed Contracts.",
    scenarioRewards: [
      {
        id: "sun-cage-blueprint",
        name: "Sun-Cage Blueprint",
        type: "boon",
        text: "At a Star sector, gain +2 Forge."
      },
      {
        id: "ignition-coil",
        name: "Ignition Coil",
        type: "gear",
        timing: "Dying Star confrontation",
        text: "Spend to reroll the Forge check."
      },
      {
        id: "solar-martyr-oath",
        name: "Solar Martyr Oath",
        type: "boon",
        text: "Take 1 wound to restore 2 Starfire."
      },
      {
        id: "starfire-eruption",
        name: "Starfire Eruption",
        type: "tile-event",
        text: "At 0 Starfire, each player tests Signal 12, then the track resets to 5."
      }
    ],
    nemesis: "Dying Star Core",
    shopInteractions: [
      "Kettleward Foundry may test Forge 8 to restore 1 Starfire.",
      "Votive Engine Room may spend a Gear charge to restore 2 Starfire.",
      "Star sectors can sell emergency repairs through Salvage or wounds."
    ],
    tileEventHooks: [
      "Mark Kettleward Foundry, Votive Engine Room, Dead Star Reliquary, and Saint Engine Crypt as Star sectors.",
      "Whenever a player takes a wound, remove 1 additional Starfire.",
      "Whenever a player voluntarily gains Heat, remove 1 Starfire."
    ],
    modeScaling: {
      singlePlayer: "Solo can use one extra Artifact slot and Starfire loss remains one token per player turn.",
      multiplayer: "Larger tables burn Starfire faster because each player turn advances the clock."
    },
    setup: [
      "Place 10 Starfire tokens on the scenario sheet.",
      "Mark Kettleward Foundry, Votive Engine Room, Dead Star Reliquary, and Saint Engine Crypt as Star sectors."
    ],
    specialRules: [
      "At the end of each player turn, remove 1 Starfire token.",
      "Whenever a player takes a wound, remove 1 additional Starfire token.",
      "Whenever a player voluntarily gains Heat, remove 1 Starfire token.",
      "Gain an Artifact or spend an Artifact charge to restore 2 Starfire tokens.",
      "Pass Forge 8 at Kettleward Foundry, clear a Star sector, or complete a Contract to restore 1 Starfire token.",
      "At 0 Starfire, each player tests Signal 12. Success takes 1 wound. Failure takes 2 wounds and gains 1 Heat. Then restore Starfire to 5."
    ],
    confrontationTitle: "Ignite the Core",
    confrontationSteps: [
      "Final gate: 5+ Starfire and 1 Artifact or 3 completed Contracts.",
      "Opening cost: spend 1 Artifact charge or take 2 wounds.",
      "Test Forge 12 to rebuild the ignition cage.",
      "Test Grit 12 to hold the reactor frame.",
      "Test Signal 12 to survive the restart pulse.",
      "If you fail any confrontation check, your turn ends and 2 Starfire tokens are removed."
    ],
    victoryText: "If you pass all 3 confrontation stat checks after paying the opening cost, you win the game.",
    designFeel: "Hard timer scenario where Forge, shops, artifacts, and Star sectors become survival infrastructure.",
    difficulty: "hard",
    recommendedRolloutOrder: 3,
    confrontationText:
      "At the star core, pay the opening cost and then clear forge 12, grit 12, and signal 12. Each passed check records one ignition mark. At three ignition marks, you win.",
    winConditionKey: "ignitionMarks",
    victoryThreshold: 3,
    failureEffectKey: "scenario_coreWound",
    buildConfrontationPlan: (context) => ({
      checks: [
        { stat: "forge", difficulty: 12, label: "Rebuild the ignition cage" },
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
