# Ashenreach Signal Sector Resolutions

## Production direction

Signal Theatre uses **The Sector Answers** for public battles and tile challenges. The revised production treatment is a cinematic portrait duel rather than an arithmetic panel.

Its signature is the **signal ravine**: a wide, irregular dark rift with asymmetrical illuminated cliff edges separating two mirrored portrait reliquaries. Its light is always keyed to the authoritative challenge stat, while success and failure keep their own independent result colour.

The top-right status element is an **action seal**, not a single static image. During a challenge or battle it selects one of five original generated relic-metal seals from the authoritative stat:

- Command: crowned relay standard.
- Grit: crossed breach blades.
- Signal: radial signal eye.
- Guile: faceted split mask.
- Forge: industrial cog aperture.

Outside resolutions the same component changes to lightweight inline-SVG movement, arrival, encounter, reward, penalty, waiting, shop, handoff, final-stage, and expedition-result engravings. Colour is supplemental; the action and subject remain written beneath the seal.

## Composition

### Battle

```text
operative portrait
→ signal fracture
→ enemy portrait
→ authoritative total versus authoritative total
→ result and public consequence
```

### Tile challenge

```text
operative portrait
→ signal fracture
→ existing challenge artwork
→ authoritative total against fixed challenge total
→ result and public consequence
```

Challenge art is labelled `Challenge` and `The sector answers`. It is never presented as an enemy.

## Information hierarchy

The focused TV surface displays:

- operative portrait, operative name, and player name;
- enemy or challenge portrait and public name;
- relevant stat label as a compact colour-coded cue;
- exactly two numeric totals;
- authoritative outcome, consequence, reward, or public waiting copy.

The focused TV surface does not display:

- base values;
- individual dice;
- raw dice totals;
- modifier lists;
- equipment contributions;
- fixed/opposed implementation labels;
- the previous calculation cards or sequence strip.

Those details remain available on the controlling phone. The TV is optimized for cinematic room-distance comprehension.

## Authority and ordering

- `BattlePresentation` remains the source for stage, actor, totals, result, consequence, reward, waiting state, and restoration state.
- `PublicPendingTileChallenge` and the matching public tile challenge provide challenge identity, existing art ID, stat, fixed total, lore, and public summaries.
- The client never recalculates totals.
- `useSignalTheatreJourney` retains priority so arrival settles before the portrait duel appears.
- Reveal animation never submits or delays a gameplay command.

## Reveal motion

Normal motion:

1. Heading enters over the darkened sector.
2. Operative portrait slides and unmasks from the left.
3. Enemy or challenge portrait slides and unmasks from the right.
4. The challenge-coloured signal ravine tears open between them.
5. The challenge-specific metal seal rises from darkness, flares once, and settles in the upper corner.
6. Identity captions settle.
7. The two totals strike into place.
8. The authoritative result resolves beneath the duel.

Reconnect uses the stable restored state without replaying the reveal. Reduced motion renders the complete composition immediately.

## Result crest treatment

The selected production treatment is **Option A — Crest and verdict**. The powered or broken crest appears beside live HTML result text. The image never replaces the authoritative `SUCCESS` or `FAILURE` label.

Success uses a restored mint-lit relay crest. Failure uses a fractured ember-lit relay crest. The crests render only after the server supplies the result.

## Art and rendering

- Operative portraits resolve through `getCharacterPortraitPathOrNull`.
- Enemy and challenge art resolve through the shared runtime card-art and nemesis resolvers.
- Existing art is cropped at runtime inside `ArtworkFrame`; source files are untouched.
- React and CSS provide the reveal. Canvas, WebGL, Three.js, generated textures, and new portrait files are not used.
- Challenge stat seals and the two result crests are purpose-generated transparent PNG assets. General action seals remain inline SVG geometry and CSS.

## Accessibility

- Portrait alternative text names the public operative, enemy, or challenge.
- Totals have explicit accessible labels naming their owner and value.
- Battle and challenge roles are communicated with text, not colour alone.
- Result copy is an assertive public status without private choice details.
- Reduced motion preserves portraits, names, totals, and outcome.
