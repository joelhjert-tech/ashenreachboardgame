import type { CSSProperties, ReactElement } from "react";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { ChallengeBadge } from "../shared/ChallengeBadge.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import { getGearCardArtId, getGearCardArtType } from "../shared/assetPaths.js";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import type { PublicPatchPayload, PublicPlayer, PublicShopCost, PublicShopEncounterState, ResultDelta, StatePatch, Stat } from "../shared/types.js";
import { HostCinematicFxLayer } from "./HostCinematicFxLayer.js";
import { isHostShopActive } from "./hostShopState.js";

type ShopStatus = "OPEN" | "BLOCKED" | "EXHAUSTED" | "DANGEROUS";
type PreviewTone = "service" | "stock" | "sell" | "blocked" | "empty";
type ShopIcon = "anvil" | "crate" | "repair" | "sell" | "lock" | "stock";

interface ShopPreviewCard {
  id: string;
  eyebrow: string;
  title: string;
  cost: string;
  summary: string;
  footer: string;
  tone: PreviewTone;
  enabled: boolean;
  icon: ShopIcon;
  artCardId?: string;
  artCardType?: CardImageType;
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
  transactionTitle: string | null;
  outcome: string | null;
  guidance: string;
  resultDeltas: ResultDelta[];
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCost(cost: PublicShopCost): string {
  const entries = [
    cost.salvage !== undefined ? `${cost.salvage} Salvage` : null,
    cost.wounds !== undefined ? `${cost.wounds} Wound${cost.wounds === 1 ? "" : "s"}` : null,
    cost.trophies !== undefined ? `${cost.trophies} Trophies` : null,
    cost.completedContracts !== undefined ? `${cost.completedContracts} Completed Contracts` : null,
    cost.scars !== undefined ? `${cost.scars} Scars` : null
  ].filter((entry): entry is string => Boolean(entry));

  return entries.length > 0 ? entries.join(" + ") : "0";
}

function formatShopCategory(value: string | undefined): string {
  return value ? toTitleCase(value) : "Public Shop";
}

function servicePreview(service: PublicShopEncounterState["services"][number], completedContracts = 0): ShopPreviewCard {
  const isSellService = service.id === "sell-gear";
  const serviceText = `${service.id} ${service.label}`.toLowerCase();
  const icon: ShopIcon = isSellService
    ? "sell"
    : serviceText.includes("repair") || serviceText.includes("restore") || serviceText.includes("heal")
      ? "repair"
      : serviceText.includes("buy") || serviceText.includes("supply") || serviceText.includes("stock")
        ? "crate"
        : "anvil";

  return {
    id: `service-${service.id}`,
    eyebrow: service.shopCategory ? formatShopCategory(service.shopCategory) : isSellService ? "Sell" : "Service",
    title: service.label,
    cost: service.cost.completedContracts !== undefined
      ? `${completedContracts}/${service.cost.completedContracts} Completed Contracts`
      : formatCost(service.cost),
    summary: service.enabled ? "Confirm this service from the active player's phone." : (service.disabledReason ?? "Unavailable"),
    footer: service.risk ?? (service.enabled ? "Phone confirms" : "Unavailable"),
    tone: isSellService ? "sell" : service.risk ? "stock" : "service",
    enabled: service.enabled,
    icon
  };
}

function stockPreview(stock: NonNullable<PublicShopEncounterState["revealedStock"]>[number]): ShopPreviewCard {
  const artCardType = stock.type === "artifact" ? "artifact" : getGearCardArtType(stock.cardId);
  const artCardId = stock.type === "artifact" ? getGearCardArtId(stock.cardId, "artifact") : getGearCardArtId(stock.cardId);

  return {
    id: `stock-${stock.cardId}`,
    eyebrow: stock.shopCategories?.[0] ? formatShopCategory(stock.shopCategories[0]) : toTitleCase(stock.type),
    title: stock.name,
    cost: formatCost(stock.cost),
    summary: stock.summary,
    footer: stock.disabledReason ?? (stock.affordable ? "Available" : "Not enough Salvage"),
    tone: "stock",
    enabled: stock.affordable && !stock.disabledReason,
    icon: "stock",
    artCardType,
    artCardId
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
    enabled: false,
    icon: "lock"
  };
}

function emptyPreview(): ShopPreviewCard {
  return {
    id: "empty-stock",
    eyebrow: "Stock",
    title: "No equipment available",
    cost: "-",
    summary: "No equipment stock is available from this shop right now.",
    footer: "Awaiting phone action",
    tone: "empty",
    enabled: false,
    icon: "crate"
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

  return shopEncounter.services.slice(0, 4).map((service) => servicePreview(service, shopEncounter.activePlayer.completedContracts));
}

function buildShopType(shopEncounter: PublicShopEncounterState): string {
  if (shopEncounter.shopType) {
    return shopEncounter.shopType;
  }

  const boardSpace = getBoardSpace(shopEncounter.sectorId);
  const serviceTags = boardSpace?.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine") ?? [];

  return serviceTags.map(toTitleCase).join(" / ") || toTitleCase(boardSpace?.tier ?? "shop");
}

function shopResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const shopTypes = new Set<ResultDelta["type"]>(["itemBought", "itemSold", "salvage", "wound", "scarGained", "shopUnlocked"]);

  return (deltas ?? []).filter((delta) => delta.source?.startsWith("shop:") || shopTypes.has(delta.type));
}

function buildFromPayload(shopEncounter: PublicShopEncounterState, resultDeltas: ResultDelta[]): HostShopDisplayModel {
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
    riskActive: shopEncounter.status === "dangerous" || shopEncounter.services.some((service) => Boolean(service.risk)),
    transactionComplete: Boolean(shopEncounter.recentOutcome),
    transactionTitle: shopEncounter.recentOutcome?.gained
      ? `Bought ${shopEncounter.recentOutcome.gained}`
      : shopEncounter.recentOutcome?.sold
        ? `Sold ${shopEncounter.recentOutcome.sold}`
        : shopEncounter.recentOutcome ? "Shop action complete" : null,
    outcome: shopEncounter.recentOutcome?.summary ?? null,
    guidance: isBlocked ? "Clear the threat lock before trade resumes." : "Choose on player phone",
    resultDeltas
  };
}

