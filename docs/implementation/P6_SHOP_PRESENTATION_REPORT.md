# P6 Shop Presentation Report

## Scope and architecture

P6 changes presentation only. Shop entry, stock generation, prices, sell values,
service effects, affordability, capacity, Artifact rules, transaction outcomes,
save data, and replay protection remain owned by the existing server flow.

Before P6, the phone rendered every revealed offer as one long list and inferred
some category presentation from the available controls. The TV received more of
the active buyer's state than it needed, including Salvage. P6 adds a public-safe
`presentation` block to the existing shop encounter projection. It carries the
authoritative stage, category availability, selected category/offer, public
status, allowed command, and privacy classification. It does not create a second
shop state machine.

The existing canonical commands remain unchanged:

- `SHOP_BROWSE_SELECTED`
- `SHOP_SERVICE_REQUESTED`
- `SHOP_PURCHASE_REQUESTED`
- `SHOP_SELL_REQUESTED`
- `SHOP_SKIP_REQUESTED`

The server continues to validate every command. Phone controls lock immediately
after submission but never mutate Salvage, stock, inventory, or transaction
results optimistically.

## Phone shop UX

- The active owner sees the shop identity, category, sector, and their Salvage.
- Category selection uses labelled, original industrial symbols and only the
  categories projected by the server.
- Equipment, supplies, Artifacts, and sell inventory use one focused offer with
  explicit Previous/Next controls. The full stock list no longer competes for
  vertical space.
- Mechanical rules, cost, affordability, and the action precede lore. Lore is
  collapsed by default.
- Buy and Sell appear once for the focused offer. The button includes the offer
  name and locks on submission.
- Services continue through the existing typed service command.
- `Leave Shop` is fixed above the phone navigation and remains reachable without
  traversing back through categories. The global control is now labelled `Leave
  Room`, removing the ambiguous duplicate `Leave` wording.
- Successful transactions announce a compact result immediately below the shop
  identity, including the authoritative Salvage before/after value.
- Reconnect restores the projected shop view and focused offer. A completed
  transaction does not become available again.

## Host and waiting presentation

The existing Requisition Chamber remains the production Host shop. It is a
non-interactive overlay over a dimly visible board and now consumes server-
projected public categories and selected-offer state. The header contains shop
identity, active buyer, and public status. It no longer exposes the buyer's
Salvage or inventory details.

Waiting phones receive the acting player's display name and a concise public
stage. They do not receive stock, sell inventory, private Artifact options,
affordability, balance, or actionable controls. Private Artifact and sell
browsing resolve as `private_resolution` publicly.

## Responsive images, motion, and accessibility

Shop and offer art uses the established bounded `HostImage`/shop media pipeline.
Atmospheric art crops inside an explicit frame; item art is contained. Missing
art retains the canonical fallback. Text labels accompany every symbol, touch
controls retain the shared minimum target size, transaction results use
`aria-live`, and carousel navigation remains keyboard-accessible.

Reduced motion preserves the selected offer, price, state, and result while
removing nonessential transition motion. The production QA pass found no
horizontal overflow or console errors at phone 390x844 and 360x800 or TV
1920x1080 and 1366x768.

## Corrections made after screenshot review

The first render exposed four presentation defects:

1. The duplicate required-action helper consumed phone height during shopping.
2. The category grid remained mounted while browsing an offer.
3. `Leave Shop` was below the visible frame on 360x800.
4. The Host overlay obscured too much of the board.

The corrective pass hides redundant shop guidance, renders category choices only
at the category stage, keeps one compact `Leave Shop` action above navigation,
reduces the Host scrim, and resets the actual phone scroll container before QA
captures. A final pass renamed the unrelated global action to `Leave Room` and
moved the transaction result above stock so the outcome is immediately visible.

## Privacy and authority evidence

- Active owner: canonical offers, prices, affordability, sell eligibility,
  services, and owner Salvage.
- TV/waiting players: shop identity, active buyer, public category/status, and
  only public transaction information.
- TV/waiting players do not receive buyer Salvage or sell inventory.
- Private Artifact choices remain owner-only.
- No UI prints stable card IDs, instance IDs, command names, or validation codes.
- Existing duplicate/stale transaction rejection remains server-owned.

## Four-seat critique

### New player

The current shop, category, focused offer, price, and next action are clear. The
final review caught and removed the ambiguous pair of `Leave` labels.

### Optimizer

Mechanical text, price, affordability, and explicit Previous/Next navigation
support quick comparisons without opening lore. A large stock requires serial
browsing; adding a compact non-authoritative index could be considered later.

### Family/casual player

One offer at a time is calmer than the former long list. Purchase completion and
the Salvage change are visible immediately. Controls remain reachable on the
360x800 target.

### Rules lawyer

The displayed categories, offers, prices, affordability, services, results, and
public/private status come from the authoritative projection. Client navigation
does not execute a transaction, and no client calculation changes game state.

## Files changed by P6

- `src/client/shared/types.ts`
- `src/server/roomServer.ts`
- `src/client/tv/HostShopOverlay.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/shared/explainabilityPrompts.ts`
- `src/client/phone/usefulNowPresentation.ts`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/styles.css`
- `src/server/phaseOneQaFixture.ts`
- focused server/phone/TV shop tests
- `scripts/capture-p6-shop-qa.ts`

## Concrete remaining risks

- Very large stock sets are intentionally browsed one offer at a time; this
  favors legibility over rapid global comparison.
- Some transaction-submitting states are too brief to capture deterministically
  without intercepting a real request. Their immediate lock is covered by tests;
  the QA archive records the completed authoritative result.
- Existing public card IDs remain transport keys for server commands. They are
  not rendered to players; replacing transport identity would be a protocol
  migration outside P6.

## Verification

- Content validation: passed (18 characters, 71 gear, 109 Threats, 36
  Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16
  Escalations, 30 Afflictions).
- Typecheck: passed.
- Focused P6 shop suite: 131/131 passed.
- Engine/rules suite: 763/763 passed.
- Standalone rules suite: 64/64 passed.
- Integration suite: 352/352 passed.
- Client suite: 398/398 passed.
- Aggregate suite: 1,513/1,513 passed in 381.68 seconds.
- Asset audit: 435/435 present; zero missing, invalid, placeholder, or release-
  blocking assets.
- Production build: passed (550 modules).
- Browser QA: 72 screenshots, zero horizontal overflow, zero console/page
  errors, reduced-motion and reconnect states passed.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
- Save format, shop economy, prices, stock, sell values, services, Artifact
  rules, and transaction authority were not changed.
- No commit or push was made.
