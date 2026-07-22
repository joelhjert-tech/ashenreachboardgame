# P11 Host Map Accessibility Review

## Identity and semantics

- The compact sector brief is an `aside` with a labelled heading and explicit focus-state text.
- Sector name is the semantic primary heading; region and consequence are supporting content.
- The active operative uses an outer shape, text flag, and player name in addition to seat color.
- Occupants use player display name first and operative name second.
- Mission markers keep seat number, initial, border pattern, and accessible labels; they do not depend on color alone.
- Grouped dense markers announce the remaining count through their label.
- Route context has a concise text equivalent for distance, origin/destination meaning, and special connection.
- Missing images continue through the shared adaptive-image fallback with meaningful alt text.

## Couch-distance readability

The brief keeps a high-contrast smoked-metal surface and prioritizes gameplay facts. Essential type does not fall below the established TV minimum. Long sector names wrap rather than ellipsizing essential identity. At 1366x768, secondary lore and tags are removed before essential information is compressed.

The board remains the dominant surface. Active markers do not cover tile titles, and the brief is placed away from the current focus where possible.

## Motion

`prefers-reduced-motion` removes the active pulse and brief slide. Static outline, active label, selected marker, route, occupants, and rule copy remain. No information is encoded only in motion, and reduced motion does not change server timing.

## Privacy and announcements

Only public patch fields and allow-listed canonical content enter the presentation adapter. Private agenda, Contract detail, inventory, Salvage, Scar choice, reward choice, and hidden encounter identity are absent. Browser capture and render tests scan for private/internal strings.

The P11 brief does not introduce another assertive live region. Existing host status announcements remain the single public required-action channel, preventing duplicate screen-reader announcements.

## Test results

- Long sector name: passed at 1366x768, 1600x900, and 1920x1080.
- Six operatives on one sector: stable, identifiable, and bounded.
- Active marker without motion: clear shape and text identity.
- Route text alternative: present from authoritative route data.
- Objective marker non-color identity: present.
- Empty optional fields: omitted with no empty headings.
- Horizontal and vertical page overflow: zero in all 30 screenshots.
- Console/page errors: zero.

## Remaining accessibility risk

Duplicate player display names can still produce identical visible text. Seat pattern/number and operative secondary name provide disambiguation, but a future global identity policy could make duplicate-name handling more explicit across every TV surface.
