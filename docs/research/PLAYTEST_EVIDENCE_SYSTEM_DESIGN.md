# Ashen Reach Playtest Evidence System Design

Status: report-only design

Date: 2026-07-24

Production code changed: no

## Decision

Ashen Reach should use a development-only evidence sidecar, separate from the
game state, save snapshot, and authoritative event log.

During play, a facilitator presses one **Mark moment** control. The sidecar
records a server timestamp, a monotonic recording offset, the current projected
state revision, and a small allowlisted set of public state references. It does
not ask for a note while play is in progress.

After the session, testers review the ordered marks and add annotations. The
captured anchors are immutable; annotations are separate, editable records
joined by mark ID.

The first version should be a QA companion page or capture-runner control, not a
new gameplay command and not a new control in the production TV or phone
bundles.

## Scope and invariants

The system is evidence infrastructure, not gameplay infrastructure.

- It must not dispatch a `GameAction`, increment the game sequence, append to
  the authoritative event log, alter a save, or block resolution.
- It must not copy full TV or phone projections.
- It must not store raw WebSocket frames, browser storage, request bodies,
  cookies, URLs with credentials, or debug-panel payloads.
- It must not record private Agenda or Contract text, owner-only choices,
  player messages, spoken conversation, credentials, or unnecessary personal
  data.
- It should work when screenshot or video capture is disabled.
- Recorder failure must have no effect on the game.

## Existing-system trace

### Authoritative session and revision

| Concern | Existing source | Finding | Evidence-system consequence |
|---|---|---|---|
| Game session | `src/server/sessionState.ts:105` | `createInitialSessionState` receives `sessionId`. The current server uses the room code as that ID. | Use it only transiently to correlate the live subscription. Do not put the room code in a shareable evidence package. |
| Projection envelope | `src/client/shared/types.ts` and `src/server/roomServer.ts` | Every `STATE_PATCH` carries `sessionId`, `sequence`, `phase`, and a view-specific payload. | `sessionId + sequence` is the strongest live reference to the state a tester saw. |
| State revision | `src/game/schema/session.schema.ts:447` | `GameState.sequence` is a non-negative integer persisted with the state. | Record it on every mark. Call it a **state revision**, not an event number. |
| Server action time | `src/game/engine/actions.ts:18` and `src/server/roomServer.ts` | Accepted actions are stamped with server-authored ISO `createdAt` values. | Use server UTC for wall-clock correlation. Do not trust a phone clock as canonical. |
| Authentication | `src/server/auth.ts` | Host tokens contain `host:<sessionId>:<secret>` and seat tokens contain the session, seat, and a secret. | Tokens are credentials and are always prohibited from evidence files. |
| Phone session data | `src/client/shared/network.ts:213` | Phone auth contains room code, seat ID, seat token, and display name. | The evidence recorder must not read or serialize this object. |

The sequence is not a one-to-one event-log index. Normal reducer actions
usually increment the sequence and append an action, but the room server also
has state updates that advance the sequence without a gameplay event, and some
resolutions append additional derived events. A mark therefore needs both:

1. the authoritative state revision; and
2. an independently described, sanitized event-log anchor when one exists.

It must never infer `sequence === eventLog.length`.

### Authoritative event log and saves

- `GameState.eventLog` is persisted as `z.array(z.unknown())` in
  `src/game/schema/session.schema.ts`. Runtime entries are generally
  `GameAction` records, but the persisted schema intentionally accepts broader
  historical data.
- `reduceGameState` normally appends the accepted action and advances the
  sequence.
- `RoomGameServer.applyAction` also retains accepted and emitted actions in its
  runtime event collection.
- `serializeSessionSnapshotV2` in
  `src/game/persistence/sessionSnapshot.ts:203` serializes the complete state,
  including the event log. Save version remains 2.

The evidence system must not reuse the save file as its storage container. A
save contains far more information than a playtest mark needs, including
private state. Evidence must be a separate sidecar with its own schema version.

Because persisted event entries are not strongly typed, the evidence collector
must never copy an arbitrary entry. It may derive only:

- the zero-based log ordinal;
- an allowlisted public event type;
- its server `createdAt`, if present; and
- a classification such as movement, public resolution, turn, or scenario.

