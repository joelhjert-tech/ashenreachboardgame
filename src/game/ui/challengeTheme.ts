import type { Stat } from "../schema/character.schema.js";

export interface ChallengeTheme {
  label: string;
  shortLabel: string;
  color: string;
  glow: string;
  soft: string;
  border: string;
  icon: string;
  iconLabel: string;
  treatment: string;
}

export const CHALLENGE_THEME: Record<Stat, ChallengeTheme> = {
  command: {
    label: "Command",
    shortLabel: "Cmd",
    color: "#9B6CFF",
    glow: "rgba(155, 108, 255, 0.55)",
    soft: "rgba(155, 108, 255, 0.16)",
    border: "rgba(155, 108, 255, 0.62)",
    icon: "⚑",
    iconLabel: "banner",
    treatment: "Scenario orders, leadership, tactics"
  },
  grit: {
    label: "Grit",
    shortLabel: "Grit",
    color: "#D84A32",
    glow: "rgba(216, 74, 50, 0.55)",
    soft: "rgba(216, 74, 50, 0.16)",
    border: "rgba(216, 74, 50, 0.68)",
    icon: "⚔",
    iconLabel: "crossed blades",
    treatment: "Combat, wounds, force"
  },
  signal: {
    label: "Signal",
    shortLabel: "Sig",
    color: "#39A9FF",
    glow: "rgba(57, 169, 255, 0.55)",
    soft: "rgba(57, 169, 255, 0.16)",
    border: "rgba(57, 169, 255, 0.66)",
    icon: "◉",
    iconLabel: "signal eye",
    treatment: "Anomaly, void, relic signal"
  },
  guile: {
    label: "Guile",
    shortLabel: "Gui",
    color: "#4FBF78",
    glow: "rgba(79, 191, 120, 0.52)",
    soft: "rgba(79, 191, 120, 0.15)",
    border: "rgba(79, 191, 120, 0.64)",
    icon: "◆",
    iconLabel: "mask",
    treatment: "Traps, trade, salvage tricks"
  },
  forge: {
    label: "Forge",
    shortLabel: "Forg",
    color: "#D8792A",
    glow: "rgba(216, 121, 42, 0.55)",
    soft: "rgba(216, 121, 42, 0.17)",
    border: "rgba(216, 121, 42, 0.66)",
    icon: "⚙",
    iconLabel: "gear",
    treatment: "Crafting, repairs, machines, armor"
  }
};

export const CHALLENGE_COLORS: Record<Stat, string> = Object.fromEntries(
  Object.entries(CHALLENGE_THEME).map(([stat, theme]) => [stat, theme.color])
) as Record<Stat, string>;

export const CHALLENGE_ICONS: Record<Stat, string> = Object.fromEntries(
  Object.entries(CHALLENGE_THEME).map(([stat, theme]) => [stat, theme.icon])
) as Record<Stat, string>;

export const CHALLENGE_LABELS: Record<Stat, string> = Object.fromEntries(
  Object.entries(CHALLENGE_THEME).map(([stat, theme]) => [stat, theme.label])
) as Record<Stat, string>;

export const THREAT_ICON_CHALLENGE_STAT = {
  red: "grit",
  blue: "signal",
  yellow: "guile",
  green: "forge",
  gold: "command",
  white: "command"
} as const satisfies Record<string, Stat>;

export function getChallengeTheme(stat: Stat): ChallengeTheme {
  return CHALLENGE_THEME[stat];
}

export function getChallengeThemeStyle(stat: Stat): Record<string, string> {
  const theme = getChallengeTheme(stat);

  return {
    "--challenge-color": theme.color,
    "--challenge-glow": theme.glow,
    "--challenge-soft": theme.soft,
    "--challenge-border": theme.border
  };
}
