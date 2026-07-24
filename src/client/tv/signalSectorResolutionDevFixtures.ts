import type { PublicPatchPayload } from "../shared/types.js";
import type { SignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";

export const signalSectorResolutionFixtureIds = [
  "battle-ready",
  "battle-rolling",
  "battle-success",
  "battle-failure",
  "challenge-ready",
  "challenge-rolling",
  "challenge-success",
  "challenge-failure",
  "private-wait",
  "reconnect"
] as const;

export type SignalSectorResolutionFixtureId = typeof signalSectorResolutionFixtureIds[number];

function side(
  name: string,
  baseValue: number,
  rawDice: number[],
  finalTotal: number | null,
  modifierLabel: string | null = null
) {
  const modifierValue = modifierLabel ? 1 : 0;
  return {
    name,
    secondaryName: null,
    baseValue,
    modifiers: modifierLabel ? [{ label: modifierLabel, value: modifierValue }] : [],
    rawDice,
    diceTotal: rawDice.length > 0 ? rawDice.reduce((total, value) => total + value, 0) : null,
    finalTotal
  };
}

export function getSignalSectorResolutionDevFixture(
  search: string,
  payload: PublicPatchPayload
): SignalSectorResolutionModel | null {
  if (!import.meta.env.DEV) return null;
  const id = new URLSearchParams(search).get("resolutionFixture") as SignalSectorResolutionFixtureId | null;
  if (!id || !signalSectorResolutionFixtureIds.includes(id)) return null;

  const battle = id.startsWith("battle") || id === "private-wait" || id === "reconnect";
  const success = id.endsWith("success") || id === "reconnect";
  const failure = id.endsWith("failure");
  const rolling = id.endsWith("rolling");
  const waiting = id === "private-wait";
  const actorSeatId = payload.players[0]?.seatId ?? payload.seats[0]?.seatId ?? null;
  const actorDisplayName =
    payload.seats.find((seat) => seat.seatId === actorSeatId)?.displayName
    ?? payload.players[0]?.character.name
    ?? "Active operative";
  const operativeName = payload.players.find((player) => player.seatId === actorSeatId)?.character.name
    ?? actorDisplayName;
  const outcome = success ? "success" : failure ? "failure" : null;
  const stage = waiting
    ? "choice_required"
    : rolling
      ? "rolling"
      : outcome
        ? "result"
        : "battle_ready";
  const operativeTotal = rolling ? null : battle ? 10 : 9;
  const oppositionTotal = battle ? 8 : 8;
  const publicConsequence = success
    ? battle
      ? "The raider is driven from the sector."
      : "One true whisper is pinned to the route ledger."
    : failure
      ? battle
        ? "The operative suffers 1 wound."
        : "The rift leaves a lasting mark."
      : null;

  return {
    id: `dev-signal-resolution:${id}`,
    revision: outcome ? 4 : rolling ? 2 : 1,
    stage,
    mode: battle ? "battle" : "tile-challenge",
    tone: success ? "success" : failure ? "failure" : "neutral",
    actorSeatId,
    actorDisplayName,
    title: battle ? "Latchspire Raider" : "Rift Whispers",
    eyebrow: battle ? "Hostile contact" : "Recurring anomaly challenge",
    publicSummary: battle
      ? "A raider bars the crossing beneath a failing signal mast."
      : "A map is just a rumor with better posture.",
    stat: battle ? "grit" : "signal",
    statLabel: battle ? "Grit" : "Signal",
    operative: side(
      operativeName,
      battle ? 4 : 3,
      rolling ? [] : [5],
      operativeTotal,
      battle ? "Relic blade" : "Field tools"
    ),
    operativeImageKey: payload.players.find((player) => player.seatId === actorSeatId)?.character.id ?? null,
    opposition: battle
      ? side("Latchspire Raider", 3, rolling ? [] : [4], rolling ? null : oppositionTotal, "Sector pressure")
      : side("Rift Whispers", oppositionTotal, [], oppositionTotal),
    oppositionImageKey: battle ? "latchspire-raider" : "rift-whispers",
    oppositionArtKind: "threat",
    oppositionFixed: !battle,
    outcomeLabel: success ? "SUCCESS" : failure ? "FAILURE" : "RESOLVING",
    outcomeCopy:
      publicConsequence
      ?? (waiting
        ? `Awaiting ${actorDisplayName}'s private decision.`
        : rolling
          ? "Server-authored dice are resolving."
          : battle
            ? "Combatants and relevant public values are confirmed."
            : "The operative must meet the sector's fixed public threshold."),
    publicConsequence,
    publicReward: success && battle ? "Gain 1 trophy." : null,
    waitingCopy: waiting ? `Awaiting ${actorDisplayName}'s private decision.` : null,
    restored: id === "reconnect",
    sequence: battle ? ["Engage", "Dice", "Calculation", "Result"] : ["Sector", "Test", "Calculation", "Result"],
    activeSequenceIndex: outcome ? 3 : rolling ? 1 : 0
  };
}
