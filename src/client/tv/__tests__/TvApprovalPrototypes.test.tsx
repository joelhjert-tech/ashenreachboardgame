// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScenarioCatalogEntry } from "../../shared/types.js";
import { TvScenarioApprovalPrototype, TvShopApprovalPrototype } from "../TvApprovalPrototypes.js";

afterEach(cleanup);

describe("TV approval-only prototypes", () => {
  it("shows the original shop interior, public carousel, and map lock without private funds", () => {
    render(<TvShopApprovalPrototype />);

    expect(screen.getByTestId("tv-shop-approval-prototype")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Brass Reliquary" })).toBeInTheDocument();
    expect(screen.getByText(/signal cartography locked during this visit/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Breachline Sextant" })).toHaveAttribute(
      "src",
      "/assets/cards/artifacts/artifact-breachline-sextant.png"
    );
    expect(screen.queryByText(/remaining salvage|wallet|private sale/i)).not.toBeInTheDocument();
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
});
