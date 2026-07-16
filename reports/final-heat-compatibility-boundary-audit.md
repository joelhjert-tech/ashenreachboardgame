# Final Heat compatibility-boundary audit

Date: 2026-07-15

Checkpoint: `3a7f232 feat: retire memory tax gate heat effect`

Branch: `phase/heat-retirement-1x`

Scope: report-only; no gameplay, content, schema, validation, projection, UI, asset, test, or migration change

## Executive verdict

**FAIL — the compatibility boundary is not yet contained.**

All 17 authored Heat-linked Threat retirements are implemented, the 109-card Threat deck has the expected Red 26 / Blue 35 / Yellow 48 distribution, and live projections built for solo, co-op, and rivalry contain no Heat key or Heat resource label. Generic `gain_heat`, `gain_heat_all`, and `lose_heat` effects are mechanically inert.

The stronger repository-wide claims requested by this audit are nevertheless false:

1. Thirty-nine authored typed Heat gain/loss effects remain outside the retired Threat set: 32 board-text effects, one scenario effect, four escalation-card effects, and two follower effects.
2. Validation explicitly allowlists six of the canonical JSON effects and two player-facing lexical uses instead of enforcing a zero-authored-Heat boundary.
3. `HEAT_THRESHOLD_REACHED` remains in the authoritative action union and its reducer branch recalls the operative. The server does not emit it and `shouldTriggerHeatThreshold()` is a hard-coded unused `false`, but the reducer action is not inert.
4. Current client projections are Heat-free in observed states, but shared/client/shop compatibility types can still carry `heat`, `heatCost`, `heatDelta`, and a `ResultDelta` of type `heat`; rendering filters, rather than a single server serialization boundary, provide part of the containment.
5. Current rules and art-direction documentation still teaches Heat as active.

The 17 Threat definitions themselves pass their retirement boundary. The repository as a whole does not.

## Repository search method and totals

The audit used tracked-file `git grep` over the full repository for case-insensitive `heat` plus the named camel/snake-case variants. Binary files were excluded from the text-line count but tracked asset paths were inventoried separately. Historical reports were counted, then classified as historical rather than runtime evidence. The two untracked quarantined audits were excluded from runtime counts and hash-checked separately.

Search result: **2,451 matching tracked text lines in 253 tracked files**. This is a matching-line count, not a token-occurrence count.

Every matching line was assigned to one primary category using path/family rules plus two content-text exceptions:

| Category | Matching lines | Meaning |
|---|---:|---|
| A. Authored gameplay | 59 | Content and authoritative board/scenario definitions, excluding two benign visible prose lines |
| B. Player-facing presentation | 2 | `heat haze` and `heat-clean needles`; ordinary physical wording, not the retired resource |
| C. Runtime compatibility | 191 | Parsers, schemas, no-op effects, projection filters/types, stable IDs, migration, and validation compatibility |
| D. Tests | 529 | Retirement, projection, migration, no-op, and legacy-boundary tests/fixtures |
| E. Documentation/history | 1,568 | Reports, docs, and README, including stale current-rule documents |
| F. Dead/obsolete residue | 102 | Old Heat art/prompt assets, generated prompt residue, stale naming/types, and dormant branches |
| **Total** | **2,451** | |

The primary classification ledger is exhaustive at the file-family level:

- A/B: all 61 matches in `content/`, `src/game/data/boardTextEffects.ts`, and `src/game/data/scenarios.ts`; the two visible non-resource prose lines are B and the other 59 are A.
- C: 191 matches in compatibility validation, schemas, persistence, reducers, server/client projection compatibility, stable-ID catalogs, and no-op resolvers.
- D: all 529 matches in 53 `__tests__`, `.test`, or `.spec` files.
- E: all 1,568 matches in 132 tracked `reports/`, `docs/`, and `README.md` files.
- F: 102 matches in `.asset-audit/`, generated image-prompt outputs, old Heat asset prompt registries, stale client types/naming, and the dormant threshold action surface.

## A. Authored-content results

### Threats

- Scanned: all 109 JSON definitions under `content/cards/threats/`.
- Count: Red 26, Blue 35, Yellow 48, total 109.
- The 17 retired Threats contain no active `gain_heat`, `gain_heat_all`, or `lose_heat` consequence.
- Five other Threats retain Heat-shaped stable effect keys: `grave-lattice-reclaimer`, `iron-lung-grenadier`, `mirror-lord-envoy`, `pale-marshal`, and `reliquary-judge`.
- Four of those definitions retain the `heat` resource tag. Their runtime effect-key implementations resolve to legacy no-op pressure or no-op summaries, but they remain authored Heat-shaped metadata and should be retired in a separate compatibility cleanup.
- `yard-rivet-brute` uses “heated anchor chain” as ordinary descriptive prose.

