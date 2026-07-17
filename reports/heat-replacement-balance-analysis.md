# Heat Replacement Balance Analysis

Date: 2026-07-12
All values are proposed, not implemented.

## Severity comparison

| Legacy mechanic | Current effective severity | Proposed replacement | Proposed severity | Frequency | Reversibility | Cooperative impact | Rivalry impact |
|---|---|---|---|---|---|---|---|
| Fuse `heatCost: 1` | Zero; not validated or paid | Remove cost; retain discard and +1 escalation | No change to enforced behavior | Once per copy | Item is lost; escalation persists | Existing shared escalation remains | No new private currency |
| `risk-action cost.heat: 1` | Zero; not validated or paid | 1 Salvage before four-card reveal | Small economic cost | Once per service use | Salvage can be reacquired | Reduces team shopping flexibility slightly | Prevents free repeated fishing equally |
| `buy-boon heatDelta: -1` | False reward; no state mutation | Withdraw service pending typed boon design | Removes misleading purchase | Shop visit | N/A | Avoids wasting shared tempo/currency | Avoids bait purchase |
| Cross-seat nemesis Heat reduction | Usually zero; only legacy nonzero saves benefit | Remove reduction; retain 2 trophies | Tiny old-save reward decrease | Rare | Trophies remain | No change in fresh games | Removes legacy-state asymmetry |
| 39 no-op clauses beside active effects | Zero additional severity | Delete no-op clause | No intended change | Card dependent | Existing active effect rules | None if wording is accurate | None |
| 50 Heat-only outcomes | Zero today | Individual typed outcomes or retirement | Potential increase or decrease | Often common | Varies | High if converted to pressure/Wounds | High if private penalties alter tempo |

## Black Route Fuse

The item already pays three costs: acquisition price 3, discard, and +1 global escalation. Adding a Wound would sharply increase defeat pressure; adding Salvage at use time creates double payment. Removing the display-only Heat metadata is balance-neutral relative to actual play. The post-migration item becomes easier to understand, not stronger in the engine.

## Shop economy

Standard `buy-gear` reveals three options without a reveal fee. `risk-action` reveals four relic-dealer options, so a proposed 1-Salvage fee prices selection quality without pricing the actual acquired card twice. Required safeguards:

- validate and deduct before reveal atomically;
- reject at 0 Salvage without changing stock or sequence;
- one confirmed request creates one reveal;
- reconnect preserves the paid reveal;
- repeated uses require repeated payment;
- purchase price remains separate.

The fee is a mild economy tightening compared with current free use. In rivalry, it prevents repeated free stock fishing; in co-op, it creates a transparent opportunity cost rather than shared injury.

`buy-boon` currently charges 2 Salvage for a note plus a false delta. Withdrawing it is preferable to inventing a benefit in a Heat-retirement pass. A future boon should be designed against treatment, supplies, and Artifact reactions to avoid duplication.

## Legacy content difficulty

- Deleting Heat from the 39 entries with another active effect should preserve runtime severity, although authored expectations may make some cards feel lighter.
- Replacing any of the 50 Heat-only outcomes with 1 Wound is a direct difficulty increase from zero to recall pressure.
- Replacing the three table-wide Heat penalties with Loss Pressure changes them from ineffective personal bookkeeping to shared defeat advancement; values must be tested per scenario.
- Replacing `lose_heat` contract rewards with Scar removal would be a major reward increase and undermine Scar persistence.
- Removing Heat-only reward clauses without compensation leaves 16 rewards/recoveries underpowered or empty.

## Recommended numerical defaults for later approvals

These are starting points, not blanket conversions:

| Context | Proposed starting value | Guardrail |
|---|---:|---|
| `risk-action` reveal fee | 1 Salvage | Pay before reveal; no refund after valid reveal |
| Bodily Heat-only threat penalty | 1 Wound | Only when fiction and existing frequency support injury |
| Economic Heat-only penalty | Lose 1 Salvage | Never clamp silently if payment is mandatory; define alternative failure |
| Table-wide escalation card | +1 Loss Pressure or scenario-specific +1 | Only after scenario simulations; never both by default |
| Contract reward replacing `lose_heat` | 1 Salvage or authored typed reward | Match objective tier; no automatic Scar removal |

## Mode impacts

**Single-player:** removal of fake costs improves predictability. A 1-Salvage relic search is meaningful but recoverable.

**Cooperative:** avoid replacing personal Heat with Loss Pressure except on explicitly table-wide escalation cards. Otherwise one player's card becomes everyone’s defeat cost.

**Rivalry:** exact visible costs prevent hidden old-save advantages. Replacement outcomes must remain owner-private when they concern inventory or Scar identity.

**Old saves:** nonzero Heat loses its rare reduction benefit after migration but is not converted into punishment or currency. This is the least exploitable policy. Old saves must not spend stored Heat on migrated services.

## Four-seat critique

- **New Player:** actual words—Discard, Escalation, Salvage—appear at the choice. No hidden meter remains.
- **Optimizer:** atomic Salvage payment closes free relic-stock fishing; old Heat cannot buy anything.
- **Family Player:** removing Risk reduces bookkeeping. Wounds and Scars are not introduced as routine prices.
- **Rules Lawyer:** every future cost must be payable before effect resolution; an unpaid cost rejects the action; costs are not preventable unless a rule explicitly targets costs.
