import { RIFTFALL_BOARD_NODES } from "../data/riftfallBoardNodes.js";
import { BOARD_RING_TRANSITIONS } from "../game/data/boardTransitions.js";
import { resolveBoardTextEffect } from "../game/data/boardTextEffects.js";
import { getBoardSpace, isScenarioConfrontationSpace } from "../game/data/boardSpaces.js";
import { advanceContractObjectiveState, canAdvanceContractObjective, isContractObjectiveComplete } from "../game/contracts/objectives.js";
import type { ClientIntent } from "../game/engine/actions.js";
import { getEquippedGearItem, isGearModifierActive } from "../game/engine/gear.js";
import { getStatUpgradeCost, getStatUpgradeDisabledReason } from "../game/rules/statUpgrades.js";
import { matchesScenarioObjective } from "../game/rules/scenarioObjectiveTriggers.js";
import type { GearSlot } from "../game/schema/gear.schema.js";
import type { PhonePatchPayload, PublicMoveDestination, Stat } from "../client/shared/types.js";

export const AI_RIVAL_THINK_MS = 1_000;
export const AI_RIVAL_SUPPORTED_SCENARIO_IDS = new Set([
  "scenario_throne_of_ash",
  "scenario_mirror_of_false_heroes",
  "scenario_devourer_beneath"
]);

export interface AiRivalDecision {
  intent: ClientIntent;
  publicLabel: string;
  reasonCode: string;
}

const RING_PROGRESS: Record<PublicMoveDestination["ring"], number> = {
  outer: 0,
  middle: 12,
  inner: 24,
  core: 36
};

const STAT_ORDER: Stat[] = ["grit", "signal", "guile", "forge", "command"];

function decision(intent: ClientIntent, publicLabel: string, reasonCode: string): AiRivalDecision {
  return { intent, publicLabel, reasonCode };
}

function progressesOwnContract(patch: PhonePatchPayload, destination: PublicMoveDestination): boolean {
  const character = patch.self?.character;
  if (!character) return false;
  const boardSpace = getBoardSpace(destination.sectorId);
  const cards = patch.activeContractCards ?? (patch.activeContractCard ? [patch.activeContractCard] : []);
  return cards.some((card) => {
    const progress = character.activeContracts?.find((entry) => entry.contractId === card.id)
      ?? (character.activeContract?.contractId === card.id ? character.activeContract : null);
    if (!progress || isContractObjectiveComplete(card, progress)) return false;
    const objective = card.objective;
    switch (objective.type) {
      case "multiStopRoute":
        // Use the real objective rules: completed stops and later ordered stops
        // must not tempt the rival into a route that cannot advance its Contract.
        return advanceContractObjectiveState(card, progress, {
          type: "sector-visited", sectorId: destination.sectorId,
          sectorTags: boardSpace?.tags ?? destination.tags
        }).progress > progress.progress;
      case "spaceTextResolved":
        return Boolean(boardSpace && canAdvanceContractObjective(card, {
          type: "space-text-resolved", effectKey: boardSpace.textBox.effectKey
        }));
      case "defeatCount":
        return destination.faceUpThreats.some((threat) => threat.type === "enemy")
          || destination.threatIcons.includes("red");
      case "shopTransaction":
        return Boolean(destination.shop && destination.shop.status !== "locked" && canAdvanceContractObjective(card, {
          type: "shop-transaction", action: objective.action,
          sectorId: destination.sectorId, shopTypes: boardSpace?.tags ?? destination.tags
        }));
      case "tileChallengeResolved":
        return (destination.challenges ?? []).some((challenge) =>
          (!objective.sectorId || objective.sectorId === destination.sectorId)
          && (!objective.challengeId || objective.challengeId === challenge.id)
          && (!objective.challengeType || objective.challengeType === challenge.challengeType)
          && (!objective.challengeTag || challenge.tags.includes(objective.challengeTag))
        );
    }
  });
}

function holdsArtifact(patch: PhonePatchPayload): boolean {
  return patch.self?.character.heldGear.some((gear) => gear.tier === "artifact") ?? false;
}

function hasArtifactCache(sector: PhonePatchPayload["sectors"][number]): boolean {
  const space = getBoardSpace(sector.id);
  return Boolean(sector.encounterDecks.artifact.length && space &&
    resolveBoardTextEffect(space.textBox.effectKey)?.sectorDeck?.kind === "artifact");
}

const ringTracks = {
  outer: RIFTFALL_BOARD_NODES.filter((node) => node.ring === "outer").map((node) => node.id),
  middle: RIFTFALL_BOARD_NODES.filter((node) => node.ring === "middle").map((node) => node.id)
};

function seeksGate(patch: PhonePatchPayload): boolean {
  if (patch.scenarioState?.confrontation.repelled) return false;
  if (holdsArtifact(patch)) return true;
  // An operative with no Artifact can still win through an objective. Split
  // opening plans when rivals race at the same table.
  return patch.turnOrder.indexOf(patch.self?.seatId ?? "") % 2 === 1;
}

function gateRouteScore(sectorId: string, ring: PublicMoveDestination["ring"], patch: PhonePatchPayload): number {
  if (!seeksGate(patch)) return 0;
  if (ring !== "outer" && ring !== "middle") return 0;
  const track = ringTracks[ring];
  const index = track.indexOf(sectorId);
  if (index < 0) return 0;

  const needsArtifact = !holdsArtifact(patch);
  const caches = needsArtifact ? patch.sectors.filter(hasArtifactCache).map((sector) => sector.id) : [];
  const crossings = BOARD_RING_TRANSITIONS.filter((edge) => edge.direction === "inward" &&
    edge.sourceRing === ring && (!edge.allowedFrom.length || edge.allowedFrom.includes(edge.sourceSectorId)));
  const targets = needsArtifact && caches.some((id) => track.includes(id)) ? caches : crossings.map((edge) => edge.sourceSectorId);
  // Exact rolls can overshoot. Aim for a landing on the milestone, then use
  // distance around the circular track to break ties between near misses.
  if (caches.includes(sectorId)) return 65;
  if (targets.includes(sectorId)) return 48;
  let distance = Infinity;
  for (const target of targets) {
    const targetIndex = track.indexOf(target);
    if (targetIndex < 0) continue;
    const gap = Math.abs(index - targetIndex);
    distance = Math.min(distance, gap, track.length - gap);
  }
  return Math.max(0, 18 - distance * 4);
}

