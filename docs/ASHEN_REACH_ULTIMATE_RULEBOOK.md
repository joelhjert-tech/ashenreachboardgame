# Ashen Reach Ultimate Rulebook

Canonical documentation snapshot: 2026-07-12, repository checkpoint `0c68c99`.

This rulebook describes the game the software currently enforces. Text marked **Design decision required** identifies an unresolved rule; it is not permission to improvise. Scenario and card prompts shown by the server are authoritative for the current session.

## 1. Welcome to Ashen Reach

Ashen Reach is a shared-screen adventure board game. Operatives cross a hostile ringed board, resolve recurring dangers and Threats, complete contracts, gain equipment and Artifacts, and attempt the active scenario. Most scenarios use Loss Pressure; an authored scenario may explicitly disable it.

The physical board and shared pieces support table play. The host display presents public state and major resolutions. Each phone is a private controller for one seat.

## 2. Objective

Win by satisfying the active scenario's requirements and completing its final confrontation. Lose when the active scenario or the global Loss Pressure rule ends the session in defeat. If the active scenario explicitly disables Loss Pressure, positive escalation gains, difficulty modifiers, and pressure defeat are suppressed for that session. Operative recall is serious but is not automatically session defeat.

In Rivalry, the session still uses the public scenario. Private agenda scoring and public reveal/completion summaries may distinguish an individual result when the server declares it.

## 3. Components and digital interfaces

- **Board:** shared spatial reference for sectors, routes, operative positions, and public markers.
- **Host TV:** room code, board state, active operative, public pressure, encounters, movement journeys, battle chamber, and public outcomes.
- **Phone:** seat identity, private character state, routes, inventory, contracts, private agenda, and authoritative choices.
- **Server:** validates actions, rolls dice, computes routes and totals, changes state, protects private information, and restores sessions.

> Digital enforcement: Never move, spend, draw, or award something manually because a reference game would do so. Wait for the Ashen Reach prompt and authoritative result.

## 4. Game modes

| Mode | Seats | Shared objective | Private agenda |
|---|---:|---|---|
| Solo Run | 1 | Yes | No |
| Co-op | 2-6 | Yes | No |
| Rivalry | 2-6 | Public scenario remains active | Owner-private agenda, with public-safe reveal/completion summaries |

`Ruthless` and `Nemesis Relay` exist as internal or limited runtime modes but do not yet have a complete general player-facing setup contract. Do not select or teach them as ordinary modes unless the current host setup explicitly offers them.

## 5. Starting a room

1. Open the host display and create a Solo Run or Multiplayer room.
2. Choose the offered scenario and interaction mode.
3. Display the room code or QR join path.
4. Each player joins an open seat from a phone.
5. The first authorized setup phone may receive host setup controls. This does not expose another seat's private game information.
6. Each occupied seat enters a display name, selects an operative and starting Contract, then completes two private provision picks. Each provision pick presents two server-randomized choices from eligible standard Equipment and Followers; the player claims one from each pair.
7. Safe permanent Equipment may auto-equip into an empty slot. Followers remain owned separately. The selected provisions are authoritative, persist through reconnect, and cannot be claimed twice.
8. Each occupied seat marks Ready only after both provision picks are complete.
9. The host starts only after the server accepts the setup.
10. After the start is accepted, the server shuffles the Edge deck and privately deals exactly one random Edge Card to every occupied seat. No player chooses an awarded Edge Card.

An invalid, stale, or unauthorized start request changes nothing.

## 6. Scenario and operative setup

The chosen scenario defines setup, special pressure, confrontation steps, victory conditions, and defeat conditions. Each operative begins at the authored starting sector with server-created resources, gear, private state, and contract options.

Every normal operative begins with exactly 15 base attribute points. Each starting attribute is between 1 and 5. Permanent Trophy upgrades may later raise an attribute to the normal rank cap of 6. Equipped Gear, Followers, temporary effects, and contextual bonuses are separate modifiers and may raise the displayed current value beyond that permanent cap.

Safe permanent or conditional starting Gear is equipped automatically when its slot is empty. A second item for an occupied slot remains carried so its owner can choose between them. Consumables, dangerous items, charged relics, and other player-timed effects are never activated or equipped automatically.

