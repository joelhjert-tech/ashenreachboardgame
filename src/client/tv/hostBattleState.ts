import type { ActiveResolution, PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";

function isEnemyBattleResolution(resolution: ActiveResolution | null | undefined): boolean {
  return Boolean(resolution?.battle && (resolution.card?.type === "enemy" || resolution.battle.enemyName));
}

export function isHostBattleActive(
  patch: StatePatch<PublicPatchPayload> | null,
  activePlayer: PublicPlayer | null
): boolean {
  if (!patch || !activePlayer) {
    return false;
  }

  return Boolean(
    isEnemyBattleResolution(patch.payload.activeResolution) ||
      patch.payload.encounter?.cardType === "enemy" ||
      patch.payload.pendingEnemyRoll
  );
}
