# Heat Compatibility C5A - Final Follower Approval

Date: 2026-07-15

Checkpoint: `ea4b1da feat: remove marrow escalation heat effect`

Scope: report-only approval for `crownless-advocate` and `saltflat-bone-reader`. No follower definition, gameplay code, schema, validation, test, projection, UI, asset, or compatibility field changed in this pass.

## Decision summary

Both remaining authored `lose_heat 1` effects are **APPROVED** to be replaced by the existing canonical owner-private `gain_note` consequence.

This is not a Wound, Scar, Salvage cost, payment, Global Escalation increase, movement effect, temporary modifier, follower discard, follower exhaustion, or new cooldown. Each follower retains its current owner-only activation and `oncePerRound` limit. The replacement records the already-authored table benefit without introducing a numerical gameplay modifier.

| Stable ID | Current typed effect | Approved typed effect | Final player-facing rule | Status |
|---|---|---|---|---|
| `crownless-advocate` | `lose_heat 1` | `gain_note`: `Crownless Advocate: one faction demand or rivalry bargain was softened.` | `Once per round, record that the Crownless Advocate softened one faction demand or stabilized one rivalry bargain.` | **APPROVED** |
| `saltflat-bone-reader` | `lose_heat 1` | `gain_note`: `Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note.` | `Once per round, record a safer route note from one scar, omen, or void-salt bargain.` | **APPROVED** |

Approval count: **2 approved / 0 blocked**.

Projected authored typed Heat after implementation: **0 occurrences across 0 IDs**.

Projected audit verdict after implementation and a complete boundary rerun: **CONDITIONAL PASS**, not PASS. Active authored Heat and player-facing Heat would be zero, and runtime compatibility is already inert, but save adapters, legacy follower metadata such as `lossCondition: "heat"`, compatibility types, historical documentation, and dead residue still require the planned narrowing and cleanup phases.

## Exact authored-effect inventory

Repository classification resolves to exactly two remaining canonical follower Heat effects and no others:

| Stable ID | Display name | Source | Role | Current text | Typed Heat effect | Trigger | Frequency | Runtime status |
|---|---|---|---|---|---|---|---|---|
| `crownless-advocate` | Crownless Advocate | `content/followers/crownless-advocate.json` | `informant` | `Once per round, soften a faction demand or cancel one unstable cost from a rivalry bargain.` | `activeEffect: { type: "lose_heat", amount: 1 }` | Owner chooses Use during the active seat's action phase | `oncePerRound` | Effect is parsed, accepted, and recorded as follower use; Heat mutation is an exact compatibility no-op |
| `saltflat-bone-reader` | Saltflat Bone-Reader | `content/followers/saltflat-bone-reader.json` | `ritualist` | `Once per round, turn a scar, omen, or void-salt bargain into a safer route note.` | `activeEffect: { type: "lose_heat", amount: 1 }` | Owner chooses Use during the active seat's action phase | `oncePerRound` | Effect is parsed, accepted, and recorded as follower use; Heat mutation is an exact compatibility no-op |

No follower definition contains `gain_heat` or `gain_heat_all`. Other Heat-shaped follower residue is compatibility metadata, not an active typed effect:

- `lossCondition: "heat"` remains on `black-lantern-broker`, `choir-defector`, `gate-saint-acolyte`, and `saltflat-bone-reader`;
- `lucy-hell-puppy` retains a compatibility/deprecated `heat` tag.

Production code does not read follower `lossCondition`. The final server projection boundary strips `lossCondition: "heat"` and the exact `heat` tag. C5A does not approve deleting these compatibility fields; their removal belongs to current-model/schema narrowing after implementation and final re-audit.

## Complete follower lifecycle

### Acquisition and availability