function bestBoardCheck(effectKey: string, stats: Record<Stat, number>) {
  const effect = resolveBoardTextEffect(effectKey);
  const margin = (check: { stat?: Stat; difficulty?: number }) =>
    check.stat ? stats[check.stat] - (check.difficulty ?? 0) : 0;
  return effect?.choices?.slice().sort((left, right) => margin(right) - margin(left))[0]
    ?? (effect ? { stat: effect.stat, difficulty: effect.difficulty, id: undefined } : null);
}

function scoreDestination(destination: PublicMoveDestination, patch: PhonePatchPayload): number {
  let score = RING_PROGRESS[destination.ring] - destination.distance + gateRouteScore(destination.sectorId, destination.ring, patch);
  if (destination.strategicTags.includes("reward")) score += 9;
  if (destination.strategicTags.includes("shop")) score += 5;
  if (destination.strategicTags.includes("gate")) score += 7;
  if (destination.strategicTags.includes("safe")) score += 4;
  if (destination.strategicTags.includes("danger")) score -= 8;
  if (destination.strategicTags.includes("nemesis")) score -= 6;
  score -= destination.faceUpThreats.length * 3;
  if (progressesOwnContract(patch, destination)) score += 18;
  const effectKey = getBoardSpace(destination.sectorId)?.textBox.effectKey;
  if (effectKey && matchesScenarioObjective(patch.activeScenario?.id, {
    type: "sectorActionCompleted", effectKey, sectorId: destination.sectorId
  })) score += patch.activeScenario && patch.activeScenario.progress + 1 >= patch.activeScenario.threshold ? 90 : 22;
  // A consumable key should buy progress, not an otherwise equivalent route.
  if (destination.voidKeyPrompt) score -= 4;
  return score;
}

function chooseDestination(destinations: PublicMoveDestination[], patch: PhonePatchPayload): PublicMoveDestination | null {
  return [...destinations]
    .filter((entry) => !entry.disabledReason || entry.voidKeyPrompt)
    .sort((left, right) => scoreDestination(right, patch) - scoreDestination(left, patch) || left.sectorId.localeCompare(right.sectorId))[0] ?? null;
}

function bestStat(stats: Record<Stat, number>, preferred?: Stat | null): Stat {
  if (preferred) return preferred;
  return [...STAT_ORDER].sort((left, right) => stats[right] - stats[left] || left.localeCompare(right))[0] ?? "grit";
}

function weakestStat(stats: Record<Stat, number>): Stat {
  return [...STAT_ORDER].sort((left, right) => stats[left] - stats[right] || left.localeCompare(right))[0] ?? "command";
}

function bestGearIntent(patch: PhonePatchPayload, stat: Stat): ClientIntent | null {
  const self = patch.self;
  if (!self) return null;
  const mode = patch.encounter?.cardType === "enemy" ? "battle" : "check";
  const suppressed = new Set((patch.equipmentSuppressions ?? [])
    .filter((entry) => entry.mode === "throughNextThreat" || mode === "battle")
    .map((entry) => entry.itemInstanceId));
  const bonus = (item: typeof self.character.heldGear[number] | undefined): number =>
    item && item.statBonus.stat === stat && !suppressed.has(item.instanceId ?? "")
      && isGearModifierActive(item, { mode }) ? item.statBonus.amount : 0;
  // Compare improvements within each slot before ranking them. A strong weapon
  // must not hide an affordable improvement in the armor or utility slot.
  const candidate = [...self.character.heldGear]
    .map((item) => ({ item, gain: bonus(item) - bonus(getEquippedGearItem(self.character, item.slot)) }))
    .filter(({ gain }) => gain > 0)
    .sort((left, right) => right.gain - left.gain || left.item.id.localeCompare(right.item.id)
      || (left.item.instanceId ?? "").localeCompare(right.item.instanceId ?? ""))[0]?.item;
  if (!candidate) return null;
  return {
    type: "EQUIP_GEAR",
    seatId: self.seatId,
    gearId: candidate.id,
    ...(candidate.instanceId ? { instanceId: candidate.instanceId } : {}),
    slot: candidate.slot as GearSlot
  };
}

function chooseTrainingIntent(patch: PhonePatchPayload): ClientIntent | null {
  const self = patch.self;
  if (!self || patch.activeResolution || patch.encounter || patch.pendingEnemyRoll) return null;
  const agenda = patch.privateRivalry?.objective;
  // Keep the trophies needed by the rival's own objective.
  const reserve = agenda?.id === "claim-trophies" ? agenda.target : 0;
  const preferred = holdsArtifact(patch) ? "signal" : chooseAiSetupStat(agenda?.id);
  const stat = [...STAT_ORDER]
    .filter((skill) => !getStatUpgradeDisabledReason({
      stat: skill,
      currentValue: self.character.stats[skill],
      trophies: self.character.trophies - reserve,
      qaOnly: self.character.qaOnly || self.character.id === "char_master_alpha"
    }))
    .sort((left, right) => {
      const leftValue = self.character.stats[left];
      const rightValue = self.character.stats[right];
      // Patch weak skills first, then invest in the agenda's specialty.
      return Number(rightValue < 3) - Number(leftValue < 3)
        || Number(right === preferred) - Number(left === preferred)
        || getStatUpgradeCost(leftValue) - getStatUpgradeCost(rightValue)
        || left.localeCompare(right);
    })[0];
  return stat ? { type: "RAISE_STAT_REQUESTED", seatId: self.seatId, stat } : null;
}

