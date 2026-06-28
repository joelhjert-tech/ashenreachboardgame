// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
        heat={1}
        wounds={0}
        scars={0}
        attributes={{ cmd: 3, grit: 2, signal: 1, guile: 2, forge: 1 }}
        gearSummary="No gear equipped | 1 follower"
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
        isReady
      />
    );

    expect(screen.getByLabelText("Ultimate companions")).toHaveTextContent("Fandiablos");
    expect(screen.getByLabelText("Ultimate companions")).toHaveTextContent("ultimate");
    expect(screen.queryByText(/black route fuse/i)).not.toBeInTheDocument();
  });
});
