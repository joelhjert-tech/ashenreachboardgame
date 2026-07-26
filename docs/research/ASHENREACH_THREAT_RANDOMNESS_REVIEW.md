# Ashenreach Threat Randomness Review

Date: 2026-07-26

## Scope

This review covers the 109 active Threat cards, the 49 canonical sectors, all 58 printed Threat-icon slots, the authoritative server draw path, preview abilities, persistence, reconnect, and the service gate. It does not alter card statistics, authored rewards, penalties, lane assignment, or printed board icons.

## Previous behavior

Normal arrival draws selected randomly from the destination sector's local Threat list. A twelve-card recent-history filter reduced immediate repeats only when a fresh local alternative existed.

The content/runtime audit found:

- 109 active Threats: 26 red, 35 blue, and 48 yellow.
- 58 printed Threat-icon slots across 41 sectors.
- 12 printed-Threat sectors with an empty local Threat pool.
- 16 printed lane slots with no eligible local card.
- 18 additional lane slots with only one or two eligible local cards.
- The same card appeared in multiple local sector pools, so global reachability and cycle uniqueness were not guaranteed.
- An observed six-player campaign revealed Suture Storm twice.
- The former play-feel analyzer mixed Threats with unrelated local anomaly, contract, artifact, and escalation pools, so it did not model the live arrival resolver.

The draw itself was server-random, but the small and incomplete pools made repetition likely and could produce empty draws.

## Implemented model

The server now owns one private shuffled bag per lane:

| Lane | Active cards | Draw rule |
|---|---:|---|
| Red | 26 | Without replacement; reshuffle after card 26 |
| Blue | 35 | Without replacement; reshuffle after card 35 |
| Yellow | 48 | Without replacement; reshuffle after card 48 |

The three bags are shared by every operative. A new game resets them; reconnect and save restoration preserve their exact state. Legacy version-2 saves create a missing bag lazily and place recently encountered cards at the bottom of that first restored cycle.

Every printed icon now has a valid draw. The selected card and its final result remain authoritative events, while bag preparation is recorded internally. Phone and TV projections do not include the bag object or its order.

## Arrival and service lifecycle

Each arrival tracks its own ID, ordered lane rules, revealed card IDs, and final outcomes. A result is recorded only after authoritative rerolls and reactions finish.

- Enemy victory counts as success.
- Hazard success counts as success.
- A final failed result counts as failure.
- The service state is not final until the last drawn Threat resolves.
- All successes unlock services for that visit.
- Any failure locks service-category actions for that visit.
- A later arrival starts a new gate.
- Recurring tile challenges and scenario tests do not contribute to the gate.
- Non-service actions retain their independent legality.
- A no-Threat service sector passes the Threat requirement after its other mandatory arrival work finishes.

Returned enemies are explicit persistent sector opposition. They resolve before a new global draw of the same lane. The Devourer scenario records consumed sector IDs explicitly instead of inferring consumption from obsolete local deck contents.

## Preview accuracy

- Relay Ghost reads the actual next Blue bag card without consuming or reordering it.
- Fandiablos reads the actual upcoming Threat for the next arrival lane. A fixed returned Threat takes priority; otherwise it reads the next global bag card.
- Neither projection exposes the cards behind the previewed card.

## Post-change simulation

The play-feel analyzer now simulates real printed arrival lanes against shared without-replacement bags. In 500 seeded ten-arrival runs:

- Duplicate title before bag exhaustion: 0.0%.
- Authored Threat mix encountered: 58.1% enemies and 41.9% hazards.
- Modeled all-Threat service unlock rate: 85.3%.
- Average distinct lane/type signals across the first ten arrivals: 4.86.

The service percentage is a play-feel model using a fixed representative operative total; it is not a balance claim. Actual success remains determined by authoritative character state, dice, modifiers, reactions, and card difficulty.

## Verification targets

- Two seeded complete cycles per lane contain no within-cycle duplicate.
- The union of the three bags is exactly the 109-card active catalog.
- All 58 printed slots return a card of the requested lane.
- The bag is shared across seats and absent from public/private client payloads.
- First-, middle-, and final-card failure all lock services after queue completion.
- A final authoritative reroll-converted success records as success.
- Replayed outcome events do not duplicate arrival results.
- Persistent opposition precedes the global draw.
- Existing artwork is unchanged.

## Physical S21 review

The production flow was exercised on the connected Samsung S21+ through its real
Chrome controller, using visible controls and authoritative server results:

1. Created a one-player Broken Seal session.
2. Chose a Signal piece, operative, and starting Mission.
3. Rolled a server-authored movement result of six.
4. Selected Kettleward Foundry through the six-sector canonical route.
5. Acknowledged the approach result.
6. Drew Ash-Court Duelist from the shared Red bag and resolved its Command
   battle normally.
7. The final battle failed and the authoritative consequence was applied.
8. After acknowledgement, the Foundry service screen remained locked with:
   “Service locked — clear every Threat successfully during this arrival.”

The failed visit did not stall the active turn or create a second draw. This
provides physical-device evidence for the failure gate; deterministic tests
cover the corresponding all-success, multi-card, later-arrival, reconnect, and
reroll-converted-success paths. Raw screenshots and UI dumps remain ignored
under `.tmp-playtest/s21-threat-shuffle-service-gate`.

## Validation result

- Content validation: passed.
- TypeScript typecheck: passed.
- Engine and rules: 74 files, 836 tests passed.
- Server integration: 46 files, 394 tests passed.
- Client: 69 files, 539 tests passed.
- Scenario/player matrix: all 40 authored combinations passed.
- Production build: passed.
- Asset audit: 511 of 511 present; zero missing, invalid, or placeholder assets.
