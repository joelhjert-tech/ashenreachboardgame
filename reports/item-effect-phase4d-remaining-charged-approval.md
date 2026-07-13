# Phase 4D: Remaining Charged Artifacts — Final Approval Sheet

## Executive summary

The corrected charged scope contains ten unique canonical Artifacts and zero normal Equipment. Four are sealed implementations; six remain design-gated. This report defines precise options for those six without changing content, schema, engine, UI, validation, tests, movement, or server projections.

All proposed rules preserve the sealed charged architecture: stable exact owned-instance IDs, persistent `currentCharges`, catalog maximum/starting values, atomic effect plus charge spending, no automatic recharge, server authority, reconnect persistence, independent duplicate copies, zero-charge rejection, and no spend on stale, wrong-seat, invalid, cancelled, or duplicate requests.

## 1. Confirmed ten-item scope

| Charged Artifact ID | Display name | Status |
| --- | --- | --- |
| `artifact-void-key` | Void Key | Implemented — Phase 4A (`6e929fa`) |
| `artifact-ashen-route-compass` | Ashen Route Compass | Implemented — Phase 4B (`7af2efb`) |
| `artifact-gate-saint-key` | Gate-Saint Key | Implemented — Phase 4C (`6af2489`) |
| `artifact-marrow-route-key` | Marrow Route Key | Implemented — Phase 4C (`6af2489`) |
| `artifact-choir-lantern` | Choir Lantern | Remaining |
| `artifact-choir-static-censer` | Choir Static Censer | Remaining |
| `artifact-heat-sink-prayer` | Scar-Sink Prayer | Remaining; legacy card ID/title compatibility |
| `artifact-oathchain-lens` | Oathchain Lens | Remaining |
| `artifact-rift-anchor-spike` | Rift Anchor Spike | Remaining |
| `artifact-route-star` | Route Star | Remaining |

Count check: ten IDs, ten unique rows, four implemented, six remaining, zero charged normal Equipment. No implemented Artifact is included in the remaining implementation groups.

## 2. Locked Phase 4D architecture

Every approved item must:

- create an exact owned instance with a stable `instanceId` and catalog-derived starting charges;
- store mutable `currentCharges` on that instance rather than on the catalog ID or event history;
- validate the authenticated seat, ownership, equipped requirement, timing, context, target, effect feasibility, and charge count on the server;
- apply the typed effect and subtract its charge atomically;
- spend nothing on rejection, cancellation, stale state, wrong seat, wrong target, or duplicate intent;
- remain owned but inert at zero charges unless a later approval explicitly changes depletion;
- preserve spent charges through serialization and reconnect;
- track duplicate copies independently;
- never refresh on turn, round, encounter, battle, reconnect, mission completion, shop visit, or scenario transition.

The default for all six is `maxCharges: 2`, `startingCharges: 2`, `chargeCost: 1`, `rechargeRule: none`, `requiresEquipped: true`, and depleted behavior **retain inert at zero**. An option may change those values only through its approval block.

## 3. Remaining Artifact decisions

### Choir Lantern (`artifact-choir-lantern`)

**Authored identity:** a cold ward-lantern. Its gear currently says, “Spend 1 charge after a Signal check or anomaly reveal to record a warded route note.” The note has no typed duration, target, owner, spend path, or mechanical outcome.

**Compatibility fields:** card `charge: 2`; gear `category: chargedRelic`, `useLimit: charge`, legacy `charges: 2`, `+1 Signal` stat metadata, Artifact tier, relic-dealer shop category. No typed charged effect exists.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Choir Light (recommended)** | “Before you roll a Signal test for an anomaly, spend 1 charge to add +2 Signal to that test.” | Timing: before the exact server-owned anomaly test roll. Owner and exact equipped instance only. Server adds one typed temporary modifier to that test. Invalid timing, non-Signal test, stale test, zero charges, or duplicate intent rejects without spend. Result is public only through ordinary test math; item and remaining charges stay private. No persistent state beyond the active test. | 2 / 2 |
| B — Warded Passage | “After you pass a Signal test for an anomaly, spend 1 charge to ward your next movement. Ignore the first Wound caused by a movement hazard before your next turn, then remove the ward.” | Requires a persistent owner-private ward with source instance and expiry. The server consumes it only against an eligible pending movement-hazard Wound. It does not cancel failure or other consequences. | 4 / 3 |
| C — Shared Choir Ward | “After you pass a Signal test for an anomaly, spend 1 charge. The next allied operative to suffer a movement-hazard Wound this round prevents 1 of those Wounds.” | Requires public party ward, round expiry, eligible-consequence matching, and first-user consumption. Higher coordination power. | 5 / 4 |

