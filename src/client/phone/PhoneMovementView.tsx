import { lazy, Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import type {
  ClientIntent,
  ContractCard,
  PublicHostViewState,
  PublicInnerApproachState,
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicPatchPayload,
  PhoneTierTransitionOption
} from "../shared/types.js";
import { getMissionRelevanceForSector } from "../shared/missionRelevance.js";
import { statLabelById } from "../shared/statLabels.js";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../shared/AuthoritativeDicePresentation.js";
import { getSignalTheatreAssetPaths, getSignalTheatreStatSealPath } from "../shared/assetPaths.js";
import { PhoneOptimizedImage } from "../shared/PhoneOptimizedImage.js";
import { useAuthoritativeResultCollapse } from "../shared/useAuthoritativeResultCollapse.js";
import { getSignalTheatreEnvironment } from "../tv/signalTheatreEnvironmentManifest.js";
import { usePhoneBackDismissal } from "./useActiveRoomBackGuard.js";
import type { PhoneTabletopBoardProps } from "./PhoneTabletopBoard.js";

const PhoneTabletopBoard = lazy(() => import("./PhoneTabletopBoard.js").then((module) => ({ default: module.PhoneTabletopBoard })));

export function PhoneTabletopToggle(props: Omit<PhoneTabletopBoardProps, "id">): ReactElement {
  const [open, setOpen] = useState(false);
  const boardId = useId();
  return (
    <>
      <button
        type="button"
        className="phone-move-prototype__map-request phone-move-prototype__tabletop-toggle"
        aria-expanded={open}
        aria-controls={open ? boardId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MapTrifoldIcon size={24} weight={open ? "fill" : "duotone"} aria-hidden="true" />
        <span>
          <strong>{open ? "Close tabletop board" : "Open tabletop board"}</strong>
          <small>On this phone</small>
        </span>
      </button>
      {open ? (
        <Suspense fallback={<p id={boardId} role="status">Loading tabletop board…</p>}>
          <PhoneTabletopBoard {...props} id={boardId} />
        </Suspense>
      ) : null}
    </>
  );
}

export type MovementNavigationTarget = "player" | "inventory" | "more";

// Shared by both movement render paths. Confirmation is local and is never replayed.
export function useRouteStarDestinationChange(
  planner: PublicMovementPlannerState | null | undefined,
  seatId: string,
  onIntent: (intent: ClientIntent) => void,
  onPreview: (destinationId: string | null) => void,
  onAbandoned: (destinationId: string | null) => void
) {
  const [pending, setPending] = useState<{
    destinationId: string; routeId: string; movementRevision: number;
    toSectorId: string | null; submitted: boolean;
  } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const keepRoute = (): void => { pendingRef.current = null; setPending(null); };
  usePhoneBackDismissal(Boolean(pending), () => { keepRoute(); return true; });

  useEffect(() => {
    if (!pending) return;
    if (pending.submitted && planner?.active && !planner.routeStarCommitted &&
        planner.movementRevision === pending.movementRevision + 1) {
      // Only update local selection. Never send a follow-up intent from an effect.
      onAbandoned(pending.toSectorId);
      setPending(null);
    } else if (!planner?.active || planner.movementRevision !== pending.movementRevision ||
               planner.selectedRouteId !== pending.routeId || planner.selectedDestinationId !== pending.destinationId) {
      setPending(null);
    }
  }, [pending, planner?.active, planner?.movementRevision, planner?.routeStarCommitted,
      planner?.selectedRouteId, planner?.selectedDestinationId, onAbandoned]);

  const requestChange = (toSectorId: string | null): void => {
    if (pendingRef.current?.submitted) return;
    if (planner?.routeStarCommitted && toSectorId !== planner.selectedDestinationId &&
        planner.selectedDestinationId && planner.selectedRouteId && planner.movementRevision !== undefined) {
      setPending({ destinationId: planner.selectedDestinationId, routeId: planner.selectedRouteId,
        movementRevision: planner.movementRevision, toSectorId, submitted: false });
      return;
    }
    onPreview(toSectorId);
  };
  const discard = (): void => {
    const current = pendingRef.current;
    if (!current || current.submitted) return;
    pendingRef.current = { ...current, submitted: true };
    setPending(pendingRef.current);
    onIntent({ type: "ABANDON_ROUTE_STAR_CHOICE", seatId, destinationId: current.destinationId,
      routeId: current.routeId, movementRevision: current.movementRevision, toSectorId: current.toSectorId });
  };
  const confirmation = pending ? (
    <section className="phone-move-prototype__route-star" role="alertdialog" aria-label="Discard selected Route Star route" aria-describedby="route-star-abandon-description">
      <p id="route-star-abandon-description">Changing destination discards this route. The spent charge is not refunded.</p>
      <button type="button" className="phone-button phone-button-secondary" autoFocus disabled={pending.submitted} onClick={keepRoute}>Keep route</button>
      <button type="button" className="phone-button phone-button-primary" disabled={pending.submitted} onClick={discard}>
        {pending.submitted ? "Discarding route..." : "Discard route and change destination"}
      </button>
    </section>
  ) : null;
  return { requestChange, confirmation, confirming: Boolean(pending) };
}

interface DestinationPresentation {
  destination: PublicMoveDestination;
  typeLabel: string;
  dangerLabel: string;
  rewardLabel: string;
  missionRelevant: boolean;
  missionReason: string | null;
  routeLine: string;
  specialRules: string[];
  artPath: string | null;
}

function canSelectDestination(destination: PublicMoveDestination): boolean {
  return !destination.disabledReason || Boolean(destination.voidKeyPrompt);
}

interface PhoneMovementViewProps {
  planner: PublicMovementPlannerState | null | undefined;
  seatId: string;
  activeContract: ContractCard | null;
  currentSectorId?: string;
  tabletopPublicState?: Pick<PublicPatchPayload, "players" | "seats" | "sectors">;
  currentSectorName: string;
  canRoll: boolean;
  movementResolving: boolean;
  travel: { fromSectorName: string; toSectorName: string } | null;
  selectedSectorId: string | null;
  onSelectedSectorId: (sectorId: string | null) => void;
  onIntent: (intent: ClientIntent) => void;
  showContextNavigation: boolean;
  onContextNavigation?: (target: MovementNavigationTarget) => void;
  actorName?: string;
  diceCount?: number;
  hostView?: PublicHostViewState;
  tierTransitions?: {
    revision: number;
    options: PhoneTierTransitionOption[];
  } | null;
  innerApproach?: PublicInnerApproachState | null;
}

function destinationType(destination: PublicMoveDestination): string {
  if (destination.ringTransition) return destination.ringTransition.label;
  if (destination.shop) return destination.shop.shopName;
  if (destination.strategicTags.includes("gate")) return "Gate";
  if (destination.strategicTags.includes("nemesis")) return "Nemesis route";
  return `${destination.ring} reach`;
}

function dangerLabel(destination: PublicMoveDestination): string {
  if (destination.disabledReason && destination.voidKeyPrompt) return "Void Key route";
  if (destination.disabledReason) return "Route blocked";
  if (destination.faceUpThreats.length > 0) {
    return `${destination.faceUpThreats.length} blocker${destination.faceUpThreats.length === 1 ? "" : "s"}`;
  }
  if (destination.threatIcons.length > 0) return `${destination.threatIcons.length} encounter icon${destination.threatIcons.length === 1 ? "" : "s"}`;
  if (destination.strategicTags.includes("danger")) return "Threat risk";
  return "No visible threat";
}

function rewardLabel(destination: PublicMoveDestination): string {
  if (destination.shop) return destination.shop.status === "locked" ? "Shop locked" : "Shop / services";
  if (destination.scenarioMarkers?.length) return "Scenario objective";
  if (destination.opportunityLabel) return destination.opportunityLabel;
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
    destination.faceUpThreats.length ? `Visible encounters: ${destination.faceUpThreats.map((threat) => `${threat.name}${threat.challenge ? ` (${statLabelById[threat.challenge.stat]} ${threat.challenge.value})` : ""}`).join(" · ")}` : null,
    destination.occupants.length ? `Operatives present: ${destination.occupants.map((occupant) => `${occupant.name} (${occupant.characterName})`).join(" · ")}` : null,
    destination.loreText?.trim() || null
  ].filter((entry): entry is string => Boolean(entry));
}

function buildDestinationPresentation(
  destination: PublicMoveDestination,
  activeContract: ContractCard | null
): DestinationPresentation {
  const mission = getMissionRelevanceForSector(activeContract, destination.sectorId, {
    challenges: destination.challenges,
    threatIcons: destination.threatIcons,
    faceUpThreatCount: destination.faceUpThreats.length
  });
  return {
    destination,
    typeLabel: destinationType(destination),
    dangerLabel: dangerLabel(destination),
    rewardLabel: rewardLabel(destination),
    missionRelevant: Boolean(mission),
    missionReason: mission?.reason ?? null,
    routeLine: destination.routeNames?.length
      ? destination.routeNames.join(" → ")
      : `${destination.distance} sector route`,
    specialRules: destinationSpecialRules(destination),
    artPath: getSignalTheatreEnvironment(destination.sectorId)?.path ?? null
  };
}

function DestinationArtwork({ model }: { model: DestinationPresentation }): ReactElement {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [model.artPath]);

  return model.artPath ? (
    <img
      src={failed ? getSignalTheatreAssetPaths().worldStage : model.artPath}
      width={1600}
      height={900}
      loading="lazy"
      decoding="async"
      alt=""
      aria-hidden="true"
      className="phone-move-prototype__art"
      data-testid="movement-tile-image"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="phone-move-prototype__art-fallback" aria-hidden="true" data-testid="movement-tile-fallback">
      {model.destination.ring.slice(0, 1).toUpperCase()}
    </span>
  );
}

