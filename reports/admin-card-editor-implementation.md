# Admin Card Editor Implementation

Date: 2026-07-18
Branch: `ui/tv-movement-focus-mode`
Starting commit: `481bab0`
Status: implemented and browser-reviewed; no commit created

## Outcome

The Host TV Admin Library now has an authenticated, development-only editor backed by canonical JSON files. It does not mutate game state in the browser. The server validates every proposed record with the same current Zod schema used by canonical content, rejects retired Heat-shaped content, writes through a temporary file and atomic rename, and records a local revision before modifying canonical data.

Editing is available only when all of the following are true:

- the server started with `--admin-content-editor` or `ASHEN_REACH_ADMIN_CONTENT_EDITOR=1`;
- the request supplies the current room code and canonical Host Phone token;
- the room is not in an active game session.

Otherwise the Admin Library remains read-only. Active sessions return `423 Locked`; invalid host credentials return `403`.

## Canonical Sources and Fields

Supported sources are individual JSON records beneath:

- `content/cards/afflictions`
- `content/cards/anomalies`
- `content/cards/artifacts`
- `content/cards/contracts`
- `content/cards/escalations`
- `content/cards/scars`
- `content/cards/threats`
- `content/gear`
- `content/followers`
- `content/tile-challenges`

The editor presents display name, subtype, difficulty, primary stat, relationship-preserving skill data, existing typed outcome/effect objects, player-facing text, tags, canonical source paths, and an advanced normalized read-only view. Stable IDs are read-only because safe renaming requires a repository-wide atomic reference migration. The current UI deliberately edits existing effect fields rather than inventing missing mechanics or creating free-form effect types.

No Heat option is offered. The server additionally rejects exact retired `"heat"` metadata values before schema validation.

## Artwork Replacement

Artwork replacement accepts PNG, WEBP, and JPEG files up to 8 MB. The server verifies both the declared MIME type and binary signature, rejects unsafe filenames and traversal, and writes only beneath `public/assets/cards`. Card-to-art overrides are stored in `content/card-artwork-overrides.json` and applied by the runtime art catalog.

The editor shows current and unsaved art side by side, displays dimensions, warns when the replacement aspect ratio differs by more than 8%, and requires explicit confirmation before replacing a shared override. Original file format is preserved; no format conversion or resizing was introduced because the repository has no approved image-processing dependency. `object-fit: contain` remains the preview/runtime safety boundary.

## Save, Conflict, and Recovery Model

- Each load returns a SHA-256 revision of the exact canonical source text.
- Save requires that revision, preventing stale concurrent edits.
- The server validates the stable ID and scans canonical content for duplicate IDs.
- A revision record is written before the canonical source or artwork override changes.
- Canonical JSON and artwork use temporary files plus atomic rename.
- A failed multi-file save restores the prior source and override manifest.
- Revert restores the exact previous source bytes when recorded by the current implementation.
- Local revisions live under ignored `admin-revisions/<card-id>/` folders.
- The UI protects dirty edits on close, card change, Escape, and browser unload.
- Successful saves state that the server must be restarted before starting a new session; active games cannot be edited.

## Files Added or Restructured

- `src/server/adminContentEditor.ts` — canonical validation, upload safety, atomic save, conflict detection, revisions, revert.
- `src/server/index.ts` — authenticated development-only admin content endpoints and active-session lock.
- `scripts/dev.ts` — explicit admin editor flag propagation.
- `src/client/tv/admin/adminContentApi.ts` — typed admin content API client.
- `src/client/tv/admin/AdminCardEditor.tsx` — editor, preview, effect controls, art replacement, validation, unsaved protection, revision UI.
- `src/client/tv/admin/AdminLibrary.tsx` — read-only/edit status and focused editor mode.
- `src/client/tv/TvApp.tsx` — supplies current room and Host Phone authority to the Admin Library.
- `src/game/assets/runtime/cardArtRuntimeCatalog.ts` and `content/card-artwork-overrides.json` — canonical art override boundary.
- `src/client/styles.css` — focused industrial editor workspace and responsive two-column layout.
- `.gitignore` — excludes local revision history and generated QA logs.
- `src/server/__tests__/adminContentEditor.test.ts` — isolated mutation, rollback, validation, conflict, upload, and feature-flag tests.
- `src/server/__tests__/adminContentApi.integration.test.ts` — real room/host authorization and active-session locking.
- `src/client/tv/admin/__tests__/AdminCardEditor.test.tsx` — editor load/save, stable ID, Heat omission, validation, and dirty-close behavior.
- `scripts/capture-admin-card-editor-qa.ts` — repeatable real-server save/revert browser QA.

## Screenshot Review

Screenshots are under `reports/ui/admin-card-editor/`:

- `editor-overview-1920x1080.png`
- `difficulty-effects-1440x900.png`
- `artwork-replacement-preview-1440x900.png`
- `validation-error-1440x900.png`
- `change-summary-1440x900.png`
- `save-success-1440x900.png`
- `revision-reverted-1440x900.png`
- `editor-compact-1280x720.png`

The first browser pass found two concrete defects:

1. Dirty-state notification rerendered the parent with a new auth object, causing the editor load effect to erase unsaved changes. The dependency was narrowed to room code, host token, and source path.
2. The editor occupied only the narrow inspector column while the central library canvas was empty. Edit mode now hides the card grid and uses the full remaining canvas as a two-column workspace, while preserving the filter rail and fixed save controls.

The initial revision capture also exposed an uppercase timestamp filtering error. Revision discovery now accepts the actual timestamped JSON filenames, and current revisions retain exact previous source text for byte-accurate recovery.

Final screenshot checks passed at 1920×1080, 1440×900, and 1280×720 with no horizontal overflow, no unexpected canvas rendering, and no unexpected console errors. The intentional invalid save produced the expected `422` response and visible field error.

## Tests and Verification

Focused results completed during implementation:

- `npm.cmd run typecheck` — passed.
- `vitest ...adminContentEditor.test.ts` — 10/10 passed.
- `vitest ...adminContentApi.integration.test.ts` — passed, including Host Phone auth and active-session lock.
- `vitest ...AdminCardEditor.test.tsx` — 3/3 passed.
- `tsx scripts/capture-admin-card-editor-qa.ts` — passed after screenshot-driven corrections; canonical QA edit was reverted exactly.
- `git diff --check` — passed.

Final repository results:

- engine/rules: 63 files, 727 tests passed;
- server integration: 32 files, 277 tests passed;
- client under four-suite contention: 335 passed and two five-second timeouts;
- both timed-out client tests passed in isolation (3.20s and 4.05s);
- aggregate wrapper: reached the configured five-minute timeout without an assertion summary, so every constituent was run independently as required;
- production build, content validation, development asset audit, typecheck, and browser QA all passed.

Repository-wide content validation, suites, asset audit, and production build are recorded in the final task handoff after completion.

## Remaining Limitations

- A server restart is required for already-imported canonical content to be reloaded safely. Live mutation of an active session is intentionally prohibited.
- The editor preserves uploaded raster formats rather than converting or resizing them.
- Stable ID migration remains outside this editor by design.
- Relationship-heavy and uncommon schema fields remain available in normalized advanced data but are not all promoted to bespoke controls. This avoids silently changing authored mechanics.
- Revision history is local to the development workspace and is intentionally ignored by Git; Git remains the durable repository history.
