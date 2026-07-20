# Salvage Resolution Debug Audit

## Outcome

Salvage mutation was already authoritative in the reducer, but the visible resolution lifecycle did not consistently reach that reducer. The repaired flow is now:

`visible roll result -> one explicit Continue -> canonical effect application -> optional/required decision when authored -> one result -> normal continuation`

The server remains the only authority for balances, amounts, affordability, decisions, replay protection, and deterministic rewards.

## Canonical source inventory

A repository search found 13 content files containing `gain_salvage`, 13 containing `lose_salvage`, and two containing `encounter_payment`. These include Threat, Anomaly, Contract, and Escalation content. No client-side balance mutation was found.

Representative paths exercised end to end:

| Path | Canonical source | Expected result |
|---|---|---|
| Automatic loss | `lose_salvage` | Apply automatically and floor at zero |
| Mandatory payment | `gate-tax-collectors` | Require the full 1 Salvage or resolve the authored unavailable branch |
| Optional payment | `rust-choir-peddlers` | Owner may pay 1 Salvage or decline |
| Battle reward | `latchspire-raider` | Gain exactly 1 Salvage once |
| Event reward | `anomaly-bellrain-inversion` | Gain exactly 1 Salvage once |
| Mission reward | `compact-equipment-requisition` | Gain exactly 1 Salvage after canonical completion |

## Root causes

1. `RESOLUTION_APPLIED` correctly changed balances, but the normal visible flow required a second Continue before a pending effect reached it. Players saw authored outcome text before the state mutation.
2. Encounter-payment actions were included in the generic resolution action list, while phone guidance selected the Battle tab for Hazard/Threat resolution. The required control could therefore be outside the guided screen.
3. Salvage gains were absent from the resolution-text result-delta parser, and Salvage was excluded from the phone Battle result filter.
4. Recent payment deltas were not tied to their source card/resolution. This allowed a payment to appear twice during its own outcome and remain visible during a later battle reward.
5. A delayed resolution auto-continue could fire after a payment prompt acquired continuation ownership. The rejected `CONTINUE_RESOLUTION` escaped the timer callback and terminated the dev server.

## Semantics verified

- Gain: exact positive amount once.
- Lose: automatic, floor zero, no affordability requirement.
- Pay: exact full amount, owner decision, no partial debt.
- Decline: no deduction and the authored decline result.
- Insufficient required payment: no deduction, no debt, no stranded prompt.
- Replay: stable decision/resolution IDs reject a second application.
- Reconnect: pending decisions and completed balances are preserved.
- Projection: balances and public-safe result deltas derive from server state.

## Scope

No prices, rewards, save version, topology, scenario rules, Artifact rules, or Heat behavior were changed. Save version remains 2 and legacy imports remain supported.
