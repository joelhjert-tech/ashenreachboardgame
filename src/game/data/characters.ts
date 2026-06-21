import { baseNegativePrompt } from "../assets/design/negativePrompt.js";

export type AntiasAttribute = "strength" | "willpower" | "cunning";
export type CharacterTiming =
  | "instead_of_movement"
  | "start_of_engagement"
  | "after_roll"
  | "battle_explosion"
  | "prepare_battle"
  | "start_of_experience"
  | "movement_roll"
  | "during_experience"
  | "passive"
  | "battle_prepare"
  | "acquire_asset"
  | "experience_phase"
  | "after_resolving_space_text"
  | "enforce_limits";

export interface LevelReward {
  level: number;
  rewardType:
    | "strength"
    | "willpower"
    | "cunning"
    | "life"
    | "powerLimit"
    | "influence"
    | "mission"
    | "assetLimit";
  amount: number;
}

export interface CharacterAbility {
  timing: CharacterTiming;
  text: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  title: string;
  affiliation: string;
  loreRole: string;
  gameplayRole: string;
  linkedMechanic: string;
  startingSpaceId: string;
  startingStats: Record<AntiasAttribute | "life", number>;
  assetLimit: number;
  startingInfluence: number;
  startingPowerLimit: number;
  levelTrack: LevelReward[];
  abilities: CharacterAbility[];
  imagePrompt: string;
  negativePrompt: string;
  uiNotes: string;
}

const standardLevelTrack: LevelReward[] = [
  { level: 1, rewardType: "powerLimit", amount: 1 },
  { level: 2, rewardType: "strength", amount: 1 },
  { level: 3, rewardType: "willpower", amount: 1 },
  { level: 4, rewardType: "cunning", amount: 1 }
];

