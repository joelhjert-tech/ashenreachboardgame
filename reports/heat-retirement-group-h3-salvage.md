# Heat Retirement Group H3 — Floor-Zero Salvage Pressure

Status: implemented on `phase/heat-retirement-1x` after the H2 checkpoint `f17cbbb`.

## Implemented stable IDs

- `crown-bell-baron`
- `pale-contract-collector`
- `soot-stained-cutpurse`

Each Yellow enemy keeps its stable ID, enemy role, lane, stat, difficulty, severity, region, rarity, graph membership, artwork reference, trophy value, defeat reward, and lore identity. Only the obsolete combat-loss Heat consequence was replaced. The final rule text is: “If you lose, lose up to 1 Salvage.”

## Authoritative replacement

All three cards now author the existing typed consequence `{ type: "lose_salvage", amount: 1 }`. They reuse the B2A floor-zero resolver already used by `glass-tick-cloud` and `locked-vault`; no card-specific resolver was added.

```ts
requestedLoss = 1
actualLoss = Math.min(Math.max(0, currentSalvage), requestedLoss)
resultingSalvage = Math.max(0, currentSalvage) - actualLoss
```

The server derives the source stable ID and resolution-backed source event. A client-supplied amount is ignored in favor of the authoritative pending effect. Wrong-seat and stale-source actions are rejected. The resolved source event is recorded once, so duplicate delivery, reducer replay, and reconnect cannot apply the loss twice.

## Automatic loss boundary

This is an automatic owner-scoped consequence, not a payment, spend, choice, purchase, sale, reward, trade, or completed-mission exchange.

- `3 -> 2`: requested 1, actual 1.
- `1 -> 0`: requested 1, actual 1.
- `0 -> 0`: requested 1, actual 0, “No Salvage to lose.”

Zero Salvage never blocks Threat completion and creates no substitute Wound, Scar, movement, Equipment, modifier, or escalation consequence.

## Economy and progression isolation

Focused tests equip Salvage Ledger and preserve its exact held state across all three starting balances. The loss emits no shop, purchase, sale, transaction, mission, encounter-payment, or `COMPLETE_CONTRACT` event. It does not mutate shop stock, an active Contract, `completedContracts`, scenario progress, relic-trade state, item values, prices, rewards, or trophy definitions. Duplicate Ledgers cannot amplify a direct character-resource decrement because the shop-sale lifecycle is never entered.

## Projection and reconnect

The existing phone and TV consequence projection exposes the server-authored requested loss, actual loss, resulting total, and source stable ID. Public feedback is concise and contains no Heat, Risk, payment controls, shop transaction language, or client-authored totals. Pending consequences survive schema-backed reconnect, and completed consequences reconnect with `pendingEffect` cleared and the committed balance intact.

## Coverage and risk

`src/game/engine/__tests__/heatRetirementH3Salvage.test.ts` covers exact content and wording; identity, rewards, art, graph counts 1/2/2, and totals 26/35/48/109; all three balance cases; authority and idempotency; economy isolation; reconnect; projections; and unchanged B2A, H1, H2, Glass-Chime, Spindle, and blocked definitions.

The economy impact is real but bounded: Baron has one graph reference, Collector two, and Cutpurse two. Floor zero prevents debt or substitute punishment. The four-reference `marrow-tax-auditors` candidate remains blocked pending post-H3 economy evidence. H3 does not authorize reward, price, sell-value, starting-Salvage, or deck-frequency rebalancing.