Both followers load into the canonical 24-entry follower catalog. Neither has a rarity, tier, cost, `acquisition` field, starting-character reference, contract reward, anomaly reward, Artifact reward, or other canonical `gain_follower` source. Their natural acquisition frequency is therefore **zero** in a new canonical session. They can still exist in legacy/reconnect state and focused tests or be supplied by future approved content.

This acquisition gap is not permission to add a source during Heat retirement.

### Ownership and visibility

- A follower is stored on one operative's `character.followers` array.
- `gain_follower` creates a server-derived instance and attaches it to the affected operative.
- Only the owning active seat may submit `USE_FOLLOWER`; missing or wrong-owner followers are rejected.
- The owner phone receives the full follower definition, rule text, and use state.
- Other phones and TV receive public follower counts/approved companion badges and generic result information, not the owner's private notes.
- Neither rule inspects or exposes a private Rivalry objective. `crownless-advocate` records only a generic bargain intervention, not an agenda, target, reward, or private option.

### Activation and frequency

- Both followers are optional chosen actions, not automatic effects.
- Authoritative timing is the active owner's normal `action` phase through the existing gear/follower-management gate.
- Both retain `useLimit: "oncePerRound"`.
- The reducer searches the event log back to `ROUND_COMPLETED`; a second same-round use is rejected.
- Neither follower exhausts, discards, consumes, transfers, or opens a pending selection.
- The approved `gain_note` resolves immediately and the follower action completes once.

The phone infers descriptive timing windows from follower text, while the server remains authoritative. The word `route` can make `saltflat-bone-reader` appear movement-adjacent in presentation, but a non-exhaust follower action is still accepted only in the normal action phase. C5A does not redesign timing inference.

### Duplicates, recall, transfer, and reset

- Use-limit enforcement is keyed by stable follower ID, not independent instance ID. Duplicate copies therefore share one once-per-round limit.
- The current phone intent submits the stable follower ID; no new exact-instance selector is approved.
- Current table trade interactions do not transfer followers.
- A recalled operative cannot use a normal follower action. Recruiting a replacement uses the replacement character's loadout; C5A adds no follower inheritance.
- Reconnect preserves the follower, private notes, and event-log boundary that enforces the current-round use.
- A new session rebuilds catalog/loadout state and clears prior uses through the existing session lifecycle.

## Original Heat intent and selected model

The old `lose_heat 1` leaf was a personal-pressure relief benefit, not an activation cost. It supplemented each prose ability with a reduction to the retired resource. Since generic Heat effects are exact no-ops, neither follower currently changes a stat, resource, route, bargain, test, movement state, mission, or Rivalry objective when used.

Purely deleting `activeEffect` is not an exact no-effect implementation: the server falls back by role, and both `informant` and `ritualist` produce a generic `gain_note`. Removing both `activeEffect` and `useLimit` would instead make the follower passive and contradict its once-per-round identity. C5A therefore approves an explicit typed `gain_note`. This avoids an undocumented fallback, retains the authored identity, and uses the canonical table-record pattern already present on `black-lantern-broker` and `gate-saint-acolyte`.

The note is a private record only. It does not apply the bargain or route result to another typed subsystem. Any future faction-demand, rivalry-cost, route-reveal, or prophecy-targeting mechanic requires separate approval.

## Option evaluation

- **Remove without replacement:** not selected as literal field deletion because it invokes a generic role fallback; removing the use limit would erase the active identity.
- **Salvage cost/loss:** rejected. The retired effect was a benefit, not a fee, and neither card has payment timing, a zero-Salvage branch, or economy hooks.
- **Exhaustion/discard:** rejected. Neither card uses the authoritative exhaust model or discard limit; once-per-round already bounds use.
- **Wound/Scar:** rejected. Neither represents immediate harm, and no Heat-to-Scar translation is proportionate.
- **Modifier/movement/Global Escalation:** rejected. No exact test, destination, route-reveal, or shared-pressure trigger exists.
- **Reduced frequency:** rejected. The current once-per-round boundary is implemented and reconnect-safe.
- **Lore only:** rejected. Both followers already participate in the active use lifecycle; making them passive would remove an existing interaction.

