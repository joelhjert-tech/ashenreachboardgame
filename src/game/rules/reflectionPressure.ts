import type { GameState } from "../schema/session.schema.js";

/** Mirror's confrontation cutoff, independent of retired character Heat. */
export function getReflectionPressureThreshold(
  state: Pick<GameState, "reflectionPressureThreshold">
): number {
  return state.reflectionPressureThreshold;
}
