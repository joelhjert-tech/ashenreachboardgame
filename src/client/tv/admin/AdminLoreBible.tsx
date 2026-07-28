import { BookOpenTextIcon } from "@phosphor-icons/react/dist/csr/BookOpenText";
import { CrownIcon } from "@phosphor-icons/react/dist/csr/Crown";
import { LightningIcon } from "@phosphor-icons/react/dist/csr/Lightning";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";
import { ScrollIcon } from "@phosphor-icons/react/dist/csr/Scroll";
import { ShieldChevronIcon } from "@phosphor-icons/react/dist/csr/ShieldChevron";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { useMemo, useState, type ReactElement } from "react";
import { getLoreBibleEventsOverviewPath } from "../../shared/assetPaths.js";
import {
  adminLoreCounts,
  adminLoreEntries,
  adminLoreEntryByKey,
  adminLoreFactionEntries,
  adminLoreOperativeEntries,
  adminLoreSectorEntries,
  type AdminLoreCategory,
  type AdminLoreEntry,
  type AdminLoreEventEntry,
  type AdminLoreFactionEntry,
  type AdminLoreNemesisEntry,
  type AdminLoreOperativeEntry,
  type AdminLoreScenarioEntry,
  type AdminLoreSectorEntry
} from "./adminLoreRegistry.js";

export interface AdminLoreBibleProps {
  onOpenLibraryCard: (cardId: string) => void;
  onOpenMapTile: (tileId: string) => void;
}

type LoreFilter = AdminLoreCategory | "all";

const categoryDefinitions = [
  { id: "all", label: "All entries", icon: BookOpenTextIcon },
  { id: "faction", label: "Factions", icon: CrownIcon },
  { id: "nemesis", label: "Nemeses", icon: ShieldChevronIcon },
  { id: "operative", label: "Operatives", icon: UsersThreeIcon },
  { id: "sector", label: "Sectors", icon: MapPinIcon },
  { id: "scenario", label: "Scenarios", icon: ScrollIcon },
  { id: "event", label: "Events", icon: LightningIcon }
] as const;

const reachDepths = (["outer", "middle", "inner", "center"] as const).map((tier) => ({
  tier,
  count: adminLoreSectorEntries.filter((sector) => sector.tier === tier).length
}));

function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryCount(category: LoreFilter): number {
  return category === "all"
    ? adminLoreEntries.length
    : adminLoreEntries.filter((entry) => entry.kind === category).length;
}

function EntryImage({ entry }: { entry: AdminLoreEntry }): ReactElement | null {
  if (!entry.imageUrl) return null;
  return (
    <div className={`admin-lore__entry-image${entry.kind === "scenario" ? " is-sheet" : ""}`}>
      <img src={entry.imageUrl} alt="" loading="lazy" />
      <span aria-hidden="true">{humanize(entry.kind)}</span>
    </div>
  );
}

