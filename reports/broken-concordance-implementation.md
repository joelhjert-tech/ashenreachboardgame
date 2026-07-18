# Broken Concordance Implementation

## Scope delivered

- Shared cooperative assistance state, schemas, actions, server validation, append-only events, projections, reconnect, and replay protection.
- One shared pre-roll window for opposed combat, Hazards/persistent tile challenges, named board tests, and Broken Concordance tests.
- Co-op-only scenario with three board nodes, three Core stages, existing Global Escalation failure pressure, and canonical center-only victory.
- Phone helper selection, consent, waiting, locked roll, and resolved contribution breakdown.
- TV public assistance banner and explicit Active stat + Roll + Help arithmetic.
- Scenario selection eligibility and server-side rejection outside standard 2–6 player co-op.
- Original scenario art and public node markers.
- Deterministic analysis, fixtures, browser capture, and focused tests.

## Correctness boundaries

The server owns request/source identity, tested skill, helper seats, response state, locked base values, dice, totals, and resolution. Clients submit stable seat IDs only when selecting and their own consent response. They cannot submit contribution values, another seat's response, a third helper, a result, or a die.

Enemy dice are not produced by the assistance request. They remain part of the ordinary combat resolver and occur exactly once after the helper window is locked or bypassed. The mechanic adds no enemy die and no difficulty adjustment.

Save version remains 2. The optional new fields default absent/null, so v0–v2 imports continue through the existing compatibility boundary.

## Visual correction pass

The first rendered pass found two defects:

1. `Roll without help` clipped beside the primary helper action at 390×844. It was shortened to `Roll solo` while preserving the same command.
2. The existing TV battle footer folded help into the active stat. The footer now displays the active effective stat, one active roll, a distinct Help amount, and the authoritative total. The active phone also remains in the assistance shell for the result and lists each helper.

Recaptured screenshots passed phone/TV overflow checks, public/privacy checks, console checks, and reduced-motion rendering.

## Four critique seats

- **New player:** Accept/Decline explains exactly whose skill is requested; the phone and TV explicitly say helpers add base skill and roll no dice. Scenario objective and three public node markers are legible.
- **Optimizer:** Stable request IDs, max-two validation, locked values, one roll per side, and replay-safe objective IDs close contribution/reroll farming. Full-base assistance can guarantee low difficulties for optimized teams; retained by specification and documented for playtest.
- **Family/casual:** One focused request at a time and concise helper cards keep the flow short. Proceeding with one accepted helper avoids waiting for a disconnected/pending second helper.
- **Rules lawyer:** Timing is before dice; active seat and tested skill cannot change; only requested connected teammates answer; accepted values snapshot on lock; preparation and confrontation are distinct; only final center stage wins.

## Deferred balance work

No balance-only cooldown or formula change was made. Full-session testing should measure request frequency, specialist repetition, and the final Grit-15 stage with normal Equipment progression.

## Final verification

- `npm.cmd run validate:content`: passed; seven scenarios alongside the canonical 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, and 24 followers.
- `npm.cmd run typecheck`: passed.
- Focused assistance, scenario, phone, board-visual, reconnect, projection, and privacy coverage: passed.
- `npm.cmd run test:rules`: 10 files / 49 tests passed.
- `npm.cmd run test:engine`: 66 files / 737 tests passed.
- `npm.cmd run test:integration`: 33 files / 294 tests passed.
- `npm.cmd run test:client`: 37 files / 345 tests passed.
- `npm.cmd run test`: 136 files / 1,376 tests passed.
- `npm.cmd run audit:assets`: 420/420 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed (510 modules transformed).
- Browser QA: 21 reviewed captures; all overflow, privacy, console, and reduced-motion checks passed.
- `git diff --check` and `git diff --cached --check`: passed.

The full-card Admin Library grouping test now has a local ten-second ceiling because rendering and regrouping the 352+ card archive takes approximately 5.8–6.6 seconds in jsdom. Its behavioral assertions are unchanged.

## No unrelated mechanics

No movement, shop, economy, follower, Rivalry privacy, save-version, legacy Heat compatibility, or +116 Threat expansion rule was altered.
