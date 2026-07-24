// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthoritativeResultCollapse } from "../useAuthoritativeResultCollapse.js";

afterEach(() => vi.useRealTimers());

describe("useAuthoritativeResultCollapse", () => {
  it("collapses a newly received authoritative result after exactly 100 ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ keyValue }) => useAuthoritativeResultCollapse(keyValue, 100),
      { initialProps: { keyValue: null as string | null } }
    );

    expect(result.current.collapsed).toBe(false);
    rerender({ keyValue: "roll:1" });
    expect(result.current.collapsed).toBe(false);

    act(() => vi.advanceTimersByTime(99));
    expect(result.current.collapsed).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.collapsed).toBe(true);
  });

  it("restores an existing result compactly and permits an explicit reopen", () => {
    const { result } = renderHook(() => useAuthoritativeResultCollapse("roll:restored", 100));
    expect(result.current.collapsed).toBe(true);
    act(() => result.current.expand());
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.collapse());
    expect(result.current.collapsed).toBe(true);
  });

  it("reopens for a reroll revision before applying the same bounded collapse", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ keyValue }) => useAuthoritativeResultCollapse(keyValue, 100),
      { initialProps: { keyValue: "roll:1" } }
    );
    expect(result.current.collapsed).toBe(true);
    rerender({ keyValue: "roll:2" });
    expect(result.current.collapsed).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.collapsed).toBe(true);
  });

  it("preserves the 100 ms reveal when the production view remounts between ready and result", () => {
    vi.useFakeTimers();
    const ready = renderHook(() => useAuthoritativeResultCollapse(null, 100, "movement:remount"), {
      wrapper: StrictMode
    });
    expect(ready.result.current.collapsed).toBe(false);
    ready.unmount();

    const resultView = renderHook(() => useAuthoritativeResultCollapse("roll:remounted", 100, "movement:remount"), {
      wrapper: StrictMode
    });
    expect(resultView.result.current.collapsed).toBe(false);
    act(() => vi.advanceTimersByTime(99));
    expect(resultView.result.current.collapsed).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(resultView.result.current.collapsed).toBe(true);
  });
});
