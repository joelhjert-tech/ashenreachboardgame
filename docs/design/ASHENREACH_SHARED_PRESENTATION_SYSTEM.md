# Ashen Reach Shared Presentation System

## Purpose

This system consolidates presentation behavior used by setup, required actions, movement, encounters, battle, results, handoff, shop, player card, and inventory. It is deliberately not a gameplay framework. Server projections still decide what exists, who acts, what is legal, and when a state is complete.

## Artwork

`ArtworkFrame` owns stable containment, load state, cached-image recovery, and deterministic failure presentation. `HostImage`, `CardArtImage`, and `OperativePortraitImage` are domain adapters over that primitive.

| Role | Ratio | Default fit | Loading |
|---|---:|---|---|
| Operative/enemy portrait | 3:4 | cover, focal point near face | eager only when focal |
| Encounter/Equipment/Artifact card | 5:7 | contain | lazy off screen |
| Mission/shop/scenario panel | 16:9 | cover for atmosphere; contain when text is embedded | focal view eager |
| Host hero/background | 21:9 | cover | eager when current |
| Map tile/icon | 1:1 | cover for tile, contain for icon | current route eager |

`contain` is required when cropping would hide a silhouette, card boundary, item edge, icon, or mechanical identity. `cover` is for atmospheric fields, portraits, tiles, and hero surfaces with an explicit focal point.

Missing and failed images use category-specific Ashen Reach fallback copy. The accessible name is the authored alt description; visible copy is generic. Filenames, paths, stable IDs, and private data are never rendered. Decorative missing images remain hidden from assistive technology.

The aspect-ratio frame exists before decode, so image completion does not move surrounding layout. Cached images are checked through `complete` and `naturalWidth` to avoid the prior blank-cached-portrait state. Current focal art may use eager loading and high fetch priority; inventory and carousel art remains lazy.

## Motion

Shared durations:

| Token | Value | Use |
|---|---:|---|
| instant | 80 ms | press feedback, state lock |
| quick | 140 ms | opacity and border change |
| normal | 220 ms | panel/tab change |
| deliberate | 360 ms | focused state entry |
| cinematic | 520 ms | restrained reveal |
| heavy | 760 ms | major non-blocking emphasis |

Shared easings are `command`, `impact`, `warning`, `snap`, and `fade`. Functional motion explains a server-authored change; decorative motion never delays an action. Movement pacing (300/520/680/760 ms), dice presentation, and the 900 ms handoff remain feature-specific because they communicate established sequences. Animation does not dispatch gameplay commands.

`useReducedMotion` is the common preference source. Reduced motion removes travel, scale, shimmer, pulse, and decorative interpolation while preserving state copy, input locking, focus, totals, and result order. It never changes the authoritative state or reveals a result early.

## Phone viewport and safe areas

Shared variables:

- `--phone-safe-top/right/bottom/left`
- `--phone-navigation-height`
- `--phone-compact-navigation-height`
- `--phone-action-clearance`
- `--touch-target-min: 44px`

Phone screens use `100dvh`, one primary column, bounded art, and a single dominant action. Scroll content reserves navigation plus bottom inset plus action gap. Sticky controls must not cover the last reachable content. Core decisions do not become multi-column at 360 px. Critical button verbs and disabled reasons wrap rather than ellipsize.

## TV layout

TV remains map-first outside focused resolution states. Focused overlays are bounded at 1366x768, 1600x900, and 1920x1080. Essential totals, acting identity, and results retain couch-readable hierarchy. Six-player lobby layout and board geometry remain feature-owned.

## Status and action states

Canonical visible states are: `YOUR TURN`, `WAITING`, `ACTION REQUIRED`, `SUBMITTING`, `ROLLING`, `CHOOSING`, `MOVING`, `RESOLVING`, `RESULT`, `RESULT READY`, `CONTINUE`, `TURN READY`, `END TURN`, `PURCHASING`, `SELLING`, `LEAVING`, `RECONNECTING`, `CONNECTION LOST`, `RESTORING`, `READY`, `LOADING`, and `ACTION BLOCKED`.

`GameButton` presents command state but never owns command legality. It locks immediately when loading, preserves native disabled behavior and reason metadata, maintains a 44 px minimum target, and wraps critical copy. One command shell owns the primary action; a spinner and a duplicated live message are not rendered as competing status signals.

## Focus and announcements

`useFocusOnRevision` moves focus once for a meaningful authoritative revision. It does not refocus on unchanged projections and never targets hidden or disabled controls. Required-action, movement, and battle focus use this contract. Inspection components remain responsible for returning focus to their opener.

`LiveStatus` deduplicates announcements by revision and message. Polite announcements cover required-action changes, movement steps, results, transactions, and reconnection. Assertive announcements are reserved for connection loss, blocking setup failures, and critical stale recovery. Animation frames are never announced. Public surfaces receive only public projection copy; private options remain on the owning phone.

## Typography and long content

- Screen title: concise feature identity.
- State label: short uppercase status.
- Primary result: strongest numeric/text emphasis.
- Body/mechanics: readable before lore.
- Supporting/lore: secondary and collapsible where long.
- TV-distance label: no tiny peripheral dependency.

Names, rule text, modifiers, and blocked reasons wrap with `overflow-wrap`. Mechanical meaning is never truncated. Lore may collapse behind an accessible details control.

## Empty, blocked, loading, and reconnect states

An empty or blocked state explains what happened and what can happen next. No empty decorative card or unexplained disabled control is shown. Loading is distinct from gameplay resolution. Stable public context remains visible during reconnect where safe. Image loading uses a bounded placeholder; missing art becomes a deterministic category fallback.

## Privacy boundary

Presentation components consume projections; they do not broaden them. Alt text, fallback copy, labels, and live announcements may not contain internal IDs, asset paths, private inventory, private Salvage, Rivalry targets, hidden missions, hidden Artifact choices, or owner-only rewards.
