# Item-Effect Post-Audit Hardening

Status: implemented and verified pending final commit.

Source audit: `reports/item-effect-system-final-audit.md` at `bb925f6`.

## Scope and outcome

This pass clears the nine non-design findings from the final item-effect audit. It corrects one obsolete Ashen Route Compass acquisition note and adds direct authoritative regression coverage for the eight implemented items that lacked it. No item balance, item mechanic, movement rule, charged state transition, or deferred Equipment design changed.

Revised readiness:

- RC-ready or hardening-cleared: 44 items (the prior 35 RC-ready items, the corrected Compass, and the eight newly covered implemented items).
- Wording polish only: 0 items.
- Implemented but missing direct regression coverage: 0 items.
- Deferred pending explicit Equipment design decisions: 16 items.

## Ashen Route Compass correction

Changed the Artifact card's acquisition `gain_note` and the matching legacy generic-use result note. Both changes are player-facing copy only.

Previous inaccurate note:

> Compass charge: spend to soften movement or anomaly failures.

Corrected note:

> Ashen Route Compass acquired. Spend 1 charge after rolling movement to adjust the exact movement distance by −1 or +1.

The charged Artifact remains 2/2, costs one charge per accepted movement adjustment, changes the exact required movement distance by −1 or +1, and never rerolls, affects anomaly failure, bypasses gates, or automatically recharges. The phone inventory regression fixture now uses the canonical charged model and proves that the rendered rule and charge count are accurate while the obsolete anomaly, reroll, and soften language is absent.

## Eight direct item regressions

| Stable item ID | Direct authoritative behavior now covered |
|---|---|
| `artifact-cinder-suture-kit` | Artifact draw grants the named normal Equipment, leaves it carried rather than auto-equipped, consumes the reward card once, and survives state serialization. |
| `artifact-ember-burden-idol` | Artifact draw grants exactly one Trophy plus its authored note, grants no owned gear, and consumes the reward card once. |
| `artifact-last-breath-rivet` | Artifact draw grants the Rivet as carried Equipment; its Grit bonus is absent while carried and applies only after authoritative equip. |
| `artifact-mira-rift-twin` | Rumi receives Mira plus the exact Signal and Guile bonuses; a non-Rumi character receives neither follower nor bonus. |
| `artifact-oath-chain-ledger` | Artifact draw grants the Ledger without mutating the active Contract or completed-Contract ledger. |
| `artifact-saintwire-splint` | Artifact draw grants the Splint as carried Equipment and does not auto-equip it. |
| `artifact-throne-crown-fragment` | Artifact draw advances seal restoration by exactly one, preserves unrelated scenario progress, and grants the authored note. |
| `artifact-zoey-thorn-violet` | With Mira already present, Rumi gains Zoey and the exact completed-triad Grit, Signal, and Guile totals. |

The focused engine suite identifies every item by stable ID and exercises the real server-side `draw_artifact` resolution path followed by authoritative resolution application. It also checks card consumption, preventing a repeated reward from the same draw. Tests use serialization or equipped-state assertions where those are part of the item’s distinctive rule.

## Test quality and remaining gaps

All eight audit-listed implemented items now have a direct item-level regression. No item remains in the audit’s “missing direct test” category. Broad schema or inventory rendering assertions were not counted as substitutes.

The 16 deferred Equipment items remain intentionally untouched. Tests that acquire Cinder Suture Kit, Last-Breath Rivet, or Saintwire Splint verify only the already-implemented Artifact reward behavior and carried/equipped boundary; they do not approve or implement the deferred Equipment effects.

## Files and containment

- `content/cards/artifacts/artifact-ashen-route-compass.json`: corrected acquisition note only.
- `src/server/roomServer.ts`: corrected the Compass-only generic-use result note; no request validation or movement behavior changed.
- `src/game/engine/__tests__/itemEffectPostAuditHardening.test.ts`: direct authoritative regression coverage for the eight audited items plus Compass acquisition/projection truthfulness.
- `src/client/phone/__tests__/PhoneInventoryPanel.test.tsx`: corrected the Compass projection fixture and added rendered wording/charge coverage.
- `reports/item-effect-post-audit-hardening.md`: this implementation and verification record.

No production runtime, schema, UI layout, validation, movement, mission, tile-challenge, tier, or deferred Equipment file changed. Existing unrelated tracked register WIP and untracked reports remain outside this pass.

## Verification

Final command results:

- Focused item engine tests: 10/10 passed.
- Focused Compass phone file: 37/37 passed.
- Content validation: passed (17 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, 30 afflictions).
- Typecheck: passed.
- Engine suite: passed, including the new 10-test item file.
- Client suite: 248/248 passed.
- Full suite: 839/839 passed across 78 files.
- Asset audit: passed (404/404 present; zero missing, invalid, placeholder, release-blocking, or tier-separation findings).
- Production build: passed.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
