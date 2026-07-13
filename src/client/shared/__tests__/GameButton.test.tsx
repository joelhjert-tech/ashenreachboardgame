// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameButton } from "../GameButton.js";

describe("GameButton", () => {
  it("renders the default button with optional icon and sublabel", () => {
    render(
      <GameButton tone="battle" icon="x" sublabel="Ready">
        Battle
      </GameButton>
    );

    const button = screen.getByRole("button", { name: /battleready/i });

    expect(button).toHaveClass("game-button", "game-button-battle", "game-button-normal");
    expect(button).toHaveAttribute("data-status", "default");
    expect(button).not.toBeDisabled();
    expect(screen.getByText("Battle")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("marks selected buttons as pressed for active tab-style controls", () => {
    render(
      <GameButton selected tone="shop">
        Shop
      </GameButton>
    );

    const button = screen.getByRole("button", { name: /shop/i });

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-selected", "true");
    expect(button).toHaveClass("game-button-selected");
  });

  it("disables and exposes busy state while loading", () => {
    const onClick = vi.fn();

    render(
      <GameButton status="loading" onClick={onClick}>
        Resolve
      </GameButton>
    );

    const button = screen.getByRole("button", { name: /resolve/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveClass("game-button-loading");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders success and error states with distinct state classes", () => {
    render(
      <>
        <GameButton status="success">Saved</GameButton>
        <GameButton status="error">Failed</GameButton>
      </>
    );

    expect(screen.getByRole("button", { name: /saved/i })).toHaveClass("game-button-success");
    expect(screen.getByRole("button", { name: /failed/i })).toHaveClass("game-button-error");
  });

  it("keeps disabled controls inert without pretending they are loading", () => {
    const onClick = vi.fn();

    render(
      <GameButton disabled disabledReason="No legal move" onClick={onClick}>
        No legal move
      </GameButton>
    );

    const button = screen.getByRole("button", { name: /no legal moveno legal move/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-disabled-reason", "No legal move");
    expect(button).toHaveAttribute("title", "No legal move");
    expect(button).not.toHaveAttribute("aria-busy");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
