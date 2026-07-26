import {
  describeContractObjective,
  formatContractProgress,
  getContractObjectiveTarget
} from "../../game/contracts/objectives.js";
import type {
  ContractCard,
  MatchFinalStagePresentation,
  MatchThresholdWarning,
  PhonePatchPayload,
  PhoneSelfState,
  PrivateRivalryPayload
} from "./types.js";

export interface ObjectiveProgressPresentation {
  current: number;
  required: number;
  label: string;
  complete: boolean;
}

export interface SharedMissionPresentation {
  title: string;
  premise: string;
  state: "active" | "completed" | "failed";
  stageLabel: string;
  instruction: string;
  nextInstruction: string | null;
  progress: ObjectiveProgressPresentation | null;
  lossPressure: ObjectiveProgressPresentation | null;
  progressChange: { value: number | null; reason: string } | null;
  pressureChange: { value: number | null; reason: string } | null;
  thresholdWarning: MatchThresholdWarning | null;
  finalStage: MatchFinalStagePresentation | null;
  conditions: string[];
  artPath: string | null;
}

export interface ContractConditionPresentation {
  label: string;
  state: "current" | "completed" | "remaining";
}

export interface OwnerContractPresentation {
  title: string;
  faction: string;
  instruction: string;
  progress: ObjectiveProgressPresentation;
  progressText: string;
  conditions: ContractConditionPresentation[];
  reward: string;
  lore: string;
}

export interface CompletedContractPresentation {
  title: string;
  rewardGranted: boolean;
  spent: boolean;
  completedAtSequence: number;
}

export interface PrivateAgendaPresentation {
  state: PrivateRivalryPayload["revealState"];
  stateLabel: string;
  instruction: string;
  objective: PrivateRivalryPayload["objective"] | null;
  canReveal: boolean;
  completionSummary: string | null;
  pointsAwarded: number;
}

