# Item Effect Phase 4: Charged-Item Implementation Plan

## Executive summary and scope confirmation

The corrected 60-item audit contains exactly ten Charged activation rows. All ten are Artifacts; no canonical normal Equipment is classified as charged. Each ID below occurs once in the audit and once in this plan. There are no missing or duplicate charged rows.

The existing runtime is only a partial foundation: `GearItem.charges` is mutable authoritative state, `USE_GEAR` rejects zero and decrements after an effect, reconnect projects the stored count, and the phone displays it. It does not separate definition maximum/starting values from owned current state, consistently identify exact instances, type most effects or timing windows, define recharge, or give gate relics a real spend path. Artifact-card `charge` is acquisition metadata and must not be treated as owned current state.

This is a planning document. Phase 4 should not begin until the blockers marked **Design gate** have approved mechanical outcomes.

## Charged-item inventory

All activations below cost one charge. “None” under recharge means the authored charges are finite for the ownership lifetime; it does not mean round refresh.

| Artifact ID / display name | Authored effect and timing | Charges (max/start/cost) | Equipped / target | Recharge / depleted | Existing support and compatibility metadata | Ambiguity or blocker |
| --- | --- | --- | --- | --- | --- | --- |
| `artifact-ashen-route-compass` — Ashen Route Compass | Card says to soften movement/anomaly failures; granted gear says reroll a failed movement or anomaly check. Reaction after failure, before consequences. | 2 / 2 / 1 | Yes; exact pending movement or anomaly test | None; inert and retained at 0 | Grants `ashen-route-compass`; gear is currently `oncePerRound`, not charged, and has +1 Signal compatibility data. | **Design gate:** approve “soften failure” versus mandatory accepted reroll and failure-consequence ordering. Reclassify content from exhaust-like metadata only after approval. |
| `artifact-choir-lantern` — Choir Lantern | After a Signal check or anomaly reveal, record a warded-route note. | 2 / 2 / 1 | Yes; completed Signal test or revealed anomaly | None; inert and retained at 0 | Grants same-ID charged gear; current server effect only adds a note. | **Design gate:** a note has no typed mechanical benefit, duration, owner, or spend rule. Define the warded route outcome. |
| `artifact-choir-static-censer` — Choir Static Censer | After a Signal check, either reduce anomaly instability by 1 or steady one Scar trigger. | 2 / 2 / 1 | Yes; pending/recent eligible anomaly or Scar trigger; explicit mode/target | None; inert and retained at 0 | Grants same-ID charged gear; generic zero/decrement works, but no ID-specific typed effect exists. Legacy wording and generic fallback can record a note only. | **Design gate:** define “anomaly instability” in existing typed state and “steady” as a concrete Scar consequence operation. |
| `artifact-gate-saint-key` — Gate-Saint Key | “May answer” during final confrontation bargaining. | 1 / 1 / 1 | Carried; active final-confrontation gate/bargain choice | None; recommend retained as depleted proof unless approved rule consumes it | Artifact currently grants only a private note; no owned item, action, or spend path. | **Design gate:** exact gate option, state transition, success/failure, and whether the depleted key remains owned are undefined. |
| `artifact-heat-sink-prayer` — **Scar-Sink Prayer** (legacy ID retained) | Gear says after resolving a space or Scar trigger, steady the operative and record a route note; old card text says it drinks Heat. | 2 / 2 / 1 | Yes; exact resolved space/Scar trigger | None; inert and retained at 0 | Grants `heat-sink-prayer` charged gear. ID is compatibility-only; canonical gear display is Scar-Sink Prayer. Generic use records a note. | **Design gate:** remove legacy Heat meaning and define “steady” and the route note mechanically. Never introduce Heat spending/reduction. |
| `artifact-marrow-route-key` — Marrow Route Key | Helpful for failed-route recovery and final-gate bargaining; acquisition currently advances `gateRelicsHeld`. | 1 / 1 / 1 | Carried; either pending failed movement before consequences or explicit final-gate option | None; recommend retained depleted | No owned object: acquisition immediately writes a note and advances scenario progress. | **Design gate:** choose failed-route recovery, gate leverage, or a typed player choice between them. Decide whether `gateRelicsHeld` means acquired or currently unspent; acquisition must not spend the charge. |
| `artifact-oathchain-lens` — Oathchain Lens | After a contract, oath, or bargain check, record the revealed cost. | 2 / 2 / 1 | Yes; exact eligible check/contract transition | None; inert and retained at 0 | Grants same-ID charged gear; generic server effect records a note; +1 Command remains compatibility stat data. | **Design gate:** define the benefit obtained from revealing/recording a cost and map “oath” and “bargain” to typed events. |
| `artifact-rift-anchor-spike` — Rift Anchor Spike | Steady a shortcut or pin a breach route during movement. | 2 / 2 / 1 | Yes if represented as utility; selected legal shortcut/breach route | None; inert and retained at 0 | Artifact incorrectly grants normal `veil-hook` plus a note; no owned spike or charge state. | **Design gate:** define whether it adds a temporary legal edge, prevents a route consequence, or leaves public board memory; movement legality must remain in the authoritative planner. |
| `artifact-route-star` — Route Star | After movement, record a safer route through the next breach-marked path. | 2 / 2 / 1 | Yes; owner’s completed movement plus a selected/derived breach-marked route | None; inert and retained at 0 | Grants same-ID charged gear; current effect is note-only. | **Design gate:** define the next-route benefit, expiry, ownership, and exact breach predicate. Do not let the phone invent a route. |
| `artifact-void-key` — Void Key | At a gate, lock, or final-approach space, claim a route through it. | 1 / 1 / 1 | Yes under current utility model; active typed gate/lock/final-approach target | None; inert and retained at 0 | Grants same-ID one-charge gear; generic use records a note. Current zero/decrement and phone display are partial support. | **Design gate:** define the authoritative override (unlock, bypass test, satisfy requirement, or scenario option) and depleted retention. Recommended first implementation after that rule is approved. |

