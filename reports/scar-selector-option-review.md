# Scar Selector Option Review

## Scope and production decision

The review compared two phone presentations for the existing server-authoritative
Scar choice. Option A, the Focused Scar Carousel, was selected and promoted to the
production phone flow. Option B was removed from runtime code after the decision.

The production selector submits the existing typed `CHOOSE_SCAR` intent with the
authoritative selection ID and selected canonical Scar ID. The choice remains blocking
and normal phone navigation is hidden until it is resolved. No Scar rule, projection,
save data, or server resolver changed.

## Shared implementation

Both variants use the same projected candidates, canonical artwork, source category,
current Scar count, third-Scar threshold warning, Burden, Adaptation, lore, and typed
choice callback. Shared presentation includes:

- a compact injury/source header;
- permanent-choice and retirement-threshold warning;
- canonical Scar artwork through `CardArtImage`;
- separate red Burden and muted-green Adaptation treatment;
- a custom angular `AcceptScarButton` with source sigil and permanent-choice copy;
- disabled/pending protection against repeated submission;
- 44 px minimum secondary controls and a 62 px primary oath control;
- safe-area spacing, one page scroll, reduced-motion behavior, and no canvas rendering.

## Option A — Focused Scar Carousel

### Interaction flow

The player studies one complete Scar at a time, moves between the two choices with
large previous/next controls or a horizontal swipe, and accepts the focused Scar from
the persistent oath region. `Compare both` opens a full textual comparison without
changing the focus or submitting a choice.

### Strengths

- Largest artwork and strongest cursed-object presentation.
- One decision target at a time makes the selected Scar unmistakable.
- Full Burden and Adaptation remain adjacent before acceptance.
- Previous/next position and two-segment indicator make the choice count explicit.
- Large controls are comfortable for one-handed use.

### Weaknesses

- Comparing both choices requires navigation or opening the comparison overlay.
- More vertical space is spent on atmosphere and artwork.
- A player optimizing exact effects takes more interaction than in Option B.

## Option B — Compact Side-by-Side Comparison

### Interaction flow

Both Scars appear together as compact summaries. Each card shows artwork, name,
Burden, Adaptation, and a large `Inspect` action. Inspection opens the complete Scar;
only that detail state exposes the acceptance oath. `Compare details` remains
available for a fuller text pass.

### Strengths

- Fastest direct comparison of both permanent trade-offs.
- No accidental acceptance from the summary cards.
- Both names, artwork, Burdens, and Adaptations fit together at 390×844.
- The detail step makes the final commitment deliberate.

### Weaknesses

- Artwork and body text are smaller than Option A.
- Narrow columns require more line wrapping for long canonical effects.
- Acceptance requires one additional inspect interaction.

## Objective comparison

Scores use 1 (weak) through 5 (strong).

| Criterion | Option A | Option B | Evidence |
|---|---:|---:|---|
| Immediate choice clarity | 5 | 4 | A has one focal card; B deliberately separates compare from accept. |
| Side-by-side comparison | 3 | 5 | B exposes both mechanical trade-offs together. |
| Artwork visibility | 5 | 3 | A dedicates the central stage to one wide image. |
| Long-effect handling | 4 | 3 | A has a full-card detail area; B wraps into narrow summary columns. |
| One-handed operation | 5 | 4 | Both use large targets; B adds an inspect step. |
| Primary-action safety | 5 | 5 | Only the oath button submits; repeated taps are disabled locally and remain server-validated. |
| Threshold visibility | 5 | 5 | Both use the same prominent current-count and third-Scar warning. |
| Accessibility | 5 | 4 | Both pair color with labels/symbols; A retains larger reading sizes. |
| Implementation complexity | 3 | 4 | A adds swipe/carousel state; B adds summary/detail state. |
| Regression risk | 5 | 5 | Both are dev-gated views over the same projection and command. |

## Four critique seats

### New player

Option A explains the irreversible decision most clearly because only one Scar and one
oath action dominate the screen. Option B makes the existence of two alternatives
clearer immediately, but the deliberate inspect step needs one extra tap.

### Optimizer

Option B is faster: both Burdens and Adaptations can be scanned without paging. Option
A's comparison overlay preserves exact detail but interrupts the main carousel flow.

### Family/casual player

Option A has larger art, fewer simultaneous text blocks, and more forgiving controls.
Option B reduces paging but demands reading two narrower columns.

### Rules lawyer

Both retain complete canonical text and never accept from an abbreviated summary.
Option B makes summary versus authoritative full detail especially explicit; Option A
keeps the same detail beside the focused choice and offers a separate comparison view.

## Screenshot review and corrective pass

The first browser render found three defects:

1. The normal compact phone navigation remained below the blocking Scar prompt.
2. The sticky acceptance region covered the Scar name/effect content.
3. Option B's summary actions were partially covered at 360×800.

Corrections:

- the parent phone controller now suppresses navigation only while a dev Scar prototype
  is active;
- artwork/header proportions were tightened and full Burden/Adaptation text was paired
  into a compact readable treatment above the oath control;
- comparison content reserves space for its action region;
- the summary action was shortened to `Inspect` at narrow widths;
- the custom oath label now wraps rather than truncating the Scar name.

The final automation verified no horizontal overflow, no normal phone navigation, no
canvas, no raw selection IDs, an on-screen acceptance action where applicable, the
blocking footer, and zero browser console errors.

## Screenshot index

### Option A

- `reports/ui/scar-selector-options/option-a-carousel-360x800.png`
- `reports/ui/scar-selector-options/option-a-carousel-390x844.png`
- `reports/ui/scar-selector-options/option-a-carousel-412x915.png`
- `reports/ui/scar-selector-options/option-a-carousel-430x932.png`

### Option B

- `reports/ui/scar-selector-options/option-b-compare-360x800.png`
- `reports/ui/scar-selector-options/option-b-compare-390x844.png`
- `reports/ui/scar-selector-options/option-b-compare-412x915.png`
- `reports/ui/scar-selector-options/option-b-compare-430x932.png`
- `reports/ui/scar-selector-options/option-b-detail-390x844.png`

## Production decision

Option A was selected. The production phone now uses the Focused Scar Carousel at every
owner-private pending Scar choice. Option B remains documented only as discarded design
evidence and is not maintained as a hidden runtime implementation.

Production QA captures:

- `reports/ui/scar-selector-production/scar-selector-360x800.png`
- `reports/ui/scar-selector-production/scar-selector-390x844.png`
- `reports/ui/scar-selector-production/scar-selector-412x915.png`
- `reports/ui/scar-selector-production/scar-selector-430x932.png`
- `reports/ui/scar-selector-production/scar-selector-compare-390x844.png`
- `reports/ui/scar-selector-production/scar-selector-resolved-390x844.png`