function buildFallbackModel(activePlayer: PublicPlayer, playerName: string): HostShopDisplayModel | null {
  const space = getBoardSpace(activePlayer.sectorId);

  if (!space || !space.tags.some((tag) => tag === "shop" || tag === "risk-shop")) {
    return null;
  }

  const serviceTags = space.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "salvage" || tag === "recovery" || tag === "shrine");
  const status: ShopStatus = space.tags.includes("risk-shop") ? "DANGEROUS" : "OPEN";

  return {
    playerName,
    salvage: activePlayer.character.salvage ?? null,
    shopName: space.name,
    sectorName: space.name,
    shopType: serviceTags.map(toTitleCase).join(" / ") || toTitleCase(space.tier),
    shopCategory: "Public Shop",
    status,
    statusCopy: `Waiting on ${playerName} to choose a shop service.`,
    stockCount: 0,
    sellableCount: 0,
    threatLockCount: 0,
    blockedReasonText: null,
    blockingLanes: [],
    previewCards: [emptyPreview()],
    stockRevealed: false,
    riskActive: status === "DANGEROUS",
    transactionComplete: false,
    transactionTitle: null,
    outcome: null,
    guidance: "Choose on player phone",
    resultDeltas: []
  };
}

function buildShopModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostShopDisplayModel | null {
  return patch.payload.shopEncounter
    ? buildFromPayload(patch.payload.shopEncounter, shopResultDeltas(patch.payload.publicResultDeltas))
    : buildFallbackModel(
        activePlayer,
        patch.payload.seats.find((seat) => seat.seatId === activePlayer.seatId)?.displayName ?? activePlayer.character.name
      );
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
      <div className="host-shop-preview-media" aria-hidden="true">
        {card.artCardId && card.artCardType ? (
          <CardArtImage cardType={card.artCardType} cardId={card.artCardId} alt="" />
        ) : (
          <ShopActionIcon icon={card.icon} />
        )}
      </div>
      <p>{card.summary}</p>
      <div className="host-shop-preview-cost">
        <strong>{card.cost}</strong>
        <em>{card.footer}</em>
      </div>
    </article>
  );
}

