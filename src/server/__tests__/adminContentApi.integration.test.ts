import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

const SOURCE = "content/followers/crownless-advocate.json";
const THREAT_SOURCE = "content/cards/threats/ash-choir-crusader.json";

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

  it("allows host reclaim only before the first player joins and then locks administration", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "ashen-admin-claim-api-"));
    await mkdir(path.join(root, "content"), { recursive: true });
    await writeFile(path.join(root, "content/card-artwork-overrides.json"), "{}\n");
    harness = await startAshenReachServer({
      port: 18980 + Math.floor(Math.random() * 500),
      maxPortAttempts: 20,
      logUrls: false,
      adminContentEditingEnabled: false,
      projectRoot: root
    });
    const baseUrl = `http://127.0.0.1:${harness.port}`;
    const sessionResponse = await fetch(`${baseUrl}/api/session`);
    const session = await sessionResponse.json() as { roomCode: string };

    const claimed = await post<{ roomCode: string; hostToken: string }>(baseUrl, "/api/session/claim-host", {
      roomCode: session.roomCode
    });
    expect(claimed.status).toBe(200);
    expect(claimed.payload).toMatchObject({
      roomCode: session.roomCode,
      hostToken: expect.any(String)
    });

    const beforeJoin = await post<{ dashboardAllowed: boolean; mode: string }>(baseUrl, "/api/admin/content/status", {
      roomCode: session.roomCode,
      hostToken: claimed.payload.hostToken
    });
    expect(beforeJoin).toEqual({
      status: 200,
      payload: expect.objectContaining({ dashboardAllowed: true, mode: "lobby-view" })
    });

    const joined = await post<{ seatId: string }>(baseUrl, "/api/session/join", {
      roomCode: session.roomCode,
      displayName: "First"
    });
    expect(joined.status).toBe(200);

    const afterJoin = await post<{ dashboardAllowed: boolean; mode: string }>(baseUrl, "/api/admin/content/status", {
      roomCode: session.roomCode,
      hostToken: claimed.payload.hostToken
    });
    expect(afterJoin).toEqual({
      status: 200,
      payload: expect.objectContaining({ dashboardAllowed: false, mode: "player-connected-locked" })
    });

    const secondClaim = await post<{ error: string }>(baseUrl, "/api/session/claim-host", {
      roomCode: session.roomCode
    });
    expect(secondClaim.status).toBe(423);

    const lockedReports = await post<{ error: string }>(baseUrl, "/api/admin/content/reports", {
      roomCode: session.roomCode,
      hostToken: claimed.payload.hostToken
    });
    expect(lockedReports.status).toBe(423);
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

  it("allows an authorized isolated simulation in the lobby without the editor flag and locks it during play", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "ashen-admin-sim-api-"));
    await mkdir(path.join(root, path.dirname(THREAT_SOURCE)), { recursive: true });
    await writeFile(path.join(root, THREAT_SOURCE), await readFile(path.join(process.cwd(), THREAT_SOURCE)));
    await writeFile(path.join(root, "content/card-artwork-overrides.json"), "{}\n");
    harness = await startAshenReachServer({ port: 19680 + Math.floor(Math.random() * 300), maxPortAttempts: 20, logUrls: false, adminContentEditingEnabled: false, projectRoot: root });
    const baseUrl = `http://127.0.0.1:${harness.port}`;
    const created = await post<{ roomCode: string; hostToken: string }>(baseUrl, "/api/session/create", { sessionMode: "single-player", scenarioId: "scenario_broken_seal" });
    const liveBefore = JSON.stringify(harness.roomServer.getState());
    const descriptor = await post<{ revision: string }>(baseUrl, "/api/admin/content/simulation-card", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken,
      cardId: "ash-choir-crusader",
      cardFamily: "threat"
    });
    expect(descriptor.status).toBe(200);
    const simulated = await post<{ isolated?: boolean; outcome?: string; dice?: { operative: number[] } }>(baseUrl, "/api/admin/content/simulate", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken,
      simulation: {
        mode: "start",
        cardId: "ash-choir-crusader",
        cardFamily: "threat",
        expectedRevision: descriptor.payload.revision,
        operative: { preset: "average", wounds: 0, salvage: 3 },
        dice: { mode: "fixed", values: [6, 6, 1, 1], seed: "api-fixed" },
        outcomeMode: "calculated"
      }
    });
    expect(simulated.status).toBe(200);
    expect(simulated.payload).toMatchObject({ isolated: true, outcome: "SUCCESS", dice: { operative: [6, 6] } });
    expect(JSON.stringify(harness.roomServer.getState())).toBe(liveBefore);

    harness.roomServer.getState().status = "active";
    const lockedDescriptor = await post<{ error: string }>(baseUrl, "/api/admin/content/simulation-card", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken,
      cardId: "ash-choir-crusader",
      cardFamily: "threat"
    });
    expect(lockedDescriptor.status).toBe(423);
  }, 20_000);
});