Threat-retirement status: **PASS for the 17-card retirement track; not sufficient for repository-wide containment.**

### Canonical JSON outside Threats

Six active typed legacy effects remain:

| Stable ID | Family | Effect |
|---|---|---|
| `escalation-blackstar-hunger` | escalation | `gain_heat_all 1` |
| `escalation-choir-feedback` | escalation | `gain_heat_all 1` |
| `escalation-marrow-surgery-debt` | escalation | `gain_heat 1` |
| `escalation-saltwind-lockdown` | escalation | `gain_heat_all 1` |
| `crownless-advocate` | follower | `lose_heat 1` |
| `saltflat-bone-reader` | follower | `lose_heat 1` |

Four follower definitions also retain `lossCondition: "heat"`: `black-lantern-broker`, `choir-defector`, `gate-saint-acolyte`, and `saltflat-bone-reader`. `lucy-hell-puppy` retains a `heat` tag.

Two canonical visible text values contain lowercase physical-language matches:

- `anomaly-cinder-mirage-lane`: “heat haze”
- `artifact-cinder-suture-kit`: “heat-clean needles”

They do not teach or display a Heat resource, but the current validator explicitly calls them approved “player-facing Heat text,” so they are not evidence of a strict zero-match presentation boundary.

### Board text and scenarios

`src/game/data/boardTextEffects.ts` contains **32** typed legacy effects: 24 `gain_heat` and 8 `lose_heat`. These definitions are imported by `roomServer.ts` and resolved through the normal board-text lifecycle. They are therefore authored and reachable, even though the generic resolver turns the Heat portion into a no-op.

`src/game/data/scenarios.ts:522` contains one conditional `gain_heat 1` effect for `scenario_mirror_of_false_heroes`. It is included in the authoritative scenario plan and is likewise reachable but mechanically no-op.

### Other content families

| Family | Active typed Heat effects | Heat resource text | Compatibility residue | Status |
|---|---:|---:|---|---|
| Characters | 0 | 0 | legacy snapshot schema only | contained |
| Equipment | 0 | 0 | `heat-sink-prayer` stable ID; optional `heatCost` schema | compatibility residue |
| Artifacts | 0 | 0 active resource labels | `artifact-heat-sink-prayer` stable ID; stale generated title/prompt | compatibility residue |
| Scars | 0 | 0 | none found mapping Heat to Scars | contained |
| Tile/board challenges | 32 | 0 resource labels | generic no-op runtime | **not retired** |
| Scenarios | 1 | 0 resource labels | generic no-op runtime | **not retired** |
| Missions/Contracts | 0 typed effects in current canonical content | 0 | legacy reward/type fixtures and docs | contained at current content |
| Followers | 2 | 0 resource labels | four loss conditions and one tag | **not retired** |
| Escalations | 4 | 0 resource labels | generic no-op runtime | **not retired** |
| Encounters/rewards/services | 0 current authored service costs | 0 | schemas/types still permit Heat-shaped values | compatibility residue |

Authored typed Heat effect count: **39**. Although all 39 generic effects currently resolve without state mutation, the requested “zero authored Heat effects” condition is not met.

## B. Player-facing projection and presentation

### Current projection evidence

The audit constructed TV and owner-phone projections for:

- single-player co-op;
- two-player co-op;
- two-player rivalry.

A recursive key/value scan returned zero Heat keys and zero standalone Heat resource strings in all six projections. Existing projection tests also prove runtime characters omit `heat`, shop active-player projections omit it, and reconnect does not serialize `heatThreshold`.

The visible mappings for legacy `lose_heat` rewards say “Scar relief,” and `ResultDelta` components/filter helpers drop delta type `heat`. The stable gear ID `heat-sink-prayer` is shown to players as **Scar-Sink Prayer**.

Current active projection result: **zero observed Heat resource fields and zero rendered Heat labels**.

### Boundary weakness

Containment is distributed rather than enforced at one server boundary:

- `ResultDeltaType` still includes `heat`.
- public/owner result helpers and UI components filter `heat` after receiving the collection.
- public shop types still allow `cost.heat`; recent outcomes still allow `heatDelta`.
- client character/gear/follower compatibility types still allow `heat`, `heatCost`, and `lossCondition: "heat"`.
- `HostShopOverlay` still treats `service.cost.heat` as a risk signal.

No current authored shop/service populates those fields, so current projections remain clean. A stale or compatibility-populated object could nevertheless cross the typed projection boundary before renderer filtering. This is a cleanup/test prerequisite.

## C. Runtime-state and action audit

### Persisted compatibility state

