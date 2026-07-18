# Oathchain Lens — Trace the Promise implementation

## Implemented rule

Oathchain Lens is a two-charge, no-recharge, exact-instance Artifact. During the owner's action phase, its server-issued prompt identifies the active Contract and current objective revision. Confirmation spends one charge and stores a private reading until turn end or Contract change.

## Derived target descriptors

- `defeatCount`: currently face-up Threats only, with their public sector and objective progress.
- `spaceTextResolved`: sectors whose authored text effect key exactly matches the objective.
- ordered `multiStopRoute`: the next incomplete authored stop only.
- unordered `multiStopRoute`: every remaining incomplete authored stop.
- `shopTransaction`: currently authored shop-capable sectors matching required sector/type and the required action/progress.
- `tileChallengeResolved`: authored recurring challenges matching the approved challenge ID, sector, type, and tag fields.

Hidden deck order, future draws, unrevealed shop stock, Rivalry Agendas, and other players' private state are never inputs.

## Atomicity, expiry, and reconnect

The confirm intent carries only the exact item instance and server-issued Contract signature. The server re-derives targets and rejects stale signatures, wrong timing, missing Contracts, depleted instances, duplicate readings, and empty target sets before spending. The reducer spends one exact-instance charge and stores the private reveal in the same accepted action. Reconnect reconstructs both. Turn completion and Contract acceptance/completion clear the stored reading; projection also refuses stale signatures.

Duplicate copies retain independent charges, but an existing reading blocks a second activation for the same Contract revision and turn.

## Presentation

The phone inventory shows the charged rule, `Trace the Promise`, and a `Private Lens Reading` with Contract name, progress, targets, and `Until end of turn`. TV displays only the generic public outcome. No new TV focus mode is introduced.

## Mission lifecycle boundary

The implementation reads Contract state only. It does not call objective progress handlers, `COMPLETE_CONTRACT`, reward resolution, completed-contract ledger mutation, relic trade, route legality, shop execution, or battle actions.

## Tests

Focused tests cover catalog metadata, all five objective descriptor forms, exact charge spending, stale/duplicate rejection, reconnect persistence, owner-only projection, generic TV output, and unchanged mission progress/ledger state. Existing engine, client, mission, charged Artifact, and content suites provide regression coverage.

## Deferred charged Artifacts

Route Star and Rift Anchor Spike remain deferred. Rift Anchor Spike remains last because of its movement-state and migration risk.
