import type { ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import type { ClientIntent, PhonePatchPayload } from "../shared/types.js";
import { PhoneWrappedMediaCard } from "./PhoneWrappedMediaCard.js";
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
        className="phone-wrap-card__image phone-inventory-card-art"
      />
    );
  }

  return (
    <div className="phone-wrap-card__fallback phone-inventory-card-fallback" aria-hidden="true">
      {card.fallbackLabel}
    </div>
  );
}

function getStatusLabel(status: InventoryCardViewModel["status"]): string {
  switch (status) {
    case "Ready but not usable now":
      return "Timing locked";
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
  const statusReason = card.canUseNow ? "Active in this timing window." : card.statusReason;
  const stateLabel = card.canUseNow ? "active" : card.status === "Passive" ? "applied" : "inactive";

  const metaItems = [
    card.timingText,
    card.statBonus ? `+${card.statBonus.amount} ${statLabelById[card.statBonus.stat]}` : null,
    card.charges !== null && card.charges !== undefined
      ? card.maxUses !== null && card.maxUses !== undefined
        ? `${card.charges}/${card.maxUses} use${card.maxUses === 1 ? "" : "s"}`
        : `${card.charges} charge${card.charges === 1 ? "" : "s"}`
      : null
  ].filter(Boolean);

  return (
    <PhoneWrappedMediaCard
      variant="inventory"
      className={`phone-inventory-card phone-inventory-card-${card.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      dataState={stateLabel}
      ariaLabel={`${card.name}: ${card.status}. ${statusReason}`}
      media={<InventoryThumbnail card={card} />}
      title={card.name}
      eyebrow={card.group}
      status={<span className="phone-inventory-card-status">{statusLabel}</span>}
      description={<p>{card.effectText}</p>}
      disabledReason={<small className="phone-inventory-card-status-reason">{statusReason}</small>}
      meta={
        <div className="phone-inventory-card-meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      }
      actions={card.canUseNow && useIntent ? (
        <GameButton
          type="button"
          tone="action"
          className="phone-button phone-button-primary phone-inventory-use-button"
          aria-label={`Use ${card.name}`}
          onClick={() => {
            onIntent?.(useIntent);
            onUse?.();
          }}
        >
          Use now
        </GameButton>
      ) : null}
    />
  );
}

function InventoryTimingGroups({ cards }: { cards: InventoryCardViewModel[] }): ReactElement | null {
  const groups = [
    {
      label: "Useful now",
      items: cards.filter((card) => card.canUseNow)
    },
    {
      label: "Passive / already applied",
      items: cards.filter((card) => card.status === "Passive")
    },
    {
      label: "Not usable now",
      items: cards.filter((card) => !card.canUseNow && card.status !== "Passive")
    }
  ];

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="phone-inventory-timing-groups" aria-label="Inventory timing groups">
      {groups.map((group) => (
        <article key={group.label} className="phone-inventory-timing-group">
          <span>{group.label}</span>
          <strong>{group.items.length}</strong>
          <small>{group.items.slice(0, 2).map((item) => item.name).join(", ") || "None"}</small>
        </article>
      ))}
    </section>
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

  const inventoryGroups = getInventoryGroups(patch);
  const allCards = inventoryGroups.flatMap((group) => group.items);
  const groups = inventoryGroups.map((group) => ({
    ...group,
    items: onlyUsable ? group.items.filter((card) => card.canUseNow) : group.items
  }));
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const visibleItemCount = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);
  const panelClassName = [
    "phone-inventory-panel",
    compact ? "phone-inventory-panel-compact" : "",
    visibleItemCount > 8 ? "phone-inventory-panel-overflow" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={panelClassName} aria-label="Inventory" data-item-count={visibleItemCount}>
      {!onlyUsable && <InventoryTimingGroups cards={allCards} />}
      {visibleGroups.length === 0 ? (
        <p className="phone-sheet-action-empty">
          {onlyUsable ? "No combat cards are usable in this timing window." : "No inventory cards, followers, or quest items yet."}
        </p>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.group} className="phone-inventory-group">
            <div className="phone-sheet-section-heading">
              <span className="phone-inventory-group-label">{group.group}</span>
              <span className="phone-inventory-group-count" aria-label={`${group.items.length} ${group.group} cards`}>
                {group.items.length}
              </span>
            </div>
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
