# Phase 4 Charged-Artifact Final Approval Sheet

## Locked architecture

Every charged Artifact uses an exact owned-item instance: a unique `instanceId` and mutable `currentCharges` live on that instance; `maxCharges`, `startingCharges`, and `chargeCost` live in the catalog definition. The server validates and atomically resolves the effect plus charge spend. Rejected, failed, stale, wrong-seat, wrong-target, and duplicate requests spend nothing. Zero-charge use is rejected. Serialization preserves current charges and never restores them. Copies track independently; sale, loss, or discard removes only the exact instance.

There is no automatic recharge. Round changes, reconnects, mission completion, shops, and event-log inference cannot refill charges. The phone never authorizes or calculates spending.

## 1. Confirmed scope

The ten corrected-audit IDs appear exactly once below: ten Artifacts, zero normal Equipment, no missing or duplicate entries. Unless an option explicitly changes it, proposed depletion is **retain owned but inert at zero** and recharge is **none**.

| ID / name | Authored effect | Charges max/start/cost | Timing and target | Proposed exact success effect | Invalid use / depleted | Required authority and phone prompt | Old-save compatibility | Complexity / power | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `artifact-ashen-route-compass` — Ashen Route Compass | Soften or reroll a failed movement/anomaly check | 2/2/1 | Reaction to exact pending movement or anomaly failure, before consequences; equipped | Reroll and accept the second result; final result owns consequence resolution | Reject without spend if no matching pending failure, stale, unequipped, or depleted | Persisted reaction ID and reroll action; phone states second result is mandatory | Migrate legacy `oncePerRound`; preserve existing charges without refill | 4 / 4 | Option approval needed |
| `artifact-choir-lantern` — Choir Lantern | After Signal/anomaly, record a warded route | 2/2/1 | After successful Signal test or resolved anomaly; equipped; choose adjacent route | Place one owner-linked ward that cancels the next hazard consequence on that route, then remove ward | Reject invalid/non-adjacent route or existing owner ward; inert at 0 | Typed route-ward state/action; route picker and confirmation | Map legacy `charges`; note history is not a ward | 4 / 3 | Option approval needed |
| `artifact-choir-static-censer` — Choir Static Censer | Reduce anomaly instability or steady a Scar trigger | 2/2/1 | Reaction before eligible anomaly or Scar consequences; equipped; explicit mode | Suppress one typed consequence from that pending event; result still counts | Reject after consequences or without suppressible consequence | Persisted consequence reaction and mode; phone lists exact consequence | Preserve legacy count; do not infer uses from notes | 5 / 4 | Option approval needed |
| `artifact-gate-saint-key` — Gate-Saint Key | Answer during final-confrontation bargaining | 1/1/1 | Final confrontation gate prompt; carried | Selected sanctified passage option defined in Part 3 | Reject outside prompt, stale target, or depleted | Typed confrontation option; rare-spend confirmation | Convert note-only acquisition into owned instance; never treat note as currency | 4 / 4 | Option approval needed |
| `artifact-heat-sink-prayer` — Scar-Sink Prayer | Steady after a space or Scar trigger; legacy text mentions Heat | 2/2/1 | Reaction before a Scar-trigger consequence; equipped | Suppress one Wound caused by that Scar trigger; trigger still counts | Reject non-Scar Wound, resolved consequence, or depleted | Pending Scar reaction; phone identifies protected consequence | Keep legacy ID `heat-sink-prayer`; migrate charges; never restore Heat mechanics | 4 / 3 | Option approval needed |
| `artifact-marrow-route-key` — Marrow Route Key | Failed-route recovery or final-gate leverage | 1/1/1 | Failed movement reaction or alternate-route prompt; carried | Selected dangerous reroute option defined in Part 3 | Reject after failure consequences or illegal reroute | Persisted movement reaction and authoritative alternative route | Stop acquisition from acting as spend; define `gateRelicsHeld` migration | 5 / 5 | Option approval needed |
| `artifact-oathchain-lens` — Oathchain Lens | Reveal the cost of a contract, oath, or bargain | 2/2/1 | Before accepting a displayed contract/bargain cost; equipped | Reveal the complete server-known cost/consequence, then allow confirm/cancel | Reject when no unresolved choice or hidden data is not defined | Persisted choice ID; private reveal followed by confirm/cancel | Preserve legacy count and +1 compatibility data; notes do not count as uses | 3 / 2 | Option approval needed |
| `artifact-rift-anchor-spike` — Rift Anchor Spike | Pin a shortcut/breach route | 2/2/1 | During movement planning; equipped; select eligible breach edge | Treat that one breach edge as stable for the owner’s current movement only | Reject if destination/route is otherwise illegal or changes before confirm | Movement-planner override token scoped to intent; route confirmation | Replace erroneous Veil Hook grant with owned spike; migration decision required | 5 / 5 | Option approval needed |
| `artifact-route-star` — Route Star | Record a safer route for the next breach-marked path | 2/2/1 | After completing movement over a breach-marked edge; equipped | Mark that edge; owner ignores its next hazard consequence, then mark clears | Reject non-breach edge, duplicate mark, or no completed movement | Typed owner/edge mark; phone selects eligible traversed edge | Preserve legacy count; notes are historical only | 4 / 3 | Option approval needed |
| `artifact-void-key` — Void Key | Claim passage through a gate, lock, or final approach | 1/1/1 | Movement confirmation where route is legal except one supported gate restriction; equipped | Recommended one-movement gate override in Part 2 | Reject all other illegality, stale route, insufficient distance, or depletion | Authoritative route/gate prompt with rare-spend confirmation | Migrate legacy one-charge gear without refill | 3 / 3 | First slice after approval |

