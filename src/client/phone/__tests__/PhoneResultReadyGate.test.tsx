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

  it("shows only authoritative dice and Continue for a completed phone roll", () => {
    render(<PhoneResultReadyGate {...props()} />);

    expect(screen.getByLabelText("Die 1: 3")).toBeVisible();
    expect(screen.getByLabelText("Die 2: 5")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
    expect(screen.queryByText("Lantern-Ash Ghoul")).not.toBeInTheDocument();
    expect(screen.queryByText("Threat defeated")).not.toBeInTheDocument();
    expect(screen.queryByText("Gain 1 Trophy.")).not.toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows only the required continuation control when no dice were rolled", () => {
    render(<PhoneResultReadyGate {...props({ resolutionId: undefined, dice: [], success: null })} />);

    expect(screen.queryByTestId("authoritative-dice-presentation")).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-has-dice", "false");
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  });
});
