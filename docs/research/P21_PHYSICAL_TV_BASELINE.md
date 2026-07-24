# P21 Physical TV Baseline

## Status

**Physical-TV acceptance is not started.**

The 2026-07-23 hardware preflight found no television, HDMI-connected display,
4K surface, or second Windows display. The only exposed display is a desktop
monitor. It is not being substituted for the real television required by P21.

No P21 room-distance score, overscan result, ambient-light result, motion-comfort
finding, physical screenshot, or physical recording is claimed in this report.

## Repository baseline

- Git root: `ashen-reach-codex-task-01-repository`
- Branch: `integration/p0-p15-ux-consolidation`
- Staged files at preflight: 0
- `public/assets` status entries at preflight: 0
- Ports 5173 and 8080 at preflight: free
- P20 validated presentation remains the test baseline.
- Existing unrelated working-tree changes were left untouched.

## Connected display detected by Windows

| Field | Observed value |
|---|---|
| Manufacturer | Acer (`ACR`) |
| Model | XZ320Q X |
| Display class | Desktop monitor; not accepted as the P21 television |
| EDID image size | 70 × 39 cm, approximately 31.6 inches diagonal |
| EDID manufacture date | Week 42, 2021 |
| Physical screens exposed | 1 |
| Current GPU signal | 1920 × 1080 at 59 Hz |
| Windows logical desktop | 1536 × 864 |
| Applied DPI | 120 DPI, equivalent to 125% scaling |
| Connection telemetry | External DisplayPort (`VideoOutputTechnology` 10) |
| Colour depth | 32-bit desktop |
| GPU | AMD Radeon 610M |

Two active EDID interface records expose the same Acer model, but Windows
publishes one physical screen and one desktop rectangle. They do not constitute
two usable displays.

## Source environment

| Field | Observed value |
|---|---|
| Source device model | Lenovo `82XN` |
| Operating system | Windows 11 Home |
| OS build | 26200 |
| Browser | Google Chrome 150.0.7871.129 |
| Browser zoom | Not measured; the Ashenreach host was not opened on a TV |
| Fullscreen behavior | Not measured |
| Audio behavior | Not measured |
| Output colour range | Not observable from available telemetry |

## Required television fields still unobserved

- Television manufacturer and model
- Panel size
- Native resolution
- Actual refresh rate used for the session
- HDR state
- Picture mode
- Aspect-ratio or screen-fit mode
- Overscan setting
- HDMI/native-browser/streaming connection method
- TV-side scaling
- Browser zoom on the acceptance surface
- Fullscreen entry, exit, reload, reconnect, and return behavior
- Normal, bright, and dim room-light conditions
- Viewing distances of 1.5 m, 2.5–3 m, and 4 m

## Acceptance gate

P21 may continue when a real television or equivalent large living-room display
is connected and exposed to the test computer. The preferred starting
configuration is:

- HDMI from the source computer to the television
- 1920 × 1080 output
- 100% operating-system scaling
- 100% browser zoom
- television aspect mode set to screen fit, just scan, 1:1, or the equivalent
  no-overscan mode

The 4K configuration may be tested afterward with its actual Windows scaling
and CSS viewport recorded. Room photographs and binary physical evidence remain
local-only.

## Changes made during preflight

- Product code changed: 0 files
- Artwork modified, added, or removed: 0/0/0
- Reference assets transferred: 0
- Physical-TV corrections attempted: 0
- Commit or push performed: no
