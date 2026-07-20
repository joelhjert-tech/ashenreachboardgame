# Hazard and Challenge Phone Layout Options

## Prototype access

These alternatives are development-only and do not replace the production encounter layout.

- Option A: `/?hazardChallengeLayout=cinematic`
- Option B: `/?hazardChallengeLayout=versus-obstacle`

Both variants consume the same `PhonePatchPayload`, `ActiveResolution`, pending tile-challenge projection, result deltas, and existing typed action callbacks. The query parameter changes presentation only. It is ignored outside the Vite development environment.

## Canonical examples

- Hazard: `suture-storm` — Grit 8. Its authored success and failure branches supplied the resolved QA copy.
- Challenge: `rift-whispers-ashen-chapel` — Signal 8 recurring Anomaly Challenge. The QA projection uses the canonical challenge definition and its Scar-producing failure branch.
- Operative: Bjornis, using the current projected stat values and portrait.

The ordinary Hazard projection does not expose both unrevealed effect branches to the phone before a roll. The prototypes therefore show the exact projected branch when known and explicitly say the server will reveal the authored branch when it is not projected. They never infer or duplicate hidden rules in the client.

No canonical Hazard currently offers a Salvage-payment prompt. A payment screenshot was therefore not fabricated. The Rift Whispers Scar follow-up was captured for both variants; the canonical blocking Scar selector correctly supersedes the encounter shell.

## Option A — Cinematic Single-Card Encounter

Flow: compact encounter/test header, wide adaptive card art, lore, calculation strip, structured consequence blocks, details, then the persistent primary action.

Strengths:

- Closest to the approved battle hierarchy without implying combat.
- Largest and clearest encounter artwork.
- The encounter name and environmental mood dominate immediately.
- Most resilient on 360×800 because it has one image column.
- Lowest image-containment and long-name regression risk.

Weaknesses:

- Operative identity is supplied only by the existing phone header rather than repeated in the scene.
- Success and failure are stacked, so direct comparison takes slightly more vertical space.
- Long resolved effects can push View Details below the first viewport, while the required action remains visible.

## Option B — Operative Versus Obstacle

Flow: compact encounter/test header, operative portrait and dominant obstacle art separated by a TEST sigil, lore, calculation strip, consequences, details, and the same persistent primary action.

Strengths:

- Strongest visual continuity with the split battle stage.
- Makes character modifiers and “operative versus world” immediately legible.
- The TEST sigil avoids misleading combat language such as VS.
- Keeps both participant identities visible during the resolution.

Weaknesses:

- Two art frames leave less vertical room for consequences on 360×800.
- Long encounter titles are clamped to two lines in the stage and require details/lore for full context.
- More responsive CSS and more image decode/layout work than Option A.
- At the shortest viewport, the primary action sits close to the failure block even after the corrective spacing pass.

## Comparison

| Factor | Option A | Option B |
|---|---|---|
| Visual relationship to battle | Strong shared hierarchy and frames | Strongest; adapts the split combat stage |
| Artwork visibility | Best; one wide 16:10 subject | Good; obstacle dominates but shares width |
| Skill-test clarity | Excellent | Excellent |
| Success/failure readability | Strong stacked blocks | Strong, but tighter on short phones |
| Long-text behavior | Better vertical capacity | More constrained; two-line stage title |
| Main-action visibility | Persistent and clear | Persistent and clear |
| One-handed use | Excellent | Good |
| Short-screen behavior | Best | Acceptable after compacting |
| Image containment | Lowest risk | Passed, with two contained frames |
| Accessibility | Strong hierarchy; no color-only meaning | Strong hierarchy; TEST label supplements color |
| Implementation complexity | Lower | Higher |
| Component reuse | Shared battle art/action/calculation language | Reuses the battle split-stage language most directly |
| Risk of regression | Lower | Moderate |

## Screenshot review and corrective pass

The first browser render exposed:

1. Player and operative identity repeated underneath the existing phone header.
2. The sticky primary action sat too high and obscured consequence text.
3. The 360px calculation strip truncated `DIFFICULTY`.
4. The original persistent QA state used a Threat fallback instead of the real recurring challenge definition.

Corrections:

- Removed the duplicate internal player header and retained only encounter family plus tested skill/difficulty.
- Lowered the persistent action while keeping it above the existing compact phone dock.
- Reduced only the calculation-label tracking/font at 360px; values and touch targets remain unchanged.
- Loaded `rift-whispers-ashen-chapel` from the canonical tile-challenge catalog for the challenge comparison.
- Recaptured all affected images and reran overflow, image-frame, action-reachability, and console assertions.

## Screenshot index

All captures are under `reports/ui/hazard-challenge-options/`.

Option A:

- `option-a-hazard-390x844.png`
- `option-a-challenge-390x844.png`
- `option-a-success-390x844.png`
- `option-a-failure-390x844.png`
- `option-a-hazard-360x800.png`
- `option-a-challenge-430x932.png`
- `option-a-hazard-412x915.png`
- `option-a-challenge-360x800.png`
- `option-a-scar-follow-up-390x844.png`

Option B:

- `option-b-hazard-390x844.png`
- `option-b-challenge-390x844.png`
- `option-b-success-390x844.png`
- `option-b-failure-390x844.png`
- `option-b-hazard-360x800.png`
- `option-b-challenge-430x932.png`
- `option-b-hazard-412x915.png`
- `option-b-challenge-360x800.png`
- `option-b-scar-follow-up-390x844.png`

`browser-metrics.json` records viewport width, document width, action bounds, navigation bounds where present, and image containment bounds for every prototype capture.

## Production decision

Option A was selected for production. Hazard, Anomaly, and persistent Tile Challenge resolutions now open directly in the cinematic encounter layout without a query parameter or development selector. The existing server-authoritative actions and resolution data remain unchanged.

Option B remains documented in the comparison screenshots only. It is not shipped as a second runtime implementation.
