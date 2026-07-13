# Heat retirement decision register

| Decision ID | Question | Current behavior | Available options | Recommended option | Risk if deferred | Blocks phase |
|---|---|---|---|---|---|---|
| HRD-001 | Does Heat survive internally as compatibility? | Required character/session fields | Retain indefinitely; adapter then remove; destructive removal | Versioned adapter then removal | Save/reconnect breakage | 2, 4, 5 |
| HRD-002 | What happens to nonzero Heat in old saves? | Preserved but mostly unusable | Discard; archive; compensate; translate | Preserve in legacy envelope, grant no conversion until designed | Exploits or unfair compensation | 4 |
| HRD-003 | What replaces generic `gain_heat*`? | Accepted no-op with legacy log | Remove; Scar; Wound; pressure; escalation; per-card mix | Per-card/family approvals; default no conversion | Major balance drift | 3 |
| HRD-004 | What replaces `lose_heat` rewards? | No-op | Remove reward; heal; remove Scar; Salvage; other | Revalue each reward; do not remove Scar by default | Rewards become meaningless | 3 |
| HRD-005 | What is Black Route Fuse's `heatCost`? | Heat metadata/Risk presentation | Wound; Salvage; charge; cooldown; remove | Separate item approval | Free or lethal activation | 3 |
| HRD-006 | What is the Heat-cost shop service currency? | Cost displayed as Risk | Salvage; Wound; Scar; service risk roll; remove | Redesign service with explicit visible cost | Shop exploit/confusion | 3 |
| HRD-007 | Is direct Heat reduction still valuable? | Server can reduce stored Heat and emit delta | Remove; replace reward; compatibility only | Identify owning action, then revalue | Invisible reward/state mutation | 3 |
| HRD-008 | Does Heat affect defeat? | Old threshold action exists; server trigger false | Restore; delete after migration; repurpose | Do not restore; retire after compatibility | Accidental second defeat track | 2, 5 |
| HRD-009 | What replaces `heatThreshold` for Mirror pressure? | Mirror compares pressure to Heat-named field | Scenario parameter; escalation threshold; retain alias | Add scenario-specific authoritative threshold | Mirror flow breaks on deletion | 4 |
| HRD-010 | Does Scar-Sink Prayer fully replace Heat-Sink Prayer? | Player name/rule advanced; stable legacy ID remains | Rename ID; alias ID; retain ID | Retain ID, enforce player-facing name | Save/item-instance breakage | 1, 4 |
| HRD-011 | Are `heatDelta` result fields consumed? | Emitted and typed; direct UI coverage unclear | Stop emit; hide; version away | Add consumer telemetry/test, then stop emit | Hidden state or client incompatibility | 1, 4 |
| HRD-012 | Can old rooms with Heat load? | Schema requires fields; no formal migration found | Unsupported; retain forever; version migration | Build explicit legacy fixtures before promise | Data loss | 4 |
| HRD-013 | Do QA characters/fixtures intentionally need Heat? | Many seed values, mostly compatibility | Rewrite all; preserve golden legacy fixtures | Keep a small named legacy suite, normalize rest later | False coverage or test churn | 2, 5 |
| HRD-014 | Did Global Escalation replace Heat? | Distinct active scenario track | Global replacement; selective replacement; unrelated | Selective only after scenario review | Shared difficulty distortion | 3 |
| HRD-015 | Did Loss Pressure replace Heat? | Distinct defeat-progress track | Global replacement; selective; unrelated | Selective only for explicitly scenario-level effects | Personal penalty becomes table loss | 3 |
| HRD-016 | Are Heat loss conditions reachable? | Schema supports them; full path unproven | Migrate; remove; retain adapter | Trace catalog/action reachability first | Broken card resolution | 2, 3 |
| HRD-017 | Should legacy Threat effect keys be renamed? | Stable keys map to no-op/Scar logic | Rename; aliases; retain | Add canonical keys plus read aliases | Content parsing breakage/new misuse | 2, 5 |
| HRD-018 | May one migrated event inflict Wound and Scar? | Some sequences and wound-threshold aftermath can do both | Prohibit; allow authored sequence; replacement priority | Allow only explicit authored sequence with timing | Double punishment ambiguity | 3 |
| HRD-019 | How are migrated effects matched by missions/scenarios? | Legacy no-op effects may still count as resolved events | Preserve event identity; rematch outcome; drop | Preserve authoritative resolution identity separately from consequence | Duplicate/lost progress | 3 |
| HRD-020 | What player term replaces “Risk”? | Used for Heat costs | Exact cost; generic Risk; remove | Display exact approved currency/effect | Players cannot predict cost | 1, 3 |
| HRD-021 | Which modes are canonical? | Solo, co-op, rivalry, ruthless, Nemesis Relay coexist at layers | Flatten; document layers; rename | Document layers; deprecate aliases deliberately | Wrong privacy/victory rules | 0, 1 |
| HRD-022 | Which attributes are canonical? | Runtime uses Command/Grit/Signal/Guile/Forge | Runtime set; older Cunning/etc.; redesign | Keep runtime set | Rules/content mismatch | 0, 1 |
| HRD-023 | Can generated content mention Heat? | Prompts and generated descriptions can reintroduce it | Ban substring; contextual lint; manual review | Context-aware mechanical phrase lint | Reintroduction or false positives | 2 |
| HRD-024 | What is the compatibility support window? | No version/telemetry policy | One release; N versions; indefinite | Define at Phase 0 based on save distribution | Premature deletion | 4, 5 |

