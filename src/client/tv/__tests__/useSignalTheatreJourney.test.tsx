// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicPatchPayload, StatePatch } from "../../shared/types.js";
import { hostPresentationTimings } from "../../shared/motionTokens.js";
import { useSignalTheatreJourney } from "../useSignalTheatreJourney.js";

vi.mock("../../shared/useReducedMotion.js", () => ({
  useReducedMotion: () => false
}));

function payload(sectorId: string, planner = false): PublicPatchPayload {
  return {
    seats: [{
      seatId: "seat-1",
      characterId: "char_bjornis",
      displayName: "Nera",
      connected: true,
      ready: true,
      kicked: false
    }],
    players: [{
      seatId: "seat-1",
      sectorId,
      character: { id: "char_bjornis", name: "Bjornis" }
    }],
    movementPlanner: planner ? {
      active: true,
      movementValue: 2,
      currentSectorId: "ashwake-crossing",
      currentSectorName: "Ashwake Crossing",
      selectedDestinationId: "ashen-chapel",
      destinations: [{
        sectorId: "ashen-chapel",
        name: "Ashen Chapel",
        ring: "middle",
        distance: 2,
        route: ["ashwake-crossing", "middle_guardian_span", "ashen-chapel"],
        routeNames: ["Ashwake Crossing", "Guardian Span", "Ashen Chapel"],
        tags: [],
        threatIcons: [],
        ruleText: "Resolve the public arrival.",
        faceUpThreats: [],
        occupants: [],
        strategicTags: []
      }]
    } : null
  } as PublicPatchPayload;
}

function patch(sectorId: string, planner: boolean, sequence: number): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "EMBER",
    sequence,
    phase: "broadcast",
    payload: payload(sectorId, planner)
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Signal Theatre authoritative journey", () => {
  it("holds departure, uses the longer cross-ring segment, then arrives once", () => {
    vi.useFakeTimers();
    const previousPatch = patch("ashwake-crossing", true, 11);
    const currentPatch = patch("ashen-chapel", false, 12);
    const { result } = renderHook(() => useSignalTheatreJourney({
      patch: currentPatch,
      previousPatch,
      synchronized: true
    }));

    expect(result.current).toMatchObject({
      sectorId: "ashwake-crossing",
      phase: "departure",
      step: 0
    });

    act(() => vi.advanceTimersByTime(hostPresentationTimings.movementStartMs));
    expect(result.current).toMatchObject({
      sectorId: "ashwake-crossing",
      phase: "travel",
      step: 0
    });

    act(() => vi.advanceTimersByTime(hostPresentationTimings.movementCrossRingMs - 1));
    expect(result.current?.sectorId).toBe("ashwake-crossing");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({
      sectorId: "middle_guardian_span",
      phase: "travel",
      step: 1,
      crossingRings: true
    });

    act(() => vi.advanceTimersByTime(hostPresentationTimings.movementSegmentMs));
    expect(result.current).toMatchObject({
      sectorId: "ashen-chapel",
      phase: "arrival",
      step: 2
    });

    act(() => vi.advanceTimersByTime(hostPresentationTimings.movementArrivalMs));
    expect(result.current).toBeNull();

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBeNull();
  });

  it("does not replay motion while restoring an authoritative stable patch", () => {
    vi.useFakeTimers();
    const currentPatch = patch("ashen-chapel", false, 12);
    const { result } = renderHook(() => useSignalTheatreJourney({
      patch: currentPatch,
      previousPatch: null,
      synchronized: true
    }));

    expect(result.current).toBeNull();
    act(() => vi.runAllTimers());
    expect(result.current).toBeNull();
  });

  it("does not animate while synchronization is incomplete", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSignalTheatreJourney({
      patch: patch("ashen-chapel", false, 12),
      previousPatch: patch("ashwake-crossing", true, 11),
      synchronized: false
    }));

    expect(result.current).toBeNull();
  });
});
