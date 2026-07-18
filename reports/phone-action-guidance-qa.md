# Phone action guidance QA

## Model

One projection-derived guidance model determines both the recommended tab and the concise instruction. It does not submit actions.

| State | Owner guidance | Other phones |
|---|---|---|
| Movement roll | Move — Roll movement | Waiting for the active player |
| Destination available | Move — Choose a destination | Waiting for the active player |
| Shop | Shop — Browse Equipment or choose a service | Waiting; no buyer controls |
| Action | Action — Choose your sector action | Waiting |
| Owned battle | Dedicated battle shell and sticky battle action | Public-safe waiting message |
| Resolution choice | Action — Resolve the current choice or continue | No private option content |

The required tab receives a restrained highlight. Reconnect recomputes it from the current patch. Manual tab selection remains presentation-only and a subsequent authoritative phase change restores the correct recommendation.

## Above-fold/browser review

Phone QA used 390x844. Move guidance, active tab, and the primary action remained above the fold. A first implementation placed the global guidance above the battle shell and compressed the arena; screenshot review caught this. Opposed battle now omits the duplicate global banner because its dedicated shell already supplies state, instruction, and one sticky CTA.

Screenshots:

- `reports/ui/live-play-defects/after/phone-guidance-move-390x844.png`
- `reports/ui/live-play-defects/after/phone-guidance-shop-390x844.png`
- `reports/ui/live-play-defects/after/phone-guidance-battle-390x844.png`
- `reports/ui/live-play-defects/after/phone-battle/`

## Privacy and accessibility

Waiting copy may identify who is acting but never copies private reaction, mission, Rivalry, or inventory options. Guidance uses a polite live status region; tabs retain normal roles and selection state. Touch controls are unchanged.

## Critique seats

- New player: the next tab and action are stated together.
- Optimizer: tab switching has no gameplay side effect and cannot expose another seat's battle.
- Family/casual: one instruction replaces multiple competing prompts.
- Rules lawyer: ownership and phase come from the server patch; no client result or permission is inferred.
