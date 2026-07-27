import type { ReactElement } from "react";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import {
  getCardArtPath,
  getGearCardArtId,
  getGearCardArtType,
  getHostShopCategoryIconPath,
  getSignalTheatreShopBackgroundPath,
  type HostShopIconCategory
} from "../shared/assetPaths.js";
import { HostImage } from "./HostImage.js";
import type {
  PublicPatchPayload,
  PublicPlayer,
  PublicShopCost,
  PublicShopEncounterState,
  ResultDelta,
  StatePatch
} from "../shared/types.js";
import { isHostShopActive } from "./hostShopState.js";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";

type ShopView = "categories" | "equipment" | "supplies" | "artifacts" | "route-aids" | "services" | "sell";
type CategoryId = "items" | "equipment" | "artifacts" | "route-aids" | "services" | "sell";

interface ShopCategoryModel {
  id: CategoryId;
  view: ShopView;
  label: string;
  description: string;
  count: number | null;
  available: boolean;
  blockedReason: string | null;
}

interface ShopOfferModel {
  id: string;
  name: string;
  kind: "stock" | "service";
  category: string;
  rules: string;
  lore: string | null;
  rarity: string;
  price: string;
  stock: number;
  available: boolean;
  disabledReason: string | null;
  artCardId: string | null;
  artCardType: CardImageType | null;
}

