// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneInspectableCardArt } from "../PhoneInspectableCardArt.js";

describe("PhoneInspectableCardArt", () => {
  afterEach(cleanup);

  it("opens mission artwork with lore and rules, then closes without triggering its parent action", () => {
    const onAction = vi.fn();
    render(<div onClick={onAction}><PhoneInspectableCardArt cardType="contract" cardId="compact-ember-courier" title="Ember Courier" lore="Carry the sealed route spark through the ash lanes." rules="Visit three marked sectors." /></div>);
    fireEvent.click(screen.getByRole("button", { name: /inspect ember courier/i }));
    expect(screen.getByRole("dialog", { name: /ember courier/i })).toBeInTheDocument();
    expect(screen.getByAltText("Ember Courier")).toHaveAttribute(
      "src",
      "/assets/cards/contracts/compact-ember-courier.phone.webp"
    );
    expect(screen.getByAltText("Ember Courier full card artwork")).toHaveAttribute(
      "src",
      "/assets/cards/contracts/compact-ember-courier.png"
    );
    expect(screen.getByText(/carry the sealed route spark/i)).toBeInTheDocument();
    expect(screen.getByText(/visit three marked sectors/i)).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens threat artwork and closes with Escape", () => {
    render(<PhoneInspectableCardArt cardType="threat" cardId="glass-chime-swarm" title="Glass Chime Swarm" rules="Signal test against the projected difficulty." />);
    const inspect = screen.getByRole("button", { name: /inspect glass chime swarm/i });
    inspect.focus();
    fireEvent.click(inspect);
    const dialog = screen.getByRole("dialog", { name: /glass chime swarm/i });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("button", { name: /^Close$/ })).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(inspect).toHaveFocus();
  });
});
