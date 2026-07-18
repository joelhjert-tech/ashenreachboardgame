import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

const SOURCE = "content/followers/crownless-advocate.json";

async function post<T>(baseUrl: string, route: string, body: Record<string, unknown>): Promise<{ status: number; payload: T }> {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, payload: await response.json() as T };
}

describe("admin content API authority", () => {
  let harness: StartedAshenReachServer | null = null;
  let root: string | null = null;

  afterEach(async () => {
    await harness?.close();
    if (root) await rm(root, { recursive: true, force: true });
    harness = null;
    root = null;
  });

  it("requires both the development flag and the canonical host token", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "ashen-admin-api-"));
    await mkdir(path.join(root, path.dirname(SOURCE)), { recursive: true });
    await writeFile(path.join(root, SOURCE), await readFile(path.join(process.cwd(), SOURCE)));
    await mkdir(path.join(root, "content"), { recursive: true });
    await writeFile(path.join(root, "content/card-artwork-overrides.json"), "{}\n");
    harness = await startAshenReachServer({
      port: 19180 + Math.floor(Math.random() * 500),
      maxPortAttempts: 20,
      logUrls: false,
      adminContentEditingEnabled: true,
      projectRoot: root
    });
    const baseUrl = `http://127.0.0.1:${harness.port}`;
    const created = await post<{ roomCode: string; hostToken: string }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_broken_seal"
    });
    expect(created.status).toBe(200);

    const unauthorized = await post<{ error: string }>(baseUrl, "/api/admin/content/card", {
      roomCode: created.payload.roomCode,
      hostToken: "not-the-host",
      sourcePath: SOURCE
    });
    expect(unauthorized.status).toBe(403);

    const status = await post<{ editingAllowed: boolean; mode: string }>(baseUrl, "/api/admin/content/status", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken
    });
    expect(status).toEqual({ status: 200, payload: expect.objectContaining({ editingAllowed: true, mode: "edit-enabled" }) });

    const card = await post<{ record: { id: string }; revision: string }>(baseUrl, "/api/admin/content/card", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken,
      sourcePath: SOURCE
    });
    expect(card.status).toBe(200);
    expect(card.payload.record.id).toBe("crownless-advocate");

    harness.roomServer.getState().status = "active";
    const lockedStatus = await post<{ editingAllowed: boolean; mode: string }>(baseUrl, "/api/admin/content/status", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken
    });
    expect(lockedStatus.payload).toMatchObject({ editingAllowed: false, mode: "active-session-locked" });
    const lockedRead = await post<{ error: string }>(baseUrl, "/api/admin/content/card", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken,
      sourcePath: SOURCE
    });
    expect(lockedRead.status).toBe(423);
  });
});
