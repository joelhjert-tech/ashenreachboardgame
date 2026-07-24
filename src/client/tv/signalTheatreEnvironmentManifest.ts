import { BOARD_SPACES, type BoardTier } from "../../game/data/boardSpaces.js";

export interface SignalTheatreEnvironment {
  sectorId: string;
  sectorName: string;
  tier: BoardTier;
  path: string;
}

const SIGNAL_THEATRE_ENVIRONMENT_ROOT = "/assets/riftfall/environments/signal-theatre/sectors";

export const signalTheatreEnvironments: SignalTheatreEnvironment[] = BOARD_SPACES.map((sector) => ({
  sectorId: sector.id,
  sectorName: sector.name,
  tier: sector.tier,
  path: `${SIGNAL_THEATRE_ENVIRONMENT_ROOT}/${sector.id}.png`
}));

const environmentBySectorId = new Map(
  signalTheatreEnvironments.map((environment) => [environment.sectorId, environment] as const)
);

export function getSignalTheatreEnvironment(sectorId: string | null | undefined): SignalTheatreEnvironment | null {
  return sectorId ? environmentBySectorId.get(sectorId) ?? null : null;
}

export function getSignalTheatreEnvironmentPaths(): string[] {
  return signalTheatreEnvironments.map((environment) => environment.path);
}
