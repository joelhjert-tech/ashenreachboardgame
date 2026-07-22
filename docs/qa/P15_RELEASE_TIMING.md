# P15 Release Timing

Semantic waits use authoritative projection sequence, required-action identity, socket count and stable render state. They do not depend on animation duration or network-idle alone.

Reconnect diagnostics record pre-drop and restored sequence, closed/open observation, active socket count and patch count. The exact reconnect case passed 25/25 after correction, and completed in 1.29 seconds during the successful contended aggregate.

The first foreground aggregate exceeded the five-minute command window and is recorded as a timeout, not a pass. A monitored run under concurrent browser/client/engine activity completed in 487.00 seconds at 1,548/1,548.

Final uncontended integration completed 365/365 in 350.29 seconds. The final clean canonical aggregate completed 1,548/1,548 in 565.58 seconds, with reconnect in 1.31 seconds. A shuffled canonical attempt exceeded 15 minutes while nine leaked QA server process trees were consuming resources; it was terminated without a result and is recorded as a runner-lifecycle limitation, not a suite failure.
