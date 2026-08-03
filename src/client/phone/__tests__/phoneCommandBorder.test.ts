import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/client/styles.css"), "utf8");

describe("phone command signal border", () => {
  it("orbits only enabled primary command selectors", () => {
    expect(styles).toContain("@property --phone-command-border-angle");
    expect(styles).toMatch(
      /\.phone-page :is\([\s\S]*?\.phone-button-primary[\s\S]*?\.phone-priority-action\.is-required \.game-button[\s\S]*?\):not\(:disabled\)::before/
    );
    expect(styles).toMatch(
      /@keyframes phone-command-border-orbit\s*\{[\s\S]*?--phone-command-border-angle: 360deg;/
    );
  });

  it("keeps a static signal border when reduced motion is requested", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?--phone-command-border-angle: 288deg;[\s\S]*?animation: none !important;/
    );
  });
});
