import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin library client boundary", () => {
  it("is exposed only through the host TV surface", () => {
    const phoneSources = [
      "src/client/phone/PhoneApp.tsx",
      "src/client/phone/PortraitControllerView.tsx",
      "src/client/phone/PhoneActionPanel.tsx"
    ].map((path) => readFileSync(resolve(path), "utf8")).join("\n");
    const tvSource = readFileSync(resolve("src/client/tv/TvApp.tsx"), "utf8");

    expect(phoneSources).not.toMatch(/AdminLibrary|admin card library/i);
    expect(tvSource).toMatch(/AdminLibrary/);
  });
});
