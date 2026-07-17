# Character Loadout Implementation Status

Generated from active `content/characters`, `content/gear`, and `content/cards/contracts` data.

## Baseline

- Normal operative baseline: 15 total printed stat points.
- Accepted normal range: 14-16 when justified by role.
- QA/test characters are exempt when `qaOnly` is true.
- Default starting salvage remains 3 in multiplayer and 4 in single-player unless overridden.
- Starting gear and starting contracts now resolve through the existing starting-loadout system.

## Operatives

| Character | QA | Stat total | Starting gear | Starting salvage/trophies | Starting contract | Missing design decisions |
| --- | --- | ---: | --- | --- | --- | --- |
| Joss Var (black-ledger-agent) | no | 15 | Blackstar Ampoule (blackstar-ampoule) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Ledger Skim (cartel-ledger-skim) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Bjornis (char_bjornis) | no | 15 | Red March Warbell (red-march-warbell) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Ember Courier (compact-ember-courier) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Deepdale (char_deepdale) | no | 15 | Grave Lens (grave-lens) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Bone Road Guide (clan-bone-road-guide) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Ker Von Ker (char_ker_von_ker) | no | 15 | Last-Breath Rivet (last-breath-rivet) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Span Vigil (warden-span-vigil) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Kira Dog (char_kira_dog) | no | 15 | Veil Hook (veil-hook) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Lantern Run (contract-lantern-run) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| MASTER ALPHA (char_master_alpha) | yes | 45 | Void-Cleaver Command Blade (qa_alpha_weapon_01), Ashen Pattern Plasma Rifle (qa_alpha_weapon_02), Titanplate Exo-Rig (qa_alpha_armor_01), Crown of the First Signal (qa_alpha_relic_01), Dead Star Core (qa_alpha_relic_02), Omni-Key of Broken Gates (qa_alpha_tool_01), Emergency Med-Stim x5 (qa_alpha_consumable_01), Void Charge x5 (qa_alpha_consumable_02) | Salvage: 99; Trophies: 99 | Seat-index contract fallback | Exempt QA loadout; keep out of normal balance validation. |
| Popelord (char_popelord) | no | 15 | Black Route Fuse (black-route-fuse) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Salvage Tithe (clan-salvage-tithe) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Rumi (char_rumi) | no | 15 | Mirror Reroll Token (mirror-reroll-token) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Blackstar Sample (umbral-blackstar-sample) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Mira (cinder-monk) | no | 15 | Heat-Sink Prayer (heat-sink-prayer) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Shrine Confession (umbral-shrine-confession) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Orenna Tash (fleet-elder) | no | 15 | Marshal Seal (marshal-seal) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Beacon Quieting (contract-beacon) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Dessa Korr (grave-engineer) | no | 15 | Coffin Rig (coffin-rig) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Cleanse Ledger (compact-cleanse-ledger) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Reskin Hale (oathbroken-prince) | no | 15 | Oath-Chain Ledger (oath-chain-ledger) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Gate Tithe (dominion-gate-tithe) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Senna Pell (rift-cartographer) | no | 15 | Ashen Route Compass (ashen-route-compass) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Quiet Route (cartel-quiet-route) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Brask Ode (salvage-warden) | no | 15 | Tuning Spines (tuning-spines) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Salt Burial (clan-salt-burial) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Dr. Yuna Castell (siege-medic) | no | 15 | Saintwire Splint (saintwire-splint) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Surgery Bond (compact-surgery-bond) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Lane (signal-witch) | no | 15 | Choir Static Censer (choir-static-censer) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Spindle Harmonics (choir-spindle-harmonics) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |
| Tarek Voss (void-marshal) | no | 15 | Cinder Suture Kit (cinder-suture-kit) | Salvage: default 3 MP / 4 solo; Trophies: 0 | Warbell Recovery (dominion-warbell-recovery) | Signature item/contract use existing mechanics; final bespoke item text can be refined later. |

## Follow-Up TODOs

- Review whether each assigned existing gear card should become a bespoke signature item later.
- Review whether any duplicate contract lanes should become character-specific contracts.
- Keep `char_master_alpha` QA-only and excluded from normal stat and loadout balance checks.
