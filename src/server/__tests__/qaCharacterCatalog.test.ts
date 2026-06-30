import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { GameRoomServer } from "../roomServer.js";

describe("QA character catalog gating", () => {
  it("hides QA-only operatives from the normal catalog but exposes them for debug catalogs", () => {
    const roomServer = new GameRoomServer(createInitialSessionState("QA01"));

    expect(roomServer.getCharacterCatalog().some((character) => character.id === "char_master_alpha")).toBe(false);
    expect(roomServer.getCharacterCatalog({ includeQa: true }).some((character) => character.id === "char_master_alpha")).toBe(true);
  });
});
