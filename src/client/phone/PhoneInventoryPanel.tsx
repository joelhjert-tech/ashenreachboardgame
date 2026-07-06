import type { CSSProperties, ReactElement, ReactNode } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  NORMAL_STAT_UPGRADE_CAP
} from "../../game/rules/statUpgrades.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { statOrder } from "../shared/statLabels.js";
import type { ClientIntent, PhonePatchPayload, Stat, TrophyPileEntry } from "../shared/types.js";
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

function getInventoryConsequence(card: InventoryCardViewModel): string {
  if (card.statBonus) {
    const bonus = `+${card.statBonus.amount} ${statLabelById[card.statBonus.stat]}`;
    const timing = card.timingText && card.timingText !== "Passive" ? ` during ${card.timingText.toLowerCase()}` : "";
    return `${card.status === "Passive" ? "Applies" : "Adds"} ${bonus}${timing}.`;
  }

  return card.effectText;
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
  const consequence = getInventoryConsequence(card);

  const metaItems = ([
    consequence !== card.effectText ? { key: "effect", node: card.effectText } : null,
    { key: "timing", node: card.timingText },
    card.statBonus
      ? {
          key: "stat-bonus",
          node: (
            <em
              className="phone-inventory-stat-bonus"
              style={getChallengeThemeStyle(card.statBonus.stat) as CSSProperties}
            >
              +{card.statBonus.amount} {statLabelById[card.statBonus.stat]}
            </em>
          )
        }
      : null,
    card.charges !== null && card.charges !== undefined
      ? {
          key: "charges",
          node:
            card.maxUses !== null && card.maxUses !== undefined
              ? `${card.charges}/${card.maxUses} use${card.maxUses === 1 ? "" : "s"}`
              : `${card.charges} charge${card.charges === 1 ? "" : "s"}`
      }
      : null
  ] as Array<{ key: string; node: ReactNode } | null>).filter((item): item is { key: string; node: ReactNode } => Boolean(item));

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
      description={<p className="phone-wrap-card__consequence">{consequence}</p>}
      disabledReason={<small className="phone-inventory-card-status-reason">{statusReason}</small>}
      meta={
        <div className="phone-inventory-card-meta">
          {metaItems.map((item) => (
            <span key={item.key}>{item.node}</span>
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

function getTrophyPileEntryAvailableValue(entry: TrophyPileEntry): number {
  return Math.max(0, entry.trophyValue - (entry.spentValue ?? 0));
}

function InventoryProgressionSection({
  patch,
  onIntent
}: {
  patch: PhonePatchPayload;
  onIntent: ((intent: ClientIntent) => void) | null;
}): ReactElement | null {
  const self = patch.self;

  if (!self) {
    return null;
  }

  const trophies = self.character.trophies;
  const trophyPile = self.character.trophyPile ?? [];
  const pileAvailableValue = trophyPile.reduce((total, entry) => total + getTrophyPileEntryAvailableValue(entry), 0);

  return (
    <section className="phone-inventory-progression" aria-label="Progression" data-testid="phone-inventory-progression">
      <div className="phone-inventory-progression-header">
        <div>
          <span>Progression</span>
          <strong>Trophies: {trophies}</strong>
        </div>
        <small>{pileAvailableValue} from defeated enemies</small>
      </div>

      <div className="phone-inventory-trophy-list" aria-label="Trophy source summary">
        {trophyPile.length > 0 ? (
          trophyPile.slice(0, 3).map((entry) => {
            const availableValue = getTrophyPileEntryAvailableValue(entry);

            return (
              <article key={`${entry.cardId}-${entry.spentValue ?? 0}`} className="phone-inventory-trophy-card">
                <span>{entry.stat ? statLabelById[entry.stat] : "Trophy"}</span>
                <strong>{entry.name}</strong>
                <em>
                  {availableValue}/{entry.trophyValue}
                </em>
              </article>
            );
          })
        ) : (
          <p>Defeat threats to bank trophies for permanent stat upgrades.</p>
        )}
      </div>

      <div className="phone-inventory-upgrades">
        <span className="phone-inventory-upgrades-title">Available Upgrades</span>
        <div className="phone-inventory-upgrade-grid">
          {statOrder.map((stat) => {
            const currentValue = self.character.stats[stat];
            const nextValue = Math.min(currentValue + 1, NORMAL_STAT_UPGRADE_CAP);
            const cost = getStatUpgradeCost(currentValue);
            const disabledReason = getStatUpgradeDisabledReason({
              stat: stat as Stat,
              currentValue,
              trophies,
              qaOnly: self.character.qaOnly === true,
              cap: NORMAL_STAT_UPGRADE_CAP
            });
            const label = currentValue >= NORMAL_STAT_UPGRADE_CAP
              ? `${statLabelById[stat]} ${currentValue}`
              : `${statLabelById[stat]} ${currentValue} -> ${nextValue}`;

            return (
              <GameButton
                key={stat}
                type="button"
                tone="secondary"
                className="phone-button phone-sheet-action-button phone-sheet-action-button-stat phone-inventory-upgrade-button"
                style={getChallengeThemeStyle(stat) as CSSProperties}
                disabled={Boolean(disabledReason)}
                disabledReason={disabledReason ?? undefined}
                onClick={() =>
                  onIntent?.({
                    type: "RAISE_STAT_REQUESTED",
                    seatId: self.seatId,
                    stat: stat as Stat
                  })
                }
                sublabel={disabledReason ?? `Cost ${cost} Troph${cost === 1 ? "y" : "ies"}`}
              >
                {label}
              </GameButton>
            );
          })}
        </div>
      </div>
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
      {!onlyUsable && <InventoryProgressionSection patch={patch} onIntent={onIntent} />}
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