The game supports eight authored scenarios currently listed by the host: The Broken Seal, The Throne of Ash, The Mirror of False Heroes, The Devourer Beneath, The Labyrinth Engine, The Dying Star, The Broken Concordance, and The Grinning Tithe. Read the active scenario panel; do not transfer special rules between scenarios.

The Grinning Tithe is a solo/co-op boss hunt with no Loss Pressure. Its normal Red, Blue, and Yellow Threat pools remain active; each lane also shuffles in one matching Pallid Retinue minion per bag cycle: Tithe Gnawer, Bell-Ear Stalker, and Copper-Snout Bailiff respectively. At each round end, the server draws one card from a separate four-card Pallid Retinue assault deck and sends it against one randomly selected active operative. The deck contains those three minions plus the Tithe-Lock Audit hazard, draws without replacement, reshuffles only after exhaustion, and remains private until a card is revealed. Boss wounds persist across operatives and visits; six wounds defeat the Pallid Curator. In standard multiplayer co-op, its eligible challenges and enemy battles use the normal optional assistance window described in section 32. Solo play never offers assistance.

## 7. Attributes and resources

Ashen Reach uses five attributes:

| Attribute | Typical use |
|---|---|
| Command | authority, leadership, control |
| Grit | endurance, violence, physical survival |
| Signal | perception, tuning, anomaly resistance |
| Guile | evasion, deception, opportunism |
| Forge | repair, machinery, field craft |

Other tracked values include:

- **Wounds:** immediate harm. Reaching the threshold triggers recall procedures.
- **Scars and Afflictions:** lasting typed effects.
- **Salvage:** shop currency and certain activation costs.
- **Trophies:** defeated enemy value and trophy-pile records used by implemented progression.
- **Global Escalation:** round pressure that raises difficulty and contributes to collapse.
- **Win Progress:** progress toward the scenario objective.
- **Loss Pressure:** progress toward session defeat.
- **Edge Cards:** owner-private, one-use cards that either lock one die before an eligible roll or activate a precisely timed ability.

## 7A. Edge Cards

Every operative starts with exactly one server-randomized Edge Card. The base hand limit is two. After an operative completes two Contracts, that limit becomes three. Owning at least one Artifact adds one further slot. The absolute maximum is four.

Completing a Contract awards the next random card from the server-owned deck if the operative has room. A full hand skips the award; no card choice or discard interruption appears. When the deck is empty, the server shuffles its discard pile into a new private cycle. Reconnecting restores the exact hand and deck state without drawing again.

An operative may use at most one Edge Card in a resolution. During the setup stage of the active operative's enemy battle or Hazard check, the owner may commit one Edge Card. Its printed value becomes one of the two operative dice, and the server rolls the other die normally. A committed die cannot be rerolled.

Alternatively, the owner may activate the card's unique ability only when the phone enables it. Pre-roll abilities are locked before dice, after accepted assistance is locked where applicable, or before the next eligible paid shop action. Post-roll abilities are private blocking reactions: the server shows the rolled result to the owner, then waits for an eligible ability or an explicit decline before it finalizes wounds, rewards, mission effects, and scenario triggers. A declined reaction leaves the card in hand.

The card is discarded when used. The TV reveals only the used card, player name, value or ability summary, and public-safe result; it never receives unplayed hands or deck order. The server owns every timing check, legal target, reroll, modifier, discount, reward conversion, and round-duration suppression. Table agreement cannot override a disabled phone control.

## 8. Reading the host display

The host display shows only public information. Its persistent board view identifies the round, phase, active operative, current sector, public objectives, pressure, and host controls. During accepted movement it may show a route journey. During battle it enters the dedicated battle chamber and suppresses the board. During a recurring challenge it shows the public challenge focus.

Host-only controls are visually separated. Private inventory, private agenda details, private reaction choices, and owner-only rejection reasons must not appear on TV.

## 9. Reading the phone

The phone shows the current private action first, followed by character state, equipment, Artifacts, carried items, followers, missions, and private agenda where applicable. A disabled action should provide an authoritative reason. A submitted action is pending; it is not successful until accepted.

Keep the owning phone private in Rivalry. Other players may see public summaries only after the rules reveal them.

