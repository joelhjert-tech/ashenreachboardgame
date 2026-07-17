# Ashen Reach Economy Balance Model

## Method

`npm.cmd run analyze:economy` scans canonical content and runs a deterministic model for seven play profiles at turns 5, 10, 15, and 20. The rates are explicit assumptions, not playtest evidence. They represent current source density and intended route emphasis rather than random card draws.

## Catalog facts

| Metric | Result |
|---|---:|
| Normal shop Equipment | 30 |
| Normal price range | 2-4 Salvage |
| Mean normal price | 2.90 Salvage |
| Sale-profit violations | 0 |
| Artifact cards | 30 |
| Eligible non-QA Artifact gear options | 24 |
| Authored Salvage gain leaves | 10 |
| Authored Salvage loss leaves | 13 |

## Twenty-turn estimates per operative

| Profile | Gain | Spend | Remaining MP / solo | Trophy value | Completed Contracts | First exchange expectation |
|---|---:|---:|---:|---:|---:|---|
| Combat | 4 | 4 | 3 / 4 | 15 | 2 | After turn 20 |
| Signal | 4 | 3 | 4 / 5 | 7 | 2 | After turn 20 |
| Guile | 6 | 5 | 4 / 5 | 6 | 2 | After turn 20 |
| Mission | 4 | 3 | 4 / 5 | 6 | 3 | About turn 18-20 |
| Mixed casual | 4 | 4 | 3 / 4 | 8 | 2 | After turn 20 |
| Conservative | 4 | 2 | 5 / 6 | 8 | 2 | After turn 20 |
| Aggressive | 5 | 6 | 2 / 3 | 8 | 2 | After turn 20 |

At turns 5/10/15 the model generally leaves 3-5 Salvage available, permitting a modest purchase early and one or two further services/purchases by midgame. Mission-focused play reaches the first Artifact exchange around turn 20; other profiles require longer or stronger Contract routing.

## Findings

- **No broad starvation signal:** starting 3/4 covers every common price-2 item and most price-3 items.
- **Scarcity remains meaningful:** authored reliable income is concentrated in Contracts; only one Threat and one anomaly directly grant Salvage.
- **Route diversity is acceptable but fragile:** Guile has the strongest modeled Salvage rate, combat has the strongest Trophy rate, and mission play owns Artifact timing.
- **Late-game excess is limited:** conservative play reaches only 5-6 unspent Salvage in the model.
- **Trophy pacing varies intentionally:** combat can fund an upgrade around turn 10; non-combat profiles around turns 15-20.

## Later playtest questions

1. Does the single direct Threat Salvage reward make Red characters overly dependent on sales?
2. Do Signal routes encounter Bellrain Inversion often enough to feel economically present?
3. Does a turn-18-to-22 first Artifact exchange feel earned rather than late?
4. Are price-4 items meaningfully aspirational without causing first-shop frustration?
5. Does the aggressive-spender profile experience real unaffordable choices more often than this rate model predicts?
