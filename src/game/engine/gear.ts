import type { Character, Stat } from "../schema/character.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";

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
  return (Object.keys(character.equippedGear) as GearSlot[]).reduce((sum, slot) => {
    const item = getEquippedGearItem(character, slot);
    return item && item.statBonus.stat === stat ? sum + item.statBonus.amount : sum;
  }, 0);
}
