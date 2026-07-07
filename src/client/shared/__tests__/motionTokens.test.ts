import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { motionClassNames, motionCssVariables, motionDurations, motionEasings } from "../motionTokens.js";

const repoRoot = process.cwd();
const styles = readFileSync(join(repoRoot, "src/client/styles.css"), "utf8");

describe("motion tokens", () => {
  it("exports the Ashen Reach timing tokens", () => {
    expect(motionDurations).toEqual({
      instant: "80ms",
      quick: "140ms",
      normal: "220ms",
      deliberate: "360ms",
      cinematic: "520ms",
      heavy: "760ms"
    });
  });

  it("exports the shared easing tokens", () => {
    expect(motionEasings).toEqual({
      command: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      impact: "cubic-bezier(0.16, 1, 0.3, 1)",
      warning: "cubic-bezier(0.4, 0, 0.2, 1)",
      snap: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      fade: "ease-out"
    });
  });

  it("keeps CSS variable names aligned with the stylesheet", () => {
    Object.values(motionCssVariables).forEach((variableName) => {
      expect(styles).toContain(variableName);
    });
  });

  it("defines passive motion hook classes and reduced-motion fallback support", () => {
    Object.values(motionClassNames).forEach((className) => {
      expect(styles).toContain(`.${className}`);
    });

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".motion-reduced-fallback");
  });

  it("preserves existing route, tab, dice, battle, and reward class hooks", () => {
    expect(styles).toContain("host-map-route-glow");
    expect(styles).toContain("board-route-pulse");
    expect(styles).toContain("phone-portrait-tab");
    expect(styles).toContain("combat-dice-animation");
    expect(styles).toContain("result-delta-row");
    expect(styles).toContain("result-delta-reward");
    expect(styles).toContain(".motion-route-glow");
    expect(styles).toContain(".motion-battle-impact");
    expect(styles).toContain(".motion-reward-pulse");
  });
});
