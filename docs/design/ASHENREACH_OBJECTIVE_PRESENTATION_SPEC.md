# Ashen Reach Objective Presentation Specification

## P12 pre-edit architecture audit

This audit was completed before P12 implementation edits. The repository was on `ui/tv-movement-focus-mode` at `6bd4fc05a292df3749d024070260c27cf61c517a`. The large pre-existing dirty worktree, including completed P0-P11 work, is preserved. P12 will remain uncommitted and unpushed.

The rule-spine and card-economy-spine documents referenced by local skills are not present in this checkout. Canonical schemas, content catalogs, reducers, server projections, and tests therefore form the authority for this audit.

## 1. Canonical terminology map

| Player-facing term | Canonical runtime meaning | Authoritative source | P12 decision |
|---|---|---|---|
| Shared Mission | The selected Scenario's public objective, preparation, confrontation, progress, and result | `activeScenarioId`, `scenarioProgress`, `scenarioPreparation`, `scenarioConfrontation`, `scenarioResult`, and `ScenarioPressureState` | Present as **Shared Mission** while retaining Scenario as its rules/content type |
| Contract | One operative-owned `ContractCard` with an `activeContract` progress record, typed objective, typed reward, completion record, and deterministic replacement selection | Contract schema/catalog, contract objective rules, reducer, and RoomServer | Present consistently as **Contract**, owner-private except for generic public activity/completion |
| Quest | No active schema, reducer, projection, catalog, assignment, progress, or completion lifecycle | None | Do not create a Quest section; rename the visible `Quest` navigation label to **Objectives** while retaining the internal tab key for compatibility |
| Agenda | Rivalry/Ruthless owner-private objective with authoritative reveal, progress, completion, and scoring state | `rivalryAgenda` private player state and rivalry agenda trigger rules | Present as **Private Agenda** only to the owner; locked payloads and UI conceal protected objective fields |

Historical note: P12 found twelve unused legacy `MissionDefinition` records in `src/game/data/missions.ts`. The later Contract category consolidation reviewed all twelve, retained nine existing promotions, promoted the final three through canonical Contract objectives, and removed that duplicate catalog. Mission-named save and protocol fields remain compatibility boundaries only.

The current client frequently calls a canonical Contract a "Mission" (`ActiveMissionQuestCard`, replacement Mission picker, setup Mission selection, TV Active Missions). That historical language obscures the distinction between the shared Scenario objective and a personal Contract. P12 corrects active-play presentation without renaming stable IDs, events, save fields, or setup commands.

## 2. Current objective architecture

The server stores the active Scenario globally and personal Contracts inside each character. Contract progress is advanced by typed server events for enemy defeat, board-space text, route stops, shop transactions, and tile challenges. The reducer validates completion, applies typed rewards, archives a completion record, and clears the active Contract. RoomServer then deterministically queues up to three replacement Contracts.

Rivalry Agenda definitions are assigned deterministically from turn order. Private reveal and progress state live under `player.private.rivalryAgenda`. Triggers resolve on the server, append events, and create separate private progress/completion summaries and generic public reveal/completion summaries.

The phone receives a public patch plus an owner-only `self`, `activeContractCard`, replacement options, and `privateRivalry`. The TV consumes only the public patch.

Current UI behavior:

- The phone `Quest` tab mixes private Agenda, a personal Contract labelled Active Mission, replacement selection, and Scenario details.
- Contract objective descriptions and target values are formatted locally from canonical Contract content; progress itself comes from authoritative state.
- Shared Scenario progress is already server-projected, but its hierarchy is buried beneath personal content.
- The TV Active Missions panel maps every public player's `activeContract.contractId` to the public Contract catalog and displays title, objective, progress, and reward.
- P11 mission markers perform the same public mapping to place Contract destinations on the board.

## 3. Mission ownership and visibility

The active Scenario is table-owned. Its public objective, current progress, pressure, preparation summary, confrontation lock/state, result, public map hooks, and public result deltas are appropriate for every phone and the TV.

Hidden branches do not exist in the current Scenario projection. P12 must still avoid presenting raw progress keys, internal stage IDs, or private mode metadata. The public Scenario projection remains authoritative; the client may select and order display fields but cannot calculate progress or completion.

## 4. Contract ownership and visibility

A Contract belongs to exactly one operative through `character.activeContract`. Its ID, title, objective conditions, progress, reward, target sector, completed history, and replacement choices are owner-private unless a future rule explicitly makes a field public.

The current public player projection leaks `activeContract.contractId` and progress. Because the full Contract catalog is also public, TV and other phones can reconstruct another operative's title, condition, reward, and map targets. The current TV sidebar and P11 map markers render that reconstruction. Public result deltas also mark Contract progress and named completion summaries public.

P12 must remove the ownership linkage from public player projection, replace public progress activity with generic private-objective wording, and retain complete owner data in `self` plus owner-only Contract projections.

## 5. Quest ownership and visibility

There is no mechanically distinct Quest system. The word appears only in presentation identifiers and the bottom navigation label. No Quest data should be fabricated, no empty Quest section should be shown, and no legacy/reference Mission definition should be promoted into a Quest.

## 6. Agenda ownership and visibility

Agenda assignment, definition, progress, reveal state, and scoring are owner-private. Public state may contain only a generic reveal or completion event after the authoritative transition occurs.

