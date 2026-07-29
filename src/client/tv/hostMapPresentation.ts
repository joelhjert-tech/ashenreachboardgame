import { getBoardSpace, type BoardSpaceTag } from "../../game/data/boardSpaces.js";
import type { PublicMoveDestination, PublicPatchPayload, PublicTileChallenge } from "../shared/types.js";
import { buildScenarioMarkers } from "../shared/scenarioBoardVisuals.js";

export type HostMapFocus = "overview" | "current-sector" | "destination-preview" | "arrival";

export interface HostMapOccupantPresentation {
  seatId: string;
  playerName: string;
  operativeName: string;
  active: boolean;
}

export interface HostMapSectorBriefPresentation {
  focus: HostMapFocus;
  sectorId: string;
  name: string;
  region: string;
  lore: string | null;
  tags: string[];
  occupants: HostMapOccupantPresentation[];
  activeOperativeName: string | null;
  challenge: string | null;
  publicThreat: string | null;
  shop: string | null;
  service: string | null;
  objective: string | null;
  scenario: string | null;
  specialConnection: string | null;
  routeContext: string | null;
  immediateRule: string | null;
  arrivalQueue: Array<{
    id: string;
    kind: "tile-challenge" | "threat-draw" | "board-action" | "service" | "gate" | "scenario";
    label: string;
    status: "current" | "pending" | "completed" | "failed" | "optional" | "locked";
    recurring: boolean;
  }>;
  placement: "left" | "right";
}

const regionLabels: Record<string, string> = {
  outer: "Borderlight · Outer region",
  borderlight: "Borderlight · Outer region",
  middle: "Red March · Middle region",
  "red-march": "Red March · Middle region",
  inner: "Crownfall · Inner region",
  crownfall: "Crownfall · Inner region",
  center: "Core",
  core: "Core"
};

