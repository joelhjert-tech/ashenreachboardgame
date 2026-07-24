import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { getSignalTheatreAssetPaths } from "../shared/assetPaths.js";
import type {
  PublicMoveDestination,
  PublicMovementPlannerState,
  PublicPatchPayload,
  PublicPlayer,
  PublicSeat,
  StatePatch
} from "../shared/types.js";
import { JoinQrCard } from "./JoinQrCard.js";
import { buildHostMotionCueModel, type HostMotionCueKind } from "./HostMotionCue.js";
import { OperativeChessPiece } from "./OperativeChessPiece.js";
import { SignalActionCoin, type SignalActionCoinKind } from "./SignalActionCoin.js";
import { SignalSectorResolution } from "./SignalSectorResolution.js";
import { SignalJourneyTrack } from "./SignalJourneyTrack.js";
import {
  getDevPieceVariant,
  getFormationPoints,
  getPieceStyle,
  getPublicOccupantSummary,
  getSectorOccupants
} from "./operativePiecePresentation.js";
import { getSignalTheatreEnvironment } from "./signalTheatreEnvironmentManifest.js";
import {
  buildSignalTheatreFixtureOccupants,
  getSignalTheatreDevFixture
} from "./signalTheatreDevFixtures.js";
import { buildSignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";
import { getSignalSectorResolutionDevFixture } from "./signalSectorResolutionDevFixtures.js";
import { useSignalTheatreJourney } from "./useSignalTheatreJourney.js";
import { useSignalTheatreEnvironmentPreload } from "./useSignalTheatreEnvironmentPreload.js";
import "./SignalTheatreHost.css";

interface SignalTheatreHostProps {
  patch: StatePatch<PublicPatchPayload> | null;
  previousPatch?: StatePatch<PublicPatchPayload> | null;
  roomCode: string | null;
  activeSeat: PublicSeat | null;
  activePlayer: PublicPlayer | null;
  currentStepCopy: string;
  synchronized: boolean;
  connectionStatus: string;
}

interface SignalRouteModel {
  destination: PublicMoveDestination | null;
  names: string[];
  roll: number | null;
  selected: boolean;
}

const assets = getSignalTheatreAssetPaths();

function SignalEnvironmentImage({ path }: { path: string }): ReactElement {
  const [visiblePath, setVisiblePath] = useState(path);

  useEffect(() => {
    setVisiblePath(path);
  }, [path]);

  return (
    <img
      key={visiblePath}
      className="signal-theatre__environment-image"
      src={visiblePath}
      width={1672}
      height={941}
      decoding="async"
      fetchPriority="high"
      alt=""
      aria-hidden="true"
      onError={() => setVisiblePath((current) => current === assets.worldStage ? current : assets.worldStage)}
    />
  );
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSignalRoute(planner: PublicMovementPlannerState | null | undefined): SignalRouteModel {
  if (!planner?.active) {
    return { destination: null, names: [], roll: null, selected: false };
  }

  const destination = planner.selectedDestinationId
    ? planner.destinations.find((entry) => entry.sectorId === planner.selectedDestinationId) ?? null
    : null;
  const names = destination?.route.map((_, index) =>
    destination.routeNames?.[index]
      ?? (index === 0
        ? planner.currentSectorName
        : index === destination.route.length - 1
          ? destination.name
          : `Step ${index}`)
  ) ?? [planner.currentSectorName];

  return {
    destination,
    names,
    roll: planner.movementValue ?? planner.rolledValue ?? null,
    selected: Boolean(destination)
  };
}

function progressPosition(kind: HostMotionCueKind | "lobby" | "ended", progressIndex: number): number {
  if (kind === "lobby") return 10;
  if (kind === "ended") return 50;
  if (kind === "movement") return progressIndex > 0 ? 36 : 24;
  if (kind === "arrival" || kind === "encounter" || kind === "battle" || kind === "reward" || kind === "penalty") return 50;
  if (kind === "shop") return 64;
  if (kind === "final") return 78;
  if (kind === "waiting") return 42;
  return 28;
}

function cueHeading(kind: HostMotionCueKind, title: string, location: string | null): string {
  if (kind === "turn" || kind === "waiting") return location ?? title;
  return title;
}

function cueInstruction(kind: HostMotionCueKind, detail: string): string {
  if (kind === "movement") return "Choose a route";
  if (kind === "arrival") return "Arrival confirmed";
  if (kind === "encounter") return "Read the signal";
  if (kind === "battle") return "Resolve the contest";
  if (kind === "reward") return "Reward secured";
  if (kind === "penalty") return "Consequence applied";
  if (kind === "shop") return "Service in progress";
  if (kind === "final") return "Final objective";
  if (kind === "waiting") return "Awaiting operative";
  return detail;
}

function SignalScenarioReadout({ payload }: { payload: PublicPatchPayload }): ReactElement | null {
  const win = payload.matchProgress?.winProgress;
  const loss = payload.matchProgress?.lossPressure;
  const fallbackProgress = payload.scenarioPressure?.objectiveProgress;
  const fallbackPressure = payload.scenarioPressure?.pressureTrack;

  if (!win && !loss && !fallbackProgress && !fallbackPressure) return null;

  return (
    <dl className="signal-theatre__scenario" aria-label="Scenario progress and pressure">
      <div>
        <dt>{win?.label ?? fallbackProgress?.label ?? "Progress"}</dt>
        <dd>{win ? `${win.current} / ${win.required}` : fallbackProgress ? `${fallbackProgress.current} / ${fallbackProgress.required}` : "—"}</dd>
      </div>
      <div>
        <dt>{loss?.label ?? fallbackPressure?.name ?? "Pressure"}</dt>
        <dd>{loss ? `${loss.current} / ${loss.required}` : fallbackPressure ? `${fallbackPressure.current} / ${fallbackPressure.max}` : "—"}</dd>
      </div>
    </dl>
  );
}

function SignalMissionSelection({ ownerName }: { ownerName: string }): ReactElement {
  return (
    <section
      className="signal-theatre__mission-selection"
      data-testid="signal-mission-selection"
      role="status"
      aria-live="polite"
      aria-labelledby="signal-mission-selection-title"
    >
      <div className="signal-theatre__mission-seal" aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">
          <path d="m50 5 12 8 14-1 5 13 12 7-4 14 5 12-12 8-4 14-14-1-12 9-12-9-14 1-5-13-12-7 4-14-5-12 12-8 4-14 14 1z" />
          <path d="m30 52 13 13 29-34" />
        </svg>
      </div>
      <header>
        <span>Private mission relay</span>
        <h1 id="signal-mission-selection-title">Mission complete</h1>
        <p>
          The reward is resolved. {ownerName} is choosing a new private mission on their phone.
        </p>
      </header>
      <div className="signal-theatre__mission-dossiers" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <article
            key={index}
            style={{ "--signal-mission-index": index } as CSSProperties}
          >
            <i />
            <span>Sealed offer</span>
            <strong>0{index + 1}</strong>
            <small>Owner access only</small>
          </article>
        ))}
      </div>
      <footer>
        <span>Up to three offers</span>
        <strong>Mission details remain private</strong>
      </footer>
    </section>
  );
}

