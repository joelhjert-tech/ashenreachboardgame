# Heat-to-Salvage reward batch 1

Baseline: `d16ab6afef7b6c5748c49cb463728558ba7763ad`.

## Implemented IDs and branches

| ID | Branch | Previous effective behavior | Implemented behavior | Ordering |
|---|---|---|---|---|
| `anomaly-bellrain-inversion` | `resolveEffect` | `lose_heat 1`, a runtime compatibility no-op | `gain_salvage 1` | Existing anomaly resolution applies the reward once, then continues normal cleanup |
| `compact-equipment-requisition` | Contract `reward` | `lose_heat 1`, a runtime compatibility no-op | `gain_salvage 1` | `COMPLETE_CONTRACT` validates completion, clears the active slot and records the completed ID, then applies the reward once |
| `latchspire-raider` | `defeatReward` | `lose_heat 1`, a runtime compatibility no-op | `gain_salvage 1` | Existing victory resolution applies the reward; loss still uses the unchanged one-Wound branch |

No new effect type, prompt, pending state, transaction, shop hook, mission event, or client-side calculation was added. Existing `gain_salvage` authority mutates the resolving operative by exactly +1 and produces the established `Success: gain 1 Salvage.` outcome text.

## Preserved content identity

- Bellrain Inversion remains an outer anomaly with instability 1, the same summary, art, three canonical graph routes, and all-mode availability.
- Equipment Requisition retains its `shopTransaction / buyEquipment / shop / requiredCount 1 / minimumSalvageSpent 1` objective. Its name does not grant Equipment; held inventory is unchanged by completion.
- Latchspire Raider remains an outer common yellow enemy, severity 2, Guile 6, trophy value 6, one canonical graph route, and `take_wound 1` on loss. Art and cleanup are unchanged.

Only Latchspire Raider's resource metadata changed from `heat` to `salvage`, matching its new actual reward. Existing prose already described material harvest, a Salvage docket, and a scavenger, so no broad lore rewrite was needed.

## Contract lifecycle and replay protection

Equipment Requisition pays nothing while its objective is incomplete. Canonical `COMPLETE_CONTRACT` is the only reward owner. A successful completion:

1. Validates the active Contract and completed objective.
2. Clears the active Contract and records its stable ID in `completedContracts`.
3. Applies exactly `gain_salvage 1`.
4. Emits one completion event and normal outcome summary.

A repeated/stale completion is rejected because the Contract is no longer active. Reconstructing the completed state through a new room server preserves the final Salvage and ledger without replaying the reward.

Bellrain and Latchspire rewards clear `pendingEffect` after one authoritative resolution. A duplicate `RESOLUTION_APPLIED` request is rejected. Reconnect preserves the already-increased balance and does not recreate the pending reward.

## Compatibility cleanup and counts

The three exact `lose_heat` approvals were removed. No unrelated approval changed.

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 28 | 25 |
| Heat branches/effects | 30 | 27 |
| `gain_heat` | 17 | 17 |
| `gain_heat_all` | 3 | 3 |
| `lose_heat` | 10 | 7 |
| Heat-effect approvals | 30 | 27 |
| Total compatibility approvals | 44 | 41 |
| Canonical `gain_salvage` occurrences | 7 | 10 |
| Changed content IDs | 0 | 3 |
| Active Heat gameplay reads/writes | 0 / 0 | 0 / 0 |
| Player-facing Heat/Risk routes | 0 / 0 | 0 / 0 |

Strict legacy v0/v1 snapshots, current v2 snapshots, archival Heat metadata, Mirror reflection-pressure migration, current Heat-free projections, and remaining generic Heat discriminators are unchanged.

## Balance impact

| ID | Trigger frequency | Previous effective reward | New reward | Typical-session impact | Farming risk |
|---|---|---:|---:|---|---|
| Bellrain Inversion | Active anomaly on three graph routes | 0 | +1 Salvage | Occasional route-dependent income | Medium-low; requires normal anomaly resolution and cannot be invoked as a shop loop |
| Equipment Requisition | Once per accepted and completed Contract instance | 0 | +1 Salvage | One bounded mission payout | Low; active-slot and completed-ledger lifecycle reject repeat completion |
| Latchspire Raider | Victory against one outer-deck enemy route | 0 | +1 Salvage | Occasional combat loot | Low; loss pays nothing and unresolved combat cannot claim reward |

Maximum gain from resolving all three distinct outcomes once is 3 Salvage. A typical routed session is expected to expose approximately 0–2 of these rewards per operative. The additions do not change prices, sales, Deep Relic Search, Salvage Ledger, mission progress, payment semantics, or completed-contract spending. No reward is a shop transaction, so no buy/sell or Ledger recursion is introduced. Total available spending remains materially larger than this batch's income.

## Tests

Focused coverage proves:

- Exact three authored `gain_salvage 1` branches and preserved identity/availability.
- Bellrain and Latchspire mutate Salvage exactly once, produce truthful outcome text, reject replay, and persist through reconnect.
- Latchspire loss grants no Salvage and retains `take_wound 1`.
- Equipment Requisition pays nothing before completion, pays exactly once through `COMPLETE_CONTRACT`, records the ledger entry, clears the active slot, adds no Equipment, rejects duplicate completion, and survives reconnect.
- Exact post-batch Heat and Salvage counts and exact approval removal.
- New unapproved Heat remains rejected.
- Phone/TV result surfaces contain no Heat, Risk, raw Heat discriminator, or false Salvage loss.

## Remaining Salvage candidates

Pending and unchanged automatic floor-zero loss candidates:

- `escalation-marrow-surgery-debt`
- `crown-bell-baron`
- `marrow-tax-auditors`
- `pale-contract-collector`
- `soot-stained-cutpurse`

They require a separate economy-tightening approval. No two-Salvage gain/loss, payment, or transfer candidate is approved by this batch.

## Four-seat critique

- **New Player:** every completed branch now states the actual one-Salvage reward; no Heat/Risk knowledge or new choice is required.
- **Optimizer:** rewards cannot trigger from buying/selling, cannot recurse into Salvage Ledger or mission progress, and Contract completion cannot replay.
- **Family Player:** resolution remains immediate with no extra prompt or bookkeeping.
- **Rules Lawyer:** exact branch timing, owner, amount, continuation, Contract lifecycle, reconnect persistence, and duplicate rejection are explicit.

## Files changed

- Three canonical content JSON files.
- Legacy Heat approval manifest and focused validation/count tests.
- One focused engine regression suite.
- This report and the two Heat decision registers.

No shop, schema, reducer, server, client, snapshot, asset, or global economy file changed.
