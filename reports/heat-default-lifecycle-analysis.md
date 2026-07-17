# Heat default lifecycle analysis

## New-session lifecycle

Every character definition currently must contain Heat because `characterSchema.heat` is required and has no parser default. A normal session loads all 17 records, selects one or six configured characters, applies loadouts, and shallow-copies the selected character into player state. The copied value is zero. Later character-selection and replacement constructors explicitly write zero rather than trusting authored Heat. QA character MASTER ALPHA follows the same parser and clone contract when explicitly selected.

Consequently, Heat exists on every constructed character, but no mechanic depends on it and no ordinary-play resolver changes it. Omitting it from content currently prevents the roster from loading. Omitting it from a serialized game state currently prevents parsing.

## Old saves and reconnect

Old saves may carry nonzero Heat. Current parsing accepts any non-negative integer and preserves it through JSON round trips. A live verification accepted 7 and rejected a missing field as required. Reconnection retains the same authoritative character object; it neither zeroes nor converts the value. Existing compatibility tests preserve nonzero 3 together with Mirror’s independent threshold key.

Old values provide no advantage: no eligibility, payment, reward, defeat, battle, scenario, or item rule consumes them. They must never be converted into Wounds, Scars, Salvage, Loss Pressure, Global Escalation, Equipment, or another resource.

## Construction, serialization, and projections

| Boundary | Current behavior | Absence behavior | Retirement implication |
|---|---|---|---|
| Character content parse | required integer | load fails | add a dedicated content-to-runtime compatibility adapter before deleting JSON fields |
| Initial clone | copies authored zero | impossible after current parse | compatibility constructor may inject zero while runtime field remains required |
| Select/recruit | explicitly writes zero | not applicable | consolidate with the compatibility constructor later |
| Game-state parse | required integer | old/new state parse fails | make optional only in a separately approved schema phase |
| JSON serialization | emits exact stored value | omission is preserved but then fails parse | versioned parser needed before new saves omit it |
| Reconnect | retains exact stored value | cannot currently restore missing value | dual-read rules must be explicit |
| TV/phone summary | emits hardcoded zero compatibility key | client types currently expect number | retire projection keys separately; do not mistake them for the 17 authored defaults |

Two shop reducer paths assign `heat: player.character.heat`. These immutable copies preserve state while mutating Salvage/Wounds/Trophies. They do not evaluate Heat. Three server construction sites write zero. These are compatibility construction/writes outside the 17 authored-source population and must be addressed in later batches, not silently counted as active mechanics.

## Schema, generated output, and fixtures

There is no Heat schema default: both character content and embedded persisted characters require the field. `shopStockReveal.revealCost.heat` is optional compatibility metadata and is outside this authored-default population. `heatThreshold` is Mirror reflection-pressure compatibility and outside scope.

No generated catalog owns the 17 values. Character JSON is canonical input. Test fixtures repeat zero/nonzero Heat because TypeScript/Zod shapes require it. The single direct content assertion is the playable-roster zero check; compatibility tests protect no-op effects and exact old-value round trips. Fixture cleanup should follow optional-field migration rather than precede it.

## Save-versioning finding

No general save schema version, migration dispatcher, or unknown-version policy exists. The minimum future layer is: required snapshot version; version-specific parsers; ordered migration dispatcher; exact preservation of legacy Heat; optional missing-field fallback; round-trip/reconnect fixtures; explicit rejection of unknown future versions; and rollback by continuing to write the previous supported version until the new reader is proven.

Content-default cleanup can precede save migration only if a content-loader compatibility constructor supplies the required runtime zero. Stopping new-state writes or omitting persisted fields cannot safely precede optional parsing/versioning.

## Risk and four-seat critique

- **New Player:** authored defaults and stored values are invisible; removal must not reintroduce Heat/Risk or change displayed state.
- **Optimizer:** old nonzero values remain inert; absence must never become a bypass because no cost/condition may read either absence or zero.
- **Family Player:** no migration prompt or UI is needed for content quarantine; unreliable reconnect would be the unacceptable failure mode.
- **Rules Lawyer:** today absence is invalid and zero is valid; they are not equivalent. During dual read, an explicitly stored legacy value wins, missing old/new content receives only the compatibility constructor value, and schema defaults must never overwrite nonzero history.

All recommendations are pending approval.
