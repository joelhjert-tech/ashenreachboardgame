// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import { ChallengeBadge, ThreatIconBadge } from "../ChallengeBadge.js";

describe("ChallengeBadge", () => {
  it("renders Guile badges with the green theme token", () => {
    render(<ChallengeBadge stat="guile" />);

    const badge = screen.getByText("Guile").closest(".challenge-badge") as HTMLElement;
    expect(badge).toHaveClass("challenge-badge-guile");
    expect(badge.style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("guile")["--challenge-color"]
    );
    expect(badge.style.getPropertyValue("--challenge-color")).not.toBe("#E3B341");
  });

  it("labels yellow threat icons as green Guile in the UI", () => {
    render(<ThreatIconBadge icon="yellow" />);

    const badge = screen.getByText("Green Guile").closest(".challenge-badge") as HTMLElement;
    expect(badge).toHaveClass("challenge-badge-guile");
    expect(badge.style.getPropertyValue("--challenge-color")).toBe("#4FBF78");
  });
});
