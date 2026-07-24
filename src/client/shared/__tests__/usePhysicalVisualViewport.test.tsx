// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePhysicalVisualViewport } from "../usePhysicalVisualViewport.js";

class VisualViewportStub extends EventTarget {
  width = 384;
  height = 722;
  offsetTop = 0;
  offsetLeft = 0;
}

function ViewportHarness() {
  const viewport = usePhysicalVisualViewport();
  return <output data-testid="viewport">{JSON.stringify(viewport)}</output>;
}

describe("physical Visual Viewport subscription", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--physical-visual-viewport-height");
    delete document.documentElement.dataset.keyboardConstrained;
  });

  it("publishes the physical height and keyboard-constrained state from one viewport source", async () => {
    const visualViewport = new VisualViewportStub();
    Object.defineProperty(window, "visualViewport", { configurable: true, value: visualViewport });
    Object.defineProperty(window.screen, "height", { configurable: true, value: 854 });
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });

    render(<ViewportHarness />);
    act(() => visualViewport.dispatchEvent(new Event("resize")));
    act(() => callbacks.shift()?.(0));
    expect(screen.getByTestId("viewport")).toHaveTextContent('"height":722');
    expect(document.documentElement.style.getPropertyValue("--physical-visual-viewport-height")).toBe("722px");

    visualViewport.height = 302;
    visualViewport.offsetTop = 226;
    act(() => visualViewport.dispatchEvent(new Event("resize")));
    act(() => callbacks.shift()?.(16));
    expect(screen.getByTestId("viewport")).toHaveTextContent('"keyboardConstrained":true');
    expect(document.documentElement.dataset.keyboardConstrained).toBe("true");
  });
});
