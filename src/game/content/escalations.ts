import { join } from "node:path";
import { escalationCardSchema, type EscalationCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadEscalationCards(
  contentRoot = join(process.cwd(), "content", "cards", "escalations")
): Map<string, EscalationCard> {
  return loadContentMap(contentRoot, escalationCardSchema);
}