Count check: 10 planned rows = 10 unique charged audit rows; Equipment 0, Artifact 10.

## Persistent owned-instance model

Use definition data and owned state separately:

```ts
// Catalog definition
effectModel: "charged"
maxCharges: number
startingCharges: number
chargeCost: number
activationTiming: ChargedActivationTiming[]
chargedEffect: TypedChargedEffect
requiresEquipped: boolean
depletedBehavior: "retain-inert" | "discard"
rechargeRule: { type: "none" } | TypedRechargeRule

// Exact owned Gear/Artifact instance
instanceId: string
currentCharges: number
```

Do not copy mutable `charges` from `ArtifactCard.charge`. Acquisition resolves the card into an exact owned instance, initializes `currentCharges` from the definition once, and stores the stable `instanceId`. `maxCharges` and `startingCharges` are definitions; only `currentCharges` changes in play. During save migration, legacy owned gear with `charges` maps that value to `currentCharges`, clamps it to the definition maximum, and receives a stable instance ID. Catalog ID fallback may read old saves, but new activations must address an instance.

Rules:

- Validate authenticated seat, exact ownership, equipped requirement, timing, target, effect feasibility, and `currentCharges >= chargeCost` before resolution.
- Apply the effect and charge spend atomically. Rejection or cancellation spends nothing. A replay sees the updated count or missing reaction and rejects.
- Never infer current charges from event history, the Artifact card, or phone state.
- Reconnect serializes and projects `instanceId`, current, and maximum. It never initializes an already-owned item again.
- Duplicate copies receive different instance IDs and independent counters.
- Sale, discard, loss, or replacement removes that instance and its counter. A later copy starts fresh.
- Zero charges means unusable and retained unless that definition explicitly says discard. None of the ten should be discarded without a separate approval.

## Charge lifecycle and recharge decisions

No authored row defines a recharge operation. Therefore the safe Phase 4 default for all ten is `rechargeRule: { type: "none" }`. Charges do not refresh by turn, round, encounter, reconnect, mission completion, or shop visit.

Do not add a generic recharge service speculatively. If later design approves recharge, it needs a typed server action with instance target, amount, cap, eligibility, price/source, and public/private projection. Candidate future boundaries are relic-dealer service, mission completion, or an explicitly authored scenario event, but none is approved now.

## Gate relic implementation plan

The gate set is Gate-Saint Key, Marrow Route Key, and Void Key. Rift Anchor Spike is route-related but is not currently a `gateRelic`; keep it in the movement/route design track.

| Gate relic | Intended activation point | Required authoritative state/action | Spend and rejection | Projection |
| --- | --- | --- | --- | --- |
| Gate-Saint Key | A final-confrontation bargaining prompt | Add a typed gate option to the active confrontation; server action includes reaction/prompt ID and exact item instance | Spend one only when the chosen gate option commits. Reject wrong scenario/stage, stale prompt, wrong seat, missing instance, zero charge, or unsatisfied target. | Public: concise gate option resolved and resulting board/scenario change. Private: exact item and remaining charge. Hide unrevealed choices. |
| Marrow Route Key | Design must choose a pending failed-route reaction, final-gate option, or explicit two-mode choice | Persist either a failure reaction ID with pending consequences or a gate prompt ID; stop acquisition from auto-spending/auto-advancing the use effect | Spend one after selected recovery/gate effect commits. Reject after consequences, against unrelated movement, or after `gateRelicsHeld` state no longer matches. | Route recovery may be private until movement resolves; gate/scenario progress is public. Remaining charge is owner-private. |
| Void Key | Typed gate, lock, or final-approach interaction | Extend the relevant server-owned sector/scenario prompt with an eligible key action; movement planner remains authoritative if a route changes | Spend one only when unlock/bypass commits. Reject ordinary sectors, already-open targets, illegal destinations, stale prompts, or depleted instances. | Unlock/route/scenario change is public; inventory counter is private. |

