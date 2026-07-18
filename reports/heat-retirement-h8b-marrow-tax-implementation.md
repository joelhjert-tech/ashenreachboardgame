# Heat Retirement H8B — Marrow-Tax Auditors implementation

Status: **IMPLEMENTED H8B**.

Approval: `c6c2b6c docs: approve marrow tax heat retirement`.

Stable ID: `marrow-tax-auditors`.

## Implemented rule

> On failure, lose up to 1 Salvage.

The existing card was revised in place. Its Guile 7 failure now authors one `{ type: "lose_salvage", amount: 1 }` consequence. Its stable ID, title, Yellow hazard identity, severity 2, art, lore sentence, success note, rarity, tempo, four canonical local-deck entries, and total-card contribution remain unchanged.

No new economy lifecycle, reducer branch, pending state, projection model, phone control, TV mode, shop event, or Contract event was added.

## Automatic floor-zero behavior

The effect reuses `resolveFloorZeroSalvageLoss` and the existing Threat-resolution source guard:

1. The server resolves the authoritative Guile test.
2. Final failure exposes the authored one-Salvage consequence.
3. The resolver records requested loss 1.
4. Actual loss is `min(max(0, current Salvage), 1)`.
5. Resulting Salvage is the non-negative available balance minus actual loss.
6. The delta and source complete once before the Threat continues.

| Starting | Requested | Actual | Resulting | Result |
|---:|---:|---:|---:|---|
| 3 | 1 | 1 | 2 | Lost 1 Salvage. |
| 1 | 1 | 1 | 0 | Lost 1 Salvage. |
| 0 | 1 | 0 | 0 | No Salvage to lose. |

Zero creates no Wound, Scar, Equipment effect, movement, escalation, delayed debt, or substitute penalty. The zero-delta source is still completed, so reconnect and repeated delivery cannot reconsider it.

## Economy classification and isolation

This is automatic owner-resource loss. It is not payment, spending, purchase, sale, reward reduction, shop service, encounter decision, mission payment, Contract payment, or relic trade.

The implementation emits no shop transaction or transaction ID and changes no cost, sell value, starting balance, shop history, item ownership, or stock. It does not trigger or change Salvage Ledger; production Ledger behavior remains the existing passive shop Guile modifier.

The failure does not advance `shopTransaction`, voluntary Salvage-spend progress, a Contract objective, completed Contracts, a Contract reward, a relic-dealer trade, or private Rivalry progress. The legacy 30-versus-36 Contract assertion and all Contract content remain untouched.

## Frequency boundary

The canonical sector graph still contains exactly four shared finite entries:

- `middle_relic_cache`
- `middle_scar_surgery`
- `middle_shard_sprawl`
- `the-salt-archive`

No local-deck entry, icon, draw rule, reshuffle rule, persistence field, recurrence effect, or card copy was added. Threat totals remain Red 26 / Blue 35 / Yellow 48 / overall 109.

## Authority, replay, and reconnect

The reducer continues to derive the pending effect from the active card. Wrong-seat and stale-source submissions reject. A forged amount is ignored in favor of the authoritative pending one-Salvage effect. One failure produces one `RESOLUTION_APPLIED` event and one actual delta.

Pending resolution survives schema serialization and room reconstruction. Completed positive and zero deltas reconstruct with no pending effect and reject replay. Duplicate projection is read-only and cannot change Salvage.

## Phone and TV presentation

Existing Salvage-loss outcome projection is reused. The owner phone receives requested, actual, and resulting values through the normal result model. The TV receives the concise public-safe outcome. Neither surface gains payment controls, confirmation controls, shop terminology, Heat rows, internal effect names, source-event IDs, or transaction IDs.

## Focused coverage

`heatRetirementH8BMarrowTax.test.ts` proves:

- exact identity, wording, typed amount, lane totals, art, and four graph entries;
- success-note preservation with no Salvage loss;
- `3 → 2`, `1 → 0`, and `0 → 0` requested/actual/resulting behavior;
- zero completion without a fallback;
- Salvage Ledger, shop, mission, Contract, completed-Contract, relic, private-state, Wound, Scar, movement, scenario, and escalation isolation;
- authoritative amount/source, wrong-seat/stale rejection, replay protection, and one event;
- pending and completed reconnect behavior, including zero delta;
- phone/TV public-safe results; and
- exact hash preservation of `memory-tax-gate`.

Existing Phase 1G, B2A, H1, H2, H3, H5B, and H7B expectations were advanced only where they enumerate the current automatic-loss or remaining-Heat populations. The five earlier floor-zero card definitions were not changed.

## Playtest risks

Severity remains 2. The bounded risk is clustered Yellow attrition or two losses landing on one operative before a purchase. H8B does not mitigate that through rewards, mode scaling, or fallback mechanics because H8A accepted the four finite shared entries and amount 1. Playtests should record funded versus zero outcomes and per-seat concentration.

## Remaining block

`memory-tax-gate` is the sole remaining Heat-linked Threat. It remains **BLOCKED** pending a dedicated private-choice approval covering exact options, owner-only projection, mandatory resolution, reconnect persistence, cancellation, and source deduplication.

The +116-card expansion remains unapproved.

## Verification

- `npm.cmd run validate:content` — passed; 109 Threats and 36 Contracts.
- `npm.cmd run typecheck` — passed.
- Focused H8B plus Phase 1G/H3 floor-zero suites — passed, 30 tests.
- Updated Heat-population and prior-phase regression files — passed after advancing only the expected Marrow census; full engine coverage confirms the complete set.
- Shop, sell, Contract-objective, Rivalry-progress, and relic-lens regressions — passed, 35 tests.
- `npm.cmd run test:engine` — passed.
- `npm.cmd run test:integration` — passed, 226 tests.
- `npm.cmd run test:client` — passed, 257 tests.
- `npm.cmd run test` — timed out at 240 seconds without a result; its engine, integration, and client constituents passed independently and the wrapper was not retried.
- `npm.cmd run audit:assets` — passed, 404/404 assets present with no missing, invalid, placeholder, or release-blocking entries.
- `npm.cmd run build` — passed.
- `git diff --check` and `git diff --cached --check` — passed before commit.

The separately maintained legacy Contract promotion test was not invoked or changed. Its known 30-versus-36 assertion remains outside H8B scope.
