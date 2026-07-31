import type { ScarRuleKey } from "../schema/card.schema.js";
import type { Stat } from "../schema/character.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import type { ScarUsageEntry } from "../schema/scarChoice.schema.js";
import { getBoardSpace } from "../data/boardSpaces.js";
import { threatBlocksRerolls } from "../cards/threatEffects.js";
import { evaluateOwnedScarRules, type ScarRuleContext } from "./scarPersistentRules.js";
import { getScarCard } from "./scarSystem.js";

export interface ScarAdaptationTarget {
  id: string;
  label: string;
}

export interface ScarAdaptationControl {
  activationId: string;
  scarId: string;
  scarName: string;
  ruleKey: ScarRuleKey;
  timing: string;
  effectText: string;
  limit: "oncePerTurn" | "oncePerRound" | "oncePerBattle" | "oncePerVisit" | "oncePerGame";
  remainingUses: 0 | 1;
  enabled: boolean;
  disabledReason: string | null;
  targets: ScarAdaptationTarget[];
  usage: ScarUsageEntry;
  context: ScarRuleContext;
}

function isRollStage(state: GameState, stages: string[]): boolean {
  return Boolean(state.activeResolution && stages.includes(state.activeResolution.stage));
}

function timingWindowIsOpen(state: GameState, player: PlayerState, timing: string): boolean {
  const ownsResolution = state.activeResolution?.playerId === player.seatId;
  switch (timing) {
    case "beforeTest":
    case "beforeRoll": return ownsResolution && isRollStage(state, ["battle_setup"]);
    case "afterRoll":
    case "afterTest": return ownsResolution && isRollStage(state, ["roll_result", "outcome_summary", "awaiting_continue"]);
    case "beforeConsequence": return ownsResolution && Boolean(state.pendingEffect || state.pendingEquipmentSuppressionChoice);
    case "beforeDisplacement": return state.pendingDisplacement?.seatId === player.seatId || state.pendingForcedDestinationChoice?.ownerSeatId === player.seatId;
    case "onChoiceGenerated": return state.pendingEncounterDecision?.seatId === player.seatId;
    case "beforeTrophySpend": return state.turnOrder[state.activeSeatIndex] === player.seatId && (state.phase === "action" || state.phase === "broadcast");
    case "action": return state.turnOrder[state.activeSeatIndex] === player.seatId && state.phase === "action" && !state.currentEncounter && !state.pendingEffect;
    default: return false;
  }
}

function currentContext(state: GameState, player: PlayerState, timing: string): ScarRuleContext {
  const encounter = state.currentEncounter;
  const battle = state.activeResolution?.battle;
  const roll = state.activeResolution?.roll;
  const sector = getBoardSpace(player.sectorId);
  const tags = [
    ...(sector?.tags ?? []),
    ...(encounter?.resourceTags ?? []),
    ...(encounter?.threatLane ? [encounter.threatLane] : [])
  ];
  const stat = battle?.stat as Stat | undefined;
  const mode = encounter?.cardType === "enemy" ? "battle" : state.activeResolution ? "check" : timing === "action" ? "event" : undefined;
  return {
    eventId: state.activeResolution?.id
      ?? state.pendingEquipmentSuppressionChoice?.choiceId
      ?? state.pendingDisplacement?.sourceEventId
      ?? state.pendingEncounterDecision?.decisionId
      ?? `scar-action:${player.seatId}:${state.sequence}`,
    timing,
    stat,
    mode,
    encounterKind: state.pendingTileChallenge?.challengeType === "anomaly" ? "anomaly" : encounter?.cardType === "enemy" ? "enemy" : encounter?.cardType === "hazard" ? "hazard" : undefined,
    enemyFamily: encounter?.enemyFamily,
    elite: (encounter?.severity ?? 0) >= 5,
    naturalRoll: roll?.dice[0],
    success: roll?.success,
    margin: roll ? roll.finalTotal - roll.target : undefined,
    sectorTags: tags,
    helperCount: state.cooperativeAssistance?.lockedContributions.length ?? 0,
    optionCount: state.pendingEncounterDecision?.legalOptionIds.length,
    wounds: player.character.wounds,
    difficulty: battle?.difficulty
  };
}

