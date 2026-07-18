# Heat Compatibility C6D — Legacy follower and Threat metadata migration

Status: **IMPLEMENTED**

Verdict: **CONDITIONAL PASS**

Save version: **2**

## Scope and outcome

C6D removed 14 retired Heat-shaped metadata occurrences from canonical content without adding a replacement mechanic:

- follower metadata: 5 occurrences;
- Threat effect keys: 5 occurrences;
- Threat resource tags: 4 occurrences.

Current follower and Threat loaders now parse canonical files through canonical schemas only. Historical v0, v1, and v2 objects continue through legacy-compatible schemas and explicit normalization before entering current runtime.

## Follower metadata migrated

| Stable ID | Retired canonical metadata | Canonical result |
|---|---|---|
| `black-lantern-broker` | `lossCondition: "heat"` | field omitted |
| `choir-defector` | `lossCondition: "heat"` | field omitted |
| `gate-saint-acolyte` | `lossCondition: "heat"` | field omitted |
| `saltflat-bone-reader` | `lossCondition: "heat"` | field omitted |
| `lucy-hell-puppy` | `heat` tag | exact tag removed; other tags retain order |

`legacyCompatibleFollowerSchema` still accepts both historical forms. `normalizeLegacyFollowerMetadata` discards the retired loss condition and tag. The follower stays attached to the same owner; it is not discarded, exhausted, transferred, or given another consequence.

Crownless Advocate and Saltflat Bone-Reader retain their exact explicit `gain_note` effects and server-enforced `oncePerRound` boundary. Removing Saltflat Bone-Reader's legacy loss condition does not trigger a role fallback.

## Threat metadata migrated

| Stable ID | Retired canonical metadata | Canonical result |
|---|---|---|
| `grave-lattice-reclaimer` | `threat_pay_heat_or_enemy_plus_two`; `heat` tag | `threat_enemy_plus_two`; tag removed |
| `mirror-lord-envoy` | `threat_combat_plus_one_if_player_has_heat`; `heat` tag | `threat_combat_plus_one_if_player_has_scar`; tag removed |
| `iron-lung-grenadier` | `threat_force_choose_heat_or_wound`; `heat` tag | reveal key omitted; tag removed |
| `reliquary-judge` | `threat_force_discard_gear_or_gain_heat`; `heat` tag | reveal key omitted; tag removed |
| `pale-marshal` | `threat_defeat_reduce_heat` | defeat key omitted |

The two renamed keys preserve the already-authoritative runtime outcomes:

- Mirror-Lord Envoy adds one enemy bonus only when the operative has at least one Scar.
- Grave-Lattice Reclaimer adds two to the enemy.

The three removed card keys already produced no additional gameplay consequence. Their removal does not add Wounds, Scars, Salvage, escalation, movement, notes, rewards, or choices.

Threat identity, lane, difficulty, rewards, Trophy behavior, art, timing, and deck distribution remain unchanged: Red 26, Blue 35, Yellow 48, total 109.

## Current and legacy schema boundary

Canonical Threat effect-key fields now use `threatEffectKeySchema`, which admits only the 33 current keys. Legacy Threat input uses `legacyCompatibleThreatEffectKeySchema`, which additionally accepts the exact ten historical Heat-shaped keys.

The legacy key adapter is exhaustive:

| Historical key | Normalized result |
|---|---|
| `threat_combat_plus_one_if_player_has_heat` | `threat_combat_plus_one_if_player_has_scar` |
| `threat_pay_heat_or_enemy_plus_two` | `threat_enemy_plus_two` |
| `threat_fail_wound_and_heat` | `threat_fail_take_wound` |
| `threat_heat_on_reveal` | omitted |
| `threat_all_heat_on_reveal` | omitted |
| `threat_force_choose_heat_or_wound` | omitted |
| `threat_force_discard_gear_or_gain_heat` | omitted |
| `threat_fail_gain_heat` | omitted |
| `threat_fail_gain_two_heat` | omitted |
| `threat_defeat_reduce_heat` | omitted |

Legacy typed Heat leaves still normalize to `legacy_compatibility_noop` through the C6C adapter. No legacy metadata is cast into the canonical union and no Heat value becomes another mechanic.

