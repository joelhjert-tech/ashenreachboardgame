# Phone Battle Engagement Layout Options

Status: Option B was selected and promoted to the production phone battle layout. Option A remains a screenshot-only design archive.

## Selection outcome

- Selected: Option B — Diagonal Cinematic Split.
- Production route: the normal phone battle flow; no query parameter is required.
- Option A is no longer shipped as an alternate runtime layout.

Production captures:

- [390×844 setup](production/battle-setup-390x844.png)
- [360×800 setup](production/battle-setup-360x800.png)
- [412×915 setup](production/battle-setup-412x915.png)
- [430×932 setup](production/battle-setup-430x932.png)
- [resolved battle](production/battle-result-390x844.png)
- [defeat](production/battle-defeat-390x844.png)
- [details expanded](production/battle-details-390x844.png)
- [reduced motion](production/battle-reduced-motion-390x844.png)

The selected layout consumes the existing `PhonePatchPayload`, battle view model, equipment windows, result data, and existing `ClientIntent` commands.

## Baseline problems

The existing layout uses two shallow, fixed-height landscape crops. Names, player identity, tested skill, and opponent total are repeated inside the artwork labels and again in the calculation area. The artwork has little vertical presence, while the wide total row uses space without making an unresolved result clearer. The opaque action and navigation bars also separate the encounter from the Ashen Reach stage.

Baseline: [battle setup](baseline/battle-setup-390x844.png)

## Option A — Dual Portrait Frames

Two equal 3:4 combatant frames make both sides independently readable. A forged central VS keystone preserves the physical-card feeling. Player and operative identity remain outside the calculation; the five-part strip carries Skill, Roll, Modifier, Opponent, and Total once.

Strengths:

- Fastest side-by-side comparison.
- Long names wrap within independent, bounded labels.
- Equal visual weight makes ownership and opposition immediately clear.
- Portrait artwork gets substantially more space than the baseline.
- Works cleanly at 360×800 through 430×932 without horizontal overflow.

Weaknesses:

- Less cinematic than a shared stage.
- Two narrow frames crop wide landscape art more aggressively.
- The central VS column consumes a small amount of artwork width.

Best fit: tactical clarity and repeated encounters.

Key captures:

- [390×844 setup](option-a/setup-390x844.png)
- [360×800 setup](option-a/setup-360x800.png)
- [412×915 setup](option-a/setup-412x915.png)
- [430×932 setup](option-a/setup-430x932.png)
- [resolved totals](option-a/rolled-390x844.png)
- [details expanded](option-a/details-expanded-390x844.png)
- [success](option-a/success-390x844.png)
- [defeat](option-a/defeat-390x844.png)
- [reduced motion](option-a/reduced-motion-390x844.png)

## Option B — Diagonal Cinematic Split

Both combatants share one wide stage divided by a restrained breach seam. Labels sit over the lower edge of the artwork, keeping the calculation strip separate. The combatants are bounded to the stage so overlap never creates page overflow.

Strengths:

- Strongest cinematic confrontation.
- Wide artwork reads as one scene rather than two web cards.
- Uses less vertical space, leaving more room for outcomes and choices.
- The diagonal seam creates a distinctive Ashen Reach signature moment.
- Better accommodates landscape artwork.

Weaknesses:

- Slightly slower to compare each side as separate entities.
- Diagonal crops need careful focal positioning for unusual portraits.
- Long labels have less isolated space than Option A.

Best fit: dramatic engagement and family/new-player focus.

Key captures:

- [390×844 setup](option-b/setup-390x844.png)
- [360×800 setup](option-b/setup-360x800.png)
- [412×915 setup](option-b/setup-412x915.png)
- [430×932 setup](option-b/setup-430x932.png)
- [resolved totals](option-b/rolled-390x844.png)
- [details expanded](option-b/details-expanded-390x844.png)
- [success](option-b/success-390x844.png)
- [defeat](option-b/defeat-390x844.png)
- [reduced motion](option-b/reduced-motion-390x844.png)

## Visual correction after the first browser pass

The first Option B render used overlapping grid tracks that extended beyond the right edge of the stage. The enemy name was visibly clipped even though the page itself did not report horizontal overflow. The stage was changed to two bounded absolute combatant halves whose overlap remains inside the artwork frame. All Option B captures were then regenerated. The corrected name is fully visible at 360×800 and 390×844.

## Shared behavior

- One authoritative primary action remains fixed above the battle navigation.
- Details are collapsed by default.
- No Attack, Defense, or A/D terminology appears.
- Operative and enemy stats are outside the artwork labels.
- The calculation strip distinguishes an unresolved `Pending` total from a resolved `operative : opponent` result.
- Operative, Gear, and Battle Log retain the existing navigation and controls.
- Equipment prompts, choices, consequences, Scar flows, and reconnect state use the existing battle component.
- Reduced motion removes decorative transitions without removing information.
- Invalid or absent query parameters render the unchanged production layout.

## Four critique seats

### New player

Option B makes “these two figures are fighting” clearest at first glance. Option A makes the names and roles easier to scan independently. Both improve the next-action hierarchy because the primary button remains isolated below the encounter content.

### Optimizer

Option A is faster. Separate frames and aligned identities make it easier to compare combatants repeatedly, while the external calculation strip keeps all numeric state in one predictable row.

### Family player

Option B requires less interpretation and feels more like a confrontation than a statistics screen. Its shorter stage also leaves more breathing room for consequence text on smaller phones.

### Rules lawyer

Both options expose the same canonical details and commands. Option A provides the least ambiguous identity boundary; Option B remains rules-safe because all totals and modifier sources stay outside the decorative diagonal stage and full details remain available.

## Recommendation

Option B is the stronger visual recommendation for Ashen Reach because the shared diagonal stage feels distinctive, cinematic, and less like a conventional card grid. Option A remains the safer choice when rapid tactical comparison and long-name resilience are the priority.

Trade-off for selection:

- Option A: faster tactical comparison.
- Option B: clearer cinematic focus.

Option B was promoted only after the user explicitly selected it.
