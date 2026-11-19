import { useId, useMemo, type CSSProperties, type ReactElement } from "react";
import {
  BOARD_SPACES,
  type BoardSpaceDefinition,
  type BoardTier,
  type ThreatIcon
} from "../../game/data/boardSpaces.js";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import {
  getCartographyObjectiveCoinPath,
  getCartographyPlayerCoinPath,
  type CartographyObjectiveCoinId
} from "../../shared/cartographyCoinCatalog.js";
import {
  getSignalPieceIdForSeat,
  type SignalPieceId
} from "../../shared/signalPieceCatalog.js";
import { getSignalCartographySectorArtPath } from "../shared/assetPaths.js";
import { getMissionRelevanceForSector } from "../shared/missionRelevance.js";
import type {
  PublicInnerApproachState,
  PublicPatchPayload,
  PublicTileChallenge,
  Stat,
  StatePatch
} from "../shared/types.js";
import "./SignalCartographyPrototype.css";

export type SignalCartographyFixture = "live" | "route" | "challenge" | "dense" | "inner";
export type SignalCartographyDesign = "schematic" | "board-tiles";

interface SignalCartographyPrototypeProps {
  patch: StatePatch<PublicPatchPayload> | null;
  fixture: SignalCartographyFixture;
  design?: SignalCartographyDesign;
}

interface MapOccupant {
  seatId: string;
  initials: string;
  color: string;
  markerId: SignalPieceId;
}

export interface SignalCartographyTilePosition {
  sectorId: string;
  tier: BoardTier;
  row: number;
  column: number;
}

interface CartographyChallengeSummary {
  name: string;
  challengeType: "hazard" | "anomaly";
  testStat: Stat;
  difficulty: number;
  successSummary?: string;
  failureSummary?: string;
}

interface ActiveMissionTargets {
  missionName: string;
  ownerName: string;
  objectiveCoinId: CartographyObjectiveCoinId;
  sectorIds: Set<string>;
  reasonBySectorId: Map<string, string>;
}

const WIDTH = 1600;
const HEIGHT = 780;
const BOARD_CELL_WIDTH = 130;
const BOARD_CELL_HEIGHT = 100;
const BOARD_WIDTH = BOARD_CELL_WIDTH * 7;
const BOARD_HEIGHT = BOARD_CELL_HEIGHT * 7;
const BOARD_TILE_CENTER_X = BOARD_CELL_WIDTH / 2;
const TABLETOP_ART = "/assets/riftfall/ui/signal-cartography/tabletop-";
const SECTOR_FRAME = "M 8 3 H 122 L 127 8 V 92 L 122 97 H 8 L 3 92 V 8 Z";
const CORE_FRAME = "M 15 2 H 47 L 52 1 H 78 L 83 2 H 115 L 129 15 V 85 L 115 98 H 84 L 79 99 H 51 L 46 98 H 15 L 1 85 V 15 Z";
const SECTOR_ILLUSTRATION = "M 10 7 H 120 L 123 10 V 59 H 7 V 10 Z";
const INNER_TILE_FRAME = "M 11 7 H 119 L 123 11 V 89 L 119 93 H 11 L 7 89 V 11 Z";
const playerColors = ["#df5a43", "#54a7dd", "#d5ad55", "#65bb89", "#a985d6", "#e18ab1"];
const threatColors: Record<ThreatIcon, string> = {
  red: "#e0523d",
  blue: "#4aa9e8",
  yellow: "#d7b64d"
};
const statColors: Record<Stat, string> = {
  command: "#d2a657",
  grit: "#dd5540",
  signal: "#49aeea",
  guile: "#5abc80",
  forge: "#c27b4f"
};
const tierLabels: Record<BoardTier, string> = {
  outer: "Broken Perimeter",
  middle: "Red March",
  inner: "Crownfall",
  center: "Ashen Core"
};
const tierNumbers: Record<BoardTier, string> = {
  outer: "I",
  middle: "II",
  inner: "III",
  center: "IV"
};
const boardTierMarkers = [
  { tier: "outer", label: "Outer Reach", count: 24 },
  { tier: "middle", label: "Middle Reach", count: 16 },
  { tier: "inner", label: "Inner Reach", count: 8 },
  { tier: "center", label: "Core", count: 1 }
];
const statLabels: Record<Stat, string> = {
  command: "Command",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};
const statGlyphs: Record<Stat, string> = {
  command: "C",
  grit: "G",
  signal: "S",
  guile: "U",
  forge: "F"
};
const fixtureChallenge: CartographyChallengeSummary = {
  name: "Rift Whispers",
  challengeType: "anomaly",
  testStat: "signal",
  difficulty: 8,
  successSummary: "Pin one true whisper to the route ledger.",
  failureSummary: "Open a Rift Scar choice."
};
const fixtureRoute = [
  "north-dock-bastion",
  "outer_waymarket",
  "coldwind-wharf"
];
const fixtureInnerApproach: PublicInnerApproachState = {
  pathId: "breach-road",
  pathLabel: "Breach Road",
  currentSectorId: "inner_gate_of_cinders",
  currentSectorName: "Gate of Cinders",
  currentIndex: 4,
  challengeCleared: true,
  challengeTitle: "Break the Gate",
  challengeDetail: "The final approach has been cleared.",
  revision: 12,
  steps: [
    { sectorId: "inner_veil_rift", name: "Melted Gate", status: "cleared" },
    { sectorId: "inner_tomb_gate", name: "Rifted Approach", status: "cleared" },
    { sectorId: "inner_blackstar_shortcut", name: "Dead Star Reliquary", status: "cleared" },
    { sectorId: "the-bone-meridian", name: "Bone Meridian", status: "cleared" },
    { sectorId: "inner_gate_of_cinders", name: "Gate of Cinders", status: "current" },
    { sectorId: "center_cinder_gate", name: "The Ashen Reach Core", status: "boss" }
  ],
  options: [
    {
      sectorId: "center_cinder_gate",
      name: "The Ashen Reach Core",
      direction: "advance",
      label: "Enter the Ashen Reach Core",
      disabledReason: null
    },
    {
      sectorId: "the-bone-meridian",
      name: "Bone Meridian",
      direction: "retreat",
      label: "Retreat to Bone Meridian",
      disabledReason: null
    }
  ]
};

function ringGridPositions(inset: number): Array<{ row: number; column: number }> {
  const low = inset;
  const high = 6 - inset;
  const positions: Array<{ row: number; column: number }> = [];

  for (let column = low; column <= high; column += 1) {
    positions.push({ row: low, column });
  }
  for (let row = low + 1; row <= high; row += 1) {
    positions.push({ row, column: high });
  }
  for (let column = high - 1; column >= low; column -= 1) {
    positions.push({ row: high, column });
  }
  for (let row = high - 1; row > low; row -= 1) {
    positions.push({ row, column: low });
  }

  return positions;
}

export function buildSignalCartographyBoardLayout(): SignalCartographyTilePosition[] {
  const positionsByTier: Record<BoardTier, Array<{ row: number; column: number }>> = {
    outer: ringGridPositions(0),
    middle: ringGridPositions(1),
    inner: ringGridPositions(2),
    center: [{ row: 3, column: 3 }]
  };
  const expectedCounts: Record<BoardTier, number> = {
    outer: 24,
    middle: 16,
    inner: 8,
    center: 1
  };
  const spaceById = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));
  const layout: SignalCartographyTilePosition[] = [];

  (["outer", "middle", "inner", "center"] as const).forEach((tier) => {
    const tierNodes = RIFTFALL_BOARD_NODES.filter((node) => node.ring === tier);
    const tierPositions = positionsByTier[tier];

    if (tierNodes.length !== expectedCounts[tier] || tierPositions.length !== expectedCounts[tier]) {
      throw new Error(`Signal Cartography ${tier} layout must contain ${expectedCounts[tier]} sectors.`);
    }

    tierNodes.forEach((node, index) => {
      const space = spaceById.get(node.id);
      const position = tierPositions[index];

      if (!space || space.tier !== tier || !position) {
        throw new Error(`Signal Cartography could not place canonical ${tier} sector ${node.id}.`);
      }

      layout.push({
        sectorId: node.id,
        tier,
        row: position.row,
        column: position.column
      });
    });
  });

  if (new Set(layout.map((entry) => `${entry.row}:${entry.column}`)).size !== 49) {
    throw new Error("Signal Cartography board layout must occupy 49 unique cells.");
  }

  return layout;
}

