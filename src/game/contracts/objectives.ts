export interface ContractObjectiveLike {
  type: "defeatCount" | "spaceTextResolved" | "multiStopRoute" | "shopTransaction" | "tileChallengeResolved";
  target?: number;
  effectKey?: string;
  label?: string;
  ordered?: boolean;
  targets?: Array<{ id: string; type: "spaceId" | "tag"; value: string; label: string }>;
  action?: "buyEquipment" | "sellGear" | "repairGear" | "upgradeGear" | "trade";
  requiredShopType?: string;
  requiredSectorId?: string;
  requiredCount?: number;
  minimumSalvageSpent?: number;
  challengeId?: string;
  sectorId?: string;
  challengeType?: "hazard" | "anomaly";
  challengeTag?: string;
  requireSuccess?: boolean;
}

export interface ContractCardLike {
  objective: ContractObjectiveLike;
}

export interface ContractProgressStateLike {
  progress: number;
  completedTargetIds?: string[];
  salvageSpent?: number;
}

export type ContractObjectiveTrigger =
  | {
      type: "enemy-defeated";
      amount?: number;
    }
  | {
      type: "space-text-resolved";
      effectKey: string;
    }
  | {
      type: "sector-visited";
      sectorId: string;
      sectorTags: string[];
    }
  | {
      type: "shop-transaction";
      action: "buyEquipment" | "sellGear" | "repairGear" | "upgradeGear" | "trade";
      sectorId: string;
      shopTypes: string[];
      salvageSpent?: number;
    }
  | {
      type: "tile-challenge-resolved";
      challengeId: string;
      sectorId: string;
      challengeType: "hazard" | "anomaly";
      challengeTags: string[];
      testStat: "command" | "grit" | "signal" | "guile" | "forge";
      success: boolean;
    };

function getProgressDelta(trigger: ContractObjectiveTrigger): number {
  switch (trigger.type) {
    case "enemy-defeated":
      return Math.max(1, trigger.amount ?? 1);
    case "space-text-resolved":
      return 1;
    case "sector-visited":
    case "shop-transaction":
    case "tile-challenge-resolved":
      return 1;
  }
}

export function getContractObjectiveTarget(contract: ContractCardLike): number {
  if (contract.objective.type === "multiStopRoute") return contract.objective.targets?.length ?? 0;
  if (contract.objective.type === "shopTransaction") return contract.objective.requiredCount ?? 1;
  return contract.objective.target ?? 0;
}

export function describeContractObjective(contract: ContractCardLike): string {
  switch (contract.objective.type) {
    case "defeatCount":
      return `Defeat ${contract.objective.target} ${contract.objective.target === 1 ? "enemy" : "enemies"}`;
    case "spaceTextResolved":
      return contract.objective.label ?? "Resolve the assigned sector operation";
    case "multiStopRoute":
      return `${contract.objective.ordered ? "Visit in order" : "Visit"}: ${(contract.objective.targets ?? []).map((target) => target.label).join(" → ")}`;
    case "shopTransaction":
      return contract.objective.label ?? "Complete the required shop transaction";
    case "tileChallengeResolved":
      return contract.objective.label ?? "Resolve the assigned recurring tile challenge";
  }
}

export function canAdvanceContractObjective(contract: ContractCardLike, trigger: ContractObjectiveTrigger): boolean {
  switch (contract.objective.type) {
    case "defeatCount":
      return trigger.type === "enemy-defeated";
    case "spaceTextResolved":
      return trigger.type === "space-text-resolved" && trigger.effectKey === contract.objective.effectKey;
    case "multiStopRoute":
      return trigger.type === "sector-visited";
    case "shopTransaction":
      return trigger.type === "shop-transaction" && trigger.action === contract.objective.action &&
        (!contract.objective.requiredSectorId || trigger.sectorId === contract.objective.requiredSectorId) &&
        (!contract.objective.requiredShopType || trigger.shopTypes.includes(contract.objective.requiredShopType));
    case "tileChallengeResolved":
      return trigger.type === "tile-challenge-resolved" &&
        (!contract.objective.challengeId || trigger.challengeId === contract.objective.challengeId) &&
        (!contract.objective.sectorId || trigger.sectorId === contract.objective.sectorId) &&
        (!contract.objective.challengeType || trigger.challengeType === contract.objective.challengeType) &&
        (!contract.objective.challengeTag || trigger.challengeTags.includes(contract.objective.challengeTag)) &&
        (!contract.objective.requireSuccess || trigger.success);
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

function routeTargetMatches(target: NonNullable<ContractObjectiveLike["targets"]>[number], trigger: Extract<ContractObjectiveTrigger, { type: "sector-visited" }>): boolean {
  return target.type === "spaceId" ? target.value === trigger.sectorId : trigger.sectorTags.includes(target.value);
}

export function advanceContractObjectiveState(
  contract: ContractCardLike,
  currentState: ContractProgressStateLike,
  trigger: ContractObjectiveTrigger
): ContractProgressStateLike {
  if (contract.objective.type === "multiStopRoute") {
    if (trigger.type !== "sector-visited") return currentState;
    const targets = contract.objective.targets ?? [];
    const completed = new Set(currentState.completedTargetIds ?? []);
    const candidate = contract.objective.ordered
      ? targets[completed.size]
      : targets.find((target) => !completed.has(target.id) && routeTargetMatches(target, trigger));
    if (!candidate || completed.has(candidate.id) || !routeTargetMatches(candidate, trigger)) return currentState;
    completed.add(candidate.id);
    return { ...currentState, progress: completed.size, completedTargetIds: [...completed] };
  }

  if (contract.objective.type === "shopTransaction") {
    if (!canAdvanceContractObjective(contract, trigger) || trigger.type !== "shop-transaction") return currentState;
    const salvageSpent = (currentState.salvageSpent ?? 0) + Math.max(0, trigger.salvageSpent ?? 0);
    const countProgress = currentState.progress + 1;
    const meetsSpend = !contract.objective.minimumSalvageSpent || salvageSpent >= contract.objective.minimumSalvageSpent;
    return { ...currentState, progress: meetsSpend ? Math.min(countProgress, getContractObjectiveTarget(contract)) : currentState.progress, salvageSpent };
  }

  return { ...currentState, progress: advanceContractObjectiveProgress(contract, currentState.progress, trigger) };
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
    case "multiStopRoute":
      return `${clampedProgress}/${target} stops`;
    case "shopTransaction":
      return `${clampedProgress}/${target} transactions`;
    case "tileChallengeResolved":
      return `${clampedProgress}/${target} challenges`;
  }
}

export function formatContractObjectiveStatus(contract: ContractCardLike, progress: number): string {
  return `${describeContractObjective(contract)} (${formatContractProgress(contract, progress)})`;
}
