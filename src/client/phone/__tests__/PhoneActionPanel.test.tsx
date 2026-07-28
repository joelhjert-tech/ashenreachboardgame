// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneActionPanel } from "../PhoneActionPanel.js";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import type { CharacterCatalogEntry, ClientIntent, PhonePatchPayload, Stat } from "../../shared/types.js";

const characters: CharacterCatalogEntry[] = [
  {
    id: "void-marshal",
    name: "Sable Vey",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
    trophies: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
];

function createPatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: {
      id: "scenario_broken_seal",
      name: "The Broken Seal",
      theme: "The last ward around the Cinder Gate is splitting.",
      difficulty: "easy-medium",
      pressureSummary: "6 seals remain. Each turn start, 1-2 weakens the ward and 3-4 heats the active operative.",
      confrontationTitle: "Reseal the Prison",
      progressLabel: "sealRestorationMarks",
      progress: 0,
      threshold: 2,
      setup: ["Place 6 Seal tokens on the scenario sheet."],
      specialRules: ["At the start of each operative turn, roll 1 die."],
      confrontationSteps: ["Test Grit 10 to hold the breached ward shut."],
      victoryText: "Pass at least 2 of the 3 confrontation tests to win."
    },
    scenarioTelemetry: [
      { label: "Seal Tokens", value: "6" },
      { label: "Pressure Roll", value: "1-2 weaken | 3-4 heat surge" }
    ],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, ready: true, kicked: false }
    ],
    turnOrder: ["seat-1", "seat-2"],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: ["glassmere-spindle"],
        danger: 2,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "ashwake-crossing",
        character: {
          id: "void-marshal",
          name: "Sable Vey",
          archetype: "Void Marshal",
          status: "active",
          activeContract: null,
          stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
          trophies: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    recentAbilityTriggers: [],
    encounter: {
      id: "glass-chime-swarm",
      title: "Glass Chime Swarm",
      cardType: "hazard",
      flavor: "A ringing tide skates over the broken rails.",
      difficulty: 6,
      stat: "signal"
    },
    pendingEnemyRoll: null,
    outcomeSummary: null,
    self: {
      seatId: "seat-1",
      sectorId: "ashwake-crossing",
      hand: [],
      notes: [],
      character: {
        id: "void-marshal",
        name: "Sable Vey",
        archetype: "Void Marshal",
        currentSpaceId: "ashwake-crossing",
        status: "active",
        stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
        trophies: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [],
        equippedGear: { weapon: null, armor: null, utility: null },
        abilities: []
      }
    },
    nemesis: null
  };

  return {
    ...patch,
    ...overrides,
    activeScenario: overrides.activeScenario ?? patch.activeScenario,
    scenarioProgress: overrides.scenarioProgress ?? patch.scenarioProgress
  };
}

