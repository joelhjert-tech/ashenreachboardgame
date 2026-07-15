# Final Heat compatibility removal plan

Date: 2026-07-15

Based on checkpoint: `3a7f232 feat: retire memory tax gate heat effect`

Status: planning only; **no removal occurred in this pass**

## Objective

Reach a boundary where canonical content cannot author Heat, runtime compatibility can load supported old saves without mechanical behavior, no client schema or projection admits Heat, and obsolete identifiers/assets can be removed or deliberately retained with documented save-version ownership.

The work must not reinterpret Heat as Scars. Each still-authored effect needs its own retirement approval or an explicit remove-without-replacement decision.

## Dependency graph

```text
canonical Heat effects (39)
  -> content-specific retirement approvals
  -> board/scenario/follower/escalation replacements
  -> empty active-effect validation allowlist
  -> schema can stop accepting Heat effects for current content

legacy threshold action
  -> event-stream/save replay inventory
  -> reject/no-op compatibility test
  -> reducer branch removal or migration-only adapter

legacy snapshot fields
  -> supported save-version policy
  -> v0/v1 fixture coverage
  -> explicit v3 migration/version boundary (if removed)
  -> characterHeat metadata retention or archival deletion

projection compatibility fields
  -> deep projection tests in all lifecycle states
  -> server-side stripping/typed removal
  -> client filter/type cleanup

stable IDs and assets
  -> save/content reference inventory
  -> ID/asset migration map
  -> runtime catalog update
  -> optional old asset deletion

documentation and generated prompts
  -> mark historical documents
  -> update current rules spine derivatives
  -> regenerate prompt catalogs
```

## Remaining fields, actions, and dependencies

| Compatibility surface | Dependents | Save/version dependency | Risk if removed now | Classification |
|---|---|---|---|---|
| v0 `character.heat` parser | `legacyCharacterSchemaV0`, v0 snapshot parser, migration tests | unversioned v0 saves | old saves fail strict parsing | Safe after migration/version policy |
| `legacyCompatibility.characterHeat` | v1/v2 snapshot schemas, migration, ownership validation, tests | nonzero v0 Heat preservation | discards faithfully preserved legacy metadata | Retain indefinitely or remove at major save boundary |
| v0/v1 `heatThreshold` | legacy game-state schemas, v1-to-v2 migration, tests | v0/v1 saves | old Mirror-era saves fail/migrate incorrectly | Retain until v0/v1 support ends |
| `gain_heat`, `gain_heat_all`, `lose_heat` effect union/schema | 39 authored definitions, reducer no-op, tests/fixtures | old serialized card/effect states | current board/scenario/follower/escalation content fails validation/parse | Safe after content retirement and legacy adapter tests |
| six JSON effect approvals | legacy validation and count tests | no save requirement by themselves | canonical content validation fails | Safe after content retirement |
| two lexical text approvals | legacy validation | none | validation fails for benign prose | Safe now if validator distinguishes resource language; otherwise after text decision |
| Heat-shaped Threat keys/tags | five Threat definitions, `threatEffects.ts`, validation approvals | stable card/effect identity may appear in saves/logs | stale/pending Threat resolution may fail | Safe after retired-state migration tests |
| `HEAT_THRESHOLD_REACHED` action | action union, reducer, event log compatibility | possible old event/replay records | behavior changes from recall; removing may break replay parse | **Must harden after event inventory/tests** |
| `shouldTriggerHeatThreshold()` | room server only | none; no call sites | none | Safe now |
| `heatCost` | gear schema/client types/validation | possible old item shapes | old content parse/type compatibility | Safe after legacy item fixture |
| shop `cost.heat` / `heatDelta` | action result, server public shop types, client shop types/overlay | possible old shop outcome shapes | old outcome projection changes | Safe after projection and legacy-outcome tests |
| `ResultDelta` type `heat` and filters | server/client result types, result helpers/components | stale patches/reconnect payloads | old patches may fail client parsing; filters currently suppress display | Retain until protocol/version boundary, then remove |
| follower `lossCondition: "heat"` | four follower records, schemas/client types | stable follower state | strict parse failure; loss behavior is already semantically stale | Safe after follower retirement/migration |
| `heat-sink-prayer` / `artifact-heat-sink-prayer` IDs | content, runtime art catalog, board graph, server/client Scar reaction, saves | equipped item/card IDs in saves | breaks Scar-Sink Prayer inventory and reaction | Retain indefinitely unless explicit ID migration |
| `getGlobalHeatLevel` name | Nemesis movement and tests | none; behavior is Scar/escalation pressure | careless removal changes Nemesis movement | Safe rename after tests; do not change behavior |
| old Heat art/prompt paths | design catalogs, generated prompts, asset audits | no gameplay save requirement found | audit/generation drift | Safe after asset-reference audit |

