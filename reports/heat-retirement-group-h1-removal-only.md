# Heat Retirement Group H1 — removal only

Status: implemented on `phase/heat-retirement-1x` after approval commit `d877574`. This group retires exactly three obsolete success-side Heat effects without replacement.

## Implemented stable IDs

| Stable ID | Original Heat intent | Final success rule | Preserved failure | Identity preserved |
|---|---|---|---|---|
| `cinder-gate-backlash` | Reward surviving the inner gate pulse by lowering obsolete Heat | Success has no additional effect | Suffer 2 Wounds through the existing preventable Wound pipeline | Blue hazard, Signal 12, severity 5, inner rare, three graph references, existing art and lore |
| `mirror-rot-interference` | Reward resisting mirror corruption by lowering obsolete Heat | Success has no additional effect | Suffer 1 Wound through the existing preventable Wound pipeline | Blue hazard, Guile 11, severity 4, middle uncommon, two graph references, existing art and lore |
| `webglass-snarefield` | Reward escaping the route-memory trap by lowering obsolete Heat | Success has no additional effect | Suffer 1 Wound through the existing preventable Wound pipeline | Blue hazard, Guile 9, severity 3, middle uncommon, three graph references, existing art and lore |

No difficulty, reward, trophy, movement, Salvage, Scar, temporary modifier, Global Escalation, persistence, graph, art, lane, type, card count, or failure effect changed. Passing each hazard still avoids its existing failure consequence; it grants no substitute benefit.

## Authoritative behavior

The three canonical definitions omit `successEffect`. The server resolves an H1 success as `effect: null`, records a non-empty `Success: no additional effect.` outcome, stores no `pendingEffect`, creates no note, and proceeds through the ordinary resolution lifecycle. A duplicate check request is rejected by the existing phase/source rules. Reconnect reconstructs the visible success without creating a retired effect, and continuation completes without a `RESOLUTION_APPLIED` event.

Failures continue through the pre-existing Wound authority. H1 adds no Wound rule: Cinder already owned `take_wound 2`; Mirror-Rot and Webglass already owned a one-Wound sequence. Normal prevention, actual-delta, recall, Scar-threshold, scenario-hook, deduplication, and reconnect behavior are unchanged.

## Compatibility and validation

- The three `lose_heat` content branches and their `heat` resource tags are removed.
- Their stale construct-specific entries are removed from `LEGACY_HEAT_EFFECT_APPROVALS`.
- Global legacy Heat parsing and no-op support remain intact for saved logs and the fourteen still-blocked/current Threat definitions.
- `hazardThreatCardSchema` permits a missing success effect only for the exact H1 stable-ID allowlist. Any other hazard without `successEffect` fails with `Hazard threats require a success effect unless explicitly retired`.
- Check and solo-reroll actions now permit an authoritative `null` effect. This represents absence of a consequence, not a new effect type or broadly authorable content value.
- No schema accepts an arbitrary unsupported replacement effect.

## Phone and TV presentation

Existing projections and components are reused. For H1 successes:

- the outcome title remains `Check passed`;
- the outcome text is `Success: no additional effect.`;
- the effect-row collection is empty, so no blank consequence row is rendered;
- public result deltas contain no Heat entry;
- no internal compatibility field is projected;
- card art, lore, stat, difficulty, and inspection identity are unchanged.

Failure presentation remains the normal Wound result. No phone or TV component, control, focus mode, or layout changed.

## Focused coverage

`src/game/engine/__tests__/heatRetirementH1RemovalOnly.test.ts` proves:

- the exact three-ID population, stable identity, lane/type/difficulty/severity/region/rarity, graph frequency, art, totals, and non-empty text;
- absence of Heat/Risk content, replacement effects, and stale Heat approvals;
- narrow missing-success schema validation;
- success `effect: null`, no pending/replacement state, readable phone/TV outcome, duplicate rejection, and reconnect completion without replay;
- unchanged 2/1/1-Wound failures and ordinary Wound processing;
- the exact fourteen remaining Heat-linked Threat IDs;
- unchanged Glass-Chime and Spindle typed modifiers.

Legacy-validation regression tests retain strict manifest uniqueness and unsupported-construct rejection. The broader requested verification stack is recorded in the implementation commit handoff.

Final verification passed: content validation (109 Threats), typecheck, 54 focused H1/legacy/Glass-Chime/Spindle tests, all 511 engine tests, all 255 client tests, all 992 repository tests, asset audit (404/404 present, no release blockers), and the production build. Both source Heat-audit report hashes remained unchanged.

## Playtest watchlist

H1 is intentionally balance-neutral relative to the current runtime because all three removed branches were compatibility no-ops. Still watch for:

- a success screen that feels visually unfinished despite its explicit summary;
- a solo emergency reroll into success accidentally creating a note or pending state;
- scenario-specific hooks reacting to the successful test as they did before;
- failure Wound prevention and recall continuing exactly as before;
- any stale phone/TV client displaying the removed compatibility effect from cached content.

## Remaining boundary

Approved but unimplemented: `choir-static-burst`, `lantern-moth-swarm`, `crown-bell-baron`, `pale-contract-collector`, `soot-stained-cutpurse`.

Blocked and unchanged: `ashen-doppelganger`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `marrow-tax-auditors`, `memory-tax-gate`, `relay-husk`, `signal-rotted-engineer`, `siren-relay-echo`.

The +116-card expansion remains unapproved.
