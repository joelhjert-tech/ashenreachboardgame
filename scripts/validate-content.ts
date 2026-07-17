import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadAfflictionCards } from "../src/game/content/afflictions.js";
import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadArtifactCards } from "../src/game/content/artifacts.js";
import { loadCharacters } from "../src/game/content/characters.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadFollowers } from "../src/game/content/followers.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadScarCards } from "../src/game/content/scars.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { loadTileChallenges } from "../src/game/content/tileChallenges.js";
import { getThreatEffectTiming, isThreatEffectKey } from "../src/game/cards/threatEffects.js";
import { FOLLOWER_ACQUISITION_SOURCES, QA_FOLLOWER_IDS } from "../src/game/data/followerAcquisition.js";
import { BOARD_SPACES } from "../src/game/data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS, validateBoardTextEffectCoverage } from "../src/game/data/boardTextEffects.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../src/game/data/canonicalSectorGraph.js";
import { ashenReachCharacters } from "../src/game/data/characters.js";
import { missions } from "../src/game/data/missions.js";
import { nemeses } from "../src/game/data/nemeses.js";
import { SCENARIOS } from "../src/game/data/scenarios.js";
import { allThreatCards } from "../src/game/data/threatDecks.js";
import {
  cardRaritySchema,
  cardResourceTagSchema,
  cardTempoSchema,
  effectSchema,
  threatFamilySchema,
  threatLaneSchema,
  type EncounterEffect,
  type ThreatCard
} from "../src/game/schema/card.schema.js";
import { shopCategorySchema, type GearItem } from "../src/game/schema/gear.schema.js";
import type { ContractCard } from "../src/game/schema/contract.schema.js";
import { sectorGraphSchema, type SectorNode } from "../src/game/schema/sector.schema.js";
import { validatePassiveEquipmentCatalog } from "./passive-equipment-validation.js";
import { validateScarTriggerCatalog } from "../src/game/rules/scarTriggers.js";
import {
  validateC1BlockedRuntimeHeatEffects,
  validateLegacyHeatApprovalManifest,
  validateLegacyHeatContentRecord,
  type BlockedRuntimeHeatEffect,
  type LegacyHeatContentRecord
} from "./legacy-heat-validation.js";
import { validateForcedDisplacementContentRecord } from "./forced-displacement-validation.js";
import { getShopGearCost, getShopGearSellValue } from "../src/game/rules/shopAvailability.js";
import {
  ARTIFACT_EXCHANGE_CONTRACT_COST,
  NORMAL_STARTING_SALVAGE,
  SOLO_STARTING_SALVAGE
} from "../src/game/rules/startingLoadout.js";

const sectorsRoot = join(process.cwd(), "content", "sectors");
const contentRoot = join(process.cwd(), "content");
const errors: string[] = [];

function collectBlockedRuntimeHeatEffects(): BlockedRuntimeHeatEffect[] {
  const output: BlockedRuntimeHeatEffect[] = [];
  const visit = (value: unknown, id: string): void => {
    if (Array.isArray(value)) return value.forEach((entry) => visit(entry, id));
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.type === "gain_heat" || record.type === "gain_heat_all" || record.type === "lose_heat") {
      output.push({ id, type: record.type });
    }
    Object.values(record).forEach((entry) => visit(entry, id));
  };

  for (const [id, definition] of Object.entries(BOARD_TEXT_EFFECTS)) visit(definition, id);
  const context = {
    playerName: "Content validator",
    sessionMode: "single-player" as const,
    crownClaims: 0,
    mirrorPressure: 6,
    salvageLeverage: 0,
    engineModeIndex: 0,
    heldGearCount: 0
  };
  for (const scenario of SCENARIOS) visit(scenario.buildConfrontationPlan(context), scenario.id);
  return output;
}

errors.push(...validateC1BlockedRuntimeHeatEffects(collectBlockedRuntimeHeatEffects()));

