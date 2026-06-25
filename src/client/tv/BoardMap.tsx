import { useEffect, useMemo, useState, type ReactElement } from "react";
import { getAssetPath } from "../../game/assets/design/assetManifest.js";
import { BOARD_SPACES, getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import type { OutcomeSummary, PublicPatchPayload } from "../shared/types.js";
import {
  buildEscalationMarker,
  buildScenarioAuras,
  buildScenarioMarkers,
  buildScenarioRoutes,
  type ScenarioAuraEffect,
  type ScenarioMarker,
  type ScenarioRouteEffect
} from "../shared/scenarioBoardVisuals.js";
import { BoardStage } from "./BoardStage.js";
import { pointerToBoardCoordinate, type BoardRect } from "./boardGeometry.js";
import { TalismanBoardSurface } from "./TalismanBoardSurface.js";

interface BoardMapProps {
  patch: PublicPatchPayload;
  phase: string;
  showHeader?: boolean;
  showSidebar?: boolean;
}

interface BoardToken {
  id: string;
  color: string;
  left: number;
  top: number;
  seatId: string;
  label: string;
  sectorId: string;
}

interface CalibrationPoint {
  x: number;
  y: number;
}

const tokenOffsets = [
  { x: 0, y: -18 },
  { x: 18, y: 0 },
  { x: 0, y: 18 },
  { x: -18, y: 0 }
] as const;

function getInitials(label: string): string {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || label.slice(0, 2).toUpperCase();
}

function getSeatColor(index: number): string {
  const palette = ["#7fb2d8", "#d9a35d", "#d86f6f", "#7cc3a6", "#dfd8c5", "#a98fd1"];
  return palette[index % palette.length];
}

function uniqueEdges(nodes: BoardNode[]): Array<{ from: string; to: string }> {
  const seen = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  nodes.forEach((node) => {
    node.connections.forEach((target) => {
      const key = [node.id, target].sort().join("::");

      if (seen.has(key) || !RIFTFALL_BOARD_NODE_INDEX.has(target)) {
        return;
      }

      seen.add(key);
      edges.push({ from: node.id, to: target });
    });
  });

  return edges;
}

function outcomeText(outcome: OutcomeSummary | null): string | null {
  if (!outcome?.encounterTitle) {
    return null;
  }

  if (outcome.success === true) {
    return `${outcome.encounterTitle} resolved successfully.`;
  }

  if (outcome.success === false) {
    return `${outcome.encounterTitle} ended in a setback.`;
  }

  return `${outcome.encounterTitle} is unresolved.`;
}

function buildBoardTokens(patch: PublicPatchPayload, imageRect: BoardRect): BoardToken[] {
  const seatIndex = new Map(patch.seats.map((seat, index) => [seat.seatId, index] as const));
  const groupedBySector = new Map<string, typeof patch.players>();

  patch.players.forEach((player) => {
    const existing = groupedBySector.get(player.sectorId);

    if (existing) {
      existing.push(player);
      return;
    }

    groupedBySector.set(player.sectorId, [player]);
  });

  const tokens: BoardToken[] = [];

  groupedBySector.forEach((players, sectorId) => {
    const node = RIFTFALL_BOARD_NODE_INDEX.get(sectorId);

    if (!node) {
      return;
    }

    const baseLeft = imageRect.left + node.x * imageRect.width;
    const baseTop = imageRect.top + node.y * imageRect.height;

    players.forEach((player, index) => {
      const offset = tokenOffsets[index % tokenOffsets.length] ?? tokenOffsets[0];
      const orbitMultiplier = Math.floor(index / tokenOffsets.length) + 1;
      const seat = patch.seats.find((entry) => entry.seatId === player.seatId);

      tokens.push({
        id: player.character.id,
        color: getSeatColor(seatIndex.get(player.seatId) ?? index),
        left: baseLeft + offset.x * orbitMultiplier,
        top: baseTop + offset.y * orbitMultiplier,
        seatId: player.seatId,
        label: seat?.displayName ?? player.character.name,
        sectorId
      });
    });
  });

  return tokens;
}

export function BoardMap({ patch, phase, showHeader = true, showSidebar = true }: BoardMapProps): ReactElement {
  const boardAssetPath = getAssetPath("full_board_main");
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => RIFTFALL_BOARD_NODES[0]?.id ?? "");
  const [calibrationPoint, setCalibrationPoint] = useState<CalibrationPoint | null>(null);
  const [calibrationNodeId, setCalibrationNodeId] = useState<string>(() => RIFTFALL_BOARD_NODES[0]?.id ?? "");
  const boardDebugEnabled =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("boardDebug") === "1";

  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const activePlayer = patch.players.find((player) => player.seatId === activeSeatId) ?? null;
  const activeSectorId = activePlayer?.sectorId ?? null;
  const activeNodeId = activeSectorId && RIFTFALL_BOARD_NODE_INDEX.has(activeSectorId) ? activeSectorId : null;

  useEffect(() => {
    if (activeNodeId) {
      setSelectedNodeId(activeNodeId);
    }
  }, [activeNodeId]);

  const sectorsById = useMemo(() => new Map(patch.sectors.map((sector) => [sector.id, sector] as const)), [patch.sectors]);
  const legalTargetIds = useMemo(
    () => (phase === "navigation" && activeSectorId ? new Set(sectorsById.get(activeSectorId)?.neighbors ?? []) : new Set<string>()),
    [activeSectorId, phase, sectorsById]
  );
  const selectedNode = RIFTFALL_BOARD_NODE_INDEX.get(selectedNodeId) ?? RIFTFALL_BOARD_NODES[0];
  const selectedBoardSpace = selectedNode ? getBoardSpace(selectedNode.id) : null;
  const selectedSector = selectedNode ? sectorsById.get(selectedNode.id) ?? null : null;
  const selectedOccupants = selectedNode ? patch.players.filter((player) => player.sectorId === selectedNode.id) : [];
  const selectedGateRules =
    selectedBoardSpace?.movementRequirements?.map((requirement) => {
      const parts = [
        requirement.allowedFrom?.length
          ? `From ${requirement.allowedFrom.map((entry) => getBoardSpace(entry)?.name ?? entry).join(" or ")}`
          : null,
        requirement.requiredNotes?.length ? `Needs ${requirement.requiredNotes.join(", ")}` : null
      ].filter((entry): entry is string => Boolean(entry));

      return parts.length > 0 ? parts.join(" | ") : requirement.errorMessage;
    }) ?? [];
  const selectedActionFocus = selectedNode
    ? isScenarioConfrontationSpace(selectedNode.id)
      ? `Scenario confrontation space | ${patch.activeScenario?.confrontationTitle ?? "Core breach"}`
      : selectedBoardSpace?.textBox.choices?.length
        ? `Choice-driven sector text | ${selectedBoardSpace.textBox.choices.map((choice) => choice.label).join(" | ")}`
        : selectedBoardSpace?.textBox.title ?? "Sector telemetry"
    : "Sector telemetry";
  const staticEdges = uniqueEdges(RIFTFALL_BOARD_NODES);
  const scenarioMarkers = buildScenarioMarkers(patch);
  const escalationMarker = buildEscalationMarker(patch);
  const scenarioAuras = buildScenarioAuras(patch);
  const scenarioRoutes = buildScenarioRoutes(patch);

  const calibrationExport = useMemo(
    () =>
      JSON.stringify(
        RIFTFALL_BOARD_NODES.map((node) =>
          node.id === calibrationNodeId && calibrationPoint
            ? {
                ...node,
                x: Number(calibrationPoint.x.toFixed(4)),
                y: Number(calibrationPoint.y.toFixed(4))
              }
            : node
        ),
        null,
        2
      ),
    [calibrationNodeId, calibrationPoint]
  );

  return (
    <section className="tv-board-panel" aria-label="Tactical campaign board">
      {showHeader && (
        <div className="tv-board-panel-header">
          <div>
            <h2>Tactical Campaign Board</h2>
            <p>Track routes, threat pressure, and team positioning from the command table.</p>
          </div>
        </div>
      )}

      <div className="tv-board-shell">
        <BoardStage
          imageAlt="Tactical campaign board"
          imageSrc={boardAssetPath}
          imageMode="geometry-only"
          onPointerDown={
            boardDebugEnabled
              ? (event, imageRect) => {
                  const coordinate = pointerToBoardCoordinate(event.nativeEvent.offsetX, event.nativeEvent.offsetY, imageRect);

                  if (!coordinate) {
                    return;
                  }

                  setCalibrationPoint(coordinate);
                }
              : undefined
          }
        >
          {({ imageRect }) => {
            const tokens = buildBoardTokens(patch, imageRect);
            const markerSize = Math.max(26, Math.min(46, imageRect.width * 0.028));

            return (
              <>
                <TalismanBoardSurface
                  imageRect={imageRect}
                  activeNodeId={activeSectorId}
                  selectedNodeId={selectedNodeId}
                  legalTargetIds={legalTargetIds}
                  debugEnabled={boardDebugEnabled}
                />
                <svg className="board-route-overlay" aria-hidden="true">
                  {scenarioRoutes.map((effect) => {
                    const from = RIFTFALL_BOARD_NODE_INDEX.get(effect.fromNodeId);
                    const to = RIFTFALL_BOARD_NODE_INDEX.get(effect.toNodeId);

                    if (!from || !to) {
                      return null;
                    }

                    return (
                      <line
                        key={effect.id}
                        data-testid={`scenario-route-${effect.id}`}
                        className={`board-route board-route-scenario board-route-scenario-${effect.tone}`}
                        x1={imageRect.left + from.x * imageRect.width}
                        y1={imageRect.top + from.y * imageRect.height}
                        x2={imageRect.left + to.x * imageRect.width}
                        y2={imageRect.top + to.y * imageRect.height}
                      />
                    );
                  })}
                  {staticEdges.map((edge) => {
                    const from = RIFTFALL_BOARD_NODE_INDEX.get(edge.from);
                    const to = RIFTFALL_BOARD_NODE_INDEX.get(edge.to);

                    if (!from || !to) {
                      return null;
                    }

                    return (
                      <line
                        key={`${edge.from}-${edge.to}`}
                        data-testid="sector-connector"
                        className={`board-route board-route-${from.ring}`}
                        x1={imageRect.left + from.x * imageRect.width}
                        y1={imageRect.top + from.y * imageRect.height}
                        x2={imageRect.left + to.x * imageRect.width}
                        y2={imageRect.top + to.y * imageRect.height}
                      />
                    );
                  })}
                </svg>

                {RIFTFALL_BOARD_NODES.map((node) => {
                  const boardSpace = getBoardSpace(node.id);
                  const liveSector = sectorsById.get(node.id) ?? null;
                  const occupantCount = patch.players.filter((player) => player.sectorId === node.id).length;
                  const isSelected = selectedNodeId === node.id;
                  const isActive = activeSectorId === node.id;
                  const isLegalTarget = legalTargetIds.has(node.id);
                  const isGated = Boolean(boardSpace?.movementRequirements?.length);
                  const left = imageRect.left + node.x * imageRect.width;
                  const top = imageRect.top + node.y * imageRect.height;
                  const boardSpaceLabel = [
                    node.label,
                    `${node.ring} space`,
                    isActive ? "current location" : null,
                    isLegalTarget ? "legal move" : null,
                    isSelected ? "selected" : null,
                    isGated ? "gated entry" : null
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <button
                      key={node.id}
                      type="button"
                      data-testid={`sector-node-${node.id}`}
                      data-sector-id={node.id}
                      data-legal-target={isLegalTarget ? "true" : "false"}
                      className={[
                        "board-node-marker",
                        `board-node-marker-${node.ring}`,
                        isSelected ? "board-node-selected" : "",
                        isActive ? "board-node-active" : "",
                        isLegalTarget ? "board-node-legal-target" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${markerSize}px`,
                        height: `${markerSize}px`
                      }}
                      aria-label={boardSpaceLabel}
                      aria-current={isActive ? "location" : undefined}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      <span className="board-node-core" />
                      <span className="board-node-label" aria-hidden="true">
                        {node.label}
                      </span>
                      <span className="board-node-threat" aria-hidden="true">
                        {boardSpace?.threatIcons.length ?? liveSector?.danger ?? 0}
                      </span>
                      {occupantCount > 0 && <span className="board-node-occupants">{occupantCount}</span>}
                    </button>
                  );
                })}

                <div className="board-token-layer" aria-label="Seat markers">
                  {tokens.map((token) => (
                    <div
                      key={`${token.seatId}-${token.id}`}
                      data-testid={`token-${token.seatId}`}
                      data-sector-id={token.sectorId}
                      className="board-player-token"
                      title={token.label}
                      style={{
                        left: `${token.left}px`,
                        top: `${token.top}px`,
                        ["--token-fill" as string]: token.color
                      }}
                    >
                      <span>{getInitials(token.label)}</span>
                    </div>
                  ))}
                </div>

                <div className="board-scenario-layer" aria-label="Scenario markers">
                  {scenarioAuras.map((effect) => {
                    const node = RIFTFALL_BOARD_NODE_INDEX.get(effect.nodeId);

                    if (!node) {
                      return null;
                    }

                    const left = imageRect.left + node.x * imageRect.width;
                    const top = imageRect.top + node.y * imageRect.height;

                    return (
                      <div
                        key={effect.id}
                        data-testid={`scenario-aura-${effect.id}`}
                        data-sector-id={effect.nodeId}
                        className={`board-scenario-aura board-scenario-aura-${effect.variant} board-scenario-aura-${effect.tone}`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`
                        }}
                      />
                    );
                  })}

                  {[...scenarioMarkers, escalationMarker].map((marker) => {
                    const node = marker.nodeId ? RIFTFALL_BOARD_NODE_INDEX.get(marker.nodeId) : null;
                    const left = imageRect.left + (marker.x ?? node?.x ?? 0.5) * imageRect.width;
                    const top = imageRect.top + (marker.y ?? node?.y ?? 0.5) * imageRect.height;

                    return (
                      <div
                        key={marker.id}
                        data-testid={`scenario-marker-${marker.id}`}
                        data-sector-id={marker.nodeId}
                        className={`board-scenario-marker board-scenario-marker-${marker.kind} board-scenario-marker-${marker.tone}`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`
                        }}
                      >
                        <span>{marker.label}</span>
                        <strong>{marker.value}</strong>
                      </div>
                    );
                  })}
                </div>

                {boardDebugEnabled && calibrationPoint && (
                  <div
                    className="board-debug-point"
                    aria-hidden="true"
                    style={{
                      left: `${imageRect.left + calibrationPoint.x * imageRect.width}px`,
                      top: `${imageRect.top + calibrationPoint.y * imageRect.height}px`
                    }}
                  />
                )}
              </>
            );
          }}
        </BoardStage>

        {showSidebar && (
          <aside className="tv-board-sidebar">
            <section className="tv-board-sidebar-card">
              <div className="tv-card-header">
                <h3>Sector Brief</h3>
                <span className="board-sidebar-ring">{selectedNode?.ring ?? "outer"}</span>
              </div>
              <p className="board-sidebar-title">{selectedNode?.label ?? "Unknown node"}</p>
              <p className="tv-empty-copy">
                {selectedBoardSpace?.textBox.text ?? "No board-space text available for this marker yet."}
              </p>
              <div className="board-sidebar-meta">
                <span>Threat {selectedBoardSpace?.threatIcons.length ?? selectedSector?.danger ?? 0}</span>
                <span>Occupants {selectedOccupants.length}</span>
                {selectedSector && <span>Region {selectedSector.regionTier}</span>}
              </div>
              <div className="board-sidebar-meta">
                <span>{selectedActionFocus}</span>
              </div>
              {selectedBoardSpace?.textBox.choices && selectedBoardSpace.textBox.choices.length > 0 && (
                <div className="board-sidebar-meta">
                  {selectedBoardSpace.textBox.choices.map((choice) => (
                    <span key={choice.id}>{choice.label}</span>
                  ))}
                </div>
              )}
              {selectedGateRules.length > 0 && (
                <div className="tv-scenario-rules-block">
                  <strong>Entry Rules</strong>
                  {selectedGateRules.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              )}
              {selectedBoardSpace?.movementBox && <p className="board-sidebar-note">{selectedBoardSpace.movementBox.title}</p>}
              {patch.outcomeSummary?.movedToSectorId === selectedNode?.id && (
                <p className="board-sidebar-note">{outcomeText(patch.outcomeSummary)}</p>
              )}
              {selectedOccupants.length > 0 && (
                <ul className="board-sidebar-list">
                  {selectedOccupants.map((player) => {
                    const seat = patch.seats.find((entry) => entry.seatId === player.seatId);

                    return (
                      <li key={player.seatId}>
                        {seat?.displayName ?? player.character.name} | Heat {player.character.heat} | Wounds {player.character.wounds}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {boardDebugEnabled && (
              <section className="tv-board-sidebar-card board-debug-card">
                <div className="tv-card-header">
                  <h3>Calibration</h3>
                </div>
                <label className="field">
                  <span>Node</span>
                  <select value={calibrationNodeId} onChange={(event) => setCalibrationNodeId(event.target.value)}>
                    {RIFTFALL_BOARD_NODES.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="tv-empty-copy">
                  Click the board to capture normalized coordinates. Current click:
                  {" "}
                  {calibrationPoint ? `${calibrationPoint.x.toFixed(4)}, ${calibrationPoint.y.toFixed(4)}` : "none"}
                </p>
                <textarea className="board-debug-export" readOnly value={calibrationExport} />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(calibrationExport);
                  }}
                >
                  Copy JSON
                </button>
              </section>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
