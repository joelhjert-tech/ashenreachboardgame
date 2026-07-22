# Phone Action Priority Stack implementation

## Outcome

Option C is now the only production Action-tab layout. The phone renders a single server-projected action inventory in this order:

1. Required now
2. Useful now
3. Optional
4. Passive / already applied
5. Blocked
6. End turn

Empty groups are omitted. Required and useful actions are open; Optional collapses only when it contains more than three entries; Passive and Blocked are collapsed. End Turn is rendered only when legal and otherwise appears in Blocked with the authoritative reason.

The production client does not inspect `phoneActionLayout` or other layout query parameters. The former Context Command Deck and Tactical Action Rail components were removed. The original options comparison report and screenshots remain as design history.

## Files changed for this promotion

- `src/client/phone/PhoneActionPriorityStack.tsx`: canonical presentation classifier and production renderer.
- `src/client/phone/PhoneActionPanel.tsx`: wires projected actions into Priority Stack while retaining specialized Battle, Hazard/Challenge, Scar, movement, shop, and mission surfaces.
- `src/client/styles.css`: production Priority Stack layout, wrapping, focus, touch sizing, responsive, and reduced-motion rules; prototype layout styles removed.
- `src/client/phone/__tests__/PhoneActionPriorityStack.test.tsx`: classifier, ordering, encounter transition, passive, blocked, mode copy, and production-query guards.
- `src/client/phone/__tests__/PhoneActionPanel.test.tsx`: updated production integration assertions.
- `scripts/capture-phone-action-priority-stack.ts`: real-session and canonical-fixture phone QA at four viewports, including real two-player Co-op and Rivalry sessions.

The surrounding dirty map-tile implementation remains uncommitted and was not reformatted, reverted, or staged.

## Canonical classifier

`buildPhoneActionViewModel` is the sole Action-tab presentation adapter. It consumes the phone projection plus the existing action builders; it does not calculate gameplay legality. Stable action keys are deduplicated defensively, and each action enters exactly one group.

Classification rules:

- **Required:** owner prompt choices, `START_TILE_ENCOUNTER`, current roll/confirmation/continuation actions, and non-End-Turn advance actions while an encounter or prompt blocks play.
- **Useful:** legal Equipment, Item, Follower, Character, Scar, reroll, or prevention support that matches the active tested skill and timing window.
- **Optional:** free sector actions, mission completion, table interactions, shops, and services when no mandatory encounter owns continuation.
- **Passive:** equipped passive Gear, prepared character modifiers, and the owning phone's private Rivalry agenda summary. These entries have no action control.
- **Blocked:** server-disabled actions, mismatched skills, invalid timing, insufficient Salvage, invalid targets, spent uses, unrelated actions during a prompt, and illegal End Turn.
- **Advance:** legal End Turn only. Single-player says `Begin next round`; multiplayer says `Pass control to next operative`.

## Context behavior

- A revealed tile encounter presents `START_TILE_ENCOUNTER` first. The command is sent unchanged to the server.
- After authoritative start, the start action disappears and the next projected roll or timing action replaces it.
- Blocking choices demote unrelated actions rather than deleting their canonical state.
- Scar choice retains its exclusive approved selector so ordinary Action entries cannot compete.
- The approved dedicated Battle and Hazard/Challenge interfaces remain the automatic guided surfaces. The Action tab is available for non-opposed encounter support and shows the same authoritative timing actions; opposed Battle remains isolated to its battle controller.
- Result deltas stay visible beneath the stack, preserving immediate Salvage, Trophy, and stat feedback.

## Accessibility and responsive behavior

- Required actions occur first in DOM order.
- Action controls are at least 44 px high.
- Buttons have context-bearing accessible labels.
- Disabled entries retain a `role=status` reason and a disabled button title/reason.
- Passive entries are text plus an `Applied` status, never buttons.
- Long action labels and subtitles wrap without horizontal overflow.
- Keyboard focus continues through the shared `GameButton` focus treatment.
- Reduced motion suppresses decorative Priority Stack transitions without removing state information.

## Performance

- Classification is one pure linear pass over the already-projected action arrays; individual cards do not repeat legality calculations.
- `PriorityActionCard` is memoized and keyed by stable action ID.
- Collapsed Passive and Blocked groups do not render giant logs or alternate layouts.
- The 10+ available and 10+ blocked QA states had no visible expansion jank at 360–430 px.

## Compatibility

No server command, legality resolver, timing window, save schema, movement rule, encounter result, privacy boundary, or TV authority was changed by the Priority Stack promotion. Save version remains 2 and Heat remains retired.
