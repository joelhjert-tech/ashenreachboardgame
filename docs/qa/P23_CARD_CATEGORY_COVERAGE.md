# P23 Card Category Coverage

## Inventory gate

- Machine matrix: `docs/research/P23_CARD_CATEGORY_LIFECYCLE_MATRIX.json`
- Human audit: `docs/research/P23_CARD_CATEGORY_LIFECYCLE_AUDIT.md`
- Required total: 398
- Gameplay families: 361
- Appendix: 37
- Duplicate family/ID identities: 0
- Silent omissions: 0

## Focused coverage

| Area | Evidence |
|---|---|
| All 30 Afflictions | Table-driven `resolveAfflictionDraw` coverage in `afflictions.test.ts` |
| Draw queue | `p23CardLifecycle.test.ts` |
| Nested and replacement draws | Oath to the Breach and Condemned Echoes queue tests |
| Owner choice | Runaway Growth prepared-choice test |
| Reactions | Bile Spit reducer test plus server intent/projection suite coverage |
| Rewritten modifiers | Five-card modifier assertions |
| Four draw sources | Content validation and draw-effect queue tests |
| Sixteen passive Equipment | Equipped, unequipped, suppressed, and serialized table tests |
| Artifact source mapping | Every gain-gear Artifact effect links to its card |
| Artifact paths | Exact 26 sector + four dealer-only assertion |
| Eight prior weak Artifacts | `itemEffectPostAuditHardening.test.ts` |
| 398 classifications | `p23-card-lifecycle-audit.test.ts` |
| QA exclusion | Development-only classification and existing shop/setup gates |

## Privacy and reconnect assertions

- Affliction choices are projected only to the owning phone.
- TV receives only actor/status and public result text.
- Pending queue/reaction state is part of the save-version-2 game state.
- A completed draw decrements its queue and records history before another draw.
- Prepared card and die remain server-authored.
- Resolved reaction usage prevents a repeat in the same timing window.
- Contract objective and progress privacy are unchanged.

## Validation record

| Check | Result |
|---|---|
| Content validation | Passed: 18 Characters, 71 Gear, 109 Threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations, 30 Afflictions |
| Typecheck | Passed |
| Lifecycle generation | Passed: exactly 398 records (361 gameplay + 37 appendix) |
| Focused P23 tests | Passed: 53 tests |
| Corrected historical regressions | Passed: 71 tests |
| Engine and rules | Passed: 72 files, 825 tests |
| Rules-only | Passed: 13 files, 103 tests |
| Server integration, privacy, reconnect | Passed: 45 files, 383 tests |
| Client and accessibility surfaces | Passed: 67 files, 516 tests |
| Production build | Passed: 621 modules transformed |
| Asset audit | Passed: 501/501 present; 0 missing, invalid, placeholder, or release-blocking |
| Art diff | Passed: no art or audio paths changed |
| Save version | Remains 2 |
| Staging/commit/push | No staged files; no commit or push |
| QA ports | 5173 and 8080 verified free after stopping the repository QA fixture process |

The client suite emitted only the expected messages from explicit missing-art fallback fixtures. No unexpected runtime error was reported.
