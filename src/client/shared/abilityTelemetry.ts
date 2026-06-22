import type {
  AbilityTriggerSummary,
  PhonePatchPayload,
  PhoneSelfState,
  PublicPatchPayload,
  PublicPlayer,
  PublicPlayerCharacter,
  Stat
} from "./types.js";

export interface AbilityChangeItem {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
}

export interface SeatAbilityTelemetry {
  latestTrigger: AbilityTriggerSummary | null;
  recentTriggers: AbilityTriggerSummary[];
  changes: AbilityChangeItem[];
}

const statLabels: Record<Stat, string> = {
  command: "Cmd",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

function pushSignedChange(
  changes: AbilityChangeItem[],
  label: string,
  delta: number,
  positiveTone: AbilityChangeItem["tone"] = "good",
  negativeTone: AbilityChangeItem["tone"] = "warn"
): void {
  if (delta === 0) {
    return;
  }

  changes.push({
    label,
    value: `${delta > 0 ? "+" : ""}${delta}`,
    tone: delta > 0 ? positiveTone : negativeTone
  });
}

function buildCharacterChanges(
  previousCharacter: PublicPlayerCharacter | PhoneSelfState["character"] | null,
  currentCharacter: PublicPlayerCharacter | PhoneSelfState["character"] | null
): AbilityChangeItem[] {
  if (!previousCharacter || !currentCharacter) {
    return [];
  }

  const changes: AbilityChangeItem[] = [];

  pushSignedChange(changes, "Heat", currentCharacter.heat - previousCharacter.heat, "warn", "good");
  pushSignedChange(changes, "Wounds", currentCharacter.wounds - previousCharacter.wounds, "warn", "good");
  pushSignedChange(changes, "Scars", currentCharacter.scars.length - previousCharacter.scars.length, "warn", "good");

  if (previousCharacter.status !== currentCharacter.status) {
    changes.push({
      label: "Status",
      value: currentCharacter.status,
      tone: currentCharacter.status === "active" ? "good" : "warn"
    });
  }

  const previousContractProgress = previousCharacter.activeContract?.progress ?? null;
  const currentContractProgress = currentCharacter.activeContract?.progress ?? null;

  if (previousContractProgress !== null && currentContractProgress !== null) {
    pushSignedChange(changes, "Contract", currentContractProgress - previousContractProgress);
  } else if (previousContractProgress === null && currentContractProgress !== null) {
    changes.push({ label: "Contract", value: "Accepted", tone: "good" });
  } else if (previousContractProgress !== null && currentContractProgress === null) {
    changes.push({ label: "Contract", value: "Completed", tone: "good" });
  }

  const previousHeldGearCount =
    "heldGearCount" in previousCharacter ? previousCharacter.heldGearCount : previousCharacter.heldGear.length;
  const currentHeldGearCount =
    "heldGearCount" in currentCharacter ? currentCharacter.heldGearCount : currentCharacter.heldGear.length;

  pushSignedChange(changes, "Held Gear", currentHeldGearCount - previousHeldGearCount);

  (Object.keys(statLabels) as Stat[]).forEach((stat) => {
    pushSignedChange(changes, statLabels[stat], currentCharacter.stats[stat] - previousCharacter.stats[stat]);
  });

  return changes.slice(0, 6);
}

export function getSeatAbilityTelemetry(
  currentPatch: PublicPatchPayload | null,
  previousPatch: PublicPatchPayload | null,
  seatId: string | null
): SeatAbilityTelemetry {
  if (!currentPatch || !seatId) {
    return { latestTrigger: null, recentTriggers: [], changes: [] };
  }

  const recentTriggers = currentPatch.recentAbilityTriggers.filter((entry) => entry.seatId === seatId).slice(0, 3);
  const currentPlayer = currentPatch.players.find((entry) => entry.seatId === seatId) ?? null;
  const previousPlayer = previousPatch?.players.find((entry) => entry.seatId === seatId) ?? null;

  return {
    latestTrigger: recentTriggers[0] ?? null,
    recentTriggers,
    changes: buildCharacterChanges(previousPlayer?.character ?? null, currentPlayer?.character ?? null)
  };
}

export function getPhoneAbilityTelemetry(
  currentPatch: PhonePatchPayload | null,
  previousPatch: PhonePatchPayload | null
): SeatAbilityTelemetry {
  const seatId = currentPatch?.self?.seatId ?? null;

  if (!currentPatch || !seatId) {
    return { latestTrigger: null, recentTriggers: [], changes: [] };
  }

  const recentTriggers = currentPatch.recentAbilityTriggers.filter((entry) => entry.seatId === seatId).slice(0, 3);

  return {
    latestTrigger: recentTriggers[0] ?? null,
    recentTriggers,
    changes: buildCharacterChanges(previousPatch?.self?.character ?? null, currentPatch.self?.character ?? null)
  };
}
