# Phase 1V — Void-Salt Sickness Wound conversion

Status: implemented. The earlier retirement proposal and blocking report are superseded by the explicit Phase 1V decision to keep `void-salt-sickness` active and replace its two legacy Heat no-ops with existing Wound effects.

## Authoritative reconstruction

| Field | Preserved value |
|---|---|
| Stable ID | `void-salt-sickness` |
| Name | Void-Salt Sickness |
| Definition | `content/cards/threats/void-salt-sickness.json` |
| Type | outer/common blue Hazard Threat |
| Severity | 1 |
| Check | Forge 5 |
| Active availability | Borderlight; `mirecoil-beacon` and `outer_salt_flats` in the canonical graph |
| Art | `/assets/cards/threats/blue/void-salt-sickness.png` |

The original success branch was `lose_heat 1`; the original failure branch was `gain_heat 1`. There were no sibling effects to reorder. Normal hazard cleanup and check continuation remain owned by the existing encounter engine.

## Implemented mapping

- Success: `heal_wound 1`. Actual Wounds change by at most one and floor at zero. A zero-Wound success completes without compensation, a prompt, or a false healing summary.
- Failure: `take_wound 1`. Existing server-authoritative prevention, Wound threshold, Scar, recall, replacement, and cleanup paths apply. No card-specific recall logic was introduced.
- Copy: “The fever breaks. Heal 1 Wound; if it takes hold, suffer 1 Wound.” No Heat or Risk wording remains on the card.

The reducer's applied-effect summary now reports healing from the actual pre-effect Wound total. This prevents any bounded `heal_wound` effect—not only this card—from claiming healing when the character was already at zero; effect mutation semantics are unchanged.

## Availability and compatibility

The card remains in `loadThreatCards()`, the Borderlight sector deck, both canonical graph draw lists, random threat construction, and all supported modes. Its stable ID, severity, lane, Forge check, art, and frequency are unchanged. No retirement manifest, compatibility-only loader, replacement card, schema variant, snapshot migration, or network field was added.

`void-salt-sickness` is removed from the legacy Heat-effect approval set because neither branch contains Heat. All generic legacy discriminators and remaining approvals stay in place. Snapshot v0/v1/v2 support, archival character-Heat metadata, Mirror's reflection-pressure migration, and Heat-free current projections are untouched.

## Balance assessment

- Early game: failure now creates visible injury pressure, but success can remove one existing Wound; an unwounded success gives no substitute reward.
- Late game: healing is more valuable near the threshold, while failure can invoke the normal recall path. Severity remains 1 by explicit decision.
- Cooperative: the card can consume team recovery bandwidth or trigger a recall, but adds no shared pressure or extra prompt.
- Rivalry: each operative resolves the same personal Wound risk without revealing private agenda state.
- Prevention and synergies: Ker/Fandiablos prevention and existing Wound timing remain authoritative; wounded-condition gear can react only through its existing rules.

Playtest watch: compare severity-1 frequency against other Borderlight injury hazards, especially early healing access and intentional-wounding incentives. No balance value was changed beyond the approved conversion.

## Tests and safeguards

Focused coverage proves stable identity and availability, exact branch schemas, success at 2/1/0 Wounds, actual-result copy, failure below and at recall threshold, Ker prevention, unresolved-state reconstruction, single application, single cleanup, art retention, approval removal, and phone/TV result isolation. Existing Phase 1U, snapshot, Mirror, validation, engine, client, build, and asset suites provide non-target regression coverage.

## Four-seat critique

- New Player: both outcomes use the visible Wound track; no hidden Heat/Risk or new decision appears.
- Optimizer: healing and injury are capped at one, zero-Wound success has no substitute payout, prevention runs once, and reconnect cannot replay resolution.
- Family Player: the card remains a fast pass/fail hazard using familiar healing and recall rules.
- Rules Lawyer: healing floors at zero; failure uses established prevention and threshold timing; the replacement occupies the exact former branch positions; summaries reflect actual mutation.

## Counts

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 28 | 27 |
| Heat-only branches | 31 | 29 |
| Heat-effect occurrences | 40 | 38 |
| `gain_heat` | 26 | 25 |
| `gain_heat_all` | 3 | 3 |
| `lose_heat` | 11 | 10 |
| Compatibility approval IDs | 53 | 52 |
| Wound-effect occurrences (`take_wound` + `heal_wound`) | 81 | 83 |
| Canonical graph memberships | 2 | 2 |
| Changed content IDs | 0 | 1 (`void-salt-sickness`) |

## Files changed

- `content/cards/threats/void-salt-sickness.json` — exact Wound effects, accurate text/tag.
- `src/game/engine/reducer.ts` — actual bounded-healing presentation.
- `scripts/legacy-heat-validation.ts` — remove the sole obsolete approval.
- Four compatibility-count tests — update exact 53-to-52 and 39-to-38 assertions.
- `src/game/engine/__tests__/heatPhase1vVoidSaltWounds.test.ts` — focused mechanics, presentation, availability, prevention, recall, and reconnect coverage.
- This report and the two decision registers — record the superseding implementation decision.

## Remaining work

After this conversion, 27 Heat-only IDs / 29 branches / 38 effects remain for mechanically grouped passes. Outstanding categories remain higher-severity Salvage, Equipment outcomes (content conversions, not the completed item system), tests/challenges, remaining Wound recommendations, Scar, Loss Pressure, Global Escalation, bespoke rewrites, legacy parser support-window decisions, archival metadata closure, and stable discriminator cleanup.
