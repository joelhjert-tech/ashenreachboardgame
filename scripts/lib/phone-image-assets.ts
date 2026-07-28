import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

export const PHONE_IMAGE_MANIFEST_PATH = join(process.cwd(), "public", "assets", "phone-image-manifest.json");
export const PHONE_IMAGE_MAX_EDGE = 960;
export const PHONE_IMAGE_WEBP_QUALITY = 72;

const sourceRoots = [
  "assets/cards",
  "assets/map/tiles",
  "assets/riftfall/characters",
  "assets/riftfall/nemeses",
  "assets/riftfall/ui",
  "assets/scenarios"
] as const;

const excludedFragments = [
  "/signal-cartography/",
  "/signal-theatre/dice/",
  "/signal-theatre/shops/",
  "/signal-theatre/shopkeeper-establishment."
] as const;

const rasterExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface PhoneImageManifestEntry {
  sourcePath: string;
  sourceHash: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceBytes: number;
  derivativePath: string;
  derivativeHash: string;
  derivativeWidth: number;
  derivativeHeight: number;
  derivativeBytes: number;
}

export interface PhoneImageManifest {
  version: 1;
  settings: {
    maxLongEdge: number;
    format: "webp";
    quality: number;
    upscaling: false;
    metadata: "stripped";
  };
  totals: {
    sources: number;
    sourceBytes: number;
    derivativeBytes: number;
    reductionPercent: number;
  };
  entries: PhoneImageManifestEntry[];
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function toPublicPath(absolutePath: string): string {
  return `/${relative(join(process.cwd(), "public"), absolutePath).split(sep).join("/")}`;
}

function hasHigherFidelitySibling(path: string): boolean {
  if (extname(path).toLowerCase() !== ".webp") return false;
  const stem = path.slice(0, -extname(path).length);
  return [".png", ".jpg", ".jpeg"].some((extension) => existsSync(`${stem}${extension}`));
}

export function collectPhoneImageSourcePaths(): string[] {
  return sourceRoots
    .flatMap((root) => walkFiles(join(process.cwd(), "public", ...root.split("/"))))
    .filter((path) => {
      const publicPath = toPublicPath(path).toLowerCase();
      return (
        rasterExtensions.has(extname(path).toLowerCase()) &&
        !publicPath.endsWith(".phone.webp") &&
        !excludedFragments.some((fragment) => publicPath.includes(fragment)) &&
        !hasHigherFidelitySibling(path)
      );
    })
    .map(toPublicPath)
    .sort();
}

export function getPhoneDerivativePath(sourcePath: string): string {
  return sourcePath.replace(/\.(?:png|jpe?g|webp)$/i, ".phone.webp");
}

export function resolvePublicAssetPath(publicPath: string): string {
  return join(process.cwd(), "public", ...publicPath.replace(/^\//, "").split("/"));
}

export function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readPhoneImageManifest(): PhoneImageManifest | null {
  if (!existsSync(PHONE_IMAGE_MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(PHONE_IMAGE_MANIFEST_PATH, "utf8")) as PhoneImageManifest;
}

export function validatePhoneImageManifest(): string[] {
  const manifest = readPhoneImageManifest();
  if (!manifest) return ["Phone image manifest is missing."];
  const issues: string[] = [];
  const sources = collectPhoneImageSourcePaths();
  const sourceSet = new Set(sources);
  const entries = new Map(manifest.entries.map((entry) => [entry.sourcePath, entry]));

  for (const sourcePath of sources) {
    const entry = entries.get(sourcePath);
    if (!entry) {
      issues.push(`${sourcePath}: registered phone raster has no manifest entry`);
      continue;
    }
    const sourceAbsolute = resolvePublicAssetPath(sourcePath);
    const derivativeAbsolute = resolvePublicAssetPath(entry.derivativePath);
    if (!existsSync(derivativeAbsolute)) {
      issues.push(`${sourcePath}: derivative is missing`);
      continue;
    }
    if (entry.sourceHash !== sha256(sourceAbsolute)) issues.push(`${sourcePath}: source hash is stale`);
    if (entry.derivativeHash !== sha256(derivativeAbsolute)) issues.push(`${sourcePath}: derivative hash is stale`);
    if (entry.sourceBytes !== statSync(sourceAbsolute).size) issues.push(`${sourcePath}: source byte count is stale`);
    if (entry.derivativeBytes !== statSync(derivativeAbsolute).size) issues.push(`${sourcePath}: derivative byte count is stale`);
    if (Math.max(entry.derivativeWidth, entry.derivativeHeight) > PHONE_IMAGE_MAX_EDGE) {
      issues.push(`${sourcePath}: derivative exceeds ${PHONE_IMAGE_MAX_EDGE}px`);
    }
    if (entry.derivativeWidth > entry.sourceWidth || entry.derivativeHeight > entry.sourceHeight) {
      issues.push(`${sourcePath}: derivative was upscaled`);
    }
    if (entry.derivativeBytes > entry.sourceBytes) issues.push(`${sourcePath}: derivative is larger than source`);
  }

  for (const entry of manifest.entries) {
    if (!sourceSet.has(entry.sourcePath)) issues.push(`${entry.sourcePath}: stale manifest entry`);
  }

  return issues;
}
