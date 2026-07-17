# Legacy Contract Promotion Decision

Baseline: `84acb49 archive-promoted-legacy-threat-assets`

Purpose: choose the strongest legacy contract/mission images for a future import without changing content, assets, validation caps, or gameplay in this pass.

## Decision Summary

- Legacy contract candidates reviewed: 12 mission images plus `card_back_contract.png`.
- Active contract count: 21.
- Validation cap: 20-30 contracts.
- Available slots under current cap: 9.
- Recommendation: keep the current cap and promote exactly 9 contracts in a later implementation pass.
- Cap change recommendation: no cap increase for this pass. The 30-card ceiling keeps the starting mission/contract pool readable and preserves room for deliberate future contract retirement or replacement.
- Heat decision: Heat remains deprecated/reference-only. No `/assets/cards/heat/` category should be created.
- Assets/content changed in this pass: none.

## Contract Cap Check

The repository validator currently enforces:

| category | current count | validation range | available slots | decision |
|---|---:|---:|---:|---|
| contracts | 21 | 20-30 | 9 | Keep cap; choose 9 of 12 legacy mission images. |

The cap should stay for now because the active contract system is still intentionally compact: contracts are offered as starting missions and as public pool choices, and each extra card increases setup reading load. A cap increase would be a separate design decision with balance, selection-frequency, and starting-mission testing implications.

## Selection Criteria

Candidates were ranked by:

1. Visual usefulness as active mission art.
2. Low overlap with current active contracts.
3. Strong Ashen Reach lore fit.
4. Spread across mission roles and factions/themes.
5. Compatibility with existing `defeatCount` and `spaceTextResolved` contract objectives.
6. No need for new systems, movement changes, scenario changes, or Heat.

Target mix if cap remains:

- 2 combat / clear missions
- 2 route / navigation missions
- 2 salvage / recovery missions
- 1 escort / protection mission
- 1 choir / signal mission
- 1 stabilize / cleanse mission

## Recommended 9 To Promote

| legacy filename | proposed active ID | proposed mission name | faction/theme | role | mechanic pattern using existing system | likely reward | reason |
|---|---|---|---|---|---|---|---|
| `mission_break_the_raider_chain.png` | `break-the-raider-chain` | Break the Raider Chain | Kaldr Dominion / road war | combat mission | `defeatCount` 2, framed as breaking raider control on a road lane | salvage or trophy sequence | Strong combat image, clear objective, low rules risk. |
| `mission_hunt_breachborn.png` | `hunt-breachborn` | Hunt the Breachborn | Veyr Clans / breach hunt | combat mission | `defeatCount` 2 or 3, focused on breachborn/red hostile threats | scar-safe reward, salvage, or simple gear | Adds monster-hunt flavor distinct from raider combat. |
| `mission_map_broken_paths.png` | `map-broken-paths` | Map Broken Paths | Pale Cartels / route intelligence | route mission | `spaceTextResolved` using an existing route/shortcut effect key such as `outer_brokenCausewayShortcut` or `middle_webglassFracture` | route note or salvage sequence | Strong route art and supports mission-marker play without changing movement. |
| `mission_gatefire_vigil.png` | `gatefire-vigil` | Gatefire Vigil | Kaldr Dominion / gate watch | route / stabilize mission | `spaceTextResolved` at an existing gate/trial effect key such as `inner_gateOfCindersTrial` | trophy or scenario-safe support reward | Excellent visual identity; gate focus gives route/gate variety without altering gates. |
| `mission_salvage_the_bellframe.png` | `salvage-the-bellframe` | Salvage the Bellframe | Veyr Clans / salvage rite | salvage mission | `spaceTextResolved` on a salvage/bargain effect key or `defeatCount` if tied to red blockers | salvage sequence or standard equipment | Clear salvage fantasy and strong object art. |
| `mission_restart_void_relay.png` | `restart-void-relay` | Restart the Void Relay | Meridian Compact / signal repair | recovery mission | `spaceTextResolved` using `outer_relayCrew` or another relay/signal action | Signal equipment or route note | Fills repair/recovery niche and gives Compact another non-combat contract. |
| `mission_pilgrim_convoy.png` | `pilgrim-convoy` | Pilgrim Convoy | Pale Cartels / convoy escort | escort / protection mission | `spaceTextResolved` after clearing or securing a convoy-related route | salvage and route-note sequence | Best escort image; readable objective and strong board-game story. |
| `mission_choir_quietus.png` | `choir-quietus` | Choir Quietus | Glass Choir / silence ritual | choir / signal mission | `spaceTextResolved` using `outer_glassmereChorus` or `inner_choirShrine` | Signal gear, route note, or safe non-Heat reward | Strong art, clean Choir identity, and fits existing signal/choir board actions. |
| `mission_cleanse_ember_sanctum.png` | `cleanse-ember-sanctum` | Cleanse Ember Sanctum | Meridian Compact / ember rite | cleanse / stabilize mission | `spaceTextResolved` using `outer_emberSanctumRest` or `outer_emberwatchBrace` | heal wound, remove/mitigate scar if existing rules allow, or salvage | Needed for the stabilize/cleanse slot; art is strong and objective is legible. |

