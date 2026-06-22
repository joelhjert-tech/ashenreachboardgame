import { join } from "node:path";
import { anomalyCardSchema, type AnomalyCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadAnomalyCards(
  contentRoot = join(process.cwd(), "content", "cards", "anomalies")
): Map<string, AnomalyCard> {
  return loadContentMap(contentRoot, anomalyCardSchema);
}
