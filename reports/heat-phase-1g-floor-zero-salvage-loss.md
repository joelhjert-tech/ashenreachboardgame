# Heat Phase 1G — typed floor-zero Salvage loss

## Outcome

Phase 1G adds one typed automatic consequence, `lose_salvage`, and migrates the seven Phase 1F blockers whose approved design required only unavoidable floor-zero loss. It does not implement payment, choice, toll, purchase, bribe, transfer, or shared-loss infrastructure.

## Nine-ID classification

| ID | Previous Heat branch | Phase 1D proposal | Classification | Amount | Qualifies | Result |
|---|---|---|---|---:|---|---|
| `escalation-crownfall-writ` | escalation sequence: `gain_heat 1` | lose up to 1 Salvage | Automatic loss | 1 | Yes | Implemented |
| `ash-rat-skitter` | hazard failure: `gain_heat 1` | lose up to 1 Salvage | Automatic loss | 1 | Yes | Implemented |
| `bridge-toll-runt` | confrontation loss: `gain_heat 1` | loose straps cost up to 1 Salvage | Automatic loss | 1 | Yes | Implemented |
| `gate-tax-collectors` | confrontation loss: `gain_heat 1` | enforce a fee/trade-off | Required payment | 1 proposed | No | Deferred for authoritative payment/choice state |
| `gutter-bell-mite` | confrontation loss: `gain_heat 1` | ruined salvage, lose up to 1 | Automatic loss | 1 | Yes | Implemented |
| `pale-toll-enforcer` | confrontation loss: `gain_heat 1` | confiscation, lose up to 1 | Automatic loss | 1 | Yes | Implemented |
| `rust-choir-peddlers` | confrontation loss: `gain_heat 1` | pay for the offer | Optional payment/choice | 1 proposed | No | Deferred for authoritative payment/choice state |
| `rust-mote-drone` | confrontation loss: `gain_heat 1` | consumed parts, lose up to 1 | Automatic loss | 1 | Yes | Implemented |
| `toll-scrip-urchins` | confrontation loss: `gain_heat 1` | cut straps, lose up to 1 | Automatic loss | 1 | Yes | Implemented |

No report/content conflict was found. The payment entries remain byte-for-byte mechanically unchanged and explicitly allowlisted.

## Effect contract

`{ "type": "lose_salvage", "amount": N }` accepts positive integers only. For current Salvage `S`, the authoritative mutation is `actualLoss = min(S, N)` and the result is `max(0, S - N)`. It is automatic, permits partial loss, never checks affordability, never opens a prompt, and always allows the encounter to continue. A positive actual loss emits `Lost N Salvage`; zero actual loss emits no fabricated negative result delta.

The resolver is content-generic and preserves authored sequence order. It changes no Heat, Wounds, Scars, Loss Pressure, Global Escalation, equipment, attributes, movement, or Contract state. Reapplying a completed resolution is rejected because its pending effect has closed.

## Content changes

| ID | Trigger | Previous effective result | New result | Zero-Salvage behavior | Preserved behavior |
|---|---|---|---|---|---|
| `escalation-crownfall-writ` | Crownfall Writ resolves | note plus no-op Heat clause | note, then lose up to 1 Salvage | note and escalation resolution continue; no loss delta | note, `escalationDelta: -2`, ID and art/catalog data |
| `ash-rat-skitter` | failed hazard test | no-op Heat penalty | lose up to 1 Salvage | failure completes with no loss delta | success note and hazard data |
| `bridge-toll-runt` | lost confrontation | no-op Heat penalty | lose up to 1 Salvage | loss completes | battle, trophy and wound data |
| `gutter-bell-mite` | lost confrontation | no-op Heat penalty | lose up to 1 Salvage | loss completes | battle, trophy and wound data |
| `pale-toll-enforcer` | lost confrontation | no-op Heat penalty | lose up to 1 Salvage | loss completes | battle, trophy and wound data |
| `rust-mote-drone` | lost confrontation | no-op Heat penalty | lose up to 1 Salvage | loss completes | battle, trophy and wound data |
| `toll-scrip-urchins` | lost confrontation | no-op Heat penalty | lose up to 1 Salvage | loss completes | battle, trophy and wound data |

Visible text now says “lose up to 1 Salvage” and no longer implies Heat, Risk, payment, or a blocked interaction. Stable IDs, deck/category/lane/rarity/activation data, art paths, and availability are unchanged.

## Compatibility counts

| Measure | Before | After |
|---|---:|---:|
| Heat-only primary IDs | 38 | 31 |
| Heat-only branches | 41 | 34 |
| Heat-effect occurrences | 83 | 76 |
| Compatibility allowlist IDs | 107 | 100 |
| `gain_heat` | 67 | 60 |
| `gain_heat_all` | 4 | 4 |
| `lose_heat` | 12 | 12 |
| `lose_salvage` content occurrences | 0 | 7 |

The seven completed IDs leave the explicit allowlist because no Heat construct remains on them. `gate-tax-collectors` and `rust-choir-peddlers` remain approved compatibility IDs. Generic Heat discriminators remain deliberate no-ops; `character.heat`, serialization, reconnection, and Mirror's `heatThreshold` are unchanged. Player-facing Heat/Risk routes and active stored-Heat gameplay reads/writes remain zero.

## Validation and tests

The content guard accepts `lose_salvage` only on the seven approved automatic-loss IDs. This explicit boundary prevents a toll, fee, purchase, or choice from being encoded as a floor-zero consequence and preserves the separate transaction prerequisite.

Focused coverage verifies positive-integer schema validation; 4→3, 1→0, 0→0, and partial 1→0 loss; actual-delta projection; sequence ordering; resource isolation; duplicate rejection; reconnect serialization; all seven content records; the two deferred records; stable IDs; and authoring-boundary rejection. General content, engine, client, asset, and build suites protect catalog and presentation behavior.

## Balance

Every migrated branch moves from effective severity 0 to approved severity 1 and removes at most 1 Salvage per occurrence. Typical exposure is approximately 1–2 Salvage in a session that encounters one or two listed cards; high-encounter exposure is bounded by draw frequency but repeatable Threats can increase it. No reward is unlocked at zero Salvage, so the floor cannot become a free purchase. The consequence is owner-bound in co-op and cannot be redirected in Rivalry. Shop access remains viable because no branch blocks resolution or creates debt.

## Four-seat critique

- **New Player:** “lose” is distinct from “pay”; the exact amount is visible and no hidden resource appears.
- **Optimizer:** zero Salvage prevents only economic damage and never unlocks a benefit; duplicate resolution cannot repeat the loss.
- **Family Player:** the consequence is automatic, adds no prompt or bookkeeping, and reports the actual amount removed.
- **Rules Lawyer:** partial loss is permitted, the lower bound is zero, authored ordering is stable, and actual deltas match mutations across reconnect.

## Remaining work

Two Severity-1 Salvage payment/choice recommendations remain blocked on authoritative transaction/choice state. Three higher-severity Salvage recommendations, two Equipment effects, six tests/challenges, four Wounds, one Scar, two Loss Pressure, two Global Escalation, eight bespoke rewrites, and one retirement remain pending. The 39 mixed Heat clauses, 17 authored defaults, versioned save migration, optional `character.heat`, Mirror key migration, and eventual discriminator/schema cleanup remain separate phases.

No Heat-to-Wound, Heat-to-Scar, Heat-to-pressure, persistent-state, or save-format migration was introduced.
