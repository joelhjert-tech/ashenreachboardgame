# Item Tier Separation Audit

## Fixed economy rule

Equipment keeps players alive. Artifacts change how players play.

## Findings

- The normal gear schema previously allowed artifact-tier entries without explicit starting or shop eligibility.
- Sixteen playable characters each started with a named item from the mixed legacy pool; several of those items also had artifact cards and artifact art.
- Standard shop reveals excluded artifact tier, but risky refreshes could include artifacts in every shop category.
- Runtime fallback art kept the asset audit green even when equipment and artifact identity did not agree.

## Implemented separation

- Added a canonical pool of 30 normal equipment items across weapons, armour, tools, medical/survival, field equipment, and utility/economy.
- Normal equipment is explicitly `startingEligible`, `normalShopCommon`, and equipment-art typed. Missing bespoke images are explicitly allowed to use the equipment fallback.
- Reassigned all 16 playable character starts to one or two items from the canonical normal pool.
- Converted ten legacy named reward payloads with matching artifact cards/art into explicit artifact-tier gear: Ashen Route Compass, Blackstar Ampoule, Coffin Rig, Grave Lens, Marshal Seal, Mirror Reroll Token, Oath-Chain Ledger, Red March Warbell, Tuning Spines, and Veil Hook.
- Artifact cards now carry explicit mission, elite-threat, rare-shop, and scenario reward eligibility, and explicitly reject starting/common-shop eligibility.
- Common shop stock now requires explicit `normalShopCommon` equipment. Artifact stock is limited to risky relic-dealer reveals.
- The asset audit now fails when starting/common equipment resolves through artifact art, when starting gear is artifact-tier, or when an equipment fallback lacks an explicit allowance.

## Compatibility boundary

- QA-only gear remains available to QA characters through the existing allowlist path.
- Legacy ordinary equipment remains loadable for save/test compatibility but is not part of the new common-shop or starting pool unless explicitly marked.
- Follower art behavior is unchanged.
