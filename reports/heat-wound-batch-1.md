# Heat-to-Wound Batch 1 — physical losses

Status: implemented and verified.

## Migrated IDs

| ID | Branch | Previous behavior | Current behavior | Severity | Active route |
|---|---|---|---|---:|---|
| `ash-cinder-runt` | `woundOnLoss` | `gain_heat 1`, compatibility no-op | `take_wound 1` | 1 | outer common red enemy; canonical graph x2 |
| `grave-silt-press` | `failEffect` | `gain_heat 1`, compatibility no-op | `take_wound 1` | 1 | outer common blue hazard; canonical graph x2 |
| `mirror-mite-bloom` | `woundOnLoss` | `gain_heat 1`, compatibility no-op | `take_wound 1` | 2 | outer common blue enemy; canonical graph x2 |
| `relay-pilgrim-riot` | `woundOnLoss` | `gain_heat 1`, compatibility no-op | `take_wound 1` | 2 | outer common yellow enemy; canonical graph x2 |

Each obsolete `heat` resource tag became `wound`. Existing generated result copy already presents `Suffer 1 Wound.` / `Failure: take 1 wound.` and therefore required no UI or authored-lore change. Stable IDs, titles, statistics, difficulty, severity, reward branches, art paths, lane/deck membership, graph placement, and encounter continuation remain unchanged.

## Authoritative behavior

The four branches use the existing typed Wound effect and ordinary server resolution. The effect:

- adds exactly 1 Wound after a loss/failure;
- runs existing prevention before actual mutation;
- emits only the surviving actual Wound delta;
- triggers the existing threshold recall and Scar flow, rather than assigning a Scar directly;
- opens no prompt and adds no state field;
- clears through normal continuation and cannot be replayed by reconnect or a second continue request.

Focused coverage uses Ker's existing Hold the Line path. Prevention leaves Wounds unchanged, records the established prevention note, emits no false +1 result, and triggers no threshold action. At threshold−1, the effect reaches the existing threshold exactly once, recalls the operative, and creates the ordinary recall Scar exactly once.

The three enemy loss branches leave their enemies under the existing persistence rules. Grave-Silt Press failure continues through the existing hazard flow. Its success note and all three enemy defeat notes remain unchanged.

## Compatibility cleanup and exact counts

All four IDs became Heat-free, so their exact `gain_heat` approvals were removed. No unrelated approval changed. Legacy v0/v1 parsing, v2 snapshots, archival character-Heat metadata, Mirror reflection-pressure migration, Heat-free projections, and generic discriminators for remaining content are unchanged.

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 32 | 28 |
| Heat branches/effects | 34 | 30 |
| `gain_heat` | 21 | 17 |
| `gain_heat_all` | 3 | 3 |
| `lose_heat` | 10 | 10 |
| Compatibility approvals | 48 | 44 |
| All canonical `take_wound` occurrences | 81 | 85 |
| Changed content IDs | 0 | 4 |

Active gameplay Heat reads/writes remain 0/0. Player-facing Heat/Risk routes remain 0/0.

## Balance impact

These four outcomes were mechanical no-ops and now create real health pressure. One resolution of every changed branch adds at most four gross Wounds. All four are outer common content, distributed across eight canonical graph placements, so repeated route/deck exposure is possible.

- Early game: one Wound is meaningful before reliable healing and prevention are assembled.
- Late game: the value is bounded at one, but operatives near the threshold can be recalled.
- Single-player: exposure concentrates on one operative; the threshold remains 4.
- Cooperative/Rivalry: personal damage can be distributed across operatives, but the multiplayer threshold remains 3. Rivalry agendas and private state are not inspected.
- No reward, economy, movement, pressure, Equipment, or mission system changed.

Playtesting should track actual Wounds by source ID, prevented Wounds, repeat draws, and recalls caused at threshold−1. Severity remains unchanged pending evidence from repeated play.

## Tests and verification

The focused suite covers:

- exact four content branches and current Heat population;
- stable IDs, severity, difficulty, stat, lane, art, and graph counts;
- four exact one-Wound mutations;
- four established prevention paths with no false delta;
- four threshold recall paths;
- unchanged success/reward sibling branches;
- phone and TV Wound presentation without Heat, Risk, or raw discriminators;
- unresolved-state round-trip, one-time continuation, and rejected duplicate continuation;
- precise approval removal and unchanged remaining discriminator counts.

Full command results are recorded in the implementation handoff.

## Remaining Heat-to-Wound candidates

- One-Wound candidates still pending approval: `choir-static-burst`, `lantern-moth-swarm` failure.
- Healing candidate pending approval: `mirror-rot-interference`.
- Isolated two-Wound candidate: `ashen-doppelganger`.
- Individual redesign remains required for `cinder-gate-backlash`, Lantern-Moth Swarm success, and `webglass-snarefield`.
- All economy, Equipment, movement, shared-pressure, mental/social, Scar, reward, and trade branches remain unchanged.

## Files changed

- Four approved threat JSON files: exact Heat-to-Wound replacement and resource-tag correction.
- `scripts/legacy-heat-validation.ts` plus validation/count regressions: remove exactly four approvals and update totals.
- `src/game/engine/__tests__/heatWoundBatch1PhysicalLosses.test.ts`: focused content, Wound, prevention, recall, presentation, reconnect, and boundary coverage.
- `reports/heat-wound-batch-1.md`: this implementation record.
- Heat-only and Heat-retirement decision registers: mark only these four conversions implemented.
