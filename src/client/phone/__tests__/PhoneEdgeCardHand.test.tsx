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
  commitText: "Lock 4 as one die; the server rolls the other die."
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
          resolutionId: null
        }}
        seatId="seat-1"
        onIntent={vi.fn()}
      />
    );

    expect(screen.getByText("Edge Cards")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Echo Recast/i })).toBeDisabled();
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
          resolutionId: "resolution-1"
        }}
        seatId="seat-1"
        onIntent={onIntent}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Echo Recast/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "PLAY_EDGE_CARD",
      seatId: "seat-1",
      cardId: card.id,
      resolutionId: "resolution-1",
      mode: "commit-value"
    });
  });
});