For any non-allowlisted entry, the anchor is omitted. It is not replaced with
the original type or payload.

### Public TV projection

`createTvProjection` in `src/server/roomServer.ts:13349` is the correct
starting boundary for public evidence. It exposes the host's public state,
including setup, required action, public players and sectors, movement,
encounters, public resolution, results, scenario progress, and turn state.

Useful stable references already present in or derived for that projection
include:

- `STATE_PATCH.sequence` and `phase`;
- `requiredAction.id`, `kind`, `transitionStage`, and `revision`;
- `activeResolution.id`, `source`, and `stage` for public resolutions;
- `movementPlanner.rollResolutionId`, `movementRevision`,
  `selectedRouteId`, and `selectedDestinationId`;
- public sector IDs;
- public encounter/card IDs;
- scenario result status and `achievedAtSequence`;
- handoff identity and result-state identity.

The TV projection is public-safe for display, but it is not data-minimal. It
contains display names, presentation copy, broad state, dice detail, and public
entity data that are unnecessary for most marks. The collector must run a
second strict evidence allowlist instead of serializing the projection.

Owner-private active resolutions are redacted for TV by
`projectActiveResolutionForViewer`. The evidence allowlist must be stricter:
when `origin.privacy === "owner"`, store only that a private resolution was
pending and its public presentation stage. Drop the resolution ID, origin,
source event ID, card, outcome, and all text.

### Phone prompts

`createPhoneProjection` in `src/server/roomServer.ts:13802` starts with public
state and adds owner-private information. Depending on state, this can include:

- private Required Action wording and legal controls;
- Agenda and Contract state;
- encounter and payment options;
- Affliction, Scar, Equipment, movement, and reaction choices;
- owner inventory and private result information.

The full phone projection is therefore a prohibited evidence source.

`buildRequiredActionProjection` in `src/server/roomServer.ts:12830` is useful
because it produces a stable server-owned answer to who acts and what state is
pending. On TV, private actions are reduced to public waiting language. For an
evidence mark, retain only the public form:

- action kind;
- transition stage;
- revision;
- a pseudonymous actor reference, if needed; and
- a stable ID only when the action is public.

Do not retain `label`, `detail`, owner instruction, legal options,
`requiredTab`, `allowedCommand`, source ID, or display name from a phone
projection.

If a future phone control can request a mark, its request should contain only a
random request ID. The evidence service must derive the state reference from
the current server/public projection; the phone must not submit prompt content
or selected options.

### Client debug events

`useRoomSubscription` keeps a bounded 40-entry client debug list. It records
sent and received payloads. A phone rejoin debug event includes the seat token,
and received phone patches can contain owner-private state. `DebugPanel`
renders these payloads.

These debug events must not be reused for playtest evidence. Their bounded size
does not make their content safe.

### Existing browser captures

Current QA evidence is valuable but uses several incompatible correlation
styles:

| Existing evidence | What it records | Gap relevant to live playtests |
|---|---|---|
| `scripts/capture-p15-release-readiness.ts` | Screenshot state, surface, viewport, and authoritative sequence | Closest existing model, but no per-capture evidence session, public-state anchors, or common annotation workflow |
| `scripts/capture-p20-host-tv-qa.ts` | Named timeline marks and milliseconds from recording start | Good video correlation, but no authoritative sequence or public state reference |
| `docs/qa/p12-objectives/capture-metrics.json` | Capture metrics | Stores the room code; a new export must not |
| `reports/ui/p22-operative-pieces/p22-browser-metrics.json` | Capture and recording paths | Contains absolute local paths, including the workstation user directory |
| Other capture scripts | Fixture/state names and screenshots, sometimes metrics or video | No common manifest or privacy-minimal schema |

Browser runners also hold host and seat tokens in memory to create and seed QA
sessions. That is acceptable for the runner, but tokens must not cross into
filenames, manifests, console exports, annotations, or saved WebSocket frames.

The new system should consume existing TV screenshots and recordings through a
small capture manifest. It should not replace the capture tools or record phone
screens automatically.

## Correlation model

### Durable evidence identity

Create a random `evidenceSessionId` when evidence recording begins. This is the
only session identifier exported.

