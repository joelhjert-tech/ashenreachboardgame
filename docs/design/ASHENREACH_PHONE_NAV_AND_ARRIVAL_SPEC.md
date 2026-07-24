# Ashenreach phone navigation and arrival specification

> Historical P19/P20 specification. Signal Theatre Option 2 supersedes the
> navigation shell described here. Its server-authority, reconnect, movement
> confirmation, and arrival-ordering requirements remain applicable.

## Navigation

Normal gameplay uses one 44px-or-taller active-section tag containing a distinct section marker, its short canonical name, and an expand indicator. Tapping that single tag expands the canonical Operative, Inventory, Objectives, Move, Battle, Shop, and Action set in equal-width cells. Selecting a section renders its content immediately and collapses the chooser after 300 ms. Manual Close is always available. Keyboard focus that is visibly active inside the chooser defers collapse until focus leaves. Required-action routing changes the active tag once per authoritative action revision and never expands the chooser.

Full Screen is a distinct secondary utility, separate from the existing Hide UI action. It is entered only from an explicit user gesture through the standard Fullscreen API. Entry or exit refusal leaves gameplay intact and produces a concise status message. Unsupported browsers do not render the Full Screen action.

## Dice result disclosure

The 100 ms hold begins when a new authoritative final result key first renders. A new result is shown in full, then becomes a persistent compact summary. Reconnect-mounted stable results begin compact. A player can reopen or close the breakdown. A reroll decision keeps individual dice visible; only the resolved reroll revision starts a new 100 ms hold. Result-key changes clear stale timers.

## Movement destinations

All destinations remain in one list. A selected destination expands in place; every other destination remains compact and selectable. Selection never submits movement. The expanded card contains the authoritative route preview and the existing explicit Confirm Move action. Only one destination is expanded. A still-valid server-projected selection is restored on reconnect. Android Back follows the shared detail-dismissal policy before room-leave handling.

## Arrival

The phone may show `Arrived` for at most 150 ms after a new authoritative arrival ID first renders. Session storage prevents reconnect replay. Reduced motion skips the transient overlay. The primary hierarchy is tile identity, current mandatory/public rule, blocked reason, bounded art, secondary lore, and remaining rules.

Two development-only presentations use identical public arrival data:

- Cinematic Tile Card: bounded in-flow presentation; production default pending final S24 FE comparison.
- Immersive Tile Reveal: larger app-area presentation selected only with `?arrivalUi=overlay` in development.

Neither option adds Continue, acknowledges an arrival, delays effects, or exposes private content.

## Trophy upgrades

Inventory shows Trophy value and source ledger, unavailable skill reasons, and current-to-next values. An eligible skill is selected first. A separate confirmation states the cost and remaining Trophies, locks immediately, and submits the existing typed `RAISE_STAT_REQUESTED` intent. The server remains the sole authority for cost, timing, caps, spend order, and before/after state.