| Field/action | Type/default | Create/read/write behavior | Serialization/migration | Projection | Mechanical status |
|---|---|---|---|---|---|
| legacy v0 `character.heat` | nonnegative integer; required in v0 | read only by v0 migration | stripped from current character; nonzero values copied to metadata | absent | inert after migration |
| `legacyCompatibility.characterHeat[]` | positive `{seatId, characterId, value}` records; absent when empty | created by v0 migration; ownership/uniqueness validated; never read by gameplay | retained in v1/v2 snapshots | absent | inert metadata |
| legacy `state.heatThreshold` | positive integer; required in v0/v1 | read only by v1-to-v2 migration | renamed to `reflectionPressureThreshold` | absent | migration input, not current Heat state |
| `gain_heat` | positive amount | parsable; authored; routed to no-op | may exist in legacy/current authored card shape | no Heat result | inert generic effect |
| `gain_heat_all` | positive amount | parsable; maps each player through `gain_heat` no-op | same | no Heat result | inert generic effect |
| `lose_heat` | positive amount | parsable; authored; routed to no-op | same | shown as neutral/no status change or “Scar relief” reward label | inert generic effect |
| `HEAT_THRESHOLD_REACHED` | action with threshold and new total | no server call site; reducer accepts it and sets operative status to `recalled` | event-log compatible | summary says “Legacy pressure threshold” | **not inert** |
| `shouldTriggerHeatThreshold()` | private server method | no call sites; always returns `false` | none | none | dead no-op |
| `heatCost`, `cost.heat`, `heatDelta`, result type `heat` | optional compatibility fields | not populated by current authored economy; accepted by types/schemas | can survive compatible object shapes | filtered or ignored in several views | inert in current content, overly broad boundary |

Current gameplay character state contains no `heat` property. The construction test uses a TypeScript AST scan to prove production game/server files do not read `character.heat`.

### Mechanical read/write count

- Reads of a current Heat state field that affect gameplay: **0**.
- Active server emitters/writers of current Heat state: **0**.
- Dormant Heat-named reducer actions with a gameplay write: **1** (`HEAT_THRESHOLD_REACHED` recalls an operative).
- Authored generic effect resolutions that mutate Heat or another current system: **0**; they are no-ops.

`getGlobalHeatLevel()` is a misleading active name: it reads maximum Scar count and Global Escalation, then affects Nemesis movement. It does not read Heat, does not convert Heat into Scars, and belongs in category F as a rename candidate.

## D. Save and reconnect compatibility

Supported parser path:

1. Unversioned v0 requires legacy `character.heat` and `heatThreshold`.
2. v0-to-v1 strips each character Heat value and records positive values in `legacyCompatibility.characterHeat` by stable seat/character identity.
3. v1-to-v2 replaces `heatThreshold` with `reflectionPressureThreshold` and retains compatibility metadata.
4. Current v2 rejects direct character `heat` and direct `heatThreshold`, while accepting validated compatibility metadata.

Existing tests cover strict invalid shapes, nonzero-value preservation, idempotent migration, current-v2 rejection of direct Heat fields, snapshot round trips, and reconnect projection omission of thresholds. This demonstrates old saves can load and current characters remain Heat-free.

Missing proof:

- no end-to-end reconnect fixture begins with nonzero `legacyCompatibility.characterHeat` and verifies every projected key;
- no test replays a legacy `HEAT_THRESHOLD_REACHED` event and proves rejection/no-op—the current reducer would recall;
- no retired-Threat pending-state legacy fixture proves every pre-retirement consequence is normalized rather than replayed;
- no whole-projection schema forbids every Heat-shaped optional key.

Save/reconnect status: **migration is functional and generic Heat values become inert metadata, but the dormant threshold action remains a replay risk if such actions are admitted from an old event stream.**

## E. Validation boundary

The validator correctly rejects:

- authored `character.heat`;
- unapproved `gain_heat`, `gain_heat_all`, and `lose_heat` effects;
- unapproved `heatCost`, `heatDelta`, `cost.heat`, Heat-shaped fields, and player-facing Heat text;
- Heat reintroduction on individually retired Threats.

It does not enforce zero authored Heat. `LEGACY_HEAT_EFFECT_APPROVALS` explicitly authorizes eight content records:

- the six canonical JSON effects listed above;
- `anomaly-cinder-mirage-lane` visible text;
- `artifact-cinder-suture-kit` visible text.

`OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS` separately preserves stable IDs, follower conditions/tags, and five Heat-shaped Threat effect keys. Those stable-ID approvals do not authorize new fields, but several are broader than save-only compatibility because the records remain active content.

Validation verdict: **safe against unapproved expansion, not a final zero-authored-Heat boundary.**

## F. Heat versus Scars

Heat and Scars are not interchangeable in the current runtime:

