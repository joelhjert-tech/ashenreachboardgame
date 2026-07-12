# Oathchain Lens final approval

## Rejected design

**Price Before Promise** is rejected. Current Contracts do not contain hidden acceptance prices or failure terms, so that design would require inventing a second hidden mission model.

## Final approval block

- Artifact: `artifact-oathchain-lens`
- Owned gear ID: `oathchain-lens`
- Selected option: **Trace the Promise**
- Maximum charges: **2**
- Starting charges: **2**
- Cost per activation: **1 charge**
- Additional cost: **None**
- Recharge: **none**
- Scope: **owner only**
- Activation timing: **during the owner's action phase while they have an active Contract**
- Duration: **until the current turn ends or the active Contract changes**

Final rule text:

> Trace the Promise — During your action phase, spend 1 charge to identify every currently visible sector, Threat, or shop action that can advance your active Contract. If the Contract has an ordered objective, identify its next required target. This effect does not reveal hidden cards or agendas and does not change mission progress, rewards, or legality.

## Information and privacy boundary

The server derives typed descriptors from the owner's ordinary active Contract and already visible state. Supported objective types are `defeatCount`, `spaceTextResolved`, `multiStopRoute`, `shopTransaction`, and `tileChallengeResolved`. No client-selected field list exists.

Solo, co-op, rivalry, and ruthless modes all keep details owner-only. TV receives only `Oathchain Lens consulted`. Rivalry Agenda state, other players' Contracts, hidden decks, and unrevealed stock are excluded.

`COMPLETE_CONTRACT` remains the only completion, reward, ledger, and active-slot transaction.
