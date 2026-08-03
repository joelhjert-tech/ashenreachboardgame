// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignalPhoneNavigation } from "../SignalPhoneNavigation.js";

describe("SignalPhoneNavigation", () => {
  it("keeps More available as the close control while expanded", () => {
    const onMore = vi.fn();
    render(
      <SignalPhoneNavigation
        activeTab="inventory"
        commandTab="move"
        expanded
        onTab={vi.fn()}
        onMore={onMore}
      />
    );

    const more = screen.getByRole("button", { name: /close all phone sections/i });
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: /phone navigation/i })).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(more).toHaveTextContent("Close menu");

    fireEvent.click(more);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("shows the four compact tabs and More when the menu is closed", () => {
    render(
      <SignalPhoneNavigation
        activeTab="player"
        commandTab="battle"
        commandLabel="Arrival"
        expanded={false}
        onTab={vi.fn()}
        onMore={vi.fn()}
      />
    );

    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeVisible();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tab", { name: "Arrival" })).toBeVisible();
    expect(screen.getByRole("button", { name: /show all phone sections/i })).toHaveTextContent("More");
  });

  it("uses the contextual command label without changing the command target", () => {
    const onTab = vi.fn();
    render(
      <SignalPhoneNavigation
        activeTab="action"
        commandTab="action"
        commandLabel="End Turn"
        expanded={false}
        onTab={onTab}
        onMore={vi.fn()}
      />
    );

    const command = screen.getByRole("tab", { name: "End Turn" });
    expect(command).toHaveAttribute("data-signal-phone-tab", "action");
    fireEvent.click(command);
    expect(onTab).toHaveBeenCalledWith("action");
  });
});