const BOARD_TILE_LAYOUT = buildSignalCartographyBoardLayout();
const BOARD_TILE_INDEX = new Map(BOARD_TILE_LAYOUT.map((entry) => [entry.sectorId, entry] as const));
const BOARD_CONNECTIONS = RIFTFALL_BOARD_NODES.flatMap((node) =>
  node.connections
    .filter((neighborId) => node.id.localeCompare(neighborId) < 0)
    .map((neighborId) => {
      const from = BOARD_TILE_INDEX.get(node.id)!;
      const to = BOARD_TILE_INDEX.get(neighborId)!;
      return {
        fromSectorId: node.id,
        toSectorId: neighborId,
        key: [node.id, neighborId].sort().join("|"),
        ...getBoardConnectionGeometry(from, to)
      };
    })
);

function initials(value: string): string {
  const result = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return result || "?";
}

function splitLabel(value: string): [string, string?] {
  if (value.length <= 17) return [value];
  const words = value.split(" ");
  let first = "";
  while (words.length > 0 && `${first} ${words[0]}`.trim().length <= 17) {
    first = `${first} ${words.shift()}`.trim();
  }
  return [first || value.slice(0, 18), words.join(" ") || undefined];
}

function wrapBoardLabel(value: string): string[] {
  if (value.length <= 16) return [value];
  const spaces = Array.from(value.matchAll(/ /g), (match) => match.index);
  const midpoint = value.length / 2;
  const breakAt = spaces.reduce((nearest, index) =>
    Math.abs(index - midpoint) < Math.abs(nearest - midpoint) ? index : nearest, Infinity);
  return Number.isFinite(breakAt) ? [value.slice(0, breakAt), value.slice(breakAt + 1)] : [value];
}

function nodeDimensions(tier: BoardTier): { width: number; height: number } {
  return { width: tier === "center" ? 196 : 180, height: 90 };
}

function buildFixtureOccupants(fixture: SignalCartographyFixture): Map<string, MapOccupant[]> {
  const result = new Map<string, MapOccupant[]>();
  const target = fixture === "dense"
    ? "ashen-chapel"
    : fixture === "route"
      ? "north-dock-bastion"
      : fixture === "inner"
        ? "inner_gate_of_cinders"
        : fixture === "challenge"
          ? "ashen-chapel"
          : "outer_waymarket";
  result.set(
    target,
    Array.from({ length: fixture === "dense" ? 6 : 1 }, (_, index) => ({
      seatId: `seat-${index + 1}`,
      initials: ["JV", "SV", "OM", "IR", "KB", "TN"][index] ?? `P${index + 1}`,
      color: playerColors[index]!,
      markerId: getSignalPieceIdForSeat(index)
    }))
  );
  return result;
}

function buildOccupants(
  patch: StatePatch<PublicPatchPayload> | null,
  fixture: SignalCartographyFixture
): Map<string, MapOccupant[]> {
  if (fixture !== "live" || !patch?.payload.players.length) return buildFixtureOccupants(fixture);
  return buildPublicOccupants(patch.payload);
}

function buildPublicOccupants({ players, seats }: Pick<PublicPatchPayload, "players" | "seats">): Map<string, MapOccupant[]> {
  const bySector = new Map<string, MapOccupant[]>();
  players.forEach((player, index) => {
    const seatIndex = seats.findIndex((seat) => seat.seatId === player.seatId);
    const seat = seats[seatIndex];
    const displayName =
      seat?.displayName ??
      player.character.name;
    const existing = bySector.get(player.sectorId) ?? [];
    existing.push({
      seatId: player.seatId,
      initials: initials(displayName),
      color: playerColors[index % playerColors.length]!,
      markerId: seat?.signalPieceId ?? getSignalPieceIdForSeat(seatIndex >= 0 ? seatIndex : index)
    });
    bySector.set(player.sectorId, existing);
  });
  return bySector;
}

function PieceCluster({
  occupants,
  x,
  y
}: {
  occupants: MapOccupant[];
  x: number;
  y: number;
}): ReactElement {
  const visible = occupants.slice(0, 6);
  return (
    <g className="signal-cartography__pieces" aria-label={occupants.map((entry) => entry.initials).join(", ")}>
      {visible.map((occupant, index) => {
        const px = x + (index - (visible.length - 1) / 2) * 29;
        return (
          <g key={occupant.seatId} transform={`translate(${px} ${y})`}>
            <title>{occupant.initials}</title>
            <circle r="13" fill="#080b0d" stroke={occupant.color} strokeWidth="3" />
            <image href={getCartographyPlayerCoinPath(occupant.markerId)} x="-11" y="-11" width="22" height="22" />
          </g>
        );
      })}
    </g>
  );
}

function getCartographyChallenge(
  sectors: PublicPatchPayload["sectors"] | undefined,
  fixture: SignalCartographyFixture,
  space: BoardSpaceDefinition
): CartographyChallengeSummary | null {
  if (fixture === "challenge" && space.id === "ashen-chapel") {
    return fixtureChallenge;
  }

  const publicChallenge: PublicTileChallenge | undefined = sectors
    ?.find((sector) => sector.id === space.id)
    ?.tileChallenges?.[0];

  if (publicChallenge) {
    return {
      name: publicChallenge.name,
      challengeType: publicChallenge.challengeType,
      testStat: publicChallenge.testStat,
      difficulty: publicChallenge.difficulty,
      successSummary: publicChallenge.successSummary,
      failureSummary: publicChallenge.failureSummary
    };
  }

  const directTest = space.textBox.test;
  if (!directTest?.stats[0]) return null;

  return {
    name: space.textBox.title,
    challengeType: space.tags.includes("hazard") ? "hazard" : "anomaly",
    testStat: directTest.stats[0],
    difficulty: directTest.difficulty
  };
}

function buildFixtureMissionTargets(fixture: SignalCartographyFixture): ActiveMissionTargets | null {
  if (fixture === "live") return null;
  const fixtureTargetByState: Record<Exclude<SignalCartographyFixture, "live">, {
    missionName: string;
    sectorId: string;
    objectiveCoinId: CartographyObjectiveCoinId;
  }> = {
    route: { missionName: "Tune the Signal Pier", sectorId: "glassmere-spindle", objectiveCoinId: "route" },
    challenge: { missionName: "Quiet Rift Whispers", sectorId: "ashen-chapel", objectiveCoinId: "challenge" },
    dense: { missionName: "Read the Customs Ledger", sectorId: "middle_guardian_span", objectiveCoinId: "service" },
    inner: { missionName: "Break the Gate", sectorId: "inner_gate_of_cinders", objectiveCoinId: "challenge" }
  };
  const target = fixtureTargetByState[fixture];
  return {
    missionName: target.missionName,
    ownerName: "Active operative",
    objectiveCoinId: target.objectiveCoinId,
    sectorIds: new Set([target.sectorId]),
    reasonBySectorId: new Map([[target.sectorId, `This sector advances ${target.missionName}.`]])
  };
}

