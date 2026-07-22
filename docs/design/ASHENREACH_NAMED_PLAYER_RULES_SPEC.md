# Ashen Reach Named Player Rules

## Authority and normalization

Named-player behavior is resolved only by the server through `namedPlayerRules.ts`. A value is treated as empty when missing, trimmed, normalized with Unicode NFKC, and lowercased before an exact comparison. Substrings never match. The current seat model has one canonical `displayName` and no separate nickname field; the resolver accepts an optional nickname so a future authoritative identity field can be added without duplicating rules. If both fields exist later, they are matched independently and their rules combine once.

Canonical content dependencies are `char_popelord`, `char_master_alpha`, and `fandiablos`. A room containing a matching player fails clearly if its required canonical definition is unavailable.

## CW

An operative whose normalized identity is exactly `cw` adds `Marked adversary +1` to opposition in an Enemy Threat battle. A fixed Challenge, Hazard, or Anomaly receives the same modifier only when its canonical source tags explicitly include `enemy`. Environmental tests, movement, shops, rewards, encounter selection, scenario-wide difficulty, and other players are unchanged. The modifier is carried as an opposition source and never creates an extra die.

## Kebab

An operative whose normalized identity is exactly `kebab` may select only Popelord. Popelord is reserved for the earliest occupied matching seat in canonical seat order. A prior non-Kebab Popelord selection is cleared and that player returns to operative selection. A second matching seat cannot receive a duplicate character; setup is blocked with `Only one Popelord is available. Change one player name before starting.`

The server validates selection, replacement, Ready, Start, late join, restoration, and reconnect. A future authoritative rename command must call the same reconciler. P17 does not add a rename command.

## Annette and Nenne

Each exact `annette` or `nenne` identity owns exactly one Fandiablos regardless of character. The identity copy uses the deterministic instance identity `named-player:<seatId>:fandiablos`. Bound status is derived from the current canonical identity and is not new save metadata.

While required, removal, discard, transfer, loss, consumption, and sale must reject before any compensation or effect. The owner sees `BOUND — Granted by player identity`; normal public inventory privacy remains unchanged. When both names are present, each receives one narrowly exempt bound copy despite ordinary global Fandiablos uniqueness. Ordinary acquisition remains globally unique. Followers have no separate capacity limit, so no capacity rule changes are made.

## Joel

An exact `joel` identity receives owner-private eligibility for MASTER ALPHA. Other phones do not receive the QA operative as a selectable option, and the server rejects forged selection. Once selected, MASTER ALPHA is public like any confirmed operative.

> Security limitation: QA-character access is intentionally player-name based and is not authentication. Any untrusted player can enter Joel. Replace this isolated rule with an authenticated developer entitlement before public deployment.

## Persistence, reconnect, and privacy

Save version remains 2. Load reconciliation validates forced and restricted selections and restores missing required Fandiablos instances without recalculating completed encounters. Reconnect projects current state without replaying grants. Internal rule keys are server/admin diagnostics only. Waiting phones and TV never receive owner-only QA eligibility or private inventory.
