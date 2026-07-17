# Heat retirement H5B: severe Wound implementation

Status: IMPLEMENTED. Approval source: `bfd9616 docs: approve severe heat threat retirements` and `reports/heat-retirement-h5a-wound-scar-approval.md`.

## Implemented stable IDs

- `ashen-doppelganger`
- `hymn-scarred-zealot`

Both definitions were revised in place. Stable ID, title, lane, type, stat, difficulty, severity, region, rarity, art lookup, graph membership, success behavior, reward/Trophy behavior, and total card count remain unchanged.

## Final rules

### `ashen-doppelganger`

The obsolete `gain_heat 2` loss represented severe mirrored bodily injury. It is now one atomic `take_wound 2` combat-loss effect. Player-facing rule: **If you lose this battle, suffer 2 Wounds.**

The request is preventable through the existing Wound pipeline. No prevention applies 2 Wounds once; prevention of 1 applies 1 Wound once; prevention of 2 applies none. It is not split into two effects, stages, prevention windows, source events, or threshold checks. Severity remains 4. Three canonical graph references and the immediate recall possibility remain the primary playtest risk.

The existing reward mismatch is deliberately preserved: victory automatically awards 3 Trophy points and creates a 3-value Trophy Pile entry, then the authored `gain_trophy 3` grants another 3 Trophy points. H5B does not normalize the 6-point/3-value result.

### `hymn-scarred-zealot`

The obsolete `gain_heat 1` loss represented ordinary physical pressure from a common Choir footsoldier. It is now `take_wound 1`. Player-facing rule: **If you lose this battle, suffer 1 Wound.**

The one Wound is preventable through the same existing path. Full prevention applies no Wound. The card name does not create a Scar rule. Its automatic 1 Trophy point, 1-value Trophy Pile entry, and authored silencing note remain unchanged. The approved retirement severity is 2; the base card severity remains 1.

## Prevention, recall, Scar, and defeat sequencing

For both cards the server resolves the battle, selects the authored loss effect, applies existing prevention to that one effect, commits the final actual Wound delta once, and then runs the existing threshold lifecycle once. Prevention can therefore avoid recall or change whether the threshold is crossed.

Neither card emits recall, grants a Scar, creates card-specific pending Scar state, or defines defeat behavior. If the final Wound total reaches the threshold, the normal lifecycle recalls the operative once and awards/resolves the normal recall Scar once. Existing no-active-operative and defeat handling remains authoritative. A fully or partially prevented consequence cannot create a false recall, Scar, or defeat result.

## Replay and reconnect protection

The implementation adds no new persistence. Existing active resolution, pending effect, event log, threshold handling, Scar state, and completed resolution state provide the source identity and replay guards. Focused coverage round-trips pending and completed states, rejects repeated commitment after the pending effect is cleared, applies Wounds once, spends automatic prevention once, creates threshold state once, and preserves reward/Trophy processing once.

## Phone and TV presentation

The exact failure rules are authored on the cards. Existing phone and TV Threat/Wound projections are reused. Owner-private object/reaction state remains absent from other phones and TV; public results contain only the existing public-safe outcome and Wound deltas. No Heat row, direct Scar instruction, direct recall control, source-event ID, or consequence ID was added.

## Tests

`src/game/engine/__tests__/heatRetirementH5BSevereWounds.test.ts` covers:

- exact content, identity, text, graph membership, art path, lane totals, and removal from legacy Heat approvals;
- Ashen atomic amount 2, one result delta, partial prevention, full prevention, threshold timing, and no four-Wound replay;
- Hymn amount 1, full prevention, and the normal recall-only Scar route;
- wrong-seat rejection and server-derived authored amounts despite a forged internal action payload;
- reconnect before and after commitment, stale replay rejection, phone/TV privacy, and absence of internal IDs;
- Ashen's unchanged 6-point total and separate 3-value Trophy Pile entry;
- byte-level hash pins for the four blocked definitions.

The focused H1–H5B and legacy validation set passes 156 tests. Content validation reports 109 Threats; typecheck passes; engine regression passes 573 tests in 46 files; client regression passes 255 tests in 26 files; and the combined suite passes 1,054 tests in 98 files. The asset audit reports 404/404 present with no blockers, and the production build passes. `git diff --check` and `git diff --cached --check` pass. The first `npm.cmd run test -- --run ...` focused wrapper timed out without suite output; the exact Vitest files were rerun directly and passed.

## Remaining blocked

- `false-route-procession`: destination selection and topology remain unresolved; handle in a dedicated movement approval.
- `gateblind-pulse`: Global Escalation cap and threshold timing remain unresolved.
- `marrow-tax-auditors`: repeated Salvage starvation risk remains unresolved.
- `memory-tax-gate`: private choice ownership and lifecycle remain unresolved.

The +116-card expansion remains unapproved. H5B changes no scenarios, missions, Contracts, items, economy, movement, Equipment, Salvage, Global Escalation, schema, reducer, server handler, or client UI lifecycle.
