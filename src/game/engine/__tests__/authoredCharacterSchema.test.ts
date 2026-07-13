import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCharacters, parseAuthoredCharacter } from "../../content/characters.js";
import { authoredCharacterSchema, characterSchema } from "../../schema/character.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const CHARACTER_ROOT = join(process.cwd(), "content", "characters");

function rawCharacters(): Array<{ file: string; record: Record<string, unknown> }> {
  return readdirSync(CHARACTER_ROOT)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      file,
      record: JSON.parse(readFileSync(join(CHARACTER_ROOT, file), "utf8")) as Record<string, unknown>
    }));
}

describe("Phase 1N authored character boundary", () => {
  it("loads exactly 17 canonical definitions without authored Heat", () => {
    const raw = rawCharacters();
    const catalog = loadCharacters();

    expect(raw).toHaveLength(17);
    expect(catalog.size).toBe(17);
    expect(raw.every(({ record }) => !Object.prototype.hasOwnProperty.call(record, "heat"))).toBe(true);
    expect([...catalog.values()].every((character) => !("heat" in character))).toBe(true);
    expect(raw.map(({ record }) => record.id).sort()).toEqual([...catalog.keys()].sort());
  });

  it.each([0, 7, -1, 1.5])("rejects authored character Heat value %s instead of stripping it", (heat) => {
    const definition = loadCharacters().get("void-marshal");
    expect(definition).toBeDefined();
    const result = authoredCharacterSchema.safeParse({ ...definition, heat });
    expect(result.success).toBe(false);
    expect(() => parseAuthoredCharacter({ ...definition, heat }, "content/characters/void-marshal.json"))
      .toThrow(/content[\\/]characters[\\/]void-marshal\.json \(void-marshal\).*heat/i);
  });

  it("rejects unknown Heat-shaped authored fields and still requires ordinary character fields", () => {
    const definition = loadCharacters().get("void-marshal");
    expect(definition).toBeDefined();
    expect(authoredCharacterSchema.safeParse({ ...definition, hiddenHeatReserve: 0 }).success).toBe(false);
    const { id: _id, ...missingId } = definition!;
    expect(authoredCharacterSchema.safeParse(missingId).success).toBe(false);
  });

  it("keeps the persisted runtime schema strict about required Heat and preserves nonzero values", () => {
    const definition = loadCharacters().get("void-marshal");
    expect(definition).toBeDefined();
    expect(characterSchema.safeParse(definition).success).toBe(false);
    expect(characterSchema.parse({ ...definition, heat: 0 }).heat).toBe(0);
    expect(characterSchema.parse({ ...definition, heat: 7 }).heat).toBe(7);
  });

  it.each([
    ["single-player", "single-player", "co-op"],
    ["cooperative", "multiplayer", "co-op"],
    ["rivalry", "multiplayer", "rivalry"]
  ] as const)("composes authored definitions into valid %s runtime characters", (label, sessionMode, interactionMode) => {
    const state = createInitialSessionState(`phase-1n-${label}`, sessionMode, undefined, interactionMode, "standard", sessionMode === "multiplayer" ? 2 : 1);
    expect(state.players.every((player) => player.character.heat === 0)).toBe(true);
    expect(state.players.every((player) => characterSchema.safeParse(player.character).success)).toBe(true);
  });
});