function buildActiveMissionTargets(
  patch: StatePatch<PublicPatchPayload> | null,
  fixture: SignalCartographyFixture
): ActiveMissionTargets | null {
  if (fixture !== "live") {
    return buildFixtureMissionTargets(fixture);
  }
  if (!patch) {
    return buildFixtureMissionTargets(fixture);
  }

  const activeSeatId = patch.payload.turnOrder[patch.payload.activeSeatIndex] ?? null;
  const activePlayer = patch.payload.players.find((player) => player.seatId === activeSeatId) ?? null;
  const activeContractState = activePlayer?.character.activeContract ?? null;
  const contract = activeContractState
    ? (patch.payload.availableContracts ?? []).find((entry) => entry.id === activeContractState.contractId) ?? null
    : null;

  if (!activePlayer || !contract) return buildFixtureMissionTargets(fixture);

  const ownerName =
    patch.payload.seats.find((seat) => seat.seatId === activePlayer.seatId)?.displayName ??
    activePlayer.character.name;
  const sectorIds = new Set<string>();
  const reasonBySectorId = new Map<string, string>();
  const objective = contract.objective;
  const objectiveCoinId: CartographyObjectiveCoinId =
    objective.type === "multiStopRoute"
      ? "route"
      : objective.type === "defeatCount"
        ? "hunt"
        : objective.type === "shopTransaction"
          ? "service"
          : "challenge";

  if (objective.type === "multiStopRoute") {
    const completed = new Set(activeContractState?.completedTargetIds ?? []);
    const remainingTargets = objective.targets.filter((target) => !completed.has(target.id));
    const visibleTargets = objective.ordered ? remainingTargets.slice(0, 1) : remainingTargets;

    visibleTargets.forEach((target) => {
      BOARD_SPACES
        .filter((space) => target.type === "spaceId"
          ? space.id === target.value
          : space.tags.includes(target.value as never))
        .forEach((space) => {
          sectorIds.add(space.id);
          reasonBySectorId.set(
            space.id,
            objective.ordered
              ? `${target.label} is the next required stop for ${contract.name}.`
              : `${target.label} is a remaining stop for ${contract.name}.`
          );
        });
    });
  } else if (objective.type === "tileChallengeResolved") {
    (patch.payload.sectors ?? []).forEach((sector) => {
      const matchingChallenge = sector.tileChallenges?.find((challenge) =>
        (!objective.challengeId || challenge.id === objective.challengeId) &&
        (!objective.sectorId || sector.id === objective.sectorId) &&
        (!objective.challengeType || challenge.challengeType === objective.challengeType) &&
        (!objective.challengeTag || challenge.tags.includes(objective.challengeTag))
      );
      if (!matchingChallenge) return;
      sectorIds.add(sector.id);
      reasonBySectorId.set(sector.id, `${matchingChallenge.name} can progress ${contract.name}.`);
    });
  } else {
    BOARD_SPACES.forEach((space) => {
      const liveSector = patch.payload.sectors.find((sector) => sector.id === space.id);
      const faceUpThreatCount =
        patch.payload.movementPlanner?.destinations.find((destination) => destination.sectorId === space.id)
          ?.faceUpThreats.length ?? 0;
      const relevance = getMissionRelevanceForSector(contract, space.id, {
        threatIcons: liveSector?.threatIcons?.length ? liveSector.threatIcons : space.threatIcons,
        faceUpThreatCount
      });
      if (!relevance) return;
      sectorIds.add(space.id);
      reasonBySectorId.set(space.id, relevance.reason);
    });
  }

  return {
    missionName: contract.name,
    ownerName,
    objectiveCoinId,
    sectorIds,
    reasonBySectorId
  };
}

function cartographyStatusText(
  fixture: SignalCartographyFixture,
  selectedDestination: { name: string } | undefined,
  innerApproach: PublicInnerApproachState | null
): string {
  if (fixture === "live") {
    if (innerApproach) {
      return `${innerApproach.pathLabel} · step ${innerApproach.currentIndex + 1}`;
    }
    return selectedDestination ? `Route to ${selectedDestination.name}` : "Movement survey";
  }

  if (fixture === "route") return "Route planning";
  if (fixture === "challenge") return "Challenge survey";
  if (fixture === "inner") return "Inner approach";
  return "Six-operative density";
}

function getBoardConnectionGeometry(from: SignalCartographyTilePosition, to: SignalCartographyTilePosition) {
  const columns = to.column - from.column;
  const rows = to.row - from.row;
  const adjacent = Math.abs(columns) + Math.abs(rows) === 1;
  const crossing = from.tier !== to.tier;
  const midpointX = (from.column + to.column + 1) * BOARD_CELL_WIDTH / 2;
  const midpointY = (from.row + to.row + 1) * BOARD_CELL_HEIGHT / 2;

  if (adjacent) {
    // Offset the crossing into the art or side gutter, clear of the title and Threat strip.
    const span = crossing ? 15 : 11;
    const x = columns ? midpointX : midpointX + 57;
    const y = rows ? midpointY : midpointY - 20;
    return {
      kind: crossing ? "crossing" : "track",
      path: columns ? `M ${x - span} ${y} H ${x + span}` : `M ${x} ${y - span} V ${y + span}`
    };
  }

  const x1 = from.column * BOARD_CELL_WIDTH + BOARD_TILE_CENTER_X;
  const y1 = from.row * BOARD_CELL_HEIGHT + 24;
  const x2 = to.column * BOARD_CELL_WIDTH + BOARD_TILE_CENTER_X;
  const y2 = to.row * BOARD_CELL_HEIGHT + 24;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const bend = Math.min(34, distance * 0.08);
  const controlX = midpointX - (y2 - y1) / distance * bend;
  const controlY = (y1 + y2) / 2 + (x2 - x1) / distance * bend;
  return { kind: "shortcut", path: `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}` };
}

function getTabletopSectorArtPath(space: BoardSpaceDefinition): string {
  return space.tier === "center" ? `${TABLETOP_ART}core.webp` : getSignalCartographySectorArtPath(space.id);
}

function BoardThreatGlyph({
  icon,
  x,
  y
}: {
  icon: ThreatIcon;
  x: number;
  y: number;
}): ReactElement {
  if (icon === "red") {
    return (
      <g className="signal-cartography__board-threat-glyph" transform={`translate(${x} ${y})`} aria-hidden="true">
        <path d="M -5 4 L 0 -5 L 5 4 L 0 1 Z" />
        <path d="M -4 -3 L 4 5" />
      </g>
    );
  }
  if (icon === "blue") {
    return (
      <g className="signal-cartography__board-threat-glyph" transform={`translate(${x} ${y})`} aria-hidden="true">
        <path d="M -6 0 L 0 -5 L 6 0 L 0 5 Z" />
        <circle r="1.7" />
      </g>
    );
  }
  return (
    <g className="signal-cartography__board-threat-glyph is-yellow" transform={`translate(${x} ${y})`} aria-hidden="true">
      <path d="M 0 -6 V 5 M 0 0 L -5 5 M 0 0 L 5 5" />
      <circle cy="-5" r="1.5" />
    </g>
  );
}

function BoardHazardGlyph(): ReactElement {
  return (
    <g className="signal-cartography__board-hazard" transform="translate(12 12)" aria-label="Hazard">
      <path className="signal-cartography__board-hazard-frame" d="M 0 -8 L 8 7 H -8 Z" />
      <path className="signal-cartography__board-hazard-crack" d="M 1 -4 L -1 0 L 2 1 L -1 5" />
    </g>
  );
}

