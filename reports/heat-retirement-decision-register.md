# Heat Retirement Decision Register

Updated: 2026-07-12 after Phase 1B analysis. Recommendations are not implemented.

| ID | Preferred recommendation and evidence | Status | Blocks |
|---|---|---|---|
| HRD-001 | Preserve Heat only through a versioned compatibility adapter; ignore it after all readers/writers migrate, then remove. | Recommended | 4, 5 |
| HRD-002 | Preserve old nonzero values but ignore them. Do not convert, compensate, or make them spendable. | Recommended | 4 |
| HRD-003 | Migrate per content family: delete 39 no-op members beside active effects; individually design 31 Heat-only penalties plus 19 Heat-only rewards/mixed outcomes. | Recommended | 3 |
| HRD-004 | Never map `lose_heat` to Scar removal by default. Individually revalue 19 reward/recovery entries. | Recommended | 3 |
| HRD-005 | Black Route Fuse drops `heatCost`; discard and +1 escalation remain its complete cost. Current Heat metadata is not enforced. | Recommended | 3 |
| HRD-006 | `risk-action` becomes Deep Relic Search with proposed 1-Salvage reveal fee. It is the sole `cost.heat` service. | Recommended | 3 |
| HRD-007 | Remove `buy-boon` false delta with service withdrawal; later remove cross-seat nemesis Heat reduction while preserving trophies. | Recommended | 3 |
| HRD-008 | Do not restore Heat defeat. Retire `HEAT_THRESHOLD_REACHED` after compatibility fixtures migrate. | Recommended | 5 |
| HRD-009 | Replace Mirror semantics with `reflectionPressureThreshold`, new-key preferred and `heatThreshold` fallback. | Recommended | 4 |
| HRD-010 | Scar-Sink Prayer is implemented under player-facing name; preserve `heat-sink-prayer` as stable internal ID. | Recommended | 4 |
| HRD-011 | `buy-boon` is the confirmed new `heatDelta` origin; stop emission, retain read compatibility until payload versioning. | Recommended | 4 |
| HRD-012 | Old rooms currently load because fields remain required. Add formal schema versioning and legacy fixtures before optional/removal changes. | Recommended | 4 |
| HRD-013 | Retain a small named legacy compatibility suite; remove incidental Heat seeds from ordinary tests as each path migrates. | Recommended | 5 |
| HRD-014 | Global Escalation remains distinct. Use it only for explicitly authored scenario effects, never as universal Heat replacement. | Recommended | 3 |
| HRD-015 | Loss Pressure remains distinct. Consider it only for three table-wide Heat-only escalations after scenario balance review. | Recommended | 3 |
| HRD-016 | `lose_heat` is reachable through content but resolves as no-op. Nineteen entries require reward/recovery review. | Recommended | 3 |
| HRD-017 | Keep ten legacy Threat keys as read aliases until all authored users migrate; forbid new use; then remove. | Recommended | 5 |
| HRD-018 | Wound plus Scar remains legal only when explicitly authored with typed timing; Heat migration never adds both implicitly. | Recommended | 3 |
| HRD-019 | Preserve source event/card identity independently of replacement consequence so mission/scenario history neither duplicates nor disappears. | Recommended | 3 |
| HRD-020 | Risk disappears. Each surface displays its actual cost/effect. | Recommended | 3 |
| HRD-021 | Mode naming is outside Heat mechanics; retain documented solo/co-op/rivalry layers and deliberate aliases. | Still unresolved | Separate terminology track |
| HRD-022 | Canonical attributes remain Command, Grit, Signal, Guile, Forge. | Recommended | None |
| HRD-023 | Keep context-aware authoring lint and shrink the 120-ID allowlist per migration batch. | Recommended | 2, 5 |
| HRD-024 | Compatibility window length requires product/save-distribution policy unavailable in repository evidence. | Blocked | 4, 5 |

## Phase 1B counts

- Active Heat-cost item metadata: 1 (`black-route-fuse`), not enforced.
- Active Heat-cost service metadata: 1 (`risk-action`), not enforced.
- Actual direct stored-Heat mutation paths: 1 (cross-seat nemesis reward).
- Heat-shaped result-only delta paths: 1 (`buy-boon`).
- Allowlist: 120 IDs; 50 require individual design; 70 can enter mechanical-preserving cleanup batches.
- Stable identifiers/constructs reviewed: 24.
- Focused Phase 1A compatibility/guard tests: 10 parameterized cases across 6 declared test bodies; broader incidental Heat coverage exists in 30 test/fixture files.

## Approval boundary

All Phase 1B rows remain recommendations. No balance value, content outcome, save policy, field name, service availability, or compatibility window is implemented by this report.
