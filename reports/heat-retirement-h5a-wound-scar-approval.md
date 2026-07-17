# Heat retirement H5A: severe Wound and Scar approval

Status: APPROVED in H5A and IMPLEMENTED in H5B. The sealed severity decision remains the authority for `ashen-doppelganger` and `hymn-scarred-zealot`; implementation evidence is recorded in `reports/heat-retirement-h5b-severe-wounds.md`.

## Decision summary

H5A approved both cards as one implementation group because both use the existing authoritative, owner-scoped, preventable-Wound lifecycle without schema or resolver work. H5B has now implemented that shared group.

- `ashen-doppelganger`: on combat loss, suffer **2 Wounds**.
- `hymn-scarred-zealot`: on combat loss, suffer **1 Wound**.
- Neither card directly grants, selects, schedules, or names a Scar. A Scar occurs only through the existing Wound-threshold recall lifecycle.
- `false-route-procession`, `gateblind-pulse`, `marrow-tax-auditors`, and `memory-tax-gate` remain blocked. H5A makes no decision for them.
- H1 through H4C remain implemented and unchanged.

The selected rules replace compatibility-only Heat no-ops with real attrition. That is an intentional severity increase, not an attempt to preserve the old branch's current mechanical strength.

## Card inspection

| Evidence | `ashen-doppelganger` | `hymn-scarred-zealot` |
|---|---|---|
| Display name | Ashen Doppelganger | Hymn-Scarred Zealot |
| Lane / type | Blue / enemy | Red / enemy |
| Region / rarity | inner / uncommon | outer / common |
| Standard, elite, or special | ordinary enemy record; not authored as elite or special | ordinary enemy record; not authored as elite or special |
| Test and difficulty | Guile 11 | Grit 3 |
| Current success | defeat | defeat plus the existing silencing note |
| Current failure | `gain_heat 2` on combat loss | `gain_heat 1` on combat loss |
| Reward / trophy | automatic 3 Trophy points plus a 3-value Trophy Pile entry, followed by the authored `gain_trophy 3` defeat reward; 6 Trophy points total | automatic 1 Trophy point plus a 1-value Trophy Pile entry; authored defeat reward is the silencing note only |
| Exact legacy clause | `woundOnLoss: { type: gain_heat, amount: 2 }` | `woundOnLoss: { type: gain_heat, amount: 1 }` |
| Current runtime | parsed for compatibility; no player-facing status change | parsed for compatibility; no player-facing status change |
| Intended pressure | severe mirrored bodily injury and lasting-risk fiction | physical pressure from a common Choir footsoldier |
| Canonical graph frequency | 3 references | 1 reference |
| Closest overlaps | `throne-soot-knight`, `mirror-lord-envoy`, `gate-choir-executioner` | `lantern-ash-ghoul`, `cracked-censer-novice`, `ash-cinder-runt` |
| Authored/runtime mismatch | scar fiction currently resolves as a Heat compatibility no-op; automatic trophy award plus authored `gain_trophy 3` produces 6 Trophy points from a card with trophy value 3 | card text says defeat broadcasts the hymn, while the defeat note says the Zealot was silenced; the loss branch is the only legacy consequence |

## Severity evidence

Neither card has a unique-once or special-only contract. Ashen's three graph references mean repeat exposure must be treated as possible rather than dismissed as a boss exception; Hymn has one graph reference. Once its battle is engaged, neither approved consequence has a payment or opt-out. Avoidability comes from winning the battle and mitigation comes from the normal Wound prevention pipeline.

| Factor | `ashen-doppelganger` | `hymn-scarred-zealot` |
|---|---|---|
| Expected Wound state | no authored precondition; verify every state from unwounded through one below threshold | no authored precondition; verify unwounded and threshold-adjacent states |
| Equipment/ability mitigation | normal eligible prevention remains available; Grit-only mitigation is not broadened to this Guile battle | normal eligible prevention remains available, including existing effects that already apply to a Grit battle |
| Requested Wounds | 2 in one preventable request | 1 preventable request |
| Recall likelihood | material: any actual delta that fills the remaining threshold recalls; full or partial prevention can avoid it | ordinary: recalls only when the actual 1 Wound fills the remaining threshold |
| Scar likelihood | only when the existing threshold recall occurs | only when the existing threshold recall occurs |
| Reward relative to risk | 6 Trophy points in current runtime plus a 3-value Trophy Pile entry, difficulty 11, inner uncommon; closest severity-4 inner peer already uses 2 Wounds | 1 Trophy point plus a 1-value Trophy Pile entry, difficulty 3, outer common; common low-difficulty peers use 1 Wound |
| Persistence | normal Wounds and any threshold Scar only | normal Wounds and any threshold Scar only |
| Multiplayer impact | owner-scoped; may contribute to ordinary all-players-recalled defeat | owner-scoped; no table-wide hymn effect |
| Removal from board | possible only through the normal threshold recall | possible only when already threshold-adjacent and prevention does not stop the Wound |
| Approved severity | **4**, explicitly justified below | **2**, proportionate routine setback |

