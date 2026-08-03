// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getChallengeThemeStyle } from "../../../game/ui/challengeTheme.js";
import { PhoneInventoryPanel } from "../PhoneInventoryPanel.js";
import { PortraitControllerView } from "../PortraitControllerView.js";
import type { CharacterCatalogEntry, PhonePatchPayload } from "../../shared/types.js";

function openInventoryCategory(label: RegExp): HTMLElement {
  const toggle = screen.getByRole("button", { name: label });
  if (toggle.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(toggle);
  }
  return toggle;
}

function openMissionInventoryCategory(): HTMLElement {
  const label = screen.getByText("Contracts", { selector: ".phone-inventory-group-label" });
  const toggle = label.closest("button");
  if (!toggle) throw new Error("Expected Contracts inventory disclosure.");
  if (toggle.getAttribute("aria-expanded") !== "true") fireEvent.click(toggle);
  return toggle;
}

const combatWeapon = {
  id: "black-route-fuse",
  name: "Black Route Fuse",
  slot: "weapon" as const,
  category: "dangerous" as const,
  statBonus: { stat: "grit" as const, amount: 1 },
  activeText: "Break for +3 Grit before the battle roll, then advance escalation by 1.",
  useLimit: "discard" as const,
};

const passiveArmor = {
  id: "coffin-rig",
  name: "Coffin Rig",
  slot: "armor" as const,
  category: "passive" as const,
  statBonus: { stat: "forge" as const, amount: 1 }
};

const relic = {
  id: "choir-static-censer",
  name: "Choir Static Censer",
  slot: "utility" as const,
  category: "chargedRelic" as const,
  statBonus: { stat: "signal" as const, amount: 1 },
  activeText: "Spend 1 charge to reduce anomaly instability by 1 or steady one scar trigger after a Signal check.",
  useLimit: "charge" as const,
  charges: 2
};

const importedRelic = {
  id: "oathchain-lens",
  name: "Oathchain Lens",
  slot: "utility" as const,
  category: "chargedRelic" as const,
  statBonus: { stat: "command" as const, amount: 1 },
  activeText: "Spend 1 charge after a contract, mission, or bargain check to record the cost the lens revealed.",
  useLimit: "charge" as const,
  charges: 2,
  tier: "artifact" as const
};

const traceLens = {
  ...importedRelic,
  activeText: "Trace the Promise — During your action phase, spend 1 charge to identify currently visible Contract targets.",
  currentCharges: 2,
  maxCharges: 2,
  startingCharges: 2,
  chargeCost: 1,
  rechargeRule: "none" as const,
  effectModel: "charged" as const,
  chargedEffect: "traceThePromise" as const,
  activationTiming: ["action" as const],
  requiresEquipped: true,
  instanceId: "lens-a"
};

const activeUtility = {
  id: "ashen-route-compass",
  name: "Ashen Route Compass",
  slot: "utility" as const,
  category: "chargedRelic" as const,
  tier: "artifact" as const,
  statBonus: { stat: "signal" as const, amount: 1 },
  activeText: "After rolling for movement, you may spend 1 charge and choose −1 or +1. The adjusted value becomes your exact required movement distance for this movement. All normal route, adjacency, gate, scenario, threat, blocker, and destination rules still apply.",
  useLimit: "charge" as const,
  currentCharges: 2,
  maxCharges: 2,
  startingCharges: 2,
  chargeCost: 1,
  rechargeRule: "none" as const,
  effectModel: "charged" as const,
  chargedEffect: "movementAdjustment" as const,
  activationTiming: ["movement" as const],
  requiresEquipped: true,
  instanceId: "route-compass-a"
};

const consumable = {
  id: "cinder-suture-kit",
  name: "Cinder Suture Kit",
  slot: "utility" as const,
  category: "consumable" as const,
  statBonus: { stat: "forge" as const, amount: 1 },
  activeText: "Discard to heal 1 wound, then record the treatment as unstable.",
  useLimit: "discard" as const
};

const artifactConsumable = {
  id: "artifact-bell-votive",
  name: "Bell Votive Casket",
  slot: "utility" as const,
  category: "consumable" as const,
  tier: "artifact" as const,
  statBonus: { stat: "guile" as const, amount: 1 },
  activeText: "Open the casket to recover its Veil Hook.",
  useLimit: "discard" as const,
  effectModel: "consumable" as const,
  activationTiming: ["action" as const],
  consumeOnUse: true,
  consumableEffect: "grantVeilHook" as const,
  requiresEquipped: false
};

const questItem = {
  id: "oath-chain-ledger",
  name: "Oath-Chain Ledger",
  slot: "utility" as const,
  category: "contractObject" as const,
  statBonus: { stat: "command" as const, amount: 1 },
  activeText: "Mark a contract bargain and bank one safer completion route.",
  useLimit: "oncePerRound" as const
};

function createPatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: null,
    scenarioTelemetry: [],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false }],
    turnOrder: ["seat-1"],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: [],
        danger: 2,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "ashwake-crossing",
        character: {
          id: "void-marshal",
          name: "Sable Vey",
          archetype: "Void Marshal",
          status: "active",
          activeContract: null,
          stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
          trophies: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 6,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    recentAbilityTriggers: [],
    encounter: {
      id: "cinder-veil-stalker",
      title: "Cinder-Veil Stalker",
      cardType: "enemy",
      enemyName: "Cinder-Veil Stalker",
      flavor: "The ash around it boils before the strike.",
      difficulty: 6,
      stat: "grit"
    },
    pendingEnemyRoll: null,
    outcomeSummary: null,
    self: {
      seatId: "seat-1",
      sectorId: "ashwake-crossing",
      hand: [],
      notes: [],
      character: {
        id: "void-marshal",
        name: "Sable Vey",
        archetype: "Void Marshal",
        currentSpaceId: "ashwake-crossing",
        status: "active",
        stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
        trophies: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [combatWeapon, passiveArmor, activeUtility, relic, consumable, questItem],
        equippedGear: { weapon: null, armor: "coffin-rig", utility: null },
        followers: [
          {
            id: "choir-defector",
            name: "Choir Defector",
            role: "ritualist",
            text: "Once per round, reduce an anomaly instability or signal difficulty by 1 before rolling.",
            useLimit: "oncePerRound"
          }
        ],
        abilities: []
      }
    },
    nemesis: null
  };

  return {
    ...patch,
    ...overrides
  };
}

