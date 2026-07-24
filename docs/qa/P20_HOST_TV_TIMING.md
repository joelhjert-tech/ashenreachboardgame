# P20 Host TV Timing

## Runtime tokens

- Instant: 80 ms.
- Quick: 140 ms.
- Normal: 220 ms.
- Deliberate cue entrance: 360 ms.
- Supporting cue copy offsets: 90 ms and 150 ms.

These are presentation timings only. Movement, dice, battle, progression, and
endgame retain existing timing tokens and never wait for the Host Motion Cue.

## Measured sequence

The complete recording is 136.36 seconds. Selected timeline marks:

| State | Timestamp |
|---|---:|
| Lobby ready | 2.675 s |
| Game-start summary | 5.087 s |
| Board reveal | 9.034 s |
| Turn start | 12.138 s |
| Movement result | 15.142 s |
| Route | 23.111 s |
| Intermediate movement | 28.005 s |
| Arrival | 36.899 s |
| Encounter | 47.864 s |
| Combat result | 84.016 s |
| Waiting | 90.065 s |
| Handoff | 101.878 s |
| Final stage | 111.659 s |
| Reconnect | 116.894 s |
| Reduced motion | 123.206 s |
| Victory | 127.833 s |
| Defeat | 130.666 s |
| Long text | 133.468 s |
| Missing art | 134.527 s |

Full timeline:
`reports/ui/p20-host-tv-motion/p20-video-timeline.json`.

## Ordering verification

- Dice/result before destination choice.
- Route start before intermediate step.
- Intermediate step before arrival.
- Arrival before encounter focus.
- Arithmetic before battle result.
- Result before handoff.
- Final stage before victory/defeat.
- Reconnect restores the same stable motion identity.

Development-only query holds keep route stages visible for three-resolution
capture. They do not ship in production timing and do not delay server
resolution.

## Reduced motion

Computed Host Motion Cue animation was `none`. Complete actor, arithmetic,
outcome, consequence, and next-action text remained present.
