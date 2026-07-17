import type {
  AcceptContractAction,
  AdjustMovementRequestedAction,
  SelectRouteStarVariantAction,
  SelectEquipmentSuppressionTargetAction,
  ClearRouteStarChoiceAction,
  ActivateGateSaintAction,
  UseMarrowDetourAction,
  AfflictionDrawnAction,
  CheckRequestedAction,
  CombatRequestedAction,
  CompleteContractAction,
  DiceRollStartedAction,
  EscalationAdvancedAction,
  EncounterDrawnAction,
  EnemyRollAssignedAction,
  EquipGearAction,
  EnemyRollRequestedAction,
  GameAction,
  MovementResolvedAction,
  MovementRolledAction,
  MovementRollRequestedAction,
  MoveRequestedAction,
  NemesisCombatResolvedAction,
  NemesisDefeatedAction,
  NemesisMovedAction,
  NemesisNexusCountdownStartedAction,
  NemesisSpawnedAction,
  RecruitReplacementAction,
  ResolutionAppliedAction,
  EncounterDecisionResolvedAction,
  MemoryTaxChoiceResolvedAction,
  ForcedDestinationSelectedAction,
  ForcedDisplacementResolvedAction,
  SutureStormContinuedAction,
  ResolutionContinuedAction,
  RivalryAgendaRevealedAction,
  RivalryAgendaProgressTriggeredAction,
  RoundCompletedAction,
  SectorCollapsedAction,
  SpaceTextResolvedAction,
  ShopSkippedAction,
  ShopPurchaseResolvedAction,
  ShopSellResolvedAction,
  ShopServiceResolvedAction,
  ShopServiceCost,
  ShopStockRevealedAction,
  ScenarioProgressAdvancedAction,
  ScenarioPreparationGainedAction,
  ScenarioPreparationSpentAction,
  ScenarioConfrontationStartedAction,
  ScenarioConfrontationProgressGainedAction,
  ScenarioObjectiveCompletedAction,
  ScenarioObjectiveProgressTriggeredAction,
  ScenarioConfrontationRequestedAction,
  ScenarioVictoryAchievedAction,
  SoloRerollResolvedAction,
  StabilizeResolvedAction,
  StatRaisedAction,
  TableInteractionAction,
  WoundThresholdReachedAction,
  UnequipGearAction,
  UseFollowerAction,
  UseGearAction,
  RollModifierSource
} from "./actions.js";
import { getHeldGearInstance, getHeldGearItem } from "./gear.js";
import { canAdvancePhase, canResolveMovement } from "./phases.js";
import { getEscalationCollapseLevel, getEscalationModifier } from "./escalation.js";
import type { EncounterEffect, ThreatCard } from "../schema/card.schema.js";
import type { EncounterPaymentEffect, EncounterPaymentResult } from "../schema/encounterDecision.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { ActiveResolution, GameState, PlayerState } from "../schema/session.schema.js";
import type { GearSlot } from "../schema/gear.schema.js";
import type { TrophyPileEntry } from "../schema/character.schema.js";
import { applyMovementDieAfflictions, resolveAfflictionDraw } from "../rules/afflictions.js";
import { buildPendingScarConsequences, getMatchingScarTriggers } from "../rules/scarTriggers.js";
import {
  applyLegacyCompatibilityNoop,
  isLegacyCompatibilityNoopEffect,
  summarizeLegacyCompatibilityNoop
} from "../rules/legacyHeatCompatibility.js";
import {
  GLASS_CHIME_SWARM_ID,
  GLASS_CHIME_SWARM_MODIFIER_AMOUNT,
  GLASS_CHIME_SWARM_MODIFIER_LABEL,
  clearAllNextNonBattleTestModifiers,
  clearNextNonBattleTestModifierForSeat,
  consumeNextNonBattleTestModifier,
  consumeReservedSirenRelayEchoModifier,
  consumeReservedMemoryTaxGateModifier,
  createOrReplaceMemoryTaxGateModifier,
  createOrReplaceNextNonBattleTestModifier,
  createOrReplaceSirenRelayEchoModifier,
  getPendingNextNonBattleTestModifier,
  getPendingSirenRelayEchoModifier,
  reserveSirenRelayEchoModifier,
  reserveMemoryTaxGateModifier,
  MEMORY_TAX_GATE_ID,
  SIREN_RELAY_ECHO_ID,
  SIREN_RELAY_ECHO_MODIFIER_LABEL
} from "../rules/nextNonBattleTestModifier.js";
import {
  SPINDLE_STATIC_SQUALL_ID,
  SPINDLE_STATIC_SQUALL_MINIMUM_RESULT,
  SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT,
  SPINDLE_STATIC_SQUALL_MODIFIER_LABEL,
  clearAllNextNormalMovementRollModifiers,
  clearNextNormalMovementRollModifierForSeat,
  consumeNextNormalMovementRollModifier,
  createOrReplaceNextNormalMovementRollModifier,
  getPendingNextNormalMovementRollModifier,
  resolveNormalMovementAllowance
} from "../rules/nextNormalMovementRollModifier.js";
import type { ScarSourceEvent } from "../schema/scarTrigger.schema.js";
import { getBoardSpace, isScenarioConfrontationSpace } from "../data/boardSpaces.js";
import { getForcedDisplacementDestination, getOwnerSelectedForcedDisplacementCandidates, getLegalMovementRoute, getLegalMovementRouteVariant, getMovementBlockReason, getVoidKeyMovementRoute, getMovementStepBlockReason } from "../rules/movementPlanner.js";
import { RIFTFALL_BOARD_NODE_INDEX } from "../../data/riftfallBoardNodes.js";
import { canRiftAnchorSpikeSuppress } from "../rules/forcedDisplacement.js";
import { resolveFloorZeroSalvageLoss, THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS } from "../rules/salvageLoss.js";
import { isBoardSpaceShopCapable, SHOP_FAILURE_REASONS } from "../rules/shopAvailability.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  isUpgradeableStat,
  NORMAL_STAT_UPGRADE_CAP
} from "../rules/statUpgrades.js";
import {
  advanceContractObjectiveProgress,
  getContractObjectiveTarget,
  formatContractObjectiveStatus,
  describeContractObjective,
  isContractObjectiveComplete
} from "../contracts/objectives.js";
import {
  applyEquipmentSuppressionChoice,
  completeEquipmentSuppressionLifecycle,
  createPendingEquipmentSuppressionChoice,
  ensureOwnedGearInstanceIds,
  getEligibleEquipmentSuppressionTargets,
  normalizeEquipmentSuppressionState,
  reserveEquipmentSuppressions
} from "../rules/equipmentSuppression.js";

export interface ReducerRejection {
  reason: string;
  actionType: GameAction["type"];
}

export interface ReducerSuccess {
  ok: true;
  state: GameState;
  emitted: GameAction[];
}

export interface ReducerFailure {
  ok: false;
  state: GameState;
  rejection: ReducerRejection;
}

export type ReducerResult = ReducerSuccess | ReducerFailure;

const RECENT_ENCOUNTER_LIMIT = 12;
const MASTER_ALPHA_ID = "char_master_alpha";
const MASTER_ALPHA_DEATHLESS_ABILITY_ID = "qa_deathless_protocol";

function recordRecentEncounterCardId(state: GameState, cardId: string | null | undefined): string[] | undefined {
  if (!cardId) {
    return state.recentEncounterCardIds;
  }

  const existing = state.recentEncounterCardIds ?? [];
  return [...existing.filter((entry) => entry !== cardId), cardId].slice(-RECENT_ENCOUNTER_LIMIT);
}

function beginScarTriggerEvent(state: GameState, event: ScarSourceEvent, createdAt: string): GameState {
  if ((state.resolvedScarSourceEventIds ?? []).includes(event.id)) return state;
  const matches = getMatchingScarTriggers(state, event);
  const immediate = matches.filter((entry) => !entry.reactionRequired);
  const pending = buildPendingScarConsequences(state, event, createdAt);
  const afterImmediate = immediate.reduce((next, entry) => applyEffectToState(next, event.seatId, entry.effect), state);
  return {
    ...afterImmediate,
    pendingScarConsequence: afterImmediate.pendingScarConsequence ?? pending[0] ?? null,
    pendingScarConsequenceQueue: [
      ...(afterImmediate.pendingScarConsequenceQueue ?? []),
      ...(afterImmediate.pendingScarConsequence ? pending : pending.slice(1))
    ],
    resolvedScarSourceEventIds: [...(afterImmediate.resolvedScarSourceEventIds ?? []), event.id]
  };
}

function getActiveSeatId(state: GameState): string {
  const activeSeatId = state.turnOrder[state.activeSeatIndex];

  if (!activeSeatId) {
    throw new Error("Active turn-order index is out of bounds");
  }

  return activeSeatId;
}

function hasMasterAlphaDeathlessTriggered(state: GameState, seatId: string): boolean {
  return state.eventLog.some((entry) => {
    const event = entry as { type?: string; seatId?: string; abilityId?: string } | undefined;
    return (
      event?.type === "ABILITY_TRIGGERED" &&
      event.seatId === seatId &&
      event.abilityId === MASTER_ALPHA_DEATHLESS_ABILITY_ID
    );
  });
}

function requirePlayer(state: GameState, seatId: string): PlayerState {
  const player = state.players.find((entry) => entry.seatId === seatId);

  if (!player) {
    throw new Error(`Missing player for seat ${seatId}`);
  }

  return player;
}

function ensureSeatTurn(state: GameState, seatId: string): void {
  if (getActiveSeatId(state) !== seatId) {
    throw new Error(`Seat ${seatId} cannot act outside its turn`);
  }
}

function ensureSeatCanTakeNormalTurnAction(state: GameState, seatId: string): void {
  const player = requirePlayer(state, seatId);

  if (player.character.status === "recalled") {
    throw new Error(`Seat ${seatId} must recruit a replacement before acting`);
  }
}

function getNextActiveSeatIndex(state: GameState): number {
  return (state.activeSeatIndex + 1) % Math.max(state.turnOrder.length, 1);
}

function clearMovementRollForSeat(state: GameState, seatId: string): GameState["movementRolls"] {
  if (!state.movementRolls?.[seatId]) {
    return state.movementRolls;
  }

  const nextMovementRolls = { ...state.movementRolls };
  delete nextMovementRolls[seatId];
  return Object.keys(nextMovementRolls).length > 0 ? nextMovementRolls : undefined;
}
function clearMovementAdjustmentForSeat(state: GameState, seatId: string): GameState["movementAdjustments"] {
  if (!state.movementAdjustments?.[seatId]) return state.movementAdjustments;
  const next = { ...state.movementAdjustments }; delete next[seatId]; return Object.keys(next).length ? next : undefined;
}

function getCompletedRoundFromEventLog(state: GameState): number {
  return (
    state.eventLog.filter((entry) => {
      const event = entry as { type?: string } | undefined;
      return event?.type === "ROUND_COMPLETED";
    }).length + 1
  );
}

function ensureLegalMovementRoute(state: GameState, seatId: string, toSectorId: string, routeId?: string, movementRevision?: number): void {
  if ((routeId === undefined) !== (movementRevision === undefined)) {
    throw new Error("Explicit movement route requires both route ID and movement revision");
  }
  const route = routeId && movementRevision !== undefined
    ? getLegalMovementRouteVariant(state, seatId, toSectorId, routeId, movementRevision)
    : getLegalMovementRoute(state, seatId, toSectorId);

  if (route) {
    return;
  }

  throw new Error(getMovementBlockReason(state, seatId, toSectorId) ?? `Sector ${toSectorId} is not reachable by the current movement value`);
}

