import type { PhoneSelfState, Stat } from "../shared/types.js";

export interface PhoneStatBreakdown {
  current: number;
  base: number;
  permanent: number;
  gearFollower: number;
  final: number;
  gearFollowerSources: Array<{
    label: string;
    value: number;
    sourceType: "gear" | "follower";
  }>;
}

export function getPhoneStatBreakdown(self: PhoneSelfState, stat: Stat): PhoneStatBreakdown {
  const permanent = self.character.statUpgrades?.[stat] ?? 0;
  const base = Math.max(0, self.character.stats[stat] - permanent);
  const equippedIds = new Set(Object.values(self.character.equippedGear).filter((value): value is string => Boolean(value)));
  const gearFollowerSources = self.character.heldGear
    .filter((item) => equippedIds.has(item.id) && item.statBonus.stat === stat)
    .map((item) => ({
      label: item.name,
      value: item.statBonus.amount,
      sourceType: "gear" as const
    }));
  const gearFollower = gearFollowerSources.reduce((sum, source) => sum + source.value, 0);

  return {
    current: self.character.stats[stat],
    base,
    permanent,
    gearFollower,
    final: self.character.stats[stat] + gearFollower,
    gearFollowerSources
  };
}

export function formatSignedStatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