function SignalLobby({
  patch,
  roomCode,
  synchronized,
  connectionStatus
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  roomCode: string | null;
  synchronized: boolean;
  connectionStatus: string;
}): ReactElement {
  const joined = patch?.payload.seats.filter((seat) => seat.displayName && !seat.kicked) ?? [];
  const ready = joined.filter((seat) => seat.ready).length;
  const connectionCopy = synchronized ? "Command link ready" : connectionStatus === "open" ? "Synchronizing room" : "Connecting to game server";

  return (
    <main className="signal-theatre signal-theatre--lobby" data-testid="signal-theatre-host" data-signal-state="lobby">
      <img className="signal-theatre__world" src={assets.worldStage} alt="" aria-hidden="true" />
      <header className="signal-theatre__brand">
        <span>ASHENREACH</span>
        <small>{connectionCopy}</small>
      </header>
      <section className="signal-theatre__lobby-command">
        <span>Expedition assembly</span>
        <h1>{patch?.payload.setup?.title ?? "Gather at the relay"}</h1>
        <p>{patch?.payload.setup?.publicInstruction ?? "Join with a phone, choose an operative, and ready for the expedition."}</p>
      </section>
      <section className="signal-theatre__room" aria-label="Room join">
        <span>Room code</span>
        <strong>{roomCode ?? "— — — —"}</strong>
        {roomCode ? <JoinQrCard roomCode={roomCode} variant="full" /> : null}
      </section>
      <section className="signal-theatre__lobby-roster" aria-label="Joined operatives">
        <span>{joined.length} joined</span>
        <strong>{ready} ready</strong>
        <p>{joined.map((seat) => seat.displayName).join(" · ") || "Waiting for the first operative"}</p>
      </section>
      <ol className="signal-theatre__sequence" aria-label="Setup sequence">
        {["Join", "Choose", "Ready", "Begin"].map((label, index) => <li key={label} className={index <= (ready > 0 ? 2 : joined.length > 0 ? 1 : 0) ? "is-complete" : ""}>{label}</li>)}
      </ol>
    </main>
  );
}

