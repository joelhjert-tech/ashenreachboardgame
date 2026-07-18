# Live-play defect reproduction

Baseline: `fix/equipment-map-ui` at `f2ba923`. Reproduction used server-authoritative QA fixtures, reducer tests, and the real phone/TV clients. The pre-existing edit to `scripts/validate-six-scenario-e2e.ts` was recorded separately and was not touched.

| # | Mode / trigger | Before state | Visible symptom | Root cause | Expected boundary |
|---|---|---|---|---|---|
| 1 | Co-op lobby configuration | Host mode form | Co-op always submitted four seats | The phone hardcoded every non-solo configuration to four, even though the server/session model supports six | Host chooses 2–6; seventh join is rejected authoritatively |
| 2 | TV encounter and movement transitions | Any current encounter | Flips and journey steps passed too quickly at couch distance | Timing values were split between short CSS and component-local timeouts | Shared, readable host timing tokens; reduced motion remains immediate |
| 3 | Enemy Threat battle | `activeResolution` / encounter projection | Older-looking presentation appeared in live play | The live chamber was mounted, but pre-result states lacked projected effective stats and the shell still used generic/legacy-style labels | Every enemy uses the current battle chamber from reveal through result |
| 4 | Hazard/anomaly/tile challenge | Non-enemy resolution | Presentation hierarchy differed from battle | Encounter classification and heading were derived from inconsistent fallback strings | One chamber shell with distinct BATTLE, HAZARD, ANOMALY, and TILE CHALLENGE labels |
| 5 | Join form/API | Submitted display name | Long names overflowed six-player host layout | No shared current-name rule existed between phone and server | Trim; accept 1–8 Unicode code points; reject empty or 9+ without truncation; preserve legacy imports |
| 6 | TV movement | Projected multi-sector route | Token appeared to jump too quickly | The TV used one short interval for all segments and did not distinguish ring crossings | Animate the exact projected route, one segment at a time, with cross-ring emphasis |
| 7 | Phone active/inactive phases | Turn/phase projection changes | Correct tab was not obvious | Auto-tab logic was embedded separately from player-facing guidance and had no required-tab treatment | One projection-derived guidance model and required-tab highlight; inactive phones get public-safe waiting copy |
| 8 | Equipped passive modifier | TV operative and battle | Item card showed a bonus while TV showed base stats | TV projection exposed base stats only | Server projects a resting effective-stat breakdown using exact equipped instances and active suppressions |
| 9 | Startup / route traversal | Initial queues or intermediate route state | Encounter framing could appear before authoritative arrival | Presentation and tests did not explicitly protect clean startup; route animation followed final state too aggressively | Startup contains no encounter; the server creates encounters only at final arrival; TV animation never dispatches gameplay |
| 10 | Successful authored Salvage reward | Encounter result finalization | Reward could be visually replaced by another encounter | Cleared encounters re-entered `sector` when the printed lane deck still contained cards | Apply exact authored reward once, retain result, then open the canonical destination action or broadcast flow |
| 11 | Co-op victory with cards still in lane deck | Continue resolution | Several enemies/hazards could follow one victory | `getPhaseAfterResolution` treated remaining deck inventory as another arrival draw | A completed encounter is removed once; no new draw occurs merely because the deck is non-empty |

## Reproduction evidence

- The original `shouldContinueClearedEncounterSector` branch returned to `sector` when `encounterDecks.threat.length > 0`; automatic sector processing then drew a new card.
- The regression fixture resolves `latchspire-raider`, verifies its exact `+1 Salvage`, leaves `ash-cinder-runt` in the deck, and verifies zero `ENCOUNTER_DRAWN` events.
- Current session construction is separately asserted to have no encounter, resolution, pending effect, or draw event.
- Browser baselines and corrected captures use the same QA endpoint and production phone/TV components; fixtures pass through normal projections rather than client-authored outcomes.

## Data/privacy observations

Phone waiting guidance names the acting player but never exposes another seat's battle reaction or private choice. The TV receives only calculated public stats, not private inventory choices. Animation state consumes projected routes and resolution stages and sends no intent.
