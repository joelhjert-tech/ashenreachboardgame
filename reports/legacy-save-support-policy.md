# Legacy Save Support Policy

Effective date: 2026-07-17

Current save version: **2**

## Supported snapshot input

For the lifetime of the save-version-2 release line, Ashen Reach supports:

- unversioned legacy v0 snapshots;
- version-1 snapshots;
- canonical version-2 snapshots;
- version-2 snapshots containing the exact legacy-compatible shapes accepted by `legacyCompatibleSessionSnapshotSchemaV2`.

Support means the declared snapshot parses, normalizes into the current canonical model, reconnects using current state, and remains mechanically safe. It does not mean old files round-trip byte-for-byte.

## Current save output

New snapshots are written as version 2 and do not emit:

- operative Heat fields or thresholds;
- Heat effects or current actions;
- Heat result, shop, or gear fields;
- follower or Threat Heat metadata;
- player-facing Heat state.

Clean new sessions omit the compatibility bag entirely.

A snapshot migrated from older data may preserve positive historical values in `legacyCompatibility.characterHeat` when that archival bag is passed back to the serializer. This metadata is inert, is not part of the current character model, and is not projected to phone or TV.

## Migration guarantees

- Legacy Heat effects normalize to `legacy_compatibility_noop` and produce no consequence.
- `HEAT_THRESHOLD_REACHED` and retired Heat-cost stabilize events normalize to inert compatibility history records and never reach the current reducer as Heat actions.
- Legacy follower Heat loss conditions/tags are discarded without losing the follower.
- Historical Threat Heat tags and keys are stripped, omitted, or mapped only to already-established non-Heat behavior.
- Historical character Heat is never converted into Wounds, Scars, recall, defeat, escalation, movement, rewards, or another resource.
- Current canonical state and projections remain Heat-free.

Migration is deterministic for supported fixtures. Current state, not event-log replay, is authoritative after import.

## Unsupported behavior

- Save versions other than unversioned v0, v1, and v2 are rejected.
- Structurally malformed legacy fields may be rejected rather than guessed or repaired.
- Byte-for-byte preservation of retired fields, effects, tags, or event objects is not guaranteed.
- Old phone/TV client protocol compatibility is not implied by snapshot compatibility.
- Cross-version multiplayer client/server sessions are not supported or negotiated.
- No new content may author legacy Heat effects, actions, costs, results, tags, loss conditions, or thresholds.

## Reconnect and projection

Supported legacy input is normalized before current runtime use. Reconnect restores normalized authoritative state and must not replay retired effects. Server projection stripping remains defense in depth so owners, other phones, and TV receive no mechanical Heat field, result, prompt, icon, or metadata.

## Deprecation and future version policy

Direct v0/v1/v2 support remains in force until Ashen Reach deliberately introduces a save-version-3 release boundary.

Before removing or materially narrowing v0–v2 compatibility, a future release must:

1. make an explicit product decision and identify the final v2-supporting release;
2. provide release notes describing player impact and import behavior;
3. decide whether v3 includes a one-way v0–v2 importer or rejects old snapshots;
4. pass golden v0/v1/v2 migration, malformed-data, event-history, reconnect, privacy, and current round-trip tests;
5. prove no legacy value converts into another gameplay system;
6. verify current clients and servers agree on the new version boundary.

Compatibility must not be removed solely to reduce code, fixture, or text-search counts. If external saves are later proven to be in circulation, a one-way v0–v2 importer is the preferred v3 policy.

## Release verdict relationship

Required, isolated, inert, documented, and tested legacy compatibility is allowed to coexist with a **PASS** Heat-retirement verdict. Historical reports and compatibility fixtures are not active mechanics.