## Cleanup classification

### Safe now

These appear removable without changing valid current gameplay, subject to the normal focused tests:

- unused `shouldTriggerHeatThreshold()` method;
- stale Heat deck/card art prompt entries and four unreferenced Heat card assets, after a final asset-manifest reference check;
- obsolete comments and generated authoring text that teach Heat as current;
- stale `getGlobalHeatLevel` name, as a behavior-preserving rename;
- clearly historical UI design references such as the Heat result-chip motion instruction;
- the two benign prose allowlist entries if validation is narrowed to distinguish resource-language Heat from ordinary lowercase physical heat.

No item in this section was removed during this audit.

### Safe after tests

- reject or turn `HEAT_THRESHOLD_REACHED` into an explicit compatibility no-op, then remove its reducer mutation only after legacy event replay coverage;
- strip Heat-shaped keys from every server projection before removing client-side defensive filters;
- remove client `heat`, `heatCost`, `heatDelta`, and `ResultDeltaType "heat"` types after deep projection fixtures prove they never arrive;
- remove shop Heat cost/risk branches after legacy shop/outcome fixtures establish the chosen compatibility behavior;
- retire Heat-shaped Threat effect keys/tags after stale pending-Threat/reconnect fixtures exist;
- rename/remove no-op threat resolver helpers after all stable key references are migrated.

### Safe after migration

- remove unversioned v0 `character.heat` parsing;
- remove v0/v1 `heatThreshold` parsing;
- remove or archive `legacyCompatibility.characterHeat`;
- remove `gain_heat`, `gain_heat_all`, and `lose_heat` from the general current content schema;
- remove follower `lossCondition: "heat"`;
- rename `heat-sink-prayer` stable IDs or their active asset path.

These changes require a declared supported-save boundary or a new snapshot version with explicit migration. A v3 boundary is the natural place to stop accepting v0/v1 shapes, but the product’s save-support policy must decide that separately.

### Retain indefinitely

If preserving old saves is inexpensive and no protocol version is planned, retain:

- `legacyCompatibility.characterHeat` as opaque validated metadata;
- v0/v1 migration parsers in a migration-only module;
- `heat-sink-prayer` and `artifact-heat-sink-prayer` stable IDs while showing only Scar-Sink Prayer to players.

Indefinite retention is acceptable only when these surfaces cannot enter current authored models, projections, actions, or mechanics.

## Required content approvals before schema narrowing

The 39 remaining authored effects need separate decisions:

1. **Board-text batch (32):** audit frequency and intended consequence per sector/choice; approve typed replacements or remove without replacement.
2. **Scenario batch (1):** replace the Mirror of False Heroes conditional effect through the existing scenario-pressure/Scar/Wound systems only if separately approved.
3. **Escalation batch (4):** reconcile the legacy effect with each card’s existing `escalationDelta`; avoid double-applying shared escalation.
4. **Follower batch (2 effects, four Heat loss conditions):** approve current follower benefits/loss triggers and preserve private information boundaries.
5. **Threat-key metadata batch (5 keys, four tags):** decide whether stable keys remain migration aliases or are retired in place.