const characters: CharacterCatalogEntry[] = [
  {
    id: "void-marshal",
    name: "Sable Vey",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
    trophies: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
];

afterEach(() => {
  cleanup();
  window.localStorage.removeItem("ashenreach.phoneChromeVisible");
  window.history.replaceState({}, "", "/");
  vi.useRealTimers();
});

function openPhoneTabs(): void {
  const showSectionsButton = screen.queryByRole("button", { name: /current section; show all phone sections/i });
  if (showSectionsButton) fireEvent.click(showSectionsButton);
}

describe("PhoneInventoryPanel", () => {
  it("renders canonical fallback artwork when an item or follower has no dedicated art id", () => {
    render(<PhoneInventoryPanel patch={createPatch({ encounter: null, activeResolution: null, phase: "action" })} onIntent={vi.fn()} />);
    openInventoryCategory(/followers.*records/i);

    const followerArt = screen.getByRole("img", { name: "Choir Defector" });
    expect(followerArt).toHaveAttribute("src", "/assets/cards/fallbacks/follower.svg");
    expect(screen.getByRole("button", { name: /inspect choir defector/i })).toBeInTheDocument();
  });

  it("shows round-exhaust companions as Ready or Exhausted without charge counters", () => {
    const basePatch = createPatch({ encounter: null, activeResolution: null, phase: "broadcast" });
    const lucy = {
      id: "lucy-hell-puppy", instanceId: "lucy:test", name: "Lucy, Hell Puppy", role: "companion" as const,
      text: "Record an ember-pup note.", tier: "legendary" as const, artCardId: "artifact-lucy-hell-puppy",
      timingWindows: ["movement" as const], activationTiming: ["movement" as const], useLimit: "oncePerRound" as const,
      effectModel: "exhaust" as const, resetWindow: "round" as const, exhaustEffect: "recordEmberPupNote" as const,
      requiresEquipped: false, exhausted: true
    };
    const patch = {
      ...basePatch,
      phase: "navigation" as const,
      objectUseStates: [{ source: "follower" as const, id: lucy.id, usedThisTurn: false, usedThisRound: true, remainingUses: 0, maxUses: 1, disabledReason: "Lucy, Hell Puppy is Exhausted. Refreshes next round.", activeModifier: null }],
      self: basePatch.self ? { ...basePatch.self, character: { ...basePatch.self.character, followers: [lucy] } } : null
    } satisfies PhonePatchPayload;
    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);
    openInventoryCategory(/followers.*records/i);
    const card = screen.getByLabelText(/lucy, hell puppy: locked/i);
    expect(card).toHaveTextContent(/exhausted/i);
    expect(card).toHaveTextContent(/refreshes next round/i);
    expect(card).not.toHaveTextContent(/charge/i);
    expect(within(card).queryByRole("button", { name: /use lucy/i })).not.toBeInTheDocument();
  });

  it("presents owned Artifact consumables as one-use action-window items without passive stat UI", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      objectUseStates: [{ source: "gear" as const, id: artifactConsumable.id, usedThisTurn: false, usedThisRound: false, remainingUses: 1, maxUses: 1, disabledReason: null, activeModifier: null }],
      self: basePatch.self ? { ...basePatch.self, character: { ...basePatch.self.character, heldGear: [artifactConsumable] } } : null
    } satisfies PhonePatchPayload;
    const onIntent = vi.fn();
    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    const card = screen.getByLabelText(/bell votive casket: usable now/i);
    expect(card).toHaveTextContent(/active ability/i);
    expect(card).toHaveTextContent(/action window/i);
    expect(within(card).queryByText(/\+1 guile/i)).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: /use bell votive casket/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "USE_GEAR", seatId: "seat-1", gearId: artifactConsumable.id });

    cleanup();
    render(<PhoneInventoryPanel patch={{ ...patch, phase: "navigation" }} onIntent={vi.fn()} />);
    expect(screen.getByLabelText(/bell votive casket: ready but not usable now/i)).toHaveTextContent(/wait for an action window/i);
    expect(screen.queryByRole("button", { name: /use bell votive casket/i })).not.toBeInTheDocument();
  });

  it("groups private inventory cards by type and shows usability status", () => {
    render(<PhoneInventoryPanel patch={createPatch({ encounter: null, activeResolution: null, phase: "action" })} onIntent={vi.fn()} />);

    expect(screen.getByRole("button", { name: /artifacts.*records/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /equipment.*records/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /followers.*records/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scars & afflictions.*records/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /progression.*records/i })).toBeInTheDocument();
    openInventoryCategory(/equipment.*records/i);
    openInventoryCategory(/followers.*records/i);
    openInventoryCategory(/progression.*records/i);
    expect(screen.getByTestId("phone-inventory-progression")).toHaveTextContent(/progression/i);
    expect(screen.getByTestId("phone-inventory-progression")).toHaveTextContent(/trophies: 0/i);
    expect(screen.getByRole("button", { name: /command 3 -> 4\s*need 4 more trophies/i })).toBeDisabled();
    expect(screen.getAllByText("Black Route Fuse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coffin Rig").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ashen Route Compass").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Passive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usable now").length).toBeGreaterThan(0);
    expect(screen.getByTestId("phone-inventory-relevant-now")).toHaveTextContent(/relevant now/i);
    expect(screen.getByText(/no wounds to heal/i)).toBeInTheDocument();
  });

  it("renders imported relics under Artifacts / Relics instead of Equipment", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              heldGear: [...basePatch.self.character.heldGear, importedRelic]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    const relicCard = screen.getByLabelText(/oathchain lens: usable now/i);
    const relicGroup = relicCard.closest(".phone-inventory-group");

    expect(relicGroup).toHaveTextContent(/artifacts \/ relics/i);
    expect(relicGroup).not.toHaveTextContent(/^equipment$/i);
    expect(relicCard.querySelector(".phone-wrap-card__image")).toHaveAttribute(
      "src",
      "/assets/cards/artifacts/artifact-oathchain-lens.phone.webp"
    );
    expect(relicCard).toHaveTextContent(/2 \/ 2 charges/i);
  });

  it("presents Ashen Route Compass as a charged exact-distance adjustment without obsolete anomaly wording", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const compassCard = screen.getByLabelText(/ashen route compass:/i);
    expect(compassCard).toHaveTextContent(/spend 1 charge and choose −1 or \+1/i);
    expect(compassCard).toHaveTextContent(/exact required movement distance/i);
    expect(compassCard).toHaveTextContent(/2 \/ 2 charges/i);
    expect(compassCard).not.toHaveTextContent(/anomaly|reroll|soften/i);
  });

  it("shows persistent scar cards and their effects in Inventory status", () => {
    const basePatch = createPatch();
    render(
      <PhoneInventoryPanel
        patch={{
          ...basePatch,
          self: basePatch.self
            ? {
                ...basePatch.self,
                character: {
                  ...basePatch.self.character,
                  scars: ["scar-wound-1"],
                  scarCards: [
                    {
                      id: "scar-wound-1",
                      title: "Ash-Lanced",
                      text: "A furnace-raked wound that never fully seals.",
                      trigger: "Your first failed grit test each session.",
                      penalty: "Gain 1 scar after the failure resolves.",
                      relief: "At a surgery or shrine space, spend 1 trophy after a passed forge check to suppress this scar.",
                      upside: "After this scar leaves a mark, gain a route note about what hurt you."
                    }
                  ]
                }
              }
            : null
        }}
        onIntent={vi.fn()}
      />
    );

    openInventoryCategory(/scars & afflictions.*records/i);
    const scars = screen.getByTestId("phone-inventory-scars");

    expect(scars).toHaveTextContent(/scars: 1/i);
    expect(scars).toHaveTextContent(/ash-lanced/i);
    expect(scars).toHaveTextContent(/first failed grit test/i);
    expect(scars).toHaveTextContent(/gain 1 scar/i);
  });

  it("groups faceup and facedown Afflictions as persistent status cards", () => {
    const basePatch = createPatch();

    render(
      <PhoneInventoryPanel
        patch={{
          ...basePatch,
          self: basePatch.self
            ? {
                ...basePatch.self,
                character: {
                  ...basePatch.self.character,
                  afflictions: {
                    faceup: [
                      {
                        id: "brittle-frame",
                        name: "Brittle Frame",
                        severity: 3,
                        category: "restriction",
                        duration: "ongoing",
                        trigger: "While faceup.",
                        rulesText: "You cannot use armor.",
                        effectKind: "restriction",
                        effectPayload: { cannotUseArmor: true },
                        isFaceupOngoing: true
                      }
                    ],
                    facedownCount: 1
                  }
                }
              }
            : null
        }}
        onIntent={vi.fn()}
      />
    );

    openInventoryCategory(/scars & afflictions.*records/i);
    const afflictions = screen.getByTestId("phone-inventory-afflictions");

    expect(afflictions).toHaveTextContent(/afflictions: 2/i);
    expect(afflictions).toHaveTextContent(/brittle frame/i);
    expect(afflictions).toHaveTextContent(/blocks armor/i);
    expect(afflictions).toHaveTextContent(/facedown afflictions/i);
  });

  it("shows trophies and stat upgrades in Inventory progression", () => {
    const onIntent = vi.fn();
    const basePatch = createPatch({ encounter: null, activeResolution: null, phase: "broadcast" });
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              trophies: 6,
              trophyPile: [
                {
                  cardId: "cinder-veil-stalker",
                  name: "Cinder-Veil Stalker",
                  trophyValue: 6,
                  spentValue: 0,
                  stat: "grit" as const,
                  cardType: "enemy" as const
                }
              ]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    openInventoryCategory(/progression.*records/i);
    const progression = screen.getByTestId("phone-inventory-progression");
    expect(screen.getByTestId("phone-inventory-upgrade-window")).toHaveTextContent(/experience window open/i);
    expect(progression).toHaveTextContent(/trophies: 6/i);
    expect(progression).toHaveTextContent(/cinder-veil stalker/i);
    expect(progression).toHaveTextContent(/6\/6/i);

    const gritUpgrade = within(progression).getByRole("button", { name: /grit 2 -> 3\s*cost 3 trophies/i });
    expect(gritUpgrade).toBeEnabled();
    expect(gritUpgrade.style.getPropertyValue("--challenge-color")).toBe(getChallengeThemeStyle("grit")["--challenge-color"]);

    fireEvent.click(gritUpgrade);

    expect(onIntent).not.toHaveBeenCalled();
    fireEvent.click(within(progression).getByRole("button", { name: /confirm grit/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });
  });

  it("offers rank 9 to 10 and blocks permanent upgrades at rank 10", () => {
    const basePatch = createPatch({ encounter: null, activeResolution: null, phase: "broadcast" });
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              trophies: 10,
              stats: {
                ...basePatch.self.character.stats,
                command: 10,
                grit: 9
              }
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);
    openInventoryCategory(/progression.*records/i);

    expect(screen.getByRole("button", { name: /grit 9 -> 10\s*cost 10 trophies/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /command 10\s*command is already at the maximum rank/i })).toBeDisabled();
  });

  it("locks upgrades outside Setup or Experience and shows the authoritative receipt", () => {
    const lockedPatch = createPatch({ encounter: null, activeResolution: null, phase: "navigation" });
    render(<PhoneInventoryPanel patch={lockedPatch} onIntent={vi.fn()} />);
    openInventoryCategory(/progression.*records/i);

    expect(screen.getByTestId("phone-inventory-upgrade-window")).toHaveTextContent(/upgrades locked/i);
    expect(screen.getByRole("button", { name: /grit 2 -> 3.*setup or experience/i })).toBeDisabled();

    cleanup();
    const confirmedPatch = createPatch({
      encounter: null,
      activeResolution: null,
      phase: "broadcast",
      playerResultDeltas: [{
        id: "stat-upgrade-grit",
        type: "statUpgrade",
        label: "Grit raised",
        value: 3,
        sign: "gain",
        targetScope: "personal",
        targetSeatId: "seat-1",
        visibility: "ownerPrivate",
        source: "progression",
        publicText: "Lane raised Grit to 3.",
        privateText: "Grit increased from 2 to 3. Three Trophies were spent.",
        severity: "reward"
      }]
    });
    render(<PhoneInventoryPanel patch={confirmedPatch} onIntent={vi.fn()} />);
    openInventoryCategory(/progression.*records/i);

    expect(screen.getByTestId("phone-inventory-upgrade-receipt")).toHaveTextContent(/upgrade confirmed/i);
    expect(screen.getByTestId("phone-inventory-upgrade-receipt")).toHaveTextContent(/grit increased from 2 to 3/i);
  });

  it("shows scar and affliction effects on the Player Card tab with stat breakdown sources", () => {
    const patch = createPatch({ encounter: null, phase: "broadcast" });
    const self = {
      ...patch.self!,
      character: {
        ...patch.self!.character,
        scars: ["scar-wound-1"],
        scarCards: [
          {
            id: "scar-wound-1",
            title: "Ash-Lanced",
            text: "A furnace-raked wound that never fully seals.",
            trigger: "Your first failed Grit test each session.",
            penalty: "Gain 1 scar after the failure resolves.",
            relief: "At a surgery or shrine space, spend 1 trophy after a passed Forge check to suppress this scar."
          }
        ],
        afflictions: {
          faceup: [
            {
              id: "hollow-belly",
              name: "Hollow Belly",
              severity: 1,
              category: "testPenalty",
              duration: "ongoing" as const,
              trigger: "When testing Grit.",
              rulesText: "Subtract 2 from Grit tests, minimum 1.",
              effectKind: "testModifier",
              effectPayload: { stat: "grit" as const, amount: -2, floor: 1 },
              isFaceupOngoing: true
            }
          ],
          facedownCount: 0
        }
      }
    };

    render(
      <PortraitControllerView
        self={self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={{ ...patch, self }}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    const statusEffects = screen.getByTestId("phone-portrait-status-effects");

    expect(statusEffects).toHaveTextContent(/ash-lanced/i);
    expect(statusEffects).toHaveTextContent(/hollow belly/i);
    expect(statusEffects).toHaveTextContent(/grit -2 tests, minimum 1/i);

    const statsRegion = screen.getByLabelText(/character stats/i);
    const gritStat = within(statsRegion).getByRole("button", { name: /grit current stat 2/i });

    expect(gritStat).toHaveTextContent(/status -2/i);

    fireEvent.click(gritStat);

    expect(gritStat).toHaveTextContent(/conditional \/ status/i);
    expect(gritStat).toHaveTextContent(/hollow belly test -2/i);
  });

  it("renders inventory and follower cards with wrapped media and cleared actions", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    openInventoryCategory(/equipment.*records/i);
    openInventoryCategory(/followers.*records/i);
    const itemCard = screen.getByLabelText(/black route fuse: usable now/i);
    expect(itemCard).toHaveClass("phone-wrap-card", "phone-wrap-card--inventory");
    expect(itemCard.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(itemCard.querySelector(".phone-wrap-card__body")).toHaveTextContent(/black route fuse/i);
    expect(itemCard.querySelector(".phone-wrap-card__description")).toHaveClass("phone-wrap-card__description");
    expect(itemCard.querySelector(".phone-wrap-card__description")).toHaveTextContent(/break for \+3 grit/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).toHaveTextContent(/before battle roll/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).not.toHaveTextContent(/\b(?:Heat|Risk)\b/i);
    expect(itemCard.querySelector(".phone-wrap-card__details")).toHaveTextContent(/\+1 grit/i);
    expect((itemCard.querySelector(".phone-inventory-stat-bonus") as HTMLElement).style.getPropertyValue("--challenge-color")).toBe(
      getChallengeThemeStyle("grit")["--challenge-color"]
    );
    expect(itemCard.querySelector(".phone-wrap-card__actions")).toContainElement(screen.getByRole("button", { name: /use black route fuse/i }));
    expect(itemCard.querySelector(".phone-wrap-card__actions")?.compareDocumentPosition(itemCard.querySelector(".phone-wrap-card__description") as Node)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );

    const followerCard = screen.getByLabelText(/^choir defector:/i);
    expect(followerCard).toHaveClass("phone-wrap-card", "phone-wrap-card--inventory");
    expect(followerCard.querySelector(".phone-wrap-card__image")).toHaveAttribute("src", "/assets/cards/fallbacks/follower.svg");
    expect(within(followerCard).getByRole("button", { name: /inspect choir defector/i })).toBeInTheDocument();
    expect(followerCard.querySelector(".phone-wrap-card__actions")).toContainElement(screen.getByRole("button", { name: /use choir defector/i }));
  });

  it("marks oversized inventories without creating nested category scrollers", () => {
    const manyWeapons = Array.from({ length: 7 }, (_, index) => ({
      ...combatWeapon,
      id: `black-route-fuse-${index}`,
      name: `Black Route Fuse ${index + 1}`
    }));
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              heldGear: [...manyWeapons, passiveArmor, relic, consumable, questItem]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    const inventory = screen.getByLabelText("Inventory");
    const equipmentCount = screen.getByLabelText("10 Equipment records");
    const equipmentGroup = equipmentCount.closest(".phone-inventory-group");

    expect(inventory).toHaveClass("phone-inventory-panel-overflow");
    expect(inventory).toHaveAttribute("data-item-count", "12");
    openInventoryCategory(/equipment.*records/i);
    expect(equipmentGroup?.querySelector(".phone-inventory-card-list")).not.toHaveClass("phone-inventory-card-list-scroll");
    expect(equipmentCount).toBeInTheDocument();
  });

  it("uses accessible disclosure controls with stable unique relationships", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const toggles = screen.getAllByRole("button", { name: /records/i });
    expect(toggles.length).toBeGreaterThan(1);
    const controlledIds = toggles.map((toggle) => toggle.getAttribute("aria-controls"));
    expect(new Set(controlledIds).size).toBe(controlledIds.length);

    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute("aria-expanded", expect.stringMatching(/true|false/));
      const controlledId = toggle.getAttribute("aria-controls");
      expect(controlledId).toBeTruthy();
      if (toggle.getAttribute("aria-expanded") === "true") {
        expect(document.getElementById(controlledId as string)).toHaveAttribute("aria-labelledby", toggle.id);
      }
    }
  });

  it("uses the seven custom category emblems and opens one useful drawer by default", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const iconPaths = [
      "/assets/riftfall/ui/inventory-categories/edge-cards.phone.webp",
      "/assets/riftfall/ui/inventory-categories/artifacts.phone.webp",
      "/assets/riftfall/ui/inventory-categories/equipment.phone.webp",
      "/assets/riftfall/ui/inventory-categories/followers.phone.webp",
      "/assets/riftfall/ui/objective-categories/completed.phone.webp",
      "/assets/riftfall/ui/inventory-categories/status.phone.webp",
      "/assets/riftfall/ui/inventory-categories/progression.phone.webp"
    ];
    const icons = Array.from(document.querySelectorAll<HTMLImageElement>(".phone-inventory-group-icon"));

    expect(icons.map((icon) => icon.getAttribute("src"))).toEqual(iconPaths);
    expect(icons.every((icon) => icon.alt === "" && icon.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(screen.getAllByRole("button", { name: /records/i }).filter((toggle) => toggle.getAttribute("aria-expanded") === "true")).toHaveLength(1);
  });

  it("renders private Edge Cards as a standard collapsible inventory category", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      edgeHand: {
        cards: [
          {
            id: "edge-echo-recast",
            name: "Echo Recast",
            edgeValue: 4,
            commitText: "Lock 4 as one die; the server rolls the other die.",
            abilityText: "Reroll one battle or Challenge die.",
            tradeoffText: "Accept the second result.",
            ability: {
              label: "Reroll one die",
              enabled: false,
              disabledReason: "Available after the roll.",
              resolutionId: null,
              targets: []
            }
          }
        ],
        limit: 2,
        awardRule: "Random awards only.",
        canCommit: true,
        disabledReason: null,
        resolutionId: "resolution-1",
        reaction: null
      }
    });

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    const label = screen.getByText("Edge Cards", { selector: ".phone-inventory-group-label" });
    const toggle = label.closest("button");
    expect(toggle).not.toBeNull();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent(/echo recast/i);
    expect(toggle).toHaveTextContent(/action available/i);
    expect(toggle?.querySelector(".phone-inventory-group-icon")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/inventory-categories/edge-cards.phone.webp"
    );

    const edgeHand = screen.getByLabelText("Private Edge Card hand");
    fireEvent.click(within(edgeHand).getByRole("button", { name: /use number 4 as die/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "PLAY_EDGE_CARD",
      seatId: "seat-1",
      cardId: "edge-echo-recast",
      resolutionId: "resolution-1",
      mode: "commit-value"
    });

    fireEvent.click(toggle!);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Private Edge Card hand")).not.toBeInTheDocument();
  });

  it("collapses content so its item actions are no longer keyboard reachable, then restores them", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const weaponsToggle = openInventoryCategory(/equipment.*records/i);
    const useButton = screen.getByRole("button", { name: /use black route fuse/i });
    expect(weaponsToggle).toHaveAttribute("aria-expanded", "true");
    expect(useButton).toBeInTheDocument();

    fireEvent.click(weaponsToggle);
    expect(weaponsToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /use black route fuse/i })).not.toBeInTheDocument();
    expect(document.getElementById(weaponsToggle.getAttribute("aria-controls") as string)).toBeNull();

    fireEvent.keyDown(weaponsToggle, { key: "Enter" });
    fireEvent.click(weaponsToggle);
    expect(weaponsToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /use black route fuse/i })).toBeInTheDocument();
  });

  it("opens and marks groups that contain an immediately eligible action", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    const weaponsToggle = openInventoryCategory(/equipment.*records/i);
    expect(weaponsToggle).toHaveAttribute("aria-expanded", "true");
    expect(weaponsToggle).toHaveTextContent(/action available/i);
    expect(weaponsToggle.closest(".phone-inventory-group")).toHaveClass("has-action");
  });

  it("makes usable, passive, and inactive item state explicit", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    openInventoryCategory(/equipment.*records/i);
    expect(screen.getByLabelText(/black route fuse: usable now/i)).toHaveAttribute("data-inventory-state", "active");
    expect(screen.getByLabelText(/black route fuse: usable now/i)).toHaveTextContent(/active in this timing window/i);
    expect(screen.getByRole("button", { name: /use black route fuse/i })).toHaveTextContent(/use now/i);
    expect(screen.getByLabelText(/coffin rig: passive/i)).toHaveAttribute("data-inventory-state", "applied");
    expect(screen.queryByRole("button", { name: /use coffin rig/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/cinder suture kit: locked/i)).toHaveAttribute("data-inventory-state", "inactive");

    cleanup();
    render(<PhoneInventoryPanel patch={createPatch({ phase: "navigation", encounter: null })} onIntent={vi.fn()} />);
    openInventoryCategory(/equipment.*records/i);
    expect(screen.getByLabelText(/black route fuse: ready but not usable now/i)).toHaveTextContent(/timing locked/i);
    expect(screen.getByLabelText(/black route fuse: ready but not usable now/i)).not.toHaveTextContent(/\bready\b/i);
  });

  it("locks stat-specific battle items when the encounter uses another stat", () => {
    render(
      <PhoneInventoryPanel
        patch={createPatch({
          encounter: {
            id: "gate-tax-collectors",
            title: "Gate-Tax Collectors",
            cardType: "enemy",
            enemyName: "Gate-Tax Collectors",
            flavor: "The toll stamp is already wet.",
            difficulty: 6,
            stat: "command"
          }
        })}
        onIntent={vi.fn()}
      />
    );

    openInventoryCategory(/equipment.*records/i);
    const itemCard = screen.getByLabelText(/black route fuse: locked/i);
    expect(itemCard).toHaveTextContent(/usable only in grit battles/i);
    expect(itemCard).toHaveTextContent(/this encounter uses command/i);
    expect(screen.queryByRole("button", { name: /use black route fuse/i })).not.toBeInTheDocument();
  });

  it("does not present unequipped passive gear as an applied server modifier", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              equippedGear: { weapon: null, armor: null, utility: null }
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    openInventoryCategory(/equipment.*records/i);
    const armorCard = screen.getByLabelText(/coffin rig: ready but not usable now/i);
    expect(armorCard).toHaveAttribute("data-inventory-state", "inactive");
    expect(armorCard).toHaveTextContent(/equip to apply \+1 forge/i);
    expect(screen.queryByRole("button", { name: /use coffin rig/i })).not.toBeInTheDocument();
  });

  it("uses server-confirmed use state for charges and once-per-round locks", () => {
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      objectUseStates: [
        {
          source: "gear" as const,
          id: "choir-static-censer",
          usedThisTurn: true,
          usedThisRound: true,
          remainingUses: 1,
          maxUses: 2,
          disabledReason: null
        },
        {
          source: "follower" as const,
          id: "choir-defector",
          usedThisTurn: true,
          usedThisRound: true,
          remainingUses: 0,
          maxUses: 1,
          disabledReason: "Choir Defector has already been used this round."
        }
      ]
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    openInventoryCategory(/artifacts.*records/i);
    openInventoryCategory(/followers.*records/i);
    const relicCard = screen.getByLabelText(/choir static censer: usable now/i);
    expect(relicCard).toHaveTextContent(/1 \/ 2 charges/i);
    const followerCard = screen.getByLabelText(/choir defector: locked/i);
    expect(followerCard).toHaveAttribute("data-inventory-state", "inactive");
    expect(followerCard).toHaveTextContent(/already been used this round/i);
    expect(screen.queryByRole("button", { name: /use choir defector/i })).not.toBeInTheDocument();
  });

  it("keeps an equipped passive bonus active when the charged ability is depleted", () => {
    const basePatch = createPatch();
    const depletedLantern = {
      ...traceLens,
      id: "choir-lantern",
      name: "Choir Lantern",
      instanceId: "choir-lantern-a",
      statBonus: { stat: "signal" as const, amount: 1 },
      activeText: "Before an anomaly Signal test, spend 1 charge for +2 Signal.",
      chargedEffect: "choirLightSignalBonus" as const,
      activationTiming: ["beforeAnomalySignalTest" as const],
      currentCharges: 0
    };
    const patch = {
      ...basePatch,
      objectUseStates: [{
        source: "gear" as const,
        id: depletedLantern.id,
        instanceId: depletedLantern.instanceId,
        usedThisTurn: false,
        usedThisRound: false,
        remainingUses: 0,
        maxUses: 2,
        disabledReason: "Choir Lantern has no charges remaining.",
        activeModifier: null
      }],
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              heldGear: [depletedLantern],
              equippedGear: { weapon: null, armor: null, utility: depletedLantern.id },
              equippedGearInstances: { weapon: null, armor: null, utility: depletedLantern.instanceId }
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    openInventoryCategory(/artifacts.*records/i);
    const card = screen.getByLabelText(/choir lantern: locked/i);
    expect(card).toHaveTextContent(/\+1 signal · always active/i);
    expect(card).toHaveTextContent(/0 \/ 2 charges/i);
    expect(card).toHaveTextContent(/depleted/i);
    expect(within(card).getByRole("meter", { name: /0 of 2 charges remaining/i })).toHaveAttribute("aria-valuenow", "0");
    expect(within(card).queryByRole("button", { name: /use choir lantern/i })).not.toBeInTheDocument();
  });

  it("uses the exact item charge count when a generic use-state is stale", () => {
    const basePatch = createPatch();
    const lantern = {
      ...traceLens,
      id: "choir-lantern",
      name: "Choir Lantern",
      instanceId: "choir-lantern-exact",
      statBonus: { stat: "signal" as const, amount: 1 },
      currentCharges: 1,
      maxCharges: 2
    };
    const patch = {
      ...basePatch,
      objectUseStates: [{
        source: "gear" as const,
        id: lantern.id,
        instanceId: lantern.instanceId,
        usedThisTurn: false,
        usedThisRound: false,
        remainingUses: 2,
        maxUses: 2,
        disabledReason: null,
        activeModifier: null
      }],
      self: basePatch.self ? {
        ...basePatch.self,
        character: {
          ...basePatch.self.character,
          heldGear: [lantern],
          equippedGear: { weapon: null, armor: null, utility: lantern.id },
          equippedGearInstances: { weapon: null, armor: null, utility: lantern.instanceId }
        }
      } : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    openInventoryCategory(/artifacts.*records/i);
    const card = screen.getAllByLabelText(/choir lantern/i).find((element) => element.classList.contains("phone-inventory-card"));
    expect(card).toBeDefined();
    expect(card!).toHaveTextContent(/1 \/ 2 charges/i);
    expect(within(card!).getByRole("meter", { name: /1 of 2 charges remaining/i })).toHaveAttribute("aria-valuenow", "1");
  });

  it("shows suppression independently from an equipped item's passive and active definitions", () => {
    const basePatch = createPatch();
    const item = {
      ...traceLens,
      instanceId: "lens-suppressed",
      currentCharges: 2
    };
    const patch = {
      ...basePatch,
      equipmentSuppressions: [{
        sourceThreatId: "relay-husk" as const,
        itemInstanceId: item.instanceId,
        itemCatalogId: item.id,
        mode: "throughNextThreat" as const,
        active: true as const
      }],
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              heldGear: [item],
              equippedGear: { weapon: null, armor: null, utility: item.id },
              equippedGearInstances: { weapon: null, armor: null, utility: item.instanceId }
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);

    openInventoryCategory(/artifacts.*records/i);
    const card = screen.getByLabelText(/oathchain lens: suppressed/i);
    expect(card).toHaveTextContent(/\+1 command · suppressed/i);
    expect(card).toHaveTextContent(/active ability/i);
    expect(card).toHaveTextContent(/2 \/ 2 charges/i);
    expect(within(card).queryByRole("button", { name: /trace the promise/i })).not.toBeInTheDocument();
  });

  it("sends a gear-use intent from a usable combat card", () => {
    const onIntent = vi.fn();

    render(<PhoneInventoryPanel patch={createPatch()} onIntent={onIntent} onlyUsable />);

    fireEvent.click(screen.getByRole("button", { name: /use black route fuse/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });
  });

  it("shows Fandiablos as an ultimate companion with art and before-threat timing", () => {
    const onIntent = vi.fn();
    const basePatch = createPatch();
    const patch = {
      ...basePatch,
      phase: "sector" as const,
      encounter: null,
      self: basePatch.self
        ? {
            ...basePatch.self,
            character: {
              ...basePatch.self.character,
              followers: [
                ...(basePatch.self.character.followers ?? []),
                {
                  id: "fandiablos",
                  name: "Fandiablos",
                  role: "companion" as const,
                  text: "Warning Barks before drawing threats. Swarm of Tiny Teeth. Cable Biters. Too Many Dogs.",
                  tier: "ultimate" as const,
                  unique: true,
                  ultimateCompanion: true,
                  artCardId: "artifact-fandiablos",
                  timingWindows: ["beforeThreatDraw", "beforeBattleRoll", "beforeTakingDamage", "anyTime"] as const,
                  useLimit: "oncePerTurn" as const
                }
              ]
            }
          }
        : null
    } satisfies PhonePatchPayload;

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    openInventoryCategory(/followers.*records/i);
    expect(screen.getByText("Fandiablos")).toBeInTheDocument();
    expect(screen.getByText(/before threat draw/i)).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/cards/artifacts/artifact-fandiablos.phone.webp"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use.*1 wound/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos",
      escalate: false
    });
  });

  it("keeps persistent navigation focused on operative information and auto-routes turn actions", async () => {
    const patch = createPatch({ encounter: null });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByRole("tablist", { name: /^phone navigation$/i })).toHaveTextContent(/act.*action/i);
    openPhoneTabs();
    expect(screen.getByRole("tab", { name: /player card/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /objectives/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /move/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /battle/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /action/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /all phone sections/i })).toHaveClass("phone-expanded-tab-grid");
    expect(screen.getByTestId("phone-action-screen")).toHaveClass("phone-portrait-screen-command");

    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));

    expect(document.querySelector(".phone-inventory-panel")).toHaveTextContent(/black route fuse/i);

    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    await waitFor(() => expect(screen.getByLabelText(/character stats/i)).toBeInTheDocument());
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByText(/turn console/i)).not.toBeInTheDocument();
  });

  it("closes the expanded sheet immediately and restores focus after section selection", () => {
    vi.useFakeTimers();
    const patch = createPatch({ encounter: null });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));
    expect(screen.queryByRole("tablist", { name: /all phone sections/i })).not.toBeInTheDocument();
    act(() => vi.runAllTimers());
    expect(screen.getByRole("button", { name: /inventory, current section; show all phone sections/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /inventory/i })).toHaveFocus();
  });

  it("shows the owner-only Glass-Chime Swarm penalty as passive status with no controls", () => {
    const patch = createPatch({
      encounter: null,
      phase: "broadcast",
      pendingTestModifiers: [{
        type: "nextNonBattleTest",
        sourceCardId: "glass-chime-swarm",
        label: "Glass-Chime Swarm",
        summary: "Next non-battle test: -1",
        amount: -1
      }]
    });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    const status = screen.getByText("Glass-Chime Swarm").closest("article");
    expect(status).toHaveTextContent(/next non-battle test: -1/i);
    expect(status).toHaveTextContent(/no battle or movement effect/i);
    expect(within(status as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /use glass-chime/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel glass-chime/i })).not.toBeInTheDocument();
  });

  it("shows the owner-only Spindle penalty and minimum as passive status with no controls", () => {
    const patch = createPatch({
      encounter: null,
      phase: "broadcast",
      pendingTestModifiers: [{
        type: "nextNormalMovementRoll",
        sourceCardId: "spindle-static-squall",
        label: "Spindle Static Squall",
        summary: "Next normal movement roll: -1",
        detail: "Minimum result: 1",
        amount: -1
      }]
    });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    const status = screen.getByText("Spindle Static Squall").closest("article");
    expect(status).toHaveTextContent(/next normal movement roll: -1/i);
    expect(status).toHaveTextContent(/minimum result: 1/i);
    expect(within(status as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the compact top header visible while the standard menu opens", async () => {
    const onIntent = vi.fn();
    const onLeave = vi.fn();

    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch({ encounter: null, phase: "broadcast" })}
        characters={characters}
        onIntent={onIntent}
        onLeave={onLeave}
      />
    );

    const shell = document.querySelector(".phone-portrait-controller");
    const tablist = screen.getByRole("tablist", { name: /phone navigation/i });

    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(shell).toHaveClass("phone-shell--bottomdock-compact");
    const phoneTopbar = document.querySelector(".phone-topbar");
    expect(within(phoneTopbar as HTMLElement).getByRole("heading", { name: /lane/i })).toBeInTheDocument();
    expect(phoneTopbar).toHaveTextContent(/sable vey/i);
    const bottomNavigation = screen.getByRole("navigation", { name: /more phone controls/i });
    expect(bottomNavigation).toHaveClass("phone-portrait-bottom-nav");
    expect(bottomNavigation).toHaveClass("phone-bottomdock--compact");
    expect(tablist).toHaveClass("signal-phone-nav__primary");
    expect(tablist).not.toHaveClass("phone-bottomdock--compact");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "false");
    expect(screen.getByRole("tablist", { name: /^phone navigation$/i })).toHaveTextContent(/act.*action/i);
    expect(screen.queryByRole("button", { name: /open phone navigation and room controls/i })).not.toBeInTheDocument();

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));
    await waitFor(() => expect(document.querySelector(".phone-inventory-panel")).toHaveTextContent(/black route fuse/i));

    await waitFor(() => expect(shell).toHaveClass("phone-shell--bottomdock-compact"));
    openPhoneTabs();

    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(shell).toHaveClass("phone-shell--bottomdock-expanded");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "true");
    expect(screen.queryByRole("button", { name: /hide ui|show ui/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^close$/i })).toHaveClass("phone-portrait-tab-utility");
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    expect(tablist).toBeVisible();
    expect(tablist).toHaveAttribute("data-navigation-state", "expanded");
    expect(tablist).not.toHaveAttribute("aria-hidden");
    expect(tablist).not.toHaveAttribute("inert");
    expect(within(tablist).getAllByRole("tab", { hidden: true })).toHaveLength(4);
    expect(screen.getByRole("button", { name: /close all phone sections/i })).toBeEnabled();
    const phoneContent = document.querySelector("main[aria-label='Phone content']");
    expect(phoneContent).toHaveAttribute("aria-hidden", "true");
    expect(phoneContent).toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("button", { name: /leave room/i }));
    expect(onLeave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(shell).toHaveClass("phone-shell--chrome-visible");
    expect(shell).toHaveClass("phone-shell--bottomdock-compact");
    expect(shell).toHaveAttribute("data-phone-chrome-visible", "true");
    expect(shell).toHaveAttribute("data-phone-bottom-dock-expanded", "false");
    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toHaveTextContent(/kit.*inventory/i);
    expect(screen.getByTestId("signal-phone-identity")).toBeVisible();
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("routes the More-menu Leave Room action to the shared confirmation owner", () => {
    const onLeave = vi.fn();
    const patch = createPatch({ encounter: null, phase: "broadcast" });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={onLeave}
      />
    );

    expect(screen.queryByRole("button", { name: /leave room/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show all phone sections/i }));
    fireEvent.click(screen.getByRole("button", { name: /leave room/i }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("starts each different top-level phone section at its meaningful top", async () => {
    const patch = createPatch({ encounter: null, phase: "broadcast" });
    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const scrollRoot = screen.getByLabelText(/phone content/i);
    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));
    await waitFor(() => expect(document.querySelector(".phone-inventory-panel")).toBeInTheDocument());
    scrollRoot.scrollTop = 640;

    fireEvent.click(screen.getByRole("tab", { name: /objectives/i }));
    await waitFor(() => expect(scrollRoot.scrollTop).toBe(0));
    scrollRoot.scrollTop = 520;

    fireEvent.click(screen.getByRole("tab", { name: /operative/i }));
    await waitFor(() => expect(scrollRoot.scrollTop).toBe(0));
  });

  it("renders compact expandable player card stats without label value collision", () => {
    const patch = createPatch({ encounter: null, phase: "broadcast" });
    const self = {
      ...patch.self!,
      character: {
        ...patch.self!.character,
        stats: { ...patch.self!.character.stats, command: 4 },
        statUpgrades: { command: 1 },
        equippedGear: { weapon: null, armor: "coffin-rig", utility: "oath-chain-ledger" }
      }
    };

    render(
      <PortraitControllerView
        self={self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={{ ...patch, self }}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    const statsRegion = screen.getByLabelText(/character stats/i);
    const commandStat = within(statsRegion).getByRole("button", { name: /command current stat 5/i });
    const commandHeading = commandStat.querySelector(".phone-stat-card-heading");

    expect(commandStat.querySelector(".phone-stat-card-label")).toHaveTextContent(/^COMMAND$/);
    expect(commandStat.querySelector(".phone-stat-card-value")).toHaveTextContent(/^5$/);
    expect(commandStat.querySelector(".phone-stat-card-modifier")).toHaveTextContent(/^\+2$/);
    expect(commandStat).toHaveAttribute("data-stat", "command");
    expect(commandStat).toHaveClass("phone-stat-card-command");
    expect(commandHeading).toHaveTextContent(/COMMAND\s+5/);
    expect(commandHeading).not.toHaveTextContent(/COMMAND4/);
    expect(commandStat).toHaveTextContent(/base 3/i);
    expect(commandStat).toHaveTextContent(/bonus \+2/i);
    expect(commandStat).not.toHaveTextContent(/permanent \+1/i);
    expect(commandStat).not.toHaveTextContent(/gear\/follower \+1/i);
    expect(screen.queryByText(/base 3 \| permanent \+1 \| gear\/follower \+1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Temporary$/)).not.toBeInTheDocument();

    fireEvent.click(commandStat);

    expect(commandStat).toHaveAttribute("aria-expanded", "true");
    expect(within(commandStat).getByText("Base")).toBeInTheDocument();
    expect(within(commandStat).getByText("Upgrades")).toBeInTheDocument();
    expect(within(commandStat).getByText("Equipped")).toBeInTheDocument();
    expect(within(commandStat).getByText(/oath-chain ledger \+1/i)).toBeInTheDocument();
    expect(within(commandStat).getByText("Companion")).toBeInTheDocument();
    expect(within(commandStat).getByText("Conditional / Status")).toBeInTheDocument();
    expect(within(commandStat).getByText("Current equipped value")).toBeInTheDocument();
    expect(within(commandStat).getAllByText("+0").length).toBe(2);
    expect(within(commandStat).getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/character vitals/i)[0]).toHaveTextContent(/salvage/i);
    expect(screen.getByRole("region", { name: /equipped gear bonuses/i })).toHaveTextContent(/coffin rig/i);
    expect(screen.getByRole("region", { name: /equipped gear bonuses/i })).toHaveTextContent(/\+1 forge · always active/i);

    fireEvent.click(within(statsRegion).getByRole("button", { name: /grit current stat 2/i }));

    expect(commandStat).toHaveAttribute("aria-expanded", "false");
    expect(within(statsRegion).getByRole("button", { name: /grit current stat 2, details expanded/i })).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector(".phone-portrait-vitals")).toHaveTextContent(/scars 0/i);
    expect(document.querySelector(".phone-portrait-vitals")).not.toHaveTextContent(/heat/i);
    expect(document.querySelector(".phone-portrait-vitals")).not.toHaveTextContent(/trophies/i);
    expect(screen.getByRole("tab", { name: /player card/i })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the normal phone header and exposes no hide control", () => {
    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch({ encounter: null, phase: "broadcast" })}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show all phone sections/i }));
    expect(screen.queryByRole("button", { name: /hide ui|show ui/i })).not.toBeInTheDocument();
    expect(document.querySelector(".phone-portrait-controller")).toHaveClass("phone-shell--chrome-visible");
    expect(screen.getByTestId("signal-phone-identity")).toBeVisible();
    expect(screen.getByRole("navigation", { name: /more phone controls/i })).toBeInTheDocument();
  });

  it("keeps the base phone menu available throughout battle", async () => {
    const onIntent = vi.fn();
    const patch = createPatch();

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByTestId("phone-action-screen")).toBeInTheDocument());
    expect(document.querySelector(".phone-portrait-controller")).not.toHaveClass("phone-shell--battle-active");
    expect(screen.queryByTestId("phone-action-guidance")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /battle navigation/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enter combat/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));
    expect(document.querySelector(".phone-inventory-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /battle/i }));
    expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument();
  });

  it("keeps one global navigation system while authoritative movement is active", async () => {
    const movementPatch = createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "outer_ember_sanctum",
        currentSectorName: "Pilgrim Lock Gate",
        destinations: []
      }
    });
    const props = {
      self: movementPatch.self,
      roomCode: "RT7P4",
      displayName: "Lane",
      connectionStatus: "open",
      activeSeatId: "seat-1",
      activeContractCard: null,
      characters,
      onIntent: vi.fn(),
      onLeave: vi.fn()
    };
    const { rerender } = render(<PortraitControllerView {...props} patch={movementPatch} />);

    await waitFor(() => expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeInTheDocument());
    expect(screen.queryByRole("navigation", { name: /movement navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-action-guidance")).not.toBeInTheDocument();

    const completedPatch = createPatch({ phase: "action", encounter: null, movementPlanner: null });
    rerender(<PortraitControllerView {...props} self={completedPatch.self} patch={completedPatch} />);
    await waitFor(() => expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeInTheDocument());
    expect(screen.queryByRole("navigation", { name: /movement navigation/i })).not.toBeInTheDocument();
  });

  it("keeps destination confirmation enabled after a non-committing preview", async () => {
    const onIntent = vi.fn();
    const movementPatch = createPatch({
      phase: "navigation",
      encounter: null,
      requiredAction: {
        id: "movement:seat-1:1",
        kind: "movement",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        requiredTab: "move",
        label: "Choose a destination",
        detail: "Choose one legal destination.",
        canAct: true,
        waiting: false,
        privacy: "owner"
      },
      movementPlanner: {
        active: true,
        movementValue: 1,
        rolledValue: 1,
        currentSectorId: "ashwake-crossing",
        currentSectorName: "Ashwake Crossing",
        destinations: [{
          markerLabel: "A",
          sectorId: "glassmere-spindle",
          name: "Glassmere Spindle",
          ring: "outer",
          distance: 1,
          route: ["ashwake-crossing", "glassmere-spindle"],
          routeNames: ["Ashwake Crossing", "Glassmere Spindle"],
          tags: ["signal"],
          threatIcons: ["blue"],
          ruleText: "Tune the spindle.",
          faceUpThreats: [],
          occupants: [],
          strategicTags: ["safe"]
        }]
      }
    });

    render(
      <PortraitControllerView
        self={movementPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={movementPatch}
        patchSequence={10}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    const select = await screen.findByRole("button", { name: /select destination a, glassmere spindle/i });
    fireEvent.click(select);
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_DESTINATION_PREVIEWED",
      seatId: "seat-1",
      toSectorId: "glassmere-spindle"
    });
    expect(screen.getByRole("button", { name: /confirm glassmere spindle/i })).toBeEnabled();
  });

  it("restores the focused battle UI for the authoritative assigned enemy roller", async () => {
    const patch = createPatch({
      activeSeatIndex: 1,
      turnOrder: ["seat-1", "seat-2"],
      seats: [
        ...createPatch().seats,
        { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, ready: true, kicked: false }
      ],
      encounter: null,
      activeResolution: null,
      pendingEnemyRoll: {
        fighterSeatId: "seat-2",
        assignedRollerSeatId: "seat-1",
        encounterCardId: "cinder-veil-stalker",
        encounterTitle: "Cinder-Veil Stalker",
        stat: "grit"
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-2"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByTestId("phone-battle-shell")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /roll for enemy/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /phone navigation/i })).toBeInTheDocument();
  });

  it("does not render the redundant Required now helper", () => {
    const patch = createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "outer_ember_sanctum",
        currentSectorName: "Pilgrim Lock",
        destinations: []
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByTestId("phone-action-guidance")).not.toBeInTheDocument();
    expect(screen.queryByText(/required now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show current instruction/i })).not.toBeInTheDocument();
  });

  it("keeps movement detail and Confirm Move usable with the fixed header", async () => {
    const onIntent = vi.fn();
    const movementPatch = createPatch({
      phase: "navigation",
      encounter: null,
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "outer_ember_sanctum",
        currentSectorName: "Pilgrim Lock",
        destinations: [
          {
            sectorId: "ashwake-crossing",
            name: "Ashwalk Bridge",
            ring: "outer",
            distance: 1,
            route: ["outer_ember_sanctum", "ashwake-crossing"],
            routeNames: ["Pilgrim Lock", "Ashwalk Bridge"],
            tags: ["hazard", "crossroads"],
            threatIcons: ["yellow"],
            ruleText: "If clear, mark your route and gain a scouting note.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["safe"]
          }
        ]
      }
    });

    render(
      <PortraitControllerView
        self={movementPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={movementPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByTestId("phone-movement-view")).toBeInTheDocument();
    expect(document.querySelector(".phone-movement-context-nav")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show all phone sections/i }));
    expect(screen.getByRole("tab", { name: /move/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide ui|show ui/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.getByTestId("phone-movement-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select ashwalk bridge/i }));
    await waitFor(() => expect(screen.getByTestId("movement-action-region")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /confirm ashwalk bridge/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
  });

  it("keeps shop Skip usable with the fixed header", () => {
    const onIntent = vi.fn();
    const shopPatch = createPatch({
      encounter: null,
      shopEncounter: {
        sectorId: "outer_waymarket",
        sectorName: "Anchor Market",
        shopId: "outer_waymarket",
        shopName: "Anchor Market",
        available: true,
        blocked: false,
        shopType: "market",
        shopCategory: "market",
        stockCategory: "market",
        status: "open",
        activePlayer: {
          playerId: "seat-1",
          name: "Sable Vey",
          characterName: "Sable Vey",
          salvage: 3,
          wounds: { current: 0, max: 6 },
          trophies: 0,
          completedContracts: 0
        },
        blockingThreats: [],
        services: [],
        revealedStock: [],
        sellInventory: []
      }
    });

    render(
      <PortraitControllerView
        self={shopPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={shopPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show all phone sections/i }));
    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide ui|show ui/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /leave shop/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SKIP_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("lets the owner equip an exact starting Gear instance from inventory", () => {
    const patch = createPatch({ phase: "action", encounter: null, activeResolution: null });
    const onIntent = vi.fn();
    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);

    openInventoryCategory(/equipment.*records/i);
    const fuseCard = screen.getByLabelText(/black route fuse:/i);
    fireEvent.click(within(fuseCard).getByRole("button", { name: /equip weapon/i }));

    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({
      type: "EQUIP_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse",
      slot: "weapon"
    }));
  });

  it("shows a public-safe waiting instruction instead of another player's controls", () => {
    const patch = createPatch({
      activeSeatIndex: 1,
      turnOrder: ["seat-1", "seat-2"],
      seats: [
        ...createPatch().seats,
        {
          seatId: "seat-2",
          characterId: "signal-witch",
          displayName: "Mira",
          connected: true,
          ready: true,
          kicked: false
        }
      ],
      activeResolution: {
        id: "seat-2:threat:private-battle",
        playerId: "seat-2",
        source: "threat",
        stage: "battle_setup",
        card: { id: "private-battle", title: "Hidden foe", type: "enemy", artType: "threat" },
        battle: { enemyName: "Hidden foe", stat: "signal", difficulty: 8, modifiers: [] }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-2"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByTestId("phone-action-guidance")).not.toBeInTheDocument();
    expect(screen.getByText(/standby/i)).toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-primary-action")).not.toBeInTheDocument();
    expect(screen.queryByText(/roll your die/i)).not.toBeInTheDocument();
  });

  it("routes once per authoritative action and preserves passive navigation for an unchanged projection", async () => {
    const shopPatch = createPatch({
      phase: "action",
      encounter: null,
      requiredAction: {
        id: "shop:seat-1:anchor-market",
        kind: "shop",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        requiredTab: "shop",
        label: "Shop",
        detail: "Choose an item or leave the shop.",
        canAct: true,
        waiting: false,
        privacy: "owner"
      },
      shopEncounter: {
        sectorId: "outer_waymarket",
        sectorName: "Anchor Market",
        shopId: "outer_waymarket",
        shopName: "Anchor Market",
        status: "open",
        activePlayer: { playerId: "seat-1", name: "Lane", characterName: "Deepdale", salvage: 3, wounds: { current: 0, max: 6 } },
        blockingThreats: [],
        services: []
      }
    });
    const view = render(
      <PortraitControllerView self={shopPatch.self} roomCode="RT7P4" displayName="Lane" connectionStatus="open"
        activeSeatId="seat-1" activeContractCard={null} patch={shopPatch} patchSequence={10}
        characters={characters} onIntent={vi.fn()} onLeave={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument());
    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));
    expect(screen.getByRole("tab", { name: /player card/i })).toHaveAttribute("aria-selected", "true");

    view.rerender(
      <PortraitControllerView self={shopPatch.self} roomCode="RT7P4" displayName="Lane" connectionStatus="open"
        activeSeatId="seat-1" activeContractCard={null} patch={shopPatch} patchSequence={11}
        characters={characters} onIntent={vi.fn()} onLeave={vi.fn()} />
    );
    expect(screen.getByRole("tab", { name: /player card/i })).toHaveAttribute("aria-selected", "true");

    const nextShopPatch = {
      ...shopPatch,
      requiredAction: { ...shopPatch.requiredAction!, id: "shop:seat-1:anchor-market:purchase" }
    };
    view.rerender(
      <PortraitControllerView self={nextShopPatch.self} roomCode="RT7P4" displayName="Lane" connectionStatus="open"
        activeSeatId="seat-1" activeContractCard={null} patch={nextShopPatch} patchSequence={12}
        characters={characters} onIntent={vi.fn()} onLeave={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument());
  });

  it("locks the projected command tree immediately after one submission", async () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      phase: "navigation",
      encounter: null,
      requiredAction: {
        id: "movement-roll:seat-1:turn-1",
        kind: "movement",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        requiredTab: "move",
        label: "Roll for movement",
        detail: "Roll once to reveal legal destinations.",
        canAct: true,
        waiting: false,
        privacy: "owner"
      },
      movementPlanner: null
    });

    const view = render(
      <PortraitControllerView self={patch.self} roomCode="RT7P4" displayName="Lane" connectionStatus="open"
        activeSeatId="seat-1" activeContractCard={null} patch={patch} patchSequence={21}
        characters={characters} onIntent={onIntent} onLeave={vi.fn()} />
    );

    const roll = await screen.findByRole("button", { name: /roll movement/i });
    fireEvent.click(roll);
    fireEvent.click(roll);

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("ROLLING");
    expect(roll).toBeDisabled();

    view.rerender(
      <PortraitControllerView self={patch.self} roomCode="RT7P4" displayName="Lane" connectionStatus="open"
        activeSeatId="seat-1" activeContractCard={null} patch={patch} patchSequence={21}
        serverError="Movement revision is stale or unavailable"
        characters={characters} onIntent={onIntent} onLeave={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/turn has advanced/i));
    expect(screen.getByRole("button", { name: /roll movement/i })).toBeEnabled();
  });

  it("restores a stalled required action after six seconds without resending it", async () => {
    const onIntent = vi.fn(() => true);
    const onRequestResynchronize = vi.fn();
    const patch = createPatch({
      phase: "navigation",
      encounter: null,
      requiredAction: {
        id: "movement-roll:seat-1:turn-watchdog",
        kind: "movement",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        requiredTab: "move",
        label: "Roll for movement",
        detail: "Roll once to reveal legal destinations.",
        canAct: true,
        waiting: false,
        privacy: "owner"
      },
      movementPlanner: null
    });
    const renderView = (connectionSynchronized: boolean) => (
      <PortraitControllerView self={patch.self} roomCode="RT7P4" displayName="Lane" connectionStatus={connectionSynchronized ? "open" : "closed"}
        activeSeatId="seat-1" activeContractCard={null} patch={patch} patchSequence={31}
        connectionSynchronized={connectionSynchronized} characters={characters} onIntent={onIntent}
        onRequestResynchronize={onRequestResynchronize} onLeave={vi.fn()} />
    );
    const view = render(renderView(true));
    const roll = await screen.findByRole("button", { name: /roll movement/i });

    vi.useFakeTimers();
    fireEvent.click(roll);
    act(() => vi.advanceTimersByTime(6000));

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onRequestResynchronize).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(/will not be sent again automatically/i);
    expect(roll).toBeDisabled();

    view.rerender(renderView(false));
    view.rerender(renderView(true));
    act(() => vi.runOnlyPendingTimers());

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /roll movement/i })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/latest authoritative action restored/i);
  });

  it("shows private rivalry agenda details on the Quest tab", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealLocked",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: ["Keep it quiet"],
        reveal: {
          state: "revealLocked",
          available: false,
          label: "Reveal locked",
          hint: "Reveal is locked until this agenda's table moment becomes available.",
          lockedReason: "Reveal window has not opened."
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    expect(screen.getByRole("button", { name: /shared mission/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /my contract/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /rivalry/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /completed/i })).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelectorAll(".phone-objective-group-icon")).toHaveLength(4);
    expect(document.querySelector('img[src="/assets/riftfall/ui/objective-categories/shared-mission.phone.webp"]')).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/riftfall/ui/objective-categories/contract.phone.webp"]')).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/riftfall/ui/objective-categories/rivalry.phone.webp"]')).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/riftfall/ui/objective-categories/completed.phone.webp"]')).toBeInTheDocument();

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Claim the Black Ledger")).toBeInTheDocument();
    expect(within(agenda).getByText("1/3")).toBeInTheDocument();
    expect(within(agenda).getByText("Reveal is locked until this agenda's table moment becomes available.")).toBeInTheDocument();
    expect(within(agenda).getByText("Reveal window has not opened.")).toBeInTheDocument();
    expect(within(agenda).getByText("Keep it quiet")).toBeInTheDocument();
  });

  it("confirms and sends a rivalry agenda reveal intent when available", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealAvailable",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "revealAvailable",
          available: true,
          label: "Reveal Agenda",
          hint: "Ready to reveal a public agenda moment.",
          lockedReason: null
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal agenda/i }));

    expect(screen.getByRole("region", { name: /reveal agenda confirmation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm reveal/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });
  });

  it("shows revealed rivalry agenda state without exposing new controls", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "revealed",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "claim-trophies",
          title: "Claim the Black Ledger",
          summary: "End the run with the table believing your trophies carried the expedition.",
          progressLabel: "Trophies held",
          progress: 1,
          target: 3,
          stakes: "Reveal when the crew starts counting who paid the highest price."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "revealed",
          available: false,
          label: "Revealed",
          hint: "Lane revealed a Rivalry Agenda.",
          publicTitle: "Rivalry Agenda",
          publicSummary: "Lane revealed a Rivalry Agenda.",
          revealedAtRound: 1
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Revealed")).toBeInTheDocument();
    expect(within(agenda).getByText("Lane revealed a Rivalry Agenda.")).toBeInTheDocument();
    expect(within(agenda).queryByRole("button", { name: /reveal agenda/i })).not.toBeInTheDocument();
  });

  it("shows completed rivalry agenda progress and private scoring to the owner", () => {
    const patch = createPatch({
      interactionMode: "rivalry",
      encounter: null,
      privateRivalry: {
        active: true,
        mode: "rivalry",
        secrecy: "private",
        revealState: "completed",
        tableWarning: "Shown only on this phone. Keep it off the TV table.",
        objective: {
          id: "finish-contracts",
          title: "Own the Contract Record",
          summary: "Close contracts while everyone else argues over priorities.",
          progressLabel: "Contracts completed",
          progress: 3,
          target: 3,
          stakes: "Reveal once your ledger is hard to dispute."
        },
        scoring: {
          pointsAwarded: 1,
          completedAtRound: 2,
          completedBySeatId: "seat-1",
          completionSummary: "You completed Own the Contract Record."
        },
        recentPrivateNotes: [],
        reveal: {
          state: "completed",
          available: false,
          label: "Completed",
          hint: "You completed Own the Contract Record.",
          publicTitle: "Rivalry Agenda",
          publicSummary: "Lane completed a Rivalry Agenda."
        }
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    const agenda = screen.getByRole("region", { name: /private rivalry agenda/i });

    expect(within(agenda).getByText("Own the Contract Record")).toBeInTheDocument();
    expect(within(agenda).getByText("3/3")).toBeInTheDocument();
    expect(within(agenda).getAllByText("Completed")).toHaveLength(2);
    expect(within(agenda).getByText("1 rivalry point")).toBeInTheDocument();
    expect(within(agenda).getAllByText("You completed Own the Contract Record.")).toHaveLength(2);
    expect(within(agenda).queryByRole("button", { name: /reveal agenda/i })).not.toBeInTheDocument();
  });

  it("hides the rivalry agenda on the Quest tab when no private payload is supplied", () => {
    const patch = createPatch({
      interactionMode: "co-op",
      encounter: null,
      privateRivalry: null
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    expect(screen.queryByRole("region", { name: /private rivalry agenda/i })).not.toBeInTheDocument();
    expect(screen.getByText("No active Contract")).toBeInTheDocument();
  });

  it("shows the active mission with objective and progress on the Quest tab", () => {
    const basePatch = createPatch();
    const baseSelf = basePatch.self;
    if (!baseSelf) {
      throw new Error("Expected phone self fixture.");
    }

    const patch = createPatch({
      encounter: null,
      privateRivalry: null,
      self: {
        ...baseSelf,
        character: {
          ...baseSelf.character,
          activeContract: { contractId: "choir-hush-census", progress: 1 }
        }
      }
    });
    const activeContractCard = {
      id: "choir-hush-census",
      name: "Choir Hush Census",
      factionGiver: "Glass Choir",
      text: "Record the quiet names before the hall notices.",
      objective: { type: "defeatCount" as const, target: 2 },
      reward: { type: "gain_salvage" as const, amount: 1 }
    };

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={activeContractCard}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    const mission = screen.getByTestId("phone-active-mission-card");
    expect(within(mission).getByText("Choir Hush Census")).toBeInTheDocument();
    expect(within(mission).getByTestId("phone-active-mission-art")).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(contracts|fallbacks)\//));
    expect(within(mission).getByTestId("phone-active-mission-target")).toHaveTextContent(/target: any sector with a threat or enemy/i);
    expect(within(mission).getByText("Defeat 2 enemies")).toBeInTheDocument();
    expect(within(mission).getByText("1/2 defeats")).toBeInTheDocument();
    expect(within(mission).getByText("Gain 1 Salvage")).toBeInTheDocument();
  });

  it("shows up to three active Contracts together on the Objectives tab", () => {
    const basePatch = createPatch({ encounter: null });
    const baseSelf = basePatch.self!;
    const contracts = ["choir-hush-census", "compact-ember-courier", "relay-witness"].map(
      (id, index) => ({
        id,
        name: ["Choir Hush Census", "Ember Courier", "Relay Witness"][index]!,
        factionGiver: "Ashen Relay",
        text: "Follow the private route.",
        objective: { type: "defeatCount" as const, target: index + 1 },
        reward: { type: "gain_salvage" as const, amount: 1 }
      })
    );
    const activeContracts = contracts.map((contract, index) => ({
      contractId: contract.id,
      progress: index
    }));
    const patch = {
      ...basePatch,
      activeContractCard: contracts[0],
      activeContractCards: contracts,
      self: {
        ...baseSelf,
        character: {
          ...baseSelf.character,
          activeContract: activeContracts[0],
          activeContracts
        }
      }
    } satisfies PhonePatchPayload;

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={contracts[0]!}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );
    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    expect(screen.getByRole("button", { name: /my contracts.*3\/3 active/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("phone-active-mission-card")).toHaveLength(3);
    expect(screen.getByText("Choir Hush Census")).toBeInTheDocument();
    expect(screen.getByText("Ember Courier")).toBeInTheDocument();
    expect(screen.getByText("Relay Witness")).toBeInTheDocument();
  });

  it("keeps the main phone header and bottom menu while opening the Inventory Relic exchange", () => {
    const basePatch = createPatch({ encounter: null });
    const baseSelf = basePatch.self!;
    const contracts = ["choir-hush-census", "compact-ember-courier", "relay-witness"].map(
      (id, index) => ({
        id,
        name: ["Choir Hush Census", "Ember Courier", "Relay Witness"][index]!,
        factionGiver: "Ashen Relay",
        text: "A completed private route.",
        objective: { type: "defeatCount" as const, target: 1 },
        reward: { type: "gain_salvage" as const, amount: 1 }
      })
    );
    const completedMissionRecords = contracts.map((contract, index) => ({
      missionId: contract.id,
      completedByPlayerId: "seat-1",
      completedAtSequence: index + 1,
      rewardGranted: true,
      spent: false
    }));
    const patch = {
      ...basePatch,
      availableContracts: contracts,
      self: {
        ...baseSelf,
        character: {
          ...baseSelf.character,
          completedContracts: contracts.map((contract) => contract.id),
          completedMissionRecords
        }
      }
    } satisfies PhonePatchPayload;
    const onIntent = vi.fn();

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: /^inventory$/i }));
    const missionsToggle = openMissionInventoryCategory();
    expect(missionsToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /open relic exchange/i }));
    expect(screen.getByTestId("signal-phone-identity")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /more phone controls/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^inventory$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/select three completed Contracts/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /offer 3 Contract seals/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "OPEN_MISSION_RELIC_EXCHANGE",
      seatId: "seat-1",
      missionIds: contracts.map((contract) => contract.id)
    });
  });

  it("holds the central phone viewport for a TV ceremony from Inventory, then restores the same tab", () => {
    const basePatch = createPatch({ encounter: null });
    const onIntent = vi.fn();
    const view = render(
      <PortraitControllerView
        self={basePatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={basePatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /^inventory$/i }));
    expect(screen.getByText("Inventory", { selector: ".phone-sheet-section-heading" })).toBeInTheDocument();

    const heldPatch = createPatch({
      encounter: null,
      tvPresentationGate: {
        eventId: "tv:trophy-upgrade:upgrade-seat-1-signal-6",
        kind: "trophy-upgrade",
        ownerSeatId: "seat-1",
        ownerDisplayName: "Lane",
        label: "Signal advancement",
        deadlineAt: "2026-08-03T12:00:10.000Z"
      }
    });
    view.rerender(
      <PortraitControllerView
        self={heldPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={heldPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByTestId("tv-presentation-gate")).toHaveTextContent(/your moment is playing on tv/i);
    expect(screen.getByText("Inventory", { selector: ".phone-sheet-section-heading" })).toBeInTheDocument();
    expect(view.container.querySelector('main[aria-label="Phone content"]')).toHaveAttribute("inert");
    expect(view.container.querySelector('main[aria-label="Phone content"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("signal-phone-identity")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /more phone controls/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^inventory$/i })).toHaveAttribute("aria-selected", "true");

    view.rerender(
      <PortraitControllerView
        self={basePatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={basePatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByTestId("tv-presentation-gate")).not.toBeInTheDocument();
    expect(screen.getByText("Inventory", { selector: ".phone-sheet-section-heading" })).toBeInTheDocument();
    expect(view.container.querySelector('main[aria-label="Phone content"]')).not.toHaveAttribute("inert");
    expect(screen.getByRole("tab", { name: /^inventory$/i })).toHaveAttribute("aria-selected", "true");
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("shows two private Relic options and claims only the selected offer", () => {
    const basePatch = createPatch({ encounter: null });
    const baseSelf = basePatch.self!;
    const completedMissionIds = ["choir-hush-census", "compact-ember-courier", "relay-witness"];
    const options = [
      { ...importedRelic, id: "oathchain-lens", name: "Oathchain Lens" },
      { ...importedRelic, id: "saint-bone-key", name: "Saint-Bone Key" }
    ];
    const patch = {
      ...basePatch,
      self: {
        ...baseSelf,
        character: {
          ...baseSelf.character,
          completedContracts: completedMissionIds
        }
      },
      pendingMissionRelicExchange: {
        id: "mission-relic:seat-1:9",
        status: "awaitingSelection" as const,
        selectedMissionIds: completedMissionIds,
        options
      }
    } satisfies PhonePatchPayload;
    const onIntent = vi.fn();

    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);
    openMissionInventoryCategory();
    fireEvent.click(screen.getByRole("radio", { name: /saint-bone key/i }));
    fireEvent.click(screen.getByRole("button", { name: /claim selected relic/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CLAIM_MISSION_RELIC",
      seatId: "seat-1",
      exchangeId: "mission-relic:seat-1:9",
      artifactId: "saint-bone-key"
    });
  });

  it("archives a completed Contract and immediately opens a focused replacement window", () => {
    const completedContract = {
      id: "choir-hush-census",
      name: "Choir Hush Census",
      factionGiver: "Glass Choir",
      text: "Record the quiet names.",
      objective: { type: "defeatCount" as const, target: 1 },
      reward: { type: "gain_salvage" as const, amount: 1 }
    };
    const nextContract = {
      id: "compact-ember-courier",
      name: "Ember Courier",
      factionGiver: "Cinder Compact",
      text: "Carry the sealed route.",
      objective: { type: "defeatCount" as const, target: 2 },
      reward: { type: "gain_salvage" as const, amount: 2 }
    };
    const secondContract = { ...nextContract, id: "glass-choir-census", name: "Glass Choir Census" };
    const thirdContract = { ...nextContract, id: "relay-witness", name: "Relay Witness" };
    const fourthContract = { ...nextContract, id: "hidden-fourth-offer", name: "Hidden Fourth Offer" };
    const base = createPatch({
      encounter: null,
      activeResolution: null,
      availableContracts: [completedContract, nextContract, secondContract, thirdContract, fourthContract]
    });
    const self = base.self!;
    const patch = {
      ...base,
      pendingMissionSelection: {
        id: "replacement-1",
        completedContractId: completedContract.id,
        status: "awaitingSelection" as const,
        options: [nextContract, secondContract, thirdContract, fourthContract]
      },
      self: {
        ...self,
        character: { ...self.character, activeContract: null, completedContracts: [completedContract.id] }
      }
    } satisfies PhonePatchPayload;
    const onIntent = vi.fn();

    const view = render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);
    openMissionInventoryCategory();
    expect(screen.getByLabelText(/completed contract ledger/i)).toHaveTextContent("Choir Hush Census");
    view.unmount();

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
      />
    );
    const dialog = screen.getByRole("dialog", { name: /Contract complete/i });
    expect(screen.queryByRole("navigation", { name: /phone controls/i })).not.toBeInTheDocument();
    const chooser = within(dialog).getByRole("region", { name: /choose new Contract/i });
    expect(within(chooser).getAllByRole("button", { name: /^choose /i })).toHaveLength(3);
    expect(within(chooser).queryByText("Hidden Fourth Offer")).not.toBeInTheDocument();
    expect(within(chooser).queryByText("Choir Hush Census")).not.toBeInTheDocument();
    fireEvent.click(within(chooser).getByRole("button", { name: /choose ember courier/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SELECT_REPLACEMENT_CONTRACT",
      seatId: "seat-1",
      selectionId: "replacement-1",
      contractId: nextContract.id
    });
  });

  it("opens the replacement mission chooser when a mission completion is projected", async () => {
    const contract = {
      id: "choir-hush-census",
      name: "Choir Hush Census",
      factionGiver: "Glass Choir",
      text: "Record the quiet names.",
      objective: { type: "defeatCount" as const, target: 1 },
      reward: { type: "gain_salvage" as const, amount: 1 }
    };
    const nextContract = { ...contract, id: "compact-ember-courier", name: "Ember Courier" };
    const initial = createPatch({ encounter: null, activeResolution: null, availableContracts: [contract, nextContract] });
    const initialSelf = initial.self!;
    initial.self = {
      ...initialSelf,
      character: { ...initialSelf.character, activeContract: { contractId: contract.id, progress: 1 }, completedContracts: [] }
    };
    const view = render(
      <PortraitControllerView
        self={initial.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={contract}
        patch={initial}
        patchSequence={10}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );
    const completed = {
      ...initial,
      pendingMissionSelection: { id: "replacement-2", completedContractId: contract.id, status: "awaitingSelection" as const, options: [nextContract] },
      self: {
        ...initial.self!,
        character: { ...initial.self!.character, activeContract: null, completedContracts: [contract.id] }
      }
    } satisfies PhonePatchPayload;
    view.rerender(
      <PortraitControllerView
        self={completed.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={completed}
        patchSequence={11}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const dialog = await screen.findByRole("dialog", { name: /Contract complete/i });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /choose ember courier/i })).toHaveFocus());
  });

  it("shows public scenario sheet progress and pressure on the Quest tab without private agenda data", () => {
    const patch = createPatch({
      encounter: null,
      activeScenario: {
        id: "scenario_broken_seal",
        name: "The Broken Seal",
        theme: "The last ward is splitting.",
        sheetArtPath: "/assets/scenarios/broken-seal.png",
        difficulty: "easy-medium",
        mode: "coop",
        publicDisplay: {
          modeLabel: "Solo / Co-op",
          objective: "Stabilize the Broken Seal before the breach collapses the ward.",
          privacy: "Public scenario pressure only."
        },
        pressureSummary: "Keep the seals intact.",
        confrontationTitle: "Reseal the Prison",
        progressLabel: "Seal Restoration Marks",
        progress: 1,
        threshold: 2,
        finalGateRequirement: "Close 2 Riftgates before pressure reaches 6.",
        setup: [],
        specialRules: [],
        confrontationSteps: [],
        victoryText: "Complete the seal work to win."
      },
      scenarioPressure: {
        scenarioId: "scenario_broken_seal",
        scenarioName: "The Broken Seal",
        mode: "co-op",
        scenarioStatus: "active",
        pressureTrack: {
          name: "Seal Integrity",
          current: 5,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: false,
          tickTiming: "Round end",
          collapseRule: "Seal integrity reaches zero."
        },
        collapseTrack: {
          name: "Escalation",
          current: 2,
          max: 6,
          modifier: 0,
          difficultyBonus: 0,
          failureAtMax: true,
          tickTiming: "Round end",
          collapseRule: "The run fails at maximum escalation."
        },
        objectiveProgress: {
          label: "Seal Restoration Marks",
          current: 1,
          required: 2,
          completed: false
        },
        publicSummary: "Restore seals before the table collapses.",
        modeSpecific: {
          kind: "co-op",
          label: "Co-op",
          summary: "Shared objective and shared pressure.",
          privateAgenda: "none"
        }
      },
      publicResultDeltas: [
        {
          id: "scenario-progress",
          type: "scenarioProgress",
          label: "Scenario",
          value: 1,
          sign: "gain",
          targetScope: "scenario",
          visibility: "public",
          reason: "Contract completed: +1 objective progress.",
          source: "scenario:objective",
          publicText: "Contract completed: +1 objective progress.",
          severity: "scenario"
        }
      ],
      privateRivalry: null
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    openPhoneTabs();
    fireEvent.click(screen.getByRole("tab", { name: /^objectives$/i }));

    const scenario = screen.getByTestId("phone-shared-mission-summary");
    expect(scenario).toHaveTextContent(/the broken seal/i);
    expect(scenario).toHaveTextContent(/stabilize the broken seal/i);
    expect(scenario).toHaveTextContent(/win progress/i);
    expect(scenario).toHaveTextContent(/1\/2/i);
    expect(scenario).toHaveTextContent(/loss pressure/i);
    expect(scenario).toHaveTextContent(/2\/6/i);
    expect(scenario).toHaveTextContent(/if this reaches the limit, the scenario fails/i);
    expect(scenario).not.toHaveTextContent(/global escalation/i);
    expect(scenario).toHaveTextContent(/close 2 riftgates/i);
    expect(within(scenario).getByTestId("result-delta-row")).toHaveTextContent(/\+1 Scenario/i);
    expect(screen.queryByRole("region", { name: /private rivalry agenda/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/private trigger/i)).not.toBeInTheDocument();
  });

  it("shows a locked pre-game character screen with Back instead of bottom navigation", () => {
    const onLobbyBack = vi.fn();
    const onIntent = vi.fn();
    const lobbyPatch = createPatch({
      phase: "start",
      status: "lobby",
      seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: false, kicked: false }],
      startingContractOptions: [
        {
          id: "choir-quietus",
          name: "Quietus Ledger",
          factionGiver: "Glass Choir",
          text: "Silence one hunter on the listening road.",
          objective: { type: "defeatCount", target: 1 },
          reward: { type: "lose_heat", amount: 1 }
        }
      ],
      canReady: false,
      readyDisabledReason: "Choose a starting Contract before Ready"
    });

    render(
      <PortraitControllerView
        self={lobbyPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={lobbyPatch}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
        onLobbyBack={onLobbyBack}
      />
    );

    expect(screen.getByText(/Contract · step 3 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/^sable vey$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/choose starting Contract/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/quietus ledger/i)).toBeInTheDocument();
    expect(screen.getByTestId("phone-starting-mission-art")).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(contracts|fallbacks)\//));
    expect(screen.getByText(/silence one hunter/i)).toBeInTheDocument();
    expect(screen.getByText("Lane")).toBeInTheDocument();
    expect(document.querySelector(".phone-character-waiting-hero")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/character stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/special abilities/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/starting equipment/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-starting-mission-art").closest(".artwork-frame")).toHaveClass("artwork-frame--contain");
    expect(screen.queryByRole("tab", { name: /inventory/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select Contract/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "SELECT_STARTING_CONTRACT", seatId: "seat-1", contractId: "choir-quietus" });

    fireEvent.click(screen.getByRole("button", { name: /^ready$/i }));

    expect(onIntent).not.toHaveBeenCalledWith({ type: "SET_READY", seatId: "seat-1", ready: true });

    fireEvent.click(screen.getByRole("button", { name: /^leave room$/i }));

    expect(onLobbyBack).toHaveBeenCalledOnce();
  });

  it("keeps starting Contract inspection separate from selecting either Contract", async () => {
    const onIntent = vi.fn();
    const firstMission = {
      id: "choir-quietus",
      name: "Quietus Ledger",
      factionGiver: "Glass Choir",
      text: "Silence one hunter on the listening road.",
      objective: { type: "defeatCount" as const, target: 1 },
      reward: { type: "gain_note" as const, text: "The Choir owes you a clean favor." }
    };
    const secondMission = {
      id: "salt-road-writ",
      name: "Salt Road Writ",
      factionGiver: "Saltroad Compact",
      text: "Carry the sealed writ through the ash lanes.",
      objective: { type: "defeatCount" as const, target: 2 },
      reward: { type: "gain_note" as const, text: "The writ records a safe crossing." }
    };
    const lobbyPatch = createPatch({
      phase: "start",
      status: "lobby",
      seats: [
        {
          seatId: "seat-1",
          characterId: "void-marshal",
          characterSelected: true,
          displayName: "Lane",
          connected: true,
          ready: false,
          kicked: false,
          startingMissionSelected: false,
          startingMissionTitle: null
        }
      ],
      startingContractOptions: [firstMission, secondMission],
      selectedStartingContract: null,
      canReady: false,
      readyDisabledReason: "Choose a starting Contract before Ready"
    });

    const renderMissionPicker = (patchSequence: number) => (
      <PortraitControllerView
        self={lobbyPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={lobbyPatch}
        patchSequence={patchSequence}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
        onLobbyBack={vi.fn()}
      />
    );
    const { rerender } = render(renderMissionPicker(1));

    const missionCards = document.querySelectorAll(".phone-starting-mission-card");
    expect(missionCards).toHaveLength(2);

    fireEvent.click(within(missionCards[0] as HTMLElement).getByRole("button", { name: /^select Contract$/i }));
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenLastCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: firstMission.id
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(renderMissionPicker(2));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^select Contract$/i })).toHaveLength(2));

    fireEvent.click(within(missionCards[1] as HTMLElement).getByRole("button", { name: /^select Contract$/i }));
    expect(onIntent).toHaveBeenCalledTimes(2);
    expect(onIntent).toHaveBeenLastCalledWith({
      type: "SELECT_STARTING_CONTRACT",
      seatId: "seat-1",
      contractId: secondMission.id
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(within(missionCards[0] as HTMLElement).getByRole("button", { name: `Inspect ${firstMission.name}` }));
    expect(screen.getByRole("dialog", { name: firstMission.name })).toBeInTheDocument();
    expect(onIntent).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: `Close ${firstMission.name} inspection` }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Inspect ${firstMission.name}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Inspect ${secondMission.name}` })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^select Contract$/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^selecting/i })).toBeDisabled();
  });

  it("shows two private provision choices after mission selection and unlocks Ready after the second pick", () => {
    const onIntent = vi.fn();
    const mission = {
      id: "choir-quietus",
      name: "Quietus Ledger",
      factionGiver: "Glass Choir",
      text: "Silence one hunter on the listening road.",
      objective: { type: "defeatCount" as const, target: 1 },
      reward: { type: "gain_note" as const, text: "The Choir owes you a clean favor." }
    };
    const firstOffer = createPatch({
      phase: "start",
      status: "lobby",
      seats: [{
        seatId: "seat-1",
        characterId: "void-marshal",
        characterSelected: true,
        displayName: "Lane",
        connected: true,
        ready: false,
        kicked: false,
        startingMissionSelected: true,
        startingMissionTitle: mission.name,
        startingBonusPickCount: 0,
        startingBonusComplete: false
      }],
      selectedStartingContract: mission,
      startingContractOptions: [],
      startingBonusPickCount: 0,
      startingBonusSelection: {
        offerId: "starting-bonus:seat-1:1:8",
        pickNumber: 1,
        totalPicks: 2,
        options: [
          {
            kind: "gear",
            item: {
              id: "signal-rig",
              name: "Signal Rig",
              slot: "utility",
              statBonus: { stat: "signal", amount: 1 },
              effectModel: "permanent"
            }
          },
          {
            kind: "follower",
            follower: {
              id: "ember-guide",
              name: "Ember Guide",
              role: "guide",
              text: "Keeps the cinder route legible."
            }
          }
        ]
      },
      setup: {
        id: "setup:provision-selection:seat-1:8",
        stage: "provision-selection",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        title: "Choose Starting Provisions",
        activeInstruction: "Choose two starting provisions.",
        publicInstruction: "Lane is choosing starting provisions.",
        waitingInstruction: "Another operative is choosing starting provisions.",
        allowedCommand: "select-provision",
        inputEnabled: true,
        startReason: "Starting provisions are incomplete.",
        startBlockers: ["Lane must choose two starting provisions."],
        canStart: false,
        connectedCount: 1,
        readyCount: 0,
        seatCapacity: 1,
        revision: 8
      },
      canReady: false,
      readyDisabledReason: "Choose two starting bonuses before Ready"
    });

    const renderView = (patch: PhonePatchPayload, patchSequence: number) => (
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={patch}
        patchSequence={patchSequence}
        characters={characters}
        onIntent={onIntent}
        onLeave={vi.fn()}
        onLobbyBack={vi.fn()}
      />
    );
    const view = render(renderView(firstOffer, 8));

    expect(screen.getByText(/provision · pick 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /signal rig/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ember guide/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /choose equipment/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SELECT_STARTING_BONUS",
      seatId: "seat-1",
      offerId: "starting-bonus:seat-1:1:8",
      optionKind: "gear",
      optionId: "signal-rig"
    });
    expect(screen.getByRole("button", { name: /claiming/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /choose follower/i })).toBeDisabled();

    const completed = createPatch({
      ...firstOffer,
      seats: firstOffer.seats.map((seat) => ({
        ...seat,
        startingBonusPickCount: 2,
        startingBonusComplete: true
      })),
      startingBonusPickCount: 2,
      startingBonusSelection: null,
      canReady: true,
      readyDisabledReason: null,
      setup: {
        ...firstOffer.setup!,
        stage: "ready-check",
        allowedCommand: "ready",
        activeInstruction: "Press Ready.",
        startBlockers: []
      }
    });
    view.rerender(renderView(completed, 9));

    expect(screen.getByRole("button", { name: /^ready$/i })).toBeEnabled();
    expect(screen.queryByText(/signal rig/i)).not.toBeInTheDocument();
  });

  it("recovers a stalled setup mission selection without duplicating it", () => {
    const onIntent = vi.fn(() => true);
    const onRequestResynchronize = vi.fn();
    const mission = {
      id: "choir-quietus",
      name: "Quietus Ledger",
      factionGiver: "Glass Choir",
      text: "Silence one hunter on the listening road.",
      objective: { type: "defeatCount" as const, target: 1 },
      reward: { type: "gain_note" as const, text: "The Choir owes you a clean favor." }
    };
    const lobbyPatch = createPatch({
      phase: "start",
      status: "lobby",
      seats: [{ seatId: "seat-1", characterId: "void-marshal", characterSelected: true, displayName: "Lane", connected: true, ready: false, kicked: false }],
      startingContractOptions: [mission],
      selectedStartingContract: null,
      canReady: false
    });
    const renderView = (connectionSynchronized: boolean) => (
      <PortraitControllerView self={lobbyPatch.self} roomCode="RT7P4" displayName="Lane"
        connectionStatus={connectionSynchronized ? "open" : "closed"} activeSeatId={null} activeContractCard={null}
        patch={lobbyPatch} patchSequence={8} connectionSynchronized={connectionSynchronized}
        characters={characters} onIntent={onIntent} onRequestResynchronize={onRequestResynchronize}
        onLeave={vi.fn()} onLobbyBack={vi.fn()} />
    );
    const view = render(renderView(true));
    const select = screen.getByRole("button", { name: /^select Contract$/i });

    vi.useFakeTimers();
    fireEvent.click(select);
    act(() => vi.advanceTimersByTime(6000));

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onRequestResynchronize).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/will not be sent again automatically/i);
    expect(select).toBeDisabled();

    view.rerender(renderView(false));
    view.rerender(renderView(true));
    act(() => vi.runOnlyPendingTimers());

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /^select Contract$/i })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/authoritative setup state restored/i);
  });

  it("keeps the combat-card drawer filtered to usable timing-window cards", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} onlyUsable />);

    const inventory = screen.getByLabelText(/inventory/i);

    expect(within(inventory).getByText("Black Route Fuse")).toBeInTheDocument();
    expect(within(inventory).queryByText("Coffin Rig")).not.toBeInTheDocument();
  });

  it("renders Relevant Now only from the authoritative owner projection", () => {
    const base = createPatch();
    const patch = createPatch({
      objectUseStates: (base.self?.character.heldGear ?? []).map((item) => ({
        source: "gear" as const,
        id: item.id,
        instanceId: item.instanceId,
        usedThisTurn: false,
        usedThisRound: false,
        remainingUses: item.id === "cinder-suture-kit" ? 0 : 1,
        maxUses: 1,
        disabledReason: item.id === "cinder-suture-kit" ? "No wounds to heal." : null,
        relevantNow: item.id === "black-route-fuse" || item.id === "cinder-suture-kit",
        relevanceKind: item.id === "black-route-fuse" ? "usable" as const : item.id === "cinder-suture-kit" ? "blocked" as const : "inactive" as const,
        relevanceReason: item.id === "cinder-suture-kit" ? "No wounds to heal." : null,
        currentContext: "Battle roll",
        activeModifier: null
      }))
    });
    render(<PhoneInventoryPanel patch={patch} onIntent={vi.fn()} />);
    const relevant = screen.getByTestId("phone-inventory-relevant-now");
    expect(relevant).toHaveTextContent("Black Route Fuse");
    expect(relevant).toHaveTextContent("Cinder Suture Kit");
    expect(within(relevant).queryByText("Coffin Rig")).not.toBeInTheDocument();
    expect(relevant).toHaveTextContent(/battle roll/i);
  });

  it("omits the duplicate inventory context card and locks duplicate use submissions", () => {
    const onIntent = vi.fn();
    const base = createPatch();
    const patch = createPatch({
      requiredAction: {
        id: "qa:p7:battle",
        kind: "battle",
        actorSeatId: "seat-1",
        actorDisplayName: "Lane",
        requiredTab: "battle",
        label: "Battle",
        detail: "Roll against the active enemy.",
        canAct: true,
        waiting: false,
        privacy: "owner"
      },
      objectUseStates: (base.self?.character.heldGear ?? []).map((item) => ({
        source: "gear" as const,
        id: item.id,
        instanceId: item.instanceId,
        usedThisTurn: false,
        usedThisRound: false,
        remainingUses: 1,
        maxUses: 1,
        disabledReason: null,
        relevantNow: item.id === "black-route-fuse",
        relevanceKind: item.id === "black-route-fuse" ? "usable" as const : "inactive" as const,
        relevanceReason: null,
        currentContext: "Battle roll",
        activeModifier: null
      }))
    });
    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);
    expect(screen.queryByText(/inventory context/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /return to battle/i })).not.toBeInTheDocument();
    const use = screen.getByRole("button", { name: /use black route fuse/i });
    fireEvent.click(use);
    fireEvent.click(use);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();
  });

  it("confirms Trace the Promise and renders only the private authoritative reading", () => {
    const onIntent = vi.fn();
    const patch = createPatch({
      oathchainPrompt: { instanceId: "lens-a", contractId: "lens-contract", contractSignature: "sig-1", currentCharges: 2, maxCharges: 2, chargeCost: 1, preview: "Spend 1 charge to reveal current valid Contract targets." },
      activeOathchainReveal: { revealId: "reveal-1", contractId: "lens-contract", contractName: "Lens Contract", objectiveProgress: "0/1 resolved", revealedTargets: [{ kind: "sector", id: "votive-engine-room", sectorId: "votive-engine-room", label: "Votive Engine Room", detail: "Resolve the engine." }], expiresAtTurnEnd: true },
      self: { ...createPatch().self!, character: { ...createPatch().self!.character, heldGear: [traceLens], equippedGear: { weapon: null, armor: null, utility: "oathchain-lens" }, activeContract: { contractId: "lens-contract", progress: 0 } } }
    });
    render(<PhoneInventoryPanel patch={patch} onIntent={onIntent} />);
    fireEvent.click(screen.getByRole("button", { name: /preview trace the promise/i }));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm trace the promise/i }));
    expect(onIntent).toHaveBeenCalledWith({ type: "USE_GEAR", seatId: "seat-1", gearId: "oathchain-lens", instanceId: "lens-a", contractSignature: "sig-1" });
    expect(screen.getByLabelText(/private lens reading/i)).toHaveTextContent(/votive engine room/i);
    expect(screen.getByText(/until end of turn/i)).toBeInTheDocument();
  });

  it("promotes a blocking Scar comparison to the phone's primary scroll region", () => {
    const patch = createPatch({
      phase: "resolution",
      encounter: null,
      activeResolution: null,
      pendingScarChoice: {
        selectionId: "scar-choice:seat-1:mind",
        source: "mind",
        sourceCardId: "qa-mind-scar",
        currentCount: 0,
        thirdScarWarning: false,
        cards: [
          {
            id: "scar-wound-12",
            title: "Relay Ghost",
            text: "The relay follows you.",
            trigger: "Remote signal tests strain the operative.",
            penalty: "Remote Signal -1.",
            relief: "Return to a relay.",
            source: "mind",
            burdenText: "The first remote Signal test each round suffers -1.",
            adaptationText: "Inspect the next Blue Threat at a relay."
          },
          {
            id: "scar-wound-13",
            title: "Choir Static",
            text: "The chorus never quiets.",
            trigger: "Escalation strains the operative.",
            penalty: "The first Escalation advance inflicts 1 Wound.",
            relief: "Silence the chorus.",
            source: "mind",
            burdenText: "The first Escalation advance inflicts 1 Wound.",
            adaptationText: "Gain +1 Signal against an Escalation test."
          }
        ]
      }
    });

    render(
      <PortraitControllerView
        self={patch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={patch}
        patchSequence={4}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const shell = screen.getByRole("region", { name: /compare scar choices/i }).closest(".phone-portrait-controller");
    expect(shell).toHaveClass("phone-shell--scar-choice-active");
    expect(screen.getByLabelText("Phone content")).toHaveClass("phone-scar-choice-content");
    expect(screen.queryByRole("tablist", { name: /phone navigation/i })).not.toBeInTheDocument();
  });
});