function usableGear(patch: PhonePatchPayload) {
  return (patch.self?.character.heldGear ?? []).flatMap((item) => {
    const use = patch.objectUseStates?.find((entry) => entry.source === "gear" && entry.id === item.id
      && (item.instanceId ? entry.instanceId === item.instanceId : !entry.instanceId));
    return use && !use.disabledReason && !use.activeModifier && use.remainingUses !== 0
      ? [{ item, use }] : [];
  }).sort((left, right) => left.item.id.localeCompare(right.item.id)
    || (left.item.instanceId ?? "").localeCompare(right.item.instanceId ?? ""));
}

function gearIntent(patch: PhonePatchPayload, item: NonNullable<PhonePatchPayload["self"]>["character"]["heldGear"][number]): ClientIntent {
  return { type: "USE_GEAR", seatId: patch.self!.seatId, gearId: item.id,
    ...(item.instanceId ? { instanceId: item.instanceId } : {}) };
}

function chooseHealingItem(patch: PhonePatchPayload): ClientIntent | null {
  if (patch.phase !== "action" || (patch.self?.character.wounds ?? 0) <= 0) return null;
  const candidate = usableGear(patch).find(({ item }) => item.consumableEffect === "healWound");
  return candidate ? gearIntent(patch, candidate.item) : null;
}

function chooseFailureItem(patch: PhonePatchPayload): ClientIntent | null {
  if (patch.activeResolution?.roll?.success !== false) return null;
  const candidates = usableGear(patch).filter(({ use }) => use.usableForCurrentTest === true);
  const candidate = candidates.find(({ item }) => item.consumableEffect === "ignoreFailedMovementOrHazard")
    ?? candidates.find(({ item }) => item.exhaustEffect === "mirrorReroll");
  return candidate ? gearIntent(patch, candidate.item) : null;
}

function chooseFollowerSupport(patch: PhonePatchPayload): ClientIntent | null {
  const self = patch.self;
  if (!self || patch.turnOrder[patch.activeSeatIndex] !== self.seatId) return null;
  const failed = patch.activeResolution?.roll?.success === false;
  const candidate = [...(self.character.followers ?? [])]
    .filter((follower) => {
      const use = patch.objectUseStates?.find((entry) => entry.source === "follower" && entry.id === follower.id
        && (!follower.instanceId || entry.instanceId === follower.instanceId));
      if (!use || use.disabledReason || use.remainingUses === 0 || use.activeModifier) return false;
      if (failed) return ["ignore_route_failure", "ignore_middle_route_failure", "prevent_equipment_loss",
        "prevent_salvage_loss", "battle_support"].includes(follower.abilityId ?? "");
      return patch.phase === "action" && ((follower.id === "cinder-surgeon" && self.character.wounds > 0)
        || (follower.abilityId === "signal_anomaly_support" && patch.encounter?.cardType === "hazard"));
    })
    .sort((left, right) => Number(left.useLimit === "discard") - Number(right.useLimit === "discard")
      || left.id.localeCompare(right.id))[0];
  return candidate ? { type: "USE_FOLLOWER", seatId: self.seatId, followerId: candidate.id } : null;
}

function chooseBattleItem(patch: PhonePatchPayload): ClientIntent | null {
  const battle = patch.battlePresentation;
  if (patch.encounter?.cardType !== "enemy" || patch.encounter.stat !== "grit"
    || !battle?.test.opposed || battle.test.fixedValue === undefined || battle.opponent.baseValue === null) return null;
  const opposition = battle.opponent.baseValue + battle.opponent.modifiers.reduce((sum, source) => sum + source.value, 0);
  const advantage = battle.test.fixedValue - opposition;
  // Spend limited boosts on competitive fights, saving them when already well
  // ahead or when even the best two-dice swing cannot secure a victory.
  if (advantage >= 4) return null;
  const candidates = usableGear(patch).filter(({ use }) => use.usableForCurrentTest === true);
  // The Fuse spends pressure immediately. Keep room for a two-Wound loss and,
  // on the final seat, the round tick before anyone can stabilize again.
  const fuseSafetyMargin = patch.activeSeatIndex === patch.turnOrder.length - 1 ? 4 : 3;
  const candidate = candidates.find(({ item }) => item.exhaustEffect === "warbellCommand" && advantage + 2 + 10 > 0)
    ?? candidates.find(({ item }) => item.id === "black-route-fuse" && advantage + 3 + 10 > 0
      && patch.escalationThreshold - patch.escalationLevel > fuseSafetyMargin);
  return candidate ? gearIntent(patch, candidate.item) : null;
}

function chooseEnabledEncounterOption(patch: PhonePatchPayload): string | null {
  const choice = patch.pendingEncounterDecisionPrivate;
  if (!choice) return null;
  const enabled = choice.options.filter((option) => option.enabled);
  if (enabled.length === 0) return null;
  const avoidPayment = choice.currentSalvage <= Math.max(2, choice.salvageCost);
  return [...enabled].sort((left, right) => {
    const leftSafe = /decline|leave|refuse|keep|without|retreat/i.test(left.label) ? 1 : 0;
    const rightSafe = /decline|leave|refuse|keep|without|retreat/i.test(right.label) ? 1 : 0;
    return (avoidPayment ? rightSafe - leftSafe : leftSafe - rightSafe) || left.optionId.localeCompare(right.optionId);
  })[0]?.optionId ?? null;
}

