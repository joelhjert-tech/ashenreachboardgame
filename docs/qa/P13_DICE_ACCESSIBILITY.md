# P13 Dice Accessibility

## Information equivalence

- Every die has an accessible label containing its role and authoritative value.
- Multi-die rolls identify Die 1, Die 2, and any rerolled die separately.
- Raw total, named modifiers, final value, target, and outcome are textual.
- Stylized faces always use readable Arabic numerals.
- Rerolls use wording and a dashed outline; they do not rely on colour alone.
- A completed result emits one polite status sentence. Tumble frames are `aria-hidden` and never announced.

## Controls

- Existing Roll and reroll actions retain the P1 required-action shell and minimum 44x44 touch target.
- The control locks before the existing command is sent.
- The dice view itself is not a second actionable Roll control.
- Waiting phones never receive actionable owner-only controls.

## Reduced motion

`prefers-reduced-motion: reduce` disables the tumble and delayed arithmetic entrance. Authoritative faces, raw total, modifiers, final value, target, outcome, and reroll history remain visible. A short opacity change may remain as nonessential feedback.

## Focus

The dice component does not take focus on unchanged projections or reconnect. Existing required-action focus behavior remains responsible for the next legal action. No animation frame moves focus.

## Responsive review

Reviewed at 360x800, 390x844, 430x932, 1366x768, 1600x900, and 1920x1080. Dice labels wrap safely, the phone primary action remains reachable, and all automated captures report zero horizontal overflow.

## Sound and haptics

The result is fully understandable when muted. The repository has an existing dice audio hook but no newly approved original asset was available. No sound was added. There is no canonical roll-specific haptic interface, so P13 does not introduce a parallel vibration subsystem.
