import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import {
  collectPhoneImageSourcePaths,
  getPhoneDerivativePath,
  PHONE_IMAGE_MANIFEST_PATH,
  PHONE_IMAGE_MAX_EDGE,
  PHONE_IMAGE_WEBP_QUALITY,
  resolvePublicAssetPath,
  sha256,
  type PhoneImageManifest,
  type PhoneImageManifestEntry
} from "./lib/phone-image-assets.js";

async function generateEntry(sourcePath: string): Promise<PhoneImageManifestEntry> {
  const sourceAbsolute = resolvePublicAssetPath(sourcePath);
  const derivativePath = getPhoneDerivativePath(sourcePath);
  const derivativeAbsolute = resolvePublicAssetPath(derivativePath);
  const sourceMetadata = await sharp(sourceAbsolute).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height) throw new Error(`Could not read dimensions for ${sourcePath}`);

  mkdirSync(dirname(derivativeAbsolute), { recursive: true });
  await sharp(sourceAbsolute)
    .resize({ width: PHONE_IMAGE_MAX_EDGE, height: PHONE_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: PHONE_IMAGE_WEBP_QUALITY, alphaQuality: PHONE_IMAGE_WEBP_QUALITY, effort: 5 })
    .toFile(derivativeAbsolute);

  const sourceBytes = statSync(sourceAbsolute).size;
  if (statSync(derivativeAbsolute).size > sourceBytes) {
    await sharp(sourceAbsolute)
      .resize({ width: PHONE_IMAGE_MAX_EDGE, height: PHONE_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 56, alphaQuality: 64, effort: 6 })
      .toFile(derivativeAbsolute);
  }

  const derivativeMetadata = await sharp(derivativeAbsolute).metadata();
  const derivativeBytes = statSync(derivativeAbsolute).size;
  if (!derivativeMetadata.width || !derivativeMetadata.height || derivativeBytes > sourceBytes) {
    throw new Error(`${derivativePath} could not meet the no-growth requirement`);
  }

  return {
    sourcePath,
    sourceHash: sha256(sourceAbsolute),
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    sourceBytes,
    derivativePath,
    derivativeHash: sha256(derivativeAbsolute),
    derivativeWidth: derivativeMetadata.width,
    derivativeHeight: derivativeMetadata.height,
    derivativeBytes
  };
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, worker: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index]!);
    }
  }));
  return results;
}

const sourcePaths = collectPhoneImageSourcePaths();
const entries = await mapWithConcurrency(sourcePaths, 4, generateEntry);
const sourceBytes = entries.reduce((total, entry) => total + entry.sourceBytes, 0);
const derivativeBytes = entries.reduce((total, entry) => total + entry.derivativeBytes, 0);
const manifest: PhoneImageManifest = {
  version: 1,
  settings: {
    maxLongEdge: PHONE_IMAGE_MAX_EDGE,
    format: "webp",
    quality: PHONE_IMAGE_WEBP_QUALITY,
    upscaling: false,
    metadata: "stripped"
  },
  totals: {
    sources: entries.length,
    sourceBytes,
    derivativeBytes,
    reductionPercent: Number(((1 - derivativeBytes / sourceBytes) * 100).toFixed(2))
  },
  entries
};

mkdirSync(dirname(PHONE_IMAGE_MANIFEST_PATH), { recursive: true });
writeFileSync(PHONE_IMAGE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.totals, null, 2));
