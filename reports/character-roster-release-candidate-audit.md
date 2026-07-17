# Character roster release-candidate audit

Audited 2026-07-09 against `e1734cc` and `4dc2a4a`. This is a report-only
review of the 16 playable characters. `MASTER ALPHA` is excluded because it is
not a playable roster entry.

## Verdict

**Not release-candidate ready yet.** The roster validates and the new
server-side paths are materially better than the post-revision audit found,
but one player-facing path is blocked and four generic timing rules do not
match their sheets precisely.

The release blocker is Mira: the server accepts and validates
`USE_CHARACTER_ABILITY`, but the phone client neither exposes that intent nor
projects `noteResources`. A player therefore cannot see a Vow Note balance or
activate Cinder Oath during a normal phone-controlled game. This is not a
server-authority failure; it is an incomplete private-controller path.

The P1 mechanical issues are the broad `firstRollThisTurn` / `hasResolvedCheckOrCombatThisTurn` guard. An unrelated earlier test incorrectly consumes the sheet's first *eligible* opportunity for Kira, Rumi, Lane, and Popelord. The engine must track each ability's stated window rather than any check/combat this turn.

## Findings by severity

### P0 — Mira cannot use the server-backed ability from the controller

`roomServer.ts` has a server-authoritative `USE_CHARACTER_ABILITY` path. It
requires the active player, the action phase, Cinder Oath's once-per-round
limit, and at least one typed `vow` resource; it subtracts exactly one Vow
Note and rejects each failed precondition. The confrontation resolver then
adds +2 to each confrontation test that round.

However, the phone state projection omits `noteResources`, the client intent
union omits `USE_CHARACTER_ABILITY`, and there is no phone affordance that
submits the action. Server tests directly invoke the server and manually seed
a Vow Note, so they prove the rule but not its real player route.

Recommendation: add a private resource projection and a current-action
Cinder Oath control with an unavailable-cost reason. Keep all cost, timing,
and resolution checks on the server. Add an integration test that obtains a
Vow through a supported gain path and spends it through the client protocol.

### P1 — "first eligible" ability windows are implemented as "first roll"

The shared helper treats any prior `CHECK_ROLLED` or `COMBAT_RESOLVED` event
this turn as having used the window. That does not equal the sheet language:

| Character | Sheet promise | Current mismatch | Recommendation |
| --- | --- | --- | --- |
| Kira | Houndblade Charge: first battle you start | A preceding non-battle check blocks the bonus. | Track first battle started this turn. |
| Rumi | Violet Edge: once/round before a Signal or Guile battle/test | A preceding Grit/Forge check blocks it. | Track use of Violet Edge, or first eligible Signal/Guile test. |
| Lane | Hush Static: first Blue Anomaly this turn | An unrelated prior roll blocks the reduction. | Track first Blue Anomaly resolution. |
| Popelord | Compost Cape: first yellow hazard this turn | An unrelated prior roll blocks the reduction. | Track first yellow-hazard resolution. |

These are server-authoritative and deterministic, so they do not create a
desync by themselves. They are still gameplay defects, and current focused
tests do not cover the prerequisite case of an unrelated prior roll followed
by the eligible event.

### P1 — Mira's other sheet effects are not aligned to their written triggers

* **Ember Vigil** currently auto-triggers at turn start based on danger or
  existing escalation, takes a Wound automatically, and only reduces an
  escalation level already present. The sheet instead offers an optional,
  once-per-round response when scenario pressure would rise on Mira's turn.
* **Ash Psalm** grants Vow Notes for two specific effect keys, not for the
  stated class of cleared dangerous, ember, or sanctuary sectors.
* **Bone Bell** grants a Vow Note for a broad positive escalation delta on
  Mira's turn. The sheet limits it to pressure caused by a Wound or failed
  test.

Recommendation: make the pressure-increase cause explicit in the server
event, offer the Vigil decision at that event, and test each positive and
negative trigger. Do not broaden Vow gains until the eligible space and cause
are represented deterministically.

### P1 — Deepdale still promises unimplemented mechanical rules

Deepdale's Underway Ear, Black-Dust Craft, Lantern Delver, and Deep Bargain
read as mechanical effects, but no corresponding named hooks were found in
the reviewed server ability handling. They are neither identified as
descriptive-only nor expressed in supported generic terms.

Recommendation: either implement and test the promised rules or rewrite each
to a clearly narrative/private route entry before the next playtest.

