# Rust Choir Peddlers — optional offer design

Status: **recommended, pending user approval**. Content remains unchanged.

## Current content reconstruction

| Field | Current value |
|---|---|
| Stable ID | `rust-choir-peddlers` |
| Display name | Rust Choir Peddlers |
| File | `content/cards/threats/rust-choir-peddlers.json` |
| Category | Enemy Threat; choir family; yellow lane |
| Placement | Outer region, common rarity, push tempo |
| Activation/test | Guile, difficulty 5 |
| Trophy | 4 on defeat |
| Victory branch | `gain_note`: real price list |
| Loss branch | `gain_heat 1` compatibility no-op |
| Persistence | Normal enemy persistence on loss; normal trophy/cleanup on defeat |

The visible text mentions an offer of blessed scrap, but no offer exists in runtime. The final loss clause is a no-op. The “real price list” victory note has no authoritative spend, discount, stock, or equipment benefit. Git history contains no earlier implemented offer.

## Exact preferred future interaction

**Optional post-victory field treatment.**

Player-facing rule:

> **Blessed Scrap — After you defeat the Rust Choir Peddlers, you may pay 1 Salvage to heal 1 Wound. If you decline, cannot pay, or have no Wounds, nothing additional happens.**

Exact behavior:

- Trigger: after final combat victory and trophy award are determined, before the victory effect sequence closes.
- Cost: exactly 1 Salvage.
- Paid benefit: existing typed `heal_wound 1` effect.
- Paid option is legal only when the owner has at least 1 Salvage and at least 1 Wound at final validation.
- Decline is always legal and free, including when affordable.
- With zero Salvage: paid option remains visible but disabled with `Requires 1 Salvage`; decline resolves.
- With zero Wounds: paid option disabled with `No Wounds to heal`; decline resolves.
- Payment and healing commit atomically. If healing cannot resolve, no payment occurs.
- Existing trophy, defeated-enemy cleanup, and price-list note remain unchanged and occur once.
- The defeated card does not remain, so the same encounter cannot be farmed by reopening its decision. A later distinct copy/event creates a new decision ID.
- No stock, Equipment offer, follower, hidden card, discount, transfer, or fictional note-only benefit is introduced.

This replaces the undefined “existing offer” recommendation with the smallest enforceable, thematically plausible typed benefit. It is a design correction requiring explicit approval; repository history alone does not prove it.

## UI and result copy

Phone:

- `Rust Choir Peddlers`
- `Pay 1 Salvage to heal 1 Wound?`
- Private current Salvage and Wounds.
- `Buy blessed scrap — 1 Salvage`
- `Decline`.
- Disabled reasons: `Requires 1 Salvage` or `No Wounds to heal`.

TV waiting state: `[Operative] is considering the Rust Choir Peddlers' offer.` It may show `Heal 1 Wound for 1 Salvage` because the offer is public, but not private resource totals.

Public result:

- Paid: `[Operative] paid 1 Salvage and healed 1 Wound.`
- Declined/unavailable: `[Operative] declined the Peddlers' offer.`

Reconnect restores the same option state and current authoritative affordability. Stale/duplicate intents cannot repeat payment or healing.

## Balance and edge cases

| Measure | Result |
|---|---|
| Current effective severity | 0 extra consequence |
| Proposed severity | 1 optional economic choice |
| Cost/benefit | Pay 1 Salvage; heal 1 Wound |
| Frequency | Common outer yellow enemy; victory only |
| Repeatability | Once per distinct defeated encounter resolution |
| Zero-Salvage behavior | Decline; no benefit and no deduction |
| Co-op | Owner-only treatment; no shared healing |
| Rivalry | Public choice, private totals; cannot target another seat |

Healing is meaningful but bounded by existing Wounds and requires winning the confrontation. It does not create Salvage, so reconnect or repetition cannot farm currency. The offer can be strong early, but costs the same scarce resource used by shops and occurs only after victory. It cannot heal zero Wounds or exceed ordinary wound floor behavior.

## Implementation requirements

- `encounter_payment` in `optional` mode on the post-victory reward sequence.
- Cost 1; paid result `heal_wound 1`; free decline `none`.
- Deterministic prevalidation of both Salvage and Wounds.
- Persisted pending decision and remaining reward continuation.
- Owner-only action and public-safe TV state.
- Tests for zero/exact/excess Salvage, zero/positive Wounds, pay, decline, trophy/note preservation, defeated-card cleanup, repeated distinct encounters, wrong seat, stale/duplicate, reconnect, and atomic no-pay-on-failed-heal.

Implementation readiness: **ready only if this newly specified benefit receives explicit approval and the shared architecture is implemented**. Without approval, keep the card unchanged rather than preserving a note-only offer.
