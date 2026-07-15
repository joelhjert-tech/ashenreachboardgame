# Heat Retirement H8A — Marrow-Tax Auditors economy-frequency approval

Status: **APPROVED H8A — REPORT ONLY**. No Threat definition, gameplay, economy, schema, validation, server, client, asset, or card-count change is made in this pass.

Checkpoint: `06d8a28 feat: retire gateblind pulse heat effect` on `phase/heat-retirement-1x`.

Stable ID: `marrow-tax-auditors`.

## Decision

`marrow-tax-auditors` is approved for one automatic owner-scoped floor-zero Salvage loss:

> On failure, lose up to 1 Salvage.

The consequence is **automatic loss**, not payment, spending, purchase, sale, reward reduction, or choice. It requests exactly 1. The existing authoritative floor-zero resolver calculates `actualLoss = min(max(0, currentSalvage), 1)` and `resultingSalvage = max(0, currentSalvage) - actualLoss`. At zero Salvage it records actual loss 0, shows “No Salvage to lose.”, applies no substitute consequence, and completes the Threat normally.

Approval is proportionate despite four canonical graph references because those references are four finite local-deck entries, not four copies in one shuffled global deck or an activation multiplier. A drawn entry is removed from its local deck and is not reshuffled. Three pools can surface the Yellow card through ordinary printed-lane exploration; the fourth has no printed Yellow icon and needs an unfiltered special/ambient draw. The global 12-card recent-encounter soft-exile also excludes an immediate repeated stable ID while fresh alternatives remain. The table-wide session maximum is therefore four resolutions, not four per player, and ordinary exposure is materially below that maximum.

Implementation readiness: **Ready with the existing floor-zero Salvage resolver**. H8B needs only the in-place content replacement, existing automatic-loss authoring allowlist/source registration, focused tests, and report status updates. No new typed lifecycle, pending state, economy transaction, or UI component is approved.

## 1. Current card inspection

| Field | Current authoritative value |
|---|---|
| Stable ID | `marrow-tax-auditors` |
| Display name | Marrow-Tax Auditors |
| Lane / type | Yellow / hazard |
| Authored region / rarity / tempo | outer / common / push |
| Test | Guile 7 |
| Severity | authored 2; approved retirement severity 2 |
| Success | `gain_note`: “You found a loophole in a dead empire tariff.” |
| Failure | `gain_heat 2` |
| Reward / Trophy | no Salvage, Trophy, pile entry, item, or progress reward; success adds only the note |
| Persistence | none; the hazard resolves and does not return itself to a sector |
| Graph references | four local pools: `middle_shard_sprawl`, `middle_relic_cache`, `middle_scar_surgery`, `the-salt-archive` |
| Current runtime | legacy Heat compatibility branch resolves as a mechanically inactive no-op |

The exact legacy clause is `failEffect: { type: "gain_heat", amount: 2 }`. Its intended pressure is an enforced tariff or confiscation after failing to outwit supernatural auditors. That is personal material loss, not voluntary commerce or shared scenario pressure.

The authored/runtime mismatch has two parts. First, the printed failure promises Heat while player-facing Heat is retired and the runtime does nothing. Second, the card is authored `region: outer` but its four canonical pool references are middle/red-march or named special-route contexts. Frequency analysis therefore uses live graph placement rather than the authored region label.

Closest mechanical overlaps are `locked-vault` and `glass-tick-cloud` for hazard failure loss; `crown-bell-baron`, `pale-contract-collector`, and `soot-stained-cutpurse` for approved H3 personal loss; and `gate-tax-collectors` for required payment. Marrow remains distinct from payment because no affordable/unaffordable branch or requested benefit exists.

## 2. Current Salvage economy audit

The live checkpoint supersedes several counts in the quarantined research audit. The audit is useful historical evidence but is not treated as current runtime authority.

