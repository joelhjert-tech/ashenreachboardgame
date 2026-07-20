# Salvage Resolution Implementation

## Implemented repairs

- A single visible-result Continue now advances the presentation and applies the pending canonical effect in the same authoritative lifecycle.
- Automatic continuation uses the same visible-outcome rule as an explicit Continue.
- Auto-continue is suppressed while payment, equip, Scar, memory-tax, suppression, destination, or displacement state owns continuation.
- Phone Battle/Test presentation now includes authoritative resolution actions, so payment is reachable on the tab selected by action guidance.
- Salvage gains and losses are included in Battle/Test result deltas.
- Encounter-payment log entries now retain their source card and source resolution IDs.
- Current payment deltas are shown once; source-mismatched older payments are excluded from later encounter results.
- Deterministic QA fixtures cover required payment, optional payment, insufficient funds, battle gain, and anomaly gain.

## Authoritative behavior

| Operation | Commit point | Validation | Replay boundary |
|---|---|---|---|
| Gain | `RESOLUTION_APPLIED` / mission completion | Typed positive amount | Resolved source-event ID or completed mission record |
| Automatic loss | `RESOLUTION_APPLIED` | Typed amount; reducer floors at zero | Resolved Salvage-loss source-event ID |
| Payment | `ENCOUNTER_DECISION_RESOLVED` | Owner, decision ID/version, option, source, full funds | Resolved encounter-decision ID |
| Decline | `ENCOUNTER_DECISION_RESOLVED` | Owner and authoritative decline option | Resolved encounter-decision ID |

The client submits only a typed intent. It never submits the balance, effect amount, before/after value, or reward result.

## Reconnect and concurrency

- Pending payment state is serialized in the existing v2 state and projected only to its owner.
- Other phones receive a waiting state; TV receives public-safe status without private decision IDs.
- Reconnect restores the same decision ID/version.
- Duplicate and stale decisions are rejected without another deduction.
- The delayed presentation timer cannot continue through an outstanding decision and cannot crash the server on that rejection path.

## Presentation

- Current balance remains visible at the top of the phone.
- Required and optional payment controls appear in the guided Battle/Test view.
- Successful payment displays one `-1 Salvage` result.
- Battle and event rewards display one `+1 Salvage` result.
- Insufficient payment explicitly states that no debt was created.
- TV displays public reward results and never receives private choice controls.

## Files changed for this repair

- `src/game/engine/reducer.ts`
- `src/server/roomServer.ts`
- `src/server/phaseOneQaFixture.ts`
- `src/client/phone/PhoneActionPanel.tsx`
- Focused engine, server, and phone tests
- `scripts/capture-salvage-resolution-qa.ts`
- Salvage debug, implementation, and QA reports

`PhoneActionPanel.tsx`, its test, and `src/client/styles.css` also contained unrelated pre-existing movement/UI edits before this task. They remain preserved outside the Salvage-resolution commit.

## Verification

- Content validation: passed; 109 Threats and canonical catalogs intact.
- Typecheck: passed.
- Focused Salvage/phone/fixture set: 119/119 passed.
- Rules: 58/58 passed.
- Engine + rules: 757/757 passed.
- Integration: passed.
- Client: 374/374 passed.
- Aggregate: 1,465/1,465 passed.
- Asset audit: 435/435 present, zero missing/invalid/placeholders.
- Production build: passed.
- Browser QA: 14 captures; zero horizontal overflow and zero console errors.
- `git diff --check`: passed.
- `git diff --cached --check`: passed before commit.
