# Scar trigger lifecycle audit

Baseline: `67df28e`. Scar-Sink Prayer remains unapproved and unimplemented.

## Catalog classification

| Scar | Typed trigger | Typed effect | Reaction? | Engine support | Migration note |
|---|---|---|---:|---|---|
| Ash-Lanced | `afterTest` | `gain_note` | No | Supported | Source adapter must require first failed Grit test per session |
| Static Burn | `beforeTest` | `gain_note` | Yes | Supported | Source adapter must require first anomaly/Signal check |
| Broken Harness | `onWoundTaken` | `gain_note` | Yes | Supported | Source adapter must distinguish enemy Wounds and first use |
| Bell-Deafened | `beforeTest` | `gain_note` | Yes | Supported | Source adapter must require first Command Threat check |
| Glasslung | `onMovementResolved` | `gain_note` | Yes | Supported | Source adapter must identify inner/anomaly sector |
| Oath-Chain Drag | `onContractResolved` | `advance_escalation` | No | **Blocked** | Contract events do not distinguish abandoned/failed objectives |
| Void-Salt Craving | `onMovementResolved` | `take_wound` | Yes | **Blocked** | Authored timing is before reroll/adjustment, not movement completion |
| Webglass Afterimage | `beforeTest` | `gain_note` | Yes | Supported | Source adapter must enforce first Guile check |
| Red March Tremor | `beforeTest` | `take_wound` | Yes | Supported | Source adapter must identify first combat roll |
| Marrow Debt | `onTrophyGained` | `gain_note` | No | **Blocked** | Existing effect cannot authoritatively reduce the trophy transaction |
| Cinder Nerve | `onWoundTaken` | `gain_note` | Yes | **Blocked** | Requires a pre-hazard-consequence event, not an after-Wound event |
| Relay Ghost | `onTurnStarted` | `gain_note` | No | **Blocked** | Delayed “ignore this round” escalation needs follow-up state |
| Blackstar Shadow | `onScarSuppressed` | `gain_note` | No | **Blocked** | Scar suppression/relief strength is not an engine concept |
| Gate Mark | `onMovementResolved` | `take_wound` | Yes | **Blocked** | Trophy-or-Wound choice is not represented by the single effect |
| Choir Static | `onEscalationAdvanced` | `gain_note` | Yes | **Blocked** | Owner choice plus all-player outcome needs a typed multi-target choice |

## Findings

- All 15 cards previously contained prose-only timing.
- The new catalog supplies explicit timing and effect identity without parsing prose.
- Seven cards have effect shapes the foundation can represent; eight remain deliberately blocked pending narrower event/choice models.
- “Supported” means the trigger/effect/reaction shape is representable. Individual authoritative event adapters must still supply the exact source event and first-use predicates.
- No passive Scar currently needs a prompt.
- No current Scar uses `onScarGained`; the hook exists so threshold acquisition can safely route through the lifecycle without inventing a trigger.

## Validation

Validation now rejects missing or duplicate definitions, missing cards, effect mismatches, passive/reactive mismatches, blocked entries without reasons, and direct self-recursive `gain_scar` effects.

## Migration boundary

The explicit catalog is kept separate from prose to preserve authored display copy. Future content authoring should move typed fields into canonical content only after the format is approved; runtime must never derive them from prose.
