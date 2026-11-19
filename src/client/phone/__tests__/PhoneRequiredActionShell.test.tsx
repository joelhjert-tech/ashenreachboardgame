// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RequiredActionProjection } from "../../shared/types.js";
import { PhoneRequiredActionShell } from "../PhoneRequiredActionShell.js";

const activeProjection: RequiredActionProjection = {
  id: "action:movement:seat-1",
  kind: "movement",
  actorSeatId: "seat-1",
  actorDisplayName: "Lane",
  requiredTab: "move",
  label: "Roll for movement",
  detail: "Roll once to reveal legal destinations.",
  canAct: true,
  waiting: false,
  privacy: "owner"
};

afterEach(cleanup);

describe("PhoneRequiredActionShell", () => {
  it("keeps the authoritative context above one existing primary action", () => {
    render(
      <PhoneRequiredActionShell projection={activeProjection} status="available" atRequiredTab>
        <button type="button">Roll movement</button>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByText("YOUR TURN")).toBeInTheDocument();
    expect(screen.queryByText("Roll for movement")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("labels an off-turn assistance request as a response instead of a new turn", () => {
    render(
      <PhoneRequiredActionShell
        projection={{ ...activeProjection, kind: "assistance", requiredTab: "action" }}
        status="available"
        atRequiredTab
        respondingToAssistance
      >
        <button type="button">Accept +4</button>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByText("ASSISTANCE REQUESTED")).toBeInTheDocument();
    expect(screen.queryByText("YOUR TURN")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept +4" })).toBeEnabled();
  });

  it("announces result and end-turn stages with semantic state labels", () => {
    const { rerender } = render(
      <PhoneRequiredActionShell projection={{ ...activeProjection, transitionStage: "continue-available", allowedCommand: "continue" }} status="available" atRequiredTab>
        <button type="button">Continue</button>
      </PhoneRequiredActionShell>
    );
    expect(screen.getByText("RESULT READY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

    rerender(
      <PhoneRequiredActionShell projection={{ ...activeProjection, transitionStage: "end-turn-available", allowedCommand: "end-turn" }} status="available" atRequiredTab>
        <button type="button">End Turn</button>
      </PhoneRequiredActionShell>
    );
    expect(screen.getByText("TURN READY")).toBeInTheDocument();
  });

  it("uses native disabled behavior while the command awaits an authoritative revision", () => {
    render(
      <PhoneRequiredActionShell projection={activeProjection} status="submitting" statusLabel="ROLLING" atRequiredTab>
        <button type="button">Roll movement</button>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByRole("status")).toHaveTextContent("ROLLING");
    expect(screen.getByRole("button", { name: /roll movement/i })).toBeDisabled();
  });

  it("shows the owner-facing resolving surface without announcing Result Ready", () => {
    render(
      <PhoneRequiredActionShell
        projection={{
          ...activeProjection,
          kind: "battle",
          requiredTab: "battle",
          label: "Applying battle consequence",
          detail: "The server is applying the authoritative consequence.",
          canAct: false,
          waiting: false,
          transitionStage: "result-visible"
        }}
        status="resolving"
        atRequiredTab
      >
        <section>Applying battle consequence</section>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByTestId("phone-required-action-shell")).toHaveAttribute("data-action-status", "resolving");
    expect(screen.queryByText("RESULT READY")).not.toBeInTheDocument();
    expect(screen.getByText("Applying battle consequence")).toBeInTheDocument();
  });

  it("replaces active controls with public-safe waiting copy", () => {
    const waitingProjection: RequiredActionProjection = {
      ...activeProjection,
      id: "waiting:movement:seat-2",
      actorSeatId: "seat-2",
      actorDisplayName: "Mira",
      label: "Movement selection",
      detail: "Mira is choosing a legal destination.",
      canAct: false,
      waiting: true,
      privacy: "public"
    };

    render(
      <PhoneRequiredActionShell projection={waitingProjection} status="blocked" atRequiredTab={false}>
        <button type="button">Private destination: Black Relay Spire</button>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByText("WAITING")).toBeInTheDocument();
    expect(screen.getByText("Mira is acting")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /private destination/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/black relay spire/i)).not.toBeInTheDocument();
  });

  it("does not repeat a resolving badge inside a waiting context", () => {
    render(
      <PhoneRequiredActionShell
        projection={{ ...activeProjection, actorSeatId: "seat-2", actorDisplayName: "Mira", canAct: false, waiting: true }}
        status="resolving"
        atRequiredTab={false}
      />
    );

    expect(screen.getAllByText("RESOLVING")).toHaveLength(1);
    expect(screen.queryByText("SUBMITTING")).not.toBeInTheDocument();
  });

  it("offers a clear return without forcing passive navigation repeatedly", () => {
    const onReturn = vi.fn();
    render(
      <PhoneRequiredActionShell projection={activeProjection} status="available" atRequiredTab={false} compact onReturnToAction={onReturn} />
    );

    fireEvent.click(screen.getByRole("button", { name: /return to move/i }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("shows only the server-authored public handoff ledger beside the next action", () => {
    render(
      <PhoneRequiredActionShell
        projection={{
          ...activeProjection,
          handoff: {
            id: "handoff-1",
            fromSeatId: "seat-2",
            fromDisplayName: "Mira",
            toSeatId: "seat-1",
            toDisplayName: "Lane",
            roundWrapped: false,
            summaryEntries: ["Moved to Ashwake Crossing", "Challenge cleared · 8/6", "1 Salvage gained"]
          }
        }}
        status="available"
        atRequiredTab
      >
        <button type="button">Roll movement</button>
      </PhoneRequiredActionShell>
    );

    expect(screen.getByLabelText("Mira turn summary")).toHaveTextContent(/moved to ashwake crossing/i);
    expect(screen.getByLabelText("Mira turn summary")).toHaveTextContent(/1 salvage gained/i);
    expect(screen.getByRole("button", { name: /roll movement/i })).toBeEnabled();
  });
});
