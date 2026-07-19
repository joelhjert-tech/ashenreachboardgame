# Mission Reward and Artifact Acquisition Audit

## Executive answer

Ashen Reach currently has the intended three-stage concept, but only two stages are represented cleanly in runtime state:

1. A Mission has one executable `reward` effect.
2. Its stable ID is appended to `character.completedContracts`.
3. Three IDs may be removed at a relic-dealer shop reveal when the owner confirms one of up to two private Artifact choices.

The immediate reward and completed credential are distinct, but completion order is reversed: the active Mission is archived before its reward resolver runs. Completed credentials are plain strings and are deleted when spent, so reward provenance and spent history are lost.

## Direct answers

### What does `gainNote` currently do?

The authored spelling is the typed effect `gain_note`. `applyEffectToPlayer` appends its `text` to `player.private.notes`; it is executable private gameplay state, not a display-only field. `summarizeEffect` also presents it as “note added.”

Sixteen of 36 Missions use `gain_note`. Every one contains descriptive completion prose. None equals or is read as the canonical route permissions `guardian-span-clearance` or `gate-of-cinders-breached`, and no resolver searches for any of the 16 Mission strings. These 16 effects therefore mutate gameplay state without providing a mechanic. They should become `completionText`/`displayText`, not executable effects.

### What does `sequence` currently represent?

`GameState.sequence` is the deterministic global reducer/event-log order. It is not authored reward order. A reward `sequence` effect is a separate effect container whose array order defines effect execution order. The same word therefore describes two different concepts. Mission completion records do not currently store either value.

The normalized system should use:

- reward `effects[]` array order for authored effect order;
- `completedAtSequence` for deterministic Mission completion order;
- no ambiguous Mission-level `sequence` field.

### Are rewards applied before or after archive?

After archive. `COMPLETE_CONTRACT` first clears `activeContract` and appends the ID to `completedContracts`, then passes that already-archived state to `applyEffectToState`.

### Can a partially failed reward mark the Mission complete?

Yes in structure. There is no Mission-scoped transaction result or rollback boundary. Known effect variants generally clamp, no-op, or open a prompt rather than throw, but an unsupported or unexpectedly rejected chain has no explicit atomic Mission policy because archive occurs first.

### Can a Mission complete twice?

The normal action path prevents immediate replay because the active Mission is cleared, and accepting an ID already in `completedContracts` is rejected. The protection is ID-based and lacks an immutable completion record or reward-granted marker. Spent IDs are removed, so historical proof is lost and the same Mission could become eligible again if it returned to the offer pool.

### When is the next Mission drawn?

The room server queues a deterministic private replacement selection after `COMPLETE_CONTRACT` succeeds. Up to three currently unowned/uncompleted IDs are offered; the picker becomes authoritative after the completion resolution is cleared. Selection attaches one new active Mission once. An empty pool records an unavailable event and continues without fabricating a Mission.

### How are three completed Missions exchanged?

At the `trade-missions-for-artifact` shop service, the server generates up to two Artifact stock entries and stores the reveal privately. Nothing is spent at reveal time. On purchase confirmation, the server takes the first three `completedContracts` IDs, validates an offered Artifact and grants it in `SHOP_PURCHASE_RESOLVED`.

### Can ordinary Missions directly grant Artifacts?

Yes, through an indirect schema path. None uses a `gain_artifact` effect, but ten ordinary Missions use generic `gain_gear` with a canonical gear ID whose tier is `artifact`: `cartel-quiet-route`, `choir-spindle-harmonics`, `clan-salvage-tithe`, `compact-cleanse-ledger`, `compact-ember-courier`, `contract-lantern-run`, `dominion-warbell-recovery`, `umbral-blackstar-sample`, `umbral-bloom-reaping-right`, and `umbral-shrine-confession`. This bypasses the intended three-Mission dealer milestone and is a confirmed content defect.

### Can three Missions be consumed without an Artifact?

The current dealer blocks when no Artifact stock exists and does not spend at reveal. Confirmation validates the exact offered Artifact before the reducer removes the IDs and grants the gear in one reducer action. This is substantially safe. It lacks an explicit reservation identity tied to exact completion records, however, and uses deleted strings rather than auditable spent records.

### Are spent Mission records retained?

No. The three stable IDs are removed from `completedContracts`. No spent purpose, completion sequence, owner, or reward-granted history survives.

## Canonical content inventory