describe("PhoneActionPanel", () => {
  it.each([
    {
      label: "hazard",
      encounter: {
        id: "glass-chime-swarm",
        title: "Glass Chime Swarm",
        cardType: "hazard" as const,
        flavor: "A ringing tide skates over the broken rails.",
        difficulty: 6,
        stat: "signal" as const
      },
      actionPattern: /face the hazard|attempt signal check|roll check dice/i
    },
    {
      label: "enemy",
      encounter: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        cardType: "enemy" as const,
        enemyName: "Cinder-Veil Stalker",
        flavor: "A hooked silhouette advances.",
        difficulty: 6,
        stat: "grit" as const
      },
      actionPattern: /begin encounter|enter combat|roll combat dice/i
    }
  ])("hides duplicate $label actions while the authoritative dice are rolling", ({ encounter, actionPattern }) => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter,
          activeResolution: {
            id: `seat-1:threat:${encounter.id}:rolling`,
            playerId: "seat-1",
            source: "threat",
            stage: "dice_roll",
            card: {
              id: encounter.id,
              title: encounter.title,
              type: encounter.cardType
            },
            battle: {
              enemyName: encounter.cardType === "enemy" ? encounter.enemyName : undefined,
              stat: encounter.stat,
              difficulty: encounter.difficulty,
              modifiers: []
            },
            outcome: {
              title: "Dice rolling",
              text: `${encounter.title} dice are rolling.`,
              effects: []
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: actionPattern })).not.toBeInTheDocument();
  });

  it("submits the focused production Scar through the authoritative choice intent", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={createPatch({
      phase: "resolution",
      pendingScarChoice: {
        selectionId: "scar-choice:seat-1:mind",
        source: "mind",
        sourceCardId: "qa-mind-scar",
        currentCount: 0,
        thirdScarWarning: false,
        cards: [
          {
            id: "scar-wound-12",
            title: "Relay Ghost",
            text: "The relay follows you.",
            trigger: "Remote signal tests strain the operative.",
            penalty: "Remote Signal -1.",
            relief: "Return to a relay.",
            source: "mind",
            burdenText: "The first remote Signal test each round suffers -1.",
            adaptationText: "Inspect the next Blue Threat at a relay."
          },
          {
            id: "scar-wound-13",
            title: "Choir Static",
            text: "The chorus never quiets.",
            trigger: "Escalation strains the operative.",
            penalty: "The first Escalation advance inflicts 1 Wound.",
            relief: "Silence the chorus.",
            source: "mind",
            burdenText: "The first Escalation advance inflicts 1 Wound.",
            adaptationText: "Gain +1 Signal against an Escalation test."
          }
        ]
      }
    })} />);

    expect(screen.getByRole("region", { name: /focused scar carousel/i })).toBeVisible();
    expect(screen.getByText(/1 of 2/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /accept relay ghost/i }));

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenCalledWith({
      type: "CHOOSE_SCAR",
      seatId: "seat-1",
      selectionId: "scar-choice:seat-1:mind",
      scarId: "scar-wound-12"
    });
  });

  it("keeps an owner-private Scar choice actionable over an active battle", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          encounter: {
            id: "ash-choir-crusader",
            title: "Ash Choir Crusader",
            cardType: "enemy",
            enemyName: "Ash Choir Crusader",
            flavor: "A burned hymn advances.",
            difficulty: 8,
            stat: "signal"
          },
          activeResolution: {
            id: "seat-1:threat:ash-choir-crusader:battle",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "ash-choir-crusader",
              title: "Ash Choir Crusader",
              type: "enemy"
            },
            battle: { enemyName: "Ash Choir Crusader", stat: "signal", difficulty: 8, modifiers: [] }
          },
          pendingScarChoice: {
            selectionId: "scar-choice:seat-1:mind",
            source: "mind",
            sourceCardId: "ash-choir-crusader",
            currentCount: 1,
            thirdScarWarning: false,
            cards: [
              {
                id: "scar-wound-12",
                title: "Relay Ghost",
                text: "The relay follows you.",
                trigger: "Remote signal tests strain the operative.",
                penalty: "Lose 1 Signal.",
                relief: "Return to a relay.",
                burdenText: "Remote Signal -1.",
                adaptationText: "+1 Command while wounded."
              }
            ]
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    const choice = screen.getByRole("button", { name: /choose relay ghost/i });
    expect(choice).toBeEnabled();

    fireEvent.click(choice);
    expect(onIntent).toHaveBeenCalledWith({
      type: "CHOOSE_SCAR",
      seatId: "seat-1",
      selectionId: "scar-choice:seat-1:mind",
      scarId: "scar-wound-12"
    });
  });

  it("keeps an occupied-slot discovery choice owner-controlled", () => {
    const onIntent = vi.fn();
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={createPatch({
      phase: "resolution",
      pendingGearEquipChoice: {
        choiceId: "discovery:equip:bridge-spike",
        itemCatalogId: "bridge-spike",
        itemInstanceId: "bridge-spike:one",
        itemName: "Bridge Spike",
        slot: "utility",
        currentItemCatalogId: "field-lens",
        currentItemInstanceId: "field-lens:one",
        currentItemName: "Field Lens"
      }
    })} />);

    fireEvent.click(screen.getByRole("button", { name: /Equip Bridge Spike/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "RESOLVE_GEAR_EQUIP_CHOICE",
      seatId: "seat-1",
      choiceId: "discovery:equip:bridge-spike",
      itemInstanceId: "bridge-spike:one",
      decision: "equip"
    });
    expect(screen.getByRole("button", { name: /Keep carried/i })).toBeVisible();
  });

  it("requires one explicit confirmation for the server-generated Memory Tax choice", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      pendingMemoryTaxChoicePrivate: {
        choiceId: "memory-tax-choice:failure",
        choiceVersion: 1,
        sourceTitle: "Memory Tax Gate",
        prompt: "Choose what the gate takes",
        options: [
          { optionId: "lose-salvage-1", label: "Lose 1 Salvage", detail: "Lose exactly 1 Salvage now." },
          { optionId: "next-non-battle-test-minus-1", label: "Next non-battle test: -1", detail: "Suffer -1 on your next non-battle test." }
        ]
      }
    });
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    expect(screen.getByRole("button", { name: /Confirm memory tax/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Lose 1 Salvage/i }));
    expect(onIntent).not.toHaveBeenCalled();
    const confirm = screen.getByRole("button", { name: /Confirm memory tax/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onIntent).toHaveBeenCalledWith({
      type: "MEMORY_TAX_CHOICE_REQUESTED",
      seatId: "seat-1",
      choiceId: "memory-tax-choice:failure",
      choiceVersion: 1,
      optionId: "lose-salvage-1"
    });
  });

  it("shows only server-generated False Route destinations and submits the immutable choice identity", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      pendingForcedDestinationChoicePrivate: {
        choiceId: "false-route-choice:failure",
        sourceTitle: "False-Route Procession",
        sourceSectorId: "middle_red_march_outpost",
        candidates: [
          { sectorId: "middle_anomaly_well", sectorName: "Static Chapel", direction: "clockwise", ring: "middle" },
          { sectorId: "middle_shard_sprawl", sectorName: "Chain-Maul Yard", direction: "counterclockwise", ring: "middle" }
        ]
      }
    });
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    expect(screen.getAllByText(/Choose the false route/i)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Clockwise: Static Chapel/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "FORCED_DESTINATION_SELECTED",
      seatId: "seat-1",
      choiceId: "false-route-choice:failure",
      destinationSectorId: "middle_anomaly_well"
    });
    expect(screen.queryByRole("button", { name: /Accept displacement/i })).not.toBeInTheDocument();
  });

  it("shows only the authoritative forced-displacement acknowledgement", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      pendingDisplacementPrivate: {
        reactionId: "displacement:route-splice-failure",
        sourceEventId: "route-splice-failure",
        sourceTitle: "Route Splice",
        originSectorId: "middle_red_march_outpost",
        originSectorName: "Choir Bastion",
        destinationSectorId: "middle_anomaly_well",
        destinationSectorName: "Static Chapel",
        prompt: "Accept the authoritative forced displacement.",
        riftAnchorSpike: null
      },
      outcomeSummary: {
        seatId: "seat-1",
        movedToSectorId: "middle_red_march_outpost",
        encounterCardId: "route-splice",
        encounterTitle: "Route Splice",
        encounterCardType: "hazard",
        checkStat: "grit",
        die1: 2,
        die2: 1,
        statBonus: 2,
        checkTotal: 5,
        difficulty: 8,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: false,
        summary: "The failed test still counts. Forced displacement is pending."
      }
    });
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    expect(screen.queryByTestId("phone-resolution-continue")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Accept displacement/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Accept displacement/ }));
    expect(screen.getByText(/Choir Bastion → Static Chapel/)).toBeInTheDocument();
    expect(screen.queryByText(/Rift Anchor Spike/i)).not.toBeInTheDocument();
    expect(onIntent).toHaveBeenCalledWith({ type: "FORCED_DISPLACEMENT_ACCEPTED", seatId: "seat-1", reactionId: "displacement:route-splice-failure" });
  });

  it("offers the owner-authoritative Rift Anchor Spike reaction and sends no mechanical values", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      pendingDisplacementPrivate: {
        reactionId: "displacement:route-splice-failure",
        sourceEventId: "route-splice-failure",
        sourceTitle: "Route Splice",
        originSectorId: "middle_red_march_outpost",
        originSectorName: "Choir Bastion",
        destinationSectorId: "middle_anomaly_well",
        destinationSectorName: "Static Chapel",
        prompt: "Accept the authoritative forced displacement.",
        riftAnchorSpike: { instanceId: "spike-1", currentCharges: 2, maxCharges: 2, chargeCost: 1, enabled: true }
      }
    });
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    fireEvent.click(screen.getByRole("button", { name: /Refuse displacement.*1 charge/i }));
    expect(screen.getByText(/Spend 1 charge to remain in Choir Bastion/i)).toBeInTheDocument();
    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR", seatId: "seat-1", gearId: "rift-anchor-spike", instanceId: "spike-1",
      forcedDisplacementReactionId: "displacement:route-splice-failure", forcedDisplacementSourceEventId: "route-splice-failure"
    });
  });

  it("shows the owner-only authoritative encounter payment action", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      pendingEncounterDecisionPrivate: {
        decisionId: "gate-loss:collectors-levy",
        decisionVersion: 4,
        sourceTitle: "Gate-Tax Collectors",
        prompt: "The Collectors demand 1 Salvage after your defeat.",
        mode: "required",
        salvageCost: 1,
        currentSalvage: 2,
        options: [{ optionId: "pay-levy", label: "Pay 1 Salvage", enabled: true }]
      }
    });
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    fireEvent.click(screen.getByRole("button", { name: /^Pay 1 Salvage/ }));
    expect(screen.getByText(/Current Salvage: 2/)).toBeInTheDocument();
    expect(onIntent).toHaveBeenCalledWith({ type: "ENCOUNTER_DECISION_REQUESTED", seatId: "seat-1", decisionId: "gate-loss:collectors-levy", decisionVersion: 4, optionId: "pay-levy" });
  });

  it("keeps a Hazard payment actionable on the guided Battle tab", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "resolution",
      activeResolution: {
        id: "seat-1:threat:gate-tax:test",
        playerId: "seat-1",
        source: "threat",
        stage: "outcome_summary",
        card: { id: "gate-tax-collectors", title: "Gate-Tax Collectors", type: "hazard", artType: "threat" },
        battle: { stat: "command", difficulty: 7, modifiers: [] },
        roll: { dice: [1, 2], baseTotal: 3, modifierTotal: 2, finalTotal: 5, target: 7, success: false },
        outcome: { title: "Payment required", text: "The Collectors demand payment.", effects: ["Pay 1 Salvage."] }
      },
      pendingEncounterDecisionPrivate: {
        decisionId: "gate-loss:collectors-levy",
        decisionVersion: 4,
        sourceTitle: "Gate-Tax Collectors",
        prompt: "The Collectors demand 1 Salvage after your defeat.",
        mode: "required",
        salvageCost: 1,
        currentSalvage: 2,
        options: [{ optionId: "pay-levy", label: "Pay 1 Salvage", enabled: true }]
      }
    });

    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} selectedTurnTab="battle" />);
    fireEvent.click(screen.getByRole("button", { name: /^Pay 1 Salvage/ }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "ENCOUNTER_DECISION_REQUESTED",
      seatId: "seat-1",
      decisionId: "gate-loss:collectors-levy",
      decisionVersion: 4,
      optionId: "pay-levy"
    });
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("shows Mira's Cinder Oath at the confrontation with her private Vow Note balance", () => {
    const onIntent = vi.fn();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          self: {
            seatId: "seat-1",
            sectorId: "center_cinder_gate",
            hand: [],
            notes: [],
            noteResources: { vow: 1 },
            character: {
              ...createPatch().self!.character,
              id: "cinder-monk",
              name: "Mira",
              archetype: "Cinder Monk",
              currentSpaceId: "center_cinder_gate"
            }
          }
        })}
      />
    );

    const button = screen.getByRole("button", { name: /prepare cinder oath/i });
    expect(button).toBeEnabled();
    expect(screen.getByText(/spend 1 vow note \(1 available\)/i)).toBeInTheDocument();
    fireEvent.click(button);
    expect(onIntent).toHaveBeenCalledWith({ type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "cinder-oath" });
  });

  it("keeps Cinder Oath disabled without a Vow Note and out of non-confrontation actions", () => {
    const mira = {
      ...createPatch().self!.character,
      id: "cinder-monk",
      name: "Mira",
      archetype: "Cinder Monk"
    };
    const { rerender } = render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          self: { seatId: "seat-1", sectorId: "center_cinder_gate", hand: [], notes: [], noteResources: {}, character: { ...mira, currentSpaceId: "center_cinder_gate" } }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /prepare cinder oath/i })).toBeDisabled();
    expect(screen.getAllByText(/requires 1 vow note \(0 available\)/i).length).toBeGreaterThan(0);

    rerender(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          self: { seatId: "seat-1", sectorId: "ashwake-crossing", hand: [], notes: [], noteResources: { vow: 1 }, character: { ...mira, currentSpaceId: "ashwake-crossing" } }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /prepare cinder oath/i })).not.toBeInTheDocument();
  });

  it("disables generic item/follower use shortcuts from server-confirmed use state", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          objectUseStates: [
            {
              source: "gear",
              id: "red-march-warbell",
              usedThisTurn: true,
              usedThisRound: true,
              remainingUses: 0,
              maxUses: 1,
              disabledReason: "Red March Warbell has already been used this turn."
            },
            {
              source: "follower",
              id: "choir-defector",
              usedThisTurn: true,
              usedThisRound: true,
              remainingUses: 0,
              maxUses: 1,
              disabledReason: "Choir Defector has already been used this round."
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "ashwake-crossing",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "ashwake-crossing",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [
                {
                  id: "red-march-warbell",
                  name: "Red March Warbell",
                  slot: "weapon",
                  category: "active",
                  statBonus: { stat: "grit", amount: 1 },
                  activeText: "Exhaust to add +2 to combat, then gain 1 heat.",
                  useLimit: "oncePerTurn"
                }
              ],
              equippedGear: { weapon: "red-march-warbell", armor: null, utility: null },
              followers: [
                {
                  id: "choir-defector",
                  name: "Choir Defector",
                  role: "ritualist",
                  text: "Once per round, reduce an anomaly instability or signal difficulty by 1 before rolling.",
                  useLimit: "oncePerRound"
                }
              ],
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /use red march warbell/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("priority-passive")).toHaveTextContent(/red march warbell/i);
    expect(screen.getByTestId("priority-passive")).toHaveTextContent(/already applied/i);
    expect(screen.getByRole("button", { name: /use choir defector/i })).toBeDisabled();
    expect(screen.getAllByText(/choir defector has already been used this round/i).length).toBeGreaterThan(0);
  });

  it("does not show a misleading Use action for passive-only followers", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          self: {
            seatId: "seat-1",
            sectorId: "ashwake-crossing",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "ashwake-crossing",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              followers: [
                {
                  id: "grave-medic-korr",
                  name: "Grave Medic Korr",
                  role: "medic",
                  text: "Passive: patch wounds after the dust settles.",
                  loyalty: 2,
                  lossCondition: "choice"
                }
              ],
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /use grave medic korr/i })).not.toBeInTheDocument();
  });

  it("hides action buttons when this seat is not active", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({ activeSeatIndex: 1 })}
      />
    );

    expect(screen.getByText(/waiting for another seat/i)).toBeInTheDocument();
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/waiting for mira/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/watch the tv command table/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/watch the tv/i);
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
  });

  it("routes a non-opposed hazard check to Action instead of Battle", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "glass-chime-swarm",
            title: "Glass Chime Swarm",
            cardType: "hazard",
            flavor: "A ringing tide skates over the broken rails.",
            difficulty: 6,
            stat: "signal"
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-current-prompt")).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-trial-shell");
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/glass chime swarm/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/hazard/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/ringing tide skates/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/signal/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/target 6/i);
    expect(screen.getByTestId("phone-battle-subject-art")).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(threats|fallbacks)\//));
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/useful now: signal/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/challenge/i);
    expect(screen.getByTestId("phone-useful-now")).not.toHaveTextContent(/^battle$/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/current value 1/i);
    expect(screen.getByRole("button", { name: /attempt signal check/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /turn actions/i })).toBeInTheDocument();
  });

  it("shows active affliction effects in Action challenge context", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "glass-chime-swarm",
            title: "Glass Chime Swarm",
            cardType: "hazard",
            flavor: "A ringing tide skates over the broken rails.",
            difficulty: 6,
            stat: "signal"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              afflictions: {
                faceup: [
                  {
                    id: "static-migraine",
                    name: "Static Migraine",
                    severity: 2,
                    category: "testPenalty",
                    duration: "ongoing",
                    trigger: "When testing Signal.",
                    rulesText: "Signal tests suffer -2, minimum 1.",
                    effectKind: "testModifier",
                    effectPayload: { stat: "signal", amount: -2, floor: 1 },
                    isFaceupOngoing: true
                  },
                  {
                    id: "brittle-frame",
                    name: "Brittle Frame",
                    severity: 3,
                    category: "restriction",
                    duration: "ongoing",
                    trigger: "Always.",
                    rulesText: "You cannot use armor.",
                    effectKind: "restriction",
                    effectPayload: { cannotUseArmor: true },
                    isFaceupOngoing: true
                  }
                ],
                facedownCount: 0
              }
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/affecting this roll/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/static migraine: -2 signal tests/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/blocking armor/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/blocked by brittle frame/i);
  });

  it("shows combat and not check when an active seat faces an enemy", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toHaveTextContent(/sable vey/i);
    expect(screen.getByTestId("phone-battle-shell")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-cinematic-stage")).toHaveTextContent(/grit ready/i);
    expect(screen.getByTestId("phone-battle-cinematic-stage")).toHaveTextContent(/difficulty\s*6/i);
    expect(screen.queryByLabelText(/^battle totals$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-current-prompt")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-subject-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt grit check/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
  });

  it("shows the Cinder Gate confrontation action instead of a generic end turn", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          self: {
            ...createPatch().self!,
            sectorId: "center_cinder_gate",
            character: {
              ...createPatch().self!.character,
              currentSpaceId: "center_cinder_gate"
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /resolve reseal the prison/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /end turn/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByTestId("phone-action-priority-stack")).toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
  });

  it("renders movement planner destination intel without leaking hidden deck card names", async () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          activeContractCard: {
            id: "anchor-market-ledger",
            name: "Anchor Market Ledger",
            factionGiver: "Pale Cartels",
            text: "Recover a sealed ledger from Anchor Market before the route disappears.",
            objective: {
              type: "spaceTextResolved",
              effectKey: "outer_waymarketExchange",
              label: "Recover the Anchor Market ledger",
              target: 1
            }
          },
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "outer_ember_sanctum",
            currentSectorName: "Pilgrim Lock",
            destinations: [
              {
                sectorId: "outer_waymarket",
                name: "Anchor Market",
                ring: "outer",
                distance: 1,
                route: ["outer_ember_sanctum", "outer_waymarket"],
                routeNames: ["Pilgrim Lock", "Anchor Market"],
                tags: ["shop", "crossroads"],
                threatIcons: ["yellow"],
                ruleText: "If clear, buy Gear, Supplies, or use Black Market Refresh.",
                loreText: "A market of sealed crates and oath-brokers.",
                shop: {
                  shopId: "outer_waymarketExchange",
                  shopName: "Anchor Market",
                  status: "open",
                  servicesPreview: ["Buy Gear", "Sell Gear", "Black Market Refresh"]
                },
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["shop", "reward", "danger"]
              }
            ]
          },
          sectorExplorationSummary: {
            sectorId: "outer_ember_sanctum",
            sectorName: "Pilgrim Lock",
            printedThreatIcons: [],
            unresolvedThreats: [],
            drawCountsDue: { red: 0, blue: 0, yellow: 0 },
            sectorTextLocked: false,
            shopLocked: false,
            lockedReason: null,
            sectorTextTitle: "Pilgrim Rest",
            shopName: null,
            explanationLines: ["Pilgrim Lock is clear."]
          },
          publicResultDeltas: [
            {
              id: "move-global-escalation",
              type: "scenarioPressure",
              label: "Global Escalation",
              value: 1,
              sign: "gain",
              targetScope: "scenario",
              visibility: "public",
              source: "scenario",
              publicText: "+1 Global Escalation",
              severity: "scenario"
            }
          ],
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "anchor-market-ledger",
                progress: 0
              }
            }
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-current-prompt")).not.toBeInTheDocument();
    expect(screen.queryByText(/turn console/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--move");
    expect(screen.getByTestId("phone-action-content-root")).toContainElement(screen.getByTestId("phone-movement-view"));
    expect(screen.queryByTestId("phone-action-secondary-status")).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "needs-destination");
    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/move 1 sector/i);
    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/pilgrim lock/i);
    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/1 legal destination/i);
    expect(screen.getAllByTestId("movement-destination")).toHaveLength(1);
    expect(screen.getByTestId("movement-destination")).toHaveTextContent(/mission/i);
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/global escalation/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/anchor market/i).length).toBeGreaterThan(0);
    const destinationCard = screen.getByTestId("movement-destination");
    expect(destinationCard).toHaveTextContent(/1 step/i);
    expect(destinationCard).toHaveTextContent(/shop \/ services/i);
    expect(destinationCard).toHaveTextContent(/threat risk/i);
    expect(destinationCard.querySelector('[data-testid="movement-tile-image"]')).toHaveAttribute(
      "src",
      "/assets/riftfall/environments/signal-theatre/sectors/outer_waymarket.png"
    );
    expect(screen.getByRole("button", { name: /select anchor market/i })).toBeInTheDocument();
    expect(screen.getByText("View details").closest("details")).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: /select anchor market/i }));

    expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "needs-confirm");
    expect(screen.getByRole("button", { name: /confirm anchor market/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("View details"));
    expect(screen.getByText(/pilgrim lock → anchor market/i)).toBeInTheDocument();
    expect(screen.getByText(/services: buy gear/i)).toBeInTheDocument();
    expect(screen.queryByText(/choir bulwark/i)).not.toBeInTheDocument();
  });

  it("shows current tile information before movement is rolled", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        selectedTurnTab="move"
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: null,
          activeContractCard: {
            id: "crossing-thread",
            name: "Crossing Thread",
            factionGiver: "Pale Cartels",
            text: "Clear the Ashwake convoy lane.",
            objective: {
              type: "spaceTextResolved",
              effectKey: "outer_ashwakeClearLane",
              label: "Clear the Ashwake convoy lane",
              target: 1
            }
          },
          players: [
            ...createPatch().players,
            {
              seatId: "seat-2",
              sectorId: "ashwake-crossing",
              character: {
                id: "signal-witch",
                name: "Mira",
                archetype: "Signal Witch",
                status: "active",
                activeContract: null,
                stats: { command: 1, grit: 2, signal: 4, guile: 3, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          sectorExplorationSummary: {
            sectorId: "ashwake-crossing",
            sectorName: "Ashwalk Bridge",
            printedThreatIcons: ["yellow"],
            unresolvedThreats: [
              {
                instanceId: "ashwake-crossing:marrow-tax-auditors",
                cardId: "marrow-tax-auditors",
                name: "Marrow-Tax Auditors",
                type: "enemy",
                lane: "yellow",
                blocksShop: true,
                blocksSectorText: true
              }
            ],
            drawCountsDue: { red: 0, blue: 0, yellow: 1 },
            sectorTextLocked: true,
            shopLocked: true,
            lockedReason: "Clear Marrow-Tax Auditors first.",
            sectorTextTitle: "Hold the Bridge",
            shopName: null,
            explanationLines: ["A blocker is holding the bridge."]
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "crossing-thread",
                progress: 0
              }
            }
          }
        })}
      />
    );

    const movementView = screen.getByTestId("phone-movement-view");
    expect(movementView).toHaveTextContent(/ashwalk bridge/i);
    expect(movementView).toHaveTextContent(/roll required/i);
    expect(movementView).toHaveTextContent(/roll once to reveal your legal destinations/i);
    expect(movementView).toHaveAttribute("data-movement-state", "needs-roll");
    expect(screen.getByRole("button", { name: /roll movement/i })).toBeVisible();
    expect(screen.queryByTestId("movement-destination")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-subject-card")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /roll movement/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_ROLL_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("presents movement approach totals on Move without Battle Assist", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        selectedTurnTab="move"
        patch={createPatch({
          phase: "resolution",
          activeResolution: {
            id: "seat-1:movement:glassmere-spindle:test",
            playerId: "seat-1",
            source: "movement",
            stage: "outcome_summary",
            card: {
              id: "glassmere-spindle",
              title: "Glassmere Spindle",
              type: "movement",
              flavor: "Approach check"
            },
            battle: {
              stat: "guile",
              difficulty: 7,
              modifiers: [{ label: "Guile", value: 2 }]
            },
            roll: {
              dice: [5],
              baseTotal: 5,
              modifierTotal: 2,
              finalTotal: 7,
              target: 7,
              success: true
            },
            outcome: {
              title: "Movement success",
              text: "Moved into Glassmere Spindle.",
              effects: []
            }
          }
        })}
      />
    );

    const result = screen.getByTestId("phone-approach-result");
    expect(result).toHaveTextContent(/Approach Result/i);
    expect(result).toHaveTextContent(/Glassmere Spindle/i);
    expect(result).not.toHaveTextContent(/Player total|Difficulty total|vs/i);
    expect(within(result).getByTestId("phone-roll-result")).toHaveTextContent(/^Total7$/i);
    expect(within(result).getByTestId("phone-roll-result")).toHaveAccessibleName(
      "Player total 7, Difficulty total 7"
    );
    expect(within(result).getByAltText(/glassmere spindle location artwork/i)).toHaveAttribute(
      "src",
      "/assets/riftfall/environments/signal-theatre/sectors/glassmere-spindle.png"
    );
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByText(/Enemy Movement/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onIntent).toHaveBeenCalledWith({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  });

  it("lets the player inspect a route without committing movement, then confirm", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "outer_ember_sanctum",
            currentSectorName: "Pilgrim Lock",
            destinations: [
              {
                sectorId: "ashwake-crossing",
                name: "Ashwalk Bridge",
                ring: "outer",
                distance: 1,
                route: ["outer_ember_sanctum", "ashwake-crossing"],
                routeNames: ["Pilgrim Lock", "Ashwalk Bridge"],
                tags: ["hazard", "crossroads"],
                threatIcons: ["yellow"],
                ruleText: "If clear, mark your route and gain a scouting note.",
                faceUpThreats: [
                  {
                    instanceId: "ashwake-crossing:chain-maul-salvager",
                    cardId: "chain-maul-salvager",
                    name: "Chain-Maul Salvager",
                    type: "enemy",
                    deck: "red",
                    challenge: { stat: "grit", value: 7 },
                    blocksShop: true,
                    blocksSectorText: true
                  }
                ],
                occupants: [{ playerId: "seat-2", name: "Mira", characterName: "Signal Witch" }],
                strategicTags: ["locked", "danger"]
              }
            ]
          }
        })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /select ashwalk bridge/i }));
    expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "needs-confirm");
    expect(screen.getByRole("button", { name: /confirm ashwalk bridge/i })).toBeVisible();
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_DESTINATION_PREVIEWED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
    fireEvent.click(screen.getByText("View details"));
    expect(screen.getByText(/visible blockers: chain-maul salvager/i)).toBeInTheDocument();
    expect(screen.getByText(/operatives present: mira \(signal witch\)/i)).toBeInTheDocument();
    expect(screen.getByText(/pilgrim lock → ashwalk bridge/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /change/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_DESTINATION_PREVIEWED",
      seatId: "seat-1",
      toSectorId: null
    });
    expect(screen.queryByRole("button", { name: /confirm ashwalk bridge/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select ashwalk bridge/i }));
    onIntent.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /confirm ashwalk bridge/i }));
    expect(screen.getByRole("button", { name: /moving to ashwalk bridge/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /moving to ashwalk bridge/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing",
      movementRevision: undefined,
      routeId: undefined,
      voidKeyInstanceId: undefined
    });
    expect(onIntent).toHaveBeenCalledTimes(1);
  });

  it("shows the accepted Spindle movement breakdown without adding controls", () => {
    render(<PhoneActionPanel characters={characters} onIntent={vi.fn()} patch={createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 5,
        rolledValue: 6,
        modifierSources: [{ label: "Spindle Static Squall", value: -1 }],
        currentSectorId: "pilgrim-lock",
        currentSectorName: "Pilgrim Lock",
        destinations: []
      }
    })} />);

    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/roll 6 · move 5/i);
    const summary = screen.getByTestId("movement-adjustments");
    expect(summary).not.toHaveAttribute("open");
    fireEvent.click(within(summary).getByText(/movement calculation/i));
    expect(summary).toHaveTextContent(/roll 6/i);
    expect(summary).toHaveTextContent(/spindle static squall -1/i);
    expect(summary).toHaveTextContent(/final movement 5/i);
    expect(screen.queryByRole("button", { name: /use spindle/i })).not.toBeInTheDocument();
  });

  it("previews authoritative Route Star variants and charges only on alternate confirmation", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={createPatch({ phase: "navigation", encounter: null, movementPlanner: {
      active: true, movementValue: 2, movementRevision: 9, currentSectorId: "origin", currentSectorName: "Origin", destinations: [{
        sectorId: "destination", name: "Ashen Chapel", ring: "outer", distance: 2,
        routeId: "route-default", defaultRouteId: "route-default", route: ["origin", "left", "destination"], routeNames: ["Origin", "Scorched Road", "Ashen Chapel"],
        routeVariants: [
          { routeId: "route-default", destinationId: "destination", sectorIds: ["origin", "left", "destination"], sectorNames: ["Origin", "Scorched Road", "Ashen Chapel"], distance: 2 },
          { routeId: "route-alternate", destinationId: "destination", sectorIds: ["origin", "right", "destination"], sectorNames: ["Origin", "Blastworks", "Ashen Chapel"], distance: 2 }
        ],
        tags: [], threatIcons: [], ruleText: "Arrive normally.", faceUpThreats: [], occupants: [], strategicTags: ["safe"],
        routeStarPrompt: { instanceId: "star-a", currentCharges: 2, maxCharges: 2, chargeCost: 1 }
      }]
    } })} />);
    fireEvent.click(screen.getByRole("button", { name: /select ashen chapel/i }));
    fireEvent.click(screen.getByText("View details"));
    expect(screen.getByTestId("route-star-prompt")).toHaveTextContent("Scorched Road");
    expect(screen.getByTestId("route-star-prompt")).toHaveTextContent("Blastworks");
    fireEvent.click(screen.getByRole("button", { name: /preview route/i }));
    expect(onIntent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "SELECT_ROUTE_STAR_VARIANT" }));
    fireEvent.click(screen.getByRole("button", { name: /choose this route/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "SELECT_ROUTE_STAR_VARIANT", seatId: "seat-1", instanceId: "star-a", destinationId: "destination", routeId: "route-alternate", movementRevision: 9 });
  });

  it("shows compact movement feedback after a confirmed move outcome", async () => {
    vi.useFakeTimers();

    try {
      const initialPatch = createPatch({
        phase: "navigation",
        encounter: null,
        movementPlanner: {
          active: true,
          movementValue: 1,
          currentSectorId: "ashwake-crossing",
          currentSectorName: "Ashwalk Bridge",
          destinations: [
            {
              sectorId: "outer_waymarket",
              name: "Anchor Market",
              ring: "outer",
              distance: 1,
              route: ["ashwake-crossing", "outer_waymarket"],
              routeNames: ["Ashwalk Bridge", "Anchor Market"],
              tags: ["shop"],
              threatIcons: ["yellow"],
              ruleText: "Trade under the iron awnings.",
              faceUpThreats: [],
              occupants: [],
              strategicTags: ["shop", "reward"]
            }
          ]
        }
      });
      const { rerender } = render(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={initialPatch}
        />
      );

      rerender(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={createPatch({
            phase: "action",
            encounter: null,
            self: {
              ...createPatch().self!,
              sectorId: "outer_waymarket",
              character: {
                ...createPatch().self!.character,
                currentSpaceId: "outer_waymarket"
              }
            },
            players: createPatch().players.map((player) =>
              player.seatId === "seat-1"
                ? {
                    ...player,
                    sectorId: "outer_waymarket"
                  }
                : player
            ),
            outcomeSummary: {
              seatId: "seat-1",
              movedToSectorId: "outer_waymarket",
              encounterCardId: null,
              encounterTitle: null,
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              summary: "Lane reached Anchor Market.",
              success: true
            }
          })}
        />
      );

      await act(async () => {});

      expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/moving to/i);
      expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/ashwalk bridge → anchor market/i);
      expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "resolving");
      expect(screen.queryByText(/no movement choice/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /roll movement/i })).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1300);
      });

      expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/anchor market/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears a prior movement outcome when a fresh navigation phase begins", async () => {
    vi.useFakeTimers();

    try {
      const previousMovementOutcome = {
        seatId: "seat-1",
        movedToSectorId: "outer_waymarket",
        encounterCardId: null,
        encounterTitle: null,
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        summary: "Lane reached Anchor Market.",
        success: true
      };
      const movedSelf = {
        ...createPatch().self!,
        sectorId: "outer_waymarket",
        character: {
          ...createPatch().self!.character,
          currentSpaceId: "outer_waymarket"
        }
      };
      const { rerender } = render(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={createPatch({
            phase: "action",
            encounter: null,
            self: movedSelf,
            outcomeSummary: previousMovementOutcome
          })}
        />
      );

      await act(async () => {});
      expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "resolving");

      rerender(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={createPatch({
            phase: "navigation",
            encounter: null,
            self: movedSelf,
            movementPlanner: null,
            outcomeSummary: previousMovementOutcome
          })}
        />
      );

      await act(async () => {});

      expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "needs-roll");
      expect(screen.getByRole("button", { name: /roll movement/i })).toBeEnabled();
      expect(screen.queryByText(/moving to anchor market/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps long movement rows readable and puts confirm in the detail footer", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 6,
            currentSectorId: "ashwake-crossing",
            currentSectorName: "Ashwalk Bridge",
            destinations: [
              {
                sectorId: "pilgrim-lock-gate",
                name: "Weathered Pilgrim Lock Gate With a Very Long Signal Name",
                ring: "outer",
                distance: 6,
                route: [
                  "ashwake-crossing",
                  "votive-engine-room",
                  "deadwater-marsh",
                  "colony-outskirts",
                  "broken-census-hall",
                  "pilgrim-lock-gate"
                ],
                routeNames: [
                  "Ashwalk Bridge",
                  "Votive Engine Room",
                  "Deadwater Marsh",
                  "Colony Outskirts",
                  "Broken Census Hall",
                  "Weathered Pilgrim Lock Gate With a Very Long Signal Name"
                ],
                tags: ["shop", "objective"],
                threatIcons: [],
                ruleText: "If clear, open the Pilgrim trade lock.",
                loreText: "A fortified lock gate controlling access to the trade route.",
                shop: {
                  shopId: "pilgrim-lock-market",
                  shopName: "Pilgrim Lock Gate",
                  status: "open",
                  servicesPreview: ["Buy Gear", "Repair", "Trade"]
                },
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["reward", "shop", "safe"]
              }
            ]
          }
        })}
      />
    );

    const row = screen.getByTestId("movement-destination");
    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent("Ashwalk Bridge");
    expect(row).toHaveTextContent(/weathered pilgrim lock gate/i);
    expect(row).toHaveTextContent(/6 steps/i);
    expect(row).toHaveTextContent(/shop \/ services/i);
    expect(row).toHaveTextContent(/no visible threat/i);
    expect(row.querySelector('[data-testid="movement-tile-fallback"]')).toBeInTheDocument();

    const scrollRoot = screen.getByTestId("phone-action-content-root");
    scrollRoot.scrollTop = 480;

    fireEvent.click(screen.getByRole("button", { name: /select weathered pilgrim lock gate/i }));

    expect(scrollRoot.scrollTop).toBe(480);
    expect(row).toHaveClass("is-selected");
    expect(screen.getByRole("button", { name: /confirm weathered pilgrim lock gate/i })).toBeInTheDocument();
    fireEvent.click(within(row).getByText("View details"));
    expect(row).toHaveTextContent(/ashwalk bridge → votive engine room/i);
    expect(row).toHaveTextContent(/broken census hall/i);
    expect(row).toHaveTextContent(/fortified lock gate/i);
  });

  it("shows disabled gated destinations and prevents confirming them", async () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "middle_guardian_span",
            currentSectorName: "Guardian Span",
            destinations: [
              {
                sectorId: "inner_veil_rift",
                name: "Gate of Three Ashes",
                ring: "inner",
                distance: 1,
                route: ["middle_guardian_span", "inner_veil_rift"],
                routeNames: ["Guardian Span", "Gate of Three Ashes"],
                tags: ["movement"],
                threatIcons: [],
                ruleText: "Choose whether to anchor the surge or slip the fold.",
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["gate"],
                disabledReason: "Requires at least 1 Artifact"
              }
            ]
          }
        })}
      />
    );

    expect(screen.getAllByText(/requires at least 1 artifact/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ignore this route for now/i)).toBeNull();
    const lockedSelect = screen.getAllByRole("button").find((button) => button.textContent?.includes("Select") && button.hasAttribute("disabled"));
    expect(lockedSelect).toBeDefined();
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("renders interactive shop services and revealed stock purchases", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "forge market",
            shopCategory: "forge-armoury",
            stockCategory: "forge-armoury",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 6,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [
              {
                id: "buy-gear",
                label: "Buy Gear",
                shopCategory: "forge-armoury",
                cost: {},
                enabled: true
              },
              {
                id: "risk-action",
                label: "Deep Relic Search",
                cost: { salvage: 1 },
                enabled: true
              }
            ],
            revealedStock: [
              {
                cardId: "coffin-rig",
                name: "Coffin Rig",
                type: "gear",
                shopCategories: ["forge-armoury"],
                cost: { salvage: 3 },
                summary: "Forge +1 while bracing wounds.",
                affordable: true
              },
              {
                cardId: "saintplate-harness",
                name: "Saintplate Harness",
                type: "gear",
                cost: { salvage: 8 },
                summary: "Armor against wounds.",
                affordable: false,
                disabledReason: "Not enough Salvage"
              }
            ],
            sellInventory: [
              {
                gearId: "veil-hook",
                name: "Veil Hook",
                type: "gear",
                category: "active",
                sellValue: 1,
                summary: "Grit +1.",
                sellable: true
              },
              {
                gearId: "oath-chain-ledger",
                name: "Oath-Chain Ledger",
                type: "gear",
                category: "contractObject",
                sellValue: 1,
                summary: "Contract leverage.",
                sellable: false,
                disabledReason: "itemNotSellable"
              }
            ]
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/choose shop action/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/anchor market/i);
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--shop");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-shop-command-panel");
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/salvage and sellable gear/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/1 item can be sold here/i);
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.getByText(/forge market/i)).toBeInTheDocument();
    expect(screen.getAllByText(/forge armoury/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/salvage: 6/i)).toBeInTheDocument();
    expect(screen.queryByText(/choose a market service/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Deep Relic Search/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Review one offer. The server confirms price and availability/i)).toBeInTheDocument();
    expect(screen.queryByText(/\b(?:Heat|Risk)\b/i)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("phone-shop-category-icon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("phone-shop-category-icon")[0]).toHaveAttribute("src", "/assets/riftfall/ui/shop-category-forge-armoury.svg");
    expect(screen.getByRole("button", { name: /leave shop/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy gear/i })).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /coffin rig/i })).toBeInTheDocument();
    expect(screen.getByText(/forge \+1 while bracing wounds/i)).toBeInTheDocument();
    const buyCard = screen.getByRole("heading", { name: /coffin rig/i }).closest("article");
    expect(buyCard).not.toBeNull();
    expect(buyCard).toHaveClass("phone-wrap-card", "phone-wrap-card--shop");
    expect(buyCard?.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(buyCard?.querySelector(".phone-wrap-card__image")).toHaveAttribute("src", "/assets/cards/fallbacks/equipment.svg");
    expect(buyCard?.querySelector(".phone-wrap-card__description")).toHaveTextContent(/forge \+1 while bracing wounds/i);
    expect(buyCard?.querySelector(".phone-wrap-card__details")).toHaveTextContent(/cost: 3 salvage/i);
    expect(screen.getAllByRole("button", { name: /^buy /i })).toHaveLength(1);
    expect(buyCard?.querySelector(".phone-wrap-card__actions")).toContainElement(
      within(buyCard as HTMLElement).getByRole("button", { name: /buy coffin rig/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /buy coffin rig/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "coffin-rig"
    });

    fireEvent.click(screen.getByRole("button", { name: /next offer/i }));
    expect(screen.getAllByText(/not enough salvage/i).length).toBeGreaterThan(0);
    const unaffordableCard = screen.getByRole("heading", { name: /saintplate harness/i }).closest("article");
    expect(unaffordableCard).not.toBeNull();
    expect(unaffordableCard?.querySelector(".phone-wrap-card__image")).toHaveAttribute(
      "src",
      "/assets/cards/equipment/saintplate-harness.phone.webp"
    );
    expect(within(unaffordableCard as HTMLElement).getByRole("button", { name: /buy/i })).toBeDisabled();
    expect(unaffordableCard).toHaveTextContent(/ignore until you can pay or free the slot/i);
    fireEvent.click(screen.getByRole("button", { name: /all categories/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_BROWSE_SELECTED",
      seatId: "seat-1",
      view: "categories",
      selectedId: null
    });
    fireEvent.click(screen.getByRole("button", { name: /leave shop/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SKIP_REQUESTED",
      seatId: "seat-1"
    });
    expect(screen.getByRole("tablist", { name: /turn actions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
  });

  it("shows blocked shop reasons from the phone projection", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: false,
            blocked: true,
            blockedReason: "shopBlockedByThreat",
            blockedReasonText: "Shop blocked by threat.",
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "locked",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 6,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [
              {
                cardId: "market-stalker",
                name: "Market Stalker",
                type: "enemy",
                challenge: { stat: "grit", value: 7 }
              }
            ],
            services: [],
            revealedStock: [],
            sellInventory: []
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByRole("tab", { name: /shop/i })).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/shop locked: shop blocked by threat/i)
    );
    expect(screen.queryByRole("button", { name: /leave shop/i })).not.toBeInTheDocument();
  });

  it("allows the shop tab to show a no-shop state", () => {
    render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="shop" patch={createPatch({ encounter: null, shopEncounter: null })} />
    );

    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toHaveTextContent(/locked/i);
    expect(screen.getByRole("tab", { name: /shop/i })).not.toHaveTextContent(/shop locked: no shop here/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/shop locked/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/no shop here/i);
    expect(within(screen.getByTestId("phone-action-active-panel")).getByRole("status")).toHaveTextContent(/no shop here/i);
    expect(screen.getByText(/shop services appear when your operative is on a clear market/i)).toBeInTheDocument();
  });

  it("shows a direct battle lock reason when no enemy or check is active", () => {
    render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={createPatch({ encounter: null, pendingEnemyRoll: null })} />
    );

    expect(screen.getByRole("tab", { name: /battle/i })).toHaveTextContent(/locked/i);
    expect(screen.getByRole("tab", { name: /battle/i })).not.toHaveTextContent(/battle locked: no enemy here/i);
    expect(screen.getByRole("tab", { name: /battle/i })).toHaveAttribute("title", "Battle locked: no enemy here.");
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
  });

  it("shows a locked shop state during battle without rendering battle controls", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="shop"
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          shopEncounter: null
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
  });

  it("shows a locked action state during battle without duplicating battle content", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByText(/sector math/i)).not.toBeInTheDocument();
  });

  it("clears stale action-tab content when the selected command screen changes", () => {
    const movementPatch = createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "outer_ember_sanctum",
        currentSectorName: "Pilgrim Lock",
        destinations: [
          {
            sectorId: "outer_waymarket",
            name: "Anchor Market",
            ring: "outer",
            distance: 1,
            route: ["outer_ember_sanctum", "outer_waymarket"],
            routeNames: ["Pilgrim Lock", "Anchor Market"],
            tags: ["shop"],
            threatIcons: [],
            ruleText: "If clear, buy Gear.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["shop", "reward"]
          }
        ]
      }
    });
    const shopPatch = createPatch({
      encounter: null,
      shopEncounter: {
        sectorId: "outer_waymarket",
        sectorName: "Anchor Market",
        shopId: "outer_waymarket",
        shopName: "Anchor Market",
        available: true,
        blocked: false,
        shopType: "market",
        shopCategory: "market",
        stockCategory: "market",
        status: "open",
        activePlayer: {
          playerId: "seat-1",
          name: "Sable Vey",
          characterName: "Sable Vey",
          salvage: 3,
          wounds: { current: 0, max: 6 },
          trophies: 0,
          completedContracts: 0
        },
        blockingThreats: [],
        services: [],
        revealedStock: [],
        sellInventory: []
      }
    });
    const battlePatch = createPatch({
      encounter: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        cardType: "enemy",
        enemyName: "Cinder-Veil Stalker",
        flavor: "The ash around it boils before the strike.",
        difficulty: 6,
        stat: "grit"
      }
    });
    const actionPatch = createPatch({ encounter: null });

    const { rerender } = render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="move" patch={movementPatch} />
    );

    expect(screen.getByTestId("phone-movement-view")).toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={movementPatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.getByText(/no battle active/i)).toBeInTheDocument();
    expect(screen.getAllByText(/battle cards will appear here/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("phone-movement-view")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="shop" patch={shopPatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-shop-command-panel");
    expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("phone-movement-view")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={battlePatch} />);
    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="action" patch={actionPatch} />);
    expect(screen.getByTestId("phone-action-priority-stack")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /end turn/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
  });

  it("shows empty stock and purchase feedback without exposing rivalry agenda details", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          privateRivalry: {
            active: true,
            mode: "rivalry",
            secrecy: "private",
            revealState: "revealLocked",
            tableWarning: "Do not reveal private agenda data.",
            objective: {
              id: "claim-black-ledger",
              title: "Claim the Black Ledger",
              summary: "Secret shop leverage",
              progressLabel: "ledgerMarks",
              progress: 1,
              target: 3,
              stakes: "Keep it quiet"
            },
            recentPrivateNotes: ["Hidden-agenda reveal moments are not wired yet."],
            reveal: {
              state: "revealLocked",
              available: false,
              label: "Reveal agenda",
              hint: "Reveal is locked until this agenda's table moment becomes available.",
              lockedReason: "Reveal window has not opened."
            }
          },
          playerResultDeltas: [
            {
              id: "phone-shop-item",
              type: "itemBought",
              label: "Item bought",
              value: "Ashlock Carbine",
              sign: "gain",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              source: "shop:buy",
              publicText: "Sable Vey bought Ashlock Carbine.",
              severity: "reward"
            },
            {
              id: "phone-shop-salvage",
              type: "salvage",
              label: "Salvage",
              value: 3,
              sign: "loss",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              source: "shop:buy",
              publicText: "Sable Vey spent 3 Salvage.",
              severity: "loss"
            }
          ],
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 3,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [],
            revealedStock: [],
            sellInventory: [],
            recentOutcome: {
              operativeName: "Sable Vey",
              shopName: "Anchor Market",
              action: "buy",
              gained: "Ashlock Carbine",
              costPaid: { salvage: 3 },
              remainingSalvage: 3,
              summary: "Sable Vey purchased Ashlock Carbine."
            }
          }
        })}
      />
    );

    expect(screen.getByText(/no stock or service categories are currently operating/i)).toBeInTheDocument();
    expect(screen.getByTestId("phone-shop-category-icon")).toHaveAttribute("src", "/assets/riftfall/ui/shop-category-market.svg");
    expect(screen.getByText(/purchased: ashlock carbine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Item bought: Ashlock Carbine/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/-3 Salvage/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/claim the black ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/do not reveal private agenda data/i)).not.toBeInTheDocument();
  });

  it("shows sale feedback from recent shop outcomes", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 4,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [],
            revealedStock: [],
            sellInventory: [],
            recentOutcome: {
              operativeName: "Sable Vey",
              shopName: "Anchor Market",
              action: "sell",
              sold: "Veil Hook",
              salvageDelta: 1,
              remainingSalvage: 4,
              summary: "Sable Vey sold Veil Hook for 1 Salvage."
            }
          }
        })}
      />
    );

    expect(screen.getByText(/sold: veil hook/i)).toBeInTheDocument();
  });

  it("shows private rivalry useful-now hints only from the owner phone payload", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          privateRivalry: {
            active: true,
            mode: "rivalry",
            secrecy: "private",
            revealState: "revealAvailable",
            tableWarning: "Shown only on this phone.",
            objective: {
              id: "claim-black-ledger",
              title: "Claim the Black Ledger",
              summary: "Secret shop leverage",
              progressLabel: "ledgerMarks",
              progress: 2,
              target: 3,
              stakes: "Keep it quiet"
            },
            recentPrivateNotes: [],
            reveal: {
              state: "revealAvailable",
              available: true,
              label: "Reveal Agenda",
              hint: "Ready to reveal a public agenda moment.",
              lockedReason: null
            }
          }
        })}
      />
    );

    fireEvent.click(screen.getByText(/passive \/ already applied/i));
    expect(screen.getByTestId("priority-passive")).toHaveTextContent(/private agenda/i);
    expect(screen.getByTestId("priority-passive")).toHaveTextContent(/2\/3 ledgermarks/i);
    expect(screen.getByTestId("priority-passive")).toHaveTextContent(/ready to reveal a public agenda moment/i);
  });

  it("shows a movement planner empty state when no legal destinations are available", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "middle_guardian_span",
            currentSectorName: "Guardian Span",
            destinations: []
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-current-prompt")).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-movement-view")).toHaveTextContent(/move 1 sector/i);
    expect(screen.getByTestId("phone-movement-view")).toHaveAttribute("data-movement-state", "needs-destination");
    expect(screen.getAllByText(/no legal destinations/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /confirm move/i })).not.toBeInTheDocument();
  });

  it("renders a no movement roll state without direct neighbor move buttons", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: null
        })}
      />
    );

    const planner = within(screen.getByTestId("phone-movement-view"));
    expect(planner.getByText(/roll required/i)).toBeInTheDocument();
    expect(planner.getByText(/roll once to reveal your legal destinations/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /glassmere-spindle/i })).not.toBeInTheDocument();

    fireEvent.click(planner.getByRole("button", { name: /roll movement/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_ROLL_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("surfaces authored contract objective labels on accept and complete actions", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          availableContracts: [
            {
              id: "cartel-crossing-thread",
              name: "Crossing Thread",
              factionGiver: "Pale Cartels",
              text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.",
              objective: {
                type: "spaceTextResolved",
                effectKey: "outer_ashwakeClearLane",
                label: "Clear the Ashwake convoy lane",
                target: 1
              }
            }
          ]
        })}
      />
    );

    expect(screen.getByRole("button", { name: /accept crossing thread/i })).toBeInTheDocument();
    expect(screen.getByText(/clear the ashwake convoy lane/i)).toBeInTheDocument();

    cleanup();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          availableContracts: [
            {
              id: "cartel-crossing-thread",
              name: "Crossing Thread",
              factionGiver: "Pale Cartels",
              text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.",
              objective: {
                type: "spaceTextResolved",
                effectKey: "outer_ashwakeClearLane",
                label: "Clear the Ashwake convoy lane",
                target: 1
              }
            }
          ],
          activeContractCard: {
            id: "cartel-crossing-thread",
            name: "Crossing Thread",
            factionGiver: "Pale Cartels",
            text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.",
            objective: {
              type: "spaceTextResolved",
              effectKey: "outer_ashwakeClearLane",
              label: "Clear the Ashwake convoy lane",
              target: 1
            }
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "cartel-crossing-thread",
                progress: 1
              }
            }
          }
        })}
      />
    );

    expect(
      screen.getByRole("button", { name: /complete crossing thread/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/clear the ashwake convoy lane \(1\/1 clears\)/i).length).toBeGreaterThan(0);
  });

  it("offers stabilize when escalation is live and no encounter is blocking the action", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          escalationLevel: 2
        })}
      />
    );

    expect(screen.getByRole("button", { name: /stabilize breach/i })).toBeInTheDocument();
  });

  it("offers sector text resolution when the local board space is clear", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectorExplorationSummary: {
            sectorId: "ashwake-crossing",
            sectorName: "Ashwake Crossing",
            printedThreatIcons: ["red", "yellow"],
            unresolvedThreats: [],
            drawCountsDue: { red: 1, blue: 0, yellow: 1 },
            sectorTextLocked: false,
            shopLocked: false,
            lockedReason: null,
            sectorTextTitle: "Hold the Bridge",
            shopName: null,
            explanationLines: [
              "Printed icons: 1 red, 1 yellow.",
              "No unresolved blockers.",
              "Draw due: 1 red, 1 yellow.",
              "Sector text unlocked: Hold the Bridge."
            ]
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /resolve hold the bridge/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-sector-exploration")).not.toBeInTheDocument();
    expect(screen.getByTestId("priority-optional")).toHaveTextContent(/hold the bridge/i);
  });

  it("renders separate sector-text actions for authored board-text choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_shard_sprawl",
              name: "Shard Sprawl",
              regionTier: "midreach",
              neighbors: ["ashwake-crossing"],
              danger: 3,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_shard_sprawl",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_shard_sprawl",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_shard_sprawl",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /take passage stock.*yard bargain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /press for gossip.*yard bargain/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Webglass authored route choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_webglass_breach",
              name: "Webglass Breach",
              regionTier: "midreach",
              neighbors: ["ashwake-crossing"],
              danger: 3,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_webglass_breach",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_webglass_breach",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_webglass_breach",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /slip the hidden lane.*rail fracture/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /splice the relay seam.*rail fracture/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Guardian Span breach-entry choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_guardian_span",
              name: "Guardian Span",
              regionTier: "midreach",
              neighbors: ["inner_veil_rift"],
              danger: 4,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_guardian_span",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_guardian_span",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_guardian_span",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /align the threshold seals.*customs threshold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ghost a route marker.*customs threshold/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Gate of Cinders final-breach choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_gate_of_cinders",
              name: "Gate of Cinders",
              regionTier: "crownfall",
              neighbors: ["center_cinder_gate"],
              danger: 8,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_gate_of_cinders",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_gate_of_cinders",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_gate_of_cinders",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /brace the cinder locks.*break the gate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /time the relay pulse.*break the gate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ghost the last breach path.*break the gate/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Veil Rift breach-entry choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_veil_rift",
              name: "Veil Rift",
              regionTier: "crownfall",
              neighbors: ["inner_cinder_lattice"],
              danger: 7,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_veil_rift",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_veil_rift",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_veil_rift",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /anchor the surge.*three-ash entry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /slip the fold.*three-ash entry/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Cinder Lattice trial choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_cinder_lattice",
              name: "Cinder Lattice",
              regionTier: "crownfall",
              neighbors: ["inner_gate_of_cinders"],
              danger: 8,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_cinder_lattice",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_cinder_lattice",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_cinder_lattice",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /trace the ember pulses.*observatory trial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read the ghost angles.*observatory trial/i })).toBeInTheDocument();
  });

  it("shows game over state and hides action buttons when the session has ended", () => {
    const { queryByRole } = render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          status: "ended",
          winnerSeatId: "seat-2",
          matchProgress: {
            revision: 12,
            mode: "coop",
            stage: "victory",
            winProgress: { current: 2, required: 2, label: "Seal Restoration", changeId: null, change: null, changeReason: null },
            lossPressure: { current: 3, required: 6, label: "Loss Pressure", changeId: null, change: null, changeReason: null },
            thresholdWarning: null,
            finalStage: null,
            publicResult: {
              id: "match-result:12",
              outcome: "victory",
              title: "Mission Accomplished",
              reason: "The Broken Seal was restored.",
              missionName: "The Broken Seal",
              modeLabel: "Co-op",
              winningDisplayNames: ["Mira"],
              operativeDisplayNames: ["Joel", "Mira"],
              finalWinProgress: { current: 2, required: 2 },
              finalLossPressure: { current: 3, required: 6 },
              finalStageReached: true
            },
            allowedCommands: ["return_to_lobby", "leave_room"]
          }
        })}
      />
    );

    expect(screen.getByRole("region", { name: /match result/i })).toHaveTextContent(/mission accomplished/i);
    expect(screen.getByText(/the broken seal was restored/i)).toBeInTheDocument();
    expect(screen.getByText(/secured by mira/i)).toBeInTheDocument();
    expect(queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
  });

  it("shows the enemy roll trigger only for the assigned roller", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeSeatIndex: 1,
          pendingEnemyRoll: {
            fighterSeatId: "seat-2",
            assignedRollerSeatId: "seat-1",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /roll for enemy/i })).toBeInTheDocument();
    expect(screen.getByTestId("phone-battle-shell")).not.toHaveTextContent(/enemy roll/i);
  });

  it("shows a waiting state for seats that are neither the fighter nor the assigned roller", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeSeatIndex: 1,
          seats: [
            { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false },
            { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, ready: true, kicked: false },
            { seatId: "seat-3", characterId: "grave-engineer", displayName: "Pax", connected: true, ready: true, kicked: false }
          ],
          turnOrder: ["seat-2", "seat-3", "seat-1"],
          pendingEnemyRoll: {
            fighterSeatId: "seat-2",
            assignedRollerSeatId: "seat-3",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /waiting on pax/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /roll for enemy/i })).not.toBeInTheDocument();
  });

  it("renders a failed roll result with a named consequence action instead of a generic Continue", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          encounter: null,
          activeResolution: {
            id: "seat-1:threat:signal-static:test",
            playerId: "seat-1",
            source: "threat",
            stage: "roll_result",
            card: {
              id: "signal-static",
              title: "Signal Static",
              type: "hazard",
              artType: "threat"
            },
            battle: {
              stat: "signal",
              difficulty: 7,
              modifiers: [
                { label: "Signal", value: 1 },
                { label: "Affliction: Hollow Belly", value: -2 }
              ]
            },
            roll: {
              dice: [2, 5],
              baseTotal: 7,
              modifierTotal: -1,
              finalTotal: 6,
              target: 7,
              success: false
            },
            outcome: {
              title: "Check failed",
              text: "Failure: the signal collapses.",
              effects: ["Failure: lasting harm is handled by Scars."]
            }
          },
          requiredAction: {
            id: "accept-signal-static-failure",
            kind: "consequence",
            actorSeatId: "seat-1",
            actorDisplayName: "Lane",
            requiredTab: "action",
            label: "Accept consequence",
            detail: "Resolve the authoritative failure consequence.",
            canAct: true,
            waiting: false,
            privacy: "owner"
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/failure/i);
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept consequence/i })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /accept consequence/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("restores Continue after a successful reroll even when an optional Scar action is disabled", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          activeResolution: {
            id: "seat-1:threat:emberwatch-sparkfall:reroll",
            playerId: "seat-1",
            source: "threat",
            stage: "roll_result",
            card: {
              id: "emberwatch-sparkfall",
              title: "Emberwatch Sparkfall",
              type: "hazard",
              artType: "threat"
            },
            battle: {
              stat: "signal",
              difficulty: 10,
              modifiers: [{ label: "Signal", value: 2 }]
            },
            roll: {
              dice: [4, 4],
              baseTotal: 8,
              modifierTotal: 2,
              finalTotal: 10,
              target: 10,
              success: true
            },
            outcome: {
              title: "Solo reroll passed",
              text: "The sparkfall clears.",
              effects: []
            }
          },
          requiredAction: {
            id: "test:emberwatch-sparkfall:roll_result",
            kind: "test",
            actorSeatId: "seat-1",
            actorDisplayName: "Lane",
            requiredTab: "action",
            label: "Solo reroll passed",
            detail: "Review the result.",
            canAct: true,
            waiting: false,
            privacy: "owner",
            transitionStage: "continue-available",
            allowedCommand: "continue"
          },
          scarAdaptationControls: [{
            activationId: "ash-lanced:invalid",
            scarId: "scar-ash-lanced",
            scarName: "Ash-Lanced",
            ruleKey: "prevent-displacement",
            timing: "afterTest",
            effectText: "Prevent forced displacement.",
            limit: "oncePerRound",
            remainingUses: 1,
            enabled: false,
            disabledReason: "Not valid for the current signal window.",
            targets: []
          }]
        })}
      />
    );

    const continueButton = screen.getByTestId("phone-resolution-continue");
    expect(continueButton).toHaveTextContent(/^continue$/i);
    expect(continueButton).toBeEnabled();
    expect(screen.getByRole("button", { name: /use ash-lanced/i })).toBeDisabled();

    fireEvent.click(continueButton);
    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("shows one final verdict after the server has applied the consequence", () => {
    const resolution = {
      id: "seat-1:threat:signal-static:stable-verdict",
      playerId: "seat-1",
      source: "threat" as const,
      stage: "roll_result" as const,
      card: { id: "signal-static", title: "Signal Static", type: "hazard" as const, artType: "threat" as const },
      battle: { stat: "signal" as const, difficulty: 7, modifiers: [] },
      roll: { dice: [5], baseTotal: 5, modifierTotal: 2, finalTotal: 7, target: 7, success: true },
      outcome: { title: "Check cleared", text: "The signal stabilizes.", effects: ["Gain 1 Salvage."] }
    };
    const view = render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} patch={createPatch({ activeResolution: resolution })} />
    );
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();

    view.rerender(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            ...resolution,
            stage: "outcome_summary",
            outcome: { title: "Reward applied", text: "The signal stabilizes.", effects: ["Gain 1 Salvage."] }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-result-ready-gate", "true");
    expect(screen.getByText("Reward applied")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /continue/i })).toHaveLength(1);
  });

  it("keeps a transient opposed roll result non-actionable until its consequence settles", () => {
    const resolution = {
      id: "seat-1:threat:lantern-ash-ghoul:transient-result",
      playerId: "seat-1",
      source: "threat" as const,
      stage: "roll_result" as const,
      card: {
        id: "lantern-ash-ghoul",
        title: "Lantern-Ash Ghoul",
        type: "enemy" as const,
        artType: "threat" as const
      },
      battle: {
        enemyName: "Lantern-Ash Ghoul",
        stat: "grit" as const,
        difficulty: 12,
        modifiers: []
      },
      roll: {
        dice: [6, 4],
        baseTotal: 10,
        modifierTotal: 2,
        finalTotal: 12,
        target: 12,
        success: true
      },
      outcome: {
        title: "Threat defeated",
        text: "The ghoul falls.",
        effects: ["Add the enemy to the Trophy Pile."]
      }
    };
    const view = render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({ activeResolution: resolution })}
      />
    );

    expect(screen.getByTestId("phone-battle-resolution-wait")).toHaveTextContent(/applying battle consequence/i);
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/threat defeated|the gate yields/i)).not.toBeInTheDocument();

    view.rerender(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            ...resolution,
            stage: "outcome_summary"
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-result-ready-gate", "true");
    expect(screen.getByTestId("phone-resolution-card")).not.toHaveTextContent(/result ready.*waits for your choice/i);
    expect(screen.getAllByRole("button", { name: /^continue$/i })).toHaveLength(1);
  });

  it("keeps battle evidence and its primary action in the same phone scroll region", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:cinder-veil-stalker:action-cluster",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "enemy",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: []
            }
          }
        })}
      />
    );

    const scrollRegion = screen.getByTestId("phone-battle-scroll-region");
    const actionDock = screen.getByTestId("phone-battle-action-dock");
    expect(scrollRegion).toContainElement(actionDock);
    expect(actionDock).toHaveTextContent(/roll grit/i);
  });

  it("renders a zero-Threat draw as an inline completed queue entry, not a verdict", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:none",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: { id: "threat-none", title: "Threat queue", type: "hazard" },
            outcome: { title: "No threat drawn", text: "This arrival lane is clear.", effects: [] }
          }
        })}
      />
    );

    expect(screen.getByLabelText("Threat draw complete")).toHaveTextContent(/no threat drawn/i);
    expect(screen.queryByTestId("phone-roll-result")).not.toBeInTheDocument();
    expect(screen.queryByText(/the verdict holds/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /continue/i })).toHaveLength(1);
  });

  it("keeps completed movement context out of the battle command screen", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          outcomeSummary: {
            seatId: "seat-1",
            movedToSectorId: "ashwake-crossing",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            encounterCardType: "enemy",
            checkStat: null,
            die1: null,
            die2: null,
            statBonus: null,
            checkTotal: null,
            difficulty: null,
            enemyRollerSeatId: null,
            enemyDie1: null,
            enemyDie2: null,
            enemyBonus: null,
            enemyTotal: null,
            success: null,
            summary: "Moved into Ashwake Crossing. Cinder-Veil Stalker is revealed."
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("phone-movement-transition")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat/i })).toBeInTheDocument();
  });

  it("renders a recovery continue button for orphaned movement roll summaries", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          encounter: null,
          activeResolution: null,
          outcomeSummary: {
            seatId: "seat-1",
            movedToSectorId: "ashwake-crossing",
            encounterCardId: null,
            encounterTitle: "Red March Outpost",
            encounterCardType: null,
            checkStat: "guile",
            die1: 3,
            die2: 2,
            statBonus: 1,
            checkTotal: 6,
            difficulty: 7,
            enemyRollerSeatId: null,
            enemyDie1: null,
            enemyDie2: null,
            enemyBonus: null,
            enemyTotal: null,
            success: false,
            summary: "Failed to enter Red March Outpost. Failure: lasting harm is handled by Scars."
          }
        })}
      />
    );

    const result = screen.getByTestId("phone-approach-result");
    expect(result).not.toHaveTextContent(/player total|difficulty total|vs/i);
    expect(within(result).getByTestId("phone-roll-result")).toHaveTextContent(/^Total6$/i);
    expect(within(result).getByTestId("phone-roll-result")).toHaveAccessibleName(
      "Player total 6, Difficulty total 7"
    );
    expect(result).toHaveTextContent(/approach setback/i);
    expect(screen.getAllByText(/failed to enter red march outpost/i).length).toBeGreaterThan(0);
    expect(within(result).getByTestId("phone-resolution-continue")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("renders battle setup details from activeResolution", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:cinder-veil-stalker:test",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "enemy",
              flavor: "The ash around it boils before the strike.",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: [
                { label: "Base Grit", value: 2 },
                { label: "Black Route Fuse", value: 3 },
                { label: "Enemy", value: 6 }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).not.toHaveTextContent(/roll required|roll grit when ready/i);
    expect(screen.getAllByRole("button", { name: /^roll grit$/i })).toHaveLength(1);
    expect(screen.getByLabelText(/lane versus cinder-veil stalker/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /cinder-veil stalker/i })).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(threats|fallbacks)\//));
    expect(screen.getByTestId("phone-battle-cinematic-stage")).toHaveTextContent(/difficulty\s*8/i);
    expect(screen.queryByLabelText(/^battle totals$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(screen.getByLabelText(/battle details/i)).toHaveTextContent(/base grit \+2/i);
    expect(screen.getByLabelText(/battle details/i)).toHaveTextContent(/black route fuse \+3/i);
  });

  it("restores the battle roll after an authoritative submission rejection", () => {
    const onIntent = vi.fn();
    const battlePatch = createPatch({
      activeResolution: {
        id: "seat-1:threat:cinder-veil-stalker:retry",
        playerId: "seat-1",
        source: "threat",
        stage: "battle_setup",
        card: {
          id: "cinder-veil-stalker",
          title: "Cinder-Veil Stalker",
          type: "enemy",
          artType: "threat"
        },
        battle: {
          enemyName: "Cinder-Veil Stalker",
          stat: "grit",
          difficulty: 8,
          modifiers: []
        }
      }
    });
    const { rerender } = render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={battlePatch}
        requiredActionSubmissionPending={false}
      />
    );

    const roll = screen.getByRole("button", { name: /roll grit/i });
    fireEvent.click(roll);
    expect(roll).toBeDisabled();
    expect(roll).toHaveTextContent(/submitting roll/i);

    rerender(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={battlePatch}
        requiredActionSubmissionPending
      />
    );
    rerender(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={battlePatch}
        requiredActionSubmissionPending={false}
      />
    );

    expect(screen.getByRole("button", { name: /roll grit/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /roll grit/i }));
    expect(onIntent).toHaveBeenCalledTimes(2);
  });

  it("renders the production Duel Aperture battle layout from canonical state and intents", () => {
    const onIntent = vi.fn();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:cinder-veil-stalker:cinematic-layout",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "enemy",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: []
            }
          }
        })}
      />
    );

    const shell = screen.getByTestId("phone-battle-shell");
    const arena = screen.getByTestId("phone-battle-cinematic-stage");
    expect(shell).toHaveAttribute("data-battle-ui", "duel-aperture");
    expect(arena).toHaveAttribute("data-battle-presentation", "duel-aperture");
    expect(arena).toHaveAttribute("data-battle-phase", "ready");
    expect(within(arena).getByText(/operative/i)).toBeInTheDocument();
    expect(within(arena).getByText(/threat/i)).toBeInTheDocument();
    expect(within(arena).getByText(/grit ready/i)).toBeInTheDocument();
    expect(within(arena).getByText(/difficulty/i)).toBeInTheDocument();
    expect(within(arena).getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByLabelText(/^battle totals$/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-dice-disclosure")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-total-comparison")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/battle details/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /roll grit/i })).toBeInTheDocument();
    expect(shell).not.toHaveTextContent(/attack|defense|a\/d/i);

    fireEvent.click(screen.getByRole("button", { name: /roll grit/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" });
  });

  it("holds transient Duel Aperture totals until the authoritative consequence settles", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:cinder-veil-stalker:duel-aperture-result",
            playerId: "seat-1",
            source: "threat",
            stage: "roll_result",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "enemy",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: []
            },
            roll: {
              dice: [4, 3],
              baseTotal: 7,
              modifierTotal: 2,
              finalTotal: 9,
              target: 8,
              success: true
            }
          }
        })}
      />
    );

    const shell = screen.getByTestId("phone-battle-shell");
    expect(shell).toHaveAttribute("data-battle-ui", "resolution-wait");
    expect(screen.getByTestId("phone-battle-resolution-wait")).toHaveTextContent(/applying battle consequence/i);
    expect(screen.queryByTestId("phone-battle-cinematic-stage")).not.toBeInTheDocument();
    expect(shell).not.toHaveTextContent(/operative total\s*9|difficulty\s*8/i);
    expect(screen.queryByLabelText(/^battle totals$/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-dice-disclosure")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-total-comparison")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
  });

  it.each<Stat>(["command", "grit", "signal", "guile", "forge"])(
    "matches the phone battle frame to the authoritative %s challenge theme",
    (stat) => {
      render(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          patch={createPatch({
            activeResolution: {
              id: `seat-1:threat:theme-${stat}`,
              playerId: "seat-1",
              source: "threat",
              stage: "battle_setup",
              card: {
                id: `theme-${stat}-enemy`,
                title: `${stat} enemy`,
                type: "enemy",
                artType: "threat"
              },
              battle: {
                enemyName: `${stat} enemy`,
                stat,
                difficulty: 8,
                modifiers: []
              }
            }
          })}
        />
      );

      const shell = screen.getByTestId("phone-battle-shell");
      const theme = getChallengeThemeStyle(stat);
      expect(shell).toHaveAttribute("data-challenge-stat", stat);
      expect(shell.style.getPropertyValue("--challenge-color")).toBe(theme["--challenge-color"]);
      expect(shell.style.getPropertyValue("--challenge-border")).toBe(theme["--challenge-border"]);
    }
  );

  it("uses the focused battle shell when live battle data has a generic projected card type", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          activeResolution: {
            id: "seat-1:threat:projection-shape:test",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "threat",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: []
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-subject-card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /roll grit/i })).toBeInTheDocument();
  });

  it("consolidates a successful opposed battle into one outcome and one primary action", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          activeResolution: {
            id: "seat-1:threat:lantern-ash-ghoul:test",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "lantern-ash-ghoul",
              title: "Lantern-Ash Ghoul",
              type: "enemy",
              flavor: "The lamp burns behind its teeth.",
              artType: "threat"
            },
            battle: {
              enemyName: "Lantern-Ash Ghoul",
              stat: "grit",
              difficulty: 12,
              modifiers: [{ label: "Equipped", value: 2 }]
            },
            roll: {
              dice: [6, 4],
              baseTotal: 10,
              modifierTotal: 2,
              finalTotal: 12,
              target: 12,
              success: true
            },
            outcome: {
              title: "Threat defeated",
              text: "You keep the lamp burning.",
              effects: ["Lantern-Ash Ghoul added to the Trophy Pile."]
            }
          },
          playerResultDeltas: [
            {
              id: "defeated-ghoul",
              type: "threatDefeated",
              label: "Threat defeated",
              value: "Lantern-Ash Ghoul",
              sign: "gain",
              targetScope: "table",
              visibility: "public",
              source: "combat",
              publicText: "Lantern-Ash Ghoul was defeated.",
              severity: "reward"
            },
            {
              id: "ghoul-trophy",
              type: "trophy",
              label: "Trophy added",
              value: 1,
              sign: "gain",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              source: "combat",
              publicText: "Lantern-Ash Ghoul added to the Trophy Pile.",
              severity: "reward"
            }
          ]
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toBeInTheDocument();
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/^Total12$/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveAccessibleName("Your total 12, Challenge 12");
    expect(screen.getByText(/the gate yields/i)).toBeInTheDocument();
    expect(screen.getByText(/^threat defeated$/i)).toBeInTheDocument();
    expect(screen.getByText(/added to the trophy pile/i)).toBeInTheDocument();
    expect(screen.queryByText(/BattleThreatGrit/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-current-prompt")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /continue/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    expect(screen.queryByTestId("phone-battle-action-dock")).not.toBeInTheDocument();
    expect(screen.queryByText(/equipped \+2/i)).not.toBeInTheDocument();
  });

  it("presents defeat and penalties without duplicating the old battle panels", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          activeResolution: {
            id: "seat-1:threat:lantern-ash-ghoul:defeat",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "lantern-ash-ghoul",
              title: "Lantern-Ash Ghoul",
              type: "enemy",
              artType: "threat"
            },
            battle: {
              enemyName: "Lantern-Ash Ghoul",
              stat: "grit",
              difficulty: 12,
              modifiers: []
            },
            roll: {
              dice: [2, 3],
              baseTotal: 5,
              modifierTotal: 0,
              finalTotal: 5,
              target: 12,
              success: false
            },
            outcome: {
              title: "Operative defeated",
              text: "The ghoul drives you back.",
              effects: ["Suffer 1 Wound."]
            }
          },
          playerResultDeltas: [
            {
              id: "ghoul-wound",
              type: "wound",
              label: "Wound",
              value: 1,
              sign: "loss",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "ownerPrivate",
              source: "combat",
              publicText: "Sable Vey suffered a Wound.",
              privateText: "You suffered 1 Wound.",
              severity: "loss"
            }
          ]
        })}
      />
    );

    expect(screen.getByText(/the signal breaks/i)).toBeInTheDocument();
    expect(screen.getByText(/^operative defeated$/i)).toBeInTheDocument();
    expect(screen.getByText(/you suffered 1 wound/i)).toBeInTheDocument();
    expect(screen.getByTestId("phone-resolution-card")).toBeInTheDocument();
    expect(screen.getByTestId("phone-battle-shell")).toHaveClass("phone-battle-shell--result-gate", "phone-battle-shell--defeat");
    expect(screen.queryByText(/no quick actions available/i)).not.toBeInTheDocument();
  });

  it("renders active anomaly test cards with fallback art on Action", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          activeResolution: {
            id: "seat-1:anomaly:unknown-test:setup",
            playerId: "seat-1",
            source: "anomaly",
            stage: "battle_setup",
            card: {
              id: "unknown-anomaly-test",
              title: "Null Choir Interference",
              type: "test",
              flavor: "A dead signal braids itself through the command channel.",
              artType: "anomaly"
            },
            battle: {
              stat: "command",
              difficulty: 7,
              modifiers: [
                { label: "Base Command", value: 3 },
                { label: "Relay Discipline", value: 1 }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-trial-shell");
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/null choir interference/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/anomaly/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/dead signal braids/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/command/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/target 7/i);
    expect(screen.getByTestId("phone-battle-subject-art")).toHaveAttribute("src", "/assets/cards/fallbacks/anomaly.svg");
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
  });

  it("offers Choir Lantern only for the owning unrolled anomaly Signal tile challenge", () => {
    const onIntent = vi.fn();
    const patch = createPatch();
    patch.pendingTileChallengePrivate = { id: "pending-rift", challengeId: "rift-whispers-ashen-chapel", sectorId: "ashen-chapel", seatId: "seat-1", challengeType: "anomaly", testStat: "signal", difficulty: 8, authoredOrder: 0, totalChallenges: 1, rolled: false };
    patch.self!.character.heldGear = [{ id: "choir-lantern", instanceId: "choir-1", name: "Choir Lantern", slot: "utility", tier: "artifact", category: "chargedRelic", statBonus: { stat: "signal", amount: 1 }, effectModel: "charged", useLimit: "charge", currentCharges: 2, maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "choirLightSignalBonus", activationTiming: ["beforeAnomalySignalTest"], requiresEquipped: true }];
    patch.self!.character.equippedGear.utility = "choir-lantern";
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);
    fireEvent.click(screen.getByRole("button", { name: /use choir lantern/i }));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ type: "USE_GEAR", instanceId: "choir-1", pendingTileChallengeId: "pending-rift" }));
    expect(screen.getByText(/recurring anomaly challenge 1 of 1/i)).toBeInTheDocument();
  });

  it("offers Static Intercession consequence choices only in the final failed anomaly window", () => {
    const onIntent = vi.fn();
    const patch = createPatch();
    patch.phase = "resolution";
    patch.pendingTileChallengePrivate = {
      id: "pending-rift-failure", challengeId: "rift-whispers-ashen-chapel", sectorId: "ashen-chapel", seatId: "seat-1",
      challengeType: "anomaly", testStat: "signal", difficulty: 8, authoredOrder: 0, totalChallenges: 1, rolled: true,
      staticIntercessionReactionId: "pending-rift-failure:static-intercession",
      pendingFailureEffects: [{ effectId: "pending-rift-failure:failure-effect", summary: "Gain 1 Scar, then suffer 1 Wound" }]
    };
    patch.self!.character.heldGear = [{
      id: "choir-static-censer", instanceId: "censer-1", name: "Choir Static Censer", slot: "utility", tier: "artifact",
      category: "chargedRelic", statBonus: { stat: "signal", amount: 1 }, effectModel: "charged", useLimit: "charge",
      currentCharges: 2, maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none",
      chargedEffect: "staticIntercession", activationTiming: ["afterFailedTest"], requiresEquipped: true
    }];
    patch.self!.character.equippedGear.utility = "choir-static-censer";
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />);

    const choices = screen.getAllByRole("button", { name: /ignore this effect/i });
    expect(choices).toHaveLength(1);
    fireEvent.click(choices[0]!);
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({
      type: "USE_GEAR", instanceId: "censer-1", pendingTileChallengeId: "pending-rift-failure",
      staticIntercessionReactionId: "pending-rift-failure:static-intercession", pendingTileChallengeEffectId: "pending-rift-failure:failure-effect"
    }));
    fireEvent.click(screen.getByRole("button", { name: /accept all failure effects/i }));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ type: "CONTINUE_RESOLUTION" }));
  });

  it("shows battle assist and opens usable combat cards during an enemy encounter", () => {
    const onIntent = vi.fn();
    const heldGear = [
      {
        id: "black-route-fuse",
        name: "Black Route Fuse",
        slot: "weapon" as const,
        category: "dangerous" as const,
        statBonus: { stat: "grit" as const, amount: 1 },
        activeText: "Break for +3 Grit before the battle roll, then advance escalation by 1.",
        useLimit: "discard" as const,
        heatCost: 1
      },
      {
        id: "coffin-rig",
        name: "Coffin Rig",
        slot: "armor" as const,
        category: "passive" as const,
        statBonus: { stat: "forge" as const, amount: 1 }
      }
    ];

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heldGear
            }
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.getByText("Equipment available")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^gear$/i }));
    expect(screen.getByLabelText(/gear battle context/i)).toHaveTextContent(/black route fuse/i);
    expect(screen.getByLabelText(/gear battle context/i)).not.toHaveTextContent(/coffin rig/i);
    fireEvent.click(screen.getByRole("button", { name: /use black route fuse/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });
  });

  it("does not present Grit-only combat cards during Command battles", () => {
    const heldGear = [
      {
        id: "red-march-warbell",
        name: "Red March Warbell",
        slot: "weapon" as const,
        category: "active" as const,
        statBonus: { stat: "grit" as const, amount: 1 },
        activeText: "Mark the roll unstable to bank +2 Grit before the battle roll.",
        useLimit: "oncePerTurn" as const
      }
    ];

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "gate-tax-collectors",
            title: "Gate-Tax Collectors",
            cardType: "enemy",
            enemyName: "Gate-Tax Collectors",
            flavor: "The toll stamp is already wet.",
            difficulty: 6,
            stat: "command"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heldGear,
              equippedGear: { weapon: "red-march-warbell", armor: null, utility: null }
            }
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^gear$/i }));
    expect(screen.getByLabelText(/gear battle context/i)).toHaveTextContent(/no gear is eligible/i);
    expect(screen.queryByRole("button", { name: /use red march warbell/i })).not.toBeInTheDocument();
  });

  it("does not interrupt battle flow when no combat cards are usable", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heldGear: [
                {
                  id: "coffin-rig",
                  name: "Coffin Rig",
                  slot: "armor" as const,
                  category: "passive" as const,
                  statBonus: { stat: "forge" as const, amount: 1 }
                }
              ]
            }
          }
        })}
      />
    );

    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^gear$/i }));
    expect(screen.getByLabelText(/gear battle context/i)).toHaveTextContent(/no gear is eligible/i);
  });

  it("keeps trophies and stat upgrades out of the sector action tab", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              trophies: 6,
              trophyPile: [
                {
                  cardId: "cinder-veil-stalker",
                  name: "Cinder-Veil Stalker",
                  trophyValue: 6,
                  spentValue: 0,
                  stat: "grit",
                  cardType: "enemy"
                }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-action-priority-stack")).toBeInTheDocument();
    expect(screen.queryByTestId("phone-trophy-pile")).not.toBeInTheDocument();
    expect(screen.queryByText(/spend trophies equal to the next stat value/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grit 2 -> 3\s*cost 3 trophies/i })).not.toBeInTheDocument();
  });

  it("shows stat upgrade disabled reasons and upgrade result chips", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          playerResultDeltas: [
            {
              id: "upgrade-cost",
              type: "trophy",
              label: "Trophy",
              value: 4,
              sign: "loss",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              publicText: "Rumi spent 4 Trophies on training.",
              severity: "loss"
            },
            {
              id: "upgrade-stat",
              type: "statUpgrade",
              label: "Grit",
              value: 1,
              sign: "gain",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              publicText: "Rumi upgraded Grit to 4.",
              severity: "reward"
            }
          ],
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              stats: { command: 6, grit: 3, signal: 1, guile: 2, forge: 1 },
              trophies: 2
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /command 6\s*command is already at the maximum rank/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grit 3 -> 4\s*need 2 more trophies/i })).not.toBeInTheDocument();
    expect(screen.getByText(/-4 trophy/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 grit/i)).toBeInTheDocument();
  });

  it("renders scenario and space outcome summaries from activeResolution", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:scenario:ambient:test",
            playerId: "seat-1",
            source: "scenario",
            stage: "outcome_summary",
            card: {
              id: "scenario_broken_seal",
              title: "Scenario Pressure",
              type: "scenario"
            },
            outcome: {
              title: "Scenario pressure",
              text: "The seal flares before the table can move on.",
              effects: ["Doom rises by 1."]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-result-ready-gate", "true");
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/scenario pressure/i);
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/doom rises by 1/i);
  });

  it("replaces completed cooperative assistance controls with a stable result gate", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          activeResolution: {
            id: "seat-1:threat:furnace-ditch-collapse:test",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "furnace-ditch-collapse",
              title: "Furnace-Ditch Collapse",
              type: "hazard"
            },
            battle: { stat: "grit", difficulty: 12, modifiers: [] },
            roll: {
              dice: [6, 1],
              baseTotal: 7,
              modifierTotal: 8,
              finalTotal: 15,
              target: 12,
              success: true
            },
            outcome: {
              title: "Check passed",
              text: "The route holds.",
              effects: []
            },
            assistance: {
              testedStat: "grit",
              activeSeatId: "seat-1",
              contributions: [{ seatId: "seat-2", value: 3 }],
              total: 3
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveAttribute("data-result-ready-gate", "true");
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /roll grit/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  });

  it("does not offer Continue while a recalled operative must be replaced", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const base = createPatch();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          self: {
            ...base.self!,
            character: {
              ...base.self!.character,
              status: "recalled"
            }
          },
          activeResolution: {
            id: "seat-1:threat:ash-cinder-runt:recalled",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "ash-cinder-runt",
              title: "Ash-Cinder Runt",
              type: "enemy"
            },
            outcome: {
              title: "Operative recalled",
              text: "Wound threshold reached. Recruit a replacement.",
              effects: []
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recruit sable vey/i })).toBeEnabled();
  });

  it("requires a recalled operative to bind its pending Scar before recruitment", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const base = createPatch();
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          self: {
            ...base.self!,
            character: {
              ...base.self!.character,
              status: "recalled"
            }
          },
          pendingScarChoice: {
            selectionId: "scar-choice:seat-1:threshold",
            source: "unbound",
            sourceCardId: "wound-threshold",
            currentCount: 1,
            thirdScarWarning: false,
            cards: [
              {
                id: "scar-wound-12",
                title: "Relay Ghost",
                text: "The relay follows you.",
                trigger: "Remote signal tests strain the operative.",
                penalty: "Remote Signal -1.",
                relief: "Return to a relay.",
                burdenText: "Remote Signal -1.",
                adaptationText: "+1 Command while wounded."
              }
            ]
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /accept relay ghost/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /recruit /i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /accept relay ghost/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "CHOOSE_SCAR",
      seatId: "seat-1",
      selectionId: "scar-choice:seat-1:threshold",
      scarId: "scar-wound-12"
    });
  });

  it("does not repeat identical success copy as both outcome text and bullet", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:marrow-tax-auditors:test",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "marrow-tax-auditors",
              title: "Marrow-Tax Auditors",
              type: "hazard"
            },
            outcome: {
              title: "Check passed",
              text: "Success: note added: You found a loophole in a dead empire tariff.",
              effects: ["Success: note added: You found a loophole in a dead empire tariff."]
            }
          }
        })}
      />
    );

    const resolutionCard = screen.getByTestId("phone-resolution-card");

    expect(within(resolutionCard).getAllByText(/you found a loophole in a dead empire tariff/i)).toHaveLength(1);
    expect(within(resolutionCard).queryByRole("listitem", { name: /you found a loophole/i })).not.toBeInTheDocument();
  });

  it("offers owner-safe Scar-Sink Prayer effect choices and Accept consequence", () => {
    const onIntent = vi.fn();
    const base = createPatch();
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={createPatch({
      phase: "action",
      encounter: null,
      activeResolution: null,
      pendingScarConsequence: {
        reactionId: "scar-reaction-1", scarInstanceId: "seat-1:scar-wound-2:0", scarCardId: "scar-wound-2",
        scarTitle: "Static Burn", triggerType: "beforeTest", sourceEventId: "source-1",
        pendingEffects: [{ effectId: "effect-1", summary: "Record the static warning." }], rulesText: "Continue to resolve this Scar consequence."
      },
      self: { ...base.self!, character: { ...base.self!.character,
        equippedGear: { ...base.self!.character.equippedGear, utility: "heat-sink-prayer" },
        heldGear: [{ id: "heat-sink-prayer", instanceId: "prayer-1", name: "Scar-Sink Prayer", slot: "utility", tier: "artifact",
          category: "chargedRelic", statBonus: { stat: "signal", amount: 1 }, useLimit: "charge", charges: 2, currentCharges: 2, maxCharges: 2,
          startingCharges: 2, chargeCost: 1, rechargeRule: "none", effectModel: "charged", requiresEquipped: true,
          activationTiming: ["pendingScarConsequence"], chargedEffect: "scarSinkPrayer" }]
      } }
    })} />);
    fireEvent.click(screen.getByRole("button", { name: /ignore this effect/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR", seatId: "seat-1", gearId: "heat-sink-prayer", instanceId: "prayer-1",
      scarConsequenceReactionId: "scar-reaction-1", scarInstanceId: "seat-1:scar-wound-2:0", pendingScarEffectId: "effect-1"
    });
    expect(screen.getByRole("button", { name: /accept consequence/i })).toBeInTheDocument();
    expect(screen.queryByText(/heat-sink prayer/i)).not.toBeInTheDocument();
  });

  it("gates every arrival action while authoritative movement is still playing on TV", () => {
    render(<PhoneActionPanel characters={characters} onIntent={vi.fn()} patch={createPatch({
      phase: "sector",
      encounter: null,
      movementPresentationGate: {
        eventId: "movement:seat-1:12",
        ownerSeatId: "seat-1",
        ownerDisplayName: "Lane",
        destinationSectorId: "glassmere-spindle",
        destinationSectorName: "Glassmere Spindle",
        deadlineAt: "2026-07-26T12:00:05.000Z"
      }
    })} />);

    expect(screen.getByRole("heading", { name: /movement playing on tv/i })).toBeInTheDocument();
    expect(screen.getByText(/arrival actions unlock after the piece lands/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue|open shop|end turn/i })).not.toBeInTheDocument();
  });

  it("offers the setup host one direct Start New Game action after defeat", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const base = createPatch();
    render(<PhoneActionPanel characters={characters} onIntent={onIntent} patch={createPatch({
      status: "ended",
      phase: "action",
      winnerSeatId: null,
      selfIsSetupHost: true,
      matchProgress: {
        revision: 12,
        mode: "solo",
        stage: "defeat",
        winProgress: null,
        lossPressure: null,
        thresholdWarning: null,
        finalStage: null,
        publicResult: {
          id: "result:defeat:12",
          outcome: "defeat",
          title: "The Reach closes",
          missionName: "The Broken Seal",
          reason: "The expedition has failed.",
          modeLabel: "Solo",
          winningDisplayNames: [],
          operativeDisplayNames: ["Sable Vey"],
          finalWinProgress: null,
          finalLossPressure: null,
          finalStageReached: true
        },
        allowedCommands: ["return_to_lobby"]
      },
      self: { ...base.self!, seatId: "seat-1" }
    })} />);

    fireEvent.click(screen.getByRole("button", { name: /start new game/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "RETURN_TO_LOBBY_REQUESTED",
      seatId: "seat-1"
    });
  });
});
