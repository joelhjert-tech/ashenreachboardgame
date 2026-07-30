import {
  SIGNAL_PIECE_IDS,
  type SignalPieceId
} from "./signalPieceCatalog.js";

export const CARTOGRAPHY_OBJECTIVE_COIN_IDS = [
  "route",
  "challenge",
  "hunt",
  "service"
] as const;

export type CartographyObjectiveCoinId =
  typeof CARTOGRAPHY_OBJECTIVE_COIN_IDS[number];

export function getCartographyPlayerCoinPath(pieceId: SignalPieceId): string {
  return `/assets/riftfall/ui/signal-cartography/markers/players/${pieceId}.png`;
}

export function getCartographyObjectiveCoinPath(
  objectiveId: CartographyObjectiveCoinId
): string {
  return `/assets/riftfall/ui/signal-cartography/markers/objectives/${objectiveId}.png`;
}

export function getCartographyCoinAssetPaths(): string[] {
  return [
    ...SIGNAL_PIECE_IDS.map(getCartographyPlayerCoinPath),
    ...CARTOGRAPHY_OBJECTIVE_COIN_IDS.map(getCartographyObjectiveCoinPath)
  ];
}
