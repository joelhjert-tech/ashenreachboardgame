# P16 Commit Manifest

## Baseline

- Repository: `C:/Users/Joel_/Documents/Ashenboardgame/ashen-reach-codex-task-01-repository`
- Starting branch: `ui/tv-movement-focus-mode`
- Consolidation branch: `integration/p0-p15-ux-consolidation`
- Starting HEAD: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Remote: `origin` (`https://github.com/joelhjert-tech/ashenreachboardgame.git`)
- Dirty status entries: 125; expanded changed/untracked file inventory: 1,237 files
- Staged files at start: 0
- Dependency/lockfile changes: 0
- Save version: 2

## Exhaustive classification rules

Every path returned by `git ls-files -m` and `git ls-files --others --exclude-standard` is assigned by the first matching row. These rules cover the complete 1,237-file inventory without exceptions.

| Category | Exact path rule | Files | Treatment | Reason / dependency |
|---|---|---:|---|---|
| A Runtime source | `src/**` excluding `**/__tests__/**` and `*.test.*`, plus `scripts/validate-content.ts` | 53 | Commit in runtime dependency order | Server authority, shared projections, phone/TV presentation, styles, tile rules, validation |
| B Automated tests and QA harnesses | `**/__tests__/**`, `*.test.ts(x)`, `scripts/capture-*`, `scripts/validate-six-scenario-e2e.ts` | 55 | Commit after runtime source | Focused unit/integration/client coverage and deterministic browser fixtures |
| C Product documentation | Markdown under `docs/design`, `docs/implementation`, `docs/plans`, selected P0-P15 `docs/research`, and `reports/**` except `reports/ui/**` | 48 | Documentation commit | Design, architecture, implementation, and audit narrative; local workstation/reference reports excluded |
| D Textual QA evidence | Markdown/JSON under `docs/qa/**` and `reports/ui/**` | 57 | Documentation commit | Indices and machine-readable metrics; no media payload |
| E Binary QA evidence | PNG/WEBM/MP4 under `docs/qa/**` | 981 | Local-only | Approximately 628 MB of generated captures; P15 plan says bulk evidence stays local |
| F Local reference research | Everything under `research/reference/**`, plus `docs/research/android-workstation/**`, `docs/research/talisman-runtime/**`, and `docs/research/talisman-video-audit/**` | 41 newly visible files; `research/reference/talisman-runtime` already ignored | Local-only | Third-party/reference captures, package inspection, workstation notes, and local comparison material must not enter history |
| G Temporary/generated | Logs plus ignored `.tmp-playtest/`, `artifacts/`, `dist/` | 2 visible logs plus ignored outputs | Local-only | Generated process/build/test material |
| H Unrelated pre-existing work | No paths remained after P0-P15 provenance review | 0 | None | Map-tile and Action-tab work are documented P0-P15 deliverables |

No APK, keystore, certificate, authentication file, package-lock change, or dependency manifest change appears in the dirty inventory.

## Commit plan

Whole files are used; no interactive hunk staging is required.

1. `feat: establish authoritative gameplay presentation state`
   - Game/server schemas, reducers, tile rules, required-action projection, reconnect authority, and content validation.
   - Includes directly coupled game/server tests.
2. `feat: add shared responsive presentation primitives`
   - Shared art, dice, motion, focus, live-status, objective, and presentation utilities.
3. `feat: streamline phone gameplay flow`
   - Phone required-action, movement, encounter, battle, inventory, objective, and Action-tab presentation plus shared styles and focused client tests.
4. `feat: synchronize host command board presentation`
   - TV board, movement, battle, shop, sector context, Admin Map inspection, endgame, and focused host tests.
5. `test: harden reconnect and release campaign coverage`
   - Remaining P15 test isolation, 30-turn soak, browser capture runners, and scenario matrix tooling.
6. `docs: add P0-P16 UX implementation and QA records`
   - Textual design, implementation, research, QA indices/metrics, backlog, and this manifest.

Because shared type and stylesheet files span multiple phases, they are placed at the earliest whole-file dependency boundary. Splitting those files by hunk would make review less reliable and risks recording an unbuildable intermediate state.

## Local-only inventory

- `research/reference/talisman-runtime/` — ignored; never stage.
- `research/reference/talisman-video-audit/` — untracked reference media; never stage.
- `docs/research/android-workstation/`, `docs/research/talisman-runtime/`, and `docs/research/talisman-video-audit/` — local-only workstation and reference-research reports; never stage.
- `docs/qa/**/*.png`, `docs/qa/**/*.webm`, `docs/qa/**/*.mp4` — generated binary QA evidence; never stage.
- `.tmp-playtest/`, `artifacts/`, `dist/` — ignored generated output; never stage.
- `docs/qa/**/*.log` — local server logs; never stage.
- Android/emulator/browser-profile/APK/account material — none present in this repository inventory; never stage if discovered.

## Validation policy

## Executed commits

| Order | Commit | Subject | Files | Focused verification |
|---:|---|---|---:|---|
| 1 | `f3e8aa2` | `feat: establish authoritative gameplay presentation state` | 24 | Typecheck; build; 71 focused game/server tests |
| 2 | `46ecbb7` | `feat: add shared responsive presentation primitives` | 18 | Typecheck; build; 22 shared-presentation tests |
| 3 | `1636e38` | `feat: streamline phone gameplay flow` | 20 | Typecheck; build; 196 phone tests |
| 4 | `375976c` | `feat: synchronize host command board presentation` | 22 | Typecheck; build; 112 host tests |
| 5 | `48cb75c` | `test: harden reconnect and release campaign coverage` | 24 | Typecheck; 128 reconnect, server, single-player, stress, and compatibility tests |

The documentation commit is intentionally last so this manifest can record the final runtime and QA commit hashes. No binary QA evidence or reference media is included in any commit.

## Validation policy

Each staged group receives `git diff --cached --check`, prohibited-path inspection, and a focused suite. Runtime dependency groups receive typecheck/build verification where the complete working tree permits it. Final verification uses the canonical clean-process command set and must retain the validated 1,548-test aggregate total.

## Push policy

P16 creates local commits only. It does not push, update an upstream branch, or open a pull request.
