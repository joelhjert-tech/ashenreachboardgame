// @vitest-environment jsdom
import { useState } from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientIntent, PublicMovementPlannerState } from "../../shared/types.js";
import { PhoneMovementView } from "../PhoneMovementView.js";

const longDestinationName = "The Reliquary Transit Exchange Beyond Glassmere";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

const planner: PublicMovementPlannerState = {
  active: true,
  movementValue: 1,
  rolledValue: 1,
  currentSectorId: "ashwake-crossing",
  currentSectorName: "Ashwalk Bridge",
  destinations: [
    {
      markerLabel: "A",
      sectorId: "votive-engine-room",
      name: longDestinationName,
      ring: "outer",
      distance: 1,
      route: ["ashwake-crossing", "votive-engine-room"],
      routeNames: ["Ashwalk Bridge", longDestinationName],
      tags: ["shop"],
      threatIcons: ["red"],
      ruleText: "Pay the bridge toll before using the foundry service.",
      loreText: "An iron market waits behind the toll arch.",
      shop: { shopId: "shop-a", shopName: "Votive Requisition", status: "open", servicesPreview: ["Repair gear"] },
      faceUpThreats: [],
      occupants: [],
      strategicTags: ["shop", "danger"]
    },
    {
      markerLabel: "B",
      sectorId: "glassmere-spindle",
      name: "Glass Signal Pier",
      ring: "outer",
      distance: 1,
      route: ["ashwake-crossing", "glassmere-spindle"],
      routeNames: ["Ashwalk Bridge", "Glass Signal Pier"],
      tags: [],
      threatIcons: [],
      ruleText: "Tune the pier signal.",
      faceUpThreats: [],
      occupants: [],
      strategicTags: ["safe", "reward"]
    }
  ]
};

function Harness({ onIntent }: { onIntent: (intent: ClientIntent) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <PhoneMovementView
      planner={planner}
      seatId="seat-1"
      activeContract={null}
      currentSectorName="Ashwalk Bridge"
      canRoll={false}
      movementResolving={false}
      travel={null}
      selectedSectorId={selected}
      onSelectedSectorId={setSelected}
      onIntent={onIntent}
      showContextNavigation
      hostView={{
        mode: "signal",
        revision: 1,
        requester: null,
        automaticReturnReason: null,
        canRequestMap: true,
        unavailableReason: null
      }}
    />
  );
}

