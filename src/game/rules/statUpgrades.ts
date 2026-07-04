import type { Stat } from "../schema/character.schema.js";

export const NORMAL_STAT_UPGRADE_CAP = 6;
export const STAT_UPGRADE_STATS = ["command", "grit", "signal", "guile", "forge"] as const satisfies readonly Stat[];

export function isUpgradeableStat(value: unknown): value is Stat {
  return typeof value === "string" && (STAT_UPGRADE_STATS as readonly string[]).includes(value);
}

export function getStatUpgradeCost(currentValue: number): number {
  return currentValue + 1;
}

export function getStatUpgradeDisabledReason({
  stat,
  currentValue,
  trophies,
  qaOnly = false,
  cap = NORMAL_STAT_UPGRADE_CAP
}: {
  stat: Stat;
  currentValue: number;
  trophies: number;
  qaOnly?: boolean;
  cap?: number;
}): string | null {
  if (qaOnly) {
    return "QA operatives do not use campaign stat upgrades";
  }

  if (currentValue >= cap) {
    return `${stat} is already at the maximum rank`;
  }

  const cost = getStatUpgradeCost(currentValue);

  if (trophies < cost) {
    return `Need ${cost - trophies} more Troph${cost - trophies === 1 ? "y" : "ies"}`;
  }

  return null;
}
