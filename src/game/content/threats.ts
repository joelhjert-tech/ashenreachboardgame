import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { threatCardSchema, type ThreatCard } from "../schema/card.schema.js";

export function loadThreatCards(contentRoot = join(process.cwd(), "content", "cards", "threats")): Map<string, ThreatCard> {
  const files = readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"));
  const cards = new Map<string, ThreatCard>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(contentRoot, file), "utf8"));
    const card = threatCardSchema.parse(parsed);
    cards.set(card.id, card);
  }

  return cards;
}