export function SignalTheatreHost({
  patch,
  previousPatch = null,
  roomCode,
  activeSeat,
  activePlayer,
  currentStepCopy,
  synchronized,
  connectionStatus
}: SignalTheatreHostProps): ReactElement {
  const payload = patch?.payload ?? null;
  const journey = useSignalTheatreJourney({ patch, previousPatch, synchronized });
  const confirmedDestination = payload?.movementPlanner?.selectedDestinationId
    ? payload.movementPlanner.destinations.find(
      (destination) => destination.sectorId === payload.movementPlanner?.selectedDestinationId
    ) ?? null
    : null;
  const preloadRoute = journey?.route ?? confirmedDestination?.route ?? [];
  useSignalTheatreEnvironmentPreload(preloadRoute, journey?.step ?? 0);

  if (!payload || payload.status === "lobby") {
    return <SignalLobby patch={patch} roomCode={roomCode} synchronized={synchronized} connectionStatus={connectionStatus} />;
  }

  const endResult = payload.matchProgress?.publicResult ?? null;
  const search = typeof window === "undefined" ? "" : window.location.search;
  const fixture = getSignalTheatreDevFixture(search);
  const model = buildHostMotionCueModel({
    patch,
    activeSeat,
    activePlayer,
    currentStepCopy,
    movementPresenting: Boolean(journey),
    synchronized
  });
  const sectorResolution = journey
    ? null
    : getSignalSectorResolutionDevFixture(search, payload)
      ?? buildSignalSectorResolutionModel(payload);
  const missionSelectionActive = payload.pendingMissionSelectionStatus?.status === "awaitingSelection";
  const missionOwner = missionSelectionActive
    ? payload.seats.find((seat) => seat.seatId === payload.pendingMissionSelectionStatus?.ownerSeatId) ?? null
    : null;
  const resolutionPlayer = sectorResolution?.actorSeatId
    ? payload.players.find((player) => player.seatId === sectorResolution.actorSeatId) ?? null
    : null;
  const route = getSignalRoute(payload.movementPlanner);
  const operativeName = journey?.movement.operativeName ?? activePlayer?.character.name ?? activeSeat?.displayName ?? model?.actor ?? "Table";
  const playerName = journey?.movement.playerName ?? activeSeat?.displayName ?? operativeName;
  const kind = endResult ? "ended" : journey ? "movement" : model?.kind ?? "waiting";
  const activeProgressIndex = endResult ? 3 : journey ? 2 : model?.activeProgressIndex ?? 1;
  const markerPosition = progressPosition(kind, activeProgressIndex);
  const stableSectorId =
    resolutionPlayer?.sectorId
    ?? activePlayer?.sectorId
    ?? payload.movementPlanner?.currentSectorId
    ?? payload.tileArrival?.tileId
    ?? payload.players[0]?.sectorId
    ?? null;
  const focusSectorId = fixture?.sectorId ?? journey?.sectorId ?? stableSectorId;
  const environment = getSignalTheatreEnvironment(focusSectorId);
  const focusSector = getBoardSpace(focusSectorId ?? "");
  const occupants = fixture
    ? buildSignalTheatreFixtureOccupants(fixture, payload.seats, payload.players)
    : focusSectorId
      ? getSectorOccupants(
        payload,
        focusSectorId,
        journey?.movement.movingSeatId,
        journey?.sectorId
      )
      : [];
  const matchedActiveIndex = occupants.findIndex((identity) =>
    identity.seatId === (sectorResolution?.actorSeatId ?? activeSeat?.seatId)
  );
  const activeIndex = fixture?.activeIndex
    ?? (matchedActiveIndex >= 0 ? matchedActiveIndex : -1);
  const formation = getFormationPoints(occupants.length, activeIndex, true);
  const pieceVariant = getDevPieceVariant(search);
  const journeyStepTotal = Math.max(1, (journey?.route.length ?? 1) - 1);
  const journeyStep = Math.min(journey?.step ?? 0, journeyStepTotal);
  const journeyTitle = journey
    ? journey.phase === "departure"
      ? `Departing ${journey.movement.originName}`
      : journey.phase === "arrival"
        ? `Arrived at ${journey.movement.destination.name}`
        : focusSector?.name ?? journey.movement.destination.name
    : null;
  const title = endResult?.title
    ?? journeyTitle
    ?? cueHeading(model?.kind ?? "waiting", model?.title ?? "Synchronizing", model?.location ?? null);
  const instruction = endResult
    ? endResult.outcome.toUpperCase()
    : journey
      ? journey.phase === "arrival"
        ? "Arrival confirmed"
        : journey.crossingRings
          ? "Crossing reach boundary"
          : "Following confirmed route"
      : cueInstruction(model?.kind ?? "waiting", model?.detail ?? "Restoring authoritative state");
  const detail = endResult?.reason
    ?? (journey
      ? `${journey.movement.playerName} · Route step ${journeyStep} of ${journeyStepTotal}`
      : model?.detail ?? "The last stable table state remains visible.");
  const next = endResult
    ? endResult.missionName
    : journey
      ? journey.phase === "arrival"
        ? "The destination resolves after the operative is visibly settled."
        : `Next: ${getBoardSpace(journey.route[Math.min(journey.step + 1, journey.route.length - 1)] ?? "")?.name ?? journey.movement.destination.name}`
      : model?.next ?? currentStepCopy;
  const sequence = endResult
    ? ["Journey", "Final stage", "Outcome", endResult.outcome]
    : journey
      ? ["Route confirmed", "Departure", "Travel", "Arrival"]
      : model?.progress ?? ["Turn", "Action", "Result", "Handoff"];
  const routeLabel = journey
    ? journey.phase === "arrival" ? "Destination reached" : `Route ${journeyStep} / ${journeyStepTotal}`
    : route.selected ? "Route confirmed" : route.roll !== null ? `Movement ${route.roll}` : titleCase(model?.kind ?? "waiting");
  const actionCoinKind: SignalActionCoinKind = missionSelectionActive
    ? "mission"
    : sectorResolution
    ? sectorResolution.mode === "battle" ? "battle" : "challenge"
    : journey?.phase === "arrival"
      ? "arrival"
      : kind;
  const actionCoinLabel = missionSelectionActive
    ? "Mission relay"
    : sectorResolution
    ? `${sectorResolution.statLabel} ${sectorResolution.mode === "battle" ? "battle" : "challenge"}`
    : routeLabel;
  const actionCoinDetail = missionSelectionActive
    ? "Private selection"
    : sectorResolution
    ? sectorResolution.opposition.name
    : focusSector?.name ?? (endResult ? endResult.modeLabel : "Signal relay");
  const style = { "--signal-marker-position": `${markerPosition}%` } as CSSProperties;
  const stageImage = environment?.path ?? assets.worldStage;
  const movingSeatId = fixture?.motionPhase
    ? occupants[fixture.activeIndex]?.seatId ?? null
    : journey?.movement.movingSeatId ?? null;
  const visibleMotionPhase = fixture?.motionPhase ?? journey?.phase ?? null;
  const occupantSummary = getPublicOccupantSummary(occupants);
  const visibleJourneyRoute = journey?.route
    ?? (fixture?.motionPhase
      ? [stableSectorId ?? focusSectorId ?? "ashwake-crossing", focusSectorId ?? stableSectorId ?? "ashwake-crossing"]
      : null);
  const visibleJourneyNames = visibleJourneyRoute?.map((sectorId, index) =>
    getBoardSpace(sectorId)?.name ?? (index === visibleJourneyRoute.length - 1 ? focusSector?.name : null) ?? `Route ${index + 1}`
  ) ?? [];
  const featuredSeatId = movingSeatId ?? sectorResolution?.actorSeatId ?? activeSeat?.seatId ?? null;
  const matchedFeaturedIdentity = occupants.find((identity) => identity.seatId === featuredSeatId) ?? null;
  const movingIdentity = sectorResolution
    ? matchedFeaturedIdentity
    : matchedFeaturedIdentity ?? (fixture ? occupants[fixture.activeIndex] ?? null : occupants[0] ?? null);
  const trackRoute = visibleJourneyRoute ?? [focusSectorId ?? stableSectorId ?? "unknown"];
  const trackRouteNames = visibleJourneyNames.length > 0
    ? visibleJourneyNames
    : [focusSector?.name ?? "Unknown sector"];

  return (
    <main
      className={`signal-theatre signal-theatre--${kind} signal-theatre--tier-${environment?.tier ?? "unknown"}${journey || fixture?.motionPhase ? " signal-theatre--journey" : ""}${sectorResolution ? " signal-theatre--sector-resolution" : ""}${missionSelectionActive ? " signal-theatre--mission-selection" : ""}${fixture?.endgameTone ? ` signal-theatre--fixture-${fixture.endgameTone}` : ""}`}
      data-testid="signal-theatre-host"
      data-signal-state={kind}
      data-motion-id={journey?.eventId ?? model?.id ?? endResult?.id ?? "stable"}
      data-sector-id={focusSectorId ?? "unknown"}
      data-piece-variant={pieceVariant}
      data-p22-fixture={fixture?.id ?? undefined}
      data-sector-resolution-mode={sectorResolution?.mode ?? undefined}
      data-mission-selection={missionSelectionActive ? "true" : undefined}
      style={style}
    >
      <div className="signal-theatre__base" aria-hidden={sectorResolution || missionSelectionActive ? "true" : undefined}>
        <section
          className="signal-theatre__environment"
          aria-label={`${focusSector?.name ?? "Unknown sector"}. ${occupants.length} operative${occupants.length === 1 ? "" : "s"} present.`}
          data-testid="signal-environment-stage"
        >
        <SignalEnvironmentImage path={stageImage} />
        <div className="signal-theatre__environment-shade" aria-hidden="true" />
        <div
          className={`signal-theatre__destination-ring${visibleMotionPhase === "arrival" ? " is-arriving" : ""}`}
          aria-hidden="true"
        />
        <div className="signal-theatre__pieces" data-testid="signal-operative-formation">
          {occupants.map((identity, index) => {
            if (identity.seatId === movingIdentity?.seatId) {
              return null;
            }
            const resolutionActor = Boolean(sectorResolution && identity.seatId === sectorResolution.actorSeatId);
            const pieceStyle = getPieceStyle(identity, formation[index] ?? formation[0]!);
            const presentationStyle = resolutionActor
              ? {
                ...pieceStyle,
                "--piece-x": "18%",
                "--piece-y": "64%",
                "--piece-scale": 1.2
              } as CSSProperties
              : pieceStyle;
            return (
              <OperativeChessPiece
                key={identity.seatId}
                identity={identity}
                variant={pieceVariant}
                active={sectorResolution
                  ? resolutionActor
                  : fixture
                    ? index === fixture.activeIndex
                    : identity.seatId === activeSeat?.seatId}
                moving={identity.seatId === movingSeatId && visibleMotionPhase !== "arrival"}
                arrived={identity.seatId === movingSeatId && visibleMotionPhase === "arrival"}
                focused
                style={presentationStyle}
              />
            );
          })}
        </div>
        <p className="signal-theatre__occupant-summary">{occupantSummary || "No operatives present."}</p>
        {occupants.length >= 5 ? (
          <span className="signal-theatre__occupant-count">{occupants.length} OPERATIVES</span>
        ) : null}
        </section>

        {focusSectorId ? (
        <SignalJourneyTrack
          route={trackRoute}
          routeNames={trackRouteNames}
          step={journey?.step ?? (visibleMotionPhase === "arrival" ? Math.max(0, trackRoute.length - 1) : 0)}
          sectorId={focusSectorId}
          crossingRings={journey?.crossingRings ?? fixture?.id === "cross-ring"}
          identity={movingIdentity}
          phase={visibleMotionPhase ?? "stable"}
          sectorName={focusSector?.name ?? "Unknown sector"}
        />
        ) : null}

        <header className="signal-theatre__brand">
        <span>ASHENREACH</span>
        <small>{payload.activeScenario?.name ?? "Expedition in progress"}</small>
        </header>

        <section className="signal-theatre__operative" aria-label={`Active operative ${operativeName}`}>
        <span>{environment?.tier ? `${titleCase(environment.tier)} reach` : "Signal stage"}</span>
        <h1>{focusSector?.name ?? journey?.movement.destination.name ?? model?.location ?? "Unknown sector"}</h1>
        <h2>{operativeName}</h2>
        <small>{playerName}</small>
        </section>

        {!sectorResolution ? (
        <section className="signal-theatre__command" aria-label="Current public action" role={model?.id && !model.id.startsWith("turn:") ? "status" : "region"}>
          <span>{endResult ? "Expedition result" : journey ? "Authoritative movement" : model?.eyebrow ?? "Command link"}</span>
          <h2>{title}</h2>
          <strong>{instruction}</strong>
          <p>{detail}</p>
          <small>{next}</small>
        </section>
        ) : null}

        <SignalScenarioReadout payload={payload} />

        {!journey && !sectorResolution && model?.delta ? (
        <section className={`signal-theatre__delta signal-theatre__delta--${model.delta.tone}`} aria-label="Public state change">
          <span>{model.delta.tone === "reward" ? "Reward" : model.delta.tone === "penalty" ? "Consequence" : "Change"}</span>
          <strong>{model.delta.label}</strong>
          {model.delta.value ? <b>{model.delta.value}</b> : null}
          {model.delta.reason ? <small>{model.delta.reason}</small> : null}
        </section>
        ) : null}

        {!sectorResolution ? (
        <ol className="signal-theatre__sequence" aria-label="Presentation sequence">
          {sequence.map((label, index) => (
            <li key={`${label}-${index}`} className={index === activeProgressIndex ? "is-current" : index < activeProgressIndex ? "is-complete" : ""}>{label}</li>
          ))}
        </ol>
        ) : null}

        <section className="signal-theatre__roster" aria-label="Operative connection and location status">
        {payload.seats.filter((seat) => seat.displayName && !seat.kicked).slice(0, 6).map((seat) => {
          const player = payload.players.find((entry) => entry.seatId === seat.seatId);
          const publicLocation = getBoardSpace(player?.sectorId ?? "")?.name ?? "Unknown sector";
          const operativeAndLocation = `${player?.character.name ?? "Unassigned operative"} / ${publicLocation}`;
          return (
            <span key={seat.seatId} className={seat.seatId === activeSeat?.seatId ? "is-active" : ""}>
              <b>{seat.displayName}</b>
              <small>{seat.connected ? operativeAndLocation : `Reconnecting / ${operativeAndLocation}`}</small>
            </span>
          );
        })}
        </section>
      </div>

      <aside className="signal-theatre__signal">
        <SignalActionCoin
          key={`${actionCoinKind}:${sectorResolution?.stat ?? "none"}:${model?.id ?? journey?.eventId ?? endResult?.id ?? "stable"}`}
          kind={actionCoinKind}
          stat={sectorResolution?.stat ?? null}
          label={actionCoinLabel}
          detail={actionCoinDetail}
        />
      </aside>

      {missionSelectionActive ? (
        <SignalMissionSelection ownerName={missionOwner?.displayName ?? "The operative"} />
      ) : sectorResolution ? (
        <SignalSectorResolution model={sectorResolution} />
      ) : null}

      {!synchronized ? (
        <section className="signal-theatre__network" role="status" aria-live="polite">
          <strong>Restoring authoritative state</strong>
          <span>No completed presentation will replay.</span>
        </section>
      ) : null}
    </main>
  );
}
