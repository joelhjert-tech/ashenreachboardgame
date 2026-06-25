import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadArtifactCards } from "../src/game/content/artifacts.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadScarCards } from "../src/game/content/scars.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { boardTilePrompts } from "../src/game/assets/design/boardTilePrompts.js";
import {
  CARD_IMAGE_TYPES,
  type CardImagePromptCatalogEntry,
  type CardImageType,
  getCardArtAssetId,
  getCardArtAssetType,
  getCardArtFileName,
  getCardArtOutputPath,
  getCardFallbackArtPath
} from "../src/game/assets/design/cardImageCatalog.js";
import { cardArtPrompts } from "../src/game/assets/design/cardArtPrompts.js";
import { cardTemplatePrompts } from "../src/game/assets/design/cardTemplatePrompts.js";
import { characterPortraitPrompts } from "../src/game/assets/design/characterPortraitPrompts.js";
import { scenarioSheetPrompts } from "../src/game/assets/design/scenarioSheetPrompts.js";
import { uiPrompts } from "../src/game/assets/design/uiPrompts.js";

const generatedRoot = join(process.cwd(), "generated");
const docsRoot = join(process.cwd(), "docs");
const generatedTsPath = join(process.cwd(), "src", "game", "assets", "design", "generatedCardImagePrompts.ts");
const generatedJsonPath = join(generatedRoot, "card-image-prompts.json");
const markdownPath = join(docsRoot, "CARD_IMAGE_PROMPTS.md");

const promptPrefix =
  "Ashen Reach original card art, dark gothic sci-fantasy artifact-crawl, 3:4 portrait composition, centered subject with safe margins for card framing, black basalt, charcoal iron, scorched brass, ember red glow, cold blue-white signal light, toxic green salvage light, purple anomaly light, ash, smoke, ritual circuitry, damaged artifact machinery, high contrast, readable silhouette, cinematic but grounded, no text";

const contractFactionPalette: Record<string, string> = {
  "Meridian Compact": "precise audit machinery, branded ledger seals, brass route mechanisms",
  "Glass Choir": "ritual chorus hardware, chime lattices, sanctified relay light",
  "Veyr Clans": "funeral road shrines, salt-worn caravans, bone-and-brass route markers",
  "Kaldr Dominion": "martial artifact engines, warbell standards, disciplined shrine armor",
  "Pale Cartels": "quiet convoy lanes, smuggler caches, masked courier tradecraft",
  "Umbral Bloom": "harvest rites, fungal dusk growth, predatory salvage botanica"
};

const severityPrompt: Record<number, string> = {
  1: "small but dangerous presence, quick predator scale",
  2: "local predator or raider threat, clearly lethal",
  3: "serious enemy or major hazard, memorable silhouette",
  4: "elite horror or war-machine, dominant and oppressive",
  5: "boss-like catastrophic threat, final-ring danger"
};

const negativePrompt =
  "readable text, logo, watermark, UI, dice, card frame, board game brand, Talisman, copied fantasy board game art, copyrighted character, modern city, clean spaceship, cartoon, anime, low detail, blurry, cropped subject, overexposed, cluttered composition, illegible silhouette";

type PromptLike = {
  id: string;
  title: string;
  text: string;
  flavor: string;
};

type PromptEntryMap = Record<CardImageType, CardImagePromptCatalogEntry[]>;

const promptEntriesByType = buildCardImagePrompts();
const generatedCardImagePrompts = CARD_IMAGE_TYPES.flatMap((cardType) => promptEntriesByType[cardType]);

const allImagePrompts = [
  ...boardTilePrompts,
  ...characterPortraitPrompts,
  ...cardTemplatePrompts,
  ...cardArtPrompts,
  ...generatedCardImagePrompts.map((entry) => ({
    id: entry.assetId,
    fileName: entry.fileName,
    outputPath: entry.outputPath,
    assetType: entry.assetType,
    size: "card" as const,
    prompt: entry.prompt,
    negativePrompt: entry.negativePrompt,
    usage: entry.usage
  })),
  ...scenarioSheetPrompts,
  ...uiPrompts
];

mkdirSync(generatedRoot, { recursive: true });
mkdirSync(docsRoot, { recursive: true });

writeFileSync(generatedTsPath, renderGeneratedTypeScript(generatedCardImagePrompts));
writeFileSync(generatedJsonPath, `${JSON.stringify(generatedCardImagePrompts, null, 2)}\n`);
writeFileSync(markdownPath, renderMarkdown(promptEntriesByType));

console.log(JSON.stringify(allImagePrompts, null, 2));

