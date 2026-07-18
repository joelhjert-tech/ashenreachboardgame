export interface SeatIdentity {
  color: string;
  index: number;
  number: number;
  initial: string;
  pattern: "solid" | "stripe" | "dot" | "cross" | "dash" | "ring";
}

const SEAT_COLORS = ["#7fb2d8", "#d9a35d", "#d86f6f", "#7cc3a6", "#dfd8c5", "#a98fd1"] as const;
const SEAT_PATTERNS: SeatIdentity["pattern"][] = ["solid", "stripe", "dot", "cross", "dash", "ring"];

export function getSeatIdentity(index: number, displayName: string): SeatIdentity {
  const normalizedIndex = Math.max(0, index) % SEAT_COLORS.length;
  const initial = displayName.trim().charAt(0).toLocaleUpperCase() || String(normalizedIndex + 1);
  return {
    color: SEAT_COLORS[normalizedIndex],
    index: normalizedIndex,
    number: normalizedIndex + 1,
    initial,
    pattern: SEAT_PATTERNS[normalizedIndex]
  };
}
