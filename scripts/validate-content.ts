import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { characterSchema } from "../src/game/schema/character.schema.js";
import { threatCardSchema } from "../src/game/schema/card.schema.js";
import { contractCardSchema } from "../src/game/schema/contract.schema.js";
import { gearItemSchema } from "../src/game/schema/gear.schema.js";
import { sectorGraphSchema } from "../src/game/schema/sector.schema.js";
const characterRoot = join(process.cwd(), "content/characters");

for (const file of readdirSync(characterRoot).filter((entry) => entry.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(join(characterRoot, file), "utf8"));
  characterSchema.parse(parsed);
}

const sectors = JSON.parse(readFileSync(join(process.cwd(), "content/sectors/borderlight.json"), "utf8"));
sectorGraphSchema.parse(sectors);

const gearRoot = join(process.cwd(), "content/gear");

for (const file of readdirSync(gearRoot).filter((entry) => entry.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(join(gearRoot, file), "utf8"));
  gearItemSchema.parse(parsed);
}

const threatRoot = join(process.cwd(), "content/cards/threats");

for (const file of readdirSync(threatRoot).filter((entry) => entry.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(join(threatRoot, file), "utf8"));
  threatCardSchema.parse(parsed);
}

const contractRoot = join(process.cwd(), "content/cards/contracts");

for (const file of readdirSync(contractRoot).filter((entry) => entry.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(join(contractRoot, file), "utf8"));
  contractCardSchema.parse(parsed);
}

console.log("Content validation passed");