function chooseShopIntent(patch: PhonePatchPayload): ClientIntent | null {
  const self = patch.self;
  const shop = patch.shopEncounter;
  if (!self || !shop || shop.activePlayer.playerId !== self.seatId) return null;
  if (shop.blocked || shop.status === "locked" || shop.blockingThreats.length > 0) return null;
  if (shop.recentOutcome) return { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };

  const view = shop.browseSelection?.view ?? "categories";
  if (view === "categories") {
    const wantsArtifact = !holdsArtifact(patch) && shop.services.some((service) => service.id === "trade-missions-for-artifact" && service.enabled);
    const preferredViews = [...(wantsArtifact ? ["artifacts" as const] : []), "equipment", "route-aids", "services", "sell", "supplies", "artifacts"] as const;
    const category = preferredViews
      .map((candidate) => shop.presentation?.categories.find((entry) => entry.view === candidate && entry.available))
      .find(Boolean);
    if (!category) return { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };
    return { type: "SHOP_BROWSE_SELECTED", seatId: self.seatId, view: category.view, selectedId: null };
  }

  if (["equipment", "supplies", "artifacts", "route-aids"].includes(view)) {
    const offer = [...(shop.revealedStock ?? [])]
      .filter((item) => item.affordable && !item.disabledReason)
      .sort((left, right) => {
        const leftCost = left.cost.salvage ?? left.cost.completedContracts ?? 0;
        const rightCost = right.cost.salvage ?? right.cost.completedContracts ?? 0;
        return Number(!holdsArtifact(patch) && right.type === "artifact") - Number(!holdsArtifact(patch) && left.type === "artifact")
          || rightCost - leftCost || left.cardId.localeCompare(right.cardId);
      })[0];
    return offer
      ? { type: "SHOP_PURCHASE_REQUESTED", seatId: self.seatId, cardId: offer.cardId }
      : { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };
  }

  if (view === "sell") {
    const sale = [...(shop.sellInventory ?? [])]
      .filter((item) => item.sellable && item.type !== "artifact")
      .sort((left, right) => right.sellValue - left.sellValue || left.gearId.localeCompare(right.gearId))[0];
    return sale
      ? { type: "SHOP_SELL_REQUESTED", seatId: self.seatId, gearId: sale.gearId, ...(sale.instanceId ? { instanceId: sale.instanceId } : {}) }
      : { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };
  }

  if (view === "services") {
    const service = [...shop.services]
      .filter((entry) => entry.enabled && !["buy-gear", "buy-supplies", "buy-route-aids", "trade-missions-for-artifact", "sell-gear"].includes(entry.id))
      .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!service) return { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };
    const repairTarget = shop.repairTargets?.[0];
    return {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: self.seatId,
      serviceId: service.id,
      ...(repairTarget ? { itemInstanceId: repairTarget.instanceId } : {})
    };
  }

  return { type: "SHOP_SKIP_REQUESTED", seatId: self.seatId };
}

function chooseRivalryPressureTarget(patch: PhonePatchPayload): string | null {
  const self = patch.self;
  const interaction = patch.rivalryInteraction;
  if (!self || !interaction?.actorCanPressure) return null;
  if (patch.escalationThreshold - patch.escalationLevel <= 3) return null;

  const ownScore = self.character.trophies * 3 + (self.character.salvage ?? 0);
  const eligible = new Set(
    interaction.targets.filter((target) => target.canPressure).map((target) => target.seatId)
  );
  return [...patch.players]
    .filter((player) => eligible.has(player.seatId) && player.character.status === "active")
    .map((player) => ({
      seatId: player.seatId,
      score: player.character.trophies * 3 + (player.character.salvage ?? 0)
    }))
    .filter((player) => player.score >= ownScore + 4)
    .sort((left, right) => right.score - left.score || left.seatId.localeCompare(right.seatId))[0]?.seatId ?? null;
}

/**
 * Standard Rival policy. Its only input is the same owner-private projection a
 * phone receives; it cannot inspect another player's private state or a hidden
 * deck order.
 */
