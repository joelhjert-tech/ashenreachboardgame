# Scar / Affliction Visibility Audit

Date: 2026-07-08

## Scope

This audit covers scar and affliction visibility on the phone controller, source display in roll/stat breakdowns, and public-safe TV behavior. It does not change scar, affliction, battle, movement, shop, mission, scenario, rivalry, or multiplayer mechanics.

## Existing Content And State

- Scar card content exists under `content/cards/scars/`.
- Scar art exists under `public/assets/cards/scars/`, with a fallback at `public/assets/cards/fallbacks/scar.svg`.
- Affliction card content exists under `content/cards/afflictions/`.
- Player state already tracks afflictions as `faceupAfflictions`, `facedownAfflictions`, `afflictionUsageState`, and `afflictionDrawHistory`.
- Phone projection already includes `scarCards` and `afflictions` for the owning player.

## Existing Mechanics

- `src/game/rules/afflictions.ts` already exposes affliction summaries, restrictions, modifier sources, draw resolution, and wound prevention.
- `src/server/roomServer.ts` already includes affliction modifier sources in stat roll math through `getAfflictionModifierSources`.
- Server gear validation already rejects weapon and armor use when faceup afflictions block those equipment types.
- Existing active resolution rendering can display modifier source labels when the server projection includes them.

## Visibility Gaps Found

1. The main phone Player Card tab did not show inspectable scar or affliction status cards.
2. Scar cards were visible in one phone sheet path, but not consistently as status cards with art and effect text.
3. Inventory status grouping showed scars but not afflictions.
4. Compact stat rows did not tell the player when a faceup affliction affected the stat test.
5. Expanded stat breakdowns did not list scar/affliction sources separately from permanent upgrades or gear/follower modifiers.
6. Affliction summaries did not project effect payload metadata needed for readable chips such as "Blocks armor" or "Grit -2 tests, minimum 1".

## Changes Made

- Added phone presentation helpers for affliction status labels, effect chips, and stat test source summaries.
- Projected affliction `effectKind` and a public-safe summary of `effectPayload` to the phone owner.
- Added Scars / Afflictions status cards to the phone Player Card tab.
- Added scar art and effect text to phone scar display.
- Added Afflictions as a separate persistent status group in Inventory, distinct from normal usable items.
- Added scar/affliction rows to expanded stat breakdowns without merging those modifiers into printed/base stats.
- Added compact stat text for current affliction test penalties, such as `Status -2`.
- Added phone tests for scar visibility, affliction inventory grouping, stat source display, and active roll formula source display.

## Privacy And TV Behavior

This pass does not add detailed scar or affliction text to TV. TV remains limited to compact public status already available from projection. Owner phone receives the inspectable scar/affliction detail.

## Mechanics Confirmation

- No battle math was changed.
- No movement rules were changed.
- No shop rules were changed.
- No mission, scenario, rivalry, or multiplayer rules were changed.
- Scar and affliction effects remain server-authoritative; the phone displays projected state and source rows only.
