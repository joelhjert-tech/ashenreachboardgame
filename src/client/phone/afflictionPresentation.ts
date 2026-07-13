import type { AfflictionSummary, Stat } from "../shared/types.js";
import { statLabelById } from "../shared/statLabels.js";

export interface AfflictionStatSourceSummary {
  label: string;
  value: number;
  scope: "test" | "battle";
}

function formatSignedValue(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getAfflictionStatusLabel(affliction: AfflictionSummary): string {
  if (!affliction.isFaceupOngoing) {
    return "Immediate resolved";
  }

  if (affliction.duration === "ongoing") {
    return "Ongoing";
  }

  return toTitleCase(affliction.duration);
}

export function getAfflictionEffectChips(affliction: AfflictionSummary): string[] {
  const payload = affliction.effectPayload ?? {};
  const chips: string[] = [];

  if (payload.cannotUseArmor) {
    chips.push("Blocks armor");
  }

  if (payload.cannotUseWeapons) {
    chips.push("Blocks weapons");
  }

  if (payload.cannotEvadeEnemies) {
    chips.push("Cannot evade");
  } else if (payload.canEvadeEnemies) {
    chips.push("May evade");
  }

  if (payload.stat && typeof payload.amount === "number") {
    const floor = typeof payload.floor === "number" ? `, minimum ${payload.floor}` : "";
    chips.push(`${statLabelById[payload.stat]} ${formatSignedValue(payload.amount)} tests${floor}`);
  }

  if (typeof payload.innateBattleBonus === "number") {
    chips.push(`Battle ${formatSignedValue(payload.innateBattleBonus)}`);
  }

  if (typeof payload.assetLimitModifier === "number") {
    chips.push(`Gear limit ${formatSignedValue(payload.assetLimitModifier)}`);
  }

  if (typeof payload.powerLimitModifier === "number") {
    chips.push(`Power limit ${formatSignedValue(payload.powerLimitModifier)}`);
  }

  if (typeof payload.battleWeaponSlotModifier === "number") {
    chips.push(`Weapon slots ${formatSignedValue(payload.battleWeaponSlotModifier)}`);
  }

  if (typeof payload.heal === "number") {
    chips.push(`Heal ${payload.heal}`);
  }

  if (typeof payload.wound === "number") {
    chips.push(`Wound ${payload.wound}`);
  }

  if (typeof payload.drawAffliction === "number") {
    chips.push(`Draw ${payload.drawAffliction} Affliction`);
  }

  if (payload.preventWoundOn?.length) {
    chips.push(`Prevents wound on ${payload.preventWoundOn.join("/")}`);
  }

  return chips;
}

export function getAfflictionStatSources(
  afflictions: AfflictionSummary[],
  stat: Stat
): AfflictionStatSourceSummary[] {
  return afflictions.flatMap<AfflictionStatSourceSummary>((affliction) => {
    const payload = affliction.effectPayload ?? {};

    if (affliction.effectKind === "testModifier" && payload.stat === stat && typeof payload.amount === "number") {
      return [
        {
          label: affliction.name,
          value: payload.amount,
          scope: "test" as const
        }
      ];
    }

    if (affliction.effectKind === "battleBonus" && typeof payload.innateBattleBonus === "number") {
      return [
        {
          label: affliction.name,
          value: payload.innateBattleBonus,
          scope: "battle" as const
        }
      ];
    }

    return [];
  });
}
