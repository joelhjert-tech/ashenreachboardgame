// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneEdgeCardHand } from "../PhoneEdgeCardHand.js";

afterEach(cleanup);

const card = {
  id: "edge-echo-recast",
  name: "Echo Recast",
  edgeValue: 4 as const,
  commitText: "Lock 4 as one die; the server rolls the other die.",
  abilityText: "Reroll one battle or Challenge die.",
  tradeoffText: "Accept the second result.",
  ability: {
    label: "Reroll one die",
    enabled: false,
    disabledReason: "Available after the roll.",
    resolutionId: null,
    targets: [] as Array<{ id: string; label: string }>
  }
};

describe("PhoneEdgeCardHand", () => {
  it("shows the randomly awarded private card while its timing is locked", () => {
    render(
      <PhoneEdgeCardHand
        hand={{
          cards: [card],
          limit: 2,
          awardRule: "Random awards only.",
          canCommit: false,
          disabledReason: "Available during your battle or hazard setup.",
          resolutionId: null,
          reaction: null
        }}
        seatId="seat-1"
        onIntent={vi.fn()}
      />
    );

    expect(screen.getByText("Edge Cards")).toBeInTheDocument();
    expect(document.querySelector<HTMLImageElement>(".phone-edge-card__art img"))
      .toHaveAttribute("src", "/assets/cards/edge/edge-echo-recast.phone.webp");
    expect(screen.getByRole("button", { name: /commit 4 as die/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reroll one die/i })).toBeDisabled();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("submits the exact owned card and authoritative resolution when committed", () => {
    const onIntent = vi.fn();
    render(
      <PhoneEdgeCardHand
        hand={{
          cards: [card],
          limit: 2,
          awardRule: "Random awards only.",
          canCommit: true,
          disabledReason: null,
          resolutionId: "resolution-1",
          reaction: null
        }}
        seatId="seat-1"
        onIntent={onIntent}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /commit 4 as die/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "PLAY_EDGE_CARD",
      seatId: "seat-1",
      cardId: card.id,
      resolutionId: "resolution-1",
      mode: "commit-value"
    });
  });

  it("submits a targeted ability and can decline the private reaction", () => {
    const onIntent = vi.fn();
    render(
      <PhoneEdgeCardHand
        hand={{
          cards: [{
            ...card,
            ability: {
              label: "Reroll one die",
              enabled: true,
              disabledReason: null,
              resolutionId: "resolution-2",
              targets: [{ id: "1", label: "Reroll die 2 (1)" }]
            }
          }],
          limit: 2,
          awardRule: "Random awards only.",
          canCommit: false,
          disabledReason: "The roll is already visible.",
          resolutionId: null,
          reaction: { id: "edge-reaction:resolution-2", prompt: "Use or continue." }
        }}
        seatId="seat-1"
        onIntent={onIntent}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reroll die 2 (1)" }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "PLAY_EDGE_CARD",
      seatId: "seat-1",
      cardId: card.id,
      resolutionId: "resolution-2",
      mode: "ability",
      targetId: "1"
    });

    fireEvent.click(screen.getByRole("button", { name: /continue without an edge ability/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "DECLINE_EDGE_CARD_REACTION",
      seatId: "seat-1",
      reactionId: "edge-reaction:resolution-2"
    });
  });
});
