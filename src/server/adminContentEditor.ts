import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import type { ZodTypeAny, ZodIssue } from "zod";
import { afflictionCardSchema } from "../game/schema/affliction.schema.js";
import {
  anomalyCardSchema,
  artifactCardSchema,
  authoredThreatCardSchema,
  escalationCardSchema,
  scarCardSchema
} from "../game/schema/card.schema.js";
import { authoredContractCardSchema } from "../game/schema/contract.schema.js";
import { followerSchema } from "../game/schema/follower.schema.js";
import { gearItemSchema } from "../game/schema/gear.schema.js";
import { authoredTileChallengeSchema } from "../game/schema/tileChallenge.schema.js";
import type { AdminCardFamily } from "../shared/adminSimulation.js";

export const ADMIN_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const ADMIN_CONTENT_SOURCE_PATTERN = /^content\/(?:cards\/(?:afflictions|anomalies|artifacts|contracts|escalations|scars|threats)|gear|followers|tile-challenges)\/[a-z0-9][a-z0-9-]*\.json$/;
const SAFE_FILENAME_PATTERN = /^[a-z0-9][a-z0-9-]*\.(?:png|webp|jpe?g)$/;
const ARTWORK_OVERRIDES_PATH = "content/card-artwork-overrides.json";

type JsonRecord = Record<string, unknown>;
type ArtworkOverrides = Record<string, string>;

const ADMIN_FAMILY_DIRECTORIES: Record<AdminCardFamily, string> = {
  affliction: "content/cards/afflictions",
  anomaly: "content/cards/anomalies",
  artifact: "content/cards/artifacts",
  contract: "content/cards/contracts",
  escalation: "content/cards/escalations",
  scar: "content/cards/scars",
  threat: "content/cards/threats",
  gear: "content/gear",
  follower: "content/followers",
  "tile-challenge": "content/tile-challenges"
};

export interface AdminContentEditorOptions {
  projectRoot: string;
  enabled: boolean;
}

export interface AdminArtworkUpload {
  dataBase64: string;
  fileName: string;
  mimeType: "image/png" | "image/webp" | "image/jpeg";
  replaceShared?: boolean;
}

export interface AdminSaveRequest {
  sourcePath: string;
  expectedRevision: string;
  record: unknown;
  artwork?: AdminArtworkUpload;
}

export interface AdminRevisionSummary {
  id: string;
  createdAt: string;
  sourcePath: string;
  fieldsChanged: string[];
  previousArtworkPath?: string;
  nextArtworkPath?: string;
}

interface StoredRevision extends AdminRevisionSummary {
  previousSourceText?: string;
  previousRecord: JsonRecord;
  nextRecord: JsonRecord;
  previousArtworkOverrides: ArtworkOverrides;
  nextArtworkOverrides: ArtworkOverrides;
}

export class AdminContentError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function hashText(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function changedTopLevelFields(previous: JsonRecord, next: JsonRecord): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...keys].filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])).sort();
}

function fieldErrorsFromIssues(issues: ZodIssue[]): Record<string, string> {
  return Object.fromEntries(issues.map((issue) => [issue.path.join(".") || "card", issue.message]));
}

export function schemaForAdminContentSource(sourcePath: string): ZodTypeAny {
  if (sourcePath.startsWith("content/cards/afflictions/")) return afflictionCardSchema;
  if (sourcePath.startsWith("content/cards/anomalies/")) return anomalyCardSchema;
  if (sourcePath.startsWith("content/cards/artifacts/")) return artifactCardSchema;
  if (sourcePath.startsWith("content/cards/contracts/")) return authoredContractCardSchema;
  if (sourcePath.startsWith("content/cards/escalations/")) return escalationCardSchema;
  if (sourcePath.startsWith("content/cards/scars/")) return scarCardSchema;
  if (sourcePath.startsWith("content/cards/threats/")) return authoredThreatCardSchema;
  if (sourcePath.startsWith("content/gear/")) return gearItemSchema;
  if (sourcePath.startsWith("content/followers/")) return followerSchema;
  if (sourcePath.startsWith("content/tile-challenges/")) return authoredTileChallengeSchema;
  throw new AdminContentError("Unsupported canonical content source", 400);
}

