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
        expanded={false}
        onTab={vi.fn()}
        onMore={vi.fn()}
      />
    );

    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeVisible();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /show all phone sections/i })).toHaveTextContent("More");
  });
});
