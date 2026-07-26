import type {
  ActiveContractEntry,
  Character
} from "../schema/character.schema.js";

export const MAX_ACTIVE_MISSIONS = 3;
export const MISSION_RELIC_EXCHANGE_COST = 3;
export const MISSION_RELIC_OPTION_COUNT = 2;

type MissionCharacter = Pick<Character, "activeContract" | "activeContracts">;

export function getActiveMissions(character: MissionCharacter): ActiveContractEntry[] {
  if (character.activeContracts && character.activeContracts.length > 0) {
    return character.activeContracts.slice(0, MAX_ACTIVE_MISSIONS);
  }

  return character.activeContract ? [character.activeContract] : [];
}

export function getActiveMission(
  character: MissionCharacter,
  contractId: string
): ActiveContractEntry | null {
  return getActiveMissions(character).find((mission) => mission.contractId === contractId) ?? null;
}

export function setActiveMissions<T extends Character>(
  character: T,
  missions: ActiveContractEntry[]
): T {
  const uniqueMissions = missions
    .filter(
      (mission, index, entries) =>
        entries.findIndex((entry) => entry.contractId === mission.contractId) === index
    )
    .slice(0, MAX_ACTIVE_MISSIONS)
    .map((mission) => ({ ...mission }));

  return {
    ...character,
    activeContract: uniqueMissions[0] ?? null,
    activeContracts: uniqueMissions
  };
}

export function addActiveMission<T extends Character>(
  character: T,
  mission: ActiveContractEntry
): T {
  const activeMissions = getActiveMissions(character);

  if (
    activeMissions.length >= MAX_ACTIVE_MISSIONS ||
    activeMissions.some((entry) => entry.contractId === mission.contractId)
  ) {
    return setActiveMissions(character, activeMissions);
  }

  return setActiveMissions(character, [...activeMissions, mission]);
}

export function removeActiveMission<T extends Character>(
  character: T,
  contractId: string
): T {
  return setActiveMissions(
    character,
    getActiveMissions(character).filter((mission) => mission.contractId !== contractId)
  );
}

export function updateActiveMissions<T extends Character>(
  character: T,
  update: (mission: ActiveContractEntry) => ActiveContractEntry
): T {
  return setActiveMissions(character, getActiveMissions(character).map(update));
}
