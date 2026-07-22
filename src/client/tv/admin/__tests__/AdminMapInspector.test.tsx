// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminMapInspector from "../AdminMapInspector.js";

describe("AdminMapInspector", () => {
  afterEach(cleanup);

  it("renders the canonical board and inspects a tile without game commands", () => {
    const onClose = vi.fn();
    render(<AdminMapInspector onClose={onClose} />);

    expect(document.querySelectorAll("[data-map-tile]")).toHaveLength(49);
    fireEvent.change(screen.getByLabelText(/search map archive/i), { target: { value: "ashen chapel" } });
    fireEvent.click(screen.getByRole("button", { name: /ashen chapel.*ashen-chapel/i }));
    const inspector = screen.getByRole("complementary", { name: /inspect ashen chapel/i });
    expect(within(inspector).getAllByText("ashen-chapel").length).toBeGreaterThan(0);
    expect(within(inspector).getAllByText(/rift whispers/i).length).toBeGreaterThan(0);
    expect(within(inspector).getByText("src/game/data/boardSpaces.ts")).toBeInTheDocument();
  });

  it("searches canonical challenge content and focuses its tile", () => {
    render(<AdminMapInspector onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/search map archive/i), { target: { value: "rift whispers" } });
    fireEvent.click(screen.getByRole("button", { name: /ashen chapel.*ashen-chapel/i }));
    expect(screen.getByRole("complementary", { name: /inspect ashen chapel/i })).toBeInTheDocument();
  });

  it("shows connection direction and requirements from canonical topology", () => {
    render(<AdminMapInspector onClose={vi.fn()} initialTileId="middle_guardian_span" />);
    const inspector = screen.getByRole("complementary", { name: /inspect/i });
    const connection = within(inspector).getAllByRole("button", { name: /inner/i })[0];
    fireEvent.click(connection!);

    expect(within(inspector).getByRole("region", { name: /selected connection/i })).toHaveTextContent(/two-way|one-way/i);
  });

  it("runs movement simulation with a single detached read-only tool", () => {
    render(<AdminMapInspector onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /movement test/i }));
    const results = screen.getByRole("region", { name: /movement simulation results/i });

    expect(screen.getByText(/game state unchanged/i)).toBeInTheDocument();
    expect(results).toHaveTextContent(/legal destinations/i);
    expect(results.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("shows executable rule order and runs a detached canonical arrival simulation", () => {
    render(<AdminMapInspector onClose={vi.fn()} initialTileId="ashen-chapel" />);
    const inspector = screen.getByRole("complementary", { name: /inspect ashen chapel/i });
    expect(within(inspector).getByRole("region", { name: /executable tile functions/i })).toHaveTextContent(/Rift Whispers/);
    fireEvent.click(within(inspector).getByRole("button", { name: /simulate arrival/i }));
    const simulation = within(inspector).getByTestId("admin-map-arrival-simulation");
    expect(simulation).toHaveTextContent(/simulation only/i);
    expect(simulation).toHaveTextContent(/challenge:rift-whispers-ashen-chapel/i);
    expect(simulation).toHaveTextContent(/threat:0:blue/i);
  });

  it("records natural and rendered image dimensions for audit", () => {
    render(<AdminMapInspector onClose={vi.fn()} />);
    const image = document.querySelector<HTMLImageElement>("[data-map-tile] img")!;
    Object.defineProperty(image, "naturalWidth", { value: 1024 });
    Object.defineProperty(image, "naturalHeight", { value: 1024 });
    image.getBoundingClientRect = () => ({ width: 96, height: 80, x: 0, y: 0, top: 0, right: 96, bottom: 80, left: 0, toJSON: () => ({}) });
    fireEvent.load(image);

    expect(screen.getByText(/1024 × 1024 px/i)).toBeInTheDocument();
    expect(screen.getByText(/96 × 80 px/i)).toBeInTheDocument();
    expect(screen.getByText(/cropped with object-fit: cover/i)).toBeInTheDocument();
  });

  it("focuses tiles affected by a selected audit category", () => {
    render(<AdminMapInspector onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /duplicate art tiles/i }));
    expect(document.querySelectorAll("[data-map-tile].is-audit-match").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-map-tile].is-dimmed").length).toBeGreaterThan(0);
  });

  it("cross-links tile content to the Admin Library", () => {
    const onOpenLibraryCard = vi.fn();
    render(<AdminMapInspector onClose={vi.fn()} onOpenLibraryCard={onOpenLibraryCard} initialTileId="ashen-chapel" />);
    fireEvent.click(screen.getByRole("button", { name: /rift whispers/i }));
    expect(onOpenLibraryCard).toHaveBeenCalledWith("rift-whispers-ashen-chapel");
  });
});
