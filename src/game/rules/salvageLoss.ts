export const THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS = new Set([
  "glass-tick-cloud",
  "locked-vault"
]);

export interface SalvageLossResult {
  requestedLoss: number;
  actualLoss: number;
  resultingSalvage: number;
  sourceCardId: string;
}

export function resolveFloorZeroSalvageLoss(
  currentSalvage: number,
  requestedLoss: number,
  sourceCardId: string
): SalvageLossResult {
  const availableSalvage = Math.max(0, currentSalvage);
  const actualLoss = Math.min(availableSalvage, requestedLoss);
  return {
    requestedLoss,
    actualLoss,
    resultingSalvage: availableSalvage - actualLoss,
    sourceCardId
  };
}
