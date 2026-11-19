// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignalPhoneIdentityRail } from "../SignalPhoneIdentityRail.js";

afterEach(cleanup);

function identity(connectionReady = true) {
  return (
    <SignalPhoneIdentityRail
      connectionReady={connectionReady}
      characterId="bjornis"
      characterName="Bjornis"
      displayName="SigQA"
      wounds={1}
      salvage={4}
      sectorId="ashwake-crossing"
    />
  );
}

function renderIdentity(connectionReady = true) {
  return render(identity(connectionReady));
}

describe("SignalPhoneIdentityRail", () => {
  it("shows a reconnect message and drops the online indicator until room sync", () => {
    const view = renderIdentity(false);

    expect(screen.getByTestId("signal-phone-identity")).toHaveAttribute("data-connection", "offline");
    expect(screen.getByText(/reconnecting/i)).toBeVisible();

    view.rerender(identity(true));
    expect(screen.getByTestId("signal-phone-identity")).toHaveAttribute("data-connection", "online");
    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  });

  it("keeps identity, location, and vitals in one compact row", () => {
    renderIdentity();

    expect(screen.getByRole("heading", { name: "SigQA" })).toBeInTheDocument();
    expect(screen.getByLabelText("Character vitals")).toHaveTextContent(/Wounds1\s+Salvage4/);
    expect(screen.getByText("Bjornis")).toBeInTheDocument();
    expect(screen.getByText("Ashwalk Bridge")).toBeInTheDocument();
    expect(screen.getByTestId("signal-phone-identity")).toHaveAttribute("data-connection", "online");
    expect(screen.queryByText(/connected|your turn|waiting/i)).not.toBeInTheDocument();
    expect(document.querySelector(".signal-phone-identity__sector")).not.toBeInTheDocument();
  });
});