## 10. Rounds, turns, and phases

A **turn** belongs to one active seat. A **round** ends after every seat in the current turn order has completed its turn.

The authoritative phases are:

1. **Start:** resolve start-of-turn scenario and character hooks.
2. **Navigation:** roll movement, inspect legal destinations, and confirm a route.
3. **Sector:** process arrival, recurring challenges, exploration, and Threat flow.
4. **Action:** use available sector, shop, contract, stabilization, or confrontation actions.
5. **Resolution:** display and resolve the current test, battle, consequence, or reaction.
6. **Broadcast:** finalize public state and pass play onward.

The interface may group these phases into simpler labels. The server phase controls legality.

## 11. Start of turn

The server applies mandatory start-of-turn scenario, Scar, Affliction, operative, follower, and pressure hooks in their authored order. A prompt appears only when a player choice is required. Round-exhaust items do not refresh at turn start; they refresh only at authoritative round completion.

## 12. Movement roll

When navigation begins outside the Inner Reach, the active phone offers any canonical tier transition available from the current sector and **Roll Movement**. If the operative does not cross tiers, the server rolls and computes destinations at the exact accepted distance. Before the roll, only tier transitions and effects whose timing explicitly permits pre-roll use may appear.

Inside the Inner Reach, no movement die is rolled. The operative follows one of two authored final-approach roads and may move exactly one connected step per turn. The current sector's fixed challenge must have been cleared successfully by that operative before an inward step is legal. A failed challenge leaves the operative in place for a later attempt. Retreating one prior step remains legal.

Movement distance cannot be changed by table agreement. The Ashen Route Compass may apply its exact `-1` or `+1` adjustment only through its prompt and charge rules.

## 13. Choosing a route

1. Review server-provided legal destinations.
2. Select a destination to preview it. Previewing does not move the operative.
3. Review the ordered route and any public block reason.
4. Confirm the route.
5. Wait for authoritative acceptance.

The route must use authored connections and satisfy exact distance, gate, scenario-lock, blocker, and destination rules. The phone does not calculate legality.

**Example:** A movement roll of 3 may offer Ashwake Crossing -> Glassmere Spindle -> Ashen Chapel. If a different three-step path to the same destination is not included in the server choices, it is not legal for that intent.

## 14. Regions, transitions, and gates

Operatives change regions only through authored transition sectors or explicit effects. When navigation begins on a transition sector, the phone offers each canonical inward or outward edge before the movement roll. Choosing one crosses exactly one edge without a die or approach check, ends movement, and begins the destination's normal arrival lifecycle. Choosing **Roll Movement** instead removes tier crossing for that turn; the resulting exact-distance route stays within the current region.

A route that appears adjacent visually but lacks an authored transition is illegal. Gates may add requirements.

- **Inner Reach:** an operative must own at least one Artifact item before entering. Guardian Span Clearance is not used.
- **Inner approach:** Breach Road and Choir Road converge at Bone Meridian, then continue through the Gate of Cinders. Normal movement dice, movement adjustments, route aids, and gate overrides cannot skip these steps.
- **Center:** only an operative who has cleared the Gate of Cinders may take the single final step into the Ashen Reach Core. Entering the Core starts the active scenario confrontation.
- **Void Key:** personal one-movement gate-rule override in its approved window.
- **Gate-Saint Key:** party-safe final-gate passage window; it does not unlock ordinary gates or permanently unlock the final gate.
- Other movement Artifacts apply only as their phone prompts state.

Scenario locks, blockers, adjacency, destination legality, and route rules continue to apply unless the exact effect says otherwise.

## 15. Movement journey and arrival

After a route is accepted, the TV may present each authoritative sector in order using canonical tile art. This presentation does not delay or alter server progression. On arrival, the destination becomes authoritative before its challenge or Threat flow.

The normal arrival order is:

1. Public sector brief.
2. Mandatory recurring tile challenges in authored order.
3. Threat or enemy flow.
4. Other sector action, if still legal.

## 16. Sectors and sector instructions

A sector can contain route links, danger, tags, printed threat icons, recurring challenges, face-up Threats, shop capability, public rules, lore, and scenario hooks. Sector text is available only when the current authoritative state permits it. Unresolved blockers commonly prevent shopping or sector text.

