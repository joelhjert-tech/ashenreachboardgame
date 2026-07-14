# Glass-Chime Swarm Heat retirement implementation

Date: 2026-07-14

Status: implemented on `phase/heat-retirement-1x`. This slice changes `glass-chime-swarm` only. `spindle-static-squall` remains approved but unimplemented, and the other seventeen Heat-linked Threat IDs remain blocked.

## Old Heat intent

Glass-Chime Swarm is an outer/common Blue Hazard with a Signal 6 test. Its former failure was `gain_heat 1`, which the compatibility runtime treated as a no-op. The authored harm was broken concentration from hostile signal noise, not bodily injury, material loss, shared escalation, Equipment damage, or movement.

The implementation removes the card's legacy Heat effect and `heat` resource tag without changing its stable ID, Hazard type, Blue lane, Signal 6 test, severity 2, outer/common placement, art identity, success note, graph membership, or deck count.

## Final approved rule

> The swarm breaks your concentration. On failure, subtract 1 from your next test. This penalty does not affect battles.

After a confirmed failed Glass-Chime Swarm check resolves, its owner receives `-1` on their next eligible non-battle test.

## Typed modifier model

The failure now uses the fixed `next_non_battle_test_modifier` effect with amount `-1` and source card `glass-chime-swarm`. Runtime state stores a narrow `nextNonBattleTest` record containing the owner seat, fixed amount, fixed source card, authoritative source-event ID, and creation timestamp.

Separate resolved-source and consumed-test ledgers make creation and consumption idempotent. This is not a free-form status engine. The client supplies none of the ownership, amount, source, eligibility, or expiry values.

## Eligible-test definition

The modifier uses the existing server-side `check` modifier resolver. An eligible test is the affected owner's accepted Hazard check through `CHECK_ROLLED`, including a Threat test or recurring tile-challenge test represented by that path.

It does not apply to enemy battles, combat rolls, normal movement, failed route-entry movement checks, another operative's test, previews, dice animation alone, stale/invalid/cancelled actions, passive stat displays, shops, automatic effects, mission progress, or scenario counters.

No stored Command, Grit, Signal, Guile, Forge, Equipment value, or resting stat is mutated. The `-1` is one ordinary modifier source before the existing total calculation; no card-specific floor or clamp was introduced.

## Creation and consumption timing

1. Glass-Chime Swarm's Signal 6 roll is committed.
2. A confirmed failure opens the typed failure effect.
3. Applying the resolution creates or replaces the owner's pending modifier. It cannot affect its source roll.
4. The owner starts a later eligible check.
5. The server adds `Glass-Chime Swarm -1` to the normal breakdown and calculates the total.
6. The accepted `CHECK_ROLLED` commits the result and consumes the record atomically.
7. The consumption ledger records the test event and the owner projection drops the status.

Preview, invalid source, missing authoritative source, stale card, movement, battle, and other-seat actions leave it pending. A started roll that has not committed also leaves it pending.

## Duplicate and stacking behavior

An owner can have at most one pending Glass-Chime modifier. A later distinct failure replaces the pending record and remains `-1`; it never becomes `-2` or queues two penalties. Both source events remain recorded as resolved. Reprocessing one source creates nothing, and one check cannot consume twice.

## Reconnect and lifecycle

Pending state and both ledgers are part of version-2 session state. Reconnect before or during a check retains one modifier. Reconnect after the committed check retains the consumed ledger and does not restore it. Recall clears the owner's modifier, replacement cannot inherit it, and session victory or defeat clears all pending modifiers.

## Rerolls

The first accepted check consumes the record. A solo or Artifact reroll of that same check reuses the original resolution's modifier total and source breakdown, including Glass-Chime exactly once. It neither recreates nor consumes a second modifier.

## Phone and TV presentation

The owner phone shows `Glass-Chime Swarm` and `Next non-battle test: -1` as passive status with no Use, Cancel, charge, exhaust, or target control. Other phones receive no pending record. The TV receives no private pending-modifier record or modifier source-event ID. During a public eligible check, the existing roll breakdown may show `Glass-Chime Swarm -1`.

## Validation and tests

Content validation enforces the fixed effect and final wording and rejects legacy Heat effect/text on this card. Focused tests cover identity and totals; confirmed-failure creation; success/forged rejection; owner scope; exact amount; non-stacking replacement; duplicate-source protection; Threat/tile eligibility; battle, movement, preview, automatic, stale, and other-seat exclusions; one-use consumption; modifier composition; reconnect; recall/session clearing; owner-only phone status; public-safe TV state; and reroll reuse.

Regression pins keep Spindle Static Squall and the other seventeen blocked Heat-linked Threats unchanged. Full-suite verification is recorded in the implementation handoff.

Final verification on 2026-07-14:

- `npm.cmd run typecheck` — passed.
- `npm.cmd run validate:content` — passed with 109 Threats and all canonical content totals unchanged.
- Focused Glass-Chime/B2A/B2B/legacy/phone run — 5 files and 90 tests passed.
- Legacy Heat population regression rerun — 2 files and 23 tests passed.
- `npm.cmd test` — 91 files and 969 tests passed.
- `npm.cmd run audit:assets` — 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build` — passed.
- `git diff --check` — passed.

## Playtest risks

- Players may route into battles to postpone the penalty; this is approved but should be observed for excessive deferral.
- A cross-turn penalty can be forgotten; owner status and the public roll breakdown mitigate this.
- Repeated common-card failures refresh rather than stack; confirm this remains relevant without becoming punitive.
- Solo rerolls must keep the penalty in the same test math without charging it again.

## Scope confirmation

This implementation does not change movement-roll mechanics, forced displacement, topology, Wounds, Scars, Salvage, Equipment, Global Escalation, scenarios, missions, Contracts, items, assets, or card counts. It does not alter `spindle-static-squall` or authorize any of the other seventeen blocked Heat-linked IDs.
