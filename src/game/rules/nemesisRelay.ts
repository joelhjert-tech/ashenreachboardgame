import type { RandomSource } from "../engine/dice.js";
import type { Stat } from "../schema/character.schema.js";
import type { GameState, NemesisChampion, PlayerState } from "../schema/session.schema.js";

export const ASHEN_CROWN_NEXUS_SECTOR_ID = "center_cinder_gate";

type NemesisTemplate = Omit<NemesisChampion, "boundPlayerId" | "sectorId" | "defeated" | "trophies">;

const NEMESIS_TEMPLATES: NemesisTemplate[] = [
  {
    id: "nemesis_iron_vicar_orm",
    name: "Iron Vicar Orm",
    type: "Machine Priest",
    strength: 5,
    tech: 4,
    health: 5,
    maxHealth: 5,
    movementProfile: "center_path",
    combatProfile: "choice",
    specialRuleId: "no_additional_effect"
  },
  {
    id: "nemesis_pale_huntress",
    name: "The Pale Huntress",
    type: "Void Assassin",
    strength: 4,
    will: 5,
    health: 4,
    maxHealth: 4,
    movementProfile: "hunt_wounded",
    combatProfile: "choice",
    specialRuleId: "hunt_wounded_operative"
  },
  {
    id: "nemesis_gravetide_colossus",
    name: "Gravetide Colossus",
    type: "Brute",
    strength: 7,
    craft: 2,
    health: 6,
    maxHealth: 6,
    movementProfile: "slow_brute",
    combatProfile: "strength",
    specialRuleId: "cleave"
  },
  {
    id: "nemesis_choir_of_static",
    name: "Choir of Static",
    type: "Anomaly Swarm",
    strength: 3,
    will: 6,
    health: 5,
    maxHealth: 5,
    movementProfile: "anomaly_shortcut",
    combatProfile: "will",
    specialRuleId: "heals_on_anomaly_draw"
  }
];

function getSector(state: GameState, sectorId: string): GameState["sectors"][number] | null {
  return state.sectors.find((sector) => sector.id === sectorId) ?? null;
}

export function getCrownKeyFragmentCount(state: GameState, seatId: string): number {
  return state.scenarioProgress[`crownKey:${seatId}`] ?? 0;
}

export function hasCrownKeyFragment(state: GameState, seatId: string): boolean {
  return getCrownKeyFragmentCount(state, seatId) > 0;
}

export function createNemesisChampionsForSeats(state: GameState, seatIds: string[]): NemesisChampion[] {
  const outerSectors = state.sectors.filter((sector) => sector.regionTier === "borderlight");
  const usableOuterSectors = outerSectors.length > 0 ? outerSectors : state.sectors;

  return seatIds.slice(0, 4).map((seatId, index) => {
    const template = NEMESIS_TEMPLATES[index % NEMESIS_TEMPLATES.length]!;
    const startSector = usableOuterSectors[(index * Math.max(1, Math.floor(usableOuterSectors.length / Math.max(seatIds.length, 1)))) % usableOuterSectors.length];
    const soloHealthPenalty = state.sessionMode === "single-player" ? 1 : 0;
    const maxHealth = Math.max(1, template.maxHealth - soloHealthPenalty);

    return {
      ...template,
      id: `${template.id}_${seatId}`,
      boundPlayerId: seatId,
      sectorId: startSector?.id ?? state.sectors[0]?.id ?? "ashwake-crossing",
      health: Math.min(maxHealth, Math.max(1, template.health - soloHealthPenalty)),
      maxHealth,
      trophies: 0,
      defeated: false,
      shield: 0
    };
  });
}

export function getNemesisCombatStat(nemesis: NemesisChampion, requestedStat?: Stat): Stat {
  if (nemesis.combatProfile === "strength") {
    return "grit";
  }

  if (nemesis.combatProfile === "tech") {
    return "forge";
  }

  if (nemesis.combatProfile === "craft" || nemesis.combatProfile === "will") {
    return "signal";
  }

  return requestedStat ?? "grit";
}

