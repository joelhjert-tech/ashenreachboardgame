import { getBoardSpace } from "../../game/data/boardSpaces.js";
import type { PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";
import { isHostBattleActive } from "./hostBattleState.js";

export function isHostShopActive(
  patch: StatePatch<PublicPatchPayload> | null,
  activePlayer: PublicPlayer | null
): boolean {
  if (!patch || !activePlayer || patch.payload.status !== "active" || patch.phase !== "action") {
    return false;
  }

  if (isHostBattleActive(patch, activePlayer)) {
    return false;
  }

  if (patch.payload.activeResolution || patch.payload.pendingEnemyRoll) {
    return false;
  }

  if (patch.payload.shopEncounter) {
    return true;
  }

  const space = getBoardSpace(activePlayer.sectorId);
  return Boolean(space?.tags.some((tag) => tag === "shop" || tag === "risk-shop"));
}