The live recorder may hold the Ashen Reach `sessionId` in memory while
subscribed. If local reconciliation is required, a restricted local index may
store a keyed digest of the session ID. The raw room code must not appear in
the evidence manifest.

Each connection or restoration epoch receives a `segmentId`. Start a new
segment if:

- the authoritative session ID changes;
- sequence moves backwards after a restore;
- the evidence recorder restarts; or
- the facilitator explicitly begins a new session segment.

This avoids pretending that revisions are globally monotonic across unrelated
or restored runs.

### Per-mark anchors

The minimum useful mark contains:

| Field | Purpose |
|---|---|
| `markId` | Immutable random or sequential mark identity |
| `evidenceSessionId` | Joins marks without exposing the room code |
| `segmentId` | Distinguishes reconnect/restore epochs |
| `markedAt` | Server UTC timestamp |
| `offsetMs` | Monotonic milliseconds from evidence recording start |
| `sequence` | Authoritative projected state revision |
| `phase` and `status` | Broad game state |
| `synchronized` | Whether the collector had a current authoritative projection |
| `requiredActionRef` | Allowlisted kind, transition stage, and revision |
| `publicResolutionRef` | Public source class and stage; stable ID only if public |
| `publicLocationRef` | Public sector ID and pseudonymous actor, when relevant |
| `movementRef` | Movement revision/roll/route/destination IDs already public |
| `scenarioRef` | Scenario ID, public stage, progress/pressure, and final status |
| `eventAnchor` | Optional allowlisted type, log ordinal, and server time |
| `captureRefs` | Optional links to sanitized TV capture records |

Do not include presentation prose, card flavor text, player/operative names,
display names, dice arrays, modifiers, inventory, rewards, penalties, or a raw
state fragment. Those can be reconstructed locally from authorized sources
when truly needed; they should not be duplicated into every mark.

### Pseudonymous actor references

Map seat IDs to stable session-local aliases such as `actor-1` through
`actor-6`. The mapping is created from canonical seat order and is not exported
with display names.

This retains turn and multiplayer correlation while avoiding player names. No
email, account ID, network address, device identifier, or advertising
identifier is needed.

## Minimal Mark moment workflow

### During the session

1. The facilitator opens a development-only evidence companion beside the TV.
2. The companion subscribes to the host/public projection. Credentials remain
   in memory and are never included in its records.
3. The facilitator presses **Mark moment** or its single keyboard shortcut.
4. The companion sends a request ID only. It does not send projected state,
   notes, DOM text, or phone data.
5. The evidence collector reads the latest authoritative server revision and
   applies the evidence allowlist.
6. It appends one mark to the sidecar and responds with a restrained
   acknowledgement such as **Moment 7 marked**.
7. Play continues immediately. No modal, text field, gameplay lock, or
   animation is introduced.

Repeated marks on the same sequence are valid because they may refer to
different presentation moments. Debounce accidental double activation for
approximately 400–600 ms, while preserving intentionally repeated marks.

If synchronization is unavailable, the companion should show **Not marked —
waiting for current state**. It must not record a stale revision as current.
The game remains unaffected.

### Capture behavior

Marking does not require a screenshot.

When TV capture is already enabled, a mark may also:

- link to the active video at `offsetMs`; or
- request one TV-only screenshot after confirming the same sequence.

The capture manifest stores relative paths and hashes, never absolute paths.
Room-code and QR regions must be masked or excluded by the QA capture layer.
Real participants should use playtest aliases before optional TV image/video
capture begins.

Automatic phone screenshots are prohibited. A phone screenshot for a specific
UI defect must remain an explicit, reviewed exception outside the Mark moment
default.

### After the session

The annotation view presents a chronological list with:

- mark number and time;
- public phase and state chips;
- public action/resolution/location references;
- an optional TV thumbnail;
- a video jump link;
- previous and next mark navigation.

Testers then add:

- category: clarity, pacing, rules comprehension, usability, accessibility,
  visual presentation, performance, reconnect/network, defect, or other;
- severity: observation, low, medium, high, or blocker;
- observation;
- expected behavior, when applicable;
- reproduction confidence;
- affected surface;
- controlled tags; and
- review status.

