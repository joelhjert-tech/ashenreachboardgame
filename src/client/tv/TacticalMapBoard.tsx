import type { ReactElement } from "react";
import { getRuntimeAssetPath } from "../../game/assets/runtime/runtimeAssetManifest.js";
import type { PublicMoveDestination, PublicPatchPayload } from "../shared/types.js";
import { BoardMap } from "./BoardMap.js";
import { BoardStage } from "./BoardStage.js";
import { TalismanBoardSurface } from "./TalismanBoardSurface.js";

interface TacticalMapBoardProps {
  patch: PublicPatchPayload | null;
  previousPatch?: PublicPatchPayload | null;
  phase: string;
  onMovementDestinationSelected?: (destination: PublicMoveDestination | null) => void;
}

function StaticTacticalBoard(): ReactElement {
  const boardAssetPath = getRuntimeAssetPath("full_board_main");

  return (
    <section className="tv-board-panel tv-board-panel-static" aria-label="Tactical campaign board">
      <div className="tv-board-shell">
        <BoardStage imageAlt="Tactical campaign board" imageSrc={boardAssetPath} imageMode="geometry-only" geometryAspectRatio={16 / 9}>
          {({ imageRect }) => {
            return (
              <>
                <TalismanBoardSurface imageRect={imageRect} />
              </>
            );
          }}
        </BoardStage>
      </div>
    </section>
  );
}

export function TacticalMapBoard({ patch, previousPatch = null, phase, onMovementDestinationSelected }: TacticalMapBoardProps): ReactElement {
  if (!patch) {
    return <StaticTacticalBoard />;
  }

  return <BoardMap patch={patch} previousPatch={previousPatch} phase={phase} showHeader={false} showSidebar={false} onMovementDestinationSelected={onMovementDestinationSelected} />;
}
