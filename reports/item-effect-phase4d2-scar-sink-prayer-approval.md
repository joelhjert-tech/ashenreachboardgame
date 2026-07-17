# Scar-Sink Prayer Final Approval

Approval date: 2026-07-12

- Artifact content ID: `artifact-heat-sink-prayer`
- Owned gear compatibility ID: `heat-sink-prayer`
- Player-facing name: **Scar-Sink Prayer**

## Approval block

- Selected option: **Admit the Fear**
- Maximum charges: **2**
- Starting charges: **2**
- Cost per activation: **1 charge**
- Additional cost: **None**
- Recharge: **none**
- Scope: **owner only**
- Activation timing: **after an eligible Scar consequence becomes pending, before it resolves**
- Final rule text:

> Scar-Sink Prayer — Admit the Fear: Reaction — When one of your Scars creates a pending consequence, spend 1 charge to ignore one pending effect from that Scar trigger. The Scar remains, the trigger still counts as having occurred, and all other pending Scar effects resolve normally.

## Authoritative eligibility

The reaction is available only for the owning seat's active, reactable `pendingScarConsequence`. The request must identify the exact owned Artifact instance, reaction ID, Scar instance ID, and one server-provided typed effect ID. Passive, blocked prose-only, resolved, stale, cross-seat, and zero-charge requests are ineligible.

The effect choice is not inferred from prose. An atomic composite typed effect remains one choice. One activation may affect a reaction ID; other Artifact copies cannot stack on that same reaction.

## Resolution and compatibility

The selected effect is omitted, remaining effects resolve in their existing deterministic order, and the queue advances normally. The Scar remains owned and may trigger again. Its source event remains recorded. No Scar is removed, no resolved state is rolled back, and the underlying event is not converted into a success.

The internal ID `heat-sink-prayer` remains for compatibility. It must never appear in player-facing copy. No Heat mechanic or activation cost is introduced.

## Reaction boundaries

- Mirror handles failed-test rerolls before final consequences.
- Choir Static Censer handles recurring Anomaly Challenge failure effects.
- Blackstar handles its approved movement/hazard failure window.
- Scar-Sink Prayer handles only `pendingScarConsequence`.

Their reaction identifiers and source states are not interchangeable.