describe("PhoneMovementView", () => {
  it("requests the server-authoritative TV map without changing movement authority", () => {
    const onIntent = vi.fn();
    render(<Harness onIntent={onIntent} />);

    const mapButton = screen.getByRole("button", { name: /show map on tv/i });
    expect(mapButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mapButton);
    expect(onIntent).toHaveBeenCalledWith({
      type: "HOST_VIEW_REQUESTED",
      seatId: "seat-1",
      mode: "map"
    });
  });

  it("uses the Signal Theatre command seal and environment system", () => {
    render(<Harness onIntent={vi.fn()} />);

    const total = screen.getByLabelText("Movement total 1");
    expect(within(total).getByRole("strong")).toHaveTextContent("1");
    expect(total.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/stat-seals/command.png"
    );
    expect(screen.getAllByTestId("movement-tile-image")[0]).toHaveAttribute(
      "src",
      "/assets/riftfall/environments/signal-theatre/sectors/votive-engine-room.png"
    );
    expect(screen.getAllByTestId("movement-destination")[0]).toHaveClass("phone-move-instrument__stop");
  });

  it("uses the authoritative preview and move intents", () => {
    const onIntent = vi.fn();
    render(<Harness onIntent={onIntent} />);

    expect(screen.getAllByTestId("movement-primary-action")).toHaveLength(1);
    expect(screen.queryByText(/attack|defense|a\s*\/\s*d/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("View details")[0]!.closest("details")).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Select destination A, ${longDestinationName}`) }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_DESTINATION_PREVIEWED",
      seatId: "seat-1",
      toSectorId: "votive-engine-room"
    });
    expect(screen.getByTestId("movement-primary-action")).toHaveTextContent(`Confirm ${longDestinationName}`);

    expect(screen.getAllByText("View details")[0]!.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(`Ashwalk Bridge → ${longDestinationName}`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("movement-primary-action"));
    expect(onIntent).toHaveBeenLastCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "votive-engine-room",
      movementRevision: undefined,
      routeId: undefined,
      voidKeyInstanceId: undefined
    });
  });

  it("shows one disabled action until a destination is selected", () => {
    render(<Harness onIntent={vi.fn()} />);
    const actionRegion = screen.getByTestId("movement-action-region");
    const buttons = within(actionRegion).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[0]).toHaveTextContent("Select a destination");
  });

  it("clears the authoritative preview when Change is pressed", () => {
    const onIntent = vi.fn();
    render(<Harness onIntent={onIntent} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Select destination A, ${longDestinationName}`) }));
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(onIntent).toHaveBeenLastCalledWith({
      type: "MOVEMENT_DESTINATION_PREVIEWED",
      seatId: "seat-1",
      toSectorId: null
    });
  });

  it("offers canonical tier crossing before the compact roll action", () => {
    const onIntent = vi.fn();
    render(
      <PhoneMovementView
        planner={null}
        seatId="seat-1"
        activeContract={null}
        currentSectorName="Ashwalk Bridge"
        canRoll
        movementResolving={false}
        travel={null}
        selectedSectorId={null}
        onSelectedSectorId={vi.fn()}
        onIntent={onIntent}
        showContextNavigation
        tierTransitions={{
          revision: 9,
          options: [
            {
              sectorId: "middle_red_march_outpost",
              name: "Choir Bastion",
              direction: "inward",
              fromRing: "outer",
              toRing: "middle",
              label: "Enter Middle Reach",
              disabledReason: null
            },
            {
              sectorId: "middle_guardian_span",
              name: "Guardian Span",
              direction: "inward",
              fromRing: "outer",
              toRing: "middle",
              label: "Enter Middle Reach",
              disabledReason: "Requires at least 1 Artifact"
            }
          ]
        }}
      />
    );
    expect(screen.getByRole("region", { name: "Tier crossing options" })).toHaveTextContent("Cross before rolling");
    expect(screen.getByRole("button", { name: /Enter Middle Reach.*Choir Bastion/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Enter Middle Reach.*Guardian Span/i })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Roll movement" })).toHaveLength(1);
    expect(document.querySelector(".phone-move-prototype__roll-state")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Enter Middle Reach.*Choir Bastion/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "TIER_TRANSITION_REQUESTED",
      seatId: "seat-1",
      destinationSectorId: "middle_red_march_outpost",
      movementRevision: 9,
      voidKeyInstanceId: undefined
    });
  });

  it("rolls normally when the player declines a tier crossing", () => {
    const onIntent = vi.fn();
    render(
      <PhoneMovementView
        planner={null}
        seatId="seat-1"
        activeContract={null}
        currentSectorName="Ashwalk Bridge"
        canRoll
        movementResolving={false}
        travel={null}
        selectedSectorId={null}
        onSelectedSectorId={vi.fn()}
        onIntent={onIntent}
        showContextNavigation
        tierTransitions={{
          revision: 9,
          options: [{
            sectorId: "middle_red_march_outpost",
            name: "Choir Bastion",
            direction: "inward",
            fromRing: "outer",
            toRing: "middle",
            label: "Enter Middle Reach",
            disabledReason: null
          }]
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Roll movement" }));
    expect(onIntent).toHaveBeenCalledWith({ type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" });
  });

  it("shows one-step inner progression and submits only the authoritative connected step", () => {
    const onIntent = vi.fn();
    render(
      <PhoneMovementView
        planner={null}
        seatId="seat-1"
        activeContract={null}
        currentSectorName="Rifted Approach"
        canRoll={false}
        movementResolving={false}
        travel={null}
        selectedSectorId={null}
        onSelectedSectorId={vi.fn()}
        onIntent={onIntent}
        showContextNavigation={false}
        innerApproach={{
          pathId: "breach-road",
          pathLabel: "Breach Road",
          currentSectorId: "inner_tomb_gate",
          currentSectorName: "Rifted Approach",
          currentIndex: 1,
          challengeCleared: true,
          challengeTitle: "Marshal's Road",
          challengeDetail: "Clear the grave route.",
          revision: 12,
          steps: [
            { sectorId: "inner_veil_rift", name: "Melted Gate", status: "cleared" },
            { sectorId: "inner_tomb_gate", name: "Rifted Approach", status: "cleared" },
            { sectorId: "inner_blackstar_shortcut", name: "Dead Star Reliquary", status: "ahead" },
            { sectorId: "the-bone-meridian", name: "Bone Meridian", status: "ahead" },
            { sectorId: "inner_gate_of_cinders", name: "Gate of Cinders", status: "ahead" },
            { sectorId: "center_cinder_gate", name: "The Ashen Reach Core", status: "boss" }
          ],
          options: [
            {
              sectorId: "inner_blackstar_shortcut",
              name: "Dead Star Reliquary",
              direction: "advance",
              label: "Advance to Dead Star Reliquary",
              disabledReason: null
            },
            {
              sectorId: "inner_veil_rift",
              name: "Melted Gate",
              direction: "retreat",
              label: "Retreat to Melted Gate",
              disabledReason: null
            }
          ]
        }}
      />
    );

    expect(screen.getByRole("region", { name: "Breach Road progression" })).toHaveTextContent("one step per turn");
    expect(screen.queryByRole("button", { name: "Roll movement" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-action-region")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Advance.*Dead Star Reliquary/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "INNER_APPROACH_MOVE_REQUESTED",
      seatId: "seat-1",
      destinationSectorId: "inner_blackstar_shortcut",
      movementRevision: 12
    });
  });

  it("shows a new authoritative movement result before compacting it after 100ms", () => {
    vi.useFakeTimers();
    const common = {
      seatId: "seat-1",
      activeContract: null,
      currentSectorName: "Ashwalk Bridge",
      canRoll: false,
      movementResolving: false,
      travel: null,
      selectedSectorId: null,
      onSelectedSectorId: vi.fn(),
      onIntent: vi.fn(),
      showContextNavigation: false
    } as const;
    const view = render(<PhoneMovementView {...common} planner={null} />);
    view.rerender(<PhoneMovementView {...common} planner={planner} />);
    const disclosure = screen.getByTestId("phone-movement-dice-disclosure");
    expect(disclosure).not.toHaveClass("is-collapsed");
    act(() => vi.advanceTimersByTime(99));
    expect(disclosure).not.toHaveClass("is-collapsed");
    act(() => vi.advanceTimersByTime(1));
    expect(disclosure).toHaveClass("is-collapsed");
    vi.useRealTimers();
  });

  it("restores an existing authoritative movement result in its stable compact state", () => {
    render(<Harness onIntent={vi.fn()} />);
    expect(screen.getByTestId("phone-movement-dice-disclosure")).toHaveClass("is-collapsed");
  });

  it("keeps technical route identifiers out of rendered copy", () => {
    render(<Harness onIntent={vi.fn()} />);
    expect(screen.queryByText(/votive-engine-room|ashwake-crossing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stored movement roll|why legal|raw route/i)).not.toBeInTheDocument();
  });

  it("renders the same public destination marker used by the TV", () => {
    render(<Harness onIntent={vi.fn()} />);
    expect(screen.getByRole("button", { name: new RegExp(`Select destination A, ${longDestinationName}`) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select destination B, Glass Signal Pier/ })).toBeInTheDocument();
  });

  it("does not show the retired post-roll advance-opportunity notice", () => {
    render(
      <PhoneMovementView
        planner={planner}
        seatId="seat-1"
        activeContract={null}
        currentSectorId="outer_ember_sanctum"
        currentSectorName="Pilgrim Lock Gate"
        canRoll={false}
        movementResolving={false}
        travel={null}
        selectedSectorId={null}
        onSelectedSectorId={vi.fn()}
        onIntent={vi.fn()}
        showContextNavigation={false}
      />
    );

    expect(screen.queryByText(/advance opportunity|future exact movement roll/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tier crossing options" })).not.toBeInTheDocument();
  });

  it("expands only the selected destination and lets Back collapse its detail first", () => {
    render(<Harness onIntent={vi.fn()} />);
    const details = screen.getAllByText("View details").map((entry) => entry.closest("details")!);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Select destination A, ${longDestinationName}`) }));
    expect(details[0]).toHaveAttribute("open");
    expect(details[1]).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: /Select destination B, Glass Signal Pier/ }));
    expect(details[0]).not.toHaveAttribute("open");
    expect(details[1]).toHaveAttribute("open");

    act(() => window.dispatchEvent(new Event("ashenreach:phone-back-dismiss", { cancelable: true })));
    expect(details[1]).not.toHaveAttribute("open");
  });

  it("keeps the authoritative Route Compass adjustment as a secondary confirmed control", () => {
    const onIntent = vi.fn();
    render(
      <PhoneMovementView
        planner={{
          ...planner,
          compassPrompt: { instanceId: "compass-1", currentCharges: 2, maxCharges: 2, canDecrease: true, canIncrease: true }
        }}
        seatId="seat-1"
        activeContract={null}
        currentSectorName="Ashwalk Bridge"
        canRoll={false}
        movementResolving={false}
        travel={null}
        selectedSectorId={null}
        onSelectedSectorId={vi.fn()}
        onIntent={onIntent}
        showContextNavigation
      />
    );
    expect(screen.getByTestId("movement-adjustments")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Movement calculation"));
    fireEvent.click(screen.getByRole("button", { name: "Move +1" }));
    expect(onIntent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm \+1/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "ADJUST_MOVEMENT_REQUESTED",
      seatId: "seat-1",
      instanceId: "compass-1",
      adjustment: 1
    });
  });
});
