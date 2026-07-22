# P8 Shared Presentation Accessibility

## Implemented contracts

- Minimum interactive target: 44 CSS pixels on phone controls.
- Critical button verbs and blocked reasons wrap; they are not ellipsized.
- Focus advances once per authoritative revision through `useFocusOnRevision`.
- Unchanged projections do not steal focus.
- Reduced motion does not change focus behavior or available information.
- `LiveStatus` clears stale copy and deduplicates identical revision/message pairs.
- Movement status no longer exposes a live region on every visual frame; one restrained status source announces meaningful steps.
- Required-action waiting/submitting no longer creates nested duplicate live regions.
- Decorative missing images remain hidden; meaningful missing images retain authored accessible names.
- Disabled controls retain native semantics and a canonical reason through visible supporting copy/title/data.

## Public/private announcement boundary

The shared helpers accept already-filtered presentation strings only. No projection was widened. TV and waiting phones continue to receive public-safe copy; owner-only selections, inventory, Salvage, mission details, Rivalry targets, and Artifact choices remain absent.

## Long content

Names, rules, modifiers, and action labels use safe wrapping. Lore remains secondary and may be expanded. The system does not truncate mechanical meaning or expose raw identifiers as replacement text.

## Browser checks

The P8 capture script records horizontal overflow, visible image containment, phone target size, live regions, active focus, and console errors for every new intermediate-width capture. Existing P0-P7 capture archives provide the 360x800, 390x844, 1366x768, and 1920x1080 comparison set.
