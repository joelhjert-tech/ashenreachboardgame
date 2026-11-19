import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import type {
  PhoneTierTransitionOption,
  PublicInnerApproachState,
  PublicMoveDestination,
  PublicPatchPayload
} from "../shared/types.js";
import { PhoneTabletopMap } from "../tv/SignalCartographyPrototype.js";

export interface PhoneTabletopBoardProps {
  id: string;
  publicState?: Pick<PublicPatchPayload, "players" | "seats" | "sectors">;
  currentSectorId: string;
  currentSectorName: string;
  destinations?: PublicMoveDestination[];
  selectedDestination?: PublicMoveDestination;
  selectionDisabled?: boolean;
  innerApproach?: PublicInnerApproachState | null;
  tierTransitions?: PhoneTierTransitionOption[];
  onSelectSector?: (sectorId: string) => void;
}

export function PhoneTabletopBoard({
  id,
  publicState,
  currentSectorId,
  currentSectorName,
  destinations = [],
  selectedDestination,
  selectionDisabled,
  innerApproach,
  tierTransitions,
  onSelectSector
}: PhoneTabletopBoardProps): ReactElement {
  const [zoomed, setZoomed] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const active = viewport?.querySelector(".signal-cartography__board-tile.is-active");
    if (!viewport || !active || !zoomed) return;
    const { left, top, width, height } = active.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    viewport.scrollLeft += left - viewportRect.left + (width - viewport.clientWidth) / 2;
    viewport.scrollTop += top - viewportRect.top + (height - viewport.clientHeight) / 2;
  }, [currentSectorId, zoomed]);

  const moveOptions = destinations.filter((destination) => !destination.disabledReason || destination.voidKeyPrompt);
  const selectableDestinationIds = new Set(selectionDisabled ? [] : moveOptions.map((option) => option.sectorId));
  const legalDestinationIds = new Set(
    innerApproach
      ? innerApproach.options.filter((option) => !option.disabledReason).map((option) => option.sectorId)
      : [
          ...moveOptions.map((option) => option.sectorId),
          ...(tierTransitions ?? []).filter((option) => !option.disabledReason || option.voidKeyPrompt).map((option) => option.sectorId)
        ]
  );

  return (
    <section id={id} className="phone-tabletop-board" aria-label="Tabletop board">
      <div className="phone-tabletop-board__toolbar">
        <span>Current sector <strong>{currentSectorName}</strong></span>
        <button type="button" className="phone-button phone-button-secondary" onClick={() => setZoomed((value) => !value)}>
          {zoomed ? "Fit board" : "Zoom in"}
        </button>
      </div>
      <p className="phone-tabletop-board__hint">
        {zoomed ? "Drag to pan. " : ""}
        {selectableDestinationIds.size > 0
          ? "Tap a highlighted destination to preview its route."
          : onSelectSector ? "Use the movement controls below the board." : "Browse sectors and printed routes."}
      </p>
      <div className="phone-tabletop-board__viewport" data-zoomed={zoomed} ref={viewportRef}>
        <PhoneTabletopMap
          publicState={publicState}
          currentSectorId={currentSectorId}
          selectedSectorId={selectedDestination?.sectorId ?? null}
          legalDestinationIds={legalDestinationIds}
          selectableDestinationIds={selectableDestinationIds}
          persistentSectorIds={new Set(destinations.filter((destination) => destination.faceUpThreats.length > 0).map((destination) => destination.sectorId))}
          route={selectedDestination?.route ?? []}
          innerApproach={innerApproach ?? null}
          onSelectSector={onSelectSector}
        />
      </div>
    </section>
  );
}
