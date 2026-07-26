import { useEffect, useState, type ReactElement } from "react";
import { getSignalTheatreAssetPaths } from "../shared/assetPaths.js";
import type { ScenarioCatalogEntry } from "../shared/types.js";
import { HostImage } from "./HostImage.js";
import "./TvApprovalPrototypes.css";

const prototypeOffers = [
  {
    name: "Breachline Sextant",
    category: "Route Aid · Artifact",
    price: "5 Salvage",
    summary: "Two charges. Before rolling movement, follow a legal same-reach route to a transition sector.",
    artPath: "/assets/cards/artifacts/artifact-breachline-sextant.png"
  },
  {
    name: "Mara Vell",
    category: "Route Aid · Follower",
    price: "4 Salvage",
    summary: "A unique guide with two route charges. Stops at the transition sector and never bypasses a gate.",
    artPath: "/assets/cards/artifacts/artifact-mara-vell-cinder-cartographer.png"
  },
  {
    name: "Gateward Spindle",
    category: "Route Aid · Artifact",
    price: "5 Salvage",
    summary: "Two charges and +1 Forge while equipped. The server chooses the canonical route.",
    artPath: "/assets/cards/artifacts/artifact-gateward-spindle.png"
  }
] as const;

export function TvShopApprovalPrototype(): ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => (current + 1) % prototypeOffers.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);
  const selected = prototypeOffers[selectedIndex]!;
  const previous = prototypeOffers[(selectedIndex - 1 + prototypeOffers.length) % prototypeOffers.length]!;
  const next = prototypeOffers[(selectedIndex + 1) % prototypeOffers.length]!;

  return (
    <main className="tv-shop-prototype" data-testid="tv-shop-approval-prototype">
      <HostImage
        src={getSignalTheatreAssetPaths().shopkeeperEstablishment}
        alt=""
        fit="cover"
        aspectRatio="wide"
        fallback="map"
        className="tv-shop-prototype__background"
      />
      <div className="tv-shop-prototype__shade" aria-hidden="true" />
      <header className="tv-shop-prototype__header">
        <div><span>Establishment entered</span><h1>The Brass Reliquary</h1><small>Active buyer · Joel / Ash Warden</small></div>
        <div className="tv-shop-prototype__market"><span>Public market</span><strong>Route Aids</strong><small>Phone selection drives this carousel</small></div>
      </header>
      <section className="tv-shop-prototype__carousel" aria-label="Public offers">
        <article className="tv-shop-prototype__side" aria-hidden="true">
          <HostImage src={previous.artPath} alt="" fit="cover" aspectRatio="card" fallback="card" />
          <span>{previous.category}</span><strong>{previous.name}</strong>
        </article>
        <article className="tv-shop-prototype__selected" key={selected.name}>
          <HostImage src={selected.artPath} alt={selected.name} fit="cover" aspectRatio="card" fallback="card" className="tv-shop-prototype__selected-art" />
          <div className="tv-shop-prototype__selected-copy">
            <span>{selected.category}</span>
            <h2>{selected.name}</h2>
            <strong>{selected.price}</strong>
            <p>{selected.summary}</p>
            <em>Awaiting confirmation on phone</em>
          </div>
        </article>
        <article className="tv-shop-prototype__side" aria-hidden="true">
          <HostImage src={next.artPath} alt="" fit="cover" aspectRatio="card" fallback="card" />
          <span>{next.category}</span><strong>{next.name}</strong>
        </article>
      </section>
      <footer className="tv-shop-prototype__footer">
        <span>Signal Cartography locked during this visit</span>
        <strong>{selectedIndex + 1} / {prototypeOffers.length}</strong>
      </footer>
    </main>
  );
}

export function TvScenarioApprovalPrototype({
  scenario,
  playerCount,
  hostName = "Expedition Host"
}: {
  scenario: ScenarioCatalogEntry | null;
  playerCount: number;
  hostName?: string;
}): ReactElement {
  const pressureText = scenario?.pressureRule?.trim() || "No loss pressure";
  return (
    <main className="tv-scenario-prototype" data-testid="tv-scenario-approval-prototype">
      <div className="tv-scenario-prototype__art">
        <HostImage
          src={scenario?.sheetArtPath ?? "/assets/riftfall/ui/signal-theatre/world-stage.png"}
          alt={scenario?.name ?? "Scenario briefing"}
          fit="cover"
          aspectRatio="wide"
          fallback="map"
        />
      </div>
      <div className="tv-scenario-prototype__veil" aria-hidden="true" />
      <header>
        <span>Expedition Briefing</span>
        <strong>{scenario?.mode ?? "Co-op"} · {playerCount} operative{playerCount === 1 ? "" : "s"}</strong>
        <small>Selected by {hostName}</small>
      </header>
      <section>
        <span>{scenario?.difficulty ?? "Standard"} expedition</span>
        <h1>{scenario?.name ?? "Select a scenario"}</h1>
        <p className="tv-scenario-prototype__theme">{scenario?.theme ?? "The host is reviewing available expeditions."}</p>
        <div className="tv-scenario-prototype__facts">
          <article><span>Duration</span><strong>{scenario?.expectedDuration ?? "Not set"}</strong></article>
          <article><span>Pressure</span><strong>{/no loss|disabled|none/i.test(pressureText) ? "No loss pressure" : pressureText}</strong></article>
          <article><span>Final confrontation</span><strong>{scenario?.confrontationTitle ?? scenario?.nemesis?.name ?? "Scenario objective"}</strong></article>
        </div>
        <div className="tv-scenario-prototype__objective">
          <span>Primary objective</span>
          <strong>{scenario?.victoryText ?? scenario?.specialRules?.[0] ?? "Confirm the expedition to begin."}</strong>
        </div>
      </section>
      <footer><span>Scenario browsing preview · development only</span><strong>Confirm on host phone</strong></footer>
    </main>
  );
}
