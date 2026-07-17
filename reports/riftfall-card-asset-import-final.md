# Riftfall Card Asset Import Final Report

Date: 2026-07-03

## Result

No Riftfall card assets were imported.

This was intentional. The Phase 5D audit found that `public/assets/riftfall/cards/` contains useful legacy/source/reference material, but no file safely matches a current active Ashenreach content ID. The active card art audit is already complete after Phase 5C, so copying or overwriting active assets would add drift rather than remove it.

## Files Imported

None.

## Source And Target Paths

No source-to-target copies were made.

`public/assets/riftfall/cards/` remains preserved as a legacy/reference source folder.

## Files Intentionally Left In Legacy

All 55 files under `public/assets/riftfall/cards/` were left in place:

- 4 artifact sample/reference images
- 13 contract / mission sample/reference images
- 8 gear sample/reference images
- 4 heat sample/reference images
- 4 route-note sample/reference images
- 18 old threat sample/reference images across `threat-red`, `threat-blue`, and `threat-yellow`
- 4 wargear sample/reference images

## Files Skipped And Why

All legacy files were skipped because:

- none matched active content IDs by exact or normalized filename;
- active card art currently resolves under `public/assets/cards/`;
- `audit:assets` reports no missing active card art;
- several legacy categories are old prompt/sample categories rather than current runtime card image types;
- importing would require speculative renaming or overwriting.

## Resolver / Manifest Updates

No resolver or manifest updates were required.

The current active card art resolver remains:

- `src/game/assets/design/cardImageCatalog.ts`
- `src/game/assets/design/generatedCardImagePrompts.ts`
- `generated/card-image-prompts.json`

## Remaining Missing Active Card Art

None reported by `npm.cmd run audit:assets`.

## Asset Audit Result

`npm.cmd run audit:assets` reports:

- total: 402
- present: 402
- missing: 0
- invalid: 0
- placeholders: 0
- releaseBlocking: 0

## Follow-Up Recommendation

Keep `public/assets/riftfall/cards/` until a later archive-only pass can prove that the old prompt/reference catalogs no longer need it.

If gear card art becomes a real active runtime category later, add the resolver and tests first, then import only verified gear IDs into `public/assets/cards/gear/`.
