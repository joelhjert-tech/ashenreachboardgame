# P19 phone timing evidence

| Behavior | Contract | Automated evidence | S24 FE observation |
| --- | ---: | --- | --- |
| Navigation selection collapse | 300 ms | Expanded at 299 ms, compact at 300 ms | Inventory selection rendered immediately and the chooser collapsed without covering content |
| Movement result collapse | 100 ms after authoritative render | Exact fake-timer coverage, including StrictMode and remount | Full result rendered first; compact class was observed about 145 ms after the DOM result mutation (100 ms timer plus browser frame/observer scheduling) |
| Battle result collapse | 100 ms after authoritative render | Exact fake-timer coverage | Stable compact result remained auditable; no additional action was introduced |
| Reroll result | New revision, fresh 100 ms hold | Revision-key and stale-timer tests | Automated acceptance only; no physical reroll fixture was completed |
| Reconnect result | Compact on remount | Remount test | Reload restored the stable state without replaying movement or Trophy spend |
| Arrival notice | Maximum 150 ms | Present at 149 ms, absent at 150 ms | The live movement handoff completed without delaying the encounter; the transient frame was not captured reliably |
| Arrival reconnect | No notice replay | Session-storage remount test | Reload did not replay the live movement command or encounter |

Timers are keyed to semantic result or arrival identifiers, cleaned on state
changes and unmount, and are not restarted by unrelated rerenders. The physical
measurement includes rendering and observer scheduling; it is not evidence that
the implementation timer changed from 100 ms.
