import type { ActiveResolution, OutcomeSummary, Stat } from "./types.js";

export const resolutionStageLabel: Record<ActiveResolution["stage"], string> = {
  idle: "Idle",
  card_reveal: "Card reveal",
  battle_setup: "Battle setup",
  dice_roll: "Dice roll",
  roll_result: "Roll result",
  outcome_summary: "Outcome",
  awaiting_continue: "Awaiting continue"
};

export function formatResolutionModifiers(modifiers: Array<{ label: string; value: number }>): string {
  if (modifiers.length === 0) {
    return "No modifiers";
  }

  return modifiers.map((modifier) => `${modifier.label} ${modifier.value >= 0 ? "+" : ""}${modifier.value}`).join(", ");
}

export function describeActiveResolutionRoll(resolution: ActiveResolution): string | null {
  if (!resolution.roll) {
    return null;
  }

  const dice = resolution.roll.dice.join(" + ");
  const modifier = resolution.roll.modifierTotal;
  return `Roll: ${dice} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${resolution.roll.finalTotal}`;
}

export function activeResolutionToOutcomeSummary(
  resolution: ActiveResolution,
  movedToSectorId = "active"
): OutcomeSummary | null {
  if (!resolution.roll || resolution.roll.dice.length < 2) {
    return null;
  }

  return {
    seatId: resolution.playerId,
    movedToSectorId,
    encounterCardId: resolution.card?.id ?? null,
    encounterTitle: resolution.card?.title ?? resolution.battle?.enemyName ?? null,
    encounterCardType:
      resolution.card?.type === "enemy" || resolution.card?.type === "hazard" ? resolution.card.type : null,
    checkStat: resolution.battle?.stat ?? null,
    die1: resolution.roll.dice[0] ?? null,
    die2: resolution.roll.dice[1] ?? null,
    statBonus: resolution.roll.modifierTotal,
    checkTotal: resolution.roll.finalTotal,
    difficulty: resolution.roll.target,
    enemyRollerSeatId: null,
    enemyDie1: null,
    enemyDie2: null,
    enemyBonus: null,
    enemyTotal: null,
    success: resolution.roll.success,
    summary: resolution.outcome?.text ?? resolution.outcome?.title ?? "Resolution roll recorded."
  };
}

export function getResolutionStatLabel(stat: Stat | undefined, labels: Record<Stat, string>): string {
  return stat ? labels[stat] : "Stat";
}