Current follower metadata structurally excludes `lossCondition: "heat"` and the retired mechanical `heat` tag. Legacy follower input retains those exact historical forms only at the compatibility boundary.

## Serialization and reconnect

- save version remains 2;
- new snapshots serialize canonical follower and Threat metadata only;
- v0, v1, and historical v2 snapshots containing the retired fields parse and migrate;
- normalized current state omits the retired metadata;
- historical pending Threats retain card identity and non-Heat effects;
- reconnect does not replay a removed key or detach a follower;
- equivalent old metadata produces no replacement consequence;
- projection stripping remains as defense in depth for stale payloads.

Historical metadata is not required to round-trip byte-for-byte after normalization. Stable content identity, source-event identity, use boundaries, and gameplay state continue to round-trip safely.

## Validation and regression guards

The canonical follower and Threat loaders no longer contain frozen Heat-metadata allowlists. Structural schemas reject the retired fields and tags. Legacy schemas accept them only for migration.

Focused coverage proves:

- canonical follower metadata Heat count is zero;
- canonical Threat metadata Heat count is zero;
- follower catalog remains 24;
- Threat catalog remains 109 with 26/35/48 lane distribution;
- all ten legacy Threat keys normalize exhaustively;
- the two renamed behaviors and the mixed Wound behavior remain exact;
- v0/v1/v2 follower and pending-Threat inputs normalize safely;
- C5B note ownership, once-per-round limits, reconnect, and privacy remain exact;
- owner phone, other phones, and TV remain Heat-free.

The compatibility approval union now contains 2 exact effect approvals and 5 unrelated stable-ID approvals. Ten migrated follower/Threat records were removed from `OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS`; validation continues to reject newly authored Heat.

## A–G reclassification

The comparable corpus uses the C6C search method and excludes the C6C/C6D implementation reports plus the three current reports updated by this phase. Before C6D it contained 4,102 occurrences across 253 files. After C6D it contains **4,104 occurrences across 242 files**.

| Category | Before | After | Finding |
|---|---:|---:|---|
| A — Active authored gameplay | 0 | 0 | No canonical Heat mechanic |
| B — Environmental/art presentation | 13 | 13 | Mechanical exposure remains 0 |
| C — Required compatibility | 320 | 297 | Metadata moved from canonical records into exact legacy schemas/adapters |
| D — Tests and fixtures | 946 | 971 | Added migration, schema, behavior, save, and reconnect evidence |
| E — Documentation/history | 2,822 | 2,822 | Historical record retained; C6E remains pending |
| F — Dead/obsolete residue | 1 | 1 | `heat_on_threat_defeat` remains deferred to C6F |
| G — Ambiguous | 0 | 0 | Every reference remains classified |

Counts are mutually exclusive and sum to 4,104. The objective is isolation, not arbitrary substring reduction.

## Verification

Passed before commit:

- content validation: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions;
- TypeScript typecheck;
- focused C6D and legacy-validation tests: 2 files / 30 tests;
- focused C6C, follower, projection, and phone compatibility set: 5 files / 118 tests;
- engine and rules: 60 files / 712 tests;
- rules constituent: 6 files / 35 tests;
- integration and reconnect: 27 files / 234 tests;
- client: 26 files / 260 tests;
- aggregate: 113 files / 1,206 tests;
- asset audit: 418 / 418 present, zero missing, invalid, placeholder, or release-blocking assets;
- production build.

The first engine run found ten stale compatibility-population assertions. Those narrow guards were updated from the pre-C6D size 16 to the exact post-C6D size 7 while preserving their membership and authoring-rejection checks.

The reconnect timing regression passed in both integration and aggregate runs without retry. Existing missing-art fallback diagnostics remained test-only and non-failing; the complete asset audit passed.

## Deferred boundary

The verdict remains **CONDITIONAL PASS**. C6D does not remove:

- the six misleading current-documentation statements assigned to C6E;
- legacy state/effect/action/result parsing;
- projection stripping;
- `legacyCompatibility.characterHeat`;
- the stable serialized Nemesis identifier `heat_on_threat_defeat`;
- the final save-version and compatibility-deletion decision assigned to C6F.

No gameplay rule, follower ability, Threat outcome, UI, asset, save version, or expansion approval changed.
