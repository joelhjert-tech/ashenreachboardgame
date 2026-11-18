// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrophyUpgradePresentation } from "../../shared/types.js";
import {
  shouldPresentTrophyUpgrade,
  SignalTrophyUpgrade,
  type SignalTrophyUpgradeStage
} from "../SignalTrophyUpgrade.js";

const presentation: TrophyUpgradePresentation = {
  id: "stat-raised:EMBER:15:seat-1:signal",
  actorSeatId: "seat-1",
  actorDisplayName: "Nera",
  operativeName: "Bjornis",
  skill: "signal",
  skillLabel: "Signal",
  previousValue: 5,
  newValue: 6,
  totalCost: 6,
  spentTrophies: [
    { cardId: "archive-shade", name: "Archive Shade", originalValue: 1, spentValue: 1, remainingValue: 0, associatedSkill: "signal", cardType: "enemy" },
    { cardId: "choir-wraith", name: "Choir Wraith", originalValue: 2, spentValue: 2, remainingValue: 0, associatedSkill: "signal", cardType: "enemy" },
    { cardId: "cinder-veil-stalker", name: "Cinder-Veil Stalker", originalValue: 3, spentValue: 3, remainingValue: 0, associatedSkill: "grit", cardType: "enemy" }
  ],
  createdAt: "2026-08-03T12:00:00.000Z"
};

describe("SignalTrophyUpgrade", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("keeps the ceremony in progress when its completion callback changes", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<SignalTrophyUpgrade presentation={presentation} onSettled={first} />);
    act(() => vi.advanceTimersByTime(4000));
    rerender(<SignalTrophyUpgrade presentation={presentation} onSettled={latest} />);
    expect(screen.getByTestId("signal-trophy-upgrade")).toHaveAttribute("data-stage", "trophy-burn");
    act(() => vi.advanceTimersByTime(4000));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });

  it.each([
    "summon",
    "trophy-display",
    "trophy-burn",
    "flip",
    "minimize"
  ] as SignalTrophyUpgradeStage[])("renders the %s stage without canvas", (stage) => {
    render(<SignalTrophyUpgrade presentation={presentation} forcedStage={stage} />);
    expect(screen.getByTestId("signal-trophy-upgrade")).toHaveAttribute("data-stage", stage);
    expect(document.querySelector("canvas, webgl")).toBeNull();
  });

  it("shows the exact public receipt and canonical generated props", () => {
    const rendered = render(<SignalTrophyUpgrade presentation={presentation} forcedStage="trophy-display" />);
    expect(screen.getByText("Archive Shade")).toBeInTheDocument();
    expect(screen.getByText("Choir Wraith")).toBeInTheDocument();
    expect(screen.getByText("Cinder-Veil Stalker")).toBeInTheDocument();
    const sources = Array.from(rendered.container.querySelectorAll("img")).map((image) => image.getAttribute("src"));
    expect(sources).toContain("/assets/riftfall/ui/signal-theatre/trophy-upgrade/trophy-upgrade-crt.png");
    expect(sources).toContain("/assets/riftfall/ui/signal-theatre/trophy-upgrade/trophy-ledger-furnace.png");
    expect(sources).toContain("/assets/cards/threats/blue/archive-shade.png");
    expect(sources).toContain("/assets/cards/threats/red/cinder-veil-stalker.png");
  });

  it("shows partial spending and preserves the visible remainder", () => {
    render(<SignalTrophyUpgrade presentation={{
      ...presentation,
      totalCost: 4,
      spentTrophies: [{
        cardId: "hearth-ruin-behemoth",
        name: "Hearth-Ruin Behemoth",
        originalValue: 6,
        spentValue: 4,
        remainingValue: 2,
        associatedSkill: "grit",
        cardType: "enemy"
      }]
    }} forcedStage="trophy-burn" />);
    expect(screen.getByText("Spent 4 of 6")).toBeInTheDocument();
    expect(screen.getAllByText("2 remaining")).toHaveLength(2);
  });

  it("uses two readable rows for ten contributing cards", () => {
    render(<SignalTrophyUpgrade presentation={{
      ...presentation,
      previousValue: 9,
      newValue: 10,
      totalCost: 10,
      spentTrophies: Array.from({ length: 10 }, (_, index) => ({
        cardId: `one-${index}`,
        name: `Trophy ${index + 1}`,
        originalValue: 1,
        spentValue: 1,
        remainingValue: 0,
        associatedSkill: "signal" as const,
        cardType: "enemy"
      }))
    }} forcedStage="trophy-display" />);
    expect(screen.getByTestId("signal-trophy-upgrade")).toHaveAttribute("data-card-layout", "two-rows");
    expect(document.querySelectorAll(".signal-trophy-upgrade__receipt")).toHaveLength(10);
  });

  it("uses the Trophy token when restored legacy balance has no card art", () => {
    const rendered = render(<SignalTrophyUpgrade presentation={{
      ...presentation,
      totalCost: 3,
      spentTrophies: [{
        cardId: "trophy-reserve",
        name: "Trophy Reserve",
        originalValue: 3,
        spentValue: 3,
        remainingValue: 0,
        associatedSkill: null,
        cardType: "reserve"
      }]
    }} forcedStage="trophy-display" />);
    expect(rendered.container.querySelector<HTMLImageElement>(".signal-trophy-upgrade__receipt-art > img")?.src)
      .toContain("/assets/riftfall/tokens/token_trophy.png");
  });

  it("suppresses reconnect and already-seen replays", () => {
    expect(shouldPresentTrophyUpgrade({ presentation, previousPresentationId: undefined, synchronized: true })).toBe(false);
    expect(shouldPresentTrophyUpgrade({ presentation, previousPresentationId: null, synchronized: true })).toBe(true);
    expect(shouldPresentTrophyUpgrade({ presentation, previousPresentationId: "older", synchronized: false })).toBe(false);
    window.sessionStorage.setItem(`ashenreach:trophy-upgrade-seen:${presentation.id}`, "1");
    expect(shouldPresentTrophyUpgrade({ presentation, previousPresentationId: "older", synchronized: true })).toBe(false);
  });

  it("uses a static receipt for reduced motion and settles without gameplay commands", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true })
    });
    const onSettled = vi.fn();
    render(<SignalTrophyUpgrade presentation={presentation} onSettled={onSettled} />);
    expect(screen.getByTestId("signal-trophy-upgrade")).toHaveAttribute("data-stage", "trophy-display");
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.queryByTestId("signal-trophy-upgrade")).not.toBeInTheDocument();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("paces the full-motion ceremony across exactly eight seconds", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    });
    const onSettled = vi.fn();
    render(<SignalTrophyUpgrade presentation={presentation} onSettled={onSettled} />);

    const expectStage = (stage: SignalTrophyUpgradeStage) => {
      expect(screen.getByTestId("signal-trophy-upgrade")).toHaveAttribute("data-stage", stage);
    };
    expectStage("summon");
    act(() => vi.advanceTimersByTime(1200));
    expectStage("trophy-display");
    act(() => vi.advanceTimersByTime(2800));
    expectStage("trophy-burn");
    act(() => vi.advanceTimersByTime(1700));
    expectStage("flip");
    act(() => vi.advanceTimersByTime(1200));
    expectStage("minimize");
    act(() => vi.advanceTimersByTime(1099));
    expectStage("minimize");
    expect(onSettled).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("signal-trophy-upgrade")).not.toBeInTheDocument();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
