# Heat Compatibility Containment Phase C1 implementation

Date: 2026-07-15

Base audit: `6cd5386 docs: audit final heat compatibility boundary`

Scope: mechanical containment, projection stripping, validation/guard coverage, and reporting. No compatibility-field deletion and no authored gameplay replacement.

## Outcome

C1 neutralizes the sole gameplay-mutating legacy threshold action and establishes a final server-side Heat stripping boundary for phone and TV projections. New unapproved authored Heat constructs remain rejected. The exact unresolved imported board/scenario population is now manifest-pinned so it cannot grow or change silently.

The 39 authored effects were not changed. The sealed removal plan assigns them to C2 design approvals and supplies no remove-without-replacement or canonical replacement rule. The audit therefore remains **FAIL**, solely because active authored typed Heat effects are still present; runtime mechanical Heat behavior and active projection exposure are now zero.

## Exact authored IDs reviewed

The 39 effect occurrences belong to these 26 stable IDs:

- Board text (19): `outer_emberSanctumRest`, `outer_ashwakeClearLane`, `outer_glassmereChorus`, `outer_mirecoilTraffic`, `outer_waymarketExchange`, `outer_relayCrew`, `outer_saltCrossing`, `outer_surgeryTreatment`, `outer_oathpostWrit`, `outer_brokenCausewayShortcut`, `middle_scarSurgery`, `middle_redMarchBargain`, `inner_blackstarShortcut`, `middle_shardSprawlBargain`, `middle_guardianSpanThreshold`, `middle_webglassFracture`, `inner_veilRiftEntry`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial`.
- Scenario (1): `scenario_mirror_of_false_heroes`.
- Escalations (4): `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown`.
- Followers (2): `crownless-advocate`, `saltflat-bone-reader`.

The removal plan now contains the exact source, effect paths, wording summary, runtime handling, and disposition for every ID.

### Disposition

- IDs changed: **none**.
- Remove without replacement: **none approved**.
- Replace with canonical effect: **none approved**.
- Compatibility-only retention: generic legacy parser/resolver types remain supported and inert.
- Blocked: all 26 IDs above, pending C2 board-text, scenario, escalation, and follower approvals.

No player-facing wording changed. No Wound, Scar, Salvage, movement, Equipment, Global Escalation, test modifier, or other replacement was invented.

## `HEAT_THRESHOLD_REACHED`

### Old behavior

The action remained in `GameAction`; the reducer validated seat ownership, incremented sequence, recalled the operative, appended a public-facing outcome suffix, and recorded the action in `eventLog`.

### C1 behavior

The action remains parsable for serialized/event compatibility, but its reducer branch returns the exact input state and no emitted actions:

- no recall;
- no Wound or Scar;
- no pending Scar consequence;
- no sector or movement change;
- no Salvage, item, modifier, escalation, scenario, mission, Contract, victory, or loss change;
- no sequence change;
- no event/public/private log;
- no projection result;
- duplicate/replayed actions remain exact no-ops.

The unused `shouldTriggerHeatThreshold()` server method was removed. There are no production dispatch sites.

## Projection boundary

`src/server/legacyHeatProjection.ts` is the narrow final serialization boundary used by both `createTvProjection()` and `createPhoneProjection()`.

It recursively removes:

- Heat resource keys (`heat`, `heatCost`, `heatDelta`, `heatModifier`, `heatState`, `heatThreshold`, `operativeHeat`, `playerHeat`);
- legacy Heat effect records (`gain_heat`, `gain_heat_all`, `lose_heat`, `set_heat`, `clear_heat`);
- Heat result rows;
- legacy follower `lossCondition: "heat"`;
- exact `heat` tags.

It deliberately retains stable serialized string IDs such as `heat-sink-prayer`; the player-facing item remains Scar-Sink Prayer.

Focused projections cover owner phone, other phone, TV, lobby/waiting, navigation, resolution/test, scenario/action, shop, and reconnect reconstruction. No Heat key, resource label, effect, status, threshold, modifier, result row, or accessibility-style resource wording survives.

## Validation boundary

Existing JSON validation continues to reject new unapproved:

- `gain_heat`, `gain_heat_all`, and `lose_heat`;
- Heat costs, deltas, thresholds, or shaped fields;
- player-facing Heat resource text.

C1 adds an exact manifest for the 33 imported board/scenario occurrences. `validate:content` now rejects:

- any new board/scenario Heat effect ID;
- any added/removed/changed Heat effect signature on the 20 blocked imported IDs;
- silent expansion of the unresolved population.

The six JSON effects remain limited to their existing construct-specific manifest entries. Historical reports and compatibility/migration tests remain outside canonical content traversal.

The runtime boundary test uses exact-file allowlists for legacy effect symbols and `HEAT_THRESHOLD_REACHED`; new production modules cannot introduce those symbols unnoticed.

## Save and reconnect compatibility

Unversioned v0 and v1/v2 behavior is unchanged:

- legacy character Heat parses;
- nonzero values migrate to inert `legacyCompatibility.characterHeat` metadata;
- current character state contains no Heat;
- legacy `heatThreshold` migrates through the existing version path;
- current v2 direct Heat fields remain rejected;
- equivalent saves with Heat 0 and Heat 7 produce identical gameplay state;
- the Heat 7 metadata does not change Scars or pending Scar state;
- a legacy threshold action after migration remains inert;
- reconstructed phone/TV projections remain Heat-free.

No save field, compatibility metadata, parser, schema variant, or stable ID was deleted.

## Heat-to-Scar separation

C1 adds direct proof that:

- legacy Heat amount does not alter current state;
- legacy Heat amount does not alter Scar lists or pending Scar consequences;
- `HEAT_THRESHOLD_REACHED` cannot recall or grant a Scar;
- migration preserves Heat only as opaque metadata;
- existing Scar-Sink Prayer and Wound/recall/Scar tests remain unchanged.

No Heat-to-Scar conversion exists.

## Focused tests

Added:

- exact 39-effect / 26-ID blocked population;
- exact reducer no-op and duplicate replay;
- Heat 0 versus Heat 7 migrated-state equivalence;
- threshold action Scar separation;
- exact runtime/import allowlists;
- recursive server projection stripping;
- owner/other/TV lifecycle projection matrix;
- validation manifest addition/removal rejection.

Focused verification: 9 files / 74 tests passed, including snapshot migration, legacy containment/construction, projection retirement, result-delta filtering, and Scar triggers.

## Remaining cleanup phases

1. C2 board-text effect approval (32 occurrences / 19 IDs).
2. C2 scenario approval (`scenario_mirror_of_false_heroes`).
3. C2 escalation approval (4 IDs), reconciling existing `escalationDelta` without double pressure.
4. C2 follower approval (2 active effects plus separately tracked Heat loss conditions).
5. Current-model/schema narrowing only after authored effects reach zero.
6. Documentation and asset residue cleanup.
7. Optional save-version boundary/full compatibility-field deletion.

## Verdict

**FAIL remains correct after C1.**

- Active authored typed Heat effects: 39 — blocked and unchanged.
- Runtime Heat-state mechanical reads/writes: 0.
- Gameplay-mutating Heat actions: 0.
- Active projection Heat fields/labels: 0.
- Heat-to-Scar conversion: 0.
- Legacy save compatibility: retained.

C1 materially contains runtime risk but cannot reach CONDITIONAL PASS until C2 supplies and implements explicit dispositions for all 39 authored effects.
