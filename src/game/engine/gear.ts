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
  return getEquippedGearModifierSources(character, stat).reduce((sum, source) => sum + source.value, 0);
}

export function getCompanionStatBonus(character: Character, stat: Stat): number {
  return getCompanionStatModifierSources(character, stat).reduce((sum, source) => sum + source.value, 0);
}

export interface GearModifierContext {
  mode: "resting" | "battle" | "check";
}

export function isGearModifierActive(item: GearItem, context: GearModifierContext): boolean {
  if (item.effectModel === "consumable") return false;
  return item.effectModel !== "conditional" || (item.conditionType === "battle" && context.mode === "battle");
}

export function getEquippedGearModifierSources(
  character: Character,
  stat: Stat,
  context: GearModifierContext = { mode: "resting" }
): Array<{ label: string; value: number }> {
  const gearSources = (Object.keys(character.equippedGear) as GearSlot[])
    .map((slot) => getEquippedGearItem(character, slot))
    .filter((item): item is GearItem => item !== undefined && item.statBonus.stat === stat && isGearModifierActive(item, context))
    .map((item) => ({
      label: item.name,
      value: item.statBonus.amount
    }));

  return [...gearSources, ...getCompanionStatModifierSources(character, stat)];
}

export function getCompanionStatModifierSources(character: Character, stat: Stat): Array<{ label: string; value: number }> {
  if (character.id !== RUMI_CHARACTER_ID) {
    return [];
  }

  const followerIds = new Set((character.followers ?? []).map((follower) => follower.id));

  if (!followerIds.has(MIRA_FOLLOWER_ID)) {
    return [];
  }

  const sources: Array<{ label: string; value: number }> = [];
  const miraBonus = MIRA_RUMI_TEAM_BONUS[stat] ?? 0;

  if (miraBonus > 0) {
    sources.push({ label: "Mira Rift-Twin", value: miraBonus });
  }

  const triadBonus = followerIds.has(ZOEY_FOLLOWER_ID) ? (VIOLET_TRIAD_TEAM_BONUS[stat] ?? 0) : 0;

  if (triadBonus > 0) {
    sources.push({ label: "Zoey Thorn Violet", value: triadBonus });
  }

  return sources;
}