function DestinationSignals({ model }: { model: DestinationPresentation }): ReactElement {
  return (
    <div className="phone-move-prototype__signals" aria-label="Destination summary">
      {model.destination.approach ? <span className="is-neutral">{model.destination.approach.failurePrevented ? "Entry guaranteed" : `Guile · Target ${model.destination.approach.difficulty}`}</span> : null}
      <span className={model.dangerLabel === "No visible threat" ? "is-neutral" : "is-danger"}>{model.dangerLabel}</span>
      <span className="is-reward">{model.rewardLabel}</span>
      {model.missionRelevant ? <span className="is-mission">Contract opportunity</span> : null}
    </div>
  );
}

function RouteDetails({
  model,
  planner,
  seatId,
  onIntent,
  expanded,
  onExpandedChange
}: {
  model: DestinationPresentation;
  planner: PublicMovementPlannerState;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}): ReactElement {
  const [previewRouteId, setPreviewRouteId] = useState<string | null>(null);
  const routeVariants = model.destination.routeVariants ?? [];
  const routeStarPrompt = model.destination.routeStarPrompt;
  return (
    <details
      className="phone-move-prototype__details"
      open={expanded}
      onToggle={(event) => onExpandedChange(event.currentTarget.open)}
    >
      <summary>View details</summary>
      <div>
        {model.destination.approach ? <section className="phone-route-intel" aria-label="Arrival preview">
          <span>Arrival</span>
          <p>{model.destination.approach.failurePrevented ? "Your approach cannot fail in this game. Encounters still resolve after entry." : `Roll 2d6 + Guile against ${model.destination.approach.difficulty}. On failure, you remain at your current sector.`}</p>
        </section> : null}
        <section className="phone-route-intel" aria-label="Sector opportunity">
          <span>Sector opportunity</span>
          <p>{model.destination.ruleText || "No sector action preview available."}</p>
          {model.destination.threatIcons.length > 0 ? <p>Printed encounter icons: {model.destination.threatIcons.join(", ")}. Undrawn cards remain unknown.</p> : null}
        </section>
        {model.missionReason ? <section className="phone-route-intel" aria-label="Contract relevance"><span>Your Contract</span><p>{model.missionReason}</p></section> : null}
        <span>Route</span>
        <strong>{model.routeLine}</strong>
        <span>Legal movement</span>
        <strong>{model.destination.distance} exact step{model.destination.distance === 1 ? "" : "s"}</strong>
        {model.specialRules.map((rule) => <p key={rule}>{rule}</p>)}
        {!planner.routeStarCommitted && routeStarPrompt && routeVariants.length > 1 ? (
          <section className="phone-move-prototype__route-star" data-testid="route-star-prompt">
            <span>Route Star</span>
            <p>Spend 1 charge only if you confirm an alternate legal route.</p>
            {routeVariants.map((variant) => {
              const isDefault = variant.routeId === model.destination.defaultRouteId;
              const routeNames = variant.sectorNames?.length
                ? variant.sectorNames
                : [`${variant.distance} sector route`];
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
                {planner.routeStarCommitted ? <p>This adjustment discards your selected Route Star route. The spent charge is not refunded.</p> : null}
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
  movementResolving,
  tierTransitionAvailable
}: {
  planner: PublicMovementPlannerState | null | undefined;
  canRoll: boolean;
  currentSectorName: string;
  travel: { fromSectorName: string; toSectorName: string } | null;
  movementResolving: boolean;
  tierTransitionAvailable: boolean;
}): ReactElement {
  const routeCount = planner?.destinations.filter(canSelectDestination).length ?? 0;
  const finalMovement = planner?.movementValue ?? 0;
  const finalMovementLabel = `Move ${finalMovement} sector${finalMovement === 1 ? "" : "s"}`;
  const stateLabel = travel
    ? "Confirmed"
    : movementResolving
      ? "Arrival resolving"
      : planner?.active
        ? planner.rolledValue !== undefined && planner.rolledValue !== planner.movementValue
          ? `Roll ${planner.rolledValue} · ${finalMovementLabel}`
          : finalMovementLabel
        : canRoll ? tierTransitionAvailable ? "Choose route" : "Roll required" : "Resolving";
  const locationLabel = travel ? "Route locked" : planner?.currentSectorName ?? currentSectorName;
  const statusLabel = travel ? "" : planner?.active ? `${routeCount} legal destination${routeCount === 1 ? "" : "s"}` : "Awaiting movement roll";
  const instruction = travel
    ? ""
    : planner?.active
      ? `Choose one destination exactly ${planner.movementValue} step${planner.movementValue === 1 ? "" : "s"} away.`
      : tierTransitionAvailable
        ? "Cross the connected tier now, or roll for same-tier movement."
        : "Roll once to reveal your legal destinations.";
  return (
    <header className="phone-move-prototype__header phone-move-instrument__header">
      <div className="phone-move-instrument__heading">
        <span>Movement</span>
        <strong>{stateLabel}</strong>
        {instruction ? <p>{instruction}</p> : null}
      </div>
      <div
        className="phone-move-instrument__seal"
        aria-label={planner?.active ? `Movement total ${finalMovement}` : "Movement total awaiting roll"}
      >
        <PhoneOptimizedImage src={getSignalTheatreStatSealPath("command")} width={512} height={512} alt="" aria-hidden="true" />
        <span>Total</span>
        <strong>{planner?.active ? finalMovement : "—"}</strong>
      </div>
      <div className="phone-move-prototype__origin phone-move-instrument__origin">
        <strong>{locationLabel}</strong>
        {statusLabel ? <span>{statusLabel}</span> : null}
      </div>
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
  onSelect,
  expandedSectorId,
  onExpandedSectorId
}: {
  models: DestinationPresentation[];
  planner: PublicMovementPlannerState;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
  selectedSectorId: string | null;
  onSelect: (sectorId: string) => void;
  expandedSectorId: string | null;
  onExpandedSectorId: (sectorId: string | null) => void;
}): ReactElement {
  return (
    <div className="phone-move-option-a__list" role="list" aria-label="Legal destinations">
      {models.map((model) => {
        const selected = model.destination.sectorId === selectedSectorId;
        const disabled = !canSelectDestination(model.destination);
        const markerLabel = model.destination.markerLabel;
        return (
          <article
            key={model.destination.sectorId}
            className={`phone-move-option-a__card phone-move-instrument__stop${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
            role="listitem"
            data-testid="movement-destination"
            data-selected={selected ? "true" : "false"}
          >
            <span className="phone-move-instrument__rail" aria-hidden="true">
              <i />
            </span>
            <button
              type="button"
              className="phone-move-option-a__select"
              onClick={() => !disabled && onSelect(model.destination.sectorId)}
              disabled={disabled}
              aria-label={`${selected ? "Selected" : "Select"}${markerLabel ? ` destination ${markerLabel},` : ""} ${model.destination.name}; ${model.destination.distance} exact sectors`}
            >
              <DestinationArtwork model={model} />
              <span className="phone-move-option-a__copy">
                <span className="phone-move-prototype__eyebrow">
                  {markerLabel ? <b className="phone-move-prototype__marker" aria-hidden="true">{markerLabel}</b> : null}
                  {model.typeLabel}
                </span>
                <strong>{model.destination.name}</strong>
                <span>{model.destination.distance} step{model.destination.distance === 1 ? "" : "s"}</span>
                <DestinationSignals model={model} />
              </span>
              {selected ? <span className="phone-move-prototype__selected">Selected</span> : null}
            </button>
            <RouteDetails
              model={model}
              planner={planner}
              seatId={seatId}
              onIntent={onIntent}
              expanded={expandedSectorId === model.destination.sectorId}
              onExpandedChange={(expanded) => onExpandedSectorId(expanded ? model.destination.sectorId : null)}
            />
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
  currentSectorId,
  tabletopPublicState,
  currentSectorName,
  canRoll,
  movementResolving,
  travel,
  selectedSectorId,
  onSelectedSectorId,
  onIntent,
  showContextNavigation,
  onContextNavigation,
  actorName = "Your operative",
  diceCount = 1,
  hostView,
  tierTransitions,
  innerApproach
}: PhoneMovementViewProps): ReactElement {
  const models = useMemo(
    () => (planner?.destinations ?? []).map((destination) => buildDestinationPresentation(destination, activeContract)),
    [activeContract, planner?.destinations]
  );
  const [submitted, setSubmitted] = useState(false);
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(selectedSectorId);
  const shellRef = useRef<HTMLElement | null>(null);
  usePhoneBackDismissal(Boolean(expandedSectorId), () => {
    if (routeStarChange.confirming) return false;
    setExpandedSectorId(null);
    return true;
  });

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
    if (serverSelected) {
      onSelectedSectorId(serverSelected);
      setExpandedSectorId(serverSelected);
    }
  }, [
    onSelectedSectorId,
    planner?.currentSectorId,
    planner?.movementValue,
    planner?.selectedDestinationId,
    tierTransitions?.revision,
    innerApproach?.revision
  ]);

  const rollFaces = planner?.rollFaces ?? (planner?.rolledValue !== undefined ? [planner.rolledValue] : planner?.active ? [planner.originalMovementValue ?? planner.movementValue] : []);
  const diceModel: AuthoritativeDiceModel = {
    id: `movement:${seatId}:${currentSectorName}`,
    revision: planner?.movementRevision ?? 0,
    stage: submitted && !planner?.active ? "submitting" : planner?.active ? "result" : "ready",
    context: "movement",
    actorName,
    purpose: "Movement roll",
    dice: buildDice(rollFaces, Array.from({ length: rollFaces.length || diceCount }, (_, index) => diceCount > 1 ? `Movement die ${index + 1}` : "Movement die")),
    rawTotal: planner?.rolledValue ?? planner?.originalMovementValue ?? planner?.movementValue ?? null,
    modifiers: planner?.modifierSources ?? [],
    finalValue: planner?.movementValue ?? null,
    outcome: planner?.active ? `${planner.destinations.filter(canSelectDestination).length} legal destinations` : null
  };
  const diceResultKey = planner?.active && planner.rolledValue !== undefined
    ? `${planner.movementRevision ?? "movement"}:${rollFaces.join(",")}:${planner.movementValue}`
    : null;
  const diceDisclosure = useAuthoritativeResultCollapse(
    diceResultKey,
    100,
    `movement:${seatId}:${currentSectorName}`
  );

  const selectedModel = models.find((model) => model.destination.sectorId === selectedSectorId) ?? null;
  const tierTransitionAvailable = Boolean(
    canRoll &&
    tierTransitions?.options.some((transition) => !transition.disabledReason || transition.voidKeyPrompt)
  );
  const movementState = movementResolving || travel
    ? "resolving"
    : planner?.active
      ? selectedModel ? "needs-confirm" : "needs-destination"
      : canRoll ? "needs-roll" : "complete";
  const applySelectedDestination = (sectorId: string | null): void => {
    onSelectedSectorId(sectorId);
    setExpandedSectorId(sectorId);
  };
  const routeStarChange = useRouteStarDestinationChange(planner, seatId, onIntent, (sectorId) => {
    applySelectedDestination(sectorId);
    onIntent({ type: "MOVEMENT_DESTINATION_PREVIEWED", seatId, toSectorId: sectorId });
  }, applySelectedDestination);
  const selectDestination = (sectorId: string): void => {
    const model = models.find((entry) => entry.destination.sectorId === sectorId);
    if (!model || !canSelectDestination(model.destination)) return;
    routeStarChange.requestChange(sectorId);
  };
  const confirm = (): void => {
    if (!selectedModel || submitted || !canSelectDestination(selectedModel.destination)) return;
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
  const crossTier = (transition: PhoneTierTransitionOption): void => {
    if (submitted || movementResolving || travel || (transition.disabledReason && !transition.voidKeyPrompt)) return;
    setSubmitted(true);
    onIntent({
      type: "TIER_TRANSITION_REQUESTED",
      seatId,
      destinationSectorId: transition.sectorId,
      movementRevision: tierTransitions?.revision ?? 0,
      voidKeyInstanceId: transition.voidKeyPrompt?.instanceId
    });
  };
  const traverseInnerApproach = (destinationSectorId: string): void => {
    if (submitted || movementResolving || travel || !innerApproach) return;
    const option = innerApproach.options.find((entry) => entry.sectorId === destinationSectorId);
    if (!option || option.disabledReason) return;
    setSubmitted(true);
    onIntent({
      type: "INNER_APPROACH_MOVE_REQUESTED",
      seatId,
      destinationSectorId,
      movementRevision: innerApproach.revision
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
  const canSubmit = !routeStarChange.confirming && !submitted && !movementResolving && !travel && (
    (!planner?.active && canRoll) || Boolean(selectedModel && canSelectDestination(selectedModel.destination))
  );
  const performPrimaryAction = (): void => {
    if (!planner?.active && canRoll) {
      if (submitted) return;
      setSubmitted(true);
      onIntent({ type: "MOVEMENT_ROLL_REQUESTED", seatId });
      return;
    }
    confirm();
  };

  const tabletopSectorId = planner?.currentSectorId ?? currentSectorId;

  const changeDestination = (): void => {
    routeStarChange.requestChange(null);
  };

  return (
    <section
      ref={shellRef}
      className="phone-move-prototype phone-move-tactical"
      data-testid="phone-movement-view"
      data-movement-state={movementState}
      aria-label="Tactical destination movement"
    >
      <MovementHeader
        planner={planner}
        canRoll={canRoll}
        currentSectorName={currentSectorName}
        travel={travel}
        movementResolving={movementResolving}
        tierTransitionAvailable={tierTransitionAvailable}
      />
      <div className="phone-move-prototype__content">
        {planner?.routeStarCommitted ? <p role="status" data-testid="route-star-confirmation">Route selected · 1 charge spent</p> : null}
        {routeStarChange.confirmation}
        {tabletopSectorId && !travel && !movementResolving ? (
          <PhoneTabletopToggle
            publicState={tabletopPublicState}
            currentSectorId={tabletopSectorId}
            currentSectorName={currentSectorName}
            destinations={planner?.active ? planner.destinations : undefined}
            selectedDestination={selectedModel?.destination}
            selectionDisabled={submitted || routeStarChange.confirming || Boolean(innerApproach)}
            innerApproach={innerApproach}
            tierTransitions={canRoll ? tierTransitions?.options : undefined}
            onSelectSector={selectDestination}
          />
        ) : null}
        {hostView ? (
          <button
            type="button"
            className="phone-move-prototype__map-request"
            aria-pressed={hostView.mode === "map"}
            disabled={hostView.mode !== "map" && !hostView.canRequestMap}
            onClick={() => onIntent({
              type: "HOST_VIEW_REQUESTED",
              seatId,
              mode: hostView.mode === "map" ? "signal" : "map"
            })}
          >
            <MapTrifoldIcon size={24} weight={hostView.mode === "map" ? "fill" : "duotone"} aria-hidden="true" />
            <span>
              <strong>{hostView.mode === "map" ? "Return to Signal Theatre" : "Show map on TV"}</strong>
              <small>{hostView.unavailableReason ?? "Shared public display"}</small>
            </span>
          </button>
        ) : null}
        {innerApproach ? (
          <section className="phone-inner-approach" aria-label={`${innerApproach.pathLabel} progression`}>
            <header>
              <span>{innerApproach.pathLabel}: one step, plus a second for clearing a trial on arrival</span>
              <strong>{innerApproach.currentSectorName}</strong>
              <p>
                {innerApproach.challengeCleared
                  ? "Challenge cleared. Advance one connected step or retreat."
                  : `${innerApproach.challengeTitle} must be cleared before advancing.`}
              </p>
            </header>
            <ol className="phone-inner-approach__steps" aria-label="Inner approach progress">
              {innerApproach.steps.map((step, index) => (
                <li key={step.sectorId} data-status={step.status}>
                  <span>{step.status === "cleared" ? "Cleared" : step.status === "current" ? "Current" : step.status === "boss" ? "Boss" : index + 1}</span>
                  <strong>{step.name}</strong>
                </li>
              ))}
            </ol>
            <div className="phone-inner-approach__options">
              {innerApproach.options.map((option) => (
                <button
                  key={`${option.direction}:${option.sectorId}`}
                  type="button"
                  disabled={Boolean(option.disabledReason) || submitted}
                  onClick={() => traverseInnerApproach(option.sectorId)}
                >
                  <span>{option.direction === "advance" ? "Advance" : "Retreat"}</span>
                  <strong>{option.label}</strong>
                  <small>{option.disabledReason ?? "Movement ends after this step"}</small>
                </button>
              ))}
            </div>
          </section>
        ) : canRoll && tierTransitions && tierTransitions.options.length > 0 ? (
          <section className="phone-tier-transition" aria-label="Tier crossing options">
            <header>
              <span>Tier crossing</span>
              <strong>Cross before rolling</strong>
              <p>Crossing is guaranteed and ends movement at the connected sector.</p>
            </header>
            <div className="phone-tier-transition__options">
              {tierTransitions.options.map((transition) => {
                const selectable = !transition.disabledReason || Boolean(transition.voidKeyPrompt);
                return (
                  <button
                    key={transition.sectorId}
                    type="button"
                    disabled={!selectable || submitted}
                    onClick={() => crossTier(transition)}
                  >
                    <span>{transition.direction === "inward" ? "Advance" : "Return"}</span>
                    <strong>{transition.label}</strong>
                    <small>{transition.name} · Movement ends</small>
                    {transition.disabledReason ? (
                      <em>
                        {transition.voidKeyPrompt
                          ? `Use Void Key · ${transition.voidKeyPrompt.currentCharges}/${transition.voidKeyPrompt.maxCharges} charges`
                          : transition.disabledReason}
                      </em>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        {travel ? (
          <div className="phone-move-prototype__travel" role="status">
            <span>Moving to</span>
            <strong>{travel.toSectorName}</strong>
            <p>{travel.fromSectorName} → {travel.toSectorName}</p>
          </div>
        ) : !innerApproach && planner?.active ? (
          <>
            <MovementAdjustments planner={planner} seatId={seatId} onIntent={onIntent} />
            {models.length > 0 ? (
              <TacticalDestinationList
                models={models}
                planner={planner}
                seatId={seatId}
                onIntent={onIntent}
                selectedSectorId={selectedSectorId}
                onSelect={selectDestination}
                expandedSectorId={expandedSectorId}
                onExpandedSectorId={setExpandedSectorId}
              />
            ) : (
              <p className="phone-move-prototype__empty">No legal destinations are available.</p>
            )}
          </>
        ) : null}
        {!innerApproach && !travel && !movementResolving ? (
          <div
            className={`phone-auto-collapse-dice${diceDisclosure.collapsed ? " is-collapsed" : ""}`}
            data-testid="phone-movement-dice-disclosure"
          >
            <button
              type="button"
              className="phone-auto-collapse-dice__summary"
              aria-expanded={!diceDisclosure.collapsed}
              onClick={diceDisclosure.collapsed ? diceDisclosure.expand : diceDisclosure.collapse}
            >
              <span>Movement roll</span>
              <strong>{planner?.movementValue ?? "Ready"}</strong>
            </button>
            <AuthoritativeDicePresentation model={diceModel} compact />
          </div>
        ) : null}
      </div>
      <div className="phone-move-prototype__docks">
        {selectedModel ? <div className="phone-move-prototype__selection">Selected: <strong>{selectedModel.destination.name}</strong></div> : null}
        {!innerApproach ? <div className="phone-move-prototype__action-dock" data-testid="movement-action-region">
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
        </div> : null}
        {showContextNavigation ? <ContextNavigation onNavigate={onContextNavigation} /> : null}
      </div>
    </section>
  );
}
