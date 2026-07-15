# Remaining Heat-linked Threat implementation plan

Status: H1 through H6B implemented. Three cards remain blocked.

## Approved implementation groups

### Group H1 — remove obsolete success branches (3) — IMPLEMENTED

- Stable IDs: `cinder-gate-backlash`, `mirror-rot-interference`, `webglass-snarefield`.
- Exact change: remove each compatibility-only `lose_heat` success branch. A success has no additional effect. Existing failure branches remain byte-for-byte unchanged.
- Shared lifecycle: none; ordinary hazard success closes normally.
- Schema changes: none.
- Resolver changes: none.
- Projection needs: no new state or projection; existing success summary must not mention Heat.
- Focused tests: exact three-card content; success closes without a pending effect; existing 2/1/1-Wound failures remain unchanged; stable IDs, lane, type, stat, difficulty, severity, graph, catalog, and art; legacy Heat population decrement; no Heat/Risk wording.
- Implementation risk: low. These branches are already runtime no-ops and their removal creates no replacement effect.
- Recommended commit subject: `feat: remove obsolete heat success branches`.

Implemented as `feat: remove obsolete heat threat effects`. No replacement effect was added.

### Group H2 — normal signal-hazard Wounds (2) — IMPLEMENTED

- Stable IDs: `choir-static-burst`, `lantern-moth-swarm`.
- Exact change: Choir failure becomes `take_wound 1`; Lantern failure becomes `take_wound 1` and its success `lose_heat 1` branch is removed.
- Shared lifecycle: existing normal preventable Wound pipeline, including requested/prevented/actual delta, recall threshold, pending Scar behavior, and authoritative source deduplication.
- Schema changes: none.
- Resolver changes: none.
- Projection needs: existing public outcome and owner prevention/reaction projections only.
- Focused tests: exact content branches; `0 -> 1`; threshold-minus-one to recall; at least one established prevention path; pending prevention reconnect; duplicate/replay rejection; Choir scenario-success progress unchanged; Lantern success closes with no extra effect; graph references 4 and 2; no group Wound.
- Implementation risk: medium. Both add real attrition where Heat was a no-op; Choir’s four graph references deserve an isolated balance checkpoint.
- Recommended commit subject: `feat: retire signal hazard heat as wounds`.

Implemented as `feat: replace heat threats with wound pressure`. Both failures use the existing authoritative `take_wound 1` lifecycle; Choir's success remains scenario progress and Lantern's success has no additional effect.

### Group H3 — bounded Yellow Salvage pressure (3) — IMPLEMENTED

- Stable IDs: `crown-bell-baron`, `pale-contract-collector`, `soot-stained-cutpurse`.
- Exact change: each enemy loss becomes `lose_salvage 1`, described as “lose up to 1 Salvage.”
- Shared lifecycle: existing owner-scoped floor-zero Salvage loss with actual-delta outcome reporting.
- Schema changes: none.
- Resolver changes: none.
- Projection needs: existing owner balance and public result summary; no opponent balance targeting or transfer.
- Focused tests: funded `1 -> 0`; zero remains zero and resolution continues; actual delta summary; wrong/stale/duplicate source rejection; no `encounter_payment`; no `shopTransaction`, Salvage Ledger, mission, or completed-contract event; rewards/trophies unchanged; exact one/two/two graph references.
- Implementation risk: medium. The three losses are thematically direct and bounded, but the economy is tight; land only after H2’s checkpoint and review combined draw exposure.
- Recommended commit subject: `feat: convert collector heat losses to salvage pressure`.

Implemented as `feat: replace heat threats with salvage pressure`. All three losses reuse the existing authoritative floor-zero resolver, report requested/actual/resulting values, and remain isolated from payment, Salvage Ledger, shop, mission, Contract, and relic-trade lifecycles.

### Group H4B — exact-instance Equipment pressure (2) — IMPLEMENTED

- Stable IDs: `relay-husk`, `signal-rotted-engineer`.
- Exact changes: Relay failure suppresses one owner-chosen exact equipped normal Equipment instance through the owner's next Threat; Engineer combat loss suppresses one owner-chosen exact equipped normal Equipment instance during the owner's next battle.
- Shared lifecycle: mandatory owner-private exact-instance choice; normal equipped non-QA `starter`/`standard`/`advanced` Equipment with a meaningful effect; Artifact/carried/consumable/depleted charged/inert items excluded; no-target fallback; suppression of all contributions without item mutation; source/instance dedup; reconnect persistence; item-leave and owner lifecycle cleanup.
- Typed differences: Relay uses `nextOwnerThreatResolved` and excludes its own resolution. Engineer uses `nextOwnerBattleResolved`, is created after final loss, and excludes the just-completed battle.
- Schema/runtime prerequisites: exact equipped-instance identity rather than catalog IDs, pending choice state, suppression records with a typed expiry enum, contribution/activation gates, source events, private/public projections, and centralized cleanup.
- Focused tests: duplicate catalog copies; exact instance selection; stale/duplicate/wrong-owner submission; no target; private projection; reconnect during choice and suppression; passive/conditional/exhaust/activation blocking; no charge/use/state mutation; each expiry; item sale/discard/consumption; unequip/re-equip; recall/replacement/session cleanup; reward/trophy isolation.
- Implementation risk: medium-high. The rules are bounded, but exact instance identity must be fixed at the equipped-state boundary before suppression is wired.
- Recommended commit subject: `feat: retire equipment pressure heat threats`.

