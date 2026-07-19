import { describe, expect, it } from "vitest";
import { AdminContentEditor } from "../adminContentEditor.js";
import { AdminSimulationLab, SimulationExecutionContext } from "../adminSimulationLab.js";
import { createInitialSessionState } from "../sessionState.js";
import type { AdminSimulationBatchJob, AdminSimulationStartRequest } from "../../shared/adminSimulation.js";

const OWNER = "host-admin:test";
const CARD_ID = "ash-choir-crusader";

async function request(editor: AdminContentEditor, overrides: Partial<AdminSimulationStartRequest> = {}): Promise<AdminSimulationStartRequest> {
  const source = await editor.findCard(CARD_ID, "threat");
  return {
    mode: "start",
    cardId: CARD_ID,
    cardFamily: "threat",
    expectedRevision: source.revision,
    operative: { preset: "custom", stats: { command: 3, grit: 3, signal: 3, guile: 3, forge: 3 }, wounds: 0, salvage: 3 },
    dice: { mode: "fixed", values: [6, 6, 1, 1], seed: "fixed-win" },
    outcomeMode: "calculated",
    ...overrides
  };
}

async function completedBatch(lab: AdminSimulationLab, owner: string, job: AdminSimulationBatchJob): Promise<AdminSimulationBatchJob> {
  let current = job;
  for (let index = 0; index < 500 && ["queued", "running"].includes(current.status); index += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    current = lab.getBatch(owner, job.jobId);
  }
  return current;
}

