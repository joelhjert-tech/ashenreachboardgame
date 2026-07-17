# Heat Phase 1F — low-risk Salvage outcomes

## Outcome

Phase 1D identifies 16 Severity-1 Salvage recommendations. Seven Contract rewards are implementation-ready because the existing `gain_salvage` effect expresses their amount, timing, target, persistence, and result delta. Nine loss/payment recommendations remain blocked: current content effects support `gain_salvage` but not a typed floor-zero `lose_salvage`, and the payment designs need an authoritative choice/transaction window. No new resolver or schema was introduced.

## Preflight target set

| ID | Branch | Previous Heat effect | Approved effect | Timing | Status |
|---|---|---|---|---|---|
| `cartel-crossing-thread` | Contract reward sequence | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `choir-echo-triangulation` | Contract reward | `lose_heat 2` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `choir-hush-census` | Contract reward | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `choir-well-canticle` | Contract reward | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `clan-salt-burial` | Contract reward | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `contract-beacon` | Contract reward sequence | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `warden-span-vigil` | Contract reward sequence | `lose_heat 1` | gain 1 Salvage | `COMPLETE_CONTRACT` reward | Completed |
| `escalation-crownfall-writ` | escalation consequence | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `ash-rat-skitter` | failed hazard | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `bridge-toll-runt` | confrontation loss | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `gate-tax-collectors` | confrontation loss | `gain_heat 1` | payment/trade-off not fully representable | before benefit | Blocked: no transaction window |
| `gutter-bell-mite` | confrontation loss | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `pale-toll-enforcer` | confrontation loss | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `rust-choir-peddlers` | confrontation loss | `gain_heat 1` | pay 1 Salvage for existing offer | before benefit | Blocked: no transaction window |
| `rust-mote-drone` | confrontation loss | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |
| `toll-scrip-urchins` | confrontation loss | `gain_heat 1` | lose up to 1 Salvage | automatic, floor zero | Blocked: no typed loss effect |

All recommendations are severity 1 and are a strict subset of the 19 Salvage decisions. The seven completed entries are not assigned to a later high-risk treatment.

## Enforced behavior

Completing any migrated Contract grants exactly 1 Salvage through the existing authoritative reward transaction. Sequence rewards retain their existing notes after the Salvage gain. `COMPLETE_CONTRACT` remains the sole reward/ledger/active-slot transaction. The rewards have no affordability or zero-Salvage edge: they always add one because no global Salvage cap exists.

## Compatibility counts

- Allowlist: **114 → 107**; removed exactly the seven completed IDs.
- Generic Heat occurrences: **90 → 83**.
- `gain_heat`: **67**; `gain_heat_all`: **4**; `lose_heat`: **19 → 12**.
- Heat-only primary IDs: **45 → 38**.
- Heat-only branches: **48 → 41**.
- Salvage recommendations remaining: **12** — nine Severity-1 blocked loss/payment entries and three higher-severity recommendations.

All completed IDs now contain no blocked Heat construct. Every blocked ID remains unchanged and allowlisted. Player-facing Heat/Risk routes and active stored-Heat reads/writes remain zero.

## Balance model

| Metric | Result |
|---|---|
| Previous effective severity | 0 |
| New severity | 1 |
| Swing per completion | +1 Salvage |
| Typical session exposure | approximately +1 to +2 when one or two listed Contracts complete |
| Maximum across all seven distinct rewards | +7 Salvage |
| High-encounter exposure | unchanged unless Contract completion frequency rises |
| Early game | modest help toward one purchase |
| Late game | diminishing relative value |
| Cooperative | reward remains owner-bound; no shared pool introduced |
| Rivalry | no cross-seat targeting or private-data change |

No voluntary choice becomes dominant because these are completion rewards, not selectable free encounter branches. They cannot be farmed without completing and replacing Contracts through the existing lifecycle.

## Tests and four-seat critique

Focused tests cover all seven IDs, exact +1 mutation, single resolution, unchanged Heat/Wounds/Scars/pressure/escalation, completed/blocked allowlist populations, and continued authoring-guard rejection. Existing mission lifecycle, result-delta, serialization, reconnect, phone, and TV suites cover the shared path.

- **New Player:** “gain 1 Salvage” is an ordinary visible Contract reward; no Heat/Risk knowledge is needed.
- **Optimizer:** rewards remain behind `COMPLETE_CONTRACT`; no payment bypass, zero-floor exploit, or repeated request path was added.
- **Family Player:** one established resource and no new prompt keeps resolution immediate.
- **Rules Lawyer:** gain is not confused with loss/pay; reward timing and ledger ownership remain unchanged; result mutation is exact and reconnect-safe.

## Remaining work

Remaining Phase 1D decisions: 12 Salvage, 2 Equipment, 6 tests/challenges, 4 Wounds, 1 Scar, 2 Loss Pressure, 2 Global Escalation, 8 bespoke rewrites, and 1 retirement. The mixed 39 Heat clauses, 17 authored defaults, save/schema migration, optional `character.heat`, Mirror key migration, and discriminator cleanup remain separate.
