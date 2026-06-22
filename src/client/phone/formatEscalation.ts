type EscalationShape = {
  escalationLevel?: number | null;
  escalationThreshold?: number | null;
  escalationModifier?: number | null;
};

export function formatEscalation(patch: EscalationShape | null): string {
  if (!patch) {
    return "Escalation 0/6 | +0";
  }

  const level = patch.escalationLevel ?? 0;
  const threshold = patch.escalationThreshold ?? 6;
  const modifier = patch.escalationModifier ?? 0;

  return `Escalation ${level}/${threshold} | +${modifier}`;
}
