import {
  cardArtRuntimeCatalog,
  type RuntimeCardArtCatalogEntry
} from "../../../game/assets/runtime/cardArtRuntimeCatalog.js";
import { getMapTileReferencesForCard } from "./adminMapReferences.js";

export type AdminLibraryCardStatus = "active" | "legacy" | "reference" | "invalid";

export interface AdminLibrarySkill {
  name: string;
  level?: number | string;
  relationship?: "and" | "or" | "single";
}

export interface AdminLibraryEffectRow {
  label: string;
  value: string;
}

export interface AdminLibraryCard {
  id: string;
  name: string;
  cardType: string;
  status: AdminLibraryCardStatus;
  difficulty?: number | string;
  difficultyScale?: number;
  skills: AdminLibrarySkill[];
  lore?: string;
  rulesText?: string;
  encounterType?: string;
  scarSource?: string;
  reward?: string;
  penalty?: string;
  effects: AdminLibraryEffectRow[];
  rawEffectData?: unknown;
  artworkUrl?: string;
  artworkPath?: string;
  artworkFolder?: string;
  dataSourcePath: string;
  dataSourceFolder: string;
  metadataWarnings: string[];
  mapTileIds: string[];
}

type AuthoredCardRecord = Record<string, unknown>;

export interface AdminLibrarySourceEntry {
  sourcePath: string;
  value: unknown;
}

const authoredModules = import.meta.glob(
  [
    "../../../../content/cards/**/*.json",
    "../../../../content/gear/*.json",
    "../../../../content/followers/*.json",
    "../../../../content/tile-challenges/*.json"
  ],
  { eager: true, import: "default" }
) as Record<string, unknown>;

const sourceEntries: AdminLibrarySourceEntry[] = Object.entries(authoredModules).map(([sourcePath, value]) => ({
  sourcePath: normalizeSourcePath(sourcePath),
  value
}));

function normalizeSourcePath(sourcePath: string): string {
  return sourcePath.replace(/\\/g, "/").replace(/^.*?content\//, "content/");
}

function getFolder(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "";
}

function isRecord(value: unknown): value is AuthoredCardRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: AuthoredCardRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumberOrString(record: AuthoredCardRecord, ...keys: string[]): number | string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" || (typeof value === "string" && value.trim())) return value;
  }
  return undefined;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeValue(value: unknown): string {
  if (value === null || value === undefined) return "Not set";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(summarizeValue).join("; ");
  if (!isRecord(value)) return String(value);

  const type = readString(value, "type", "kind", "effectKind");
  const text = readString(value, "text", "description", "summary");
  const amount = readNumberOrString(value, "amount", "value");
  const target = readString(value, "gearId", "followerId", "scarId", "target");
  const parts = [type ? humanize(type) : undefined, amount !== undefined ? String(amount) : undefined, target, text].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return JSON.stringify(value);
}

function inferCardType(sourcePath: string): string {
  const parts = sourcePath.split("/");
  if (sourcePath.startsWith("content/cards/")) {
    const folder = parts[2] ?? "";
    const singularByFolder: Record<string, string> = {
      afflictions: "affliction",
      anomalies: "anomaly",
      artifacts: "artifact",
      contracts: "contract",
      escalations: "escalation",
      scars: "scar",
      threats: "threat"
    };
    return singularByFolder[folder] ?? "unknown";
  }
  if (sourcePath.startsWith("content/gear/")) return "gear";
  if (sourcePath.startsWith("content/followers/")) return "follower";
  if (sourcePath.startsWith("content/tile-challenges/")) return "tile challenge";
  return "unknown";
}

function inferArtType(cardType: string, record: AuthoredCardRecord): RuntimeCardArtCatalogEntry["cardType"] | null {
  if (cardType === "gear") return record.tier === "artifact" ? "artifact" : "equipment";
  if (["threat", "contract", "anomaly", "artifact", "scar", "escalation"].includes(cardType)) {
    return cardType as RuntimeCardArtCatalogEntry["cardType"];
  }
  if (cardType === "tile challenge") return "threat";
  return null;
}

function getSkills(record: AuthoredCardRecord): AdminLibrarySkill[] {
  const primary = readString(record, "stat", "testStat", "skill");
  const difficulty = readNumberOrString(record, "difficulty", "threshold");
  const alternatives = record.alternativeStats ?? record.skills;
  if (Array.isArray(alternatives)) {
    return alternatives.flatMap((value) => {
      if (typeof value === "string") return [{ name: value, relationship: "or" as const }];
      if (!isRecord(value)) return [];
      const name = readString(value, "name", "stat", "skill");
      return name ? [{ name, level: readNumberOrString(value, "level", "difficulty", "threshold"), relationship: "or" as const }] : [];
    });
  }
  return primary ? [{ name: primary, level: difficulty, relationship: "single" }] : [];
}

function getEffectRows(record: AuthoredCardRecord): AdminLibraryEffectRow[] {
  const effectKeys = [
    "resolveEffect",
    "effect",
    "activeEffect",
    "consumableEffect",
    "reward",
    "defeatReward",
    "woundOnLoss",
    "successEffect",
    "failureEffect"
  ];
  return effectKeys.flatMap((key) => record[key] === undefined ? [] : [{ label: humanize(key), value: summarizeValue(record[key]) }]);
}