## Deferred Candidates

| legacy filename | proposed active ID | reason to defer |
|---|---|---|
| `mission_lattice_witness.png` | `lattice-witness` | Strong image, but overlaps with `choir-quietus` and `restart-void-relay` in the signal/blue-lattice space. Best first alternate if one selected contract is cut. |
| `mission_hold_the_ridge.png` | `hold-the-ridge` | Good combat concept, but it has lower source file size and overlaps with `break-the-raider-chain` and `hunt-breachborn`. Defer unless a later pass needs another defense/combat mission. |
| `mission_span_of_the_last_seal.png` | `span-of-the-last-seal` | Visually strong, but high scenario-overlap risk. It can read like a main scenario or final-gate objective rather than an ordinary contract. Defer unless scenario/contract boundaries are deliberately widened. |

## Full Candidate Review

| legacy filename | proposed active ID | proposed mission name | faction/theme | role in game | mechanic pattern | likely reward | image usefulness | overlap with existing contracts | recommendation | reason |
|---|---|---|---|---|---|---|---|---|---|---|
| `mission_break_the_raider_chain.png` | `break-the-raider-chain` | Break the Raider Chain | Kaldr Dominion / raider road war | combat mission | `defeatCount` against red/hostile threats | salvage or trophy sequence | High | Medium; active set has defeat contracts but few explicit raider-chain jobs | promote now | Immediate, readable combat objective. |
| `mission_choir_quietus.png` | `choir-quietus` | Choir Quietus | Glass Choir / silence rite | choir / signal mission | `spaceTextResolved` at choir/signal action | Signal gear or route note | High | Medium; active set has Choir contracts, but this is the cleanest legacy Choir visual | promote now | Strong identity and good mission art. |
| `mission_cleanse_ember_sanctum.png` | `cleanse-ember-sanctum` | Cleanse Ember Sanctum | Meridian Compact / ember sanctum | cleanse / stabilize mission | `spaceTextResolved` at ember/rest/brace sector action | heal wound, salvage, or simple recovery sequence | High | Medium; overlaps with Cleanse Ledger by name, but art and sanctum target are distinct | promote now | Covers the needed cleanse/stabilize slot. |
| `mission_gatefire_vigil.png` | `gatefire-vigil` | Gatefire Vigil | Kaldr Dominion / gate watch | route / stabilize mission | `spaceTextResolved` at gate/trial action | trophy or route support | High | Low-medium; gate contracts exist but this has strong ritual-watch identity | promote now | Excellent gate image and board destination hook. |
| `mission_hold_the_ridge.png` | `hold-the-ridge` | Hold the Ridge | Veyr Clans / defensive line | combat / protection mission | `defeatCount` or sector action after clearing danger tile | salvage/trophy | Medium | High; combat/protection overlaps selected combat missions | defer | Good idea, but least necessary under the 9-slot cap. |
| `mission_hunt_breachborn.png` | `hunt-breachborn` | Hunt the Breachborn | Veyr Clans / breach hunt | combat mission | `defeatCount` against hostile/breach-flavored threats | salvage, trophy, or scar-safe reward | High | Medium; defeat objective, but monster-hunt theme is distinct | promote now | Adds creature hunt flavor without new mechanics. |
| `mission_lattice_witness.png` | `lattice-witness` | Lattice Witness | Glass Choir / signal witness | signal / investigation mission | `spaceTextResolved` at signal/lattice action | route note or Signal gear | High | High; overlaps selected Choir/relay signal jobs | defer | Strong alternate, but signal space is already covered. |
| `mission_map_broken_paths.png` | `map-broken-paths` | Map Broken Paths | Pale Cartels / route intelligence | route mission | `spaceTextResolved` at route/causeway/webglass action | route note or salvage | High | Low; supports movement clarity without changing movement | promote now | Best pure route/navigation candidate. |
| `mission_pilgrim_convoy.png` | `pilgrim-convoy` | Pilgrim Convoy | Pale Cartels / convoy escort | escort / protection mission | `spaceTextResolved` after securing route action | salvage/route note sequence | High | Medium; convoy language exists, but escort role is underrepresented | promote now | Best escort candidate. |
| `mission_restart_void_relay.png` | `restart-void-relay` | Restart the Void Relay | Meridian Compact / relay repair | salvage / recovery mission | `spaceTextResolved` at relay/signal action | Signal equipment or route note | High | Low-medium; current contracts have signal jobs, but repair/restart role is distinct | promote now | Clear repair objective and strong art. |
| `mission_salvage_the_bellframe.png` | `salvage-the-bellframe` | Salvage the Bellframe | Veyr Clans / salvage rite | salvage mission | `spaceTextResolved` at salvage/bargain site or `defeatCount` if guarded | salvage/equipment sequence | High | Medium; salvage exists, but object-specific bellframe art is strong | promote now | Best salvage/recovery object candidate. |
| `mission_span_of_the_last_seal.png` | `span-of-the-last-seal` | Span of the Last Seal | Kaldr Dominion / seal span | route / scenario-adjacent mission | `spaceTextResolved` at seal/gate action | scenario-safe support reward only | High | High; risks blurring with scenario/final seal objectives | defer | Save for a future scenario-contract pass. |

