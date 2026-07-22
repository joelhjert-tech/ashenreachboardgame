# P15 Release Baseline

Recorded before P15 runtime changes on 2026-07-22 (Europe/Stockholm).

## Repository

- Repository: `C:\Users\Joel_\Documents\Ashenboardgame\ashen-reach-codex-task-01-repository`
- Branch: `ui/tv-movement-focus-mode`
- HEAD: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Dirty entries: 117
- Modified tracked entries: 59
- Untracked entries: 58
- Staged entries: 0
- Dependency manifests: unchanged
- `package-lock.json` SHA-256: `51F85BD9C390B2DE38BD5C580FBEF6F878AA87A086CCE49BF3BC2F59C0926743`
- Save version: 2 (`CURRENT_SAVE_VERSION`)

The worktree contains the accumulated P0-P14 implementation, tests, QA assets,
research, and reports. The tracked diff currently spans 59 files with 24,092
insertions and 17,794 deletions. P15 must preserve this baseline and must not
stage, commit, push, reset, reformat, or discard it.

## Canonical content and assets

Content validation passed at baseline:

| Family | Count |
| --- | ---: |
| Characters | 18 |
| Gear | 71 |
| Threats | 109 |
| Contracts | 36 |
| Anomalies | 20 |
| Artifacts | 30 |
| Followers | 24 |
| Scars | 24 |
| Escalations | 16 |
| Afflictions | 30 |

The last completed asset audit before P15 was 435/435. P15 will rerun it for
release evidence.

## Test baseline

- Engine/rules: 763/763 passed.
- Rules-only: 64/64 passed.
- Integration, uncontended: 365/365 passed.
- Client: 420/420 passed.
- Aggregate: 1,547/1,548.
- Exact reconnect regression: 1/1 passed in isolation.
- Uncontended integration rerun after the aggregate failure: 365/365 passed.

The aggregate failure was
`src/server/__tests__/reconnectFlapping.integration.test.tsx`. Its stability
assertion observed one additional connection-status transition after the test
had provisionally declared the reconnect settled. P15 does not classify this
as harmless until the sequencing is traced under contention.

## Existing P0-P14 evidence

- Named implementation and QA report sets are present for P2-P14.
- P9 additionally has baseline, transition-map, and usability research.
- P0/P1 work is represented by the required-action and phone-primary-action
  reports and QA archives, but no files use a canonical `P0_` or `P1_` filename.
  P15 treats this as a documentation-index gap, not missing implementation.
- `docs/qa` contained 903 files (587,854,939 bytes) before P15.

## Processes and ports

No process was listening on ports 5173 or 8080 at baseline. Several orphaned
Node development-process wrappers still referenced this repository (PIDs 8600,
15708, 10292, 5060, 12248, 15208, and 22024). They were recorded here before
cleanup so they cannot contaminate contention measurements. P15 will stop them
before test execution and will verify both ports are free at completion.

## Guardrails

- No gameplay, probability, topology, economy, progression, pressure, result,
  privacy, command, or save-format change is authorized.
- Unsupported rematch, draw, Rivalry ranking, spectator, AI-seat, matchmaking,
  account, campaign, and meta-progression behavior remains unsupported.
- Only confirmed P0/P1 root causes may receive runtime fixes.
