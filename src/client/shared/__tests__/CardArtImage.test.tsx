// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardArtImage } from "../CardArtImage.js";
import { getCardArtOutputPath } from "../../../game/assets/design/cardImageCatalog.js";
import { generatedCardImagePrompts } from "../../../game/assets/design/generatedCardImagePrompts.js";
import { cardArtRuntimeCatalog, getRuntimeCardArtPath } from "../../../game/assets/runtime/cardArtRuntimeCatalog.js";
import {
  getCardArtPath,
  getCardFallbackArtPath,
  getCharacterPortraitPath,
  getEncounterFramePath,
  getNemesisPortraitPath,
  getRuntimeAssetPaths
} from "../assetPaths.js";

describe("card art paths", () => {
  it("returns generated card output paths for known cards", () => {
    expect(getCardArtPath("contract", "compact-cleanse-ledger")).toBe("/assets/cards/contracts/compact-cleanse-ledger.png");
    expect(getCardArtPath("threat", "cinder-veil-stalker")).toBe("/assets/cards/threats/red/cinder-veil-stalker.png");
    expect(getCardArtPath("anomaly", "anomaly-ashfall-murmur")).toBe("/assets/cards/anomalies/anomaly-ashfall-murmur.png");
  });

  it("uses a runtime-safe card art catalog without prompt text", () => {
    expect(getRuntimeCardArtPath("threat", "cinder-veil-stalker")).toBe("/assets/cards/threats/red/cinder-veil-stalker.png");
    expect(getRuntimeCardArtPath("anomaly", "anomaly-ashfall-murmur")).toBe("/assets/cards/anomalies/anomaly-ashfall-murmur.png");
    expect(cardArtRuntimeCatalog[0]).not.toHaveProperty("prompt");
    expect(cardArtRuntimeCatalog[0]).not.toHaveProperty("negativePrompt");
  });

  it("keeps generated prompt data available for tooling", () => {
    expect(generatedCardImagePrompts.some((entry) => entry.cardId === "cinder-veil-stalker")).toBe(true);
    expect(generatedCardImagePrompts.find((entry) => entry.cardId === "cinder-veil-stalker")?.prompt).toEqual(
      expect.stringContaining("Ashen Reach original card art")
    );
  });

  it("requires lane-based output paths for generated threat art", () => {
    expect(getCardArtOutputPath("threat", "cinder-veil-stalker", "red")).toBe(
      "/assets/cards/threats/red/cinder-veil-stalker.png"
    );
    expect(() => getCardArtOutputPath("threat", "cinder-veil-stalker")).toThrow(/threatLane/i);
  });

  it("returns type fallbacks for unknown cards", () => {
    expect(getCardArtPath("anomaly", "missing-card")).toBe(getCardFallbackArtPath("anomaly"));
  });

  it("returns custom character and Relay nemesis portrait paths", () => {
    expect(getCharacterPortraitPath("signal-witch")).toBe("/assets/riftfall/characters/signal-witch.png");
    expect(getCharacterPortraitPath("char_deepdale")).toBe("/assets/riftfall/characters/char_deepdale.png");
    expect(getNemesisPortraitPath("nemesis_iron_vicar_orm_seat-1")).toBe(
      "/assets/riftfall/nemeses/nemesis_iron_vicar_orm.png"
    );
  });

  it("uses the green Guile encounter frame", () => {
    expect(getEncounterFramePath("guile")).toBe("/assets/riftfall/ui/ui_card_frame_green.png");
    expect(getEncounterFramePath("guile")).not.toBe("/assets/riftfall/ui/ui_card_frame_yellow.png");
    expect(getRuntimeAssetPaths()).toContain("/assets/riftfall/ui/ui_card_frame_green.png");
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