| Measure | Current value |
|---|---:|
| Mission cards | 36 |
| `defeatCount` objectives | 11 |
| `spaceTextResolved` objectives | 19 |
| `multiStopRoute` objectives | 3 |
| `shopTransaction` objectives | 3 |
| Missions with descriptive `gain_note` | 16 |
| `gain_gear` effects | 12 |
| `gain_salvage` effects | 8 |
| `gain_trophy` effects | 5 |
| `heal_wound` effects | 2 |
| `gain_follower` effects | 2 |
| Direct Mission Artifact effects by effect name | 0 |
| Indirect direct-Artifact rewards through `gain_gear` | 10 |

No Mission defines a failure/loss branch or a completion cost. All current objective families complete automatically from typed progress events; shop objectives count authoritative shop transactions and do not merely test whether a player could pay.

## `gain_note` migration inventory

The following IDs use descriptive note effects and require migration to display/completion text while preserving any other typed effects:

- `break-the-raider-chain`
- `cartel-black-route-exchange`
- `cartel-crossing-thread`
- `cartel-crosswind-ledger`
- `choir-quietus`
- `clan-salvage-tithe`
- `cleanse-ember-sanctum`
- `compact-three-lantern-circuit`
- `contract-beacon`
- `contract-lantern-run`
- `dominion-foundry-proof-marks`
- `gatefire-vigil`
- `hunt-breachborn`
- `map-broken-paths`
- `pilgrim-convoy`
- `warden-span-vigil`

The route-gate notes are authored in board-space effects, not Mission rewards, and must remain typed permissions.

## Runtime lifecycle inventory

| Stage | Authority | Current status |
|---|---|---|
| Progress | Server reducer, typed actions | Functional and replay-protected by active Mission progress |
| Eligibility | `isContractObjectiveComplete` | Functional |
| Completion cost | No current Mission schema | Not applicable to current cards; no generalized cost field |
| Immediate reward | `applyEffectToState` | Typed, but invoked after archive |
| Completed credential | `character.completedContracts: string[]` | Functional but incomplete audit/history model |
| Replacement | `pendingMissionSelection` | Deterministic, owner-private, reconnect-safe |
| Dealer reveal | persisted `shopStockReveals` | Owner-private, up to two eligible Artifacts |
| Dealer confirmation | `SHOP_PURCHASE_RESOLVED` | Server-authoritative and atomic at confirmation |
| Spent history | none | Missing |
| TV projection | completed count/public shop status | Does not expose private choices |
| Phone projection | IDs and owner-private replacement/options | Functional, but lacks spent history and record provenance |

## Artifact eligibility and deck handling

The dealer excludes Artifacts already held or equipped by any operative, excludes normal gear by requiring `tier === "artifact"`, excludes QA content unless the operative is QA-enabled, and uses the canonical relic-dealer stock filter. The rejected candidate is removed from the current reveal; the underlying content catalog is immutable rather than a physical mutable deck, so future eligibility is recalculated from ownership. This is the current authoritative “return” policy.

Missing explicit filters are scenario-removal and mode-incompatibility metadata; neither is represented in the current Artifact schema. These cannot be enforced until such canonical metadata exists and should not be invented in this pass.

## Privacy and modes

- Single-player and co-op credentials are personal per character.
- There is no pooling or transfer path.
- Replacement Mission options are owner-private; TV receives owner/status only.
- Artifact stock is owner-private; TV receives public shop progress/results only.
- Rivalry objectives remain in the owner phone projection. Candidate Artifact IDs are not projected to other phones or TV.

## Save, reconnect, Admin, and Simulation

- Save version remains 2. `completedContracts`, `pendingMissionSelection`, and shop reveals serialize through the v2 game state.
- Legacy v0–v2 normalization accepts absent optional Mission fields.
- Admin Library shows a flattened reward string and does not expose objective event family, ordered typed effects, completion behavior, or direct-Artifact classification.
- Simulation Lab can execute canonical card effects, but has no first-class Mission completion transaction trace or completed-credential history.

## Required implementation decisions

1. Normalize each Mission reward to `{ effects: GameEffect[]; displayText?; completionText? }`.
2. Migrate the 16 descriptive note effects out of executable state.
3. Apply reward effects transactionally before archiving.
4. Retain immutable `CompletedMissionRecord` history and derive unspent eligibility from it.
5. Preserve the legacy string list as an import compatibility source, not the new audit authority.
6. Reserve exact unspent completion records when the private dealer reveal is created, and mark them spent only after a valid Artifact is granted.
7. Keep the existing private replacement picker and never auto-grant an Artifact on the third completion.
8. Keep direct ordinary-Mission Artifact rewards forbidden by validation.
