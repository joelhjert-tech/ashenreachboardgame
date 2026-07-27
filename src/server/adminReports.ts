import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface AdminReportSummary {
  id: string;
  title: string;
  path: string;
  modifiedAt: string | null;
  sizeBytes: number | null;
  summary: string;
  recordCount?: number;
  available: boolean;
}

const REPORTS = [
  {
    id: "card-lifecycle",
    title: "Card Category Lifecycle",
    path: "docs/research/P23_CARD_CATEGORY_LIFECYCLE_MATRIX.json"
  },
  {
    id: "threat-power",
    title: "Threat Power Audit",
    path: "docs/research/THREAT_POWER_AUDIT.md"
  },
  {
    id: "topology",
    title: "Map Topology Audit",
    path: "reports/ashen-reach-map-topology-audit.md"
  },
  {
    id: "assets",
    title: "Asset Audit",
    path: "artifacts/assets/audit-report.json"
  },
  {
    id: "scenario-matrix",
    title: "Scenario Player Matrix",
    path: "docs/qa/S21_FULL_GAME_CAMPAIGN_SUMMARY.json"
  },
  {
    id: "host-ui",
    title: "Host UI Visual Audit",
    path: "reports/host-ui-visual-audit.md"
  }
] as const;

function firstUsefulParagraph(source: string): string {
  return source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim())
    .find((paragraph) => paragraph.length > 24 && !paragraph.startsWith("{")) ?? "Generated development evidence.";
}

function jsonSummary(source: string): { summary: string; recordCount?: number } {
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const recordCount = typeof parsed.recordCount === "number"
      ? parsed.recordCount
      : Array.isArray(parsed.records)
        ? parsed.records.length
        : undefined;
    const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : null;
    return {
      summary: [
        recordCount === undefined ? null : `${recordCount} classified records`,
        generatedAt ? `generated ${generatedAt}` : null
      ].filter(Boolean).join(" · ") || "Generated JSON evidence.",
      ...(recordCount === undefined ? {} : { recordCount })
    };
  } catch {
    return { summary: "Generated JSON evidence could not be summarized." };
  }
}

export async function readAdminReportSummaries(projectRoot: string): Promise<AdminReportSummary[]> {
  return await Promise.all(REPORTS.map(async (report): Promise<AdminReportSummary> => {
    const resolved = path.resolve(projectRoot, report.path);
    const safeRoot = path.resolve(projectRoot);
    if (!resolved.startsWith(`${safeRoot}${path.sep}`)) {
      return { ...report, modifiedAt: null, sizeBytes: null, summary: "Report path rejected.", available: false };
    }
    try {
      const [metadata, source] = await Promise.all([stat(resolved), readFile(resolved, "utf8")]);
      const details = report.path.endsWith(".json")
        ? jsonSummary(source)
        : { summary: firstUsefulParagraph(source).slice(0, 260) };
      return {
        ...report,
        modifiedAt: metadata.mtime.toISOString(),
        sizeBytes: metadata.size,
        ...details,
        available: true
      };
    } catch {
      return {
        ...report,
        modifiedAt: null,
        sizeBytes: null,
        summary: "This generated report is not present in the current workspace.",
        available: false
      };
    }
  }));
}
