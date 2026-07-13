import type { Character } from "../schema/character.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { Follower } from "../schema/follower.schema.js";
import type { GearItem } from "../schema/gear.schema.js";
import type { SessionMode } from "../schema/session.schema.js";
import { isSinglePlayerMode } from "./soloTuning.js";

export const NORMAL_STARTING_SALVAGE = 3;
export const SOLO_STARTING_SALVAGE = 4;
export const SOLO_DEFAULT_STARTING_GEAR_ID = "veil-hook";
export const SOLO_DEFAULT_STARTING_FOLLOWER_ID = "grave-scribe";

export type StartingLoadoutCatalogs = {
  contracts: ContractCard[];
  gear: Map<string, GearItem>;
  followers: Map<string, Follower>;
};

export type StartingLoadoutOptions = {
  sessionMode: SessionMode;
  seatIndex: number;
  catalogs: StartingLoadoutCatalogs;
  assignStartingContract?: boolean;
};

function cloneCharacter(character: Character): Character {
  return {
    ...character,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    followers: [...(character.followers ?? [])],
    abilities: [...character.abilities],
    scars: [...character.scars],
    trophies: character.trophies,
    trophyPile: [...(character.trophyPile ?? [])]
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function resolveStartingContractId(character: Character, contracts: ContractCard[], seatIndex: number): string | null {
  if (character.activeContract) {
    return character.activeContract.contractId;
  }

  if (character.startingContract) {
    return contracts.some((contract) => contract.id === character.startingContract) ? character.startingContract : null;
  }

  return contracts[seatIndex % Math.max(contracts.length, 1)]?.id ?? null;
}

function resolveStartingGearIds(character: Character, sessionMode: SessionMode): string[] {
  if (character.startingGear) {
    return character.startingGear;
  }

  if (character.heldGear.length > 0) {
    return [];
  }

  return isSinglePlayerMode(sessionMode) ? [SOLO_DEFAULT_STARTING_GEAR_ID] : [];
}

function resolveStartingFollowerIds(character: Character, sessionMode: SessionMode): string[] {
  if (character.startingFollower) {
    return character.startingFollower;
  }

  if ((character.followers ?? []).length > 0) {
    return [];
  }

  return isSinglePlayerMode(sessionMode) ? [SOLO_DEFAULT_STARTING_FOLLOWER_ID] : [];
}

export function applyStartingLoadout(character: Character, options: StartingLoadoutOptions): Character {
  const nextCharacter = cloneCharacter(character);
  const assignStartingContract = options.assignStartingContract ?? true;
  const startingContractId = assignStartingContract
    ? resolveStartingContractId(nextCharacter, options.catalogs.contracts, options.seatIndex)
    : null;
  const startingGear = resolveStartingGearIds(nextCharacter, options.sessionMode)
    .map((gearId) => options.catalogs.gear.get(gearId))
    .filter((gear): gear is GearItem => Boolean(gear));
  const startingFollowers = resolveStartingFollowerIds(nextCharacter, options.sessionMode)
    .map((followerId) => options.catalogs.followers.get(followerId))
    .filter((follower): follower is Follower => Boolean(follower));

  return {
    ...nextCharacter,
    salvage:
      nextCharacter.startingSalvage ??
      (isSinglePlayerMode(options.sessionMode) ? SOLO_STARTING_SALVAGE : NORMAL_STARTING_SALVAGE),
    activeContract: assignStartingContract && nextCharacter.activeContract
      ? { ...nextCharacter.activeContract }
      : startingContractId
        ? { contractId: startingContractId, progress: 0 }
        : null,
    heldGear: uniqueById([...nextCharacter.heldGear, ...startingGear]),
    followers: uniqueById([...(nextCharacter.followers ?? []), ...startingFollowers])
  };
}

export function createInitialSoloRerollCharges(sessionMode: SessionMode, seatIds: string[]): Record<string, number> {
  if (!isSinglePlayerMode(sessionMode)) {
    return {};
  }

  return Object.fromEntries(seatIds.map((seatId) => [seatId, 1]));
}
