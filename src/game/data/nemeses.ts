import { baseNegativePrompt } from "../assets/design/negativePrompt.js";

export interface NemesisAbility {
  timing: string;
  text: string;
}

export interface NemesisDefinition {
  id: string;
  name: string;
  title: string;
  faction: string;
  scenarioId?: string;
  bounty: string;
  loreRole: string;
  gameplayRole: string;
  linkedMechanic: string;
  stats: {
    strength?: number;
    willpower?: number;
    cunning?: number;
    life: number;
  };
  abilities: NemesisAbility[];
  imagePrompt: string;
  negativePrompt: string;
  uiNotes: string;
}

export const nemeses: NemesisDefinition[] = [
  {
    id: "nemesis_kharvox_red_maw",
    name: "Kharvox",
    title: "The Red Maw",
    faction: "Red Maw Raiders",
    scenarioId: "scenario_dying_star",
    bounty: "Gain 2 Influence.",
    loreRole: "A war-chief who turns boarded freight lanes into moving kill arenas.",
    gameplayRole: "Strength-based snowball bruiser.",
    linkedMechanic: "Infamy-fueled battle escalation.",
    stats: { strength: 5, life: 4 },
    abilities: [
      { timing: "after_winning_battle_against_character", text: "Gain 2 Infamy." },
      { timing: "after_movement_roll", text: "You may spend 1 Infamy to add 1 to your movement score." },
      { timing: "battle_roll", text: "Your battle dice explode on natural 5 or 6." }
    ],
    imagePrompt: "Original raider warlord in furnace armor with hooked axe and jaw-mask, roaring on a burning boarding ramp.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Push heat, smoke, and brutal silhouette. Keep insignia original."
  },
  {
    id: "nemesis_specimen_null_x",
    name: "Specimen Null-X",
    title: "The Brood Memory",
    faction: "Shardborn Brood",
    scenarioId: "scenario_devourer_beneath",
    bounty: "Clear one active Corruption Card and draw 1 Mission.",
    loreRole: "A laboratory escape turned colony intelligence nesting through broken decks.",
    gameplayRole: "Board infestation scaler.",
    linkedMechanic: "Threat multiplication and brood spread.",
    stats: { cunning: 5, life: 5 },
    abilities: [
      { timing: "start_of_round", text: "Place 1 Brood mark on the lowest-pressure occupied outer space." },
      { timing: "during_battle", text: "Gain +1 Strength for each Brood mark in your space." },
      { timing: "after_loss", text: "If Null-X survives, it scuttles to the next outer space clockwise." }
    ],
    imagePrompt: "Original void-bred specimen with segmented limbs, glassy shard growths, and cold surgical lighting.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "The form should feel laboratory-born, not insect-queen fantasy."
  },
  {
    id: "nemesis_glass_prophet",
    name: "The Glass Prophet",
    title: "Voice of the Split Choir",
    faction: "Ashen Choir",
    scenarioId: "scenario_mirror_of_false_heroes",
    bounty: "Draw 2 Power Cards. Keep both.",
    loreRole: "A breakaway oracle who weaponizes prophecy and relay harmonics.",
    gameplayRole: "Corruption and Power-card manipulator.",
    linkedMechanic: "Power denial and false revelation.",
    stats: { willpower: 6, life: 4 },
    abilities: [
      { timing: "start_of_engagement", text: "Each character here reveals one Power Card. The Prophet may force one revealed card to be discarded." },
      { timing: "after_skill_test_fail", text: "That character draws 1 Corruption Card." },
      { timing: "battle_roll", text: "On a natural 6, cancel one opposing Power-card substitution." }
    ],
    imagePrompt: "Original prophet in cracked glass vestments, mirrored halo fragments, and blue relay glare.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use reflection and fracture motifs instead of occult cliché."
  },
  {
    id: "nemesis_iron_saint_malrec",
    name: "Iron Saint Malrec",
    title: "The Last Welded Witness",
    faction: "Iron Synod",
    scenarioId: "scenario_labyrinth_engine",
    bounty: "Draw 1 Gear card and recharge 2 Charge tokens across your play area.",
    loreRole: "A preserved war-saint bound into machine liturgy and furnace plate.",
    gameplayRole: "Charge-token and machine-enemy commander.",
    linkedMechanic: "Machine sustain and gear pressure.",
    stats: { strength: 4, willpower: 4, life: 5 },
    abilities: [
      { timing: "start_of_battle", text: "Attach 1 Charge token to each machine ally in this scenario zone." },
      { timing: "after_character_uses_asset", text: "That asset loses 1 Charge unless its owner pays 1 Influence." },
      { timing: "passive", text: "Machine enemies in Malrec's space gain +1 Life." }
    ],
    imagePrompt: "Original machine-saint in riveted shrine armor, furnace spine, bronze censer smoke, and weld-lit chapel gloom.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "He should feel canonical to Antias without resembling a stock machine cult."
  },
  {
    id: "nemesis_hollow_regent",
    name: "The Hollow Regent",
    title: "Custodian of the Core Court",
    faction: "Rift Court",
    scenarioId: "scenario_throne_of_ash",
    bounty: "Win the scenario.",
    loreRole: "A regal shell that keeps the breach court in motion by wearing the memory of dead rulers.",
    gameplayRole: "Final scenario controller.",
    linkedMechanic: "Scenario lock and confrontation pressure.",
    stats: { willpower: 5, cunning: 5, life: 6 },
    abilities: [
      { timing: "start_of_confrontation", text: "Choose one: force a Willpower test, tax 1 Power Card, or place 1 Court mark." },
      { timing: "after_character_fail", text: "That character gains 1 Corruption Card." },
      { timing: "passive", text: "While the Regent remains active, no character may win by ordinary mission rewards." }
    ],
    imagePrompt: "Original regal void sovereign in a broken court of blue-black glass and funeral steel, seated before the breach core.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This is the centerpiece nemesis; the frame should feel ceremonial and dangerous."
  }
];
