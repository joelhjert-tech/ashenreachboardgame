import { BOARD_SPACES, getBoardSpace } from "../../game/data/boardSpaces.js";
import type { ContractCard, ThreatIcon } from "./types.js";

export interface MissionRelevance {
  label: "Mission";
  missionTitle: string;
  reason: string;
}

interface MissionRelevanceOptions {
  threatIcons?: Array<ThreatIcon | string>;
  faceUpThreatCount?: number;
}

function hasThreatSignal(sectorId: string, options: MissionRelevanceOptions): boolean {
  const boardSpace = getBoardSpace(sectorId);
  const icons = options.threatIcons ?? boardSpace?.threatIcons ?? [];

  return (
    (options.faceUpThreatCount ?? 0) > 0 ||
    icons.includes("red") ||
    Boolean(boardSpace?.tags.includes("enemy") || boardSpace?.tags.includes("hazard"))
  );
}

export function getMissionRelevanceForSector(
  contract: ContractCard | null | undefined,
  sectorId: string,
  options: MissionRelevanceOptions = {}
): MissionRelevance | null {
  if (!contract) {
    return null;
  }

  if (contract.objective.type === "spaceTextResolved") {
    const boardSpace = getBoardSpace(sectorId);

    if (boardSpace?.textBox.effectKey !== contract.objective.effectKey) {
      return null;
    }

    return {
      label: "Mission",
      missionTitle: contract.name,
      reason: `This sector can progress ${contract.name}: ${contract.objective.label}.`
    };
  }

  if (contract.objective.type === "defeatCount" && hasThreatSignal(sectorId, options)) {
    return {
      label: "Mission",
      missionTitle: contract.name,
      reason: `This sector may progress ${contract.name}: defeat a threat here.`
    };
  }

  if (contract.objective.type === "multiStopRoute") {
    const boardSpace = getBoardSpace(sectorId);
    const target = contract.objective.targets.find((entry) => entry.type === "spaceId" ? entry.value === sectorId : Boolean(boardSpace?.tags.includes(entry.value as never)));
    if (target) return { label: "Mission", missionTitle: contract.name, reason: `${target.label} is a route stop for ${contract.name}.` };
  }

  if (contract.objective.type === "shopTransaction") {
    const boardSpace = getBoardSpace(sectorId);
    const sectorMatches = !contract.objective.requiredSectorId || contract.objective.requiredSectorId === sectorId;
    const shopMatches = !contract.objective.requiredShopType || boardSpace?.tags.includes(contract.objective.requiredShopType as never);
    if (sectorMatches && shopMatches && boardSpace && (boardSpace.tags.includes("shop") || boardSpace.tags.includes("risk-shop"))) {
      return { label: "Mission", missionTitle: contract.name, reason: `This shop can progress ${contract.name}.` };
    }
  }

  return null;
}

export function getMissionTargetClue(contract: ContractCard | null | undefined): string | null {
  if (!contract) {
    return null;
  }

  if (contract.objective.type === "spaceTextResolved") {
    const effectKey = contract.objective.effectKey;
    const targetNames = BOARD_SPACES
      .filter((space) => space.textBox.effectKey === effectKey)
      .map((space) => space.name);

    if (targetNames.length === 0) {
      return `Target: sector action ${contract.objective.label}.`;
    }

    return targetNames.length === 1
      ? `Target sector: ${targetNames[0]}.`
      : `Target sectors: ${targetNames.slice(0, 3).join(", ")}${targetNames.length > 3 ? ", ..." : ""}.`;
  }

  if (contract.objective.type === "multiStopRoute") return `Route: ${contract.objective.targets.map((target) => target.label).join(" → ")}.`;
  if (contract.objective.type === "shopTransaction") return `Shop objective: ${contract.objective.label}.`;
  return "Target: any sector with a threat or enemy.";
}
