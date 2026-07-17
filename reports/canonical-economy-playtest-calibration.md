# Canonical Economy Playtest Calibration

## Evidence Boundary

This pass is automated calibration, not a human playtest. It combines:

1. A deterministic canonical-content model covering 45 runs and 80 operative samples.
2. Real reducer/server/component tests for transaction authority, replay, reconnect, and privacy.
3. A real browser flow for the three-Contract Artifact exchange.

The model uses five fixed seeds across five solo profiles, 2/3/4-player co-op, and two-player Rivalry. It samples operative turns 1, 5, 10, 15, 20, and 30. Turn 30 is a censoring cap, not a claim that a scenario ended then. Results are estimates and must not be presented as observed table play.

## Profiles and Final Averages

| Profile | Samples | Salvage gained / spent / left | Purchases | First purchase | Zero-Salvage turns | Advancements | Exchanges | First exchange |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Solo mixed | 5 | 6.6 / 6.0 / 1.8 | 1.6 | 2.5 | 10.0 | 8.4 | 0.4 | 22.0 |
| Solo combat | 5 | 5.2 / 3.4 / 1.0 | 0.8 | 2.5 | 18.8 | 13.6 | 0.6 | 18.0 |
| Solo Signal | 5 | 7.2 / 7.6 / 1.0 | 1.6 | 4.0 | 13.2 | 7.4 | 1.0 | 18.2 |
| Solo Guile | 5 | 10.0 / 9.8 / 1.2 | 2.6 | 2.6 | 11.8 | 7.8 | 0.8 | 12.0 |
| Solo mission | 5 | 7.0 / 7.6 / 0.8 | 2.0 | 3.0 | 9.8 | 6.8 | 1.6 | 14.2 |
| Two-player co-op | 10 | 7.6 / 6.4 / 0.9 | 1.6 | 4.4 | 13.5 | 11.0 | 0.9 | 19.4 |
| Three-player co-op | 15 | 8.1 / 7.5 / 1.0 | 1.9 | 4.5 | 10.9 | 9.1 | 0.8 | 19.3 |
| Four-player co-op | 20 | 9.0 / 8.0 / 1.2 | 2.1 | 5.7 | 11.0 | 10.4 | 1.0 | 18.2 |
| Two-player Rivalry | 10 | 9.2 / 7.7 / 0.7 | 2.3 | 3.0 | 9.3 | 11.7 | 0.6 | 16.4 |

“First exchange” averages only samples that completed an exchange. Across all samples, 53/80 reached one, the median first exchange was turn 18, 33 reached it by turn 20, and 27 did not reach it by the turn-30 cap.

## Cross-Profile Checkpoints

| Operative turn | Salvage held | Salvage gained | Salvage spent | Trophy value held | Advancements | Completed Contracts held | Exchanges |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2.44 | 0.32 | 1.00 | 1.06 | 0.19 | 0.15 | 0.00 |
| 5 | 1.19 | 1.27 | 2.80 | 4.21 | 1.32 | 0.57 | 0.01 |
| 10 | 1.16 | 2.52 | 3.55 | 5.48 | 3.34 | 0.85 | 0.12 |
| 15 | 1.02 | 3.90 | 4.55 | 6.92 | 5.21 | 1.11 | 0.22 |
| 20 | 0.99 | 5.35 | 5.49 | 6.85 | 6.95 | 1.04 | 0.48 |
| 30 | 1.04 | 8.11 | 7.31 | 7.44 | 9.89 | 1.18 | 0.85 |

## Calibration Findings

### Salvage

- One modest purchase is possible early: average first successful purchase falls between turns 2.5 and 5.7 in every profile.
- Salvage remains scarce rather than accumulating: average ending balance is 0.7–1.8.
- The combat profile is the clearest starvation risk, averaging 18.8 zero-Salvage turns and only 0.8 purchases.
- Guile produces the most modeled income and spending, but does not end with a stockpile.
- Modeled successful shop actions are much less frequent than desired actions because the deliberately aggressive shopper policies keep trying after funds are exhausted. This is a pressure signal, not a measured percentage of real shop visits.
- No value was changed: the starvation signal requires repeatable human-session evidence before altering income, costs, or losses.

