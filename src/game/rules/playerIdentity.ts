export const MAX_PLAYER_DISPLAY_NAME_LENGTH = 8;
export const FORCED_POPELORD_CHARACTER_ID = "char_popelord";

export function normalizeSubmittedDisplayName(value: string): string {
  return value.trim();
}

export function getSubmittedDisplayNameError(value: string): string | null {
  const normalized = normalizeSubmittedDisplayName(value);

  if (normalized.length < 1 || [...normalized].length > MAX_PLAYER_DISPLAY_NAME_LENGTH) {
    return `Name must be 1-${MAX_PLAYER_DISPLAY_NAME_LENGTH} characters.`;
  }

  return null;
}

export function requiresPopelordForDisplayName(value: string): boolean {
  return normalizeSubmittedDisplayName(value).toLocaleLowerCase("en-US").includes("kebab");
}