## 2. Void Key decision

| Option | Exact behavior | Scope and route rules | Prompt, projections, and validation | Risk |
| --- | --- | --- | --- | --- |
| **A — Momentary Passage** | Spend 1 charge to override one supported gate restriction for the owner’s confirmed movement. | Owner only; destination and every route step must be legal except that gate; normal distance applies; gate does not remain open; no threat, scenario, blocker, or other lock bypass. | Prompt only on an otherwise-legal route. Revalidate route/version, active seat, item instance, charge, distance, and sole gate failure at confirm. Invalidated route cancels without spend. TV previews “Void passage” then reports passage; phone shows route, restriction, 1-charge warning, remaining 0/1. | 2 |
| B — Shared Aperture | As A, but all operatives may cross that gate until the current turn ends. | Party scope; distance still applies; temporary public gate state expires at turn end. | Requires public temporary gate instance and expiration. Invalid before initial confirmation spends nothing; later users need no charge. | 4 |
| C — Lock Claim | Spend 1 charge to permanently open one non-scenario lock. | Party scope and persistent board mutation; distance applies. Scenario/final locks excluded. | Requires persistent unlocked-edge ledger and save migration. | 5 |

**Recommendation: Option A — Momentary Passage.** It delivers the direct-key identity while preserving movement distance, scenario locks, threats, destination legality, and board permanence.

Recommended player-facing text: **“During movement, when your chosen route is legal except for one gate restriction, spend 1 charge to pass that gate for this movement only. You must still have enough movement, and this does not bypass threats, scenario locks, blockers, or any other route requirement.”**

Void Key:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per use: [UNAPPROVED]
- Final rule text: [UNAPPROVED]

## 3. Other gate relics

### Gate-Saint Key

| Option | Exact rule text | Charges / timing / scope | Server and phone | Risk |
| --- | --- | --- | --- | --- |
| **A — Saint’s Safe Conduct** | “When the party begins a final-confrontation gate test, spend 1 charge. The party automatically passes that gate test, but gains no bonus progress or reward from the test.” | 1/1, cost 1; before a typed final-gate test; party; no movement shortcut | Prompt attached to gate-test ID; revalidate scenario/stage. Phone warns that reward is forfeited; TV announces safe conduct. | 3 |
| B — Consecrated Retry | “After the party fails a final-confrontation gate test, before consequences, spend 1 charge to reroll it. Accept the second result.” | 1/1/1; failure reaction; party | Persist pending consequences and reroll; phone shows mandatory result. | 4 |
| C — Shield the Pilgrims | “After a final-gate test fails, spend 1 charge to prevent all Wounds from that failure. The failure and other consequences remain.” | 1/1/1; consequence reaction; party | Typed consequence filter; public prevention, private item count. | 3 |

**Recommendation: A — Saint’s Safe Conduct.** It is sanctified, safe, party-oriented passage and is clearly distinct from Void Key’s personal movement override.

Gate-Saint Key:
- Selected option: [UNAPPROVED]
- Maximum/starting charges: [UNAPPROVED]
- Cost per use: [UNAPPROVED]
- Final rule text: [UNAPPROVED]

