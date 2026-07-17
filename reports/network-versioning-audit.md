# Network versioning audit

Status: Phase 1Q report-only audit. Recommendations are pending approval.

## Current transport and synchronization model

- HTTP creates/configures/joins sessions and returns identity or lobby summaries, not full gameplay projection state.
- WebSocket `STATE_PATCH` envelopes carry full TV-public or phone-private/public payloads.
- Phone reconnect sends `REJOIN` with session ID and seat token, then receives a full private snapshot plus broadcast.
- TV reconnects by reopening its socket and receives a full public payload.
- The client calls `JSON.parse` and uses a TypeScript assertion. There is no strict runtime projection parser.
- Each incoming patch replaces the previous React state. There is no incremental/deep patch merge and no normalized client store.

Counts: two payload interfaces (`PublicPatchPayload`, extending `PhonePatchPayload`), two initial synchronization recipient paths (TV socket and phone rejoin/adoption), one authenticated phone reconnect path, zero state-normalization layers, and zero strict payload parsers.

## Deployment and cache evidence

The repository builds the React clients with Vite and runs the Node HTTP/WebSocket server separately. The Node server does not serve `dist`; development uses separate client/server ports. No Docker, hosted-platform, reverse-proxy, or production static-host cache policy in this repository proves atomic deployment.

- Vite production assets are content-hashed, but the hosting/cache policy for the HTML entrypoint is external to this repository.
- Service workers/Workbox/PWA registration: **0**.
- Browser full-state persistence: **0**.
- Local/session storage Heat entries: **0**. Storage is limited to room/seat/host identity and UI preferences.
- An already loaded phone or TV bundle can remain connected or reconnect after a server restart.
- TV and phones can therefore run different loaded bundles even if they originated from one source build.
- No evidence guarantees a forced refresh after restart.

Cached-client risk paths: **2**—an already-loaded phone bundle and an already-loaded TV bundle. There is no service-worker-created offline cache path.

## Existing network versioning

| Facility | Count/status |
|---|---|
| Network/protocol version field | 0 |
| Client build version field | 0 |
| Server build version field | 0 |
| Join compatibility check | 0 |
| Minimum client version | 0 |
| Projection/message schema version | 0 |
| Capability negotiation | 0 |
| Feature flag for projection shape | 0 |
| Forced-refresh response | 0 |

`saveVersion: 1` governs persisted snapshots only and must not be reused for WebSocket or HTTP compatibility.

## Mixed-version evidence

| Combination | Result for these two fields |
|---|---|
| old client + old server | receives zero; current behavior |
| old client + Heat-free server | safe: production old client never reads either field; missing JS properties are irrelevant |
| Heat-free client + old server | safe: extra JSON fields remain inert; there is no strict parser or selector |
| Heat-free client + Heat-free server | canonical Heat-free payload |

Fresh join and reconnect use the same projection construction. Reconnect does not bypass a separate parser because none exists. Full replacement prevents stale zero-bearing fields from persisting after the next patch. A server restart closes sockets; loaded clients retry and can attach to the new server subject to existing room/token continuity. Projection removal adds no new failure mode.

## Architecture alternatives

| Option | Assessment | Verdict |
|---|---|---|
| A. Direct coordinated removal | Both mixed-version directions are already tolerant; one commit keeps types and producers aligned | **preferred** |
| B. Optional-client stage, then omission, then cleanup | adds transitional types/normalizer despite no consumer or strict parser | reject as unnecessary |
| C. Join-time protocol version | strategically useful for future breaking changes, but disproportionate and cannot be justified solely by two inert omissions | defer |
| D. Capability negotiation | high complexity and per-client payload divergence with no current framework | reject |
| E. Permanent retention | preserves accidental shape but pollutes types and invites false Heat reuse | reject |

## Preferred versioning policy

Use direct coordinated removal in one repository commit. Do not add a network protocol version for Phase 1R. Treat JSON projections as additive/omissive for unused fields: updated clients ignore old-server extra Heat fields; old clients tolerate new-server omission. Remove Heat before application state rather than normalizing it to zero.

This decision is narrow. The next genuinely behavior-affecting, required-field, discriminated-union, intent, or privacy-boundary change must receive its own protocol audit. A future protocol version should be a monotonic network-specific integer exchanged at connection/join and must remain separate from `saveVersion`.

## Rollback

Rollback is code rollback of the coordinated server/client build. Old server emission is harmless to the Heat-free client. No saved-state downgrade, archival metadata change, storage cleanup, or client cache purge is required. If an unexpected external consumer is discovered, restoring the two literal-zero producers and shared optional compatibility fields is sufficient while that consumer is inventoried.
