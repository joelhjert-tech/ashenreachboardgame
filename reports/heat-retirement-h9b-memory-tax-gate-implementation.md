# Heat Retirement H9B — Memory Tax Gate implementation

Status: **IMPLEMENTED**.

Stable ID: `memory-tax-gate`.

## Implemented rule

`On failure, choose one: lose 1 Salvage (available only if you have at least 1 Salvage); or suffer -1 on your next non-battle test.`

The card retains its display name, Yellow hazard identity, Command 8 difficulty, severity 3, middle-ring membership, uncommon frequency, success note, art, and deck references. Its obsolete `gain_heat 2` failure is replaced in place by the source-locked typed `memory_tax_choice` effect. Threat totals remain Red 26 / Blue 35 / Yellow 48 / overall 109.

## Choice lifecycle

On a confirmed authoritative failure, the server snapshots the active resolution and creates one `PendingMemoryTaxChoice` only when the owner has at least 1 Salvage. The record owns the affected seat, source card, source resolution/event, version, and exact legal option IDs. Only the owner phone receives those IDs. The phone submits one offered option with the choice ID and version; the reducer revalidates turn, phase, owner, source, version, eligibility, and completion ledger.

The choice is mandatory and has no Cancel or gameplay timeout. Threat continuation and phase advancement are rejected while it is pending. Other phones and TV receive only a public waiting summary. Reconnect restores the same pending record and owner options. Recall, replacement, defeat, owner removal, or session end clears the unresolved choice without transferring or substituting a consequence and records its source as complete.

## Consequences and ordering

- `lose-salvage-1`: automatically loses exactly 1 Salvage. It is loss, not payment, spending, purchase, sale, shop transaction, mission payment, Contract payment, or relic trade. It creates no Salvage Ledger trigger or transaction ID.
- `next-non-battle-test-minus-1`: creates one owner-scoped `memory-tax-gate` modifier with amount `-1` and non-battle context. It applies to the next authoritative rolled non-battle test regardless of stat, remains bound across rerolls, and consumes once when that test resolution completes.
- At zero Salvage, the server creates no one-button choice and installs the modifier automatically.
- If the Salvage arm becomes stale before submission because the balance reached zero, the authoritative modifier arm resolves automatically.
- One unresolved Memory Tax modifier exists per owner. A later modifier replaces the earlier one; it does not stack or queue. Choosing Salvage later does not clear an earlier modifier.

The selected consequence commits before the Threat may finalize. The completed choice source, Salvage-loss source where applicable, and delayed-modifier source are independently deduplicated. Duplicate submissions, stale versions, forged options, wrong seats, reducer replay, and reconnect cannot reapply the consequence or reward lifecycle.

## Test and cleanup semantics

The delayed modifier is eligible for Hazard, tile-challenge, Anomaly, scenario, and mission checks that use the authoritative non-battle roll pipeline. Battles, movement rolls, previews, automatic effects, payments, shop actions, and other seats are excluded. Glass-Chime and Siren remain independent typed sources and can combine by distinct source; their existing eligibility and cleanup are unchanged.

Rerolls reuse the same recorded modifier and do not consume it early. Consumption occurs after the final eligible test resolution. Recall, defeat/replacement, owner removal, session end, and room reset clear it; turns and rounds do not. Stored character stats are never mutated.

## Presentation and privacy

The owner phone shows “Choose what the gate takes,” the two current server-generated options, one local selection, and one mandatory Confirm action. At zero Salvage no choice panel appears; the owner sees the resulting pending modifier. The TV and other phones show only that Memory Tax Gate is awaiting resolution and never receive private option IDs, the selected branch, Salvage totals, or the delayed modifier. Internal source, choice, and completion IDs remain unprojected.

## Focused coverage

H9B coverage verifies content identity and wording; absence of authored/player-facing Heat; two-option funded choice; automatic zero-Salvage modifier; exact one-Salvage loss; stale-arm fallback; owner-only projection; public-safe TV projection; wrong-seat, forged, stale, duplicate, and bypass rejection; reconnect reconstruction; any-stat non-battle eligibility; reroll binding; one-time consumption; replacement rather than stacking; session schema persistence; legacy approval retirement; 109-card totals; and H1–H8B regression expectations.

## Playtest risks

The principal accepted risk is route deferral: an owner can postpone the delayed penalty by avoiding non-battle tests. The state does not expire at a turn or round boundary, so this remains route pressure rather than a free cleanup. The second risk is state-dependent choice value; zero Salvage deliberately removes the free arm, while funded players retain a meaningful immediate-versus-delayed decision. Replacement semantics cap repeated bookkeeping.

## Boundary

No global Heat compatibility, economy transaction, Salvage Ledger, shop, mission, Contract, scenario, movement, Wound, Scar, Equipment, asset, or map system was redesigned. The +116 expansion remains unapproved. This implementation completes the 17 authored Threat retirements; a separate authored-Heat removal and compatibility-boundary audit must follow.

## Verification

Passed: `npm.cmd run validate:content`, `npm.cmd run typecheck`, focused H9B engine and phone tests, `npm.cmd run test:engine` (617 tests), `npm.cmd run test:integration` (226 tests), `npm.cmd run test:client`, `npm.cmd run test` (1,101 tests), `npm.cmd run audit:assets` (404/404 present), `npm.cmd run build`, `git diff --check`, and `git diff --cached --check`. The existing client fallback-art warnings remained non-failing. The two quarantined audits were not staged or edited and retained their approved SHA-256 hashes.
