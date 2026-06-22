import { join } from "node:path";
import { threatCardSchema, type ThreatCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadThreatCards(contentRoot = join(process.cwd(), "content", "cards", "threats")): Map<string, ThreatCard> {
  return loadContentMap(contentRoot, threatCardSchema);
}
