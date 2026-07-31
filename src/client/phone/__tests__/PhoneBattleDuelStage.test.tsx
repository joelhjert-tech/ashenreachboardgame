// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhoneBattleDuelStage } from "../PhoneBattleDuelStage.js";

afterEach(cleanup);

describe("PhoneBattleDuelStage", () => {
  it("shows the server-authored victory reward and defeat stakes before rolling", () => {
    render(
      <PhoneBattleDuelStage
        operativeId="void-marshal"
        operativeName="Sable Vey"
        playerName="Joel"
        enemyArtType="threat"
        enemyId="pale-marshal"
        enemyName="The Pale Marshal"
        statLabel="Signal"
        operativeValue={4}
        opponentTotal={12}
        finalTotal={null}
        victoryReward="8 Trophies / Artifact recovered"
        failureStakes="1 Wound suffered / Threat remains on this space / Rerolls blocked"
      />
    );

    expect(screen.getByRole("note", { name: "Victory reward" })).toHaveTextContent(
      "On victory: 8 Trophies / Artifact recovered"
    );
    expect(screen.getByRole("note", { name: "Enemy intent" })).toHaveTextContent(
      "On defeat: 1 Wound suffered / Threat remains on this space / Rerolls blocked"
    );
  });
});