| Economy area | Verified current authority |
|---|---|
| Starting Salvage | 3 in multiplayer and 4 in single-player from `src/game/rules/startingLoadout.ts`; explicit authored overrides remain possible; QA 99 is excluded |
| Normal Equipment prices | authored costs range 2–7 for priced items; 3 is the modal price (25 items), with 5 items at 2, 6 at 4, 6 at 6, and 1 at 7 |
| Selling | 30 items sell for 1, 6 for 2, and 7 for 3; selling removes the exact owned item and is not free income |
| Contract income | 8 of 36 current Contracts author `gain_salvage 1`, paid only through canonical completion |
| Threat income | `latchspire-raider` directly grants 1 Salvage; older `threat_defeat_gain_salvage` keys currently produce a note rather than currency |
| Anomaly income | `anomaly-bellrain-inversion` can grant 1 Salvage through its approved result |
| Scenario income | no universal scenario Salvage payout exists; scenario text or exact character/sector hooks may create route-specific opportunities only |
| Shop services | Repair Gear 2, Buy Supplies 1, Buy Treatment 2, Deep Relic Search 1 |
| Encounter payments | `gate-tax-collectors` requires 1 when affordable; `rust-choir-peddlers` owns an optional 1-Salvage recovery offer |
| Automatic losses | 12 currently approved authored entries: 11 Threats plus `escalation-crownfall-writ`, all amount 1 and floor zero |
| Relic dealer | three stored `completedContracts`, not Salvage, buy/sell history, or event-log inference |

Typical post-setup income remains route-dependent rather than automatic. A completed Salvage-rewarding Contract, one successful material reward, a sale, or a character/sector hook commonly adds 1 at a time; zero additional income remains possible. Typical spending is one 3-Salvage Equipment purchase plus optional 1–2 Salvage services, searches, activations, or encounter payments. The economy is constrained, so H8A rejects amount 2 and rejects any substitute penalty at zero.

The current `salvage-ledger` production item is a standard 3-cost utility with +1 Guile during shop dealings. No production `Audited Sale` Ready/Used action or state exists at this checkpoint. H8A neither invents that state nor relies on the quarantined audit's proposed sale-bonus description.

## 3. Frequency and repeatability

### Canonical pool facts

| Local pool | Printed icons | Local deck | Ordinary Yellow candidates | First eligible Marrow chance |
|---|---|---:|---:|---:|
| `middle_shard_sprawl` | Red, Yellow | 10 | 6 | 1/6 on the first Yellow draw |
| `middle_relic_cache` | Yellow | 10 | 9 | 1/9 on the first Yellow draw |
| `middle_scar_surgery` | Red, Blue | 8 | 3 Yellow cards in data, but no ordinary printed Yellow draw | only an unfiltered special/ambient draw; 1/8 before exclusions |
| `the-salt-archive` | Yellow | 6 | 6 | 1/6 on the first Yellow draw |

The three ordinary first-draw chances sum to about 0.44 expected appearances if a session makes exactly one eligible Yellow draw in each pool. One unfiltered first draw in `middle_scar_surgery` would add 0.125. Those are exposure indicators, not guarantees: later draws increase the chance within a depleted local pool, while route choice, unresolved blockers, and soft exile reduce or delay it.

Once drawn, Marrow is removed from that local deck. There is no local-deck reshuffle or automatic reinsertion. The hazard is not persistent and owns no return-to-sector effect. One player can encounter entries from several pools, and different players can encounter different entries, but all players share the same depleted sector decks. Maximum table exposure is four; maximum actual loss is therefore 4 Salvage across the table if every entry appears, every test fails, and every owner is funded.

At base difficulty 7, normal non-QA Guile 2–5 operatives fail a 2d6 test approximately 16.7%, 8.3%, 2.8%, and 0% respectively before modifiers. The current roster-weighted base failure rate is about 7.6%. Global Escalation can raise difficulty and makes later appearances more dangerous, but the amount remains one and floor zero.

### Planning estimates by mode

There is no production telemetry or fixed session length. The following ranges assume ordinary route diversity, partial rather than complete depletion of the three normal-access pools, occasional special draws, and current failure math:

| Mode | Likely actual table loss | Concentration note |
|---|---|---|
| Solo | 0–1; 2 is unusual | starts at 4, but every encountered copy targets the same operative |
| Two players | 0–1; 2 is possible | shared pool depletion limits table exposure; one seat may take both losses |
| Three players | 0–1; 2 is plausible on a broad route | losses remain owner-scoped and cannot be pooled away |
| Four players | 0–2; 3+ requires unusually broad depletion and repeated failures | more exploration raises exposure, but maximum remains four table-wide |

These estimates are deliberately expressed as bounded ranges rather than false draw probabilities. H8B playtests should record source appearances, failed checks, funded versus zero outcomes, and per-seat concentration.

