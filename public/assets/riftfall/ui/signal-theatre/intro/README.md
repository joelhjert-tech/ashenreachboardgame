# Signal Theatre Intro

`ashenreach-intro.mp4` is the canonical TV-only opening transmission played
once when an authoritative room changes from lobby to active play.

- Runtime format: H.264 video with AAC audio in an MP4 container.
- Authored dimensions and duration: 1280×720, approximately 10 seconds.
- Stable resolver: `getHostGameIntroVideoPath()` in
  `src/client/shared/assetPaths.ts`.
- The intro is presentation-only. It never advances, blocks, or changes
  authoritative game state.
- Replace the video at the same stable filename when revising the sequence.
  Keep all imagery, names, symbols, and audio original to Ashen Reach.
