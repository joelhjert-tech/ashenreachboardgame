import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadArtifactCards } from "../src/game/content/artifacts.js";
import { loadCharacters } from "../src/game/content/characters.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadFollowers } from "../src/game/content/followers.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadScarCards } from "../src/game/content/scars.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { effectSchema, type EncounterEffect } from "../src/game/schema/card.schema.js";
import { sectorGraphSchema, type SectorNode } from "../src/game/schema/sector.schema.js";

const sectorsRoot = join(process.cwd(), "content", "sectors");
const errors: string[] = [];

const characters = loadCharacters();
const gear = loadGear();
const threats = loadThreatCards();
const contracts = loadContracts();
const anomalies = loadAnomalyCards();
const artifacts = loadArtifactCards();
const followers = loadFollowers();
const scars = loadScarCards();
const escalations = loadEscalationCards();

const sectorFiles = readdirSync(sectorsRoot).filter((entry) => entry.endsWith(".json"));

for (const character of characters.values()) {
  for (const heldItem of character.heldGear) {
    if (!gear.has(heldItem.id)) {
      errors.push(`Character ${character.id} holds unknown gear ${heldItem.id}`);
    }
  }

  for (const [slot, itemId] of Object.entries(character.equippedGear)) {
    if (itemId && !gear.has(itemId)) {
      errors.push(`Character ${character.id} equips unknown ${slot} gear ${itemId}`);
    }
  }
}

for (const card of threats.values()) {
  validateEffect(card.cardType === "enemy" ? card.defeatReward : card.successEffect, `${card.id} reward`);
  validateEffect(card.cardType === "enemy" ? card.woundOnLoss : card.failEffect, `${card.id} failure`);
}

for (const contract of contracts.values()) {
  validateEffect(contract.reward, `${contract.id} reward`);
}

for (const anomaly of anomalies.values()) {
  validateEffect(anomaly.resolveEffect, `${anomaly.id} resolution`);
}

for (const artifact of artifacts.values()) {
  validateEffect(artifact.resolveEffect, `${artifact.id} resolution`);
}

for (const follower of followers.values()) {
  if (follower.passiveEffect) {
    validateUnknownEffect(follower.passiveEffect, `${follower.id} passive effect`);
  }

  if (follower.activeEffect) {
    validateUnknownEffect(follower.activeEffect, `${follower.id} active effect`);
  }
}

for (const escalation of escalations.values()) {
  if (escalation.resolveEffect) {
    validateEffect(escalation.resolveEffect, `${escalation.id} resolution`);
  }
}

for (const file of sectorFiles) {
  const parsed = JSON.parse(readFileSync(join(sectorsRoot, file), "utf8"));
  const graph = sectorGraphSchema.parse(parsed);

  for (const sector of graph.nodes) {
    validateSectorDeckRefs(file, sector);
  }
}

reportDuplicateIds("characters", characters.keys());
reportDuplicateIds("gear", gear.keys());
reportDuplicateIds("threats", threats.keys());
reportDuplicateIds("contracts", contracts.keys());
reportDuplicateIds("anomalies", anomalies.keys());
reportDuplicateIds("artifacts", artifacts.keys());
reportDuplicateIds("followers", followers.keys());
reportDuplicateIds("scars", scars.keys());
reportDuplicateIds("escalations", escalations.keys());

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed (${characters.size} characters, ${gear.size} gear, ${threats.size} threats, ${contracts.size} contracts, ${anomalies.size} anomalies, ${artifacts.size} artifacts, ${followers.size} followers, ${scars.size} scars, ${escalations.size} escalations)`
);

function validateSectorDeckRefs(file: string, sector: SectorNode): void {
  for (const id of sector.encounterDecks.threat) {
    if (!threats.has(id)) {
      errors.push(`${file}:${sector.id} references missing threat ${id}`);
    }
  }

  for (const id of sector.encounterDecks.contract) {
    if (!contracts.has(id)) {
      errors.push(`${file}:${sector.id} references missing contract ${id}`);
    }
  }

  for (const id of sector.encounterDecks.anomaly) {
    if (!anomalies.has(id)) {
      errors.push(`${file}:${sector.id} references missing anomaly ${id}`);
    }
  }

  for (const id of sector.encounterDecks.artifact) {
    if (!artifacts.has(id)) {
      errors.push(`${file}:${sector.id} references missing artifact ${id}`);
    }
  }

  for (const id of sector.encounterDecks.escalation) {
    if (!escalations.has(id)) {
      errors.push(`${file}:${sector.id} references missing escalation ${id}`);
    }
  }
}

function validateEffect(effect: EncounterEffect, context: string): void {
  if (effect.type === "gain_gear" && !gear.has(effect.gearId)) {
    errors.push(`${context} references missing gear ${effect.gearId}`);
    return;
  }

  if (effect.type === "gain_scar" && !scars.has(effect.scarId)) {
    errors.push(`${context} references missing scar ${effect.scarId}`);
    return;
  }

  if (effect.type === "gain_follower" && !followers.has(effect.followerId)) {
    errors.push(`${context} references missing follower ${effect.followerId}`);
    return;
  }

  if (effect.type === "sequence") {
    for (const nestedEffect of effect.effects) {
      validateEffect(nestedEffect, context);
    }
  }
}

function validateUnknownEffect(effect: unknown, context: string): void {
  const parsed = effectSchema.safeParse(effect);

  if (!parsed.success) {
    errors.push(`${context} has invalid effect shape`);
    return;
  }

  validateEffect(parsed.data, context);
}

function reportDuplicateIds(group: string, ids: Iterable<string>): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(`Duplicate id ${id} found in ${group}`);
      continue;
    }

    seen.add(id);
  }
}