The authoritative Wound threshold is 4 in single-player and 3 in multiplayer. With no prevention, Ashen's 2-Wound request recalls an operative who starts the consequence at 2 or more Wounds in single-player, or 1 or more in multiplayer. If 1 Wound is prevented, Ashen has the same threshold profile as Hymn: the remaining 1 actual Wound recalls only from 3 Wounds in single-player or 2 in multiplayer. Full prevention produces no actual delta and cannot cause recall. Hymn's single requested Wound uses that same 3/2 threshold-adjacent profile. Starting Wounds are never used as an eligibility gate; they affect only the existing post-delta threshold check.

Ashen's severity-4 approval is exceptional but justified by the combined difficulty 11, inner/uncommon placement, unusually high current runtime reward, severe injury fiction, and direct comparison to `throne-soot-knight` (difficulty 10, inner uncommon, severity 4, 3 Trophy points, 2-Wound loss). Three graph references keep its balance risk high; they do not justify reducing it to a generic 1-Wound consequence that would undercut the closest benchmark. The authored/runtime reward mismatch is material: combat victory automatically awards 3 Trophy points and a 3-value Trophy Pile entry, then the authored `gain_trophy 3` reward adds another 3 points. H5A preserves that existing result because reward changes are out of scope and recommends a separate balance approval. H5B must preserve the focused recall-frequency checkpoint and must not increase reward, difficulty, or frequency.

## Authoritative lifecycle contract

Both rules enter the existing combat-loss effect path as one `take_wound` effect. The server requests the authored amount, applies the normal prevention/reaction pipeline, commits only the actual Wound delta, and then checks the ordinary Wound threshold.

- Prevention is not bypassed. Existing eligible Equipment, character, and reaction effects keep their current applicability and amount.
- Ashen Doppelganger's 2 Wounds are one atomic request, not two sequential effects or two prevention windows.
- Threshold evaluation happens after the final actual delta. Reaching the threshold invokes the existing recall exactly once and awards exactly one normal Scar through that lifecycle.
- Neither card writes Wounds directly, uses `pendingScarConsequence` as a shortcut, or creates a bespoke Scar prompt.
- Pending prevention survives reconnect under the existing effect lifecycle. Once resolved, the source cannot be replayed to apply the Wounds twice.
- Normal recall, replacement, room cleanup, session cleanup, all-players-recalled defeat, and the existing MASTER ALPHA exception remain authoritative and unchanged.

## Option analysis: `ashen-doppelganger`

Card evidence: Blue enemy; Guile 11; severity 4; inner uncommon; 3 graph references; automatic 3 Trophy points plus a 3-value Trophy Pile entry and an authored additional 3-Trophy reward. Its fiction calls for a severe mirrored injury. Comparable inner enemies already use 2-Wound losses, including the closest mechanical benchmark at difficulty 10, severity 4, uncommon, and 3 Trophy points.

| Option | Assessment | Decision |
|---|---|---|
| 1 preventable Wound | Clear and fully supported, but underweights the inner uncommon difficulty, reward, and closest 2-Wound peer. | Reject |
| 2 preventable Wounds | Matches the severe injury fiction and closest inner-enemy benchmark while using the existing lifecycle. | **Select** |
| 1 Wound, then a conditional second Wound | Adds ordering, snapshot, reconnect, and recall-stop questions without producing a better rule. | Reject |
| Wound plus a mirrored-stat or temporary penalty | Requires bespoke strongest-stat/tie logic or duplicates temporary-modifier families. | Reject |
| Remove without replacement | Leaves a high-difficulty inner enemy's loss consequence mechanically empty. | Reject |
| Player choice between injury consequences | Adds a dominant-choice and private-choice lifecycle to a consequence that is already clear. | Reject |

If the conditional-second-Wound option were ever reconsidered, it would require a pre-effect Wound snapshot, not a post-prevention test; one ordered source consequence with a persisted stage cursor; a separate normal prevention window for each 1-Wound stage; and a hard stop before stage two if stage one causes recall, Scar resolution, defeat, or leaves no active operative. Reconnect would resume at the stored stage and source deduplication would reject replay. H5A rejects that machinery because the single atomic 2-Wound request is clearer and cannot accidentally apply two independent consequences or four Wounds.

