# Follower Acquisition Audit

## Result

- Canonical definitions: **24**
- Player-facing normal followers: **21**
- QA-only follower fixtures: **3**
- Normally obtainable before: **6/21**
- Missing a reachable source before: **15/21**
- Normally obtainable after: **21/21**
- Player-facing followers still blocked: **0**

Catalog presence, test injection, debug fixtures, and legacy saves were not counted as acquisition.

## Complete inventory

| Stable ID | Role | Ability model | Previous normal source | Previous status | Implemented source | Type | Tier | Final status |
|---|---|---|---|---|---|---|---|---|
| ash-porter | porter | discard reaction | none | no source | Dock Nine Wreckage | fixed board | Common | Obtainable and functional |
| black-lantern-broker | informant | note, once/round | none | no source | Anchor Market | fixed board | Standard | Obtainable and functional |
| burnt-road-quartermaster | porter | discard reaction | none | no source | Ember Stair | fixed board | Common | Obtainable and functional |
| choir-defector | ritualist | pre-roll +1, once/round | Anomaly Well / Choir Shrine | obtainable, fallback ability | unchanged | fixed board | Standard | Obtainable and functional |
| cinder-surgeon | medic | heal 1, discard | Old Mercy Bay | obtainable | unchanged | fixed board | Standard | Obtainable and functional |
| crownless-advocate | informant | private note, once/round | none | no source | Shard Sprawl gossip | fixed choice | Standard | Obtainable and functional |
| fandiablos | companion | special/exhaust | Artifact definition not in a live deck | unreachable Artifact | Blackstar Shortcut cache | random Artifact | Rare | Obtainable and functional |
| gate-saint-acolyte | ritualist | private note, once/round | none | no source | Broken Census Hall | fixed board | Standard | Obtainable and functional |
| glassmere-mapper | scout | private note, once/turn | none | no source | Glass Signal Pier | fixed board | Common | Obtainable and functional |
| grave-scribe | scout | private note, once/turn | Lantern Post / anomalies | obtainable, fallback ability | unchanged | board/anomaly | Common | Obtainable and functional |
| lucy-hell-puppy | companion | note/exhaust | Artifact definition not in a live deck | unreachable Artifact | Old Mercy Bay cache | random Artifact | Rare | Obtainable and functional |
| mira-rift-twin | companion | note plus Rumi passive | Artifact definition not in a live deck | unreachable Artifact | Red March cache | random Artifact | Rare | Obtainable and functional |
| mirecoil-saboteur | guide | discard route reaction | none | no source | Rusted Transit Gate | fixed board | Standard | Obtainable and functional |
| murkclaw-gravecrow | companion | note/exhaust | Artifact definition not in a live deck | unreachable Artifact | Fallen Hab-Stack cache | random Artifact | Rare | Obtainable and functional |
| pale-cartel-fixer | informant | private note, once/round | Rivalry Pit / Pale Ledger Token | obtainable, fallback ability | unchanged | board/gear | Standard | Obtainable and functional |
| red-march-guide | guide | route reaction, once/round | Contract / anomaly | obtainable, fallback ability | unchanged | contract/anomaly | Common | Obtainable and functional |
| rune-eye-raven | scout | note/exhaust | Artifact definition not in a live deck | unreachable Artifact | Choir Shrine cache | random Artifact | Rare | Obtainable and functional |
| saltflat-bone-reader | ritualist | private note, once/round | none | no source | Mire Vent Colony | fixed board | Standard | Obtainable and functional |
| votive-gunner | gunner | passive battle + reaction | Red March Outpost | obtainable, fallback ability | unchanged | fixed board | Standard | Obtainable and functional |
| webglass-runner | guide | private note, once/turn | none | no source | either Webglass Fracture success | fixed choice | Common | Obtainable and functional |
| zoey-thorn-violet | companion | note plus Rumi/Mira passive | Artifact definition not in a live deck | unreachable Artifact | Red March cache | random Artifact | Rare | Obtainable and functional |
| qa_alpha_follower_01 | companion | QA fixture | QA character only | QA/test-only | QA character only | QA loadout | QA-only | Intentionally excluded |
| qa_alpha_follower_02 | informant | QA fixture | QA character only | QA/test-only | QA character only | QA loadout | QA-only | Intentionally excluded |
| qa_alpha_follower_03 | medic | QA fixture | QA character only | QA/test-only | QA character only | QA loadout | QA-only | Intentionally excluded |

## Authoritative acquisition rules

- Fixed successes award the exact stable ID automatically.
- Companion Artifact caches select from the eligible local deck using the server random source.
- The exact Artifact and follower are resolved once, then the Artifact is consumed.
- One stable ID is allowed per operative. Unique followers are allowed once per table; non-unique followers may belong to different operatives.
- Ineligible random rewards are filtered before selection. An unavailable fixed reward completes as an explicit no-additional-follower note.
- There is no generic capacity, trade, transfer, or client-authored follower object.
- Source actions and the event log preserve replay and reconnect identity.