## Approval block: `crownless-advocate`

- Current authored Heat rule: `activeEffect: { type: "lose_heat", amount: 1 }` on chosen use.
- Runtime status: Accepted owner action; Heat is inert; use and once-per-round state are recorded.
- Original gameplay intent: Negotiation/political leverage with obsolete personal-pressure relief.
- Existing non-Heat ability: Table authority to soften a faction demand or rivalry bargain; no typed economy, mission, Contract, or Rivalry mutation exists.
- Acquisition: Catalog-only; no canonical source, cost, tier, or rarity.
- Ownership: Attached operative; owner activation only.
- Activation trigger: Owner chooses Use during their active action phase.
- Activation frequency: Once per round, event-log enforced.
- Selected retirement model: Existing canonical follower `gain_note`.
- Cost: None.
- Consequence: Owner-private note `Crownless Advocate: one faction demand or rivalry bargain was softened.`
- Wound interaction: None.
- Scar interaction: None; no Heat-to-Scar conversion.
- Salvage interaction: None; no payment, loss, shop, Ledger, mission, Contract, completed-contract, or relic-trade event.
- Movement interaction: None.
- Test-modifier interaction: None.
- Follower discard/exhaustion: Neither; follower remains attached.
- Persistence: Note and follower persist in owner state.
- Reset/cleanup: Use resets at `ROUND_COMPLETED`; note follows existing private-state/session lifecycle.
- Duplicate-instance behavior: Copies share stable-ID limit; no new instance selection.
- Multiplayer behavior: Owner-private note only; no player-count scaling or group harm.
- Rivalry privacy: No agenda or target is inspected; public presentation may identify follower use but not private note details.
- Source-event protection: One accepted action adds one note; same-round duplicate is rejected.
- Reconnect behavior: Follower, note, and use event persist; completion does not reopen or replay.
- Phone presentation: Final rule, once-per-round availability, and owner-private result; no Heat, cost, target input, or pending choice.
- TV presentation: Generic public follower-use summary; no private note or Heat row.
- Runtime support: Ready with existing `gain_note`, `USE_FOLLOWER`, use-limit, projection, and reconnect lifecycles.
- Final player-facing rule: `Once per round, record that the Crownless Advocate softened one faction demand or stabilized one rivalry bargain.`
- Power before: **2/5** table-facing, **1/5** engine-enforced.
- Power after: **2/5** table-facing, **1/5** engine-enforced.
- Severity: **1/5**.
- Complexity: **1/5**.
- Balance risk: **Low**; faction/rivalry outcomes remain table-adjudicated.
- Approval status: **APPROVED**.

## Approval block: `saltflat-bone-reader`

