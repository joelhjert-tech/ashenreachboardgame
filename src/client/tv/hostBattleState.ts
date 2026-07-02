import type { ActiveResolution, PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";

function isHostResolution(resolution: ActiveResolution | null | undefined): boolean {
  return Boolean(resolution?.battle);
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
