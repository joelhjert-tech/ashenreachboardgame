# P20 physical evidence closeout and Android device matrix

## Status

**Option A implementation and S24 FE evidence complete; physical
multi-device evidence incomplete.**

Option A, the in-flow Cinematic Tile Card, is the explicit production arrival
presentation. Option B remains available only in development through
`?arrivalUi=overlay`. Production builds ignore that query and always resolve to
Option A.

Binary captures are local-only under `docs/qa/physical-p20/` and are excluded
through `.git/info/exclude`.

## Arrival decision

| Measurement | Option A | Option B |
| --- | ---: | ---: |
| S24 FE layout viewport | 338 × 601 | 338 × 601 |
| DPR | 3.1875 | 3.1875 |
| Arrival presentation height | 286.03px | 372.61px |
| Page horizontal overflow | 0px | 0px |
| Production selectable | Yes | No |
| Development comparison | Yes | Yes |

Option A remains selected. The automated comparison reinforces the P19
decision: it uses about 87px less vertical space on the measured short S24 FE
layout and preserves the same authoritative tile identity, current rule,
mandatory blocker, public artwork, lore, and remaining-rule projection.

The short-height coarse-pointer treatment reduces only spacing and bounded
artwork height. It does not remove rules information, add an acknowledgement,
delay arrival resolution, or change server authority.

## Device matrix

| Device | Physical CSS viewport | DPR | Connection | Short acceptance flow | Evidence status | Result |
| --- | --- | ---: | --- | --- | --- | --- |
| Samsung Galaxy S24 FE | 338 × 601 | 3.1875 | ADB Wi-Fi debugging, Android Studio mirroring, physical Chrome, remote inspection, and physical touch | P19 completed setup, movement, arrival, battle, Trophy upgrade, Back, and reconnect. P20 captured both arrival variants, a failed Challenge reroll window, reduced motion, missing-art fallback, and expanded long lore. | Complete for the P20 S24 FE slice | Passed; Option A reconfirmed |
| Additional compact Android phone | Not measured | Not measured | No device connected | Not run | Pending physical device | Not assessed |
| Additional taller Android phone | Not measured | Not measured | No device connected | Not run | Pending physical device | Not assessed |

No emulator result is substituted for either missing physical-device row.

## P20 automated evidence

The development-only capture workflow uses the canonical server QA projection
and the measured S24 FE layout profile:

- `s24-layout-option-a-338x601.png`
- `s24-layout-option-b-338x601.png`
- `reroll-result-338x601.png`
- `reduced-motion-option-a-338x601.png`
- `missing-art-338x601.png`
- `long-lore-338x601.png`
- `metrics.json`

The reroll capture proves the authoritative rolled-result surface at the
measured layout. It is not claimed as a physical touch reroll sequence.

## P20 S24 FE physical evidence

Local-only evidence under `docs/qa/physical-p20/s24-fe/`:

- `option-a-arrival.png`
- `option-b-arrival.png`
- `arrival-options.mp4`
- `reroll-available.png`
- `reroll-result.png`
- `reduced-motion.png`
- `missing-art.png`
- `missing-art-detail.png`
- `long-lore.png`
- `long-lore-expanded.png`
- `edge-states.mp4`
- `challenge-failure-followup.mp4`

Option A and Option B were rendered from the same canonical multi-effect tile
arrival fixture in physical Chrome. The screenshots show the same tile,
current rule, mandatory blocker, and remaining-effect count. Option A keeps
the artwork bounded and the rule stack in document flow. Option B uses an
immersive background treatment and occupies materially more of the short
viewport.

The reroll screenshot is a canonical failed Challenge state with the
server-projected `Reroll — spend 1 charge` action visible. The reduced-motion
capture used page-local Chrome DevTools media emulation on the physical phone
and was reset immediately; it did not change the device's permanent
accessibility settings.

The physical evidence still required to close the full multi-device matrix is:

1. The short acceptance flow on one additional compact Android phone.
2. The same flow on one additional taller Android phone.

## Acceptance flow for each additional device

Use the real phone, Chrome, physical touch, ADB, and remote inspection:

1. Record manufacturer, model, Android, Chrome, physical resolution, CSS
   viewport, visual viewport, DPR, density, and font scale.
2. Join and complete setup.
3. Roll, select a destination, confirm movement, and resolve arrival.
4. Resolve one Hazard or Challenge result.
5. Inspect one battle result and reroll timing window.
6. Open Inventory and Objectives.
7. Exercise Android Back detail precedence.
8. Background/resume and reload/reconnect.
9. Verify no horizontal overflow, duplicate command, duplicate transaction,
   console error, or private-state leak.

## Playwright limitation

The 338 × 601 layout run is an automated regression approximation. It does not
reproduce real Android browser chrome, an actual keyboard, the Android Back
gesture, physical GPU rendering, exact font rasterization, or OS
background/process behavior. Physical Chrome remains the acceptance source.

## Verification

- Focused arrival, movement, and Android Back tests: 22/22 passed.
- Client: 446/446 passed.
- Engine/rules: 771/771 passed.
- Rules-only: 72/72 passed.
- Integration: the first wrapper reached its 300-second execution limit
  without an assertion failure; the unchanged compact-reporter rerun passed
  376/376 in 325.45 seconds.
- Aggregate: 1,593/1,593 passed in 683.13 seconds.
- Content validation, typecheck, production build, and the 435/435 asset audit
  passed.
- Working-tree and cached diff checks passed.
- No files were staged, committed, or pushed.
- Screen recording stopped, the temporary device stay-awake override was
  restored to `0`, ADB forwarding was removed, Wi-Fi debugging was
  disconnected, and ports 5173 and 8080 were released.

## Concrete remaining risk

The only P20 risk is evidence coverage on the two additional physical phones.
The S24 FE edge-state evidence is complete. There is no reproduced runtime
blocker and no contradictory evidence against the selected production arrival
design.
