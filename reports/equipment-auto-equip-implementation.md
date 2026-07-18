# Equipment Auto-Equip Implementation

## Authoritative rule

When `gain_gear` resolves, the server creates the exact instance once and inspects its canonical slot.

- Normal non-consumable Equipment auto-equips only when its compatible slot is empty.
- Artifacts and consumables keep their existing lifecycle and do not enter this rule.
- If the slot is occupied, the new item stays carried and an owner-private `pendingGearEquipChoice` is persisted.
- The owner may equip the new item or keep it carried. Equipping changes only the exact slot; the former item remains carried.
- No path silently discards or unequips an item, trusts client stat math, or bypasses inventory identity.
- Duplicate catalog IDs continue to follow the current catalog-ID ownership rule.

The choice records choice ID, owner seat, item catalog and instance IDs, slot, current item catalog and instance IDs, source resolution ID, and creation identity. Wrong owner, stale choice, wrong instance, and invalid slot state are reducer rejections. `CONTINUE_RESOLUTION` is blocked until the choice is resolved. Save version remains 2 because the field is optional and legacy parsing remains unchanged.

## Projection and phone flow

Only the owner receives the choice, with resolved player-facing names. The phone presents:

- `Equip <new item>` — replace the slot while retaining the old item in Inventory.
- `Keep carried` — retain the current equipped item.

An empty slot requires no extra prompt. Passive stat breakdowns update from the exact equipped instance through the existing Equipment helper, so the contribution is neither delayed nor doubled.

## Reconnect and replay

The pending choice is part of canonical session state and survives a v2 snapshot round trip. Completion is append-only in the action log. A repeated or stale completion cannot mutate the slot again, and the reward resolution cannot grant another catalog copy under the current duplicate rule.
