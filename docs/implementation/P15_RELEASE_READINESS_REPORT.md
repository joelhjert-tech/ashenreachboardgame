# P15 Release Readiness Report

## Baseline

- Repository: `C:\Users\Joel_\Documents\Ashenboardgame\ashen-reach-codex-task-01-repository`
- Branch: `ui/tv-movement-focus-mode`
- Baseline HEAD: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Baseline dirty entries: 117 (59 modified, 58 untracked), none staged.
- Save version: 2.
- Canonical content: 18 characters, 71 gear, 109 Threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations and 30 Afflictions.
- Asset audit: 435/435 present.
- Known baseline contention result: 1,547/1,548.

## Corrections

1. Removed equivalent duplicate state bootstrap during phone adoption/reconnect.
2. Replaced the reconnect test's fixed sleep with revision/socket/patch semantic conditions.
3. Reset the API integration room fixture between shuffled tests.
4. Extended the solo movement lifecycle soak from 10 to 30 turns with five reconstructions.
5. Made the ended TV board inert and corrected host control hit areas.
6. Updated the scenario campaign harness to use the current catalog, canonical eligibility, current session key and valid display names.
7. Isolated heavyweight TV-shell tests from the full Admin registries and reused one real API server for the catalog-wide scenario creation test.
8. Kept the Heat-retirement source guard semantically exact while skipping AST construction for files that cannot contain a Heat field.

No gameplay rule, probability, topology, command outcome, save schema or projection boundary changed.

## Verification summary

- Content validation: pass.
- Typecheck: pass.
- Client: 420/420 pass under contention.
- Engine: 763/763 pass.
- Rules-only: 64/64 pass.
- Integration shuffled seed 1501: 365/365 pass.
- Integration uncontended final: 365/365 pass in 350.29 s.
- Aggregate foreground at five minutes: timed out; no result claimed.
- Aggregate monitored under concurrent work: 1,548/1,548 pass in 487.00 s.
- Aggregate final clean canonical wrapper: 162 files, 1,548/1,548 pass in 565.58 s; reconnect passed in 1.31 s.
- Correctly scoped shuffled aggregate with leaked QA servers: exceeded 15 minutes and was terminated without a result; process inspection found nine orphaned QA server trees. This is not reported as a test pass or failure.
- Production build: pass.
- Asset audit: pass, no missing/invalid/release-blocking assets.
- Browser campaign: 66 screenshots, eight named recordings, zero console errors, zero privacy findings and zero horizontal overflow.
- Scenario browser/terminal matrix: 31/31 supported cases and 31/31 terminal results passed.
- Soak: 30 turns, five reconstructions, no material resource growth.

## Release findings

- P0 Critical: 0 open.
- P1 High: 0 open.
- P2 Medium: QA artifact curation and legacy runner filename only.
- P3 Low: report discoverability and optional bundle budgets.

## Assessment

**READY WITH NON-BLOCKING FOLLOW-UP ITEMS**

The P0–P14 implementation is suitable for consolidation and broader human playtesting. The remaining work is repository hygiene and evidence curation, not a runtime release blocker.