function FactionArticle({
  entry,
  onOpenLibraryCard
}: {
  entry: AdminLoreFactionEntry;
  onOpenLibraryCard: (cardId: string) => void;
}): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Background</span>
        <p>{entry.background}</p>
      </section>
      <section className="admin-lore__purpose">
        <span>Purpose in the Reach</span>
        <p>{entry.purpose}</p>
      </section>
      <div className="admin-lore__doctrine-grid">
        <section>
          <span>Enemy doctrine</span>
          <p>{entry.enemyDoctrine}</p>
        </section>
        <section>
          <span>Hazard doctrine</span>
          <p>{entry.hazardDoctrine}</p>
        </section>
      </div>
      <section className="admin-lore__roster">
        <header>
          <div>
            <span>Faction manifestations</span>
            <strong>{entry.threats.length} canonical threats</strong>
          </div>
          <small>Open any entry in the Content Archive</small>
        </header>
        <div>
          {entry.threats.map((threat) => (
            <button
              type="button"
              key={threat.id}
              className={`is-${threat.cardType}`}
              onClick={() => onOpenLibraryCard(threat.id)}
            >
              <span>{threat.cardType}{threat.lane ? ` · ${threat.lane} lane` : ""}</span>
              <strong>{threat.title}</strong>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function NemesisArticle({ entry }: { entry: AdminLoreNemesisEntry }): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Lore role</span>
        <p>{entry.loreRole}</p>
      </section>
      <section className="admin-lore__purpose">
        <span>Defeat mandate</span>
        <p>{entry.bounty}</p>
      </section>
      <div className="admin-lore__doctrine-grid">
        <section>
          <span>Encounter identity</span>
          <p>{entry.gameplayRole}</p>
        </section>
        <section>
          <span>Continuity mechanic</span>
          <p>{entry.linkedMechanic}</p>
        </section>
      </div>
      <section className="admin-lore__testimony">
        <header><span>Authored tells</span><strong>{entry.abilities.length}</strong></header>
        {entry.abilities.map((ability) => (
          <blockquote key={`${ability.timing}-${ability.text}`}>
            <span>{humanize(ability.timing)}</span>
            <p>{ability.text}</p>
          </blockquote>
        ))}
      </section>
    </>
  );
}

function OperativeArticle({ entry }: { entry: AdminLoreOperativeEntry }): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Field record</span>
        <p>{entry.lore}</p>
      </section>
      <div className="admin-lore__doctrine-grid">
        <section>
          <span>Expedition role</span>
          <p>{entry.archetype}</p>
        </section>
        <section>
          <span>First recorded sector</span>
          <p>{entry.startingSpaceName ?? "No canonical starting sector recorded."}</p>
        </section>
      </div>
    </>
  );
}

function SectorArticle({ entry }: { entry: AdminLoreSectorEntry }): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Route testimony</span>
        <p>{entry.loreText}</p>
      </section>
      <section className="admin-lore__purpose">
        <span>Gameplay anchor</span>
        <p>{entry.ruleText}</p>
      </section>
      <section className="admin-lore__tags" aria-label="Sector tags">
        {entry.tags.map((tag) => <span key={tag}>{humanize(tag)}</span>)}
      </section>
    </>
  );
}

function ScenarioArticle({ entry }: { entry: AdminLoreScenarioEntry }): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Scenario premise</span>
        <p>{entry.theme}</p>
      </section>
      <section className="admin-lore__purpose">
        <span>Public objective</span>
        <p>{entry.publicObjective}</p>
      </section>
      <div className="admin-lore__doctrine-grid">
        <section>
          <span>{entry.confrontationTitle}</span>
          <p>{entry.confrontationText}</p>
        </section>
        <section>
          <span>Victory record</span>
          <p>{entry.victoryText}</p>
        </section>
      </div>
      <section className="admin-lore__testimony">
        <header><span>Design feel</span><strong>{entry.supportedModes.map(humanize).join(" · ")}</strong></header>
        <p className="admin-lore__design-feel">{entry.designFeel}</p>
      </section>
    </>
  );
}

function EventArticle({ entry }: { entry: AdminLoreEventEntry }): ReactElement {
  return (
    <>
      <section className="admin-lore__lead">
        <span>Recorded disturbance</span>
        <p>{entry.eventText}</p>
      </section>
      <section className="admin-lore__purpose">
        <span>Reach consequence</span>
        <p>{entry.resolutionSummary}</p>
      </section>
      <div className="admin-lore__doctrine-grid">
        <section>
          <span>Escalation threshold</span>
          <p>Recorded at escalation step {entry.step}.</p>
        </section>
        <section>
          <span>Pressure vector</span>
          <p>{entry.escalationDelta > 0 ? "+" : ""}{entry.escalationDelta} global escalation.</p>
        </section>
      </div>
      <section className="admin-lore__testimony">
        <header><span>Witness fragment</span><strong>Public record</strong></header>
        <blockquote>
          <p>{entry.flavor}</p>
        </blockquote>
      </section>
    </>
  );
}

