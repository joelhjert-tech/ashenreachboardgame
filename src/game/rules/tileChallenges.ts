import type { SectorNode } from "../schema/sector.schema.js";
import type { TileChallenge } from "../schema/tileChallenge.schema.js";

export function attachTileChallengesToSectors(sectors: SectorNode[], challenges: TileChallenge[]): SectorNode[] {
  const sectorIds = new Set(sectors.map((sector) => sector.id));
  for (const challenge of challenges) {
    if (!sectorIds.has(challenge.sectorId)) throw new Error(`Tile challenge ${challenge.id} references unknown sector ${challenge.sectorId}`);
  }

  return sectors.map((sector) => {
    const attached = challenges.filter((challenge) => challenge.sectorId === sector.id).sort((a, b) => a.authoredOrder - b.authoredOrder);
    const orders = attached.map((challenge) => challenge.authoredOrder);
    if (new Set(orders).size !== orders.length) throw new Error(`Tile challenge authored order is duplicated at ${sector.id}`);
    return { ...sector, tileChallenges: attached };
  });
}