### P2 — Ker's anti-explosion identity has no distinct rule to protect

Iron Bulwark says enemies cannot explode, while the reviewed generic enemy
dice path already rolls non-exploding dice. The text is currently harmless,
but it does not create a meaningful mechanical distinction and could become
misleading if exploding enemy dice are added.

Recommendation: state it as a future-proof rule only when enemy explosions
exist, or revise the wording to an existing, observable Ker defense.

### P2 — Legacy card identifier remains discoverable outside ordinary UI

The player-facing relic is `Scar-Sink Prayer`. `heat-sink-prayer` remains as a
documented save-compatibility ID in content and runtime catalogs. No reviewed
character sheet displays deprecated Heat terminology, but raw IDs remain in
card-art/catalog/test paths and can leak into developer-facing exports or
reports.

Recommendation: retain the alias for old saves, add a canonical-ID migration
at the next save-format boundary, and ensure any debug/export label resolves
through display content rather than the ID.

## Character sheet-to-engine alignment and table-readiness

Ratings: clarity and viability are `Good`, `Watch`, or `Weak`; complexity and
power risk are 1 (low) through 5 (high). "Generic" means the reviewed promise
uses a server generic rule rather than a character-specific action. The
matrix records the material mechanical promise, not purely narrative/private
entries.

| Character | Role / stat line / total | Main strength / weakness | Main resource hook | Tactical exception | Backing | Role / ability / timing / cost / weakness clarity | Solo / co-op / rivalry | Cx | Power | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| Joss Var | leverage broker — C3/G1/S3/U5/F3, 15 | Guile control / fragile in direct fights | Ledger and debt hooks | Trade manipulation | Yes | Good / Good / Good / Good / Good | Good / Good / Good | 3 | 3 | Low |
| Bjornis | red-threat bruiser — C2/G5/S1/U3/F4, 15 | Red battles and pressure relief / Blue Signal weakness | Foam and Fury pressure relief | Firebreak Vow | Yes | Good / Watch / Good / Good / Good | Good / Good / Watch | 3 | 3 | Medium |
| Deepdale | route delver — C1/G3/S4/U2/F5, 15 | Sectors and craft / weak Command | Promised route/Salvage rules | Deep Bargain | No | Good / Weak / Weak / Watch / Watch | Watch / Good / Watch | 3 | 3 | High |
| Ker Von Ker | slow fortress — C1/G5/S1/U3/F5, 15 | High-difficulty Grit and wound prevention / low Command, slow travel | Wound prevention | Shield Breaker | Yes / Generic | Good / Watch / Good / Automatic / Good | Good / Good / Watch | 2 | 3 | Medium |
| Kira | vanguard hound — C3/G5/S1/U4/F2, 15 | Opening battle tempo / low Forge | None | Houndblade Charge | Generic | Good / Watch / Weak / Good / Good | Good / Good / Good | 2 | 3 | High |
| Popelord | hazard scavenger — C3/G5/S1/U2/F4, 15 | Yellow hazards and Mire / low Signal/Guile | Mire generic effects | Compost Cape | Generic | Good / Good / Weak / Good / Good | Good / Good / Watch | 3 | 3 | High |
| Rumi | Signal/Guile skirmisher — C1/G3/S5/U4/F2, 15 | Chosen-technique burst / weak Command/Forge | None | Violet Edge | Generic | Good / Good / Weak / Good / Good | Good / Good / Good | 3 | 4 | High |
| Mira | pressure oathkeeper — C2/G4/S3/U3/F3, 15 | Confrontation burst and pressure conversion / needs Vow economy | Typed Vow Note | Cinder Oath | Yes, inaccessible to player | Good / Watch / Weak / Good server-side / Watch | Weak / Good / Watch | 4 | 4 | High |
| Orenna Tash | convoy commander — C5/G1/S4/U2/F3, 15 | Team routing / low Grit | Convoy hooks | Convoy Law | Yes | Good / Good / Good / Good / Good | Watch / Good / Good | 3 | 3 | Medium |
| Dessa Korr | grave engineer — C1/G3/S2/U4/F5, 15 | Salvage/Forge conversion / weak Command | Coffin-rigging hooks | Grave Spark | Yes | Good / Good / Good / Good / Good | Good / Good / Watch | 3 | 4 | Medium |
| Reskin Hale | oathbroken trickster — C4/G2/S1/U5/F3, 15 | Guile bargaining / weak Signal | Debt and ruin hooks | Crown Debt | Yes | Good / Watch / Good / Watch / Good | Good / Watch / Good | 3 | 4 | Medium |
| Senna Pell | rift cartographer — C1/G2/S5/U5/F2, 15 | Information and routes / weak direct checks | Surveyor hook | Surveyor exception | Yes | Good / Watch / Good / Good / Good | Watch / Good / Good | 3 | 3 | Medium |
| Brask Ode | salvage warden — C2/G3/S1/U4/F5, 15 | Gear and Salvage durability / weak Signal | Salvage hooks | Scrap Bastion | Yes | Good / Good / Good / Good / Good | Good / Good / Watch | 3 | 4 | Medium |
| Dr. Yuna Castell | siege medic — C3/G3/S2/U2/F5, 15 | Wound management / limited Signal/Guile | Triage and Scar hooks | Amber Draught | Yes | Good / Watch / Good / Watch / Good | Good / Excellent / Watch | 3 | 4 | Medium |
| Lane | Signal witch — C1/G2/S5/U4/F3, 15 | Blue anomaly control / weak Command/Grit | None | Hush Static | Generic | Good / Good / Weak / Good / Good | Good / Good / Good | 3 | 3 | High |
| Tarek Voss | void marshal — C5/G3/S2/U2/F3, 15 | Command and team order / weak Signal/Guile | Marshal hook | Marshal Presence | Yes | Good / Good / Good / Good / Good | Good / Good / Good | 3 | 3 | Low |

