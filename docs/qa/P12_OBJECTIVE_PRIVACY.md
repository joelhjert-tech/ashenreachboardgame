# P12 Objective Privacy Evidence

## Projection contract

| Surface | Allowed | Forbidden |
|---|---|---|
| Owner phone | Shared Mission; own Contract identity/progress/conditions/reward/history/options; own authorized Agenda state | another player's Contract or Agenda |
| Other/waiting phone | Shared Mission; player display name and generic private-objective activity where required | Contract ID/title/progress/reward/destination/options; Agenda objective/target/progress/scoring |
| TV | Shared Mission identity/progress; generic private-objective status and canonical generic public events | all owner choices and private objective detail |

## Server-boundary changes

- Public players always project `activeContract: null`.
- `privateObjectiveStatus` contains only active/not-active and completed count.
- Public setup seats never project the selected starting Mission title.
- Contract progress/completion deltas are owner-private; public text is generic and uses player display name.
- Locked, hidden, and reveal-available Agenda payloads omit `objective` and `scoring` fields.
- Revealed/completed/failed Agenda fields are present only in the owner's private projection.
- Contract outcome origin is tagged owner-private before projection.
- Public map code has no Contract ownership ID from which to reconstruct a private destination.

## Serialized payload tests

Focused tests cover owner, other-phone, TV/public, locked Agenda, revealed Agenda, completion, fixture, reconnect/session projection, BoardMap, and required-action paths. Assertions verify protected fields are absent, not merely visually hidden.

## Browser privacy scan

Every capture scans visible leaf text for raw seat IDs and known internal schema/Contract identifiers. No forbidden identifiers were found. The waiting-phone and TV private-resolution captures show only a display name and generic private Contract status. No private Mission/Contract option, Agenda target, progress, reward, or map destination appears.

## Cached and reconnect behavior

Reload reconstructs the patch from server state. The client does not cache objective detail as authority, infer hidden progress, or reuse a prior Agenda target. A locked Agenda remains locked after reconstruction; a revealed Agenda receives the authorized owner payload only.
