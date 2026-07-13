export interface CardTemplateDefinition {
  id: string;
  title: string;
  sections: string[];
  uiNotes: string;
}

export const cardTemplates: CardTemplateDefinition[] = [
  {
    id: "character-sheet",
    title: "Character Sheet",
    sections: [
      "top-level-track",
      "left-affiliation-banner",
      "portrait-panel",
      "ability-panel",
      "asset-limit",
      "starting-space",
      "bottom-stat-row"
    ],
    uiNotes: "Prioritize TV readability first, with phone-safe collapsible stat and ability sections."
  },
  {
    id: "mission-card",
    title: "Contract Card",
    sections: ["title", "flavor-line", "objective", "reward", "tier-corner-mark"],
    uiNotes: "Keep reward block visually distinct from objective to avoid mid-turn misreads."
  },
  {
    id: "threat-card",
    title: "Threat Card",
    sections: ["title", "art-window", "type-line", "rules-text", "trophy-or-pressure-value"],
    uiNotes: "Frame color must carry deck identity immediately from sofa distance."
  },
  {
    id: "corruption-card",
    title: "Heat Card",
    sections: ["title", "activation-number", "active-state", "rules-text"],
    uiNotes: "Activation number needs oversized corner treatment for fast scanning."
  }
];
