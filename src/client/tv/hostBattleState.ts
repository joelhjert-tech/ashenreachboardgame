import type { ActiveResolution, PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";

function isHostResolution(resolution: ActiveResolution | null | undefined): boolean {
  // Movement arrival checks remain map events. They use the shared check math
  // shape, but must not take over the TV as an enemy battle chamber.
  return Boolean(resolution?.battle && resolution.source !== "movement");
}

export function isHostBattleActive(
  patch: StatePatch<PublicPatchPayload> | null,
  activePlayer: PublicPlayer | null
): boolean {
  if (!patch || !activePlayer) {
    return false;
  }

  return Boolean(
    isHostResolution(patch.payload.activeResolution) ||
      patch.payload.encounter?.cardType === "enemy" ||
      patch.payload.pendingEnemyRoll
  );
}
