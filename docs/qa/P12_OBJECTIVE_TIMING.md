# P12 Objective Timing and Reconnect QA

P12 adds no gameplay timers and no client-owned completion timing.

## Canonical sequence

```text
server condition update
-> authoritative progress projection
-> reducer validates completion
-> typed reward applies once
-> completion record archives once
-> active Contract clears
-> deterministic owner-private replacement selection opens
```

Agenda reveal and progress remain server-event driven. UI emphasis follows patch state and never advances reveal, completion, reward, or replacement selection.

## Reconnect

- Contract progress is reconstructed from `activeContract`.
- Completion history is reconstructed from `completedMissionRecords`.
- Replacement options and selection identity are reconstructed from `pendingMissionSelection`.
- Agenda lock/reveal/completion is reconstructed from `player.private.rivalryAgenda`.
- A completed reward is not re-applied and a completed Contract does not reopen.
- Waiting/TV projections are rebuilt from current public state, not cached private detail.

## Motion

Objective transitions use the existing shared motion primitives. Reduced motion removes nonessential movement while retaining stage, progress, reward, lock/reveal state, and focus. No progress animation controls server timing and no animation callback sends a command.

## Recording observations

- Mission progress updates in place without reshuffling objective sections.
- Contract progress retains stable section order before replacement takes ownership.
- Agenda protected fields appear only after the authoritative reveal fixture changes state.
- Reconnect restores the same near-complete Contract without replaying a result.
- Reduced motion preserves identical text and choices.
