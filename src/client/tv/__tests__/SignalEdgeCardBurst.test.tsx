// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PublicEdgeCardPlay } from "../../shared/types.js";
import { SignalEdgeCardBurst } from "../SignalEdgeCardBurst.js";

const play: PublicEdgeCardPlay = {
  id: "edge-play:seat-1:resolution-1:edge-echo-recast:9",
  actorSeatId: "seat-1",
  actorDisplayName: "Joel",
  cardId: "edge-echo-recast",
  cardName: "Echo Recast",
  edgeValue: 4,
  mode: "commit-value",
  resolutionId: "resolution-1",
  publicSummary: "Joel burned Echo Recast. 4 is locked as one die.",
  createdAt: "2026-07-31T12:00:00.000Z"
};

describe("SignalEdgeCardBurst", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it("uses the generated charge frame during the reveal phase", () => {
    render(<SignalEdgeCardBurst play={play} forcedStage="charge" />);

    expect(screen.getByTestId("signal-edge-card-burst")).toHaveAttribute("data-stage", "charge");
    expect(screen.getByRole("heading", { name: "Echo Recast", level: 1 })).toBeInTheDocument();
    expect(document.querySelector<HTMLImageElement>(".signal-edge-burst__face-art img")?.src)
      .toContain("/assets/cards/edge/edge-echo-recast.png");
    expect(document.querySelector<HTMLImageElement>(".signal-edge-burst__charge-art")?.src)
      .toContain("/assets/riftfall/ui/signal-theatre/edge-card/edge-card-charge.png");
  });

  it("uses the generated explosion frame and exposes only public play information", () => {
    render(<SignalEdgeCardBurst play={play} forcedStage="detonate" />);

    expect(screen.getByTestId("signal-edge-card-burst")).toHaveAttribute("data-stage", "detonate");
    expect(document.querySelector<HTMLImageElement>(".signal-edge-burst__detonation-art")?.src)
      .toContain("/assets/riftfall/ui/signal-theatre/edge-card/edge-card-detonation.png");
    expect(screen.getByText(play.publicSummary)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/reroll one die|ability text|tradeoff/i);
    expect(document.querySelector("canvas, webgl")).toBeNull();
  });

  it("renders the locked value as the stable result", () => {
    render(<SignalEdgeCardBurst play={play} forcedStage="result" />);
    expect(screen.getByTestId("signal-edge-card-burst")).toHaveAttribute("data-stage", "result");
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getByText("One die locked")).toBeInTheDocument();
  });

  it("labels ability-mode reveals without describing a locked die", () => {
    render(
      <SignalEdgeCardBurst
        play={{
          ...play,
          id: `${play.id}:ability`,
          mode: "ability",
          abilityKey: "reroll-die",
          publicSummary: "Joel activated Echo Recast and rerolled one die."
        }}
        forcedStage="result"
      />
    );
    expect(screen.getByText("Ability activated")).toBeInTheDocument();
    expect(screen.getByText("Ability burned")).toBeInTheDocument();
    expect(screen.queryByText("One die locked")).not.toBeInTheDocument();
  });
});
