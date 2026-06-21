import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { characterSchema, type Character } from "../schema/character.schema.js";

export function loadCharacters(
  contentRoot = join(process.cwd(), "content", "characters")
): Map<string, Character> {
  const files = readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"));
  const characters = new Map<string, Character>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(contentRoot, file), "utf8"));
    const character = characterSchema.parse(parsed);
    characters.set(character.id, character);
  }

  return characters;
}
