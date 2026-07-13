export const CARD_IMAGE_TYPES = ["threat", "contract", "anomaly", "artifact", "equipment", "scar", "escalation"] as const;

export type CardImageType = (typeof CARD_IMAGE_TYPES)[number];
export type ThreatCardArtLane = "red" | "blue" | "yellow";

export type CardImageAssetType =
  | "contractCardArt"
  | "anomalyCardArt"
  | "artifactCardArt"
  | "equipmentCardArt"
  | "scarCardArt"
  | "escalationCardArt"
  | "threatCardArt";

export interface CardImagePromptCatalogEntry {
  assetId: string;
  assetType: CardImageAssetType;
  cardId: string;
  cardType: CardImageType;
  fallbackPath: string;
  fileName: string;
  negativePrompt: string;
  outputPath: string;
  prompt: string;
  title: string;
  usage: string;
}

export const CARD_IMAGE_FALLBACK_PATHS: Record<CardImageType, string> = {
  threat: "/assets/cards/fallbacks/threat.svg",
  contract: "/assets/cards/fallbacks/contract.svg",
  anomaly: "/assets/cards/fallbacks/anomaly.svg",
  artifact: "/assets/cards/fallbacks/artifact.svg",
  equipment: "/assets/cards/fallbacks/equipment.svg",
  scar: "/assets/cards/fallbacks/scar.svg",
  escalation: "/assets/cards/fallbacks/escalation.svg"
};

export const CARD_IMAGE_OUTPUT_DIRECTORIES: Record<CardImageType, string> = {
  threat: "/assets/cards/threats",
  contract: "/assets/cards/contracts",
  anomaly: "/assets/cards/anomalies",
  artifact: "/assets/cards/artifacts",
  equipment: "/assets/cards/equipment",
  scar: "/assets/cards/scars",
  escalation: "/assets/cards/escalations"
};

const THREAT_CARD_ART_LANES = new Set<ThreatCardArtLane>(["red", "blue", "yellow"]);

const CARD_IMAGE_ASSET_TYPES: Record<CardImageType, CardImageAssetType> = {
  threat: "threatCardArt",
  contract: "contractCardArt",
  anomaly: "anomalyCardArt",
  artifact: "artifactCardArt",
  equipment: "equipmentCardArt",
  scar: "scarCardArt",
  escalation: "escalationCardArt"
};

export function getCardArtAssetType(cardType: CardImageType): CardImageAssetType {
  return CARD_IMAGE_ASSET_TYPES[cardType];
}

export function getCardArtAssetId(cardType: CardImageType, cardId: string): string {
  return `${cardType}_art_${cardId}`;
}

export function getCardArtOutputPath(cardType: CardImageType, cardId: string, threatLane?: ThreatCardArtLane): string {
  if (cardType === "threat") {
    if (!threatLane || !THREAT_CARD_ART_LANES.has(threatLane)) {
      throw new Error(`Threat card art path requires a canonical threatLane for ${cardId}`);
    }

    return `${CARD_IMAGE_OUTPUT_DIRECTORIES[cardType]}/${threatLane}/${cardId}.png`;
  }

  return `${CARD_IMAGE_OUTPUT_DIRECTORIES[cardType]}/${cardId}.png`;
}

export function getCardArtFileName(cardId: string): string {
  return `${cardId}.png`;
}

export function getCardFallbackArtPath(cardType: CardImageType): string {
  return CARD_IMAGE_FALLBACK_PATHS[cardType];
}
