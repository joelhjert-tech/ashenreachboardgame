# Phase 1A — Heat compatibility lock and player-facing containment

## Result

Phase 1A contains misleading terminology without changing serialized fields, IDs, values, eligibility, scenario rules, or effect behavior. No Heat value became a Scar, Wound, Loss Pressure, Global Escalation, Salvage, charge, or cooldown.

## Files and boundaries

- `src/game/rules/legacyHeatCompatibility.ts`: central no-op recognition, safe summary, temporary Risk formatting, and Mirror threshold accessor.
- `src/game/engine/reducer.ts`: routes generic Heat no-ops through the compatibility boundary.
- `src/game/cards/threatEffects.ts`: removes migration jargon and fake penalty language from public summaries.
- Two reachable Artifact display records now use Scar-Sink Prayer and non-mechanical battlefield wording while retaining their stable IDs and effects.
- `src/server/roomServer.ts`: preserves direct mutations/costs and uses the semantic Mirror accessor; removes legacy jargon from notes.
- Phone action/inventory presentation and `src/client/tv/HostShopOverlay.tsx`: consistent `Risk cost: N` presentation, including Black Route Fuse.
- `src/client/shared/ResultDeltaChips.tsx`: real compatibility deltas are no longer silently filtered; the formatter remains payload-driven.
- `scripts/legacy-heat-validation.ts`, `scripts/validate-content.ts`: explicit 120-ID compatibility allowlist and new-authoring guard.
- Focused engine, client, and validator tests protect persistence, no-ops, IDs, costs, projections, and language.
- Ultimate Rulebook, Quick Reference, and cross-reference now use the runtime attribute set and minimal Risk explanation.

## Leakage routes corrected

1. Generic no-op reducer summaries now say only “no additional status change.”
2. Threat compatibility summaries no longer teach legacy pressure or imply a penalty.
3. Phone Heat-shaped costs use `Risk cost: N`.
4. TV Heat-shaped costs use the identical format.
5. Compatibility notes emitted by item/follower resolution no longer expose migration terminology.
6. Canonical rules no longer present Heat as an active resource.
7. The stable `heat-sink-prayer` ID remains internal while its display name remains Scar-Sink Prayer.

## Compatibility preserved

Unchanged: `character.heat`, `heatThreshold`, `HEAT_THRESHOLD_REACHED`, `heatDelta`, `heatCost`, `cost.heat`, all effect discriminators, stable card/item/service IDs, payload shapes, reconnect serialization, Mirror threshold value, Black Route Fuse values, and shop affordability/payment behavior.

The compatibility module explicitly documents that generic effects are no-ops while direct authoritative mutations and costs remain real. Mirror still reads the serialized `heatThreshold`, but through an accessor named for reflection pressure.

## Validation guard

The validator walks current JSON content and rejects Heat-shaped constructs on any ID outside the explicit compatibility manifest. It detects `gain_heat`, `gain_heat_all`, `lose_heat`, `heatCost`, `heat` properties, and player-facing mechanical Heat text. Errors identify the file, content ID, construct, and approval requirement. Existing entries can be removed from the manifest one by one during later migrations.

## Attribute correction

The authoritative attributes are Command, Grit, Signal, Guile, and Forge. The initial prompt’s Cunning, Strength, Understanding, and Faith assumption was disproved by schemas, content, UI, and tests. The canonical rule documents already primarily used the correct set; Phase 1A records the correction explicitly and scans for regression.

## Tests

- Generic gain/loss/all no-op isolation from Heat, Wounds, Scars, Loss Pressure, and Global Escalation.
- Serialized Heat and threshold round-trip.
- Stable `heat-sink-prayer` and Black Route Fuse metadata.
- Temporary Risk cost/delta formatting.
- Matching phone/TV shop terminology and absence of raw Heat labels.
- Guard acceptance of approved legacy records and rejection of new effects, costs, and text.
- Existing Mirror, reconnect, shop, item, mission, reaction, and projection suites remain authoritative regressions.

## Four-seat critique

**New Player:** Normal resolution no longer mentions Heat or migration history. Wounds and Scars remain distinct. Rare costs say `Risk cost: N`, and the rulebook explains that Risk is automatic and exceptional.

**Optimizer:** No-op effects still create no spendable value. Reconnect round-trips the stored compatibility value without duplicating it. Cost validation and deductions are unchanged.

**Family Player:** Fake penalty language is removed. Risk appears only at the rare action requiring it and does not add another character-sheet meter.

**Rules Lawyer:** Displayed no-op outcomes claim no mutation. Mirror retains its exact threshold semantics. Compatibility keys are documented as internal, not canonical rules.

## Remaining decisions

- Final Black Route Fuse cost replacement.
- Final Heat-cost shop-service replacement.
- Whether direct stored Heat reduction remains useful.
- Versioned legacy-save migration.
- Eventual removal of `character.heat` and generic effect discriminators.
- Eventual semantic replacement for Mirror’s serialized threshold field.
