# Admin Card Simulation Lab

## Status

The Admin Card Simulation Lab is a development-only, host-admin tool. It runs canonical Ashen Reach encounter logic against detached state and never writes to the live room. The implementation remains uncommitted and unpushed.

The existing commits `da7afa3` (`fix: make host images adaptive`) and `cd3bcdd` (`feat: rebuild host shop`) were not amended, rebased, or folded into this work.

## Supported scope

The lab supports saved canonical cards and schema-valid unsaved drafts for executable Enemy, Hazard, Anomaly, encounter/event, tile-challenge, scenario-event, Contract-event, shop-event, and escalation data that reaches the existing Threat/check resolvers. Equipment, forced-destination, suppression, memory-tax, encounter-choice, and reroll/equip decisions continue through detached canonical prompts.

Passive content is simulatable only when it enters an existing passive-modifier, triggered-effect, or granted-ability path. Prose-only and bespoke effects show `NO SIMULATABLE EFFECTS` rather than fabricating a result.

The completed Scar pass is now supported in detached simulation. Canonical `gain_scar_choice` effects produce deterministic two-card `choose-scar` prompts; continuation validates the offered stable ID and reports ownership, deck, scoped-usage, on-gain, and third-Scar threshold mutations. Saved and schema-valid unsaved Scar drafts expose their typed Burden and Adaptation rules. Text-only Scar records show `SCAR HAS NO EXECUTABLE EFFECTS`, exhausted pools reject visibly, and retired Heat effects remain invalid.

## Canonical resolver paths

The simulation adapter constructs a detached `GameRoomServer` and invokes the same paths used by live play:

- `GameRoomServer.resolveCombatIntent` for calculated enemy battles.
- `GameRoomServer.resolveCheckIntent` for fixed-difficulty tests.
- `GameRoomServer.resolveContinueResolutionIntent` for canonical completion.
- `reduceGameState` for the initial card draw and prompt continuations.
- Existing effect, reward, penalty, Wound, Scar, Salvage, Equipment, movement, and encounter-cleanup reducers beneath those entry points.

One shared sequencing defect was corrected: an `outcome_summary` may now apply its already-pending effect before automatic completion. This prevents prompt-producing effects such as Memory Tax from being cleared before their canonical effect is applied.

## Isolation contract

`SimulationExecutionContext` owns the cloned state, opaque simulation ID, deterministic seed, initial hash, controlled RNG, detached event sink, and side-effect adapters.

- Broadcasts are captured by the simulation sink and never reach room clients.
- Persistence is disabled and throws if invoked.
- Timers are recorded but never scheduled.
- Registry/content maps are immutable snapshots for the run.
- Gameplay log entries remain detached.
- Live prompts and deterministic live-session state are never reused.
- Active-operative presets copy only host-admin-visible fields. Private mission, Contract, Rivalry, hand, follower-note, and objective data is omitted.

Browser requests contain only card ID, family, expected revision, draft data, operative setup, controlled dice, and outcome mode. The server resolves source locations internally. Unknown fields and path-like request properties are rejected. Drafts validate without being registered or written to disk.

## Detached prompt lifecycle

Detached sessions are stored in memory by host-admin authorization and opaque simulation ID. Each host may retain at most 32 live sessions. Sessions expire after 30 minutes of inactivity and are removed lazily; closing the lab removes that admin's sessions immediately.

Continuations must match the owning admin, simulation, current prompt ID, and a canonical offered choice. Foreign, stale, consumed, expired, duplicate, or invalid choices reject. Consumed prompt IDs remain recorded for replay protection. Supported continuation seams include encounter choices, Equipment/equip decisions, forced destinations, suppression, and memory tax.

## Deterministic dice

- **Random** creates a deterministic server seed.
- **Seeded** reuses the provided deterministic seed.
- **Fixed** consumes exact supplied faces through canonical roll calls.

Fixed exhaustion and invalid die faces reject; the adapter never invents a replacement value. Results report requested, consumed, unused, unexpected, and rerolled values and the final seed. Repeating the same seeded request produces the same deterministic result hash.

Forced outcomes are visibly labelled `FORCED BRANCH PREVIEW — Battle calculation bypassed`. They resolve only the authored effect branch and are excluded from batch statistics.

## Batch execution

