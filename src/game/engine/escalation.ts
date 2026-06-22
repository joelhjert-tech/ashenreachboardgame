import type { SessionMode } from "../schema/session.schema.js";

export const ESCALATION_COLLAPSE_LEVELS: Record<SessionMode, number> = {
  "single-player": 8,
  multiplayer: 6
};

export function getEscalationCollapseLevel(sessionMode: SessionMode): number {
  return ESCALATION_COLLAPSE_LEVELS[sessionMode];
}

export function getEscalationModifier(level: number): number {
  return Math.floor(Math.max(0, level) / 2);
}