### Group H4C — paired Command modifier (1) — IMPLEMENTED

- Stable ID: `siren-relay-echo`.
- Exact change: after final Siren success create `+1`, or after final failure create `-1`, for the owner's next authoritative rolled non-battle Command test.
- Eligible contexts: Command Hazard, tile challenge, Anomaly, scenario, or mission checks that enter the typed check pipeline. Battles, movement, automatic effects, previews, payments, and other seats are excluded.
- Shared lifecycle: one pending Siren source per owner; later Siren result replaces it rather than queues; source appears once per roll breakdown, is reserved to one test-resolution ID, survives its rerolls, and consumes only after the final result/reaction window. Turns and rounds do not expire it; recall/replacement/session/room cleanup does.
- Schema/runtime prerequisites: generalize the source-locked Glass-Chime pending record to typed source ID, label, amount, stat/context eligibility, and resolution reservation while preserving Glass-Chime behavior.
- Focused tests: both branches; replacement/dedup; eligible/excluded contexts; other-seat isolation; normal stacking including Glass-Chime; source breakdown once; existing final clamp; reroll reuse; invalid/stale request; reconnect before/during resolution; recall/replacement/session cleanup.
- Implementation risk: medium. Existing modifier and reroll patterns are close, but Siren must not broaden or regress Glass-Chime eligibility.
- Recommended commit subject: `feat: retire siren relay echo heat effect`.

### Group H5B — severe Wound consequences (2) — IMPLEMENTED

- Stable IDs: `ashen-doppelganger`, `hymn-scarred-zealot`.
- Exact changes: Ashen combat loss becomes one atomic `take_wound 2`; Hymn combat loss becomes `take_wound 1` and defeat retains its silencing note. Existing automatic and authored trophy awards remain unchanged; Ashen's current 6-point runtime reward is recorded for separate balance approval.
- Shared lifecycle: existing authoritative owner-scoped preventable-Wound pipeline, including requested/prevented/actual delta, threshold recall, one normal threshold Scar, source deduplication, and reconnect persistence.
- Scar guard: neither card directly grants, selects, schedules, or names a Scar. No `pendingScarConsequence` extension is approved.
- Schema changes: none expected.
- Resolver changes: none expected.
- Projection needs: existing owner prevention/reaction projection and public result summary only.
- Focused tests: Ashen atomic amount and partial prevention; threshold-adjacent starting states; recall once/Scar once; no doubled request; Hymn full prevention and threshold handling; reward/trophy preservation; reconnect and replay rejection; owner isolation; no direct Scar/shared hymn/escalation state; four blocked raw blobs unchanged.
- Implementation risk: high for Ashen balance and moderate for Hymn; runtime complexity is low because both reuse the normal resolver.
- Approval source: `reports/heat-retirement-h5a-wound-scar-approval.md`.
- Recommended commit subject: `feat: retire severe heat threats with wound consequences`.

Implemented as `feat: retire severe wound heat threats`. Both cards use the pre-existing `take_wound` path. Ashen creates one atomic amount-2 request; Hymn creates one amount-1 request. Neither creates direct recall or Scar state, and no schema, resolver, projection, or client lifecycle was added.

### Group H6B — owner-chosen false-route displacement (1) — IMPLEMENTED

- Stable ID: `false-route-procession`.
- Exact change: on final Command failure, create one forced-displacement choice between the legal distance-1 clockwise and counterclockwise adjacent destinations on the operative's current ring. The server derives and revalidates candidates. Blocked candidates are omitted without skipping; one candidate remains mandatory; zero candidates means remain in place with no additional penalty. The existing reaction window opens after selection locks the destination.
- Shared lifecycle: reuse current forced-displacement reaction, Rift Anchor Spike prevention, source-event deduplication, arrival handoff, and sector-entry pipeline. The owner choice itself requires a narrow persisted destination-choice lifecycle because the current displacement state encodes one deterministic endpoint.
- Schema/runtime prerequisites: typed owner-choice displacement effect and pending state; authoritative ordered candidate generation; owner-only destination intent; stale-choice revalidation; private candidate/public waiting projections; reconnect persistence. No topology metadata or movement-planner redesign is approved.
- Entry semantics: spends no movement allowance, never crosses rings or enters center, does not invoke voluntary movement/Contract/scenario-entry hooks, and schedules the existing on-arrival tile challenge plus ordinary encounter pipeline once.
- Focused tests: outer/middle/inner/center candidates; blocked/one/zero candidate handling; deterministic order; wrong/arbitrary/stale/duplicate choice; Rift Anchor timing/spend; reconnect/replay; one arrival/encounter; privacy; no voluntary movement progress; current identity, reward, graph, topology, and blocked-card hashes unchanged.
- Implementation risk: medium-high code / medium balance. The one-edge owner choice is player-simple and severity 2, but five graph references and occasionally beneficial redirection require focused playtest.
- Approval source: `reports/heat-retirement-h6a-false-route-approval.md`.
- Recommended commit subject: `feat: retire false route heat threat`.

