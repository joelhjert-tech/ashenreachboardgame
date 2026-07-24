import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { getSignalPieceAssetPath } from "../../shared/signalPieceCatalog.js";
import { getCharacterPortraitPathOrNull } from "../shared/assetPaths.js";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import { getSignalJourneyTiming } from "../shared/motionTokens.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import type { OperativePieceIdentity } from "./operativePiecePresentation.js";
import {
  getSignalJourneyPathModel,
  getSignalJourneyPoint
} from "./signalJourneyPathPresentation.js";
import "./SignalJourneyTrack.css";

interface SignalJourneyTrackProps {
  route: readonly string[];
  routeNames: readonly string[];
  step: number;
  sectorId: string;
  crossingRings: boolean;
  identity: OperativePieceIdentity | null;
  phase: "stable" | "departure" | "travel" | "arrival";
  sectorName: string;
}

export function SignalJourneyTrack({
  route,
  routeNames,
  step,
  sectorId,
  crossingRings,
  identity,
  phase,
  sectorName
}: SignalJourneyTrackProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const timing = getSignalJourneyTiming(phase, crossingRings);
  const model = useMemo(
    () => getSignalJourneyPathModel(route, sectorId, crossingRings),
    [crossingRings, route, sectorId]
  );
  const lastStep = Math.max(1, route.length - 1);
  const targetProgress =
    phase === "stable" || phase === "arrival"
      ? 0.5
      : phase === "departure"
        ? 1
        : step >= lastStep
          ? 0.5
          : 1;
  const [markerProgress, setMarkerProgress] = useState(phase === "stable" ? 0.5 : targetProgress);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (reducedMotion || phase !== "travel") {
      setResetting(false);
      setMarkerProgress(targetProgress);
      return;
    }

    setResetting(true);
    setMarkerProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setResetting(false);
      setMarkerProgress(targetProgress);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, reducedMotion, sectorId, step, targetProgress]);

  const marker = getSignalJourneyPoint(model, markerProgress);
  const markerStyle = {
    "--signal-journey-x": `${marker.x / 10}%`,
    "--signal-journey-y": `${marker.y / 2.2}%`,
    "--signal-piece-color": identity?.color ?? "#a4f8db",
    "--signal-piece-color-soft": identity?.colorSoft ?? "#e8fff8",
    "--signal-journey-duration": `${reducedMotion ? 1 : timing.transitionMs}ms`
  } as CSSProperties;
  const stops = [0, 0.16, 0.33, 0.5, 0.67, 0.84, 1].map((progress, index) => {
    const point = getSignalJourneyPoint(model, progress);
    return {
      id: `${sectorId}-stop-${index}`,
      point,
      event: progress === 0.5,
      passed: progress <= markerProgress
    };
  });
  const eventPoint = getSignalJourneyPoint(model, 0.5);
  const stateLabel = phase === "departure"
    ? "Departing"
    : phase === "travel" && step < lastStep
      ? "Passing through"
      : "Event stop";

  return (
    <section
      className={`signal-journey-track signal-journey-track--${model.variant} signal-journey-track--${phase}${crossingRings ? " is-cross-ring" : ""}${resetting ? " is-resetting" : ""}`}
      aria-label={phase === "stable"
        ? `Current sector event stop. ${sectorName}.`
        : `Confirmed movement route. ${routeNames.join(" to ")}.`}
      data-testid="signal-journey-track"
      data-route-variant={model.variant}
    >
      <svg className="signal-journey-track__line" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
        <path className="signal-journey-track__rift" d={model.path} pathLength="100" />
        <path className="signal-journey-track__core" d={model.path} pathLength="100" />
        <path className="signal-journey-track__travelled" d={model.path} pathLength="100" style={{ "--signal-route-progress": `${markerProgress * 100}` } as CSSProperties} />
        {stops.map(({ id, point, event, passed }) => (
          <g
            key={id}
            className={`signal-journey-track__node${event ? " is-event-stop" : ""}${passed ? " is-passed" : ""}`}
            transform={`translate(${point.x} ${point.y})`}
          >
            <circle r={event ? 17 : 8} />
            <circle r={event ? 6 : 2.8} />
          </g>
        ))}
      </svg>
      <span
        className="signal-journey-track__label is-event-stop"
        style={{ left: `${eventPoint.x / 10}%`, top: `${eventPoint.y / 2.2}%` }}
      >
        <b>{stateLabel}</b>
        <small>{sectorName}</small>
      </span>
      {identity ? (
        <div
          className="signal-journey-track__marker"
          style={markerStyle}
          data-piece-id={identity.signalPieceId}
          role="img"
          aria-label={`${identity.playerName}, ${identity.operativeName}, ${phase === "stable" || phase === "arrival" ? "at the event stop" : "moving"}`}
        >
          <ArtworkFrame
            src={getCharacterPortraitPathOrNull(identity.characterId)}
            alt={`${identity.operativeName} portrait`}
            fit="cover"
            aspectRatio="portrait"
            focalPoint="center top"
            fallback="operative"
            priority
            className="signal-journey-track__portrait"
          />
          <img
            src={getSignalPieceAssetPath(identity.signalPieceId)}
            width={768}
            height={768}
            alt=""
            aria-hidden="true"
          />
          <span>{identity.initials}</span>
        </div>
      ) : null}
    </section>
  );
}