## Proposed Import Plan For Selected 9

| source path | target path | content path | title | objective sketch | reward sketch | tests needed |
|---|---|---|---|---|---|---|
| `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png` | `public/assets/cards/contracts/break-the-raider-chain.png` | `content/cards/contracts/break-the-raider-chain.json` | Break the Raider Chain | `defeatCount`, target 2 | salvage/trophy sequence | content validation, art audit, starting mission option |
| `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png` | `public/assets/cards/contracts/hunt-breachborn.png` | `content/cards/contracts/hunt-breachborn.json` | Hunt the Breachborn | `defeatCount`, target 2 or 3 | salvage or gear reward | content validation, progress on defeat |
| `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png` | `public/assets/cards/contracts/map-broken-paths.png` | `content/cards/contracts/map-broken-paths.json` | Map Broken Paths | `spaceTextResolved`, route/causeway/webglass effect key | route note or salvage | sector-action progress, mission marker |
| `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png` | `public/assets/cards/contracts/gatefire-vigil.png` | `content/cards/contracts/gatefire-vigil.json` | Gatefire Vigil | `spaceTextResolved`, gate/trial effect key | trophy or route support | sector-action progress, no gate rule change |
| `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png` | `public/assets/cards/contracts/salvage-the-bellframe.png` | `content/cards/contracts/salvage-the-bellframe.json` | Salvage the Bellframe | `spaceTextResolved` or `defeatCount` if guarded | salvage/equipment sequence | shop/equipment reward validation |
| `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png` | `public/assets/cards/contracts/restart-void-relay.png` | `content/cards/contracts/restart-void-relay.json` | Restart the Void Relay | `spaceTextResolved`, relay/signal effect key | Signal gear or route note | sector-action progress |
| `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png` | `public/assets/cards/contracts/pilgrim-convoy.png` | `content/cards/contracts/pilgrim-convoy.json` | Pilgrim Convoy | `spaceTextResolved`, route/convoy action | salvage/route note sequence | starting mission UI and target clue |
| `public/assets/riftfall/cards/contracts/mission_choir_quietus.png` | `public/assets/cards/contracts/choir-quietus.png` | `content/cards/contracts/choir-quietus.json` | Choir Quietus | `spaceTextResolved`, choir/signal effect key | Signal gear or route note | no Heat reward, mission marker |
| `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png` | `public/assets/cards/contracts/cleanse-ember-sanctum.png` | `content/cards/contracts/cleanse-ember-sanctum.json` | Cleanse Ember Sanctum | `spaceTextResolved`, ember/rest/brace effect key | heal/recovery or salvage | no Heat, scar-safe reward if used |

