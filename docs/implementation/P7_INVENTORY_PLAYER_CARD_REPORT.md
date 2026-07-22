# P7 Inventory and Player-Card Relevance Filtering

## Outcome

P7 adds a thin presentation layer over the existing authoritative inventory and required-action systems. It does not change ownership, equip rules, charges, item timing, capacity, rewards, Wounds, Scars, Salvage, or command outcomes.

The owner phone now presents this hierarchy:

1. the P1 required action and its return control;
2. owned objects that the server marks relevant now;
3. essential private operative state;
4. persistent status/progression summaries;
5. the full owned collection for deliberate inspection.

## Architecture audit

### Previous player-card architecture

`PortraitControllerView` owned the live phone player-card tab. It combined the private `self` projection with the shared required-action guidance and rendered identity, all five stats, Wounds, Scars, Salvage, Afflictions, active modifiers, and equipped objects. `MobilePlayerCard` remains a smaller reusable card and was not made into a competing state model.

### Previous inventory architecture

`PhoneInventoryPanel` rendered cards prepared by `inventoryPresentation.ts`. Ownership and object values already came from `patch.self`; use controls relied on projected `objectUseStates`, but presentation timing still contained legacy rules-text fallbacks and there was no explicit authoritative relevance classification.

### Canonical authority

- Ownership, equipped instance, charges, exhaustion, suppression, and usage limits originate in server `GameState`.
- `buildPhoneObjectUseStates` remains the owner-private eligibility boundary.
- The server now adds `relevantNow`, `relevanceKind`, `relevanceReason`, and `currentContext` to that owner-only projection.
- Exact tested-skill filtering uses the existing challenge-item eligibility resolver.
- Typed `activationTiming`/`timingWindows` metadata drives timing relevance. Rules-text fallback remains only for old component fixtures or legacy projections that lack the typed fields; it is not the canonical live path.
- Use/equip commands remain existing typed intents and are revalidated by the server.

### Public/private boundary

The new relevance fields are emitted only by the phone projection. A serialized TV projection test proves that `objectUseStates` and `relevanceKind` are absent. Waiting phones receive only their own `self` inventory and their own relevance result; they do not receive the acting player's object choices, charges, or usability details. Rivalry agenda data remains on its existing private Quest projection and is not copied into general inventory.

## Player-card UX

- Player display name remains primary; operative name and role remain secondary.
- A compact essential-state panel groups Wounds, Scars, owner-private Salvage, and current public status.
- When an accessible context has a canonical tested skill, that skill sorts first and receives a text `Relevant now` marker plus its existing skill colour. Other skills remain visible.
- Movement does not fabricate a relevant skill because the canonical movement roll is not a skill test.
- Wounds and Scars remain distinct values. Scar cards and Afflictions continue through their existing owner-private sections.
- Active modifiers and equipped object summaries retain their previous authoritative sources.
- Focused battle/check screens continue to own their own operative/stat presentation; P7 does not weaken the P3 encounter takeover.

## Inventory UX

### Relevant Now

The server-derived list leads the inventory page. It distinguishes:

- `USABLE NOW`: a legal typed command exists in the current timing window;
- `PASSIVE — APPLIED`: an equipped passive modifier applies to the current tested skill;
- blocked or inactive relevance: shown with the canonical reason when the item is semantically related but cannot be used.

Unrelated cards remain in Full Collection but are not duplicated in Relevant Now. Empty relevance states explicitly tell the player that nothing owned changes the current decision.

### Full collection

Equipment, Items, Artifacts/Relics, Followers, Scars, Afflictions, progression, and active private readings retain the existing categories. Equipped/carried labels, charge meters, exhaustion state, mechanical effect, timing, extended rules, and lore keep their existing data. Empty groups do not become large panels.

The P1 shell supplies the single Return to Move/Battle/Shop/Action control above inventory. A duplicate P7 return button found in the first screenshot pass was removed from the live tab.

### Commands

Use and equip controls lock locally on first submission and show `Submitting…`; the server remains authoritative and may reject stale or invalid commands. No optimistic charge, discard, equip, or stat mutation was added. Reconnect rebuilds the panel from the current private projection, so completed effects do not replay.

## Visual corrective pass

The first browser render found three issues:

1. fixture WebSocket delivery could route the capture back to Action after the script selected Player Card or Inventory;
2. Relevant Now appeared below essential state;
3. inventory repeated the P1 Return control and long relevant-card copy consumed too much of the viewport.

The QA harness now waits for the authoritative projection before deliberately opening a passive tab. Relevant Now was moved above essential state, the duplicate Return control was removed, and contextual active-effect copy is visually clamped while complete inspection remains available.

## Accessibility and responsive behavior

- State is expressed in text, not colour alone.
- Inventory actions remain semantic buttons with the existing 44px minimum target.
- Charge meters retain accessible current/max labels.
- Skill relevance adds a visible label.
- Images retain bounded containers and the shared inspectable fallback pipeline.
- Reduced motion changes transitions only; relevance, usability, charges, and submitting state remain visible.
- Browser QA at 390×844, 360×800, 1920×1080, and 1366×768 found zero horizontal overflow and zero console errors.

## Four-seat critique

### New player

The required action remains above inventory; Relevant Now immediately answers whether owned cards matter. Explicit passive/usable/timing-locked labels and reasons reduce guessing. The duplicate Return button was removed after visual review.

### Optimizer

Relevant effects remain visible without removing the full collection. Passive modifiers are labelled as already applied, charges remain exact, and the tested-skill resolver prevents a wrong-skill item from being promoted.

### Family/casual player

Four essential values fit in one row at 390px and two rows at 360px. Relevant content precedes progression and collection detail. Long contextual ability copy is clamped to prevent the first card from swallowing the screen.

### Rules lawyer

The server, not the phone, determines the current timing, tested skill, equipped instance, suppression, use limits, and eligible command. TV serialization excludes private relevance. Immediate client locking prevents accidental double taps while existing reducer replay protection remains unchanged.

## Files changed for P7

- `src/client/shared/types.ts`
- `src/server/roomServer.ts`
- `src/client/phone/inventoryPresentation.ts`
- `src/client/phone/PhoneInventoryPanel.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/styles.css`
- `src/server/phaseOneQaFixture.ts`
- `src/server/__tests__/phaseOneQaFixture.test.ts`
- `src/client/phone/__tests__/PhoneInventoryPanel.test.tsx`
- `scripts/capture-p7-inventory-player-card.ts`
- P7 reports and QA artifacts under `docs/implementation` and `docs/qa`

These paths overlap existing dirty P0–P6 work; no staging, commit, reset, or formatting operation was performed.

## Remaining concrete risks

- Some older saved/test projections do not carry the new optional relevance fields; their display uses the documented compatibility path until the next authoritative projection arrives.
- No canonical capacity value is currently projected for every object family. P7 does not invent or display a misleading capacity score.
- Focused P3 battle/check takeover owns its compact combat-card drawer. Full passive inventory navigation remains intentionally subordinate during that mandatory resolution.
- The repository does not contain `docs/ASHENREACH_RULE_SPINE.md` or `docs/ASHENREACH_CARD_ECONOMY_SPINE.md`; current schemas, reducers, content, tests, and `docs/UI_DIRECTION.md` were used as authority.