Until these approvals land, removing the generic Heat effect schema would break current canonical content loading even though the effects are no-ops.

### C1 exact authored-effect scope ledger

Phase C1 reviewed the authoritative imported definitions rather than deriving scope from text search alone. The 39 occurrences belong to 26 stable content IDs. The audit/removal plan contains no approved replacement or remove-without-replacement decision for any of them, so every row has disposition **D. Blocked** for C1. Runtime handling is the existing generic compatibility no-op in every row; no player-facing wording change or replacement gameplay is approved.

| Stable ID | Family / source | Current typed Heat effect path(s) | Current authored wording | C1 disposition | Wording change? | Approved replacement? |
|---|---|---|---|---|---|---|
| `outer_emberSanctumRest` | board text / `src/game/data/boardTextEffects.ts` | effect sequence: `lose_heat 1` | Recovered 1 Wound and stabilized lingering Scar pressure. | **IMPLEMENTED C2B2: removed without replacement** | Yes, false Scar-pressure implication removed | No replacement |
| `outer_ashwakeClearLane` | board text / `src/game/data/boardTextEffects.ts` | failure: `gain_heat 1` | Marked a clean lane through Ashwake Crossing. | **IMPLEMENTED C2B1: removed without replacement** | No | No replacement |
| `outer_glassmereChorus` | board text / `src/game/data/boardTextEffects.ts` | success: `lose_heat 1`; failure: `gain_heat 1` | Tuned the Glassmere spindle and secured a stable relay note. | **IMPLEMENTED C2B2: removed without replacement** | Failure clarification applied | No replacement |
| `outer_mirecoilTraffic` | board text / `src/game/data/boardTextEffects.ts` | failure: `gain_heat 1` | Pulled a fresh Contract lead from Mirecoil Beacon traffic. | **IMPLEMENTED C2B1: removed without replacement** | No | No replacement |
| `outer_waymarketExchange` | board text / `src/game/data/boardTextEffects.ts` | success: `lose_heat 1`; failure: `gain_heat 1` | Worked the Waymarket exchange and secured a practical table favor. | **IMPLEMENTED C2B2: removed without replacement** | No | No replacement |
| `outer_relayCrew` | board text / `src/game/data/boardTextEffects.ts` | failure: `gain_heat 1` | Recruited a relay-camp contact and recorded the route crew. | **IMPLEMENTED C2B1: removed without replacement** | No | No replacement |
| `outer_saltCrossing` | board text / `src/game/data/boardTextEffects.ts` | success: `lose_heat 1` | Harvested void-salt and bottled it as a bargaining chip. | **IMPLEMENTED C2B2: removed without replacement** | No | No replacement |
| `outer_surgeryTreatment` | board text / `src/game/data/boardTextEffects.ts` | success sequence: `gain_heat 1` | Accepted rough cinder surgery and walked away patched but marked. | **IMPLEMENTED C2B2: removed without replacement** | Yes, false mark implication removed | No replacement |
| `outer_oathpostWrit` | board text / `src/game/data/boardTextEffects.ts` | failure: `gain_heat 1` | Claimed a faction writ from the Oathpost. | **IMPLEMENTED C2B1: removed without replacement** | No | No replacement |
| `outer_brokenCausewayShortcut` | board text / `src/game/data/boardTextEffects.ts` | failure sequence: `gain_heat 1` | Marked the Broken Causeway shortcut toward Guardian Span. | **IMPLEMENTED C2B3: removed without replacement** | No | No replacement |
| `middle_scarSurgery` | board text / `src/game/data/boardTextEffects.ts` | success sequence: `gain_heat 1` | Survived field surgery in the Red March. | **IMPLEMENTED C2B3: removed without replacement** | No | No replacement |
| `middle_redMarchBargain` | board text / `src/game/data/boardTextEffects.ts` | failure: `gain_heat 1` | Secured a Red March outpost bargain. | **IMPLEMENTED C2B1: removed without replacement** | No | No replacement |
| `inner_blackstarShortcut` | board text / `src/game/data/boardTextEffects.ts` | success sequence: `gain_heat 1` | Crossed the Blackstar shortcut and kept your nerve. | **IMPLEMENTED C2B3: removed without replacement** | No | No replacement |
| `middle_shardSprawlBargain` | board text / `src/game/data/boardTextEffects.ts` | choice 1 success: `lose_heat 1`; choices 1-2 failure: `gain_heat 1` | Cut a hard bargain in the Shard Sprawl. | **IMPLEMENTED C2B4: removed without replacement** | No | No replacement |
| `middle_guardianSpanThreshold` | board text / `src/game/data/boardTextEffects.ts` | choices 1-2 failure: `gain_heat 1` | Aligned the Guardian Span threshold and opened the inner breach. | **IMPLEMENTED C2B5: removed without replacement** | No | No replacement |
| `middle_webglassFracture` | board text / `src/game/data/boardTextEffects.ts` | choice 1 success: `lose_heat 1`; choices 1-2 failure: `gain_heat 1` | Threaded the Webglass fracture path and logged a breach route. | **IMPLEMENTED C2B4: removed without replacement** | No | No replacement |
| `inner_veilRiftEntry` | board text / `src/game/data/boardTextEffects.ts` | choice 1 success: `lose_heat 1`; choices 1-2 failure: `gain_heat 1` | Stabilized the Veil Rift entry and charted the deeper breach. | **IMPLEMENTED C2B4: removed without replacement** | No | No replacement |
| `inner_cinderLatticeTrial` | board text / `src/game/data/boardTextEffects.ts` | choice 1 failure: `gain_heat 1`; choice 2 success: `lose_heat 1`; choice 2 failure: `gain_heat 1` | Decoded the Cinder Lattice and marked a viable core approach. | **IMPLEMENTED C2B5: removed without replacement** | Yes, false Scar-pressure implication removed | No replacement |
| `inner_gateOfCindersTrial` | board text / `src/game/data/boardTextEffects.ts` | choices 1-3 failure: `gain_heat 1` | Forced the Gate of Cinders and prepared the final breach. | **IMPLEMENTED C2B5: removed without replacement** | False Scar-pressure implication removed | No replacement |
| `scenario_mirror_of_false_heroes` | scenario / `src/game/data/scenarios.ts` | high-pressure confrontation: `gain_heat 1` | Face Yourself confrontation plan. | **IMPLEMENTED C3B: removed without replacement** | No | No replacement |
| `escalation-blackstar-hunger` | escalation / `content/cards/escalations/escalation-blackstar-hunger.json` | resolve: `gain_heat_all 1` | The dark star pulls metal, courage, and breath into its gravity. | **APPROVED C4A: remove without replacement** | No | Preserve existing `escalationDelta: 1`; no additional effect |
| `escalation-choir-feedback` | escalation / `content/cards/escalations/escalation-choir-feedback.json` | resolve: `gain_heat_all 1` | The relay choir turns every stable signal into a shriek. | **APPROVED C4A: remove without replacement** | No | Preserve existing `escalationDelta: 1`; no additional effect |
| `escalation-marrow-surgery-debt` | escalation / `content/cards/escalations/escalation-marrow-surgery-debt.json` | resolve: `gain_heat 1` | Every healed Wound starts billing the future. | **APPROVED C4A: remove without replacement** | No | Preserve existing `escalationDelta: 1`; no Salvage or other replacement |
| `escalation-saltwind-lockdown` | escalation / `content/cards/escalations/escalation-saltwind-lockdown.json` | resolve: `gain_heat_all 1` | Void-salt wind makes every easy crossing abrasive. | **APPROVED C4A: remove without replacement** | No | Preserve existing `escalationDelta: 1`; no movement or other replacement |
| `crownless-advocate` | follower / `content/followers/crownless-advocate.json` | active: `lose_heat 1` | Soften a faction demand or cancel one unstable rivalry cost. | D. Blocked | No | No |
| `saltflat-bone-reader` | follower / `content/followers/saltflat-bone-reader.json` | active: `lose_heat 1` | Turn a Scar, omen, or void-salt bargain into a safer route note. | D. Blocked | No | No |

