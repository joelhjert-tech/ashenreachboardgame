import type { ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import type { ActiveResolution, PublicPatchPayload, PublicPlayer, StatePatch, Stat } from "../shared/types.js";

const statLabelById: Record<Stat, string> = {
  command: "Command",
  grit: "Strength",
  signal: "Craft",
  guile: "Guile",
  forge: "Forge"
};

interface HostBattleDisplayModel {
  playerName: string;
  playerTitle: string;
  playerPortraitUrl: string | null;
  playerStatLabel: string;
  playerBattleValue: number | null;
  playerWounds: number | null;
  playerHeat: number | null;
  enemyCardId: string | null;
  enemyName: string;
  enemyType: string;
  enemyRulesText: string | null;
  enemyBattleValue: number | null;
  playerDice: number[];
  enemyDice: number[];
  playerModifier: number | null;
  enemyModifier: number | null;
  playerTotal: number | null;
  enemyTotal: number | null;
  outcomeLabel: string | null;
  logEntries: string[];
  autoResolveAvailable: boolean;
}

function isEnemyBattleResolution(resolution: ActiveResolution | null | undefined): boolean {
  return Boolean(
    resolution?.battle &&
      (resolution.card?.type === "enemy" || resolution.battle.enemyName || resolution.source === "threat")
  );
}

export function isHostBattleActive(
  patch: StatePatch<PublicPatchPayload> | null,
  activePlayer: PublicPlayer | null
): boolean {
  if (!patch || !activePlayer) {
    return false;
  }

  return Boolean(
    isEnemyBattleResolution(patch.payload.activeResolution) ||
      patch.payload.encounter?.cardType === "enemy" ||
      patch.payload.pendingEnemyRoll
  );
}

function getEnemyBattleValue(resolution: ActiveResolution | null, patch: StatePatch<PublicPatchPayload>): number | null {
  return (
    patch.payload.outcomeSummary?.enemyBonus ??
    resolution?.battle?.modifiers.find((modifier) => modifier.label.toLowerCase() === "enemy")?.value ??
    resolution?.battle?.difficulty ??
    patch.payload.encounter?.difficulty ??
    null
  );
}

function getPlayerBattleValue(resolution: ActiveResolution | null, activePlayer: PublicPlayer | null): number | null {
  if (resolution?.roll) {
    return resolution.roll.modifierTotal;
  }

  const stat = resolution?.battle?.stat;
  return stat && activePlayer ? activePlayer.character.stats[stat] : null;
}

function buildBattleModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostBattleDisplayModel | null {
  const resolution = patch.payload.activeResolution ?? null;
  const encounter = patch.payload.encounter;
  const pendingEnemyRoll = patch.payload.pendingEnemyRoll;
  const battle = resolution?.battle;
  const card = resolution?.card;
  const enemyName = battle?.enemyName ?? encounter?.enemyName ?? encounter?.title ?? pendingEnemyRoll?.encounterTitle ?? null;

  if (!enemyName || !isHostBattleActive(patch, activePlayer)) {
    return null;
  }

  const stat = battle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? "grit";
  const outcome = patch.payload.outcomeSummary;
  const playerDice = resolution?.roll?.dice ?? [outcome?.die1, outcome?.die2].filter((die): die is number => typeof die === "number");
  const enemyDice = [outcome?.enemyDie1, outcome?.enemyDie2].filter((die): die is number => typeof die === "number");
  const playerTotal = resolution?.roll?.finalTotal ?? outcome?.checkTotal ?? null;
  const enemyTotal = outcome?.enemyTotal ?? (resolution?.roll?.target && resolution.card?.type === "enemy" ? resolution.roll.target : null);
  const playerBattleValue = getPlayerBattleValue(resolution, activePlayer);
  const enemyBattleValue = getEnemyBattleValue(resolution, patch);
  const outcomeLabel =
    resolution?.roll?.success === true || outcome?.success === true
      ? `${activePlayer.character.name} wins the battle`
      : resolution?.roll?.success === false || outcome?.success === false
        ? `${activePlayer.character.name} is driven back`
        : null;
  const logEntries = [
    `${activePlayer.character.name} engages ${enemyName}`,
    playerDice.length > 0 || enemyDice.length > 0 ? "Battle dice rolled" : null,
    resolution?.outcome?.text ?? outcome?.summary ?? null,
    outcomeLabel
  ].filter((entry): entry is string => Boolean(entry));

  return {
    playerName: activePlayer.character.name,
    playerTitle: activePlayer.character.archetype,
    playerPortraitUrl: getCharacterPortraitPath(activePlayer.character.id),
    playerStatLabel: statLabelById[stat],
    playerBattleValue,
    playerWounds: activePlayer.character.wounds,
    playerHeat: activePlayer.character.heat,
    enemyCardId: card?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterCardId ?? null,
    enemyName,
    enemyType: card?.type ?? encounter?.cardType ?? "enemy",
    enemyRulesText: card?.flavor ?? encounter?.flavor ?? null,
    enemyBattleValue,
    playerDice,
    enemyDice,
    playerModifier: playerBattleValue,
    enemyModifier: enemyBattleValue,
    playerTotal,
    enemyTotal,
    outcomeLabel,
    logEntries,
    autoResolveAvailable: Boolean(pendingEnemyRoll)
  };
}

function DiceReadout({ label, dice }: { label: string; dice: number[] }): ReactElement {
  return (
    <div className="host-battle-dice-column">
      <span>{label}</span>
      <div className="host-battle-dice-row">
        {dice.length > 0 ? dice.map((die, index) => <strong key={`${die}-${index}`}>{die}</strong>) : <strong>-</strong>}
      </div>
    </div>
  );
}

function formatNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

export function HostBattleOverlay({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
}): ReactElement | null {
  if (!patch || !activePlayer) {
    return null;
  }

  const model = buildBattleModel(patch, activePlayer);

  if (!model) {
    return null;
  }

  return (
    <section className="host-battle-overlay" aria-label="Host battle overlay" data-testid="host-battle-overlay">
      <div className="host-battle-panel">
        <article className="host-battle-combatant host-battle-player" data-testid="host-battle-player">
          <div className="host-battle-portrait">
            {model.playerPortraitUrl ? (
              <img src={model.playerPortraitUrl} alt={model.playerName} />
            ) : (
              <div className="host-battle-fallback">Operative</div>
            )}
          </div>
          <div className="host-battle-copy">
            <span>Active operative</span>
            <h2>{model.playerName}</h2>
            <p>{model.playerTitle}</p>
          </div>
          <div className="host-battle-stat-grid">
            <span>{model.playerStatLabel}</span>
            <strong>{formatNumber(model.playerBattleValue)}</strong>
            <span>Wounds</span>
            <strong>{formatNumber(model.playerWounds)}</strong>
            <span>Heat</span>
            <strong>{formatNumber(model.playerHeat)}</strong>
          </div>
        </article>

        <div className="host-battle-vs" aria-hidden="true">
          <div className="host-battle-crossed-icon">
            <span />
            <span />
          </div>
          <strong>VS</strong>
        </div>

        <article className="host-battle-combatant host-battle-enemy" data-testid="host-battle-enemy">
          <div className="host-battle-portrait host-battle-card-art">
            <CardArtImage cardType="threat" cardId={model.enemyCardId} alt={model.enemyName} />
          </div>
          <div className="host-battle-copy">
            <span>{model.enemyType}</span>
            <h2>{model.enemyName}</h2>
            <p>{model.enemyRulesText ?? "Enemy rules will appear here once the threat is revealed."}</p>
          </div>
          <div className="host-battle-stat-grid">
            <span>Battle value</span>
            <strong>{formatNumber(model.enemyBattleValue)}</strong>
          </div>
        </article>

        <div className="host-battle-rolls" data-testid="host-battle-rolls">
          <DiceReadout label="Player roll" dice={model.playerDice} />
          <div className="host-battle-modifiers">
            <span>Player battle value {formatNumber(model.playerModifier)}</span>
            <span>Enemy battle value {formatNumber(model.enemyModifier)}</span>
          </div>
          <DiceReadout label="Enemy roll" dice={model.enemyDice} />
          <div className="host-battle-total host-battle-total-player">
            <span>Final player total</span>
            <strong>{formatNumber(model.playerTotal)}</strong>
          </div>
          <div className="host-battle-total host-battle-total-enemy">
            <span>Final enemy total</span>
            <strong>{formatNumber(model.enemyTotal)}</strong>
          </div>
        </div>

        <div className="host-battle-actions">
          <button className="host-battle-primary" type="button" disabled>
            Resolve Battle
          </button>
          {model.autoResolveAvailable && (
            <button className="host-battle-secondary" type="button" disabled>
              Auto Resolve
            </button>
          )}
        </div>

        <div className="host-battle-log" data-testid="host-battle-log">
          {model.logEntries.slice(0, 4).map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
