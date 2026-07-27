# Manual Card-Art Matching and Phone Image Optimization

## Outcome

The pass reviewed all 64 loose images in `C:\Users\Joel_\Documents\Ashenboardgame\Manualimages` and imported one high-confidence existing-card match:

- Source: `ChatGPT Image Jul 27, 2026, 06_19_56 PM.png`
- Destination: `public/assets/cards/followers/grave-scribe.png`
- SHA-256: `cd7f8c5bb04669c33e2b7505cb330536f149eff6ae4ee6f2eef58aee69af0847`
- Copy verification: source and destination hashes match.

No source file in `Manualimages` was moved, edited, or deleted. No social-media capture, external stat-card sheet, Last Reliquary material, uncertain third-party composition, or reference artwork entered the repository.

## Follower presentation

- Added `follower` as a first-class card-art category.
- Added `/assets/cards/followers/` as the canonical ordinary-Follower root.
- Added `/assets/cards/fallbacks/follower.svg`.
- Grave Scribe now resolves through its own Follower art.
- Ordinary Followers without art use the Follower fallback instead of an Equipment or Artifact fallback.
- Artifact-deck Followers continue using their existing Artifact presentations.
- Remaining production fallback debt is 30 Equipment cards and 14 Followers.

## Phone derivative pipeline

`scripts/generate-phone-images.ts` creates deterministic sibling `*.phone.webp` files with:

- Maximum long edge: 960px.
- WebP quality: 72.
- No upscaling.
- Preserved alpha where present.
- Stripped metadata.
- A lower-quality retry when required to keep the derivative no larger than its source.

The generated manifest is `public/assets/phone-image-manifest.json`. It records source and derivative paths, SHA-256 hashes, dimensions, and byte sizes. The normal asset audit fails for a missing, stale, oversized, upscaled, or byte-growing derivative.

Current generated totals:

| Measure | Result |
|---|---:|
| Source rasters | 380 |
| Source bytes | 875,674,731 |
| Phone derivative bytes | 41,412,412 |
| Aggregate reduction | 95.27% |

Representative cold-cache asset sets:

| Flow | Assets | Full source bytes | Phone bytes | Reduction |
|---|---:|---:|---:|---:|
| Setup carousel, pieces, and operatives | 38 | 88,507,582 | 3,538,370 | 96.00% |
| Battle/result example | 5 | 5,945,139 | 339,332 | 94.29% |
| Inventory and objectives example | 12 | 7,762,980 | 320,474 | 95.87% |

## Runtime behavior

- Normal phone card, setup, portrait, inventory, objective, result, signal-piece, and phone-visible tile imagery begins with the optimized WebP.
- A failed derivative falls back to the full original.
- Card art then falls back to its category fallback.
- Explicit artwork inspection requests the original high-resolution card source.
- TV components retain full-resolution sources.
- Signal Theatre sector environments, shop interiors, cartography sectors, SVGs, and animations remain outside the derivative set.
- The unreferenced one-off `artifact-fandiablos.webp` was removed after `artifact-fandiablos.phone.webp` and the untouched full PNG were verified.

## Report-only concepts

The following unmatched original-looking images remain outside Git and are documented only as possible future concepts:

- Pallid Tithe-Lector.
- Gilt-Maw Assessor.
- Frostwire Collector.
- Hook-Crown Bailiff.
- Violet Ledger-Rake.
- Skittershroud, proposed Red enemy.
- Veilseason Shade, proposed Blue enemy.
- A boss-scenario seed requiring clean replacement art.

No new card, hazard, enemy, reward, deck entry, or scenario was created.

## Verification

- Content validation: passed.
- Typecheck: passed.
- Focused card-art, phone inspection, inventory, movement, and action tests: passed.
- Complete client suite: 72 files and 562 tests passed.
- Asset audit: 580/580 present, zero invalid, zero placeholder violations, zero phone-manifest issues.
- Browser QA at the S21-sized 384×722 viewport: no horizontal overflow, console errors, failed image requests, or full-resolution requests in normal join, piece, and operative setup views.
- The connected S21 was detected and authorized, but its blank Chrome DevTools target did not accept remote navigation during this pass; physical-device rendering is therefore not claimed as completed evidence.
- Gameplay, saves, protocol, privacy, TV artwork, and `Manualimages` sources: unchanged.
