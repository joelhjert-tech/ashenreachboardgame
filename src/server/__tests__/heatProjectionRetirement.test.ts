import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("Phase 1R Heat-free projection contracts", () => {
  it.each([
    ["single-player", "co-op", 1],
    ["multiplayer", "co-op", 2],
    ["multiplayer", "rivalry", 2]
  ] as const)("omits Heat from public and owner-private %s/%s projections", (sessionMode, interactionMode, playerCount) => {
    const state = createInitialSessionState(`phase-1r-${sessionMode}-${interactionMode}`, sessionMode, undefined, interactionMode, "standard", playerCount);
    state.status = "active";
    state.seats = state.seats.map((seat, index) => ({ ...seat, displayName: `Player ${index + 1}`, connected: true, characterSelected: true }));
    const tv = createTvProjection(state) as any;
    const phone = createPhoneProjection(state, state.players[0]!.seatId, true) as any;

    expect(tv.players).toHaveLength(playerCount);
    expect(tv.players.every((player: any) => !("heat" in player.character))).toBe(true);
    expect(phone.players.every((player: any) => !("heat" in player.character))).toBe(true);
    expect(phone.self?.character).not.toHaveProperty("heat");
    expect(phone.self?.character.heldGear).toEqual(state.players[0]!.character.heldGear);
    expect(phone.privateRivalry).toEqual(interactionMode === "rivalry" ? expect.anything() : null);
  });

  it("omits Heat from the shop active player without changing Salvage or services", () => {
    const state = createInitialSessionState("phase-1r-shop", "single-player");
    state.status = "active";
    state.phase = "action";
    state.seats[0] = { ...state.seats[0]!, displayName: "Player 1", connected: true, characterSelected: true };
    state.players[0]!.character.currentSpaceId = "outer_waymarket";
    state.players[0]!.sectorId = "outer_waymarket";
    state.players[0]!.character.salvage = 6;
    const tv = createTvProjection(state) as any;
    const phone = createPhoneProjection(state, state.players[0]!.seatId, true) as any;

    for (const projection of [tv, phone]) {
      expect(projection.shopEncounter.activePlayer).not.toHaveProperty("heat");
      expect(projection.shopEncounter.activePlayer.salvage).toBe(6);
      expect(projection.shopEncounter.services).toEqual(expect.arrayContaining([expect.objectContaining({ id: "buy-gear" })]));
    }
  });

  it("keeps current projection types and producers Heat-free without touching legacy snapshot support", () => {
    const roomServer = readFileSync(join(process.cwd(), "src/server/roomServer.ts"), "utf8");
    const sharedTypes = readFileSync(join(process.cwd(), "src/client/shared/types.ts"), "utf8");
    const phoneApp = readFileSync(join(process.cwd(), "src/client/phone/PhoneApp.tsx"), "utf8");
    const sessionSchema = readFileSync(join(process.cwd(), "src/game/schema/session.schema.ts"), "utf8");
    const characterSchema = readFileSync(join(process.cwd(), "src/game/schema/character.schema.ts"), "utf8");

    expect(roomServer).not.toMatch(/\bheat:\s*0\b/);
    expect(sharedTypes.match(/^\s*heat:\s*number;/gm) ?? []).toHaveLength(0);
    expect(sharedTypes).not.toMatch(/Omit<PrivateCharacter,\s*["']heat["']>/);
    expect(phoneApp).not.toMatch(/selectedCharacter\.heat|\bheat:\s*0\b/);
    expect(sessionSchema).toContain("legacyCharacterSchemaV0");
    expect(characterSchema).toMatch(/legacyCharacterSchemaV0[\s\S]*heat:\s*z\.number\(\)\.int\(\)\.min\(0\)/);
  });
});
