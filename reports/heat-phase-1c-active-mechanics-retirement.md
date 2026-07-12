# Heat Phase 1C active-mechanics retirement

## Outcome

Phase 1C removes every approved ordinary-play read, write, cost, delta, and presentation of stored character Heat while preserving its serialized compatibility field. It does not convert Heat into any other resource.

## Exact behavior changes

### Black Route Fuse

Before this phase the catalog advertised a one-Heat cost that the authoritative use path did not enforce. Accepted use already discarded the item, registered +3 Grit for the matching battle roll, and advanced Global Escalation by 1.

The misleading `heatCost` is removed. Accepted use still performs those three effects exactly once. Rejected timing, stale use, and duplicate use perform none of them. Stored legacy Heat is neither checked nor mutated.

### Deep Relic Search

The stable service ID remains `risk-action`; its player-facing name is **Deep Relic Search**. The server validates the Relic Dealer location, normal shop blockers, seat ownership, and at least 1 Salvage. An accepted transaction deducts exactly 1 Salvage and records the authoritative reveal together, revealing up to four available Relic Dealer options. With the production catalog, four options are available; focused fixtures explicitly provide four. Failed requests deduct and reveal nothing. Repeat legal requests retain existing repeatability and pay again.

### Withdrawn boon

The stable `buy-boon` identifier remains in the withdrawn-service compatibility set but is no longer projected as an available service. Stale direct requests reject as unavailable, spend nothing, add no note-only benefit, and emit no false `heatDelta`.

### Nemesis reward

Defeating another seat's bound Nemesis still grants exactly two trophies. It no longer reduces stored Heat and emits no Heat or Risk result. Binding, ownership, rivalry visibility, and anti-spoofing behavior are unchanged.

### Presentation

Normal phone, TV, inventory, shop, prompt, result-chip, public-result, and player-rule surfaces no longer present Heat or Risk as a resource. Legacy Heat result deltas remain type-compatible but are omitted from public and owner-visible result collections. Scenario and sector descriptions that previously advertised unenforced Risk payments now describe only their enforced consequences.

## Compatibility boundary

- `character.heat` remains in schemas, defaults, serialization, old saves, and reconnect state.
- Existing nonzero values survive unchanged and provide no ordinary-play benefit or penalty.
- Reducer assignments that reconstruct a character during shop transactions preserve the value; they do not change it.
- `heatThreshold` remains serialized and Mirror continues to read it through the reflection-pressure compatibility accessor.
- `gain_heat`, `gain_heat_all`, and `lose_heat` remain deliberate no-ops.
- Stable item, service, action, result-shape, and effect identifiers remain readable.

Production scan after implementation finds zero active `character.heat` affordability reads, zero active mutations, and two compatibility-preservation assignments in shop reducer reconstruction. It finds no nonzero `heatDelta` emission in production content/runtime. The generic Heat discriminators remain authored in 93 occurrences across 86 content files; the previously identified 50 Heat-only outcomes are unchanged within that larger compatibility inventory.

## Authoring guard

The explicit compatibility allowlist changes from 120 to 119 IDs. Only `black-route-fuse` is removed because its `heatCost` was deleted. The guard continues to reject new Heat effects, Heat costs, raw player-facing Heat copy, and new Risk-resource copy. The legacy outcome allowlist is otherwise unchanged.

## Tests

Focused coverage protects:

- cost-free Fuse use at zero stored Heat, exact +3 Grit, discard, escalation, rejection safety, and stable identity;
- Deep Relic Search's stable ID, one-Salvage authoritative payment, four-option reveal, insufficient-funds rejection, and Heat independence;
- withdrawal and rejection of `buy-boon` without partial mutation;
- cross-seat Nemesis trophies without stored-Heat mutation or delta;
- result-projection containment and matching phone/TV shop copy;
- legacy no-op effects, stable identifiers, Mirror threshold semantics, and the 119-ID authoring boundary.

## Save and reconnect safety

No schema or save-format field changes in this phase. Accepted stock reveals, pending Fuse modifiers, stored Heat, and historical optional result shapes remain part of authoritative session state and therefore reconstruct through the existing schema/reconnect path. No presentation animation or client request mutates gameplay state.

## Four-seat critique

- **New Player:** Fuse states its real discard/escalation consequence, Deep Relic Search exposes its Salvage price, and no hidden meter is implied.
- **Optimizer:** stored legacy Heat cannot unlock either migrated action; Fuse acceptance and shop reveal/payment are reducer transactions; every accepted repeated search pays again.
- **Family Player:** shop affordability is expressed in the established currency and no additional bookkeeping is introduced.
- **Rules Lawyer:** failed transactions make no partial mutation, result deltas match mutations, stable IDs remain valid, old values reconnect unchanged, and Mirror is outside this change.

## Files changed

- Fuse catalog metadata.
- Shop and Nemesis server resolution and public shop projection.
- Shop reducer replay protection.
- Phone, TV, inventory, prompt, and result-delta presentation.
- Scenario and board-space reachable display copy.
- Ultimate Rulebook and Quick Reference.
- Legacy Heat authoring guard and focused engine, server, client, projection, and validation tests.
- Decision register and this implementation report.

## Explicit non-conversions and remaining phases

This phase performs no Heat-to-Wound, Heat-to-Scar, Heat-to-pressure, Heat-to-escalation, or Heat-to-Salvage conversion. It does not migrate the legacy Heat-only outcomes, delete schema fields, or rename Mirror's key.

Remaining work is limited to the legacy Heat-only outcome designs and other authored compatibility batches, versioned save migration, making `character.heat` optional, Mirror's semantic key migration, and eventual discriminator/schema cleanup.
