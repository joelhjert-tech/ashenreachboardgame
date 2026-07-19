# Mission Reward and Artifact Implementation

## Outcome

Ashen Reach now treats Mission completion as three distinct authoritative operations:

1. Resolve the ordered immediate typed reward.
2. Archive an auditable Completed Mission credential.
3. Later reserve and spend exactly three unspent credentials only when a private Artifact selection is confirmed.

Completing the third Mission never grants an Artifact automatically.

## Schema changes

`MissionReward` is now:

```ts
{
  effects: GameEffect[];
  displayText?: string;
  completionText?: string;
}
```

Array order is the only reward effect order. Descriptive completion prose is not executable state.

`CompletedMissionRecord` stores:

- `missionId`
- `completedByPlayerId`
- `completedAtSequence`
- `rewardGranted`
- `spent`
- `spentFor`

The existing `completedContracts` ID list remains the compatibility mirror of currently unspent credentials for v0–v2 imports and older projections. Canonical history is retained in `completedMissionRecords`; spent records are never deleted.

## Completion transaction

The reducer now verifies the active Mission and objective, rejects a duplicate record, resolves every immediate effect in authored order against pure reducer state, then clears the active Mission and writes the completion record. Only after reducer success does the room server queue the private deterministic replacement selection.

Current cards have no completion payments, deliveries, or choices. Those objective schemas remain unsupported rather than being simulated with implicit consumption.

## Migrated display-only notes

Sixteen Mission `gain_note` effects were converted to `completionText`. They no longer append prose to private gameplay notes. Canonical gate permissions authored by board-space rules were untouched.

## Direct Artifact bypasses fixed

Ten ordinary Missions hid direct Artifact rewards behind `gain_gear`. Each now grants a thematically related normal Equipment item:

| Mission | Removed Artifact | Normal Equipment reward |
|---|---|---|
| `cartel-quiet-route` | Veil Hook | Black Route Fuse |
| `choir-spindle-harmonics` | Choir Static Censer | Signal Lantern |
| `clan-salvage-tithe` | Coffin Rig | Salvage Guard Mask |
| `compact-cleanse-ledger` | Marshal Seal | Oath Chain |
| `compact-ember-courier` | Marshal Seal | Signal Lantern |
| `contract-lantern-run` | Veil Hook | Black Route Fuse |
| `dominion-warbell-recovery` | Red March Warbell | Red March Bell |
| `umbral-blackstar-sample` | Blackstar Ampoule | Cinder-Stim Ampoule |
| `umbral-bloom-reaping-right` | Coffin Rig | Scrap Drone |
| `umbral-shrine-confession` | Grave Lens | Field Lens |

No Artifact count, normal Equipment count, shop rule, or Artifact definition changed.

## Artifact requisition lifecycle

- The dealer validates at least three unspent IDs.
- It generates up to two eligible Artifact candidates before any spend.
- The persisted private stock reveal now includes an opaque requisition ID and the exact three reserved Mission IDs.
- Reconnect restores the same reveal, candidates, and reservation.
- Re-requesting while a requisition exists is rejected, preventing candidate rerolls.
- Confirmation must match the reservation, exact IDs, owner reveal, and offered Artifact.
- The Artifact is granted and the three records are marked `spentFor: "artifact-requisition"` in the same reducer action.
- Cancel/leave clears the reveal without consuming Missions.
- Empty stock blocks before reservation or spend.

The rejected candidate returns to the immutable eligibility pool; future dealer stock is recalculated from canonical ownership.

## UI and privacy

- Phone Inventory says “Completed Missions,” shows the `X / 3` milestone, explicitly says no Artifact is automatic, and exposes spent history in a collapsed “Requisitioned Missions” section.
- Artifact choices stay owner-private.
- TV shows `RELIC REQUISITION IN PROGRESS` while the phone choice is pending, without candidate identities.
- The selected Artifact becomes public only after authoritative confirmation.
- A browser-policy guard prevents turn vibration from producing a console error before the user has interacted with the page.

## Compatibility

- Save version remains 2.
- Legacy v0–v2 snapshots remain accepted.
- Legacy unspent ID lists are upgraded to auditable records when they are first spent.
- Heat fields/effects were not introduced.
- Mission replacement privacy and deterministic option generation remain unchanged.

## Admin and Simulation status

The Admin Library reads the normalized reward object and ordered raw effects. Mission cards with typed rewards now open in the detached Simulation Lab, where the canonical effect resolver previews their ordered immediate rewards and reports live-state/registry isolation. A first-class synthetic “grant completed Mission without printed reward” command and full Mission transaction simulation are not present because no current authored effect or Mission schema can create that state. They remain explicit unsupported schemas rather than UI-only behavior.

## Four-seat critique

- **New player:** the immediate reward, completed credential, and dealer milestone are now named separately. The third completion no longer implies an automatic Artifact.
- **Optimizer:** candidate reroll by repeated dealer reveal is closed; exact reserved IDs and spent history prevent replay and double-spend.
- **Family/casual:** the main ledger remains a simple count with one milestone line; historical detail is collapsed.
- **Rules lawyer:** reward order is array order, completion order is `completedAtSequence`, reservation does not spend, confirmation grants and spends atomically, and private candidates never enter TV projection.

## Verification

- `npm.cmd run validate:content`: pass; 36 Missions and all canonical catalogs validated.
- `npm.cmd run typecheck`: pass.
- Focused Mission schema, reducer, persistence, inventory, and shop-projection tests: pass.
- `npm.cmd run test:engine`: pass, 69 files / 756 tests.
- `npm.cmd run test:rules`: pass, 11 files / 58 tests.
- `npm.cmd run test:integration`: pass on the required uncontended rerun, 36 files / 321 tests. The first run had one transient API `ECONNRESET`; the affected API file then passed (26/26) and the full integration rerun passed without assertion changes.
- `npm.cmd run test:client`: pass, 41 files / 369 tests.
- `npm.cmd run test`: aggregate wrapper exceeded its execution window without producing a final result; every constituent suite was run independently as required.
- `npm.cmd run audit:assets`: pass, 435/435 assets present.
- `npm.cmd run build`: pass.
- Browser QA: pass at phone 390x844 and TV 1920x1080, 1440x900, 1366x768, and 1280x720; no privacy leak, page overflow, or final-pass console error.
- Final focused Mission/Simulation tests: pass, 2 files / 36 tests, including the detached normalized Mission reward preview and deterministic progress/ready fixture boundary.
- `git diff --check` and `git diff --cached --check`: pass (line-ending notices only).
- QA servers: stopped; ports 5173 and 8080 closed.

No commit or push was made.