## Required named-hook review

| Hook | Server authority, cost, limits, rejection | Test quality | Assessment |
| --- | --- | --- | --- |
| Bjornis — Firebreak Vow / Foam and Fury | Deterministic modifier and post-victory pressure relief; once-per-round event guard. | No focused real-path coverage found. | Mechanics align; add direct positive/negative window tests. |
| Ker — Shield Breaker / Hold the Line / slow movement | Deterministic server modifiers, first-Wound prevention, and minimum-die movement. | Existing engine coverage is broader than content loading, but anti-explode behavior lacks a relevant enemy-die path. | Playable; clarify or defer Iron Bulwark. |
| Kira — Houndblade Charge | Server modifier, no cost, intended first-battle limit. | No test for unrelated prior test followed by battle. | Timing defect above. |
| Popelord — Compost Cape / Mire | Server generic rules, no client trust. | No first-yellow-after-unrelated-roll test. | Timing defect above. |
| Rumi — Violet Edge | Server modifier, once-per-round by event state, no payment promised. | Has a modifier fixture; misses the actual eligibility-window regression. | Timing defect above. |
| Lane — Hush Static | Server difficulty modifier, no payment promised. | No first-Blue-after-unrelated-roll test. | Timing defect above. |
| Mira — Cinder Oath / Vow package | Cost and reject paths are explicit; once-per-round and confrontation +2 are server resolved. | Tests cover direct spend, unavailable rejection, repeat rejection, and confrontation effect, but manually seed Vow and bypass phone transport/gain path. | P0 controller gap and P1 gain/trigger mismatches. |

No reviewed hook relies on the client for final resolution, and the event-log
based limits avoid a multiplayer desync risk. The missing controller route is
still a practical multiplayer failure: a real remote player cannot invoke
Mira's otherwise valid server action.

## Vow Notes and named-note audit

`noteResourceSchema` permits only the typed `vow` resource. The Cinder Monk is
the only character sheet that tells a player to spend a named Note. The server
tracks it privately, rejects a Cinder Oath at zero, spends exactly one, and
does not allow a second use in the round. Other renamed notes read as private
narrative, route, leverage, or triage entries and do not tell a player to
spend/use a Note.

This meets the typed-resource design at the server/schema layer, but not at
the phone-controller layer. It should not be called table-ready until the
player can inspect and spend the typed private resource through normal play.

## Bjornis and Ker differentiation

The validated profiles are:

| Character | Command | Grit | Signal | Guile | Forge | Total | Resulting play pattern |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bjornis | 2 | 5 | 1 | 3 | 4 | 15 | Flexible red/fire bruiser who converts red wins into pressure relief, but risks Blue Signal threats. |
| Ker Von Ker | 1 | 5 | 1 | 3 | 5 | 15 | Slower fortress with the strongest Forge profile, high-difficulty battle support, and first-Wound prevention. |

