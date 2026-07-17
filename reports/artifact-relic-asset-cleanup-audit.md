# Artifact / Relic Asset Cleanup Audit

Baseline: `46d2d7c validate-equipment-shop-loadout-balance`

This pass reviewed only the legacy artifact/relic sources requested for the Artifact / Relic cleanup:

- `public/assets/riftfall/cards/artifacts/`
- `public/assets/riftfall/cards/gear/relic_choir_route_orb.png`
- `public/assets/riftfall/cards/gear/relic_oathchain_lens.png`

It did not inspect or import Heat, route notes, contracts, threat lanes, ordinary gear, or wargear. Heat remains deprecated and no active Heat card category or `/assets/cards/heat/` path was created.

## Audit Table

| legacy path | filename | visual category | exact active duplicate? | normalized active match? | recommended action | proposed active ID | target path | content type | effect idea | lore note | risk |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `public/assets/riftfall/cards/artifacts/artifact_choir_lantern.png` | `artifact_choir_lantern.png` | ward lantern relic | no | no | import as artifact art | `artifact-choir-lantern` | `public/assets/cards/artifacts/artifact-choir-lantern.png` | Artifact card + artifact-tier gear | gain `choir-lantern`; charged route note support | Lantern burns without flame when the choir is near. | Low; uses existing `gain_gear` and charged relic behavior. |
| `public/assets/riftfall/cards/artifacts/artifact_route_star.png` | `artifact_route_star.png` | navigation relic | no | no | import as artifact art | `artifact-route-star` | `public/assets/cards/artifacts/artifact-route-star.png` | Artifact card + artifact-tier gear | gain `route-star`; charged movement route note support | Dead navigation glass points toward safer roads. | Low; route support is a note, not new movement rules. |
| `public/assets/riftfall/cards/artifacts/artifact_void_key.png` | `artifact_void_key.png` | gate relic | no | no | import as artifact art | `artifact-void-key` | `public/assets/cards/artifacts/artifact-void-key.png` | Artifact card + artifact-tier gear | gain `void-key`; charged gate/final-approach route note support | A black key that turns in locks not yet built. | Low; acquisition is explicit and effect remains a note. |
| `public/assets/riftfall/cards/artifacts/card_back_artifact.png` | `card_back_artifact.png` | deck back/template | no | no | keep legacy reference | n/a | n/a | reference only | none | Artifact deck back remains prompt/reference material. | Low; not runtime content. |
| `public/assets/riftfall/cards/gear/relic_choir_route_orb.png` | `relic_choir_route_orb.png` | route/signal relic | no | no | defer | `artifact-choir-route-orb` | deferred | deferred | possible charged route/signal support later | Choir-glass orb hums toward safer roads. | Medium; artifact content cap is now 30, so importing it would exceed validation budget. |
| `public/assets/riftfall/cards/gear/relic_oathchain_lens.png` | `relic_oathchain_lens.png` | oath/contract relic | no | no | import as artifact art | `artifact-oathchain-lens` | `public/assets/cards/artifacts/artifact-oathchain-lens.png` | Artifact card + artifact-tier gear | gain `oathchain-lens`; charged contract/bargain note support | Ledger-chain lens shows the cost of promises. | Low; uses existing charge and note mechanics. |

## Imported Active Artifacts

This pass imports four useful relic images. `relic_choir_route_orb.png` stays deferred because content validation caps artifact cards at 30 and importing all five candidates would raise the artifact card count to 31.

| source path | active target path | artifact card ID | gear ID | inventory group | acquisition | shop behavior |
|---|---|---|---|---|---|---|
| `public/assets/riftfall/cards/artifacts/artifact_choir_lantern.png` | `public/assets/cards/artifacts/artifact-choir-lantern.png` | `artifact-choir-lantern` | `choir-lantern` | Artifacts / Relics | Artifact card resolves with `gain_gear` | Relic Dealer only; excluded from normal stock unless artifact stock is explicitly included. |
| `public/assets/riftfall/cards/artifacts/artifact_route_star.png` | `public/assets/cards/artifacts/artifact-route-star.png` | `artifact-route-star` | `route-star` | Artifacts / Relics | Artifact card resolves with `gain_gear` | Relic Dealer only; excluded from normal stock unless artifact stock is explicitly included. |
| `public/assets/riftfall/cards/artifacts/artifact_void_key.png` | `public/assets/cards/artifacts/artifact-void-key.png` | `artifact-void-key` | `void-key` | Artifacts / Relics | Artifact card resolves with `gain_gear` | Relic Dealer only; excluded from normal stock unless artifact stock is explicitly included. |
| `public/assets/riftfall/cards/gear/relic_oathchain_lens.png` | `public/assets/cards/artifacts/artifact-oathchain-lens.png` | `artifact-oathchain-lens` | `oathchain-lens` | Artifacts / Relics | Artifact card resolves with `gain_gear` | Relic Dealer only; excluded from normal stock unless artifact stock is explicitly included. |

## Content Model

The implementation follows the existing Ashen Reach artifact pattern:

1. A card under `content/cards/artifacts/` represents drawing/recovering the artifact.
2. The artifact card uses `resolveEffect: { "type": "gain_gear", "gearId": "..." }`.
3. The granted gear lives under `content/gear/` with `tier: "artifact"` and `category: "chargedRelic"`.
4. Phone inventory groups the gear under `Artifacts / Relics`.
5. Artifact-tier gear resolves art through `/assets/cards/artifacts/artifact-[gearId].png`.

This preserves the separation:

- Equipment remains normal weapons, armor, tools, and consumables.
- Artifacts / Relics remain rarer, charged, and separate.
- Heat remains deprecated.

## Verification Notes

After import:

- `validate:content`: passed with 30 artifacts, keeping the configured artifact budget intact.
- `audit:assets`: 410/410 present.
- Card image summary:
  - artifact: 33/33
  - equipment: 9/9
- Legacy source files were retained.
- `card_back_artifact.png` remains reference-only.
- `relic_choir_route_orb.png` remains deferred for a future artifact-cap or archive pass.

## Promoted Legacy Artifact Sources Archived

The promoted Artifact / Relic source images were exact hash matches with their active copies and have been archived under `_archive/legacy-promoted-card-assets/artifacts/`.

| legacy source path | active replacement path | archive path | verification |
|---|---|---|---|
| `public/assets/riftfall/cards/artifacts/artifact_choir_lantern.png` | `public/assets/cards/artifacts/artifact-choir-lantern.png` | `_archive/legacy-promoted-card-assets/artifacts/artifact_choir_lantern.png` | SHA-256 match, dimensions match |
| `public/assets/riftfall/cards/artifacts/artifact_route_star.png` | `public/assets/cards/artifacts/artifact-route-star.png` | `_archive/legacy-promoted-card-assets/artifacts/artifact_route_star.png` | SHA-256 match, dimensions match |
| `public/assets/riftfall/cards/artifacts/artifact_void_key.png` | `public/assets/cards/artifacts/artifact-void-key.png` | `_archive/legacy-promoted-card-assets/artifacts/artifact_void_key.png` | SHA-256 match, dimensions match |
| `public/assets/riftfall/cards/gear/relic_oathchain_lens.png` | `public/assets/cards/artifacts/artifact-oathchain-lens.png` | `_archive/legacy-promoted-card-assets/artifacts/relic_oathchain_lens.png` | SHA-256 match, dimensions match |

`card_back_artifact.png` was not archived because it was not promoted as active content. `relic_choir_route_orb.png` remains in legacy gear reference material and is still deferred while the artifact card cap is full. Heat files remain legacy/reference-only and were not moved.