If a sector action offers choices, use the phone options. An option omitted or disabled by the server is unavailable.

## 17. Exploration and Threat draws

Every printed red, blue, or yellow Threat icon draws one card from the matching server-owned global lane bag. Each bag is shared by all operatives, contains every active card in that lane, and draws without replacement until the complete lane is exhausted. The server then reshuffles that lane for its next cycle. Bag order and remaining cards are private server state.

An enemy explicitly returned to a sector is fixed there. It resolves before the next global draw of its lane. Players do not manually count, shuffle, or draw cards.

Public Threat roles resolve in deterministic engagement order:

1. Event
2. Enemy
3. Nemesis
4. Encounter
5. Asset

Every drawn Threat in the arrival queue reaches a final result. Rerolls and reactions finish before success or failure is recorded.

## 18. Threats versus recurring challenges

**Threats/enemies** may be defeated, removed, and sometimes recorded as trophies.

**Hazard Challenges** and **Anomaly Challenges** belong to sectors. They trigger under their authored condition, resolve a test and outcome, remain attached after success or failure, never become trophies, and may challenge later visitors again.

An anomaly Signal test means a persistent tile challenge whose type is Anomaly and tested attribute is Signal. It does not mean every Signal test or every hazard.

## 19. Skill tests

For a normal test, the server determines:

`dice total + base attribute + permanent/equipped modifiers + temporary test modifiers`

The result is compared with the displayed difficulty. The battle/test panel shows source rows where projected. Effects may change difficulty or the acting total only in their stated windows.

**Example:** Mira tests Signal against Rift Whispers. Choir Lantern, if owned, equipped, charged, and offered before the roll, adds its test-scoped modifier. It does not change her resting Signal value.

## 20. Combat and confrontations

Combat uses the current public battle projection:

1. Identify the operative and opposition.
2. Read the tested attribute and difficulty/opposing formula.
3. Resolve offered pre-roll choices.
4. Roll the operative and, where required, opposition dice.
5. Apply projected modifier sources.
6. Compare final totals.
7. Display the authoritative success/failure result.
8. Apply the public-safe consequence or reward.

The TV battle chamber attaches dice, modifiers, and totals to the correct side. The phone retains private item and reaction choices.

**Tie note:** The software's displayed result is authoritative. A single universal tie rule has not yet been established across every test and confrontation; do not substitute a reference-game tie rule.

## 21. Dice, modifiers, and rerolls

Dice are server-generated. Base attributes, permanent improvements, equipped gear, temporary modifiers, and dice remain separate sources.

A reroll occurs only when the server offers one. The new authoritative roll replaces the old result for that action. There is no universal Fate resource. Blood Fury may offer one battle-die reroll per battle after a failed result; Future Sickness may offer one owner-die reroll per turn after a failed check or battle. If both are eligible in a failed battle, the server offers them in order and applies the battle only after the final choice. A matching replacement die applies the Affliction's printed Wound or chained draw.

Modifiers do not alter resting/base values unless an effect explicitly grants a permanent change. The interface result, not mental arithmetic, is final.

## 22. Equipment and inventory

Equipment uses weapon, armor, and utility slots. **Equipped** items can contribute where their typed rule permits. **Carried** items remain owned but are not automatically active. Artifacts, consumables, followers, and completed missions are presented separately.

The active operative may change equipped Gear during setup, during their open Action phase, and in the pre-roll loadout window for a battle or Challenge. That pre-roll window covers card reveal and battle setup, and closes as soon as the server accepts the roll. Equipment changes made after rolling begins are rejected without changing the loadout. The exact equipped copies persist through reconnect and are the copies used when the server builds the final test formula.

The sixteen standard passive Equipment cards with a printed +1 bonus now use one rule: **while equipped, gain the printed +1 stat bonus**. Their old situational flavor phrases do not create extra conditions. Unequipped, sold, or suppressed copies contribute nothing.

No general carried-inventory limit is currently verified. Do not discard items because another game has an object limit.

Common states:

- **Ready:** available in its timing window.
- **Exhausted:** unavailable until its authored reset, commonly round completion.
- **One Use:** consumed after successful use.
- **Charges X/Y:** exact-instance uses remaining.
- **Depleted:** zero charges; the item remains owned unless another rule removes it.

