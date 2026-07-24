# P22 Operative Pieces Accessibility

## Identity

- Six stable identities combine colour, heraldry symbol, initials, seat position, player name, and operative name.
- Active state combines a ring, scale/z-order, light, text, and accessible active-state copy.
- Portrait alt text is the canonical operative name.
- Missing portrait fallback retains an accessible operative-specific label.
- Dense sectors expose a deterministic text summary of all public occupants.

## Readability

- The environment has dark edge gradients and a protected lower-center landing zone.
- Base rims retain contrast on bright and dark fixture environments.
- Active player and operative names remain in the stage label and public roster.
- Long names wrap in the active nameplate and are ellipsized only in the redundant compact roster.
- Sector, actor, public action, progress, and next state remain textual; motion carries no exclusive meaning.

## Reduced motion and reconnect

- `prefers-reduced-motion` removes continuous or spatially unnecessary animation.
- Identity, active state, location, destination, arrival, and public action remain visible.
- Reconnect announces restoration and does not replay completed motion.

## Privacy

Only public patch fields are used. The piece label includes public player name, operative name, public location, active state, and stable public symbol. It does not render seat tokens, host tokens, private objectives, agendas, inventories, choices, or internal IDs.

Browser QA found zero private/internal leak-pattern matches across 66 captures.
