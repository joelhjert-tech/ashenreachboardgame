import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { getRuntimeAssetPaths } from "../src/client/shared/assetPaths.js";
import { getBoardTileAssetPaths } from "../src/client/tv/TalismanBoardSurface.js";
import { getAssetPath } from "../src/game/assets/design/assetManifest.js";
import { CARD_IMAGE_TYPES, type CardImageType } from "../src/game/assets/design/cardImageCatalog.js";
import { imagePrompts } from "../src/game/assets/design/imagePrompts.js";

type AuditMode = "development" | "release";

type AssetDimensions = {
  width: number;
  height: number;
};

type AssetIssue = {
  id: string;
  assetType: string;
  outputPath: string;
  usage: string;
  priority: number;
  releaseRequired: boolean;
  reason: string;
};

type AssetAuditEntry = {
  id: string;
  assetType: string;
  outputPath: string;
  usage: string;
  priority: number;
  releaseRequired: boolean;
  placeholderAllowed: boolean;
  present: boolean;
  bytes?: number;
  dimensions?: AssetDimensions;
  placeholder: boolean;
  issues: string[];
};

type MissingAssetSummary = {
  mode: AuditMode;
  total: number;
  present: number;
  missing: number;
  invalid: number;
  placeholders: number;
  releaseBlocking: number;
  byType: Record<string, number>;
  cardImageSummary: Record<CardImageType, { total: number; present: number; missing: number }>;
  missingAssets: AssetIssue[];
  invalidAssets: AssetIssue[];
  placeholderAssets: AssetIssue[];
  releaseBlockingAssets: AssetIssue[];
  reportPaths: {
    auditReport: string;
    missingPrioritized: string;
  };
};

type ExpectedAsset = {
  id: string;
  assetType: string;
  outputPath: string;
  usage: string;
  priority: number;
  releaseRequired: boolean;
  placeholderAllowed: boolean;
};

