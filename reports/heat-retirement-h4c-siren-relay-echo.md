# Heat retirement Phase H4C: Siren Relay Echo

Status: implemented on `phase/heat-retirement-1x` as the final approved H4 modifier slice.

## Retired Heat intent and final rule

Siren Relay Echo previously authored `lose_heat 1` on success and `gain_heat 2` on failure. Both were compatibility no-ops. H4C replaces those two branches in place while preserving stable ID, Yellow Hazard identity, Command 6 difficulty, art, lore, graph membership, persistence, and the 26/35/48 lane totals (109 overall).

Final rule: “If you succeed, gain +1 on your next non-battle Command test. If you fail, suffer -1 on your next non-battle Command test.”

## Authoritative modifier lifecycle

Success creates one owner-scoped `+1`; failure creates one owner-scoped `-1`. The typed record carries the Siren source ID, authoritative source event, exact `command` stat, `nonBattleTest` context, signed amount, and an optional reserved test-resolution ID. A newer accepted Siren result replaces the owner's prior Siren record, including opposite signs. Resolved source events remain deduplicated, so an older replay cannot overwrite the newest accepted state.

Eligibility is limited to server-authored rolled Command checks in the ordinary non-battle Threat/tile challenge pipeline. Battles, movement, passive displays, automatic effects, shops, previews, invalid or stale requests, and another player's tests do not reserve or consume it. The source Siren resolution creates its new modifier only after its own result resolves.

## Arithmetic, rerolls, and consumption

Siren enters the existing modifier-source resolver after permanent, character, Equipment, Artifact, Contract, and scenario sources. It changes neither stored Command nor difficulty, dice, reroll count, ownership, or consequences. Existing final-total behavior remains authoritative. Differently named sources stack normally; a qualifying Command check can display both `Glass-Chime Swarm -1` and `Siren Relay Echo +1/-1` exactly once.

The first accepted eligible check reserves Siren to its authoritative resolution ID. Rerolls reuse the committed modifier breakdown for that resolution, so the source is neither duplicated nor recalculated. Siren remains in its in-resolution state until the resolution/reaction window exits, then consumes once. Rejected, cancelled, preview, stale, or unrelated actions do not consume it.

## Cleanup, reconnect, and presentation

Pending or reserved state serializes across reconnect and persists across turns, phases, movement, shops, unrelated tests, and battles. It clears on its eligible resolution's completion, owner recall/replacement, session end, or room reset through the existing personal temporary-state cleanup.

Before use, only the owner phone receives the passive status `Siren Relay Echo` with `Next non-battle Command test: +1` or `-1`; a reserved record adds `In resolution`. No Use, Cancel, charge, exhaust, or target controls are added. Other phones and the TV receive no pending state or internal IDs. During a public check, the normal public modifier breakdown may show the Siren source and signed value.

## Verification and playtest risks

Focused coverage pins exact content and totals, success/failure creation, all sign-replacement combinations, source replay protection, Command-only eligibility, Glass-Chime composition, authoritative reservation, reconnect serialization, one-time consumption, stored-stat isolation, owner-only projection, TV privacy, and forged result rejection. Existing Glass-Chime tests continue to cover reroll source reuse.

Final verification passed: content validation (109 Threats), typecheck, the focused H4C/Glass-Chime/H4B run (22 tests), all 556 engine tests, all 255 client tests, all 1,037 repository tests, asset audit (404/404 present with no release blockers), production build, and diff checks. The two quarantined Heat-audit reports remained untracked and unchanged.

The main playtest risk is that a narrow Command bonus can remain pending for several turns. The owner-only reminder and reconnect persistence make that state visible without revealing future private pressure to other players. The paired benefit cannot queue, and a later failure can replace it with the penalty (or vice versa).

The six blocked IDs remain unchanged: `ashen-doppelganger`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `marrow-tax-auditors`, and `memory-tax-gate`. Their next work is report-only approval grouped by unresolved lifecycle, not lane. The +116-card expansion remains unapproved.
