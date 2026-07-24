# Physical Android Functional Tests

## Passed on Galaxy S21+

- Real keyboard: input and complete 44px Join Game action remained visible.
- Join: a physical tap submitted once and recoverable errors retained values.
- Setup: operative, mission, Ready, and Start completed through Device Mirroring.
- Android Back during operative selection and mandatory Roll Movement opened one safety dialog.
- Stay in Game returned to the exact authoritative Roll Movement control.
- Inventory deep scroll to Objectives reset to `scrollTop=0`; Objectives opened at its title/card start.
- Hazard result showed canonical raw dice 1+1, operative +3, final 5, target 8, Failure, authored Wound/movement consequence, and the reaction action.
- Background/resume restored the same page once the dev hot-reload cycle settled.
- Reload restored the concluded authoritative state without replay.
- Victory, defeat, and reduced-motion fixtures rendered without horizontal overflow.

## Canonical leave

The dialog's Leave Room action calls the existing `leaveSession` path. Focused unit coverage proves it is not called when opening the dialog or choosing Stay, and is called once only after explicit confirmation.

The P18 physical tap-through found that the server endpoint previously rejected active seats. The corrected endpoint now disconnects the active phone while retaining its authoritative seat, operative, turn position, inventory, and required action. The physical phone returned to Join, the host/public room state showed the seat disconnected, and a second leave request made no state-sequence change. Lobby seat release remains unchanged.

Five consecutive Back/Stay cycles were exercised before submitting the original movement action once. No dialog duplication, browser-history growth, or gameplay mutation was observed.

## P18 recordings

- `recordings/p18-01-join-keyboard.mp4`
- `recordings/p18-02-setup-first-action.mp4`
- `recordings/p18-02b-start-first-action.mp4`
- `recordings/p18-03-movement-hazard.mp4`
- `recordings/p18-04-battle.mp4`
- `recordings/p18-05-shop.mp4`
- `recordings/p18-06-player-card-inventory.mp4`
- `recordings/p18-07-android-back-stay.mp4`
- `recordings/p18-08-android-back-leave-fixed.mp4`
- `recordings/p18-09-background-resume.mp4`
- `recordings/p18-10-reload-reconnect.mp4`
- `recordings/p18-11-reduced-motion.mp4`
- `recordings/p18-12-endgame-victory-defeat.mp4`

The original rejected Leave Room run is retained as diagnostic evidence at `recordings/p18-08-android-back-leave.mp4`; it is not acceptance evidence for the corrected behavior.

## Browser limitations

OS force-stop, Chrome eviction, tab termination, and device shutdown are not interceptable. They remain reconnect cases rather than guarded navigation cases.
