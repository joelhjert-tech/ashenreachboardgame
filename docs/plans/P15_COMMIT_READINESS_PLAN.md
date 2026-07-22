# P15 Commit Readiness Plan

## Commit

Commit source and focused tests by bounded slice, then documentation separately:

1. Shared presentation foundation (P0–P1).
2. Movement, encounter and battle presentation (P2–P4).
3. Setup, shop and inventory presentation (P5–P7).
4. Shared transitions and host map (P8–P11).
5. Objectives, dice and endgame (P12–P14).
6. `fix: harden reconnect projection lifecycle` for the P15 runtime/test correction.
7. `test: harden release campaign isolation` for soak, shuffled-order and scenario-runner changes.
8. `docs: report p15 release readiness`.

Stage explicit paths only. Do not fold P15 into earlier checkpoint commits.

## Keep local

- `.tmp-playtest/` logs and generated sessions.
- Raw `page@*.webm` browser recordings.
- Full research-reference media and copyrighted comparison captures.
- Duplicate or intermediate screenshots superseded by final captures.

## Candidate QA evidence

Commit the index, JSON metrics and a small representative screenshot set only if repository policy accepts binary QA evidence. Keep the full video set local because the pre-P15 QA tree already exceeded 587 MB.

## Branch recommendation

Create a clean integration branch from the intended mainline, apply commits in the order above, and run verification after each logical group. The present branch name (`ui/tv-movement-focus-mode`) no longer represents the accumulated P0–P15 scope.

No files were staged, committed or pushed by P15.
