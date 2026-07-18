# Relic Threat Card Taxonomy

## Population

The API-derived population is 261 cards. Wiki categories provide a reliable first-level split:

| Color | Total | Enemy | Encounter/hazard | Event | Asset/other |
|---|---:|---:|---:|---:|---:|
| Red | 75 | 48 | 11 | 6 | 10 |
| Blue | 72 | 45 | 11 | 6 | 10 |
| Yellow | 74 | 48 | 10 | 6 | 10 |
| Orange | 40 | 9 | 15 | 12 | 4 |
| **Total** | **261** | **150** | **47** | **30** | **34** |

“Asset/other” maps to the audit’s `Other` primary class because it is neither enemy, hazard, event, nor condition. Many are persistent allies, places, weapons, armour, equipment, or task-like rewards. This is a major design distinction: a threat draw can reveal opportunity or persistent utility, not merely opposition.

## Attribute and printed-value distribution

Relic’s three printed attributes are strongly color-coded. The printed number is an enemy/test value, not assumed to be Ashen Reach’s activation number.

| Color | Dominant attribute | Attribute-labelled cards | Average | Median | Range |
|---|---|---:|---:|---:|---:|
| Red | Strength | 42 Strength; 4 Cunning; 2 Willpower | 4.33 | 4 | 1–13 |
| Blue | Willpower | 39 Willpower; 4 Strength; 2 Cunning | 4.29 | 3 | 0–13 |
| Yellow | Cunning | 42 Cunning; 4 Willpower; 2 Strength | 4.23 | 4 | 1–13 |
| Orange | Mixed/special | 4 Strength; 3 Willpower; 2 Cunning | 3.11 | 3 | 2–4 |

Across all colors: Strength 52, Cunning 50, Willpower 48, and 111 cards without a single attribute category. The high unlabelled count corresponds primarily to events, encounters, and assets. Category-derived printed-value frequencies are: 0×2, 1×23, 2×25, 3×27, 4×18, 5×16, 6×14, 7×6, 8×3, 9×3, 10×4, 11×2, 12×4, and 13×3.

Relic does not expose a consistent machine-readable activation/trigger-number category. The catalogue therefore does not relabel printed combat/test values as activation numbers.

## Color identity

### Red

Red is the clearest direct-conflict deck: 48/75 cards are enemies and 42 use Strength. Its useful variety comes from opponent exceptions, conditional dice behavior, elite values, and rewards layered onto otherwise legible battles. The reviewed sample shows that a low printed value can still matter because of a memorable combat constraint and a conditional reward.

Dominant archetypes: basic stat opponent, elite/boss, attrition enemy, conditional-strength enemy, trophy reward. Rare identity breaks—Cunning/Willpower enemies, events, encounters, and assets—keep the lane from becoming a uniform Strength ladder.

### Blue

Blue mirrors red numerically but shifts toward Willpower and uncanny opponents. Its identity is mental/psychic resistance, daemonic or monstrous pressure, and conditional or status-shaped resolution. It retains the same 45/72 enemy-heavy structure, so color identity comes mainly from tested attribute, traits, and exceptions rather than a different enemy/hazard ratio.

Dominant archetypes: Willpower enemy, status pressure, conditional difficulty, persistent encounter, information/psychic utility. A design caution for Ashen Reach is not to reduce “strange” to repeated Signal checks with the same Wound failure.

### Yellow

Yellow is Cunning-led but still enemy-heavy: 48/74. Its assets and encounters establish trade, infiltration, allies, equipment, and opportunistic rewards. A reviewed asset provides a repeated purchase opportunity with a premium, demonstrating a persistent economy engine rather than an immediate reward.

Dominant archetypes: Cunning enemy, resource interaction, equipment reward/disruption, choice-and-consequence, persistent ally/asset. The strongest reusable principle is that salvage-oriented danger should offer decisions and altered access, not only subtract currency.

### Orange

Orange is structurally distinct: only 9/40 enemies, with 15 encounters and 12 events. It is the true special/global deck. A reviewed event tests every player using a dynamically selected weak attribute, applies severe group damage on failure, and upgrades success into a persistent reward. That combination would be too swingy to copy directly, but it illustrates how a special color changes table scope, targeting, and reward shape.

Dominant archetypes: area-wide event, group pressure, player-choice encounter, persistent place/ally, reward-versus-risk, scenario-scale exception. Orange should not be mapped one-to-one onto an Ashen Reach lane; it is closer to anomalies, escalations, scenario events, and special encounters collectively.

## Structural archetype frequency

The machine catalogue assigns conservative structural archetypes because full rules are image-only:

- Basic/conditional stat opponent: 150 primary enemy records.
- Attribute-test encounter/hazard: 47.
- Area-wide or immediate event: 30.
- Persistent asset/condition/opportunity: 34.

Fine sub-archetypes—movement control, equipment disruption, resource drain, delayed damage, spawning, trophy denial, choices, and multi-player consequences—remain a visual-review queue rather than invented counts. Wiki category signals add useful secondary evidence: 24 Allies, 16 Places, 10 Tasks, 9 Weapons, 4 Armour, 2 Equipment, twelve “2 Charges” and ten “3 Charges” entries. These show persistent and charged design space that ordinary enemy counts conceal.

## Reward, failure, persistence, and complexity findings

Quantitative reward/failure frequencies cannot be responsibly extracted from the page metadata alone. The archive records them as uncertain. Qualitatively, reviewed scans and category structure establish these reliable patterns:

- Enemies are usually one-roll blockers but gain identity from one exception.
- Encounters carry more choice, persistence, and location memory than enemies.
- Events resolve at broader scope and can target all players or dynamic attributes.
- Assets turn a threat draw into an engine, ally, place, or equipment opportunity.
- Rewards are not limited to trophies; resource, attribute, card, persistent access, and conditional upgrades appear.
- Success and failure are often asymmetric rather than equal-and-opposite numeric deltas.
- The dominant complexity band is low for enemies, medium for encounters, and medium-high for events/assets.

## Unusual and uncertain cards

Highest-priority manual review groups:

1. Orange events and places: likely broad timing and group-state implications.
2. Charged assets: persistence and depletion semantics.
3. Tasks: delayed or multi-stage completion.
4. Nemesis/elite values 10–13: boss scaling and reward proportionality.
5. Cards with off-color attributes: deliberate lane-identity breakers.
6. Attribute-0 cards: special rules dominate printed difficulty.

All 261 records retain a manual-review note for fine rules. This is a confidence flag, not an image-selection failure.

## Reusable design principles

- Give a basic enemy one readable exception rather than several modifiers.
- Let lane identity come from both attribute and consequence family.
- Mix threats, persistent problems, and opportunities within a deck.
- Use off-color tests sparingly to prevent route certainty.
- Make special/global encounters structurally different, not merely harder.
- Prefer asymmetric success/failure that tells a small story.
- Use persistent board memory when it changes future routing.
- Make equipment interaction temporary or exact-instance and server-authoritative.
- Scale rewards with rarity and exposure, while preventing repeatable farming.

Patterns that do not fit Ashen Reach unchanged include life/level/influence economies, copied corruption systems, unrestricted all-player damage, unbounded stat growth, and text-heavy exceptions that cannot be surfaced cleanly on phone and TV. Ashen Reach should adapt the structural principle through Wounds, Scars, Salvage, typed movement, Contracts, exact-instance items, and scenario pressure.
