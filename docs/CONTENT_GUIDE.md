# Content Guide

Use content JSON for authored cards and characters, TypeScript data for board/scenario systems, and validation scripts for safety.

## Add Board Tiles Or Sectors

1. Add or update the board space in `src/game/data/boardSpaces.ts`.
2. Keep every space populated with `tags`, `threatIcons`, `ruleText`, `loreText`, and `textBox`.
3. If topology changes, update `src/data/riftfallBoardNodes.ts` and/or `src/game/data/canonicalSectorGraph.ts`.
4. Add tile art under `public/assets/map/tiles/`.
5. Wire the tile art in `src/client/tv/tileAssetManifest.ts`.
6. Run `npm run validate:content`, `npm run audit:assets`, and `npm run test:client`.

## Add Characters

1. Add JSON under `content/characters/`.
2. Add or confirm portrait art under `public/assets/riftfall/characters/`.
3. Add the portrait path in `src/client/shared/assetPaths.ts`.
4. Check starting gear IDs against `content/gear/`.
5. Run `npm run validate:content`.

QA-only characters may exist, but normal catalogs must continue hiding them unless `includeQa` is requested.

## Add Gear, Followers, Or Items

- Gear: `content/gear/`
- Followers: `content/followers/`
- Artifact cards: `content/cards/artifacts/`

Every referenced effect target must exist. Use `scripts/validate-content.ts` as the source of truth for cross-reference rules.

## Add Threats, Contracts, Anomalies, Scars, Or Escalations

- Threats: `content/cards/threats/`
- Contracts: `content/cards/contracts/`
- Anomalies: `content/cards/anomalies/`
- Scars: `content/cards/scars/`
- Escalations: `content/cards/escalations/`

After adding content:

1. Run `npm run validate:content`.
2. Add or regenerate card art prompts if the new card needs art.
3. Add the PNG under the matching `public/assets/cards/` folder.
4. Run `npm run audit:assets`.

## Add Scenarios

Scenario source is `src/game/data/scenarios.ts`. A scenario should include setup, pressure, confrontation steps, progress sources, rewards, shop interactions, tile hooks, and final gate rules. Scenario art lives under `public/assets/riftfall/scenarios/`.

## Restricted Terms

The content validator rejects restricted lore terms in visible game text. Keep all game text original to Ashen Reach. See `docs/BANNED_TERMS.md` and `scripts/validate-content.ts`.
