# Physical Android and Playwright Comparison

## Baselines

| Surface | CSS viewport | DPR | Touch | Browser chrome | Keyboard |
| --- | ---: | ---: | --- | --- | --- |
| Galaxy S21+ physical Chrome | 384 × 722 | 2.8125 | Physical | Real | Measured 301.51px visual viewport |
| Physical-layout regression profile | 384 × 722 | 2.8125 | Enabled | Not simulated | Separate 384 × 302 constraint |
| Existing compact | 360 × 800 | test default | Emulated | Not simulated | Not simulated |
| Existing standard | 390 × 844 | test default | Emulated | Not simulated | Not simulated |
| Existing large | 430 × 932 | test default | Emulated | Not simulated | Not simulated |

`384 × 722` is a physical-layout regression profile, not a replacement for physical Android acceptance testing.

## Material differences

- The old 390 × 844 profile supplied 122 more CSS pixels of height than physical Chrome. It concealed Join-keyboard and result-density defects.
- Playwright does not reproduce Chrome's top controls, the Samsung keyboard, Android Back, exact font rasterization, physical GPU behavior, or OS background/process behavior.
- After correction, both physical Chrome and the 384 × 722 profile have zero horizontal overflow and 44px minimum primary controls.
- Physical keyboard evidence shows the complete Join button; the constrained automated profile verifies the same geometry without claiming to emulate the keyboard.
- Physical Hazard evidence shows tile context, test identity, raw dice, modifier/final/target, failure, authored consequence, and the primary reaction in the usable viewport.

## Evidence

- `docs/qa/physical-android-phone/keyboard/physical-galaxy-s21plus-join-keyboard-384x302.png`
- `docs/qa/physical-android-phone/hazard/physical-galaxy-s21plus-hazard-result-384x722.png`
- `docs/qa/physical-android-phone/comparisons/playwright-join-384x722.png`

## P18 reconciled comparison

The corrected physical states were compared against the closest deterministic automated fixtures for Join, setup, movement, Hazard, battle, shop, Player Card/Inventory, Objectives, reconnect, victory, defeat, and reduced motion. The Back confirmation and real keyboard remain physical-only acceptance behaviors; the automated profile verifies their DOM geometry and state contract but cannot reproduce the Android gesture or Samsung IME.

Remaining differences are expected platform differences: Chrome toolbar height, exact font rasterization, screenshot scaling, physical touch latency, keyboard animation, and GPU compositing. No remaining comparison showed a different authoritative value, hidden mandatory action, horizontal overflow, or undersized primary target.

The existing 360 x 800, 390 x 844, and 430 x 932 images remain breadth regressions. The 384 x 722 profile is the physical-layout regression baseline, not a substitute for the recorded Galaxy S21+ acceptance sequence.
