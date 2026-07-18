import { useEffect, useRef, type ReactElement } from "react";
import type { PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";
import { HostBattleOverlay } from "./HostBattleOverlay.js";

export function HostBattleChamber({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload>;
  activePlayer: PublicPlayer;
}): ReactElement {
  const chamberRef = useRef<HTMLElement>(null);
  const stage = patch.payload.activeResolution?.stage ?? (patch.payload.pendingEnemyRoll ? "pending_roll" : "preparing");

  useEffect(() => {
    chamberRef.current?.focus({ preventScroll: true });
  }, [patch.payload.activeResolution?.id]);

  return (
    <section
      ref={chamberRef}
      className="tv-host-battle-chamber"
      aria-label="Battle chamber"
      data-testid="tv-host-battle-chamber"
      data-battle-stage={stage}
      tabIndex={-1}
    >
      <div className="tv-host-battle-chamber__instrument" aria-label="Battle command surface">
        <HostBattleOverlay patch={patch} activePlayer={activePlayer} />
      </div>
    </section>
  );
}
