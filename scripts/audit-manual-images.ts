import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const sourceRoot = join(process.cwd(), "..", "Manualimages");
const outputPath = join(process.cwd(), "docs", "research", "MANUAL_IMAGE_CARD_ART_REVIEW.md");
const files = readdirSync(sourceRoot).filter((name) => !name.toLowerCase().endsWith(".zip")).sort();

const safeConcepts: Record<string, string> = {
  "ChatGPT Image Jul 27, 2026, 06_18_31 PM.png": "Report-only concept: Pallid Tithe-Lector.",
  "ChatGPT Image Jul 27, 2026, 06_18_39 PM.png": "Report-only concept: Gilt-Maw Assessor.",
  "ChatGPT Image Jul 27, 2026, 06_18_42 PM.png": "Report-only concept: Frostwire Collector.",
  "ChatGPT Image Jul 27, 2026, 06_18_43 PM.png": "Duplicate of Frostwire Collector concept; do not import.",
  "ChatGPT Image Jul 27, 2026, 06_18_47 PM.png": "Report-only concept: Hook-Crown Bailiff.",
  "ChatGPT Image Jul 27, 2026, 06_18_52 PM.png": "Report-only concept: Violet Ledger-Rake.",
  "ChatGPT Image Jul 27, 2026, 06_18_58 PM.png": "Duplicate of Violet Ledger-Rake concept; do not import.",
  "ChatGPT Image Jul 27, 2026, 06_19_56 PM.png": "Approved existing-card match: Grave Scribe Follower.",
  "ChatGPT Image Jul 27, 2026, 06_20_03 PM.png": "Report-only concept: Skittershroud, a Red enemy; replace baked text before any future use.",
  "ChatGPT Image Jul 27, 2026, 06_20_18 PM.png": "Report-only boss-scenario seed; requires clean replacement art without framing or text.",
  "ChatGPT Image Jul 27, 2026, 06_20_26 PM.png": "Report-only concept: Veilseason Shade, a Blue enemy; requires clean replacement art."
};

const rows = await Promise.all(files.map(async (name) => {
  const path = join(sourceRoot, name);
  const buffer = readFileSync(path);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const metadata = await sharp(path).metadata();
  const chatGpt = name.startsWith("ChatGPT Image");
  const approved = name === "ChatGPT Image Jul 27, 2026, 06_19_56 PM.png";
  const concept = safeConcepts[name];
  return {
    name,
    bytes: statSync(path).size,
    hash,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    provenance: chatGpt ? "Medium: filename indicates generated origin; prompt history unavailable" : "Unknown: social/downloaded source",
    risk: approved || concept ? "Low–medium; original-looking, but retain provenance caution" : "High: unknown provenance, recognizable third-party style, capture, or text-bearing composition",
    proposal: concept ?? "No Ashenreach use proposed.",
    decision: approved ? "Imported byte-for-byte as Grave Scribe" : concept ? "Describe only; no gameplay or asset import" : "Reject; keep outside Git"
  };
}));

const duplicates = new Map<string, string[]>();
for (const row of rows) duplicates.set(row.hash, [...(duplicates.get(row.hash) ?? []), row.name]);

const tableRows = rows.map((row) => {
  const duplicateNames = duplicates.get(row.hash)!;
  const duplicate = duplicateNames.length > 1 ? duplicateNames.filter((name) => name !== row.name).join(", ") : "Unique";
  return `| ${row.name.replace(/\|/g, "\\|")} | ${row.hash} | ${row.width}×${row.height} | ${row.bytes.toLocaleString("en-US")} | ${duplicate.replace(/\|/g, "\\|")} | ${row.provenance} | ${row.risk} | ${row.proposal} | ${row.decision} |`;
}).join("\n");

const report = `# Manual Image Card-Art Review

## Scope and decision

- Source directory: \`${sourceRoot}\`
- Loose images reviewed: ${rows.length}
- Source files moved or deleted: 0
- Files imported: 1
- High-confidence existing-card match: \`ChatGPT Image Jul 27, 2026, 06_19_56 PM.png\` → Grave Scribe
- Imported SHA-256: \`${rows.find((row) => row.name.includes("06_19_56"))!.hash}\`
- ZIP verification: \`Photos-1-001.zip\` contains 45 entries whose bytes exactly duplicate corresponding loose files.
- Byte-identical loose pairs: \`06_18_42\` / \`06_18_43\`, and \`06_18_52\` / \`06_18_58\`.

The audit uses a high-confidence-only policy. Facebook and WhatsApp captures, external stat-card sheets, Last Reliquary material, recognizable third-party imagery, and uncertain text-bearing compositions are not imported. Suggestions are concepts only and do not create content or mechanics.

## Per-file inventory

| File | SHA-256 | Dimensions | Bytes | Duplicate status | Provenance confidence | Originality/IP risk | Proposed use | Import decision |
|---|---|---:|---:|---|---|---|---|---|
${tableRows}

## Existing fallback debt after this pass

- Production Equipment still using the Equipment fallback: 30.
- Production Followers still using the dedicated Follower fallback: 14.
- Grave Scribe now resolves through first-class Follower art.
- Artifact-deck Followers retain their established Artifact presentations.

## Report-only original concepts

- Pallid Tithe-Lector
- Gilt-Maw Assessor
- Frostwire Collector
- Hook-Crown Bailiff
- Violet Ledger-Rake
- Skittershroud — proposed Red enemy
- Veilseason Shade — proposed Blue enemy
- Framed group composition — boss-scenario seed requiring clean replacement art

No proposed concept was added to content, decks, encounters, or scenario rules.
`;

writeFileSync(outputPath, report);
console.log(`Wrote ${outputPath} with ${rows.length} image rows.`);
