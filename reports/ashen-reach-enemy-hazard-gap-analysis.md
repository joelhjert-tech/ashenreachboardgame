# Ashen Reach Enemy and Hazard Gap Analysis

## Current canonical inventory

Canonical live content is loaded from:

- Threats: `content/cards/threats/*.json`, parsed by `src/game/content/threats.ts` and `threatCardSchema` in `src/game/schema/card.schema.ts`.
- Anomalies: `content/cards/anomalies/*.json`, parsed by `src/game/content/anomalies.ts` and `anomalyCardSchema`.
- Tile challenges and sector actions: `src/game/data/boardTextEffects.ts`, with sector ownership in `src/game/data/boardSpaces.ts`.
- Threat lane draw/profile rules: `src/game/data/threatDecks.ts` and the live exploration/engagement rules.
- Persistent encounter state: authoritative room/engine threat placement and engagement queues; there is no separate broad persistent-condition deck.

The `threatDecks.ts` five-card-per-lane design catalogue is a design/prototype catalogue, not the canonical 109-card runtime inventory. This audit uses the JSON content as current gameplay authority.

### Ashen Reach totals

- Threats: 109 — 67 enemies and 42 hazards.
- Lanes: red 26, blue 35, yellow 48.
- Anomalies: 20 separate cards.
- Threat stats: Command 17, Forge 23, Grit 22, Guile 22, Signal 25.
- Difficulty: 2–12, mean 6.76.
- Severity: 20 at 1, 47 at 2, 21 at 3, 13 at 4, 8 at 5.
- Regions: outer 63, middle 34, inner 12.
- Tempo: push 75, stall 26, neutral 8.

Current effect signatures are heavily concentrated: `take_wound` appears 78 times and `gain_note` 78 times. There are 13 Scar gains, 12 gear gains, 9 explicit trophy gains, 6 Salvage losses, 2 payments, 2 heals, and very little typed movement or escalation. Five exact hazard-design clusters repeat the same type/stat/difficulty/effect shape across 12 IDs, including three Forge-6 and three Forge-7 hazards.

## Relic versus Ashen Reach

| Dimension | Relic reference | Ashen Reach current | Finding |
|---|---|---|---|
| Population | 261 across four colors | 109 threats + 20 anomalies | Ashen Reach is smaller but already substantial |
| Enemy share | 150/261 (57%) | 67/109 (61%) | Similar enemy weight |
| Non-enemy variety | 47 encounters, 30 events, 34 assets | 42 hazards; anomalies separate | Ashen Reach lacks live event/asset roles inside threat draws |
| Color balance | Red/blue/yellow near equal; orange special | 26/35/48 | Yellow is overrepresented, red underrepresented |
| Stat identity | Strong one-attribute color identities | Five-stat spread, lane profiles overlap | Richer stats, weaker practical lane signature |
| Failure pressure | Broad family mix in reviewed references | Wounds and notes dominate | Consequence repetition is the largest gap |
| Persistence | Allies, places, tasks, charged assets | Some unresolved threats, few persistent mechanics | Board memory is underused mechanically |
| Movement | Route and relocation patterns exist | One typed forced-displacement effect in threats | Movement-control space is thin |
| Equipment | Assets and equipment interactions | Gear gain exists; disruption is sparse | Temporary exact-instance disruption is missing |
| Group scope | Orange uses table-wide events | Mostly owner-local; scenario pressure separate | Group effects need restrained, public-safe use |

Orange should be cross-referenced against anomalies, escalations, scenario ambience, and special events—not treated as an absent fourth lane.

## Lane findings

### Red: Hostile Contact

Red is numerically thin at 26 cards and should emphasize Grit/Forge combat, pursuit, guarding, formations, armour, and spatial pressure. Current physical-loss/Wound outcomes are legible, but repeated “lose, suffer 1 Wound” enemies blur together. Missing identity: guardians that lock routes, enemies whose strength depends on nearby threats, pursuers, reinforcements, and trophy-denial without permanent bookkeeping.

### Blue: Void Anomaly

Blue has 35 threats plus the separate anomaly deck. Signal/Command is well represented, but a large share still resolves as a stat check followed by Wound/Scar/note. Blue needs information, altered targeting, delayed consequences, conditional difficulty, reveal manipulation, and persistent tile interference. It should not simply become the “Signal damage” lane.

### Yellow: Rogue Salvage

Yellow has 48 cards and therefore dominates draws. Guile/Forge fits, but the lane should create bargains, temporary equipment disruption, repair opportunities, risky assets, theft, and route choices. Flat Salvage loss alone would make the lane punitive and economically repetitive. Its strongest future identity is choice plus material consequence.

### Orange/special

Ashen Reach’s anomalies and escalations partially cover orange’s broad event role, but there is no single typed special-encounter family joining group tests, persistent places, tasks, and opportunity cards. Do not add an orange deck yet. First prove one or two special encounter experiments through existing anomaly/scenario systems.

## Overused and duplicate design space

- Wound-on-failure is the default answer across physical, mental, and technical problems.
- `gain_note` often carries flavor without creating a decision.
- Several hazards share identical stat/difficulty/effect structures with only names changed.
- “Push” tempo dominates 75/109 cards, reducing pacing contrast.
- Rewards are often notes/trophies rather than access, information, repair, movement, or bounded choices.
- Persistence is more often “card remains” than a distinct ongoing board rule.
- Some high-complexity text promises exceed the actual typed effect, creating thematic rather than mechanical complexity.

## Missing archetypes

Highest-value gaps:

