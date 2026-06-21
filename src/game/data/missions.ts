import { baseNegativePrompt } from "../assets/design/negativePrompt.js";

export type ThreatIcon = "red" | "blue" | "yellow";

export interface MissionDefinition {
  id: string;
  name: string;
  tier: "outer" | "middle" | "inner";
  loreRole: string;
  gameplayRole: string;
  linkedMechanic: string;
  objectiveText: string;
  objectiveKey: string;
  rewardText: string;
  rewardKey: string;
  requiredSpaceIds?: string[];
  requiredEnemyTraits?: string[];
  requiredThreatColors?: ThreatIcon[];
  progressRequired?: number;
  imagePrompt: string;
  negativePrompt: string;
  uiNotes: string;
}

export const missions: MissionDefinition[] = [
  {
    id: "mission_cleanse_ember_sanctum",
    name: "Cleanse the Ember Sanctum",
    tier: "outer",
    loreRole: "Reclaim the refuge before the breach stain settles in.",
    gameplayRole: "Sanctuary-control opener.",
    linkedMechanic: "End engagement on a clean space.",
    objectiveText: "End your Engagement Phase at Ember Sanctum with no Threat cards on the space.",
    objectiveKey: "endEngagementAtCleanSanctum",
    rewardText: "Gain 1 completed Mission and heal 1 Life.",
    rewardKey: "completeMissionHealLife",
    requiredSpaceIds: ["outer_ember_sanctum"],
    imagePrompt: "Mission art of a ruined sanctuary under blue breach light, survivors relighting candles.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Safe-space missions should use calmer composition and higher contrast text areas."
  },
  {
    id: "mission_restart_void_relay",
    name: "Restart the Void Relay",
    tier: "outer",
    loreRole: "Restore one surviving line of command through the sector haze.",
    gameplayRole: "Skill-test route mission.",
    linkedMechanic: "Pass Cunning tests at relay-adjacent spaces.",
    objectiveText: "Pass a Cunning test at Mirecoil Beacon, Crash Site, or Glassmere Spindle.",
    objectiveKey: "passCunningAtRelaySite",
    rewardText: "Draw 2 Power Cards. Keep 1 and discard 1.",
    rewardKey: "drawTwoPowerKeepOne",
    requiredSpaceIds: ["mirecoil-beacon", "outer_crash_site", "glassmere-spindle"],
    imagePrompt: "Broken communication mast sparking under a cold night sky with field crews at work.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use signal-light motifs and line-of-sight silhouettes."
  },
  {
    id: "mission_hunt_riftspawn",
    name: "Hunt the Riftspawn",
    tier: "middle",
    loreRole: "Thin the breach-born packs before they own the mid-ring.",
    gameplayRole: "Enemy-defeat progress mission.",
    linkedMechanic: "Defeat trait-count targets.",
    objectiveText: "Defeat 2 Riftspawn Enemies.",
    objectiveKey: "defeatEnemyTraitCount",
    rewardText: "Gain 1 completed Mission and 1 Influence.",
    rewardKey: "completeMissionGainInfluence",
    requiredEnemyTraits: ["riftspawn"],
    progressRequired: 2,
    imagePrompt: "Hunters tracking glowing claw marks across a metal ruin beneath red warning lamps.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use clear prey-tracking cues instead of busy battle scenes."
  },
  {
    id: "mission_map_broken_paths",
    name: "Map the Broken Paths",
    tier: "middle",
    loreRole: "Chart one stable route through a collapsing breach corridor.",
    gameplayRole: "Location plus test mission.",
    linkedMechanic: "Pass a test at a named breach tile.",
    objectiveText: "End your Engagement Phase on Webglass Breach after passing a Cunning test.",
    objectiveKey: "passCunningAtWebglassBreach",
    rewardText: "Gain 1 path token and 1 completed Mission.",
    rewardKey: "gainPathTokenCompleteMission",
    requiredSpaceIds: ["middle_webglass_breach"],
    imagePrompt: "Fractured teal corridors drifting through black void as a scout marks a glowing route map.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This card should feel navigational, not combative."
  },
  {
    id: "mission_salvage_the_bellframe",
    name: "Salvage the Bellframe",
    tier: "outer",
    loreRole: "Recover a shattered shrine-engine before raiders strip it bare.",
    gameplayRole: "Gear-acquisition mission.",
    linkedMechanic: "Resolve space text on a salvage site.",
    objectiveText: "Resolve the text box at Hollow Veil Yard or Crash Site.",
    objectiveKey: "resolveSalvageText",
    rewardText: "Draw 2 Gear cards. Buy 1 at -1 Influence cost.",
    rewardKey: "drawTwoGearDiscountOne",
    requiredSpaceIds: ["hollow-veil-yard", "outer_crash_site"],
    imagePrompt: "Collapsed shrine-engine among wreck stacks, bronze bells and salvage crews in smoke.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Keep the reward region metallic and practical."
  },
  {
    id: "mission_hold_the_ridge",
    name: "Hold the Ridge",
    tier: "outer",
    loreRole: "Keep Emberwatch from turning into a public execution lane.",
    gameplayRole: "Pressure endurance mission.",
    linkedMechanic: "Survive on a hostile tile.",
    objectiveText: "End your turn on Emberwatch Step after succeeding at any battle or hazard there.",
    objectiveKey: "surviveEmberwatchTurn",
    rewardText: "Gain 2 Influence.",
    rewardKey: "gainTwoInfluence",
    requiredSpaceIds: ["emberwatch-step"],
    imagePrompt: "Ridge guns, burning trenches, and a lone operative silhouetted against heat haze.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This mission should read as pressure and defiance."
  },
  {
    id: "mission_choir_quietus",
    name: "Choir Quietus",
    tier: "middle",
    loreRole: "Silence a dangerous relay hymn before it spreads into the breach lanes.",
    gameplayRole: "Blue-threat suppression mission.",
    linkedMechanic: "Resolve blue pressure and relay spaces.",
    objectiveText: "Clear a blue Threat from Glassmere Spindle, Shard Sprawl, or Guardian Span.",
    objectiveKey: "clearBlueThreatRelay",
    rewardText: "Discard 1 Corruption Card or draw 1 Power Card.",
    rewardKey: "cleanseOrDrawPower",
    requiredThreatColors: ["blue"],
    imagePrompt: "Relay choir chamber with hanging glass conduits and pale blue resonance light.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use blue frame accents stronger than usual."
  },
  {
    id: "mission_break_the_raider_chain",
    name: "Break the Raider Chain",
    tier: "outer",
    loreRole: "Stop raider couriers from linking the badlands into a single war lane.",
    gameplayRole: "Red-threat chain breaker.",
    linkedMechanic: "Defeat red enemies across multiple spaces.",
    objectiveText: "Defeat 2 red Enemies on different outer spaces.",
    objectiveKey: "defeatRedEnemiesDifferentSpaces",
    rewardText: "Gain 1 completed Mission and 1 Gear draw.",
    rewardKey: "completeMissionAndGearDraw",
    requiredThreatColors: ["red"],
    progressRequired: 2,
    imagePrompt: "Scrap-bike couriers and warning flares racing across a dead freight plain.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Use strong diagonal motion in the art window."
  },
  {
    id: "mission_pilgrim_convoy",
    name: "Pilgrim Convoy",
    tier: "outer",
    loreRole: "Escort the last sanctuary-bound survivors through a lane that no longer wants them alive.",
    gameplayRole: "Travel-route mission.",
    linkedMechanic: "Visit multiple safe and dangerous spaces in sequence.",
    objectiveText: "Move from Ember Sanctum to Ashwake Crossing to Mirecoil Beacon over separate turns without being Vanquished.",
    objectiveKey: "visitPilgrimRoute",
    rewardText: "Gain 3 Influence.",
    rewardKey: "gainThreeInfluence",
    requiredSpaceIds: ["outer_ember_sanctum", "ashwake-crossing", "mirecoil-beacon"],
    imagePrompt: "Pilgrim convoy under tarps crossing a torn metal roadway with candle lanterns and blue rift haze.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Should read as movement and protection, not battle."
  },
  {
    id: "mission_span_of_the_last_seal",
    name: "Span of the Last Seal",
    tier: "middle",
    loreRole: "Stand before the inner threshold and prove you belong there.",
    gameplayRole: "Gate preparation mission.",
    linkedMechanic: "Reach the mandatory breach gate with progress intact.",
    objectiveText: "End your Engagement Phase at Guardian Span while holding at least 1 key artifact.",
    objectiveKey: "endAtGuardianSpanWithKey",
    rewardText: "Gain 1 completed Mission and draw 1 Power Card.",
    rewardKey: "completeMissionDrawPower",
    requiredSpaceIds: ["middle_guardian_span"],
    imagePrompt: "Massive gate span before a screaming breach, lone figure beneath giant warning sigils.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "This card should visually preview the inner tier."
  },
  {
    id: "mission_lattice_witness",
    name: "Lattice Witness",
    tier: "inner",
    loreRole: "Bring back proof that the breach approach can still be walked by the living.",
    gameplayRole: "Inner-tier survival mission.",
    linkedMechanic: "Survive and pass an inner-tier text test.",
    objectiveText: "Pass the printed test at Cinder Lattice.",
    objectiveKey: "passInnerLatticeTest",
    rewardText: "Gain 1 completed Mission and remove 1 Corruption Card.",
    rewardKey: "completeMissionRemoveCorruption",
    requiredSpaceIds: ["inner_cinder_lattice"],
    imagePrompt: "An impossible walkway over a living energy lattice, one survivor recording the path.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Inner missions should use more negative space and core glow."
  },
  {
    id: "mission_gatefire_vigil",
    name: "Gatefire Vigil",
    tier: "inner",
    loreRole: "Keep your mind intact long enough to stand under the core light.",
    gameplayRole: "Willpower endurance mission.",
    linkedMechanic: "Pass repeated inner pressure tests.",
    objectiveText: "Pass 2 blue-aligned tests in the inner tier over any number of turns.",
    objectiveKey: "passTwoInnerResolveTests",
    rewardText: "Gain 1 saint relic clue.",
    rewardKey: "gainSaintRelicClue",
    requiredThreatColors: ["blue"],
    progressRequired: 2,
    imagePrompt: "A lone figure kneeling beneath a severe blue-white beam at the heart of a breach corridor.",
    negativePrompt: baseNegativePrompt,
    uiNotes: "Keep typography stark and ceremonial."
  }
];
