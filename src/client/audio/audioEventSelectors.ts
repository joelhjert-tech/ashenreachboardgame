import type { PublicPatchPayload, ResolutionStage, StatePatch } from "../shared/types.js";

export type AshenReachAudioCue =
  | "dice_roll"
  | "dice_land"
  | "battle_start"
  | "hit"
  | "critical"
  | "damage"
  | "card_reveal"
  | "loot"
  | "shop"
  | "shrine"
  | "portal"
  | "boss"
  | "victory"
  | "defeat";

export type AshenReachMusicState = "exploration" | "combat" | "boss" | "victory" | "defeat" | "silent";

type PublicPatch = StatePatch<PublicPatchPayload> | null;

const stageCueMap: Partial<Record<ResolutionStage, AshenReachAudioCue[]>> = {
  card_reveal: ["card_reveal"],
  battle_setup: ["battle_start"],
  dice_roll: ["dice_roll"]
};

function getResolutionKey(patch: PublicPatch): string | null {
  const resolution = patch?.payload.activeResolution;
  return resolution ? `${resolution.id}:${resolution.stage}` : null;
}

function getShopRevealKey(patch: PublicPatch): string | null {
  const shop = patch?.payload.shopEncounter;

  if (!shop) {
    return null;
  }

  return [
    shop.shopId,
    shop.status,
    shop.revealedStock?.map((stock) => stock.cardId).join(",") ?? "no-stock",
    shop.recentOutcome?.summary ?? "no-outcome"
  ].join(":");
}

export function getAshenReachMusicState(patch: PublicPatch): AshenReachMusicState {
  if (!patch) {
    return "silent";
  }

  if (patch.payload.status === "ended") {
    return patch.payload.winnerSeatId ? "victory" : "defeat";
  }

  const resolution = patch.payload.activeResolution;

  if (resolution?.battle || resolution?.stage === "battle_setup" || resolution?.stage === "dice_roll" || resolution?.stage === "roll_result") {
    return "combat";
  }

  if (patch.payload.nemesis || (patch.payload.nemesisChampions ?? []).some((champion) => !champion.defeated && champion.warning)) {
    return "boss";
  }

  return "exploration";
}

export function getAshenReachAudioCues(previous: PublicPatch, next: PublicPatch): AshenReachAudioCue[] {
  if (!next) {
    return [];
  }

  const cues: AshenReachAudioCue[] = [];
  const previousResolution = previous?.payload.activeResolution ?? null;
  const nextResolution = next.payload.activeResolution ?? null;

  if (getResolutionKey(previous) !== getResolutionKey(next) && nextResolution) {
    cues.push(...(stageCueMap[nextResolution.stage] ?? []));

    if (nextResolution.stage === "roll_result" && nextResolution.roll) {
      cues.push("dice_land");
      cues.push(nextResolution.roll.success ? "hit" : "damage");

      if (nextResolution.roll.success && nextResolution.roll.finalTotal >= nextResolution.roll.target + 4) {
        cues.push("critical");
      }
    }

    if (nextResolution.stage === "outcome_summary" || nextResolution.stage === "awaiting_continue") {
      const outcomeText = [
        nextResolution.outcome?.title,
        nextResolution.outcome?.text,
        ...(nextResolution.outcome?.effects ?? [])
      ].join(" ").toLowerCase();

      if (outcomeText.includes("artifact") || outcomeText.includes("gear") || outcomeText.includes("salvage") || outcomeText.includes("trophy")) {
        cues.push("loot");
      }
    }
  }

  if (previousResolution?.roll !== nextResolution?.roll && nextResolution?.stage === "roll_result" && nextResolution?.roll && !cues.includes("dice_land")) {
    cues.push("dice_land");
    cues.push(nextResolution.roll.success ? "hit" : "damage");
  }

  if (getShopRevealKey(previous) !== getShopRevealKey(next) && next.payload.shopEncounter) {
    cues.push("shop");
    if (next.payload.shopEncounter.recentOutcome?.gained) {
      cues.push("loot");
    }
  }

  if (previous?.payload.status !== "ended" && next.payload.status === "ended") {
    cues.push(next.payload.winnerSeatId ? "victory" : "defeat");
  }

  if (!previous?.payload.nemesis && next.payload.nemesis) {
    cues.push("boss");
  }

  return cues;
}
