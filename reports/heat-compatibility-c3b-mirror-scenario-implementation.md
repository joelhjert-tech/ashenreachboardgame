# Heat Compatibility C3B: Mirror Scenario Implementation

Date: 2026-07-15
Approval: `b5694c9 docs: approve mirror scenario heat retirement`
Scope: `scenario_mirror_of_false_heroes` only

## Implemented result

The Mirror of False Heroes confrontation plan now always returns `effect: null`.

Removed exactly:

```ts
context.mirrorPressure >= 6 ? { type: "gain_heat", amount: 1 } : null
```

Replaced with:

```ts
null
```

No Wound, Scar, Global Escalation, preparation loss, confrontation-progress loss, scenario loss pressure, temporary modifier, movement, Salvage, Equipment, persistent condition, or choice effect replaces it.

## Preserved scenario systems

- Stable ID and display name remain `scenario_mirror_of_false_heroes` / The Mirror of False Heroes.
- Setup, global rules, Mirror Pressure, side-objective definitions, final gate, mode cutoff, three confrontation checks, `mirrorBreaks`, victory and loss copy, rewards, difficulty, and player-count support are unchanged.
- The confrontation-plan entry remains present; only its effect leaf changed.
- The plan's check order remains Guile, Signal, then Grit. Difficulties remain `10 + context.mirrorPressure`.
- The mark label remains `mirror break`; victory summary and confrontation text are unchanged.
- Existing server confrontation admission, progress, victory, loss, reward, source-event, replay, and reconnect behavior remain untouched.
- Broader Mirror alignment work remains deferred: shared pressure versus Scar-based plan context, side-objective victory ownership, preparation/confrontation separation, and False Hero threshold behavior were not changed.

## Scenario-state isolation

The implementation changes no preparation resource or source, does not spend preparation, and does not alter the final-gate predicate. It changes no confrontation stage, progress counter, boss behavior, center requirement, victory action, winning-seat ownership, loss action, or result projection. The retired effect was an inert compatibility leaf rather than a hidden gate or counter.

## Center tile and scenario art

- Canonical confrontation sector: `center_cinder_gate`.
- Canonical center neighbors remain `inner_gate_of_cinders` and `inner_blackstar_shortcut`.
- Off-center sectors remain ineligible for scenario confrontation.
- Mirror art remains `/assets/scenarios/mirror-of-false-heroes.png` via `scenario_sheet_mirror_of_false_heroes`.
- No topology, movement, map, scenario-art, asset, projection, reconnect, or room-reset implementation changed.

## Validation and projection boundary

The exact imported board/scenario Heat manifest is now empty. `validate:content` therefore rejects any new typed Heat leaf in board or scenario runtime content instead of retaining a Mirror exception. The six escalation/follower approvals remain separate and unchanged.

Phone and TV projection code did not change. The plan contains no effect to summarize, the compatibility projection guard remains active, and no Heat or empty consequence row is introduced.

## Focused coverage

`heatCompatibilityC3BMirrorScenario.test.ts` proves:

- stable scenario identity and static contract fields;
- null effect below, at, and above the retired threshold;
- no Heat or replacement effect;
- exact check order and difficulty calculation;
- canonical center sector, neighbors, and art mapping;
- byte-stable hashes for the other five scenario definitions and plans;
- exact six-ID authored Heat population.

Existing scenario tests continue to cover center-only confrontation, gate/cutoff behavior, progress, victory, scenario pressure, art, and resolution. Existing containment and projection guards continue to cover legacy metadata, reconnect, no-op actions, and client privacy.

## Authored Heat recount

| Population | Before C3B | Removed | After C3B |
|---|---:|---:|---:|
| Board | 0 | 0 | 0 |
| Scenario | 1 | 1 | 0 |
| Escalation/follower | 6 | 0 | 6 |
| Total | 7 | 1 | 6 |

Repository-backed remaining IDs:

- `escalation-blackstar-hunger`
- `escalation-choir-feedback`
- `escalation-marrow-surgery-debt`
- `escalation-saltwind-lockdown`
- `crownless-advocate`
- `saltflat-bone-reader`

The audit verdict remains **FAIL** while these six authored effects remain.

## Verification

Focused verification completed before the full suite:

- `npm.cmd run validate:content` — passed; Threat total remains 109.
- `npm.cmd run typecheck` — passed.
- C3B/C1/validation focused run — 3 files / 35 tests passed.
- Scenario-focused run — 3 files / 43 tests passed.

Full verification results:

- `npm.cmd run test:engine` - passed.
- `npm.cmd run test:integration` - 27 files / 233 tests passed; reconnect timing passed without retry.
- `npm.cmd run test:client` - 26 files / 258 tests passed; only existing missing-art fallback warnings were emitted.
- `npm.cmd run test` - 110 files / 1,169 tests passed.
- `npm.cmd run audit:assets` - 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build` - passed.

## Scope conclusion

C3B removes one inert authored scenario Heat effect and narrows its exact validation exception. No broader scenario foundation, scenario behavior, compatibility parser, engine/server branch, phone/TV component, asset, topology, mission, Contract, item, economy, movement, Wound, Scar, or Global Escalation behavior changed.