function humanizeEffectType(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function describeContractReward(contract: ContractCard): string {
  const reward = contract.reward;
  if (!reward) return "Completion recorded.";
  const normalized = Array.isArray((reward as { effects?: unknown }).effects)
    ? reward as { effects: Array<{ type: string; amount?: number }>; displayText?: string; completionText?: string }
    : { effects: [reward as { type: string; amount?: number }], displayText: undefined, completionText: undefined };

  if (normalized.displayText) return normalized.displayText;
  if (normalized.effects.length === 0) return normalized.completionText ?? "Completion recorded.";

  const summaries = normalized.effects.map((effect) => {
    switch (effect.type) {
      case "gain_salvage": return `Gain ${effect.amount} Salvage`;
      case "gain_trophy": return `Gain ${effect.amount} ${effect.amount === 1 ? "Trophy" : "Trophies"}`;
      case "heal_wound": return `Heal ${effect.amount} ${effect.amount === 1 ? "Wound" : "Wounds"}`;
      case "gain_gear": return "Gain Equipment";
      case "gain_follower": return "Gain a Follower";
      default: return humanizeEffectType(effect.type);
    }
  });

  return summaries.join(" · ");
}

export function buildSharedMissionPresentation(patch: PhonePatchPayload | null): SharedMissionPresentation | null {
  const scenario = patch?.activeScenario;
  if (!scenario) return null;

  const objective = patch.scenarioPressure?.objectiveProgress;
  const current = patch.matchProgress?.winProgress?.current ?? objective?.current ?? scenario.progress;
  const required = patch.matchProgress?.winProgress?.required ?? objective?.required ?? scenario.threshold;
  const result = patch.matchProgress?.publicResult?.outcome === "defeat"
    ? "loss"
    : patch.matchProgress?.publicResult?.outcome === "victory"
      ? "victory"
      : patch.scenarioState?.result.status ?? "unresolved";
  const state = result === "victory" || patch.scenarioPressure?.scenarioStatus === "completed"
    ? "completed"
    : result === "loss" || patch.scenarioPressure?.scenarioStatus === "failed"
      ? "failed"
      : "active";
  const confrontation = patch.scenarioState?.confrontation;
  const preparationCount = patch.scenarioState
    ? Object.values(patch.scenarioState.preparation.resources).reduce((sum, value) => sum + value, 0)
    : 0;
  const stageLabel = state === "completed"
    ? "Mission Complete"
    : state === "failed"
      ? "Mission Failed"
      : patch.matchProgress?.finalStage || confrontation?.active
        ? "Final Confrontation"
        : preparationCount > 0
          ? "Mission Preparation"
          : "Current Objective";

  return {
    title: scenario.name,
    premise: scenario.theme,
    state,
    stageLabel,
    instruction: scenario.publicDisplay?.objective ?? scenario.victoryText,
    nextInstruction: state === "active" ? scenario.finalGateRequirement ?? null : null,
    progress: required > 0 ? {
      current: Math.max(0, current),
      required,
      label: objective?.label ?? scenario.progressLabel,
      complete: current >= required
    } : null,
    lossPressure: patch.matchProgress?.lossPressure ? {
      current: patch.matchProgress.lossPressure.current,
      required: patch.matchProgress.lossPressure.required,
      label: patch.matchProgress.lossPressure.label,
      complete: patch.matchProgress.lossPressure.current >= patch.matchProgress.lossPressure.required
    } : patch?.scenarioPressure && patch.scenarioPressure.collapseTrack.failureAtMax !== false ? {
      current: patch.scenarioPressure.collapseTrack.current,
      required: patch.scenarioPressure.collapseTrack.max,
      label: "Loss Pressure",
      complete: patch.scenarioPressure.collapseTrack.current >= patch.scenarioPressure.collapseTrack.max
    } : patch && !patch.scenarioPressure ? {
      current: patch.escalationLevel,
      required: patch.escalationThreshold,
      label: "Loss Pressure",
      complete: patch.escalationLevel >= patch.escalationThreshold
    } : null,
    progressChange: patch.matchProgress?.winProgress?.changeReason ? {
      value: patch.matchProgress.winProgress.change,
      reason: patch.matchProgress.winProgress.changeReason
    } : null,
    pressureChange: patch.matchProgress?.lossPressure?.changeReason ? {
      value: patch.matchProgress.lossPressure.change,
      reason: patch.matchProgress.lossPressure.changeReason
    } : null,
    thresholdWarning: patch.matchProgress?.thresholdWarning ?? null,
    finalStage: patch.matchProgress?.finalStage ?? null,
    conditions: scenario.progressSources ?? [],
    artPath: scenario.sheetArtPath ?? null
  };
}

export function buildOwnerContractPresentation(
  contract: ContractCard,
  activeContract: NonNullable<PhoneSelfState["character"]["activeContract"]>
): OwnerContractPresentation {
  const required = getContractObjectiveTarget(contract);
  const current = Math.max(0, Math.min(activeContract.progress, required));
  const completedTargetIds = new Set(activeContract.completedTargetIds ?? []);
  const conditions: ContractConditionPresentation[] = contract.objective.type === "multiStopRoute"
    ? contract.objective.targets.map((target, index) => ({
        label: target.label,
        state: completedTargetIds.has(target.id)
          ? "completed"
          : index === completedTargetIds.size
            ? "current"
            : "remaining"
      }))
    : [{
        label: describeContractObjective(contract),
        state: current >= required ? "completed" : "current"
      }];

  return {
    title: contract.name,
    faction: contract.factionGiver,
    instruction: describeContractObjective(contract),
    progress: {
      current,
      required,
      label: formatContractProgress(contract, current),
      complete: current >= required
    },
    progressText: formatContractProgress(contract, current),
    conditions: [...conditions].sort((left, right) => {
      const rank = { current: 0, remaining: 1, completed: 2 } as const;
      return rank[left.state] - rank[right.state];
    }),
    reward: describeContractReward(contract),
    lore: contract.text
  };
}

export function buildCompletedContractPresentations(
  self: PhoneSelfState,
  contracts: ContractCard[]
): CompletedContractPresentation[] {
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  return [...(self.character.completedMissionRecords ?? [])]
    .sort((left, right) => right.completedAtSequence - left.completedAtSequence)
    .map((record) => ({
      title: byId.get(record.missionId)?.name ?? "Archived Contract",
      rewardGranted: record.rewardGranted,
      spent: record.spent,
      completedAtSequence: record.completedAtSequence
    }));
}

export function buildPrivateAgendaPresentation(rivalry: PrivateRivalryPayload): PrivateAgendaPresentation {
  const stateLabels: Record<PrivateRivalryPayload["revealState"], string> = {
    hidden: "Hidden",
    revealLocked: "Locked",
    revealAvailable: "Ready to Reveal",
    revealed: "Revealed",
    completed: "Completed",
    failed: "Failed"
  };

  return {
    state: rivalry.revealState,
    stateLabel: stateLabels[rivalry.revealState],
    instruction: rivalry.reveal.hint,
    objective: rivalry.objective ?? null,
    canReveal: rivalry.reveal.available && rivalry.reveal.state === "revealAvailable",
    completionSummary: rivalry.scoring?.completionSummary ?? null,
    pointsAwarded: rivalry.scoring?.pointsAwarded ?? 0
  };
}
