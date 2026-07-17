# Salvage payment and encounter-choice architecture

Status: **recommended for Phase 1I, pending user approval**. This report changes no mechanics.

## Existing-system audit

| Existing system | Pending state | Owner/seat validation | Affordability | Atomic deduction | Alternatives | Reconnect safe | Suitable |
|---|---|---|---|---|---|---|---|
| Shop purchase | Shop encounter/stock state, not a generic prompt | Yes | Yes | Yes, purchase reducer action | Buy or skip through shop flow | Yes | Payment algorithm only; shop location/stock coupling makes direct reuse unsafe |
| Shop service, including Deep Relic Search | Shop encounter plus persisted stock reveal | Yes | Yes | Yes, service action deducts before/with reveal | Service or skip | Yes | Payment pattern is reusable; service registry and shop blockers are not |
| Gear `activationCost.salvage` | Item/timing state, sometimes a typed reaction | Yes | Yes | Cost and item effect resolve in one gear action | Use or do not use | Reaction-dependent | Validation pattern only; forcing encounters through `USE_GEAR` would be incorrect |
| Contract completion | Active Contract/progress | Yes | No general player payment | Reward/ledger/slot transition is atomic | No payment options | Yes | Unsuitable; `COMPLETE_CONTRACT` must remain isolated |
| Failure/Static Intercession reactions | Typed reaction IDs | Yes | Item-specific | Item cost/effect atomic | Continue or react | Yes | Useful lifecycle pattern, but not content-authored commerce |
| Pending Scar consequence | Persisted reaction plus queue | Yes | Item-specific | Yes | Continue or suppress typed effect | Yes | Best example for pause/continue/queue safety, but Scar semantics cannot be reused |
| Route Star confirmation | Route ID plus movement revision | Yes | Charge affordability | Yes | Alternate or default route | Yes | Good stale-version pattern; movement-only |
| Oathchain reveal | Owner-private persisted reveal/signature | Yes | Charge affordability | Yes | Reveal/cancel | Yes | Good privacy/signature pattern; not an encounter continuation |
| Rivalry reveal | Agenda-owner action | Yes | No | One reducer action | Reveal or wait | Yes | Good privacy guard; unsuitable for public encounter choices |
| Generic encounter decision | **None** | — | — | — | — | — | Missing prerequisite |

Authoritative payment systems found: **three families**—shop purchases, shop services, and item activation costs. Generic authoritative encounter-choice systems found: **zero**. Persisted prompt/reaction families useful as patterns: **five**—failure reactions, Static Intercession, Scar consequences, movement/Route Star state, and owner-private Oathchain state.

## Current encounter boundary

Enemy cards contain `defeatReward` and `woundOnLoss` effects. Combat resolves the final result, assigns the selected effect to `pendingEffect`, and later applies it through `RESOLUTION_APPLIED`. Existing effects resolve without pausing for an owner choice. `CONTINUE_RESOLUTION` advances the presentation/lifecycle after the outcome. Therefore a content payment must pause inside authoritative effect resolution, preserve the unprocessed continuation, and resume exactly once.

`lose_salvage` is not usable here: it intentionally permits partial loss, never checks affordability, never pauses, and cannot condition a benefit.

## Architecture alternatives

### Option A — Reuse a generic encounter-choice system

Rejected because none exists. Client prompt components do not create authoritative choice state.

### Option B — Generic `salvage_choice` with arbitrary nested option effects

Rejected. An unrestricted option/effect tree would become a scripting language, permit recursive choices, complicate deterministic prevalidation, and broaden content authority beyond these two needs.

### Option C — Narrow typed pending encounter transaction

**Preferred.** Add one typed encounter-payment effect with a restricted payment mode and a bounded result set. Resolving it pauses the current authored effect sequence and creates owner-scoped persisted state. One typed intent selects only a server-issued option ID.

### Option D — Content-specific actions

Rejected. `PAY_GATE_TAX` and `ACCEPT_RUST_CHOIR_OFFER` would duplicate validation, persistence, projection, and replay protections and make future encounter commerce harder to audit.

