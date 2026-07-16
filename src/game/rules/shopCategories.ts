import type { GearItem, ShopCategory } from "../schema/gear.schema.js";

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  "forge-armoury": "Forge / Armoury",
  market: "Market",
  "medicae-shrine": "Medicae / Shrine",
  "relic-dealer": "Relic Dealer",
  "contract-broker": "Contract Broker"
};

export function getGearShopCategories(item: GearItem): ShopCategory[] {
  if (item.shopCategories && item.shopCategories.length > 0) {
    return item.shopCategories;
  }

  if (item.category === "contractObject") {
    return ["contract-broker"];
  }

  if (item.category === "chargedRelic" || item.tier === "artifact") {
    return ["relic-dealer"];
  }

  if (item.category === "consumable" && item.activeText?.toLowerCase().match(/heal|wound|scar/)) {
    return ["medicae-shrine"];
  }

  if (item.slot === "weapon" || item.slot === "armor") {
    return ["forge-armoury"];
  }

  return ["market"];
}

export function isGearInShopCategory(item: GearItem, category: ShopCategory): boolean {
  return getGearShopCategories(item).includes(category);
}

export function filterGearByShopCategory(items: Iterable<GearItem>, category: ShopCategory): GearItem[] {
  return [...items].filter((item) => isGearInShopCategory(item, category));
}
