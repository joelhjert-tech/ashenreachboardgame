# P9 Cross-System Accessibility Audit

## Automated and browser observations

- Phone viewports: 360x800, 390x844, 430x932.
- TV viewports: 1366x768, 1600x900, 1920x1080.
- P8 measurement harness: zero horizontal overflow, zero image escapes, zero undersized measured phone targets, zero console errors.
- Long labels and mechanical text wrap without ellipsis loss.
- Reduced motion preserves labels, totals, actor identity, destination identity, results, and actions.
- Missing-art fallbacks retain meaningful authored accessible names and do not reveal IDs or asset paths.
- Required action, result, and handoff live regions are not duplicated on the active surface.

## Focus review

| State | Observed behavior | Finding |
|---|---|---|
| Setup/operative selection | P8 active element remained the document/body content | Medium: initial setup choice lacks a useful focus target |
| Required action | Focus lands on the primary action once per authoritative revision | Pass |
| Movement selection | Focus lands on the first destination/primary decision | Pass |
| Battle setup/result | Encounter chamber/result receives stage focus without repeated steals | Pass |
| Shop | Offer controls remain reachable | Pass, but sticky overlap creates a visual/touch obstruction |
| Result/Continue/End Turn | Immediate lock prevents repeated activation | Pass |
| Reconnect | P4 restores the current authoritative action without replay focus | Pass |

## Live-region review

- Setup uses a public start-requirement announcement.
- Battle result announces one concise result.
- Handoff announces the completed and next operative once.
- Movement uses meaningful state announcements rather than frame-by-frame route narration.
- Public TV announcements contain only public actor/action context.
- The waiting phone visually repeats actor/context, but this was not observed as two simultaneous live announcements. It remains a cognitive duplication issue.

## Manual visual accessibility findings

### High

- Shop sticky Leave Shop overlaps carousel navigation at phone sizes. Even though each control meets nominal size, overlap can make the underlying Previous/Next target difficult or impossible to use reliably.

### Medium

- Setup selection does not move keyboard focus to the first meaningful choice after the authoritative stage appears.
- Waiting phones repeat the same actor and action in separate panels, increasing cognitive load.
- TV live-status supporting copy can truncate because actor/context is appended after an already complete sentence.

### Low

- The TV opponent calculation uses `BATTLE 0`, which is technically readable but not semantically clear for a couch-distance audience.
- Some inventory details require normal vertical scrolling at 360x800; this is acceptable because the required Return to Action control remains above the inventory content.

## Colour independence

Movement destinations use letter markers and labels in addition to color. Statuses use text labels. Mission/setup choices use names and buttons. Battle outcomes use explicit SUCCESS/FAILURE/TIE wording. No audited decision depended solely on hue.

## Screen-reader and device limitations

Headless DOM/live-region inspection does not equal a full NVDA, TalkBack, VoiceOver, or physical safe-area audit. The next implementation slice should add keyboard focus assertions for setup and overlap geometry assertions for sticky phone controls. Real-device validation remains recommended for browser chrome and haptics.
