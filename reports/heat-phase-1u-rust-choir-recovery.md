# Phase 1U — Rust Choir Peddlers Optional Recovery

## Outcome

Rust Choir Peddlers now uses the existing production `encounter_payment` architecture for one optional post-victory recovery offer: after receiving the existing note, the owner may pay 1 Salvage to heal exactly 1 Wound or decline for free. Severity remains 2. The obsolete loss-branch `gain_heat 1` has no replacement.

Only the canonical content ID `rust-choir-peddlers` changed. Gate Tax Collectors and every other Heat-only outcome remain unchanged.

## Why the original task was blocked

The earlier specification described severity 1 and implied that the legacy Heat clause belonged to the victory branch. Current authoritative content instead had severity 2, a `gain_note` victory reward, and `gain_heat 1` under `woundOnLoss`. Git history also preserved severity 2. Implementing the earlier wording would have changed the rating and migrated the wrong branch.

The corrected decision establishes current content, runtime/tests, Git history, and the correction itself as authority. These six referenced Phase 1H reports are absent and were not reconstructed or treated as original evidence:

- `reports/rust-choir-peddlers-choice-design.md`
- `reports/salvage-payment-choice-architecture.md`
- `reports/heat-phase-1h-decision-specification.md`
- `reports/heat-only-content-individual-decisions.md`
- `reports/heat-only-content-balance-model.md`
- `reports/heat-only-content-implementation-batches.md`

## Authoritative content

| Property | Preserved/current result |
|---|---|
| Stable ID | `rust-choir-peddlers` |
| Severity | 2 |
| Family / lane | Choir / yellow |
| Difficulty / stat | 5 / Guile |
| Trophy value | 4 |
| Victory note | `You kept the peddlers talking long enough to steal the real price list.` |
| Loss Heat clause | Removed with no replacement |
| Recovery | Pay 1 Salvage to heal 1 Wound, or decline free |

The obsolete `heat` resource tag left with the last Heat construct. Art, catalog identity, rarity, tempo, combat values, trophy behavior, and non-Heat tags remain unchanged.

## Loss and victory behavior

`woundOnLoss` is omitted only for this explicitly approved card. The schema continues to require a loss effect for every other enemy. Combat normalizes the approved absence to the existing no-op sequence representation, adding no effect discriminator.

A combat loss opens no recovery decision and applies no replacement penalty. Existing core loss/Wound handling outside this card remains untouched.

The authored victory sequence is exact:

1. Grant the existing private note.
2. Evaluate the optional recovery payment.
3. If actionable, persist the owner-scoped decision and pause.
4. Resolve payment or decline once.
5. Resume the existing encounter cleanup path.

The reducer applies leading sequence effects before creating the trailing payment and clears `pendingEffect`. Reconnect, payment, decline, and replay therefore cannot grant the note again. With zero Salvage or zero Wounds, the decision is skipped; the note remains, no mutation or false delta occurs, and continuation proceeds.

## Authority, projection, and replay safety

The existing resolver revalidates owner, active seat, decision ID/version, option ID, affordability, and Wounds. Paid resolution deducts 1 Salvage and applies `heal_wound 1` atomically. Invalid/stale requests mutate nothing. Decline applies the bounded `none` result.

Resolved payment exposes truthful `Paid 1 Salvage.` and `Healed 1 Wound.` summaries so public deltas match mutations. Pending question text is excluded from delta parsing, preventing the offer from appearing as completed healing.

The owner phone receives both choices; other phones receive none. TV receives the existing public waiting state without decision identifiers. Pending state validates under snapshot v2 and reconstructs unchanged in `GameRoomServer`. No snapshot migration is invoked by reconnect.

## Compatibility counts

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 29 | 28 |
| Heat-only branches | 32 | 31 |
| Heat-effect occurrences | 41 | 40 |
| `gain_heat` | 27 | 26 |
| `gain_heat_all` | 3 | 3 |
| `lose_heat` | 11 | 11 |
| Heat-effect approvals | 40 | 39 |
| Other compatibility approvals | 14 | 14 |
| Combined compatibility IDs | 54 | 53 |
| Required production payments | 1 | 1 |
| Optional production payments | 0 | 1 |

The post-change scan found 26 `gain_heat`, 3 `gain_heat_all`, and 11 `lose_heat` effects. Rust Choir is the sole changed content ID.

## Tests

Focused coverage protects severity and content ordering, the Rust-only omitted-loss boundary, neutral loss, note-before-offer timing, paid/declined/ineligible paths, exact minimum and higher-resource deltas, snapshot round-trip, phone/TV privacy, and stale/wrong-seat/replay rejection. Phase 1I and Phase 1G regressions protect required payment and shared projection behavior.

## Four-seat critique

**New Player:** the price and benefit are explicit, Decline is free, and no meaningless prompt appears. Heat and Risk remain absent.

**Optimizer:** zero Salvage cannot heal, zero Wounds cannot waste Salvage, and a decision resolves once. Reconnect cannot replay note, payment, healing, or cleanup.

**Family Player:** the choice is short, owner-only, and adds no bookkeeping; TV shows the existing waiting state and play resumes after one decision.

**Rules Lawyer:** the note precedes the offer; payment and healing are atomic; final eligibility is authoritative; decline changes neither resource; the loss branch has no offer or replacement penalty.

## Files and remaining work

Implementation changes are limited to Rust Choir content, its narrow loss-schema boundary, combat no-op normalization, trailing-payment sequence handling, truthful resolved-delta parsing, focused tests/counts, the two decision registers, and this report. No Mirror, snapshot migration, projection contract, global healing rule, or other content ID changed.

The remaining 28 Heat-only IDs / 31 branches / 40 effects stay grouped by approved mechanics. Legacy v0/v1 parser support, archival metadata closure, and stable discriminator retirement remain separate decisions.

## Verification

- Focused Phase 1U file: 14/14 passed, including authenticated cleanup and replay coverage.
- Engine/rules coverage in the final full run: 403/403 tests across 30 files.
- Full repository suite: 879/879 tests across 82 files.
- Client suite: 250/250 tests across 26 files.
- Content validation: passed (109 threats and all canonical content catalogs).
- TypeScript typecheck: passed.
- Production build: passed (140 modules transformed).
- Asset audit: 404/404 present, zero missing/invalid/placeholders/release blockers.
- `git diff --check` and staged diff check: passed.
- Existing non-failing missing-map-art fallback diagnostics remained unchanged.
