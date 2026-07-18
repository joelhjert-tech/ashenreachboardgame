import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "./boardSpaces.js";

export type BoardRing = BoardNode["ring"];

export interface BoardRingTransition {
  edgeId: string;
  sourceSectorId: string;
  destinationSectorId: string;
  sourceRing: BoardRing;
  destinationRing: BoardRing;
  direction: "inward" | "outward";
  edgeCost: 1;
  exactMovementRequired: 1;
  endsMovement: true;
  requiredNotes: string[];
  allowedFrom: string[];
  lockedReason: string | null;
  uiLabel: string;
}

const ringDepth: Record<BoardRing, number> = { outer: 0, middle: 1, inner: 2, center: 3 };

function createTransition(sourceSectorId: string, destinationSectorId: string): BoardRingTransition {
  const sourceNode = RIFTFALL_BOARD_NODE_INDEX.get(sourceSectorId);
  const destinationNode = RIFTFALL_BOARD_NODE_INDEX.get(destinationSectorId);
  if (!sourceNode || !destinationNode || sourceNode.ring === destinationNode.ring) {
    throw new Error(`Invalid ring transition ${sourceSectorId} -> ${destinationSectorId}`);
  }
  const requirements = getBoardSpace(destinationSectorId)?.movementRequirements ?? [];
  const requiredNotes = [...new Set(requirements.flatMap((requirement) => requirement.requiredNotes ?? []))];
  const allowedFrom = [...new Set(requirements.flatMap((requirement) => requirement.allowedFrom ?? []))];
  const lockedReason = requirements.find((requirement) => requirement.errorMessage)?.errorMessage ?? null;
  const direction = ringDepth[destinationNode.ring] > ringDepth[sourceNode.ring] ? "inward" : "outward";
  return {
    edgeId: `${sourceSectorId}--${destinationSectorId}`,
    sourceSectorId,
    destinationSectorId,
    sourceRing: sourceNode.ring,
    destinationRing: destinationNode.ring,
    direction,
    edgeCost: 1,
    exactMovementRequired: 1,
    endsMovement: true,
    requiredNotes,
    allowedFrom,
    lockedReason,
    uiLabel: direction === "inward" ? `Enter ${destinationNode.ring} ring` : `Return to ${destinationNode.ring} ring`
  };
}

/** Derived from the canonical graph; never used as a second movement authority. */
export const BOARD_RING_TRANSITIONS: BoardRingTransition[] = RIFTFALL_BOARD_NODES.flatMap((sourceNode) =>
  sourceNode.connections
    .filter((destinationSectorId) => {
      const destinationNode = RIFTFALL_BOARD_NODE_INDEX.get(destinationSectorId);
      return Boolean(destinationNode && destinationNode.ring !== sourceNode.ring);
    })
    .map((destinationSectorId) => createTransition(sourceNode.id, destinationSectorId))
);

export function getBoardRingTransition(sourceSectorId: string, destinationSectorId: string): BoardRingTransition | null {
  return BOARD_RING_TRANSITIONS.find((transition) => transition.sourceSectorId === sourceSectorId && transition.destinationSectorId === destinationSectorId) ?? null;
}

export function getUndirectedBoardRingTransitions(): BoardRingTransition[] {
  return BOARD_RING_TRANSITIONS.filter((transition) => transition.sourceSectorId.localeCompare(transition.destinationSectorId) < 0);
}
