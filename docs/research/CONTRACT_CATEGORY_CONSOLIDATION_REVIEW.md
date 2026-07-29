# Contract Category Consolidation Review

## Outcome

Ashenreach now has one live owner-objective card family: **Contracts**.

The former twelve-card Mission design catalog duplicated the canonical Contract lifecycle. Nine records had already been promoted into the live Contract deck. This pass promotes the remaining three and removes the duplicate legacy data source.

Internal save-version-2 fields and event names containing `mission` remain accepted as compatibility boundaries. They do not represent a second live card family.

## Twelve-card review

| Former Mission | Canonical Contract | Decision | Authoritative completion | Reward |
|---|---|---|---|---|
| Cleanse the Ember Sanctum | `cleanse-ember-sanctum` | Existing promotion retained | Resolve Ember Sanctum rest | Heal 1 Wound |
| Restart the Void Relay | `restart-void-relay` | Existing promotion retained | Resolve relay crew operation | Signal Pike |
| Hunt the Breachborn | `hunt-breachborn` | Existing promotion retained | Defeat two enemies | 1 trophy |
| Map the Broken Paths | `map-broken-paths` | Existing promotion retained | Resolve broken-causeway shortcut | Completion record |
| Salvage the Bellframe | `salvage-the-bellframe` | Existing promotion retained | Resolve Shard Sprawl bargain | Scrap Drone |
| Hold the Ridge | `hold-the-ridge` | Promoted | Resolve Ember Stair brace after its arrival blockers clear | 2 trophies |
| Choir Quietus | `choir-quietus` | Existing promotion retained | Resolve Choir Shrine operation | Completion record |
| Break the Raider Chain | `break-the-raider-chain` | Existing promotion retained | Defeat two enemies | 1 trophy |
| Pilgrim Convoy | `pilgrim-convoy` | Existing promotion retained | Resolve Guardian Span threshold | Completion record |
| Span of the Last Seal | `span-of-the-last-seal` | Promoted and adapted | Visit Guardian Span, then Veil Rift; normal Artifact entry gate remains authoritative | 1 trophy |
| Lattice Witness | `lattice-witness` | Promoted and adapted | Resolve the Cinder Lattice trial | Heal 1 Wound |
| Gatefire Vigil | `gatefire-vigil` | Existing promotion retained | Resolve Gate of Cinders trial | 1 trophy |

## Design decisions

- The Contract deck grows from 36 to 39 live cards.
- No Mission-only draw, resolver, reward, or cleanup path is introduced.
- Setup offers, replacement offers, the three-card active limit, completion history, relic exchange, reconnect, and owner privacy continue using the existing Contract authority.
- Hold the Ridge uses an existing operation instead of adding a location-plus-battle objective type.
- Span of the Last Seal uses an ordered route. The separate inner-reach rule already requires an Artifact, so the Contract does not duplicate gate validation.
- Lattice Witness uses the canonical Cinder Lattice operation and an existing typed reward.
- Existing artwork is promoted unchanged into the canonical Contract asset root; no image is generated or edited.

## Compatibility

The following names remain internal compatibility surfaces and are not new card categories:

- `missionSelectedAt`
- `completedMissionRecords`
- pending Mission-selection/relic-exchange state fields
- legacy Mission event and intent identifiers
- the version-2 `/starting-mission` setup endpoint

New and current clients present these records as Contracts. Removing compatibility fields would require a save/protocol migration and is intentionally outside this consolidation.
