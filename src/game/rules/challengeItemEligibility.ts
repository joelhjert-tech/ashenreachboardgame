import { getEquippedGearItem } from "../engine/gear.js";
import type { Stat } from "../schema/character.schema.js";
import type { GearItem, GearTimingWindow } from "../schema/gear.schema.js";
import type { GameState } from "../schema/session.schema.js";

export type ChallengeItemEligibility = {
  challengeLinked: boolean;
  eligible: boolean;
  testedSkill: Stat | null;
  timingWindow: GearTimingWindow | null;
  disabledReason: string | null;
};

const CHALLENGE_TIMINGS = new Set<GearTimingWindow>([
  "beforeBattleRoll",
  "beforeAnomalySignalTest",
  "afterFailedTest"
]);

const SKILL_LABELS: Record<Stat, string> = {
  command: "Command",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

function getDeclaredChallengeTimings(item: GearItem): GearTimingWindow[] {
  return [...new Set([...(item.activationTiming ?? []), ...(item.timingWindows ?? [])])]
    .filter((timing) => CHALLENGE_TIMINGS.has(timing));
}

function getCurrentTiming(state: GameState, seatId: string, item: GearItem): {
  timingWindow: GearTimingWindow | null;
  testedSkill: Stat | null;
} {
  const timings = getDeclaredChallengeTimings(item);
  const encounter = state.currentEncounter;
  const resolution = state.activeResolution?.playerId === seatId ? state.activeResolution : null;

  if (
    timings.includes("beforeBattleRoll") &&
    state.phase === "action" &&
    encounter?.cardType === "enemy" &&
    state.turnOrder[state.activeSeatIndex] === seatId &&
    !state.pendingEnemyRoll &&
    !resolution?.roll
  ) {
    return { timingWindow: "beforeBattleRoll", testedSkill: encounter.stat };
  }

  const tile = state.pendingTileChallenge;
  if (
    timings.includes("beforeAnomalySignalTest") &&
    tile?.seatId === seatId &&
    tile.challengeType === "anomaly" &&
    tile.testStat === "signal" &&
    !tile.rolled
  ) {
    return { timingWindow: "beforeAnomalySignalTest", testedSkill: tile.testStat };
  }

  if (
    timings.includes("afterFailedTest") &&
    state.phase === "resolution" &&
    (
      state.pendingFailureReaction?.seatId === seatId ||
      (state.pendingStaticIntercessionReaction?.seatId === seatId && state.pendingStaticIntercessionReaction.selectedEffectId === null)
    ) &&
    resolution?.roll?.success === false
  ) {
    const projectedStat = resolution?.battle?.stat
      ?? state.pendingTileChallenge?.testStat
      ?? state.currentEncounter?.stat
      ?? state.lastOutcomeSummary?.checkStat;
    const testedSkill = projectedStat && projectedStat in SKILL_LABELS ? projectedStat as Stat : null;
    return { timingWindow: "afterFailedTest", testedSkill };
  }

  return { timingWindow: null, testedSkill: null };
}

export function getChallengeItemEligibility(
  state: GameState,
  seatId: string,
  item: GearItem
): ChallengeItemEligibility {
  const timings = getDeclaredChallengeTimings(item);
  if (timings.length === 0 || item.chargedEffect === "bonewayDetour") {
    return { challengeLinked: false, eligible: false, testedSkill: null, timingWindow: null, disabledReason: null };
  }

  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) {
    return { challengeLinked: true, eligible: false, testedSkill: null, timingWindow: null, disabledReason: "Owner is unavailable." };
  }

  const current = getCurrentTiming(state, seatId, item);
  if (!current.timingWindow) {
    return {
      challengeLinked: true,
      eligible: false,
      testedSkill: null,
      timingWindow: null,
      disabledReason: timings.includes("beforeBattleRoll")
        ? "Available before an eligible battle roll."
        : timings.includes("beforeAnomalySignalTest")
          ? "Available before an Anomaly Signal test."
          : "Unavailable: the eligible failed-test reaction window is closed."
    };
  }

  const equippedItem = getEquippedGearItem(player.character, item.slot);
  const exactEquipped = item.instanceId ? equippedItem?.instanceId === item.instanceId : equippedItem?.id === item.id;
  if (item.requiresEquipped && !exactEquipped) {
    return { ...current, challengeLinked: true, eligible: false, disabledReason: `${item.name} must be equipped.` };
  }

  if (
    current.testedSkill &&
    item.eligibleTestScope !== "anySkill" &&
    !item.eligibleSkills?.includes(current.testedSkill)
  ) {
    const required = (item.eligibleSkills ?? []).map((stat) => SKILL_LABELS[stat]).join(" or ") || "another skill";
    return {
      ...current,
      challengeLinked: true,
      eligible: false,
      disabledReason: `Requires a ${required} test. Current test: ${SKILL_LABELS[current.testedSkill]}.`
    };
  }

  if (item.effectModel === "exhaust" && item.exhausted) {
    return { ...current, challengeLinked: true, eligible: false, disabledReason: `${item.name} is Exhausted.` };
  }

  if (item.useLimit === "charge" && (item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) < (item.chargeCost ?? 1)) {
    return { ...current, challengeLinked: true, eligible: false, disabledReason: `${item.name} has no charges remaining.` };
  }

  return { ...current, challengeLinked: true, eligible: true, disabledReason: null };
}
