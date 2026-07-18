# Card Category QA Index

## Fixture

The environment-gated `card-category` fixture uses normal `activeResolution` projection fields and existing card assets. It does not select cards or outcomes on the client and is unavailable unless QA fixtures are enabled. Runtime proof is separately covered by reducer, queue, reachability, and projection tests.

## Captures

All new captures are under `reports/ui/card-categories/`.

| Category | Phone 390×844 | TV 1920×1080 | TV 1366×768 | Review |
|---|---|---|---|---|
| Enemy | `phone-enemy-390x844.png` | `tv-enemy-1920x1080.png` | `tv-enemy-1366x768.png` | Opposed Battle remains unchanged. |
| Hazard | `phone-hazard-390x844.png` | `tv-hazard-1920x1080.png` | `tv-hazard-1366x768.png` | Test language; no Trophy or enemy roll framing. |
| Event | `phone-event-390x844.png` | `tv-event-1920x1080.png` | `tv-event-1366x768.png` | EVENT identity survives Threat projection. |
| Anomaly | `phone-anomaly-390x844.png` | `tv-anomaly-1920x1080.png` | `tv-anomaly-1366x768.png` | Distinct label, art, angular frame, and TEST result. |
| Escalation | `phone-escalation-390x844.png` | `tv-escalation-1920x1080.png` | `tv-escalation-1366x768.png` | Public shared-world result; no Heat output. |
| Persistent challenge | `phone-persistent-390x844.png` | `tv-persistent-1920x1080.png` | `tv-persistent-1366x768.png` | Result explicitly states that the authored challenge remains. |

Existing scenario selection captures remain at:

- `reports/ui/setup-flow/final/phone-scenario-selection-390x844.png`
- `reports/ui/setup-flow/final/tv-scenario-selection-1920x1080.png`

## Review results

- No horizontal overflow at any captured viewport.
- No browser console or page errors.
- Correct card art resolved for all six fixture stages.
- Owner-private Contract projection is covered by automated owner/other/TV tests and is not exposed in screenshots.
- First-pass defects corrected: stale Action tab, “Resolve battle first,” duplicate current prompt, concatenated category tags, Attack/Defense dice, host VS framing, and “wins” wording for tests.
- Remaining limitation: no standalone canonical choice card exists, so a fake choice-card screenshot was not fabricated.
