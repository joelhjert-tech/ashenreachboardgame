# Heat Compatibility C4B1: Shared Escalation Heat Removal

Date: 2026-07-15

Approval: `f39179b docs: approve escalation heat retirements`

Scope:

- `escalation-blackstar-hunger`
- `escalation-choir-feedback`
- `escalation-saltwind-lockdown`

## Implemented result

Each scoped escalation definition previously contained exactly one inert shared-target compatibility leaf:

```json
"resolveEffect": {
  "type": "gain_heat_all",
  "amount": 1
}
```

C4B1 removes that optional `resolveEffect` property from each definition. No replacement object or consequence was added.

Every definition retains:

```json
"escalationDelta": 1
```

The cards therefore continue to create exactly one authoritative shared Global Escalation advance during sector-card resolution.

## Card-by-card preservation

### `escalation-blackstar-hunger`

- Removed: one `gain_heat_all 1` leaf.
- Preserved: stable ID, Blackstar Hunger title, type `escalation`, step 4, complete text, flavor, collapse-facing resolution summary, finite local-deck distribution, and `escalationDelta: 1`.
- Added consequences: none.
- Approved severity remains 3.

### `escalation-choir-feedback`

- Removed: one `gain_heat_all 1` leaf.
- Preserved: stable ID, Choir Feedback title, type `escalation`, step 2, complete text, flavor, signal-burden resolution summary, five finite local-deck entries, and `escalationDelta: 1`.
- Added consequences: none; no Signal or Siren-style modifier exists.
- Approved severity remains 3.

### `escalation-saltwind-lockdown`

- Removed: one `gain_heat_all 1` leaf.
- Preserved: stable ID, Saltwind Lockdown title, type `escalation`, step 2, complete text, flavor, route-pressure summary, one finite local-deck entry, and `escalationDelta: 1`.
- Added consequences: none; no route restriction, movement modifier, topology mutation, or displacement exists.
- Approved severity remains 2.

No wording cleanup was needed. The existing text, flavor, and resolution summaries contain no player-resource Heat wording and already describe the retained shared pressure accurately.

## Authoritative Global Escalation behavior

The server still reads each card's `escalationDelta` through the established sector-card path and calls the existing Global Escalation resolver once. C4B1 changes no server or reducer code.

Preserved behavior:

- one requested shared delta of +1;
- solo collapse cap 8;
- multiplayer collapse cap 6;
- difficulty modifier `floor(level / 2)` after clamping;
- existing unguarded threshold and collapse handling;
- existing public result and collapse presentation;
- selected local escalation card consumed once;
- no per-player iteration or private consequence;
- existing action validation, replay rejection, reconnect reconstruction, and session reset.

Focused tests proved an ordinary multiplayer 3 to 4 crossing updates the modifier to 2 once, multiplayer 5 to 6 triggers one existing collapse, and solo 7 to 8 triggers one existing collapse. C4B1 neither guards nor forces those outcomes.

## Player-count behavior

Each of the three cards was resolved through the authoritative room server at all approved player counts:

| Mode | Players | Shared delta | Per-seat result | Heat result |
|---|---:|---:|---:|---:|
| Solo | 1 | +1 once | 0 | 0 |
| Multiplayer | 2 | +1 once | 0 | 0 |
| Multiplayer | 3 | +1 once | 0 | 0 |
| Multiplayer | 4 | +1 once | 0 | 0 |

The result count does not scale with player count. Other operatives receive only the same public shared-track projection.

## Replay, reconnect, and projection

- Reconnect before resolution preserves the server-owned local card deck; resolution consumes the selected card and advances the track once.
- A duplicate resolution request after completion cannot restore the consumed card or create a second escalation event.
- Reconstructing the room from completed serialized state does not replay the delta.
- Legacy Heat metadata remains inert and does not participate in escalation resolution.
- Owner phone, another phone, and TV projections were recursively inspected for Heat keys and typed Heat effects; none were present.
- The existing shared escalation result remains public. No Heat row, empty compatibility row, private state, or duplicate shared-track result is introduced.

## Validation boundary

The three construct-specific `gain_heat_all` exceptions were removed from `LEGACY_HEAT_EFFECT_APPROVALS`. Validation now rejects reintroduction of those leaves on the scoped IDs. The only remaining active authored Heat approvals are:

- `escalation-marrow-surgery-debt`: `gain_heat 1`;
- `crownless-advocate`: `lose_heat 1`;
- `saltflat-bone-reader`: `lose_heat 1`.

Compatibility parsers, schemas, runtime no-op handling, migration fixtures, and historical documentation remain available. No broad text ban or compatibility-field deletion occurred.

## Authored Heat recount

Repository classification after C4B1 found:

| Population | Before | Removed | After |
|---|---:|---:|---:|
| Board | 0 | 0 | 0 |
| Scenario | 0 | 0 | 0 |
| Escalation | 4 | 3 | 1 |
| Followers | 2 | 0 | 2 |
| Total | 6 | 3 | 3 |

Remaining authored IDs:

- `escalation-marrow-surgery-debt`
- `crownless-advocate`
- `saltflat-bone-reader`

The audit verdict remains **FAIL** while those three effects remain authored.

## Focused coverage

`heatCompatibilityC4B1SharedEscalations.test.ts` proves:

- exact identity, text, flavor, step, summary, and `escalationDelta` preservation;
- absence of `resolveEffect`, Heat, or a replacement consequence;
- one shared advance for every scoped ID in solo and 2-, 3-, and 4-player rooms;
- ordinary modifier-threshold and solo/multiplayer collapse behavior;
- local-deck consumption, duplicate rejection, reconnect, and projection containment;
- removal of the three exact validation approvals.

Existing C1, C3B, and Phase 1E tests were updated only to reconcile the authored population and approval-manifest count.

## Verification

- `npm.cmd run validate:content`: passed; 16 escalations and 109 Threats.
- `npm.cmd run typecheck`: passed.
- Focused C4B1/C1/C3B/validation run: 4 files, 36 tests passed.
- The first broad engine run exposed nine stale manifest/population assertions that still expected the pre-C4B1 8/22 approval boundary and six authored effects. No mechanics assertion failed. Those exact guards were reconciled to the approved 5/19 boundary and three remaining effects.
- Exact failed-guard plus C4B1 rerun: 10 files, 156 tests passed.
- `npm.cmd run test:engine`: 58 files, 698 tests passed on the reconciled full rerun.
- `npm.cmd run test:integration`: 27 files, 233 tests passed; the reconnect timing test passed without retry.
- `npm.cmd run test:client`: 26 files, 258 tests passed; only existing missing-art fallback warnings were emitted.
- `npm.cmd run test`: 111 files, 1,189 tests passed.
- `npm.cmd run audit:assets`: 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- `git diff --check` and `git diff --cached --check`: passed before commit.

## Scope conclusion

C4B1 changes exactly three escalation definitions, the three corresponding validation exceptions, narrow containment tests, and Heat-retirement reports. It changes no Global Escalation implementation, cap, threshold, collapse, projection, compatibility parser, schema, server, UI, asset, topology, scenario, board, Threat, follower, mission, item, economy, Wound, Scar, Salvage, Loss Pressure, movement, modifier, or Equipment behavior.

`escalation-marrow-surgery-debt` remains untouched for C4B2 so its separate removal can prove that no historical Salvage-loss proposal was introduced.
