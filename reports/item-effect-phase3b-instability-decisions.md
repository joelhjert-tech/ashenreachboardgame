# Item Effect Phase 3B: Instability Decisions

No option in this document is implemented. Heat is deprecated and is not proposed as a new player-facing mechanic.

## Fandiablos — Too Many Dogs

### Option A — Scenario pressure (recommended)

- Rule: “After using Fandiablos, roll 1d6. On a 1, advance scenario pressure by 1. Fandiablos still resolves.”
- State/schema: typed `advanceScenarioPressure` exhaust consequence and existing scenario-pressure authority.
- Risk: Medium; visible shared cost can make support politically expensive.
- UI: show the mayhem roll and public pressure delta after resolution.

### Option B — Self-wound

- Rule: “After using Fandiablos, roll 1d6. On a 1, suffer 1 Wound after their effect resolves.”
- State/schema: typed post-resolution `take_wound` consequence.
- Risk: High; can make a whimsical companion disproportionately lethal.
- UI: private warning before use and normal wound delta afterward.

### Option C — Log-only mayhem

- Rule: “After using Fandiablos, roll 1d6. On a 1, record a Too Many Dogs mayhem note. It has no additional mechanical effect.”
- State/schema: typed/logged flavor result only.
- Risk: Low, but provides no balancing cost.
- UI: concise private/public flavor feedback.

## Mirror Reroll Token

### Option A — Forced second result (recommended)

- Rule: “After failing a Guile or Signal test, exhaust this Artifact to reroll. You must keep the new result.”
- State/schema: persisted failed-test reaction ID, replacement roll, and round/turn exhaust state; no extra instability resource.
- Risk: Low; the forced result is the meaningful risk.
- UI: show original and replacement roll and “must keep” before confirmation.

### Option B — Scenario pressure on a second failure

- Rule: “After failing a Guile or Signal test, exhaust this Artifact to reroll and keep the new result. If the reroll also fails, advance scenario pressure by 1.”
- State/schema: failed-test reaction, replacement roll, typed pressure consequence.
- Risk: Medium to High in pressure-sensitive scenarios.
- UI: explicit pressure warning and reroll outcome delta.

### Option C — Scar on matching dice

- Rule: “After failing a Guile or Signal test, exhaust this Artifact to reroll and keep the new result. If the reroll shows matching dice, gain a Scar after resolution.”
- State/schema: replacement roll plus typed post-roll Scar trigger.
- Risk: High and swingy.
- UI: preview the matching-dice risk and show the awarded Scar privately.

## Red March Warbell

### Option A — Acquisition wound, free activations (recommended)

- Rule: “When acquired, suffer 1 Wound. Before a battle roll, exhaust the Warbell to add +2 Grit for that battle. Refresh it at the start of your next turn.”
- State/schema: acquisition `take_wound`; turn-reset exhaust modifier. Legacy `heatCost` remains ignored compatibility metadata pending removal.
- Risk: Medium; one clear upfront curse buys repeatable strength.
- UI: acquisition warning and Ready/Exhausted battle card.

### Option B — Salvage activation cost

- Rule: “Before a battle roll, spend 1 Salvage and exhaust the Warbell to add +2 Grit for that battle. Refresh it at the start of your next turn.”
- State/schema: authoritative Salvage spend plus turn-reset exhaust modifier; remove the acquisition cost.
- Risk: Low to Medium; predictable economic drain.
- UI: show current Salvage, exact cost, and insufficient-Salvage reason.

### Option C — Pressure on activation

- Rule: “Before a battle roll, exhaust the Warbell to add +2 Grit for that battle, then advance scenario pressure by 1. Refresh it at the start of your next turn.”
- State/schema: battle modifier plus typed pressure consequence.
- Risk: High; shared pressure can discourage use or create rivalry friction.
- UI: public pressure warning and resolution delta.