function resolvePublicPath(outputPath: string): string {
  return join(process.cwd(), "public", outputPath.replace(/^\//, "").split("/").join(sep));
}

function getMode(): AuditMode {
  return process.argv.includes("--release") || process.env.ASSET_AUDIT_MODE === "release" ? "release" : "development";
}

function getDefaultPriority(assetType: string): number {
  if (assetType === "fullBoard" || assetType === "boardAsset") {
    return 100;
  }

  if (assetType === "boardTile" || assetType === "boardTileAsset") {
    return 95;
  }

  if (assetType === "characterPortrait" || assetType === "nemesisPortrait" || assetType === "runtimeAsset") {
    return 90;
  }

  if (assetType === "cardBack" || assetType === "icon" || assetType === "token" || assetType === "uiFrame" || assetType === "background") {
    return 85;
  }

  if (
    assetType === "threatCardArt" ||
    assetType === "contractCardArt" ||
    assetType === "anomalyCardArt" ||
    assetType === "artifactCardArt"
  ) {
    return 75;
  }

  if (assetType === "scarCardArt" || assetType === "escalationCardArt" || assetType === "missionCardArt") {
    return 60;
  }

  if (assetType === "scenarioSheetArt") {
    return 50;
  }

  return 70;
}

function shouldRequireForRelease(assetType: string): boolean {
  return !["fallbackAsset"].includes(assetType);
}

function toExpectedAsset(asset: {
  id: string;
  assetType: string;
  outputPath: string;
  usage: string;
  priority?: number;
  releaseRequired?: boolean;
  placeholderAllowed?: boolean;
}): ExpectedAsset {
  const priority = asset.priority ?? getDefaultPriority(asset.assetType);

  return {
    id: asset.id,
    assetType: asset.assetType,
    outputPath: asset.outputPath,
    usage: asset.usage,
    priority,
    releaseRequired: asset.releaseRequired ?? shouldRequireForRelease(asset.assetType),
    placeholderAllowed: asset.placeholderAllowed ?? false
  };
}

function readPngDimensions(path: string): AssetDimensions | undefined {
  const buffer = readFileSync(path);

  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return undefined;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readSvgDimensions(path: string): AssetDimensions | undefined {
  const raw = readFileSync(path, "utf8");
  const width = Number(raw.match(/\bwidth=["']?([0-9.]+)/i)?.[1]);
  const height = Number(raw.match(/\bheight=["']?([0-9.]+)/i)?.[1]);

  if (Number.isFinite(width) && Number.isFinite(height)) {
    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  const viewBox = raw.match(/\bviewBox=["'][^"']*\s+([0-9.]+)\s+([0-9.]+)["']/i);

  if (!viewBox) {
    return undefined;
  }

  return {
    width: Math.round(Number(viewBox[1])),
    height: Math.round(Number(viewBox[2]))
  };
}

function readDimensions(path: string): AssetDimensions | undefined {
  if (path.endsWith(".png")) {
    return readPngDimensions(path);
  }

  if (path.endsWith(".svg")) {
    return readSvgDimensions(path);
  }

  return undefined;
}

function isPlaceholderAsset(outputPath: string, absolutePath: string): boolean {
  const name = basename(outputPath).toLowerCase();

  if (name.includes("placeholder") || name.includes("missing-asset") || name.includes("missing_asset")) {
    return true;
  }

  if (!outputPath.endsWith(".svg") && !outputPath.endsWith(".png")) {
    return false;
  }

  const header = readFileSync(absolutePath).subarray(0, 512).toString("utf8").toLowerCase();
  return header.includes("ashen_reach_placeholder") || header.includes("placeholder asset");
}

function toIssue(entry: AssetAuditEntry, reason: string): AssetIssue {
  return {
    id: entry.id,
    assetType: entry.assetType,
    outputPath: entry.outputPath,
    usage: entry.usage,
    priority: entry.priority,
    releaseRequired: entry.releaseRequired,
    reason
  };
}

const mode = getMode();
const artifactsRoot = join(process.cwd(), "artifacts", "assets");
const auditReportPath = join(artifactsRoot, "audit-report.json");
const missingPrioritizedPath = join(artifactsRoot, "missing-prioritized.json");

const extraRuntimeAssets: ExpectedAsset[] = [
  ...getRuntimeAssetPaths().map((outputPath) =>
    toExpectedAsset({
      id: outputPath,
      assetType: "runtimeAsset",
      outputPath,
      usage: "Runtime UI, portrait, nemesis, or dice asset referenced by assetPaths.ts"
    })
  ),
  ...getBoardTileAssetPaths().map((outputPath) =>
    toExpectedAsset({
      id: outputPath,
      assetType: "boardTileAsset",
      outputPath,
      usage: "Board tile art referenced by TalismanBoardSurface.tsx"
    })
  ),
  toExpectedAsset({
    id: "full_board_main",
    assetType: "boardAsset",
    outputPath: getAssetPath("full_board_main"),
    usage: "Host TV tactical board background"
  })
];

const expectedAssets = [
  ...imagePrompts.map((prompt) =>
    toExpectedAsset({
      id: prompt.id,
      assetType: prompt.assetType,
      outputPath: prompt.outputPath,
      usage: prompt.usage,
      priority: prompt.priority,
      releaseRequired: prompt.releaseRequired,
      placeholderAllowed: prompt.placeholderAllowed
    })
  ),
  ...extraRuntimeAssets
].filter((asset, index, assets) => assets.findIndex((entry) => entry.outputPath === asset.outputPath) === index);

const entries: AssetAuditEntry[] = expectedAssets.map((asset) => {
  const absolutePath = resolvePublicPath(asset.outputPath);
  const present = existsSync(absolutePath);
  const issues: string[] = [];
  let bytes: number | undefined;
  let dimensions: AssetDimensions | undefined;
  let placeholder = false;

  if (!present) {
    issues.push("missing");
  } else {
    bytes = statSync(absolutePath).size;

    if (bytes === 0) {
      issues.push("zero-byte");
    } else {
      dimensions = readDimensions(absolutePath);
      placeholder = isPlaceholderAsset(asset.outputPath, absolutePath);

      if (placeholder && !asset.placeholderAllowed) {
        issues.push("placeholder");
      }
    }
  }

  return {
    ...asset,
    present,
    bytes,
    dimensions,
    placeholder,
    issues
  };
});

const missingEntries = entries.filter((entry) => entry.issues.includes("missing"));
const invalidEntries = entries.filter((entry) => entry.issues.includes("zero-byte"));
const placeholderEntries = entries.filter((entry) => entry.issues.includes("placeholder"));
const releaseBlockingEntries = entries.filter(
  (entry) => entry.releaseRequired && (entry.issues.includes("missing") || entry.issues.includes("zero-byte") || entry.issues.includes("placeholder"))
);

const byType = missingEntries.reduce<Record<string, number>>((summary, asset) => {
  summary[asset.assetType] = (summary[asset.assetType] ?? 0) + 1;
  return summary;
}, {});

const cardImageSummary = CARD_IMAGE_TYPES.reduce<Record<CardImageType, { total: number; present: number; missing: number }>>(
  (summary, cardType) => {
    const prompts = imagePrompts.filter((prompt) => prompt.assetType === `${cardType}CardArt` || (cardType === "threat" && prompt.assetType === "threatCardArt"));
    const present = prompts.filter((prompt) => existsSync(resolvePublicPath(prompt.outputPath))).length;
    summary[cardType] = {
      total: prompts.length,
      present,
      missing: prompts.length - present
    };
    return summary;
  },
  {
    threat: { total: 0, present: 0, missing: 0 },
    contract: { total: 0, present: 0, missing: 0 },
    anomaly: { total: 0, present: 0, missing: 0 },
    artifact: { total: 0, present: 0, missing: 0 },
    equipment: { total: 0, present: 0, missing: 0 },
    scar: { total: 0, present: 0, missing: 0 },
    escalation: { total: 0, present: 0, missing: 0 }
  }
);

const missingAssets = missingEntries
  .map((entry) => toIssue(entry, "missing"))
  .sort((left, right) => right.priority - left.priority || left.outputPath.localeCompare(right.outputPath));
const invalidAssets = invalidEntries.map((entry) => toIssue(entry, "zero-byte"));
const placeholderAssets = placeholderEntries.map((entry) => toIssue(entry, "placeholder"));
const releaseBlockingAssets = releaseBlockingEntries
  .map((entry) => toIssue(entry, entry.issues.join(", ")))
  .sort((left, right) => right.priority - left.priority || left.outputPath.localeCompare(right.outputPath));

const report: MissingAssetSummary = {
  mode,
  total: entries.length,
  present: entries.filter((entry) => entry.present).length,
  missing: missingEntries.length,
  invalid: invalidEntries.length,
  placeholders: placeholderEntries.length,
  releaseBlocking: releaseBlockingEntries.length,
  byType,
  cardImageSummary,
  missingAssets,
  invalidAssets,
  placeholderAssets,
  releaseBlockingAssets,
  reportPaths: {
    auditReport: auditReportPath,
    missingPrioritized: missingPrioritizedPath
  }
};

mkdirSync(artifactsRoot, { recursive: true });
writeFileSync(auditReportPath, `${JSON.stringify({ ...report, entries }, null, 2)}\n`);
writeFileSync(
  missingPrioritizedPath,
  `${JSON.stringify(
    {
      mode,
      generatedAt: new Date().toISOString(),
      root: "public",
      items: missingAssets
    },
    null,
    2
  )}\n`
);

console.log(JSON.stringify(report, null, 2));

if (invalidEntries.length > 0 || (mode === "release" && releaseBlockingEntries.length > 0)) {
  process.exitCode = 1;
}
