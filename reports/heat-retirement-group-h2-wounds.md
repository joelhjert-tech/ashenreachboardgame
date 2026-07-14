# Heat Retirement Group H2 — normal Wound pressure

Status: implemented on `phase/heat-retirement-1x` after H1 commit `651df8b` and triage commit `d877574`. This group replaces exactly two obsolete Heat failures with approved normal Wounds.

## Implemented stable IDs

| Stable ID | Original Heat intent | Final success | Final failure | Requested / preventable | Identity preserved |
|---|---|---|---|---|---|
| `choir-static-burst` | Violent signal feedback accumulated obsolete Heat | Advance `choirStaticContained` by 1, unchanged | If you fail, suffer 1 Wound | 1 / yes | Blue hazard, Signal 9, severity 3, middle uncommon, four graph references, existing art and lore |
| `lantern-moth-swarm` | Success cooled obsolete Heat; failure added obsolete Heat for fire exposure | No additional effect | If you fail, suffer 1 Wound | 1 / yes | Blue hazard, Signal 5, severity 1, outer common, two graph references, existing art and lore |

No reward, trophy, Salvage, Scar, movement, Equipment, modifier, Global Escalation, persistence, graph, art, lane, type, difficulty, card count, or scenario rule changed. Lantern's obsolete success branch was removed without replacement; Choir's scenario-progress success remains exact.

## Wound lifecycle

Each failed final Signal result creates one canonical `{ type: "take_wound", amount: 1 }` consequence. The existing server-authoritative lifecycle owns the full sequence:

1. validate the active seat and Threat;
2. record the failed check and stable source card;
3. open the existing failed-hazard reaction window with the typed Wound pending;
4. apply eligible prevention through existing character, follower, Equipment, or Artifact rules;
5. commit the actual Wound delta once;
6. invoke the normal recall and Scar threshold lifecycle when the final total reaches the threshold;
7. keep the Threat visible until continuation closes it;
8. reject replay after the pending effect is consumed.

There is no H2 reducer branch and no direct Wound mutation outside the normal effect reducer. With no prevention the requested and actual values are `1 / 1`; full prevention produces `1 / 0`, no substitute penalty, and no Wound result delta. The resulting Wound total and operative status come from authoritative state, while `CHECK_ROLLED` and `RESOLUTION_APPLIED` retain the stable card source.

## Prevention, recall, and Scars

Both Wounds are preventable. Existing prevention remains authoritative and spends only through its own validated intent or passive trigger. Focused coverage proves Ker's established Hold the Line prevention can reduce the actual delta to zero and avoid threshold recall. The existing owner-only Blackstar Ampoule failed-hazard reaction is visible only to its owner, discards once after valid use, suppresses the pending consequence, and rejects duplicate use.

Without prevention, a failure from threshold-minus-one reaches the normal Wound threshold, recalls the operative, and creates exactly one normal Scar event. Neither card authors `gain_scar`, and reconnect or replay cannot repeat the Wound, recall, or Scar processing.

## Reconnect and replay protection

Pending H2 Wounds round-trip through the existing game-state schema. Reconstructed state retains the same pending typed consequence and source. Once `RESOLUTION_APPLIED` consumes it, `pendingEffect` is null; a repeated source application is rejected and leaves Wounds unchanged. Failed-hazard prevention is likewise bound to the existing reaction identity and cannot spend twice.

## Phone and TV presentation

Existing Threat and result surfaces are reused. Before resolution, the owner phone receives only server-derived eligible object-use state; another phone receives no private controls, and TV receives none. After application, phone and TV show the public one-Wound result once. Full prevention produces the existing Hold the Line prevention note without a false Wound delta. No client calculates Wound totals, and no Heat row, compatibility field, replacement control, or new focus mode is introduced.

## Focused coverage

`src/game/engine/__tests__/heatRetirementH2Wounds.test.ts` proves:

- exact identities, one-Wound effects, success rules, art, graph counts, and 26 / 35 / 48 / 109 totals;
- no active Heat, direct Scar, Salvage, movement, modifier, or escalation replacement;
- the narrow four-ID hazard success-omission allowlist after Lantern's approved success retirement;
- one pending preventable Wound, one actual delta, and normal Threat continuation;
- full prevention, threshold recall, normal Scar creation, pending reconnect, stale replay rejection, and single-use failed-hazard Artifact reaction;
- Choir scenario progress and Lantern no-additional-effect success;
- H1, Glass-Chime, Spindle, the remaining Heat-linked definitions, and legacy authoring guards.

Final verification passed: content validation (109 Threats), typecheck, 111 focused H2/Wound/prevention/Scar/modifier tests, all 526 engine tests, all 255 client tests, all 1007 repository tests, asset audit (404/404 present, no release blockers), and the production build. Both source Heat-audit report hashes remained unchanged.

## Playtest risks

- Choir appears in four canonical graph locations, so its new real attrition deserves the planned isolated balance checkpoint.
- Lantern is common and outer-ring; watch whether two graph references create excessive early recall despite its low difficulty.
- Confirm prevention messaging remains understandable when requested 1 becomes actual 0.
- Confirm repeated visits never surface stale owner reactions or replay a committed Wound.
- Watch combined Blue-lane Wound density without compensating through rewards or easier tests.

## Remaining boundary

Approved but unimplemented H3: `crown-bell-baron`, `pale-contract-collector`, `soot-stained-cutpurse`.

Blocked and unchanged: `ashen-doppelganger`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `marrow-tax-auditors`, `memory-tax-gate`, `relay-husk`, `signal-rotted-engineer`, `siren-relay-echo`.

H3 must reuse the existing B2A floor-zero Salvage-loss infrastructure and must not enter Salvage Ledger, shop-transaction, mission, Contract, or completed-contract hooks. The +116-card expansion remains unapproved.
