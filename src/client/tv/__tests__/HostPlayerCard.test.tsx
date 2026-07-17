// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import { HostPlayerCard } from "../HostPlayerCard.js";

describe("HostPlayerCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders ultimate companion badges without exposing full inventory", () => {
    render(
      <HostPlayerCard
        seatId="seat-1"
        isOpen={false}
        isConnected
        characterName="Sable Vey"
        characterTitle="Void Marshal"
        portraitUrl="/assets/riftfall/characters/void-marshal.png"
        locationName="Ashwake Crossing"
        fieldStatus="Field status stable"
        wounds={0}
        scars={0}
        attributes={{ cmd: 3, grit: 2, signal: 1, guile: 2, forge: 1 }}
        gearSummary="No gear equipped | 1 follower"
        equippedGearDetails={[{
          slot: "utility",
          id: "choir-lantern",
          instanceId: "lantern-1",
          name: "Choir Lantern",
          statBonus: { stat: "signal", amount: 1 },
          effectModel: "charged",
          currentCharges: 1,
          maxCharges: 2
        }]}
        contractSummary="No active contract"
        specialAbilitySummary="Void Order: steady an allied operative."
        companionBadges={[
          {
            id: "fandiablos",
            name: "Fandiablos",
            tier: "ultimate",
            ultimateCompanion: true,
            exhausted: false
          }
        ]}
        isActiveTurn
      />
    );

    expect(screen.getByLabelText("Followers")).toHaveTextContent("Fandiablos");
    expect(screen.getByLabelText("Followers")).toHaveTextContent("ultimate");
    expect(screen.getByLabelText("Equipped gear bonuses")).toHaveTextContent("+1 SIGNAL · always active");
    expect(screen.getByLabelText("Equipped gear bonuses")).toHaveTextContent("1/2 charges");
    expect(screen.queryByText(/^Ready$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sable Vey · Void Marshal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/black route fuse/i)).not.toBeInTheDocument();
    expect((document.querySelector(".host-player-card-attribute-command") as HTMLElement).style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("command")["--challenge-color"]
    );
  });
});
