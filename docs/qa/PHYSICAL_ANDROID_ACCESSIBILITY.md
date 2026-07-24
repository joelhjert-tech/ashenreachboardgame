# Physical Android Accessibility Review

- Leave Game uses `role=dialog`, `aria-modal=true`, a labelled heading, and focuses Stay in Game as the safe action.
- Cancellation restores focus to the previously active control.
- Join inputs keep visible labels and logical order; errors use `role=alert`.
- Join and dialog controls are at least 44 CSS pixels high.
- Android Back closes the Samsung keyboard before page history is considered by Chrome.
- In-app details and expanded calculation/lore views close before the room-exit dialog.
- Result arithmetic retains text equivalents and does not rely on colour.
- View Details remains a 44px control; hidden detail content is not exposed until expanded.
- Reduced motion removes transition dependency without removing result information.

No TalkBack configuration was changed. The remote accessibility tree and semantic DOM were inspected instead.

## P18 closeout

- The physical Back dialog retained one logical focus target and `Stay in Game` remained the safe/default action.
- Five cancellations returned to the same required movement control; the control remained reachable and submitted once.
- The active Leave flow cleared private phone state only after the authoritative request completed.
- Hazard, battle, and endgame recordings retained text outcomes and did not depend on colour alone.
- The real keyboard retained the complete 44px Join control and approximately 49px of lower visual-viewport clearance.
- No permanent device accessibility setting was changed.
