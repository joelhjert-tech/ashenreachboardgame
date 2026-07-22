# P15 Release Performance

Browser instrumentation sampled a repeated 30-state campaign with five full reconnects.

| Metric | Before | After |
|---|---:|---:|
| Heap | 13.4 MB | 13.4 MB |
| Outstanding timeouts | 0 | 0 |
| Active intervals | 1 | 1 |
| Animation frames | 0 | 0 |
| Listener balance | 204 | 173 |
| DOM nodes | 73 | 162 |

The DOM delta reflects different sampled screens; no duplicate panels or monotonic accumulation was observed. Repeated image requests align with five intentional full reloads and did not grow heap usage.

Production build completed without a new warning. Largest emitted chunks were the admin registry (289.10 kB), phone app (246.07 kB), TV app (206.35 kB) and main bundle (195.22 kB), all before gzip. Broad bundle optimization is not a release blocker for this pass.

The scenario browser runner left nine QA server process trees alive on Windows. They caused a correctly scoped shuffled aggregate to exceed its 15-minute execution window. P15 stopped those trees and the subsequent standard aggregate completed cleanly; automatic child-tree cleanup remains a non-blocking QA-runner follow-up.
