import type { AuthoredCharacter } from "../schema/character.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { Follower } from "../schema/follower.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";
import type { SessionMode } from "../schema/session.schema.js";
import { isSinglePlayerMode } from "./soloTuning.js";

export const NORMAL_STARTING_SALVAGE = 3;
export const SOLO_STARTING_SALVAGE = 4;
export const ARTIFACT_EXCHANGE_CONTRACT_COST = 3;
export const SOLO_DEFAULT_STARTING_GEAR_ID = "field-lens";
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

function cloneCharacter(character: AuthoredCharacter): AuthoredCharacter {
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

function resolveStartingContractId(character: AuthoredCharacter, contracts: ContractCard[], seatIndex: number): string | null {
  if (character.activeContract) {
    return character.activeContract.contractId;
  }

  if (character.startingContract) {
    return contracts.some((contract) => contract.id === character.startingContract) ? character.startingContract : null;
  }

  return contracts[seatIndex % Math.max(contracts.length, 1)]?.id ?? null;
}

function resolveStartingGearIds(character: AuthoredCharacter, sessionMode: SessionMode): string[] {
  if (character.startingGear) {
    return character.startingGear;
  }

  if (character.heldGear.length > 0) {
    return [];
  }

  return isSinglePlayerMode(sessionMode) ? [SOLO_DEFAULT_STARTING_GEAR_ID] : [];
}

function resolveStartingFollowerIds(character: AuthoredCharacter, sessionMode: SessionMode): string[] {
  if (character.startingFollower) {
    return character.startingFollower;
  }

  if ((character.followers ?? []).length > 0) {
    return [];
  }

  return isSinglePlayerMode(sessionMode) ? [SOLO_DEFAULT_STARTING_FOLLOWER_ID] : [];
}

function getStartingAutoEquipPriority(item: GearItem): number {
  if (item.effectModel === "permanent") return 3;
  if (item.effectModel === "conditional") return 2;
  if (item.category === "passive" && !item.useLimit) return 1;
  return 0;
}

function resolveStartingEquippedGear(
  current: AuthoredCharacter["equippedGear"],
  startingGear: GearItem[]
): AuthoredCharacter["equippedGear"] {
  const equipped = { ...current };

  for (const slot of ["weapon", "armor", "utility"] as const satisfies readonly GearSlot[]) {
    if (equipped[slot]) continue;
    const candidate = startingGear
      .map((item, index) => ({ item, index, priority: item.slot === slot ? getStartingAutoEquipPriority(item) : 0 }))
      .filter((entry) => entry.priority > 0)
      .sort((left, right) => right.priority - left.priority || left.index - right.index)[0]?.item;
    if (candidate) equipped[slot] = candidate.id;
  }

  return equipped;
}

export function applyStartingLoadout(character: AuthoredCharacter, options: StartingLoadoutOptions): AuthoredCharacter {
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
    equippedGear: resolveStartingEquippedGear(nextCharacter.equippedGear, startingGear),
    followers: uniqueById([...(nextCharacter.followers ?? []), ...startingFollowers])
  };
}

export function createInitialSoloRerollCharges(sessionMode: SessionMode, seatIds: string[]): Record<string, number> {
  if (!isSinglePlayerMode(sessionMode)) {
    return {};
  }

  return Object.fromEntries(seatIds.map((seatId) => [seatId, 1]));
}
