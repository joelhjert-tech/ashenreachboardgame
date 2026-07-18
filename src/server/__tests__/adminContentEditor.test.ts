import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_UPLOAD_MAX_BYTES,
  AdminContentEditor,
  AdminContentError,
  readRasterDimensions
} from "../adminContentEditor.js";

const FOLLOWER_SOURCE = "content/followers/crownless-advocate.json";
const CONTRACT_SOURCE = "content/cards/contracts/break-the-raider-chain.json";

async function copyCanonicalFixture(root: string, sourcePath: string): Promise<void> {
  const target = path.join(root, sourcePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await readFile(path.join(process.cwd(), sourcePath)));
}

function png(width = 24, height = 36): Buffer {
  const result = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(result, 0);
  result.writeUInt32BE(width, 16);
  result.writeUInt32BE(height, 20);
  return result;
}

describe("AdminContentEditor", () => {
  let root: string;
  let editor: AdminContentEditor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "ashen-admin-editor-"));
    await copyCanonicalFixture(root, FOLLOWER_SOURCE);
    await copyCanonicalFixture(root, CONTRACT_SOURCE);
    await mkdir(path.join(root, "content"), { recursive: true });
    await writeFile(path.join(root, "content/card-artwork-overrides.json"), "{}\n");
    editor = new AdminContentEditor({ projectRoot: root, enabled: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("loads a canonical record with a stable revision hash", async () => {
    const first = await editor.getCard(FOLLOWER_SOURCE);
    const second = await editor.getCard(FOLLOWER_SOURCE);
    expect(first.record.id).toBe("crownless-advocate");
    expect(first.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(second.revision).toBe(first.revision);
  });

  it("atomically saves a valid edit and creates a reversible revision", async () => {
    const before = await editor.getCard(FOLLOWER_SOURCE);
    const edited = { ...before.record, name: "Crownless Advocate Revised" };
    const saved = await editor.save({ sourcePath: FOLLOWER_SOURCE, expectedRevision: before.revision, record: edited });
    expect(saved.record.name).toBe("Crownless Advocate Revised");
    expect(saved.savedRevision.fieldsChanged).toEqual(["name"]);
    expect(saved.revision).not.toBe(before.revision);

    const restored = await editor.revert(FOLLOWER_SOURCE, saved.savedRevision.id, saved.revision);
    expect(restored.record.name).toBe("Crownless Advocate");
  });

  it("rejects stale concurrent saves without changing the canonical file", async () => {
    const before = await editor.getCard(FOLLOWER_SOURCE);
    await editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: before.revision,
      record: { ...before.record, name: "First Writer" }
    });
    const afterFirst = await readFile(path.join(root, FOLLOWER_SOURCE), "utf8");
    await expect(editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: before.revision,
      record: { ...before.record, name: "Stale Writer" }
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(await readFile(path.join(root, FOLLOWER_SOURCE), "utf8")).toBe(afterFirst);
  });

  it("keeps stable IDs read-only and rejects duplicate IDs", async () => {
    const before = await editor.getCard(FOLLOWER_SOURCE);
    await expect(editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: before.revision,
      record: { ...before.record, id: "renamed-follower" }
    })).rejects.toMatchObject({ fieldErrors: { id: expect.any(String) } });

    const duplicate = path.join(root, "content/followers/duplicate.json");
    await writeFile(duplicate, `${JSON.stringify(before.record, null, 2)}\n`);
    const current = await editor.getCard(FOLLOWER_SOURCE);
    await expect(editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: current.revision,
      record: { ...current.record, name: "Duplicate Collision" }
    })).rejects.toBeInstanceOf(AdminContentError);
  });

  it("rejects retired Heat metadata and schema-invalid edits without modifying source", async () => {
    const before = await editor.getCard(FOLLOWER_SOURCE);
    const sourceBefore = await readFile(path.join(root, FOLLOWER_SOURCE), "utf8");
    await expect(editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: before.revision,
      record: { ...before.record, tags: ["heat"] }
    })).rejects.toMatchObject({ fieldErrors: { card: expect.stringContaining("legacy") } });
    await expect(editor.save({
      sourcePath: FOLLOWER_SOURCE,
      expectedRevision: before.revision,
      record: { ...before.record, loyalty: -100 }
    })).rejects.toMatchObject({ statusCode: 422 });
    expect(await readFile(path.join(root, FOLLOWER_SOURCE), "utf8")).toBe(sourceBefore);
  });

  it("rejects path traversal and unsupported source locations", async () => {
    await expect(editor.getCard("../content/followers/crownless-advocate.json")).rejects.toMatchObject({ statusCode: 400 });
    await expect(editor.getCard("content/card-artwork-overrides.json")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("writes a validated artwork override into the canonical asset tree", async () => {
    const before = await editor.getCard(CONTRACT_SOURCE);
    const image = png();
    const saved = await editor.save({
      sourcePath: CONTRACT_SOURCE,
      expectedRevision: before.revision,
      record: before.record,
      artwork: {
        dataBase64: image.toString("base64"),
        fileName: "break-the-raider-chain-qa.png",
        mimeType: "image/png"
      }
    });
    expect(saved.artwork.path).toBe("public/assets/cards/contracts/break-the-raider-chain-qa.png");
    expect(saved.artwork.dimensions).toEqual({ width: 24, height: 36 });
    expect(await readFile(path.join(root, saved.artwork.path!))).toEqual(image);
  });

  it("rejects unsafe, mismatched, and oversized artwork uploads", async () => {
    const before = await editor.getCard(CONTRACT_SOURCE);
    const request = { sourcePath: CONTRACT_SOURCE, expectedRevision: before.revision, record: before.record };
    await expect(editor.save({ ...request, artwork: { dataBase64: png().toString("base64"), fileName: "../escape.png", mimeType: "image/png" } })).rejects.toMatchObject({ statusCode: 400 });
    await expect(editor.save({ ...request, artwork: { dataBase64: png().toString("base64"), fileName: "wrong.jpg", mimeType: "image/jpeg" } })).rejects.toMatchObject({ statusCode: 415 });
    await expect(editor.save({ ...request, artwork: { dataBase64: Buffer.alloc(ADMIN_UPLOAD_MAX_BYTES + 1).toString("base64"), fileName: "huge.png", mimeType: "image/png" } })).rejects.toMatchObject({ statusCode: 413 });
  });

  it("reads PNG dimensions without decoding browser-side image data", () => {
    expect(readRasterDimensions(png(390, 585))).toEqual({ width: 390, height: 585 });
  });

  it("refuses all mutations when the editor feature flag is disabled", async () => {
    const disabled = new AdminContentEditor({ projectRoot: root, enabled: false });
    const before = await disabled.getCard(FOLLOWER_SOURCE);
    await expect(disabled.save({ sourcePath: FOLLOWER_SOURCE, expectedRevision: before.revision, record: before.record })).rejects.toMatchObject({ statusCode: 403 });
  });
});
