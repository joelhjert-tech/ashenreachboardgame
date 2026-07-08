# Remove Heat / Consolidate Scars Audit

Date: 2026-07-08

## Summary

Heat was audited as a deprecated player harm/status track. Scars are now the only player-facing persistent harm/corruption/status system.

The cleanup removes Heat from phone and TV status surfaces, result chips, visible card/service copy, scenario pressure copy, and public/owner projections. Legacy `heat` and `heatCost` fields remain only where they are still needed for schema compatibility, old fixtures/saves, or existing cost metadata. Those retained fields are not rendered as a player harm track.

## Classification

### Deprecated player status track

Removed or hidden from:

- Phone header and compact immersive status.
- Phone Player Card vitals and compact stat/status cards.
- Phone Inventory/status summaries.
- Phone Shop wallet/status rows.
- Phone Battle and result delta surfaces.
- TV operative rail/player card status.
- TV shop overlay result chips and wallet/status copy.
- TV sector occupant status.
- Public result delta chips.
- Scenario pressure/endgame copy that previously treated Heat as a player status.

### Item/action cost metadata

Retained temporarily:

- `heatCost` on gear schema/content.
- shop/service `cost.heat` metadata.
- shared client/server types that accept `heat` cost fields.

Presentation changed:

- Costs render as `Risk`, not Heat.
- Gear lock text no longer says a player needs Heat.
- Result deltas of type `heat` are filtered from visible UI.

Reason retained:

This preserves current content compatibility without exposing Heat as a second corruption track. A future content migration can rename these fields once all gear/service metadata is updated.

### Result deltas and effects

Changed:

- `gain_heat`, `gain_heat_all`, and `lose_heat` reducer behavior is no-op/legacy summary only.
- visible Heat delta chips are filtered.
- threat reveal helpers that previously emitted Heat now emit legacy pressure notes instead.
- movement failure no longer resolves a Heat effect.
- scenario ambient effects now use scenario progress, wounds, scars, or notes instead of mutating Heat.

### UI-only labels

Changed:

- Contract reward fallback for legacy `lose_heat` now displays `Scar relief`.
- Shop risk actions display `Risk`.
- Cinder Monk, gear, followers, escalation, anomaly, and threat visible text no longer describe Heat as a player track.

### Schema compatibility/defaults

Retained:

- `character.heat` remains in character/session/shared schemas for old save/session compatibility.
- projections still provide neutral `heat: 0` where older client contracts require the field shape.
- `HEAT_THRESHOLD_REACHED` remains in legacy action unions, but server threshold triggering is disabled.

### Test fixtures

Retained where structural:

- `heat: 0` fixture fields remain in client/server test data because the shared types still include the compatibility field.

Updated:

- tests no longer expect Heat to be visible as a player status, reward, scar penalty, shop risk, or scenario pressure label.

### Unknown/risky

Remaining internal identifiers:

- `heat-sink-prayer` remains as a stable content ID and asset reference. Its player-facing name is now `Scar-Sink Prayer`.
- generated design prompt/catalog metadata may still include old asset IDs or historical prompt language; these are not runtime UI.

## Behavior After Cleanup

- Wounds remain short-term damage.
- Scars are the canonical persistent harm/corruption/status system.
- Phone owner sees scar count and scar cards/effects.
- TV shows compact public-safe scar/status information.
- Formula/result displays can show scars as sources when they affect a roll.
- Gear, shop, and action costs no longer show Heat as a player track.
- Old state with `heat` fields can still load without surfacing Heat to players.

## Future Migration Notes

- Rename `heatCost` and `cost.heat` to a neutral risk/cost field after content and save migration are planned.
- Remove `character.heat`, result delta `heat`, and legacy action names once old sessions no longer need compatibility.
- Rename `heat-sink-prayer` asset/card IDs only with an asset-manifest migration.
