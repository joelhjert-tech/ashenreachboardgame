import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const implementationFiles = [
  "src/client/tv/HostMotionCue.tsx",
  "src/client/tv/TvApp.tsx",
  "src/client/styles.css",
  "src/server/phaseOneQaFixture.ts"
] as const;

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("P20 reference-code compliance", () => {
  it("contains no reference-package, Android, native-engine, or reference-directory dependency", () => {
    const implementation = implementationFiles.map(read).join("\n");
    expect(implementation).not.toMatch(
      /referance game|com\.nomadgames|android\.support|androidx\.|marmalade|s3e_|\.apk\b|\.dz\b/i
    );
  });

  it("keeps the host motion cue presentational and command-free", () => {
    const cue = read("src/client/tv/HostMotionCue.tsx");
    expect(cue).not.toMatch(/\bfetch\s*\(|\bWebSocket\b|\bsendIntent\b|\bMath\.random\b|\bset(?:Timeout|Interval)\b/);
    expect(cue).not.toMatch(/_REQUESTED\b|PHASE_ADVANCED|CONTINUE_RESOLUTION/);
  });

  it("uses shared motion tokens and preserves a complete reduced-motion state", () => {
    const styles = read("src/client/styles.css");
    expect(styles).toContain("animation: host-motion-cue-enter var(--motion-deliberate) var(--ease-command) both");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.host-motion-cue[\s\S]*?animation: none !important/
    );
    expect(styles).toMatch(/\.host-motion-cue\s*\{[\s\S]*?opacity: 1;[\s\S]*?transform: none;/);
  });

  it("has no Android or native runtime dependency in the web package", () => {
    const packageJson = read("package.json");
    expect(packageJson).not.toMatch(/android|kotlin|java|marmalade|s3e/i);
  });
});
