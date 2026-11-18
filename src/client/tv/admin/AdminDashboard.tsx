import { ArchiveIcon } from "@phosphor-icons/react/dist/csr/Archive";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/csr/BookOpenText";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { FlaskIcon } from "@phosphor-icons/react/dist/csr/Flask";
import { GaugeIcon } from "@phosphor-icons/react/dist/csr/Gauge";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { ShieldWarningIcon } from "@phosphor-icons/react/dist/csr/ShieldWarning";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactElement } from "react";
import { buildAdminCodexContext, isCardSimulatable } from "./adminCardHelpers.js";
import {
  fetchAdminContentStatus,
  fetchAdminReports,
  type AdminContentStatus,
  type AdminReportSummary
} from "./adminContentApi.js";
import { adminLibraryCards, type AdminLibraryCard } from "./adminLibraryRegistry.js";
import { adminMapAudit } from "./adminMapRegistry.js";

const AdminLibrary = lazy(() => import("./AdminLibrary.js"));
const AdminLoreBible = lazy(() => import("./AdminLoreBible.js"));
const AdminMapInspector = lazy(() => import("./AdminMapInspector.js"));

export type AdminDashboardTab = "overview" | "lore" | "library" | "map" | "test" | "reports";

export interface AdminDashboardProps {
  roomCode: string;
  hostToken: string;
  initialTab?: AdminDashboardTab;
  initialCardId?: string | null;
  initialTileId?: string | null;
  onClose: () => void;
}

const tabDefinitions = [
  { id: "overview", label: "Overview", icon: GaugeIcon },
  { id: "lore", label: "Lore Bible", icon: BookOpenTextIcon },
  { id: "library", label: "Content Archive", icon: ArchiveIcon },
  { id: "map", label: "Map Inspector", icon: MapTrifoldIcon },
  { id: "test", label: "Test Lab", icon: FlaskIcon },
  { id: "reports", label: "Reports & Codex", icon: ClipboardTextIcon }
] as const;

const testCommands = [
  { label: "Content validation", command: "npm.cmd run validate:content" },
  { label: "Typecheck", command: "npm.cmd run typecheck" },
  { label: "Admin client tests", command: "npx.cmd vitest run src/client/tv/admin src/client/tv/__tests__/TvApp.test.tsx" },
  { label: "Server admin tests", command: "npx.cmd vitest run src/server/__tests__/adminContentApi.integration.test.ts" },
  { label: "Production build", command: "npm.cmd run build" },
  { label: "Asset audit", command: "npm.cmd run audit:assets" }
] as const;

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downloadJson(name: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCodexMarkdown(card: AdminLibraryCard): string {
  const lifecycle = card.lifecycle;
  return [
    `# Codex Context: ${card.name}`,
    "",
    "> Canonical authored content only. No room, token, player, or live private state is included.",
    "",
    `- ID: \`${card.id}\``,
    `- Family: ${card.cardType}`,
    `- Status: ${card.status}`,
    `- Source: \`${card.dataSourcePath}\``,
    `- Artwork: ${card.artworkPath ? `\`${card.artworkPath}\`` : "No canonical artwork path"}`,
    `- Trigger / acquisition: ${lifecycle?.acquisitionOrTrigger ?? "Audit needed"}`,
    `- Outcome: ${lifecycle?.outcome ?? "Audit needed"}`,
    `- Cleanup: ${lifecycle?.cleanup ?? "Audit needed"}`,
    `- Repeatability / persistence: ${lifecycle?.repeatability ?? "Audit needed"}`,
    `- Visibility: ${lifecycle?.visibility ?? "Audit needed"}`,
    `- Reconnect: ${lifecycle?.reconnect ?? "Audit needed"}`,
    "",
    "## Relationships",
    ...(card.relatedIds.length > 0 ? card.relatedIds.map((value) => `- \`${value}\``) : ["- None recorded"]),
    "",
    "## Warnings",
    ...(card.metadataWarnings.length > 0 ? card.metadataWarnings.map((value) => `- ${value}`) : ["- None"]),
    "",
    "## Focused tests",
    ...(card.testFiles.length > 0 ? card.testFiles.map((value) => `- \`${value}\``) : ["- No focused test recorded"])
  ].join("\n");
}

