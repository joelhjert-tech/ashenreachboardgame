# Scars, Wounds, and Heat comparison

## Current implementation

| Property | Heat | Scars | Wounds |
|---|---|---|---|
| Stored as | `character.heat: number` | `character.scars: string[]` stable Scar IDs | `character.wounds: number` |
| Visible to player | Main status removed; costs may appear as “Risk”; compatibility logs can mention legacy pressure | Phone/TV affliction presentation and card data | Regular operative/status, test, battle, and healing presentation |
| Temporary or persistent | Persisted compatibility number; generic gain/loss disabled | Persistent owned afflictions | Persistent injury count until healed/recall/reset |
| Maximum/threshold | Required session `heatThreshold`, but generic trigger disabled; field reused by Mirror pressure | No universal numeric threshold proven; IDs and card effects | `woundThreshold` drives recall/defeat handling |
| Gained from | Direct seeds/rare direct paths; authored generic effects are no-ops | `gain_scar`, recall/threshold flow, authored Scar systems | `take_wound`, battle/test consequences, costs |
| Removed by | Direct server reduction exists; generic `lose_heat` is no-op | Scar-specific rules; no blanket removal inferred | `heal_wound`, recovery/services, recall rules |
| Used as cost | `heatCost`, shop `cost.heat` metadata remain | No general Scar activation currency established | Explicit Artifact/follower activation costs exist where approved |
| Affects defeat | Old threshold action remains but server does not trigger it | Scars are lasting aftermath, not immediate threshold | Yes; wound threshold recalls/scars operative |
| Affects tests | No general modifier; legacy “has heat” key now checks Scars | Individual Scar effects/abilities can affect tests | Consequences and eligibility can depend on wounds |
| Survives reconnect | Yes, as character state | Yes | Yes |
| Used by content | 90 mechanical-Heat-shaped content files, mostly legacy/no-op | Scar catalog and typed effects | Broad active consequences and healing |
| Test coverage | Heavy compatibility/fixture coverage | Active UI/engine/server coverage | Active engine/server/UI coverage |
| Intended role | Compatibility only unless separately redesigned | Lasting consequences/persistent afflictions | Immediate bodily harm and defeat pressure |

## Unsafe equivalences

1. **One Heat is not one Scar.** Heat was numeric and potentially frequent; a Scar is an identified persistent condition with authored behavior.
2. **One Heat is not one Wound.** Wounds advance recall/defeat and can be paid only in explicitly authorized windows.
3. **Heat threshold is not automatically Loss Pressure.** One is per-session legacy state; Loss Pressure is scenario-level defeat progress.
4. **Heat gain is not automatically Global Escalation.** Escalation changes public scenario difficulty and can affect all players.
5. **Heat cost is not automatically Salvage.** Salvage is an economy resource and changes shop/item value.

## Mapping analysis by role

| Legacy role | Candidate outcome | Analysis |
|---|---|---|
| Frequent minor personal penalty | No mapping / remove | Turning frequency into permanent Scar accumulation is punitive; removal may be correct where effect has already been intentionally retired |
| Lasting supernatural affliction | Draw/gain a specific Scar | Thematic fit, but requires a stable Scar ID, rarity/frequency rebalance, UI, and save compatibility |
| Immediate bodily consequence | Wound | Only if the authored fiction is injury and increased recall pressure is intended |
| Scenario-wide worsening | Loss Pressure or Global Escalation | Suitable only when the effect is explicitly scenario-wide; changes shared balance and public information |
| Gear activation friction | Charge, Salvage, Wound, or cooldown | Must be chosen item-by-item; each changes frequency, economy, or lethality |
| Cooling/reduction reward | Remove or replace reward | Reducing a retired value is not a reward. Substitute only after valuation analysis |
| Heat threshold gate | Scenario-specific parameter | Mirror pressure already demonstrates the need for a named, local threshold |

## Frequency and severity warning

Heat-shaped consequences occur across dozens of cards. Scars are qualitatively heavier because they persist as identified afflictions. A mass conversion would increase permanent punishment, create farming/avoidance incentives, alter cooperative difficulty, and make legacy saves inequitable.

## Scar lifecycle facts

- Scars have stable catalog IDs and are stored on the operative.
- Wound-threshold recall can append a Scar.
- The phone can present Scar affliction effects.
- Scar prevention/reaction behavior must be verified per current pending state; it cannot be inferred from Heat compatibility.
- “Scar-Sink Prayer” is a player-facing name over legacy ID `heat-sink-prayer`; the ID is not evidence that Heat remains its mechanic.

## Wound lifecycle facts

- Wounds are an integer with a session threshold.
- Active rules can take and heal Wounds.
- Reaching threshold invokes canonical recall/defeat handling and can add a Scar.
- Some approved item/follower activations can use Wounds as explicit costs.
- No general permission exists to pay Wounds voluntarily.

## Unknowns requiring design decisions

- Intended replacement for every no-op card consequence.
- Intended currency for Black Route Fuse and Heat-cost shop services.
- Whether any old nonzero Heat save should preserve value, discard it, or receive compensation.
- Whether the direct reduction path is still meant to confer value.
- Whether any `lossCondition: heat` card is reachable in current catalog flow.