describe("AdminSimulationLab", () => {
  const editor = new AdminContentEditor({ projectRoot: process.cwd(), enabled: true });

  it("resolves a saved enemy through a detached canonical server and preserves live state", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "multiplayer", undefined, "co-op", "standard", 2);
    const before = JSON.stringify(live);
    const result = await lab.start(OWNER, await request(editor), live);
    expect(result.outcome).toBe("SUCCESS");
    expect(result.dice.operative).toEqual([6, 6]);
    expect(result.dice.enemy).toEqual([1, 1]);
    expect(result.effects.some((entry) => entry.type === "gain_note" && entry.status === "success")).toBe(true);
    expect(result.isolation.liveStateHashAfter).toBe(result.isolation.liveStateHashBefore);
    expect(result.isolation.registryHashAfter).toBe(result.isolation.registryHashBefore);
    expect(JSON.stringify(live)).toBe(before);
  });

  it("rejects browser paths, stale revisions, and exhausted fixed dice", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const valid = await request(editor);
    await expect(lab.start(OWNER, { ...valid, sourcePath: "content/cards/threats/ash-choir-crusader.json" } as AdminSimulationStartRequest, live)).rejects.toThrow(/sourcePath|unsupported/i);
    await expect(lab.start(OWNER, { ...valid, expectedRevision: "stale" }, live)).rejects.toThrow(/revision/i);
    await expect(lab.start(OWNER, { ...valid, dice: { mode: "fixed", values: [6] } }, live)).rejects.toThrow(/exhausted/i);
  });

  it("applies failure penalties, current Scars, and deterministic seeds", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const failed = await lab.start(OWNER, await request(editor, { dice: { mode: "fixed", values: [1, 1, 6, 6], seed: "fixed-loss" } }), live);
    expect(failed.outcome).toBe("FAILURE");
    expect(failed.after.wounds).toBeGreaterThan(failed.before.wounds);
    const scarPrompt = failed.prompts.find((prompt) => prompt.kind === "choose-scar")!;
    expect(scarPrompt.optionIds).toHaveLength(2);
    const scarred = lab.continue(OWNER, { mode: "continue", simulationId: failed.simulationId, promptId: scarPrompt.id, choice: { kind: "choose-scar", optionId: scarPrompt.optionIds[0]! } }, live);
    expect(scarred.after.scars.length).toBeGreaterThan(scarred.before.scars.length);
    const seededRequest = await request(editor, { dice: { mode: "seeded", seed: "same-seed" } });
    const first = await lab.start(OWNER, seededRequest, live);
    const second = await lab.start(OWNER, seededRequest, live);
    expect(second.dice).toEqual(first.dice);
    expect(second.diff).toEqual(first.diff);
    expect(second.deterministicResultHash).toBe(first.deterministicResultHash);
  });

  it("validates unsaved drafts without changing the registry and rejects Heat", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const source = await editor.findCard(CARD_ID, "threat");
    const draft = { ...source.record, title: "Unsaved Bell Trial", defeatReward: { type: "gain_salvage", amount: 2 } };
    const result = await lab.start(OWNER, await request(editor, { draft }), live);
    expect(result.sourceLabel).toBe("UNSAVED EDITOR DRAFT");
    expect(result.cardName).toBe("Unsaved Bell Trial");
    expect((await editor.findCard(CARD_ID, "threat")).record.title).toBe("Ash Choir Crusader");
    await expect(lab.start(OWNER, await request(editor, { draft: { ...source.record, defeatReward: { type: "gain_heat", amount: 1 } } }), live)).rejects.toThrow(/Heat/i);
  });

  it("persists and consumes canonical prompt continuations once", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const source = await editor.findCard("memory-tax-gate", "threat");
    const started = await lab.start(OWNER, {
      ...(await request(editor)), cardId: "memory-tax-gate", expectedRevision: source.revision,
      operative: { preset: "custom", stats: { command: 1 }, salvage: 1 }, dice: { mode: "fixed", values: [1, 1] }
    }, live);
    const prompt = started.prompts[0]!;
    expect(prompt.kind).toBe("memory-tax");
    const continued = lab.continue(OWNER, { mode: "continue", simulationId: started.simulationId, promptId: prompt.id, choice: { kind: "memory-tax", optionId: "lose-salvage-1" } }, live);
    expect(continued.after.salvage).toBe(0);
    await expect(Promise.resolve().then(() => lab.continue(OWNER, { mode: "continue", simulationId: started.simulationId, promptId: prompt.id, choice: { kind: "memory-tax", optionId: "lose-salvage-1" } }, live))).rejects.toThrow(/consumed/i);
  });

  it("continues Equipment, suppression, and forced-destination prompts with owner and option checks", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "multiplayer", undefined, "co-op", "standard", 2);
    const gearSource = await editor.findCard("breach-lens-overload", "threat");
    const gearResult = await lab.start(OWNER, {
      ...(await request(editor)), cardId: "breach-lens-overload", expectedRevision: gearSource.revision,
      operative: { preset: "custom", stats: { forge: 5 }, gearIds: ["surveyor-chalk"], equipGearIds: ["surveyor-chalk"] }, dice: { mode: "fixed", values: [6, 6] }
    }, live);
    const equip = gearResult.prompts.find((entry) => entry.kind === "equipment")!;
    expect(equip).toBeDefined();
    expect(() => lab.continue("other-admin", { mode: "continue", simulationId: gearResult.simulationId, promptId: equip.id, choice: { kind: "equipment", optionId: "keepCarried" } }, live)).toThrow(/another host/i);
    const carried = lab.continue(OWNER, { mode: "continue", simulationId: gearResult.simulationId, promptId: equip.id, choice: { kind: "equipment", optionId: "keepCarried" } }, live);
    expect(carried.after.gear.some((entry) => entry.id === "field-lens" && !entry.equipped)).toBe(true);

    const suppressionSource = await editor.findCard("relay-husk", "threat");
    const suppressed = await lab.start(OWNER, {
      ...(await request(editor)), cardId: "relay-husk", expectedRevision: suppressionSource.revision,
      operative: { preset: "custom", stats: { guile: 1 }, gearIds: ["surveyor-chalk"], equipGearIds: ["surveyor-chalk"] }, dice: { mode: "fixed", values: [1, 1] }
    }, live);
    expect(suppressed.prompts.some((entry) => entry.kind === "suppression")).toBe(true);

    const routeSource = await editor.findCard("false-route-procession", "threat");
    const routed = await lab.start(OWNER, {
      ...(await request(editor)), cardId: "false-route-procession", expectedRevision: routeSource.revision,
      operative: { preset: "custom", stats: { command: 1 } }, dice: { mode: "fixed", values: [1, 1] }
    }, live);
    const route = routed.prompts.find((entry) => entry.kind === "forced-destination");
    expect(route?.optionIds.length).toBeGreaterThan(0);
    expect(() => lab.continue(OWNER, { mode: "continue", simulationId: routed.simulationId, promptId: route!.id, choice: { kind: "forced-destination", optionId: "not-offered" } }, live)).toThrow(/not offered/i);
  });

  it("expires and closes detached sessions and disables persistence", async () => {
    let now = 1_000;
    const lab = new AdminSimulationLab(editor, () => now);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const started = await lab.start(OWNER, await request(editor), live);
    expect(lab.close("foreign-owner", started.simulationId)).toBe(0);
    expect(lab.close(OWNER, started.simulationId)).toBe(1);
    const context = new SimulationExecutionContext("test", "hash", "seed", { mode: "seeded", seed: "seed" });
    expect(() => context.persist()).toThrow(/disabled/i);
    const expiring = await lab.start(OWNER, await request(editor), live);
    now += 31 * 60 * 1000;
    expect(() => lab.continue(OWNER, { mode: "continue", simulationId: expiring.simulationId, promptId: "stale", choice: { kind: "encounter", optionId: "x" } }, live)).toThrow(/expired/i);
  });

  it("runs independent calculated batches and excludes forced previews", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const start = await request(editor, { dice: { mode: "seeded", seed: "batch" }, outcomeMode: "calculated" });
    const job = await completedBatch(lab, OWNER, lab.startBatch(OWNER, { ...start, outcomeMode: "calculated", runs: 10 }, live));
    expect(job.status).toBe("complete");
    expect(job.result).toMatchObject({ runs: 10, completedRuns: 10, allInitialHashesMatch: true });
    expect(job.result?.resolverErrors).toEqual([]);
    expect(() => lab.startBatch(OWNER, { ...start, outcomeMode: "success" as "calculated", runs: 10 }, live)).toThrow(/Forced branch/i);
  });

  it("cancels a batch without emitting individual traces", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const start = await request(editor, { dice: { mode: "seeded", seed: "cancel-batch" }, outcomeMode: "calculated" });
    const created = lab.startBatch(`${OWNER}:cancel`, { ...start, outcomeMode: "calculated", runs: 1000 }, live);
    const cancelled = lab.cancelBatch(`${OWNER}:cancel`, created.jobId);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled).not.toHaveProperty("result");
  });

  it("activates an owner-controlled Scar Adaptation through the detached canonical control", async () => {
    const lab = new AdminSimulationLab(editor);
    const live = createInitialSessionState("live-room", "single-player", undefined, "co-op", "standard", 1);
    const source = await editor.findCard("scar-wound-9", "scar");
    const result = await lab.start(OWNER, {
      mode: "start",
      cardId: "scar-wound-9",
      cardFamily: "scar",
      expectedRevision: source.revision,
      operative: { preset: "custom", stats: { grit: 3 }, scarIds: ["scar-wound-9"] },
      dice: { mode: "fixed", values: [3, 3], seed: "scar-adaptation" },
      outcomeMode: "calculated",
      activateScarAdaptation: true
    }, live);
    expect(result.eventLog.some((entry) => entry.type === "SCAR_ADAPTATION_ACTIVATED")).toBe(true);
    expect(result.dice.modifiers).toContainEqual({ label: "Red March Tremor (Scar)", value: 1 });
    expect(result.isolation.liveStateHashAfter).toBe(result.isolation.liveStateHashBefore);
  });
});
