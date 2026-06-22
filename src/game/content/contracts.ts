import { join } from "node:path";
import { contractCardSchema, type ContractCard } from "../schema/contract.schema.js";
import { loadContentMap } from "./loadContentMap.js";

export function loadContracts(
  contentRoot = join(process.cwd(), "content", "cards", "contracts")
): Map<string, ContractCard> {
  return loadContentMap(contentRoot, contractCardSchema);
}
