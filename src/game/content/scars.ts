import { join } from "node:path";
import { scarCardSchema, type ScarCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadScarCards(
  contentRoot = join(process.cwd(), "content", "cards", "scars")
): Map<string, ScarCard> {
  // Zod defaults make the schema input slightly wider than its parsed output.
  // Content consumers always receive the parsed/output ScarCard shape.
  return loadContentMap(contentRoot, scarCardSchema) as Map<string, ScarCard>;
}