- Current authored Heat rule: `activeEffect: { type: "lose_heat", amount: 1 }` on chosen use.
- Runtime status: Accepted owner action; Heat is inert; use and once-per-round state are recorded.
- Original gameplay intent: Prophecy/omen interpretation that records a safer route claim, with obsolete personal-pressure relief.
- Existing non-Heat ability: Table authority to record a safer route note; no typed reveal, destination, movement, or topology mutation exists.
- Acquisition: Catalog-only; no canonical source, cost, tier, or rarity.
- Ownership: Attached operative; owner activation only.
- Activation trigger: Owner chooses Use during their active action phase.
- Activation frequency: Once per round, event-log enforced.
- Selected retirement model: Existing canonical follower `gain_note`.
- Cost: None.
- Consequence: Owner-private note `Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note.`
- Wound interaction: None.
- Scar interaction: `scar` is narrative input only; no Scar is added, removed, selected, or exposed.
- Salvage interaction: None.
- Movement interaction: No movement, route unlock, destination reveal, allowance, or topology mutation.
- Test-modifier interaction: None.
- Follower discard/exhaustion: Neither; follower remains attached.
- Persistence: Note and follower persist in owner state.
- Reset/cleanup: Use resets at `ROUND_COMPLETED`; note follows existing private-state/session lifecycle.
- Duplicate-instance behavior: Copies share stable-ID limit; no new instance selection.
- Multiplayer behavior: Owner-private note only; no player-count scaling or other-operative route change.
- Rivalry privacy: No Rivalry objective is inspected or projected.
- Source-event protection: One accepted action adds one note; same-round duplicate is rejected.
- Reconnect behavior: Follower, note, and use event persist; completion does not reopen or replay.
- Phone presentation: Final rule, once-per-round availability, and owner-private result; no route picker, Heat row, or pending choice.
- TV presentation: Generic public follower-use summary; no hidden route detail, private note, or Heat row.
- Runtime support: Ready with existing `gain_note`, `USE_FOLLOWER`, use-limit, projection, and reconnect lifecycles.
- Final player-facing rule: `Once per round, record a safer route note from one scar, omen, or void-salt bargain.`
- Power before: **2/5** table-facing, **1/5** engine-enforced.
- Power after: **2/5** table-facing, **1/5** engine-enforced.
- Severity: **1/5**.
- Complexity: **1/5**.
- Balance risk: **Low**; route safety remains table-adjudicated and presentation timing remains subordinate to server action-phase authority.
- Approval status: **APPROVED**.

## Power, frequency, and interaction findings

| Measure | `crownless-advocate` | `saltflat-bone-reader` |
|---|---|---|
| Canonical acquisition | None currently authored | None currently authored |
| Maximum use when owned | Once per round | Once per round |
| Opportunity cost | Follower ownership only | Follower ownership only |
| Mechanical benefit | Owner-private adjudication note | Owner-private adjudication note |
| Solo/multiplayer scaling | None | None |
| Equipment synergy | None specific found | Ritualist role still satisfies Grave Lens; unchanged |
| Duplicate behavior | Shared stable-ID limit | Shared stable-ID limit |
| Rivalry exploit | No typed agenda/reward mutation | None |
| Reconnect complexity | Existing event log/private notes | Existing event log/private notes |

Neither replacement creates an unlimited strategy: the current limiter remains, there is no numeric modifier, and neither follower has a canonical acquisition path. The approval also does not pretend the engine selects a faction demand, cancels a typed cost, reveals a destination, or reads hidden Rivalry state.

## Four critique seats

### New player

`Record` makes clear that each is a once-per-round follower intervention, not a resource change. The owner sees the note immediately and the follower remains attached. No Heat, payment, injury, discard, or duration is introduced.

### Optimizer

There is no zero-resource exploit. The once-per-round boundary is server-enforced, duplicate stable IDs do not multiply uses, and notes do not change stats, economy, routes, missions, Contracts, or Rivalry rewards. Reconnect does not refresh use.

### Family/casual player

Each use is one button and one immediate note. There is no target selection, nested choice, prevention window, or delayed status. Consistent table interpretation of the narrative benefit remains existing follower-content debt.

### Rules lawyer

- Trigger: optional owner use during the active owner's action phase.
- Cost: none; benefit applies immediately.
- Frequency: once per round, reset after `ROUND_COMPLETED`.
- Transfer: no transfer lifecycle exists or is added.
- Recall: recalled owner cannot act; C5A adds no inheritance.
- Replay: one event, same-round duplicate rejected, reconnect preserves completion.

## Implementation grouping

### Group 1 - existing canonical follower-note effects

Stable IDs: `crownless-advocate`, `saltflat-bone-reader`.

Exact content changes:

1. Replace each `activeEffect: { type: "lose_heat", amount: 1 }` with the exact approved `gain_note` above.
2. Replace only each `text` field with its exact final player-facing rule.
3. Preserve ID, name, role, `useLimit`, loyalty, loss-condition metadata, source file, and catalog count.

