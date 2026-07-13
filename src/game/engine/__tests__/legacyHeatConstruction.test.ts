import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";
import { createLegacyCharacterCompatibilityState } from "../../rules/legacyHeatCompatibility.js";
import { characterSchema, type AuthoredCharacter } from "../../schema/character.schema.js";
import { gameStateSchema } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";
import { GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const ROOT = process.cwd();

function productionTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : productionTypeScriptFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function enclosingFunctionName(node: ts.Node): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) return current.name?.getText() ?? "<anonymous>";
    current = current.parent;
  }
  return "<module>";
}

function mutateServerCharacterTemplate(server: GameRoomServer, characterId: string, heat: number): void {
  const catalogs = server as unknown as { characters: Map<string, AuthoredCharacter> };
  const template = catalogs.characters.get(characterId);
  if (!template) throw new Error(`Missing character ${characterId}`);
  catalogs.characters.set(characterId, { ...template, heat } as unknown as AuthoredCharacter);
}

describe("Phase 1M legacy character compatibility construction", () => {
  it("returns a fresh exact compatibility object without content, mode, or scenario input", () => {
    const first = createLegacyCharacterCompatibilityState();
    const second = createLegacyCharacterCompatibilityState();
    expect(first).toEqual({ heat: 0 });
    expect(Number.isInteger(first.heat)).toBe(true);
    expect(Object.keys(first)).toEqual(["heat"]);
    expect(first).not.toBe(second);
  });

  it.each([
    ["single-player", "single-player", "co-op"],
    ["cooperative", "multiplayer", "co-op"],
    ["rivalry", "multiplayer", "rivalry"]
  ] as const)("constructs %s session characters with compatibility Heat zero", (_label, sessionMode, interactionMode) => {
    const state = createInitialSessionState(`phase-1m-${_label}`, sessionMode, undefined, interactionMode, "standard", sessionMode === "multiplayer" ? 2 : 1);
    expect(state.players.length).toBeGreaterThan(0);
    expect(state.players.every((player) => player.character.heat === 0)).toBe(true);
  });

  it("character selection ignores an authored template Heat value", () => {
    const state = createInitialSessionState("phase-1m-selection", "single-player");
    state.seats[0]!.displayName = "Compatibility Tester";
    const server = new GameRoomServer(state);
    mutateServerCharacterTemplate(server, "signal-witch", 7);
    server.selectSeatCharacter("seat-1", "signal-witch", { suppressBroadcast: true });
    expect(server.getState().players[0]!.character.id).toBe("signal-witch");
    expect(server.getState().players[0]!.character.heat).toBe(0);
  });

  it("replacement construction resets compatibility Heat without transferring the recalled or authored value", () => {
    const state = createInitialSessionState("phase-1m-replacement", "single-player");
    const player = state.players[0]!;
    player.character.status = "recalled";
    player.character.heat = 5;
    player.character.scars = ["scar-wound-1"];
    const replacement = loadCharacters().get("signal-witch");
    if (!replacement) throw new Error("Missing signal-witch");
    const result = reduceGameState(state, {
      type: "RECRUIT_REPLACEMENT", seatId: player.seatId, replacementCharacterId: replacement.id,
      replacementCharacter: replacement, createdAt: "phase-1m"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.id).toBe("signal-witch");
    expect(result.state.players[0]!.character.heat).toBe(0);
    expect(result.state.players[0]!.character.scars).toContain("scar-wound-1");
  });

  it("preserves an old nonzero value through parse, serialization, restoration, and unrelated new construction", () => {
    const state = createInitialSessionState("phase-1m-old-save", "multiplayer", undefined, "co-op", "standard", 2);
    state.players[0]!.character.heat = 7;
    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(state)));
    const server = new GameRoomServer(restored);
    expect(server.getState().players[0]!.character.heat).toBe(7);
    server.getState().seats[1]!.displayName = "Second Seat";
    mutateServerCharacterTemplate(server, "grave-engineer", 6);
    server.selectSeatCharacter("seat-2", "grave-engineer", { suppressBroadcast: true });
    expect(server.getState().players[0]!.character.heat).toBe(7);
    expect(server.getState().players[1]!.character.heat).toBe(0);
    expect(gameStateSchema.parse(JSON.parse(JSON.stringify(server.getState()))).players[0]!.character.heat).toBe(7);
  });

  it("keeps missing character Heat invalid while accepting historical nonzero values", () => {
    const character = loadCharacters().get("void-marshal");
    if (!character) throw new Error("Missing void-marshal");
    expect(characterSchema.parse({ ...character, heat: 7 }).heat).toBe(7);
    expect(characterSchema.safeParse(character).success).toBe(false);
  });

  it("guards the one constructor, four call sites, two projection zeros, and two preservation copies", () => {
    const files = [...productionTypeScriptFiles(join(ROOT, "src", "game")), ...productionTypeScriptFiles(join(ROOT, "src", "server"))];
    const zeroAssignments: string[] = [];
    const constructorCalls: string[] = [];
    const storedHeatAccesses: string[] = [];
    for (const file of files) {
      const sourceFile = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        const owner = `${relative(ROOT, file).replaceAll("\\", "/")}:${enclosingFunctionName(node)}`;
        if (ts.isPropertyAssignment(node) && node.name.getText(sourceFile) === "heat" && ts.isNumericLiteral(node.initializer) && node.initializer.text === "0") zeroAssignments.push(owner);
        if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "createLegacyCharacterCompatibilityState") constructorCalls.push(owner);
        if (ts.isPropertyAccessExpression(node) && node.getText(sourceFile).endsWith("character.heat")) storedHeatAccesses.push(owner);
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    expect(zeroAssignments.sort()).toEqual([
      "src/game/rules/legacyHeatCompatibility.ts:createLegacyCharacterCompatibilityState",
      "src/server/roomServer.ts:buildPublicShopEncounter",
      "src/server/roomServer.ts:createTvProjection"
    ]);
    expect(constructorCalls.sort()).toEqual([
      "src/game/engine/reducer.ts:reduceGameState",
      "src/server/roomServer.ts:createFreshCharacter",
      "src/server/roomServer.ts:selectSeatCharacter",
      "src/server/sessionState.ts:cloneCharacter"
    ]);
    expect(storedHeatAccesses.sort()).toEqual([
      "src/game/engine/reducer.ts:applyShopCostOnlyToPlayer",
      "src/game/engine/reducer.ts:applyShopServiceToPlayer"
    ]);
  });
});
