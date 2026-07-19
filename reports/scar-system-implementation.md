# Complete Scar System Implementation

## Outcome

Ashen Reach now has one canonical 24-card Scar library. A Scar is a permanent cursed adaptation: it carries one typed Burden and one narrower typed Adaptation. New authored effects request a source category rather than naming a result card, and the server offers exactly two globally unowned candidates in deterministic deck order.

The implementation preserves save version 2, accepts legacy v0-v2 exact-Scar actions through the inert compatibility boundary, leaves Heat retired, and does not alter the 109-card Threat population or board topology.

## Authoritative lifecycle

1. A typed `gain_scar_choice` effect names a source and stable source-card ID.
2. The server suppresses duplicate source events and builds an exact two-card offer.
3. Source-matching cards are preferred, then Unbound, then remaining deterministic deck order.
4. Only the owner receives selection controls. TV and other phones receive public waiting information.
5. `CHOOSE_SCAR` contains only the offer ID and one offered stable Scar ID.
6. The selected Scar becomes owned, the rejected Scar returns to the bottom of its source deck, and on-gain effects run once.
7. Typed Burden/Adaptation rules become active through the shared rule evaluator and scoped usage ledger.
8. A third Scar queues threshold resolution until the current resolution stack is clear.
9. The default policy retires the operative, returns all three cards, clears their usage, and enters normal replacement recruitment.

Production scenarios use the default `retire` policy. The scenario definition contract now exposes optional `retire | transform | custom`; non-retire policies reject unless a typed scenario handler is authored, so a data-only flag cannot fabricate a transformation. Focused tests inject synthetic typed transform and custom handlers and prove the dispatcher invokes only the selected handler.

## Content

- 24 cards total: Flesh 6, Mind 6, Machine 6, Rift 4, Unbound 2.
- Preserved stable IDs for the original 15 cards.
- Added nine original cards: Parasite Crown, Shrapnel Memory, Iron Gospel, Hollow Reflection, Rift-Eye, Split Horizon, The Voice Below, Ash Hunger, and Borrowed Name.
- Added nine original square artworks under `public/assets/cards/scars/` and registered them through the normal asset catalogs.
- Migrated all 17 current authored Scar gain sources to typed source choices.
- Current content validation rejects exact authored `gain_scar`, Heat metadata/effects, missing executable rules, invalid source distributions, and missing artwork.

## Persistent rules

`scarPersistentRules.ts` owns 48 typed keys—one Burden and one Adaptation for every card. It consumes structured encounter context only; it never interprets prose. Limits are recorded by owned Scar, rule key, seat, event, and turn/round/battle/visit/game scope.

Live server integration covers roll modifiers, assistance blocks and contribution reduction, service surcharges, Trophy reduction, Equipment exhaustion, Wounds, Salvage, contract completion recovery, escalation consequences, cross-ring tolls, and graph-validated forced-displacement extension. Choice-bearing Adaptations remain optional and are never silently auto-used. The shared owner-control resolver derives their exact timing window, legal targets, remaining use and canonical disabled reason from authoritative state. Typed `USE_SCAR_ADAPTATION` intents are owner-validated, append one usage event, survive reconnect, and reject stale or repeated activation.

## Removal

The Sable Machine Choir at `middle_scar_surgery` offers one owner-private purification per arrival:

- exact cost: 4 Salvage;
- exact owned Scar selection;
- insufficient funds reject without mutation;
- removed card and scoped usage return/clear together;
- reconnect restores the pending choice;
- resolved visit IDs prevent replay.

Scar-Sink Prayer remains a consequence-suppression reaction. It does not remove owned Scars and is not a purification substitute.

## Presentation

Phone shows a dedicated `CHOOSE YOUR SCAR` decision above navigation with both cards, source, full Burden/Adaptation text, current count, explicit confirmation, and a third-Scar retirement warning. Owned details remain available in Player Card and Inventory. Purification uses the same owner-private decision shell.

Optional Adaptations now appear only on their owner's phone in the relevant battle, check, consequence, displacement, choice, Trophy-spend, or action window. Each control names the Scar, states its exact effect and remaining use, exposes only server-projected targets, and remains visible with a canonical disabled reason after consumption. Rerolls identify the exact die; charge restoration and displacement choices identify exact legal targets. The shared TV never receives actionable controls.

TV uses the public `THE WOUND DID NOT CLOSE` framing with the affected operative, origin/source, and both public cards. It never exposes selection controls. Reduced motion removes transitions without removing information.

Admin Library supports Scar source filtering and structured source, origin, Burden, Adaptation, on-gain, limit, removal, and artwork fields. Text without a typed rule is flagged.

Simulation Lab now understands `gain_scar_choice`, pauses on a detached choose-Scar prompt, validates the offered choice, and shows deck/ownership/threshold mutations without touching the live room. Saved and unsaved Scar simulations can own the selected Scar and invoke its canonical owner-control seam; the detached trace records `SCAR_ADAPTATION_ACTIVATED` and the resulting modifier/effect without mutating a live session.

## Compatibility and boundaries

- Save version remains 2.
- New fields are optional with safe defaults.
- Legacy exact Scar records remain readable; new content cannot author them.
- Normal recall below three Scars carries the existing Scar track through replacement.
- No Heat field, effect, cost, threshold, or loss rule was added.
- No Threat, Artifact, Equipment, Follower, topology, economy, or confrontation count changed.

## Files changed

The implementation is concentrated in Scar content/schema/rules, engine actions and reducer, room projections/resolvers, phone/TV/Admin presentation, deterministic QA fixtures, generated Scar asset registries, focused tests, and these reports. The pre-existing uncommitted Admin Simulation Lab remains uncommitted and was extended rather than replaced.

## Verification

- `npm.cmd run validate:content`: PASS; 24 Scars, 109 Threats, 30 Artifacts, 71 gear definitions, 24 Followers.
- `npm.cmd run typecheck`: PASS.
- Focused Scar and Simulation owner-control tests: PASS, including owner projection, wrong-seat privacy, once-per-round consumption, exact-die reroll, v2 reconnect persistence, and detached Simulation Lab activation.
- `npm.cmd run test:engine`: PASS, 69 files / 756 tests.
- `npm.cmd run test:rules`: PASS, 11 files / 58 tests.
- `npm.cmd run test:integration`: PASS, 36 files / 320 tests.
- `npm.cmd run test:client`: PASS, 41 files / 368 tests.
- Constituent total: PASS, 146 files / 1,444 tests. This is three tests beyond the earlier 1,441 target because the closure pass added owner-control and detached-lab regression coverage.
- Aggregate `npm.cmd run test`: PASS, 146 files / 1,444 tests in 532.96 seconds.
- Admin Library aggregate timeout: FIXED. The archive mounts a bounded 72-card initial window and folder previews while preserving canonical totals and all folder headings; the full client run completes the Admin Library file 8/8 in 2.37 seconds without raising its five-second test timeout.
- `npm.cmd run build`: PASS.
- Scar browser QA: PASS at 390x844, 1920x1080, 1366x768, owner Adaptation available/used/reconnect, third-Scar, purification, and reduced-motion states. Screenshot review found and corrected one-line truncation of the exact Adaptation effect.
- `git diff --check`: PASS with repository line-ending warnings only; `git diff --cached --check`: PASS with nothing staged.
- `npm.cmd run audit:assets`: PASS, 435/435 assets present, zero missing/invalid/placeholders/release blockers, including all 24 Scar images. The audit now imports CSS-free board asset-path data instead of loading a React component and `HostImage.css` in Node.