**Proposed operational values:** 2/2, cost 1, before anomaly Signal roll, equipped. At zero: retained as `Depleted — 0/2`, inspection available, no Use action. Old saves migrate legacy `charges` once without refill.

**Phone prompt:** “Use Choir Lantern? Spend 1 charge for +2 Signal on this anomaly test.” Show test identity, 1-charge cost, X/2 remaining, confirm/cancel, and authoritative disabled reason.

**TV result:** ordinary public battle/check breakdown may name `Choir Lantern +2`; do not show private inventory count or declined prompt.

Choir Lantern:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

### Choir Static Censer (`artifact-choir-static-censer`)

**Authored identity:** a wired censer used after Signal pressure to reduce “anomaly instability” or “steady” a Scar trigger. Neither phrase maps to one existing typed resource or consequence.

**Compatibility fields:** card `charge: 2`; gear `category: chargedRelic`, `useLimit: charge`, `charges: 2`, `+1 Signal` compatibility metadata, relic-dealer/medicae-shrine categories. Generic use can only record a note.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Static Intercession (recommended)** | “Reaction — Before Wounds from a failed Signal anomaly test resolve, spend 1 charge to prevent 1 of those Wounds. The test still counts as failed and all other consequences resolve.” | Reuse the persisted pending-failure/consequence window. Bind reaction ID, owner, test, pending Wound delta, and exact instance. Reject after consequences, against non-Signal/non-anomaly failures, or when no Wound is pending. Public result may show one prevented Wound; details/count stay private. | 3 / 2 |
| B — Censer Grounding | “Before you roll a Signal test for an anomaly, spend 1 charge to add +2 Signal to that test. If it still fails, accept the result.” | Reuses active-test modifier path; no reaction persistence. Mechanically overlaps Choir Lantern and weakens item distinction. | 2 / 3 |
| C — Scar Silence | “Reaction — Before an equipped Scar trigger resolves, spend 1 charge to suppress that trigger’s effects once. The Scar remains equipped.” | Requires a typed pending Scar trigger and suppressible consequence set. High power and broader interaction surface. | 5 / 5 |

**Phone prompt:** reaction prompt names the pending canonical consequence; no vague instability meter. **TV:** only committed public prevention. **Migration:** legacy `charges` maps to current count once.

Choir Static Censer:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

### Scar-Sink Prayer (`artifact-heat-sink-prayer`)

**Authored identity:** a dangerous cold prayer wheel. The canonical gear display name is **Scar-Sink Prayer**. The legacy Artifact ID and old “drinks Heat” card text are compatibility data only and must not define player-facing activation mechanics.

**Compatibility fields:** card ID/title retain `artifact-heat-sink-prayer` / `Heat-Sink Prayer`; card `charge: 2`; gear ID `heat-sink-prayer`, display `Scar-Sink Prayer`, `useLimit: charge`, `charges: 2`, `+1 Signal` compatibility metadata, relic-dealer/medicae-shrine categories. Current route note has no typed value.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Admit the Fear (recommended)** | “Reaction — Before an equipped Scar trigger causes you to suffer Wounds, spend 1 charge to prevent 1 of those Wounds. The Scar still triggers and all other effects resolve.” | Pending Scar trigger must identify the owning operative and Wound delta. Prevent exactly one, never below zero. Reject without a matching pending Scar Wound. Owner-private prompt; public Wound prevention only when ordinarily visible. | 3 / 2 |
| B — Cold Litany | “After you finish resolving an equipped Scar trigger, spend 1 charge to heal 1 existing Wound.” | Activation follows complete Scar resolution and cannot pay for or prevent its pending cost. Reject at zero existing Wounds. Simpler ordering but may erase the trigger’s cost immediately. | 3 / 3 |
| C — Shared Confession | “Reaction — Before an allied operative in your sector suffers Wounds from a Scar trigger, spend 1 charge to prevent 1 of those Wounds.” | Requires allied target selection, same-sector revalidation, privacy-safe prompt routing, and exact consequence ownership. | 5 / 4 |

