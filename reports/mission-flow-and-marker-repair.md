# Mission Flow and Marker Repair

## Marker identity

Mission destinations now use the canonical six-seat palette plus seat number, display-name initial, and a stable border/pattern. Same-tile markers remain separately keyed and sorted by seat order. The TV tooltip no longer contains mission titles or objectives.

## Replacement lifecycle

Mission replacement is no longer inferred from the complete client catalog. `pendingMissionSelection` is nullable and optional in save-version-2 state for legacy compatibility. It contains a stable ID, owner, completed mission, deterministic option IDs, status, continuation phase, and creation time.

After archive and reward, the authoritative Contract result finishes. The server then opens the private picker, blocks automatic continuation, and offers up to three missions excluding every completed mission and every currently owned mission. The dedicated selection intent validates owner, selection ID, offered stable ID, and current availability. Empty pools emit an unavailable event and do not recycle missions.

The owner phone moves to Missions automatically. TV receives only `Mission complete — waiting for <player>`; it never receives option IDs.

Append-only records: `REPLACEMENT_MISSION_OFFERED`, `REPLACEMENT_MISSION_SELECTED`, `REPLACEMENT_MISSION_UNAVAILABLE`.
