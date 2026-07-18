import type { ReactElement } from "react";
import type { ClientIntent, PhonePatchPayload } from "../shared/types.js";
import { GameButton } from "../shared/GameButton.js";
import { statLabelById } from "../shared/statLabels.js";

export function CinderWattleAbilityPanel({
  patch,
  seatId,
  onIntent
}: {
  patch: PhonePatchPayload;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
}): ReactElement | null {
  const action = patch.characterAbilityAction;
  if (!action) return null;
  const statLabel = action.stat ? statLabelById[action.stat] : "skill";

  return (
    <section className={`phone-cw-instinct${action.prepared ? " is-prepared" : ""}`} aria-label="Scrap-Crowned Instinct">
      <div>
        <span>Once per round</span>
        <strong>{action.name}</strong>
        <p>
          {action.prepared
            ? `+1 ${statLabel} is prepared for ${action.sourceTitle ?? "this test"}.`
            : action.stat
              ? `Add +1 ${statLabel} before rolling ${action.sourceTitle ?? "this test"}.`
              : action.disabledReason}
        </p>
      </div>
      <GameButton
        type="button"
        tone="secondary"
        disabled={!action.available}
        title={!action.available ? action.disabledReason ?? "Unavailable" : undefined}
        onClick={() => onIntent({ type: "USE_CHARACTER_ABILITY", seatId, abilityId: action.abilityId })}
      >
        {action.prepared ? "+1 Prepared" : action.usedThisRound ? "Used this round" : "Use +1 instinct"}
      </GameButton>
    </section>
  );
}