## Highest-priority blockers

The first ten implementation-blocking decisions are HRD-001, 002, 003, 005, 006, 007, 009, 011, 012, and 019. Until those are answered, only player-copy concealment and guardrail work is safely separable.

## Phase 1A clarifications

- **HRD-020 clarified, not mechanically resolved:** real legacy costs use the temporary label `Risk cost: N`; Risk is not a new resource and generic no-op effects never create it.
- **HRD-022 resolved:** Command, Grit, Signal, Guile, and Forge are the authoritative current attributes. The assumed Cunning/Strength/Understanding/Faith set is rejected as documentation drift.
- HRD-001 through HRD-019 and HRD-023 through HRD-024 remain mechanically unresolved unless noted above.

## Phase 1C implementation status

- **HRD-005 implemented:** Black Route Fuse has no payment cost. Accepted use still discards it, grants +3 Grit to its matching battle roll, and advances Global Escalation by 1.
- **HRD-006 implemented for active services:** `risk-action` is Deep Relic Search and authoritatively costs 1 Salvage. `buy-boon` retains its stable ID but is unavailable until it receives an enforceable design.
- **HRD-007 implemented:** the cross-seat bound-Nemesis reward remains two trophies and no longer changes stored legacy Heat.
- **HRD-011 implemented for ordinary play:** migrated paths omit Heat deltas; shared compatibility shapes remain readable.
- **HRD-020 implemented:** the temporary Risk presentation is removed rather than promoted into a resource.
- HRD-001 through HRD-004, HRD-008 through HRD-010, HRD-012 through HRD-019, and HRD-021 through HRD-024 retain their prior status except where explicitly clarified above.
# Phase 1D individual-content addendum

Phase 1D reviews the 50 primary Heat-only IDs as 53 Heat-effect branches. Recommendations remain pending approval: five removals, four Wounds, one Scar, two Loss Pressure, two Global Escalation, nineteen Salvage treatments, two Equipment effects, six tests/challenges, eight bespoke rewrites, one retirement, and zero intentional deferrals. Exact decisions and batch gates are recorded in `heat-only-content-individual-decisions.md`, `heat-only-content-balance-model.md`, `heat-only-content-implementation-batches.md`, and `heat-only-content-decision-register.md`.

Immediate approval candidates are the proven clause removals and bounded Contract rewards. Temporary modifier, shared-pressure, Wound, Scar, movement/gate, and retirement changes require their named design or engine gates. No content migration is implemented by this addendum.
# Phase 1E Batch 1 implementation

Phase 1E implements the five approved clause-removal decisions: `anomaly-ashfall-murmur`, `anomaly-glassmere`, `escalation-ashfall-curfew`, `escalation-ridge-suture`, and `escalation-webglass-afterimage`. Their obsolete `lose_heat` members are removed without replacement. Existing notes and escalation reductions remain. These IDs leave the compatibility allowlist, reducing it from 119 to 114; remaining content migration decisions are not implemented.
# Phase 1F low-risk Salvage implementation