- Heat-shaped generic effects are no-ops.
- Scars are active instances created by the Wound/recall or explicit pending-Scar lifecycle.
- Scar-Sink Prayer reacts to pending Scar consequences under its legacy stable ID.
- No migration or resolver maps a stored Heat amount to a Scar.
- No stored Heat value changes Wounds, recall thresholds, Scar selection, or Scar count.

The misnamed `getGlobalHeatLevel()` flows in the opposite direction: it observes Scar count and escalation for Nemesis pressure. It never creates a Scar and never reads compatibility Heat.

## G. Documentation consistency

Current and correct:

- `docs/ASHENREACH_RULE_SPINE.md`
- `docs/ASSET_PIPELINE.md` statements that active Heat paths must not be created
- H1-H9 Heat-retirement reports, when read as dated historical/approval records

Historical but not clearly retired/current-rule safe:

- the Heat phase reports and playtest reports under `reports/`; retain as historical evidence but add status headers in a later docs pass if they remain discoverable as rules.

Needs future correction:

- `docs/ASHENREACH_RULES_SKELETON.md`—defines Heat as personal pressure and a current route/scenario consequence.
- `docs/ASHENREACH_CARD_ECONOMY_SPINE.md`—lists Heat as a character stat, phone field, cost, and service/economy lever.
- `docs/MVP_RULES.md`—teaches failure as adding Heat and contains a Heat/Wounds section.
- `docs/MOTION_BIBLE.md`—still specifies a Heat result chip animation.
- `src/game/assets/design/artDirection.md`—lists Heat as accumulating attention.
- `README.md`—describes persistent wound/Heat scars.
- `docs/CARD_IMAGE_PROMPTS.md` and generated prompt catalogs—contain old Heat titles, rules-language prompts, and asset paths; historical/generated but unsafe as current authoring guidance.

## H. UI and asset residue

Tracked residue includes:

- `public/assets/riftfall/cards/heat/card_back_heat.png`
- `public/assets/riftfall/cards/heat/heat_card_black_mirror.png`
- `public/assets/riftfall/cards/heat/heat_card_hollow_voice.png`
- `public/assets/riftfall/cards/heat/heat_card_rift_scar.png`
- their design prompt/catalog entries
- stale Heat icon/template manifest entries
- the active Scar-Sink Prayer art path whose stable serialized filename contains `heat-sink-prayer`

The four old Heat deck/card assets are referenced by design/audit catalogs, not by active phone/TV runtime rendering. The Scar-Sink Prayer asset is active but renders the current Scar mechanic and must retain its stable path until an asset-ID migration is approved.

No active phone/TV component renders a Heat icon, badge, label, or accessibility string in the audited projections.

## I. Test coverage

Present guards include:

- all 17 retired Threat content rules and card totals;
- generic Heat effects do not mutate Wounds, Scars, escalation, or scenario pressure;
- runtime character construction and replacement omit Heat;
- production game/server code has no `character.heat` property read;
- phone/TV character and shop projections omit Heat;
- result-delta helpers filter legacy Heat deltas;
- v0/v1/v2 snapshot migration and strict current schema behavior;
- validation rejects new unapproved Heat constructs.

Missing guards required before a passing re-audit:

1. repository-wide canonical content scan asserting zero typed Heat effects, not the current expected population of six JSON records;
2. authoritative board-text/scenario scan rejecting typed Heat effects;
3. server projection deep-key assertion rejecting every Heat-shaped key across lobby, movement, battle, shop, scenario, reconnect, and private rivalry states;
4. reducer test requiring `HEAT_THRESHOLD_REACHED` to reject or no-op;
5. legacy-event replay fixture;
6. proof that compatibility Heat values cannot alter Scar creation for otherwise identical snapshots;
7. validation manifest assertion that the active-effect allowlist is empty;
8. runtime import boundary forbidding legacy Heat effect authoring outside a dedicated migration/compatibility module.

## J. Four critique seats

### New player

Current phone and TV projections teach Wounds and Scars, not Heat. The risk is documentation and generated authoring material: a player or rules reader can still encounter documents that explicitly teach Heat as active.

### Optimizer

Stored legacy character Heat cannot be manipulated for advantage or disadvantage because it is removed from current character state and never read. The dormant threshold action is the exception: if an old event stream can dispatch it, it recalls an operative without a current Heat state.

### Family/casual player

Live UI is consistent around Wounds and Scars. Stale rules documents and old Heat art create avoidable duplicate terminology outside the live session.

### Rules lawyer

- Active authored content can still emit typed Heat effects: yes, 39 locations.
- Generic effects mutate state: no.
- A Heat-named action can mutate gameplay: yes, one reducer branch recalls.
- Heat converts to Scars: no.
- Current observed projections expose Heat: no.
- Projection types completely forbid Heat: no.
- Compatibility removal is safely scoped: yes, but it requires staged content retirement, action hardening, projection tests, and then save-version decisions.