Shared resolver: existing `gain_note` application to `player.private.notes` through `USE_FOLLOWER`.

Validation updates:

- remove both active-effect approvals from `LEGACY_HEAT_EFFECT_APPROVALS`;
- assert zero canonical follower typed Heat;
- assert exact notes, text, role, loyalty, use limit, and retained compatibility metadata;
- keep compatibility fixtures and historical reports allowed.

Focused tests:

- content identity and zero typed Heat;
- exact note once with no stat/resource/route/mission/Rivalry mutation;
- owner, wrong-seat, once-per-round, duplicate, and stale authority;
- solo and 2-4 player non-scaling;
- reconnect and round reset;
- owner-private note and public-safe TV/other-phone summary;
- no Heat, Wound, Scar, Salvage, payment, modifier, movement, discard, or exhaustion result;
- projection stripping of retained `lossCondition: "heat"` metadata;
- full authored boundary recount reaching zero.

UI implications: none. Browser QA: narrow owner-phone use and TV public-summary smoke recommended, not required if exact projection/component coverage passes. Risk: low; implementation must author the exact note instead of relying on the generic fallback.

Recommended commit subject: `feat: retire final follower heat effects`

## Final audit projection

| Family | Current | Projected removed | Projected remaining |
|---|---:|---:|---:|
| Board | 0 | 0 | 0 |
| Scenario | 0 | 0 | 0 |
| Escalation | 0 | 0 | 0 |
| Followers | 2 | 2 | 0 |
| Total | 2 | 2 | 0 |

After implementation and evidence-backed re-audit, active authored typed Heat can reach zero while player-facing Heat, runtime mechanical reads/writes, gameplay-mutating threshold behavior, and Heat-to-Scar conversion remain zero. Legacy save/reconnect metadata remains parseable and inert.

The projected verdict is **CONDITIONAL PASS**. PASS requires the final audit to evaluate remaining dead code, projection/type residue, docs, and tests. Full compatibility-field deletion is neither approved nor required for gameplay correctness.

## Verification

- Repository JSON classification found exactly **2** authored typed Heat effects: the scoped `lose_heat 1` leaves. Board, scenario, and escalation authored Heat remain zero.
- `npm.cmd run validate:content`: passed (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions).
- `npm.cmd run typecheck`: passed.
- Focused follower schema, containment, ownership/reconnect, projection, and phone presentation selection: **7 files / 159 tests passed**.
- `npm.cmd run test:engine`: **59 files / 706 tests passed**.
- `npm.cmd run test:integration`: **27 files / 233 tests passed**. The reconnect flapping regression passed on the first run; no retry was required.
- `npm.cmd run test:client`: **26 files / 258 tests passed**. Existing missing-art fallback warnings remained non-failing.
- `npm.cmd run test`: **112 files / 1,197 tests passed**.
- `git diff --check` and `git diff --cached --check`: required after staging and recorded in the commit handoff.

Successful verification proves this approval pass changed no gameplay; it does not claim the projected zero authored count is already implemented.

## Scope conclusion

The intended commit contains only this report and the two exact planning-report updates. Both follower definitions, all schemas, validation, tests, runtime, clients, assets, board content, scenarios, escalations, Threats, missions, Contracts, items, economy values, compatibility code, and the +116 expansion remain unchanged. The two quarantined audits remain untracked and hash-unchanged.

## C5B implementation status

**IMPLEMENTED.** Both approved followers now author their exact explicit owner-private `gain_note` effect. Neither `activeEffect` was deleted, so the generic role fallback is not involved. Stable IDs, role, loyalty, `oncePerRound`, catalog membership, ownership, and legacy metadata remain unchanged.

Repository-backed active authored typed Heat is now **0 occurrences across 0 IDs**. See `heat-compatibility-c5b-final-follower-implementation.md` for lifecycle, privacy, replay, reconnect, projection, and verification evidence.
