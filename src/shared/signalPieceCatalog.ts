export const SIGNAL_PIECE_IDS = [
  "beacon",
  "bastion",
  "lantern",
  "harrow",
  "reliquary",
  "compass"
] as const;

export type SignalPieceId = typeof SIGNAL_PIECE_IDS[number];

export interface SignalPieceDefinition {
  id: SignalPieceId;
  name: string;
  shortDescription: string;
}

export const SIGNAL_PIECES: readonly SignalPieceDefinition[] = [
  { id: "beacon", name: "Beacon", shortDescription: "Tall split signal crown" },
  { id: "bastion", name: "Bastion", shortDescription: "Broad fortress silhouette" },
  { id: "lantern", name: "Lantern", shortDescription: "Caged halo reliquary" },
  { id: "harrow", name: "Harrow", shortDescription: "Forked directional blade" },
  { id: "reliquary", name: "Reliquary", shortDescription: "Ancient split shield" },
  { id: "compass", name: "Compass", shortDescription: "Four-point signal crown" }
] as const;

export function isSignalPieceId(value: unknown): value is SignalPieceId {
  return typeof value === "string" && (SIGNAL_PIECE_IDS as readonly string[]).includes(value);
}

export function getSignalPieceIdForSeat(seatIndex: number): SignalPieceId {
  return SIGNAL_PIECE_IDS[Math.max(0, seatIndex) % SIGNAL_PIECE_IDS.length]!;
}

export function getSignalPieceAssetPath(pieceId: SignalPieceId): string {
  return `/assets/riftfall/ui/signal-theatre/player-pieces/${pieceId}.png`;
}
