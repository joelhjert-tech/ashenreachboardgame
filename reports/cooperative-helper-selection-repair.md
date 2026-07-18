# Cooperative Helper Selection Repair

The phone now stages assistance instead of showing all teammates immediately:

1. `Ask for Help` opens the owner-private selector.
2. The active player chooses one or two eligible seats.
3. The server receives stable seat IDs only; contribution values remain server-owned.
4. Only selected seats receive Accept/Decline.
5. An ordinary test may lock with zero accepted helpers after declines. A scenario test with `requiresHelper` still rejects zero.

Cancel clears the local selection and returns to the initial choice. Existing stale, wrong-seat, duplicate, third-helper, reconnect, and private-projection guards remain intact.

Screenshots include `reports/ui/broken-concordance/phone/active-helper-selector-390x844.png`, requested helper states, one/two accepted states, and public-safe TV states.
