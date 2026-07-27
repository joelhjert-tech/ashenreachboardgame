import { useEffect, useState, type ReactElement } from "react";
import type {
  PublicPatchPayload,
  PublicPlayer,
  PublicShopEncounterState,
  ScenarioCatalogEntry,
  StatePatch
} from "../shared/types.js";
import { HostImage } from "./HostImage.js";
import { HostShopOverlay } from "./HostShopOverlay.js";
import { JoinQrCard } from "./JoinQrCard.js";
import "./TvApprovalPrototypes.css";

const prototypeOffers = [
  {
    name: "Breachline Sextant",
    summary: "Two charges. Before rolling movement, follow a legal same-reach route to a transition sector."
  },
  {
    name: "Mara Vell",
    summary: "A unique guide with two route charges. Stops at the transition sector and never bypasses a gate."
  },
  {
    name: "Gateward Spindle",
    summary: "Two charges and +1 Forge while equipped. The server chooses the canonical route."
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
  const shop: PublicShopEncounterState = {
    sectorId: "outer_waymarket",
    sectorName: "Anchor Market",
    shopId: "prototype-brass-reliquary",
    shopName: "The Brass Reliquary",
    shopType: "Relic Establishment",
    status: "open",
    browseSelection: { view: "route-aids", selectedId: selected.name === "Mara Vell" ? "mara-vell-cinder-cartographer" : selected.name === "Gateward Spindle" ? "gateward-spindle" : "breachline-sextant" },
    activePlayer: {
      playerId: "seat-1",
      name: "Joel",
      characterName: "Ash Warden",
      salvage: 8,
      wounds: { current: 0, max: 6 },
      trophies: 0,
      completedContracts: 0
    },
    blockingThreats: [],
    services: [],
    revealedStock: [
      { cardId: "breachline-sextant", name: prototypeOffers[0].name, type: "artifact", cost: { salvage: 5 }, summary: prototypeOffers[0].summary, rarity: "artifact", stock: 1, affordable: true },
      { cardId: "mara-vell-cinder-cartographer", name: prototypeOffers[1].name, type: "follower", artCardId: "artifact-mara-vell-cinder-cartographer", cost: { salvage: 4 }, summary: prototypeOffers[1].summary, rarity: "unique", stock: 1, affordable: true },
      { cardId: "gateward-spindle", name: prototypeOffers[2].name, type: "artifact", cost: { salvage: 5 }, summary: prototypeOffers[2].summary, rarity: "artifact", stock: 1, affordable: true }
    ],
    sellableCount: 0
  };
  const patch = {
    type: "STATE_PATCH",
    sessionId: "shop-prototype",
    sequence: selectedIndex + 1,
    phase: "action",
    payload: { status: "active", shopEncounter: shop } as PublicPatchPayload
  } satisfies StatePatch<PublicPatchPayload>;
  const activePlayer = { seatId: "seat-1", sectorId: shop.sectorId } as PublicPlayer;

  return (
    <main className="tv-shop-live-fixture" data-testid="tv-shop-approval-prototype">
      <HostShopOverlay patch={patch} activePlayer={activePlayer} />
    </main>
  );
}

export function TvScenarioBriefing({
  scenario,
  playerCount,
  hostName = "Expedition Host",
  mode,
  roomCode = null,
  joinedCount = 0,
  readyCount = 0,
  approvalFixture = true
}: {
  scenario: ScenarioCatalogEntry | null;
  playerCount: number;
  hostName?: string;
  mode?: "single-player" | "co-op" | "rivalry" | "nemesis";
  roomCode?: string | null;
  joinedCount?: number;
  readyCount?: number;
  approvalFixture?: boolean;
}): ReactElement {
  const pressureText = scenario?.pressureRule?.trim() || "No loss pressure";
  const modeLabel = mode === "single-player"
    ? "Single Player"
    : mode === "co-op"
      ? "Multiplayer Co-op"
      : mode === "rivalry"
        ? "Rivalry"
        : mode === "nemesis"
          ? "Nemesis Relay"
          : scenario?.mode ?? "Co-op";
  return (
    <main className="tv-scenario-prototype" data-testid={approvalFixture ? "tv-scenario-approval-prototype" : "tv-expedition-briefing"}>
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
        <strong>{modeLabel} · {playerCount} operative{playerCount === 1 ? "" : "s"}</strong>
        <small>Selected by {hostName}</small>
      </header>
      {roomCode ? (
        <aside className="tv-scenario-prototype__join" aria-label={`Join room ${roomCode}`}>
          <JoinQrCard roomCode={roomCode} variant="compact" />
          <span>Join room</span>
          <strong>{roomCode}</strong>
        </aside>
      ) : null}
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
      <footer>
        <span>{roomCode ? `Room ${roomCode} · ${joinedCount} joined · ${readyCount} ready` : "Scenario browsing preview"}</span>
        <strong>{approvalFixture ? "Confirm on host phone" : "Host Phone controls this briefing"}</strong>
      </footer>
    </main>
  );
}

export { TvScenarioBriefing as TvScenarioApprovalPrototype };
