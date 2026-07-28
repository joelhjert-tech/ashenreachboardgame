// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignalSectorResolutionModel } from "../signalSectorResolutionPresentation.js";
import {
  buildSignalCardRevealModel,
  isSignalCardRevealStage,
  SignalCardReveal
} from "../SignalCardReveal.js";

const baseResolution: SignalSectorResolutionModel = {
  id: "battle:card-reveal",
  revision: 4,
  stage: "encounter_intro",
  mode: "battle",
  tone: "neutral",
  actorSeatId: "seat-1",
  actorDisplayName: "Joel",
  locationName: "Ashwalk Bridge",
  title: "Latchspire Raider",
  eyebrow: "Hostile contact",
  publicSummary: "A chainbound raider descends through the failing signal mast.",
  stat: "grit",
  statLabel: "Grit",
  operative: { name: "Joel", secondaryName: "Bjornis", baseValue: null, modifiers: [], rawDice: [], diceTotal: null, finalTotal: null },
  operativeImageKey: "char_bjornis",
  opposition: { name: "Latchspire Raider", secondaryName: "Opposition", baseValue: 7, modifiers: [], rawDice: [], diceTotal: null, finalTotal: 7 },
  oppositionImageKey: "latchspire-raider",
  oppositionArtKind: "threat",
  oppositionFixed: false,
  outcomeLabel: "RESOLVING",
  outcomeCopy: "Awaiting roll.",
  publicConsequence: null,
  publicReward: null,
  waitingCopy: null,
  restored: false,
  sequence: ["Engage", "Dice", "Calculation", "Result"],
  activeSequenceIndex: 0
};

describe("SignalCardReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders public identity and next action without dice, totals, or outcome", () => {
    const model = buildSignalCardRevealModel(baseResolution);
    render(<SignalCardReveal model={model} forcedStage="ready" />);

    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-card-category", "enemy");
    expect(screen.getByRole("heading", { name: "Latchspire Raider" })).toBeInTheDocument();
    expect(screen.getByText("Joel must roll Grit")).toBeInTheDocument();
    expect(screen.queryByText(/difficulty|total|success|failure/i)).not.toBeInTheDocument();
    expect(document.querySelector("canvas, webgl")).toBeNull();
  });

  it("uses test language and the canonical stat theme for hazards", () => {
    const model = buildSignalCardRevealModel({
      ...baseResolution,
      id: "hazard:card-reveal",
      mode: "tile-challenge",
      title: "Mirror-Rot Interference",
      stat: "guile",
      statLabel: "Guile",
      opposition: { ...baseResolution.opposition, secondaryName: "Hazard" }
    });
    render(<SignalCardReveal model={model} forcedStage="ready" />);

    expect(screen.getByText("Joel must test Guile")).toBeInTheDocument();
    expect(screen.getByTestId("signal-card-reveal").style.getPropertyValue("--challenge-color")).toBe("#4FBF78");
  });

  it("animates once and restores the stable reveal without replay", () => {
    const model = buildSignalCardRevealModel(baseResolution);
    const { unmount } = render(<SignalCardReveal model={model} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "sealed");

    act(() => vi.advanceTimersByTime(3260));
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "ready");
    unmount();

    render(<SignalCardReveal model={model} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "ready");
  });

  it("only owns authoritative pre-roll reveal stages", () => {
    expect(isSignalCardRevealStage(baseResolution)).toBe(true);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "battle_ready" })).toBe(true);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "rolling" })).toBe(false);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "result" })).toBe(false);
  });
});
