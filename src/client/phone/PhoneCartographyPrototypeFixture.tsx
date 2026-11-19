import { useState, type ReactElement } from "react";
import type { PublicMovementPlannerState } from "../shared/types.js";
import { PhoneMovementView } from "./PhoneMovementView.js";
import { SignalPhoneIdentityRail } from "./SignalPhoneIdentityRail.js";
import { SignalPhoneNavigation, type SignalPhoneTab } from "./SignalPhoneNavigation.js";

const planner: PublicMovementPlannerState = {
  active: true,
  movementRevision: 8,
  movementValue: 3,
  originalMovementValue: 3,
  rolledValue: 3,
  rollFaces: [3],
  currentSectorId: "ashwake-crossing",
  currentSectorName: "Ashwalk Bridge",
  selectedDestinationId: null,
  destinations: [
    {
      markerLabel: "A",
      sectorId: "outer_waymarket",
      name: "Anchor Market",
      ring: "outer",
      distance: 3,
      route: ["ashwake-crossing", "glassmere-spindle", "outer_ember_sanctum", "outer_waymarket"],
      routeNames: ["Ashwalk Bridge", "Glass Signal Pier", "Pilgrim Lock Gate", "Anchor Market"],
      tags: ["shop"],
      threatIcons: ["yellow"],
      ruleText: "Services become available after every Threat in this arrival is cleared successfully.",
      loreText: "Brass route bells announce each crossing.",
      faceUpThreats: [],
      occupants: [],
      strategicTags: ["shop", "reward"]
    },
    {
      markerLabel: "B",
      sectorId: "rustveil-yard",
      name: "Rustveil Yard",
      ring: "outer",
      distance: 3,
      route: ["ashwake-crossing", "outer_surgery_tent", "outer_salt_flats", "rustveil-yard"],
      routeNames: ["Ashwalk Bridge", "Old Mercy Bay", "Mire Vent Colony", "Rustveil Yard"],
      tags: [],
      threatIcons: ["blue"],
      ruleText: "Resolve the printed Threat on arrival.",
      loreText: "Rust settles in the seams of the abandoned yard.",
      faceUpThreats: [],
      occupants: [],
      strategicTags: ["danger"]
    }
  ]
};

export function PhoneCartographyPrototypeFixture(): ReactElement {
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SignalPhoneTab>("move");

  return (
    <main className="phone-page phone-page-controller">
      <div className="phone-controller-layout">
        <section className="phone-portrait-controller phone-ui-streamlined signal-phone-shell phone-shell--chrome-visible phone-shell--bottomdock-compact phone-shell--movement-active">
          <div className="phone-portrait-panel">
            <SignalPhoneIdentityRail
              characterId="void-marshal"
              characterName="Sable Vey"
              displayName="Joel"
              wounds={1}
              salvage={4}
              sectorId="ashwake-crossing"
            />
            <main className="phone-portrait-scroll signal-phone-shell__content" aria-label="Phone content">
              <div className="phone-portrait-screen phone-portrait-screen-command" data-testid="phone-cartography-fixture">
                <PhoneMovementView
                  planner={planner}
                  seatId="seat-1"
                  activeContract={null}
                  currentSectorId="ashwake-crossing"
                  currentSectorName="Ashwalk Bridge"
                  canRoll={false}
                  movementResolving={false}
                  travel={null}
                  selectedSectorId={selectedSectorId}
                  onSelectedSectorId={setSelectedSectorId}
                  onIntent={() => undefined}
                  showContextNavigation={false}
                  actorName="Joel"
                  diceCount={1}
                  hostView={{
                    mode: "signal",
                    revision: 1,
                    requester: null,
                    automaticReturnReason: null,
                    canRequestMap: true,
                    unavailableReason: null
                  }}
                />
              </div>
            </main>
            <nav className="phone-portrait-bottom-nav phone-bottomnav signal-phone-nav phone-bottomdock--compact" aria-label="More phone controls">
              <SignalPhoneNavigation
                activeTab={activeTab}
                commandTab="move"
                expanded={false}
                onTab={setActiveTab}
                onMore={() => undefined}
              />
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
