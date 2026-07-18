# Card Category Implementation

## Outcome

The missing-category problem was a projection and presentation defect, not an absent-content problem. Canonical Anomaly and Escalation cards were already selected server-side from separate sector pools, resolved through typed effects, consumed once, and saved. Their stable identity was discarded before `activeResolution`; Threat `resolutionType` was also discarded; the host then inferred Battle whenever a convenience enemy-name field existed.

This pass preserves all authored mechanics, counts, pools, lane distribution, probability, topology, save version, and legacy parsing while carrying category identity and source authority into public/private projections.

## Runtime changes

- Added one canonical Threat presentation-category helper, separate from the existing battle/test mechanic discriminant.
- Threat summaries now retain Event, Encounter, Asset, Enemy, and Hazard identity.
- Sector Anomaly, Artifact, Contract, and Escalation draws now retain stable card ID, title, flavour, art family, source deck, sector, event identity, queue position, and privacy.
- Active resolutions now support `escalation` as a current source and optional authoritative origin metadata.
- Owner-private Contract leads are redacted to a generic public card on TV and other phones.
- Mixed engagement queues reject unsupported categories instead of silently sorting them first.
- Content validation proves all Threat, Anomaly, and Escalation cards are reachable through a canonical sector deck or recurring tile challenge.

## Presentation changes

- TV labels and frame silhouettes now distinguish Battle, Hazard, Anomaly, Escalation, Event, Encounter, Asset Find, and Tile Challenge.
- Non-opposed TV checks say TEST / CHECK PASSED or CHECK FAILED instead of VS / “opponent wins.”
- Phone guidance follows the owning active resolution to the Encounter/Battle command surface.
- Phone cards show authored category, art, test, target, concise lore, and consequence without the duplicated current-prompt panel.
- Non-opposed phone checks use Die / Modifier / Total / Target language rather than Attack, Defense, or A/D combat output.

## Lifecycle and cleanup

- Enemies retain battle, reactions, Trophy eligibility, reward-once, and authored persistence.
- Hazards and the three authored Event/Encounter/Asset groups retain their existing tested-Threat lifecycle and never become Trophies.
- Anomaly and Escalation cards remain in their separate sector pools and are removed only through the existing consumed-deck-card action.
- The recurring tile challenge stays sector-attached and is not converted into a one-shot Threat.
- Player-owned and scenario-controlled cards remain outside ordinary Threat decks.
- Reconnect restores the serialized active resolution and origin; it does not redraw, reroll, or replay rewards.

## Visual review corrections

The first 390×844 capture exposed two concrete defects: non-Enemy resolutions stayed on Action behind “Resolve battle first,” and their dice were still labelled Attack/Defense. The corrective pass made guidance category-aware, removed the duplicated current prompt, introduced neutral check dice, separated category tags, and renamed the host’s non-opposed comparison from VS to TEST.

## Four critique seats

- New player: category and required test are now the first readable labels; the next action is Continue.
- Optimizer: mechanics, target, modifiers, result, and source identity remain visible without losing exact server totals.
- Family/casual: one shared layout remains, but non-combat categories no longer require learning combat vocabulary.
- Rules lawyer: the presentation category never changes `cardType`; Trophy eligibility, queue order, ownership, privacy, cleanup, and replay identity remain authoritative.

## Deferred decisions

- There is no standalone canonical Choice-card family. Existing choices remain within typed Contract, board, reaction, and Artifact flows. A new schema would be speculative.
- The 17 Character records have strong mechanics and art identity but no dedicated concise lore field. Adding 17 biographies is a larger authored-content decision, recorded in the lore audit rather than invented here.
- Six records have terse lore and are marked partial. No mechanic/lore contradiction was found.
- Scenario-specific screenshots reuse the existing setup-flow QA archive; scenario mechanics were not changed.

No Heat mechanic or metadata was restored. Save version remains 2 and v0–v2 compatibility remains unchanged.
