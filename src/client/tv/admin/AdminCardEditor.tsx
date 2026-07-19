import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import type { AdminLibraryCard } from "./adminLibraryRegistry.js";
import { HostImage } from "../HostImage.js";
import {
  fetchAdminCardSource,
  revertAdminCardSource,
  saveAdminCardSource,
  type AdminArtworkDraft,
  type AdminCardSource,
  type AdminContentAuth
} from "./adminContentApi.js";

const STATS = ["command", "grit", "signal", "guile", "forge"] as const;
const EFFECT_TYPES = [
  "take_wound", "heal_wound", "gain_trophy", "gain_salvage", "lose_salvage", "gain_scar",
  "gain_gear", "draw_artifact", "consume_artifact", "gain_follower", "gain_note", "advance_scenario",
  "advance_escalation", "gain_global_escalation_guarded", "return_threat_to_space",
  "next_non_battle_test_modifier", "next_normal_movement_roll_modifier", "equipment_suppression",
  "memory_tax_choice", "sequence"
] as const;
const EFFECT_FIELDS = ["reward", "defeatReward", "failEffect", "successEffect", "failureEffect", "woundOnLoss", "resolveEffect", "effect", "activeEffect", "passiveEffect"];
const TEXT_FIELDS = ["text", "flavor", "lore", "rulesText", "activeText", "resolutionSummary", "penalty", "relief", "upside", "trigger", "implementationNotes"];

interface ArtworkSelection extends AdminArtworkDraft {
  previewUrl: string;
  width: number;
  height: number;
  size: number;
}

interface AdminCardEditorProps {
  card: AdminLibraryCard;
  auth: AdminContentAuth;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (source: AdminCardSource) => void;
}

function titleField(record: Record<string, unknown>): "title" | "name" | "enemyName" {
  if (typeof record.title === "string") return "title";
  if (typeof record.name === "string") return "name";
  return "enemyName";
}

function safeFileName(cardId: string, mimeType: string): string {
  const extension = mimeType === "image/webp" ? "webp" : mimeType === "image/jpeg" ? "jpg" : "png";
  return `${cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.${extension}`;
}

function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseEffect(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function EffectEditor({ field, value, onChange }: { field: string; value: unknown; onChange: (value: unknown) => void }): ReactElement {
  const text = JSON.stringify(value, null, 2);
  const parsed = parseEffect(text);
  const currentType = typeof parsed?.type === "string" ? parsed.type : "";
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);
  const invalid = parseEffect(draft) === null;
  return (
    <fieldset className="admin-card-editor-effect">
      <legend>{formatLabel(field)}</legend>
      <label><span>Effect type</span><select value={currentType} onChange={(event) => {
        const next = { ...(parsed ?? {}), type: event.target.value };
        setDraft(JSON.stringify(next, null, 2));
        onChange(next);
      }}>{currentType && !EFFECT_TYPES.includes(currentType as typeof EFFECT_TYPES[number]) ? <option value={currentType}>{formatLabel(currentType)}</option> : null}{EFFECT_TYPES.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label>
      <label><span>Typed payload</span><textarea value={draft} aria-invalid={invalid} onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const object = parseEffect(next);
        if (object) onChange(object);
      }} /></label>
      {invalid ? <p className="admin-card-editor-error">Enter one valid JSON effect object.</p> : null}
    </fieldset>
  );
}

async function readArtwork(file: File, cardId: string): Promise<ArtworkSelection> {
  if (!new Set(["image/png", "image/webp", "image/jpeg"]).has(file.type)) throw new Error("Use a PNG, WEBP, or JPEG image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Artwork must be 8 MB or smaller.");
  const previewUrl = URL.createObjectURL(file);
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected artwork could not be decoded."));
    image.src = previewUrl;
  });
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The selected artwork could not be read."));
    reader.readAsDataURL(file);
  });
  return {
    dataBase64,
    fileName: safeFileName(cardId, file.type),
    mimeType: file.type as ArtworkSelection["mimeType"],
    previewUrl,
    width: dimensions.width,
    height: dimensions.height,
    size: file.size
  };
}

