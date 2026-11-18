// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignalSectorResolutionModel } from "../signalSectorResolutionPresentation.js";
import { cardRevealPresentationTimings as timings } from "../../shared/motionTokens.js";
import {
  buildSignalCardRevealModel,
  buildSignalPublicCardRevealModel,
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

  it("reuses the card-flip theatre for public deck draws and acquired rewards", () => {
    const draw = buildSignalPublicCardRevealModel({
      id: "public-anomaly:1",
      revision: 8,
      kind: "draw",
      category: "anomaly",
      title: "Glasswake Chorus",
      summary: "The relay sings with a borrowed voice.",
      sourceLabel: "Anomaly deck",
      actorSeatId: "seat-1",
      actorDisplayName: "Joel",
      visibility: "public",
      artType: "anomaly",
      artCardId: "glasswake-chorus"
    }, "Ashwalk Bridge");
    const first = render(<SignalCardReveal model={draw} forcedStage="ready" />);
    expect(screen.getByText("The deck answers")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Glasswake Chorus" })).toBeVisible();
    first.unmount();

    const reward = buildSignalPublicCardRevealModel({
      id: "reward:1",
      revision: 9,
      kind: "reward",
      category: "equipment",
      title: "Rift Anchor Spike",
      summary: "+1 Forge",
      sourceLabel: "Encounter reward",
      actorSeatId: "seat-1",
      actorDisplayName: "Joel",
      visibility: "public",
      artType: "equipment",
      artCardId: "rift-anchor-spike"
    }, "Ashwalk Bridge");
    render(<SignalCardReveal model={reward} forcedStage="ready" />);
    expect(screen.getByText("Reward secured")).toBeVisible();
    expect(screen.getByText("Joel receives Rift Anchor Spike")).toBeVisible();
  });

  it("animates once and restores the stable reveal without replay", () => {
    const model = buildSignalCardRevealModel(baseResolution);
    const onReady = vi.fn();
    const { unmount } = render(<SignalCardReveal model={model} onReady={onReady} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "sealed");

    act(() => vi.advanceTimersByTime(timings.readyMs));
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "ready");
    expect(onReady).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(timings.completeMs - timings.readyMs));
    expect(onReady).toHaveBeenCalledOnce();
    unmount();

    render(<SignalCardReveal model={model} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "ready");
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-motion", "settled");
  });

  it("keeps its timeline through parent updates and calls the latest completion handler", () => {
    const model = buildSignalCardRevealModel(baseResolution);
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<SignalCardReveal model={model} onReady={first} />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<SignalCardReveal model={{ ...model }} onReady={latest} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "eject");
    act(() => vi.advanceTimersByTime(timings.turnMs - 1000));
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "turn");
    act(() => vi.advanceTimersByTime(timings.completeMs - timings.turnMs));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
    rerender(<SignalCardReveal model={{ ...model }} onReady={vi.fn()} />);
    expect(latest).toHaveBeenCalledOnce();
  });

  it("starts a new card sealed without inheriting the previous card's transform", () => {
    const model = buildSignalCardRevealModel(baseResolution);
    const { rerender } = render(<SignalCardReveal model={model} />);
    act(() => vi.advanceTimersByTime(timings.completeMs));
    rerender(<SignalCardReveal model={{ ...model, id: "next-card" }} />);
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "sealed");
  });

  it("settles immediately when reduced motion is enabled during the reveal", () => {
    let change: (() => void) | undefined;
    const media = { matches: false, addEventListener: (_event: string, handler: () => void) => { change = handler; }, removeEventListener: vi.fn() };
    vi.mocked(window.matchMedia).mockReturnValue(media as unknown as MediaQueryList);
    const onReady = vi.fn();
    render(<SignalCardReveal model={buildSignalCardRevealModel(baseResolution)} onReady={onReady} />);
    act(() => vi.advanceTimersByTime(500));
    act(() => { media.matches = true; change?.(); });
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-stage", "ready");
    expect(screen.getByTestId("signal-card-reveal")).toHaveAttribute("data-motion", "settled");
    act(() => vi.advanceTimersByTime(5000));
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("only owns authoritative pre-roll reveal stages", () => {
    expect(isSignalCardRevealStage(baseResolution)).toBe(true);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "battle_ready" })).toBe(true);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "rolling" })).toBe(false);
    expect(isSignalCardRevealStage({ ...baseResolution, stage: "result" })).toBe(false);
  });
});
