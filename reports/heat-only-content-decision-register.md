# Heat-only content decision register

All decisions are pending approval.

| Decision | Content IDs | Question | Preferred decision | Risk | Dependency | Status |
|---|---|---|---|---|---|---|
| H1D-001 | five removal candidates | Are empty recovery clauses valuable? | Implemented in Phase 1E with no replacement; existing note/escalation behavior preserved | Low | completed | Superseded |
| H1D-002 | seven Contract rewards | What replaces absent Contract recovery rewards? | Implemented as exactly 1 Salvage through `COMPLETE_CONTRACT` in Phase 1F | Low | completed | Superseded |
| H1D-002A | anomaly-bellrain-inversion | Should the anomaly recovery become a bounded test reward? | Retain for the test/challenge batch | Medium | test design | Recommended |
| H1D-003 | sixteen economy/equipment entries | How are tolls, theft, and requisitions enforced? | Exact Salvage floors or deterministic Equipment choice | High | authoritative transaction tests | Recommended |
| H1D-004 | eight test/temporary entries | Can current modifier state express expiry? | Use specified tests/modifiers only when existing infrastructure supports them | High | modifier audit | Still unresolved |
| H1D-005 | four shared-track entries | Should personal no-ops become shared setbacks? | Two Loss Pressure and two Global Escalation increments | Critical | mode/frequency approval | Still unresolved |
| H1D-006 | three Wound entries | Is injury proportionate? | One preventable Wound on the named failure branch | High | recovery-frequency model | Still unresolved |
| H1D-007 | hymn-scarred-zealot | Is a specific Scar justified? | Languishing Mind, duplicate fallback 1 Wound | Critical | content and Scar approval | Blocked |
| H1D-008 | three route/gate entries | Can existing state express the restriction? | End current interaction/movement without rollback | High | engine capability proof | Still unresolved |
| H1D-009 | void-salt-sickness | Can polarity be repaired coherently? | Retire normal availability, retain ID alias | Medium | catalog compatibility | Recommended |

Alternatives rejected globally: blanket Heat-to-Wound, random Scar distribution, generic pressure conversion, new Risk resource, negative Salvage, prose parsing, and client-authoritative resolution.

## Phase 1G floor-zero Salvage loss

| Decision | Content IDs | Question | Preferred decision | Risk | Dependency | Status |
|---|---|---|---|---|---|---|
| H1G-001 | `escalation-crownfall-writ`, `ash-rat-skitter`, `bridge-toll-runt`, `gutter-bell-mite`, `pale-toll-enforcer`, `rust-mote-drone`, `toll-scrip-urchins` | Can unavoidable economic damage use a typed floor-zero consequence? | Implemented as automatic `lose_salvage 1`, with partial loss and no affordability gate | Low | completed | Superseded |
| H1G-002 | `gate-tax-collectors` | Can the fee resolve without a payment window? | No; preserve the Heat no-op until authoritative affordability and transaction timing exist | High | payment lifecycle | Blocked |
| H1G-003 | `rust-choir-peddlers` | Can an optional offer use automatic loss? | No; preserve the Heat no-op until an authoritative choice/payment window exists | High | choice lifecycle | Blocked |

## Phase 1H payment/choice design

| Decision | Content IDs | Question | Preferred decision | Risk | Dependency | Status |
|---|---|---|---|---|---|---|
| H1H-001 | shared architecture | How should encounter payments pause and resume? | Narrow typed `encounter_payment`, persisted owner decision, bounded results, one atomic request | Medium | explicit architecture approval | Recommended |
| H1H-002 | `gate-tax-collectors` | What is the exact required payment? | After combat loss, pay exactly 1 Salvage if able; at zero, record no debt and continue; enemy remains; no movement effect | Low | H1H-001 | Recommended |
| H1H-003 | `rust-choir-peddlers` | What enforceable benefit replaces the undefined offer? | After victory, optionally pay 1 Salvage to heal 1 Wound; decline/free unavailable path; trophy/note cleanup unchanged | Medium | explicit benefit approval plus H1H-001 | Blocked |

## Phase 1I encounter payment implementation

| Decision ID | Content ID | Question | Current result | Risk | Dependency | Status |
|---|---|---|---|---|---|---|
| H1I-001 | shared encounter payment | Can encounter payment pause, persist, validate, and resume atomically? | Typed required/optional payment, owner-scoped pending state, authoritative intent, atomic deduction/result, and replay protection implemented | Low | focused schema/server/projection/reconnect tests | Implemented |
| H1I-002 | `gate-tax-collectors` | Is the post-loss levy enforceable without inventing gate behavior? | Required 1-Salvage payment when affordable; zero Salvage creates no debt; enemy remains; encounter continues | Low | H1I-001 | Implemented |
| H1I-003 | `rust-choir-peddlers` | Is the proposed paid healing benefit approved? | Content, Heat clause, allowlist entry, text, and behavior remain unchanged | Medium | explicit benefit approval | Blocked |