Annotations are separate append-only revisions joined by `markId`. Editing an
annotation never changes the captured authoritative anchors.

The annotation form must state: **Describe the observed product behavior. Do
not enter player names, private objectives, messages, credentials, or
conversation transcripts.**

Tester identity is optional. When attribution is useful, use a session-local
alias such as `tester-2`, not a name, email address, account, or device ID.

## Proposed sidecar shapes

These shapes are design examples, not production interfaces.

```ts
interface PlaytestEvidenceSession {
  schemaVersion: 1;
  evidenceSessionId: string;
  startedAt: string;
  endedAt: string | null;
  buildRef: {
    commit: string | null;
    contentHash: string | null;
  };
  segments: EvidenceSegment[];
  marks: PlaytestMoment[];
}

interface PlaytestMoment {
  markId: string;
  evidenceSessionId: string;
  segmentId: string;
  markedAt: string;
  offsetMs: number;
  sequence: number;
  phase: string;
  status: string;
  synchronized: true;
  requiredActionRef: {
    kind: string;
    transitionStage: string | null;
    revision: number | null;
    publicId: string | null;
  } | null;
  publicResolutionRef: {
    sourceClass: string;
    stage: string;
    publicId: string | null;
  } | null;
  publicLocationRef: {
    actorAlias: string | null;
    sectorId: string | null;
  } | null;
  movementRef: {
    rollResolutionId: string | null;
    movementRevision: number | null;
    routeId: string | null;
    destinationSectorId: string | null;
  } | null;
  scenarioRef: {
    scenarioId: string | null;
    publicStage: string | null;
    resultStatus: string | null;
  } | null;
  eventAnchor: {
    ordinal: number;
    publicType: string;
    createdAt: string | null;
  } | null;
  captureRefs: string[];
}

interface PlaytestAnnotation {
  annotationId: string;
  markId: string;
  revision: number;
  annotatedAt: string;
  testerAlias: string | null;
  category: string;
  severity: "observation" | "low" | "medium" | "high" | "blocker";
  observation: string;
  expectedBehavior: string | null;
  reproductionConfidence: "unknown" | "low" | "medium" | "high";
  affectedSurface: "tv" | "phone" | "both" | "session";
  tags: string[];
  status: "open" | "reviewed" | "filed" | "dismissed";
}
```

For an owner-private resolution, `publicId` must be `null`. For a
non-allowlisted event, `eventAnchor` must be `null`.

## Capture manifest

Optional browser evidence uses a separate manifest:

```ts
interface EvidenceCapture {
  captureId: string;
  markId: string | null;
  kind: "tv-screenshot" | "tv-video-marker";
  relativePath: string;
  sha256: string | null;
  capturedAt: string;
  offsetMs: number;
  sequence: number;
  viewport: string | null;
}
```

Do not store:

- full filesystem paths;
- page text or HTML;
- room codes;
- WebSocket URLs;
- browser-storage dumps;
- network request/response bodies;
- phone screenshots;
- microphone or room audio.

## Privacy allowlist and denylist

### Record

- random evidence, segment, mark, annotation, and capture IDs;
- server UTC and monotonic offset;
- state revision, phase, and status;
- public sector and scenario identifiers;
- public action/resolution state classes and stages;
- public movement correlation IDs;
- allowlisted public event type, ordinal, and timestamp;
- session-local actor/tester aliases;
- tester-authored product observations;
- TV-only capture references when capture is explicitly enabled;
- build commit/content hash without workstation path or username.

### Never record

- private Agenda, Contract, mission-choice, or owner-result text;
- player messages, chat, speech, or quotations;
- player display names or operative names when not essential;
- phone prompt wording, legal options, choices, inventory, or private results;
- seat token, host token, secrets, cookies, authorization headers, or QR
  contents;
- raw room code in a shareable manifest;
- raw event-log entries, full saves, full projections, or WebSocket frames;
- browser local/session storage;
- IP address, user agent, device serial, advertising ID, email, or account ID;
- absolute local paths or operating-system usernames.

## Export and retention

The default export is:

```text
playtest-evidence/
  evidence-session.json
  annotations.ndjson
  captures/
    capture-manifest.json
    tv/                 # optional
```

