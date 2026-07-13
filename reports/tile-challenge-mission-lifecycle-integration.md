# Tile Challenge Mission Lifecycle Integration

## Integration flow

Persistent tile challenges now emit one typed `tile-challenge-resolved` objective trigger after their authoritative success or failure effect has resolved. The trigger records only the challenge ID, sector ID, challenge type, source tags, tested stat, and success result. The active contract matcher may require any narrow combination of those authored facts.

`Tile challenge resolution → contract objective progress → action-phase completion check → COMPLETE_CONTRACT`

The action-phase completion check deliberately waits until the challenge/sector resolution has finished. It then dispatches the existing `COMPLETE_CONTRACT` action. This avoids interrupting challenge ordering or Threat resolution and preserves the canonical completion transaction.

## Completion boundary

Tile-challenge code does not grant rewards, append `completedContracts`, clear the active contract, expose a replacement mission, or change relic-trade progress. The unchanged `COMPLETE_CONTRACT` reducer remains solely responsible for validating completion, applying the reward once, recording the contract ID once, clearing the active slot, and publishing the completion resolution.

## Objective matcher

The narrow `tileChallengeResolved` contract objective supports authored challenge ID, sector ID, hazard/anomaly type, tag, optional success requirement, and a positive target count. It does not alias `spaceTextResolved`; therefore ordinary tile challenges cannot accidentally advance existing sector-text contracts.

Content validation rejects missing challenge IDs, invalid sectors, challenge/sector mismatches, unsupported tags, and matcher combinations with no reachable persistent challenge.

## Verified contract flow

The focused lifecycle test uses a success-required Rift Whispers contract with a Salvage reward. It verifies objective progress, one canonical `COMPLETE_CONTRACT` event, one reward, one ledger entry, active-slot clearing, matching phone/TV public completion state, immediate acceptance of a second mission, recurring challenge persistence, and no duplicate first-mission reward or ledger entry on revisit.

Matcher tests cover success-required failure, resolution-only success/failure, wrong challenge ID, wrong sector, wrong challenge type, and wrong tag.

## Projection behavior

No new projection fields or UI were added. The phone continues to receive its owning active contract card, public completed-contract count, authoritative result, reward delta, and available contract catalog through existing projections. TV continues to receive public active-contract state and completion resolution only.

## Duplicate protection

After completion the first contract is no longer active, and `COMPLETE_CONTRACT` also deduplicates its ledger ID. A recurring challenge remains on its sector and may affect a later independently matching active contract, but it cannot replay the completed contract transaction.

## Remaining content opportunities

No existing contract was converted automatically. Future contracts may opt into `tileChallengeResolved` only after their challenge placement and matcher are authored and validated.

## Browser QA recommendation

Run a fresh TV/phone fixture with an authored Rift Whispers contract: accept it, resolve Rift Whispers, acknowledge the challenge and contract result, confirm the reward and completed-contract count on phone, confirm the active mission disappears on TV, accept a second mission, revisit Ashen Chapel, and verify the first reward does not repeat.
