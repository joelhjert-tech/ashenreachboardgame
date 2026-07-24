# P20 Code Reuse Compliance

## Decision

No reference code was reused or translated.

## Evidence

- Reference directory inventoried: 743 files, 50 directories,
  367,173,306 bytes.
- Readable code: 433 JADX-decompiled Java files, primarily Android Support
  Library v4, annotations, and Google service wrappers.
- Game presenter: native Marmalade/S3E and DTRZ content; no readable portable
  presentation module was found.
- Licence/notice files in the reference directory: 0.
- Directly reusable modules (A): 0.
- Portable-with-adaptation modules (B): 0.
- Behavioral-reference-only modules (C): decompiled Android animation,
  fragment, cancellation, scrolling, and restoration wrappers.
- Not relevant (D): platform services, resources, billing/service wrappers,
  support plumbing, binary/native packages.

## Implementation compliance

- No imports or reads from `referance game`.
- No Android, Kotlin, Java, Marmalade, S3E, APK, or DTRZ runtime dependency.
- No reference assets copied.
- No protected reference identifiers or UI text used.
- No reference timing constant copied.
- Existing Ashenreach TypeScript, React, CSS, public projections, and motion
  tokens were used.
- Attribution required: none, because no reference code was used.

## Automated check

`src/client/tv/__tests__/p20ReferenceCompliance.test.ts` verifies:

- no reference directory/package/native-engine dependency;
- no fetch, WebSocket, intent, random, timer, or gameplay command in the cue;
- shared motion tokens and reduced-motion completion;
- no Android/native dependency in `package.json`.

Focused result: 4/4 compliance tests passed.

## Asset compliance

- Ashenreach art files modified: 0.
- Ashenreach art files added: 0.
- Ashenreach art files removed: 0.
- Reference-game assets transferred: 0.
- Final Ashenreach art inventory: 454 files, 1,106,650,363 bytes.
- Git status and untracked-file checks for `public/assets`: clean.
- Reference media checked by SHA-256: 263.
- Reference/Ashenreach media hash collisions: 0.

## Repository closeout

- Required P20 documents present: 14/14.
- Staged files: 0.
- Reference APK, DTRZ, native library, screenshot, recording, art, and audio
  files added to the repository: 0.
- Commit/push: not performed.
