# Scar System QA Index

All captures use authoritative QA fixtures that call the same Scar choice, projection, and threshold functions as normal play. Images are report assets only.

| Screenshot | Viewport | State | Review |
|---|---|---|---|
| `reports/ui/scar-system/phone-choice-390x844.png` | 390x844 | Owner choice | Two cards, full rules, explicit buttons, no internal IDs |
| `reports/ui/scar-system/phone-choice-reconnect-390x844.png` | 390x844 | Choice after reconnect | Same offer and owner controls restored |
| `reports/ui/scar-system/phone-third-scar-warning-390x844.png` | 390x844 | Third Scar | Retirement consequence visible before confirmation |
| `reports/ui/scar-system/phone-sable-machine-choir-removal-390x844.png` | 390x844 | Purification | Exact owned card and 4-Salvage cost |
| `reports/ui/scar-system/phone-adaptation-available-390x844.png` | 390x844 | Owner Adaptation available | Scar name, exact effect, one remaining use and owner-only action |
| `reports/ui/scar-system/phone-adaptation-used-390x844.png` | 390x844 | Adaptation consumed | Disabled control gives the canonical once-per-round reason |
| `reports/ui/scar-system/phone-adaptation-reconnect-390x844.png` | 390x844 | Consumed state after reconnect | Persisted usage prevents replay and restores the disabled reason |
| `reports/ui/scar-system/tv-choice-1920x1080.png` | 1920x1080 | Public offer | Both cards and affected operative, no controls |
| `reports/ui/scar-system/tv-choice-1366x768.png` | 1366x768 | Public offer | No overflow at minimum TV viewport |
| `reports/ui/scar-system/tv-choice-reduced-motion-1366x768.png` | 1366x768 | Reduced motion | Same information with transitions disabled |
| `reports/ui/scar-system/tv-third-scar-retirement-1366x768.png` | 1366x768 | Retirement | Public outcome without private replacement choices |
| `reports/ui/admin-simulation-lab/admin-library-scar-editing-1440x900.png` | 1440x900 | Admin Scar editor | Stable ID, source filter, typed structured fields and artwork workflow |
| `reports/ui/admin-simulation-lab/scar-choice-prompt-1440x900.png` | 1440x900 | Detached simulation choice | Canonical gain effect pauses on two deterministic candidates |
| `reports/ui/admin-simulation-lab/scar-simulation-state-diff-1440x900.png` | 1440x900 | Detached simulation result | Selected Scar, deck/phase diff and ordered continuation trace |
| `reports/ui/admin-simulation-lab/scar-adaptation-activation-1440x900.png` | 1440x900 | Detached Adaptation activation | Canonical owner activation, +1 calculation and detached activation event |

## Corrective visual passes

The first pass reused generic action rows and truncated the two options. The second pass used full vertical cards but pushed the second action below the phone viewport. The final pass uses a two-column industrial choice layout, shorter card art, compact warning copy, and 44px minimum confirmation targets. The current step, source, count, Burden, Adaptation, and consequence remain visible without horizontal overflow.

The Admin evidence pass initially connected to a QA-only server where editing was correctly disabled. It was rerun against an isolated development server with both `--qa-fixtures` and `--admin-content-editor`; all three new captures passed document and column overflow checks. The Simulation Lab remained detached and reported the canonical prompt and `SCAR_SELECTED` continuation in its ordered trace.

The owner-control capture initially exposed a one-line ellipsis that hid part of the exact Adaptation effect. The optional battle-action sublabel now wraps within its existing card; the affected available/used/reconnect captures were rerun with no horizontal overflow or console errors.

## Privacy and accessibility

- Only the owner phone receives selection/removal IDs and buttons.
- Only the owner phone receives optional Adaptation controls and server-projected targets; TV remains actionless.
- Other phones receive a public waiting state.
- TV receives public card identities and outcome only.
- Controls have descriptive accessible labels even where the visible label is compact.
- Scar choice does not rely on color alone: source, title, Burden/Adaptation headings, border treatment, and text all communicate state.
- Reduced motion changes animation only.

## Four-seat critique

### New player

The decision states what happened, what each card costs and grants, and what a third Scar does. The source label and explicit Choose button make the next action clear.

### Optimizer

Both full rule pairs are visible together. Stable offers, global uniqueness, source-event replay protection, and bottom-of-deck returns prevent reconnect rerolls and duplicate ownership.

### Family/casual player

Two choices fit side by side at 390x844 and use one confirmation each. The third-Scar warning is direct without introducing a second rules screen.

### Rules lawyer

The UI displays the authoritative owner, source, current count, offered stable cards, exact purge cost, and deferred threshold consequence. It never claims retirement before the resolution stack finishes.

## Remaining combinations

Synthetic transform/custom scenario policies dispatch through injected typed handlers in focused tests. No production scenario supplies either handler, so unsupported data-only policies reject visibly. Human full-session balance remains the next evidence needed.
