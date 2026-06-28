import type { GearSlot, Stat } from "./types.js";
import { CHALLENGE_LABELS } from "../../game/ui/challengeTheme.js";

export const statLabelById: Record<Stat, string> = CHALLENGE_LABELS;

export const statShortLabelById: Record<Stat, string> = {
  command: "Cmd",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

export const statAbbreviationById: Record<Stat, string> = {
  command: "Cmd",
  grit: "Grit",
  signal: "Sig",
  guile: "Gui",
  forge: "Forg"
};

export const statOrder: Stat[] = ["command", "grit", "signal", "guile", "forge"];

export const gearSlotLabelById: Record<GearSlot, string> = {
  weapon: "Weapon",
  armor: "Armor",
  utility: "Utility"
};

export function formatSeatLabel(seatId: string | null | undefined): string {
  if (!seatId) {
    return "Seat";
  }

  const numeric = seatId.match(/\d+/)?.[0];
  return numeric ? `Seat ${numeric}` : `Seat ${seatId.replace(/^seat-/i, "").toUpperCase()}`;
}
