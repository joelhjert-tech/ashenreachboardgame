import { resolveBoardTextEffect } from "../data/boardTextEffects.js";
import { getBoardSpace, type BoardSpaceDefinition, type ThreatIcon } from "../data/boardSpaces.js";
import type { GameState } from "../schema/session.schema.js";
import type { TileChallenge } from "../schema/tileChallenge.schema.js";
import { getPersistentHazardServiceLockReason } from "./persistentHazards.js";
import { getBoardSpaceShopTypeLabel, isBoardSpaceShopCapable } from "./shopAvailability.js";

export type TileRuleKind = "tile-challenge" | "threat-draw" | "board-action" | "service" | "gate" | "scenario";
export type TileRepeatPolicy = "EVERY_ARRIVAL" | "ONCE_PER_TURN" | "ONCE_PER_ROUND" | "ONCE_PER_PLAYER" | "ONCE_PER_GAME" | "WHILE_PRESENT" | "SCENARIO_CONTROLLED";
export type TileRuleStatus = "current" | "pending" | "completed" | "failed" | "optional" | "locked";

export const SERVICE_THREAT_CLEAR_LOCK_REASON =
  "Service locked — clear every Threat successfully during this arrival.";

export function getSectorTextBlockReason(state: GameState, seatId: string, sectorId: string): string | null {
  const space = getBoardSpace(sectorId);
  const sector = state.sectors.find((entry) => entry.id === sectorId);
  if (!space || !sector) return "Unknown sector.";
  if (space.tier !== "outer" && space.tier !== "middle") return null;
  if (state.currentEncounter || state.pendingEnemyRoll || state.pendingEffect || state.pendingTileChallenge
    || (sector.persistentThreatIds?.length ?? 0) > 0) {
    return "Clear the current Threats before resolving this sector text.";
  }
  const progress = state.tileArrivalThreatProgress;
  if (progress?.seatId === seatId && progress.sectorId === sectorId) {
    // Shared threat bags leave the old local deck intact. Only the current
    // arrival can establish that the printed threats have been cleared.
    return progress.nextThreatIconIndex >= (progress.threatLanes?.length ?? space.threatIcons.length)
      ? null
      : "Finish the Threats during this arrival before resolving sector text.";
  }
  // Legacy states without arrival records still use the local deck.
  return sector.encounterDecks.threat.length > 0 ? "Clear the local threat deck before resolving this sector text" : null;
}

export function getServiceThreatGate(
  state: GameState,
  seatId: string,
  sectorId: string
): { allowed: boolean; pending: boolean; failed: boolean; reason: string | null } {
  const space = getBoardSpace(sectorId);
  if (!space || !isBoardSpaceShopCapable(space)) {
    return { allowed: false, pending: false, failed: false, reason: null };
  }
  const persistentHazardLockReason = getPersistentHazardServiceLockReason(state, sectorId);
  if (persistentHazardLockReason) {
    return { allowed: false, pending: false, failed: true, reason: persistentHazardLockReason };
  }
  const progress = state.tileArrivalThreatProgress?.seatId === seatId &&
    state.tileArrivalThreatProgress.sectorId === sectorId
    ? state.tileArrivalThreatProgress
    : null;
  const threatCount = state.activeScenarioId === "scenario_devourer_beneath" &&
    (state.devouredThreatSectorIds ?? []).includes(sectorId)
    ? 0
    : progress?.threatLanes?.length ?? space.threatIcons.length;
  const otherMandatoryPending = Boolean(
    state.pendingTileChallenge ||
    state.currentEncounter ||
    state.pendingEnemyRoll ||
    state.pendingEffect ||
    state.activeResolution && state.phase === "resolution"
  );
  if (!progress && state.phase === "action" && !otherMandatoryPending) {
    // Legacy v2 saves did not persist arrival outcomes. An already-open action
    // window is the authoritative evidence that their mandatory arrival work
    // finished before restoration.
    return { allowed: true, pending: false, failed: false, reason: null };
  }

  if (threatCount === 0) {
    const allowed = state.phase === "action" && !otherMandatoryPending;
    return {
      allowed,
      pending: !allowed,
      failed: false,
      reason: allowed ? null : SERVICE_THREAT_CLEAR_LOCK_REASON
    };
  }

  if (progress?.allThreatsSuccessful === true && !otherMandatoryPending) {
    return { allowed: true, pending: false, failed: false, reason: null };
  }
  if (
    progress &&
    progress.allThreatsSuccessful === undefined &&
    progress.nextThreatIconIndex >= threatCount &&
    state.phase === "action" &&
    !otherMandatoryPending
  ) {
    return { allowed: true, pending: false, failed: false, reason: null };
  }
  const failed = progress?.allThreatsSuccessful === false;
  return {
    allowed: false,
    pending: !failed,
    failed,
    reason: SERVICE_THREAT_CLEAR_LOCK_REASON
  };
}

