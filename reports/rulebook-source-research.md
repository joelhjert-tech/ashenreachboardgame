# Ashen Reach Rulebook Source Research

Research date: 2026-07-12. This is a copyright-safe comparative study. It records structures and timing ideas, not source prose, setting, names, examples, or layouts.

## Source access matrix

| Source | Type and authority | Access | Sections reviewed | Useful concepts | Incompatible / caution | Pages |
|---|---|---|---|---|---|---|
| [Relic base rules](https://images-cdn.fantasyflightgames.com/ffg_content/relic/support/RE01_Relic_Rulebook.pdf) | Official physical rulebook | Complete; 24-page PDF downloaded, extracted, and visually reviewed | Setup; character anatomy; turn phases; movement; exploration; engagement; battle; experience; missions; defeat/corruption; cards; inner tier; timing; quick reference | Explicit phase rhythm; icon-driven draw deficits; fixed card-type order; persistent encounters; staged battle formula; scenario-specific climax; precise timing terms | Protected setting and terminology; one-way inner tier; level/power/corruption systems are not Ashen Reach rules | pp. 4-21, quick reference p. 24 |
| [Relic: Nemesis rules](https://images-cdn.fantasyflightgames.com/ffg_content/relic/support/Relic_Nemesis_Rulebook.pdf) | Official expansion | Complete; 20-page PDF downloaded and visually reviewed | Alternate roles; duels; nemesis setup/turns/decks; infamy; nemesis battles; multiple agents; scenarios; clarifications | Separate asymmetric role contract; public classification of entities; deterministic sub-turn sequence; scenario-required modes; support bonuses | Ashen Reach has no player-controlled nemesis role; direct theft/duels would conflict with current rivalry privacy and authority | pp. 4-15, quick reference p. 20 |
| [Relic v3 rules summary](https://www.orderofgamers.com/downloads/Relic_v3.pdf) | Unofficial reference sheet | Complete; 8-page PDF downloaded and visually reviewed | Condensed setup, phase, battle, cards, timing, inner tier, expansions | Good quick-reference density and cross-indexing | Secondary source; useful only to locate/check official rules, not establish authority | pp. 3-8 |
| [Relic: Halls of Terra at Manuals+](https://manuals.plus/m/30b150cfd3693682f6ebb3ae56e443bcaee11adf6504a033e6b88b7e53958e6b) | Mirror/transcription of official expansion rules | Substantially accessible HTML; diagrams less reliable than original PDF | Expansion setup; new board/tier; influence; purchase decks; scenario interactions | Separate location economy; explicit transition rules; expansion exceptions | Mirror reliability and formatting; no rule adopted without corroboration | HTML sections corresponding to setup and new-board rules |
| [Talisman Revised 4th Edition rules](https://images-cdn.fantasyflightgames.com/ffg_content/Talisman/Talisman%20Rules2.pdf) | Official physical rulebook | Complete; 24-page PDF downloaded and visually reviewed | Setup; turn; movement; encounters; card encounter numbers; battles/psychic combat; objects/followers; trophies; inner region; endings; timing/golden rules | Mandatory move-then-encounter cadence; card ordering; trophy conversion; region transition examples; encounter flowchart; exception hierarchy | Roll-and-direction movement, alignment, spells, lives, toads, player attacks, and Crown endgame are not Ashen Reach rules | pp. 8-21; encounter flowchart p. 24 |
| [Talisman Digital Edition manual](https://nomadgames.co.uk/talisman-digital-edition-manual-uk) | Official digital adaptation manual | Complete HTML, 2,431 extracted lines | Digital setup; saved games; expansions/house rules; UI-mediated play; card/turn rules | Separate setup configuration; automatic legality; resume language; visible optional-rule boundaries | Describes a different digital game and many expansion/house rules | Setup around lines 224-253; rules sections throughout |
| [Talisman Realm downloads](https://www.talismanrealm.com/pages/downloads) | Fan download index | Inaccessible to the browsing service (internal error) | None verified | Potential index only | Contents not inferred; query-string URL failed | Unable to verify |
| [Talisman Digital 5th Edition manual](https://nomadgames.co.uk/talisman-5th-edition-manual-uk) | Official digital adaptation manual | Accessible HTML; shorter than 4E manual | Components; fate; turn; movement; encounters; updated presentation | One-reroll-per-roll clarity; concise digital instructions | Different edition and balance; not used to overwrite Ashen Reach behavior | Turn section begins near line 161 |
| [Talisman Co-op: Crown of Command](https://www.scribd.com/document/805539651/Rules-Talisman-Coop-Mode-v1) | Community variant | Partially accessible transcription; download/page fidelity restricted | Enemy movement; inner-region routing; cooperative assistance | Shared opposition, limited aid, pressure movement | Not official; incomplete visual/page verification; no content treated as canonical | Accessible text around sections shown on page, exact original pagination unreliable |
| [Reddit co-op variant discussion](https://www.reddit.com/r/Talisman/comments/kqfrce/talisman_coop_version_for_the_main_game_no/) | Community discussion | Accessible post/comments | Variant goals, player-count concerns, cooperative adjustments | Evidence that shared loss clocks and anti-stall rules matter to co-op players | Anecdotal and mutable; comments are interpretations, not rules | No stable pagination |
| [BoardGameGeek co-op thread](https://boardgamegeek.com/thread/765610/co-op-talisman) | Community discussion | URL resolved but page body returned no accessible lines | None verified | Topic existence only | Contents not invented; login/anti-bot rendering likely blocked access | Unable to verify |

## Cross-source mechanical findings

### Turn structure

Relic's prepare, movement, exploration, engagement, and experience cadence is the closest structural comparison. Talisman compresses play into move then encounter. Both make the active player's obligation explicit and reserve exceptions for cards/spaces. Ashen Reach already has authoritative `start`, `navigation`, `sector`, `action`, `resolution`, and `broadcast` phases, so the useful lesson is player-facing simplification, not phase replacement.

### Movement and regions

Both physical games rely on dice movement and explicit transition spaces. Their examples show why region/gate exceptions need prominent wording. Ashen Reach differs materially: the server computes exact-distance legal routes through authored adjacency. Direction choice, arbitrary path reconstruction, and manual counting are therefore rejected. The compatible principle is that a route transition must be authored and validated.

### Encounters and persistence

Relic's event -> enemy -> encounter -> asset order and Talisman's encounter-number ordering both prevent table negotiation. Relic also distinguishes discarded events from persistent encounters. Ashen Reach now uses an engagement queue plus persistent tile challenges and Threats; this comparison supports documenting their distinct persistence and ordering without importing source card types wholesale.

### Combat and tests

Both sources expose base value, roll, modifiers, total, and comparison. Relic explicitly stages battle timing. Ashen Reach's five attributes and server-produced modifier rows fit this principle. Talisman stand-offs and player attacks are not implemented. No source supports inventing a tie rule for Ashen Reach where the reducer does not state one.

### Progression and economy

Trophies converted into attributes, missions/contracts, item limits, and currency create multiple advancement lanes in the sources. Ashen Reach implements trophy value/piles, Salvage, shops, one active contract, completed-contract ledger IDs, gear, followers, and Artifacts. Source-specific level, fate, gold, alignment, corruption, and power-card systems remain rejected or proposal-only.

### Cooperative and competitive play

The official Nemesis expansion is asymmetric competition, not co-op. The community variants commonly add shared enemies, clocks, assistance, and anti-stall pressure, but their authority is low. Ashen Reach already has co-op scenario pressure and private rivalry agendas; proposals must preserve phone privacy and cannot expose raw agenda data to TV.

### Endgame

Both official games use a gated approach to a scenario/final region and an exception-heavy climax. Ashen Reach instead uses scenario-specific confrontation plans, objective progress, global escalation/collapse, and a canonical winner/session-ended state. The rulebook must present each active scenario as overriding general climax instructions.

### Digital enforcement

Nomad's manuals demonstrate the value of documenting what software resolves. For Ashen Reach, route legality, dice, totals, inventory mutation, shop validation, mission progress, private projections, and reconnection are automatic. Players should respond to prompts, not reproduce server bookkeeping.

## Reliability and copyright notes

- Official Fantasy Flight PDFs are primary sources for their respective physical games.
- Nomad manuals are primary for those digital adaptations, not for Ashen Reach.
- Order of Gamers is a secondary reference aid.
- Manuals+ is a mirror with formatting risk.
- Scribd, Reddit, and BoardGameGeek entries are community material and never treated as official.
- No large source passage is reproduced. Page citations identify concepts only.
- All Ashen Reach rules and examples in the companion documents are original and repository-grounded.
