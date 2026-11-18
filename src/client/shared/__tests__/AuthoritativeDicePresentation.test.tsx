// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthoritativeDicePresentation, buildDice, type AuthoritativeDiceModel } from "../AuthoritativeDicePresentation.js";

function model(overrides: Partial<AuthoritativeDiceModel> = {}): AuthoritativeDiceModel {
  return {
    id: "roll:seat-1:test",
    revision: 12,
    stage: "result",
    context: "test",
    actorName: "Mara",
    purpose: "Signal test",
    dice: buildDice([3, 5], ["Die 1", "Die 2"]),
    rawTotal: 8,
    modifiers: [{ label: "Equipment", value: 1 }],
    finalValue: 9,
    target: 8,
    outcome: "Success",
    ...overrides
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AuthoritativeDicePresentation", () => {
  it("renders every authoritative die, raw total, modifier, and final value", () => {
    render(<AuthoritativeDicePresentation model={model()} />);

    expect(screen.getByLabelText("Die 1: 3")).not.toBeNull();
    expect(screen.getByLabelText("Die 2: 5")).not.toBeNull();
    expect(screen.getByLabelText("Dice calculation").textContent).toContain("Raw roll 8");
    expect(screen.getByLabelText("Dice calculation").textContent).toContain("Equipment +1");
    expect(screen.getByLabelText("Dice calculation").textContent).toContain("Final 9");
    expect(screen.getByRole("status").textContent).toContain("Die 1 3, Die 2 5");
  });

  it("can render dice faces without headings or calculation details on phone", () => {
    render(<AuthoritativeDicePresentation model={model()} diceOnly />);

    expect(screen.getByLabelText("Die 1: 3")).not.toBeNull();
    expect(screen.getByLabelText("Die 2: 5")).not.toBeNull();
    expect(screen.queryByText("Signal test")).toBeNull();
    expect(screen.queryByLabelText("Dice calculation")).toBeNull();
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("authoritative-dice--dice-only")).toBe(true);
  });

  it("never fabricates a face in the ready or submitting state", () => {
    render(<AuthoritativeDicePresentation model={model({ stage: "ready", dice: buildDice([], ["Movement die"]), rawTotal: null, modifiers: [], finalValue: null, target: null, outcome: null })} />);

    expect(screen.getByLabelText("Movement die: pending")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/result appears after the server accepts/i)).not.toBeNull();
  });

  it("marks changed reroll faces without altering stable dice", () => {
    render(<AuthoritativeDicePresentation model={model({ dice: buildDice([3, 6], ["Die 1", "Die 2"], [3, 2]), rawTotal: 9, finalValue: 10 })} />);

    expect(screen.getByLabelText("Die 1: 3").textContent).not.toContain("Rerolled");
    expect(screen.getByLabelText(/Die 2: 6, rerolled from 2/i).textContent).toContain("2 → 6 · Rerolled");
  });

  it("animates only a live pending-to-result transition and settles once", () => {
    vi.useFakeTimers();
    const pending = model({ stage: "rolling", dice: buildDice([], ["Die 1", "Die 2"]), rawTotal: null, modifiers: [], finalValue: null, target: null, outcome: null });
    const { rerender } = render(<AuthoritativeDicePresentation model={pending} />);
    rerender(<AuthoritativeDicePresentation model={model()} />);

    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-animating")).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-settled")).toBe(true);
  });

  it("does not extend the dice tumble when a revision or modifier changes", () => {
    vi.useFakeTimers();
    const { rerender } = render(<AuthoritativeDicePresentation model={model()} animateOnMount />);
    act(() => vi.advanceTimersByTime(700));
    rerender(<AuthoritativeDicePresentation model={model({ revision: 99, finalValue: 10 })} animateOnMount />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-settled")).toBe(true);
    expect(screen.getByLabelText("Dice calculation").textContent).toContain("Final 10");
  });

  it("restores a completed result without replaying the tumble", () => {
    render(<AuthoritativeDicePresentation model={model()} />);
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-settled")).toBe(true);
    expect(screen.getByTestId("authoritative-dice-presentation").getAttribute("data-restored")).toBe("true");
  });

  it("can animate a newly mounted authoritative result when the caller knows it is unseen", () => {
    vi.useFakeTimers();
    render(<AuthoritativeDicePresentation model={model()} animateOnMount />);
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-animating")).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("authoritative-dice-presentation").classList.contains("is-settled")).toBe(true);
  });
});