## Phase 1J mixed-clause cleanup

| Decision ID | Content IDs | Question | Current result | Risk | Dependency | Status |
|---|---|---|---|---|---|---|
| H1J-001 | 34 exact mixed-branch IDs | Can a no-op Heat sibling be removed without changing active siblings? | All 34 no-ops removed; exact surviving values and order preserved; no replacement added | Low | focused 34-ID manifest | Implemented |
| H1J-002 | `anomaly-red-suture-field` | Is its current outcome Heat-only? | No. Current content includes an enforced route-note sibling; the old Wound recommendation is superseded by this cleanup | Low | current content inspection | Superseded |
| H1J-003 | six retained target approvals | May approval be removed when another Heat branch or stable Heat-shaped key remains? | No. Three Heat-only branches and three stable effect keys remain explicitly approved | Low | later compatibility batches | Recommended |

## Phase 1U Rust Choir Peddlers recovery

| Decision ID | Content ID | Question | Implemented result | Risk | Evidence | Status |
|---|---|---|---|---|---|---|
| H1U-001 | `rust-choir-peddlers` loss | What replaces the obsolete loss-branch Heat no-op? | Nothing. `woundOnLoss` is omitted for this explicitly approved ID; combat-loss state is otherwise unchanged and no recovery offer opens | Low | content schema boundary plus focused loss test | Implemented |
| H1U-002 | `rust-choir-peddlers` victory | When does recovery occur? | Existing note resolves first; then an actionable optional payment offers 1 Salvage for exactly 1 Wound; decline is free | Low | ordered sequence and focused tests | Implemented |
| H1U-003 | optional eligibility | Should an impossible or meaningless offer pause play? | No. Zero Salvage or zero Wounds continues without a prompt, payment, or healing | Low | focused zero-resource tests | Implemented |
| H1U-004 | severity | Does recovery change encounter severity? | No. Severity remains the authoritative value 2 | None | current content and Git history | Implemented |

These decisions supersede H1G-003, H1H-003, and H1I-003 for Rust Choir Peddlers only. The ID leaves the legacy Heat-effect approval set. No other Heat-only recommendation changes status.

## Phase 1V Void-Salt Sickness Wound conversion

| Decision ID | Content ID | Question | Implemented result | Risk | Evidence | Status |
|---|---|---|---|---|---|---|
| H1V-001 | `void-salt-sickness` | Does the Phase 1D retirement recommendation remain authoritative? | No. The explicit Phase 1V decision supersedes H1D-009; the card remains active in Borderlight and all normal draw paths | Medium | current content, graph, and explicit approval | Superseded |
| H1V-002 | `void-salt-sickness` success | What replaces `lose_heat 1`? | Existing `heal_wound 1`, bounded at zero with no compensation or false healing summary | Medium | focused reducer/server tests | Implemented |
| H1V-003 | `void-salt-sickness` failure | What replaces `gain_heat 1`? | Existing `take_wound 1`, using current prevention, threshold, Scar, and recall handling | Medium | focused prevention and recall tests | Implemented |

Severity remains 1. Stable identity, art, Borderlight membership, Forge 5 check, and cleanup are unchanged. The ID leaves the legacy Heat approval set; no other recommendation changes status.

## Phase 1W reconstructed decision map (pending approval)

The missing Phase 1D population is superseded by a reproducible scan of current canonical content. Phase 1W finds 36 IDs / 38 explicit Heat-only branches / 38 effects, not the inherited 27/29 estimate. The exact split is 25 `gain_heat`, 3 `gain_heat_all`, and 10 `lose_heat`; compatibility approvals remain 52.