function ShopActionIcon({ icon }: { icon: ShopIcon }): ReactElement {
  const paths: Record<ShopIcon, ReactElement> = {
    anvil: <path d="M5 7h14l-2 4h-4v3h3v3H8v-3h3v-3H7L5 7Zm3-3h8v2H8V4Z" />,
    crate: <path d="M4 6h16v14H4V6Zm2 2v2h12V8H6Zm0 4v6h5v-6H6Zm7 0v6h5v-6h-5ZM7 3h10v2H7V3Z" />,
    repair: <path d="m5 4 3 3-2 2-3-3v4l4 2 7 7 3-3-7-7-2-4-3-1Zm11 0a5 5 0 0 0-4 7l2-2 2 2-2 2a5 5 0 0 0 6-6l-3 3-2-2 3-3-2-1Z" />,
    sell: <path d="M3 5h10l8 8-8 8-8-8V5Zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 4h2v2h-2v2h-2v-2h-2v-2h2v-2h2v2Z" />,
    lock: <path d="M7 10V7a5 5 0 0 1 10 0v3h2v11H5V10h2Zm2 0h6V7a3 3 0 0 0-6 0v3Zm3 3a2 2 0 0 0-1 3.73V19h2v-2.27A2 2 0 0 0 12 13Z" />,
    stock: <path d="M4 4h16v5H4V4Zm1 7h14v9H5v-9Zm4 2v2h6v-2H9Z" />
  };

  return <svg viewBox="0 0 24 24" focusable="false">{paths[icon]}</svg>;
}

function HostShopCardBackdrop({ cards }: { cards: ShopPreviewCard[] }): ReactElement {
  const atmosphericCards = Array.from({ length: Math.max(3, Math.min(5, cards.length || 3)) }, (_, index) => cards[index % Math.max(cards.length, 1)] ?? emptyPreview());

  return (
    <div className="host-shop-card-backdrop" aria-hidden="true" data-testid="host-shop-card-backdrop">
      {atmosphericCards.map((card, index) => (
        <div key={`${card.id}-${index}`} style={{ "--shop-backdrop-index": index } as CSSProperties}>
          {card.artCardId && card.artCardType ? (
            <CardArtImage cardType={card.artCardType} cardId={card.artCardId} alt="" />
          ) : (
            <ShopActionIcon icon={card.icon} />
          )}
        </div>
      ))}
    </div>
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
          <HostShopCardBackdrop cards={model.previewCards} />
          <div className="host-shop-heading">
            <span>{model.shopCategory}</span>
            <h2>{model.sectorName}</h2>
            <p>{model.shopName !== model.sectorName ? `${model.shopName} · ${model.shopType}` : model.shopType}</p>
          </div>

          <section className="host-shop-preview-grid" aria-label="Public shop preview">
            {model.previewCards.map((card, index) => (
              <HostShopPreviewCard key={card.id} card={card} index={index} />
            ))}
          </section>

          {model.transactionComplete && (
            <section className="host-shop-transaction-focus" role="status" aria-live="polite" data-testid="host-shop-transaction-focus">
              <span>Transaction complete</span>
              <strong>{model.transactionTitle}</strong>
              <p>{model.outcome}</p>
              <ResultDeltaRow deltas={model.resultDeltas} publicOnly className="host-shop-delta-row" />
            </section>
          )}

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

        {!model.transactionComplete && (model.outcome || model.resultDeltas.length > 0 || model.status === "BLOCKED") && (
          <section className="host-shop-outcome" aria-label="Market result" data-testid="host-shop-outcome">
            <p>{model.outcome ?? model.blockedReasonText ?? "Trade is suspended."}</p>
            <ResultDeltaRow deltas={model.resultDeltas} publicOnly className="host-shop-delta-row" />
          </section>
        )}
      </div>
    </section>
  );
}