They no longer overlap as a stat profile or route decision. Bjornis seeks red
threats and Cinder Fields, trades flex/Forge for an exploitable Blue weakness,
and improves team pressure. Ker favors difficult enemy encounters, durable
gear/Forge routes, and controlled pace; the minimum movement die makes his
positioning cost real. Neither obsoletes the other. The only caveat is that
Ker’s anti-explosion line presently has no observable niche.

## Deprecated Heat terminology

Character-facing content uses Ashen Reach language: **Scar-Sink Prayer** is
the visible relic and no reviewed character-sheet ability uses `Heat`.
`heat-sink-prayer` remains only as a commented legacy compatibility ID, while
legacy `heat` data fields remain for saves. This is acceptable compatibility
debt for the release candidate only if raw IDs are kept out of player-facing
UI, reports, and export labels. The character roster itself passes that test.

## Release grouping

### Ready for playtest (7)

Joss Var, Ker Von Ker, Orenna Tash, Dessa Korr, Reskin Hale, Brask Ode, and
Tarek Voss have a coherent current role with server-backed or clearly generic
mechanical paths. Ker should receive the non-blocking wording follow-up noted
above.

### Needs wording polish before playtest (3)

Bjornis, Kira, and Senna Pell. Their descriptive/private exceptions should be
visually and verbally separated from active rules so players do not hunt for a
missing action.

### Needs light mechanical tuning before release-candidate sign-off (5)

Deepdale, Popelord, Rumi, Dr. Yuna Castell, and Lane. Deepdale has unbacked
mechanical text; Popelord/Rumi/Lane have the first-eligible timing defect;
Yuna's existing Scar/triage paths need scenario-path coverage before raising
confidence to release level.

### Needs heavy redesign (0)

None. The work is targeted alignment and coverage, not a roster rewrite.

### Blocked from release-candidate sign-off (1)

Mira. Her server rule is close, but the missing phone route and pressure/Vow
trigger mismatches are material to her core identity.

## Regression-risk register

| Risk | Current exposure | Recommendation |
| --- | --- | --- |
| Old saves / legacy IDs | `heat-sink-prayer` and `heat` compatibility are deliberately retained. | Test old-save load plus canonical visible display before migrating IDs. |
| Multiplayer synchronization | Rule authority and limits are server/event-log based. | Preserve that design; add the missing phone protocol test rather than client prediction. |
| Vow tracking | Typed resource is optional/private and server-tested only with manually seeded state. | Test gain, projection, spend, reconnect, zero rejection, and round reset in one flow. |
| Pressure/scar language | Internal Heat compatibility may leak through raw identifiers; Mira pressure causes are too broad. | Resolve display through content and type the pressure-increase cause. |
| Route-note ambiguity | Most named notes are now narrative, but descriptive-only entries can still look actionable. | Apply a consistent "narrative/private entry" presentation treatment. |
| Character intent validation | Generic first-roll helper is too coarse. | Add each ability's eligible-window test, including irrelevant first roll. |
| Test false confidence | Green content tests and direct server tests miss controller and real gain paths. | Add end-to-end protocol tests; do not rely on fixture-only modifier assertions. |

## Recommended next gate

Before calling this roster release-candidate ready: (1) complete Mira’s
private-phone resource/action route, (2) replace the generic first-roll guard
with ability-specific eligible windows, (3) align Mira’s three Vow/pressure
triggers, (4) resolve Deepdale's unbacked mechanical wording, and (5) add
real-path tests for each item. These are contained follow-ups; no broad
character redesign is indicated.

## Verification

All requested checks passed after the report was written:

| Command | Result |
| --- | --- |
| `npm.cmd run validate:content` | Passed — 17 character files (16 playable plus QA-only MASTER ALPHA) and all authored content validated. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run test:engine` | Passed — 14 files, 231 tests. |
| `npm.cmd run test` | Passed — 57 files, 633 tests (completed in 155 seconds; the first 120-second invocation was rerun with a sufficient timeout). |
| `npm.cmd run audit:assets` | Passed — 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets. |
| `npm.cmd run build` | Passed — production Vite build completed. |
| `git diff --check` | Passed — no whitespace errors. Git emitted only existing line-ending warnings for the protected dirty phone/style files. |

These checks establish repository integrity. They do not erase the gameplay
alignment findings above, which come from code-path and sheet-text review.
