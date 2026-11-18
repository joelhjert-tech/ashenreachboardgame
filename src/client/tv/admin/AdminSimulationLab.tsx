export { isCardSimulatable } from "./adminCardHelpers.js";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { AdminLibraryCard } from "./adminLibraryRegistry.js";
import { HostImage } from "../HostImage.js";
import { cancelAdminSimulationBatch, closeAdminSimulation, fetchAdminSimulationBatch, fetchAdminSimulationCard, runAdminSimulation, startAdminSimulationBatch, type AdminContentAuth } from "./adminContentApi.js";
import type { AdminCardFamily, AdminSimulationBatchResult, AdminSimulationCardDescriptor, AdminSimulationStartRequest, AdminSimulationResult, CanonicalPromptChoice, SimulationOutcomeMode } from "../../../shared/adminSimulation.js";

const characterModules = import.meta.glob("../../../../content/characters/*.json", { eager: true, import: "default" }) as Record<string, Record<string, unknown>>;
const gearModules = import.meta.glob("../../../../content/gear/*.json", { eager: true, import: "default" }) as Record<string, Record<string, unknown>>;
const characterOptions = Object.values(characterModules).map((entry) => ({ id: String(entry.id), name: String(entry.name ?? entry.id), qaOnly: Boolean(entry.qaOnly) })).sort((a, b) => a.name.localeCompare(b.name));
const gearOptions = Object.values(gearModules).filter((entry) => !entry.qaOnly).map((entry) => ({ id: String(entry.id), name: String(entry.name ?? entry.id), tier: String(entry.tier ?? "normal") })).sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  card: AdminLibraryCard;
  auth: AdminContentAuth;
  draft?: Record<string, unknown> | null;
  onClose: () => void;
}