## 23. Artifacts and charged items

Artifacts are a separate tier from normal Equipment. Twenty-six Artifact presentations belong to canonical sector pools; Choir Lantern, Oathchain Lens, Route Star, and Void Key are relic-dealer-only presentations. These are distinct valid acquisition paths. Granted Artifact gear records its source Artifact card. Implemented charged Artifacts track charges on the exact owned copy. Duplicate copies have independent balances. Reconnect preserves spent charges. There is no automatic recharge unless a future rule explicitly adds one.

Viewing or declining a prompt spends nothing. A rejected stale, wrong-seat, invalid-target, or mistimed request spends nothing. A successful use applies its effect and charge cost atomically.

**Static Intercession example:** After a final failed recurring Anomaly Challenge, an equipped Choir Static Censer may suppress the one server-authored pending failure effect. A composite authored effect remains one choice; the phone cannot split it. The test remains failed and the anomaly remains on its sector.

## 24. Followers

Followers are owned separately from gear. Passive followers apply only through their typed rule. Exhaust followers show Ready/Exhausted and refresh in their authored window. A follower is not Equipment unless its runtime definition explicitly says so.

Followers appear beside Gear in the pre-roll loadout so the active operative can review them and use any ability whose authored timing is currently eligible. Followers do not occupy weapon, armor, or utility slots, so opening the loadout does not create a general equip/unequip choice for them; all owned followers remain attached unless a specific rule removes one.

No general follower limit is currently verified.

## 25. Salvage and shops

Salvage is currency. A shop or other service is available only at a service-capable sector after every drawn Threat in the current arrival has resolved successfully. A failed Threat locks services for that visit; leave and complete a later arrival successfully to unlock them. Failed recurring tile challenges and scenario tests do not affect this gate. Sectors without printed Threats satisfy the Threat-success requirement automatically after their other mandatory arrival stages finish. Non-service sector actions remain available whenever their own rules permit them.

When an automatic consequence says to lose Salvage, lose up to the stated amount; Salvage cannot fall below 0. This is not a payment, so the consequence still resolves when you have less Salvage than the stated loss.

When an encounter says to pay Salvage, the full amount is a prerequisite for the paid result. Payment is checked and deducted authoritatively before that result resolves; there is no partial payment and no paid benefit without payment. A required payment that cannot be afforded follows its authored unpaid result instead. If an encounter pauses for its owner to resolve a payment, that pending decision survives reconnect.

Shop sequence:

1. Resolve the complete Threat queue successfully.
2. Open the shop from the phone.
3. Review public/owner-safe services and revealed stock.
4. Choose buy, sell, service, or skip.
5. The server rechecks location, stock, ownership, affordability, and timing.
6. On acceptance, Salvage and inventory update atomically.

Rejected purchases and sales change nothing. A sold item must be owned and sellable. Stock and service availability come from the server.

## 26. Contracts and missions

Each operative normally holds one active contract. Contracts use typed objectives, including defeat counts, sector-text resolutions, multi-stop routes, shop transactions, and explicitly authored tile-challenge matches.

Progress does not itself grant the reward. When the objective is satisfied, the canonical completion flow:

1. validates completion;
2. grants the reward once;
3. records the contract ID in Completed Contracts;
4. clears the active contract;
5. publishes the completion result;
6. permits a new contract.

Repeating an old objective cannot reward the completed contract again. A recurring challenge may progress a new independently matching contract.

## 27. Completed Contracts and Relic Dealer

Completed Contracts are ledger entries, not event-log guesses. Current Relic Dealer trade behavior spends stored completed-contract IDs through an authoritative shop transaction. The dealer does not consume historical event text.

## 28. Wounds, recall, Scars, and recovery

When an effect applies Wounds, the server updates the operative and checks the wound threshold. At the threshold, the operative is recalled and the Scar/defeat flow applies. Recall is not the same as permanent player elimination.

Recovery, healing, replacement, and retained inventory follow the active prompt and scenario. Do not assume every Wound can be healed or every Scar removed.

Prevention acts before the selected pending consequence resolves. Replacement acts in its explicit result window. Already resolved consequences are not rolled back.

