export const CANONICAL_THREAT_EFFECT_KEYS = [
  "threat_escalate_on_reveal",
  "threat_force_immediate_check",
  "threat_force_immediate_combat",
  "threat_attach_to_space",
  "threat_attach_to_player",
  "threat_lock_space_until_defeated",
  "threat_combat_plus_one_if_player_has_scar",
  "threat_combat_plus_two_if_inner_region",
  "threat_disable_weapon_bonus",
  "threat_disable_armor_bonus",
  "threat_enemy_plus_two",
  "threat_force_enemy_roll_advantage",
  "threat_player_roll_disadvantage",
  "threat_block_rerolls",
  "threat_ignore_first_success",
  "threat_fail_take_wound",
  "threat_fail_take_two_wounds",
  "threat_fail_gain_scar",
  "threat_fail_drop_gear",
  "threat_fail_drop_artifact",
  "threat_fail_retreat_one_space",
  "threat_fail_escalate",
  "threat_defeat_gain_trophy",
  "threat_defeat_gain_two_trophies",
  "threat_defeat_gain_salvage",
  "threat_defeat_gain_gear",
  "threat_defeat_gain_artifact",
  "threat_defeat_heal_wound",
  "threat_defeat_advance_contract",
  "threat_defeat_advance_scenario",
  "threat_defeat_remove_space_lock",
  "threat_scale_damage_by_escalation",
  "threat_scale_difficulty_by_escalation"
] as const;

export type CanonicalThreatEffectKey = (typeof CANONICAL_THREAT_EFFECT_KEYS)[number];

export const LEGACY_HEAT_THREAT_EFFECT_KEYS = [
  "threat_heat_on_reveal",
  "threat_all_heat_on_reveal",
  "threat_force_choose_heat_or_wound",
  "threat_force_discard_gear_or_gain_heat",
  "threat_combat_plus_one_if_player_has_heat",
  "threat_pay_heat_or_enemy_plus_two",
  "threat_fail_gain_heat",
  "threat_fail_gain_two_heat",
  "threat_fail_wound_and_heat",
  "threat_defeat_reduce_heat"
] as const;

export type LegacyHeatThreatEffectKey = (typeof LEGACY_HEAT_THREAT_EFFECT_KEYS)[number];
export type LegacyCompatibleThreatEffectKey = CanonicalThreatEffectKey | LegacyHeatThreatEffectKey;

const LEGACY_THREAT_EFFECT_ALIASES: Record<
  LegacyHeatThreatEffectKey,
  CanonicalThreatEffectKey | null
> = {
  threat_heat_on_reveal: null,
  threat_all_heat_on_reveal: null,
  threat_force_choose_heat_or_wound: null,
  threat_force_discard_gear_or_gain_heat: null,
  threat_combat_plus_one_if_player_has_heat: "threat_combat_plus_one_if_player_has_scar",
  threat_pay_heat_or_enemy_plus_two: "threat_enemy_plus_two",
  threat_fail_gain_heat: null,
  threat_fail_gain_two_heat: null,
  threat_fail_wound_and_heat: "threat_fail_take_wound",
  threat_defeat_reduce_heat: null
};

const canonicalKeys = new Set<string>(CANONICAL_THREAT_EFFECT_KEYS);
const legacyKeys = new Set<string>(LEGACY_HEAT_THREAT_EFFECT_KEYS);

export function isCanonicalThreatEffectKey(value: string): value is CanonicalThreatEffectKey {
  return canonicalKeys.has(value);
}

export function isLegacyCompatibleThreatEffectKey(
  value: string
): value is LegacyCompatibleThreatEffectKey {
  return canonicalKeys.has(value) || legacyKeys.has(value);
}

export function normalizeLegacyThreatEffectKey(
  value: LegacyCompatibleThreatEffectKey
): CanonicalThreatEffectKey | null {
  if (isCanonicalThreatEffectKey(value)) return value;
  return LEGACY_THREAT_EFFECT_ALIASES[value];
}
