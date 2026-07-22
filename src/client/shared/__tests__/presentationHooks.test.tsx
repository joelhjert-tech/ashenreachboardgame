// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { StrictMode, useRef, type ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFocusOnRevision } from "../useFocusOnRevision.js";
import { useReducedMotion } from "../useReducedMotion.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function FocusHarness({ revision }: { revision: string }): ReactElement {
  const ref = useRef<HTMLElement | null>(null);
  useFocusOnRevision(ref, revision, true);
  return <section ref={ref}><button type="button">Primary action</button></section>;
}

function MotionHarness(): ReactElement {
  return <span>{useReducedMotion() ? "Reduced" : "Full"}</span>;
}

describe("shared presentation hooks", () => {
  it("focuses the current primary action once per authoritative revision", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 1; });
    const { rerender } = render(<FocusHarness revision="one" />);
    const button = screen.getByRole("button", { name: "Primary action" });
    expect(button).toHaveFocus();
    button.blur();

    rerender(<FocusHarness revision="one" />);
    expect(button).not.toHaveFocus();
    rerender(<FocusHarness revision="two" />);
    expect(button).toHaveFocus();
  });

  it("reschedules focus after the development StrictMode effect cleanup", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });

    render(<StrictMode><FocusHarness revision="strict-one" /></StrictMode>);
    frames.forEach((callback) => callback(0));

    expect(screen.getByRole("button", { name: "Primary action" })).toHaveFocus();
  });

  it("reads the platform reduced-motion preference through one hook", () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let matches = true;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        get matches() { return matches; },
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
        removeEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true
      })
    });

    const { rerender } = render(<MotionHarness />);
    expect(screen.getByText("Reduced")).toBeInTheDocument();
    matches = false;
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    rerender(<MotionHarness />);
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});
