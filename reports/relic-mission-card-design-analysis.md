# Relic Mission Card Design Analysis for Ashen Reach

Date: 2026-07-10  
Mode: research and analysis only; no Ashen Reach game content or mechanics changed.

## Scope, provenance, and copyright boundary

This report reviews the 34 pages returned by the [Relic Wiki Mission Cards category](https://relic40k.fandom.com/wiki/Category%3AMission_Cards), comprising 24 base-game cards and 10 expansion cards as listed on individual pages such as [The Emperor's Justice](https://relic40k.fandom.com/wiki/The_Emperor%27s_Justice). Images were downloaded solely for private local visual reference. The archive excludes the shared card-back image, expansion icon, wiki chrome, thumbnails, avatars, and advertisements.

This is a pattern study, not a transcription or adaptation. Relic names, prose, artwork, icons, factions, and exact mechanical expressions must not enter Ashen Reach. The concepts later in this report are original Ashen Reach structures written from its own factions, board state, resources, and server-authoritative rules.

The image folder `research/reference/relic/mission-cards/` is outside all runtime asset roots and is not served by the production build. It is **not currently covered by `.gitignore`**, so the 34 copyrighted JPEGs must remain untracked and must not be committed without an explicit decision. The JSON analysis and contact sheet are research artifacts, not runtime assets.

## Method and confidence

- Discovery used the Fandom MediaWiki category API with a 500-page limit. It returned 34 article pages and no continuation token.
- Each article's same-named JPEG was selected through MediaWiki image metadata. Generic `Mission Card.jpg` and `Halls of Terra Icon.png` files were rejected.
- All 34 downloads succeeded. The source files are approximately 1960-2020 pixels wide and 3010-3070 pixels tall.
- The contact sheet and original images were reviewed manually. Mechanics are paraphrased in `relic-mission-analysis.json`; no large copyrighted text blocks are reproduced.
- Two cards show a token total without a clearly visible token-earning rule on the card itself. Those entries are marked medium confidence rather than inferring external rules.

## Executive findings

The set's strongest idea is not any specific objective. It is the way missions redirect normal turns. A player still moves, fights, shops, recovers, and builds a character, but the mission makes one route, target, payment, or timing window more valuable than the others.

The 34-card sample is dominated by:

- one-step destination, battle, or interaction checks;
- enemy-family or board-region hunts;
- multi-stop routes represented by tokens on spaces;
- resource conversion at a named space;
- rivalry interceptions of another player;
- a smaller number of threshold, collection-set, survival, and catch-up missions.

Rewards are mostly immediate and legible: a permanent stat, influence/currency, wargear access, healing, a bonus turn, or a persistent completed-card benefit. Hard missions generally add one or more of four costs: more route steps, a dangerous region, a scarce target, or a resource sacrifice. Explicit mission failure is rare; pressure usually comes from normal game risk, opportunity cost, or progress regression.

## A. Mission structure

### Objective families

Approximate functional grouping (some cards fit more than one family):

| Pattern | Approximate presence | Design behavior |
| --- | ---: | --- |
| Travel to or act at a named space/region | 13 | Makes geography matter and creates a visible route goal. |
| Win a battle under a family, region, or color condition | 10 | Reuses normal combat while narrowing target selection. |
| Interact with or intercept another player | 6 | Creates rivalry and moving-target route pressure. |
| Multi-step token/progress mission | 7 | Supports longer arcs and public board markers. |
| Spend, discard, buy, or otherwise convert a resource | 7 | Creates an opportunity cost beyond merely arriving. |
| Collect or maintain a set/state threshold | 3 | Rewards build planning or delayed conversion. |
| Survive or accumulate losses | 2 | Creates comeback drama but risks intentional failure play. |

The set is not mostly “kill N enemies.” Many objectives are one-step checks, but their gates differ: location, enemy family, threat color, another character, inventory state, or resource payment. The most replayable cards combine two gates—such as “visit two different threat colors,” “fight in a dangerous region,” or “arrive at a location while holding a prerequisite.”

### Progress counters versus one-step completion

Most missions resolve in one qualifying event. Counter-based missions typically require two to four steps. Their best use is spatial: place markers, visit them, and optionally let battle losses restore markers. Counters are weaker when the card says only “collect three tokens” without a self-contained explanation of how tokens are earned.

### Dependence on spaces and card types

Named spaces and board regions are frequent. Specific enemy families appear as clean hunts. Threat-color objectives broaden target availability while still shaping routes. Item/card dependence is used mainly as a payment, set-collection requirement, or reward—not as a complex crafting tree.

## B. Reward structure

Common rewards include:

- permanent stat or level gains;
- influence/currency;
- wargear reveal, free acquisition, or broader shop access;
- healing or cleansing a persistent negative card;
- a bonus turn or relocation;
- power-card draws;
- a mission retained as a completed card/ally with a persistent bonus;
- another completed mission as accelerated progression.

Rewards are usually immediate on completion. A few are delayed to the next phase or transform the mission into a persistent object. Stronger effects tend to sit behind dangerous regions, multiple route stops, high-risk health states, repeated losses, or a payment at a precise location. Balance is not perfectly uniform: an extra turn or large market reveal can outpace a single currency/stat reward despite similarly simple triggers.

Ashen Reach should preserve reward clarity but avoid turning completed mission cards into generic permanent stat gear. Its existing economy already has separate lanes: trophies for permanent stat growth, normal equipment for loadout, followers for support, artifacts for rare power, and completed missions as artifact-access currency.

## C. Difficulty scaling

Difficulty scales through five visible levers:

1. **Geographic depth:** inner or named dangerous regions cost more turns and expose the player to more threat pressure.
2. **Target scarcity:** a specific enemy family or opponent state may not be available on demand.
3. **Objective length:** two- or three-stop routes take longer than a single arrival.
4. **Resource sacrifice:** paying currency or discarding a useful card makes completion compete with immediate strength.
5. **Regression or danger:** losing battles can restore progress markers; survival objectives ask players to remain near defeat.

The best easy missions use one broad gate. Medium missions use either two broad gates or two route steps. Hard missions use a deep region, three steps, a meaningful payment, or a fragile survival condition. Ashen Reach should expose those difficulty signals explicitly as ring, target count, required resource, and pressure risk rather than relying on flavor text.

## D. Player decision pressure

Missions create route pressure when the desired space is not the safest or most efficient destination. They compete with survival because players may carry wounds, Heat, or unresolved pressure while chasing a contract marker. They encourage risk-taking most effectively when the reward is known before the risk.

Three useful tensions emerge:

- **Safety versus progress:** detour to a contract sector or recover first.
- **Spend versus hold:** convert Salvage, equipment charges, or a trophy now, or preserve it for battle/shop use.
- **Personal versus team tempo:** complete your own route while another operative needs help clearing a public threat.

Rivalry missions gain tension from moving targets, but direct theft and forced damage need mode-specific substitutes. Co-op should use shared markers, assists, escort states, or “another operative clears your marker” triggers. Solo needs deterministic target substitutes, such as a nemesis, convoy token, or threat family.

## E. Replayability

Most replayable structures:

- player-chosen markers on spaces of different colors/tags;
- region goals broad enough to allow several valid targets;
- missions advanced by other players;
- objectives with a spend/hold decision;
- progress that can regress under a clear risk;
- target families distributed across several sectors or decks.

Most repetitive structures:

- multiple cards using the same “defeat one member of family X” chassis;
- same-difficulty one-arrival missions with only the named destination changed;
- token totals with no visible earning rule;
- rewards that repeatedly give one stat with no contextual choice.

Ashen Reach can improve replayability by making contract progress respond to the changing board: face-up lane pressure, routes, active threats, sector tags, scenario clocks, player assists, cleared spaces, and inventory timing. Randomly selecting from valid target sets is more robust than naming a single content ID on every card.

## F. UI lessons for Ashen Reach

### Phone

The phone should always show, in this order:

1. mission title and faction giver;
2. one-sentence objective;
3. current/required progress;
4. valid target summary (“2 valid sectors,” “red threats,” “shop-tag sector”);
5. known reward;
6. pressure/failure clause;
7. the next available mission action, if any.

During movement, destination cards should show mission relevance before confirmation. During battle, show whether this opponent qualifies and whether victory will complete or increment the mission. In shops, show the exact mission payment/conversion action. At end turn, report progress gained, progress lost, and the next nearest valid target without exposing private rivalry information.

### TV

The TV should show public-safe contract relevance on the map: target-sector glow, route relevance, and compact progress. It should not expose a hidden rivalry target. Battle focus needs a small “Mission target” flag and expected progress change, not the full mission card. Completed rewards should appear in the resolution focus, then the header/status area should announce that a new mission may be accepted.

### Completion and new offer

Completion should be a four-beat sequence:

1. objective completion confirmed;
2. authored reward applied and itemized;
3. completed mission stored in inventory/progress currency;
4. next mission offer made available without leaving stale completion UI.

When the third completed mission is earned, the phone should state that artifact trade access is ready. The TV may show a public-safe milestone, but the artifact choice belongs on the phone.

## G. Twenty original Ashen Reach mission patterns

These concepts are deliberately original and use only Ashen Reach language and systems. They are templates for future design, not content changes in this task.

### Hunt missions

#### 1. Ashwake Red Ledger

- **Faction/flavor:** Pale Cartels; erase witnesses from a burned route account.
- **Objective:** Defeat two red-lane enemies on different outer-ring sectors.
- **Completion trigger:** Second qualifying defeat on a distinct sector.
- **Reward:** Salvage plus one completed-mission credit.
- **Risk:** Gain 1 Heat if both defeats occur in consecutive turns.
- **UI:** Show distinct-sector markers and `1/2` progress.
- **Modes:** Solo hunts threats; co-op allows an assisted defeat; rivalry awards the owner progress only when present.

#### 2. Choirbreaker Frequency

- **Faction/flavor:** Glass Choir; silence a repeated anomaly signature.
- **Objective:** Clear one blue enemy/encounter after first scanning it from an adjacent sector.
- **Completion trigger:** Qualified blue card resolved after scan marker exists.
- **Reward:** Cool Heat or gain a Choir-aligned follower lead.
- **Risk:** Scan adds temporary anomaly pressure to the target sector.
- **UI:** Two-stage `Scan -> Clear` state with target card portrait.
- **Modes:** Co-op can split scan and clear; rivalry keeps the chosen target private until scanned.

#### 3. Bone-Road Quarry

- **Faction/flavor:** Veyr Clans; bring down a marked breachborn before it crosses a funeral road.
- **Objective:** Defeat one breachborn or beast carrying a mission marker.
- **Completion trigger:** Marked threat defeated.
- **Reward:** Trophy bonus and completed-mission credit.
- **Risk:** At end turn, the marked threat advances one authored edge toward a clan sector.
- **UI:** TV shows public marked-threat route; phone shows reward and expiry pressure.
- **Modes:** Shared target in co-op; first claimant in rivalry; deterministic nemesis substitute in solo.

### Route/travel missions

#### 4. Three Lantern Circuit

- **Faction/flavor:** Meridian Compact; verify three dead signal posts.
- **Objective:** Visit one outer, one middle, and one inner sector with signal or movement tags.
- **Completion trigger:** Third distinct ring marker collected.
- **Reward:** Completed-mission credit and one safe-route note.
- **Risk:** Taking a wound clears the most recent marker.
- **UI:** Three-node route strip with ring labels and valid-sector glow.
- **Modes:** Owner must visit in solo/rivalry; co-op variant lets one assisted marker count.

#### 5. Cartographer's Broken Measure

- **Faction/flavor:** Pale Cartels; prove two disconnected routes still meet.
- **Objective:** Travel between two player-chosen sectors of different threat colors within three turns.
- **Completion trigger:** Reach the second marker before timer expires.
- **Reward:** Salvage and a one-use movement reroute.
- **Risk:** Expiry adds Heat and resets the pair.
- **UI:** Countdown, route length, and both markers visible before acceptance.
- **Modes:** Rivalry hides the destination until first move; co-op keeps both public.

#### 6. Gateward Pilgrimage

- **Faction/flavor:** Kaldr Dominion; carry a sealed witness token toward an inner threshold.
- **Objective:** End movement at an inner gate with zero unresolved red threats on the route's final sector.
- **Completion trigger:** Arrival after the sector is clear.
- **Reward:** Trophy or artifact-trade discount token.
- **Risk:** Battle loss drops the witness token on that sector for recovery.
- **UI:** Inventory token, dropped-token map marker, and gate eligibility.
- **Modes:** Allies can recover the token in co-op; opponents can race to deny tempo but cannot steal it.

### Salvage/recover missions

#### 7. Bellframe in the Ash

- **Faction/flavor:** Veyr Clans; recover a shattered warning frame from yellow-lane debris.
- **Objective:** Clear a yellow asset/encounter, then spend one action recovering its mission object.
- **Completion trigger:** Recovery action after sector clears.
- **Reward:** Salvage and equipment-stock refresh at the next shop.
- **Risk:** Leaving the sector before recovery returns the object to the lane.
- **UI:** Distinguish `Threat cleared` from `Object recovered`.
- **Modes:** Co-op permits another operative to guard while owner recovers; rivalry is first-to-claim.

#### 8. Blackstar Sample Case

- **Faction/flavor:** Umbral Bloom; carry a living sample without overheating it.
- **Objective:** Acquire a sample at an anomaly sector and reach a recovery/shop sector while Heat is 3 or lower.
- **Completion trigger:** Arrival with sample and Heat threshold met.
- **Reward:** Healing choice or Bloom follower lead.
- **Risk:** At Heat 4+, sample becomes unstable and adds one escalation step before resetting.
- **UI:** Sample condition meter beside Heat.
- **Modes:** Co-op permits transfer once; rivalry sample carrier is public but destination is private.

#### 9. Quiet Cache Extraction

- **Faction/flavor:** Pale Cartels; extract a hidden equipment cache without a public fight.
- **Objective:** Resolve a yellow-lane sector without defeating an enemy that turn.
- **Completion trigger:** Sector clear via test, bargain, or asset recovery.
- **Reward:** Choose one of two normal-equipment offers.
- **Risk:** A red draw invalidates the quiet approach for that visit.
- **UI:** `Quiet route valid/compromised` status.
- **Modes:** Co-op battle by an ally can compromise the shared sector; rivalry evaluates owner turn only.

### Cleanse/scar/static missions

#### 10. Static Burial Rite

- **Faction/flavor:** Glass Choir and Veyr Clans; bind a signal echo into salt and brass.
- **Objective:** Resolve one blue anomaly while carrying a scar, then visit a shrine-tag sector.
- **Completion trigger:** Shrine text resolves after anomaly marker earned.
- **Reward:** Relieve one scar penalty for the scenario and gain completed-mission credit.
- **Risk:** Failing the anomaly adds Heat.
- **UI:** Two-stage card with qualifying scar shown privately.
- **Modes:** Same core in all modes; scar details remain phone-private.

#### 11. Cinder-Suture Oath

- **Faction/flavor:** Meridian Compact; prove a field treatment under active pressure.
- **Objective:** Heal a wound on a sector that still has at least one unresolved threat.
- **Completion trigger:** Authoritative heal effect succeeds in the pressured sector.
- **Reward:** Medical equipment charge plus mission credit.
- **Risk:** The unresolved threat remains; mission does not bypass engagement order.
- **UI:** Clearly state that healing does not clear or suppress the threat.
- **Modes:** Co-op ally healing can qualify if the owner is the patient; solo self-heal only.

#### 12. Hush the Relay Choir

- **Faction/flavor:** Glass Choir; align two static nodes before escalation advances.
- **Objective:** Clear two blue-lane encounters with different effect keys.
- **Completion trigger:** Second distinct encounter clear.
- **Reward:** Reduce Heat and reveal an anomaly-safe route.
- **Risk:** Escalation advancement removes one stored node.
- **UI:** Show distinct node IDs as friendly labels, never raw keys.
- **Modes:** Shared nodes in co-op; owner-specific nodes in rivalry.

### Escort/protect missions

#### 13. Ash Pilgrim Passage

- **Faction/flavor:** Veyr Clans; escort a funeral pilgrim token across one ring boundary.
- **Objective:** Carry the token from an outer shrine to any middle-sector recovery tag.
- **Completion trigger:** Arrival after surviving all route encounters.
- **Reward:** Follower offer or completed-mission credit plus cooling.
- **Risk:** Recall drops the pilgrim at the last reached sector.
- **UI:** Token appears attached to operative; route preview shows danger count.
- **Modes:** Co-op transfer at shared sector; rivalry cannot attack/steal the pilgrim directly.

#### 14. Warden Span Watch

- **Faction/flavor:** Kaldr Dominion; keep a route clear for one full round.
- **Objective:** Clear a marked span, remain there through the next broadcast, and prevent new unresolved red pressure.
- **Completion trigger:** Next-round check passes.
- **Reward:** Trophy and a temporary route-guard benefit.
- **Risk:** Any new red pressure resets the hold timer.
- **UI:** Public hold timer and exact reset reason.
- **Modes:** Co-op any operative may defend; rivalry mission owner must be present at completion.

### Shop/economy missions

#### 15. Foundry Debt Recast

- **Faction/flavor:** Meridian Compact; turn damaged kit into certified field stock.
- **Objective:** Sell one normal equipment item, then buy a different subtype during the same shop visit.
- **Completion trigger:** Both server-validated transactions complete.
- **Reward:** Refund part of the Salvage cost and add completed-mission credit.
- **Risk:** Requires stock and sufficient net Salvage.
- **UI:** Shop shows `Sell -> Buy` checklist and eligible stock count.
- **Modes:** Same rule all modes; stock remains authoritative and random.

#### 16. Cartel Margin Call

- **Faction/flavor:** Pale Cartels; profit from a dangerous bargain.
- **Objective:** Buy equipment from a risk-shop while at Heat 2 or higher, then end the turn without gaining more Heat.
- **Completion trigger:** Broadcast/end-turn check.
- **Reward:** Salvage profit or a stock peek at the next shop.
- **Risk:** Any Heat gain voids the attempt but keeps the purchase.
- **UI:** Sticky end-turn condition next to Heat changes.
- **Modes:** Same rule; rivalry keeps exact shop choice private until purchased.

### Threat-control missions

#### 17. Lane Balance Protocol

- **Faction/flavor:** Meridian Compact; prevent one pressure color from dominating a district.
- **Objective:** End a turn on a sector after reducing its most numerous face-up lane to no more than one card.
- **Completion trigger:** End-turn public sector-state check.
- **Reward:** Cool Heat and mission credit.
- **Risk:** New exploration draws can undo the setup before turn end.
- **UI:** Show lane counts and which lane currently qualifies.
- **Modes:** Co-op can prepare the sector; rivalry owner must perform the final reduction.

#### 18. Three-Color Quiet

- **Faction/flavor:** Glass Choir; clear one red, one blue, and one yellow pressure across any sectors.
- **Objective:** Record one successful resolution in each lane.
- **Completion trigger:** Third unique lane recorded.
- **Reward:** Choose trophy, Salvage, or cooling; then gain mission credit.
- **Risk:** Taking a scar clears the oldest lane marker.
- **UI:** Three colored-but-shape-redundant markers for accessibility.
- **Modes:** Solo all owner; co-op one marker may come from an assist; rivalry progress remains owner-private until complete.

### Scenario-progress missions

#### 19. Seal Restoration Window

- **Faction/flavor:** Kaldr Dominion; restore a scenario seal before loss pressure crosses a threshold.
- **Objective:** Resolve a scenario-tag sector operation while loss pressure is below the shown limit.
- **Completion trigger:** Matching scenario progress event.
- **Reward:** Advance win progress or prevent one loss-pressure gain, as authored by scenario.
- **Risk:** Mission expires when the threshold is crossed.
- **UI:** TV may show public deadline; phone shows exact reward and valid sectors.
- **Modes:** Shared objective in co-op; personal contribution credit in rivalry; solo gets one extra turn of deadline.

#### 20. Core Witness Chain

- **Faction/flavor:** Cross-faction; gather evidence from two rings before a core attempt.
- **Objective:** Resolve one mission-tag operation in the middle ring and one scenario-tag operation in the inner ring.
- **Completion trigger:** Both distinct-ring witnesses stored.
- **Reward:** Completed-mission credit plus a scenario-specific core qualification.
- **Risk:** Recall removes the inner witness only.
- **UI:** Explicitly separate contract completion from core eligibility.
- **Modes:** Co-op witnesses can be split among players but mission credit goes to the accepter; rivalry requires owner participation in both.

## Comparison with the current Ashen Reach contract system

This section describes the current dirty worktree snapshot. It is an audit observation, not a claim that the uncommitted mission-lifecycle work is already on the branch baseline.

### What the system supports now

- 30 authored contracts across six faction givers.
- Exactly two objective schemas: `defeatCount` and `spaceTextResolved`.
- 11 defeat-count contracts and 19 named-space/effect-key contracts.
- Targets are mostly one-step: 20 target 1, eight target 2, and two target 3.
- Progress advancement is server-side through authoritative enemy-defeat and space-text-resolved triggers.
- One active contract per character is enforced.
- The current WIP reducer validates completion, applies the authored reward, clears the active contract, and stores the completed contract ID.
- The current WIP shop projection exposes a three-completed-missions artifact trade.
- Phone movement destination models and TV map presentation already calculate mission relevance for sectors.
- Rewards currently cover gear, followers, Heat reduction, healing, trophies, notes, and sequences.

### Supported pattern coverage

| Pattern | Current support | Gap |
| --- | --- | --- |
| Generic defeat count | Strong | Cannot filter by lane, family, ring, marked target, or distinct sector. |
| Named sector operation | Strong but rigid | Uses exact effect keys; no tag/ring/set-based target selection. |
| Travel/arrival | Indirect | Only counts when a particular space text resolves, not arrival/end movement itself. |
| Multi-stop route | Missing | No marker set, distinct-sector history, order, or deadline. |
| Shop/economy | Missing as objective | No buy/sell/spend/repair objective triggers. |
| Collect/recover item | Missing | No mission-object inventory or acquire/deliver trigger. |
| Cleanse/scar/static | Mostly missing | Effects can heal/cool, but objectives cannot observe these actions. |
| Escort/protect | Missing | No carried mission token, hold timer, dropped state, or shared transfer. |
| Threat-control | Missing | Cannot query lane counts, persistent face-up pressure, or sector clear state as progress. |
| Scenario-progress | Partial | Contract completion can notify scenario objectives, but contracts cannot natively target scenario progress events. |
| Co-op contribution | Limited | Progress belongs to the active contract owner; assist semantics are not generalized. |
| Rivalry moving target | Missing and privacy-sensitive | Requires owner-private target state and public-safe projection. |

### Mechanics that are unclear or brittle

1. `spaceTextResolved` is player-readable only because a label accompanies an internal effect key. Any content/UI drift between label and effect key can make a mission look valid while failing to progress.
2. Eleven defeat contracts vary mainly by count and prose; they do not yet distinguish enemy lane, family, region, or sector history.
3. Many gear rewards in the dirty worktree reference names involved in the ongoing equipment/artifact separation. Validation may pass through resolved content, but the design intent of “normal equipment reward versus artifact-tier reward” needs explicit post-separation review before playtest.
4. `gain_note` rewards are flavorful but can feel mechanically empty unless the note has a visible future use.
5. Progress changes can occur through character hooks that set a floor or advance a contract; the phone should explain the source so players do not perceive unexplained progress.
6. The current contract system has no authored failure, expiry, regression, or replacement cost, so all pressure comes from normal board tempo.

### Reward flow status

The current WIP addresses the most serious lifecycle gap: completion applies the reward immediately, stores a completed mission, clears the active slot, and returns to action so another mission can be accepted. Three stored completions can be spent at the relic dealer for an artifact. These behaviors are materially clearer than leaving a pending effect or retaining a stale active contract.

Remaining presentation requirements for a later UI pass:

- itemize the applied reward rather than only say “complete”;
- show completed-mission inventory progress as `N/3` toward artifact access;
- show a new-offer call to action after resolution;
- distinguish “objective reached” from “reward claimed” if any future mission adds a turn-in location;
- retain historical scenario-completion counts separately from the spendable completed-mission pile;
- ensure old saves without first-class completed-contract state receive an explicit migration policy.

### Recommended mechanics expansion order

1. Add typed objective filters to `defeatCount`: lane, family, ring, distinct sector, and marked target.
2. Add `arriveAt`/`visitSet` with tag/ring filters and distinct-sector tracking.
3. Add shop transaction triggers: buy, sell, repair, and spend amount.
4. Add acquire/carry/deliver mission-object state with dropped-token behavior.
5. Add sector-control and scenario-progress triggers.
6. Add optional deadline/regression clauses with explicit UI reasons.
7. Add cooperative contribution policy and rivalry-private target projection only after tests define ownership and privacy.

This preserves server authority and avoids implementing mission legality in phone or TV components.

## Top 10 lessons for Ashen Reach

1. Make missions redirect normal turns instead of creating isolated mini-games.
2. Prefer broad, inspectable target filters over a single fragile content ID.
3. Put multi-step route markers on the board and progress summary on the phone.
4. Show reward, risk, valid targets, and current progress before acceptance.
5. Use known rewards to justify danger; avoid surprise penalties after commitment.
6. Distinguish difficulty through ring depth, target scarcity, step count, payment, and regression.
7. Let co-op partners contribute without stealing ownership or reward clarity.
8. Keep rivalry targets private while projecting only public-safe mission relevance.
9. Keep trophies, equipment, followers, artifacts, and completed-mission currency in separate economy lanes.
10. Complete the lifecycle visibly: objective met, reward applied, mission stored, next offer ready.

## Deliverables

- Discovery/source manifest: `research/reference/relic/relic-mission-pages.json`
- Per-card paraphrased analysis: `research/reference/relic/relic-mission-analysis.json`
- Visual contact sheet: `research/reference/relic/relic-mission-contact-sheet.png`
- Private reference JPEGs: `research/reference/relic/mission-cards/` (34 untracked files; do not commit)