Implemented in H6B with one narrow persisted owner-choice state feeding the existing forced-displacement reaction, arrival, and resolved-source lifecycle. No topology metadata, Wound fallback, Contract hook, or broad movement/UI redesign was added.

## Blocked prerequisite register

| Stable ID | Preferred direction | Blocking prerequisite | Re-entry evidence |
|---|---|---|---|
| `gateblind-pulse` | Global Escalation | solo/multiplayer cap and threshold timing; duplicate-pattern check against Shattered Barricade | threshold matrix and source-order approval |
| `marrow-tax-auditors` | lose up to 1 Salvage | four-reference starvation risk in tight economy | post-H3 telemetry/playtest or an approved frequency/amount mitigation |
| `memory-tax-gate` | private player choice | two competitive options, private ownership, projection, cancellation, reset | exact prompt/options and server-authoritative choice lifecycle |

The three blocked IDs are not assigned to implementation groups. A later approval should form new 2–4 card groups only when cards genuinely share a settled lifecycle; it must not combine unrelated high-risk rules to satisfy a batch size.

## Recommended sequence

1. **H1 — removal/clarity only — COMPLETE.** Implemented for `cinder-gate-backlash`, `mirror-rot-interference`, and `webglass-snarefield` without replacement.
2. **H2 — existing Wound resolver — COMPLETE.** Implemented for `choir-static-burst` and `lantern-moth-swarm` through the normal preventable Wound lifecycle.
3. **H3 — existing floor-zero Salvage resolver — COMPLETE.** Implemented for `crown-bell-baron`, `pale-contract-collector`, and `soot-stained-cutpurse`; floor zero, actual delta, reward preservation, mode ownership, and explicit exclusion of Salvage Ledger, shop-transaction, mission, Contract, and completed-contract hooks are covered.
4. **H4B — exact-instance Equipment pressure — COMPLETE.** IDs: `relay-husk`, `signal-rotted-engineer`. Shared equipped-instance identity, private choice, suppression gates, reconnect persistence, and full cleanup are implemented.
5. **H4C — paired Command modifier — COMPLETE.** ID: `siren-relay-echo`. Typed Command-only eligibility, signed replacement, authoritative resolution reservation, Glass-Chime composition, reconnect, privacy, and cleanup are implemented separately from Equipment state.
6. **H5B — severe Wound consequences — COMPLETE.** IDs: `ashen-doppelganger`, `hymn-scarred-zealot`. Both reuse the existing Wound path; direct Scar routes remain rejected. Ashen's 2-Wound recall-rate jump is covered by focused partial/full prevention, threshold, replay, reconnect, and reward-regression tests.
7. **H6B — false-route destination choice — COMPLETE.** ID: `false-route-procession`. The H6A server-generated owner choice is implemented as a narrow forced-displacement extension, separately from `gateblind-pulse`.
8. **Shared-pressure design gate.** ID: `gateblind-pulse`. Benefit: preserves gate identity. Risk: medium-high. Prerequisite: escalation cap, threshold, ordering, and mode-scaling specification.
9. **Choice and economy-frequency gates.** IDs: `memory-tax-gate`, `marrow-tax-auditors`. Benefit: distinct Yellow tension. Risk: high if choice is dominant or economy starves. Prerequisites: choice contract and H3 playtest evidence.

## Per-group verification contract

Each implementation commit must run the smallest focused test first, then:

- `npm.cmd run validate:content`
- `npm.cmd run typecheck`
- the group’s focused Threat/content test file
- `npm.cmd run test:engine`
- `npm.cmd run test`
- `git diff --check`
- `git diff --cached --check`

Before each commit, inspect the complete staged diff and confirm stable IDs, totals (Red 26 / Blue 35 / Yellow 48 / overall 109), lane/type/stat/difficulty/severity, graph membership, completed duplicate revisions, unrelated mechanics, and the unapproved +116 expansion are unchanged. Heat compatibility may remain only where a card is still explicitly blocked; no new player-facing Heat or Risk wording is allowed.

## Distribution checkpoint

- Removed without replacement: 3 success branches.
- Implemented normal Wound consequences: 4 cards, including both H5B enemies.
- Added floor-zero Salvage losses: 3 cards.
- Implemented H1–H3 adds no Scar, Global Escalation, movement, Equipment disable, persistent, choice, temporary modifier, or multiplayer effect.
- H4B and H4C implement two exact-instance Equipment suppressions, two private target choices, and one paired Command modifier.
- Approved severity: four at 1, nine at 2, none at 3, one at 4, none at 5; all fourteen approvals are implemented through H6B.
- Lane approval impact is Blue 6, Yellow 7, Red 1; implemented impact remains Blue 6, Yellow 6, Red 1.
- Card totals: unchanged at 26 / 35 / 48 / 109.

No exact Relic-frequency parity is asserted. No expansion work is authorized.