`gateRelicsHeld` needs an explicit semantic decision before implementation: lifetime acquisitions, currently owned gate relics, or unspent gate charges. It must not be incremented on acquisition and later treated as spendable without a matching decrement and instance ledger.

## Server actions and atomic ordering

Extend the typed item-use intent rather than creating client-specific paths:

1. Phone sends `USE_GEAR`/`USE_ARTIFACT` with `instanceId`, typed effect/mode, target or pending-reaction ID.
2. Server loads the catalog definition and exact owned instance; the client cannot select the effect implementation.
3. Server validates seat, ownership, equipment, timing, context, target, charge count, and effect feasibility.
4. Reducer atomically applies the typed effect and subtracts exactly `chargeCost` from that instance.
5. Server projects the result, remaining charges, and a public-safe log entry.

Reaction items need persisted pending windows, following Blackstar/Mirror’s ID-bound model. Route and gate items need authoritative prompt/route IDs. Note text may accompany a real result but can never be the result or spendable state.

## Phone requirements

- Show `Charges X/Y`, not “uses,” and never show Ready/Exhausted for a purely charged item.
- Show activation timing, depleted behavior, and recharge copy (`No recharge` for this scope).
- Show Use only in an eligible authoritative window; otherwise show the server-projected reason, including equipped requirement, wrong timing/target, no pending reaction, or zero charges.
- At zero show `Depleted — 0/Y charges` and keep inspection available.
- Keep artwork/lore inspection separate from activation.
- For multiple modes or targets, require an explicit selection and show the effect before confirmation.
- Update the card immediately from the server patch after success. Disable the submitted control while awaiting the response so a stale double tap cannot look accepted, while still relying on server rejection for safety.
- Never expose private route choices, pending failure details, or unrevealed gate options on TV. Public effects may appear only after commitment.

## Required tests

### Schema and acquisition

- Charged definitions require positive max/start/cost, start no higher than max, typed timing/effect, equipped declaration, depleted behavior, and recharge rule.
- Reject charged+consumable, charged+exhaust, unsupported recharge/cost, and normal Equipment using Artifact-only effects.
- Each approved Artifact acquisition creates one exact instance at its starting count without activating it; legacy `charges` migrates without refill.

### Authority, duplicate safety, and persistence

- Owner succeeds only in the valid window and against a valid target; wrong seat, stale instance/reaction, invalid target/timing, unequipped state, and zero charges reject without spending.
- Effect resolves once and exactly one instance loses exactly the declared charge cost.
- Duplicate/replayed intents cannot resolve or spend twice.
- Current count survives serialization/reconnect; reconnect never restores spent charges.
- Stale phone controls cannot use a depleted item.
- Two copies initialize and spend independently; sale/loss removes only the targeted instance.

### Lifecycle and projection

- Turn, round, battle, encounter, reconnect, and mission completion do not recharge any of these ten.
- Phone shows exact X/Y and authoritative reasons; TV receives only public-safe committed outcomes.
- Gate relic tests cover eligible prompt, committed state change, charge spend, already-open/stale rejection, and public/private projection.
- Regression suites retain Phase 1 passives, Phase 2 consumables, Blackstar/Mirror reactions, Phase 3 exhaustion, mission lifecycle, movement legality, shop rules, and tier separation.

## Recommended implementation sequence

1. **Phase 4A — state foundation:** add definition/current separation, exact-instance migration, atomic spend helper, projection, validation, and synthetic test-only charged effect. Do not migrate ambiguous canonical effects yet.
2. **Phase 4B — Void Key vertical slice:** after its exact gate override and depleted behavior are approved, implement one-charge acquisition, gate prompt, spend, reconnect, and UI end to end.
3. **Phase 4C — reaction relic:** approve and implement Ashen Route Compass using persisted failure-reaction infrastructure.
4. **Phase 4D — typed route/ward relics:** Choir Lantern, Choir Static Censer, Scar-Sink Prayer, Oathchain Lens, and Route Star only after each note phrase has a concrete typed effect.
5. **Phase 4E — ownership reconstruction:** Gate-Saint Key, Marrow Route Key, and Rift Anchor Spike need owned-object migrations and scenario/movement design approvals before mechanics.

## Approval blockers

No canonical charged item is fully specification-ready. Void Key is the best first vertical slice, but still needs its exact gate/lock outcome and depleted retention approved. The other blockers are authored-effect ambiguity, note-only effects, missing pending-event semantics, or incorrect acquisition identity. Phase 4 must not turn those phrases into mechanics by inference.

No balance changes are recommended here. Existing passive, consumable, reaction, exhaust, mission lifecycle, shop, movement, and Equipment/Artifact tier behavior remain outside this plan.
