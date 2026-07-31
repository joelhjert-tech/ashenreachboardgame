import { useEffect, useId, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  NORMAL_STAT_UPGRADE_CAP
} from "../../game/rules/statUpgrades.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { PhoneOptimizedImage } from "../shared/PhoneOptimizedImage.js";
import { getInventoryCategoryIconPath, type InventoryCategoryIcon } from "../shared/assetPaths.js";
import { statOrder } from "../shared/statLabels.js";
import type { AfflictionSummary, ClientIntent, PhonePatchPayload, ScarSummary, Stat, TrophyPileEntry } from "../shared/types.js";
import { getAfflictionEffectChips, getAfflictionStatusLabel } from "./afflictionPresentation.js";
import { PhoneWrappedMediaCard } from "./PhoneWrappedMediaCard.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";
import { PhoneEdgeCardHand } from "./PhoneEdgeCardHand.js";
import {
  getInventoryPresentation,
  statLabelById,
  type InventoryCardViewModel
} from "./inventoryPresentation.js";
import { PhoneMissionRelicExchange } from "./PhoneMissionRelicExchange.js";

interface PhoneInventoryPanelProps {
  patch: PhonePatchPayload;
  onIntent: ((intent: ClientIntent) => void) | null;
  compact?: boolean;
  onlyUsable?: boolean;
  onUse?: () => void;
  onReturnToAction?: () => void;
}

