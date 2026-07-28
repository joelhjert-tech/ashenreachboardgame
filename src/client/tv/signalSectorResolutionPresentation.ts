import { statLabelById } from "../shared/statLabels.js";
import type {
  BattlePresentation,
  BattlePresentationStage,
  BattleSidePresentation,
  PublicPatchPayload,
  PublicTileChallenge,
  Stat
} from "../shared/types.js";

export type SignalSectorResolutionMode = "battle" | "tile-challenge" | "sector-test";
export type SignalSectorResolutionTone = "neutral" | "success" | "failure" | "draw";

export interface SignalSectorResolutionSide {
  name: string;
  secondaryName: string | null;
  baseValue: number | null;
  modifiers: Array<{ label: string; value: number }>;
  rawDice: number[];
  diceTotal: number | null;
  finalTotal: number | null;
}

export interface SignalSectorResolutionModel {
  id: string;
  revision: number;
  stage: BattlePresentationStage;
  mode: SignalSectorResolutionMode;
  tone: SignalSectorResolutionTone;
  actorSeatId: string | null;
  actorDisplayName: string;
  locationName: string;
  title: string;
  eyebrow: string;
  publicSummary: string;
  stat: Stat;
  statLabel: string;
  operative: SignalSectorResolutionSide;
  operativeImageKey: string | null;
  opposition: SignalSectorResolutionSide;
  oppositionImageKey: string | null;
  oppositionArtKind: "threat" | "nemesis" | null;
  oppositionFixed: boolean;
  outcomeLabel: "SUCCESS" | "FAILURE" | "DRAW" | "RESOLVING";
  outcomeCopy: string;
  publicConsequence: string | null;
  publicReward: string | null;
  waitingCopy: string | null;
  restored: boolean;
  sequence: string[];
  activeSequenceIndex: number;
}

function findTileChallenge(payload: PublicPatchPayload): PublicTileChallenge | null {
  const pending = payload.pendingTileChallenge;
  const presentation = payload.battlePresentation;
  const challenges = payload.sectors.flatMap((sector) => sector.tileChallenges ?? []);

  if (pending) {
    return challenges.find((challenge) => challenge.id === pending.challengeId) ?? null;
  }

  const imageKey = presentation?.encounter.imageKey ?? null;
  const encounterName = presentation?.encounter.name ?? null;
  return challenges.find((challenge) =>
    challenge.artCardId === imageKey || challenge.name === encounterName
  ) ?? null;
}

function normalizeSide(
  side: BattleSidePresentation | null | undefined,
  fallback: {
    name: string;
    secondaryName?: string | null;
    baseValue?: number | null;
    finalTotal?: number | null;
  }
): SignalSectorResolutionSide {
  return {
    name: side?.name ?? fallback.name,
    secondaryName: side?.secondaryName ?? fallback.secondaryName ?? null,
    baseValue: side?.baseValue ?? fallback.baseValue ?? null,
    modifiers: side?.modifiers.map(({ label, value }) => ({ label, value })) ?? [],
    rawDice: side?.rawDice ?? [],
    diceTotal: side?.diceTotal ?? null,
    finalTotal: side?.finalTotal ?? fallback.finalTotal ?? null
  };
}

function sequenceIndex(stage: BattlePresentationStage, outcomeVisible: boolean): number {
  if (outcomeVisible || ["result", "consequence_required", "reward_required", "complete"].includes(stage)) return 3;
  if (stage === "resolving") return 2;
  if (["roll_submitting", "rolling", "reaction_available"].includes(stage)) return 1;
  return 0;
}

function waitingCopy(waiting: BattlePresentation["waiting"]): string | null {
  if (!waiting) return null;
  return waiting.privateDecision
    ? `Awaiting ${waiting.actorDisplayName}'s private decision.`
    : `${waiting.actorDisplayName} is resolving ${waiting.publicAction}.`;
}

function challengeCategoryLabel(
  presentation: BattlePresentation | null,
  challenge: PublicTileChallenge | null,
  pending: PublicPatchPayload["pendingTileChallenge"]
): "Hazard" | "Anomaly" | "Challenge" {
  const projectedCategory = presentation?.encounter.category.trim().toLowerCase();
  const challengeType = challenge?.challengeType ?? pending?.challengeType ?? null;

  if (projectedCategory === "hazard" || challengeType === "hazard") return "Hazard";
  if (projectedCategory === "anomaly" || challengeType === "anomaly") return "Anomaly";
  return "Challenge";
}

