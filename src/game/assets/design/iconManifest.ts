export interface IconDefinition {
  id: string;
  color: string;
  symbol: string;
  use: string;
  uiNotes: string;
}

export const iconManifest: Record<string, IconDefinition> = {
  strength: {
    id: "strength",
    color: "red",
    symbol: "rift-forged blade",
    use: "Combat force, endurance, breach pressure",
    uiNotes: "Use angular blade geometry and fracture nicks, not heraldic crests."
  },
  willpower: {
    id: "willpower",
    color: "blue",
    symbol: "vigil eye",
    use: "Resolve, fear resistance, breach mind pressure",
    uiNotes: "Use a vertical pupil and radiating glow, avoid occult triangle clichés."
  },
  cunning: {
    id: "cunning",
    color: "yellow",
    symbol: "split key",
    use: "Scouting, traps, infiltration, technical improvisation",
    uiNotes: "Use broken-tooth key shapes and route-mark notches."
  },
  life: {
    id: "life",
    color: "green",
    symbol: "vital spark",
    use: "Wound track and recovery effects",
    uiNotes: "Should read clearly even at dial size."
  },
  influence: {
    id: "influence",
    color: "bronze",
    symbol: "command seal",
    use: "Currency, leverage, recruitment",
    uiNotes: "Make this coin-like but irregular, with worn seal edges."
  },
  corruption: {
    id: "corruption",
    color: "violet",
    symbol: "rift scar",
    use: "Heat marks, activation state, breach taint",
    uiNotes: "Keep it asymmetric and organic, not demonic rune language."
  },
  artifact: {
    id: "artifact",
    color: "gold",
    symbol: "saint star",
    use: "Rare key items and inner-tier access",
    uiNotes: "Prefer seven-point star geometry with chipped enamel."
  },
  power: {
    id: "power",
    color: "ice-blue",
    symbol: "charged star",
    use: "Route notes and roll substitution",
    uiNotes: "Should feel volatile and luminous rather than magical."
  }
};
