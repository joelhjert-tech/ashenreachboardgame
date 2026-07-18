# Follower Browser QA Review

## Captures reviewed

- `phone-390x844-acquired.png`
- `phone-390x844-used.png`
- `phone-390x844-reconnected.png`
- `tv-1366x768-public-follower.png`

The captures use the environment-gated follower QA fixture and a real host-phone/TV room connection. They are QA evidence only and are not runtime assets.

## Findings and corrective pass

The first phone capture showed the intended follower card with portrait, role, rarity, rule, timing, readiness, and discovery source. The used state clearly changed to `EXHAUSTED`, and reconnect retained both ownership and the exhausted boundary. There was no horizontal overflow, canvas fallback, or private note leakage.

The first TV review found that the follower badge existed only in a larger operative overlay that is not visible during the normal map view. That did not satisfy the public ownership requirement. The corrective pass added a compact, truncated public follower line to the always-visible operative rail while leaving full rules and private notes off the TV. The final TV capture shows `FOLLOWER Lucy, ...` on Bjornis's operative card without changing the map-first layout.

The reconnect capture initially failed because its URL still included the QA script's `resetAuth=1` bootstrap flag. The capture now reconnects through the normal room URL and proves the stored seat token restores the authoritative follower state.

## Remaining limitations

The compact TV rail intentionally truncates long follower names at narrow rail widths. The accessible label retains the full name, and the full public badge remains available in the larger operative overlay. Acquisition choices were not captured because the implemented lifecycle uses automatic fixed or server-random rewards rather than a client-selected follower pool.
