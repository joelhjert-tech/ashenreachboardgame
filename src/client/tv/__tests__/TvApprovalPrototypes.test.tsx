// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScenarioCatalogEntry } from "../../shared/types.js";
import { TvLobbyQrPrototype, TvScenarioApprovalPrototype, TvShopApprovalPrototype } from "../TvApprovalPrototypes.js";

afterEach(cleanup);

describe("TV approval-only prototypes", () => {
  it("keeps the lobby join view to the room code and QR only", () => {
    render(<TvLobbyQrPrototype roomCode="ASHEN" />);
    expect(screen.getByText("ASHEN")).toBeInTheDocument();
    expect(screen.getByLabelText(/qr code to join room ashen/i)).toBeInTheDocument();
    expect(screen.queryByText(/scan|join|phone|connected/i)).not.toBeInTheDocument();
  });

  it("shows the original shop interior, public carousel, and map lock without private funds", () => {
    render(<TvShopApprovalPrototype />);

    expect(screen.getByTestId("tv-shop-approval-prototype")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Brass Reliquary" })).toBeInTheDocument();
    expect(screen.getByText(/signal cartography locked/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Breachline Sextant" })).toHaveAttribute(
      "src",
      "/assets/cards/artifacts/artifact-breachline-sextant.png"
    );
    expect(screen.queryByText(/remaining salvage|wallet|private sale/i)).not.toBeInTheDocument();
  });

  it("shows all six custom Host TV shop emblems in the category prototype", () => {
    render(<TvShopApprovalPrototype view="categories" />);

    for (const category of ["items", "equipment", "artifacts", "route-aids", "services", "sell"]) {
      expect(screen.getByTestId(`host-shop-category-${category}`).querySelector(`[data-shop-icon='${category}']`))
        .toBeInTheDocument();
    }
  });

  it("renders an Expedition Briefing with explicit pressure-free copy", () => {
    const scenario = {
      id: "pressure-free",
      name: "The Quiet Terminus",
      theme: "Reach the sealed terminus and defeat its keeper.",
      difficulty: "medium",
      expectedDuration: "45–60 min",
      mode: "Co-op",
      pressureRule: "",
      confrontationTitle: "The Keeper Below",
      victoryText: "Defeat the keeper.",
      specialRules: [],
      setup: [],
      confrontationSteps: []
    } as unknown as ScenarioCatalogEntry;

    render(<TvScenarioApprovalPrototype scenario={scenario} playerCount={3} hostName="Nera" />);

    expect(screen.getByTestId("tv-scenario-approval-prototype")).toHaveTextContent("Expedition Briefing");
    expect(screen.getByRole("heading", { name: "The Quiet Terminus" })).toBeInTheDocument();
    expect(screen.getByText("No loss pressure")).toBeInTheDocument();
    expect(screen.getByText(/co-op · 3 operatives/i)).toBeInTheDocument();
    expect(screen.getByText(/selected by nera/i)).toBeInTheDocument();
  });

  it("promotes the briefing to a live room-safe presentation", () => {
    const scenario = {
      id: "scenario_broken_seal",
      name: "The Broken Seal",
      theme: "Restore the failing seal.",
      difficulty: "medium",
      expectedDuration: "60 min",
      pressureRule: "Escalation advances.",
      confrontationTitle: "Seal Core",
      victoryText: "Restore the seal.",
      specialRules: [],
      setup: [],
      confrontationSteps: []
    } as unknown as ScenarioCatalogEntry;

    render(
      <TvScenarioApprovalPrototype
        scenario={scenario}
        playerCount={1}
        hostName="Nera"
        mode="single-player"
        roomCode="ABCD"
        joinedCount={1}
        readyCount={0}
        approvalFixture={false}
      />
    );

    expect(screen.getByTestId("tv-expedition-briefing")).toHaveTextContent("Single Player · 1 operative");
    expect(screen.getByText(/room abcd · 1 joined · 0 ready/i)).toBeInTheDocument();
    expect(screen.queryByText(/development only/i)).not.toBeInTheDocument();
  });
});