### Marrow Route Key

| Option | Exact rule text | Charges / timing / route effect | Server and phone | Risk |
| --- | --- | --- | --- | --- |
| **A — Boneway Detour** | “After your movement test fails, before consequences, spend 1 charge and suffer 1 Wound to choose a server-offered adjacent legal destination. Move there and ignore the original movement-failure consequences.” | 1/1/1; owner reaction; dangerous alternative route; distance is replaced only by offered adjacent detour | Persist failure and offered destinations; revalidate destination and Wound legality. Phone warns Wound; TV reveals final move only. | 4 |
| B — Marrow Shortcut | “During movement, spend 1 charge and suffer 1 Wound to traverse one server-marked breach shortcut. All other route and distance rules apply.” | 1/1/1; owner planning; one approved shortcut edge | Movement planner supplies shortcut; route invalidation cancels. | 5 |
| C — Feed the Wrong Turn | “After a failed movement test, spend 1 charge to remain in place and ignore all failure consequences.” | 1/1/1; owner failure reaction; no reroute | Simplest pending-consequence suppression; private choice, public stay result. | 2 |

**Recommendation: A — Boneway Detour.** It preserves the dangerous wrong-turn identity, differs from Void Key’s gate passage, and avoids permanent topology changes.

Marrow Route Key:
- Selected option: [UNAPPROVED]
- Maximum/starting charges: [UNAPPROVED]
- Cost per use: [UNAPPROVED]
- Final rule text: [UNAPPROVED]

## 4. Remaining seven charged Artifacts

All options below retain finite charges, cost one charge, remain owned at zero, and never recharge.

### Ashen Route Compass — 2/2

- **A — Accepted Reroute (recommended):** “After you fail a movement or anomaly test, before consequences, spend 1 charge to reroll it. Accept the second result.” Uses persisted failure reaction; ready after approval.
- B — Soften the Route: spend 1 after such a failure to prevent one Wound from its consequences; failure remains. Lower complexity, weaker compass identity.
- C — True Bearing: before rolling, spend 1 for +2 Signal on that movement/anomaly test. Simpler but departs from authored failure timing.

Approval: Selected option [UNAPPROVED]; final text [UNAPPROVED].

### Choir Lantern — 2/2

- **A — Warded Route (recommended):** after a successful Signal test or resolved anomaly, spend 1 and select an adjacent route; cancel the next hazard consequence the owner would suffer while traversing it, then clear the ward.
- B — Choir Light: before an anomaly test, spend 1 for +2 Signal on that test.
- C — Shared Ward: as A, but the first party member receives it; requires public route state and has higher power.

Approval: Selected option [UNAPPROVED]; ward expiry [UNAPPROVED]; final text [UNAPPROVED].

### Choir Static Censer — 2/2

- **A — Static Intercession (recommended):** before consequences from an anomaly or Scar trigger, spend 1 to suppress one explicitly listed Wound consequence; the trigger/result still counts.
- B — Clear the Choir: after an anomaly test fails, spend 1 to reduce scenario pressure caused by that failure by 1; other consequences remain.
- C — Scar Silence: before a Scar trigger resolves, spend 1 to suppress all effects from that trigger once; high power.

Approval: Selected option [UNAPPROVED]; eligible consequence [UNAPPROVED]; final text [UNAPPROVED].

### Scar-Sink Prayer — 2/2

- **A — Admit the Fear (recommended):** before a Scar-trigger Wound resolves, spend 1 to prevent one Wound. The Scar still triggers. No Heat interaction.
- B — Cold Litany: after resolving a Scar trigger, spend 1 to heal one existing Wound; cannot pay for/prevent the triggering consequence.
- C — Shared Confession: prevent one Scar-trigger Wound to any operative in the same sector; higher targeting/privacy complexity.

Approval: Selected option [UNAPPROVED]; final text [UNAPPROVED]. Legacy ID remains compatibility-only.

### Oathchain Lens — 2/2

- **A — Price Before Promise (recommended):** before confirming a contract or authored bargain, spend 1 to reveal all server-defined immediate costs and failure consequences; then confirm or cancel. It does not alter the result.
- B — Renegotiate: after seeing a contract, spend 1 to replace it with the next available contract; changes contract economy.
- C — Bind the Cost: before a bargain test, spend 1 for +2 Command; mechanically clear but less distinctive.

