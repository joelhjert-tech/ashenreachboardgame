# P19 fullscreen audit

The phone uses the standard Fullscreen API only after an explicit user tap.
Entry and UI exit worked on the physical Galaxy S24 FE. Required action and
room state remained intact, and no game command was sent.

Physical Back precedence initially exposed a real defect: the active-room
history guard offered Leave Game before exiting fullscreen. The guard now
exits `document.fullscreenElement` first. A physical retest proved:

1. an open in-app navigation/detail closes first;
2. the next Back exits fullscreen;
3. no Leave Game dialog appears for that fullscreen exit.

Chrome 150 retained visible browser chrome and the same approximately 338 × 601
CSS viewport in this tab configuration even while `document.fullscreenElement`
was set. Browser fullscreen therefore cannot promise removal of every Android
surface. Denial remains a handled, non-gameplay error path.
