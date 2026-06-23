import { RIFTFALL_BOARD_NODE_INDEX, type BoardNode } from "../../data/riftfallBoardNodes.js";
import type { PublicPatchPayload } from "./types.js";

export interface ScenarioMarker {
  id: string;
  nodeId?: string;
  label: string;
  value: string;
  tone: "warning" | "info" | "critical";
  kind: "orbit" | "core" | "spine";
  x?: number;
  y?: number;
}

export interface ScenarioAuraEffect {
  id: string;
  nodeId: string;
  tone: "warning" | "info" | "critical";
  variant: "seal" | "star" | "engine-command" | "engine-signal" | "engine-guile" | "throne" | "mirror";
}

export interface ScenarioRouteEffect {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  tone: "warning" | "info" | "critical";
}

type ScalarMarkerSpec = {
  id: string;
  label: string;
  nodeId: string;
  progressKey: string;
  tone: {
    criticalAtOrBelow?: number;
    criticalAtOrAbove?: number;
    fallback: "warning" | "info" | "critical";
  };
};

const scalarMarkerSpecs: Partial<Record<string, ScalarMarkerSpec>> = {
  scenario_broken_seal: {
    id: "broken-seal-core",
    label: "Seal",
    nodeId: "center_cinder_gate",
    progressKey: "sealTokens",
    tone: {
      criticalAtOrBelow: 2,
      fallback: "warning"
    }
  },
  scenario_dying_star: {
    id: "dying-star-core",
    label: "Star",
    nodeId: "center_cinder_gate",
    progressKey: "starTokens",
    tone: {
      criticalAtOrBelow: 3,
      fallback: "warning"
    }
  },
  scenario_throne_of_ash: {
    id: "throne-core",
    label: "Crowns",
    nodeId: "center_cinder_gate",
    progressKey: "crownClaims",
    tone: {
      fallback: "info"
    }
  }
};

function resolveTone(
  value: number,
  tone: ScalarMarkerSpec["tone"]
): "warning" | "info" | "critical" {
  if (tone.criticalAtOrBelow !== undefined && value <= tone.criticalAtOrBelow) {
    return "critical";
  }

  if (tone.criticalAtOrAbove !== undefined && value >= tone.criticalAtOrAbove) {
    return "critical";
  }

  return tone.fallback;
}

function getOuterRingSectorIds(patch: PublicPatchPayload): string[] {
  return patch.sectors.filter((sector) => sector.regionTier === "borderlight").map((sector) => sector.id);
}

export function buildScenarioMarkers(patch: PublicPatchPayload): ScenarioMarker[] {
  const scenarioId = patch.activeScenario?.id;

  if (!scenarioId) {
    return [];
  }

  if (scenarioId === "scenario_devourer_beneath") {
    const outerRingSectorIds = getOuterRingSectorIds(patch);
    const devourerIndex = patch.scenarioProgress.devourerIndex ?? 0;
    const targetSectorId = outerRingSectorIds.length > 0 ? outerRingSectorIds[devourerIndex % outerRingSectorIds.length] : null;
    const doomTokens = patch.scenarioProgress.doomTokens ?? 0;

    return [
      {
        id: "devourer-orbit",
        nodeId: targetSectorId ?? "ashwake-crossing",
        label: "Devourer",
        value: `Doom ${doomTokens}`,
        tone: doomTokens >= 6 ? "critical" : "warning",
        kind: "orbit"
      }
    ];
  }

  if (scenarioId === "scenario_labyrinth_engine") {
    const modes = ["Command", "Signal", "Guile"];
    return [
      {
        id: "labyrinth-core",
        nodeId: "center_cinder_gate",
        label: "Engine",
        value: modes[(patch.scenarioProgress.engineModeIndex ?? 0) % modes.length] ?? "Command",
        tone: "info",
        kind: "core"
      }
    ];
  }

  if (scenarioId === "scenario_mirror_of_false_heroes") {
    return [
      {
        id: "mirror-core",
        nodeId: "center_cinder_gate",
        label: "Mirror",
        value: `${patch.activeScenario?.progress ?? 0}/${patch.activeScenario?.threshold ?? 0}`,
        tone: "info",
        kind: "core"
      }
    ];
  }

  const spec = scalarMarkerSpecs[scenarioId];

  if (!spec) {
    return [];
  }

  const value = patch.scenarioProgress[spec.progressKey] ?? 0;

  return [
    {
      id: spec.id,
      nodeId: spec.nodeId,
      label: spec.label,
      value: String(value),
      tone: resolveTone(value, spec.tone),
      kind: "core"
    }
  ];
}

