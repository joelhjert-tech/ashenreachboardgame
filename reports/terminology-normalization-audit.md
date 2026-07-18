# Terminology normalization audit

## Canonical vocabulary

| Concept | Canonical player term | Internal/legacy aliases | Status and recommendation |
|---|---|---|---|
| Persistent personal affliction | **Scar** | Heat, legacy pressure | Use Scar only for stable, lasting conditions; never mass-convert numeric Heat |
| Immediate injury | **Wound** | damage (informal) | Use Wound for injury and recall pressure; “damage” only as explanatory prose |
| Scenario defeat progress | **Loss Pressure** | collapse track, defeat pressure | Canonical player term; retain internal aliases only where schema compatibility requires |
| Scenario difficulty ratchet | **Global Escalation** | escalation level | Separate from Loss Pressure; do not merge |
| High-tier item | **Artifact** | relic (generic/historical) | Artifact is the tier |
| Artifact with charges | **Charged Artifact** | charged relic, relic state | Player-facing term; exact-instance charges remain authoritative |
| Artifact shop | **Relic Dealer** | relic shop | Location/service name, not an item tier |
| Legacy Artifact ID | `heat-sink-prayer` | Scar-Sink Prayer | Keep internal ID; display Scar-Sink Prayer |
| Solo play | **Solo Run** / Single-player | solo | Choose one UI label consistently; schema may keep `single-player` |
| Cooperative play | **Co-op** | cooperative | Player-facing mode |
| Competitive hidden-goal play | **Rivalry** | ruthless | `ruthless` is an internal/historical alias unless current mode selector exposes it |
| Scenario variant | **Nemesis Relay** | nemesis | Not a synonym for Rivalry |

## Attribute conflict

The user-supplied audit checklist names Cunning, Guile, Strength, Understanding, and Faith. Current runtime schemas, content, projections, UI, and tests instead use **Command, Grit, Signal, Guile, and Forge**. Repository behavior is authoritative for the present game. Therefore:

- Canonical current attributes: **Command, Grit, Signal, Guile, Forge**.
- Guile is the only shared term.
- Cunning, Strength, Understanding, and Faith are deprecated/unimplemented terminology unless a separate redesign is approved.
- No documentation-only normalization may pretend the older set is active.

## Heat leakage routes

| Surface | Visible form | Trigger | Normal-play reachability | Recommendation |
|---|---|---|---|---|
| Phone action cost | `<n> Risk` | Heat-cost gear/action | Reachable if item/action offered | Replace only with redesigned exact cost; “Risk” currently hides the unit |
| TV shop overlay | `<n> Risk`, risk styling | Heat-cost service | Reachable at applicable shop | Redesign service and projection atomically |
| Result/log summary | “legacy pressure ignored” | Old Heat effect resolves | Reachable through legacy cards | Replace per-card outcome; suppress migration jargon from players |
| Card text/content | Heat, cooling, venting language | Draw/inspect affected card | Many catalog entries | Distinguish atmospheric prose from resource claims; rewrite mechanical claims |
| Ability/item display | legacy names/descriptions | Inspect inventory | Some active catalog items | Keep stable IDs hidden; use Scar-Sink Prayer and approved rules |
| Error/debug output | raw field/effect key | Invalid or debug state | Mostly tests/debug, possible error fallback | Map to safe canonical copy |
| Missing-asset fallback | `heat-sink-prayer` filename/ID | Missing label/art path | Exceptional but production-capable | Ensure fallback uses display name, not raw ID |

The main player cards no longer intentionally display a Heat meter. This is good, but projection fields and indirect “Risk” presentation mean the retirement is incomplete.

## Loss Pressure and Global Escalation

They are distinct current systems:

- Loss Pressure is progress toward scenario defeat/collapse.
- Global Escalation is a scenario difficulty modifier/threshold track.
- Some legacy Heat effects may ultimately map to either, but only through individual design decisions.
- A player-specific penalty must not silently become shared Loss Pressure.

## Modes

Current code distinguishes session shape, interaction mode, and scenario variant. Documentation should not flatten them:

- Single-player/solo describes seat count/session shape.
- Co-op and Rivalry describe player interaction/victory information.
- Ruthless is a legacy/internal alias requiring a UI inventory before deprecation.
- Nemesis Relay is a named scenario/game mode, not a hostile player role.

## Legacy phase terminology

Searches found historical “Heat threshold,” “cooling,” and “legacy pressure” terminology coexisting with current challenge, confrontation, Loss Pressure, and Global Escalation language. Canonical phase names must come from current authoritative session actions. Historical reports should be labeled, not rewritten as current rules.

## Recommended lint boundaries

A future terminology scan should reject player-facing mechanical patterns such as `gain Heat`, `lose Heat`, `spend Heat`, `Heat cost`, and `Heat threshold`, while allowing:

- stable ID `heat-sink-prayer`;
- compatibility schema/property names in a narrow allowlist;
- historical reports;
- atmospheric uses where heat means temperature and does not imply a resource.

This must be context-aware; banning the substring `heat` would incorrectly flag legitimate words and art prompts.