## Preferred authored schema

Conceptual future schema:

```ts
type EncounterPaymentEffect = {
  type: "encounter_payment";
  decisionKey: string;
  mode: "required" | "optional";
  prompt: string;
  salvageCost: number;
  paidLabel: string;
  declineLabel?: string;
  paidEffect?: EncounterPaymentResultEffect;
  declineEffect?: EncounterPaymentResultEffect;
  unavailableEffect?: EncounterPaymentResultEffect;
};

type EncounterPaymentResultEffect =
  | { type: "none" }
  | { type: "heal_wound"; amount: 1 }
  | { type: "gain_note"; text: string };
```

Phase 1I should initially allow only the exact result variants required by approved content. It must reject nested `encounter_payment`, `sequence`, arbitrary `EncounterEffect`, movement, targets, shared payment, transfer, and client-authored values. Cost is a positive integer. Option IDs are server-derived from `decisionKey` plus `paid`, `decline`, or `unavailable`; duplicates are impossible by construction.

Mode semantics:

- **Required:** full payment is the only paid resolution when affordable. Refusal is not legal. When unaffordable, the explicitly authored `unavailableEffect` resolves without deduction.
- **Optional:** paid and decline options are legal when affordable; only decline is legal when unaffordable. Decline is always free.

## Pending state

```ts
type PendingEncounterDecision = {
  decisionId: string;
  decisionVersion: number;
  seatId: string;
  sourceCardId: string;
  sourceResolutionId: string;
  sourceBranch: "defeatReward" | "woundOnLoss";
  decisionKey: string;
  mode: "required" | "optional";
  salvageCost: number;
  legalOptionIds: string[];
  paidEffect: EncounterPaymentResultEffect | null;
  declineEffect: EncounterPaymentResultEffect | null;
  unavailableEffect: EncounterPaymentResultEffect | null;
  remainingEffects: EncounterEffect[];
  createdAt: string;
  status: "pending";
};
```

Add `pendingEncounterDecision?: PendingEncounterDecision | null` to session state. An optional nullable field is sufficient for legacy saves; old rooms default to `null`. No save migration is required in the foundation commit. Only one can be active because the engine has one active encounter resolution; recursive/nested decisions are invalid. A future queue is unnecessary until authored content proves otherwise.

`decisionId` must be deterministic from session ID, source resolution ID, seat, source card, branch, decision key, and state sequence/version. It must not be an array index or client-generated value. `remainingEffects` stores the exact normalized authoritative continuation, not event-log history.

## Player intent and action

Future phone intent:

```ts
{ type: "ENCOUNTER_DECISION_REQUESTED"; seatId: string; decisionId: string; decisionVersion: number; optionId: string }
```

Future authoritative action:

```ts
{ type: "ENCOUNTER_DECISION_RESOLVED"; seatId: string; decisionId: string; decisionVersion: number; optionId: string; createdAt: string }
```

The client never sends cost, effect, target, current Salvage, branch, or continuation data.

## Validation sequence

1. Validate room/session token and bind it to `seatId` using existing intent authentication.
2. Require active game, resolution phase, and the same active seat.
3. Require a pending decision owned by that seat.
4. Match decision ID and version exactly.
5. Require the source resolution/card/branch to remain current.
6. Require an option ID in `legalOptionIds`.
7. Recompute authoritative affordability from current Salvage.
8. For paid options, require the full positive cost; never partially pay.
9. Prevalidate deterministic paid/alternative effect requirements—for example, healing requires at least one Wound.
10. Reject if the event log/resolved-decision guard already contains the decision ID.

Wrong seat, wrong phase, stale version, invalid option, changed encounter, insufficient Salvage, duplicate submission, and resolved decision all reject without mutation.

## Atomic resolution

For a paid option:

1. Revalidate the complete decision.
2. Calculate a next state that deducts exactly the full cost.
3. Apply the approved bounded result effect to that next state.
4. Clear the pending decision and record its decision ID as resolved.
5. Restore/process `remainingEffects` in authored order.
6. Advance the encounter once and emit one coherent payment-plus-result summary.