### Exact approval block: `ashen-doppelganger`

- Stable ID: `ashen-doppelganger`.
- Current Heat behavior: combat loss `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: severe mirrored bodily injury with a credible chance of lasting consequences through normal recall.
- Selected retirement model: normal preventable Wound pressure.
- Trigger: after the authoritative final combat loss.
- Requested Wounds: 2 in one atomic `take_wound 2` request against the losing owner.
- Preventability: yes; one normal prevention/reaction pass applies to the request.
- Conditional second consequence: none.
- State-check timing: no pre-Wound eligibility check; the normal threshold check runs only after the final actual delta.
- Final player-facing failure rule: **If you lose this battle, suffer 2 Wounds.**
- Reward: unchanged; victory automatically grants 3 Trophy points and a 3-value Trophy Pile entry, then the authored `gain_trophy 3` reward grants another 3 points. The 6-point runtime result is recorded as a separate balance-review concern, not changed in H5A.
- Recall behavior: prevention may avoid recall; otherwise existing threshold logic recalls once after the actual delta. There is no second stage to stop.
- Scar interaction: normal threshold recall may award exactly one normal Scar; no direct card Scar. Existing Scar resolution and reconnect handling complete before finalization as normal.
- Defeat behavior: no card-specific defeat command; existing all-players-recalled and no-active-operative rules remain authoritative.
- Persistence and reconnect: only existing pending-effect, Wound, recall, and Scar state; resolve exactly once.
- Multiplayer: owner-scoped. Any resulting table defeat comes only from the existing all-players-recalled rule.
- Typed runtime support: existing `take_wound` effect and normal prevention/recall/Scar lifecycle.
- Duplicate-source protection: existing authoritative encounter/effect identity must reject stale, duplicate, and replayed resolution.
- Reconnect behavior: pending prevention or Scar resolution persists through existing state; committed Wounds are not reapplied.
- Required typed extensions: none.
- Severity: 4. The possibility of an immediate recall is accepted.
- Complexity: low runtime complexity; high focused-test burden.
- Balance risk: high, because a former no-op becomes a 2-Wound loss and appears in three canonical graph references.
- Approval status: **APPROVED H5A — IMPLEMENTED H5B**.

## Option analysis: `hymn-scarred-zealot`

Card evidence: Red enemy; Grit 3; severity 1; outer common; 1 graph reference; 1-Trophy value. Comparable outer/common Red and difficulty-3 enemies routinely use a 1-Wound combat loss. The current prose says defeating the Zealot broadcasts the hymn while its defeat reward says the hymn was silenced; that wording conflict does not justify moving the consequence to success or assigning a Scar.

| Option | Assessment | Decision |
|---|---|---|
| 1 preventable Wound on combat loss | Standard Red physical pressure, clear timing, existing prevention, and no new persistence. | **Select** |
| 1 Wound plus a conditional pending Scar | Duplicates the Scar already produced by threshold recall and overstates a common outer enemy. | Reject |
| Direct or exceptional Scar | Disproportionate, lacks a justified trigger or named selection contract, and risks double-Scar outcomes. | Reject |
| Temporary hymn modifier | Duplicates established delayed-modifier families and is a poor fit for a basic Grit enemy. | Reject |
| Global/shared escalation | Makes a routine personal combat loss table-wide and scales sharply with player count. | Reject |
| Remove without replacement | Leaves an ordinary Red enemy loss mechanically empty despite clear 1-Wound peers. | Reject |

No exceptional Scar trigger survives review: the card authors no failure-margin branch, “already threshold-adjacent” merely recreates the normal Wound-to-recall result, there is no substantial cost choice, and the card is neither elite nor special. A direct or pending Scar would therefore add persistence without meaningful avoidability and could duplicate the threshold Scar.

### Exact approval block: `hymn-scarred-zealot`

- Stable ID: `hymn-scarred-zealot`.
- Current Heat behavior: combat loss `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: ordinary physical combat pressure from a common Choir footsoldier; victory silences the hymn.
- Selected retirement model: normal preventable Wound pressure.
- Trigger: after the authoritative final combat loss.
- Requested Wounds: 1 through `take_wound 1` against the losing owner.
- Preventability: yes; the normal prevention/reaction pipeline can fully prevent it.
- Direct Scar effect: none.
- Normal recall/Scar interaction: after the actual delta, existing threshold logic may recall once and award exactly one normal Scar.
- Exceptional trigger: none.
- Final player-facing failure rule: **If you lose this battle, suffer 1 Wound.**
- Reward: unchanged; victory automatically grants 1 Trophy point and a 1-value Trophy Pile entry, while the authored defeat reward retains only the silencing note.
- Authored clarification for implementation: failure causes the Wound; defeat silences the hymn. No success-side broadcast consequence is approved.
- Persistence and reconnect: only existing pending-effect, Wound, recall, and Scar state; resolve exactly once.
- Multiplayer: owner-scoped. No shared hymn state or Global Escalation.
- Typed runtime support: existing `take_wound` effect and normal prevention/recall/Scar lifecycle.
- Duplicate-source protection: existing authoritative encounter/effect identity must reject stale, duplicate, and replayed resolution.
- Reconnect behavior: pending prevention or Scar resolution persists through existing state; committed Wounds are not reapplied.
- Required typed extensions: none.
- Severity: 2 for the replacement consequence; the base card remains severity 1.
- Complexity: low.
- Balance risk: moderate. This changes a no-op into normal attrition, but the card has one graph reference and matches common peers.
- Approval status: **APPROVED H5A — IMPLEMENTED H5B**.