| Decision | IDs | Recommendation | Status |
|---|---:|---|---|
| H1W-001 | 4 | Remove blank clauses without replacement | Pending approval |
| H1W-002 | 7 | Two `gain_salvage 1` and five automatic floor-zero `lose_salvage 1` outcomes | Pending balance approval |
| H1W-003 | 10 | Bounded Wound/healing family including paired Lantern; isolate two-Wound Doppelganger | Pending balance approval |
| H1W-004 | 4 | One Signal 7 anomaly test and three turn-expiring stat modifiers | Pending infrastructure approval |
| H1W-005 | 4 | Two Loss Pressure and two Global Escalation steps | Pending high-risk approval |
| H1W-006 | 2 | Owner-private equipped normal Equipment loss | Pending infrastructure approval |
| H1W-007 | 1 | Existing Bell-Deafened Scar; duplicate fallback 1 Wound | Pending high-risk approval |
| H1W-008 | 4 | Forced displacement, note choice, required-payment discount, and public adjacent-sector scouting | Pending bespoke approval |

Normative per-ID rules and batches are recorded in the Phase 1W reports. No recommendation is implemented. H1D-002A through H1D-008 remain historical summaries only where Phase 1W now supplies exact current decisions.

## Phase 1X four Wound conversions — implemented

The removal-only preflight and later `none` proposal are superseded by explicit approval to use the existing Wound system.

| Decision ID | Content IDs | Implemented rule | Status |
|---|---|---|---|
| H1X-001 | `bell-mask-pilgrim`, `cracked-censer-novice`, `glasswing-midge-cloud` | Replace each `woundOnLoss` `gain_heat 1` with `take_wound 1`; retain enemy persistence, severity, rewards, identity, art, and availability | Implemented |
| H1X-002 | `roadside-bone-oracle` | Replace `failEffect` `gain_heat 1` with `take_wound 1`; retain success note, severity, identity, art, availability, and failure continuation | Implemented |

All four use authoritative Wound prevention and recall handling. Exactly four Heat approvals were removed. Counts are now 32 Heat-only IDs / 34 branches / 34 effects and 48 compatibility approvals. No `none` effect or schema exception was added. Other Phase 1W decisions remain pending.

## Heat-to-Wound Batch 1 physical losses — implemented

| Decision ID | Content ID | Branch | Implemented rule | Status |
|---|---|---|---|---|
| HWB1-001 | `ash-cinder-runt` | `woundOnLoss` | Replace `gain_heat 1` with authoritative `take_wound 1` | Implemented |
| HWB1-002 | `grave-silt-press` | `failEffect` | Replace `gain_heat 1` with authoritative `take_wound 1` | Implemented |
| HWB1-003 | `mirror-mite-bloom` | `woundOnLoss` | Replace `gain_heat 1` with authoritative `take_wound 1` | Implemented |
| HWB1-004 | `relay-pilgrim-riot` | `woundOnLoss` | Replace `gain_heat 1` with authoritative `take_wound 1` | Implemented |

Each conversion uses existing prevention, actual-delta reporting, threshold recall, Scar-on-recall, continuation, and reconnect behavior. Severity, identity, art, rewards, lane/deck, and graph placement remain unchanged. Four exact Heat approvals were removed; current counts are 28 Heat-only IDs / 30 branches / 30 effects and 44 compatibility approvals. Choir Static Burst, Lantern-Moth Swarm, Mirror-Rot Interference, Ashen Doppelganger, unsuitable-for-Wounds IDs, and individual-redesign branches remain pending and unchanged.

## Heat-to-Salvage reward Batch 1 — implemented

| Decision ID | Content ID | Branch | Implemented rule | Status |
|---|---|---|---|---|
| HSB1-001 | `anomaly-bellrain-inversion` | `resolveEffect` | Replace `lose_heat 1` with authoritative `gain_salvage 1` | Implemented |
| HSB1-002 | `compact-equipment-requisition` | Contract `reward` | Replace `lose_heat 1` with `gain_salvage 1`, paid only by canonical `COMPLETE_CONTRACT` | Implemented |
| HSB1-003 | `latchspire-raider` | `defeatReward` | Replace `lose_heat 1` with authoritative `gain_salvage 1`; loss remains `take_wound 1` | Implemented |

The three rewards are immediate, owner-scoped, replay-safe, and add no shop transaction, Equipment grant, payment, or Salvage Ledger trigger. Three exact Heat approvals were removed. Counts are now 25 Heat-only IDs / 27 branches / 27 effects and 41 compatibility approvals. The five automatic Salvage-loss candidates and all other Phase 1W decisions remain pending and unchanged.

The older estimate of 39 mixed IDs reconciles to 34 current branch-level candidates plus five stale estimate-only records. Rust Choir Peddlers and all remaining Heat-only decisions are unchanged.

Phase 1D's “pay up to 1, floor 0” wording is superseded as payment semantics: payment is full or absent, never partial. Phase 1H itself made no mechanics changes; Phase 1I implements only the approved shared boundary and Gate Tax decision above.
