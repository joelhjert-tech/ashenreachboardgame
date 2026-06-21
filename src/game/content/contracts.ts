import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contractCardSchema, type ContractCard } from "../schema/contract.schema.js";

export function loadContracts(
  contentRoot = join(process.cwd(), "content", "cards", "contracts")
): Map<string, ContractCard> {
  const files = readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"));
  const contracts = new Map<string, ContractCard>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(contentRoot, file), "utf8"));
    const contract = contractCardSchema.parse(parsed);
    contracts.set(contract.id, contract);
  }

  return contracts;
}
