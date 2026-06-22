import { join } from "node:path";
import { gearItemSchema, type GearItem } from "../schema/gear.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadGear(contentRoot = join(process.cwd(), "content", "gear")): Map<string, GearItem> {
  return loadContentMap(contentRoot, gearItemSchema);
}
