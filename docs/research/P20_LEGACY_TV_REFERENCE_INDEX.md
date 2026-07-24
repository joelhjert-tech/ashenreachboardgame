# P20 Legacy TV Reference Index

## Source boundary

The local behavioral reference is outside this repository at
`<workspace-parent>/referance game/audit`. No file from that directory was
copied into Ashen Reach. The review covered three reports, 32 screenshots, and
the complete 179.85-second offline gameplay recording.

The external reference workspace also contains recovered code/resources. They
were inventoried and inspected read-only for this P20 revision. The readable
Java is JADX-decompiled Android Support Library v4/Google wrapper code; the
actual Marmalade/S3E game presenter is compiled and opaque. No reference file
was copied, imported, translated, or used to derive source expression. P20
remains based on the sanitized behavioral audit only.

Only general interaction principles were retained. Names, terminology, text,
art, sound, layout, camera paths, code, and resources from the reference remain
excluded.

## Recording index

| Time | Before | Trigger and stages | Clarity principle | Rejected expression |
|---|---|---|---|---|
| 00:00–00:16 | App launch | Launch → permission/offline state → menu | Establish the product state before asking for input | Reference logo, menu art, and fixed landscape composition |
| 00:16–00:34 | Main menu | Continue/new-session choice → saved-session readout | Make restoration explicit | Reference labels and save-slot layout |
| 00:34–00:53 | New session | Setup panel → player/character focus | Focus one setup decision at a time | Reference portraits, frames, and tutorial copy |
| 00:53–01:19 | Setup stable | Setup summary → mission/scenario selection | Confirm the selected public objective before play | Reference card layout and terminology |
| 01:19–01:42 | Scenario selection | Selection → bounded confirmation | A selection should visibly settle before the next state | Exact transition and camera path |
| 01:42–02:07 | Mandatory setup | Choice prompt → accepted state | Persistent “what happens next” copy prevents ambiguity | Reference dialog styling and prose |
| 02:07–02:28 | Game start | Setup clears → board appears → active player is identified | Board context should survive the transition | Reference board geometry and marker treatment |
| 02:28–02:48 | Turn ready | Active-player focus → roll availability | One dominant public action at a time | Reference action banner and die assets |
| 02:48–02:59 | Movement | Roll result → legal destinations → selected destination | Result, options, and confirmation are distinct beats | Exact timing, map zoom, and destination styling |

The recording ends during the first movement sequence. The later gameplay
systems were reviewed through the ordered capture set:

- Captures 15–17: movement result, options, and destination preview.
- Captures 18–19: arrival resolution and stable post-arrival state.
- Capture 20: automated/non-active turn progress.
- Captures 21–26: known black-screen defect, relaunch, and save restoration.
- Capture 27: Android Back behavior.
- Captures 28–29: stable state and combat result.
- Captures 30–31: inventory presentation.

These stills have capture order but no embedded timecode; they are not assigned
invented timestamps.

## Timestamped still index

The PNG files do not contain a gameplay timecode. The timestamps below are the
filesystem capture times in Europe/Stockholm and are used only to establish
evidence order. They must not be mistaken for animation durations.