function BoardPieceCluster({ occupants }: { occupants: MapOccupant[] }): ReactElement {
  const visibleOccupants = occupants.slice(0, 6);
  const crowded = visibleOccupants.length > 3;
  const rows = crowded ? [visibleOccupants.slice(0, 3), visibleOccupants.slice(3)] : [visibleOccupants];
  const radius = crowded ? 6.8 : 9.8;
  const artRadius = radius - 1.3;
  const spacing = crowded ? 17 : 23;

  return (
    <g
      className="signal-cartography__board-pieces"
      aria-label={`Operatives: ${occupants.map((entry) => entry.initials).join(", ")}`}
    >
      {rows.map((row, rowIndex) => {
        const startX = BOARD_TILE_CENTER_X - (spacing * (row.length - 1)) / 2;
        const y = crowded ? 33 + rowIndex * 15 : 43;
        return (
          <g key={row[0]!.seatId} data-piece-row={rowIndex}>
            {row.map((occupant, index) => (
              <g key={occupant.seatId} transform={`translate(${startX + index * spacing} ${y})`}>
                <ellipse className="signal-cartography__board-coin-shadow" cy="2.5" rx={radius + 2} ry={radius + 1} />
                <circle className="signal-cartography__board-coin-rim" r={radius + 1.2} />
                <circle className="signal-cartography__board-player-coin-ring" r={radius} stroke={occupant.color} />
                <image
                  className="signal-cartography__board-player-coin"
                  href={getCartographyPlayerCoinPath(occupant.markerId)}
                  x={-artRadius}
                  y={-artRadius}
                  width={artRadius * 2}
                  height={artRadius * 2}
                  preserveAspectRatio="xMidYMid meet"
                  data-player-coin={occupant.markerId}
                />
              </g>
            ))}
          </g>
        );
      })}
      {crowded ? (
        <g className="signal-cartography__board-occupancy" transform="translate(106 41)" aria-label={`${occupants.length} operatives`}>
          <rect x="-9" y="-8" width="18" height="16" rx="3" />
          <text textAnchor="middle" y="4">{occupants.length}</text>
        </g>
      ) : null}
    </g>
  );
}

function BoardTileBase({ position, space }: {
  position: SignalCartographyTilePosition;
  space: BoardSpaceDefinition;
}): ReactElement {
  const core = space.tier === "center";
  const frame = core ? CORE_FRAME : SECTOR_FRAME;
  return (
    <g
      className="signal-cartography__board-tile-base"
      data-surface="neutral"
      data-tier={space.tier}
      transform={`translate(${position.column * BOARD_CELL_WIDTH} ${position.row * BOARD_CELL_HEIGHT})`}
      aria-hidden="true"
    >
      <path className="signal-cartography__board-tile-stock" d={frame} />
      <path
        className="signal-cartography__board-tile-material"
        fill={`url(#signal-board-stock-${core ? "inner" : space.tier})`}
        d={frame}
      />
      <image
        className="signal-cartography__board-tile-art"
        href={getTabletopSectorArtPath(space)}
        x={core ? 1 : 2}
        y="2"
        width={core ? BOARD_CELL_WIDTH - 2 : BOARD_CELL_WIDTH - 4}
        height={core ? 96 : 61}
        preserveAspectRatio={core ? "xMidYMin slice" : "xMidYMid slice"}
        clipPath={core ? "url(#signal-board-core-clip)" : "url(#signal-board-illustration-clip)"}
      />
      {space.tier === "middle" ? (
        <path className="signal-cartography__board-rivets" d="M 9 8 h 1 M 120 8 h 1 M 9 92 h 1 M 120 92 h 1" />
      ) : null}
      {core ? <path className="signal-cartography__board-core-bevel" d={frame} /> : null}
    </g>
  );
}

function BoardTileOverlay({
  position,
  space,
  occupants,
  challenge,
  persistent,
  missionTarget,
  missionObjectiveCoinId,
  stateClass,
  selected,
  onSelect
}: {
  position: SignalCartographyTilePosition;
  space: BoardSpaceDefinition;
  occupants: MapOccupant[];
  challenge: CartographyChallengeSummary | null;
  persistent: boolean;
  missionTarget: boolean;
  missionObjectiveCoinId?: CartographyObjectiveCoinId;
  stateClass: string;
  selected: boolean;
  onSelect?: (sectorId: string) => void;
}): ReactElement {
  const lines = wrapBoardLabel(space.name);
  const lineHeight = 11;
  const firstLineY = 73 - ((lines.length - 1) * lineHeight) / 2;
  const threatBandX = 12;
  const threatBandWidth = BOARD_CELL_WIDTH - threatBandX * 2;
  const threatWidth = threatBandWidth / Math.max(space.threatIcons.length, 1);
  const core = space.tier === "center";
  const frame = core ? CORE_FRAME : SECTOR_FRAME;
  const isGate =
    Boolean(space.movementBox) ||
    Boolean(space.movementRequirements?.length) ||
    space.tags.includes("movement");
  const accessibleDetails = [
    `${space.name}, ${tierLabels[space.tier]}`,
    space.tags.includes("hazard") ? "hazard" : null,
    challenge ? `${statLabels[challenge.testStat]} challenge ${challenge.difficulty}` : null,
    space.threatIcons.length > 0 ? `${space.threatIcons.length} printed threats` : "no printed threat"
  ].filter(Boolean).join(", ");

  return (
    <g
      className={`signal-cartography__board-tile ${stateClass}`}
      data-sector-id={space.id}
      data-tier={space.tier}
      data-row={position.row}
      data-column={position.column}
      data-mission-target={missionTarget}
      transform={`translate(${position.column * BOARD_CELL_WIDTH} ${position.row * BOARD_CELL_HEIGHT})`}
      role={onSelect ? "button" : "group"}
      aria-label={onSelect ? `Preview ${accessibleDetails}` : accessibleDetails}
      aria-pressed={onSelect ? selected : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(space.id) : undefined}
      onKeyDown={onSelect ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(space.id);
        }
      } : undefined}
    >
      {onSelect ? <path d={frame} fill="transparent" /> : null}
      <path className="signal-cartography__board-tile-frame" d={frame} />
      <path className="signal-cartography__board-route-border" d={frame} />
      <path className="signal-cartography__board-legal-border" d={INNER_TILE_FRAME} />
      <path className="signal-cartography__board-active-corners" d="M 4 23 V 9 L 10 3 H 26 M 104 3 H 120 L 126 9 V 23 M 126 77 V 91 L 120 97 H 104 M 26 97 H 10 L 4 91 V 77" />
      {isGate ? (
        <>
          <path className="signal-cartography__board-gate-frame" d="M 9 26 V 13 L 13 9 H 26 M 104 9 H 117 L 121 13 V 26" />
          <path className="signal-cartography__board-gate-diamond" d="M 12 21 L 17 26 L 12 31 L 7 26 Z" aria-label="Route or gate" />
        </>
      ) : null}
      {missionTarget ? (
        <g className="signal-cartography__board-mission" transform={`translate(${BOARD_TILE_CENTER_X} 12)`} aria-label="Active operative public mission destination">
          <circle r="13" />
          <image
            className="signal-cartography__board-mission-coin"
            href={getCartographyObjectiveCoinPath(missionObjectiveCoinId ?? "route")}
            x="-11"
            y="-11"
            width="22"
            height="22"
            preserveAspectRatio="xMidYMid meet"
            data-objective-coin={missionObjectiveCoinId ?? "route"}
          />
        </g>
      ) : null}
      <rect className="signal-cartography__board-name-plate" x="7" y="58" width={BOARD_CELL_WIDTH - 14} height="23" />
      <text className="signal-cartography__board-name" textAnchor="middle">
        {lines.map((line, index) => (
          <tspan key={`${space.id}-label-${index}`} x={BOARD_TILE_CENTER_X} y={firstLineY + index * lineHeight}>{line}</tspan>
        ))}
      </text>
      {space.tags.includes("hazard") ? <BoardHazardGlyph /> : null}
      {challenge ? (
        <g
          className="signal-cartography__board-challenge"
          transform="translate(110 16)"
          aria-label={`${statLabels[challenge.testStat]} ${challenge.difficulty}`}
        >
          <circle r="11" fill={statColors[challenge.testStat]} />
          <circle className="signal-cartography__board-challenge-ring" r="8" />
          <text textAnchor="middle" y="2.8">
            {statGlyphs[challenge.testStat]}{challenge.difficulty}
          </text>
        </g>
      ) : null}
      {persistent ? (
        <g className="signal-cartography__board-persistent" transform="translate(88 17)" aria-label="Revealed encounter">
          <circle r="9" />
          <path d="M -4 0 H 4 M 0 -4 V 4" />
        </g>
      ) : null}
      {occupants.length > 0 ? <BoardPieceCluster occupants={occupants} /> : null}
      <g className="signal-cartography__board-threat-band" aria-label={`${space.threatIcons.length} printed Threats`}>
        {space.threatIcons.length > 0 ? space.threatIcons.map((icon, index) => (
          <g key={`${space.id}-board-threat-${icon}-${index}`}>
            <rect
              x={threatBandX + index * threatWidth}
              y="84"
              width={threatWidth}
              height="12"
              fill={threatColors[icon]}
              data-threat-lane={icon}
            />
            <BoardThreatGlyph icon={icon} x={threatBandX + index * threatWidth + threatWidth / 2} y={90} />
          </g>
        )) : (
          <>
            <rect x={threatBandX} y="84" width={threatBandWidth} height="12" className="signal-cartography__board-no-threat" />
            <text x={BOARD_TILE_CENTER_X} y="92.5" textAnchor="middle" className="signal-cartography__board-no-threat-label">
              NO DRAW
            </text>
          </>
        )}
      </g>
    </g>
  );
}

