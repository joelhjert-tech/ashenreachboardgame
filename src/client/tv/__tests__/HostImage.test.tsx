// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HostImage } from "../HostImage.js";

afterEach(() => cleanup());

describe("HostImage", () => {
  it("applies an explicit bounded fit and aspect ratio", () => {
    render(<HostImage src="/art.webp" alt="Card art" fit="contain" aspectRatio="card" />);
    const image = screen.getByAltText("Card art");
    const frame = image.parentElement;
    expect(frame).toHaveClass("host-image-frame", "host-image-frame--contain", "host-image-frame--card");
    expect(frame).toHaveAttribute("data-host-image-fit", "contain");
  });

  it("supports cover with a custom focal point", () => {
    render(<HostImage src="/portrait.webp" alt="Operative" fit="cover" aspectRatio="portrait" focalPoint="50% 18%" />);
    expect(screen.getByAltText("Operative")).toHaveStyle({ objectPosition: "50% 18%" });
  });

  it("keeps a stable fallback when the source is absent or fails", () => {
    const { rerender } = render(<HostImage alt="Missing map" aspectRatio="map-tile" fallback="map" />);
    expect(screen.getByRole("img", { name: "Missing map" })).toHaveTextContent(/art unavailable/i);
    rerender(<HostImage src="/broken.webp" alt="Broken card" aspectRatio="card" />);
    fireEvent.error(screen.getByAltText("Broken card"));
    expect(screen.getByRole("img", { name: "Broken card" })).toHaveTextContent(/art unavailable/i);
  });
});
