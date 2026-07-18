# Canonical Economy Integration

## Result

The canonical economy was integrated on `qa/canonical-economy-calibration` from the clean approved follower-system checkpoint `f000a3c`.

- Integration commit: `485f619 merge: integrate canonical economy`
- Source tip: `d6faf31 feat/canonical-economy`
- Integrated commits: `221ebb4`, `e763a5b`, `efe3a1c`, `d6faf31`
- Conflicts: none
- Save version: 2
- Balance values changed during calibration: none

The older checked-out `ui/tv-movement-focus-mode` line was not used as the integration base. A read-only merge preview showed that it diverged before the follower and economy work and would have introduced 19 dual-edit and 181 remove/modify conflicts. Existing worktrees and unrelated UI work were left untouched.

## Canonical Boundary Confirmed

- Salvage is the only ordinary spendable currency.
- Trophies fund permanent operative stat advancement.
- Completed Contracts fund the rare Artifact exchange.
- Exactly three stored completed Contract IDs are required.
- The server generates up to two owner-private Artifact options.
- The three Contracts remain owned until a valid Artifact is confirmed.
- Active Contracts and progress counters cannot satisfy the exchange.
- Artifacts are excluded from normal shops, fallback starting loadouts, and sale transactions.
- Phone projections contain the private Artifact options; TV and other-phone projections do not.

## Cross-System Regression

| Boundary | Integration finding |
|---|---|
| Follower acquisition | Existing authoritative acquisition and owner-private notes remained unchanged. |
| Threat rewards | Trophy and typed Salvage rewards still resolve through their existing source events. |
| Board, anomalies, challenges | Existing typed Salvage gain/loss semantics remained unchanged. |
| Contracts | `COMPLETE_CONTRACT` remains the sole reward/archive transition; completed IDs are the exchange ledger. |
| Shops and services | Stock, affordability, exact-instance purchase/sale, and stale-request checks remain server-authoritative. |
| Equipment and Artifacts | Normal Equipment remains shop-eligible; Artifacts remain progression-only and non-sellable. |
| Salvage Ledger | The item has no economy-event hook; its canonical passive shop modifier cannot mint currency or react to losses, sales, rewards, exchange, reconnect, or rejection. |
| Trophy advancement | Only Trophy value is consumed; capped, invalid, unsafe, and underfunded requests are rejected. |
| Recall/restart/reconnect | Authoritative balances and ledgers persist without setup or reconnect duplication. |
| Rivalry privacy | Private objectives and Artifact options remain absent from public projections. |
| Heat compatibility | No Heat mechanic, metadata, or compatibility policy changed. |

## Integration Verification

- All four source commits are ancestors of the calibration branch.
- Content validation: passed.
- Typecheck: passed.
- Focused economy/shop/Contract/UI tests: 328 passed.
- Engine/rules: 719 passed.
- Integration: 243 passed; reconnect-flapping passed without retry.
- Client: 274 passed.
- Aggregate: 1,236 passed.
- Asset audit: 418/418 present.
- Production build: passed.
- Browser economy QA: six captures, no console errors, no phone horizontal overflow, no private TV leakage.

No functional conflict fix was required after integration.