function downloadText(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CopyCommand({ label, command }: { label: string; command: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="admin-dashboard__command"
      onClick={() => {
        void navigator.clipboard?.writeText(command).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      <span>{label}</span>
      <code>{command}</code>
      <b>{copied ? "Copied" : "Copy"}</b>
    </button>
  );
}

function Overview({
  capabilities,
  reports,
  selectedCard,
  phoneManifest,
  onOpen
}: {
  capabilities: AdminContentStatus | null;
  reports: AdminReportSummary[];
  selectedCard: AdminLibraryCard | null;
  phoneManifest: { sources: number; reductionPercent: number } | null;
  onOpen: (tab: AdminDashboardTab) => void;
}): ReactElement {
  const familyCounts = [...new Set(adminLibraryCards.map((card) => card.cardType))]
    .map((family) => ({ family, count: adminLibraryCards.filter((card) => card.cardType === family).length }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
  const missingArt = adminLibraryCards.filter((card) => card.metadataWarnings.some((warning) => /missing artwork/i.test(warning))).length;
  const fallbackArt = adminLibraryCards.filter((card) => /fallback/i.test(card.artworkPath ?? "")).length;
  const auditNeeded = adminLibraryCards.filter((card) => card.status === "audit-needed").length;
  const invalid = adminLibraryCards.filter((card) => card.status === "invalid").length;
  const unreachable = adminLibraryCards.filter((card) => card.status === "unreachable").length;
  const duplicateIds = new Set(
    adminLibraryCards
      .filter((card) => card.metadataWarnings.some((warning) => /duplicate card id/i.test(warning)))
      .map((card) => card.id)
  ).size;
  const warningCount = adminLibraryCards.filter((card) => card.metadataWarnings.length > 0).length;
  const statusCounts = [...new Set(adminLibraryCards.map((card) => card.status))]
    .map((status) => ({ status, count: adminLibraryCards.filter((card) => card.status === status).length }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const lifecycleReport = reports.find((report) => report.id === "card-lifecycle");
  const lifecycleStale = Boolean(lifecycleReport?.recordCount && lifecycleReport.recordCount !== adminLibraryCards.length);

  return (
    <div className="admin-dashboard__overview">
      <section className="admin-dashboard__hero">
        <div>
          <span>AUTHORING RELAY · LOBBY ISOLATED</span>
          <h2>{adminLibraryCards.length} records under inspection</h2>
          <p>Canonical content, presentation assets, topology, and detached resolver evidence in one host-only workspace.</p>
        </div>
        <div className="admin-dashboard__pulse" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>

      <section className="admin-dashboard__health" aria-label="Development health">
        <article><span>Content records</span><strong>{adminLibraryCards.length}</strong><small>{familyCounts.length} families</small></article>
        <article className={auditNeeded ? "has-warning" : ""}><span>Audit needed</span><strong>{auditNeeded}</strong><small>{lifecycleStale ? "Lifecycle report is stale" : "Lifecycle report aligned"}</small></article>
        <article className={missingArt ? "has-warning" : ""}><span>Art health</span><strong>{missingArt}</strong><small>{fallbackArt} fallback / {warningCount} warned</small></article>
        <article className={adminMapAudit.invalidConnectionCount ? "has-warning" : ""}><span>Map topology</span><strong>{adminMapAudit.tileCount}</strong><small>{adminMapAudit.connectionCount} routes · {adminMapAudit.invalidConnectionCount} invalid</small></article>
        <article><span>Phone derivatives</span><strong>{phoneManifest?.sources ?? "—"}</strong><small>{phoneManifest ? `${phoneManifest.reductionPercent}% reduction · audit checks staleness` : "Manifest unavailable"}</small></article>
        <article className={capabilities?.simulationAllowed ? "" : "has-warning"}><span>Detached resolver</span><strong>{capabilities?.simulationAllowed ? "Ready" : "Locked"}</strong><small>{capabilities?.editingAllowed ? "Repository editing enabled" : "View and simulation only"}</small></article>
        <article className={duplicateIds || invalid ? "has-warning" : ""}><span>Integrity</span><strong>{duplicateIds}</strong><small>{invalid} invalid / {unreachable} unreachable</small></article>
      </section>

      <div className="admin-dashboard__overview-grid">
        <section className="admin-dashboard__family-index">
          <header><span>Canonical index</span><button type="button" onClick={() => onOpen("library")}>Open archive</button></header>
          <div>{familyCounts.map(({ family, count }) => <p key={family}><span>{titleCase(family)}</span><strong>{count}</strong></p>)}</div>
        </section>
        <section className="admin-dashboard__status-board">
          <header><span>Lifecycle status</span></header>
          {statusCounts.map(({ status, count }) => <p key={status}><b className={status === "active" ? "is-ready" : status === "invalid" || status === "unreachable" ? "is-locked" : "is-idle"} /><span>{titleCase(status)}</span><strong>{count}</strong></p>)}
        </section>
        <section className="admin-dashboard__status-board">
          <header><span>Capability interlocks</span></header>
          <p><b className={capabilities?.dashboardAllowed ? "is-ready" : "is-locked"} />Dashboard <strong>{capabilities?.dashboardAllowed ? "Pre-player authorized" : "Locked"}</strong></p>
          <p><b className={capabilities?.simulationAllowed ? "is-ready" : "is-locked"} />Simulation <strong>{capabilities?.simulationAllowed ? "Isolated resolver ready" : "Unavailable"}</strong></p>
          <p><b className={capabilities?.qaFixturesAllowed ? "is-ready" : "is-idle"} />QA fixtures <strong>{capabilities?.qaFixturesAllowed ? "Enabled" : "Development flag off"}</strong></p>
          <p><b className={capabilities?.editingAllowed ? "is-ready" : "is-idle"} />Content editor <strong>{capabilities?.editingAllowed ? "Writes enabled" : "Guarded off"}</strong></p>
          {capabilities?.reason ? <small>{capabilities.reason}</small> : null}
        </section>
        <section className="admin-dashboard__selection">
          <header><span>Focused Codex context</span><button type="button" onClick={() => onOpen("reports")}>Open tools</button></header>
          {selectedCard ? <>
            <strong>{selectedCard.name}</strong>
            <code>{selectedCard.id}</code>
            <p>{titleCase(selectedCard.cardType)} · {titleCase(selectedCard.status)}</p>
          </> : <p>Select a record in the archive to prepare a sanitized development bundle.</p>}
        </section>
      </div>
    </div>
  );
}

function TestLab({
  capabilities,
  onSelectCard
}: {
  capabilities: AdminContentStatus | null;
  onSelectCard: (cardId: string) => void;
}): ReactElement {
  const [search, setSearch] = useState("");
  const simulatable = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return adminLibraryCards
      .filter(isCardSimulatable)
      .filter((card) => !needle || `${card.name} ${card.id} ${card.cardType}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [search]);
  const fixtures = [
    { label: "Cartography route", query: "cartographyFixture=route" },
    { label: "Dense six-player map", query: "cartographyFixture=dense" },
    { label: "Battle reveal", query: "tvPrototype=battle-reveal" },
    { label: "Shop presentation", query: "tvPrototype=shop" }
  ];

  return (
    <div className="admin-dashboard__test-lab">
      <section className="admin-dashboard__test-intro">
        <span>DETACHED SERVER RESOLVER</span>
        <h2>Test canonical effects without touching the room</h2>
        <p>Choose a resolvable record, then configure dice, operative state, prompts, or a bounded batch inside the existing Simulation Lab.</p>
        <strong>{capabilities?.simulationAllowed ? "Simulation ready" : "Simulation locked outside an authenticated lobby"}</strong>
      </section>
      <section className="admin-dashboard__test-grid">
        <div className="admin-dashboard__sim-index">
          <label><span>Find a resolvable record</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enemy, hazard, Scar, Artifact…" /></label>
          <div>{simulatable.map((card) => <button type="button" disabled={!capabilities?.simulationAllowed} key={card.dataSourcePath} onClick={() => onSelectCard(card.id)}><span>{titleCase(card.cardType)}</span><strong>{card.name}</strong><code>{card.id}</code></button>)}</div>
        </div>
        <aside>
          <section>
            <h3>Isolation contract</h3>
            <p>No gameplay intent, broadcast, persistence write, timer, or live event-log entry may escape a simulation.</p>
          </section>
          <section>
            <h3>Curated visual fixtures</h3>
            {capabilities?.qaFixturesAllowed ? fixtures.map((fixture) => <button type="button" key={fixture.query} onClick={() => window.open(`/tv?room=${encodeURIComponent(window.localStorage.getItem("ashen-reach-tv-room-code") ?? "")}&${fixture.query}`, "_blank", "noopener,noreferrer")}>{fixture.label}</button>) : <p>Start with <code>--qa-fixtures</code> to enable fixture links.</p>}
          </section>
        </aside>
      </section>
    </div>
  );
}

function ReportsAndCodex({
  reports,
  selectedCard
}: {
  reports: AdminReportSummary[];
  selectedCard: AdminLibraryCard | null;
}): ReactElement {
  const context = selectedCard ? buildAdminCodexContext(selectedCard) : null;
  const bundle = context ? {
    exportedAt: new Date().toISOString(),
    privacy: "Canonical authored content only. No room, token, player, or live private state included.",
    context
  } : null;
  const markdown = selectedCard ? buildCodexMarkdown(selectedCard) : null;
  return (
    <div className="admin-dashboard__reports">
      <section>
        <header><span>Generated evidence</span><strong>{reports.filter((report) => report.available).length} available</strong></header>
        <div className="admin-dashboard__report-list">
          {reports.map((report) => <article key={report.id} className={report.available ? "" : "is-missing"}>
            <span>{report.available ? "AVAILABLE" : "MISSING"}</span>
            <h3>{report.title}</h3>
            <code>{report.path}</code>
            <p>{report.summary}</p>
            <small>{report.modifiedAt ? new Date(report.modifiedAt).toLocaleString() : "No generated timestamp"}{report.sizeBytes ? ` · ${Math.ceil(report.sizeBytes / 1024)} KB` : ""}</small>
          </article>)}
        </div>
      </section>
      <aside>
        <section className="admin-dashboard__codex-bundle">
          <span>SANITIZED HANDOFF</span>
          <h2>{selectedCard ? selectedCard.name : "Select an archive record"}</h2>
          <p>Prepare stable IDs, repository-relative paths, lifecycle data, relationships, warnings, and focused test locations for Codex.</p>
          <button type="button" disabled={!bundle} onClick={() => bundle && void navigator.clipboard?.writeText(JSON.stringify(bundle, null, 2))}>Copy Codex Context</button>
          <button type="button" disabled={!bundle || !selectedCard} onClick={() => bundle && selectedCard && downloadJson(`${selectedCard.id}-codex-context.json`, bundle)}>Export JSON</button>
          <button type="button" disabled={!markdown || !selectedCard} onClick={() => markdown && selectedCard && downloadText(`${selectedCard.id}-codex-context.md`, markdown)}>Export Markdown</button>
        </section>
        <section className="admin-dashboard__commands">
          <h3>Copyable validation commands</h3>
          {selectedCard?.testFiles.map((file) => <CopyCommand key={file} label={`Focused · ${file.split("/").at(-1)}`} command={`npx.cmd vitest run ${file}`} />)}
          {testCommands.map((entry) => <CopyCommand key={entry.command} {...entry} />)}
        </section>
      </aside>
    </div>
  );
}

export default function AdminDashboard({
  roomCode,
  hostToken,
  initialTab = "overview",
  initialCardId = null,
  initialTileId = null,
  onClose
}: AdminDashboardProps): ReactElement {
  const [tab, setTab] = useState<AdminDashboardTab>(initialTab);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialCardId);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(initialTileId);
  const [selectedCard, setSelectedCard] = useState<AdminLibraryCard | null>(
    initialCardId ? adminLibraryCards.find((card) => card.id === initialCardId) ?? null : null
  );
  const [capabilities, setCapabilities] = useState<AdminContentStatus | null>(null);
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [phoneManifest, setPhoneManifest] = useState<{ sources: number; reductionPercent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const auth = { roomCode, hostToken };
    void Promise.all([fetchAdminContentStatus(auth), fetchAdminReports(auth)])
      .then(([status, reportPayload]) => {
        if (cancelled) return;
        if (!status.dashboardAllowed || status.roomStatus !== "lobby") {
          onClose();
          return;
        }
        setCapabilities(status);
        setReports(reportPayload.reports);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Dashboard authorization could not be restored.");
          onClose();
        }
      });
    void fetch("/assets/phone-image-manifest.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("missing manifest")))
      .then((manifest: { totals?: { sources?: number; reductionPercent?: number } }) => {
        if (!cancelled && manifest.totals?.sources !== undefined && manifest.totals.reductionPercent !== undefined) {
          setPhoneManifest({ sources: manifest.totals.sources, reductionPercent: manifest.totals.reductionPercent });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [hostToken, onClose, roomCode]);

  const openLibraryCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setTab("library");
  };

  return (
    <main className="admin-dashboard" aria-label="Host Admin Dashboard">
      <aside className="admin-dashboard__rail">
        <header>
          <span>ASHENREACH</span>
          <strong>Host Admin</strong>
          <small>Pre-player authoring relay</small>
        </header>
        <nav aria-label="Admin dashboard sections">
          {tabDefinitions.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}><Icon aria-hidden="true" weight={tab === id ? "fill" : "regular"} /><span>{label}</span></button>)}
        </nav>
        <section className="admin-dashboard__spoiler">
          <ShieldWarningIcon aria-hidden="true" weight="fill" />
          <strong>Authoring spoilers visible</strong>
          <span>Hidden-card definitions are shown. Live private assignments are never loaded.</span>
        </section>
        <footer>
          <span className={capabilities?.dashboardAllowed ? "is-ready" : "is-restoring"}>{capabilities?.dashboardAllowed ? "Pre-player authorized" : "Checking interlock"}</span>
          <button type="button" onClick={onClose}><XIcon aria-hidden="true" />Return to lobby</button>
        </footer>
      </aside>
      <section className="admin-dashboard__workspace">
        <header className="admin-dashboard__header">
          <div><span>HOST ADMINISTRATION · NO GAMEPLAY STATE</span><h1>{tabDefinitions.find((entry) => entry.id === tab)?.label}</h1></div>
          <p>{error ?? "The room continues synchronizing behind this isolated development surface."}</p>
        </header>
        <div className="admin-dashboard__stage">
          <Suspense fallback={<p role="status">Loading {tabDefinitions.find((entry) => entry.id === tab)?.label}...</p>}>
          {tab === "overview" ? <Overview capabilities={capabilities} reports={reports} selectedCard={selectedCard} phoneManifest={phoneManifest} onOpen={setTab} /> : null}
          {tab === "lore" ? <AdminLoreBible onOpenLibraryCard={openLibraryCard} onOpenMapTile={(tileId) => { setSelectedTileId(tileId); setTab("map"); }} /> : null}
          {tab === "library" ? <AdminLibrary embedded roomCode={roomCode} hostToken={hostToken} capabilities={capabilities} initialCardId={selectedCardId} onSelectedCardChange={setSelectedCard} onOpenMapTile={(tileId) => { setSelectedTileId(tileId); setTab("map"); }} onClose={() => setTab("overview")} /> : null}
          {tab === "map" ? <AdminMapInspector embedded initialTileId={selectedTileId} onOpenLibraryCard={openLibraryCard} onClose={() => setTab("overview")} /> : null}
          {tab === "test" ? <TestLab capabilities={capabilities} onSelectCard={openLibraryCard} /> : null}
          {tab === "reports" ? <ReportsAndCodex reports={reports} selectedCard={selectedCard} /> : null}
          </Suspense>
        </div>
      </section>
    </main>
  );
}