export function buildScenarioAuras(patch: PublicPatchPayload): ScenarioAuraEffect[] {
  const scenarioId = patch.activeScenario?.id;

  if (!scenarioId) {
    return [];
  }

  if (scenarioId === "scenario_labyrinth_engine") {
    const modes = ["engine-command", "engine-signal", "engine-guile"] as const;
    return [
      {
        id: "labyrinth-engine-aura",
        nodeId: "center_cinder_gate",
        tone: "info",
        variant: modes[(patch.scenarioProgress.engineModeIndex ?? 0) % modes.length] ?? "engine-command"
      }
    ];
  }

  const auraByScenario: Partial<Record<string, ScenarioAuraEffect>> = {
    scenario_broken_seal: {
      id: "broken-seal-aura",
      nodeId: "center_cinder_gate",
      tone: (patch.scenarioProgress.sealTokens ?? 0) <= 2 ? "critical" : "warning",
      variant: "seal"
    },
    scenario_dying_star: {
      id: "dying-star-aura",
      nodeId: "center_cinder_gate",
      tone: (patch.scenarioProgress.starTokens ?? 0) <= 3 ? "critical" : "warning",
      variant: "star"
    },
    scenario_throne_of_ash: {
      id: "throne-aura",
      nodeId: "center_cinder_gate",
      tone: "info",
      variant: "throne"
    },
    scenario_mirror_of_false_heroes: {
      id: "mirror-aura",
      nodeId: "center_cinder_gate",
      tone: "info",
      variant: "mirror"
    }
  };

  const aura = auraByScenario[scenarioId];
  return aura ? [aura] : [];
}

export function buildScenarioRoutes(patch: PublicPatchPayload): ScenarioRouteEffect[] {
  if (patch.activeScenario?.id !== "scenario_devourer_beneath") {
    return [];
  }

  const outerRingSectorIds = getOuterRingSectorIds(patch);

  if (outerRingSectorIds.length < 2) {
    return [];
  }

  const currentIndex = (patch.scenarioProgress.devourerIndex ?? 0) % outerRingSectorIds.length;
  const nextIndex = (currentIndex + 1) % outerRingSectorIds.length;
  const currentSectorId = outerRingSectorIds[currentIndex];
  const nextSectorId = outerRingSectorIds[nextIndex];

  if (!currentSectorId || !nextSectorId) {
    return [];
  }

  return [
    {
      id: "devourer-route-preview",
      fromNodeId: currentSectorId,
      toNodeId: nextSectorId,
      tone: (patch.scenarioProgress.doomTokens ?? 0) >= 6 ? "critical" : "warning"
    }
  ];
}

export function buildEscalationMarker(patch: PublicPatchPayload): ScenarioMarker {
  const threshold = Math.max(1, patch.escalationThreshold);
  const progress = Math.max(0, Math.min(1, patch.escalationLevel / threshold));
  const anchors = [
    RIFTFALL_BOARD_NODE_INDEX.get("outer_ember_sanctum"),
    RIFTFALL_BOARD_NODE_INDEX.get("middle_guardian_span"),
    RIFTFALL_BOARD_NODE_INDEX.get("inner_veil_rift"),
    RIFTFALL_BOARD_NODE_INDEX.get("center_cinder_gate")
  ].filter((node): node is BoardNode => Boolean(node));
  const segmentProgress = progress * Math.max(anchors.length - 1, 1);
  const segmentIndex = Math.min(Math.floor(segmentProgress), Math.max(anchors.length - 2, 0));
  const localProgress = Math.min(1, Math.max(0, segmentProgress - segmentIndex));
  const from = anchors[segmentIndex] ?? anchors[0];
  const to = anchors[segmentIndex + 1] ?? anchors[anchors.length - 1] ?? from;
  const tone =
    patch.escalationLevel >= threshold
      ? "critical"
      : patch.escalationLevel >= Math.ceil(threshold * 0.67)
        ? "warning"
        : "info";

  return {
    id: "escalation-spine",
    nodeId: to?.id ?? from?.id,
    label: "Breach",
    value: `${patch.escalationLevel}/${threshold}`,
    tone,
    kind: "spine",
    x: (from?.x ?? 0.5) + ((to?.x ?? from?.x ?? 0.5) - (from?.x ?? 0.5)) * localProgress,
    y: (from?.y ?? 0.5) + ((to?.y ?? from?.y ?? 0.5) - (from?.y ?? 0.5)) * localProgress
  };
}
