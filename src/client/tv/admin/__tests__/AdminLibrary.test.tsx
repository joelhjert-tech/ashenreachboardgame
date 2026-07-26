// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLibrary from "../AdminLibrary.js";

describe("AdminLibrary", () => {
  afterEach(cleanup);

  it("searches canonical names and IDs and clears combined filters", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    const search = screen.getByLabelText(/search archive/i);
    fireEvent.change(search, { target: { value: "ash-choir-crusader" } });
    expect(screen.getAllByRole("button", { name: /ash choir crusader/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 of 372 cards/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(search).toHaveValue("");
    expect(screen.getAllByText(/372 of 372 cards/i).length).toBeGreaterThan(0);
  });

  it("combines card-type, difficulty, skill, and folder filters", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    const filters = screen.getByRole("navigation", { name: /library filters/i });
    fireEvent.click(within(filters).getByRole("button", { name: /Threat116/i }));
    fireEvent.change(screen.getByLabelText(/^difficulty$/i), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText(/^skill$/i), { target: { value: "signal" } });
    fireEvent.change(screen.getByLabelText(/^folder$/i), { target: { value: "content/cards/threats/" } });
    const count = Number(screen.getAllByText(/\d+ of 372 cards/i)[0]?.textContent?.split(" ")[0]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(116);
  });

  it("opens an inspector with lore and canonical source and art locations", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/search archive/i), { target: { value: "ash-choir-crusader" } });
    fireEvent.click(screen.getByRole("button", { name: /ash choir crusader/i }));
    const inspector = screen.getByRole("complementary", { name: /inspect ash choir crusader/i });
    expect(within(inspector).getByText(/each bell note lands before the blow/i)).toBeInTheDocument();
    expect(within(inspector).getByText("content/cards/threats/ash-choir-crusader.json")).toBeInTheDocument();
    expect(within(inspector).getByText("public/assets/cards/threats/blue/ash-choir-crusader.png")).toBeInTheDocument();
    expect(within(inspector).getByText(/signal 8/i)).toBeInTheDocument();
  });

  it("shows missing metadata and missing artwork as readable warnings", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/search archive/i), { target: { value: "ash porter" } });
    fireEvent.click(screen.getByRole("button", { name: /ash porter/i }));
    const warnings = screen.getByRole("region", { name: /metadata warnings/i });
    expect(warnings).toHaveTextContent(/missing lore/i);
    expect(warnings).toHaveTextContent(/missing artwork/i);
    expect(screen.getAllByText(/art unavailable/i).length).toBeGreaterThan(0);
  });

  it("keeps duplicate artwork references out of the missing-artwork filter", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    const filters = screen.getByRole("navigation", { name: /library filters/i });
    fireEvent.click(within(filters).getByRole("button", { name: /missing artwork105/i }));
    expect(screen.getAllByText(/105 of 372 cards/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Rift Whispers")).not.toBeInTheDocument();
  });

  it("filters Scar cards by their typed source", () => {
    render(<AdminLibrary onClose={vi.fn()} />);
    const filters = screen.getByRole("navigation", { name: /library filters/i });
    fireEvent.click(within(filters).getByRole("button", { name: /Scar24/i }));
    fireEvent.change(screen.getByLabelText(/^scar source$/i), { target: { value: "rift" } });
    expect(screen.getAllByText(/4 of 372 cards/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /rift-eye/i })).toBeInTheDocument();
  });

  it("groups by canonical folders and closes without dispatching game commands", () => {
    const onClose = vi.fn();
    render(<AdminLibrary onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /group by folder/i }));
    expect(screen.getByRole("heading", { name: /content\/cards\/threats\//i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /return to command board/i }));
    expect(onClose).toHaveBeenCalledOnce();
  }, 10_000);

  it("cross-links canonical map references to the Map Inspector", () => {
    const onOpenMapTile = vi.fn();
    render(<AdminLibrary onClose={vi.fn()} onOpenMapTile={onOpenMapTile} initialCardId="rift-whispers-ashen-chapel" />);

    fireEvent.click(screen.getByText("ashen-chapel").closest("button")!);
    expect(onOpenMapTile).toHaveBeenCalledWith("ashen-chapel");
  });
});
