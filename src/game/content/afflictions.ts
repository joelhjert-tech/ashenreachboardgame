import { join } from "node:path";
import { afflictionCardSchema, type AfflictionCard } from "../schema/affliction.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadAfflictionCards(
  contentRoot = join(process.cwd(), "content", "cards", "afflictions")
): Map<string, AfflictionCard> {
  return loadContentMap(contentRoot, afflictionCardSchema);
}
