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
    expect(screen.getByRole("tablist")).not.toHaveAttribute("aria-hidden");
    expect(screen.getAllByRole("tab", { hidden: true })).toHaveLength(4);

    fireEvent.click(more);
    expect(onMore).toHaveBeenCalledTimes(1);
  });
});
