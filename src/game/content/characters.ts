import { join } from "node:path";
import { characterSchema, type Character } from "../schema/character.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadCharacters(
  contentRoot = join(process.cwd(), "content", "characters")
): Map<string, Character> {
  return loadContentMap(contentRoot, characterSchema);
}