function getRawEffects(record: AuthoredCardRecord): Record<string, unknown> | undefined {
  const entries = Object.entries(record).filter(([key]) => /effect|reward|penalty|woundOnLoss/i.test(key));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function getRulesText(record: AuthoredCardRecord): string | undefined {
  const sections = [
    readString(record, "rulesText", "text", "activeText"),
    readString(record, "trigger"),
    readString(record, "relief"),
    readString(record, "upside")
  ].filter(Boolean);
  return sections.length > 0 ? sections.join("\n\n") : undefined;
}

function getArtwork(
  cardType: string,
  record: AuthoredCardRecord,
  artEntries: RuntimeCardArtCatalogEntry[]
): Pick<AdminLibraryCard, "artworkUrl" | "artworkPath" | "artworkFolder"> {
  const artType = inferArtType(cardType, record);
  if (!artType) return {};
  const id = readString(record, "artCardId", "id");
  const entry = artEntries.find((candidate) => candidate.cardType === artType && candidate.cardId === id);
  if (!entry) return {};
  const artworkPath = `public${entry.outputPath}`;
  return { artworkUrl: entry.outputPath, artworkPath, artworkFolder: getFolder(artworkPath) };
}

function isDifficultyExpected(cardType: string): boolean {
  return cardType === "threat" || cardType === "tile challenge";
}

function isSkillExpected(cardType: string): boolean {
  return cardType === "threat" || cardType === "tile challenge";
}

export function buildAdminLibraryCards(
  entries: AdminLibrarySourceEntry[],
  artEntries: RuntimeCardArtCatalogEntry[] = cardArtRuntimeCatalog
): AdminLibraryCard[] {
  const baseCards = entries.flatMap(({ sourcePath, value }): AdminLibraryCard[] => {
    if (!isRecord(value)) {
      return [{
        id: sourcePath,
        name: "Invalid content record",
        cardType: inferCardType(sourcePath),
        status: "invalid",
        skills: [],
        effects: [],
        dataSourcePath: sourcePath,
        dataSourceFolder: getFolder(sourcePath),
        metadataWarnings: ["Source file does not contain a card object."],
        mapTileIds: []
      }];
    }

    const id = readString(value, "id") ?? sourcePath.split("/").at(-1)?.replace(/\.json$/, "") ?? sourcePath;
    const name = readString(value, "title", "name", "enemyName") ?? id;
    const cardType = inferCardType(sourcePath);
    const difficulty = readNumberOrString(value, "difficulty");
    const skills = getSkills(value);
    const lore = readString(value, "flavor", "lore");
    const artwork = getArtwork(cardType, value, artEntries);
    const metadataWarnings: string[] = [];
    if (!readString(value, "id")) metadataWarnings.push("Missing canonical card ID.");
    if (!readString(value, "title", "name", "enemyName")) metadataWarnings.push("Missing display name.");
    if (isDifficultyExpected(cardType) && difficulty === undefined) metadataWarnings.push("Missing difficulty.");
    if (isSkillExpected(cardType) && skills.length === 0) metadataWarnings.push("Missing skill data.");
    if (!lore) metadataWarnings.push("Missing lore.");
    if (!artwork.artworkPath) metadataWarnings.push("Missing artwork or runtime artwork registry entry.");
    if (cardType === "unknown") metadataWarnings.push("Unknown card type.");
    if (cardType === "scar") {
      if (!readString(value, "source")) metadataWarnings.push("Scar source is missing.");
      if (!readString(value, "origin")) metadataWarnings.push("Scar origin is missing.");
      if (!readString(value, "burdenText") || !isRecord(value.burden) || !readString(value.burden, "key")) {
        metadataWarnings.push("Scar Burden must include authored text and a typed executable rule.");
      }
      if (!readString(value, "adaptationText") || !isRecord(value.adaptation) || !readString(value.adaptation, "key")) {
        metadataWarnings.push("Scar Adaptation must include authored text and a typed executable rule.");
      }
    }
    if (!sourcePath.startsWith("content/")) metadataWarnings.push("Data file is outside the canonical content boundary.");

    return [{
      id,
      name,
      cardType,
      status: "active",
      difficulty,
      difficultyScale: typeof value.severity === "number" ? Math.max(5, value.severity) : undefined,
      skills,
      lore,
      rulesText: getRulesText(value),
      encounterType: readString(value, "cardType", "type", "challengeType", "category"),
      scarSource: cardType === "scar" ? readString(value, "source") : undefined,
      reward: value.reward !== undefined ? summarizeValue(value.reward) : value.defeatReward !== undefined ? summarizeValue(value.defeatReward) : undefined,
      penalty: readString(value, "penalty") ?? (value.failureEffect !== undefined ? summarizeValue(value.failureEffect) : value.woundOnLoss !== undefined ? summarizeValue(value.woundOnLoss) : undefined),
      effects: getEffectRows(value),
      rawEffectData: getRawEffects(value),
      ...artwork,
      dataSourcePath: sourcePath,
      dataSourceFolder: getFolder(sourcePath),
      metadataWarnings,
      mapTileIds: getMapTileReferencesForCard(id)
    }];
  });

  const ids = new Map<string, number>();
  const artworkPaths = new Map<string, number>();
  for (const card of baseCards) {
    ids.set(card.id, (ids.get(card.id) ?? 0) + 1);
    if (card.artworkPath) artworkPaths.set(card.artworkPath, (artworkPaths.get(card.artworkPath) ?? 0) + 1);
  }

  return baseCards.map((card) => ({
    ...card,
    metadataWarnings: [
      ...card.metadataWarnings,
      ...((ids.get(card.id) ?? 0) > 1 ? [`Duplicate card ID: ${card.id}.`] : []),
      ...(card.artworkPath && (artworkPaths.get(card.artworkPath) ?? 0) > 1 ? [`Duplicate artwork reference: ${card.artworkPath}.`] : [])
    ]
  })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export const adminLibraryCards = buildAdminLibraryCards(sourceEntries);