1. Route guardian and pursuer enemies.
2. Temporary exact-instance equipment disable or charge pressure.
3. Persistent tile hazards with a visible removal condition.
4. Information/reveal rewards that change route decisions.
5. Reward-versus-risk salvage encounters with authoritative choice/payment.
6. Reinforcement/spawn enemies with strict caps and source IDs.
7. Multi-stage technical hazards using existing typed tests.
8. Conditional-strength enemies based on public board state.
9. Group-pressure events that avoid private information and all-player Wound spikes.
10. Mini-bosses with one phase change rather than inflated numbers.

## Recommendations

### Level 1 — text and clarity

- State exact timing: on reveal, before roll, after final failure, on loss, or while unresolved.
- Name the authoritative target and whether Wounds are preventable.
- Distinguish own/carry from spend/consume.
- State persistence and removal conditions on every lingering hazard.
- Replace vague display-name dependencies with stable mechanic concepts.
- Align result text with actual deltas; do not promise healing, movement, or equipment effects that are only flavor.

### Level 2 — mechanical refinement

- Replace duplicate Wound hazards with bounded route, information, temporary item, or choice consequences.
- Strengthen lane identity: red controls combat space, blue controls information/reality, yellow controls material access and routes.
- Convert a small number of note-only successes into information/reveal or preparation benefits using existing authority paths.
- Introduce temporary exact-instance equipment disable only after reconnect-safe state and owner projection are specified.
- Use persistent tile pressure sparingly with a public marker and explicit clear action.
- Keep group consequences on scenario/escalation paths unless a dedicated event owner is proven.

### Level 3 — original archetype concepts

| Concept | Family | Test / band | Core decision and result | Persistence / risk | Complexity |
|---|---|---|---|---|---:|
| Furnace Gatekeeper | Red enemy | Grit 7–9 | Fight now or route around; victory opens one blocked edge | Persists as route guardian; topology must remain authoritative | 3 |
| Ashwake Pursuer | Red enemy | Forge/Grit 6–8 | Defeat it or it advances one authored edge after round end | Needs capped movement and duplicate-source guard | 4 |
| Choir Blindspot | Blue hazard | Signal 7–9 | Clear interference for a private route reveal; failure obscures one public clue | Persistent tile marker, no hidden-state leak | 3 |
| Echo Taxonomy | Blue event | Command 8 | Choose which public threat trait to suppress for one engagement | Temporary modifier cleanup | 3 |
| Scrap Arbitration | Yellow encounter | Guile 7–9 | Pay a known cost for repair or decline and continue | Existing optional-payment path; no farming reward | 2 |
| Jammed Harness | Yellow hazard | Forge 8 | Repair one exact item or accept one-round disable | Exact-instance/reconnect state required | 4 |
| Survey Cache | Yellow opportunity | Signal/Guile 7 | Risk a test for a route reveal or safe Salvage gain | Discards after resolution; source ID required | 2 |
| Breach Weather Front | Special anomaly | mixed 8–10 | Party chooses one public mitigation before a group consequence | Avoid private stats and mass Wound spikes | 4 |
| Relay Nest | Blue/red mixed | staged 7 then 9 | First disable spawning, then confront guardian | Spawn cap and continuation ownership | 5 |
| Cinder Colossus | Red mini-boss | Grit/Forge 10–12 | Break defence, then deal final progress | One phase change; scenario victory remains separate | 5 |

These are archetypes, not production card rules or copied Relic content.

## Four-seat critique

### New player

Lane identity should be readable from both art and consequence. One timing sentence and one consequence family per card is preferable. Persistent cards need a visible “remains until…” line; otherwise they look like failed cleanup.

### Optimizer

Information and movement rewards must not allow deterministic farming. Optional payments need full affordability and free decline. Spawns need hard caps; exact-instance disruption must not be reset by trading, reconnect, or duplicate copies. Rewards should use stable source IDs.

### Family/casual player

The best additions create table discussion with one choice, not nested exceptions. Group events should resolve quickly. Persistent effects should use existing board markers and avoid phone-only memory burdens.

### Rules lawyer

Every proposal needs an owner, timing window, exact target, prevention rule, persistence boundary, cleanup event, reconnect behavior, and duplicate-processing guard. “Spend” consumes; “lose” floors at zero; Wound prevention uses the normal pipeline; movement uses the movement authority.

## Prioritized implementation order

1. **Clarity-only corrections** — audit IDs whose displayed text and typed effect differ. Benefit: trust and learnability. Risk: low. Tests: content copy/result parity.
2. **Duplicate-effect replacements** — start with the five exact hazard clusters, one card per cluster. Benefit: variety without deck growth. Risk: low-medium. Tests: stable identity, old/new branch, reconnect.
3. **Lane-identity improvements** — red guardian, blue information, yellow bargain exemplars. Benefit: route readability. Risk: medium. Tests: lane-specific authority and wrong-context rejection.
4. **Missing hazard archetypes** — one persistent tile hazard and one typed movement interruption. Benefit: board memory. Risk: medium-high. Tests: cleanup, topology, reconnect, stale actions.
5. **Missing enemy archetypes** — pursuer, conditional-strength, reinforcement with caps. Benefit: enemy variety. Risk: high. Tests: round timing, spawn cap, duplicate IDs.
6. **Persistent encounter experiments** — exact-instance equipment disable and task-like multi-stage encounter. Benefit: meaningful noncombat play. Risk: high. Tests: privacy, persistence, reconnect, item ownership.
7. **Boss/escalation cards** — one phase-change mini-boss and one restrained group event. Benefit: climax variety. Risk: highest. Tests: phase ownership, victory separation, multiplayer privacy, replay protection.

No phase is implemented by this audit. The safest next slice is Level 1 clarity plus one duplicate Forge-hazard replacement, selected only after a card-specific approval identifies its exact typed consequence.
