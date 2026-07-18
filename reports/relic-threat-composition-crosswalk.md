# Relic Threat Composition Crosswalk

## Evidence boundary

The local source-backed catalogue is `reports/relic-threat-card-taxonomy.md`. It records 261 archive entries and explicitly marks fine rule text as incomplete where only card-image/category metadata was available. Counts below are confirmed catalogue/category counts; they are not invented from missing scans.

| Relic deck | Total | Enemies | Events | Equipment/assets/other | Allies | Other encounters | Chance of non-combat discovery |
|---|---:|---:|---:|---:|---:|---:|---:|
| Red | 75 | 48 (64.0%) | 6 (8.0%) | 10 (13.3%) | included in asset/other | 11 (14.7%) | 36.0% |
| Blue | 72 | 45 (62.5%) | 6 (8.3%) | 10 (13.9%) | included in asset/other | 11 (15.3%) | 37.5% |
| Yellow | 74 | 48 (64.9%) | 6 (8.1%) | 10 (13.5%) | included in asset/other | 10 (13.5%) | 35.1% |
| Orange/special | 40 | 9 (22.5%) | 12 (30.0%) | 4 (10.0%) | included in asset/other | 15 (37.5%) | 77.5% |
| **All** | **261** | **150 (57.5%)** | **30 (11.5%)** | **34 (13.0%)** | **not separable without double counting** | **47 (18.0%)** | **42.5%** |

For the three ordinary coloured decks together, Enemies are 141/221 (63.8%), Events 18/221 (8.1%), asset/other 30/221 (13.6%), and other encounters 32/221 (14.5%). The archive’s secondary tags identify 24 Allies, 16 Places, 10 Tasks, 9 Weapons, 4 Armour, and 2 Equipment entries, but those tags overlap the primary classes and therefore cannot be added as a separate Ally column without double counting.

## Confirmed lifecycle principles

- Enemy cards normally oppose a stat and can become progression objects after defeat.
- Events resolve immediate or table-wide instructions and are discarded unless their text establishes persistence.
- asset/other cards include Allies, Places, Tasks, weapons, armour, Equipment, and charged persistent opportunities.
- An Ally or asset may be the drawn card itself; other encounters may grant or unlock one. Exact per-card lifecycle remains image-review dependent where the archive metadata is incomplete.
- The primary decks remain enemy-heavy, but about 35–38% of draws are not Enemies. The orange/special family deliberately changes the rhythm rather than functioning as another ordinary lane.

## Ashen Reach adaptation

Ashen Reach keeps a separate player-owned Equipment and Follower catalogue. A discovery is therefore an authored Threat encounter which grants an exact canonical object; the owned object is not inserted into the Threat deck. This preserves deterministic draw identity, replay protection, instance identity, inventory authority, and projection privacy.

The implemented 109-card presentation mix is 61.5% Enemy, 18.3% Hazard, 5.5% Event, 5.5% other encounter, and 9.2% discovery. This retains the ordinary Relic decks’ approximately 64% Enemy rhythm while replacing the previous all-opposition remainder with original Ashen Reach opportunities. No names, rules text, artwork, or individual effects were copied.