function targetsFor(state: GameState, player: PlayerState, ruleKey: ScarRuleKey): ScarAdaptationTarget[] {
  if (["guile-reroll", "grit-hazard-reroll", "rift-signal-reroll", "guile-anomaly-reroll"].includes(ruleKey)) {
    const committedEdgeDieIndex =
      state.lastEdgeCardPlay?.seatId === player.seatId &&
      state.lastEdgeCardPlay.mode === "commit-value"
        ? 0
        : null;
    return (state.activeResolution?.roll?.dice ?? []).flatMap((face, index) =>
      index === committedEdgeDieIndex
        ? []
        : [{ id: String(index), label: `Die ${index + 1} (${face})` }]
    );
  }
  if (ruleKey === "forge-charge-restore") {
    return player.character.heldGear.flatMap((item) => {
      const maximum = item.maxCharges ?? item.charges ?? item.startingCharges ?? 0;
      const current = item.currentCharges ?? item.charges ?? item.startingCharges ?? 0;
      return maximum > 0 && current < maximum && item.instanceId ? [{ id: item.instanceId, label: `${item.name} (${current}/${maximum})` }] : [];
    });
  }
  if (ruleKey === "choose-displacement-direction") {
    return state.pendingForcedDestinationChoice?.candidates.map((option) => ({ id: option.sectorId, label: `${getBoardSpace(option.sectorId)?.name ?? option.sectorId} (${option.direction})` })) ?? [];
  }
  return [];
}

export function getOwnedScarAdaptationControls(state: GameState, seatId: string): ScarAdaptationControl[] {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player || player.character.status !== "active") return [];
  const controls: ScarAdaptationControl[] = [];
  for (const scarId of player.character.scars) {
    const scar = getScarCard(scarId);
    if (!scar?.adaptation.optional || scar.adaptation.limit === "passive") continue;
    if (!timingWindowIsOpen(state, player, scar.adaptation.timing)) continue;
    const context = currentContext(state, player, scar.adaptation.timing);
    const evaluated = evaluateOwnedScarRules(state, player, "adaptation", context).find((entry) => entry.scarId === scarId);
    const targets = targetsFor(state, player, scar.adaptation.key);
    const rerollRule = ["guile-reroll", "grit-hazard-reroll", "rift-signal-reroll", "guile-anomaly-reroll"].includes(scar.adaptation.key);
    const targetRequired = scar.adaptation.key === "forge-charge-restore" || scar.adaptation.key === "choose-displacement-direction" || rerollRule;
    const disabledReason = rerollRule && threatBlocksRerolls(state.currentEncounter)
      ? `${state.currentEncounter?.title ?? "This threat"} blocks rerolls.`
      : !evaluated
        ? `Not valid for the current ${context.stat ?? "game"} window.`
        : targetRequired && targets.length === 0
          ? "No legal target is available."
          : null;
    const usage = evaluated?.usage;
    if (!usage) {
      const used = (state.scarUsage ?? []).find((entry) => entry.seatId === seatId && entry.scarId === scarId && entry.ruleKey === scar.adaptation.key);
      controls.push({
        activationId: `${context.eventId}:${scarId}:${scar.adaptation.key}`,
        scarId,
        scarName: scar.title,
        ruleKey: scar.adaptation.key,
        timing: scar.adaptation.timing,
        effectText: scar.adaptationText,
        limit: scar.adaptation.limit,
        remainingUses: 0,
        enabled: false,
        disabledReason: used ? `${scar.title} has already been used in this ${used.scope}.` : disabledReason ?? "Unavailable.",
        targets,
        context,
        usage: used ?? {
          usageId: `unavailable:${context.eventId}:${scarId}`,
          seatId,
          scarId,
          ruleKey: scar.adaptation.key,
          scope: scar.adaptation.limit === "oncePerGame" ? "game" : scar.adaptation.limit === "oncePerBattle" ? "battle" : scar.adaptation.limit === "oncePerTurn" ? "turn" : "round",
          scopeId: "unavailable",
          sourceEventId: context.eventId,
          createdAt: context.eventId
        }
      });
      continue;
    }
    controls.push({
      activationId: `${context.eventId}:${scarId}:${scar.adaptation.key}`,
      scarId,
      scarName: scar.title,
      ruleKey: scar.adaptation.key,
      timing: scar.adaptation.timing,
      effectText: scar.adaptationText,
      limit: scar.adaptation.limit,
      remainingUses: 1,
      enabled: !disabledReason,
      disabledReason,
      targets,
      usage,
      context
    });
  }
  return controls;
}