export function getNemesisCombatValue(nemesis: NemesisChampion, stat: Stat): number {
  if (stat === "forge") {
    return nemesis.tech ?? nemesis.strength;
  }

  if (stat === "signal" || stat === "command" || stat === "guile") {
    return nemesis.will ?? nemesis.craft ?? nemesis.strength;
  }

  return nemesis.strength;
}

export function getNemesisPressureLevel(state: GameState): number {
  return Math.max(0, ...state.players.map((player) => player.character.scars.length), state.escalationLevel);
}

export function getNemesisMovementStepCount(state: GameState, randomSource: RandomSource): number {
  const pressure = getNemesisPressureLevel(state);

  if (pressure >= 9) {
    return 2;
  }

  if (pressure >= 6) {
    return 2;
  }

  if (pressure >= 3) {
    return 1 + (randomSource.nextInt(6) + 1 >= 5 ? 1 : 0);
  }

  return 1;
}

export function findShortestPath(state: GameState, fromSectorId: string, toSectorId: string): string[] {
  if (fromSectorId === toSectorId) {
    return [fromSectorId];
  }

  const queue: string[][] = [[fromSectorId]];
  const visited = new Set<string>([fromSectorId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentSectorId = path[path.length - 1]!;
    const currentSector = getSector(state, currentSectorId);

    for (const neighborId of currentSector?.neighbors ?? []) {
      if (visited.has(neighborId)) {
        continue;
      }

      const nextPath = [...path, neighborId];

      if (neighborId === toSectorId) {
        return nextPath;
      }

      visited.add(neighborId);
      queue.push(nextPath);
    }
  }

  return [fromSectorId];
}

export function getDistanceToNexus(state: GameState, sectorId: string): number {
  const path = findShortestPath(state, sectorId, ASHEN_CROWN_NEXUS_SECTOR_ID);
  return Math.max(0, path.length - 1);
}

function getHuntWoundedTargetSector(state: GameState): string | null {
  const woundedPlayers = state.players
    .filter((player) => player.character.status === "active" && player.character.wounds > 0)
    .sort((left, right) => right.character.wounds - left.character.wounds);

  return woundedPlayers[0]?.character.currentSpaceId ?? null;
}

export function buildNemesisMovementPath(
  state: GameState,
  nemesis: NemesisChampion,
  steps: number
): { fromSectorId: string; toSectorId: string; path: string[]; distanceToNexus: number } {
  const targetSectorId =
    nemesis.movementProfile === "hunt_wounded"
      ? getHuntWoundedTargetSector(state) ?? ASHEN_CROWN_NEXUS_SECTOR_ID
      : ASHEN_CROWN_NEXUS_SECTOR_ID;
  const shortestPath = findShortestPath(state, nemesis.sectorId, targetSectorId);
  const movementPath = shortestPath.slice(1, Math.min(shortestPath.length, steps + 1));
  const toSectorId = movementPath[movementPath.length - 1] ?? nemesis.sectorId;

  return {
    fromSectorId: nemesis.sectorId,
    toSectorId,
    path: movementPath,
    distanceToNexus: getDistanceToNexus(state, toSectorId)
  };
}

export function getEligibleAssistSeatIds(state: GameState, leadSeatId: string, nemesis: NemesisChampion): string[] {
  const leadPlayer = state.players.find((player) => player.seatId === leadSeatId);

  if (!leadPlayer) {
    return [];
  }

  return state.players
    .filter(
      (player) =>
        player.seatId !== leadSeatId &&
        player.character.status === "active" &&
        player.character.currentSpaceId === leadPlayer.character.currentSpaceId &&
        player.character.currentSpaceId === nemesis.sectorId
    )
    .map((player) => player.seatId);
}

export function getAssistBonus(state: GameState, leadSeatId: string, nemesis: NemesisChampion, assistSeatIds: string[]): number {
  const eligible = new Set(getEligibleAssistSeatIds(state, leadSeatId, nemesis));
  return assistSeatIds.filter((seatId) => eligible.has(seatId)).length;
}

export function getActiveOperatives(state: GameState): PlayerState[] {
  return state.players.filter((player) => player.character.status === "active");
}
