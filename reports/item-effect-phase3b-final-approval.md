# Phase 3B Final Design Approval

This sheet records the approved Phase 3B rules. Activation costs use only Salvage or Wounds; Heat, Scars, scenario pressure, and undefined instability are excluded.

## Fandiablos

| Option | Exact player-facing rule text | Timing | Activation cost | Success effect | Failure consequence | Exhaust/reset | Required server state | Phone UI | Complexity | Power risk | Recommendation |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| A — Paid Mayhem | “Before drawing threats, before a Grit battle roll, before an eligible Forge or Guile machine test, or before taking a Wound, spend 1 Salvage and exhaust Fandiablos to use the matching Fandiablos ability. After it resolves, roll 1d6. On a 1, suffer 1 Wound.” | Existing four Fandiablos windows | 1 Salvage | Existing matching support ability resolves | On mayhem 1, suffer 1 Wound after the support effect | Once per round; refresh next round | Exact companion instance, chosen mode, Salvage spend, mayhem roll, post-effect Wound | Mode picker; Salvage and 1-in-6 Wound warning; Ready/Exhausted | 4 | 3 | Viable, but mixes a controlled payment with hazardous fallout |
| B — Blooded Flock | “Before drawing threats, before a Grit battle roll, before an eligible Forge or Guile machine test, or before taking a Wound, suffer 1 Wound and exhaust Fandiablos to use the matching Fandiablos ability. The ability resolves without a mayhem roll.” | Existing four Fandiablos windows | 1 Wound | Existing matching support ability resolves | None beyond the explicit activation Wound | Once per round; refresh next round | Exact companion instance, chosen mode, authoritative Wound payment | Mode picker; Wound cost preview; Ready/Exhausted | 3 | 3 | Cleanest hazardous rule, but removes the random “Too Many Dogs” beat |
| C — Too Many Dogs | “Before drawing threats, before a battle or hazard, or before taking a Wound, suffer 1 Wound and exhaust Fandiablos to use the matching Fandiablos ability. You may suffer 1 additional Wound to gain +2 to all five stats for your next two battle or hazard resolutions.” | Existing Fandiablos windows | 1 Wound; optional second Wound | Existing matching support ability; optional two-resolution all-stat boost | None; the second Wound is never automatic | Once per round; refresh next round | Exact companion instance, selected mode, Wound payment choice, two-use temporary modifier | Mode and one/two-Wound choice; remaining boosted resolutions; Ready/Exhausted | 4 | 5 | **Approved** |

Approved: **Option C — Too Many Dogs**. The optional second Wound grants +2 to all five stats for the next two battle-or-hazard resolutions, including a currently pending eligible resolution. Maximum activation cost is 2 Wounds.

## Mirror Reroll Token

| Option | Exact player-facing rule text | Timing | Activation cost | Success effect | Failure consequence | Exhaust/reset | Required server state | Phone UI | Complexity | Power risk | Recommendation |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| A — Bought Second Chance | “Reaction — After you fail a Guile or Signal test, but before failure effects resolve, spend 1 Salvage and exhaust this Artifact to reroll that test. You must accept the second result.” | Failed Guile/Signal reaction before consequences | 1 Salvage | Replace the original roll with one server roll and resolve its result | The second result is mandatory; if it fails, normal failure consequences resolve | Once per round; refresh next round | Persisted failed-test reaction ID, original result, replacement roll, Salvage spend, exact item exhaustion | Original result, cost, mandatory-result warning, reroll result, Ready/Exhausted | 3 | 2 | **Recommended** |
| B — Dearer Certainty | “Reaction — After you fail a Guile or Signal test, but before failure effects resolve, spend 2 Salvage and exhaust this Artifact to reroll that test. You must accept the second result.” | Same failed-test reaction | 2 Salvage | Same authoritative reroll | Mandatory second result; normal consequences on failure | Once per round; refresh next round | Same as A with cost 2 | Same as A with affordability reason | 3 | 1 | Safer balance, but may price the Artifact out of routine use |
| C — Mirror Bites Back | “Reaction — After you fail a Guile or Signal test, but before failure effects resolve, spend 1 Salvage and exhaust this Artifact to reroll that test. You must accept the second result. If the reroll also fails, suffer 1 Wound before resolving its normal failure effects.” | Same failed-test reaction | 1 Salvage | Same authoritative reroll | Second failure adds 1 Wound, then resolves normal failure consequences | Once per round; refresh next round | Same as A plus typed post-reroll Wound | Explicit stacked-risk warning and ordered Wound/failure deltas | 4 | 4 | Strong theme, but double punishment can be excessive |

Approved: **Option A — Bought Second Chance**, costing exactly 1 Salvage. The replacement result is mandatory and determines whether failure consequences resolve.

## Red March Warbell

| Option | Exact player-facing rule text | Timing | Activation cost | Success effect | Failure consequence | Exhaust/reset | Required server state | Phone UI | Complexity | Power risk | Recommendation |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| A — Command Requisition | “Before your battle roll, spend 1 Salvage and exhaust the Red March Warbell to add +2 Grit to that battle.” | Before owner’s battle roll | 1 Salvage | +2 Grit for that battle | None | Once per round; refresh next round | Exact equipped item instance, Salvage spend, battle-scoped modifier | Cost, affordability, +2 preview, Ready/Exhausted | 2 | 2 | **Recommended** for deliberate command utility |
| B — Blood Bell | “Before your battle roll, suffer 1 Wound and exhaust the Red March Warbell to add +2 Grit to that battle.” | Before owner’s battle roll | 1 Wound | +2 Grit for that battle | None beyond activation Wound | Once per round; refresh next round | Exact equipped item, Wound payment, battle modifier | Wound warning, +2 preview, Ready/Exhausted | 2 | 4 | Best if approved as dangerous war magic |
| C — Bell Claims the Fallen | “Before your battle roll, spend 1 Salvage and exhaust the Red March Warbell to add +2 Grit to that battle. If you lose that battle, suffer 1 Wound after normal battle consequences.” | Before owner’s battle roll | 1 Salvage | +2 Grit for that battle | Battle loss adds 1 Wound after normal consequences | Once per round; refresh next round | Exact equipped item, Salvage spend, battle modifier, source-linked post-loss Wound | Cost and loss-risk warning; ordered battle deltas | 3 | 4 | More dramatic, but creates potentially harsh stacked losses |

Approved: **Option A — Command Requisition**, costing exactly 1 Salvage with no Wound, Heat, Scar, or pressure activation cost. Legacy `heatCost` is compatibility-only.

## Approval block

Fandiablos:
- Selected option: Option C — Too Many Dogs
- Final rule text: Before drawing threats, before a battle or hazard, or before taking a Wound, suffer 1 Wound and exhaust Fandiablos to use the matching Fandiablos ability. You may suffer 1 additional Wound to gain +2 to all five stats for your next two battle or hazard resolutions. The second Wound is never automatic. Refresh Fandiablos next round.

Mirror Reroll Token:
- Selected option: Option A — Bought Second Chance
- Final rule text: Reaction — After you fail a Guile or Signal test, but before failure effects resolve, spend 1 Salvage and exhaust this Artifact to reroll that test. You must accept the second result. Resolve only the final result's consequences. Refresh this Artifact next round.

Red March Warbell:
- Selected option: Option A — Command Requisition
- Final rule text: Before your battle roll, spend 1 Salvage and exhaust the Red March Warbell to add +2 Grit to that battle. Refresh this Artifact next round.
