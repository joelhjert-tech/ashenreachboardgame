# Ashenreach UI Review - 2026-07-05

Evidence captured from local dev run at `390x844`, `1920x1080`, and `1366x768`.

## Captured States

1. `01-phone-join-empty.png` - phone join screen
2. `02-phone-join-prefilled.png` - phone join with `?room=`
3. `03-phone-character-selection.png` - character selection
4. `04-phone-ready-waiting.png` - ready/waiting
5. `05-tv-active-1920.png` - TV active game at 1920x1080
6. `06-tv-active-1366.png` - TV active game at 1366x768
7. `07-phone-player-card.png` - phone player card
8. `08-phone-inventory.png` - phone inventory
9. `09-phone-move.png` - phone movement
10. `10-phone-battle.png` - attempted unavailable battle tab
11. `11-phone-shop.png` - attempted unavailable shop tab
12. `12-phone-action.png` - action tab while movement is required
13. `13-phone-quest.png` - phone quest/scenario

All captured states had:

- `canvasCount: 0`
- no console errors
- no horizontal overflow

## Findings

### P1 - TV movement route overlay is too noisy when many destinations are legal

Evidence: `05-tv-active-1920.png`, `06-tv-active-1366.png`

The TV draws route segments for every legal destination. In the captured active movement state, 19 legal destinations produce a web of yellow dashed lines over the board. This makes the board look active, but it is hard to distinguish actionable destination signals from route clutter.

Code reference:

- `src/client/tv/BoardMap.tsx:245-250` builds route segments from every enabled movement destination.
- `src/client/tv/BoardMap.tsx:428-440` renders all segments into the board route overlay.

Recommendation: show destination glow for all legal endpoints, but only draw the full route path for the selected/recommended destination or the phone-highlighted destination.

### P1 - TV host state banner overlays the map

Evidence: `05-tv-active-1920.png`, `06-tv-active-1366.png`

The active host prompt is absolutely positioned over the top of the board. At 1366x768 it covers map tiles and route lines, which weakens the map-first TV rule.

Code reference:

- `src/client/tv/TvApp.tsx:492-508` renders `HostStateBanner`.
- `src/client/styles.css:5046-5054` positions `.host-state-banner` absolutely with a high z-index.

Recommendation: reserve layout space for the banner above the map or integrate it into the header/status strip. It should not float over route information during movement.

### P2 - Phone movement summary truncates the current sector

Evidence: `09-phone-move.png`

The move screen is much improved: prompt first, destination list first, bottom nav clear. However, the movement summary compresses three equal columns, causing `Ashwalk Bridge` to display as `Ashwalk Br...`.

Code reference:

- `src/client/phone/PhoneActionPanel.tsx:1148-1161` renders the summary.
- `src/client/styles.css:12615-12618` uses three equal `1fr` columns.

Recommendation: make the current sector row span wider, or use a two-line summary where move value and legal count are compact chips and current sector gets full width.

### P2 - Inventory status label says "Ready" for cards that are not usable now

Evidence: `08-phone-inventory.png`

The inventory is now scrollable: the captured scroll container had `clientHeight: 615`, `scrollHeight: 819`, and successfully scrolled to `scrollTop: 204`. The remaining issue is state clarity. Cards that cannot currently be used show a prominent `READY` badge plus a secondary line saying `Wait for an action window`. For players, "Ready" can read as "active now."

Code reference:

- `src/client/phone/PhoneInventoryPanel.tsx:59-63` maps `Ready but not usable now` to `Ready`.
- `src/client/phone/PhoneInventoryPanel.tsx:81-84` derives active/inactive state.
- `src/client/phone/PhoneInventoryPanel.tsx:111-123` only shows the use button for usable-now cards.

Recommendation: label these as `Not usable now` or `Timing locked`, and reserve `Ready` or `Usable now` for cards with an available action.

### P2 - Active TV QR module still exposes long URLs during active play

Evidence: `05-tv-active-1920.png`, `06-tv-active-1366.png`

The compact QR module is useful, but in active play it still displays the full LAN URL and seat-link text. This competes with phase/board information in the top-right header.

Code reference:

- `src/client/tv/TvApp.tsx:413-415` always renders compact `JoinQrCard` when a room code exists.
- `src/client/tv/JoinQrCard.tsx:48-51` prints the full URL and seat links in compact mode.

Recommendation: during active play, keep QR and room code, but hide long URLs and seat-link text behind a lobby/setup-only variant.

### P3 - Join form is visually clean but missing mobile form metadata

Evidence: `01-phone-join-empty.png`, `02-phone-join-prefilled.png`

The staged join flow is correct and clean. The remaining issue is implementation detail: the room code and player name inputs lack `name`, `autoComplete`, `inputMode`, and `spellCheck` hints.

Code reference:

- `src/client/phone/PhoneApp.tsx:316-323`
- `src/client/phone/PhoneApp.tsx:327-333`

Recommendation: add mobile-friendly input metadata. For room code, use `name="roomCode"`, `autoComplete="off"`, `spellCheck={false}`, and an uppercase-friendly input mode. For player name, use a stable `name` and sensible autocomplete behavior.

## Current Strengths

- Phone join and character selection are properly separated.
- Phone move tab now puts the required action first.
- Phone inventory is technically scrollable.
- Bottom nav remains visible and does not create horizontal overflow in captured states.
- TV remains map-first and uses no canvas/Three.js.
- Public TV state did not expose private rivalry data in captured solo/co-op states.

## Evidence Limits

- Battle and shop active states were not fully exercised in this capture because the deterministic solo state was in movement. The screenshots `10-phone-battle.png` and `11-phone-shop.png` therefore confirm disabled-state behavior, not full battle/shop interaction quality.
- Real Android/iOS browser chrome was not directly captured in this run; screenshots are Playwright mobile viewport captures.
