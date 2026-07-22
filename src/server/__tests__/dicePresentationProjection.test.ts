import { describe, expect, it } from "vitest";
import type { BattlePresentation, PublicMovementPlannerState } from "../../client/shared/types.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

function activeState() {
  const state = createInitialSessionState("dice-presentation", "single-player");
  state.status = "active";
  state.phase = "navigation";
  state.activeSeatIndex = 0;
  return state;
}

describe("authoritative dice presentation projection", () => {
  it("projects movement faces from the recorded server action in stable order", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    const resolutionId = "movement-roll:seat-1:fixed";
    state.movementRolls = { [seatId]: 2 };
    state.normalMovementRollDetails = {
      [seatId]: { resolutionId, rolledValue: 5, modifierSources: [{ label: "Static drag", value: -3 }], finalValue: 2 }
    };
    state.eventLog.push({
      type: "MOVEMENT_ROLLED",
      seatId,
      movementValue: 2,
      roll: { faces: [5], total: 5 },
      resolutionId,
      modifierSources: [{ label: "Static drag", value: -3 }],
      createdAt: "2026-07-22T00:00:00.000Z"
    });

    const tv = createTvProjection(state) as { movementPlanner: PublicMovementPlannerState | null };
    const phone = createPhoneProjection(state, seatId) as { movementPlanner: PublicMovementPlannerState | null };

    expect(tv.movementPlanner?.rollFaces).toEqual([5]);
    expect(phone.movementPlanner?.rollFaces).toEqual([5]);
    expect(tv.movementPlanner?.rolledValue).toBe(5);
    expect(tv.movementPlanner?.movementValue).toBe(2);
    expect(tv.movementPlanner?.rollResolutionId).toBe(resolutionId);
  });

  it("projects reroll history without exposing an owner command to the TV", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.phase = "resolution";
    state.currentEncounter = {
      id: "hazard-dice-fixture",
      title: "Ash Pressure",
      cardType: "hazard",
      flavor: "The pressure line fails.",
      difficulty: 8,
      stat: "signal",
      successEffect: { type: "gain_note", text: "Pressure mapped." },
      failEffect: { type: "take_wound", amount: 1 }
    } as typeof state.currentEncounter;
    state.activeResolution = {
      id: "resolution:hazard-dice-fixture",
      playerId: seatId,
      source: "threat",
      stage: "roll_result",
      card: { id: "hazard-dice-fixture", title: "Ash Pressure", type: "hazard" },
      battle: { stat: "signal", difficulty: 8, modifiers: [{ label: "Base Signal", value: 3 }] },
      roll: { dice: [5, 4], baseTotal: 9, modifierTotal: 3, finalTotal: 12, target: 8, success: true }
    };
    state.eventLog.push(
      { type: "CHECK_ROLLED", seatId, cardId: "hazard-dice-fixture", stat: "signal", difficulty: 8, roll: { faces: [2, 4], total: 6 }, statBonus: 3, total: 9, success: true, effect: null, createdAt: "a" },
      { type: "SOLO_REROLL_RESOLVED", seatId, cardId: "hazard-dice-fixture", stat: "signal", difficulty: 8, roll: { faces: [5, 4], total: 9 }, statBonus: 3, total: 12, success: true, effect: null, createdAt: "b" }
    );

    const tv = createTvProjection(state) as { battlePresentation: BattlePresentation | null; soloReroll?: unknown };
    expect(tv.battlePresentation?.operative.rawDice).toEqual([5, 4]);
    expect(tv.battlePresentation?.operative.diceCount).toBe(2);
    expect(tv.battlePresentation?.opponent.diceCount).toBe(0);
    expect(tv.battlePresentation?.operative.previousRawDice).toEqual([2, 4]);
    expect(tv.battlePresentation?.operative.rerolledDiceIndices).toEqual([0]);
    expect(tv.soloReroll).toBeUndefined();
  });
});
