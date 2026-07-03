import { describeContractObjective, formatContractObjectiveStatus } from "../../game/contracts/objectives.js";
import type { PhonePatchPayload, Stat } from "../shared/types.js";
import { statLabelById } from "../shared/statLabels.js";
import {
  formatTimingWindow,
  getCurrentTimingWindow,
  getInventoryCards,
  type InventoryCardViewModel
} from "./inventoryPresentation.js";

export interface UsefulNowItem {
  label: string;
  detail: string;
  tone: "ready" | "passive" | "locked" | "private";
}

export interface UsefulNowViewModel {
  phaseLabel: string;
  headline: string;
  detail: string;
  relevantStat?: Stat;
  items: UsefulNowItem[];
}

function activeSeatId(patch: PhonePatchPayload): string | null {
  return patch.turnOrder[patch.activeSeatIndex] ?? null;
}

function cardTone(card: InventoryCardViewModel): UsefulNowItem["tone"] {
  if (card.canUseNow) {
    return "ready";
  }

  return card.status === "Passive" ? "passive" : "locked";
}

function cardDetail(card: InventoryCardViewModel): string {
  if (card.canUseNow) {
    return card.effectText;
  }

  return card.statusReason;
}

function topCards(cards: InventoryCardViewModel[], limit: number): UsefulNowItem[] {
  return cards.slice(0, limit).map((card) => ({
    label: card.name,
    detail: cardDetail(card),
    tone: cardTone(card)
  }));
}

function relevantBattleStat(patch: PhonePatchPayload): Stat {
  return patch.activeResolution?.battle?.stat ?? patch.encounter?.stat ?? patch.pendingEnemyRoll?.stat ?? "grit";
}

export function buildUsefulNowViewModel(patch: PhonePatchPayload): UsefulNowViewModel | null {
  const self = patch.self;

  if (!self) {
    return null;
  }

  const currentSeatId = activeSeatId(patch);
  const isActive = currentSeatId === self.seatId;
  const timingWindow = getCurrentTimingWindow(patch);
  const cards = getInventoryCards(patch);
  const timingCards = cards.filter((card) => card.timingWindows.includes(timingWindow) || card.timingWindows.includes("anyTime"));
  const usableCards = timingCards.filter((card) => card.canUseNow);
  const passiveCards = cards.filter((card) => card.status === "Passive");
  const lockedCards = timingCards.filter((card) => !card.canUseNow && card.status !== "Passive");

  if (!isActive) {
    return {
      phaseLabel: "Standby",
      headline: "Watch the TV",
      detail: currentSeatId ? `${currentSeatId} is acting. Your private tools stay hidden.` : "Waiting for the table.",
      items: []
    };
  }

  if (patch.phase === "navigation") {
    const movementItems = topCards([...usableCards, ...passiveCards, ...lockedCards], 3);
    const exactMove = patch.movementPlanner?.active
      ? `Movement roll ${patch.movementPlanner.movementValue}. Choose an exact route.`
      : "Movement options appear after the roll.";

    return {
      phaseLabel: "Movement",
      headline: "Useful now: route and movement tools",
      detail: exactMove,
      relevantStat: "guile",
      items: movementItems.length > 0 ? movementItems : [{ label: "Movement", detail: "Use the glowing legal route preview.", tone: "passive" }]
    };
  }

  if (patch.activeResolution?.battle || patch.encounter?.cardType === "enemy" || patch.encounter?.cardType === "hazard" || patch.pendingEnemyRoll) {
    const stat = relevantBattleStat(patch);
    const battleItems = topCards([...usableCards, ...lockedCards, ...passiveCards], 4);

    return {
      phaseLabel: "Battle",
      headline: `Useful now: ${statLabelById[stat]}`,
      detail: `Current value ${self.character.stats[stat]}. Use roll tools only in their timing window.`,
      relevantStat: stat,
      items: battleItems.length > 0 ? battleItems : [{ label: statLabelById[stat], detail: "No gear or followers are usable in this timing window.", tone: "locked" }]
    };
  }

  if (patch.phase === "action" && patch.shopEncounter?.activePlayer.playerId === self.seatId) {
    const sellable = patch.shopEncounter.sellInventory?.filter((item) => item.sellable).length ?? 0;
    const salvage = patch.shopEncounter.activePlayer.salvage;

    return {
      phaseLabel: "Shop",
      headline: "Useful now: salvage and sellable gear",
      detail: patch.shopEncounter.status === "locked" ? (patch.shopEncounter.blockedReasonText ?? "Shop is blocked.") : `Salvage ${salvage}.`,
      items: [
        { label: "Salvage", detail: `${salvage} available for buy/sell choices.`, tone: "ready" },
        { label: "Sellable gear", detail: `${sellable} item${sellable === 1 ? "" : "s"} can be sold here.`, tone: sellable > 0 ? "ready" : "locked" }
      ]
    };
  }

  const activeContract = self.character.activeContract
    ? patch.availableContracts.find((contract) => contract.id === self.character.activeContract?.contractId) ?? null
    : null;
  const questItems: UsefulNowItem[] = [];

  if (activeContract && self.character.activeContract) {
    questItems.push({
      label: activeContract.name,
      detail: `${formatContractObjectiveStatus(activeContract, self.character.activeContract.progress)}. ${describeContractObjective(activeContract)}`,
      tone: self.character.activeContract.progress >= activeContract.objective.target ? "ready" : "passive"
    });
  }

  if (patch.privateRivalry?.active) {
    questItems.push({
      label: "Private agenda",
      detail: `${patch.privateRivalry.objective.progress}/${patch.privateRivalry.objective.target} ${patch.privateRivalry.objective.progressLabel}. ${patch.privateRivalry.reveal.hint}`,
      tone: "private"
    });
  }

  return {
    phaseLabel: formatTimingWindow(timingWindow),
    headline: questItems.length > 0 ? "Useful now: objective progress" : "Useful now: held tools",
    detail: questItems.length > 0 ? "Contract and private objective progress are tracked here." : "No objective-specific hook is active.",
    items: questItems.length > 0 ? questItems : topCards([...usableCards, ...passiveCards, ...lockedCards], 3)
  };
}
