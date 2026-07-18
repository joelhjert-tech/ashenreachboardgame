# Broken Seal Scenario Alignment

## Authoritative mapping

| Responsibility | Broken Seal implementation |
|---|---|
| Preparation resource | `sealIntegrity`, starting at 8 solo and 6 multiplayer |
| Preparation objectives | Clear a Blue threat or complete a Contract; server grants capped Seal Integrity with a unique source event |
| Confrontation unlock | Active eligible seat at `center_cinder_gate`, action phase, and 4+ Seal Integrity, an Artifact, or 3 completed Contracts |
| Confrontation progress | `restorationMarks`, replaced on each confrontation attempt and earned only by its three final checks |
| Victory condition | At least 2 restoration marks in one center-tile final confrontation |
| Victory owner | Canonical `SCENARIO_VICTORY_ACHIEVED` sourced from the resolved confrontation; shared victory with winning seat recorded |
| Loss condition | Existing escalation/collapse handling; no new loss path introduced |
| Ambient Wounds | Failed confrontation checks use typed Wounds and the existing prevention/recall/result pipeline |

Side objectives never write `restorationMarks`, never mark the confrontation completed, and never emit scenario victory.

## Sheet/runtime alignment

| Authored promise | Previous runtime | Phase 1 runtime | Projection / test |
|---|---|---|---|
| Seal pressure changes over play | Stored in shared `scenarioProgress` | Seal Integrity is preparation state and changes at operative turn start | Separate Preparation display and ambient tests |
| Blue threat restores the ward | Advanced the same restoration counter used for victory | Restores capped Seal Integrity only | Objective-trigger tests prove no final progress |
| Contract restores the ward | Could complete the scenario through the shared counter | Restores capped Seal Integrity only | Completion lifecycle remains canonical; no side victory |
| Finale requires 4+ seals, Artifact, or 3 Contracts | Gate existed, but old progress could bypass it | Gate reads preparation and cannot be bypassed by side progress | Locked/unlocked tests |
| Finale occurs at the Core | Board action already used Cinder Gate | Canonical center sector is validated for every scenario | Outside-center rejection and center-art tests |
| Pass 2 of 3 checks in one engagement | Shared progress accumulated across attempts and side play | Attempt-local `restorationMarks` replace prior attempt progress | Failure/success/victory tests |
| Failed final checks cause Wounds | Typed Wounds existed | Same typed Wound resolver with normal prevention and recall | Wound and confrontation regressions |
| Scenario art confirms selection | Art was shown in scenario panels only | Same canonical art replaces center tile presentation | Broken Seal/alternate/fallback art tests |

## Descriptive-only promises still outstanding

These sheet lines remain authored design promises but are not silently claimed as Phase 1 mechanics:

- Paying 2 Salvage at a clear shrine to restore Seal Integrity.
- Spending an Artifact charge to restore 2 Seal Integrity.
- Specific shrine-boon setup placement.
- Second-collapse group Scar resolution beyond the current ambient rule implementation.
- The authored scenario rewards/boons as post-game unlock systems.

They require focused typed payment, exact-instance charge, setup-token, group-consequence, or campaign-reward work. Current projections continue to label them as scenario information rather than reporting a false resolved mutation.

## Center-tile presentation

`center_cinder_gate` remains the authoritative sector and the sole final-confrontation space. Broken Seal confirmation supplies `/assets/scenarios/broken-seal.png`; the TV swaps only the image layer. Connections, operative markers, Threat overlays, challenge indicators, movement validation, and sector identity are unchanged. Missing art restores the canonical map-tile image without blocking play. Phone and TV receive the same selected scenario ID, and reconnect merely reprojects current state.

## Spend and replay behavior

The shared preparation-spend action consumes an exact server-authored amount, rejects insufficient resources, and rejects duplicate source IDs. Broken Seal does not currently describe its final gate as consuming Seal Integrity, so entry does not spend it. Preparation spend never produces restoration marks unless a future authored action explicitly dispatches a separate confrontation-progress action in a valid final confrontation.

## Four-seat critique

- New player: Preparation and Final Confrontation are visibly distinct; the center art makes the selected scenario and final location obvious.
- Optimizer: side objectives cannot shortcut victory, attempt progress cannot be banked between finales, and source IDs prevent replayed gains or wins.
- Family player: normal play still prepares the finale; the only new presentation is a concise three-part status and center marker.
- Rules lawyer: center location, gate, attempt-local progress, `>= 2` victory, source ownership, and retry behavior are explicit. Reconnect is projection, not migration or reset.

## Files and containment

The implementation changes shared scenario state/actions/reducer/projection foundations, Broken Seal ambient/gate/confrontation handling and sheet wording, focused phone/TV presentation, snapshot normalization, and focused tests. No item mechanic, mission lifecycle, completed-contract ownership, map topology, other scenario mechanic, Heat migration, or network privacy boundary was rewritten.

## Verification

- `npm.cmd run validate:content`: passed (17 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, and 30 afflictions).
- `npm.cmd run typecheck`: passed.
- Focused ownership, scenario, snapshot, server, phone, TV, reconnect, and center-art tests: passed.
- `npm.cmd run test:engine`: 454 passed.
- `npm.cmd run test:client`: 252 passed.
- `npm.cmd run test`: 932 passed across 87 files.
- `npm.cmd run audit:assets`: 404/404 present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.

The pre-existing non-failing missing-map-art diagnostics remain unchanged. The focused missing-scenario-art test intentionally emits the approved fallback diagnostic and completes without failure.
