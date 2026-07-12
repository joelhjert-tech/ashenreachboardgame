# Phase 4D2 Scar-Sink Prayer Approval and Readiness Gate

Audit date: 2026-07-12

Artifact content ID: `artifact-heat-sink-prayer`

Owned gear compatibility ID: `heat-sink-prayer`

Player-facing name: **Scar-Sink Prayer**

## Decision

**BLOCKED — do not implement Admit the Fear yet.**

The recommended rule requires an authoritative equipped-Scar trigger that produces pending Wounds before they resolve. No such lifecycle exists. Adding the Artifact now would require inventing the Scar trigger engine, pending consequence state, reaction projection, reconnect behavior, and ordering rules during an item implementation pass.

## Current Scar lifecycle

### How a Scar is gained

There are two implemented gain paths:

1. A typed `gain_scar` encounter effect applies immediately through `applyEffectToPlayer`, appending `effect.scarId` to `character.scars` (`src/game/engine/reducer.ts`, `gain_scar` branch).
2. After Wounds reach the session threshold, the server creates `WOUND_THRESHOLD_REACHED`. The reducer recalls the operative and appends the selected wound Scar in the same transaction (`src/server/roomServer.ts`, `shouldTriggerWoundThreshold` / `createWoundScar`; `src/game/engine/reducer.ts`, `WOUND_THRESHOLD_REACHED`).

Neither path pauses before Scar application.

### Pending authoritative state

- Incoming Scar gain has **no pending server-authoritative Scar state**.
- Scar-triggered consequences have **no pending state**.
- `pendingFailureReaction` covers failed movement/hazard handling, not Scar triggers.
- `pendingStaticIntercessionReaction` covers one failed recurring Anomaly Challenge consequence, not Scar triggers.
- No typed action or schema identifies a pending Scar ID, trigger ID, pending Wound amount, or selected prevention source.

### Scar identity and ownership

- Individual Scar definitions have stable IDs such as `scar-wound-1`.
- Owned Scars are stored as IDs in `character.scars`.
- Scar cards author `trigger`, `penalty`, `effect`, `relief`, and optional upside text.
- The current engine does not generally evaluate those authored trigger strings into authoritative trigger events.
- Scars are not equipped. The approved option's phrase “equipped Scar trigger” has no current runtime counterpart.
- Face-up/facedown Afflictions are a separate typed system and must not be treated as Scars to bypass this gap.

### Prevention, delay, quarantine, and transformation

- No generic Scar prevention action exists.
- No delayed Scar application queue exists.
- No Scar quarantine/suppression state exists.
- No safe transform/replace-Scar transaction exists.
- Preventing a Scar after `gain_scar` or `WOUND_THRESHOLD_REACHED` would be rollback and is prohibited.

### Reconnect and projections

- Applied Scar IDs persist and are summarized to the owning phone.
- There is no pending Scar reaction to preserve across reconnect.
- Phone receives Scar catalog summaries, not an eligible Scar-Sink reaction window.
- TV receives only ordinary public operative/result information; there is no public Scar-prevention result projection.

## Existing content compatibility

`content/gear/heat-sink-prayer.json` already uses the player-facing name **Scar-Sink Prayer**, but its active text is legacy note behavior. Server compatibility routes the ID to a note stating that legacy pressure relief is deprecated. This is not Admit the Fear and must not be expanded into Scar prevention without the missing lifecycle.

Legacy Heat wording must remain absent from any future player-facing rule and prompt. The stable compatibility ID may remain internal.

## Current option review

The Phase 4D2 report recommends:

> Reaction — Before an equipped Scar trigger causes you to suffer Wounds, spend 1 charge to prevent 1 of those Wounds. The Scar still triggers, remains owned, and all other effects resolve normally.

This is mechanically precise only after the engine can identify:

- the owned Scar ID;
- an authoritative trigger occurrence ID;
- the trigger's pending typed effects;
- a positive pending Wound amount sourced specifically from that Scar;
- whether another prevention source already modified the same Wound unit;
- when the reaction closes;
- how the state reconstructs after reconnect.

None of these exist together today.

## Approval block

Scar-Sink Prayer:

