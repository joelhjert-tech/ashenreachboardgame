# Heat Compatibility C6E — Current Documentation Cleanup

Date: 2026-07-16

Checkpoint: `be2e1cd refactor: migrate legacy heat metadata`

Disposition: documentation-only implementation

Verdict: **CONDITIONAL PASS**

## Scope and manifest

C6E corrected exactly six statements in three current documents. Historical retirement reports, compatibility records, gameplay content, code, schemas, migrations, validation, tests, UI, and assets were not changed.

| # | File and section | Audience | Original wording | Final wording | Correction |
|---:|---|---|---|---|---|
| 1 | `README.md`, Content | Developer-facing current catalog | ``content/cards/scars` persistent wound / Heat scars` | ``content/cards/scars` persistent consequences of the Wound and Scar lifecycle` | Rewrote the catalog description to name the current lifecycle. |
| 2 | `docs/MVP_RULES.md`, Movement | Player-facing current rules | `Failure still moves the operative, but usually adds Heat.` | `Failure still moves the operative.` | Removed a retired consequence while preserving the stated movement result. |
| 3 | `docs/MVP_RULES.md`, Threats | Player-facing current rules | `add Heat` | Removed from the list. | Removed a consequence that current Threats cannot author. |
| 4 | `docs/MVP_RULES.md`, resource heading | Player-facing current rules | `Heat and Wounds` | `Wounds, Recall, and Scars` | Replaced an active-system heading with the current lifecycle. |
| 5 | `docs/MVP_RULES.md`, resource explanation | Player-facing current rules | `Heat represents mounting exposure and instability.` | Removed. | Removed active-resource guidance; the adjacent Wound, recall, and Scar rules remain intact. |
| 6 | `docs/MOTION_BIBLE.md`, Battle Impact | Developer-facing current presentation | `Wound, heat, trophy, and result chips pulse after impact.` | `Wound, trophy, and other authored result chips pulse after impact.` | Removed guidance to render a retired result type without narrowing current authored results. |

The manifest comprises one README statement, four MVP rules statements, and one motion statement. No other occurrence was treated as current mechanical guidance.

## Classification rationale

- `README.md`, `docs/MVP_RULES.md`, and `docs/MOTION_BIBLE.md` describe the current product and therefore must not teach the retired resource as active.
- Current authoritative harm remains Wounds followed by the independent recall and Scar lifecycle.
- Canonical current content cannot author Heat effects or follower/Threat Heat metadata.
- Legacy v0–v2 input support remains parser-only, inert, and excluded from phone/TV projections.
- Historical approval, audit, retirement, migration, and implementation reports remain unchanged as an accurate record of earlier checkpoints.
- Ordinary environmental and art-direction uses remain valid and were not rewritten.

## Current-documentation search

Manual review of current rules and architecture documentation found no remaining statement that tells players or developers to gain, lose, track, spend, threshold, display, or newly author Heat. Searches for `gain Heat`, `lose Heat`, `Heat threshold`, `current Heat`, `maximum Heat`, `Heat causes Scar`, `Heat causes recall`, `track Heat`, `spend Heat`, `Heat loss condition`, `author gain_heat`, and `author lose_heat` were reviewed with historical reports excluded from the current-guidance verdict.

The remaining tracked references belong to environmental/art language, required v0–v2 compatibility, compatibility tests/fixtures, or clearly historical documentation. They do not describe current gameplay.

## Classification after C6E

The comparable corpus uses the C6D classification method and excludes this implementation report plus the three living audit/roadmap reports updated by C6E. Removing the six current-documentation occurrences produces **4,098 occurrences across 240 files**.

| Category | Before | After | Finding |
|---|---:|---:|---|
| A — Active authored gameplay | 0 | 0 | Canonical authored gameplay remains free of Heat. |
| B — Environmental/art presentation | 13 | 13 | Mechanical player-facing exposure remains 0. |
| C — Required compatibility | 297 | 297 | Legacy parsing, normalization, replay, reconnect, and projection defenses are unchanged. |
| D — Tests and fixtures | 971 | 971 | Compatibility evidence is retained. |
| E — Documentation/history | 2,822 | 2,816 | Exactly six misleading current statements were corrected; historical records remain. |
| F — Dead/obsolete residue | 1 | 1 | Stable serialized Nemesis identifier `heat_on_threat_defeat` remains deferred to C6F. |
| G — Ambiguous | 0 | 0 | Every remaining reference remains classified. |

Counts are mutually exclusive and sum to 4,098. The two-file reduction reflects current documents that no longer contain a Heat substring; `docs/MOTION_BIBLE.md` still contains an unrelated environmental/art occurrence in `theatre` under the established substring method.

## Verification and boundaries

Passed:

- complete tracked Heat classification: 4,098 occurrences across 240 files in the comparable corpus;
- current-documentation phrase search: zero misleading mechanical statements;
- `npm.cmd run validate:content`: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions;
- `npm.cmd run typecheck`;
- `npm.cmd run test:engine`: 60 files / 712 tests;
- `npm.cmd run test:integration`: 27 files / 241 tests, including reconnect flapping without retry;
- `npm.cmd run test:client`: 26 files / 273 tests;
- `npm.cmd run test`: 113 files / 1,226 tests;
- `npm.cmd run audit:assets`: 418 / 418 present with zero missing, invalid, placeholder, or release-blocking assets;
- `npm.cmd run build`: 142 modules transformed;
- `git diff --check` and `git diff --cached --check`.

The requested `npm.cmd run test:rules` command is not defined in this repository. Rules coverage is included in `test:engine` and the aggregate suite; both passed. Expected test-only missing-art fallback diagnostics appeared in client/aggregate output, while the authoritative asset audit passed with no findings.

Save version remains 2. Authored typed Heat and canonical follower/Threat Heat metadata remain zero. Legacy v0–v2 parsing, inert normalization, replay/reconnect safety, and projection stripping remain unchanged. Crownless Advocate and Saltflat Bone-Reader retain their exact approved `gain_note` behavior.

## Remaining condition

The verdict remains **CONDITIONAL PASS**. C6F must make the explicit release decision for the retained legacy compatibility boundary and the single deferred Category F identifier. C6E does not authorize compatibility deletion or a save-version change.