export interface HostShopDisplayModel {
  playerName: string;
  operativeName: string;
  shopName: string;
  sectorName: string;
  shopType: string;
  shopCategory: PublicShopEncounterState["shopCategory"];
  status: "open" | "locked" | "exhausted" | "dangerous";
  view: ShopView;
  categories: ShopCategoryModel[];
  offers: ShopOfferModel[];
  selectedOfferId: string | null;
  blockedReason: string | null;
  blockingThreatNames: string[];
  privateSelection: boolean;
  recentOutcome: PublicShopEncounterState["recentOutcome"];
  resultDeltas: ResultDelta[];
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCost(cost: PublicShopCost): string {
  const parts = [
    cost.salvage !== undefined ? `${cost.salvage} Salvage` : null,
    cost.wounds !== undefined ? `${cost.wounds} Wound${cost.wounds === 1 ? "" : "s"}` : null,
    cost.trophies !== undefined ? `${cost.trophies} Trophies` : null,
    cost.completedContracts !== undefined ? `${cost.completedContracts} Contracts` : null,
    cost.scars !== undefined ? `${cost.scars} Scars` : null
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(" + ") : "No payment";
}

function shopResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  return (deltas ?? []).filter((delta) => delta.source?.startsWith("shop:") || ["itemBought", "itemSold", "salvage", "wound", "scarGained"].includes(delta.type));
}

function getCategories(shop: PublicShopEncounterState): ShopCategoryModel[] {
  if (shop.presentation) {
    return shop.presentation.categories.map((category) => ({
      id: category.id,
      view: category.view,
      label: category.label,
      description: category.description,
      count: category.offerCount,
      available: category.available,
      blockedReason: category.unavailableReason ?? null
    }));
  }
  const find = (serviceId: string) => shop.services.find((service) => service.id === serviceId);
  const supplies = find("buy-supplies");
  const equipment = find("buy-gear");
  const artifacts = find("trade-missions-for-artifact");
  const routeAids = find("buy-route-aids");
  const localServices = shop.services.filter((service) => !["buy-gear", "buy-supplies", "buy-route-aids", "trade-missions-for-artifact", "sell-gear"].includes(service.id));
  return [
    supplies ? { id: "items", view: "supplies", label: "Items", description: "Field supplies and expendable necessities", count: shop.browseSelection?.view === "supplies" ? shop.revealedStock?.length ?? null : null, available: supplies.enabled, blockedReason: supplies.disabledReason ?? null } : null,
    equipment ? { id: "equipment", view: "equipment", label: "Equipment", description: "Tools, armour and battle hardware", count: shop.browseSelection?.view === "equipment" ? shop.revealedStock?.length ?? null : null, available: equipment.enabled, blockedReason: equipment.disabledReason ?? null } : null,
    artifacts ? { id: "artifacts", view: "artifacts", label: "Artifacts", description: "Sealed relics exchanged for completed Contracts", count: null, available: artifacts.enabled, blockedReason: artifacts.disabledReason ?? null } : null,
    routeAids ? { id: "route-aids", view: "route-aids", label: "Route Aids", description: "Charged guides and instruments", count: shop.browseSelection?.view === "route-aids" ? shop.revealedStock?.length ?? null : null, available: routeAids.enabled, blockedReason: routeAids.disabledReason ?? null } : null,
    localServices.length ? { id: "services", view: "services", label: "Services", description: "Repair, treatment and local work", count: localServices.length, available: localServices.some((service) => service.enabled), blockedReason: localServices.find((service) => !service.enabled)?.disabledReason ?? null } : null,
    (shop.sellableCount ?? 0) > 0 ? { id: "sell", view: "sell", label: "Sell", description: "Offer carried Equipment for Salvage", count: shop.sellableCount ?? 0, available: true, blockedReason: null } : null
  ].filter((entry): entry is ShopCategoryModel => Boolean(entry));
}

function getOffers(shop: PublicShopEncounterState, view: ShopView): ShopOfferModel[] {
  if (view === "equipment" || view === "supplies" || view === "artifacts" || view === "route-aids") {
    return (shop.revealedStock ?? []).map((stock) => ({
      id: stock.cardId,
      name: stock.name,
      kind: "stock",
      category: stock.shopCategories?.map(titleCase).join(" / ") ?? titleCase(stock.type),
      rules: stock.summary,
      lore: stock.lore ?? null,
      rarity: titleCase(stock.rarity ?? (stock.type === "artifact" ? "artifact" : "standard")),
      price: formatCost(stock.cost),
      stock: stock.stock ?? 1,
      available: stock.affordable && !stock.disabledReason,
      disabledReason: stock.disabledReason ?? (!stock.affordable ? "Insufficient resources" : null),
      artCardId: stock.type === "follower"
        ? stock.artCardId ?? null
        : stock.type === "artifact"
          ? getGearCardArtId(stock.cardId, "artifact")
          : getGearCardArtId(stock.cardId),
      artCardType: stock.type === "follower"
        ? stock.artCardId ? "artifact" : null
        : stock.type === "artifact"
          ? "artifact"
          : getGearCardArtType(stock.cardId)
    }));
  }
  if (view === "services") {
    return shop.services
      .filter((service) => !["buy-gear", "buy-supplies", "buy-route-aids", "trade-missions-for-artifact", "sell-gear"].includes(service.id))
      .map((service) => ({
        id: service.id,
        name: service.label,
        kind: "service",
        category: service.shopCategory ? titleCase(service.shopCategory) : "Local Service",
        rules: service.risk ?? "The active player may confirm this service from their phone.",
        lore: null,
        rarity: "Service",
        price: formatCost(service.cost),
        stock: service.enabled ? 1 : 0,
        available: service.enabled,
        disabledReason: service.disabledReason ?? null,
        artCardId: null,
        artCardType: null
      }));
  }
  return [];
}

function buildFromEncounter(shop: PublicShopEncounterState, deltas: ResultDelta[]): HostShopDisplayModel {
  const view = shop.browseSelection?.view ?? "categories";
  const offers = getOffers(shop, view);
  const selectedOfferId = offers.some((offer) => offer.id === shop.browseSelection?.selectedId)
    ? shop.browseSelection?.selectedId ?? null
    : offers[0]?.id ?? null;
  return {
    playerName: shop.activePlayer.name,
    operativeName: shop.activePlayer.characterName,
    shopName: shop.shopName,
    sectorName: shop.sectorName,
    shopType: shop.shopType ?? "Reach Market",
    shopCategory: shop.shopCategory ?? "market",
    status: shop.status,
    view,
    categories: getCategories(shop),
    offers,
    selectedOfferId: shop.presentation?.selectedOfferId ?? selectedOfferId,
    blockedReason: shop.blockedReasonText ?? null,
    blockingThreatNames: shop.blockingThreats.map((threat) => threat.challenge
      ? `${threat.name} ${titleCase(threat.challenge.stat)} ${threat.challenge.value}`
      : threat.name),
    privateSelection: (view === "artifacts" || view === "sell") && offers.length === 0,
    recentOutcome: shop.recentOutcome,
    resultDeltas: deltas
  };
}

export function buildShopModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostShopDisplayModel | null {
  const shop = patch.payload.shopEncounter;
  if (!shop) return null;
  return buildFromEncounter(shop, shopResultDeltas(patch.payload.publicResultDeltas));
}

function ShopCategoryIcon({
  category,
  active = false
}: {
  category: HostShopIconCategory;
  active?: boolean;
}): ReactElement {
  return (
    <span
      className={`host-shop-category-icon host-shop-category-icon--${category}${active ? " is-active" : ""}`}
      data-shop-icon={category}
      aria-hidden="true"
    >
      <HostImage
        src={getHostShopCategoryIconPath(category)}
        alt=""
        fit="contain"
        aspectRatio="square"
        fallback="icon"
        draggable={false}
      />
    </span>
  );
}

function ShopEntrance({ model }: { model: HostShopDisplayModel }): ReactElement {
  if (model.categories.length === 0) {
    return (
      <main className="host-shop-empty-rack" data-testid="host-shop-empty-shop">
        <span>No trade paths</span>
        <h2>The stalls are empty</h2>
        <p>No stock, services or trades are available. The active player may leave from their phone.</p>
      </main>
    );
  }
  return (
    <main className="host-shop-chamber" data-testid="host-shop-category-chamber">
      <div className="host-shop-chamber-copy">
        <span>Available trade paths</span>
        <h2>Choose on player phone</h2>
        <p>Only services operating at this location are shown.</p>
      </div>
      <div className="host-shop-category-altars">
        {model.categories.map((category) => (
          <article key={category.id} className={`host-shop-category-altar${category.available ? "" : " host-shop-category-altar-locked"}`} data-testid={`host-shop-category-${category.id}`}>
            <div className="host-shop-category-sigil">
              <ShopCategoryIcon category={category.id} active={category.available} />
            </div>
            <span>{category.available ? (category.count === null ? "AVAILABLE" : `${category.count} READY`) : "LOCKED"}</span>
            <h3>{category.label}</h3>
            <p>{category.available ? category.description : category.blockedReason ?? "Requirements not met"}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

function OfferArt({ offer, quiet = false }: { offer: ShopOfferModel; quiet?: boolean }): ReactElement {
  if (offer.artCardId && offer.artCardType) {
    return <HostImage src={getCardArtPath(offer.artCardType, offer.artCardId)} alt={quiet ? "" : offer.name} fit="contain" aspectRatio="card" fallback="card" />;
  }
  return <div className="host-shop-service-sigil"><ShopCategoryIcon category="services" active={!quiet} /></div>;
}

function iconCategoryForView(view: ShopView): HostShopIconCategory {
  switch (view) {
    case "supplies":
      return "items";
    case "route-aids":
      return "route-aids";
    case "categories":
      return "services";
    default:
      return view;
  }
}

function ShopCarousel({ model }: { model: HostShopDisplayModel }): ReactElement {
  if (model.privateSelection) {
    const privateKind = model.view === "artifacts" ? "Artifact choices" : "Sale inventory";
    return (
      <main className="host-shop-private-vault" data-testid="host-shop-private-vault">
        <ShopCategoryIcon category={model.view === "artifacts" ? "artifacts" : "sell"} />
        <span>Owner-private selection</span>
        <h2>{privateKind} remain on the active player’s phone</h2>
        <p>The command table will reveal only the confirmed public transaction.</p>
      </main>
    );
  }

  if (!model.offers.length) {
    return (
      <main className="host-shop-empty-rack" data-testid="host-shop-empty-rack">
        <span>Stock aperture sealed</span>
        <h2>No public stock is revealed</h2>
        <p>{model.playerName} can return to the category chamber from their phone.</p>
      </main>
    );
  }

  const selectedIndex = Math.max(0, model.offers.findIndex((offer) => offer.id === model.selectedOfferId));
  const selected = model.offers[selectedIndex]!;
  const previous = model.offers[(selectedIndex - 1 + model.offers.length) % model.offers.length]!;
  const next = model.offers[(selectedIndex + 1) % model.offers.length]!;
  const hasSides = model.offers.length > 1;

  return (
    <main className="host-shop-rack" data-testid="host-shop-carousel">
      <section className="host-shop-rack-viewport" aria-label={`${model.view} stock carousel`}>
        {hasSides ? <article className="host-shop-rack-card host-shop-rack-card-previous" aria-hidden="true"><OfferArt offer={previous} quiet /></article> : null}
        <article key={selected.id} className={`host-shop-rack-card host-shop-rack-card-selected${selected.available ? "" : " host-shop-rack-card-locked"}`} data-testid="host-shop-selected-card">
          <div className="host-shop-rack-clamps" aria-hidden="true" />
          <OfferArt offer={selected} />
          <div className="host-shop-rack-card-label">
            <span>{selected.rarity}</span>
            <strong>{selected.name}</strong>
          </div>
        </article>
        {hasSides ? <article className="host-shop-rack-card host-shop-rack-card-next" aria-hidden="true"><OfferArt offer={next} quiet /></article> : null}
        <div className="host-shop-rack-index" aria-label={`${selectedIndex + 1} of ${model.offers.length}`}>
          {model.offers.map((offer, index) => <i key={offer.id} className={index === selectedIndex ? "is-selected" : ""} />)}
        </div>
      </section>

      <aside className="host-shop-dossier" aria-label="Selected offer details">
        <div className="host-shop-dossier-category">
          <ShopCategoryIcon category={iconCategoryForView(model.view)} active />
          <span>{selected.category}</span>
        </div>
        <h2>{selected.name}</h2>
        <div className="host-shop-dossier-meta">
          <strong>{selected.price}</strong>
          <em>{selected.stock > 0 ? `${selected.stock} in stock` : "Out of stock"}</em>
        </div>
        <p className="host-shop-dossier-rules">{selected.rules}</p>
        {selected.lore ? <p className="host-shop-dossier-lore">{selected.lore}</p> : null}
        <div className={`host-shop-eligibility ${selected.available ? "is-available" : "is-locked"}`}>
          <span>{selected.available ? "Eligible" : "Unavailable"}</span>
          <strong>{selected.available ? "Awaiting phone confirmation" : selected.disabledReason ?? "This offer is locked"}</strong>
        </div>
      </aside>
    </main>
  );
}

function TransactionResult({ model }: { model: HostShopDisplayModel }): ReactElement | null {
  const outcome = model.recentOutcome;
  if (!outcome && !model.resultDeltas.length) return null;
  const artifactChoicePending = model.view === "artifacts" && !outcome?.gained;
  const title = artifactChoicePending
    ? "Relic requisition in progress"
    : outcome?.gained ? `${outcome.gained} acquired` : outcome?.sold ? `${outcome.sold} sold` : "Transaction resolved";
  return (
    <section className="host-shop-transaction" role="status" aria-live="polite" data-testid="host-shop-transaction-focus">
      <span>{artifactChoicePending ? "Private owner choice" : "Authoritative transaction"}</span>
      <h2>{title}</h2>
      <p>{artifactChoicePending ? "Waiting for the operative to choose privately on their phone. Completed Missions remain unspent until confirmation." : outcome?.summary ?? "The server confirmed the public shop result."}</p>
      <ResultDeltaRow deltas={model.resultDeltas} publicOnly className="host-shop-transaction-deltas" />
    </section>
  );
}

export function HostShopOverlay({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
}): ReactElement | null {
  if (!patch || !activePlayer || !isHostShopActive(patch, activePlayer)) return null;
  const model = buildShopModel(patch, activePlayer);
  if (!model) return null;

  return (
    <section className={`host-shop-overlay host-shop-rebuild host-shop-view-${model.view} host-shop-state-${model.status}`} aria-label="Shop services" data-testid="host-shop-overlay">
      <HostImage
        src={getSignalTheatreShopBackgroundPath(model.shopCategory)}
        alt=""
        fit="cover"
        aspectRatio="wide"
        fallback="map"
        className="host-shop-establishment-background"
        aria-hidden="true"
      />
      <div className="host-shop-establishment-shade" aria-hidden="true" />
      <div className="host-shop-atmosphere" aria-hidden="true"><i /><i /><i /></div>
      <header className="host-shop-identity-rail">
        <div><span>{model.status === "locked" ? "Shop blocked" : "Shop open"} · {model.shopType}</span><h1>{model.shopName}</h1><small>{model.sectorName}</small></div>
        <div className="host-shop-buyer"><span>Active buyer</span><strong>{model.playerName}</strong><small>{model.operativeName}</small></div>
        <div className="host-shop-public-state"><span>Public status</span><strong>{model.recentOutcome ? "Transaction resolved" : "Browsing on phone"}</strong></div>
      </header>

      {model.status === "locked" ? (
        <main className="host-shop-lockdown" data-testid="host-shop-lockdown">
          <ShopCategoryIcon category="equipment" />
          <span>Trade lockdown</span>
          <h2>{model.blockedReason ?? "Local threat blocks the market"}</h2>
          <p>{model.blockingThreatNames.join(" · ") || "Clear the threat before the requisition chamber reopens."}</p>
        </main>
      ) : model.view === "categories" ? <ShopEntrance model={model} /> : <ShopCarousel model={model} />}

      <footer className="host-shop-command-rail">
        <span>Player phone controls this market · Signal Cartography locked</span>
        <strong>{model.view === "categories" ? `Waiting for ${model.playerName} to choose a category` : `${titleCase(model.view)} · ${model.offers.length || "sealed"} public offers`}</strong>
      </footer>
      <TransactionResult model={model} />
    </section>
  );
}