### Affliction draws

Only these current Threat failures introduce a new Affliction draw:

- Smoke-Leech Clutch, Void-Salt Sickness, and Mirror-Rot Interference replace their former 1 Wound with 1 Affliction.
- Cinder Lattice Maw replaces its former 2 Wounds with 1 Wound and 1 Affliction.

The server draws without replacement from a separate 30-card cycle for each operative. It stores draw history, prepared choices, nested draws, and reactions. Reconnect continues that queue; it never redraws the resolved card.

Runaway Growth asks its owner which stat gains +1 before the next draw resolves. Oath to the Breach adds one draw. Condemned Echoes replaces every facedown Affliction with the same number of new draws. Bile Spit may wound another operative who ends movement in its owner's sector outside the inner reach; the arrival and optional owner reaction resolve before the next sector action. Faceup conditions persist; immediate cards resolve and flip facedown.

## 29. Abilities and limits

Character, gear, Artifact, follower, Scar, and scenario abilities apply only in their typed timing and eligibility window. “First eligible opportunity” means the first matching event the server recognizes in the stated turn or round window. Once-per-turn, once-per-round, charge, exhaust, and discard limits are tracked authoritatively.

If the server does not offer an optional ability, it is not currently eligible.

## 30. Timing windows

Use this order where the implemented prompt supports it:

1. Before-roll modifiers.
2. Authoritative roll.
3. Reroll or result replacement.
4. Final success/failure classification.
5. Consequence prevention or forced-displacement prevention.
6. Remaining consequence resolution.
7. Outcome and next authoritative phase.

For anomaly Signal tests, Choir Lantern acts before the roll, Mirror may reroll a supported failure, and Choir Static Censer acts only after the final result remains failed. Blackstar's movement/hazard failure window does not apply to persistent anomaly challenges.

When effects are authored as a sequence, the server uses that order. A universal rule allowing the active player to reorder equal-priority effects is not implemented.

## 31. Impossible, stale, and partial actions

The game does not use a blanket “do as much as possible” rule. The server either applies the typed effect, exposes only legal choices, or rejects the intent. A rejected action reports a reason where appropriate and does not pay atomic item/currency costs.

If a pending choice becomes stale because the state advanced, submit a current choice instead. Never repeat a private action solely because the TV animation is still playing.

## 32. Cooperative play

Co-op operatives share the public scenario objective and defeat pressure. Before an eligible operative skill test, the active player may ask up to two other active operatives for help. Each requested player accepts or declines on their own phone. Every accepted helper adds only the intrinsic value printed in the tested skill on their canonical character definition: no Trophy advancement, Equipment, Artifact, Follower, temporary modifier, reaction, reroll, passive bonus, or helper die is included. The active operative then rolls once using their normal effective stat and modifiers.

The assistance window opens only after the tested skill is known and before operative or hidden enemy dice are revealed. It applies to enemy battles, Hazards, Anomalies, tile challenges, named board tests, and scenario skill tests. It never applies to movement, enemy dice, draws, rewards, shops, payments, Trophy or Contract checks without dice, automatic consequences, rerolls, solo sessions, Rivalry, or Nemesis Relay. Consent and locked contributions are authoritative per roll and survive reconnect; later eligible rolls require a new request.

There is no general resource pooling, unrestricted trading, or free revival rule. Scenario pressure and Global Escalation discourage indefinite farming.

## 33. Rivalry and private agendas

Rivalry retains the public scenario and gives eligible seats owner-private agenda state. Keep agenda text and private progress on the owning phone. TV may show only authorized reveal or completion summaries.

Rivalry does not currently grant a general right to attack, steal from, trade with, or block another operative. Those actions require explicit content or future rules.

## 34. Scenario pressure and escalation

Read three tracks distinctly:

- **Win Progress:** complete the scenario objective.
- **Loss Pressure:** if enabled and this reaches its limit, the scenario fails. A scenario that disables it shows no pressure track or threshold warning.
- **Global Escalation:** round pressure that makes later checks harder and currently backs the common collapse track.

Scenario-specific telemetry may add seals, doom, countdowns, modes, crowns, nemesis health, or other authored state. The active scenario panel explains its meaning.