### Trophies

- Combat produces the fastest modeled advancement, as intended.
- The 6.8–13.6 advancement range is high enough to require real-session scrutiny; the model assumes frequent successful eligible enemy defeats and immediately spends whenever the policy allows.
- Non-combat profiles still advance because all profiles can defeat enemies, but this model does not reproduce route geometry, failed battles, healing downtime, or scenario end pressure.
- Partial Trophy value, caps, invalid targets, reconnect, and duplicate rewards are covered by authoritative tests rather than inferred from the model.

### Completed Contracts and Artifacts

- Mission focus reaches the first exchange earliest among the intended non-economic profiles (14.2 average; Guile's stochastic sample averaged 12.0).
- Co-op first exchanges cluster around turns 18–19, matching the late-midgame target under the stated assumptions.
- A third of samples remained below an exchange by turn 30, so the three-Contract requirement should be watched in shorter scenarios.
- Contracts are consumed only on valid Artifact confirmation; cancellation or reconnect does not spend them.
- No requirement, reward, or Artifact availability value changed.

## Solo and Multiplayer Comparison

- Solo starts at 4 Salvage and multiplayer at 3 per operative, as authored.
- Multiplayer does not pool Salvage, Trophies, or completed Contracts.
- Modeled co-op purchase timing slows modestly with player count, but per-operative ending balances remain near one Salvage.
- Artifact options remain owner-private in all modes; the TV receives only public completion state.
- Rivalry showed no private-data leak and no alternate currency path.

## Browser QA Review

Captures are stored under `reports/ui/economy/` (ignored QA output):

- `phone-390x844-insufficient-contracts.png`
- `phone-390x844-exchange-ready.png`
- `phone-390x844-private-artifact-options.png`
- `phone-390x844-confirm-artifact.png`
- `phone-390x844-reconnect-ledger.png`
- `tv-1366x768-public-exchange.png`

Visual findings:

- Salvage, Scars, Wounds, and Trophies are visually distinct from completed Contracts.
- The 2/3 and 3/3 exchange states use Contract language, not purchase language.
- The confirmation dialog states the exact Artifact and cost before consumption.
- The private option list scrolls normally; navigation remains available without horizontal overflow.
- Reconnect shows zero completed Contracts and the granted Artifact in inventory.
- TV shows a public exchange-completed result and never displays the private option list.
- No corrective UI edit was required in this pass. Coverage is strongest for the Artifact exchange; service, sale, and Trophy screens remain covered by component/integration tests rather than new screenshots.

## Four Critique Seats

### New player

The three resources are separated in the inventory and shop. The exchange clearly says “completed Contracts,” and consumption is delayed until confirmation. Must-watch: Trophy advancement discoverability outside the inventory panel.

### Optimizer

Exact IDs, stale requests, wrong owners, invalid Artifacts, replay, sale-profit checks, and reconnect option rerolls are guarded. No Artifact sale or ordinary-shop path exists. Must-watch: combat advancement pace in real sessions.

### Family/casual player

The exchange is a short two-step choice and cancellation is safe. Three resources remain manageable because each has one role. Must-watch: repeated zero-Salvage service lockouts, especially for combat-first play.

### Rules lawyer

Gain/loss/pay/spend are typed separately; costs commit at authoritative resolution. The exchange names exact completed Contract IDs, spends only after confirmation, restores pending choice on reconnect, and rejects replay.

## Balance Gate Decision

No balance change qualified. The combat starvation signal and Trophy pace are repeated in modeled samples, but neither is human play evidence and route/scenario timing is absent. Recommended next evidence is two or more logged full sessions per flagged profile before changing starting Salvage, prices, rewards, Trophy costs, or the three-Contract requirement.
