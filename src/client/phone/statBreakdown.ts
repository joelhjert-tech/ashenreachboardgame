import type { PhoneSelfState, Stat } from "../shared/types.js";

export interface PhoneStatBreakdown {
  current: number;
  base: number;
  permanent: number;
  gearFollower: number;
}

export function getPhoneStatBreakdown(self: PhoneSelfState, stat: Stat): PhoneStatBreakdown {
  const permanent = self.character.statUpgrades?.[stat] ?? 0;
  const base = Math.max(0, self.character.stats[stat] - permanent);
  const equippedIds = new Set(Object.values(self.character.equippedGear).filter((value): value is string => Boolean(value)));
  const gearFollower = self.character.heldGear.reduce((sum, item) => {
    if (!equippedIds.has(item.id) || item.statBonus.stat !== stat) {
      return sum;
    }

    return sum + item.statBonus.amount;
  }, 0);

  return {
    current: self.character.stats[stat],
    base,
    permanent,
    gearFollower
  };
}

export function formatSignedStatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
