# S21 and TV Host Full Test

Date: 2026-07-26

## Outcome

A physical Samsung Galaxy S21+ completed a natural single-player game of The Broken Seal while a computer browser remained connected as the 1920×1080 public TV host. The game reached an authoritative defeat after 72 visible phone actions.

The successful rerun covered staged setup, movement rolls, destination selection, route confirmation, cross-reach travel, arrival results, recurring challenges, hazards, enemy battles, rewards, a Scar choice, inventory, shop availability, reconnect restoration, handoff, pressure, and defeat.

Raw privacy-safe evidence is stored outside Git under:

`.tmp-playtest/s21-tv-host-full-review/campaign-rerun/broken-seal-1p`

## Test surfaces

| Surface | Configuration |
|---|---|
| Phone | Samsung Galaxy S21+, Chrome 150, 384×722 CSS px, DPR 2.8125 |
| Host | Computer browser, 1920×1080 |
| Transport | Local WebSocket room over USB port reversal |
| Authority | Ordinary visible controls and server-authored state only |

## Defects found and fixed

### Battle submission recovery

A rejected or delayed battle roll could leave the local battle button showing `Submitting roll…` after the authoritative required action had been restored. The global recovery state cleared, but the nested battle presentation retained its independent submission latch.

The battle control now follows the authoritative required-action submission lifecycle. It remains locked during a real pending submission and resets when recovery confirms that the same action may be attempted again. A regression proves that the restored roll can be submitted after rejection.

### TV movement completion warning

The Signal Theatre journey hook invoked the host-completion callback from inside a React state updater. When the callback updated the TV parent, React reported a render-time parent update.

Completion is now emitted after the journey state update rather than from inside the updater. A parent/child regression proves that the landing acknowledgement updates the host without the React warning.

## Physical rerun

- Outcome: defeat.
- Terminal state: `ended`, broadcast phase.
- Actions: 72.
- Duration: 60.6 seconds.
- Phone console errors: 0.
- TV console errors: 0.
- Failed requests: 0.
- Horizontal overflow observations: 0.
- Canvas nodes: 0.
- Reconnect evidence: result-ready state restored without replay.
- The earlier permanent `Submitting roll…` stall did not recur.
- The earlier TV render-time warning did not recur.

The phone displayed one accessible result total, a visible Continue action, the applied consequence, and a stable endgame screen with `Start New Game`. The TV remained synchronized through movement, challenge, battle, handoff, and defeat.

## Deterministic edge coverage

The natural draw did not exercise every route aid or prototype state. Focused deterministic coverage therefore verified:

- Slower departure, same-reach, cross-reach, and arrival timing.
- Phone presentation gating until TV landing acknowledgement or bounded fallback.
- Duplicate and stale TV acknowledgements.
- Reduced-motion completion.
- Shop carousel projection and map rejection during shop visits.
- Scenario briefing and shop approval prototypes.
- Host-only defeat recovery and room reset.
- All four two-charge route aids, exact-instance validation, canonical same-reach routes, purchases, rewards, depletion, reconnect, and privacy.

The focused group passed 211 tests.

## Validation

Passed:

- Content validation: 18 characters, 73 gear, 116 Threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 26 Followers, 24 Scars, 16 Escalations, and 30 Afflictions.
- Typecheck.
- Focused phone battle recovery and TV journey tests: 90 tests.
- Focused movement, shop, route-aid, inventory, phone, TV, and room integration group: 211 tests.
- Complete client suite: 556 tests.
- Complete server integration suite: 406 tests.
- Production build.
- Asset audit.

The complete engine/rules directory still contains failures from the older uncommitted resolution, escalation, forced-displacement, and legacy Heat-retirement work already identified before this test pass. The S21/TV fixes did not modify those semantics, and their focused engine coverage passes.

## Cleanup

- Task development servers stopped.
- USB port reversal and Chrome debugging forwarding removed.
- Ports 5190 and 8090 closed.
- No push performed.
