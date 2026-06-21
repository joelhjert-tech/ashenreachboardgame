import type { Phase } from "../schema/session.schema.js";

const phaseOrder: Phase[] = [
  "start",
  "navigation",
  "sector",
  "action",
  "resolution",
  "broadcast"
];

export function nextPhase(current: Phase): Phase {
  const index = phaseOrder.indexOf(current);

  if (index === -1) {
    throw new Error(`Unknown phase: ${current}`);
  }

  return phaseOrder[(index + 1) % phaseOrder.length];
}

export function canResolveMovement(phase: Phase): boolean {
  return phase === "navigation";
}

export function canAdvancePhase(from: Phase, to: Phase): boolean {
  return nextPhase(from) === to;
}