function validateLegacyHeatAuthoring(root: string): void {
  const records: LegacyHeatContentRecord[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".json")) {
        const record = JSON.parse(readFileSync(path, "utf8")) as unknown;
        records.push({ file: path, record });
        errors.push(...validateLegacyHeatContentRecord(path, record));
        errors.push(...validateForcedDisplacementContentRecord(path, record));
      }
    }
  };
  visit(root);
  errors.push(...validateLegacyHeatApprovalManifest(records));
}

validateLegacyHeatAuthoring(contentRoot);
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
  "collapseRule",
  "designFeel",
  "failureSummary",
  "finalGateRequirement",
  "flavor",
  "gameplayRole",
  "imagePrompt",
  "label",
  "linkedMechanic",
  "loreRole",
  "name",
  "objectiveText",
  "redThreat",
  "blueThreat",
  "yellowThreat",
  "shop",
  "shrine",
  "salvage",
  "anomaly",
  "penalty",
  "pressureRule",
  "progressSources",
  "relief",
  "resolutionSummary",
  "rewardText",
  "shopInteractions",
  "setup",
  "sheetArtPrompt",
  "specialRules",
  "summary",
  "text",
  "theme",
  "tickTiming",
  "tileEventHooks",
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
const tileChallenges = loadTileChallenges();
const anomalies = loadAnomalyCards();
const artifacts = loadArtifactCards();
const followers = loadFollowers();
const scars = loadScarCards();
errors.push(...validateScarTriggerCatalog(scars));
const escalations = loadEscalationCards();
const afflictions = loadAfflictionCards();
const canonicalSectors = createCanonicalSectorGraph();

validateContentFloors();
validateBoardCoverage();
validateScenarioCoverage();
validateCanonicalDecks();
validateFollowerAcquisitionCoverage();
validateLoreLanguage();
validateCanonicalEconomy();

const sectorFiles = readdirSync(sectorsRoot).filter((entry) => entry.endsWith(".json"));

for (const character of characters.values()) {
  const statValues = Object.values(character.stats);
  const totalStats = statValues.reduce((total, value) => total + value, 0);

  if (!character.qaOnly) {
    if (totalStats < 14 || totalStats > 16) {
      errors.push(`Character ${character.id} stat total ${totalStats} is outside normal 14-16 range`);
    }

    if (totalStats !== 15) {
      errors.push(`Character ${character.id} should normally use the 15-point baseline; found ${totalStats}`);
    }

    if (statValues.some((value) => value <= 0)) {
      errors.push(`Character ${character.id} has a zero starting stat`);
    }

    if (statValues.some((value) => value > 5)) {
      errors.push(`Character ${character.id} has a starting stat above 5 without qaOnly`);
    }
  }

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

  for (const gearId of character.startingGear ?? []) {
    if (!gear.has(gearId)) {
      errors.push(`Character ${character.id} starts with unknown gear ${gearId}`);
    }
  }

  if (character.startingContract && !contracts.has(character.startingContract)) {
    errors.push(`Character ${character.id} starts with unknown contract ${character.startingContract}`);
  }
}

for (const card of threats.values()) {
  if (card.cardType === "enemy" && (!Number.isInteger(card.trophyValue) || card.trophyValue <= 0)) {
    errors.push(`${card.id} must define a positive integer Trophy value`);
  }
  if (card.cardType !== "enemy" && "trophyValue" in card) {
    errors.push(`${card.id} is not an enemy and cannot define a Trophy value`);
  }
  const rewardEffect = card.cardType === "enemy" ? card.defeatReward : card.successEffect;
  if (rewardEffect) validateEffect(rewardEffect, `${card.id} reward`);
  const failureEffect = card.cardType === "enemy" ? card.woundOnLoss : card.failEffect;
  if (failureEffect) validateEffect(failureEffect, `${card.id} failure`);
  validateThreatFamily(card);
  validateThreatMetadata(card);
  validateThreatEffectKeys(card);
  validateGlassChimeSwarmRetirement(card);
  validateSirenRelayEchoRetirement(card);
  validateSpindleStaticSquallRetirement(card);
  validateMemoryTaxGateRetirement(card);
}

