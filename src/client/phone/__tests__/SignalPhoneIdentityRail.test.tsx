// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignalPhoneIdentityRail } from "../SignalPhoneIdentityRail.js";

afterEach(cleanup);

function renderIdentity(connectionStatus = "open") {
  return render(
    <SignalPhoneIdentityRail
      characterId="bjornis"
      characterName="Bjornis"
      displayName="SigQA"
      wounds={1}
      salvage={4}
      scars={2}
      sectorId="ashwake-crossing"
      connectionStatus={connectionStatus}
      active
    />
  );
}

describe("SignalPhoneIdentityRail", () => {
  it("presents an open socket as connected and keeps identity explicit", () => {
    renderIdentity();

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SigQA" })).toBeInTheDocument();
    expect(screen.getByLabelText("Character vitals")).toHaveTextContent(/Wounds1\s+Salvage4/);
    expect(screen.getByText("Your turn")).toBeInTheDocument();
  });

  it("uses the Signal Theatre sector environment and recovers to its authored fallback", () => {
    const view = renderIdentity();
    const environment = view.container.querySelector<HTMLImageElement>(".signal-phone-identity__sector img");

    expect(environment).toHaveAttribute(
      "src",
      "/assets/riftfall/environments/signal-theatre/sectors/ashwake-crossing.png"
    );
    fireEvent.error(environment!);
    expect(environment).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/world-stage.png"
    );
  });
});
