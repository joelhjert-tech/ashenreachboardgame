import { join } from "node:path";
import { scarCardSchema, type ScarCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadScarCards(
  contentRoot = join(process.cwd(), "content", "cards", "scars")
): Map<string, ScarCard> {
  return loadContentMap(contentRoot, scarCardSchema);
}