## 4. Comparison with existing Salvage pressure

| Stable ID | Structure | Test / difficulty | Frequency | Result at zero | Reward relationship |
|---|---|---|---:|---|---|
| `glass-tick-cloud` | Yellow hazard, automatic failure loss | Forge 6 | 2 pools | actual 0; completes | success note only |
| `locked-vault` | Yellow hazard, automatic failure loss | Forge 7 | 1 pool | actual 0; completes | success note only |
| `crown-bell-baron` | Yellow enemy, automatic combat-loss consequence | Command 7 | 1 pool | actual 0; enemy loss resolves | Trophy/pile plus note on victory |
| `pale-contract-collector` | Yellow enemy, automatic combat-loss consequence | Command 8 | 2 pools | actual 0; enemy loss resolves | 2-value Trophy plus authored +2 Trophy reward |
| `soot-stained-cutpurse` | Yellow enemy, automatic combat-loss consequence | Guile 3 | 2 pools | actual 0; enemy loss resolves | 1-value Trophy plus note |
| `gate-tax-collectors` | Yellow enemy, required payment after loss | Command 5 | 5 pools | payment unavailable; no debt; enemy remains | combat Trophy/reward only on victory |
| `marrow-tax-auditors` approved | Yellow hazard, automatic failure loss | Guile 7 | 4 finite pools; only 3 ordinary Yellow-access | actual 0; completes | success note only |

Six additional current Threats also author automatic one-Salvage losses: `ash-rat-skitter`, `bridge-toll-runt`, `gutter-bell-mite`, `pale-toll-enforcer`, `rust-mote-drone`, and `toll-scrip-urchins`. Adding Marrow would make 13 approved automatic-loss entries across Threats and Escalations.

The chosen effect deliberately reinforces the Yellow material-pressure family, but Marrow is not an exact card duplicate. It is the only approved common Guile 7 **hazard** tax in these middle/special local pools; the closest hazards use Forge, while the Guile loss enemies use battle/Trophy lifecycles. Its broader graph footprint is offset by finite shared decks, low base failure, soft exile, and no ordinary Yellow access in one of four pools. This is sufficient deck-frequency justification for one repeated amount-1 pattern, but not for amount 2 or a new economic status.

## 5. Replacement options

| Option | Severity | Runtime readiness | Decision |
|---|---:|---|---|
| A — automatic floor-zero loss 1 | 2 | Ready with existing floor-zero Salvage resolver | **Selected.** Exact economic fiction, short resolution, finite exposure, no debt or fallback |
| B — pay 1 or alternative | 3+ | Requires private choice plus an approved alternative | Reject. No benefit is purchased, and every alternative either dominates or raises severity |
| C — conditional loss | 1–2 | Requires a narrow conditional effect or intrusive state coupling | Reject. Threshold/inventory/Contract coupling is unnecessary given finite exposure |
| D — Trophy/reward interference | 0–2 | No applicable reward lifecycle on this hazard | Reject. The card has no Trophy or material success reward to withhold |
| E — Equipment pressure | 2 | Existing suppression lifecycle, but duplicates H4B identity | Reject. Auditors confiscating generic Equipment is less direct and adds another target choice |
| F — temporary economic restriction | 1–2 | Requires a new sale/purchase/reward hook | Reject. Too much persistent bookkeeping for one routine hazard |
| G — remove without replacement | 0–1 | Ready without infrastructure | Reject. Failure would remain consequence-free and erase the card's taxation identity |
| H — non-economic personal pressure | 2–3 | Wound path exists; other choices vary | Reject. A Wound misstates tariff pressure and increases the already large Wound family |

## 6. Automatic loss boundary and zero behavior

The approved effect is automatic loss:

1. Resolve the authoritative Guile test.
2. On final failure, create the existing typed `lose_salvage` consequence with authored amount 1.
3. The server derives current Salvage and source identity.
4. Calculate requested 1, actual `min(current, 1)`, and resulting floor-zero total.
5. Apply the actual delta once.
6. Record the resolved source event and finish the Threat once.

It never checks affordability and never pauses for a choice. `3 → 2` and `1 → 0` each lose 1. `0 → 0` requests 1, loses 0, displays “No Salvage to lose.”, and finishes without Wound, Scar, Equipment, movement, escalation, or delayed debt.

