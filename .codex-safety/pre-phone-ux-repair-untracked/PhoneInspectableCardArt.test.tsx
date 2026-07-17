// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneInspectableCardArt } from "../PhoneInspectableCardArt.js";

describe("PhoneInspectableCardArt", () => {
  afterEach(cleanup);

  it("opens mission artwork with lore and rules, then closes without triggering its parent action", () => {
    const onAction = vi.fn();
    render(
      <div onClick={onAction}>
        <PhoneInspectableCardArt
          cardType="contract"
          cardId="compact-ember-courier"
          title="Ember Courier"
          lore="Carry the sealed route spark through the ash lanes."
          rules="Visit three marked sectors."
        />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: /inspect ember courier/i }));
    expect(screen.getByRole("dialog", { name: /ember courier/i })).toBeInTheDocument();
    expect(screen.getByText(/carry the sealed route spark/i)).toBeInTheDocument();
    expect(screen.getByText(/visit three marked sectors/i)).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens threat artwork and closes with Escape", () => {
    render(
      <PhoneInspectableCardArt
        cardType="threat"
        cardId="glass-chime-swarm"
        title="Glass Chime Swarm"
        rules="Signal test against the projected difficulty."
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /inspect glass chime swarm/i }));
    expect(screen.getByRole("dialog", { name: /glass chime swarm/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
