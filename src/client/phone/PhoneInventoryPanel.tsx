import { useId, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  NORMAL_STAT_UPGRADE_CAP
} from "../../game/rules/statUpgrades.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { statOrder } from "../shared/statLabels.js";
import type { AfflictionSummary, ClientIntent, PhonePatchPayload, ScarSummary, Stat, TrophyPileEntry } from "../shared/types.js";
import { getAfflictionEffectChips, getAfflictionStatusLabel } from "./afflictionPresentation.js";
import { PhoneWrappedMediaCard } from "./PhoneWrappedMediaCard.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";
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

function InventoryDisclosure({
  label,
  count,
  initiallyOpen,
  actionAvailable,
  children
}: {
  label: string;
  count: number;
  initiallyOpen: boolean;
  actionAvailable: boolean;
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(initiallyOpen);
  const reactId = useId();
  const contentId = `phone-inventory-group-${reactId.replace(/:/g, "")}`;
  const buttonId = `${contentId}-toggle`;

  return (
    <section className={`phone-inventory-group${open ? " is-open" : ""}${actionAvailable ? " has-action" : ""}`}>
      <button
        type="button"
        id={buttonId}
        className="phone-sheet-section-heading phone-inventory-group-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="phone-inventory-group-label">{label}</span>
        {actionAvailable ? <span className="phone-inventory-group-action">Action available</span> : null}
        <span className="phone-inventory-group-count" aria-label={`${count} ${label} cards`}>{count}</span>
        <span className="phone-inventory-group-indicator" aria-hidden="true" />
      </button>
      {open ? <div id={contentId} role="group" aria-labelledby={buttonId} className="phone-inventory-group-content">{children}</div> : null}
    </section>
  );
}

function toUseIntent(card: InventoryCardViewModel, seatId: string): ClientIntent | null {
  if (!card.useIntent) {
    return null;
  }

  if (card.useIntent.type === "USE_GEAR") {
    return {
      type: "USE_GEAR",
      seatId,
      gearId: card.useIntent.gearId,
      instanceId: card.useIntent.instanceId,
      contractSignature: card.useIntent.contractSignature
    };
  }

  return {
    type: "USE_FOLLOWER",
    seatId,
    followerId: card.useIntent.followerId,
    escalate: card.useIntent.escalate
  };
}

function InventoryThumbnail({ card }: { card: InventoryCardViewModel }): ReactElement {
  if (card.artCardId) {
    return (
      <PhoneInspectableCardArt
        cardType={card.artCardType ?? "artifact"}
        cardId={card.artCardId}
        title={card.name}
        rules={card.effectText}
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
  if (card.effectText && card.status !== "Passive") {
    return card.effectText;
  }

  if (card.statBonus) {
    const bonus = `+${card.statBonus.amount} ${statLabelById[card.statBonus.stat]}`;
    const timing = card.timingText === "Before battle roll"
      ? " before battle roll"
      : card.timingText && card.timingText !== "Passive"
        ? ` during ${card.timingText.toLowerCase()}`
        : "";
    return `${card.status === "Passive" ? "Applies" : "Adds"} ${bonus}${timing}.`;
  }

  return card.effectText;
}

function shouldShowRawEffectMeta(card: InventoryCardViewModel, consequence: string): boolean {
  if (consequence === card.effectText) {
    return false;
  }

  if (!card.statBonus) {
    return true;
  }

  const normalizedEffect = card.effectText.toLowerCase();
  const statLabel = statLabelById[card.statBonus.stat].toLowerCase();

  return normalizedEffect.includes(statLabel) || !/\+\d+/.test(normalizedEffect) || !normalizedEffect.includes("combat");
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
  const [oathchainConfirming, setOathchainConfirming] = useState(false);
  const useIntent = toUseIntent(card, seatId);
  const statusLabel = card.exhaustState ?? getStatusLabel(card.status);
  const statusReason = card.canUseNow ? "Active in this timing window." : card.statusReason;
  const stateLabel = card.canUseNow ? "active" : card.status === "Passive" ? "applied" : "inactive";
  const consequence = getInventoryConsequence(card);

  const metaItems = ([
    shouldShowRawEffectMeta(card, consequence) ? { key: "effect", node: card.effectText } : null,
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
    ,card.activationCostText ? { key: "activation-cost", node: card.activationCostText } : null
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
      actions={card.canUseNow && useIntent ? (card.id === "fandiablos" ? <>
        <GameButton type="button" tone="action" className="phone-button" onClick={() => onIntent?.({ ...useIntent, escalate: false } as ClientIntent)}>Use — 1 Wound</GameButton>
        <GameButton type="button" tone="action" className="phone-button" onClick={() => onIntent?.({ ...useIntent, escalate: true } as ClientIntent)}>Escalate — 2 Wounds</GameButton>
      </> : card.id === "oathchain-lens" ? (oathchainConfirming ? <div className="phone-inventory-oathchain-confirm">
        <p>Spend 1 charge to reveal current valid Contract targets.</p>
        <GameButton type="button" tone="action" className="phone-button phone-button-primary" aria-label="Confirm Trace the Promise" onClick={() => { onIntent?.(useIntent); onUse?.(); setOathchainConfirming(false); }}>Trace the Promise — 1 charge</GameButton>
        <GameButton type="button" tone="secondary" className="phone-button" onClick={() => setOathchainConfirming(false)}>Cancel</GameButton>
      </div> : <GameButton type="button" tone="action" className="phone-button phone-button-primary" onClick={() => setOathchainConfirming(true)}>Preview Trace the Promise</GameButton>) : (
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
      )) : null}
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

function InventoryScarsSection({ scars }: { scars: ScarSummary[] }): ReactElement | null {
  if (scars.length === 0) {
    return null;
  }

  return (
    <section className="phone-inventory-scars" aria-label="Scars and status" data-testid="phone-inventory-scars">
      <div className="phone-inventory-progression-header phone-inventory-scars-header">
        <div>
          <span>Status</span>
          <strong>Scars: {scars.length}</strong>
        </div>
        <small>Persistent effects</small>
      </div>
      <div className="phone-inventory-card-list">
        {scars.map((scar) => (
          <PhoneWrappedMediaCard
            key={scar.id}
            variant="inventory"
            className="phone-inventory-card phone-inventory-scar-card"
            dataState="persistent"
            ariaLabel={`${scar.title}: ${scar.trigger}. ${scar.penalty}`}
            media={
              <CardArtImage
                cardType="scar"
                cardId={scar.id}
                alt=""
                aria-hidden="true"
                className="phone-wrap-card__image phone-inventory-card-art phone-inventory-scar-art"
              />
            }
            title={scar.title}
            eyebrow="Scar"
            status={<span className="phone-inventory-card-status">Persistent</span>}
            description={
              <div className="phone-wrap-card__consequence phone-inventory-scar-copy">
                <p>{scar.text}</p>
                <p>
                  <strong>{scar.trigger}</strong> {scar.penalty}
                </p>
              </div>
            }
            disabledReason={<small className="phone-inventory-card-status-reason">Relief: {scar.relief}</small>}
            meta={
              <div className="phone-inventory-card-meta">
                <span>Passive scar</span>
                <span>Affects status / tests when triggered</span>
                {scar.upside ? <span>{scar.upside}</span> : null}
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}

function InventoryAfflictionsSection({
  afflictions,
  facedownCount
}: {
  afflictions: AfflictionSummary[];
  facedownCount: number;
}): ReactElement | null {
  if (afflictions.length === 0 && facedownCount === 0) {
    return null;
  }

  return (
    <section className="phone-inventory-scars phone-inventory-afflictions" aria-label="Afflictions and corruption" data-testid="phone-inventory-afflictions">
      <div className="phone-inventory-progression-header phone-inventory-scars-header">
        <div>
          <span>Status</span>
          <strong>Afflictions: {afflictions.length + facedownCount}</strong>
        </div>
        <small>{facedownCount > 0 ? `${facedownCount} facedown` : "Faceup effects"}</small>
      </div>
      <div className="phone-inventory-card-list">
        {afflictions.map((affliction) => {
          const effectChips = getAfflictionEffectChips(affliction);

          return (
            <PhoneWrappedMediaCard
              key={affliction.id}
              variant="inventory"
              className="phone-inventory-card phone-inventory-scar-card phone-inventory-affliction-card"
              dataState="persistent"
              ariaLabel={`${affliction.name}: ${affliction.trigger}. ${affliction.rulesText}`}
              media={
                <div className="phone-wrap-card__fallback phone-inventory-card-fallback phone-inventory-affliction-fallback" aria-hidden="true">
                  S{affliction.severity}
                </div>
              }
              title={affliction.name}
              eyebrow="Affliction"
              status={<span className="phone-inventory-card-status">{getAfflictionStatusLabel(affliction)}</span>}
              description={
                <div className="phone-wrap-card__consequence phone-inventory-scar-copy">
                  <p>{affliction.rulesText}</p>
                  <p>
                    <strong>{affliction.trigger}</strong>
                  </p>
                </div>
              }
              disabledReason={<small className="phone-inventory-card-status-reason">Category: {affliction.category}</small>}
              meta={
                <div className="phone-inventory-card-meta">
                  <span>Severity {affliction.severity}</span>
                  <span>{affliction.duration}</span>
                  {effectChips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
              }
            />
          );
        })}
        {facedownCount > 0 && (
          <PhoneWrappedMediaCard
            variant="inventory"
            className="phone-inventory-card phone-inventory-scar-card phone-inventory-affliction-card phone-inventory-affliction-card-facedown"
            dataState="facedown"
            ariaLabel={`${facedownCount} facedown Afflictions. Resolved corruption remains in your Affliction area.`}
            media={
              <div className="phone-wrap-card__fallback phone-inventory-card-fallback phone-inventory-affliction-fallback" aria-hidden="true">
                {facedownCount}
              </div>
            }
            title="Facedown Afflictions"
            eyebrow="Affliction"
            status={<span className="phone-inventory-card-status">Resolved</span>}
            description={<p className="phone-wrap-card__consequence">Resolved corruption remains in your Affliction area.</p>}
          />
        )}
      </div>
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
      {!onlyUsable && <InventoryScarsSection scars={self.character.scarCards ?? []} />}
      {!onlyUsable && (
        <InventoryAfflictionsSection
          afflictions={self.character.afflictions?.faceup ?? []}
          facedownCount={self.character.afflictions?.facedownCount ?? 0}
        />
      )}
      {!onlyUsable && <InventoryProgressionSection patch={patch} onIntent={onIntent} />}
      {!onlyUsable && patch.activeOathchainReveal ? (
        <section className="phone-inventory-oathchain-reveal" aria-label="Private Lens Reading">
          <span>Private Lens Reading</span>
          <strong>{patch.activeOathchainReveal.contractName}</strong>
          <p>{patch.activeOathchainReveal.objectiveProgress}</p>
          <ul>{patch.activeOathchainReveal.revealedTargets.map((target) => <li key={`${target.kind}:${target.id}:${target.sectorId ?? "none"}`}><strong>{target.label}</strong><span>{target.detail}</span></li>)}</ul>
          <small>Until end of turn</small>
        </section>
      ) : null}
      {!onlyUsable && <InventoryTimingGroups cards={allCards} />}
      {visibleGroups.length === 0 ? (
        <p className="phone-sheet-action-empty">
          {onlyUsable ? "No combat cards are usable in this timing window." : "No inventory cards, followers, or quest items yet."}
        </p>
      ) : (
        visibleGroups.map((group) => {
          const actionAvailable = group.items.some((card) => card.canUseNow);
          return (
          <InventoryDisclosure
            key={group.group}
            label={group.group}
            count={group.items.length}
            initiallyOpen
            actionAvailable={actionAvailable}
          >
            <div className="phone-inventory-card-list">
              {group.items.map((card) => (
                <InventoryCard key={`${card.source}-${card.id}`} card={card} seatId={self.seatId} onIntent={onIntent} onUse={onUse} />
              ))}
            </div>
          </InventoryDisclosure>
          );
        })
      )}
    </section>
  );
}