interface BoardTilesViewProps {
  patch: StatePatch<PublicPatchPayload> | null;
  fixture: SignalCartographyFixture;
  occupants: Map<string, MapOccupant[]>;
  route: string[];
  routeEdges: Set<string>;
  activeSectorId: string;
  focusedSectorId: string;
  legalDestinationIds: Set<string>;
  persistentSectorIds: Set<string>;
  innerApproach: PublicInnerApproachState | null;
  selectedDestination?: { name: string };
}

interface TabletopBoardProps extends Pick<BoardTilesViewProps,
  "occupants" | "route" | "routeEdges" | "activeSectorId" | "focusedSectorId" |
  "legalDestinationIds" | "persistentSectorIds" | "innerApproach"
> {
  missionTargets?: ActiveMissionTargets | null;
  getChallenge?: (space: BoardSpaceDefinition) => CartographyChallengeSummary | null;
  selectableDestinationIds?: Set<string>;
  onSelectSector?: (sectorId: string) => void;
}

const tabletopSpacesById = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));

function TabletopBoard({
  occupants,
  route,
  routeEdges,
  activeSectorId,
  focusedSectorId,
  legalDestinationIds,
  persistentSectorIds,
  innerApproach,
  missionTargets,
  getChallenge,
  selectableDestinationIds,
  onSelectSector
}: TabletopBoardProps): ReactElement {
  const titleId = useId();
  const descriptionId = useId();
  const innerSteps = innerApproach?.steps ?? [];
  const innerEdges = new Set(
    innerSteps.slice(1).map((step, index) => [innerSteps[index]!.sectorId, step.sectorId].sort().join("|"))
  );

  function tileStateClass(space: BoardSpaceDefinition): string {
    const innerStep = innerApproach?.steps.find((step) => step.sectorId === space.id);
    return [
      `is-tier-${space.tier}`,
      space.id === activeSectorId ? "is-active" : "",
      space.id === focusedSectorId ? "is-focused" : "",
      legalDestinationIds.has(space.id) ? "is-legal" : "",
      route.includes(space.id) ? "is-route" : "",
      missionTargets?.sectorIds.has(space.id) ? "is-mission-target" : "",
      innerStep?.status === "cleared" ? "is-inner-cleared" : "",
      innerStep?.status === "current" ? "is-inner-current" : "",
      innerStep?.status === "boss" ? "is-inner-boss" : "",
      persistentSectorIds.has(space.id) ? "has-persistent" : ""
    ].filter(Boolean).join(" ");
  }

  return (
    <svg
      className="signal-cartography__board-svg"
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      role={onSelectSector ? "group" : "img"}
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>Ashen Reach nested public sector board</title>
      <desc id={descriptionId}>
        Forty-nine illustrated sector tiles in three nested reaches around the Ashen Reach Core. Printed tracks show playable connections. Threat bands, public markers, operative pieces, and movement highlights sit on the printed board.
      </desc>
      <defs>
        <clipPath id="signal-board-illustration-clip"><path d={SECTOR_ILLUSTRATION} /></clipPath>
        <clipPath id="signal-board-core-clip"><path d={CORE_FRAME} /></clipPath>
        {(["outer", "middle", "inner"] as const).map((tier) => (
          <pattern key={tier} id={`signal-board-stock-${tier}`} patternUnits="userSpaceOnUse" width={BOARD_CELL_WIDTH} height={BOARD_CELL_HEIGHT}>
            <image href={`${TABLETOP_ART}${tier}.webp`} width={BOARD_CELL_WIDTH} height={BOARD_CELL_HEIGHT} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        ))}
        <linearGradient id="signal-board-core-brass" x2="0.78" y2="1">
          <stop stopColor="#fff0c2" />
          <stop offset=".32" stopColor="#a17b49" />
          <stop offset=".66" stopColor="#eed1a1" />
          <stop offset="1" stopColor="#6b3a21" />
        </linearGradient>
        <marker id="signal-board-link-terminal" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4">
          <path d="M 4 0.75 L 7.25 4 L 4 7.25 L 0.75 4 Z" />
        </marker>
      </defs>
      <rect className="signal-cartography__board-stock-edge" x="-8" y="-8" width={BOARD_WIDTH + 16} height={BOARD_HEIGHT + 19} rx="9" />
      <rect className="signal-cartography__board-bed" x="-5" y="-5" width={BOARD_WIDTH + 10} height={BOARD_HEIGHT + 10} rx="5" />
      <g className="signal-cartography__board-tier-beds" aria-hidden="true">
        <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} className="is-outer" />
        <rect x={BOARD_CELL_WIDTH} y={BOARD_CELL_HEIGHT} width={BOARD_CELL_WIDTH * 5} height={BOARD_CELL_HEIGHT * 5} className="is-middle" />
        <rect x={BOARD_CELL_WIDTH * 2} y={BOARD_CELL_HEIGHT * 2} width={BOARD_CELL_WIDTH * 3} height={BOARD_CELL_HEIGHT * 3} className="is-inner" />
        <rect x={BOARD_CELL_WIDTH * 3} y={BOARD_CELL_HEIGHT * 3} width={BOARD_CELL_WIDTH} height={BOARD_CELL_HEIGHT} className="is-core" />
      </g>

      <g className="signal-cartography__board-tile-bases">
        {BOARD_TILE_LAYOUT.map((position) => {
          const space = tabletopSpacesById.get(position.sectorId);
          if (!space) return null;
          return (
            <BoardTileBase
              key={`${space.id}-base`}
              position={position}
              space={space}
            />
          );
        })}
      </g>

      <g className="signal-cartography__board-tier-frames" aria-hidden="true">
        <rect x="1.5" y="1.5" width={BOARD_WIDTH - 3} height={BOARD_HEIGHT - 3} className="is-outer" data-tier="outer" />
        <rect x={BOARD_CELL_WIDTH} y={BOARD_CELL_HEIGHT} width={BOARD_CELL_WIDTH * 5} height={BOARD_CELL_HEIGHT * 5} className="is-middle" data-tier="middle" />
        <rect x={BOARD_CELL_WIDTH * 2} y={BOARD_CELL_HEIGHT * 2} width={BOARD_CELL_WIDTH * 3} height={BOARD_CELL_HEIGHT * 3} className="is-inner" data-tier="inner" />
        <rect x={BOARD_CELL_WIDTH * 3} y={BOARD_CELL_HEIGHT * 3} width={BOARD_CELL_WIDTH} height={BOARD_CELL_HEIGHT} className="is-core" data-tier="center" />
      </g>

      <g className="signal-cartography__board-connections" aria-hidden="true">
        {BOARD_CONNECTIONS.map((connection) => {
          const selected = routeEdges.has(connection.key);
          const inner = innerEdges.has(connection.key);
          const className = [
            connection.kind === "track" ? "signal-cartography__board-track" : "signal-cartography__board-special-links",
            `is-${connection.kind}`,
            selected ? "is-route" : "",
            inner ? "is-inner-link" : ""
          ].filter(Boolean).join(" ");
          return (
            <g key={connection.key} className={className}>
              <path className="signal-cartography__board-track-bed" d={connection.path} />
              <path
                className="signal-cartography__board-track-print"
                data-from-sector-id={connection.fromSectorId}
                data-to-sector-id={connection.toSectorId}
                d={connection.path}
              />
              {selected || inner ? <path className="signal-cartography__board-track-inlay" d={connection.path} /> : null}
            </g>
          );
        })}
      </g>

      <g className="signal-cartography__board-tile-overlays">
        {BOARD_TILE_LAYOUT.map((position) => {
          const space = tabletopSpacesById.get(position.sectorId);
          if (!space) return null;
          return (
            <BoardTileOverlay
              key={space.id}
              position={position}
              space={space}
              occupants={occupants.get(space.id) ?? []}
              challenge={getChallenge?.(space) ?? null}
              persistent={persistentSectorIds.has(space.id)}
              missionTarget={missionTargets?.sectorIds.has(space.id) ?? false}
              missionObjectiveCoinId={missionTargets?.objectiveCoinId}
              stateClass={tileStateClass(space)}
          selected={space.id === focusedSectorId}
          onSelect={selectableDestinationIds?.has(space.id) ? onSelectSector : undefined}
            />
          );
        })}
      </g>

    </svg>
  );
}

