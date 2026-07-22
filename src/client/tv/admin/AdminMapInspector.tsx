import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from "react";
import {
  adminMapAudit,
  adminMapTiles,
  canonicalMovementRequirementNotes,
  checkAdminReachability,
  buildAdminMovementSimulation,
  type AdminMapConnection,
  type AdminMapContent,
  type AdminMapTile,
  type AdminMapView
} from "./adminMapRegistry.js";
import { HostImage } from "../HostImage.js";

export interface AdminMapInspectorProps {
  onClose: () => void;
  onOpenLibraryCard?: (cardId: string) => void;
  initialTileId?: string | null;
}

interface ImageMetadata {
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  fileSize?: number;
  format: string;
}

const defaultLayers = {
  artwork: true,
  names: true,
  ids: false,
  connections: true,
  oneWay: true,
  gates: true,
  bridges: true,
  ferries: true,
  hazards: true,
  challenges: true,
  encounters: false,
  services: true,
  movement: true,
  imageWarnings: true,
  contentWarnings: true
};

type LayerKey = keyof typeof defaultLayers;
type AuditFilter = "invalid" | "one-way" | "missing-art" | "duplicate-art" | "unreachable";

function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBytes(value?: number): string {
  if (value === undefined) return "Loading";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function aspectLabel(width: number, height: number): string {
  if (!width || !height) return "Not set";
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.015) return "1:1";
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9";
  return `${ratio.toFixed(2)}:1`;
}

function CopyButton({ label, value }: { label: string; value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="admin-map-copy" onClick={() => void navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1000); })} aria-label={`Copy ${label}`}>{copied ? "Copied" : "Copy"}</button>;
}

function ContentList({ title, entries, onOpen }: { title: string; entries: AdminMapContent[]; onOpen?: (id: string) => void }): ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <section className="admin-map-content-list">
      <h4>{title}<span>{entries.length}</span></h4>
      {entries.map((entry) => entry.libraryCardId ? (
        <button type="button" key={`${entry.kind}-${entry.id}`} onClick={() => onOpen?.(entry.libraryCardId!)}>
          <span>{titleCase(entry.kind)}</span>
          <strong>{entry.name}</strong>
          <small>{entry.difficulty !== undefined ? `Difficulty ${entry.difficulty}` : "Authored content"}{entry.skill ? ` · ${titleCase(entry.skill)}` : ""}</small>
        </button>
      ) : <div className="admin-map-content-record" key={`${entry.kind}-${entry.id}`}><span>{titleCase(entry.kind)}</span><strong>{entry.name}</strong><small>Board-authored function</small></div>)}
    </section>
  );
}

function connectionClass(connection: AdminMapConnection): string {
  return `admin-map-edge admin-map-edge--${connection.connectionType}${connection.isBidirectional ? "" : " is-one-way"}${connection.warnings.length ? " has-warning" : ""}`;
}

