import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type {
  ClientIntent,
  ContractCard,
  PublicMoveDestination,
  PublicMovementPlannerState
} from "../shared/types.js";
import { getMissionRelevanceForSector } from "../shared/missionRelevance.js";
import { getTileAssetPath } from "../tv/tileAssetManifest.js";

export type MovementNavigationTarget = "player" | "inventory" | "more";

interface DestinationPresentation {
  destination: PublicMoveDestination;
  typeLabel: string;
  dangerLabel: string;
  rewardLabel: string;
  missionRelevant: boolean;
  routeLine: string;
  specialRules: string[];
  artPath: string | null;
}

interface PhoneMovementViewProps {
  planner: PublicMovementPlannerState | null | undefined;
  seatId: string;
  activeContract: ContractCard | null;
  currentSectorName: string;
  canRoll: boolean;
  movementResolving: boolean;
  travel: { fromSectorName: string; toSectorName: string } | null;
  selectedSectorId: string | null;
  onSelectedSectorId: (sectorId: string | null) => void;
  onIntent: (intent: ClientIntent) => void;
  showContextNavigation: boolean;
  onContextNavigation?: (target: MovementNavigationTarget) => void;
}

function destinationType(destination: PublicMoveDestination): string {
  if (destination.ringTransition) return destination.ringTransition.label;
  if (destination.shop) return destination.shop.shopName;
  if (destination.strategicTags.includes("gate")) return "Gate";
  if (destination.strategicTags.includes("nemesis")) return "Nemesis route";
  return `${destination.ring} reach`;
}

function dangerLabel(destination: PublicMoveDestination): string {
  if (destination.disabledReason) return "Route blocked";
  if (destination.faceUpThreats.length > 0) {
    return `${destination.faceUpThreats.length} blocker${destination.faceUpThreats.length === 1 ? "" : "s"}`;
  }
  if (destination.threatIcons.length > 0 || destination.strategicTags.includes("danger")) return "Threat risk";
  return "No visible threat";
}

function rewardLabel(destination: PublicMoveDestination): string {
  if (destination.shop) return destination.shop.status === "locked" ? "Shop locked" : "Shop / services";
  if (destination.scenarioMarkers?.length) return "Scenario objective";
  if (destination.strategicTags.includes("reward")) return "Reward opportunity";
  return "Sector opportunity";
}

function destinationSpecialRules(destination: PublicMoveDestination): string[] {
  return [
    destination.disabledReason ? `Blocked: ${destination.disabledReason}` : null,
    destination.ringTransition ? `${destination.ringTransition.label}. Movement ends after crossing.` : null,
    destination.voidKeyPrompt ? `Void Key available · ${destination.voidKeyPrompt.currentCharges}/${destination.voidKeyPrompt.maxCharges} charges` : null,
    destination.routeStarPrompt ? `Route Star available · ${destination.routeStarPrompt.currentCharges}/${destination.routeStarPrompt.maxCharges} charges` : null,
    destination.shop?.servicesPreview.length ? `Services: ${destination.shop.servicesPreview.join(" · ")}` : null,
    destination.faceUpThreats.length ? `Visible blockers: ${destination.faceUpThreats.map((threat) => threat.name).join(" · ")}` : null,
    destination.occupants.length ? `Operatives present: ${destination.occupants.map((occupant) => `${occupant.name} (${occupant.characterName})`).join(" · ")}` : null,
    destination.ruleText?.trim() || null,
    destination.loreText?.trim() || null
  ].filter((entry): entry is string => Boolean(entry));
}

function buildDestinationPresentation(
  destination: PublicMoveDestination,
  activeContract: ContractCard | null
): DestinationPresentation {
  return {
    destination,
    typeLabel: destinationType(destination),
    dangerLabel: dangerLabel(destination),
    rewardLabel: rewardLabel(destination),
    missionRelevant: Boolean(getMissionRelevanceForSector(activeContract, destination.sectorId, {
      threatIcons: destination.threatIcons,
      faceUpThreatCount: destination.faceUpThreats.length
    })),
    routeLine: (destination.routeNames ?? destination.route).join(" → "),
    specialRules: destinationSpecialRules(destination),
    artPath: getTileAssetPath(destination.sectorId)
  };
}

function DestinationArtwork({ model }: { model: DestinationPresentation }): ReactElement {
  return model.artPath ? (
    <img src={model.artPath} alt="" aria-hidden="true" className="phone-move-prototype__art" data-testid="movement-tile-image" />
  ) : (
    <span className="phone-move-prototype__art-fallback" aria-hidden="true" data-testid="movement-tile-fallback">
      {model.destination.ring.slice(0, 1).toUpperCase()}
    </span>
  );
}