Zero Salvage does make the economic consequence harmless. That is acceptable low-resource protection, not a profitable exploit: failure grants no reward, progress, transaction, or substitute benefit. Intentionally spending to zero sacrifices access to Equipment and services, so it is not a free defensive loop.

## 7. Salvage Ledger, mission, Contract, and relic isolation

The automatic loss must enter only `resolveFloorZeroSalvageLoss`. It must emit no `SHOP_PURCHASE_RESOLVED`, `SHOP_SELL_RESOLVED`, `SHOP_SERVICE_RESOLVED`, `ENCOUNTER_DECISION_RESOLVED`, `COMPLETE_CONTRACT`, or mission-progress event.

Therefore it creates:

- no Audited Sale or other Salvage Ledger trigger/state change;
- no sale, purchase, transaction ID, stock mutation, or recursive bonus;
- no `shopTransaction` objective progress;
- no voluntary Salvage-spend progress;
- no completed Contract or `completedContracts` entry;
- no relic-dealer trade or three-contract spend;
- no mission reward or Rivalry-objective inspection; and
- no interaction with one or several duplicate Ledger instances.

The loss is a direct owner-resource delta, not a shop transaction. Buy/sell profitability remains unchanged because no price, sell value, inventory, or stock changes.

## 8. Reward proportionality and severity

Marrow is a common Guile 7 hazard with severity 2. Passing grants only a private tariff-loophole note; failing would lose at most one currency. It grants no Trophy and does not persist. The existing values need no reward or difficulty rebalance.

One loss is meaningful against 3 multiplayer / 4 solo starting Salvage and the modal 3-Salvage Equipment price, but its low base failure rate, later route placement, finite copies, floor zero, and recovery through Contracts/rewards/sales keep it within routine severity 2. Amount 2 would threaten an entire starting purchase and is rejected.

Mode severity is 2 for solo, two-player, three-player, and four-player. Solo concentrates every possible loss but starts one higher. Multiplayer increases exploration opportunities but shares finite local decks; a table total does not protect an unlucky owner, so per-seat concentration remains the playtest risk.

## 9. Anti-loop, replay, reconnect, and presentation

The existing resolver owns stable source-event deduplication, requested/actual/resulting metadata, and schema-backed reconstruction. H8B must prove one failed source applies at most once; stale/wrong-seat/forged/duplicate resolution cannot spend currency; pending loss survives reconnect; completed loss does not return; and reward/note finalization remains single-use.

Phone and TV require no new controls. Both reuse current automatic-loss presentation:

- funded: “Lost 1 Salvage.” with the authoritative resulting total where normally shown;
- zero: “No Salvage to lose.”

Neither surface shows Heat, payment language, affordability controls, `lose_salvage`, internal source-event IDs, transaction IDs, private Contract state, or Ledger state.

## 10. Four critique seats

- **New player:** “lose up to 1” clearly distinguishes automatic loss from “pay 1”; the zero result explains that resolution completed.
- **Optimizer:** zero prevents loss but also blocks shopping; no mission, sale, Ledger, reward, or payment event makes failure profitable. A player may route away from the four pools, which is legitimate avoidance.
- **Family/casual player:** one immediate decrement or zero-result message is short. Finite local entries prevent an unlimited tax loop, though clustered Yellow attrition should be watched.
- **Rules lawyer:** trigger is final failed Guile test; request is exactly 1; actual delta floors at zero; no choice or affordability check; one source ledger entry survives reconnect; no shop/Contract/Salvage Ledger event is emitted.

## 11. Approval block

### `marrow-tax-auditors`

