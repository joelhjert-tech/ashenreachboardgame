import type { CSSProperties } from "react";
import type { PublicPatchPayload, PublicPlayer, PublicSeat } from "../shared/types.js";

export type OperativePieceVariant = "heraldic-reliquary" | "operative-bust";
export type PlayerHeraldry = "circle" | "diamond" | "triangle" | "cross" | "hexagon" | "split-shield";
export type OperativeTopper = "blade" | "crown" | "horn" | "beacon" | "halo" | "spire" | "gear" | "claw" | "rune" | "antenna";

export interface OperativePieceIdentity {
  seatId: string;
  seatIndex: number;
  playerName: string;
  operativeName: string;
  characterId: string;
  sectorId: string;
  initials: string;
  color: string;
  colorSoft: string;
  heraldry: PlayerHeraldry;
  topper: OperativeTopper;
}

export interface FormationPoint {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

const playerColors = [
  ["#e6a33b", "#ffe3a3"],
  ["#57aee8", "#bfe7ff"],
  ["#c75b65", "#ffc1c8"],
  ["#8abf6f", "#d8ffc4"],
  ["#a47bd8", "#e5d0ff"],
  ["#d8d0bf", "#ffffff"]
] as const;

const heraldry: PlayerHeraldry[] = ["circle", "diamond", "triangle", "cross", "hexagon", "split-shield"];
const toppers: OperativeTopper[] = ["blade", "crown", "horn", "beacon", "halo", "spire", "gear", "claw", "rune", "antenna"];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getPlayerInitials(displayName: string | null | undefined): string {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "AR";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function buildOperativePieceIdentities(
  seats: PublicSeat[],
  players: PublicPlayer[]
): OperativePieceIdentity[] {
  const playerBySeat = new Map(players.map((player) => [player.seatId, player] as const));

  return seats
    .filter((seat) => seat.displayName && !seat.kicked)
    .flatMap<OperativePieceIdentity>((seat, seatIndex) => {
      const player = playerBySeat.get(seat.seatId);
      if (!player) return [];
      const palette = playerColors[seatIndex % playerColors.length]!;
      return [{
        seatId: seat.seatId,
        seatIndex,
        playerName: seat.displayName ?? player.character.name,
        operativeName: player.character.name,
        characterId: player.character.id,
        sectorId: player.sectorId,
        initials: getPlayerInitials(seat.displayName),
        color: palette[0],
        colorSoft: palette[1],
        heraldry: heraldry[seatIndex % heraldry.length]!,
        topper: toppers[stableHash(player.character.id) % toppers.length]!
      }];
    });
}

const formationPoints: Record<number, Array<[number, number, number]>> = {
  1: [[50, 52, 1]],
  2: [[43, 56, 0.94], [57, 48, 0.94]],
  3: [[50, 44, 0.9], [40, 59, 0.88], [60, 59, 0.88]],
  4: [[40, 42, 0.84], [60, 42, 0.84], [40, 66, 0.84], [60, 66, 0.84]],
  5: [[50, 42, 0.8], [38, 52, 0.78], [62, 52, 0.78], [43, 64, 0.78], [57, 64, 0.78]],
  6: [[50, 40, 0.76], [38, 49, 0.74], [62, 49, 0.74], [39, 63, 0.74], [61, 63, 0.74], [50, 68, 0.76]]
};

export function getFormationPoints(count: number, activeIndex = -1, focused = true): FormationPoint[] {
  const boundedCount = Math.max(1, Math.min(6, count));
  const points = formationPoints[boundedCount]!;
  const spread = focused ? 1 : 0.82;

  return points.map(([x, y, scale], index) => ({
    x: 50 + (x - 50) * spread,
    y: 54 + (y - 54) * spread,
    scale: scale * (index === activeIndex ? 1.1 : 1),
    zIndex: index === activeIndex ? 100 : 5 + Math.round(y)
  }));
}

export function getPieceStyle(identity: OperativePieceIdentity, point: FormationPoint): CSSProperties {
  return {
    "--piece-x": `${point.x}%`,
    "--piece-y": `${point.y}%`,
    "--piece-scale": point.scale,
    "--piece-color": identity.color,
    "--piece-color-soft": identity.colorSoft,
    zIndex: point.zIndex
  } as CSSProperties;
}

export function getDevPieceVariant(search: string): OperativePieceVariant {
  if (!import.meta.env.DEV) return "heraldic-reliquary";
  return new URLSearchParams(search).get("pieceVariant") === "operative-bust"
    ? "operative-bust"
    : "heraldic-reliquary";
}

export function getPublicOccupantSummary(identities: OperativePieceIdentity[]): string {
  return identities.map((identity) => `${identity.playerName}, ${identity.operativeName}`).join("; ");
}

export function getSectorOccupants(
  payload: Pick<PublicPatchPayload, "seats" | "players">,
  sectorId: string,
  movingSeatId?: string | null,
  movingSectorId?: string | null
): OperativePieceIdentity[] {
  return buildOperativePieceIdentities(payload.seats, payload.players)
    .map((identity) => identity.seatId === movingSeatId && movingSectorId
      ? { ...identity, sectorId: movingSectorId }
      : identity)
    .filter((identity) => identity.sectorId === sectorId)
    .sort((left, right) => left.seatIndex - right.seatIndex);
}
