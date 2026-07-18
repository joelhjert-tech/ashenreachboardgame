import { useEffect, useRef, type ReactElement } from "react";
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
  const stage = patch.payload.activeResolution?.stage ?? (patch.payload.pendingEnemyRoll ? "pending_roll" : "preparing");
  const isEnemyBattle = patch.payload.activeResolution?.card?.type === "enemy" || patch.payload.encounter?.cardType === "enemy";
  const stat = patch.payload.activeResolution?.battle?.stat ?? patch.payload.encounter?.stat ?? patch.payload.pendingTileChallenge?.testStat ?? null;
  const difficulty = patch.payload.activeResolution?.battle?.difficulty ?? patch.payload.encounter?.difficulty ?? patch.payload.pendingTileChallenge?.difficulty ?? null;

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
      <header className="tv-host-battle-chamber__header" data-testid="tv-host-encounter-header">
        <strong>{isEnemyBattle ? "Battle" : toTitleCase(patch.payload.pendingTileChallenge?.challengeType ?? patch.payload.encounter?.cardType ?? "Skill test")}</strong>
        <span>{stat ? `${toTitleCase(stat)}${difficulty ? ` ${difficulty}` : ""}` : "Resolution"}</span>
        <small>{toTitleCase(stage)}</small>
      </header>
      <div className="tv-host-battle-chamber__instrument" aria-label="Battle command surface">
        <HostBattleOverlay patch={patch} activePlayer={activePlayer} />
      </div>
    </section>
  );
}
