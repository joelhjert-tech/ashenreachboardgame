import { BOARD_SPACES, getBoardSpace } from "../../game/data/boardSpaces.js";
import type { ContractCard, ThreatIcon } from "./types.js";

export interface MissionRelevance {
  label: "Mission";
  missionTitle: string;
  reason: string;
}

export function getMissionObjectiveCategory(contract: ContractCard): string {
  switch (contract.objective.type) {
    case "defeatCount": return "Threat hunt";
    case "spaceTextResolved": return "Tile action";
    case "multiStopRoute": return "Route";
    case "shopTransaction": return "Shop";
    case "tileChallengeResolved": return "Tile challenge";
  }
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
      reason: `This sector can progress ${contract.name}: resolve ${boardSpace.textBox.title} after arrival threats are cleared.`
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

  if (contract.objective.type === "tileChallengeResolved") {
    const sectorMatches = !contract.objective.sectorId || contract.objective.sectorId === sectorId;
    if (sectorMatches) {
      return {
        label: "Mission",
        missionTitle: contract.name,
        reason: `This sector can progress ${contract.name}: resolve ${contract.objective.label ?? "the assigned tile challenge"}.`
      };
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
    const targets = BOARD_SPACES
      .filter((space) => space.textBox.effectKey === effectKey)
      .map((space) => ({ name: space.name, action: space.textBox.title }));

    if (targets.length === 0) {
      return `Target: sector action ${contract.objective.label}.`;
    }

    return targets.length === 1
      ? `Target: ${targets[0].name} — resolve ${targets[0].action} after arrival threats are cleared.`
      : `Targets: ${targets.slice(0, 3).map((target) => `${target.name} — ${target.action}`).join(", ")}${targets.length > 3 ? ", ..." : ""}.`;
  }

  if (contract.objective.type === "multiStopRoute") return `Route: ${contract.objective.targets.map((target) => target.label).join(" → ")}.`;
  if (contract.objective.type === "shopTransaction") return `Shop objective: ${contract.objective.label}.`;
  if (contract.objective.type === "tileChallengeResolved") {
    const sector = contract.objective.sectorId ? getBoardSpace(contract.objective.sectorId) : null;
    return sector
      ? `Challenge at ${sector.name}: ${contract.objective.label}.`
      : `Tile challenge: ${contract.objective.label}.`;
  }
  return "Target: any sector with a threat or enemy.";
}
