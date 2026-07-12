# Heat Phase 1E — Batch 1 removals

## Outcome

Exactly five Phase 1D `Remove` decisions were implemented. Each obsolete `lose_heat` member was deleted with no replacement mechanic. Existing note results and three existing `escalationDelta: -1` fields remain unchanged in purpose. Stable IDs, files, catalog placement, art lookup, and availability remain intact.

## Preflight and implemented branches

| ID | File | Approved branch | Before authored behavior | Before runtime | New authored/runtime behavior | Other preserved behavior |
|---|---|---|---|---|---|---|
| `anomaly-ashfall-murmur` | `content/cards/anomalies/anomaly-ashfall-murmur.json` | `resolveEffect.effects[0]` | `lose_heat 1`, then existing route note | Heat member did nothing; note recorded | Existing note only; summary says the ash settled | instability, region, flavor, identity |
| `anomaly-glassmere` | `content/cards/anomalies/anomaly-glassmere.json` | `resolveEffect.effects[0]` | `lose_heat 1`, then existing observation note | Heat member did nothing; note recorded | Existing note only; summary describes observation | instability, region, flavor, identity |
| `escalation-ashfall-curfew` | `content/cards/escalations/escalation-ashfall-curfew.json` | `resolveEffect.effects[0]` | `lose_heat 1`, then exception note | Heat member did nothing; note and escalation reduction resolved | Existing note only; cooling claim removed | `step: 2`, `escalationDelta: -1` |
| `escalation-ridge-suture` | `content/cards/escalations/escalation-ridge-suture.json` | `resolveEffect.effects[0]` | `lose_heat 1`, then anchored-suture note | Heat member did nothing; note and escalation reduction resolved | Existing note only; cooling claim removed | `step: 1`, `escalationDelta: -1` |
| `escalation-webglass-afterimage` | `content/cards/escalations/escalation-webglass-afterimage.json` | `resolveEffect.effects[0]` | `lose_heat 1`, then false-route note | Heat member did nothing; note and escalation reduction resolved | Existing note only | `step: 3`, `escalationDelta: -1` |

All five branches remain reachable through their existing content resolution. The sequence wrapper was simplified to its sole surviving `gain_note`; no empty structure or dummy effect was introduced.

## Compatibility and counts

- Compatibility allowlist: **119 → 114** IDs.
- Removed approvals: the exact five IDs above. Each now contains no blocked Heat construct.
- Total authored generic Heat effects: **95 → 90**.
- `gain_heat`: **67 → 67**.
- `gain_heat_all`: **4 → 4**.
- `lose_heat`: **24 → 19**.
- Heat-only primary IDs: **50 → 45**.
- Heat-only branches: **53 → 48**.
- Other Heat-only IDs unchanged: **45**.
- Mixed Heat-plus-active entries and authored defaults are unchanged.

The generic no-op discriminators, `character.heat`, Mirror `heatThreshold`, serialization, and reconnect compatibility remain supported. No generated file required regeneration; the content loader reads these canonical JSON sources directly. Asset paths are ID-derived and unchanged.

## Tests and containment

Focused tests assert the five-ID population, catalog presence, note-only result shape, preserved escalation reductions, truthful copy, 114-ID compatibility boundary, representative unrelated approvals, and continued rejection of new Heat constructs. Existing content, engine, projection, reconnect, and asset suites protect stable identity and surrounding behavior.

## Four-seat critique

- **New Player:** summaries now describe only observable results and never imply cooling, Heat, Risk, or a hidden reward.
- **Optimizer:** no new reward or avoidable cost exists; the same notes and escalation reductions that already resolved still resolve.
- **Family Player:** resolution is immediate and does not display an empty or broken effect.
- **Rules Lawyer:** branch order no longer contains a dead member, mandatory resolution closes normally, stable IDs remain valid, and result copy matches mutation.

## Explicit non-conversions and remaining work

No Wound, Scar, Salvage, Loss Pressure, Global Escalation, Equipment, test, condition, movement restriction, turn restriction, reroll, or resource was introduced. No entry was blocked.

Remaining Phase 1D primary decisions: 4 Wounds, 1 Scar, 2 Loss Pressure, 2 Global Escalation, 19 Salvage, 2 Equipment, 6 tests/challenges, 8 bespoke rewrites, and 1 retirement — **45 total**. The 39 mixed clauses, 17 authored defaults, save migration, optional `character.heat`, Mirror key migration, and eventual discriminator/schema cleanup remain separate phases.