No option uses Heat, Scars as currency, scenario pressure, undefined instability, or automatic recharge.

Scar-Sink Prayer:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

### Oathchain Lens (`artifact-oathchain-lens`)

**Authored identity:** shows the cost of a promise before it is made. Current gear says to spend after a contract, oath, or bargain check merely to record the cost.

**Compatibility fields:** Artifact card `charge: 2`, `artifactKind: factionRelic`; gear `category: chargedRelic`, `useLimit: charge`, `charges: 2`, `+1 Command` compatibility metadata, relic-dealer category. “Oath” and “bargain” are not generic typed events.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Bind the Cost (recommended)** | “Before you roll a Command test for a contract or server-authored bargain, spend 1 charge to add +2 Command to that test.” | Server must classify the active check as contract/bargain and Command. One test-scoped modifier; reject all other checks and stale rolls. Public math may name the Lens; prompt/count remain private. | 2 / 2 |
| B — Price Before Promise | “Before confirming a contract or server-authored bargain, spend 1 charge to reveal its immediate server-defined costs and failure consequences. You may then confirm or cancel.” | Requires complete structured preview data and a persisted confirmable offer ID. Cancellation after reveal spends the charge because information was delivered. No hidden future/random outcomes may be exposed. | 4 / 3 |
| C — Renegotiate | “When offered a contract, spend 1 charge to replace it with the next server-provided contract. You must accept the new offer or decline the contract action.” | Mutates contract offer economy and needs deterministic replacement/decline semantics. | 4 / 4 |

Oathchain Lens:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

### Rift Anchor Spike (`artifact-rift-anchor-spike`)

**Authored identity:** pins an impossible shortcut or breach route briefly. Acquisition currently grants ordinary `veil-hook` gear plus a note, so Artifact ownership and identity are not preserved.

**Compatibility fields:** card `charge: 2`, `artifactKind: chargedRelic`; sequence grants `veil-hook` and note. There is no canonical spike gear definition, owned charge state, typed effect, or server prompt.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Refuse Displacement (recommended)** | “Reaction — When a route or anomaly effect would move you to another sector, spend 1 charge to remain in your current sector. All other effects resolve.” | Pending forced-movement consequence must contain source, from/to sectors, and other consequences. Reject after movement, voluntary movement, or scenario-mandated transitions. Public result shows the operative held position. | 4 / 3 |
| B — Pin the Breach | “During movement planning, spend 1 charge to traverse one server-marked breach edge for this movement. Movement distance and all other route and destination rules still apply.” | Requires an authored `breach` edge predicate and planner support. Cannot invent edges client-side or bypass gates/locks/threats. | 5 / 4 |
| C — Hold the Shortcut | “After traversing a server-marked breach edge, spend 1 charge to keep that edge available to the next allied operative until the round ends.” | Requires public temporary topology, next-user consumption, round expiry, and route-version handling. | 5 / 5 |

**Migration blocker:** replace the current `veil-hook` grant only through an approved content migration that preserves old saves and creates an exact Spike instance without duplicating prior rewards.

Rift Anchor Spike:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

### Route Star (`artifact-route-star`)

**Authored identity:** points toward the route least hungry for blood. Current gear spends after movement to record a safer route through the next breach-marked path, but the mark, expiry, owner, and benefit are undefined.

**Compatibility fields:** card `charge: 2`; gear `category: chargedRelic`, `useLimit: charge`, `charges: 2`, `+1 Guile` compatibility metadata, relic-dealer category. No typed route-star effect.

