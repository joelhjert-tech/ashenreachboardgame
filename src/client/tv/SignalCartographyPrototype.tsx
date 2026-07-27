import { useMemo, type CSSProperties, type ReactElement } from "react";
import { BOARD_SPACES, type BoardTier, type ThreatIcon } from "../../game/data/boardSpaces.js";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { getSignalCartographySectorArtPath } from "../shared/assetPaths.js";
import type {
  PublicInnerApproachState,
  PublicPatchPayload,
  Stat,
  StatePatch
} from "../shared/types.js";
import "./SignalCartographyPrototype.css";

export type SignalCartographyFixture = "live" | "route" | "challenge" | "dense" | "inner";

interface SignalCartographyPrototypeProps {
  patch: StatePatch<PublicPatchPayload> | null;
  fixture: SignalCartographyFixture;
}

interface MapOccupant {
  seatId: string;
  initials: string;
  color: string;
}

const WIDTH = 1600;
const HEIGHT = 900;
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
        : "outer_waymarket";
  result.set(
    target,
    Array.from({ length: fixture === "dense" ? 6 : 1 }, (_, index) => ({
      seatId: `seat-${index + 1}`,
      initials: ["JV", "SV", "OM", "IR", "KB", "TN"][index] ?? `P${index + 1}`,
      color: playerColors[index]!
    }))
  );
  return result;
}

function buildOccupants(
  patch: StatePatch<PublicPatchPayload> | null,
  fixture: SignalCartographyFixture
): Map<string, MapOccupant[]> {
  if (!patch?.payload.players.length) return buildFixtureOccupants(fixture);
  const bySector = new Map<string, MapOccupant[]>();
  patch.payload.players.forEach((player, index) => {
    const displayName =
      patch.payload.seats.find((seat) => seat.seatId === player.seatId)?.displayName ??
      player.character.name;
    const existing = bySector.get(player.sectorId) ?? [];
    existing.push({
      seatId: player.seatId,
      initials: initials(displayName),
      color: playerColors[index % playerColors.length]!
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

export function SignalCartographyPrototype({
  patch,
  fixture
}: SignalCartographyPrototypeProps): ReactElement {
  const nodeById = useMemo(() => new Map(RIFTFALL_BOARD_NODES.map((node) => [node.id, node])), []);
  const occupants = useMemo(() => buildOccupants(patch, fixture), [fixture, patch]);
  const selectedDestination = patch?.payload.movementPlanner?.destinations.find(
    (destination) => destination.sectorId === patch.payload.movementPlanner?.selectedDestinationId
  );
  const innerApproach = patch?.payload.innerApproach ?? (fixture === "inner" ? fixtureInnerApproach : null);
  const route = fixture === "live"
    ? selectedDestination?.route ?? innerApproach?.steps.map((step) => step.sectorId) ?? []
    : fixture === "route" ? fixtureRoute : [];
  const persistentSectorIds = new Set(
    patch?.payload.movementPlanner?.destinations
      .filter((destination) => destination.faceUpThreats.length > 0)
      .map((destination) => destination.sectorId) ?? []
  );
  const routeEdges = new Set(
    route.slice(1).map((id, index) => [route[index]!, id].sort().join("|"))
  );
  const activeSectorId =
    patch?.payload.players.find((player) => player.seatId === patch.payload.turnOrder[patch.payload.activeSeatIndex])?.sectorId ??
    (fixture === "dense"
      ? "ashen-chapel"
      : fixture === "route"
        ? "north-dock-bastion"
        : fixture === "inner"
          ? "inner_gate_of_cinders"
          : "outer_ember_sanctum");
  const legalDestinationIds = new Set(
    innerApproach?.options
      .filter((option) => !option.disabledReason)
      .map((option) => option.sectorId) ??
    patch?.payload.movementPlanner?.destinations
      .filter((destination) => !destination.disabledReason)
      .map((destination) => destination.sectorId) ??
    (fixture === "route" ? ["outer_waymarket", "coldwind-wharf"] : [])
  );

  return (
    <main
      className="signal-cartography"
      data-fixture={fixture}
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
          <strong>
            {fixture === "live"
              ? innerApproach
                ? `${innerApproach.pathLabel} · step ${innerApproach.currentIndex + 1}`
                : selectedDestination ? `Route to ${selectedDestination.name}` : "Movement survey"
              : fixture === "route"
                ? "Route planning"
                : fixture === "challenge"
                  ? "Challenge survey"
                  : fixture === "inner"
                    ? "Inner approach"
                    : "Six-operative density"}
          </strong>
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
