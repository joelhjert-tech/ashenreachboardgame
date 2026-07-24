// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSignalTheatreEnvironmentPreloadPaths,
  resetSignalTheatreEnvironmentPreloadCacheForTests,
  useSignalTheatreEnvironmentPreload
} from "../useSignalTheatreEnvironmentPreload.js";

const route = [
  "ashwake-crossing",
  "middle_guardian_span",
  "ashen-chapel",
  "inner_cinder_lattice"
];

describe("Signal Theatre environment preloading", () => {
  const requestedPaths: string[] = [];

  beforeEach(() => {
    requestedPaths.length = 0;
    resetSignalTheatreEnvironmentPreloadCacheForTests();
    class MockImage {
      decoding = "auto";
      decode = vi.fn().mockResolvedValue(undefined);

      set src(value: string) {
        requestedPaths.push(value);
      }
    }
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects only the next two unique route environments", () => {
    expect(getSignalTheatreEnvironmentPreloadPaths(route, 0)).toEqual([
      "/assets/riftfall/environments/signal-theatre/sectors/middle_guardian_span.png",
      "/assets/riftfall/environments/signal-theatre/sectors/ashen-chapel.png"
    ]);
    expect(getSignalTheatreEnvironmentPreloadPaths([
      "ashwake-crossing",
      "middle_guardian_span",
      "middle_guardian_span",
      "ashen-chapel"
    ], 0)).toHaveLength(2);
  });

  it("does not request the same environment twice across rerenders", () => {
    const { rerender } = renderHook(
      ({ step }: { step: number }) => useSignalTheatreEnvironmentPreload(route, step),
      { initialProps: { step: 0 } }
    );
    expect(requestedPaths).toEqual([
      "/assets/riftfall/environments/signal-theatre/sectors/middle_guardian_span.png",
      "/assets/riftfall/environments/signal-theatre/sectors/ashen-chapel.png"
    ]);

    rerender({ step: 1 });
    expect(requestedPaths).toEqual([
      "/assets/riftfall/environments/signal-theatre/sectors/middle_guardian_span.png",
      "/assets/riftfall/environments/signal-theatre/sectors/ashen-chapel.png",
      "/assets/riftfall/environments/signal-theatre/sectors/inner_cinder_lattice.png"
    ]);
  });
});
