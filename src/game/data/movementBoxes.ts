import { BOARD_SPACES, type MovementBoxDefinition } from "./boardSpaces.js";

export interface SpaceMovementBox extends MovementBoxDefinition {
  spaceId: string;
}

export const MOVEMENT_BOXES: SpaceMovementBox[] = BOARD_SPACES.flatMap((space) =>
  space.movementBox
    ? [
        {
          spaceId: space.id,
          ...space.movementBox
        }
      ]
    : []
);
