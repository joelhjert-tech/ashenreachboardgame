# Mid-game join QA index

## Method

`npm.cmd run qa:mid-game-join` starts from an already running normal development server and drives the actual HTTP, WebSocket, reducers, projections, and React clients with Playwright. It creates a four-seat co-op session, starts with two players, completes a third player's private setup, reconnects that player, completes the fourth seat, and rejects a fifth phone.

Screenshots are stored under `reports/mid-game-join-qa/` and are intentionally ignored as QA output rather than runtime assets.

## Captures

| File | Viewport | Evidence |
|---|---:|---|
| `two-player-session-active-1366x768.png` | 1366×768 | Active game before late join |
| `two-player-session-active-1920x1080.png` | 1920×1080 | Wide active-game baseline |
| `late-join-private-operative-390x844.png` | 390×844 | Owner-private operative selection |
| `late-join-operative-pending-1366x768.png` | 1366×768 | TV shows pending seat, not options |
| `late-join-operative-pending-1920x1080.png` | 1920×1080 | Wide privacy/overflow check |
| `late-join-private-mission-390x844.png` | 390×844 | Owner-private mission selection |
| `late-join-mission-pending-1366x768.png` | 1366×768 | TV remains public-safe during mission choice |
| `late-join-mission-pending-1920x1080.png` | 1920×1080 | Wide public-state check |
| `late-join-completed-1366x768.png` | 1366×768 | Completed third seat at end of order |
| `late-join-completed-1920x1080.png` | 1920×1080 | Wide completed-state check |
| `late-join-reconnect-phone-390x844.png` | 390×844 | Confirmed join restored on phone |
| `late-join-reconnected-1366x768.png` | 1366×768 | TV after reconnect |
| `late-join-reconnected-1920x1080.png` | 1920×1080 | Wide reconnect check |
| `full-room-1366x768.png` | 1366×768 | Four active configured seats |
| `full-room-1920x1080.png` | 1920×1080 | Wide full-room state |
| `full-room-join-rejected-390x844.png` | 390×844 | Clear `No open seats remain` and disabled `Room Full` action |

## Review findings

- Both TV sizes remained within the viewport with no horizontal overflow.
- Pending operative and mission options did not appear on TV.
- The active operative remained visually dominant while the pending/completed late seat stayed compact.
- Reconnect returned directly to the confirmed operative state without duplicating setup.
- The full-room rejection initially left Join Game active. The corrective pass replaced it with a disabled Room Full control after the authoritative rejection.
- Expected HTTP 400 output for the deliberate rejected join is filtered by the QA assertion; any other browser console error fails the script.

## Limitations

This is deterministic browser-assisted QA, not a human playtest. The script proves projection, privacy, layout, and transaction-state behavior for the captured lifecycle; physical-device network variability and social pacing remain for full-session playtesting.