The current private projection always serializes the full Agenda objective even while `hidden` or `revealLocked`. The current phone therefore displays title, summary, progress, and stakes before reveal. This conflicts with P12's locked-state privacy contract. Locked states must omit `objective` and `scoring`; reveal-available may identify only that a reveal action is available; full protected fields appear only in `revealed`, `completed`, or `failed` state.

The public event builders currently use operative name rather than player display name. P12 presentation should use player display name as the public actor identity without exposing the Agenda title or target.

## 7. Current progress calculation source

- Shared Mission: `ScenarioPressureState.objectiveProgress`, with active Scenario progress/threshold as the existing fallback.
- Contract: `character.activeContract.progress`, `completedTargetIds`, and `salvageSpent`, advanced only by contract objective rules and server triggers.
- Quest: none.
- Agenda: `getRivalryAgendaProgressSnapshot`, combining authoritative stored event progress or canonical state-derived progress according to the Agenda definition.

Clients currently format counts and condition labels from canonical content. They must not infer progress from event logs, map positions, inventory, or text.

## 8. Current completion source

- Shared Mission completion is `scenarioPressure.scenarioStatus`, `scenarioResult`, and canonical Scenario victory events.
- Contract completion is the reducer's `COMPLETE_CONTRACT` action after `isContractObjectiveComplete`; reward effects are applied before the completion record is archived.
- Agenda completion is an authoritative `RIVALRY_AGENDA_PROGRESS_TRIGGERED` event with completed state and points.

Completion and reward idempotency already live in reducers and event-backed state. P12 will not add client Claim behavior where none exists. Contract completion is currently an explicit canonical action; Contract rewards apply automatically when that action succeeds.

## 9. Files expected to change

The smallest implementation is expected to touch:

- `src/client/shared/types.ts` for privacy-accurate optional presentation fields.
- `src/server/roomServer.ts` for public Contract filtering, locked Agenda filtering, public-safe completion wording, and deterministic QA projections.
- `src/game/engine/reducer.ts` only to mark the existing Contract completion resolution owner-private; reward/completion logic remains unchanged.
- `src/client/phone/PortraitControllerView.tsx` and a focused objective presentation module/component.
- `src/client/tv/TvApp.tsx` for a shared-Mission summary and generic private-objective status.
- `src/client/tv/BoardMap.tsx`/P11 presentation only where private Contract markers must be removed.
- Scoped phone/TV styles and focused tests.
- The existing environment-gated QA fixture and a P12 capture harness.
- P12 design, implementation, privacy, timing, accessibility, screenshot, and backlog documentation.

No objective schema, content card, reward amount, trigger, target, save-version, network command, topology, movement, battle, shop, or inventory mechanics file should change beyond the one owner-privacy annotation on the existing resolution object.

## 10. Smallest viable implementation

1. Add a pure objective presentation adapter that consumes existing server-authored Scenario, owner Contract, completion history, replacement selection, and private Agenda projections.
2. Replace the mixed Quest screen with a compact Objectives screen ordered as Shared Mission, Required Now, My Contract, Private Agenda, and collapsed Completed Contracts.
3. Keep current instructions/progress/reward above lore; expose canonical route-stop conditions without raw schema names.
4. Remove Contract ID/progress from public player projection and remove selected starting Contract title from public setup projection.
5. Suppress protected Agenda fields until the authoritative reveal state permits them.
6. Make Contract completion resolution owner-private while projecting only a generic public completion status to TV and waiting phones.
7. Reuse P11 only for truly public Scenario markers; private Contract destinations remain phone-only.
8. Add serialized and rendered privacy tests, reconnect cases, deterministic fixtures, responsive QA, and reports.

## 11. Principal risks and controls

**Privacy regression.** Existing clients can reconstruct another player's Contract from public ownership IDs. Remove the linkage at the server boundary and test TV, other phone, cached patch, and reconnect bootstrap serialization.

**Stale progress.** Client formatting may outlive a Contract replacement. Key presentation on authoritative Contract ID plus patch revision, clear pending controls on a newer revision, and never derive progress from prior deltas.

**Reveal timing.** Agenda objective fields currently exist before reveal. Use a discriminated optional projection and render locked/reveal-available states without protected fields. Reconnect must reconstruct the same state from server data.

**Completion replay.** Contract reward and archive are already atomic in the reducer. Presentation must display the existing resolution once, disable the submitted action immediately, and use event/state identity rather than animation completion.

**Terminology migration.** Stable schema and event names intentionally remain unchanged. Only active-play visible labels change. Setup Mission wording is outside this slice except where public detail leakage must be removed.

**Map regression.** Removing private Contract markers may reduce marker density; it must not remove public Scenario markers or alter routes/topology.

**Long content.** Contract and Scenario text can be lengthy. Required instruction, progress, and reward remain above the fold; lore and completed history are collapsed.

## Presentation and privacy contract

- The Scenario is presented as the table's Shared Mission.
- A Contract is a private personal objective.
- Quest is not displayed as a separate system because none exists.
- An Agenda is private and protected until its canonical reveal state permits detail.
- Server state owns progress, completion, rewards, reveal, ordering identity, and allowed commands.
- Canonical content owns titles, conditions, lore, and reward wording.
- The client owns only grouping, emphasis, expansion, and responsive layout.
- TV and waiting phones may say a player is reviewing or completed a private objective; they may not name it, show progress, show its target, or show its reward.
- Unknown objective data is omitted with safe wording; raw stable IDs and schema keys never become visible copy.
