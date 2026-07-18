# Item Effect Phase 3: Exhaust Scope Gate

## Outcome

Phase 3 implementation is blocked before schema, state, engine, or UI changes. The corrected audit contains exactly six exhaust-classified canonical Artifact rows, but three lack a complete authored outcome. Implementing them would require inventing the meaning of “unstable,” which this phase explicitly forbids.

## Six audited items

| Artifact ID | Owned object | Authored activation | Reset | Equipped | Existing support | Scope result |
|---|---|---|---|---|---|---|
| `artifact-fandiablos` | Follower `fandiablos` | Threat scouting, +3 Grit battle support, +2 eligible machine/lock/trap/salvage tests, wound prevention, then “Too Many Dogs” may make the action unstable | Owner's next turn | No | Companion-specific server paths and event-history once-per-turn guard | **Blocked:** the post-use “unstable” outcome is not defined as a typed effect; the Artifact summary also says the flock may cause Heat, while the follower implementation currently records a note instead. |
| `artifact-lucy-hell-puppy` | Follower `lucy-hell-puppy` | Record an ember-pup note before battle, damage, or dangerous movement | Round | No | Generic follower use and event-history once-per-round guard | Implementable after the blocked scope is resolved; effect, timing, and reset are explicit. |
| `artifact-mirror-reroll-token` | Equipped utility `mirror-reroll-token` | Reroll a failed Guile or Signal check, then mark the roll unstable | Owner's next turn | Yes | Generic once-per-turn guard; no complete authoritative reroll/instability path | **Blocked:** “mark the roll as unstable” has no typed consequence, duration, log-only designation, or scenario/pressure effect. |
| `artifact-murkclaw-gravecrow` | Follower `murkclaw-gravecrow` | Record an omen note for the current threat, route, or battle | Round | No | Generic follower use and event-history once-per-round guard | Implementable after the blocked scope is resolved; effect, timing, and reset are explicit. |
| `artifact-red-march-warbell` | Equipped weapon `red-march-warbell` | Before battle, add +2 Grit, then mark the roll unstable | Owner's next turn | Yes | Special battle-modifier path plus generic once-per-turn guard | **Blocked:** “unstable” is undefined. The gear also declares `heatCost: 1` while the Artifact already applies +1 Heat on acquisition, so it is unclear whether activation should add Heat as the instability cost. |
| `artifact-rune-eye-raven` | Follower `rune-eye-raven` | Record a route-memory omen note before a threat draw or dangerous route choice | Round | No | Generic follower use and event-history once-per-round guard | Implementable after the blocked scope is resolved; effect, timing, and reset are explicit. |

## Decisions required

1. Define Fandiablos “Too Many Dogs” on a mayhem roll of 1: typed Heat, another typed consequence, or log-only flavor.
2. Define what an unstable Mirror reroll does and when that consequence resolves.
3. Define what an unstable Red March Warbell roll does, including whether `heatCost: 1` is paid on every activation or is obsolete acquisition metadata.

## State and implementation status

No exhaust schema, owned-instance state, reset logic, server activation changes, phone presentation, or content classification was added. The required exact-instance model remains to be designed after the authored decisions: exhaustion must live on each owned gear/follower instance, serialize with that object, and reset through owner-turn or round lifecycle transitions rather than event-log inference.

Blackstar, Phase 2 consumables, mission lifecycle, tier separation, charged items, both Black Route Fuse records, and all excluded systems remain unchanged.