export function chooseAiRivalIntent(patch: PhonePatchPayload, seatId: string): AiRivalDecision | null {
  const self = patch.self;
  if (patch.status !== "active" || !self || self.seatId !== seatId) return null;
  if (patch.tvPresentationGate || patch.movementPresentationGate) return null;

  if (patch.pendingAfflictionChoicePrivate) {
    const choice = patch.pendingAfflictionChoicePrivate;
    const stat = weakestStat(self.character.stats);
    return decision({ type: "AFFLICTION_STAT_CHOSEN", seatId, resolutionId: choice.resolutionId, stat }, "choosing a skill", "mandatory-affliction-stat");
  }
  if (patch.pendingAfflictionReactionPrivate) {
    const reaction = patch.pendingAfflictionReactionPrivate;
    const use = reaction.kind === "arrivalWound" && Boolean(reaction.targetSeatId && reaction.targetSeatId !== seatId);
    return decision({ type: "AFFLICTION_REACTION_RESOLVED", seatId, reactionId: reaction.reactionId, use, ...(use && reaction.kind !== "arrivalWound" ? { dieIndex: 0 } : {}) }, "resolving an Affliction", "mandatory-affliction-reaction");
  }
  if (patch.pendingScarChoice) {
    const scar = [...patch.pendingScarChoice.cards].sort((left, right) => left.id.localeCompare(right.id))[0];
    return scar ? decision({ type: "CHOOSE_SCAR", seatId, selectionId: patch.pendingScarChoice.selectionId, scarId: scar.id }, "choosing a Scar", "mandatory-scar") : null;
  }
  if (patch.pendingScarRemovalChoice) {
    const scar = [...patch.pendingScarRemovalChoice.cards].sort((left, right) => left.id.localeCompare(right.id))[0];
    return scar ? decision({ type: "PURGE_SCAR_REQUESTED", seatId, choiceId: patch.pendingScarRemovalChoice.choiceId, scarId: scar.id }, "resolving a Scar service", "mandatory-scar-removal") : null;
  }
  if (patch.pendingScarConsequence) {
    return decision({ type: "CONTINUE_SCAR_CONSEQUENCE", seatId, reactionId: patch.pendingScarConsequence.reactionId }, "accepting a consequence", "mandatory-scar-consequence");
  }
  if (patch.pendingEquipmentSuppressionChoice) {
    const target = [...patch.pendingEquipmentSuppressionChoice.options].sort((left, right) => left.instanceId.localeCompare(right.instanceId))[0];
    return target ? decision({ type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET", seatId, choiceId: patch.pendingEquipmentSuppressionChoice.choiceId, itemInstanceId: target.instanceId }, "choosing affected Equipment", "mandatory-equipment-suppression") : null;
  }
  if (patch.pendingGearEquipChoice) {
    const choice = patch.pendingGearEquipChoice;
    return decision({ type: "RESOLVE_GEAR_EQUIP_CHOICE", seatId, choiceId: choice.choiceId, itemInstanceId: choice.itemInstanceId, decision: "equip" }, "placing new Equipment", "mandatory-equipment-placement");
  }
  if (patch.pendingEncounterDecisionPrivate) {
    const optionId = chooseEnabledEncounterOption(patch);
    return optionId ? decision({ type: "ENCOUNTER_DECISION_REQUESTED", seatId, decisionId: patch.pendingEncounterDecisionPrivate.decisionId, decisionVersion: patch.pendingEncounterDecisionPrivate.decisionVersion, optionId }, "resolving a private encounter", "mandatory-encounter-choice") : null;
  }
  if (patch.pendingMemoryTaxChoicePrivate) {
    const choice = patch.pendingMemoryTaxChoicePrivate;
    const optionId = choice.options.some((option) => option.optionId === "lose-salvage-1") && choice.options.length > 0 && (self.character.salvage ?? 0) > 3
      ? "lose-salvage-1" as const
      : "next-non-battle-test-minus-1" as const;
    return decision({ type: "MEMORY_TAX_CHOICE_REQUESTED", seatId, choiceId: choice.choiceId, choiceVersion: choice.choiceVersion, optionId }, "paying an encounter cost", "mandatory-memory-tax");
  }
  if (patch.pendingForcedDestinationChoicePrivate) {
    const choice = patch.pendingForcedDestinationChoicePrivate;
    const target = [...choice.candidates].sort((left, right) => {
      const value = { outer: 0, middle: 1, inner: 2 } as const;
      return value[right.ring] - value[left.ring] || left.sectorId.localeCompare(right.sectorId);
    })[0];
    return target ? decision({ type: "FORCED_DESTINATION_SELECTED", seatId, choiceId: choice.choiceId, destinationSectorId: target.sectorId }, "choosing a forced route", "mandatory-forced-destination") : null;
  }
  if (patch.pendingDisplacementPrivate) {
    return decision({ type: "FORCED_DISPLACEMENT_ACCEPTED", seatId, reactionId: patch.pendingDisplacementPrivate.reactionId }, "accepting displacement", "mandatory-displacement");
  }
  if (patch.pendingMissionSelection?.status === "awaitingSelection") {
    const contract = [...patch.pendingMissionSelection.options].sort((left, right) => left.id.localeCompare(right.id))[0];
    return contract ? decision({ type: "SELECT_REPLACEMENT_CONTRACT", seatId, selectionId: patch.pendingMissionSelection.id, contractId: contract.id }, "choosing a new Contract", "mandatory-contract-replacement") : null;
  }
  if (patch.pendingMissionRelicExchange) {
    const artifact = [...patch.pendingMissionRelicExchange.options].sort((left, right) => left.id.localeCompare(right.id))[0];
    return artifact ? decision({ type: "CLAIM_MISSION_RELIC", seatId, exchangeId: patch.pendingMissionRelicExchange.id, artifactId: artifact.id }, "choosing an Artifact", "mandatory-artifact-choice") : null;
  }
  if (patch.pendingTileChallengePrivate?.pendingFailureEffects?.length) {
    return decision({ type: "CONTINUE_RESOLUTION", seatId }, "accepting challenge effects", "mandatory-challenge-effects");
  }

  if (patch.pendingEnemyRoll?.assignedRollerSeatId === seatId) {
    return decision({ type: "ENEMY_ROLL_REQUESTED", seatId }, "rolling opposition", "enemy-roll");
  }
  // Another controller owns the opposing roll. Do not fall through to the
  // encounter branch and submit the operative's combat roll a second time.
  if (patch.pendingEnemyRoll) return null;

  if (patch.edgeHand?.reaction) {
    const failed = patch.activeResolution?.roll?.success === false;
    const usable = failed
      ? [...patch.edgeHand.cards]
          .filter((card) => card.ability.enabled && card.ability.resolutionId)
          .sort((left, right) => right.edgeValue - left.edgeValue || left.id.localeCompare(right.id))[0]
      : null;
    if (usable?.ability.resolutionId) {
      const target = usable.ability.targets[0];
      return decision({ type: "PLAY_EDGE_CARD", seatId, cardId: usable.id, resolutionId: usable.ability.resolutionId, mode: "ability", ...(target ? { targetId: target.id } : {}) }, "using an Edge card", "edge-reaction");
    }
    return decision({ type: "DECLINE_EDGE_CARD_REACTION", seatId, reactionId: patch.edgeHand.reaction.id }, "keeping the current result", "decline-edge-reaction");
  }

  // Recall does not cancel mandatory choices. Resolve those first, then recruit
  // through the same eligible catalog and intent exposed to a human controller.
  if (self.character.status === "recalled") {
    if (patch.turnOrder[patch.activeSeatIndex] !== seatId) return null;
    const candidates = (patch.characterOptions ?? []).filter((option) => option.eligible && !option.developerQa && !option.character.qaOnly)
        .map((option) => option.character);
    const sector = getBoardSpace(self.sectorId);
    const trialMargin = (stats: Record<Stat, number>) => {
      const trial = sector && bestBoardCheck(sector.textBox.effectKey, stats);
      return trial?.stat ? stats[trial.stat] - (trial.difficulty ?? 0) : 0;
    };
    const replacement = sector?.tier === "inner"
      ? candidates.sort((left, right) => trialMargin(right.stats) - trialMargin(left.stats) ||
          right.stats.signal - left.stats.signal || left.id.localeCompare(right.id))[0]
      : chooseAiSetupCharacter(candidates, patch.privateRivalry?.objective?.id);
    return replacement ? decision({ type: "RECRUIT_REPLACEMENT", seatId, replacementCharacterId: replacement.id },
      "recruiting a replacement operative", "recover-recalled-operative") : null;
  }

  const resolution = patch.activeResolution;
  if (patch.characterAbilityAction?.available) {
    return decision({ type: "USE_CHARACTER_ABILITY", seatId, abilityId: patch.characterAbilityAction.abilityId },
      "preparing a character ability", "character-ability");
  }
  if (resolution?.playerId === seatId) {
    if (resolution.stage === "dice_roll") return null;
    if (resolution.roll?.success === false && resolution.stage === "roll_result" && patch.soloReroll?.available) {
      return decision({ type: "SOLO_REROLL_REQUESTED", seatId }, "using an emergency reroll", "survival-reroll");
    }
    const follower = resolution.roll?.success === false ? chooseFollowerSupport(patch) : null;
    if (follower) return decision(follower, "calling on a follower", "follower-reaction");
    const failureItem = chooseFailureItem(patch);
    if (failureItem) return decision(failureItem, "using a protective item", "item-failure-reaction");
    if (["outcome_summary", "awaiting_continue"].includes(resolution.stage)) {
      return decision({ type: "CONTINUE_RESOLUTION", seatId }, "reviewing the result", "continue-resolution");
    }
    if (resolution.stage === "roll_result") {
      if (patch.requiredAction?.allowedCommand === "continue" || patch.requiredAction?.canAct) {
        return decision({ type: "CONTINUE_RESOLUTION", seatId }, "accepting the result", "accept-roll-result");
      }
      return null;
    }
    if (resolution.stage === "card_reveal" && patch.encounter) {
      return decision({ type: "START_TILE_ENCOUNTER", seatId, encounterId: patch.encounter.id, resolutionId: resolution.id }, "facing the encounter", "start-encounter");
    }
    if (resolution.stage === "battle_setup" && patch.encounter) {
      const follower = chooseFollowerSupport(patch);
      if (follower) return decision(follower, "calling on a follower", "follower-support");
      const healing = chooseHealingItem(patch);
      if (healing) return decision(healing, "treating a Wound", "item-heal-wound");
      const equipment = bestGearIntent(patch, patch.encounter.stat);
      if (equipment) return decision(equipment, "preparing Equipment", "prepare-equipment");
      const edge = patch.edgeHand?.canCommit && patch.edgeHand.resolutionId
        // A committed value replaces a d6 (mean 3.5); low values make the
        // immediate test worse and should be saved for their reaction abilities.
        ? [...patch.edgeHand.cards].filter((card) => card.edgeValue >= 4)
            .sort((left, right) => right.edgeValue - left.edgeValue || left.id.localeCompare(right.id))[0]
        : null;
      if (edge && patch.edgeHand?.resolutionId && patch.encounter.difficulty >= 7) {
        return decision({ type: "PLAY_EDGE_CARD", seatId, cardId: edge.id, resolutionId: patch.edgeHand.resolutionId, mode: "commit-value" }, "committing an Edge card", "prepare-edge");
      }
      const battleItem = chooseBattleItem(patch);
      if (battleItem) return decision(battleItem, "boosting the battle", "item-battle-boost");
      const intent: ClientIntent = patch.encounter.cardType === "enemy"
        ? { type: "COMBAT_REQUESTED", seatId, stat: patch.encounter.stat }
        : { type: "CHECK_REQUESTED", seatId, stat: patch.encounter.stat };
      return decision(intent, patch.encounter.cardType === "enemy" ? "entering battle" : "attempting a challenge", "roll-encounter");
    }
  }

  const ownCheckStats = patch.players.find((player) => player.seatId === seatId)?.character.effectiveStats ?? self.character.stats;
  if (patch.phase === "navigation" && patch.innerApproach && patch.requiredAction?.actorSeatId === seatId) {
    if (patch.scenarioState?.confrontation.repelled) {
      const retreat = patch.innerApproach.options.find((option) => option.direction === "retreat" && !option.disabledReason);
      if (retreat) return decision({ type: "INNER_APPROACH_MOVE_REQUESTED", seatId,
        destinationSectorId: retreat.sectorId, movementRevision: patch.innerApproach.revision },
        "returning to scenario objectives", "retreat-from-repelled-finale");
    }
    if (!patch.innerApproach.challengeCleared) {
      const boardSpace = getBoardSpace(self.sectorId);
      const choiceId = boardSpace && bestBoardCheck(boardSpace.textBox.effectKey, ownCheckStats)?.id;
      return decision({ type: "RESOLVE_SPACE_TEXT", seatId, ...(choiceId ? { choiceId } : {}) }, "clearing the inner approach", "inner-approach-challenge");
    }
    const option = [...patch.innerApproach.options]
      .filter((entry) => !entry.disabledReason)
      .sort((left, right) => Number(right.direction === "advance") - Number(left.direction === "advance") || left.sectorId.localeCompare(right.sectorId))[0];
    return option ? decision({ type: "INNER_APPROACH_MOVE_REQUESTED", seatId, destinationSectorId: option.sectorId, movementRevision: patch.innerApproach.revision }, "advancing through the Reach", "inner-approach-move") : null;
  }

  if (patch.phase === "navigation" && patch.requiredAction?.actorSeatId === seatId) {
    const planner = patch.movementPlanner;
    if (planner?.active) {
      const target = chooseDestination(planner.destinations, patch);
      if (!target) return null;
      return decision({ type: "MOVE_REQUESTED", seatId, toSectorId: target.sectorId, routeId: target.defaultRouteId ?? target.routeId, movementRevision: planner.movementRevision, ...(target.voidKeyPrompt ? { voidKeyInstanceId: target.voidKeyPrompt.instanceId } : {}) }, "choosing a route", "movement-destination");
    }
    const tier = [...(patch.tierTransitions?.options ?? [])]
      .filter((entry) => !(entry.toRing === "inner" && entry.direction === "inward" && patch.scenarioState?.confrontation.repelled)
        && (!entry.disabledReason || entry.voidKeyPrompt) && (entry.direction === "inward" || isScenarioConfrontationSpace(self.sectorId)))
      .sort((left, right) => Number(right.direction === "inward") - Number(left.direction === "inward") || left.sectorId.localeCompare(right.sectorId))[0];
    const collectingInOuter = seeksGate(patch) && getBoardSpace(self.sectorId)?.tier === "outer" && !holdsArtifact(patch)
      && patch.sectors.some((sector) => getBoardSpace(sector.id)?.tier === "outer" && hasArtifactCache(sector));
    if (tier && patch.tierTransitions && !collectingInOuter) {
      return decision({ type: "TIER_TRANSITION_REQUESTED", seatId, destinationSectorId: tier.sectorId, movementRevision: patch.tierTransitions.revision, ...(tier.voidKeyPrompt ? { voidKeyInstanceId: tier.voidKeyPrompt.instanceId } : {}) }, "crossing a tier gate", "tier-transition");
    }
    const aid = patch.transitionRouteAid;
    if (aid && holdsArtifact(patch) && seeksGate(patch) && aid.sources[0]) {
      const destination = aid.destinations.find((candidate) => BOARD_RING_TRANSITIONS.some((edge) =>
        edge.sourceSectorId === candidate.sectorId && edge.direction === "inward" &&
        (!edge.allowedFrom.length || edge.allowedFrom.includes(candidate.sectorId))));
      if (destination) {
        const source = aid.sources[0];
        return decision({ type: "USE_TRANSITION_ROUTE_AID", seatId, sourceKind: source.sourceKind,
          instanceId: source.instanceId, destinationSectorId: destination.sectorId, movementRevision: aid.revision },
          "navigating to a tier crossing", "gate-route-aid");
      }
    }
    return decision({ type: "MOVEMENT_ROLL_REQUESTED", seatId }, "rolling movement", "movement-roll");
  }

  if (patch.phase === "action" && patch.requiredAction?.actorSeatId === seatId) {
    if (patch.encounter) {
      const follower = chooseFollowerSupport(patch);
      if (follower) return decision(follower, "calling on a follower", "follower-support");
      const healing = chooseHealingItem(patch);
      if (healing) return decision(healing, "treating a Wound", "item-heal-wound");
      const equipment = bestGearIntent(patch, patch.encounter.stat);
      if (equipment) return decision(equipment, "preparing Equipment", "prepare-equipment");
      if (resolution?.stage === "card_reveal") {
        return decision({ type: "START_TILE_ENCOUNTER", seatId, encounterId: patch.encounter.id, resolutionId: resolution.id }, "facing the encounter", "start-encounter");
      }
      const battleItem = chooseBattleItem(patch);
      if (battleItem) return decision(battleItem, "boosting the battle", "item-battle-boost");
      const intent: ClientIntent = patch.encounter.cardType === "enemy"
        ? { type: "COMBAT_REQUESTED", seatId, stat: patch.encounter.stat }
        : { type: "CHECK_REQUESTED", seatId, stat: patch.encounter.stat };
      return decision(intent, patch.encounter.cardType === "enemy" ? "entering battle" : "attempting a challenge", "resolve-encounter");
    }

    const completedContracts = (patch.activeContractCards ?? (patch.activeContractCard ? [patch.activeContractCard] : []))
      .filter((contract) => {
        const active = (self.character.activeContracts ?? []).find((entry) => entry.contractId === contract.id)
          ?? (self.character.activeContract?.contractId === contract.id ? self.character.activeContract : null);
        return active && isContractObjectiveComplete(contract, active);
      });
    const scenario = patch.activeScenario;
    const winningContract = scenario && AI_RIVAL_SUPPORTED_SCENARIO_IDS.has(scenario.id) && scenario.progress + 1 >= scenario.threshold
      ? completedContracts.find((contract) => matchesScenarioObjective(scenario.id, {
          type: "contractCompleted", contractId: contract.id
        }))
      : undefined;
    if (winningContract) {
      return decision({ type: "COMPLETE_CONTRACT", seatId, contractId: winningContract.id },
        "completing the scenario", "finish-scenario-contract");
    }

    if (isScenarioConfrontationSpace(self.sectorId) && patch.scenarioState?.confrontation.locked === false &&
        !patch.scenarioState.confrontation.repelled &&
        !patch.activeResolution && !patch.pendingCooperativeTest && patch.gameMode !== "nemesis_relay") {
      return decision({ type: "SCENARIO_CONFRONTATION_REQUESTED", seatId }, "confronting the scenario threat", "scenario-confrontation");
    }

    const follower = chooseFollowerSupport(patch);
    if (follower) return decision(follower, "calling on a follower", "follower-support");
    const healing = chooseHealingItem(patch);
    if (healing) return decision(healing, "treating a Wound", "item-heal-wound");

    const boardSpace = getBoardSpace(self.sectorId);
    const sector = patch.sectors.find((entry) => entry.id === self.sectorId);
    const mayResolveSpace = boardSpace && (boardSpace.tier === "center" || boardSpace.tier === "inner"
      || (patch.sectorExplorationSummary ? !patch.sectorExplorationSummary.sectorTextLocked : (sector?.encounterDecks.threat.length ?? 0) === 0));
    const objectiveAction = boardSpace && matchesScenarioObjective(patch.activeScenario?.id, {
      type: "sectorActionCompleted", effectKey: boardSpace.textBox.effectKey, sectorId: self.sectorId
    });
    const optionalBoardAction = patch.tileArrival?.seatId === seatId && patch.tileArrival.rules.some((rule) =>
      rule.kind === "board-action" && rule.supported && (rule.status === "optional" || rule.status === "current"));
    const pursuingGate = boardSpace?.tier === "inner" || (sector && !holdsArtifact(patch) && hasArtifactCache(sector));
    // Leave room for a two-Wound loss and the next round's pressure tick.
    const normalMargin = patch.activeSeatIndex === patch.turnOrder.length - 1 ? 3 : 2;
    const safetyMargin = pursuingGate ? 1 : normalMargin;
    if (patch.escalationLevel > 0 && patch.escalationThreshold - patch.escalationLevel <= safetyMargin) {
      return decision(
        { type: "STABILIZE_REQUESTED", seatId },
        "stabilizing the Reach",
        "prevent-table-defeat"
      );
    }

    if (boardSpace && !patch.innerApproach?.challengeCleared && boardSpace.textBox.intent !== "scenario-confrontation" && ((mayResolveSpace && patch.requiredAction.allowedCommand === null)
      || ((objectiveAction || pursuingGate) && optionalBoardAction && !patch.sectorExplorationSummary?.sectorTextLocked))) {
      const trial = bestBoardCheck(boardSpace.textBox.effectKey, ownCheckStats);
      const equipment = trial?.stat && bestGearIntent(patch, trial.stat);
      if (equipment) return decision(equipment, "equipping for the sector trial", "prepare-sector-trial");
      const choiceId = trial?.id ?? boardSpace.textBox.choices?.[0]?.id;
      return decision({ type: "RESOLVE_SPACE_TEXT", seatId, ...(choiceId ? { choiceId } : {}) }, "resolving the sector", "sector-action");
    }

    const shopIntent = chooseShopIntent(patch);
    if (shopIntent) return decision(shopIntent, "visiting a market", "shop-action");

    if (completedContracts[0]) {
      return decision({ type: "COMPLETE_CONTRACT", seatId, contractId: completedContracts[0].id }, "completing a Contract", "complete-contract");
    }

    if (patch.privateRivalry?.reveal.available) {
      return decision({ type: "RIVALRY_AGENDA_REVEAL_REQUESTED", seatId }, "revealing an agenda", "reveal-agenda");
    }

    const pressureTargetSeatId = chooseRivalryPressureTarget(patch);
    if (pressureTargetSeatId) {
      return decision(
        {
          type: "TABLE_INTERACTION",
          seatId,
          targetSeatId: pressureTargetSeatId,
          interactionKind: "interfere"
        },
        "pressuring the leader",
        "bounded-rivalry-pressure"
      );
    }

    if (patch.requiredAction.allowedCommand === "finish-actions") {
      // Most actions hand the turn off automatically, so Experience alone is
      // not a reliable opportunity to invest earned trophies.
      const training = chooseTrainingIntent(patch);
      if (training) return decision(training, "training a skill with trophies", "setup-training");
      return decision({ type: "PHASE_ADVANCED", seatId, toPhase: "resolution" }, "ending its actions", "finish-actions");
    }
  }

  if (patch.phase === "broadcast" && patch.requiredAction?.actorSeatId === seatId) {
    // Experience training does not consume the next turn's sector action.
    if (patch.requiredAction.allowedCommand === "end-turn" && patch.requiredAction.canAct) {
      const training = chooseTrainingIntent(patch);
      if (training) return decision(training, "training a skill with trophies", "experience-training");
    }
    return decision({ type: "PHASE_ADVANCED", seatId, toPhase: "start" }, "ending its turn", "end-turn");
  }

  return null;
}

export function describeAiAgendaPriority(patch: PhonePatchPayload): string {
  const objective = patch.privateRivalry?.objective;
  return objective ? `${objective.id}:${objective.progress}/${objective.target}` : "no-private-agenda";
}

export function chooseAiSetupStat(agendaId: string | null | undefined): Stat {
  switch (agendaId) {
    case "claim-trophies": return "grit";
    case "secure-salvage": return "guile";
    case "finish-contracts": return "command";
    case "stay-clean": return "signal";
    default: return "forge";
  }
}

export function chooseAiSetupCharacter<T extends { id: string; stats: Record<Stat, number> }>(characters: T[], agendaId: string | null | undefined): T | null {
  const preferred = chooseAiSetupStat(agendaId);
  return [...characters].sort((left, right) => right.stats[preferred] - left.stats[preferred] || right.stats.grit - left.stats.grit || left.id.localeCompare(right.id))[0] ?? null;
}

export function chooseAiStartingBonus<T extends { kind: "gear" | "follower"; id: string }>(options: T[]): T | null {
  return [...options].sort((left, right) => Number(right.kind === "gear") - Number(left.kind === "gear") || left.id.localeCompare(right.id))[0] ?? null;
}

export function chooseAiPreferredStat(patch: PhonePatchPayload): Stat {
  return bestStat(patch.self?.character.stats ?? { command: 0, grit: 0, signal: 0, guile: 0, forge: 0 });
}