| Capture time | Evidence/state before | Trigger and observed stages | Interaction lock/restoration | Source-code match | Reusable principle | Must not be copied |
|---|---|---|---|---|---|---|
| 13:57:13–13:57:33 | Setup screen | Seat composition → tutorial dismissal → stable setup | Tutorial blocks the board until dismissed | Native presenter opaque; Android Java unrelated | Stage guidance around the current task | Layout, text, portraits, frames |
| 13:58:00–13:58:43 | Setup complete | Game start → mandatory choice → selected public objective | Explicit continue/accept controls | Native presenter opaque | Selection visibly settles before play | Card row, terminology, artwork |
| 13:59:11–13:59:53 | First turn | Mandatory effect → actor focus → board/required action | Modal/tutorial blocks until dismissed | Native presenter opaque | Actor and required action remain identifiable | Modal composition and wording |
| 14:00:24–14:00:47 | Movement ready | Roll command → resolved die/result | Command unavailable while result resolves | Native dice code opaque | Ready, rolling, and resolved are distinct | Die art, exact timing, status wording |
| 14:01:05–14:01:38 | Roll resolved | Legal board emphasis → destination preview → commit option | Input shifts from roll to inspect/commit | Native route/camera code opaque | Map emphasis plus inspect-before-commit | Board geometry, glow style, camera path |
| 14:02:03 | Destination committed | Token/location focus → arrival choice/penalty alternatives | Arrival choice blocks further turn actions | Native arrival resolver opaque | Arrival location precedes consequence | Location art, rule text, command layout |
| 14:02:32 | Arrival choice resolved | Public penalty message → stable board → handoff guidance | Stable result shown before next actor | Native resolver/turn code opaque | Announce mutation once, then transfer attention | Result copy, faction treatment |
| 14:03:07 | Automated actor active | Arrival → public reward object → progress/wait status | Human input absent; resume control is platform UI only | Native automation/presenter opaque | Explain automated public progress | Fake “thinking” delay, reward artwork |
| 14:03:52–14:04:23 | App backgrounded | Resume → persistent black surface | Activity remains unusable | Native surface restoration failure; support Java does not expose cause | Always render a meaningful restoring state | The defect |
| 14:04:49–14:05:16 | Force-stop/cold launch | Splash → menu | Normal launch gate | Marmalade activity/bootstrap | Recovery path remains legible | Branding and splash assets |
| 14:05:41–14:06:18 | Saved-session list | Select save → resume → stable gameplay phase | Explicit resume command | Game save code opaque; Fragment parcel classes are unrelated | Restore recognizable state and actor | Save layout, portraits, local schema |
| 14:06:45 | Active automated state | Android Back → quit confirmation | Destructive exit requires confirmation | Android activity lifecycle; game dialog opaque | Safe explicit destructive navigation | Dialog layout/icons/text |
| 14:08:11–14:08:42 | Combat active | Both sides → raw rolls/base values → totals/result → return to board | Combat composition owns focus until resolution | Native combat presenter opaque | Keep arithmetic concurrently auditable | Combat layout, names, art, stat terms |
| 14:09:14–14:09:43 | Stable turn | Context panel → shared progress comparison | Optional overlay; turn action remains visible behind | Native presenter opaque | Separate public comparison from private control | Progress layout, labels, portraits |
| 14:15:33 | Third cold boot | Splash shown again | Bootstrap only | Marmalade activity/bootstrap | Repeated cold launch remains recoverable | Branding and assets |

## Source-code correlation

No readable reference module could be correlated to a gameplay timestamp.
Generic `Animator*`, `ViewPropertyAnimator*`, Fragment transition/state,
`CancellationSignal`, `ViewDragHelper`, and `ScrollerCompat` files describe
Android framework behavior only. The camera, token, dice, arrival, reward,
combat, handoff, and save implementations remain in the opaque S3E/DTRZ
payload. Consequently every gameplay sequence is classification C
(behavioral-reference-only), never A or B.

## System findings

- **Turn start:** actor identity and the current action stay visible.
- **Movement:** the player sees roll, options, preview, travel, and arrival as
  separate semantic states.
- **Arrival:** the location settles before the consequence appears.
- **Reward/penalty:** the mutation is named and remains visible long enough to
  understand.
- **Automated turn:** progress copy explains why the viewer is waiting.
- **Combat:** both sides and the final result are kept together.
- **Handoff:** the previous result clears before the next actor takes focus.
- **Restoration:** a saved stable state is useful; the persistent black screen
  after background/resume is a defect and was explicitly rejected.

## Original Ashen Reach translation

The reusable principle is a state-driven public sequence. Ashen Reach expresses
it through the existing server projection, board, art, fonts, dice, map routes,
and industrial signal language. No reference-specific visual or textual
expression is used.
