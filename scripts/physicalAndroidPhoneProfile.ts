import type { BrowserContextOptions } from "playwright";

/**
 * Measured on a physical Samsung Galaxy S21+ running Android 15 and Chrome 143.
 * This is a layout-regression approximation. Playwright does not reproduce the
 * real browser chrome, Android keyboard, Back button, GPU, or OS lifecycle.
 */
export const galaxyS21PhysicalChromeBaseline = {
  name: "Galaxy S21+ physical Chrome baseline",
  viewport: { width: 384, height: 722 },
  deviceScaleFactor: 2.8125,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36"
} as const satisfies BrowserContextOptions & { name: string };

export const galaxyS21KeyboardConstrainedViewport = {
  width: 384,
  height: 302
} as const;

export const retainedPhoneRegressionViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
] as const;