function TileInspector({ tile, connection, image, onSelectConnection, onOpenLibraryCard, onClose }: {
  tile: AdminMapTile;
  connection: AdminMapConnection | null;
  image?: ImageMetadata;
  onSelectConnection: (connection: AdminMapConnection) => void;
  onOpenLibraryCard?: (cardId: string) => void;
  onClose: () => void;
}): ReactElement {
  const [showArrivalSimulation, setShowArrivalSimulation] = useState(false);
  const sourceRatio = image ? image.naturalWidth / image.naturalHeight : null;
  const renderedRatio = image ? image.renderedWidth / image.renderedHeight : null;
  const cropped = Boolean(sourceRatio && renderedRatio && Math.abs(sourceRatio - renderedRatio) > 0.08);
  const scaling = image?.naturalWidth ? Math.max(image.renderedWidth / image.naturalWidth, image.renderedHeight / image.naturalHeight) * 100 : null;
  return (
    <aside className="admin-map-inspector" aria-label={`Inspect ${tile.name}`}>
      <header><div><span>{titleCase(tile.ring)} ring · {titleCase(tile.region)}</span><h2>{tile.name}</h2><code>{tile.id}</code></div><button type="button" onClick={onClose} aria-label="Close tile inspector">×</button></header>
      <div className="admin-map-inspector-scroll">
        {connection ? (
          <section className="admin-map-connection-detail" aria-label="Selected connection">
            <h3>Connection</h3>
            <dl>
              <div><dt>From</dt><dd>{connection.sourceTileId}</dd></div>
              <div><dt>To</dt><dd>{connection.targetTileId}</dd></div>
              <div><dt>Type</dt><dd>{titleCase(connection.connectionType)}</dd></div>
              <div><dt>Direction</dt><dd>{connection.isBidirectional ? "Two-way" : "One-way"}</dd></div>
              <div><dt>Status</dt><dd>{connection.blockedReason ?? "Canonical legal connection"}</dd></div>
            </dl>
            {connection.requirements.map((requirement) => <p key={requirement}>{requirement}</p>)}
            {connection.warnings.map((warning) => <p className="has-warning" key={warning}>⚠ {warning}</p>)}
          </section>
        ) : null}
        <section className="admin-map-art-preview">
          <HostImage src={tile.artworkUrl} alt={`Artwork for ${tile.name}`} fit="contain" aspectRatio="map-tile" fallback="map" />
        </section>
        {tile.metadataWarnings.length ? <section className="admin-map-warnings"><h3>Audit Warnings</h3>{tile.metadataWarnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</section> : null}
        <section className="admin-map-metadata">
          <h3>Tile Record</h3>
          <dl>
            <div><dt>Ring / region</dt><dd>{titleCase(tile.ring)} / {titleCase(tile.region)}</dd></div>
            <div><dt>Type</dt><dd>{titleCase(tile.tileType)}</dd></div>
            <div><dt>Layout index</dt><dd>{tile.index}</dd></div>
            <div><dt>Coordinates</dt><dd>{tile.position ? `${tile.position.x.toFixed(3)}, ${tile.position.y.toFixed(3)}` : "Not set"}</dd></div>
            <div><dt>Danger</dt><dd>{tile.danger}</dd></div>
          </dl>
        </section>
        <section className="admin-map-image-audit">
          <h3>Image Audit</h3>
          <dl>
            <div><dt>Source size</dt><dd>{image ? `${image.naturalWidth} × ${image.naturalHeight} px` : "Awaiting image"}</dd></div>
            <div><dt>Display size</dt><dd>{image ? `${Math.round(image.renderedWidth)} × ${Math.round(image.renderedHeight)} px` : "Awaiting board render"}</dd></div>
            <div><dt>Aspect ratio</dt><dd>{image ? aspectLabel(image.naturalWidth, image.naturalHeight) : "Not set"}</dd></div>
            <div><dt>Format</dt><dd>{image?.format ?? tile.artworkUrl?.split(".").at(-1)?.toUpperCase() ?? "Not set"}</dd></div>
            <div><dt>File size</dt><dd>{formatBytes(image?.fileSize)}</dd></div>
            <div><dt>Scaling</dt><dd>{scaling === null ? "Not set" : `${scaling.toFixed(2)}%`}</dd></div>
            <div><dt>CSS fit</dt><dd>{cropped ? "Cropped with object-fit: cover" : "Aspect preserved"}</dd></div>
          </dl>
          {scaling !== null && scaling > 100 ? <p className="has-warning">⚠ Image is upscaled on the board.</p> : null}
        </section>
        <section className="admin-map-connections-list">
          <h3>Connected Tiles <span>{tile.connections.length}</span></h3>
          {tile.connections.map((entry) => <button type="button" key={entry.id} onClick={() => onSelectConnection(entry)}><span>{titleCase(entry.connectionType)} · {entry.isBidirectional ? "Two-way" : "One-way"}</span><strong>{entry.targetTileId}</strong><small>{entry.blockedReason ?? "Legal connection"}</small></button>)}
        </section>
        <ContentList title="Hazards" entries={tile.hazards} onOpen={onOpenLibraryCard} />
        <ContentList title="Challenges" entries={tile.challenges} onOpen={onOpenLibraryCard} />
        <ContentList title="Enemies" entries={tile.encounters} onOpen={onOpenLibraryCard} />
        <ContentList title="Contracts" entries={tile.contracts} onOpen={onOpenLibraryCard} />
        <ContentList title="Artifacts" entries={tile.artifacts} onOpen={onOpenLibraryCard} />
        <ContentList title="Escalations" entries={tile.escalations} onOpen={onOpenLibraryCard} />
        <ContentList title="Services" entries={tile.services} />
        {tile.tileFunction ? (
          <section className="admin-map-tile-functions" aria-label="Executable tile functions">
            <h3>Executable Tile Functions</h3>
            {[...tile.tileFunction.arrival, ...tile.tileFunction.optionalActions, ...tile.tileFunction.persistentRules].map((rule) => (
              <article key={rule.id} className={rule.supported ? "" : "has-warning"}>
                <span>{rule.order} · {titleCase(rule.kind)}</span>
                <strong>{rule.label}</strong>
                <small>{rule.mandatory ? "Mandatory" : "Optional"} · {rule.repeatPolicy} · {rule.marker}</small>
                <p>{rule.detail}</p>
              </article>
            ))}
            <button type="button" className="admin-map-simulate-arrival" onClick={() => setShowArrivalSimulation((current) => !current)}>
              {showArrivalSimulation ? "CLOSE ARRIVAL SIMULATION" : "SIMULATE ARRIVAL"}
            </button>
            {showArrivalSimulation && tile.arrivalSimulation ? (
              <div className="admin-map-arrival-simulation" data-testid="admin-map-arrival-simulation">
                <strong>SIMULATION ONLY · DETACHED CANONICAL RULE STACK</strong>
                <dl>
                  <div><dt>Initial location</dt><dd>{tile.arrivalSimulation.initialState.location}</dd></div>
                  <div><dt>Generated rules</dt><dd>{tile.arrivalSimulation.generatedRuleStack.length}</dd></div>
                  <div><dt>Mandatory prompts</dt><dd>{tile.arrivalSimulation.prompts.length}</dd></div>
                  <div><dt>Final location</dt><dd>{tile.arrivalSimulation.finalState.location}</dd></div>
                </dl>
                <ol>{tile.arrivalSimulation.effectTrace.map((entry) => <li key={entry}>{entry}</li>)}</ol>
                {tile.arrivalSimulation.warnings.map((warning) => <p className="has-warning" key={warning}>{warning}</p>)}
              </div>
            ) : null}
          </section>
        ) : null}
        <section className="admin-map-rules"><h3>Tile Rules</h3>{tile.rules.length ? tile.rules.map((rule) => <p key={rule}>{rule}</p>) : <p>NO SPECIAL TILE RULES</p>}</section>
        <section className="admin-map-source"><h3>Source Location</h3>{[["Tile ID", tile.id], ["Tile Data", tile.dataSourcePath], ["Data Folder", tile.dataSourceFolder], ["Layout Data", tile.layoutSourcePath], ["Tile Art", tile.artworkPath ?? "Not set"], ["Art Folder", tile.artworkFolder ?? "Not set"]].map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code>{value !== "Not set" ? <CopyButton label={label} value={value} /> : null}</div>)}</section>
      </div>
    </aside>
  );
}