Approval: Selected option [UNAPPROVED]; typed bargain scope [UNAPPROVED]; final text [UNAPPROVED].

### Rift Anchor Spike — 2/2

- **A — Pin the Breach (recommended):** during movement planning, spend 1 to stabilize one server-marked breach edge for this owner’s current movement; other distance and legality rules remain.
- B — Hold the Shortcut: after traversing a breach edge, spend 1 to keep it available to the next operative this round; creates public temporary topology.
- C — Refuse Displacement: when a route effect would move the owner involuntarily, spend 1 to remain in place; narrower but safer.

Approval: Selected option [UNAPPROVED]; eligible breach predicate [UNAPPROVED]; final text [UNAPPROVED].

### Route Star — 2/2

- **A — Remembered Safe Path (recommended):** after completing movement over a breach-marked edge, spend 1 to mark it for the owner; ignore the next hazard consequence suffered on that edge, then clear the mark.
- B — Least-Hungry Road: before confirming movement, spend 1 to let the server choose and display the lowest-danger legal route to the same destination; no legality override.
- C — Star Correction: after a movement hazard fails, spend 1 to reduce one Wound consequence by 1; failure remains.

Approval: Selected option [UNAPPROVED]; mark expiry [UNAPPROVED]; final text [UNAPPROVED].

Implementation readiness after recommendations: Void Key and Ashen Route Compass are closest, but **zero canonical items are approved for implementation** until their approval blocks are completed.

## 5. Phone and TV contract

Phone must show `Charges X/Y`, exact cost, timing, target, depleted/no-recharge copy, and an authoritative disabled reason. Use appears only in an eligible server-projected window. Rare gate spending requires a confirmation naming the route/gate and the permanent loss of the charge. Artwork/lore inspection remains separate. After server confirmation the patch immediately updates the count; pending submission may be visually disabled, but the server remains the duplicate-use guard.

TV shows only concise committed public results and an existing route/gate preview where relevant. It does not reveal private inventory counts, hidden alternatives, pending failure details, or declined prompts. No new broad focus mode is proposed.

## 6. Implementation grouping

| Phase | Items | Likely files and authority | Schema/state and phone | Required tests / migration risk |
| --- | --- | --- | --- | --- |
| **4A** | Void Key | Gear/artifact definitions, schemas, actions/reducer, `roomServer`, movement planner/gate prompt, inventory projection/panel | Charged definition fields, exact owned `currentCharges`, one-movement gate override; rare-spend confirmation | Acquisition, legal-except-gate predicate, distance, stale route, atomic spend, zero, reconnect, duplicates. Risk: legacy `charges` and route authority. |
| **4B** | Gate-Saint Key, Marrow Route Key | Artifact ownership migration, confrontation/movement reactions, scenario projection | Owned instances replacing notes/immediate spend; gate-test or failure prompt | Gate prompt identity, party/private boundaries, `gateRelicsHeld` semantics, old saves. Highest migration risk. |
| **4C** | Ashen Route Compass; after approval, Oathchain Lens | Failure/choice reaction infrastructure, typed effects, phone prompts | Accepted reroll and revealed-cost choice; exact counts | Consequence delay, mandatory reroll, confirm/cancel, replay/reconnect. Moderate risk. |
| **4D** | Choir Lantern, Choir Static Censer, Scar-Sink Prayer, Rift Anchor Spike, Route Star | Route/Scar/anomaly typed state and planner integration | Ward/mark/consequence target state and specialized prompts | Expiry, ownership, public/private route state, consequence ordering. High design and state risk. |

Every phase also requires schema validation for positive and bounded charge fields, incompatible model rejection, exact-instance serialization, no-refill lifecycle tests, phone display tests, and full passive/consumable/reaction/exhaust/mission/tier regressions.

## Final unresolved approvals

- Select one option and final text for all ten Artifacts.
- Confirm max/start/cost values (recommend authored 2/2/1 or 1/1/1 throughout).
- Confirm retain-inert depletion for every item.
- Define `gateRelicsHeld` as lifetime acquisition, currently owned relics, or unspent gate charges before Gate-Saint/Marrow work.
- Approve typed meanings and expiry for warded routes, breach edges, Scar/anomaly consequence suppression, oaths, and bargains.

No mechanics, content, schema, UI, tests, validation, movement, mission lifecycle, or tier behavior is changed by this approval sheet.
