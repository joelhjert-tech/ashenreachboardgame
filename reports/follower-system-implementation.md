# Follower System Implementation

## Implemented lifecycle

The existing `gain_follower` resolver remains authoritative. It now validates catalog presence, owner duplicates, table-wide uniqueness, and eligible random Artifact pools before hydrating an exact instance. The reducer remains the sole owner of attachment, discard, use limits, round reset, and persistence.

Followers are automatic rewards. They survive Wounds, combat loss, recall, save, and reconnect. Explicit discard abilities remove their owner’s instance. Replacement characters and New Game receive fresh templates. Followers cannot be traded or activated by another seat. No generic capacity was added because acquisition is sparse, duplicate stable IDs are rejected, and a capacity would require replacement UI without solving a demonstrated exploit.

Current canonical `lossCondition` metadata was removed because it had no production reader and promised inconsistent loss. Legacy v0–v2 values remain accepted by the compatibility schema and normalize inertly. Save version remains 2.

## Ability completion

- All 21 normal followers now have an explicit active or passive effect.
- The generic role fallback was removed.
- Choir Defector adds +1 to an eligible Signal/anomaly check before rolling.
- Red March Guide and Mirecoil Saboteur cancel only their matching pending route failure.
- Ash Porter and Burnt-Road Quartermaster cancel only matching pending Equipment or Salvage consequences.
- Votive Gunner contributes a passive +1 battle source and may be used only against a pending failed-battle Wound.
- Cinder Surgeon, Fandiablos, companion exhaustion, note followers, and Rumi/Mira/Zoey bonuses retain their existing values and lifecycles.
- Crownless Advocate and Saltflat Bone-Reader retain their exact approved owner-private `gain_note` effects.

## Presentation and privacy

- Owner inventory cards show role/tier, authoritative availability, use/reset state, and canonical discovery locations.
- TV player cards now show public follower badges for all followers, not only companion-role followers.
- Full follower text, notes, choices, and Rivalry context remain owner-private.
- Duplicate/unavailable rewards no longer imply that a follower was gained.
- The environment-gated follower fixture supports acquired, used, and reconnect states for browser QA.

## Four critique seats

- **New player:** fixed followers are tied to named locations; rare companions visibly come from Artifact caches; timing and used status are shown on the owner phone.
- **Optimizer:** source resolution is one-shot, random pools filter ineligible unique rewards, reconnect cannot refresh stable-ID use limits, and no generic selection permits farming the strongest follower.
- **Family/casual:** recruitment is automatic, uses the existing result/continue flow, and adds no capacity or replacement bookkeeping.
- **Rules lawyer:** ownership, unique/duplicate rules, exact timing, reset, discard, recall, replacement, replay, and privacy have explicit server rules and tests.

## Balance follow-ups

Session telemetry should monitor how often rare companion Artifacts are drawn and whether the two Red March companions crowd that cache. Ability values were not broadly rebalanced. A future balance pass may compare follower acquisition rates across scenarios, but no follower remains technically blocked.

## Verification record

- Content validation passed: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 follower definitions, 15 Scars, 16 escalations, and 30 afflictions.
- TypeScript typecheck passed.
- Focused follower/server/phone/TV coverage passed: 68 tests.
- Engine and rules passed: 719 tests across 61 files.
- Integration passed: 243 tests across 27 files, including the reconnect-flapping regression without retry.
- Client passed: 274 tests across 26 files.
- Aggregate passed: 1,236 tests across 114 files.
- Asset audit passed: 418/418 present, with zero missing, invalid, placeholder, or release-blocking assets.
- Production build and both diff checks passed.
- `test:rules` is not a standalone package script; rules are included in `test:engine` and the aggregate wrapper.
- Canonical typed Heat search remained zero, canonical follower/Threat Heat metadata remained zero, and save version remained 2.

Browser QA captured and reviewed acquired, exhausted, reconnected, and public-TV states at `reports/ui/followers/`. The first TV pass showed that the public badge was only present in a normally hidden overlay. The corrective pass added a compact public follower line to the always-visible operative rail. The first reconnect script also retained `resetAuth=1`; the corrected capture uses the normal room URL and proves authoritative restoration. Full notes and Rivalry context remained owner-private.
