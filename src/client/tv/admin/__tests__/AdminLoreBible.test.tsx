// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLoreBible from "../AdminLoreBible.js";

describe("AdminLoreBible", () => {
  afterEach(cleanup);

  it("searches canonical faction lore and opens its authored threat records", () => {
    const openLibraryCard = vi.fn();
    render(<AdminLoreBible onOpenLibraryCard={openLibraryCard} onOpenMapTile={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /ashen reach lore bible/i })).toBeInTheDocument();
    expect(screen.getByText(/12 factions/i)).toBeInTheDocument();
    expect(screen.getByText(/49 sectors/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /find in canon/i }), {
      target: { value: "Violet Court" }
    });
    const loreIndex = screen.getByRole("navigation", { name: /lore entries/i });
    fireEvent.click(within(loreIndex).getByRole("button", { name: /violet court/i }));

    expect(screen.getByRole("heading", { name: "Violet Court" })).toBeInTheDocument();
    expect(screen.getByText(/bind every useful route into a courtly bargain/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /hazard.*violet thorn toll/i }));
    expect(openLibraryCard).toHaveBeenCalledWith("violet-thorn-toll");
  });

  it("cross-links lore entries and hands sectors to the map inspector", () => {
    const openMapTile = vi.fn();
    render(<AdminLoreBible onOpenLibraryCard={vi.fn()} onOpenMapTile={openMapTile} />);

    fireEvent.click(screen.getByRole("button", { name: /linked nemesis.*unnamed prisoner/i }));
    expect(screen.getByRole("heading", { name: "The Unnamed Prisoner" })).toBeInTheDocument();
    expect(screen.getByText(/ancient breach-intelligence/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sectors.*49/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /find in canon/i }), {
      target: { value: "Gate of Cinders" }
    });
    const loreIndex = screen.getByRole("navigation", { name: /lore entries/i });
    fireEvent.click(within(loreIndex).getByRole("button", { name: /gate of cinders/i }));
    fireEvent.click(screen.getByRole("button", { name: /open in map inspector/i }));
    expect(openMapTile).toHaveBeenCalledWith("inner_gate_of_cinders");
  });

  it("opens the illustrated public event chronicle and hands records to the archive", () => {
    const openLibraryCard = vi.fn();
    const { container } = render(
      <AdminLoreBible onOpenLibraryCard={openLibraryCard} onOpenMapTile={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /events.*16/i }));
    expect(container.querySelector(".admin-lore__event-volume-art img"))
      .toHaveAttribute("src", "/assets/riftfall/ui/lore-bible/events-overview.png");

    fireEvent.change(screen.getByRole("searchbox", { name: /find in canon/i }), {
      target: { value: "Throne Shadow" }
    });
    const loreIndex = screen.getByRole("navigation", { name: /lore entries/i });
    fireEvent.click(within(loreIndex).getByRole("button", { name: /throne shadow/i }));

    expect(screen.getByRole("heading", { name: "Throne Shadow" })).toBeInTheDocument();
    expect(container.querySelector(".admin-lore__entry-image img"))
      .toHaveAttribute("src", "/assets/cards/escalations/escalation-throne-shadow.png");
    expect(screen.getByText(/crown-shaped absence/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open in content archive/i }));
    expect(openLibraryCard).toHaveBeenCalledWith("escalation-throne-shadow");
  });
});
