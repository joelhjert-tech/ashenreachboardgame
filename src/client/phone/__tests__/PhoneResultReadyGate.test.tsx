// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneResultReadyGate, type PhoneResultReadyGateProps } from "../PhoneResultReadyGate.js";

function props(overrides: Partial<PhoneResultReadyGateProps> = {}): PhoneResultReadyGateProps {
  return {
    actorName: "Mara",
    operativeName: "Sable Vey",
    operativeId: "sable-vey",
    sourceLabel: "Battle",
    challengeTitle: "Lantern-Ash Ghoul",
    challengeArtType: "threat",
    challengeArtId: "lantern-ash-ghoul",
    challengeFlavor: "It crosses the dead signal.",
    success: true,
    playerTotal: 9,
    targetTotal: 8,
    resolutionId: "roll:seat-1:ghoul",
    dice: [3, 5],
    modifierTotal: 1,
    outcomeTitle: "Threat defeated",
    outcomeText: "The ghoul falls.",
    outcomeEffects: ["Gain 1 Trophy."],
    resultDeltas: [],
    canContinue: true,
    onContinue: vi.fn(),
    ...overrides
  };
}

describe("PhoneResultReadyGate", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => cleanup());

  it("keeps the equipment tradeoff visible beside the primary reward choice", () => {
    render(<PhoneResultReadyGate {...props({ actionLabel: "Equip Signal Lantern", actionDetail: "Currently equipped: Oath Chain. If equipped: equipment bonus change Command -1, Signal +1." })} />);
    expect(screen.getByRole("button", { name: /Equip Signal Lantern.*Command -1, Signal \+1/ })).toBeVisible();
  });

  it("shows the authoritative result and consequences alongside the dice", () => {
    render(<PhoneResultReadyGate {...props()} />);

    expect(screen.getByLabelText("Die 1: 3")).toBeVisible();
    expect(screen.getByLabelText("Die 2: 5")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
    expect(screen.getByText("Lantern-Ash Ghoul")).toBeVisible();
    expect(screen.getByText("Threat defeated")).toBeVisible();
    expect(screen.getByText("Gain 1 Trophy.")).toBeVisible();
    expect(screen.getByText("Your total: 9")).toBeVisible();
    const breakdown = screen.getByRole("group", { name: "Roll breakdown" });
    expect(breakdown).toHaveTextContent(/Dice83 \+ 5Skill \+ effects\+1Total9Target8/);
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent("Target: 8");
    expect(document.querySelector("img")).toBeNull();
  });

  it("keeps the outcome visible when no dice were rolled", () => {
    render(<PhoneResultReadyGate {...props({ resolutionId: undefined, dice: [], success: null })} />);

    expect(screen.queryByTestId("authoritative-dice-presentation")).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-has-dice", "false");
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  });
});