function downloadJson(name: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function Field({ label, before, after, change }: { label: string; before: unknown; after: unknown; change: string }): ReactElement {
  return <div className="admin-sim-diff-row"><strong>{label}</strong><span>{typeof before === "object" ? JSON.stringify(before) : String(before)}</span><span>{typeof after === "object" ? JSON.stringify(after) : String(after)}</span><b>{change}</b></div>;
}

export default function AdminSimulationLab({ card, auth, draft, onClose }: Props): ReactElement {
  const cardFamily = card.cardType.replace(/\s+/g, "-") as AdminCardFamily;
  const [descriptor, setDescriptor] = useState<AdminSimulationCardDescriptor | null>(null);
  const [sourceMode, setSourceMode] = useState<"saved" | "draft">(draft ? "draft" : "saved");
  const [preset, setPreset] = useState<AdminSimulationStartRequest["operative"]["preset"]>("average");
  const [characterId, setCharacterId] = useState(characterOptions[0]?.id ?? "");
  const [cloneSeatId, setCloneSeatId] = useState("");
  const [skillValue, setSkillValue] = useState(3);
  const [wounds, setWounds] = useState(0);
  const [salvage, setSalvage] = useState(3);
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [diceMode, setDiceMode] = useState<AdminSimulationStartRequest["dice"]["mode"]>("fixed");
  const [operativeDice, setOperativeDice] = useState([3, 3]);
  const [enemyDice, setEnemyDice] = useState([3, 3]);
  const [seed, setSeed] = useState(`${card.id}:lab`);
  const [outcomeMode, setOutcomeMode] = useState<SimulationOutcomeMode>("calculated");
  const [activateScarAdaptation, setActivateScarAdaptation] = useState(card.cardType === "scar");
  const [result, setResult] = useState<AdminSimulationResult | null>(null);
  const [history, setHistory] = useState<AdminSimulationResult[]>([]);
  const [batch, setBatch] = useState<AdminSimulationBatchResult | null>(null);
  const [batchRuns, setBatchRuns] = useState(100);
  const [batchJob, setBatchJob] = useState<{ id: string; status: string; completed: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchAdminSimulationCard(auth, card.id, cardFamily)
      .then((value) => { if (!cancelled) { setDescriptor(value); if (!value.simulatable) setError(value.unsupportedReason ?? "NO SIMULATABLE EFFECTS"); } })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Card revision could not be loaded"); });
    return () => { cancelled = true; void Promise.resolve(closeAdminSimulation(auth)).catch(() => undefined); };
  }, [auth.hostToken, auth.roomCode, card.id, cardFamily]);
  const testedSkill = card.skills[0]?.name ?? "command";
  const request = useMemo<AdminSimulationStartRequest>(() => ({
    mode: "start",
    cardId: card.id,
    cardFamily,
    expectedRevision: descriptor?.revision ?? "",
    ...(sourceMode === "draft" && draft ? { draft } : {}),
    operative: {
      preset,
      ...(preset === "character" ? { characterId } : {}),
      ...(preset === "clone-active" ? { cloneSeatId } : {}),
      ...(preset === "custom" ? { stats: { command: skillValue, grit: skillValue, signal: skillValue, guile: skillValue, forge: skillValue } } : {}),
      wounds, salvage, gearIds, equipGearIds: gearIds,
      ...(card.cardType === "scar" ? { scarIds: [card.id] } : {})
    },
    dice: { mode: diceMode, values: [...operativeDice, ...enemyDice], seed },
    outcomeMode,
    ...(card.cardType === "scar" ? { activateScarAdaptation } : {})
  }), [activateScarAdaptation, card.id, card.cardType, cardFamily, characterId, cloneSeatId, descriptor?.revision, diceMode, draft, enemyDice, gearIds, operativeDice, outcomeMode, preset, salvage, seed, skillValue, sourceMode, wounds]);

  const run = async (override: Partial<AdminSimulationStartRequest> = {}) => {
    setBusy(true); setError(null); setBatch(null);
    try {
      if (!descriptor) throw new Error("Waiting for the canonical card revision.");
      const next = await runAdminSimulation(auth, { ...request, ...override });
      setResult(next); setSeed(next.seed); setHistory((entries) => [next, ...entries].slice(0, 30));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Simulation failed"); }
    finally { setBusy(false); }
  };
  const runBatch = async () => {
    setBusy(true); setError(null);
    try {
      if (!descriptor) throw new Error("Waiting for the canonical card revision.");
      if (request.outcomeMode !== "calculated") throw new Error("Batch runs require calculated outcomes.");
      let job = await startAdminSimulationBatch(auth, { ...request, outcomeMode: "calculated", runs: batchRuns });
      setBatchJob({ id: job.jobId, status: job.status, completed: job.completedRuns });
      while (job.status === "queued" || job.status === "running") {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        job = await fetchAdminSimulationBatch(auth, job.jobId);
        setBatchJob({ id: job.jobId, status: job.status, completed: job.completedRuns });
      }
      if (job.status !== "complete" || !job.result) throw new Error(job.error ?? `Batch ${job.status}`);
      setBatch(job.result);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Batch simulation failed"); }
    finally { setBusy(false); }
  };
  const continuePrompt = async (prompt: AdminSimulationResult["prompts"][number], optionId: string) => {
    if (!result) return;
    const choice = { kind: prompt.kind, optionId } as CanonicalPromptChoice;
    setBusy(true); setError(null);
    try {
      const next = await runAdminSimulation(auth, { mode: "continue", simulationId: result.simulationId, promptId: prompt.id, choice });
      setResult(next); setHistory((entries) => [next, ...entries].slice(0, 30));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Prompt continuation failed"); }
    finally { setBusy(false); }
  };

  return <section className="admin-simulation-lab" aria-label={`Simulation Lab for ${card.name}`}>
    <header className="admin-sim-header">
      <div><span>HOST ADMINISTRATION · ISOLATED RESOLVER</span><h1>Simulation Lab <b>— {card.name}</b></h1></div>
      <div className="admin-sim-warning"><strong>SIMULATION ONLY</strong><span>LIVE GAME STATE WILL NOT BE MODIFIED</span></div>
      <button type="button" onClick={() => { void closeAdminSimulation(auth, result?.simulationId); onClose(); }}>Exit Simulation</button>
    </header>
    <div className="admin-sim-grid">
      <aside className="admin-sim-setup">
        <section><h2>Test Setup</h2><label><span>Simulation source</span><select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as "saved" | "draft")}><option value="saved">Saved card</option>{draft ? <option value="draft">Unsaved editor draft</option> : null}</select></label>{sourceMode === "draft" ? <p className="admin-sim-draft">UNSAVED PREVIEW · never enters the runtime registry</p> : null}</section>
        <section><h3>Operative</h3><label><span>Preset</span><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}><option value="weak">Generic weak</option><option value="average">Generic average</option><option value="strong">Generic strong</option><option value="character">Existing operative</option><option value="custom">Custom test operative</option>{descriptor?.activeOperatives?.length ? <option value="clone-active">Detached active operative</option> : null}</select></label>{preset === "character" ? <label><span>Character</span><select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{characterOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.qaOnly ? " · QA" : ""}</option>)}</select></label> : null}{preset === "clone-active" ? <label><span>Detached snapshot</span><select value={cloneSeatId} onChange={(event) => setCloneSeatId(event.target.value)}><option value="">Choose operative</option>{descriptor?.activeOperatives?.map((entry) => <option key={entry.seatId} value={entry.seatId}>{entry.playerName} · {entry.operativeName}</option>)}</select></label> : null}{preset === "custom" ? <label><span>All skill values</span><input type="number" min="0" max="12" value={skillValue} onChange={(event) => setSkillValue(Number(event.target.value))} /></label> : null}<div className="admin-sim-inline"><label><span>Wounds</span><input type="number" min="0" value={wounds} onChange={(event) => setWounds(Number(event.target.value))} /></label><label><span>Salvage</span><input type="number" min="0" value={salvage} onChange={(event) => setSalvage(Number(event.target.value))} /></label></div></section>
        <section><h3>Inventory Builder</h3><label><span>Canonical Equipment &amp; Artifacts</span><select value="" onChange={(event) => { if (event.target.value && !gearIds.includes(event.target.value)) setGearIds([...gearIds, event.target.value]); }}><option value="">Add Equipment…</option>{gearOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.tier === "artifact" ? " · Artifact" : ""}</option>)}</select></label><div className="admin-sim-tags">{gearIds.map((id) => <button type="button" key={id} onClick={() => setGearIds(gearIds.filter((entry) => entry !== id))}>{gearOptions.find((entry) => entry.id === id)?.name ?? id} ×</button>)}{gearIds.length === 0 ? <span>NO EQUIPMENT</span> : null}</div></section>
        <section><h3>Dice Control</h3><label><span>Mode</span><select value={diceMode} onChange={(event) => setDiceMode(event.target.value as typeof diceMode)}><option value="random">Random (reported seed)</option><option value="fixed">Fixed</option><option value="seeded">Seeded</option></select></label>{diceMode === "fixed" ? <><div className="admin-sim-inline"><label><span>Operative die 1</span><input type="number" min="1" max="6" value={operativeDice[0]} onChange={(event) => setOperativeDice([Number(event.target.value), operativeDice[1] ?? 3])} /></label><label><span>Die 2</span><input type="number" min="1" max="6" value={operativeDice[1]} onChange={(event) => setOperativeDice([operativeDice[0] ?? 3, Number(event.target.value)])} /></label></div>{card.encounterType === "enemy" || card.rawEffectData && card.cardType === "threat" ? <div className="admin-sim-inline"><label><span>Enemy die 1</span><input type="number" min="1" max="6" value={enemyDice[0]} onChange={(event) => setEnemyDice([Number(event.target.value), enemyDice[1] ?? 3])} /></label><label><span>Die 2</span><input type="number" min="1" max="6" value={enemyDice[1]} onChange={(event) => setEnemyDice([enemyDice[0] ?? 3, Number(event.target.value)])} /></label></div> : null}</> : <label><span>Seed</span><input value={seed} onChange={(event) => setSeed(event.target.value)} /></label>}</section>
        <section><h3>Outcome</h3><label><span>Resolution mode</span><select value={outcomeMode} onChange={(event) => setOutcomeMode(event.target.value as SimulationOutcomeMode)}><option value="calculated">Run calculated resolution</option><option value="success">Preview success branch</option><option value="failure">Preview failure branch</option></select></label>{card.cardType === "scar" ? <label className="admin-sim-check"><input type="checkbox" checked={activateScarAdaptation} onChange={(event) => setActivateScarAdaptation(event.target.checked)} /><span>Activate owner-controlled Adaptation in its canonical timing window</span></label> : null}{outcomeMode !== "calculated" ? <p className="admin-sim-forced">FORCED OUTCOME PREVIEW · totals are bypassed to inspect the selected effect branch.</p> : null}</section>
      </aside>
      <main className="admin-sim-stage">
        <section className="admin-sim-card"><HostImage src={card.artworkUrl} alt={card.name} fit="contain" aspectRatio="card" fallback="card" /><div><span>{card.cardType} · {testedSkill}</span><h2>{card.name}</h2><p>{card.rulesText ?? "Canonical card effects will resolve through the detached game server."}</p></div></section>
        {error ? <div className="admin-sim-error"><strong>SIMULATION REJECTED</strong><p>{error}</p></div> : null}
        {result ? <section className="admin-sim-battle"><header><span>{result.forcedOutcomePreview ? "FORCED OUTCOME PREVIEW" : "CANONICAL RESOLUTION"}</span><strong>{result.outcome}</strong></header><div className="admin-sim-totals"><article><span>OPERATIVE</span><strong>{result.dice.operative.join(" + ") || "—"}</strong><b>Total {result.dice.operativeTotal ?? "—"}</b></article><i>VERSUS</i><article><span>{result.dice.enemy.length ? "ENEMY" : "DIFFICULTY"}</span><strong>{result.dice.enemy.join(" + ") || result.dice.difficulty || "—"}</strong><b>Total {result.dice.enemyTotal ?? result.dice.difficulty ?? "—"}</b></article></div><div className="admin-sim-modifiers">{result.dice.modifiers.map((entry, index) => <span key={`${entry.label}-${index}`}>{entry.label} <b>{entry.value >= 0 ? "+" : ""}{entry.value}</b></span>)}</div><footer><span>Seed: <code>{result.seed}</code></span><button type="button" onClick={() => navigator.clipboard?.writeText(result.seed)}>Copy seed</button><button type="button" onClick={() => void run({ dice: { mode: "seeded", seed: result.seed } })}>Run same seed</button></footer></section> : <section className="admin-sim-empty"><strong>Configure the synthetic operative.</strong><p>The real resolver will run here without broadcasting to the active room.</p></section>}
        <div className="admin-sim-actions"><button type="button" className="is-primary" disabled={busy || !descriptor?.simulatable} onClick={() => void run()}>{busy ? "Resolving…" : "Resolve Simulation"}</button><button type="button" onClick={() => { setPreset("weak"); setGearIds([]); setWounds(0); setSalvage(0); }}>Minimum skill / empty inventory</button><button type="button" onClick={() => { setPreset("strong"); setGearIds(gearOptions.slice(0, 3).map((entry) => entry.id)); }}>Maximum practical / full gear</button></div>
        {result?.prompts.length ? <section className="admin-sim-prompts"><h3>Generated Prompt · Simulation Paused</h3>{result.prompts.map((prompt) => <div key={prompt.id}><strong>{prompt.prompt}</strong><code>{prompt.id}</code><div>{prompt.optionIds.map((optionId) => <button type="button" key={optionId} onClick={() => void continuePrompt(prompt, optionId)}>{optionId}</button>)}</div></div>)}</section> : null}
      </main>
      <aside className="admin-sim-results">
        <section><h2>State Results</h2><div className="admin-sim-diff-head"><strong>Field</strong><span>Before</span><span>After</span><b>Change</b></div>{result?.diff.map((entry) => <Field key={entry.field} label={entry.field} before={entry.before} after={entry.after} change={entry.change} />)}{result && result.diff.length === 0 ? <p>No game-state values changed.</p> : null}</section>
        <section><h3>Effect Execution</h3>{result?.effects.map((entry) => <details key={`${entry.order}-${entry.type}`} open={entry.status === "success"}><summary><b>{String(entry.order).padStart(2, "0")}</b><span>{entry.type}</span><em className={`is-${entry.status}`}>{entry.status}</em></summary><p>{entry.summary}</p><pre>{JSON.stringify(entry.input, null, 2)}</pre></details>)}{!result ? <p>Ordered effect trace appears after resolution.</p> : null}</section>
        {result ? <section className={result.warnings.length ? "admin-sim-warnings" : "admin-sim-consistent"}><h3>Rules Text Comparison</h3><p>{result.authoredText}</p><strong>{result.effectTextStatus}</strong>{result.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</section> : null}
        {result ? <section><h3>Event Log · Detached</h3>{result.eventLog.map((entry, index) => <code key={`${entry.type}-${index}`}>{String(index + 1).padStart(2, "0")} {entry.type}</code>)}</section> : null}
        {result ? <section className="admin-sim-isolation"><h3>Isolation Evidence</h3><code>LIVE {result.isolation.liveStateHashBefore === result.isolation.liveStateHashAfter ? "UNCHANGED" : "CHANGED"}</code><code>REGISTRY {result.isolation.registryHashBefore === result.isolation.registryHashAfter ? "UNCHANGED" : "CHANGED"}</code><code>GAMEPLAY LOG {result.isolation.gameplayLogLengthBefore} → {result.isolation.gameplayLogLengthAfter}</code><code>BROADCASTS CAPTURED {result.isolation.broadcastAttempts} · ESCAPED {result.isolation.escapedBroadcasts}</code><code>PERSISTENCE ATTEMPTS {result.isolation.persistenceAttempts} · ESCAPED {result.isolation.escapedPersistenceWrites}</code><code>TIMER ATTEMPTS {result.isolation.timerAttempts}</code><h4>Controlled Randomness</h4><code>CONSUMED {result.randomness.consumed.join(", ") || "NONE"}</code><code>UNUSED {result.randomness.unused.join(", ") || "NONE"}</code></section> : null}
        <section><h3>Run Multiple</h3><div className="admin-sim-batch-presets"><button type="button" onClick={() => setBatchRuns(10)}>10</button><button type="button" onClick={() => setBatchRuns(100)}>100</button><button type="button" onClick={() => setBatchRuns(1000)}>1,000</button></div><div className="admin-sim-inline"><input aria-label="Batch run count" type="number" min="1" max="1000" value={batchRuns} onChange={(event) => setBatchRuns(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))} /><button type="button" disabled={busy} onClick={() => void runBatch()}>Run batch</button>{batchJob && ["queued", "running"].includes(batchJob.status) ? <button type="button" onClick={() => void cancelAdminSimulationBatch(auth, batchJob.id).then((job) => setBatchJob({ id: job.jobId, status: job.status, completed: job.completedRuns }))}>Cancel</button> : null}</div>{batchJob ? <small>{batchJob.status.toUpperCase()} · {batchJob.completed}/{batchRuns}</small> : null}{batch ? <div className="admin-sim-batch"><strong>{batch.runs} SIMULATIONS</strong><span>Victory {(batch.victoryRate * 100).toFixed(1)}%</span><span>Defeat {(batch.defeatRate * 100).toFixed(1)}%</span><span>Avg Wounds {batch.averageWounds.toFixed(2)}</span><span>Avg Salvage {batch.averageSalvageChange.toFixed(2)}</span><span>Avg Margin {batch.averageBattleMargin.toFixed(2)}</span></div> : null}</section>
        <section><h3>Session History</h3>{history.slice(0, 6).map((entry, index) => <button type="button" className="admin-sim-history" key={`${entry.simulationId}:${index}`} onClick={() => setResult(entry)}><span>{entry.sourceLabel}</span><strong>{entry.outcome}</strong><small>{entry.seed}</small></button>)}<div className="admin-sim-export"><button type="button" disabled={!result} onClick={() => result && downloadJson(`${result.cardId}-simulation.json`, { ...result, exportedAt: new Date().toISOString() })}>Export report</button><button type="button" onClick={() => setHistory([])}>Clear</button></div></section>
      </aside>
    </div>
  </section>;
}
