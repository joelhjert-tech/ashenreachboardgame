import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardLifecycleAuditSchema } from "../card-lifecycle-audit-schema.js";

const audit = cardLifecycleAuditSchema.parse(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "docs", "research", "P23_CARD_CATEGORY_LIFECYCLE_MATRIX.json"),
      "utf8"
    )
  )
);

describe("P23 card lifecycle audit", () => {
  it("classifies the complete consolidated catalog with the approved scope split", () => {
    expect(audit.recordCount).toBe(401);
    expect(audit.gameplayRecordCount).toBe(375);
    expect(audit.appendixRecordCount).toBe(26);
    expect(audit.records).toHaveLength(401);
  });

  it("contains no duplicate or silently omitted family identities", () => {
    const identities = audit.records.map((record) => `${record.family}:${record.id}`);
    expect(new Set(identities).size).toBe(audit.recordCount);
    expect(audit.records.every((record) => record.sourcePath && record.tests.length > 0)).toBe(true);
  });

  it("makes every excluded record explicit and keeps live records complete", () => {
    const excluded = audit.records.filter((record) => record.status !== "complete");
    expect(excluded.every((record) => record.notes.length > 0)).toBe(true);
    expect(audit.records.filter((record) => record.status === "partial")).toEqual([]);
    expect(audit.records.filter((record) => record.status === "unreachable")).toEqual([]);
    expect(audit.records.filter((record) => record.status === "unused")).toEqual([]);
    expect(audit.records.find((record) => record.id === "rift-whispers")?.status).toBe("superseded");
    expect(audit.records.some((record) => record.family === "Contract" && record.id === "span-of-the-last-seal")).toBe(true);
  });

  it("proves QA records cannot masquerade as canonical live records", () => {
    const qaRecords = audit.records.filter((record) =>
      record.id.startsWith("qa-") || record.id.startsWith("qa_") || record.id === "char_master_alpha"
    );
    expect(qaRecords.length).toBeGreaterThan(0);
    expect(qaRecords.every((record) => record.status === "development-only")).toBe(true);
  });
});