Before export, a structural validator rejects known sensitive keys such as
`seatToken`, `hostToken`, `secret`, `displayName`, `privateRivalry`,
`ownerPrivateResult`, and raw `payload`. It also rejects absolute paths,
credential-shaped token values, URLs with query strings, and any capture not
classified as TV evidence.

The sanitized manifest and annotations may be attached to a defect or retained
with a test report. Raw TV screenshots/video should be deleted after the
finding is extracted or according to the project's short playtest-evidence
retention window. Credentials are never retained, so they require no evidence
cleanup path.

## Failure and reconnect behavior

- A mark is accepted only against a synchronized current projection.
- Recorder disconnect never changes the game or its reconnect behavior.
- Reconnecting the recorder starts a new segment if continuity cannot be
  proven.
- Marks made at the same revision remain ordered by server time and monotonic
  offset.
- A restored save can continue in the same evidence session, but starts a new
  segment if sequence continuity breaks.
- Closing evidence recording flushes the sidecar atomically and records
  `endedAt`.
- Annotation can proceed even if no screenshot/video exists.

## Security model

The evidence companion is a local development tool.

- Bind its write service to loopback or the controlled test network.
- Require facilitator authorization for marking and export.
- Keep Ashen Reach host credentials only in process memory.
- Use same-origin protection and rate limiting if an HTTP mark endpoint is
  introduced.
- Write files atomically with restrictive local permissions.
- Treat tester annotations as untrusted text: escape on render, cap length, and
  never execute links or markup.
- Run the privacy validator both on write and before export.

## Recommended implementation sequence

This report does not implement these steps.

1. Define the sidecar schemas and a pure public-evidence sanitizer.
2. Add table-driven privacy tests before any UI.
3. Build the development-only facilitator companion with one Mark moment
   button and one shortcut.
4. Connect existing TV capture runners through the optional capture manifest.
5. Build the post-session annotation timeline.
6. Add sanitized JSON/NDJSON/CSV export.
7. Pilot without screenshots first; enable TV capture only when the manifest
   and privacy checks pass.

The minimal viable version is steps 1–3 plus the annotation timeline. It needs
no production UI, gameplay command, save migration, or network-protocol change.

## Acceptance tests for a future implementation

### Authority

- Marking leaves game sequence, event log, phase, pending actions, and saves
  byte-for-byte unchanged.
- Every accepted mark records the exact latest synchronized `STATE_PATCH`
  sequence.
- Sequence and event-log ordinal are tested as independent values.
- Multiple marks at one sequence remain distinct and ordered.

### Privacy

- A private Agenda/Contract resolution produces only a generic private-state
  class and stage.
- Phone projection, prompt options, owner result, and private card text never
  enter a mark.
- Injected `seatToken`, `hostToken`, browser storage, raw payload, display name,
  room code, absolute path, and WebSocket URL cause export rejection.
- No phone screenshot is captured automatically.
- Annotation rendering safely escapes hostile text.

### Capture correlation

- A TV screenshot captured for a mark records the same sequence or is rejected
  as stale.
- A video marker seeks to the stored monotonic offset.
- Capture files use relative paths and content hashes.
- Marking still works with capture disabled or failed.

### Reconnect and restore

- Recorder disconnect does not affect clients or server state.
- No mark is created from a stale projection.
- Reconnect either proves continuity or starts a new segment.
- A restored save with a lower sequence cannot collide with earlier marks.

### Usability

- One press gives acknowledgement without opening a modal.
- The control is keyboard and screen-reader accessible.
- Post-session annotation can be completed without remembering the timestamp
  or manually searching the recording.
- The annotation warning prevents collection of private objectives, player
  messages, credentials, and conversation transcripts.

## Final recommendation

Adopt a development-only facilitator sidecar using:

```text
public TV projection
→ strict evidence allowlist
→ timestamped immutable mark
→ optional TV capture reference
→ post-session annotation
→ privacy-validated export
```

Do not build it from the phone debug log, full event log, save snapshot, raw
WebSocket traffic, or browser storage. The authoritative revision and existing
public projection already provide enough correlation for useful playtest
evidence without expanding Ashen Reach's privacy surface.
