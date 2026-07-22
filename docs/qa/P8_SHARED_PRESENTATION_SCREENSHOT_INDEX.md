# P8 Shared Presentation Screenshot Index

## Current P8 archive

The final P8 capture is stored in `docs/qa/p8-shared-presentation/`. It contains 33 screenshots and two curated recordings. All captures use server-projected fixtures except the explicitly development-only fallback/long-copy harness. `capture-results.json` records viewport, overflow, image containment, touch targets, live regions, focus, and console results for every image.

### Phone

| Required state | Current evidence |
|---|---|
| Setup selection | `phone/setup-selection-430x932.png` |
| Required action | `phone/required-action-430x932.png` |
| Movement selection | `phone/movement-selection-430x932.png` |
| Battle comparison | `phone/battle-comparison-430x932.png` |
| Battle result | `phone/battle-result-430x932.png` |
| End Turn | `phone/end-turn-430x932.png` |
| Shop offer | `phone/shop-offer-430x932.png` |
| Shop result | `phone/shop-result-430x932.png` |
| Player card | `phone/player-card-430x932.png` |
| Relevant Now | `phone/relevant-now-430x932.png` |
| Full inventory | `phone/full-inventory-430x932.png` |
| Long rules/content | `phone/long-rules-430x932.png` and deterministic fixture below |
| Missing art | `phone/shared-missing-art-and-long-copy-360x800.png`, `390x844.png`, `430x932.png` |
| Reconnect restoration | `phone/reconnecting-restored-430x932.png`; active transition evidence remains in P4 |
| Blocked state | `phone/blocked-state-430x932.png` |
| Reduced motion | `phone/reduced-motion-430x932.png` |

### Host TV

| Required state | Current evidence |
|---|---|
| Lobby | `tv/lobby-1600x900.png` |
| Movement markers | `tv/movement-markers-1600x900.png` |
| Movement journey | P2 recordings listed below |
| Encounter focus | `tv/encounter-focus-1600x900.png` |
| Battle comparison | `tv/battle-comparison-1600x900.png` |
| Result | `tv/battle-result-1600x900.png` |
| Operative handoff | `tv/operative-handoff-1600x900.png` |
| Shop | `tv/shop-overlay-1600x900.png` |
| Public operative summary | `tv/public-operative-summary-1600x900.png` |
| Missing art | `tv/shared-missing-art-and-long-copy-1366x768.png`, `1600x900.png`, `1920x1080.png` |
| Reconnect restoration | `tv/reconnecting-restored-1600x900.png`; active transition evidence remains in P4 |
| Reduced motion | `tv/reduced-motion-1600x900.png` |

### Recordings

- `recordings/cross-feature-phone-430x932.webm`
- `recordings/cross-feature-tv-1600x900.webm`
- `../p2-movement/recordings/short-route-1920x1080.webm`
- `../p2-movement/recordings/medium-route-1920x1080.webm`
- `../p2-movement/recordings/long-route-1920x1080.webm`
- `../p2-movement/recordings/special-connection-1920x1080.webm`
- `../p3-encounter-battle/recordings/straightforward-combat.webm`
- `../p3-encounter-battle/recordings/two-die-modified-combat.webm`
- `../p4-waiting-handoff/recordings/result-to-end-turn.webm`
- `../p4-waiting-handoff/recordings/human-to-human-handoff.webm`
- `../p5-setup-lobby/recordings/join-through-ready.webm`
- `../p6-shop-presentation/recordings/shop-entry-browse-purchase.webm`
- `../p7-inventory-player-card/recordings/player-card-inventory-relevance.webm`

## Visual review and corrective pass

The first render exposed four shared defects: a broad touch-target selector compressed large selection cards, filter controls were below 44 px, the compact active tab was below 44 px, and the shop purchase target settled at 43 px. The broad selector was removed and replaced by targeted minimum-size rules. A development-only fixture was added because the existing missing-art screenshot did not visibly prove deterministic fallback behavior.

The corrected archive shows:

- no page-level horizontal overflow;
- no image escaping its frame;
- no undersized measured phone controls;
- stable card and portrait ratios;
- readable wrapping for long names, mechanics, and button labels;
- visible, non-technical missing-art fallbacks;
- no private option data on TV;
- no console errors.

## Fixture and privacy notes

Normal gameplay captures are driven through `/api/session` and the development QA fixture endpoint, so they use the same projections and components as gameplay. `?qaPresentation=p8` is compiled behind `import.meta.env.DEV`; it demonstrates only shared presentation failure states, contains no gameplay authority, and is inaccessible in a production build.
