import type { ResolutionStage } from "../schema/session.schema.js";

export type LoadoutWindowKind = "setup" | "action" | "battle" | "challenge";

export interface LoadoutWindowContext {
  status: string;
  phase: string;
  seatId: string;
  activeSeatId: string | null;
  activeResolution?: {
    playerId: string;
    stage: ResolutionStage;
    hasBattle: boolean;
  } | null;
  pendingTileChallenge?: {
    seatId: string;
    rolled: boolean;
  } | null;
  encounterCardType?: string | null;
  pendingEnemyRoll: boolean;
}

export function isPreRollLoadoutStage(stage: ResolutionStage | null | undefined): boolean {
  return stage === "card_reveal" || stage === "battle_setup";
}

export function getLoadoutWindow(context: LoadoutWindowContext): LoadoutWindowKind | null {
  if (context.status === "lobby" && context.phase === "start") return "setup";
  if (context.status !== "active" || context.activeSeatId !== context.seatId || context.pendingEnemyRoll) return null;

  const resolution = context.activeResolution;
  if (resolution) {
    if (
      resolution.playerId !== context.seatId
      || !isPreRollLoadoutStage(resolution.stage)
      || (resolution.stage === "battle_setup" && !resolution.hasBattle)
    ) {
      return null;
    }

    const challenge = context.pendingTileChallenge;
    if (challenge?.seatId === context.seatId) {
      return challenge.rolled ? null : "challenge";
    }

    return context.encounterCardType === "enemy" ? "battle" : "challenge";
  }

  return context.phase === "action" ? "action" : null;
}

export function getLoadoutDisabledReason(context: LoadoutWindowContext): string {
  if (context.pendingEnemyRoll || (context.activeResolution && !isPreRollLoadoutStage(context.activeResolution.stage))) {
    return "Loadout locked when rolling began.";
  }
  if (context.activeSeatId !== context.seatId) return "Only the active operative can change this loadout.";
  return "Change Gear during setup, your Action phase, or before battle and challenge dice are rolled.";
}
