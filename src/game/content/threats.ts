import { join } from "node:path";
import {
  authoredThreatCardSchema,
  legacyCompatibleThreatCardSchema,
  type ThreatCard
} from "../schema/card.schema.js";
import { normalizeLegacyThreatCard } from "../rules/legacyHeatCompatibility.js";
import { loadContentMap } from "./loadContentMap.js";

const FROZEN_LEGACY_HEAT_TAG_IDS = new Set([
  "grave-lattice-reclaimer",
  "iron-lung-grenadier",
  "mirror-lord-envoy",
  "reliquary-judge"
]);

export function loadThreatCards(contentRoot = join(process.cwd(), "content", "cards", "threats")): Map<string, ThreatCard> {
  const legacy = loadContentMap(contentRoot, legacyCompatibleThreatCardSchema);
  return new Map([...legacy.entries()].map(([id, card]) => {
    if (card.resourceTags?.includes("heat") && !FROZEN_LEGACY_HEAT_TAG_IDS.has(card.id)) {
      throw new Error(`${card.id} is not an approved legacy Heat-tagged Threat`);
    }
    const normalized = normalizeLegacyThreatCard(card);
    authoredThreatCardSchema.parse(normalized);
    return [id, normalized];
  }));
}