interface PhoneTabletopMapProps {
  publicState?: Pick<PublicPatchPayload, "players" | "seats" | "sectors">;
  currentSectorId: string;
  selectedSectorId: string | null;
  legalDestinationIds: Set<string>;
  selectableDestinationIds: Set<string>;
  persistentSectorIds: Set<string>;
  route: string[];
  innerApproach: PublicInnerApproachState | null;
  onSelectSector?: (sectorId: string) => void;
}

export function PhoneTabletopMap({
  publicState,
  currentSectorId,
  selectedSectorId,
  legalDestinationIds,
  selectableDestinationIds,
  persistentSectorIds,
  route,
  innerApproach,
  onSelectSector
}: PhoneTabletopMapProps): ReactElement {
  const occupants = useMemo(() => publicState ? buildPublicOccupants(publicState) : new Map<string, MapOccupant[]>(), [publicState]);
  return (
    <TabletopBoard
      occupants={occupants}
      route={route}
      routeEdges={getRouteEdges(route)}
      activeSectorId={currentSectorId}
      focusedSectorId={selectedSectorId ?? ""}
      legalDestinationIds={legalDestinationIds}
      selectableDestinationIds={selectableDestinationIds}
      persistentSectorIds={persistentSectorIds}
      innerApproach={innerApproach}
      getChallenge={(space) => getCartographyChallenge(publicState?.sectors, "live", space)}
      onSelectSector={onSelectSector}
    />
  );
}

function getRouteEdges(route: string[]): Set<string> {
  return new Set(route.slice(1).map((id, index) => [route[index]!, id].sort().join("|")));
}

