import { useEffect, useRef, type ReactElement } from "react";
import type { PublicMoveDestination, PublicTileChallenge } from "../shared/types.js";
import { BoardTileImage } from "./TalismanBoardSurface.js";

export interface HostMovementJourneyModel {
  eventId: string;
  operativeName: string;
  originName: string;
  destination: PublicMoveDestination;
}

export function HostMovementJourney({ model, step, arrived, challenges }: {
  model: HostMovementJourneyModel;
  step: number;
  arrived: boolean;
  challenges: PublicTileChallenge[];
}): ReactElement {
  const stageRef = useRef<HTMLElement>(null);
  const route = model.destination.route;
  const routeNames = model.destination.routeNames ?? route;
  const current = Math.min(Math.max(step, 0), Math.max(route.length - 1, 0));
  const visibleThreats = model.destination.faceUpThreats ?? [];

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [model.eventId]);

  return (
    <section ref={stageRef} className={`tv-movement-journey${arrived ? " is-arrived" : ""}`} data-testid="tv-movement-journey" aria-label={`Movement journey for ${model.operativeName}`} tabIndex={-1}>
      <header className="tv-movement-journey__header">
        <span>{arrived ? "Destination arrival" : "Movement journey"}</span>
        <strong>{model.operativeName}</strong>
        <p>{model.originName} to {model.destination.name}</p>
      </header>
      <div className="tv-movement-journey__status" aria-live="polite">
        <strong>{arrived ? `Arrived at ${model.destination.name}` : current === 0 ? `Departing ${model.originName}` : `Moving to ${routeNames[current] ?? model.destination.name}`}</strong>
        <span>Step {current + 1} / {Math.max(route.length, 1)}</span>
      </div>
      <ol className="tv-movement-journey__route" aria-label="Authoritative movement route">
        {route.map((sectorId, index) => (
          <li key={`${sectorId}-${index}`} className={index < current ? "is-complete" : index === current ? "is-current" : index === route.length - 1 ? "is-destination" : "is-upcoming"} data-route-step={index}>
            <div className="tv-movement-journey__tile-art">
              <BoardTileImage nodeId={sectorId} label={routeNames[index] ?? sectorId} className="tv-movement-journey__tile-image" />
              <span>{index === 0 ? "Origin" : index === route.length - 1 ? "Destination" : `Route ${index}`}</span>
              {index === current ? <i aria-label={`${model.operativeName} current position`}>Current</i> : null}
            </div>
            <strong>{routeNames[index] ?? sectorId}</strong>
          </li>
        ))}
      </ol>
      <section className="tv-movement-journey__arrival" aria-label="Destination public information">
        <div className="tv-movement-journey__destination">
          <div className="tv-movement-journey__destination-art">
            <BoardTileImage nodeId={model.destination.sectorId} label={model.destination.name} className="tv-movement-journey__tile-image" />
          </div>
          <span>Destination</span>
          <strong>{model.destination.name}</strong>
          <small>{model.destination.ring} reach</small>
          <p>{model.destination.ruleText}</p>
        </div>
        <div className="tv-movement-journey__destination-state">
          <span>Arrival state</span>
          {!arrived ? <strong>Sealed until arrival</strong> : (
            <div className="tv-movement-journey__challenge-columns">
              <section aria-label="Recurring challenges"><strong>Recurring challenges</strong>{challenges.length ? challenges.map((challenge) => <article key={challenge.id}><b>{challenge.name}</b><small>{challenge.challengeType} | {challenge.testStat} {challenge.difficulty} | recurring</small></article>) : <small>None revealed</small>}</section>
              <section aria-label="Visible threats"><strong>Visible threats</strong>{visibleThreats.length ? visibleThreats.map((threat) => <article key={threat.instanceId}><b>{threat.name}</b><small>{threat.challenge ? `${threat.challenge.stat} ${threat.challenge.value}` : threat.type}</small></article>) : <small>None visible</small>}</section>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
