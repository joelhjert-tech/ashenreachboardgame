# Remaining Heat-only implementation batches

These batches are recommendations only. Each is a separate commit and approval boundary. Counts reconcile to 36 primary IDs.

## Batch 1 — Clause removal (4 IDs, ready)

IDs: `bell-mask-pilgrim`, `cracked-censer-novice`, `glasswing-midge-cloud`, `roadside-bone-oracle`.

Delete only the named Heat branch and correct affected copy/tags. Enemy-loss cleanup and hazard continuation remain unchanged. Entry gate: approval that “enemy remains” or “failed omen grants nothing” is a complete result. Tests assert exact ID, branch omission, unchanged rewards/severity/decks, no false delta, reconnect/cleanup once, approval removal, and 34 remaining effect IDs. Rollback is one content/test/manifest commit revert.

**Recommended Phase 1X:** this batch. It uses existing mechanics, adds severity 0, introduces no prompt/state/resource mutation, and is the safest correction.

## Batch 2 — Existing Salvage effects (7 IDs, approval required)

IDs: `compact-equipment-requisition`, `escalation-marrow-surgery-debt`, `crown-bell-baron`, `latchspire-raider`, `marrow-tax-auditors`, `pale-contract-collector`, `soot-stained-cutpurse`.

Shared dependencies: existing `gain_salvage 1`, automatic `lose_salvage 1`, actual-delta presentation, and `COMPLETE_CONTRACT`. Tests cover zero/one/multiple Salvage, no affordability gate, Contract ordering, enemy persistence, no shopTransaction/Ledger/relic interaction, reconnect, and one mutation. Exit gate: economy model approved and no positive loop. Rollback is one economy-content commit.

## Batch 3A — Bounded one-Wound/healing conversions (9 IDs, balance approval required)

IDs: `ash-cinder-runt`, `choir-static-burst`, `cinder-gate-backlash`, `grave-silt-press`, `lantern-moth-swarm`, `mirror-mite-bloom`, `mirror-rot-interference`, `relay-pilgrim-riot`, `webglass-snarefield`.

Shared dependencies: existing `take_wound`/`heal_wound`, prevention, actual delta, recall, and cleanup. Tests cover zero-Wound healing, prevention, threshold recall, both Lantern branches, replay, all modes, and exact order. Exit gate: cumulative outer-route Wound exposure approved. Rollback is one Wound-family commit.

## Batch 3B — Severe Wound conversion (1 ID, isolated approval)

ID: `ashen-doppelganger`.

Implement `take_wound 2` only after severity-4/three-trophy balance approval. Tests cover partial prevention under current rules, threshold crossing, Scar/recall, result delta 2 or actual prevented amount, and reconnect. Isolated commit permits independent rollback.

## Batch 4 — Tests and temporary modifiers (4 IDs, infrastructure required)

IDs: `anomaly-bellrain-inversion`, `glass-chime-swarm`, `siren-relay-echo`, `spindle-static-squall`.

Add one server-authored anomaly Signal 7 check and one narrow turn-expiring stat-modifier structure. No generic prose evaluator. Tests cover assistance, item modifiers, rerolls, same-source dedupe, expiry only at turn end, reconnect, wrong context, both Siren branches, and private/public presentation. Commit A adds typed infrastructure and synthetic tests; Commit B migrates all four content IDs. Rollback content first, then unused infrastructure.

## Batch 5 — Shared tracks (4 IDs, high-risk approval)

IDs: `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-saltwind-lockdown`, `gateblind-pulse`.

Use existing one-step Loss Pressure/Global Escalation reducers. Tests cover maximum−1, maximum, repeat draw, defeat once, player-count invariance, Rivalry non-targetability, reconnect, and track separation. One commit is acceptable because all four share the same public-track boundary; rollback restores all four no-ops together.

## Batch 6 — Equipped Equipment loss (2 IDs, choice infrastructure required)

IDs: `relay-husk`, `signal-rotted-engineer`.

Add a persisted owner-only exact-instance choice restricted to equipped normal utility/weapon items. Artifacts and carried items are excluded; no candidate auto-continues. Tests cover wrong seat/version, tie choice, no candidate, sale/loss races, reconnect, privacy, removal once, and cleanup once. Commit A infrastructure, Commit B both content records.

## Batch 7 — Scar (1 ID, persistent high-risk approval)

ID: `hymn-scarred-zealot`.

Use existing `scar-wound-4` Bell-Deafened; duplicate fallback is `take_wound 1`. Tests cover new/duplicate Scar, prevention policy, threshold, relief/privacy, reconnect, note reward preservation, and enemy cleanup. One isolated commit and rollback.

## Batch 8 — Bespoke and movement outcomes (4 IDs, separate designs)

IDs: `false-route-procession`, `memory-tax-gate`, `crownless-advocate`, `saltflat-bone-reader`.

- False Route reuses one-step outward forced displacement with one-Wound no-route fallback.
- Memory Tax adds a private note-discard choice with one-Wound no-note fallback.
- Crownless Advocate adds a once/round required-encounter-payment discount only.
- Saltflat Bone-Reader adds once/round adjacent public-sector information.

These do not share enough state for one implementation commit. Land four isolated commits after separate approval, each with authenticated owner, reconnect, replay, privacy, impossible-state, projection, and cleanup tests. Roll back independently.

## Global entry and exit gates

Before each batch: reread its approved decision block; verify exact current branches and counts; stop on contradiction. After each batch: remove only migrated approvals, run content/type/focused/engine/client/full/build/assets/diff checks, prove no unrelated IDs changed, and report new exact population. Do not combine legacy parser, archival metadata, Mirror, projection, or discriminator cleanup with content migration.
