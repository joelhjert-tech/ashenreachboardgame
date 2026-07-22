# Shop UX specification

## Recommended production direction

Use the Requisition Chamber for important/rare shops and a compact board-integrated dock for frequent services only if both are backed by the same `HostShopDisplayModel`. The current rebuilt shop remains authoritative until a deliberate production choice.

## TV

- Full-screen industrial location identity with faint board context.
- One horizontal stock rail; focused item centered with adaptive art, category, price, availability.
- Sold stock remains an empty labelled slot; unrevealed stock says `Browse Equipment`.
- Active buyer and public Salvage transaction remain visible.
- Purchase/sale result appears once at center, then returns to stock.
- Never show private Artifact choices or interaction controls.

## Phone

- Inventory/stock controls remain owner private.
- Affordability and canonical blocked reason appear before confirmation.
- Minimum two purchasable Equipment is an economy rule, not a client fill behavior.

## Motion

Entry 360 ms, stock stagger 60 ms/card, focus 220 ms, transfer 360 ms, reduced-motion fade. No white/blank transition.
