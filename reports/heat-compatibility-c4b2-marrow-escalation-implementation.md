# Heat Compatibility C4B2: Marrow Escalation Heat Removal

Date: 2026-07-15

Approval: `f39179b docs: approve escalation heat retirements`

Prior implementation: `6d58701 feat: remove shared escalation heat effects`

Scope: `escalation-marrow-surgery-debt`

## Implemented result

The scoped escalation definition previously contained one inert personal Heat leaf:

```json
"resolveEffect": {
  "type": "gain_heat",
  "amount": 1
}
```

C4B2 removes that optional `resolveEffect` property. No replacement object or consequence was added.

The definition retains:

```json
"escalationDelta": 1
```

The card therefore continues to create exactly one authoritative shared Global Escalation advance during sector-card resolution.

## Content identity preserved

- Stable ID: `escalation-marrow-surgery-debt`.
- Display name: Marrow Surgery Debt.
- Type/category: `escalation`.
- Step/severity metadata: 3 / approved severity 2.
- Text: "Field surgeons call in favors, and every healed wound starts billing the future."
- Flavor: "You can leave the table alive and still owe it blood."
- Resolution summary: "Surgery debt followed the party as a new lasting mark."
- Finite authored distribution: one local escalation-deck entry.
- Shared effect: `escalationDelta: 1`.

No wording cleanup was needed. The medical and debt language remains descriptive; it defines no payment, Salvage requirement, Wound, Scar, or lasting personal status.

## Historical Salvage proposal rejected

The earlier audit considered an automatic floor-zero `lose_salvage 1` replacement. C4A explicitly rejected it, and C4B2 introduces none of the following:

- `lose_salvage`, `pay_salvage`, or `spend_salvage`;
- an affordability or minimum-Salvage condition;
- a zero-Salvage branch;
- a shop transaction or transaction ID;
- Salvage Ledger state;
- mission or Contract progress;
- `completedContracts` mutation;
- relic-dealer interaction;
- a private payment choice or persistent debt marker.

Focused content validation proves reintroducing `gain_heat 1` is rejected and an unapproved `lose_salvage 1` on this escalation is rejected by the existing automatic-loss boundary. Runtime tests snapshot every operative's Salvage, Wounds, Scars, held gear, and equipped gear before and after resolution; all remain exact.

## Authoritative Global Escalation behavior

The existing server path continues to read `escalationDelta` and invoke the established Global Escalation resolver once. C4B2 changes no server, reducer, schema, or shared-pressure implementation.

Preserved behavior:

- one requested shared delta of +1;
- solo cap 8 and multiplayer cap 6;
- difficulty modifier `floor(level / 2)` after clamping;
- existing unguarded threshold and collapse handling;
- existing public shared result;
- local escalation card consumption once;
- no per-player iteration;
- existing replay rejection, reconnect reconstruction, and session reset.

Focused tests prove an ordinary multiplayer 3 to 4 crossing updates the modifier to 2 once, multiplayer 5 to 6 triggers one existing collapse, and solo 7 to 8 triggers one existing collapse.

## Player-count behavior

| Mode | Players | Shared delta | Heat | Salvage | Other personal consequence |
|---|---:|---:|---:|---:|---:|
| Solo | 1 | +1 once | 0 | 0 | 0 |
| Multiplayer | 2 | +1 once | 0 | 0 | 0 |
| Multiplayer | 3 | +1 once | 0 | 0 | 0 |
| Multiplayer | 4 | +1 once | 0 | 0 | 0 |

The result does not scale with player count. All players observe the same authoritative public shared-track state.

## Replay, reconnect, and projection

- Reconnect before resolution preserves the server-owned local escalation deck.
- Resolution consumes the selected card and advances the shared track once.
- Duplicate requests cannot restore the card or add another escalation event.
- Reconstructing a room from completed serialized state does not replay the delta.
- Legacy Heat metadata remains inert.
- Owner phone, another phone, and TV projections contain no Heat key or typed Heat effect.
- No projection contains a Salvage-loss result, payment prompt, empty compatibility row, or duplicate shared update.

## Validation boundary and authored recount

The exact `escalation-marrow-surgery-debt` / `gain_heat` exception was removed from `LEGACY_HEAT_EFFECT_APPROVALS`. Validation now rejects reintroduction while compatibility parsers, migrations, fixtures, and historical reports remain available.

Repository classification after C4B2 found:

| Population | Before | Removed | After |
|---|---:|---:|---:|
| Board | 0 | 0 | 0 |
| Scenario | 0 | 0 | 0 |
| Escalation | 1 | 1 | 0 |
| Followers | 2 | 0 | 2 |
| Total | 3 | 1 | 2 |

Remaining authored IDs:

- `crownless-advocate`
- `saltflat-bone-reader`

The audit verdict remains **FAIL** pending their separate follower approval and implementation.

## Focused coverage

`heatCompatibilityC4B2MarrowEscalation.test.ts` proves:

- exact card identity, prose, step, summary, and `escalationDelta` preservation;
- absence of `resolveEffect`, Heat, Salvage, payment, Wound, Scar, movement, modifier, or Equipment replacement;
- one shared advance in solo and 2-, 3-, and 4-player rooms;
- no personal-state mutation;
- ordinary threshold and solo/multiplayer collapse behavior;
- local-card consumption, replay rejection, reconnect, and projection containment;
- removal of the exact validation exception and rejection of the historical Salvage proposal.

Population guards were reconciled from the post-C4B1 five/19 approval boundary and three authored effects to the post-C4B2 four/18 boundary and two follower effects. No mechanics assertion or implementation was changed.

## Verification

- `npm.cmd run validate:content`: passed; 16 escalations and 109 Threats.
- `npm.cmd run typecheck`: passed.
- Focused escalation, containment, projection, and Salvage/economy selection: 8 files, 71 tests passed.
- `npm.cmd run test:engine`: 59 files, 706 tests passed.
- `npm.cmd run test:integration`: 27 files, 233 tests passed; the reconnect timing test passed without retry.
- `npm.cmd run test:client`: 26 files, 258 tests passed; only existing missing-art fallback warnings were emitted.
- `npm.cmd run test`: 112 files, 1,197 tests passed.
- `npm.cmd run audit:assets`: 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- `git diff --check` and `git diff --cached --check`: passed before commit.

## Scope conclusion

C4B2 changes exactly one escalation definition, its exact validation exception, narrow compatibility tests, and retirement reports. It changes no Global Escalation implementation, cap, threshold, collapse, Salvage resolver, Salvage Ledger, shop, economy, mission, Contract, relic-dealer, Wound, Scar, movement, item, scenario, board, Threat, follower, compatibility parser, schema, server, UI, projection, or asset behavior.
