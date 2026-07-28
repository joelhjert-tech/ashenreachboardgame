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
  "hazard-success",
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
  const hazard = id.startsWith("hazard");
  const success = id.endsWith("success") || id === "reconnect";
  const failure = id.endsWith("failure");
  const rolling = id.endsWith("rolling");
  const waiting = id === "private-wait";
  const actorSeatId = payload.players[0]?.seatId ?? payload.seats[0]?.seatId ?? null;
  const actorDisplayName =
    payload.seats.find((seat) => seat.seatId === actorSeatId)?.displayName
    ?? payload.players[0]?.character.name
    ?? "Active operative";
  const actorSectorId = payload.players.find((player) => player.seatId === actorSeatId)?.sectorId ?? null;
  const locationName = payload.sectors.find((sector) => sector.id === actorSectorId)?.name ?? "Unknown sector";
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
  const operativeTotal = rolling ? null : battle ? 10 : hazard ? 12 : 9;
  const oppositionTotal = battle ? 8 : hazard ? 11 : 8;
  const publicConsequence = success
    ? battle
      ? "The raider is driven from the sector."
      : hazard
        ? "The delayed reflection locks back into step."
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
    mode: battle ? "battle" : hazard ? "sector-test" : "tile-challenge",
    tone: success ? "success" : failure ? "failure" : "neutral",
    actorSeatId,
    actorDisplayName,
    locationName,
    title: battle ? "Latchspire Raider" : hazard ? "Mirror-Rot Interference" : "Rift Whispers",
    eyebrow: battle ? "Hostile contact" : hazard ? "Hazard trial" : "Recurring anomaly challenge",
    publicSummary: battle
      ? "A raider bars the crossing beneath a failing signal mast."
      : hazard
        ? "Your reflection acts one second late, then tries to make the delay your fault."
        : "A map is just a rumor with better posture.",
    stat: battle ? "grit" : hazard ? "guile" : "signal",
    statLabel: battle ? "Grit" : hazard ? "Guile" : "Signal",
    operative: side(
      operativeName,
      battle ? 4 : hazard ? 5 : 3,
      rolling ? [] : [5],
      operativeTotal,
      battle ? "Relic blade" : hazard ? "Operative instinct" : "Field tools"
    ),
    operativeImageKey: payload.players.find((player) => player.seatId === actorSeatId)?.character.id ?? null,
    opposition: battle
      ? side("Latchspire Raider", 3, rolling ? [] : [4], rolling ? null : oppositionTotal, "Sector pressure")
      : {
        ...side(hazard ? "Mirror-Rot Interference" : "Rift Whispers", oppositionTotal, [], oppositionTotal),
        secondaryName: hazard ? "Hazard" : "Sector challenge"
      },
    oppositionImageKey: battle ? "latchspire-raider" : hazard ? "mirror-rot-interference" : "rift-whispers",
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
    sequence: battle
      ? ["Engage", "Dice", "Calculation", "Result"]
      : hazard
        ? ["Hazard", "Test", "Totals", "Result"]
        : ["Sector", "Test", "Calculation", "Result"],
    activeSequenceIndex: outcome ? 3 : rolling ? 1 : 0
  };
}
