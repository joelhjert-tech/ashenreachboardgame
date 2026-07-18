import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PLAYER_FACING_SHOP_FILES = [
  "src/server/roomServer.ts",
  "src/client/tv/HostShopOverlay.tsx",
  "src/client/phone/PhoneActionPanel.tsx",
  "src/game/data/boardSpaces.ts"
] as const;

describe("shop equipment wording", () => {
  it("uses browse wording for the distinct Equipment and Supplies catalogs", () => {
    const playerFacingSource = PLAYER_FACING_SHOP_FILES
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(playerFacingSource).not.toMatch(/supply cards/i);
    expect(playerFacingSource).not.toMatch(/bought supplies/i);
    expect(playerFacingSource).not.toMatch(/supply crate/i);
    expect(playerFacingSource).toMatch(/Browse Equipment/);
    expect(playerFacingSource).toMatch(/Browse Supplies/);
  });

  it("keeps the stable supplies service ID behind a player-facing catalog label", () => {
    const serverSource = readFileSync(join(process.cwd(), "src/server/roomServer.ts"), "utf8");

    expect(serverSource).toContain('id: "buy-supplies"');
    expect(serverSource).toContain('label: "Browse Supplies"');
  });
});