export function validateAdminContentDraft(sourcePath: string, value: unknown): JsonRecord {
  const retiredResource = ["he", "at"].join("");
  const retiredEffectKeys = ["gain", "gain_all", "lose"].map((verb) => `${verb}_${retiredResource}`);
  if (retiredEffectKeys.some((key) => JSON.stringify(value).toLowerCase().includes(`"${key}"`))) {
    throw new AdminContentError("Retired Heat mechanics cannot be simulated", 422, {
      card: "Heat is legacy input only and is not available to canonical content."
    });
  }
  const result = schemaForAdminContentSource(sourcePath).safeParse(value);
  if (!result.success) throw new AdminContentError("Card validation failed", 422, fieldErrorsFromIssues(result.error.issues));
  return result.data as JsonRecord;
}

export function normalizeAdminCardFamily(value: string): AdminCardFamily {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (normalized in ADMIN_FAMILY_DIRECTORIES) return normalized as AdminCardFamily;
  throw new AdminContentError("Unsupported card family", 422, { cardFamily: "Choose a canonical Admin Library family." });
}

function inferArtworkType(sourcePath: string, record: JsonRecord): string | null {
  if (sourcePath.startsWith("content/cards/threats/") || sourcePath.startsWith("content/tile-challenges/")) return "threat";
  if (sourcePath.startsWith("content/cards/contracts/")) return "contract";
  if (sourcePath.startsWith("content/cards/anomalies/")) return "anomaly";
  if (sourcePath.startsWith("content/cards/artifacts/") || (sourcePath.startsWith("content/gear/") && record.tier === "artifact")) return "artifact";
  if (sourcePath.startsWith("content/gear/")) return "equipment";
  if (sourcePath.startsWith("content/cards/scars/")) return "scar";
  if (sourcePath.startsWith("content/cards/escalations/")) return "escalation";
  return null;
}

function canonicalArtworkDirectory(sourcePath: string, record: JsonRecord): string | null {
  const type = inferArtworkType(sourcePath, record);
  if (!type) return null;
  if (type === "threat") {
    const lane = typeof record.threatLane === "string" ? record.threatLane : "blue";
    if (!new Set(["red", "blue", "yellow"]).has(lane)) throw new AdminContentError("Threat artwork requires a valid canonical lane");
    return `public/assets/cards/threats/${lane}`;
  }
  return `public/assets/cards/${type === "equipment" ? "equipment" : `${type}s`}`;
}

function defaultArtworkPath(sourcePath: string, record: JsonRecord): string | null {
  const directory = canonicalArtworkDirectory(sourcePath, record);
  const id = typeof record.artCardId === "string" ? record.artCardId : typeof record.id === "string" ? record.id : null;
  return directory && id ? `${directory}/${id}.png` : null;
}

function decodeArtwork(upload: AdminArtworkUpload): Buffer {
  if (!new Set(["image/png", "image/webp", "image/jpeg"]).has(upload.mimeType)) {
    throw new AdminContentError("Unsupported artwork format", 415, { artwork: "Use PNG, WEBP, or JPEG." });
  }
  if (!SAFE_FILENAME_PATTERN.test(upload.fileName) || upload.fileName.includes("..") || upload.fileName.includes("/") || upload.fileName.includes("\\")) {
    throw new AdminContentError("Unsafe artwork filename", 400, { artwork: "Use a lowercase card filename without folders." });
  }
  const buffer = Buffer.from(upload.dataBase64, "base64");
  if (buffer.length === 0 || buffer.length > ADMIN_UPLOAD_MAX_BYTES) {
    throw new AdminContentError("Artwork file is empty or exceeds 8 MB", 413, { artwork: "Maximum upload size is 8 MB." });
  }
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const actual = png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : null;
  if (actual !== upload.mimeType) {
    throw new AdminContentError("Artwork contents do not match the declared format", 415, { artwork: "The selected file is not a supported raster image." });
  }
  return buffer;
}

