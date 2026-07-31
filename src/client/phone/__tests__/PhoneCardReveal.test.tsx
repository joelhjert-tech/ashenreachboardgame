// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CardRevealPresentation } from "../../shared/types.js";
import { PhoneCardReveal } from "../PhoneCardReveal.js";

const contractReveal: CardRevealPresentation = {
  id: "private-contract:1",
  revision: 12,
  kind: "draw",
  category: "contract",
  title: "The Quiet Relay",
  summary: "Reach the silent mast before the signal fails.",
  sourceLabel: "Private Contract draw",
  actorSeatId: "seat-1",
  actorDisplayName: "Mara",
  visibility: "owner",
  artType: "contract",
  artCardId: "the-quiet-relay"
};

describe("PhoneCardReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows owner-only card text, flips once, and does not replay after dismissal", () => {
    const first = render(<PhoneCardReveal reveal={contractReveal} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-reveal-stage", "sealed");
    expect(screen.getByRole("heading", { name: "The Quiet Relay" })).toBeVisible();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-reveal-stage", "ready");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    render(<PhoneCardReveal reveal={contractReveal} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the authoritative Affliction die without requiring card art", () => {
    render(<PhoneCardReveal reveal={{
      ...contractReveal,
      id: "private-affliction:1",
      category: "affliction",
      title: "Vein Static",
      sourceLabel: "Affliction drawn",
      artType: null,
      artCardId: null,
      die: 5
    }} />);
    expect(screen.getByLabelText("Authoritative die 5")).toBeVisible();
    expect(screen.getByTestId("phone-private-card-reveal")).toHaveAttribute("data-reveal-category", "affliction");
  });

  it("refuses a public reveal on the private overlay", () => {
    render(<PhoneCardReveal reveal={{ ...contractReveal, visibility: "public" }} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