function BoardTilesView({
  patch,
  fixture,
  occupants,
  route,
  routeEdges,
  activeSectorId,
  focusedSectorId,
  legalDestinationIds,
  persistentSectorIds,
  innerApproach,
  selectedDestination
}: BoardTilesViewProps): ReactElement {
  const spaceById = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));
  const missionTargets = buildActiveMissionTargets(patch, fixture);
  const focusSpace = spaceById.get(focusedSectorId) ?? spaceById.get(activeSectorId) ?? BOARD_SPACES[0]!;
  const focusChallenge = getCartographyChallenge(patch?.payload.sectors, fixture, focusSpace);
  const focusPersistent =
    persistentSectorIds.has(focusSpace.id) ||
    (fixture === "challenge" && focusSpace.id === "black-relay-spire");
  const focusOccupants = occupants.get(focusSpace.id) ?? [];
  const visiblePersistentSectorIds = fixture === "challenge"
    ? new Set([...persistentSectorIds, "black-relay-spire"])
    : persistentSectorIds;

  return (
    <main
      className="signal-cartography signal-cartography--board-tiles"
      data-fixture={fixture}
      data-design="board-tiles"
      data-testid="signal-cartography-prototype"
      aria-label={fixture === "live" ? "Signal Cartography public map" : "Signal Cartography board-tile development prototype"}
    >
      <header className="signal-cartography__header signal-cartography__board-header">
        <div>
          <h1>Signal Cartography</h1>
        </div>
        <div className="signal-cartography__status">
          <span className="signal-cartography__pulse" aria-hidden="true" />
          <strong>{cartographyStatusText(fixture, selectedDestination, innerApproach)}</strong>
          <small>Public information only</small>
        </div>
      </header>

      <section className="signal-cartography__frame signal-cartography__frame--board-tiles" aria-label="49-sector nested public game board">
        <div className="signal-cartography__board-layout">
          <div className="signal-cartography__board-stage">
            <TabletopBoard
              occupants={occupants}
              route={route}
              routeEdges={routeEdges}
              activeSectorId={activeSectorId}
              focusedSectorId={focusedSectorId}
              legalDestinationIds={legalDestinationIds}
              persistentSectorIds={visiblePersistentSectorIds}
              innerApproach={innerApproach}
              missionTargets={missionTargets}
              getChallenge={(space) => getCartographyChallenge(patch?.payload.sectors, fixture, space)}
            />
          </div>

          <aside className="signal-cartography__focus-panel" aria-label={`Focused sector: ${focusSpace.name}`}>
            <div className="signal-cartography__focus-art">
              <img src={getTabletopSectorArtPath(focusSpace)} alt="" />
              <div>
                <span>Reach {tierNumbers[focusSpace.tier]} · {tierLabels[focusSpace.tier]}</span>
                <h2>{focusSpace.name}</h2>
              </div>
            </div>

            <div className="signal-cartography__focus-flags" aria-label="Sector functions">
              {focusSpace.tags.includes("hazard") ? <span className="is-hazard">Hazard</span> : null}
              {focusChallenge ? <span className="is-challenge">Challenge</span> : null}
              {focusSpace.tags.includes("movement") || focusSpace.movementRequirements?.length ? <span className="is-gate">Route / gate</span> : null}
              {focusPersistent ? <span className="is-encounter">Revealed encounter</span> : null}
              {missionTargets?.sectorIds.has(focusSpace.id) ? <span className="is-mission">Mission target</span> : null}
              {focusOccupants.length > 0 ? <span className="is-occupied">{focusOccupants.length} operative{focusOccupants.length === 1 ? "" : "s"}</span> : null}
            </div>

            {missionTargets && missionTargets.sectorIds.size > 0 ? (
              <section className="signal-cartography__mission-brief">
                <div className="signal-cartography__mission-beacon" aria-hidden="true">
                  <img
                    src={getCartographyObjectiveCoinPath(missionTargets.objectiveCoinId)}
                    alt=""
                  />
                </div>
                <div>
                  <span className="signal-cartography__focus-kicker">{missionTargets.ownerName} · public mission beacon</span>
                  <h3>{missionTargets.missionName}</h3>
                  <p>
                    {missionTargets.sectorIds.has(focusSpace.id)
                      ? missionTargets.reasonBySectorId.get(focusSpace.id) ?? "This sector can advance the active mission."
                      : `${missionTargets.sectorIds.size} valid mission destination${missionTargets.sectorIds.size === 1 ? "" : "s"} marked on the board.`}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="signal-cartography__focus-section">
              <span className="signal-cartography__focus-kicker">Sector action</span>
              <p>{focusSpace.ruleText}</p>
            </section>

            {focusChallenge ? (
              <section className="signal-cartography__focus-section signal-cartography__focus-challenge">
                <div
                  className="signal-cartography__focus-stat"
                  style={{ "--focus-stat": statColors[focusChallenge.testStat] } as CSSProperties}
                >
                  <b>{statGlyphs[focusChallenge.testStat]}</b>
                  <span>{statLabels[focusChallenge.testStat]}</span>
                  <strong>{focusChallenge.difficulty}</strong>
                </div>
                <div>
                  <span className="signal-cartography__focus-kicker">
                    {focusChallenge.challengeType === "hazard" ? "Hazard test" : "Recurring challenge"}
                  </span>
                  <h3>{focusChallenge.name}</h3>
                  {focusChallenge.successSummary ? <p><b>Clear:</b> {focusChallenge.successSummary}</p> : null}
                  {focusChallenge.failureSummary ? <p><b>Fail:</b> {focusChallenge.failureSummary}</p> : null}
                </div>
              </section>
            ) : null}

            <section className="signal-cartography__focus-section signal-cartography__focus-threats">
              <span className="signal-cartography__focus-kicker">Printed threat lanes</span>
              <div>
                {focusSpace.threatIcons.length > 0 ? focusSpace.threatIcons.map((icon, index) => (
                  <span key={`${focusSpace.id}-focus-threat-${icon}-${index}`} className={`is-${icon}`}>
                    {icon}
                  </span>
                )) : <span className="is-neutral">No threat draw</span>}
              </div>
            </section>

            <div className="signal-cartography__board-legend" aria-label="Board symbol legend">
              <span><i className="is-hazard" />Hazard</span>
              <span><i className="is-challenge" />Test + difficulty</span>
              <span><i className="is-gate" />Route / gate</span>
              <span><i className="is-active" />Active sector</span>
              <span><i className="is-legal" />Legal destination</span>
              <span><i className="is-route" />Selected route</span>
              {innerApproach ? <span><i className="is-inner-path" />Inner approach</span> : null}
              <span><i className="is-mission" />Mission target</span>
              <span><i className="is-encounter" />Revealed encounter</span>
            </div>
          </aside>
        </div>
      </section>

      <footer className="signal-cartography__footer">
        <span>
          {fixture === "live" && patch?.payload.hostView?.requester
            ? `Requested by ${patch.payload.hostView.requester.displayName}`
            : "Approval prototype · Movement screen view"}
        </span>
        <div className="signal-cartography__board-tier-markers" aria-label="Board reaches">
          {boardTierMarkers.map(({ tier, label, count }) => (
            <span key={tier} className={`signal-cartography__board-tier-marker is-${tier}`} aria-label={`${label.toUpperCase()}, ${count} ${count === 1 ? "tile" : "tiles"}`}>
              {label} <strong>{count}</strong>
            </span>
          ))}
        </div>
        <span>{innerApproach ? "Inner trials charted publicly" : "49 sectors · authoritative routes"}</span>
      </footer>
    </main>
  );
}

export function SignalCartographyPrototype({
  patch,
  fixture,
  design = "schematic"
}: SignalCartographyPrototypeProps): ReactElement {
  const nodeById = useMemo(() => {
    const positions: Record<BoardTier, Array<[number, number]>> = {
      outer: [
        ...Array.from({ length: 8 }, (_, i): [number, number] => [105 + i * 198, 60]),
        ...[192, 324, 456, 588].map((y): [number, number] => [1491, y]),
        ...Array.from({ length: 8 }, (_, i): [number, number] => [1491 - i * 198, 720]),
        ...[588, 456, 324, 192].map((y): [number, number] => [105, y])
      ],
      middle: [
        ...Array.from({ length: 6 }, (_, i): [number, number] => [320 + i * 192, 200]),
        [1280, 340], [1280, 480],
        ...Array.from({ length: 6 }, (_, i): [number, number] => [1280 - i * 192, 620]),
        [320, 480], [320, 340]
      ],
      inner: [[580, 310], [800, 310], [1020, 310], [1020, 415], [1020, 520], [800, 520], [580, 520], [580, 415]],
      center: [[800, 405]]
    };
    const indices: Record<BoardTier, number> = { outer: 0, middle: 0, inner: 0, center: 0 };
    return new Map(RIFTFALL_BOARD_NODES.map((node) => {
      const [x, y] = positions[node.ring][indices[node.ring]++]!;
      return [node.id, { ...node, x: x / WIDTH, y: y / HEIGHT }];
    }));
  }, []);
  const publicSectorById = useMemo(() => new Map(patch?.payload.sectors.map((sector) => [sector.id, sector]) ?? []), [patch?.payload.sectors]);
  const occupants = useMemo(() => buildOccupants(patch, fixture), [fixture, patch]);
  const selectedDestination = patch?.payload.movementPlanner?.destinations.find(
    (destination) => destination.sectorId === patch.payload.movementPlanner?.selectedDestinationId
  );
  const innerApproach = fixture === "live"
    ? patch?.payload.innerApproach ?? null
    : fixture === "inner"
      ? fixtureInnerApproach
      : null;
  const route = fixture === "live"
    ? selectedDestination?.route ?? innerApproach?.steps.map((step) => step.sectorId) ?? []
    : fixture === "route" ? fixtureRoute : [];
  const persistentSectorIds = new Set(
    fixture === "live"
      ? patch?.payload.movementPlanner?.destinations
        .filter((destination) => destination.faceUpThreats.length > 0)
        .map((destination) => destination.sectorId) ?? []
      : []
  );
  const routeEdges = getRouteEdges(route);
  const fixtureActiveSectorId =
    fixture === "dense"
      ? "ashen-chapel"
      : fixture === "route"
        ? "north-dock-bastion"
        : fixture === "inner"
          ? "inner_gate_of_cinders"
          : fixture === "challenge"
            ? "ashen-chapel"
            : "outer_ember_sanctum";
  const activeSectorId =
    fixture === "live"
      ? patch?.payload.players.find((player) => player.seatId === patch.payload.turnOrder[patch.payload.activeSeatIndex])?.sectorId ??
        fixtureActiveSectorId
      : fixtureActiveSectorId;
  const legalDestinationIds = new Set(
    fixture === "inner"
      ? fixtureInnerApproach.options.filter((option) => !option.disabledReason).map((option) => option.sectorId)
      : fixture === "route"
        ? ["outer_waymarket", "coldwind-wharf"]
        : fixture === "live"
          ? innerApproach?.options
            .filter((option) => !option.disabledReason)
            .map((option) => option.sectorId) ??
            patch?.payload.movementPlanner?.destinations
              .filter((destination) => !destination.disabledReason)
              .map((destination) => destination.sectorId) ??
            []
          : []
  );
  const focusedSectorId =
    fixture === "live"
      ? selectedDestination?.sectorId ?? activeSectorId
      : fixture === "route"
      ? fixtureRoute.at(-1)!
      : fixture === "challenge"
        ? "ashen-chapel"
        : fixture === "dense"
          ? "ashen-chapel"
          : fixture === "inner"
            ? "inner_gate_of_cinders"
            : activeSectorId;

  if (design === "board-tiles") {
    return (
      <BoardTilesView
        patch={patch}
        fixture={fixture}
        occupants={occupants}
        route={route}
        routeEdges={routeEdges}
        activeSectorId={activeSectorId}
        focusedSectorId={focusedSectorId}
        legalDestinationIds={legalDestinationIds}
        persistentSectorIds={persistentSectorIds}
        innerApproach={innerApproach}
        selectedDestination={selectedDestination}
      />
    );
  }

  return (
    <main
      className="signal-cartography signal-cartography--dead-star"
      data-fixture={fixture}
      data-design="schematic"
      data-testid="signal-cartography-prototype"
      aria-label={fixture === "live" ? "Signal Cartography public map" : "Signal Cartography development prototype"}
    >
      <header className="signal-cartography__header">
        <div>
          <span>The Dead Star Expanse</span>
          <h1>Ashen Reach</h1>
        </div>
        <div className="signal-cartography__status">
          <span className="signal-cartography__pulse" aria-hidden="true" />
          <strong>{cartographyStatusText(fixture, selectedDestination, innerApproach)}</strong>
          <small>Public information only</small>
        </div>
      </header>

      <section className="signal-cartography__frame" aria-label="49-sector public space board">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="signal-map-title signal-map-desc">
          <title id="signal-map-title">Ashenreach public sector map</title>
          <desc id="signal-map-desc">Four concentric reaches with sector names, routes, printed Threats, public challenges, and operative locations.</desc>
          <defs>
            <radialGradient id="cartography-iris" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#233137" stopOpacity=".6" />
              <stop offset="56%" stopColor="#10181c" stopOpacity=".28" />
              <stop offset="100%" stopColor="#050708" stopOpacity=".05" />
            </radialGradient>
            <filter id="cartography-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {BOARD_SPACES.map((space, index) => (
              <pattern
                key={space.id}
                id={`cartography-art-${space.id}`}
                width="1"
                height="1"
                patternContentUnits="objectBoundingBox"
              >
                <image
                  href={`/assets/riftfall/ui/signal-cartography/void-sector-${index % 8}.webp`}
                  width="1"
                  height="1"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
          </defs>
          <image href="/assets/riftfall/ui/signal-cartography/dead-star-backdrop.webp" width={WIDTH} height={HEIGHT} preserveAspectRatio="xMidYMid slice" />
          <g className="signal-cartography__reach-lines" aria-hidden="true">
            <rect x="70" y="66" width="1460" height="768" rx="44" />
            <rect x="326" y="246" width="948" height="408" rx="34" />
            <rect x="518" y="344" width="564" height="212" rx="28" />
            <circle cx="800" cy="450" r="92" />
          </g>
          <g className="signal-cartography__connections" aria-hidden="true">
            {Array.from(nodeById.values()).flatMap((node) =>
              node.connections
                .filter((neighborId) => node.id.localeCompare(neighborId) < 0)
                .map((neighborId) => {
                  const neighbor = nodeById.get(neighborId);
                  if (!neighbor) return null;
                  const key = [node.id, neighbor.id].sort().join("|");
                  const selected = routeEdges.has(key);
                  return (
                    <line
                      key={key}
                      data-from-sector-id={node.id}
                      data-to-sector-id={neighbor.id}
                      x1={node.x * WIDTH}
                      y1={node.y * HEIGHT}
                      x2={neighbor.x * WIDTH}
                      y2={neighbor.y * HEIGHT}
                      className={selected ? "is-route" : ""}
                    />
                  );
                })
            )}
          </g>
          <g className="signal-cartography__nodes">
            {BOARD_SPACES.map((space) => {
              const node = nodeById.get(space.id);
              if (!node) return null;
              const x = node.x * WIDTH;
              const y = node.y * HEIGHT;
              const dimensions = nodeDimensions(space.tier);
              const [lineOne, lineTwo] = splitLabel(space.name);
              const isActive = space.id === activeSectorId;
              const isLegal = legalDestinationIds.has(space.id);
              const isRoute = route.includes(space.id);
              const innerStep = innerApproach?.steps.find((step) => step.sectorId === space.id);
              const publicSector = publicSectorById.get(space.id);
              const threats = publicSector?.threatIcons ?? space.threatIcons;
              const recurring = publicSector?.tileChallenges?.[0];
              const directStat = recurring?.testStat ?? space.textBox.test?.stats[0] ?? null;
              const persistentFixture =
                (fixture === "challenge" && space.id === "black-relay-spire") ||
                persistentSectorIds.has(space.id);
              const nodeClass = [
                space.tier === "center" ? "is-core" : "",
                isActive ? "is-active" : "",
                isLegal ? "is-legal" : "",
                isRoute ? "is-route" : "",
                innerStep?.status === "cleared" ? "is-inner-cleared" : "",
                innerStep?.status === "current" ? "is-inner-current" : "",
                innerStep?.status === "boss" ? "is-inner-boss" : "",
                persistentFixture ? "has-persistent" : ""
              ].filter(Boolean).join(" ");

              return (
                <g
                  key={space.id}
                  className={nodeClass}
                  data-sector-id={space.id}
                  transform={`translate(${x} ${y})`}
                  aria-label={`${space.name}, ${tierLabels[space.tier]}, printed threats: ${threats.join(", ") || "none"}`}
                >
                  <rect
                    x={-dimensions.width / 2}
                    y={-dimensions.height / 2}
                    width={dimensions.width}
                    height={dimensions.height}
                    rx="48"
                    className="signal-cartography__node-art"
                    fill={`url(#cartography-art-${space.id})`}
                  />
                  <rect
                    x={-dimensions.width / 2}
                    y={-6}
                    width={dimensions.width}
                    height={58}
                    rx="12"
                    className="signal-cartography__node-plate"
                  />
                  <path
                    d={`M ${-dimensions.width / 2 + 6} ${dimensions.height / 2 - 5} H ${dimensions.width / 2 - 6}`}
                    className="signal-cartography__node-edge"
                  />
                  <text className="signal-cartography__node-name" textAnchor="middle" y={lineTwo ? 11 : 20}>
                    <tspan x="0">{lineOne}</tspan>
                    {lineTwo ? <tspan x="0" dy="18">{lineTwo}</tspan> : null}
                  </text>
                  <g className="signal-cartography__threats" aria-label="Printed threats" transform={`translate(${-(threats.length - 1) * 14} 44)`}>
                    {threats.map((icon, index) => (
                      <g data-threat-lane={icon} key={`${space.id}-${icon}-${index}`} transform={`translate(${index * 28} 0)`}>
                      <title>{icon} printed threat</title>
                      <path
                        key={`${space.id}-${icon}-${index}`}
                        d="M 0 -10 L 10 0 L 0 10 L -10 0 Z"
                        fill={threatColors[icon]}
                      />
                      <text textAnchor="middle" y="4" className="signal-cartography__threat-letter">{icon[0]!.toUpperCase()}</text>
                      </g>
                    ))}
                  </g>
                  {directStat ? (
                    <g
                      className="signal-cartography__challenge"
                      transform={`translate(${dimensions.width / 2 - 13} ${-dimensions.height / 2 + 13})`}
                    >
                      <circle r="8" fill={statColors[directStat]} />
                      <path d="M -4 2 L 0 -5 L 4 2 L 0 6 Z" fill="#091012" />
                    </g>
                  ) : null}
                  {persistentFixture ? (
                    <g className="signal-cartography__persistent" transform={`translate(${dimensions.width / 2 - 14} ${dimensions.height / 2 - 12})`}>
                      <circle r="10" />
                      <path d="M -5 0 H 5 M 0 -5 V 5" />
                    </g>
                  ) : null}
                  {occupants.has(space.id) ? (
                    <PieceCluster occupants={occupants.get(space.id)!} x={0} y={-26} />
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        <aside className="signal-cartography__reach-key" aria-label="Reach legend">
          {(["outer", "middle", "inner", "center"] as const).map((tier, index) => (
            <div key={tier}><span>{index + 1}</span><strong>{tierLabels[tier]}</strong></div>
          ))}
        </aside>
        <aside className="signal-cartography__legend" aria-label="Map symbol legend">
          <div><i className="is-active" />Active sector</div>
          <div><i className="is-route" />Selected route</div>
          <div><i className="is-legal" />Legal destination</div>
          <div><i className="is-persistent" />Revealed encounter</div>
          {innerApproach ? <div><i className="is-inner-cleared" />Cleared inner trial</div> : null}
          <div className="signal-cartography__legend-threats">
            <b style={{ "--legend-color": threatColors.red } as CSSProperties}>R</b>
            <b style={{ "--legend-color": threatColors.blue } as CSSProperties}>B</b>
            <b style={{ "--legend-color": threatColors.yellow } as CSSProperties}>Y</b>
            Printed Threats
          </div>
        </aside>
      </section>

      <footer className="signal-cartography__footer">
        <span>
          {fixture === "live" && patch?.payload.hostView?.requester
            ? `Requested by ${patch.payload.hostView.requester.displayName}`
            : "Requested from the Movement screen"}
        </span>
        <strong>Encounter detected → Signal Theatre returns automatically</strong>
        <span>{innerApproach ? "One cleared inner step per turn" : "49 sectors · authoritative routes"}</span>
      </footer>
    </main>
  );
}