| Option | Exact player-facing rule | Authority and failure behavior | Complexity / risk |
| --- | --- | --- | --- |
| **A — Least-Hungry Road (recommended)** | “After selecting a legal destination, spend 1 charge to have the server select and display the legal route to that destination with the fewest visible threat icons. Confirm that route or cancel movement selection. This does not change movement distance or make an illegal destination legal.” | Planner ranks already-legal routes using public visible threat data and deterministic tie-breaking. Spend only when the route recommendation is committed for the current movement; stale destination cancels without spend. No hidden information is revealed. | 3 / 2 |
| B — Remembered Safe Path | “After completing movement over a breach-marked edge, spend 1 charge to mark that edge for yourself. Prevent the first Wound caused by a movement hazard on that edge before your next turn, then clear the mark.” | Requires owner-private persistent route mark, expiry, edge identity, and pending hazard consequence matching. | 5 / 3 |
| C — Star Correction | “Reaction — Before Wounds from a failed movement hazard resolve, spend 1 charge to prevent 1 of those Wounds. The test still counts as failed.” | Reuses pending movement-failure infrastructure but overlaps Censer/Prayer prevention identity. | 3 / 2 |

Route Star:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## 4. Shared phone, TV, migration, and depletion contract

Phone inventory shows `Charges X/2`, activation timing, one-charge cost, `No recharge`, and `Depleted — 0/2 charges`. Use appears only in an eligible authoritative window. Disabled copy comes from server-projected eligibility. Artwork/lore inspection remains separate. Multiple modes or targets require explicit selection and confirmation.

TV displays only committed public-safe outcomes through existing check, route, consequence, or result presentation. It never displays private inventory counts, unchosen options, hidden targets, or failure details outside the public projection.

Legacy gear `charges` migrates to `currentCharges` once, clamped to the approved maximum, with a stable exact instance ID. Missing state initializes only for a genuinely unmigrated owned item. Reconnect cannot repeat initialization. The Rift Anchor Spike additionally needs an explicit ownership migration because it currently grants `veil-hook` rather than an owned Spike.

## 5. Recommended implementation grouping

### Phase 4D1 — one simplest non-gate vertical slice

- **Choir Lantern, Option A — Choir Light**

Why: one active anomaly Signal test, one exact equipped instance, one charge, and one test-scoped modifier. It needs no pending reaction window, no player target, no persistent route state, no topology change, and no second resource cost. It is mechanically distinct from all four movement/gate charged Artifacts and provides the cleanest generic charged-action proof.

Likely implementation surface: Choir Lantern definitions, typed charged-effect enum, existing test modifier resolution, item-use server path, owner phone prompt, public check modifier source, migration and focused tests.

### Phase 4D2 — reuse existing test/battle/reaction infrastructure

- Choir Static Censer — preferably Option A
- Scar-Sink Prayer — preferably Option A
- Oathchain Lens — preferably Option A

These reuse active test modifiers or persisted pending-consequence windows. Each still needs its exact option approved before implementation.

### Phase 4D3 — new targeting or persistent state

- Route Star — Option A needs deterministic multi-route recommendation and commit state; Option B needs a persistent edge mark.
- Rift Anchor Spike — all viable options need forced-movement consequence targeting, authored breach edges, or public temporary topology plus an ownership migration.

### Phase 4D4 — blocked/redesign-dependent

- Rift Anchor Spike remains blocked until its option and `veil-hook` compatibility migration are approved.
- Any Choir Lantern/Route Star “warded route” option remains blocked until route-mark ownership and expiry are approved.
- Any Censer/Prayer full Scar suppression remains blocked until a typed pending Scar-trigger model exists.

Only one Artifact is recommended for the next implementation commit: **Choir Lantern, Option A — Choir Light**.

## 6. Approval and readiness summary

Exact six remaining IDs:

1. `artifact-choir-lantern`
2. `artifact-choir-static-censer`
3. `artifact-heat-sink-prayer`
4. `artifact-oathchain-lens`
5. `artifact-rift-anchor-spike`
6. `artifact-route-star`

- Recommended next vertical slice: `artifact-choir-lantern`, Option A — Choir Light.
- Ready for implementation after one explicit option approval: 1.
- Needing final option/rule decisions: 5 additional items (all six approval blocks remain formally unapproved).
- Blocked by ownership migration or undefined authored subsystem: 1, Rift Anchor Spike.
- Highest-risk item: Rift Anchor Spike, because current acquisition loses Artifact identity and route/topology options require new authoritative state.

No mechanics, content, schema, engine, UI, validation, test, mission, movement, or existing charged-Artifact behavior is changed by this report.
