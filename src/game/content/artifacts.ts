import { join } from "node:path";
import { artifactCardSchema, type ArtifactCard } from "../schema/card.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadArtifactCards(
  contentRoot = join(process.cwd(), "content", "cards", "artifacts")
): Map<string, ArtifactCard> {
  return loadContentMap(contentRoot, artifactCardSchema);
}