## Scar guard

H5A expressly rejects `gain_scar`, a named Scar award such as Bell-Deafened, a Scar choice, and a card-created pending Scar consequence. The word “Scarred” in a title and lasting-injury fiction are not sufficient to bypass the shared Wound-threshold rule. If either approved Wound amount reaches the threshold, the normal recall lifecycle owns the resulting one-Scar outcome.

This guard prevents a single loss from creating both a direct card Scar and the threshold Scar, keeps prevention meaningful, and preserves the established distinction between taking Wounds and resolving consequences attached to Scars a player already owns.

## Four-seat critique

| Card | New player | Optimizer | Family/casual | Rules lawyer |
|---|---|---|---|---|
| Ashen Doppelganger | “Lose: 2 Wounds” is immediate and readable, though intentionally severe. | Prevention remains valuable; the result cannot be split into exploitable stages. | The consequence resolves quickly even when it causes recall. | One atomic request, one prevention pass, actual delta, then one threshold check; no direct Scar. |
| Hymn-Scarred Zealot | “Lose: 1 Wound” matches ordinary combat expectations. | No success-side penalty or persistent hymn state to manipulate. | A common outer enemy stays fast and physical rather than adding lasting bookkeeping. | Loss owns the Wound; defeat owns the silencing note; normal threshold recall is the only Scar route. |

## Grouping and future implementation contract

Implement both cards together as **H5B — severe Wound consequences**. They share the same existing `take_wound` resolver and differ only in amount. No shared infrastructure extension is approved or expected.

Recommended implementation commit subject: `feat: retire severe heat threats with wound consequences`.

Focused verification for H5B must cover:

- exact content effect, player text, totals, graph references, rewards, trophies, and stable IDs;
- Ashen requested/prevented/actual amounts for no prevention and partial prevention;
- Ashen starting Wound states around the threshold, with recall once and Scar once;
- proof that Ashen's atomic 2-Wound request cannot become two requests or four Wounds;
- Hymn full prevention, normal 1-Wound application, threshold recall, and no direct Scar;
- reconnect during pending prevention and rejection of stale, duplicate, or replayed resolution;
- owner-only projections, public result summaries, existing MASTER ALPHA handling, and ordinary all-players-recalled defeat behavior;
- unchanged success rewards and no new Heat, Risk, Scar-choice, shared-hymn, or escalation state;
- unchanged H1 through H4C behavior and unchanged raw blobs for the four still-blocked IDs.

Then run `npm.cmd run validate:content`, `npm.cmd run typecheck`, the focused Threat/content tests, `npm.cmd run test:engine`, `npm.cmd run test`, `git diff --check`, and `git diff --cached --check`.

## Remaining blocked register

H5A does not reinterpret or advance these cards:

| Stable ID | Still-blocked issue |
|---|---|
| `false-route-procession` | exact authoritative destination/direction, topology fallback, and reconnect target behavior |
| `gateblind-pulse` | solo/multiplayer escalation cap, threshold timing, and duplicate-pattern interaction |
| `marrow-tax-auditors` | four-reference Salvage-starvation risk after H3 |
| `memory-tax-gate` | exact competitive private choice, ownership, projection, cancellation, and reset contract |

False Route remains a separate later approval and is not part of the H5A/H5B Wound group.
