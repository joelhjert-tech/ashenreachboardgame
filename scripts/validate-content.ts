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
import { getThreatEffectTiming, isThreatEffectKey } from "../src/game/cards/threatEffects.js";
import { BOARD_SPACES } from "../src/game/data/boardSpaces.js";
import { validateBoardTextEffectCoverage } from "../src/game/data/boardTextEffects.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../src/game/data/canonicalSectorGraph.js";
import { ashenReachCharacters } from "../src/game/data/characters.js";
import { missions } from "../src/game/data/missions.js";
import { nemeses } from "../src/game/data/nemeses.js";
import { SCENARIOS } from "../src/game/data/scenarios.js";
import { allThreatCards } from "../src/game/data/threatDecks.js";
import { effectSchema, threatFamilySchema, type EncounterEffect, type ThreatCard } from "../src/game/schema/card.schema.js";
import { sectorGraphSchema, type SectorNode } from "../src/game/schema/sector.schema.js";

const sectorsRoot = join(process.cwd(), "content", "sectors");
const contentRoot = join(process.cwd(), "content");
const errors: string[] = [];
const loreRestrictedTerms = [
  "Relic",
  "Talisman",
  "Warhammer",
  "Warhammer 40,000",
  "Games Workshop",
  "Fantasy Flight",
  "Imperium",
  "Inquisition",
  "Space Marine",
  "Chaos",
  "Adeptus",
  "Psyker",
  "Psychic",
  "Ork",
  "Eldar",
  "Tyranid",
  "Necron",
  "Crown of Command",
  "Heresy",
  "Medicae",
  "Hive",
  "Antias",
  "Mission",
  "Power",
  "Influence",
  "Corruption",
  "Strength",
  "Willpower",
  "Cunning",
  "Riftspawn"
] as const;
const loreRestrictedPatterns = loreRestrictedTerms.map((term) => ({
  term,
  pattern: new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")
}));
const visibleLoreKeys = new Set([
  "activeText",
  "affiliation",
  "bounty",
  "confrontationText",
  "confrontationTitle",
  "designFeel",
  "failureSummary",
  "flavor",
  "gameplayRole",
  "imagePrompt",
  "label",
  "linkedMechanic",
  "loreRole",
  "name",
  "objectiveText",
  "penalty",
  "pressureRule",
  "relief",
  "resolutionSummary",
  "rewardText",
  "setup",
  "sheetArtPrompt",
  "specialRules",
  "summary",
  "text",
  "theme",
  "title",
  "trigger",
  "uiNotes",
  "upside",
  "usage",
  "victoryText"
]);

const characters = loadCharacters();
const gear = loadGear();
const threats = loadThreatCards();
const contracts = loadContracts();
const anomalies = loadAnomalyCards();
const artifacts = loadArtifactCards();
const followers = loadFollowers();
const scars = loadScarCards();
const escalations = loadEscalationCards();
const canonicalSectors = createCanonicalSectorGraph();

validateContentFloors();
validateBoardCoverage();
validateCanonicalDecks();
validateLoreLanguage();

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
  validateThreatFamily(card);
  validateThreatEffectKeys(card);
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

