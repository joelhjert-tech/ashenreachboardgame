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
    id: "nemesis_fary_lord",
    name: "The Fary Lord",
    title: "Monarch of the Violet Thorn",
    faction: "Violet Court",
    bounty: "Draw 1 artifact and clear 1 Heat from the victorious operative.",
    loreRole: "A beautiful breach-court monarch whose impossible bargains turn ruined roads into hunting gardens.",
    gameplayRole: "Guile and signal pressure boss.",
    linkedMechanic: "False bargains, court illusions, and route denial.",
    stats: { willpower: 4, cunning: 6, life: 5 },
    abilities: [
      {
        timing: "start_of_confrontation",
        text: "The Fary Lord offers a perfect shortcut. The price is never named until after the first step."
      },
      {
        timing: "after_character_fail",
        text: "A failed answer becomes a violet thorn-mark that follows the route home."
      },
      {
        timing: "passive",
        text: "While the Fary Lord remains active, every clear path looks slightly too beautiful to trust."
      }
    ],
    imagePrompt:
      "Original dark gothic sci-fantasy breach monarch in black-violet court robes, scorched brass regalia, butterfly-like shard wings, violet thorn magic, ruined machine-court background, elegant and dangerous.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use violet court glamour, shard-wing silhouettes, and unsettling beauty without drifting into bright fairy-tale softness."
  },
  {
    id: "nemesis_kharvox_red_maw",
    name: "Kharvox",
    title: "The Red Maw",
    faction: "Red Maw Raiders",
    scenarioId: "scenario_dying_star",
    bounty: "Gain 2 trophies.",
    loreRole: "A war-chief who turns boarded freight lanes into moving kill arenas.",
    gameplayRole: "Grit-based snowball bruiser.",
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
    bounty: "Clear one active Heat mark and draw 1 contract.",
    loreRole: "A laboratory escape turned colony intelligence nesting through broken decks.",
    gameplayRole: "Board infestation scaler.",
    linkedMechanic: "Threat multiplication and brood spread.",
    stats: { cunning: 5, life: 5 },
    abilities: [
      { timing: "start_of_round", text: "Place 1 Brood mark on the lowest-pressure occupied outer space." },
      { timing: "during_battle", text: "Gain +1 Grit for each Brood mark in your space." },
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
    bounty: "Record 2 route notes. Keep both.",
    loreRole: "A breakaway oracle who weaponizes prophecy and relay harmonics.",
    gameplayRole: "Heat and route-note manipulator.",
    linkedMechanic: "Route-note denial and false revelation.",
    stats: { willpower: 6, life: 4 },
    abilities: [
      { timing: "start_of_engagement", text: "Each character here reveals one route note. The Prophet may force one revealed note to be discarded." },
      { timing: "after_skill_test_fail", text: "That character gains 1 Heat." },
      { timing: "battle_roll", text: "On a natural 6, cancel one opposing route-note substitution." }
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
      { timing: "after_character_uses_asset", text: "That asset loses 1 charge unless its owner pays 1 trophy." },
      { timing: "passive", text: "Machine enemies in Malrec's space gain +1 wound threshold." }
    ],
    imagePrompt: "Original machine-saint in riveted shrine armor, furnace spine, bronze censer smoke, and weld-lit chapel gloom.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "He should feel canonical to Ashen Reach without resembling a stock machine cult."
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
      { timing: "start_of_confrontation", text: "Choose one: force a Signal test, tax 1 route note, or place 1 Court mark." },
      { timing: "after_character_fail", text: "That character gains 1 Heat." },
      { timing: "passive", text: "While the Regent remains active, no character may win by ordinary contract rewards." }
    ],
    imagePrompt: "Original regal void sovereign in a broken court of blue-black glass and funeral steel, seated before the breach core.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This is the centerpiece nemesis; the frame should feel ceremonial and dangerous."
  }
];