function buildCardImagePrompts(): PromptEntryMap {
  const threats = [...loadThreatCards().values()].sort(compareById);
  const contracts = [...loadContracts().values()].sort(compareById);
  const anomalies = [...loadAnomalyCards().values()].sort(compareById);
  const artifacts = [...loadArtifactCards().values()].sort(compareById);
  const scars = [...loadScarCards().values()].sort(compareById);
  const escalations = [...loadEscalationCards().values()].sort(compareById);

  return {
    threat: threats.map((card) =>
      buildPromptEntry("threat", card.id, card.title, buildThreatPrompt(card), `${card.title} threat card art.`)
    ),
    contract: contracts.map((card) =>
      buildPromptEntry("contract", card.id, card.name, buildContractPrompt(card), `${card.name} contract card art.`)
    ),
    anomaly: anomalies.map((card) =>
      buildPromptEntry("anomaly", card.id, card.title, buildAnomalyPrompt(card), `${card.title} anomaly card art.`)
    ),
    artifact: artifacts.map((card) =>
      buildPromptEntry("artifact", card.id, card.title, buildArtifactPrompt(card), `${card.title} artifact card art.`)
    ),
    scar: scars.map((card) =>
      buildPromptEntry("scar", card.id, card.title, buildScarPrompt(card), `${card.title} scar card art.`)
    ),
    escalation: escalations.map((card) =>
      buildPromptEntry("escalation", card.id, card.title, buildEscalationPrompt(card), `${card.title} escalation card art.`)
    )
  };
}

function buildPromptEntry(
  cardType: CardImageType,
  cardId: string,
  title: string,
  prompt: string,
  usage: string
): CardImagePromptCatalogEntry {
  return {
    assetId: getCardArtAssetId(cardType, cardId),
    assetType: getCardArtAssetType(cardType),
    cardId,
    cardType,
    title,
    fileName: getCardArtFileName(cardId),
    outputPath: getCardArtOutputPath(cardType, cardId),
    fallbackPath: getCardFallbackArtPath(cardType),
    prompt,
    negativePrompt,
    usage
  };
}

function buildThreatPrompt(card: {
  id: string;
  title: string;
  text: string;
  flavor: string;
  cardType: "enemy" | "hazard";
  enemyName?: string;
  severity: number;
  difficulty: number;
  stat: string;
  enemyFamily?: string;
  region?: string;
}): string {
  const subject =
    card.cardType === "enemy"
      ? `central subject is ${card.enemyName ?? card.title}, a living hostile with a clear full-body silhouette`
      : `central subject is the hazard itself, a dangerous place or event made readable at card size`;
  const region = card.region ? `regional hint ${card.region}` : "works across the Ashen Reach frontier";
  return [
    promptPrefix,
    subject,
    severityPrompt[card.severity] ?? "dangerous Ashen Reach threat",
    `threat family ${formatThreatFamily(card.enemyFamily)}`,
    `threat difficulty ${card.difficulty} driven by ${card.stat}`,
    region,
    sanitizeSentence(card.text),
    sanitizeSentence(card.flavor),
    card.cardType === "enemy"
      ? "no gore closeup, hostile intent, broken artifact weaponry or predatory anatomy"
      : "motion, pressure, energy, environmental violence, avoid looking like a humanoid unless implied by the card"
  ].join(", ");
}

function formatThreatFamily(enemyFamily?: string): string {
  switch (enemyFamily) {
    case "breachborn":
      return "breachborn mirror-horror or breach creature";
    case "bureaucracy":
      return "supernatural bureaucracy or debt horror";
    case "cartel":
      return "Pale Cartel enforcer";
    case "choir":
      return "Choir cultist or signal zealot";
    case "human":
      return "human faction fighter";
    case "machine":
      return "machine, automaton, or judge-engine";
    case "revenant":
      return "revenant, echo, or dead oathbound remnant";
    case "vermin":
      return "swarm or small scavenger vermin";
    case "beast":
      return "mutated hunting beast";
    case "hazard":
      return "environmental hazard";
    default:
      return "unclassified Ashen Reach threat";
  }
}

function buildContractPrompt(card: {
  id: string;
  name: string;
  text: string;
  factionGiver: string;
  objective: { type: string; target: number; label?: string };
}): string {
  const objectiveCopy =
    card.objective.type === "spaceTextResolved"
      ? `contract objective scene focused on ${sanitizeSentence(card.objective.label ?? "a sector operation")}`
      : `contract objective scene showing ${card.objective.target} hostile disruptions to clear`;
  return [
    promptPrefix,
    "contract scene, route objective, artifact target, convoy lane, or faction job rather than a poster",
    contractFactionPalette[card.factionGiver] ?? "neutral artifact-crawl contract atmosphere",
    objectiveCopy,
    sanitizeSentence(card.text),
    "grounded palette, objective-forward composition, no readable orders or signage"
  ].join(", ");
}

