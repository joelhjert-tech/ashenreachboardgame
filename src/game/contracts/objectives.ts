export interface ContractObjectiveLike {
  type: "defeatCount" | "spaceTextResolved";
  target: number;
  effectKey?: string;
  label?: string;
}

export interface ContractCardLike {
  objective: ContractObjectiveLike;
}

export interface ContractProgressStateLike {
  progress: number;
}

export type ContractObjectiveTrigger =
  | {
      type: "enemy-defeated";
      amount?: number;
    }
  | {
      type: "space-text-resolved";
      effectKey: string;
    };

function getProgressDelta(trigger: ContractObjectiveTrigger): number {
  switch (trigger.type) {
    case "enemy-defeated":
      return Math.max(1, trigger.amount ?? 1);
    case "space-text-resolved":
      return 1;
  }
}

export function getContractObjectiveTarget(contract: ContractCardLike): number {
  return contract.objective.target;
}

export function describeContractObjective(contract: ContractCardLike): string {
  switch (contract.objective.type) {
    case "defeatCount":
      return `Defeat ${contract.objective.target} ${contract.objective.target === 1 ? "enemy" : "enemies"}`;
    case "spaceTextResolved":
      return contract.objective.label ?? "Resolve the assigned sector operation";
  }
}

export function canAdvanceContractObjective(contract: ContractCardLike, trigger: ContractObjectiveTrigger): boolean {
  switch (contract.objective.type) {
    case "defeatCount":
      return trigger.type === "enemy-defeated";
    case "spaceTextResolved":
      return trigger.type === "space-text-resolved" && trigger.effectKey === contract.objective.effectKey;
  }
}

export function clampContractProgress(contract: ContractCardLike, progress: number): number {
  return Math.max(0, Math.min(progress, getContractObjectiveTarget(contract)));
}

export function advanceContractObjectiveProgress(
  contract: ContractCardLike,
  currentProgress: number,
  trigger: ContractObjectiveTrigger
): number {
  if (!canAdvanceContractObjective(contract, trigger)) {
    return clampContractProgress(contract, currentProgress);
  }

  return clampContractProgress(contract, currentProgress + getProgressDelta(trigger));
}

export function setContractProgressFloor(
  contract: ContractCardLike,
  currentProgress: number,
  minimumProgress: number
): number {
  return clampContractProgress(contract, Math.max(currentProgress, minimumProgress));
}

export function isContractObjectiveComplete(
  contract: ContractCardLike,
  progressOrState: number | ContractProgressStateLike
): boolean {
  const progress = typeof progressOrState === "number" ? progressOrState : progressOrState.progress;
  return clampContractProgress(contract, progress) >= getContractObjectiveTarget(contract);
}

export function formatContractProgress(contract: ContractCardLike, progress: number): string {
  const target = getContractObjectiveTarget(contract);
  const clampedProgress = clampContractProgress(contract, progress);

  switch (contract.objective.type) {
    case "defeatCount":
      return `${clampedProgress}/${target} defeats`;
    case "spaceTextResolved":
      return `${clampedProgress}/${target} clears`;
  }
}

export function formatContractObjectiveStatus(contract: ContractCardLike, progress: number): string {
  return `${describeContractObjective(contract)} (${formatContractProgress(contract, progress)})`;
}
