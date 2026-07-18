// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhonePatchPayload } from "../../shared/types.js";
import { CinderWattleAbilityPanel } from "../CinderWattleAbilityPanel.js";

afterEach(cleanup);

function patch(action: NonNullable<PhonePatchPayload["characterAbilityAction"]>): PhonePatchPayload {
  return { characterAbilityAction: action } as PhonePatchPayload;
}

describe("CinderWattleAbilityPanel", () => {
  it("submits the typed owner ability before the known test", () => {
    const onIntent = vi.fn();
    render(<CinderWattleAbilityPanel patch={patch({
      abilityId: "scrap-crowned-instinct",
      name: "Scrap-Crowned Instinct",
      stat: "signal",
      sourceTitle: "Severed Signal",
      value: 1,
      available: true,
      usedThisRound: false,
      prepared: false,
      disabledReason: null
    })} seatId="seat-1" onIntent={onIntent} />);

    expect(screen.getByText(/add \+1 signal before rolling severed signal/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /use \+1 instinct/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
  });

  it("shows prepared and used states without offering another activation", () => {
    const { rerender } = render(<CinderWattleAbilityPanel patch={patch({
      abilityId: "scrap-crowned-instinct", name: "Scrap-Crowned Instinct", stat: "grit", sourceTitle: "Ash Raider",
      value: 1, available: false, usedThisRound: true, prepared: true, disabledReason: "Prepared for this roll."
    })} seatId="seat-1" onIntent={vi.fn()} />);
    expect(screen.getByRole("button", { name: /\+1 prepared/i })).toBeDisabled();

    rerender(<CinderWattleAbilityPanel patch={patch({
      abilityId: "scrap-crowned-instinct", name: "Scrap-Crowned Instinct", stat: null, sourceTitle: null,
      value: 1, available: false, usedThisRound: true, prepared: false, disabledReason: "Used this round. Resets after the round ends."
    })} seatId="seat-1" onIntent={vi.fn()} />);
    expect(screen.getByRole("button", { name: /used this round/i })).toBeDisabled();
  });
});
