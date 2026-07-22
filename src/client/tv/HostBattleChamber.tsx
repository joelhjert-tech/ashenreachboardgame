import { useEffect, useRef, useState, type ReactElement } from "react";
import type { PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";
import { useFocusOnRevision } from "../shared/useFocusOnRevision.js";
import { HostBattleOverlay } from "./HostBattleOverlay.js";

function wasBattleSeen(id: string | null): boolean {
  if (!id || typeof window === "undefined") return false;
  return window.sessionStorage.getItem(`ashenreach:battle-seen:${id}`) === "1";
}

export function HostBattleChamber({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload>;
  activePlayer: PublicPlayer;
}): ReactElement {
  const chamberRef = useRef<HTMLElement>(null);
  const battleId = patch.payload.battlePresentation?.id ?? patch.payload.activeResolution?.id ?? null;
  const [restored, setRestored] = useState(() => wasBattleSeen(battleId));
  const stage = patch.payload.battlePresentation?.stage ?? patch.payload.activeResolution?.stage ?? (patch.payload.pendingEnemyRoll ? "pending_roll" : "preparing");

  useFocusOnRevision(chamberRef, battleId, Boolean(battleId), null);

  useEffect(() => {
    const alreadySeen = wasBattleSeen(battleId);
    setRestored(alreadySeen);
    if (battleId && typeof window !== "undefined") {
      window.sessionStorage.setItem(`ashenreach:battle-seen:${battleId}`, "1");
    }
  }, [battleId]);

  return (
    <section
      ref={chamberRef}
      className="tv-host-battle-chamber"
      aria-label="Battle chamber"
      data-testid="tv-host-battle-chamber"
      data-battle-stage={stage}
      data-battle-restored={restored ? "true" : "false"}
      tabIndex={-1}
    >
      <div className="tv-host-battle-chamber__instrument" aria-label="Battle command surface">
        <HostBattleOverlay patch={patch} activePlayer={activePlayer} />
      </div>
    </section>
  );
}
