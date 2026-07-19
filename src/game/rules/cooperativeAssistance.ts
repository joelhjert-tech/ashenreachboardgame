import type { GameState, PlayerState } from "../schema/session.schema.js";
import type { Stat } from "../schema/character.schema.js";

export const MAX_COOPERATIVE_HELPERS = 2 as const;

export const COOPERATIVE_ASSISTANCE_STATS = ["command", "grit", "signal", "guile", "forge"] as const satisfies readonly Stat[];

export type CooperativeAssistanceSourceKind =
  | "encounter"
  | "tileChallenge"
  | "boardSpace"
  | "scenarioNode"
  | "scenarioConfrontation";

export interface CooperativeAssistanceContribution {
  seatId: string;
  value: number;
}

export function isCooperativeAssistanceMode(state: Pick<GameState, "status" | "sessionMode" | "gameMode" | "interactionMode">): boolean {
  return state.status === "active" &&
    state.sessionMode === "multiplayer" &&
    state.gameMode === "standard" &&
    state.interactionMode === "co-op";
}

export function getIntrinsicBaseStat(player: Pick<PlayerState, "character">, stat: Stat): number {
  const permanentAdvancement = player.character.statUpgrades?.[stat] ?? 0;
  return Math.max(0, player.character.stats[stat] - permanentAdvancement);
}

export function getEligibleCooperativeHelperSeatIds(state: GameState, activeSeatId: string, stat: Stat): string[] {
  if (!isCooperativeAssistanceMode(state) || !COOPERATIVE_ASSISTANCE_STATS.includes(stat)) return [];
  const active = state.players.find((entry) => entry.seatId === activeSeatId);
  if (active?.character.scars.includes("scar-hollow-reflection")) return [];
  if (stat === "command" && active?.character.scars.includes("scar-wound-4")) return [];

  return state.turnOrder.filter((seatId) => {
    if (seatId === activeSeatId) return false;
    const seat = state.seats.find((entry) => entry.seatId === seatId);
    const player = state.players.find((entry) => entry.seatId === seatId);
    return Boolean(
      seat &&
      player &&
      seat.connected &&
      !seat.kicked &&
      seat.characterSelected !== false &&
      player.character.status === "active" &&
      Number.isInteger(getIntrinsicBaseStat(player, stat))
    );
  });
}

export function lockCooperativeContributions(
  state: GameState,
  acceptedSeatIds: readonly string[],
  stat: Stat
): CooperativeAssistanceContribution[] {
  return acceptedSeatIds.slice(0, MAX_COOPERATIVE_HELPERS).map((seatId) => {
    const helper = state.players.find((entry) => entry.seatId === seatId);
    if (!helper) throw new Error(`Missing cooperative helper ${seatId}`);
    const borrowedNameUnused = helper.character.scars.includes("scar-borrowed-name") &&
      !(state.scarUsage ?? []).some((entry) => entry.seatId === seatId && entry.scarId === "scar-borrowed-name" && entry.ruleKey === "first-assistance-reduction" && entry.scope === "round");
    return { seatId, value: Math.max(0, getIntrinsicBaseStat(helper, stat) - (borrowedNameUnused ? 1 : 0)) };
  });
}

export function sumCooperativeContributions(contributions: readonly CooperativeAssistanceContribution[]): number {
  return contributions.reduce((sum, entry) => sum + entry.value, 0);
}