- Current Heat behavior: failed Guile test authors `gain_heat 2`; current compatibility runtime applies no gameplay change.
- Original gameplay intent: enforced personal tariff and confiscation pressure.
- Selected retirement model: automatic floor-zero loss of 1 Salvage.
- Trigger: final authoritative failure of this card's Guile 7 hazard test.
- Economy classification: automatic loss.
- Requested amount: 1 Salvage.
- Actual-delta calculation: `min(max(0, currentSalvage), 1)`.
- Zero-Salvage behavior: requested 1, actual 0, remains 0, no substitute; Threat completes.
- Automatic or choice: automatic; no private choice or Cancel action.
- Alternative consequence: none.
- Salvage Ledger interaction: none; no sale/Audited Sale/Ready/Used state, bonus, or transaction.
- Mission/Contract interaction: none; no shop transaction, spend progress, completion, `completedContracts`, relic trade, or private-objective inspection.
- Reward/Trophy interaction: unchanged success note; no Trophy or Salvage reward; no rebalance.
- Frequency estimate: four finite shared local entries; three ordinary Yellow-access pools; no reshuffle; likely 0–1 actual table loss in most sessions, 0–2 plausible at higher player counts.
- Solo severity: 2; concentrated but starts at 4.
- Multiplayer severity: 2 at 2/3/4 players; more exposure but no group loss and maximum four table-wide.
- Duplicate-source protection: existing resolution-derived Salvage-loss source event; one mutation per failure.
- Reconnect behavior: pending effect reconstructs; completed actual delta and source completion persist without replay.
- Phone presentation: existing automatic-loss outcome; no control or internal field.
- TV presentation: same public-safe actual outcome; no private economy detail beyond normal public Salvage presentation.
- Typed runtime support: existing `lose_salvage 1`, floor-zero resolver, projections, and source ledger.
- Final player-facing rule: **“On failure, lose up to 1 Salvage.”**
- Complexity: low.
- Balance risk: medium; clustered Yellow attrition and one-seat concentration require playtest observation.
- Distinctness from existing Salvage-loss Threats: Guile 7 common hazard in middle/special audit pools; finite four-pool exposure, unlike Forge hazards or battle/Trophy enemies.
- Approval status: **APPROVED H8A — NOT IMPLEMENTED**.

## 12. Implementation prerequisites

H8B may:

1. Replace only `marrow-tax-auditors`' legacy failure with `{ type: "lose_salvage", amount: 1 }` and exact approved wording.
2. Replace only its `heat` resource tag with `salvage` if required by existing content conventions.
3. Add the stable ID to the existing approved automatic-loss and H3/B2A source registries.
4. Remove only its legacy Heat authoring approval.
5. Update legacy population counts and focused reports/tests.

No resolver, schema, pending state, shop, mission, Contract, Ledger, projection component, price, reward, or UI extension is expected.

Focused H8B tests must cover exact identity/text/effect; `3 → 2`, `1 → 0`, and `0 → 0`; requested/actual/resulting metadata; final failed trigger only; client amount/source authority; wrong/stale/duplicate/replay; reconnect pending/completed; public-safe phone/TV results; no payment or choice; no Ledger/shop/mission/Contract/completed-contract/relic event; unchanged success note; finite graph count four; current totals; all H1–H7B definitions; and byte-pinned `memory-tax-gate` plus both quarantined audit hashes.

Recommended commit subject: `feat: retire marrow tax heat effect`.

## 13. Remaining blocked card

`memory-tax-gate` remains **BLOCKED**. Its unresolved issue is the existing private-choice lifecycle: exact competitive options, owner-only prompt/projection, insufficient-resource and no-note behavior, mandatory resolution/cancellation, persistence/reset, and source deduplication. H8A does not redesign it.

The +116-card expansion remains unapproved.

## 14. Verification

Verification at the H8A report-only checkpoint:

- `npm.cmd run validate:content` — passed; 109 Threats (Red 26 / Blue 35 / Yellow 48) and 36 Contracts.
- `npm.cmd run typecheck` — passed.
- Focused Salvage/Threat, projection, shop, and Contract-objective suites — 59 passed. One separately invoked stale legacy-promotion assertion failed because it expects 30 Contracts while current validated content contains 36; this report did not modify that test or any Contract.
- `npm.cmd run test:engine` — passed.
- `npm.cmd run test:integration` — passed, 226 tests.
- `npm.cmd run test:client` — passed, 257 tests. This was run independently after the aggregate wrapper timed out.
- `npm.cmd run test` — timed out at 240 seconds without a result. Its exact engine, integration, and client constituents passed independently; the wrapper was not retried.
- `git diff --check` and `git diff --cached --check` — passed before commit.

The final diff contains only this new approval report and status updates in the three named planning reports. `marrow-tax-auditors`, `memory-tax-gate`, all H1–H7B definitions, runtime code, schemas, validation, UI, assets, economy, shops, missions, Contracts, scenarios, and card totals are unchanged. Both quarantined audit hashes remain unchanged and untracked. No player-facing Heat was introduced, and the +116 expansion remains unapproved.