Current count after C2B5: 0 board-text occurrences + 1 scenario + 4 escalations + 2 followers = **7 occurrences across 7 IDs**. All five C2A groups and all 19 board IDs are implemented.

### C2A implementation order and projected count

1. Simple failure-only: `outer_ashwakeClearLane`, `outer_mirecoilTraffic`, `outer_relayCrew`, `outer_oathpostWrit`, `middle_redMarchBargain` — **implemented C2B1**.
2. Success-sequence cleanup: `outer_emberSanctumRest`, `outer_glassmereChorus`, `outer_waymarketExchange`, `outer_saltCrossing`, `outer_surgeryTreatment` — **implemented C2B2**.
3. Existing severe consequence cleanup: `outer_brokenCausewayShortcut`, `middle_scarSurgery`, `inner_blackstarShortcut` — **implemented C2B3**.
4. Two-choice route notes: `middle_shardSprawlBargain`, `middle_webglassFracture`, `inner_veilRiftEntry` — **implemented C2B4**.
5. Clearance/final approach: `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial` — **implemented C2B5**.

After all five groups are implemented, the authored typed Heat population is projected to fall from 39 to **7 occurrences across 7 IDs**: one scenario, four escalations, and two followers. The current audit verdict remains FAIL until implementation and later approval passes provide evidence otherwise.