const publicTagLabels: Partial<Record<BoardSpaceTag | string, string>> = {
  shop: "Shop",
  "risk-shop": "Contested shop",
  crossroads: "Crossroads",
  salvage: "Salvage",
  hazard: "Hazard",
  shrine: "Shrine",
  anomaly: "Anomaly",
  contract: "Contract site",
  recovery: "Recovery",
  enemy: "Enemy pressure",
  artifact: "Artifact site",
  movement: "Special route",
  scenario: "Scenario site",
  lore: "Sector action",
  safe: "Lower risk",
  locked: "Locked",
  danger: "Danger",
  reward: "Opportunity",
  nemesis: "Nemesis",
  gate: "Gate"
};

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function titleStat(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function describeChallenge(challenge: PublicTileChallenge | undefined): string | null {
  if (!challenge) return null;
  return `${challenge.name} · ${titleStat(challenge.testStat)} ${challenge.difficulty}`;
}

function getRouteContext(destination: PublicMoveDestination | null): string | null {
  if (!destination || destination.route.length < 2) return null;
  const names = destination.routeNames?.filter(Boolean) ?? [];
  const path = names.length === destination.route.length ? names.join(" → ") : null;
  return path ? `${destination.distance} step${destination.distance === 1 ? "" : "s"} · ${path}` : `${destination.distance} step${destination.distance === 1 ? "" : "s"}`;
}

function getSpecialConnection(destination: PublicMoveDestination | null, tags: string[]): string | null {
  if (destination?.ringTransition) {
    return `${destination.ringTransition.label} · ${destination.ringTransition.fromRing} to ${destination.ringTransition.toRing} · exact movement`;
  }
  if (tags.includes("gate")) return "Gate connection";
  if (tags.includes("movement")) return "Special connection";
  return null;
}

export function buildHostMapSectorBrief(
  patch: PublicPatchPayload,
  selectedSectorId: string | null,
  selectedDestination: PublicMoveDestination | null,
  selectedNodeX = 0.5,
  publicObjectiveLabels: string[] = []
): HostMapSectorBriefPresentation | null {
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const activePlayer = patch.players.find((player) => player.seatId === activeSeatId) ?? null;
  const arrivalSectorId = patch.tileArrival?.tileId ?? null;
  const sectorId = selectedDestination?.sectorId ?? arrivalSectorId ?? selectedSectorId ?? activePlayer?.sectorId ?? null;
  if (!sectorId) return null;

  const canonical = getBoardSpace(sectorId);
  const liveSector = patch.sectors.find((sector) => sector.id === sectorId) ?? null;
  const destination = selectedDestination?.sectorId === sectorId ? selectedDestination : null;
  if (!canonical && !liveSector && !destination) return null;

  const seatNames = new Map(patch.seats.map((seat) => [seat.seatId, seat.displayName] as const));
  const occupants = patch.players
    .filter((player) => player.sectorId === sectorId)
    .map((player) => ({
      seatId: player.seatId,
      playerName: seatNames.get(player.seatId) ?? player.character.name,
      operativeName: player.character.name,
      active: player.seatId === activeSeatId
    }));
  const exploration = patch.sectorExplorationSummary?.sectorId === sectorId ? patch.sectorExplorationSummary : null;
  const publicThreats = exploration?.unresolvedThreats ?? destination?.faceUpThreats ?? [];
  const scenarioMarker = buildScenarioMarkers(patch).find((marker) => marker.nodeId === sectorId) ?? null;
  const canonicalTags = canonical?.tags ?? [];
  const tagKeys = [...canonicalTags, ...(destination?.strategicTags ?? [])];
  const tags = [...new Set(tagKeys.map((tag) => publicTagLabels[tag]).filter((entry): entry is string => Boolean(entry)))];
  const recurringChallenge = liveSector?.tileChallenges?.[0];
  const publicThreat = publicThreats.length > 0
    ? `${publicThreats.length} public ${publicThreats.length === 1 ? "encounter" : "encounters"} present${exploration?.shopLocked ? " · shop blocked" : ""}`
    : null;
  const shopName = destination?.shop?.shopName ?? exploration?.shopName ?? null;
  const shop = shopName
    ? exploration?.shopLocked || destination?.shop?.status === "locked"
      ? `${shopName} · blocked`
      : shopName
    : canonicalTags.includes("shop") || canonicalTags.includes("risk-shop")
      ? "Shop services may be available"
      : null;
  const services = destination?.shop?.servicesPreview?.filter(Boolean) ?? [];
  const focus: HostMapFocus = destination
    ? "destination-preview"
    : arrivalSectorId === sectorId
      ? "arrival"
      : activePlayer?.sectorId === sectorId
        ? "current-sector"
      : "overview";
  const arrivalQueue = patch.tileArrival?.tileId === sectorId
    ? patch.tileArrival.rules.map((rule) => ({
        id: rule.id,
        kind: rule.kind,
        label: rule.label,
        status: rule.status,
        recurring: rule.kind === "tile-challenge" && rule.repeatPolicy === "EVERY_ARRIVAL"
      }))
    : [];

  return {
    focus,
    sectorId,
    name: destination?.name ?? canonical?.name ?? liveSector?.name ?? "Unknown sector",
    region: regionLabels[destination?.ring ?? canonical?.tier ?? liveSector?.regionTier ?? ""] ?? "Unknown region",
    lore: cleanText(destination?.loreText ?? canonical?.loreText),
    tags,
    occupants,
    activeOperativeName: occupants.find((occupant) => occupant.active)?.operativeName ?? null,
    challenge: describeChallenge(recurringChallenge),
    publicThreat,
    shop,
    service: services.length > 0 ? services.slice(0, 2).join(" · ") : null,
    objective: publicObjectiveLabels.length > 0 ? `Contract destination · ${publicObjectiveLabels.join(", ")}` : null,
    scenario: scenarioMarker ? `${scenarioMarker.label} · ${scenarioMarker.value}` : null,
    specialConnection: getSpecialConnection(destination, tagKeys),
    routeContext: getRouteContext(destination),
    immediateRule: cleanText(destination?.ruleText ?? canonical?.ruleText),
    arrivalQueue,
    placement: selectedNodeX < 0.5 ? "right" : "left"
  };
}
