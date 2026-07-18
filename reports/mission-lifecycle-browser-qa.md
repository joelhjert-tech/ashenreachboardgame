# Mission lifecycle browser QA

Commit under review: `f6ad1bc` (`mission-lifecycle-complete` candidate)

## Fresh-session smoke result

| Surface | Result | Evidence |
| --- | --- | --- |
| TV host | Pass | Fresh `/tv` page rendered; `qa-artifacts/mission-lifecycle-tv-fresh.png` |
| Phone controller | Pass | Fresh phone join form rendered at mobile viewport; `qa-artifacts/mission-lifecycle-phone-fresh.png` |
| Dev-server cleanup | Pass | Local server was stopped by the QA harness after the browser run |

## Lifecycle-flow result

Blocked for honest browser verification. The current test-only browser fixture (`src/server/phaseOneQaFixture.ts`) can place an active contract at objective progress, but it cannot seed `completedContracts`, place an operative at a relic dealer while preserving the ledger, or expose an Artifact-trade fixture. Consequently it cannot validate the requested browser-only sequence of three completed ledger IDs, a single Artifact trade, exact three-ID consumption, and retry blocking without changing QA-only fixture code.

No browser verification of the three-completed-Missions-to-Artifact flow has happened yet.

The authoritative automated coverage for that sequence passed at `f6ad1bc`:

- contract completion applies reward once, appends a ledger entry, and clears the active contract;
- present `completedContracts: []` does not fall back to historical events;
- relic trade consumes exactly three ledger IDs, grants one Artifact-tier item, preserves an active incomplete contract, and fails again without three new completions;
- phone receives ledger IDs and TV receives only the public count/progress.

## Required follow-up before calling the lifecycle browser-verified

Extend the QA-only fixture with an explicit mission-lifecycle state that supplies three ledger IDs and a clear `risk-shop` sector, then rerun this checklist through the phone UI with a TV page connected:

1. Complete a `defeatCount` contract and verify one reward, no active contract, and a completed-ledger entry.
2. Accept a replacement mission.
3. Seed or complete three ledger entries, visit the relic dealer, trade once, and verify exactly three IDs are removed and one Artifact appears.
4. Retry without three new entries; verify the control is disabled/rejected.
