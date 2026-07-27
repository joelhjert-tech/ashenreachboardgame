import { describe, expect, it } from "vitest";
import { getPhoneOptimizedImagePath, isPhoneOptimizableRasterPath } from "../phoneImagePaths.js";

describe("phone image paths", () => {
  it("uses one sibling phone WebP convention for supported raster sources", () => {
    expect(getPhoneOptimizedImagePath("/assets/cards/followers/grave-scribe.png")).toBe(
      "/assets/cards/followers/grave-scribe.phone.webp"
    );
    expect(getPhoneOptimizedImagePath("/assets/riftfall/ui/objective-categories/completed.webp")).toBe(
      "/assets/riftfall/ui/objective-categories/completed.phone.webp"
    );
    expect(getPhoneOptimizedImagePath("/assets/riftfall/characters/char_master_alpha.jpg")).toBe(
      "/assets/riftfall/characters/char_master_alpha.phone.webp"
    );
  });

  it("does not rewrite vectors, animations, or an existing derivative", () => {
    expect(isPhoneOptimizableRasterPath("/assets/cards/fallbacks/follower.svg")).toBe(false);
    expect(getPhoneOptimizedImagePath("/assets/cards/fallbacks/follower.svg")).toBe(
      "/assets/cards/fallbacks/follower.svg"
    );
    expect(getPhoneOptimizedImagePath("/assets/cards/followers/grave-scribe.phone.webp")).toBe(
      "/assets/cards/followers/grave-scribe.phone.webp"
    );
  });
});