export default function AdminCardEditor({ card, auth, onCancel, onDirtyChange, onSaved }: AdminCardEditorProps): ReactElement {
  const [source, setSource] = useState<AdminCardSource | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [artwork, setArtwork] = useState<ArtworkSelection | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSource(null); setDraft(null); setError(null); setFieldErrors({}); setSaved(false);
    fetchAdminCardSource(auth, card.dataSourcePath).then((next) => {
      if (!cancelled) { setSource(next); setDraft(structuredClone(next.record)); }
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load card source"); });
    return () => { cancelled = true; };
  }, [auth.hostToken, auth.roomCode, card.dataSourcePath]);

  const dirty = useMemo(() => Boolean(source && draft && (JSON.stringify(source.record) !== JSON.stringify(draft) || artwork)), [artwork, draft, source]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (error && !draft) return <aside className="admin-card-editor"><header><div><span>DEVELOPMENT CONTENT EDITOR</span><h2>Card unavailable</h2></div><button type="button" onClick={onCancel}>Close</button></header><p className="admin-card-editor-error">{error}</p></aside>;
  if (!source || !draft) return <aside className="admin-card-editor is-loading">Loading canonical source…</aside>;

  const nameKey = titleField(draft);
  const update = (key: string, value: unknown) => { setSaved(false); setDraft((current) => current ? { ...current, [key]: value } : current); };
  const resetField = (key: string) => update(key, source.record[key]);
  const currentName = String(draft[nameKey] ?? card.name);
  const currentArtUrl = source.artwork.path ? `/${source.artwork.path.replace(/^public\//, "")}` : card.artworkUrl;
  const draftRatio = artwork ? artwork.width / artwork.height : null;
  const currentRatio = source.artwork.dimensions ? source.artwork.dimensions.width / source.artwork.dimensions.height : null;
  const ratioWarning = draftRatio && currentRatio && Math.abs(draftRatio - currentRatio) / currentRatio > 0.08;
  const changeFields = [...new Set([
    ...Object.keys(draft).filter((key) => JSON.stringify(draft[key]) !== JSON.stringify(source.record[key])),
    ...(artwork ? ["artwork"] : [])
  ])];

  const cancel = () => {
    if (!dirty || window.confirm("UNSAVED CARD CHANGES\n\nDiscard changes and close the editor?")) onCancel();
  };

  const save = async () => {
    setSaving(true); setError(null); setFieldErrors({});
    try {
      const next = await saveAdminCardSource(auth, {
        sourcePath: source.sourcePath,
        expectedRevision: source.revision,
        record: draft,
        artwork: artwork ? {
          dataBase64: artwork.dataBase64,
          fileName: artwork.fileName,
          mimeType: artwork.mimeType,
          replaceShared: artwork.replaceShared
        } : undefined
      });
      setSource(next); setDraft(structuredClone(next.record)); setArtwork(null); setPreviewing(false); setSaved(true); onSaved(next);
    } catch (reason) {
      const typed = reason as Error & { fieldErrors?: Record<string, string> };
      setError(typed.message); setFieldErrors(typed.fieldErrors ?? {});
    } finally { setSaving(false); }
  };

  return (
    <aside className="admin-card-editor" aria-label={`Edit ${card.name}`}>
      <header><div><span>DEVELOPMENT CONTENT EDITOR · {dirty ? "UNSAVED CHANGES" : saved ? "SAVED" : "EDIT ENABLED"}</span><h2>{currentName}</h2><code>{card.id}</code></div><button type="button" onClick={cancel}>Close</button></header>
      <div className="admin-card-editor-scroll">
        {saved ? <div className="admin-card-editor-success"><strong>Card saved</strong><span>Canonical JSON updated. Restart the server before starting a new session.</span></div> : null}
        {error ? <div className="admin-card-editor-errors"><strong>{error}</strong>{Object.entries(fieldErrors).map(([field, message]) => <p key={field}><b>{field}</b> {message}</p>)}</div> : null}
        <section className="admin-card-editor-preview" aria-label="Unsaved card preview"><span>UNSAVED PREVIEW</span><div><HostImage src={artwork?.previewUrl ?? currentArtUrl} alt="Unsaved artwork preview" fit="contain" aspectRatio="card" fallback="card" /><article><small>{formatLabel(card.cardType)}</small><h3>{currentName}</h3>{draft.difficulty !== undefined ? <b>Difficulty {String(draft.difficulty)}</b> : null}<p>{String(draft.rulesText ?? draft.text ?? draft.activeText ?? "")}</p><em>{String(draft.flavor ?? draft.lore ?? "")}</em></article></div></section>

        <section className="admin-card-editor-section"><h3>Artwork</h3><div className="admin-card-editor-art-grid"><figure><HostImage src={currentArtUrl} alt="Current saved artwork" fit="contain" aspectRatio="card" fallback="card" /><figcaption>CURRENT ARTWORK<br />{source.artwork.dimensions ? `${source.artwork.dimensions.width} × ${source.artwork.dimensions.height}` : "Dimensions unavailable"}</figcaption></figure><figure><HostImage src={artwork?.previewUrl} alt="Replacement artwork" fit="contain" aspectRatio="card" fallback="card" /><figcaption>REPLACEMENT PREVIEW<br />{artwork ? `${artwork.width} × ${artwork.height} · ${(artwork.size / 1024 / 1024).toFixed(2)} MB` : "PNG, WEBP or JPEG · 8 MB maximum"}</figcaption></figure></div><label className="admin-card-editor-file"><span>Replace artwork</span><input type="file" accept="image/png,image/webp,image/jpeg" onChange={async (event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]; if (!file) return;
          try { setArtwork(await readArtwork(file, card.id)); setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Artwork could not be read"); }
        }} /></label>{artwork ? <><label><span>Runtime filename</span><input value={artwork.fileName} onChange={(event) => setArtwork({ ...artwork, fileName: event.target.value })} /></label>{ratioWarning ? <p className="admin-card-editor-warning">The replacement aspect ratio differs from the current card. The real preview uses the same contain fit as the saved card.</p> : null}{source.artwork.sharedCount > 1 ? <div className="admin-card-editor-warning"><strong>Shared artwork warning</strong><p>This artwork is used by {source.artwork.sharedCount} cards. Saving as a new file is selected by default.</p><label><input type="checkbox" checked={artwork.replaceShared ?? false} onChange={(event) => setArtwork({ ...artwork, replaceShared: event.target.checked })} /> Replace the shared file for all cards</label></div> : null}</> : null}<code>{source.artwork.path ?? "No canonical artwork path"}</code></section>

        <section className="admin-card-editor-section"><h3>Identity</h3><div className="admin-card-editor-field"><span><label htmlFor="admin-card-display-name">Display name</label><button type="button" onClick={() => resetField(nameKey)}>Reset field</button></span><input id="admin-card-display-name" value={String(draft[nameKey] ?? "")} onChange={(event) => update(nameKey, event.target.value)} /></div><label><span>Stable card ID</span><input aria-label="Stable card ID" value={String(draft.id ?? "")} readOnly aria-describedby="admin-id-warning" /></label><p id="admin-id-warning">Read-only because changing it requires an atomic reference migration.</p><label><span>Card family</span><input aria-label="Card family" value={formatLabel(card.cardType)} readOnly /></label>{draft.cardType !== undefined ? <label><span>Subtype <button type="button" onClick={() => resetField("cardType")}>Reset field</button></span><select aria-label="Subtype" value={String(draft.cardType)} onChange={(event) => update("cardType", event.target.value)}><option value="enemy">Enemy</option><option value="hazard">Hazard</option></select></label> : null}</section>

        {(draft.difficulty !== undefined || draft.stat !== undefined || draft.testStat !== undefined || draft.skills !== undefined || draft.alternativeStats !== undefined) ? <section className="admin-card-editor-section"><h3>Difficulty and tests</h3>{draft.difficulty !== undefined ? <label><span>Difficulty <button type="button" onClick={() => resetField("difficulty")}>Reset field</button></span><div className="admin-card-editor-stepper"><button type="button" onClick={() => update("difficulty", Math.max(1, Number(draft.difficulty) - 1))}>−</button><input type="number" min="1" value={Number(draft.difficulty)} onChange={(event) => update("difficulty", Number(event.target.value))} /><button type="button" onClick={() => update("difficulty", Number(draft.difficulty) + 1)}>+</button></div></label> : null}{draft.stat !== undefined || draft.testStat !== undefined ? <label><span>Primary skill</span><select value={String(draft.stat ?? draft.testStat)} onChange={(event) => update(draft.stat !== undefined ? "stat" : "testStat", event.target.value)}>{STATS.map((stat) => <option key={stat} value={stat}>{formatLabel(stat)}</option>)}</select></label> : null}{["skills", "alternativeStats"].filter((key) => draft[key] !== undefined).map((key) => <label key={key}><span>{formatLabel(key)} · relationship-preserving</span><textarea value={JSON.stringify(draft[key], null, 2)} onChange={(event) => { try { update(key, JSON.parse(event.target.value)); } catch { /* keep last valid structured value */ } }} /></label>)}</section> : null}

        {EFFECT_FIELDS.some((field) => draft[field] !== undefined) ? <section className="admin-card-editor-section"><h3>Outcomes and effects</h3>{EFFECT_FIELDS.filter((field) => draft[field] !== undefined).map((field) => <EffectEditor key={field} field={field} value={draft[field]} onChange={(value) => update(field, value)} />)}<p>Only canonical typed effects are available. Retired Heat effects are rejected by both editor and server.</p></section> : null}

        <section className="admin-card-editor-section"><h3>Text</h3>{TEXT_FIELDS.filter((field) => draft[field] !== undefined).map((field) => <label key={field}><span>{formatLabel(field)} <small>{String(draft[field] ?? "").length} characters</small><button type="button" onClick={() => resetField(field)}>Reset field</button></span><textarea value={String(draft[field] ?? "")} onChange={(event) => update(field, event.target.value)} /></label>)}{["tags", "resourceTags"].filter((field) => Array.isArray(draft[field])).map((field) => <label key={field}><span>{formatLabel(field)}</span><input value={(draft[field] as unknown[]).join(", ")} onChange={(event) => update(field, event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></label>)}</section>

        <section className="admin-card-editor-section"><h3>Source</h3><code>{source.sourcePath}</code><code>{source.artwork.path ?? "No artwork file"}</code><details><summary>Advanced data · normalized read-only</summary><pre>{JSON.stringify(draft, null, 2)}</pre></details></section>

        {source.revisions.length > 0 ? <section className="admin-card-editor-section"><h3>Revision history</h3>{source.revisions.map((revision) => <div className="admin-card-editor-revision" key={revision.id}><span>{new Date(revision.createdAt).toLocaleString()}</span><strong>{revision.fieldsChanged.join(", ")}</strong><button type="button" onClick={async () => {
          if (!window.confirm("Revert this card to the selected previous version?")) return;
          try { const next = await revertAdminCardSource(auth, { sourcePath: source.sourcePath, expectedRevision: source.revision, revisionId: revision.id }); setSource(next); setDraft(structuredClone(next.record)); setArtwork(null); onSaved(next); } catch (reason) { setError(reason instanceof Error ? reason.message : "Revert failed"); }
        }}>Revert to previous version</button></div>)}</section> : null}

        {previewing ? <section className="admin-card-editor-changes"><h3>Pending changes</h3>{changeFields.map((field) => <div key={field}><strong>{formatLabel(field)}</strong><span>{field === "artwork" ? `${source.artwork.path ?? "Not set"} → ${artwork?.fileName}` : "Modified"}</span></div>)}<button type="button" onClick={() => void save()} disabled={saving || changeFields.length === 0}>{saving ? "Save in progress…" : "Confirm save"}</button><button type="button" onClick={() => setPreviewing(false)} disabled={saving}>Return to editing</button></section> : null}
      </div>
      <footer><button type="button" onClick={() => { setDraft(structuredClone(source.record)); setArtwork(null); setError(null); setFieldErrors({}); }}>Revert all</button><button type="button" onClick={() => setPreviewing(true)} disabled={!dirty}>Preview changes</button><button type="button" onClick={cancel}>Cancel</button></footer>
    </aside>
  );
}
