import type { ReactElement } from "react";
import { getAssetPath } from "../../game/assets/design/assetManifest.js";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import type { PublicPatchPayload } from "../shared/types.js";
import { BoardMap } from "./BoardMap.js";
import { BoardStage } from "./BoardStage.js";

interface TacticalMapBoardProps {
  patch: PublicPatchPayload | null;
  phase: string;
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

function StaticTacticalBoard(): ReactElement {
  const boardAssetPath = getAssetPath("full_board_main");
  const staticEdges = uniqueEdges(RIFTFALL_BOARD_NODES);

  return (
    <section className="tv-board-panel tv-board-panel-static" aria-label="Tactical campaign board">
      <div className="tv-board-shell">
        <BoardStage imageAlt="Tactical campaign board" imageSrc={boardAssetPath}>
          {({ imageRect }) => {
            const markerSize = Math.max(26, Math.min(44, imageRect.width * 0.028));

            return (
              <>
                <svg className="board-route-overlay" aria-hidden="true">
                  {staticEdges.map((edge) => {
                    const from = RIFTFALL_BOARD_NODE_INDEX.get(edge.from);
                    const to = RIFTFALL_BOARD_NODE_INDEX.get(edge.to);

                    if (!from || !to) {
                      return null;
                    }

                    return (
                      <line
                        key={`${edge.from}-${edge.to}`}
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
                  const left = imageRect.left + node.x * imageRect.width;
                  const top = imageRect.top + node.y * imageRect.height;

                  return (
                    <div
                      key={node.id}
                      className={`board-node-marker board-node-marker-${node.ring} board-node-marker-static`}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${markerSize}px`,
                        height: `${markerSize}px`
                      }}
                    >
                      <span className="board-node-core" />
                      <span className="board-node-label">{node.label}</span>
                    </div>
                  );
                })}
              </>
            );
          }}
        </BoardStage>
      </div>
    </section>
  );
}

export function TacticalMapBoard({ patch, phase }: TacticalMapBoardProps): ReactElement {
  if (!patch) {
    return <StaticTacticalBoard />;
  }

  return <BoardMap patch={patch} phase={phase} showHeader={false} showSidebar={false} />;
}
