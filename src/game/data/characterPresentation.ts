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
  "black-ledger-agent": {
    role: "Controller",
    complexity: "advanced",
    playstyleSummary: "Turns table knowledge and black-market timing into safer contract progress.",
    recommendedForFirstGame: false,
    strengths: ["Private economy", "Guile checks", "Contract tempo"],
    weaknesses: ["Low direct combat", "Needs timing discipline"],
    usefulStats: ["guile", "signal"],
    signatureItemSummary: "Blackstar Ampoule: risky utility for pressure-heavy turns.",
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
    signatureItemSummary: "Red-March Warbell: combat-first gear for loud turns.",
    startingContractSummary: "Salvage tithe: clear objectives through force and recovery."
  },
  char_deepdale: {
    role: "Routefinder",
    complexity: "standard",
    playstyleSummary: "Reads dangerous paths and converts careful movement into forge-side progress.",
    recommendedForFirstGame: true,
    strengths: ["Forge checks", "Signal routes", "Map safety"],
    weaknesses: ["Low Command", "Needs planned destinations"],
    usefulStats: ["forge", "signal"],
    signatureItemSummary: "Grave Lens: improves inspection and route decisions.",
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
    signatureItemSummary: "Last-Breath Rivet: defensive gear for survival windows.",
    startingContractSummary: "Guardian span vigil: protects key lanes."
  },
  char_kira_dog: {
    role: "Scout",
    complexity: "beginner",
    playstyleSummary: "Finds safe lines quickly and makes movement choices easier to read.",
    recommendedForFirstGame: true,
    strengths: ["Route reads", "Fast decisions", "Threat avoidance"],
    weaknesses: ["Limited heavy combat", "Needs clear objectives"],
    usefulStats: ["guile", "grit"],
    signatureItemSummary: "Veil Hook: mobility utility for route turns.",
    startingContractSummary: "Lantern run: rewards reaching and reporting key spaces."
  },
  char_popelord: {
    role: "Mystic",
    complexity: "advanced",
    playstyleSummary: "Uses mire pressure and strange relic timing to turn bad sectors into leverage.",
    recommendedForFirstGame: false,
    strengths: ["Signal spikes", "Mire control", "Relic timing"],
    weaknesses: ["Complex triggers", "Fragile if cornered"],
    usefulStats: ["signal", "forge"],
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
    signatureItemSummary: "Mirror Reroll Token: protects critical roll windows.",
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
    signatureItemSummary: "Scar-Sink Prayer: stabilizes pressure before it leaves a mark.",
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
    signatureItemSummary: "Marshal Seal: improves command-side table plays.",
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
    signatureItemSummary: "Coffin Rig: gear-first utility for hard work.",
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
    signatureItemSummary: "Oath-Chain Ledger: contract-linked timing gear.",
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
    signatureItemSummary: "Ashen Route Compass: route gear for movement decisions.",
    startingContractSummary: "Quiet route: rewards reaching planned sectors."
  },
  "salvage-warden": {
    role: "Salvager",
    complexity: "standard",
    playstyleSummary: "Turns spare gear and shop timing into table resources.",
    recommendedForFirstGame: true,
    strengths: ["Forge value", "Shop turns", "Resource recovery"],
    weaknesses: ["Needs market access", "Moderate combat"],
    usefulStats: ["forge", "guile"],
    signatureItemSummary: "Tuning Spines: practical gear for repair and salvage.",
    startingContractSummary: "Salt burial: rewards salvage discipline."
  },
  "siege-medic": {
    role: "Medic",
    complexity: "beginner",
    playstyleSummary: "Keeps wounds under control and makes danger easier for new tables.",
    recommendedForFirstGame: true,
    strengths: ["Healing", "Grit survival", "Recovery turns"],
    weaknesses: ["Low Signal", "Needs wounded targets"],
    usefulStats: ["grit", "command"],
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
    signatureItemSummary: "Choir-Static Censer: Signal utility for strange sectors.",
    startingContractSummary: "Spindle harmonics: rewards anomaly and Signal play."
  },
  "void-marshal": {
    role: "Commander",
    complexity: "beginner",
    playstyleSummary: "A clear first-game leader with Command pressure and safe recovery tools.",
    recommendedForFirstGame: true,
    strengths: ["Command", "Team direction", "Recovery"],
    weaknesses: ["Low Signal", "Needs support in weird sectors"],
    usefulStats: ["command", "grit"],
    signatureItemSummary: "Cinder Suture Kit: emergency recovery for rough turns.",
    startingContractSummary: "Warbell recovery: rewards direct table leadership."
  }
};

export function getCharacterPresentation(characterId: string): CharacterPresentation | null {
  return characterPresentationById[characterId] ?? null;
}
