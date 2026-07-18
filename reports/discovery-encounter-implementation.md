# Discovery Encounter Implementation

## Lifecycle

1. The canonical deterministic Threat draw reveals one discovery encounter.
2. Its existing typed skill test resolves.
3. Success hydrates one exact canonical `gain_gear` or `gain_follower` effect on the server.
4. Equipment auto-equips into an empty slot or opens an owner-private equip choice. A Follower attaches through the existing authoritative owner lifecycle.
5. The current encounter cannot continue while an equip choice is pending.
6. Completion advances the existing queue once. Reconnect reconstructs the reward/choice and cannot reroll or replay it.

The encounter card remains the encounter; the rewarded Equipment/Follower becomes player-owned state. Discovery is not a shop purchase, does not spend Salvage, does not trigger Artifact access, and does not expose private unselected options because these ten cards use fixed rewards.

## Presentation

Phone and TV projections carry `presentationType` derived from the canonical Threat taxonomy while retaining `cardType` for mechanics. Asset discoveries display as discoveries rather than Enemies. The TV discovery check no longer enters the opposed-battle chamber merely because the shared resolution contains roll math. Player-facing summaries resolve Equipment names rather than raw IDs.

The phone’s battle/test Gear context uses the shared eligibility projection. Valid items are highlighted in their exact timing window; wrong-skill tools are absent from encounter controls and remain disabled in Inventory. Passive contributions still appear automatically through the existing stat breakdown.

## Four critique seats

- **New player:** the Asset label and explicit reward reveal make it clear that a Threat draw can be an opportunity; auto-equip removes routine bookkeeping.
- **Optimizer:** stable source IDs, exact instances, duplicate rejection, pending-choice persistence, and server eligibility close reward replay and wrong-skill exploits.
- **Family/casual:** exact fixed rewards avoid a second selection step for ordinary discoveries; replacement is a two-button owner choice only when necessary.
- **Rules lawyer:** success resolves the discovery card, the item attaches before queue continuation, passive bonuses begin only when equipped, occupied slots never replace silently, and reconnect preserves the exact pending decision.

## Deferred balance evidence

The distribution is structurally calibrated but not a human playtest. Log actual draws per lane, time to first discovery, replacement-prompt frequency, and shop displacement before converting more cards or changing reward rarity.