## 35. Final objectives, victory, and defeat

The active scenario defines the final confrontation and any prerequisites. Reaching a central or gated sector is not automatically victory. The server validates the confrontation, applies its progress/result, and ends the session only when the scenario condition is met.

When the session ends, gameplay controls lock and the public result appears. A scenario-specific immediate victory/defeat overrides ordinary turn continuation. The current server result controls simultaneous-looking outcomes; a broader equal-priority hierarchy remains a design decision.

## 36. Disconnection and reconnection

Each seat uses a signed seat token. Reconnecting to the same room restores the authoritative seat state when valid. Reconnect does not recharge items, pay costs, reroll dice, resubmit movement, or replay completed server actions.

Pending server reactions may reappear with the same stable reaction and effect IDs. If the reaction has resolved or expired, reuse is rejected. TV presentation may reconstruct the current visual stage without changing game state.

## 37. Rule authority

For current play:

1. The server's validated current state and safety rules are authoritative.
2. The active scenario's explicit rule and prompt overrides general setup/turn text where implemented.
3. Explicit character, card, Equipment, Artifact, follower, Scar, and sector prompts apply in their stated contexts.
4. This rulebook supplies the general rule.

The proposed total hierarchy between all equal-priority exception types is not yet uniformly encoded. When no prompt or deterministic sequence establishes an answer, record a design issue rather than negotiating a new rule mid-session.

## 38. Glossary

| Term | Meaning |
|---|---|
| Active operative | Seat currently taking its turn |
| Anomaly Challenge | Recurring supernatural tile challenge |
| Artifact | Rare item tier; may be charged, exhaustible, consumable, reactive, or passive |
| Authoritative | Accepted and stored by the server |
| Blocker | State preventing a route, shop, sector action, or progression step |
| Completed Contract | Stored contract ledger ID already rewarded |
| Depleted | Charged item at zero charges |
| Hazard Challenge | Recurring environmental tile challenge |
| Loss Pressure | Scenario failure progress |
| Recurring | Remains attached to its sector after resolution |
| Resolution | Staged roll, result, reaction, and consequence flow |
| Salvage | Shop currency and approved activation resource |
| Scar | Lasting operative condition |
| Submitted | Sent by phone, awaiting server decision |
| Threat | Public encounter card; enemies may be defeated/trophied |
| Win Progress | Scenario objective progress |

## 39. Timing reference

| Window | Examples | Closes when |
|---|---|---|
| Before roll | Choir Lantern, eligible test modifier | Dice are authoritatively rolled |
| After failed result / reroll | Mirror and supported replacement | Final result accepted |
| Before consequence | Static Intercession and typed prevention | Selected consequence resolves |
| Movement planning | Compass, gate eligibility, destination preview | Route accepted or window cancelled |
| Round exhaust | Ready exhaust item | Item used; refresh only at round completion |

## 40. Frequently asked questions

**Can I choose any path with the right length?** No. Choose only an authoritative route shown by the phone.

**Does selecting a destination move me?** No. Confirming and receiving acceptance does.

**Does beating a recurring challenge remove it?** No.

**Can a recurring challenge become a trophy?** No.

**Can I use another player's charged Artifact?** Not unless an explicit party-wide rule says so.

**Do charges refresh next round or after reconnect?** No.

**Can I attack another operative in Rivalry?** No general PvP attack is implemented.

**What happens on a tie?** Use the authoritative displayed result. A universal cross-system tie rule still needs a design decision.

**Can I reorder simultaneous effects?** Only if the current prompt offers that choice. Otherwise authored/server order applies.

**Does Black Route Fuse have a hidden cost?** No. When its use is accepted, it grants +3 Grit for the matching battle roll, advances Global Escalation by 1, and is discarded.

## 41. Quick turn reference

1. Resolve start-of-turn hooks.
2. Roll movement.
3. Inspect and confirm one legal exact-distance route.
4. Resolve arrival and recurring challenges.
5. Resolve Threat flow.
6. Take an available sector/shop/contract/scenario action.
7. Resolve tests, reactions, and consequences.
8. End the turn; after all seats, complete the round and apply round pressure/refreshes.

> Common mistake: a public TV animation is presentation, not permission to submit the same phone action twice.
