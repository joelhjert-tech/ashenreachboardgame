import type { ReactElement } from "react";
import type {
  ClientIntent,
  PhoneEdgeCardHand as PhoneEdgeCardHandModel
} from "../shared/types.js";
import "./PhoneEdgeCardHand.css";

export function PhoneEdgeCardHand({
  hand,
  seatId,
  onIntent,
  embedded = false
}: {
  hand: PhoneEdgeCardHandModel;
  seatId: string;
  onIntent: (intent: ClientIntent) => void;
  embedded?: boolean;
}): ReactElement | null {
  if (hand.cards.length === 0) return null;

  return (
    <section className={`phone-edge-hand${embedded ? " phone-edge-hand--inventory" : ""}`} aria-label="Private Edge Card hand">
      {!embedded ? <header>
        <div>
          <span>Private reserve</span>
          <strong>Edge Cards</strong>
        </div>
        <small>{hand.cards.length}/{hand.limit}</small>
      </header> : null}
      <p>
        Cards are awarded randomly. Commit one before an eligible enemy battle or Hazard
        roll; it burns after use and reveals on the TV.
      </p>
      <div className="phone-edge-hand__cards">
        {hand.cards.map((card) => {
          const disabled = !hand.canCommit || !hand.resolutionId;
          return (
            <button
              key={card.id}
              type="button"
              className="phone-edge-card"
              disabled={disabled}
              aria-describedby={`edge-card-detail-${card.id}`}
              onClick={() => {
                if (!hand.resolutionId) return;
                onIntent({
                  type: "PLAY_EDGE_CARD",
                  seatId,
                  cardId: card.id,
                  resolutionId: hand.resolutionId,
                  mode: "commit-value"
                });
              }}
            >
              <span>Edge</span>
              <b>{card.edgeValue}</b>
              <strong>{card.name}</strong>
              <small id={`edge-card-detail-${card.id}`}>{card.commitText}</small>
            </button>
          );
        })}
      </div>
      {hand.disabledReason ? <small className="phone-edge-hand__reason">{hand.disabledReason}</small> : null}
    </section>
  );
}
