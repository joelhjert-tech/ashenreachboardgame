# Heat runtime flow analysis

## Executive finding

Heat has three different runtime realities: a persisted compatibility value, generic authored effects that deliberately do nothing, and a small number of direct or metadata-driven mechanics that still matter. Treating them as one system would be unsafe.

## HF-001 — Generic authored Heat gain/loss

**Origin.** Anomalies, Threats, escalations, Artifacts, followers, board text, and scenario rules emit `gain_heat`, `gain_heat_all`, or `lose_heat` (`card.schema.ts:51-66`).

**Validation.** Zod accepts nonnegative amounts. Existing content validation therefore regards the records as structurally valid.

**Mutation.** `applyEffectToPlayer` in `reducer.ts:296-299` returns the player unchanged for gain/loss; `gain_heat_all` maps the same no-op over all players (`579-582`).

**Storage.** `character.heat` remains unchanged.

**Projection/presentation.** The effect summary says “legacy pressure ignored; Scars are the persistent harm track” (`reducer.ts:251-255`). This compatibility explanation can reach logs/result presentation even though no resource changes.

**Persistence.** No mutation occurs, but the existing Heat value in the session remains serialized.

**Tests.** Engine, scenario ambient, confrontation, and room-server tests assert Heat stays unchanged, commonly at zero.

**Risk.** Removing the variants breaks old content parsing; converting them all to Scar gain would turn frequent, previously inert effects into lasting punishment and drastically increase difficulty.

## HF-002 — Persisted per-operative Heat

**Origin.** Character records and fixtures initialize `heat`; direct server/test paths can seed nonzero values.

**Validation.** `character.schema.ts:65` requires a nonnegative integer.

**Mutation.** Generic effects do not change it. A direct server path at `roomServer.ts:6471` reduces it; character replacement/reset paths set it to zero (`reducer.ts:2080`; `roomServer.ts:947,2907,8104,9106`).

**Storage.** It is embedded in each character inside `GameState`.

**Projection.** Shared phone/TV payload types retain `heat` (`client/shared/types.ts:90,249,560`).

**Presentation.** Main player status presentation was removed in commit `b9120ea`; some costs and result metadata still use Heat-shaped fields under “Risk.”

**Persistence/reconnect.** Whole-session reconstruction preserves it. No formal saved-state migration/version adapter was found.

**Tests.** Numerous fixtures seed 0, 1, 2, or 3; several assertions prove values remain unchanged through unrelated actions.

**Risk.** Deleting the key makes existing session payloads, test builders, character parsing, and reconnect reconstruction fail.

## HF-003 — Session `heatThreshold`

**Origin.** `sessionState.ts:141` calls `getHeatThresholdForMode`.

**Validation/storage.** Required positive integer in `session.schema.ts:188` and serialized in `GameState`.

**Mutation/trigger.** The old `HEAT_THRESHOLD_REACHED` reducer action remains (`actions.ts:156`, `reducer.ts:1945`), but `roomServer.shouldTriggerHeatThreshold` returns false.

**Unexpected active consumer.** Mirror of False Heroes compares `mirrorPressure` against `state.heatThreshold` (`roomServer.ts:5988-5992`). The field therefore cannot be deleted as merely dormant.

**Presentation.** The Mirror message displays reflection pressure over the Heat-named threshold without saying Heat.

**Tests.** Session-state, engine, player-count, reconnect, and scenario tests construct/assert it.

**Risk.** Removal breaks the Mirror gate and schema. First split a correctly named Mirror-pressure threshold or scenario parameter.

## HF-004 — Gear and shop Heat costs

**Origin.** `black-route-fuse.json` declares `heatCost: 1`; room server builds at least one service with `cost: { heat: 1 }` (`roomServer.ts:8036`).

**Validation.** Gear schema accepts nonnegative `heatCost`; server shop validation controls availability/intent.

**Mutation.** The exact payment semantics are not unified with generic effects. Tests seed sufficient Heat for Fuse use, while other server paths preserve the value; shop result structures can carry cost/result deltas.

**Storage.** Character Heat and projected shop cost objects.

**Projection.** `heatCost` and `cost.heat` are in shared client types.

**Presentation.** Phone action and host shop format the number as “Risk,” not Heat (`PhoneActionPanel.tsx:229`; `HostShopOverlay.tsx:63`).

**Persistence.** Any resulting character Heat remains in session state.

**Tests.** Engine tests cover gear eligibility; shop projection/TvApp/PhoneActionPanel tests cover cost display.

**Risk.** “Risk” is ambiguous and may describe a cost players cannot see or replenish. A rename to Scar would invert direction (paying Scar versus gaining one); a Wound cost changes defeat pressure.

## HF-005 — Direct Heat reduction and result delta

**Origin.** A server resolution directly sets `heat = max(0, heat - 1)` (`roomServer.ts:6471`) and another result emits `heatDelta: -1` (`2299`).

**Validation/mutation.** Server authority performs the change; it does not pass through the compatibility no-op reducer effect.

**Projection/presentation.** `heatDelta` exists in result payload types and may be rendered by shared delta UI. This is the strongest partial-flow risk: a value can mutate even though the primary status is hidden.

**Persistence.** Mutation persists in character state and reconnect.

**Tests.** Engine/server tests with nonzero Heat protect related actions, but an explicit end-to-end UI assertion for the delta was not located.

**Risk.** Removing display only leaves invisible state changes; removing mutation only changes ability/service balance. Identify the owning rule before redesign.

## HF-006 — Legacy Threat effect-key adapters

**Origin.** Stable keys such as `threat_fail_gain_heat`, `threat_defeat_reduce_heat`, and `threat_combat_plus_one_if_player_has_heat` remain in content.

**Validation.** Threat resolver catalog accepts the stable keys.

**Mutation.** Gain/reduce keys now return notes/no-op effects. The “has heat” key checks `scars.length > 0`.

**Projection/presentation.** Compatibility summaries may appear publicly; raw keys normally do not.

**Persistence.** Keys exist in authored content and therefore are compatibility identifiers.

**Tests.** Threat and engine tests protect resolution.

**Risk.** Renaming keys breaks content; preserving names forever invites new misuse. Introduce aliases and reject new authoring with legacy keys.

## HF-007 — Content balance dead ends

Many active cards still advertise or encode a Heat consequence whose resolver is a no-op. These flows successfully validate, enter pending-effect handling, resolve, and log—but impose no lasting cost.

Security impact is low because server authority remains intact. Balance and comprehension impact are high: a card can appear threatening while producing no resource consequence, and private/public summaries may disagree about what mattered.

## Projection and privacy conclusions

- Heat is part of shared public/private shapes even when not visibly rendered.
- No evidence shows Heat itself is secret; nevertheless, removing it from public payloads should be proven with public-projection tests.
- A compatibility adapter must not copy private Scar identities into TV payloads while replacing numeric Heat.
- Stale-intent validation can be affected if an item/service cost field changes name without versioning.

## Formal migration support

No general, versioned saved-room migration framework was found. Current compatibility is primarily achieved by retaining schema fields, defaults, stable IDs, and no-op resolvers. That makes field deletion a Phase 4/5 action, not a terminology cleanup.
