import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { GameRoomServer } from "../roomServer.js";

describe("QA character catalog gating", () => {
  it("hides QA-only operatives from the normal catalog but exposes them for debug catalogs", () => {
    const roomServer = new GameRoomServer(createInitialSessionState("QA01"));

    expect(roomServer.getCharacterCatalog().some((character) => character.id === "char_master_alpha")).toBe(false);
    expect(roomServer.getCharacterCatalog({ includeQa: true }).some((character) => character.id === "char_master_alpha")).toBe(true);
  });

  it("projects normal character role metadata without recommending QA operatives", () => {
    const roomServer = new GameRoomServer(createInitialSessionState("QA01"));
    const normalCatalog = roomServer.getCharacterCatalog();
    const debugCatalog = roomServer.getCharacterCatalog({ includeQa: true });

    expect(normalCatalog.find((character) => character.id === "void-marshal")?.presentation).toMatchObject({
      role: "Commander",
      complexity: "beginner",
      recommendedForFirstGame: true
    });
    expect(debugCatalog.find((character) => character.id === "char_master_alpha")?.presentation).toBeUndefined();
  });
});
