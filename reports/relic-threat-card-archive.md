# Relic Threat Card Research Archive

## Scope and boundary

This private design-reference archive covers every page returned by the MediaWiki API for the four requested Fandom categories:

- [Red Threat Cards](https://relic40k.fandom.com/wiki/Category:Red_Threat_Cards)
- [Blue Threat Cards](https://relic40k.fandom.com/wiki/Category:Blue_Threat_Cards)
- [Yellow Threat Cards](https://relic40k.fandom.com/wiki/Category:Yellow_Threat_Cards)
- [Orange Threat Cards](https://relic40k.fandom.com/wiki/Category:Orange_Threat_Cards)

The images are copyrighted reference material. They remain ignored and untracked under `research/reference/relic/threat-cards/`; none is in `public/`, `src/`, `content/`, a runtime asset manifest, or an Ashen Reach asset directory. They must not be redistributed as part of the game.

## Discovery method

The crawl used `api.php?action=query&list=categorymembers` with `cmlimit=500`, followed category continuations, retained page IDs and canonical page URLs, and queried each member for page categories and image candidates. This avoids Fandom lazy-loading and first-page truncation. The four categories contain no continuation beyond the retrieved member sets and no subcategory was needed to reach a card page.

For each member, navigation images, lane backs, expansion icons, and generic Fandom decoration were rejected. The selected scan was the page-matching, largest portrait original returned by `imageinfo`, never a thumbnail. One legitimate title containing “Avatar” was initially caught by the decorative-image filter and was recovered by page-ID review. No access control or anti-bot mechanism was bypassed; requests used a descriptive user agent and modest pacing.

## Archive result

| Color | Category members | Original scans | Missing | Destination |
|---|---:|---:|---:|---|
| Red | 75 | 75 | 0 | `research/reference/relic/threat-cards/red/` |
| Blue | 72 | 72 | 0 | `research/reference/relic/threat-cards/blue/` |
| Yellow | 74 | 74 | 0 | `research/reference/relic/threat-cards/yellow/` |
| Orange | 40 | 40 | 0 | `research/reference/relic/threat-cards/orange/` |
| **Total** | **261** | **261** | **0** | |

- Image files: 261 JPEG originals.
- Aggregate image bytes: 721,960,602 bytes (about 688.5 MiB).
- Resolution range: 1961×3009 through 2095×3097.
- Median resolution: 1983×3044.
- Missing-image pages: 0.
- Pages with multiple plausible full-card scans: 0.
- Exact duplicate hashes: 0.
- Alternate scan/version groups discovered: 0.
- Redirects affecting identity: 0.
- Image-selection manual review: 1 recovered false-negative (`Avatar of Khaine`).
- Detailed rules-text review queue: 261, because the wiki pages generally expose an image plus classification categories rather than transcribed card rules.

The absence of alternate versions means no front/back or language variant was silently discarded by this crawl. It does not prove that no alternate scan exists outside the source pages.

## Stable naming and integrity

Files use `<color>_<page-slug>.jpg`. Every record stores the page title, page ID, category, source page, original image URL, local reference path, dimensions, byte size, SHA-256, download timestamp, and status. Exact-file deduplication is hash-based; distinct images are retained even when titles or artwork themes are similar.

Machine-readable manifests:

- `research/reference/relic/threat-cards/manifests/relic-threat-card-index.json`
- `research/reference/relic/threat-cards/manifests/relic-threat-card-index.csv`

The JSON retains raw category membership, wiki categories, image candidates, selected download metadata, and duplicate-hash groups. The CSV provides a flat research index. Both remain untracked with the images.

## Card-text confidence

Identity, color, page ID, classification category, tested Relic attribute, printed attribute value, expansion membership, image provenance, and file integrity are high-confidence where the wiki categorizes them. Fine mechanics such as timing, persistence, success/failure asymmetry, rewards, movement, damage, and trophy exceptions are marked `uncertain` unless directly supported by metadata or a reviewed scan.

No complete copyrighted rules text is reproduced in tracked reports. The design reports use paraphrase and structural observations. The archive is therefore complete as a source and identity catalogue, while its fine-grained mechanical fields are deliberately conservative pending card-by-card visual transcription.

## Repository containment

- Runtime assets added: none.
- Runtime manifests changed: none.
- Gameplay/content/schema/UI files changed: none.
- Research path is locally excluded through Git’s private exclude file.
- Only the three requested reports are eligible for the tracked commit.
