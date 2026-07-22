# P17 Named Player Rules Implementation

## Architecture

P17 centralizes exact name matching, profiles, character eligibility, required-Follower identity, and CW opposition values in `src/game/rules/namedPlayerRules.ts`. Existing Kebab substring matching was retired. The room server reconciles setup and inventory at construction, join, selection, Ready, Start, and after authoritative actions. Corrections append a `NAMED_PLAYER_RULES_RECONCILED` diagnostic event.

The canonical model contains `displayName` only. There is no nickname field or rename command. Future nickname/rename work can call the existing resolver and reconciler.

## Rules implemented

- CW: actor-specific `Marked adversary +1` on Enemy Threat opposition and explicitly enemy-tagged fixed tests.
- Kebab: automatic Popelord selection, earliest-seat reservation, conflict invalidation, duplicate-name Start blocker, and forged-command rejection.
- Annette/Nenne: exactly one deterministic Fandiablos per qualifying player, owner-only bound presentation, load/reconnect repair, duplicate prevention, and removal/economy protection.
- Joel: owner-private MASTER ALPHA option and server selection authority; non-Joel payload filtering and forged-command rejection.

No gameplay probability, reward, character mechanic, item effect, save version, or public/private boundary was intentionally changed.

## Security limitation

The Joel entitlement is deliberately spoofable because it is based on entered display name. The check is isolated so authenticated developer authorization can replace it later without changing selection UI or character authority.

## Four-seat critique

- New player: forced Popelord and bound Fandiablos use direct explanations; CW's modifier appears inside arithmetic.
- Optimizer: Fandiablos removal is rejected before value can be awarded; CW adds once; stale QA and Popelord selections remain server-invalid.
- Family/casual: no acknowledgement prompt is added for automatic rules, keeping setup short.
- Rules lawyer: NFKC exact matching, actor ownership, deterministic duplicate Kebab behavior, narrow Fandiablos uniqueness exception, and reconnect restoration are explicit.

## Verification record

- Content validation: passed.
- Typecheck: passed.
- Focused named-player and QA-fixture tests: 44/44 passed.
- Engine: 771/771 passed.
- Rules-only: 72/72 passed.
- Integration: 374/374 passed.
- Client: 421/421 passed.
- Aggregate: 1,566/1,566 passed in 392.62 seconds.
- Asset audit: 435/435 present.
- Production build: passed.
- Diff checks: passed.

Browser setup QA captured 12 phone images across all required phone widths with zero horizontal overflow. The remaining requested captures and recordings are explicitly listed as outstanding in the screenshot index after the known Windows QA process-tree issue interrupted the longer capture. The implementation and authoritative behavior are covered by automated tests; the missing media is a QA-evidence gap, not an unreported pass.

No commit or push was made.
