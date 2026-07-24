// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignalPhoneIdentityRail } from "../SignalPhoneIdentityRail.js";

afterEach(cleanup);

function renderIdentity() {
  return render(
    <SignalPhoneIdentityRail
      characterId="bjornis"
      characterName="Bjornis"
      displayName="SigQA"
      wounds={1}
      salvage={4}
      sectorId="ashwake-crossing"
    />
  );
}

describe("SignalPhoneIdentityRail", () => {
  it("keeps identity, location, and vitals in one compact row", () => {
    renderIdentity();

    expect(screen.getByRole("heading", { name: "SigQA" })).toBeInTheDocument();
    expect(screen.getByLabelText("Character vitals")).toHaveTextContent(/Wounds1\s+Salvage4/);
    expect(screen.getByText(/Bjornis · Ashwalk Bridge/i)).toBeInTheDocument();
    expect(screen.queryByText(/connected|your turn|waiting/i)).not.toBeInTheDocument();
    expect(document.querySelector(".signal-phone-identity__sector")).not.toBeInTheDocument();
  });
});
