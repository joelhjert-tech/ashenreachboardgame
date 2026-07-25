# S21 Full-Game Mechanics and UI Campaign

Date: 2026-07-25

Status: complete

## Outcome

Seven genuine games reached an authoritative victory or defeat with a physical Samsung Galaxy S21+ acting as seat one. The campaign covered every authored scenario, player counts one through six, and a full Rivalry game. Supporting seats used rendered phone controllers and only controls exposed by their private server projections. A rendered 1920×1080 TV host remained open throughout.

The campaign completed 1,158 legal UI actions in 518,466 ms. It produced 186 screenshot files and one selected physical-device recording. There were no phone or TV console errors, failed requests, observed horizontal overflows, Canvas nodes, duplicated reconnect effects, or detected public-projection privacy leaks.

The seven outcomes were one victory and six defeats. This is correctness evidence, not balance evidence.

## Test surfaces

| Surface | Configuration | Purpose |
|---|---|---|
| Seat one | Samsung Galaxy S21+, Chrome 150.0.7871.181, 384×722 CSS px, DPR 2.8125 | Real phone setup, choices, movement, resolutions, inventory actions, acknowledgements, and reconnect |
| Seats two through six | Separate rendered mobile browser pages | Legal supporting-player actions through private projections |
| Shared host | Rendered browser at 1920×1080 | Public movement, challenge, battle, pressure, handoff, waiting, and endgame presentation |

The device serial, join tokens, credentials, private Agenda text, and unnecessary personal data are not included in checked-in evidence.

## Full-game results

| Scenario | Players | Mode | Outcome | Actions | Duration | Reconnect evidence |
|---|---:|---|---|---:|---:|---|
| The Broken Seal | 1 | Co-op | Defeat | 72 | 38.9 s | Result-ready restored |
| The Throne of Ash | 2 | Rivalry | Defeat | 115 | 43.7 s | Waiting state restored |
| The Mirror of False Heroes | 3 | Co-op | Defeat | 218 | 166.3 s | Movement selection restored |
| The Devourer Beneath | 4 | Co-op | Victory | 41 | 53.4 s | Pending choice restored |
| The Dying Star | 5 | Co-op | Defeat | 213 | 70.6 s | Matrix and focused reconnect coverage |
| The Broken Concordance | 6 | Co-op | Defeat | 321 | 92.1 s | Matrix and focused reconnect coverage |
| The Labyrinth Engine | 3 | Co-op | Defeat | 178 | 53.6 s | Matrix and focused reconnect coverage |

Action cadence includes intentional reveal, animation, and decision waits; it is not a network-only latency measurement. Median observed gaps ranged from 165 to 646 ms. The largest gap was 6,399 ms during the one-player game and corresponded to a full presentation/decision interval rather than a failed request.

## Mechanics review

### Setup and identity

The physical phone completed piece, operative, and mission setup through the staged interface. The supporting seats completed the same authoritative setup through their rendered controllers. Seat identity, private controls, turn ownership, and six-player ordering remained stable.

### Movement and arrival

Server-authored movement rolls, legal destination selection, confirmation, canonical routes, cross-reach guidance, arrival ordering, and result acknowledgement all occurred through normal UI controls. No client-generated destination, route, or dice result was used. Reconnecting during movement selection restored the authoritative choice state without replaying completed travel.

### Encounters, challenges, and battles

The campaign naturally exercised Tile Challenges, hazards, enemy battles, cooperative assistance, battle arithmetic, rewards, setbacks, and result-ready gates. Phone challenge/battle presentation and public TV totals stayed aligned with the authoritative state. Arrival preceded the challenge or battle presentation.

### Inventory, shops, and progression

Inventory and shop surfaces were reached in the campaign. Equipment, Followers, automatic equip behavior, objectives, mission state, Contracts, Scars, pressure, scenario progression, and endgame have additional deterministic coverage in the passing client, integration, engine, and rules suites. A Scar path occurred naturally in The Dying Star.

Afflictions and every rare card/item combination did not occur naturally in seven games. Their correctness evidence comes from the focused deterministic suites; this campaign does not claim natural-draw coverage for every authored record.

### Waiting, handoff, and multiplayer

Waiting and handoff behavior was observed from two through six players. The six-player game completed 321 legal actions with stable seat ordering and no observed phone or TV overflow. Rivalry private state remained absent from the public TV projection. Reconnect during a waiting state restored the correct actor and required action.

### Final confrontation and endgame

All seven games terminated naturally through authoritative victory or defeat. The 40-combination matrix separately validated the authored victory and defeat paths for each eligible scenario/player-count pairing.

## Reconnect and privacy evidence

Physical-device reconnect checks covered:

- Movement selection
- A pending owner choice
- A result-ready acknowledgement
- A multiplayer waiting state

