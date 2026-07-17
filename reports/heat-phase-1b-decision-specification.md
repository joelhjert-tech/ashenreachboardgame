# Phase 1B Heat Decision Specification

Date: 2026-07-12
Approval state: **all recommendations pending user approval**

## Required decisions

1. **Black Route Fuse:** remove `heatCost`; discard and +1 escalation remain its costs.
2. **Heat-cost services:** `risk-action` becomes Deep Relic Search with a proposed 1-Salvage reveal fee. It is the only `cost.heat` service.
3. **Risk:** disappears after these surfaces migrate.
4. **Direct mutation:** remove `buy-boon`'s false delta with service withdrawal; remove nemesis Heat reduction after all active consumers migrate.
5. **120 allowlisted entries:** 70 mechanical-preserving cleanup candidates; 50 require individual design; none convert automatically.
6. **Old nonzero Heat:** preserve but ignore; no compensation or conversion.
7. **Optional field:** make `character.heat` optional only after all gameplay reads/writes and projections are gone and a versioned legacy loader exists.
8. **Mirror name:** `reflectionPressureThreshold`, with new-key-preferred dual-read fallback.
9. **Stable IDs:** preserve five content/service IDs; deprecate nine serialized/effect constructs and ten threat keys through aliases.
10. **Order:** safeguards -> Fuse -> shop -> deltas/direct mutation -> content batches -> persistence -> schema/key removal.

## Implementation slices

### Slice 1 — Remove fake Fuse cost

- Current: `content/gear/black-route-fuse.json` declares a cost that server/reducer ignore.
- Future: remove metadata and Risk presentation; use exact discard/escalation rule text.
- Schema: no new fields; retain `heatCost` compatibility support for old payloads temporarily.
- Server: no roll/effect changes.
- Phone/TV: remove Risk cost from Fuse only.
- Persistence: existing owned copies retain ID and behavior.
- Tests: matching-stat timing, +3 modifier, discard once, +1 escalation, no Heat read/write, reconnect.
- Rollback: restore presentation metadata only; no state migration required.

### Slice 2 — Migrate relic search

- Current: `risk-action` projects `{heat:1}` but affordability/payment ignore it.
- Future: stable ID `risk-action`, display **Deep Relic Search**, `{salvage:1}`, reveal four relic-dealer options.
- Server: both projection affordability and reducer payment validate the same Salvage cost before revealing.
- Phone/TV: identical name, fee, affordability, and rejection reason.
- Persistence/reconnect: paid reveal persists; stale duplicate request cannot pay twice or create a second reveal.
- Tests: 0/1 Salvage, atomic payment, repeat fee, four options, modes, reconnect, public/private stock rules.
- Rollback: revert service cost/display while retaining stock reveal state compatibility.

### Slice 3 — Withdraw incomplete boon and remove false delta

- Current: `buy-boon` costs 2 Salvage and emits `heatDelta:-1` without mutation.
- Future: omit from normal service projection; preserve ID and parsing for old logs/actions; stop new `heatDelta` emission.
- UI: no normal-play boon/Risk delta.
- Tests: old event deserializes; new shops omit service; result deltas contain no Heat/Risk.
- Rollback: re-enable projection only after restoring a consistent typed result.

### Slice 4 — Remove final direct Heat reward mutation

- Current: cross-seat nemesis defeat reduces attacker Heat and grants two trophies.
- Future: retain trophies; remove Heat assignment.
- Tests: same victory/binding/trophy behavior; no Heat write; old nonzero Heat remains unchanged.
- Rollback: compatibility adapter can restore legacy reduction without touching nemesis flow.

### Slice 5 — Content cleanup

- Remove stale allowlist IDs and text-only references first.
- Process 39 combined-effect entries by content family, deleting only no-op members.
- Design 50 Heat-only entries individually; preserve event identity for mission/scenario history.
- Update the allowlist after each migrated ID; validation must reach zero authored Heat constructs before discriminator removal.
- Rollback: content-family commits with catalog snapshots and balance fixtures.

### Slice 6 — Persistence and Mirror semantics

- Add schema versioning/migration support before changing required fields.
- Add optional `reflectionPressureThreshold`; read new then old; new saves write new only.
- Ignore legacy `character.heat`, then make it optional/default zero, then stop emitting it.
- Remove old keys only after legacy save, reconnect, stale-intent, and projection fixtures pass.
- Rollback: retain dual-read adapter for at least one compatibility window.

## Interface and compatibility contract

- No Heat value converts to Wounds, Scars, Salvage, pressure, escalation, or charges.
- Payment is validated before effect/reveal; failure changes no state and spends nothing.
- Scenario/card resolution identity remains stable even when a no-op consequence is removed.
- New fields win over legacy aliases when both exist.
- Machine IDs may retain legacy words; raw legacy words never return to player-facing surfaces.
- Rivalry-private state remains owner-only; no migration uses public Heat values.

## Likely implementation surfaces

| Slice | Primary files/systems |
|---|---|
| Fuse | `content/gear/black-route-fuse.json`, gear-use validation/action construction in `src/server/roomServer.ts`, phone inventory presentation, focused engine/client tests |
| Relic search | Shop service construction/validation in `src/server/roomServer.ts`, shop cost application in `src/game/engine/reducer.ts`, shared shop types, phone/TV shop presentation and tests |
| Boon/delta | Shop service projection/action construction, shared result-delta types/rendering, shop and projection tests |
| Nemesis reward | Nemesis defeat handling in `src/server/roomServer.ts` and confrontation/reward tests |
| Content batches | Affected `content/` families, `scripts/legacy-heat-validation.ts`, content validation and family-specific engine tests |
| Persistence/Mirror | Character/session schemas, session initialization, legacy compatibility helper, server projection/serialization, reconnect and scenario tests |

## Required tests by boundary

- Content guard accepts shrinking allowlist and rejects reintroduction.
- Fuse behavior and item identity unchanged except absent fake cost.
- Shop affordability, atomic payment, repeat use, reconnect, and public/private projection.
- No false `heatDelta` or Risk chip.
- Nemesis trophy reward unchanged.
- Each content family has golden before/after active-effect assertions.
- Old saves with nonzero Heat load without benefit or punishment.
- Mirror dual-read, precedence, mismatch handling, serialization, and reconnect.
- Stable legacy action/content IDs parse until their documented removal gate.

## Four-seat acceptance

- **New Player:** every visible cost names the real payment; no Risk meter is implied.
- **Optimizer:** no free stock reveal, old-save currency, duplicate payment, or no-op reward farming.
- **Family Player:** no new bookkeeping; routine penalties do not become Scars or Wounds wholesale.
- **Rules Lawyer:** costs precede effects, insufficient costs reject atomically, new keys beat legacy aliases, and legacy values are ignored rather than converted.

## Approval gates still required

- Approve the proposed 1-Salvage Deep Relic Search fee.
- Approve temporary withdrawal of `buy-boon` pending a separate benefit design.
- Approve each of the 50 Heat-only content replacements; no global mapping is safe.
- Define the supported legacy-save window before schema removal.