validateThreatRarityCurve();

for (const item of gear.values()) {
  validateGearProgression(item);
}
errors.push(...validatePassiveEquipmentCatalog(gear));

for (const contract of contracts.values()) {
  validateEffect(contract.reward, `${contract.id} reward`);
  validateContractObjective(contract);
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
reportDuplicateIds("afflictions", afflictions.keys());

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed (${characters.size} characters, ${gear.size} gear, ${threats.size} threats, ${contracts.size} contracts, ${anomalies.size} anomalies, ${artifacts.size} artifacts, ${followers.size} followers, ${scars.size} scars, ${escalations.size} escalations, ${afflictions.size} afflictions)`
);

function validateCanonicalEconomy(): void {
  if (NORMAL_STARTING_SALVAGE !== 3 || SOLO_STARTING_SALVAGE !== 4) {
    errors.push("Canonical starting Salvage must remain 3 in multiplayer and 4 in solo play");
  }
  if (ARTIFACT_EXCHANGE_CONTRACT_COST !== 3) {
    errors.push("Artifact exchange must cost exactly three completed Contracts");
  }

  const artifactGear = [...gear.values()].filter((item) => item.tier === "artifact" && !item.id.startsWith("qa_"));
  const normalShopGear = [...gear.values()].filter((item) => item.tier !== "artifact" && item.normalShopCommon === true);
  if (artifacts.size !== 30) errors.push(`Canonical Artifact card count must be 30; found ${artifacts.size}`);
  if (artifactGear.length === 0) errors.push("Artifact exchange has no eligible Artifact gear definitions");
  if (normalShopGear.length !== 30) errors.push(`Canonical normal shop Equipment count must be 30; found ${normalShopGear.length}`);

  for (const character of characters.values()) {
    if (character.qaOnly) continue;
    for (const gearId of character.startingGear ?? []) {
      if (gear.get(gearId)?.tier === "artifact") {
        errors.push(`Character ${character.id} cannot start with Artifact ${gearId}`);
      }
    }
  }

  for (const item of normalShopGear) {
    const price = getShopGearCost(item);
    const sellValue = getShopGearSellValue(item);
    if (!Number.isInteger(price) || price <= 0) errors.push(`Shop Equipment ${item.id} has invalid price ${price}`);
    if (sellValue !== null && sellValue > price) errors.push(`Shop Equipment ${item.id} sells for more than its price`);
  }
}

function validateContentFloors(): void {
  const contentTargets = [
    ["threats", threats.size, 40, 120],
    ["anomalies", anomalies.size, 20, 30],
    ["artifacts", artifacts.size, 12, 30],
    ["escalations", escalations.size, 15, 25],
    ["contracts", contracts.size, 20, 36],
    ["followers", followers.size, 15, 25],
    ["scars", scars.size, 12, 18],
    ["afflictions", afflictions.size, 30, 30]
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

function effectGrantsFollower(effect: EncounterEffect | null | undefined, followerId: string): boolean {
  if (!effect) return false;
  if (effect.type === "gain_follower") return effect.followerId === followerId;
  return effect.type === "sequence" && effect.effects.some((entry) => effectGrantsFollower(entry, followerId));
}

function validateFollowerAcquisitionCoverage(): void {
  if (followers.size !== 24) errors.push(`Follower catalog must contain exactly 24 definitions; found ${followers.size}`);
  const normalFollowers = [...followers.values()].filter((follower) => !follower.qaOnly);
  const qaFollowers = [...followers.values()].filter((follower) => follower.qaOnly);
  if (normalFollowers.length !== 21 || qaFollowers.length !== 3) {
    errors.push(`Follower catalog must contain 21 normal and 3 QA-only followers; found ${normalFollowers.length}/${qaFollowers.length}`);
  }

  for (const follower of normalFollowers) {
    const sources = FOLLOWER_ACQUISITION_SOURCES.filter((source) => source.followerId === follower.id);
    if (sources.length === 0) errors.push(`Follower ${follower.id} has no canonical normal-game acquisition source`);
    if (!follower.activeEffect && !follower.passiveEffect) errors.push(`Follower ${follower.id} has no explicit active or passive ability`);
  }

  for (const follower of qaFollowers) {
    if (!QA_FOLLOWER_IDS.has(follower.id)) errors.push(`Unexpected QA-only follower ${follower.id}`);
  }

  for (const source of FOLLOWER_ACQUISITION_SOURCES) {
    const follower = followers.get(source.followerId);
    if (!follower || follower.qaOnly) {
      errors.push(`Acquisition source ${source.sourceId} references invalid normal follower ${source.followerId}`);
      continue;
    }
    if (source.sourceType === "board") {
      const [effectKey, choiceId] = source.sourceId.split(":");
      const definition = BOARD_TEXT_EFFECTS[effectKey!];
      const grants = choiceId
        ? effectGrantsFollower(definition?.choices?.find((choice) => choice.id === choiceId)?.effect, source.followerId)
        : effectGrantsFollower(definition?.effect, source.followerId) || Boolean(definition?.choices?.some((choice) => effectGrantsFollower(choice.effect, source.followerId)));
      if (!grants) errors.push(`Board source ${source.sourceId} does not grant ${source.followerId}`);
    }
    if (source.sourceType === "artifact") {
      const artifact = artifacts.get(source.sourceId);
      if (!artifact || !effectGrantsFollower(artifact.resolveEffect, source.followerId)) errors.push(`Artifact source ${source.sourceId} does not grant ${source.followerId}`);
      if (!canonicalSectors.some((sector) => sector.encounterDecks.artifact.includes(source.sourceId))) errors.push(`Artifact source ${source.sourceId} is absent from every canonical sector deck`);
    }
    if (source.sourceType === "anomaly") {
      const anomaly = anomalies.get(source.sourceId);
      if (!anomaly || !effectGrantsFollower(anomaly.resolveEffect, source.followerId)) errors.push(`Anomaly source ${source.sourceId} does not grant ${source.followerId}`);
    }
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
  if (boardCount !== 49) {
    errors.push(`Board space target not met: ${boardCount}/49`);
  }

  const tierCounts = countBy(BOARD_SPACES, (space) => space.tier);
  validateRange("outer board spaces", tierCounts.get("outer") ?? 0, 24, 24);
  validateRange("middle board spaces", tierCounts.get("middle") ?? 0, 16, 16);
  validateRange("inner board spaces", tierCounts.get("inner") ?? 0, 8, 8);
  validateRange("center board spaces", tierCounts.get("center") ?? 0, 1, 1);

  for (const space of BOARD_SPACES) {
    if (space.tags.length === 0) {
      errors.push(`Board space ${space.id} has no presentation tags`);
    }

    if (!space.ruleText.trim()) {
      errors.push(`Board space ${space.id} has no ruleText`);
    }

    if (!space.loreText.trim()) {
      errors.push(`Board space ${space.id} has no loreText`);
    }
  }

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

function validateScenarioCoverage(): void {
  for (const scenario of SCENARIOS) {
    if (!scenario.mode) {
      errors.push(`Scenario ${scenario.id} has no mode`);
    }

    if (!scenario.pressureTrack?.name || scenario.pressureTrack.max <= 0 || scenario.pressureTrack.start < 0) {
      errors.push(`Scenario ${scenario.id} has invalid pressureTrack`);
    }

    if (!scenario.finalGateRequirement?.trim()) {
      errors.push(`Scenario ${scenario.id} has no finalGateRequirement`);
    }

    if (scenario.progressSources.length === 0) {
      errors.push(`Scenario ${scenario.id} has no progressSources`);
    }

    if (scenario.scenarioRewards.length < 4) {
      errors.push(`Scenario ${scenario.id} must define at least 4 scenarioRewards`);
    }

    if (scenario.shopInteractions.length === 0) {
      errors.push(`Scenario ${scenario.id} has no shopInteractions`);
    }

    if (scenario.tileEventHooks.length === 0) {
      errors.push(`Scenario ${scenario.id} has no tileEventHooks`);
    }

    if (scenario.supportedPlayerCounts.min < 1 || scenario.supportedPlayerCounts.max < scenario.supportedPlayerCounts.min) {
      errors.push(`Scenario ${scenario.id} has invalid supportedPlayerCounts`);
    }

    if (scenario.supportedModes.length === 0) {
      errors.push(`Scenario ${scenario.id} has no supportedModes`);
    }

    if (!scenario.publicDisplay.modeLabel || !scenario.publicDisplay.objective || !scenario.publicDisplay.privacy) {
      errors.push(`Scenario ${scenario.id} has incomplete publicDisplay metadata`);
    }

    if (!scenario.victoryCondition || !scenario.lossCondition) {
      errors.push(`Scenario ${scenario.id} must define victoryCondition and lossCondition`);
    }

    if (
      scenario.privateMetadata.hiddenAgendaReveal !== "not-implemented" &&
      scenario.privateMetadata.hiddenAgendaReveal !== "future"
    ) {
      errors.push(`Scenario ${scenario.id} has invalid private hidden agenda metadata`);
    }
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
    // Approved Oathchain Lens rules use "mission progress" only to state the locked lifecycle boundary.
    if (term === "Mission" && context === "content/gear/oathchain-lens.json.activeText") continue;
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

function validateGlassChimeSwarmRetirement(card: ThreatCard): void {
  if (card.id !== "glass-chime-swarm") return;
  if (card.cardType !== "hazard") {
    errors.push("glass-chime-swarm must remain a hazard");
    return;
  }
  if (
    card.failEffect.type !== "next_non_battle_test_modifier" ||
    card.failEffect.amount !== -1 ||
    card.failEffect.sourceCardId !== "glass-chime-swarm"
  ) {
    errors.push("glass-chime-swarm must use the approved owner-only next non-battle test -1 modifier");
  }
  if (JSON.stringify(card).match(/gain_heat|\bHeat\b/)) {
    errors.push("glass-chime-swarm must not expose a legacy Heat effect or player-facing Heat text");
  }
  if (card.text !== "The swarm breaks your concentration. On failure, subtract 1 from your next test. This penalty does not affect battles.") {
    errors.push("glass-chime-swarm must use the approved final player-facing wording");
  }
}

function validateSirenRelayEchoRetirement(card: ThreatCard): void {
  if (card.id !== "siren-relay-echo") return;
  const expectedText = "If you succeed, gain +1 on your next non-battle Command test. If you fail, suffer -1 on your next non-battle Command test.";
  const validEffect = (effect: unknown, amount: -1 | 1) => {
    const candidate = effect as Record<string, unknown>;
    return candidate.type === "next_non_battle_test_modifier" && candidate.amount === amount &&
      candidate.sourceCardId === "siren-relay-echo" && candidate.stat === "command" && candidate.context === "nonBattleTest";
  };
  if (card.cardType !== "hazard" || card.stat !== "command" || !validEffect(card.successEffect, 1) || !validEffect(card.failEffect, -1)) {
    errors.push("siren-relay-echo must use the approved signed owner-only non-battle Command modifier");
  }
  if (card.text !== expectedText) errors.push("siren-relay-echo must use the approved final player-facing wording");
  if (JSON.stringify(card).match(/gain_heat|lose_heat|\bHeat\b/)) {
    errors.push("siren-relay-echo must not expose a legacy Heat effect or player-facing Heat text");
  }
}

function validateSpindleStaticSquallRetirement(card: ThreatCard): void {
  if (card.id !== "spindle-static-squall") return;
  if (card.cardType !== "hazard") {
    errors.push("spindle-static-squall must remain a hazard");
    return;
  }
  if (
    card.failEffect.type !== "next_normal_movement_roll_modifier" ||
    card.failEffect.amount !== -1 ||
    card.failEffect.minimumResult !== 1 ||
    card.failEffect.sourceCardId !== "spindle-static-squall"
  ) {
    errors.push("spindle-static-squall must use the approved owner-only next normal movement roll -1 modifier with minimum 1");
  }
  if (JSON.stringify(card).match(/gain_heat|\bHeat\b/)) {
    errors.push("spindle-static-squall must not expose a legacy Heat effect or player-facing Heat text");
  }
  if (card.text !== "The squall corrupts your bearing. On failure, reduce your next movement roll by 1, to a minimum of 1.") {
    errors.push("spindle-static-squall must use the approved final player-facing wording");
  }
}

function validateMemoryTaxGateRetirement(card: ThreatCard): void {
  if (card.id !== "memory-tax-gate") return;
  const expectedText = "A toll gate opens only after demanding a name the operative would rather keep buried. On failure, choose one: lose 1 Salvage (available only if you have at least 1 Salvage); or suffer -1 on your next non-battle test.";
  if (
    card.cardType !== "hazard" ||
    card.failEffect.type !== "memory_tax_choice" ||
    card.failEffect.sourceCardId !== "memory-tax-gate"
  ) {
    errors.push("memory-tax-gate must use the approved owner-private Salvage-or-next-test modifier choice");
  }
  if (card.text !== expectedText) errors.push("memory-tax-gate must use the approved final player-facing wording");
  if (JSON.stringify(card).match(/gain_heat|lose_heat|\bHeat\b/)) {
    errors.push("memory-tax-gate must not expose a legacy Heat effect or player-facing Heat text");
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

function validateThreatMetadata(card: ThreatCard): void {
  if (!card.threatLane || !threatLaneSchema.safeParse(card.threatLane).success) {
    errors.push(`${card.id} is missing a valid threatLane`);
  }

  if (!card.region) {
    errors.push(`${card.id} is missing region`);
  }

  if (!card.rarity || !cardRaritySchema.safeParse(card.rarity).success) {
    errors.push(`${card.id} is missing a valid rarity`);
  }

  if (!card.tempo || !cardTempoSchema.safeParse(card.tempo).success) {
    errors.push(`${card.id} is missing a valid tempo`);
  }

  if (!card.resourceTags || card.resourceTags.length === 0) {
    errors.push(`${card.id} must define at least one resourceTag`);
    return;
  }

  for (const tag of card.resourceTags) {
    if (!cardResourceTagSchema.safeParse(tag).success) {
      errors.push(`${card.id} has invalid resourceTag ${tag}`);
    }
  }
}

function validateThreatRarityCurve(): void {
  const threatList = [...threats.values()];
  const total = threatList.length;
  const commonCount = threatList.filter((card) => card.rarity === "common").length;
  const uncommonCount = threatList.filter((card) => card.rarity === "uncommon").length;
  const rareCount = threatList.filter((card) => card.rarity === "rare").length;
  const commonRatio = total === 0 ? 0 : commonCount / total;
  const uncommonRatio = total === 0 ? 0 : uncommonCount / total;
  const rareRatio = total === 0 ? 0 : rareCount / total;

  if (commonRatio < 0.5 || commonRatio > 0.7) {
    errors.push(`Threat rarity curve common ratio is ${(commonRatio * 100).toFixed(1)}%; target is around 60%`);
  }

  if (uncommonRatio < 0.2 || uncommonRatio > 0.4) {
    errors.push(`Threat rarity curve uncommon ratio is ${(uncommonRatio * 100).toFixed(1)}%; target is around 30%`);
  }

  if (rareRatio < 0.05 || rareRatio > 0.15) {
    errors.push(`Threat rarity curve rare ratio is ${(rareRatio * 100).toFixed(1)}%; target is around 10%`);
  }
}

function validateGearProgression(item: GearItem): void {
  if (!item.tier) {
    errors.push(`${item.id} is missing tier`);
  }

  if (typeof item.progressionWeight !== "number" || item.progressionWeight <= 0) {
    errors.push(`${item.id} must define a positive progressionWeight`);
  }

  if (!item.shopCategories?.length) {
    errors.push(`${item.id} is missing shopCategories metadata`);
  }

  for (const category of item.shopCategories ?? []) {
    if (!shopCategorySchema.safeParse(category).success) {
      errors.push(`${item.id} has invalid shop category ${category}`);
    }
  }
}

function validateContractObjective(contract: ContractCard): void {
  if (contract.objective.type === "multiStopRoute") {
    const targetIds = new Set<string>();
    for (const target of contract.objective.targets) {
      if (targetIds.has(target.id)) errors.push(`${contract.id} repeats route target id ${target.id}`);
      targetIds.add(target.id);
      if (target.type === "spaceId" && !BOARD_SPACES.some((space) => space.id === target.value)) errors.push(`${contract.id} references missing route sector ${target.value}`);
      if (target.type === "tag" && !BOARD_SPACES.some((space) => space.tags.includes(target.value as never))) errors.push(`${contract.id} references unsupported route tag ${target.value}`);
    }
  }
  if (contract.objective.type === "shopTransaction") {
    const requiredSectorId = contract.objective.requiredSectorId;
    const requiredShopType = contract.objective.requiredShopType;
    if (requiredSectorId && !BOARD_SPACES.some((space) => space.id === requiredSectorId && (space.tags.includes("shop") || space.tags.includes("risk-shop")))) errors.push(`${contract.id} references invalid shop sector ${requiredSectorId}`);
    if (requiredShopType && !BOARD_SPACES.some((space) => (space.tags.includes("shop") || space.tags.includes("risk-shop")) && space.tags.includes(requiredShopType as never))) errors.push(`${contract.id} references invalid shop type ${requiredShopType}`);
  }
  if (contract.objective.type === "tileChallengeResolved") {
    const objective = contract.objective;
    if (!objective.challengeId && !objective.sectorId && !objective.challengeType && !objective.challengeTag) errors.push(`${contract.id} tile challenge objective requires at least one authored matcher`);
    const candidates = [...tileChallenges.values()].filter((challenge) =>
      (!objective.challengeId || challenge.id === objective.challengeId) &&
      (!objective.sectorId || challenge.sectorId === objective.sectorId) &&
      (!objective.challengeType || challenge.challengeType === objective.challengeType) &&
      (!objective.challengeTag || challenge.tags.includes(objective.challengeTag))
    );
    if (objective.challengeId && !tileChallenges.has(objective.challengeId)) errors.push(`${contract.id} references missing tile challenge ${objective.challengeId}`);
    if (objective.sectorId && !BOARD_SPACES.some((space) => space.id === objective.sectorId)) errors.push(`${contract.id} references missing challenge sector ${objective.sectorId}`);
    if (objective.challengeId && objective.sectorId && tileChallenges.get(objective.challengeId)?.sectorId !== objective.sectorId) errors.push(`${contract.id} references ${objective.challengeId} outside its authored sector ${objective.sectorId}`);
    if (objective.challengeTag && ![...tileChallenges.values()].some((challenge) => challenge.tags.includes(objective.challengeTag!))) errors.push(`${contract.id} references unsupported challenge tag ${objective.challengeTag}`);
    if (candidates.length === 0) errors.push(`${contract.id} has no reachable tile challenge completion path`);
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