## Cap Increase Considerations

Do not increase the contract cap in the next import pass. If a later design pass wants all 12 legacy contract images active, choose one of these deliberate options:

1. Retire or merge three current active contracts.
2. Replace three low-resolution/placeholder active contract images while keeping card count flat.
3. Raise the max cap above 30 and add tests for starting mission option distribution, contract pool readability, and active mission UI density.

The third option is not recommended yet because the current player-facing setup already asks players to choose a character and starting mission before readying.

## Heat And Deprecated Status Check

No selected contract should use player-facing Heat. Existing legacy `lose_heat` reward compatibility is outside this decision pass, but new imported contracts should prefer current rewards such as salvage, trophy, gear, route note, wound healing, or existing non-Heat sequences.

Do not create:

- `/assets/cards/heat/`
- Heat card content
- Heat as a visible player status

## Next Implementation Pass

Suggested commit for the future import pass:

`promote-selected-legacy-contract-assets`

That pass should:

1. Copy only the selected 9 images into `public/assets/cards/contracts/`.
2. Create 9 contract records under `content/cards/contracts/`.
3. Keep total contracts at 30.
4. Keep deferred legacy source images in place.
5. Run `validate:content`, `typecheck`, `test:engine`, `test:client`, `test`, `build`, and `audit:assets`.

## Promotion Implementation

Commit pass: `promote-selected-legacy-contract-assets`

The selected 9 legacy mission images were promoted as active Contract cards. The contract cap stayed at 30, and the deferred candidates remained legacy/reference-only.

| contract ID | source path | active target path | objective summary | reward summary |
|---|---|---|---|---|
| `break-the-raider-chain` | `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png` | `public/assets/cards/contracts/break-the-raider-chain.png` | Defeat 2 enemies. | Gain 1 trophy and a route note. |
| `hunt-breachborn` | `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png` | `public/assets/cards/contracts/hunt-breachborn.png` | Defeat 2 enemies. | Gain 1 trophy and a breach-hunt note. |
| `map-broken-paths` | `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png` | `public/assets/cards/contracts/map-broken-paths.png` | Resolve `outer_brokenCausewayShortcut`. | Gain a broken-path map note. |
| `gatefire-vigil` | `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png` | `public/assets/cards/contracts/gatefire-vigil.png` | Resolve `inner_gateOfCindersTrial`. | Gain 1 trophy and a gatefire note. |
| `salvage-the-bellframe` | `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png` | `public/assets/cards/contracts/salvage-the-bellframe.png` | Resolve `middle_shardSprawlBargain`. | Gain `scrap-drone`. |
| `restart-void-relay` | `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png` | `public/assets/cards/contracts/restart-void-relay.png` | Resolve `outer_relayCrew`. | Gain `signal-pike`. |
| `pilgrim-convoy` | `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png` | `public/assets/cards/contracts/pilgrim-convoy.png` | Resolve `middle_guardianSpanThreshold`. | Gain a convoy toll-credit note. |
| `choir-quietus` | `public/assets/riftfall/cards/contracts/mission_choir_quietus.png` | `public/assets/cards/contracts/choir-quietus.png` | Resolve `inner_choirShrine`. | Gain a clean-frequency note. |
| `cleanse-ember-sanctum` | `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png` | `public/assets/cards/contracts/cleanse-ember-sanctum.png` | Resolve `outer_emberSanctumRest`. | Heal 1 wound and gain an ember blessing note. |

