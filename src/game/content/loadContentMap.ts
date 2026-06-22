import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";

export function loadContentMap<T>(
  contentRoot: string,
  schema: ZodType<T>
): Map<string, T> {
  const files = readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"));
  const records = new Map<string, T>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(contentRoot, file), "utf8"));
    const record = schema.parse(parsed);
    const recordId = getRecordId(record);

    if (records.has(recordId)) {
      throw new Error(`Duplicate content id ${recordId} in ${contentRoot}`);
    }

    records.set(recordId, record);
  }

  return records;
}

function getRecordId<T>(record: T): string {
  if (!record || typeof record !== "object" || !("id" in record)) {
    throw new Error("Content record is missing an id field");
  }

  const id = (record as { id: unknown }).id;

  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Content record id must be a non-empty string");
  }

  return id;
}
