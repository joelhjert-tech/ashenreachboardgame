# Signal Sector Resolution Implementation Report

## Outcome

The Sector Answers now uses a cinematic portrait-versus-portrait composition with only authoritative totals.

### Battles

- Existing operative portrait fills the left reliquary.
- Existing enemy or nemesis art fills the right reliquary.
- A challenge-coloured signal ravine and compact stat cue separate the combatants.
- Only operative total, opposition total, result, and public effect copy are shown.

### Tile challenges

- Existing challenge artwork fills the right reliquary.
- The challenge is explicitly labelled as a sector challenge.
- The canonical fixed threshold appears as the challenge total.
- No invented enemy identity or imagery is introduced.

### Action seals

- The former static top-right coin image has been removed from Signal Theatre.
- `SignalActionCoin` renders lightweight inline SVG engravings for general public actions.
- Battles and challenges use the projected Command, Grit, Signal, Guile, or Forge stat to select one of five original generated transparent relic-metal seal images.
- The seal remains visible in the portrait-duel view and changes without generating state or requesting an asset.
- The reveal, metal activation flare, expanding ring, ignition, and one-pass scan are finite; reduced motion renders the settled seal immediately.

### Signal ravine

- The former narrow spear-like divider is replaced by nested, asymmetrical rift silhouettes.
- The outer cliff edge and glow use the projected challenge stat colour.
- The inner ravine remains dark, preserving the visual separation between portrait cards.
- Result tone does not recolour the ravine, so a successful Signal challenge stays blue and a failed Grit battle stays red.

### Result images

- Success and failure each have an original generated transparent crest.
- Option A pairs the crest beside the authoritative text and is the selected production treatment.
- The unselected watermark treatment and its query switch were removed.
- Resolving, waiting, and draw states do not invent a success or defeat image.

## Removed presentation

- Chess-piece foreground during resolution.
- Base, dice, raw value, and modifier cards.
- Modifier chips.
- Duplicate difficulty display.
- Calculation sequence strip.
- Scenario, roster, signal, sector-title, and brand rails during the focused reveal.

## Server-state safety

- No gameplay, server, protocol, save, route, probability, or phone UI code changed.
- Totals are displayed exactly as projected by the server.
- Owner-private required-action details are not consumed.
- Arrival presentation continues to take priority.
- The reconnect seen marker is written after the 900 ms reveal settles and its timer is cleared on cleanup.

## Motion

The reveal uses independent CSS animations for heading, operative portrait, opposition portrait, image settle, signal fracture, identities, totals, outcome, and final impact wash.

Every animation is disabled by `prefers-reduced-motion: reduce`.

## Art protection

- Existing art modified: 0.
- Existing art added: 0.
- Existing art removed: 0.
- New character or challenge art: 0.
- New Signal Theatre interface images: 7 (5 stat seals and 2 result crests).
- Reference assets transferred: 0.

Existing art changes remain runtime framing, crop, shade, mask, and motion. The five new files are purpose-generated Signal Theatre interface ornaments; no character, challenge, board, or reference artwork was altered.
