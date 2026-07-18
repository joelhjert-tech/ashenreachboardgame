# Ashen Reach Tile Function Audit

Generated from all 49 canonical board spaces. The effect key is the authoritative named-space resolver; printed Threat icons drive arrival exploration. Recurring tile challenges are resolved before Threat draws, followed by named text after blockers clear.

| Stable sector ID | Display name | Ring | Named function | Resolver | Threat icons | Entry requirement |
|---|---|---|---|---|---|---|
| `north-dock-bastion` | North Dock Bastion | outer | Bastion Watch | `outer_relayCrew` | yellow | None |
| `outer_waymarket` | Anchor Market | outer | Market Exchange | `outer_waymarketExchange` | yellow | None |
| `coldwind-wharf` | Coldwind Wharf | outer | Cold Dock Signal | `outer_glassmereChorus` | blue | None |
| `outer_broken_causeway` | Dock Nine Wreckage | outer | Wreckage Sweep | `outer_brokenCausewayShortcut` | yellow, red | None |
| `emberwatch-step` | Ember Stair | outer | Climb the Stair | `outer_emberwatchBrace` | red, blue | None |
| `cinder-fields` | Cinder Fields | outer | Cinder Sweep | `outer_emberwatchBrace` | red | None |
| `glassmere-spindle` | Glass Signal Pier | outer | Signal Chorus | `outer_glassmereChorus` | blue | None |
| `outer_ember_sanctum` | Pilgrim Lock Gate | outer | Pilgrim Rest | `outer_emberSanctumRest` | None | None |
| `mirecoil-beacon` | Rusted Transit Gate | outer | Transit Traffic | `outer_mirecoilTraffic` | yellow, blue | None |
| `outer_oathpost` | Broken Census Hall | outer | Census Writ | `outer_oathpostWrit` | red | None |
| `colony-outskirts` | Colony Outskirts | outer | Outskirts Sweep | `outer_hollowVeilSweep` | yellow | None |
| `deadwater-marsh` | Deadwater Marsh | outer | Deadwater Reading | `outer_saltCrossing` | blue | None |
| `votive-engine-room` | Votive Engine Room | outer | Recharge the Votive | `outer_saltCrossing` | blue | None |
| `ashwake-crossing` | Ashwalk Bridge | outer | Hold the Bridge | `outer_ashwakeClearLane` | yellow | None |
| `outer_surgery_tent` | Old Mercy Bay | outer | Rough Treatment | `outer_surgeryTreatment` | red | None |
| `outer_salt_flats` | Mire Vent Colony | outer | Vent Harvest | `outer_saltCrossing` | blue | None |
| `rustveil-yard` | Rustveil Yard | outer | Rustveil Salvage | `outer_hollowVeilSweep` | yellow | None |
| `sunken-pier` | Sunken Pier | outer | Sunken Signal | `outer_relayCrew` | blue | None |
| `shattered-causeway` | Shattered Causeway | outer | Causeway Thread | `outer_brokenCausewayShortcut` | yellow | None |
| `kettleward-foundry` | Kettleward Foundry | outer | Foundry Repair | `outer_waymarketExchange` | yellow | None |
| `flooded-locks` | Flooded Locks | outer | Flooded Lockwork | `outer_glassmereChorus` | blue | None |
| `transit-gate` | Transit Gate | outer | Gate Dispatch | `outer_mirecoilTraffic` | blue | None |
| `outer_relay_camp` | Lantern Post 47 | outer | Lantern Watch | `outer_relayCrew` | blue | None |
| `hollow-veil-yard` | Fallen Hab-Stack | outer | Hab-Stack Sweep | `outer_hollowVeilSweep` | red, yellow | None |
| `middle_red_march_outpost` | Choir Bastion | middle | Bastion Bargain | `middle_redMarchBargain` | red | None |
| `middle_anomaly_well` | Static Chapel | middle | Read the Chapel | `middle_anomalyWell` | blue, yellow | None |
| `middle_shard_sprawl` | Chain-Maul Yard | middle | Yard Bargain | `middle_shardSprawlBargain` | red, yellow | None |
| `middle_rivalry_pit` | Mirror Barracks | middle | Mirror Drill | `middle_rivalryClaim` | red, yellow | None |
| `black-relay-spire` | Black Relay Spire | middle | Stabilize the Relay | `middle_anomalyWell` | blue, yellow | None |
| `middle_relic_cache` | Crucible of Names | middle | Name the Trophy | `middle_relicCache` | yellow | None |
| `the-salt-archive` | The Salt Archive | middle | Archive Contract | `middle_shardSprawlBargain` | yellow | None |
| `middle_webglass_breach` | Grave-Rail Junction | middle | Rail Fracture | `middle_webglassFracture` | yellow, blue | None |
| `middle_scar_surgery` | Sable Machine Choir | middle | Machine Hymn | `middle_scarSurgery` | red, blue | None |
| `weeping-ammunition-shrine` | Weeping Ammunition Shrine | middle | Dangerous Ammunition | `middle_redMarchBargain` | red, blue | None |
| `middle_guardian_span` | Customs Gate | middle | Customs Threshold | `middle_guardianSpanThreshold` | red, blue, yellow | None |
| `red-lantern-trenches` | Red Lantern Trenches | middle | Trench Ambush | `middle_rivalryClaim` | red, yellow | None |
| `scorched-road` | Scorched Road | middle | Scorched Passage | `outer_ashwakeClearLane` | yellow | None |
| `blastworks` | Blastworks | middle | Blastworks Toll | `middle_shardSprawlBargain` | red | None |
| `ashen-chapel` | Ashen Chapel | middle | Ashen Rite | `middle_anomalyWell` | blue | None |
| `reavers-den` | Reaver's Den | middle | Den Challenge | `middle_redMarchBargain` | red | None |
| `inner_gate_of_cinders` | The Last Signal Well | inner | Last Signal | `inner_gateOfCindersTrial` | None | None |
| `inner_choir_shrine` | Saint Engine Crypt | inner | Crypt Petition | `inner_choirShrine` | None | None |
| `inner_cinder_lattice` | The Crownless Observatory | inner | Observatory Trial | `inner_cinderLatticeTrial` | None | None |
| `choir-execution-court` | Hollow Court | inner | Elite Sentence | `inner_choirShrine` | red, red, yellow | None |
| `inner_veil_rift` | Melted Gate | inner | Three-Ash Entry | `inner_veilRiftEntry` | None | Requires Guardian Span Clearance |
| `inner_tomb_gate` | Rifted Approach | inner | Marshal's Road | `inner_tombGateTrial` | None | None |
| `inner_blackstar_shortcut` | Dead Star Reliquary | inner | Dead Star Claim | `inner_blackstarShortcut` | None | None |
| `the-bone-meridian` | The Bone Meridian | inner | Meridian Toll | `inner_tombGateTrial` | red, yellow | None |
| `center_cinder_gate` | The Ashen Reach Core | center | Final Scenario | `center_resolveScenarioConfrontation` | None | Enter the Core from the Last Signal Well or Dead Star Reliquary; Breach the Gate of Cinders first |

## Resolution and revisit rules

1. Complete authoritative movement and record arrival.
2. Open any mandatory recurring tile challenge before Threat resolution.
3. Resolve printed Threat draws and persistent blockers.
4. Make named tile text or services available in the action phase.
5. Record source-event identities so reconnect and repeated submission cannot replay a reward.

Named tile text is generally revisitable when the sector is clear; recurring challenges remain recurring by design. The Core replaces named text with the scenario-confrontation intent. Scenario sheet art may replace only the center image, never its ID or connections.
