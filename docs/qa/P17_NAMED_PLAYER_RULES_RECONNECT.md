# P17 Reconnect and Save Review

- Reconnect identity continues to use the seat token rather than a player name.
- A restored room resolves the current display name through the same centralized profile.
- Required Fandiablos ownership is repaired only when absent and deduplicated to one per qualifying owner.
- Restoration does not replay acquisition animation or recalculate completed CW encounters.
- Valid Popelord and MASTER ALPHA selections survive restoration; invalid selections are returned to operative selection.
- Save version remains 2 and named-rule status is derived rather than stored as a parallel permission record.

Focused restoration tests construct a new room server from a cloned snapshot and verify stable required-Follower identity and owner projection.
