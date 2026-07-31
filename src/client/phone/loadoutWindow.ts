import {
  getLoadoutDisabledReason,
  getLoadoutWindow,
  type LoadoutWindowContext,
  type LoadoutWindowKind
} from "../../game/rules/loadoutWindow.js";
import type { PhonePatchPayload } from "../shared/types.js";

function toLoadoutContext(patch: PhonePatchPayload, seatId: string): LoadoutWindowContext {
  const pendingTileChallenge = patch.pendingTileChallengePrivate ?? patch.pendingTileChallenge ?? null;
  return {
    status: patch.status,
    phase: patch.phase,
    seatId,
    activeSeatId: patch.turnOrder[patch.activeSeatIndex] ?? null,
    activeResolution: patch.activeResolution
      ? {
          playerId: patch.activeResolution.playerId,
          stage: patch.activeResolution.stage,
          hasBattle: Boolean(patch.activeResolution.battle)
        }
      : null,
    pendingTileChallenge: pendingTileChallenge
      ? { seatId: pendingTileChallenge.seatId, rolled: pendingTileChallenge.rolled }
      : null,
    encounterCardType: patch.encounter?.cardType ?? patch.activeResolution?.card?.type ?? null,
    pendingEnemyRoll: Boolean(patch.pendingEnemyRoll)
  };
}

export function getPhoneLoadoutWindow(patch: PhonePatchPayload, seatId: string): LoadoutWindowKind | null {
  return getLoadoutWindow(toLoadoutContext(patch, seatId));
}

export function getPhoneLoadoutDisabledReason(patch: PhonePatchPayload, seatId: string): string {
  return getLoadoutDisabledReason(toLoadoutContext(patch, seatId));
}
