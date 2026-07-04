# Loss Counter vs Escalation Counter Audit

## Executive summary

The counters are distinct, but the UI labels made them look duplicated.

- `scenarioPressure.objectiveProgress` is the public win track.
- `scenarioPressure.pressureTrack` is scenario-specific pressure or scenario telemetry, such as Seal Integrity or Doom.
- `scenarioPressure.collapseTrack` is the public loss/failure track derived from global escalation.
- Raw `escalationLevel`, `escalationThreshold`, and `escalationModifier` remain the global escalation state used for round pressure and difficulty modifiers.

The confusing part was that the scenario sheet rendered the collapse track as "Loss Pressure" but its supporting label came from `collapseTrack.name`, which is currently "Escalation". Separate TV and phone status areas also displayed raw escalation as "Escalation". That made one source field appear as two unrelated counters.

## Source fields found

| Field | Source | Meaning |
| --- | --- | --- |
| `GameState.escalationLevel` | engine/session state | Global round pressure and difficulty modifier source. |
| `getEscalationCollapseLevel(sessionMode)` | `src/game/engine/escalation.ts` | Failure threshold for global escalation. |
| `getEscalationModifier(escalationLevel)` | `src/game/engine/escalation.ts` | Modifier applied as global pressure rises. |
| `scenarioPressure.objectiveProgress` | `src/game/rules/scenarioPressure.ts` | Public win progress. |
| `scenarioPressure.pressureTrack` | `src/game/rules/scenarioPressure.ts` plus scenario metadata | Scenario-specific pressure/telemetry track. |
| `scenarioPressure.collapseTrack` | `src/game/rules/scenarioPressure.ts` | Normalized public loss track, backed by global escalation. |
| `activeScenario.pressureTrack` | `src/game/data/scenarios.ts` | Authored scenario-specific track metadata. |

## Projection locations

- `src/server/roomServer.ts` projects raw `escalationLevel`, `escalationThreshold`, and `escalationModifier`.
- `src/server/roomServer.ts` also projects `scenarioPressure`, built by `buildScenarioPressureState`.
- TV and phone receive the same public `scenarioPressure` model.
- Phone-only private rivalry data remains separate and is not part of these counters.

## TV render locations

- `src/client/tv/TvApp.tsx`
  - Recent outcome/status copy used raw escalation.
  - Session setup stats used raw escalation.
  - `ScenarioStatusCard` rendered objective progress and collapse pressure.
  - `EscalationMeter` rendered the raw global escalation meter.
  - Host bottom strip rendered raw global escalation as world state.
- `src/client/shared/scenarioBoardVisuals.ts`
  - Board scenario marker visualizes global escalation as a map marker.

## Phone render locations

- `src/client/phone/PortraitControllerView.tsx`
  - Quest tab scenario summary renders win progress and loss pressure.
- `src/client/phone/MobilePlayerCard.tsx`
  - Player card shows global escalation via `formatEscalation`.
- `src/client/phone/PhoneActionPanel.tsx`
  - Stabilize action refers to raw global escalation.
- `src/client/shared/explainabilityPrompts.ts`
  - Shared prompt summarizes public scenario objective and loss pressure.

## Duplicate or distinct?

The mechanics are distinct:

- Win Progress: complete the scenario objective.
- Loss Pressure: if this reaches the limit, the scenario fails.
- Global Escalation: round pressure that makes future threats harder.

`Loss Pressure` and `Global Escalation` are related because the current loss pressure is derived from global escalation, but they should not be rendered as separate unlabeled counters with the same word. The UI should use `Loss Pressure` inside scenario objective panels and `Global Escalation` where the raw escalation/modifier track is shown.

## Changes made

- Renamed raw escalation UI labels to `Global Escalation`.
- Kept scenario sheet collapse meter labeled `Loss Pressure`.
- Replaced collapse meter sublabel with a one-line consequence: "If this reaches the limit, the scenario fails."
- Renamed fallback/shared prompt wording from `Escalation` to `Global Escalation` when no scenario pressure model exists.
- Renamed escalation result delta text to `Global Escalation`.
- Preserved all state fields and mechanics.

## Risk notes

- `scenarioPressure.collapseTrack.name` still comes from the normalized state as `Escalation`; this is acceptable as a data/source label, but UI should not show it as the primary scenario failure label.
- Future scenario-specific loss tracks may want a distinct authored display name. If that happens, add a presentation label rather than renaming engine fields.
- No private rivalry data is involved in these counters.

## Recommendation

Keep the current normalized model and labels:

- `Win Progress`: "Complete the scenario objective."
- `Loss Pressure`: "If this reaches the limit, the scenario fails."
- `Global Escalation`: "Round pressure that makes future threats harder."

Do not remove global escalation displays; instead keep them visibly separate from scenario loss pressure.