## Final counts and conclusion

| Measure | Result |
|---|---:|
| Tracked matching text lines | 2,451 |
| Tracked matching files | 253 |
| Authored typed Heat effects | 39 |
| Retired Threats with active Heat effects | 0 of 17 |
| Player-facing Heat resource labels observed in current projections | 0 |
| Benign lowercase visible prose matches | 2 |
| Current Heat-state mechanical reads | 0 |
| Current Heat-state writes/emitters | 0 |
| Dormant Heat action branches with gameplay mutation | 1 |
| Heat-to-Scar conversions | 0 |

**Final verdict: FAIL.** Heat is retired from the 17 authored Threats and absent from observed live presentation, but it is not yet retired from all authored gameplay and the runtime compatibility boundary contains one non-inert reducer action. No gameplay or compatibility code was changed in this audit.

## Phase C1 containment update

Phase C1 was implemented after this audit. The exact 39 authored occurrences were reconciled to 26 stable IDs and all remain blocked because this report/removal plan supplied no approved removal or replacement gameplay rule. Their definitions and wording are unchanged.

C1 changed the compatibility boundary as follows:

- `HEAT_THRESHOLD_REACHED` remains parsable but is now an exact reducer no-op. It cannot recall, create a Scar, change sequence/logs, or mutate gameplay.
- the unused always-false server threshold method was removed;
- phone and TV projections now pass through one server-side compatibility stripper;
- validation manifest-pins the 33 imported board/scenario occurrences and rejects additions or signature drift;
- focused tests prove legacy Heat values do not affect gameplay or Scars and that duplicate threshold replay is inert.

Updated mechanical counts:

- current Heat-state mechanical reads: **0**;
- current Heat-state writes/emitters: **0**;
- Heat actions with gameplay mutation: **0**;
- observed/guarded active projection Heat fields or labels: **0**;
- authored typed Heat effects: **39**.

Updated verdict: **FAIL remains**, now because of the 39 blocked authored effects only. A future C2 content-approval sequence is required before CONDITIONAL PASS. See `heat-compatibility-c1-containment-implementation.md` for implementation evidence.

## Phase C2A board-text approval update

C2A completed a report-only review of the exact 19 board-text stable IDs and 32 typed Heat occurrences manifest-pinned by C1. All 19 IDs are **APPROVED for removal without replacement**. No Wound, Scar, Salvage, movement, modifier, escalation, payment, or persistent replacement is approved.

The approval is grounded in current runtime behavior: every board Heat effect is already an inert generic compatibility no-op, while the surviving test, note, follower, local-deck, Wound, Scar, or route-clearance behavior remains complete. Five summaries receive narrow clarification, including four false status/Scar implications; ordinary furnace, burning, and signal-temperature lore remains.

No authored definition changed in C2A. Therefore the evidence counts and verdict do not change yet:

- authored typed Heat effects currently present: **39**;
- approved board-text effects awaiting implementation: **32 across 19 IDs**;
- projected authored effects after all C2A groups are implemented: **7 across 7 out-of-scope IDs**;
- current verdict: **FAIL**.

The seven projected remaining occurrences are `scenario_mirror_of_false_heroes`, four escalation IDs, `crownless-advocate`, and `saltflat-bone-reader`. They require separate approvals. See `heat-compatibility-c2a-board-text-approval.md` for exact rules, severity, and implementation grouping.

## Phase C2B1 board failure-removal update

C2B1 implemented only C2A Group 1: `outer_ashwakeClearLane`, `outer_mirecoilTraffic`, `outer_relayCrew`, `outer_oathpostWrit`, and `middle_redMarchBargain`. Each definition lost exactly one inert failure `gain_heat 1` clause without replacement. Existing stats, difficulties, success effects, failure summaries, local-deck behavior, board references, and projection/runtime compatibility boundaries remain unchanged.

Updated evidence counts:

- authored typed Heat effects: **34 across 21 IDs**;
- remaining approved board-text effects awaiting Groups 2–5: **27 across 14 IDs**;
- separately blocked scenario/escalation/follower effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

The verdict does not advance because active authored Heat remains. See `heat-compatibility-c2b1-board-failure-removals.md` for the exact removals and verification evidence.

## Phase C2B2 board success-cleanup update

C2B2 implemented only C2A Group 2: `outer_emberSanctumRest`, `outer_glassmereChorus`, `outer_waymarketExchange`, `outer_saltCrossing`, and `outer_surgeryTreatment`. Seven inert Heat leaves were removed without replacement. All surviving success effects retain order; existing failure Wounds, deck behavior, locations, and runtime/projection compatibility boundaries remain unchanged.

Updated evidence counts:

