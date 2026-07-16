import { join } from "node:path";
import {
  legacyCompatibleFollowerSchema,
  normalizeLegacyFollowerMetadata,
  type Follower
} from "../schema/follower.schema.js";
import { loadContentMap } from "./loadContentMap.js";

const FROZEN_LEGACY_HEAT_LOSS_IDS = new Set([
  "black-lantern-broker",
  "choir-defector",
  "gate-saint-acolyte",
  "saltflat-bone-reader"
]);
const FROZEN_LEGACY_HEAT_TAG_IDS = new Set(["lucy-hell-puppy"]);

export function loadFollowers(contentRoot = join(process.cwd(), "content", "followers")): Map<string, Follower> {
  const legacy = loadContentMap(contentRoot, legacyCompatibleFollowerSchema);
  return new Map([...legacy.entries()].map(([id, follower]) => {
    if (follower.lossCondition === "heat" && !FROZEN_LEGACY_HEAT_LOSS_IDS.has(follower.id)) {
      throw new Error(`${follower.id} is not an approved legacy Heat loss-condition record`);
    }
    if (follower.tags?.some((tag) => tag.toLowerCase() === "heat") && !FROZEN_LEGACY_HEAT_TAG_IDS.has(follower.id)) {
      throw new Error(`${follower.id} is not an approved legacy Heat tag record`);
    }
    return [id, normalizeLegacyFollowerMetadata(follower)];
  }));
}
