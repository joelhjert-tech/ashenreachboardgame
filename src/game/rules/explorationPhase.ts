import type { BoardSpaceDefinition, ThreatIcon } from "../data/boardSpaces.js";

export interface BoardThreatCard {
  id: string;
  category: "event" | "enemy" | "encounter" | "asset";
  icons: ThreatIcon[];
}

export interface ExplorationDrawCounts {
  red: number;
  blue: number;
  yellow: number;
}

function countIcons(icons: ThreatIcon[]): ExplorationDrawCounts {
  return icons.reduce<ExplorationDrawCounts>(
    (counts, icon) => {
      counts[icon] += 1;
      return counts;
    },
    { red: 0, blue: 0, yellow: 0 }
  );
}

export function calculateExplorationDraws(
  space: BoardSpaceDefinition,
  containedThreatCards: BoardThreatCard[]
): ExplorationDrawCounts {
  if (space.tier === "inner" || space.tier === "center") {
    return { red: 0, blue: 0, yellow: 0 };
  }

  const printed = countIcons(space.threatIcons);
  const cardIcons = countIcons(containedThreatCards.flatMap((card) => card.icons));
  const existingCards = countIcons(
    containedThreatCards.flatMap((card) => {
      const firstIcon = card.icons[0];
      return firstIcon ? [firstIcon] : [];
    })
  );

  return {
    red: Math.max(0, printed.red + cardIcons.red - existingCards.red),
    blue: Math.max(0, printed.blue + cardIcons.blue - existingCards.blue),
    yellow: Math.max(0, printed.yellow + cardIcons.yellow - existingCards.yellow)
  };
}
