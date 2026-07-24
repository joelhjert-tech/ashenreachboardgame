# Physical Android Phone UX Audit

## Root causes

1. Android Back had no active-room `popstate` owner; Chrome navigated away while the server correctly retained the room.
2. Join used the layout viewport and nested full-height containers but did not subscribe to `visualViewport`; the keyboard reduced usable height to about 302px.
3. Standard mobile screenshots used 390 × 844 and overstated real Chrome height.
4. Operative, Inventory, and Objectives reused one scroll element without a top-level transition policy.
5. Tile-arrival context, encounter art, dice, duplicated calculation rows, both consequence branches, outcome copy, and action were stacked before physical-height prioritization.

## Corrections

- One active-room history sentinel opens a semantic Leave Game dialog. In-app details close first. Stay preserves the authoritative action; Leave invokes the existing server leave endpoint.
- A shared Visual Viewport store publishes height/offset CSS variables and a constrained-keyboard state with one coalesced listener set.
- Join is normal-flow, compact under keyboard constraint, uses suitable mobile input attributes, and has an immediate submission lock.
- Major tab transitions reset the shared scroll root to a meaningful top. Returning from a native detail remains local and Back closes it before offering room exit.
- Short result layouts compact art and duplicate arithmetic while retaining the canonical dice presentation. Full calculation and lore remain available under View Details.
- Active encounter tile context becomes a short summary with expandable complete arrival rules.

## Browser boundaries

The guard cannot intercept process termination, force-stop, device shutdown, Chrome eviction, or every tab-close path. Those paths continue to rely on validated authoritative reconnect restoration.

## Assessment

The confirmed P1 Back defect and the three principal P2 layout defects are corrected. Physical verification found no command replay, privacy leak, horizontal overflow, or calculation change.

## P18 acceptance closeout

The closeout used the same physical Galaxy S21+ through Android Studio Device Mirroring, ADB, physical Chrome, and Chrome remote debugging. Five repeated Back/Stay cycles preserved the same mandatory movement action, did not submit a command, and did not accumulate dialogs or guards. The original movement action then submitted once.

The first physical Leave Room tap-through exposed a genuine authority defect: the client called the canonical endpoint once, but the server rejected active seats with `Only lobby seats or unfinished late joins can be released`. A narrow server correction now treats active-room leave as a controller departure: the seat and operative remain authoritative, the phone connection is closed, `connected` becomes false, and the public room projection updates. Lobby and unfinished late-join release behavior is unchanged. A repeated leave request is idempotent.

The corrected physical tap-through produced one leave request, returned the phone to Join, cleared private controller state, retained the active operative for reconnect-safe play, and restored ordinary browser Back behavior outside the room. No movement, reward, result, purchase, or objective effect replayed.

Physical recordings now cover Join with the real keyboard, setup and first action, Hazard, battle, shop, Player Card/Inventory/tab scrolling, Back/Stay, Back/Leave, background/resume, reload/reconnect, reduced motion, and deterministic victory/defeat. Binary evidence remains machine-local and excluded from Git.

Final classification: no P0 or P1 physical-device blocker remains. Playwright remains a layout regression tool and does not reproduce Android browser chrome, the Samsung keyboard, Android Back, physical GPU/font rendering, or OS background behavior.

## Verification closeout

The final compact-reporter aggregate passed 1,575/1,575 in 418.8 seconds wall time after the new active-leave regression was added. This is separate from the earlier hardening history: one output-pipelined run reported exit code 1 while all 1,574 assertions passed, followed by an unchanged compact-reporter rerun at 1,574/1,574, exit 0, in 426.7 seconds. The earlier result remains classified as output-pipeline handling rather than an assertion failure.

Content validation, typecheck, 771 engine/rules tests, 72 rules-only tests, 375 integration tests, 429 client tests, production build, 435-asset audit, and both diff checks passed. No service, ADB forwarding rule, staged file, commit, or push remains from closeout.
