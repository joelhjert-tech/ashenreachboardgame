import { getEquippedGearItem } from "../../game/engine/gear.js";
import { statLabelById, statOrder, gearSlotLabelById } from "./statLabels.js";
import type { GearItem, PhoneSelfState } from "./types.js";

export function describeEquipmentComparison(item: GearItem, character: Pick<PhoneSelfState["character"], "id" | "heldGear" | "equippedGear" | "equippedGearInstances">): string {
  const current = getEquippedGearItem(character, item.slot);
  const slot = gearSlotLabelById[item.slot];
  const comparison = current ? `Currently equipped: ${current.name}.` : `${slot} slot is empty.`;
  const permanent = (gear: GearItem) => !gear.effectModel || gear.effectModel === "permanent";
  if (!permanent(item) || (current && !permanent(current))) {
    return `${comparison} If equipped: ${item.activeText ?? "See item effect."}${current ? ` Replaces: ${current.activeText ?? current.name}` : ""}`;
  }
  const changes = statOrder.flatMap((stat) => {
    const delta = (item.statBonus.stat === stat ? item.statBonus.amount : 0)
      - (current?.statBonus.stat === stat ? current.statBonus.amount : 0);
    return delta ? [`${statLabelById[stat]} ${delta > 0 ? "+" : ""}${delta}`] : [];
  });
  return `${comparison} If equipped: ${changes.length ? `equipment bonus change ${changes.join(", ")}` : "no equipment bonus change"}.`;
}
