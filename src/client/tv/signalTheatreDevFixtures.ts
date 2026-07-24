import type { PublicPlayer, PublicSeat } from "../shared/types.js";
import {
  buildOperativePieceIdentities,
  type OperativePieceIdentity
} from "./operativePiecePresentation.js";
import type { SignalJourneyPhase } from "./useSignalTheatreJourney.js";

export const signalTheatreFixtureIds = [
  "one-operative",
  "two-operatives",
  "three-operatives",
  "six-operatives",
  "active-operative",
  "long-names",
  "missing-portrait",
  "bright-sector",
  "dark-sector",
  "movement",
  "cross-ring",
  "arrival",
  "encounter-transition",
  "handoff",
  "reconnect",
  "reduced-motion",
  "victory-background",
  "defeat-background"
] as const;

export type SignalTheatreFixtureId = typeof signalTheatreFixtureIds[number];

export interface SignalTheatreDevFixture {
  id: SignalTheatreFixtureId;
  sectorId: string;
  count: number;
  activeIndex: number;
  motionPhase: SignalJourneyPhase | null;
  endgameTone: "victory" | "defeat" | null;
  longNames?: boolean;
  missingPortrait?: boolean;
}

const fixtureById: Record<SignalTheatreFixtureId, SignalTheatreDevFixture> = {
  "one-operative": { id: "one-operative", sectorId: "ashwake-crossing", count: 1, activeIndex: 0, motionPhase: null, endgameTone: null },
  "two-operatives": { id: "two-operatives", sectorId: "outer_waymarket", count: 2, activeIndex: 0, motionPhase: null, endgameTone: null },
  "three-operatives": { id: "three-operatives", sectorId: "ashen-chapel", count: 3, activeIndex: 1, motionPhase: null, endgameTone: null },
  "six-operatives": { id: "six-operatives", sectorId: "inner_cinder_lattice", count: 6, activeIndex: 2, motionPhase: null, endgameTone: null },
  "active-operative": { id: "active-operative", sectorId: "ashwake-crossing", count: 4, activeIndex: 1, motionPhase: null, endgameTone: null },
  "long-names": { id: "long-names", sectorId: "outer_relay_camp", count: 3, activeIndex: 0, motionPhase: null, endgameTone: null, longNames: true },
  "missing-portrait": { id: "missing-portrait", sectorId: "hollow-veil-yard", count: 2, activeIndex: 0, motionPhase: null, endgameTone: null, missingPortrait: true },
  "bright-sector": { id: "bright-sector", sectorId: "inner_cinder_lattice", count: 3, activeIndex: 0, motionPhase: null, endgameTone: null },
  "dark-sector": { id: "dark-sector", sectorId: "deadwater-marsh", count: 3, activeIndex: 0, motionPhase: null, endgameTone: null },
  movement: { id: "movement", sectorId: "shattered-causeway", count: 2, activeIndex: 0, motionPhase: "travel", endgameTone: null },
  "cross-ring": { id: "cross-ring", sectorId: "middle_guardian_span", count: 2, activeIndex: 0, motionPhase: "travel", endgameTone: null },
  arrival: { id: "arrival", sectorId: "ashen-chapel", count: 2, activeIndex: 0, motionPhase: "arrival", endgameTone: null },
  "encounter-transition": { id: "encounter-transition", sectorId: "reavers-den", count: 2, activeIndex: 0, motionPhase: "arrival", endgameTone: null },
  handoff: { id: "handoff", sectorId: "outer_oathpost", count: 4, activeIndex: 3, motionPhase: null, endgameTone: null },
  reconnect: { id: "reconnect", sectorId: "flooded-locks", count: 4, activeIndex: 0, motionPhase: null, endgameTone: null },
  "reduced-motion": { id: "reduced-motion", sectorId: "transit-gate", count: 4, activeIndex: 0, motionPhase: null, endgameTone: null },
  "victory-background": { id: "victory-background", sectorId: "center_cinder_gate", count: 6, activeIndex: 0, motionPhase: null, endgameTone: "victory" },
  "defeat-background": { id: "defeat-background", sectorId: "center_cinder_gate", count: 6, activeIndex: 0, motionPhase: null, endgameTone: "defeat" }
};

export function getSignalTheatreDevFixture(search: string): SignalTheatreDevFixture | null {
  if (!import.meta.env.DEV) return null;
  const requested = new URLSearchParams(search).get("p22Fixture") as SignalTheatreFixtureId | null;
  return requested ? fixtureById[requested] ?? null : null;
}

export function buildSignalTheatreFixtureOccupants(
  fixture: SignalTheatreDevFixture,
  seats: PublicSeat[],
  players: PublicPlayer[]
): OperativePieceIdentity[] {
  const fallbackPlayer = players[0];
  const fixtureSeats: PublicSeat[] = [];
  const fixturePlayers: PublicPlayer[] = [];

  for (let index = 0; index < fixture.count; index += 1) {
    const sourceSeat = seats[index] ?? seats[0];
    const sourcePlayer = players[index] ?? fallbackPlayer;
    const seatId = `p22-seat-${index + 1}`;
    const playerName = fixture.longNames
      ? index === 0
        ? "Alexandria-of-the-Last-Relay"
        : `Expedition Keeper ${index + 1}`
      : sourceSeat?.displayName ?? `Player ${index + 1}`;
    const operativeName = fixture.longNames && index === 0
      ? "The Cartographer Who Outwalked the Static"
      : sourcePlayer?.character.name ?? `Operative ${index + 1}`;

    fixtureSeats.push({
      seatId,
      characterId: sourcePlayer?.character.id ?? "void-marshal",
      displayName: playerName,
      connected: true,
      ready: true,
      kicked: false
    });
    fixturePlayers.push({
      seatId,
      sectorId: fixture.sectorId,
      character: {
        ...(sourcePlayer?.character ?? {
          id: "void-marshal",
          archetype: "Operative",
          status: "active",
          activeContract: null,
          stats: { command: 1, grit: 1, signal: 1, guile: 1, forge: 1 },
          trophies: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }),
        id: fixture.missingPortrait && index === 0
          ? "missing-operative-portrait"
          : sourcePlayer?.character.id ?? "void-marshal",
        name: operativeName
      }
    });
  }

  return buildOperativePieceIdentities(fixtureSeats, fixturePlayers);
}
