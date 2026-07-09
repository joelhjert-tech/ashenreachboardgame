// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardArtImage } from "../CardArtImage.js";
import { CARD_IMAGE_TYPES, getCardArtOutputPath } from "../../../game/assets/design/cardImageCatalog.js";
import { generatedCardImagePrompts } from "../../../game/assets/design/generatedCardImagePrompts.js";
import { cardArtRuntimeCatalog, getRuntimeCardArtPath } from "../../../game/assets/runtime/cardArtRuntimeCatalog.js";
import {
  getCardArtPath,
  getCardFallbackArtPath,
  getCharacterPortraitPath,
  getEncounterFramePath,
  getEquipmentCardArtPath,
  getGearCardArtId,
  getGearCardArtPath,
  getGearCardArtType,
  getNemesisPortraitPath,
  getRuntimeAssetPaths
} from "../assetPaths.js";

describe("card art paths", () => {
  it("returns generated card output paths for known cards", () => {
    expect(getCardArtPath("contract", "compact-cleanse-ledger")).toBe("/assets/cards/contracts/compact-cleanse-ledger.png");
    expect(getCardArtPath("threat", "cinder-veil-stalker")).toBe("/assets/cards/threats/red/cinder-veil-stalker.png");
    expect(getCardArtPath("anomaly", "anomaly-ashfall-murmur")).toBe("/assets/cards/anomalies/anomaly-ashfall-murmur.png");
  });

  it("treats equipment as a first-class card art type", () => {
    expect(CARD_IMAGE_TYPES).toContain("equipment");
    expect(getCardArtOutputPath("equipment", "veil-hook")).toBe("/assets/cards/equipment/veil-hook.png");
    expect(getCardFallbackArtPath("equipment")).toBe("/assets/cards/fallbacks/equipment.svg");
    expect(getEquipmentCardArtPath("veil-hook")).toBe("/assets/cards/fallbacks/equipment.svg");
    expect(getEquipmentCardArtPath("ashlock-cleaver")).toBe("/assets/cards/equipment/ashlock-cleaver.png");
  });

  it("routes ordinary gear through equipment art and artifact-tier gear through artifacts", () => {
    expect(getGearCardArtType({ id: "veil-hook", tier: "starter" })).toBe("equipment");
    expect(getGearCardArtId({ id: "veil-hook", tier: "starter" })).toBe("veil-hook");
    expect(getGearCardArtPath({ id: "veil-hook", tier: "starter" })).toBe("/assets/cards/fallbacks/equipment.svg");
    expect(getGearCardArtPath({ id: "ashlock-cleaver", tier: "standard" })).toBe(
      "/assets/cards/equipment/ashlock-cleaver.png"
    );

    expect(getGearCardArtType({ id: "heat-sink-prayer", tier: "artifact" })).toBe("artifact");
    expect(getGearCardArtId({ id: "heat-sink-prayer", tier: "artifact" })).toBe("artifact-heat-sink-prayer");
    expect(getGearCardArtPath({ id: "heat-sink-prayer", tier: "artifact" })).toBe(
      "/assets/cards/artifacts/artifact-heat-sink-prayer.png"
    );
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
    expect(getCardArtPath("equipment", "missing-equipment")).toBe(getCardFallbackArtPath("equipment"));
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

  it("renders equipment fallback safely when active equipment art is missing", () => {
    render(<CardArtImage cardType="equipment" cardId="veil-hook" alt="equipment art" />);

    expect(screen.getByAltText("equipment art")).toHaveAttribute("src", "/assets/cards/fallbacks/equipment.svg");
  });

  it("renders imported equipment art when active equipment art exists", () => {
    render(<CardArtImage cardType="equipment" cardId="ashlock-cleaver" alt="ashlock cleaver art" />);

    expect(screen.getByAltText("ashlock cleaver art")).toHaveAttribute(
      "src",
      "/assets/cards/equipment/ashlock-cleaver.png"
    );
  });
});
