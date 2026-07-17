# Phase 1H decision specification — Phase 1I encounter payments

Status: **all recommendations pending user approval; nothing implemented**.

## Selected architecture

Implement a narrow typed `encounter_payment` effect with `required` and `optional` modes, a bounded result-effect union, and one persisted `pendingEncounterDecision`. Do not add a generic scripting language, reuse shop-only services, or encode payment as `lose_salvage`.

## Phase 1I entry criteria

1. Approve the shared architecture and exact schema names.
2. Approve Gate-Tax Collectors as a required 1-Salvage post-loss levy with zero-Salvage no-debt alternative.
3. Approve or reject Rust Choir Peddlers' proposed 1-Salvage/1-Wound-heal post-victory offer.
4. Start from green validation/typecheck/full suite, or explicitly quarantine the known unrelated websocket integration failure.
5. Confirm only these two content IDs leave the Heat allowlist.

## Exact additions

Schema:

- `EncounterPaymentEffect` with `decisionKey`, `mode`, prompt/labels, positive integer `salvageCost`, and bounded paid/decline/unavailable result.
- `EncounterPaymentResultEffect`: initially `none`, `heal_wound 1`, and authored note only.
- `PendingEncounterDecision` as specified in `salvage-payment-choice-architecture.md`.
- Optional nullable `pendingEncounterDecision` session field.
- `ENCOUNTER_DECISION_RESOLVED` authoritative action schema.
- `ENCOUNTER_DECISION_REQUESTED` client intent schema.

Likely files:

- `src/game/schema/card.schema.ts`
- a focused new `src/game/schema/encounterDecision.schema.ts`
- `src/game/schema/session.schema.ts`
- game action schema/type module used by the reducer
- `src/game/engine/reducer.ts`
- `src/server/sessionState.ts`
- `src/server/roomServer.ts`
- `src/client/shared/types.ts`
- existing phone action/resolution panel and TV encounter/resolution components
- `scripts/legacy-heat-validation.ts`
- the two content JSON files
- focused engine/server/client tests and the two Heat decision registers/reports

## Runtime sequence

1. Combat establishes final victory/loss and the authored branch.
2. Effect traversal resolves members before `encounter_payment` in authored order.
3. On the payment member, store normalized authoritative pending state and remaining effects; pause resolution.
4. Project owner controls and TV waiting status.
5. Phone submits only decision ID/version and option ID.
6. Server authenticates seat/token, phase, source resolution, decision/version, legal option, affordability, and result preconditions.
7. Reducer atomically deducts full cost and applies result, or applies free alternative.
8. Record resolved decision ID, clear pending state, resume remaining effects once, and produce matching public/private results.
9. Reconnect restores pending state; resolved decisions never reopen.

No timeout, partial payment, prevention, host substitution, cross-seat payment, or client-supplied cost/effect is allowed.

## Content migrations

### Gate-Tax Collectors

- Replace only `woundOnLoss: gain_heat 1`.
- New required encounter payment: cost 1; paid result none; unaffordable result concise no-debt note.
- Keep Command 5, trophy 4, victory note, enemy persistence, placement, identity, and movement behavior.
- Update copy/resource tag from Heat to Salvage/payment.

### Rust Choir Peddlers

- Remove `woundOnLoss: gain_heat 1` with no loss replacement.
- Extend the victory reward sequence after the existing reward with optional payment: cost 1; paid result heal 1 Wound; decline none.
- Preserve Guile 5, trophy 4, price-list note, placement, identity, and ordinary defeated-enemy cleanup.
- Update copy/resource tag from Heat to Salvage/healing.

If the Peddler benefit is not approved, exclude that ID from Phase 1I and leave it allowlisted. Do not substitute a note-only benefit.

## Projection/UI specification

- Owner phone: compact encounter decision card in the existing action/resolution surface, exact cost/result/current resources, authoritative disabled reason, one-tap option.
- Other phones: waiting status only, never actionable option IDs.
- TV: existing encounter focus with deciding player, encounter, public option summary, and final public result; no new focus mode or private totals.
- Public/private logs: actual deduction and effect only; decline/unavailable never emits a false Salvage delta.

Required phone component changes: **one existing action/resolution panel branch**, not a new app-level component. Required TV changes: **one existing encounter/resolution branch**. Shared types gain one private decision projection and one public waiting summary.

