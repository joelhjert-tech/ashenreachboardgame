# Signal Sector Resolution QA

## Browser evidence

Evidence root: `reports/ui/signal-sector-resolution`

The automated pass captures 12 deterministic states at:

- 1366×768
- 1600×900
- 1920×1080

This produces 36 screenshots, one review recording, and two focused flow recordings.

States include battle and challenge ready, rolling, success and failure, private wait, reconnect, six-player battle, and reduced motion.

## Browser findings

- Horizontal overflow: 0.
- Vertical overflow: 0.
- Console errors: 0.
- Canvas nodes: 0.
- Portrait pairs per state: 1 operative + 1 opposition.
- Numeric total panels per state: exactly 2.
- Action seals per state: exactly 1.
- Battle seal: Grit engraving.
- Tile-challenge seal: Signal engraving.
- Action seal viewport escapes: 0.
- Signal ravine colour source: authoritative challenge stat.
- Seal activation effects: finite flare, ring, and scan; no continuous animation.
- Success and failure each load one matching result crest only after an authoritative result.
- The selected crest-and-text treatment has focused success and failure coverage.
- Detailed arithmetic panels: 0.
- Visible chess-piece layer during resolution: 0.
- Legacy Signal Theatre battle panels: 0.
- Detected private/internal text leaks: 0.
- Reconnect restored the stable portrait composition without replay.

Machine-readable measurements are stored in `reports/ui/signal-sector-resolution/browser-metrics.json`.

## Focused coverage

- Operative portrait resolves through the shared character resolver.
- Enemy portrait resolves through the shared threat resolver.
- Tile challenge artwork resolves through the shared threat-art catalog.
- Only total values render; bases, dice, raw values, and modifiers do not.
- Public arithmetic remains intact in the presentation model without being recalculated.
- Arrival suppresses the portrait duel until the journey completes.
- Private required-action text is not consumed.
- Reveal animations exist for both portraits, fracture, totals, and outcome.
- The top-right challenge seal loads exactly one matching generated stat-seal image and follows the authoritative challenge stat.
- General action seals remain inline SVG and do not request artwork.
- Its finite reveal has a reduced-motion fallback and no continuous pulse.
- Reduced motion removes the reveal while preserving the final information.

## Visual review

At 1366×768:

- both portraits remain identifiable;
- the signal fracture provides a clear visual contest;
- totals are the strongest data elements;
- challenge art reads as an opposing event without resembling an enemy marker;
- result and public consequence remain readable;
- the background remains atmospheric without competing with the duel.

Physical TV testing remains intentionally skipped per user direction. Evidence is browser-based.

## Repository validation

- Content validation: passed.
- Typecheck: passed.
- Focused Signal Theatre resolution and seal tests: 4 files, 18 tests passed.
- Complete client suite: 64 files, 497 tests passed.
- Server integration suite: 43 files, 377 tests passed.
- Engine and rules suite: 71 files, 771 tests passed.
- Rules-only suite: 13 files, 72 tests passed.
- Production build: passed; 583 modules transformed.
- Release asset audit: 495 / 495 present; 0 missing, invalid, placeholder, or release-blocking.
- Diff whitespace validation: passed.