function InventoryDisclosure({
  label,
  icon,
  summary,
  count,
  countLabel = "records",
  initiallyOpen,
  actionAvailable,
  children
}: {
  label: string;
  icon: InventoryCategoryIcon;
  summary: string;
  count: number;
  countLabel?: string;
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
        <PhoneOptimizedImage
          className="phone-inventory-group-icon"
          src={getInventoryCategoryIconPath(icon)}
          alt=""
          aria-hidden="true"
          width={48}
          height={48}
          decoding="async"
        />
        <span className="phone-inventory-group-copy">
          <span className="phone-inventory-group-label">{label}</span>
          <small>{summary}</small>
        </span>
        {actionAvailable ? <span className="phone-inventory-group-action">Action available</span> : null}
        <span className="phone-inventory-group-count" aria-label={`${count} ${label} ${countLabel}`}>{count}</span>
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
  if (card.source === "gear" && (card.passiveBonus || card.activeAbility)) {
    return "";
  }

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

function ChargeMeter({ card }: { card: InventoryCardViewModel }): ReactElement | null {
  const charge = card.chargeState;
  if (!charge) return null;

  return (
    <div
      className={`phone-inventory-charge-meter${charge.depleted ? " is-depleted" : charge.current === charge.maximum ? " is-full" : " is-partial"}`}
      role="meter"
      aria-label={`${charge.current} of ${charge.maximum} charges remaining`}
      aria-valuemin={0}
      aria-valuemax={charge.maximum}
      aria-valuenow={charge.current}
    >
      <div className="phone-inventory-charge-heading">
        <strong>{charge.current} / {charge.maximum} CHARGES</strong>
        {charge.depleted ? <span>Depleted</span> : <span>Cost {charge.cost}</span>}
      </div>
      <div className="phone-inventory-charge-pips" aria-hidden="true">
        {Array.from({ length: charge.maximum }, (_, index) => (
          <span key={index} className={index < charge.current ? "is-filled" : ""} />
        ))}
      </div>
    </div>
  );
}

function InventoryAbilitySections({ card }: { card: InventoryCardViewModel }): ReactElement {
  const consequence = getInventoryConsequence(card);

  if (card.source !== "gear" || (!card.passiveBonus && !card.activeAbility)) {
    return <p className="phone-wrap-card__consequence">{consequence}</p>;
  }

  return (
    <div className="phone-inventory-effect-sections">
      {card.passiveBonus ? (
        <section
          className={`phone-inventory-effect-section phone-inventory-passive-section is-${card.passiveBonus.state}`}
          aria-label={`Passive bonus: ${card.passiveBonus.text}`}
        >
          <span>Passive bonus</span>
          <strong>{card.passiveBonus.text}</strong>
        </section>
      ) : null}
      <ChargeMeter card={card} />
      {card.activeAbility ? (
        <section className="phone-inventory-effect-section phone-inventory-active-section" aria-label="Active ability">
          <span>Active ability</span>
          <strong>{card.activeAbility.text}</strong>
          <small>
            {card.activeAbility.timingText}
            {card.activeAbility.contextualControl ? " · Use from its game prompt" : ""}
          </small>
        </section>
      ) : null}
      {card.exhaustState ? (
        <div className={`phone-inventory-exhaust-state is-${card.exhaustState.status.toLowerCase()}`}>
          <strong>{card.exhaustState.status}</strong>
          <span>{card.exhaustState.resetText}</span>
        </div>
      ) : null}
    </div>
  );
}

function shouldShowRawEffectMeta(card: InventoryCardViewModel, consequence: string): boolean {
  if (card.source === "gear" && (card.passiveBonus || card.activeAbility)) {
    return false;
  }

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
  onUse,
  canManageEquipment
}: {
  card: InventoryCardViewModel;
  seatId: string;
  onIntent: ((intent: ClientIntent) => void) | null;
  onUse?: () => void;
  canManageEquipment: boolean;
}): ReactElement {
  const [oathchainConfirming, setOathchainConfirming] = useState(false);
  const [submitting, setSubmitting] = useState<"use" | "equip" | null>(null);
  useEffect(() => {
    if (!card.canUseNow) setSubmitting(null);
  }, [card.canUseNow, card.statusReason, card.charges, card.equipped]);
  const useIntent = toUseIntent(card, seatId);
  const statusLabel = card.exhaustState?.status ?? getStatusLabel(card.status);
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
    !card.chargeState && card.charges !== null && card.charges !== undefined
      ? {
          key: "charges",
          node:
            card.maxUses !== null && card.maxUses !== undefined
              ? `${card.charges}/${card.maxUses} use${card.maxUses === 1 ? "" : "s"}`
              : `${card.charges} charge${card.charges === 1 ? "" : "s"}`
      }
      : null
    ,card.activationCostText ? { key: "activation-cost", node: card.activationCostText } : null
    ,card.followerRoleText ? { key: "follower-role", node: card.followerRoleText } : null
    ,card.acquisitionText ? { key: "acquisition", node: `Found at: ${card.acquisitionText}` } : null
  ] as Array<{ key: string; node: ReactNode } | null>).filter((item): item is { key: string; node: ReactNode } => Boolean(item));

  return (
    <PhoneWrappedMediaCard
      variant="inventory"
      className={`phone-inventory-card phone-inventory-card-${card.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      dataState={stateLabel}
      ariaLabel={`${card.name}: ${card.status}. ${statusReason}`}
      media={<InventoryThumbnail card={card} />}
      mediaInteractive
      title={card.name}
      eyebrow={card.group}
      status={<span className="phone-inventory-card-status">{statusLabel}</span>}
      description={<InventoryAbilitySections card={card} />}
      disabledReason={<small className="phone-inventory-card-status-reason">{statusReason}</small>}
      meta={
        <div className="phone-inventory-card-meta">
          {metaItems.map((item) => (
            <span key={item.key}>{item.node}</span>
          ))}
        </div>
      }
      actions={<>
        {card.source === "gear" && card.gearSlot ? (
          <GameButton
            type="button"
            tone="secondary"
            className="phone-button phone-inventory-equip-button"
            disabled={!canManageEquipment || submitting !== null}
            disabledReason={canManageEquipment ? undefined : "Equip gear during setup or your Action phase."}
            onClick={() => {
              if (submitting) return;
              setSubmitting("equip");
              onIntent?.(card.equipped
                ? { type: "UNEQUIP_GEAR", seatId, slot: card.gearSlot! }
                : { type: "EQUIP_GEAR", seatId, gearId: card.id, instanceId: card.instanceId, slot: card.gearSlot! });
            }}
          >
            {submitting === "equip" ? "Submitting…" : card.equipped ? "Unequip" : `Equip ${card.gearSlot}`}
          </GameButton>
        ) : null}
        {card.canUseNow && useIntent ? (card.id === "fandiablos" ? <>
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
            if (submitting) return;
            setSubmitting("use");
            onIntent?.(useIntent);
            onUse?.();
          }}
          disabled={submitting !== null}
        >
          {submitting === "use" ? "Submitting…" : card.chargeState ? `Use now — ${card.chargeState.cost} charge${card.chargeState.cost === 1 ? "" : "s"}` : "Use now"}
        </GameButton>
      )) : null}
      </>}
    />
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
  const [selectedUpgrade, setSelectedUpgrade] = useState<Stat | null>(null);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const trophies = self?.character.trophies ?? 0;
  const statRevision = self ? statOrder.map((stat) => self.character.stats[stat]).join(":") : "none";

  useEffect(() => {
    setUpgradeSubmitting(false);
    setSelectedUpgrade(null);
  }, [statRevision, trophies]);

  if (!self) {
    return null;
  }

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
        <p className="phone-inventory-upgrades-copy">Choose one skill. The server spends Trophies only after you confirm.</p>
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
                onClick={() => setSelectedUpgrade(stat as Stat)}
                sublabel={disabledReason ?? `Cost ${cost} Troph${cost === 1 ? "y" : "ies"}`}
              >
                {selectedUpgrade === stat ? `Selected · ${label}` : label}
              </GameButton>
            );
          })}
        </div>
        {selectedUpgrade ? (() => {
          const currentValue = self.character.stats[selectedUpgrade];
          const cost = getStatUpgradeCost(currentValue);
          const disabledReason = getStatUpgradeDisabledReason({
            stat: selectedUpgrade,
            currentValue,
            trophies,
            qaOnly: self.character.qaOnly === true,
            cap: NORMAL_STAT_UPGRADE_CAP
          });
          return (
            <div className="phone-inventory-upgrade-confirm" role="group" aria-label={`Confirm ${statLabelById[selectedUpgrade]} upgrade`}>
              <div>
                <span>{statLabelById[selectedUpgrade]}</span>
                <strong>{currentValue} → {Math.min(currentValue + 1, NORMAL_STAT_UPGRADE_CAP)}</strong>
                <small>{disabledReason ?? `${cost} Trophies will be spent · ${Math.max(0, trophies - cost)} remain`}</small>
              </div>
              <GameButton
                type="button"
                tone="primary"
                disabled={Boolean(disabledReason) || upgradeSubmitting}
                disabledReason={disabledReason ?? (upgradeSubmitting ? "Upgrade is being confirmed." : undefined)}
                onClick={() => {
                  if (disabledReason || upgradeSubmitting) return;
                  setUpgradeSubmitting(true);
                  onIntent?.({ type: "RAISE_STAT_REQUESTED", seatId: self.seatId, stat: selectedUpgrade });
                }}
              >
                {upgradeSubmitting ? "Upgrading..." : `Confirm ${statLabelById[selectedUpgrade]}`}
              </GameButton>
            </div>
          );
        })() : null}
      </div>
    </section>
  );
}

export function PhoneInventoryPanel({
  patch,
  onIntent,
  compact = false,
  onlyUsable = false,
  onUse,
  onReturnToAction
}: PhoneInventoryPanelProps): ReactElement {
  const self = patch.self;

  if (!self) {
    return (
      <section className="phone-inventory-panel" aria-label="Inventory">
        <p className="phone-sheet-action-empty">No private player state is attached.</p>
      </section>
    );
  }

  const presentation = getInventoryPresentation(patch)!;
  const allCards = [...presentation.relevantNow, ...presentation.groups.flatMap((group) => group.items)];
  const relevantCards = (presentation.relevantNow.length > 0 || !onlyUsable
    ? presentation.relevantNow
    : allCards.filter((card) => card.canUseNow)
  ).filter((card) => onlyUsable ? card.canUseNow : true);
  const edgeCards = patch.edgeHand?.cards ?? [];
  const visibleItemCount = onlyUsable ? relevantCards.length : allCards.length + edgeCards.length;
  const artifactCards = allCards.filter((card) => card.group === "Artifacts / Relics");
  const followerCards = allCards.filter((card) => card.group === "Followers");
  const equipmentCards = allCards.filter((card) => card.group !== "Artifacts / Relics" && card.group !== "Followers");
  const scars = self.character.scarCards ?? [];
  const faceupAfflictions = self.character.afflictions?.faceup ?? [];
  const facedownAfflictionCount = self.character.afflictions?.facedownCount ?? 0;
  const statusCount = scars.length + faceupAfflictions.length + facedownAfflictionCount;
  const progressionCount = self.character.trophyPile?.length ?? 0;
  const completedMissionRecords = self.character.completedMissionRecords ?? [];
  const unspentMissionCount = (self.character.completedContracts ?? []).filter(
    (missionId) => completedMissionRecords.find((record) => record.missionId === missionId)?.spent !== true
  ).length;
  const missionCount =
    (self.character.activeContracts?.length ?? (self.character.activeContract ? 1 : 0)) +
    completedMissionRecords.length;
  const summarizeCards = (cards: InventoryCardViewModel[], empty: string): string =>
    cards.length === 0
      ? empty
      : `${cards.slice(0, 2).map((card) => card.name).join(" · ")}${cards.length > 2 ? ` +${cards.length - 2}` : ""}`;
  const edgeCardSummary = edgeCards.length === 0
    ? "No cards held · Random awards only"
    : `${edgeCards.slice(0, 2).map((card) => card.name).join(" · ")}${edgeCards.length > 2 ? ` +${edgeCards.length - 2}` : ""} · ${edgeCards.length}/${patch.edgeHand?.limit ?? 2} held`;
  const categories = [
    {
      id: "edge-cards" as const,
      label: "Edge Cards",
      count: edgeCards.length,
      summary: edgeCardSummary,
      cards: [] as InventoryCardViewModel[],
      actionAvailable: Boolean(
        edgeCards.length > 0 &&
        (
          (patch.edgeHand?.canCommit && patch.edgeHand.resolutionId) ||
          patch.edgeHand?.reaction ||
          edgeCards.some((card) => card.ability.enabled && card.ability.resolutionId)
        )
      )
    },
    {
      id: "artifacts" as const,
      label: "Artifacts",
      count: artifactCards.length,
      summary: summarizeCards(artifactCards, "No relics held"),
      cards: artifactCards,
      actionAvailable: artifactCards.some((card) => card.canUseNow)
    },
    {
      id: "equipment" as const,
      label: "Equipment",
      count: equipmentCards.length,
      summary: summarizeCards(equipmentCards, "No carried equipment"),
      cards: equipmentCards,
      actionAvailable: equipmentCards.some((card) => card.canUseNow)
    },
    {
      id: "followers" as const,
      label: "Followers",
      count: followerCards.length,
      summary: summarizeCards(followerCards, "No companions"),
      cards: followerCards,
      actionAvailable: followerCards.some((card) => card.canUseNow)
    },
    {
      id: "missions" as const,
      label: "Contracts",
      count: missionCount,
      summary: `${self.character.activeContracts?.length ?? (self.character.activeContract ? 1 : 0)}/3 active · ${unspentMissionCount} exchange-ready`,
      cards: [] as InventoryCardViewModel[],
      actionAvailable: unspentMissionCount >= 3 || Boolean(patch.pendingMissionRelicExchange)
    },
    {
      id: "status" as const,
      label: "Scars & Afflictions",
      count: statusCount,
      summary: statusCount === 0 ? "No persistent conditions" : `${scars.length} Scars · ${faceupAfflictions.length + facedownAfflictionCount} Afflictions`,
      cards: [] as InventoryCardViewModel[],
      actionAvailable: false
    },
    {
      id: "progression" as const,
      label: "Progression",
      count: progressionCount,
      summary: `${self.character.trophies ?? 0} Trophies · ${self.character.completedContracts?.length ?? 0} completed Contracts`,
      cards: [] as InventoryCardViewModel[],
      actionAvailable: false
    }
  ];
  const defaultOpenCategory = categories.find((category) => category.actionAvailable)?.id
    ?? categories.find((category) => category.count > 0)?.id
    ?? "equipment";
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const canManageEquipment =
    (patch.status === "lobby" && patch.phase === "start") ||
    (patch.status === "active" && patch.phase === "action" && activeSeatId === self.seatId && !patch.activeResolution && !patch.encounter);
  const panelClassName = [
    "phone-inventory-panel",
    compact ? "phone-inventory-panel-compact" : "",
    visibleItemCount > 8 ? "phone-inventory-panel-overflow" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={panelClassName} aria-label="Inventory" data-item-count={visibleItemCount}>
      {!onlyUsable ? (
        <section className="phone-inventory-relevant" aria-label="Relevant now" data-testid="phone-inventory-relevant-now">
          <div className="phone-inventory-relevant-heading">
            <div><span>Relevant now</span><strong>{presentation.context.label}</strong></div>
            <em>{relevantCards.length}</em>
          </div>
          {relevantCards.length > 0 ? (
            <p className="phone-inventory-relevant-summary">
              {relevantCards.slice(0, 3).map((card) => card.name).join(" · ")}
              {relevantCards.length > 3 ? ` · +${relevantCards.length - 3} more` : ""}
            </p>
          ) : <p>Nothing you own changes this decision. Continue with the required action.</p>}
        </section>
      ) : null}
      <div className="phone-inventory-command-header">
        <div>
          <span>Inventory context</span>
          <strong>{presentation.context.label}</strong>
          {presentation.context.testedSkill ? <em>{statLabelById[presentation.context.testedSkill]} matters now</em> : null}
        </div>
        <dl aria-label="Essential operative state">
          <div><dt>Wounds</dt><dd>{presentation.operative.wounds}</dd></div>
          <div><dt>Scars</dt><dd>{presentation.operative.scars}</dd></div>
          <div><dt>Salvage</dt><dd>{presentation.operative.salvage}</dd></div>
          <div><dt>Owned</dt><dd>{presentation.operative.heldCount + edgeCards.length}</dd></div>
        </dl>
        {presentation.context.requiredAction ? <p>{presentation.context.requiredAction}</p> : null}
        {onReturnToAction && patch.requiredAction?.requiredTab ? (
          <GameButton type="button" tone="action" className="phone-button phone-inventory-return-action" onClick={onReturnToAction}>
            Return to {patch.requiredAction.requiredTab === "battle" ? "Battle" : patch.requiredAction.requiredTab === "move" ? "Move" : patch.requiredAction.requiredTab === "shop" ? "Shop" : "Action"}
          </GameButton>
        ) : null}
      </div>
      {!onlyUsable ? <div className="phone-inventory-collection-heading"><span>Inventory categories</span><small>Expand a reliquary drawer</small></div> : null}
      {onlyUsable && relevantCards.length === 0 ? (
        <p className="phone-sheet-action-empty">
          No combat cards are usable in this timing window.
        </p>
      ) : onlyUsable ? (
        <InventoryDisclosure
          label="Equipment"
          icon="equipment"
          summary={summarizeCards(relevantCards, "No usable equipment")}
          count={relevantCards.length}
          initiallyOpen
          actionAvailable
        >
          <div className="phone-inventory-card-list">
            {relevantCards.map((card) => (
              <InventoryCard key={`${card.source}-${card.instanceId ?? card.id}`} card={card} seatId={self.seatId} onIntent={onIntent} onUse={onUse} canManageEquipment={canManageEquipment} />
            ))}
          </div>
        </InventoryDisclosure>
      ) : (
        categories.map((category) => (
          <InventoryDisclosure
            key={category.id}
            label={category.label}
            icon={category.id}
            summary={category.summary}
            count={category.count}
            initiallyOpen={category.id === defaultOpenCategory}
            actionAvailable={category.actionAvailable}
          >
            {category.cards.length > 0 ? (
              <div className="phone-inventory-card-list">
                {category.cards.map((card) => (
                  <InventoryCard key={`${card.source}-${card.instanceId ?? card.id}`} card={card} seatId={self.seatId} onIntent={onIntent} onUse={onUse} canManageEquipment={canManageEquipment} />
                ))}
              </div>
            ) : null}
            {category.id === "edge-cards" ? (
              patch.edgeHand && edgeCards.length > 0 ? (
                <PhoneEdgeCardHand
                  embedded
                  hand={
                    onIntent
                      ? patch.edgeHand
                      : {
                          ...patch.edgeHand,
                          canCommit: false,
                          disabledReason: patch.edgeHand.disabledReason ?? "Actions are unavailable in this view.",
                          reaction: null,
                          cards: patch.edgeHand.cards.map((card) => ({
                            ...card,
                            ability: {
                              ...card.ability,
                              enabled: false,
                              disabledReason: "Actions are unavailable in this view."
                            }
                          }))
                        }
                  }
                  seatId={self.seatId}
                  onIntent={onIntent ?? (() => undefined)}
                />
              ) : <p className="phone-sheet-action-empty">No Edge Cards held. New cards are always awarded randomly.</p>
            ) : null}
            {category.id === "artifacts" && patch.activeOathchainReveal ? (
              <section className="phone-inventory-oathchain-reveal" aria-label="Private Lens Reading">
                <span>Private Lens Reading</span>
                <strong>{patch.activeOathchainReveal.contractName}</strong>
                <p>{patch.activeOathchainReveal.objectiveProgress}</p>
                <ul>{patch.activeOathchainReveal.revealedTargets.map((target) => <li key={`${target.kind}:${target.id}:${target.sectorId ?? "none"}`}><strong>{target.label}</strong><span>{target.detail}</span></li>)}</ul>
                <small>Until end of turn</small>
              </section>
            ) : null}
            {category.id === "status" ? (
              statusCount > 0 ? (
                <>
                  <InventoryScarsSection scars={scars} />
                  <InventoryAfflictionsSection afflictions={faceupAfflictions} facedownCount={facedownAfflictionCount} />
                </>
              ) : <p className="phone-sheet-action-empty">No persistent Scars or Afflictions.</p>
            ) : null}
            {category.id === "missions" ? <PhoneMissionRelicExchange patch={patch} onIntent={onIntent} /> : null}
            {category.id === "progression" ? <InventoryProgressionSection patch={patch} onIntent={onIntent} /> : null}
          </InventoryDisclosure>
        ))
      )}
    </section>
  );
}
