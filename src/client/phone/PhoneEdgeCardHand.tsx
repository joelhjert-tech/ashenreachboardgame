import type { ReactElement } from "react";
import type {
  ClientIntent,
  PhoneEdgeCardHand as PhoneEdgeCardHandModel
} from "../shared/types.js";
import { CardArtImage } from "../shared/CardArtImage.js";
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
        Cards are awarded randomly. Burn one either to commit its value or activate its
        printed ability at the highlighted timing. Every play reveals on the TV.
      </p>
      <div className="phone-edge-hand__cards">
        {hand.cards.map((card) => {
          const commitDisabled = !hand.canCommit || !hand.resolutionId;
          const abilityTargets = card.ability.targets.length > 0
            ? card.ability.targets
            : [{ id: "", label: card.ability.label }];
          return (
            <article
              key={card.id}
              className="phone-edge-card"
            >
              <div className="phone-edge-card__art" aria-hidden="true">
                <CardArtImage cardType="edge" cardId={card.id} alt="" />
              </div>
              <div className="phone-edge-card__details">
                <span>Value {card.edgeValue} or icon ability</span>
                <strong>{card.name}</strong>
                <small>{card.abilityText}</small>
                {card.tradeoffText ? <em>{card.tradeoffText}</em> : null}
              </div>
              <div className="phone-edge-card__actions">
                <button
                  type="button"
                  className="phone-edge-card__commit"
                  disabled={commitDisabled}
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
                  Use number {card.edgeValue} as die
                </button>
                {abilityTargets.map((target) => (
                  <button
                    key={`${card.id}:${target.id || "ability"}`}
                    type="button"
                    className="phone-edge-card__ability"
                    disabled={!card.ability.enabled || !card.ability.resolutionId}
                    onClick={() => {
                      if (!card.ability.resolutionId) return;
                      onIntent({
                        type: "PLAY_EDGE_CARD",
                        seatId,
                        cardId: card.id,
                        resolutionId: card.ability.resolutionId,
                        mode: "ability",
                        ...(target.id ? { targetId: target.id } : {})
                      });
                    }}
                  >
                    Use icon · {target.label}
                  </button>
                ))}
              </div>
              {!card.ability.enabled && card.ability.disabledReason ? (
                <small className="phone-edge-card__reason">{card.ability.disabledReason}</small>
              ) : null}
            </article>
          );
        })}
      </div>
      {hand.disabledReason ? <small className="phone-edge-hand__reason">{hand.disabledReason}</small> : null}
      {hand.reaction ? (
        <button
          type="button"
          className="phone-edge-hand__pass"
          onClick={() => onIntent({
            type: "DECLINE_EDGE_CARD_REACTION",
            seatId,
            reactionId: hand.reaction!.id
          })}
        >
          Continue without an Edge ability
        </button>
      ) : null}
    </section>
  );
}
