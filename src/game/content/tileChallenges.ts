import { join } from "node:path";
import { authoredTileChallengeSchema, type TileChallenge } from "../schema/tileChallenge.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadTileChallenges(contentRoot = join(process.cwd(), "content", "tile-challenges")): Map<string, TileChallenge> {
  return loadContentMap(contentRoot, authoredTileChallengeSchema);
}
