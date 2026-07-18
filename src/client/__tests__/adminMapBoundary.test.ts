import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin map client boundary", () => {
  it("is host-only, read-only, and does not introduce a 3D renderer", () => {
    const phoneSources = [
      "src/client/phone/PhoneApp.tsx",
      "src/client/phone/PortraitControllerView.tsx",
      "src/client/phone/PhoneActionPanel.tsx"
    ].map((path) => readFileSync(resolve(path), "utf8")).join("\n");
    const tvSource = readFileSync(resolve("src/client/tv/TvApp.tsx"), "utf8");
    const inspectorSource = readFileSync(resolve("src/client/tv/admin/AdminMapInspector.tsx"), "utf8");

    expect(phoneSources).not.toMatch(/AdminMapInspector|Map Inspector/i);
    expect(tvSource).toMatch(/AdminMapInspector/);
    expect(inspectorSource).not.toMatch(/sendIntent|dispatch|three(?:\.js)?|<canvas/i);
  });
});