Batch jobs support 10, 100, 1,000, and bounded custom calculated runs. Every iteration starts from a fresh pristine clone, records the same initial-state hash, and derives its seed from the base seed plus run index. State, decks, prompts, inventory, usage trackers, Wounds, Scars, and Salvage do not leak between iterations.

Jobs run in chunks outside the render loop, return opaque job IDs, support cancellation, and aggregate outcomes, warnings, and errors without retaining thousands of traces. Only one active job is allowed per admin and two globally. Completed summaries expire after 15 minutes.

## Admin Library and UI

Executable cards expose `OPEN SIMULATION LAB`; unsupported cards display a visible reason. The three-column workspace provides:

- saved/draft source selection and revision checks;
- weak, average, strong, existing-character, custom, and detached-active-operative presets;
- canonical Equipment and Artifact selectors;
- random, seeded, and fixed dice controls;
- calculated and explicitly forced branch modes;
- before/after state comparison, ordered effects, authored-text warnings, and detached log;
- prompt continuation, temporary history, rerun, JSON export, and batch controls.

MASTER ALPHA is used only as the browser-QA stress operative. It is not added to live content.

## Release gates

| Gate | Result | Evidence |
|---|---|---|
| 1. Compile and isolation | PASS | Detached context, injected side-effect services, request allow-list, live/registry/log hashes |
| 2. Enemy and check | PASS | Canonical combat/check intents, fixed and seeded dice, totals, rewards, penalties, diff and trace |
| 3. Prompt continuation | PASS | Choice, Equipment, destination, suppression and memory-tax continuation plus stale/replay/expiry checks |
| 4. Draft and Library | PASS | Revision validation, unsaved schema validation, presets, selectors, history, rerun and export |
| 5. Batch mode | PASS | Independent deterministic calculated runs, cancellation and aggregated summaries |
| 6. Responsive closure | PASS | Three independent scroll columns and zero page-level horizontal overflow at all reviewed sizes |

## Isolation evidence

- Live-state hash before and after each focused simulation: equal.
- Registry hash before and after saved and draft simulation: equal.
- Live gameplay-log length before and after: unchanged.
- Broadcast attempts: captured only in the simulation sink; escaped broadcasts: `0`.
- Persistence attempts: `0` in normal runs; explicit persistence test throws; escaped writes: `0`.
- Timer scheduling: disabled; attempts remain detached.
- Detached session lifecycle: created by opaque ID, owner checked, stale/consumed prompts rejected, expiry enforced, close deletes sessions.
- Batch initial hashes: identical for every iteration.
- Batch result storage: aggregate-only; no per-run trace leakage.

## Screenshot index

All captures are QA/report assets under `reports/ui/admin-simulation-lab/`.

| Screenshot | Viewport | Review result |
|---|---:|---|
| `enemy-battle-setup-1920x1080.png` | 1920×1080 | Card, operative, dice and safety boundary clear |
| `resolved-battle-state-diff-1920x1080.png` | 1920×1080 | Totals, diff, trace and isolation evidence readable |
| `event-branch-selection-1920x1080.png` | 1920×1080 | Branch/source controls remain identifiable |
| `generated-choice-prompt-1920x1080.png` | 1920×1080 | Prompt and legal choices reachable without leaving the lab |
| `reward-execution-trace-1440x900.png` | 1440×900 | Reward ordering and state changes readable |
| `failure-loss-effect-trace-1440x900.png` | 1440×900 | Wound/Scar/Salvage loss ordering readable |
| `unsaved-draft-simulation-1440x900.png` | 1440×900 | Draft source unmistakably labelled |
| `long-effect-trace-1280x720.png` | 1280×720 | Independent trace scrolling; no page overflow |
| `validation-warnings-1280x720.png` | 1280×720 | Unsupported/validation feedback remains visible |
| `repeated-simulation-summary-1280x720.png` | 1280×720 | Aggregates fit without rendering per-run traces |

The first browser pass exposed a duplicate React history key after continuing a prompt. History keys now include stable sequence identity, and the affected states were recaptured. The negative-margin action rail also caused the 1280×720 stage to exceed its column; the rail was contained and the final capture reports no horizontal overflow.

Additional Scar owner-control evidence: `scar-adaptation-activation-1440x900.png` shows the canonical owner-controlled Adaptation, resulting +1 calculation, and detached `SCAR_ADAPTATION_ACTIVATED` event.

## Four-seat critique

### New Player

