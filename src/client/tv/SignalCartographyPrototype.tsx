import { useMemo, type CSSProperties, type ReactElement } from "react";
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

interface BoardConnection {
  fromSectorId: string;
  toSectorId: string;
  special: boolean;
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
const HEIGHT = 900;
const BOARD_CELL_WIDTH = 130;
const BOARD_CELL_HEIGHT = 100;
const BOARD_WIDTH = BOARD_CELL_WIDTH * 7;
const BOARD_HEIGHT = BOARD_CELL_HEIGHT * 7;
const BOARD_TILE_CENTER_X = BOARD_CELL_WIDTH / 2;
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
const boardTierMarkers: Array<{
  tier: BoardTier;
  label: string;
  count: number;
  x: number;
  y: number;
}> = [
  { tier: "outer", label: "OUTER REACH", count: 24, x: 22, y: 5 },
  { tier: "middle", label: "MIDDLE REACH", count: 16, x: BOARD_CELL_WIDTH + 22, y: BOARD_CELL_HEIGHT + 5 },
  { tier: "inner", label: "INNER REACH", count: 8, x: BOARD_CELL_WIDTH * 2 + 22, y: BOARD_CELL_HEIGHT * 2 + 5 },
  { tier: "center", label: "CORE", count: 1, x: BOARD_CELL_WIDTH * 3 + 22, y: BOARD_CELL_HEIGHT * 3 + 5 }
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
const BOARD_CONNECTIONS: BoardConnection[] = RIFTFALL_BOARD_NODES.flatMap((node) =>
  node.connections
    .filter((neighborId) => node.id.localeCompare(neighborId) < 0)
    .map((neighborId) => {
      const from = BOARD_TILE_INDEX.get(node.id);
      const to = BOARD_TILE_INDEX.get(neighborId);
      const isAdjacent = Boolean(
        from &&
        to &&
        Math.abs(from.row - to.row) + Math.abs(from.column - to.column) === 1
      );

      return {
        fromSectorId: node.id,
        toSectorId: neighborId,
        special: !isAdjacent
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
  if (value.length <= 18) return [value];
  const words = value.split(" ");
  let first = "";
  while (words.length > 0 && `${first} ${words[0]}`.trim().length <= 18) {
    first = `${first} ${words.shift()}`.trim();
  }
  return [first || value.slice(0, 18), words.join(" ") || undefined];
}

function wrapBoardLabel(value: string): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = `${current} ${word}`.trim();
    if (candidate.length <= 20 || current.length === 0) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);

  if (lines.length <= 3) return lines;
  return [lines[0]!, lines[1]!, `${lines.slice(2).join(" ").slice(0, 14)}…`];
}

function nodeDimensions(tier: BoardTier): { width: number; height: number } {
  if (tier === "center") return { width: 180, height: 76 };
  if (tier === "inner") return { width: 118, height: 46 };
  if (tier === "middle") return { width: 148, height: 56 };
  return { width: 142, height: 54 };
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
  const bySector = new Map<string, MapOccupant[]>();
  patch.payload.players.forEach((player, index) => {
    const seatIndex = patch.payload.seats.findIndex((seat) => seat.seatId === player.seatId);
    const seat = seatIndex >= 0 ? patch.payload.seats[seatIndex] : undefined;
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
        const angle = (Math.PI * 2 * index) / Math.max(visible.length, 1) - Math.PI / 2;
        const radius = visible.length > 1 ? 20 : 0;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        return (
          <g key={occupant.seatId} transform={`translate(${px} ${py})`}>
            <circle r="13" fill="#080b0d" stroke={occupant.color} strokeWidth="4" />
            <path d="M -7 4 L 0 -8 L 7 4 Z" fill={occupant.color} opacity=".88" />
            <text y="20" textAnchor="middle">{occupant.initials}</text>
          </g>
        );
      })}
    </g>
  );
}

function getCartographyChallenge(
  patch: StatePatch<PublicPatchPayload> | null,
  fixture: SignalCartographyFixture,
  space: BoardSpaceDefinition
): CartographyChallengeSummary | null {
  if (fixture === "challenge" && space.id === "ashen-chapel") {
    return fixtureChallenge;
  }

  const publicChallenge: PublicTileChallenge | undefined = patch?.payload.sectors
    .find((sector) => sector.id === space.id)
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

function boardConnectionPath(from: SignalCartographyTilePosition, to: SignalCartographyTilePosition): string {
  const x1 = from.column * BOARD_CELL_WIDTH + BOARD_TILE_CENTER_X;
  const y1 = from.row * BOARD_CELL_HEIGHT + BOARD_CELL_HEIGHT / 2;
  const x2 = to.column * BOARD_CELL_WIDTH + BOARD_TILE_CENTER_X;
  const y2 = to.row * BOARD_CELL_HEIGHT + BOARD_CELL_HEIGHT / 2;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const isAdjacent =
    Math.abs(from.row - to.row) + Math.abs(from.column - to.column) === 1;

  if (isAdjacent) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const midpointX = (x1 + x2) / 2;
  const midpointY = (y1 + y2) / 2;
  const normalX = distance === 0 ? 0 : -(y2 - y1) / distance;
  const normalY = distance === 0 ? 0 : (x2 - x1) / distance;
  const bend = Math.min(34, distance * 0.08);
  return `M ${x1} ${y1} Q ${midpointX + normalX * bend} ${midpointY + normalY * bend} ${x2} ${y2}`;
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

function BoardPieceCluster({
  occupants
}: {
  occupants: MapOccupant[];
}): ReactElement {
  const count = Math.min(occupants.length, 6);
  const spacing = count > 1 ? Math.min(14, 68 / (count - 1)) : 0;
  const startX = BOARD_TILE_CENTER_X - (spacing * (count - 1)) / 2;

  return (
    <g
      className="signal-cartography__board-pieces"
      aria-label={`Operatives: ${occupants.map((entry) => entry.initials).join(", ")}`}
    >
      {occupants.slice(0, 6).map((occupant, index) => (
        <g key={occupant.seatId} transform={`translate(${startX + index * spacing} 68.5)`}>
          <circle className="signal-cartography__board-player-coin-ring" r="11.2" fill="#080b0d" stroke={occupant.color} strokeWidth="2.2" />
          <image
            className="signal-cartography__board-player-coin"
            href={getCartographyPlayerCoinPath(occupant.markerId)}
            x="-10"
            y="-10"
            width="20"
            height="20"
            preserveAspectRatio="xMidYMid meet"
            data-player-coin={occupant.markerId}
          />
        </g>
      ))}
    </g>
  );
}

function BoardTileBase({
  position,
  space,
  stateClass
}: {
  position: SignalCartographyTilePosition;
  space: BoardSpaceDefinition;
  stateClass: string;
}): ReactElement {
  return (
    <g
      className={`signal-cartography__board-tile-base ${stateClass}`}
      data-surface="neutral"
      data-tier={space.tier}
      transform={`translate(${position.column * BOARD_CELL_WIDTH} ${position.row * BOARD_CELL_HEIGHT})`}
      aria-hidden="true"
    >
      <image
        className="signal-cartography__board-tile-art"
        href={getSignalCartographySectorArtPath(space.id)}
        x="2"
        y="2"
        width={BOARD_CELL_WIDTH - 4}
        height="96"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#signal-board-tile-clip)"
      />
      <path className="signal-cartography__board-tile-tint" d="M 8 2 H 122 L 128 8 V 92 L 122 98 H 8 L 2 92 V 8 Z" />
      <path className="signal-cartography__board-tile-vignette" d="M 8 2 H 122 L 128 8 V 92 L 122 98 H 8 L 2 92 V 8 Z" />
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
  stateClass
}: {
  position: SignalCartographyTilePosition;
  space: BoardSpaceDefinition;
  occupants: MapOccupant[];
  challenge: CartographyChallengeSummary | null;
  persistent: boolean;
  missionTarget: boolean;
  missionObjectiveCoinId?: CartographyObjectiveCoinId;
  stateClass: string;
}): ReactElement {
  const lines = wrapBoardLabel(space.name);
  const lineHeight = 11;
  const firstLineY = 49 - ((lines.length - 1) * lineHeight) / 2;
  const threatWidth = space.threatIcons.length > 0 ? (BOARD_CELL_WIDTH - 4) / space.threatIcons.length : BOARD_CELL_WIDTH - 4;
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
      role="group"
      aria-label={accessibleDetails}
    >
      <path className="signal-cartography__board-tile-frame" d="M 8 2 H 122 L 128 8 V 92 L 122 98 H 8 L 2 92 V 8 Z" />
      {isGate ? (
        <>
          <path className="signal-cartography__board-gate-frame" d="M 10 6 H 120 L 124 10 V 90 L 120 94 H 10 L 6 90 V 10 Z" />
          <path className="signal-cartography__board-gate-diamond" d="M 121 4 L 126 9 L 121 14 L 116 9 Z" aria-label="Route or gate" />
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
      <rect className="signal-cartography__board-name-plate" x="7" y="30" width={BOARD_CELL_WIDTH - 14} height="38" />
      <text className="signal-cartography__board-name" textAnchor="middle">
        {lines.map((line, index) => (
          <tspan key={`${space.id}-label-${index}`} x={BOARD_TILE_CENTER_X} y={firstLineY + index * lineHeight}>{line}</tspan>
        ))}
      </text>
      {space.tags.includes("hazard") ? <BoardHazardGlyph /> : null}
      {challenge ? (
        <g
          className="signal-cartography__board-challenge"
          transform={`translate(${BOARD_CELL_WIDTH - 18} 15)`}
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
        <g className="signal-cartography__board-persistent" transform={`translate(${BOARD_CELL_WIDTH - 16} 67)`} aria-label="Revealed encounter">
          <circle r="9" />
          <path d="M -4 0 H 4 M 0 -4 V 4" />
        </g>
      ) : null}
      {occupants.length > 0 ? <BoardPieceCluster occupants={occupants} /> : null}
      <g className="signal-cartography__board-threat-band" aria-label={`${space.threatIcons.length} printed Threats`}>
        {space.threatIcons.length > 0 ? space.threatIcons.map((icon, index) => (
          <g key={`${space.id}-board-threat-${icon}-${index}`}>
            <rect
              x={2 + index * threatWidth}
              y="80"
              width={threatWidth}
              height="18"
              fill={threatColors[icon]}
              data-threat-lane={icon}
            />
            <BoardThreatGlyph icon={icon} x={2 + index * threatWidth + threatWidth / 2} y={89} />
          </g>
        )) : (
          <>
            <rect x="2" y="80" width={BOARD_CELL_WIDTH - 4} height="18" className="signal-cartography__board-no-threat" />
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
  const focusChallenge = getCartographyChallenge(patch, fixture, focusSpace);
  const focusPersistent =
    persistentSectorIds.has(focusSpace.id) ||
    (fixture === "challenge" && focusSpace.id === "black-relay-spire");
  const focusOccupants = occupants.get(focusSpace.id) ?? [];

  function isPersistentSector(sectorId: string): boolean {
    return persistentSectorIds.has(sectorId) || (fixture === "challenge" && sectorId === "black-relay-spire");
  }

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
      isPersistentSector(space.id) ? "has-persistent" : ""
    ].filter(Boolean).join(" ");
  }

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
          <span>Signal Cartography · board-tile prototype</span>
          <h1>The Reach, laid out for the table</h1>
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
            <svg
              className="signal-cartography__board-svg"
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              role="img"
              aria-labelledby="signal-board-title signal-board-desc"
            >
              <title id="signal-board-title">Ashen Reach nested public sector board</title>
              <desc id="signal-board-desc">
                Forty-nine neutral material sector tiles arranged across four clearly framed nested reaches. Red, Blue, and Yellow are confined to the printed Threat bands; hazards, challenges, routes, and public operative positions remain visible above the board.
              </desc>
              <defs>
                <clipPath id="signal-board-tile-clip">
                  <path d="M 8 2 H 122 L 128 8 V 92 L 122 98 H 8 L 2 92 V 8 Z" />
                </clipPath>
                <filter id="signal-board-active-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="signal-board-route-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect className="signal-cartography__board-bed" width={BOARD_WIDTH} height={BOARD_HEIGHT} />
              <g className="signal-cartography__board-tier-beds" aria-hidden="true">
                <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} className="is-outer" />
                <rect x={BOARD_CELL_WIDTH} y={BOARD_CELL_HEIGHT} width={BOARD_CELL_WIDTH * 5} height={BOARD_CELL_HEIGHT * 5} className="is-middle" />
                <rect x={BOARD_CELL_WIDTH * 2} y={BOARD_CELL_HEIGHT * 2} width={BOARD_CELL_WIDTH * 3} height={BOARD_CELL_HEIGHT * 3} className="is-inner" />
                <rect x={BOARD_CELL_WIDTH * 3} y={BOARD_CELL_HEIGHT * 3} width={BOARD_CELL_WIDTH} height={BOARD_CELL_HEIGHT} className="is-core" />
              </g>

              <g className="signal-cartography__board-tile-bases">
                {BOARD_TILE_LAYOUT.map((position) => {
                  const space = spaceById.get(position.sectorId);
                  if (!space) return null;
                  return (
                    <BoardTileBase
                      key={`${space.id}-base`}
                      position={position}
                      space={space}
                      stateClass={tileStateClass(space)}
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

              <g className="signal-cartography__board-special-links" aria-hidden="true">
                {BOARD_CONNECTIONS.filter((connection) => connection.special).map((connection) => {
                  const from = BOARD_TILE_INDEX.get(connection.fromSectorId);
                  const to = BOARD_TILE_INDEX.get(connection.toSectorId);
                  if (!from || !to) return null;
                  const key = [connection.fromSectorId, connection.toSectorId].sort().join("|");
                  return (
                    <path
                      key={`special-${key}`}
                      className={routeEdges.has(key) ? "is-route" : ""}
                      data-from-sector-id={connection.fromSectorId}
                      data-to-sector-id={connection.toSectorId}
                      d={boardConnectionPath(from, to)}
                    />
                  );
                })}
              </g>

              <g className="signal-cartography__board-route-links" aria-hidden="true">
                {route.slice(1).map((sectorId, index) => {
                  const from = BOARD_TILE_INDEX.get(route[index]!);
                  const to = BOARD_TILE_INDEX.get(sectorId);
                  if (!from || !to) return null;
                  return (
                    <path
                      key={`route-${route[index]}-${sectorId}`}
                      d={boardConnectionPath(from, to)}
                    />
                  );
                })}
              </g>

              <g className="signal-cartography__board-tile-overlays">
                {BOARD_TILE_LAYOUT.map((position) => {
                  const space = spaceById.get(position.sectorId);
                  if (!space) return null;
                  return (
                    <BoardTileOverlay
                      key={space.id}
                      position={position}
                      space={space}
                      occupants={occupants.get(space.id) ?? []}
                      challenge={getCartographyChallenge(patch, fixture, space)}
                      persistent={isPersistentSector(space.id)}
                      missionTarget={missionTargets?.sectorIds.has(space.id) ?? false}
                      missionObjectiveCoinId={missionTargets?.objectiveCoinId}
                      stateClass={tileStateClass(space)}
                    />
                  );
                })}
              </g>

              <g className="signal-cartography__board-tier-markers">
                {boardTierMarkers.map((marker) => (
                  <g
                    key={marker.tier}
                    className={`signal-cartography__board-tier-marker is-${marker.tier}`}
                    transform={`translate(${marker.x} ${marker.y})`}
                    role="group"
                    aria-label={`${marker.label}, ${marker.count} ${marker.count === 1 ? "tile" : "tiles"}`}
                  >
                    <rect width="86" height="15" />
                    <path d="M 0 15 H 79 L 86 8 V 0" />
                    <text x="43" y="10.5" textAnchor="middle">
                      {tierNumbers[marker.tier]} · {marker.label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          <aside className="signal-cartography__focus-panel" aria-label={`Focused sector: ${focusSpace.name}`}>
            <div className="signal-cartography__focus-art">
              <img src={getSignalCartographySectorArtPath(focusSpace.id)} alt="" />
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
              <span><i className="is-legal" />Legal destination</span>
              <span><i className="is-route" />Selected route</span>
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
        <strong>Outer 24 · Middle 16 · Inner 8 · Core 1</strong>
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
  const nodeById = useMemo(() => new Map(RIFTFALL_BOARD_NODES.map((node) => [node.id, node])), []);
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
  const routeEdges = new Set(
    route.slice(1).map((id, index) => [route[index]!, id].sort().join("|"))
  );
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
      className="signal-cartography"
      data-fixture={fixture}
      data-design="schematic"
      data-testid="signal-cartography-prototype"
      aria-label={fixture === "live" ? "Signal Cartography public map" : "Signal Cartography development prototype"}
    >
      <header className="signal-cartography__header">
        <div>
          <span>{fixture === "live" ? "Signal Cartography · public relay" : "Signal Cartography · prototype"}</span>
          <h1>The Reach, translated into routes</h1>
        </div>
        <div className="signal-cartography__status">
          <span className="signal-cartography__pulse" aria-hidden="true" />
          <strong>{cartographyStatusText(fixture, selectedDestination, innerApproach)}</strong>
          <small>Public information only</small>
        </div>
      </header>

      <section className="signal-cartography__frame" aria-label="49-sector public route schematic">
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
            {BOARD_SPACES.map((space) => (
              <pattern
                key={space.id}
                id={`cartography-art-${space.id}`}
                width="1"
                height="1"
                patternContentUnits="objectBoundingBox"
              >
                <image
                  href={getSignalCartographySectorArtPath(space.id)}
                  width="1"
                  height="1"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
          </defs>
          <rect width={WIDTH} height={HEIGHT} fill="url(#cartography-iris)" />
          <g className="signal-cartography__reach-lines" aria-hidden="true">
            <rect x="70" y="66" width="1460" height="768" rx="44" />
            <rect x="326" y="246" width="948" height="408" rx="34" />
            <rect x="518" y="344" width="564" height="212" rx="28" />
            <circle cx="800" cy="450" r="92" />
          </g>
          <g className="signal-cartography__connections" aria-hidden="true">
            {RIFTFALL_BOARD_NODES.flatMap((node) =>
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
              const recurring = patch?.payload.sectors
                .find((sector) => sector.id === space.id)
                ?.tileChallenges?.[0];
              const directStat = recurring?.testStat ?? space.textBox.test?.stats[0] ?? null;
              const persistentFixture =
                (fixture === "challenge" && space.id === "black-relay-spire") ||
                persistentSectorIds.has(space.id);
              const nodeClass = [
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
                  aria-label={`${space.name}, ${tierLabels[space.tier]}`}
                >
                  <rect
                    x={-dimensions.width / 2}
                    y={-dimensions.height / 2}
                    width={dimensions.width}
                    height={dimensions.height}
                    rx="9"
                    className="signal-cartography__node-art"
                    fill={`url(#cartography-art-${space.id})`}
                  />
                  <rect
                    x={-dimensions.width / 2}
                    y={-dimensions.height / 2}
                    width={dimensions.width}
                    height={dimensions.height}
                    rx="9"
                    className="signal-cartography__node-plate"
                  />
                  <path
                    d={`M ${-dimensions.width / 2 + 6} ${dimensions.height / 2 - 5} H ${dimensions.width / 2 - 6}`}
                    className="signal-cartography__node-edge"
                  />
                  <text className="signal-cartography__node-name" textAnchor="middle" y={lineTwo ? -4 : 3}>
                    <tspan x="0">{lineOne}</tspan>
                    {lineTwo ? <tspan x="0" dy="13">{lineTwo}</tspan> : null}
                  </text>
                  <g className="signal-cartography__threats" transform={`translate(${-dimensions.width / 2 + 12} ${dimensions.height / 2 - 8})`}>
                    {space.threatIcons.map((icon, index) => (
                      <path
                        key={`${space.id}-${icon}-${index}`}
                        d="M 0 -6 L 6 0 L 0 6 L -6 0 Z"
                        transform={`translate(${index * 15} 0)`}
                        fill={threatColors[icon]}
                      />
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
                    <PieceCluster occupants={occupants.get(space.id)!} x={0} y={-dimensions.height / 2 - 18} />
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
