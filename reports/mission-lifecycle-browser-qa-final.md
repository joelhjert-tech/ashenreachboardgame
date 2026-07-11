# Mission lifecycle browser QA final

## Scope

Browser verification followed the QA fixture extension in `8e05aea` and exercised the normal phone shop-service intent and authoritative server trade path. The fixture only seeded deterministic `completedContracts` ledger IDs and placed the authenticated active operative at the clear relic dealer sector.

## Browser result

| Check | Result |
| --- | --- |
| Fresh single-player room and active phone | Pass |
| TV viewport `1366x768` | Pass |
| Phone viewport `390x844` | Pass |
| Seed 2 completed Missions at relic dealer | Pass |
| Phone and TV show `2/3` | Pass |
| Trade blocked below 3 | Pass |
| Seed exactly 3 completed Missions | Pass |
| Trade available at 3 | Pass |
| Execute trade from phone | Pass |
| Exactly one Artifact-tier item granted | Pass: `Void Key` appeared under `Artifacts / Relics`, count 1 |
| Exactly three ledger entries consumed | Pass: public progress changed from `3/3` eligibility to `0/3`; authoritative reducer coverage verifies ID consumption |
| Repeat trade blocked | Pass |
| TV and phone agree | Pass: `2/3` before trade, Artifact outcome after trade, `0/3` afterward |
| Browser console/page errors | Pass: none |
| Canvas count | Pass: phone 0, TV 0 |
| Dev server cleanup | Pass: QA-owned server stopped after the run |

## Fixture guard behavior

- The endpoint returns `404` unless `ASHEN_REACH_QA_FIXTURES=1` enables fixtures at server startup.
- The endpoint requires the current room code and a valid signed seat token.
- The fixture accepts only `0`, `1`, `2`, or `3` completed ledger entries through its typed contract.
- It seeds deterministic ledger IDs on the authenticated active character, clears the selected relic dealer sector, moves the game to the normal action phase, and broadcasts fresh public/private projections.
- It does not grant an Artifact or execute a trade. The browser uses the normal phone `SHOP_SERVICE_REQUESTED` flow.
- Normal relic trade legality still uses the current `completedContracts` ledger. Event history is not spendable currency.

## Evidence kept uncommitted

The QA harness, JSON output, logs, and screenshots remain under `qa-artifacts/` and are intentionally not staged. Relevant captures include:

- `qa-artifacts/mission-lifecycle-phone-2-of-3.png`
- `qa-artifacts/mission-lifecycle-tv-2-of-3.png`
- `qa-artifacts/mission-lifecycle-phone-artifact.png`
- `qa-artifacts/mission-lifecycle-tv-post-trade.png`

Relic source files and other existing QA screenshots were not staged.

## Verification

- `npm.cmd run validate:content` — pass
- `npm.cmd run typecheck` — pass
- `npm.cmd run test:engine` — pass, 240 tests
- `npm.cmd run test:client` — pass, 218 tests
- `npm.cmd run test` — pass, 650 tests
- `npm.cmd run audit:assets` — pass, 404/404 present, no missing, invalid, placeholder, or tier-separation issues
- `npm.cmd run build` — pass
- `git diff --check` — pass