The lab clearly labels simulation-only state, saved versus draft input, calculated versus forced resolution, and the next prompt action. Unsupported cards now fail visibly instead of presenting inert controls. The remaining density is acceptable because this is an admin development tool, not a player surface.

### Optimizer

Fixed dice, reusable seeds, deterministic hashes, before/after diffs, rerun, export, and batch summaries make balance comparisons reproducible. Fresh batch clones and identical initial hashes prevent cumulative-state bias. Batch cancellation and execution caps prevent accidental runaway work.

### Family/Casual Player

Presets and clear primary actions reduce setup effort. Each column scrolls independently, Exit and prompt actions remain reachable, and artwork stays contained. Detailed traces remain intentionally secondary and do not crowd the central result.

### Rules Lawyer

The screen distinguishes calculated outcomes from bypassed branch previews, reports exact dice consumption, records effect order, and rejects stale revisions and prompt replays. Owner binding, canonical option validation, session expiry, and zero escaped side effects make the displayed result auditable.

## Remaining unsafe or unsupported paths

- Bespoke resolver code that cannot be reached through canonical Threat/check/event entry points is rejected rather than emulated.
- Prose-only passive effects and text-only Scars are not executable.
- Scar choice continuation and owner-controlled Adaptation activation are active through the detached canonical session. Unsupported bespoke timing contexts still reject visibly rather than being emulated.
- The lab does not persist sessions or history across server restart.
- Batch mode intentionally excludes forced branch previews.
- Semantic text/effect comparison is heuristic and produces warnings, not authoritative rules judgments.

These boundaries are deliberate. They keep the first version accurate: select a card, choose a controlled operative and dice setup, resolve through canonical logic, then inspect the detached diff and ordered trace.

## Historical first-pass verification

- `npm.cmd run validate:content`: PASS — 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck`: PASS.
- Focused Simulation Lab, admin API, and client tests: PASS — 3 files, 13 tests.
- Corrected live-outcome timing, Heat-containment, and lab regression set: PASS — 3 files, 172 tests.
- `npm.cmd run test:engine`: PASS.
- `npm.cmd run test:rules`: PASS.
- `npm.cmd run test:integration`: PASS.
- `npm.cmd run test:client`: PASS.
- `npm.cmd run test`: PASS — 144 files, 1,427 tests.
- `npm.cmd run build`: PASS — Vite production build, 533 modules transformed.
- Browser QA: PASS — all ten requested states at 1920×1080, 1440×900, and 1280×720; zero page/column horizontal overflow and no console errors.
- `git diff --check`: PASS.
- `git diff --cached --check`: PASS; nothing is staged.
- `npm.cmd run audit:assets`: BLOCKED by the pre-existing `HostImage.css` Node/tsx import boundary in the frozen adaptive-image work (`ERR_UNKNOWN_FILE_EXTENSION`). The Simulation Lab does not modify `HostImage`, its stylesheet, or `scripts/audit-assets.ts`. The audit reached this loader failure before producing an asset result; it is not represented as a pass.

## Final closure verification

- `npm.cmd run validate:content`: PASS - 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck`: PASS.
- Focused Simulation Lab, admin API, Scar owner-control, and client tests: PASS.
- `npm.cmd run test:engine`: PASS - 69 files, 756 tests.
- `npm.cmd run test:rules`: PASS - 11 files, 58 tests.
- `npm.cmd run test:integration`: PASS - 36 files, 320 tests.
- `npm.cmd run test:client`: PASS - 41 files, 368 tests.
- Constituent total: PASS - 146 files, 1,444 tests.
- Aggregate `npm.cmd run test`: PASS - 146 files, 1,444 tests in 532.96 seconds.
- `npm.cmd run build`: PASS - Vite production build, 541 modules transformed.
- Browser QA: PASS - requested states plus owner-controlled Scar activation at 1920x1080, 1440x900, and 1280x720; zero page/column horizontal overflow and no console errors.
- `npm.cmd run audit:assets`: PASS - 435/435 present, zero missing/invalid/placeholders/release blockers, including all 24 Scar images. The Node audit boundary now consumes CSS-free map asset-path data and never imports `HostImage.css`.
- `git diff --check` and `git diff --cached --check`: PASS.

No save-version, topology, content-count, Heat-policy, or live client-authority change was introduced. No Simulation Lab files were committed or pushed.
