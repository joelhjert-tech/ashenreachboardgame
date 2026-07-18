# Live-play bug-fix audit

## Equipment, identity, and host closure

The follow-up live-play pass closed these additional boundaries:

- Starting Gear can be equipped or unequipped by its owner during setup. Active-game Gear management remains restricted to the authoritative Action window.
- Inventory actions address an exact Gear instance, so duplicate catalog IDs do not equip, repair, or charge the wrong copy.
- `supply` is a Gear subtype, not an equipment slot. Supply cards retain their authored weapon/armor/utility slot, passive bonus, timing, and charge rules. `Browse Supplies` now reveals real eligible Supply stock and purchases it at the card's authored price.
- `Repair Gear` requires an exact depleted instance. It readies exhaust-based Gear or restores charge-based Gear to its authored maximum; it does not alter unrelated items.
- The phone reapplies its authoritative Move, Shop, Action, or owner-Battle tab whenever a newer server patch arrives, even if the phase name did not change.
- The existing turn-change vibration remains a private phone-side notification (`160, 70, 160`) and never mutates gameplay state.
- TV movement uses centralized presentation tokens (550 ms start, 1,050 ms normal segments, 1,450 ms cross-ring segments, 900 ms arrival).
- The TV's redundant right rail is hidden from layout and accessibility. Shop and battle own a full-width event stage; movement owns the full board stage.
- Any trimmed display name containing `kebab`, case-insensitively, is restricted to Popelord during initial setup and Wound-driven replacement. Normal server-side character availability and uniqueness checks still apply.

The incomplete request fragment about an additional battle-side change was not guessed. Existing battle-side duplication is suppressed and the shared battle chamber remains authoritative.

## Result

All eleven reported defects were confirmed at a concrete boundary and repaired without changing save version, authored encounter balance, movement authority, or legacy compatibility.

| Defect | Exact correction | Primary files |
|---|---|---|
| Six-player co-op | Host selects 2–6; server/session capacity remains authoritative; six-seat lobby compacts; seventh rejection is tested | `PhoneApp.tsx`, `styles.css`, capacity tests |
| Fast TV animation | Central host timing tokens replace short scattered journey/flip timing | `motionTokens.ts`, `TvApp.tsx`, `styles.css` |
| New battle UI absent | Live chamber now has the projected effective stats and current stage labels it needs; old duplicate result remains suppressed | `HostBattleOverlay.tsx`, `roomServer.ts` |
| Hazard/battle divergence | Shared chamber classification and heading for four encounter types | `HostBattleOverlay.tsx` |
| Name overflow | Shared trim/1–8 code-point validator in phone and join API; legacy saves remain readable | `playerIdentity.ts`, `PhoneApp.tsx`, `server/index.ts` |
| Movement teleport | Sequential display follows every authoritative route ID and distinguishes cross-ring timing | `TvApp.tsx`, `motionTokens.ts` |
| Unclear phone action | One guidance model drives auto-tab, required-tab highlight, and inactive waiting state | `PortraitControllerView.tsx`, `styles.css` |
| Passive stats absent | TV projection calculates resting effective stats from exact equipped instances and suppressions | `roomServer.ts`, shared types, TV components |
| Premature encounter | Clean startup and final-arrival boundaries receive explicit regression coverage; animation remains read-only | encounter lifecycle and movement tests |
| Missing Salvage | Exact authored reward is applied once and no longer overwritten by an accidental follow-up draw | `roomServer.ts`, lifecycle regression |
| Co-op encounter loop | Successful resolution never re-enters `sector` merely because deck inventory remains | `roomServer.ts`, engine/lifecycle tests |

## Effective stat rule

Displayed resting stats use the existing authoritative breakdown:

`base + permanent upgrades + active equipped passive bonuses + companion/status sources = final`

Exact equipped instances are used. Unequipped items do not contribute. Active suppressions remove the matching instance. Context-only encounter modifiers remain separate and no client arithmetic grants a gameplay bonus.

## Player/name boundaries

- Standard co-op supports configured counts 1–6 (the multiplayer picker presents 2–6; solo configures one).
- Nemesis retains its four-player cap.
- Names are trimmed and validated as 1–8 Unicode code points.
- New invalid submissions are rejected with `Name must be 1-8 characters.`
- Legacy longer names are accepted by legacy/current save parsing and remain safely constrained by host layout.

## Browser QA

Reviewed locations:

- `reports/host-ui-qa/live-play-after/` — 47 host captures across 24 deterministic states at 1920x1080 and 1366x768.
- `reports/ui/live-play-defects/after/` — six-seat lobby, seventh rejection, clean startup, phone guidance, and the focused phone battle states.
- `reports/ui/equipment-phone/` — equipped bonus and charge presentation.
- `reports/ui/live-play-fixes/equipment-390/` — final 390×844 player-card, equipped-Gear, and charge-meter captures.
- `reports/host-ui-qa/live-play-fixes/` — the 47-state host rerun used for the right-rail, full-screen shop/battle, and slower movement corrective iteration.

The corrective visual iteration addressed the six-row lobby and battle-shell compression. Final review found no horizontal overflow, console errors, duplicate battle result, private-choice leak, or action overlap.

## Four critique seats

- New player: player capacity, required phone action, route progression, encounter type, and final result are explicit.
- Optimizer: the server rejects a seventh active seat and invalid names; movement animation cannot trigger arrivals; rewards and encounter completion are idempotent.
- Family/casual: TV pacing is slower but bounded, six names fit at the smaller TV target, and the phone presents one current instruction.
- Rules lawyer: capacity, name length, route, stat source, reward owner, and encounter count are enforced/projected by the server rather than authored by a client.

## Remaining limitations

- The QA fixture demonstrates deterministic mechanics and is not a substitute for a human six-player endurance session.
- Animation durations are calibrated browser evidence, not living-room usability playtest evidence; future tuning should retain the central tokens.
- No new authored multi-encounter destination was introduced solely for QA; existing queue/replay tests protect authored sequencing while the new regression protects the single-encounter case.

## Verification

- `npm.cmd run validate:content` — pass (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions).
- `npm.cmd run typecheck` — pass.
- `npm.cmd run test:engine` — pass: 727 tests.
- `npm.cmd run test:integration` — pass: 264 tests.
- `npm.cmd run test:client` — pass: 294 tests.
- `npm.cmd run test` — pass: 1,285 tests across 119 files.
- `npm.cmd run audit:assets` — pass: 418/418 present, zero invalid/placeholders/release blockers.
- `npm.cmd run build` — pass.
- Browser QA — pass at 390x844, 1366x768, and 1920x1080; no overflow or console errors in captured runs.
- `git diff --check` and `git diff --cached --check` — pass; nothing is staged.

The client suite emits expected fallback-art diagnostics from tests that deliberately supply missing art paths; the asset audit independently confirms the canonical asset set is complete.

## Scope

No Heat mechanic was restored. Save version remains 2 and v0–v2 imports are unchanged. The unrelated pre-existing `scripts/validate-six-scenario-e2e.ts` edit was neither modified nor included in this work; its preserved SHA-256 is `13AB4FB8F653E486BFFA34DC23CB2988D65A1761966754B7F1F7643180847747`.
