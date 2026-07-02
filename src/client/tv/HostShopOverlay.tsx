import type { CSSProperties, ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { ChallengeBadge } from "../shared/ChallengeBadge.js";
import type { PublicPatchPayload, PublicPlayer, PublicShopCost, PublicShopEncounterState, StatePatch, Stat } from "../shared/types.js";
import { HostCinematicFxLayer } from "./HostCinematicFxLayer.js";
import { isHostShopActive } from "./hostShopState.js";

type ShopStatus = "OPEN" | "BLOCKED" | "EXHAUSTED" | "DANGEROUS";
type PreviewTone = "service" | "stock" | "sell" | "blocked" | "empty";

interface ShopPreviewCard {
  id: string;
  eyebrow: string;
  title: string;
  cost: string;
  summary: string;
  footer: string;
  tone: PreviewTone;
  enabled: boolean;
}

interface HostShopDisplayModel {
  playerName: string;
  salvage: number | null;
  shopName: string;
  sectorName: string;
  shopType: string;
  shopCategory: string;
  status: ShopStatus;
  statusCopy: string;
  stockCount: number;
  sellableCount: number;
  threatLockCount: number;
  blockedReasonText: string | null;
  blockingLanes: Array<{ name: string; stat?: Stat; value?: number }>;
  previewCards: ShopPreviewCard[];
  stockRevealed: boolean;
  riskActive: boolean;
  transactionComplete: boolean;
  outcome: string | null;
  guidance: string;
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

function formatShopCategory(value: string | undefined): string {
  return value ? toTitleCase(value) : "Public Shop";
}

function servicePreview(service: PublicShopEncounterState["services"][number]): ShopPreviewCard {
  const isSellService = service.id === "sell-gear";

  return {
    id: `service-${service.id}`,
    eyebrow: service.shopCategory ? formatShopCategory(service.shopCategory) : isSellService ? "Sell" : "Service",
    title: service.label,
    cost: formatCost(service.cost),
    summary: service.enabled ? "Confirm this service from the active player's phone." : (service.disabledReason ?? "Unavailable"),
    footer: service.risk ?? (service.enabled ? "Phone confirms" : "Unavailable"),
    tone: isSellService ? "sell" : service.risk || service.cost.heat ? "stock" : "service",
    enabled: service.enabled
  };
}

function stockPreview(stock: NonNullable<PublicShopEncounterState["revealedStock"]>[number]): ShopPreviewCard {
  return {
    id: `stock-${stock.cardId}`,
    eyebrow: stock.shopCategories?.[0] ? formatShopCategory(stock.shopCategories[0]) : toTitleCase(stock.type),
    title: stock.name,
    cost: formatCost(stock.cost),
    summary: stock.summary,
    footer: stock.disabledReason ?? (stock.affordable ? "Available" : "Not enough Salvage"),
    tone: "stock",
    enabled: stock.affordable && !stock.disabledReason
  };
}

function blockedPreview(model: Pick<HostShopDisplayModel, "blockedReasonText" | "blockingLanes">): ShopPreviewCard {
  const threatName = model.blockingLanes[0]?.name;

  return {
    id: "blocked-shop",
    eyebrow: "Threat Lock",
    title: threatName ?? "Shop Blocked",
    cost: "Clear threat",
    summary: model.blockedReasonText ?? "Shop blocked by threat.",
    footer: "Trade suspended",
    tone: "blocked",
    enabled: false
  };
}

function emptyPreview(): ShopPreviewCard {
  return {
    id: "empty-stock",
    eyebrow: "Stock",
    title: "No stock available",
    cost: "-",
    summary: "No public stock is available from this shop right now.",
    footer: "Awaiting phone action",
    tone: "empty",
    enabled: false
  };
}

function buildPreviewCards(shopEncounter: PublicShopEncounterState, isBlocked: boolean): ShopPreviewCard[] {
  if (isBlocked) {
    return [];
  }

  const stockCards = (shopEncounter.revealedStock ?? []).slice(0, 4).map(stockPreview);

  if (stockCards.length > 0) {
    return stockCards;
  }

  return shopEncounter.services.slice(0, 4).map(servicePreview);
}

function buildShopType(shopEncounter: PublicShopEncounterState): string {
  if (shopEncounter.shopType) {
    return shopEncounter.shopType;
  }

  const boardSpace = getBoardSpace(shopEncounter.sectorId);
  const serviceTags = boardSpace?.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine") ?? [];

  return serviceTags.map(toTitleCase).join(" / ") || toTitleCase(boardSpace?.tier ?? "shop");
}

function buildFromPayload(shopEncounter: PublicShopEncounterState): HostShopDisplayModel {
  const isBlocked = shopEncounter.status === "locked" || shopEncounter.blocked === true || shopEncounter.blockingThreats.length > 0;
  const status: ShopStatus = isBlocked
    ? "BLOCKED"
    : shopEncounter.status === "dangerous"
      ? "DANGEROUS"
      : shopEncounter.status === "exhausted"
        ? "EXHAUSTED"
        : "OPEN";
  const stockCount = shopEncounter.revealedStock?.length ?? 0;
  const sellableCount = shopEncounter.sellInventory?.filter((item) => item.sellable).length ?? 0;
  const blockingLanes = shopEncounter.blockingThreats.map((threat) => ({
    name: threat.name,
    stat: threat.challenge?.stat,
    value: threat.challenge?.value
  }));
  const baseCards = buildPreviewCards(shopEncounter, isBlocked);
  const blockedReasonText = shopEncounter.blockedReasonText ?? (isBlocked ? "Shop blocked by threat." : null);

  return {
    playerName: shopEncounter.activePlayer.name,
    salvage: shopEncounter.activePlayer.salvage,
    shopName: shopEncounter.shopName,
    sectorName: shopEncounter.sectorName,
    shopType: buildShopType(shopEncounter),
    shopCategory: formatShopCategory(shopEncounter.stockCategory ?? shopEncounter.shopCategory),
    status,
    statusCopy: isBlocked
      ? (blockedReasonText ?? "Shop blocked by threat.")
      : `Waiting on ${shopEncounter.activePlayer.name} to choose a shop action at ${shopEncounter.shopName}.`,
    stockCount,
    sellableCount,
    threatLockCount: shopEncounter.blockingThreats.length,
    blockedReasonText,
    blockingLanes,
    previewCards: isBlocked ? [blockedPreview({ blockedReasonText, blockingLanes })] : baseCards.length > 0 ? baseCards : [emptyPreview()],
    stockRevealed: stockCount > 0,
    riskActive: shopEncounter.status === "dangerous" || shopEncounter.services.some((service) => Boolean(service.risk || service.cost.heat)),
    transactionComplete: Boolean(shopEncounter.recentOutcome),
    outcome: shopEncounter.recentOutcome?.summary ?? null,
    guidance: isBlocked ? "Clear the threat lock before trade resumes." : "Choose on player phone"
  };
}

function buildFallbackModel(activePlayer: PublicPlayer): HostShopDisplayModel | null {
  const space = getBoardSpace(activePlayer.sectorId);

  if (!space || !space.tags.some((tag) => tag === "shop" || tag === "risk-shop")) {
    return null;
  }

  const serviceTags = space.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine");
  const status: ShopStatus = space.tags.includes("risk-shop") ? "DANGEROUS" : "OPEN";

  return {
    playerName: activePlayer.character.name,
    salvage: activePlayer.character.salvage ?? null,
    shopName: space.name,
    sectorName: space.name,
    shopType: serviceTags.map(toTitleCase).join(" / ") || toTitleCase(space.tier),
    shopCategory: "Public Shop",
    status,
    statusCopy: `Waiting on ${activePlayer.character.name} to choose a shop service.`,
    stockCount: 0,
    sellableCount: 0,
    threatLockCount: 0,
    blockedReasonText: null,
    blockingLanes: [],
    previewCards: [emptyPreview()],
    stockRevealed: false,
    riskActive: status === "DANGEROUS",
    transactionComplete: false,
    outcome: null,
    guidance: "Choose on player phone"
  };
}

function buildShopModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostShopDisplayModel | null {
  return patch.payload.shopEncounter ? buildFromPayload(patch.payload.shopEncounter) : buildFallbackModel(activePlayer);
}

function HostShopPreviewCard({ card, index }: { card: ShopPreviewCard; index: number }): ReactElement {
  return (
    <article
      className={`host-shop-preview-card host-shop-preview-${card.tone}${card.enabled ? "" : " host-shop-preview-disabled"}`}
      data-testid={`host-shop-preview-${card.id}`}
      style={{ "--shop-offer-index": index } as CSSProperties}
    >
      <span>{card.eyebrow}</span>
      <h3>{card.title}</h3>
      <strong>{card.cost}</strong>
      <p>{card.summary}</p>
      <em>{card.footer}</em>
    </article>
  );
}

function HostShopStatusPanel({ model }: { model: HostShopDisplayModel }): ReactElement {
  return (
    <aside className="host-shop-status-panel" aria-label="Shop encounter summary" data-testid="host-shop-status-panel">
      <div>
        <span>Sector</span>
        <strong>{model.sectorName}</strong>
      </div>
      <div>
        <span>Salvage</span>
        <strong>{model.salvage ?? "-"}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{model.status}</strong>
      </div>
      <div>
        <span>Stock</span>
        <strong>{model.stockCount}</strong>
      </div>
      <div>
        <span>Sellable</span>
        <strong>{model.sellableCount}</strong>
      </div>
      <div>
        <span>Threat Lock</span>
        <strong>{model.threatLockCount === 0 ? "None" : model.threatLockCount}</strong>
      </div>
      {model.blockedReasonText && (
        <p>{model.blockedReasonText}</p>
      )}
    </aside>
  );
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
        className={`host-shop-panel host-shop-panel-stage host-shop-status-${model.status.toLowerCase()}${model.riskActive ? " host-shop-panel-risk" : ""}${model.transactionComplete ? " host-shop-panel-burst" : ""}`}
        style={getChallengeThemeStyle("guile")}
      >
        <HostCinematicFxLayer
          variant="shop"
          tone={model.transactionComplete ? "reward" : model.status === "BLOCKED" ? "danger" : model.riskActive ? "danger" : "neutral"}
          stockCount={Math.max(2, model.previewCards.length)}
          riskActive={model.riskActive || model.status === "BLOCKED"}
          burstActive={model.transactionComplete}
          testId="host-shop-fx-layer"
        />

        <header className="host-shop-alert" data-testid="host-shop-alert">
          <span>{model.status === "BLOCKED" ? "Shop Blocked" : "Shop Open"}</span>
          <strong>{model.statusCopy}</strong>
          <b>{model.status}</b>
        </header>

        <main className="host-shop-stage" aria-label="Shop services">
          <div className="host-shop-heading">
            <span>{model.shopCategory}</span>
            <h2>{model.shopName}</h2>
            <p>{model.shopType}</p>
          </div>

          <section className="host-shop-preview-grid" aria-label="Public shop preview">
            {model.previewCards.map((card, index) => (
              <HostShopPreviewCard key={card.id} card={card} index={index} />
            ))}
          </section>

          {model.status === "BLOCKED" && (
            <section className="host-shop-threat-list" aria-label="Blocking threats">
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
            </section>
          )}

          <div className="host-shop-instruction">
            <span aria-hidden="true">PHONE</span>
            <strong>{model.guidance}</strong>
          </div>
        </main>

        <HostShopStatusPanel model={model} />

        <section className="host-shop-outcome" aria-label="Market result" data-testid="host-shop-outcome">
          <p>{model.outcome ?? `${model.playerName} is using ${model.shopName}.`}</p>
          <p>{model.stockRevealed ? "Public stock is revealed." : model.status === "BLOCKED" ? "Trade is suspended." : "No stock available until the phone reveals offers."}</p>
          <p>{model.guidance}</p>
        </section>
      </div>
    </section>
  );
}
