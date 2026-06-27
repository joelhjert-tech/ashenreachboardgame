import { baseNegativePrompt } from "../assets/design/negativePrompt.js";

export type ThreatDeckColor = "red" | "blue" | "yellow";
export type ThreatCardType = "event" | "enemy" | "encounter" | "asset";
export type ThreatAttribute = "strength" | "willpower" | "cunning";

export interface ThreatCardDefinition {
  id: string;
  name: string;
  color: ThreatDeckColor;
  type: ThreatCardType;
  loreRole: string;
  gameplayRole: string;
  linkedMechanic: string;
  enemy?: {
    attribute: ThreatAttribute;
    value: number;
    trophyValue: number;
    traits: string[];
  };
  text: string;
  imagePrompt: string;
  negativePrompt: string;
  uiNotes: string;
}

export const threatDecks: Record<ThreatDeckColor, ThreatCardDefinition[]> = {
  red: [
    {
      id: "red_enemy_red_maw_raiders",
      name: "Red Maw Raiders",
      color: "red",
      type: "enemy",
      loreRole: "Scrap-lane killers using furnace steel and fear.",
      gameplayRole: "Straight combat pressure.",
      linkedMechanic: "Additional trophy loss on defeat.",
      enemy: { attribute: "strength", value: 5, trophyValue: 5, traits: ["raider", "mortal"] },
      text: "If you lose this fight, lose 1 additional trophy.",
      imagePrompt: "Threat card art of ash-raiders charging from furnace smoke with hooked scrap weapons.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Use aggressive red framing and clear trophy value."
    },
    {
      id: "red_enemy_cinder_hounds",
      name: "Cinder Hounds",
      color: "red",
      type: "enemy",
      loreRole: "Pack hunters bred to track heat and blood.",
      gameplayRole: "Efficient early combat hazard.",
      linkedMechanic: "Movement punishment on loss.",
      enemy: { attribute: "strength", value: 4, trophyValue: 4, traits: ["beast", "riftscarred"] },
      text: "If you lose this battle, miss your next optional movement bonus.",
      imagePrompt: "Ash-coated attack beasts running low through trench light and sparks.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Silhouettes should read instantly."
    },
    {
      id: "red_event_trench_blast",
      name: "Trench Blast",
      color: "red",
      type: "event",
      loreRole: "A buried shell line erupts beneath the convoy lanes.",
      gameplayRole: "Table-wide wound pressure.",
      linkedMechanic: "Shared event damage test.",
      text: "Each character in an outer space tests Grit 7. Fail: take 1 wound.",
      imagePrompt: "Exploding trench line under a night sky with debris and warning fire.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Event frame should visually differ from enemy cards."
    },
    {
      id: "red_encounter_shattered_barricade",
      name: "Shattered Barricade",
      color: "red",
      type: "encounter",
      loreRole: "A half-collapsed defense wall blocks the lane.",
      gameplayRole: "Single test obstacle.",
      linkedMechanic: "Grit test for tempo.",
      text: "Test Grit 7. Pass: gain 1 trophy. Fail: remain here.",
      imagePrompt: "Broken metal barricade in a narrow war lane, lit by red beacons.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Leave room for clear test text."
    },
    {
      id: "red_asset_breach_halberd",
      name: "Breach Halberd",
      color: "red",
      type: "asset",
      loreRole: "A long shock-weapon used to clear boarding jaws.",
      gameplayRole: "Combat reward card.",
      linkedMechanic: "Equipment acquisition.",
      text: "Take this asset. Gain +1 Grit in one fight each turn.",
      imagePrompt: "Long industrial halberd resting against scorched bulkhead plating.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Asset cards should look collectible, not hostile."
    }
  ],
  blue: [
    {
      id: "blue_event_rift_whispers",
      name: "Rift Whispers",
      color: "blue",
      type: "event",
      loreRole: "The breach speaks in voices borrowed from the dead.",
      gameplayRole: "Heat pressure event.",
      linkedMechanic: "Signal check against existing Heat count.",
      text: "Each character with 3 or more Heat must test Signal 9. Fail: take 1 wound.",
      imagePrompt: "A corridor of pale voices and floating prayer strips under cold breach light.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Blue events should feel cerebral and invasive."
    },
    {
      id: "blue_enemy_choir_wraith",
      name: "Choir Wraith",
      color: "blue",
      type: "enemy",
      loreRole: "A relay ghost wrapped in broken liturgy.",
      gameplayRole: "Signal fight threat.",
      linkedMechanic: "Heat on loss.",
      enemy: { attribute: "willpower", value: 5, trophyValue: 5, traits: ["wraith", "breachborn"] },
      text: "If you lose this fight, gain 1 Heat.",
      imagePrompt: "Translucent choir wraith with glass hymn shards and blue-white spectral drift.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Keep the form readable against the frame."
    },
    {
      id: "blue_enemy_veil_censor",
      name: "Veil Censor",
      color: "blue",
      type: "enemy",
      loreRole: "An ancient adjudicator machine that judges thought as treason.",
      gameplayRole: "Mid-tier resolve gatekeeper.",
      linkedMechanic: "Route-note denial.",
      enemy: { attribute: "willpower", value: 6, trophyValue: 6, traits: ["machine", "warden"] },
      text: "You may not spend route notes as abilities in this fight.",
      imagePrompt: "Floating judicial machine with censor lamps and cold blue scanning beams.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Austere symmetry helps it feel oppressive."
    },
    {
      id: "blue_encounter_hushed_chapel",
      name: "Hushed Chapel",
      color: "blue",
      type: "encounter",
      loreRole: "A chapel so quiet that every thought lands like a hammer.",
      gameplayRole: "Signal test stop.",
      linkedMechanic: "Cleanse or stall.",
      text: "Test Signal 8. Pass: lose 1 Heat. Fail: this card remains on the space.",
      imagePrompt: "Silent chapel alcove with extinguished candles and reflected blue dust.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Encounters should reserve room for persistent-state reminders."
    },
    {
      id: "blue_asset_sanctifier_beads",
      name: "Sanctifier Beads",
      color: "blue",
      type: "asset",
      loreRole: "Consecrated memory knots carried by breach pilgrims.",
      gameplayRole: "Heat-control reward.",
      linkedMechanic: "Minor cleanse support.",
      text: "Take this asset. Once per turn, you may ignore one inactive Heat trigger.",
      imagePrompt: "Consecrated beads and metal prayer knots on worn blue cloth.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Use a calmer collectible treatment than enemy cards."
    }
  ],
  yellow: [
    {
      id: "yellow_encounter_locked_vault",
      name: "Locked Vault",
      color: "yellow",
      type: "encounter",
      loreRole: "A sealed utility cache hidden under broken panelwork.",
      gameplayRole: "Guile check reward source.",
      linkedMechanic: "Gear gain on pass.",
      text: "Test Guile 8. Pass: draw 1 Gear card. Fail: this card remains on the space.",
      imagePrompt: "Sealed vault door cut into a maintenance wall with yellow warning strips and pry marks.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Yellow encounters should feel navigational or technical."
    },
    {
      id: "yellow_enemy_null_drone",
      name: "Null Drone",
      color: "yellow",
      type: "enemy",
      loreRole: "A sabotaged repair drone turned hunter.",
      gameplayRole: "Guile-based machine skirmisher.",
      linkedMechanic: "Asset disruption on loss.",
      enemy: { attribute: "cunning", value: 4, trophyValue: 4, traits: ["machine", "sabotage"] },
      text: "If you lose this battle, choose 1 Asset. Its ability cannot be used next turn.",
      imagePrompt: "A spidery repair drone with bright yellow work lights and cutting limbs.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Keep appendages readable but not cluttered."
    },
    {
      id: "yellow_enemy_shiv_market_crew",
      name: "Shiv Market Crew",
      color: "yellow",
      type: "enemy",
      loreRole: "A market-ring theft crew that turns every blind corner into a robbery.",
      gameplayRole: "Early yellow battle pressure.",
      linkedMechanic: "Trophy theft.",
      enemy: { attribute: "cunning", value: 5, trophyValue: 5, traits: ["raider", "cutpurse"] },
      text: "If you lose this fight, lose 1 trophy and 1 route note if able.",
      imagePrompt: "Masked thieves in layered market leathers under sodium lamps and steam haze.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Use asymmetrical composition and street-light contrast."
    },
    {
      id: "yellow_event_route_splice",
      name: "Route Splice",
      color: "yellow",
      type: "event",
      loreRole: "Transit plates shift and reconnect under hidden machine logic.",
      gameplayRole: "Movement disruption event.",
      linkedMechanic: "Forced reposition or test.",
      text: "Each character on an outer space tests Guile 7. Fail: move 1 space clockwise.",
      imagePrompt: "Mechanical route plates sliding apart under hazard lights and sparks.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "Show motion lines in the art but keep rules text dominant."
    },
    {
      id: "yellow_asset_wireghost_key",
      name: "Wireghost Key",
      color: "yellow",
      type: "asset",
      loreRole: "A cut-down bypass tool built from stolen route memory.",
      gameplayRole: "Exploration support asset.",
      linkedMechanic: "Guile check boost.",
      text: "Take this asset. Gain +1 Guile during one encounter or stat check each turn.",
      imagePrompt: "A thin improvised bypass key wrapped in yellow wire and old seal tags.",
      negativePrompt: baseNegativePrompt,
      uiNotes: "This should look useful and illicit, not mystical."
    }
  ]
};

export const allThreatCards: ThreatCardDefinition[] = [
  ...threatDecks.red,
  ...threatDecks.blue,
  ...threatDecks.yellow
];
