import type { Stat } from "../schema/character.schema.js";

export type CharacterComplexity = "beginner" | "standard" | "advanced" | "expert";

export interface CharacterPresentation {
  role: string;
  complexity: CharacterComplexity;
  playstyleSummary: string;
  recommendedForFirstGame: boolean;
  strengths: string[];
  weaknesses: string[];
  usefulStats: Stat[];
  signatureItemSummary: string;
  startingContractSummary: string;
}

export const characterPresentationById: Record<string, CharacterPresentation> = {
  "cinder-wattle": {
    role: "Adaptive Scavenger",
    complexity: "beginner",
    playstyleSummary: "A brood-vat survivor armoured in scavenged machine parts, CW uses an even skill spread and one precise pre-roll boost to approach unfamiliar tests.",
    recommendedForFirstGame: true,
    strengths: ["Flexible tests", "Simple timing", "Route utility"],
    weaknesses: ["No specialist peak", "Boost requires pre-roll timing"],
    usefulStats: ["grit", "guile", "signal", "command", "forge"],
    signatureItemSummary: "Bridge Spike: practical route gear that supports scavenging without changing CW's base stats.",
    startingContractSummary: "Map Broken Paths: rewards exploration and deliberate route choices."
  },
  "black-ledger-agent": {
    role: "Controller",
    complexity: "advanced",
    playstyleSummary: "Turns table knowledge and black-market timing into safer contract progress.",
    recommendedForFirstGame: false,
    strengths: ["Private economy", "Guile checks", "Contract tempo"],
    weaknesses: ["Low direct combat", "Needs timing discipline"],
    usefulStats: ["guile", "signal"],
    signatureItemSummary: "Salvage Ledger: equipped utility that strengthens salvage and shop decisions.",
    startingContractSummary: "Ledger skim: rewards contract-aware route choices."
  },
  char_bjornis: {
    role: "Bruiser",
    complexity: "standard",
    playstyleSummary: "Wins fights and forges pressure into progress, but risks lasting scars when overextended.",
    recommendedForFirstGame: true,
    strengths: ["Grit battles", "Forge rewards", "Threat removal"],
    weaknesses: ["Weak Signal", "Limited subtlety"],
    usefulStats: ["grit", "forge"],
    signatureItemSummary: "Nailspike Maul: a heavy starting weapon for direct Grit battles.",
    startingContractSummary: "Salvage tithe: clear objectives through force and recovery."
  },
  char_deepdale: {
    role: "Routefinder",
    complexity: "standard",
    playstyleSummary: "Reads dangerous paths and converts careful movement into forge-side progress.",
    recommendedForFirstGame: true,
    strengths: ["Forge checks", "Signal routes", "Map safety"],
    weaknesses: ["Modest Command", "Needs planned destinations"],
    usefulStats: ["forge", "signal"],
    signatureItemSummary: "Field Lens: improves inspection and route decisions.",
    startingContractSummary: "Bone-road guide: rewards careful route planning."
  },
  char_ker_von_ker: {
    role: "Tank",
    complexity: "beginner",
    playstyleSummary: "Absorbs danger and holds contested sectors while the table catches up.",
    recommendedForFirstGame: true,
    strengths: ["Durability", "Grit checks", "Blocked sectors"],
    weaknesses: ["Low finesse", "Can become slow"],
    usefulStats: ["grit", "command"],
    signatureItemSummary: "Chapel Guard Harness: defensive armor for survival windows.",
    startingContractSummary: "Guardian span vigil: protects key lanes."
  },
  char_kira_dog: {
    role: "Vanguard Scout",
    complexity: "beginner",
    playstyleSummary: "Tracks non-blue hazards and remains dangerous when a route turns into a close fight.",
    recommendedForFirstGame: true,
    strengths: ["Route reads", "Fast decisions", "Threat avoidance"],
    weaknesses: ["Limited heavy combat", "Needs clear objectives"],
    usefulStats: ["guile", "grit"],
    signatureItemSummary: "Chainhook Blade: a mobile weapon for close route encounters.",
    startingContractSummary: "Lantern run: rewards reaching and reporting key spaces."
  },
  char_popelord: {
    role: "Mire Bulwark",
    complexity: "advanced",
    playstyleSummary: "Endures mire hazards and turns salvage-heavy ground into stubborn forward progress.",
    recommendedForFirstGame: false,
    strengths: ["Grit checks", "Mire control", "Forge pressure"],
    weaknesses: ["Low Guile", "Limited route subtlety"],
    usefulStats: ["grit", "forge"],
    signatureItemSummary: "Black Route Fuse: volatile utility for route and anomaly turns.",
    startingContractSummary: "Salvage tithe: turns resource pressure into progress."
  },
  char_rumi: {
    role: "Duelist",
    complexity: "advanced",
    playstyleSummary: "Combines high Signal and Guile with companion synergies for precise engagements.",
    recommendedForFirstGame: false,
    strengths: ["Signal checks", "Guile timing", "Companion combos"],
    weaknesses: ["Low Command", "Needs sequencing"],
    usefulStats: ["signal", "guile"],
    signatureItemSummary: "Mirror Token: equipped utility that reinforces Command checks.",
    startingContractSummary: "Blackstar sample: rewards anomaly-aware play."
  },
  "cinder-monk": {
    role: "Support",
    complexity: "standard",
    playstyleSummary: "Stabilizes scars and supports the table through controlled risk.",
    recommendedForFirstGame: true,
    strengths: ["Scar control", "Grit resilience", "Signal support"],
    weaknesses: ["Lower Guile", "Needs table awareness"],
    usefulStats: ["grit", "signal"],
    signatureItemSummary: "Oath Chain: equipped utility that reinforces Command checks.",
    startingContractSummary: "Shrine confession: rewards cleansing and recovery."
  },
  "fleet-elder": {
    role: "Support",
    complexity: "standard",
    playstyleSummary: "Uses Command to keep the table organized and objectives moving.",
    recommendedForFirstGame: true,
    strengths: ["Command", "Team tempo", "Objective clarity"],
    weaknesses: ["Low Grit", "Poor solo brawling"],
    usefulStats: ["command", "signal"],
    signatureItemSummary: "Emberlock Pistol: a reliable sidearm for a Command-led expedition.",
    startingContractSummary: "Beacon duty: rewards steady table progress."
  },
  "grave-engineer": {
    role: "Engineer",
    complexity: "standard",
    playstyleSummary: "Solves Forge problems and turns gear timing into reliable sector clears.",
    recommendedForFirstGame: true,
    strengths: ["Forge checks", "Gear economy", "Hazard control"],
    weaknesses: ["Low Signal", "Needs tools online"],
    usefulStats: ["forge", "guile"],
    signatureItemSummary: "Ironhide Bracers: durable armor for hazardous engineering work.",
    startingContractSummary: "Cleanse ledger: rewards solving sector problems."
  },
  "oathbroken-prince": {
    role: "Duelist",
    complexity: "advanced",
    playstyleSummary: "Leans on Guile and oath timing to spike decisive turns.",
    recommendedForFirstGame: false,
    strengths: ["Guile plays", "Duel pressure", "Contract bursts"],
    weaknesses: ["Fragile stat spread", "Punishes mistiming"],
    usefulStats: ["guile", "command"],
    signatureItemSummary: "Oath Chain: contract-linked utility for Command checks.",
    startingContractSummary: "Gate tithe: rewards committed objective routes."
  },
  "rift-cartographer": {
    role: "Routefinder",
    complexity: "beginner",
    playstyleSummary: "Makes movement choices explicit and helps the table understand routes.",
    recommendedForFirstGame: true,
    strengths: ["Movement planning", "Guile routes", "Safe objectives"],
    weaknesses: ["Weak brawling", "Needs map attention"],
    usefulStats: ["guile", "signal"],
    signatureItemSummary: "Route Compass: route gear for movement decisions.",
    startingContractSummary: "Quiet route: rewards reaching planned sectors."
  },
  "salvage-warden": {
    role: "Salvager",
    complexity: "standard",
    playstyleSummary: "Turns salvage sites into recovered gear and keeps exhausted equipment operational.",
    recommendedForFirstGame: true,
    strengths: ["Forge value", "Gear recovery", "Hazard sectors"],
    weaknesses: ["Low Signal", "Moderate combat"],
    usefulStats: ["forge", "guile"],
    signatureItemSummary: "Salvage Guard Mask: practical armor for repair and salvage.",
    startingContractSummary: "Salt burial: rewards salvage discipline."
  },
  "siege-medic": {
    role: "Medic",
    complexity: "beginner",
    playstyleSummary: "Keeps wounds under control and makes danger easier for new tables.",
    recommendedForFirstGame: true,
    strengths: ["Healing", "Grit survival", "Recovery turns"],
    weaknesses: ["Low Guile", "Needs wounded targets"],
    usefulStats: ["forge", "command", "signal"],
    signatureItemSummary: "Saintwire Splint: wound-focused recovery gear.",
    startingContractSummary: "Surgery bond: rewards keeping operatives alive."
  },
  "signal-witch": {
    role: "Mystic",
    complexity: "standard",
    playstyleSummary: "Excels at Signal tests and anomaly-facing turns with clear risk control.",
    recommendedForFirstGame: true,
    strengths: ["Signal checks", "Anomaly handling", "Support magic"],
    weaknesses: ["Low Grit", "Avoids prolonged fights"],
    usefulStats: ["signal", "guile"],
    signatureItemSummary: "Signal Lantern: equipped utility for Signal checks in strange sectors.",
    startingContractSummary: "Spindle harmonics: rewards anomaly and Signal play."
  },
  "void-marshal": {
    role: "Commander",
    complexity: "beginner",
    playstyleSummary: "A clear first-game leader who converts secure sectors and objective pushes into command momentum.",
    recommendedForFirstGame: true,
    strengths: ["Command", "Team direction", "Pressure control"],
    weaknesses: ["Low Signal", "Needs support in weird sectors"],
    usefulStats: ["command", "grit"],
    signatureItemSummary: "Surveyor Chalk: equipped utility that supports Signal checks.",
    startingContractSummary: "Warbell recovery: rewards direct table leadership."
  }
};

export function getCharacterPresentation(characterId: string): CharacterPresentation | null {
  return characterPresentationById[characterId] ?? null;
}
