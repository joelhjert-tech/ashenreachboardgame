import { useEffect, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { AuthoritativeDicePresentation, buildDice } from "../shared/AuthoritativeDicePresentation.js";
import { GameButton } from "../shared/GameButton.js";
import type { ResultDelta } from "../shared/types.js";

export interface PhoneResultReadyGateProps {
  actorName: string;
  operativeName: string;
  operativeId: string;
  sourceLabel: string;
  challengeTitle: string;
  challengeArtType: CardImageType | null;
  challengeArtId: string | null;
  challengeImagePath?: string | null;
  challengeFlavor?: string | null;
  success: boolean | null;
  playerTotal: number | null;
  targetTotal: number | null;
  playerTotalLabel?: string;
  targetTotalLabel?: string;
  resolutionId?: string;
  dice?: number[];
  modifierTotal?: number;
  modifierLabel?: string;
  outcomeTitle: string;
  outcomeText: string;
  outcomeEffects: string[];
  resultDeltas?: ResultDelta[];
  actionLabel?: string;
  actionDisabledReason?: string;
  canContinue: boolean;
  onContinue: () => void;
}

export function PhoneResultReadyGate({
  actorName,
  challengeTitle,
  success,
  playerTotal,
  targetTotal,
  resolutionId,
  dice = [],
  modifierTotal = 0,
  modifierLabel = "Modifiers",
  actionLabel = "Continue",
  actionDisabledReason,
  canContinue,
  onContinue
}: PhoneResultReadyGateProps): ReactElement {
  const diceRevealId = resolutionId && dice.length > 0
    ? `${resolutionId}:${dice.join(",")}:${playerTotal ?? "-"}`
    : null;
  const diceSeenKey = diceRevealId ? `ashenreach:phone-result-dice-seen:${diceRevealId}` : null;
  const animateDice = Boolean(
    diceSeenKey
    && typeof window !== "undefined"
    && window.sessionStorage.getItem(diceSeenKey) !== "1"
  );

  useEffect(() => {
    if (diceSeenKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(diceSeenKey, "1");
    }
  }, [diceSeenKey]);

  const outcomeTone = success === true ? "success" : success === false ? "defeat" : "neutral";

  return (
    <section
      className="phone-result-gate phone-result-gate--dice-only"
      data-testid="phone-resolution-card"
      data-result-ready-gate="true"
      data-outcome={outcomeTone}
      data-has-dice={diceRevealId ? "true" : "false"}
      aria-label={diceRevealId ? "Authoritative dice roll ready" : "Resolution ready"}
    >
      {diceRevealId ? (
        <AuthoritativeDicePresentation
          key={diceRevealId}
          className="phone-result-gate__dice"
          compact
          diceOnly
          animateOnMount={animateDice}
          model={{
            id: resolutionId ?? diceRevealId,
            revision: 0,
            stage: "result",
            context: "test",
            actorName,
            purpose: challengeTitle,
            dice: buildDice(dice),
            rawTotal: dice.reduce((total, die) => total + die, 0),
            modifiers: modifierTotal !== 0 ? [{ label: modifierLabel, value: modifierTotal }] : [],
            finalValue: playerTotal,
            target: targetTotal,
            outcome: success === null ? null : success ? "Success" : "Failure"
          }}
        />
      ) : null}

      <GameButton
        tone="primary"
        className="phone-button phone-button-primary phone-resolution-continue phone-result-gate__continue"
        data-testid={actionLabel === "Continue" ? "phone-resolution-continue" : undefined}
        type="button"
        disabled={!canContinue}
        disabledReason={!canContinue ? actionDisabledReason : undefined}
        onClick={onContinue}
      >
        {canContinue ? actionLabel : actionDisabledReason ?? "Applying consequence…"}
      </GameButton>
    </section>
  );
}
