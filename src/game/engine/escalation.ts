export const ESCALATION_COLLAPSE_LEVEL = 6;

export function getEscalationModifier(level: number): number {
  return Math.floor(Math.max(0, level) / 2);
}
