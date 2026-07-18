# Heat Retirement H6B — False Route Procession implementation

Status: **IMPLEMENTED** on `phase/heat-retirement-1x` from approval commit `00b38f9`.

Stable ID: `false-route-procession`.

## Implemented rule

> If you lose, move 1 sector clockwise or counterclockwise on your current ring. Choose from the legal destinations. If only one is legal, move there. If neither is legal, remain in place.

The obsolete `gain_heat 2` failure was replaced in place by one typed `ownerSelectedForcedDisplacement` effect. Card ID, title, Yellow hazard identity, Command 7 difficulty, severity 2, artwork mapping, success note, graph membership, rarity, and card totals remain unchanged. The card has no Wound, Scar, Salvage, escalation, reward, or Trophy replacement.

## Destination-choice state and authority

Final failure creates one persisted `pendingForcedDestinationChoice` containing the affected owner, `false-route-procession` source, source resolution/event, source sector, canonical ring, ordered candidate records, distance 1, same-ring policy, and creation/status data. The server issues the choice ID and accepts only the affected owner's authenticated selection of one stored candidate. The chosen destination becomes immutable when the choice atomically becomes the existing pending forced-displacement consequence.

Submission revalidates seat, choice, active Threat/resolution, source sector, operative status, stored membership, direction, and current legality. A forged, wrong-seat, stale, duplicate, or no-longer-legal selection changes no state. If another authoritative lifecycle has already moved or recalled the operative, the choice closes without displacement or substitute penalty and the source event completes once.

## Candidate generation

The server reads canonical board-node ring metadata and canonical ring order. It evaluates the immediate clockwise neighbor first and counterclockwise neighbor second. Each candidate must be exactly one legal graph step, share the source's outer/middle/inner ring, be connected under current topology, differ from the source, and pass the existing movement-step legality predicate. Candidate IDs are deduplicated in deterministic order.

Inward, outward, branch-only, cross-ring, and center connections are never candidates. The center produces zero candidates. An inner-ring sector adjacent to center still offers only its legal same-ring neighbors. Blocked directions are omitted without skipping farther around the ring. One surviving candidate remains a mandatory owner confirmation. Zero candidates create no private choice or Rift Anchor window; the operative stays in place and the result is `No false route was available.`

No board node, connection, map record, scenario-finale rule, or movement-planner route contract changed.

## Forced displacement and Rift Anchor Spike

After the owner selects a destination, H6B opens the existing authoritative forced-displacement lifecycle with one source event, one stable reaction ID, and the locked destination. Rift Anchor Spike becomes eligible only at this stage. A valid reaction spends one charge once and prevents the entire displacement. It does not change the destination, spend movement, or create a fallback. Invalid, stale, and duplicate reactions spend nothing.

Accepting displacement updates sector/current-space once, records source completion once, and schedules one existing `pendingDisplacementArrival`. Movement allowance and normal movement roll are untouched. Normal route planning, voluntary movement modifiers, voluntary item triggers, arbitrary map selection, and cross-ring travel do not open.

## Arrival, Contract, and mission behavior

The existing forced-displacement arrival pipeline remains authoritative: public movement projection, occupation state, eligible persistent tile challenge, and ordinary sector exploration/Threat entry each occur through their existing single handoff. H6B adds no tile-entry, encounter-draw, challenge, animation, Contract, mission, or scenario hook.

Because the reducer does not dispatch voluntary `MOVED`/route actions, the displacement does not advance voluntary sector-visited, route-selection, movement-distance, or movement-roll objectives. `completedContracts` is unchanged. Only an already-existing explicitly forced-movement-aware observer could see the standard forced arrival; H6B adds none.

## Reconnect, replay, and privacy

Before selection, reconnect reconstructs the persisted source and ordered candidates for the owner only. After selection, the existing pending displacement reconstructs the locked destination and Rift Anchor state. After commitment, the existing pending arrival and resolved-source ledger prevent choice, reaction, movement, and arrival replay.

Public projection exposes only that the named owner is choosing a False Route. Candidate IDs, directions, and names remain private until selection. The owner phone receives server-generated candidate names/directions/ring labels and submits the issued choice ID plus one candidate ID. Other phones receive no controls. After selection, TV may show the public direction/destination and existing prevention/result feedback; internal source, choice, reaction, and inventory details remain hidden.

## Focused coverage

Focused H6B tests cover:

- exact content identity, wording, typed effect, Heat removal, and no Wound/Scar fallback;
- outer/middle/inner candidate ordering, same-ring/center/cross-ring exclusion, deduplication, one candidate, and zero candidates;
- persisted choice schema and reconnect-safe projection;
- owner-only candidates, public-safe TV wait, and phone intent payload;
- wrong-seat, forged, stale-source, stale-choice, duplicate-choice, and duplicate-displacement rejection;
- immutable destination, reaction-after-selection timing, one move, one pending arrival, and one completed source event;
- Rift Anchor prevention, one charge spend, no fallback, and replay rejection;
- unchanged movement roll/allowance and `completedContracts` state;
- existing B2A displacement cards and the three remaining blocked definitions.

## Playtest risks

Severity remains 2. The bounded owner choice can occasionally redirect into a useful shop or objective sector, while ordinary forced-arrival pressure still applies and no voluntary movement progress is awarded. The main playtest watchpoints are destination benefit variance across the five current graph references, clarity that the choice is still forced movement, and the duration of the private selection/reaction sequence. No reward rebalance is included.

## Verification

- `npm.cmd run validate:content` passed and confirmed Red 26, Blue 35, Yellow 48, overall 109 Threats.
- `npm.cmd run typecheck` passed.
- Focused H6B, forced-displacement, movement/topology, Rift Anchor Spike, reconnect/privacy, and Contract/mission regression coverage passed: 10 files, 191 tests.
- Prior Heat-retirement regression coverage passed: 8 files, 198 tests.
- `npm.cmd run test:engine` passed: 47 files, 587 tests.
- The requested `npm.cmd run test:server` alias is not defined. The repository's server suite, `npm.cmd run test:integration`, passed: 26 files, 226 tests.
- `npm.cmd run test:client` passed: 26 files, 257 tests.
- `npm.cmd run test` passed: 99 files, 1,070 tests.
- `npm.cmd run audit:assets` passed: 404 of 404 assets present, with no invalid, placeholder, or release-blocking assets.
- `npm.cmd run build` passed.

## Scope confirmation

H6B changes only `false-route-procession` content, the narrow persisted owner-choice bridge into existing forced displacement, focused projections/presentation, validation, tests, and Heat-retirement reports. The three remaining blocked cards stay unchanged: `gateblind-pulse`, `marrow-tax-auditors`, and `memory-tax-gate`. The +116-card expansion remains unapproved.
