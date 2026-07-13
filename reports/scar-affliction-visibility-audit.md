# Scar / Affliction Visibility Audit

Date: 2026-07-09

## Scope

This audit reviewed the post-Heat baseline where Wounds are short-term damage and Scars are the canonical persistent harm/status track. Heat was not restored as visible player status.

## State Model

- Character scars are stored as scar ids on `character.scars`.
- Owner phone projection resolves those ids into `character.scarCards` with title, art, rules text, trigger, penalty, relief, and upside where available.
- Afflictions are stored as `faceupAfflictions` and `facedownAfflictions` instances on the player state.
- Owner phone projection resolves faceup Afflictions into `character.afflictions.faceup` and exposes `facedownCount`.

## Existing Visibility

- Phone Player Card already renders a Scars section with card title, art/fallback, effect text, trigger, penalty, and upside/relief copy.
- Phone Player Card already renders active Afflictions and facedown Affliction count.
- Phone Inventory already groups Scars and Afflictions as persistent status cards instead of normal usable gear.
- Stat breakdowns already include Affliction test and battle modifiers separately from permanent upgrades and gear/follower sources.
- Battle formula sources already include Affliction modifier labels from the authoritative rules resolver.

## Gaps Found

1. Affliction equipment restrictions returned booleans, but not the source card name.
2. Server rejection messages for weapon/armor restrictions named only "Affliction" and did not identify the blocking card.
3. Phone Battle "Useful Now" did not surface faceup Afflictions that were currently affecting the roll or blocking combat options.

## Changes Made

- `getAfflictionRestrictions` now includes source names for armor, weapon, evade-allowed, and evade-blocked restrictions.
- Gear use rejection messages now name the blocking Affliction, such as `Weapon disabled: blocked by Severed Grip.`
- Battle Useful Now now lists current Affliction effects:
  - matching stat test penalties
  - innate battle bonuses
  - weapon, armor, and evade blockers

## Privacy Notes

- Owner phone receives full scar and affliction details.
- TV remains compact and public-safe; this pass did not add broad scar text to host display.
- Hidden rivalry/nemesis data was not touched.

## Remaining Notes

- The current content distinguishes Scars and Afflictions, but the phone presents both as persistent harm/status. Future copy can further clarify whether Afflictions are a subcategory of Scars or a sibling persistent condition deck.
