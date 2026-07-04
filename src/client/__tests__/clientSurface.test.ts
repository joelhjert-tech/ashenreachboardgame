import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { selectClientSurface } from "../clientSurface.js";

describe("client route surface selection", () => {
  it("loads the TV surface for /tv paths and preserves query strings", () => {
    expect(selectClientSurface("/tv")).toBe("tv");
    expect(selectClientSurface("/tv?resetAuth=1")).toBe("tv");
    expect(selectClientSurface("/tv/room/ABC123")).toBe("tv");
  });

  it("loads the phone surface for root and room-code links", () => {
    expect(selectClientSurface("/")).toBe("phone");
    expect(selectClientSurface("/?room=ABC123")).toBe("phone");
    expect(selectClientSurface("/join?room=ABC123")).toBe("phone");
  });

  it("keeps main.tsx from statically importing both app surfaces", async () => {
    const mainSource = await readFile(resolve(process.cwd(), "src/client/main.tsx"), "utf8");

    expect(mainSource).not.toMatch(/import\s+\{\s*PhoneApp\s*\}\s+from\s+["']\.\/phone\/PhoneApp\.js["']/);
    expect(mainSource).not.toMatch(/import\s+\{\s*TvApp\s*\}\s+from\s+["']\.\/tv\/TvApp\.js["']/);
    expect(mainSource).toMatch(/import\(["']\.\/phone\/PhoneApp\.js["']\)/);
    expect(mainSource).toMatch(/import\(["']\.\/tv\/TvApp\.js["']\)/);
  });
});
