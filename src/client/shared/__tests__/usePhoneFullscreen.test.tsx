// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePhoneFullscreen } from "../usePhoneFullscreen.js";

describe("phone fullscreen controller", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: undefined });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: undefined });
  });

  it("enters only after an explicit request and tracks the browser change event", async () => {
    const request = vi.fn(async () => undefined);
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: request });
    const { result } = renderHook(() => usePhoneFullscreen());

    expect(result.current.supported).toBe(true);
    expect(request).not.toHaveBeenCalled();
    await act(async () => result.current.enter());
    expect(request).toHaveBeenCalledWith({ navigationUI: "hide" });

    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: document.documentElement });
    act(() => document.dispatchEvent(new Event("fullscreenchange")));
    expect(result.current.active).toBe(true);
  });

  it("reports a safe fallback when the browser refuses entry", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn(async () => Promise.reject(new Error("denied")))
    });
    const { result } = renderHook(() => usePhoneFullscreen());
    await act(async () => result.current.enter());
    expect(result.current.active).toBe(false);
    expect(result.current.errorMessage).toMatch(/refused by the browser/i);
  });

  it("contains a browser refusal to exit without throwing", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: vi.fn() });
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: document.documentElement });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(async () => Promise.reject(new Error("denied")))
    });
    const { result } = renderHook(() => usePhoneFullscreen());
    await act(async () => result.current.exit());
    expect(result.current.errorMessage).toMatch(/could not be closed/i);
  });
});