- Selected option: **[UNAPPROVED — Option A remains recommended but is not implementation-ready]**
- Maximum charges: **[UNAPPROVED; recommendation remains 2]**
- Starting charges: **[UNAPPROVED; recommendation remains 2]**
- Cost per activation: **[UNAPPROVED; recommendation remains 1 charge]**
- Additional cost: **[UNAPPROVED; recommendation is None]**
- Recharge: **none**
- Scope: **[UNAPPROVED; recommendation is owner only]**
- Activation timing: **[UNSUPPORTED — before Wounds from an authoritative owned-Scar trigger resolve]**
- Exact eligible Scar state: **[MISSING — no typed pending Scar-trigger consequence exists]**
- Exact effect: **[UNAPPROVED; recommendation is prevent exactly 1 pending Wound sourced by that Scar trigger]**
- Scar disposition: **[UNAPPROVED; recommendation is that the Scar triggers and remains owned]**
- Final rule text: **[UNAPPROVED pending the Scar trigger lifecycle]**

## Smallest safe prerequisite track

This cannot be solved by a Censer-style consequence selector alone because there is no authoritative Scar trigger event to pause. The prerequisite is a separate Scar lifecycle design and implementation phase:

1. Convert only explicitly approved Scar trigger prose into supported typed trigger metadata.
2. Create a stable Scar trigger occurrence ID.
3. Evaluate the trigger server-side at the exact approved event.
4. Persist a pending Scar consequence containing owner seat, Scar ID, trigger ID, typed effects, and source-bound pending Wound amount.
5. Project private reaction eligibility only to the owner and a public-safe waiting/result state to TV.
6. Reconnect the same pending trigger without applying it twice.
7. Resolve or decline through an authoritative action.
8. Preserve existing Scar ownership unless an explicit relief rule changes it.

This is a Scar-system feature, not part of the Scar-Sink Prayer item slice. It requires its own content migration decisions because current Scar trigger text is authored prose and may not map uniformly to runtime events.

## Cross-item and system interaction audit

| System | Current relationship | Required future decision |
|---|---|---|
| Blackstar Ampoule | Failed movement/hazard reaction; not a Scar trigger | It must not consume or close a Scar reaction unless both source types genuinely apply |
| Mirror Reroll Token | Reroll can change whether a failed test's later consequences occur | Final reroll/result replacement must finish before a Scar-trigger consequence window opens |
| Choir Static Censer | Suppresses one pending recurring-Anomaly failure effect | Censer may affect the anomaly consequence; Prayer may act only on a separately identified Scar-triggered Wound. They cannot both prevent the same effect unit |
| Existing Wound prevention | Character/follower prevention helpers can rewrite Wound outcomes before application | Future Scar window must receive the already-authoritative remaining Scar-sourced Wound amount, or define earlier priority explicitly |
| Character Scar abilities | Current “Scar Ledger” named ability is mission-completion healing, not a general Scar trigger engine | Do not reuse its name or event log as pending Scar state |
| Mission/scenario Scar triggers | Some systems read Scar count or add Scar IDs directly | Prevention must define whether an unapplied Scar counts; Scar-trigger Wound prevention must not erase the owned Scar or its trigger record |

Safe provisional priority for later approval is: test/result and reroll resolution -> existing source-specific Wound transformation/prevention -> typed Scar trigger opens -> Scar-Sink prevention -> remaining Scar effects. This is a recommendation, not a current rule.

## Tests required before item implementation

The prerequisite Scar lifecycle must first prove:

- typed Scar trigger opens once at the correct event;
- unrelated Scars and Afflictions do not open it;
- pending Scar ID, trigger ID, effect source, and Wound amount are stable;
- already-applied Scars/consequences cannot be rolled back;
- reconnect preserves the pending trigger without replay;
- decline resolves normally;
- stale/wrong-seat/duplicate trigger intents are rejected;
- private choices stay owner-only and TV output is public-safe;
- existing direct `gain_scar` and wound-threshold recall remain unchanged unless separately migrated.

Only after those pass should the Artifact approval block be finalized and the charged-item tests added.

## Implementation gate result

- Existing pending Scar reaction: **No**
- Narrow extension to an existing Scar reaction: **No; there is no Scar trigger resolver to extend**
- Broad Scar redesign required: **Yes, bounded to typed trigger authoring and pending consequence resolution, but broader than one Artifact**
- Mechanics changed in this pass: **No**
- Implementation report created: **No; implementation is blocked**
