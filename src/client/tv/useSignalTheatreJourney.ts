import { useEffect, useMemo, useRef, useState } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { hostPresentationTimings } from "../shared/motionTokens.js";
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
}

export function useSignalTheatreJourney({
  patch,
  previousPatch,
  synchronized
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
    if (!journey) return;
    const lastStep = Math.max(0, journey.route.length - 1);
    const nextStep = Math.min(journey.step + 1, lastStep);
    const currentTier = getBoardSpace(journey.route[journey.step] ?? "")?.tier ?? null;
    const nextTier = getBoardSpace(journey.route[nextStep] ?? "")?.tier ?? null;
    const crossingNextSegment = Boolean(
      journey.phase === "travel"
      && journey.step < lastStep
      && currentTier
      && nextTier
      && currentTier !== nextTier
    );

    const timeout = window.setTimeout(() => {
      setJourney((current) => {
        if (!current || current.eventId !== journey.eventId) return current;

        if (current.phase === "arrival") {
          completedEventIdsRef.current.add(current.eventId);
          return null;
        }

        if (current.phase === "departure") {
          return {
            ...current,
            phase: "travel",
            crossingRings: false
          };
        }

        const currentNextStep = Math.min(current.step + 1, lastStep);
        const currentTier = getBoardSpace(current.route[current.step] ?? "")?.tier ?? null;
        const nextTier = getBoardSpace(current.route[currentNextStep] ?? "")?.tier ?? null;
        const crossingRings = Boolean(currentTier && nextTier && currentTier !== nextTier);

        return {
          ...current,
          step: currentNextStep,
          sectorId: current.route[currentNextStep] ?? current.movement.destination.sectorId,
          phase: currentNextStep >= lastStep ? "arrival" : "travel",
          crossingRings
        };
      });
    }, reducedMotion
      ? 90
      : journey.phase === "arrival"
        ? hostPresentationTimings.movementArrivalMs
        : journey.phase === "departure"
          ? hostPresentationTimings.movementStartMs
          : crossingNextSegment
            ? hostPresentationTimings.movementCrossRingMs
            : hostPresentationTimings.movementSegmentMs);

    return () => window.clearTimeout(timeout);
  }, [journey, reducedMotion]);

  return journey;
}
