# TV Shop Redesign Options

Both prototypes consume the same `HostShopDisplayModel` built from the public authoritative shop projection. They are development-only and never alter stock, affordability, purchases, sales, or privacy.

## Option 1 — Requisition Chamber

Open with `/tv?room=<code>&shopUi=requisition` in development/QA mode.

Full-screen, art-first requisition staging. It is the stronger cinematic treatment and the easiest to read across a room, but intentionally hides most board context.

| Criterion | Score |
|---|---:|
| Immersion | 5 |
| Readability | 5 |
| Board continuity | 2 |
| Card-art visibility | 5 |
| Six-player compatibility | 4 |
| 1366×768 fit | 4 |
| Animation clarity | 4 |
| Implementation complexity | 3 |
| Performance | 4 |
| Reduced motion | 5 |

Screenshots: `reports/live-play-ui-repair-qa/shop-requisition-1920x1080.png`, `shop-requisition-1366x768.png`.

## Option 2 — Board-Integrated Salvage Market

Open with `/tv?room=<code>&shopUi=market` in development/QA mode.

The board remains visible while a dock rises from the active sector. It preserves movement continuity and is quicker for frequent visits, though card art is smaller and the 1366×768 dock is denser.

| Criterion | Score |
|---|---:|
| Immersion | 4 |
| Readability | 4 |
| Board continuity | 5 |
| Card-art visibility | 4 |
| Six-player compatibility | 4 |
| 1366×768 fit | 4 |
| Animation clarity | 4 |
| Implementation complexity | 4 |
| Performance | 5 |
| Reduced motion | 5 |

Screenshots: `reports/live-play-ui-repair-qa/shop-market-1920x1080.png`, `shop-market-1366x768.png`.

## Review correction and recommendation

The first render treated stock reveal as a completed purchase and obscured the stock with a transaction banner. The banner is now limited to actual buy/sell results. Both corrected layouts fit without horizontal overflow.

Requisition is recommended for cinematic priority; Market is recommended for repeated-play continuity. The production shop remains unchanged pending explicit user selection.