export function buildSignalSectorResolutionModel(
  payload: PublicPatchPayload
): SignalSectorResolutionModel | null {
  const presentation = payload.battlePresentation ?? null;
  const pending = payload.pendingTileChallenge ?? null;
  const challenge = findTileChallenge(payload);

  if (!presentation && !pending) return null;

  const opposed = presentation?.test.opposed ?? false;
  const tileChallenge = Boolean(
    pending
    || payload.activeResolution?.origin?.sourceDeck === "tile-challenge"
    || (challenge && !opposed)
  );
  const mode: SignalSectorResolutionMode = opposed
    ? "battle"
    : tileChallenge
      ? "tile-challenge"
      : "sector-test";
  const categoryLabel = challengeCategoryLabel(presentation, challenge, pending);
  const actorSeatId = presentation?.actorSeatId ?? pending?.seatId ?? null;
  const actorPlayer = actorSeatId
    ? payload.players.find((player) => player.seatId === actorSeatId) ?? null
    : null;
  const actorDisplayName =
    presentation?.actorDisplayName
    ?? payload.seats.find((seat) => seat.seatId === actorSeatId)?.displayName
    ?? actorPlayer?.character.name
    ?? "Active operative";
  const locationName =
    payload.sectors.find((sector) => sector.id === actorPlayer?.sectorId)?.name
    ?? "Unknown sector";
  const title = challenge?.name ?? presentation?.encounter.name ?? "Sector trial";
  const stat = presentation?.test.stat ?? pending?.testStat ?? "grit";
  const stage = presentation?.stage ?? (pending?.rolled ? "resolving" : "battle_ready");
  const outcome = presentation?.outcome ?? null;
  const tone: SignalSectorResolutionTone =
    outcome === "success" ? "success" : outcome === "failure" ? "failure" : outcome === "draw" ? "draw" : "neutral";
  const outcomeLabel =
    outcome === "success" ? "SUCCESS" : outcome === "failure" ? "FAILURE" : outcome === "draw" ? "DRAW" : "RESOLVING";
  const challengeResultCopy =
    outcome === "success"
      ? challenge?.successSummary ?? null
      : outcome === "failure"
        ? challenge?.failureSummary ?? null
        : null;
  const waitCopy = waitingCopy(presentation?.waiting ?? null);
  const publicConsequence = presentation?.publicConsequence ?? challengeResultCopy;
  const publicReward = presentation?.publicRewardSummary ?? null;
  const outcomeCopy =
    publicReward
    ?? publicConsequence
    ?? waitCopy
    ?? (outcome ? `${actorDisplayName}: ${outcome}.` : `${actorDisplayName} is resolving ${statLabelById[stat]}.`);
  const oppositionDifficulty =
    presentation?.opponent.finalTotal
    ?? presentation?.opponent.baseValue
    ?? pending?.difficulty
    ?? null;
  const sequence = mode === "battle"
    ? ["Engage", "Dice", "Calculation", "Result"]
    : [categoryLabel, "Test", "Totals", "Result"];
  const opposition = normalizeSide(presentation?.opponent, {
    name: title,
    secondaryName: mode === "battle" ? "Opposition" : categoryLabel,
    baseValue: oppositionDifficulty,
    finalTotal: oppositionDifficulty
  });

  return {
    id: presentation?.id ?? `tile-challenge:${pending?.challengeId ?? title}:${actorSeatId ?? "table"}`,
    revision: presentation?.revision ?? 0,
    stage,
    mode,
    tone,
    actorSeatId,
    actorDisplayName,
    locationName,
    title,
    eyebrow: mode === "battle"
      ? "Hostile contact"
      : mode === "tile-challenge"
        ? `Recurring ${categoryLabel.toLowerCase()} challenge`
        : `${categoryLabel} trial`,
    publicSummary:
      challenge?.lore
      ?? presentation?.encounter.publicSummary
      ?? (mode === "battle" ? "The operative faces public opposition." : "The sector itself is the opposition."),
    stat,
    statLabel: statLabelById[stat],
    operative: normalizeSide(presentation?.operative, {
      name: actorDisplayName,
      secondaryName: actorPlayer?.character.name ?? null
    }),
    operativeImageKey: actorPlayer?.character.id ?? null,
    opposition: mode === "battle"
      ? opposition
      : { ...opposition, secondaryName: categoryLabel },
    oppositionImageKey:
      challenge?.artCardId
      ?? presentation?.opponent.imageKey
      ?? presentation?.encounter.imageKey
      ?? null,
    oppositionArtKind:
      (presentation?.opponent.imageKey ?? presentation?.encounter.imageKey ?? "").startsWith("nemesis_")
        ? "nemesis"
        : challenge?.artCardId || presentation?.opponent.imageKey || presentation?.encounter.imageKey
          ? "threat"
          : null,
    oppositionFixed: !opposed || (presentation?.opponent.rawDice.length ?? 0) === 0,
    outcomeLabel,
    outcomeCopy,
    publicConsequence,
    publicReward,
    waitingCopy: waitCopy,
    restored: presentation?.restored ?? false,
    sequence,
    activeSequenceIndex: sequenceIndex(stage, outcome !== null)
  };
}
