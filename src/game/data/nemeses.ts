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
  /**
   * Some finales use bespoke staged checks while still presenting a named boss.
   * Omit this field to derive confrontation checks from the nemesis stat block.
   */
  scenarioConfrontationMode?: "nemesis-stats" | "authored-plan";
  /** Public boss-track length when it differs from the reusable Nemesis Relay life value. */
  scenarioProgressLife?: number;
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
    id: "nemesis_unnamed_prisoner",
    name: "The Unnamed Prisoner",
    title: "Mind Behind the Broken Seal",
    faction: "The Sealed Deep",
    scenarioId: "scenario_broken_seal",
    scenarioConfrontationMode: "authored-plan",
    scenarioProgressLife: 2,
    bounty: "Reseal the prison and secure the expedition.",
    loreRole: "An ancient breach-intelligence pressing its unfinished body through every crack in the ward.",
    gameplayRole: "Tutorial finale presented through the authored three-check sealing ritual.",
    linkedMechanic: "Seal Integrity, restoration marks, and the final ward ritual.",
    stats: { strength: 4, willpower: 5, cunning: 6, life: 5 },
    abilities: [
      { timing: "start_of_confrontation", text: "The Prisoner tests the ward with a shape assembled from broken names and signal residue." },
      { timing: "after_character_fail", text: "A failed seal check lets the buried mind force another fracture through the chamber." },
      { timing: "passive", text: "The Prisoner remains bound to the authored Broken Seal confrontation stages." }
    ],
    imagePrompt:
      "Original colossal breach prisoner emerging only halfway through a cracked black-stone containment seal, elongated mineral limbs, a crown-like ring of broken ward pylons, no human face, cold blue-white signal light leaking from a deep featureless head, scorched bronze runes and drifting ash, ominous sealed-core chamber.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Keep the creature clearly nonhuman and partly imprisoned. The broken circular ward silhouette must read at phone scale."
  },
  {
    id: "nemesis_ash_regent",
    name: "The Ash Regent",
    title: "Hunger of the Empty Throne",
    faction: "Cinder Court",
    scenarioId: "scenario_throne_of_ash",
    bounty: "Claim the throne and end Crown Hunger.",
    loreRole: "A furnace-boned sovereign grown around the empty throne's appetite for claimants.",
    gameplayRole: "Command and Guile confrontation boss.",
    linkedMechanic: "Crown claims and throne progress.",
    stats: { willpower: 5, cunning: 5, life: 6 },
    abilities: [
      { timing: "start_of_confrontation", text: "The Regent weighs every Crown against the ash left by its previous bearer." },
      { timing: "after_character_fail", text: "The throne strips certainty from the claimant and feeds it to the Regent." },
      { timing: "passive", text: "Every successful confrontation claim weakens the Regent's hold on the throne." }
    ],
    imagePrompt:
      "Original ash-court monster sovereign fused to an empty black-iron throne, tall skeletal furnace body under layered soot robes, crown made of hovering scorched brass teeth, ember light inside a hollow ribcage, long ceremonial claws, ash cyclone in a ruined command chamber.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "The throne and predatory crown must be visible. Avoid a normal armored human silhouette."
  },
  {
    id: "nemesis_false_hero",
    name: "The False Hero",
    title: "The Operative Who Never Was",
    faction: "Mirror Wake",
    scenarioId: "scenario_mirror_of_false_heroes",
    bounty: "Shatter the false reflection and preserve the true expedition.",
    loreRole: "A composite reflection assembled from every heroic choice the Reach wishes the operatives had made.",
    gameplayRole: "Signal confrontation boss.",
    linkedMechanic: "Mirror breaks and Reflection pressure.",
    stats: { willpower: 6, life: 4 },
    abilities: [
      { timing: "start_of_confrontation", text: "The False Hero arrives wearing a perfected silhouette stolen from the active operative." },
      { timing: "after_character_fail", text: "The mirror records the failure as proof that the copy deserves the name." },
      { timing: "passive", text: "Its body changes between fractured operative archetypes but never reveals a true face." }
    ],
    imagePrompt:
      "Original faceless mirror-born champion made from overlapping fractured operative silhouettes, asymmetrical black expedition armor, one arm resolving into blue-white glass echoes, mirrored halo shards, reflections showing several different impossible faces, dark obsidian chamber, elegant but predatory.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Show a single readable combatant whose fractured reflections imply many identities. No recognizable existing operative portrait."
  },
  {
    id: "nemesis_devourer_beneath",
    name: "The Devourer Beneath",
    title: "Route-Eater of the Lower Dark",
    faction: "Buried Maw",
    scenarioId: "scenario_devourer_beneath",
    bounty: "Silence the moving maw and reclaim the consumed routes.",
    loreRole: "A continent-scale burrowing organism that digests roads, shrines, and the memories used to navigate them.",
    gameplayRole: "Guile confrontation boss with a persistent shared wound track.",
    linkedMechanic: "Doom, roaming consumption, and maw strikes.",
    stats: { cunning: 5, life: 5 },
    abilities: [
      { timing: "start_of_confrontation", text: "The route folds inward as the Devourer's sensory crown rises around the operative." },
      { timing: "after_character_fail", text: "A failed strike teaches the creature which path to consume next." },
      { timing: "passive", text: "Damage remains on the shared maw track between confrontations." }
    ],
    imagePrompt:
      "Original colossal subterranean route-eater erupting through concentric black-metal roads, radial jaw made of basalt plates and industrial teeth, pale sensory tendrils surrounding a furnace-red throat, shrine fragments embedded in its armored hide, immense scale, no humanoid anatomy.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Keep one central maw and a strong radial silhouette. It must read as a creature, not merely a collapsing hole."
  },
  {
    id: "nemesis_dying_star_core",
    name: "The Dying Star Core",
    title: "The Starved Ignition Heart",
    faction: "Last Light Engine",
    scenarioId: "scenario_dying_star",
    bounty: "Restore the ignition cycle before the final light is consumed.",
    loreRole: "A failed artificial star that has grown predatory organs from its own shattered containment machinery.",
    gameplayRole: "Grit confrontation boss.",
    linkedMechanic: "Starfire, ignition marks, and reactor collapse.",
    stats: { strength: 5, life: 4 },
    abilities: [
      { timing: "start_of_confrontation", text: "The Core opens its containment vanes like a hunting flower and draws heat from the chamber." },
      { timing: "after_character_fail", text: "The failed ignition feeds the dark shell growing around the star." },
      { timing: "passive", text: "Each successful ignition mark tears away part of the predatory containment body." }
    ],
    imagePrompt:
      "Original predatory artificial star-core suspended in a ruined reactor, blue-white stellar heart encased by six black iron jaw-like containment vanes, molten brass tendons, grasping cable limbs and a dark corona, immense mechanical-organic boss silhouette, ash and sparks, no humanoid face.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Show the stellar heart as a monster through its jaw-like vanes and cable limbs, while keeping it unmistakably a reactor entity."
  },
  {
    id: "nemesis_fary_lord",
    name: "The Fary Lord",
    title: "Monarch of the Violet Thorn",
    faction: "Violet Court",
    bounty: "Draw 1 artifact and soothe 1 Scar effect on the victorious operative.",
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
    bounty: "Soothe one active Scar effect and draw 1 contract.",
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
    bounty: "Record 2 route notes. Keep both.",
    loreRole: "A breakaway oracle who weaponizes prophecy and relay harmonics.",
    gameplayRole: "Scar pressure and route-note manipulator.",
    linkedMechanic: "Route-note denial and false revelation.",
    stats: { willpower: 6, life: 4 },
    abilities: [
      { timing: "start_of_engagement", text: "Each character here reveals one route note. The Prophet may force one revealed note to be discarded." },
      { timing: "after_skill_test_fail", text: "That character gains 1 Scar." },
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
    id: "nemesis_pallid_curator",
    name: "The Pallid Curator",
    title: "Master of the Grinning Tithe",
    faction: "Pallid Retinue",
    scenarioId: "scenario_grinning_tithe",
    bounty: "Win the scenario and break the tribute ledger.",
    loreRole: "An ancient tribute collector that treats every living memory as an unpaid offering to the Cinder Gate.",
    gameplayRole: "Persistent cooperative boss with no loss-pressure clock.",
    linkedMechanic: "Shared boss wounds and a scenario-owned shuffled Red minion bag.",
    stats: { strength: 6, cunning: 4, life: 6 },
    abilities: [
      {
        timing: "start_of_confrontation",
        text: "The Curator opens the tithe ledger and measures the intruder by force and guile."
      },
      {
        timing: "after_character_fail",
        text: "Each failed confrontation check deals 1 wound to the operative."
      },
      {
        timing: "passive",
        text: "Damage persists between operatives and visits. The sixth wound defeats the Curator."
      }
    ],
    imagePrompt:
      "Original compact pale-furred Ashenreach tribute beast with huge ears, rose-copper ceramic snout, one natural eye and one magenta signal lens, tufted filaments, oversized hands and feet, black-iron collector regalia, six-spoke mechanical tithe halo, articulated tool limbs, chain-ledger staff, Cinder Gate tribute vault, cinematic grimdark science-fantasy.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Read as a compact but commanding boss. Keep the tithe halo, asymmetrical eyes, broad hands, and feet visible at phone and TV scale."
  },
  {
    id: "nemesis_hollow_regent",
    name: "The Hollow Regent",
    title: "Custodian of the Core Court",
    faction: "Rift Court",
    scenarioId: "scenario_broken_concordance",
    scenarioConfrontationMode: "authored-plan",
    scenarioProgressLife: 3,
    bounty: "Win the scenario.",
    loreRole: "A regal shell that keeps the breach court in motion by wearing the memory of dead rulers.",
    gameplayRole: "Final scenario controller.",
    linkedMechanic: "Scenario lock and confrontation pressure.",
    stats: { willpower: 5, cunning: 5, life: 6 },
    abilities: [
      { timing: "start_of_confrontation", text: "Choose one: force a Signal test, tax 1 route note, or place 1 Court mark." },
      { timing: "after_character_fail", text: "That character gains 1 Scar." },
      { timing: "passive", text: "While the Regent remains active, no character may win by ordinary contract rewards." }
    ],
    imagePrompt: "Original regal void sovereign in a broken court of blue-black glass and funeral steel, seated before the breach core.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This is the centerpiece nemesis; the frame should feel ceremonial and dangerous."
  }
];