## Test prerequisites

Before removing compatibility code, add:

- a full canonical-content guard asserting zero `gain_heat`, `gain_heat_all`, and `lose_heat` definitions;
- a board-text/scenario import test that rejects legacy Heat effects;
- an empty-active-allowlist assertion for `LEGACY_HEAT_EFFECT_APPROVALS`;
- deep phone/TV projection key scans across lobby, action, movement, battle, shop, scenario, private choice, reconnect, and rivalry;
- legacy v0/v1 snapshot fixtures with nonzero Heat metadata and active retired-Threat states;
- a legacy event-stream fixture containing `HEAT_THRESHOLD_REACHED`;
- reducer proof that every legacy Heat effect/action is either rejected or a no-op and cannot recall;
- paired snapshots proving different legacy Heat values yield identical Wound, Scar, battle, movement, economy, scenario, mission, and reward results;
- client protocol fixtures proving stale Heat deltas are ignored until the protocol field is removed;
- an asset reference test before deleting old Heat images.

## Migration prerequisites

1. Decide how long unversioned v0 and v1 saves remain supported.
2. Inventory whether persisted event logs are replayed or merely stored; this determines treatment of `HEAT_THRESHOLD_REACHED`.
3. If compatibility is removed, introduce a v3 snapshot migration that consumes v0/v1 through a dedicated importer and writes no Heat metadata into v3.
4. Decide whether historical `characterHeat` is discarded, archived outside gameplay state, or retained indefinitely.
5. Preserve stable seat/character ownership validation during any metadata migration.
6. Provide an ID migration table before renaming Scar-Sink Prayer’s stable IDs.
7. Version the client/server patch contract before deleting Heat-shaped result/shop fields if older clients are supported.

## Recommended phases

### Phase C1 — Containment hardening

- Add missing projection, event-replay, and no-mechanical-effect tests.
- Make `HEAT_THRESHOLD_REACHED` reject or no-op through an explicit approval.
- Establish a server-side Heat stripping boundary.
- No content rebalance.

Implementation status: **complete for runtime containment and C2A board retirement**. `HEAT_THRESHOLD_REACHED` is an exact no-op, phone/TV use the server stripping boundary, and focused validation/projection/replay/Scar tests are present. C2B1–C2B5 removed all 32 approved board-text occurrences across all 19 C2A IDs. Seven separately gated scenario, escalation, and follower occurrences remain authored.

