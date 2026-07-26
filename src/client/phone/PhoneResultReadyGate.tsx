import { useState, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { getCharacterPortraitPath, getResultReadyGatePath } from "../shared/assetPaths.js";
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
  outcomeTitle: string;
  outcomeText: string;
  outcomeEffects: string[];
  resultDeltas?: ResultDelta[];
  canContinue: boolean;
  onContinue: () => void;
}

function verdictTitle(success: boolean | null): string {
  if (success === true) return "The Gate Yields";
  if (success === false) return "The Signal Breaks";
  return "The Verdict Holds";
}

export function PhoneResultReadyGate({
  actorName,
  operativeName,
  operativeId,
  sourceLabel,
  challengeTitle,
  challengeArtType,
  challengeArtId,
  challengeImagePath = null,
  challengeFlavor,
  success,
  playerTotal,
  targetTotal,
  playerTotalLabel = "Your total",
  targetTotalLabel = "Challenge",
  outcomeTitle,
  outcomeText,
  outcomeEffects,
  resultDeltas = [],
  canContinue,
  onContinue
}: PhoneResultReadyGateProps): ReactElement {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const outcomeTone = success === true ? "success" : success === false ? "defeat" : "neutral";
  const visibleChanges = [
    ...outcomeEffects,
    ...resultDeltas
      .filter((delta) => delta.visibility !== "hidden")
      .map((delta) => delta.privateText ?? delta.publicText)
  ]
    .map((entry) => entry.trim())
    .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index)
    .filter((entry) => entry.toLocaleLowerCase() !== outcomeText.trim().toLocaleLowerCase())
    .slice(0, 4);

  return (
    <section
      className="phone-result-gate"
      data-testid="phone-resolution-card"
      data-result-ready-gate="true"
      data-outcome={outcomeTone}
      aria-label="Authoritative result ready"
    >
      <img
        className="phone-result-gate__environment"
        src={getResultReadyGatePath()}
        alt=""
        aria-hidden="true"
        width={706}
        height={1254}
        decoding="async"
      />
      <div className="phone-result-gate__shade" aria-hidden="true" />

      <header className="phone-result-gate__title">
        <span>Result ready · waits for your choice</span>
        <h2>{verdictTitle(success)}</h2>
        <p>{challengeTitle} · {sourceLabel}</p>
      </header>

      <div className="phone-result-gate__verdict">
        <div className="phone-result-gate__portraits">
          <figure>
            <img
              className="phone-result-gate__portrait-art"
              src={getCharacterPortraitPath(operativeId)}
              alt={`${operativeName} operative portrait`}
              width={720}
              height={1080}
              decoding="async"
            />
            <figcaption><span>Operative</span><strong>{operativeName}</strong></figcaption>
          </figure>
          <figure className="is-challenge">
            {challengeImagePath ? (
              <img
                className="phone-result-gate__challenge-art"
                src={challengeImagePath}
                alt={`${challengeTitle} location artwork`}
                decoding="async"
              />
            ) : challengeArtType ? (
              <CardArtImage
                cardType={challengeArtType}
                cardId={challengeArtId}
                alt={`${challengeTitle} challenge artwork`}
              />
            ) : (
              <span className="phone-result-gate__art-fallback" aria-label={`${challengeTitle} challenge`}>
                {challengeTitle.slice(0, 1).toUpperCase()}
              </span>
            )}
            <figcaption><span>{sourceLabel}</span><strong>{challengeTitle}</strong></figcaption>
          </figure>
        </div>

        <div className="phone-result-gate__rift" aria-hidden="true" />
        <div className="phone-result-gate__seal" aria-label={playerTotal === null ? "Authoritative result" : `${playerTotalLabel} ${playerTotal}`}>
          <span>Total</span>
          <strong>{playerTotal ?? "—"}</strong>
        </div>
        {(playerTotal !== null || targetTotal !== null) ? (
          <div
            className="phone-result-gate__totals"
            data-testid="phone-roll-result"
            aria-label={`${playerTotalLabel} ${playerTotal ?? "unavailable"}, ${targetTotalLabel} ${targetTotal ?? "unavailable"}`}
          >
            <div><span>{playerTotalLabel}</span><strong>{playerTotal ?? "—"}</strong></div>
            <i aria-hidden="true">vs</i>
            <div><span>{targetTotalLabel}</span><strong>{targetTotal ?? "—"}</strong></div>
          </div>
        ) : null}
      </div>

      <section className="phone-result-gate__consequence" aria-label="Authoritative consequence">
        <div className="phone-result-gate__consequence-copy">
          <span>Authoritative consequence</span>
          <strong>{outcomeTitle}</strong>
          <p>{outcomeText}</p>
          {visibleChanges.length > 0 ? (
            <ul className="phone-result-gate__effects" aria-label="Applied changes">
              {visibleChanges.map((effect) => <li key={effect}>{effect}</li>)}
            </ul>
          ) : null}
          {detailsOpen ? (
            <div className="phone-result-gate__details" data-testid="phone-result-ready-details">
              {challengeFlavor ? <p>{challengeFlavor}</p> : null}
            </div>
          ) : null}
        </div>
        <div className={`phone-result-gate__actions${challengeFlavor ? "" : " is-single"}`}>
          {challengeFlavor ? (
            <button
              type="button"
              className="phone-result-gate__review"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? "Hide lore" : "Review lore"}
            </button>
          ) : null}
          <GameButton
            tone="primary"
            className="phone-button phone-button-primary phone-resolution-continue phone-result-gate__continue"
            data-testid="phone-resolution-continue"
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
          >
            {canContinue ? "Continue" : "Applying consequence…"}
          </GameButton>
        </div>
        <small>{actorName} · no countdown · reconnect-safe</small>
      </section>
    </section>
  );
}
