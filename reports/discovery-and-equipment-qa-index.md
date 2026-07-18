# Discovery and Equipment QA Index

## Fixture

The QA-only `discovery-equipment` fixture uses normal server projections and the production phone/TV components. It does not bypass reducers for gameplay tests; direct state setup is limited to deterministic presentation capture. Browser automation is in `scripts/capture-discovery-equipment-qa.ts`.

## Captures

All captures are under `reports/ui/discovery-equipment/`.

| State | Phone 390×844 | TV 1920×1080 | TV 1366×768 |
|---|---|---|---|
| Equipment discovery | `phone-equipment-reveal-390x844.png` | `tv-equipment-reveal-1920x1080.png` | `tv-equipment-reveal-1366x768.png` |
| Follower discovery | `phone-follower-reveal-390x844.png` | `tv-follower-reveal-1920x1080.png` | `tv-follower-reveal-1366x768.png` |
| Auto-equipped reward | `phone-auto-equipped-390x844.png` | `tv-auto-equipped-1920x1080.png` | `tv-auto-equipped-1366x768.png` |
| Occupied-slot choice | `phone-equip-choice-390x844.png` | `tv-equip-choice-1920x1080.png` | `tv-equip-choice-1366x768.png` |
| Command with invalid Grit item | `phone-command-item-invalid-390x844.png` | `tv-command-item-invalid-1920x1080.png` | `tv-command-item-invalid-1366x768.png` |
| Grit with valid Grit item | `phone-grit-item-valid-390x844.png` | `tv-grit-item-valid-1920x1080.png` | `tv-grit-item-valid-1366x768.png` |

## Manual review and correction

First capture passed horizontal-overflow and console checks, but revealed a hierarchy defect: the host labelled discovery checks `BATTLE RESOLVING` and rendered the opposed battle chamber because discovery tests share the roll-math structure. The phone secondary status also said `BATTLE`. The correction adds a dedicated public discovery overlay on TV, changes the live prompt to `ENCOUNTER RESOLVING`, and uses the contextual `DISCOVERY` label on phone. Enemy, recurring challenge, and ordinary Hazard focus behavior remains unchanged.

The invalid Command capture shows no usable battle gear. The matching Grit capture shows Black Route Fuse, its +1 passive/equip guidance, active effect, timing, and `USE NOW` without horizontal overflow. Private inventory detail is absent from TV.

`index.json` records the 18 generated files. The final recapture completed after the presentation correction and overwrote only these deterministic QA files. All 18 captures passed horizontal-overflow and console checks at their recorded viewports.

## Verification

- Content validation: passed (109 Threats; Red 26, Blue 35, Yellow 48).
- Typecheck: passed.
- Engine: 744/744 passed.
- Rules: 49/49 passed.
- Integration: passed.
- Client: 351/351 passed after an unrelated Admin Library timeout was rerun without contention.
- Aggregate: 1,395/1,395 passed.
- Asset audit: 421/421 present, zero missing, invalid, placeholder, or release-blocking assets.
- Production build: passed.
- `git diff --check` and `git diff --cached --check`: passed.
