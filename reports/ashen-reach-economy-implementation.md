# Ashen Reach Economy Implementation

## Implemented boundary

Salvage is the sole ordinary currency; Trophies fund permanent stat growth; completed Contracts fund the rare Artifact exchange. Save version remains 2 and legacy v0-v2 imports remain supported.

## Runtime changes

- Reworked `trade-missions-for-artifact` into a persisted, owner-private stock reveal of up to two eligible Artifacts.
- Deferred Contract spending until authoritative selection; the accepted event carries the exact three stored Contract IDs.
- Added reducer validation for three unique, currently owned IDs and Artifact-tier selection.
- Cleared the reveal after completion so stale/replayed selection cannot grant or spend twice.
- Removed current `risk-action` service, closing the Salvage-funded Artifact purchase route.
- Hid Artifact options from TV and other phones while preserving a public-safe exchange service/result.
- Made Artifact-tier gear non-sellable.
- Replaced the solo empty-loadout Artifact fallback with normal Equipment.
- Added canonical economy validation and a deterministic analysis command.

## Presentation

- Phone shop distinguishes Buy from Choose, explains spend timing, and shows `N/3 completed Contracts`.
- Phone progression shows Trophy sources, upgrade costs, completed Contract count, and the exchange rule.
- TV uses Completed Contract terminology and never receives private Artifact options.

## Transaction rules

| Transaction | Commit point | Failure behavior | Reconnect behavior |
|---|---|---|---|
| Buy Equipment | Accepted exact stock entry | No spend/no item | Cleared stock cannot replay |
| Sell Equipment | Accepted exact owned instance | No removal/no gain | Removed instance cannot resell |
| Pay service | Accepted server service | Insufficient funds rejects | Completed action does not replay |
| Trophy advancement | Accepted current stat/cost tuple | Stale/capped/poor rejects | Trophy pile/value persist |
| Artifact exchange | Accepted eligible Artifact choice | Pending Contracts/options remain | Pending reveal restores; completed reveal is gone |

## Critique seats

- **New player:** the inventory now states what Trophies and Contracts do; shop verbs distinguish ordinary Buy from rare Choose.
- **Optimizer:** no Salvage Artifact route, Artifact resale, duplicate Contract ID, stale choice, or public option oracle remains.
- **Family/casual:** the exchange is two steps (reveal, choose) with no reservation bookkeeping visible to the player.
- **Rules lawyer:** ownership, exact IDs, affordability, commit timing, one-option/empty-pool fallback, replay, and reconnect are explicit.

## Files and verification

Implementation touches the shop server/reducer/action types, shop availability rules, starting-loadout constant, phone/TV economy presentation, client types/styles, validation, focused tests, analysis script, and these reports.

- Content validation: passed (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifact cards, 24 followers).
- TypeScript typecheck: passed.
- Focused economy regression: 232 tests passed.
- Engine, rules, integration, and client suites: passed independently.
- Aggregate suite: 1,236 tests across 114 files passed.
- Asset audit: 418/418 present; zero missing, invalid, placeholder, or release-blocking assets.
- Production build: passed (143 modules transformed).
- Deterministic economy analysis: passed against canonical content.
- Browser QA: six captures completed without horizontal overflow, console errors, or private Artifact-option leakage.

## QA review

Screenshots: `reports/ui/economy/`.

The visual pass covered the 390x844 owner flow with insufficient Contracts, exchange eligibility, two private Artifact choices, confirmation, and the reconnect-restored Contract ledger, plus the 1366x768 TV public result.

The first capture exposed three presentation faults: normal service controls competed with the private choices, the confirmation action rendered below the visible viewport, and the TV described the completed exchange as a generic item purchase. The corrective pass hides service controls while stock is pending, uses a compact Artifact-exchange header, fixes the public result to `Artifact gained`, and pins a safe-area-aware confirmation panel above the phone dock. The final confirmation screenshot shows both Cancel and Confirm Artifact above the fold; the TV screenshot contains the selected public result but no private options.
