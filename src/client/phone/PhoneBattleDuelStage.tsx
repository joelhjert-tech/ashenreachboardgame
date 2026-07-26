import type { ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { OperativePortraitImage } from "../shared/OperativePortraitImage.js";

interface PhoneBattleDuelStageProps {
  operativeId: string;
  operativeName: string;
  playerName: string;
  enemyArtType: CardImageType;
  enemyId: string;
  enemyName: string;
  statLabel: string;
  operativeValue: number;
  opponentTotal: number;
  finalTotal: number | null;
  resultLabel: string;
}

function scoreLabel(finalTotal: number | null, statLabel: string): string {
  return finalTotal === null ? `${statLabel} ready` : "Operative total";
}

export function PhoneBattleDuelStage({
  operativeId,
  operativeName,
  playerName,
  enemyArtType,
  enemyId,
  enemyName,
  statLabel,
  operativeValue,
  opponentTotal,
  finalTotal,
  resultLabel
}: PhoneBattleDuelStageProps): ReactElement {
  const operativeScore = finalTotal ?? operativeValue;
  const phase = finalTotal === null ? "ready" : "result";
  const accessibleScore = `${operativeName} ${operativeScore}, ${enemyName} ${opponentTotal}`;

  return (
    <section
      key={`duel-aperture:${phase}`}
      className="phone-battle-duel"
      data-battle-presentation="duel-aperture"
      data-battle-phase={phase}
      data-testid="phone-battle-cinematic-stage"
      aria-label={`${playerName} versus ${enemyName}. ${accessibleScore}`}
    >
      <header className="phone-battle-duel__header">
        <span>Battle · {statLabel}</span>
        <strong>{resultLabel}</strong>
      </header>
      <div className="phone-battle-duel-stage">
        <figure className="phone-battle-duel-card phone-battle-duel-card--operative">
          <div className="phone-battle-duel-card__art">
            <OperativePortraitImage characterId={operativeId} alt={operativeName} priority />
          </div>
          <figcaption>
            <span>Operative</span>
            <strong>{operativeName}</strong>
            <small>{playerName}</small>
          </figcaption>
          <div className="phone-battle-duel-card__seal">
            <span>{scoreLabel(finalTotal, statLabel)}</span>
            <strong>{operativeScore}</strong>
          </div>
        </figure>
        <div className="phone-battle-duel-stage__rift" aria-hidden="true"><span>vs</span></div>
        <figure className="phone-battle-duel-card phone-battle-duel-card--enemy">
          <div className="phone-battle-duel-card__art">
            <CardArtImage cardType={enemyArtType} cardId={enemyId} alt={enemyName} />
          </div>
          <figcaption>
            <span>Threat</span>
            <strong>{enemyName}</strong>
          </figcaption>
          <div className="phone-battle-duel-card__seal">
            <span>Difficulty</span>
            <strong>{opponentTotal}</strong>
          </div>
        </figure>
      </div>
      <p className="phone-battle-duel__prompt">
        {finalTotal === null ? `Roll ${statLabel} when ready.` : "Authoritative totals locked."}
      </p>
    </section>
  );
}
