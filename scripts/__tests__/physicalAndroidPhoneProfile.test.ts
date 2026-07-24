import { describe, expect, it } from "vitest";
import {
  galaxyS21KeyboardConstrainedViewport,
  galaxyS21PhysicalChromeBaseline,
  retainedPhoneRegressionViewports
} from "../physicalAndroidPhoneProfile.js";

describe("physical Android phone profile", () => {
  it("matches the measured Galaxy S21+ Chrome layout baseline", () => {
    expect(galaxyS21PhysicalChromeBaseline).toMatchObject({
      viewport: { width: 384, height: 722 },
      deviceScaleFactor: 2.8125,
      isMobile: true,
      hasTouch: true
    });
    expect(galaxyS21PhysicalChromeBaseline.userAgent).toContain("Mobile");
  });

  it("keeps the measured keyboard constraint and existing regression sizes", () => {
    expect(galaxyS21KeyboardConstrainedViewport).toEqual({ width: 384, height: 302 });
    expect(retainedPhoneRegressionViewports).toEqual([
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 932 }
    ]);
  });
});
