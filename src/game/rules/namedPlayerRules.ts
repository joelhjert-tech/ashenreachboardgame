export const NAMED_PLAYER_POPELORD_ID = "char_popelord";
export const NAMED_PLAYER_QA_CHARACTER_ID = "char_master_alpha";
export const NAMED_PLAYER_FANDIABLOS_ID = "fandiablos";
export const CW_ENEMY_DIFFICULTY_MODIFIER = 1;
export const CW_ENEMY_MODIFIER_LABEL = "Marked adversary";

export interface NamedPlayerIdentity {
  displayName?: string | null;
  nickname?: string | null;
}

export interface NamedPlayerRuleProfile {
  normalizedName: string;
  normalizedNickname: string;
  enemyDifficultyModifier: number;
  forcedCharacterId: string | null;
  allowedRestrictedCharacterIds: string[];
  requiredFollowerIds: string[];
}

export interface NamedCharacterEligibility {
  allowed: boolean;
  reason: string | null;
}

export function normalizePlayerRuleName(value: string | null | undefined): string {
  return (value ?? "").trim().normalize("NFKC").toLowerCase();
}

function matchedRuleNames(identity: NamedPlayerIdentity): Set<string> {
  return new Set([
    normalizePlayerRuleName(identity.displayName),
    normalizePlayerRuleName(identity.nickname)
  ].filter(Boolean));
}

export function resolveNamedPlayerRules(identity: NamedPlayerIdentity): NamedPlayerRuleProfile {
  const normalizedName = normalizePlayerRuleName(identity.displayName);
  const normalizedNickname = normalizePlayerRuleName(identity.nickname);
  const matches = matchedRuleNames(identity);

  return {
    normalizedName,
    normalizedNickname,
    enemyDifficultyModifier: matches.has("cw") ? CW_ENEMY_DIFFICULTY_MODIFIER : 0,
    forcedCharacterId: matches.has("kebab") ? NAMED_PLAYER_POPELORD_ID : null,
    allowedRestrictedCharacterIds: matches.has("joel") ? [NAMED_PLAYER_QA_CHARACTER_ID] : [],
    requiredFollowerIds: matches.has("annette") || matches.has("nenne") ? [NAMED_PLAYER_FANDIABLOS_ID] : []
  };
}

export function canNamedPlayerSelectCharacter(
  identity: NamedPlayerIdentity,
  character: { id: string; qaOnly?: boolean },
  options: { popelordReservedForOther?: boolean } = {}
): NamedCharacterEligibility {
  const profile = resolveNamedPlayerRules(identity);

  if (profile.forcedCharacterId && character.id !== profile.forcedCharacterId) {
    return { allowed: false, reason: "Popelord is required for this player." };
  }
  if (character.id === NAMED_PLAYER_POPELORD_ID && options.popelordReservedForOther) {
    return { allowed: false, reason: "Popelord is reserved for another player." };
  }
  if (character.qaOnly && !profile.allowedRestrictedCharacterIds.includes(character.id)) {
    return { allowed: false, reason: "This operative is restricted to developer testing." };
  }
  return { allowed: true, reason: null };
}

export function requiresBoundFandiablos(identity: NamedPlayerIdentity): boolean {
  return resolveNamedPlayerRules(identity).requiredFollowerIds.includes(NAMED_PLAYER_FANDIABLOS_ID);
}

export function getNamedPlayerEnemyModifier(identity: NamedPlayerIdentity): number {
  return resolveNamedPlayerRules(identity).enemyDifficultyModifier;
}

export function getNamedPlayerFollowerInstanceId(seatId: string, followerId: string): string {
  return `named-player:${seatId}:${followerId}`;
}