- authored typed Heat effects: **27 across 16 IDs**;
- remaining approved board-text effects awaiting Groups 3–5: **20 across 9 IDs**;
- separately blocked scenario/escalation/follower effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

See `heat-compatibility-c2b2-board-success-cleanups.md` for exact before/after sequences and verification evidence.

## Phase C2B3 severe board-consequence update

C2B3 implemented only C2A Group 3: `outer_brokenCausewayShortcut`, `middle_scarSurgery`, and `inner_blackstarShortcut`. Three inert `gain_heat 1` leaves were removed without replacement. The two existing one-Wound failures, the direct Ash-Lanced Scar failure, surviving notes, local deck associations, and runtime/projection compatibility boundaries remain unchanged.

Updated evidence counts:

- authored typed Heat effects: **24 across 13 IDs**;
- remaining approved board-text effects awaiting Groups 4–5: **17 across 6 IDs**;
- separately blocked scenario/escalation/follower effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

See `heat-compatibility-c2b3-board-severe-cleanups.md` for the severe-consequence preservation evidence.

## Phase C2B4 route-choice board update

C2B4 implemented only C2A Group 4: `middle_shardSprawlBargain`, `middle_webglassFracture`, and `inner_veilRiftEntry`. Nine inert Heat leaves were removed without replacement. Both options, exact selected notes, owner note storage, option order, route gates, movement authority, and runtime/projection compatibility boundaries remain unchanged.

Updated evidence counts:

- authored typed Heat effects: **15 across 10 IDs**;
- remaining approved board-text effects awaiting Group 5: **8 across 3 IDs**;
- separately blocked scenario/escalation/follower effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

See `heat-compatibility-c2b4-board-route-choice-cleanups.md` for the choice, note, and route-gate preservation evidence.

## Phase C2B5 final board approach update