If any deterministic effect precondition fails, reject before deduction. Do not deduct and then issue a compensating rollback action. No external side effect may occur between payment and benefit.

Free decline/unavailable options deduct nothing, apply their exact authored result, clear the same pending state, and resume once. A required affordable decision cannot be cancelled; an optional decision can always decline. There is no timeout or host override.

Salvage gained by effects earlier in the same authored sequence is available because those effects have already committed before the decision opens. Effects after the decision are not available for affordability. Payment cannot be prevented or reduced unless a later rule explicitly introduces a typed payment modifier.

## Projection and UI

Owner phone projection:

- decision ID/version;
- encounter/card name and prompt;
- mode;
- authoritative option IDs and labels;
- exact Salvage cost;
- current authoritative Salvage;
- `enabled` and authoritative disabled reason;
- no result-effect internals beyond concise player-facing outcome text.

Other phones receive no actionable decision. The choice itself is public for these two cards, but private inventory totals stay owner-only.

TV projection:

- deciding operative display name;
- encounter name;
- concise `Waiting for [operative] to resolve [encounter]` status;
- public option summaries only if approved as public;
- final public payment/decline outcome, never private Salvage total.

Use the existing phone action/resolution panel and TV encounter/resolution presentation. A compact decision card is sufficient; no new full-screen focus mode is needed. Confirmation should be one tap because the prompt already states cost and result; adding a second confirmation increases table wait without adding safety.

## Persistence, reconnect, and security

- Pending state is part of authoritative session serialization.
- Phone refresh/rejoin reconstructs the same ID, version, legal options, current affordability, and continuation.
- Server restart can restore it if persisted rooms restore normal session state; event logs alone are never used.
- If resolution committed immediately before disconnect, the resolved-ID guard prevents reopening or replay.
- Multiple phones holding one seat token still race against one atomic state transition; only the first valid intent succeeds.
- Host phone cannot resolve another seat's choice.
- Stale intents after Salvage changes are revalidated against current affordability.
- Public projection never includes private agenda data, hidden inventory details, arbitrary effect payloads, or other-seat controls.

## Validation guard

Phase 1I validation should reject:

- `lose_salvage` used alongside payment/choice metadata;
- zero, negative, fractional, or missing costs;
- optional mode without a free decline;
- required mode without an unaffordable alternative;
- nested decisions or sequences inside option results;
- unsupported result types or targets;
- duplicate decision keys within a card;
- Heat/Risk wording;
- client-selectable costs/effects;
- paid benefits that cannot be deterministically prevalidated.

## Required focused tests

Estimated new focused tests: **44**.

- Schema/validation: 10.
- Pending lifecycle and continuation: 8.
- Server authentication/stale/duplicate validation: 10.
- Atomic payment/result behavior: 7.
- Phone/TV/public-private projection: 5.
- Reconnect/persistence/replay: 4.

Content-specific matrices add parameterized cases for zero, exact, and excess Salvage, required/optional behavior, repeat encounters, effect ordering, and unchanged sibling branches without requiring one test file per assertion.

## Rejected shortcuts

- Automatic `lose_salvage` as payment.
- Shop service calls outside a shop.
- `USE_GEAR`, rivalry actions, or Contract completion as encounter choices.
- Client-local prompts or effect data.
- Event log as pending state.
- Content-ID-specific server branches.
- Arbitrary nested effect scripting.
- Partial payment, debt, timeout auto-choice, host override, or post-deduction rollback.

## Four-seat critique

- **New Player:** exact cost and consequence appear together; “pay” is visibly different from automatic “lose.”
- **Optimizer:** server-owned option data, full-cost revalidation, resolved IDs, and atomic continuation close payment, replay, and duplicate-benefit exploits.
- **Family Player:** one compact prompt and no second confirmation keep the interruption short; disabled reasons explain zero-Salvage cases.
- **Rules Lawyer:** mode, affordability, effect preconditions, sequence position, reconnect, and duplicate behavior are explicit. Scenario/card overrides require typed authored data, not negotiation.
