import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gearItemSchema, type GearItem } from "../schema/gear.schema.js";

export function loadGear(contentRoot = join(process.cwd(), "content", "gear")): Map<string, GearItem> {
  const files = readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"));
  const items = new Map<string, GearItem>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(contentRoot, file), "utf8"));
    const item = gearItemSchema.parse(parsed);
    items.set(item.id, item);
  }

  return items;
}
