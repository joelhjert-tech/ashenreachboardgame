// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DiceRollScene } from "../DiceRollScene.js";

describe("DiceRollScene", () => {
  afterEach(() => cleanup());

  it("renders the DOM dice display with authoritative dice faces", () => {
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

    expect(screen.getByTestId("host-dice-roll-scene")).toHaveAttribute("data-fallback", "dom-animation");
    expect(screen.getByTestId("combat-die-attack")).toHaveTextContent("4");
    expect(screen.getByTestId("combat-die-defense")).toHaveTextContent("3");
    expect(screen.getByTestId("combat-die-modifier")).toHaveTextContent("2");
    expect(screen.getByTestId("combat-result-token")).toHaveTextContent("A 11 / D 8 / +1");
  });

  it("does not derive fake die faces from battle totals when authoritative faces are missing", () => {
    render(
      <DiceRollScene
        attackValue={11}
        defenseValue={8}
        modifierValue={1}
        attackSuccess
        compact
      />
    );

    expect(screen.getByTestId("host-dice-roll-scene")).toHaveAttribute("data-fallback", "dom-animation");
    expect(screen.getByTestId("combat-die-attack")).toHaveTextContent("-");
    expect(screen.getByTestId("combat-die-defense")).toHaveTextContent("-");
    expect(screen.getByTestId("combat-die-modifier")).toHaveTextContent("-");
    expect(screen.getByTestId("combat-result-token")).toHaveTextContent("A 11 / D 8 / +1");
  });
});
