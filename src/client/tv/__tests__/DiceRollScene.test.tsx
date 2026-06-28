// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiceRollScene } from "../DiceRollScene.js";

describe("DiceRollScene", () => {
  it("falls back to the 2D dice display with authoritative dice faces when WebGL is unavailable", () => {
    render(
      <DiceRollScene
        attackValue={11}
        defenseValue={8}
        modifierValue={1}
        attackDieFace={4}
        defenseDieFace={3}
        modifierDieFace={2}
        attackSuccess
        compact
      />
    );

    expect(screen.getByTestId("host-dice-roll-scene")).toHaveAttribute("data-fallback", "webgl-unavailable");
    expect(screen.getByTestId("combat-die-attack")).toHaveTextContent("4");
    expect(screen.getByTestId("combat-die-defense")).toHaveTextContent("3");
    expect(screen.getByTestId("combat-die-modifier")).toHaveTextContent("2");
    expect(screen.getByTestId("combat-result-token")).toHaveTextContent("A 11 / D 8 / +1");
  });
});