Deferred and retained:

- `public/assets/riftfall/cards/contracts/mission_lattice_witness.png`
- `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png`
- `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png`
- `public/assets/riftfall/cards/contracts/card_back_contract.png`

Implementation notes:

- Active contract count is 30, matching the current validation maximum.
- No contract cap increase was made.
- No Heat rewards were added to the promoted contracts.
- No `/assets/cards/heat/` path was created.
- Legacy source images were retained for a later archive-only pass.

## Promoted Source Archive Follow-up

Commit pass: `archive-promoted-legacy-contract-assets`

The 9 promoted legacy contract source PNGs were archived after SHA-256 verification against their active replacements. Active contract art remains under `public/assets/cards/contracts/`; no active runtime assets were moved.

| contract ID | archived source path | active replacement path |
|---|---|---|
| `break-the-raider-chain` | `_archive/legacy-promoted-card-assets/contracts/mission_break_the_raider_chain.png` | `public/assets/cards/contracts/break-the-raider-chain.png` |
| `hunt-breachborn` | `_archive/legacy-promoted-card-assets/contracts/mission_hunt_breachborn.png` | `public/assets/cards/contracts/hunt-breachborn.png` |
| `map-broken-paths` | `_archive/legacy-promoted-card-assets/contracts/mission_map_broken_paths.png` | `public/assets/cards/contracts/map-broken-paths.png` |
| `gatefire-vigil` | `_archive/legacy-promoted-card-assets/contracts/mission_gatefire_vigil.png` | `public/assets/cards/contracts/gatefire-vigil.png` |
| `salvage-the-bellframe` | `_archive/legacy-promoted-card-assets/contracts/mission_salvage_the_bellframe.png` | `public/assets/cards/contracts/salvage-the-bellframe.png` |
| `restart-void-relay` | `_archive/legacy-promoted-card-assets/contracts/mission_restart_void_relay.png` | `public/assets/cards/contracts/restart-void-relay.png` |
| `pilgrim-convoy` | `_archive/legacy-promoted-card-assets/contracts/mission_pilgrim_convoy.png` | `public/assets/cards/contracts/pilgrim-convoy.png` |
| `choir-quietus` | `_archive/legacy-promoted-card-assets/contracts/mission_choir_quietus.png` | `public/assets/cards/contracts/choir-quietus.png` |
| `cleanse-ember-sanctum` | `_archive/legacy-promoted-card-assets/contracts/mission_cleanse_ember_sanctum.png` | `public/assets/cards/contracts/cleanse-ember-sanctum.png` |

Retained legacy contract files:

- `public/assets/riftfall/cards/contracts/mission_lattice_witness.png`
- `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png`
- `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png`
- `public/assets/riftfall/cards/contracts/card_back_contract.png`

Prompt/reference handling:

- Contract card-art prompt paths for the promoted mission IDs were retargeted to active `public/assets/cards/contracts/` replacements.
- The older mission-sheet prompt stream under `public/assets/riftfall/cards/missions/` remains separate and was not changed by this contract-source archive pass.
- Heat remained deprecated; no `/assets/cards/heat/` path was created.