function DestinationSignals({ model }: { model: DestinationPresentation }): ReactElement {
  return (
    <div className="phone-move-prototype__signals" aria-label="Destination summary">
      <span className={model.dangerLabel === "No visible threat" ? "is-neutral" : "is-danger"}>{model.dangerLabel}</span>
      <span className="is-reward">{model.rewardLabel}</span>
      {model.missionRelevant ? <span className="is-mission">Mission</span> : null}
    </div>
  );
}

function RouteDetails({
  model,
  planner,
  seatId,
  onIntent
}: {
  model: DestinationPresentation;
  planner: PublicMovementPlannerState;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement {
  const [previewRouteId, setPreviewRouteId] = useState<string | null>(null);
  const routeVariants = model.destination.routeVariants ?? [];
  const routeStarPrompt = model.destination.routeStarPrompt;
  return (
    <details className="phone-move-prototype__details">
      <summary>View details</summary>
      <div>
        <span>Route</span>
        <strong>{model.routeLine}</strong>
        <span>Legal movement</span>
        <strong>{model.destination.distance} exact step{model.destination.distance === 1 ? "" : "s"}</strong>
        {model.specialRules.map((rule) => <p key={rule}>{rule}</p>)}
        {routeStarPrompt && routeVariants.length > 1 ? (
          <section className="phone-move-prototype__route-star" data-testid="route-star-prompt">
            <span>Route Star</span>
            <p>Spend 1 charge only if you confirm an alternate legal route.</p>
            {routeVariants.map((variant) => {
              const isDefault = variant.routeId === model.destination.defaultRouteId;
              const routeNames = variant.sectorNames ?? variant.sectorIds;
              return (
                <div key={variant.routeId}>
                  <strong>{routeNames.join(" → ")}</strong>
                  <small>{variant.distance} steps{isDefault ? " · Default" : ""}</small>
                  {!isDefault ? (
                    <button type="button" onClick={() => setPreviewRouteId(variant.routeId)}>Preview route</button>
                  ) : null}
                  {!isDefault && previewRouteId === variant.routeId ? (
                    <button
                      type="button"
                      onClick={() => onIntent({
                        type: "SELECT_ROUTE_STAR_VARIANT",
                        seatId,
                        instanceId: routeStarPrompt.instanceId,
                        destinationId: model.destination.sectorId,
                        routeId: variant.routeId,
                        movementRevision: planner.movementRevision!
                      })}
                    >
                      Choose this route · 1 charge
                    </button>
                  ) : null}
                </div>
              );
            })}
            {planner.routeStarCommitted && planner.selectedRouteId === model.destination.routeId ? (
              <p data-testid="route-star-confirmation">Alternate route selected.</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}

function MovementAdjustments({
  planner,
  seatId,
  onIntent
}: {
  planner: PublicMovementPlannerState;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const [pendingAdjustment, setPendingAdjustment] = useState<-1 | 1 | null>(null);
  const modifierSources = planner.modifierSources ?? [];
  if (!planner.compassPrompt && modifierSources.length === 0 && !planner.movementAdjustment) return null;
  const rolledValue = planner.rolledValue ?? planner.originalMovementValue ?? planner.movementValue;
  return (
    <details className="phone-move-prototype__adjustments" data-testid="movement-adjustments">
      <summary>Movement calculation</summary>
      <div>
        <p>Roll {rolledValue}</p>
        {modifierSources.map((source) => <p key={`${source.label}:${source.value}`}>{source.label} {source.value > 0 ? `+${source.value}` : source.value}</p>)}
        <strong>Final movement {planner.movementValue}</strong>
        {planner.compassPrompt ? (
          <section aria-label="Ashen Route Compass prompt">
            <span>Route Compass · {planner.compassPrompt.currentCharges}/{planner.compassPrompt.maxCharges} charges</span>
            {pendingAdjustment ? (
              <div className="phone-move-prototype__adjustment-actions">
                <button
                  type="button"
                  onClick={() => {
                    onIntent({
                      type: "ADJUST_MOVEMENT_REQUESTED",
                      seatId,
                      instanceId: planner.compassPrompt!.instanceId,
                      adjustment: pendingAdjustment
                    });
                    setPendingAdjustment(null);
                  }}
                >
                  Confirm {pendingAdjustment > 0 ? "+1" : "−1"} · 1 charge
                </button>
                <button type="button" onClick={() => setPendingAdjustment(null)}>Cancel</button>
              </div>
            ) : (
              <div className="phone-move-prototype__adjustment-actions">
                <button type="button" disabled={!planner.compassPrompt.canDecrease} onClick={() => setPendingAdjustment(-1)}>Move −1</button>
                <button type="button" disabled={!planner.compassPrompt.canIncrease} onClick={() => setPendingAdjustment(1)}>Move +1</button>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </details>
  );
}

function MovementHeader({
  planner,
  canRoll,
  currentSectorName,
  travel,
  movementResolving
}: {
  planner: PublicMovementPlannerState | null | undefined;
  canRoll: boolean;
  currentSectorName: string;
  travel: { fromSectorName: string; toSectorName: string } | null;
  movementResolving: boolean;
}): ReactElement {
  const routeCount = planner?.destinations.length ?? 0;
  const stateLabel = travel
    ? "Confirmed"
    : movementResolving
      ? "Arrival resolving"
      : planner?.active
        ? planner.rolledValue !== undefined && planner.rolledValue !== planner.movementValue
          ? `Roll ${planner.rolledValue} · Move ${planner.movementValue}`
          : `Roll ${planner.movementValue}`
        : canRoll ? "Roll required" : "Resolving";
  const locationLabel = travel ? "Route locked" : planner?.currentSectorName ?? currentSectorName;
  const statusLabel = travel ? "" : planner?.active ? `${routeCount} legal destination${routeCount === 1 ? "" : "s"}` : "Awaiting movement roll";
  const instruction = travel
    ? ""
    : planner?.active
      ? `Choose one destination exactly ${planner.movementValue} step${planner.movementValue === 1 ? "" : "s"} away.`
      : "Roll once to reveal your legal destinations.";
  return (
    <header className="phone-move-prototype__header">
      <div>
        <span>Movement</span>
        <strong>{stateLabel}</strong>
      </div>
      <div className="phone-move-prototype__origin">
        <strong>{locationLabel}</strong>
        {statusLabel ? <span>{statusLabel}</span> : null}
      </div>
      {instruction ? <p>{instruction}</p> : null}
    </header>
  );
}

function ContextNavigation({ onNavigate }: { onNavigate?: (target: MovementNavigationTarget) => void }): ReactElement {
  return (
    <nav className="phone-move-prototype__context-nav" aria-label="Movement navigation">
      <button type="button" onClick={() => onNavigate?.("player")}>Operative</button>
      <button type="button" onClick={() => onNavigate?.("inventory")}>Inventory</button>
      <button type="button" onClick={() => onNavigate?.("more")}>More <span aria-hidden="true">⌃</span></button>
    </nav>
  );
}

function TacticalDestinationList({
  models,
  planner,
  seatId,
  onIntent,
  selectedSectorId,
  onSelect
}: {
  models: DestinationPresentation[];
  planner: PublicMovementPlannerState;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
  selectedSectorId: string | null;
  onSelect: (sectorId: string) => void;
}): ReactElement {
  return (
    <div className="phone-move-option-a__list" role="list" aria-label="Legal destinations">
      {models.map((model) => {
        const selected = model.destination.sectorId === selectedSectorId;
        const disabled = Boolean(model.destination.disabledReason && !model.destination.voidKeyPrompt);
        return (
          <article
            key={model.destination.sectorId}
            className={`phone-move-option-a__card${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
            role="listitem"
            data-testid="movement-destination"
            data-selected={selected ? "true" : "false"}
          >
            <button
              type="button"
              className="phone-move-option-a__select"
              onClick={() => !disabled && onSelect(model.destination.sectorId)}
              disabled={disabled}
              aria-label={`${selected ? "Selected" : "Select"} ${model.destination.name}`}
            >
              <DestinationArtwork model={model} />
              <span className="phone-move-option-a__copy">
                <span className="phone-move-prototype__eyebrow">{model.typeLabel}</span>
                <strong>{model.destination.name}</strong>
                <span>{model.destination.distance} step{model.destination.distance === 1 ? "" : "s"}</span>
                <DestinationSignals model={model} />
              </span>
              {selected ? <span className="phone-move-prototype__selected">Selected</span> : null}
            </button>
            <RouteDetails model={model} planner={planner} seatId={seatId} onIntent={onIntent} />
          </article>
        );
      })}
    </div>
  );
}

export function PhoneMovementView({
  planner,
  seatId,
  activeContract,
  currentSectorName,
  canRoll,
  movementResolving,
  travel,
  selectedSectorId,
  onSelectedSectorId,
  onIntent,
  showContextNavigation,
  onContextNavigation
}: PhoneMovementViewProps): ReactElement {
  const models = useMemo(
    () => (planner?.destinations ?? []).map((destination) => buildDestinationPresentation(destination, activeContract)),
    [activeContract, planner?.destinations]
  );
  const [submitted, setSubmitted] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const resetScroll = (): void => {
      const scrollContainer = shellRef.current?.closest<HTMLElement>(".phone-action-content-root");
      const phoneScrollContainer = shellRef.current?.closest<HTMLElement>(".phone-portrait-scroll");
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        scrollContainer.scrollLeft = 0;
      }
      if (phoneScrollContainer) {
        phoneScrollContainer.scrollTop = 0;
        phoneScrollContainer.scrollLeft = 0;
      }
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
        document.scrollingElement.scrollLeft = 0;
      }
    };
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [planner?.currentSectorId, planner?.movementValue]);

  useEffect(() => {
    setSubmitted(false);
    const serverSelected = planner?.selectedDestinationId ?? null;
    if (serverSelected) onSelectedSectorId(serverSelected);
  }, [onSelectedSectorId, planner?.currentSectorId, planner?.movementValue, planner?.selectedDestinationId]);

  const selectedModel = models.find((model) => model.destination.sectorId === selectedSectorId) ?? null;
  const movementState = movementResolving || travel
    ? "resolving"
    : planner?.active
      ? selectedModel ? "needs-confirm" : "needs-destination"
      : canRoll ? "needs-roll" : "complete";
  const selectDestination = (sectorId: string): void => {
    const model = models.find((entry) => entry.destination.sectorId === sectorId);
    if (!model || (model.destination.disabledReason && !model.destination.voidKeyPrompt)) return;
    onSelectedSectorId(sectorId);
    onIntent({ type: "MOVEMENT_DESTINATION_PREVIEWED", seatId, toSectorId: sectorId });
  };
  const confirm = (): void => {
    if (!selectedModel || submitted || (selectedModel.destination.disabledReason && !selectedModel.destination.voidKeyPrompt)) return;
    setSubmitted(true);
    const destination = selectedModel.destination;
    onIntent({
      type: "MOVE_REQUESTED",
      seatId,
      toSectorId: destination.sectorId,
      voidKeyInstanceId: destination.voidKeyPrompt?.instanceId,
      routeId: planner?.routeStarCommitted ? destination.routeId : undefined,
      movementRevision: planner?.routeStarCommitted ? planner.movementRevision : undefined
    });
  };

  const actionLabel = travel
    ? `Moving to ${travel.toSectorName}`
    : movementResolving
      ? "Resolving arrival"
      : !planner?.active && canRoll
        ? "Roll movement"
          : selectedModel
            ? `Confirm ${selectedModel.destination.name}`
            : "Select a destination";
  const canSubmit = !submitted && !movementResolving && !travel && (
    (!planner?.active && canRoll) || Boolean(selectedModel && (!selectedModel.destination.disabledReason || selectedModel.destination.voidKeyPrompt))
  );
  const performPrimaryAction = (): void => {
    if (!planner?.active && canRoll) {
      onIntent({ type: "MOVEMENT_ROLL_REQUESTED", seatId });
      return;
    }
    confirm();
  };

  const changeDestination = (): void => {
    onSelectedSectorId(null);
    onIntent({ type: "MOVEMENT_DESTINATION_PREVIEWED", seatId, toSectorId: null });
  };

  return (
    <section
      ref={shellRef}
      className="phone-move-prototype phone-move-tactical"
      data-testid="phone-movement-view"
      data-movement-state={movementState}
      aria-label="Tactical destination movement"
    >
      <MovementHeader planner={planner} canRoll={canRoll} currentSectorName={currentSectorName} travel={travel} movementResolving={movementResolving} />
      <div className="phone-move-prototype__content">
        {travel ? (
          <div className="phone-move-prototype__travel" role="status">
            <span>Moving to</span>
            <strong>{travel.toSectorName}</strong>
            <p>{travel.fromSectorName} → {travel.toSectorName}</p>
          </div>
        ) : !planner?.active ? (
          <div className="phone-move-prototype__roll-state" aria-hidden="true">
            <span aria-hidden="true">⬡</span>
          </div>
        ) : planner?.active ? (
          <>
            <MovementAdjustments planner={planner} seatId={seatId} onIntent={onIntent} />
            {models.length > 0 ? (
              <TacticalDestinationList models={models} planner={planner} seatId={seatId} onIntent={onIntent} selectedSectorId={selectedSectorId} onSelect={selectDestination} />
            ) : (
              <p className="phone-move-prototype__empty">No legal destinations are available.</p>
            )}
          </>
        ) : (
          <p className="phone-move-prototype__empty">No legal destinations are available.</p>
        )}
      </div>
      <div className="phone-move-prototype__docks">
        {selectedModel ? <div className="phone-move-prototype__selection">Selected: <strong>{selectedModel.destination.name}</strong></div> : null}
        <div className="phone-move-prototype__action-dock" data-testid="movement-action-region">
          {selectedModel ? (
            <button type="button" className="phone-move-prototype__change" onClick={changeDestination}>Change</button>
          ) : null}
          <button
            type="button"
            className="phone-move-prototype__primary"
            data-testid="movement-primary-action"
            disabled={!canSubmit}
            onClick={performPrimaryAction}
          >
            {submitted ? `Moving to ${selectedModel?.destination.name ?? "destination"}` : actionLabel}
          </button>
        </div>
        {showContextNavigation ? <ContextNavigation onNavigate={onContextNavigation} /> : null}
      </div>
    </section>
  );
}
