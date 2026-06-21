import type { PlayerState } from "./schema/session.schema.js";
import type { BoardSpaceDefinition } from "./data/boardSpaces.js";
import { buildEngagementQueue, shouldResolveSpaceText } from "./rules/engagementPhase.js";
import {
  calculateExplorationDraws,
  type BoardThreatCard,
  type ExplorationDrawCounts
} from "./rules/explorationPhase.js";

export interface BoardSpaceEvent {
  playerId: string;
  spaceId: string;
  title: string;
  tier: BoardSpaceDefinition["tier"];
  printedThreatIcons: BoardSpaceDefinition["threatIcons"];
  movementBox: BoardSpaceDefinition["movementBox"] | null;
  textBox: BoardSpaceDefinition["textBox"];
  exploration: {
    skipped: boolean;
    drawCounts: ExplorationDrawCounts;
  };
  engagement: {
    queue: BoardThreatCard[];
    shouldResolveTextBox: boolean;
  };
  notes?: string;
}

export function resolveBoardSpaceEvent(
  player: PlayerState,
  space: BoardSpaceDefinition,
  containedThreatCards: BoardThreatCard[]
): BoardSpaceEvent {
  return {
    playerId: player.seatId,
    spaceId: space.id,
    title: space.name,
    tier: space.tier,
    printedThreatIcons: [...space.threatIcons],
    movementBox: space.movementBox ?? null,
    textBox: space.textBox,
    exploration: {
      skipped: space.tier === "inner" || space.tier === "center",
      drawCounts: calculateExplorationDraws(space, containedThreatCards)
    },
    engagement: {
      queue: buildEngagementQueue(containedThreatCards),
      shouldResolveTextBox: shouldResolveSpaceText(space, containedThreatCards)
    },
    notes: space.notes
  };
}
