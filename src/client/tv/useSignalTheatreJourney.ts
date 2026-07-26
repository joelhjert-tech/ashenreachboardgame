import { useEffect, useMemo, useRef, useState } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { getSignalJourneyTiming } from "../shared/motionTokens.js";
import type { PublicPatchPayload, StatePatch } from "../shared/types.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import { getMovementArrivalModel, type MovementArrivalModel } from "./hostMovementPresentation.js";

export type SignalJourneyPhase = "departure" | "travel" | "arrival";

export interface SignalTheatreJourneyState {
  eventId: string;
  movement: MovementArrivalModel;
  route: string[];
  step: number;
  sectorId: string;
  phase: SignalJourneyPhase;
  crossingRings: boolean;
}

interface UseSignalTheatreJourneyInput {
  patch: StatePatch<PublicPatchPayload> | null;
  previousPatch: StatePatch<PublicPatchPayload> | null;
  synchronized: boolean;
  onCompleted?: (eventId: string) => void;
}

const MAX_COMPLETED_JOURNEYS = 64;

function rememberCompletedJourney(completed: Set<string>, eventId: string): void {
  completed.delete(eventId);
  completed.add(eventId);
  while (completed.size > MAX_COMPLETED_JOURNEYS) {
    const oldest = completed.values().next().value as string | undefined;
    if (!oldest) break;
    completed.delete(oldest);
  }
}

function crossesReachBoundary(route: readonly string[], step: number): boolean {
  const currentTier = getBoardSpace(route[step] ?? "")?.tier ?? null;
  const nextTier = getBoardSpace(route[step + 1] ?? "")?.tier ?? null;
  return Boolean(currentTier && nextTier && currentTier !== nextTier);
}

export function useSignalTheatreJourney({
  patch,
  previousPatch,
  synchronized,
  onCompleted
}: UseSignalTheatreJourneyInput): SignalTheatreJourneyState | null {
  const reducedMotion = useReducedMotion();
  const arrival = useMemo(
    () => synchronized
      ? getMovementArrivalModel(patch?.payload, previousPatch?.payload, patch?.sequence ?? 0)
      : null,
    [patch, previousPatch, synchronized]
  );
  const [journey, setJourney] = useState<SignalTheatreJourneyState | null>(null);
  const completedEventIdsRef = useRef(new Set<string>());
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    if (synchronized) return;
    setJourney((current) => {
      if (current) {
        rememberCompletedJourney(completedEventIdsRef.current, current.eventId);
      }
      return null;
    });
  }, [synchronized]);

  useEffect(() => {
    if (!synchronized || !arrival || completedEventIdsRef.current.has(arrival.eventId)) return;

    setJourney((current) => {
      if (current?.eventId === arrival.eventId) return current;
      const route = arrival.destination.route.length > 0
        ? arrival.destination.route
        : [arrival.destination.sectorId];
      const lastStep = Math.max(0, route.length - 1);
      const step = reducedMotion ? lastStep : 0;
      return {
        eventId: arrival.eventId,
        movement: arrival,
        route,
        step,
        sectorId: route[step] ?? arrival.destination.sectorId,
        phase: reducedMotion ? "arrival" : "departure",
        crossingRings: false
      };
    });
  }, [arrival, reducedMotion, synchronized]);

  useEffect(() => {
    if (!journey || !synchronized) return;
    const lastStep = Math.max(0, journey.route.length - 1);
    const timing = getSignalJourneyTiming(journey.phase, journey.crossingRings);

    const timeout = window.setTimeout(() => {
      if (journey.phase === "arrival") {
        rememberCompletedJourney(completedEventIdsRef.current, journey.eventId);
        setJourney(null);
        onCompletedRef.current?.(journey.eventId);
        return;
      }

      setJourney((current) => {
        if (!current || current.eventId !== journey.eventId) return current;

        if (current.phase === "departure") {
          if (lastStep === 0) {
            return {
              ...current,
              phase: "arrival",
              crossingRings: false
            };
          }
          const firstStep = 1;
          return {
            ...current,
            phase: "travel",
            step: firstStep,
            sectorId: current.route[firstStep] ?? current.movement.destination.sectorId,
            crossingRings: crossesReachBoundary(current.route, 0)
          };
        }

        if (current.step >= lastStep) {
          return {
            ...current,
            phase: "arrival",
            crossingRings: false
          };
        }

        const currentNextStep = Math.min(current.step + 1, lastStep);

        return {
          ...current,
          step: currentNextStep,
          sectorId: current.route[currentNextStep] ?? current.movement.destination.sectorId,
          phase: "travel",
          crossingRings: crossesReachBoundary(current.route, current.step)
        };
      });
    }, reducedMotion ? 90 : timing.holdMs);

    return () => window.clearTimeout(timeout);
  }, [journey, reducedMotion, synchronized]);

  return journey;
}
