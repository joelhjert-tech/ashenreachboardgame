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
  it("keeps obsolete supply-economy wording out of player-facing shop sources", () => {
    const playerFacingSource = PLAYER_FACING_SHOP_FILES
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(playerFacingSource).not.toMatch(/buy supplies/i);
    expect(playerFacingSource).not.toMatch(/supply cards/i);
    expect(playerFacingSource).not.toMatch(/bought supplies/i);
    expect(playerFacingSource).not.toMatch(/supply crate/i);
    expect(playerFacingSource).toMatch(/Buy Equipment/);
  });

  it("allowlists the legacy service ID without exposing it as its label", () => {
    const serverSource = readFileSync(join(process.cwd(), "src/server/roomServer.ts"), "utf8");

    expect(serverSource).toContain('id: "buy-supplies"');
    expect(serverSource).toContain('label: "Buy Equipment"');
  });
});
