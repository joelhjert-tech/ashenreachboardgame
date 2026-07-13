import { useEffect, useRef, type ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import type { PublicPatchPayload, PublicPlayer, StatePatch } from "../shared/types.js";
import { HostBattleOverlay } from "./HostBattleOverlay.js";

function toTitleCase(value: string): string {
  return value.replace(/(^|[-_\s])\w/g, (match) => match.toUpperCase()).replace(/[-_]/g, " ");
}

export function HostBattleChamber({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload>;
  activePlayer: PublicPlayer;
}): ReactElement {
  const chamberRef = useRef<HTMLElement>(null);
  const space = getBoardSpace(activePlayer.sectorId);
  const sector = patch.payload.sectors.find((entry) => entry.id === activePlayer.sectorId) ?? null;
  const locationName = space?.name ?? sector?.name ?? "Current sector";
  const region = space?.tier ?? sector?.regionTier ?? null;
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
      <header className="tv-host-battle-chamber__context">
        <span>Battle at {locationName}</span>
        <strong>{activePlayer.character.name}</strong>
        <small>{region ? `${toTitleCase(region)} reach` : "Resolution active"}</small>
      </header>
      <div className="tv-host-battle-chamber__instrument" aria-label="Battle command surface">
        <HostBattleOverlay patch={patch} activePlayer={activePlayer} />
      </div>
    </section>
  );
}
