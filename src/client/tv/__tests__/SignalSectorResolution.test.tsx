// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignalSectorResolution } from "../SignalSectorResolution.js";
import type { SignalSectorResolutionModel } from "../signalSectorResolutionPresentation.js";

function model(overrides: Partial<SignalSectorResolutionModel> = {}): SignalSectorResolutionModel {
  return {
    id: "resolution-1",
    revision: 1,
    stage: "result",
    mode: "battle",
    tone: "success",
    actorSeatId: "seat-1",
    actorDisplayName: "Nera",
    locationName: "Scorched Road",
    title: "Latchspire Raider",
    eyebrow: "Hostile contact",
    publicSummary: "A raider bars the crossing.",
    stat: "grit",
    statLabel: "Grit",
    operative: {
      name: "Bjornis",
      secondaryName: null,
      baseValue: 4,
      modifiers: [{ label: "Relic blade", value: 1 }],
      rawDice: [5],
      diceTotal: 5,
      finalTotal: 10
    },
    operativeImageKey: "char_bjornis",
    opposition: {
      name: "Latchspire Raider",
      secondaryName: null,
      baseValue: 3,
      modifiers: [],
      rawDice: [4],
      diceTotal: 4,
      finalTotal: 7
    },
    oppositionImageKey: "latchspire-raider",
    oppositionArtKind: "threat",
    oppositionFixed: false,
    outcomeLabel: "SUCCESS",
    outcomeCopy: "The raider is driven from the sector.",
    publicConsequence: "The raider is driven from the sector.",
    publicReward: "Gain 1 trophy.",
    waitingCopy: null,
    restored: false,
    sequence: ["Engage", "Dice", "Calculation", "Result"],
    activeSequenceIndex: 3,
    ...overrides
  };
}