function canResolveSpaceText(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot resolve space text during phase ${state.phase}`);
  }

  if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
    throw new Error("Resolve the current threat before using the sector text");
  }

  const player = requirePlayer(state, seatId);
  const boardSpace = getBoardSpace(player.character.currentSpaceId);

  if (!boardSpace) {
    throw new Error(`No board text is registered for ${player.character.currentSpaceId}`);
  }

  if (boardSpace.textBox.intent === "scenario-confrontation") {
    throw new Error("Resolve the scenario confrontation from this core chamber instead of sector text");
  }

  const sector = state.sectors.find((entry) => entry.id === player.character.currentSpaceId);

  if (!sector) {
    throw new Error(`Unknown sector ${player.character.currentSpaceId}`);
  }

  if ((boardSpace.tier === "outer" || boardSpace.tier === "middle") && sector.encounterDecks.threat.length > 0) {
    throw new Error("Clear the local threat deck before resolving this sector text");
  }
}

function reject(state: GameState, action: GameAction, reason: string): ReducerFailure {
  return {
    ok: false,
    state,
    rejection: {
      reason,
      actionType: action.type
    }
  };
}

function succeed(state: GameState, emitted: GameAction[] = []): ReducerSuccess {
  const normalizedState = normalizeEquipmentSuppressionState(state);
  const choiceOwnerActive = normalizedState.pendingMemoryTaxChoice
    ? normalizedState.players.some((player) =>
        player.seatId === normalizedState.pendingMemoryTaxChoice!.ownerSeatId && player.character.status === "active"
      )
    : true;
  const choiceNormalizedState = normalizedState.pendingMemoryTaxChoice && (!choiceOwnerActive || normalizedState.status === "ended")
    ? {
        ...normalizedState,
        resolvedMemoryTaxChoiceSourceEventIds: [
          ...(normalizedState.resolvedMemoryTaxChoiceSourceEventIds ?? []),
          normalizedState.pendingMemoryTaxChoice.sourceEventId
        ],
        pendingMemoryTaxChoice: null
      }
    : normalizedState;
  const activeState = choiceNormalizedState.status === "ended"
    ? clearAllNextNormalMovementRollModifiers(clearAllNextNonBattleTestModifiers(choiceNormalizedState))
    : choiceNormalizedState.players
        .filter((player) => player.character.status === "recalled")
        .reduce(
          (nextState, player) => clearNextNormalMovementRollModifierForSeat(
            clearNextNonBattleTestModifierForSeat(nextState, player.seatId),
            player.seatId
          ),
          normalizedState
        );
  return {
    ok: true,
    state: activeState,
    emitted
  };
}

function summarizeEffect(effect: EncounterEffect | null, success: boolean | null): string {
  const prefix = success === null ? "Resolution:" : success ? "Success:" : "Failure:";
  if (!effect) return `${prefix} no additional effect.`;
  if (isLegacyCompatibilityNoopEffect(effect)) return summarizeLegacyCompatibilityNoop(prefix);

  switch (effect.type) {
    case "take_wound":
      return `${prefix} take ${effect.amount} wound${effect.amount === 1 ? "" : "s"}.`;
    case "heal_wound":
      return `${prefix} heal ${effect.amount} wound${effect.amount === 1 ? "" : "s"}.`;
    case "gain_trophy":
      return `${prefix} gain ${effect.amount} Troph${effect.amount === 1 ? "y" : "ies"}.`;
    case "gain_salvage":
      return `${prefix} gain ${effect.amount} Salvage.`;
    case "lose_salvage":
      return `${prefix} lose up to ${effect.amount} Salvage (minimum 0).`;
    case "gain_scar":
      return `${prefix} gain scar ${effect.scarId}.`;
    case "gain_gear":
      return `${prefix} gain gear ${effect.gearId}.`;
    case "draw_artifact":
      return `${prefix} draw 1 local artifact.`;
    case "consume_artifact":
      return `${prefix} artifact ${effect.artifactId} leaves ${effect.sourceSectorId ?? "this space"}.`;
    case "gain_follower":
      return `${prefix} gain follower ${effect.follower?.name ?? effect.followerId}.`;
    case "gain_note":
      return `${prefix} note added: ${effect.text}`;
    case "advance_scenario":
      return `${prefix} advance scenario progress ${effect.progressKey} by ${effect.amount}.`;
    case "advance_escalation":
      return `${prefix} advance escalation by ${effect.amount}.`;
    case "gain_global_escalation_guarded":
      return `${prefix} advance Global Escalation by 1 unless it is already one step from collapse.`;
    case "return_threat_to_space":
      return effect.threatId
        ? `${prefix} ${effect.threatId} remains on ${effect.sourceSectorId ?? "this space"}.`
        : `${prefix} the threat remains on this space.`;
    case "next_non_battle_test_modifier":
      return effect.sourceCardId === SIREN_RELAY_ECHO_ID
        ? `${prefix} your next non-battle Command test is ${effect.amount > 0 ? "+" : ""}${effect.amount}.`
        : `${prefix} the swarm breaks your concentration. Your next non-battle test is ${effect.amount}.`;
    case "next_normal_movement_roll_modifier":
      return `${prefix} the squall corrupts your bearing. Your next normal movement roll is ${effect.amount}, minimum ${effect.minimumResult}.`;
    case "equipment_suppression":
      return effect.mode === "throughNextThreat"
        ? `${prefix} choose one equipped normal Equipment. It provides no effects through your next Threat.`
        : `${prefix} choose one equipped normal Equipment. It provides no effects during your next battle.`;
    case "memory_tax_choice":
      return `${prefix} choose to lose 1 Salvage or suffer -1 on your next non-battle test.`;
    case "encounter_payment":
      return `${prefix} ${effect.prompt}`;
    case "forcedDisplacement":
      return `${prefix} forced displacement pending.`;
    case "ownerSelectedForcedDisplacement":
      return `${prefix} choose a legal false route.`;
    case "sequence":
      return effect.effects.map((entry: EncounterEffect) => summarizeEffect(entry, success)).join(" ");
    default: {
      const exhaustiveCheck: never = effect;
      return exhaustiveCheck;
    }
  }
}

function applyEffectToPlayer(player: PlayerState, effect: EncounterEffect): PlayerState {
  if (isLegacyCompatibilityNoopEffect(effect)) return applyLegacyCompatibilityNoop(player, effect);
  switch (effect.type) {
    case "encounter_payment":
    case "forcedDisplacement":
    case "ownerSelectedForcedDisplacement":
    case "equipment_suppression":
    case "memory_tax_choice":
      return player;
    case "take_wound":
      return {
        ...player,
        character: {
          ...player.character,
          wounds: player.character.wounds + effect.amount
        }
      };
    case "heal_wound":
      return {
        ...player,
        character: {
          ...player.character,
          wounds: Math.max(0, player.character.wounds - effect.amount)
        }
      };
    case "gain_trophy":
      return {
        ...player,
        character: {
          ...player.character,
          trophies: player.character.trophies + effect.amount
        }
      };
    case "gain_salvage":
      return {
        ...player,
        character: {
          ...player.character,
          salvage: (player.character.salvage ?? 0) + effect.amount
        }
      };
    case "lose_salvage":
      return {
        ...player,
        character: {
          ...player.character,
          salvage: Math.max(0, (player.character.salvage ?? 0) - effect.amount)
        }
      };
    case "gain_scar":
      return {
        ...player,
        character: {
          ...player.character,
          scars: [...player.character.scars, effect.scarId]
        }
      };
    case "gain_gear":
      return addHeldGearToPlayer(player, effect);
    case "draw_artifact":
    case "consume_artifact":
      return player;
    case "gain_follower":
      return addFollowerToPlayer(player, effect);
    case "gain_note":
      return {
        ...player,
        private: {
          ...player.private,
          notes: [...player.private.notes, effect.text]
        }
      };
    case "advance_escalation":
    case "gain_global_escalation_guarded":
    case "advance_scenario":
    case "return_threat_to_space":
    case "next_non_battle_test_modifier":
    case "next_normal_movement_roll_modifier":
      return player;
    case "sequence":
      return effect.effects.reduce(
        (nextPlayer: PlayerState, entry: EncounterEffect) => applyEffectToPlayer(nextPlayer, entry),
        player
      );
    default: {
      const exhaustiveCheck: never = effect;
      return exhaustiveCheck;
    }
  }
}

function updateActivePlayer(
  state: GameState,
  seatId: string,
  updater: (player: PlayerState) => PlayerState
): PlayerState[] {
  return state.players.map((entry) => (entry.seatId === seatId ? updater(entry) : entry));
}

function addHeldGearToPlayer(
  player: PlayerState,
  effect: Extract<EncounterEffect, { type: "gain_gear" }>
): PlayerState {
  if (!effect.gear) {
    return player;
  }

  const alreadyHeld = player.character.heldGear.some((item) => item.id === effect.gear?.id);

  if (alreadyHeld) {
    return player;
  }

  return {
    ...player,
    character: {
      ...player.character,
      heldGear: [...player.character.heldGear, effect.gear]
    }
  };
}

function applyEncounterPaymentResult(state: GameState, seatId: string, result: EncounterPaymentResult): GameState {
  if (result.type === "none") return state;
  return applyEffectToState(state, seatId, result);
}

function summarizeEncounterPaymentResult(result: EncounterPaymentResult): string {
  if (result.type === "none") return result.summary ?? "The encounter continues.";
  if (result.type === "heal_wound") return "Healed 1 Wound.";
  return result.text;
}

function createPendingEncounterDecision(
  state: GameState,
  action: ResolutionAppliedAction,
  effect: EncounterPaymentEffect
): NonNullable<GameState["pendingEncounterDecision"]> {
  const sourceResolutionId = state.activeResolution?.id ?? `${action.seatId}:${action.sourceCardId ?? "encounter"}:${state.sequence}`;
  const decisionId = `${sourceResolutionId}:${effect.decisionKey}`;
  const affordable = (requirePlayer(state, action.seatId).character.salvage ?? 0) >= effect.salvageCost;
  const legalOptionIds = affordable
    ? [effect.paidOptionId, ...(effect.mode === "optional" && effect.declineOptionId ? [effect.declineOptionId] : [])]
    : effect.mode === "optional" && effect.declineOptionId
      ? [effect.declineOptionId]
      : ["unavailable"];
  return {
    decisionId,
    decisionVersion: state.sequence + 1,
    seatId: action.seatId,
    sourceCardId: action.sourceCardId ?? state.currentEncounter?.id ?? "unknown-encounter",
    sourceResolutionId,
    sourceBranch: action.success === true ? "defeatReward" : "woundOnLoss",
    decisionKey: effect.decisionKey,
    mode: effect.mode,
    prompt: effect.prompt,
    salvageCost: effect.salvageCost,
    paidOptionId: effect.paidOptionId,
    paidLabel: effect.paidLabel,
    paidEffect: effect.paidEffect,
    declineOptionId: effect.declineOptionId ?? null,
    declineLabel: effect.declineLabel ?? null,
    declineEffect: effect.declineEffect ?? null,
    unavailableEffect: effect.unavailableEffect,
    legalOptionIds,
    createdAt: action.createdAt,
    status: "pending"
  };
}

function createPendingDisplacement(
  state: GameState,
  action: ResolutionAppliedAction,
  effect: Extract<EncounterEffect, { type: "forcedDisplacement" }>,
  destinationSectorId: string,
  sourceResolutionIdOverride?: string,
  sourceChoiceId?: string
): NonNullable<GameState["pendingDisplacement"]> {
  const player = requirePlayer(state, action.seatId);
  const sourceResolutionId = sourceResolutionIdOverride ?? state.activeResolution?.id ?? `${action.seatId}:${action.sourceCardId ?? "encounter"}:${state.sequence}`;
  const sourceEventId = `${sourceResolutionId}:forced-displacement`;
  return {
    reactionId: `displacement:${sourceEventId}`,
    seatId: action.seatId,
    sourceType: "threat",
    sourceId: action.sourceCardId ?? state.currentEncounter?.id ?? "unknown-encounter",
    sourceEventId,
    sourceResolutionId,
    sourceChoiceId,
    originSectorId: player.character.currentSpaceId,
    destinationSectorId,
    direction: effect.direction,
    distance: effect.distance,
    sameRing: effect.sameRing,
    fallbackEffect: effect.fallbackEffect ?? null,
    failureStillCounts: effect.failureStillCounts,
    createdAt: action.createdAt,
    status: "pending"
  };
}

function extractSutureStormDisplacement(effect: EncounterEffect): {
  remainingEffect: EncounterEffect | null;
  displacement: Extract<EncounterEffect, { type: "forcedDisplacement" }> | null;
} {
  if (effect.type === "forcedDisplacement") {
    return { remainingEffect: null, displacement: effect };
  }
  if (effect.type !== "sequence") {
    return { remainingEffect: effect, displacement: null };
  }

  let displacement: Extract<EncounterEffect, { type: "forcedDisplacement" }> | null = null;
  const remaining: EncounterEffect[] = [];
  for (const entry of effect.effects) {
    const extracted = extractSutureStormDisplacement(entry);
    if (extracted.displacement) {
      if (displacement) return { remainingEffect: effect, displacement: null };
      displacement = extracted.displacement;
    }
    if (extracted.remainingEffect) remaining.push(extracted.remainingEffect);
  }
  return {
    remainingEffect: remaining.length === 0 ? null : remaining.length === 1 ? remaining[0]! : { type: "sequence", effects: remaining },
    displacement
  };
}

function getThreatResolutionSourceId(state: GameState, seatId: string, cardId: string): string {
  if (state.activeResolution?.id) return state.activeResolution.id;
  const source = [...state.eventLog].reverse().find((entry) => {
    const candidate = entry as { type?: string; seatId?: string; cardId?: string; success?: boolean; createdAt?: string };
    return ["CHECK_ROLLED", "SOLO_REROLL_RESOLVED", "COMBAT_RESOLVED"].includes(candidate.type ?? "") &&
      candidate.seatId === seatId && candidate.cardId === cardId && candidate.success === false && typeof candidate.createdAt === "string";
  }) as { createdAt?: string } | undefined;
  return typeof source?.createdAt === "string"
    ? `${seatId}:threat:${cardId}:${source.createdAt}`
    : `${seatId}:${cardId}:${state.sequence}`;
}

function removeHeldGearFromPlayer(player: PlayerState, gearId: string, instanceId?: string): PlayerState {
  const removing = (item: PlayerState["character"]["heldGear"][number]) => item.id === gearId && (!instanceId || item.instanceId === instanceId);
  const nextHeldGear = player.character.heldGear.filter((item) => !removing(item));

  return {
    ...player,
    character: {
      ...player.character,
      heldGear: nextHeldGear,
      equippedGear: Object.fromEntries(
        Object.entries(player.character.equippedGear).map(([slot, equippedId]) => [
          slot,
          equippedId === gearId && (!instanceId || player.character.equippedGearInstances?.[slot as GearSlot] === instanceId) ? null : equippedId
        ])
      ) as PlayerState["character"]["equippedGear"],
      equippedGearInstances: player.character.equippedGearInstances
        ? Object.fromEntries(
            Object.entries(player.character.equippedGearInstances).map(([slot, equippedInstanceId]) => [
              slot,
              instanceId ? equippedInstanceId === instanceId ? null : equippedInstanceId : player.character.equippedGear[slot as GearSlot] === gearId ? null : equippedInstanceId
            ])
          ) as PlayerState["character"]["equippedGearInstances"]
        : undefined
    }
  };
}

function applyShopServiceToPlayer(player: PlayerState, action: ShopServiceResolvedAction): PlayerState {
  const afterCost = {
    ...player,
    character: {
      ...player.character,
      salvage: Math.max(
        0,
        (player.character.salvage ?? 0) -
          (action.cost.salvage ?? 0) +
          (action.result.salvageDelta ?? 0)
      ),
      wounds: Math.max(0, player.character.wounds + (action.cost.wounds ?? 0) + (action.result.woundDelta ?? 0)),
      trophies: Math.max(
        0,
        player.character.trophies -
          (action.cost.trophies ?? 0) +
          (action.result.trophyDelta ?? 0)
      ),
      completedContracts: (player.character.completedContracts ?? []).slice(action.cost.completedContracts ?? 0)
    },
    private: action.result.note
      ? {
          ...player.private,
          notes: [...player.private.notes, action.result.note]
        }
      : player.private
  };
  const afterDiscard = action.result.discardGearId
    ? removeHeldGearFromPlayer(afterCost, action.result.discardGearId)
    : afterCost;

  if (!action.result.gainGear) {
    return afterDiscard;
  }

  return addHeldGearToPlayer(afterDiscard, {
    type: "gain_gear",
    gearId: action.result.gainGear.id,
    gear: action.result.gainGear
  });
}

function applyShopCostOnlyToPlayer(player: PlayerState, cost: ShopServiceCost): PlayerState {
  return {
    ...player,
    character: {
      ...player.character,
      salvage: Math.max(0, (player.character.salvage ?? 0) - (cost.salvage ?? 0)),
      wounds: Math.max(0, player.character.wounds + (cost.wounds ?? 0)),
      trophies: Math.max(0, player.character.trophies - (cost.trophies ?? 0)),
      completedContracts: (player.character.completedContracts ?? []).slice(cost.completedContracts ?? 0)
    }
  };
}

function applyShopPurchaseToPlayer(player: PlayerState, action: ShopPurchaseResolvedAction): PlayerState {
  const afterCost = applyShopCostOnlyToPlayer(player, {
    ...action.cost,
    completedContracts: action.spentCompletedContractIds ? 0 : action.cost.completedContracts
  });
  const afterExactContractSpend = action.spentCompletedContractIds
    ? {
        ...afterCost,
        character: {
          ...afterCost.character,
          completedContracts: (afterCost.character.completedContracts ?? []).filter(
            (contractId) => !action.spentCompletedContractIds!.includes(contractId)
          )
        }
      }
    : afterCost;

  return addHeldGearToPlayer(afterExactContractSpend, {
    type: "gain_gear",
    gearId: action.gainedGear.id,
    gear: action.gainedGear
  });
}

function applyShopSellToPlayer(player: PlayerState, action: ShopSellResolvedAction): PlayerState {
  const afterSale = {
    ...player,
    character: {
      ...player.character,
      salvage: Math.max(0, (player.character.salvage ?? 0) + action.salvageDelta)
    }
  };

  return removeHeldGearFromPlayer(afterSale, action.gearId, action.instanceId);
}

function canPayShopActionCost(player: PlayerState, cost: ShopServiceCost): string | null {
  if ((player.character.salvage ?? 0) < (cost.salvage ?? 0)) {
    return SHOP_FAILURE_REASONS.insufficientSalvage;
  }

  if (player.character.trophies < (cost.trophies ?? 0)) {
    return "Not enough Trophies";
  }
  if ((player.character.completedContracts ?? []).length < (cost.completedContracts ?? 0)) {
    return "Need completed Contracts";
  }

  return null;
}

function buildShopOutcomeSummary(args: {
  seatId: string;
  sectorId: string;
  shopName: string;
  summary: string;
}): NonNullable<GameState["lastOutcomeSummary"]> {
  return {
    seatId: args.seatId,
    movedToSectorId: args.sectorId,
    encounterCardId: null,
    encounterTitle: args.shopName,
    encounterCardType: null,
    checkStat: null,
    die1: null,
    die2: null,
    statBonus: null,
    checkTotal: null,
    difficulty: null,
    enemyRollerSeatId: null,
    enemyDie1: null,
    enemyDie2: null,
    enemyBonus: null,
    enemyTotal: null,
    success: true,
    summary: args.summary
  };
}

function applyEffectToState(state: GameState, seatId: string, effect: EncounterEffect): GameState {
  if (effect.type === "sequence") {
    return effect.effects.reduce(
      (nextState: GameState, entry: EncounterEffect) => applyEffectToState(nextState, seatId, entry),
      state
    );
  }

  if (effect.type === "advance_scenario") {
    return {
      ...state,
      scenarioProgress: {
        ...state.scenarioProgress,
        [effect.progressKey]: (state.scenarioProgress[effect.progressKey] ?? 0) + effect.amount
      },
      lastOutcomeSummary: state.lastOutcomeSummary
        ? {
            ...state.lastOutcomeSummary,
            summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(effect, null)}`
          }
        : state.lastOutcomeSummary
    };
  }

  if (effect.type === "gain_global_escalation_guarded") {
    return state;
  }

  if (effect.type === "memory_tax_choice") {
    return state;
  }

  if (effect.type === "advance_escalation") {
    return {
      ...state,
      escalationLevel: Math.max(0, state.escalationLevel + effect.amount),
      lastOutcomeSummary: state.lastOutcomeSummary
        ? {
            ...state.lastOutcomeSummary,
            summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(effect, null)}`
          }
        : state.lastOutcomeSummary
    };
  }

  if (effect.type === "next_non_battle_test_modifier") {
    const sourceResolutionId = getThreatResolutionSourceId(state, seatId, effect.sourceCardId);
    const sourceEventId = `${sourceResolutionId}:next-non-battle-test`;
    if (effect.sourceCardId === SIREN_RELAY_ECHO_ID) {
      return createOrReplaceSirenRelayEchoModifier(
        state,
        seatId,
        effect.amount,
        sourceEventId,
        state.pendingFailureReaction?.createdAt ?? sourceEventId
      );
    }
    return createOrReplaceNextNonBattleTestModifier(
      state,
      seatId,
      sourceEventId,
      state.pendingFailureReaction?.createdAt ?? sourceEventId
    );
  }

  if (effect.type === "next_normal_movement_roll_modifier") {
    const sourceResolutionId = getThreatResolutionSourceId(state, seatId, effect.sourceCardId);
    const sourceEventId = `${sourceResolutionId}:next-normal-movement-roll`;
    return createOrReplaceNextNormalMovementRollModifier(
      state,
      seatId,
      sourceEventId,
      state.pendingFailureReaction?.createdAt ?? sourceEventId
    );
  }

  if (effect.type === "return_threat_to_space") {
    if (!effect.threatId || !effect.sourceSectorId) {
      return state;
    }

    const threatId = effect.threatId;
    const sourceSectorId = effect.sourceSectorId;

    return {
      ...state,
      sectors: state.sectors.map((sector) =>
        sector.id === sourceSectorId && !sector.encounterDecks.threat.includes(threatId)
          ? {
              ...sector,
              encounterDecks: {
                ...sector.encounterDecks,
                threat: [threatId, ...sector.encounterDecks.threat]
              }
            }
          : sector
      )
    };
  }

  if (effect.type === "draw_artifact") {
    return state;
  }

  if (effect.type === "gain_follower" && effect.follower?.unique) {
    const alreadyInPlay = state.players.some((player) =>
      (player.character.followers ?? []).some((follower) => follower.id === effect.follower?.id)
    );

    if (alreadyInPlay) {
      return state;
    }
  }

  if (effect.type === "consume_artifact") {
    return {
      ...state,
      sectors:
        effect.sourceSectorId
          ? state.sectors.map((sector) =>
              sector.id === effect.sourceSectorId
                ? {
                    ...sector,
                    encounterDecks: {
                      ...sector.encounterDecks,
                      artifact: sector.encounterDecks.artifact.filter((artifactId) => artifactId !== effect.artifactId)
                    }
                  }
                : sector
            )
          : state.sectors
    };
  }

  return {
    ...state,
    players: updateActivePlayer(state, seatId, (player) => applyEffectToPlayer(player, effect))
  };
}

function createTrophyPileEntry(card: ThreatCard): TrophyPileEntry {
  return {
    cardId: card.id,
    name: card.cardType === "enemy" ? card.enemyName ?? card.title : card.title,
    trophyValue: card.cardType === "enemy" ? card.trophyValue : 0,
    spentValue: 0,
    stat: card.stat,
    cardType: card.cardType
  };
}

function getTrophyPileEntryAvailableValue(entry: TrophyPileEntry): number {
  return Math.max(0, entry.trophyValue - (entry.spentValue ?? 0));
}

function getCrownKeyProgressKey(seatId: string): string {
  return `crownKey:${seatId}`;
}

function spendTrophyPileValue(trophyPile: TrophyPileEntry[] | undefined, cost: number): TrophyPileEntry[] {
  let remainingCost = cost;
  const nextPile: TrophyPileEntry[] = [];

  for (const entry of trophyPile ?? []) {
    if (remainingCost <= 0) {
      nextPile.push(entry);
      continue;
    }

    const availableValue = getTrophyPileEntryAvailableValue(entry);

    if (availableValue <= 0) {
      continue;
    }

    const spentValue = Math.min(availableValue, remainingCost);
    remainingCost -= spentValue;
    const nextEntry = {
      ...entry,
      spentValue: (entry.spentValue ?? 0) + spentValue
    };

    if (getTrophyPileEntryAvailableValue(nextEntry) > 0) {
      nextPile.push(nextEntry);
    }
  }

  return nextPile;
}

function summarizeEffects(effect: EncounterEffect | null, success: boolean | null): string[] {
  if (!effect) {
    return [];
  }

  if (effect.type === "sequence") {
    return effect.effects.flatMap((entry: EncounterEffect) => summarizeEffects(entry, success));
  }

  return [summarizeEffect(effect, success)];
}

function summarizeAppliedEffects(effect: EncounterEffect, success: boolean | null, startingSalvage: number, startingWounds: number): string[] {
  let salvage = Math.max(0, startingSalvage);
  let wounds = Math.max(0, startingWounds);
  const visit = (entry: EncounterEffect): string[] => {
    if (entry.type === "sequence") return entry.effects.flatMap(visit);
    if (entry.type === "lose_salvage") {
      const actualLoss = Math.min(salvage, entry.amount);
      salvage -= actualLoss;
      return [actualLoss > 0 ? `Lost ${actualLoss} Salvage.` : "No Salvage was lost."];
    }
    if (entry.type === "gain_salvage") salvage += entry.amount;
    if (entry.type === "take_wound") wounds += entry.amount;
    if (entry.type === "heal_wound") {
      const actualHealing = Math.min(wounds, entry.amount);
      wounds -= actualHealing;
      return actualHealing > 0 ? [`Healed ${actualHealing} Wound${actualHealing === 1 ? "" : "s"}.`] : [];
    }
    return [summarizeEffect(entry, success)];
  };
  return visit(effect);
}

function createResolutionId(seatId: string, source: ActiveResolution["source"], createdAt: string, suffix: string): string {
  return `${seatId}:${source}:${suffix}:${createdAt}`;
}

function summarizeThreatCard(card: ThreatCard): NonNullable<ActiveResolution["card"]> {
  return {
    id: card.id,
    title: card.title,
    type: card.cardType,
    flavor: card.flavor,
    artType: "threat"
  };
}

function summarizeThreatBattle(
  card: ThreatCard,
  difficulty: number = card.difficulty,
  modifiers: NonNullable<ActiveResolution["battle"]>["modifiers"] = []
): NonNullable<ActiveResolution["battle"]> {
  return {
    enemyName: card.cardType === "enemy" ? card.enemyName : card.title,
    stat: card.stat,
    difficulty,
    modifiers
  };
}

function fallbackModifierSources(stat: string, value: number): RollModifierSource[] {
  return [{ label: stat, value }];
}

function appendPendingRollModifierToResolution(
  resolution: ActiveResolution | null | undefined,
  encounter: ThreatCard | null,
  modifier: UseGearAction["rollModifier"] | UseFollowerAction["rollModifier"] | undefined
): ActiveResolution | null | undefined {
  if (!resolution || !encounter || !modifier) {
    return resolution;
  }

  const battle = resolution.battle ?? summarizeThreatBattle(encounter);
  const alreadyApplied = battle.modifiers.some((entry) => entry.label === modifier.label && entry.value === modifier.value);

  return {
    ...resolution,
    battle: {
      ...battle,
      modifiers: alreadyApplied
        ? battle.modifiers
        : [...battle.modifiers, { label: modifier.label, value: modifier.value }]
    }
  };
}

function buildRollResolution(params: {
  seatId: string;
  source: ActiveResolution["source"];
  createdAt: string;
  suffix: string;
  card?: ActiveResolution["card"];
  battle?: ActiveResolution["battle"];
  dice: number[];
  baseTotal: number;
  modifierTotal: number;
  finalTotal: number;
  target: number;
  success: boolean;
  title: string;
  text: string;
  effects: string[];
}): ActiveResolution {
  return {
    id: createResolutionId(params.seatId, params.source, params.createdAt, params.suffix),
    playerId: params.seatId,
    source: params.source,
    stage: "roll_result",
    card: params.card,
    battle: params.battle,
    roll: {
      dice: params.dice,
      baseTotal: params.baseTotal,
      modifierTotal: params.modifierTotal,
      finalTotal: params.finalTotal,
      target: params.target,
      success: params.success
    },
    outcome: {
      title: params.title,
      text: params.text,
      effects: params.effects
    }
  };
}

function buildOutcomeResolution(params: {
  seatId: string;
  source: ActiveResolution["source"];
  createdAt: string;
  suffix: string;
  card?: ActiveResolution["card"];
  title: string;
  text: string;
  effects: string[];
}): ActiveResolution {
  return {
    id: createResolutionId(params.seatId, params.source, params.createdAt, params.suffix),
    playerId: params.seatId,
    source: params.source,
    stage: "outcome_summary",
    card: params.card,
    outcome: {
      title: params.title,
      text: params.text,
      effects: params.effects
    }
  };
}

function inferSpaceTextResolutionSource(action: SpaceTextResolvedAction): ActiveResolution["source"] {
  if (action.consumedDeckCards?.contract?.length || action.discoveredContracts?.length) {
    return "contract";
  }

  if (action.consumedDeckCards?.anomaly?.length) {
    return "anomaly";
  }

  if (action.consumedDeckCards?.artifact?.length) {
    return "artifact";
  }

  return "scenario";
}

function advanceResolutionForContinue(state: GameState): ActiveResolution | null {
  const activeResolution = state.activeResolution;

  if (!activeResolution) {
    return null;
  }

  if (activeResolution.stage === "roll_result") {
    return {
      ...activeResolution,
      stage: "outcome_summary"
    };
  }

  if (activeResolution.stage === "outcome_summary" || activeResolution.stage === "awaiting_continue") {
    return null;
  }

  return activeResolution;
}

function addFollowerToPlayer(
  player: PlayerState,
  effect: Extract<EncounterEffect, { type: "gain_follower" }>
): PlayerState {
  if (!effect.follower) {
    return player;
  }

  const alreadyFollowing = (player.character.followers ?? []).some((follower) => follower.id === effect.follower?.id);

  if (alreadyFollowing) {
    return player;
  }

  return {
    ...player,
    character: {
      ...player.character,
      followers: [...(player.character.followers ?? []), effect.follower]
    }
  };
}

function canManageGear(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot manage gear during phase ${state.phase}`);
  }
}

function discardHeldGear(state: GameState, seatId: string, gearId: string, instanceId?: string): GameState {
  return {
    ...state,
    players: updateActivePlayer(state, seatId, (entry) => removeHeldGearFromPlayer(entry, gearId, instanceId))
  };
}

function consumeTemporaryAllStatBoost(state: GameState, seatId: string): GameState {
  return { ...state, players: updateActivePlayer(state, seatId, (entry) => {
    const boost = entry.character.temporaryAllStatBoost;
    if (!boost) return entry;
    const remaining = boost.remainingEligibleResolutions - 1;
    return { ...entry, character: { ...entry.character, temporaryAllStatBoost: remaining > 0 ? { ...boost, remainingEligibleResolutions: remaining } : undefined } };
  }) };
}

function spendHeldGearCharge(state: GameState, seatId: string, gearId: string, instanceId?: string): GameState {
  return {
    ...state,
    players: updateActivePlayer(state, seatId, (entry) => ({
      ...entry,
      character: {
        ...entry.character,
        heldGear: entry.character.heldGear.map((item) =>
          item.id === gearId && (!instanceId || item.instanceId === instanceId)
            ? {
                ...item,
                currentCharges: Math.max((item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) - 1, 0),
                charges: Math.max((item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) - 1, 0),
                maxUses: item.maxUses ?? item.maxCharges ?? item.charges ?? item.startingCharges ?? 0
              }
            : item
        )
      }
    }))
  };
}

function discardFollower(state: GameState, seatId: string, followerId: string): GameState {
  return {
    ...state,
    players: updateActivePlayer(state, seatId, (entry) => ({
      ...entry,
      character: {
        ...entry.character,
        followers: (entry.character.followers ?? []).filter((follower) => follower.id !== followerId)
      }
    }))
  };
}

function hasHarmfulInteractionThisRound(state: GameState, targetSeatId: string): boolean {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index] as { type?: string; targetSeatId?: string; interactionKind?: string } | undefined;

    if (entry?.type === "ROUND_COMPLETED") {
      return false;
    }

    if (
      entry?.type === "TABLE_INTERACTION" &&
      entry.targetSeatId === targetSeatId &&
      (entry.interactionKind === "duel" || entry.interactionKind === "interfere")
    ) {
      return true;
    }
  }

  return false;
}

function hasUsedObjectSinceBoundary(
  state: GameState,
  seatId: string,
  objectId: string,
  idField: "gearId" | "followerId",
  boundaryType: "TURN_COMPLETED" | "ROUND_COMPLETED"
): boolean {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index] as Record<string, unknown> | undefined;

    if (entry?.type === boundaryType) {
      return false;
    }

    if (entry?.seatId === seatId && entry[idField] === objectId && (entry.type === "USE_GEAR" || entry.type === "USE_FOLLOWER")) {
      return true;
    }
  }

  return false;
}

function ensureUseLimitAvailable(
  state: GameState,
  seatId: string,
  objectId: string,
  objectName: string,
  idField: "gearId" | "followerId",
  useLimit: "oncePerTurn" | "oncePerRound" | "discard" | "charge" | undefined
): void {
  if (useLimit === "oncePerTurn" && hasUsedObjectSinceBoundary(state, seatId, objectId, idField, "TURN_COMPLETED")) {
    throw new Error(`${objectName} has already been used this turn`);
  }

  if (useLimit === "oncePerRound" && hasUsedObjectSinceBoundary(state, seatId, objectId, idField, "ROUND_COMPLETED")) {
    throw new Error(`${objectName} has already been used this round`);
  }
}

function canRaiseStat(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action" && state.phase !== "broadcast") {
    throw new Error(`Cannot raise a stat during phase ${state.phase}`);
  }

  if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect || state.activeResolution) {
    throw new Error("Resolve the current threat before raising a stat");
  }
}

function requireActiveContractCard(state: GameState, seatId: string): ContractCard | null {
  const player = requirePlayer(state, seatId);
  const contractId = player.character.activeContract?.contractId;

  return contractId ? state.availableContracts.find((entry) => entry.id === contractId) ?? null : null;
}

function canResolveScenarioConfrontation(state: GameState, seatId: string): void {
  ensureSeatTurn(state, seatId);
  ensureSeatCanTakeNormalTurnAction(state, seatId);

  if (state.phase !== "action") {
    throw new Error(`Cannot resolve a scenario confrontation during phase ${state.phase}`);
  }

  if (state.currentEncounter) {
    throw new Error("Cannot resolve a scenario confrontation while an encounter is active");
  }

  if (state.pendingEnemyRoll) {
    throw new Error("Cannot resolve a scenario confrontation while an enemy roll is pending");
  }

  const player = requirePlayer(state, seatId);

  if (!isScenarioConfrontationSpace(player.character.currentSpaceId)) {
    throw new Error("Scenario confrontations may only be resolved at the Cinder Gate");
  }
}

