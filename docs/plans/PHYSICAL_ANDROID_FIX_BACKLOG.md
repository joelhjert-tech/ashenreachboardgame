# Physical Android Fix Backlog

## Closed in this pass

- P1: Android Back could silently leave an active room.
- P2: Samsung keyboard covered almost all of Join Game.
- P2: 390 × 844 overstated available height.
- P2: top-level tabs inherited deep scroll positions.
- P2: Hazard/result essentials were too far below the fold.

## Non-blocking follow-up

- Add authenticated developer entitlements before untrusted public deployment; unrelated to this layout pass.
- Keep at least one physical Android acceptance run per release candidate because automated browser profiles cannot reproduce Android navigation or the real keyboard.
- Consider automating local physical screen-recording cleanup; this is QA tooling only.

## P18 closeout disposition

The active-room Leave endpoint rejection discovered during final tap-through was a P1 acceptance blocker and is closed with a focused server regression. No further physical UI redesign is recommended. Future work is limited to QA tooling automation and release-candidate repetition on at least one physical Android device.
