# TV Movement, Shop, Lobby, and Route-Aid Rework

## Delivery status

The production movement, defeat recovery, and charged route-aid systems are implemented. The new TV shop and scenario-selection presentations are development-only approval prototypes; normal setup and shop presentation are unchanged until approval.

## Movement presentation

- Departure uses a 300 ms transition inside a 380 ms presentation hold.
- Normal route segments use 560 ms inside 640 ms.
- Cross-reach route segments use 740 ms inside 840 ms.
- Arrival uses 620 ms inside 720 ms.
- A server-authored presentation event identifies each journey.
- When an authenticated host TV is present, the owner phone remains on `Movement playing on TV` until the TV reports `MOVEMENT_PRESENTATION_COMPLETED`.
- The server accepts only the matching event identifier, ignores duplicate acknowledgements, and releases the gate after a bounded route-derived fallback if the TV disappears.
- Headless sessions and rooms without a connected host TV do not wait for an acknowledgement that cannot arrive.
- Reconnect restores the authoritative destination without replaying arrival effects.
- Reduced motion completes immediately while preserving the same destination and state ordering.

## Shop prototype

The approval prototype reuses the public shop projection and carousel. It adds an original Ashenreach establishment interior, a readable shopkeeper, route-aid stock, adjacent offer previews, buyer identity, price, availability, and public transaction results. It does not expose private funds, private sales, hidden stock, or Artifact choices.

Development URL:

`/?view=tv&tvPrototype=shop`

Evidence:

- `.tmp-playtest/tv-movement-shop-lobby-route-aid/shop-1366x768-approved.png`
- `.tmp-playtest/tv-movement-shop-lobby-route-aid/shop-1600x900-approved.png`
- `.tmp-playtest/tv-movement-shop-lobby-route-aid/shop-1920x1080-approved.png`

The existing server map restriction remains authoritative: map mode is restored before a shop visit and is rejected while the visit is active.

## Expedition Briefing prototype

The approval prototype replaces the unrelated rotating fixture with a selected expedition briefing. It presents mode, player count, host, artwork, difficulty, duration, objective, pressure rule or `No loss pressure`, and the final confrontation. Scenario changes use a restrained crossfade and panel transfer; reduced motion updates immediately.

Development URL:

`/?view=tv&tvPrototype=scenario`

Evidence:

- `.tmp-playtest/tv-movement-shop-lobby-route-aid/scenario-1366x768.png`
- `.tmp-playtest/tv-movement-shop-lobby-route-aid/scenario-1600x900.png`
- `.tmp-playtest/tv-movement-shop-lobby-route-aid/scenario-1920x1080.png`

The setup browsing intent remains deferred until this prototype is approved.

## Defeat recovery

- The complete defeat presentation remains visible.
- The setup host receives one `Start New Game` action on phone and TV.
- `RETURN_TO_LOBBY_REQUESTED` is accepted only from the setup host after an authoritative end state.
- Room identity and connected seats are preserved.
- Readiness, operative selection, missions, scenario progress, and previous-game state are cleared through the existing restart path.
- Non-host phones remain waiting for the host.
- Victory retains its previous end-state behavior.

## Charged route aids

Four original route aids are available:

| Aid | Kind | Cost | Passive value | Charges |
|---|---|---:|---|---:|
| Breachline Sextant | Artifact utility | 5 Salvage | +1 Signal while equipped | 2 |
| Gateward Spindle | Artifact utility | 5 Salvage | +1 Forge while equipped | 2 |
| Mara Vell, Cinder Cartographer | Unique Follower | 4 Salvage | Guide | 2 |
| Knuckle, the Rail-Scent Hound | Unique Follower | 4 Salvage | Scout | 2 |

The owner may activate exactly one aid before rolling movement. The request carries the exact owned instance and movement revision. The server validates the charge, ownership, equipment requirement, timing, and destination, then supplies a deterministic canonical route to a legal transition sector in the current reach. The piece stops on that sector. The route cannot cross a gate, bypass a blocker, override a scenario lock, or change arrival resolution. Charges never replenish.

A public `Route Aids` shop category contains unowned offers. Four original encounters award the corresponding aid on success:

- Breachline Survey Vault.
- Gateward Claim-Jacker.
- Cartographer Under Glass.
- Rail-Scent Kennelmaster.

## Original assets

New generated artwork is original to Ashenreach and registered through the canonical image pipeline:

- One 16:9 shop establishment interior.
- Four route-aid card portraits.
- Four route-themed encounter portraits.

No existing artwork was edited or removed.

## Validation

Passed:

- Typecheck.
- Content validation: 18 characters, 73 gear, 116 Threats, 26 Followers.
- Movement, arrival, global Threat bag, scenario, API, and long movement-soak tests: 112 tests.
- WebSocket room integration, including the connected host-TV path: 46 tests.
- Route-aid, phone, TV journey, shop, defeat recovery, and prototype focused tests.
- Inventory and admin library regressions: 75 tests.
- Complete client suite: 554 tests.
- Rules-only suite: 110 tests.
- Final route-aid, phone action, TV journey, shop, and prototype group: 104 tests.
- Asset audit: 525/525 present; zero missing, invalid, placeholder, or release-blocking assets.
- Production build.
- Browser prototype checks at 1366×768, 1600×900, and 1920×1080 with zero failed artwork requests and zero console errors.

The complete engine/rules suite still contains failures in pre-existing, unrelated resolution, escalation, forced-displacement, and legacy Heat-retirement work present before this rework. Task-caused catalog expectations were updated from 112 to 116 Threats and to lane totals of 30 Red, 36 Blue, and 50 Yellow. No unrelated gameplay semantics were changed to conceal those failures.

The final physical test used a Samsung Galaxy S21+ at 384×722 CSS px as the real controller with a computer browser as the 1920×1080 host. A natural Broken Seal game completed after 72 visible actions with zero phone or TV console errors, failed requests, horizontal overflow, or Canvas nodes. Reconnect restored the result-ready state without replay. Route-aid edge cases remain deterministic rather than natural-draw evidence. See `docs/qa/S21_TV_HOST_FULL_TEST_2026-07-26.md`.