C2B5 implemented C2A Group 5: `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, and `inner_gateOfCindersTrial`. Eight inert Heat leaves were removed without replacement. Clearance notes, selected approach notes, option order, test difficulty, route restrictions, center entry requirements, and scenario-confrontation ownership remain unchanged.

Updated evidence counts:

- authored typed Heat effects: **7 across 7 IDs**;
- board-authored typed Heat effects: **0 across 0 IDs**;
- separately gated scenario/escalation/follower effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

All 19 C2A board IDs are implemented. See `heat-compatibility-c2b5-board-final-approach-cleanups.md` for clearance, topology, center-gate, and scenario-isolation evidence.

## Phase C3A Mirror scenario approval update

C3A completed a report-only review of the exact remaining scenario Heat occurrence. `scenario_mirror_of_false_heroes` is **APPROVED for removal without replacement**: its `buildConfrontationPlan` effect becomes `null` rather than a Wound, Scar, Global Escalation, preparation loss, loss-pressure mark, or temporary modifier.

The approval preserves the current Mirror Pressure sources and cutoff, final gate, three checks, backlash, progress/victory behavior, center-only confrontation, and scenario-art mapping. It also records—but does not repair—the broader Mirror contract gaps: shared pressure versus Scar-based plan context, objective progress capable of completing outside the center, authored/runtime threshold differences, and incomplete preparation/confrontation separation.

No authored definition changed in C3A. Evidence counts therefore remain:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **1 across 1 approved-but-unimplemented ID**;
- escalation/follower typed Heat effects: **6 across 6 separately blocked IDs**;
- total authored typed Heat effects: **7 across 7 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

Implementation of the approved content-only removal is projected to reduce authored Heat to **6 occurrences across 6 IDs**. See `heat-compatibility-c3a-mirror-scenario-approval.md` for the exact architecture map, option analysis, and implementation prerequisites.

## Phase C3B Mirror scenario implementation update

C3B implemented the approved content-only retirement for `scenario_mirror_of_false_heroes`. Its confrontation plan remains present but now returns `effect: null` at every pressure value. No replacement consequence was added, and Mirror setup, pressure, gate, checks, progress, victory/loss, center-tile, topology, and art behavior remain unchanged.

Updated evidence counts:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation/follower typed Heat effects: **6 across 6 blocked IDs**;
- total authored typed Heat effects: **6 across 6 IDs**;
- imported board/scenario Heat validation exceptions: **0**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

The verdict does not advance while the four escalation and two follower effects remain authored. See `heat-compatibility-c3b-mirror-scenario-implementation.md` for exact content, validation, scenario-isolation, and verification evidence.

## Phase C4A escalation approval update

C4A reviewed the four remaining escalation-family Heat leaves against their complete content records and the authoritative sector-card resolution path. All four are **APPROVED for removal without replacement**:

- `escalation-blackstar-hunger`: delete `gain_heat_all 1`;
- `escalation-choir-feedback`: delete `gain_heat_all 1`;
- `escalation-marrow-surgery-debt`: delete `gain_heat 1`;
- `escalation-saltwind-lockdown`: delete `gain_heat_all 1`.

Every card already has active `escalationDelta: 1`. The server applies that field through Global Escalation, including ordinary modifier thresholds, solo/multiplayer caps, and existing collapse handling. The Heat leaf is a separate inert compatibility effect. Adding Global Escalation, Loss Pressure, Salvage loss, Wounds, movement, or a modifier would create a second penalty rather than retire the obsolete leaf.

C4A changes no authored definition. Current evidence therefore remains:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation-authored typed Heat effects: **4 across 4 approved-but-unimplemented IDs**;
- follower-authored typed Heat effects: **2 across 2 separately blocked IDs**;
- total authored typed Heat effects: **6 across 6 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

After both approved escalation implementation groups, the projected authored population is **2 occurrences across 2 follower IDs**. See `heat-compatibility-c4a-escalation-approval.md` for individual approvals, frequency, severity, rejected alternatives, and the two implementation groups.

## Phase C4B1 shared escalation implementation update

C4B1 removed the exact `gain_heat_all 1` `resolveEffect` leaves from `escalation-blackstar-hunger`, `escalation-choir-feedback`, and `escalation-saltwind-lockdown` without replacement. Each card retains `escalationDelta: 1`, so the authoritative sector-card path still advances Global Escalation exactly once with existing solo/multiplayer caps, difficulty thresholds, collapse behavior, local-deck consumption, replay protection, reconnect, and public projections.

Updated evidence counts:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation-authored typed Heat effects: **1 across 1 approved-but-unimplemented ID**;
- follower-authored typed Heat effects: **2 across 2 blocked IDs**;
- total authored typed Heat effects: **3 across 3 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

The remaining IDs are `escalation-marrow-surgery-debt`, `crownless-advocate`, and `saltflat-bone-reader`. See `heat-compatibility-c4b1-shared-escalation-implementation.md` for the exact content diff and server-authoritative player-count, threshold, collapse, replay, reconnect, and projection evidence.

## Phase C4B2 Marrow escalation implementation update

C4B2 removed the sole `gain_heat 1` `resolveEffect` from `escalation-marrow-surgery-debt` without replacement. The definition retains `escalationDelta: 1`, so the existing server-authoritative sector-card path continues to advance Global Escalation once in solo and every multiplayer player count. No historical `lose_salvage 1` proposal, payment, debt status, Wound, Scar, choice, or other personal consequence was introduced.

Updated evidence counts:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation-authored typed Heat effects: **0 across 0 IDs**;
- follower-authored typed Heat effects: **2 across 2 blocked IDs**;
- total authored typed Heat effects: **2 across 2 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

The remaining authored IDs are `crownless-advocate` and `saltflat-bone-reader`. See `heat-compatibility-c4b2-marrow-escalation-implementation.md` for content identity, economy isolation, threshold/collapse, replay/reconnect, and projection evidence.

## Phase C5A final follower approval update

C5A reviewed the two remaining follower Heat leaves against the authoritative follower-use, ownership, once-per-round, private-note, replay, reconnect, and projection lifecycles. Both are **APPROVED** to replace their inert `lose_heat 1` active effect with an exact existing canonical owner-private `gain_note`:

- `crownless-advocate`: record that one faction demand or rivalry bargain was softened;
- `saltflat-bone-reader`: record that one scar, omen, or void-salt bargain became a safer route note.

The approval retains each stable ID, role, loyalty, `oncePerRound` use limit, ownership, and compatibility metadata. It adds no Wound, Scar, Salvage cost, payment, Global Escalation, movement, modifier, follower discard, follower exhaustion, typed faction/Rivalry mutation, or route/topology mutation. No canonical acquisition source currently references either follower, and the accepted effect remains a bounded owner action if a legacy save or future approved source supplies one.

C5A is report-only, so current evidence remains:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation-authored typed Heat effects: **0 across 0 IDs**;
- follower-authored typed Heat effects: **2 across 2 approved-but-unimplemented IDs**;
- total authored typed Heat effects: **2 across 2 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**;
- current verdict: **FAIL**.

After implementation and a complete boundary rerun, the projected authored typed Heat count is **0** and the projected verdict is **CONDITIONAL PASS**. Compatibility-only save fields, follower `lossCondition: "heat"` metadata, protocol/types, historical documentation, and dead residue are not approved for deletion in C5A. See `heat-compatibility-c5a-follower-approval.md` for exact rules, lifecycle findings, privacy, power, tests, and implementation grouping.

## Phase C5B final follower implementation update

C5B replaced the last two authored `lose_heat 1` leaves with the exact approved owner-private notes:

- `crownless-advocate`: `Crownless Advocate: one faction demand or rivalry bargain was softened.`
- `saltflat-bone-reader`: `Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note.`

Both followers retain their stable identity, role, loyalty, `oncePerRound` stable-ID use boundary, ownership, catalog membership, and compatibility metadata. Explicit effects remain authored, so the undocumented role fallback cannot select the result. No Wound, Scar, Salvage, movement, Global Escalation, modifier, discard, exhaustion, route, mission, Contract, or Rivalry mechanic was added.

Updated evidence:

- board-authored typed Heat effects: **0 across 0 IDs**;
- scenario-authored typed Heat effects: **0 across 0 IDs**;
- escalation-authored typed Heat effects: **0 across 0 IDs**;
- follower-authored typed Heat effects: **0 across 0 IDs**;
- total active authored typed Heat effects: **0 across 0 IDs**;
- current Heat-state mechanical reads/writes: **0**;
- gameplay-mutating `HEAT_THRESHOLD_REACHED`: **0**;
- Heat-to-Scar conversion: **0**;
- observed/guarded phone and TV Heat fields or labels: **0**.

**Updated verdict: CONDITIONAL PASS.** The active authored and player-facing boundary is contained, legacy metadata remains inert and parseable, and reconnect/replay coverage passes. PASS remains deferred until dead code/assets/docs, compatibility types, and save-version deletion dependencies are re-audited. See `heat-compatibility-c5b-final-follower-implementation.md`.

## Phase C6A complete boundary rerun

C6A performed a new occurrence-based classification over every tracked textual `heat` substring after authored retirement. The repository contains **4,365 occurrences across 261 tracked files**:

- A — active authored gameplay: **0**;
- B — player-facing/presentation lexical matches: **13**, all ordinary environmental or art language; retired-resource presentation remains **0**;
- C — required compatibility: **299**;
- D — tests and fixtures: **915**;
- E — documentation and history: **3,106**;
- F — dead or obsolete residue: **32**;
- G — ambiguous: **0**.

The zero gameplay boundary passes: no authored typed effects, Heat-state reads/writes, threshold mutations, Heat-to-Scar paths, phone/TV Heat results, save parsing failures, or reconnect replays were found. `HEAT_THRESHOLD_REACHED` remains an exact state-identity no-op.

**Verdict remains CONDITIONAL PASS.** Broad shared schemas/types still admit legacy Heat shapes, four followers retain compatibility loss-condition metadata, stable Heat-shaped Threat keys/tags remain pending migration, dead UI/assets/names remain, and six current documentation statements still teach Heat. See `final-heat-compatibility-boundary-rerun.md` and `heat-compatibility-cleanup-roadmap.md`.

## Phase C6B safe dead-residue cleanup

C6B removed 28 of the 32 Category F references:

- retired card/deck/template/icon prompt records and four unreferenced legacy PNGs;
- the misleading Nemesis pressure helper name and unused server import;
- the obsolete shop text-classification alternative.

The comparable classification is now **4,337 occurrences across 255 files**: A 0, B 13, C 299, D 915, E 3,106, F 4, G 0. The remaining four Category F occurrences are three defensive client legacy-payload branches and the stable serialized Nemesis rule ID. They remain assigned to C6C and C6D/C6F respectively.

**Verdict remains CONDITIONAL PASS.** No gameplay, content definition, schema, compatibility field, migration, reconnect adapter, validation guard, or projection boundary changed. See `heat-compatibility-c6b-dead-residue-cleanup.md`.

## Verification record

Passed:

- repository-wide tracked Heat search and classification;
- `npm.cmd run validate:content` (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions);
- `npm.cmd run typecheck`;
- focused legacy validation, no-op containment, runtime construction, snapshot migration, projection, and result-delta tests: 6 files / 53 tests;
- `npm.cmd run test:engine`;
- `npm.cmd run test:integration` (26 files / 226 tests);
- `npm.cmd run test:client` (26 files / 258 tests);
- `git diff --check`;
- `git diff --cached --check`.

`npm.cmd run test` timed out at approximately 244 seconds. Its exact constituent suites were run independently as required and all three passed. No retry or arbitrary wait was added.

Pre-commit checks confirmed:

- only this report and `final-heat-compatibility-removal-plan.md` are intended for the commit;
- no Threat definition, gameplay, schema, validation, projection, UI, asset, test, or compatibility implementation changed;
- Threat totals remain 109 (Red 26 / Blue 35 / Yellow 48);
- the +116 expansion remains unapproved;
- the two quarantined audit files remain untracked;
- quarantined SHA-256 hashes remain `2AD4637AB78F5E369ED85D5D81EB2F76C45592A94E0D48116FCC9A6D443E6EF8` and `608F0B5F664C7257009054C10A4FB8CB81A26E9EF5B4031588FB5CB15D6FC776`.