### Phase C3A — Mirror scenario approval

`scenario_mirror_of_false_heroes` is **APPROVED** to remove its conditional high-pressure `gain_heat 1` confrontation effect without replacement. Implementation is content-only: the confrontation-plan `effect` becomes `null`; existing checks, Mirror Pressure, center gate, backlash, progress, victory/loss handling, rewards, center topology, and scenario art do not change. No Wound, Scar, Global Escalation, preparation, loss-pressure, or modifier replacement is approved.

At C3A approval time, the effect remained authored until implementation, so the population was **7 occurrences across 7 IDs** and the audit verdict remained **FAIL**. After the approved implementation, the projected population was **6 occurrences across 6 IDs**: four escalations and two followers. The broader Mirror preparation/confrontation contract remains separate scenario-foundation work and is not a prerequisite for this narrow removal.

Implementation status: **complete in C3B**. The Mirror plan effect is `null`, the imported board/scenario Heat manifest is empty, and repository-backed authored Heat is now **6 occurrences across 6 IDs**. The four escalation and two follower IDs remain blocked; audit verdict **FAIL** remains.

### Phase C4A - escalation approval

The four remaining escalation-family Heat leaves are **APPROVED** for content-only removal without replacement. Each card already applies `escalationDelta: 1` through the authoritative shared Global Escalation lifecycle; the additional `gain_heat` or `gain_heat_all` leaf is inert. Implementation deletes only `resolveEffect` and preserves the card's stable identity, step, prose, summary, distribution, local-deck consumption, shared +1, caps, thresholds, and existing collapse behavior.

Implementation groups:

1. `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-saltwind-lockdown`: remove the three shared-target `gain_heat_all 1` leaves.
2. `escalation-marrow-surgery-debt`: remove the active-seat `gain_heat 1` leaf separately, proving no historical Salvage recommendation or other personal penalty is added.

C4A is report-only. Current authored Heat remains **6 occurrences across 6 IDs** and verdict **FAIL**. After both approved groups are implemented, projected authored Heat is **2 occurrences across 2 follower IDs**: `crownless-advocate` and `saltflat-bone-reader`. See `heat-compatibility-c4a-escalation-approval.md`.

### Phase C2 — Remaining authored content retirement

- Approve and implement board-text, scenario, escalation, follower, and Threat-key batches separately.
- Empty `LEGACY_HEAT_EFFECT_APPROVALS` for active effects.
- Keep save adapters intact.

### Phase C3 — Current-model narrowing

- Remove legacy effect/action/cost variants from current authored schemas and runtime unions.
- Keep old parsers in a migration-only namespace.
- Remove client projection compatibility fields after protocol tests pass.

### Phase C4 — Documentation and asset cleanup

- Correct the rules skeleton, card economy spine, MVP rules, motion bible, README, and art-direction guidance.
- Mark retirement reports historical.
- Regenerate card/image prompt catalogs.
- Delete only unreferenced old Heat assets.

### Phase C5 — Save-version boundary, optional

- If product policy ends v0/v1 support, add the approved migration/version bump and remove old parsers/metadata.
- Otherwise retain the small migration-only compatibility surface indefinitely.

### Phase C6 — Final re-audit

Re-run the full tracked search and require:

- zero authored typed Heat effects;
- zero active resource presentation;
- zero gameplay-mutating Heat action branches;
- zero current projection keys;
- compatibility references confined to migration-only modules, stable IDs, tests, and explicitly historical docs.

## Risk summary

The highest risk is deleting parsers or stable IDs before deciding save support. The second-highest risk is leaving the 32 C2A-approved board effects unimplemented or treating the seven still-unapproved no-op effects as harmless compatibility: they keep Heat authorable and obscure missing intended consequences. The safest sequence is tests, content retirement, current-model narrowing, documentation/assets, and only then an optional save-version removal.

**No compatibility field, action, schema, content definition, UI path, asset, or test was removed or modified in this audit pass.**