export interface TileFunctionRule {
  id: string;
  order: number;
  kind: TileRuleKind;
  label: string;
  detail: string;
  mandatory: boolean;
  repeatPolicy: TileRepeatPolicy;
  marker: string;
  supported: boolean;
  sourceId?: string;
  threatLane?: ThreatIcon;
}

export interface TileFunctionDefinition {
  tileId: string;
  tileName: string;
  lore: string;
  arrival: TileFunctionRule[];
  optionalActions: TileFunctionRule[];
  persistentRules: TileFunctionRule[];
  departure: TileFunctionRule[];
}

export interface TileArrivalRuleProjection extends TileFunctionRule {
  status: TileRuleStatus;
}

export interface TileArrivalProjection {
  arrivalId: string;
  seatId: string;
  tileId: string;
  tileName: string;
  lore: string;
  currentRuleId: string | null;
  mandatoryRemaining: number;
  canEndTurn: boolean;
  blockedReason: string | null;
  rules: TileArrivalRuleProjection[];
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildTileFunctionDefinition(
  space: BoardSpaceDefinition,
  challenges: readonly TileChallenge[] = []
): TileFunctionDefinition {
  const arrival: TileFunctionRule[] = challenges
    .filter((challenge) => challenge.sectorId === space.id && challenge.trigger === "onArrival")
    .sort((left, right) => left.authoredOrder - right.authoredOrder)
    .map((challenge, index) => ({
      id: `challenge:${challenge.id}`,
      order: 10 + index,
      kind: "tile-challenge",
      label: challenge.name,
      detail: `${titleCase(challenge.challengeType)} · ${titleCase(challenge.testStat)} ${challenge.difficulty}`,
      mandatory: true,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: challenge.challengeType === "hazard" ? "HAZARD" : "ANOMALY",
      supported: true,
      sourceId: challenge.id
    }));

  space.threatIcons.forEach((lane, index) => {
    arrival.push({
      id: `threat:${index}:${lane}`,
      order: 100 + index,
      kind: "threat-draw",
      label: `${titleCase(lane)} Threat`,
      detail: `Draw and resolve one ${titleCase(lane)} Threat before optional tile actions.`,
      mandatory: true,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: `${lane.toUpperCase()} THREAT ×1`,
      supported: true,
      threatLane: lane
    });
  });

  const effect = resolveBoardTextEffect(space.textBox.effectKey);
  const optionalActions: TileFunctionRule[] = [];
  if (space.textBox.intent === "scenario-confrontation") {
    arrival.push({
      id: `scenario:${space.textBox.effectKey}`,
      order: 180,
      kind: "scenario",
      label: space.textBox.title,
      detail: effect?.summary ?? space.textBox.text,
      mandatory: true,
      repeatPolicy: "SCENARIO_CONTROLLED",
      marker: "FINAL CONFRONTATION",
      supported: Boolean(effect),
      sourceId: space.textBox.effectKey
    });
  } else {
    optionalActions.push({
      id: `action:${space.textBox.effectKey}`,
      order: 200,
      kind: "board-action",
      label: space.textBox.title,
      detail: effect?.summary ?? "No executable board action is registered.",
      mandatory: false,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: effect?.stat ? `${titleCase(effect.stat)} ${effect.difficulty}` : "TILE ACTION",
      supported: Boolean(effect),
      sourceId: space.textBox.effectKey
    });
  }

  if (isBoardSpaceShopCapable(space)) {
    optionalActions.push({
      id: `service:${space.id}`,
      order: 210,
      kind: "service",
      label: getBoardSpaceShopTypeLabel(space),
      detail: "Available after all mandatory arrival effects are resolved.",
      mandatory: false,
      repeatPolicy: "EVERY_ARRIVAL",
      marker: "SERVICE",
      supported: true,
      sourceId: space.id
    });
  }

  const persistentRules: TileFunctionRule[] = [];
  if (space.movementBox) {
    persistentRules.push({
      id: `movement:${space.movementBox.effectKey}`,
      order: 0,
      kind: "gate",
      label: space.movementBox.title,
      detail: space.movementBox.text,
      mandatory: false,
      repeatPolicy: "WHILE_PRESENT",
      marker: "ROUTE",
      supported: true,
      sourceId: space.movementBox.effectKey
    });
  }
  for (const [index, requirement] of (space.movementRequirements ?? []).entries()) {
    persistentRules.push({
      id: `gate:${space.id}:${index}`,
      order: index + 1,
      kind: "gate",
      label: "Entry requirement",
      detail: requirement.errorMessage,
      mandatory: true,
      repeatPolicy: "WHILE_PRESENT",
      marker: "GATE",
      supported: true,
      sourceId: space.id
    });
  }

  return {
    tileId: space.id,
    tileName: space.name,
    lore: space.loreText,
    arrival: arrival.sort((left, right) => left.order - right.order),
    optionalActions,
    persistentRules,
    departure: []
  };
}

function pendingChoiceReason(state: GameState, seatId: string): string | null {
  if (state.pendingTileChallenge?.seatId === seatId) return "Resolve the mandatory tile challenge.";
  if (state.currentEncounter) return "Resolve the current Threat.";
  if (state.activeResolution?.playerId === seatId) return "Finish the current encounter resolution.";
  if (state.pendingEnemyRoll?.fighterSeatId === seatId) return "Resolve the enemy roll.";
  if (state.pendingEffect) return "Resolve the pending effect.";
  if (state.cooperativeAssistance) return "Finish the cooperative assistance request.";
  if (state.pendingCooperativeTest?.activeSeatId === seatId) return "Resolve the cooperative test.";
  if (state.pendingEncounterDecision?.seatId === seatId) return "Resolve the encounter choice.";
  if (state.pendingMemoryTaxChoice?.ownerSeatId === seatId) return "Resolve the Memory Tax choice.";
  if (state.pendingForcedDestinationChoice?.ownerSeatId === seatId) return "Choose the forced destination.";
  if (state.pendingDisplacement?.seatId === seatId) return "Resolve forced movement.";
  if (state.pendingDisplacementArrival?.seatId === seatId) return "Resolve the forced-movement arrival.";
  if (state.pendingSutureStormConsequence?.seatId === seatId) return "Resolve the Suture Storm consequence.";
  if (state.pendingEquipmentSuppressionChoice?.ownerSeatId === seatId) return "Choose Equipment to suppress.";
  if (state.pendingGearEquipChoice?.ownerSeatId === seatId) return "Resolve the Equipment choice.";
  if (state.pendingFailureReaction?.seatId === seatId) return "Resolve the failure reaction.";
  if (state.pendingStaticIntercessionReaction?.seatId === seatId) return "Resolve Static Intercession.";
  if (state.pendingScarChoice?.ownerSeatId === seatId) return "Choose a Scar.";
  if (state.pendingScarRemovalChoice?.ownerSeatId === seatId) return "Resolve Scar purification.";
  if (state.pendingScarConsequence?.seatId === seatId) return "Resolve the Scar consequence.";
  if (state.pendingScarThreshold?.seatId === seatId) return "Resolve the Scar threshold.";
  if (state.pendingMissionSelection?.ownerSeatId === seatId) return "Choose the next Contract.";
  return null;
}

export function canEndTurn(state: GameState, seatId: string): { allowed: boolean; reason: string | null } {
  const activeSeatId = state.turnOrder[state.activeSeatIndex] ?? null;
  if (activeSeatId !== seatId) return { allowed: false, reason: "Only the active operative can end the turn." };
  const reason = pendingChoiceReason(state, seatId);
  if (reason) return { allowed: false, reason };
  if (state.phase === "sector" || state.phase === "resolution") {
    return { allowed: false, reason: "Finish mandatory tile resolution first." };
  }
  return { allowed: true, reason: null };
}

export function buildTileArrivalProjection(state: GameState, seatId: string): TileArrivalProjection | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const sector = player ? state.sectors.find((entry) => entry.id === player.character.currentSpaceId) : null;
  if (!player || !sector) return null;
  const space = getBoardSpace(player.character.currentSpaceId);
  if (!space) return null;
  const definition = buildTileFunctionDefinition(space, sector.tileChallenges ?? []);
  const arrivalProgress = state.tileArrivalThreatProgress?.seatId === seatId &&
    state.tileArrivalThreatProgress.sectorId === space.id
    ? state.tileArrivalThreatProgress
    : null;
  const knownRuleIds = new Set(definition.arrival.map((rule) => rule.id));
  const persistentThreatRules: TileFunctionRule[] = (arrivalProgress?.threatRuleIds ?? [])
    .map((ruleId, index): TileFunctionRule | null => {
      if (knownRuleIds.has(ruleId) || !ruleId.startsWith("persistent:")) return null;
      const lane = arrivalProgress?.threatLanes?.[index];
      if (!lane) return null;
      return {
        id: ruleId,
        order: 90 + index,
        kind: "threat-draw",
        label: "Persistent Threat",
        detail: `Resolve the returned ${titleCase(lane)} Threat before drawing from the shared bag.`,
        mandatory: true,
        repeatPolicy: "WHILE_PRESENT",
        marker: `RETURNED ${lane.toUpperCase()} THREAT`,
        supported: true,
        threatLane: lane
      };
    })
    .filter((rule): rule is TileFunctionRule => rule !== null);
  const completedChallenges = new Set(
    state.tileChallengeProgress?.seatId === seatId && state.tileChallengeProgress.sectorId === space.id
      ? state.tileChallengeProgress.resolvedChallengeIds
      : []
  );
  let currentAssigned = false;
  const rules: TileArrivalRuleProjection[] = [
    ...persistentThreatRules,
    ...definition.arrival,
    ...definition.optionalActions
  ].sort((left, right) => left.order - right.order).map((rule) => {
    let status: TileRuleStatus;
    if (rule.kind === "service") {
      status = getServiceThreatGate(state, seatId, space.id).allowed ? "optional" : "locked";
    }
    else if (rule.kind === "board-action" && getSectorTextBlockReason(state, seatId, space.id)) status = "locked";
    else if (!rule.mandatory) status = "optional";
    else if (rule.kind === "tile-challenge" && rule.sourceId && completedChallenges.has(rule.sourceId)) status = "completed";
    else if (rule.kind === "tile-challenge" && state.pendingTileChallenge?.challengeId === rule.sourceId) {
      status = "current";
      currentAssigned = true;
    } else if (rule.kind === "threat-draw") {
      const progress = arrivalProgress;
      const plannedRuleIds = progress?.threatRuleIds ?? definition.arrival
        .filter((entry) => entry.kind === "threat-draw")
        .map((entry) => entry.id);
      const threatIndex = plannedRuleIds.indexOf(rule.id);
      const nextIndex = progress?.nextThreatIconIndex ?? 0;
      const recordedOutcome = progress?.resolvedThreatOutcomes?.find((entry) => entry.ruleId === rule.id);
      if (state.currentEncounter && threatIndex === nextIndex - 1) {
        status = "current";
        currentAssigned = true;
      } else if (recordedOutcome) status = recordedOutcome.success ? "completed" : "failed";
      else if (threatIndex < 0 || threatIndex < nextIndex) status = "completed";
      else if (!currentAssigned) {
        status = "current";
        currentAssigned = true;
      } else status = "pending";
    } else if (state.phase === "action" || state.phase === "broadcast") status = "completed";
    else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else status = "pending";
    return rule.kind === "service" && status === "locked"
      ? { ...rule, detail: SERVICE_THREAT_CLEAR_LOCK_REASON, status }
      : { ...rule, status };
  });
  const endTurn = canEndTurn(state, seatId);
  const currentRule = rules.find((rule) => rule.status === "current") ?? null;
  const revision = state.movementRouteRevisions?.[seatId] ?? 0;
  return {
    arrivalId: state.tileArrivalThreatProgress?.seatId === seatId && state.tileArrivalThreatProgress.sectorId === space.id
      ? state.tileArrivalThreatProgress.arrivalId
      : `arrival:${seatId}:${space.id}:${revision}`,
    seatId,
    tileId: space.id,
    tileName: space.name,
    lore: space.loreText,
    currentRuleId: currentRule?.id ?? null,
    mandatoryRemaining: rules.filter((rule) =>
      rule.mandatory && !["completed", "failed"].includes(rule.status)
    ).length,
    canEndTurn: endTurn.allowed,
    blockedReason: endTurn.reason,
    rules
  };
}

export function simulateTileArrival(space: BoardSpaceDefinition, challenges: readonly TileChallenge[] = []) {
  const definition = buildTileFunctionDefinition(space, challenges);
  return {
    simulationOnly: true as const,
    tileId: space.id,
    initialState: { location: space.id, completedRuleIds: [] as string[] },
    generatedRuleStack: [...definition.arrival, ...definition.optionalActions],
    prompts: definition.arrival.filter((rule) => rule.mandatory).map((rule) => ({ ruleId: rule.id, label: rule.label })),
    finalState: { location: space.id, completedRuleIds: definition.arrival.map((rule) => rule.id) },
    effectTrace: definition.arrival.map((rule, index) => `${String(index + 1).padStart(2, "0")} ${rule.id}`),
    warnings: [...definition.arrival, ...definition.optionalActions].filter((rule) => !rule.supported).map((rule) => `${rule.id}: unsupported`)
  };
}
