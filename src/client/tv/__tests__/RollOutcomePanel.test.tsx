// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OutcomeSummary } from "../../shared/types.js";
import { RollOutcomePanel } from "../../shared/RollOutcomePanel.js";

function createSummary(overrides: Partial<OutcomeSummary> = {}): OutcomeSummary {
  return {
    seatId: "seat-1",
    movedToSectorId: "ashwake-crossing",
    encounterCardId: "glass-chime-swarm",
    encounterTitle: "Glass Chime Swarm",
    encounterCardType: "hazard",
    checkStat: "signal",
    die1: 3,
    die2: 5,
    statBonus: 2,
    checkTotal: 10,
    difficulty: 9,
    success: true,
    summary: "Lane threads the swarm cleanly.",
    ...overrides
  };
}

describe("RollOutcomePanel", () => {
  it("renders the final die faces and success state from the patch payload", () => {
    const { container } = render(<RollOutcomePanel summary={createSummary()} title="Live roll" />);

    const dice = container.querySelectorAll("[data-face]");

    expect(dice?.[0]).toHaveAttribute("data-face", "3");
    expect(dice?.[1]).toHaveAttribute("data-face", "5");
    expect(container.querySelector("[data-testid='roll-state']")).toHaveTextContent(/success/i);
    expect(container.querySelector("[data-testid='roll-total']")).toHaveTextContent("10");
    expect(container.querySelector("[data-testid='roll-difficulty']")).toHaveTextContent("9");
    expect(container.querySelector("[data-testid='combat-dice-animation']")).toHaveTextContent("A 10 / D 9 / +2");
  });

  it("renders the failure state when the roll does not beat difficulty", () => {
    const { container } = render(
      <RollOutcomePanel
        summary={createSummary({
          die1: 2,
          die2: 1,
          statBonus: 2,
          checkTotal: 5,
          difficulty: 8,
          success: false
        })}
      />
    );

    expect(container.querySelector("[data-testid='roll-state']")).toHaveTextContent(/setback/i);
  });

  it("renders both player and enemy dice for opposed combat", () => {
    const { container } = render(
      <RollOutcomePanel
        summary={createSummary({
          encounterCardType: "enemy",
          encounterTitle: "Hook Runner",
          checkStat: "grit",
          die1: 6,
          die2: 5,
          statBonus: 2,
          checkTotal: 13,
          difficulty: 6,
          enemyDie1: 1,
          enemyDie2: 2,
          enemyBonus: 6,
          enemyTotal: 9,
          success: true
        })}
      />
    );

    const dice = container.querySelectorAll("[data-face]");

    expect(dice).toHaveLength(4);
    expect(container.querySelector("[data-testid='roll-total']")).toHaveTextContent("13");
    expect(container.querySelector("[data-testid='roll-enemy-total']")).toHaveTextContent("9");
    expect(container.querySelector("[data-testid='roll-state']")).toHaveTextContent(/victory/i);
    expect(container.querySelector("[data-testid='combat-result-token']")).toHaveTextContent("A 13 / D 9 / +2");
  });
});
