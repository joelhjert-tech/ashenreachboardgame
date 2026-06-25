// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardArtImage } from "../CardArtImage.js";
import { getCardArtPath, getCardFallbackArtPath } from "../assetPaths.js";

describe("card art paths", () => {
  it("returns generated card output paths for known cards", () => {
    expect(getCardArtPath("contract", "compact-cleanse-ledger")).toBe("/assets/cards/contracts/compact-cleanse-ledger.png");
    expect(getCardArtPath("threat", "cinder-veil-stalker")).toBe("/assets/cards/threats/cinder-veil-stalker.png");
  });

  it("returns type fallbacks for unknown cards", () => {
    expect(getCardArtPath("anomaly", "missing-card")).toBe(getCardFallbackArtPath("anomaly"));
  });
});

describe("CardArtImage", () => {
  it("renders the preferred card art path first", () => {
    render(<CardArtImage cardType="artifact" cardId="artifact-yard" alt="artifact art" />);

    expect(screen.getByAltText("artifact art")).toHaveAttribute("src", "/assets/cards/artifacts/artifact-yard.png");
  });

  it("falls back to the type placeholder when the image errors", () => {
    render(<CardArtImage cardType="scar" cardId="scar-wound-1" alt="scar art" />);

    const image = screen.getByAltText("scar art");
    fireEvent.error(image);

    expect(image).toHaveAttribute("src", "/assets/cards/fallbacks/scar.svg");
  });
});