export default function AdminMapInspector({ onClose, onOpenLibraryCard, initialTileId }: AdminMapInspectorProps): ReactElement {
  const qaWarnings = import.meta.env.DEV && new URLSearchParams(window.location.search).get("mapAuditFixture") === "warnings";
  const tiles = useMemo(() => qaWarnings ? adminMapTiles.map((tile, index) => index === 0 ? { ...tile, artworkUrl: null, artworkPath: null, metadataWarnings: [...tile.metadataWarnings, "QA fixture: missing artwork.", "QA fixture: invalid destination qa-missing-sector."] } : tile) : adminMapTiles, [qaWarnings]);
  const [view, setView] = useState<AdminMapView>("artwork");
  const [layers, setLayers] = useState(defaultLayers);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(initialTileId && tiles.some((tile) => tile.id === initialTileId) ? initialTileId : tiles[0]?.id ?? null);
  const [selectedConnection, setSelectedConnection] = useState<AdminMapConnection | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [imageMetadata, setImageMetadata] = useState<Record<string, ImageMetadata>>({});
  const [movementStart, setMovementStart] = useState("ashwake-crossing");
  const [movementDistance, setMovementDistance] = useState(1);
  const [movementNotes, setMovementNotes] = useState<string[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [reachability, setReachability] = useState<string[] | null>(null);
  const [auditFilter, setAuditFilter] = useState<AuditFilter | null>(null);
  const tileButtonsRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);

  const selectedTile = tiles.find((tile) => tile.id === selectedTileId) ?? null;
  const movement = useMemo(() => buildAdminMovementSimulation(movementStart, movementDistance, movementNotes), [movementDistance, movementNotes, movementStart]);
  const selectedRoute = movement.plan?.routes.find((route) => route.routeId === selectedRouteId) ?? movement.plan?.routes[0] ?? null;
  const selectedRouteIds = new Set(view === "movement" ? selectedRoute?.route ?? [] : []);
  const connectedIds = new Set(selectedTile?.connections.map((connection) => connection.targetTileId) ?? []);
  const matches = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return [];
    return tiles.filter((tile) => [tile.name, tile.id, tile.region, tile.ring, tile.artworkPath, tile.artworkFolder, ...tile.hazards.map((entry) => entry.name), ...tile.challenges.map((entry) => entry.name), ...tile.encounters.map((entry) => entry.name)].filter(Boolean).join(" ").toLocaleLowerCase().includes(needle)).slice(0, 12);
  }, [search, tiles]);
  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>();
    return tiles.flatMap((tile) => tile.connections).filter((connection) => {
      const key = [connection.sourceTileId, connection.targetTileId].sort().join("--");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tiles]);
  const auditAffectedTileIds = useMemo(() => new Set(tiles.filter((tile) => {
    if (!auditFilter) return false;
    if (auditFilter === "invalid") return tile.connections.some((connection) => connection.connectionType === "invalid") || tile.metadataWarnings.some((warning) => /invalid destination/i.test(warning));
    if (auditFilter === "one-way") return tile.connections.some((connection) => !connection.isBidirectional);
    if (auditFilter === "missing-art") return !tile.artworkUrl;
    if (auditFilter === "duplicate-art") return tile.metadataWarnings.some((warning) => warning.startsWith("Duplicate artwork"));
    return adminMapAudit.structurallyUnreachableTileIds.includes(tile.id);
  }).map((tile) => tile.id)), [auditFilter, tiles]);

  useEffect(() => {
    if (!initialTileId || !tiles.some((tile) => tile.id === initialTileId)) return;
    setSelectedTileId(initialTileId);
  }, [initialTileId, tiles]);
  useEffect(() => { setSelectedRouteId(movement.plan?.routes[0]?.routeId ?? null); }, [movement.plan]);
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedConnection) setSelectedConnection(null);
      else if (selectedTileId) setSelectedTileId(null);
      else onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose, selectedConnection, selectedTileId]);

  const focusTile = (tileId: string) => {
    const tile = tiles.find((entry) => entry.id === tileId);
    setSelectedTileId(tileId);
    setSelectedConnection(null);
    if (tile?.position) {
      setZoom(1.65);
      setPan({ x: (0.5 - tile.position.x) * 430, y: (0.5 - tile.position.y) * 250 });
    }
  };
  const fitBoard = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const selectView = (mode: AdminMapView) => {
    setView(mode);
    fitBoard();
    if (controlsRef.current) controlsRef.current.scrollTop = 0;
    if (mode === "movement") {
      setSelectedTileId(movementStart);
      setSelectedConnection(null);
    }
  };
  const handleTileKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.key.startsWith("Arrow")) return;
    const buttons = Array.from(tileButtonsRef.current?.querySelectorAll<HTMLButtonElement>("[data-map-tile]") ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 6 : -6;
    buttons[Math.max(0, Math.min(buttons.length - 1, current + delta))]?.focus();
    event.preventDefault();
  };
  const recordImage = (tile: AdminMapTile, image: HTMLImageElement) => {
    const rect = image.getBoundingClientRect();
    const format = tile.artworkUrl?.split(".").at(-1)?.toUpperCase() ?? "Unknown";
    setImageMetadata((current) => ({ ...current, [tile.id]: { ...current[tile.id], naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, renderedWidth: rect.width, renderedHeight: rect.height, format } }));
    if (tile.artworkUrl && imageMetadata[tile.id]?.fileSize === undefined && typeof fetch === "function") {
      void fetch(tile.artworkUrl).then((response) => response.blob()).then((blob) => setImageMetadata((current) => current[tile.id] ? ({ ...current, [tile.id]: { ...current[tile.id]!, fileSize: blob.size } }) : current)).catch(() => undefined);
    }
  };

  return (
    <section className={`admin-map admin-map--${view}`} aria-label="Admin map inspector">
      <header className="admin-map-header">
        <div><span>HOST ADMINISTRATION · READ ONLY</span><h1>Map Inspector</h1></div>
        <label><span>Search map archive</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tile, ID, content or artwork" /></label>
        <div className="admin-map-header-tools"><button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))}>− Zoom</button><strong>{Math.round(zoom * 100)}%</strong><button type="button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))}>+ Zoom</button><button type="button" onClick={fitBoard}>Fit Board</button></div>
        <button type="button" className="admin-map-close" onClick={onClose}>Return to Command Board</button>
        {matches.length ? <div className="admin-map-search-results" role="listbox" aria-label="Map search results">{matches.map((tile) => <button type="button" key={tile.id} onClick={() => { focusTile(tile.id); setSearch(""); }}><strong>{tile.name}</strong><code>{tile.id}</code></button>)}</div> : null}
      </header>
      <div className="admin-map-layout">
        <nav ref={controlsRef} className="admin-map-controls" aria-label="Map inspector controls">
          <div className="admin-map-audit-summary"><span>Map Audit</span><strong>{adminMapAudit.tileCount} TILES · {adminMapAudit.connectionCount} ROUTES</strong><div className="admin-map-audit-filters">{([['invalid', 'Invalid connections', adminMapAudit.invalidConnectionCount + (qaWarnings ? 1 : 0)], ['one-way', 'One-way', adminMapAudit.oneWayConnectionCount], ['missing-art', 'Missing art', adminMapAudit.missingArtworkCount + (qaWarnings ? 1 : 0)], ['duplicate-art', 'Duplicate art tiles', adminMapAudit.duplicateArtworkTileCount], ['unreachable', 'Unreachable', adminMapAudit.structurallyUnreachableTileIds.length]] as const).map(([filter, label, count]) => <button type="button" key={filter} className={auditFilter === filter ? "is-active" : ""} onClick={() => setAuditFilter((current) => current === filter ? null : filter)}><span>{label}</span><strong>{count}</strong></button>)}</div>{qaWarnings ? <small>QA AUDIT FIXTURE</small> : null}</div>
          <fieldset><legend>Map View</legend>{(["artwork", "connections", "content", "images", "movement"] as AdminMapView[]).map((mode) => <button type="button" key={mode} className={view === mode ? "is-active" : ""} onClick={() => selectView(mode)}>{titleCase(mode === "images" ? "image audit" : mode === "movement" ? "movement test" : `${mode} view`)}</button>)}</fieldset>
          <fieldset className="admin-map-layer-list"><legend>Display Layers</legend>{(Object.keys(defaultLayers) as LayerKey[]).map((key) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={() => setLayers((current) => ({ ...current, [key]: !current[key] }))} /><span>{titleCase(key)}</span></label>)}</fieldset>
          {view === "movement" ? <section className="admin-map-movement-controls" aria-label="Movement simulation controls"><strong>SIMULATION ONLY · GAME STATE UNCHANGED</strong><label><span>Starting tile</span><select value={movementStart} onChange={(event) => { setMovementStart(event.target.value); setSelectedTileId(event.target.value); setSelectedConnection(null); }}>{tiles.map((tile) => <option key={tile.id} value={tile.id}>{tile.name}</option>)}</select></label><label><span>Movement distance</span><input type="number" min="1" max="12" value={movementDistance} onChange={(event) => setMovementDistance(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} /></label>{canonicalMovementRequirementNotes.map((note) => <label className="admin-map-note-toggle" key={note}><input type="checkbox" checked={movementNotes.includes(note)} onChange={() => setMovementNotes((current) => current.includes(note) ? current.filter((entry) => entry !== note) : [...current, note])} /><span>{titleCase(note)}</span></label>)}<button type="button" onClick={() => setReachability(checkAdminReachability(movementStart, movementNotes))}>Check Board Reachability</button>{reachability ? <p>{reachability.length === 0 ? "Every tile is reachable with this permission profile." : `${reachability.length} tiles are blocked or unreachable with this profile.`}</p> : null}</section> : null}
        </nav>
        <main className="admin-map-stage" aria-label="Interactive canonical board">
          <div className="admin-map-stage-toolbar"><span>{titleCase(view)} mode</span><strong>{selectedTile?.name ?? "No tile selected"}</strong>{view === "movement" ? <em>{movement.plan?.routes.length ?? 0} legal routes · {movement.plan?.blockedRoutes.length ?? 0} blocked</em> : <em>Drag to pan · use zoom controls to inspect</em>}</div>
          <div className="admin-map-viewport" onPointerDown={(event: PointerEvent<HTMLDivElement>) => { if ((event.target as HTMLElement).closest("button")) return; setDragOrigin({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!dragOrigin) return; setPan({ x: dragOrigin.panX + event.clientX - dragOrigin.x, y: dragOrigin.panY + event.clientY - dragOrigin.y }); }} onPointerUp={() => setDragOrigin(null)}>
            <div className="admin-map-board" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} ref={tileButtonsRef} onKeyDown={handleTileKeyboard}>
              {layers.connections ? <svg className="admin-map-edges" viewBox="0 0 1000 562.5" aria-label="Canonical movement connections"><defs><marker id="admin-map-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" /></marker></defs>{uniqueEdges.map((connection) => { const from = tiles.find((tile) => tile.id === connection.sourceTileId)?.position?.routeAnchor; const to = tiles.find((tile) => tile.id === connection.targetTileId)?.position?.routeAnchor; if (!from || !to) return null; const hiddenByType = (connection.connectionType === "gate" && !layers.gates) || (connection.connectionType === "bridge" && !layers.bridges) || (connection.connectionType === "ferry" && !layers.ferries) || (!connection.isBidirectional && !layers.oneWay); if (hiddenByType) return null; const active = connection.sourceTileId === selectedTileId || connection.targetTileId === selectedTileId; return <g key={connection.id} className={active ? "is-active" : ""}><line className={connectionClass(connection)} x1={from.x * 1000} y1={from.y * 562.5} x2={to.x * 1000} y2={to.y * 562.5} markerEnd={!connection.isBidirectional ? "url(#admin-map-arrow)" : undefined} /><line className="admin-map-edge-hit" x1={from.x * 1000} y1={from.y * 562.5} x2={to.x * 1000} y2={to.y * 562.5} onClick={() => { setSelectedConnection(connection); setSelectedTileId(connection.sourceTileId); }} /></g>; })}{view === "movement" && layers.movement && selectedRoute ? selectedRoute.route.slice(0, -1).map((fromId, index) => { const toId = selectedRoute.route[index + 1]!; const from = tiles.find((tile) => tile.id === fromId)?.position?.routeAnchor; const to = tiles.find((tile) => tile.id === toId)?.position?.routeAnchor; return from && to ? <line key={`${fromId}-${toId}`} className="admin-map-edge admin-map-edge--route" x1={from.x * 1000} y1={from.y * 562.5} x2={to.x * 1000} y2={to.y * 562.5} markerEnd="url(#admin-map-arrow)" /> : null; }) : null}</svg> : null}
              <div className="admin-map-tiles">{tiles.map((tile) => { const position = tile.position; if (!position) return null; const selected = tile.id === selectedTileId; const related = connectedIds.has(tile.id); const onRoute = selectedRouteIds.has(tile.id); const auditMatch = auditAffectedTileIds.has(tile.id); const dimmed = auditFilter ? !auditMatch : Boolean(selectedTileId && !selected && !related && !onRoute); const meta = imageMetadata[tile.id]; const imageWarning = meta ? Math.max(meta.renderedWidth / meta.naturalWidth, meta.renderedHeight / meta.naturalHeight) > 1 : false; return <button type="button" data-map-tile data-tile-id={tile.id} key={tile.id} className={`admin-map-tile${selected ? " is-selected" : ""}${related ? " is-connected" : ""}${onRoute ? " is-route" : ""}${auditMatch ? " is-audit-match" : ""}${dimmed ? " is-dimmed" : ""}`} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, width: `${position.width * 100}%`, height: `${position.height * 100}%`, zIndex: position.zIndex }} onClick={() => { setSelectedTileId(tile.id); setSelectedConnection(null); }} aria-label={`${tile.name}, ${tile.ring} ring, ${tile.connections.length} connections`}>
                {layers.artwork && tile.artworkUrl ? <HostImage className="admin-map-tile-surface" src={tile.artworkUrl} alt="" fit="cover" aspectRatio="map-tile" fallback="map" onLoad={(event) => recordImage(tile, event.currentTarget)} /> : <span className="admin-map-tile-surface">{tile.ring}</span>}
                {(layers.names || layers.ids) ? <span className="admin-map-tile-label">{layers.names ? <strong>{tile.name}</strong> : null}{layers.ids ? <code>{tile.id}</code> : null}</span> : null}
                {view === "content" ? <span className="admin-map-tile-markers">{layers.hazards && tile.hazards.length ? <b>H{tile.hazards.length}</b> : null}{layers.challenges && tile.challenges.length ? <b>C{tile.challenges.length}</b> : null}{layers.encounters && tile.encounters.length ? <b>E{tile.encounters.length}</b> : null}{layers.services && tile.services.length ? <b>S{tile.services.length}</b> : null}</span> : null}
                {view === "images" ? <span className="admin-map-dimension-label"><strong>{meta ? `${meta.naturalWidth}×${meta.naturalHeight}` : "Loading"}</strong><small>{meta ? `${aspectLabel(meta.naturalWidth, meta.naturalHeight)} · ${meta.format}` : tile.artworkPath ?? "Missing art"}</small></span> : null}
                {(tile.metadataWarnings.length || imageWarning) && (layers.imageWarnings || layers.contentWarnings) ? <span className="admin-map-tile-warning" aria-label="Tile has audit warnings">!</span> : null}
                {onRoute && selectedRoute ? <span className="admin-map-route-step">{selectedRoute.route.indexOf(tile.id) + 1}</span> : null}
              </button>; })}</div>
            </div>
          </div>
          {view === "movement" ? <section className="admin-map-route-results" aria-label="Movement simulation results"><div><span>Start</span><strong>{movementStart}</strong></div><div><span>Movement</span><strong>{movementDistance}</strong></div><div><span>Legal destinations</span><strong>{new Set(movement.plan?.routes.map((route) => route.sectorId)).size}</strong></div><div><span>Blocked</span><strong>{movement.plan?.blockedRoutes.length ?? 0}</strong></div><div className="admin-map-route-options">{movement.plan?.routes.map((route) => <button type="button" key={route.routeId} className={selectedRoute?.routeId === route.routeId ? "is-active" : ""} onClick={() => setSelectedRouteId(route.routeId)}><strong>{route.sectorId}</strong><small>{route.route.join(" → ")}</small></button>)}</div>{movement.plan?.blockedRoutes.map((route) => <p key={route.routeId}><strong>{route.sectorId}</strong> · {route.disabledReason}</p>)}</section> : null}
        </main>
        {selectedTile ? <TileInspector tile={selectedTile} connection={selectedConnection} image={imageMetadata[selectedTile.id]} onSelectConnection={setSelectedConnection} onOpenLibraryCard={onOpenLibraryCard} onClose={() => { setSelectedConnection(null); setSelectedTileId(null); }} /> : <aside className="admin-map-inspector is-empty"><strong>Select a tile</strong><p>Topology, content, image metadata, and source paths appear here.</p></aside>}
      </div>
    </section>
  );
}
