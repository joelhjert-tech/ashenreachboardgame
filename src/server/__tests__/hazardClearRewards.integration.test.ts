import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { BOARD_SPACES, type ThreatIcon } from "../../game/data/boardSpaces.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { GameAction } from "../../game/engine/actions.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { GameRoomServer, createPhoneProjection } from "../roomServer.js";

function resolvedCheck(server: GameRoomServer): Extract<GameAction, { type: "CHECK_ROLLED" }> {
  return [...server.getState().eventLog].reverse().find(
    (entry) => (entry as GameAction).type === "CHECK_ROLLED"
  ) as Extract<GameAction, { type: "CHECK_ROLLED" }>;
}

function resolvedCombat(server: GameRoomServer): Extract<GameAction, { type: "COMBAT_RESOLVED" }> {
  return [...server.getState().eventLog].reverse().find(
    (entry) => (entry as GameAction).type === "COMBAT_RESOLVED"
  ) as Extract<GameAction, { type: "COMBAT_RESOLVED" }>;
}

describe("authoritative Hazard clear rewards", () => {
  it("projects the revealed hazard stakes before any roll, including standard clear rewards", () => {
    const state = createInitialSessionState("hazard-stakes", "single-player");
    const seatId = state.players[0]!.seatId;
    state.currentEncounter = loadThreatCards().get("sanctifier-beads")!;
    expect(createPhoneProjection(state, seatId).encounter).toMatchObject({
      successSummary: "Gain Signal Lantern.",
      failureSummary: "Choose 1 Machine Scar."
    });
    state.currentEncounter = loadThreatCards().get("lantern-moth-swarm")!;
    expect(createPhoneProjection(state, seatId).encounter).toMatchObject({ successSummary: expect.stringContaining("Gain 1 Salvage.") });
  });
  it("awards the standard clear reward even when the card has no bespoke success effect", () => {
    const source = loadThreatCards().get("lantern-moth-swarm") as Extract<
      ThreatCard,
      { cardType: "hazard" }
    >;
    const hazard = { ...source, difficulty: 2 };
    const state = createInitialSessionState("hazard-clear-reward", "single-player");
    const seatId = state.players[0]!.seatId;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = [seatId];
    state.activeSeatIndex = 0;
    state.currentEncounter = hazard;

    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });

    expect(resolvedCheck(server)).toMatchObject({
      success: true,
      effect: { type: "gain_salvage", amount: 1 }
    });
  });

  it("keeps the clear reward when a solo reroll changes failure into success", () => {
    const source = loadThreatCards().get("emberlung-vent") as Extract<
      ThreatCard,
      { cardType: "hazard" }
    >;
    const hazard = { ...source, difficulty: 9 };
    const state = createInitialSessionState("hazard-reroll-reward", "single-player");
    const seatId = state.players[0]!.seatId;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = [seatId];
    state.activeSeatIndex = 0;
    state.currentEncounter = hazard;

    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 5, 5]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });

    const reroll = (server as unknown as {
      createSoloRerollAction(
        intent: { type: "SOLO_REROLL_REQUESTED"; seatId: string },
        createdAt: string
      ): Extract<GameAction, { type: "SOLO_REROLL_RESOLVED" }>;
    }).createSoloRerollAction({ type: "SOLO_REROLL_REQUESTED", seatId }, "reroll");

    expect(reroll.success).toBe(true);
    expect(reroll.effect).toMatchObject({
      type: "sequence",
      effects: [
        { type: "gain_salvage", amount: 2 },
        { type: "gain_note" }
      ]
    });
  });

  it("resolves a persistent failure with stable card and sector IDs", () => {
    const source = loadThreatCards().get("deadwire-repeater") as Extract<
      ThreatCard,
      { cardType: "hazard" }
    >;
    const hazard = { ...source, difficulty: 12 };
    const state = createInitialSessionState("hazard-persistent-failure", "single-player");
    const seatId = state.players[0]!.seatId;
    const sectorId = state.players[0]!.character.currentSpaceId;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = [seatId];
    state.activeSeatIndex = 0;
    state.currentEncounter = hazard;

    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId, stat: hazard.stat });

    expect(resolvedCheck(server)).toMatchObject({
      success: false,
      effect: {
        type: "return_threat_to_space",
        threatId: hazard.id,
        sourceSectorId: sectorId
      }
    });
  });

  it("adds Deadwire's extra printed lane to reconnect-safe arrival progress", () => {
    const space = BOARD_SPACES.find((entry) => entry.tier !== "center" && entry.threatIcons.length > 0)!;
    const state = createInitialSessionState("deadwire-arrival", "single-player");
    const player = state.players[0]!;
    player.sectorId = space.id;
    player.character.currentSpaceId = space.id;
    const sector = state.sectors.find((entry) => entry.id === space.id)!;
    sector.persistentThreatIds = ["deadwire-repeater"];

    const server = new GameRoomServer(state);
    const progress = (server as unknown as {
      getTileArrivalThreatProgress(seatId: string): {
        threatLanes: ThreatIcon[];
        threatRuleIds: string[];
      } | null;
    }).getTileArrivalThreatProgress(player.seatId);

    expect(progress?.threatRuleIds).toContain(`persistent:deadwire-repeater:blue`);
    expect(progress?.threatRuleIds).toContain(
      `persistent-rule:deadwire-repeater:${space.threatIcons[0]}`
    );
    expect(structuredClone(progress)).toEqual(progress);
  });

  it("applies Emberlung's +1 enemy opposition in its sector", () => {
    const enemy = loadThreatCards().get("latchspire-raider");
    if (!enemy || enemy.cardType !== "enemy") throw new Error("Missing enemy fixture");

    const resolve = (withVent: boolean) => {
      const state = createInitialSessionState(`emberlung-${withVent}`, "single-player");
      const player = state.players[0]!;
      state.status = "active";
      state.phase = "action";
      state.currentEncounter = enemy;
      state.activeResolution = {
        id: `emberlung-resolution-${withVent}`,
        playerId: player.seatId,
        source: "threat",
        stage: "battle_setup",
        card: { id: enemy.id, title: enemy.title, type: "enemy" },
        battle: {
          enemyName: enemy.enemyName,
          stat: enemy.stat,
          difficulty: enemy.difficulty,
          modifiers: []
        }
      };
      const sector = state.sectors.find(
        (entry) => entry.id === player.character.currentSpaceId
      )!;
      sector.persistentThreatIds = withVent ? ["emberlung-vent"] : [];
      const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 0, 0]));
      server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: player.seatId, stat: enemy.stat });
      return resolvedCombat(server);
    };

    const baseline = resolve(false);
    const modified = resolve(true);
    expect(modified.enemyBonus).toBe(baseline.enemyBonus + 1);
    expect(modified.oppositionModifierSources).toContainEqual({
      label: "Emberlung Vent",
      value: 1
    });
  });

  it("suppresses equipped Gear, but only for the first Latchfog Threat", () => {
    const hazard = loadThreatCards().get("latchfog-nullfield");
    const gear = loadGear().get("mirecoil-wardcloak");
    if (!hazard || hazard.cardType !== "hazard" || !gear) {
      throw new Error("Missing Latchfog fixtures");
    }

    const resolve = (nextThreatIconIndex: number) => {
      const state = createInitialSessionState(`latchfog-${nextThreatIconIndex}`, "single-player");
      const player = state.players[0]!;
      const ownedGear = { ...gear, instanceId: `${gear.id}:owned` };
      player.character.heldGear = [ownedGear];
      player.character.equippedGear = { weapon: null, armor: gear.id, utility: null };
      player.character.equippedGearInstances = {
        weapon: null,
        armor: ownedGear.instanceId,
        utility: null
      };
      state.status = "active";
      state.phase = "action";
      state.currentEncounter = hazard;
      state.tileArrivalThreatProgress = {
        arrivalId: "latchfog-arrival",
        seatId: player.seatId,
        sectorId: player.character.currentSpaceId,
        threatLanes: ["red", "red"],
        threatRuleIds: ["persistent:latchfog-nullfield:red", "threat:0:red"],
        nextThreatIconIndex
      };
      const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
      server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: player.seatId, stat: hazard.stat });
      return resolvedCheck(server);
    };

    expect(resolve(1).modifierSources).not.toContainEqual({
      label: gear.name,
      value: gear.statBonus.amount
    });
    expect(resolve(2).modifierSources).toContainEqual({
      label: gear.name,
      value: gear.statBonus.amount
    });
  });
});