export const antiasCharacters: CharacterDefinition[] = [
  {
    id: "char_void_marshal_kael_dorn",
    name: "Kael Dorn",
    title: "Void Marshal",
    affiliation: "Antias Accord",
    loreRole: "Frontier fleet commander rallying broken lanes under a collapsing seal network.",
    gameplayRole: "Military commander and influence control specialist.",
    linkedMechanic: "Mobility reroute and ally conversion.",
    startingSpaceId: "outer_hive_city",
    startingStats: { strength: 3, willpower: 4, cunning: 2, life: 4 },
    assetLimit: 6,
    startingInfluence: 3,
    startingPowerLimit: 1,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "instead_of_movement",
        text: "Instead of rolling for movement, you may move to any space in your tier that contains one or more Threat cards."
      },
      {
        timing: "start_of_engagement",
        text: "You may take one Ally encounter in your space and place it in your play area. Its printed ability cannot be used this turn."
      },
      {
        timing: "after_roll",
        text: "After you roll for movement, battle, or a skill test, you may discard one Ally to treat the die result as a 6. If it is a battle or skill roll, it explodes normally."
      }
    ],
    imagePrompt:
      "Original dark sci-fi military commander standing on a voidship command deck, black coat, red command sash, bronze seals, stern expression, glowing tactical display behind him, cinematic board-game portrait.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use strong red command accents and a disciplined portrait frame."
  },
  {
    id: "char_veyra_sable",
    name: "Veyra Sable",
    title: "Nullblade Operative",
    affiliation: "Veiled Knife",
    loreRole: "A surgical killer who moves along dead maintenance routes and sealed market alleys.",
    gameplayRole: "Assassin, evasion specialist, exploding-dice skirmisher.",
    linkedMechanic: "Battle explosion extension and enemy evasion.",
    startingSpaceId: "outer_black_market",
    startingStats: { strength: 2, willpower: 3, cunning: 5, life: 4 },
    assetLimit: 5,
    startingInfluence: 3,
    startingPowerLimit: 2,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "battle_explosion",
        text: "When your die explodes in battle, roll 2 additional dice instead of 1."
      },
      {
        timing: "prepare_battle",
        text: "You may evade any Enemy unless a card or space says you cannot evade."
      }
    ],
    imagePrompt:
      "Original sci-fi assassin in sleek black void armor, pale mask, long red braid, curved energy blade, compact pistol, crouched in a starship shadow corridor, yellow stealth light.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Lean silhouette and high contrast edge lighting matter more than costume detail."
  },
  {
    id: "char_oran_voss",
    name: "Oran Voss",
    title: "Rift Seer",
    affiliation: "Ashen Choir",
    loreRole: "A breach-reader who hears transit hymns in the static between dead relays.",
    gameplayRole: "Power-card engine and willpower specialist.",
    linkedMechanic: "Power draw and card-to-influence conversion.",
    startingSpaceId: "outer_spaceport",
    startingStats: { strength: 1, willpower: 6, cunning: 1, life: 4 },
    assetLimit: 3,
    startingInfluence: 3,
    startingPowerLimit: 2,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "start_of_experience",
        text: "You may draw 1 Power Card."
      },
      {
        timing: "movement_roll",
        text: "You cannot substitute your movement roll with a Power Number."
      },
      {
        timing: "during_experience",
        text: "You may discard any number of Power Cards to gain 1 Influence for each card discarded."
      }
    ],
    imagePrompt:
      "Original psychic navigator priest with cracked brass halo, glowing blue eyes, staff with floating star-map lens, layered robes, standing before a rift window on a ship.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use cool blue halo light and long vertical composition."
  },
  {
    id: "char_ser_juno_vale",
    name: "Juno Vale",
    title: "Rift Warden",
    affiliation: "Wardens of the Last Seal",
    loreRole: "An oathbound breach knight stationed where the inner gate begins to scream.",
    gameplayRole: "Anti-corruption heavy fighter.",
    linkedMechanic: "Corruption suppression and hostile-jump movement.",
    startingSpaceId: "middle_guardian_span",
    startingStats: { strength: 4, willpower: 3, cunning: 2, life: 5 },
    assetLimit: 7,
    startingInfluence: 3,
    startingPowerLimit: 2,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "passive",
        text: "Your inactive Corruption Cards never activate."
      },
      {
        timing: "instead_of_movement",
        text: "Instead of moving normally, you may move to any space in your tier that contains a Riftspawn Enemy."
      },
      {
        timing: "battle_prepare",
        text: "For each Riftspawn in a battle, you may play 1 Power Card to add its Power Number to your battle score."
      }
    ],
    imagePrompt:
      "Original oathbound armored knight in silver void plate, tall sword, cracked blue shield light, blood on greaves, standing before a sealed rift gate.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Favor a broad heroic stance and shield glow over ornate heraldry."
  },
  {
    id: "char_mother_elira_vane",
    name: "Elira Vane",
    title: "Saint-Bound Preacher",
    affiliation: "Sanctuary of St. Antias",
    loreRole: "A survivor-priest who keeps the sanctuary lit while the sector tears itself open.",
    gameplayRole: "Corruption control and mission progress support.",
    linkedMechanic: "Corruption cleansing and mission completion support.",
    startingSpaceId: "outer_ember_sanctum",
    startingStats: { strength: 2, willpower: 4, cunning: 2, life: 4 },
    assetLimit: 8,
    startingInfluence: 3,
    startingPowerLimit: 2,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "passive",
        text: "Your inactive Corruption Cards never activate."
      },
      {
        timing: "acquire_asset",
        text: "When you draw a cursed asset, you may discard it to gain 1 Influence. If it was a saint relic, draw another relic."
      },
      {
        timing: "experience_phase",
        text: "You may discard 1 Corruption Card from another character in your space. If you do, gain 1 completed Mission progress."
      }
    ],
    imagePrompt:
      "Original elderly void preacher holding a staff covered in saint scrolls, red-black robes, mechanical breathing tubes, glowing parchment, sanctuary candles behind her.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Keep the face readable and humane; the sanctity comes from light and objects, not franchise motifs."
  },
  {
    id: "char_talen_korr",
    name: "Talen Korr",
    title: "Wreckborn Scavenger",
    affiliation: "Free Salvage Clans",
    loreRole: "A hull-runner who knows how to make a living from dead ships and sealed pits.",
    gameplayRole: "Scavenger and gear-economy specialist.",
    linkedMechanic: "Space-text salvage rewards and asset-limit pressure.",
    startingSpaceId: "outer_crash_site",
    startingStats: { strength: 2, willpower: 2, cunning: 5, life: 4 },
    assetLimit: 7,
    startingInfluence: 3,
    startingPowerLimit: 2,
    levelTrack: standardLevelTrack,
    abilities: [
      {
        timing: "after_resolving_space_text",
        text: "If you resolved a ruins, mine, crash site, caverns, or forge space, draw 1 Gear card. You may buy it for 1 less Influence."
      },
      {
        timing: "enforce_limits",
        text: "You may exceed your Asset Limit by 1."
      }
    ],
    imagePrompt:
      "Original sci-fi scavenger in patched pressure suit, hooded visor, tool harness, drone lamp, standing inside a crashed ship hull with sparks and smoke.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Messy silhouette is good, but keep the face zone and tool read clear."
  }
];