function LoreArticle({
  entry,
  onOpenLibraryCard
}: {
  entry: AdminLoreEntry;
  onOpenLibraryCard: (cardId: string) => void;
}): ReactElement {
  return (
    <article className="admin-lore__folio" aria-live="polite">
      <header className="admin-lore__folio-header">
        <div>
          <span>{humanize(entry.kind)} · Canonical entry</span>
          <h2>{entry.title}</h2>
          <p>{entry.subtitle}</p>
        </div>
        <EntryImage entry={entry} />
      </header>
      <div className="admin-lore__folio-body">
        {entry.kind === "faction" ? <FactionArticle entry={entry} onOpenLibraryCard={onOpenLibraryCard} /> : null}
        {entry.kind === "nemesis" ? <NemesisArticle entry={entry} /> : null}
        {entry.kind === "operative" ? <OperativeArticle entry={entry} /> : null}
        {entry.kind === "sector" ? <SectorArticle entry={entry} /> : null}
        {entry.kind === "scenario" ? <ScenarioArticle entry={entry} /> : null}
        {entry.kind === "event" ? <EventArticle entry={entry} /> : null}
      </div>
    </article>
  );
}

function ContinuityRail({
  entry,
  onNavigate,
  onOpenLibraryCard,
  onOpenMapTile
}: {
  entry: AdminLoreEntry;
  onNavigate: (key: string) => void;
  onOpenLibraryCard: (cardId: string) => void;
  onOpenMapTile: (tileId: string) => void;
}): ReactElement {
  const links: Array<{ key: string; label: string; title: string }> = [];

  if (entry.kind === "faction") {
    links.push({ key: entry.nemesisKey, label: "Linked nemesis", title: entry.nemesisName });
    if (entry.scenarioKey) {
      const scenario = adminLoreEntryByKey.get(entry.scenarioKey);
      if (scenario) links.push({ key: scenario.key, label: "Scenario", title: scenario.title });
    }
  }
  if (entry.kind === "nemesis") {
    links.push({ key: entry.factionKey, label: "Faction", title: entry.factionName });
    if (entry.scenarioKey) {
      const scenario = adminLoreEntryByKey.get(entry.scenarioKey);
      if (scenario) links.push({ key: scenario.key, label: "Scenario", title: scenario.title });
    }
  }
  if (entry.kind === "operative" && entry.startingSpaceKey && entry.startingSpaceName) {
    links.push({ key: entry.startingSpaceKey, label: "First sector", title: entry.startingSpaceName });
  }
  if (entry.kind === "sector") {
    for (const operative of adminLoreOperativeEntries.filter((candidate) => candidate.startingSpaceKey === entry.key)) {
      links.push({ key: operative.key, label: "Starts here", title: operative.title });
    }
  }
  if (entry.kind === "scenario" && entry.nemesisKey && entry.nemesisName) {
    links.push({ key: entry.nemesisKey, label: "Final nemesis", title: entry.nemesisName });
  }

  const archiveEligible = entry.kind === "nemesis"
    || entry.kind === "operative"
    || entry.kind === "scenario"
    || entry.kind === "event";

  return (
    <aside className="admin-lore__continuity">
      <section>
        <span>Continuity links</span>
        <h3>{links.length} connected entries</h3>
        <div className="admin-lore__links">
          {links.map((link) => (
            <button type="button" key={`${link.label}-${link.key}`} onClick={() => onNavigate(link.key)}>
              <span>{link.label}</span>
              <strong>{link.title}</strong>
            </button>
          ))}
          {links.length === 0 ? <p>No direct continuity link is authored for this entry.</p> : null}
        </div>
      </section>
      <section>
        <span>Canonical source</span>
        <code>{entry.sourcePath}</code>
        {archiveEligible ? (
          <button type="button" className="admin-lore__open-record" onClick={() => onOpenLibraryCard(entry.id)}>
            Open in Content Archive
          </button>
        ) : null}
        {entry.kind === "sector" ? (
          <button type="button" className="admin-lore__open-record" onClick={() => onOpenMapTile(entry.id)}>
            Open in Map Inspector
          </button>
        ) : null}
      </section>
      <section className="admin-lore__privacy">
        <span>Scope boundary</span>
        <p>Authored canon only. No room codes, player identities, messages, credentials, private assignments, or hidden agenda text are loaded here.</p>
      </section>
    </aside>
  );
}