## Validation/security

- New Heat/Risk constructs remain rejected.
- `lose_salvage` plus payment metadata is rejected.
- Cost validation: present positive integer; no zero/fraction/negative.
- Required mode needs unaffordable result and forbids decline.
- Optional mode requires free decline.
- Unsupported/nested effects and duplicate decision keys reject.
- Current encounter/source branch must match stored state.
- Existing seat-token binding, active-seat/phase checks, exact IDs, version checks, and event-log/resolved-ID duplicate guards are reused.
- Two clients racing on one token cannot both commit.

## Test specification

Target: approximately **44 focused tests**, plus existing suites.

Schema:

- valid required and optional models;
- missing/zero/negative/fractional costs reject;
- duplicate decision keys/options reject;
- optional without decline rejects;
- required without unaffordable result rejects;
- nested/unsupported effects reject;
- Heat/Risk wording and `lose_salvage` payment misuse reject.

Server/reducer:

- correct/wrong seat, wrong phase, no pending state;
- stale ID/version/source and invalid option;
- exact/excess/zero Salvage;
- full deduction plus result;
- no deduction on failed precondition;
- no benefit on failed payment;
- no partial/double payment or benefit;
- authored effects before/after retain order;
- encounter resumes once.

Projection/reconnect:

- owner controls only;
- other phones/TV waiting state;
- authoritative affordability;
- private totals do not leak;
- pending refresh/rejoin/server-state round trip;
- resolved choice does not reopen;
- stale pre-reconnect intent rejects;
- continuation position and updated Salvage/Wounds persist.

Content:

- Gate zero/exact/excess, mandatory/no-refusal, repeated loss, enemy remains, victory/trophy/movement unchanged.
- Peddlers zero/exact/excess, zero/positive Wounds, pay/decline, one heal, trophy/note/cleanup unchanged, distinct repeat encounter, no farming.
- Phase 1G seven entries and automatic `lose_salvage` semantics remain unchanged.

## Commit boundaries

Recommended Phase 1I commits:

1. `feat: add authoritative encounter payment decisions` — schemas, pending state, reducer/server lifecycle, projections, UI, and foundation tests with synthetic fixtures only.
2. `phase-1i-migrate-encounter-salvage-payments` — approved content IDs, allowlist/validation updates, content tests, reports.

This split permits reverting content balance without removing reusable infrastructure. If a single-commit policy is required, keep one reviewable commit but retain foundation/content test separation.

Rollback: revert content migration and restore the two `gain_heat` no-ops plus allowlist entries. Foundation may remain unused if independently green; otherwise revert its commit. Never restore a deducted payment through a later compensating action.

## Exit criteria

- Approved content behavior implemented exactly.
- Atomic payment/result and all rejection cases proven.
- Reconnect and stale/duplicate tests green.
- Phone/TV public-private boundaries green.
- No Heat/Risk presentation or active Heat read/write.
- Phase 1G semantics unchanged.
- Content validation, typecheck, focused suites, full suite, build, asset audit, and diff checks pass.

## Four-seat critique

- **New Player:** Gate says payment is mandatory after loss; Peddlers show an optional heal and exact price. TV explains why play is paused.
- **Optimizer:** Gate cannot be refused while affordable; Peddler healing requires both resources, occurs once after victory, and cannot be replayed.
- **Family Player:** one compact prompt and no redundant confirmation minimize waiting; zero-resource disabled reasons are explicit.
- **Rules Lawyer:** payment precedes benefit atomically, cannot be prevented or partially paid, continuation is stored, and decision IDs/versioning settle reconnect/race cases.

## Readiness

- Gate-Tax Collectors: **implementation-ready after architecture approval**.
- Rust Choir Peddlers: **blocked until the newly proposed healing benefit is explicitly approved**; architecture itself supports it.
- New schema variants: 3 conceptual types (`EncounterPaymentEffect`, bounded result effect, pending decision).
- New session fields: 1 optional nullable pending state, plus a resolved-decision ID guard if not represented in event history safely.
- New intents/actions: 1 request and 1 authoritative resolution action.
- New UI surfaces: no new focus mode; two branches in existing phone/TV resolution components.
