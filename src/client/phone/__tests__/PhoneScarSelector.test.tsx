// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScarSummary } from "../../shared/types.js";
import { PhoneScarSelector } from "../PhoneScarSelector.js";

const cards: ScarSummary[] = [
  {
    id: "scar-wound-12",
    title: "Relay Ghost",
    text: "A dead relay keeps repeating the operative's name.",
    trigger: "Remote signal test",
    penalty: "Remote Signal -1.",
    relief: "Return to a relay.",
    source: "mind",
    burdenText: "The first Signal test away from a relay or shrine each round suffers -1.",
    adaptationText: "Once per round at a relay or shrine, privately inspect the next Blue Threat without reordering it."
  },
  {
    id: "scar-wound-13",
    title: "Choir Static",
    text: "The chorus waits behind every transmission.",
    trigger: "Escalation advance",
    penalty: "Escalation wounds the operative.",
    relief: "Silence the chorus.",
    source: "mind",
    burdenText: "The first Escalation advance during your turn each round inflicts 1 Wound.",
    adaptationText: "Once per round, gain +1 Signal against an Escalation test."
  }
];

afterEach(cleanup);

describe("PhoneScarSelector", () => {
  it("moves through canonical choices and submits the focused Scar only once", () => {
    const onChoose = vi.fn();
    render(<PhoneScarSelector cards={cards} source="mind" currentCount={0} thresholdWarning={false} onChoose={onChoose} />);

    expect(screen.getByText(/1 of 2/i)).toBeVisible();
    expect(screen.getByText(cards[0]!.burdenText!)).toBeVisible();
    expect(screen.getByText(cards[0]!.adaptationText!)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /next scar/i }));
    expect(screen.getByText(/2 of 2/i)).toBeVisible();
    const accept = screen.getByRole("button", { name: /accept choir static/i });
    fireEvent.click(accept);
    fireEvent.click(accept);

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("scar-wound-13");
    expect(accept).toBeDisabled();
  });

  it("shows the retirement warning and compares both choices without selecting either", () => {
    const onChoose = vi.fn();
    render(<PhoneScarSelector cards={cards} source="mind" currentCount={2} thresholdWarning onChoose={onChoose} />);

    expect(screen.getByText(/your next scar will break this operative/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /compare both/i }));

    expect(screen.getByRole("dialog", { name: /compare both scars/i })).toBeVisible();
    expect(screen.getAllByText("Relay Ghost").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Choir Static").length).toBeGreaterThan(0);
    expect(screen.getByText(cards[0]!.text)).toBeVisible();
    expect(screen.getByText(cards[1]!.text)).toBeVisible();
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog", { name: /compare both scars/i })).not.toBeInTheDocument();
  });
});
