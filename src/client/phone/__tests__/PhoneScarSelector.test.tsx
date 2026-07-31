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
  it("shows one canonical choice at a time, switches between them, and submits one Scar only once", () => {
    const onChoose = vi.fn();
    render(<PhoneScarSelector cards={cards} source="mind" currentCount={0} thresholdWarning={false} onChoose={onChoose} />);

    expect(screen.getByRole("region", { name: /compare scar choices/i })).toBeVisible();
    expect(screen.getByText(/^choice a$/i)).toBeVisible();
    expect(screen.queryByText(/^choice b$/i)).not.toBeInTheDocument();
    expect(screen.getByText(cards[0]!.burdenText!)).toBeVisible();
    expect(screen.getByText(cards[0]!.adaptationText!)).toBeVisible();
    expect(screen.queryByText(cards[1]!.burdenText!)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inspect relay ghost/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /inspect choir static/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-scar-choice-art-scar-wound-12")).toHaveAttribute(
      "src",
      "/assets/cards/scars/scar-wound-12.phone.webp"
    );

    fireEvent.click(screen.getByRole("button", { name: /next scar/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/2 of 2choir static/i);
    expect(screen.getByText(/^choice b$/i)).toBeVisible();
    expect(screen.queryByText(cards[0]!.burdenText!)).not.toBeInTheDocument();
    expect(screen.getByText(cards[1]!.burdenText!)).toBeVisible();
    expect(screen.getByText(cards[1]!.adaptationText!)).toBeVisible();
    expect(screen.getByRole("button", { name: /inspect choir static/i })).toBeVisible();

    const accept = screen.getByRole("button", { name: /accept choir static/i });
    fireEvent.click(accept);
    fireEvent.click(accept);

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("scar-wound-13");
    expect(accept).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous scar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next scar/i })).toBeDisabled();
  });

  it("keeps the retirement warning above the primary comparison", () => {
    const onChoose = vi.fn();
    render(<PhoneScarSelector cards={cards} source="mind" currentCount={2} thresholdWarning onChoose={onChoose} />);

    expect(screen.getByText(/your next scar will break this operative/i)).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent(/review each/i);
    expect(screen.getByRole("button", { name: /accept relay ghost/i })).toHaveTextContent(/break the operative/i);
    expect(screen.queryByRole("dialog", { name: /compare both scars/i })).not.toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