export function readRasterDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1]!;
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = buffer.subarray(12, 16).toString("ascii");
    if (kind === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3)
      };
    }
  }
  return null;
}

async function atomicWrite(filePath: string, content: string | Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, content);
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

async function readJsonRecord(filePath: string): Promise<JsonRecord> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new AdminContentError("Canonical card source is not a JSON object");
  return parsed;
}

async function walkJsonFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const visit = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name.endsWith(".json")) result.push(target);
    }
  };
  await visit(root);
  return result;
}

export class AdminContentEditor {
  readonly projectRoot: string;
  readonly enabled: boolean;

  constructor(options: AdminContentEditorOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.enabled = options.enabled;
  }

  private resolveSource(sourcePath: string): string {
    const normalized = sourcePath.replace(/\\/g, "/");
    if (!ADMIN_CONTENT_SOURCE_PATTERN.test(normalized)) throw new AdminContentError("Invalid canonical content path", 400);
    const resolved = path.resolve(this.projectRoot, normalized);
    if (!resolved.startsWith(`${this.projectRoot}${path.sep}`)) throw new AdminContentError("Content path escapes the project root", 400);
    return resolved;
  }

  private async readOverrides(): Promise<ArtworkOverrides> {
    try {
      const parsed = JSON.parse(await readFile(path.join(this.projectRoot, ARTWORK_OVERRIDES_PATH), "utf8")) as unknown;
      return isRecord(parsed) ? Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  private validate(sourcePath: string, value: unknown): JsonRecord {
    if (JSON.stringify(value).toLowerCase().includes('"heat"')) {
      throw new AdminContentError("Retired Heat mechanics cannot be authored", 400, { card: "Heat is legacy input only and is not available to canonical content." });
    }
    return validateAdminContentDraft(sourcePath, value);
  }

  private async assertUniqueId(sourcePath: string, id: string): Promise<void> {
    const contentRoot = path.join(this.projectRoot, "content");
    for (const file of await walkJsonFiles(contentRoot)) {
      const relative = path.relative(this.projectRoot, file).replace(/\\/g, "/");
      if (relative === sourcePath || relative === ARTWORK_OVERRIDES_PATH) continue;
      try {
        const candidate = JSON.parse(await readFile(file, "utf8")) as unknown;
        if (isRecord(candidate) && candidate.id === id) throw new AdminContentError(`Duplicate card ID: ${id}`, 409, { id: "This stable ID already exists." });
      } catch (error) {
        if (error instanceof AdminContentError) throw error;
      }
    }
  }

  private async revisionFiles(cardId: string): Promise<string[]> {
    const directory = path.join(this.projectRoot, "admin-revisions", cardId);
    try {
      return (await readdir(directory))
        .filter((name) => /^[a-zA-Z0-9-]+\.json$/.test(name))
        .map((name) => path.join(directory, name))
        .sort()
        .reverse();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async getCard(sourcePath: string): Promise<{
    sourcePath: string;
    record: JsonRecord;
    revision: string;
    artwork: { path: string | null; dimensions: { width: number; height: number } | null; sharedCount: number };
    revisions: AdminRevisionSummary[];
  }> {
    const filePath = this.resolveSource(sourcePath);
    const sourceText = await readFile(filePath, "utf8");
    const record = this.validate(sourcePath, JSON.parse(sourceText));
    const overrides = await this.readOverrides();
    const artworkPath = overrides[String(record.id)] ?? defaultArtworkPath(sourcePath, record);
    let dimensions: { width: number; height: number } | null = null;
    if (artworkPath) {
      try { dimensions = readRasterDimensions(await readFile(path.join(this.projectRoot, artworkPath))); } catch { dimensions = null; }
    }
    const revisionFiles = await this.revisionFiles(String(record.id));
    const revisions = await Promise.all(revisionFiles.slice(0, 20).map(async (file) => {
      const stored = JSON.parse(await readFile(file, "utf8")) as StoredRevision;
      const { previousSourceText: _ps, previousRecord: _p, nextRecord: _n, previousArtworkOverrides: _po, nextArtworkOverrides: _no, ...summary } = stored;
      return summary;
    }));
    const allOverrides = Object.values(overrides).filter((value) => value === artworkPath).length;
    return {
      sourcePath,
      record,
      revision: hashText(sourceText),
      artwork: { path: artworkPath, dimensions, sharedCount: Math.max(1, allOverrides) },
      revisions
    };
  }

  async findCard(cardId: string, familyValue: AdminCardFamily | string): Promise<Awaited<ReturnType<AdminContentEditor["getCard"]>>> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cardId)) throw new AdminContentError("Invalid canonical card ID", 422);
    const family = normalizeAdminCardFamily(familyValue);
    const directory = path.join(this.projectRoot, ADMIN_FAMILY_DIRECTORIES[family]);
    let matches: string[] = [];
    try {
      matches = (await readdir(directory))
        .filter((name) => name.endsWith(".json"))
        .map((name) => `${ADMIN_FAMILY_DIRECTORIES[family]}/${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new AdminContentError("Canonical card family is unavailable", 404);
      throw error;
    }
    for (const sourcePath of matches) {
      const raw = JSON.parse(await readFile(path.join(this.projectRoot, sourcePath), "utf8")) as unknown;
      if (isRecord(raw) && raw.id === cardId) return this.getCard(sourcePath);
    }
    throw new AdminContentError(`Canonical ${family} card ${cardId} was not found`, 404);
  }

  validateDraft(sourcePath: string, value: unknown): JsonRecord {
    return this.validate(sourcePath, value);
  }

  async save(request: AdminSaveRequest): Promise<ReturnType<AdminContentEditor["getCard"]> extends Promise<infer T> ? T & { savedRevision: AdminRevisionSummary; reloadRequired: true } : never> {
    if (!this.enabled) throw new AdminContentError("Development content editing is disabled", 403);
    const sourceFile = this.resolveSource(request.sourcePath);
    const currentText = await readFile(sourceFile, "utf8");
    if (hashText(currentText) !== request.expectedRevision) throw new AdminContentError("This card changed after the editor was opened", 409);
    const previousRecord = this.validate(request.sourcePath, JSON.parse(currentText));
    const nextRecord = this.validate(request.sourcePath, request.record);
    if (previousRecord.id !== nextRecord.id) throw new AdminContentError("Stable card IDs are read-only in this editor", 422, { id: "Renaming IDs requires an atomic reference migration." });
    await this.assertUniqueId(request.sourcePath, String(nextRecord.id));
    const previousArtworkOverrides = await this.readOverrides();
    const nextArtworkOverrides = { ...previousArtworkOverrides };
    let artworkTarget: string | null = null;
    let artworkBuffer: Buffer | null = null;
    const previousArtworkPath = previousArtworkOverrides[String(nextRecord.id)] ?? defaultArtworkPath(request.sourcePath, previousRecord) ?? undefined;
    if (request.artwork) {
      const directory = canonicalArtworkDirectory(request.sourcePath, nextRecord);
      if (!directory) throw new AdminContentError("Artwork replacement is not supported for this card family", 422);
      artworkBuffer = decodeArtwork(request.artwork);
      artworkTarget = `${directory}/${request.artwork.fileName}`;
      const resolvedArtwork = path.resolve(this.projectRoot, artworkTarget);
      const allowedRoot = path.resolve(this.projectRoot, "public/assets/cards");
      if (!resolvedArtwork.startsWith(`${allowedRoot}${path.sep}`)) throw new AdminContentError("Artwork destination is outside the canonical card asset root", 400);
      if (request.artwork.replaceShared !== true && previousArtworkPath === artworkTarget) {
        artworkTarget = `${directory}/${path.parse(request.artwork.fileName).name}-${Date.now()}${path.extname(request.artwork.fileName)}`;
      }
      nextArtworkOverrides[String(nextRecord.id)] = artworkTarget;
    }
    const fieldsChanged = changedTopLevelFields(previousRecord, nextRecord);
    if (artworkTarget) fieldsChanged.push("artwork");
    if (fieldsChanged.length === 0) throw new AdminContentError("No card changes to save");
    const createdAt = new Date().toISOString();
    const revisionId = `${safeTimestamp()}-${hashText(currentText).slice(0, 8)}`;
    const revision: StoredRevision = {
      id: revisionId,
      createdAt,
      sourcePath: request.sourcePath,
      fieldsChanged,
      previousArtworkPath,
      nextArtworkPath: artworkTarget ?? previousArtworkPath,
      previousSourceText: currentText,
      previousRecord,
      nextRecord,
      previousArtworkOverrides,
      nextArtworkOverrides
    };
    const revisionPath = path.join(this.projectRoot, "admin-revisions", String(nextRecord.id), `${revisionId}.json`);
    await atomicWrite(revisionPath, stableJson(revision));
    let wroteArtwork = false;
    try {
      if (artworkTarget && artworkBuffer) {
        const target = path.join(this.projectRoot, artworkTarget);
        try {
          if (request.artwork?.replaceShared) await copyFile(target, `${revisionPath}.artwork-backup${path.extname(target)}`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        await atomicWrite(target, artworkBuffer);
        wroteArtwork = true;
        await atomicWrite(path.join(this.projectRoot, ARTWORK_OVERRIDES_PATH), stableJson(nextArtworkOverrides));
      }
      await atomicWrite(sourceFile, stableJson(nextRecord));
    } catch (error) {
      if (wroteArtwork && artworkTarget && artworkTarget !== previousArtworkPath) await rm(path.join(this.projectRoot, artworkTarget), { force: true });
      await atomicWrite(path.join(this.projectRoot, ARTWORK_OVERRIDES_PATH), stableJson(previousArtworkOverrides));
      await atomicWrite(sourceFile, currentText);
      throw error;
    }
    const updated = await this.getCard(request.sourcePath);
    const { previousSourceText: _ps, previousRecord: _p, nextRecord: _n, previousArtworkOverrides: _po, nextArtworkOverrides: _no, ...savedRevision } = revision;
    return { ...updated, savedRevision, reloadRequired: true } as never;
  }

  async revert(sourcePath: string, revisionId: string, expectedRevision: string): Promise<Awaited<ReturnType<AdminContentEditor["getCard"]>>> {
    if (!this.enabled) throw new AdminContentError("Development content editing is disabled", 403);
    if (!/^[a-zA-Z0-9-]+$/.test(revisionId)) throw new AdminContentError("Invalid revision ID");
    const current = await this.getCard(sourcePath);
    if (current.revision !== expectedRevision) throw new AdminContentError("This card changed after the editor was opened", 409);
    const cardId = String(current.record.id);
    const revisionPath = path.join(this.projectRoot, "admin-revisions", cardId, `${revisionId}.json`);
    const stored = JSON.parse(await readFile(revisionPath, "utf8")) as StoredRevision;
    if (stored.sourcePath !== sourcePath) throw new AdminContentError("Revision does not belong to this card", 400);
    const restored = this.validate(sourcePath, stored.previousRecord);
    await atomicWrite(this.resolveSource(sourcePath), stored.previousSourceText ?? stableJson(restored));
    await atomicWrite(path.join(this.projectRoot, ARTWORK_OVERRIDES_PATH), stableJson(stored.previousArtworkOverrides));
    return await this.getCard(sourcePath);
  }
}