describe("SignalSectorResolution", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
  });

  it("combines the existing operative and enemy portraits for an opposed battle", () => {
    const rendered = render(<SignalSectorResolution model={model()} />);
    const operative = screen.getByAltText("Bjornis portrait");
    const opposition = screen.getByAltText("Latchspire Raider portrait");

    expect(operative).toHaveAttribute("src", "/assets/riftfall/characters/char_bjornis.png");
    expect(opposition).toHaveAttribute("src", "/assets/cards/threats/yellow/latchspire-raider.png");
    expect(rendered.container.querySelectorAll("canvas")).toHaveLength(0);
    expect(rendered.container.querySelector(".signal-sector-resolution__result-crest")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/results/success.png"
    );
  });

  it("flies authoritative dice into a CSS cube reveal without Canvas or WebGL", () => {
    const rendered = render(<SignalSectorResolution model={model({
      operative: {
        name: "Bjornis",
        secondaryName: null,
        baseValue: 4,
        modifiers: [{ label: "Relic blade", value: 1 }],
        rawDice: [3, 4],
        diceTotal: 7,
        finalTotal: 12
      }
    })} />);

    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-dice-cinema", "playing");
    expect(screen.getByRole("img", { name: "Authoritative roll 3 and 4. Grit total 12." })).toBeVisible();
    expect(rendered.container.querySelectorAll("[data-die-value]")).toHaveLength(2);
    expect(rendered.container.querySelector("[data-die-value='3']")).toHaveStyle({
      "--signal-die-texture": "url(\"/assets/riftfall/ui/signal-theatre/dice/ashenreach-die-face.webp\")"
    });
    expect(rendered.container.querySelectorAll(".signal-sector-resolution__die-face")).toHaveLength(12);
    expect(rendered.container.querySelectorAll("canvas")).toHaveLength(0);
    expect(rendered.container.querySelectorAll("model-viewer")).toHaveLength(0);
  });

  it("does not invent dice cinema before an authoritative battle roll", () => {
    const rendered = render(<SignalSectorResolution model={model({
      stage: "battle_ready",
      tone: "neutral",
      operative: {
        name: "Bjornis",
        secondaryName: null,
        baseValue: 4,
        modifiers: [],
        rawDice: [],
        diceTotal: null,
        finalTotal: null
      },
      outcomeLabel: "RESOLVING",
      outcomeCopy: "Roll when ready.",
      publicConsequence: null,
      publicReward: null
    })} />);

    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-dice-cinema", "settled");
    expect(rendered.container.querySelector(".signal-sector-resolution__dice-cinema")).not.toBeInTheDocument();
  });

  it("uses the selected crest-and-text result treatment for success and defeat", () => {
    const first = render(<SignalSectorResolution model={model()} />);
    expect(screen.getByRole("status")).toHaveAttribute("data-result-visual", "crest");
    expect(screen.getByText("SUCCESS")).toBeVisible();
    first.unmount();

    render(<SignalSectorResolution model={model({
      id: "resolution-defeat",
      tone: "failure",
      outcomeLabel: "FAILURE"
    })} />);
    expect(screen.getByRole("status")).toHaveAttribute("data-result-visual", "crest");
    expect(document.querySelector(".signal-sector-resolution__result-crest")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/results/defeat.png"
    );
    expect(screen.getByText("FAILURE")).toBeVisible();
  });

  it("uses existing challenge art and exposes only authoritative totals", () => {
    render(<SignalSectorResolution model={model({
      mode: "tile-challenge",
      title: "Rift Whispers",
      stat: "signal",
      statLabel: "Signal",
      opposition: {
        name: "Rift Whispers",
        secondaryName: "Sector challenge",
        baseValue: 8,
        modifiers: [],
        rawDice: [],
        diceTotal: null,
        finalTotal: 8
      },
      oppositionImageKey: "rift-whispers",
      oppositionArtKind: "threat",
      oppositionFixed: true,
      sequence: ["Sector", "Test", "Calculation", "Result"]
    })} />);

    expect(screen.getByAltText("Rift Whispers challenge artwork")).toHaveAttribute(
      "src",
      "/assets/cards/threats/blue/rift-whispers.png"
    );
    expect(screen.getAllByText("Total")).toHaveLength(2);
    expect(screen.queryByText("Base")).not.toBeInTheDocument();
    expect(screen.queryByText("Dice")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw")).not.toBeInTheDocument();
    expect(screen.queryByText(/Relic blade|No public modifiers/)).not.toBeInTheDocument();
  });

  it("keeps public location context while private reaction details stay off the host", () => {
    const rendered = render(<SignalSectorResolution model={model({
      id: "resolution-private-reaction",
      stage: "reaction_available",
      tone: "neutral",
      outcomeLabel: "RESOLVING",
      outcomeCopy: "Awaiting Nera's private decision.",
      publicConsequence: null,
      publicReward: null,
      waitingCopy: "Awaiting Nera's private decision."
    })} />);

    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-resolution-stage", "reaction_available");
    expect(screen.getByText(/Scorched Road/)).toBeVisible();
    expect(screen.getAllByText("Awaiting Nera's private decision.").length).toBeGreaterThan(0);
    expect(rendered.container).not.toHaveTextContent(/Hollow Reflection|remaining use|reroll die/i);
  });

  it("presents a Hazard as a total-only Trial Theatre confrontation", () => {
    const rendered = render(<SignalSectorResolution model={model({
      id: "hazard-review",
      mode: "sector-test",
      title: "Mirror-Rot Interference",
      eyebrow: "Hazard trial",
      stat: "guile",
      statLabel: "Guile",
      operative: {
        name: "Bjornis",
        secondaryName: null,
        baseValue: 5,
        modifiers: [],
        rawDice: [7],
        diceTotal: 7,
        finalTotal: 12
      },
      opposition: {
        name: "Mirror-Rot Interference",
        secondaryName: "Hazard",
        baseValue: 11,
        modifiers: [],
        rawDice: [],
        diceTotal: null,
        finalTotal: 11
      },
      oppositionImageKey: "mirror-rot-interference",
      oppositionFixed: true
    })} />);

    expect(screen.getByLabelText("Sector challenge: Mirror-Rot Interference")).toBeVisible();
    expect(screen.getByText("Hazard")).toBeVisible();
    expect(screen.getByAltText("Mirror-Rot Interference challenge artwork")).toHaveAttribute(
      "src",
      "/assets/cards/threats/blue/mirror-rot-interference.png"
    );
    expect(rendered.container.querySelector(".signal-sector-resolution__trial-seal img")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/stat-seals/guile.png"
    );
    expect(screen.getAllByText("Total")).toHaveLength(2);
    expect(screen.queryByText("Base")).not.toBeInTheDocument();
    expect(screen.queryByText("Dice")).not.toBeInTheDocument();
  });

  it("marks a previously seen resolution as restored instead of replaying its entrance", () => {
    vi.useFakeTimers();
    const first = render(<SignalSectorResolution model={model()} />);
    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-resolution-restored", "false");
    act(() => vi.advanceTimersByTime(900));
    first.unmount();

    render(<SignalSectorResolution model={model()} />);
    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-resolution-restored", "true");
    expect(screen.getByTestId("signal-sector-resolution")).toHaveAttribute("data-dice-cinema", "settled");
    expect(document.querySelector(".signal-sector-resolution__dice-cinema")).not.toBeInTheDocument();
  });

  it("orchestrates a cinematic reveal and removes it for reduced motion", () => {
    const css = readFileSync(resolve("src/client/tv/SignalSectorResolution.css"), "utf8");

    expect(css).toContain("@keyframes signal-duel-operative");
    expect(css).toContain("@keyframes signal-duel-opposition");
    expect(css).toContain("@keyframes signal-duel-fracture");
    expect(css).toContain("@keyframes signal-trial-seal-activate");
    expect(css).toContain("@keyframes signal-duel-total");
    expect(css).toContain("@keyframes signal-die-flight");
    expect(css).toContain("@keyframes signal-die-tumble");
    expect(css).toContain("@keyframes signal-die-number-reveal");
    expect(css).toContain(".signal-sector-resolution__dice-cinema");
    expect(css).toContain("--rift-accent: var(--challenge-color");
    expect(css).toContain("drop-shadow(-.22rem 0 .35rem var(--rift-accent))");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
    expect(css).toContain("inset: 0;");
    expect(css).toContain("display: none;");
  });
});
