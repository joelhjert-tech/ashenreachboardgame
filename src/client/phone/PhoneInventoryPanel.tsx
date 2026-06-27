import type { ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import type { ClientIntent, PhonePatchPayload } from "../shared/types.js";
import {
  getInventoryGroups,
  statLabelById,
  type InventoryCardViewModel
} from "./inventoryPresentation.js";

interface PhoneInventoryPanelProps {
  patch: PhonePatchPayload;
  onIntent: ((intent: ClientIntent) => void) | null;
  compact?: boolean;
  onlyUsable?: boolean;
  onUse?: () => void;
}

function toUseIntent(card: InventoryCardViewModel, seatId: string): ClientIntent | null {
  if (!card.useIntent) {
    return null;
  }

  if (card.useIntent.type === "USE_GEAR") {
    return {
      type: "USE_GEAR",
      seatId,
      gearId: card.useIntent.gearId
    };
  }

  return {
    type: "USE_FOLLOWER",
    seatId,
    followerId: card.useIntent.followerId
  };
}

function InventoryThumbnail({ card }: { card: InventoryCardViewModel }): ReactElement {
  if (card.artCardId) {
    return (
      <CardArtImage
        cardType="artifact"
        cardId={card.artCardId}
        alt=""
        aria-hidden="true"
        className="phone-inventory-card-art"
      />
    );
  }

  return (
    <div className="phone-inventory-card-fallback" aria-hidden="true">
      {card.fallbackLabel}
    </div>
  );
}

function getStatusLabel(status: InventoryCardViewModel["status"]): string {
  switch (status) {
    case "Ready but not usable now":
      return "Ready";
    case "Locked / condition not met":
      return "Locked";
    default:
      return status;
  }
}

function InventoryCard({
  card,
  seatId,
  onIntent,
  onUse
}: {
  card: InventoryCardViewModel;
  seatId: string;
  onIntent: ((intent: ClientIntent) => void) | null;
  onUse?: () => void;
}): ReactElement {
  const useIntent = toUseIntent(card, seatId);
  const statusLabel = getStatusLabel(card.status);

  return (
    <article className={`phone-inventory-card phone-inventory-card-${card.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <InventoryThumbnail card={card} />
      <div className="phone-inventory-card-copy">
        <div className="phone-inventory-card-heading">
          <h3>{card.name}</h3>
          <span>{statusLabel}</span>
        </div>
        <small>{card.group}</small>
        <p>{card.effectText}</p>
        <div className="phone-inventory-card-meta">
          <span>{card.timingText}</span>
          {card.statBonus && (
            <span>
              +{card.statBonus.amount} {statLabelById[card.statBonus.stat]}
            </span>
          )}
          {card.charges !== null && card.charges !== undefined && <span>{card.charges} charge{card.charges === 1 ? "" : "s"}</span>}
        </div>
        {!card.canUseNow && <small>{card.statusReason}</small>}
      </div>
      {card.canUseNow && useIntent && (
        <button
          type="button"
          className="phone-button phone-button-primary phone-inventory-use-button"
          aria-label={`Use ${card.name}`}
          onClick={() => {
            onIntent?.(useIntent);
            onUse?.();
          }}
        >
          Use
        </button>
      )}
    </article>
  );
}

export function PhoneInventoryPanel({
  patch,
  onIntent,
  compact = false,
  onlyUsable = false,
  onUse
}: PhoneInventoryPanelProps): ReactElement {
  const self = patch.self;

  if (!self) {
    return (
      <section className="phone-inventory-panel" aria-label="Inventory">
        <p className="phone-sheet-action-empty">No private player state is attached.</p>
      </section>
    );
  }

  const groups = getInventoryGroups(patch).map((group) => ({
    ...group,
    items: onlyUsable ? group.items.filter((card) => card.canUseNow) : group.items
  }));
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <section className={`phone-inventory-panel${compact ? " phone-inventory-panel-compact" : ""}`} aria-label="Inventory">
      {visibleGroups.length === 0 ? (
        <p className="phone-sheet-action-empty">
          {onlyUsable ? "No combat cards are usable in this timing window." : "No inventory cards, followers, or quest items yet."}
        </p>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.group} className="phone-inventory-group">
            <div className="phone-sheet-section-heading">{group.group}</div>
            <div className="phone-inventory-card-list">
              {group.items.map((card) => (
                <InventoryCard key={`${card.source}-${card.id}`} card={card} seatId={self.seatId} onIntent={onIntent} onUse={onUse} />
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