for (const scar of scars.values()) {
  validateEffect(scar.effect, `${scar.id} scar effect`);
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

for (const sector of canonicalSectors) {
  validateSectorDeckRefs("canonical-sector-graph", sector);
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

function validateContentFloors(): void {
  const contentTargets = [
    ["threats", threats.size, 40, 60],
    ["anomalies", anomalies.size, 20, 30],
    ["artifacts", artifacts.size, 12, 20],
    ["escalations", escalations.size, 15, 25],
    ["contracts", contracts.size, 20, 30],
    ["followers", followers.size, 15, 25],
    ["scars", scars.size, 12, 18]
  ] as const;

  for (const [label, actual, minimum, maximum] of contentTargets) {
    if (actual < minimum || actual > maximum) {
      errors.push(`${label} content target not met: ${actual}/${minimum}-${maximum}`);
    }
  }

  const severityCounts = new Map<number, number>();

  for (const threat of threats.values()) {
    severityCounts.set(threat.severity, (severityCounts.get(threat.severity) ?? 0) + 1);
  }

  for (const severity of [1, 2, 3, 4, 5]) {
    if (!severityCounts.has(severity)) {
      errors.push(`Threat severity curve is missing severity ${severity}`);
    }
  }

  const severeThreats = (severityCounts.get(5) ?? 0) / Math.max(threats.size, 1);
  if (severeThreats > 0.2) {
    errors.push(`Severity 5 threats should remain rare; found ${severityCounts.get(5)} of ${threats.size}`);
  }
}

function validateLoreLanguage(): void {
  for (const file of collectJsonFiles(contentRoot)) {
    validateLoreObject(JSON.parse(readFileSync(file, "utf8")), relativeContentPath(file));
  }

  for (const space of BOARD_SPACES) {
    validateLoreObject(space, `board:${space.id}`);
  }

  for (const scenario of SCENARIOS) {
    validateLoreObject(scenario, `scenario:${scenario.id}`);
  }

  for (const character of ashenReachCharacters) {
    validateLoreObject(character, `character:${character.id}`);
  }

  for (const mission of missions) {
    validateLoreObject(mission, `mission:${mission.id}`);
  }

  for (const threat of allThreatCards) {
    validateLoreObject(threat, `legacy-threat:${threat.id}`);
  }

  for (const nemesis of nemeses) {
    validateLoreObject(nemesis, `nemesis:${nemesis.id}`);
  }
}

function validateBoardCoverage(): void {
  const boardCount = BOARD_SPACES.length;
  if (boardCount < 25 || boardCount > 30) {
    errors.push(`Board space target not met: ${boardCount}/25-30`);
  }

  const tierCounts = countBy(BOARD_SPACES, (space) => space.tier);
  validateRange("outer board spaces", tierCounts.get("outer") ?? 0, 10, 12);
  validateRange("middle board spaces", tierCounts.get("middle") ?? 0, 7, 9);
  validateRange("inner board spaces", tierCounts.get("inner") ?? 0, 5, 7);
  validateRange("center board spaces", tierCounts.get("center") ?? 0, 1, 2);

  const textCoverage = validateBoardTextEffectCoverage();
  for (const key of textCoverage.missingEffectKeys) {
    errors.push(`Board text key ${key} has no resolver`);
  }
  for (const key of textCoverage.unusedEffectKeys) {
    errors.push(`Board text effect ${key} is not used by a board space`);
  }
  for (const key of textCoverage.mismatchedChoiceKeys) {
    errors.push(`Board text choices for ${key} do not match the board definition`);
  }
  for (const key of textCoverage.invalidCheckKeys) {
    errors.push(`Board text effect ${key} has an invalid check definition`);
  }
  for (const key of textCoverage.legacyBoardTestKeys) {
    errors.push(`Board space ${key} still uses legacy inline textBox.test data`);
  }
}

function validateLoreObject(value: unknown, context: string, key = ""): void {
  if (typeof value === "string") {
    if (visibleLoreKeys.has(key)) {
      validateLoreString(value, context);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      validateLoreObject(entry, context, key);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    validateLoreObject(nestedValue, `${context}.${nestedKey}`, nestedKey);
  }
}

function validateLoreString(value: string, context: string): void {
  for (const { term, pattern } of loreRestrictedPatterns) {
    if (pattern.test(value)) {
      errors.push(`${context} uses restricted lore term "${term}"`);
    }
  }
}

function collectJsonFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(root, entry.name);

    if (entry.isDirectory()) {
      return collectJsonFiles(entryPath);
    }

    return entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

function relativeContentPath(file: string): string {
  return file.replace(`${process.cwd()}\\`, "").replaceAll("\\", "/");
}

function validateCanonicalDecks(): void {
  try {
    validateCanonicalSectorGraph(canonicalSectors);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Canonical sector graph failed validation");
  }

  const sectorsByTier = groupSectorsByTier(canonicalSectors);
  validateTierDeckPopulation("outer", sectorsByTier.get("borderlight") ?? []);
  validateTierDeckPopulation("middle", sectorsByTier.get("red_march") ?? []);
  validateTierDeckPopulation("inner", sectorsByTier.get("crownfall") ?? []);

  for (const sector of canonicalSectors) {
    if ((sector.regionTier === "red_march" || sector.regionTier === "crownfall") && sector.encounterDecks.threat.length === 0) {
      errors.push(`${sector.id} must have populated middle/inner threat deck entries`);
    }
  }

  const middleThreatSeverities = collectThreatSeverities(sectorsByTier.get("red_march") ?? []);
  const innerThreatSeverities = collectThreatSeverities(sectorsByTier.get("crownfall") ?? []);

  if (!middleThreatSeverities.some((severity) => severity >= 3)) {
    errors.push("Middle decks must include severity 3+ threats");
  }

  if (!innerThreatSeverities.some((severity) => severity >= 4)) {
    errors.push("Inner decks must include severity 4+ threats");
  }
}

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

function validateThreatEffectKeys(card: ThreatCard): void {
  validateThreatKey(card.effectKey, "onReveal", `${card.id} effectKey`);
  validateThreatKey(card.revealEffectKey, "onReveal", `${card.id} revealEffectKey`);
  validateThreatKey(card.successEffectKey, "onSuccess", `${card.id} successEffectKey`);
  validateThreatKey(card.defeatEffectKey, "onDefeat", `${card.id} defeatEffectKey`);
  validateThreatKey(card.failEffectKey, "onFailure", `${card.id} failEffectKey`);

  for (const [index, key] of (card.combatEffectKeys ?? []).entries()) {
    validateThreatKey(key, "beforeCombat", `${card.id} combatEffectKeys[${index}]`);
  }
}

function validateThreatFamily(card: ThreatCard): void {
  if (!card.enemyFamily) {
    errors.push(`${card.id} is missing enemyFamily`);
    return;
  }

  if (!threatFamilySchema.safeParse(card.enemyFamily).success) {
    errors.push(`${card.id} has invalid enemyFamily ${card.enemyFamily}`);
  }

  if (card.cardType === "enemy" && card.enemyFamily === "hazard") {
    errors.push(`${card.id} is an enemy and cannot use enemyFamily hazard`);
  }
}

function validateThreatKey(key: string | undefined, expectedTiming: ReturnType<typeof getThreatEffectTiming>, context: string): void {
  if (!key) {
    return;
  }

  if (!isThreatEffectKey(key)) {
    errors.push(`${context} references missing threat effect key ${key}`);
    return;
  }

  const actualTiming = getThreatEffectTiming(key);
  if (actualTiming !== expectedTiming) {
    errors.push(`${context} uses ${key} at ${expectedTiming}, but it is registered for ${actualTiming}`);
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

function validateRange(label: string, actual: number, minimum: number, maximum: number): void {
  if (actual < minimum || actual > maximum) {
    errors.push(`${label} outside target range: ${actual}/${minimum}-${maximum}`);
  }
}

function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function groupSectorsByTier(sectors: SectorNode[]): Map<string, SectorNode[]> {
  const grouped = new Map<string, SectorNode[]>();

  for (const sector of sectors) {
    grouped.set(sector.regionTier, [...(grouped.get(sector.regionTier) ?? []), sector]);
  }

  return grouped;
}

function validateTierDeckPopulation(label: string, sectors: SectorNode[]): void {
  const totals = {
    threat: 0,
    anomaly: 0,
    contract: 0,
    artifact: 0,
    escalation: 0
  };

  for (const sector of sectors) {
    totals.threat += sector.encounterDecks.threat.length;
    totals.anomaly += sector.encounterDecks.anomaly.length;
    totals.contract += sector.encounterDecks.contract.length;
    totals.artifact += sector.encounterDecks.artifact.length;
    totals.escalation += sector.encounterDecks.escalation.length;
  }

  if (totals.threat === 0) {
    errors.push(`${label} tier has no threat deck population`);
  }

  if (label !== "outer" && totals.anomaly === 0) {
    errors.push(`${label} tier has no anomaly deck population`);
  }

  if (label !== "outer" && totals.artifact === 0) {
    errors.push(`${label} tier has no artifact deck population`);
  }

  if (label !== "outer" && totals.escalation === 0) {
    errors.push(`${label} tier has no escalation deck population`);
  }
}

function collectThreatSeverities(sectors: SectorNode[]): number[] {
  return sectors.flatMap((sector) =>
    sector.encounterDecks.threat.flatMap((threatId) => {
      const threat = threats.get(threatId);
      return threat ? [threat.severity] : [];
    })
  );
}
