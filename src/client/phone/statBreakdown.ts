import type { PhoneSelfState, Stat } from "../shared/types.js";
import {
  getCharacterStatBreakdown,
  type CharacterStatModifierSource
} from "../../game/engine/gear.js";
import { getAfflictionStatSources } from "./afflictionPresentation.js";

export interface PhoneStatBreakdown {
  current: number;
  base: number;
  upgrades: number;
  equipped: number;
  companion: number;
  temporaryStatus: number;
  final: number;
  equippedSources: CharacterStatModifierSource[];
  companionSources: CharacterStatModifierSource[];
  contextualSources: CharacterStatModifierSource[];
  scarAfflictionSources: Array<{
    label: string;
    value: number;
    scope: "test" | "battle";
  }>;
  /** @deprecated Use upgrades. */
  permanent: number;
  /** @deprecated Use equipped and companion separately. */
  gearFollower: number;
  /** @deprecated Use equippedSources and companionSources separately. */
  gearFollowerSources: Array<{
    label: string;
    value: number;
    sourceType: "gear" | "follower";
  }>;
}

export interface PhoneStatBreakdownOptions {
  suppressedInstanceIds?: ReadonlySet<string>;
}

export function getPhoneStatBreakdown(
  self: PhoneSelfState,
  stat: Stat,
  options: PhoneStatBreakdownOptions = {}
): PhoneStatBreakdown {
  const scarAfflictionSources = getAfflictionStatSources(self.character.afflictions?.faceup ?? [], stat);
  const contextualSources: CharacterStatModifierSource[] = [
    ...scarAfflictionSources.map<CharacterStatModifierSource>((source) => ({
      sourceType: "affliction",
      label: source.label,
      value: source.value,
      scope: source.scope
    })),
    ...((self.character.temporaryAllStatBoost?.remainingEligibleResolutions ?? 0) > 0
      ? [{
          sourceType: "temporary" as const,
          label: "Too Many Dogs",
          value: self.character.temporaryAllStatBoost!.value,
          scope: "battle/check" as const
        }]
      : [])
  ];
  const shared = getCharacterStatBreakdown(self.character, stat, {
    mode: "resting",
    suppressedInstanceIds: options.suppressedInstanceIds,
    contextualSources
  });
  const equipped = shared.equipped.reduce((sum, source) => sum + source.value, 0);
  const companion = shared.companions.reduce((sum, source) => sum + source.value, 0);
  const temporaryStatus = shared.contextual.reduce((sum, source) => sum + source.value, 0);
  const gearFollowerSources = [
    ...shared.equipped.map((source) => ({ label: source.label, value: source.value, sourceType: "gear" as const })),
    ...shared.companions.map((source) => ({ label: source.label, value: source.value, sourceType: "follower" as const }))
  ];

  return {
    current: self.character.stats[stat],
    base: shared.base,
    upgrades: shared.upgrades,
    equipped,
    companion,
    temporaryStatus,
    final: shared.final,
    equippedSources: shared.equipped,
    companionSources: shared.companions,
    contextualSources: shared.contextual,
    gearFollowerSources,
    scarAfflictionSources,
    permanent: shared.upgrades,
    gearFollower: equipped + companion
  };
}

export function formatSignedStatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
