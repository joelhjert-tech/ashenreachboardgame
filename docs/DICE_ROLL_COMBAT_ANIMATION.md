# Combat Dice Roll Animation

Generated assets:

- `/assets/riftfall/ui/dice_roll_combat@2s.lottie.json`
- `/assets/riftfall/ui/dice_roll_combat@2s.gif`

The Lottie file is 2.0 seconds at 30 fps and includes these markers:

- `roll_start` at 0.30s
- `roll_settle` at 1.40s
- `result_flash` at 1.70s
- `token_launch` at 1.80s

Editable text layers:

- `attack_value`
- `defense_value`
- `modifier_value`

Boolean hooks documented in `x_ashenReachProps`:

- `attack_success`
- `defense_success`
- `has_modifier`

Runtime usage:

Set the text values before `roll_start`. Use `attack_success`, `defense_success`, and `has_modifier` to choose the red, blue, or green glow state. The in-app React fallback uses `CombatDiceAnimation` and mirrors the same 2-second tumble, settle, highlight, and HUD-token launch without requiring a Lottie runtime.
