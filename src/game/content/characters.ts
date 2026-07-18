import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authoredCharacterSchema, type AuthoredCharacter } from "../schema/character.schema.js";

export function parseAuthoredCharacter(record: unknown, source = "<authored character>"): AuthoredCharacter {
  const parsed = authoredCharacterSchema.safeParse(record);

  if (!parsed.success) {
    const id = record && typeof record === "object" && "id" in record && typeof record.id === "string"
      ? record.id
      : "<missing-id>";
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${source} (${id}) is not a valid authored character: ${details}`);
  }

  return parsed.data;
}

export function loadCharacters(
  contentRoot = join(process.cwd(), "content", "characters")
): Map<string, AuthoredCharacter> {
  const records = new Map<string, AuthoredCharacter>();

  for (const file of readdirSync(contentRoot).filter((entry) => entry.endsWith(".json"))) {
    const source = join(contentRoot, file);
    const record = parseAuthoredCharacter(JSON.parse(readFileSync(source, "utf8")), source);

    if (records.has(record.id)) {
      throw new Error(`Duplicate content id ${record.id} in ${contentRoot}`);
    }

    records.set(record.id, record);
  }

  return records;
}
