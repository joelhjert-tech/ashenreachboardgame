// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientIntent, PhonePatchPayload } from "../../shared/types.js";
import {
  PhoneActionPriorityStack,
  buildPhoneActionViewModel,
  type PhoneActionViewModelSources,
  type PriorityActionGroup
} from "../PhoneActionPriorityStack.js";

const startCommand: ClientIntent = {
  type: "START_TILE_ENCOUNTER",
  seatId: "seat-1",
  encounterId: "glass-chime-swarm",
  resolutionId: "resolution:glass-chime"
};

function sources(overrides: Partial<PhoneActionViewModelSources> = {}): PhoneActionViewModelSources {
  return {
    resolve: [],
    threat: [{ key: "start-tile-encounter", label: "Face the Hazard", detail: "Glass-Chime Swarm", command: startCommand, onClick: vi.fn() }],
    gear: [{ key: "equip-signal-cage", label: "Equip Signal Cage", detail: "+1 Signal", stat: "signal", onClick: vi.fn() }],
    items: [
      { key: "use-black-route-fuse", label: "Use Black Route Fuse", detail: "Available before an eligible roll", stat: "signal", onClick: vi.fn() },
      { key: "use-wound-seal", label: "Use Wound Seal", detail: "Available after failure", disabled: true, disabledReason: "Available after failure", onClick: vi.fn() }
    ],
    followers: [{ key: "use-follower-grave-scribe", label: "Use Grave Scribe", detail: "Once per round", stat: "signal", onClick: vi.fn() }],
    contracts: [{ key: "complete-contract", label: "Complete Long Mission Name", detail: "Deliver the sealed route ledger", onClick: vi.fn() }],
    table: [{ key: "signal-chorus", label: "Signal Chorus", detail: "Sector action", onClick: vi.fn() }],
    advance: [{ key: "end-turn", label: "End Turn", detail: "Pass control", onClick: vi.fn() }],
    passive: [{ key: "passive-vest", label: "Rivetplate Vest", detail: "Equipped · +1 Grit", state: "already-applied" }],
    ...overrides
  };
}

function patch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  return {
    phase: "action",
    sessionMode: "single-player",
    encounter: {
      id: "glass-chime-swarm",
      title: "Glass-Chime Swarm",
      cardType: "hazard",
      flavor: "A ringing tide skates over the broken rails.",
      difficulty: 6,
      stat: "signal"
    },
    activeResolution: {
      id: "resolution:glass-chime",
      playerId: "seat-1",
      source: "threat",
      stage: "card_reveal",
      card: { id: "glass-chime-swarm", title: "Glass-Chime Swarm", type: "hazard" }
    },
    self: { seatId: "seat-1", sectorId: "ashwake-crossing" },
    ...overrides
  } as PhonePatchPayload;
}

function allEntries(model: ReturnType<typeof buildPhoneActionViewModel>) {
  return Object.values(model.groups).flat();
}

afterEach(() => cleanup());

