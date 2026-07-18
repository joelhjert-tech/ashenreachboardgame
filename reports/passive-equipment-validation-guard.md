# Passive Equipment validation guard

## Final boundary

The catalog-wide guard applies only to normal common-shop Equipment with `category: "passive"` and `normalShopCommon: true`. Artifact records, advanced/legacy records outside the common-shop Phase 1 boundary, and non-passive Equipment retain their existing schema and validation paths.

Normalized passive Equipment must use exactly one supported model:

- `permanent`: `requiresEquipped: true`, a positive typed `statBonus`, and no condition or activation-only fields.
- `conditional`: `requiresEquipped: true`, a positive typed `statBonus`, and the currently supported `conditionType: "battle"`.

The guard rejects undeclared common-shop passives unless their exact ID is deferred, Artifact-only `charged`, `exhaust`, or `consumable` models on passive normal Equipment, missing equipped state, missing/malformed modifiers, missing or unsupported conditions, permanent passives with conditions, and passive definitions mixed with activation-only fields.

The gear schema already rejects several malformed object shapes during parsing. This guard remains useful because it verifies the complete loaded catalog, validates the explicit compatibility boundary, fails obsolete/missing/duplicate exemptions, and provides item-specific messages.

## Explicit deferrals

All 16 Phase 1 deferrals remain present, canonical, playable common-shop Equipment. None has acquired a typed effect model in a later phase, so no exemption was removed.

| ID | Display name | Reason | Intended future phase | Compatibility |
|---|---|---|---|---|
| `chainhook-blade` | Chainhook Blade | “Fighting for position” has no approved context. | Conditional context design | Canonical playable |
| `route-compass` | Route Compass | Movement-test modifiers need a typed context. | Movement condition normalization | Canonical playable |
| `field-lens` | Field Lens | “Inspecting hazards” is not authoritative. | Tile-challenge condition normalization | Canonical playable |
| `lockjaw-kit` | Lockjaw Kit | Locks and bargains lack a shared context. | Interaction condition normalization | Canonical playable |
| `bridge-spike` | Bridge Spike | “Route work” is undefined. | Movement condition normalization | Canonical playable |
| `static-probe` | Static Probe | Anomaly-only Equipment context is unsupported. | Tile-challenge condition normalization | Canonical playable |
| `surveyor-chalk` | Surveyor Chalk | Coordinating movement may imply unsupported assistance. | Movement condition design | Canonical playable |
| `cinder-suture-kit` | Cinder Suture Kit | Recovery work lacks a typed context. | Recovery condition normalization | Canonical playable |
| `saintwire-splint` | Saintwire Splint | “Holding together” is poetic, not actionable. | Recovery condition design | Canonical playable |
| `salt-gauze-wrap` | Salt Gauze Wrap | Recovery lacks a typed context. | Recovery condition normalization | Canonical playable |
| `ember-poultice` | Ember Poultice | Reusable passive identity conflicts with consumable presentation. | Recovery item redesign | Canonical playable |
| `salvage-ledger` | Salvage Ledger | Shop dealings do not use the generic modifier path. | Shop condition normalization | Canonical playable |
| `mirror-token` | Mirror Token | Contested tests lack a typed context. | Test condition normalization | Canonical playable |
| `oath-chain` | Oath Chain | Holding a vow lacks a contract-state mapping. | Contract condition design | Canonical playable |
| `red-march-bell` | Red March Bell | “Danger closes” is undefined. | Threat condition design | Canonical playable |
| `signal-lantern` | Signal Lantern | “Unstable sector” is undefined and must not revive Heat-era state. | Sector condition design | Canonical playable |

The earlier WIP summary described this as a 15-item list; direct catalog reconciliation confirms 16 unique IDs, matching the Phase 1 implementation report.

## Tests

Focused tests cover:

- valid permanent and battle-conditional passives;
- exact-ID legacy deferral and non-passive exclusion;
- missing `requiresEquipped`, modifier, or condition;
- unsupported conditions;
- Artifact-only models and contradictory activation fields;
- wildcard/unknown IDs not acting as exemptions;
- missing, duplicate, and obsolete deferrals;
- uniqueness and removal-ready metadata for all 16 canonical deferrals.

The full content validator proves current Phase 1 passives, Phase 2 consumables, Phase 3 exhaust items, Phase 4 charged Artifacts, and tier separation remain compatible.

## Future work

Remove deferrals individually only after each item receives approved canonical wording, a supported typed condition, `effectModel`, and `requiresEquipped: true`. Catalog validation will then fail until that now-obsolete deferral is deleted, preventing exemptions from becoming permanent accidental bypasses.

No runtime item mechanics, content definitions, or UI behavior changed in this pass.