Phase 1F migrates seven implementation-ready Contract rewards to the existing `gain_salvage 1` effect: `cartel-crossing-thread`, `choir-echo-triangulation`, `choir-hush-census`, `choir-well-canticle`, `clan-salt-burial`, `contract-beacon`, and `warden-span-vigil`. Nine Severity-1 loss/payment recommendations remain blocked because no typed floor-zero loss effect or authoritative content-choice transaction exists. The allowlist decreases from 114 to 107; no other recommendation is implemented.

# Phase 1G floor-zero Salvage loss implementation

Phase 1G implements the seven automatic-loss blockers with the typed `lose_salvage 1` consequence: `escalation-crownfall-writ`, `ash-rat-skitter`, `bridge-toll-runt`, `gutter-bell-mite`, `pale-toll-enforcer`, `rust-mote-drone`, and `toll-scrip-urchins`. Loss is automatic, permits partial resolution, clamps at zero, reports only actual mutation, and opens no payment prompt. `gate-tax-collectors` and `rust-choir-peddlers` remain blocked on authoritative payment/choice state. The allowlist decreases from 107 to 100; no higher-severity or non-Salvage recommendation is implemented.

# Phase 1H payment/choice design status

Phase 1H recommends a narrow persisted `encounter_payment` decision rather than reusing `lose_salvage`, shop-only services, or content-specific actions. Gate-Tax Collectors is recommended as a required 1-Salvage post-loss levy with a zero-Salvage no-debt alternative and no movement effect. Rust Choir Peddlers receives an exact proposed post-victory offer—pay 1 Salvage to heal 1 Wound—but remains blocked until that newly authored benefit is explicitly approved. Both IDs remain unchanged and allowlisted; no decision is implemented.

# Phase 1I encounter payment implementation

Phase 1I implements the narrow persisted `encounter_payment` architecture and migrates only `gate-tax-collectors`. A lost confrontation requires an authoritative 1-Salvage payment when affordable; at zero Salvage no debt or false delta is created, the enemy remains unresolved, and the encounter continues. Payment is distinct from automatic `lose_salvage`, owner-scoped, atomic, versioned, reconnect-safe, and replay-protected. Gate Tax leaves the Heat allowlist, reducing it from 100 to 99. `rust-choir-peddlers` remains unchanged, allowlisted, and blocked pending approval of its proposed benefit. No other content migration decision is implemented.

# Phase 1J mixed-clause cleanup

Phase 1J removes 34 generic Heat no-ops from sequences that retain enforced typed siblings. Twenty-eight IDs leave the explicit compatibility allowlist; six remain approved because they carry a separate Heat-only branch or stable Heat-shaped effect key. Surviving effects retain exact order, values, targets, and branches. No replacement mechanic, runtime behavior, schema, save field, or session state is introduced.

Current inspection corrects `anomaly-red-suture-field` from the Phase 1D Heat-only population: its sequence has an enforced `gain_note` sibling, so its obsolete Heat member is removed here and its proposed Wound replacement is superseded. The corrected remaining Heat-only population is 29 IDs / 32 branches. Rust Choir Peddlers, authored defaults, stored `character.heat`, Mirror `heatThreshold`, and generic compatibility discriminators remain preserved or unresolved as previously recorded.

# Phase 1L authored-default quarantine

- **HRD-013 implemented for authoring quarantine only:** exactly 17 canonical character IDs may retain required integer `heat: 0`; new, copied, renamed, QA, missing-approval, or nonzero authored defaults are rejected.
- **HRD-023 implemented for validation separation:** 40 construct-specific Heat-effect IDs, 17 character-default IDs, and 14 other compatibility IDs are disjoint validation classes with zero overlap and 71 combined unique IDs.
- Runtime, schema, character content, serialization, reconnect, projection, Mirror, generic no-op behavior, and old nonzero value preservation are unchanged.
- **Not implemented:** removal of the 17 JSON fields, compatibility construction, optional `character.heat`, new-save omission, versioned migration, projection retirement, support-window closure, schema deletion, and Mirror-key migration.

# Phase 1M compatibility-construction boundary

