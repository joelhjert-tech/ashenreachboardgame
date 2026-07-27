import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { adminLibraryCards, type AdminLibraryCard } from "./adminLibraryRegistry.js";
import AdminCardEditor from "./AdminCardEditor.js";
import { fetchAdminContentStatus, type AdminContentStatus } from "./adminContentApi.js";
import { HostImage } from "../HostImage.js";
import AdminSimulationLab, { isCardSimulatable } from "./AdminSimulationLab.js";

type LibrarySort = "name" | "cardType" | "difficulty" | "skill" | "source" | "warnings";
const INITIAL_ARCHIVE_WINDOW = 72;
const ARCHIVE_WINDOW_STEP = 72;
const FOLDER_PREVIEW_LIMIT = 8;

export interface AdminLibraryProps {
  onClose: () => void;
  initialCardId?: string | null;
  onOpenMapTile?: (tileId: string) => void;
  onSelectedCardChange?: (card: AdminLibraryCard | null) => void;
  roomCode?: string | null;
  hostToken?: string | null;
  embedded?: boolean;
  capabilities?: AdminContentStatus | null;
}

function displayType(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numericDifficulty(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function hasMissingArtwork(card: AdminLibraryCard): boolean {
  return card.metadataWarnings.includes("Missing artwork or runtime artwork registry entry.");
}

function CopyButton({ label, value }: { label: string; value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="admin-library-copy"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CardArtwork({ card, large = false }: { card: AdminLibraryCard; large?: boolean }): ReactElement {
  return <HostImage className={`admin-library-host-art${large ? " is-large" : ""}`} src={card.artworkUrl} alt={`Artwork for ${card.name}`} fit="contain" aspectRatio="card" fallback="card" loading="lazy" />;
}

function DifficultyMark({ card }: { card: AdminLibraryCard }): ReactElement {
  if (card.difficulty === undefined) return <span className="admin-library-not-set">Not set</span>;
  const value = numericDifficulty(card.difficulty);
  const max = Number.isFinite(value) ? Math.max(5, Math.min(10, card.difficultyScale ?? Math.ceil(value))) : 0;
  return (
    <span className="admin-library-difficulty" aria-label={`Difficulty ${card.difficulty}`}>
      <strong>{card.difficulty}</strong>
      {max > 0 ? <span aria-hidden="true">{Array.from({ length: max }, (_, index) => <i key={index} className={index < Math.ceil(value) ? "is-filled" : ""} />)}</span> : null}
    </span>
  );
}

export function buildAdminCodexContext(card: AdminLibraryCard): Record<string, unknown> {
  return {
    schemaVersion: 1,
    entity: {
      id: card.id,
      name: card.name,
      family: card.cardType,
      status: card.status,
      sourcePath: card.dataSourcePath,
      artworkPath: card.artworkPath ?? null
    },
    gameplay: {
      difficulty: card.difficulty ?? null,
      skills: card.skills,
      encounterType: card.encounterType ?? null,
      rulesText: card.rulesText ?? null,
      reward: card.reward ?? null,
      penalty: card.penalty ?? null,
      effects: card.effects
    },
    lifecycle: card.lifecycle ?? null,
    relationships: {
      mapTileIds: card.mapTileIds,
      relatedIds: card.relatedIds
    },
    audit: {
      warnings: card.metadataWarnings,
      tests: card.testFiles
    }
  };
}

function downloadJson(name: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Inspector({ card, onClear, onOpenMapTile, editorStatus, onEdit, onSimulate }: { card: AdminLibraryCard; onClear: () => void; onOpenMapTile?: (tileId: string) => void; editorStatus: AdminContentStatus | null; onEdit: () => void; onSimulate: () => void }): ReactElement {
  const codexContext = buildAdminCodexContext(card);
  return (
    <aside className="admin-library-inspector" aria-label={`Inspect ${card.name}`}>
      <header>
        <div><span>{displayType(card.cardType)} · {card.status}</span><h2>{card.name}</h2><code>{card.id}</code></div>
        <button type="button" onClick={onClear} aria-label="Close card inspector">×</button>
      </header>
      <div className="admin-library-inspector-scroll">
        <section className={`admin-library-edit-status is-${editorStatus?.mode ?? "view-only"}`}>
          <div><span>{editorStatus?.editingAllowed ? "DEVELOPMENT CONTENT EDITOR" : "VIEW ONLY"}</span><strong>{editorStatus?.editingAllowed ? "Edit enabled" : editorStatus?.mode === "active-session-locked" ? "Editing locked during active session" : "Repository editing disabled"}</strong></div>
          {editorStatus?.editingAllowed && card.editable ? <button type="button" onClick={onEdit}>Edit card</button> : null}
          {editorStatus?.editingAllowed && !card.editable ? <p>This source is inspected here but is not supported by the guarded JSON editor.</p> : null}
          {!editorStatus?.editingAllowed && editorStatus?.reason ? <p>{editorStatus.reason}</p> : null}
        </section>
        {isCardSimulatable(card) ? <section className="admin-library-simulation-action"><span>ISOLATED GAMEPLAY TESTER</span><strong>Battle &amp; Event Simulation</strong><p>Run this card through the canonical server resolver without touching the live room.</p><button type="button" disabled={!editorStatus?.simulationAllowed} onClick={onSimulate}>Open Simulation Lab</button>{!editorStatus?.simulationAllowed ? <small>Start the development content server to enable simulations.</small> : null}</section> : <section className="admin-library-simulation-empty"><strong>NO SIMULATABLE EFFECTS</strong><p>This card contains descriptive or passive data only.</p></section>}
        <div className="admin-library-inspector-art"><CardArtwork card={card} large /></div>
        {card.metadataWarnings.length > 0 ? (
          <section className="admin-library-warnings" aria-label="Metadata warnings"><h3>Audit Warnings</h3>{card.metadataWarnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</section>
        ) : null}
        <section className="admin-library-metadata">
          <h3>Gameplay Metadata</h3>
          <dl>
            <div><dt>Difficulty</dt><dd><DifficultyMark card={card} /></dd></div>
            {card.encounterType ? <div><dt>Encounter type</dt><dd>{displayType(card.encounterType)}</dd></div> : null}
            <div><dt>Required skills</dt><dd>{card.skills.length > 0 ? card.skills.map((skill, index) => <span key={`${skill.name}-${index}`}>{index > 0 ? <em>{skill.relationship === "or" ? "OR" : "AND"}</em> : null}{displayType(skill.name)} {skill.level ?? ""}</span>) : <span className="admin-library-not-set">Not set</span>}</dd></div>
            {card.reward ? <div><dt>Reward</dt><dd>{card.reward}</dd></div> : null}
            {card.penalty ? <div><dt>Penalty</dt><dd>{card.penalty}</dd></div> : null}
          </dl>
          {card.rulesText ? <div className="admin-library-rules"><h4>Rules</h4>{card.rulesText.split("\n\n").map((text) => <p key={text}>{text}</p>)}</div> : null}
          {card.effects.length > 0 ? <div className="admin-library-effects"><h4>Effects</h4>{card.effects.map((effect) => <div key={`${effect.label}-${effect.value}`}><span>{effect.label}</span><p>{effect.value}</p></div>)}</div> : null}
          {card.rawEffectData ? <details><summary>Raw Effect Data</summary><pre>{JSON.stringify(card.rawEffectData, null, 2)}</pre></details> : null}
        </section>
        <section className="admin-library-lore"><h3>Archive Lore</h3><p>{card.lore ?? "Not set"}</p></section>
        <section className="admin-library-lifecycle">
          <h3>Lifecycle and Coverage</h3>
          {card.lifecycle ? (
            <dl>
              {Object.entries(card.lifecycle).filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => (
                <div key={label}><dt>{displayType(label)}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          ) : <p>No current lifecycle record covers this entity. Treat it as audit-needed.</p>}
          {card.testFiles.length > 0 ? <div className="admin-library-tests"><h4>Focused tests</h4>{card.testFiles.map((file) => <code key={file}>{file}</code>)}</div> : null}
        </section>
        {card.mapTileIds.length > 0 ? <section className="admin-library-map-references"><h3>Map References</h3>{card.mapTileIds.map((tileId) => <button type="button" key={tileId} onClick={() => onOpenMapTile?.(tileId)}><span>Open in Map Inspector</span><strong>{tileId}</strong></button>)}</section> : null}
        {card.relatedIds.length > 0 ? <section className="admin-library-related"><h3>Related IDs</h3>{card.relatedIds.map((id) => <code key={id}>{id}</code>)}</section> : null}
        <section className="admin-library-codex">
          <h3>Codex Context</h3>
          <p>Exports canonical authoring context only. Room codes, credentials, players, and live private state are excluded.</p>
          <div>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(codexContext, null, 2))}>Copy Codex Context</button>
            <button type="button" onClick={() => downloadJson(`${card.id}-admin-context.json`, codexContext)}>Export JSON</button>
          </div>
        </section>
        <section className="admin-library-source">
          <h3>Source Location</h3>
          {[
            ["Card ID", card.id],
            ["Card Data", card.dataSourcePath],
            ["Data Folder", card.dataSourceFolder],
            ["Card Art", card.artworkPath ?? "Not set"],
            ["Art Folder", card.artworkFolder ?? "Not set"]
          ].map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code>{value !== "Not set" ? <CopyButton label={label} value={value} /> : null}</div>)}
        </section>
      </div>
    </aside>
  );
}

export default function AdminLibrary({ onClose, initialCardId, onOpenMapTile, onSelectedCardChange, roomCode, hostToken, embedded = false, capabilities = null }: AdminLibraryProps): ReactElement {
  const [libraryCards, setLibraryCards] = useState(adminLibraryCards);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [scarSourceFilter, setScarSourceFilter] = useState("all");
  const [warningFilter, setWarningFilter] = useState<"all" | "metadata" | "artwork">("all");
  const [sort, setSort] = useState<LibrarySort>("name");
  const [folderMode, setFolderMode] = useState(false);
  const [archiveWindow, setArchiveWindow] = useState(INITIAL_ARCHIVE_WINDOW);
  const [selectedId, setSelectedId] = useState<string | null>(adminLibraryCards[0]?.dataSourcePath ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorStatus, setEditorStatus] = useState<AdminContentStatus | null>(capabilities);
  const [simulation, setSimulation] = useState<{ card: AdminLibraryCard; draft?: Record<string, unknown> | null } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const filterRailRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!initialCardId) return;
    const card = libraryCards.find((entry) => entry.id === initialCardId);
    if (card) setSelectedId(card.dataSourcePath);
  }, [initialCardId, libraryCards]);

  useEffect(() => {
    if (capabilities) {
      setEditorStatus(capabilities);
      return;
    }
    if (!roomCode || !hostToken) { setEditorStatus(null); return; }
    let cancelled = false;
    fetchAdminContentStatus({ roomCode, hostToken })
      .then((status) => { if (!cancelled) setEditorStatus(status); })
      .catch(() => { if (!cancelled) setEditorStatus(null); });
    return () => { cancelled = true; };
  }, [capabilities, hostToken, roomCode]);

  const types = useMemo(() => [...new Set(libraryCards.map((card) => card.cardType))].sort(), [libraryCards]);
  const skills = useMemo(() => [...new Set(libraryCards.flatMap((card) => card.skills.map((skill) => skill.name)))].sort(), [libraryCards]);
  const folders = useMemo(() => [...new Set(libraryCards.map((card) => card.dataSourceFolder))].sort(), [libraryCards]);
  const scarSources = useMemo(() => [...new Set(libraryCards.flatMap((card) => card.scarSource ? [card.scarSource] : []))].sort(), [libraryCards]);
  const selected = libraryCards.find((card) => card.dataSourcePath === selectedId) ?? null;
  useEffect(() => {
    onSelectedCardChange?.(selected);
  }, [onSelectedCardChange, selected]);

  const filteredCards = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return libraryCards.filter((card) => {
      const haystack = [card.name, card.id, card.cardType, card.lore, card.dataSourceFolder, card.artworkFolder, ...card.skills.map((skill) => skill.name)].filter(Boolean).join(" ").toLocaleLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (typeFilter !== "all" && card.cardType !== typeFilter) return false;
      if (skillFilter !== "all" && !card.skills.some((skill) => skill.name === skillFilter)) return false;
      if (folderFilter !== "all" && card.dataSourceFolder !== folderFilter) return false;
      if (scarSourceFilter !== "all" && card.scarSource !== scarSourceFilter) return false;
      if (difficultyFilter === "missing" && card.difficulty !== undefined) return false;
      if (difficultyFilter !== "all" && difficultyFilter !== "missing" && String(card.difficulty) !== difficultyFilter) return false;
      if (warningFilter === "metadata" && card.metadataWarnings.length === 0) return false;
      if (warningFilter === "artwork" && !hasMissingArtwork(card)) return false;
      return true;
    }).sort((a, b) => {
      if (sort === "cardType") return a.cardType.localeCompare(b.cardType) || a.name.localeCompare(b.name);
      if (sort === "difficulty") return numericDifficulty(a.difficulty) - numericDifficulty(b.difficulty) || a.name.localeCompare(b.name);
      if (sort === "skill") return (a.skills[0]?.name ?? "~").localeCompare(b.skills[0]?.name ?? "~") || a.name.localeCompare(b.name);
      if (sort === "source") return a.dataSourceFolder.localeCompare(b.dataSourceFolder) || a.name.localeCompare(b.name);
      if (sort === "warnings") return b.metadataWarnings.length - a.metadataWarnings.length || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [difficultyFilter, folderFilter, libraryCards, scarSourceFilter, search, skillFilter, sort, typeFilter, warningFilter]);

  useEffect(() => {
    setArchiveWindow(INITIAL_ARCHIVE_WINDOW);
  }, [difficultyFilter, folderFilter, scarSourceFilter, search, skillFilter, sort, typeFilter, warningFilter]);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingId) {
        if (!editorDirty || window.confirm("UNSAVED CARD CHANGES\n\nDiscard changes and close the editor?")) { setEditingId(null); setEditorDirty(false); }
      } else if (selectedId) setSelectedId(null);
      else onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editingId, editorDirty, onClose, selectedId]);

  const clearFilters = () => {
    setSearch(""); setTypeFilter("all"); setDifficultyFilter("all"); setSkillFilter("all"); setFolderFilter("all"); setScarSourceFilter("all"); setWarningFilter("all");
    if (filterRailRef.current) filterRailRef.current.scrollTop = 0;
  };

  const handleGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.key.startsWith("Arrow")) return;
    const cards = gridRef.current
      ? Array.from(gridRef.current.querySelectorAll<HTMLButtonElement>("[data-library-card]"))
      : [];
    const current = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 3 : -3;
    cards[Math.max(0, Math.min(cards.length - 1, current + delta))]?.focus();
    event.preventDefault();
  };

  const typeCounts = new Map(types.map((type) => [type, libraryCards.filter((card) => card.cardType === type).length]));
  const selectCard = (sourcePath: string) => {
    if (editingId && editorDirty && !window.confirm("UNSAVED CARD CHANGES\n\nDiscard changes and inspect another card?")) return;
    setEditingId(null); setEditorDirty(false); setSelectedId(sourcePath);
  };
  const closeLibrary = () => {
    if (editingId && editorDirty && !window.confirm("UNSAVED CARD CHANGES\n\nDiscard changes and return to the command board?")) return;
    onClose();
  };
  const folderGroups: Array<[string, AdminLibraryCard[]]> = folderMode
    ? [...filteredCards.reduce((groups, card) => {
        const group = groups.get(card.dataSourceFolder) ?? [];
        group.push(card);
        groups.set(card.dataSourceFolder, group);
        return groups;
      }, new Map<string, AdminLibraryCard[]>()).entries()]
    : [["", filteredCards]];
  const renderedCardCount = folderMode
    ? folderGroups.reduce((count, [, cards]) => count + Math.min(cards.length, FOLDER_PREVIEW_LIMIT), 0)
    : Math.min(filteredCards.length, archiveWindow);

  if (simulation && roomCode && hostToken) {
    return <AdminSimulationLab card={simulation.card} auth={{ roomCode, hostToken }} draft={simulation.draft} onClose={() => setSimulation(null)} />;
  }

  return (
    <section className={`admin-library${embedded ? " is-embedded" : ""}`} aria-label="Admin card library">
      <header className="admin-library-header">
        <div><span>HOST ADMINISTRATION · {editorStatus?.editingAllowed ? "EDIT ENABLED" : "VIEW ONLY"}</span><h1>Card Library</h1></div>
        <label><span>Search archive</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, ID, lore, skill or folder" /></label>
        <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}><option value="name">Name</option><option value="cardType">Card type</option><option value="difficulty">Difficulty</option><option value="skill">Skill level</option><option value="source">Source folder</option><option value="warnings">Missing metadata first</option></select></label>
        <button type="button" className="admin-library-close" onClick={closeLibrary}>{embedded ? "Dashboard Overview" : "Return to Command Board"}</button>
      </header>
      <div className={`admin-library-layout${editingId ? " is-editing" : ""}`}>
        <nav ref={filterRailRef} className="admin-library-filters" aria-label="Library filters">
          <div className="admin-library-filter-title"><span>Archive Index</span><strong>{filteredCards.length} OF {libraryCards.length} CARDS</strong></div>
          <button type="button" className={typeFilter === "all" ? "is-active" : ""} onClick={() => setTypeFilter("all")}><span>All Cards</span><b>{libraryCards.length}</b></button>
          {types.map((type) => <button type="button" key={type} className={typeFilter === type ? "is-active" : ""} onClick={() => setTypeFilter(type)}><span>{displayType(type)}</span><b>{typeCounts.get(type)}</b></button>)}
          <hr />
          <label><span>Difficulty</span><select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">All values</option><option value="missing">Not set</option>{[...new Set(libraryCards.flatMap((card) => card.difficulty === undefined ? [] : [String(card.difficulty)]))].sort((a, b) => Number(a) - Number(b)).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Skill</span><select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="all">All skills</option>{skills.map((skill) => <option key={skill} value={skill}>{displayType(skill)}</option>)}</select></label>
          <label><span>Folder</span><select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}><option value="all">All folders</option>{folders.map((folder) => <option key={folder}>{folder}</option>)}</select></label>
          <label><span>Scar source</span><select value={scarSourceFilter} onChange={(event) => setScarSourceFilter(event.target.value)}><option value="all">All sources</option>{scarSources.map((source) => <option key={source} value={source}>{displayType(source)}</option>)}</select></label>
          <button type="button" className={warningFilter === "metadata" ? "is-active is-warning" : "is-warning"} onClick={() => setWarningFilter(warningFilter === "metadata" ? "all" : "metadata")}><span>Missing Metadata</span><b>{libraryCards.filter((card) => card.metadataWarnings.length > 0).length}</b></button>
          <button type="button" className={warningFilter === "artwork" ? "is-active is-warning" : "is-warning"} onClick={() => setWarningFilter(warningFilter === "artwork" ? "all" : "artwork")}><span>Missing Artwork</span><b>{libraryCards.filter(hasMissingArtwork).length}</b></button>
          <hr />
          <button type="button" className={folderMode ? "is-active" : ""} onClick={() => setFolderMode((current) => !current)}><span>Group by Folder</span><b>▤</b></button>
          <button type="button" onClick={clearFilters}><span>Clear Filters</span><b>×</b></button>
        </nav>
        <main className="admin-library-results" aria-label="Card results">
          <div className="admin-library-result-count"><strong>{filteredCards.length} OF {libraryCards.length} CARDS</strong><span>{folderMode ? "Grouped by canonical data folder" : "Canonical active content"}</span></div>
          <div className="admin-library-grid-scroll">
            {folderGroups.map(([folder, cards]) => {
              const renderedCards = cards.slice(0, folderMode ? FOLDER_PREVIEW_LIMIT : archiveWindow);
              return <section className="admin-library-folder-group" key={folder || "all"}>{folder ? <h2>{folder}<span>{cards.length}</span></h2> : null}<div className="admin-library-grid" ref={!folder ? gridRef : undefined} onKeyDown={handleGridKey}>{renderedCards.map((card) => <button type="button" data-library-card key={card.dataSourcePath} className={`admin-library-card${selectedId === card.dataSourcePath ? " is-selected" : ""}`} onClick={() => selectCard(card.dataSourcePath)}><div className="admin-library-card-art"><CardArtwork card={card} />{card.metadataWarnings.length > 0 ? <span className="admin-library-card-warning" aria-label={`${card.metadataWarnings.length} warnings`}>!</span> : null}</div><div><span>{displayType(card.cardType)}</span><strong>{card.name}</strong><small>{card.difficulty === undefined ? "Difficulty not set" : `Difficulty ${card.difficulty}`}</small><small>{card.skills.length > 0 ? card.skills.map((skill) => `${displayType(skill.name)} ${skill.level ?? ""}`).join(" / ") : "Skill not set"}</small></div></button>)}</div></section>;
            })}
            {!folderMode && renderedCardCount < filteredCards.length ? <button type="button" className="admin-library-load-more" onClick={() => setArchiveWindow((current) => Math.min(filteredCards.length, current + ARCHIVE_WINDOW_STEP))}>Load more cards <span>{renderedCardCount} / {filteredCards.length}</span></button> : null}
            {filteredCards.length === 0 ? <div className="admin-library-empty"><strong>No cards match this archive query.</strong><button type="button" onClick={clearFilters}>Clear filters</button></div> : null}
          </div>
        </main>
        {selected && editingId === selected.dataSourcePath && roomCode && hostToken ? <AdminCardEditor card={selected} auth={{ roomCode, hostToken }} onDirtyChange={setEditorDirty} onSimulateDraft={(draft) => setSimulation({ card: selected, draft })} onCancel={() => { setEditingId(null); setEditorDirty(false); }} onSaved={(source) => {
          const record = source.record;
          const name = String(record.title ?? record.name ?? record.enemyName ?? selected.name);
          const artworkUrl = source.artwork.path ? `/${source.artwork.path.replace(/^public\//, "")}?revision=${source.revision.slice(0, 12)}` : selected.artworkUrl;
          setLibraryCards((cards) => cards.map((card) => card.dataSourcePath === selected.dataSourcePath ? { ...card, name, artworkUrl, artworkPath: source.artwork.path ?? card.artworkPath } : card));
        }} /> : selected ? <Inspector card={selected} onClear={() => setSelectedId(null)} onOpenMapTile={onOpenMapTile} editorStatus={editorStatus} onEdit={() => setEditingId(selected.dataSourcePath)} onSimulate={() => setSimulation({ card: selected })} /> : <aside className="admin-library-inspector is-empty"><span>Archive Inspector</span><strong>Select a card</strong><p>Gameplay metadata, lore, audit warnings, and repository paths appear here.</p></aside>}
      </div>
    </section>
  );
}
