# P12 Objective Screenshot and Recording Index

## Environment

- Real two-player Rivalry session created through the normal lobby/setup flow
- Owner: Joel; waiting phone: Anna
- Phone: 360x800, 390x844, 430x932
- TV: 1366x768, 1600x900, 1920x1080
- Source folder: `docs/qa/p12-objectives/`
- Metrics: `docs/qa/p12-objectives/capture-metrics.json`

## Phone captures

Each named group contains all three phone widths unless noted.

| Evidence | Files | Proves |
|---|---|---|
| Shared Mission/stage/progress | `screenshots/phone-shared-*` | public premise, current stage, Win Progress, Loss Pressure, next action, collapsed briefing |
| Active Contract | `screenshots/phone-contract-*` | owner-only identity, current instruction, typed progress, reward, collapsed lore |
| Near completion/multi-condition ordering | `screenshots/phone-contract-near-*` | current/remaining/completed order and exact authoritative progress |
| Contract complete/reward/replacement | `screenshots/phone-replacement-*` | reward already resolved, completion archived, private deterministic options, no Claim fabrication |
| Agenda locked | `screenshots/phone-agenda-locked-*` | sealed state with no title, target, progress, stakes, or scoring |
| Agenda revealed/progress | `screenshots/phone-agenda-revealed-*` | authorized owner-only objective/progress |
| Agenda completed/private reward | `screenshots/phone-agenda-complete-*` | private completion and canonical scoring |
| Long title/conditions | `screenshots/phone-long-content-*` | wrapping, collapsed lore, no horizontal overflow |
| Reconnect | `screenshots/phone-reconnect-contract-near-390x844.png` | authoritative owner Contract restoration without replay |
| Reduced motion | `screenshots/phone-reduced-motion-390x844.png` | same information with reduced motion |

There is no separate Quest screenshot because no mechanically distinct Quest system exists. There is no reward-claim or stale-claim screenshot because Contract rewards apply automatically and no Claim command exists.

## TV captures

Each group contains 1366x768, 1600x900, and 1920x1080.

| Evidence | Files | Proves |
|---|---|---|
| Public Shared Mission and progress | `screenshots/tv-shared-*` | mission identity in the map-first Win Progress instrument, public progress, no private Contract details |
| Private Contract resolution | `screenshots/tv-private-resolution-*` | generic public-safe waiting/result wording only |
| Agenda reveal boundary | `screenshots/tv-agenda-revealed-*` | no owner objective, target, progress, reward, or choices on TV |
| Long content | `screenshots/tv-long-content-*` | private long title/conditions remain absent and TV has no overflow |

Public Scenario map markers remain P11's existing canonical markers. Private Contract destinations no longer receive public ownership data and therefore cannot render.

## Waiting-phone capture

- `screenshots/waiting-phone-private-resolution-390x844.png`: public Shared Mission remains visible while another player chooses a private Contract; no option, target, progress, reward, or internal ID is shown.

## Recordings

| Flow | File |
|---|---|
| Mission progress update | `recordings/p12-mission-progress-update.webm` |
| Contract progress through completion/replacement | `recordings/p12-contract-progress-completion.webm` |
| Agenda locked to revealed | `recordings/p12-agenda-lock-reveal.webm` |
| Private completion on a public-safe waiting phone | `recordings/p12-private-completion-public-safe.webm` |
| Reconnect restoration | `recordings/p12-reconnect-restoration.webm` |
| Reduced-motion objective flow | `recordings/p12-reduced-motion-objective-flow.webm` |

An explicit reward-claim recording is intentionally absent because no canonical Claim lifecycle exists. Reward application is covered inside Contract completion/replacement without adding a false control.

## Visual correction pass

The first capture parked every phone screenshot at the Shared Mission card. The harness was corrected to scroll each named state to its actual Contract, replacement, or Agenda panel while retaining the sticky navigation. Manual review then found repeated locked-Agenda hint text and legacy “private mission” replacement wording. The duplicate hint was removed and public/owner replacement copy now says **private Contract**. The TV Win Progress instrument now includes the Shared Mission name so the map-first active board exposes both identity and progress without restoring a permanent sidebar.

Final automated checks: zero horizontal overflow, zero forbidden internal identifiers, and zero browser console errors. All primary controls remain within the single document scroll region above the sticky phone dock.
