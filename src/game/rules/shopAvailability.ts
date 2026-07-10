import type { BoardSpaceDefinition } from "../data/boardSpaces.js";
import type { Character } from "../schema/character.schema.js";
import type { GearItem, ShopCategory } from "../schema/gear.schema.js";
import { filterGearByShopCategory, getGearShopCategories, isGearInShopCategory, SHOP_CATEGORY_LABELS } from "./shopCategories.js";

export const SHOP_FAILURE_REASONS = {
  notAtShop: "notAtShop",
  shopBlockedByThreat: "shopBlockedByThreat",
  insufficientSalvage: "insufficientSalvage",
  itemUnavailable: "itemUnavailable",
  inventoryFull: "inventoryFull",
  itemNotHeld: "itemNotHeld",
  itemNotSellable: "itemNotSellable",
  invalidItem: "invalidItem"
} as const;

export type ShopFailureReason = (typeof SHOP_FAILURE_REASONS)[keyof typeof SHOP_FAILURE_REASONS];

export const SHOP_FAILURE_LABELS: Record<ShopFailureReason, string> = {
  notAtShop: "No shop is available on this sector.",
  shopBlockedByThreat: "Clear the local threat before shopping.",
  insufficientSalvage: "Not enough Salvage.",
  itemUnavailable: "That item is not available from this shop.",
  inventoryFull: "Inventory is full.",
  itemNotHeld: "That item is not in your held inventory.",
  itemNotSellable: "That item cannot be sold.",
  invalidItem: "That item cannot be sold here."
};

export type ShopStockServiceId = "buy-gear" | "risk-action";

const shopCapableTags = new Set(["shop", "risk-shop", "salvage", "recovery", "shrine"]);

export function isBoardSpaceShopCapable(boardSpace: BoardSpaceDefinition): boolean {
  return boardSpace.tags.some((tag) => shopCapableTags.has(tag));
}

export function getBoardSpaceShopCategory(boardSpace: BoardSpaceDefinition): ShopCategory {
  if (boardSpace.tags.includes("risk-shop")) {
    return "relic-dealer";
  }

  if (boardSpace.tags.includes("recovery") || boardSpace.tags.includes("shrine")) {
    return "medicae-shrine";
  }

  if (boardSpace.tags.includes("salvage") || boardSpace.id.includes("foundry")) {
    return "forge-armoury";
  }

  if (boardSpace.tags.includes("contract")) {
    return "contract-broker";
  }

  return "market";
}

export function getBoardSpaceShopTypeLabel(boardSpace: BoardSpaceDefinition): string {
  return SHOP_CATEGORY_LABELS[getBoardSpaceShopCategory(boardSpace)];
}

export function getShopStockCategoryForService(
  boardSpace: BoardSpaceDefinition,
  serviceId: string
): ShopCategory | null {
  if (serviceId === "risk-action") {
    return "relic-dealer";
  }

  if (serviceId === "buy-gear") {
    return getBoardSpaceShopCategory(boardSpace);
  }

  return null;
}

export function getShopGearCost(item: GearItem): number {
  if (item.cost !== undefined) {
    return item.cost;
  }

  if (item.tier === "artifact") {
    return 5;
  }

  if (item.tier === "advanced") {
    return 4;
  }

  if (item.tier === "starter") {
    return 2;
  }

  return 3;
}

export function getShopGearSellValue(item: GearItem): number | null {
  if (item.sellValue !== undefined) {
    return item.sellValue;
  }

  if (item.cost !== undefined) {
    return Math.max(1, Math.floor(item.cost / 2));
  }

  if (item.tier !== undefined) {
    return Math.max(1, Math.floor(getShopGearCost(item) / 2));
  }

  return null;
}

export function isQaShopGear(item: GearItem): boolean {
  return item.id.startsWith("qa_") || item.id.startsWith("qa-alpha");
}

export function canUseQaShopGear(character: Pick<Character, "id" | "qaOnly">): boolean {
  return character.qaOnly === true || character.id === "char_master_alpha";
}

export function getGearSellRestriction(
  item: GearItem,
  character: Pick<Character, "id" | "qaOnly">
): ShopFailureReason | undefined {
  if (isQaShopGear(item) && !canUseQaShopGear(character)) {
    return SHOP_FAILURE_REASONS.itemNotSellable;
  }

  if (item.sellable === false) {
    return SHOP_FAILURE_REASONS.itemNotSellable;
  }

  if ((item.category === "contractObject" || item.category === "followerLinked") && item.sellable !== true) {
    return SHOP_FAILURE_REASONS.itemNotSellable;
  }

  if (getShopGearSellValue(item) === null) {
    return SHOP_FAILURE_REASONS.itemNotSellable;
  }

  return undefined;
}

export function getAvailableShopStockForCategory(
  items: Iterable<GearItem>,
  category: ShopCategory,
  options: {
    ownedGearIds?: ReadonlySet<string>;
    includeArtifacts?: boolean;
    includeQaGear?: boolean;
    count?: number;
    expensiveFirst?: boolean;
  } = {}
): GearItem[] {
  const ownedGearIds = options.ownedGearIds ?? new Set<string>();

  const stock = filterGearByShopCategory(items, category)
    .filter((item) => !ownedGearIds.has(item.id))
    .filter((item) => item.tier === "artifact" ? options.includeArtifacts === true : item.normalShopCommon !== false)
    .filter((item) => options.includeQaGear === true || !isQaShopGear(item))
    .sort((left, right) => {
      const costDelta = options.expensiveFirst
        ? getShopGearCost(right) - getShopGearCost(left)
        : getShopGearCost(left) - getShopGearCost(right);
      return costDelta || left.name.localeCompare(right.name);
    });

  return options.count === undefined ? stock : stock.slice(0, options.count);
}

export function isGearAvailableFromShopCategory(item: GearItem, category: ShopCategory): boolean {
  return isGearInShopCategory(item, category);
}

export function getGearShopCategoryIds(item: GearItem): ShopCategory[] {
  return getGearShopCategories(item);
}
