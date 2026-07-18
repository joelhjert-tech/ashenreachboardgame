# Broken Concordance QA Index

## Fixture

`scripts/capture-broken-concordance-qa.ts` creates a normal three-seat co-op session, completes ordinary operative/mission setup through phone controls, starts the game, then applies the environment-gated `cooperative-assistance` fixture through the same authoritative state, projections, and UI components. The endpoint remains unavailable unless `--qa-fixtures` is used.

Phone viewport: 390×844. TV viewports: 1920×1080 and 1366×768. Reduced-motion captures use `prefers-reduced-motion: reduce`.

## Phone captures

All paths are under `reports/ui/broken-concordance/phone/`.

| File | State reviewed |
|---|---|
| `active-helper-selector-390x844.png` | Eligible teammates and intrinsic contributions; Roll Solo / Ask controls |
| `active-two-helpers-pending-390x844.png` | Active response status |
| `requested-helper-accept-decline-390x844.png` | Requested helper consent |
| `requested-helper-second-seat-390x844.png` | Independent second helper consent |
| `active-one-helper-accepted-390x844.png` | Proceed with accepted subset |
| `helper-accepted-390x844.png` | Recorded helper response |
| `active-ready-to-roll-390x844.png` | Locked single authoritative roll |
| `assisted-result-breakdown-390x844.png` | Active stat, active die, each helper, final total |
| `scenario-node-stabilization-390x844.png` | Mandatory-helper node action |

## TV captures

All paths are under `reports/ui/broken-concordance/tv/`, with both viewport suffixes unless noted.

| Prefix | State reviewed |
|---|---|
| `assistance-requested-*` | Public pending helper status; no controls |
| `one-helper-accepted-*` | One accepted / one pending |
| `two-helper-calculation-*` | Two locked contributions; no helper dice |
| `two-helper-calculation-*-reduced-motion.png` | Same information without motion dependency |
| `assisted-battle-result-*` | Winner, active stat, roll, Help, target, and public outcome |
| `scenario-node-stabilization-*` | Canonical board, three node markers, center lock, public progress |

## Review results

- No horizontal overflow at any captured viewport.
- Primary phone actions remain visible above the bottom safe area.
- TV does not expose Accept/Decline, eligible private options, missions, items, or raw state identifiers.
- Helpers never receive dice visuals.
- Result arithmetic is internally consistent after the corrective pass.
- Reduced motion removes animation dependency without removing status or values.
- No browser console or page errors occurred.

Scenario eligibility, three node completions, center locking, all confrontation stages, final victory once, failure pressure, save/reconnect, wrong-seat/stale/duplicate responses, and one-roll-per-side behavior are exercised by automated tests rather than fabricated UI screenshots.
