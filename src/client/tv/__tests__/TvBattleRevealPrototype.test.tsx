// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TvBattleRevealPrototype } from "../TvBattleRevealPrototype.js";

afterEach(cleanup);

describe("TvBattleRevealPrototype", () => {
  it("reveals adaptive operative and enemy cards before the Grit roll", () => {
    const view = render(<TvBattleRevealPrototype forcedStage="ready" />);

    expect(screen.getByTestId("tv-battle-reveal-prototype")).toHaveAttribute("data-stage", "ready");
    expect(screen.getByText("Latchspire Raider")).toBeVisible();
    expect(screen.getByLabelText("Grit battle")).toHaveTextContent("Roll on player phone");
    expect(view.container.querySelectorAll('[data-artwork-fit="contain"]')).toHaveLength(4);
    expect(view.container.querySelector("canvas")).not.toBeInTheDocument();
  });
});