function buildAnomalyPrompt(card: {
  id: string;
  title: string;
  text: string;
  flavor: string;
  instability: number;
  regionHint?: string;
  resolutionSummary: string;
}): string {
  return [
    promptPrefix,
    "purple and cold-blue supernatural distortion, broken geometry, mirror fragments, impossible light, floating artifact rings, signal ghosts",
    `instability ${card.instability}, phenomenon must be readable at small size`,
    card.regionHint ? `regional hint ${card.regionHint}` : "cross-region anomaly signature",
    sanitizeSentence(card.text),
    sanitizeSentence(card.flavor),
    sanitizeSentence(card.resolutionSummary),
    "avoid pure abstract blobs, there must be a clear anomaly source"
  ].join(", ");
}

function buildArtifactPrompt(card: {
  id: string;
  title: string;
  text: string;
  flavor: string;
  charge: number;
  artifactKind?: string;
  resolutionSummary: string;
}): string {
  return [
    promptPrefix,
    "single artifact object centered in frame, dramatic lighting, strong silhouette, no hands unless necessary",
    `artifact kind ${formatArtifactKind(card.artifactKind)}, charge state ${card.charge}`,
    sanitizeSentence(card.text),
    sanitizeSentence(card.flavor),
    sanitizeSentence(card.resolutionSummary),
    "brass, black stone, glass, ember cores, blue-white signal lines"
  ].join(", ");
}

function buildScarPrompt(card: PromptLike & { penalty: string }): string {
  return [
    promptPrefix,
    "symbolic injury, pressure, or trauma image, emotional and readable, avoid graphic body horror",
    "cracked masks, burned insignia, broken armor, ash-veins, haunted reflection, damaged artifact identity",
    sanitizeSentence(card.text),
    sanitizeSentence(card.flavor),
    sanitizeSentence(card.penalty)
  ].join(", ");
}

function formatArtifactKind(artifactKind?: string): string {
  switch (artifactKind) {
    case "burdenRelic":
      return "burden artifact";
    case "chargedRelic":
      return "charged artifact";
    case "cursedRelic":
      return "cursed artifact";
    case "factionRelic":
      return "faction artifact";
    case "gateRelic":
      return "gate artifact";
    default:
      return "artifact object";
  }
}

function buildEscalationPrompt(card: PromptLike & { step: number; resolutionSummary: string; escalationDelta: number }): string {
  return [
    promptPrefix,
    "global disaster event, breach widening, collapsing routes, corrupted signal storm, burning shrine, sector-wide panic",
    `escalation step ${card.step}, pressure shift ${card.escalationDelta}`,
    sanitizeSentence(card.text),
    sanitizeSentence(card.flavor),
    sanitizeSentence(card.resolutionSummary),
    "wider, high-drama composition that still works in portrait framing"
  ].join(", ");
}

function sanitizeSentence(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[.]+$/g, "").trim();
}

function compareById(left: { id: string }, right: { id: string }): number {
  return left.id.localeCompare(right.id);
}

function renderGeneratedTypeScript(entries: CardImagePromptCatalogEntry[]): string {
  const serialized = JSON.stringify(entries, null, 2);
  return `import type { CardImagePromptCatalogEntry } from "./cardImageCatalog.js";\n\n` +
    `export const generatedCardImagePrompts: CardImagePromptCatalogEntry[] = ${serialized} as CardImagePromptCatalogEntry[];\n`;
}

function renderMarkdown(entriesByType: PromptEntryMap): string {
  const sections = CARD_IMAGE_TYPES.map((cardType) => {
    const heading = toHeading(cardType);
    const entries = entriesByType[cardType]
      .map(
        (entry) =>
          `### ${entry.title}\n` +
          `- card ID: \`${entry.cardId}\`\n` +
          `- card type: \`${entry.cardType}\`\n` +
          `- output path: \`${entry.outputPath}\`\n` +
          `- fallback path: \`${entry.fallbackPath}\`\n` +
          `- prompt: ${entry.prompt}\n` +
          `- negative prompt: ${entry.negativePrompt}`
      )
      .join("\n\n");

    return `## ${heading}\n\n${entries}`;
  }).join("\n\n");

  return `# Card Image Prompts\n\nGenerated from authored card content. Prompts are deterministic and grouped by card type.\n\n${sections}\n`;
}

function toHeading(cardType: CardImageType): string {
  switch (cardType) {
    case "threat":
      return "Threats";
    case "contract":
      return "Contracts";
    case "anomaly":
      return "Anomalies";
    case "artifact":
      return "Artifacts";
    case "scar":
      return "Scars";
    case "escalation":
      return "Escalations";
  }
}
