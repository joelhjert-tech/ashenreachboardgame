// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinQrCard } from "../JoinQrCard.js";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn(async () => "<svg role=\"img\"></svg>")
  }
}));

vi.mock("../../shared/network.js", () => ({
  getPhoneJoinUrl: (roomCode: string) => `http://192.168.1.40:5173/?room=${roomCode}`,
  getConnectionDiagnostics: () => ({
    pageUrl: "http://localhost:5173/tv",
    apiOrigin: "http://192.168.1.40:8080",
    webSocketOrigin: "ws://192.168.1.40:8080",
    publicClientOrigin: "http://192.168.1.40:5173",
    isLocalhostPage: true
  })
}));

describe("JoinQrCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the LAN phone join URL instead of a localhost QR target", async () => {
    render(<JoinQrCard roomCode="AB12C" />);

    expect(screen.getByText("http://192.168.1.40:5173/?room=AB12C")).toBeInTheDocument();
    expect(screen.getByText(/lan join url is active/i)).toBeInTheDocument();
    expect(screen.queryByText(/phones need the lan url/i)).not.toBeInTheDocument();
  });

  it("renders the compact header variant as a QR-only tile", () => {
    render(<JoinQrCard roomCode="AB12C" variant="compact" />);

    expect(screen.queryByText(/scan to join/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/room ab12c/i)).not.toBeInTheDocument();
    expect(screen.queryByText("http://192.168.1.40:5173/?room=AB12C")).not.toBeInTheDocument();
    expect(screen.queryByText(/seat links/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/qr code to join room ab12c/i)).toBeInTheDocument();
  });
});