Restoration returned the latest stable server state. The reviewed traces showed no repeated reward, penalty, movement, reveal, or result transition.

The matrix also round-tripped the version 2 save representation and rescanned each TV projection for forbidden private keys. All 40 combinations passed. No save-version, protocol, or visibility-boundary change was made.

## Defects found and fixed

| Symptom | Cause | Fix | Commit |
|---|---|---|---|
| A result verdict could lose stable phone presentation | The result gate did not retain all resolved verdict state across its lifecycle | Stabilized the result gate and server acknowledgement behavior; added client and integration regressions | `7875bcd` |
| Cooperative assistance could continue visually after resolution and obscure the result | Assistance presentation took precedence over the resolved result gate | Restored result-first routing after assisted resolution | `d87e08f` |
| A recalled operative could see a false Continue path instead of replacement recruitment | General continuation routing outranked recruitment | Prioritized authoritative recruitment, including orphaned recovery results | `a90be5b` |
| A private Scar choice could be hidden during battle presentation | Battle required-choice routing omitted pending Scar choices | Included owner-only Scar decisions in battle routing | `dc19a65` |
| Threshold Scar replacement could be bypassed by recruiting first | Recruitment was accepted while an owner Scar choice remained pending | Required the Scar choice before replacement in both phone routing and engine validation | `6680fd4` |

Each fix is server-authoritative where mechanics are involved and includes focused regression coverage. No rule probabilities, rewards, artwork, save version, transport shape, or privacy boundary changed.

## Scenario/player-count matrix

The authored eligibility matrix contains 40 combinations:

- The Broken Seal: one through six players
- The Throne of Ash: two through six players
- The Mirror of False Heroes: one through six players
- The Devourer Beneath: one through six players
- The Labyrinth Engine: one through six players
- The Dying Star: one through six players
- The Broken Concordance: two through six players

All 40 passed setup, one full authoritative handoff round, waiting-state checks, version 2 save/reconnect restoration, public-projection privacy scanning, and scenario-specific victory and defeat validation. There were zero authored/runtime eligibility mismatches.

This matrix is structural and authoritative engine/server evidence. The seven rendered campaigns are the full-game UI evidence.

## UI and presentation findings

- The S21 setup and in-game phone surfaces remained within the 384×722 viewport.
- Sticky movement and result actions remained reachable.
- Result-ready acknowledgements remained present until the authoritative player action.
- Challenge, battle, and owner-choice routing recovered correctly after the five focused fixes.
- TV movement, arrival, challenge, battle, pressure, waiting, handoff, and endgame presentation remained synchronized with public state.
- The six-player host retained distinct seat identity and readable handoff state.
- No unexplained console or network errors were recorded.
- No Canvas or WebGL node was introduced.

## Validation

| Check | Result |
|---|---|
| Content validation | Passed: 18 characters, 71 gear, 109 threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations, 30 Afflictions |
| Typecheck | Passed |
| Focused result, assistance, recruitment, Scar, reconnect, and room-server regressions | Passed |
| Client suite | Passed: 68 files, 531 tests |
| Server integration suite | Passed: 45 files, 387 tests |
| Engine/rules suite | Passed: 73 files, 829 tests |
| Rules-only suite | Passed: 14 files, 106 tests |
| Scenario/player-count matrix | Passed: 40 of 40 |
| Production build | Passed: 620 modules |
| Asset audit | Passed: 511 present, 0 missing, 0 invalid, 0 placeholders |
| Artwork diff | No artwork added, removed, or modified |

The client suite emitted only the expected missing-art warnings from deliberate fallback fixtures. They were not live campaign errors, and the asset audit was clean.

## Evidence

Privacy-safe consolidated data is in `docs/qa/S21_FULL_GAME_CAMPAIGN_SUMMARY.json`.

Raw screenshots, traces, per-game results, matrix output, layout observations, and the selected S21 recording are retained under the ignored directory:

`.tmp-playtest/s21-full-game-campaign`

The selected recording is:

`.tmp-playtest/s21-full-game-campaign/throne-of-ash-2p-rivalry/waiting-reconnect-s21.mp4`

Campaign tooling is provided by:

- `scripts/run-s21-full-game-campaign.ts`
- `scripts/validate-s21-scenario-player-matrix.ts`

## Concrete remaining risks

1. TV review used a rendered 1920×1080 host; physical room-distance TV readability was outside this campaign.
2. The campaign used one physical Android model and Chrome build, so it does not prove behavior across other phone hardware or browsers.
3. Seven random outcomes are insufficient for statistical balance conclusions.
4. Rare mechanics, including naturally drawn Afflictions and every individual item or Follower, were supplemented by deterministic tests rather than all appearing in the seven natural playthroughs.
5. Only one selected physical-device sequence was recorded as video; the remaining physical evidence is screenshots and traces.
