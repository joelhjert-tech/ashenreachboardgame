# P14 Progression and Endgame Privacy

## Projection boundary

The public TV projection contains only:

- public Mission identity and result reason;
- public progress and pressure totals;
- public final-stage objective;
- public winner display names where canonical;
- public operative display names;
- canonical post-game command availability.

It does not contain private Agenda text, targets, option IDs, points, private
mission details, hidden outcomes, or source/victory-condition identifiers.

Each phone receives the public result plus its own `ownerPrivateResult`, derived
from the existing private Rivalry projection. A phone cannot receive another
seat's private result.

## QA evidence

- TV serialized match progress was checked for Agenda/target/source leakage.
- The second player's Rivalry result screen was inspected: it shows the shared
  public winner plus only that phone owner's protected Agenda conclusion.
- Automated waiting-phone checks reject another player's name tied to private
  Agenda wording and raw seat identifiers.
- Host screenshots contain no private points, targets, or Agenda identities.
- Browser console and overflow checks completed with zero errors.

## Unsupported private calculations

The server has no canonical aggregate Rivalry ranking/tie calculation. P14 does
not compare private points on clients, reveal a leaderboard, or silently select
a winner from private presentation data.
