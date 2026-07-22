# Ashen Reach Progression and Endgame Presentation Specification

## P14 pre-edit architecture audit

This audit was completed before P14 implementation edits on branch
`ui/tv-movement-focus-mode` at `6bd4fc05a292df3749d024070260c27cf61c517a`.
The existing P0-P13 worktree is intentionally preserved, uncommitted, and
unpushed.

### 1. Canonical progression architecture

Shared win progress is stored in `scenarioProgress` or, for scenario-specific
confrontations, in `scenarioConfrontation.progress`. `buildScenarioPressureState`
projects the canonical current value, required value, completion state, label,
and mode. Clients currently repeat fallback selection between this projection
and `activeScenario.progress`.

### 2. Canonical pressure architecture

Scenario pressure and collapse are server-owned. The public projection contains
both the scenario-specific pressure track and the escalation collapse track.
The latter uses the canonical collapse threshold from session rules. The TV and
phone currently display the values, but neither receives a stable presentation
identity for the latest change or an explicit canonical threshold warning.

### 3. Final-stage ownership

`scenarioConfrontation.active`, its canonical stage/progress record, the active
Scenario's confrontation title/steps, and `center_cinder_gate` own final-stage
state. No separate client state is authoritative. Existing clients infer the
label "Final Confrontation" but do not receive a dedicated announcement or
public final-objective presentation.

### 4. Victory and defeat ownership

Reducers end the session, set `winnerSeatId`, and record `scenarioResult` where
the scenario action uses that lifecycle. Nemesis Relay and legacy co-op paths
also end the canonical session and record a public `lastOutcomeSummary`, but do
not always populate `scenarioResult`. Therefore a presentation adapter must
honour `scenarioResult` first and use ended-session canonical state only as a
compatibility fallback. Clients must not calculate or execute outcomes.

### 5. Rivalry-result ownership

The current engine has server-owned private Agenda reveal/progress/completion
and points. It does **not** have a canonical aggregate Rivalry ranking or Agenda
winner calculation. P14 must show the canonical shared match result and the
owner's already-authorized private Agenda conclusion. It must not invent a
ranking, compare private scores on a client, or reveal another player's Agenda.

### 6. Nemesis Relay ownership

Nemesis Relay ends authoritatively when all Nemesis Champions are defeated or a
Nexus countdown resolves. `winnerSeatId`, champion state, and the public outcome
summary are canonical. There is no AI-seat result or separate fabricated Relay
score.

### 7. Existing host presentation

The map-first header already renders Win Progress and Loss Pressure. The current
endgame overlay reconstructs meaning in the client and adds non-canonical
rankings such as most wounds, most scars, and most trophies. It also has no
dedicated final-stage announcement, stable change feedback, or post-game action
contract.

### 8. Existing phone presentation

The Objectives screen displays the shared Mission progress and pressure from
the public projection. The Action screen reduces an ended match to
`Game over: {winner} wins`, falls back to a raw winner identifier, and provides
no full result reason or structured summary. Existing owner-only Agenda data is
already separately projected.

### 9. Post-game and reconnect architecture

`RETURN_TO_LOBBY` is an existing host-authorized server command. Phone session
leave is also existing behavior. There is no canonical rematch command, so P14
will not create or advertise one. Required-action projection already exposes a
stable game-over identity. Reconnect rebuilds projections from canonical state;
presentation acknowledgement must remain local and revision-keyed so it cannot
replay rewards or commands.

### 10. Client-side inference to remove

- Endgame title/tone and winner wording in `TvApp` and `PhoneActionPanel`.
- Raw `winnerSeatId` fallbacks in player-facing copy.
- Client-created endgame rankings.
- Final-stage labels inferred independently by each surface.
- Threshold severity inferred only from bar appearance.

### 11. Smallest viable implementation and expected files

1. Extend the existing public patch with one server-authored match presentation
   containing stage, progress, pressure, warning, final objective, public result,
   and supported post-game commands.
2. Add an owner-only result summary to the phone projection using only already
   authorized private Agenda data.
3. Refine the existing TV header/endgame overlay and phone shared-Mission/action
   surfaces to consume that projection.
4. Extend the existing environment-gated QA fixture, add focused tests, scoped
   styles, a capture harness, and P14 reports.

Expected implementation files are `src/client/shared/types.ts`,
`src/server/roomServer.ts`, the existing P1 QA fixture, focused TV/phone
components and tests, `src/client/styles.css`, and P14-only scripts/docs.
No reducer, threshold, reward, scenario rule, save schema, topology, movement,
battle, shop, or inventory mechanic needs to change.

### 12. Principal risks and controls

- **Premature reveal:** stage/result fields come only from canonical server
  state; hidden Agenda data remains outside the public projection.
- **Reconnect replay:** stable transition IDs use authoritative revision/result
  sequence; animation never sends commands or mutates state.
- **Duplicate conclusion:** result presentation is a pure projection; reducers
  retain all idempotency and command ownership.
- **Legacy conclusion paths:** ended sessions without `scenarioResult` use the
  canonical winner and public outcome summary, not a client guess.
- **Unsupported features:** rematch, Rivalry ranking, draws, and campaign rewards
  stay absent unless canonical support exists.

## Presentation contract

- Server state owns every value, threshold, stage, result, reason, and allowed
  post-game command.
- Clients own layout, bounded emphasis, local acknowledgement, focus, and
  reduced-motion treatment only.
- TV receives public result data only.
- A phone receives the same public result plus only its authorized private
  conclusion.
- Internal identifiers never become player-facing fallback text.
