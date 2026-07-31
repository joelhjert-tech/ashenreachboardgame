import { describe, expect, it } from "vitest";
import type { BattlePresentation, RequiredActionProjection } from "../../client/shared/types.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createInitialSessionState } from "../sessionState.js";
import {
  buildRequiredActionProjection,
  buildSetupProjection,
  createPhoneProjection,
  createTvProjection
} from "../roomServer.js";

function activateMultiplayer() {
  const state = createInitialSessionState(
    "required-action-projection",
    "multiplayer",
    undefined,
    "co-op",
    "standard",
    3
  );
  state.status = "active";
  state.phase = "navigation";
  state.seats.forEach((seat, index) => {
    seat.displayName = ["Joel", "Erik", "Anna"][index] ?? `Player ${index + 1}`;
    seat.connected = true;
  });
  return state;
}

function requiredAction(projection: Record<string, unknown>): RequiredActionProjection {
  return projection.requiredAction as RequiredActionProjection;
}

function battlePresentation(projection: Record<string, unknown>): BattlePresentation {
  return projection.battlePresentation as BattlePresentation;
}

describe("server required-action projection", () => {
  it("projects canonical setup stages and all public start blockers", () => {
    const state = createInitialSessionState("setup-projection", "multiplayer", undefined, "co-op", "standard", 3);
    const host = state.seats[0]!;
    const second = state.seats[1]!;
    host.displayName = "Joel";
    host.connected = true;
    second.displayName = "Anna";
    second.connected = true;
    state.setupHostSeatId = host.seatId;
    state.lobbyConfigured = false;

    expect(buildSetupProjection(state)).toMatchObject({
      stage: "mode-selection",
      actorSeatId: host.seatId,
      allowedCommand: "configure-lobby",
      canStart: false
    });

    state.lobbyConfigured = true;
    let setup = buildSetupProjection(state);
    expect(setup.stage).toBe("operative-selection");
    expect(setup.actorSeatId).toBe(host.seatId);
    expect(setup.startBlockers).toEqual([
      "Joel must choose an operative",
      "Anna must choose an operative"
    ]);

    for (const [index, seat] of [host, second].entries()) {
      seat.characterId = index === 0 ? "void-marshal" : "signal-witch";
      seat.characterSelected = true;
      seat.selectedStartingContractId = `mission-${index}`;
      seat.startingBonusSelections = [
        { kind: "gear", id: `test-gear-${index}` },
        { kind: "follower", id: `test-follower-${index}` }
      ];
      seat.ready = true;
    }
    setup = buildSetupProjection(state);
    expect(setup).toMatchObject({
      stage: "start-available",
      actorSeatId: host.seatId,
      allowedCommand: "start",
      canStart: true,
      startBlockers: []
    });
    expect((createTvProjection(state).setup as typeof setup)).toEqual(setup);
    expect((createPhoneProjection(state, second.seatId).setup as typeof setup)).toEqual(setup);
  });

  it("projects one movement identity with owner controls and public-safe waiting copies", () => {
    const state = activateMultiplayer();
    const activeSeatId = state.turnOrder[state.activeSeatIndex]!;
    const waitingSeatId = state.turnOrder[1]!;

    const owner = requiredAction(createPhoneProjection(state, activeSeatId));
    const waiting = requiredAction(createPhoneProjection(state, waitingSeatId));
    const tv = requiredAction(createTvProjection(state));

    expect(owner).toMatchObject({ kind: "movement", actorSeatId: activeSeatId, requiredTab: "move", canAct: true, waiting: false });
    expect(waiting).toMatchObject({ id: owner.id, kind: "movement", actorSeatId: activeSeatId, requiredTab: null, canAct: false, waiting: true });
    expect(tv).toMatchObject({ id: owner.id, actorSeatId: activeSeatId, requiredTab: null, canAct: false, privacy: "public" });
    expect(waiting.detail).toContain("Waiting for Joel to roll movement");
  });

  it("announces a pre-roll tier choice without exposing private transition controls on TV", () => {
    const state = activateMultiplayer();
    const activeSeatId = state.turnOrder[state.activeSeatIndex]!;
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phone = createPhoneProjection(state, activeSeatId) as Record<string, unknown> & {
      tierTransitions?: { options: Array<{ sectorId: string }> } | null;
    };
    const tv = createTvProjection(state) as Record<string, unknown>;

    expect(requiredAction(phone)).toMatchObject({
      kind: "movement",
      label: "Cross tier or roll movement",
      requiredTab: "move",
      canAct: true
    });
    expect(phone.tierTransitions?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ sectorId: "middle_red_march_outpost" })
    ]));
    expect(tv).not.toHaveProperty("tierTransitions");
  });

  it("keeps an authoritative approach result on Move instead of routing it to Battle", () => {
    const state = activateMultiplayer();
    const activeSeatId = state.turnOrder[state.activeSeatIndex]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "seat-1:movement:glassmere-spindle:test",
      playerId: activeSeatId,
      source: "movement",
      stage: "outcome_summary",
      card: {
        id: "glassmere-spindle",
        title: "Glassmere Spindle",
        type: "movement",
        flavor: "Approach check"
      },
      battle: { stat: "guile", difficulty: 7, modifiers: [{ label: "Guile", value: 2 }] },
      roll: { dice: [5], baseTotal: 5, modifierTotal: 2, finalTotal: 7, target: 7, success: true },
      outcome: { title: "Movement success", text: "Moved into Glassmere Spindle.", effects: [] }
    };

    const owner = requiredAction(createPhoneProjection(state, activeSeatId));
    expect(owner).toMatchObject({
      kind: "test",
      requiredTab: "move",
      label: "Movement success",
      allowedCommand: "continue",
      canAct: true
    });
  });

  it("routes non-opposed tests to Action and reserves Battle for opposed enemies", () => {
    const state = activateMultiplayer();
    const activeSeatId = state.turnOrder[state.activeSeatIndex]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "hazard-action-route",
      playerId: activeSeatId,
      source: "anomaly",
      stage: "battle_setup",
      card: { id: "signal-shear", title: "Signal Shear", type: "hazard" },
      battle: { stat: "signal", difficulty: 6, modifiers: [] }
    };
    expect(requiredAction(createPhoneProjection(state, activeSeatId))).toMatchObject({
      kind: "test",
      requiredTab: "action"
    });

    state.activeResolution = {
      id: "enemy-battle-route",
      playerId: activeSeatId,
      source: "threat",
      stage: "battle_setup",
      card: { id: "ash-hunter", title: "Ash Hunter", type: "enemy" },
      battle: { enemyName: "Ash Hunter", stat: "grit", difficulty: 7, modifiers: [] }
    };
    expect(requiredAction(createPhoneProjection(state, activeSeatId))).toMatchObject({
      kind: "battle",
      requiredTab: "battle"
    });
  });

  it("routes a help response only to the selected helper and survives projection reconnect", () => {
    const state = activateMultiplayer();
    const activeSeatId = state.turnOrder[0]!;
    const helperSeatId = state.turnOrder[1]!;
    const unrequestedSeatId = state.turnOrder[2]!;
    state.phase = "resolution";
    state.cooperativeAssistance = {
      id: "assist-required-action",
      sourceKind: "encounter",
      sourceId: "signal-test",
      sourceTitle: "Signal Test",
      testedStat: "signal",
      activeSeatId,
      requestedSeatIds: [helperSeatId],
      acceptedSeatIds: [],
      declinedSeatIds: [],
      lockedContributions: [],
      status: "requested",
      createdAt: "now"
    };

    const helper = requiredAction(createPhoneProjection(state, helperSeatId));
    const unrequested = requiredAction(createPhoneProjection(state, unrequestedSeatId));
    const restored = requiredAction(createPhoneProjection(JSON.parse(JSON.stringify(state)), helperSeatId));

    expect(helper).toMatchObject({ kind: "assistance", actorSeatId: helperSeatId, requiredTab: "action", canAct: true });
    expect(helper.label).toBe("Answer help request");
    expect(unrequested).toMatchObject({ id: helper.id, requiredTab: null, canAct: false, privacy: "public" });
    expect(restored).toEqual(helper);
  });

  it("keeps private Scar choices out of the shared required-action contract", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    state.phase = "resolution";
    state.pendingScarChoice = {
      selectionId: "scar-choice-required-action",
      ownerSeatId,
      source: "flesh",
      sourceCardId: "private-source-card",
      sourceEventId: "private-source-event",
      candidateIds: ["scar-flesh-01", "scar-flesh-02"],
      continuationPhase: "action",
      createdAt: "now",
      status: "awaitingSelection"
    };

    const owner = requiredAction(createPhoneProjection(state, ownerSeatId));
    const tv = requiredAction(createTvProjection(state));

    expect(owner).toMatchObject({ kind: "scar", canAct: true, privacy: "owner", requiredTab: "action" });
    expect(tv).toMatchObject({ id: owner.id, kind: "scar", canAct: false, privacy: "public", requiredTab: null });
    expect(tv.detail).toBe("Waiting for Joel to resolve a private Scar choice.");
    expect(JSON.stringify(tv)).not.toContain("scar-flesh-01");
    expect(JSON.stringify(tv)).not.toContain("scar-flesh-02");
  });

  it("masks an owner-private Contract resolution title in waiting-phone and TV actions", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    const waitingSeatId = state.turnOrder[1]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "private-contract-resolution",
      playerId: ownerSeatId,
      source: "contract",
      stage: "outcome_summary",
      card: { id: "hidden-contract-id", title: "The Hidden Contract Title", type: "contract" },
      outcome: { title: "Contract complete", text: "Private reward details.", effects: ["Gain a private reward."] },
      origin: {
        sourceDeck: "contract",
        sourceSectorId: "ashwalk-bridge",
        sourceEventId: "private-contract-event",
        queuePosition: 0,
        privacy: "owner"
      }
    };

    const owner = requiredAction(createPhoneProjection(state, ownerSeatId));
    const waiting = requiredAction(createPhoneProjection(state, waitingSeatId));
    const tv = requiredAction(createTvProjection(state));

    expect(owner.detail).toBe("Private reward details.");
    expect(waiting.detail).toBe("Waiting for Joel to review a private objective result.");
    expect(tv.detail).toBe(waiting.detail);
    expect(JSON.stringify(waiting)).not.toMatch(/The Hidden Contract Title|hidden-contract-id|private-contract-event|Private reward details/);
    expect(JSON.stringify(tv)).not.toMatch(/The Hidden Contract Title|hidden-contract-id|private-contract-event|Private reward details/);
  });

  it("uses the same semantic builder for deterministic server-side restoration", () => {
    const state = activateMultiplayer();
    state.phase = "action";
    const before = buildRequiredActionProjection(state, state.turnOrder[0]!, {
      movementActive: false,
      movementSelected: false,
      tierTransitionAvailable: false,
      shopActive: false
    });
    const after = buildRequiredActionProjection(JSON.parse(JSON.stringify(state)), state.turnOrder[0]!, {
      movementActive: false,
      movementSelected: false,
      tierTransitionAvailable: false,
      shopActive: false
    });
    expect(after).toEqual(before);
  });

  it("routes an uncleared inner trial to Action and a cleared step to Move", () => {
    const state = activateMultiplayer();
    const seatId = state.turnOrder[0]!;
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "inner_tomb_gate",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "inner_tomb_gate"
      },
      innerApproachProgress: {
        pathId: "breach-road",
        clearedSectorIds: ["inner_veil_rift"]
      }
    };

    const challenge = createPhoneProjection(state, seatId);
    expect(requiredAction(challenge)).toMatchObject({
      kind: "test",
      requiredTab: "action",
      label: "Clear Rifted Approach",
      sourceId: "inner_tomb_gate"
    });
    expect(challenge.innerApproach).toMatchObject({
      pathId: "breach-road",
      currentSectorId: "inner_tomb_gate",
      challengeCleared: false
    });

    state.players[0]!.innerApproachProgress!.clearedSectorIds.push("inner_tomb_gate");
    const advance = createPhoneProjection(state, seatId);
    expect(requiredAction(advance)).toMatchObject({
      kind: "movement",
      requiredTab: "move",
      label: "Advance one inner step"
    });
    const innerApproach = advance.innerApproach as
      | { options: Array<{ sectorId: string; direction: string; disabledReason: string | null }> }
      | null;
    expect(innerApproach?.options[0]).toMatchObject({
      sectorId: "inner_blackstar_shortcut",
      direction: "advance",
      disabledReason: null
    });
  });

  it("projects result, continuation, and end-turn stages without a client-authored transition", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "p4-result",
      playerId: ownerSeatId,
      source: "threat",
      stage: "outcome_summary",
      card: { id: "p4-hazard", title: "Ashfall Shear", type: "hazard" },
      battle: { stat: "signal", difficulty: 6, modifiers: [] },
      roll: { dice: [3, 4], baseTotal: 7, modifierTotal: 3, finalTotal: 10, target: 6, success: true },
      outcome: { title: "Hazard cleared", text: "The route stabilizes.", effects: ["Continue the turn."] }
    };

    const result = requiredAction(createPhoneProjection(state, ownerSeatId));
    expect(result).toMatchObject({
      transitionStage: "continue-available",
      allowedCommand: "continue",
      inputEnabled: true,
      label: "Hazard cleared"
    });

    state.activeResolution = null;
    state.currentEncounter = null;
    state.phase = "action";
    const endTurn = requiredAction(createPhoneProjection(state, ownerSeatId));
    expect(endTurn).toMatchObject({ transitionStage: "end-turn-available", allowedCommand: "finish-actions", canAct: true });

    state.phase = "broadcast";
    const finalEndTurn = requiredAction(createPhoneProjection(state, ownerSeatId));
    expect(finalEndTurn).toMatchObject({ transitionStage: "end-turn-available", allowedCommand: "end-turn" });
  });

  it("keeps a transient battle result in resolving state until consequences settle", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "p4-transient-battle-result",
      playerId: ownerSeatId,
      source: "threat",
      stage: "roll_result",
      card: { id: "ash-lane-cutters", title: "Ash-Lane Cutters", type: "enemy" },
      battle: { enemyName: "Ash-Lane Cutters", stat: "command", difficulty: 6, modifiers: [] },
      roll: { dice: [3, 4], baseTotal: 7, modifierTotal: 3, finalTotal: 10, target: 6, success: true }
    };

    expect(requiredAction(createPhoneProjection(state, ownerSeatId))).toMatchObject({
      label: "Applying battle consequence",
      transitionStage: "result-visible",
      allowedCommand: null,
      canAct: false,
      inputEnabled: false
    });
  });

  it("projects a public-safe, stable handoff from the authoritative turn event", () => {
    const state = activateMultiplayer();
    const fromSeatId = state.turnOrder[0]!;
    const toSeatId = state.turnOrder[1]!;
    state.activeSeatIndex = 1;
    state.phase = "navigation";
    state.eventLog.push({ type: "TURN_COMPLETED", seatId: fromSeatId, createdAt: "2026-07-21T12:00:00.000Z" });

    const owner = requiredAction(createPhoneProjection(state, toSeatId));
    const tv = requiredAction(createTvProjection(state));
    expect(owner.transitionStage).toBe("next-turn-ready");
    expect(tv.handoff).toEqual({
      id: `turn-handoff:2026-07-21T12:00:00.000Z:${fromSeatId}:${toSeatId}`,
      fromSeatId,
      fromDisplayName: "Joel",
      toSeatId,
      toDisplayName: "Erik",
      roundWrapped: false
    });
    expect(JSON.stringify(tv.handoff)).not.toContain("mission");
  });

  it("builds a four-entry public handoff ledger from allowlisted turn events", () => {
    const state = activateMultiplayer();
    const fromSeatId = state.turnOrder[0]!;
    const toSeatId = state.turnOrder[1]!;
    state.activeSeatIndex = 1;
    state.phase = "navigation";
    state.eventLog.push(
      {
        type: "MOVEMENT_RESOLVED",
        seatId: fromSeatId,
        fromSectorId: "ashen-chapel",
        toSectorId: "ashwake-crossing",
        stat: "guile",
        difficulty: 4,
        roll: { dice: [4], baseTotal: 4, modifierTotal: 2, finalTotal: 6, target: 4, success: true },
        statBonus: 2,
        total: 6,
        success: true,
        effect: null,
        createdAt: "2026-07-21T11:58:00.000Z"
      },
      {
        type: "CHECK_ROLLED",
        seatId: fromSeatId,
        stat: "signal",
        difficulty: 6,
        roll: { dice: [5], baseTotal: 5, modifierTotal: 3, finalTotal: 8, target: 6, success: true },
        statBonus: 3,
        total: 8,
        success: true,
        effect: { type: "gain_salvage", amount: 1 },
        cardId: "public-hazard",
        createdAt: "2026-07-21T11:59:00.000Z"
      },
      {
        type: "RESOLUTION_APPLIED",
        seatId: fromSeatId,
        effect: { type: "gain_salvage", amount: 1 },
        sourceCardId: "public-hazard",
        success: true,
        createdAt: "2026-07-21T11:59:10.000Z"
      },
      {
        type: "ESCALATION_ADVANCED",
        seatId: fromSeatId,
        amount: 1,
        newLevel: 2,
        modifier: 0,
        createdAt: "2026-07-21T11:59:20.000Z"
      },
      { type: "TURN_COMPLETED", seatId: fromSeatId, createdAt: "2026-07-21T12:00:00.000Z" }
    );

    const handoff = requiredAction(createTvProjection(state)).handoff;
    expect(handoff?.toSeatId).toBe(toSeatId);
    expect(handoff?.summaryEntries).toEqual([
      "Moved to Ashwalk Bridge",
      "Challenge cleared · 8/6",
      "1 Salvage gained",
      "Global Escalation +1"
    ]);
    expect(JSON.stringify(handoff)).not.toMatch(/contract|agenda|cardId|public-hazard/i);
  });

  it("projects one authoritative and auditable battle calculation to TV and phones", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    const waitingSeatId = state.turnOrder[1]!;
    const player = state.players.find((entry) => entry.seatId === ownerSeatId)!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "battle-presentation-1",
      playerId: ownerSeatId,
      source: "threat",
      stage: "roll_result",
      card: { id: "cinder-veil-stalker", title: "Cinder-Veil Stalker", type: "enemy", flavor: "It hunts through furnace smoke." },
      battle: {
        enemyName: "Cinder-Veil Stalker",
        stat: "grit",
        difficulty: 5,
        modifiers: [
          { label: "Base Grit", value: 3 },
          { label: "Permanent Grit", value: 1 },
          { label: "Rivetplate Vest", value: 1 }
        ]
      },
      roll: { dice: [4, 2], baseTotal: 6, modifierTotal: 5, finalTotal: 11, target: 9, success: true },
      outcome: { title: "Combat victory", text: "Gain 1 Salvage.", effects: ["Gain 1 Salvage."] }
    };
    player.character.stats.grit = 4;

    const tv = battlePresentation(createTvProjection(state));
    const owner = battlePresentation(createPhoneProjection(state, ownerSeatId));
    const waiting = battlePresentation(createPhoneProjection(state, waitingSeatId));

    expect(tv).toMatchObject({
      id: "battle-presentation-1",
      actorSeatId: ownerSeatId,
      encounter: { name: "Cinder-Veil Stalker", category: "Battle" },
      test: { stat: "grit", opposed: true },
      operative: { baseValue: 3, rawDice: [4, 2], diceTotal: 6, finalTotal: 11 },
      opponent: { finalTotal: 9 },
      outcome: "success",
      publicConsequence: "Gain 1 Salvage."
    });
    expect(tv.operative.modifiers).toEqual([
      { label: "Permanent Grit", value: 1, kind: "permanent" },
      { label: "Rivetplate Vest", value: 1, kind: "other" }
    ]);
    expect(owner).toEqual(tv);
    expect(waiting).toEqual(tv);
    expect(JSON.stringify(tv)).not.toContain("candidateIds");
    expect(JSON.stringify(tv)).not.toContain("pendingScarChoice");
  });

  it("projects public pre-roll enemy intent without private state", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    const marshal = loadThreatCards().get("pale-marshal");
    if (!marshal || marshal.cardType !== "enemy") throw new Error("Missing Pale Marshal fixture");
    state.phase = "action";
    state.currentEncounter = marshal;
    state.activeResolution = {
      id: "battle-intent-pale-marshal",
      playerId: ownerSeatId,
      source: "threat",
      stage: "battle_setup",
      card: { id: marshal.id, title: marshal.title, type: "enemy", flavor: marshal.flavor },
      battle: { enemyName: marshal.enemyName, stat: marshal.stat, difficulty: marshal.difficulty, modifiers: [] }
    };

    const tv = battlePresentation(createTvProjection(state));
    const owner = battlePresentation(createPhoneProjection(state, ownerSeatId));
    expect(tv.encounter.victoryReward).toBe("8 Trophies / Artifact recovered");
    expect(tv.encounter.failureStakes).toMatch(/1 Wound suffered.*Threat remains on this space.*Rerolls blocked/i);
    expect(owner.encounter.failureStakes).toBe(tv.encounter.failureStakes);
    expect(JSON.stringify(tv.encounter)).not.toMatch(/notes|hand|agenda|message|credential/i);
  });

  it("restores the same battle result and keeps a Scar choice private", () => {
    const state = activateMultiplayer();
    const ownerSeatId = state.turnOrder[0]!;
    state.phase = "resolution";
    state.activeResolution = {
      id: "battle-private-choice",
      playerId: ownerSeatId,
      source: "threat",
      stage: "outcome_summary",
      card: { id: "ash-lane-cutters", title: "Ash-Lane Cutters", type: "enemy" },
      battle: { enemyName: "Ash-Lane Cutters", stat: "command", difficulty: 6, modifiers: [{ label: "Base Command", value: 3 }] },
      roll: { dice: [1, 2], baseTotal: 3, modifierTotal: 3, finalTotal: 6, target: 8, success: false },
      outcome: { title: "Combat loss", text: "Resolve a private consequence.", effects: [] }
    };
    state.pendingScarChoice = {
      selectionId: "secret-scar-choice",
      ownerSeatId,
      source: "mind",
      sourceCardId: "secret-source",
      sourceEventId: "secret-event",
      candidateIds: ["scar-mind-01", "scar-mind-02"],
      continuationPhase: "action",
      createdAt: "now",
      status: "awaitingSelection"
    };

    const tv = battlePresentation(createTvProjection(state));
    const restored = battlePresentation(createTvProjection(JSON.parse(JSON.stringify(state))));
    expect(tv.stage).toBe("consequence_required");
    expect(tv.waiting).toMatchObject({ actorDisplayName: "Joel", privateDecision: true });
    expect(restored).toEqual(tv);
    expect(JSON.stringify(tv)).not.toContain("scar-mind-01");
    expect(JSON.stringify(tv)).not.toContain("secret-scar-choice");
  });
});