describe("production phone Priority Stack", () => {
  it("classifies every canonical action exactly once and preserves production order", () => {
    const model = buildPhoneActionViewModel(patch(), sources());
    const entries = allEntries(model);
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      "start-tile-encounter", "equip-signal-cage", "use-black-route-fuse", "use-wound-seal",
      "use-follower-grave-scribe", "complete-contract", "signal-chorus", "end-turn", "passive-vest"
    ]));
    expect(model.groups.required.map((entry) => entry.id)).toEqual(["start-tile-encounter"]);
    expect(model.groups.useful.map((entry) => entry.id)).toEqual(expect.arrayContaining(["use-black-route-fuse", "use-follower-grave-scribe"]));
    expect(model.groups.blocked.map((entry) => entry.id)).toEqual(expect.arrayContaining(["equip-signal-cage", "use-wound-seal", "complete-contract", "signal-chorus", "end-turn"]));

    render(<PhoneActionPriorityStack model={model} onIntent={vi.fn()} />);
    const sectionOrder = screen.getAllByText(/Required now|Useful now|Passive \/ already applied|Blocked/).map((node) => node.textContent?.split(" · ")[0]);
    expect(sectionOrder).toEqual(["Required now", "Useful now", "Passive / already applied", "Blocked"]);
  });

  it("submits the canonical encounter start and removes it after activation", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();
    const ready = buildPhoneActionViewModel(patch(), sources());
    const view = render(<PhoneActionPriorityStack model={ready} onIntent={onIntent} />);
    fireEvent.click(screen.getByRole("button", { name: /Face the Hazard/ }));
    expect(onIntent).toHaveBeenCalledWith(startCommand);

    const rollCommand: ClientIntent = { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" };
    const active = buildPhoneActionViewModel(patch({ activeResolution: { ...patch().activeResolution!, stage: "battle_setup" } }), sources({
      threat: [{ key: "hazard-check", label: "Roll check dice", detail: "Signal test", command: rollCommand, onClick: vi.fn() }]
    }));
    view.rerender(<PhoneActionPriorityStack model={active} onIntent={onIntent} />);
    expect(screen.queryByText("Face the Hazard")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Roll check dice/ })).toBeVisible();
  });

  it("renders passive effects without controls and blocked reasons accessibly", () => {
    const model = buildPhoneActionViewModel(patch(), sources());
    render(<PhoneActionPriorityStack model={model} onIntent={vi.fn()} />);
    expect(screen.getByTestId("priority-passive")).toHaveTextContent("View +");
    expect(screen.getByTestId("priority-blocked")).toHaveTextContent("View +");
    fireEvent.click(screen.getByText(/Passive \/ already applied/));
    expect(screen.getByTestId("priority-passive")).toHaveTextContent("Hide −");
    const passive = screen.getByText("Rivetplate Vest").closest("article");
    expect(passive).not.toBeNull();
    expect(within(passive!).queryByRole("button")).not.toBeInTheDocument();
    expect(within(passive!).getByLabelText(/already applied/i)).toBeVisible();

    fireEvent.click(screen.getByText(/^Blocked/));
    const blocked = screen.getByRole("button", { name: /Use Wound Seal/ }).closest("article");
    expect(within(blocked!).getByRole("status")).toHaveTextContent("Available after failure");
    expect(within(blocked!).getByRole("button")).toBeDisabled();
  });

  it("uses mode-specific End Turn copy only when ending is legal", () => {
    const freePatch = patch({ encounter: null, activeResolution: null, tileArrival: null });
    const freeSources = sources({ threat: [], gear: [], items: [], followers: [], contracts: [], table: [] });
    const single = buildPhoneActionViewModel(freePatch, freeSources);
    expect(single.groups.advance[0]?.summary).toBe("Begin next round");
    expect(single.groups.blocked.some((entry) => entry.id === "end-turn")).toBe(false);

    const multiplayer = buildPhoneActionViewModel({ ...freePatch, sessionMode: "multiplayer" } as PhonePatchPayload, freeSources);
    expect(multiplayer.groups.advance[0]?.summary).toBe("Pass control to next operative");
  });

  it("keeps owner prompts required and demotes unrelated actions", () => {
    const paymentSources = sources({
      resolve: [
        { key: "pay", label: "Pay 1 Salvage", detail: "Current Salvage: 3", onClick: vi.fn() },
        { key: "accept-loss", label: "Accept loss", detail: "Gain 1 Wound", onClick: vi.fn() }
      ],
      threat: []
    });
    const model = buildPhoneActionViewModel(patch({
      encounter: null,
      activeResolution: null,
      pendingEncounterDecisionPrivate: {
        decisionId: "decision-1", decisionVersion: 1, sourceTitle: "Toll", prompt: "Pay or suffer",
        mode: "required", salvageCost: 1, currentSalvage: 3, options: []
      }
    }), paymentSources);
    expect(model.currentContext).toBe("payment");
    expect(model.groups.required.map((entry) => entry.id)).toEqual(["pay", "accept-loss"]);
    expect(model.groups.blocked.map((entry) => entry.id)).toEqual(expect.arrayContaining(["signal-chorus", "complete-contract", "end-turn"]));
  });

  it("does not expose alternate layouts through query parameters", () => {
    window.history.replaceState({}, "", "/phone?phoneActionLayout=context-command-deck");
    const model = buildPhoneActionViewModel(patch({ encounter: null, activeResolution: null }), sources({ threat: [] }));
    render(<PhoneActionPriorityStack model={model} onIntent={vi.fn()} />);
    expect(screen.getByTestId("phone-action-priority-stack")).toBeVisible();
    expect(document.querySelector("[data-testid*='context-command-deck']")).toBeNull();
    expect(document.querySelector("[data-testid*='tactical-action-rail']")).toBeNull();
  });

  it("uses only the six canonical groups", () => {
    const groups = Object.keys(buildPhoneActionViewModel(patch(), sources()).groups) as PriorityActionGroup[];
    expect(groups).toEqual(["required", "useful", "optional", "passive", "blocked", "advance"]);
  });
});
