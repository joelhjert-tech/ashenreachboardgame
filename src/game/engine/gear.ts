import type { Stat } from "../schema/character.schema.js";
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

interface GearModifierItem {
  id: string;
  name: string;
  slot: GearSlot;
  instanceId?: string;
  statBonus: { stat: Stat; amount: number };
  effectModel?: "permanent" | "conditional" | "consumable" | "exhaust" | "charged";
  conditionType?: "battle";
}

interface GearBearingCharacter<TItem extends GearModifierItem = GearItem> {
  id: string;
  heldGear: TItem[];
  equippedGear: Record<GearSlot, string | null>;
  equippedGearInstances?: Record<GearSlot, string | null>;
  followers?: Array<{ id: string }>;
}

interface StatBearingCharacter<TItem extends GearModifierItem = GearItem> extends GearBearingCharacter<TItem> {
  stats: Record<Stat, number>;
  statUpgrades?: Partial<Record<Stat, number>>;
}

export type CharacterStatSourceType =
  | "base"
  | "upgrade"
  | "equipped"
  | "companion"
  | "temporary"
  | "scar"
  | "affliction";

export interface CharacterStatModifierSource {
  sourceType: CharacterStatSourceType;
  label: string;
  value: number;
  catalogId?: string;
  instanceId?: string;
  scope?: "resting" | "battle" | "check" | "test" | "battle/check";
}

export interface CharacterStatBreakdown {
  base: number;
  upgrades: number;
  equipped: CharacterStatModifierSource[];
  companions: CharacterStatModifierSource[];
  contextual: CharacterStatModifierSource[];
  final: number;
}

export interface CharacterStatBreakdownOptions extends GearModifierContext {
  contextualSources?: CharacterStatModifierSource[];
}

export function getHeldGearItem<TItem extends GearModifierItem>(character: GearBearingCharacter<TItem>, gearId: string): TItem | undefined {
  return character.heldGear.find((item) => item.id === gearId);
}

export function getHeldGearInstance<TItem extends GearModifierItem>(character: GearBearingCharacter<TItem>, instanceId: string): TItem | undefined {
  return character.heldGear.find((item) => item.instanceId === instanceId);
}

export function getEquippedGearItem<TItem extends GearModifierItem>(
  character: GearBearingCharacter<TItem>,
  slot: GearSlot
): TItem | undefined {
  const instanceId = character.equippedGearInstances?.[slot];
  if (instanceId) return getHeldGearInstance(character, instanceId);
  const gearId = character.equippedGear[slot];

  return gearId ? getHeldGearItem(character, gearId) : undefined;
}

export function getEquippedGearBonus<TItem extends GearModifierItem>(character: GearBearingCharacter<TItem>, stat: Stat): number {
  return getEquippedGearModifierSources(character, stat).reduce((sum, source) => sum + source.value, 0);
}

export function getCompanionStatBonus(character: Pick<GearBearingCharacter, "id" | "followers">, stat: Stat): number {
  return getCompanionStatModifierSources(character, stat).reduce((sum, source) => sum + source.value, 0);
}

export interface GearModifierContext {
  mode: "resting" | "battle" | "check";
  suppressedInstanceIds?: ReadonlySet<string>;
}

export function isGearModifierActive(item: GearModifierItem, context: GearModifierContext): boolean {
  if (item.effectModel === "consumable") return false;
  return item.effectModel !== "conditional" || (item.conditionType === "battle" && context.mode === "battle");
}

export function getEquippedGearModifierSources<TItem extends GearModifierItem>(
  character: GearBearingCharacter<TItem>,
  stat: Stat,
  context: GearModifierContext = { mode: "resting" }
): Array<{ label: string; value: number }> {
  const gearSources = (Object.keys(character.equippedGear) as GearSlot[])
    .map((slot) => getEquippedGearItem(character, slot))
    .filter((item): item is TItem => item !== undefined && !context.suppressedInstanceIds?.has(item.instanceId ?? "") && item.statBonus.stat === stat && isGearModifierActive(item, context))
    .map((item) => ({
      label: item.name,
      value: item.statBonus.amount
    }));

  return [...gearSources, ...getCompanionStatModifierSources(character, stat)];
}

export function getCompanionStatModifierSources(character: Pick<GearBearingCharacter, "id" | "followers">, stat: Stat): Array<{ label: string; value: number }> {
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

export function getCharacterStatBreakdown<TItem extends GearModifierItem>(
  character: StatBearingCharacter<TItem>,
  stat: Stat,
  options: CharacterStatBreakdownOptions = { mode: "resting" }
): CharacterStatBreakdown {
  const upgrades = character.statUpgrades?.[stat] ?? 0;
  const base = Math.max(0, character.stats[stat] - upgrades);
  const equippedItems = (Object.keys(character.equippedGear) as GearSlot[])
    .map((slot) => getEquippedGearItem(character, slot))
    .filter((item): item is TItem => item !== undefined);
  const equipped = equippedItems
    .filter((item) =>
      !options.suppressedInstanceIds?.has(item.instanceId ?? "") &&
      item.statBonus.stat === stat &&
      isGearModifierActive(item, options)
    )
    .map<CharacterStatModifierSource>((item) => ({
      sourceType: "equipped",
      label: item.name,
      value: item.statBonus.amount,
      catalogId: item.id,
      instanceId: item.instanceId,
      scope: options.mode
    }));
  const companions = getCompanionStatModifierSources(character, stat).map<CharacterStatModifierSource>((source) => ({
    sourceType: "companion",
    label: source.label,
      value: source.value,
      scope: options.mode
    }));
  const conditionalEquipment = options.mode === "resting"
    ? equippedItems
        .filter((item) =>
          !options.suppressedInstanceIds?.has(item.instanceId ?? "") &&
          item.statBonus.stat === stat &&
          item.effectModel === "conditional" &&
          item.conditionType === "battle"
        )
        .map<CharacterStatModifierSource>((item) => ({
          sourceType: "equipped",
          label: item.name,
          value: item.statBonus.amount,
          catalogId: item.id,
          instanceId: item.instanceId,
          scope: "battle"
        }))
    : [];
  const contextual = [...conditionalEquipment, ...(options.contextualSources ?? [])];

  return {
    base,
    upgrades,
    equipped,
    companions,
    contextual,
    final:
      character.stats[stat] +
      equipped.reduce((sum, source) => sum + source.value, 0) +
      companions.reduce((sum, source) => sum + source.value, 0)
  };
}
