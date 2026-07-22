# P7 Inventory and Player-Card Screenshot Index

Root: `docs/qa/p7-inventory-player-card/`

The final capture contains 62 screenshots plus one phone recording. Every screenshot was captured from the real server, WebSocket projections, normal phone/TV components, and an environment-gated deterministic fixture.

## Phone — 390×844 and 360×800

Each state has matching `-390x844.png` and `-360x800.png` files under `phone/`.

| State | Fixture purpose |
|---|---|
| `basic-player-card` | identity, essential state, all stats |
| `relevant-battle-stat` | focused battle takeover and authoritative tested skill |
| `relevant-movement-stat` | movement context without fabricated skill relevance |
| `wounds-and-scars` | near-threshold Wounds and multiple Scars |
| `equipped-summary` | equipped object summary on player card |
| `contextual-relevant-now` | battle-owned contextual surface |
| `no-relevant-objects` | authoritative empty relevance result |
| `equipped-equipment` | explicit equipped state |
| `carried-equipment` | carried, available equip controls |
| `consumable-item` | consumable mechanics and legal use state |
| `charged-item` | current/max charges |
| `exhausted-item` | exhausted state and reset reason |
| `wrong-timing-item` | authoritative timing lock reason |
| `passive-artifact` | passive Artifact/Relic presentation |
| `active-artifact` | charged active Artifact/Relic presentation |
| `empty-inventory` | empty collection behavior |
| `many-owned-objects` | large collection behavior |
| `long-rules-and-lore` | wrapping and normal page flow |
| `missing-art` | canonical fallback art |
| `relevant-now-one` | one relevant object context |
| `relevant-now-many` | multiple relevant objects context |
| `use-result` | settled authoritative result |
| `reconnect-after-use` | restored ownership and use state |
| `return-to-required-action` | P1 return control above inventory |
| `reduced-motion-inspection` | complete information with reduced motion |

## Waiting phone

- `waiting-phone/own-inventory-during-wait-390x844.png`
- `waiting-phone/own-inventory-during-wait-360x800.png`

The waiting seat sees the acting-player status and only its own inventory values. It receives no acting-player card controls or relevance details.

## Host TV — 1920×1080 and 1366×768

Each state has both requested viewport variants under `tv/`:

- `private-inventory-hidden`
- `reduced-motion-summary`
- `missing-art-fallback`
- `public-wounds-and-scars`
- `public-operative-summary`

The TV captures preserve the public board/operative summary and do not display phone `objectUseStates`, private charges, private Salvage controls, or private relevance reasons.

## Recording

- `recordings/player-card-inventory-relevance.webm`

## Automated review

- Screenshot count: 62
- Horizontal overflow: 0px in every capture
- Browser/page errors: 0
- Reduced-motion captures: complete
- First-pass correction: deterministic tab timing, Relevant Now ordering, duplicate Return removal, and contextual copy height
- Machine-readable capture evidence: `capture-index.json`