export function reduceGameState(state: GameState, action: GameAction): ReducerResult {
  switch (action.type) {
    case "SESSION_STARTED":
      return succeed({
        ...state,
        status: "active",
        winnerSeatId: null,
        phase: requirePlayer(state, getActiveSeatId(state)).character.status === "recalled" ? "action" : "navigation",
        resolutionSource: null,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    case "MOVE_REQUESTED": {
      const moveAction = action as MoveRequestedAction;

      try {
        ensureSeatTurn(state, moveAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, moveAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!canResolveMovement(state.phase)) {
        return reject(state, action, `Cannot move during phase ${state.phase}`);
      }

      const player = requirePlayer(state, moveAction.seatId);

      const voidKey = moveAction.voidKeyInstanceId
        ? player.character.heldGear.find((item) => item.instanceId === moveAction.voidKeyInstanceId && item.id === "void-key")
        : null;
      const keyCharges = voidKey?.currentCharges ?? voidKey?.charges ?? 0;
      if (moveAction.voidKeyInstanceId) {
        if (!voidKey || keyCharges < 1 || player.character.equippedGear.utility !== voidKey.id || !getVoidKeyMovementRoute(state, moveAction.seatId, moveAction.toSectorId)) return reject(state, action, "Void Key cannot authorize this route");
      } else {
        try {
          ensureLegalMovementRoute(state, moveAction.seatId, moveAction.toSectorId, moveAction.routeId, moveAction.movementRevision);
        } catch (error) {
          return reject(state, action, error instanceof Error ? error.message : "Sector is not reachable");
        }
      }

      const chargedState = voidKey ? { ...state, players: updateActivePlayer(state, moveAction.seatId, (entry) => ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((item) => item.instanceId === voidKey.instanceId ? { ...item, currentCharges: keyCharges - 1, maxCharges: item.maxCharges ?? 2 } : item) } })) } : state;

      return succeed(consumeTemporaryAllStatBoost({
        ...chargedState,
        sequence: chargedState.sequence + 1,
        eventLog: [...chargedState.eventLog, action]
      }, action.seatId));
    }
    case "MOVEMENT_ROLL_REQUESTED": {
      const movementRollRequestedAction = action as MovementRollRequestedAction;

      try {
        ensureSeatTurn(state, movementRollRequestedAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, movementRollRequestedAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!canResolveMovement(state.phase)) {
        return reject(state, action, `Cannot roll movement during phase ${state.phase}`);
      }

      if (state.movementRolls?.[movementRollRequestedAction.seatId]) {
        return reject(state, action, "Movement has already been rolled this turn");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ADJUST_MOVEMENT_REQUESTED": {
      const adjust = action as AdjustMovementRequestedAction;
      try { ensureSeatTurn(state, adjust.seatId); ensureSeatCanTakeNormalTurnAction(state, adjust.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot adjust movement"); }
      if (state.phase !== "navigation" || !state.movementRolls?.[adjust.seatId] || state.movementAdjustments?.[adjust.seatId]) return reject(state, action, "Movement cannot be adjusted now");
      const player = requirePlayer(state, adjust.seatId);
      const item = player.character.heldGear.find((gear) => gear.instanceId === adjust.instanceId && gear.id === "ashen-route-compass");
      const charges = item?.currentCharges ?? item?.charges ?? 0;
      const adjusted = state.movementRolls[adjust.seatId]! + adjust.adjustment;
      if (!item || player.character.equippedGear.utility !== item.id || charges < 1 || adjusted < 1) return reject(state, action, "Ashen Route Compass cannot adjust this movement");
      const routeStarChoices = { ...(state.routeStarChoices ?? {}) }; delete routeStarChoices[adjust.seatId];
      const next = { ...state, movementAdjustments: { ...(state.movementAdjustments ?? {}), [adjust.seatId]: { adjustment: adjust.adjustment, sourceInstanceId: adjust.instanceId } }, movementRouteRevisions: { ...(state.movementRouteRevisions ?? {}), [adjust.seatId]: (state.movementRouteRevisions?.[adjust.seatId] ?? 0) + 1 }, routeStarChoices: Object.keys(routeStarChoices).length ? routeStarChoices : undefined, players: updateActivePlayer(state, adjust.seatId, (entry) => ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((gear) => gear.instanceId === adjust.instanceId ? { ...gear, currentCharges: charges - 1, maxCharges: gear.maxCharges ?? 2 } : gear) } })) };
      return succeed({ ...next, sequence: state.sequence + 1, eventLog: [...state.eventLog, action] });
    }
    case "SELECT_ROUTE_STAR_VARIANT": {
      const select = action as SelectRouteStarVariantAction;
      try { ensureSeatTurn(state, select.seatId); ensureSeatCanTakeNormalTurnAction(state, select.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot select a route"); }
      if (state.phase !== "navigation" || !state.movementRolls?.[select.seatId] || state.routeStarChoices?.[select.seatId]) return reject(state, action, "Route Star cannot select a route now");
      const player = requirePlayer(state, select.seatId);
      const item = player.character.heldGear.find((gear) => gear.id === "route-star" && gear.instanceId === select.instanceId);
      const charges = item?.currentCharges ?? item?.charges ?? 0;
      if (!item || player.character.equippedGear.utility !== item.id || charges < 1) return reject(state, action, "Route Star is unavailable or depleted");
      const route = getLegalMovementRouteVariant(state, select.seatId, select.destinationId, select.routeId, select.movementRevision);
      const defaultRoute = getLegalMovementRoute(state, select.seatId, select.destinationId);
      if (!route || !defaultRoute || route.routeId === defaultRoute.routeId) return reject(state, action, "Route Star requires a current non-default authoritative route");
      const next = updateActivePlayer(state, select.seatId, (entry) => ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((gear) => gear.instanceId === select.instanceId ? { ...gear, currentCharges: charges - 1, charges: charges - 1, maxCharges: gear.maxCharges ?? 2 } : gear) } }));
      return succeed({ ...state, players: next, routeStarChoices: { ...(state.routeStarChoices ?? {}), [select.seatId]: { instanceId: select.instanceId, destinationId: select.destinationId, routeId: select.routeId, movementRevision: select.movementRevision } }, sequence: state.sequence + 1, lastOutcomeSummary: { seatId: select.seatId, movedToSectorId: select.destinationId, encounterCardId: null, encounterTitle: "Route Star", encounterCardType: null, checkStat: null, die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: null, enemyRollerSeatId: null, enemyDie1: null, enemyDie2: null, enemyBonus: null, enemyTotal: null, success: true, summary: "Route Star consulted." }, eventLog: [...state.eventLog, action] });
    }
    case "CLEAR_ROUTE_STAR_CHOICE": {
      const clear = action as ClearRouteStarChoiceAction;
      const choices = { ...(state.routeStarChoices ?? {}) };
      if (!choices[clear.seatId]) return succeed(state);
      delete choices[clear.seatId];
      return succeed({ ...state, routeStarChoices: Object.keys(choices).length ? choices : undefined, sequence: state.sequence + 1, eventLog: [...state.eventLog, action] });
    }
    case "ACTIVATE_GATE_SAINT": {
      const activate = action as ActivateGateSaintAction; const player = requirePlayer(state, activate.seatId);
      const key = player.character.heldGear.find((item) => item.id === "gate-saint-key" && item.instanceId === activate.instanceId); const charges = key?.currentCharges ?? key?.charges ?? 0;
      const atFinalGate = state.players.some((entry) => entry.character.currentSpaceId === "inner_gate_of_cinders");
      if (!key || charges < 1 || state.gateSaintSafeConduct || !atFinalGate) return reject(state, action, "Saint’s Safe Conduct cannot be activated now");
      const next = { ...state, gateSaintSafeConduct: { id: `saint:${state.sequence}`, sourceInstanceId: activate.instanceId, usedSeatIds: [] }, players: updateActivePlayer(state, activate.seatId, (entry) => ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((item) => item.instanceId === activate.instanceId ? { ...item, currentCharges: charges - 1, maxCharges: 1 } : item) } })) };
      return succeed({ ...next, sequence: state.sequence + 1, eventLog: [...state.eventLog, action] });
    }
    case "USE_MARROW_DETOUR": {
      const detour = action as UseMarrowDetourAction; const player = requirePlayer(state, detour.seatId); const key = player.character.heldGear.find((item) => item.id === "marrow-route-key" && item.instanceId === detour.instanceId); const charges = key?.currentCharges ?? key?.charges ?? 0;
      const reaction = state.pendingFailureReaction; const current = player.character.currentSpaceId;
      if (!key || charges < 1 || !reaction || reaction.id !== detour.reactionId || reaction.seatId !== detour.seatId || reaction.testType !== "movement" || player.character.wounds + 1 >= state.woundThreshold || getMovementStepBlockReason(state, player, current, detour.toSectorId)) return reject(state, action, "Boneway Detour cannot resolve this reaction");
      const next = { ...state, pendingFailureReaction: null, pendingEffect: null, players: updateActivePlayer(state, detour.seatId, (entry) => ({ ...entry, sectorId: detour.toSectorId, character: { ...entry.character, currentSpaceId: detour.toSectorId, wounds: entry.character.wounds + 1, heldGear: entry.character.heldGear.map((item) => item.instanceId === detour.instanceId ? { ...item, currentCharges: charges - 1, maxCharges: 2 } : item) } })) };
      return succeed({ ...next, sequence: state.sequence + 1, eventLog: [...state.eventLog, action] });
    }
    case "MOVEMENT_ROLLED": {
      const movementRolledAction = action as MovementRolledAction;

      try {
        ensureSeatTurn(state, movementRolledAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, movementRolledAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!canResolveMovement(state.phase)) {
        return reject(state, action, `Cannot roll movement during phase ${state.phase}`);
      }

      if (state.movementRolls?.[movementRolledAction.seatId]) {
        return reject(state, action, "Movement has already been rolled this turn");
      }

      if (!Number.isInteger(movementRolledAction.movementValue) || movementRolledAction.movementValue < 1) {
        return reject(state, action, "Movement roll must be at least 1");
      }

      const pendingSpindleModifier = getPendingNextNormalMovementRollModifier(state, movementRolledAction.seatId);
      const modifierSources = movementRolledAction.modifierSources ?? [];
      const spindleSourceCount = modifierSources.filter(
        (source) => source.label === SPINDLE_STATIC_SQUALL_MODIFIER_LABEL && source.value === SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT
      ).length;
      if (pendingSpindleModifier && (spindleSourceCount !== 1 || !movementRolledAction.resolutionId)) {
        return reject(state, action, "Pending Spindle Static Squall modifier is missing from the movement roll");
      }
      if (!pendingSpindleModifier && spindleSourceCount > 0) {
        return reject(state, action, "Spindle Static Squall modifier has no pending authoritative source");
      }
      if (modifierSources.length !== spindleSourceCount) {
        return reject(state, action, "Movement roll contains an unsupported modifier source");
      }
      const expectedMovementValue = resolveNormalMovementAllowance(movementRolledAction.roll.total, modifierSources);
      if (movementRolledAction.movementValue !== expectedMovementValue) {
        return reject(state, action, "Movement allowance does not match its authoritative roll and modifiers");
      }

      const afflictionCatalog = new Map((state.availableAfflictions ?? []).map((entry) => [entry.id, entry]));
      const movedState = movementRolledAction.roll.total === 6
        ? {
            ...state,
            players: state.players.map((entry) =>
              entry.seatId === movementRolledAction.seatId
                ? applyMovementDieAfflictions(entry, movementRolledAction.roll.total, afflictionCatalog)
                : entry
            )
          }
        : state;

      const movementRollResolutionId = movementRolledAction.resolutionId ?? `${movementRolledAction.seatId}:${movementRolledAction.createdAt}:movement-roll`;
      const committedState = {
        ...movedState,
        sequence: state.sequence + 1,
        movementRolls: {
          ...(state.movementRolls ?? {}),
          [movementRolledAction.seatId]: movementRolledAction.movementValue
        },
        normalMovementRollDetails: {
          ...(state.normalMovementRollDetails ?? {}),
          [movementRolledAction.seatId]: {
            resolutionId: movementRollResolutionId,
            rolledValue: movementRolledAction.roll.total,
            modifierSources,
            finalValue: movementRolledAction.movementValue
          }
        },
        movementRouteRevisions: {
          ...(state.movementRouteRevisions ?? {}),
          [movementRolledAction.seatId]: (state.movementRouteRevisions?.[movementRolledAction.seatId] ?? 0) + 1
        },
        routeStarChoices: state.routeStarChoices ? Object.fromEntries(Object.entries(state.routeStarChoices).filter(([seatId]) => seatId !== movementRolledAction.seatId)) : undefined,
        eventLog: [...state.eventLog, action]
      };
      return succeed(consumeNextNormalMovementRollModifier(
        committedState,
        movementRolledAction.seatId,
        movementRollResolutionId
      ));
    }
    case "MOVEMENT_RESOLVED": {
      const movementAction = action as MovementResolvedAction;

      try {
        ensureSeatTurn(state, movementAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, movementAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "navigation") {
        return reject(state, action, `Cannot resolve movement during phase ${state.phase}`);
      }

      const player = requirePlayer(state, movementAction.seatId);
      const currentSectorId = player.character.currentSpaceId;

      if (movementAction.fromSectorId !== currentSectorId) {
        return reject(
          state,
          action,
          `Movement origin ${movementAction.fromSectorId} does not match current sector ${currentSectorId}`
        );
      }

      try {
        ensureLegalMovementRoute(state, movementAction.seatId, movementAction.toSectorId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Sector is not reachable");
      }

      const targetSector = state.sectors.find((entry) => entry.id === movementAction.toSectorId);
      const destinationSectorId = movementAction.success ? movementAction.toSectorId : movementAction.fromSectorId;
      const movedEvent: GameAction | null = movementAction.success
        ? {
            type: "MOVED",
            seatId: movementAction.seatId,
            fromSectorId: movementAction.fromSectorId,
            toSectorId: movementAction.toSectorId,
            createdAt: movementAction.createdAt
          }
        : null;

      return succeed(
        {
          ...state,
          sequence: state.sequence + 1,
          phase: movementAction.effect ? "resolution" : "sector",
          resolutionSource: movementAction.effect ? "movement" : null,
          pendingEffect: movementAction.effect,
          pendingFailureReaction: !movementAction.success && movementAction.effect ? {
            id: `failure:movement:${movementAction.seatId}:${movementAction.createdAt}`,
            seatId: movementAction.seatId,
            testType: "movement",
            sourceId: movementAction.toSectorId,
            createdAt: movementAction.createdAt
          } : null,
          movementRolls: clearMovementRollForSeat(state, movementAction.seatId),
          movementAdjustments: clearMovementAdjustmentForSeat(state, movementAction.seatId),
          routeStarChoices: state.routeStarChoices ? Object.fromEntries(Object.entries(state.routeStarChoices).filter(([seatId]) => seatId !== movementAction.seatId)) : undefined,
          tileChallengeProgress: movementAction.success ? null : state.tileChallengeProgress,
          players: updateActivePlayer(state, movementAction.seatId, (entry) => ({
            ...entry,
            sectorId: destinationSectorId,
            character: {
              ...entry.character,
              currentSpaceId: destinationSectorId
            }
          })),
          lastOutcomeSummary: {
            seatId: movementAction.seatId,
            movedToSectorId: destinationSectorId,
            encounterCardId: null,
            encounterTitle: targetSector?.name ?? movementAction.toSectorId,
            encounterCardType: null,
            checkStat: movementAction.stat,
            die1: movementAction.roll.faces[0] ?? null,
            die2: movementAction.roll.faces[1] ?? null,
            statBonus: movementAction.statBonus,
            checkTotal: movementAction.total,
            difficulty: movementAction.difficulty,
            enemyRollerSeatId: null,
            enemyDie1: null,
            enemyDie2: null,
            enemyBonus: null,
            enemyTotal: null,
            success: movementAction.success,
            summary: movementAction.success
              ? `Moved into ${targetSector?.name ?? movementAction.toSectorId}. Success: the approach held.`
              : `Failed to enter ${targetSector?.name ?? movementAction.toSectorId}. ${summarizeEffect(
                  movementAction.effect!,
                  false
                )}`
          },
          activeResolution: buildRollResolution({
            seatId: movementAction.seatId,
            source: "movement",
            createdAt: movementAction.createdAt,
            suffix: movementAction.toSectorId,
            card: {
              id: movementAction.toSectorId,
              title: targetSector?.name ?? movementAction.toSectorId,
              type: "movement",
              flavor: "Approach check"
            },
            battle: {
              stat: movementAction.stat,
              difficulty: movementAction.difficulty,
              modifiers: [{ label: "Guile", value: movementAction.statBonus }]
            },
            dice: movementAction.roll.faces,
            baseTotal: movementAction.roll.total,
            modifierTotal: movementAction.statBonus,
            finalTotal: movementAction.total,
            target: movementAction.difficulty,
            success: movementAction.success,
            title: movementAction.success ? "Movement success" : "Movement setback",
            text: movementAction.success
              ? `Moved into ${targetSector?.name ?? movementAction.toSectorId}.`
              : `Failed to enter ${targetSector?.name ?? movementAction.toSectorId}.`,
            effects: summarizeEffects(movementAction.effect, movementAction.success)
          }),
          eventLog: movedEvent ? [...state.eventLog, action, movedEvent] : [...state.eventLog, action]
        },
        movedEvent ? [movedEvent] : []
      );
    }
    case "ENCOUNTER_DRAWN": {
      const drawnAction = action as EncounterDrawnAction;

      try {
        ensureSeatTurn(state, drawnAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, drawnAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "sector") {
        return reject(state, action, `Cannot draw encounter during phase ${state.phase}`);
      }

      const revealedState = drawnAction.revealEffect
        ? applyEffectToState(state, drawnAction.seatId, drawnAction.revealEffect)
        : state;
      const threatResolutionId = createResolutionId(drawnAction.seatId, "threat", drawnAction.createdAt, drawnAction.card?.id ?? drawnAction.sectorId);
      const suppressionReadyState = drawnAction.card
        ? reserveEquipmentSuppressions(revealedState, drawnAction.seatId, threatResolutionId, "threat")
        : revealedState;

      return succeed({
        ...suppressionReadyState,
        sequence: state.sequence + 1,
        phase: "action",
        resolutionSource: null,
        currentEncounter: drawnAction.card,
        recentEncounterCardIds: recordRecentEncounterCardId(revealedState, drawnAction.card?.id),
        activeResolution: drawnAction.card
          ? {
              id: threatResolutionId,
              playerId: drawnAction.seatId,
              source: "threat",
              stage: "card_reveal",
              card: summarizeThreatCard(drawnAction.card),
              battle: summarizeThreatBattle(drawnAction.card),
              outcome: {
                title: "Card revealed",
                text: drawnAction.revealEffect
                  ? `${drawnAction.card.title} is revealed. ${summarizeEffect(drawnAction.revealEffect, null)}`
                  : `${drawnAction.card.title} is revealed.`,
                effects: summarizeEffects(drawnAction.revealEffect ?? null, null)
              }
            }
          : {
              id: threatResolutionId,
              playerId: drawnAction.seatId,
              source: "threat",
              stage: "outcome_summary",
              outcome: {
                title: "No threat drawn",
                text: `Moved into ${drawnAction.sectorId}, but the local threat deck was empty.`,
                effects: []
              }
            },
        sectors: suppressionReadyState.sectors.map((sector) =>
          sector.id === drawnAction.sectorId && drawnAction.card
            ? {
                ...sector,
                encounterDecks: {
                  ...sector.encounterDecks,
                  threat: sector.encounterDecks.threat.filter((cardId) => cardId !== drawnAction.card?.id)
                }
              }
            : sector
        ),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              encounterCardId: drawnAction.card?.id ?? null,
              encounterTitle: drawnAction.card?.title ?? null,
              encounterCardType: drawnAction.card?.cardType ?? null,
              summary: drawnAction.card
                ? `Moved into ${drawnAction.sectorId} and revealed ${drawnAction.card.title}.${
                    drawnAction.revealEffect ? ` ${summarizeEffect(drawnAction.revealEffect, null)}` : ""
                  }`
                : `Moved into ${drawnAction.sectorId}, but the local threat deck was empty.`
            }
          : state.lastOutcomeSummary,
        eventLog: [...suppressionReadyState.eventLog, action]
      });
    }
    case "CHECK_REQUESTED": {
      const checkRequest = action as CheckRequestedAction;

      try {
        ensureSeatTurn(state, checkRequest.seatId);
        ensureSeatCanTakeNormalTurnAction(state, checkRequest.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot request a check during phase ${state.phase}`);
      }

      if (!state.currentEncounter) {
        return reject(state, action, "No encounter is waiting for a check");
      }

      if (state.currentEncounter.cardType !== "hazard") {
        return reject(state, action, "Enemy encounters require COMBAT_REQUESTED");
      }

      if (checkRequest.stat !== state.currentEncounter.stat) {
        return reject(
          state,
          action,
          `Encounter requires ${state.currentEncounter.stat}, not ${checkRequest.stat}`
        );
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        activeResolution: {
          ...(state.activeResolution ?? {
            id: createResolutionId(checkRequest.seatId, "threat", checkRequest.createdAt, state.currentEncounter.id),
            playerId: checkRequest.seatId,
            source: "threat" as const
          }),
          stage: "battle_setup",
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(state.currentEncounter),
          outcome: {
            title: "Check ready",
            text: `${state.currentEncounter.title} requires ${state.currentEncounter.stat} ${state.currentEncounter.difficulty}.`,
            effects: []
          }
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "COMBAT_REQUESTED": {
      const combatRequest = action as CombatRequestedAction;

      try {
        ensureSeatTurn(state, combatRequest.seatId);
        ensureSeatCanTakeNormalTurnAction(state, combatRequest.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot request combat during phase ${state.phase}`);
      }

      if (!state.currentEncounter) {
        return reject(state, action, "No encounter is waiting for combat");
      }

      if (state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "Hazard encounters require CHECK_REQUESTED");
      }

      if (combatRequest.stat !== state.currentEncounter.stat) {
        return reject(
          state,
          action,
          `Encounter requires ${state.currentEncounter.stat}, not ${combatRequest.stat}`
        );
      }

      const battleResolutionId = state.activeResolution?.id ?? createResolutionId(combatRequest.seatId, "threat", combatRequest.createdAt, state.currentEncounter.id);
      const suppressionReadyState = reserveEquipmentSuppressions(state, combatRequest.seatId, battleResolutionId, "battle");
      return succeed({
        ...suppressionReadyState,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        activeResolution: {
          ...(state.activeResolution ?? {
            id: battleResolutionId,
            playerId: combatRequest.seatId,
            source: "threat" as const
          }),
          stage: "battle_setup",
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(state.currentEncounter),
          outcome: {
            title: "Battle ready",
            text: `${state.currentEncounter.enemyName ?? state.currentEncounter.title} opposes ${state.currentEncounter.stat}.`,
            effects: []
          }
        },
        eventLog: [...suppressionReadyState.eventLog, action]
      });
    }
    case "ENEMY_ROLL_ASSIGNED": {
      const enemyRollAssignment = action as EnemyRollAssignedAction;

      try {
        ensureSeatTurn(state, enemyRollAssignment.fighterSeatId);
        ensureSeatCanTakeNormalTurnAction(state, enemyRollAssignment.fighterSeatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot assign enemy roll during phase ${state.phase}`);
      }

      if (!state.currentEncounter || state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "No enemy encounter is waiting for combat");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        pendingEnemyRoll: {
          fighterSeatId: enemyRollAssignment.fighterSeatId,
          assignedRollerSeatId: enemyRollAssignment.assignedRollerSeatId,
          encounterCardId: enemyRollAssignment.cardId,
          encounterTitle: enemyRollAssignment.encounterTitle,
          stat: enemyRollAssignment.stat
        },
        activeResolution: state.currentEncounter
          ? {
              id: state.activeResolution?.id ?? createResolutionId(enemyRollAssignment.seatId, "threat", enemyRollAssignment.createdAt, enemyRollAssignment.cardId),
              playerId: enemyRollAssignment.fighterSeatId,
              source: "threat",
              stage: "dice_roll",
              card: summarizeThreatCard(state.currentEncounter),
              battle: summarizeThreatBattle(state.currentEncounter, state.currentEncounter.difficulty, [
                { label: "Enemy roller assigned", value: 0 }
              ]),
              outcome: {
                title: "Enemy roll ready",
                text: `${enemyRollAssignment.encounterTitle} is resisting. Awaiting the assigned enemy roller.`,
                effects: []
              }
            }
          : state.activeResolution,
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              encounterCardId: enemyRollAssignment.cardId,
              encounterTitle: enemyRollAssignment.encounterTitle,
              encounterCardType: "enemy",
              checkStat: enemyRollAssignment.stat,
              enemyRollerSeatId: enemyRollAssignment.assignedRollerSeatId,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              summary: `${state.lastOutcomeSummary.summary} ${enemyRollAssignment.encounterTitle} is resisting. Awaiting the assigned enemy roller.`
            }
          : state.lastOutcomeSummary,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ENEMY_ROLL_REQUESTED": {
      const enemyRollRequest = action as EnemyRollRequestedAction;

      if (state.phase !== "action") {
        return reject(state, action, `Cannot trigger enemy roll during phase ${state.phase}`);
      }

      if (!state.pendingEnemyRoll) {
        return reject(state, action, "No enemy roll is waiting to be triggered");
      }

      if (state.pendingEnemyRoll.assignedRollerSeatId !== enemyRollRequest.seatId) {
        return reject(state, action, "Only the assigned enemy roller can trigger this roll");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "DICE_ROLL_STARTED": {
      const diceRollAction = action as DiceRollStartedAction;

      try {
        ensureSeatTurn(state, diceRollAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, diceRollAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot start dice roll during phase ${state.phase}`);
      }

      if (!state.currentEncounter || state.currentEncounter.id !== diceRollAction.cardId) {
        return reject(state, action, "No matching encounter is waiting for a dice roll");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        activeResolution: {
          ...(state.activeResolution ?? {
            id: createResolutionId(diceRollAction.seatId, "threat", diceRollAction.createdAt, state.currentEncounter.id),
            playerId: diceRollAction.seatId,
            source: "threat" as const
          }),
          stage: "dice_roll",
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(state.currentEncounter),
          outcome: {
            title: "Dice rolling",
            text: `${state.currentEncounter.title} dice are rolling.`,
            effects: []
          }
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "CHECK_ROLLED":
      try {
        ensureSeatTurn(state, action.seatId);
        ensureSeatCanTakeNormalTurnAction(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot resolve a check during phase ${state.phase}`);
      }

      if (!state.currentEncounter) {
        return reject(state, action, "No encounter is waiting for a check roll");
      }

      if (state.currentEncounter.id !== action.cardId) {
        return reject(state, action, "Check source is stale");
      }

      {
        const pendingNextTestModifier = getPendingNextNonBattleTestModifier(state, action.seatId);
        const pendingSirenModifier = getPendingSirenRelayEchoModifier(state, action.seatId);
        const authoritativeModifierSourceCount = action.modifierSources?.filter(
          (source) => source.label === GLASS_CHIME_SWARM_MODIFIER_LABEL && source.value === GLASS_CHIME_SWARM_MODIFIER_AMOUNT
        ).length ?? 0;
        if (pendingNextTestModifier && authoritativeModifierSourceCount !== 1) {
          return reject(state, action, "Pending Glass-Chime Swarm modifier is missing from the check");
        }
        if (!pendingNextTestModifier && authoritativeModifierSourceCount > 0) {
          return reject(state, action, "Glass-Chime Swarm modifier has no pending authoritative source");
        }
        const sirenSourceCount = action.modifierSources?.filter(
          (source) => source.label === SIREN_RELAY_ECHO_MODIFIER_LABEL && source.value === pendingSirenModifier?.amount
        ).length ?? 0;
        const sirenEligible = Boolean(pendingSirenModifier && !pendingSirenModifier.boundTestResolutionId && action.stat === "command");
        if (sirenEligible && sirenSourceCount !== 1) {
          return reject(state, action, "Pending Siren Relay Echo modifier is missing from the Command check");
        }
        if (!sirenEligible && sirenSourceCount > 0) {
          return reject(state, action, "Siren Relay Echo modifier has no eligible pending authoritative source");
        }
      }

      {
        const resolvedCheckState = consumeTemporaryAllStatBoost({
        ...state,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: state.pendingTileChallenge ? "tileChallenge" : "encounter",
        pendingEnemyRoll: null,
        pendingEffect: action.effect,
        pendingFailureReaction: !action.success && action.effect ? {
          id: `failure:hazard:${action.seatId}:${action.createdAt}`,
          seatId: action.seatId,
          testType: "hazard",
          sourceId: action.cardId,
          createdAt: action.createdAt
        } : null,
        pendingStaticIntercessionReaction: !action.success && action.effect && state.pendingTileChallenge?.challengeType === "anomaly" ? {
          id: `${state.pendingTileChallenge.id}:static-intercession`,
          seatId: action.seatId,
          pendingTileChallengeId: state.pendingTileChallenge.id,
          suppressibleEffects: [{ effectId: `${state.pendingTileChallenge.id}:failure-effect`, effect: action.effect }],
          selectedEffectId: null,
          createdAt: action.createdAt
        } : null,
        activeResolution: buildRollResolution({
          seatId: action.seatId,
          source: "threat",
          createdAt: action.createdAt,
          suffix: action.cardId,
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(
            state.currentEncounter,
            action.difficulty,
            action.modifierSources ?? fallbackModifierSources(action.stat, action.statBonus)
          ),
          dice: action.roll.faces,
          baseTotal: action.roll.total,
          modifierTotal: action.statBonus,
          finalTotal: action.total,
          target: action.difficulty,
          success: action.success,
          title: action.success ? "Check passed" : "Check failed",
          text: summarizeEffect(action.effect, action.success),
          effects: summarizeEffects(action.effect, action.success)
        }),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              checkStat: action.stat,
              die1: action.roll.faces[0] ?? null,
              die2: action.roll.faces[1] ?? null,
              statBonus: action.statBonus,
              checkTotal: action.total,
              difficulty: action.difficulty,
              success: action.success,
              summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(action.effect, action.success)}`
            }
          : null,
        eventLog: [...state.eventLog, action]
        }, action.seatId);
        const testResolutionId = createResolutionId(action.seatId, "threat", action.createdAt, action.cardId);
        const testEventId = `${state.activeResolution?.id ?? `${action.seatId}:${action.cardId}:${action.createdAt}`}:check`;
        return succeed(reserveMemoryTaxGateModifier(
          reserveSirenRelayEchoModifier(
            consumeNextNonBattleTestModifier(resolvedCheckState, action.seatId, testEventId),
            action.seatId,
            testResolutionId
          ),
          action.seatId,
          testResolutionId
        ));
      }
    case "SOLO_REROLL_RESOLVED": {
      const rerollAction = action as SoloRerollResolvedAction;

      try {
        ensureSeatTurn(state, rerollAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, rerollAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot reroll");
      }

      if (!rerollAction.artifactReroll && state.sessionMode !== "single-player") {
        return reject(state, action, "Solo emergency rerolls are only available in single-player");
      }

      const remainingCharge = state.soloRerollCharges?.[rerollAction.seatId] ?? 1;

      if (!rerollAction.artifactReroll && remainingCharge <= 0) {
        return reject(state, action, "Solo emergency reroll has already been used this round");
      }

      if (state.phase !== "resolution") {
        return reject(state, action, "Solo emergency reroll is only available while a failed result is visible");
      }

      if (!state.currentEncounter || state.currentEncounter.cardType !== "hazard") {
        return reject(state, action, "Solo emergency reroll requires a failed hazard check");
      }

      if (state.currentEncounter.id !== rerollAction.cardId) {
        return reject(state, action, "Solo emergency reroll no longer matches the active encounter");
      }

      if (state.activeResolution?.playerId !== rerollAction.seatId || state.activeResolution.roll?.success !== false) {
        return reject(state, action, "Solo emergency reroll requires a visible failed check");
      }

      return succeed(consumeTemporaryAllStatBoost({
        ...state,
        sequence: state.sequence + 1,
        pendingEffect: rerollAction.effect,
        pendingFailureReaction: null,
        pendingStaticIntercessionReaction: !rerollAction.success && rerollAction.effect && state.pendingTileChallenge?.challengeType === "anomaly" ? {
          id: `${state.pendingTileChallenge.id}:static-intercession`,
          seatId: rerollAction.seatId,
          pendingTileChallengeId: state.pendingTileChallenge.id,
          suppressibleEffects: [{ effectId: `${state.pendingTileChallenge.id}:failure-effect`, effect: rerollAction.effect }],
          selectedEffectId: null,
          createdAt: rerollAction.createdAt
        } : null,
        soloRerollCharges: rerollAction.artifactReroll ? state.soloRerollCharges : { ...(state.soloRerollCharges ?? {}), [rerollAction.seatId]: remainingCharge - 1 },
        activeResolution: buildRollResolution({
          seatId: rerollAction.seatId,
          source: "threat",
          createdAt: rerollAction.createdAt,
          suffix: `${rerollAction.cardId}-solo-reroll`,
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(state.currentEncounter, rerollAction.difficulty, [
            ...(rerollAction.modifierSources ?? fallbackModifierSources(rerollAction.stat, rerollAction.statBonus)),
            { label: "Solo emergency reroll", value: 0 }
          ]),
          dice: rerollAction.roll.faces,
          baseTotal: rerollAction.roll.total,
          modifierTotal: rerollAction.statBonus,
          finalTotal: rerollAction.total,
          target: rerollAction.difficulty,
          success: rerollAction.success,
          title: rerollAction.success ? "Solo reroll passed" : "Solo reroll failed",
          text: summarizeEffect(rerollAction.effect, rerollAction.success),
          effects: summarizeEffects(rerollAction.effect, rerollAction.success)
        }),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              checkStat: rerollAction.stat,
              die1: rerollAction.roll.faces[0] ?? null,
              die2: rerollAction.roll.faces[1] ?? null,
              statBonus: rerollAction.statBonus,
              checkTotal: rerollAction.total,
              difficulty: rerollAction.difficulty,
              success: rerollAction.success,
              summary: `Solo emergency reroll: ${state.currentEncounter.title} ${rerollAction.stat} ${rerollAction.total}/${rerollAction.difficulty}. ${summarizeEffect(rerollAction.effect, rerollAction.success)}`
            }
          : null,
        eventLog: [...state.eventLog, action]
      }, action.seatId));
    }
    case "COMBAT_RESOLVED":
      try {
        ensureSeatTurn(state, action.seatId);
        ensureSeatCanTakeNormalTurnAction(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "action") {
        return reject(state, action, `Cannot resolve combat during phase ${state.phase}`);
      }

      if (!state.currentEncounter || state.currentEncounter.cardType !== "enemy") {
        return reject(state, action, "No enemy encounter is waiting for combat");
      }

      if (
        state.pendingEnemyRoll &&
        (state.pendingEnemyRoll.fighterSeatId !== action.seatId ||
          state.pendingEnemyRoll.encounterCardId !== action.cardId)
      ) {
        return reject(state, action, "Pending enemy roll does not match this combat");
      }

      {
        const player = requirePlayer(state, action.seatId);
        const activeContract = player.character.activeContract;
        const contract = activeContract
          ? state.availableContracts.find((entry) => entry.id === activeContract.contractId) ?? null
          : null;
        const trophyAward = action.success ? state.currentEncounter.trophyValue : 0;
        const defeatedTrophy = action.success ? createTrophyPileEntry(state.currentEncounter) : null;
        const trophyPileSummary = defeatedTrophy ? `${defeatedTrophy.name} added to Trophy Pile.` : "";
        const nextProgress =
          action.success && contract && activeContract
            ? advanceContractObjectiveProgress(contract, activeContract.progress, {
                type: "enemy-defeated"
              })
            : activeContract?.progress ?? null;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: "encounter",
        pendingEnemyRoll: null,
        pendingEffect: action.effect,
        activeResolution: buildRollResolution({
          seatId: action.seatId,
          source: "threat",
          createdAt: action.createdAt,
          suffix: action.cardId,
          card: summarizeThreatCard(state.currentEncounter),
          battle: summarizeThreatBattle(state.currentEncounter, action.difficulty, [
            ...(action.modifierSources ?? fallbackModifierSources(action.stat, action.statBonus)),
            { label: "Enemy", value: action.enemyBonus }
          ]),
          dice: action.roll.faces,
          baseTotal: action.roll.total,
          modifierTotal: action.statBonus,
          finalTotal: action.total,
          target: action.enemyTotal,
          success: action.success,
          title: action.success ? "Combat victory" : "Combat loss",
          text: `${summarizeEffect(action.effect, action.success)}${trophyPileSummary ? ` ${trophyPileSummary}` : ""}`,
          effects: [...summarizeEffects(action.effect, action.success), ...(trophyPileSummary ? [trophyPileSummary] : [])]
        }),
        players: updateActivePlayer(state, action.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            trophies: entry.character.trophies + trophyAward,
            trophyPile: defeatedTrophy ? [...(entry.character.trophyPile ?? []), defeatedTrophy] : entry.character.trophyPile,
            activeContract:
              entry.character.activeContract && nextProgress !== null
                ? {
                    ...entry.character.activeContract,
                    progress: nextProgress
                  }
                : entry.character.activeContract
          }
        })),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              checkStat: action.stat,
              die1: action.roll.faces[0] ?? null,
              die2: action.roll.faces[1] ?? null,
              statBonus: action.statBonus,
              checkTotal: action.total,
              difficulty: action.difficulty,
              enemyRollerSeatId: action.enemyRollerSeatId,
              enemyDie1: action.enemyRoll.faces[0] ?? null,
              enemyDie2: action.enemyRoll.faces[1] ?? null,
              enemyBonus: action.enemyBonus,
              enemyTotal: action.enemyTotal,
              success: action.success,
              summary: `${state.lastOutcomeSummary.summary} ${summarizeEffect(action.effect, action.success)}${
                trophyAward > 0 ? ` +${trophyAward} trophies.` : ""
              }${trophyPileSummary ? ` ${trophyPileSummary}` : ""}`
            }
          : null,
        eventLog: [...state.eventLog, action]
      });
      }
    case "RESOLUTION_APPLIED": {
      const resolutionAction = action as ResolutionAppliedAction;

      try {
        ensureSeatTurn(state, resolutionAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "resolution") {
        return reject(state, action, `Cannot apply resolution during phase ${state.phase}`);
      }

      if (!state.pendingEffect) {
        return reject(state, action, "No pending effect is available to apply");
      }

      const authoritativeSourceCardId = state.currentEncounter?.id ?? state.activeResolution?.card?.id ?? resolutionAction.sourceCardId ?? "unknown-encounter";
      if (state.pendingEffect.type === "memory_tax_choice") {
        if (
          authoritativeSourceCardId !== MEMORY_TAX_GATE_ID ||
          resolutionAction.sourceCardId !== MEMORY_TAX_GATE_ID ||
          state.pendingEffect.sourceCardId !== MEMORY_TAX_GATE_ID
        ) {
          return reject(state, action, "Memory Tax choice requires its authoritative Threat source");
        }
        if (
          resolutionAction.success !== false ||
          state.lastOutcomeSummary?.success !== false ||
          state.activeResolution?.playerId !== resolutionAction.seatId ||
          state.lastOutcomeSummary?.seatId !== resolutionAction.seatId
        ) {
          return reject(state, action, "Memory Tax choice requires the owner's confirmed failed Threat result");
        }
        const sourceResolutionId = state.activeResolution.id;
        const sourceEventId = `${sourceResolutionId}:memory-tax-choice`;
        if (
          (state.resolvedMemoryTaxChoiceSourceEventIds ?? []).includes(sourceEventId) ||
          state.pendingMemoryTaxChoice?.sourceEventId === sourceEventId
        ) {
          return reject(state, action, "Memory Tax source was already resolved");
        }
        const player = requirePlayer(state, resolutionAction.seatId);
        if ((player.character.salvage ?? 0) === 0) {
          const modifierState = createOrReplaceMemoryTaxGateModifier(
            state,
            resolutionAction.seatId,
            `${sourceEventId}:modifier`,
            resolutionAction.createdAt
          );
          const summary = "Memory Tax Gate was resolved.";
          return succeed({
            ...modifierState,
            sequence: state.sequence + 1,
            pendingEffect: null,
            pendingFailureReaction: null,
            pendingStaticIntercessionReaction: null,
            resolvedMemoryTaxChoiceSourceEventIds: [...(state.resolvedMemoryTaxChoiceSourceEventIds ?? []), sourceEventId],
            activeResolution: state.activeResolution ? {
              ...state.activeResolution,
              stage: "outcome_summary",
              outcome: { title: "Memory tax resolved", text: summary, effects: [summary] }
            } : null,
            eventLog: [...state.eventLog, { ...action, sourceEventId, automaticFallback: true }]
          });
        }
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingFailureReaction: null,
          pendingStaticIntercessionReaction: null,
          pendingMemoryTaxChoice: {
            choiceId: `memory-tax-choice:${sourceEventId}`,
            choiceVersion: 1,
            ownerSeatId: resolutionAction.seatId,
            sourceCardId: MEMORY_TAX_GATE_ID,
            sourceEventId,
            sourceResolutionId,
            legalOptionIds: ["lose-salvage-1", "next-non-battle-test-minus-1"],
            createdAt: resolutionAction.createdAt,
            status: "pending"
          },
          activeResolution: state.activeResolution ? {
            ...state.activeResolution,
            stage: "outcome_summary",
            outcome: {
              title: "Memory tax pending",
              text: "The operative is choosing what the gate takes.",
              effects: ["Owner choice pending."]
            }
          } : null,
          eventLog: [...state.eventLog, { ...action, sourceEventId, optionCount: 2 }]
        });
      }
      if (state.pendingEffect.type === "next_non_battle_test_modifier") {
        const isSiren = state.pendingEffect.sourceCardId === SIREN_RELAY_ECHO_ID;
        const expectedSourceId = isSiren ? SIREN_RELAY_ECHO_ID : GLASS_CHIME_SWARM_ID;
        if (authoritativeSourceCardId !== expectedSourceId || resolutionAction.sourceCardId !== expectedSourceId) {
          return reject(state, action, `${isSiren ? "Siren Relay Echo" : "Glass-Chime Swarm"} modifier requires its authoritative source`);
        }
        if (
          state.activeResolution?.playerId !== resolutionAction.seatId ||
          state.lastOutcomeSummary?.seatId !== resolutionAction.seatId
        ) {
          return reject(state, action, `${isSiren ? "Siren Relay Echo" : "Glass-Chime Swarm"} modifier owner does not match the check`);
        }
        if (!isSiren && (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false)) {
          return reject(state, action, "Glass-Chime Swarm modifier requires a confirmed failed check");
        }
        if (isSiren && (resolutionAction.success !== state.lastOutcomeSummary?.success || state.pendingEffect.amount !== (resolutionAction.success ? 1 : -1))) {
          return reject(state, action, "Siren Relay Echo modifier does not match its confirmed result");
        }
        if (!isSiren && (
          state.pendingEffect.amount !== GLASS_CHIME_SWARM_MODIFIER_AMOUNT ||
          state.pendingEffect.sourceCardId !== GLASS_CHIME_SWARM_ID
        )) {
          return reject(state, action, "Glass-Chime Swarm modifier does not match its approved rule");
        }
        if (state.pendingEffect.sourceCardId === SIREN_RELAY_ECHO_ID && (
          state.pendingEffect.stat !== "command" || state.pendingEffect.context !== "nonBattleTest"
        )) {
          return reject(state, action, "Siren Relay Echo modifier does not match its approved context");
        }
      }
      if (state.pendingEffect.type === "next_normal_movement_roll_modifier") {
        if (authoritativeSourceCardId !== SPINDLE_STATIC_SQUALL_ID || resolutionAction.sourceCardId !== SPINDLE_STATIC_SQUALL_ID) {
          return reject(state, action, "Spindle Static Squall modifier requires its authoritative source");
        }
        if (
          state.activeResolution?.playerId !== resolutionAction.seatId ||
          state.lastOutcomeSummary?.seatId !== resolutionAction.seatId
        ) {
          return reject(state, action, "Spindle Static Squall modifier owner does not match the failed check");
        }
        if (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false) {
          return reject(state, action, "Spindle Static Squall modifier requires a confirmed failed check");
        }
        if (
          state.pendingEffect.amount !== SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT ||
          state.pendingEffect.minimumResult !== SPINDLE_STATIC_SQUALL_MINIMUM_RESULT ||
          state.pendingEffect.sourceCardId !== SPINDLE_STATIC_SQUALL_ID
        ) {
          return reject(state, action, "Spindle Static Squall modifier does not match its approved rule");
        }
      }
      if (state.pendingEffect.type === "equipment_suppression") {
        const effect = state.pendingEffect;
        if (effect.sourceCardId !== authoritativeSourceCardId || resolutionAction.sourceCardId !== authoritativeSourceCardId) {
          return reject(state, action, "Equipment suppression requires its authoritative Threat source");
        }
        if (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false || state.activeResolution?.playerId !== resolutionAction.seatId) {
          return reject(state, action, "Equipment suppression requires the owner's confirmed failed Threat result");
        }
        const approvedMode = authoritativeSourceCardId === "relay-husk"
          ? "throughNextThreat"
          : authoritativeSourceCardId === "signal-rotted-engineer"
            ? "duringNextBattle"
            : null;
        if (!approvedMode || effect.mode !== approvedMode) return reject(state, action, "Equipment suppression does not match its approved lifecycle");
        const sourceResolutionId = state.activeResolution?.id ?? `${resolutionAction.seatId}:threat:${authoritativeSourceCardId}:${state.sequence}`;
        const sourceEventId = `${sourceResolutionId}:equipment-suppression`;
        if ((state.resolvedEquipmentSuppressionSourceEventIds ?? []).includes(sourceEventId) || state.pendingEquipmentSuppressionChoice?.sourceEventId === sourceEventId || (state.equipmentSuppressions ?? []).some((entry) => entry.sourceEventId === sourceEventId)) {
          return reject(state, action, "Equipment suppression source was already resolved");
        }
        const eligible = getEligibleEquipmentSuppressionTargets(state, resolutionAction.seatId);
        if (eligible.length === 0) {
          const summary = "No eligible Equipment to suppress.";
          return succeed({
            ...state,
            sequence: state.sequence + 1,
            pendingEffect: null,
            pendingFailureReaction: null,
            pendingStaticIntercessionReaction: null,
            resolvedEquipmentSuppressionSourceEventIds: [...(state.resolvedEquipmentSuppressionSourceEventIds ?? []), sourceEventId],
            activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "No Equipment disrupted", text: summary, effects: [summary] } } : null,
            eventLog: [...state.eventLog, action]
          });
        }
        const pendingEquipmentSuppressionChoice = createPendingEquipmentSuppressionChoice(
          state,
          resolutionAction.seatId,
          effect.sourceCardId,
          sourceResolutionId,
          resolutionAction.createdAt
        );
        if (!pendingEquipmentSuppressionChoice) return reject(state, action, "Equipment suppression choice could not be created");
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingFailureReaction: null,
          pendingStaticIntercessionReaction: null,
          pendingEquipmentSuppressionChoice,
          activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "Choose Equipment to suppress", text: "The operative must choose one eligible equipped normal Equipment.", effects: ["Equipment suppression target pending."] } } : null,
          eventLog: [...state.eventLog, action]
        });
      }
      const isShatteredBarricadeEscalation =
        authoritativeSourceCardId === "shattered-barricade" && state.pendingEffect.type === "advance_escalation";
      if (isShatteredBarricadeEscalation) {
        if (resolutionAction.sourceCardId && resolutionAction.sourceCardId !== authoritativeSourceCardId) {
          return reject(state, action, "Resolution source is stale");
        }
        if (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false) {
          return reject(state, action, "Shattered Barricade escalation requires its authoritative failed check");
        }
        if (state.pendingEffect.type !== "advance_escalation" || state.pendingEffect.amount !== 1) {
          return reject(state, action, "Shattered Barricade escalation amount must be exactly 1");
        }
      }
      const isGateblindPulseEscalation =
        authoritativeSourceCardId === "gateblind-pulse" && state.pendingEffect.type === "gain_global_escalation_guarded";
      if (isGateblindPulseEscalation) {
        if (resolutionAction.sourceCardId && resolutionAction.sourceCardId !== authoritativeSourceCardId) {
          return reject(state, action, "Resolution source is stale");
        }
        if (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false) {
          return reject(state, action, "Gateblind Pulse escalation requires its authoritative failed check");
        }
        if (
          state.pendingEffect.type !== "gain_global_escalation_guarded" ||
          state.pendingEffect.sourceCardId !== "gateblind-pulse" ||
          state.pendingEffect.amount !== 1 ||
          state.pendingEffect.guard !== "oneBeforeCollapse"
        ) {
          return reject(state, action, "Gateblind Pulse escalation does not match its approved guarded effect");
        }
      }
      const sutureStormEffect = authoritativeSourceCardId === "suture-storm"
        ? extractSutureStormDisplacement(state.pendingEffect)
        : null;
      if (sutureStormEffect?.displacement) {
        if (state.pendingSutureStormConsequence) {
          return reject(state, action, "Suture Storm consequence is already in progress");
        }
        if (resolutionAction.sourceCardId && resolutionAction.sourceCardId !== authoritativeSourceCardId) {
          return reject(state, action, "Resolution source is stale");
        }
        if (resolutionAction.success !== false || state.lastOutcomeSummary?.success !== false) {
          return reject(state, action, "Suture Storm continuation requires its authoritative failed check");
        }
        const displacement = sutureStormEffect.displacement;
        if (
          displacement.direction !== "counterclockwise" || displacement.distance !== 1 ||
          displacement.sameRing !== true || displacement.failureStillCounts !== true ||
          displacement.fallbackEffect?.type !== "take_wound" || displacement.fallbackEffect.amount !== 1
        ) {
          return reject(state, action, "Suture Storm displacement does not match its approved consequence");
        }
        const sourceResolutionId = getThreatResolutionSourceId(state, resolutionAction.seatId, authoritativeSourceCardId);
        const sourceEventId = `${sourceResolutionId}:suture-storm-ordered-consequence`;
        const displacementSourceEventId = `${sourceResolutionId}:forced-displacement`;
        if ((state.resolvedDisplacementSourceEventIds ?? []).includes(displacementSourceEventId)) {
          return reject(state, action, "Suture Storm consequence was already resolved");
        }
        const startingWounds = requirePlayer(state, resolutionAction.seatId).character.wounds;
        const stateAfterInitialWound = sutureStormEffect.remainingEffect
          ? applyEffectToState(state, resolutionAction.seatId, sutureStormEffect.remainingEffect)
          : state;
        const resultingWounds = requirePlayer(stateAfterInitialWound, resolutionAction.seatId).character.wounds;
        const actualWounds = Math.min(1, Math.max(0, resultingWounds - startingWounds));
        const summary = actualWounds === 1
          ? "Suture Storm dealt 1 Wound. Forced displacement follows if the operative remains active."
          : "Suture Storm's initial Wound was prevented. Forced displacement still follows.";
        return succeed({
          ...stateAfterInitialWound,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingFailureReaction: null,
          pendingStaticIntercessionReaction: null,
          pendingSutureStormConsequence: {
            seatId: resolutionAction.seatId,
            sourceCardId: "suture-storm",
            sourceResolutionId,
            sourceEventId,
            stage: "afterInitialWound",
            requestedWounds: 1,
            preventedWounds: 1 - actualWounds,
            actualWounds,
            resultingWounds,
            resultingStatus: requirePlayer(stateAfterInitialWound, resolutionAction.seatId).character.status,
            displacement,
            createdAt: resolutionAction.createdAt
          },
          activeResolution: state.activeResolution ? {
            ...state.activeResolution,
            stage: "outcome_summary",
            outcome: { title: "Stitched off course", text: summary, effects: [summary] }
          } : null,
          eventLog: [...state.eventLog, action]
        });
      }
      const requiresAuthoritativeSource = state.pendingEffect.type === "lose_salvage" || state.pendingEffect.type === "forcedDisplacement" || state.pendingEffect.type === "ownerSelectedForcedDisplacement" || state.pendingEffect.type === "gain_global_escalation_guarded" || state.pendingEffect.type === "next_non_battle_test_modifier" || state.pendingEffect.type === "next_normal_movement_roll_modifier";
      if (requiresAuthoritativeSource && resolutionAction.sourceCardId && resolutionAction.sourceCardId !== authoritativeSourceCardId) {
        return reject(state, action, "Resolution source is stale");
      }
      const salvageLossResult = state.pendingEffect.type === "lose_salvage"
        ? resolveFloorZeroSalvageLoss(
            requirePlayer(state, resolutionAction.seatId).character.salvage ?? 0,
            state.pendingEffect.amount,
            authoritativeSourceCardId
          )
        : null;
      const salvageLossSourceEventId = salvageLossResult
        ? `${state.activeResolution?.id ?? `${resolutionAction.seatId}:${authoritativeSourceCardId}:${state.sequence}`}:salvage-loss`
        : null;
      if (salvageLossSourceEventId && (state.resolvedSalvageLossSourceEventIds ?? []).includes(salvageLossSourceEventId)) {
        return reject(state, action, "Salvage loss source was already resolved");
      }

      if (state.pendingEffect.type === "ownerSelectedForcedDisplacement") {
        if (resolutionAction.success !== false) return reject(state, action, "False Route Procession displacement requires a confirmed failed test");
        if (authoritativeSourceCardId !== "false-route-procession" || state.pendingEffect.sourceCardId !== authoritativeSourceCardId) {
          return reject(state, action, "False Route Procession source is stale");
        }
        const player = requirePlayer(state, resolutionAction.seatId);
        const sourceSectorId = player.character.currentSpaceId;
        const sourceNode = RIFTFALL_BOARD_NODE_INDEX.get(sourceSectorId);
        const sourceResolutionId = state.activeResolution?.id ?? `${resolutionAction.seatId}:${authoritativeSourceCardId}:${state.sequence}`;
        const sourceEventId = `${sourceResolutionId}:forced-displacement`;
        if ((state.resolvedDisplacementSourceEventIds ?? []).includes(sourceEventId) || state.pendingForcedDestinationChoice?.sourceEventId === sourceEventId || state.pendingDisplacement?.sourceEventId === sourceEventId) {
          return reject(state, action, "False route source was already resolved");
        }
        const candidates = getOwnerSelectedForcedDisplacementCandidates(state, resolutionAction.seatId, sourceSectorId);
        if (!sourceNode || sourceNode.ring === "center" || candidates.length === 0) {
          const summary = "No false route was available.";
          return succeed({
            ...state,
            sequence: state.sequence + 1,
            pendingEffect: null,
            pendingFailureReaction: null,
            pendingStaticIntercessionReaction: null,
            resolvedDisplacementSourceEventIds: [...(state.resolvedDisplacementSourceEventIds ?? []), sourceEventId],
            activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "False route unavailable", text: summary, effects: [summary] } } : null,
            eventLog: [...state.eventLog, { ...action, sourceEventId, candidates: [], summary }]
          });
        }
        const choiceId = `false-route-choice:${sourceEventId}`;
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingFailureReaction: null,
          pendingStaticIntercessionReaction: null,
          pendingForcedDestinationChoice: {
            choiceId,
            ownerSeatId: resolutionAction.seatId,
            sourceId: "false-route-procession",
            sourceEventId,
            sourceResolutionId,
            sourceSectorId,
            ring: sourceNode.ring,
            candidates,
            distance: 1,
            ringPolicy: "sameRing",
            destinationOwner: "affectedSeat",
            createdAt: resolutionAction.createdAt,
            status: "awaitingChoice"
          },
          activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "Choose the false route", text: "Choose one legal destination on your current ring.", effects: ["Owner route choice pending."] } } : null,
          eventLog: [...state.eventLog, { ...action, sourceEventId, candidateCount: candidates.length }]
        });
      }

      if (state.pendingEffect.type === "forcedDisplacement") {
        if (resolutionAction.success !== false) return reject(state, action, "Forced displacement requires a confirmed failed test");
        const effect = state.pendingEffect;
        const destinationSectorId = getForcedDisplacementDestination(state, resolutionAction.seatId, effect.direction);
        const sourceResolutionId = state.activeResolution?.id ?? `${resolutionAction.seatId}:${resolutionAction.sourceCardId ?? "encounter"}:${state.sequence}`;
        const sourceEventId = `${sourceResolutionId}:forced-displacement`;
        if ((state.resolvedDisplacementSourceEventIds ?? []).includes(sourceEventId)) return reject(state, action, "Forced displacement source was already resolved");

        if (!destinationSectorId) {
          const fallbackState = effect.fallbackEffect ? applyEffectToState(state, resolutionAction.seatId, effect.fallbackEffect) : state;
          const summary = effect.fallbackEffect ? `No legal ${effect.direction} destination. Suffered 1 Wound instead.` : "No legal displacement destination. The operative remained in place.";
          return succeed({
            ...fallbackState,
            sequence: state.sequence + 1,
            pendingEffect: null,
            pendingFailureReaction: null,
            pendingStaticIntercessionReaction: null,
            resolvedDisplacementSourceEventIds: [...(state.resolvedDisplacementSourceEventIds ?? []), sourceEventId],
            activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "Displacement blocked", text: summary, effects: [summary] } } : null,
            eventLog: [...state.eventLog, action]
          });
        }

        const pendingDisplacement = createPendingDisplacement(state, resolutionAction, effect, destinationSectorId);
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingFailureReaction: null,
          pendingStaticIntercessionReaction: null,
          pendingDisplacement,
          activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "Forced displacement pending", text: `${state.currentEncounter?.title ?? "The encounter"} twisted the road.`, effects: ["Forced displacement pending."] } } : null,
          eventLog: [...state.eventLog, action]
        });
      }

      const trailingPayment =
        state.pendingEffect.type === "sequence" &&
        state.pendingEffect.effects.length > 0 &&
        state.pendingEffect.effects[state.pendingEffect.effects.length - 1]?.type === "encounter_payment"
          ? (state.pendingEffect.effects[state.pendingEffect.effects.length - 1] as EncounterPaymentEffect)
          : state.pendingEffect.type === "encounter_payment"
            ? state.pendingEffect
            : null;

      if (trailingPayment) {
        const leadingEffects =
          state.pendingEffect.type === "sequence" ? state.pendingEffect.effects.slice(0, -1) : [];
        const leadingEffect: EncounterEffect | null =
          leadingEffects.length === 0
            ? null
            : leadingEffects.length === 1
              ? leadingEffects[0]!
              : { type: "sequence", effects: leadingEffects };
        const stateAfterLeadingEffects = leadingEffect
          ? applyEffectToState(state, resolutionAction.seatId, leadingEffect)
          : state;
        const leadingSummaries = leadingEffect
          ? summarizeAppliedEffects(
              leadingEffect,
              resolutionAction.success,
              requirePlayer(state, resolutionAction.seatId).character.salvage ?? 0,
              requirePlayer(state, resolutionAction.seatId).character.wounds
            )
          : [];
        const pending = createPendingEncounterDecision(stateAfterLeadingEffects, resolutionAction, trailingPayment);
        if ((state.resolvedEncounterDecisionIds ?? []).includes(pending.decisionId)) {
          return reject(state, action, "Encounter payment decision was already resolved");
        }
        const player = requirePlayer(stateAfterLeadingEffects, resolutionAction.seatId);
        const affordable = (player.character.salvage ?? 0) >= pending.salvageCost;
        const paidEffectCanResolve = pending.paidEffect.type !== "heal_wound" || player.character.wounds >= pending.paidEffect.amount;
        if ((pending.mode === "required" && !affordable) || (pending.mode === "optional" && (!affordable || !paidEffectCanResolve))) {
          const unavailableState = applyEncounterPaymentResult(stateAfterLeadingEffects, resolutionAction.seatId, pending.unavailableEffect);
          const summary = summarizeEncounterPaymentResult(pending.unavailableEffect);
          return succeed({
            ...unavailableState,
            sequence: state.sequence + 1,
            pendingEffect: null,
            pendingEncounterDecision: null,
            resolvedEncounterDecisionIds: [...(state.resolvedEncounterDecisionIds ?? []), pending.decisionId],
            activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: pending.mode === "optional" ? "Recovery offer skipped" : "Unable to pay", text: [...leadingSummaries, summary].join(" "), effects: [...leadingSummaries, summary] } } : null,
            lastOutcomeSummary: state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${[...leadingSummaries, summary].join(" ")}` } : null,
            eventLog: [...state.eventLog, action]
          });
        }
        return succeed({
          ...stateAfterLeadingEffects,
          sequence: state.sequence + 1,
          pendingEffect: null,
          pendingEncounterDecision: pending,
          activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: pending.mode === "optional" ? "Recovery offer" : "Payment required", text: [...leadingSummaries, pending.prompt].join(" "), effects: [...leadingSummaries, pending.prompt] } } : null,
          lastOutcomeSummary: state.lastOutcomeSummary && leadingSummaries.length > 0 ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${leadingSummaries.join(" ")}` } : state.lastOutcomeSummary,
          eventLog: [...state.eventLog, action]
        });
      }

      const resolutionPlayer = requirePlayer(state, resolutionAction.seatId);
      const appliedEffectSummaries = summarizeAppliedEffects(
        state.pendingEffect as EncounterEffect,
        resolutionAction.success,
        resolutionPlayer.character.salvage ?? 0,
        resolutionPlayer.character.wounds
      );
      if (
        salvageLossResult?.actualLoss === 0 &&
        THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS.has(salvageLossResult.sourceCardId)
      ) {
        appliedEffectSummaries.splice(0, appliedEffectSummaries.length, "No Salvage to lose.");
      }
      const containsSalvageLoss = JSON.stringify(state.pendingEffect).includes('"lose_salvage"');

      const stateAfterEffect = isShatteredBarricadeEscalation || isGateblindPulseEscalation
        ? state
        : applyEffectToState(state, resolutionAction.seatId, state.pendingEffect as EncounterEffect);

      return succeed({
        ...stateAfterEffect,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: state.resolutionSource,
        pendingEffect: null,
        pendingDisplacement: null,
        pendingDisplacementArrival: null,
        pendingFailureReaction: null,
        pendingStaticIntercessionReaction: null,
        pendingSutureStormConsequence: state.pendingSutureStormConsequence?.stage === "fallbackWound"
          ? null
          : state.pendingSutureStormConsequence,
        resolvedDisplacementSourceEventIds: state.pendingSutureStormConsequence?.stage === "fallbackWound"
          ? [...(state.resolvedDisplacementSourceEventIds ?? []), `${state.pendingSutureStormConsequence.sourceResolutionId}:forced-displacement`]
          : state.resolvedDisplacementSourceEventIds,
        resolvedSalvageLossSourceEventIds: salvageLossSourceEventId
          ? [...(state.resolvedSalvageLossSourceEventIds ?? []), salvageLossSourceEventId]
          : state.resolvedSalvageLossSourceEventIds,
        lastOutcomeSummary: containsSalvageLoss && state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.encounterTitle ?? "Outcome"}. ${appliedEffectSummaries.join(" ")}` } : state.lastOutcomeSummary,
        activeResolution: state.activeResolution
          ? {
              ...state.activeResolution,
              stage: "outcome_summary",
              outcome: {
                title: resolutionAction.success === false ? "Failure applied" : "Outcome applied",
                text: appliedEffectSummaries.join(" "),
                effects: appliedEffectSummaries,
                ...(salvageLossResult ? { salvageLoss: salvageLossResult } : {})
              }
            }
          : state.activeResolution,
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCAR_TRIGGER_EVENT": {
      if (action.sourceEvent.seatId !== action.seatId) return reject(state, action, "Scar trigger seat does not match its source event");
      if ((state.resolvedScarSourceEventIds ?? []).includes(action.sourceEvent.id)) return reject(state, action, "Scar source event was already processed");
      return succeed({
        ...beginScarTriggerEvent(state, action.sourceEvent, action.createdAt),
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ENCOUNTER_DECISION_RESOLVED": {
      const decisionAction = action as EncounterDecisionResolvedAction;
      try { ensureSeatTurn(state, decisionAction.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot act"); }
      if (state.phase !== "resolution") return reject(state, action, `Cannot resolve encounter payment during phase ${state.phase}`);
      const pending = state.pendingEncounterDecision;
      if (!pending) return reject(state, action, "No encounter payment decision is pending");
      if (pending.seatId !== decisionAction.seatId) return reject(state, action, "Encounter payment belongs to another seat");
      if (pending.decisionId !== decisionAction.decisionId || pending.decisionVersion !== decisionAction.decisionVersion) return reject(state, action, "Encounter payment decision is stale");
      if ((state.resolvedEncounterDecisionIds ?? []).includes(pending.decisionId)) return reject(state, action, "Encounter payment decision was already resolved");
      if (!pending.legalOptionIds.includes(decisionAction.optionId)) return reject(state, action, "Encounter payment option is not authoritative");
      if (state.activeResolution?.id !== pending.sourceResolutionId || state.currentEncounter?.id !== pending.sourceCardId) return reject(state, action, "Encounter payment source is stale");
      const isPaid = decisionAction.optionId === pending.paidOptionId;
      const player = requirePlayer(state, decisionAction.seatId);
      if (isPaid && (player.character.salvage ?? 0) < pending.salvageCost) return reject(state, action, "Insufficient Salvage for encounter payment");
      const result = isPaid ? pending.paidEffect : pending.declineEffect;
      if (!result) return reject(state, action, "Encounter payment option has no authoritative result");
      if (result.type === "heal_wound" && player.character.wounds < result.amount) return reject(state, action, "Encounter payment result cannot currently resolve");
      const paidState = isPaid
        ? { ...state, players: updateActivePlayer(state, decisionAction.seatId, (entry) => ({ ...entry, character: { ...entry.character, salvage: (entry.character.salvage ?? 0) - pending.salvageCost } })) }
        : state;
      const resolvedState = applyEncounterPaymentResult(paidState, decisionAction.seatId, result);
      const effectSummary = summarizeEncounterPaymentResult(result);
      const paymentSummary = `Paid ${pending.salvageCost} Salvage.`;
      const resultSummary = isPaid ? `${paymentSummary} ${effectSummary}` : effectSummary;
      return succeed({
        ...resolvedState,
        sequence: state.sequence + 1,
        pendingEncounterDecision: null,
        resolvedEncounterDecisionIds: [...(state.resolvedEncounterDecisionIds ?? []), pending.decisionId],
        activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: isPaid ? "Payment accepted" : "Offer declined", text: resultSummary, effects: isPaid ? [paymentSummary, effectSummary] : [resultSummary] } } : null,
        lastOutcomeSummary: state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${resultSummary}` } : null,
        eventLog: [...state.eventLog, { ...action, salvageCost: isPaid ? pending.salvageCost : 0, paid: isPaid, summary: resultSummary }]
      });
    }
    case "SUTURE_STORM_CONTINUED": {
      const continuedAction = action as SutureStormContinuedAction;
      try { ensureSeatTurn(state, continuedAction.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot act"); }
      if (state.phase !== "resolution") return reject(state, action, `Cannot continue Suture Storm during phase ${state.phase}`);
      const pending = state.pendingSutureStormConsequence;
      if (!pending || pending.stage !== "afterInitialWound") return reject(state, action, "No initial Suture Storm Wound is waiting to continue");
      if (pending.seatId !== continuedAction.seatId) return reject(state, action, "Suture Storm consequence belongs to another seat");
      if (state.currentEncounter?.id !== pending.sourceCardId) return reject(state, action, "Suture Storm source is stale");
      const displacementSourceEventId = `${pending.sourceResolutionId}:forced-displacement`;
      if ((state.resolvedDisplacementSourceEventIds ?? []).includes(displacementSourceEventId)) return reject(state, action, "Suture Storm displacement source was already resolved");
      const player = requirePlayer(state, continuedAction.seatId);
      if (player.character.status !== "active") {
        const summary = "The operative was recalled before forced displacement could begin.";
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingSutureStormConsequence: null,
          resolvedDisplacementSourceEventIds: [...(state.resolvedDisplacementSourceEventIds ?? []), displacementSourceEventId],
          lastOutcomeSummary: state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${summary}` } : null,
          eventLog: [...state.eventLog, { ...action, sourceEventId: pending.sourceEventId, continued: false, summary }]
        });
      }
      const destinationSectorId = getForcedDisplacementDestination(state, continuedAction.seatId, pending.displacement.direction);
      if (!destinationSectorId) {
        const summary = "No legal counterclockwise destination. The fallback Wound is pending prevention.";
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: pending.displacement.fallbackEffect ?? { type: "take_wound", amount: 1 },
          pendingSutureStormConsequence: { ...pending, stage: "fallbackWound" },
          lastOutcomeSummary: state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${summary}` } : null,
          eventLog: [...state.eventLog, { ...action, sourceEventId: pending.sourceEventId, continued: true, fallbackPending: true, summary }]
        });
      }
      const pendingDisplacement = createPendingDisplacement(
        state,
        { type: "RESOLUTION_APPLIED", seatId: continuedAction.seatId, effect: pending.displacement, sourceCardId: pending.sourceCardId, success: false, createdAt: continuedAction.createdAt },
        pending.displacement,
        destinationSectorId,
        pending.sourceResolutionId
      );
      return succeed({
        ...state,
        sequence: state.sequence + 1,
        pendingDisplacement,
        pendingSutureStormConsequence: { ...pending, stage: "displacement" },
        eventLog: [...state.eventLog, { ...action, sourceEventId: pending.sourceEventId, continued: true }]
      });
    }
    case "FORCED_DESTINATION_SELECTED": {
      const destinationAction = action as ForcedDestinationSelectedAction;
      try { ensureSeatTurn(state, destinationAction.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot act"); }
      if (state.phase !== "resolution") return reject(state, action, `Cannot select a forced destination during phase ${state.phase}`);
      const pending = state.pendingForcedDestinationChoice;
      if (!pending) return reject(state, action, "No forced destination choice is pending");
      if (pending.ownerSeatId !== destinationAction.seatId) return reject(state, action, "Forced destination choice belongs to another seat");
      if (pending.choiceId !== destinationAction.choiceId) return reject(state, action, "Forced destination choice is stale");
      if ((state.resolvedDisplacementSourceEventIds ?? []).includes(pending.sourceEventId)) return reject(state, action, "False route source was already resolved");

      const player = requirePlayer(state, destinationAction.seatId);
      if (player.character.currentSpaceId !== pending.sourceSectorId || player.sectorId !== pending.sourceSectorId || player.character.status !== "active") {
        const summary = "The false route expired because the operative was no longer at its source sector.";
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingForcedDestinationChoice: null,
          resolvedDisplacementSourceEventIds: [...(state.resolvedDisplacementSourceEventIds ?? []), pending.sourceEventId],
          activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "False route expired", text: summary, effects: [summary] } } : null,
          eventLog: [...state.eventLog, { ...action, sourceEventId: pending.sourceEventId, cancelled: true, summary }]
        });
      }
      if (state.currentEncounter?.id !== pending.sourceId || state.activeResolution?.id !== pending.sourceResolutionId) {
        return reject(state, action, "False route source is stale");
      }
      const storedCandidate = pending.candidates.find((candidate) => candidate.sectorId === destinationAction.destinationSectorId);
      if (!storedCandidate) return reject(state, action, "Destination was not offered by the server");
      const authoritativeCandidates = getOwnerSelectedForcedDisplacementCandidates(state, destinationAction.seatId, pending.sourceSectorId);
      const authoritativeCandidate = authoritativeCandidates.find((candidate) => candidate.sectorId === storedCandidate.sectorId && candidate.direction === storedCandidate.direction);
      if (!authoritativeCandidate) return reject(state, action, "False route destination is no longer legal");

      const displacementEffect: Extract<EncounterEffect, { type: "forcedDisplacement" }> = {
        type: "forcedDisplacement",
        direction: storedCandidate.direction,
        distance: 1,
        sameRing: true,
        failureStillCounts: true
      };
      const resolutionAction: ResolutionAppliedAction = {
        type: "RESOLUTION_APPLIED",
        seatId: destinationAction.seatId,
        effect: displacementEffect,
        sourceCardId: pending.sourceId,
        success: false,
        createdAt: destinationAction.createdAt
      };
      const pendingDisplacement = createPendingDisplacement(
        state,
        resolutionAction,
        displacementEffect,
        storedCandidate.sectorId,
        pending.sourceResolutionId,
        pending.choiceId
      );
      const destinationName = state.sectors.find((sector) => sector.id === storedCandidate.sectorId)?.name ?? storedCandidate.sectorId;
      return succeed({
        ...state,
        sequence: state.sequence + 1,
        pendingForcedDestinationChoice: null,
        pendingDisplacement,
        activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "False route selected", text: `${storedCandidate.direction === "clockwise" ? "Clockwise" : "Counterclockwise"} to ${destinationName}.`, effects: ["Forced displacement reaction pending."] } } : null,
        eventLog: [...state.eventLog, { ...action, sourceEventId: pending.sourceEventId, direction: storedCandidate.direction }]
      });
    }
    case "FORCED_DISPLACEMENT_RESOLVED": {
      const displacementAction = action as ForcedDisplacementResolvedAction;
      try { ensureSeatTurn(state, displacementAction.seatId); } catch (error) { return reject(state, action, error instanceof Error ? error.message : "Seat cannot act"); }
      if (state.phase !== "resolution") return reject(state, action, `Cannot resolve forced displacement during phase ${state.phase}`);
      const pending = state.pendingDisplacement;
      if (!pending) return reject(state, action, "No forced displacement is pending");
      if (pending.seatId !== displacementAction.seatId) return reject(state, action, "Forced displacement belongs to another seat");
      if (pending.reactionId !== displacementAction.reactionId) return reject(state, action, "Forced displacement reaction is stale");
      if ((state.resolvedDisplacementSourceEventIds ?? []).includes(pending.sourceEventId)) return reject(state, action, "Forced displacement source was already resolved");
      if (state.currentEncounter?.id !== pending.sourceId || state.activeResolution?.id !== pending.sourceResolutionId) return reject(state, action, "Forced displacement source is stale");
      const player = requirePlayer(state, displacementAction.seatId);
      if (player.character.currentSpaceId !== pending.originSectorId || player.sectorId !== pending.originSectorId) return reject(state, action, "Forced displacement origin is stale");

      const legalDestination = getForcedDisplacementDestination(state, displacementAction.seatId, pending.direction);
      const canDisplace = legalDestination === pending.destinationSectorId;
      const destinationName = state.sectors.find((sector) => sector.id === pending.destinationSectorId)?.name ?? pending.destinationSectorId;
      const isSutureStorm = pending.sourceId === "suture-storm" && state.pendingSutureStormConsequence?.stage === "displacement";
      if (!canDisplace && isSutureStorm && pending.fallbackEffect) {
        const summary = "The displacement route became illegal. The fallback Wound is pending prevention.";
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingEffect: pending.fallbackEffect,
          pendingDisplacement: null,
          pendingDisplacementArrival: null,
          pendingSutureStormConsequence: { ...state.pendingSutureStormConsequence!, stage: "fallbackWound" },
          lastOutcomeSummary: state.lastOutcomeSummary ? { ...state.lastOutcomeSummary, summary: `${state.lastOutcomeSummary.summary} ${summary}` } : null,
          eventLog: [...state.eventLog, { ...action, sourceId: pending.sourceId, originSectorId: pending.originSectorId, destinationSectorId: null, displaced: false, fallbackPending: true, summary }]
        });
      }
      const displacedState = canDisplace
        ? {
            ...state,
            players: updateActivePlayer(state, displacementAction.seatId, (entry) => ({
              ...entry,
              sectorId: pending.destinationSectorId,
              character: { ...entry.character, currentSpaceId: pending.destinationSectorId }
            }))
          }
        : pending.fallbackEffect
          ? applyEffectToState(state, displacementAction.seatId, pending.fallbackEffect)
          : state;
      const summary = canDisplace
        ? `Forced displacement resolved to ${destinationName}.`
        : pending.fallbackEffect
          ? "The displacement route became illegal. Suffered 1 Wound instead."
          : "The displacement route became illegal. The operative remained in place.";
      return succeed({
        ...displacedState,
        sequence: state.sequence + 1,
        pendingDisplacement: null,
        pendingSutureStormConsequence: isSutureStorm ? null : state.pendingSutureStormConsequence,
        pendingDisplacementArrival: canDisplace ? { seatId: pending.seatId, sectorId: pending.destinationSectorId, sourceEventId: pending.sourceEventId } : null,
        resolvedDisplacementSourceEventIds: [...(state.resolvedDisplacementSourceEventIds ?? []), pending.sourceEventId],
        activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: canDisplace ? "Forced displacement" : "Displacement blocked", text: summary, effects: [summary] } } : null,
        eventLog: [...state.eventLog, { ...action, sourceId: pending.sourceId, originSectorId: pending.originSectorId, destinationSectorId: canDisplace ? pending.destinationSectorId : null, displaced: canDisplace, summary }]
      });
    }
    case "CONTINUE_SCAR_CONSEQUENCE": {
      const pending = state.pendingScarConsequence;
      if (!pending) return reject(state, action, "No Scar consequence is waiting");
      if (pending.seatId !== action.seatId) return reject(state, action, "Scar consequence belongs to another seat");
      if (pending.reactionId !== action.reactionId) return reject(state, action, "Scar consequence reaction is stale");
      const resolved = pending.pendingEffects.reduce((next, entry) => applyEffectToState(next, pending.seatId, entry.effect), state);
      const queue = resolved.pendingScarConsequenceQueue ?? [];
      return succeed({
        ...resolved,
        pendingScarConsequence: queue[0] ?? null,
        pendingScarConsequenceQueue: queue.slice(1),
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "WOUND_THRESHOLD_REACHED": {
      const woundAction = action as WoundThresholdReachedAction;

      try {
        ensureSeatTurn(state, woundAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      const player = requirePlayer(state, woundAction.seatId);
      const shouldTriggerDeathless =
        player.character.id === MASTER_ALPHA_ID && !hasMasterAlphaDeathlessTriggered(state, woundAction.seatId);

      if (shouldTriggerDeathless) {
        const summary = "Deathless Protocol prevented MASTER ALPHA from being recalled.";

        return succeed({
          ...state,
          sequence: state.sequence + 1,
          resolutionSource: state.resolutionSource,
          players: updateActivePlayer(state, woundAction.seatId, (entry) => ({
            ...entry,
            character: {
              ...entry.character,
              wounds: 1,
              status: "active"
            }
          })),
          lastOutcomeSummary: state.lastOutcomeSummary
            ? {
                ...state.lastOutcomeSummary,
                summary: `${state.lastOutcomeSummary.summary} ${summary}`
              }
            : null,
          eventLog: [
            ...state.eventLog,
            {
              type: "ABILITY_TRIGGERED",
              seatId: woundAction.seatId,
              abilityId: MASTER_ALPHA_DEATHLESS_ABILITY_ID,
              summary,
              createdAt: woundAction.createdAt
            }
          ]
        });
      }

      const scarredState: GameState = clearNextNormalMovementRollModifierForSeat(clearNextNonBattleTestModifierForSeat({
        ...state,
        sequence: state.sequence + 1,
        resolutionSource: state.resolutionSource,
        players: updateActivePlayer(state, action.seatId, (player) => ({
          ...player,
          character: {
            ...player.character,
            status: "recalled",
            scars: [...player.character.scars, woundAction.scar]
          }
        })),
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              summary: `${state.lastOutcomeSummary.summary} Wound threshold reached. Operative recalled and scarred.`
            }
          : null,
        eventLog: [...state.eventLog, action]
      }, action.seatId), action.seatId);
      if (scarredState.pendingSutureStormConsequence?.seatId === woundAction.seatId) {
        scarredState.pendingSutureStormConsequence = {
          ...scarredState.pendingSutureStormConsequence,
          resultingStatus: "recalled"
        };
      }
      return succeed(beginScarTriggerEvent(scarredState, {
        id: `${woundAction.createdAt}:${woundAction.seatId}:scar-gained:${woundAction.scar}`,
        type: "onScarGained",
        seatId: woundAction.seatId,
        sourceId: woundAction.scar
      }, woundAction.createdAt));
    }
    case "RECRUIT_REPLACEMENT": {
      const recruitAction = action as RecruitReplacementAction;

      try {
        ensureSeatTurn(state, recruitAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      const player = requirePlayer(state, recruitAction.seatId);

      if (player.character.status !== "recalled") {
        return reject(state, action, "Only recalled seats can recruit a replacement");
      }

      if (!recruitAction.replacementCharacter) {
        return reject(state, action, `Unknown replacement character ${recruitAction.replacementCharacterId}`);
      }

      return succeed(clearNextNormalMovementRollModifierForSeat(clearNextNonBattleTestModifierForSeat({
        ...state,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        pendingEnemyRoll: null,
        seats: state.seats.map((entry) =>
          entry.seatId === recruitAction.seatId
            ? {
                ...entry,
                characterId: recruitAction.replacementCharacterId
              }
            : entry
        ),
        players: updateActivePlayer(state, recruitAction.seatId, (entry) => ({
          ...entry,
          character: ensureOwnedGearInstanceIds({
            ...recruitAction.replacementCharacter!,
            currentSpaceId: entry.sectorId,
            trophies: 0,
            trophyPile: [],
            wounds: 0,
            status: "active",
            heldGear: [...recruitAction.replacementCharacter!.heldGear],
            equippedGear: { ...recruitAction.replacementCharacter!.equippedGear },
            scars: [...entry.character.scars, ...recruitAction.replacementCharacter!.scars]
          }, recruitAction.seatId)
        })),
        lastOutcomeSummary: {
          seatId: recruitAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: null,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: null,
          replacementCharacterId: recruitAction.replacementCharacterId,
          summary: `${recruitAction.replacementCharacter.name} enters the field as a fresh replacement.`
        },
        eventLog: [...state.eventLog, action]
      }, recruitAction.seatId), recruitAction.seatId));
    }
    case "MEMORY_TAX_CHOICE_RESOLVED": {
      const choiceAction = action as MemoryTaxChoiceResolvedAction;
      try {
        ensureSeatTurn(state, choiceAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }
      if (state.phase !== "resolution") return reject(state, action, `Cannot resolve Memory Tax during phase ${state.phase}`);
      const pending = state.pendingMemoryTaxChoice;
      if (!pending) return reject(state, action, "No Memory Tax choice is pending");
      if (pending.ownerSeatId !== choiceAction.seatId) return reject(state, action, "Memory Tax choice belongs to another seat");
      if (pending.choiceId !== choiceAction.choiceId || pending.choiceVersion !== choiceAction.choiceVersion) {
        return reject(state, action, "Memory Tax choice is stale");
      }
      if ((state.resolvedMemoryTaxChoiceSourceEventIds ?? []).includes(pending.sourceEventId)) {
        return reject(state, action, "Memory Tax choice was already resolved");
      }
      if (!pending.legalOptionIds.includes(choiceAction.optionId)) {
        return reject(state, action, "Memory Tax option was not offered by the server");
      }
      if (state.currentEncounter?.id !== MEMORY_TAX_GATE_ID || state.activeResolution?.id !== pending.sourceResolutionId) {
        return reject(state, action, "Memory Tax source is stale");
      }
      const player = requirePlayer(state, choiceAction.seatId);
      if (player.character.status !== "active") {
        return succeed({
          ...state,
          sequence: state.sequence + 1,
          pendingMemoryTaxChoice: null,
          resolvedMemoryTaxChoiceSourceEventIds: [...(state.resolvedMemoryTaxChoiceSourceEventIds ?? []), pending.sourceEventId],
          eventLog: [...state.eventLog, { type: action.type, seatId: action.seatId, createdAt: action.createdAt, cancelled: true }]
        });
      }

      const salvageAvailable = (player.character.salvage ?? 0) >= 1;
      const resolvedOption = choiceAction.optionId === "lose-salvage-1" && !salvageAvailable
        ? "next-non-battle-test-minus-1"
        : choiceAction.optionId;
      let consequenceState = state;
      if (resolvedOption === "lose-salvage-1") {
        const salvageLoss = resolveFloorZeroSalvageLoss(
          player.character.salvage ?? 0,
          1,
          MEMORY_TAX_GATE_ID
        );
        consequenceState = salvageLoss.actualLoss > 0
          ? applyEffectToState(state, choiceAction.seatId, { type: "lose_salvage", amount: salvageLoss.actualLoss })
          : state;
        consequenceState = {
          ...consequenceState,
          resolvedSalvageLossSourceEventIds: [
            ...(state.resolvedSalvageLossSourceEventIds ?? []),
            `${pending.sourceEventId}:salvage-loss`
          ]
        };
      } else {
        consequenceState = createOrReplaceMemoryTaxGateModifier(
          state,
          choiceAction.seatId,
          `${pending.sourceEventId}:modifier`,
          choiceAction.createdAt
        );
      }
      const summary = "Memory Tax Gate was resolved.";
      return succeed({
        ...consequenceState,
        sequence: state.sequence + 1,
        pendingMemoryTaxChoice: null,
        resolvedMemoryTaxChoiceSourceEventIds: [...(state.resolvedMemoryTaxChoiceSourceEventIds ?? []), pending.sourceEventId],
        activeResolution: state.activeResolution ? {
          ...state.activeResolution,
          stage: "outcome_summary",
          outcome: { title: "Memory tax resolved", text: summary, effects: [summary] }
        } : null,
        eventLog: [...state.eventLog, {
          type: action.type,
          seatId: action.seatId,
          createdAt: action.createdAt,
          choiceId: choiceAction.choiceId,
          resolved: true,
          fallbackApplied: resolvedOption !== choiceAction.optionId
        }]
      });
    }
    case "SELECT_EQUIPMENT_SUPPRESSION_TARGET": {
      const selectAction = action as SelectEquipmentSuppressionTargetAction;
      const pending = state.pendingEquipmentSuppressionChoice;
      if (!pending || pending.choiceId !== selectAction.choiceId) return reject(state, action, "Equipment suppression choice is stale");
      if (pending.ownerSeatId !== selectAction.seatId) return reject(state, action, "Equipment suppression choice belongs to another seat");
      if ((state.resolvedEquipmentSuppressionSourceEventIds ?? []).includes(pending.sourceEventId)) return reject(state, action, "Equipment suppression choice was already resolved");
      const eligible = getEligibleEquipmentSuppressionTargets(state, selectAction.seatId);
      const item = eligible.find((entry) => entry.instanceId === selectAction.itemInstanceId);
      if (!item || !pending.eligibleInstanceIds.includes(selectAction.itemInstanceId)) return reject(state, action, "Equipment suppression target is stale or ineligible");
      const suppression = applyEquipmentSuppressionChoice(state, pending, item);
      const summary = `${requirePlayer(state, selectAction.seatId).character.name}'s Equipment was disrupted.`;
      return succeed({
        ...state,
        sequence: state.sequence + 1,
        pendingEquipmentSuppressionChoice: null,
        equipmentSuppressions: [
          ...(state.equipmentSuppressions ?? []).filter((entry) => entry.sourceEventId !== pending.sourceEventId),
          suppression
        ],
        resolvedEquipmentSuppressionSourceEventIds: [...(state.resolvedEquipmentSuppressionSourceEventIds ?? []), pending.sourceEventId],
        activeResolution: state.activeResolution ? { ...state.activeResolution, stage: "outcome_summary", outcome: { title: "Equipment disrupted", text: summary, effects: [summary] } } : null,
        eventLog: [...state.eventLog, action]
      });
    }
    case "STAT_RAISED": {
      const statRaisedAction = action as StatRaisedAction;

      try {
        canRaiseStat(state, statRaisedAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot raise a stat");
      }

      const player = requirePlayer(state, statRaisedAction.seatId);
      if (!isUpgradeableStat(statRaisedAction.stat)) {
        return reject(state, action, "Invalid stat: stat is not allowed for upgrades");
      }

      const currentValue = player.character.stats[statRaisedAction.stat];
      const expectedCost = getStatUpgradeCost(currentValue);
      const disabledReason = getStatUpgradeDisabledReason({
        stat: statRaisedAction.stat,
        currentValue,
        trophies: player.character.trophies,
        qaOnly: player.character.qaOnly === true || player.character.id === MASTER_ALPHA_ID,
        cap: NORMAL_STAT_UPGRADE_CAP
      });

      if (disabledReason) {
        return reject(state, action, disabledReason);
      }

      if (statRaisedAction.cost !== expectedCost) {
        return reject(state, action, `Stat upgrade cost must equal the next stat value (${expectedCost})`);
      }

      if (statRaisedAction.previousValue !== currentValue || statRaisedAction.nextValue !== currentValue + 1) {
        return reject(state, action, "Stat upgrade values are stale");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, statRaisedAction.seatId, (player) => ({
          ...player,
          character: {
            ...player.character,
            trophies: Math.max(0, player.character.trophies - statRaisedAction.cost),
            trophyPile: spendTrophyPileValue(player.character.trophyPile, statRaisedAction.cost),
            stats: {
              ...player.character.stats,
              [statRaisedAction.stat]: player.character.stats[statRaisedAction.stat] + 1
            },
            statUpgrades: {
              ...(player.character.statUpgrades ?? {}),
              [statRaisedAction.stat]: (player.character.statUpgrades?.[statRaisedAction.stat] ?? 0) + 1
            }
          }
        })),
        lastOutcomeSummary: {
          seatId: statRaisedAction.seatId,
          movedToSectorId: requirePlayer(state, statRaisedAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Field Promotion",
          encounterCardType: null,
          checkStat: statRaisedAction.stat,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: `${player.character.name} upgraded ${statRaisedAction.stat} to ${statRaisedAction.nextValue}.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "EQUIP_GEAR": {
      const equipAction = action as EquipGearAction;

      try {
        canManageGear(state, equipAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot manage gear");
      }

      const player = requirePlayer(state, equipAction.seatId);
      const item = equipAction.instanceId
        ? getHeldGearInstance(player.character, equipAction.instanceId)
        : getHeldGearItem(player.character, equipAction.gearId);

      if (!item || item.id !== equipAction.gearId) {
        return reject(state, action, `Gear ${equipAction.gearId} is not held by this character`);
      }

      if (item.slot !== equipAction.slot) {
        return reject(state, action, `Gear ${equipAction.gearId} cannot be equipped to ${equipAction.slot}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, equipAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            equippedGear: {
              ...entry.character.equippedGear,
              [equipAction.slot]: equipAction.gearId
            },
            equippedGearInstances: {
              ...(entry.character.equippedGearInstances ?? { weapon: null, armor: null, utility: null }),
              [equipAction.slot]: item.instanceId ?? null
            }
          }
        })),
        eventLog: [...state.eventLog, action]
      });
    }
    case "UNEQUIP_GEAR": {
      const unequipAction = action as UnequipGearAction;

      try {
        canManageGear(state, unequipAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot manage gear");
      }

      const player = requirePlayer(state, unequipAction.seatId);

      if (!player.character.equippedGear[unequipAction.slot as GearSlot]) {
        return reject(state, action, `No gear is equipped in ${unequipAction.slot}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, unequipAction.seatId, (entry) => ({
          ...entry,
          character: {
            ...entry.character,
            equippedGear: {
              ...entry.character.equippedGear,
              [unequipAction.slot]: null
            },
            equippedGearInstances: {
              ...(entry.character.equippedGearInstances ?? { weapon: null, armor: null, utility: null }),
              [unequipAction.slot]: null
            }
          }
        })),
        eventLog: [...state.eventLog, action]
      });
    }
    case "USE_GEAR": {
      const useGearAction = action as UseGearAction;

      try {
        if (useGearAction.pendingScarEffectId !== undefined || useGearAction.forcedDisplacementReactionId !== undefined) {
          requirePlayer(state, useGearAction.seatId);
        } else if (useGearAction.suppressPendingFailure || useGearAction.mirrorReroll || useGearAction.pendingTileChallengeEffectId !== undefined) {
          ensureSeatTurn(state, useGearAction.seatId);
          if (state.phase !== "resolution" || !state.pendingEffect || state.activeResolution?.roll?.success !== false ||
              (useGearAction.mirrorReroll || useGearAction.pendingTileChallengeEffectId !== undefined ? false :
              !state.pendingFailureReaction || state.pendingFailureReaction.id !== useGearAction.pendingFailureReactionId ||
              state.pendingFailureReaction.seatId !== useGearAction.seatId)) throw new Error("No matching failed test is waiting for a reaction");
        } else canManageGear(state, useGearAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot use gear");
      }

      const player = requirePlayer(state, useGearAction.seatId);
      const item = useGearAction.instanceId
        ? getHeldGearInstance(player.character, useGearAction.instanceId)
        : getHeldGearItem(player.character, useGearAction.gearId);

      if (!item || item.id !== useGearAction.gearId) {
        return reject(state, action, `Gear ${useGearAction.gearId} is not held by this character`);
      }
      if (useGearAction.pendingScarEffectId !== undefined) {
        const exactItem = player.character.heldGear.find((entry) => entry.instanceId === useGearAction.chargeInstanceId);
        if (item.chargedEffect !== "scarSinkPrayer" || !exactItem || exactItem.id !== item.id) return reject(state, action, "Scar-Sink Prayer instance is stale");
        if ((exactItem.currentCharges ?? exactItem.charges ?? 0) < (exactItem.chargeCost ?? 1)) return reject(state, action, `${item.name} has no charges remaining`);
        if (!state.pendingScarConsequence || !player.character.scars.includes(state.pendingScarConsequence.scarCardId)) return reject(state, action, "The pending Scar is not owned by this seat");
      }
      if (useGearAction.forcedDisplacementReactionId !== undefined) {
        const exactItem = player.character.heldGear.find((entry) => entry.instanceId === useGearAction.chargeInstanceId);
        const pending = state.pendingDisplacement;
        if (item.chargedEffect !== "suppressForcedDisplacement" || !exactItem || exactItem.id !== "rift-anchor-spike") return reject(state, action, "Rift Anchor Spike instance is stale");
        if ((exactItem.currentCharges ?? exactItem.charges ?? exactItem.startingCharges ?? 0) < (exactItem.chargeCost ?? 1)) return reject(state, action, `${item.name} has no charges remaining`);
        if (!pending || pending.status !== "pending" || pending.seatId !== useGearAction.seatId || pending.reactionId !== useGearAction.forcedDisplacementReactionId || pending.sourceEventId !== useGearAction.forcedDisplacementSourceEventId) return reject(state, action, "Rift Anchor Spike reaction or source event is stale");
        if (!canRiftAnchorSpikeSuppress(pending.sourceType, pending.sourceId)) return reject(state, action, "Rift Anchor Spike cannot suppress this displacement source");
        if (player.character.currentSpaceId !== pending.originSectorId || player.sectorId !== pending.originSectorId) return reject(state, action, "Forced displacement origin is stale");
        if ((state.resolvedDisplacementSourceEventIds ?? []).includes(pending.sourceEventId)) return reject(state, action, "Forced displacement source was already resolved");
      }
      if (item.effectModel === "exhaust" && item.exhausted) return reject(state, action, `${item.name} is Exhausted. Refreshes next round.`);

      try {
        ensureUseLimitAvailable(state, useGearAction.seatId, item.id, item.name, "gearId", item.useLimit);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Gear use limit reached");
      }

      const selectedChargeItem = useGearAction.chargeInstanceId ? player.character.heldGear.find((entry) => entry.instanceId === useGearAction.chargeInstanceId) ?? item : item;
      if (item.useLimit === "charge" && (selectedChargeItem.currentCharges ?? selectedChargeItem.charges ?? selectedChargeItem.startingCharges ?? 0) <= 0) {
        return reject(state, action, `${item.name} has no charges remaining`);
      }

      const rerolledState = useGearAction.mirrorReroll ? reduceGameState(state, useGearAction.mirrorReroll) : null;
      if (rerolledState && !rerolledState.ok) return reject(state, action, rerolledState.rejection.reason);
      const actionBaseState = rerolledState?.state ?? state;
      const intercession = actionBaseState.pendingStaticIntercessionReaction;
      const intercessionMatches = Boolean(useGearAction.pendingTileChallengeEffectId !== undefined && intercession &&
        intercession.id === useGearAction.staticIntercessionReactionId &&
        intercession.suppressibleEffects.some((choice) => choice.effectId === useGearAction.pendingTileChallengeEffectId));
      if (useGearAction.pendingTileChallengeEffectId !== undefined && !intercessionMatches) return reject(state, action, "Static Intercession reaction or effect is stale");
      const intercessionState = intercessionMatches
        ? { ...actionBaseState, pendingEffect: null, pendingStaticIntercessionReaction: { ...intercession!, selectedEffectId: useGearAction.pendingTileChallengeEffectId! } }
        : actionBaseState;
      const scarPending = intercessionState.pendingScarConsequence;
      const scarPrayerMatches = Boolean(useGearAction.pendingScarEffectId !== undefined && scarPending &&
        scarPending.reactionId === useGearAction.scarConsequenceReactionId &&
        scarPending.scarInstanceId === useGearAction.scarInstanceId && scarPending.seatId === useGearAction.seatId &&
        scarPending.pendingEffects.some((choice) => choice.effectId === useGearAction.pendingScarEffectId));
      if (useGearAction.pendingScarEffectId !== undefined && !scarPrayerMatches) return reject(state, action, "Scar-Sink Prayer reaction or effect is stale");
      const scarResolvedState = scarPrayerMatches
        ? scarPending!.pendingEffects
            .filter((entry) => entry.effectId !== useGearAction.pendingScarEffectId)
            .reduce((next, entry) => applyEffectToState(next, scarPending!.seatId, entry.effect), intercessionState)
        : intercessionState;
      const scarQueue = scarResolvedState.pendingScarConsequenceQueue ?? [];
      const prayerState = scarPrayerMatches ? {
        ...scarResolvedState,
        pendingScarConsequence: scarQueue[0] ?? null,
        pendingScarConsequenceQueue: scarQueue.slice(1)
      } : scarResolvedState;
      const displacementPending = prayerState.pendingDisplacement;
      const currentDisplacementDestination = displacementPending
        ? getForcedDisplacementDestination(prayerState, displacementPending.seatId, displacementPending.direction)
        : null;
      const spikeMatches = Boolean(useGearAction.forcedDisplacementReactionId !== undefined && displacementPending &&
        displacementPending.reactionId === useGearAction.forcedDisplacementReactionId &&
        displacementPending.sourceEventId === useGearAction.forcedDisplacementSourceEventId &&
        displacementPending.seatId === useGearAction.seatId &&
        currentDisplacementDestination === displacementPending.destinationSectorId);
      if (useGearAction.forcedDisplacementReactionId !== undefined && !spikeMatches) return reject(state, action, "Rift Anchor Spike reaction is stale");
      const spikeState = spikeMatches ? {
        ...prayerState,
        pendingDisplacement: null,
        pendingDisplacementArrival: null,
        pendingSutureStormConsequence: displacementPending?.sourceId === "suture-storm" ? null : prayerState.pendingSutureStormConsequence,
        resolvedDisplacementSourceEventIds: [...(prayerState.resolvedDisplacementSourceEventIds ?? []), displacementPending!.sourceEventId],
        activeResolution: prayerState.activeResolution ? {
          ...prayerState.activeResolution,
          stage: "outcome_summary" as const,
          outcome: { title: "Rift Anchor Spike deployed", text: "Forced displacement prevented.", effects: ["Forced displacement prevented."] }
        } : null
      } : prayerState;
      const effectedState = useGearAction.effect ? applyEffectToState(spikeState, useGearAction.seatId, useGearAction.effect) : spikeState;
      const paidState = useGearAction.salvageCost ? {
        ...effectedState,
        players: updateActivePlayer(effectedState, useGearAction.seatId, (entry) => ({ ...entry, character: { ...entry.character, salvage: (entry.character.salvage ?? 0) - useGearAction.salvageCost! } }))
      } : effectedState;
      const exhaustedGearState = useGearAction.exhaustInstanceId !== undefined || item.effectModel === "exhaust" ? {
        ...paidState,
        players: updateActivePlayer(paidState, useGearAction.seatId, (entry) => ({ ...entry, character: { ...entry.character, heldGear: entry.character.heldGear.map((owned) =>
          (useGearAction.exhaustInstanceId ? owned.instanceId === useGearAction.exhaustInstanceId : owned === item) ? { ...owned, exhausted: true } : owned) } }))
      } : paidState;
      const chargedState = item.useLimit === "charge"
        ? spendHeldGearCharge(exhaustedGearState, useGearAction.seatId, useGearAction.gearId, useGearAction.chargeInstanceId)
        : exhaustedGearState;
      const revealedState = useGearAction.oathchainReveal ? {
        ...chargedState,
        players: updateActivePlayer(chargedState, useGearAction.seatId, (entry) => ({
          ...entry,
          private: { ...entry.private, activeOathchainReveal: useGearAction.oathchainReveal }
        }))
      } : chargedState;
      const finalState = useGearAction.discard
        ? discardHeldGear(revealedState, useGearAction.seatId, useGearAction.gearId, useGearAction.instanceId)
        : revealedState;
      const updatedPlayer = requirePlayer(finalState, useGearAction.seatId);

      return succeed({
        ...finalState,
        pendingTileChallenge: useGearAction.pendingTileChallengeId && finalState.pendingTileChallenge?.id === useGearAction.pendingTileChallengeId && useGearAction.rollModifier
          ? {
              ...finalState.pendingTileChallenge,
              modifierSources: [
                ...finalState.pendingTileChallenge.modifierSources,
                { label: useGearAction.rollModifier.label, value: useGearAction.rollModifier.value, sourceInstanceId: useGearAction.chargeInstanceId }
              ]
            }
          : finalState.pendingTileChallenge,
        pendingEffect: useGearAction.suppressPendingFailure ? null : finalState.pendingEffect,
        pendingFailureReaction: useGearAction.suppressPendingFailure ? null : finalState.pendingFailureReaction,
        sequence: state.sequence + 1,
        activeResolution: appendPendingRollModifierToResolution(
          finalState.activeResolution,
          finalState.currentEncounter,
          useGearAction.rollModifier
        ),
        lastOutcomeSummary: spikeMatches && finalState.lastOutcomeSummary ? {
          ...finalState.lastOutcomeSummary,
          movedToSectorId: updatedPlayer.sectorId,
          success: false,
          summary: `${updatedPlayer.character.name} resisted forced displacement.`
        } : {
          seatId: useGearAction.seatId,
          movedToSectorId: updatedPlayer.sectorId,
          encounterCardId: null,
          encounterTitle: item.name,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: useGearAction.summary
        },
        eventLog: [...finalState.eventLog, action]
      });
    }
    case "USE_FOLLOWER": {
      const useFollowerAction = action as UseFollowerAction;
      const player = requirePlayer(state, useFollowerAction.seatId);
      const follower = (player.character.followers ?? []).find((entry) =>
        useFollowerAction.followerInstanceId ? entry.instanceId === useFollowerAction.followerInstanceId : entry.id === useFollowerAction.followerId
      );

      try {
        if (useFollowerAction.suppressPendingFailure) {
          ensureSeatTurn(state, useFollowerAction.seatId);
          if (state.phase !== "resolution" || !state.pendingEffect || state.activeResolution?.roll?.success !== false ||
              !state.pendingFailureReaction || state.pendingFailureReaction.id !== useFollowerAction.pendingFailureReactionId ||
              state.pendingFailureReaction.seatId !== useFollowerAction.seatId) throw new Error("No matching failed test is waiting for a follower reaction");
        } else if (follower?.effectModel === "exhaust") {
          ensureSeatTurn(state, useFollowerAction.seatId);
          ensureSeatCanTakeNormalTurnAction(state, useFollowerAction.seatId);
          if (!["action", "sector", "navigation", "resolution"].includes(state.phase)) throw new Error(`Cannot use ${follower.name} during phase ${state.phase}`);
        } else if (follower?.id === "fandiablos" && state.phase === "sector") {
          ensureSeatTurn(state, useFollowerAction.seatId);
          ensureSeatCanTakeNormalTurnAction(state, useFollowerAction.seatId);
        } else {
          canManageGear(state, useFollowerAction.seatId);
        }
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot use a follower");
      }

      if (!follower) {
        return reject(state, action, `Follower ${useFollowerAction.followerId} is not attached to this character`);
      }

      if (follower.effectModel === "exhaust" && follower.exhausted) {
        return reject(state, action, `${follower.name} is Exhausted. Refreshes next round.`);
      }

      if (!follower.activeEffect && !follower.useLimit) {
        return reject(state, action, `${follower.name} is passive and applies automatically.`);
      }

      try {
        ensureUseLimitAvailable(
          state,
          useFollowerAction.seatId,
          follower.id,
          follower.name,
          "followerId",
          follower.useLimit
        );
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Follower use limit reached");
      }

      const effectedState = useFollowerAction.effect
        ? applyEffectToState(state, useFollowerAction.seatId, useFollowerAction.effect)
        : state;
      const paidFollowerState = useFollowerAction.woundCost ? {
        ...effectedState,
        players: updateActivePlayer(effectedState, useFollowerAction.seatId, (entry) => ({ ...entry, character: {
          ...entry.character,
          wounds: entry.character.wounds + useFollowerAction.woundCost!,
          temporaryAllStatBoost: useFollowerAction.grantAllStatBoost ? { value: 2, remainingEligibleResolutions: 2 } : entry.character.temporaryAllStatBoost
        } }))
      } : effectedState;
      const exhaustedState = follower.effectModel === "exhaust"
        ? {
            ...paidFollowerState,
            players: updateActivePlayer(paidFollowerState, useFollowerAction.seatId, (entry) => ({
              ...entry,
              character: {
                ...entry.character,
                followers: (entry.character.followers ?? []).map((owned) =>
                  (follower.instanceId ? owned.instanceId === follower.instanceId : owned.id === follower.id) ? { ...owned, exhausted: true } : owned
                )
              }
            }))
          }
        : paidFollowerState;
      const finalState = useFollowerAction.discard
        ? discardFollower(exhaustedState, useFollowerAction.seatId, useFollowerAction.followerId)
        : exhaustedState;
      const updatedPlayer = requirePlayer(finalState, useFollowerAction.seatId);

      return succeed({
        ...finalState,
        pendingEffect: useFollowerAction.suppressPendingFailure ? null : finalState.pendingEffect,
        pendingFailureReaction: useFollowerAction.suppressPendingFailure ? null : finalState.pendingFailureReaction,
        sequence: state.sequence + 1,
        activeResolution: appendPendingRollModifierToResolution(
          finalState.activeResolution,
          finalState.currentEncounter,
          useFollowerAction.rollModifier
        ),
        lastOutcomeSummary: {
          seatId: useFollowerAction.seatId,
          movedToSectorId: updatedPlayer.sectorId,
          encounterCardId: null,
          encounterTitle: follower.name,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: useFollowerAction.summary
        },
        eventLog: [...finalState.eventLog, action]
      });
    }
    case "AFFLICTION_DRAWN": {
      const afflictionAction = action as AfflictionDrawnAction;
      const player = state.players.find((entry) => entry.seatId === afflictionAction.seatId);

      if (!player) {
        return reject(state, action, `Unknown seat ${afflictionAction.seatId}`);
      }

      const affliction =
        afflictionAction.affliction ??
        state.availableAfflictions?.find((entry) => entry.id === afflictionAction.afflictionId) ??
        null;

      if (!affliction) {
        return reject(state, action, `Unknown Affliction ${afflictionAction.afflictionId}`);
      }

      const catalog = new Map((state.availableAfflictions ?? [affliction]).map((entry) => [entry.id, entry]));
      catalog.set(affliction.id, affliction);
      const result = resolveAfflictionDraw(player, affliction, catalog, {
        createdAt: afflictionAction.createdAt,
        die: afflictionAction.die,
        chosenStat: afflictionAction.chosenStat
      });

      const nextAction: AfflictionDrawnAction = {
        ...afflictionAction,
        affliction,
        publicSummary: afflictionAction.publicSummary ?? result.publicSummary,
        privateSummary: afflictionAction.privateSummary ?? result.privateSummary,
        deltas: afflictionAction.deltas ?? result.deltas
      };

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: state.players.map((entry) => (entry.seatId === afflictionAction.seatId ? result.player : entry)),
        lastOutcomeSummary: {
          seatId: afflictionAction.seatId,
          movedToSectorId: result.player.sectorId,
          encounterCardId: null,
          encounterTitle: affliction.name,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: result.publicSummary
        },
        eventLog: [...state.eventLog, nextAction]
      });
    }
    case "TABLE_INTERACTION": {
      const tableAction = action as TableInteractionAction;

      try {
        canManageGear(state, tableAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot use table interaction");
      }

      if (state.sessionMode === "single-player") {
        return reject(state, action, "Table interactions require more than one operative");
      }

      if (tableAction.targetSeatId === tableAction.seatId) {
        return reject(state, action, "Choose another operative for table interaction");
      }

      const target = state.players.find((entry) => entry.seatId === tableAction.targetSeatId);

      if (!target) {
        return reject(state, action, `Unknown target seat ${tableAction.targetSeatId}`);
      }

      const interactionMode = state.interactionMode ?? "rivalry";

      if (interactionMode === "co-op" && (tableAction.interactionKind === "duel" || tableAction.interactionKind === "interfere")) {
        return reject(state, action, "Co-op mode only allows trade and aid");
      }

      if (
        interactionMode !== "ruthless" &&
        (tableAction.interactionKind === "duel" || tableAction.interactionKind === "interfere") &&
        hasHarmfulInteractionThisRound(state, tableAction.targetSeatId)
      ) {
        return reject(state, action, "Bounded rivalry guardrail: that operative has already been pressured this round");
      }

      const actorEffectedState = tableAction.effect ? applyEffectToState(state, tableAction.seatId, tableAction.effect) : state;
      const finalState = tableAction.targetEffect
        ? applyEffectToState(actorEffectedState, tableAction.targetSeatId, tableAction.targetEffect)
        : actorEffectedState;
      const actor = requirePlayer(finalState, tableAction.seatId);

      return succeed({
        ...finalState,
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: tableAction.seatId,
          movedToSectorId: actor.sectorId,
          encounterCardId: null,
          encounterTitle: "Table Interaction",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: tableAction.summary
        },
        eventLog: [...finalState.eventLog, action]
      });
    }
    case "SHOP_SERVICE_RESOLVED": {
      const shopAction = action as ShopServiceResolvedAction;

      try {
        canManageGear(state, shopAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot use shop services");
      }

      if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
        return reject(state, action, SHOP_FAILURE_REASONS.shopBlockedByThreat);
      }

      const player = requirePlayer(state, shopAction.seatId);

      if (player.character.currentSpaceId !== shopAction.sectorId) {
        return reject(state, action, SHOP_FAILURE_REASONS.notAtShop);
      }

      const costError = canPayShopActionCost(player, shopAction.cost);

      if (costError) {
        return reject(state, action, costError);
      }

      if (
        shopAction.serviceId === "trade-missions-for-artifact" &&
        (!shopAction.result.gainGear || shopAction.result.gainGear.tier !== "artifact")
      ) {
        return reject(state, action, "Relic dealer trades must grant an Artifact-tier item");
      }

      if (shopAction.result.discardGearId && !player.character.heldGear.some((item) => item.id === shopAction.result.discardGearId)) {
        return reject(state, action, "No matching Gear to sell");
      }

      const nextPlayers = updateActivePlayer(state, shopAction.seatId, (entry) => applyShopServiceToPlayer(entry, shopAction));
      const updatedPlayer = nextPlayers.find((entry) => entry.seatId === shopAction.seatId) ?? player;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: nextPlayers,
        shopStockReveals: (state.shopStockReveals ?? []).filter(
          (reveal) => !(reveal.seatId === shopAction.seatId && reveal.sectorId === shopAction.sectorId)
        ),
        lastOutcomeSummary: buildShopOutcomeSummary({
          seatId: shopAction.seatId,
          sectorId: updatedPlayer.sectorId,
          shopName: shopAction.shopName,
          summary: shopAction.summary
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SHOP_STOCK_REVEALED": {
      const revealAction = action as ShopStockRevealedAction;

      try {
        canManageGear(state, revealAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot reveal shop stock");
      }

      if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
        return reject(state, action, SHOP_FAILURE_REASONS.shopBlockedByThreat);
      }

      const player = requirePlayer(state, revealAction.seatId);

      if (player.character.currentSpaceId !== revealAction.sectorId) {
        return reject(state, action, SHOP_FAILURE_REASONS.notAtShop);
      }

      const costError = canPayShopActionCost(player, revealAction.cost);

      if (costError) {
        return reject(state, action, costError);
      }

      const nextPlayers = updateActivePlayer(state, revealAction.seatId, (entry) =>
        applyShopCostOnlyToPlayer(entry, revealAction.cost)
      );
      const updatedPlayer = nextPlayers.find((entry) => entry.seatId === revealAction.seatId) ?? player;
      const nextReveal = {
        seatId: revealAction.seatId,
        sectorId: revealAction.sectorId,
        serviceId: revealAction.serviceId,
        shopName: revealAction.shopName,
        stockIds: revealAction.stock.map((item) => item.id),
        revealCost: revealAction.cost,
        createdAt: revealAction.createdAt
      };

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: nextPlayers,
        shopStockReveals: [
          ...(state.shopStockReveals ?? []).filter(
            (reveal) => !(reveal.seatId === revealAction.seatId && reveal.sectorId === revealAction.sectorId)
          ),
          nextReveal
        ],
        lastOutcomeSummary: buildShopOutcomeSummary({
          seatId: revealAction.seatId,
          sectorId: updatedPlayer.sectorId,
          shopName: revealAction.shopName,
          summary: revealAction.summary
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SHOP_PURCHASE_RESOLVED": {
      const purchaseAction = action as ShopPurchaseResolvedAction;

      try {
        canManageGear(state, purchaseAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot purchase shop stock");
      }

      if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
        return reject(state, action, SHOP_FAILURE_REASONS.shopBlockedByThreat);
      }

      const player = requirePlayer(state, purchaseAction.seatId);

      if (player.character.currentSpaceId !== purchaseAction.sectorId) {
        return reject(state, action, SHOP_FAILURE_REASONS.notAtShop);
      }

      const reveal = (state.shopStockReveals ?? []).find(
        (entry) =>
          entry.seatId === purchaseAction.seatId &&
          entry.sectorId === purchaseAction.sectorId &&
          entry.stockIds.includes(purchaseAction.cardId)
      );

      if (!reveal) {
        return reject(state, action, SHOP_FAILURE_REASONS.itemUnavailable);
      }

      if (player.character.heldGear.some((item) => item.id === purchaseAction.cardId)) {
        return reject(state, action, SHOP_FAILURE_REASONS.itemUnavailable);
      }

      const costError = canPayShopActionCost(player, purchaseAction.cost);

      if (costError) {
        return reject(state, action, costError);
      }

      if (purchaseAction.serviceId === "trade-missions-for-artifact") {
        const spentIds = purchaseAction.spentCompletedContractIds ?? [];
        const currentIds = new Set(player.character.completedContracts ?? []);
        if (
          purchaseAction.gainedGear.tier !== "artifact" ||
          purchaseAction.cost.completedContracts !== 3 ||
          spentIds.length !== 3 ||
          new Set(spentIds).size !== 3 ||
          spentIds.some((contractId) => !currentIds.has(contractId))
        ) {
          return reject(state, action, "Artifact exchanges require three exact completed Contracts");
        }
      }

      const nextPlayers = updateActivePlayer(state, purchaseAction.seatId, (entry) => applyShopPurchaseToPlayer(entry, purchaseAction));
      const updatedPlayer = nextPlayers.find((entry) => entry.seatId === purchaseAction.seatId) ?? player;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: nextPlayers,
        shopStockReveals: (state.shopStockReveals ?? []).filter(
          (entry) => !(entry.seatId === purchaseAction.seatId && entry.sectorId === purchaseAction.sectorId)
        ),
        lastOutcomeSummary: buildShopOutcomeSummary({
          seatId: purchaseAction.seatId,
          sectorId: updatedPlayer.sectorId,
          shopName: purchaseAction.shopName,
          summary: purchaseAction.summary
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SHOP_SELL_RESOLVED": {
      const sellAction = action as ShopSellResolvedAction;

      try {
        canManageGear(state, sellAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot sell shop gear");
      }

      if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect) {
        return reject(state, action, SHOP_FAILURE_REASONS.shopBlockedByThreat);
      }

      const player = requirePlayer(state, sellAction.seatId);
      const boardSpace = getBoardSpace(player.character.currentSpaceId);

      if (player.character.currentSpaceId !== sellAction.sectorId || !boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
        return reject(state, action, SHOP_FAILURE_REASONS.notAtShop);
      }

      if (!player.character.heldGear.some((item) => item.id === sellAction.gearId && (!sellAction.instanceId || item.instanceId === sellAction.instanceId))) {
        return reject(state, action, SHOP_FAILURE_REASONS.itemNotHeld);
      }

      if (sellAction.salvageDelta < 1) {
        return reject(state, action, SHOP_FAILURE_REASONS.itemNotSellable);
      }

      const nextPlayers = updateActivePlayer(state, sellAction.seatId, (entry) => applyShopSellToPlayer(entry, sellAction));
      const updatedPlayer = nextPlayers.find((entry) => entry.seatId === sellAction.seatId) ?? player;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: nextPlayers,
        shopStockReveals: (state.shopStockReveals ?? []).filter(
          (entry) => !(entry.seatId === sellAction.seatId && entry.sectorId === sellAction.sectorId)
        ),
        lastOutcomeSummary: buildShopOutcomeSummary({
          seatId: sellAction.seatId,
          sectorId: updatedPlayer.sectorId,
          shopName: sellAction.shopName,
          summary: sellAction.summary
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SHOP_SKIPPED": {
      const skipAction = action as ShopSkippedAction;

      try {
        canManageGear(state, skipAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot use shop services");
      }

      const player = requirePlayer(state, skipAction.seatId);
      const boardSpace = getBoardSpace(player.character.currentSpaceId);

      if (player.character.currentSpaceId !== skipAction.sectorId || !boardSpace || !isBoardSpaceShopCapable(boardSpace)) {
        return reject(state, action, SHOP_FAILURE_REASONS.notAtShop);
      }

      const hasUnresolvedBlocker = Boolean(state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect);

      return succeed({
        ...state,
        phase: hasUnresolvedBlocker ? state.phase : "broadcast",
        sequence: state.sequence + 1,
        currentEncounter: state.currentEncounter,
        pendingEnemyRoll: state.pendingEnemyRoll,
        pendingEffect: state.pendingEffect,
        activeResolution: hasUnresolvedBlocker ? state.activeResolution : null,
        resolutionSource: hasUnresolvedBlocker ? state.resolutionSource : null,
        shopStockReveals: (state.shopStockReveals ?? []).filter(
          (entry) => !(entry.seatId === skipAction.seatId && entry.sectorId === skipAction.sectorId)
        ),
        lastOutcomeSummary: buildShopOutcomeSummary({
          seatId: skipAction.seatId,
          sectorId: player.sectorId,
          shopName: skipAction.shopName,
          summary: skipAction.summary
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "ACCEPT_CONTRACT": {
      const acceptAction = action as AcceptContractAction;

      try {
        canManageGear(state, acceptAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot accept a contract");
      }

      const player = requirePlayer(state, acceptAction.seatId);

      if (player.character.activeContract) {
        return reject(state, action, "This seat already has an active contract");
      }

      if (!acceptAction.contract) {
        return reject(state, action, `Unknown contract ${acceptAction.contractId}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, acceptAction.seatId, (entry) => ({
          ...entry,
          private: { ...entry.private, activeOathchainReveal: null },
          character: {
            ...entry.character,
            activeContract: {
              contractId: acceptAction.contractId,
              progress: 0
            }
          }
        })),
        lastOutcomeSummary: {
          seatId: acceptAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: acceptAction.contract.name,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: `Accepted contract ${acceptAction.contract.name}. ${describeContractObjective(acceptAction.contract)}.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "COMPLETE_CONTRACT": {
      const completeAction = action as CompleteContractAction;

      try {
        canManageGear(state, completeAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot complete a contract");
      }

      const player = requirePlayer(state, completeAction.seatId);
      const activeContract = player.character.activeContract;

      if (!activeContract || activeContract.contractId !== completeAction.contractId) {
        return reject(state, action, "This seat does not have that contract active");
      }

      const contract = completeAction.contract ?? requireActiveContractCard(state, completeAction.seatId);

      if (!contract) {
        return reject(state, action, `Unknown contract ${completeAction.contractId}`);
      }

      if (!isContractObjectiveComplete(contract, activeContract.progress)) {
        return reject(state, action, "Contract objective is not complete yet");
      }

      const rewardedState = applyEffectToState({
        ...state,
        players: updateActivePlayer(state, completeAction.seatId, (entry) => ({
          ...entry,
          private: { ...entry.private, activeOathchainReveal: null },
          character: {
            ...entry.character,
            activeContract: null,
            completedContracts: (entry.character.completedContracts ?? []).includes(contract.id)
              ? entry.character.completedContracts
              : [...(entry.character.completedContracts ?? []), contract.id]
          }
        }))
      }, completeAction.seatId, contract.reward);

      return succeed({
        ...rewardedState,
        sequence: state.sequence + 1,
        phase: "resolution",
        resolutionSource: "contract",
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: completeAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: contract.name,
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: `Completed contract ${contract.name}. ${formatContractObjectiveStatus(contract, getContractObjectiveTarget(contract))}. ${summarizeEffect(contract.reward, true)}`
        },
        activeResolution: buildOutcomeResolution({
          seatId: completeAction.seatId,
          source: "contract",
          createdAt: completeAction.createdAt,
          suffix: completeAction.contractId,
          card: {
            id: contract.id,
            title: contract.name,
            type: "contract",
            flavor: contract.text,
            artType: "contract"
          },
          title: "Contract completed",
          text: `Completed ${contract.name}. ${formatContractObjectiveStatus(contract, getContractObjectiveTarget(contract))}.`,
          effects: summarizeEffects(contract.reward, true)
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_CONFRONTATION_REQUESTED": {
      const scenarioAction = action as ScenarioConfrontationRequestedAction;

      try {
        canResolveScenarioConfrontation(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Scenario confrontation is not available");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "SPACE_TEXT_RESOLVED": {
      const spaceTextAction = action as SpaceTextResolvedAction;

      try {
        canResolveSpaceText(state, spaceTextAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Space text is not available");
      }

      const nextState = spaceTextAction.effect
        ? applyEffectToState(state, spaceTextAction.seatId, spaceTextAction.effect)
        : state;
      const sectorAdjustedState =
        spaceTextAction.sectorId && spaceTextAction.consumedDeckCards
          ? {
              ...nextState,
              sectors: nextState.sectors.map((sector) =>
                sector.id !== spaceTextAction.sectorId
                  ? sector
                  : {
                      ...sector,
                      encounterDecks: {
                        ...sector.encounterDecks,
                        anomaly: sector.encounterDecks.anomaly.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.anomaly?.includes(cardId)
                        ),
                        artifact: sector.encounterDecks.artifact.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.artifact?.includes(cardId)
                        ),
                        contract: sector.encounterDecks.contract.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.contract?.includes(cardId)
                        ),
                        escalation: sector.encounterDecks.escalation.filter(
                          (cardId) => !spaceTextAction.consumedDeckCards?.escalation?.includes(cardId)
                        )
                      }
                    }
              )
            }
          : nextState;
      const withDiscoveredContracts =
        spaceTextAction.discoveredContracts && spaceTextAction.discoveredContracts.length > 0
          ? {
              ...sectorAdjustedState,
              availableContracts: [
                ...sectorAdjustedState.availableContracts,
                ...spaceTextAction.discoveredContracts.filter(
                  (contract) => !sectorAdjustedState.availableContracts.some((entry) => entry.id === contract.id)
                )
              ]
            }
          : sectorAdjustedState;
      const player = requirePlayer(withDiscoveredContracts, spaceTextAction.seatId);
      const spaceTitle = getBoardSpace(player.character.currentSpaceId)?.name ?? player.character.currentSpaceId;
      const resolutionSource = inferSpaceTextResolutionSource(spaceTextAction);
      const resolutionCard = {
        id: spaceTextAction.discoveredContracts?.[0]?.id ?? spaceTextAction.effectKey,
        title: spaceTextAction.discoveredContracts?.[0]?.name ?? spaceTitle,
        type: resolutionSource === "scenario" ? "space" : resolutionSource,
        flavor: spaceTextAction.discoveredContracts?.[0]?.text ?? spaceTextAction.summary,
        artType: resolutionSource === "scenario" ? undefined : resolutionSource
      };
      const activeResolution =
        spaceTextAction.roll && spaceTextAction.checkStat && spaceTextAction.difficulty !== null && spaceTextAction.difficulty !== undefined
          ? buildRollResolution({
              seatId: spaceTextAction.seatId,
              source: resolutionSource,
              createdAt: spaceTextAction.createdAt,
              suffix: spaceTextAction.effectKey,
              card: resolutionCard,
              battle: {
                stat: spaceTextAction.checkStat,
                difficulty: spaceTextAction.difficulty,
                modifiers: [{ label: "Stat, gear, scenario", value: spaceTextAction.statBonus ?? 0 }]
              },
              dice: spaceTextAction.roll.faces,
              baseTotal: spaceTextAction.roll.total,
              modifierTotal: spaceTextAction.statBonus ?? 0,
              finalTotal: spaceTextAction.total ?? spaceTextAction.roll.total + (spaceTextAction.statBonus ?? 0),
              target: spaceTextAction.difficulty,
              success: spaceTextAction.success ?? false,
              title: spaceTextAction.success === false ? "Space check failed" : "Space check passed",
              text: spaceTextAction.summary,
              effects: summarizeEffects(spaceTextAction.effect ?? null, spaceTextAction.success ?? null)
            })
          : buildOutcomeResolution({
              seatId: spaceTextAction.seatId,
              source: resolutionSource,
              createdAt: spaceTextAction.createdAt,
              suffix: spaceTextAction.effectKey,
              card: resolutionCard,
              title: resolutionSource === "contract" ? "Contract revealed" : "Space resolved",
              text: spaceTextAction.summary,
              effects: summarizeEffects(spaceTextAction.effect ?? null, spaceTextAction.success ?? null)
            });

      return succeed({
        ...withDiscoveredContracts,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: spaceTextAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: spaceTitle,
          encounterCardType: null,
          checkStat: spaceTextAction.checkStat ?? null,
          die1: spaceTextAction.roll?.faces[0] ?? null,
          die2: spaceTextAction.roll?.faces[1] ?? null,
          statBonus: spaceTextAction.statBonus ?? null,
          checkTotal: spaceTextAction.total ?? null,
          difficulty: spaceTextAction.difficulty ?? null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: spaceTextAction.success ?? true,
          summary: spaceTextAction.summary
        },
        activeResolution,
        eventLog: [...withDiscoveredContracts.eventLog, action]
      });
    }
    case "SCENARIO_PREPARATION_GAINED": {
      const scenarioAction = action as ScenarioPreparationGainedAction;
      if (state.status !== "active" || state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, "Scenario preparation can only change for the active scenario");
      }
      if (scenarioAction.amount <= 0 || !scenarioAction.resourceKey || !scenarioAction.sourceEventId) {
        return reject(state, action, "Scenario preparation gain is malformed");
      }
      if (state.scenarioPreparation.processedSourceEventIds.includes(scenarioAction.sourceEventId)) {
        return reject(state, action, `Scenario preparation source ${scenarioAction.sourceEventId} already resolved`);
      }
      if (Object.hasOwn(state.scenarioConfrontation.progress, scenarioAction.resourceKey)) {
        return reject(state, action, `Scenario key ${scenarioAction.resourceKey} cannot own preparation and confrontation progress`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        scenarioPreparation: {
          resources: {
            ...state.scenarioPreparation.resources,
            [scenarioAction.resourceKey]:
              scenarioAction.maximum === undefined
                ? (state.scenarioPreparation.resources[scenarioAction.resourceKey] ?? 0) + scenarioAction.amount
                : Math.min(
                    scenarioAction.maximum,
                    (state.scenarioPreparation.resources[scenarioAction.resourceKey] ?? 0) + scenarioAction.amount
                  )
          },
          completedObjectiveIds: scenarioAction.objectiveId && !state.scenarioPreparation.completedObjectiveIds.includes(scenarioAction.objectiveId)
            ? [...state.scenarioPreparation.completedObjectiveIds, scenarioAction.objectiveId]
            : state.scenarioPreparation.completedObjectiveIds,
          processedSourceEventIds: [...state.scenarioPreparation.processedSourceEventIds, scenarioAction.sourceEventId]
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_PREPARATION_SPENT": {
      const scenarioAction = action as ScenarioPreparationSpentAction;
      if (state.status !== "active" || state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, "Scenario preparation can only be spent for the active scenario");
      }
      if (scenarioAction.amount <= 0 || !scenarioAction.resourceKey || !scenarioAction.sourceEventId) {
        return reject(state, action, "Scenario preparation spend is malformed");
      }
      if (state.scenarioPreparation.processedSourceEventIds.includes(scenarioAction.sourceEventId)) {
        return reject(state, action, `Scenario preparation source ${scenarioAction.sourceEventId} already resolved`);
      }
      const available = state.scenarioPreparation.resources[scenarioAction.resourceKey] ?? 0;
      if (available < scenarioAction.amount) {
        return reject(state, action, `Insufficient ${scenarioAction.resourceKey}: ${available}/${scenarioAction.amount}`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        scenarioPreparation: {
          ...state.scenarioPreparation,
          resources: {
            ...state.scenarioPreparation.resources,
            [scenarioAction.resourceKey]: available - scenarioAction.amount
          },
          processedSourceEventIds: [...state.scenarioPreparation.processedSourceEventIds, scenarioAction.sourceEventId]
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_CONFRONTATION_STARTED": {
      const scenarioAction = action as ScenarioConfrontationStartedAction;
      try {
        canResolveScenarioConfrontation(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Scenario confrontation cannot start");
      }
      if (state.status !== "active" || state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, "Scenario confrontation can only start for the active scenario");
      }
      if (state.scenarioResult.status !== "unresolved") {
        return reject(state, action, "Scenario confrontation cannot start after the scenario resolves");
      }
      if (state.scenarioConfrontation.processedSourceEventIds.includes(scenarioAction.sourceEventId)) {
        return reject(state, action, `Scenario confrontation source ${scenarioAction.sourceEventId} already resolved`);
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        scenarioConfrontation: {
          ...state.scenarioConfrontation,
          active: true,
          confrontationId: scenarioAction.confrontationId,
          stage: scenarioAction.stage,
          processedSourceEventIds: [...state.scenarioConfrontation.processedSourceEventIds, scenarioAction.sourceEventId]
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_CONFRONTATION_PROGRESS_GAINED": {
      const scenarioAction = action as ScenarioConfrontationProgressGainedAction;
      if (state.status !== "active" || state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, "Scenario confrontation progress can only change for the active scenario");
      }
      if (
        !state.scenarioConfrontation.active ||
        state.scenarioConfrontation.confrontationId !== scenarioAction.confrontationId
      ) {
        return reject(state, action, "Scenario confrontation progress requires the active confrontation");
      }
      if (scenarioAction.amount < 0 || !scenarioAction.progressKey || !scenarioAction.sourceEventId) {
        return reject(state, action, "Scenario confrontation progress is malformed");
      }
      if (state.scenarioConfrontation.processedSourceEventIds.includes(scenarioAction.sourceEventId)) {
        return reject(state, action, `Scenario confrontation source ${scenarioAction.sourceEventId} already resolved`);
      }
      if (Object.hasOwn(state.scenarioPreparation.resources, scenarioAction.progressKey)) {
        return reject(state, action, `Scenario key ${scenarioAction.progressKey} cannot own preparation and confrontation progress`);
      }
      const nextState = scenarioAction.effect
        ? applyEffectToState(state, scenarioAction.seatId, scenarioAction.effect)
        : state;

      return succeed({
        ...nextState,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        scenarioConfrontation: {
          ...nextState.scenarioConfrontation,
          active: false,
          progress: {
            ...nextState.scenarioConfrontation.progress,
            [scenarioAction.progressKey]:
              scenarioAction.progressMode === "replace"
                ? scenarioAction.amount
                : (nextState.scenarioConfrontation.progress[scenarioAction.progressKey] ?? 0) + scenarioAction.amount
          },
          stage: scenarioAction.stage,
          processedSourceEventIds: [...nextState.scenarioConfrontation.processedSourceEventIds, scenarioAction.sourceEventId]
        },
        lastOutcomeSummary: {
          seatId: scenarioAction.seatId,
          movedToSectorId: "center_cinder_gate",
          encounterCardId: null,
          encounterTitle: "The Cinder Gate",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: scenarioAction.amount > 0,
          summary: scenarioAction.summary
        },
        eventLog: [...nextState.eventLog, action]
      });
    }
    case "SCENARIO_PROGRESS_ADVANCED": {
      const scenarioAction = action as ScenarioProgressAdvancedAction;

      try {
        canResolveScenarioConfrontation(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Scenario progress cannot advance");
      }

      const nextState = scenarioAction.effect
        ? applyEffectToState(state, scenarioAction.seatId, scenarioAction.effect)
        : state;

      return succeed({
        ...nextState,
        sequence: state.sequence + 1,
        phase: "broadcast",
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        scenarioProgress: {
          ...nextState.scenarioProgress,
          [scenarioAction.progressKey]:
            Math.max(0, nextState.scenarioProgress[scenarioAction.progressKey] ?? 0) + Math.max(0, scenarioAction.amount)
        },
        lastOutcomeSummary: {
          seatId: scenarioAction.seatId,
          movedToSectorId: "center_cinder_gate",
          encounterCardId: null,
          encounterTitle: "The Cinder Gate",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: scenarioAction.amount > 0,
          summary: scenarioAction.summary
        },
        activeResolution: buildOutcomeResolution({
          seatId: scenarioAction.seatId,
          source: "scenario",
          createdAt: scenarioAction.createdAt,
          suffix: scenarioAction.progressKey,
          card: {
            id: scenarioAction.scenarioId,
            title: "The Cinder Gate",
            type: "scenario",
            flavor: scenarioAction.summary
          },
          title: scenarioAction.amount > 0 ? "Scenario progress" : "Scenario setback",
          text: scenarioAction.summary,
          effects: scenarioAction.effect ? summarizeEffects(scenarioAction.effect, scenarioAction.amount > 0) : []
        }),
        eventLog: [...nextState.eventLog, action]
      });
    }
    case "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED": {
      const scenarioAction = action as ScenarioObjectiveProgressTriggeredAction;

      if (state.status !== "active") {
        return reject(state, action, "Scenario objective progress can only advance during an active session");
      }

      if (state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, `Scenario ${scenarioAction.scenarioId} is not active`);
      }
      if (scenarioAction.scenarioId === "scenario_broken_seal") {
        return reject(state, action, "Broken Seal side objectives prepare the Cinder Gate confrontation and cannot own victory");
      }

      const player = requirePlayer(state, scenarioAction.seatId);
      const currentProgress = Math.max(0, state.scenarioProgress[scenarioAction.progressKey] ?? 0);
      const nextProgress =
        scenarioAction.required > 0
          ? Math.min(scenarioAction.required, currentProgress + Math.max(0, scenarioAction.amount))
          : currentProgress + Math.max(0, scenarioAction.amount);

      if (nextProgress <= currentProgress) {
        return reject(state, action, "Scenario objective trigger did not add progress");
      }

      const previousSummary = state.lastOutcomeSummary?.summary;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        scenarioProgress: {
          ...state.scenarioProgress,
          [scenarioAction.progressKey]: nextProgress
        },
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              seatId: scenarioAction.seatId,
              movedToSectorId: player.sectorId,
              success: true,
              summary: [previousSummary, scenarioAction.summary].filter(Boolean).join(" ")
            }
          : {
              seatId: scenarioAction.seatId,
              movedToSectorId: player.sectorId,
              encounterCardId: null,
              encounterTitle: "Scenario Objective",
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              enemyRollerSeatId: null,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              success: true,
              summary: scenarioAction.summary
            },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_VICTORY_ACHIEVED": {
      const scenarioAction = action as ScenarioVictoryAchievedAction;

      try {
        ensureSeatTurn(state, scenarioAction.seatId);
        ensureSeatCanTakeNormalTurnAction(state, scenarioAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot claim scenario victory");
      }

      if (state.status !== "active") {
        return reject(state, action, "Scenario victory can only be claimed during an active session");
      }
      if (state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, `Scenario ${scenarioAction.scenarioId} is not active`);
      }
      if (state.scenarioResult.status !== "unresolved") {
        return reject(state, action, "Scenario result has already been recorded");
      }
      if (
        scenarioAction.sourceType === "confrontation" &&
        scenarioAction.sourceId &&
        !state.scenarioConfrontation.processedSourceEventIds.includes(scenarioAction.sourceId)
      ) {
        return reject(state, action, `Scenario victory source ${scenarioAction.sourceId} is not a resolved confrontation action`);
      }

      const sourceId = scenarioAction.sourceId ?? `${scenarioAction.scenarioId}:legacy-victory:${state.sequence}`;

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: scenarioAction.seatId,
        phase: "broadcast",
        sequence: state.sequence + 1,
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        scenarioResult: {
          status: "victory",
          victoryConditionId: scenarioAction.victoryConditionId ?? `${scenarioAction.scenarioId}:victory`,
          sourceType: scenarioAction.sourceType ?? "confrontation",
          sourceId,
          winningSeatId: scenarioAction.seatId,
          shared: scenarioAction.shared ?? state.interactionMode !== "rivalry",
          achievedAtSequence: state.sequence + 1
        },
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              seatId: scenarioAction.seatId,
              movedToSectorId: "center_cinder_gate",
              success: true,
              summary: scenarioAction.summary
            }
          : {
              seatId: scenarioAction.seatId,
              movedToSectorId: "center_cinder_gate",
              encounterCardId: null,
              encounterTitle: "The Cinder Gate",
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              enemyRollerSeatId: null,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              success: true,
              summary: scenarioAction.summary
            },
        activeResolution: buildOutcomeResolution({
          seatId: scenarioAction.seatId,
          source: "scenario",
          createdAt: scenarioAction.createdAt,
          suffix: "victory",
          card: {
            id: state.activeScenarioId,
            title: "Scenario Victory",
            type: "scenario",
            flavor: scenarioAction.summary
          },
          title: "Scenario victory",
          text: scenarioAction.summary,
          effects: [scenarioAction.summary]
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "SCENARIO_OBJECTIVE_COMPLETED": {
      const scenarioAction = action as ScenarioObjectiveCompletedAction;

      if (state.status !== "active") {
        return reject(state, action, "Scenario objective can only complete during an active session");
      }

      if (state.activeScenarioId !== scenarioAction.scenarioId) {
        return reject(state, action, `Scenario ${scenarioAction.scenarioId} is not active`);
      }

      const player = requirePlayer(state, scenarioAction.seatId);

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: scenarioAction.seatId,
        phase: "broadcast",
        sequence: state.sequence + 1,
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              seatId: scenarioAction.seatId,
              movedToSectorId: player.sectorId,
              success: true,
              summary: [state.lastOutcomeSummary.summary, scenarioAction.summary].filter(Boolean).join(" ")
            }
          : {
              seatId: scenarioAction.seatId,
              movedToSectorId: player.sectorId,
              encounterCardId: null,
              encounterTitle: "Scenario Complete",
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              enemyRollerSeatId: null,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              success: true,
              summary: scenarioAction.summary
            },
        activeResolution: buildOutcomeResolution({
          seatId: scenarioAction.seatId,
          source: "scenario",
          createdAt: scenarioAction.createdAt,
          suffix: "objective-complete",
          card: {
            id: scenarioAction.scenarioId,
            title: "Scenario Complete",
            type: "scenario",
            flavor: scenarioAction.summary
          },
          title: "Scenario complete",
          text: scenarioAction.summary,
          effects: []
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "RIVALRY_AGENDA_REVEALED": {
      const rivalryAction = action as RivalryAgendaRevealedAction;

      if (state.sessionMode === "single-player" || (state.interactionMode ?? "rivalry") === "co-op") {
        return reject(state, action, "Rivalry agendas can only be revealed in rivalry or ruthless mode");
      }

      const player = requirePlayer(state, rivalryAction.seatId);
      const revealState = player.private.rivalryAgenda?.revealState ?? "revealLocked";

      if (revealState !== "revealAvailable") {
        return reject(state, action, revealState === "revealed" ? "Rivalry agenda is already revealed" : "Rivalry agenda reveal is locked");
      }

      const nextPlayers = updateActivePlayer(state, rivalryAction.seatId, (entry) => ({
        ...entry,
        private: {
          ...entry.private,
          rivalryAgenda: {
            ...(entry.private.rivalryAgenda ?? {}),
            revealState: "revealed",
            revealedAtRound: rivalryAction.revealedAtRound,
            revealedBySeatId: rivalryAction.seatId,
            publicRevealTitle: rivalryAction.publicRevealTitle,
            publicRevealSummary: rivalryAction.publicRevealSummary
          }
        }
      }));

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: nextPlayers,
        lastOutcomeSummary: {
          seatId: rivalryAction.seatId,
          movedToSectorId: player.sectorId,
          encounterCardId: null,
          encounterTitle: "Rivalry Agenda",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: rivalryAction.publicRevealSummary
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "RIVALRY_AGENDA_PROGRESS_TRIGGERED": {
      const rivalryAction = action as RivalryAgendaProgressTriggeredAction;

      if (state.sessionMode === "single-player" || (state.interactionMode ?? "rivalry") === "co-op") {
        return reject(state, action, "Rivalry agendas can only progress in rivalry or ruthless mode");
      }

      const player = requirePlayer(state, rivalryAction.seatId);
      const agendaState = player.private.rivalryAgenda;
      const revealState = agendaState?.revealState ?? "revealLocked";

      if (revealState === "completed" || revealState === "failed") {
        return reject(state, action, `Rivalry agenda is already ${revealState}`);
      }

      if (rivalryAction.required < 1 || rivalryAction.amount < 1) {
        return reject(state, action, "Rivalry agenda progress must be positive");
      }

      const previousProgress = Math.max(0, agendaState?.progressCurrent ?? 0);
      const nextProgress = Math.min(rivalryAction.required, previousProgress + rivalryAction.amount);

      if (nextProgress <= previousProgress) {
        return reject(state, action, "Rivalry agenda progress did not advance");
      }

      const completed = rivalryAction.completed || nextProgress >= rivalryAction.required;
      const completedAtRound = completed ? (agendaState?.completedAtRound ?? getCompletedRoundFromEventLog(state)) : agendaState?.completedAtRound;
      const nextAgenda = {
        ...(agendaState ?? {}),
        revealState: completed ? "completed" as const : revealState,
        progressCurrent: nextProgress,
        progressRequired: rivalryAction.required,
        progressLabel: rivalryAction.progressLabel,
        pointsAwarded: (agendaState?.pointsAwarded ?? 0) + (completed ? rivalryAction.pointsAwarded : 0),
        completedAtRound,
        completedBySeatId: completed ? (agendaState?.completedBySeatId ?? rivalryAction.seatId) : agendaState?.completedBySeatId,
        publicCompletionTitle: completed ? rivalryAction.publicCompletionTitle : agendaState?.publicCompletionTitle,
        publicCompletionSummary: completed ? rivalryAction.publicCompletionSummary : agendaState?.publicCompletionSummary,
        privateCompletionSummary: completed ? rivalryAction.privateCompletionSummary : agendaState?.privateCompletionSummary
      };
      const nextOutcomeSummary =
        completed && state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              summary: `${state.lastOutcomeSummary.summary} ${rivalryAction.publicCompletionSummary}`
            }
          : completed
            ? {
                seatId: rivalryAction.seatId,
                movedToSectorId: player.sectorId,
                encounterCardId: null,
                encounterTitle: rivalryAction.publicCompletionTitle,
                encounterCardType: null,
                checkStat: null,
                die1: null,
                die2: null,
                statBonus: null,
                checkTotal: null,
                difficulty: null,
                enemyRollerSeatId: null,
                enemyDie1: null,
                enemyDie2: null,
                enemyBonus: null,
                enemyTotal: null,
                success: true,
                summary: rivalryAction.publicCompletionSummary
              }
            : state.lastOutcomeSummary;

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        players: updateActivePlayer(state, rivalryAction.seatId, (entry) => ({
          ...entry,
          private: {
            ...entry.private,
            rivalryAgenda: nextAgenda
          }
        })),
        lastOutcomeSummary: nextOutcomeSummary,
        eventLog: [...state.eventLog, action]
      });
    }
    case "STABILIZE_RESOLVED": {
      const stabilizeAction = action as StabilizeResolvedAction;

      try {
        ensureSeatTurn(state, stabilizeAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot stabilize");
      }

      if (state.status !== "active" || state.phase !== "action") {
        return reject(state, action, "Stabilize is only available during an active action phase");
      }

      return succeed({
        ...state,
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: stabilizeAction.seatId,
          movedToSectorId: requirePlayer(state, stabilizeAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Stabilize",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: `Stabilized the breach using ${stabilizeAction.cost.kind}.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "NEMESIS_SPAWNED": {
      const nemesisAction = action as NemesisSpawnedAction;

      if (state.gameMode !== "nemesis_relay") {
        return reject(state, action, "Nemesis champions can only spawn in Nemesis Relay mode");
      }

      return succeed({
        ...state,
        nemesisChampions: nemesisAction.champions,
        nemesisNexusCountdowns: [],
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "NEMESIS_MOVED": {
      const nemesisAction = action as NemesisMovedAction;

      if (state.gameMode !== "nemesis_relay") {
        return reject(state, action, "Nemesis movement is only available in Nemesis Relay mode");
      }

      const nemesis = state.nemesisChampions.find((champion) => champion.id === nemesisAction.nemesisId);

      if (!nemesis || nemesis.defeated) {
        return reject(state, action, "Nemesis is not active");
      }

      if (nemesis.sectorId !== nemesisAction.fromSectorId) {
        return reject(state, action, "Nemesis movement source is stale");
      }

      return succeed({
        ...state,
        nemesisChampions: state.nemesisChampions.map((champion) =>
          champion.id === nemesisAction.nemesisId ? { ...champion, sectorId: nemesisAction.toSectorId } : champion
        ),
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: nemesisAction.seatId,
          movedToSectorId: nemesisAction.toSectorId,
          encounterCardId: null,
          encounterTitle: "Nemesis Relay",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: null,
          summary: `${nemesis.name} advanced ${nemesisAction.path.length} step${nemesisAction.path.length === 1 ? "" : "s"} toward the Ashen Crown Nexus.`
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "NEMESIS_COMBAT_RESOLVED": {
      const nemesisAction = action as NemesisCombatResolvedAction;
      const nemesis = state.nemesisChampions.find((champion) => champion.id === nemesisAction.nemesisId);

      if (!nemesis || nemesis.defeated) {
        return reject(state, action, "Nemesis is not active");
      }

      const nextHealth = nemesisAction.success ? Math.max(0, nemesis.health - Math.max(0, nemesisAction.damage)) : nemesis.health;

      return succeed({
        ...state,
        nemesisChampions: state.nemesisChampions.map((champion) =>
          champion.id === nemesisAction.nemesisId ? { ...champion, health: nextHealth } : champion
        ),
        phase: "broadcast",
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: nemesisAction.attackerSeatId,
          movedToSectorId: nemesis.sectorId,
          encounterCardId: nemesis.id,
          encounterTitle: nemesis.name,
          encounterCardType: "enemy",
          checkStat: nemesisAction.stat,
          die1: nemesisAction.roll.faces[0] ?? null,
          die2: nemesisAction.roll.faces[1] ?? null,
          statBonus: nemesisAction.attackerTotal - nemesisAction.roll.total,
          checkTotal: nemesisAction.attackerTotal,
          difficulty: nemesisAction.nemesisTotal,
          enemyRollerSeatId: null,
          enemyDie1: nemesisAction.nemesisRoll.faces[0] ?? null,
          enemyDie2: nemesisAction.nemesisRoll.faces[1] ?? null,
          enemyBonus: nemesisAction.nemesisTotal - nemesisAction.nemesisRoll.total,
          enemyTotal: nemesisAction.nemesisTotal,
          success: nemesisAction.success,
          summary: nemesisAction.summary
        },
        activeResolution: buildRollResolution({
          seatId: nemesisAction.attackerSeatId,
          source: "threat",
          createdAt: nemesisAction.createdAt,
          suffix: nemesis.id,
          card: {
            id: nemesis.id,
            title: nemesis.name,
            type: "nemesis",
            flavor: nemesis.type
          },
          battle: {
            enemyName: nemesis.name,
            stat: nemesisAction.stat,
            difficulty: nemesisAction.nemesisTotal,
            modifiers: [{ label: "Stat, gear, assist", value: nemesisAction.attackerTotal - nemesisAction.roll.total }]
          },
          dice: nemesisAction.roll.faces,
          baseTotal: nemesisAction.roll.total,
          modifierTotal: nemesisAction.attackerTotal - nemesisAction.roll.total,
          finalTotal: nemesisAction.attackerTotal,
          target: nemesisAction.nemesisTotal,
          success: nemesisAction.success,
          title: nemesisAction.success ? "Nemesis hit" : "Nemesis counterstrike",
          text: nemesisAction.summary,
          effects: [nemesisAction.summary]
        }),
        eventLog: [...state.eventLog, action]
      });
    }
    case "NEMESIS_ENCOUNTER_RESOLVED":
    case "NEMESIS_COMBAT_STARTED":
    case "NEXUS_TEST_STARTED":
    case "NEXUS_TEST_RESOLVED":
      return succeed({
        ...state,
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    case "NEMESIS_DEFEATED": {
      const nemesisAction = action as NemesisDefeatedAction;

      return succeed({
        ...state,
        nemesisChampions: state.nemesisChampions.map((champion) =>
          champion.id === nemesisAction.nemesisId ? { ...champion, health: 0, defeated: true } : champion
        ),
        nemesisNexusCountdowns: state.nemesisNexusCountdowns.filter((entry) => entry.nemesisId !== nemesisAction.nemesisId),
        sequence: state.sequence + 1,
        lastOutcomeSummary: state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              success: true,
              summary: `${state.lastOutcomeSummary.summary} ${nemesisAction.summary}`
            }
          : {
              seatId: nemesisAction.attackerSeatId,
              movedToSectorId: "center_cinder_gate",
              encounterCardId: nemesisAction.nemesisId,
              encounterTitle: "Nemesis defeated",
              encounterCardType: "enemy",
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              enemyRollerSeatId: null,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              success: true,
              summary: nemesisAction.summary
            },
        eventLog: [...state.eventLog, action]
      });
    }
    case "CROWN_KEY_FRAGMENT_GAINED": {
      const keyAction = action as Extract<GameAction, { type: "CROWN_KEY_FRAGMENT_GAINED" }>;
      const progressKey = getCrownKeyProgressKey(keyAction.targetSeatId);

      return succeed({
        ...state,
        scenarioProgress: {
          ...state.scenarioProgress,
          [progressKey]: Math.max(1, state.scenarioProgress[progressKey] ?? 0)
        },
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "NEMESIS_NEXUS_COUNTDOWN_STARTED": {
      const countdownAction = action as NemesisNexusCountdownStartedAction;

      return succeed({
        ...state,
        nemesisNexusCountdowns: [
          ...state.nemesisNexusCountdowns.filter((entry) => entry.nemesisId !== countdownAction.nemesisId),
          { nemesisId: countdownAction.nemesisId, remainingTurns: countdownAction.remainingTurns }
        ],
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "COOP_VICTORY_TRIGGERED": {
      const victoryAction = action as Extract<GameAction, { type: "COOP_VICTORY_TRIGGERED" }>;

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: victoryAction.seatId,
        phase: "broadcast",
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: victoryAction.seatId,
          movedToSectorId: "center_cinder_gate",
          encounterCardId: null,
          encounterTitle: "Co-op Victory",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: true,
          summary: victoryAction.summary
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "COOP_DEFEAT_TRIGGERED": {
      const defeatAction = action as Extract<GameAction, { type: "COOP_DEFEAT_TRIGGERED" }>;

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: null,
        phase: "broadcast",
        sequence: state.sequence + 1,
        lastOutcomeSummary: {
          seatId: defeatAction.seatId,
          movedToSectorId: "center_cinder_gate",
          encounterCardId: null,
          encounterTitle: "Co-op Defeat",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: false,
          summary: defeatAction.summary
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "ROUND_COMPLETED": {
      const roundAction = action as RoundCompletedAction;

      if (state.status !== "active") {
        return reject(state, action, "Only active sessions can complete a round");
      }

      return succeed({
        ...state,
        gateSaintSafeConduct: null,
        players: state.players.map((player) => ({
          ...player,
          character: {
            ...player.character,
            followers: (player.character.followers ?? []).map((follower) =>
              follower.effectModel === "exhaust" && follower.resetWindow === "round" ? { ...follower, exhausted: false } : follower
            ),
            heldGear: player.character.heldGear.map((item) => item.effectModel === "exhaust" && item.resetWindow === "round" ? { ...item, exhausted: false } : item)
          }
        })),
        sequence: state.sequence + 1,
        soloRerollCharges:
          state.sessionMode === "single-player"
            ? Object.fromEntries(state.turnOrder.map((seatId) => [seatId, 1]))
            : state.soloRerollCharges,
        eventLog: [...state.eventLog, action]
      });
    }
    case "ESCALATION_ADVANCED": {
      const escalationAction = action as EscalationAdvancedAction;

      if (state.status !== "active") {
        return reject(state, action, "Escalation can only advance during an active session");
      }

      if (Boolean(escalationAction.sourceCardId) !== Boolean(escalationAction.sourceEventId)) {
        return reject(state, action, "Sourced escalation requires both source card and source event IDs");
      }

      if (
        escalationAction.sourceEventId &&
        (state.resolvedEscalationSourceEventIds ?? []).includes(escalationAction.sourceEventId)
      ) {
        return reject(state, action, "Escalation source event was already processed");
      }

      if (escalationAction.sourceCardId === "shattered-barricade") {
        const failedCheckSource = [...state.eventLog].reverse().find((entry) => {
          const candidate = entry as { type?: string; seatId?: string; cardId?: string; success?: boolean };
          return candidate.type === "CHECK_ROLLED" && candidate.seatId === escalationAction.seatId && candidate.cardId === escalationAction.sourceCardId && candidate.success === false;
        }) as { createdAt?: unknown } | undefined;
        const expectedSourceEventId = typeof failedCheckSource?.createdAt === "string"
          ? `${escalationAction.seatId}:threat:${escalationAction.sourceCardId}:${failedCheckSource.createdAt}:global-escalation`
          : state.activeResolution
            ? `${state.activeResolution.id}:global-escalation`
            : null;
        if (
          state.currentEncounter?.id !== escalationAction.sourceCardId ||
          state.lastOutcomeSummary?.encounterCardId !== escalationAction.sourceCardId ||
          state.lastOutcomeSummary.success !== false ||
          escalationAction.sourceEventId !== expectedSourceEventId
        ) {
          return reject(state, action, "Shattered Barricade escalation source does not match the authoritative failed resolution");
        }
      }

      if (escalationAction.sourceCardId === "gateblind-pulse") {
        const failedCheckSource = [...state.eventLog].reverse().find((entry) => {
          const candidate = entry as { type?: string; seatId?: string; cardId?: string; success?: boolean };
          return candidate.type === "CHECK_ROLLED" && candidate.seatId === escalationAction.seatId && candidate.cardId === escalationAction.sourceCardId && candidate.success === false;
        }) as { createdAt?: unknown } | undefined;
        const expectedSourceEventId = typeof failedCheckSource?.createdAt === "string"
          ? `${escalationAction.seatId}:threat:${escalationAction.sourceCardId}:${failedCheckSource.createdAt}:global-escalation`
          : state.activeResolution
            ? `${state.activeResolution.id}:global-escalation`
            : null;
        if (
          state.currentEncounter?.id !== escalationAction.sourceCardId ||
          state.lastOutcomeSummary?.encounterCardId !== escalationAction.sourceCardId ||
          state.lastOutcomeSummary.success !== false ||
          escalationAction.sourceEventId !== expectedSourceEventId
        ) {
          return reject(state, action, "Gateblind Pulse escalation source does not match the authoritative failed resolution");
        }
      }

      const collapseLevel = getEscalationCollapseLevel(state.sessionMode);
      if (
        escalationAction.sourceCardId === "shattered-barricade" &&
        escalationAction.amount !== Math.min(1, Math.max(0, collapseLevel - state.escalationLevel))
      ) {
        return reject(state, action, "Shattered Barricade must apply its approved bounded escalation of exactly 1");
      }
      if (escalationAction.sourceCardId === "gateblind-pulse") {
        const expectedRequestedAmount = state.escalationLevel < collapseLevel - 1 ? 1 : 0;
        const expectedGuardedReason = expectedRequestedAmount === 0 ? "oneBeforeCollapseGuard" : undefined;
        if (
          escalationAction.previousLevel !== state.escalationLevel ||
          escalationAction.requestedAmount !== expectedRequestedAmount ||
          escalationAction.amount !== expectedRequestedAmount ||
          escalationAction.guardedReason !== expectedGuardedReason
        ) {
          return reject(state, action, "Gateblind Pulse escalation result does not match its authoritative one-before-collapse guard");
        }
        if (state.escalationLevel + escalationAction.amount >= collapseLevel) {
          return reject(state, action, "Gateblind Pulse cannot reach the collapse value");
        }
      }
      const expectedNewLevel = Math.max(0, Math.min(collapseLevel, state.escalationLevel + escalationAction.amount));
      const actualDelta = expectedNewLevel - state.escalationLevel;
      if (escalationAction.newLevel !== expectedNewLevel || escalationAction.amount !== actualDelta) {
        return reject(state, action, "Escalation result does not match the authoritative bounded value");
      }
      if (escalationAction.modifier !== getEscalationModifier(expectedNewLevel)) {
        return reject(state, action, "Escalation modifier does not match the authoritative level");
      }

      const escalationSummary = escalationAction.guardedReason === "oneBeforeCollapseGuard"
        ? `Gateblind Pulse cannot advance Global Escalation closer to collapse. Global Escalation remains ${escalationAction.newLevel}.`
        : `Global Escalation ${escalationAction.amount >= 0 ? "+" : ""}${escalationAction.amount}. Global Escalation is now ${escalationAction.newLevel}.`;
      const preservesThreatOutcome =
        Boolean(escalationAction.sourceCardId) &&
        state.lastOutcomeSummary?.encounterCardId === escalationAction.sourceCardId;

      return succeed({
        ...state,
        escalationLevel: escalationAction.newLevel,
        resolvedEscalationSourceEventIds: escalationAction.sourceEventId
          ? [...(state.resolvedEscalationSourceEventIds ?? []), escalationAction.sourceEventId]
          : state.resolvedEscalationSourceEventIds,
        sequence: state.sequence + 1,
        activeResolution: preservesThreatOutcome && state.activeResolution?.outcome
          ? {
              ...state.activeResolution,
              outcome: {
                ...state.activeResolution.outcome,
                text: `${state.activeResolution.outcome.text} ${escalationSummary}`,
                effects: [...state.activeResolution.outcome.effects, escalationSummary]
              }
            }
          : state.activeResolution,
        lastOutcomeSummary: preservesThreatOutcome && state.lastOutcomeSummary
          ? {
              ...state.lastOutcomeSummary,
              summary: `${state.lastOutcomeSummary.summary} ${escalationSummary}`
            }
          : {
              seatId: escalationAction.seatId,
              movedToSectorId: requirePlayer(state, escalationAction.seatId).sectorId,
              encounterCardId: null,
              encounterTitle: "Escalation",
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              enemyRollerSeatId: null,
              enemyDie1: null,
              enemyDie2: null,
              enemyBonus: null,
              enemyTotal: null,
              success: null,
              summary: `${escalationSummary} ${escalationAction.reason ?? "Pressure resolved"}. Difficulty modifier +${escalationAction.modifier}.`
            },
        eventLog: [...state.eventLog, action]
      });
    }
    case "SECTOR_COLLAPSED": {
      const collapseAction = action as SectorCollapsedAction;

      return succeed({
        ...state,
        status: "ended",
        winnerSeatId: null,
        phase: "broadcast",
        sequence: state.sequence + 1,
        resolutionSource: null,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: collapseAction.seatId,
          movedToSectorId: requirePlayer(state, collapseAction.seatId).sectorId,
          encounterCardId: null,
          encounterTitle: "Sector Collapse",
          encounterCardType: null,
          checkStat: null,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: null,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: false,
          summary: collapseAction.summary
        },
        eventLog: [...state.eventLog, action]
      });
    }
    case "TURN_COMPLETED":
      try {
        ensureSeatTurn(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.phase !== "broadcast") {
        return reject(state, action, `Cannot complete turn during phase ${state.phase}`);
      }

      const nextActiveSeatIndex = getNextActiveSeatIndex(state);
      const nextSeatId = state.turnOrder[nextActiveSeatIndex];
      const nextPlayer = state.players.find((entry) => entry.seatId === nextSeatId);

      return succeed({
        ...state,
        phase: nextPlayer?.character.status === "recalled" ? "action" : "navigation",
        activeSeatIndex: nextActiveSeatIndex,
        sequence: state.sequence + 1,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        activeResolution: null,
        resolutionSource: null,
        lastOutcomeSummary: null,
        players: state.players.map((entry) => entry.seatId === action.seatId ? { ...entry, private: { ...entry.private, activeOathchainReveal: null } } : entry),
        movementRolls: clearMovementRollForSeat(state, action.seatId),
        movementAdjustments: clearMovementAdjustmentForSeat(state, action.seatId),
        routeStarChoices: state.routeStarChoices ? Object.fromEntries(Object.entries(state.routeStarChoices).filter(([seatId]) => seatId !== action.seatId)) : undefined,
        eventLog: [...state.eventLog, action]
      });
    case "CONTINUE_RESOLUTION": {
      const continueAction = action as ResolutionContinuedAction;

      try {
        ensureSeatTurn(state, continueAction.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (!state.activeResolution) {
        return reject(state, action, "No active resolution is waiting to continue");
      }
      if (state.pendingEncounterDecision) {
        return reject(state, action, "Encounter payment must be resolved before continuing");
      }
      if (state.pendingForcedDestinationChoice) {
        return reject(state, action, "False route destination must be selected before continuing");
      }
      if (state.pendingDisplacement) {
        return reject(state, action, "Forced displacement must be resolved before continuing");
      }
      if (state.pendingEquipmentSuppressionChoice) {
        return reject(state, action, "Equipment suppression target must be selected before continuing");
      }
      if (state.pendingMemoryTaxChoice) {
        return reject(state, action, "Memory Tax choice must be resolved before continuing");
      }

      return succeed({
        ...state,
        activeResolution: advanceResolutionForContinue(state),
        sequence: state.sequence + 1,
        eventLog: [...state.eventLog, action]
      });
    }
    case "PHASE_ADVANCED":
      try {
        ensureSeatTurn(state, action.seatId);
      } catch (error) {
        return reject(state, action, error instanceof Error ? error.message : "Seat cannot act");
      }

      if (state.pendingMemoryTaxChoice) {
        return reject(state, action, "Memory Tax choice must be resolved before advancing");
      }

      if (!canAdvancePhase(state.phase, action.toPhase)) {
        return reject(state, action, `Illegal phase transition ${state.phase} -> ${action.toPhase}`);
      }

      const leavingResolution = state.phase === "resolution" && action.toPhase !== "resolution";
      const lifecycleCompletedState = leavingResolution
        ? consumeReservedMemoryTaxGateModifier(
            consumeReservedSirenRelayEchoModifier(
              completeEquipmentSuppressionLifecycle(state, state.activeResolution?.id),
              action.seatId
            ),
            action.seatId
          )
        : state;

      return succeed({
        ...lifecycleCompletedState,
        phase: action.toPhase,
        sequence: state.sequence + 1,
        resolutionSource: action.toPhase === "resolution" ? state.resolutionSource : null,
        currentEncounter: leavingResolution ? null : lifecycleCompletedState.currentEncounter,
        pendingEnemyRoll: leavingResolution ? null : lifecycleCompletedState.pendingEnemyRoll,
        pendingEffect: leavingResolution ? null : lifecycleCompletedState.pendingEffect,
        pendingMemoryTaxChoice: leavingResolution ? null : lifecycleCompletedState.pendingMemoryTaxChoice,
        pendingForcedDestinationChoice: leavingResolution ? null : lifecycleCompletedState.pendingForcedDestinationChoice,
        pendingDisplacement: leavingResolution ? null : lifecycleCompletedState.pendingDisplacement,
        pendingDisplacementArrival: leavingResolution ? null : lifecycleCompletedState.pendingDisplacementArrival,
        pendingSutureStormConsequence: leavingResolution ? null : lifecycleCompletedState.pendingSutureStormConsequence,
        pendingFailureReaction: leavingResolution ? null : lifecycleCompletedState.pendingFailureReaction,
        pendingTileChallenge: leavingResolution ? null : lifecycleCompletedState.pendingTileChallenge,
        activeResolution:
          action.toPhase === "broadcast" && state.activeResolution
            ? {
                ...state.activeResolution,
                stage: "awaiting_continue"
              }
            : state.activeResolution,
        activeSeatIndex:
          action.toPhase === "start"
            ? getNextActiveSeatIndex(state)
            : state.activeSeatIndex,
        eventLog: [...state.eventLog, action]
      });
    default: {
      throw new Error(`Unhandled action ${action.type}`);
    }
  }
}
