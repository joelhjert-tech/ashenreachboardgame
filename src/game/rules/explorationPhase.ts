import type { BoardSpaceDefinition, ThreatIcon } from "../data/boardSpaces.js";

export interface BoardThreatCard {
  id: string;
  category: "event" | "enemy" | "nemesis" | "encounter" | "asset";
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
  if (space.tier === "center") {
    return { red: 0, blue: 0, yellow: 0 };
  }

  const printed = countIcons(space.threatIcons);
  const existingSlotOccupants = countIcons(
    containedThreatCards.flatMap((card) => {
      const firstIcon = card.icons[0];
      return firstIcon ? [firstIcon] : [];
    })
  );
  const additionalPressure = countIcons(containedThreatCards.flatMap((card) => card.icons.slice(1)));

  return {
    red: Math.max(0, printed.red + additionalPressure.red - existingSlotOccupants.red),
    blue: Math.max(0, printed.blue + additionalPressure.blue - existingSlotOccupants.blue),
    yellow: Math.max(0, printed.yellow + additionalPressure.yellow - existingSlotOccupants.yellow)
  };
}
