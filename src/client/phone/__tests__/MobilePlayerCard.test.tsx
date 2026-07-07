// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import { MobilePlayerCard } from "../MobilePlayerCard.js";
import type { PhoneSelfState } from "../../shared/types.js";

afterEach(() => {
  cleanup();
});

const self: PhoneSelfState = {
  seatId: "seat-1",
  sectorId: "ashwake-crossing",
  hand: [],
  notes: [],
  character: {
    id: "void-marshal",
    name: "Tarek Voss",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
};

describe("MobilePlayerCard", () => {
  it("shows projected character role and complexity on the player card", () => {
    render(
      <MobilePlayerCard
        self={{
          ...self,
          character: {
            ...self.character,
            presentation: {
              role: "Commander",
              complexity: "beginner",
              playstyleSummary: "A clear first-game leader.",
              recommendedForFirstGame: true,
              strengths: ["Command"],
              weaknesses: ["Low Signal"],
              usefulStats: ["command", "grit"],
              signatureItemSummary: "Cinder Suture Kit.",
              startingContractSummary: "Warbell recovery."
            }
          }
        }}
        activeContractCard={null}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="active"
        winnerSeatId={null}
        phase="action"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={null}
        scenarioTelemetry={[]}
        escalationLevel={0}
        escalationThreshold={6}
        escalationModifier={0}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/commander \| beginner/i)).toBeInTheDocument();
    expect(screen.getByText(/global escalation 0\/6, \+0/i)).toBeInTheDocument();
    expect((document.querySelector(".phone-sheet-stat-card-command") as HTMLElement).style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("command")["--challenge-color"]
    );
    expect((document.querySelector(".phone-sheet-stat-card-guile") as HTMLElement).style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("guile")["--challenge-color"]
    );
    expect((document.querySelector(".phone-sheet-stat-card-guile") as HTMLElement).style.getPropertyValue("--challenge-color")).not.toBe(
      "#E3B341"
    );
  });

  it("shows compact stat bonuses without merging permanent or gear sources into base", () => {
    render(
      <MobilePlayerCard
        self={{
          ...self,
          character: {
            ...self.character,
            stats: { ...self.character.stats, command: 4 },
            statUpgrades: { command: 1 },
            heldGear: [
              {
                id: "marshal-seal",
                name: "Marshal Seal",
                slot: "utility",
                statBonus: { stat: "command", amount: 1 }
              }
            ],
            equippedGear: { weapon: null, armor: null, utility: "marshal-seal" }
          }
        }}
        activeContractCard={null}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="active"
        winnerSeatId={null}
        phase="action"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={null}
        scenarioTelemetry={[]}
        escalationLevel={0}
        escalationThreshold={6}
        escalationModifier={0}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/base 3 \| permanent \+1 \| gear\/follower \+1/i)).toBeInTheDocument();
    expect(screen.getByText("(+1)")).toBeInTheDocument();
  });

  it("shows active Afflictions and facedown Affliction count without renaming wounds", () => {
    render(
      <MobilePlayerCard
        self={{
          ...self,
          character: {
            ...self.character,
            afflictions: {
              faceup: [
                {
                  id: "brittle-frame",
                  name: "Brittle Frame",
                  severity: 3,
                  category: "restriction",
                  duration: "ongoing",
                  trigger: "While faceup.",
                  rulesText: "You cannot use armor.",
                  isFaceupOngoing: true
                }
              ],
              facedownCount: 2
            }
          }
        }}
        activeContractCard={null}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="active"
        winnerSeatId={null}
        phase="action"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={null}
        scenarioTelemetry={[]}
        escalationLevel={0}
        escalationThreshold={6}
        escalationModifier={0}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByTestId("phone-afflictions-section")).toHaveTextContent("Afflictions");
    expect(screen.getByText("Brittle Frame")).toBeInTheDocument();
    expect(screen.getByText("Facedown Afflictions")).toBeInTheDocument();
    expect(screen.getByText(/resolved corruption remains/i)).toBeInTheDocument();
  });

  it("surfaces scenario victory messaging for the winner", () => {
    render(
      <MobilePlayerCard
        self={self}
        activeContractCard={null}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="ended"
        winnerSeatId="seat-1"
        phase="broadcast"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={{
          id: "scenario_broken_seal",
          name: "The Broken Seal",
          theme: "An ancient prison has cracked open.",
          difficulty: "easy-medium",
          pressureSummary: "Keep the seals intact.",
          confrontationTitle: "Reseal the Prison",
          progressLabel: "sealRestorationMarks",
          progress: 4,
          threshold: 2,
          setup: ["Place 6 Seal tokens on this scenario sheet."],
          specialRules: ["At the start of each player's turn, roll 1 die."],
          confrontationSteps: ["Test Grit 10 to hold the breached ward shut."],
          victoryText: "Pass at least two tests to win."
        }}
        scenarioTelemetry={[{ label: "Seal Tokens", value: "0" }]}
        escalationLevel={2}
        escalationThreshold={6}
        escalationModifier={0}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/the broken seal secured/i)).toBeInTheDocument();
    expect(screen.getByText(/joel won the confrontation and secured the broken seal/i)).toBeInTheDocument();
  });

  it("surfaces collapse messaging when the session ends without a winner", () => {
    render(
      <MobilePlayerCard
        self={self}
        activeContractCard={null}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="ended"
        winnerSeatId={null}
        phase="broadcast"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={{
          id: "scenario_dying_star",
          name: "The Dying Star",
          theme: "The system sun is collapsing.",
          difficulty: "hard",
          pressureSummary: "The star is almost gone.",
          confrontationTitle: "Ignite the Core",
          progressLabel: "ignitionMarks",
          progress: 2,
          threshold: 4,
          setup: ["Place 10 Star tokens on the scenario sheet."],
          specialRules: ["Remove 1 Star token at the end of each turn."],
          confrontationSteps: ["Test Guile 12."],
          victoryText: "Pass all ignition steps to win."
        }}
        scenarioTelemetry={[{ label: "Star Tokens", value: "0" }]}
        escalationLevel={8}
        escalationThreshold={8}
        escalationModifier={2}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/the dying star lost/i)).toBeInTheDocument();
    expect(screen.getByText(/the breach collapsed the run before the dying star could be secured/i)).toBeInTheDocument();
  });

  it("shows authored contract objective labels and progress on the player card", () => {
    render(
      <MobilePlayerCard
        self={{
          ...self,
          character: {
            ...self.character,
            activeContract: {
              contractId: "cartel-crossing-thread",
              progress: 1
            }
          }
        }}
        activeContractCard={{
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
        }}
        roomCode="RT7P4"
        displayName="Joel"
        connectionStatus="open"
        sessionStatus="active"
        winnerSeatId={null}
        phase="action"
        activeSeatId="seat-1"
        activeNemesis={null}
        activeScenario={null}
        scenarioTelemetry={[]}
        escalationLevel={0}
        escalationThreshold={6}
        escalationModifier={0}
        encounter={null}
        outcomeSummary={null}
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/crossing thread/i)).toBeInTheDocument();
    expect(screen.getByText(/clear the ashwake convoy lane \(1\/1 clears\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/clear the ashwake convoy lane/i).length).toBeGreaterThan(0);
  });
});
