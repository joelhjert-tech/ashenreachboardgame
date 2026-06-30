import type { Character, Stat } from "../schema/character.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";

const RUMI_CHARACTER_ID = "char_rumi";
const MIRA_FOLLOWER_ID = "mira-rift-twin";
const ZOEY_FOLLOWER_ID = "zoey-thorn-violet";
const MIRA_RUMI_TEAM_BONUS: Partial<Record<Stat, number>> = {
  signal: 1,
  guile: 1
};
const VIOLET_TRIAD_TEAM_BONUS: Partial<Record<Stat, number>> = {
  grit: 1,
  signal: 1,
  guile: 1
};

export function getHeldGearItem(character: Character, gearId: string): GearItem | undefined {
  return character.heldGear.find((item) => item.id === gearId);
}

export function getEquippedGearItem(
  character: Character,
  slot: GearSlot
): GearItem | undefined {
  const gearId = character.equippedGear[slot];

  return gearId ? getHeldGearItem(character, gearId) : undefined;
}

export function getEquippedGearBonus(character: Character, stat: Stat): number {
  const gearBonus = (Object.keys(character.equippedGear) as GearSlot[]).reduce((sum, slot) => {
    const item = getEquippedGearItem(character, slot);
    return item && item.statBonus.stat === stat ? sum + item.statBonus.amount : sum;
  }, 0);

  return gearBonus + getCompanionStatBonus(character, stat);
}

export function getCompanionStatBonus(character: Character, stat: Stat): number {
  if (character.id !== RUMI_CHARACTER_ID) {
    return 0;
  }

  const followerIds = new Set((character.followers ?? []).map((follower) => follower.id));

  if (!followerIds.has(MIRA_FOLLOWER_ID)) {
    return 0;
  }

  const miraBonus = MIRA_RUMI_TEAM_BONUS[stat] ?? 0;
  const triadBonus = followerIds.has(ZOEY_FOLLOWER_ID) ? (VIOLET_TRIAD_TEAM_BONUS[stat] ?? 0) : 0;

  return miraBonus + triadBonus;
}
