import type { ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { ChallengeBadge } from "../shared/ChallengeBadge.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import type { PublicPatchPayload, PublicPlayer, PublicShopCost, PublicShopEncounterState, StatePatch, Stat } from "../shared/types.js";
import { HostCinematicFxLayer } from "./HostCinematicFxLayer.js";
import { isHostShopActive } from "./hostShopState.js";

type ShopStatus = "OPEN" | "LOCKED" | "EXHAUSTED" | "DANGEROUS";

interface ShopServiceDisplay {
  id: string;
  label: string;
  cost: string;
  text: string;
  risk?: string;
  enabled: boolean;
}

interface ShopStockDisplay {
  id: string;
  name: string;
  type: string;
  cost: string;
  text: string;
  state: "AFFORDABLE" | "TOO EXPENSIVE" | "SLOT FULL" | "RISKY" | "DISABLED";
  risk?: string;
}

interface HostShopDisplayModel {
  playerName: string;
  playerTitle: string;
  playerPortraitUrl: string | null;
  wounds: string;
  heat: number;
  salvage: number | null;
  gearSlots: string;
  abilitySummary: string;
  shopName: string;
  shopType: string;
  shopRuleText: string;
  status: ShopStatus;
  threatLockCount: number;
  blockingLanes: Array<{ name: string; stat?: Stat; value?: number }>;
  services: ShopServiceDisplay[];
  stock: ShopStockDisplay[];
  stockRevealed: boolean;
  riskActive: boolean;
  transactionComplete: boolean;
  outcomeEntries: string[];
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCost(cost: PublicShopCost): string {
  const entries = [
    cost.salvage !== undefined ? `${cost.salvage} Salvage` : null,
    cost.heat !== undefined ? `+${cost.heat} Heat` : null,
    cost.wounds !== undefined ? `${cost.wounds} Wound${cost.wounds === 1 ? "" : "s"}` : null,
    cost.trophies !== undefined ? `${cost.trophies} Trophies` : null,
    cost.completedContracts !== undefined ? `${cost.completedContracts} Contracts` : null,
    cost.scars !== undefined ? `${cost.scars} Scars` : null
  ].filter((entry): entry is string => Boolean(entry));

  return entries.length > 0 ? entries.join(" + ") : "0";
}

function getGearSlotSummary(player: PublicPlayer): string {
  const equipped = Object.values(player.character.equippedGear).filter(Boolean).length;
  return `${equipped}/3 equipped | ${player.character.heldGearCount} carried`;
}

function getAbilitySummary(player: PublicPlayer): string {
  const activeContract = player.character.activeContract;
  if (activeContract) {
    return `Contract progress ${activeContract.progress}`;
  }

  const scarCount = player.character.scars.length;
  return scarCount > 0 ? `${scarCount} scar${scarCount === 1 ? "" : "s"} affecting choices` : "No active boon exposed";
}

function stockState(stock: NonNullable<PublicShopEncounterState["revealedStock"]>[number]): ShopStockDisplay["state"] {
  if (stock.disabledReason?.toLowerCase().includes("slot")) {
    return "SLOT FULL";
  }

  if (stock.disabledReason) {
    return "DISABLED";
  }

  if (stock.cost.heat) {
    return "RISKY";
  }

  return stock.affordable ? "AFFORDABLE" : "TOO EXPENSIVE";
}

function buildFromPayload(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer,
  shopEncounter: PublicShopEncounterState
): HostShopDisplayModel {
  const boardSpace = getBoardSpace(shopEncounter.sectorId);
  const serviceTags = boardSpace?.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine") ?? [];
  const stock = shopEncounter.revealedStock ?? [];

  return {
    playerName: shopEncounter.activePlayer.name,
    playerTitle: activePlayer.character.archetype,
    playerPortraitUrl: getCharacterPortraitPath(activePlayer.character.id),
    wounds: `${shopEncounter.activePlayer.wounds.current}/${shopEncounter.activePlayer.wounds.max}`,
    heat: shopEncounter.activePlayer.heat,
    salvage: shopEncounter.activePlayer.salvage,
    gearSlots: getGearSlotSummary(activePlayer),
    abilitySummary: getAbilitySummary(activePlayer),
    shopName: shopEncounter.shopName,
    shopType: serviceTags.map(toTitleCase).join(" / ") || toTitleCase(boardSpace?.tier ?? "shop"),
    shopRuleText: boardSpace?.ruleText ?? "Choose a public service on the player phone.",
    status: shopEncounter.status.toUpperCase() as ShopStatus,
    threatLockCount: shopEncounter.blockingThreats.length,
    blockingLanes: shopEncounter.blockingThreats.map((threat) => ({
      name: threat.name,
      stat: threat.challenge?.stat,
      value: threat.challenge?.value
    })),
    services: shopEncounter.status === "locked"
      ? []
      : shopEncounter.services.map((service) => ({
          id: service.id,
          label: service.label,
          cost: formatCost(service.cost),
          text: service.enabled ? "Choose and confirm on the player phone." : (service.disabledReason ?? "Unavailable"),
          risk: service.risk,
          enabled: service.enabled
        })),
    stock: stock.map((entry) => ({
      id: entry.cardId,
      name: entry.name,
      type: toTitleCase(entry.type),
      cost: formatCost(entry.cost),
      text: entry.summary,
      state: stockState(entry),
      risk: entry.disabledReason
    })),
    stockRevealed: stock.length > 0,
    riskActive: shopEncounter.status === "dangerous" || shopEncounter.services.some((service) => Boolean(service.risk || service.cost.heat)),
    transactionComplete: Boolean(shopEncounter.recentOutcome),
    outcomeEntries: [
      shopEncounter.recentOutcome?.summary,
      patch.payload.outcomeSummary?.summary,
      `${shopEncounter.activePlayer.characterName} is using ${shopEncounter.shopName}.`,
      shopEncounter.status === "locked" ? "Clear threats before trade." : "Choose service on player phone."
    ].filter((entry): entry is string => Boolean(entry)).filter((entry, index, list) => list.indexOf(entry) === index).slice(0, 3)
  };
}

function buildFallbackModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostShopDisplayModel | null {
  const space = getBoardSpace(activePlayer.sectorId);
  if (!space) {
    return null;
  }

  const serviceTags = space.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine");
  const status: ShopStatus = space.tags.includes("risk-shop") ? "DANGEROUS" : "OPEN";

  return {
    playerName: activePlayer.character.name,
    playerTitle: activePlayer.character.archetype,
    playerPortraitUrl: getCharacterPortraitPath(activePlayer.character.id),
    wounds: `${activePlayer.character.wounds}/?`,
    heat: activePlayer.character.heat,
    salvage: activePlayer.character.salvage ?? null,
    gearSlots: getGearSlotSummary(activePlayer),
    abilitySummary: getAbilitySummary(activePlayer),
    shopName: space.name,
    shopType: serviceTags.map(toTitleCase).join(" / ") || toTitleCase(space.tier),
    shopRuleText: space.ruleText,
    status,
    threatLockCount: patch.payload.encounter ? 1 : 0,
    blockingLanes: [],
    services: [],
    stock: [],
    stockRevealed: false,
    riskActive: status === "DANGEROUS",
    transactionComplete: Boolean(patch.payload.outcomeSummary),
    outcomeEntries: [
      patch.payload.outcomeSummary?.summary,
      `${activePlayer.character.name} is using ${space.name}.`,
      "Waiting for authoritative shop payload."
    ].filter((entry): entry is string => Boolean(entry)).slice(0, 3)
  };
}

function buildShopModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostShopDisplayModel | null {
  return patch.payload.shopEncounter
    ? buildFromPayload(patch, activePlayer, patch.payload.shopEncounter)
    : buildFallbackModel(patch, activePlayer);
}

export function HostShopOverlay({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
}): ReactElement | null {
  if (!patch || !activePlayer || !isHostShopActive(patch, activePlayer)) {
    return null;
  }

  const model = buildShopModel(patch, activePlayer);

  if (!model) {
    return null;
  }

  return (
    <section className="host-shop-overlay" aria-label="Host shop encounter" data-testid="host-shop-overlay">
      <div
        className={`host-shop-panel${model.riskActive ? " host-shop-panel-risk" : ""}${model.transactionComplete ? " host-shop-panel-burst" : ""}`}
        style={getChallengeThemeStyle("guile")}
      >
        <HostCinematicFxLayer
          variant="shop"
          tone={model.transactionComplete ? "reward" : model.riskActive ? "danger" : "neutral"}
          stockCount={model.stockRevealed ? model.stock.length : 3}
          riskActive={model.riskActive}
          burstActive={model.transactionComplete}
          testId="host-shop-fx-layer"
        />
        <article className="host-shop-card host-shop-operative host-shop-parallax-card" data-testid="host-shop-operative">
          <div className="host-shop-art">
            {model.playerPortraitUrl ? <img src={model.playerPortraitUrl} alt={model.playerName} /> : <span>Operative</span>}
          </div>
          <div className="host-shop-card-copy">
            <span>Active operative</span>
            <h2>{model.playerName}</h2>
            <p>{model.playerTitle}</p>
          </div>
          <div className="host-shop-stat-grid">
            <div>
              <span>Salvage</span>
              <strong>{model.salvage ?? "-"}</strong>
            </div>
            <div>
              <span>Heat</span>
              <strong>{model.heat}</strong>
            </div>
            <div>
              <span>Wounds</span>
              <strong>{model.wounds}</strong>
            </div>
          </div>
          <p className="host-shop-gear-line">{model.gearSlots}</p>
          <p className="host-shop-gear-line host-shop-ability-line">{model.abilitySummary}</p>
        </article>

        <div className="host-shop-center" aria-hidden="true">
          <span>Shop Encounter</span>
          <strong>VS</strong>
          <ChallengeBadge stat="guile" label="Trade risk" size="compact" />
          <p>{model.status === "LOCKED" ? "Clear threats before trade" : "Choose service on phone"}</p>
        </div>

        <article className="host-shop-card host-shop-service host-shop-parallax-card" data-testid="host-shop-service">
          <div className="host-shop-art host-shop-market-art">
            <span>{model.shopName}</span>
          </div>
          <div className="host-shop-card-copy">
            <span>{model.shopType}</span>
            <h2>{model.shopName}</h2>
            <p>{model.shopRuleText}</p>
          </div>
          <div className={`host-shop-status host-shop-status-${model.status.toLowerCase()}`}>
            <span>Status</span>
            <strong>{model.status}</strong>
          </div>
          <div className="host-shop-lock">
            <span>Threat lock</span>
            <strong>{model.threatLockCount === 0 ? "None" : model.threatLockCount}</strong>
          </div>
        </article>

        <section className="host-shop-services" aria-label="Shop services">
          <h3>{model.status === "LOCKED" ? "Shop Locked" : "Shop Services"}</h3>
          <div className="host-shop-service-list">
            {model.status === "LOCKED" ? (
              <article className="host-shop-service-risk">
                <strong>Clear threats before trade.</strong>
                <span>Required</span>
                <p>Purchase services are hidden until this shop is safe.</p>
              </article>
            ) : model.services.length > 0 ? (
              model.services.map((service) => (
                <article key={service.id} className={`${service.risk ? "host-shop-service-risk" : ""}${service.enabled ? "" : " host-shop-service-disabled"}`}>
                  <strong>{service.label}</strong>
                  <span>{service.cost}</span>
                  <p>{service.text}</p>
                  {service.risk && <em>{service.risk}</em>}
                </article>
              ))
            ) : (
              <article>
                <strong>Awaiting services</strong>
                <span>-</span>
                <p>Authoritative shop services have not been published yet.</p>
              </article>
            )}
          </div>
        </section>

        <section className="host-shop-stock" aria-label="Shop stock">
          <div className="host-shop-section-header">
            <h3>Shop Stock - {model.shopName}</h3>
            <span>{model.status === "LOCKED" ? "Clear threats first" : model.stockRevealed ? "Public reveal" : "Not revealed"}</span>
          </div>
          {model.status === "LOCKED" ? (
            <div className="host-shop-locked">
              <strong>Shop Locked</strong>
              <p>{model.shopName} is under threat. Resolve blocking pressure before trade.</p>
              <div>
                {model.blockingLanes.length > 0 ? (
                  model.blockingLanes.map((lane) => (
                    <span key={`${lane.name}-${lane.stat ?? "none"}`}>
                      {lane.name}
                      {lane.stat && <ChallengeBadge stat={lane.stat} value={lane.value} size="compact" />}
                      {lane.stat && <span className="sr-only">{lane.name} {lane.stat} {lane.value}</span>}
                    </span>
                  ))
                ) : (
                  <span>Local threat</span>
                )}
              </div>
            </div>
          ) : model.stockRevealed ? (
            <div className="host-shop-stock-row">
              {model.stock.map((stock) => (
                <article key={stock.id} className={`host-shop-stock-card host-shop-stock-${stock.state.toLowerCase().replace(/\s+/g, "-")}`}>
                  <strong>{stock.name}</strong>
                  <span>{stock.type}</span>
                  <p>{stock.text}</p>
                  <div>
                    <b>{stock.cost}</b>
                    <em>{stock.risk ?? stock.state}</em>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="host-shop-locked">
              <strong>No stock revealed</strong>
              <p>Choose a service on the player phone. The host will show public offers after they are revealed.</p>
            </div>
          )}
        </section>

        <section className="host-shop-outcome" aria-label="Market result">
          {model.outcomeEntries.map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </section>
      </div>
    </section>
  );
}