export default function AdminLoreBible({
  onOpenLibraryCard,
  onOpenMapTile
}: AdminLoreBibleProps): ReactElement {
  const [filter, setFilter] = useState<LoreFilter>("faction");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(adminLoreFactionEntries[0]?.key ?? adminLoreEntries[0]!.key);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return adminLoreEntries.filter((entry) => (
      (filter === "all" || entry.kind === filter)
      && (!needle || entry.searchText.includes(needle) || entry.title.toLowerCase().includes(needle))
    ));
  }, [filter, search]);

  const selectedEntry = adminLoreEntryByKey.get(selectedKey) ?? adminLoreEntries[0]!;

  const selectFilter = (nextFilter: LoreFilter) => {
    setFilter(nextFilter);
    setSearch("");
    const first = adminLoreEntries.find((entry) => nextFilter === "all" || entry.kind === nextFilter);
    if (first) setSelectedKey(first.key);
  };

  const navigateTo = (key: string) => {
    const target = adminLoreEntryByKey.get(key);
    if (!target) return;
    setFilter(target.kind);
    setSearch("");
    setSelectedKey(target.key);
  };

  return (
    <div className="admin-lore">
      <section className={`admin-lore__masthead${filter === "event" ? " is-event-volume" : ""}`}>
        <div>
          <span>CANONICAL FIELD CONCORDANCE · AUTHORING VIEW</span>
          <h2>Ashen Reach Lore Bible</h2>
          <p>Trace factions, named adversaries, operatives, events, scenarios, and every authored sector without leaving the protected admin workspace.</p>
        </div>
        {filter === "event" ? (
          <figure className="admin-lore__event-volume-art">
            <img src={getLoreBibleEventsOverviewPath()} alt="" />
            <figcaption>
              <span>Reachwide disturbances</span>
              <strong>{adminLoreCounts.events} public records</strong>
            </figcaption>
          </figure>
        ) : (
          <div className="admin-lore__depth" aria-label="Reach depth index">
            {reachDepths.map(({ tier, count }) => (
              <div key={tier}>
                <i aria-hidden="true" />
                <span>{humanize(tier)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-lore__layout">
        <aside className="admin-lore__index">
          <header>
            <span>Concordance index</span>
            <strong>{filteredEntries.length} shown</strong>
          </header>
          <label className="admin-lore__search">
            <span>Find in canon</span>
            <div>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, place, doctrine…"
              />
            </div>
          </label>
          <div className="admin-lore__categories" aria-label="Lore categories">
            {categoryDefinitions.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                className={filter === id ? "is-active" : ""}
                onClick={() => selectFilter(id)}
              >
                <Icon aria-hidden="true" weight={filter === id ? "fill" : "regular"} />
                <span>{label}</span>
                <strong>{categoryCount(id)}</strong>
              </button>
            ))}
          </div>
          <nav aria-label="Lore entries">
            {filteredEntries.map((entry) => (
              <button
                type="button"
                key={entry.key}
                className={selectedEntry.key === entry.key ? "is-active" : ""}
                aria-current={selectedEntry.key === entry.key ? "page" : undefined}
                onClick={() => setSelectedKey(entry.key)}
              >
                <span>{humanize(entry.kind)}</span>
                <strong>{entry.title}</strong>
                <small>{entry.subtitle}</small>
              </button>
            ))}
            {filteredEntries.length === 0 ? (
              <div className="admin-lore__empty">
                <strong>No matching entry</strong>
                <span>Clear the search or open another volume.</span>
              </div>
            ) : null}
          </nav>
        </aside>

        <LoreArticle entry={selectedEntry} onOpenLibraryCard={onOpenLibraryCard} />
        <ContinuityRail
          entry={selectedEntry}
          onNavigate={navigateTo}
          onOpenLibraryCard={onOpenLibraryCard}
          onOpenMapTile={onOpenMapTile}
        />
      </div>

      <footer className="admin-lore__footer">
        <span>{adminLoreCounts.factions} factions</span>
        <span>{adminLoreCounts.nemeses} nemeses</span>
        <span>{adminLoreCounts.operatives} operatives</span>
        <span>{adminLoreCounts.sectors} sectors</span>
        <span>{adminLoreCounts.scenarios} scenarios</span>
        <span>{adminLoreCounts.events} events</span>
      </footer>
    </div>
  );
}
