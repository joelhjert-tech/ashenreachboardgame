import { join } from "node:path";
import { followerSchema, type Follower } from "../schema/follower.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadFollowers(contentRoot = join(process.cwd(), "content", "followers")): Map<string, Follower> {
  return loadContentMap(contentRoot, followerSchema);
}