- **HRD-001 implemented for new-character construction only:** one named compatibility helper now supplies exactly `heat: 0` to all four authoritative new-character paths. Initial sessions, selection, fresh replacement/setup construction, and recalled-character replacement no longer derive Heat from authored character data.
- **HRD-002 preserved:** loaded and reconnected nonzero values remain exact and mechanically inactive; no constructor runs over existing state and no value is converted.
- Two immutable shop copies continue preserving stored Heat, and the two zero-valued phone/TV compatibility projection keys remain unchanged.
- **Not implemented:** removal of the 17 JSON fields, authoring omission support, optional `character.heat`, new-save omission, save versioning, projection retirement, old-value support-window closure, schema deletion, Mirror-key migration, Heat-only outcomes, Rust Choir Peddlers, or discriminator removal.

# Phase 1N authored-character omission boundary

- **HRD-001 implemented for authored content only:** canonical character definitions use a distinct strict schema that excludes Heat; all 17 top-level `heat: 0` members are removed, and new authored Heat is rejected rather than stripped.
- **HRD-013 implemented for canonical authoring cleanup:** the 17 Phase 1L character-default approvals are retired. The compatibility union now contains only 40 Heat-effect IDs and 14 other compatibility IDs, with zero overlap and 54 combined unique IDs.
- **HRD-002 preserved:** the persisted/runtime character schema still requires Heat, accepts historical nonzero values, serializes them exactly, and reconnects without normalization or conversion. New runtime characters still receive zero from the Phase 1M constructor.
- **Not implemented:** optional runtime `character.heat`, new-save omission, versioned migration, projection-key retirement, old-value support-window closure, runtime-field removal, Mirror-key migration, Heat-only outcome migration, Rust Choir Peddlers, or discriminator removal.

# Phase 1O runtime-persistence design (pending approval)

- **HRD-001 preferred decision:** normalize at a versioned session-snapshot boundary into a current Heat-free runtime character shape. Do not spread `heat?: number` through gameplay consumers.
- **HRD-002 preferred decision:** valid legacy nonzero values receive no gameplay conversion and move to an envelope-level, non-projected legacy compatibility record; zero values are omitted. Fresh saves never create the record.
- **HRD-012 preferred decision:** add monotonic integer `saveVersion`; missing version means strict legacy v0, current format is v1, and unknown future versions fail safely. Migration is pure, deterministic, idempotent, and runs before room creation—not during reconnect.
- **HRD-024 preferred decision:** retain v0 parsing and nonzero legacy metadata until a separately approved support-window closure gate. No calendar deadline is inferred without persistence-distribution evidence.
- **Constructor retirement preferred decision:** Phase 1P removes all four current-runtime helper call sites, changes the boundary guard to forbid runtime Heat construction, and deletes the helper after zero call sites remain.
- **Projection timing preferred decision:** retain both constant-zero phone/TV compatibility keys during Phase 1P; network projection retirement requires a separate protocol/deployment decision and must not reuse the save version.
- These are design recommendations only. Runtime optionality, save versioning, migration, new-save omission, constructor retirement, and projection changes remain unimplemented.

# Phase 1P versioned runtime migration

- **HRD-001 implemented for current runtime and snapshots:** current characters are strict and Heat-free; v1 snapshots require `saveVersion: 1` and reject direct character Heat.
- **HRD-002 implemented for historical preservation:** strict unversioned v0 parsing requires legacy Heat, drops validated zero during migration, and preserves valid nonzero values exactly in owner-scoped, non-gameplay envelope metadata. Values are never converted.
- **HRD-012 implemented at the snapshot boundary:** one pure deterministic dispatcher migrates v0 before future room construction, validates v1 directly, fails closed on unknown versions, and remains separate from reconnect and action handling. No production persistence backend is introduced.
- **HRD-024 remains open:** v0 parsing and nonzero archival metadata have no automatic expiry. Closing the compatibility support window requires separate explicit approval.
- The Phase 1M compatibility constructor and its four call sites are retired; current construction, selection, setup, and replacement produce Heat-free characters.
- The two hardcoded zero projection compatibility keys remain unchanged. Projection-key retirement and network protocol versioning remain unimplemented.
- **Not implemented:** historical metadata removal, legacy v0 parser removal, Mirror-key migration, Heat-only outcome migration, Rust Choir Peddlers, or generic discriminator removal.
